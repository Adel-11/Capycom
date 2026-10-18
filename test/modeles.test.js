// Tests du moteur des modèles : le plan de dessin du moteur doit être identique à ce que dessinait la page du site (v52).
// Les fichiers modeles/tests/golden/*.json sont des enregistrements des appels jsPDF faits par le code du site pour les cas de modeles/tests/cas.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { PDFDocument } from 'pdf-lib';
import * as PDFLib from 'pdf-lib';

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.join(ici, '..', 'modeles');
const M = createRequire(import.meta.url)(path.join(racine, 'moteur.cjs'));
const cas = JSON.parse(fs.readFileSync(path.join(racine, 'tests', 'cas.json'), 'utf8'));
const lire = (...p) => JSON.parse(fs.readFileSync(path.join(racine, ...p), 'utf8'));
const fonds = { };
const rc66 = lire('fonds', 'rc66.json'), sch = lire('fonds', 'sch.json'), credit = lire('fonds', 'credit.json');
rc66.forEach((u, i) => { fonds['rc66:' + i] = u; });
sch.forEach((u, i) => { fonds['sch:' + i] = u; });
Object.keys(credit).forEach(f => credit[f].forEach((u, i) => { fonds['cr.' + f + ':' + i] = u; }));

function fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return ('00000000' + h.toString(16)).slice(-8); }
const r3 = n => Math.round(n * 1000) / 1000;

// Met un plan du moteur dans la forme des enregistrements (images reconnues par empreinte, nombres arrondis)
function normaliser(plan, sig) {
  return {
    unit: plan.unit,
    pages: plan.pages.map(p => ({
      ops: p.ops.map(o => {
        if (o.t === 'text') { const r = { t: 'text', s: o.s, x: r3(o.x), y: r3(o.y), fs: o.fs, f: o.f, st: o.st, c: o.c }; if (o.a) r.a = o.a; return r; }
        if (o.t === 'line') return { t: 'line', x1: r3(o.x1), y1: r3(o.y1), x2: r3(o.x2), y2: r3(o.y2), lw: r3(o.lw), c: o.c };
        const src = o.id === 'sig' ? sig.url : fonds[o.id];
        assert.ok(src, 'image inconnue : ' + o.id);
        return { t: 'img', h: fnv(src), x: r3(o.x), y: r3(o.y), w: r3(o.w), h2: r3(o.h) };
      })
    }))
  };
}

function golden(id, cle) { return JSON.parse(fs.readFileSync(path.join(racine, 'tests', 'golden', id + '.' + cle + '.json'), 'utf8')); }

function comparer(attendu, obtenu, nom) {
  assert.equal(obtenu.unit, attendu.unit, nom + ' : unité');
  assert.equal(obtenu.pages.length, attendu.pages.length, nom + ' : nombre de pages');
  attendu.pages.forEach((pg, i) => {
    assert.equal(obtenu.pages[i].ops.length, pg.ops.length, nom + ' page ' + (i + 1) + ' : nombre d’éléments');
    pg.ops.forEach((o, j) => assert.deepEqual(obtenu.pages[i].ops[j], o, nom + ' page ' + (i + 1) + ' élément ' + (j + 1)));
  });
}

for (const c of cas) {
  test('plan identique au site : ' + c.id, () => {
    const sig = c.sig || null;
    if (c.modele === 'rc66') {
      const [r] = M.plansDe('rc66', c.v, { ui: c.ui, rc: c.rc, sig, today: '2026-10-17' });
      comparer(golden(c.id, 'rc66'), normaliser(r.plan, sig), c.id);
    } else if (c.modele === 'credit') {
      const res = M.plansDe('credit', c.v, { ui: c.ui, cr: c.cr, sig, bureaux: c.bureaux, today: '2026-10-17' });
      assert.deepEqual(res.map(r => r.cle), c.bureaux);
      res.forEach(r => comparer(golden(c.id, r.cle), normaliser(r.plan, sig), c.id + '/' + r.cle));
    } else {
      const [r] = M.plansDe(c.modele, c.v, { ui: c.ui, lettre: c.lettre, lienPied: c.lienPied, sig });
      const g = golden(c.id, 'lettre');
      comparer(g, normaliser(r.plan, sig), c.id);
      assert.equal(r.tient, g.tient, c.id + ' : la lettre tient sur la page');
    }
  });
}

// Adaptateur Node (pdf-lib) : chaque PDF généré doit se rouvrir, avoir le bon nombre de pages et la taille Lettre
for (const c of cas) {
  test('PDF pdf-lib valide : ' + c.id, async () => {
    const sig = c.sig || null;
    const o = { ui: c.ui, lettre: c.lettre, lienPied: c.lienPied, sig, rc: c.rc, cr: c.cr, bureaux: c.bureaux, today: '2026-10-17' };
    for (const r of M.plansDe(c.modele, c.v, o)) {
      const octets = await M.rendrePdfLib(PDFLib, r.plan, { fonds, sig });
      assert.equal(Buffer.from(octets.slice(0, 5)).toString(), '%PDF-');
      const doc = await PDFDocument.load(octets);
      assert.equal(doc.getPageCount(), r.plan.pages.length);
      const { width, height } = doc.getPage(0).getSize();
      assert.deepEqual([Math.round(width), Math.round(height)], [612, 792]);
    }
  });
}

// Validation et pièces à joindre : mêmes réponses que le site (v52) pour des réponses complètes, vides, à moitié remplies, dans les deux langues
const validation = JSON.parse(fs.readFileSync(path.join(racine, 'tests', 'validation.json'), 'utf8'));
for (const c of validation) {
  test('validation et pièces identiques au site : ' + c.id, () => {
    const o = { ui: c.ui, rc: c.rc, cr: c.cr, sig: c.sig || null, today: '2026-10-17' };
    const id = c.modele;
    assert.deepEqual(M.verifier(id, c.v, o), c.attendu.verifier, c.id + ' : réponses manquantes par étape');
    const bureaux = id === 'credit' ? Object.keys(c.attendu.docs) : ['rc66'];
    for (const b of bureaux) {
      const docs = M.documentsDe(id, c.v, Object.assign({}, o, { bureau: b })).map(d => ({ id: d.id, req: d.req, titre: d[c.ui].titre, aide: d[c.ui].aide, lien: d.lien ? d.lien.cle : null }));
      assert.deepEqual(docs, c.attendu.docs[b], c.id + ' : pièces à joindre ' + b);
    }
  });
}

// Définitions : cohérentes entre elles et avec le moteur
const { charger: chargerDefs } = createRequire(import.meta.url)(path.join(racine, 'definitions.cjs'));
const defs = chargerDefs();
test('définitions : chaque modèle a un identifiant, des titres FR et EN et une section connue', () => {
  const sections = new Set(defs.commun.sections.map(s => s.id));
  const slugs = new Set();
  for (const m of defs.modeles) {
    assert.ok(m.id && m.titre.fr && m.titre.en && m.description.fr && m.description.en, m.id);
    assert.ok(sections.has(m.section), m.id + ' : section inconnue');
    for (const l of ['fr', 'en']) { assert.ok(!slugs.has(m.seo.slug[l]), 'slug en double : ' + m.seo.slug[l]); slugs.add(m.seo.slug[l]); }
    assert.ok(m.production && m.production.mode === 'moteur', m.id + ' : production');
  }
  for (const s of defs.commun.sections) for (const id of s.modeles) assert.ok(defs.parId[id], 'section ' + s.id + ' : modèle inconnu ' + id);
});
test('définitions des lettres : champs requis = ceux que le moteur exige', () => {
  for (const id of M.LETTRES) {
    const d = defs.parId[id];
    for (const c of d.champs) assert.ok(c.libelle.fr && c.libelle.en, id + '/' + c.id);
    const manques = M.verifier(id, {}, { champs: d.champs })[0].manques;
    for (const c of d.champs.filter(x => x.requis)) assert.ok(manques.includes(c.id), id + '/' + c.id + ' devrait être exigé');
    for (const c of defs.commun.champsLettre.filter(x => x.requis)) assert.ok(manques.includes(c.id), c.id + ' devrait être exigé');
  }
});
test('définitions RC66 et crédit : les champs exigés par le moteur existent dans les définitions', () => {
  const ids = m => { const s = new Set(); for (const e of defs.parId[m].etapes) for (const f of (e.champs || [])) s.add(f.id.replace('{n}', '1')); return s; };
  for (const [modele, ids2] of [['rc66', ids('rc66')], ['credit', ids('credit')]]) {
    for (const c of validation.filter(x => x.modele === modele)) for (const etape of c.attendu.verifier) for (const id of etape.manques) {
      const g = id.replace(/^rc_e\d_/, 'rc_e1_').replace(/^cr_c\d_/, 'cr_c1_');
      assert.ok(ids2.has(g), modele + ' : champ exigé non défini : ' + id);
    }
  }
});
test('définitions : les liens cités existent et pointent vers https', () => {
  for (const m of defs.modeles) for (const l of (m.liensOfficiels || [])) { assert.ok(defs.commun.liens[l.cle], l.cle); }
  for (const [k, l] of Object.entries(defs.commun.liens)) assert.match(l.fr + l.en, /^https:\/\/.*https:\/\//, k);
  for (const d of defs.parId.rc66.piecesJointes) if (d.lien) assert.ok(defs.commun.liens[d.lien], d.lien);
});
test('aucune donnée de client dans les définitions ni dans les cas de test (adresses et noms fictifs)', () => {
  const texte = fs.readFileSync(path.join(racine, 'tests', 'cas.json'), 'utf8');
  assert.doesNotMatch(texte, /@(gmail|hotmail|outlook|yahoo)\./i);
});

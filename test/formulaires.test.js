// Tests des formulaires officiels remplis (N9, formulaire C, RT-2018-00045, RC325 ...), décrits par modeles/definitions/<id>.json (bloc « formulaire »).
// Ce qu'on vérifie, sans rien deviner : (1) le PDF officiel gardé dans le dépôt est bien celui qui a servi (empreinte) ;
// (2) chaque zone reprend le rectangle d'un champ du PDF officiel ; (3) chaque valeur tombe dans son rectangle, cellule par cellule ;
// (4) chaque case ne se coche que pour sa réponse ; (5) les champs requis et conditionnels ; (6) un enregistrement de référence (golden).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import * as PDFLib from 'pdf-lib';

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.join(ici, '..', 'modeles');
const req = createRequire(import.meta.url);
const M = req(path.join(racine, 'moteur.cjs'));
const defs = req(path.join(racine, 'definitions.cjs')).charger();
const FONDS = req(path.join(racine, 'fonds.cjs')).charger();
const IDS = defs.modeles.filter(m => m.formulaire && m.formulaire.zones).map(m => m.id);
const dir = (...p) => path.join(racine, 'formulaires', ...p);
const lire = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const nomCourt = (n) => n.replace(/\[\d+\]/g, '');
const r2 = (n) => Math.round(n * 100) / 100;
const STD = ['exp_nom', 'exp_ligne', 'exp_ville', 'exp_prov', 'exp_cp', 'exp_contact', 'dest_nom', 'dest_service', 'dest_ligne', 'dest_ville', 'dest_prov', 'dest_cp', 'date_lettre'];

test('les quatre formulaires prévus sont enregistrés', () => {
  for (const id of ['n9-ontario', 'form-c-nouvelle-ecosse', 'rt-00045-terre-neuve', 'rc325-changement-adresse']) assert.ok(IDS.includes(id), id);
  for (const id of IDS) assert.ok(M.LETTRES.includes(id), id + ' absent de M.LETTRES');
});

for (const id of IDS) {
  const D = defs.parId[id], F = D.formulaire, ex = lire(dir('exemples', id + '.json'));
  const champsDef = Object.fromEntries(D.champs.map(c => [c.id, c]));
  const val = (v) => (k) => v[k] != null && v[k] !== '' ? String(v[k]) : (champsDef[k] && champsDef[k].defaut != null ? String(champsDef[k].defaut) : '');
  const planDe = (v) => M.planLettre(id, v, { ui: 'fr', lettre: 'fr' }).plan;
  const textes = (plan, p) => plan.pages[p].ops.filter(o => o.t === 'text');
  const lignes = (plan, p) => plan.pages[p].ops.filter(o => o.t === 'line');
  // une valeur écrite dans une zone : opérations de texte dont la ligne de base et l'abscisse tombent dans le rectangle
  const dedans = (o, r, p, z) => o.x >= r[0] - 0.01 && o.x <= r[0] + r[2] + 0.01 && (F.taille[1] - o.y) >= r[1] - 0.01 && (F.taille[1] - o.y) <= r[1] + r[3] + 0.01;

  test(id + ' : source officielle conservée (empreinte, URL, date de consultation)', () => {
    const pdf = path.join(racine, F.source.pdf);
    assert.ok(fs.existsSync(pdf), 'PDF source absent');
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(pdf)).digest('hex'), F.source.sha256);
    assert.match(F.source.url, /^https:\/\//);
    assert.match(F.source.consulte, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(D.liensOfficiels.length >= 1, 'au moins un lien officiel');
  });

  test(id + ' : chaque zone reprend le rectangle d\'un champ du PDF officiel', () => {
    const snap = lire(dir('sources', id + '.champs.json'));
    for (const z of F.zones) {
      if (!z.w) continue;
      const c = snap.filter(s => { const n = nomCourt(s.nom); return n === z.w || n.endsWith('.' + z.w); });
      const sel = z.i != null ? c.filter(s => s.i === z.i) : c;
      assert.equal(sel.length, 1, 'champ ' + z.w + ' : ' + sel.length + ' correspondance(s)');
      assert.equal(sel[0].p, z.ps, 'page de ' + z.w);
      assert.deepEqual(z.r.map(r2), [sel[0].rect.x, sel[0].rect.y, sel[0].rect.w, sel[0].rect.h].map(r2), 'rectangle de ' + z.w);
    }
  });

  test(id + ' : l\'instantané des champs correspond au PDF source (si qpdf est installé)', async (t) => {
    try { execFileSync('qpdf', ['--version'], { stdio: 'pipe' }); } catch (e) { return t.skip('qpdf absent'); }
    const { champs } = await import('../modeles/outils/formulaire.mjs');
    const lu = (await champs(path.join(racine, F.source.pdf))).champs.map(c => ({ nom: c.nom, p: c.p, i: c.i, rect: c.rect }));
    assert.deepEqual(lu, lire(dir('sources', id + '.champs.json')));
  });

  test(id + ' : chaque case porte, dans le PDF officiel, le texte de sa réponse (si pdftotext est installé)', async (t) => {
    try { execFileSync('pdftotext', ['-v'], { stdio: 'pipe' }); } catch (e) { return t.skip('pdftotext absent'); }
    const { texteADroite } = await import('../modeles/outils/formulaire.mjs');
    const cases = F.zones.filter(z => z.k === 'x');
    for (const z of cases) {
      assert.ok(z.labD, 'case sans texte attendu : ' + z.w + ' ' + z.egal);
      const lu = texteADroite(path.join(racine, F.source.pdf), z.ps, z.r).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      assert.ok(lu.startsWith(z.labD.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()), z.w + ' : lu « ' + lu + ' », attendu « ' + z.labD + ' »');
    }
  });

  test(id + ' : zones dans la page, fonds présents et valides', () => {
    assert.equal(F.pages, F.pagesGardees.length);
    for (let p = 0; p < F.pages; p++) { const u = FONDS[F.fonds + ':' + p]; assert.match(u || '', /^data:image\/png;base64,/, 'fond page ' + p); }
    for (const z of F.zones) {
      assert.ok(z.p >= 0 && z.p < F.pages, 'page de zone');
      assert.ok(z.r[0] >= 0 && z.r[1] >= 0 && z.r[0] + z.r[2] <= F.taille[0] && z.r[1] + z.r[3] <= F.taille[1], 'zone hors page');
    }
  });

  test(id + ' : les zones citent des champs qui existent', () => {
    const ok = (k) => STD.includes(k) || champsDef[k];
    for (const z of F.zones) {
      [z.champ].concat(z.champs || [], z.pref || [], z.si ? [z.si.champ] : []).filter(Boolean).forEach(k => assert.ok(ok(k), 'champ inconnu ' + k));
      assert.ok(z.champ || z.champs || z.texte != null || z.k === 'sig' || z.toujours, 'zone sans valeur : ' + JSON.stringify(z));
    }
    for (const c of D.champs) for (const k of ['visibleSi', 'requisSi']) if (c[k]) assert.ok(champsDef[c[k].champ], c.id + ' ' + k);
  });

  test(id + ' : chaque valeur tombe dans son rectangle, cellule par cellule', () => {
    const plan = planDe(ex), get = val(ex);
    assert.equal(plan.pages.length, F.pages);
    for (const z of F.zones) {
      if (z.k === 'x' || z.k === 'sig') continue;
      const attendu = (z.si && String(get(z.si.champ)) !== String(z.si.egal)) ? '' : M.valeurZone(z, get);
      const ops = textes(plan, z.p).filter(o => dedans(o, z.r, z.p, z));
      if (!attendu) { assert.equal(ops.length, 0, 'zone vide mais du texte écrit : ' + (z.w || z.champ)); continue; }
      if (z.k === 'comb') {
        const motif = z.motif || '_'.repeat(z.n), cw = z.r[2] / motif.length, cases = [];
        motif.split('').forEach((c, i) => { if (c === '_') cases.push(i); });
        assert.ok(attendu.length <= cases.length, (z.w || z.champ) + ' : ' + attendu.length + ' caractères pour ' + cases.length + ' cases');
        assert.equal(ops.length, attendu.length, 'nombre de caractères de ' + (z.w || z.champ));
        ops.sort((a, b) => a.x - b.x).forEach((o, k) => {
          assert.equal(o.s, attendu[k]);
          const centre = z.r[0] + cases[k] * cw + cw / 2;
          assert.ok(Math.abs(o.x - centre) < 0.01, (z.w || z.champ) + ' caractère ' + k + ' : x ' + o.x + ' attendu ' + centre);
          assert.equal(o.a, 'center');
        });
      } else {
        assert.equal(ops.length, 1, 'une seule opération pour ' + (z.w || z.champ));
        assert.equal(ops[0].s, attendu);
        assert.ok(ops[0].x >= z.r[0] && ops[0].fs >= 6 && ops[0].fs <= (z.fs || 10) + 0.01, 'taille de police de ' + (z.w || z.champ));
        assert.ok(ops[0].x + M.largeur(attendu, ops[0].fs, 'helvetica', 'normal', 'pt') <= z.r[0] + z.r[2] + 0.01, 'débordement de ' + (z.w || z.champ));
      }
    }
  });

  test(id + ' : un texte long réduit la police au lieu de déborder', () => {
    const v = { ...ex }; D.champs.filter(c => c.type === 'texte').forEach(c => { v[c.id] = 'Immeuble de la Compagnie de gestion immobilière du Grand Ottawa inc. ' + 'x'.repeat(40); });
    v.dest_nom = v.exp_nom = 'Compagnie de gestion immobilière du Grand Ottawa et de l\'Outaouais inc. section 12';
    const plan = planDe(v);
    for (const z of F.zones.filter(z => z.k === 't' || (!z.k))) {
      const ops = textes(plan, z.p).filter(o => dedans(o, z.r, z.p, z)); if (!ops.length) continue;
      assert.ok(ops[0].x + M.largeur(ops[0].s, ops[0].fs, 'helvetica', 'normal', 'pt') <= z.r[0] + z.r[2] + 0.5 || ops[0].fs <= 6, 'débordement ' + (z.w || z.champ));
    }
  });

  test(id + ' : chaque réponse est reliée à la case dont le texte officiel lui correspond', () => {
    for (const z of F.zones.filter(z => z.k === 'x' && z.champ)) {
      const o = (champsDef[z.champ].options || []).find(x => x.valeur === String(z.egal));
      assert.ok(o && o.texteOfficiel, z.champ + '=' + z.egal + ' : texte officiel de la case non noté');
      assert.equal(o.texteOfficiel, z.labD, z.champ + '=' + z.egal + ' relié à la mauvaise case');
    }
  });

  test(id + ' : chaque case ne se coche que pour sa réponse', () => {
    const xs = F.zones.filter(z => z.k === 'x'); if (!xs.length) return;
    const champsX = [...new Set(xs.map(z => z.champ).filter(Boolean))];
    for (const ch of champsX) {
      const valeurs = (champsDef[ch].options || []).map(o => o.valeur);
      const zs = xs.filter(z => z.champ === ch);
      zs.forEach(z => assert.ok(valeurs.includes(String(z.egal)), ch + ' : réponse inconnue ' + z.egal));
      for (const v of valeurs) {
        const plan = planDe({ ...ex, [ch]: v });
        for (const z of zs) {
          const n = lignes(plan, z.p).filter(l => l.x1 >= z.r[0] - 0.01 && l.x2 <= z.r[0] + z.r[2] + 0.01 && F.taille[1] - l.y1 >= z.r[1] - 0.01 && F.taille[1] - l.y1 <= z.r[1] + z.r[3] + 0.01).length;
          assert.equal(n, String(z.egal) === v ? 2 : 0, ch + '=' + v + ' : case ' + z.egal + ' a ' + n + ' traits');
        }
      }
    }
  });

  test(id + ' : champs requis, champs conditionnels, validations', () => {
    const champs = D.champs.map(c => ({ ...c, req: c.requis }));
    assert.deepEqual(M.manquesLettre(champs, ex, {}), [], 'l\'exemple doit être complet');
    for (const c of D.champs.filter(c => c.requis)) {
      const v = { ...ex }; delete v[c.id];
      assert.ok(M.manquesLettre(champs, v, {}).includes(c.id), c.id + ' devrait être exigé');
    }
    for (const c of D.champs.filter(c => c.requisSi)) {
      const v = { ...ex }; delete v[c.id];
      assert.ok(M.manquesLettre(champs, { ...v, [c.requisSi.champ]: c.requisSi.egal }, {}).includes(c.id), c.id + ' exigé quand ' + c.requisSi.champ + '=' + c.requisSi.egal);
      assert.ok(!M.manquesLettre(champs, { ...v, [c.requisSi.champ]: '__autre__' }, {}).includes(c.id), c.id + ' non exigé sinon');
    }
    for (const c of D.champs.filter(c => c.type === 'tel')) assert.ok(M.manquesLettre(champs, { ...ex, [c.id]: '12345' }, {}).includes(c.id), c.id + ' téléphone invalide');
    for (const c of D.champs.filter(c => c.type === 'nas')) { assert.ok(M.manquesLettre(champs, { ...ex, [c.id]: '123 456 789' }, {}).includes(c.id), 'NAS invalide'); assert.ok(M.manquesLettre(champs, { ...ex, [c.id]: '046 454 286' }, {}).length === 0); }
    for (const c of D.champs.filter(c => c.type === 'choix' && c.requis)) assert.ok(M.manquesLettre(champs, { ...ex, [c.id]: 'inconnu' }, {}).includes(c.id), c.id + ' valeur hors liste');
  });

  test(id + ' : textes sans tiret long ni apostrophe droite ; deux langues complètes', () => {
    const s = JSON.stringify(D);
    assert.ok(!/[—–]/.test(s), 'tiret long');
    assert.ok(!/'/.test(s), 'apostrophe droite');
    const walk = (x, chemin) => { if (x && typeof x === 'object') { if ('fr' in x && 'en' in x && typeof x.fr === 'string') { assert.ok(x.fr.trim() && x.en.trim(), 'vide ' + chemin); } Object.keys(x).forEach(k => k !== 'formulaire' && k !== 'exemple' && walk(x[k], chemin + '.' + k)); } };
    walk(D, id);
    for (const c of D.champs) assert.ok(c.libelle.fr && c.libelle.en, c.id);
  });

  test(id + ' : enregistrement de référence (golden) du formulaire d\'exemple', () => {
    const plan = planDe(ex);
    const res = plan.pages.map(pg => pg.ops.filter(o => o.t !== 'img').map(o => o.t === 'text' ? ['t', o.s, r2(o.x), r2(o.y), r2(o.fs), o.a || ''] : ['l', r2(o.x1), r2(o.y1), r2(o.x2), r2(o.y2)]));
    const f = dir('exemples', id + '.plan.json');
    if (process.env.MAJ_GOLDEN || !fs.existsSync(f)) { fs.writeFileSync(f, JSON.stringify(res) + '\n'); return; }
    assert.deepEqual(res, lire(f), 'le plan a changé : relire le formulaire à l\'image puis relancer avec MAJ_GOLDEN=1');
  });
}

test('RC325 : les trois centres fiscaux correspondent au texte du PDF officiel (si pdftotext est installé)', (t) => {
  const D = defs.parId['rc325-changement-adresse']; if (!D) return t.skip('absent');
  let txt; try { txt = execFileSync('pdftotext', ['-layout', path.join(racine, D.formulaire.source.pdf), '-'], { encoding: 'utf8' }).replace(/\s+/g, ' '); } catch (e) { return t.skip('pdftotext absent'); }
  const centre = D.champs.find(c => c.id === 'centre');
  assert.equal(centre.options.length, 3);
  for (const o of centre.options) { assert.ok(M.cpValide(o.dest.cp), 'code postal ' + o.dest.cp); assert.ok(M.prov(o.dest.prov), 'province ' + o.dest.prov); assert.ok(o.dest.nom && o.dest.ligne && o.dest.ville); }
  for (const o of centre.options) {
    assert.ok(txt.includes(o.dest.ligne), o.valeur + ' : ' + o.dest.ligne);
    assert.ok(txt.includes(o.dest.cp.replace(' ', ' ')) || txt.includes(o.dest.cp.replace(' ', '  ')), o.valeur + ' : ' + o.dest.cp);
  }
});

test('RC325 : adresse du domicile obligatoire seulement si elle diffère', () => {
  const D = defs.parId['rc325-changement-adresse'], ex = lire(dir('exemples', 'rc325-changement-adresse.json'));
  const champs = D.champs.map(c => ({ ...c, req: c.requis }));
  const sans = { ...ex, domicile: 'meme' }; for (const k of Object.keys(sans)) if (/^d[an]_|^date_demenag$/.test(k)) delete sans[k];
  assert.deepEqual(M.manquesLettre(champs, sans, {}), []);
  const diff = { ...sans, domicile: 'different' };
  const m = M.manquesLettre(champs, diff, {});
  for (const id of ['da_ville', 'da_prov', 'da_cp', 'dn_ville', 'dn_prov', 'dn_cp', 'date_demenag']) assert.ok(m.includes(id), id);
});

test('N9 : découpage du nom en prénom et nom, avec saisie directe prioritaire', () => {
  const get = (v) => (k) => v[k] || '';
  assert.equal(M.valeurZone({ champ: 'exp_nom', fmt: 'prenom' }, get({ exp_nom: 'Julie Marie Tremblay' })), 'Julie Marie');
  assert.equal(M.valeurZone({ champ: 'exp_nom', fmt: 'nom' }, get({ exp_nom: 'Julie Marie Tremblay' })), 'Tremblay');
  assert.equal(M.valeurZone({ champ: 'exp_nom', fmt: 'nom', pref: 'n' }, get({ exp_nom: 'Julie Marie Tremblay', n: 'Marie Tremblay' })), 'Marie Tremblay');
  assert.equal(M.valeurZone({ champ: 'd', fmt: 'jjmmaaaa' }, get({ d: '2027-01-31' })), '31012027');
  assert.equal(M.valeurZone({ champ: 'd', fmt: 'jj/mm/aaaa' }, get({ d: '2027-01-31' })), '31/01/2027');
  assert.equal(M.valeurZone({ champ: 'd', fmt: 'mois jj, aaaa' }, get({ d: '2027-01-05' })), 'January 5, 2027');
  assert.equal(M.valeurZone({ champ: 'd', fmt: 'aaaa mm jj' }, get({ d: '2027-01-05' })), '2027 01 05');
  assert.equal(M.valeurZone({ champ: 'd', fmt: 'aaaammjj' }, get({ d: '2027-13-45x' })), '');
  assert.equal(M.valeurZone({ champ: 't', fmt: 'tel10' }, get({ t: '12345' })), '');
  assert.equal(M.valeurZone({ champ: 't', fmt: 'tel10' }, get({ t: '1 (613) 555-1234' })), '6135551234');
  assert.equal(M.valeurZone({ champ: 't', fmt: 'tel-tiret' }, get({ t: '6135551234' })), '613-555-1234');
  assert.equal(M.valeurZone({ champ: 'p', fmt: 'prov-code' }, get({ p: 'Québec' })), 'QC');
  assert.equal(M.valeurZone({ champ: 'p', fmt: 'prov-en' }, get({ p: 'Nouvelle-Écosse' })), 'Nova Scotia');
  assert.equal(M.valeurZone({ champ: 'c', fmt: 'cp-sans-espace' }, get({ c: 'k1a0b1' })), 'K1A0B1');
});

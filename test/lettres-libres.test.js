// Test générique : toutes les lettres rédigées à partir d'une définition (champ redaction) se composent sans trou
// ni gabarit non résolu, en français et en anglais, pour chaque option de chaque choix, avec et sans champs facultatifs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.join(ici, '..', 'modeles');
const req = createRequire(import.meta.url);
const M = req(path.join(racine, 'moteur.cjs'));
const { charger } = req(path.join(racine, 'definitions.cjs'));
const DEF = charger();
const defs = DEF.modeles.filter(d => d.redaction && !d.formulaire);
const EXP = { exp_nom: 'Marie Tremblay', exp_ligne: '25, rue des Érables', exp_ville: 'Gatineau', exp_prov: 'QC', exp_cp: 'J8X 1A1', dest_nom: 'Jean Roy', dest_ligne: '12 Main Street', dest_ville: 'Ottawa', dest_prov: 'ON', dest_cp: 'K1A 0B1', date_lettre: '2026-10-30' };
const ex = (c, l) => (c.exemple && c.exemple[l]) || (c.type === 'date' ? '2026-12-05' : c.type === 'nombre' || c.type === 'montant' ? '120' : c.type === 'tel' ? '613-555-0123' : 'exemple');
function reponses(d, l, choix, tous) {
  const r = Object.assign({}, EXP);
  d.champs.forEach(c => {
    if (c.type === 'choix') r[c.id] = (choix && choix[c.id]) || c.defaut || c.options[0].valeur;
    else if (tous || c.requis) r[c.id] = ex(c, l);
  });
  return r;
}
// Combinaisons : chaque option de chaque choix (les autres au défaut), avec et sans facultatifs
function cas(d, l) {
  const out = [];
  [true, false].forEach(tous => {
    out.push(reponses(d, l, null, tous));
    d.champs.filter(c => c.type === 'choix').forEach(c => c.options.forEach(o => out.push(reponses(d, l, { [c.id]: o.valeur }, tous))));
  });
  return out;
}
defs.forEach(d => {
  test('lettre libre ' + d.id + ' : rédaction complète FR/EN', () => {
    ['fr', 'en'].forEach(l => cas(d, l).forEach(r => {
      const L = M.composerLettre(d.id, k => r[k] == null ? '' : String(r[k]), l);
      const t = [L.objet, L.salut, L.politesse].concat(L.corps).join('\n');
      assert.ok(L.corps.length >= 2, d.id + ' ' + l + ' : corps trop court');
      assert.ok(!/\{\{|\}\}|undefined|NaN|\[object/.test(t), d.id + ' ' + l + ' : gabarit non résolu : ' + t.slice(0, 200));
      assert.ok(!/[—–]/.test(t), d.id + ' : tiret long');
      assert.ok(!/'/.test(t), d.id + ' : apostrophe droite');
      assert.ok(!/ {2,}| \n|\n /.test(L.corps.join('\n')), d.id + ' ' + l + ' : espaces en trop');
      L.corps.forEach(p => assert.ok(p.trim().length > 3 && !/^[\s.,;:]+$/.test(p), d.id + ' ' + l + ' : paragraphe vide ou ponctuation seule'));
      L.corps.forEach(p => assert.ok(!/\.\./.test(p.replace(/\.\.\./g, '')), d.id + ' ' + l + ' : double point : ' + p));
    }));
  });
  test('lettre libre ' + d.id + ' : PDF dessinable et tient sur 1 à 2 pages', () => {
    ['fr', 'en'].forEach(l => {
      const r = reponses(d, l, null, true);
      const rep = M.plansDe(d.id, r, { lettre: l, lienPied: true });
      assert.ok(rep.length >= 1 && rep[0].plan.pages.length <= 2, d.id + ' ' + l + ' : ' + rep[0].plan.pages.length + ' pages');
    });
  });
  test('lettre libre ' + d.id + ' : définition complète (seo, icône, avertissement, FR et EN)', () => {
    assert.ok(d.icone, 'icône');
    assert.ok(d.seo && d.seo.slug.fr && d.seo.slug.en && d.seo.titre.fr && d.seo.description.en && d.seo.h1.fr, 'seo');
    assert.ok(d.avertissement && d.avertissement.fr && d.avertissement.en, 'avertissement');
    assert.ok(d.titre.fr && d.titre.en && d.description.fr && d.description.en);
    d.champs.forEach(c => { assert.ok(c.libelle.fr && c.libelle.en, d.id + ' ' + c.id + ' libellé'); if (c.type === 'choix') c.options.forEach(o => assert.ok(o.fr && o.en, d.id + ' option ' + o.valeur)); });
  });
});
test('slugs SEO uniques (par langue)', () => {
  ['fr', 'en'].forEach(l => { const v = DEF.modeles.map(d => d.seo.slug[l]).concat(DEF.commun.sections.map(s => s.slug[l])); assert.equal(new Set(v).size, v.length, 'slug en double : ' + l); });
});

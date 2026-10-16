import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nettoyerTexte, largeurMm, ecrirePdf, compterPages } from '../src/pdf.js';
import { composer, mettreEnPage, normaliserProvince, normaliserCodePostal, dateTexte } from '../src/lettre.js';
import { EXP, DEST } from './aide.js';

test('texte : accents, guillemets français, œ, € conservés ; caractères exotiques simplifiés', () => {
  const r = nettoyerTexte('Café « Œuvre » 5 € — l’été !');
  assert.equal(r.texte, 'Café « Œuvre » 5 € — l’été !');
  assert.deepEqual(r.remplaces, []);
  const e = nettoyerTexte('Zażółć 漢字 😀');
  assert.ok(e.remplaces.length > 0);
  assert.doesNotMatch(e.texte, /[漢字😀]/);
});

test('largeurs Helvetica : valeurs connues', () => {
  // « A » = 667/1000 em à 10 pt => 6,67 pt
  assert.ok(Math.abs(largeurMm('A', 10, false) * (72 / 25.4) - 6.67) < 0.01);
  assert.ok(largeurMm('AA', 10, true) > largeurMm('AA', 10, false));
});

test('PDF écrit : lisible, compté, plusieurs pages', async () => {
  const pages = [[{ t: 'text', x: 20, y: 30, s: 'Bonjour (monde) \\ é', gras: false, fs: 11, c: '#000000' }], [{ t: 'line', x1: 10, y1: 10, x2: 50, y2: 10, c: '#888888' }]];
  const u8 = ecrirePdf(pages, { largeur: 215.9, hauteur: 279.4, titre: 'Test' });
  assert.equal(String.fromCharCode(...u8.slice(0, 8)), '%PDF-1.4');
  assert.equal((await compterPages(u8)).pages, 2);
});

test('composer et mettre en page : une page courte, plusieurs pages si long, signature sur la dernière page', () => {
  const c = composer({ expediteur: EXP, destinataire: DEST, texte: 'Court.' }, '2026-10-09');
  assert.deepEqual(c.erreurs, []);
  assert.equal(mettreEnPage(c.L).pages, 1);
  const long = Array.from({ length: 60 }, (_, i) => `P${i}. ` + 'mot '.repeat(60)).join('\n\n');
  const c2 = composer({ expediteur: EXP, destinataire: DEST, texte: long.slice(0, 14000) }, '2026-10-09');
  const m = mettreEnPage(c2.L);
  assert.ok(m.pages >= 3);
  assert.equal(m.taille, 11);
});

test('PDF : chaîne de texte vide ou texte seulement espaces refusés', () => {
  const c = composer({ expediteur: EXP, destinataire: DEST, texte: '   ' }, '2026-10-09');
  assert.ok(c.erreurs.some((e) => e.startsWith('texte')));
});

test('provinces, codes postaux, dates', () => {
  assert.equal(normaliserProvince('qc').nom, 'Québec');
  assert.equal(normaliserProvince('Quebec').nom, 'Québec');
  assert.equal(normaliserProvince('british columbia').nom, 'Colombie-Britannique');
  assert.equal(normaliserProvince('Terre-Neuve-et-Labrador').abr, 'NL');
  assert.equal(normaliserProvince("Île-du-Prince-Édouard").abr, 'PE');
  assert.equal(normaliserProvince('Texas'), null);
  assert.equal(normaliserCodePostal('h2x1y4'), 'H2X 1Y4');
  assert.equal(normaliserCodePostal('D2X 1Y4'), null); // D n'est pas une lettre de début valide
  assert.equal(normaliserCodePostal('12345'), null);
  assert.equal(dateTexte('2026-10-01', 'fr'), '1er octobre 2026');
  assert.equal(dateTexte('2026-10-09', 'en'), 'October 9, 2026');
  assert.equal(dateTexte('2026-13-01', 'fr'), null);
});

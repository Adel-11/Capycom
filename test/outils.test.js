import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creerServeur, obtenirJetons, rpc, appelOutil, EXP, DEST, CLE_VALIDE } from './aide.js';
import { OUTILS } from '../src/tools.js';
import { depuisBase64, compterPages } from '../src/pdf.js';

const consoleOrig = { ...console };
const sorties = [];
for (const k of ['log', 'info', 'warn', 'error', 'debug']) console[k] = (...a) => sorties.push([k, a]);
test.after(() => { Object.assign(console, consoleOrig); assert.equal(sorties.length, 0, 'aucune sortie console attendue'); });

async function session(envExtra) {
  const s = creerServeur(envExtra);
  const t = await obtenirJetons(s);
  return { s, jeton: t.access_token };
}
const sj = (r) => r.structuredContent;

test('tools/list : 6 outils, title et readOnlyHint ou destructiveHint partout', async () => {
  const { s, jeton } = await session();
  const { corps } = await rpc(s, jeton, 'tools/list');
  const outils = corps.result.tools;
  assert.deepEqual(outils.map((o) => o.name).sort(), ['annuler_brouillon', 'creer_courrier', 'estimer_prix', 'lister_courriers', 'preparer_lettre', 'statut_courrier']);
  for (const o of outils) {
    assert.ok(o.title && o.title.length > 3, o.name + ' title');
    assert.ok(o.name.length <= 64);
    assert.equal(typeof o.annotations.readOnlyHint, 'boolean', o.name);
    if (o.annotations.readOnlyHint === false) assert.equal(typeof o.annotations.destructiveHint, 'boolean', o.name);
    assert.equal(o.inputSchema.type, 'object');
  }
  const par = Object.fromEntries(outils.map((o) => [o.name, o.annotations]));
  assert.equal(par.annuler_brouillon.destructiveHint, true);
  assert.equal(par.creer_courrier.destructiveHint, false);
  assert.equal(par.estimer_prix.readOnlyHint, true);
  assert.equal(OUTILS.length, 6);
});

test('estimer_prix : prix arrondi à 2 décimales, erreur de l\'API relayée', async () => {
  const { s, jeton } = await session();
  const r = await appelOutil(s, jeton, 'estimer_prix', { nombre_feuilles: 1 });
  assert.equal(r.isError, undefined);
  assert.equal(sj(r).total_avant_taxes, 3.36);
  assert.equal(sj(r).devise, 'CAD');
  const e = await appelOutil(s, jeton, 'estimer_prix', { nombre_feuilles: 99 });
  assert.equal(e.isError, true);
  assert.equal(sj(e).erreur, 'nombre_feuilles_invalide');
  const v = await appelOutil(s, jeton, 'estimer_prix', { nombre_feuilles: 0 });
  assert.equal(sj(v).erreur, 'champs_invalides');
});

test('preparer_lettre FR : une page, aperçu, prix, pas de PDF par défaut, rien envoyé à Capycom', async () => {
  const { s, jeton } = await session();
  const avant = s.mock.appels.filter((a) => a.nom === 'api_creer_courrier').length;
  const r = await appelOutil(s, jeton, 'preparer_lettre', {
    expediteur: EXP, destinataire: DEST, langue: 'fr', objet: 'Résiliation de mon abonnement',
    texte: 'Madame, Monsieur,\n\nJe souhaite résilier mon abonnement n° 123456 à compter du 1er novembre 2026.\n\nMerci de me confirmer la résiliation par écrit.'
  });
  assert.equal(r.isError, undefined, JSON.stringify(sj(r)));
  const o = sj(r);
  assert.equal(o.pages, 1);
  assert.equal(o.prix.total_avant_taxes, 3.36);
  assert.equal(o.pdf_base64, undefined);
  assert.deepEqual(o.destinataire.slice(-2), ['Toronto QC  M4W 1G9', 'CANADA']);
  assert.match(o.apercu.date, /^Ottawa, le \d+(er)? \w+ \d{4}$/);
  assert.equal(s.mock.appels.filter((a) => a.nom === 'api_creer_courrier').length, avant);
});

test('preparer_lettre EN avec inclure_pdf : PDF valide, date et formules en anglais', async () => {
  const { s, jeton } = await session();
  const r = await appelOutil(s, jeton, 'preparer_lettre', { expediteur: EXP, destinataire: DEST, langue: 'en', texte: 'I would like to cancel my contract.', date: '2026-10-09', inclure_pdf: true });
  const o = sj(r);
  assert.equal(o.apercu.date, 'Ottawa, October 9, 2026');
  const pdf = depuisBase64(o.pdf_base64);
  assert.equal(String.fromCharCode(...pdf.slice(0, 5)), '%PDF-');
  assert.equal((await compterPages(pdf)).pages, 1);
});

test('lettre longue : plusieurs pages, nombre de pages envoyé au prix', async () => {
  const { s, jeton } = await session();
  const long = Array.from({ length: 40 }, (_, i) => `Paragraphe ${i + 1}. ` + 'Ceci est une phrase de remplissage assez longue pour occuper la ligne. '.repeat(3)).join('\n\n');
  const r = await appelOutil(s, jeton, 'preparer_lettre', { expediteur: EXP, destinataire: DEST, texte: long, inclure_pdf: true });
  const o = sj(r);
  assert.ok(o.pages >= 3, 'pages: ' + o.pages);
  assert.equal(s.mock.etat.derniers.api_estimer_prix.nombre_feuilles, o.pages);
  assert.equal((await compterPages(depuisBase64(o.pdf_base64))).pages, o.pages);
});

test('adresses : province en abréviation ou en anglais, code postal normalisé, hors Canada refusé', async () => {
  const { s, jeton } = await session();
  const mauvais = await appelOutil(s, jeton, 'preparer_lettre', {
    expediteur: { ...EXP, code_postal: '12345' }, destinataire: { ...DEST, province: 'Texas', pays: 'États-Unis' }, texte: 'Bonjour'
  });
  assert.equal(mauvais.isError, true);
  const champs = sj(mauvais).champs.join(' | ');
  assert.match(champs, /expediteur\.code_postal/);
  assert.match(champs, /destinataire\.province/);
  assert.match(champs, /destinataire\.pays/);
});

test('creer_courrier : exige la confirmation, envoie le PDF et les champs normalisés, un seul lien (test)', async () => {
  const { s, jeton } = await session();
  const args = { expediteur: EXP, destinataire: { ...DEST, province: 'QC' }, langue: 'en', couleur: true, texte: 'Please cancel my account.', cle_idempotence: 'rogers-2026-10' };
  const sans = await appelOutil(s, jeton, 'creer_courrier', { ...args, adresses_confirmees: false });
  assert.equal(sans.isError, true);
  assert.equal(s.mock.appels.filter((a) => a.nom === 'api_creer_courrier').length, 0);

  const r = await appelOutil(s, jeton, 'creer_courrier', { ...args, adresses_confirmees: true });
  assert.equal(r.isError, undefined, JSON.stringify(sj(r)));
  const o = sj(r);
  assert.match(o.id_courrier, /^1791565001023x/);
  assert.equal(o.total_avant_taxes, 3.36);
  assert.match(o.lien_paiement, /version-test\/login\?courrier=/);
  assert.equal(o.lien_paiement_test, undefined);
  assert.match(o.etape_suivante, /only after the account holder/);

  const corps = s.mock.etat.derniers.api_creer_courrier;
  assert.equal(corps.cle, CLE_VALIDE);
  assert.equal(corps.dest_province, 'Québec');
  assert.equal(corps.exp_province, 'Ontario');
  assert.equal(corps.exp_code_postal, 'K1P 5K6');
  assert.equal(corps.dest_appartement, '12');
  assert.equal(corps.couleur, true);
  assert.equal(corps.langue, 'English');
  assert.equal(corps.cle_idempotence, 'rogers-2026-10');
  assert.equal(corps.pdf.private, true);
  assert.match(corps.pdf.filename, /^lettre-\d{4}-\d{2}-\d{2}\.pdf$/);
  assert.equal(String.fromCharCode(...depuisBase64(corps.pdf.contents).slice(0, 5)), '%PDF-');

  // idempotence : même clé, même courrier
  const bis = await appelOutil(s, jeton, 'creer_courrier', { ...args, adresses_confirmees: true });
  assert.equal(sj(bis).id_courrier, o.id_courrier);
});

test('en production (sans version-test) le lien de paiement est celui de production', async () => {
  // L'URL de base reste celle du faux serveur : on vérifie seulement le choix du lien.
  const { s, jeton } = await session();
  s.mock.etat.prod = true;
  const r = await appelOutil(s, jeton, 'creer_courrier', { expediteur: EXP, destinataire: DEST, texte: 'Bonjour', adresses_confirmees: true });
  assert.match(sj(r).lien_paiement, /version-test/); // base de test => lien de test
});

test('statut, liste, annulation, annulation refusée', async () => {
  const { s, jeton } = await session();
  const c = sj(await appelOutil(s, jeton, 'creer_courrier', { expediteur: EXP, destinataire: DEST, texte: 'Bonjour', adresses_confirmees: true }));
  const st = sj(await appelOutil(s, jeton, 'statut_courrier', { id_courrier: c.id_courrier }));
  assert.equal(st.statut_courrier, 'brouillon');
  const li = sj(await appelOutil(s, jeton, 'lister_courriers', {}));
  assert.equal(li.courriers.length, 1);
  assert.equal(li.courriers[0].id, c.id_courrier);
  assert.equal(li.courriers[0].total_avant_taxes, 3.36);
  const an = await appelOutil(s, jeton, 'annuler_brouillon', { id_courrier: c.id_courrier });
  assert.equal(an.isError, undefined);
  const deux = await appelOutil(s, jeton, 'annuler_brouillon', { id_courrier: c.id_courrier });
  assert.equal(deux.isError, true);
  assert.equal(sj(deux).erreur, 'non_annulable');
  const inc = await appelOutil(s, jeton, 'statut_courrier', { id_courrier: 'inconnu' });
  assert.equal(sj(inc).erreur, 'introuvable');
});

test('PDF fourni par URL : téléchargé par le Worker, validé, envoyé tel quel', async () => {
  const { s, jeton } = await session();
  // PDF de test fabriqué par le Worker lui-même
  const prep = sj(await appelOutil(s, jeton, 'preparer_lettre', { expediteur: EXP, destinataire: DEST, texte: 'Document existant', inclure_pdf: true }));
  const octets = depuisBase64(prep.pdf_base64);
  s.mock.pdfs.set('https://exemple.test/docs/formulaire.pdf', octets);
  const p = sj(await appelOutil(s, jeton, 'preparer_lettre', { expediteur: EXP, destinataire: DEST, pdf_url: 'https://exemple.test/docs/formulaire.pdf' }));
  assert.equal(p.mode, 'pdf');
  assert.equal(p.pages, 1);
  const c = sj(await appelOutil(s, jeton, 'creer_courrier', { expediteur: EXP, destinataire: DEST, pdf_url: 'https://exemple.test/docs/formulaire.pdf', adresses_confirmees: true }));
  assert.ok(c.id_courrier);
  const envoye = s.mock.etat.derniers.api_creer_courrier.pdf;
  assert.equal(envoye.filename, 'formulaire.pdf');
  assert.deepEqual([...depuisBase64(envoye.contents)], [...octets]);

  // refus : http, pas un PDF, deux sources à la fois
  const http = await appelOutil(s, jeton, 'preparer_lettre', { expediteur: EXP, destinataire: DEST, pdf_url: 'http://exemple.test/a.pdf' });
  assert.equal(http.isError, true);
  s.mock.pdfs.set('https://exemple.test/faux.pdf', new TextEncoder().encode('pas un pdf'));
  const faux = await appelOutil(s, jeton, 'preparer_lettre', { expediteur: EXP, destinataire: DEST, pdf_url: 'https://exemple.test/faux.pdf' });
  assert.match(sj(faux).champs.join(' '), /not a PDF/);
  const deux = await appelOutil(s, jeton, 'preparer_lettre', { expediteur: EXP, destinataire: DEST, pdf_url: 'https://exemple.test/docs/formulaire.pdf', texte: 'x' });
  assert.equal(deux.isError, true);
});

test('clé remplacée côté Capycom : message clair pour reconnecter', async () => {
  const s = creerServeur();
  const t = await obtenirJetons(s);
  // On simule la révocation : le faux serveur n'accepte plus la clé.
  const orig = s.mock.fetch;
  s.mock.fetch = async (u, i) => { if (String(u).includes('/api_lister_courriers')) return new Response(JSON.stringify({ status: 'success', response: { statut: 'erreur', erreur: 'cle_invalide' } })); return orig(u, i); };
  const s2 = { ...s, appeler: (url, init) => import('../src/index.js').then((m) => m.traiterRequete(new Request('https://mcp.test' + url, init), s.env, { fetch: s.mock.fetch, maintenant: s.horloge.now })) };
  const r = await appelOutil(s2, t.access_token, 'lister_courriers', {});
  assert.equal(r.isError, true);
  assert.equal(sj(r).erreur, 'cle_invalide');
  assert.match(sj(r).message_fr, /reconnecter/);
});

test('API Capycom hors service : erreur propre, sans détail interne', async () => {
  const { s, jeton } = await session();
  s.mock.etat.indisponible = true;
  const r = await appelOutil(s, jeton, 'estimer_prix', { nombre_feuilles: 1 });
  assert.equal(r.isError, true);
  assert.equal(sj(r).erreur, 'api_indisponible');
});

test('outil inconnu, méthode inconnue, notification, lot', async () => {
  const { s, jeton } = await session();
  const inconnu = await rpc(s, jeton, 'tools/call', { name: 'payer', arguments: {} });
  assert.equal(inconnu.corps.error.code, -32602);
  const m = await rpc(s, jeton, 'resources/list');
  assert.equal(m.corps.error.code, -32601);
  const notif = await s.appeler('/mcp', { method: 'POST', headers: { authorization: 'Bearer ' + jeton, 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) });
  assert.equal(notif.status, 202);
  const lot = await s.appeler('/mcp', { method: 'POST', headers: { authorization: 'Bearer ' + jeton, 'content-type': 'application/json' }, body: JSON.stringify([{ jsonrpc: '2.0', id: 1, method: 'ping' }, { jsonrpc: '2.0', id: 2, method: 'tools/list' }]) });
  assert.equal((await lot.json()).length, 2);
  const get = await s.appeler('/mcp', { method: 'GET', headers: { authorization: 'Bearer ' + jeton } });
  assert.equal(get.status, 405);
});

test('le contenu de la lettre n\'est pas renvoyé dans les erreurs ni conservé : aucun état entre deux requêtes', async () => {
  const { s, jeton } = await session();
  const secret = 'MOT-SECRET-UNIQUE-98765';
  await appelOutil(s, jeton, 'creer_courrier', { expediteur: EXP, destinataire: DEST, texte: secret, adresses_confirmees: true });
  const l = await appelOutil(s, jeton, 'lister_courriers', {});
  assert.doesNotMatch(JSON.stringify(l), new RegExp(secret));
  assert.equal(sorties.length, 0);
});

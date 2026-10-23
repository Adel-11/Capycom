// Outils et prompts des modèles : lister_modeles, decrire_modele, remplir_modele, creer_courrier avec `modele`, prompts.
// Le vrai service moteur tourne dans le test (port local) ; Bubble est simulé. Aucune donnée réelle : personnes et adresses inventées.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { creerServeur, avecMoteur, obtenirJetons, rpc, appelOutil, EXP, DEST } from './aide.js';
import { JPEG_B64, SIGNATURE_PNG_B64, PDF_CHIFFRE, PDF_VRAI_CHIFFRE_B64, pdfDePages, enBase64 } from './fixtures.js';
import { remplacerTelechargeur } from '../serveur-modeles/rendu.mjs';
import { DEFS, TOUS, champ, normaliserReponses } from '../src/modeles-commun.js';

const consoleOrig = { ...console };
const sorties = [];
for (const k of ['log', 'info', 'warn', 'error', 'debug']) console[k] = (...a) => sorties.push([k, a]);
test.after(() => { Object.assign(console, consoleOrig); assert.equal(sorties.length, 0, 'aucune sortie console attendue : ' + JSON.stringify(sorties).slice(0, 300)); });

const cas = JSON.parse(fs.readFileSync(new URL('../modeles/tests/cas.json', import.meta.url), 'utf8'));
const cas1 = (id) => cas.find((c) => c.id === id);
const sj = (r) => r.structuredContent;

const ouverts = [];
test.after(async () => { for (const s of ouverts) await s.fermerMoteur?.(); });
async function session(options) {
  const s = creerServeur(options?.env);
  const m = options?.sansMoteur ? null : await avecMoteur(s, options?.moteur);
  ouverts.push(s);
  const t = await obtenirJetons(s);
  return { s, jeton: t.access_token, m, fermer: () => s.fermerMoteur?.() };
}

const SIG = { signature_base64: SIGNATURE_PNG_B64 };
const rcCouple = () => ({ modele: 'rc66', reponses: cas1('rc-couple-2enfants-sig').v, langue: 'fr', ...SIG });
const naissance = () => ({ piece: 'naissance', base64: JPEG_B64, nom: 'naissance.jpg' });

/* ---------- catalogue et description ---------- */

test('lister_modeles : les trois modèles du pilote, FR et EN, rien n\'est créé', async () => {
  const { s, jeton, fermer } = await session();
  const fr = await appelOutil(s, jeton, 'lister_modeles', {});
  assert.deepEqual(sj(fr).modeles.map((m) => m.id), ['rc66', 'credit', 'resiliation']);
  assert.equal(sj(fr).modeles[0].type, 'official_form');
  assert.equal(sj(fr).modeles[0].signature, 'required');
  assert.match(sj(fr).modeles[0].titre, /Allocation canadienne/);
  const en = await appelOutil(s, jeton, 'lister_modeles', { langue: 'en' });
  assert.match(sj(en).modeles[0].titre, /Canada child benefit/);
  assert.equal(s.mock.appels.filter((a) => a.nom === 'api_creer_courrier').length, 0);
  await fermer();
});

test('MODELES_ACTIFS : la liste se règle par variable, un modèle non actif est refusé', async () => {
  const { s, jeton, fermer } = await session({ env: { MODELES_ACTIFS: 'rc66,demeure' } });
  const l = await appelOutil(s, jeton, 'lister_modeles', {});
  assert.deepEqual(sj(l).modeles.map((m) => m.id), ['rc66', 'demeure']);
  const e = await appelOutil(s, jeton, 'decrire_modele', { modele: 'credit' });
  assert.equal(e.isError, true);
  assert.equal(sj(e).erreur, 'modele_inconnu');
  await fermer();
});

test('decrire_modele rc66 : pages officielles, mises en garde, questions, pièces, signature, centres fiscaux', async () => {
  const { s, jeton, fermer } = await session();
  const r = sj(await appelOutil(s, jeton, 'decrire_modele', { modele: 'rc66' }));
  assert.equal(r.statut, 'ok');
  assert.ok(r.avant_de_commencer.pages_officielles_a_lire.length >= 2);
  for (const l of r.avant_de_commencer.pages_officielles_a_lire) assert.match(l.url, /^https:\/\/www\.canada\.ca\/fr\//);
  assert.ok(r.avant_de_commencer.mises_en_garde.some((t) => /conseil juridique/.test(t)));
  const champs = r.questions.flatMap((q) => q.champs);
  for (const id of ['rc_nas', 'rc_prenom', 'rcp_prov', 'rc_e{n}_prenom', 'rc_sch_y_rc', 'rc_sch_s_rc']) assert.ok(champs.some((c) => c.id === id), id);
  const prov = champs.find((c) => c.id === 'rcp_prov');
  assert.ok(prov.valeurs.includes('Ontario') && prov.valeurs.includes('Québec'));
  assert.ok(champs.find((c) => c.id === 'rc_sch_y_ra').afficher_si);
  assert.ok(r.pieces_a_joindre.some((p) => p.id === 'naissance' && p.requis));
  assert.equal(r.signature.requise, true);
  assert.match(r.signature.aide, /must not draw/);
  assert.equal(r.destinataires.length, 3);
  assert.match(r.confidentialite, /never stored or logged/);
  // pas d'avis juridique : aucune phrase du type « vous avez droit »
  assert.doesNotMatch(JSON.stringify(r), /vous avez droit|you are entitled|you qualify/i);
  await fermer();
});

test('decrire_modele credit et résiliation : bureau, destinataires, champs d\'une lettre', async () => {
  const { s, jeton, fermer } = await session();
  const c = sj(await appelOutil(s, jeton, 'decrire_modele', { modele: 'credit', langue: 'en' }));
  assert.deepEqual(c.bureau.valeurs, ['eq', 'tu']);
  assert.equal(c.destinataires.length, 2);
  assert.match(c.destinataires[0].nom, /Equifax/);
  const r = sj(await appelOutil(s, jeton, 'decrire_modele', { modele: 'resiliation' }));
  const ids = r.questions.flatMap((q) => q.champs).map((x) => x.id);
  for (const id of ['exp_nom', 'dest_nom', 'dest_cp', 'service', 'num_client']) assert.ok(ids.includes(id), id);
  assert.equal(r.signature, undefined);
  await fermer();
});

test('définitions : tous les identifiants de réponses des cas de test sont connus, pour les 7 modèles', () => {
  for (const c of cas) {
    const { inconnus } = normaliserReponses(c.modele, c.v);
    assert.deepEqual(inconnus, [], c.id);
  }
  for (const id of TOUS) {
    const d = DEFS[id];
    const champs = d.etapes ? d.etapes.flatMap((e) => e.champs || []) : d.champs;
    for (const c of champs) assert.ok(champ(id, c.id.replace('{n}', '1')), `${id}.${c.id}`);
  }
});

/* ---------- remplir_modele ---------- */

test('remplir_modele : réponses vides → incomplet, le moteur n\'est pas appelé', async () => {
  let appels = 0;
  const { s, jeton, fermer } = await session({ moteur: { rendu: async () => { appels++; return {}; } } });
  const r = sj(await appelOutil(s, jeton, 'remplir_modele', { modele: 'rc66', reponses: {} }));
  assert.equal(r.statut, 'incomplet');
  const etapes = r.manquants.map((m) => m.etape);
  assert.ok(etapes.includes('vous') && etapes.includes('signature'));
  assert.ok(r.manquants.find((m) => m.etape === 'vous').champs.find((c) => c.id === 'rc_prenom').libelle);
  assert.equal(appels, 0);
  await fermer();
});

test('remplir_modele rc66 : formulaire + pièce (JPEG) fusionnés, pages, destinataire, prix, rien créé chez Capycom', async () => {
  const { s, jeton, fermer } = await session();
  const r = await appelOutil(s, jeton, 'remplir_modele', { ...rcCouple(), pieces_jointes: [naissance()] });
  const o = sj(r);
  assert.equal(r.isError, undefined, JSON.stringify(o));
  assert.equal(o.statut, 'ok');
  assert.equal(o.pret_a_creer, true);
  assert.equal(o.documents[0].pages, 4);
  assert.equal(o.documents[1].pages, 1);
  assert.equal(o.pages_total, 5);
  assert.equal(o.prix.devise, 'CAD');
  assert.match(o.destinataire.join(' '), /Centre fiscal de Jonquière/);
  assert.match(o.expediteur[0], /Tremblay/);
  assert.equal(s.mock.appels.filter((a) => a.nom === 'api_creer_courrier').length, 0);
  assert.equal(o.pdf_base64, undefined, 'le PDF n\'est jamais renvoyé');
  await fermer();
});

test('remplir_modele : pièce obligatoire absente, signature absente, pièce inconnue', async () => {
  const { s, jeton, fermer } = await session();
  const sans = await appelOutil(s, jeton, 'remplir_modele', { modele: 'rc66', reponses: cas1('rc-couple-2enfants-sig').v });
  const m = sj(sans).manquants;
  assert.ok(m.find((x) => x.etape === 'signature'));
  assert.ok(m.find((x) => x.etape === 'pieces_jointes').champs.some((c) => /naissance/.test(c.id)));
  const inconnue = await appelOutil(s, jeton, 'remplir_modele', { ...rcCouple(), pieces_jointes: [{ piece: 'nimporte', base64: JPEG_B64 }] });
  assert.equal(sj(inconnue).erreur, 'champs_invalides');
  const deux = await appelOutil(s, jeton, 'remplir_modele', { ...rcCouple(), pieces_jointes: [{ piece: 'naissance', base64: JPEG_B64, url: 'https://exemple.test/a.pdf' }] });
  assert.equal(sj(deux).erreur, 'champs_invalides');
  await fermer();
});

test('remplir_modele : pièces PDF de plusieurs pages, ordre des pièces suivant la liste attendue, pages comptées', async () => {
  const { s, jeton, fermer } = await session();
  const pdf3 = enBase64(await pdfDePages(3));
  const r = sj(await appelOutil(s, jeton, 'remplir_modele', {
    ...rcCouple(), pieces_jointes: [{ piece: 'autres', base64: pdf3, nom: 'autre.pdf' }, naissance()]
  }));
  assert.equal(r.statut, 'ok', JSON.stringify(r));
  assert.deepEqual(r.documents.map((d) => d.pages), [4, 1, 3]);
  assert.match(r.documents[1].contenu, /naissance/);
  assert.match(r.documents[2].contenu, /autres/);
  await fermer();
});

test('remplir_modele : PDF chiffré → piece_invalide ; fichier de type inconnu → piece_invalide ; trop de pages → trop_de_pages', async () => {
  const { s, jeton, fermer } = await session();
  const chiffre = sj(await appelOutil(s, jeton, 'remplir_modele', { ...rcCouple(), pieces_jointes: [{ piece: 'naissance', base64: PDF_VRAI_CHIFFRE_B64, nom: 'n.pdf' }] }));
  assert.equal(chiffre.erreur, 'piece_invalide');
  assert.equal(chiffre.piece, 'naissance');
  assert.match(chiffre.message, /password or encrypted/);
  const casse = sj(await appelOutil(s, jeton, 'remplir_modele', { ...rcCouple(), pieces_jointes: [{ piece: 'naissance', base64: Buffer.from(PDF_CHIFFRE).toString('base64'), nom: 'n.pdf' }] }));
  assert.equal(casse.erreur, 'piece_invalide', 'un PDF sans aucune page est refusé');
  assert.doesNotMatch(JSON.stringify(chiffre), /at .*\.js:\d+/, 'aucune trace technique');
  const texte = sj(await appelOutil(s, jeton, 'remplir_modele', { ...rcCouple(), pieces_jointes: [{ piece: 'naissance', base64: Buffer.from('ceci n\'est pas un PDF').toString('base64') }] }));
  assert.equal(texte.erreur, 'piece_invalide');
  const gros = sj(await appelOutil(s, jeton, 'remplir_modele', { ...rcCouple(), pieces_jointes: [{ piece: 'naissance', base64: enBase64(await pdfDePages(28)) }] }));
  assert.equal(gros.erreur, 'trop_de_pages');
  assert.equal(gros.maximum, 30);
  await fermer();
});

test('remplir_modele credit : bureau obligatoire ; Equifax avec pièces obligatoires ; TransUnion sans pièce obligatoire', async () => {
  const { s, jeton, fermer } = await session();
  const v = cas1('cr-eq-3comptes-perso').v;
  const sansBureau = sj(await appelOutil(s, jeton, 'remplir_modele', { modele: 'credit', reponses: v, ...SIG }));
  assert.equal(sansBureau.statut, 'incomplet');
  assert.ok(sansBureau.manquants.some((m) => m.etape === 'bureau'));
  const eqSans = sj(await appelOutil(s, jeton, 'remplir_modele', { modele: 'credit', reponses: v, bureau: 'eq', langue: 'en', ...SIG }));
  assert.equal(eqSans.statut, 'incomplet');
  assert.deepEqual(eqSans.manquants.find((m) => m.etape === 'pieces_jointes').champs.length, 3);
  const eq = sj(await appelOutil(s, jeton, 'remplir_modele', {
    modele: 'credit', reponses: v, bureau: 'eq', langue: 'en', ...SIG,
    pieces_jointes: [{ piece: 'pieces', base64: JPEG_B64 }, { piece: 'adresse', base64: JPEG_B64 }, { piece: 'creancier', base64: JPEG_B64 }]
  }));
  assert.equal(eq.statut, 'ok', JSON.stringify(eq));
  assert.match(eq.destinataire[0], /Equifax/);
  assert.equal(eq.pages_total, eq.documents[0].pages + 3);
  const tu = sj(await appelOutil(s, jeton, 'remplir_modele', { modele: 'credit', reponses: cas1('cr-tu-6comptes-sig').v, bureau: 'tu', ...SIG }));
  assert.equal(tu.statut, 'ok', JSON.stringify(tu));
  assert.match(tu.destinataire[0], /TransUnion/);
  await fermer();
});

test('remplir_modele résiliation : une lettre d\'une page sans signature ni pièce, date par défaut', async () => {
  const { s, jeton, fermer } = await session();
  const v = { ...cas1('res-fr').v }; delete v.date_lettre;
  const r = sj(await appelOutil(s, jeton, 'remplir_modele', { modele: 'resiliation', reponses: v }));
  assert.equal(r.statut, 'ok', JSON.stringify(r));
  assert.equal(r.pages_total, 1);
  assert.match(r.destinataire[0], /Telecom Plus/);
  const avecPiece = await appelOutil(s, jeton, 'remplir_modele', { modele: 'resiliation', reponses: v, pieces_jointes: [{ piece: 'x', base64: JPEG_B64 }] });
  assert.equal(sj(avecPiece).erreur, 'champs_invalides');
  await fermer();
});

test('remplir_modele : cases booléennes et nombres acceptés, identifiants inconnus signalés sans bloquer', async () => {
  const { s, jeton, fermer } = await session();
  const v = { ...cas1('res-fr').v, inconnu_xyz: 'a', service: 'abonnement' };
  const r = sj(await appelOutil(s, jeton, 'remplir_modele', { modele: 'resiliation', reponses: v }));
  assert.equal(r.statut, 'ok');
  assert.ok(r.avertissements.some((a) => /inconnu_xyz/.test(a)));
  await fermer();
});

/* ---------- moteur absent, mal protégé, occupé ---------- */

test('moteur non configuré ou injoignable : erreur claire, les lettres libres marchent toujours', async () => {
  const sans = await session({ sansMoteur: true });
  const r = await appelOutil(sans.s, sans.jeton, 'remplir_modele', { ...rcCouple(), pieces_jointes: [naissance()] });
  assert.equal(r.isError, true);
  assert.equal(sj(r).erreur, 'moteur_non_configure');
  const lettre = await appelOutil(sans.s, sans.jeton, 'preparer_lettre', { expediteur: EXP, destinataire: DEST, texte: 'Bonjour' });
  assert.equal(sj(lettre).statut, 'ok');

  const { s, jeton, fermer } = await session();
  await fermer();   // le moteur s'arrête : plus personne n'écoute
  const panne = await appelOutil(s, jeton, 'remplir_modele', { ...rcCouple(), pieces_jointes: [naissance()] });
  assert.equal(sj(panne).erreur, 'moteur_indisponible');
  assert.match(sj(panne).message, /free-text letters/);
  const lettre2 = await appelOutil(s, jeton, 'creer_courrier', { expediteur: EXP, destinataire: DEST, texte: 'Bonjour', adresses_confirmees: true });
  assert.equal(sj(lettre2).statut, 'ok');
});

test('moteur : mauvais secret → 401 sans détail ; occupé → moteur_occupe', async () => {
  const mauvais = await session({ moteur: { secretWorker: 'un-autre-secret-assez-long-pour-passer' } });
  const r = await appelOutil(mauvais.s, mauvais.jeton, 'remplir_modele', { ...rcCouple(), pieces_jointes: [naissance()] });
  assert.equal(sj(r).erreur, 'moteur_non_autorise');
  await mauvais.fermer();

  let liberer;
  const lent = await session({ moteur: { simultanes: 1, rendu: () => new Promise((ok) => { liberer = ok; }) } });
  const premiere = appelOutil(lent.s, lent.jeton, 'remplir_modele', { ...rcCouple(), pieces_jointes: [naissance()] });
  await new Promise((ok) => setTimeout(ok, 100));
  const seconde = await appelOutil(lent.s, lent.jeton, 'remplir_modele', { ...rcCouple(), pieces_jointes: [naissance()] });
  assert.equal(sj(seconde).erreur, 'moteur_occupe');
  liberer({ pages_formulaire: 4, pieces: [], pages_total: 4 });
  assert.equal(sj(await premiere).statut, 'ok');
  await lent.fermer();
});

/* ---------- creer_courrier avec un modèle ---------- */

test('creer_courrier avec modele rc66 : un seul PDF fusionné envoyé à Capycom, adresses du modèle, canal mcp, lien de paiement', async () => {
  const { s, jeton, fermer } = await session();
  const r = await appelOutil(s, jeton, 'creer_courrier', { ...rcCouple(), pieces_jointes: [naissance()], adresses_confirmees: true });
  const o = sj(r);
  assert.equal(r.isError, undefined, JSON.stringify(o));
  assert.equal(o.statut, 'ok');
  assert.equal(o.modele, 'rc66');
  assert.equal(o.pages_envoyees, 5);
  assert.ok(o.lien_paiement_test || o.lien_paiement);
  assert.equal(o.avertissements.length, 0, 'nombre de feuilles identique des deux côtés');
  const corps = s.mock.etat.derniers.api_creer_courrier;
  assert.equal(corps.canal, 'mcp');
  assert.equal(corps.pdf.filename, 'rc66.pdf', 'nom de fichier sans donnée personnelle');
  assert.equal(corps.dest_nom, 'Centre fiscal de Jonquière');
  assert.equal(corps.dest_province, 'Québec');
  assert.match(corps.exp_nom, /Tremblay/);
  assert.equal(corps.couleur, false);
  const pdf = await PDFDocument.load(s.mock.etat.dernierPdf);
  assert.equal(pdf.getPageCount(), 5);
  assert.deepEqual([Math.round(pdf.getPage(0).getWidth()), Math.round(pdf.getPage(0).getHeight())], [612, 792]);
  await fermer();
});

test('creer_courrier avec modele : exige la confirmation, refuse deux sources, refuse un dossier incomplet', async () => {
  const { s, jeton, fermer } = await session();
  const sansConf = await appelOutil(s, jeton, 'creer_courrier', { ...rcCouple(), pieces_jointes: [naissance()] });
  assert.equal(sj(sansConf).erreur, 'champs_invalides');
  const deux = await appelOutil(s, jeton, 'creer_courrier', { ...rcCouple(), texte: 'Bonjour', adresses_confirmees: true });
  assert.equal(sj(deux).erreur, 'champs_invalides');
  const incomplet = await appelOutil(s, jeton, 'creer_courrier', { modele: 'rc66', reponses: {}, adresses_confirmees: true });
  assert.equal(sj(incomplet).statut, 'incomplet');
  assert.equal(s.mock.appels.filter((a) => a.nom === 'api_creer_courrier').length, 0, 'aucun brouillon créé');
  await fermer();
});

test('creer_courrier avec modele credit (TransUnion) et résiliation : un courrier chacun', async () => {
  const { s, jeton, fermer } = await session();
  const tu = sj(await appelOutil(s, jeton, 'creer_courrier', { modele: 'credit', reponses: cas1('cr-tu-6comptes-sig').v, bureau: 'tu', ...SIG, adresses_confirmees: true }));
  assert.equal(tu.statut, 'ok', JSON.stringify(tu));
  assert.equal(s.mock.etat.derniers.api_creer_courrier.pdf.filename, 'credit-tu.pdf');
  assert.match(s.mock.etat.derniers.api_creer_courrier.dest_nom, /TransUnion/);
  const res = sj(await appelOutil(s, jeton, 'creer_courrier', { modele: 'resiliation', reponses: cas1('res-fr').v, langue: 'fr', adresses_confirmees: true, cle_idempotence: 'abc' }));
  assert.equal(res.statut, 'ok');
  assert.equal(res.pages_envoyees, 1);
  assert.equal(s.mock.etat.derniers.api_creer_courrier.dest_nom, 'Telecom Plus inc., Service des résiliations');
  const rejeu = sj(await appelOutil(s, jeton, 'creer_courrier', { modele: 'resiliation', reponses: cas1('res-fr').v, langue: 'fr', adresses_confirmees: true, cle_idempotence: 'abc' }));
  assert.equal(rejeu.id_courrier, res.id_courrier, 'même brouillon avec la même clé');
  await fermer();
});

test('creer_courrier libre : expéditeur et destinataire toujours obligatoires sans modèle', async () => {
  const { s, jeton, fermer } = await session();
  const r = await appelOutil(s, jeton, 'creer_courrier', { texte: 'Bonjour', adresses_confirmees: true });
  assert.equal(sj(r).erreur, 'champs_invalides');
  assert.ok(sj(r).champs.some((c) => /^expediteur/.test(c)) && sj(r).champs.some((c) => /^destinataire/.test(c)));
  await fermer();
});

test('pièces par adresse https : téléchargées par le moteur (téléchargeur simulé), adresse refusée sans le moteur réseau', async () => {
  const pdf2 = await pdfDePages(2);
  const vus = [];
  remplacerTelechargeur(async (adresse) => { vus.push(adresse); return new Uint8Array(pdf2); });
  try {
    const { s, jeton, fermer } = await session();
    const r = sj(await appelOutil(s, jeton, 'remplir_modele', { ...rcCouple(), pieces_jointes: [{ piece: 'naissance', url: 'https://exemple.test/naissance.pdf' }] }));
    assert.equal(r.statut, 'ok', JSON.stringify(r));
    assert.deepEqual(vus, ['https://exemple.test/naissance.pdf']);
    assert.equal(r.pages_total, 6);
    const http = await appelOutil(s, jeton, 'remplir_modele', { ...rcCouple(), pieces_jointes: [{ piece: 'naissance', url: 'http://exemple.test/n.pdf' }] });
    assert.equal(sj(http).erreur, 'champs_invalides');
    await fermer();
  } finally { remplacerTelechargeur(null); }
});

/* ---------- prompts ---------- */

test('prompts/list et prompts/get : un scénario par modèle, avec les consignes de prudence', async () => {
  const { s, jeton, fermer } = await session();
  const init = await rpc(s, jeton, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } });
  assert.ok(init.corps.result.capabilities.prompts);
  const l = (await rpc(s, jeton, 'prompts/list')).corps.result.prompts;
  assert.deepEqual(l.map((p) => p.name), ['rc66', 'credit', 'resiliation']);
  assert.match(l[0].title, /RC66/);
  assert.equal(l[0].arguments[0].name, 'langue');
  const g = (await rpc(s, jeton, 'prompts/get', { name: 'rc66', arguments: { langue: 'fr' } })).corps.result;
  const t = g.messages[0].content.text;
  assert.match(t, /decrire_modele/);
  assert.match(t, /remplir_modele/);
  assert.match(t, /creer_courrier/);
  assert.match(t, /do not give legal or tax advice/);
  assert.match(t, /Never draw, type or invent a signature/);
  assert.match(t, /you never pay/);
  const gc = (await rpc(s, jeton, 'prompts/get', { name: 'credit', arguments: { langue: 'en' } })).corps.result.messages[0].content.text;
  assert.match(gc, /eq = Equifax/);
  const gr = (await rpc(s, jeton, 'prompts/get', { name: 'resiliation' })).corps.result.messages[0].content.text;
  assert.doesNotMatch(gr, /signature image/);
  const inconnu = (await rpc(s, jeton, 'prompts/get', { name: 'adresse' })).corps.error;
  assert.equal(inconnu.code, -32602);
  await fermer();
});

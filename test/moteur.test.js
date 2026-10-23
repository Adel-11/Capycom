// Service moteur : protection par secret, aucune fuite dans les erreurs, anti-SSRF des pièces par adresse, rendu des pièces.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import { creerServeur } from '../serveur-modeles/serveur.mjs';
import { adresseInterdite, telecharger, ErreurReseau } from '../serveur-modeles/reseau.mjs';
import { rendre, typeDe, dimensions, ErreurRendu, remplacerTelechargeur } from '../serveur-modeles/rendu.mjs';
import { JPEG_B64, SIGNATURE_PNG_B64, pdfDePages } from './fixtures.js';

const consoleOrig = { ...console };
const sorties = [];
for (const k of ['log', 'info', 'warn', 'error', 'debug']) console[k] = (...a) => sorties.push([k, a]);
test.after(() => { Object.assign(console, consoleOrig); assert.equal(sorties.length, 0, 'aucune sortie console attendue : ' + JSON.stringify(sorties).slice(0, 300)); });

const cas = JSON.parse(fs.readFileSync(new URL('../modeles/tests/cas.json', import.meta.url), 'utf8'));
const cas1 = (id) => cas.find((c) => c.id === id);
const SECRET = 'secret-moteur-de-test-' + 'z'.repeat(30);
const demandeRc = (extra = {}) => ({
  modele: 'rc66', reponses: cas1('rc-couple-2enfants-sig').v, langue: 'fr', today: '2026-10-17', sortie: 'resume',
  signature: { base64: SIGNATURE_PNG_B64 }, pieces: [{ piece: 'naissance', base64: JPEG_B64 }], ...extra
});

async function serveur(options = {}) {
  const srv = creerServeur({ secret: SECRET, ...options });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  const url = `http://127.0.0.1:${srv.address().port}`;
  const fermer = () => new Promise((ok) => { srv.close(ok); srv.closeAllConnections?.(); });
  return { url, fermer };
}
const poster = (url, corps, secret = SECRET) => fetch(url + '/rendre', { method: 'POST', headers: { 'content-type': 'application/json', ...(secret ? { 'x-moteur-secret': secret } : {}) }, body: typeof corps === 'string' ? corps : JSON.stringify(corps) });

/* ---------- serveur ---------- */

test('le service refuse de démarrer sans secret assez long', () => {
  assert.throws(() => creerServeur({ secret: '' }), /MOTEUR_SECRET/);
  assert.throws(() => creerServeur({ secret: 'court' }), /MOTEUR_SECRET/);
});

test('serveur : /sante sans secret, tout le reste protégé, erreurs sans détail', async () => {
  const { url, fermer } = await serveur();
  try {
    const sante = await fetch(url + '/sante');
    assert.deepEqual(await sante.json(), { ok: true });
    assert.equal((await poster(url, demandeRc(), null)).status, 401);
    assert.equal((await poster(url, demandeRc(), 'mauvais-secret-mauvais-secret-x')).status, 401);
    assert.equal((await fetch(url + '/autre')).status, 404);
    assert.equal((await fetch(url + '/rendre')).status, 404, 'GET refusé');
    const json = await (await poster(url, '{pas du json')).json();
    assert.equal(json.erreur, 'json_invalide');
    const ok = await (await poster(url, demandeRc())).json();
    assert.equal(ok.statut, 'ok');
    assert.equal(ok.pages_total, 5);
    assert.equal(ok.pdf_base64, undefined, 'mode résumé : pas de PDF');
  } finally { await fermer(); }
});

test('serveur : une panne interne ne renvoie aucun détail (les réponses pourraient s\'y trouver)', async () => {
  const { url, fermer } = await serveur({ rendu: async () => { throw new Error('rc_nas 123 456 789 dans le message'); } });
  try {
    const r = await poster(url, demandeRc());
    assert.equal(r.status, 500);
    const texte = await r.text();
    assert.doesNotMatch(texte, /123 456 789|rc_nas/);
    assert.match(texte, /erreur_interne/);
  } finally { await fermer(); }
});

test('serveur : au plus N rendus en même temps, les autres reçoivent 503', async () => {
  let liberer;
  const { url, fermer } = await serveur({ simultanes: 1, rendu: () => new Promise((ok) => { liberer = ok; }) });
  try {
    const premiere = poster(url, demandeRc());
    await new Promise((ok) => setTimeout(ok, 80));
    assert.equal((await poster(url, demandeRc())).status, 503);
    liberer({ pages_formulaire: 4, pieces: [], pages_total: 4 });
    assert.equal((await premiere).status, 200);
  } finally { await fermer(); }
});

test('serveur : création du brouillon par le moteur, adresse d\'API hors liste refusée, clé jamais renvoyée', async () => {
  const CLE = 'cle-api-de-test-tres-secrete-123';
  const appels = [];
  const fetchApi = async (u, i) => { appels.push({ u: String(u), corps: JSON.parse(i.body) }); return new Response(JSON.stringify({ response: { statut: 'ok', id_courrier: 'x1', nombre_feuilles: 5 } }), { status: 200, headers: { 'content-type': 'application/json' } }); };
  const { url, fermer } = await serveur({ apisAutorisees: ['https://capycom.test/'], fetchApi });
  try {
    const creation = (api_base) => ({ api_base, cle: CLE, nom_fichier: 'rc66.pdf', champs: { couleur: false } });
    const hors = await (await poster(url, demandeRc({ sortie: 'creer', creation: creation('https://autre.example/api/1.1/wf') }))).text();
    assert.match(hors, /creation_refusee/);
    assert.doesNotMatch(hors, new RegExp(CLE));
    assert.equal(appels.length, 0, 'aucun appel vers une adresse hors liste');
    const proche = await (await poster(url, demandeRc({ sortie: 'creer', creation: creation('https://capycom.test.evil.example/api/1.1/wf') }))).text();
    assert.match(proche, /creation_refusee/);
    const ok = await (await poster(url, demandeRc({ sortie: 'creer', creation: creation('https://capycom.test/api/1.1/wf') }))).json();
    assert.equal(ok.statut, 'ok');
    assert.equal(appels.length, 1);
    assert.equal(appels[0].corps.pdf.private, true);
    assert.equal((await PDFDocument.load(Buffer.from(appels[0].corps.pdf.contents, 'base64'))).getPageCount(), 5);
    assert.doesNotMatch(JSON.stringify(ok), new RegExp(CLE));
  } finally { await fermer(); }
});

/* ---------- réseau ---------- */

test('adresseInterdite : réseau local, Tailscale, métadonnées cloud, IPv6 privées et IPv4 enveloppées', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.5.5', '172.31.255.255', '192.168.1.10', '100.64.0.5', '100.127.255.254', '169.254.169.254', '0.0.0.0', '224.0.0.1',
    '::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:192.168.0.1', 'pas une ip']) assert.equal(adresseInterdite(ip), true, ip);
  for (const ip of ['8.8.8.8', '1.1.1.1', '104.16.0.1', '172.32.0.1', '100.128.0.1', '2606:4700:4700::1111']) assert.equal(adresseInterdite(ip), false, ip);
});

test('telecharger : http, identifiants, port, adresse IP, hôte résolu vers le LAN et redirection vers le LAN sont refusés', async () => {
  const refus = async (u, opts) => { await assert.rejects(() => telecharger(u, opts), (e) => e instanceof ErreurReseau); };
  await refus('http://exemple.test/a.pdf');
  await refus('https://user:mdp@exemple.test/a.pdf');
  await refus('https://exemple.test:8443/a.pdf');
  await refus('https://127.0.0.1/a.pdf');
  await refus('https://[::1]/a.pdf');
  await refus('pas une adresse');
  // hôte public qui se résout vers une adresse privée (rebond DNS) : refusé avant toute connexion
  const resolveurLan = async () => { throw new ErreurReseau('adresse_refusee', 'address not allowed'); };
  await assert.rejects(() => telecharger('https://exemple.test/a.pdf', { resolveur: resolveurLan, essai: async () => assert.fail('aucune connexion') }), { code: 'adresse_refusee' });
  // redirection vers un hôte interne : le second saut est revérifié
  const vus = [];
  const resolveur = async (h) => { vus.push(h); if (h === 'interne.exemple.test') throw new ErreurReseau('adresse_refusee', 'address not allowed'); return { address: '93.184.216.34', family: 4 }; };
  const essai = async (u) => (u.hostname === 'exemple.test' ? { redirection: 'https://interne.exemple.test/secret' } : assert.fail('ne doit pas être atteint'));
  await assert.rejects(() => telecharger('https://exemple.test/a.pdf', { resolveur, essai }), { code: 'adresse_refusee' });
  assert.deepEqual(vus, ['exemple.test', 'interne.exemple.test']);
  // redirection sans fin
  await assert.rejects(() => telecharger('https://exemple.test/a.pdf', { resolveur: async () => ({ address: '93.184.216.34', family: 4 }), essai: async () => ({ redirection: 'https://exemple.test/b' }) }), { code: 'trop_de_redirections' });
  // chemin normal
  const octets = await telecharger('https://exemple.test/a.pdf', { resolveur: async () => ({ address: '93.184.216.34', family: 4 }), essai: async (u, ip) => { assert.equal(ip, '93.184.216.34'); return { octets: new Uint8Array([1, 2, 3]) }; } });
  assert.deepEqual([...octets], [1, 2, 3]);
});

test('pièce par adresse interne : le moteur la refuse avant tout accès réseau (téléchargeur réel)', async () => {
  remplacerTelechargeur(null);
  for (const adresse of ['https://127.0.0.1/a.pdf', 'https://localhost/a.pdf', 'https://169.254.169.254/latest/meta-data', 'http://exemple.test/a.pdf']) {
    await assert.rejects(() => rendre(demandeRc({ pieces: [{ piece: 'naissance', url: adresse }] })), (e) => e instanceof ErreurRendu && e.code === 'piece_telechargement', adresse);
  }
});

/* ---------- rendu ---------- */

test('typeDe et dimensions : JPEG, PNG, PDF ; autre chose refusé', async () => {
  assert.equal(typeDe(Buffer.from(JPEG_B64, 'base64')), 'jpeg');
  assert.equal(typeDe(Buffer.from(SIGNATURE_PNG_B64, 'base64')), 'png');
  assert.equal(typeDe(await pdfDePages(1)), 'pdf');
  assert.equal(typeDe(Buffer.from('hello world')), null);
  assert.deepEqual(dimensions(new Uint8Array(Buffer.from(SIGNATURE_PNG_B64, 'base64')), 'png'), { w: 300, h: 90 });
  assert.deepEqual(dimensions(new Uint8Array(Buffer.from(JPEG_B64, 'base64')), 'jpeg'), { w: 120, h: 80 });
});

test('rendu : photo en paysage → page paysage ; signature invalide ; signature absente d\'un formulaire', async () => {
  const r = await rendre(demandeRc({ sortie: 'pdf' }));
  const doc = await PDFDocument.load(r.octets);
  assert.equal(doc.getPageCount(), 5);
  const derniere = doc.getPage(4).getSize();
  assert.equal(Math.round(derniere.width), 792, 'JPEG 120x80 → paysage');
  await assert.rejects(() => rendre(demandeRc({ signature: { base64: Buffer.from('pas une image').toString('base64') } })), { code: 'signature_invalide' });
  await assert.rejects(() => rendre(demandeRc({ signature: null })), { code: 'signature_manquante' });
  await assert.rejects(() => rendre(demandeRc({ modele: 'inconnu' })), { code: 'modele_inconnu' });
  await assert.rejects(() => rendre(demandeRc({ reponses: {} })), { code: 'reponses_incompletes' });
  await assert.rejects(() => rendre(demandeRc({ pieces: [{ piece: 'nimporte', base64: JPEG_B64 }] })), { code: 'piece_inconnue' });
});

test('rendu : pièce de plus de 6 Mo refusée', async () => {
  const grosse = Buffer.alloc(6 * 1024 * 1024 + 10, 1).toString('base64');
  await assert.rejects(() => rendre(demandeRc({ pieces: [{ piece: 'naissance', base64: grosse }] })), { code: 'piece_trop_grande' });
});

test('rendu : le moteur n\'écrit rien sur le disque', async () => {
  const avant = fs.readdirSync(fileURLToPath(new URL('..', import.meta.url))).sort().join();
  await rendre(demandeRc({ sortie: 'pdf' }));
  assert.equal(fs.readdirSync(fileURLToPath(new URL('..', import.meta.url))).sort().join(), avant);
});

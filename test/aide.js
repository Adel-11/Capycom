import { traiterRequete } from '../src/index.js';
import { creerMock, CLE_VALIDE, API } from './mock-bubble.js';
import { b64uEncode } from '../src/crypto.js';
import { creerServeur as creerServeurMoteur } from '../serveur-modeles/serveur.mjs';

export const BASE = 'https://mcp.test';
export const REDIRECTION = 'https://claude.ai/api/mcp/auth_callback';
export const ENV = { TOKEN_SECRET: 'secret-de-test-' + 'x'.repeat(40), PUBLIC_BASE_URL: BASE, CAPYCOM_API_BASE: API };

export function creerServeur(envExtra = {}) {
  const mock = creerMock();
  let t = 1_800_000_000;
  const horloge = { avancer: (s) => { t += s; }, now: () => t };
  const env = { ...ENV, ...envExtra };
  const s = { mock, horloge, env, fetch: mock.fetch };
  s.appeler = (url, init) => traiterRequete(new Request(url.startsWith('http') ? url : BASE + url, init), env, { fetch: (u, i) => s.fetch(u, i), maintenant: horloge.now });
  return s;
}

/** Démarre le vrai service moteur sur un port local et le branche sur le serveur de test (le reste va au faux Bubble). */
export async function avecMoteur(s, options = {}) {
  const secret = options.secret || 'secret-moteur-de-test-' + 'y'.repeat(30);
  const srv = creerServeurMoteur({ secret, simultanes: options.simultanes || 2, rendu: options.rendu, apisAutorisees: options.apisAutorisees || ['https://capycom.test/'], fetchApi: (u, i) => s.mock.fetch(u, i) });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  const url = `http://127.0.0.1:${srv.address().port}`;
  s.env.MOTEUR_URL = url;
  s.env.MOTEUR_SECRET = options.secretWorker || secret;
  s.fetch = (u, i) => (String(u).startsWith(url) ? fetch(u, i) : s.mock.fetch(u, i));
  s.fermerMoteur = () => new Promise((ok) => { srv.close(ok); srv.closeAllConnections?.(); });
  return { url, secret, srv };
}

export async function pkce() {
  const verifier = b64uEncode(crypto.getRandomValues(new Uint8Array(48)));
  const challenge = b64uEncode(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  return { verifier, challenge };
}

export async function enregistrerClient(s) {
  const r = await s.appeler('/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ client_name: 'Claude', redirect_uris: [REDIRECTION] }) });
  return (await r.json()).client_id;
}

/** Déroule tout le flux OAuth et renvoie { access_token, refresh_token, client_id }. */
export async function obtenirJetons(s, cle = CLE_VALIDE) {
  const client_id = await enregistrerClient(s);
  const { verifier, challenge } = await pkce();
  const q = new URLSearchParams({ response_type: 'code', client_id, redirect_uri: REDIRECTION, code_challenge: challenge, code_challenge_method: 'S256', state: 'etat-1' });
  const page = await s.appeler('/authorize?' + q);
  const htmlPage = await page.text();
  const req = /name="req" value="([^"]+)"/.exec(htmlPage)[1];
  const post = await s.appeler('/authorize', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ req, cle, decision: 'oui', lang: 'fr' }) });
  const loc = new URL(post.headers.get('location'));
  const code = loc.searchParams.get('code');
  const tok = await s.appeler('/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: REDIRECTION, client_id }) });
  const jetons = await tok.json();
  return { ...jetons, client_id, verifier };
}

let compteur = 1;
export async function rpc(s, jeton, method, params) {
  const r = await s.appeler('/mcp', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + jeton }, body: JSON.stringify({ jsonrpc: '2.0', id: compteur++, method, params }) });
  return { status: r.status, corps: r.status === 200 ? await r.json() : null, brut: r };
}

export async function appelOutil(s, jeton, name, args) {
  const { corps } = await rpc(s, jeton, 'tools/call', { name, arguments: args });
  return corps.result;
}

export const EXP = { nom: 'Adel Test', adresse: '1 rue Elgin', ville: 'Ottawa', province: 'on', code_postal: 'k1p5k6' };
export const DEST = { nom: 'Rogers Communications', adresse: '333 rue Bloor Est', appartement: '12', ville: 'Toronto', province: 'Québec', code_postal: 'M4W 1G9' };
export { CLE_VALIDE };

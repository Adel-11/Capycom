import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creerServeur, obtenirJetons, enregistrerClient, pkce, rpc, REDIRECTION, BASE, CLE_VALIDE } from './aide.js';

// Aucun message ne doit sortir dans les journaux pendant ces tests (clés et contenu des lettres inclus).
const consoleOrig = { ...console };
const sorties = [];
for (const k of ['log', 'info', 'warn', 'error', 'debug']) console[k] = (...a) => sorties.push([k, a]);
test.after(() => { Object.assign(console, consoleOrig); assert.equal(sorties.length, 0, 'aucune sortie console attendue'); });

test('découverte : ressource protégée et serveur d\'autorisation', async () => {
  const s = creerServeur();
  const pr = await (await s.appeler('/.well-known/oauth-protected-resource')).json();
  assert.equal(pr.resource, BASE + '/mcp');
  assert.deepEqual(pr.authorization_servers, [BASE]);
  const as = await (await s.appeler('/.well-known/oauth-authorization-server')).json();
  assert.deepEqual(as.code_challenge_methods_supported, ['S256']);
  assert.equal(as.client_id_metadata_document_supported, true);
  assert.equal(as.registration_endpoint, BASE + '/register');
  assert.deepEqual(as.token_endpoint_auth_methods_supported, ['none']);
});

test('401 avec resource_metadata sans jeton, et avec jeton invalide', async () => {
  const s = creerServeur();
  const r = await s.appeler('/mcp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.equal(r.status, 401);
  assert.match(r.headers.get('www-authenticate'), /^Bearer resource_metadata="https:\/\/mcp\.test\/\.well-known\/oauth-protected-resource"/);
  const r2 = await s.appeler('/mcp', { method: 'POST', headers: { authorization: 'Bearer nimporte', 'content-type': 'application/json' }, body: '{}' });
  assert.equal(r2.status, 401);
  assert.match(r2.headers.get('www-authenticate'), /error="invalid_token"/);
});

test('aucun jeton dans l\'URL : le paramètre access_token est ignoré', async () => {
  const s = creerServeur();
  const t = await obtenirJetons(s);
  const r = await s.appeler('/mcp?access_token=' + t.access_token, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.equal(r.status, 401);
});

test('flux complet : DCR, consentement, code, PKCE, jeton, MCP', async () => {
  const s = creerServeur();
  const t = await obtenirJetons(s);
  assert.equal(t.token_type, 'Bearer');
  assert.ok(t.access_token && t.refresh_token);
  assert.ok(!t.access_token.includes(CLE_VALIDE), 'la clé ne doit pas apparaître en clair dans le jeton');
  const init = await rpc(s, t.access_token, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } });
  assert.equal(init.corps.result.protocolVersion, '2025-06-18');
  assert.equal(init.corps.result.serverInfo.name, 'capycom');
});

test('page de consentement : en-têtes de sécurité, nom du client, redirection affichée', async () => {
  const s = creerServeur();
  const client_id = await enregistrerClient(s);
  const { challenge } = await pkce();
  const q = new URLSearchParams({ response_type: 'code', client_id, redirect_uri: REDIRECTION, code_challenge: challenge, code_challenge_method: 'S256', state: 'abc' });
  const r = await s.appeler('/authorize?' + q, { headers: { 'accept-language': 'fr-CA,fr;q=0.9' } });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.equal(r.headers.get('x-frame-options'), 'DENY');
  assert.match(r.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  const h = await r.text();
  assert.match(h, /lang="fr"/);
  assert.match(h, /Claude/);
  assert.match(h, /claude\.ai/);
  assert.match(h, /type="password"/);
  assert.doesNotMatch(h, /<script/i);
  const en = await (await s.appeler('/authorize?' + q + '&lang=en')).text();
  assert.match(en, /lang="en"/);
  assert.match(en, /Authorize the connection/);
});

test('redirection non autorisée : page d\'erreur, aucune redirection', async () => {
  const s = creerServeur();
  const { challenge } = await pkce();
  const r = await s.appeler('/register', { method: 'POST', body: JSON.stringify({ redirect_uris: ['https://evil.example/cb'] }) });
  assert.equal(r.status, 400);
  const client_id = await enregistrerClient(s);
  const q = new URLSearchParams({ response_type: 'code', client_id, redirect_uri: 'https://evil.example/cb', code_challenge: challenge, code_challenge_method: 'S256' });
  const a = await s.appeler('/authorize?' + q);
  assert.equal(a.status, 400);
  assert.equal(a.headers.get('location'), null);
});

test('PKCE : S256 obligatoire, plain refusé, mauvais verifier refusé', async () => {
  const s = creerServeur();
  const client_id = await enregistrerClient(s);
  const { challenge } = await pkce();
  const plain = await s.appeler('/authorize?' + new URLSearchParams({ response_type: 'code', client_id, redirect_uri: REDIRECTION, code_challenge: challenge, code_challenge_method: 'plain' }));
  assert.equal(plain.status, 400);
  const sans = await s.appeler('/authorize?' + new URLSearchParams({ response_type: 'code', client_id, redirect_uri: REDIRECTION }));
  assert.equal(sans.status, 400);

  const t = await obtenirJetons(s); // chemin normal OK
  // Rejouer un code avec un mauvais verifier
  const { verifier: autre, challenge: c2 } = await pkce();
  const page = await (await s.appeler('/authorize?' + new URLSearchParams({ response_type: 'code', client_id: t.client_id, redirect_uri: REDIRECTION, code_challenge: c2, code_challenge_method: 'S256' }))).text();
  const req = /name="req" value="([^"]+)"/.exec(page)[1];
  const post = await s.appeler('/authorize', { method: 'POST', body: new URLSearchParams({ req, cle: CLE_VALIDE, decision: 'oui' }) });
  const code = new URL(post.headers.get('location')).searchParams.get('code');
  const mauvais = await s.appeler('/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'authorization_code', code, code_verifier: t.verifier, redirect_uri: REDIRECTION, client_id: t.client_id }) });
  assert.equal(mauvais.status, 400);
  assert.equal((await mauvais.json()).error, 'invalid_grant');
  const bon = await s.appeler('/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'authorization_code', code, code_verifier: autre, redirect_uri: REDIRECTION, client_id: t.client_id }) });
  assert.equal(bon.status, 200);
});

test('clé invalide au consentement : message, pas de code', async () => {
  const s = creerServeur();
  const client_id = await enregistrerClient(s);
  const { challenge } = await pkce();
  const page = await (await s.appeler('/authorize?' + new URLSearchParams({ response_type: 'code', client_id, redirect_uri: REDIRECTION, code_challenge: challenge, code_challenge_method: 'S256' }))).text();
  const req = /name="req" value="([^"]+)"/.exec(page)[1];
  const r = await s.appeler('/authorize', { method: 'POST', body: new URLSearchParams({ req, cle: 'une-mauvaise-cle-0123456789abcdef', decision: 'oui', lang: 'fr' }) });
  assert.equal(r.status, 400);
  assert.equal(r.headers.get('location'), null);
  assert.match(await r.text(), /pas reconnue/);
});

test('refus de l\'utilisateur : access_denied renvoyé au client avec state', async () => {
  const s = creerServeur();
  const client_id = await enregistrerClient(s);
  const { challenge } = await pkce();
  const page = await (await s.appeler('/authorize?' + new URLSearchParams({ response_type: 'code', client_id, redirect_uri: REDIRECTION, code_challenge: challenge, code_challenge_method: 'S256', state: 'xyz' }))).text();
  const req = /name="req" value="([^"]+)"/.exec(page)[1];
  const r = await s.appeler('/authorize', { method: 'POST', body: new URLSearchParams({ req, decision: 'non' }) });
  const loc = new URL(r.headers.get('location'));
  assert.equal(loc.searchParams.get('error'), 'access_denied');
  assert.equal(loc.searchParams.get('state'), 'xyz');
});

test('expirations : code 60 s, jeton d\'accès 1 h, rafraîchissement renouvelle', async () => {
  const s = creerServeur();
  const t = await obtenirJetons(s);
  assert.equal((await rpc(s, t.access_token, 'ping')).status, 200);
  s.horloge.avancer(3601);
  assert.equal((await rpc(s, t.access_token, 'ping')).status, 401);
  const r = await s.appeler('/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: t.refresh_token, client_id: t.client_id }) });
  assert.equal(r.status, 200);
  const n = await r.json();
  assert.equal((await rpc(s, n.access_token, 'ping')).status, 200);
  // un jeton de rafraîchissement ne sert pas d'accès, et un accès ne sert pas de rafraîchissement
  assert.equal((await rpc(s, n.refresh_token, 'ping')).status, 401);
  const x = await s.appeler('/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: n.access_token }) });
  assert.equal(x.status, 400);
  s.horloge.avancer(61 * 24 * 3600);
  const exp = await s.appeler('/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: n.refresh_token }) });
  assert.equal(exp.status, 400);
});

test('code expiré après 60 s', async () => {
  const s = creerServeur();
  const client_id = await enregistrerClient(s);
  const { verifier, challenge } = await pkce();
  const page = await (await s.appeler('/authorize?' + new URLSearchParams({ response_type: 'code', client_id, redirect_uri: REDIRECTION, code_challenge: challenge, code_challenge_method: 'S256' }))).text();
  const req = /name="req" value="([^"]+)"/.exec(page)[1];
  const post = await s.appeler('/authorize', { method: 'POST', body: new URLSearchParams({ req, cle: CLE_VALIDE, decision: 'oui' }) });
  const code = new URL(post.headers.get('location')).searchParams.get('code');
  s.horloge.avancer(61);
  const r = await s.appeler('/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: REDIRECTION, client_id }) });
  assert.equal(r.status, 400);
});

test('CIMD : client_id URL, document vérifié, redirection déclarée obligatoire', async () => {
  const s = creerServeur();
  const url = 'https://client.example/oauth/client-metadata.json';
  s.mock.clientsCimd.set(url, { client_id: url, client_name: 'Claude (CIMD)', redirect_uris: [REDIRECTION] });
  const { challenge } = await pkce();
  const q = (extra = {}) => new URLSearchParams({ response_type: 'code', client_id: url, redirect_uri: REDIRECTION, code_challenge: challenge, code_challenge_method: 'S256', ...extra });
  const r = await s.appeler('/authorize?' + q());
  assert.equal(r.status, 200);
  assert.match(await r.text(), /Claude \(CIMD\)/);
  // document dont le client_id ne correspond pas
  s.mock.clientsCimd.set(url, { client_id: 'https://autre.example/x', redirect_uris: [REDIRECTION] });
  assert.equal((await s.appeler('/authorize?' + q())).status, 400);
  // document qui ne déclare pas la redirection
  s.mock.clientsCimd.set(url, { client_id: url, redirect_uris: ['https://claude.com/api/mcp/auth_callback'] });
  assert.equal((await s.appeler('/authorize?' + q())).status, 400);
});

test('redirection locale (Claude Code) acceptée, autre hôte http refusé', async () => {
  const s = creerServeur();
  const ok = await s.appeler('/register', { method: 'POST', body: JSON.stringify({ redirect_uris: ['http://localhost:54321/callback'] }) });
  assert.equal(ok.status, 201);
  const non = await s.appeler('/register', { method: 'POST', body: JSON.stringify({ redirect_uris: ['http://exemple.com:54321/callback'] }) });
  assert.equal(non.status, 400);
});

test('serveur sans TOKEN_SECRET : erreur claire, pas de jeton faible', async () => {
  const s = creerServeur({ TOKEN_SECRET: '' });
  const r = await s.appeler('/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: 'x' }) });
  assert.equal(r.status, 500);
  const h = await (await s.appeler('/health')).json();
  assert.equal(h.secret_configured, false);
});

test('CIMD : User-Agent envoyé, et repli sur le client Claude connu si le téléchargement échoue', async () => {
  const s = creerServeur();
  const url = 'https://claude.ai/oauth/mcp-oauth-client-metadata';
  const { challenge } = await pkce();
  const q = new URLSearchParams({ response_type: 'code', client_id: url, redirect_uri: REDIRECTION, code_challenge: challenge, code_challenge_method: 'S256' });
  let ua = null;
  const orig = s.mock.fetch;
  s.mock.clientsCimd.set(url, { client_id: url, client_name: 'Claude', redirect_uris: [REDIRECTION] });
  s.mock.fetch = async (u, i) => { if (String(u) === url) ua = i.headers['user-agent']; return orig(u, i); };
  const s2 = { ...s, appeler: (u, i) => import('../src/index.js').then((m) => m.traiterRequete(new Request('https://mcp.test' + u, i), s.env, { fetch: s.mock.fetch, maintenant: s.horloge.now })) };
  assert.equal((await s2.appeler('/authorize?' + q)).status, 200);
  assert.match(ua, /^CapycomMCP/);
  // téléchargement refusé (403) : repli sur les valeurs publiques de Claude
  s.mock.fetch = async (u, i) => (String(u) === url ? new Response('blocked', { status: 403 }) : orig(u, i));
  assert.equal((await s2.appeler('/authorize?' + q)).status, 200);
  // le repli ne vaut que pour cette URL et pour sa redirection
  const autre = 'https://exemple.test/client.json';
  s.mock.fetch = async () => new Response('blocked', { status: 403 });
  const q2 = new URLSearchParams({ response_type: 'code', client_id: autre, redirect_uri: REDIRECTION, code_challenge: challenge, code_challenge_method: 'S256' });
  assert.equal((await s2.appeler('/authorize?' + q2)).status, 400);
});

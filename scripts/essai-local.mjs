// Parcours complet contre un Worker lancé avec wrangler dev et le faux Capycom : OAuth, outils, PDF.
// Usage : node scripts/essai-local.mjs [http://127.0.0.1:8787]
import { CLE_VALIDE } from '../test/mock-bubble.js';
import { b64uEncode } from '../src/crypto.js';

const BASE = process.argv[2] || 'http://127.0.0.1:8787';
const REDIR = 'http://localhost:5555/callback';
const verifier = b64uEncode(crypto.getRandomValues(new Uint8Array(48)));
const challenge = b64uEncode(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
const etape = (m) => console.log('•', m);
const ok = (c, m) => { if (!c) { console.error('ÉCHEC :', m); process.exit(1); } };

let r = await fetch(`${BASE}/health`); const h = await r.json(); etape('health ' + JSON.stringify(h)); ok(h.secret_configured, 'secret');
r = await fetch(`${BASE}/mcp`, { method: 'POST', body: '{}' }); ok(r.status === 401, '401'); etape('401 : ' + r.headers.get('www-authenticate'));
r = await fetch(`${BASE}/register`, { method: 'POST', body: JSON.stringify({ client_name: 'Essai', redirect_uris: [REDIR] }) });
const { client_id } = await r.json(); ok(client_id, 'DCR');
r = await fetch(`${BASE}/authorize?` + new URLSearchParams({ response_type: 'code', client_id, redirect_uri: REDIR, code_challenge: challenge, code_challenge_method: 'S256', state: 's1' }));
const page = await r.text(); ok(r.status === 200 && page.includes('type="password"'), 'page de consentement');
const req = /name="req" value="([^"]+)"/.exec(page)[1];
r = await fetch(`${BASE}/authorize`, { method: 'POST', redirect: 'manual', body: new URLSearchParams({ req, cle: CLE_VALIDE, decision: 'oui', lang: 'fr' }) });
ok(r.status === 302, 'redirection ' + r.status); const code = new URL(r.headers.get('location')).searchParams.get('code'); ok(code, 'code');
r = await fetch(`${BASE}/token`, { method: 'POST', body: new URLSearchParams({ grant_type: 'authorization_code', code, code_verifier: verifier, redirect_uri: REDIR, client_id }) });
const t = await r.json(); ok(t.access_token, 'jeton ' + JSON.stringify(t)); etape('jeton obtenu');
let id = 1;
const rpc = async (method, params) => (await (await fetch(`${BASE}/mcp`, { method: 'POST', headers: { authorization: 'Bearer ' + t.access_token, 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: id++, method, params }) })).json());
etape('outils : ' + (await rpc('tools/list')).result.tools.map((o) => o.name).join(', '));
const adresse = (n) => ({ nom: n, adresse: '1 rue Elgin', ville: 'Ottawa', province: 'ON', code_postal: 'K1P 5K6' });
const prep = await rpc('tools/call', { name: 'preparer_lettre', arguments: { expediteur: adresse('Exp'), destinataire: { ...adresse('Dest'), ville: 'Montréal', province: 'QC', code_postal: 'H2X 1Y4' }, texte: 'Bonjour,\n\nCeci est un essai.', inclure_pdf: true } });
ok(!prep.result.isError, 'preparer ' + JSON.stringify(prep));
const o = prep.result.structuredContent; etape(`preparer_lettre : ${o.pages} page, prix ${o.prix.total_avant_taxes} $`);
const { writeFileSync } = await import('node:fs');
const { tmpdir } = await import('node:os');
const { join } = await import('node:path');
const fichier = join(tmpdir(), 'essai-lettre.pdf');
writeFileSync(fichier, Buffer.from(o.pdf_base64, 'base64'));
etape('PDF écrit dans ' + fichier);
const cr = await rpc('tools/call', { name: 'creer_courrier', arguments: { expediteur: adresse('Exp'), destinataire: { ...adresse('Dest'), ville: 'Montréal', province: 'QC', code_postal: 'H2X 1Y4' }, texte: 'Bonjour,\n\nCeci est un essai.', adresses_confirmees: true } });
ok(!cr.result.isError, 'creer ' + JSON.stringify(cr)); etape('creer_courrier : ' + cr.result.structuredContent.lien_paiement);
r = await fetch(`${BASE}/token`, { method: 'POST', body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: t.refresh_token, client_id }) });
ok(r.status === 200, 'refresh'); etape('rafraîchissement OK');
console.log('Essai local terminé sans erreur.');

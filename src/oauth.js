// OAuth 2.0 (code + PKCE S256) sans aucun stockage : codes et jetons sont des blocs chiffrés.
// Découverte : RFC 9728 (ressource protégée) et RFC 8414 (serveur d'autorisation).
// Clients : CIMD (client_id = URL d'un document JSON) ou DCR (RFC 7591) sans enregistrement en base.

import { sceller, ouvrir, sha256b64u } from './crypto.js';
import { DUREE } from './config.js';
import { pageConsentement, pageErreur, choisirLangue, TEXTES } from './consent.js';
import { listerCourriers } from './capycom.js';

const JSON_HDR = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
const HTML_HDR = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'x-content-type-options': 'nosniff',
  'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"
};

export function json(corps, statut = 200, extra = {}) {
  return new Response(JSON.stringify(corps), { status: statut, headers: { ...JSON_HDR, ...extra } });
}
function html(corps, statut = 200) { return new Response(corps, { status: statut, headers: HTML_HDR }); }

/* ---------- découverte ---------- */

export function metadonneesRessource(cfg) {
  return {
    resource: `${cfg.base}/mcp`,
    authorization_servers: [cfg.base],
    bearer_methods_supported: ['header'],
    scopes_supported: ['courrier'],
    resource_name: 'Capycom'
  };
}

export function metadonneesServeur(cfg) {
  return {
    issuer: cfg.base,
    authorization_endpoint: `${cfg.base}/authorize`,
    token_endpoint: `${cfg.base}/token`,
    registration_endpoint: `${cfg.base}/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: ['courrier'],
    client_id_metadata_document_supported: true
  };
}

/* ---------- redirections et clients ---------- */

function motif(entree) {
  const p = entree.split('{port}').map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\d{2,5}');
  return new RegExp('^' + p + '$');
}

export function redirectionAutorisee(cfg, uri) {
  if (typeof uri !== 'string' || uri.length > 500) return false;
  let u;
  try { u = new URL(uri); } catch { return false; }
  if (u.hash) return false;
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '[::1]'))) return false;
  return cfg.redirections.some((e) => motif(e).test(uri));
}

async function lireDocumentClient(cfg, url) {
  let u;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== 'https:' || u.username || u.password || !u.pathname || u.pathname === '/' || u.hash) return null;
  if (/^(\d+\.){3}\d+$/.test(u.hostname) || u.hostname.includes(':') || u.hostname === 'localhost') return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    const r = await cfg.fetch(url, { headers: { accept: 'application/json', 'user-agent': 'CapycomMCP/0.1 (+https://mcp.capycom.ca)' }, redirect: 'error', signal: ctrl.signal });
    if (!r.ok) return null;
    const texte = await r.text();
    if (texte.length > 65536) return null;
    const doc = JSON.parse(texte);
    if (doc.client_id !== url || !Array.isArray(doc.redirect_uris)) return null;
    return { nom: String(doc.client_name || u.hostname).slice(0, 80), redirect_uris: doc.redirect_uris.filter((x) => typeof x === 'string') };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

const CLIENTS_CONNUS = {
  'https://claude.ai/oauth/mcp-oauth-client-metadata': { nom: 'Claude', redirect_uris: ['https://claude.ai/api/mcp/auth_callback'] }
};

export async function resoudreClient(cfg, clientId) {
  if (typeof clientId !== 'string' || clientId.length > 2000) return null;
  if (clientId.startsWith('dcr.')) {
    const c = await ouvrir(cfg.secret, 'client', clientId.slice(4), cfg.maintenant());
    return c ? { nom: c.n, redirect_uris: c.ru } : null;
  }
  if (clientId.startsWith('https://')) {
    const doc = await lireDocumentClient(cfg, clientId);
    if (doc) return doc;
    // Repli : le document public de Claude (valeurs fixes, publiées par Anthropic) si son téléchargement échoue.
    // La redirection reste soumise à la liste autorisée de ce serveur.
    return CLIENTS_CONNUS[clientId] || null;
  }
  return null;
}

/* ---------- enregistrement dynamique (DCR) ---------- */

export async function enregistrer(request, cfg) {
  let corps;
  try { corps = await request.json(); } catch { return json({ error: 'invalid_client_metadata', error_description: 'JSON invalide' }, 400); }
  const uris = Array.isArray(corps.redirect_uris) ? corps.redirect_uris : [];
  if (!uris.length || uris.length > 10 || !uris.every((u) => redirectionAutorisee(cfg, u))) {
    return json({ error: 'invalid_redirect_uri', error_description: "Redirection non autorisée par ce serveur / redirect URI not allowed by this server" }, 400);
  }
  const nom = String(corps.client_name || 'Application').slice(0, 80);
  const id = 'dcr.' + await sceller(cfg.secret, 'client', { n: nom, ru: uris, exp: cfg.maintenant() + DUREE.client });
  return json({
    client_id: id,
    client_id_issued_at: cfg.maintenant(),
    client_name: nom,
    redirect_uris: uris,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none'
  }, 201);
}

/* ---------- autorisation et consentement ---------- */

function urlRetour(redirectUri, params) {
  const u = new URL(redirectUri);
  for (const [k, v] of Object.entries(params)) if (v != null && v !== '') u.searchParams.set(k, v);
  return u.toString();
}

function lienAide(cfg) { return `${cfg.siteBase}/personal_information`; }

export async function autoriser(request, cfg) {
  const url = new URL(request.url);
  const lang0 = choisirLangue(request, url);
  if (request.method === 'GET') return autoriserGet(request, cfg, url, lang0);
  if (request.method === 'POST') return autoriserPost(request, cfg, lang0);
  return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, POST' } });
}

async function autoriserGet(request, cfg, url, lang) {
  const p = url.searchParams;
  // Retour à la page après un changement de langue.
  if (p.get('req')) {
    const r = await ouvrir(cfg.secret, 'req', p.get('req'), cfg.maintenant());
    if (!r) return html(pageErreur(lang, TEXTES[lang].titre, TEXTES[lang].erreurs.expire), 400);
    return html(pageConsentement({ lang, nomClient: r.nom, hoteRetour: new URL(r.ru).host, req: p.get('req'), lienAide: lienAide(cfg), action: `${cfg.base}/authorize` }));
  }
  const erreurPage = (d) => html(pageErreur(lang, lang === 'fr' ? 'Demande invalide' : 'Invalid request', d), 400);
  const ru = p.get('redirect_uri') || '';
  if (!redirectionAutorisee(cfg, ru)) return erreurPage(lang === 'fr' ? 'Adresse de retour non autorisée.' : 'Return address not allowed.');
  const client = await resoudreClient(cfg, p.get('client_id'));
  if (!client) return erreurPage(lang === 'fr' ? 'Application inconnue.' : 'Unknown application.');
  if (!client.redirect_uris.includes(ru)) return erreurPage(lang === 'fr' ? "Cette adresse de retour n'est pas déclarée par l'application." : 'This return address is not registered by the application.');
  if (p.get('response_type') !== 'code') return erreurPage('response_type=code');
  if (p.get('code_challenge_method') !== 'S256' || !/^[A-Za-z0-9_-]{43,128}$/.test(p.get('code_challenge') || '')) return erreurPage('PKCE S256 required');
  const req = await sceller(cfg.secret, 'req', {
    cid: p.get('client_id'), ru, cc: p.get('code_challenge'), st: (p.get('state') || '').slice(0, 1000),
    nom: client.nom, exp: cfg.maintenant() + DUREE.requete
  });
  return html(pageConsentement({ lang, nomClient: client.nom, hoteRetour: new URL(ru).host, req, lienAide: lienAide(cfg), action: `${cfg.base}/authorize` }));
}

async function autoriserPost(request, cfg, langDefaut) {
  let form;
  try { form = await request.formData(); } catch { return html(pageErreur(langDefaut, 'Erreur', 'Formulaire illisible.'), 400); }
  const lang = form.get('lang') === 'en' ? 'en' : form.get('lang') === 'fr' ? 'fr' : langDefaut;
  const T = TEXTES[lang];
  const req = String(form.get('req') || '');
  const r = await ouvrir(cfg.secret, 'req', req, cfg.maintenant());
  if (!r) return html(pageErreur(lang, T.titre, T.erreurs.expire), 400);

  if (form.get('decision') === 'non') {
    return Response.redirect(urlRetour(r.ru, { error: 'access_denied', state: r.st }), 302);
  }
  const rendre = (erreur, statut = 200) => html(pageConsentement({ lang, nomClient: r.nom, hoteRetour: new URL(r.ru).host, req, lienAide: lienAide(cfg), action: `${cfg.base}/authorize`, erreur }), statut);

  const cle = String(form.get('cle') || '').trim();
  if (!cle) return rendre('cle_vide', 400);
  if (cle.length < 16 || cle.length > 300 || !/^[A-Za-z0-9._~+/=-]+$/.test(cle)) return rendre('cle_invalide', 400);

  // La clé est vérifiée auprès de Capycom, puis seulement transportée (chiffrée) dans le code.
  const test = await listerCourriers(cfg, cle);
  if (test.erreur === 'cle_invalide') return rendre('cle_invalide', 400);
  if (test.statut !== 'ok') return rendre('indisponible', 502);

  const code = await sceller(cfg.secret, 'code', { k: cle, cid: r.cid, ru: r.ru, cc: r.cc, exp: cfg.maintenant() + DUREE.code });
  return Response.redirect(urlRetour(r.ru, { code, state: r.st }), 302);
}

/* ---------- jeton ---------- */

function erreurJeton(code, description, statut = 400) {
  return json({ error: code, error_description: description }, statut);
}

async function emettre(cfg, cle, clientId) {
  const now = cfg.maintenant();
  return json({
    access_token: await sceller(cfg.secret, 'at', { k: cle, exp: now + DUREE.acces }),
    token_type: 'Bearer',
    expires_in: DUREE.acces,
    refresh_token: await sceller(cfg.secret, 'rt', { k: cle, cid: clientId, exp: now + DUREE.rafraichissement }),
    scope: 'courrier'
  });
}

export async function jeton(request, cfg) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { allow: 'POST' } });
  let f;
  try { f = await request.formData(); } catch { return erreurJeton('invalid_request', 'form-urlencoded body expected'); }
  const type = f.get('grant_type');

  if (type === 'authorization_code') {
    const c = await ouvrir(cfg.secret, 'code', String(f.get('code') || ''), cfg.maintenant());
    if (!c) return erreurJeton('invalid_grant', 'Code invalid or expired');
    if (f.get('client_id') !== c.cid) return erreurJeton('invalid_grant', 'client_id mismatch');
    if (f.get('redirect_uri') !== c.ru) return erreurJeton('invalid_grant', 'redirect_uri mismatch');
    const verif = String(f.get('code_verifier') || '');
    if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verif) || (await sha256b64u(verif)) !== c.cc) return erreurJeton('invalid_grant', 'PKCE verification failed');
    return emettre(cfg, c.k, c.cid);
  }

  if (type === 'refresh_token') {
    const rt = await ouvrir(cfg.secret, 'rt', String(f.get('refresh_token') || ''), cfg.maintenant());
    if (!rt) return erreurJeton('invalid_grant', 'Refresh token invalid or expired');
    if (f.get('client_id') && f.get('client_id') !== rt.cid) return erreurJeton('invalid_grant', 'client_id mismatch');
    return emettre(cfg, rt.k, rt.cid);
  }
  return erreurJeton('unsupported_grant_type', 'authorization_code or refresh_token');
}

/** Lit Authorization: Bearer ... et renvoie la clé d'API, ou null. */
export async function cleDepuisJeton(request, cfg) {
  const h = request.headers.get('authorization') || '';
  const m = /^Bearer\s+(\S+)$/i.exec(h);
  if (!m) return null;
  const at = await ouvrir(cfg.secret, 'at', m[1], cfg.maintenant());
  return at ? at.k : null;
}

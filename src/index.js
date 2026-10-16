// Point d'entrée du Worker mcp.capycom.ca : découverte OAuth, OAuth, et endpoint MCP.
// Aucun journal, aucun stockage : voir README.md.

import { lireConfig } from './config.js';
import { json, metadonneesRessource, metadonneesServeur, enregistrer, autoriser, jeton, cleDepuisJeton } from './oauth.js';
import { repondreMcp } from './mcp.js';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type, mcp-protocol-version, mcp-session-id, accept',
  'access-control-allow-methods': 'GET, POST, OPTIONS, DELETE',
  'access-control-expose-headers': 'www-authenticate, mcp-session-id'
};

function avecCors(reponse) {
  const r = new Response(reponse.body, reponse);
  for (const [k, v] of Object.entries(CORS)) r.headers.set(k, v);
  return r;
}

export async function traiterRequete(request, env, extra = {}) {
  const cfg = lireConfig(env, request, extra);
  const url = new URL(request.url);
  const chemin = url.pathname.replace(/\/+$/, '') || '/';

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...CORS, 'access-control-max-age': '86400' } });

  if (chemin === '/health') {
    return json({ ok: true, api_base: cfg.apiBase, version_test: cfg.versionTest, secret_configured: !!cfg.secret && cfg.secret.length >= 32 });
  }
  if (chemin === '/' ) {
    return json({ name: 'Capycom MCP', mcp: `${cfg.base}/mcp`, documentation: 'https://github.com/capycom/capycom-mcp' });
  }
  if (chemin === '/.well-known/oauth-protected-resource' || chemin === '/.well-known/oauth-protected-resource/mcp') {
    return json(metadonneesRessource(cfg), 200, { 'cache-control': 'public, max-age=300' });
  }
  if (chemin === '/.well-known/oauth-authorization-server' || chemin === '/.well-known/oauth-authorization-server/mcp') {
    return json(metadonneesServeur(cfg), 200, { 'cache-control': 'public, max-age=300' });
  }

  const besoinSecret = ['/register', '/authorize', '/token', '/mcp'].includes(chemin);
  if (besoinSecret && (!cfg.secret || cfg.secret.length < 32)) {
    return json({ error: 'server_error', error_description: 'TOKEN_SECRET is not configured on this server' }, 500);
  }

  if (chemin === '/register') {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { allow: 'POST' } });
    return enregistrer(request, cfg);
  }
  if (chemin === '/authorize') return autoriser(request, cfg);
  if (chemin === '/token') return jeton(request, cfg);

  if (chemin === '/mcp') {
    // GET (flux serveur) et DELETE (session) ne sont pas utilisés : mode sans session.
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { allow: 'POST' } });
    const cle = await cleDepuisJeton(request, cfg);
    if (!cle) {
      const present = /^Bearer\s/i.test(request.headers.get('authorization') || '');
      const rm = `${cfg.base}/.well-known/oauth-protected-resource`;
      const h = `Bearer${present ? ' error="invalid_token",' : ''} resource_metadata="${rm}", scope="courrier"`;
      return json({ error: present ? 'invalid_token' : 'unauthorized', error_description: 'Authentication required' }, 401, { 'www-authenticate': h });
    }
    return repondreMcp(request, cfg, cle);
  }
  return json({ error: 'not_found' }, 404);
}

export default {
  async fetch(request, env) {
    try {
      return avecCors(await traiterRequete(request, env));
    } catch {
      // Jamais de détail ni de contenu dans les erreurs.
      return avecCors(json({ error: 'server_error' }, 500));
    }
  }
};

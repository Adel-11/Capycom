// Configuration lue dans les variables Cloudflare. Aucun secret dans ce fichier.

export const API_PAR_DEFAUT = 'https://capycom.ca/version-test/api/1.1/wf';

export const REDIRECTIONS_PAR_DEFAUT = [
  'https://claude.ai/api/mcp/auth_callback',
  'https://claude.com/api/mcp/auth_callback',
  // Claude Code et outils locaux : boucle locale, n'importe quel port.
  'http://localhost:{port}/callback',
  'http://127.0.0.1:{port}/callback'
];

export function lireConfig(env, request, extra = {}) {
  const origine = new URL(request.url).origin;
  const base = String(env.PUBLIC_BASE_URL || origine).replace(/\/+$/, '');
  const apiBase = String(env.CAPYCOM_API_BASE || API_PAR_DEFAUT).replace(/\/+$/, '');
  const listeRedirections = String(env.ALLOWED_REDIRECT_URIS || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  return {
    base,
    apiBase,
    // Adresse du site Capycom (pour les liens d'aide), déduite de l'URL de l'API.
    siteBase: apiBase.replace(/\/api\/1\.1\/wf$/, ''),
    versionTest: /\/version-test(\/|$)/.test(apiBase),
    secret: env.TOKEN_SECRET,
    redirections: listeRedirections.length ? listeRedirections : REDIRECTIONS_PAR_DEFAUT,
    fetch: extra.fetch || ((...a) => fetch(...a)),
    maintenant: extra.maintenant || (() => Math.floor(Date.now() / 1000))
  };
}

export const DUREE = {
  code: 60,                      // code d'autorisation : 60 s
  requete: 15 * 60,              // page de consentement : 15 min
  acces: 60 * 60,                // jeton d'accès : 1 h
  rafraichissement: 60 * 24 * 3600, // jeton de rafraîchissement : 60 jours (glissants)
  client: 365 * 24 * 3600        // client enregistré (DCR) : 1 an
};

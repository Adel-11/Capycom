// Création du brouillon chez Capycom, faite par le moteur : le Worker gratuit de Cloudflare n'a ainsi jamais à manipuler un PDF
// de plusieurs centaines de Ko (limite de 10 ms de calcul par requête). Le moteur reçoit la clé d'API de l'utilisateur pour cet
// appel seulement : elle n'est ni stockée ni journalisée. L'adresse de l'API doit faire partie de la liste autorisée.

import * as api from '../src/capycom.js';

export const API_AUTORISEES_PAR_DEFAUT = ['https://capycom.ca/'];

export class ErreurCreation extends Error {
  constructor(message) { super(message); this.code = 'creation_refusee'; }
}

/**
 * c : { api_base, cle, nom_fichier, champs }. octets : PDF final. Renvoie la réponse de Capycom (statut ok ou erreur).
 * autorisees : préfixes d'adresses d'API acceptés. fetchApi : pour les tests.
 */
export async function creerBrouillon(c, octets, { autorisees = API_AUTORISEES_PAR_DEFAUT, fetchApi = (...a) => fetch(...a) } = {}) {
  if (!c || typeof c !== 'object') throw new ErreurCreation('missing creation data');
  const base = String(c.api_base || '').replace(/\/+$/, '');
  if (!/^https:\/\//.test(base) || !autorisees.some((p) => (base + '/').startsWith(p))) throw new ErreurCreation('API address not allowed');
  if (typeof c.cle !== 'string' || c.cle.length < 8 || c.cle.length > 300) throw new ErreurCreation('invalid key');
  const nom = String(c.nom_fichier || 'document.pdf').replace(/[^\w.\- ]/g, '_').slice(0, 80);
  const cfg = { apiBase: base, siteBase: base.replace(/\/api\/1\.1\/wf$/, ''), versionTest: /\/version-test(\/|$)/.test(base), fetch: fetchApi };
  return api.creerCourrier(cfg, c.cle, {
    ...c.champs,
    pdf: { filename: nom, contents: Buffer.from(octets).toString('base64'), private: true }
  });
}

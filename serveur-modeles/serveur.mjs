// Service « moteur de modèles » : reçoit un modèle, des réponses et des pièces jointes, renvoie le PDF final.
// Sans état, sans disque, sans journal : ni les réponses, ni les pièces, ni le PDF ne sont conservés ni écrits nulle part.
// Protégé par un secret partagé avec le Worker (en-tête x-moteur-secret). Voir serveur-modeles/README.md.

import http from 'node:http';
import crypto from 'node:crypto';
import { rendre, ErreurRendu } from './rendu.mjs';
import { creerBrouillon, ErreurCreation } from './creation.mjs';

const CORPS_MAX = 30 * 1024 * 1024;

function repondre(res, statut, objet) {
  const corps = JSON.stringify(objet);
  res.writeHead(statut, { 'content-type': 'application/json', 'cache-control': 'no-store', 'content-length': Buffer.byteLength(corps) });
  res.end(corps);
}

function lireCorps(req) {
  return new Promise((resolve, reject) => {
    const morceaux = []; let total = 0;
    req.on('data', (c) => { total += c.length; if (total > CORPS_MAX) { reject(new ErreurRendu('corps_trop_gros', 'request too large')); req.destroy(); } else morceaux.push(c); });
    req.on('end', () => resolve(Buffer.concat(morceaux).toString('utf8')));
    req.on('error', () => reject(new ErreurRendu('requete', 'request error')));
  });
}

/** Crée le serveur HTTP. secret : 24 caractères au moins. Le service ne démarre jamais sans protection. */
export function creerServeur({ secret, simultanes = 2, delaiMs = 60000, rendu = rendre, creer = creerBrouillon, apisAutorisees, fetchApi } = {}) {
  if (String(secret || '').length < 24) throw new Error('MOTEUR_SECRET manquant ou trop court (24 caractères au moins).');
  const empreinte = crypto.createHash('sha256').update(String(secret)).digest();
  const autorise = (valeur) => crypto.timingSafeEqual(crypto.createHash('sha256').update(String(valeur || '')).digest(), empreinte);
  let actifs = 0;

  async function traiter(req, res) {
    if (req.method === 'GET' && req.url === '/sante') return repondre(res, 200, { ok: true });
    if (req.method !== 'POST' || req.url !== '/rendre') return repondre(res, 404, { statut: 'erreur', erreur: 'introuvable' });
    if (!autorise(req.headers['x-moteur-secret'])) { req.resume(); return repondre(res, 401, { statut: 'erreur', erreur: 'non_autorise' }); }
    if (actifs >= simultanes) { req.resume(); return repondre(res, 503, { statut: 'erreur', erreur: 'occupe', message: 'The engine is busy, try again in a few seconds.' }); }
    actifs++;
    const minuteur = setTimeout(() => { if (!res.headersSent) repondre(res, 504, { statut: 'erreur', erreur: 'delai' }); }, delaiMs);
    try {
      let demande;
      try { demande = JSON.parse(await lireCorps(req)); } catch (e) { if (e instanceof ErreurRendu) throw e; throw new ErreurRendu('json_invalide', 'invalid JSON'); }
      const r = await rendu(demande);
      const sortie = { statut: 'ok', pages_formulaire: r.pages_formulaire, pieces: r.pieces, pages_total: r.pages_total };
      if (res.headersSent) return;
      if (demande.sortie === 'creer') sortie.creation = await creer(demande.creation, r.octets, { autorisees: apisAutorisees, fetchApi });
      repondre(res, 200, sortie);
    } catch (e) {
      if (res.headersSent) return;
      if (e instanceof ErreurCreation) repondre(res, 200, { statut: 'erreur', erreur: e.code, message: e.message });
      else if (e instanceof ErreurRendu) repondre(res, 200, { statut: 'erreur', erreur: e.code, message: e.message, ...e.extra });
      else repondre(res, 500, { statut: 'erreur', erreur: 'erreur_interne', message: 'The engine failed.' }); // aucun détail : il pourrait contenir des données
    } finally {
      clearTimeout(minuteur);
      actifs--;
    }
  }

  const serveur = http.createServer((req, res) => { traiter(req, res); });
  serveur.requestTimeout = delaiMs;
  return serveur;
}

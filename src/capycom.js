// Client de l'API Capycom v1 (backends Bubble). Voir Connecteurs/api/README.md.
// Aucune règle métier ici : prix, quotas et contrôles restent dans l'API.
// Rien n'est journalisé : ni le contenu des lettres, ni les clés.

function arrondir2(v) {
  return typeof v === 'number' ? Math.round(v * 100) / 100 : v;
}

async function appeler(cfg, nom, corps) {
  const ctrl = new AbortController();
  const minuteur = setTimeout(() => ctrl.abort(), 28000);
  let r;
  try {
    r = await cfg.fetch(`${cfg.apiBase}/${nom}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(corps),
      signal: ctrl.signal
    });
  } catch (e) {
    return { statut: 'erreur', erreur: 'api_indisponible', message: 'The Capycom API did not answer.', message_fr: "L'API Capycom ne répond pas." };
  } finally {
    clearTimeout(minuteur);
  }
  const texte = await r.text();
  let json = null;
  try { json = JSON.parse(texte); } catch { /* réponse non JSON */ }
  if (!r.ok || !json) {
    const detail = json && typeof json.message === 'string' ? json.message.slice(0, 300) : '';
    return {
      statut: 'erreur', erreur: 'api_http_' + r.status,
      message: `The Capycom API refused the request (HTTP ${r.status}).${detail ? ' ' + detail : ''}`,
      message_fr: `L'API Capycom a refusé la requête (HTTP ${r.status}).${detail ? ' ' + detail : ''}`
    };
  }
  const rep = json.response && typeof json.response === 'object' ? json.response : {};
  const sortie = {};
  for (const [k, v] of Object.entries(rep)) sortie[k] = /(montant|total)/.test(k) ? arrondir2(v) : v;
  if (!sortie.statut) sortie.statut = 'ok';
  return sortie;
}

export function estimerPrix(cfg, { nombre_feuilles, couleur }) {
  return appeler(cfg, 'api_estimer_prix', { nombre_feuilles, couleur: !!couleur });
}

export async function creerCourrier(cfg, cle, champs) {
  const rep = await appeler(cfg, 'api_creer_courrier', { cle, ...champs });
  return choisirLien(cfg, rep);
}

export async function statutCourrier(cfg, cle, id_courrier) {
  return choisirLien(cfg, await appeler(cfg, 'api_statut_courrier', { cle, id_courrier }));
}

export function annulerBrouillon(cfg, cle, id_courrier) {
  return appeler(cfg, 'api_annuler_brouillon', { cle, id_courrier });
}

/** L'API renvoie cinq emplacements fixes courrier_N_*. On les met en tableau. */
export async function listerCourriers(cfg, cle) {
  const rep = await appeler(cfg, 'api_lister_courriers', { cle });
  if (rep.statut !== 'ok') return rep;
  const parN = {};
  const reste = {};
  for (const [k, v] of Object.entries(rep)) {
    const m = /^courrier_(\d+)_(.+)$/.exec(k);
    if (m) (parN[m[1]] ||= {})[m[2]] = v; else reste[k] = v;
  }
  const courriers = Object.keys(parN).map(Number).sort((a, b) => a - b)
    .map((n) => parN[n])
    .filter((c) => c.id && String(c.id).length > 0);
  return { ...reste, courriers };
}

/** Garde un seul lien de paiement : celui du test quand l'API visée est version-test. */
function choisirLien(cfg, rep) {
  if (rep.statut !== 'ok') return rep;
  const { lien_paiement, lien_paiement_test, ...autres } = rep;
  const lien = cfg.versionTest ? (lien_paiement_test || lien_paiement) : (lien_paiement || lien_paiement_test);
  return lien ? { ...autres, lien_paiement: lien } : autres;
}

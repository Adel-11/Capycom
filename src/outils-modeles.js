// Outils et prompts des modèles de lettres et de formulaires officiels : lister_modeles, decrire_modele, remplir_modele,
// et la source `modele` de creer_courrier. Le calcul lourd (remplir le formulaire, fusionner les pièces) est fait par le
// service « moteur de modèles » (Coolify chez Adel) : le plan gratuit des Workers limite le calcul à 10 ms par requête.
// Rien n'est stocké ni journalisé ici : les réponses passent en argument, ressortent en résultat, c'est tout.

import * as api from './capycom.js';
import { aujourdhuiOttawa, validerAdresse, champsApi } from './lettre.js';
import { ok, echec, erreurChamps } from './resultats.js';
import {
  modelesActifs, catalogue, decrire, normaliserReponses, manques, piecesAttendues, adressesDe, estFormulaire, langueDe,
  titrePrompt, descriptionPrompt, CONF
} from './modeles-commun.js';

const tr = (langue, fr, en) => (langue === 'en' ? en : fr);

const CONFIDENTIEL = 'The answers may contain very sensitive personal data (social insurance number, children, status in Canada). They pass through this server only to produce the PDF, they are never stored or logged, and the Capycom connector never pays.';

const LANGUE = { type: 'string', enum: ['fr', 'en'], description: 'Language of the questions, of the letter and of the payment page (default fr)' };

export const CHAMPS_MODELE = {
  reponses: {
    type: 'object',
    description: 'Answers keyed by the field ids returned by decrire_modele. All values are strings (a ticked box is "1", dates are YYYY-MM-DD). Never guess a value: ask the user.'
  },
  bureau: { type: 'string', enum: ['eq', 'tu'], description: 'Credit report dispute only: eq = Equifax, tu = TransUnion. One mail item per bureau.' },
  signature_url: { type: 'string', description: 'HTTPS address of a PNG or JPEG image of the user\'s own handwritten signature (maximum 1 MB). Required for official forms. Use this OR signature_base64.' },
  signature_base64: { type: 'string', description: 'The same signature image encoded in base64. Use this OR signature_url.' },
  pieces_jointes: {
    type: 'array',
    maxItems: 20,
    description: 'Supporting documents to attach after the form, each a PDF, JPEG or PNG file (maximum 6 MB each). The piece id comes from decrire_modele (pieces_a_joindre). Only the user\'s own documents.',
    items: {
      type: 'object',
      properties: {
        piece: { type: 'string', description: 'Attachment id, e.g. naissance, residence, pieces, adresse' },
        url: { type: 'string', description: 'HTTPS address of the file. Use this OR base64.' },
        base64: { type: 'string', description: 'The file encoded in base64. Use this OR url.' },
        nom: { type: 'string', description: 'File name (optional)' }
      },
      required: ['piece']
    }
  },
  lien_pied: { type: 'boolean', description: 'Letters only: add the discreet “Free template: capycom.ca” line at the foot of the page (default true)' }
};

export const OUTILS_MODELES = [
  {
    name: 'lister_modeles',
    title: 'List the available templates',
    description: 'Lists the letter and official-form templates Capycom can fill in and mail: id, title, what it is for, whether attachments and a signature are needed. Nothing is created.',
    inputSchema: { type: 'object', properties: { langue: LANGUE }, additionalProperties: false },
    annotations: { title: 'List the available templates', readOnlyHint: true, openWorldHint: false }
  },
  {
    name: 'decrire_modele',
    title: 'Describe a template',
    description: 'Describes one template: the official pages the user should read to check that the template fits their case, warnings, the questions to ask (field ids, types, allowed values, conditions), the documents to attach, the signature and the recipient. Capycom does not give legal advice and does not decide whether the user qualifies. Nothing is created.',
    inputSchema: {
      type: 'object',
      properties: { modele: { type: 'string', description: 'Template id from lister_modeles' }, langue: LANGUE },
      required: ['modele'],
      additionalProperties: false
    },
    annotations: { title: 'Describe a template', readOnlyHint: true, openWorldHint: false }
  },
  {
    name: 'remplir_modele',
    title: 'Fill in a template and check it',
    description: `Checks the answers against the template, fills in the official form (or the letter) and merges the attachments in a single PDF, then returns what is missing, the page count, the recipient and the price before tax. Nothing is created at Capycom and the PDF is not kept: call creer_courrier with the same arguments to create the draft. ${CONFIDENTIEL}`,
    inputSchema: {
      type: 'object',
      properties: { modele: { type: 'string', description: 'Template id from lister_modeles' }, langue: LANGUE, ...CHAMPS_MODELE },
      required: ['modele', 'reponses'],
      additionalProperties: false
    },
    annotations: { title: 'Fill in a template and check it', readOnlyHint: true, openWorldHint: true }
  }
];

/* ---------- appel du service moteur ---------- */

const PANNE = {
  statut: 'erreur', erreur: 'moteur_indisponible',
  message: 'The form engine is not reachable right now. Filling in templates is unavailable; free-text letters (preparer_lettre, creer_courrier with texte) and ready-made PDFs still work. Try again later.',
  message_fr: "Le moteur des formulaires ne répond pas pour l'instant. Les modèles remplis sont indisponibles ; les lettres libres et les PDF fournis fonctionnent toujours. Réessayez plus tard."
};

export async function appelerMoteur(cfg, demande) {
  if (!cfg.moteurUrl || !cfg.moteurSecret) {
    return { echec: echec({ ...PANNE, erreur: 'moteur_non_configure', message: 'The form engine is not configured on this server.' }) };
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 50000);
  let r;
  try {
    r = await cfg.fetch(`${cfg.moteurUrl}/rendre`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-moteur-secret': cfg.moteurSecret },
      body: JSON.stringify(demande), signal: ctrl.signal
    });
  } catch { return { echec: echec(PANNE) }; } finally { clearTimeout(t); }
  if (r.status === 503) return { echec: echec({ ...PANNE, erreur: 'moteur_occupe', message: 'The form engine is busy. Try again in a few seconds.' }) };
  if (r.status === 401) return { echec: echec({ ...PANNE, erreur: 'moteur_non_autorise', message: 'The form engine refused the request (configuration problem on the server side).' }) };
  if (r.status >= 500 || r.status === 404) return { echec: echec(PANNE) };
  let json = null;
  try { json = await r.json(); } catch { /* réponse illisible */ }
  if (!json) return { echec: echec(PANNE) };
  return { rep: json };
}

/* ---------- traitement commun à remplir_modele et à la source `modele` de creer_courrier ---------- */

function lignes(ad) {
  const rue = ad.appartement ? (/^[A-Za-z0-9]{1,6}$/.test(ad.appartement) ? `${ad.appartement}-${ad.ligne}` : `${ad.ligne}, ${ad.appartement}`) : ad.ligne;
  return [ad.nom, rue, `${ad.ville} ${ad.province.abr}  ${ad.code_postal}`, 'CANADA'];
}

function erreurPieces(fournies, attendues) {
  const erreurs = [];
  const ids = attendues.map((p) => p.id);
  fournies.forEach((f, i) => {
    const n = [f.url, f.base64].filter(Boolean).length;
    if (n !== 1) erreurs.push(`pieces_jointes[${i}] : exactly one of url or base64 is required / une seule des deux valeurs est obligatoire`);
    if (f.url && !/^https:\/\//i.test(f.url)) erreurs.push(`pieces_jointes[${i}].url : only https addresses are accepted / adresse https seulement`);
    if (!ids.includes(f.piece)) erreurs.push(`pieces_jointes[${i}].piece : unknown id "${String(f.piece).slice(0, 30)}", expected one of ${ids.join(', ')} / identifiant inconnu`);
  });
  return erreurs;
}

/**
 * Valide, appelle le moteur, estime le prix. sortie : 'resume' (remplir_modele) ou 'creer' (le moteur crée lui-même le brouillon chez Capycom avec la clé `cle`).
 * Renvoie { sortie } (résultat d'outil à renvoyer tel quel) ou { donnees }.
 */
export async function traiterModele(args, cfg, sortie, cle) {
  const actifs = modelesActifs({ MODELES_ACTIFS: cfg.modelesActifs });
  const id = String(args.modele || '');
  if (!actifs.includes(id)) {
    return { sortie: echec({ statut: 'erreur', erreur: 'modele_inconnu', message: `Unknown template "${id.slice(0, 40)}". Available: ${actifs.join(', ')}. Call lister_modeles.`, modeles: actifs }) };
  }
  const langue = langueDe(args.langue);
  const formulaire = estFormulaire(id);
  const { reponses, inconnus } = normaliserReponses(id, args.reponses);
  const today = aujourdhuiOttawa(cfg.maintenant() * 1000);
  const opts = { langue, bureau: args.bureau, today };
  const avertissements = [];
  if (inconnus.length) avertissements.push(tr(langue, `Identifiants de réponse inconnus, ignorés : ${inconnus.slice(0, 20).join(', ')}. Utilisez les identifiants renvoyés par decrire_modele.`, `Ignored unknown answer ids: ${inconnus.slice(0, 20).join(', ')}. Use the ids returned by decrire_modele.`));

  if (id === 'rc66') {
    const sup = Object.keys(reponses).filter((k) => /^rc_e[3-9]_/.test(k) && reponses[k]);
    if (sup.length) avertissements.push(langue === 'en'
      ? 'Children beyond the second are NOT written on the RC66 itself (ids ' + sup.slice(0, 6).join(', ') + ' are ignored). Set rc_plus2 to 1 and attach the RC66-1 sheet (piece rc661) with their details.'
      : 'Les enfants au-delà du deuxième ne sont PAS écrits sur le RC66 lui-même (les ids ' + sup.slice(0, 6).join(', ') + ' sont ignorés). Mettez rc_plus2 à 1 et joignez la feuille RC66-1 (pièce rc661) avec leurs renseignements.');
  }
  const manquants = manques(id, reponses, opts);
  const signaturePresente = !!(args.signature_url || args.signature_base64);
  if (formulaire && !signaturePresente) {
    manquants.push({ etape: 'signature', champs: [{ id: 'signature_url', libelle: tr(langue, 'Image de la propre signature manuscrite de l’utilisateur (signature_url ou signature_base64). L’assistant ne doit pas en inventer une.', 'Image of the user\'s own handwritten signature (signature_url or signature_base64). The assistant must not invent one.') }] });
  }
  if (args.signature_url && args.signature_base64) return { sortie: erreurChamps(['signature_url, signature_base64 : use only one of them / une seule des deux']) };
  const attendues = piecesAttendues(id, reponses, opts);
  const fournies = Array.isArray(args.pieces_jointes) ? args.pieces_jointes : [];
  if (fournies.length && !formulaire) return { sortie: erreurChamps(['pieces_jointes : this template does not take attachments / ce modèle n\'accepte pas de pièces jointes']) };
  const ePieces = erreurPieces(fournies, attendues);
  if (ePieces.length) return { sortie: erreurChamps(ePieces) };
  const requisManquants = attendues.filter((p) => p.requis && !fournies.some((f) => f.piece === p.id));
  if (requisManquants.length) {
    manquants.push({ etape: 'pieces_jointes', champs: requisManquants.map((p) => ({ id: `pieces_jointes (piece: ${p.id})`, libelle: p.titre, aide: p.aide })) });
  }
  if (manquants.length) {
    const invalide = tr(langue, 'une valeur a été fournie mais elle n’est pas valide (format ou valeur)', 'a value was provided but it is not valid (format or value)');
    for (const m of manquants) m.champs = (m.champs || []).map((c) => (reponses[c.id] ? { ...c, probleme: invalide } : c));
    return {
      sortie: ok({
        statut: 'incomplet', modele: id, manquants,
        message: tr(langue, 'Des réponses, des pièces jointes ou la signature manquent ou sont invalides. Demandez-les à l’utilisateur, puis rappelez l’outil avec tous les arguments.', 'Some answers, attachments or the signature are missing or invalid. Ask the user for them, then call the tool again with the complete arguments.'),
        pieces_a_joindre: attendues,
        avertissements
      })
    };
  }

  const ad = adressesDe(id, reponses, opts);
  if (ad.erreurs) return { sortie: erreurChamps(ad.erreurs) };
  const exp = validerAdresse(ad.exp, 'expediteur'), dest = validerAdresse(ad.dest, 'destinataire');
  if (exp.erreurs.length || dest.erreurs.length) {
    return { sortie: erreurChamps([...exp.erreurs, ...dest.erreurs].map((e) => e + (id === 'rc66' ? ' (mailing address fields rcp_*)' : id === 'credit' ? ' (current address fields cr_a_*)' : ' (exp_* and dest_* fields)'))) };
  }

  let creation;
  if (sortie === 'creer') {
    const champs = {
      ...champsApi('dest', dest.adresse), ...champsApi('exp', exp.adresse),
      couleur: false, langue: langue === 'en' ? 'English' : 'Français', canal: 'mcp'
    };
    if (args.cle_idempotence) champs.cle_idempotence = String(args.cle_idempotence).slice(0, 120);
    creation = { api_base: cfg.apiBase, cle, nom_fichier: `${id === 'credit' ? 'credit-' + args.bureau : id}.pdf`, champs };
  }
  const m = await appelerMoteur(cfg, {
    creation,
    modele: id, reponses, langue, bureau: args.bureau, today, lien_pied: args.lien_pied !== false, sortie,
    signature: args.signature_url ? { url: args.signature_url } : args.signature_base64 ? { base64: args.signature_base64 } : null,
    pieces: fournies.map((f) => ({ piece: f.piece, nom: f.nom, url: f.url, base64: f.base64 }))
  });
  if (m.echec) return { sortie: m.echec };
  const rep = m.rep;
  if (rep.statut !== 'ok') {
    if (rep.erreur === 'reponses_incompletes') return { sortie: ok({ statut: 'incomplet', modele: id, manquants: rep.manques || [], message: tr(langue, 'Des réponses manquent ou sont invalides.', rep.message), avertissements }) };
    const { statut, ...reste } = rep;
    return { sortie: echec({ statut: 'erreur', ...reste }) };
  }
  return { donnees: { id, langue, exp: exp.adresse, dest: dest.adresse, moteur: rep, avertissements, attendues, fournies } };
}

/* ---------- outils ---------- */

export async function appelerOutilModele(nom, args, cfg) {
  switch (nom) {
    case 'lister_modeles': {
      const langue = langueDe(args.langue);
      const actifs = modelesActifs({ MODELES_ACTIFS: cfg.modelesActifs });
      return ok({
        statut: 'ok', modeles: catalogue(actifs, langue),
        remarque: tr(langue, 'Appelez decrire_modele pour les questions, les pages officielles à lire et les documents à joindre. Capycom ne donne pas de conseil juridique et ne décide jamais si l’utilisateur est admissible.', 'Call decrire_modele for the questions, the official pages to read and the documents to attach. Capycom does not give legal advice and never decides whether the user qualifies.')
      });
    }
    case 'decrire_modele': {
      const langue = langueDe(args.langue);
      const actifs = modelesActifs({ MODELES_ACTIFS: cfg.modelesActifs });
      if (!actifs.includes(args.modele)) return echec({ statut: 'erreur', erreur: 'modele_inconnu', message: `Modèle inconnu / Unknown template. Available: ${actifs.join(', ')}.`, modeles: actifs });
      return ok({ statut: 'ok', ...decrire(args.modele, langue) });
    }
    case 'remplir_modele': {
      const t = await traiterModele(args, cfg, 'resume');
      if (t.sortie) return t.sortie;
      const { id, langue, exp, dest, moteur, avertissements } = t.donnees;
      const prix = await api.estimerPrix(cfg, { nombre_feuilles: moteur.pages_total, couleur: false });
      const sortie = {
        statut: 'ok', modele: id, titre: titrePrompt(id, langue), langue, pret_a_creer: true,
        expediteur: lignes(exp), destinataire: lignes(dest),
        documents: [
          { contenu: estFormulaire(id) ? tr(langue, 'formulaire officiel rempli à partir des réponses', 'official form filled in from the answers') : tr(langue, 'lettre', 'letter'), pages: moteur.pages_formulaire },
          ...moteur.pieces.map((p) => ({ contenu: tr(langue, `pièce jointe : ${p.piece}`, `attachment: ${p.piece}`), nom: p.nom, pages: p.pages }))
        ],
        pages_total: moteur.pages_total,
        avertissements,
        etape_suivante: estFormulaire(id)
          ? tr(langue, 'Montrez à l’utilisateur le destinataire, le nombre de pages, le prix et la liste des pièces jointes. Après sa confirmation, appelez creer_courrier avec les mêmes arguments et adresses_confirmees à true. L’utilisateur paie ensuite sur capycom.ca; le formulaire est imprimé et posté tel quel.', 'Show the user the recipient, the number of pages and the price, and the list of attachments. After the user confirms, call creer_courrier with the same arguments and adresses_confirmees true. The user then pays on capycom.ca; the form is printed and mailed as is.')
          : tr(langue, 'Montrez à l’utilisateur le texte de la lettre (apercu_texte), le destinataire, le nombre de pages et le prix. Après sa confirmation, appelez creer_courrier avec les mêmes arguments et adresses_confirmees à true. L’utilisateur paie ensuite sur capycom.ca; la lettre est imprimée et postée telle quelle.', 'Show the user the text of the letter (apercu_texte), the recipient, the number of pages and the price. After the user confirms, call creer_courrier with the same arguments and adresses_confirmees true. The user then pays on capycom.ca; the letter is printed and mailed as is.')
      };
      if (Array.isArray(moteur.apercu) && moteur.apercu.length) sortie.apercu_texte = moteur.apercu;
      if (prix.statut === 'ok') { sortie.prix = prix; sortie.remarque_prix = tr(langue, 'Impression noir et blanc, enveloppe et timbres inclus. Le prix exact est donné à la création du brouillon.', 'Black and white printing, envelope and stamps included. The exact price is returned when the draft is created.'); }
      else sortie.avertissements.push(tr(langue, `Estimation du prix indisponible : ${prix.message || prix.erreur}`, `Price estimate unavailable: ${prix.message || prix.erreur}`));
      return ok(sortie);
    }
  }
  return null;
}

/* ---------- prompts MCP : un scénario par modèle ---------- */

export function listerPrompts(cfg) {
  const actifs = modelesActifs({ MODELES_ACTIFS: cfg.modelesActifs });
  return actifs.map((id) => ({
    name: id,
    title: `${titrePrompt(id, 'fr')} · ${titrePrompt(id, 'en')}`,
    description: descriptionPrompt(id, 'en'),
    arguments: [{ name: 'langue', description: 'fr or en (default fr)', required: false }]
  }));
}

export function lirePrompt(nom, args, cfg) {
  const actifs = modelesActifs({ MODELES_ACTIFS: cfg.modelesActifs });
  if (!actifs.includes(nom)) return null;
  const langue = langueDe(args?.langue);
  const titre = titrePrompt(nom, langue);
  const formulaire = estFormulaire(nom);
  const pays = langue === 'en' ? 'English' : 'French';
  const etapes = [
    `1. Call decrire_modele with modele="${nom}" and langue="${langue}". Read the whole result.`,
    '2. Before any question, give me the official pages listed in avant_de_commencer and the warnings, and ask me to read them and to confirm that my case fits. Do not tell me whether I qualify and do not give legal or tax advice: Capycom does not, and you only fill in the form from what I answer.',
    '3. Ask me the questions step by step, in plain language, only those that apply to my answers (afficher_si). Never guess or invent a value; if I do not know something, say so and let me look it up.'
  ];
  if (formulaire) {
    etapes.push(
      nom === 'credit' ? '4. Ask which bureau to write to (eq = Equifax, tu = TransUnion). Each bureau is a separate mail item: do them one after the other.' : '4. Tell me which documents to attach (pieces_a_joindre) and ask me for them. They must be my own documents, as PDF, JPEG or PNG files given by https address or base64.',
      '5. Ask me for an image of my own handwritten signature (signature_url or signature_base64). Never draw, type or invent a signature.',
      '6. Call remplir_modele with all the answers. If the result is incomplet, ask me for what is missing and call it again.'
    );
  } else {
    etapes.push(
      '4. Ask for my address and the recipient\'s address (Canada only) and the details of the letter.',
      '5. Call remplir_modele with all the answers. If the result is incomplet, ask me for what is missing and call it again.'
    );
  }
  etapes.push(
    '7. Show me the recipient\'s address, the documents with their page counts and the price before tax. Wait for my explicit confirmation.',
    '8. Call creer_courrier with the same arguments and adresses_confirmees true, then give me the payment link. I pay on capycom.ca; you never pay.',
    formulaire ? '9. Remind me that the form is mailed exactly as shown, that Capycom is not a government office, and that I should keep a copy.' : '9. Remind me that the letter is mailed exactly as shown.'
  );
  const texte = `I want to use the Capycom template "${titre}". Please write to me in ${pays}.\n\n${CONFIDENTIEL}\n\nFollow these steps:\n${etapes.join('\n')}`;
  return {
    description: descriptionPrompt(nom, langue),
    messages: [{ role: 'user', content: { type: 'text', text: texte } }]
  };
}


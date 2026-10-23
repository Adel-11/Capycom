// Les six outils MCP. Chacun a un title et readOnlyHint ou destructiveHint. Lecture et écriture sont séparées.
// Les descriptions décrivent ce que fait l'outil, sans consigne de comportement.

import * as api from './capycom.js';
import { composer, mettreEnPage, apercuTexte, aujourdhuiOttawa, champsApi, validerAdresse, LIMITES } from './lettre.js';
import { versBase64, depuisBase64, compterPages } from './pdf.js';
import { OUTILS_MODELES, CHAMPS_MODELE, appelerOutilModele, traiterModele } from './outils-modeles.js';
import { valider, ok, echec, erreurChamps, erreurApi, PDF_INVALIDE } from './resultats.js';

const TAILLE_PDF_MAX = 6 * 1024 * 1024;

const SCHEMA_ADRESSE = {
  type: 'object',
  description: 'Canadian postal address. Only Canada is supported.',
  properties: {
    nom: { type: 'string', description: 'Full name of the person or organization' },
    adresse: { type: 'string', description: 'Street number and street name' },
    appartement: { type: 'string', description: 'Apartment or unit number (optional)' },
    ville: { type: 'string', description: 'City' },
    province: { type: 'string', description: 'Province or territory: name in French or English, or postal abbreviation (QC, ON, BC...)' },
    code_postal: { type: 'string', description: 'Canadian postal code, format A1A 1A1' },
    pays: { type: 'string', description: 'Country (optional). Only Canada is accepted; any other country is refused' }
  },
  required: ['nom', 'adresse', 'ville', 'province', 'code_postal'],
  additionalProperties: false
};

const CHAMPS_CONTENU = {
  langue: { type: 'string', enum: ['fr', 'en'], description: 'Language of the letter and of the payment page (default fr)' },
  couleur: { type: 'boolean', description: 'Print in color instead of black and white (default false)' },
  texte: { type: 'string', description: `Body of the letter as plain text, paragraphs separated by a blank line (maximum ${LIMITES.texte} characters). Salutation, closing, date and signature are added by the layout. Use this OR pdf_url OR pdf_base64.` },
  objet: { type: 'string', description: 'Subject line (optional)' },
  salutation: { type: 'string', description: 'Opening line, e.g. "Madame, Monsieur," (optional, has a default)' },
  formule_politesse: { type: 'string', description: 'Closing line (optional, has a default; empty string for none)' },
  signature: { type: 'string', description: 'Name printed under the signature line (default: sender name)' },
  date: { type: 'string', description: 'Letter date, YYYY-MM-DD (default: today, Ottawa time)' },
  lieu: { type: 'string', description: 'Place shown before the date (default: sender city)' },
  pdf_url: { type: 'string', description: 'HTTPS address of a ready-made PDF to mail as is (maximum 6 MB). Use this OR texte OR pdf_base64.' },
  pdf_base64: { type: 'string', description: 'A ready-made PDF encoded in base64 (maximum 6 MB). Use this OR texte OR pdf_url.' }
};

export const OUTILS = [
  {
    name: 'estimer_prix',
    title: 'Estimate the price of a letter',
    description: 'Returns the price of mailing a letter within Canada for a given number of sheets, before tax, as computed by Capycom (envelope, stamps and printing). Nothing is created.',
    inputSchema: {
      type: 'object',
      properties: {
        nombre_feuilles: { type: 'integer', minimum: 1, description: 'Number of sheets' },
        couleur: { type: 'boolean', description: 'Color printing (default false)' }
      },
      required: ['nombre_feuilles'],
      additionalProperties: false
    },
    annotations: { title: 'Estimate the price of a letter', readOnlyHint: true, openWorldHint: true }
  },
  ...OUTILS_MODELES,
  {
    name: 'preparer_lettre',
    title: 'Prepare a letter and check its price',
    description: 'Checks the addresses, lays out the letter text as a one-page-or-more PDF (Letter format: sender left, recipient right, date and signature line at the bottom) or checks a ready-made PDF, and returns the page count, a text preview and the price estimate. Nothing is created at Capycom and nothing is kept by this server.',
    inputSchema: {
      type: 'object',
      properties: {
        expediteur: SCHEMA_ADRESSE,
        destinataire: SCHEMA_ADRESSE,
        ...CHAMPS_CONTENU,
        inclure_pdf: { type: 'boolean', description: 'Also return the generated PDF in base64 (default false)' }
      },
      required: ['expediteur', 'destinataire'],
      additionalProperties: false
    },
    annotations: { title: 'Prepare a letter and check its price', readOnlyHint: true, openWorldHint: true }
  },
  {
    name: 'creer_courrier',
    title: 'Create a mail draft and get the payment link',
    description: 'Creates a draft mail item on the connected Capycom account from a letter text, a ready-made PDF or a filled-in template (modele, with reponses, signature and attachments as for remplir_modele; the sender and the recipient then come from the template), and returns the price before tax and a payment link. The letter is printed and mailed only after the account holder pays on capycom.ca; this tool never pays. Drafts that are not paid are deleted automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        expediteur: SCHEMA_ADRESSE,
        destinataire: SCHEMA_ADRESSE,
        ...CHAMPS_CONTENU,
        modele: { type: 'string', description: 'Template id (from lister_modeles) instead of texte, pdf_url or pdf_base64. Then give reponses, and for official forms signature_url or signature_base64 and the attachments; expediteur and destinataire are not used.' },
        ...CHAMPS_MODELE,
        adresses_confirmees: { type: 'boolean', description: 'Must be true: states that the user confirmed the recipient address and the content' },
        cle_idempotence: { type: 'string', description: 'Optional. Calling again with the same value returns the same draft instead of creating a second one' }
      },
      required: ['adresses_confirmees'],
      additionalProperties: false
    },
    annotations: { title: 'Create a mail draft and get the payment link', readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true }
  },
  {
    name: 'statut_courrier',
    title: 'Check the status of a mail item',
    description: 'Returns the status, reference and price of one mail item of the connected account (draft, paid, taken into account, printed, mailed or problem).',
    inputSchema: {
      type: 'object',
      properties: { id_courrier: { type: 'string', description: 'Identifier returned when the item was created' } },
      required: ['id_courrier'],
      additionalProperties: false
    },
    annotations: { title: 'Check the status of a mail item', readOnlyHint: true, openWorldHint: true }
  },
  {
    name: 'lister_courriers',
    title: 'List recent mail items',
    description: 'Returns the five most recent mail items of the connected account with their status and price.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    annotations: { title: 'List recent mail items', readOnlyHint: true, openWorldHint: true }
  },
  {
    name: 'annuler_brouillon',
    title: 'Cancel a draft',
    description: 'Cancels a draft mail item and deletes its pages and PDF files at Capycom. A paid item cannot be cancelled.',
    inputSchema: {
      type: 'object',
      properties: { id_courrier: { type: 'string', description: 'Identifier of the draft' } },
      required: ['id_courrier'],
      additionalProperties: false
    },
    annotations: { title: 'Cancel a draft', readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true }
  }
];

/* ---------- contenu : texte mis en page ou PDF fourni ---------- */

async function lirePdfFourni(args, cfg) {
  let octets, nom = 'document.pdf';
  if (args.pdf_url) {
    let u;
    try { u = new URL(args.pdf_url); } catch { return { erreurs: ['pdf_url : invalid address / adresse invalide'] }; }
    if (u.protocol !== 'https:' || u.username || u.password) return { erreurs: ['pdf_url : only https addresses without credentials are accepted / adresse https sans identifiants seulement'] };
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    try {
      const r = await cfg.fetch(u.toString(), { headers: { accept: 'application/pdf' }, redirect: 'follow', signal: ctrl.signal });
      if (!r.ok) return { erreurs: [`pdf_url : the address answered HTTP ${r.status} / l'adresse a répondu HTTP ${r.status}`] };
      const len = parseInt(r.headers.get('content-length') || '0', 10);
      if (len > TAILLE_PDF_MAX) return { erreurs: ['pdf_url : file larger than 6 MB / fichier de plus de 6 Mo'] };
      octets = new Uint8Array(await r.arrayBuffer());
    } catch {
      return { erreurs: ['pdf_url : the file could not be downloaded / le fichier n\'a pas pu être téléchargé'] };
    } finally { clearTimeout(t); }
    const fin = decodeURIComponent(u.pathname.split('/').pop() || '');
    if (/^[\w.\- ()]+\.pdf$/i.test(fin)) nom = fin;
  } else {
    try { octets = depuisBase64(args.pdf_base64); } catch { return { erreurs: ['pdf_base64 : invalid base64 / base64 invalide'] }; }
  }
  if (octets.length > TAILLE_PDF_MAX) return { erreurs: ['pdf : file larger than 6 MB / fichier de plus de 6 Mo'] };
  const info = await compterPages(octets);
  if (!info.valide) return { erreurs: ['pdf : not a PDF file / ce n\'est pas un fichier PDF'] };
  if (info.chiffre) return { pdfInvalide: true };
  const avert = [];
  if (info.pages == null) avert.push('The page count could not be read here; Capycom counts the pages when the draft is created. / Nombre de pages non lisible ici, Capycom le compte à la création.');
  return { octets, nom, pages: info.pages, avertissements: avert };
}

/** Prépare le PDF et les adresses. Renvoie { erreurs } ou le contenu prêt à envoyer. */
async function preparerContenu(args, cfg) {
  const sources = ['texte', 'pdf_url', 'pdf_base64'].filter((k) => args[k]);
  const erreurs = [];
  if (sources.length !== 1) erreurs.push('texte, pdf_url, pdf_base64 : exactly one of them is required / un seul des trois est obligatoire');

  if (args.texte || !sources.length) {
    const c = composer(args, aujourdhuiOttawa(cfg.maintenant() * 1000));
    if (c.erreurs.length) return { erreurs: [...erreurs, ...c.erreurs].filter((e, i, a) => a.indexOf(e) === i) };
    if (erreurs.length) return { erreurs };
    const mep = mettreEnPage(c.L);
    const avert = [];
    if (c.remplaces.length) avert.push(`Characters not supported by the PDF font were simplified: ${c.remplaces.join(' ')}`);
    return {
      mode: 'texte', octets: mep.octets, pages: mep.pages, nom: `lettre-${aujourdhuiOttawa(cfg.maintenant() * 1000)}.pdf`,
      adresses: c.adresses, apercu: apercuTexte(c.L), avertissements: avert, taille_police: mep.taille
    };
  }

  // PDF fourni : les adresses viennent des arguments.
  const exp = validerAdresse(args.expediteur, 'expediteur');
  const dest = validerAdresse(args.destinataire, 'destinataire');
  erreurs.push(...exp.erreurs, ...dest.erreurs);
  if (erreurs.length) return { erreurs };
  const pdf = await lirePdfFourni(args, cfg);
  if (pdf.erreurs) return { erreurs: pdf.erreurs };
  if (pdf.pdfInvalide) return { pdfInvalide: true };
  return { mode: 'pdf', octets: pdf.octets, pages: pdf.pages, nom: pdf.nom, adresses: { exp: exp.adresse, dest: dest.adresse }, avertissements: pdf.avertissements };
}

/* ---------- exécution des outils ---------- */

export async function appelerOutil(nom, args, cfg, cle) {
  const outil = OUTILS.find((o) => o.name === nom);
  if (!outil) return null;
  args = args || {};
  const err = valider(outil.inputSchema, args);
  if (err.length) return erreurChamps(err);

  if (nom === 'lister_modeles' || nom === 'decrire_modele' || nom === 'remplir_modele') return appelerOutilModele(nom, args, cfg);

  switch (nom) {
    case 'estimer_prix': {
      const r = await api.estimerPrix(cfg, args);
      return r.statut === 'ok' ? ok(r) : erreurApi(r);
    }

    case 'preparer_lettre': {
      const c = await preparerContenu(args, cfg);
      if (c.erreurs) return erreurChamps(c.erreurs);
      if (c.pdfInvalide) return echec(PDF_INVALIDE);
      const sortie = {
        statut: 'ok', mode: c.mode, pages: c.pages, couleur: !!args.couleur,
        expediteur: c.apercu?.expediteur, destinataire: c.apercu?.destinataire,
        apercu: c.apercu, avertissements: c.avertissements
      };
      if (c.mode === 'pdf') { sortie.expediteur = adresseTexte(c.adresses.exp); sortie.destinataire = adresseTexte(c.adresses.dest); }
      if (c.pages) {
        const p = await api.estimerPrix(cfg, { nombre_feuilles: c.pages, couleur: !!args.couleur });
        if (p.statut === 'ok') sortie.prix = p; else sortie.avertissements.push(`Price estimate unavailable: ${p.message || p.erreur}`);
        sortie.remarque_prix = 'Estimate assumes one page per sheet; the exact price is returned when the draft is created.';
      }
      if (args.inclure_pdf) sortie.pdf_base64 = versBase64(c.octets);
      return ok(sortie);
    }

    case 'creer_courrier': {
      if (args.adresses_confirmees !== true) {
        return erreurChamps(['adresses_confirmees : must be true once the user has confirmed the recipient address and the content / doit être vrai après confirmation par l\'utilisateur']);
      }
      if (args.modele) return creerDepuisModele(args, cfg, cle);
      if (!args.expediteur || !args.destinataire) {
        return erreurChamps([...(!args.expediteur ? ['expediteur : required / obligatoire'] : []), ...(!args.destinataire ? ['destinataire : required / obligatoire'] : [])]);
      }
      const c = await preparerContenu(args, cfg);
      if (c.erreurs) return erreurChamps(c.erreurs);
      if (c.pdfInvalide) return echec(PDF_INVALIDE);
      const langue = String(args.langue || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr';
      const corps = {
        pdf: { filename: c.nom, contents: versBase64(c.octets), private: true },
        ...champsApi('dest', c.adresses.dest),
        ...champsApi('exp', c.adresses.exp),
        couleur: !!args.couleur,
        langue: langue === 'en' ? 'English' : 'Français',
        canal: 'mcp'
      };
      if (args.cle_idempotence) corps.cle_idempotence = String(args.cle_idempotence).slice(0, 120);
      const r = await api.creerCourrier(cfg, cle, corps);
      if (r.statut !== 'ok') return erreurApi(r);
      return ok({
        ...r,
        avertissements: c.avertissements,
        etape_suivante: langue === 'en'
          ? 'The item is a draft. It is printed and mailed only after the account holder opens lien_paiement, signs in, checks the summary and pays.'
          : 'Le courrier est un brouillon. Il est imprimé et posté seulement après que le titulaire du compte a ouvert lien_paiement, s\'est connecté, a vérifié le récapitulatif et a payé.'
      });
    }

    case 'statut_courrier': {
      const r = await api.statutCourrier(cfg, cle, args.id_courrier);
      return r.statut === 'ok' ? ok(r) : erreurApi(r);
    }

    case 'lister_courriers': {
      const r = await api.listerCourriers(cfg, cle);
      return r.statut === 'ok' ? ok(r) : erreurApi(r);
    }

    case 'annuler_brouillon': {
      const r = await api.annulerBrouillon(cfg, cle, args.id_courrier);
      return r.statut === 'ok' ? ok(r) : erreurApi(r);
    }
  }
  return null;
}

/** Brouillon depuis un modèle : le moteur remplit le formulaire et fusionne les pièces, le Worker crée le courrier. */
async function creerDepuisModele(args, cfg, cle) {
  if (args.texte || args.pdf_url || args.pdf_base64) {
    return erreurChamps(['modele, texte, pdf_url, pdf_base64 : use only one source / une seule source']);
  }
  const t = await traiterModele(args, cfg, 'creer', cle);
  if (t.sortie) return t.sortie;
  const { id, langue, moteur, avertissements } = t.donnees;
  const r = moteur.creation;
  if (!r || typeof r !== 'object') return echec({ statut: 'erreur', erreur: 'moteur_indisponible', message: 'The form engine returned no answer from Capycom.' });
  if (r.statut !== 'ok') return erreurApi(r);
  const avert = [...avertissements];
  if (typeof r.nombre_feuilles === 'number' && r.nombre_feuilles !== moteur.pages_total) {
    avert.push(`Capycom counted ${r.nombre_feuilles} sheet(s) while ${moteur.pages_total} page(s) were sent. Check the summary before paying.`);
  }
  return ok({
    ...r,
    modele: id,
    pages_envoyees: moteur.pages_total,
    avertissements: avert,
    etape_suivante: langue === 'en'
      ? 'The item is a draft. It is printed and mailed as shown only after the account holder opens lien_paiement, signs in, checks the summary and pays.'
      : 'Le courrier est un brouillon. Il est imprimé et posté tel quel seulement après que le titulaire du compte a ouvert lien_paiement, s\'est connecté, a vérifié le récapitulatif et a payé.'
  });
}

function adresseTexte(a) {
  return [a.nom, a.appartement ? `${a.appartement}-${a.ligne}` : a.ligne, `${a.ville} ${a.province.abr} ${a.code_postal}`];
}

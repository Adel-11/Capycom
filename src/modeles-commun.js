// Modèles de lettres et de formulaires officiels : catalogue, description, vérification des réponses, adresses.
// Module pur (aucun accès au réseau, au disque ni à l'horloge) partagé par le Worker et par le service « moteur » de Coolify.
// Source des modèles : dossier modeles/ du dépôt (moteur pur et définitions JSON).
// Aucune donnée de client n'est lue ni conservée ici : les réponses passent en argument et ressortent en résultat.

import M from '../modeles/moteur.cjs';
import commun from '../modeles/definitions/commun.json' with { type: 'json' };
import resiliation from '../modeles/definitions/resiliation.json' with { type: 'json' };
import adresse from '../modeles/definitions/adresse.json' with { type: 'json' };
import remboursement from '../modeles/definitions/remboursement.json' with { type: 'json' };
import contestation from '../modeles/definitions/contestation.json' with { type: 'json' };
import demeure from '../modeles/definitions/demeure.json' with { type: 'json' };
import rc66 from '../modeles/definitions/rc66.json' with { type: 'json' };
import credit from '../modeles/definitions/credit.json' with { type: 'json' };

export const MOTEUR = M;
export const COMMUN = commun;
export const DEFS = { resiliation, adresse, remboursement, contestation, demeure, rc66, credit };
export const TOUS = Object.keys(DEFS);
/** Modèles proposés aux IA tant qu'Adel n'a pas validé les autres (pilote : RC66, résiliation, contestation de crédit). */
export const ACTIFS_PAR_DEFAUT = ['rc66', 'credit', 'resiliation'];
export const FORMULAIRES = ['rc66', 'credit'];

export function modelesActifs(env) {
  const l = String(env?.MODELES_ACTIFS || '').split(',').map((s) => s.trim()).filter((s) => TOUS.includes(s));
  return l.length ? l : ACTIFS_PAR_DEFAUT;
}

export const estFormulaire = (id) => FORMULAIRES.includes(id);
export const langueDe = (l) => (String(l || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr');
const T = (o, l) => (o && typeof o === 'object' ? (o[l] ?? o.fr ?? '') : (o ?? ''));

/* ---------- champs ---------- */

function champsPlats(id) {
  const d = DEFS[id];
  const liste = [];
  if (d.etapes) for (const e of d.etapes) for (const c of e.champs || []) liste.push({ ...c, etape: e.id });
  else {
    for (const c of commun.champsLettre) liste.push({ ...c, etape: 'formulaire' });
    for (const c of d.champs || []) liste.push({ ...c, etape: 'formulaire' });
  }
  return liste;
}

const CACHE_CHAMPS = {};
function champsDe(id) { return (CACHE_CHAMPS[id] ||= champsPlats(id)); }

/** Retrouve la définition d'un identifiant de réponse, y compris les motifs répétés (rc_e{n}_prenom → rc_e1_prenom). */
export function champ(id, cle) {
  for (const c of champsDe(id)) {
    if (c.id === cle) return { ...c, n: null };
    if (c.id.includes('{n}')) {
      const m = new RegExp('^' + c.id.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace('\\{n\\}', '(\\d+)').replace('{n}', '(\\d+)') + '$').exec(cle);
      if (m) return { ...c, n: parseInt(m[1], 10) };
    }
  }
  return null;
}

export const CONF = {
  en: 'The answers may contain very sensitive personal data (social insurance number, children, status in Canada). They pass through this server only to produce the PDF, they are never stored or logged, and the Capycom connector never pays.',
  fr: 'Les réponses peuvent contenir des données très sensibles (numéro d’assurance sociale, enfants, statut au Canada). Elles passent par ce serveur seulement pour produire le PDF, ne sont jamais conservées ni journalisées, et le connecteur Capycom ne paie jamais.'
};
const VAL_PROVINCES = () => M.PROVINCES_RC.map((p) => p.fr);

/** Réponses : tout en chaînes. true → '1' pour une case ; true/false → oui/non pour un choix oui/non. Clés inconnues signalées. */
export function normaliserReponses(id, brut) {
  const out = {}, inconnus = [];
  const src = brut && typeof brut === 'object' && !Array.isArray(brut) ? brut : {};
  for (const [k, v0] of Object.entries(src)) {
    if (!/^[A-Za-z0-9_]{1,40}$/.test(k)) { inconnus.push(k.slice(0, 40)); continue; }
    const c = champ(id, k);
    if (!c) { inconnus.push(k); continue; }
    let v = v0;
    if (v === null || v === undefined) v = '';
    else if (typeof v === 'boolean') {
      const oui = c.type === 'choix' && (c.valeurs || []).some((x) => x.valeur === 'oui');
      v = oui ? (v ? 'oui' : 'non') : (v ? '1' : '');
    } else if (typeof v === 'number') v = String(v);
    else if (typeof v !== 'string') { inconnus.push(k); continue; }
    out[k] = v.length > 6000 ? v.slice(0, 6000) : v;
  }
  return { reponses: out, inconnus };
}

/** Prépare les réponses pour un bureau de crédit : les cases de bureau viennent de l'argument `bureau`. */
export function appliquerBureau(reponses, bureau) {
  const v = { ...reponses };
  if (bureau === 'eq') { v.cr_eq = '1'; v.cr_tu = ''; }
  else if (bureau === 'tu') { v.cr_tu = '1'; v.cr_eq = ''; }
  return v;
}

/* ---------- contexte moteur ---------- */

export function optionsMoteur(id, v, { langue = 'fr', bureau, today, lienPied = true } = {}) {
  const o = { ui: langue, today };
  if (id === 'rc66') {
    o.rc = { deux: !!(String(v.rc_e2_prenom || '').trim() || String(v.rc_e2_nom || '').trim() || String(v.rc_e2_naiss || '').trim()), perso: false, raccourci: false, schPerso: false };
  } else if (id === 'credit') {
    o.cr = {}; o.bureaux = bureau ? [bureau] : undefined;
  } else {
    o.lettre = langue; o.lienPied = lienPied;
  }
  return o;
}

function reponsesVerifiees(id, v0, opts) {
  return id === 'credit' ? appliquerBureau(v0, opts.bureau) : { ...v0 };
}

/** Réponses manquantes ou invalides : [{ etape, titre, champs:[{id, libelle}] }]. Pour une lettre, la date du jour est proposée par défaut. */
export function manques(id, v0, opts) {
  const langue = langueDe(opts.langue);
  let v = reponsesVerifiees(id, v0, opts);
  if (!estFormulaire(id) && !String(v.date_lettre || '').trim()) v = { ...v, date_lettre: opts.today };
  const o = optionsMoteur(id, v, { ...opts, langue });
  if (!estFormulaire(id)) o.champs = champsDe(id);
  const res = M.verifier(id, v, o);
  const out = [];
  for (const r of res) {
    if (!r.manques.length) continue;
    const def = DEFS[id].etapes?.find((e) => e.id === r.etape);
    out.push({
      etape: r.etape, titre: def ? T(def.titre, langue) : undefined,
      champs: [...new Set(r.manques)].map((cle) => descriptionChamp(id, cle, langue))
    });
  }
  // Dates fournies dans un autre format que AAAA-MM-JJ : le moteur les laisserait passer telles quelles.
  const vues = new Set(out.flatMap((e) => e.champs.map((c) => c.id)));
  const mauvaises = Object.keys(v0 || {}).filter((cle) => {
    const c = champ(id, cle);
    const val = String((v0 || {})[cle] ?? '').trim();
    return c && c.type === 'date' && val && !/^\d{4}-\d{2}-\d{2}$/.test(val) && !vues.has(cle);
  });
  if (mauvaises.length) out.push({ etape: 'dates', champs: mauvaises.map((cle) => descriptionChamp(id, cle, langue)) });
  if (id === 'credit' && !opts.bureau) out.unshift({ etape: 'bureau', champs: [{ id: 'bureau', libelle: langue === 'fr' ? 'Bureau de crédit (eq = Equifax, tu = TransUnion)' : 'Credit bureau (eq = Equifax, tu = TransUnion)' }] });
  return out;
}

function descriptionChamp(id, cle, langue) {
  const c = champ(id, cle);
  if (!c) return { id: cle, libelle: cle };
  const o = { id: cle, libelle: T(c.libelle, langue) };
  if (c.groupe) o.groupe = c.n ? T(c.groupe, langue) : T(c.groupe, langue);
  return o;
}

/* ---------- pièces à joindre ---------- */

/** [{ id, requis, titre, aide, lien? }] pour ces réponses. */
export function piecesAttendues(id, v0, opts) {
  if (!estFormulaire(id)) return [];
  const langue = langueDe(opts.langue);
  const v = reponsesVerifiees(id, v0, opts);
  const o = optionsMoteur(id, v, { ...opts, langue });
  if (id === 'credit') o.bureau = opts.bureau;
  return M.documentsDe(id, v, o).map((d) => ({
    id: d.id, requis: !!d.req, titre: d[langue].titre, aide: d[langue].aide, ...(d.lien ? { lien: d.lien.cle } : {})
  }));
}

/* ---------- adresses ---------- */

function lire(v, k) { return String(v[k] ?? '').trim(); }

/** Expéditeur et destinataire {nom, adresse, appartement?, ville, province, code_postal} pour ce modèle. Renvoie { exp, dest } ou { erreurs }. */
export function adressesDe(id, v0, opts) {
  const langue = langueDe(opts.langue);
  const v = reponsesVerifiees(id, v0, opts);
  if (id === 'rc66') {
    const prov = lire(v, 'rc_memeadr') ? lire(v, 'rcp_prov') : lire(v, 'rcd_prov');
    const p = M.provRc(prov);
    if (!p) return { erreurs: ['province : unknown province of residence / province de résidence inconnue'] };
    const cle = p.ab === 'QC' ? 'jonquiere' : ['PE', 'NB', 'NS', 'ON', 'NL'].includes(p.ab) ? 'sudbury' : 'winnipeg';
    const c = commun.centres[cle];
    return {
      exp: { nom: `${lire(v, 'rc_prenom')} ${lire(v, 'rc_nom')}`.trim(), adresse: lire(v, 'rcp_ligne'), ville: lire(v, 'rcp_ville'), province: lire(v, 'rcp_prov'), code_postal: lire(v, 'rcp_cp') },
      dest: { nom: c.nom, adresse: c.ligne, ville: c.ville, province: c.prov, code_postal: c.cp }
    };
  }
  if (id === 'credit') {
    const b = commun.bureaux[opts.bureau];
    if (!b) return { erreurs: ['bureau : eq or tu / eq ou tu'] };
    const d = b.dest[langue];
    const ligne = `${lire(v, 'cr_a_app') ? lire(v, 'cr_a_app') + '-' : ''}${[lire(v, 'cr_a_no'), lire(v, 'cr_a_rue')].join(' ').trim()}`;
    return {
      exp: { nom: `${lire(v, 'cr_prenom')} ${lire(v, 'cr_nom')}`.trim(), adresse: ligne, ville: lire(v, 'cr_a_ville'), province: lire(v, 'cr_a_prov'), code_postal: lire(v, 'cr_a_cp') },
      dest: { nom: d.nom, adresse: d.ligne, ville: d.ville, province: d.prov, code_postal: d.cp }
    };
  }
  return {
    exp: { nom: lire(v, 'exp_nom'), adresse: lire(v, 'exp_ligne'), ville: lire(v, 'exp_ville'), province: lire(v, 'exp_prov'), code_postal: lire(v, 'exp_cp') },
    dest: { nom: lire(v, 'dest_nom') + (lire(v, 'dest_service') ? ', ' + lire(v, 'dest_service') : ''), adresse: lire(v, 'dest_ligne'), ville: lire(v, 'dest_ville'), province: lire(v, 'dest_prov'), code_postal: lire(v, 'dest_cp') }
  };
}

/* ---------- catalogue et description ---------- */

function sectionDe(id) { return commun.sections.find((s) => s.modeles.includes(id)); }

export function catalogue(actifs, langue) {
  return actifs.map((id) => {
    const d = DEFS[id], s = sectionDe(id);
    return {
      id,
      titre: T(d.titre, langue),
      description: T(d.description, langue),
      section: s ? T(s.titre, langue) : undefined,
      type: estFormulaire(id) ? 'official_form' : 'letter',
      organisme: d.formulaire ? T(d.formulaire.organisme, langue) : undefined,
      pieces_jointes: estFormulaire(id),
      signature: estFormulaire(id) ? 'required' : 'optional',
      ...(id === 'credit' ? { remarque: langue === 'fr' ? 'Un courrier par bureau de crédit (eq ou tu).' : 'One mail item per credit bureau (eq or tu).' } : {})
    };
  });
}

function conditionTexte(groupes, langue) {
  if (!Array.isArray(groupes) || !groupes.length) return undefined;
  const en = langue === 'en';
  return groupes.map((g) => Object.entries(g).map(([k, val]) => (val === true ? `${k} ${en ? 'is filled in' : 'est renseigné'}` : `${k} = ${val}`)).join(en ? ' and ' : ' et ')).join(en ? ' or ' : ' ou ');
}

function champDecrit(c, langue) {
  const en = langue === 'en';
  const o = { id: c.id, type: c.type, libelle: T(c.libelle, langue) };
  o.requis = !!c.requis;
  if (c.groupe) o.groupe = T(c.groupe, langue);
  if (c.type === 'choix') o.valeurs = (c.valeurs || []).map((x) => ({ valeur: x.valeur, libelle: T(x, langue) }));
  else if (c.type === 'province-rc' || c.type === 'province' || c.type === 'province-ou-pays') o.valeurs = c.type === 'province-ou-pays' ? (en ? 'province or territory name, or another country' : 'nom d’une province ou d’un territoire, ou un autre pays') : VAL_PROVINCES();
  else if (c.type === 'case') o.valeurs = en ? "'1' when ticked, empty otherwise" : "'1' si cochée, vide sinon";
  else if (c.type === 'date') o.valeurs = 'YYYY-MM-DD';
  else if (c.type === 'nas') o.valeurs = en ? '9 digits, spaces allowed' : '9 chiffres, espaces permis';
  if (c.exemple) o.exemple = T(c.exemple, langue);
  if (c.max && c.type !== 'date') o.longueur_max = c.max;
  if (c.aide) o.aide = T(c.aide, langue);
  if (c.membres) o.membres = c.membres;
  else if (c.type === 'groupe' && /_stat$/.test(c.id)) o.membres = ['cit', 'rp', 'pp', 'rt', 'ind'].map((x) => c.id.replace(/_stat$/, '_' + x));
  if (c.id === 'rc_sch_an') o.type = 'annee';
  const q = conditionTexte(c.quand, langue); if (q) o.afficher_si = q;
  const s = conditionTexte(c.sauf, langue); if (s) o.masquer_si = s;
  const r = conditionTexte(c.requisSauf, langue); if (r) o.non_requis_si = r;
  return o;
}

function lienOfficiel(l, langue) { return { but: T(l.but, langue), url: l[langue] || l.fr }; }


/** Notes du site adaptées au MCP : on retire ce qui parle du navigateur ou du dessin de signature, et on ajoute le vrai fonctionnement. */
function notesMcp(d, langue) {
  const brut = (d.etapes || []).flatMap((e) => (e.notes || []).map((n) => ({ titre: T(n.titre, langue), texte: [].concat(T(n.texte, langue)) })));
  const sortie = [];
  for (const n of brut) {
    const texte = n.texte.filter((t) => !/navigateur|your browser|dessinez|draw it/i.test(t));
    if (!texte.length) continue;
    sortie.push({ titre: n.titre || (langue === 'en' ? 'Note' : 'À noter'), texte });
  }
  sortie.push(langue === 'en'
    ? { titre: 'Your data and your signature', texte: ['Through this assistant, your answers and attachments pass through the Capycom connector only to produce the PDF and forward it to Capycom. They are not stored or logged.', 'The signature is an image of your own handwritten signature that you provide (signature_url or signature_base64). The assistant must not draw or invent one. You can also sign by hand after printing.'] }
    : { titre: 'Vos données et votre signature', texte: ['Avec cet assistant, vos réponses et vos pièces jointes passent par le connecteur Capycom seulement pour produire le PDF et le transmettre à Capycom. Elles ne sont ni conservées ni journalisées.', 'La signature est une image de votre propre signature manuscrite que vous fournissez (signature_url ou signature_base64). L\u2019assistant ne doit pas en dessiner ni en inventer une. Vous pouvez aussi signer à la main après l\u2019impression.'] });
  return sortie;
}

/** Description complète d'un modèle pour une IA. */
export function decrire(id, langue) {
  const d = DEFS[id], s = sectionDe(id), formulaire = estFormulaire(id);
  const sortie = {
    id, titre: T(d.titre, langue), type: formulaire ? 'official_form' : 'letter',
    section: s ? T(s.titre, langue) : undefined,
    usage: T(d.usage, langue),
    organisme: d.formulaire ? T(d.formulaire.organisme, langue) : undefined,
    avant_de_commencer: {
      pages_officielles_a_lire: (d.liensOfficiels || []).map((l) => lienOfficiel(l, langue)),
      mises_en_garde: (d.avertissements || []).map((a) => T(a, langue)),
      notes: notesMcp(d, langue)
    },
    questions: d.etapes
      ? d.etapes.filter((e) => (e.champs || []).length).map((e) => {
        const x = { etape: e.id, titre: T(e.titre, langue), aide: T(e.aide, langue), champs: e.champs.map((c) => champDecrit(c, langue)) };
        const q = conditionTexte(e.quand, langue); if (q) x.afficher_si = q;
        if (e.repete) x.repetition = { variable: e.repete.variable, de: e.repete.min, a: e.repete.max, aide: T(e.repete.aide, langue) };
        if (e.regle) x.regle = T(e.regle, langue);
        return x;
      })
      : [{ etape: 'formulaire', titre: T(d.titre, langue), champs: [...commun.champsLettre, ...d.champs].map((c) => champDecrit(c, langue)) }],
    format_des_reponses: langue === 'en'
      ? 'reponses is an object whose keys are the field ids above. All values are strings (a ticked box is "1"). Dates are YYYY-MM-DD. Repeated ids use the child or account number in place of {n}. afficher_si = the question applies only when the condition is true; masquer_si = the question is skipped when the condition is true; non_requis_si = not required when the condition is true.'
      : 'reponses est un objet dont les clés sont les identifiants de champs ci-dessus. Toutes les valeurs sont des chaînes (une case cochée vaut "1"). Les dates sont au format AAAA-MM-JJ. Pour les champs répétés, remplacez {n} par le numéro de l’enfant ou du compte. afficher_si = la question ne s’applique que si la condition est vraie; masquer_si = la question est sautée si la condition est vraie; non_requis_si = non obligatoire si la condition est vraie.',
    langue_de_reference: langue
  };
  if (d.production?.aideRedaction) sortie.format_des_reponses += ' ' + T(d.production.aideRedaction, langue);
  sortie.confidentialite = langue === 'en' ? CONF.en : CONF.fr;
  if (formulaire) {
    sortie.pieces_a_joindre = piecesDecrites(d, langue);
    sortie.signature = {
      requise: true,
      aide: langue === 'en'
        ? 'A PNG or JPEG image of the user\'s own handwritten signature is placed on the form (signature_url or signature_base64). The assistant must not draw, type or invent a signature: the user supplies the image.'
        : 'Une image PNG ou JPEG de la propre signature manuscrite de l’utilisateur est placée sur le formulaire (signature_url ou signature_base64). L’assistant ne doit pas dessiner, taper ni inventer une signature : c’est l’utilisateur qui fournit l’image.'
    };
  }
  if (id === 'credit') {
    sortie.bureau = { requis: true, valeurs: ['eq', 'tu'], aide: langue === 'en' ? 'One mail item per bureau. Call the tools once for eq (Equifax) and once for tu (TransUnion). The fields cr_bureau, cr_eq and cr_tu are set from this argument.' : 'Un envoi par bureau. Appelez les outils une fois pour eq (Equifax) et une fois pour tu (TransUnion). Les champs cr_bureau, cr_eq et cr_tu viennent de cet argument.' };
    sortie.destinataires = Object.entries(commun.bureaux).map(([k, b]) => ({ bureau: k, ...b.dest[langue] }));
  } else if (id === 'rc66') {
    sortie.destinataires = Object.values(commun.centres).map((c) => ({ nom: c.nom, adresse: `${c.ligne}, ${c.ville} ${c.cp}`, provinces: T(c.zone, langue) }));
    sortie.destinataires_choix = T(d.destinataires.choix, langue);
  } else sortie.destinataire = T(d.destinataire, langue);
  return sortie;
}

function piecesDecrites(d, langue) {
  const liste = Array.isArray(d.piecesJointes) ? d.piecesJointes.map((p) => ({ ...p })) : Object.entries(d.piecesJointes).flatMap(([b, arr]) => arr.map((p) => ({ ...p, bureau: b })));
  return liste.map((p) => {
    const o = { id: p.id, requis: !!p.requis, titre: T(p.titre, langue), aide: T(p.aide, langue) };
    if (p.bureau) o.bureau = p.bureau;
    if (p.quand) o.quand = T(p.quand, langue).replace(/\s*\((?:[^()]*\b(?:rc|cr)[._]\w+[^()]*)\)/g, '');
    if (d.id === 'rc66' && p.id === 'sch') {
      o.requis = false;
      o.quand = langue === 'en' ? 'Only if the user prefers to provide their own completed RC66SCH. Otherwise Capycom fills in the RC66SCH itself from the answers, no attachment needed.' : 'Seulement si l’utilisateur préfère fournir son propre RC66SCH rempli. Sinon Capycom remplit lui-même le RC66SCH à partir des réponses, aucune pièce à joindre.';
    }
    return o;
  });
}

/** Texte de la consigne de chaque prompt MCP. */
export function titrePrompt(id, langue) { return T(DEFS[id].titre, langue); }
export function descriptionPrompt(id, langue) { return T(DEFS[id].description, langue); }

/** Pages officielles à lire (pour les prompts). */
export function lienPrincipal(id, langue) {
  const l = (DEFS[id].liensOfficiels || [])[0];
  return l ? lienOfficiel(l, langue) : null;
}

// Mise en page d'une lettre (même disposition que les modèles de lettres de capycom.ca : format lettre,
// expéditeur à gauche, destinataire à droite, date et signature en bas, pied de page) et validation des adresses.

import { nettoyerTexte, largeurMm, ecrirePdf } from './pdf.js';

/* ---------- provinces et territoires ---------- */

// nom: valeur d'option attendue par l'API (nom affiché en français), abr: abréviation postale.
export const PROVINCES = [
  { nom: 'Alberta', abr: 'AB', en: 'Alberta' },
  { nom: 'Colombie-Britannique', abr: 'BC', en: 'British Columbia' },
  { nom: 'Île-du-Prince-Édouard', abr: 'PE', en: 'Prince Edward Island' },
  { nom: 'Manitoba', abr: 'MB', en: 'Manitoba' },
  { nom: 'Nouveau-Brunswick', abr: 'NB', en: 'New Brunswick' },
  { nom: 'Nouvelle-Écosse', abr: 'NS', en: 'Nova Scotia' },
  { nom: 'Nunavut', abr: 'NU', en: 'Nunavut' },
  { nom: 'Ontario', abr: 'ON', en: 'Ontario' },
  { nom: 'Québec', abr: 'QC', en: 'Quebec' },
  { nom: 'Saskatchewan', abr: 'SK', en: 'Saskatchewan' },
  { nom: 'Terre-Neuve-et-Labrador', abr: 'NL', en: 'Newfoundland and Labrador' },
  { nom: 'Territoires du Nord-Ouest', abr: 'NT', en: 'Northwest Territories' },
  { nom: 'Yukon', abr: 'YT', en: 'Yukon' }
];

const simplifier = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]+/g, ' ').trim();
const INDEX_PROVINCES = new Map();
for (const p of PROVINCES) {
  for (const cle of [p.nom, p.en, p.abr]) INDEX_PROVINCES.set(simplifier(cle), p);
}
for (const [alias, abr] of [['pq', 'QC'], ['que', 'QC'], ['ont', 'ON'], ['nfld', 'NL'], ['tnl', 'NL'], ['pei', 'PE'], ['ipe', 'PE'], ['ile du prince edouard', 'PE'], ['terre neuve', 'NL'], ['nwt', 'NT'], ['tno', 'NT'], ['nt', 'NT']]) {
  INDEX_PROVINCES.set(alias, PROVINCES.find((p) => p.abr === abr));
}

export function normaliserProvince(v) {
  return INDEX_PROVINCES.get(simplifier(v ?? '')) || null;
}

export function normaliserCodePostal(v) {
  const c = String(v ?? '').toUpperCase().replace(/[\s-]+/g, '');
  if (!/^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d$/.test(c)) return null;
  return c.slice(0, 3) + ' ' + c.slice(3);
}

/**
 * Valide une adresse canadienne. Renvoie { adresse, erreurs } ; chaque erreur nomme le champ pour que l'IA puisse le redemander.
 * Accepte aussi le champ pays : tout ce qui n'est pas le Canada est refusé.
 */
export function validerAdresse(brut, nomChamp) {
  const erreurs = [];
  const a = brut && typeof brut === 'object' ? brut : {};
  const txt = (k, max = 120) => String(a[k] ?? '').trim().slice(0, max);
  const nom = txt('nom'), ligne = txt('adresse'), appartement = txt('appartement', 30), ville = txt('ville', 80);
  if (!nom) erreurs.push(`${nomChamp}.nom : required / obligatoire`);
  if (!ligne) erreurs.push(`${nomChamp}.adresse : street number and name required / numéro et nom de rue obligatoires`);
  if (!ville) erreurs.push(`${nomChamp}.ville : required / obligatoire`);
  const prov = normaliserProvince(a.province);
  if (!prov) erreurs.push(`${nomChamp}.province : unknown Canadian province "${txt('province', 40)}" / province canadienne inconnue`);
  const cp = normaliserCodePostal(a.code_postal);
  if (!cp) erreurs.push(`${nomChamp}.code_postal : invalid Canadian postal code "${txt('code_postal', 12)}" (format A1A 1A1) / code postal canadien invalide`);
  const pays = txt('pays', 40);
  if (pays && !/^(ca|can|canada)$/i.test(simplifier(pays).replace(/ /g, ''))) erreurs.push(`${nomChamp}.pays : only Canada is supported / seul le Canada est accepté`);
  return { adresse: { nom, ligne, appartement, ville, province: prov, code_postal: cp }, erreurs };
}

/** Champs à plat attendus par l'API : dest_* ou exp_*. */
export function champsApi(prefixe, ad) {
  const o = {
    [`${prefixe}_nom`]: ad.nom,
    [`${prefixe}_ligne`]: ad.ligne,
    [`${prefixe}_ville`]: ad.ville,
    [`${prefixe}_code_postal`]: ad.code_postal,
    [`${prefixe}_province`]: ad.province.nom
  };
  if (ad.appartement) o[`${prefixe}_appartement`] = ad.appartement;
  return o;
}

function lignesAdresse(ad) {
  const rue = ad.appartement
    ? (/^[A-Za-z0-9]{1,6}$/.test(ad.appartement) ? `${ad.appartement}-${ad.ligne}` : `${ad.ligne}, ${ad.appartement}`)
    : ad.ligne;
  return [ad.nom, rue, `${ad.ville} ${ad.province.abr}  ${ad.code_postal}`, 'CANADA'].filter(Boolean);
}

/* ---------- dates ---------- */

const MOIS = {
  fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
};

export function aujourdhuiOttawa(maintenantMs = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(maintenantMs));
}

export function dateTexte(iso, langue) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return null;
  const j = parseInt(m[3], 10), mois = MOIS[langue][parseInt(m[2], 10) - 1];
  if (!mois || j < 1 || j > 31) return null;
  return langue === 'fr' ? `${j === 1 ? '1er' : j} ${mois} ${m[1]}` : `${mois} ${j}, ${m[1]}`;
}

/* ---------- composition ---------- */

export const LIMITES = { texte: 15000, objet: 150, nom: 120 };

/**
 * Valide les champs d'une lettre et prépare son contenu.
 * entree : { langue, expediteur, destinataire, objet, salutation, texte, formule_politesse, signature, date, lieu }
 */
export function composer(entree, aujourdhui) {
  const erreurs = [];
  const langue = String(entree.langue || 'fr').toLowerCase().startsWith('en') ? 'en' : 'fr';
  const exp = validerAdresse(entree.expediteur, 'expediteur');
  const dest = validerAdresse(entree.destinataire, 'destinataire');
  erreurs.push(...exp.erreurs, ...dest.erreurs);

  const texte = String(entree.texte ?? '').replace(/\r\n?/g, '\n').trim();
  if (!texte) erreurs.push('texte : the body of the letter is required / le corps de la lettre est obligatoire');
  if (texte.length > LIMITES.texte) erreurs.push(`texte : too long (${texte.length} characters, maximum ${LIMITES.texte}) / trop long`);

  const iso = entree.date ? String(entree.date) : aujourdhui;
  const dt = dateTexte(iso, langue);
  if (!dt) erreurs.push('date : expected format YYYY-MM-DD / format attendu AAAA-MM-JJ');
  if (erreurs.length) return { erreurs };

  const rempl = new Set();
  const net = (s) => { const r = nettoyerTexte(s); r.remplaces.forEach((c) => rempl.add(c)); return r.texte; };

  const lieu = String(entree.lieu ?? exp.adresse.ville).trim();
  const paragraphes = texte.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map(net);
  const L = {
    langue,
    exp: lignesAdresse(exp.adresse).filter((l) => l !== 'CANADA').map(net),
    dest: lignesAdresse(dest.adresse).map(net),
    objet: entree.objet ? net(String(entree.objet).trim().slice(0, LIMITES.objet)) : '',
    salut: net(String(entree.salutation || (langue === 'fr' ? 'Madame, Monsieur,' : 'Dear Sir or Madam,')).trim().slice(0, 120)),
    corps: paragraphes,
    politesse: entree.formule_politesse === '' ? '' : net(String(entree.formule_politesse || (langue === 'fr' ? 'Veuillez agréer, Madame, Monsieur, mes salutations distinguées.' : 'Sincerely,')).trim().slice(0, 200)),
    dateLigne: net(langue === 'fr' ? (lieu ? `${lieu}, le ${dt}` : `Le ${dt}`) : (lieu ? `${lieu}, ${dt}` : dt)),
    nom: net(String(entree.signature || exp.adresse.nom).trim().slice(0, LIMITES.nom)),
    pied: net([exp.adresse.nom, ...lignesAdresse(exp.adresse).slice(1, 3)].join('  ·  '))
  };
  return { L, adresses: { exp: exp.adresse, dest: dest.adresse }, remplaces: [...rempl], erreurs: [] };
}

/* ---------- mise en page ---------- */

const PAGE = { W: 215.9, H: 279.4, mg: 22, xDest: 112 };

function coupe(texte, fs, gras, maxMm) {
  const sortie = [];
  for (const brin of String(texte).split('\n')) {
    const mots = brin.split(/ +/).filter((m) => m.length);
    if (!mots.length) { sortie.push(''); continue; }
    let ligne = '';
    for (let mot of mots) {
      while (largeurMm(mot, fs, gras) > maxMm) {
        // mot plus long que la ligne : on le coupe
        let i = mot.length;
        while (i > 1 && largeurMm(mot.slice(0, i), fs, gras) > maxMm) i--;
        if (ligne) { sortie.push(ligne); ligne = ''; }
        sortie.push(mot.slice(0, i)); mot = mot.slice(i);
      }
      const essai = ligne ? ligne + ' ' + mot : mot;
      if (largeurMm(essai, fs, gras) <= maxMm) ligne = essai; else { sortie.push(ligne); ligne = mot; }
    }
    if (ligne) sortie.push(ligne);
  }
  return sortie;
}

function disposer(L, fs, { unePage }) {
  const { W, H, mg, xDest } = PAGE;
  const larg = W - 2 * mg, lh = fs * 0.52;
  const yPied = H - 58, bas = yPied - 8, hautMax = H - 28, yDebut = 26;
  const pages = [[]];
  let y = yDebut, tient = true;
  const limite = unePage ? bas : hautMax;
  const courante = () => pages[pages.length - 1];
  const nouvellePage = () => { pages.push([]); y = yDebut; };

  function ecrire(txt, o = {}) {
    const f = o.fs || fs;
    for (const l of coupe(txt, f, !!o.gras, o.w || larg)) {
      if (y > limite) { if (unePage) tient = false; else nouvellePage(); }
      if (l) courante().push({ t: 'text', x: o.x ?? mg, y, s: l, gras: !!o.gras, fs: f, c: '#111111', ligneCorps: !!o.corps });
      y += lh;
    }
  }

  L.exp.forEach((s, i) => ecrire(s, { gras: i === 0 }));
  y = Math.max(y + 8, 58);
  L.dest.forEach((s, i) => ecrire(s, { x: xDest, w: W - mg - xDest, gras: i === 0 }));
  y += lh * 2.2;
  if (L.objet) { ecrire((L.langue === 'fr' ? 'Objet : ' : 'Re: ') + L.objet, { gras: true }); y += lh * 0.9; }
  ecrire(L.salut); y += lh * 0.7;
  for (const p of L.corps) { ecrire(p, { corps: true }); y += lh * 0.9; }
  if (L.politesse) ecrire(L.politesse);

  // Si le dernier bloc empiète sur la zone date et signature, on reporte les dernières lignes sur une page de plus.
  if (!unePage) {
    const der = courante();
    const empiete = der.filter((e) => e.y > bas);
    if (empiete.length) {
      let aDeplacer = new Set(empiete);
      if (aDeplacer.size < 2 && der.length > 2) aDeplacer.add(der[der.indexOf(empiete[0]) - 1]);
      const gardes = der.filter((e) => !aDeplacer.has(e)), deplaces = der.filter((e) => aDeplacer.has(e));
      pages[pages.length - 1] = gardes;
      const decal = deplaces[0].y - yDebut;
      pages.push(deplaces.map((e) => ({ ...e, y: e.y - decal })));
    }
  }

  // Bloc du bas, sur la dernière page : date à gauche, ligne de signature à droite avec le nom.
  const fb = Math.min(fs, 10.5), dern = courante();
  coupe(L.dateLigne, fb, false, xDest - mg - 6).forEach((s, i) => dern.push({ t: 'text', x: mg, y: yPied + 6 + i * fb * 0.5, s, gras: false, fs: fb, c: '#111111' }));
  dern.push({ t: 'line', x1: xDest, y1: yPied + 21.5, x2: xDest + 64, y2: yPied + 21.5, c: '#888888' });
  dern.push({ t: 'text', x: xDest, y: yPied + 27, s: coupe(L.nom, fb, true, 70)[0] || '', gras: true, fs: fb, c: '#111111' });

  // Pied de page sur chaque page.
  pages.forEach((p, i) => {
    p.push({ t: 'line', x1: mg, y1: H - 20, x2: W - mg, y2: H - 20, c: '#cccccc' });
    const lignes = coupe(L.pied, 8, false, larg).slice(0, 2);
    lignes.forEach((s, k) => p.push({ t: 'text', x: W / 2, y: H - 15.5 + k * 3.6, s, gras: false, fs: 8, c: '#666666', a: 'center' }));
    if (pages.length > 1) p.push({ t: 'text', x: W / 2, y: H - 15.5 + lignes.length * 3.6, s: `${i + 1} / ${pages.length}`, gras: false, fs: 8, c: '#999999', a: 'center' });
  });
  return { pages, tient };
}

/** Choisit la plus grande taille qui tient sur une page (12,5 à 10 pt), sinon 11 pt sur plusieurs pages. */
export function mettreEnPage(L) {
  for (const fs of [12.5, 12, 11.5, 11, 10.5, 10]) {
    const r = disposer(L, fs, { unePage: true });
    if (r.tient) return finaliser(L, r.pages, fs);
  }
  return finaliser(L, disposer(L, 11, { unePage: false }).pages, 11);
}

function finaliser(L, pages, taille) {
  const octets = ecrirePdf(pages, { largeur: PAGE.W, hauteur: PAGE.H, titre: L.objet || (L.langue === 'fr' ? 'Lettre' : 'Letter') });
  return { octets, pages: pages.length, taille };
}

/** Quelques lignes pour vérifier le rendu sans renvoyer le PDF. */
export function apercuTexte(L) {
  const debut = L.corps.join('\n\n');
  return {
    expediteur: L.exp,
    destinataire: L.dest,
    objet: L.objet || null,
    date: L.dateLigne,
    signature: L.nom,
    debut_du_corps: debut.length > 240 ? debut.slice(0, 240) + '…' : debut
  };
}

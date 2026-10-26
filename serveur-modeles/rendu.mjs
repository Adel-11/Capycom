// Rendu d'un modèle : formulaire officiel rempli (ou lettre) + pièces jointes fusionnées en un seul PDF.
// Fonction pure à part le téléchargement des pièces par adresse. Rien n'est écrit sur le disque, rien n'est journalisé.

import { createRequire } from 'node:module';
import * as PDFLib from 'pdf-lib';
import {
  MOTEUR as M, DEFS, estFormulaire, langueDe, normaliserReponses, appliquerBureau, manques, optionsMoteur, piecesAttendues
} from '../src/modeles-commun.js';
import { telecharger, ErreurReseau } from './reseau.mjs';

const require = createRequire(import.meta.url);
let fondsCache = null;
const fonds = () => (fondsCache ||= require('../modeles/fonds.cjs').charger());

export const PAGES_MAX = 30;
export const TAILLE_PIECE_MAX = 6 * 1024 * 1024;
export const TAILLE_SORTIE_MAX = 6 * 1024 * 1024;

let telechargeur = telecharger;
/** Pour les tests : remplace le téléchargement réseau. */
export function remplacerTelechargeur(f) { telechargeur = f || telecharger; }

export class ErreurRendu extends Error {
  constructor(code, message, extra = {}) { super(message); this.code = code; this.extra = extra; }
}

/* ---------- reconnaissance des fichiers ---------- */

export function typeDe(octets) {
  const e = octets;
  if (e.length > 4 && e[0] === 0xFF && e[1] === 0xD8 && e[2] === 0xFF) return 'jpeg';
  if (e.length > 8 && e[0] === 0x89 && e[1] === 0x50 && e[2] === 0x4E && e[3] === 0x47) return 'png';
  const tete = Buffer.from(e.subarray(0, Math.min(e.length, 1024))).toString('latin1');
  if (tete.includes('%PDF-')) return 'pdf';
  return null;
}

export function dimensions(octets, type) {
  if (type === 'png') {
    const dv = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
    return { w: dv.getUint32(16), h: dv.getUint32(20) };
  }
  let i = 2;
  while (i + 9 < octets.length) {
    if (octets[i] !== 0xFF) { i++; continue; }
    const marqueur = octets[i + 1];
    if (marqueur >= 0xC0 && marqueur <= 0xCF && ![0xC4, 0xC8, 0xCC].includes(marqueur)) return { h: (octets[i + 5] << 8) | octets[i + 6], w: (octets[i + 7] << 8) | octets[i + 8] };
    i += 2 + ((octets[i + 2] << 8) | octets[i + 3]);
  }
  throw new ErreurRendu('signature_invalide', 'The signature image cannot be read.');
}

async function octetsDe(source, etiquette, codeEchec) {
  if (source.base64) {
    let b;
    try { b = Buffer.from(String(source.base64).replace(/^data:[^,]*,/, ''), 'base64'); } catch { b = Buffer.alloc(0); }
    if (!b.length) throw new ErreurRendu(codeEchec, `${etiquette}: invalid base64.`);
    if (b.length > TAILLE_PIECE_MAX) throw new ErreurRendu('piece_trop_grande', `${etiquette}: file larger than 6 MB.`);
    return new Uint8Array(b);
  }
  try { return await telechargeur(source.url, { maxOctets: TAILLE_PIECE_MAX }); } catch (e) {
    if (e instanceof ErreurReseau) throw new ErreurRendu(e.code === 'trop_grand' ? 'piece_trop_grande' : 'piece_telechargement', `${etiquette}: ${e.message}.`, { detail: e.code });
    throw new ErreurRendu('piece_telechargement', `${etiquette}: download failed.`);
  }
}

/* ---------- signature ---------- */

async function lireSignature(sig) {
  if (!sig || (!sig.url && !sig.base64)) return null;
  const octets = await octetsDe(sig, 'signature', 'signature_invalide');
  const type = typeDe(octets);
  if (type !== 'png' && type !== 'jpeg') throw new ErreurRendu('signature_invalide', 'The signature must be a PNG or JPEG image.');
  if (octets.length > 1024 * 1024) throw new ErreurRendu('signature_invalide', 'The signature image is larger than 1 MB.');
  const { w, h } = dimensions(octets, type);
  if (!w || !h) throw new ErreurRendu('signature_invalide', 'The signature image cannot be read.');
  return { url: `data:image/${type};base64,${Buffer.from(octets).toString('base64')}`, w, h };
}

/* ---------- fusion ---------- */

async function ajouterPiece(final, piece, octets) {
  const type = typeDe(octets);
  if (!type) throw new ErreurRendu('piece_invalide', `${piece.nom}: unsupported file (PDF, JPEG or PNG only).`, { piece: piece.piece });
  let pages;
  try {
    if (type === 'pdf') {
      const src = await PDFLib.PDFDocument.load(octets, { updateMetadata: false });
      const copies = await final.copyPages(src, src.getPageIndices());
      copies.forEach((p) => final.addPage(p));
      pages = copies.length;
      if (!pages) throw new ErreurRendu('piece_invalide', `${piece.nom}: the PDF has no page.`, { piece: piece.piece });
    } else {
      const im = type === 'jpeg' ? await final.embedJpg(octets) : await final.embedPng(octets);
      const paysage = im.width > im.height * 1.1, W = paysage ? 792 : 612, H = paysage ? 612 : 792, marge = 22;
      const k = Math.min((W - 2 * marge) / im.width, (H - 2 * marge) / im.height), w = im.width * k, h = im.height * k;
      const page = final.addPage([W, H]);
      page.drawImage(im, { x: (W - w) / 2, y: (H - h) / 2, width: w, height: h });
      pages = 1;
    }
  } catch (e) {
    if (e instanceof ErreurRendu) throw e;
    const chiffre = /encrypt/i.test(String(e && e.message));
    throw new ErreurRendu('piece_invalide', `${piece.nom}: ${chiffre ? 'the PDF is protected by a password or encrypted' : 'the file cannot be read'}. Export an unprotected copy.`, { piece: piece.piece });
  }
  return pages;
}

/* ---------- point d'entrée ---------- */

/**
 * demande : { modele, reponses, langue, bureau, signature:{url|base64}, pieces:[{piece, nom, url|base64}], sortie:'resume'|'pdf', today, lien_pied }
 * Renvoie { pages_formulaire, pieces:[{piece, nom, pages}], pages_total, octets? } ou lève ErreurRendu.
 */
export async function rendre(demande) {
  const id = demande.modele, langue = langueDe(demande.langue);
  if (!DEFS[id]) throw new ErreurRendu('modele_inconnu', 'Unknown template.');
  const { reponses } = normaliserReponses(id, demande.reponses);
  const opts = { langue, bureau: demande.bureau, today: demande.today, lienPied: demande.lien_pied !== false };
  const m = manques(id, reponses, opts);
  if (m.length) throw new ErreurRendu('reponses_incompletes', 'Some answers are missing or invalid.', { manques: m });

  const formulaire = estFormulaire(id);
  const sig = await lireSignature(demande.signature);
  if (formulaire && !sig) throw new ErreurRendu('signature_manquante', 'A signature image is required.');

  const v = id === 'credit' ? appliquerBureau(reponses, demande.bureau) : { ...reponses };
  if (!formulaire && !String(v.date_lettre || '').trim()) v.date_lettre = demande.today;
  const o = optionsMoteur(id, v, opts);
  o.sig = sig;
  const plans = M.plansDe(id, v, o);
  const [r] = plans;
  if (!formulaire && r.tient === false) throw new ErreurRendu('lettre_trop_longue', 'The text does not fit on one page. Shorten the free-text answers.');

  const attendues = piecesAttendues(id, v, opts).map((p) => p.id);
  const pieces = (demande.pieces || []).slice().sort((a, b) => attendues.indexOf(a.piece) - attendues.indexOf(b.piece));
  for (const p of pieces) if (!attendues.includes(p.piece)) throw new ErreurRendu('piece_inconnue', `Unknown attachment type "${String(p.piece).slice(0, 40)}".`, { attendues });

  const pagesForm = r.plan.pages.length;
  const sortie = { pages_formulaire: pagesForm, pieces: [], pages_total: pagesForm };
  if (!formulaire) {
    // Texte de la lettre, pour que l'utilisateur la relise avant de créer le brouillon (rien n'est conservé).
    sortie.apercu = (r.plan.pages[0].ops || []).filter((op) => op.t === 'text' && op.a !== 'center' && String(op.s || '').trim()).map((op) => String(op.s));
  }

  // Les pièces sont lues dans tous les cas : le nombre de pages et la validité en dépendent.
  const final = await PDFLib.PDFDocument.create();
  final.setTitle('Capycom');
  const avecPdf = demande.sortie === 'pdf' || demande.sortie === 'creer';
  if (avecPdf) {
    const formPdf = await M.rendrePdfLib(PDFLib, r.plan, { fonds: fonds(), sig });
    const src = await PDFLib.PDFDocument.load(formPdf, { updateMetadata: false });
    (await final.copyPages(src, src.getPageIndices())).forEach((p) => final.addPage(p));
  }
  let total = pagesForm;
  for (const [i, p] of pieces.entries()) {
    const nom = String(p.nom || `${p.piece}-${i + 1}`).slice(0, 80);
    const octets = await octetsDe(p, nom, 'piece_invalide');
    if (total > PAGES_MAX) break;
    const n = await ajouterPiece(final, { piece: p.piece, nom }, octets);
    total += n;
    sortie.pieces.push({ piece: p.piece, nom, pages: n });
  }
  sortie.pages_total = total;
  if (total > PAGES_MAX) throw new ErreurRendu('trop_de_pages', `The mail item would have ${total} pages; the maximum is ${PAGES_MAX} sheets.`, { pages: total, maximum: PAGES_MAX });
  if (avecPdf) {
    const octets = await final.save();
    if (octets.length > TAILLE_SORTIE_MAX) throw new ErreurRendu('pdf_trop_gros', 'The assembled PDF is larger than 6 MB. Send smaller or lower-resolution attachments.', { octets: octets.length });
    sortie.octets = octets;
  }
  return sortie;
}

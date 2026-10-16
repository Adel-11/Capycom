// Écriture d'un PDF simple (Helvetica, WinAnsi) sans dépendance, et lecture du nombre de pages d'un PDF fourni.

import { LARGEURS, SPECIAL } from './metriques.js';

export const MM = 72 / 25.4;

/* ---------- jeu de caractères WinAnsi ---------- */

const UNICODE_VERS_OCTET = new Map();
for (let b = 32; b < 256; b++) {
  const cp = b >= 0x80 && b <= 0x9F ? SPECIAL[b] : b;
  if (cp && LARGEURS.normal[b] > 0) UNICODE_VERS_OCTET.set(cp, b);
}

/** Rend un texte encodable : espaces fines et insécables normalisées, accents retirés en dernier recours. Renvoie aussi les caractères remplacés. */
export function nettoyerTexte(texte) {
  const remplaces = new Set();
  let out = '';
  for (const ch of String(texte ?? '').normalize('NFC')) {
    const cp = ch.codePointAt(0);
    if (cp === 0x202F || cp === 0x2009 || cp === 0x2007 || cp === 0x2002 || cp === 0x2003) { out += ' '; continue; }
    if (cp === 0x200B || cp === 0xFEFF || cp === 0x200C || cp === 0x200D || cp === 0xAD) continue;
    if (cp === 0x2011) { out += '-'; continue; }
    if (cp === 9) { out += '    '; continue; }
    if (cp < 32 || cp === 127) continue;
    if (UNICODE_VERS_OCTET.has(cp)) { out += ch; continue; }
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (base !== ch && [...base].every((c) => UNICODE_VERS_OCTET.has(c.codePointAt(0)))) { out += base; remplaces.add(ch); continue; }
    out += '?'; remplaces.add(ch);
  }
  return { texte: out, remplaces: [...remplaces] };
}

function octets(texte) {
  const b = [];
  for (const ch of texte) b.push(UNICODE_VERS_OCTET.get(ch.codePointAt(0)) ?? 63);
  return b;
}

/** Largeur d'un texte en millimètres. */
export function largeurMm(texte, tailleP, gras) {
  const t = gras ? LARGEURS.gras : LARGEURS.normal;
  let w = 0;
  for (const b of octets(texte)) w += t[b] || 0;
  return (w / 1000) * tailleP / MM;
}

function chaineLitterale(texte) {
  let s = '(';
  for (const b of octets(texte)) {
    if (b === 40 || b === 41 || b === 92) s += '\\' + String.fromCharCode(b);
    else if (b >= 32 && b < 127) s += String.fromCharCode(b);
    else s += '\\' + b.toString(8).padStart(3, '0');
  }
  return s + ')';
}

const n = (v) => (Math.round(v * 1000) / 1000).toString();
function couleur(hex) {
  const h = String(hex || '#111111').replace('#', '');
  return [0, 2, 4].map((i) => n(parseInt(h.substr(i, 2), 16) / 255)).join(' ');
}

/**
 * pages : tableau de pages ; chaque page est une liste d'éléments, en millimètres depuis le haut gauche :
 *   { t:'text', x, y, s, gras, fs, c, a:'center'|'right' }  (y = ligne de base)
 *   { t:'line', x1, y1, x2, y2, c }
 */
export function ecrirePdf(pages, { largeur, hauteur, titre }) {
  const Wp = largeur * MM, Hp = hauteur * MM;
  const objets = [];
  const ajouter = (s) => { objets.push(s); return objets.length; };
  ajouter('<< /Type /Catalog /Pages 2 0 R >>');
  ajouter(''); // Pages, rempli ensuite
  ajouter('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  ajouter('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const idsPages = [];
  for (const elements of pages) {
    let flux = '';
    for (const o of elements) {
      if (o.t === 'text') {
        const w = largeurMm(o.s, o.fs, o.gras);
        const x = o.a === 'center' ? o.x - w / 2 : o.a === 'right' ? o.x - w : o.x;
        flux += `BT ${couleur(o.c)} rg /${o.gras ? 'F2' : 'F1'} ${n(o.fs)} Tf ${n(x * MM)} ${n(Hp - o.y * MM)} Td ${chaineLitterale(o.s)} Tj ET\n`;
      } else if (o.t === 'line') {
        flux += `${couleur(o.c)} RG 0.7 w ${n(o.x1 * MM)} ${n(Hp - o.y1 * MM)} m ${n(o.x2 * MM)} ${n(Hp - o.y2 * MM)} l S\n`;
      }
    }
    const idFlux = ajouter(`<< /Length ${flux.length} >>\nstream\n${flux}endstream`);
    idsPages.push(ajouter(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(Wp)} ${n(Hp)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${idFlux} 0 R >>`));
  }
  objets[1] = `<< /Type /Pages /Kids [${idsPages.map((i) => i + ' 0 R').join(' ')}] /Count ${idsPages.length} >>`;
  const idInfo = ajouter(`<< /Producer (Capycom) /Title ${chaineLitterale(titre || 'Lettre')} >>`);

  let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets = [];
  objets.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  out += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R /Info ${idInfo} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const u8 = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) u8[i] = out.charCodeAt(i) & 255;
  return u8;
}

/* ---------- base64 ---------- */

export function versBase64(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
}

export function depuisBase64(b64) {
  const propre = String(b64).replace(/^data:[^,]*,/, '').replace(/\s+/g, '');
  const bin = atob(propre);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

/* ---------- nombre de pages d'un PDF fourni (au mieux) ---------- */

function latin1(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return s;
}

function plusGrandCount(texte) {
  let max = 0;
  const re = /\/Type\s*\/Pages\b[^>]*?\/Count\s+(\d+)|\/Count\s+(\d+)[^>]*?\/Type\s*\/Pages\b/g;
  let m;
  while ((m = re.exec(texte))) max = Math.max(max, parseInt(m[1] || m[2], 10));
  return max;
}

/** Renvoie le nombre de pages, ou null si on ne peut pas le lire (PDF chiffré, structure inhabituelle). Capycom recompte à la création. */
export async function compterPages(u8) {
  const brut = latin1(u8);
  if (brut.slice(0, 5) !== '%PDF-') return { valide: false, pages: null };
  if (/\/Encrypt\b/.test(brut)) return { valide: true, pages: null, chiffre: true };
  let max = plusGrandCount(brut);
  if (!max && typeof DecompressionStream !== 'undefined') {
    const re = /<<([^>]*?\/Type\s*\/ObjStm[^>]*?)>>\s*stream\r?\n/g;
    let m, vus = 0;
    while ((m = re.exec(brut)) && vus < 60 && !max) {
      vus++;
      if (!/FlateDecode/.test(m[1])) continue;
      const debut = m.index + m[0].length;
      const fin = brut.indexOf('endstream', debut);
      if (fin < 0) continue;
      try {
        const flux = new Blob([u8.subarray(debut, fin)]).stream().pipeThrough(new DecompressionStream('deflate'));
        const txt = latin1(new Uint8Array(await new Response(flux).arrayBuffer()));
        max = Math.max(max, plusGrandCount(txt));
      } catch { /* flux illisible : on passe au suivant */ }
    }
  }
  return { valide: true, pages: max || null };
}

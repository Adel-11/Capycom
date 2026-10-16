// Génère src/metriques.js : largeurs des polices Helvetica et Helvetica-Bold (1/1000 em) pour les octets WinAnsi 32 à 255.
// Usage : npm install --no-save pdf-lib@1.17.1 && node scripts/generer-metriques.mjs
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { writeFileSync } from 'node:fs';

const SPECIAL = { 0x80: 0x20AC, 0x82: 0x201A, 0x83: 0x0192, 0x84: 0x201E, 0x85: 0x2026, 0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02C6, 0x89: 0x2030, 0x8A: 0x0160, 0x8B: 0x2039, 0x8C: 0x0152, 0x8E: 0x017D,
  0x91: 0x2018, 0x92: 0x2019, 0x93: 0x201C, 0x94: 0x201D, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014, 0x98: 0x02DC, 0x99: 0x2122, 0x9A: 0x0161, 0x9B: 0x203A, 0x9C: 0x0153, 0x9E: 0x017E, 0x9F: 0x0178 };
const doc = await PDFDocument.create();
const polices = { normal: await doc.embedFont(StandardFonts.Helvetica), gras: await doc.embedFont(StandardFonts.HelveticaBold) };
const sortie = { normal: [], gras: [] };
for (let b = 0; b < 256; b++) {
  const cp = b < 32 ? null : (b >= 0x80 && b <= 0x9F ? SPECIAL[b] : b);
  for (const k of ['normal', 'gras']) {
    let w = 0;
    if (cp) { try { w = Math.round(polices[k].widthOfTextAtSize(String.fromCodePoint(cp), 1000)); } catch { w = 0; } }
    sortie[k].push(w);
  }
}
const ligne = (a) => '[' + a.join(',') + ']';
writeFileSync(new URL('../src/metriques.js', import.meta.url),
`// Fichier généré par scripts/generer-metriques.mjs (ne pas modifier à la main).
// Largeurs (1/1000 em) des octets WinAnsi 0 à 255 ; 0 = caractère absent de la police.
export const LARGEURS = {
  normal: ${ligne(sortie.normal)},
  gras: ${ligne(sortie.gras)}
};
export const SPECIAL = ${JSON.stringify(SPECIAL)};
`);
console.log('ok', sortie.normal[65], sortie.gras[65], sortie.normal[0xE9]);

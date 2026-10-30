// Outil de fabrication des formulaires officiels à remplir et poster (comme le RC66) à partir du PDF officiel.
//   node modeles/outils/formulaire-cli.mjs extraire <pdf>            : liste les champs du PDF (page, rectangle, étiquette voisine)
//   node modeles/outils/formulaire-cli.mjs generer <spec.json>       : écrit definitions/<id>.json et fonds/formulaires.json (entrée <id>)
// Demande qpdf, pdftotext, pdftoppm (poppler) et convert (ImageMagick) pour la fabrication (pas pour les tests). Aucune donnée de client.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PDFDocument, PDFName } from 'pdf-lib';

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.join(ici, '..');
const H = 792;

export function normaliser(pdf, sortie) {
  try { execFileSync('qpdf', ['--object-streams=disable', '--qdf', pdf, sortie], { stdio: 'pipe' }); }
  catch (e) { if (!fs.existsSync(sortie) || e.status !== 3) throw e; } // code 3 : avertissements seulement
  return sortie;
}
// Mots du PDF (pdftotext -bbox), origine en haut à gauche
function mots(pdf) {
  const xml = execFileSync('pdftotext', ['-bbox', pdf, '-'], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const pages = []; let p = -1;
  for (const l of xml.split('\n')) {
    if (/<page /.test(l)) { p++; pages[p] = []; continue; }
    const m = l.match(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*)<\/word>/);
    if (m && p >= 0) pages[p].push({ x0: +m[1], y0: +m[2], x1: +m[3], y1: +m[4], s: m[5].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"') });
  }
  return pages;
}
// Étiquette voisine d'un rectangle (origine PDF en bas) : mots de la ligne au-dessus (ou à gauche), pour que l'humain vérifie la correspondance
function etiquette(ws, r) {
  const top = H - (r.y + r.h), bas = H - r.y;
  const dessus = ws.filter(w => w.y1 <= top + 2 && w.y1 >= top - 14 && w.x0 < r.x + r.w && w.x1 > r.x - 4);
  const gauche = ws.filter(w => Math.abs((w.y0 + w.y1) / 2 - (top + bas) / 2) < 7 && w.x1 <= r.x + 2 && w.x1 > r.x - 150);
  const t = (gauche.length ? gauche : dessus).sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0).map(w => w.s).join(' ');
  return t.slice(-70);
}
// Texte lu à droite d'une case (même ligne), pour vérifier à quelle réponse elle correspond. r : [x, y, w, h] en points PDF (origine en bas)
export function texteADroite(pdf, p, r) {
  const ws = mots(pdf)[p] || [], top = H - (r[1] + r[3]), bas = H - r[1], mil = (top + bas) / 2;
  return ws.filter(w => Math.abs((w.y0 + w.y1) / 2 - mil) < 8 && w.x0 >= r[0] + r[2] - 2 && w.x0 < r[0] + r[2] + 160).sort((a, b) => a.x0 - b.x0).map(w => w.s).join(' ');
}
export async function champs(pdf) {
  const tmp = path.join(fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'frm-')), 'n.pdf');
  normaliser(pdf, tmp);
  const doc = await PDFDocument.load(fs.readFileSync(tmp), { ignoreEncryption: true });
  const W = mots(pdf), pgs = doc.getPages(), out = [];
  for (const f of doc.getForm().getFields()) {
    const type = f.constructor.name.replace('PDF', '');
    if (type === 'Button') continue;
    f.acroField.getWidgets().forEach((w, i) => {
      const r = w.getRectangle(), p = pgs.findIndex(pg => pg.ref === w.P());
      const rect = { x: Math.round(r.x * 10) / 10, y: Math.round(r.y * 10) / 10, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 };
      out.push({ nom: f.getName(), type, p, i, rect, etiquette: etiquette(W[p] || [], rect) });
    });
  }
  return { champs: out, pages: pgs.length };
}
// Fond : page du PDF sans les champs (annotations retirées), en PNG réduit
export async function fonds(pdf, dpi = 96) {
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'frm-')), n = normaliser(pdf, path.join(dir, 'n.pdf'));
  const doc = await PDFDocument.load(fs.readFileSync(n), { ignoreEncryption: true });
  // les boutons (« Clear Data », « Reset Form ») ne servent à rien sur papier : on les retire
  const heritage = (d, cle) => { let x = d; for (let k = 0; x && k < 6; k++) { const v = x.get(PDFName.of(cle)); if (v) return doc.context.lookup(v); const par = x.get(PDFName.of('Parent')); x = par ? doc.context.lookup(par) : null; } return null; };
  doc.getPages().forEach(pg => {
    const an = pg.node.Annots(); if (!an) return;
    for (let i = an.size() - 1; i >= 0; i--) {
      const a = doc.context.lookup(an.get(i)); if (!a || !a.get) continue;
      const ft = heritage(a, 'FT'), ff = heritage(a, 'Ff');
      if (ft && ft.toString() === '/Btn' && ff && ff.asNumber && (ff.asNumber() & 65536)) an.remove(i);
    }
  });
  // les champs vides gardent leur apparence (cases, cellules, signes imprimés) ; les valeurs seront écrites par le moteur
  const nu = path.join(dir, 'nu.pdf'); fs.writeFileSync(nu, await doc.save());
  execFileSync('pdftoppm', ['-r', String(dpi), '-png', nu, path.join(dir, 'p')]);
  const imgs = [];
  for (const f of fs.readdirSync(dir).filter(x => /^p-\d+\.png$/.test(x)).sort()) {
    const q = path.join(dir, 'q-' + f); execFileSync('convert', [path.join(dir, f), '-dither', 'None', '-colors', '48', '-define', 'png:compression-level=9', 'PNG8:' + q]);
    const buf = fs.readFileSync(q);
    imgs.push('data:image/png;base64,' + buf.toString('base64'));
  }
  return imgs;
}
export const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');


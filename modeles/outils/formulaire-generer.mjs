// Générateur de définitions de formulaires officiels.
//   node modeles/outils/formulaire-cli.mjs generer modeles/formulaires/specs/<id>.spec.mjs
// Une spec (export default) décrit : id, source {pdf,url,consulte}, def (libellés, champs, liens...), zones.
// Chaque zone pointe vers un champ du PDF officiel par son nom (w) ; le rectangle vient du PDF, jamais d'une saisie à la main.
// lab : texte attendu à côté du champ dans le PDF (vérifié à la génération, car les noms de champs sont parfois trompeurs).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import { champs, fonds, sha, normaliser, texteADroite } from './formulaire.mjs';

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.join(ici, '..');
export const T = (fr, en) => ({ fr, en });
const typo = (x) => typeof x === 'string' ? x.replace(/'/g, '’') : Array.isArray(x) ? x.map(typo) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, typo(v)])) : x;
const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

export const AVERT = T('Ce formulaire est rempli à partir de vos réponses. Il ne remplace pas l’avis d’un avocat ou d’un organisme officiel. Les règles et les formulaires changent : relisez le formulaire et vérifiez les délais sur le site officiel avant de signer et d’envoyer.',
  'This form is filled in from your answers. It does not replace advice from a lawyer or an official body. Rules and forms change: review the form and check the deadlines on the official website before you sign and send it.');

export const nomCourt = (n) => n.replace(/\[\d+\]/g, '');
export async function resoudre(spec, pdf) {
  const { champs: ws } = await champs(pdf), zones = [];
  for (const z of spec.zones) {
    let rect, p;
    if (z.w) {
      let c = ws.filter(x => { const n = nomCourt(x.nom); return n === z.w || n.endsWith('.' + z.w); });
      if (z.i != null) c = c.filter(x => x.i === z.i);
      if (c.length !== 1) throw new Error(spec.id + ' : champ « ' + z.w + ' » trouvé ' + c.length + ' fois dans le PDF');
      rect = c[0].rect; p = c[0].p;
      if (z.lab && !norm(c[0].etiquette).includes(norm(z.lab))) throw new Error(spec.id + ' : champ ' + z.w + ' : étiquette lue « ' + c[0].etiquette + ' », attendue « ' + z.lab + ' »');
    } else { rect = { x: z.r[0], y: z.r[1], w: z.r[2], h: z.r[3] }; p = z.p; }
    if (z.labD) { const lu = texteADroite(pdf, p, [rect.x, rect.y, rect.w, rect.h]); if (!norm(lu).startsWith(norm(z.labD))) throw new Error(spec.id + ' : case ' + z.w + ' : texte à droite « ' + lu + ' », attendu « ' + z.labD + ' »'); }
    const o = { p, r: [rect.x, rect.y, rect.w, rect.h], k: z.k || 't' };
    if (z.labD) o.labD = z.labD;
    for (const k of ['champ', 'champs', 'sep', 'pref', 'toujours', 'fmt', 'motif', 'n', 'egal', 'fs', 'texte']) if (z[k] != null) o[k] = z[k];
    if (z.i != null) o.i = z.i;
    if (z.w) o.w = z.w;
    if (z.lab) o.lab = z.lab;
    zones.push(o);
  }
  return zones;
}

export async function generer(fichierSpec) {
  const spec = (await import(pathToFileURL(path.resolve(fichierSpec)).href)).default;
  const pdf = path.join(racine, 'formulaires', 'sources', spec.source.pdf);
  const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'frm-'));
  const doc = await PDFDocument.load(fs.readFileSync(normaliser(pdf, path.join(tmp, 'n.pdf'))), { ignoreEncryption: true });
  const pg = doc.getPages(), taille = [Math.round(pg[0].getWidth() * 100) / 100, Math.round(pg[0].getHeight() * 100) / 100];
  if (taille[0] !== 612 || taille[1] !== 792) throw new Error(spec.id + ' : page non lettre US (' + taille + ')');
  const toutes = await resoudre(spec, pdf);
  const imgsTous = await fonds(pdf);
  if (imgsTous.length !== pg.length) throw new Error('nombre de fonds différent du nombre de pages');
  // pages gardées dans le PDF produit (les pages de guide du formulaire ne sont pas imprimées)
  const gardees = spec.pages || pg.map((_, i) => i), imgs = gardees.map(i => imgsTous[i]);
  const zones = toutes.map(z => { const n = gardees.indexOf(z.p); if (n < 0) throw new Error(spec.id + ' : zone sur une page non gardée (' + z.p + ')'); return { ...z, p: n, ps: z.p }; });
  const fp = path.join(racine, 'fonds', 'formulaires.json'), f = fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp, 'utf8')) : {};
  f[spec.id] = imgs; fs.writeFileSync(fp, JSON.stringify(f));
  const s = spec.def, a = s.avert || AVERT;
  const d = {
    version: 1, id: spec.id, section: s.section, titre: s.titre, description: s.description, seo: s.seo, type: 'lettre',
    usage: s.usage || s.description, avertissement: a, champs: s.champs, champsCommuns: 'commun.champsLettre',
    destinataire: s.destinataire, piecesJointes: [], liensOfficiels: (s.liens || []).map(l => ({ ...l, cle: spec.id + '_' + l.cle })),
    avertissements: [a].concat(s.avertsPlus || []),
    production: { mode: 'moteur', fonction: 'plansDe("' + spec.id + '", reponses, options)', sortie: T('Le formulaire officiel rempli, en PDF, prêt à relire, signer et poster.', 'The official form filled in, as a PDF, ready to review, sign and mail.') },
    formulaire: { fonds: 'f.' + spec.id, pages: gardees.length, pagesSource: pg.length, pagesGardees: gardees, taille, source: { pdf: 'formulaires/sources/' + spec.source.pdf, url: spec.source.url, consulte: spec.source.consulte, sha256: sha(pdf) }, zones },
  };
  if (s.destinataireDepuis) d.destinataireDepuis = s.destinataireDepuis;
  const cp = path.join(racine, 'definitions', 'commun.json'), cm = JSON.parse(fs.readFileSync(cp, 'utf8'));
  d.liensOfficiels.forEach(l => { cm.liens[l.cle] = { fr: l.fr, en: l.en, but: l.but }; });
  const sec = cm.sections.find(x => x.id === s.section);
  if (!sec) throw new Error(spec.id + ' : section inconnue ' + s.section);
  if (!sec.modeles.includes(spec.id)) sec.modeles.push(spec.id);
  fs.writeFileSync(cp, JSON.stringify(cm, null, 2) + '\n');
  const dp = path.join(racine, 'definitions.cjs'), dj = fs.readFileSync(dp, 'utf8');
  if (!dj.includes("'" + spec.id + "'")) fs.writeFileSync(dp, dj.replace(/(var ORDRE = \[[^\]]*)\]/, "$1, '" + spec.id + "']"));
  const t = typo(d), j = JSON.stringify(t);
  if (/[—–]/.test(j)) throw new Error(spec.id + ' : tiret long');
  fs.writeFileSync(path.join(racine, 'definitions', spec.id + '.json'), JSON.stringify(t, null, 2) + '\n');
  const { champs: ws } = await champs(pdf); // instantané des champs du PDF, pour les tests sans poppler ni qpdf
  fs.writeFileSync(path.join(racine, 'formulaires', 'sources', spec.id + '.champs.json'), JSON.stringify(ws.map(w => ({ nom: w.nom, p: w.p, i: w.i, rect: w.rect })), null, 1) + '\n');
  if (spec.exemple) { fs.mkdirSync(path.join(racine, 'formulaires', 'exemples'), { recursive: true }); fs.writeFileSync(path.join(racine, 'formulaires', 'exemples', spec.id + '.json'), JSON.stringify(spec.exemple, null, 2) + '\n'); }
  console.log(spec.id, ':', zones.length, 'zones,', gardees.length, 'pages, fonds', Math.round(JSON.stringify(imgs).length / 1024) + ' Ko');
}

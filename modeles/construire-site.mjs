// Construit le bloc HTML collé dans l'élément « html_moteur_modeles » de la page Bubble modeles-lettres.
//   node modeles/construire-site.mjs            -> modeles/dist/bloc-bubble.html
// Le bloc embarque le moteur, les définitions, les fonds de formulaires, l'interface et le CSS :
// aucune dépendance externe sauf jsPDF 2.5.1 (cdnjs), déjà utilisée par la page.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ici = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const lire = (...p) => fs.readFileSync(path.join(ici, ...p), 'utf8');
const { charger: chargerDefs } = require('./definitions.cjs');
const { charger: chargerFonds } = require('./fonds.cjs');

const defs = chargerDefs();
const def = { version: defs.version, commun: defs.commun, modeles: defs.modeles };
const fonds = chargerFonds();
const parties = {
  moteur: lire('moteur.cjs'),
  icones: lire('site', 'icones.js'),
  interface: lire('site', 'interface.js'),
  css: lire('site', 'styles.css'),
};
for (const [nom, texte] of Object.entries(parties)) {
  if (/<\/script/i.test(texte)) throw new Error('« </script » dans ' + nom + ' : impossible de l’embarquer dans une balise script');
}
const donnees = 'window.CapyModelesDef = ' + JSON.stringify(def).replace(/<\/(script)/gi, '<\\/$1') + ';\nwindow.CapyModelesFonds = ' + JSON.stringify(fonds) + ';';

const bloc = '<style>\n' + parties.css.trim() + '\n</style>\n' +
  '<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>\n' +
  '<script>\n' + parties.moteur + '\n' + donnees + '\n' + parties.icones + '\n' + parties.interface + '\n</script>';

const sortie = path.join(ici, 'dist', 'bloc-bubble.html');
fs.mkdirSync(path.dirname(sortie), { recursive: true });
fs.writeFileSync(sortie, bloc);
console.log('écrit', path.relative(process.cwd(), sortie), (bloc.length / 1024).toFixed(0) + ' Ko');

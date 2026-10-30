// Produit un PDF d'essai d'un formulaire avec les valeurs d'exemple (ou un fichier de valeurs), pour contrôle visuel.
//   node modeles/outils/previsualiser.mjs <id> <sortie.pdf> [valeurs.json]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url), ici = path.dirname(fileURLToPath(import.meta.url));
const M = require('../moteur.cjs'), PDFLib = require('pdf-lib');
require('../definitions.cjs').charger();
const { charger } = require('../fonds.cjs');
const [id, sortie, vf] = process.argv.slice(2);
const v = JSON.parse(fs.readFileSync(vf || path.join(ici, '..', 'formulaires', 'exemples', id + '.json'), 'utf8'));
const r = M.planLettre(id, v, { ui: 'fr', lettre: 'fr' });
const bytes = await M.rendrePdfLib(PDFLib, r.plan, { fonds: charger(), sig: null });
fs.writeFileSync(sortie, bytes);
console.log('écrit', sortie, bytes.length, 'octets');

/* Fonds des formulaires officiels (images PNG des pages vierges du RC66, du RC66SCH et des formulaires Equifax et TransUnion).
 *   const { charger } = require('./fonds.cjs');  const fonds = charger();   // { 'rc66:0': 'data:image/png;base64,...', 'sch:0': ..., 'cr.acc:0': ... }
 * Ce sont des documents publics des organismes ; ils ne contiennent aucune donnée de client. */
'use strict';
var fs = require('fs'), path = require('path');
function charger(dossier) {
  dossier = dossier || path.join(__dirname, 'fonds');
  var lire = function (n) { return JSON.parse(fs.readFileSync(path.join(dossier, n + '.json'), 'utf8')); }, f = {};
  lire('rc66').forEach(function (u, i) { f['rc66:' + i] = u; });
  lire('sch').forEach(function (u, i) { f['sch:' + i] = u; });
  var cr = lire('credit'); Object.keys(cr).forEach(function (k) { cr[k].forEach(function (u, i) { f['cr.' + k + ':' + i] = u; }); });
  return f;
}
module.exports = { charger: charger };

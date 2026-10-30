/* Chargeur des définitions des modèles (Node). Lit modeles/definitions/*.json.
 *   const { charger } = require('./definitions.cjs');
 *   const defs = charger();   // { commun, modeles: [ {id, titre, ...} ], parId: { resiliation: {...}, ... } }
 * Aucune donnée de client : seulement des libellés, des règles et des liens publics. */
'use strict';
var fs = require('fs'), path = require('path');
var ORDRE = ['resiliation', 'adresse', 'remboursement', 'contestation', 'demeure', 'rc66', 'credit', 'depot', 'reparations', 'preavis-depart', 'demission', 'demande-conge', 'reference-emploi', 'resiliation-telecom'];
function lire(dossier, nom) { return JSON.parse(fs.readFileSync(path.join(dossier, nom + '.json'), 'utf8')); }
function charger(dossier) {
  dossier = dossier || path.join(__dirname, 'definitions');
  var commun = lire(dossier, 'commun'), modeles = ORDRE.map(function (id) { return lire(dossier, id); }), parId = {};
  modeles.forEach(function (m) { parId[m.id] = m; });
  require('./moteur.cjs').enregistrer(modeles);
  return { version: commun.version, commun: commun, modeles: modeles, parId: parId };
}
module.exports = { charger: charger, ORDRE: ORDRE };

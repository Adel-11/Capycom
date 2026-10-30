/* Chargeur des définitions des modèles (Node). Lit modeles/definitions/*.json.
 *   const { charger } = require('./definitions.cjs');
 *   const defs = charger();   // { commun, modeles: [ {id, titre, ...} ], parId: { resiliation: {...}, ... } }
 * Aucune donnée de client : seulement des libellés, des règles et des liens publics. */
'use strict';
var fs = require('fs'), path = require('path');
var ORDRE = ['resiliation', 'adresse', 'remboursement', 'contestation', 'demeure', 'rc66', 'credit', 'depot', 'reparations', 'preavis-depart', 'demission', 'demande-conge', 'reference-emploi', 'resiliation-telecom', 'n9-ontario', 'form-c-nouvelle-ecosse', 'rt-00045-terre-neuve', 'rc325-changement-adresse', 'remerciements', 'felicitations', 'condoleances', 'excuses', 'lettre-amour', 'lettre-futur', 'bon-retablissement', 'adieu-demenagement', 'voeux', 'invitation', 'faire-part-naissance', 'resiliation-salle-sport', 'annulation-delai-reflexion', 'demande-formelle', 'autorisation-voyage-enfant', 'lettre-de-caractere', 'mise-en-demeure-cesser', 'contester-contravention', 'validation-dette', 'plainte-banque', 'lettre-depute', 'reponse-arc', 'acces-renseignements', 'plainte-entreprise', 'produit-defectueux', 'delai-paiement', 'lettre-motivation', 'remerciement-entrevue', 'remerciements-affaires', 'suivi-reunion', 'proposition-client', 'reponse-plainte-client', 'avis-hausse-prix'];
function lire(dossier, nom) { return JSON.parse(fs.readFileSync(path.join(dossier, nom + '.json'), 'utf8')); }
function charger(dossier) {
  dossier = dossier || path.join(__dirname, 'definitions');
  var commun = lire(dossier, 'commun'), modeles = ORDRE.map(function (id) { return lire(dossier, id); }), parId = {};
  modeles.forEach(function (m) { parId[m.id] = m; });
  require('./moteur.cjs').enregistrer(modeles);
  return { version: commun.version, commun: commun, modeles: modeles, parId: parId };
}
module.exports = { charger: charger, ORDRE: ORDRE };

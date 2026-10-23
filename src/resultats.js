// Résultats d'outils et validation minimale des arguments (partagés par tools.js et outils-modeles.js).

export function valider(schema, args, chemin = '') {
  const erreurs = [];
  if (schema.type === 'object') {
    if (!args || typeof args !== 'object' || Array.isArray(args)) return [`${chemin || 'arguments'} : object expected`];
    for (const k of schema.required || []) if (args[k] === undefined || args[k] === null || args[k] === '') erreurs.push(`${chemin}${k} : required / obligatoire`);
    for (const [k, v] of Object.entries(args)) {
      const s = schema.properties?.[k];
      if (!s) { if (schema.additionalProperties === false) erreurs.push(`${chemin}${k} : unknown field / champ inconnu`); continue; }
      erreurs.push(...valider(s, v, `${chemin}${k}.`));
    }
    return erreurs;
  }
  const nom = chemin.replace(/\.$/, '');
  if (schema.type === 'array') {
    if (!Array.isArray(args)) return [`${nom} : array expected`];
    const e = [];
    if (schema.maxItems && args.length > schema.maxItems) e.push(`${nom} : at most ${schema.maxItems} items`);
    args.forEach((x, i) => e.push(...valider(schema.items || {}, x, `${nom}[${i}].`)));
    return e;
  }
  if (schema.type === 'string' && typeof args !== 'string') erreurs.push(`${nom} : string expected`);
  if (schema.type === 'boolean' && typeof args !== 'boolean') erreurs.push(`${nom} : boolean expected`);
  if (schema.type === 'integer' && !Number.isInteger(args)) erreurs.push(`${nom} : integer expected`);
  if (schema.enum && !schema.enum.includes(args)) erreurs.push(`${nom} : one of ${schema.enum.join(', ')}`);
  if (schema.minimum !== undefined && typeof args === 'number' && args < schema.minimum) erreurs.push(`${nom} : minimum ${schema.minimum}`);
  return erreurs;
}

export function ok(objet) {
  return { content: [{ type: 'text', text: JSON.stringify(objet, null, 2) }], structuredContent: objet };
}
export function echec(objet) {
  return { content: [{ type: 'text', text: JSON.stringify(objet, null, 2) }], structuredContent: objet, isError: true };
}
export const PDF_INVALIDE = {
  statut: 'erreur', erreur: 'pdf_invalide',
  message: 'The PDF cannot be used (it is protected by a password or encrypted, or it is unreadable). Export an unprotected copy and try again.',
  message_fr: "Le PDF est inutilisable (protégé par un mot de passe, chiffré ou illisible). Exportez une copie sans protection et réessayez."
};
export function erreurChamps(erreurs) {
  return echec({
    statut: 'erreur', erreur: 'champs_invalides',
    message: 'Some fields are missing or invalid. Ask the user for the information, then call the tool again.',
    message_fr: 'Des champs sont manquants ou invalides.',
    champs: erreurs
  });
}
export function erreurApi(rep) {
  if (rep.erreur === 'cle_invalide') {
    return echec({ statut: 'erreur', erreur: 'cle_invalide', message: 'The Capycom API key linked to this connection is no longer valid (it may have been replaced). The user needs to disconnect and reconnect the Capycom connector.', message_fr: 'La clé d\'API liée à cette connexion n\'est plus valide (elle a peut-être été remplacée). Il faut déconnecter puis reconnecter le connecteur Capycom.' });
  }
  const { statut, ...reste } = rep;
  return echec({ statut: 'erreur', ...reste });
}


# Fonctionnalités de Capycom (à jour pour les articles)

Ce fichier liste ce que Capycom (capycom.ca) sait faire **aujourd'hui**, pour la routine qui écrit les articles du site. Adel le complète à chaque nouvelle fonctionnalité : une section par fonctionnalité, avec son statut.

Règles pour qui écrit à partir de ce fichier :
- N'écrire que sur une fonctionnalité au statut **En ligne**. Une fonctionnalité **À venir** peut être citée en une phrase (« bientôt »), jamais présentée comme disponible.
- Ne jamais écrire de prix précis. Le prix est calculé par l'application, avant taxes, et peut changer : renvoyer vers l'estimation affichée sur capycom.ca.
- Pas de conseil juridique, fiscal ou financier. Pour les formulaires officiels, renvoyer vers la page officielle (liens dans `modeles/definitions/<id>.json`, champ `liensOfficiels`) et reprendre les mises en garde (champ `avertissements`).
- Les faits sur chaque modèle (titre, description, mots-clés, étapes, pièces à joindre, destinataires) sont dans `modeles/definitions/<id>.json`. Le champ `seo` donne les mots-clés visés.

Dernière mise à jour : 2026-10-23

## Le service de base (En ligne)

- Écrire une lettre en ligne, ou importer un PDF, puis Capycom l'imprime, la met sous enveloppe, la timbre et la poste au Canada. Pas d'imprimante, pas de timbres, pas de bureau de poste.
- Envois au Canada seulement. Lettre simple (pas de recommandé ni de preuve de réception).
- Noir et blanc ou couleur. Enveloppe choisie selon le nombre de feuilles.
- Carnet d'adresses, recherche d'adresse, suivi du statut (payé, pris en charge, imprimé, posté) avec photo de preuve de mise à la poste.
- Commande possible sans créer de compte d'abord (le compte est demandé au paiement).
- Site et application bilingues FR et EN.
- Confidentialité : le PDF est fabriqué dans le navigateur. Le contenu des lettres ne passe par aucun service tiers et n'est pas lu.
- Pages : accueil `https://capycom.ca/`, articles `https://capycom.ca/articles`.

## Modèles de lettres (En ligne)

Page : `https://capycom.ca/modeles-lettres`. Chaque modèle se remplit avec quelques questions. La lettre se télécharge gratuitement ou se fait poster par Capycom en un clic.

| id | Modèle | Pour qui, pour quoi |
|---|---|---|
| `resiliation` | Résiliation de contrat | Mettre fin à un abonnement ou un contrat (téléphone, internet, gym, assurance...), avec date de fin et numéro de client |
| `adresse` | Changement d'adresse | Prévenir un organisme ou une entreprise d'un déménagement |
| `remboursement` | Demande de remboursement | Réclamer le remboursement d'un achat ou d'un service |
| `contestation` | Contestation de facture | Contester un montant ou des frais sur une facture |
| `demeure` | Mise en demeure | Exiger qu'une personne ou une entreprise respecte ses obligations dans un délai. Point de départ, ne remplace pas un avocat |
| `credit` | Contestation du dossier de crédit (Equifax, TransUnion) | Formulaires officiels Equifax et TransUnion remplis, adresses d'envoi, documents à joindre. Chaque bureau a son propre dossier |
| `rc66` | Allocation canadienne pour enfants (RC66 et RC66SCH) | Questionnaire guidé, formulaire RC66 prêt à signer, par exemple en arrivant au Canada avec un enfant. Capycom n'est pas l'ARC |

Idées d'articles : un article par modèle (à quoi sert la lettre, quand l'envoyer, ce qu'il faut préparer, les erreurs courantes, comment Capycom la remplit et la poste), puis des articles par situation (déménager, arriver au Canada, quitter un opérateur, litige avec un commerçant, erreur sur son dossier de crédit).

## Envoyer une lettre depuis une IA, par MCP (En ligne)

- Capycom a un serveur MCP : `https://mcp.capycom.ca/mcp`. Dans Claude (et d'autres assistants compatibles MCP), on ajoute Capycom comme connecteur, on se connecte avec une clé d'API créée dans son espace client (Informations personnelles, carte « Accès par API »).
- L'assistant rédige la lettre, vérifie les adresses, annonce le prix avant taxes, crée le brouillon et donne un lien de paiement. **L'IA ne paie jamais** : la personne vérifie et paie elle-même sur capycom.ca.
- Outils en ligne : estimer le prix, préparer la lettre (mise en page, aperçu), créer le courrier, voir son statut, lister ses derniers courriers, annuler un brouillon.
- Limite : 20 courriers par jour et par clé. Le contenu des lettres n'est ni stocké ni journalisé par le serveur. Code public : `https://github.com/Adel-11/Capycom`.
- Page dédiée : `https://capycom.ca/ia`.
- Exemples de demandes : « Rédige ma résiliation pour mon forfait internet et envoie-la », « Envoie ce PDF signé à mon propriétaire ».

## API pour les développeurs (En ligne)

- API HTTP avec clé (mêmes actions que le MCP : estimer, créer, statut, lister, annuler), idempotence pour ne pas envoyer deux fois la même lettre.
- Pour automatiser l'envoi de courrier depuis un outil (Make, n8n, un logiciel maison). Documentation : `https://capycom.ca/ia`.

## Modèles remplis par l'IA (À venir)

- Outils MCP `lister_modeles`, `decrire_modele`, `remplir_modele` : l'assistant remplit un RC66 ou une contestation de crédit en posant les questions, puis crée le courrier. Code prêt, pas encore en service. Ne pas le présenter comme disponible.

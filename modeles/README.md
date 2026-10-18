# Modèles de lettres et de formulaires (source unique)

Ce dossier est la source unique des modèles de Capycom : les définitions (champs, questions, pièces à joindre, liens officiels, mises en garde) et le code qui remplit les PDF. Il sert à deux endroits :

- la page **modeles-lettres** de capycom.ca (Bubble), qui en reçoit une copie intégrée générée par script ;
- le **serveur MCP** (Node, avec pdf-lib), pour que les IA puissent décrire un modèle et le remplir.

Le dépôt est public : aucune donnée de client ici, seulement des modèles, des positions de champs et des fonds de formulaires publics. Les cas de test utilisent des personnes et des adresses inventées.

## Contenu

| Fichier | Rôle |
| --- | --- |
| `moteur.cjs` | Module pur (aucun accès au DOM, au réseau ni au disque). À partir des réponses, il produit un **plan de dessin** neutre, vérifie les réponses et liste les pièces à joindre. Il tourne tel quel dans le navigateur et dans Node. |
| `definitions/commun.json` | Sections, destinataires (centres fiscaux, bureaux de crédit), liens officiels, champs communs des lettres. |
| `definitions/<modele>.json` | Un fichier par modèle : `resiliation`, `adresse`, `remboursement`, `contestation`, `demeure`, `rc66`, `credit`. |
| `definitions.cjs` | Chargeur Node : `charger()` renvoie `{ commun, modeles, parId }`. |
| `fonds/*.json` + `fonds.cjs` | Images des pages vierges des formulaires officiels (RC66, RC66SCH, Equifax, TransUnion). |
| `site/interface.js`, `site/styles.css` | Interface de la page modeles-lettres (questionnaire, signature, aperçu, Word, ODT, envoi). Elle ne contient plus aucune règle de modèle : elle appelle le moteur. |
| `construire-site.mjs` | Fabrique le bloc à coller dans l'élément `html_moteur_modeles` de Bubble : `dist/bloc-bubble.html` (non versionné). |
| `tests/cas.json`, `tests/golden/`, `tests/validation.json` | Cas de test et enregistrements du comportement de la page v52 (voir plus bas). |

## Utiliser le moteur (Node)

```js
import { createRequire } from 'node:module';
import * as PDFLib from 'pdf-lib';
const require = createRequire(import.meta.url);
const M = require('./modeles/moteur.cjs');
const fonds = require('./modeles/fonds.cjs').charger();
const defs = require('./modeles/definitions.cjs').charger();

const reponses = { exp_nom: 'Alex Tremblay', /* ... clés = identifiants de champs des définitions */ };
const manques = M.verifier('resiliation', reponses, { champs: defs.parId.resiliation.champs });
const [{ plan, nomFichier }] = M.plansDe('resiliation', reponses, { ui: 'fr' });
const pdf = await M.rendrePdfLib(PDFLib, plan, { fonds });   // Uint8Array
```

Points d'entrée : `plansDe(modele, reponses, options)` (un plan par PDF), `verifier(...)` (réponses manquantes par étape), `documentsDe(...)` (pièces à joindre, FR et EN), `rendrePdfLib(PDFLib, plan, { fonds, sig })` (Node ou navigateur) et `rendreJsPdf(jsPDF, plan, { fonds, sig })` (navigateur). Les options propres à chaque modèle sont décrites dans `production.options` et `optionsMoteur` des définitions.

Le plan est `{ unit, taille, pages: [{ ops }] }` avec trois sortes d'éléments : texte, ligne, image (un fond de formulaire par son identifiant, ou `sig`). L'origine est en haut à gauche, `y` est la ligne de base du texte (convention jsPDF). Le moteur reproduit la mesure du texte de jsPDF 2.5.1 (tables de largeurs Helvetica et Times, crénage), pour que les retours à la ligne soient les mêmes dans le navigateur et dans Node.

## Tests

```
npm test            # ou : node --test test/modeles.test.js
```

- **Plan identique au site** : pour 15 cas (lettres, RC66 avec et sans RC66SCH, crédit Equifax et TransUnion), le plan du moteur est comparé élément par élément à l'enregistrement des appels de dessin du code de la page v52 (`tests/golden/`).
- **Validation et pièces** : réponses manquantes par étape et pièces à joindre identiques à celles de la page v52, pour des réponses complètes, vides, à moitié remplies, en français et en anglais (`tests/validation.json`).
- **PDF pdf-lib** : chaque PDF se rouvre, a le bon nombre de pages et la taille Lettre.
- **Définitions** : cohérence entre elles et avec le moteur.

Ce qui n'est pas testé automatiquement ici : le rendu visuel (comparé à la main, voir le journal du projet Bubble) et l'adaptateur jsPDF dans un navigateur.

## Ajouter ou modifier un modèle

1. Modifier ou ajouter `definitions/<id>.json` (et `commun.json` si une section, un lien ou un destinataire change).
2. Pour une lettre libre, ajouter le texte dans `composerLettre` du moteur ; pour un formulaire officiel, ajouter le fond dans `fonds/` et les positions de champs dans le moteur.
3. Ajouter un cas dans `tests/cas.json` avec son enregistrement `tests/golden/` (voir les tests existants) et lancer `npm test`.
4. `node modeles/construire-site.mjs`, puis réimporter le bloc dans Bubble (procédure du projet Bubble, jamais de Deploy sans l'accord d'Adel).

## Limites connues

- Les définitions de `rc66` et `credit` (questions, conditions d'affichage) ont été produites à partir du rendu réel du questionnaire de la page et des règles du moteur. Les conditions (`quand`, `sauf`) couvrent les scénarios testés ; en cas de doute, `verifier()` fait foi.
- La police des PDF est Helvetica (Times pour une partie du formulaire TransUnion). Les caractères hors WinAnsi sont remplacés par `?` dans pdf-lib ; les textes sont d'abord normalisés comme sur le site (apostrophes, tirets, œ).
- Le rendu pdf-lib diffère de celui de jsPDF d'environ 0,1 % des pixels (anticrénelage), sans effet sur la mise en page.

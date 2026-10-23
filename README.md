# Capycom MCP

Serveur MCP distant de [Capycom](https://capycom.ca) : une IA (Claude, et d'autres clients MCP) prépare une lettre, crée le brouillon sur le compte de l'utilisateur et renvoie le prix avant taxes et un lien de paiement. **L'IA ne paie jamais** : l'utilisateur ouvre le lien, vérifie la lettre et les adresses, et paie lui-même sur capycom.ca. Capycom imprime et poste ensuite la lettre, au Canada seulement.

Hébergé sur Cloudflare Workers (`mcp.capycom.ca`), sans dépendance à l'exécution, sans base de données, sans journal. Le code est public pour que chacun puisse vérifier ces points.

*English: remote MCP server for Capycom, a service that prints and mails letters within Canada. The AI prepares the letter and gets a payment link; the human pays. OAuth 2.0 (PKCE S256, CIMD or DCR), stateless, no logging of letter content. MIT license.*

## Outils

| Outil | Rôle | Annotation |
|---|---|---|
| `estimer_prix` | Prix avant taxes pour un nombre de feuilles (N&B ou couleur) | lecture seule |
| `preparer_lettre` | Vérifie les adresses, met le texte en page en PDF (ou vérifie un PDF fourni), renvoie nombre de pages, aperçu et prix. Rien n'est créé | lecture seule |
| `lister_modeles` | Les modèles disponibles : lettre de résiliation, formulaire RC66 (avec RC66SCH), demande de crédit TPS/TVH ou d'impôt | lecture seule |
| `decrire_modele` | Pages officielles à lire d'abord, liste de vérification, questions, pièces à joindre, destinataire | lecture seule |
| `remplir_modele` | Vérifie les réponses et les pièces, fait le rendu complet (rien n'est créé ni conservé), renvoie ce qui manque ou le nombre de pages et le prix | lecture seule |
| `creer_courrier` | Crée le brouillon (texte, PDF fourni ou `modele`) et renvoie prix, identifiant et lien de paiement | écriture, non destructif |
| `statut_courrier` | Statut, référence et prix d'un courrier | lecture seule |
| `lister_courriers` | Les 5 derniers courriers du compte | lecture seule |
| `annuler_brouillon` | Annule un brouillon (supprime pages et PDF chez Capycom) | destructif |

Mise en page des lettres : format Lettre (8,5 x 11 po), expéditeur à gauche, destinataire à droite, date et ligne de signature en bas, pied de page, comme les modèles de lettres du site. Le texte tient sur une page quand c'est possible (police de 12,5 à 10 pt), sinon il passe sur plusieurs pages à 11 pt. Un PDF fourni (`pdf_url` en HTTPS ou `pdf_base64`, 6 Mo au plus) est envoyé tel quel.

### Modèles et formulaires officiels

Chaque modèle a aussi un **prompt MCP** (`prompts/list`, `prompts/get`) qui guide l'assistant pas à pas. Les formulaires (RC66, crédit) sont remplis sur les PDF officiels et fusionnés avec les pièces jointes (par adresse https ou en base64) en un seul PDF. `remplir_modele` ne renvoie jamais le PDF (1 à 2 Mo ne passent pas par le modèle) : `creer_courrier` avec `modele` refait le rendu et crée le brouillon, sans que le PDF transite par le Worker. Le serveur ne donne jamais d'avis juridique ou fiscal : il indique les pages officielles à lire et une liste de vérification. Les réponses (NAS, enfants, statut) ne sont ni journalisées ni stockées.

Le rendu des formulaires est trop long pour la limite de 10 ms de calcul du plan gratuit de Workers (environ 1,6 s mesuré pour RC66 + RC66SCH). Il est donc fait par un petit service Node.js séparé, `serveur-modeles/` (Docker, Coolify, Cloudflare Tunnel), protégé par un secret partagé. Voir `serveur-modeles/README.md`. Sans ce service, les lettres libres et les PDF fournis fonctionnent comme avant.

Le prix est toujours celui que calcule l'API Capycom, avant taxes. Ce serveur ne contient aucune règle de prix.

## Authentification (OAuth 2.0, sans stockage)

- `POST /mcp` sans jeton valide répond **401** avec `WWW-Authenticate: Bearer resource_metadata="…/.well-known/oauth-protected-resource"`.
- Découverte : `/.well-known/oauth-protected-resource` (RFC 9728) et `/.well-known/oauth-authorization-server` (RFC 8414).
- Clients : **CIMD** (le `client_id` est une URL qui renvoie un document JSON, vérifié à chaque autorisation) ou **DCR** (`POST /register`, le `client_id` est un bloc chiffré, rien n'est enregistré). Les adresses de retour acceptées sont limitées à une liste (Claude, et la boucle locale pour Claude Code), modifiable avec `ALLOWED_REDIRECT_URIS`.
- **PKCE S256 obligatoire** (`plain` refusé).
- **Page de consentement Capycom** (`/authorize`, FR et EN, sans script ni ressource externe) : l'utilisateur colle la clé d'API qu'il a générée dans son espace client (Informations personnelles, carte « Accès par API »). Le Worker vérifie la clé auprès de Capycom, puis la place **chiffrée** (AES-GCM-256) dans le code d'autorisation, puis dans le jeton d'accès (1 h) et le jeton de rafraîchissement (60 jours, renouvelés à chaque usage).
- **Aucun jeton dans l'URL** : seul l'en-tête `Authorization: Bearer` est lu.
- Révocation : générer une nouvelle clé (ou la révoquer) dans l'espace client coupe aussitôt l'accès de tous les jetons liés à l'ancienne clé. Changer `TOKEN_SECRET` coupe toutes les connexions.

### Ce qui est stocké et ce qui ne l'est pas

Rien n'est stocké côté Worker : ni KV, ni D1, ni R2, ni objet durable. Le « lien entre jeton OAuth et clé d'API » est le jeton lui-même (la clé y est chiffrée avec `TOKEN_SECRET`). Le seul secret est cette variable Cloudflare.

Le contenu des lettres passe par la mémoire du Worker le temps de la requête (mise en page, envoi à l'API Capycom) et n'est ni écrit ni journalisé : aucun `console.log`, et `observability` est désactivé dans `wrangler.toml`. Les tests vérifient qu'aucune sortie console n'est produite. Cloudflare, comme tout hébergeur, voit le trafic réseau (adresses, tailles, dates) : ce code ne peut pas le changer. Quand une personne passe par son IA, le contenu de la lettre passe aussi par le fournisseur de cette IA.

Limite connue : un code d'autorisation peut être rejoué pendant ses 60 secondes de vie (aucun état ne permet de l'invalider), mais il faut aussi le `code_verifier` PKCE qui reste chez le client.

## Configuration

Variables (`wrangler.toml`, aucune n'est secrète) :

| Variable | Rôle |
|---|---|
| `CAPYCOM_API_BASE` | Base de l'API : `https://capycom.ca/version-test/api/1.1/wf` (test) ou `https://capycom.ca/api/1.1/wf` (production) |
| `PUBLIC_BASE_URL` | Adresse publique du serveur, sans barre finale (`https://mcp.capycom.ca`) |
| `MOTEUR_URL` | Adresse du moteur des modèles, sans barre finale (vide = modèles remplis indisponibles) |
| `MODELES_ACTIFS` | Modèles proposés, séparés par des virgules (vide = `rc66`, `credit`, `resiliation`) |
| `ALLOWED_REDIRECT_URIS` | Adresses de retour OAuth, séparées par des virgules (`{port}` pour un port local). Vide = liste par défaut |

Secrets (jamais dans le code ni dans git) : `TOKEN_SECRET`, 32 caractères aléatoires ou plus ; `MOTEUR_SECRET` (24 caractères ou plus, même valeur que dans le service moteur).

Quand l'API vise `version-test`, le lien de paiement renvoyé est celui de test.

## Déploiement (Windows, PowerShell)

Prérequis : Node.js 20 ou plus, un compte Cloudflare où la zone `capycom.ca` est présente.

```powershell
cd Capycom
npm install
npm test
npx wrangler login
npx wrangler deploy
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
npx wrangler secret put TOKEN_SECRET
```

`wrangler deploy` crée le Worker `capycom-mcp` et, grâce à la ligne `routes` de `wrangler.toml`, rattache le domaine `mcp.capycom.ca` (enregistrement DNS et certificat créés par Cloudflare ; aucun enregistrement existant ne doit déjà porter ce nom). Le secret se colle à l'invite. Vérifications :

```powershell
curl.exe https://mcp.capycom.ca/health
curl.exe -i -X POST https://mcp.capycom.ca/mcp
curl.exe https://mcp.capycom.ca/.well-known/oauth-protected-resource
```

`/health` doit répondre `"secret_configured":true` et `"version_test":true`. Le deuxième appel doit répondre `401` avec un en-tête `WWW-Authenticate`.

### Ajouter le connecteur dans Claude

Claude, Customize, Connectors, Add custom connector : nom `Capycom`, URL `https://mcp.capycom.ca/mcp`. Cliquer Connect : la page Capycom s'ouvre, coller sa clé d'API, Autoriser.

### Passer à la production

Après le Deploy de Bubble (les agents ne le font jamais), changer `CAPYCOM_API_BASE` dans `wrangler.toml`, relancer `npx wrangler deploy`. Les bases de test et de production sont séparées : les clés de test ne marchent pas en production, il faut en générer une nouvelle dans l'espace client de production et reconnecter le connecteur.

### Publier le code sur GitHub

Le dépôt public ne contient que ce dossier. Avant de pousser, vérifier qu'il n'y a aucun secret :

```powershell
git init
git add .
git status
git grep -n "TOKEN_SECRET"
git commit -m "Capycom MCP"
```

`git status` ne doit lister ni `.dev.vars` ni `node_modules` (ignorés par `.gitignore`), et `TOKEN_SECRET` ne doit apparaître que comme nom de variable, jamais avec une valeur. Le fichier `.dev.vars.example` ne contient qu'une valeur à remplacer.

## Développement local

```powershell
npm test                      # 34 tests contre un faux serveur Capycom
npm run faux-capycom          # faux Capycom sur 127.0.0.1:8799 (terminal 1)
# terminal 2 (créer .dev.vars à partir de .dev.vars.example) :
npx wrangler dev --var CAPYCOM_API_BASE:http://127.0.0.1:8799/version-test/api/1.1/wf --var PUBLIC_BASE_URL:http://127.0.0.1:8787
npm run essai-local           # terminal 3 : parcours OAuth + outils
```

`src/metriques.js` (largeurs de la police Helvetica pour la mise en page) est généré par `npm run metriques`.

## Ce qui n'est pas testé

- Aucun appel réel à capycom.ca n'a été fait par l'auteur du code : les tests tournent contre un faux serveur calqué sur `Connecteurs/api/README.md`.
- Pas de test réel avec Claude (ajout du connecteur, découverte OAuth par Claude), ni avec un autre client MCP.
- Noms d'options de province autres que Québec et Ontario (testés par l'API) : la valeur envoyée est le nom français (Colombie-Britannique, Île-du-Prince-Édouard, etc.), à confirmer.
- Le courrier créé porte le canal `api`, pas `mcp` : l'API n'accepte pas encore de paramètre `canal`.
- PDF fourni par URL ou en base64 : le nombre de pages est lu au mieux (PDF chiffrés ou à structure inhabituelle : inconnu ici, Capycom le recompte).
- Modèles remplis : la construction de l'image Docker, le déploiement Coolify et le tunnel, la vraie création d'un RC66 depuis Claude, l'acceptation par Bubble d'un PDF de 1 à 2 Mo envoyé par le moteur, la récupération de pièces par vraies adresses https, la comparaison visuelle avec le formulaire du site.
- Charge, quota de 20 courriers par jour et par clé.

## Licence

MIT, voir `LICENSE`.

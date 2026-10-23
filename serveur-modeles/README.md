# Moteur des modèles (formulaires officiels remplis)

Petit service Node.js (pdf-lib) qui remplit les formulaires officiels (RC66 et son annexe RC66SCH, demande de crédit pour la TPS/TVH ou de crédit d'impôt), y fusionne les pièces jointes en un seul PDF, puis crée le **brouillon** chez Capycom. Le Worker Cloudflare du serveur MCP l'appelle ; il ne fait que relayer.

## Pourquoi un service à part

Le plan gratuit de Cloudflare Workers limite le calcul à 10 ms par requête. Remplir RC66 + RC66SCH (8 pages) prend environ 1,6 s de calcul. Mesures et décision : voir `Coordination/discussion-agents.md` (18 octobre 2026). Le Worker garde tout le reste (OAuth, catalogue, vérifications, appels Capycom) et ne touche jamais au PDF.

## Ce que le service garde

Rien. Pas de disque, pas de base, pas de journal (aucun `console.log`), les erreurs internes ne renvoient aucun détail. Les réponses (NAS, enfants, statut), la signature, les pièces et le PDF n'existent qu'en mémoire le temps de la requête. La clé d'API de l'utilisateur est reçue pour la création du brouillon puis oubliée.

## Protections

- Secret partagé obligatoire (en-tête `x-moteur-secret`, au moins 24 caractères) : le service refuse de démarrer sans.
- Pièces jointes par adresse : https seulement, port 443, sans identifiants, adresse IP résolue et vérifiée (réseau local, Tailscale, métadonnées cloud refusés), redirections revérifiées, 6 Mo au plus.
- Création du brouillon : seulement vers une adresse d'API autorisée (`https://capycom.ca/` par défaut, variable `API_AUTORISEES` pour ajouter la version test).
- Au plus 2 rendus en même temps (`MOTEUR_SIMULTANES`), sinon 503.

## Variables d'environnement

| Variable | Rôle | Défaut |
|---|---|---|
| `MOTEUR_SECRET` | secret partagé avec le Worker (obligatoire) | aucun |
| `PORT` | port d'écoute | 8787 |
| `MOTEUR_SIMULTANES` | rendus simultanés | 2 |
| `API_AUTORISEES` | préfixes d'adresses d'API acceptés, séparés par des virgules | `https://capycom.ca/` |

## Lancer en local

```
cd serveur-modeles && npm ci
MOTEUR_SECRET=un-secret-d-au-moins-24-caracteres node demarrer.mjs
```

## Coolify (Adel)

1. Nouvelle ressource, source **GitHub public** : `11-Capycom MCP`, branche `main`.
2. Type de construction : **Dockerfile**. Dockerfile : `/serveur-modeles/Dockerfile`. Répertoire de base : `/` (le moteur réutilise `src/` et `modeles/`).
3. Port exposé : `8787`. Aucun domaine public dans Coolify (le tunnel suffit).
4. Variable : `MOTEUR_SECRET` = une valeur aléatoire (générer avec `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`).
5. Limite de mémoire : 512 Mo. Désactiver les journaux de l'application si Coolify le propose.
6. Déployer, puis vérifier : `curl http://<adresse interne>:8787/sante` doit répondre `{"ok":true}`.

## Cloudflare Tunnel

Dans Cloudflare Zero Trust, Networks, Tunnels : un tunnel (ou celui qui existe déjà) avec un nom d'hôte public, par exemple `moteur.capycom.ca`, qui pointe vers `http://<service Coolify>:8787`. Le nom d'hôte doit être dans une zone du même compte Cloudflare que le tunnel (sinon utiliser un sous-domaine de mekkakia.com). Le tunnel ne remplace pas le secret : il reste obligatoire.

## Brancher le Worker

```
npx wrangler secret put MOTEUR_SECRET      # même valeur que dans Coolify
# dans wrangler.toml : MOTEUR_URL = "https://moteur.capycom.ca"
npx wrangler deploy
```

## Non testé ici

La construction de l'image Docker (pas de démon Docker dans l'environnement de développement), le déploiement Coolify, le tunnel, la vitesse d'envoi depuis une connexion résidentielle. Le service lui-même est testé (`npm test`), y compris dans une arborescence réduite comme celle de l'image.

// Point d'entrée du conteneur. Variables : MOTEUR_SECRET (obligatoire), PORT (8787), MOTEUR_SIMULTANES (2),
// API_AUTORISEES (préfixes d'adresses de l'API Capycom acceptés, séparés par des virgules ; défaut https://capycom.ca/).
import { creerServeur } from './serveur.mjs';

const port = parseInt(process.env.PORT || '8787', 10);
let serveur;
try {
  const apis = String(process.env.API_AUTORISEES || '').split(',').map((x) => x.trim()).filter(Boolean);
  serveur = creerServeur({ secret: process.env.MOTEUR_SECRET, simultanes: parseInt(process.env.MOTEUR_SIMULTANES || '2', 10), apisAutorisees: apis.length ? apis : undefined });
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
serveur.listen(port, '0.0.0.0', () => console.log(`moteur de modèles prêt sur le port ${port}`));

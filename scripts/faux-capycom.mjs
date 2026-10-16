// Faux serveur Capycom en HTTP, pour essayer le Worker en local (wrangler dev) sans toucher à capycom.ca.
// Usage : node scripts/faux-capycom.mjs   (écoute sur 127.0.0.1:8799)
import http from 'node:http';
import { creerMock, API, CLE_VALIDE } from '../test/mock-bubble.js';

const mock = creerMock();
const PORT = 8799;
http.createServer(async (req, res) => {
  const morceaux = [];
  for await (const m of req) morceaux.push(m);
  const prefixe = '/version-test/api/1.1/wf/';
  if (!req.url.startsWith(prefixe)) { res.writeHead(404).end(); return; }
  const r = await mock.fetch(API + '/' + req.url.slice(prefixe.length), { method: req.method, body: Buffer.concat(morceaux).toString() || undefined });
  res.writeHead(r.status, { 'content-type': 'application/json' });
  res.end(await r.text());
}).listen(PORT, '127.0.0.1', () => console.log(`Faux Capycom sur http://127.0.0.1:${PORT}/version-test/api/1.1/wf (clé valide : ${CLE_VALIDE})`));

// Serveur MCP, transport Streamable HTTP en mode sans session : une réponse JSON par requête POST.

import { OUTILS, appelerOutil } from './tools.js';
import { listerPrompts, lirePrompt } from './outils-modeles.js';

export const VERSIONS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
export const INFO = { name: 'capycom', title: 'Capycom', version: '0.2.0' };
const INSTRUCTIONS = 'Capycom prints and mails letters within Canada. These tools prepare a letter, create a draft with its price before tax and return a payment link. They can also fill in templates (official forms such as the CRA form RC66, credit report disputes, cancellation letters): lister_modeles, decrire_modele, remplir_modele, then creer_courrier. Capycom is not a government office and gives no legal advice: the user reads the official pages and decides. The account holder pays on capycom.ca; the tools never pay. Letters, answers and attachments pass through this server only to produce the PDF and to be forwarded to Capycom; they are not stored or logged.';

const rpcErreur = (id, code, message) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });
const rpcOk = (id, result) => ({ jsonrpc: '2.0', id, result });

async function traiter(msg, cfg, cle) {
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return rpcErreur(msg?.id, -32600, 'Invalid Request');
  const notification = msg.id === undefined || msg.id === null;
  switch (msg.method) {
    case 'initialize': {
      const demande = msg.params?.protocolVersion;
      const version = VERSIONS.includes(demande) ? demande : VERSIONS[0];
      return rpcOk(msg.id, { protocolVersion: version, capabilities: { tools: { listChanged: false }, prompts: { listChanged: false } }, serverInfo: INFO, instructions: INSTRUCTIONS });
    }
    case 'ping':
      return notification ? null : rpcOk(msg.id, {});
    case 'tools/list':
      return rpcOk(msg.id, { tools: OUTILS });
    case 'prompts/list':
      return rpcOk(msg.id, { prompts: listerPrompts(cfg) });
    case 'prompts/get': {
      const p = lirePrompt(msg.params?.name, msg.params?.arguments, cfg);
      if (!p) return rpcErreur(msg.id, -32602, `Unknown prompt: ${String(msg.params?.name).slice(0, 80)}`);
      return rpcOk(msg.id, p);
    }
    case 'tools/call': {
      const nom = msg.params?.name;
      const r = await appelerOutil(nom, msg.params?.arguments, cfg, cle);
      if (r === null) return rpcErreur(msg.id, -32602, `Unknown tool: ${String(nom).slice(0, 80)}`);
      return rpcOk(msg.id, r);
    }
    default:
      if (notification) return null; // notifications/initialized, notifications/cancelled...
      return rpcErreur(msg.id, -32601, 'Method not found');
  }
}

export async function repondreMcp(request, cfg, cle) {
  let corps;
  try { corps = await request.json(); } catch {
    return new Response(JSON.stringify(rpcErreur(null, -32700, 'Parse error')), { status: 400, headers: { 'content-type': 'application/json' } });
  }
  const lot = Array.isArray(corps);
  const messages = lot ? corps : [corps];
  const reponses = [];
  for (const m of messages) {
    let r;
    try { r = await traiter(m, cfg, cle); } catch {
      // Aucun détail ni contenu dans les erreurs internes.
      r = rpcErreur(m?.id, -32603, 'Internal error');
    }
    if (r) reponses.push(r);
  }
  if (!reponses.length) return new Response(null, { status: 202 });
  return new Response(JSON.stringify(lot ? reponses : reponses[0]), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}

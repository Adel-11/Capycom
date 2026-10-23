// Téléchargement d'une pièce jointe par adresse https, sans jamais atteindre le réseau interne du serveur.
// Le moteur tourne chez Adel : une adresse fournie par une IA ne doit pas pouvoir viser le LAN, Tailscale, Docker ou localhost.
// Défenses : https seulement, port 443, pas d'identifiants, adresse IP résolue puis vérifiée puis utilisée telle quelle
// (pas de seconde résolution, donc pas de rebond DNS), redirections revérifiées, taille et durée limitées.

import dns from 'node:dns/promises';
import https from 'node:https';
import net from 'node:net';

const INTERDITS = new net.BlockList();
for (const [a, bits] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4], ['240.0.0.0', 4]
]) INTERDITS.addSubnet(a, bits, 'ipv4');
for (const [a, bits] of [['::', 128], ['::1', 128], ['fc00::', 7], ['fe80::', 10], ['ff00::', 8], ['2001:db8::', 32], ['64:ff9b::', 96], ['100::', 64]]) INTERDITS.addSubnet(a, bits, 'ipv6');

export function adresseInterdite(ip) {
  const f = net.isIP(ip);
  if (!f) return true;
  if (f === 6) {
    const m = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
    if (m) return adresseInterdite(m[1]);
    return INTERDITS.check(ip, 'ipv6');
  }
  return INTERDITS.check(ip, 'ipv4');
}

export class ErreurReseau extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

async function resoudre(hote) {
  if (net.isIP(hote)) throw new ErreurReseau('adresse_refusee', 'IP addresses are not accepted, use a host name');
  let liste;
  try { liste = await dns.lookup(hote, { all: true, verbatim: true }); } catch { throw new ErreurReseau('adresse_introuvable', 'host not found'); }
  if (!liste.length || liste.some((x) => adresseInterdite(x.address))) throw new ErreurReseau('adresse_refusee', 'address not allowed');
  return liste[0];
}

function unEssai(url, ip, famille, delaiMs, maxOctets) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      host: ip, family: famille, port: 443, method: 'GET', path: url.pathname + url.search,
      servername: url.hostname, headers: { host: url.hostname, 'user-agent': 'CapycomMoteur/0.1', accept: 'application/pdf,image/jpeg,image/png,*/*;q=0.5' },
      timeout: delaiMs
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) { res.resume(); resolve({ redirection: res.headers.location }); return; }
      if (res.statusCode !== 200) { res.resume(); reject(new ErreurReseau('http_' + res.statusCode, 'the address answered HTTP ' + res.statusCode)); return; }
      const len = parseInt(res.headers['content-length'] || '0', 10);
      if (len > maxOctets) { res.destroy(); reject(new ErreurReseau('trop_grand', 'file too large')); return; }
      const morceaux = []; let total = 0;
      res.on('data', (c) => { total += c.length; if (total > maxOctets) { res.destroy(); reject(new ErreurReseau('trop_grand', 'file too large')); } else morceaux.push(c); });
      res.on('end', () => resolve({ octets: new Uint8Array(Buffer.concat(morceaux)) }));
      res.on('error', () => reject(new ErreurReseau('telechargement', 'download failed')));
    });
    req.on('timeout', () => { req.destroy(); reject(new ErreurReseau('delai', 'download timed out')); });
    req.on('error', () => reject(new ErreurReseau('telechargement', 'download failed')));
    req.end();
  });
}

/** Télécharge une adresse https (3 redirections au plus). Renvoie un Uint8Array ou lève ErreurReseau. */
export async function telecharger(adresse, { maxOctets = 6 * 1024 * 1024, delaiMs = 15000, resolveur = resoudre, essai = unEssai } = {}) {
  let courante = adresse;
  for (let saut = 0; saut <= 3; saut++) {
    let u;
    try { u = new URL(courante); } catch { throw new ErreurReseau('adresse_invalide', 'invalid address'); }
    if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443')) throw new ErreurReseau('adresse_refusee', 'only https addresses on port 443 without credentials are accepted');
    const r = await resolveur(u.hostname);
    const rep = await essai(u, r.address, r.family, delaiMs, maxOctets);
    if (rep.octets) return rep.octets;
    courante = new URL(rep.redirection, u).toString();
  }
  throw new ErreurReseau('trop_de_redirections', 'too many redirects');
}

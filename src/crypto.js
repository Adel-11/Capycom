// Chiffrement sans stockage : tout l'état OAuth voyage dans des blocs AES-GCM-256.
// Le seul secret est TOKEN_SECRET (variable Cloudflare). Rien n'est écrit nulle part.

const enc = new TextEncoder();
const dec = new TextDecoder();

export function b64uEncode(bytes) {
  let s = '';
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64uDecode(str) {
  const b = atob(String(str).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(str).length + 3) % 4));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

const keyCache = new Map();
async function cle(secret, usage) {
  if (!secret || secret.length < 32) throw new Error('TOKEN_SECRET manquant ou trop court (32 caractères au moins)');
  const id = usage + ':' + secret;
  if (!keyCache.has(id)) {
    // Une clé distincte par usage (code, jeton d'accès, client...) : un bloc d'un type ne peut pas servir pour un autre.
    const base = await crypto.subtle.importKey('raw', enc.encode(secret), 'HKDF', false, ['deriveKey']);
    const k = await crypto.subtle.deriveKey(
      { name: 'HKDF', hash: 'SHA-256', salt: enc.encode('capycom-mcp-v1'), info: enc.encode(usage) },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    keyCache.set(id, k);
  }
  return keyCache.get(id);
}

/** Chiffre un objet JSON. usage: 'code' | 'at' | 'rt' | 'client' | 'req'. */
export async function sceller(secret, usage, objet) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await cle(secret, usage), enc.encode(JSON.stringify(objet))));
  const out = new Uint8Array(12 + ct.length);
  out.set(iv); out.set(ct, 12);
  return b64uEncode(out);
}

/** Déchiffre et vérifie l'expiration (champ exp, en secondes). Renvoie null si invalide ou expiré. */
export async function ouvrir(secret, usage, jeton, maintenant = Math.floor(Date.now() / 1000)) {
  try {
    const raw = b64uDecode(jeton);
    if (raw.length < 29) return null;
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.subarray(0, 12) }, await cle(secret, usage), raw.subarray(12));
    const obj = JSON.parse(dec.decode(pt));
    if (typeof obj.exp !== 'number' || obj.exp < maintenant) return null;
    return obj;
  } catch {
    return null;
  }
}

export async function sha256b64u(texte) {
  return b64uEncode(await crypto.subtle.digest('SHA-256', enc.encode(texte)));
}

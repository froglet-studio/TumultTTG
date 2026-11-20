/* Small helpers on Web Crypto, which both Workers and Node 22 provide as globalThis.crypto. */

const enc = new TextEncoder();

const b64url = (bytes) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** n random bytes, base64url: 32 bytes for a session token, 16 for ids and states. */
export const randomToken = (n = 32) => b64url(crypto.getRandomValues(new Uint8Array(n)));

/** An account id: 'u_' and 16 random bytes. */
export const newUserId = () => 'u_' + randomToken(16);

/** Six digits, uniformly drawn (no modulo bias). */
export function sixDigits() {
  const a = new Uint32Array(1);
  do crypto.getRandomValues(a);
  while (a[0] >= 4294000000); // 4 294 000 000 is a multiple of 1 000 000
  return String(a[0] % 1000000).padStart(6, '0');
}

export async function sha256(text) {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(text)));
}

/** base64url SHA-256, for the PKCE code challenge. */
export async function challengeOf(verifier) {
  return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(verifier))));
}

export async function hmac(key, text) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, enc.encode(text)));
}

/** Compare two strings in time that does not depend on where they differ. */
export function same(a, b) {
  a = String(a);
  b = String(b);
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}

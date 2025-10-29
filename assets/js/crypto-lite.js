// Web Crypto helpers for AES-GCM decrypt of base64 ciphertext
async function deriveKeyFromPass(pass, saltB64) {
  const enc = new TextEncoder();
  const passKey = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey']);
  const salt = Uint8Array.from(atob(saltB64), c=>c.charCodeAt(0));
  return crypto.subtle.deriveKey(
    { name:'PBKDF2', salt, iterations:150000, hash:'SHA-256' },
    passKey,
    { name:'AES-GCM', length:256 },
    false,
    ['decrypt']
  );
}
async function decryptAesGcm(cipherB64, key, ivB64) {
  const ct = Uint8Array.from(atob(cipherB64), c=>c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivB64), c=>c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt({ name:'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(plain);
}


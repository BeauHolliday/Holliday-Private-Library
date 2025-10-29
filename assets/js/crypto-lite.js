// Lightweight helpers for fetch-based UX and (optional) crypto helpers
// This file contains the site-pass simple approach and a small AES helper (kept for future use).

// Derive a raw PBKDF2 output (Uint8Array) from a pass (not used in simple pass file approach)
async function derivePassRaw(pass, saltB64, iterations=150000, outLen=32){
  const enc = new TextEncoder();
  const passKey = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
  const salt = Uint8Array.from(atob(saltB64), c=>c.charCodeAt(0));
  const bits = await crypto.subtle.deriveBits({ name:'PBKDF2', salt, iterations, hash:'SHA-256' }, passKey, outLen*8);
  return new Uint8Array(bits);
}

// AES-GCM decrypt helper (expects base64 cipher with tag appended)
async function decryptAesGcm(cipherB64, key, ivB64){
  const ct = Uint8Array.from(atob(cipherB64), c=>c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivB64), c=>c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt({ name:'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(plain);
}

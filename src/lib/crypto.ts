const NONCE_SIZE = 12;

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

async function importKey(keyHex: string): Promise<CryptoKey> {
  const keyBytes = hexToBytes(keyHex);
  return crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encrypt(plaintext: string, keyHex: string): Promise<string> {
  const key = await importKey(keyHex);
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_SIZE));
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    key,
    data
  );
  
  const combined = new Uint8Array(nonce.length + ciphertext.byteLength);
  combined.set(nonce);
  combined.set(new Uint8Array(ciphertext), nonce.length);
  
  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(ciphertextBase64: string, keyHex: string): Promise<string> {
  const key = await importKey(keyHex);
  const combined = Uint8Array.from(atob(ciphertextBase64), c => c.charCodeAt(0));
  
  const nonce = combined.slice(0, NONCE_SIZE);
  const ciphertext = combined.slice(NONCE_SIZE);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: nonce },
    key,
    ciphertext
  );
  
  return new TextDecoder().decode(decrypted);
}

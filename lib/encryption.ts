// AES-GCM encryption for API keys
// Works in both Edge runtime (crypto.subtle) and Node.js

function hexToBytes(hex: string): ArrayBuffer {
  const padded = hex.slice(0, 64).padEnd(64, "0");
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(padded.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes.buffer as ArrayBuffer;
}

function getKey(rawKey: string): Promise<CryptoKey> {
  const keyBuffer = hexToBytes(rawKey);
  return crypto.subtle.importKey("raw", keyBuffer, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

function bytesToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

export async function encrypt(
  plaintext: string,
): Promise<{ encryptedKey: string; iv: string }> {
  const rawKey = process.env.ENCRYPTION_KEY ?? "0".repeat(64);
  const key = await getKey(rawKey);
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    enc.encode(plaintext),
  );
  return {
    encryptedKey: bytesToBase64(ciphertext),
    iv: bytesToBase64(ivBytes.buffer as ArrayBuffer),
  };
}

export async function decrypt(
  encryptedKey: string,
  iv: string,
): Promise<string> {
  const rawKey = process.env.ENCRYPTION_KEY ?? "0".repeat(64);
  const key = await getKey(rawKey);
  const ciphertext = base64ToBytes(encryptedKey);
  const ivBuffer = base64ToBytes(iv);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBuffer },
    key,
    ciphertext,
  );
  return new TextDecoder().decode(plaintext);
}

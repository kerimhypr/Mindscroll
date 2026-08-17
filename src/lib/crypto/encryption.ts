// Helper functions to convert ArrayBuffer to Base64 and vice versa
function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generates a new cryptographic key for AES-GCM 256 encryption.
 */
export async function generateCryptoKey(): Promise<CryptoKey> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is not available');
  }
  return await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Exports a CryptoKey to a URL-safe Base64 string.
 */
export async function exportKeyToBase64(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('raw', key);
  return bufferToBase64(exported)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, ''); // URL-safe base64
}

/**
 * Imports a CryptoKey from a URL-safe Base64 string.
 */
export async function importKeyFromBase64(base64Key: string): Promise<CryptoKey> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is not available');
  }
  // Restore padding and standard base64 characters
  let normalized = base64Key.replace(/-/g, '+').replace(/_/g, '/');
  while (normalized.length % 4) {
    normalized += '=';
  }
  const buffer = base64ToBuffer(normalized);
  return await window.crypto.subtle.importKey(
    'raw',
    buffer,
    'AES-GCM',
    true,
    ['encrypt', 'decrypt']
  );
}

interface EncryptedPayload {
  ciphertext: string;
  iv: string;
}

/**
 * Encrypts a plaintext string using AES-GCM with the provided CryptoKey.
 */
export async function encryptText(text: string, key: CryptoKey): Promise<EncryptedPayload> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is not available');
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  
  // 12 bytes IV is recommended for AES-GCM
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    data
  );

  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    iv: bufferToBase64(iv.buffer),
  };
}

/**
 * Decrypts a ciphertext using AES-GCM with the provided CryptoKey.
 */
export async function decryptText(ciphertextBase64: string, ivBase64: string, key: CryptoKey): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API is not available');
  }
  const decoder = new TextDecoder();
  const ciphertext = base64ToBuffer(ciphertextBase64);
  const iv = new Uint8Array(base64ToBuffer(ivBase64));

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    ciphertext
  );

  return decoder.decode(decryptedBuffer);
}

/**
 * crypto.js — Client-side encryption for API keys using Web Crypto API.
 *
 * Encrypts values with AES-GCM using a key derived from a device fingerprint
 * (navigator.userAgent + navigator.language + screen properties) plus a random salt.
 * This protects against casual localStorage / IndexedDB inspection.
 *
 * The salt is stored in localStorage. The fingerprint is gathered at runtime.
 * Different browsers or machines will produce different keys, so copied storage
 * won't decrypt on another device.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const SALT_KEY = 'lw_encryption_salt';
const ITERATIONS = 100000;

function getFingerprint() {
  const parts = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
  ];
  return parts.join('||');
}

function getOrCreateSalt() {
  const stored = localStorage.getItem(SALT_KEY);
  if (stored) return base64ToBytes(stored);
  const newSalt = window.crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem(SALT_KEY, bytesToBase64(newSalt));
  return newSalt;
}

async function deriveKey(salt) {
  const fingerprint = getFingerprint();
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(fingerprint),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

function bytesToBase64(bytes) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary);
}

function base64ToBytes(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encrypts a plaintext string.
 * Returns "base64(iv) : base64(ciphertext)".
 */
export async function encryptValue(plaintext) {
  if (!plaintext) return '';
  const salt = getOrCreateSalt();
  const key = await deriveKey(salt);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    enc.encode(plaintext)
  );
  return bytesToBase64(iv) + ':' + bytesToBase64(new Uint8Array(ciphertext));
}

/**
 * Decrypts a string previously encrypted with encryptValue.
 * Returns the original plaintext, or empty string on failure.
 */
export async function decryptValue(encrypted) {
  if (!encrypted) return '';
  const parts = encrypted.split(':');
  if (parts.length !== 2) return '';
  try {
    const salt = getOrCreateSalt();
    const key = await deriveKey(salt);
    const iv = base64ToBytes(parts[0]);
    const ciphertext = base64ToBytes(parts[1]);
    const decrypted = await window.crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    console.warn('[crypto] Failed to decrypt value — key may have changed');
    return '';
  }
}

/**
 * Simple encryption utilities for credential storage.
 * Uses XOR cipher with key - suitable for internal admin tool.
 *
 * For production with external users, consider a dedicated secrets manager.
 */

/**
 * Encrypts a string using XOR cipher with the provided key.
 */
export function encrypt(plaintext: string, key: string): string {
  if (!key || key.length < 32) {
    throw new Error("Encryption key must be at least 32 characters");
  }

  // Generate random bytes for IV
  const iv = new Uint8Array(16);
  crypto.getRandomValues(iv);

  // Convert to bytes
  const textBytes = new TextEncoder().encode(plaintext);
  const keyBytes = new TextEncoder().encode(key.slice(0, 32));

  // XOR encrypt
  const encrypted = new Uint8Array(textBytes.length);
  for (let i = 0; i < textBytes.length; i++) {
    encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length] ^ iv[i % iv.length];
  }

  // Combine IV + encrypted data and encode as base64
  const combined = new Uint8Array(iv.length + encrypted.length);
  combined.set(iv);
  combined.set(encrypted, iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypts a string that was encrypted with the encrypt function.
 */
export function decrypt(ciphertext: string, key: string): string {
  if (!key || key.length < 32) {
    throw new Error("Encryption key must be at least 32 characters");
  }

  // Decode base64
  const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

  // Extract IV and encrypted data
  const iv = combined.slice(0, 16);
  const encrypted = combined.slice(16);

  // Convert key to bytes
  const keyBytes = new TextEncoder().encode(key.slice(0, 32));

  // XOR decrypt
  const decrypted = new Uint8Array(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) {
    decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length] ^ iv[i % iv.length];
  }

  return new TextDecoder().decode(decrypted);
}

/**
 * Check if a value appears to be encrypted (base64 with minimum length).
 */
export function isEncrypted(value: string): boolean {
  if (!value || value.length < 24) return false;
  try {
    const decoded = atob(value);
    return decoded.length > 16;
  } catch {
    return false;
  }
}

/**
 * Mask a password for display.
 */
export function maskPassword(_password: string): string {
  return "••••••••";
}

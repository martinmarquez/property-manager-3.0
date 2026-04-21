/**
 * TOTP (Time-based One-Time Password) — otplib
 *
 * Flow:
 *   1. totp.enable()   → generate secret + QR code URI (client renders QR)
 *   2. totp.verify()   → user submits first code; we confirm the credential
 *   3. totp.validate() → on login, verify a 6-digit code against stored secret
 *
 * Backup codes:
 *   - 8 codes × 10 random alphanumeric chars
 *   - Stored as argon2id hashes in the DB
 *   - Each code is one-use; consumed codes are removed from the array
 *
 * Secret encryption:
 *   - Raw base32 secret is never stored in plaintext
 *   - Encrypted with AES-256-GCM using AUTH_ENCRYPTION_KEY
 */

import { authenticator } from 'otplib';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
import argon2 from 'argon2';

// otplib defaults (RFC 6238): 30s step, 6 digits, SHA-1
authenticator.options = { window: 1 }; // allow ±1 window for clock skew

const ALGORITHM = 'aes-256-gcm';
const BACKUP_CODE_LENGTH = 10;
const BACKUP_CODE_COUNT = 8;

// ---------------------------------------------------------------------------
// Secret encryption helpers
// ---------------------------------------------------------------------------

function deriveKey(encryptionKey: string): Buffer {
  // Derive a 32-byte key from the env var using SHA-256
  return createHash('sha256').update(encryptionKey).digest();
}

export function encryptSecret(secret: string, encryptionKey: string): string {
  const key = deriveKey(encryptionKey);
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Encode as hex: iv(24) + authTag(32) + ciphertext
  return iv.toString('hex') + authTag.toString('hex') + encrypted.toString('hex');
}

export function decryptSecret(encryptedSecret: string, encryptionKey: string): string {
  const key = deriveKey(encryptionKey);
  const iv = Buffer.from(encryptedSecret.slice(0, 24), 'hex');
  const authTag = Buffer.from(encryptedSecret.slice(24, 56), 'hex');
  const ciphertext = Buffer.from(encryptedSecret.slice(56), 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
}

// ---------------------------------------------------------------------------
// Backup codes
// ---------------------------------------------------------------------------

function randomAlphanumeric(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // unambiguous charset
  const bytes = randomBytes(length);
  return Array.from(bytes).map((b) => chars[b % chars.length]).join('');
}

/** Generate 8 raw backup codes and their argon2id hashes. */
export async function generateBackupCodes(): Promise<{
  plainCodes: string[];
  hashedCodes: string[];
}> {
  const plainCodes = Array.from({ length: BACKUP_CODE_COUNT }, () =>
    randomAlphanumeric(BACKUP_CODE_LENGTH),
  );
  const hashedCodes = await Promise.all(
    plainCodes.map((c) => argon2.hash(c, { type: argon2.argon2id, memoryCost: 4096, timeCost: 1, parallelism: 1 })),
  );
  return { plainCodes, hashedCodes };
}

/**
 * Try to consume a backup code.
 * Returns the remaining hashed codes on success, null on failure.
 */
export async function consumeBackupCode(
  inputCode: string,
  hashedCodes: string[],
): Promise<string[] | null> {
  const normalised = inputCode.replace(/\s/g, '').toUpperCase();
  for (let i = 0; i < hashedCodes.length; i++) {
    if (await argon2.verify(hashedCodes[i]!, normalised)) {
      const remaining = [...hashedCodes];
      remaining.splice(i, 1);
      return remaining;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// TOTP operations
// ---------------------------------------------------------------------------

/** Generate a new TOTP secret (base32) and the otpauth:// URI for a QR code. */
export function generateTotpSecret(
  userEmail: string,
  issuer = 'Corredor',
): { secret: string; otpauthUrl: string } {
  const secret = authenticator.generateSecret(20);
  const otpauthUrl = authenticator.keyuri(userEmail, issuer, secret);
  return { secret, otpauthUrl };
}

/** Validate a 6-digit TOTP code against the decrypted secret. */
export function validateTotpCode(code: string, secret: string): boolean {
  return authenticator.verify({ token: code, secret });
}

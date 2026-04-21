/**
 * Password hashing — Argon2id
 *
 * Parameters from the security brief:
 *   memory   = 64 MiB  (65536 KiB)
 *   time     = 3 iterations
 *   parallelism = 4 threads
 *
 * Verification is timing-safe (argon2.verify uses constant-time comparison).
 */

import argon2 from 'argon2';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,  // 64 MiB in KiB
  timeCost: 3,
  parallelism: 4,
};

/** Hash a plaintext password using Argon2id. */
export async function hashPassword(plaintext: string): Promise<string> {
  return argon2.hash(plaintext, ARGON2_OPTIONS);
}

/**
 * Verify a plaintext password against a stored Argon2id hash.
 * Returns true if the password matches.
 * Timing-safe — always takes the same time regardless of outcome.
 */
export async function verifyPassword(hash: string, plaintext: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plaintext);
  } catch {
    return false;
  }
}

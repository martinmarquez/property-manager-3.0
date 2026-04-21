/**
 * WebAuthn / Passkeys — @simplewebauthn/server
 *
 * Two ceremonies:
 *   Registration: generateOptions → verifyRegistration → persist credential
 *   Authentication: generateOptions → verifyAuthentication → update counter
 *
 * The challenge is stored in Redis keyed by userId with a short TTL (5 min).
 * Stored credentials must be retrieved from the DB by credential ID.
 */

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticatorTransportFuture,
  CredentialDeviceType,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';
import type { Redis } from 'ioredis';

const CHALLENGE_TTL = 5 * 60; // 5 minutes
const CHALLENGE_PREFIX = 'webauthn:challenge:';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoredCredential {
  credentialId: string;      // base64url
  publicKey: Uint8Array<ArrayBuffer>;
  counter: number;
  deviceType: CredentialDeviceType;
  backedUp: boolean;
  transports: AuthenticatorTransportFuture[];
}

export interface RegistrationResult {
  credentialId: string;
  publicKey: Uint8Array<ArrayBuffer>;
  counter: number;
  deviceType: CredentialDeviceType;
  backedUp: boolean;
  transports: AuthenticatorTransportFuture[];
  aaguid: string;
}

// ---------------------------------------------------------------------------
// Challenge helpers
// ---------------------------------------------------------------------------

function challengeKey(userId: string): string {
  return `${CHALLENGE_PREFIX}${userId}`;
}

async function storeChallenge(redis: Redis, userId: string, challenge: string): Promise<void> {
  await redis.setex(challengeKey(userId), CHALLENGE_TTL, challenge);
}

async function popChallenge(redis: Redis, userId: string): Promise<string | null> {
  const key = challengeKey(userId);
  const challenge = await redis.get(key);
  await redis.del(key);
  return challenge;
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export async function generateWebAuthnRegistrationOptions(
  redis: Redis,
  opts: {
    userId: string;
    userEmail: string;
    userDisplayName: string;
    rpId: string;
    rpName: string;
    existingCredentials?: StoredCredential[];
  },
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const options = await generateRegistrationOptions({
    rpName: opts.rpName,
    rpID: opts.rpId,
    userName: opts.userEmail,
    userDisplayName: opts.userDisplayName,
    userID: new TextEncoder().encode(opts.userId),
    attestationType: 'none',
    excludeCredentials: (opts.existingCredentials ?? []).map((c) => ({
      id: c.credentialId,
      transports: c.transports,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  await storeChallenge(redis, opts.userId, options.challenge);
  return options;
}

export async function verifyWebAuthnRegistration(
  redis: Redis,
  opts: {
    userId: string;
    rpId: string;
    expectedOrigin: string;
    response: RegistrationResponseJSON;
  },
): Promise<RegistrationResult> {
  const expectedChallenge = await popChallenge(redis, opts.userId);
  if (!expectedChallenge) {
    throw new Error('WebAuthn challenge not found or expired');
  }

  const verification = await verifyRegistrationResponse({
    response: opts.response,
    expectedChallenge,
    expectedRPID: opts.rpId,
    expectedOrigin: opts.expectedOrigin,
    requireUserVerification: false,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('WebAuthn registration verification failed');
  }

  const { credential, credentialDeviceType, credentialBackedUp, aaguid } =
    verification.registrationInfo;

  return {
    credentialId: credential.id,
    publicKey: credential.publicKey,
    counter: credential.counter,
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
    transports: (opts.response.response.transports ?? []) as AuthenticatorTransportFuture[],
    aaguid: aaguid ?? '00000000-0000-0000-0000-000000000000',
  };
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

export async function generateWebAuthnAuthenticationOptions(
  redis: Redis,
  opts: {
    userId: string;
    rpId: string;
    allowCredentials?: StoredCredential[];
  },
): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const options = await generateAuthenticationOptions({
    rpID: opts.rpId,
    allowCredentials: (opts.allowCredentials ?? []).map((c) => ({
      id: c.credentialId,
      transports: c.transports,
    })),
    userVerification: 'preferred',
  });

  await storeChallenge(redis, opts.userId, options.challenge);
  return options;
}

export async function verifyWebAuthnAuthentication(
  redis: Redis,
  opts: {
    userId: string;
    rpId: string;
    expectedOrigin: string;
    response: AuthenticationResponseJSON;
    credential: StoredCredential;
  },
): Promise<{ newCounter: number }> {
  const expectedChallenge = await popChallenge(redis, opts.userId);
  if (!expectedChallenge) {
    throw new Error('WebAuthn challenge not found or expired');
  }

  const verification = await verifyAuthenticationResponse({
    response: opts.response,
    expectedChallenge,
    expectedRPID: opts.rpId,
    expectedOrigin: opts.expectedOrigin,
    credential: {
      id: opts.credential.credentialId,
      publicKey: opts.credential.publicKey,
      counter: opts.credential.counter,
      transports: opts.credential.transports,
    },
    requireUserVerification: false,
  });

  if (!verification.verified) {
    throw new Error('WebAuthn authentication verification failed');
  }

  return { newCounter: verification.authenticationInfo.newCounter };
}

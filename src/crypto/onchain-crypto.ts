import * as borsh from '@coral-xyz/borsh';
import { x25519 } from '@noble/curves/ed25519';
import { chacha20poly1305 } from '@noble/ciphers/chacha';
import { blake3 } from '@noble/hashes/blake3';
import { randomBytes as nodeRandomBytes } from 'node:crypto';

export const X25519_KEY_LENGTH = 32;
export const NONCE_LENGTH = 12;

export interface ActionPayload {
  prompt: string;
  tx: Uint8Array;
}

const LAYOUT = borsh.struct<{ prompt: string; tx: Buffer }>([
  borsh.str('prompt'),
  borsh.vecU8('tx'),
]);

const getRandomBytes = (len: number): Uint8Array => {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto.getRandomValues(new Uint8Array(len));
  }
  return new Uint8Array(nodeRandomBytes(len));
};

export const encodeActionPayload = (input: ActionPayload): Uint8Array => {
  const tx = Buffer.from(input.tx);
  const buf = Buffer.alloc(
    4 + Buffer.byteLength(input.prompt, 'utf8') + 4 + tx.length,
  );
  const written = LAYOUT.encode({ prompt: input.prompt, tx }, buf);
  return new Uint8Array(buf.slice(0, written));
};

export interface EncryptForRelayerParams {
  plaintext: Uint8Array;
  relayerPublicKey: Uint8Array;
  ephemeralSecretKey?: Uint8Array;
  nonce?: Uint8Array;
}

export interface EncryptForRelayerResult {
  ciphertext: Uint8Array;
  ephemeralPublicKey: Uint8Array;
  nonce: Uint8Array;
  payload: Uint8Array;
}

export const encryptForRelayer = (
  params: EncryptForRelayerParams,
): EncryptForRelayerResult => {
  if (params.relayerPublicKey.length !== X25519_KEY_LENGTH) {
    throw new Error(
      `relayer public key must be ${X25519_KEY_LENGTH} bytes, got ${params.relayerPublicKey.length}`,
    );
  }

  const ephemeralSecretKey =
    params.ephemeralSecretKey ?? x25519.utils.randomSecretKey();
  const ephemeralPublicKey = x25519.getPublicKey(ephemeralSecretKey);

  const sharedSecret = x25519.getSharedSecret(
    ephemeralSecretKey,
    params.relayerPublicKey,
  );

  const nonce = params.nonce ?? getRandomBytes(NONCE_LENGTH);
  if (nonce.length !== NONCE_LENGTH) {
    throw new Error(`nonce must be ${NONCE_LENGTH} bytes, got ${nonce.length}`);
  }

  const ciphertext = chacha20poly1305(sharedSecret, nonce).encrypt(
    params.plaintext,
  );

  const payload = new Uint8Array(
    ephemeralPublicKey.length + nonce.length + ciphertext.length,
  );
  payload.set(ephemeralPublicKey, 0);
  payload.set(nonce, ephemeralPublicKey.length);
  payload.set(ciphertext, ephemeralPublicKey.length + nonce.length);

  return { ciphertext, ephemeralPublicKey, nonce, payload };
};

export const commitmentHashAsArray = (plaintext: Uint8Array): number[] =>
  Array.from(blake3(plaintext));

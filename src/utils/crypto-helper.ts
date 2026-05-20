import { x25519 } from '@noble/curves/ed25519';
import { chacha20poly1305 } from '@noble/ciphers/chacha';
import { randomBytes } from '@noble/ciphers/webcrypto';
import { blake3 } from '@noble/hashes/blake3';

export const X25519_KEY_LENGTH = 32;
export const NONCE_LENGTH = 12;

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

  const nonce = params.nonce ?? randomBytes(NONCE_LENGTH);
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

export const commitmentHash = (plaintext: Uint8Array): Uint8Array =>
  blake3(plaintext);

export const commitmentHashAsArray = (plaintext: Uint8Array): number[] =>
  Array.from(blake3(plaintext));

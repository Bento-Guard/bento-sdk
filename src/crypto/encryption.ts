import {
  diffieHellman,
  createPrivateKey,
  createPublicKey,
  hkdfSync,
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'node:crypto';
import { EncryptedPayload } from '../types';
import { BentoError, BentoErrorCode } from '../errors/bento-error';

export class EncryptionService {
  /**
   * Derives a shared secret using X25519 ECDH
   */
  public async deriveSharedSecret(privateKeyHex: string, publicKeyHex: string): Promise<Buffer> {
    try {
      const privateKey = createPrivateKey({
        key: Buffer.from(privateKeyHex, 'hex'),
        format: 'der',
        type: 'pkcs8',
      });
      const publicKey = createPublicKey({
        key: Buffer.from(publicKeyHex, 'hex'),
        format: 'der',
        type: 'spki',
      });

      return diffieHellman({
        privateKey,
        publicKey,
      });
    } catch (error: any) {
      throw new BentoError(
        BentoErrorCode.KEY_DERIVATION_FAILED,
        `ECDH key exchange failed: ${error.message}`
      );
    }
  }

  /**
   * Derives a high-entropy AES key from a shared secret using HKDF
   */
  public async deriveKey(sharedSecret: Buffer): Promise<Buffer> {
    try {
      return Buffer.from(
        hkdfSync(
          'sha256',
          sharedSecret,
          Buffer.alloc(0), // Salt
          Buffer.from('Bento-Secure-Context'), // Info
          32 // Key length
        )
      );
    } catch (error: any) {
      throw new BentoError(
        BentoErrorCode.KEY_DERIVATION_FAILED,
        `HKDF key derivation failed: ${error.message}`
      );
    }
  }

  /**
   * Encrypts plaintext using AES-256-GCM
   */
  public async aesEncrypt(plaintext: string, key: Buffer): Promise<EncryptedPayload> {
    try {
      const nonce = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, nonce);

      let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
      ciphertext += cipher.final('hex');

      const tag = cipher.getAuthTag().toString('hex');

      return {
        ciphertext,
        nonce: nonce.toString('hex'),
        tag,
      };
    } catch (error: any) {
      throw new BentoError(BentoErrorCode.ENCRYPTION_FAILED, `AES encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypts ciphertext using AES-256-GCM
   */
  public async aesDecrypt(payload: EncryptedPayload, key: Buffer): Promise<string> {
    try {
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(payload.nonce, 'hex'));
      decipher.setAuthTag(Buffer.from(payload.tag, 'hex'));

      let plaintext = decipher.update(payload.ciphertext, 'hex', 'utf8');
      plaintext += decipher.final('utf8');

      return plaintext;
    } catch (error: any) {
      throw new BentoError(BentoErrorCode.DECRYPTION_FAILED, `AES decryption failed: ${error.message}`);
    }
  }

  /**
   * Implements X25519 ECDH + AES-256-GCM
   */
  public async encrypt(plaintext: string, bentoPublicKey: string, agentPrivateKey: string) {
    // To be implemented in next tasks
    throw new Error('Not implemented yet');
  }
}

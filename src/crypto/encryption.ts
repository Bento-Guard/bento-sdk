import { diffieHellman, createPrivateKey, createPublicKey } from 'node:crypto';
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
   * Implements X25519 ECDH + AES-256-GCM
   */
  public async encrypt(plaintext: string, bentoPublicKey: string, agentPrivateKey: string) {
    // To be implemented in next tasks
    throw new Error('Not implemented yet');
  }
}

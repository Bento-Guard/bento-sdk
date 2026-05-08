import * as nacl from 'tweetnacl';
import { createHash } from 'node:crypto';
import bs58 from 'bs58';
import { BentoError, BentoErrorCode } from '../errors/bento-error';

export class IdentityService {
  /**
   * Hashes the payload and signs it using Ed25519 (Solana style)
   */
  public signPayload(encryptedPayload: string, base64Tx: string, privateKeyBs58: string): { signature: string; publicKey: string } {
    try {
      const privateKeyBytes = bs58.decode(privateKeyBs58);
      const keyPair = nacl.sign.keyPair.fromSecretKey(privateKeyBytes);
      
      const combinedPayload = `${encryptedPayload}.${base64Tx}`;
      const hash = createHash('sha256').update(combinedPayload).digest();
      
      const signatureBytes = nacl.sign.detached(hash, keyPair.secretKey);
      
      return {
        signature: bs58.encode(signatureBytes),
        publicKey: bs58.encode(keyPair.publicKey),
      };
    } catch (error: any) {
      throw new BentoError(
        BentoErrorCode.UNAUTHORIZED,
        `Failed to sign message: ${error.message}`
      );
    }
  }

  /**
   * Signs a general message string
   */
  public signMessage(message: string, privateKeyBs58: string): string {
    try {
      const privateKeyBytes = bs58.decode(privateKeyBs58);
      const keyPair = nacl.sign.keyPair.fromSecretKey(privateKeyBytes);
      const messageBytes = new TextEncoder().encode(message);
      
      const signatureBytes = nacl.sign.detached(messageBytes, keyPair.secretKey);
      return bs58.encode(signatureBytes);
    } catch (error: any) {
      throw new BentoError(
        BentoErrorCode.UNAUTHORIZED,
        `Failed to sign message: ${error.message}`
      );
    }
  }

  /**
   * Derives public key from private key
   */
  public getPublicKey(privateKeyBs58: string): string {
    try {
      const privateKeyBytes = bs58.decode(privateKeyBs58);
      const keyPair = nacl.sign.keyPair.fromSecretKey(privateKeyBytes);
      return bs58.encode(keyPair.publicKey);
    } catch (error: any) {
      throw new BentoError(
        BentoErrorCode.INVALID_CONFIG,
        `Failed to derive public key: ${error.message}`
      );
    }
  }
}

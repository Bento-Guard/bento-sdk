import * as nacl from 'tweetnacl';
import bs58 from 'bs58';
import { BentoError, BentoErrorCode } from '../errors/bento-error';

export class SignerService {
  /**
   * Signs a message using Ed25519 (Solana style)
   */
  public signMessage(message: string, privateKeyBs58: string): { signature: string; publicKey: string } {
    try {
      const privateKeyBytes = bs58.decode(privateKeyBs58);
      const keyPair = nacl.sign.keyPair.fromSecretKey(privateKeyBytes);
      
      const messageBytes = Buffer.from(message);
      const signatureBytes = nacl.sign.detached(messageBytes, keyPair.secretKey);
      
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
   * Verifies a signature (Utility)
   */
  public verifySignature(message: string, signatureBs58: string, publicKeyBs58: string): boolean {
    try {
      const messageBytes = Buffer.from(message);
      const signatureBytes = bs58.decode(signatureBs58);
      const publicKeyBytes = bs58.decode(publicKeyBs58);
      
      return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
    } catch {
      return false;
    }
  }
}

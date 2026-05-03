import { SignerService } from '../../src/crypto/signer';
import bs58 from 'bs58';
import * as nacl from 'tweetnacl';

describe('SignerService', () => {
  let signerService: SignerService;
  let testKeyPair: nacl.SignKeyPair;
  let privateKeyBs58: string;

  beforeEach(() => {
    signerService = new SignerService();
    testKeyPair = nacl.sign.keyPair();
    privateKeyBs58 = bs58.encode(testKeyPair.secretKey);
  });

  it('should sign a message and return a valid signature and public key', () => {
    const message = 'Test message for signing';
    const result = signerService.signMessage(message, privateKeyBs58);

    expect(result.signature).toBeDefined();
    expect(result.publicKey).toBe(bs58.encode(testKeyPair.publicKey));
    
    // Verify using nacl directly
    const isValid = nacl.sign.detached.verify(
      Buffer.from(message),
      bs58.decode(result.signature),
      testKeyPair.publicKey
    );
    expect(isValid).toBe(true);
  });

  it('should verify a valid signature correctly', () => {
    const message = 'Another message';
    const result = signerService.signMessage(message, privateKeyBs58);
    
    const isVerified = signerService.verifySignature(message, result.signature, result.publicKey);
    expect(isVerified).toBe(true);
  });

  it('should return false for an invalid signature', () => {
    const message = 'Original message';
    const result = signerService.signMessage(message, privateKeyBs58);
    
    const isVerified = signerService.verifySignature('Modified message', result.signature, result.publicKey);
    expect(isVerified).toBe(false);
  });

  it('should throw BentoError for invalid private key', () => {
    expect(() => {
      signerService.signMessage('msg', 'invalid-key');
    }).toThrow();
  });
});

import { EncryptionService } from '../../src/crypto/bsit';
import { IdentityService } from '../../src/crypto/identity';
import { generateKeyPairSync } from 'node:crypto';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';

describe('Cryptography Engine', () => {
  let bsit: EncryptionService;
  let identity: IdentityService;

  beforeAll(() => {
    bsit = new EncryptionService();
    identity = new IdentityService();
  });

  it('should encrypt and decrypt using BSIT protocol', async () => {
    // Generate dummy X25519 keys
    const agentKeyPair = generateKeyPairSync('x25519');
    const systemKeyPair = generateKeyPairSync('x25519');

    const agentPrivHex = agentKeyPair.privateKey.export({ type: 'pkcs8', format: 'der' }).toString('hex');
    const systemPubHex = systemKeyPair.publicKey.export({ type: 'spki', format: 'der' }).toString('hex');
    const systemPrivHex = systemKeyPair.privateKey.export({ type: 'pkcs8', format: 'der' }).toString('hex');
    const agentPubHex = agentKeyPair.publicKey.export({ type: 'spki', format: 'der' }).toString('hex');

    const plaintext = 'test instruction';

    const encrypted = await bsit.encrypt(plaintext, systemPubHex, agentPrivHex);
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.nonce).toBeDefined();
    expect(encrypted.tag).toBeDefined();

    const decrypted = await bsit.decrypt(encrypted, agentPubHex, systemPrivHex);
    expect(decrypted).toBe(plaintext);
  });

  it('should hash and sign payload using Ed25519', () => {
    const keyPair = nacl.sign.keyPair();
    const privateKeyBs58 = bs58.encode(keyPair.secretKey);
    const publicKeyBs58 = bs58.encode(keyPair.publicKey);

    const encryptedPayloadStr = '{"ciphertext":"abc"}';
    const base64Tx = 'raw-tx-data';

    const result = identity.signPayload(encryptedPayloadStr, base64Tx, privateKeyBs58);
    expect(result.signature).toBeDefined();
    expect(result.publicKey).toBe(publicKeyBs58);

    const isValid = identity.verifyPayloadSignature(encryptedPayloadStr, base64Tx, result.signature, publicKeyBs58);
    expect(isValid).toBe(true);
  });
});

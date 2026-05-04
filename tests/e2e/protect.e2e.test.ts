import { BentoGuardClient } from '../../src/core/client';
import { ApiClient } from '../../src/api/client';
import { BentoError } from '../../src/errors/bento-error';
import { generateKeyPairSync } from 'node:crypto';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';

// Mock the API Client so it doesn't call real servers
jest.mock('../../src/api/client');

describe('BentoGuardClient protect() E2E', () => {
  beforeEach(() => {
    // @ts-ignore
    BentoGuardClient.instance = undefined;
    jest.clearAllMocks();
  });

  it('should block high risk actions', async () => {
    const agentKeyPair = generateKeyPairSync('x25519');
    const systemKeyPair = generateKeyPairSync('x25519');
    const walletKeyPair = nacl.sign.keyPair();

    const agentPrivHex = agentKeyPair.privateKey.export({ type: 'pkcs8', format: 'der' }).toString('hex');
    const agentPubHex = agentKeyPair.publicKey.export({ type: 'spki', format: 'der' }).toString('hex');
    const walletPrivBs58 = bs58.encode(walletKeyPair.secretKey);
    const systemPubHex = systemKeyPair.publicKey.export({ type: 'spki', format: 'der' }).toString('hex');

    const config = {
      agentX25519PrivateKey: agentPrivHex,
      agentX25519PublicKey: agentPubHex,
      agentWalletPrivateKey: walletPrivBs58,
    };

    const client = BentoGuardClient.initialize(config);

    // Mock API responses
    const mockApiClient = ApiClient as jest.MockedClass<typeof ApiClient>;
    
    // Simulate API calls
    // @ts-ignore
    client.api = new mockApiClient();
    
    // @ts-ignore
    client.api.getSystemPublicKey.mockResolvedValue(systemPubHex);
    // @ts-ignore
    client.api.postTransaction.mockResolvedValue({
      success: true,
      recommendation: 'BLOCK',
      riskScore: 80,
      reasoning: 'Simulated block reasoning',
      timestamp: new Date().toISOString()
    });

    await expect(client.protect('Transfer 1000 SOL', 'base64txdata')).rejects.toThrow(BentoError);
    await expect(client.protect('Transfer 1000 SOL', 'base64txdata')).rejects.toThrow('Action blocked: Simulated block reasoning');
  });
});

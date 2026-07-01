import { BentoGuardClient } from '../../src/core/client';
import { ApiClient } from '../../src/api/client';
import { BentoError } from '../../src/errors/bento-error';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';
import { VersionedTransaction } from '@solana/web3.js';

// Mock the API Client so it doesn't call real servers
jest.mock('../../src/api/client');

describe('BentoGuardClient protect() E2E', () => {
  beforeEach(() => {
    BentoGuardClient.instance = undefined;
    jest.clearAllMocks();
    jest.spyOn(VersionedTransaction.prototype, 'sign').mockImplementation(() => {});
  });

  it('should block high risk actions', async () => {
    const walletKeyPair = nacl.sign.keyPair();
    const walletPrivBs58 = bs58.encode(walletKeyPair.secretKey);

    const config = {
      agentWalletPrivateKey: walletPrivBs58,
    };

    const client = BentoGuardClient.initialize(config);

    // Mock API responses
    const mockApiClient = ApiClient as jest.MockedClass<typeof ApiClient>;
    
    // Simulate API calls
    // @ts-ignore
    client.api = new mockApiClient();
    
    // @ts-ignore
    client.api.buildInit.mockResolvedValue({ transaction: 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAAAawAqNgpgltm0wndCpu92S6GwniBmMSjat3k9vh0RFvZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==' });
    // @ts-ignore
    client.api.initAction.mockResolvedValue({});
    // @ts-ignore
    client.api.buildAppend.mockResolvedValue({ transaction: 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAAAawAqNgpgltm0wndCpu92S6GwniBmMSjat3k9vh0RFvZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==' });
    // @ts-ignore
    client.api.appendPayload.mockResolvedValue({});
    // @ts-ignore
    client.api.buildAppendAndFinalize.mockResolvedValue({ transaction: 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAAAawAqNgpgltm0wndCpu92S6GwniBmMSjat3k9vh0RFvZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==' });
    // @ts-ignore
    // @ts-ignore
    client.api.appendAndFinalize = jest.fn().mockResolvedValue({});
    // @ts-ignore
    client.api.streamActionStatus = jest.fn().mockResolvedValue({
      final_decision: 'BLOCKED',
      final_score: 0.8,
      reason: 'Simulated block reasoning'
    });
    // @ts-ignore
    client.api.getOnchainConfig.mockResolvedValue({
      relayer_encryption_key: Array.from(nacl.box.keyPair().publicKey),
    });
    // @ts-ignore
    client.api.getRelayerInfo.mockResolvedValue({});

    const result = await client.protect('Transfer 1000 SOL');
    expect(result.recommendation).toBe('BLOCKED');
    expect(result.reasoning).toBe('Simulated block reasoning');
  });
});

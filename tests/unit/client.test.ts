import { BentoGuardClient } from '../../src/core/client';
import { BentoError } from '../../src/errors/bento-error';

describe('BentoGuardClient Singleton', () => {
  beforeEach(() => {
    // Hack to clear the singleton instance for testing
    // @ts-ignore
    BentoGuardClient.instance = undefined;
  });

  it('should throw error when getting instance before initialization', () => {
    expect(() => BentoGuardClient.getInstance()).toThrow(BentoError);
    expect(() => BentoGuardClient.getInstance()).toThrow('BentoGuardClient has not been initialized');
  });

  it('should return the same instance when initialized multiple times', () => {
    const config = {
      agentWalletPrivateKey: 'test-wallet',
    };

    const instance1 = BentoGuardClient.initialize(config);
    const instance2 = BentoGuardClient.initialize({ ...config });
    const instance3 = BentoGuardClient.getInstance();

    expect(instance1).toBe(instance2);
    expect(instance2).toBe(instance3);
  });

  it('should expose getApiClient', () => {
    const config = {
      agentWalletPrivateKey: require('@solana/web3.js').Keypair.generate().secretKey.join(','),
    };
    const client = BentoGuardClient.initialize(config);
    expect(client.getApiClient()).toBeDefined();
  });

  it('should propagate review deeplinks in protectOnChain when escalated', async () => {
    const testAgent = require('@solana/web3.js').Keypair.generate();
    const config = {
      agentWalletPrivateKey: testAgent.secretKey.join(','),
    };
    const client = BentoGuardClient.initialize(config);
    const api = client.getApiClient();

    const owner = require('@solana/web3.js').Keypair.generate();
    
    // Mock buildInitAction and confirmInitAction
    jest.spyOn(api, 'buildInitAction').mockResolvedValue({ transaction: 'mock-tx', action_pda: 'mock-pda' });
    jest.spyOn(api, 'confirmInitAction').mockResolvedValue({ success: true });
    
    // Mock buildAppendPayload and confirmAppendPayload
    jest.spyOn(api, 'buildAppendPayload').mockResolvedValue({ transaction: 'mock-tx' });
    jest.spyOn(api, 'confirmAppendPayload').mockResolvedValue({ success: true });
    
    // Mock finalize which returns the escalated verdict with links
    jest.spyOn(api, 'buildFinalizeAction').mockResolvedValue({ transaction: 'mock-tx' });
    jest.spyOn(api, 'confirmFinalizeAction').mockResolvedValue({
      success: true,
      verdict: {
        decision: 'Escalated',
        raw_score: 50000,
        reasoning: 'Manual check',
        approveUrl: 'http://approve-link',
        blockUrl: 'http://block-link',
        reviewUrl: 'http://review-link',
      }
    });

    const mockTxInstance = {
      sign: jest.fn(),
      serialize: jest.fn().mockReturnValue(Buffer.from('signed-bytes')),
    };
    const { VersionedTransaction } = require('@solana/web3.js');
    jest.spyOn(VersionedTransaction, 'deserialize').mockReturnValue(mockTxInstance);

    const result = await client.protectOnChain('Do a transaction', 'mock-tx-base64', {
      ownerKeypair: owner,
      relayerPublicKey: owner.publicKey.toBase58(),
      targetProgram: owner.publicKey.toBase58(),
      autoPollEscalation: false,
    });

    expect(result).toEqual({
      recommendation: 'ESCALATED',
      actionId: expect.any(String),
      reasoning: 'Manual check',
      approveUrl: 'http://approve-link',
      blockUrl: 'http://block-link',
      reviewUrl: 'http://review-link',
    });
  });
});

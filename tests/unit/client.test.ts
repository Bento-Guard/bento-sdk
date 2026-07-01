import { BentoGuardClient } from '../../src/core/client';
import { ApiClient } from '../../src/api/client';
import { BentoError, BentoErrorCode } from '../../src/errors/bento-error';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';
import { VersionedTransaction } from '@solana/web3.js';

jest.mock('../../src/api/client');

describe('BentoGuardClient', () => {
  let mockApiClientInstance: any;

  beforeEach(() => {
    // Hack to clear the singleton instance for testing
    // @ts-ignore
    BentoGuardClient.instance = undefined;
    jest.clearAllMocks();
    jest.spyOn(VersionedTransaction.prototype, 'sign').mockImplementation(() => {});

    mockApiClientInstance = {
      postTransaction: jest.fn(),
      getActionStatus: jest.fn(),
      getRelayerInfo: jest.fn().mockResolvedValue({}),
      getOnchainConfig: jest.fn().mockResolvedValue({
        relayer_encryption_key: Array.from(nacl.box.keyPair().publicKey),
      }),
      buildInit: jest.fn().mockResolvedValue({ transaction: 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAAAawAqNgpgltm0wndCpu92S6GwniBmMSjat3k9vh0RFvZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==' }),
      initAction: jest.fn().mockResolvedValue({}),
      buildAppend: jest.fn().mockResolvedValue({ transaction: 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAAAawAqNgpgltm0wndCpu92S6GwniBmMSjat3k9vh0RFvZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==' }),
      appendPayload: jest.fn().mockResolvedValue({}),
      buildAppendAndFinalize: jest.fn().mockResolvedValue({ transaction: 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAQAAAawAqNgpgltm0wndCpu92S6GwniBmMSjat3k9vh0RFvZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==' }),
      appendAndFinalize: jest.fn().mockResolvedValue({}),
      streamActionStatus: jest.fn().mockResolvedValue({ final_decision: 'ALLOW', final_score: 0.5, reason: 'Instruction is perfectly safe.' }),
    };
    (ApiClient as jest.Mock).mockImplementation(() => mockApiClientInstance);
  });

  it('should throw error when getting instance before initialization', () => {
    expect(() => BentoGuardClient.getInstance()).toThrow(BentoError);
    expect(() => BentoGuardClient.getInstance()).toThrow('BentoGuardClient has not been initialized');
  });

  it('should return the same instance when initialized multiple times', () => {
    const config = {
      agentWalletPrivateKey: '5PrL111111111111111111111111111111111111111111111111111111111111',
      agentAddress: '2cSiFhzwbymqr5aTiFacbidJNZ5vNK7Zdb9osbdfcKwG',
    };

    const instance1 = BentoGuardClient.initialize(config);
    const instance2 = BentoGuardClient.initialize({ ...config });
    const instance3 = BentoGuardClient.getInstance();

    expect(instance1).toBe(instance2);
    expect(instance2).toBe(instance3);
  });

  it('should successfully execute protect and return ALLOW decision', async () => {
    const walletKeyPair = nacl.sign.keyPair();
    const walletPrivBs58 = bs58.encode(walletKeyPair.secretKey);
    const config = {
      agentAddress: '2cSiFhzwbymqr5aTiFacbidJNZ5vNK7Zdb9osbdfcKwG',
      agentWalletPrivateKey: walletPrivBs58,
    };
    const client = BentoGuardClient.initialize(config);

    const result = await client.protect('send 100 sol to some address');

    expect(result.recommendation).toBe('ALLOW');
    expect(result.riskScore).toBe(0.5);
    expect(mockApiClientInstance.streamActionStatus).toHaveBeenCalled();
  });

  it('should throw BentoError when protect returns BLOCKED recommendation', async () => {
    const walletKeyPair = nacl.sign.keyPair();
    const walletPrivBs58 = bs58.encode(walletKeyPair.secretKey);
    const config = {
      agentAddress: '2cSiFhzwbymqr5aTiFacbidJNZ5vNK7Zdb9osbdfcKwG',
      agentWalletPrivateKey: walletPrivBs58,
    };
    const client = BentoGuardClient.initialize(config);

    mockApiClientInstance.streamActionStatus.mockResolvedValue({
      final_decision: 'BLOCKED',
      final_score: 0.95,
      reason: 'Malicious system command or sweep detected.',
    });

    const result = await client.protect('send 100 sol to some address');

    expect(result.recommendation).toBe('BLOCKED');
    expect(result.riskScore).toBe(0.95);
    expect(result.reasoning).toContain('Malicious');
  });

  it('should handle ESCALATED recommendation and poll for APPROVAL', async () => {
    const walletKeyPair = nacl.sign.keyPair();
    const walletPrivBs58 = bs58.encode(walletKeyPair.secretKey);
    const config = {
      agentAddress: '2cSiFhzwbymqr5aTiFacbidJNZ5vNK7Zdb9osbdfcKwG',
      agentWalletPrivateKey: walletPrivBs58,
    };
    const client = BentoGuardClient.initialize(config);

    mockApiClientInstance.streamActionStatus
      .mockResolvedValueOnce({ final_decision: 'ESCALATED', reason: 'Requires manual review.' })
      .mockResolvedValueOnce({ final_decision: 'ALLOW', reason: 'Approved by owner manually.' });

    const result = await client.protect('send 100 sol to some address', {
      autoPollEscalation: true,
      pollIntervalMs: 10,
      pollTimeoutMs: 1000,
    });

    expect(result.recommendation).toBe('ESCALATED');
    expect(result.reasoning).toContain('Requires manual review');
    expect(mockApiClientInstance.streamActionStatus).toHaveBeenCalledTimes(1);
  });
});

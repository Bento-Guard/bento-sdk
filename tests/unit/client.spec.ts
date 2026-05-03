import { BentoGuardClient } from '../../src/core/client';
import { ApiClient } from '../../src/api/client';
import { EncryptionService } from '../../src/crypto/encryption';
import { SignerService } from '../../src/crypto/signer';
import { BentoErrorCode } from '../../src/errors/bento-error';

// Mock the dependencies
jest.mock('../../src/api/client');
jest.mock('../../src/crypto/encryption');
jest.mock('../../src/crypto/signer');

describe('BentoGuardClient', () => {
  let client: BentoGuardClient;
  let mockApi: jest.Mocked<ApiClient>;
  let mockEncryption: jest.Mocked<EncryptionService>;
  let mockSigner: jest.Mocked<SignerService>;

  const config = {
    agentX25519PrivateKey: 'agent_priv_hex',
    agentX25519PublicKey: 'agent_pub_hex',
    agentWalletPrivateKey: 'wallet_priv_bs58',
    network: 'solana' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mocks
    mockApi = new ApiClient('') as jest.Mocked<ApiClient>;
    mockEncryption = new EncryptionService() as jest.Mocked<EncryptionService>;
    mockSigner = new SignerService() as jest.Mocked<SignerService>;

    // @ts-ignore - Access private constructor for testing
    client = new BentoGuardClient(config);
    // Inject mocks
    (client as any).api = mockApi;
    (client as any).encryption = mockEncryption;
    (client as any).signer = mockSigner;
  });

  it('should orchestrate the full protection flow correctly', async () => {
    // 1. Setup mock returns
    mockApi.getSystemPublicKey.mockResolvedValue('system_pub_hex');
    mockEncryption.encrypt.mockResolvedValue({
      ciphertext: 'cipher',
      nonce: 'nonce',
      tag: 'tag'
    });
    mockSigner.signMessage.mockReturnValue({
      signature: 'sig_bs58',
      publicKey: 'wallet_pub_bs58'
    });
    mockApi.postTransaction.mockResolvedValue({
      success: true,
      recommendation: 'ALLOW',
      riskScore: 0.1,
      reasoning: 'Safe',
      timestamp: new Date().toISOString()
    });

    // 2. Execute
    const result = await client.protect('Transfer 1 SOL', 'raw_tx_base64');

    // 3. Verify orchestrations
    expect(mockApi.getSystemPublicKey).toHaveBeenCalled();
    expect(mockEncryption.encrypt).toHaveBeenCalledWith(
      'Transfer 1 SOL',
      'system_pub_hex',
      config.agentX25519PrivateKey
    );
    expect(mockSigner.signMessage).toHaveBeenCalled();
    expect(mockApi.postTransaction).toHaveBeenCalledWith(expect.objectContaining({
      agent_id: config.agentX25519PublicKey,
      wallet_address: 'wallet_pub_bs58',
      signature: 'sig_bs58',
      base64_tx: 'raw_tx_base64'
    }));
    expect(result.recommendation).toBe('ALLOW');
  });

  it('should throw HIGH_RISK_DETECTED if backend blocks', async () => {
    mockApi.getSystemPublicKey.mockResolvedValue('system_pub_hex');
    mockEncryption.encrypt.mockResolvedValue({ ciphertext: 'c', nonce: 'n', tag: 't' });
    mockSigner.signMessage.mockReturnValue({ signature: 's', publicKey: 'p' });
    
    mockApi.postTransaction.mockResolvedValue({
      success: true,
      recommendation: 'BLOCK',
      riskScore: 0.9,
      reasoning: 'High risk detected',
      timestamp: new Date().toISOString()
    });

    await expect(client.protect('Danger', 'tx')).rejects.toThrow(
      expect.objectContaining({ code: BentoErrorCode.HIGH_RISK_DETECTED })
    );
  });
});

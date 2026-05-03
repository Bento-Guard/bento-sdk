import { protect, BentoClient } from '../../src/index';
import axios from 'axios';

jest.mock('axios');
jest.mock('../../src/crypto/encryption');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Integration: protect() flow', () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (mockedAxios.create as jest.Mock).mockReturnValue(mockAxiosInstance);

    BentoClient.initialize({
      backendUrl: 'http://mock-api',
      agentX25519PrivateKey: '4883907722744883907722744883907722744883907722744883907722744883',
      agentX25519PublicKey: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    });
  });

  it('should return ALLOW when backend approves', async () => {
    // Mock Public Key Fetch
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { success: true, data: { publicKey: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' } }
    });

    // Mock Transaction Submit
    mockAxiosInstance.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          recommendation: 'ALLOW',
          riskScore: 5,
          reasoning: 'Transaction looks safe',
          timestamp: new Date().toISOString()
        }
      }
    });

    const result = await protect("Transfer 1 SOL", "raw_tx_data");
    expect(result.recommendation).toBe('ALLOW');
    expect(result.riskScore).toBe(5);
  });

  it('should throw BentoError when backend blocks', async () => {
    // Mock Public Key Fetch
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { success: true, data: { publicKey: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' } }
    });

    // Mock Transaction Submit (BLOCK)
    mockAxiosInstance.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          recommendation: 'BLOCK',
          riskScore: 95,
          reasoning: 'Suspicious destination address',
          timestamp: new Date().toISOString()
        }
      }
    });

    await expect(protect("Drain wallet", "raw_tx_data")).rejects.toThrow('Action blocked by Bento Guard');
  });
});

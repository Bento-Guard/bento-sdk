import { BentoProtectOptions, BentoGuardConfig } from '../types';
import { EncryptionService } from '../crypto/encryption';
import { ApiClient } from '../api/client';
import { BentoError, BentoErrorCode } from '../errors/bento-error';

export class BentoGuardClient {
  private static instance: BentoGuardClient;
  private encryption: EncryptionService;
  private api: ApiClient;
  private config?: BentoGuardConfig;

  private constructor(config?: BentoGuardConfig) {
    this.config = config || this.loadConfigFromEnv();
    this.encryption = new EncryptionService();
    this.api = new ApiClient(this.config.backendUrl);
  }

  /**
   * Initializes the SDK with configuration.
   * If not called, it will attempt to load from environment variables.
   */
  public static initialize(config: BentoGuardConfig): BentoGuardClient {
    BentoGuardClient.instance = new BentoGuardClient(config);
    return BentoGuardClient.instance;
  }

  public static getInstance(): BentoGuardClient {
    if (!BentoGuardClient.instance) {
      BentoGuardClient.instance = new BentoGuardClient();
    }
    return BentoGuardClient.instance;
  }

  private loadConfigFromEnv(): BentoGuardConfig {
    const config: BentoGuardConfig = {
      backendUrl: process.env.BENTO_BACKEND_URL || 'http://localhost:3000',
      agentX25519PrivateKey: process.env.AGENT_X25519_PRIVATE_KEY || '',
      agentX25519PublicKey: process.env.AGENT_X25519_PUBLIC_KEY || '',
      agentPrivateWalletKey: process.env.AGENT_PRIVATE_WALLET_KEY,
    };

    if (!config.agentX25519PrivateKey || !config.agentX25519PublicKey) {
      console.warn('BentoGuard: Missing required credentials in environment variables.');
    }

    return config;
  }

  /**
   * Orchestrates the protection flow
   */
  public async protect(
    instruction: string,
    rawTransaction: string,
    options?: BentoProtectOptions
  ) {
    if (!this.config?.agentX25519PrivateKey) {
      throw new BentoError(BentoErrorCode.INVALID_CONFIG, 'Agent private key not configured');
    }

    try {
      // 1. Fetch System Key
      const systemPublicKey = await this.api.getSystemPublicKey();

      // 2. Encrypt instruction
      const encryptedPayload = await this.encryption.encrypt(
        instruction,
        systemPublicKey,
        this.config.agentX25519PrivateKey
      );

      const result = await this.api.postTransaction({
        agent_id: this.config.agentX25519PublicKey,
        encrypted_payload: JSON.stringify(encryptedPayload),
        base64_tx: rawTransaction,
        network: this.config.network || 'solana',
      });

      // Mechanical check for "BLOCK"
      if (result.recommendation === 'BLOCK') {
        throw new BentoError(BentoErrorCode.HIGH_RISK_DETECTED, `Action blocked: ${result.reasoning}`, result);
      }

      return result;
    } catch (error: any) {
      if (error instanceof BentoError) throw error;
      throw new BentoError(BentoErrorCode.NETWORK_ERROR, error.message || 'Unknown network error');
    }
  }
}

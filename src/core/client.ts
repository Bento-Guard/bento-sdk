import { BentoProtectOptions, BentoGuardConfig, AnalysisResult } from '../types';
import { EncryptionService } from '../crypto/encryption';
import { SignerService } from '../crypto/signer';
import { ApiClient } from '../api/client';
import { BentoError, BentoErrorCode } from '../errors/bento-error';
import { DEFAULT_TIMEOUT } from '../constants';

export class BentoGuardClient {
  private static instance: BentoGuardClient;
  private encryption: EncryptionService;
  private signer: SignerService;
  private api: ApiClient;
  private config: BentoGuardConfig;
  private systemPublicKey: string | null = null;

  private constructor(config?: BentoGuardConfig) {
    this.config = config || this.loadConfigFromEnv();
    this.encryption = new EncryptionService();
    this.signer = new SignerService();
    this.api = new ApiClient(this.config.backendUrl);
  }

  /**
   * Initializes the SDK with configuration.
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
      backendUrl: process.env.BENTO_BACKEND_URL, // Optional
      agentX25519PrivateKey: process.env.AGENT_X25519_PRIVATE_KEY || '',
      agentX25519PublicKey: process.env.AGENT_X25519_PUBLIC_KEY || '',
      agentWalletPrivateKey: process.env.AGENT_WALLET_PRIVATE_KEY || '',
      network: (process.env.BENTO_NETWORK as any) || 'solana',
    };

    if (!config.agentX25519PrivateKey || !config.agentWalletPrivateKey) {
      console.warn('BentoGuard: Missing required credentials (X25519 or Wallet Private Key) in environment.');
    }

    return config;
  }

  /**
   * Orchestrates the protection flow: Encrypt -> Sign -> Verify
   */
  public async protect(
    instruction: string,
    rawTransaction: string,
    options?: BentoProtectOptions
  ): Promise<AnalysisResult> {
    if (!this.config.agentX25519PrivateKey || !this.config.agentWalletPrivateKey) {
      throw new BentoError(BentoErrorCode.INVALID_CONFIG, 'Required keys not configured');
    }

    try {
      // 1. Fetch System Key for BSIT Encryption
      if (!this.systemPublicKey) {
        this.systemPublicKey = await this.api.getSystemPublicKey();
      }
      const systemPublicKey = this.systemPublicKey;

      // 2. Encrypt instruction via BSIT Protocol (Communication Layer)
      const encryptedPayload = await this.encryption.encrypt(
        instruction,
        systemPublicKey,
        this.config.agentX25519PrivateKey
      );
      const encryptedPayloadStr = JSON.stringify(encryptedPayload);

      // 3. Sign the encrypted payload (Identity Layer)
      // This proves that the agent owning the wallet sent this specific instruction
      const { signature, publicKey: walletAddress } = this.signer.signMessage(
        encryptedPayloadStr,
        this.config.agentWalletPrivateKey
      );

      // 4. Submit to Bento Guard Backend
      const result = await this.api.postTransaction({
        agent_id: this.config.agentX25519PublicKey,
        wallet_address: walletAddress,
        encrypted_payload: encryptedPayloadStr,
        signature: signature,
        base64_tx: rawTransaction,
        network: this.config.network || 'solana',
      });

      // 5. Firewall: Automatically block high-risk actions
      if (result.recommendation === 'BLOCK') {
        throw new BentoError(
          BentoErrorCode.HIGH_RISK_DETECTED,
          `Action blocked: ${result.reasoning}`,
          result
        );
      }

      return result;
    } catch (error: any) {
      if (error instanceof BentoError) throw error;
      throw BentoError.fromError(error);
    }
  }
}

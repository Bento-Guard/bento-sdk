import { BentoProtectOptions, BentoGuardConfig, AnalysisResult } from '../types';
import { EncryptionService as BsitProtocol } from '../crypto/bsit';
import { IdentityService } from '../crypto/identity';
import { ApiClient } from '../api/client';
import { BentoError, BentoErrorCode } from '../errors/bento-error';
import { DEFAULT_TIMEOUT } from '../constants';

export class BentoGuardClient {
  private static instance: BentoGuardClient;
  private bsit: BsitProtocol;
  private identity: IdentityService;
  private api: ApiClient;
  private config: BentoGuardConfig;
  private systemPublicKey: string | null = null;

  private constructor(config?: BentoGuardConfig) {
    this.config = config || this.loadConfigFromEnv();
    this.bsit = new BsitProtocol();
    this.identity = new IdentityService();
    this.api = new ApiClient();
  }

  /**
   * Initializes the SDK with configuration.
   */
  public static initialize(config?: BentoGuardConfig): BentoGuardClient {
    if (!BentoGuardClient.instance) {
      BentoGuardClient.instance = new BentoGuardClient(config);
    }
    return BentoGuardClient.instance;
  }

  public static getInstance(): BentoGuardClient {
    if (!BentoGuardClient.instance) {
      throw new BentoError(BentoErrorCode.INVALID_CONFIG, 'BentoGuardClient has not been initialized. Call initialize() first.');
    }
    return BentoGuardClient.instance;
  }

  public static isInitialized(): boolean {
    return !!BentoGuardClient.instance;
  }

  private loadConfigFromEnv(): BentoGuardConfig {
    const config: BentoGuardConfig = {
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
      const encryptedPayload = await this.bsit.encrypt(
        instruction,
        systemPublicKey,
        this.config.agentX25519PrivateKey
      );
      const encryptedPayloadStr = JSON.stringify(encryptedPayload);

      // 3. Sign the combined payload (Identity Layer)
      const { signature, publicKey: walletAddress } = this.identity.signPayload(
        encryptedPayloadStr,
        rawTransaction,
        this.config.agentWalletPrivateKey
      );

      // 4. Submit to Bento Guard Backend
      const result = await this.api.postTransaction({
        agent_pubkey: this.config.agentX25519PublicKey,
        wallet_address: walletAddress,
        encrypted_payload: encryptedPayloadStr,
        signature: signature,
        base64_tx: rawTransaction,
        network: this.config.network || 'solana',
      });

      // 5. Firewall: Automatically block high-risk actions
      if (result.recommendation === 'BLOCKED') {
        throw new BentoError(
          BentoErrorCode.HIGH_RISK_DETECTED,
          `Action blocked: ${result.reasoning}`,
          result
        );
      }

      if (result.recommendation === 'ESCALATED') {
        // Log escalation but allow script to continue if manual review is required asynchronously
        console.warn(`[BENTO WARNING] Action escalated for review: ${result.reasoning}`);
      }

      return result;
    } catch (error: any) {
      if (error instanceof BentoError) throw error;
      throw BentoError.fromError(error);
    }
  }

  /**
   * Manually approve or block an escalated action.
   */
  public async updateActionDecision(actionId: string, decision: 'ALLOW' | 'BLOCKED'): Promise<any> {
    return this.api.updateActionDecision(actionId, decision);
  }

  /**
   * Check the current status of an action (useful for polling).
   */
  public async getActionStatus(actionId: string): Promise<any> {
    return this.api.getActionStatus(actionId);
  }
}

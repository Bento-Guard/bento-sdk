import { BentoProtectOptions, BentoGuardConfig, AnalysisResult } from '../types';
import { IdentityService } from '../crypto/identity';
import { ApiClient } from '../api/client';
import { BentoError, BentoErrorCode } from '../errors/bento-error';

export class BentoGuardClient {
  private static instance: BentoGuardClient;
  private identity: IdentityService;
  private api: ApiClient;
  private config: BentoGuardConfig;
  private systemPublicKey: string | null = null;

  private constructor(config?: BentoGuardConfig) {
    this.config = config || this.loadConfigFromEnv();
    this.identity = new IdentityService();
    this.api = new ApiClient(this.config.timeout);
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
      agentWalletPrivateKey: process.env.AGENT_WALLET_PRIVATE_KEY || '',
      network: (process.env.BENTO_NETWORK as any) || 'solana',
    };

    if (!config.agentWalletPrivateKey) {
      console.warn('BentoGuard: Missing required Agent Wallet Private Key in environment.');
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
    if (!this.config.agentWalletPrivateKey) {
      throw new BentoError(BentoErrorCode.INVALID_CONFIG, 'Required wallet key not configured');
    }

    try {
      // 1. Mock "Encryption" by using instruction directly
      const mockEncryptedPayloadStr = instruction;

      // 2. Sign the combined payload (Identity Layer)
      const { signature, publicKey: agentAddress } = this.identity.signPayload(
        mockEncryptedPayloadStr,
        rawTransaction,
        this.config.agentWalletPrivateKey
      );

      // 3. Submit to Bento Guard Backend
      const result = await this.api.postTransaction({
        agent_address: agentAddress,
        wallet_address: agentAddress,
        encrypted_payload: mockEncryptedPayloadStr,
        signature: signature,
        base64_tx: rawTransaction,
        network: this.config.network || 'solana',
      }, options?.timeout);

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
  public async updateActionDecision(actionId: string, decision: 'ALLOW' | 'BLOCKED', reasoning?: string): Promise<any> {
    const message = `Bento Guard Approval: ${actionId} - ${decision}`;
    const signature = this.identity.signMessage(message, this.config.agentWalletPrivateKey);
    const publicKey = this.identity.getPublicKey(this.config.agentWalletPrivateKey);

    return this.api.updateActionDecision(actionId, {
      decision,
      reasoning,
      signature,
      publicKey
    });
  }

  /**
   * Check the current status of an action (useful for polling).
   */
  public async getActionStatus(actionId: string): Promise<any> {
    return this.api.getActionStatus(actionId);
  }
}

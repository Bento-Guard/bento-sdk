import { BentoProtectOptions, BentoGuardConfig, AnalysisResult } from '../types';
import { IdentityService } from '../crypto/identity';
import { ApiClient } from '../api/client';
import { BentoError, BentoErrorCode } from '../errors/bento-error';

import { BentoNetwork, NETWORK_CONFIG } from '../constants';

export class BentoGuardClient {
  private static instance: BentoGuardClient;
  private identity: IdentityService;
  private api: ApiClient;
  private config: BentoGuardConfig;
  private systemPublicKey: string | null = null;

  private constructor(config?: BentoGuardConfig) {
    this.config = config || this.loadConfigFromEnv();
    this.identity = new IdentityService();
    
    // Resolve API URL based on network or explicit config
    const network = (this.config.network as BentoNetwork) || BentoNetwork.TESTNET;
    const baseUrl = this.config.endpoint || NETWORK_CONFIG[network]?.endpoint || NETWORK_CONFIG[BentoNetwork.TESTNET].endpoint;
    
    this.api = new ApiClient(baseUrl, this.config.timeout);
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
      network: (process.env.BENTO_NETWORK as BentoNetwork) || BentoNetwork.TESTNET,
      endpoint: process.env.BENTO_ENDPOINT || process.env.BENTO_API_URL,
      timeout: process.env.BENTO_TIMEOUT_MS ? Number(process.env.BENTO_TIMEOUT_MS) : undefined,
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
        console.warn(`[BENTO WARNING] Action escalated for review: ${result.reasoning}`);

        const actionId = result.actionId;
        if (!actionId) {
          throw new BentoError(
            BentoErrorCode.NETWORK_ERROR,
            'Escalated action is missing actionId for polling verification.'
          );
        }

        const pollInterval = options?.pollIntervalMs ?? 2000;
        const pollTimeout = options?.pollTimeoutMs ?? 300000; // 5 minutes default
        const startTime = Date.now();

        console.log(`[BENTO INFO] Pausing agent script to wait for Human-in-the-Loop decision on Action: ${actionId}...`);

        while (Date.now() - startTime < pollTimeout) {
          await new Promise((resolve) => setTimeout(resolve, pollInterval));

          try {
            const status = await this.getActionStatus(actionId);
            if (status.final_decision === 'ALLOW') {
              console.log(`[BENTO SUCCESS] Escalated action was APPROVED by the owner.`);
              return {
                ...result,
                recommendation: 'ALLOW',
                reasoning: `Approved by owner: ${status.reason || ''}`
              };
            } else if (status.final_decision === 'BLOCKED') {
              throw new BentoError(
                BentoErrorCode.HIGH_RISK_DETECTED,
                `Action blocked by owner: ${status.reason || ''}`,
                status
              );
            }
            // If still ESCALATED, continue polling...
          } catch (err: any) {
            if (err instanceof BentoError) throw err;
            console.warn(`[BENTO WARNING] Error during action status polling: ${err.message}`);
          }
        }

        throw new BentoError(
          BentoErrorCode.HIGH_RISK_DETECTED,
          `Escalated action review timed out after ${pollTimeout / 1000}s waiting for owner approval.`
        );
      }

      return result;
    } catch (error: any) {
      if (error instanceof BentoError) throw error;
      throw BentoError.fromError(error);
    }
  }


  /**
   * Check the current status of an action (useful for polling).
   */
  public async getActionStatus(actionId: string): Promise<any> {
    return this.api.getActionStatus(actionId);
  }
}

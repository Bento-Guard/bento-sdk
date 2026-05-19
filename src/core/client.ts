import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { BentoProtectOptions, BentoGuardConfig, AnalysisResult } from '../types';
import { IdentityService } from '../crypto/identity';
import { ApiClient } from '../api/client';
import { BentoError, BentoErrorCode } from '../errors/bento-error';
import { BentoNetwork, NETWORK_CONFIG } from '../constants';
import {
  encodeActionPayload,
  encryptForRelayer,
  commitmentHashAsArray,
} from '../crypto/onchain-crypto';

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

  public setAuthToken(token: string): void {
    this.api.setAuthToken(token);
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

  private getAgentKeypair(): Keypair {
    const key = this.config.agentWalletPrivateKey;
    if (!key) {
      throw new BentoError(BentoErrorCode.INVALID_CONFIG, 'Agent private key not configured');
    }
    try {
      if (key.includes(',')) {
        const bytes = Uint8Array.from(key.split(',').map(Number));
        return Keypair.fromSecretKey(bytes);
      }
      return Keypair.fromSecretKey(bs58.decode(key));
    } catch (err: any) {
      throw new BentoError(BentoErrorCode.INVALID_CONFIG, `Failed to parse Agent private key: ${err.message}`);
    }
  }

  /**
   * Orchestrates the off-chain protection flow: Encrypt -> Sign -> Verify
   */
  public async protect(
    instruction: string,
    rawTransaction: string,
    options?: BentoProtectOptions
  ): Promise<AnalysisResult> {
    if (!this.config.agentWalletPrivateKey) {
      throw new BentoError(BentoErrorCode.INVALID_CONFIG, 'Required wallet key not configured');
    }

    // Delegate to on-chain workflow if specified
    if (options?.onChain === true || options?.ownerKeypair) {
      if (!options.ownerKeypair) {
        throw new BentoError(BentoErrorCode.INVALID_CONFIG, 'ownerKeypair is required for on-chain protection flow.');
      }
      if (!options.relayerPublicKey) {
        throw new BentoError(BentoErrorCode.INVALID_CONFIG, 'relayerPublicKey is required for on-chain protection flow.');
      }
      if (!options.targetProgram) {
        throw new BentoError(BentoErrorCode.INVALID_CONFIG, 'targetProgram is required for on-chain protection flow.');
      }
      return this.protectOnChain(instruction, rawTransaction, {
        ownerKeypair: options.ownerKeypair,
        relayerPublicKey: options.relayerPublicKey,
        targetProgram: options.targetProgram,
        value: options.value,
        actionId: options.actionId,
        triggerVerdict: options.triggerVerdict,
        autoPollEscalation: options.autoPollEscalation,
        pollIntervalMs: options.pollIntervalMs,
        pollTimeoutMs: options.pollTimeoutMs,
      });
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

        if (options?.autoPollEscalation === false) {
          return result;
        }

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
   * Orchestrates the fully ON-CHAIN protection flow:
   * 1. Encrypts transaction & prompt payload using Relayer Public Key.
   * 2. Computes the Blake3 commitment hash.
   * 3. Performs L1 Action Initialization (and ER delegation).
   * 4. Streams payload chunks to the Ephemeral Rollup on-chain account.
   * 5. Finalizes the action, committing back to L1 & triggering the Relayer AI Guard threat verdict.
   */
  public async protectOnChain(
    instruction: string,
    rawTransaction: string,
    params: {
      ownerKeypair: Keypair;
      relayerPublicKey: string;
      targetProgram: string;
      value?: string;
      actionId?: string;
      triggerVerdict?: boolean;
      autoPollEscalation?: boolean;
      pollIntervalMs?: number;
      pollTimeoutMs?: number;
    }
  ): Promise<any> {
    const agentKeypair = this.getAgentKeypair();
    const actionId = params.actionId ?? Math.floor(Math.random() * 100000000).toString();
    const value = params.value ?? '0';

    try {
      // 1. Pack and encrypt payload
      const txBytes = new Uint8Array(Buffer.from(rawTransaction, 'base64'));
      const plaintext = encodeActionPayload({ prompt: instruction, tx: txBytes });

      let relayerKeyBytes: Uint8Array;
      try {
        relayerKeyBytes = bs58.decode(params.relayerPublicKey);
      } catch {
        relayerKeyBytes = new Uint8Array(Buffer.from(params.relayerPublicKey, 'hex'));
      }

      const encryption = encryptForRelayer({
        plaintext,
        relayerPublicKey: relayerKeyBytes,
      });

      const commitmentHash = commitmentHashAsArray(plaintext);

      console.log(`🔍 [Bento SDK] On-Chain protected action initiated. Action ID: ${actionId}`);

      // ────────────────────────────────────────────────────────────────
      // Step 1 — Init Action
      // ────────────────────────────────────────────────────────────────
      console.log('   [1/3] Initializing Action on L1...');
      const initRes = await this.api.buildInitAction({
        agent_public_addr: agentKeypair.publicKey.toBase58(),
        owner_pubkey: params.ownerKeypair.publicKey.toBase58(),
        action_id: actionId,
        target_program: params.targetProgram,
        value,
        total_data_len: encryption.payload.length,
      });

      const initTx = VersionedTransaction.deserialize(Buffer.from(initRes.transaction, 'base64'));
      // Sign with both owner and agent keypairs
      initTx.sign([params.ownerKeypair, agentKeypair]);

      await this.api.confirmInitAction({
        agent_public_addr: agentKeypair.publicKey.toBase58(),
        owner_pubkey: params.ownerKeypair.publicKey.toBase58(),
        action_id: actionId,
        target_program: params.targetProgram,
        value,
        total_data_len: encryption.payload.length,
        signed_transaction: Buffer.from(initTx.serialize()).toString('base64'),
      });

      // ────────────────────────────────────────────────────────────────
      // Step 2 — Append Payload Chunks
      // ────────────────────────────────────────────────────────────────
      console.log('   [2/3] Streaming encrypted payload chunks to Ephemeral Rollup...');
      const chunkSize = 900;
      const totalLen = encryption.payload.length;
      let offset = 0;

      while (offset < totalLen) {
        const chunk = encryption.payload.slice(offset, offset + chunkSize);
        const chunkB64 = Buffer.from(chunk).toString('base64');

        const appendRes = await this.api.buildAppendPayload({
          agent_public_addr: agentKeypair.publicKey.toBase58(),
          action_id: actionId,
          offset,
          chunk: chunkB64,
        });

        const appendTx = VersionedTransaction.deserialize(Buffer.from(appendRes.transaction, 'base64'));
        // Only owner signer required for appending chunks once delegated
        appendTx.sign([params.ownerKeypair]);

        await this.api.confirmAppendPayload({
          agent_public_addr: agentKeypair.publicKey.toBase58(),
          action_id: actionId,
          offset,
          chunk_len: chunk.length,
          signed_transaction: Buffer.from(appendTx.serialize()).toString('base64'),
        });

        offset += chunk.length;
      }

      // ────────────────────────────────────────────────────────────────
      // Step 3 — Finalize Action
      // ────────────────────────────────────────────────────────────────
      console.log('   [3/3] Finalizing action and triggering AI threat audit...');
      const finalizeRes = await this.api.buildFinalizeAction({
        agent_public_addr: agentKeypair.publicKey.toBase58(),
        action_id: actionId,
        commitment_hash: commitmentHash,
      });

      const finalizeTx = VersionedTransaction.deserialize(Buffer.from(finalizeRes.transaction, 'base64'));
      finalizeTx.sign([params.ownerKeypair]);

      const finalizeConfirm = await this.api.confirmFinalizeAction({
        agent_public_addr: agentKeypair.publicKey.toBase58(),
        action_id: actionId,
        signed_transaction: Buffer.from(finalizeTx.serialize()).toString('base64'),
        trigger_verdict: params.triggerVerdict ?? true,
      });

      const verdict = finalizeConfirm.verdict;
      if (!verdict) {
        return finalizeConfirm;
      }

      console.log(`🛡️ [Bento SDK] Audit verdict completed: ${verdict.decision} (Risk Score: ${verdict.raw_score / 100}%)`);

      if (verdict.decision === 'Blocked') {
        throw new BentoError(
          BentoErrorCode.HIGH_RISK_DETECTED,
          `Action blocked: ${verdict.reasoning}`,
          verdict
        );
      }

      if (verdict.decision === 'Escalated') {
        console.warn(`[BENTO WARNING] Action escalated for review: ${verdict.reasoning}`);

        if (params.autoPollEscalation === false) {
          return { recommendation: 'ESCALATED', actionId, reasoning: verdict.reasoning };
        }

        const pollInterval = params.pollIntervalMs ?? 2000;
        const pollTimeout = params.pollTimeoutMs ?? 300000; // 5 minutes
        const startTime = Date.now();

        console.log(`[BENTO INFO] Pausing agent script to wait for Human-in-the-Loop decision on Action: ${actionId}...`);

        while (Date.now() - startTime < pollTimeout) {
          await new Promise((resolve) => setTimeout(resolve, pollInterval));

          try {
            const status = await this.getActionStatus(actionId);
            if (status.final_decision === 'ALLOW') {
              console.log(`[BENTO SUCCESS] Escalated action was APPROVED by the owner.`);
              return {
                recommendation: 'ALLOW',
                actionId,
                reasoning: `Approved by owner: ${status.reason || ''}`
              };
            } else if (status.final_decision === 'BLOCKED') {
              throw new BentoError(
                BentoErrorCode.HIGH_RISK_DETECTED,
                `Action blocked by owner: ${status.reason || ''}`,
                status
              );
            }
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

      return {
        recommendation: 'ALLOW',
        actionId,
        reasoning: verdict.reasoning,
        riskScore: verdict.raw_score / 100,
      };
    } catch (error: any) {
      if (error instanceof BentoError) throw error;
      throw BentoError.fromError(error);
    }
  }

  /**
   * Onboards the Agent fully on-chain.
   * Coordinates the L1 register_agent and delegate_agent execution.
   */
  public async onboardAgentOnChain(params: {
    ownerKeypair: Keypair;
    spendLimit: number;
    name: string;
    icon: string;
  }): Promise<any> {
    const agentKeypair = this.getAgentKeypair();
    try {
      console.log(`🚀 [Bento SDK] Onboarding Agent fully on-chain: ${params.name}`);

      const buildRes = await this.api.buildRegistration({
        agent_public_addr: agentKeypair.publicKey.toBase58(),
        spend_limit: params.spendLimit,
      });

      const tx = VersionedTransaction.deserialize(Buffer.from(buildRes.transaction, 'base64'));
      // Signed by the owner keypair
      tx.sign([params.ownerKeypair]);

      const confirmRes = await this.api.confirmRegistration({
        agent_public_addr: agentKeypair.publicKey.toBase58(),
        spend_limit: params.spendLimit,
        name_agent: params.name,
        icon_agent: params.icon,
        signed_transaction: Buffer.from(tx.serialize()).toString('base64'),
      });

      console.log(`✨ [Bento SDK] Onboarding complete. Agent PDA: ${confirmRes.agent_pda}`);
      return confirmRes;
    } catch (error: any) {
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

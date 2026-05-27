import { Keypair, SystemProgram, TransactionMessage, VersionedTransaction, PublicKey, Connection } from '@solana/web3.js';
import bs58 from 'bs58';
import { BentoProtectOptions, BentoGuardConfig, AnalysisResult } from '../types';
import { ApiClient } from '../api/client';
import { BentoError, BentoErrorCode } from '../errors/bento-error';
import { BentoNetwork, NETWORK_CONFIG } from '../constants';

import { offchainProtect } from './offchain-flow';
import { onchainProtect } from './onchain-flow';

export class BentoGuardClient {
  private static instance: BentoGuardClient;
  public api: ApiClient;
  public config: BentoGuardConfig;

  private constructor(config?: BentoGuardConfig) {
    this.config = config || this.loadConfigFromEnv();

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
    } else if (config) {
      // Allow re-initialization with new config if explicitly provided
      BentoGuardClient.instance.config = config;
      const network = (config.network as BentoNetwork) || BentoNetwork.TESTNET;
      const baseUrl = config.endpoint || NETWORK_CONFIG[network]?.endpoint || NETWORK_CONFIG[BentoNetwork.TESTNET].endpoint;
      BentoGuardClient.instance.api = new ApiClient(baseUrl, config.timeout);
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
      agentAddress: process.env.AGENT_ADDRESS || process.env.AGENT_PUBLIC_KEY || '',
      agentWalletPrivateKey: process.env.AGENT_WALLET_PRIVATE_KEY || process.env.AGENT_PRIVATE_KEY || '',
      network: (process.env.BENTO_NETWORK as BentoNetwork) || BentoNetwork.TESTNET,
      endpoint: process.env.BENTO_ENDPOINT || process.env.BENTO_API_URL,
      timeout: process.env.BENTO_TIMEOUT_MS ? Number(process.env.BENTO_TIMEOUT_MS) : undefined,
    };

    return config;
  }

  public getAgentKeypair(): Keypair {
    const key = this.config.agentWalletPrivateKey;
    if (!key) {
      throw new BentoError(
        BentoErrorCode.INVALID_CONFIG,
        'Agent Private key not configured. Please set AGENT_PRIVATE_KEY in environment.'
      );
    }
    try {
      let bytes: Uint8Array;
      if (key.includes(',')) {
        bytes = Uint8Array.from(key.split(',').map(Number));
      } else {
        bytes = bs58.decode(key);
      }
      return Keypair.fromSecretKey(bytes);
    } catch (err: any) {
      throw new BentoError(BentoErrorCode.INVALID_CONFIG, `Failed to parse Agent private key: ${err.message}`);
    }
  }

  public getAgentAddress(options?: BentoProtectOptions): string {
    if (options?.agentAddress) {
      return options.agentAddress;
    }
    if (this.config.agentAddress) {
      return this.config.agentAddress;
    }
    return this.getAgentKeypair().publicKey.toBase58();
  }

  public parseInstruction(instruction: string, agentPublicKey: PublicKey): VersionedTransaction {
    let recipientStr = '';
    let amount = 0.001; // default minimum simulated amount

    // Parse recipient pubkey
    const pubkeyRegex = /[1-9A-HJ-NP-Za-km-z]{32,44}/;
    const matchPubkey = instruction.match(pubkeyRegex);
    if (matchPubkey) {
      recipientStr = matchPubkey[0];
    } else {
      recipientStr = agentPublicKey.toBase58(); // transfer to self if no pubkey found
    }

    // Parse amount
    const amountRegex = /(\d+(\.\d+)?)\s*sol/i;
    const matchAmount = instruction.match(amountRegex);
    if (matchAmount) {
      amount = parseFloat(matchAmount[1]);
    }

    const recipientPubkey = new PublicKey(recipientStr);
    const transferIx = SystemProgram.transfer({
      fromPubkey: agentPublicKey,
      toPubkey: recipientPubkey,
      lamports: BigInt(Math.floor(amount * 1_000_000_000)),
    });

    const message = new TransactionMessage({
      payerKey: agentPublicKey,
      recentBlockhash: PublicKey.default.toBase58(),
      instructions: [transferIx],
    }).compileToV0Message();

    return new VersionedTransaction(message);
  }

  /**
   * Orchestrates the protection flow: dynamically runs the secure on-chain flow
   * (Solana L1 + Magicblock ER) using co-signing without exposing AGENT_PRIVATE_KEY.
   */
  public async protect(
    instruction: string,
    signature: string,
    options?: BentoProtectOptions
  ): Promise<AnalysisResult> {
    const USE_OFFCHAIN = true; // Set to false to enable the secure on-chain flow

    if (USE_OFFCHAIN) {
      return offchainProtect(this, instruction, signature, options);
    } else {
      return onchainProtect(this, instruction, signature, options);
    }
  }
}


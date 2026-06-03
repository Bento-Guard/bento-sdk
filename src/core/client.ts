import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import {
  BentoProtectOptions,
  BentoGuardConfig,
  AnalysisResult,
} from "../types";
import { ApiClient } from "../api/client";
import { BentoError, BentoErrorCode } from "../errors/bento-error";
import { USE_OFFCHAIN, BENTO_GUARD_DEFAULT_URL } from "../constants";

import { offchainProtect } from "./offchain-flow";
import { onchainProtect } from "./onchain-flow";

export class BentoGuardClient {
  private static instance: BentoGuardClient;
  public api: ApiClient;
  public config: BentoGuardConfig;

  private constructor(config?: BentoGuardConfig) {
    this.config = config || this.loadConfigFromEnv();

    const baseUrl =
      this.config.endpoint ||
      BENTO_GUARD_DEFAULT_URL;

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
      const baseUrl =
        config.endpoint ||
        BENTO_GUARD_DEFAULT_URL;
      BentoGuardClient.instance.api = new ApiClient(baseUrl, config.timeout);
    }
    return BentoGuardClient.instance;
  }

  public static getInstance(): BentoGuardClient {
    if (!BentoGuardClient.instance) {
      throw new BentoError(
        BentoErrorCode.INVALID_CONFIG,
        "BentoGuardClient has not been initialized. Call initialize() first.",
      );
    }
    return BentoGuardClient.instance;
  }

  public static isInitialized(): boolean {
    return !!BentoGuardClient.instance;
  }

  private loadConfigFromEnv(): BentoGuardConfig {
    const config: BentoGuardConfig = {
      agentAddress:
        process.env.AGENT_ADDRESS || process.env.AGENT_PUBLIC_KEY || "",
      agentWalletPrivateKey:
        process.env.AGENT_WALLET_PRIVATE_KEY ||
        process.env.AGENT_PRIVATE_KEY ||
        "",
      endpoint: process.env.BENTO_ENDPOINT || process.env.BENTO_API_URL,
      timeout: process.env.BENTO_TIMEOUT_MS
        ? Number(process.env.BENTO_TIMEOUT_MS)
        : undefined,
    };

    return config;
  }

  public getAgentKeypair(): Keypair {
    const key = this.config.agentWalletPrivateKey;
    if (!key) {
      throw new BentoError(
        BentoErrorCode.INVALID_CONFIG,
        "Agent Private key not configured. Please set AGENT_PRIVATE_KEY in environment.",
      );
    }
    try {
      let bytes: Uint8Array;
      if (key.includes(",")) {
        bytes = Uint8Array.from(key.split(",").map(Number));
      } else {
        bytes = bs58.decode(key);
      }
      return Keypair.fromSecretKey(bytes);
    } catch (err: any) {
      throw new BentoError(
        BentoErrorCode.INVALID_CONFIG,
        `Failed to parse Agent private key: ${err.message}`,
      );
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

  /**
   * Verifies if the configured agent wallet is registered on the Bento dashboard.
   */
  public async verifyRegistration(
    options?: BentoProtectOptions,
  ): Promise<boolean> {
    const agentAddress = this.getAgentAddress(options);
    try {
      const result = await this.api.checkRegistration(agentAddress);
      return result?.registered === true || result === true;
    } catch (error: any) {
      if (
        error.code === BentoErrorCode.NOT_FOUND ||
        error.message.includes("not found") ||
        error.message.includes("Agent not found")
      ) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Fetches the current status of an escalated action.
   */
  public async getActionStatus(actionId: string): Promise<any> {
    return this.api.getActionStatus(actionId);
  }

  /**
   * Orchestrates the protection flow: dynamically runs the secure on-chain flow
   * (Solana L1 + Magicblock ER) using co-signing without exposing AGENT_PRIVATE_KEY.
   */
  public async protect(
    instruction: string,
    options?: BentoProtectOptions,
  ): Promise<AnalysisResult> {
    try {
      if (USE_OFFCHAIN) {
        return await offchainProtect(
          this,
          instruction,
          options,
        );
      } else {
        return await onchainProtect(this, instruction, options);
      }
    } catch (error: any) {
      if (error.message && error.message.includes("Agent not found")) {
        throw new BentoError(
          BentoErrorCode.NOT_FOUND,
          `Agent not found. Please ensure you have registered your agent wallet at https://app.bentoguard.xyz\nOriginal error: ${error.message}`,
        );
      }
      throw error;
    }
  }
}

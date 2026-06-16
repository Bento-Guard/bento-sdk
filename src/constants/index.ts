export enum BentoNetwork {
  MAINNET = "mainnet",
  TESTNET = "testnet",
  DEVNET = "devnet",
}

export interface NetworkConfig {
  endpoint: string;
  defaultTimeout: number;
}

export const NETWORK_CONFIG: Record<BentoNetwork, NetworkConfig> = {
  [BentoNetwork.MAINNET]: {
    endpoint: "", // To be updated for production
    defaultTimeout: 120000,
  },
  [BentoNetwork.TESTNET]: {
    endpoint: "https://api.bentoguard.xyz",
    defaultTimeout: 120000,
  },
  [BentoNetwork.DEVNET]: {
    endpoint: "http://localhost:4001",
    defaultTimeout: 120000,
  },
};

export const BENTO_GUARD_DEFAULT_URL =
  NETWORK_CONFIG[BentoNetwork.TESTNET].endpoint;

export const DEFAULT_TIMEOUT = 2 * 60 * 1000; // 2 minutes
export const POLL_TIMEOUT_MS = 5 * 60 * 1000;  // 5 minutes
export const BOOTSTRAP_TTL_MS = 5 * 60 * 1000; // 5 minutes


export const USE_OFFCHAIN = false;  //true = offchain flow | false = onchain flow (default)
export const CHUNK_SIZE = 900;

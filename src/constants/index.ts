export enum BentoNetwork {
  MAINNET = "mainnet",
  TESTNET = "testnet",
  DEVNET = "devnet",
}

export enum Relayer {
  PRODUCTION = "https://api.bentoguard.xyz",
  DEVELOPMENT = "https://api.dev.bentoguard.xyz",
  LOCAL = "http://localhost:4001",
}

export const DEFAULT_TIMEOUT = 5 * 60 * 1000; // 5 minutes
export const POLL_TIMEOUT_MS = 5 * 60 * 1000;  // 5 minutes
export const BOOTSTRAP_TTL_MS = 5 * 60 * 1000; // 5 minutes


export const USE_OFFCHAIN = false;  //true = offchain flow | false = onchain flow (default)
export const CHUNK_SIZE = 900;

export interface NetworkConfig {
  endpoint: string;
  defaultTimeout: number;
}

export const NETWORK_CONFIG: Record<BentoNetwork, NetworkConfig> = {
  [BentoNetwork.MAINNET]: {
    endpoint: Relayer.PRODUCTION,
    defaultTimeout: DEFAULT_TIMEOUT,
  },
  [BentoNetwork.TESTNET]: {
    endpoint: Relayer.DEVELOPMENT,
    defaultTimeout: DEFAULT_TIMEOUT,
  },
  [BentoNetwork.DEVNET]: {
    endpoint: Relayer.LOCAL,
    defaultTimeout: DEFAULT_TIMEOUT,
  },
};

export const BENTO_GUARD_DEFAULT_URL =
  NETWORK_CONFIG[BentoNetwork.MAINNET].endpoint;

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
export const DEFAULT_TIMEOUT = 120000;

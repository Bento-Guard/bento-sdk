import { BentoNetwork } from '../constants';

export interface BentoGuardConfig {
  agentWalletPrivateKey: string; // Used for signing requests (Identity)
  network?: BentoNetwork | 'mainnet' | 'devnet';
  endpoint?: string; // Optional: Override default API URL
  timeout?: number;
}

export interface BentoProtectOptions {
  timeout?: number;
  silent?: boolean;
  autoPollEscalation?: boolean;
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
  
  // On-Chain Protection Parameters
  onChain?: boolean;
  ownerKeypair?: any;          // Keypair instance
  relayerPublicKey?: string;   // Relayer X25519 public key
  targetProgram?: string;      // Solana program ID base58
  value?: string;              // Lamports committed (u64 string)
  actionId?: string;           // Optional pre-generated action ID
  triggerVerdict?: boolean;    // Default true
}

export interface EncryptedPayload {
  ciphertext: string;
  nonce: string;
  tag: string;
}

export interface AnalysisResult {
  recommendation: 'ALLOW' | 'BLOCKED' | 'ESCALATED';
  riskScore: number;
  reasoning: string;
  actionId?: string;
  approveUrl?: string;
  blockUrl?: string;
  reviewUrl?: string;
  timestamp?: string;
  details?: {
    simulationStatus?: string;
    aiAnalysis?: string;
    policyViolations?: string[];
  };
}

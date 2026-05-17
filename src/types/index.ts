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
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
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
  timestamp?: string;
  details?: {
    simulationStatus?: string;
    aiAnalysis?: string;
    policyViolations?: string[];
  };
}

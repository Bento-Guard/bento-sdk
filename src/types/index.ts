export interface BentoGuardConfig {
  agentWalletPrivateKey: string; // Used for signing requests (Identity)
  network?: 'solana' | 'ethereum' | 'base';
  timeout?: number;
}

export interface BentoProtectOptions {
  timeout?: number;
  silent?: boolean;
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

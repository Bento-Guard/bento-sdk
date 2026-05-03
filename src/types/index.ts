export interface BentoGuardConfig {
  backendUrl: string;
  agentX25519PrivateKey: string;
  agentX25519PublicKey: string;
  agentPrivateWalletKey?: string;
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
  success: boolean;
  recommendation: 'ALLOW' | 'BLOCK' | 'ESCALATE';
  riskScore: number;
  reasoning: string;
  details?: {
    simulationStatus?: string;
    aiAnalysis?: string;
    policyViolations?: string[];
  };
  timestamp: string;
}

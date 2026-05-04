export interface BentoGuardConfig {
  agentX25519PrivateKey: string; // Used for BSIT encryption
  agentX25519PublicKey: string;  // Used for BSIT key exchange
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
  success: boolean;
  recommendation: 'ALLOW' | 'BLOCK' | 'ESCALATE';
  riskScore: number;
  reasoning: string;
  signature?: string; // Optional: signature from backend if needed
  details?: {
    simulationStatus?: string;
    aiAnalysis?: string;
    policyViolations?: string[];
  };
  timestamp: string;
}

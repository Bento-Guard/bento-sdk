import { BentoNetwork } from "../constants";

export interface BentoGuardConfig {
  agentAddress?: string; // Optional: Explicit Agent Public Address
  agentWalletPrivateKey?: string; // Optional: Used to derive agentAddress if not provided
  endpoint?: string; // Optional: Override default API URL
  timeout?: number;
}

export interface BentoProtectOptions {
  agentAddress?: string; // Optional: Override agent address for this request
  timeout?: number;
  silent?: boolean;
  autoPollEscalation?: boolean;
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
}

export interface EncryptedPayload {
  ciphertext: string;
  nonce: string;
  tag: string;
}

export interface AnalysisResult {
  recommendation: "ALLOW" | "BLOCKED" | "ESCALATED";
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

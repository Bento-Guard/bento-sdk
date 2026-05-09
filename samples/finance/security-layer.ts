import { BentoClient, protect, AnalysisResult } from "@bentoguard/sdk";

/**
 * CORE INTEGRATION:
 * This is where we plug Bento Guard into the Agent's workflow.
 */
export async function secureExecute(
  intent: string,
  rawTx: string,
): Promise<AnalysisResult> {
  // 1. Initialize the security engine (Singleton)
  if (!BentoClient.isInitialized()) {
    BentoClient.initialize();
  }

  // 2. CALL THE GUARD: The main protection point
  // We send the Natural Language Intent + The Actual Raw Transaction
  return await protect(intent, rawTx);
}

/**
 * Optional: Manual decision management via SDK
 */
export async function submitManualDecision(
  actionId: string,
  decision: "ALLOW" | "BLOCKED",
) {
  const client = BentoClient.getInstance();
  return await client.updateActionDecision(actionId, decision);
}

export async function pollActionStatus(actionId: string) {
  const client = BentoClient.getInstance();
  return await client.getActionStatus(actionId);
}

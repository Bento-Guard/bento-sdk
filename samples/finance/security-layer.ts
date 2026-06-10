import { BentoClient, protect, AnalysisResult } from "@bentoguard/sdk";

export interface ProtectInput {
  instruction: string;
}

function assertProtectInput(input: ProtectInput) {
  if (!input.instruction?.trim()) {
    throw new Error("Invalid protect input: instruction is required.");
  }
}

/**
 * CORE INTEGRATION:
 * This is where we plug Bento Guard into the Agent's workflow.
 */
export async function secureExecute(
  input: ProtectInput,
): Promise<AnalysisResult> {
  assertProtectInput(input);

  // 1. Initialize the security engine (Singleton)
  if (!BentoClient.isInitialized()) {
    BentoClient.initialize();
  }

  // 2. CALL THE GUARD: The main protection point
  return await protect(input.instruction, {
    timeout: Number(process.env.BENTO_PROTECT_TIMEOUT_MS || 15000),
    autoPollEscalation: false,
    silent: true,
  });
}


export async function pollActionStatus(actionId: string) {
  const client = BentoClient.getInstance();
  return await client.getActionStatus(actionId);
}

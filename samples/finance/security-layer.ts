import { BentoClient, protect, AnalysisResult } from "@bentoguard/sdk";

export interface ProtectInput {
  instruction: string;
  rawTransaction: string;
}

function assertProtectInput(input: ProtectInput) {
  if (!input.instruction?.trim()) {
    throw new Error("Invalid protect input: instruction is required.");
  }

  // SDK expects Base64 raw transaction string.
  const base64Pattern =
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  if (!input.rawTransaction?.trim() || !base64Pattern.test(input.rawTransaction)) {
    throw new Error(
      "Invalid protect input: rawTransaction must be a Base64 string.",
    );
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
  // We send instruction + raw unsigned transaction (Base64)
  return await protect(input.instruction, input.rawTransaction, {
    timeout: Number(process.env.BENTO_PROTECT_TIMEOUT_MS || 15000),
  });
}


export async function pollActionStatus(actionId: string) {
  const client = BentoClient.getInstance();
  return await client.getActionStatus(actionId);
}

import { BentoGuardClient } from "./core/client";
import { BentoProtectOptions, AnalysisResult } from "./types";

/**
 * The main entry point for the Bento Guard SDK.
 *
 * @param instruction - The natural language intent of the agent.
 * @param options - Additional options for protection (e.g., polling rules, specific agent override).
 * @returns An AnalysisResult containing the verdict (ALLOW, BLOCKED, ESCALATED), risk score, and reasoning.
 */
export async function protect(
  instruction: string,
  options?: BentoProtectOptions,
): Promise<AnalysisResult> {
  if (!BentoGuardClient.isInitialized()) {
    BentoGuardClient.initialize();
  }
  const client = BentoGuardClient.getInstance();
  return client.protect(instruction, options);
}

/**
 * Verifies if the configured agent wallet is registered on the Bento dashboard.
 *
 * @param options - Optional configuration overrides
 * @returns True if registered, false otherwise.
 */
export async function verifyRegistration(
  options?: BentoProtectOptions,
): Promise<boolean> {
  if (!BentoGuardClient.isInitialized()) {
    BentoGuardClient.initialize();
  }
  const client = BentoGuardClient.getInstance();
  return client.verifyRegistration(options);
}

/**
 * Fetches the current status of an escalated action.
 *
 * @param actionId - The unique ID of the action.
 * @param options - Optional configuration overrides.
 * @returns The current status of the action.
 */
export async function getActionStatus(
  actionId: string,
  options?: BentoProtectOptions,
): Promise<any> {
  if (!BentoGuardClient.isInitialized()) {
    BentoGuardClient.initialize();
  }
  const client = BentoGuardClient.getInstance();
  return client.getActionStatus(actionId, options);
}

// Export the main client and its alias
export { BentoGuardClient };
export { BentoGuardClient as BentoClient };

// Export other useful modules
export * from "./errors/bento-error";
export * from "./types";
export * from "./utils/logger";

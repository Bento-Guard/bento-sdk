import { BentoGuardClient } from './core/client';
import { BentoProtectOptions } from './types';

/**
 * The main entry point for the Bento Guard SDK.
 * 
 * @param instruction - The natural language instruction to be analyzed by LLM
 * @param signature - The Ed25519 signature of the instruction signed by the agent's private key (base58)
 * @param options - Optional configuration overrides
 * @returns The result of the protection analysis
 * @throws {BentoError} If risk is high or network error occurs
 */
export async function protect(
  instruction: string,
  signature: string,
  options?: BentoProtectOptions
) {
  if (!BentoGuardClient.isInitialized()) {
    BentoGuardClient.initialize();
  }
  const client = BentoGuardClient.getInstance();
  return client.protect(instruction, signature, options);
}

/**
 * Verifies if the configured agent wallet is registered on the Bento dashboard.
 * 
 * @param options - Optional configuration overrides
 * @returns True if registered, false otherwise.
 */
export async function verifyRegistration(
  options?: BentoProtectOptions
): Promise<boolean> {
  if (!BentoGuardClient.isInitialized()) {
    BentoGuardClient.initialize();
  }
  const client = BentoGuardClient.getInstance();
  return client.verifyRegistration(options);
}

// Export the main client and its alias
export { BentoGuardClient };
export { BentoGuardClient as BentoClient };

// Export other useful modules
export * from './errors/bento-error';
export * from './types';
export * from './utils/logger';


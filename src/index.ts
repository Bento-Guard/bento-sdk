import { BentoGuardClient } from './core/client';
import { BentoProtectOptions } from './types';

/**
 * The main entry point for the Bento Guard SDK.
 * 
 * @param instruction - The natural language instruction to be analyzed by LLM
 * @param rawTransaction - The raw transaction data to be simulated (Base64)
 * @param options - Optional configuration overrides
 * @returns The result of the protection analysis
 */
export async function protect(
  instruction: string,
  rawTransaction: string,
  options?: BentoProtectOptions
) {
  const client = BentoGuardClient.getInstance();
  return client.protect(instruction, rawTransaction, options);
}

// Export other useful modules
export * from './core/client';
export * from './errors/bento-error';
export * from './types';

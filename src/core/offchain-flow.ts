import { BentoProtectOptions, AnalysisResult } from '../types';
import { BentoError, BentoErrorCode } from '../errors/bento-error';
import { encodeActionPayload } from '../utils/borsh-helper';
import { encryptForRelayer } from '../utils/crypto-helper';
import { BentoGuardClient } from './client';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';

export async function offchainProtect(
  client: BentoGuardClient,
  instruction: string,
  signature: string,
  options?: BentoProtectOptions
): Promise<AnalysisResult> {
  try {
    console.log('🛡️  [Bento SDK] Running off-chain protect flow...');
    const agentKeypair = client.getAgentKeypair();
    const agentAddress = agentKeypair.publicKey.toBase58();

    const relayerInfo = await client.api.getRelayerInfo();
    const onchainConfig = await client.api.getOnchainConfig();
    const relayerPublicKey = new Uint8Array(onchainConfig.relayer_encryption_key);

    const vtx = client.parseInstruction(instruction, agentKeypair.publicKey);
    const txBytes = vtx.serialize();

    const plaintext = encodeActionPayload({
      prompt: instruction,
      tx: txBytes,
    });

    const encrypted = encryptForRelayer({
      plaintext,
      relayerPublicKey,
    });

    const encryptedPayloadB64 = Buffer.from(encrypted.payload).toString('base64');
    const base64Tx = Buffer.from(txBytes).toString('base64');
    
    // The backend expects the signature over the combined payload for verification
    const combinedPayload = `${encryptedPayloadB64}.${base64Tx}`;
    const messageBytes = new TextEncoder().encode(combinedPayload);
    const signatureBytes = nacl.sign.detached(messageBytes, agentKeypair.secretKey);
    const validSignature = bs58.encode(signatureBytes);

    const result = await client.api.postTransaction({
      agent_address: agentAddress,
      wallet_address: agentAddress,
      encrypted_payload: encryptedPayloadB64,
      signature: validSignature,
      base64_tx: base64Tx,
      network: client.config.network as string,
    });

    if (result.recommendation === 'BLOCKED') {
      throw new BentoError(
        BentoErrorCode.HIGH_RISK_DETECTED,
        `Action blocked: ${result.reasoning}`,
        result
      );
    }

    if (result.recommendation === 'ESCALATED') {
      console.warn(`[BENTO WARNING] Action escalated for review: ${result.reasoning}`);

      if (options?.autoPollEscalation === false || !result.actionId) {
        return result;
      }

      const pollInterval = options?.pollIntervalMs ?? 2000;
      const pollTimeout = options?.pollTimeoutMs ?? 300000;
      const startTime = Date.now();

      console.log(`[BENTO INFO] Pausing agent script to wait for Human-in-the-Loop decision on Action: ${result.actionId}...`);

      while (Date.now() - startTime < pollTimeout) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));

        try {
          const status = await client.api.getActionStatus(result.actionId);
          if (status.final_decision === 'ALLOW') {
            console.log(`[BENTO SUCCESS] Escalated action was APPROVED by the owner.`);
            return {
              ...result,
              recommendation: 'ALLOW',
              reasoning: `Approved by owner: ${status.reason || ''}`
            };
          } else if (status.final_decision === 'BLOCKED') {
            throw new BentoError(
              BentoErrorCode.HIGH_RISK_DETECTED,
              `Action blocked by owner: ${status.reason || ''}`,
              status
            );
          }
        } catch (err: any) {
          if (err instanceof BentoError) throw err;
          console.warn(`[BENTO WARNING] Error during action status polling: ${err.message}`);
        }
      }

      throw new BentoError(
        BentoErrorCode.HIGH_RISK_DETECTED,
        `Escalated action review timed out after ${pollTimeout / 1000}s waiting for owner approval.`
      );
    }

    return result;
  } catch (error: any) {
    if (error instanceof BentoError) throw error;
    throw BentoError.fromError(error);
  }
}

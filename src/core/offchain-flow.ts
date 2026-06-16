import { BentoProtectOptions, AnalysisResult } from "../types";
import { POLL_TIMEOUT_MS } from "../constants";
import { BentoError, BentoErrorCode } from "../errors/bento-error";
import { encodeActionPayload } from "../utils/borsh-helper";
import { encryptForRelayer } from "../utils/crypto-helper";
import { BentoGuardClient } from "./client";
import * as nacl from "tweetnacl";
import bs58 from "bs58";

export async function offchainProtect(
  client: BentoGuardClient,
  instruction: string,
  options?: BentoProtectOptions,
): Promise<AnalysisResult> {
  try {
    const agentKeypair = client.getAgentKeypair();
    const agentAddress = agentKeypair.publicKey.toBase58();

    const relayerInfo = await client.api.getRelayerInfo(options?.timeout);
    const onchainConfig = await client.api.getOnchainConfig(options?.timeout);
    const relayerPublicKey = new Uint8Array(
      onchainConfig.relayer_encryption_key,
    );

    const txBytes = Buffer.from("", "base64");

    const plaintext = encodeActionPayload({
      prompt: instruction,
      tx: txBytes,
    });

    const encrypted = encryptForRelayer({
      plaintext,
      relayerPublicKey,
    });

    const encryptedPayloadB64 = Buffer.from(encrypted.payload).toString(
      "base64",
    );
    const base64Tx = "";

    // The backend expects the signature over the combined payload for verification
    const combinedPayload = `${encryptedPayloadB64}.${base64Tx}`;
    const messageBytes = new TextEncoder().encode(combinedPayload);
    const signatureBytes = nacl.sign.detached(
      messageBytes,
      agentKeypair.secretKey,
    );
    const validSignature = bs58.encode(signatureBytes);

    const result = await client.api.postTransaction({
      agent_address: agentAddress,
      wallet_address: agentAddress,
      encrypted_payload: encryptedPayloadB64,
      signature: validSignature,
      base64_tx: base64Tx,
    }, options?.timeout);

    if (result.recommendation === "BLOCKED") {
      throw new BentoError(
        BentoErrorCode.HIGH_RISK_DETECTED,
        `Action blocked: ${result.reasoning}`,
        result,
      );
    }

    if (result.recommendation === "ESCALATED") {
      console.warn(`[BENTO WARNING] Action escalated for review: ${result.reasoning}`);
      if (result.reviewUrl) console.warn(`👀 Review URL: ${result.reviewUrl}`);

      if (options?.autoPollEscalation === false || !result.actionId) {
        return result;
      }

      const pollTimeout = POLL_TIMEOUT_MS;

      try {
        const status = await client.api.streamActionStatus(result.actionId, pollTimeout);
        if (status.final_decision === "ALLOW") {
          return {
            ...result,
            recommendation: "ALLOW",
            reasoning: `Approved by owner: ${status.reason || ""}`,
          };
        } else if (status.final_decision === "BLOCKED") {
          throw new BentoError(
            BentoErrorCode.HIGH_RISK_DETECTED,
            `Action blocked by owner: ${status.reason || ""}`,
            status,
          );
        }
      } catch (err: any) {
        if (err instanceof BentoError) throw err;
        throw new BentoError(
          BentoErrorCode.HIGH_RISK_DETECTED,
          `Escalated action review timed out or failed: ${err.message}`,
        );
      }
    }

    return result;
  } catch (error: any) {
    if (error instanceof BentoError) throw error;
    throw BentoError.fromError(error);
  }
}

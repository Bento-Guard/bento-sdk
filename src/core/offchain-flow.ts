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
    const timestamp = Date.now();

    // The backend expects the signature over the combined payload for verification
    // Added timestamp to prevent replay attacks
    const combinedPayload = `${encryptedPayloadB64}.${base64Tx}.${timestamp}`;
    const messageBytes = new TextEncoder().encode(combinedPayload);
    const signatureBytes = nacl.sign.detached(
      messageBytes,
      agentKeypair.secretKey,
    );
    const validSignature = bs58.encode(signatureBytes);

    const postRes = await client.api.postTransaction({
      agent_address: agentAddress,
      wallet_address: agentAddress,
      encrypted_payload: encryptedPayloadB64,
      signature: validSignature,
      base64_tx: base64Tx,
      timestamp,
    }, options?.timeout);

    if (!postRes.actionId) {
      throw new BentoError(
        BentoErrorCode.NETWORK_ERROR,
        "Failed to receive actionId from backend",
      );
    }

    if (!options?.silent) {
      console.log("⏳ Waiting for AI Firewall Security Analysis...");
    }

    // Wait for AI verdict via SSE
    const pollTimeout = options?.pollTimeoutMs || POLL_TIMEOUT_MS;
    const status = await client.api.streamActionStatus(postRes.actionId, pollTimeout);
    
    // Check if the streamActionStatus payload matches the structure
    // Since streamActionStatus returns { final_decision, reason, action_data, ... }
    
    const decision = status.final_decision;
    const result: AnalysisResult = {
      recommendation: decision === "ALLOW" ? "ALLOW" : decision === "ESCALATED" ? "ESCALATED" : "BLOCKED",
      riskScore: status.final_score || 0,
      reasoning: status.reason || "",
      actionId: postRes.actionId,
    };

    // Note: Since streamActionStatus waits for ALLOW/BLOCKED, 
    // it will never return ESCALATED here. The ESCALATED logic is handled by onEscalated callback.
    // If autoPollEscalation is disabled (which we haven't implemented yet in the new flow), it might.
    if (result.recommendation === "ESCALATED") {
      return result;
    }

    return result;
  } catch (error: any) {
    if (error instanceof BentoError) throw error;
    throw BentoError.fromError(error);
  }
}

import { PublicKey, VersionedTransaction, Connection } from "@solana/web3.js";
import { BentoProtectOptions, AnalysisResult } from "../types";
import { POLL_INTERVAL_MS, POLL_TIMEOUT_MS, CHUNK_SIZE } from "../constants";
import { BentoError, BentoErrorCode } from "../errors/bento-error";
import { encodeActionPayload } from "../utils/borsh-helper";
import {
  encryptForRelayer,
  commitmentHashAsArray,
} from "../utils/crypto-helper";
import { BentoGuardClient } from "./client";

export async function onchainProtect(
  client: BentoGuardClient,
  instruction: string,
  options?: BentoProtectOptions,
): Promise<AnalysisResult> {
  try {
    const agentKeypair = client.getAgentKeypair();
    const agentAddress = agentKeypair.publicKey.toBase58();

    // 1. Fetch system relayer and config details dynamically from backend
    console.log(
      "🔗 Fetching relayer and config bootstrap data from backend...",
    );
    const relayerInfo = await client.api.getRelayerInfo();
    const onchainConfig = await client.api.getOnchainConfig();

    const relayerPublicKey = new Uint8Array(
      onchainConfig.relayer_encryption_key,
    );

    // Use minimal dummy tx bytes to satisfy payload encoding (intent-only flow)
    // Matches the test script pattern: tx: new Uint8Array([1, 2, 3])
    const txBytes = new Uint8Array([1, 2, 3]);

    const plaintext = encodeActionPayload({
      prompt: instruction,
      tx: txBytes,
    });

    const encrypted = encryptForRelayer({
      plaintext,
      relayerPublicKey,
    });

    const commitmentHash = commitmentHashAsArray(plaintext);
    const totalDataLen = encrypted.payload.length;

    // Generate a unique monotonic action id
    const actionId = Date.now().toString();

    const targetProgram = relayerInfo.program_id; // Default to Bento program ID for tracking

    const buildInitRes = await client.api.buildInit({
      agent_public_addr: agentAddress,
      owner_pubkey: undefined, // Let Backend auto-resolve user owner pubkey from DB
      action_id: actionId,
      target_program: targetProgram,
      value: "0",
      total_data_len: totalDataLen,
    });

    // Deserialize and co-sign using AGENT_PRIVATE_KEY
    const initTxBytes = Buffer.from(buildInitRes.transaction, "base64");
    const initVtx = VersionedTransaction.deserialize(initTxBytes);
    initVtx.sign([agentKeypair]); // Local private key signature (Safe!)

    const signedInitTxBase64 = Buffer.from(initVtx.serialize()).toString(
      "base64",
    );

    const initActionRes = await client.api.initAction({
      agent_public_addr: agentAddress,
      owner_pubkey: undefined, // Let Backend auto-resolve user owner pubkey from DB
      action_id: actionId,
      target_program: targetProgram,
      value: "0",
      total_data_len: totalDataLen,
      signed_transaction: signedInitTxBase64,
    });

    // (Optional logging or parsing of actionPdaStr can remain if needed)

    const payloadBuffer = Buffer.from(encrypted.payload);

    let offset = 0;

    let finalizeRes: any = null;

    while (offset < payloadBuffer.length) {
      const chunkSlice = payloadBuffer.subarray(offset, offset + CHUNK_SIZE);
      const chunkBase64 = Buffer.from(chunkSlice).toString("base64");
      const chunkLen = chunkSlice.length;
      const isLastChunk = offset + chunkLen >= payloadBuffer.length;

      if (!isLastChunk) {
        // Build append transaction
        const buildAppendRes = await client.api.buildAppend({
          agent_public_addr: agentAddress,
          action_id: actionId,
          offset,
          chunk: chunkBase64,
        });

        const appendTxBytes = Buffer.from(buildAppendRes.transaction, "base64");
        const appendVtx = VersionedTransaction.deserialize(appendTxBytes);
        appendVtx.sign([agentKeypair]);

        const signedAppendTxBase64 = Buffer.from(
          appendVtx.serialize(),
        ).toString("base64");

        await client.api.appendPayload({
          agent_public_addr: agentAddress,
          action_id: actionId,
          offset,
          chunk_len: chunkLen,
          signed_transaction: signedAppendTxBase64,
        });
      } else {
        // Build append-and-finalize transaction
        const buildAppFinRes = await client.api.buildAppendAndFinalize({
          agent_public_addr: agentAddress,
          action_id: actionId,
          offset,
          chunk: chunkBase64,
          commitment_hash: Array.from(commitmentHash),
        });

        const appFinTxBytes = Buffer.from(buildAppFinRes.transaction, "base64");
        const appFinVtx = VersionedTransaction.deserialize(appFinTxBytes);
        appFinVtx.sign([agentKeypair]);

        const signedAppFinTxBase64 = Buffer.from(
          appFinVtx.serialize(),
        ).toString("base64");

        finalizeRes = await client.api.appendAndFinalize({
          agent_public_addr: agentAddress,
          action_id: actionId,
          offset,
          chunk_len: chunkLen,
          signed_transaction: signedAppFinTxBase64,
          trigger_verdict: true,
        });
      }

      offset += chunkLen;
    }

    // 7. Get final verdict details directly
    const verdict = finalizeRes.verdict;
    if (!verdict) {
      throw new BentoError(
        BentoErrorCode.NETWORK_ERROR,
        "Workflow executed but failed to retrieve AI/On-chain Verdict from backend.",
      );
    }

    const result: AnalysisResult = {
      recommendation:
        verdict.decision === "Approved"
          ? "ALLOW"
          : verdict.decision === "Escalated"
            ? "ESCALATED"
            : "BLOCKED",
      riskScore: verdict.raw_score / 100000, // Normalize to 0-1 range
      reasoning: verdict.reasoning,
      actionId: actionId,
    };

    // 6. Firewall and Human-in-the-Loop Polling if Escalated
    if (result.recommendation === "BLOCKED") {
      throw new BentoError(
        BentoErrorCode.HIGH_RISK_DETECTED,
        `Action blocked: ${result.reasoning}`,
        result,
      );
    }

    if (result.recommendation === "ESCALATED") {
      console.warn(
        `[BENTO WARNING] Action escalated for review: ${result.reasoning}`,
      );

      if (options?.autoPollEscalation === false) {
        return result;
      }

      const pollInterval = options?.pollIntervalMs || POLL_INTERVAL_MS;
      const pollTimeout = options?.pollTimeoutMs || POLL_TIMEOUT_MS;
      const startTime = Date.now();

      while (Date.now() - startTime < pollTimeout) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));

        try {
          const status = await client.api.getActionStatus(actionId);
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
          console.warn(
            `[BENTO WARNING] Error during action status polling: ${err.message}`,
          );
        }
      }

      throw new BentoError(
        BentoErrorCode.HIGH_RISK_DETECTED,
        `Escalated action review timed out after ${pollTimeout / 1000}s waiting for owner approval.`,
      );
    }

    return result;
  } catch (error: any) {
    if (error instanceof BentoError) throw error;
    throw BentoError.fromError(error);
  }
}

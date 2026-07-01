import { PublicKey, VersionedTransaction, Connection } from "@solana/web3.js";
import { BentoProtectOptions, AnalysisResult } from "../types";
import { POLL_TIMEOUT_MS, CHUNK_SIZE, BOOTSTRAP_TTL_MS } from "../constants";
import { BentoError, BentoErrorCode } from "../errors/bento-error";
import { encodeActionPayload } from "../utils/borsh-helper";
import {
  encryptForRelayer,
  commitmentHashAsArray,
} from "../utils/crypto-helper";
import { BentoGuardClient } from "./client";

let _bootstrapCache: {
  relayerInfo: any;
  onchainConfig: any;
  ts: number;
} | null = null;

async function getBootstrapConfig(client: BentoGuardClient, timeout?: number) {
  if (_bootstrapCache && Date.now() - _bootstrapCache.ts < BOOTSTRAP_TTL_MS) {
    return _bootstrapCache;
  }
  const relayerInfo = await client.api.getRelayerInfo(timeout);
  const onchainConfig = await client.api.getOnchainConfig(timeout);
  _bootstrapCache = { relayerInfo, onchainConfig, ts: Date.now() };
  return _bootstrapCache;
}

export async function onchainProtect(
  client: BentoGuardClient,
  instruction: string,
  options?: BentoProtectOptions,
): Promise<AnalysisResult> {
  try {
    const agentKeypair = client.getAgentKeypair();
    const agentAddress = agentKeypair.publicKey.toBase58();

    // 1. Fetch system relayer and config details dynamically from backend
    if (!options?.silent) {
      console.log(
        "🔗 Fetching relayer and config bootstrap data from backend...",
      );
    }
    const { relayerInfo, onchainConfig } = await getBootstrapConfig(client, options?.timeout);

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

    // Generate a unique monotonic action id (must be a valid u64 integer string for on-chain program)
    const actionId = Date.now().toString() + Math.floor(Math.random() * 100000).toString().padStart(5, '0');

    const targetProgram = relayerInfo.program_id; // Default to Bento program ID for tracking

    const buildInitRes = await client.api.buildInit({
      agent_public_addr: agentAddress,
      owner_pubkey: undefined, // Let Backend auto-resolve user owner pubkey from DB
      action_id: actionId,
      target_program: targetProgram,
      value: "0",
      total_data_len: totalDataLen,
    }, options?.timeout);

    // Deserialize and co-sign using AGENT_PRIVATE_KEY
    const initTxBytes = Buffer.from(buildInitRes.transaction, "base64");
    const initVtx = VersionedTransaction.deserialize(initTxBytes);
    initVtx.sign([agentKeypair]); // Local private key signature (Safe!)

    const signedInitTxBase64 = Buffer.from(initVtx.serialize()).toString("base64");
    await client.api.initAction({
      agent_public_addr: agentAddress,
      action_id: actionId,
      target_program: targetProgram,
      value: "0",
      total_data_len: totalDataLen,
      signed_transaction: signedInitTxBase64,
    }, options?.timeout);

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
        }, options?.timeout);

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
        }, options?.timeout);
      } else {
        // Build append-and-finalize transaction
        const buildAppFinRes = await client.api.buildAppendAndFinalize({
          agent_public_addr: agentAddress,
          action_id: actionId,
          offset,
          chunk: chunkBase64,
          commitment_hash: Array.from(commitmentHash),
        }, options?.timeout);

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
        }, options?.timeout);
      }

      offset += chunkLen;
    }

    if (!options?.silent) {
      console.log("⏳ Waiting for AI Firewall Security Analysis...");
    }

    const pollTimeout = options?.pollTimeoutMs || POLL_TIMEOUT_MS;
    
    // Define escalated handler
    const onEscalated = (payload: any) => {
      if (!options?.silent) {
        console.warn(`[BENTO WARNING] Action escalated for review: ${payload.reason || ""}`);
        if (payload.reviewUrl) console.warn(`👀 Review URL: ${payload.reviewUrl}`);
        if (payload.approveUrl) console.warn(`✅ Approve URL: ${payload.approveUrl}`);
        if (payload.blockUrl) console.warn(`🛑 Block URL: ${payload.blockUrl}`);
      }
      if (options?.autoPollEscalation === false) return false;
      return true;
    };

    const status = await client.api.streamActionStatus(actionId, pollTimeout, onEscalated);

    const decision = status.final_decision;
    const result: AnalysisResult = {
      recommendation: decision === "ALLOW" ? "ALLOW" : decision === "ESCALATED" ? "ESCALATED" : "BLOCKED",
      riskScore: status.final_score || 0,
      reasoning: status.reason || "",
      actionId: actionId,
      reviewUrl: status.reviewUrl,
      approveUrl: status.approveUrl,
      blockUrl: status.blockUrl,
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

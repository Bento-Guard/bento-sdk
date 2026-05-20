import { PublicKey, VersionedTransaction, Connection } from '@solana/web3.js';
import { BentoProtectOptions, AnalysisResult } from '../types';
import { BentoError, BentoErrorCode } from '../errors/bento-error';
import { encodeActionPayload } from '../utils/borsh-helper';
import { encryptForRelayer, commitmentHashAsArray } from '../utils/crypto-helper';
import { BentoGuardClient } from './client';

export async function onchainProtect(
  client: BentoGuardClient,
  instruction: string,
  signature: string,
  options?: BentoProtectOptions
): Promise<AnalysisResult> {
  try {
    console.log('🛡️  [Bento SDK] Running secure on-chain protect flow...');
    
    const agentKeypair = client.getAgentKeypair();
    const agentAddress = agentKeypair.publicKey.toBase58();

    // 1. Fetch system relayer and config details dynamically from backend
    console.log('🔗 Fetching relayer and config bootstrap data from backend...');
    const relayerInfo = await client.api.getRelayerInfo();
    const onchainConfig = await client.api.getOnchainConfig();
    
    const relayerPublicKey = new Uint8Array(onchainConfig.relayer_encryption_key);

    // 2. Build local Simulated transaction using the parser
    console.log('📝 Constructing local simulated Solana Transaction...');
    const vtx = client.parseInstruction(instruction, agentKeypair.publicKey);
    const txBytes = vtx.serialize();

    // 3. Borsh encode and encrypt the payload locally
    console.log('🔐 Hashing & Encrypting payload locally using Relayer public key...');
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
    console.log(`   * Action ID: ${actionId}`);
    console.log(`   * Total Payload Size: ${totalDataLen} bytes`);

    // 4. L1 Initialization (Co-signing protocol)
    console.log('🏛️  Initializing Action on Solana L1 (Co-signing with Relayer)...');
    const targetProgram = relayerInfo.program_id; // Default to Bento program ID for tracking

    const buildInitRes = await client.api.buildInit({
      agent_public_addr: agentAddress,
      owner_pubkey: undefined, // Let Backend auto-resolve user owner pubkey from DB
      action_id: actionId,
      target_program: targetProgram,
      value: '0',
      total_data_len: totalDataLen,
    });

    // Deserialize and co-sign using AGENT_PRIVATE_KEY
    const initTxBytes = Buffer.from(buildInitRes.transaction, 'base64');
    const initVtx = VersionedTransaction.deserialize(initTxBytes);
    initVtx.sign([agentKeypair]); // Local private key signature (Safe!)

    const signedInitTxBase64 = Buffer.from(initVtx.serialize()).toString('base64');

    console.log('🚀 Relaying signed L1 transaction to backend...');
    const initActionRes = await client.api.initAction({
      agent_public_addr: agentAddress,
      owner_pubkey: undefined, // Let Backend auto-resolve user owner pubkey from DB
      action_id: actionId,
      target_program: targetProgram,
      value: '0',
      total_data_len: totalDataLen,
      signed_transaction: signedInitTxBase64,
    });

    const actionPdaStr = initActionRes.action_pda;
    if (!actionPdaStr) {
      throw new BentoError(
        BentoErrorCode.NETWORK_ERROR,
        'Failed to retrieve action PDA from backend initialization.'
      );
    }
    const actionPda = new PublicKey(actionPdaStr);
    const magicblockRpcUrl = process.env.MAGICBLOCK_RPC_URL || 'https://devnet.magicblock.app';
    console.log(`⏳ Dynamic polling Magicblock ER (${magicblockRpcUrl}) for Action PDA ${actionPdaStr} synchronization...`);
    
    const connection = new Connection(magicblockRpcUrl, 'confirmed');
    let accountExists = false;
    const maxRetries = 40;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const accountInfo = await connection.getAccountInfo(actionPda);
        if (accountInfo) {
          console.log(`✅ Action PDA account synchronized on Magicblock ER! (Attempt ${attempt})`);
          accountExists = true;
          break;
        }
      } catch (err: any) {
        console.warn(`[BENTO] Polling attempt ${attempt} failed: ${err.message}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (!accountExists) {
      throw new BentoError(
        BentoErrorCode.NETWORK_ERROR,
        `Magicblock ER failed to synchronize the delegated Action account ${actionPdaStr} within timeout.`
      );
    }

    // 5. Append encrypted payload chunks (Co-signing sequential loop)
    console.log('📦 Appending encrypted payload chunks to Magicblock ER...');
    const payloadBuffer = Buffer.from(encrypted.payload);
    const CHUNK_SIZE = 900;
    let offset = 0;

    while (offset < payloadBuffer.length) {
      const chunkSlice = payloadBuffer.subarray(offset, offset + CHUNK_SIZE);
      const chunkBase64 = Buffer.from(chunkSlice).toString('base64');
      const chunkLen = chunkSlice.length;

      console.log(`   * Appending chunk at offset ${offset} (${chunkLen} bytes)...`);

      // Build append transaction with Relayer signature
      const buildAppendRes = await client.api.buildAppend({
        agent_public_addr: agentAddress,
        action_id: actionId,
        offset,
        chunk: chunkBase64,
      });

      const appendTxBytes = Buffer.from(buildAppendRes.transaction, 'base64');
      const appendVtx = VersionedTransaction.deserialize(appendTxBytes);
      appendVtx.sign([agentKeypair]); // Co-sign offline with Agent's private key

      const signedAppendTxBase64 = Buffer.from(appendVtx.serialize()).toString('base64');

      // Submit the signed append transaction
      await client.api.appendPayload({
        agent_public_addr: agentAddress,
        action_id: actionId,
        offset,
        chunk_len: chunkLen,
        signed_transaction: signedAppendTxBase64,
      });

      offset += chunkLen;
    }

    // 6. Finalize Action Building (Co-signing)
    console.log('🏁 Finalizing Action Building on Magicblock ER and triggering AI analysis...');
    const buildFinalizeRes = await client.api.buildFinalize({
      agent_public_addr: agentAddress,
      action_id: actionId,
      commitment_hash: commitmentHash,
    });

    const finalizeTxBytes = Buffer.from(buildFinalizeRes.transaction, 'base64');
    const finalizeVtx = VersionedTransaction.deserialize(finalizeTxBytes);
    finalizeVtx.sign([agentKeypair]); // Co-sign offline with Agent's private key

    const signedFinalizeTxBase64 = Buffer.from(finalizeVtx.serialize()).toString('base64');

    // Submit signed finalize transaction and get AI Analysis & Verdict
    const finalizeRes = await client.api.finalizeAction({
      agent_public_addr: agentAddress,
      action_id: actionId,
      signed_transaction: signedFinalizeTxBase64,
      trigger_verdict: true,
    });

    // 7. Get final verdict details directly
    const verdict = finalizeRes.verdict;
    if (!verdict) {
      throw new BentoError(
        BentoErrorCode.NETWORK_ERROR,
        'Workflow executed but failed to retrieve AI/On-chain Verdict from backend.'
      );
    }

    const result: AnalysisResult = {
      recommendation: verdict.decision === 'Approved' ? 'ALLOW' : verdict.decision === 'Escalated' ? 'ESCALATED' : 'BLOCKED',
      riskScore: verdict.raw_score / 100000, // Normalize to 0-1 range
      reasoning: verdict.reasoning,
      actionId: actionId,
    };

    console.log(`✨ On-chain E2E protection completed! Recommendation: ${result.recommendation}`);

    // 6. Firewall and Human-in-the-Loop Polling if Escalated
    if (result.recommendation === 'BLOCKED') {
      throw new BentoError(
        BentoErrorCode.HIGH_RISK_DETECTED,
        `Action blocked: ${result.reasoning}`,
        result
      );
    }

    if (result.recommendation === 'ESCALATED') {
      console.warn(`[BENTO WARNING] Action escalated for review: ${result.reasoning}`);

      if (options?.autoPollEscalation === false) {
        return result;
      }

      const pollInterval = options?.pollIntervalMs ?? 2000;
      const pollTimeout = options?.pollTimeoutMs ?? 300000; // 5 minutes default
      const startTime = Date.now();

      console.log(`[BENTO INFO] Pausing agent script to wait for Human-in-the-Loop decision on Action: ${actionId}...`);

      while (Date.now() - startTime < pollTimeout) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));

        try {
          const status = await client.api.getActionStatus(actionId);
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

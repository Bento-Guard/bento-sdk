import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import * as dotenv from 'dotenv';
import * as nacl from 'tweetnacl';
import { BentoGuardClient } from './src/core/client';

// Load environment variables locally (SDK environment only)
dotenv.config();

async function runProtectFlow() {
  console.log('[Bento Guard] Starting Simplified SDK Protect Flow...');

  // 1. Get Agent Keypair from environment
  const agentKey = process.env.AGENT_WALLET_PRIVATE_KEY || process.env.AGENT_PRIVATE_KEY;
  if (!agentKey) {
    throw new Error('No agent key configured in env (AGENT_PRIVATE_KEY or AGENT_WALLET_PRIVATE_KEY). Please set this in .env');
  }

  let agentKeyBytes: Uint8Array;
  if (agentKey.includes(',')) {
    agentKeyBytes = Uint8Array.from(agentKey.split(',').map(Number));
  } else {
    agentKeyBytes = bs58.decode(agentKey);
  }
  const agentKeypair = Keypair.fromSecretKey(agentKeyBytes);
  const agentAddress = agentKeypair.publicKey.toBase58();
  console.log(`[System] Loaded Agent Wallet Address: ${agentAddress}`);

  // 2. Initialize the Bento SDK
  const client = BentoGuardClient.initialize({
    agentWalletPrivateKey: agentKey,
    endpoint: process.env.BENTO_API_URL || 'http://localhost:4001',
    network: 'solana' as any,
  });

  try {
    // 3. Prepare the Natural Language Instruction
    const instruction = 'Send 100 SOL to recipient address 2cSiFhzwbymqr5aTiFacbidJNZ5vNK7Zdb9osbdfcKwG';
    console.log(`\n[Input] Instruction: "${instruction}"`);

    // 4. Generate Ed25519 signature of the instruction using the Agent's private key
    console.log('[System] Signing instruction with Agent\'s private key...');
    const messageBytes = new TextEncoder().encode(instruction);
    const signatureBytes = nacl.sign.detached(messageBytes, agentKeypair.secretKey);
    const signatureBase58 = bs58.encode(signatureBytes);
    console.log(`[System] Signature (Base58): ${signatureBase58}`);

    // 5. Submit protection request
    console.log('\n[Action] Calling client.protect(instruction, signature)...');
    const result = await client.protect(instruction, signatureBase58);

    console.log('\n[Result] SDK protect() successfully completed.');
    console.log(`- Decision Recommendation: ${result.recommendation}`);
    console.log(`- Risk Score: ${result.riskScore !== undefined ? result.riskScore * 100 : 'N/A'}%`);
    console.log(`- Threat Analysis Reasoning: ${result.reasoning}`);
    
    if (result.actionId) {
      console.log(`- Action Log ID: ${result.actionId}`);
    }

  } catch (err: any) {
    console.error('\n[Error] Flow Failed:', err.message);
    if (err.details) {
      console.error('Error Details:', JSON.stringify(err.details, null, 2));
    }
    process.exit(1);
  }
}

runProtectFlow();

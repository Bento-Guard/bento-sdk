import { Keypair } from '@solana/web3.js';
import { x25519 } from '@noble/curves/ed25519';
import bs58 from 'bs58';
import * as dotenv from 'dotenv';
import * as path from 'path';
import axios from 'axios';
import * as nacl from 'tweetnacl';

// Load env from the backend folder to get contract addresses and relayer secret
dotenv.config({ path: path.join(__dirname, '../Backend/.env') });
dotenv.config(); // Fallback to current folder .env

import { BentoGuardClient } from './src/core/client';

async function runOnChainDemo() {
  console.log('🛡️  [Bento Guard] Initializing Zero-Setup On-Chain SDK Demo...');

  const BACKEND_URL = 'http://localhost:4001/api/v1';

  // Generate Agent Wallet dynamically for zero-setup demo
  const agentKeypair = Keypair.generate();
  const agentWalletKey = bs58.encode(agentKeypair.secretKey);

  console.log(`   * Generated Agent Wallet: ${agentKeypair.publicKey.toBase58()}`);

  // Derive the relayer public key from the backend's secret key
  const relayerSecretHex = process.env.RELAYER_ENCRYPTION_SECRET_HEX || '55fa41d37d1fe2593dcf79aaf994e9121d7852a8150ef560245f4f35eb07e9b3';
  const relayerSecretBytes = new Uint8Array(Buffer.from(relayerSecretHex, 'hex'));
  const relayerPubkeyBytes = x25519.getPublicKey(relayerSecretBytes);
  const relayerPubkeyBase58 = bs58.encode(relayerPubkeyBytes);

  console.log(`   * Relayer X25519 Public Key: ${relayerPubkeyBase58}`);

  // 1. Initialize SDK
  const client = BentoGuardClient.initialize({
    agentWalletPrivateKey: agentWalletKey,
    endpoint: 'http://localhost:4001', // Local backend port
    network: 'solana' as any,
  });

  // 2. Generate a random Owner Keypair (Relayer sponsors all on-chain gas costs!)
  const ownerKeypair = Keypair.generate();
  const ownerAddress = ownerKeypair.publicKey.toBase58();
  console.log(`   * Generated Owner Wallet: ${ownerAddress}`);

  try {
    // ──────────────────────────────────────────────────────────────────
    // Step 2.1: Web3 Auth Login for Owner
    // ──────────────────────────────────────────────────────────────────
    console.log('\n--- [Auth] Logging in via Phantom Web3 Signature ---');
    
    const nonceRes = await axios.get(`${BACKEND_URL}/auth/nonce?address=${ownerAddress}`);
    const nonceMessage = nonceRes.data.data.message;
    console.log('   * Nonce Challenge received:', nonceMessage.replace(/\n/g, ' '));

    const messageBytes = new TextEncoder().encode(nonceMessage);
    const signatureBytes = nacl.sign.detached(messageBytes, ownerKeypair.secretKey);
    const base58Signature = bs58.encode(signatureBytes);

    const verifyRes = await axios.post(`${BACKEND_URL}/auth/verify`, {
      address: ownerAddress,
      signature: base58Signature,
    });

    // Retrieve token from Cookie or response
    let token = '';
    const rawCookies = verifyRes.headers['set-cookie'] || [];
    for (const cookie of rawCookies) {
      if (cookie.startsWith('access_token=')) {
        token = decodeURIComponent(cookie.split(';')[0].split('=')[1]);
        break;
      }
    }

    if (!token && verifyRes.data?.data?.token) {
      token = verifyRes.data.data.token;
    }

    if (!token) {
      throw new Error('Failed to retrieve access token from cookies or response body');
    }
    
    console.log('✅ Web3 Signature Verified successfully! JWT Token:', token.slice(0, 15) + '...');
    
    // Set the token in our Bento SDK Client
    client.setAuthToken(token);

    // 3. Onboard the Agent On-Chain (Init Register + Delegate to Ephemeral Rollup)
    console.log('\n🚀 [Phase 1] Onboarding Agent con-wallet fully on-chain...');
    await client.onboardAgentOnChain({
      ownerKeypair,
      spendLimit: 5_000_000, // 0.005 SOL limit
      name: 'ZeroSetup-Sentinel-Agent',
      icon: '🛡️',
    });

    // 4. Run On-Chain Action Protection Workflow (Init -> Append -> Finalize)
    console.log('\n🚀 [Phase 2] Initiating Protected On-Chain Action...');
    const instruction = 'Swap 0.01 SOL to USDC on Orca';
    const mockTargetTxBase64 = 'SGVsbG8gT25DaGFpbiBCZW50byE='; // Mock tx base64
    const targetProgramAddr = 'whirLbMiicvdaTuabbgacgg98x84C5Ussp71t3EAgSG'; // Real Orca Whirlpool Program ID

    const result = await client.protect(
      instruction,
      mockTargetTxBase64,
      {
        onChain: true,
        ownerKeypair,
        relayerPublicKey: relayerPubkeyBase58,
        targetProgram: targetProgramAddr,
        value: '10000000', // 0.01 SOL in lamports
        triggerVerdict: true,
      }
    );

    console.log('\n✨ [Success] On-chain workflow successfully completed!');
    console.log(`   * Decision Recommendation: ${result.recommendation}`);
    console.log(`   * Threat Analysis Reasoning: ${result.reasoning}`);
    if (result.riskScore !== undefined) {
      console.log(`   * Risk Score: ${result.riskScore}%`);
    }

  } catch (err: any) {
    console.error('\n❌ On-Chain Demo Failed:', err.message);
    if (err.details?.response?.data) {
      console.error('Server response:', JSON.stringify(err.details.response.data, null, 2));
    } else if (err.response?.data) {
      console.error('Server response:', JSON.stringify(err.response.data, null, 2));
    }
  }
}

runOnChainDemo();

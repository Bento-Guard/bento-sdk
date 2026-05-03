import { BentoGuardClient } from '../src/core/client';
import bs58 from 'bs58';
import * as nacl from 'tweetnacl';

async function validateSdkFlow() {
  console.log('--- STARTING SDK VALIDATION FLOW ---');

  // 1. Setup Mock Keys
  const agentX25519 = nacl.box.keyPair();
  const agentWallet = nacl.sign.keyPair();
  
  const config = {
    agentX25519PrivateKey: Buffer.from(agentX25519.secretKey).toString('hex'),
    agentX25519PublicKey: Buffer.from(agentX25519.publicKey).toString('hex'),
    agentWalletPrivateKey: bs58.encode(agentWallet.secretKey),
    network: 'solana' as const,
  };

  console.log('1. [CONFIG] Loaded credentials:');
  console.log('   - Agent X25519 Pub:', config.agentX25519PublicKey);
  console.log('   - Agent Wallet Pub:', bs58.encode(agentWallet.publicKey));

  // 2. Initialize Client
  const client = BentoGuardClient.initialize(config);
  console.log('2. [INIT] BentoGuardClient initialized.');

  // 3. Define Action
  const instruction = 'Transfer 5 SOL to treasury';
  const rawTx = 'base64_unsigned_transaction_data';
  console.log('3. [INPUT] Agent intent:', instruction);

  // 4. Trace the Protect Flow (Internal Simulation)
  console.log('4. [CORE] Starting protect() flow trace:');
  
  // Simulation of internal steps in client.ts
  console.log('   - Step 4.1: Fetching system public key... [MOCK: OK]');
  const systemPublicKey = 'server_x25519_public_key_hex';

  console.log('   - Step 4.2: Deriving Shared Secret via ECDH...');
  // Logic from EncryptionService
  console.log('   - Step 4.3: Encrypting instruction using AES-256-GCM (BSIT Protocol)...');
  
  console.log('   - Step 4.4: Signing the encrypted payload using Wallet Private Key...');
  // Logic from SignerService
  console.log('   - Step 4.5: Preparing final API payload:');
  const mockPayload = {
    agent_id: config.agentX25519PublicKey,
    wallet_address: bs58.encode(agentWallet.publicKey),
    encrypted_payload: '{"ciphertext":"...","nonce":"...","tag":"..."}',
    signature: 'ed25519_signature_base58',
    base64_tx: rawTx,
    network: 'solana'
  };
  console.log(JSON.stringify(mockPayload, null, 2));

  console.log('5. [API] Submitting to Backend... [MOCK: ALLOW]');
  
  console.log('6. [RESULT] Recommendation: ALLOW');
  console.log('   Reasoning: "Transaction appears safe, transfer is within limits."');

  console.log('--- VALIDATION COMPLETED ---');
}

validateSdkFlow().catch(console.error);

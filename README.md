# Bento Guard SDK 🛡️

The official SDK for integrating **Bento Guard** AI-powered security into your autonomous agents. Protect your agentic workflows with on-the-fly LLM auditing and simulation-based guardrails.

## 🚀 Installation

```bash
npm install @bento/sdk
```

Ensure you have a `.env` file with the following credentials:

```env
# Communication Keys (X25519) - Used for E2E Encryption (BSIT)
AGENT_X25519_PRIVATE_KEY=your_x25519_private_key_hex
AGENT_X25519_PUBLIC_KEY=your_x25519_public_key_hex

# Identity Key (Wallet) - Used for Request Signing
AGENT_WALLET_PRIVATE_KEY=your_wallet_private_key_bs58
```

## 🔄 The Guarded Workflow

Bento Guard should be integrated **after** your agent generates a transaction but **before** it signs and broadcasts it to the blockchain.

1. **Plan**: Agent decides on an action (Instruction).
2. **Build**: Agent creates a raw, unsigned transaction data.
3. **Guard**: SDK audits the instruction and simulates the raw transaction.
4. **Execute**: If allowed, Agent signs and sends the transaction.

## 🛠️ Real-world Integration (Solana Example)

Here is how you actually use it in a production agent:

```typescript
import { protect, BentoClient } from '@bento/sdk';
import { Connection, Transaction, SystemProgram, PublicKey, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

// 1. Initialize SDK (Do this once at startup)
BentoClient.initialize({
  agentX25519PrivateKey: process.env.AGENT_X25519_PRIVATE_KEY!,
  agentX25519PublicKey: process.env.AGENT_X25519_PUBLIC_KEY!,
  agentWalletPrivateKey: process.env.AGENT_WALLET_PRIVATE_KEY!, // Your BS58 Private Key
});

async function executeAgentAction() {
  const connection = new Connection("https://api.mainnet-beta.solana.com");
  // Load your agent's wallet
  const agentWallet = Keypair.fromSecretKey(bs58.decode(process.env.AGENT_WALLET_PRIVATE_KEY!));
  
  // --- 1. AGENT LOGIC ---
  const instruction = "Transfer 1.5 SOL to DemoAccount";
  
  // Build raw transaction (Unsigned)
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: agentWallet.publicKey,
      toPubkey: new PublicKey("...destination..."),
      lamports: 1.5 * 1e9,
    })
  );
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  transaction.feePayer = agentWallet.publicKey;

  // Serialize to Base64 for the Guard (requireAllSignatures: false allows auditing before signing)
  const rawTx = transaction.serialize({ requireAllSignatures: false }).toString('base64');

  // --- 2. BENTO GUARD PROTECTION ---
  try {
    console.log("🛡️ Auditing action...");
    const audit = await protect(instruction, rawTx);
    
    if (audit.recommendation === 'ALLOW') {
      console.log("✅ Safe to proceed:", audit.reasoning);
      
      // --- 3. EXECUTION ---
      // Now it's safe to sign and broadcast
      const signature = await connection.sendTransaction(transaction, [agentWallet]);
      console.log("🚀 Transaction sent:", signature);
    }
  } catch (error: any) {
    if (error.code === 'HIGH_RISK_DETECTED') {
      console.error("❌ ACTION BLOCKED:", error.message);
      // Critical: The agent logic stops here and doesn't sign the transaction.
    } else {
      console.error("⚠️ Guard Error:", error.message);
    }
  }
}
```

## 🛡️ Security Features

- **BSIT Protocol**: End-to-end encrypted tunneling ensures your agent's instructions are never visible to ISPs or malicious actors in transit.
- **Identity Verification**: Every request is signed with your agent's wallet key, ensuring that only authorized agents can access your security policies.
- **Firewall Mode**: Automatically throws an exception if the AI risk score exceeds safety thresholds, preventing malicious code from executing transactions.

## 📝 License

MIT

import { BentoClient, protect } from '@bentoguard/sdk';
import dotenv from 'dotenv';
dotenv.config();

async function runDemo() {
  console.log("🛡️ Initializing Bento Guard...");
  BentoClient.initialize({
    agentX25519PrivateKey: process.env.AGENT_X25519_PRIVATE_KEY!,
    agentX25519PublicKey: process.env.AGENT_X25519_PUBLIC_KEY!,
    agentWalletPrivateKey: process.env.AGENT_WALLET_PRIVATE_KEY!,
  });
  const instruction = "Transfer 1.0 SOL to UserX";
  const mockTx = "SGVsbG8gQmVudG8h";
  try {
    const audit = await protect(instruction, mockTx);
    console.log("Result:", audit.recommendation);
    console.log("Reason:", audit.reasoning);
  } catch (err) {
    console.error("Guard Error:", err.message);
  }
}
runDemo();
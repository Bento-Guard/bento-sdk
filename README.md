# Bento Guard SDK 🛡️

The official SDK for integrating **Bento Guard** AI-powered security into your autonomous agents.

## 🚀 Installation

```bash
npm install @bento/guard-sdk
```

## ⚙️ Environment Configuration

Ensure you have a `.env` file with the following credentials:

```env
BENTO_BACKEND_URL=https://api.bento-guard.com
AGENT_X25519_PRIVATE_KEY=your_agent_x25519_private_key_hex
AGENT_X25519_PUBLIC_KEY=your_agent_x25519_public_key_hex
```

## 🛠️ Usage

### 1. Manual Initialization (Recommended)

```typescript
import { protect, BentoGuardClient } from '@bento/guard-sdk';

// Initialize the SDK once at the start of your application
BentoGuardClient.initialize({
  backendUrl: process.env.BENTO_BACKEND_URL!,
  agentX25519PrivateKey: process.env.AGENT_X25519_PRIVATE_KEY!,
  agentX25519PublicKey: process.env.AGENT_X25519_PUBLIC_KEY!,
  network: 'solana'
});

async function runAgent() {
  const instruction = "Transfer 1.5 SOL to 0x123...";
  const rawTx = "base64_encoded_transaction_data";

  try {
    // Audit the action before execution
    const result = await protect(instruction, rawTx);
    
    if (result.recommendation === 'ALLOW') {
      // Proceed with your agent logic (sign & send transaction)
      console.log("Safe to proceed:", result.reasoning);
    } else {
      console.error("Action blocked:", result.reasoning);
      // Logic to halt the agent or alert the user
    }
  } catch (error) {
    console.error("Bento Guard error:", error.message);
  }
}
```

### 2. Zero-Config (Auto-load from .env)

If you have configured your environment variables matching the keys above, you can simply call `protect()` directly. The SDK will initialize itself on the first call.

```typescript
import { protect } from '@bento/guard-sdk';

// SDK automatically loads credentials from process.env
const result = await protect(instruction, rawTx);
```

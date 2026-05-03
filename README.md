# Bento Guard SDK 🛡️

The official SDK for integrating **Bento Guard** AI-powered security into your autonomous agents. Protect your agentic workflows with on-the-fly LLM auditing and simulation-based guardrails.

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
import { protect, BentoClient } from '@bento/guard-sdk';

// Initialize once at startup
BentoClient.initialize({
  backendUrl: process.env.BENTO_BACKEND_URL!,
  agentX25519PrivateKey: process.env.AGENT_X25519_PRIVATE_KEY!,
  agentX25519PublicKey: process.env.AGENT_X25519_PUBLIC_KEY!,
});

async function runAgent() {
  const instruction = "Transfer 1.5 SOL to 0x123...";
  const rawTx = "base64_encoded_transaction_data";

  try {
    const result = await protect(instruction, rawTx);
    
    if (result.recommendation === 'ALLOW') {
      console.log("Safe to proceed:", result.reasoning);
      // Proceed with execution...
    }
  } catch (error: any) {
    // Handle security blocks specifically
    if (error.code === 'HIGH_RISK_DETECTED') {
      console.error("⛔ Action Blocked:", error.message);
      console.table(error.details);
    } else {
      console.error("❌ Bento Guard Error:", error.message);
    }
  }
}
```

### 2. Zero-Config (Auto-load)

If your `.env` keys match the names in the Configuration section, you can call `protect()` immediately.

```typescript
import { protect } from '@bento/guard-sdk';

const result = await protect("Burn all assets", "raw_tx_data");
```

## 🛡️ Security Features

- **BSIT Protocol**: End-to-end encrypted tunneling ensures your agent's instructions are never visible to ISPs or malicious actors in transit.
- **Local Key Derivation**: Private keys never leave your agent's environment.
- **Firewall Mode**: Automatically throws an exception if the AI risk score exceeds safety thresholds.

## 📝 License

MIT

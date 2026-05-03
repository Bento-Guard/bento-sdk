# Bento Guard SDK 🛡️

The official SDK for integrating **Bento Guard** AI-powered security into your autonomous agents.

## 🚀 Installation

```bash
npm install @bento/guard-sdk
```

## 🛠️ Usage

```typescript
import { protect } from '@bento/guard-sdk';

async function runAgent() {
  const instruction = "Transfer 1.5 SOL to 0x123...";
  const rawTx = "base64_encoded_transaction_data";

  try {
    const result = await protect(instruction, rawTx);
    
    if (result.recommendation === 'ALLOW') {
      // Proceed with execution
    } else {
      console.error("Action blocked:", result.reasoning);
    }
  } catch (error) {
    console.error("Bento Guard error:", error.message);
  }
}
```

## ⚙️ Configuration

Set the following environment variables:
- `BENTO_BACKEND_URL`
- `AGENT_X25519_PRIVATE_KEY`
- `AGENT_X25519_PUBLIC_KEY`
- `AGENT_PRIVATE_WALLET_KEY`

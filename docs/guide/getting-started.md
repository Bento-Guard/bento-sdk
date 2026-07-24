# Getting Started

Welcome to the **Bento Guard SDK**. This SDK provides an AI-powered security infrastructure for autonomous agents on the Solana blockchain.

## Installation

Install the SDK via npm:

```bash
npm install @bentoguard/sdk
```

## Quick Start

Here is a quick example of how to initialize the SDK and verify an agent's identity.

```typescript
import { BentoGuard } from '@bentoguard/sdk';

// Initialize the SDK
const guard = new BentoGuard({
  network: 'mainnet-beta',
  apiKey: process.env.BENTO_API_KEY
});

// Verify an agent identity
async function verify() {
  const isSecure = await guard.verifyAgent('agent_public_key');
  
  if (isSecure) {
    console.log('Agent is verified and secure!');
  }
}

verify();
```

## Next Steps

- Check out our [Workflow Guidelines](/workflow-guidelines) to understand how to contribute.
- Explore the API Reference (coming soon).

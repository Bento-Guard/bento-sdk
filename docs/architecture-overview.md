# Architecture

Bento Guard SDK provides a secure layer for Autonomous AI Agents operating on the Solana blockchain. Below is the detailed workflow of how Bento Guard secures autonomous agent transactions, broken down into 3 phases.

## Phase 1: Registration & Initialization

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as User UI
    participant Wallet as Connect Wallet
    participant Agent as AI Agent
    participant Chain as Solana Blockchain
    
    User->>UI: Access Dashboard & Connect Wallet
    UI->>Wallet: Request wallet connection
    Wallet-->>UI: Return User's Public Key
    User->>UI: Configure Agent Limits
    UI->>Wallet: Request signature
    Wallet->>Chain: Broadcast Tx (Register Agent)
    Chain-->>UI: Return Tx Hash (Success)
    UI-->>Agent: Grant permissions
```

## Phase 2: AI Protect Flow & Cross-Analysis

```mermaid
sequenceDiagram
    autonumber
    participant Agent as AI Agent
    participant SDK as Bento SDK
    participant Relayer as Backend Relayer
    participant TxParser as Tx Parser
    participant LLM1 as Primary LLM (Gemini)
    participant LLM2 as Verifier LLM (Claude)
    
    Agent->>Agent: Generate Prompt & Raw Tx
    Agent->>SDK: Call `bento.protect()`
    SDK->>Relayer: Send Encrypted Payload
    Relayer->>TxParser: Send Raw Tx Bytes
    TxParser-->>Relayer: Parsed Evidence
    
    Relayer->>LLM1: Semantic & Risk Analysis
    LLM1-->>Relayer: Primary Result
    
    Relayer->>Relayer: Deterministic Policy Evaluation
    
    opt Verifier Triggered
        Relayer->>LLM2: Send Prompt & Tx (Fallback)
        LLM2-->>Relayer: Verifier Result
    end
    
    Relayer->>Relayer: Finalize Verdict (ALLOW / ESCALATE / BLOCK)
    Relayer-->>SDK: Return Verdict
```

## Phase 3: Settlement

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as User UI
    participant Wallet as Connect Wallet
    participant Agent as AI Agent
    participant SDK as Bento SDK
    participant Relayer as Backend
    participant Chain as Solana
    
    alt Verdict == ALLOW
        SDK-->>Agent: Return ALLOW
        Agent->>Chain: Sign & Broadcast Tx
        Chain-->>Agent: Tx Confirmed
    else Verdict == ESCALATE
        SDK-->>Agent: Return ESCALATED (Paused)
        Relayer->>UI: Push WebSocket Notification
        User->>UI: Review Risks
        User->>Wallet: Approve & Sign
        Wallet->>Chain: Broadcast Tx directly
    else Verdict == BLOCK
        SDK-->>Agent: Return Error (Blocked)
        Relayer->>Chain: Record Strike against Agent
    end
```

## Key Components

1. **AI Agent**: The autonomous entity making decisions based on user input or internal logic.
2. **Bento Guard SDK**: The core security middleware. It enforces policies (e.g., spending limits, authorized actions) and ensures that the agent cannot perform malicious or unauthorized operations.
3. **Solana Blockchain**: The decentralized network where the final transactions are executed and recorded immutably.

# Bento Guard Finance Agent Sample 🛡️

Welcome to the **Bento Guard** sample project. This is a terminal-based financial Agent integrated with an AI-powered security layer to protect blockchain transactions.

## 🌟 Key Features

- **AI Intent Analysis**: Powered by Google Gemini to understand user requests and convert them into executable intents.
- **Bento Guard Protection**: Every agent action is audited by the Bento Guard SDK before execution.
- **Real-time Risk Scoring**: Instant display of risk scores and detailed security reasoning directly in your terminal.
- **Scenario Mode**: Built-in attack scenarios to demonstrate how Bento Guard blocks malicious activities.

## 🚀 Getting Started (Step-by-Step)

### Step 1: Install Dependencies
Navigate to this directory and run:
```bash
npm install
```

### Step 2: Environment Configuration (`.env`)
If you used `npx bentoguard` to set up this sample, your `.env` is already configured. Otherwise, ensure the following keys are present in your `.env` file:
- `GEMINI_API_KEY`: Your API Key from Google AI Studio.
- `AGENT_WALLET_PRIVATE_KEY`: Your Solana wallet private key (must be registered on the Bento Dashboard).

### Step 3: Launch the Agent
There are two ways to run the Bento Guard Finance Agent:

#### Option A: Interactive Chat Mode (Default)
Run the following command to start chatting with your Agent in real-time:
```bash
npm start
```

**Available Chat Commands:**
- **Free Chat**: Type any intent like "Transfer 0.5 SOL to 8x...".
- **`/demo`**: Run 5 predefined security scenarios to see how Bento Guard works.
- **`/exit`**: Terminate the session.

#### Option B: Automatic Demo Mode
If you just want to run the 5 predefined security scenarios automatically without entering the interactive chat, use this command:
```bash
APP_MODE=DEMO npm start
```

## 📚 Project Structure

- `main.ts`: Entry point, managing the Chat and Demo loops.
- `gemini-agent.ts`: Agent logic using Google Gemini for planning.
- `security-layer.ts`: Integration point for the Bento Guard SDK.
- `scenarios.ts`: Predefined security scenarios for testing purposes.

---
**Note**: This is a Sandbox environment. Transactions generated are unsigned drafts and are not broadcast to the Mainnet, ensuring your assets remain safe during testing.

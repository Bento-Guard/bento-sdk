#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

try {
  const prompts = require('prompts');
  const chalk = require('chalk');
  const { Keypair } = require('@solana/web3.js');
  const nacl = require('tweetnacl');
  const bs58 = require('bs58').default || require('bs58');

  async function setup() {
    if (!process.stdout.isTTY) {
      console.log(chalk.yellow('⚠️  Setup requires an interactive terminal.'));
      console.log(chalk.white('To complete configuration, please run: ') + chalk.cyan('npx bento-setup\n'));
      return;
    }

    const { choice } = await prompts({
      type: 'select',
      name: 'choice',
      message: 'How would you like to set up your Agent credentials?',
      choices: [
        { title: 'Input my existing keys (from Bento Dashboard)', value: 'manual' },
        { title: 'Generate a new secure identity (Auto-generate)', value: 'auto' },
        { title: 'Skip and configure manually later', value: 'skip' }
      ],
      initial: 0
    });

    if (!choice || choice === 'skip') {
      console.log(chalk.gray('\nSkipping setup. Don\'t forget to configure your .env file later!'));
      return;
    }

    let config = {
      AGENT_WALLET_PRIVATE_KEY: '',
      AGENT_X25519_PRIVATE_KEY: '',
      AGENT_X25519_PUBLIC_KEY: ''
    };

    if (choice === 'auto') {
      console.log(chalk.yellow('\n[System: Generating new secure identity...]'));
      const wallet = Keypair.generate();
      config.AGENT_WALLET_PRIVATE_KEY = bs58.encode(wallet.secretKey);
      const xKey = nacl.box.keyPair();
      config.AGENT_X25519_PRIVATE_KEY = Buffer.from(xKey.secretKey).toString('hex');
      config.AGENT_X25519_PUBLIC_KEY = Buffer.from(xKey.publicKey).toString('hex');
      console.log(chalk.green('✨ New security keys generated successfully.\n'));
    } else {
      console.log(chalk.cyan('\n🚀 Please provide your credentials from the Bento Dashboard:'));
      const manualAnswers = await prompts([
        {
          type: 'password',
          name: 'walletKey',
          message: 'Agent Private Wallet Key (Solana Base58):'
        },
        {
          type: 'password',
          name: 'xPrivate',
          message: 'Agent X25519 Private Key (Hex):'
        },
        {
          type: 'text',
          name: 'xPublic',
          message: 'Agent X25519 Public Key (Hex):'
        }
      ]);

      if (!manualAnswers.walletKey) return;
      config.AGENT_WALLET_PRIVATE_KEY = manualAnswers.walletKey;
      config.AGENT_X25519_PRIVATE_KEY = manualAnswers.xPrivate;
      config.AGENT_X25519_PUBLIC_KEY = manualAnswers.xPublic;
    }

    const { generateExample } = await prompts({
      type: 'toggle',
      name: 'generateExample',
      message: 'Would you like to generate a sample integration file?',
      initial: true,
      active: 'yes',
      inactive: 'no'
    });

    const envContent = `
# Agent Credentials
AGENT_X25519_PRIVATE_KEY=${config.AGENT_X25519_PRIVATE_KEY}
AGENT_X25519_PUBLIC_KEY=${config.AGENT_X25519_PUBLIC_KEY}
AGENT_WALLET_PRIVATE_KEY=${config.AGENT_WALLET_PRIVATE_KEY}
    `.trim();

    fs.writeFileSync(path.join(process.cwd(), '.env'), envContent);
    console.log(chalk.green('\n✅ Configuration saved to .env'));

    if (generateExample) {
      const exampleContent = `
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
      `.trim();
      fs.writeFileSync(path.join(process.cwd(), 'bento-demo.ts'), exampleContent);
      console.log(chalk.green('🚀 Sample file created.'));
    }

    console.log('\n' + chalk.gray('---------------------------------------------------------------------------------'));
    console.log(chalk.blue('🔗 Website: ') + chalk.underline('https://bentoguard.xyz/'));
    console.log(chalk.blue('🐦 X (Twitter): ') + chalk.underline('https://x.com/bento_guard'));
    console.log(chalk.blue('📖 Documentation: ') + chalk.underline('https://docs.bento.guard'));
    console.log(chalk.blue('💬 Discord Support: ') + chalk.underline('https://discord.gg/bentoguard'));
    console.log(chalk.white('\n✨ Bento Guard is ready! Your Agent is now protected.'));
    console.log(chalk.gray('---------------------------------------------------------------------------------\n'));
  }

  setup().catch(err => {
    // Fail silently in postinstall
  });

} catch (err) {
  // Fail silently in postinstall
}

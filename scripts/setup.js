#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const prompts = require('prompts');
const chalk = require('chalk');
const { Keypair } = require('@solana/web3.js');
const nacl = require('tweetnacl');
const bs58 = require('bs58').default || require('bs58');

const BANNER = `
---------------------------------------------------------------------------------
 ██████╗ ███████╗███╗   ██╗████████╗ ██████╗      ██████╗ ██╗   ██╗ █████╗ ██████╗ ██████╗ 
 ██╔══██╗██╔════╝████╗  ██║╚══██╔══╝██╔═══██╗    ██╔════╝ ██║   ██║██╔══██╗██╔══██╗██╔══██╗
 ██████╔╝█████╗  ██╔██╗ ██║   ██║   ██║   ██║    ██║  ███╗██║   ██║███████║██████╔╝██║  ██║
 ██╔══██╗██╔══╝  ██║╚██╗██║   ██║   ██║   ██║    ██║   ██║██║   ██║██╔══██║██╔══██╗██║  ██║
 ██████╔╝███████╗██║ ╚████║   ██║   ╚██████╔╝    ╚██████╔╝╚██████╔╝██║  ██║██║  ██║██████╔╝
 ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝    ╚═════╝      ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ 
                                                                            
                     🛡️  AI-POWERED SECURITY INFRASTRUCTURE
---------------------------------------------------------------------------------
`;

async function setup() {
  if (!process.stdout.isTTY) {
    console.log('Non-interactive terminal detected. Skipping setup wizard.');
    return;
  }

  console.log(chalk.cyan(BANNER));
  console.log(chalk.white("Welcome to Bento Guard! Let's get your Agent ready.\n"));

  const { mode } = await prompts({
    type: 'select',
    name: 'mode',
    message: 'How would you like to configure your security keys?',
    choices: [
      { title: '[Auto] Let Bento generate all keys for me', value: 'auto' },
      { title: '[Manual] I will provide my own keys', value: 'manual' }
    ],
    initial: 0
  });

  if (!mode) return;

  let config = {
    AGENT_WALLET_PRIVATE_KEY: '',
    AGENT_X25519_PRIVATE_KEY: '',
    AGENT_X25519_PUBLIC_KEY: ''
  };

  if (mode === 'auto') {
    console.log(chalk.yellow('\n[System: Generating secure identity...]'));

    // Generate Solana Wallet
    const wallet = Keypair.generate();
    config.AGENT_WALLET_PRIVATE_KEY = bs58.encode(wallet.secretKey);

    // Generate X25519 Keys
    const xKey = nacl.box.keyPair();
    config.AGENT_X25519_PRIVATE_KEY = Buffer.from(xKey.secretKey).toString('hex');
    config.AGENT_X25519_PUBLIC_KEY = Buffer.from(xKey.publicKey).toString('hex');

    console.log(chalk.green('✨ Security keys generated successfully.\n'));
  } else {
    const manualAnswers = await prompts([
      {
        type: 'password',
        name: 'walletKey',
        message: 'Please enter your Agent Private Wallet Key (Solana Base58):'
      },
      {
        type: 'password',
        name: 'xPrivate',
        message: 'Please enter your Agent X25519 Private Key (Hex):'
      },
      {
        type: 'text',
        name: 'xPublic',
        message: 'Please enter your Agent X25519 Public Key (Hex):'
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

  // Write .env
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
import { BentoClient, protect } from './src';
import dotenv from 'dotenv';
dotenv.config();

async function runDemo() {
  console.log("🛡️ Initializing Bento Guard...");
  
  BentoClient.initialize({
    agentX25519PrivateKey: process.env.AGENT_X25519_PRIVATE_KEY!,
    agentX25519PublicKey: process.env.AGENT_X25519_PUBLIC_KEY!,
    agentWalletPrivateKey: process.env.AGENT_PRIVATE_WALLET_KEY!,
  });

  const instruction = "Transfer 1.0 SOL to UserX";
  const mockTx = "SGVsbG8gQmVudG8h"; // Base64 mock

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
    console.log(chalk.green('🚀 bento-demo.ts created.'));
  }

  console.log('\n' + chalk.gray('---------------------------------------------------------------------------------'));
  console.log(chalk.blue('🔗 Website: ') + chalk.underline('https://bentoguard.xyz/'));
  console.log(chalk.blue('🐦 X (Twitter): ') + chalk.underline('https://x.com/bento_guard'));
  console.log(chalk.blue('📖 Documentation: ') + chalk.underline('https://docs.bento.guard'));
  console.log(chalk.white('\n✨ Bento Guard is ready! Your Agent is now protected.'));
  console.log(chalk.gray('---------------------------------------------------------------------------------\n'));
}

setup().catch(err => {
  console.error(chalk.red('\nSetup failed:'), err.message);
  process.exit(1);
});

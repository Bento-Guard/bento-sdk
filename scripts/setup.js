#!/usr/bin/env node
/**
 * Bento Guard SDK - Interactive Setup Wizard
 * Professional CLI tool for initializing and configuring Bento Guard security.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  const prompts = require('prompts');
  const chalk = require('chalk');

  // Design System Tokens
  const COLORS = {
    CYAN: '\x1b[36m',
    GOLD: '\x1b[33m',
    RESET: '\x1b[0m',
    BOLD: '\x1b[1m',
    GREEN: '\x1b[32m',
    GRAY: '\x1b[90m'
  };

  const BANNER = `
${COLORS.CYAN}${COLORS.BOLD}---------------------------------------------------------------------------------
 ██████╗ ███████╗███╗   ██╗████████╗ ██████╗      ██████╗ ██╗   ██╗ █████╗ ██████╗ ██████╗ 
 ██╔══██╗██╔════╝████╗  ██║╚══██╔══╝██╔═══██╗    ██╔════╝ ██║   ██║██╔══██╗██╔══██╗██╔══██╗
 ██████╔╝█████╗  ██╔██╗ ██║   ██║   ██║   ██║    ██║  ███╗██║   ██║███████║██████╔╝██║  ██║
 ██╔══██╗██╔══╝  ██║╚██╗██║   ██║   ██║   ██║    ██║   ██║██║   ██║██╔══██║██╔══██╗██╔══██╗
 ██████╔╝███████╗██║ ╚████║   ██║   ╚██████╔╝    ╚██████╔╝╚██████╔╝██║  ██║██║  ██║██████╔╝
 ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝    ╚═════╝      ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝ 
                                                                            
                     🛡️  ${COLORS.GOLD}AI-POWERED SECURITY INFRASTRUCTURE${COLORS.RESET}${COLORS.CYAN}${COLORS.BOLD}
---------------------------------------------------------------------------------${COLORS.RESET}
`;

  function printBanner() {
    process.stderr.write(BANNER + '\n');
  }

  function printFooter() {
    console.log('\n' + chalk.gray('---------------------------------------------------------------------------------'));
    console.log(chalk.blue('🔗 Website: ') + chalk.underline('https://bentoguard.xyz/'));
    console.log(chalk.blue('🐦 X (Twitter): ') + chalk.underline('https://x.com/bento_guard'));
    console.log(chalk.blue('📖 Documentation: ') + chalk.underline('https://docs.bento.guard'));
    console.log(chalk.white('\n✨ Bento Guard is ready! Your Agent is now protected.'));
    console.log(chalk.gray('---------------------------------------------------------------------------------\n'));
  }

  async function setup() {
    printBanner();
    
    if (!process.stdout.isTTY) {
      console.log(chalk.yellow('⚠️  Interactive session required.'));
      console.log(chalk.white('Please run: ') + chalk.cyan('npx bentoguard\n'));
      return;
    }

    // --- STEP 0: PROJECT INITIALIZATION ---
    const hasPackageJson = fs.existsSync(path.join(process.cwd(), 'package.json'));
    if (!hasPackageJson) {
      console.log(chalk.yellow('📝 No package.json found. Initializing project structure...'));
      try {
        execSync('npm init -y', { stdio: 'ignore' });
        console.log(chalk.green('✅ Project initialized successfully.\n'));
      } catch (e) {
        console.log(chalk.red('⚠️  Could not initialize project automatically.\n'));
      }
    }

    // --- STEP 1: SDK INSTALLATION ---
    const isInstalled = fs.existsSync(path.join(process.cwd(), 'node_modules', '@bentoguard', 'sdk'));
    if (!isInstalled) {
      const { install } = await prompts({
        type: 'confirm',
        name: 'install',
        message: 'Bento Guard SDK is missing. Install it now?',
        initial: true
      });
      
      if (install) {
        process.stdout.write(chalk.yellow('\n📦 Downloading security modules...'));
        try {
          execSync('npm install @bentoguard/sdk', { stdio: 'inherit' });
          console.log(chalk.green('\n✅ SDK installation complete.\n'));
        } catch (e) {
          console.log(chalk.red('\n❌ Installation failed. Please run "npm install @bentoguard/sdk" manually.\n'));
        }
      }
    }

    // --- STEP 2: CREDENTIAL CONFIGURATION ---
    console.log(chalk.white.bold('--- Environment Configuration ---'));
    const { configNow } = await prompts({
      type: 'select',
      name: 'configNow',
      message: 'Would you like to configure your Bento credentials now?',
      choices: [
        { title: 'Yes, I have my keys from the Bento Dashboard', value: 'yes' },
        { title: 'No, I will configure the .env file later', value: 'no' }
      ],
      initial: 0
    });

    if (configNow === 'yes') {
      console.log(chalk.cyan('\n🔑 Entering Credentials:'));
      const credentials = await prompts([
        {
          type: 'password',
          name: 'walletKey',
          message: 'Agent Wallet Private Key (Base58):'
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

      if (credentials.walletKey && credentials.xPrivate && credentials.xPublic) {
        const envPath = path.join(process.cwd(), '.env');
        const envContent = `
# Bento Guard Credentials
# DO NOT COMMIT THIS FILE TO VERSION CONTROL
AGENT_X25519_PRIVATE_KEY=${credentials.xPrivate}
AGENT_X25519_PUBLIC_KEY=${credentials.xPublic}
AGENT_WALLET_PRIVATE_KEY=${credentials.walletKey}
        `.trim();

        fs.writeFileSync(envPath, envContent);
        console.log(chalk.green('\n✅ Credentials securely saved to .env'));
      }
    } else {
      console.log(chalk.gray('\nSkipping credential setup. You can re-run this with "npx bentoguard".'));
    }

    // --- STEP 3: INTEGRATION SCAFFOLDING ---
    console.log(chalk.white.bold('\n--- Integration Scaffolding ---'));
    const { generateExample } = await prompts({
      type: 'toggle',
      name: 'generateExample',
      message: 'Create a sample integration file (bento-demo.ts)?',
      initial: true,
      active: 'yes',
      inactive: 'no'
    });

    if (generateExample) {
      const exampleContent = `
import { BentoClient, protect } from '@bentoguard/sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runSecurityAudit() {
  console.log("🛡️ Initializing Bento Guard...");

  // Initialize with your Agent credentials
  BentoClient.initialize({
    agentX25519PrivateKey: process.env.AGENT_X25519_PRIVATE_KEY || "YOUR_KEY",
    agentX25519PublicKey: process.env.AGENT_X25519_PUBLIC_KEY || "YOUR_KEY",
    agentWalletPrivateKey: process.env.AGENT_WALLET_PRIVATE_KEY || "YOUR_KEY",
  });

  const instruction = "Example: Transfer 1.0 SOL to Unknown Wallet";
  const mockTransactionData = "SGVsbG8gQmVudG8h";

  try {
    console.log("🔍 Auditing transaction...");
    const audit = await protect(instruction, mockTransactionData);
    
    console.log("\\n--- Audit Result ---");
    console.log("Recommendation:", audit.recommendation);
    console.log("Reasoning:", audit.reasoning);
  } catch (err) {
    console.error("❌ Guard Error:", err.message);
  }
}

runSecurityAudit();
      `.trim();
      fs.writeFileSync(path.join(process.cwd(), 'bento-demo.ts'), exampleContent);
      console.log(chalk.green('🚀 Scaffold created: bento-demo.ts'));
    }

    // --- STEP 4: COMPLETION ---
    console.log(chalk.green.bold('\n✨ Bento Guard setup successfully finished!'));
    printFooter();
  }

  // Execute with top-level error handling
  setup().catch(err => {
    // Fail silently to avoid messy stack traces in postinstall
  });

} catch (err) {
  // Graceful degradation if dependencies are missing
}

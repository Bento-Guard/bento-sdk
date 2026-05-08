#!/usr/bin/env node
/**
 * Bento Guard SDK - Interactive Setup Wizard
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
      message: 'Would you like us to help you configure your credentials?',
      choices: [
        { title: 'Yes, let\'s set them up now', value: 'yes' },
        { title: 'No, I will configure the .env file manually later', value: 'no' }
      ],
      initial: 0
    });

    if (configNow === 'yes') {
      console.log(chalk.cyan('\n🔑 Entering Credentials (copy these from your Dashboard):'));
      const credentials = await prompts([
        {
          type: 'password',
          name: 'walletKey',
          message: 'Agent Wallet Private Key (Base58):'
        }
      ]);

      if (credentials.walletKey) {
        const envPath = path.join(process.cwd(), '.env');
        
        // Append or create .env
        let envContent = '';
        if (fs.existsSync(envPath)) {
          envContent = fs.readFileSync(envPath, 'utf8');
        }

        const bentoEnv = `
# Bento Guard Credentials
AGENT_WALLET_PRIVATE_KEY=${credentials.walletKey}
BENTO_NETWORK=solana
        `.trim();

        if (envContent.includes('AGENT_WALLET_PRIVATE_KEY')) {
          envContent = envContent.replace(/AGENT_WALLET_PRIVATE_KEY=.*/, `AGENT_WALLET_PRIVATE_KEY=${credentials.walletKey}`);
        } else {
          envContent += (envContent ? '\n\n' : '') + bentoEnv;
        }

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
import { BentoGuardClient, protect } from '@bentoguard/sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runSecurityAudit() {
  console.log("🛡️ Initializing Bento Guard...");

  // Initialize the client (it will automatically use AGENT_WALLET_PRIVATE_KEY from .env)
  BentoGuardClient.initialize();

  const instruction = "Example: Swap 0.5 SOL for JUP on Jupiter DEX";
  const mockTransactionData = "SGVsbG8gQmVudG8h"; // Placeholder for actual transaction payload

  try {
    console.log("🔍 Auditing transaction...");
    const audit = await protect(instruction, mockTransactionData);
    
    console.log("\\n--- Audit Result ---");
    console.log("Recommendation:", audit.recommendation);
    console.log("Reasoning:", audit.reasoning);
    
    if (audit.recommendation === 'ALLOW') {
      console.log("✅ Proceeding with transaction...");
    } else if (audit.recommendation === 'ESCALATED') {
      console.log("⚠️  Waiting for manual approval in Bento Dashboard...");
    } else {
      console.log("❌ Transaction blocked by security policy.");
    }
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
    // Fail silently
  });

} catch (err) {
  // Graceful degradation
}

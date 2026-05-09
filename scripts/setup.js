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
    try {
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

      // --- STEP 1.5: DASHBOARD CHECK ---
      console.log(chalk.cyan.bold('\nWelcome to Bento Guard! 🛡️'));
      console.log(chalk.white('The AI-powered security infrastructure for autonomous agents.\n'));
      
      const { hasRegistered } = await prompts({
        type: 'toggle',
        name: 'hasRegistered',
        message: 'Have you registered your Agent on the Bento Guard Dashboard yet?',
        initial: true,
        active: 'Yes',
        inactive: 'Not yet'
      });

      if (!hasRegistered) {
        console.log(chalk.cyan('\nNo problem! Here is how to get started:'));
        console.log(chalk.yellow('Step 1: Register your Agent'));
        console.log(chalk.white(`Go to ${chalk.cyan.underline('https://app.bentoguard.xyz')} and register your Agent's wallet address.`));
        console.log(chalk.white('This establishes your Agent\'s identity on the Bento network.\n'));

        console.log(chalk.yellow('Step 2: Secure with SDK'));
        console.log(chalk.white('The SDK uses your Agent\'s Private Key to sign and protect every transaction.'));
        console.log(chalk.white(`${chalk.italic('Note: Your key is stored locally in your .env file and never leaves your machine.')}\n`));
      }

      // --- STEP 2: CREDENTIAL CONFIGURATION ---
      console.log(chalk.white.bold('--- Environment Configuration ---'));
      const { configNow } = await prompts({
        type: 'select',
        name: 'configNow',
        message: 'Would you like us to help you configure your credentials?',
        choices: [
          { title: 'Yes, I have my Agent\'s Private Key ready', value: 'yes' },
          { title: 'No, I will configure it manually later', value: 'no' }
        ],
        initial: 0
      });

      if (configNow === 'yes') {
        console.log(chalk.cyan('\n🔑 Enter your Agent\'s Private Key (this will be saved to your local .env file):'));
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
        const sampleSrcDir = path.join(__dirname, '..', 'samples', 'finance');
        const sampleDestDir = path.join(process.cwd(), 'bento-sample');

        try {
          if (!fs.existsSync(sampleDestDir)) {
            fs.mkdirSync(sampleDestDir, { recursive: true });
          }

          const filesToCopy = fs.readdirSync(sampleSrcDir);
          filesToCopy.forEach(file => {
            const src = path.join(sampleSrcDir, file);
            const dest = path.join(sampleDestDir, file);
            if (fs.existsSync(src) && fs.statSync(src).isFile()) {
              fs.copyFileSync(src, dest);
            }
          });

          console.log(chalk.green('\n✅ Created "bento-sample" directory with full Finance Sandbox'));
          console.log(chalk.cyan('\nTo start the demo, run:'));
          console.log(chalk.white('cd bento-sample && npm install && npx ts-node main.ts'));
        } catch (copyErr) {
          console.error(chalk.red('\nCould not copy sample files:'), copyErr.message);
        }
      }

      console.log(chalk.bold.green('\n--- Setup Complete! ---'));
      console.log(chalk.white('Your Agent is now ready to be protected by Bento Guard.'));
      printFooter();
      
    } catch (err) {
      if (err.message === 'User cancelled') {
        console.log(chalk.yellow('\nSetup cancelled. You can run it again anytime.'));
      } else {
        console.error(chalk.red('\nAn error occurred during setup:'), err);
      }
    }
  }

  setup();

} catch (err) {
  // Silent fail if dependencies are missing during initial require
}

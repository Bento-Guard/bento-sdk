#!/usr/bin/env node
/**
 * Bento Guard SDK - Interactive Setup Wizard
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  const prompts = require('prompts');
  let chalk = require('chalk');
  if (chalk.default) chalk = chalk.default;

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
    console.log(chalk.blue('🐦 X (Twitter): ') + chalk.underline('https://x.com/Bento-Guard'));
    console.log(chalk.blue('📖 Documentation: ') + chalk.underline('https://bento-1.gitbook.io/bento-docs'));
    console.log(chalk.white('\n✨ Bento Guard is ready! Your Agent is now protected.'));
    console.log(chalk.gray('---------------------------------------------------------------------------------\n'));
  }

  async function setup() {
    try {
      printBanner();

      if (!process.stdout.isTTY && !process.env.SKIP_TTY_CHECK) {
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
        message: 'Have you registered your Agent on the Bento Dashboard yet?',
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

      // --- STEP 2: INTEGRATION SCAFFOLDING ---
      console.log(chalk.white.bold('--- Integration Scaffolding ---'));
      const { generateExample } = await prompts({
        type: 'toggle',
        name: 'generateExample',
        message: 'Create a sample finance agent (main.ts, gemini-agent.ts) in this directory?',
        initial: true,
        active: 'yes',
        inactive: 'no'
      });

      let geminiKey = '';
      if (generateExample) {
        const geminiPrompt = await prompts({
          type: 'password',
          name: 'key',
          message: '🤖 Enter Gemini API Key (optional, press enter to skip):',
          initial: ''
        });
        geminiKey = geminiPrompt.key;
      }

      // --- STEP 3: CREDENTIAL CONFIGURATION ---
      console.log(chalk.white.bold('\n--- Environment Configuration ---'));
      const { configNow } = await prompts({
        type: 'select',
        name: 'configNow',
        message: 'Configure your Agent Wallet Private Key now?',
        choices: [
          { title: 'Yes, save to .env', value: 'yes' },
          { title: 'No, I will do it later', value: 'no' }
        ],
        initial: 0
      });

      if (configNow === 'yes') {
        const { walletKey } = await prompts({
          type: 'password',
          name: 'walletKey',
          message: '🔑 Enter Agent Wallet Private Key (Base58):',
          validate: value => value.length > 0 || 'Private key is required'
        });

        if (walletKey) {
          const envPath = path.join(process.cwd(), '.env');
          let envContent = '';
          if (fs.existsSync(envPath)) envContent = fs.readFileSync(envPath, 'utf8');

          const bentoEnv = `
# Bento Guard Credentials
AGENT_WALLET_PRIVATE_KEY=${walletKey}
BENTO_NETWORK=solana
GEMINI_API_KEY=${geminiKey || 'your_gemini_api_key_here'}
GEMINI_MODEL=gemini-2.0-flash
          `.trim();

          if (envContent.includes('AGENT_WALLET_PRIVATE_KEY')) {
            envContent = envContent.replace(/AGENT_WALLET_PRIVATE_KEY=.*/, `AGENT_WALLET_PRIVATE_KEY=${walletKey}`);
            if (geminiKey) {
                envContent = envContent.includes('GEMINI_API_KEY') 
                    ? envContent.replace(/GEMINI_API_KEY=.*/, `GEMINI_API_KEY=${geminiKey}`)
                    : envContent + `\nGEMINI_API_KEY=${geminiKey}`;
            }
          } else {
            envContent += (envContent ? '\n\n' : '') + bentoEnv;
          }

          fs.writeFileSync(envPath, envContent);
          console.log(chalk.green('\n✅ Environment variables saved to .env'));
        }
      }

      // --- EXECUTE SCAFFOLDING ---
      if (generateExample) {
        const sampleSrcDir = path.join(__dirname, '..', 'samples', 'finance');
        const destDir = process.cwd();

        try {
          const filesToCopy = fs.readdirSync(sampleSrcDir);
          filesToCopy.forEach(file => {
            if (file === 'package.json' || file === '.env.example' || file === 'README.md') return; 
            
            const src = path.join(sampleSrcDir, file);
            const dest = path.join(destDir, file);
            
            if (fs.existsSync(src) && fs.statSync(src).isFile()) {
              fs.copyFileSync(src, dest);
            }
          });

          console.log(chalk.green('\n✅ Sample files copied to current directory.'));
          console.log(chalk.yellow('📦 Installing required dependencies...'));
          
          try {
            execSync('npm install dotenv @bentoguard/sdk ts-node typescript @solana/web3.js bs58', { stdio: 'inherit' });
            console.log(chalk.green('\n✅ Dependencies installed.'));
          } catch (e) {
            console.log(chalk.gray('\nCould not run npm install automatically. Please run:'));
            console.log(chalk.white('npm install dotenv @bentoguard/sdk ts-node typescript @solana/web3.js bs58'));
          }

          console.log(chalk.cyan('\nTo start your Agent:'));
          console.log(chalk.white('  npx ts-node main.ts'));
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

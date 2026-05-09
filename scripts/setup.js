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

      console.log(chalk.cyan.bold('\nWelcome to Bento Guard! 🛡️'));
      console.log(chalk.white('The AI-powered security infrastructure for autonomous agents.\n'));

      // --- DASHBOARD CHECK ---
      console.log(chalk.white.bold('--- STEP 0: Check Dashboard Registration ---'));
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
        console.log(chalk.yellow('Step 2: Get your API Key'));
        console.log(chalk.white(`After registration, navigate to 'API Access' to generate your Secret Key.`));
        console.log(chalk.yellow('Step 3: Return here and select "Yes" to continue setup\n'));

        // Force restart to get keys
        const { restart } = await prompts({
          type: 'confirm',
          name: 'restart',
          message: 'Would you like to restart the setup now that you have the dashboard?',
          initial: true
        });

        if (restart) {
          process.exit(0); // Exit and let user rerun
        }
        return; // Exit if they don't want to restart immediately
      }

      // --- CREDENTIAL CONFIGURATION ---
      console.log(chalk.white.bold('--- Environment Configuration ---'));
      const { configNow } = await prompts({
        type: 'select',
        name: 'configNow',
        message: 'Would you like us to help you configure your credentials?',
        choices: [
          { title: "Yes, I have my Agent's Private Key ready", value: 'yes' },
          { title: 'No, I will configure it manually later', value: 'no' }
        ],
        initial: 0
      });

      let walletKey = '';
      if (configNow === 'yes') {
        const walletPrompt = await prompts({
          type: 'password',
          name: 'key',
          message: '🔑 Enter Agent Wallet Private Key (Base58):',
          validate: value => value.length > 0 || 'Private key is required'
        });
        walletKey = walletPrompt.key;
      }

      // --- INTEGRATION SCAFFOLDING ---
      console.log(chalk.white.bold('\n--- Integration Scaffolding ---'));
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
        // --- GEMINI KEY (ONLY IF SAMPLE IS YES) ---
        const geminiPrompt = await prompts({
          type: 'password',
          name: 'key',
          message: '🤖 Enter Gemini API Key (optional, press enter to skip):',
          initial: ''
        });
        geminiKey = geminiPrompt.key;
      }

      // Save credentials to .env if any provided
      if (walletKey || geminiKey) {
        const envPath = path.join(process.cwd(), '.env');
        let envContent = '';
        if (fs.existsSync(envPath)) envContent = fs.readFileSync(envPath, 'utf8');

        const bentoEnv = `
# Bento Guard Credentials
${walletKey ? `AGENT_WALLET_PRIVATE_KEY=${walletKey}` : '# AGENT_WALLET_PRIVATE_KEY='}
BENTO_NETWORK=solana
GEMINI_API_KEY=${geminiKey || 'your_gemini_api_key_here'}
GEMINI_MODEL=gemini-2.0-flash
        `.trim();

        if (walletKey && envContent.includes('AGENT_WALLET_PRIVATE_KEY')) {
          envContent = envContent.replace(/AGENT_WALLET_PRIVATE_KEY=.*/, `AGENT_WALLET_PRIVATE_KEY=${walletKey}`);
        } else if (walletKey) {
          envContent += (envContent ? '\n\n' : '') + bentoEnv;
        } else if (geminiKey) {
          // If only geminiKey provided
          if (envContent.includes('GEMINI_API_KEY')) {
            envContent = envContent.replace(/GEMINI_API_KEY=.*/, `GEMINI_API_KEY=${geminiKey}`);
          } else {
            envContent += (envContent ? '\n\n' : '') + bentoEnv;
          }
        }

        fs.writeFileSync(envPath, envContent);
        console.log(chalk.green('\n✅ Configuration saved to .env'));
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

          console.log(chalk.green('\n✅ Sample files copied successfully.'));

          // UPDATE PACKAGE.JSON SCRIPTS
          const pkgPath = path.join(destDir, 'package.json');
          if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            if (!pkg.scripts) pkg.scripts = {};
            pkg.scripts["start"] = "ts-node main.ts";
            pkg.scripts["demo"] = "APP_MODE=DEMO ts-node main.ts";
            fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
            console.log(chalk.green('✅ Updated package.json with "start" and "demo" scripts.'));
          }

          console.log(chalk.yellow('📦 Installing dependencies...'));
          try {
            execSync('npm install dotenv @bentoguard/sdk ts-node typescript @solana/web3.js bs58', { stdio: 'inherit' });
            console.log(chalk.green('\n✅ Dependencies installed.'));
          } catch (e) {
            console.log(chalk.gray('\nPlease run manual install:'));
            console.log(chalk.white('npm install dotenv @bentoguard/sdk ts-node typescript @solana/web3.js bs58'));
          }

          console.log(chalk.cyan('\nTo run your protected Agent:'));
          console.log(chalk.white('  npm start'));
        } catch (copyErr) {
          console.error(chalk.red('\nScaffolding failed:'), copyErr.message);
        }
      }

      console.log(chalk.bold.green('\n--- Setup Complete! ---'));
      printFooter();

    } catch (err) {
      if (err.message === 'User cancelled') {
        console.log(chalk.yellow('\nSetup cancelled.'));
      } else {
        console.error(chalk.red('\nError:'), err);
      }
    }
  }

  setup();

} catch (err) { }

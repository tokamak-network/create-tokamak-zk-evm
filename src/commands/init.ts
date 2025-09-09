import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import { spawn } from 'child_process';
import chalk from 'chalk';
import { logger } from '../utils/logger';
import { ConfigManager } from '../utils/config-manager';
import { BinaryManager } from '../utils/binary-manager';
import { PlatformDetector } from '../utils/platform-detector';
import { ScriptRunner } from '../utils/script-runner';
import { promptForSetupMode as promptForSetupModeWithArrows } from '../utils/welcome-screen';

export function createInitCommand(): Command {
  const command = new Command('init');

  command
    .description('Initialize a new Tokamak-zk-EVM project')
    .argument('[project-name]', 'Name of the project directory')
    .option('--output-dir <dir>', 'Custom output directory for proofs')
    .option(
      '--network <network>',
      'Target network (mainnet/sepolia)',
      'mainnet'
    )
    .option('--rpc-url <url>', 'RPC URL for blockchain connection')
    .option('--skip-binary', 'Skip binary download during initialization')
    .option(
      '--setup-mode <mode>',
      'Setup mode: "download" (from release), "local" (run script), or "skip"',
      'ask'
    )
    .action(
      async (
        projectName?: string,
        options?: {
          outputDir?: string;
          network?: 'mainnet' | 'sepolia';
          rpcUrl?: string;
          skipBinary?: boolean;
          setupMode?: 'download' | 'local' | 'skip' | 'ask';
        }
      ) => {
        try {
          await initializeProject(projectName, options);
        } catch (error) {
          logger.error('Initialization failed:', error);
          process.exit(1);
        }
      }
    );

  return command;
}

export async function initializeProject(
  projectName?: string,
  options: {
    outputDir?: string;
    network?: 'mainnet' | 'sepolia';
    rpcUrl?: string;
    skipBinary?: boolean;
    setupMode?: 'download' | 'local' | 'skip' | 'ask';
  } = {}
): Promise<void> {
  const {
    outputDir,
    network = 'mainnet',
    rpcUrl,
    skipBinary = false,
    setupMode = 'ask',
  } = options;

  // Check platform compatibility
  if (!PlatformDetector.isSupported()) {
    throw new Error(
      'This platform is not supported. Only macOS and Linux are supported.'
    );
  }

  logger.info(chalk.blue('🚀 Initializing Tokamak-zk-EVM project...'));

  // Create project directory if specified
  let projectDir = process.cwd();
  if (projectName) {
    projectDir = path.join(process.cwd(), projectName);
    await fs.ensureDir(projectDir);
    process.chdir(projectDir);
    logger.info(`Created project directory: ${projectName}`);
  }

  // Create project structure
  await createProjectStructure(projectDir);

  // Initialize configuration
  const configManager = new ConfigManager();
  const config = await configManager.loadConfig();

  // Override with user options
  if (outputDir) {
    config.outputDir = outputDir;
  }
  config.network = network;
  if (rpcUrl) {
    config.rpcUrl = rpcUrl;
  }

  // Create project config
  const projectConfig: any = {
    network,
    outputDir: outputDir || './tokamak-zk-evm-outputs',
  };

  if (rpcUrl) {
    projectConfig.rpcUrl = rpcUrl;
  }

  await configManager.createProjectConfig(projectConfig);

  // Create package.json and install CLI locally
  await createPackageJson(projectDir, projectName);
  const globalInstalled = await promptAndInstallGlobally();

  // Download binary if not skipped
  let binaryManager: BinaryManager | null = null;
  if (!skipBinary) {
    logger.info('Downloading Tokamak-zk-EVM binary...');
    binaryManager = new BinaryManager(config);
    await binaryManager.ensureBinaryAvailable();
    logger.info(chalk.green('✅ Binary downloaded and ready'));
  } else {
    logger.info(
      'Skipped binary download (use --skip-binary=false to download)'
    );
  }

  // Handle trusted setup
  if (setupMode !== 'skip') {
    const setupBinaryManager = binaryManager || new BinaryManager(config);
    await handleTrustedSetup(setupBinaryManager, setupMode, config);
  }

  // Create example files
  await createExampleFiles(projectDir);

  // Display success message
  displaySuccessMessage(projectName, skipBinary, globalInstalled);
}

async function createProjectStructure(projectDir: string): Promise<void> {
  const directories = ['scripts', 'outputs', 'configs'];

  for (const dir of directories) {
    await fs.ensureDir(path.join(projectDir, dir));
  }

  logger.debug('Created project directory structure');
}

async function createExampleFiles(projectDir: string): Promise<void> {
  // Create example script
  const exampleScript = `#!/bin/bash
# Example script for generating proofs
# Usage: ./scripts/generate-proof.sh <tx-hash>

TX_HASH=$1

if [ -z "$TX_HASH" ]; then
    echo "Usage: $0 <transaction-hash>"
    exit 1
fi

echo "Generating proof for transaction: $TX_HASH"
tokamak-zk-evm prove $TX_HASH --verbose
`;

  await fs.writeFile(
    path.join(projectDir, 'scripts', 'generate-proof.sh'),
    exampleScript
  );
  await fs.chmod(path.join(projectDir, 'scripts', 'generate-proof.sh'), 0o755);

  // Create README
  const readme = `# Tokamak-zk-EVM Project

This project is set up for generating zero-knowledge proofs using Tokamak-zk-EVM.

## Quick Start

1. Generate a proof for a transaction:
   \`\`\`bash
   tokamak-zk-evm prove <transaction-hash>
   \`\`\`

2. Verify a proof:
   \`\`\`bash
   tokamak-zk-evm verify <proof-file>
   \`\`\`

3. Export proof outputs:
   \`\`\`bash
   tokamak-zk-evm export proof ./my-proof.json
   \`\`\`

## Configuration

Edit \`tokamak.config.js\` to customize your project settings.

## Scripts

- \`./scripts/generate-proof.sh\` - Example proof generation script

## Outputs

Generated proofs and intermediate files will be stored in the \`outputs/\` directory.
`;

  await fs.writeFile(path.join(projectDir, 'README.md'), readme);

  // Create .gitignore
  const gitignore = `# Tokamak-zk-EVM outputs
outputs/
*.log

# Node modules
node_modules/

# Cache
.tokamak-zk-evm/

# OS
.DS_Store
Thumbs.db
`;

  await fs.writeFile(path.join(projectDir, '.gitignore'), gitignore);

  logger.debug('Created example files');
}

function displaySuccessMessage(
  projectName?: string,
  skipBinary?: boolean,
  globalInstalled?: boolean
): void {
  console.log();
  console.log(chalk.green('🎉 Project initialized successfully!'));
  console.log();

  if (projectName) {
    console.log(chalk.blue('Next steps:'));
    console.log(`  cd ${projectName}`);
  } else {
    console.log(chalk.blue('Next steps:'));
  }

  if (skipBinary) {
    console.log('  tokamak-zk-evm init --skip-binary=false  # Download binary');
  }

  if (globalInstalled) {
    console.log(
      '  tokamak-zk-evm prove <transaction-hash>   # Generate a proof'
    );
    console.log('  tokamak-zk-evm verify --interactive       # Verify proofs');
    console.log(
      '  tokamak-zk-evm setup                      # Configure trusted setup'
    );
    console.log(
      '  tokamak-zk-evm --help                     # See all commands'
    );
  } else {
    console.log(
      '  npx tokamak-zk-evm prove <tx-hash>        # Generate a proof'
    );
    console.log('  npx tokamak-zk-evm verify --interactive   # Verify proofs');
    console.log(
      '  npx tokamak-zk-evm setup                  # Configure trusted setup'
    );
    console.log(
      '  npm run prove <transaction-hash>          # Or use npm scripts'
    );
    console.log(
      '  npm run verify                            # Or use npm scripts'
    );
  }
  console.log();
  console.log(chalk.gray('Happy proving! 🔐'));
}

/**
 * Handle trusted setup process with user choice
 */
async function handleTrustedSetup(
  binaryManager: BinaryManager,
  setupMode: string,
  config: any
): Promise<void> {
  // Check if setup is already installed
  const isSetupInstalled = await binaryManager.isSetupInstalled();
  if (isSetupInstalled) {
    logger.info(chalk.green('✅ Trusted setup files already installed'));
    return;
  }

  let selectedMode = setupMode;

  // Ask user if mode is 'ask'
  if (setupMode === 'ask') {
    const hasSetupFiles = await binaryManager.hasSetupFiles();
    selectedMode = await promptForSetupModeWithArrows(hasSetupFiles);
  }

  console.log();
  logger.info(chalk.blue('🔧 Setting up trusted setup files...'));

  switch (selectedMode) {
    case 'download':
      try {
        await binaryManager.downloadAndInstallSetupFiles();
        logger.info(chalk.green('✅ Setup files downloaded and installed'));
      } catch (error) {
        logger.error('Failed to download setup files:', error);
        logger.info(
          chalk.yellow(
            '💡 You can run trusted setup manually later with: tokamak-zk-evm prove --skip-trusted-setup=false'
          )
        );
      }
      break;

    case 'local':
      try {
        await runLocalTrustedSetup(binaryManager, config);
        logger.info(chalk.green('✅ Local trusted setup completed'));
      } catch (error) {
        logger.error('Failed to run local trusted setup:', error);
        logger.info(
          chalk.yellow(
            '💡 You can run trusted setup manually later with: tokamak-zk-evm prove --skip-trusted-setup=false'
          )
        );
      }
      break;

    case 'skip':
      logger.info(chalk.yellow('⏭️ Skipped trusted setup'));
      logger.info(
        chalk.gray(
          '💡 You can run trusted setup later with: tokamak-zk-evm prove --skip-trusted-setup=false'
        )
      );
      break;

    default:
      logger.warn(`Unknown setup mode: ${selectedMode}`);
      break;
  }
}

/**
 * Run local trusted setup
 */
async function runLocalTrustedSetup(
  binaryManager: BinaryManager,
  _config: any
): Promise<void> {
  const binaryPaths = await binaryManager.ensureBinaryAvailable();
  const scriptRunner = new ScriptRunner(binaryPaths);

  logger.info('Running local trusted setup (this may take several minutes)...');

  const result = await scriptRunner.runTrustedSetup({
    verbose: true,
    onProgress: (step, current, total) => {
      logger.info(`[${current}/${total}] ${step}`);
    },
  });

  if (!result.success) {
    throw new Error(`Trusted setup failed: ${result.stderr || result.stdout}`);
  }
}

/**
 * Create package.json for the project
 */
async function createPackageJson(
  projectDir: string,
  projectName?: string
): Promise<void> {
  const packageJsonPath = path.join(projectDir, 'package.json');

  // Skip if package.json already exists
  if (await fs.pathExists(packageJsonPath)) {
    logger.debug('package.json already exists, skipping creation');
    return;
  }

  const packageJson = {
    name: projectName || path.basename(projectDir),
    version: '1.0.0',
    description: 'Tokamak-zk-EVM proof generation project',
    private: true,
    scripts: {
      prove: 'tokamak-zk-evm prove',
      verify: 'tokamak-zk-evm verify',
      setup: 'tokamak-zk-evm setup',
      status: 'tokamak-zk-evm status',
      'list-outputs': 'tokamak-zk-evm list-outputs',
    },
    devDependencies: {},
    keywords: ['tokamak', 'zk-evm', 'zero-knowledge', 'proof'],
    author: '',
    license: 'MIT',
  };

  await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
  logger.info('📦 Created package.json');
}

/**
 * Check if CLI is already installed globally
 */
async function isGloballyInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    const npmList = spawn('npm', ['list', '-g', 'create-tokamak-zk-evm'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    npmList.on('close', (code) => {
      resolve(code === 0);
    });

    npmList.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Prompt user for global installation and install if agreed
 */
async function promptAndInstallGlobally(): Promise<boolean> {
  // Check if already installed globally
  const alreadyInstalled = await isGloballyInstalled();
  if (alreadyInstalled) {
    logger.info(chalk.green('✅ CLI is already installed globally'));
    return true;
  }

  console.log();
  console.log(chalk.blue('🌐 Global CLI Installation'));
  console.log(chalk.gray('============================'));
  console.log();
  console.log('Would you like to install Tokamak-zk-EVM CLI globally?');
  console.log('This allows you to use "tokamak-zk-evm" commands directly.');
  console.log();
  console.log(chalk.green('✅ Yes') + ' - Install globally for easier usage');
  console.log(chalk.yellow('⏭️ No') + '  - Use "npx tokamak-zk-evm" instead');
  console.log();

  // Simple prompt for now
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const choice = await new Promise<string>((resolve) => {
    rl.question(chalk.cyan('Install globally? (Y/n): '), (answer: string) => {
      rl.close();
      resolve(answer.trim().toLowerCase() || 'y');
    });
  });

  if (choice === 'y' || choice === 'yes') {
    console.log();
    logger.info('🌐 Installing Tokamak-zk-EVM CLI globally...');

    return new Promise((resolve) => {
      const npmInstall = spawn(
        'npm',
        ['install', '-g', 'create-tokamak-zk-evm'],
        {
          stdio: ['pipe', 'pipe', 'pipe'],
        }
      );

      let stdout = '';
      let stderr = '';

      npmInstall.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      npmInstall.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      npmInstall.on('close', (code) => {
        if (code === 0) {
          logger.info(chalk.green('✅ CLI installed globally'));
          logger.info(
            chalk.gray('💡 You can now use "tokamak-zk-evm" commands anywhere')
          );
          resolve(true);
        } else {
          logger.warn('Failed to install CLI globally');
          logger.info(
            chalk.yellow('💡 You can use "npx tokamak-zk-evm" instead')
          );
          logger.debug(`npm install failed with code ${code}`);
          logger.debug(`stdout: ${stdout}`);
          logger.debug(`stderr: ${stderr}`);
          resolve(false);
        }
      });

      npmInstall.on('error', (error) => {
        logger.warn('Failed to install CLI globally');
        logger.info(
          chalk.yellow('💡 You can use "npx tokamak-zk-evm" instead')
        );
        logger.debug(`npm install error: ${error.message}`);
        resolve(false);
      });
    });
  } else {
    logger.info(chalk.yellow('⏭️ Skipped global installation'));
    logger.info(chalk.gray('💡 Use "npx tokamak-zk-evm" to run commands'));
    return false;
  }
}

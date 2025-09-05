import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { logger } from '../utils/logger';
import { ConfigManager } from '../utils/config-manager';
import { BinaryManager } from '../utils/binary-manager';
import { PlatformDetector } from '../utils/platform-detector';

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
    .action(
      async (
        projectName?: string,
        options?: {
          outputDir?: string;
          network?: 'mainnet' | 'sepolia';
          rpcUrl?: string;
          skipBinary?: boolean;
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
  } = {}
): Promise<void> {
  const {
    outputDir,
    network = 'mainnet',
    rpcUrl,
    skipBinary = false,
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
    outputDir: outputDir || './tokamak-outputs',
  };

  if (rpcUrl) {
    projectConfig.rpcUrl = rpcUrl;
  }

  await configManager.createProjectConfig(projectConfig);

  // Download binary if not skipped
  if (!skipBinary) {
    logger.info('Downloading Tokamak-zk-EVM binary...');
    const binaryManager = new BinaryManager(config);
    await binaryManager.ensureBinaryAvailable();
    logger.info(chalk.green('✅ Binary downloaded and ready'));
  } else {
    logger.info(
      'Skipped binary download (use --skip-binary=false to download)'
    );
  }

  // Create example files
  await createExampleFiles(projectDir);

  // Display success message
  displaySuccessMessage(projectName, skipBinary);
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
  skipBinary?: boolean
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

  console.log('  tokamak-zk-evm prove <transaction-hash>   # Generate a proof');
  console.log('  tokamak-zk-evm --help                     # See all commands');
  console.log();
  console.log(chalk.gray('Happy proving! 🔐'));
}

import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { logger } from '../utils/logger';
import { ConfigManager } from '../utils/config-manager';
import { BinaryManager } from '../utils/binary-manager';
import { ScriptRunner } from '../utils/script-runner';
// import { ProofGenerationOptions } from '../types';

export function createProveCommand(): Command {
  const command = new Command('prove');

  command
    .description('Generate a zero-knowledge proof for a transaction')
    .argument('<tx-hash>', 'Transaction hash to generate proof for')
    .option('--output-dir <dir>', 'Custom output directory')
    .option(
      '--keep-intermediates',
      'Keep intermediate files after proof generation'
    )
    .option('--verbose', 'Show detailed output')
    .option('--network <network>', 'Target network (mainnet/sepolia)')
    .option('--skip-trusted-setup', 'Skip trusted setup (use if already run)')
    .option(
      '--rpc-url <url>',
      'RPC URL for transaction data (e.g., https://mainnet.infura.io/v3/YOUR-PROJECT-ID)'
    )
    .action(
      async (
        txHash: string,
        options: {
          outputDir?: string;
          keepIntermediates?: boolean;
          verbose?: boolean;
          network?: 'mainnet' | 'sepolia';
          skipTrustedSetup?: boolean;
          rpcUrl?: string;
        }
      ) => {
        try {
          await generateProof(txHash, options);
        } catch (error) {
          logger.error('Proof generation failed:', error);
          process.exit(1);
        }
      }
    );

  return command;
}

async function generateProof(
  txHash: string,
  options: {
    outputDir?: string;
    keepIntermediates?: boolean;
    verbose?: boolean;
    network?: 'mainnet' | 'sepolia';
    skipTrustedSetup?: boolean;
    rpcUrl?: string;
  }
): Promise<void> {
  const {
    outputDir,
    keepIntermediates = false,
    verbose = false,
    network,
    skipTrustedSetup = false,
    rpcUrl,
  } = options;

  // Validate transaction hash
  if (!isValidTxHash(txHash)) {
    throw new Error(
      'Invalid transaction hash format. Expected 0x followed by 64 hexadecimal characters.'
    );
  }

  logger.info(chalk.blue(`🔐 Generating proof for transaction: ${txHash}`));

  // Load configuration
  const configManager = new ConfigManager();
  const config = await configManager.loadConfig();

  // Override config with command options
  if (outputDir) config.outputDir = outputDir;
  if (network) config.network = network;
  config.keepIntermediates = keepIntermediates;
  if (rpcUrl) config.rpcUrl = rpcUrl;

  // Validate configuration
  await configManager.validateConfig(config);

  // Ensure binary is available
  const binaryManager = new BinaryManager(config);
  const binaryPaths = await binaryManager.ensureBinaryAvailable();

  // Create output directory
  await fs.ensureDir(config.outputDir);

  // Initialize script runner
  const scriptRunner = new ScriptRunner(binaryPaths);

  // Set up progress tracking
  const spinner = ora('Initializing proof generation...').start();

  const onProgress = (step: string, current: number, total: number): void => {
    spinner.text = `[${current}/${total}] ${step}`;
  };

  try {
    // Run the full proof generation pipeline
    const proofOptions: any = {
      verbose,
      onProgress,
      skipTrustedSetup,
    };

    if (config.rpcUrl) {
      proofOptions.rpcUrl = config.rpcUrl;
    }

    const results = await scriptRunner.runFullProofGeneration(
      txHash,
      proofOptions
    );

    spinner.succeed(chalk.green('✅ Proof generation completed successfully!'));

    // Copy outputs to project directory
    await copyOutputsToProject(
      binaryPaths.resourceDir,
      config.outputDir,
      txHash
    );

    // Display results summary
    displayResults(results, config.outputDir, txHash);

    // Clean up intermediate files if requested
    if (!keepIntermediates) {
      await cleanupIntermediateFiles(binaryPaths.resourceDir);
      logger.info('Cleaned up intermediate files');
    }
  } catch (error) {
    spinner.fail(chalk.red('❌ Proof generation failed'));

    // Check if error is due to missing setup files
    if (error instanceof Error && error.message.includes('SETUP_MISSING')) {
      console.log();
      console.log(chalk.red('🚫 Missing Trusted Setup Files'));
      console.log(chalk.gray('====================================='));
      console.log();
      console.log(
        chalk.yellow(
          'The proof generation failed because trusted setup files are missing.'
        )
      );
      console.log(
        chalk.gray(
          'These files are required for proof generation and verification.'
        )
      );
      console.log();
      console.log(chalk.blue('💡 Solutions:'));
      console.log();
      console.log(
        chalk.green('1. Download pre-computed setup files (recommended):')
      );
      console.log(
        chalk.gray('   tokamak-zk-evm init --setup-mode download --skip-binary')
      );
      console.log();
      console.log(chalk.yellow('2. Run trusted setup locally (takes time):'));
      console.log(
        chalk.gray('   tokamak-zk-evm init --setup-mode local --skip-binary')
      );
      console.log();
      console.log(chalk.cyan('3. Generate proof with trusted setup:'));
      console.log(
        chalk.gray(
          '   tokamak-zk-evm prove <tx-hash> --skip-trusted-setup=false'
        )
      );
      console.log();
    }

    throw error;
  }
}

function isValidTxHash(txHash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(txHash);
}

async function copyOutputsToProject(
  resourceDir: string,
  outputDir: string,
  txHash: string
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const proofDir = path.join(
    outputDir,
    `proof-${txHash.slice(0, 10)}-${timestamp}`
  );

  await fs.ensureDir(proofDir);

  const outputTypes = ['synthesizer', 'preprocess', 'prove', 'verify'];

  for (const type of outputTypes) {
    // Different output directory names for different steps
    const outputDirName = type === 'synthesizer' ? 'outputs' : 'output';
    const sourceDir = path.join(resourceDir, type, outputDirName);
    const targetDir = path.join(proofDir, type);

    if (await fs.pathExists(sourceDir)) {
      await fs.copy(sourceDir, targetDir);
      logger.debug(`Copied ${type} outputs to ${targetDir}`);
    } else {
      logger.debug(`No outputs found for ${type} at ${sourceDir}`);
    }
  }

  // Create a summary file
  const summary = {
    txHash,
    timestamp: new Date().toISOString(),
    network: 'mainnet', // This should come from config
    outputs: {
      synthesizer: await listFiles(path.join(proofDir, 'synthesizer')),
      preprocess: await listFiles(path.join(proofDir, 'preprocess')),
      prove: await listFiles(path.join(proofDir, 'prove')),
      verify: await listFiles(path.join(proofDir, 'verify')),
    },
  };

  await fs.writeJson(path.join(proofDir, 'summary.json'), summary, {
    spaces: 2,
  });

  logger.info(`Proof outputs saved to: ${proofDir}`);
}

async function listFiles(dir: string): Promise<string[]> {
  try {
    if (await fs.pathExists(dir)) {
      return fs.readdir(dir);
    }
    return [];
  } catch {
    return [];
  }
}

function displayResults(results: any, outputDir: string, txHash: string): void {
  console.log();
  console.log(chalk.green('🎉 Proof Generation Summary'));
  console.log(chalk.gray('================================'));

  console.log(`Transaction Hash: ${chalk.cyan(txHash)}`);
  console.log(`Output Directory: ${chalk.cyan(outputDir)}`);
  console.log();

  // Display step results
  const steps = [
    { name: 'Trusted Setup', result: results.trustedSetup },
    { name: 'Synthesizer', result: results.synthesis },
    { name: 'Preprocessing', result: results.preprocess },
    { name: 'Proof Generation', result: results.prove },
    { name: 'Verification', result: results.verify },
  ];

  for (const step of steps) {
    if (step.result) {
      const status = step.result.success
        ? chalk.green('✅ Success')
        : chalk.red('❌ Failed');
      console.log(`${step.name}: ${status}`);
    }
  }

  console.log();
  console.log(chalk.blue('Next steps:'));
  console.log(`  tokamak-zk-evm list-outputs              # View all outputs`);
  console.log(
    `  tokamak-zk-evm export proof <file>       # Export specific proof`
  );
  console.log(`  tokamak-zk-evm verify <proof-file>       # Verify the proof`);
  console.log();
}

async function cleanupIntermediateFiles(resourceDir: string): Promise<void> {
  const outputTypes = ['synthesizer', 'preprocess', 'prove', 'verify'];

  for (const type of outputTypes) {
    // Different output directory names for different steps
    const outputDirName = type === 'synthesizer' ? 'outputs' : 'output';
    const outputDir = path.join(resourceDir, type, outputDirName);
    if (await fs.pathExists(outputDir)) {
      await fs.emptyDir(outputDir);
      logger.debug(`Cleaned up ${type} outputs at ${outputDir}`);
    }
  }
}

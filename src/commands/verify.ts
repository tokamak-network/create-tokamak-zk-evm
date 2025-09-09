import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as readline from 'readline';
import chalk from 'chalk';
import ora from 'ora';
import { logger } from '../utils/logger';
import { ConfigManager } from '../utils/config-manager';
import { BinaryManager } from '../utils/binary-manager';
import { ScriptRunner } from '../utils/script-runner';

export function createVerifyCommand(): Command {
  const command = new Command('verify');

  command
    .description('Verify a zero-knowledge proof')
    .argument(
      '[proof-file]',
      'Path to the proof file or proof directory (optional for interactive mode)'
    )
    .option('--interactive', 'Interactive mode: select from list-outputs')
    .option(
      '--regenerate <proof-dir>',
      'Regenerate proof from proof.json and transaction_hash.txt before verification'
    )
    .option(
      '--output-dir <dir>',
      'Output directory to scan for proofs (default: ./tokamak-zk-evm-outputs)'
    )
    .option('--verbose', 'Show detailed output')
    .action(
      async (
        proofFile: string | undefined,
        options: {
          interactive?: boolean;
          regenerate?: string;
          outputDir?: string;
          verbose?: boolean;
        }
      ) => {
        try {
          if (options.interactive) {
            await verifyInteractive(options);
          } else if (options.regenerate) {
            await verifyWithRegeneration(options.regenerate, options);
          } else {
            if (!proofFile) {
              throw new Error(
                'Proof file path is required. Use --interactive for interactive mode.'
              );
            }
            await verifyProof(proofFile, options);
          }
        } catch (error) {
          logger.error('Proof verification failed:', error);
          process.exit(1);
        }
      }
    );

  return command;
}

async function verifyProof(
  proofFile: string,
  options: {
    verbose?: boolean;
  }
): Promise<void> {
  const { verbose = false } = options;

  logger.info(chalk.blue(`🔍 Verifying proof: ${proofFile}`));

  // Check if proof file/directory exists
  if (!(await fs.pathExists(proofFile))) {
    throw new Error(`Proof file or directory not found: ${proofFile}`);
  }

  // Load configuration
  const configManager = new ConfigManager();
  const config = await configManager.loadConfig();

  // Ensure binary is available
  const binaryManager = new BinaryManager(config);
  const binaryPaths = await binaryManager.ensureBinaryAvailable();

  // Determine if it's a file or directory
  const stats = await fs.stat(proofFile);
  let proofDir: string;
  let proofInfo: any;

  if (stats.isDirectory()) {
    proofDir = proofFile;
    // Try to load summary.json if it exists
    const summaryPath = path.join(proofDir, 'summary.json');
    if (await fs.pathExists(summaryPath)) {
      proofInfo = await fs.readJson(summaryPath);
    }
  } else {
    // Single file - assume it's a proof.json file
    proofDir = path.dirname(proofFile);
    if (path.basename(proofFile) === 'proof.json') {
      // Look for the parent proof directory structure
      const parentDir = path.dirname(proofDir);
      if (await fs.pathExists(path.join(parentDir, 'summary.json'))) {
        proofDir = parentDir;
        proofInfo = await fs.readJson(path.join(parentDir, 'summary.json'));
      }
    }
  }

  // Copy proof files to binary resource directory for verification
  await setupProofForVerification(proofDir, binaryPaths.resourceDir);

  // Initialize script runner
  const scriptRunner = new ScriptRunner(binaryPaths);

  try {
    // Run verification
    const result = await scriptRunner.runVerify({
      verbose,
      onProgress: (step, _current, _total) => {
        logger.info(`Verification: ${step}`);
      },
    });

    console.log();

    if (result.success) {
      // Check actual verification result from the output file
      const verificationResult = await getVerificationResult(
        binaryPaths.resourceDir
      );

      if (verificationResult && verificationResult.verified === true) {
        console.log(chalk.green('✅ Proof format is VALID'));
        console.log(chalk.green('✅ Verification result: TRUE'));
      } else if (verificationResult && verificationResult.verified === false) {
        console.log(chalk.green('✅ Proof format is VALID'));
        console.log(chalk.red('❌ Verification result: FALSE'));
      } else {
        console.log(
          chalk.yellow('⚠️ Verification completed but result is unclear.')
        );
      }

      if (proofInfo) {
        displayProofInfo(proofInfo);
      }

      // Display verification result details
      await displayVerificationResult(binaryPaths.resourceDir);
    } else {
      console.log(chalk.red('❌ Proof verification script failed to execute!'));

      if (verbose && result.stderr) {
        console.log(chalk.red('Error details:'));
        console.log(result.stderr);
      }
    }
  } catch (error) {
    throw new Error(`Verification process failed: ${error}`);
  }
}

async function setupProofForVerification(
  proofDir: string,
  resourceDir: string
): Promise<void> {
  // Copy necessary files to the binary's resource directory
  const outputTypes = ['prove', 'verify', 'preprocess'];

  for (const type of outputTypes) {
    const sourceDir = path.join(proofDir, type);
    const targetDir = path.join(resourceDir, type, 'outputs');

    if (await fs.pathExists(sourceDir)) {
      await fs.ensureDir(targetDir);
      await fs.copy(sourceDir, targetDir);
      logger.debug(`Copied ${type} files for verification`);
    }
  }
}

function displayProofInfo(proofInfo: any): void {
  console.log();
  console.log(chalk.blue('📋 Proof Information'));
  console.log(chalk.gray('===================='));

  if (proofInfo.txHash) {
    console.log(`Transaction Hash: ${chalk.cyan(proofInfo.txHash)}`);
  }

  if (proofInfo.timestamp) {
    console.log(
      `Generated: ${chalk.cyan(new Date(proofInfo.timestamp).toLocaleString())}`
    );
  }

  if (proofInfo.network) {
    console.log(`Network: ${chalk.cyan(proofInfo.network)}`);
  }

  if (proofInfo.outputs) {
    console.log();
    console.log('Output Files:');
    for (const [type, files] of Object.entries(proofInfo.outputs)) {
      if (Array.isArray(files) && files.length > 0) {
        console.log(`  ${type}: ${chalk.gray(files.join(', '))}`);
      }
    }
  }
}

async function displayVerificationResult(resourceDir: string): Promise<void> {
  const verificationResultPath = path.join(
    resourceDir,
    'verify',
    'output',
    'verification.json'
  );

  if (await fs.pathExists(verificationResultPath)) {
    try {
      const result = await fs.readJson(verificationResultPath);

      console.log();
      console.log(chalk.blue('🔍 Verification Details'));
      console.log(chalk.gray('======================='));

      if (result.verified !== undefined) {
        const status = result.verified
          ? chalk.green('✅ Valid')
          : chalk.red('❌ Invalid');
        console.log(`Proof Status: ${status}`);

        const verificationResult = result.verified
          ? chalk.green('TRUE')
          : chalk.red('FALSE');
        console.log(`Verification Result: ${verificationResult}`);
      }

      if (result.timestamp) {
        console.log(
          `Verified At: ${chalk.cyan(new Date(result.timestamp).toLocaleString())}`
        );
      }

      if (result.exitCode !== undefined) {
        console.log(`Exit Code: ${chalk.gray(result.exitCode)}`);
      }

      if (result.message) {
        console.log(`Message: ${chalk.gray(result.message)}`);
      }
    } catch (error) {
      logger.debug('Could not parse verification result:', error);
    }
  }
}

/**
 * Interactive verification - select from list-outputs
 */
async function verifyInteractive(options: {
  outputDir?: string;
  verbose?: boolean;
}): Promise<void> {
  const outputDir = options.outputDir || './tokamak-zk-evm-outputs';

  logger.info(chalk.blue('🔍 Interactive Proof Verification'));
  console.log();

  // Get list of proof outputs
  const proofOutputs = await getProofOutputs(outputDir);

  if (proofOutputs.length === 0) {
    console.log(chalk.yellow('No proof outputs found.'));
    console.log(
      chalk.gray(
        'Run a proof generation first with: tokamak-zk-evm prove <tx-hash>'
      )
    );
    return;
  }

  // Display available proofs
  console.log(chalk.yellow(`Found ${proofOutputs.length} proof output(s):`));
  console.log();

  proofOutputs.forEach((proof, index) => {
    console.log(`${chalk.cyan(`${index + 1}.`)} ${chalk.white(proof.name)}`);
    console.log(
      `   ${chalk.gray('Created:')} ${proof.created.toLocaleString()}`
    );
    if (proof.summary?.txHash) {
      console.log(`   ${chalk.gray('Transaction:')} ${proof.summary.txHash}`);
    }
    if (proof.summary?.network) {
      console.log(`   ${chalk.gray('Network:')} ${proof.summary.network}`);
    }
    console.log();
  });

  // Prompt for selection
  const selectedIndex = await promptForProofSelection(proofOutputs.length);
  const selectedProof = proofOutputs[selectedIndex];

  console.log(chalk.blue(`Selected: ${selectedProof.name}`));
  console.log();

  // Verify the selected proof
  await verifyProof(selectedProof.path, options);
}

/**
 * Verify with regeneration - regenerate proof from proof.json and transaction_hash.txt
 */
async function verifyWithRegeneration(
  proofPath: string,
  options: {
    verbose?: boolean;
  }
): Promise<void> {
  logger.info(chalk.blue('🔄 Regenerating and Verifying Proof'));
  console.log();

  // Check if proof path exists
  if (!(await fs.pathExists(proofPath))) {
    throw new Error(`Proof path not found: ${proofPath}`);
  }

  const stats = await fs.stat(proofPath);
  let proofDir: string;

  if (stats.isDirectory()) {
    proofDir = proofPath;
  } else {
    proofDir = path.dirname(proofPath);
  }

  // Look for required files
  const proofJsonPath = path.join(proofDir, 'proof.json');
  const txHashPath = path.join(proofDir, 'transaction_hash.txt');

  if (!(await fs.pathExists(proofJsonPath))) {
    throw new Error(`proof.json not found in: ${proofDir}`);
  }

  if (!(await fs.pathExists(txHashPath))) {
    throw new Error(`transaction_hash.txt not found in: ${proofDir}`);
  }

  // Read transaction hash
  const txHash = (await fs.readFile(txHashPath, 'utf8')).trim();

  if (!isValidTxHash(txHash)) {
    throw new Error(
      `Invalid transaction hash in transaction_hash.txt: ${txHash}`
    );
  }

  logger.info(`Transaction Hash: ${chalk.cyan(txHash)}`);

  // Load configuration
  const configManager = new ConfigManager();
  const config = await configManager.loadConfig();

  // Ensure binary is available
  const binaryManager = new BinaryManager(config);
  const binaryPaths = await binaryManager.ensureBinaryAvailable();

  // Initialize script runner
  const scriptRunner = new ScriptRunner(binaryPaths);

  // Set up progress tracking
  const spinner = ora('Regenerating proof components...').start();

  const onProgress = (step: string, current: number, total: number): void => {
    spinner.text = `[${current}/${total}] ${step}`;
  };

  try {
    // Run synthesizer and preprocess (skip trusted setup and prove)
    const proofOptions: any = {
      verbose: options.verbose,
      onProgress,
      skipTrustedSetup: true, // Always skip trusted setup for regeneration
      regenerateOnly: true, // Only run synthesizer and preprocess
    };

    if (config.rpcUrl) {
      proofOptions.rpcUrl = config.rpcUrl;
    }

    // Run partial proof generation (synthesizer + preprocess only)
    await scriptRunner.runPartialProofGeneration(txHash, proofOptions);

    spinner.text = 'Copying existing proof.json...';

    // Copy the existing proof.json to the prove output directory
    const proveOutputDir = path.join(
      binaryPaths.resourceDir,
      'prove',
      'output'
    );
    await fs.ensureDir(proveOutputDir);
    await fs.copy(proofJsonPath, path.join(proveOutputDir, 'proof.json'));

    spinner.succeed(
      chalk.green('✅ Proof components regenerated successfully!')
    );

    // Now run verification
    const result = await scriptRunner.runVerify({
      verbose: options.verbose || false,
      onProgress: (step, _current, _total) => {
        logger.info(`Verification: ${step}`);
      },
    });

    console.log();

    if (result.success) {
      // Check actual verification result from the output file
      const verificationResult = await getVerificationResult(
        binaryPaths.resourceDir
      );

      if (verificationResult && verificationResult.verified === true) {
        console.log(chalk.green('✅ Proof format is VALID'));
        console.log(chalk.green('✅ Verification result: TRUE'));
      } else if (verificationResult && verificationResult.verified === false) {
        console.log(chalk.green('✅ Proof format is VALID'));
        console.log(chalk.red('❌ Verification result: FALSE'));
      } else {
        console.log(
          chalk.yellow('⚠️ Verification completed but result is unclear.')
        );
      }

      // Display verification result details
      await displayVerificationResult(binaryPaths.resourceDir);
    } else {
      console.log(chalk.red('❌ Proof verification script failed to execute!'));

      if (options.verbose && result.stderr) {
        console.log(chalk.red('Error details:'));
        console.log(result.stderr);
      }
    }
  } catch (error) {
    spinner.fail(chalk.red('❌ Regeneration failed'));

    // Check if error is due to missing setup files
    if (error instanceof Error && error.message.includes('SETUP_MISSING')) {
      console.log();
      console.log(chalk.red('🚫 Missing Trusted Setup Files'));
      console.log(chalk.gray('====================================='));
      console.log();
      console.log(
        chalk.yellow(
          'The verification failed because trusted setup files are missing.'
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

/**
 * Get list of proof outputs from directory
 */
async function getProofOutputs(outputDir: string): Promise<
  Array<{
    name: string;
    path: string;
    created: Date;
    modified: Date;
    summary?: any;
  }>
> {
  if (!(await fs.pathExists(outputDir))) {
    return [];
  }

  const entries = await fs.readdir(outputDir, { withFileTypes: true });
  const proofDirs = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('proof-'))
    .map(async (entry) => {
      const dirPath = path.join(outputDir, entry.name);
      const stats = await fs.stat(dirPath);

      // Try to load summary
      let summary = null;
      const summaryPath = path.join(dirPath, 'summary.json');
      if (await fs.pathExists(summaryPath)) {
        try {
          summary = await fs.readJson(summaryPath);
        } catch {
          // Ignore JSON parse errors
        }
      }

      return {
        name: entry.name,
        path: dirPath,
        created: stats.birthtime,
        modified: stats.mtime,
        summary,
      };
    });

  const results = await Promise.all(proofDirs);
  results.sort((a, b) => b.modified.getTime() - a.modified.getTime());

  return results;
}

/**
 * Prompt user to select a proof from the list
 */
async function promptForProofSelection(maxIndex: number): Promise<number> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const askForSelection = () => {
      rl.question(
        chalk.yellow(`Select a proof to verify (1-${maxIndex}): `),
        (answer) => {
          const selection = parseInt(answer.trim(), 10);

          if (isNaN(selection) || selection < 1 || selection > maxIndex) {
            console.log(
              chalk.red(`Please enter a number between 1 and ${maxIndex}`)
            );
            askForSelection();
          } else {
            rl.close();
            resolve(selection - 1); // Convert to 0-based index
          }
        }
      );
    };

    askForSelection();
  });
}

/**
 * Get verification result from the output file
 */
async function getVerificationResult(resourceDir: string): Promise<{
  verified: boolean;
  timestamp?: string;
  exitCode?: number;
  message?: string;
} | null> {
  const verificationResultPath = path.join(
    resourceDir,
    'verify',
    'output',
    'verification.json'
  );

  if (await fs.pathExists(verificationResultPath)) {
    try {
      const result = await fs.readJson(verificationResultPath);
      return result;
    } catch (error) {
      logger.debug('Could not parse verification result:', error);
      return null;
    }
  }

  return null;
}

/**
 * Validate transaction hash format
 */
function isValidTxHash(txHash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(txHash);
}

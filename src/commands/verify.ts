import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { logger } from '../utils/logger';
import { ConfigManager } from '../utils/config-manager';
import { BinaryManager } from '../utils/binary-manager';
import { ScriptRunner } from '../utils/script-runner';

export function createVerifyCommand(): Command {
  const command = new Command('verify');
  
  command
    .description('Verify a zero-knowledge proof')
    .argument('<proof-file>', 'Path to the proof file or proof directory')
    .option('--verbose', 'Show detailed output')
    .action(async (proofFile: string, options: {
      verbose?: boolean;
    }) => {
      try {
        await verifyProof(proofFile, options);
      } catch (error) {
        logger.error('Proof verification failed:', error);
        process.exit(1);
      }
    });

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

    if (result.success) {
      console.log();
      console.log(chalk.green('✅ Proof verification successful!'));
      
      if (proofInfo) {
        displayProofInfo(proofInfo);
      }
      
      // Try to parse verification result
      await displayVerificationResult(binaryPaths.resourceDir);
      
    } else {
      console.log();
      console.log(chalk.red('❌ Proof verification failed!'));
      
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
    console.log(`Generated: ${chalk.cyan(new Date(proofInfo.timestamp).toLocaleString())}`);
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
  const verificationResultPath = path.join(resourceDir, 'verify', 'outputs', 'verification_result.json');
  
  if (await fs.pathExists(verificationResultPath)) {
    try {
      const result = await fs.readJson(verificationResultPath);
      
      console.log();
      console.log(chalk.blue('🔍 Verification Details'));
      console.log(chalk.gray('======================='));
      
      if (result.valid !== undefined) {
        const status = result.valid 
          ? chalk.green('✅ Valid') 
          : chalk.red('❌ Invalid');
        console.log(`Proof Status: ${status}`);
      }
      
      if (result.timestamp) {
        console.log(`Verified At: ${chalk.cyan(new Date(result.timestamp).toLocaleString())}`);
      }
      
      if (result.details) {
        console.log('Details:', chalk.gray(JSON.stringify(result.details, null, 2)));
      }
      
    } catch (error) {
      logger.debug('Could not parse verification result:', error);
    }
  }
}

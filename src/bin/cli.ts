#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { createInitCommand } from '../commands/init';
import { createProveCommand } from '../commands/prove';
import { createVerifyCommand } from '../commands/verify';
import { createExportCommand } from '../commands/export';
import { createStatusCommand } from '../commands/status';
import { createSetupCommand } from '../commands/setup';
import { logger } from '../utils/logger';
import { ConfigManager } from '../utils/config-manager';
import { BinaryManager } from '../utils/binary-manager';
import {
  displayWelcomeScreen,
  promptForProjectName,
  promptForRpcUrl,
  promptForSetupMode,
  displaySetupProgress,
  displayCompletionMessage,
} from '../utils/welcome-screen';

const program = new Command();

// Package information
const packageJson = require('../../package.json');

program
  .name('tokamak-zk-evm')
  .description('CLI tool for Tokamak-zk-EVM proof generation and verification')
  .version(packageJson.version, '-v, --version', 'display version number');

// Global options
program
  .option('--verbose', 'enable verbose logging')
  .option('--debug', 'enable debug logging')
  .hook('preAction', (thisCommand) => {
    const options = thisCommand.opts();

    // Set up logging level
    if (options.debug) {
      logger.setLevel('debug');
    } else if (options.verbose) {
      logger.setLevel('info');
    }
  });

// Add commands
program.addCommand(createInitCommand());
program.addCommand(createSetupCommand());
program.addCommand(createProveCommand());
program.addCommand(createVerifyCommand());
program.addCommand(createExportCommand());
program.addCommand(createStatusCommand());

// Additional utility commands
program
  .command('list-outputs')
  .description('List all proof outputs in the current project')
  .option(
    '--output-dir <dir>',
    'Output directory to scan',
    './tokamak-zk-evm-outputs'
  )
  .action(async (options: { outputDir?: string }) => {
    try {
      await listOutputs(options.outputDir || './tokamak-zk-evm-outputs');
    } catch (error) {
      logger.error('Failed to list outputs:', error);
      process.exit(1);
    }
  });

program
  .command('clean')
  .description('Clean up cache and temporary files')
  .option('--cache', 'Clean binary cache')
  .option('--outputs', 'Clean output files')
  .option('--all', 'Clean everything')
  .action(
    async (options: { cache?: boolean; outputs?: boolean; all?: boolean }) => {
      try {
        await cleanFiles(options);
      } catch (error) {
        logger.error('Failed to clean files:', error);
        process.exit(1);
      }
    }
  );

program
  .command('update')
  .description('Update the Tokamak-zk-EVM binary to the latest version')
  .action(async () => {
    try {
      await updateBinary();
    } catch (error) {
      logger.error('Failed to update binary:', error);
      process.exit(1);
    }
  });

// Handle unknown commands
program.on('command:*', (operands) => {
  console.error(chalk.red(`Unknown command: ${operands[0]}`));
  console.log('Run `tokamak-zk-evm --help` to see available commands.');
  process.exit(1);
});

// Error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// If no command is provided, run default action
if (!process.argv.slice(2).length) {
  handleDefaultAction().catch((error) => {
    logger.error('Setup failed:', error);
    process.exit(1);
  });
} else {
  // Parse command line arguments for specific commands
  program.parse();
}

// Utility functions
async function listOutputs(outputDir: string): Promise<void> {
  const fs = await import('fs-extra');
  const path = await import('path');

  logger.info(chalk.blue(`📋 Listing outputs in: ${outputDir}`));

  if (!(await fs.pathExists(outputDir))) {
    logger.warn('Output directory not found. Run a proof generation first.');
    return;
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

  if (results.length === 0) {
    console.log(chalk.gray('No proof outputs found.'));
    return;
  }

  console.log();
  console.log(chalk.yellow(`Found ${results.length} proof output(s):`));
  console.log();

  results.forEach((result, index) => {
    console.log(`${index + 1}. ${chalk.cyan(result.name)}`);
    console.log(`   Created: ${chalk.gray(result.created.toLocaleString())}`);
    console.log(`   Modified: ${chalk.gray(result.modified.toLocaleString())}`);

    if (result.summary) {
      if (result.summary.txHash) {
        console.log(`   Transaction: ${chalk.gray(result.summary.txHash)}`);
      }
      if (result.summary.network) {
        console.log(`   Network: ${chalk.gray(result.summary.network)}`);
      }
    }

    console.log(`   Path: ${chalk.gray(result.path)}`);
    console.log();
  });

  console.log(chalk.blue('💡 Export Examples:'));
  console.log(
    chalk.gray(
      '   tokamak-zk-evm export all ./exported-proofs     # Export all outputs to directory'
    )
  );
  console.log(
    chalk.gray(
      '   tokamak-zk-evm export proof ./my-proof.json    # Export proof file only'
    )
  );
  console.log(
    chalk.gray(
      '   tokamak-zk-evm export synthesizer ./synth-out  # Export synthesizer outputs'
    )
  );
  console.log(
    chalk.gray(
      '   tokamak-zk-evm export preprocess ./prep-out    # Export preprocessing outputs'
    )
  );
}

async function cleanFiles(options: {
  cache?: boolean;
  outputs?: boolean;
  all?: boolean;
}): Promise<void> {
  const fs = await import('fs-extra');
  const { cache, outputs, all } = options;

  if (!cache && !outputs && !all) {
    logger.error('Please specify what to clean: --cache, --outputs, or --all');
    return;
  }

  const configManager = new ConfigManager();
  const config = await configManager.loadConfig();

  if (cache || all) {
    logger.info('Cleaning binary cache...');
    const binaryManager = new BinaryManager(config);
    await binaryManager.cleanCache();
    logger.info(chalk.green('✅ Cache cleaned'));
  }

  if (outputs || all) {
    logger.info('Cleaning output files...');
    if (await fs.pathExists(config.outputDir)) {
      await fs.emptyDir(config.outputDir);
      logger.info(chalk.green('✅ Output files cleaned'));
    } else {
      logger.info('No output directory found');
    }
  }

  logger.info(chalk.green('🧹 Cleanup completed'));
}

async function updateBinary(): Promise<void> {
  logger.info(chalk.blue('🔄 Updating Tokamak-zk-EVM binary...'));

  const configManager = new ConfigManager();
  const config = await configManager.loadConfig();
  const binaryManager = new BinaryManager(config);

  await binaryManager.updateBinary();

  logger.info(chalk.green('✅ Binary updated successfully'));
}

/**
 * Handle the default action when no command is provided
 * Shows welcome screen and starts interactive setup
 */
async function handleDefaultAction(): Promise<void> {
  try {
    // Show welcome screen
    displayWelcomeScreen();

    // Get project name first
    const projectName = await promptForProjectName();

    // Then prompt for RPC URL
    const rpcUrl = await promptForRpcUrl();

    // Check if setup files are available and prompt for setup mode
    const configManager = new ConfigManager();
    const config = await configManager.loadConfig();
    const binaryManager = new BinaryManager(config);
    const hasSetupFiles = await binaryManager.hasSetupFiles();

    const setupMode = await promptForSetupMode(hasSetupFiles);

    // Show setup progress
    displaySetupProgress(setupMode);

    // Import and run init logic
    const { initializeProject } = await import('../commands/init');

    await initializeProject(projectName, {
      rpcUrl: rpcUrl,
      setupMode: setupMode as 'download' | 'local' | 'skip',
    });

    // Show completion message
    displayCompletionMessage(projectName, rpcUrl);
  } catch (error) {
    logger.error('Setup failed:', error);
    process.exit(1);
  }
}

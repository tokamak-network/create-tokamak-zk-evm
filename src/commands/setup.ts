import { Command } from 'commander';
import chalk from 'chalk';
import { logger } from '../utils/logger';
import { ConfigManager } from '../utils/config-manager';
import { BinaryManager } from '../utils/binary-manager';
import { PlatformDetector } from '../utils/platform-detector';
import { ScriptRunner } from '../utils/script-runner';
import { promptForSetupMode } from '../utils/welcome-screen';

export function createSetupCommand(): Command {
  const command = new Command('setup');

  command
    .description('Configure trusted setup for proof generation')
    .option(
      '--mode <mode>',
      'Setup mode: "download" (from release), "local" (run script), or "skip"'
    )
    .action(async (options?: { mode?: 'download' | 'local' | 'skip' }) => {
      try {
        await runSetup(options?.mode);
      } catch (error) {
        logger.error('Setup failed:', error);
        process.exit(1);
      }
    });

  return command;
}

async function runSetup(mode?: string): Promise<void> {
  // Check platform compatibility
  if (!PlatformDetector.isSupported()) {
    throw new Error(
      'This platform is not supported. Only macOS and Linux are supported.'
    );
  }

  logger.info(chalk.blue('🔧 Tokamak-zk-EVM Trusted Setup'));

  // Load configuration
  const configManager = new ConfigManager();
  const config = await configManager.loadConfig();

  // Create binary manager
  const binaryManager = new BinaryManager(config);

  // Check if setup is already installed
  const isSetupInstalled = await binaryManager.isSetupInstalled();
  if (isSetupInstalled) {
    logger.info(chalk.green('✅ Trusted setup files are already installed'));

    console.log();
    console.log(chalk.blue('Setup file locations:'));
    console.log(chalk.gray('  ~/.tokamak-zk-evm/resources/setup/output/'));
    console.log(chalk.gray('    - combined_sigma.bin'));
    console.log(chalk.gray('    - combined_sigma.json'));
    console.log(chalk.gray('    - sigma_preprocess.json'));
    console.log(chalk.gray('    - sigma_verify.json'));
    console.log();

    return;
  }

  let selectedMode = mode;

  // If no mode specified, prompt user with arrow key navigation
  if (!selectedMode) {
    const hasSetupFiles = await binaryManager.hasSetupFiles();
    selectedMode = await promptForSetupMode(hasSetupFiles);
  }

  console.log();
  logger.info(chalk.blue('🔧 Setting up trusted setup files...'));

  switch (selectedMode) {
    case 'download':
      try {
        await binaryManager.downloadAndInstallSetupFiles();
        logger.info(chalk.green('✅ Setup files downloaded and installed'));
        displaySetupSuccess();
      } catch (error) {
        logger.error('Failed to download setup files:', error);
        logger.info(
          chalk.yellow(
            '💡 Try running local setup: tokamak-zk-evm setup --mode local'
          )
        );
      }
      break;

    case 'local':
      try {
        await runLocalTrustedSetup(binaryManager, config);
        logger.info(chalk.green('✅ Local trusted setup completed'));
        displaySetupSuccess();
      } catch (error) {
        logger.error('Failed to run local trusted setup:', error);
        logger.info(
          chalk.yellow(
            '💡 You can try downloading pre-computed files: tokamak-zk-evm setup --mode download'
          )
        );
      }
      break;

    case 'skip':
      logger.info(chalk.yellow('⏭️ Skipped trusted setup'));
      logger.info(
        chalk.gray('💡 You can run setup later with: tokamak-zk-evm setup')
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

function displaySetupSuccess(): void {
  console.log();
  console.log(chalk.green('🎉 Trusted setup completed successfully!'));
  console.log();
  console.log(chalk.blue('You can now:'));
  console.log('  tokamak-zk-evm prove <transaction-hash>   # Generate proofs');
  console.log('  tokamak-zk-evm verify <proof-file>        # Verify proofs');
  console.log();
  console.log(chalk.gray('Happy proving! 🔐'));
}

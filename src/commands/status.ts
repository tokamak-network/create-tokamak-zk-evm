import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import { logger } from '../utils/logger';
import { ConfigManager } from '../utils/config-manager';
import { BinaryManager } from '../utils/binary-manager';
import { PlatformDetector } from '../utils/platform-detector';

export function createStatusCommand(): Command {
  const command = new Command('status');

  command
    .description('Show the current status of Tokamak-zk-EVM CLI')
    .option('--verbose', 'Show detailed information')
    .action(async (options: { verbose?: boolean }) => {
      try {
        await showStatus(options);
      } catch (error) {
        logger.error('Failed to get status:', error);
        process.exit(1);
      }
    });

  return command;
}

async function showStatus(options: { verbose?: boolean }): Promise<void> {
  const { verbose = false } = options;

  console.log(chalk.blue('🔍 Tokamak-zk-EVM CLI Status'));
  console.log(chalk.gray('============================'));
  console.log();

  // Platform Information
  console.log(chalk.yellow('Platform Information:'));
  try {
    const platformInfo = PlatformDetector.detect();
    console.log(`  OS: ${chalk.cyan(platformInfo.platform)}`);
    console.log(`  Architecture: ${chalk.cyan(platformInfo.arch)}`);
    console.log(`  Binary Name: ${chalk.cyan(platformInfo.binaryName)}`);
    console.log(`  Supported: ${chalk.green('✅ Yes')}`);
  } catch (error) {
    console.log(`  Supported: ${chalk.red('❌ No')}`);
    console.log(`  Error: ${chalk.red(error)}`);
  }
  console.log();

  // Configuration Status
  console.log(chalk.yellow('Configuration:'));
  const configManager = new ConfigManager();

  try {
    const config = await configManager.loadConfig();
    console.log(
      `  Global Config: ${(await configManager.hasGlobalConfig()) ? chalk.green('✅ Found') : chalk.gray('❌ Not found')}`
    );
    console.log(
      `  Project Config: ${(await configManager.hasProjectConfig()) ? chalk.green('✅ Found') : chalk.gray('❌ Not found')}`
    );
    console.log(`  Network: ${chalk.cyan(config.network)}`);
    console.log(`  Output Directory: ${chalk.cyan(config.outputDir)}`);
    console.log(`  Cache Directory: ${chalk.cyan(config.cacheDir)}`);
    console.log(`  Binary Version: ${chalk.cyan(config.binaryVersion)}`);

    if (verbose) {
      console.log(`  GitHub Repo: ${chalk.cyan(config.githubRepo)}`);
      console.log(
        `  Keep Intermediates: ${config.keepIntermediates ? chalk.green('Yes') : chalk.gray('No')}`
      );
      console.log(
        `  RPC URL: ${config.rpcUrl ? chalk.green('✅ Set') : chalk.gray('❌ Not set')}`
      );
    }
  } catch (error) {
    console.log(`  Status: ${chalk.red('❌ Configuration error')}`);
    console.log(`  Error: ${chalk.red(error)}`);
  }
  console.log();

  // Binary Status
  console.log(chalk.yellow('Binary Status:'));
  try {
    const config = await configManager.loadConfig();
    const binaryManager = new BinaryManager(config);
    const binaryPaths = binaryManager.getBinaryPaths();

    const binaryExists = await fs.pathExists(binaryPaths.binaryDir);
    console.log(
      `  Binary Installed: ${binaryExists ? chalk.green('✅ Yes') : chalk.red('❌ No')}`
    );

    if (binaryExists) {
      console.log(`  Binary Location: ${chalk.cyan(binaryPaths.binaryDir)}`);

      // Check individual components
      const components = [
        {
          name: 'Scripts',
          path: binaryPaths.binaryDir,
          files: Object.values(binaryPaths.scripts),
        },
        {
          name: 'Binaries',
          path: binaryPaths.binDir,
          files: [
            'preprocess',
            'prove',
            'synthesizer',
            'trusted-setup',
            'verify',
          ],
        },
        { name: 'Resources', path: binaryPaths.resourceDir, files: [] },
      ];

      for (const component of components) {
        const exists = await fs.pathExists(component.path);
        console.log(
          `  ${component.name}: ${exists ? chalk.green('✅ Found') : chalk.red('❌ Missing')}`
        );

        if (verbose && exists && component.files.length > 0) {
          for (const file of component.files) {
            const filePath =
              typeof file === 'string'
                ? path.join(component.path, file)
                : String(file);
            const fileExists = await fs.pathExists(filePath);
            const fileName = path.basename(filePath);
            console.log(
              `    ${fileName}: ${fileExists ? chalk.green('✅') : chalk.red('❌')}`
            );
          }
        }
      }
    } else {
      console.log(`  Installation Path: ${chalk.cyan(binaryPaths.binaryDir)}`);
    }
  } catch (error) {
    console.log(`  Status: ${chalk.red('❌ Binary check failed')}`);
    console.log(`  Error: ${chalk.red(error)}`);
  }
  console.log();

  // Project Status
  console.log(chalk.yellow('Project Status:'));
  const currentDir = process.cwd();
  console.log(`  Current Directory: ${chalk.cyan(currentDir)}`);

  // Check for project files
  const projectFiles = [
    'tokamak.config.js',
    'package.json',
    'README.md',
    '.gitignore',
  ];

  for (const file of projectFiles) {
    const exists = await fs.pathExists(path.join(currentDir, file));
    console.log(
      `  ${file}: ${exists ? chalk.green('✅ Found') : chalk.gray('❌ Not found')}`
    );
  }

  // Check output directory
  try {
    const config = await configManager.loadConfig();
    const outputDirExists = await fs.pathExists(config.outputDir);
    console.log(
      `  Output Directory: ${outputDirExists ? chalk.green('✅ Exists') : chalk.gray('❌ Not found')}`
    );

    if (outputDirExists) {
      const outputs = await listProofOutputs(config.outputDir);
      console.log(`  Proof Outputs: ${chalk.cyan(outputs.length)} found`);

      if (verbose && outputs.length > 0) {
        console.log('  Recent Proofs:');
        outputs.slice(0, 5).forEach((output) => {
          console.log(`    ${chalk.gray(output.name)} (${output.date})`);
        });
      }
    }
  } catch (error) {
    console.log(`  Output Status: ${chalk.red('❌ Error checking outputs')}`);
  }
  console.log();

  // Recommendations
  console.log(chalk.yellow('Recommendations:'));
  await showRecommendations(configManager);
}

async function listProofOutputs(
  outputDir: string
): Promise<Array<{ name: string; date: string }>> {
  try {
    const entries = await fs.readdir(outputDir, { withFileTypes: true });
    const proofDirs = entries
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('proof-'))
      .map(async (entry) => {
        const stats = await fs.stat(path.join(outputDir, entry.name));
        return {
          name: entry.name,
          date: stats.mtime.toLocaleDateString(),
        };
      });

    const results = await Promise.all(proofDirs);
    return results.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch {
    return [];
  }
}

async function showRecommendations(
  configManager: ConfigManager
): Promise<void> {
  const recommendations: string[] = [];

  try {
    const config = await configManager.loadConfig();
    const binaryManager = new BinaryManager(config);
    const binaryPaths = binaryManager.getBinaryPaths();

    // Check if binary is installed
    if (!(await fs.pathExists(binaryPaths.binaryDir))) {
      recommendations.push(
        'Run `tokamak-zk-evm init` to download and set up the binary'
      );
    }

    // Check if project is initialized
    if (!(await configManager.hasProjectConfig())) {
      recommendations.push(
        'Run `tokamak-zk-evm init` to initialize a project in this directory'
      );
    }

    // Check if RPC URL is set
    if (!config.rpcUrl) {
      recommendations.push(
        'Set RPC URL for transaction data access (e.g., --rpc-url https://mainnet.infura.io/v3/YOUR-PROJECT-ID)'
      );
    }

    // Check if output directory exists
    if (!(await fs.pathExists(config.outputDir))) {
      recommendations.push(
        `Create output directory: mkdir -p ${config.outputDir}`
      );
    }
  } catch (error) {
    recommendations.push('Fix configuration issues before proceeding');
  }

  if (recommendations.length === 0) {
    console.log(
      `  ${chalk.green("✅ Everything looks good! You're ready to generate proofs.")}`
    );
  } else {
    recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
  }

  console.log();
  console.log(chalk.blue('💡 Next steps:'));
  console.log('  tokamak-zk-evm prove <tx-hash>  # Generate a proof');
  console.log('  tokamak-zk-evm --help           # See all available commands');
}

#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const init_1 = require("../commands/init");
const prove_1 = require("../commands/prove");
const verify_1 = require("../commands/verify");
const export_1 = require("../commands/export");
const status_1 = require("../commands/status");
const setup_1 = require("../commands/setup");
const logger_1 = require("../utils/logger");
const config_manager_1 = require("../utils/config-manager");
const binary_manager_1 = require("../utils/binary-manager");
const welcome_screen_1 = require("../utils/welcome-screen");
const program = new commander_1.Command();
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
        logger_1.logger.setLevel('debug');
    }
    else if (options.verbose) {
        logger_1.logger.setLevel('info');
    }
});
// Add commands
program.addCommand((0, init_1.createInitCommand)());
program.addCommand((0, setup_1.createSetupCommand)());
program.addCommand((0, prove_1.createProveCommand)());
program.addCommand((0, verify_1.createVerifyCommand)());
program.addCommand((0, export_1.createExportCommand)());
program.addCommand((0, status_1.createStatusCommand)());
// Additional utility commands
program
    .command('list-outputs')
    .description('List all proof outputs in the current project')
    .option('--output-dir <dir>', 'Output directory to scan', './tokamak-zk-evm-outputs')
    .action(async (options) => {
    try {
        await listOutputs(options.outputDir || './tokamak-zk-evm-outputs');
    }
    catch (error) {
        logger_1.logger.error('Failed to list outputs:', error);
        process.exit(1);
    }
});
program
    .command('clean')
    .description('Clean up cache and temporary files')
    .option('--cache', 'Clean binary cache')
    .option('--outputs', 'Clean output files')
    .option('--all', 'Clean everything')
    .action(async (options) => {
    try {
        await cleanFiles(options);
    }
    catch (error) {
        logger_1.logger.error('Failed to clean files:', error);
        process.exit(1);
    }
});
program
    .command('update')
    .description('Update the Tokamak-zk-EVM binary to the latest version')
    .action(async () => {
    try {
        await updateBinary();
    }
    catch (error) {
        logger_1.logger.error('Failed to update binary:', error);
        process.exit(1);
    }
});
// Handle unknown commands
program.on('command:*', (operands) => {
    console.error(chalk_1.default.red(`Unknown command: ${operands[0]}`));
    console.log('Run `tokamak-zk-evm --help` to see available commands.');
    process.exit(1);
});
// Error handling
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught exception:', error);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    logger_1.logger.error('Unhandled rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
// If no command is provided, run default action
if (!process.argv.slice(2).length) {
    handleDefaultAction().catch((error) => {
        logger_1.logger.error('Setup failed:', error);
        process.exit(1);
    });
}
else {
    // Parse command line arguments for specific commands
    program.parse();
}
// Utility functions
async function listOutputs(outputDir) {
    const fs = await Promise.resolve().then(() => __importStar(require('fs-extra')));
    const path = await Promise.resolve().then(() => __importStar(require('path')));
    logger_1.logger.info(chalk_1.default.blue(`📋 Listing outputs in: ${outputDir}`));
    if (!(await fs.pathExists(outputDir))) {
        logger_1.logger.warn('Output directory not found. Run a proof generation first.');
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
            }
            catch {
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
        console.log(chalk_1.default.gray('No proof outputs found.'));
        return;
    }
    console.log();
    console.log(chalk_1.default.yellow(`Found ${results.length} proof output(s):`));
    console.log();
    results.forEach((result, index) => {
        console.log(`${index + 1}. ${chalk_1.default.cyan(result.name)}`);
        console.log(`   Created: ${chalk_1.default.gray(result.created.toLocaleString())}`);
        console.log(`   Modified: ${chalk_1.default.gray(result.modified.toLocaleString())}`);
        if (result.summary) {
            if (result.summary.txHash) {
                console.log(`   Transaction: ${chalk_1.default.gray(result.summary.txHash)}`);
            }
            if (result.summary.network) {
                console.log(`   Network: ${chalk_1.default.gray(result.summary.network)}`);
            }
        }
        console.log(`   Path: ${chalk_1.default.gray(result.path)}`);
        console.log();
    });
    console.log(chalk_1.default.blue('💡 Export Examples:'));
    console.log(chalk_1.default.gray('   tokamak-zk-evm export all ./exported-proofs     # Export all outputs to directory'));
    console.log(chalk_1.default.gray('   tokamak-zk-evm export proof ./my-proof.json    # Export proof file only'));
    console.log(chalk_1.default.gray('   tokamak-zk-evm export synthesizer ./synth-out  # Export synthesizer outputs'));
    console.log(chalk_1.default.gray('   tokamak-zk-evm export preprocess ./prep-out    # Export preprocessing outputs'));
}
async function cleanFiles(options) {
    const fs = await Promise.resolve().then(() => __importStar(require('fs-extra')));
    const { cache, outputs, all } = options;
    if (!cache && !outputs && !all) {
        logger_1.logger.error('Please specify what to clean: --cache, --outputs, or --all');
        return;
    }
    const configManager = new config_manager_1.ConfigManager();
    const config = await configManager.loadConfig();
    if (cache || all) {
        logger_1.logger.info('Cleaning binary cache...');
        const binaryManager = new binary_manager_1.BinaryManager(config);
        await binaryManager.cleanCache();
        logger_1.logger.info(chalk_1.default.green('✅ Cache cleaned'));
    }
    if (outputs || all) {
        logger_1.logger.info('Cleaning output files...');
        if (await fs.pathExists(config.outputDir)) {
            await fs.emptyDir(config.outputDir);
            logger_1.logger.info(chalk_1.default.green('✅ Output files cleaned'));
        }
        else {
            logger_1.logger.info('No output directory found');
        }
    }
    logger_1.logger.info(chalk_1.default.green('🧹 Cleanup completed'));
}
async function updateBinary() {
    logger_1.logger.info(chalk_1.default.blue('🔄 Updating Tokamak-zk-EVM binary...'));
    const configManager = new config_manager_1.ConfigManager();
    const config = await configManager.loadConfig();
    const binaryManager = new binary_manager_1.BinaryManager(config);
    await binaryManager.updateBinary();
    logger_1.logger.info(chalk_1.default.green('✅ Binary updated successfully'));
}
/**
 * Handle the default action when no command is provided
 * Shows welcome screen and starts interactive setup
 */
async function handleDefaultAction() {
    try {
        // Show welcome screen
        (0, welcome_screen_1.displayWelcomeScreen)();
        // Get project name first
        const projectName = await (0, welcome_screen_1.promptForProjectName)();
        // Then prompt for RPC URL
        const rpcUrl = await (0, welcome_screen_1.promptForRpcUrl)();
        // Check if setup files are available and prompt for setup mode
        const configManager = new config_manager_1.ConfigManager();
        const config = await configManager.loadConfig();
        const binaryManager = new binary_manager_1.BinaryManager(config);
        const hasSetupFiles = await binaryManager.hasSetupFiles();
        const setupMode = await (0, welcome_screen_1.promptForSetupMode)(hasSetupFiles);
        // Show setup progress
        (0, welcome_screen_1.displaySetupProgress)(setupMode);
        // Import and run init logic
        const { initializeProject } = await Promise.resolve().then(() => __importStar(require('../commands/init')));
        await initializeProject(projectName, {
            rpcUrl: rpcUrl,
            setupMode: setupMode,
        });
        // Completion message is now handled in initializeProject
    }
    catch (error) {
        logger_1.logger.error('Setup failed:', error);
        process.exit(1);
    }
}
//# sourceMappingURL=cli.js.map
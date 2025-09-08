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
exports.createProveCommand = createProveCommand;
const commander_1 = require("commander");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const logger_1 = require("../utils/logger");
const config_manager_1 = require("../utils/config-manager");
const binary_manager_1 = require("../utils/binary-manager");
const script_runner_1 = require("../utils/script-runner");
// import { ProofGenerationOptions } from '../types';
function createProveCommand() {
    const command = new commander_1.Command('prove');
    command
        .description('Generate a zero-knowledge proof for a transaction')
        .argument('<tx-hash>', 'Transaction hash to generate proof for')
        .option('--output-dir <dir>', 'Custom output directory')
        .option('--keep-intermediates', 'Keep intermediate files after proof generation')
        .option('--verbose', 'Show detailed output')
        .option('--network <network>', 'Target network (mainnet/sepolia)')
        .option('--skip-trusted-setup', 'Skip trusted setup (use if already run)')
        .option('--rpc-url <url>', 'RPC URL for transaction data (e.g., https://mainnet.infura.io/v3/YOUR-PROJECT-ID)')
        .action(async (txHash, options) => {
        try {
            await generateProof(txHash, options);
        }
        catch (error) {
            logger_1.logger.error('Proof generation failed:', error);
            process.exit(1);
        }
    });
    return command;
}
async function generateProof(txHash, options) {
    const { outputDir, keepIntermediates = false, verbose = false, network, skipTrustedSetup = false, rpcUrl, } = options;
    // Validate transaction hash
    if (!isValidTxHash(txHash)) {
        throw new Error('Invalid transaction hash format. Expected 0x followed by 64 hexadecimal characters.');
    }
    logger_1.logger.info(chalk_1.default.blue(`🔐 Generating proof for transaction: ${txHash}`));
    // Load configuration
    const configManager = new config_manager_1.ConfigManager();
    const config = await configManager.loadConfig();
    // Override config with command options
    if (outputDir)
        config.outputDir = outputDir;
    if (network)
        config.network = network;
    config.keepIntermediates = keepIntermediates;
    if (rpcUrl)
        config.rpcUrl = rpcUrl;
    // Validate configuration
    await configManager.validateConfig(config);
    // Ensure binary is available
    const binaryManager = new binary_manager_1.BinaryManager(config);
    const binaryPaths = await binaryManager.ensureBinaryAvailable();
    // Create output directory
    await fs.ensureDir(config.outputDir);
    // Initialize script runner
    const scriptRunner = new script_runner_1.ScriptRunner(binaryPaths);
    // Set up progress tracking
    const spinner = (0, ora_1.default)('Initializing proof generation...').start();
    const onProgress = (step, current, total) => {
        spinner.text = `[${current}/${total}] ${step}`;
    };
    try {
        // Run the full proof generation pipeline
        const proofOptions = {
            verbose,
            onProgress,
            skipTrustedSetup,
        };
        if (config.rpcUrl) {
            proofOptions.rpcUrl = config.rpcUrl;
        }
        const results = await scriptRunner.runFullProofGeneration(txHash, proofOptions);
        spinner.succeed(chalk_1.default.green('✅ Proof generation completed successfully!'));
        // Copy outputs to project directory
        await copyOutputsToProject(binaryPaths.resourceDir, config.outputDir, txHash);
        // Display results summary
        displayResults(results, config.outputDir, txHash);
        // Clean up intermediate files if requested
        if (!keepIntermediates) {
            await cleanupIntermediateFiles(binaryPaths.resourceDir);
            logger_1.logger.info('Cleaned up intermediate files');
        }
    }
    catch (error) {
        spinner.fail(chalk_1.default.red('❌ Proof generation failed'));
        // Check if error is due to missing setup files
        if (error instanceof Error && error.message.includes('SETUP_MISSING')) {
            console.log();
            console.log(chalk_1.default.red('🚫 Missing Trusted Setup Files'));
            console.log(chalk_1.default.gray('====================================='));
            console.log();
            console.log(chalk_1.default.yellow('The proof generation failed because trusted setup files are missing.'));
            console.log(chalk_1.default.gray('These files are required for proof generation and verification.'));
            console.log();
            console.log(chalk_1.default.blue('💡 Solutions:'));
            console.log();
            console.log(chalk_1.default.green('1. Download pre-computed setup files (recommended):'));
            console.log(chalk_1.default.gray('   tokamak-zk-evm init --setup-mode download --skip-binary'));
            console.log();
            console.log(chalk_1.default.yellow('2. Run trusted setup locally (takes time):'));
            console.log(chalk_1.default.gray('   tokamak-zk-evm init --setup-mode local --skip-binary'));
            console.log();
            console.log(chalk_1.default.cyan('3. Generate proof with trusted setup:'));
            console.log(chalk_1.default.gray('   tokamak-zk-evm prove <tx-hash> --skip-trusted-setup=false'));
            console.log();
        }
        throw error;
    }
}
function isValidTxHash(txHash) {
    return /^0x[a-fA-F0-9]{64}$/.test(txHash);
}
async function copyOutputsToProject(resourceDir, outputDir, txHash) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const proofDir = path.join(outputDir, `proof-${txHash.slice(0, 10)}-${timestamp}`);
    await fs.ensureDir(proofDir);
    const outputTypes = ['synthesizer', 'preprocess', 'prove', 'verify'];
    for (const type of outputTypes) {
        // Different output directory names for different steps
        const outputDirName = type === 'synthesizer' ? 'outputs' : 'output';
        const sourceDir = path.join(resourceDir, type, outputDirName);
        const targetDir = path.join(proofDir, type);
        if (await fs.pathExists(sourceDir)) {
            await fs.copy(sourceDir, targetDir);
            logger_1.logger.debug(`Copied ${type} outputs to ${targetDir}`);
        }
        else {
            logger_1.logger.debug(`No outputs found for ${type} at ${sourceDir}`);
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
    logger_1.logger.info(`Proof outputs saved to: ${proofDir}`);
}
async function listFiles(dir) {
    try {
        if (await fs.pathExists(dir)) {
            return fs.readdir(dir);
        }
        return [];
    }
    catch {
        return [];
    }
}
function displayResults(results, outputDir, txHash) {
    console.log();
    console.log(chalk_1.default.green('🎉 Proof Generation Summary'));
    console.log(chalk_1.default.gray('================================'));
    console.log(`Transaction Hash: ${chalk_1.default.cyan(txHash)}`);
    console.log(`Output Directory: ${chalk_1.default.cyan(outputDir)}`);
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
                ? chalk_1.default.green('✅ Success')
                : chalk_1.default.red('❌ Failed');
            console.log(`${step.name}: ${status}`);
        }
    }
    console.log();
    console.log(chalk_1.default.blue('Next steps:'));
    console.log(`  tokamak-zk-evm list-outputs              # View all outputs`);
    console.log(`  tokamak-zk-evm export proof <file>       # Export specific proof`);
    console.log(`  tokamak-zk-evm verify <proof-file>       # Verify the proof`);
    console.log();
}
async function cleanupIntermediateFiles(resourceDir) {
    const outputTypes = ['synthesizer', 'preprocess', 'prove', 'verify'];
    for (const type of outputTypes) {
        // Different output directory names for different steps
        const outputDirName = type === 'synthesizer' ? 'outputs' : 'output';
        const outputDir = path.join(resourceDir, type, outputDirName);
        if (await fs.pathExists(outputDir)) {
            await fs.emptyDir(outputDir);
            logger_1.logger.debug(`Cleaned up ${type} outputs at ${outputDir}`);
        }
    }
}
//# sourceMappingURL=prove.js.map
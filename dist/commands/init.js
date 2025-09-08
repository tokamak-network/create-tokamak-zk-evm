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
exports.createInitCommand = createInitCommand;
exports.initializeProject = initializeProject;
const commander_1 = require("commander");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const readline = __importStar(require("readline"));
const chalk_1 = __importDefault(require("chalk"));
const logger_1 = require("../utils/logger");
const config_manager_1 = require("../utils/config-manager");
const binary_manager_1 = require("../utils/binary-manager");
const platform_detector_1 = require("../utils/platform-detector");
const script_runner_1 = require("../utils/script-runner");
function createInitCommand() {
    const command = new commander_1.Command('init');
    command
        .description('Initialize a new Tokamak-zk-EVM project')
        .argument('[project-name]', 'Name of the project directory')
        .option('--output-dir <dir>', 'Custom output directory for proofs')
        .option('--network <network>', 'Target network (mainnet/sepolia)', 'mainnet')
        .option('--rpc-url <url>', 'RPC URL for blockchain connection')
        .option('--skip-binary', 'Skip binary download during initialization')
        .option('--setup-mode <mode>', 'Setup mode: "download" (from release), "local" (run script), or "skip"', 'ask')
        .action(async (projectName, options) => {
        try {
            await initializeProject(projectName, options);
        }
        catch (error) {
            logger_1.logger.error('Initialization failed:', error);
            process.exit(1);
        }
    });
    return command;
}
async function initializeProject(projectName, options = {}) {
    const { outputDir, network = 'mainnet', rpcUrl, skipBinary = false, setupMode = 'ask', } = options;
    // Check platform compatibility
    if (!platform_detector_1.PlatformDetector.isSupported()) {
        throw new Error('This platform is not supported. Only macOS and Linux are supported.');
    }
    logger_1.logger.info(chalk_1.default.blue('🚀 Initializing Tokamak-zk-EVM project...'));
    // Create project directory if specified
    let projectDir = process.cwd();
    if (projectName) {
        projectDir = path.join(process.cwd(), projectName);
        await fs.ensureDir(projectDir);
        process.chdir(projectDir);
        logger_1.logger.info(`Created project directory: ${projectName}`);
    }
    // Create project structure
    await createProjectStructure(projectDir);
    // Initialize configuration
    const configManager = new config_manager_1.ConfigManager();
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
    const projectConfig = {
        network,
        outputDir: outputDir || './tokamak-zk-evm-outputs',
    };
    if (rpcUrl) {
        projectConfig.rpcUrl = rpcUrl;
    }
    await configManager.createProjectConfig(projectConfig);
    // Download binary if not skipped
    let binaryManager = null;
    if (!skipBinary) {
        logger_1.logger.info('Downloading Tokamak-zk-EVM binary...');
        binaryManager = new binary_manager_1.BinaryManager(config);
        await binaryManager.ensureBinaryAvailable();
        logger_1.logger.info(chalk_1.default.green('✅ Binary downloaded and ready'));
    }
    else {
        logger_1.logger.info('Skipped binary download (use --skip-binary=false to download)');
    }
    // Handle trusted setup
    if (setupMode !== 'skip') {
        const setupBinaryManager = binaryManager || new binary_manager_1.BinaryManager(config);
        await handleTrustedSetup(setupBinaryManager, setupMode, config);
    }
    // Create example files
    await createExampleFiles(projectDir);
    // Display success message
    displaySuccessMessage(projectName, skipBinary);
}
async function createProjectStructure(projectDir) {
    const directories = ['scripts', 'outputs', 'configs'];
    for (const dir of directories) {
        await fs.ensureDir(path.join(projectDir, dir));
    }
    logger_1.logger.debug('Created project directory structure');
}
async function createExampleFiles(projectDir) {
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
    await fs.writeFile(path.join(projectDir, 'scripts', 'generate-proof.sh'), exampleScript);
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
    logger_1.logger.debug('Created example files');
}
function displaySuccessMessage(projectName, skipBinary) {
    console.log();
    console.log(chalk_1.default.green('🎉 Project initialized successfully!'));
    console.log();
    if (projectName) {
        console.log(chalk_1.default.blue('Next steps:'));
        console.log(`  cd ${projectName}`);
    }
    else {
        console.log(chalk_1.default.blue('Next steps:'));
    }
    if (skipBinary) {
        console.log('  tokamak-zk-evm init --skip-binary=false  # Download binary');
    }
    console.log('  tokamak-zk-evm prove <transaction-hash>   # Generate a proof');
    console.log('  tokamak-zk-evm --help                     # See all commands');
    console.log();
    console.log(chalk_1.default.gray('Happy proving! 🔐'));
}
/**
 * Handle trusted setup process with user choice
 */
async function handleTrustedSetup(binaryManager, setupMode, config) {
    // Check if setup is already installed
    const isSetupInstalled = await binaryManager.isSetupInstalled();
    if (isSetupInstalled) {
        logger_1.logger.info(chalk_1.default.green('✅ Trusted setup files already installed'));
        return;
    }
    let selectedMode = setupMode;
    // Ask user if mode is 'ask'
    if (setupMode === 'ask') {
        selectedMode = await promptForSetupMode(binaryManager);
    }
    console.log();
    logger_1.logger.info(chalk_1.default.blue('🔧 Setting up trusted setup files...'));
    switch (selectedMode) {
        case 'download':
            try {
                await binaryManager.downloadAndInstallSetupFiles();
                logger_1.logger.info(chalk_1.default.green('✅ Setup files downloaded and installed'));
            }
            catch (error) {
                logger_1.logger.error('Failed to download setup files:', error);
                logger_1.logger.info(chalk_1.default.yellow('💡 You can run trusted setup manually later with: tokamak-zk-evm prove --skip-trusted-setup=false'));
            }
            break;
        case 'local':
            try {
                await runLocalTrustedSetup(binaryManager, config);
                logger_1.logger.info(chalk_1.default.green('✅ Local trusted setup completed'));
            }
            catch (error) {
                logger_1.logger.error('Failed to run local trusted setup:', error);
                logger_1.logger.info(chalk_1.default.yellow('💡 You can run trusted setup manually later with: tokamak-zk-evm prove --skip-trusted-setup=false'));
            }
            break;
        case 'skip':
            logger_1.logger.info(chalk_1.default.yellow('⏭️ Skipped trusted setup'));
            logger_1.logger.info(chalk_1.default.gray('💡 You can run trusted setup later with: tokamak-zk-evm prove --skip-trusted-setup=false'));
            break;
        default:
            logger_1.logger.warn(`Unknown setup mode: ${selectedMode}`);
            break;
    }
}
/**
 * Prompt user for setup mode
 */
async function promptForSetupMode(binaryManager) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    // Check if setup files are available in release
    const hasSetupFiles = await binaryManager.hasSetupFiles();
    console.log();
    console.log(chalk_1.default.blue('🔧 Trusted Setup Configuration'));
    console.log(chalk_1.default.gray('================================'));
    console.log();
    console.log('Trusted setup is required for proof generation. Choose an option:');
    console.log();
    if (hasSetupFiles) {
        console.log(chalk_1.default.green('1. download') +
            ' - Download pre-computed setup files from release (recommended)');
    }
    else {
        console.log(chalk_1.default.gray('1. download') +
            ' - Download pre-computed setup files (not available)');
    }
    console.log(chalk_1.default.yellow('2. local') +
        '   - Run trusted setup locally (takes time but more secure)');
    console.log(chalk_1.default.gray('3. skip') + '    - Skip for now (can run later)');
    console.log();
    return new Promise((resolve) => {
        const askForChoice = () => {
            const defaultChoice = hasSetupFiles ? 'download' : 'local';
            rl.question(chalk_1.default.cyan(`Choose setup mode (download/local/skip) [${defaultChoice}]: `), (answer) => {
                const choice = answer.trim().toLowerCase() || defaultChoice;
                if (['download', 'local', 'skip'].includes(choice)) {
                    if (choice === 'download' && !hasSetupFiles) {
                        console.log(chalk_1.default.red('❌ Download option not available. Setup files not found in release.'));
                        askForChoice();
                    }
                    else {
                        rl.close();
                        resolve(choice);
                    }
                }
                else {
                    console.log(chalk_1.default.red('Please enter "download", "local", or "skip"'));
                    askForChoice();
                }
            });
        };
        askForChoice();
    });
}
/**
 * Run local trusted setup
 */
async function runLocalTrustedSetup(binaryManager, _config) {
    const binaryPaths = await binaryManager.ensureBinaryAvailable();
    const scriptRunner = new script_runner_1.ScriptRunner(binaryPaths);
    logger_1.logger.info('Running local trusted setup (this may take several minutes)...');
    const result = await scriptRunner.runTrustedSetup({
        verbose: true,
        onProgress: (step, current, total) => {
            logger_1.logger.info(`[${current}/${total}] ${step}`);
        },
    });
    if (!result.success) {
        throw new Error(`Trusted setup failed: ${result.stderr || result.stdout}`);
    }
}
//# sourceMappingURL=init.js.map
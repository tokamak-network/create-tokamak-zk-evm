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
const child_process_1 = require("child_process");
const chalk_1 = __importDefault(require("chalk"));
const logger_1 = require("../utils/logger");
const config_manager_1 = require("../utils/config-manager");
const binary_manager_1 = require("../utils/binary-manager");
const platform_detector_1 = require("../utils/platform-detector");
const script_runner_1 = require("../utils/script-runner");
const welcome_screen_1 = require("../utils/welcome-screen");
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
    // Create package.json and install CLI locally
    await createPackageJson(projectDir, projectName);
    const globalInstalled = await promptAndInstallGlobally();
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
    displaySuccessMessage(projectName, skipBinary, globalInstalled);
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
function displaySuccessMessage(projectName, skipBinary, globalInstalled) {
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
    if (globalInstalled) {
        console.log('  tokamak-zk-evm prove <transaction-hash>   # Generate a proof');
        console.log('  tokamak-zk-evm verify --interactive       # Verify proofs');
        console.log('  tokamak-zk-evm setup                      # Configure trusted setup');
        console.log('  tokamak-zk-evm --help                     # See all commands');
    }
    else {
        console.log('  npx tokamak-zk-evm prove <tx-hash>        # Generate a proof');
        console.log('  npx tokamak-zk-evm verify --interactive   # Verify proofs');
        console.log('  npx tokamak-zk-evm setup                  # Configure trusted setup');
        console.log('  npm run prove <transaction-hash>          # Or use npm scripts');
        console.log('  npm run verify                            # Or use npm scripts');
    }
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
        const hasSetupFiles = await binaryManager.hasSetupFiles();
        selectedMode = await (0, welcome_screen_1.promptForSetupMode)(hasSetupFiles);
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
/**
 * Create package.json for the project
 */
async function createPackageJson(projectDir, projectName) {
    const packageJsonPath = path.join(projectDir, 'package.json');
    // Skip if package.json already exists
    if (await fs.pathExists(packageJsonPath)) {
        logger_1.logger.debug('package.json already exists, skipping creation');
        return;
    }
    const packageJson = {
        name: projectName || path.basename(projectDir),
        version: '1.0.0',
        description: 'Tokamak-zk-EVM proof generation project',
        private: true,
        scripts: {
            prove: 'tokamak-zk-evm prove',
            verify: 'tokamak-zk-evm verify',
            setup: 'tokamak-zk-evm setup',
            status: 'tokamak-zk-evm status',
            'list-outputs': 'tokamak-zk-evm list-outputs',
        },
        devDependencies: {},
        keywords: ['tokamak', 'zk-evm', 'zero-knowledge', 'proof'],
        author: '',
        license: 'MIT',
    };
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    logger_1.logger.info('📦 Created package.json');
}
/**
 * Check if CLI is already installed globally
 */
async function isGloballyInstalled() {
    return new Promise((resolve) => {
        const npmList = (0, child_process_1.spawn)('npm', ['list', '-g', 'create-tokamak-zk-evm'], {
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        npmList.on('close', (code) => {
            resolve(code === 0);
        });
        npmList.on('error', () => {
            resolve(false);
        });
    });
}
/**
 * Prompt user for global installation and install if agreed
 */
async function promptAndInstallGlobally() {
    // Check if already installed globally
    const alreadyInstalled = await isGloballyInstalled();
    if (alreadyInstalled) {
        logger_1.logger.info(chalk_1.default.green('✅ CLI is already installed globally'));
        return true;
    }
    console.log();
    console.log(chalk_1.default.blue('🌐 Global CLI Installation'));
    console.log(chalk_1.default.gray('============================'));
    console.log();
    console.log('Would you like to install Tokamak-zk-EVM CLI globally?');
    console.log('This allows you to use "tokamak-zk-evm" commands directly.');
    console.log();
    console.log(chalk_1.default.green('✅ Yes') + ' - Install globally for easier usage');
    console.log(chalk_1.default.yellow('⏭️ No') + '  - Use "npx tokamak-zk-evm" instead');
    console.log();
    // Simple prompt for now
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const choice = await new Promise((resolve) => {
        rl.question(chalk_1.default.cyan('Install globally? (Y/n): '), (answer) => {
            rl.close();
            resolve(answer.trim().toLowerCase() || 'y');
        });
    });
    if (choice === 'y' || choice === 'yes') {
        console.log();
        logger_1.logger.info('🌐 Installing Tokamak-zk-EVM CLI globally...');
        return new Promise((resolve) => {
            const npmInstall = (0, child_process_1.spawn)('npm', ['install', '-g', 'create-tokamak-zk-evm'], {
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            let stdout = '';
            let stderr = '';
            npmInstall.stdout?.on('data', (data) => {
                stdout += data.toString();
            });
            npmInstall.stderr?.on('data', (data) => {
                stderr += data.toString();
            });
            npmInstall.on('close', (code) => {
                if (code === 0) {
                    logger_1.logger.info(chalk_1.default.green('✅ CLI installed globally'));
                    logger_1.logger.info(chalk_1.default.gray('💡 You can now use "tokamak-zk-evm" commands anywhere'));
                    resolve(true);
                }
                else {
                    logger_1.logger.warn('Failed to install CLI globally');
                    logger_1.logger.info(chalk_1.default.yellow('💡 You can use "npx tokamak-zk-evm" instead'));
                    logger_1.logger.debug(`npm install failed with code ${code}`);
                    logger_1.logger.debug(`stdout: ${stdout}`);
                    logger_1.logger.debug(`stderr: ${stderr}`);
                    resolve(false);
                }
            });
            npmInstall.on('error', (error) => {
                logger_1.logger.warn('Failed to install CLI globally');
                logger_1.logger.info(chalk_1.default.yellow('💡 You can use "npx tokamak-zk-evm" instead'));
                logger_1.logger.debug(`npm install error: ${error.message}`);
                resolve(false);
            });
        });
    }
    else {
        logger_1.logger.info(chalk_1.default.yellow('⏭️ Skipped global installation'));
        logger_1.logger.info(chalk_1.default.gray('💡 Use "npx tokamak-zk-evm" to run commands'));
        return false;
    }
}
//# sourceMappingURL=init.js.map
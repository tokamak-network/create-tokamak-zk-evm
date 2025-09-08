"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSetupCommand = createSetupCommand;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const logger_1 = require("../utils/logger");
const config_manager_1 = require("../utils/config-manager");
const binary_manager_1 = require("../utils/binary-manager");
const platform_detector_1 = require("../utils/platform-detector");
const script_runner_1 = require("../utils/script-runner");
const welcome_screen_1 = require("../utils/welcome-screen");
function createSetupCommand() {
    const command = new commander_1.Command('setup');
    command
        .description('Configure trusted setup for proof generation')
        .option('--mode <mode>', 'Setup mode: "download" (from release), "local" (run script), or "skip"')
        .action(async (options) => {
        try {
            await runSetup(options?.mode);
        }
        catch (error) {
            logger_1.logger.error('Setup failed:', error);
            process.exit(1);
        }
    });
    return command;
}
async function runSetup(mode) {
    // Check platform compatibility
    if (!platform_detector_1.PlatformDetector.isSupported()) {
        throw new Error('This platform is not supported. Only macOS and Linux are supported.');
    }
    logger_1.logger.info(chalk_1.default.blue('🔧 Tokamak-zk-EVM Trusted Setup'));
    // Load configuration
    const configManager = new config_manager_1.ConfigManager();
    const config = await configManager.loadConfig();
    // Create binary manager
    const binaryManager = new binary_manager_1.BinaryManager(config);
    // Check if setup is already installed
    const isSetupInstalled = await binaryManager.isSetupInstalled();
    if (isSetupInstalled) {
        logger_1.logger.info(chalk_1.default.green('✅ Trusted setup files are already installed'));
        console.log();
        console.log(chalk_1.default.blue('Setup file locations:'));
        console.log(chalk_1.default.gray('  ~/.tokamak-zk-evm/resources/setup/output/'));
        console.log(chalk_1.default.gray('    - combined_sigma.bin'));
        console.log(chalk_1.default.gray('    - combined_sigma.json'));
        console.log(chalk_1.default.gray('    - sigma_preprocess.json'));
        console.log(chalk_1.default.gray('    - sigma_verify.json'));
        console.log();
        return;
    }
    let selectedMode = mode;
    // If no mode specified, prompt user with arrow key navigation
    if (!selectedMode) {
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
                displaySetupSuccess();
            }
            catch (error) {
                logger_1.logger.error('Failed to download setup files:', error);
                logger_1.logger.info(chalk_1.default.yellow('💡 Try running local setup: tokamak-zk-evm setup --mode local'));
            }
            break;
        case 'local':
            try {
                await runLocalTrustedSetup(binaryManager, config);
                logger_1.logger.info(chalk_1.default.green('✅ Local trusted setup completed'));
                displaySetupSuccess();
            }
            catch (error) {
                logger_1.logger.error('Failed to run local trusted setup:', error);
                logger_1.logger.info(chalk_1.default.yellow('💡 You can try downloading pre-computed files: tokamak-zk-evm setup --mode download'));
            }
            break;
        case 'skip':
            logger_1.logger.info(chalk_1.default.yellow('⏭️ Skipped trusted setup'));
            logger_1.logger.info(chalk_1.default.gray('💡 You can run setup later with: tokamak-zk-evm setup'));
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
function displaySetupSuccess() {
    console.log();
    console.log(chalk_1.default.green('🎉 Trusted setup completed successfully!'));
    console.log();
    console.log(chalk_1.default.blue('You can now:'));
    console.log('  tokamak-zk-evm prove <transaction-hash>   # Generate proofs');
    console.log('  tokamak-zk-evm verify <proof-file>        # Verify proofs');
    console.log();
    console.log(chalk_1.default.gray('Happy proving! 🔐'));
}
//# sourceMappingURL=setup.js.map
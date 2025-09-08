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
exports.createStatusCommand = createStatusCommand;
const commander_1 = require("commander");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const logger_1 = require("../utils/logger");
const config_manager_1 = require("../utils/config-manager");
const binary_manager_1 = require("../utils/binary-manager");
const platform_detector_1 = require("../utils/platform-detector");
function createStatusCommand() {
    const command = new commander_1.Command('status');
    command
        .description('Show the current status of Tokamak-zk-EVM CLI')
        .option('--verbose', 'Show detailed information')
        .action(async (options) => {
        try {
            await showStatus(options);
        }
        catch (error) {
            logger_1.logger.error('Failed to get status:', error);
            process.exit(1);
        }
    });
    return command;
}
async function showStatus(options) {
    const { verbose = false } = options;
    console.log(chalk_1.default.blue('🔍 Tokamak-zk-EVM CLI Status'));
    console.log(chalk_1.default.gray('============================'));
    console.log();
    // Platform Information
    console.log(chalk_1.default.yellow('Platform Information:'));
    try {
        const platformInfo = platform_detector_1.PlatformDetector.detect();
        console.log(`  OS: ${chalk_1.default.cyan(platformInfo.platform)}`);
        console.log(`  Architecture: ${chalk_1.default.cyan(platformInfo.arch)}`);
        console.log(`  Binary Name: ${chalk_1.default.cyan(platformInfo.binaryName)}`);
        console.log(`  Supported: ${chalk_1.default.green('✅ Yes')}`);
    }
    catch (error) {
        console.log(`  Supported: ${chalk_1.default.red('❌ No')}`);
        console.log(`  Error: ${chalk_1.default.red(error)}`);
    }
    console.log();
    // Configuration Status
    console.log(chalk_1.default.yellow('Configuration:'));
    const configManager = new config_manager_1.ConfigManager();
    try {
        const config = await configManager.loadConfig();
        console.log(`  Global Config: ${(await configManager.hasGlobalConfig()) ? chalk_1.default.green('✅ Found') : chalk_1.default.gray('❌ Not found')}`);
        console.log(`  Project Config: ${(await configManager.hasProjectConfig()) ? chalk_1.default.green('✅ Found') : chalk_1.default.gray('❌ Not found')}`);
        console.log(`  Network: ${chalk_1.default.cyan(config.network)}`);
        console.log(`  Output Directory: ${chalk_1.default.cyan(config.outputDir)}`);
        console.log(`  Cache Directory: ${chalk_1.default.cyan(config.cacheDir)}`);
        console.log(`  Binary Version: ${chalk_1.default.cyan(config.binaryVersion)}`);
        if (verbose) {
            console.log(`  GitHub Repo: ${chalk_1.default.cyan(config.githubRepo)}`);
            console.log(`  Keep Intermediates: ${config.keepIntermediates ? chalk_1.default.green('Yes') : chalk_1.default.gray('No')}`);
            console.log(`  RPC URL: ${config.rpcUrl ? chalk_1.default.green('✅ Set') : chalk_1.default.gray('❌ Not set')}`);
        }
    }
    catch (error) {
        console.log(`  Status: ${chalk_1.default.red('❌ Configuration error')}`);
        console.log(`  Error: ${chalk_1.default.red(error)}`);
    }
    console.log();
    // Binary Status
    console.log(chalk_1.default.yellow('Binary Status:'));
    try {
        const config = await configManager.loadConfig();
        const binaryManager = new binary_manager_1.BinaryManager(config);
        const binaryPaths = binaryManager.getBinaryPaths();
        const binaryExists = await fs.pathExists(binaryPaths.binaryDir);
        console.log(`  Binary Installed: ${binaryExists ? chalk_1.default.green('✅ Yes') : chalk_1.default.red('❌ No')}`);
        if (binaryExists) {
            console.log(`  Binary Location: ${chalk_1.default.cyan(binaryPaths.binaryDir)}`);
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
                console.log(`  ${component.name}: ${exists ? chalk_1.default.green('✅ Found') : chalk_1.default.red('❌ Missing')}`);
                if (verbose && exists && component.files.length > 0) {
                    for (const file of component.files) {
                        const filePath = typeof file === 'string'
                            ? path.join(component.path, file)
                            : String(file);
                        const fileExists = await fs.pathExists(filePath);
                        const fileName = path.basename(filePath);
                        console.log(`    ${fileName}: ${fileExists ? chalk_1.default.green('✅') : chalk_1.default.red('❌')}`);
                    }
                }
            }
        }
        else {
            console.log(`  Installation Path: ${chalk_1.default.cyan(binaryPaths.binaryDir)}`);
        }
    }
    catch (error) {
        console.log(`  Status: ${chalk_1.default.red('❌ Binary check failed')}`);
        console.log(`  Error: ${chalk_1.default.red(error)}`);
    }
    console.log();
    // Project Status
    console.log(chalk_1.default.yellow('Project Status:'));
    const currentDir = process.cwd();
    console.log(`  Current Directory: ${chalk_1.default.cyan(currentDir)}`);
    // Check for project files
    const projectFiles = [
        'tokamak.config.js',
        'package.json',
        'README.md',
        '.gitignore',
    ];
    for (const file of projectFiles) {
        const exists = await fs.pathExists(path.join(currentDir, file));
        console.log(`  ${file}: ${exists ? chalk_1.default.green('✅ Found') : chalk_1.default.gray('❌ Not found')}`);
    }
    // Check output directory
    try {
        const config = await configManager.loadConfig();
        const outputDirExists = await fs.pathExists(config.outputDir);
        console.log(`  Output Directory: ${outputDirExists ? chalk_1.default.green('✅ Exists') : chalk_1.default.gray('❌ Not found')}`);
        if (outputDirExists) {
            const outputs = await listProofOutputs(config.outputDir);
            console.log(`  Proof Outputs: ${chalk_1.default.cyan(outputs.length)} found`);
            if (verbose && outputs.length > 0) {
                console.log('  Recent Proofs:');
                outputs.slice(0, 5).forEach((output) => {
                    console.log(`    ${chalk_1.default.gray(output.name)} (${output.date})`);
                });
            }
        }
    }
    catch (error) {
        console.log(`  Output Status: ${chalk_1.default.red('❌ Error checking outputs')}`);
    }
    console.log();
    // Recommendations
    console.log(chalk_1.default.yellow('Recommendations:'));
    await showRecommendations(configManager);
}
async function listProofOutputs(outputDir) {
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
        return results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    catch {
        return [];
    }
}
async function showRecommendations(configManager) {
    const recommendations = [];
    try {
        const config = await configManager.loadConfig();
        const binaryManager = new binary_manager_1.BinaryManager(config);
        const binaryPaths = binaryManager.getBinaryPaths();
        // Check if binary is installed
        if (!(await fs.pathExists(binaryPaths.binaryDir))) {
            recommendations.push('Run `tokamak-zk-evm init` to download and set up the binary');
        }
        // Check if project is initialized
        if (!(await configManager.hasProjectConfig())) {
            recommendations.push('Run `tokamak-zk-evm init` to initialize a project in this directory');
        }
        // Check if RPC URL is set
        if (!config.rpcUrl) {
            recommendations.push('Set RPC URL for transaction data access (e.g., --rpc-url https://mainnet.infura.io/v3/YOUR-PROJECT-ID)');
        }
        // Check if output directory exists
        if (!(await fs.pathExists(config.outputDir))) {
            recommendations.push(`Create output directory: mkdir -p ${config.outputDir}`);
        }
    }
    catch (error) {
        recommendations.push('Fix configuration issues before proceeding');
    }
    if (recommendations.length === 0) {
        console.log(`  ${chalk_1.default.green("✅ Everything looks good! You're ready to generate proofs.")}`);
    }
    else {
        recommendations.forEach((rec, index) => {
            console.log(`  ${index + 1}. ${rec}`);
        });
    }
    console.log();
    console.log(chalk_1.default.blue('💡 Next steps:'));
    console.log('  tokamak-zk-evm prove <tx-hash>  # Generate a proof');
    console.log('  tokamak-zk-evm --help           # See all available commands');
}
//# sourceMappingURL=status.js.map
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScriptRunner = void 0;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const logger_1 = require("./logger");
class ScriptRunner {
    constructor(binaryPaths) {
        this.binaryPaths = binaryPaths;
    }
    /**
     * Check if trusted setup files already exist
     * @returns Promise<boolean> - True if setup files exist
     */
    async isTrustedSetupComplete() {
        try {
            // Check for actual trusted setup output files from Tokamak-zk-EVM
            const setupFiles = [
                'combined_sigma.bin',
                'combined_sigma.json',
                'sigma_preprocess.json',
                'sigma_verify.json',
            ];
            // Check in binary directory, resource directory, and setup output directory
            const searchDirs = [
                this.binaryPaths.binaryDir,
                this.binaryPaths.resourceDir,
                path.join(this.binaryPaths.resourceDir, 'setup'),
                path.join(this.binaryPaths.resourceDir, 'setup', 'output'),
            ];
            logger_1.logger.info(`🔍 Checking for trusted setup files...`);
            for (const dir of searchDirs) {
                if (await fs.pathExists(dir)) {
                    let foundFiles = 0;
                    for (const file of setupFiles) {
                        const filePath = path.join(dir, file);
                        if (await fs.pathExists(filePath)) {
                            foundFiles++;
                        }
                    }
                    // All 4 files must be present
                    if (foundFiles === setupFiles.length) {
                        logger_1.logger.info(`✅ Found all trusted setup files in: ${dir}`);
                        return true;
                    }
                }
            }
            logger_1.logger.info(`❌ No trusted setup files found`);
            return false;
        }
        catch (error) {
            logger_1.logger.debug('Error checking trusted setup files:', error);
            return false;
        }
    }
    async executeScriptWithInput(scriptPath, args = [], input, options = {}) {
        return new Promise((resolve) => {
            const { env = {}, onProgress, verbose = false } = options;
            // Set up environment variables
            const scriptEnv = {
                ...process.env,
                TOKAMAK_BINARY_PATH: this.binaryPaths.binaryDir,
                PATH: `${this.binaryPaths.binDir}:${process.env.PATH}`,
                ...env,
            };
            logger_1.logger.debug(`Executing script with input: ${scriptPath} ${args.join(' ')}`);
            const child = (0, child_process_1.spawn)('bash', [scriptPath, ...args], {
                cwd: this.binaryPaths.binaryDir,
                env: scriptEnv,
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            let stdout = '';
            let stderr = '';
            // Send input to stdin
            if (child.stdin && input) {
                child.stdin.write(input);
                child.stdin.end();
            }
            if (child.stdout) {
                child.stdout.on('data', (data) => {
                    const output = data.toString();
                    stdout += output;
                    if (verbose) {
                        process.stdout.write(output);
                    }
                    if (onProgress) {
                        this.parseProgressFromOutput(output, onProgress);
                    }
                });
            }
            if (child.stderr) {
                child.stderr.on('data', (data) => {
                    const output = data.toString();
                    stderr += output;
                    if (verbose) {
                        process.stderr.write(output);
                    }
                });
            }
            child.on('close', (code) => {
                const exitCode = code || 0;
                const success = exitCode === 0;
                if (!success) {
                    logger_1.logger.error(`Script failed with exit code ${exitCode}`);
                    if (stderr) {
                        logger_1.logger.error('Error output:', stderr);
                    }
                }
                resolve({
                    success,
                    stdout,
                    stderr,
                    exitCode,
                });
            });
            child.on('error', (error) => {
                logger_1.logger.error(`Failed to execute script: ${error.message}`);
                resolve({
                    success: false,
                    stdout,
                    stderr: error.message,
                    exitCode: -1,
                });
            });
        });
    }
    async executeScript(scriptPath, args = [], options = {}) {
        return new Promise((resolve) => {
            const { env = {}, onProgress, verbose = false } = options;
            // Set up environment variables
            const scriptEnv = {
                ...process.env,
                TOKAMAK_BINARY_PATH: this.binaryPaths.binaryDir,
                PATH: `${this.binaryPaths.binDir}:${process.env.PATH}`,
                ...env,
            };
            logger_1.logger.debug(`Executing script: ${scriptPath} ${args.join(' ')}`);
            const child = (0, child_process_1.spawn)('bash', [scriptPath, ...args], {
                cwd: this.binaryPaths.binaryDir,
                env: scriptEnv,
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            let stdout = '';
            let stderr = '';
            if (child.stdout) {
                child.stdout.on('data', (data) => {
                    const output = data.toString();
                    stdout += output;
                    if (verbose) {
                        process.stdout.write(output);
                    }
                    if (onProgress) {
                        this.parseProgressFromOutput(output, onProgress);
                    }
                });
            }
            if (child.stderr) {
                child.stderr.on('data', (data) => {
                    const output = data.toString();
                    stderr += output;
                    if (verbose) {
                        process.stderr.write(output);
                    }
                });
            }
            child.on('close', (code) => {
                const exitCode = code || 0;
                const success = exitCode === 0;
                if (!success) {
                    logger_1.logger.error(`Script failed with exit code ${exitCode}`);
                    if (stderr) {
                        logger_1.logger.error('Error output:', stderr);
                    }
                }
                resolve({
                    success,
                    stdout,
                    stderr,
                    exitCode,
                });
            });
            child.on('error', (error) => {
                logger_1.logger.error(`Failed to execute script: ${error.message}`);
                resolve({
                    success: false,
                    stdout,
                    stderr: error.message,
                    exitCode: -1,
                });
            });
        });
    }
    async runTrustedSetup(options = {}) {
        logger_1.logger.info('Running trusted setup...');
        const result = await this.executeScript(this.binaryPaths.scripts.trustedSetup, [], options);
        if (result.success) {
            logger_1.logger.info('Trusted setup completed successfully');
        }
        return result;
    }
    async runSynthesizer(txHash, options = {}) {
        logger_1.logger.info(`Running synthesizer for transaction: ${txHash}`);
        const env = {};
        if (options.rpcUrl) {
            env.RPC_URL = options.rpcUrl;
            logger_1.logger.info(`Using RPC URL: ${options.rpcUrl}`);
        }
        else {
            logger_1.logger.warn('No RPC URL provided - synthesizer may fail');
        }
        logger_1.logger.info(`Executing synthesizer script: ${this.binaryPaths.scripts.synthesizer}`);
        logger_1.logger.info(`Transaction hash: ${txHash}`);
        // Use executeScriptWithInput for synthesizer since it requires interactive input
        const result = await this.executeScriptWithInput(this.binaryPaths.scripts.synthesizer, [], txHash + '\n', // Send transaction hash followed by newline
        { ...options, env });
        if (result.success) {
            logger_1.logger.info('Synthesizer completed successfully');
        }
        else {
            logger_1.logger.error('Synthesizer failed');
            logger_1.logger.error('Stdout:', result.stdout);
            logger_1.logger.error('Stderr:', result.stderr);
        }
        return result;
    }
    async runPreprocess(options = {}) {
        logger_1.logger.info('Running preprocessing...');
        const result = await this.executeScript(this.binaryPaths.scripts.preprocess, [], options);
        if (result.success) {
            logger_1.logger.info('Preprocessing completed successfully');
        }
        return result;
    }
    async runProve(options = {}) {
        logger_1.logger.info('Generating proof...');
        const result = await this.executeScript(this.binaryPaths.scripts.prove, [], options);
        if (result.success) {
            logger_1.logger.info('Proof generation completed successfully');
        }
        return result;
    }
    async runVerify(options = {}) {
        logger_1.logger.info('Verifying proof...');
        const result = await this.executeScript(this.binaryPaths.scripts.verify, [], options);
        // Save verification result to output file
        const verifyOutputDir = path.join(this.binaryPaths.resourceDir, 'verify', 'output');
        await fs.ensureDir(verifyOutputDir);
        const verificationResult = {
            verified: result.success,
            timestamp: new Date().toISOString(),
            exitCode: result.exitCode,
            message: result.success
                ? 'Proof verification successful'
                : 'Proof verification failed',
        };
        await fs.writeJson(path.join(verifyOutputDir, 'verification.json'), verificationResult, { spaces: 2 });
        if (result.success) {
            logger_1.logger.info('Proof verification completed successfully');
        }
        return result;
    }
    async runFullProofGeneration(txHash, options = {}) {
        const results = {};
        try {
            // Check if trusted setup is already complete
            const setupComplete = await this.isTrustedSetupComplete();
            const shouldSkipSetup = options.skipTrustedSetup || setupComplete;
            if (setupComplete) {
                logger_1.logger.info('✅ Trusted setup files found, skipping trusted setup step');
            }
            // Step 1: Trusted setup (if not skipped and not already complete)
            if (!shouldSkipSetup) {
                options.onProgress?.('Running trusted setup', 1, 5);
                logger_1.logger.info('Running trusted setup...');
                results.trustedSetup = await this.runTrustedSetup(options);
                if (!results.trustedSetup.success) {
                    throw new Error('Trusted setup failed');
                }
            }
            else {
                logger_1.logger.debug('Skipping trusted setup step');
            }
            // Adjust step numbers based on whether trusted setup was skipped
            const totalSteps = shouldSkipSetup ? 4 : 5;
            let currentStep = shouldSkipSetup ? 1 : 2;
            // Step 2 (or 1): Synthesizer
            options.onProgress?.('Running Synthesizer', currentStep, totalSteps);
            logger_1.logger.info('Running Synthesizer...');
            results.synthesis = await this.runSynthesizer(txHash, options);
            if (!results.synthesis.success) {
                throw new Error('Synthesizer failed');
            }
            currentStep++;
            // Step 3 (or 2): Preprocessing
            options.onProgress?.('Running preprocessing', currentStep, totalSteps);
            logger_1.logger.info('Running preprocessing...');
            results.preprocess = await this.runPreprocess(options);
            if (!results.preprocess.success) {
                throw new Error('Preprocessing failed');
            }
            currentStep++;
            // Step 4 (or 3): Proof generation
            options.onProgress?.('Generating proof', currentStep, totalSteps);
            logger_1.logger.info('Running proving...');
            results.prove = await this.runProve(options);
            if (!results.prove.success) {
                throw new Error('Proof generation failed');
            }
            currentStep++;
            // Step 5 (or 4): Verification
            options.onProgress?.('Verifying proof', currentStep, totalSteps);
            logger_1.logger.info('Running verification...');
            results.verify = await this.runVerify(options);
            if (!results.verify.success) {
                throw new Error('Proof verification failed');
            }
            logger_1.logger.info('Full proof generation pipeline completed successfully');
            return results;
        }
        catch (error) {
            logger_1.logger.error(`Proof generation pipeline failed: ${error}`);
            throw error;
        }
    }
    /**
     * Run partial proof generation (synthesizer + preprocess only)
     * Used for regeneration mode where we only need to regenerate components
     */
    async runPartialProofGeneration(txHash, options = {}) {
        const results = {};
        try {
            // Always skip trusted setup for partial generation
            logger_1.logger.info('Running partial proof generation (synthesizer + preprocess only)');
            // Step 1: Synthesizer
            options.onProgress?.('Running Synthesizer', 1, 2);
            logger_1.logger.info('Running Synthesizer...');
            results.synthesis = await this.runSynthesizer(txHash, options);
            if (!results.synthesis.success) {
                throw new Error('Synthesizer failed');
            }
            // Step 2: Preprocessing
            options.onProgress?.('Running preprocessing', 2, 2);
            logger_1.logger.info('Running preprocessing...');
            results.preprocess = await this.runPreprocess(options);
            if (!results.preprocess.success) {
                // Check if setup files are missing
                const setupComplete = await this.isTrustedSetupComplete();
                if (!setupComplete) {
                    throw new Error('SETUP_MISSING: Preprocessing failed because trusted setup files are missing');
                }
                throw new Error('Preprocessing failed');
            }
            logger_1.logger.info('Partial proof generation completed successfully');
            return results;
        }
        catch (error) {
            logger_1.logger.error(`Partial proof generation failed: ${error}`);
            throw error;
        }
    }
    parseProgressFromOutput(_output, _onProgress) {
        // Disable internal progress parsing to avoid overriding main step progress
        // The main step progress ([1/4], [2/4], etc.) is more important for user experience
        // Internal script progress can be too granular and cause confusion
        // If needed in the future, we can add more sophisticated progress parsing here
        // that doesn't interfere with the main step progress display
    }
}
exports.ScriptRunner = ScriptRunner;
//# sourceMappingURL=script-runner.js.map
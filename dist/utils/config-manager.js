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
exports.ConfigManager = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const os = __importStar(require("os"));
const defaults_1 = require("../config/defaults");
const logger_1 = require("./logger");
class ConfigManager {
    constructor() {
        this.configPath = path.join(os.homedir(), '.tokamak-zk-evm', 'config.json');
        this.projectConfigPath = path.join(process.cwd(), 'tokamak.config.js');
    }
    async loadConfig() {
        let config = { ...defaults_1.DEFAULT_CONFIG };
        // Load global config
        try {
            if (await fs.pathExists(this.configPath)) {
                const globalConfig = await fs.readJson(this.configPath);
                config = { ...config, ...globalConfig };
                logger_1.logger.debug('Loaded global config from', this.configPath);
            }
        }
        catch (error) {
            logger_1.logger.warn('Failed to load global config:', error);
        }
        // Load project config
        try {
            if (await fs.pathExists(this.projectConfigPath)) {
                // Clear require cache to ensure fresh load
                delete require.cache[require.resolve(this.projectConfigPath)];
                const projectConfig = require(this.projectConfigPath);
                config = { ...config, ...projectConfig };
                logger_1.logger.debug('Loaded project config from', this.projectConfigPath);
            }
        }
        catch (error) {
            logger_1.logger.warn('Failed to load project config:', error);
        }
        // Ensure cache directory exists
        await fs.ensureDir(config.cacheDir);
        return config;
    }
    async saveGlobalConfig(config) {
        try {
            await fs.ensureDir(path.dirname(this.configPath));
            let existingConfig = {};
            if (await fs.pathExists(this.configPath)) {
                existingConfig = await fs.readJson(this.configPath);
            }
            const mergedConfig = { ...existingConfig, ...config };
            await fs.writeJson(this.configPath, mergedConfig, { spaces: 2 });
            logger_1.logger.info('Global config saved to', this.configPath);
        }
        catch (error) {
            logger_1.logger.error('Failed to save global config:', error);
            throw error;
        }
    }
    async createProjectConfig(config) {
        try {
            const configContent = `module.exports = ${JSON.stringify(config, null, 2)};`;
            await fs.writeFile(this.projectConfigPath, configContent);
            logger_1.logger.info('Project config created at', this.projectConfigPath);
        }
        catch (error) {
            logger_1.logger.error('Failed to create project config:', error);
            throw error;
        }
    }
    async validateConfig(config) {
        const errors = [];
        // Validate required fields
        if (!config.githubRepo) {
            errors.push('GitHub repository is required');
        }
        if (!config.cacheDir) {
            errors.push('Cache directory is required');
        }
        // Validate network
        if (!['mainnet', 'sepolia'].includes(config.network)) {
            errors.push('Network must be either "mainnet" or "sepolia"');
        }
        // Validate paths
        try {
            await fs.ensureDir(config.cacheDir);
        }
        catch (error) {
            errors.push(`Cannot create cache directory: ${error}`);
        }
        if (config.outputDir) {
            try {
                await fs.ensureDir(config.outputDir);
            }
            catch (error) {
                errors.push(`Cannot create output directory: ${error}`);
            }
        }
        if (errors.length > 0) {
            throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
        }
    }
    getConfigPath() {
        return this.configPath;
    }
    getProjectConfigPath() {
        return this.projectConfigPath;
    }
    async hasProjectConfig() {
        return fs.pathExists(this.projectConfigPath);
    }
    async hasGlobalConfig() {
        return fs.pathExists(this.configPath);
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=config-manager.js.map
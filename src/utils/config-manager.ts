import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';
import { TokamakConfig } from '../types';
import { DEFAULT_CONFIG } from '../config/defaults';
import { logger } from './logger';

export class ConfigManager {
  private configPath: string;
  private projectConfigPath: string;

  constructor() {
    this.configPath = path.join(os.homedir(), '.tokamak-zk-evm', 'config.json');
    this.projectConfigPath = path.join(process.cwd(), 'tokamak.config.js');
  }

  async loadConfig(): Promise<TokamakConfig> {
    let config: TokamakConfig = { ...DEFAULT_CONFIG };

    // Load global config
    try {
      if (await fs.pathExists(this.configPath)) {
        const globalConfig = await fs.readJson(this.configPath);
        config = { ...config, ...globalConfig };
        logger.debug('Loaded global config from', this.configPath);
      }
    } catch (error) {
      logger.warn('Failed to load global config:', error);
    }

    // Load project config
    try {
      if (await fs.pathExists(this.projectConfigPath)) {
        // Clear require cache to ensure fresh load
        delete require.cache[require.resolve(this.projectConfigPath)];
        const projectConfig = require(this.projectConfigPath);
        config = { ...config, ...projectConfig };
        logger.debug('Loaded project config from', this.projectConfigPath);
      }
    } catch (error) {
      logger.warn('Failed to load project config:', error);
    }

    // Ensure cache directory exists
    await fs.ensureDir(config.cacheDir);

    return config;
  }

  async saveGlobalConfig(config: Partial<TokamakConfig>): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.configPath));
      
      let existingConfig: Partial<TokamakConfig> = {};
      if (await fs.pathExists(this.configPath)) {
        existingConfig = await fs.readJson(this.configPath);
      }

      const mergedConfig = { ...existingConfig, ...config };
      await fs.writeJson(this.configPath, mergedConfig, { spaces: 2 });
      
      logger.info('Global config saved to', this.configPath);
    } catch (error) {
      logger.error('Failed to save global config:', error);
      throw error;
    }
  }

  async createProjectConfig(config: Partial<TokamakConfig>): Promise<void> {
    try {
      const configContent = `module.exports = ${JSON.stringify(config, null, 2)};`;
      await fs.writeFile(this.projectConfigPath, configContent);
      
      logger.info('Project config created at', this.projectConfigPath);
    } catch (error) {
      logger.error('Failed to create project config:', error);
      throw error;
    }
  }

  async validateConfig(config: TokamakConfig): Promise<void> {
    const errors: string[] = [];

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
    } catch (error) {
      errors.push(`Cannot create cache directory: ${error}`);
    }

    if (config.outputDir) {
      try {
        await fs.ensureDir(config.outputDir);
      } catch (error) {
        errors.push(`Cannot create output directory: ${error}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
  }

  getConfigPath(): string {
    return this.configPath;
  }

  getProjectConfigPath(): string {
    return this.projectConfigPath;
  }

  async hasProjectConfig(): Promise<boolean> {
    return fs.pathExists(this.projectConfigPath);
  }

  async hasGlobalConfig(): Promise<boolean> {
    return fs.pathExists(this.configPath);
  }
}

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
exports.GitHubApiClient = void 0;
const axios_1 = __importDefault(require("axios"));
const fs_1 = require("fs");
const defaults_1 = require("../config/defaults");
const logger_1 = require("./logger");
const platform_detector_1 = require("./platform-detector");
class GitHubApiClient {
    constructor(repo) {
        this.baseUrl = defaults_1.GITHUB_API_BASE_URL;
        this.repo = repo;
    }
    async getLatestRelease(includePrerelease = true) {
        if (includePrerelease) {
            // Get all releases and find the most recent one (including prereleases)
            const url = `${this.baseUrl}/repos/${this.repo}/releases`;
            try {
                const response = await axios_1.default.get(url, {
                    headers: {
                        Accept: 'application/vnd.github.v3+json',
                        'User-Agent': 'tokamak-zk-evm-cli',
                    },
                    params: {
                        per_page: 10, // Get recent releases
                    },
                });
                this.logRateLimit(response);
                const releases = response.data;
                if (releases.length === 0) {
                    throw new Error('No releases found');
                }
                // Find the most recent release with assets
                const releaseWithAssets = releases.find((release) => release.assets && release.assets.length > 0);
                if (!releaseWithAssets) {
                    throw new Error('No releases with binary assets found');
                }
                logger_1.logger.info(`Using release: ${releaseWithAssets.tag_name} (prerelease: ${releaseWithAssets.prerelease})`);
                return releaseWithAssets;
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error)) {
                    throw new Error(`Failed to fetch releases: ${error.response?.status} ${error.response?.statusText}`);
                }
                throw error;
            }
        }
        else {
            // Use the standard latest release endpoint (stable only)
            const url = `${this.baseUrl}/repos/${this.repo}/releases/latest`;
            try {
                const response = await axios_1.default.get(url, {
                    headers: {
                        Accept: 'application/vnd.github.v3+json',
                        'User-Agent': 'tokamak-zk-evm-cli',
                    },
                });
                this.logRateLimit(response);
                return response.data;
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error)) {
                    throw new Error(`Failed to fetch latest stable release: ${error.response?.status} ${error.response?.statusText}`);
                }
                throw error;
            }
        }
    }
    async getRelease(version) {
        const url = `${this.baseUrl}/repos/${this.repo}/releases/tags/${version}`;
        try {
            const response = await axios_1.default.get(url, {
                headers: {
                    Accept: 'application/vnd.github.v3+json',
                    'User-Agent': 'tokamak-zk-evm-cli',
                },
            });
            this.logRateLimit(response);
            return response.data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                throw new Error(`Failed to fetch release ${version}: ${error.response?.status} ${error.response?.statusText}`);
            }
            throw error;
        }
    }
    selectBinaryAsset(assets, platformInfo) {
        const platform = platformInfo || platform_detector_1.PlatformDetector.detect();
        const targetAsset = assets.find((asset) => {
            const name = asset.name.toLowerCase();
            const platformName = platform.platform === 'darwin' ? 'macos' : 'linux22';
            return (name.includes('tokamak-zk-evm') &&
                name.includes(platformName) &&
                (name.endsWith('.zip') || name.endsWith('.tar.gz')) &&
                !name.includes('setup-files') // Exclude setup files from binary assets
            );
        });
        if (!targetAsset) {
            const availableAssets = assets.map((a) => a.name).join(', ');
            throw new Error(`No compatible binary found for platform ${platform.platform}. Available assets: ${availableAssets}`);
        }
        return targetAsset;
    }
    selectSetupAsset(assets) {
        // Look for setup files asset
        const setupAsset = assets.find((asset) => {
            const name = asset.name.toLowerCase();
            return (name.includes('setup-files') &&
                (name.endsWith('.zip') || name.endsWith('.tar.gz')));
        });
        return setupAsset || null;
    }
    async downloadAsset(asset, outputPath) {
        const ora = await Promise.resolve().then(() => __importStar(require('ora')));
        const spinner = ora
            .default(`Downloading ${asset.name} (${this.formatBytes(asset.size)})...`)
            .start();
        try {
            const response = await axios_1.default.get(asset.browser_download_url, {
                responseType: 'stream',
                headers: {
                    'User-Agent': 'tokamak-zk-evm-cli',
                },
            });
            const writer = (0, fs_1.createWriteStream)(outputPath);
            let downloadedBytes = 0;
            const totalBytes = asset.size;
            let lastUpdateTime = Date.now();
            response.data.on('data', (chunk) => {
                downloadedBytes += chunk.length;
                const now = Date.now();
                // Update progress every 500ms to avoid too frequent updates
                if (now - lastUpdateTime > 500) {
                    const percentage = Math.round((downloadedBytes / totalBytes) * 100);
                    const downloadedMB = this.formatBytes(downloadedBytes);
                    const totalMB = this.formatBytes(totalBytes);
                    spinner.text = `Downloading ${asset.name} (${downloadedMB}/${totalMB}) ${percentage}%`;
                    lastUpdateTime = now;
                }
            });
            response.data.pipe(writer);
            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    spinner.succeed(`Downloaded ${asset.name} (${this.formatBytes(totalBytes)})`);
                    resolve();
                });
                writer.on('error', (error) => {
                    spinner.fail(`Failed to download ${asset.name}`);
                    reject(error);
                });
            });
        }
        catch (error) {
            spinner.fail(`Failed to download ${asset.name}`);
            if (axios_1.default.isAxiosError(error)) {
                throw new Error(`Failed to download asset: ${error.response?.status} ${error.response?.statusText}`);
            }
            throw error;
        }
    }
    logRateLimit(response) {
        const limit = response.headers['x-ratelimit-limit'];
        const remaining = response.headers['x-ratelimit-remaining'];
        const reset = response.headers['x-ratelimit-reset'];
        if (limit && remaining && reset) {
            logger_1.logger.debug(`GitHub API Rate Limit: ${remaining}/${limit} remaining, resets at ${new Date(parseInt(reset) * 1000).toISOString()}`);
            if (parseInt(remaining) < 10) {
                logger_1.logger.warn(`GitHub API rate limit is low (${remaining}/${limit}). Consider using a GitHub token.`);
            }
        }
    }
    formatBytes(bytes) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}
exports.GitHubApiClient = GitHubApiClient;
//# sourceMappingURL=github-api.js.map
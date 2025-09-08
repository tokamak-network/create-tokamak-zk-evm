import axios, { AxiosResponse } from 'axios';
import { createWriteStream } from 'fs';
import { GitHubRelease, GitHubAsset, PlatformInfo } from '../types';
import { GITHUB_API_BASE_URL } from '../config/defaults';
import { logger } from './logger';
import { PlatformDetector } from './platform-detector';

export class GitHubApiClient {
  private baseUrl: string;
  private repo: string;

  constructor(repo: string) {
    this.baseUrl = GITHUB_API_BASE_URL;
    this.repo = repo;
  }

  async getLatestRelease(
    includePrerelease: boolean = true
  ): Promise<GitHubRelease> {
    if (includePrerelease) {
      // Get all releases and find the most recent one (including prereleases)
      const url = `${this.baseUrl}/repos/${this.repo}/releases`;

      try {
        const response: AxiosResponse<GitHubRelease[]> = await axios.get(url, {
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
        const releaseWithAssets = releases.find(
          (release) => release.assets && release.assets.length > 0
        );

        if (!releaseWithAssets) {
          throw new Error('No releases with binary assets found');
        }

        logger.info(
          `Using release: ${releaseWithAssets.tag_name} (prerelease: ${releaseWithAssets.prerelease})`
        );
        return releaseWithAssets;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(
            `Failed to fetch releases: ${error.response?.status} ${error.response?.statusText}`
          );
        }
        throw error;
      }
    } else {
      // Use the standard latest release endpoint (stable only)
      const url = `${this.baseUrl}/repos/${this.repo}/releases/latest`;

      try {
        const response: AxiosResponse<GitHubRelease> = await axios.get(url, {
          headers: {
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'tokamak-zk-evm-cli',
          },
        });

        this.logRateLimit(response);
        return response.data;
      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new Error(
            `Failed to fetch latest stable release: ${error.response?.status} ${error.response?.statusText}`
          );
        }
        throw error;
      }
    }
  }

  async getRelease(version: string): Promise<GitHubRelease> {
    const url = `${this.baseUrl}/repos/${this.repo}/releases/tags/${version}`;

    try {
      const response: AxiosResponse<GitHubRelease> = await axios.get(url, {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'tokamak-zk-evm-cli',
        },
      });

      this.logRateLimit(response);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to fetch release ${version}: ${error.response?.status} ${error.response?.statusText}`
        );
      }
      throw error;
    }
  }

  selectBinaryAsset(
    assets: GitHubAsset[],
    platformInfo?: PlatformInfo
  ): GitHubAsset {
    const platform = platformInfo || PlatformDetector.detect();

    const targetAsset = assets.find((asset) => {
      const name = asset.name.toLowerCase();
      const platformName = platform.platform === 'darwin' ? 'macos' : 'linux22';

      return (
        name.includes('tokamak-zk-evm') &&
        name.includes(platformName) &&
        (name.endsWith('.zip') || name.endsWith('.tar.gz')) &&
        !name.includes('setup-files') // Exclude setup files from binary assets
      );
    });

    if (!targetAsset) {
      const availableAssets = assets.map((a) => a.name).join(', ');
      throw new Error(
        `No compatible binary found for platform ${platform.platform}. Available assets: ${availableAssets}`
      );
    }

    return targetAsset;
  }

  selectSetupAsset(assets: GitHubAsset[]): GitHubAsset | null {
    // Look for setup files asset
    const setupAsset = assets.find((asset) => {
      const name = asset.name.toLowerCase();
      return (
        name.includes('setup-files') &&
        (name.endsWith('.zip') || name.endsWith('.tar.gz'))
      );
    });

    return setupAsset || null;
  }

  async downloadAsset(asset: GitHubAsset, outputPath: string): Promise<void> {
    const ora = await import('ora');
    const spinner = ora
      .default(`Downloading ${asset.name} (${this.formatBytes(asset.size)})...`)
      .start();

    try {
      const response = await axios.get(asset.browser_download_url, {
        responseType: 'stream',
        headers: {
          'User-Agent': 'tokamak-zk-evm-cli',
        },
      });

      const writer = createWriteStream(outputPath);

      let downloadedBytes = 0;
      const totalBytes = asset.size;
      let lastUpdateTime = Date.now();

      response.data.on('data', (chunk: Buffer) => {
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
          spinner.succeed(
            `Downloaded ${asset.name} (${this.formatBytes(totalBytes)})`
          );
          resolve();
        });
        writer.on('error', (error) => {
          spinner.fail(`Failed to download ${asset.name}`);
          reject(error);
        });
      });
    } catch (error) {
      spinner.fail(`Failed to download ${asset.name}`);
      if (axios.isAxiosError(error)) {
        throw new Error(
          `Failed to download asset: ${error.response?.status} ${error.response?.statusText}`
        );
      }
      throw error;
    }
  }

  private logRateLimit(response: AxiosResponse): void {
    const limit = response.headers['x-ratelimit-limit'];
    const remaining = response.headers['x-ratelimit-remaining'];
    const reset = response.headers['x-ratelimit-reset'];

    if (limit && remaining && reset) {
      logger.debug(
        `GitHub API Rate Limit: ${remaining}/${limit} remaining, resets at ${new Date(
          parseInt(reset) * 1000
        ).toISOString()}`
      );

      if (parseInt(remaining) < 10) {
        logger.warn(
          `GitHub API rate limit is low (${remaining}/${limit}). Consider using a GitHub token.`
        );
      }
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

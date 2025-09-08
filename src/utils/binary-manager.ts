import * as path from 'path';
import * as fs from 'fs-extra';
import { createWriteStream } from 'fs';
import * as tar from 'tar';
import * as yauzl from 'yauzl';
import { GitHubApiClient } from './github-api';
import { PlatformDetector } from './platform-detector';
import { logger } from './logger';
import { BinaryPaths, TokamakConfig } from '../types';
import { SCRIPT_NAMES } from '../config/defaults';

export class BinaryManager {
  private config: TokamakConfig;
  private githubClient: GitHubApiClient;

  constructor(config: TokamakConfig) {
    this.config = config;
    this.githubClient = new GitHubApiClient(config.githubRepo);
  }

  async ensureBinaryAvailable(): Promise<BinaryPaths> {
    const binaryPaths = this.getBinaryPaths();

    if (await this.isBinaryInstalled(binaryPaths)) {
      // Check if binary needs update
      const needsUpdate = await this.checkForUpdates();
      if (needsUpdate) {
        logger.info('📦 New binary version available, updating...');
        await this.updateBinary();
      } else {
        logger.info('Binary already installed and up to date');
      }
      return binaryPaths;
    }

    logger.info('Binary not found, downloading...');
    await this.downloadAndExtractBinary();

    if (!(await this.isBinaryInstalled(binaryPaths))) {
      throw new Error(
        'Binary installation failed - files not found after extraction'
      );
    }

    logger.info('Binary successfully installed');
    return binaryPaths;
  }

  private async downloadAndExtractBinary(): Promise<void> {
    const release =
      this.config.binaryVersion === 'latest'
        ? await this.githubClient.getLatestRelease(
            this.config.includePrerelease ?? true
          )
        : await this.githubClient.getRelease(this.config.binaryVersion);

    const platformInfo = PlatformDetector.detect();
    const asset = this.githubClient.selectBinaryAsset(
      release.assets,
      platformInfo
    );

    const downloadPath = path.join(
      this.config.cacheDir,
      'downloads',
      asset.name
    );
    await fs.ensureDir(path.dirname(downloadPath));

    await this.githubClient.downloadAsset(asset, downloadPath);

    // Show extraction progress
    const ora = await import('ora');
    const extractSpinner = ora.default('Extracting binary files...').start();
    const tempExtractPath = path.join(this.config.cacheDir, 'temp-extract');

    try {
      await fs.ensureDir(tempExtractPath);

      // Determine file type and extract accordingly
      if (downloadPath.endsWith('.zip')) {
        extractSpinner.text = 'Extracting ZIP archive...';
        await this.extractZip(downloadPath, tempExtractPath);
      } else if (downloadPath.endsWith('.tar.gz')) {
        extractSpinner.text = 'Extracting TAR.GZ archive...';
        await this.extractTarGz(downloadPath, tempExtractPath);
      } else {
        extractSpinner.fail('Unsupported archive format');
        throw new Error(`Unsupported archive format: ${downloadPath}`);
      }

      extractSpinner.text = 'Installing binary files...';
      // Move extracted content to the standard location
      await this.moveExtractedBinary(tempExtractPath);

      extractSpinner.text = 'Setting up permissions...';
      // Set executable permissions for all necessary files
      await this.setExecutablePermissions(this.getBinaryPaths().binaryDir);

      extractSpinner.succeed('Binary installation completed');
    } catch (error) {
      extractSpinner.fail('Binary installation failed');
      throw error;
    }

    // Save version info after successful installation
    await this.saveVersionInfo(release);

    // Clean up
    await fs.remove(downloadPath);
    await fs.remove(tempExtractPath);
  }

  private async extractZip(
    zipPath: string,
    extractPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          reject(err);
          return;
        }

        if (!zipfile) {
          reject(new Error('Failed to open zip file'));
          return;
        }

        zipfile.readEntry();

        zipfile.on('entry', (entry) => {
          if (/\/$/.test(entry.fileName)) {
            // Directory entry
            zipfile.readEntry();
          } else {
            // File entry
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) {
                reject(err);
                return;
              }

              if (!readStream) {
                reject(new Error('Failed to create read stream'));
                return;
              }

              const outputPath = path.join(extractPath, entry.fileName);
              fs.ensureDir(path.dirname(outputPath))
                .then(() => {
                  const writeStream = createWriteStream(outputPath);
                  readStream.pipe(writeStream);

                  writeStream.on('close', () => {
                    // Set executable permissions for script files
                    if (
                      entry.fileName.endsWith('.sh') ||
                      entry.fileName.includes('/bin/')
                    ) {
                      fs.chmod(outputPath, 0o755).catch(console.error);
                    }
                    zipfile.readEntry();
                  });

                  writeStream.on('error', reject);
                })
                .catch(reject);
            });
          }
        });

        zipfile.on('end', () => {
          resolve();
        });

        zipfile.on('error', reject);
      });
    });
  }

  private async extractTarGz(
    tarPath: string,
    extractPath: string
  ): Promise<void> {
    await tar.extract({
      file: tarPath,
      cwd: extractPath,
      onentry: (entry) => {
        // Set executable permissions for script files and binaries
        if (entry.path.endsWith('.sh') || entry.path.includes('/bin/')) {
          entry.mode = 0o755;
        }
      },
    });
  }

  private async moveExtractedBinary(tempExtractPath: string): Promise<void> {
    const binaryPaths = this.getBinaryPaths();

    // Check if files are extracted directly or in a subdirectory
    const entries = await fs.readdir(tempExtractPath, { withFileTypes: true });

    // Look for expected files/directories that should be in the binary
    const expectedItems = ['resource', '1_run-trusted-setup.sh', 'backend-lib'];
    const hasExpectedItems = expectedItems.some((item) =>
      entries.some((entry) => entry.name === item)
    );

    let sourcePath: string;

    if (hasExpectedItems) {
      // Files are extracted directly to tempExtractPath
      sourcePath = tempExtractPath;
      logger.debug('Binary files extracted directly to temp directory');
    } else {
      // Look for a subdirectory that contains the binary
      const extractedDir = entries.find(
        (entry) =>
          entry.isDirectory() &&
          (entry.name.includes('tokamak-zk-evm') ||
            entry.name.includes('tokamak'))
      );

      if (!extractedDir) {
        // List available directories for debugging
        const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
        throw new Error(
          `Could not find extracted binary directory. Available directories: ${dirs.join(
            ', '
          )}`
        );
      }

      sourcePath = path.join(tempExtractPath, extractedDir.name);
      logger.debug(`Found binary in subdirectory: ${extractedDir.name}`);
    }

    // Ensure the target directory exists and is empty
    await fs.ensureDir(path.dirname(binaryPaths.binaryDir));
    if (await fs.pathExists(binaryPaths.binaryDir)) {
      await fs.remove(binaryPaths.binaryDir);
    }

    // Copy the contents to the standard location
    if (sourcePath === tempExtractPath) {
      // Copy contents directly
      await fs.copy(sourcePath, binaryPaths.binaryDir);
    } else {
      // Move the subdirectory
      await fs.move(sourcePath, binaryPaths.binaryDir);
    }

    logger.debug(`Binary installed to: ${binaryPaths.binaryDir}`);
  }

  private async setExecutablePermissions(binaryDir: string): Promise<void> {
    try {
      // Set executable permissions for all .sh script files
      const scriptFiles = await fs.readdir(binaryDir);
      for (const file of scriptFiles) {
        if (file.endsWith('.sh')) {
          const filePath = path.join(binaryDir, file);
          await fs.chmod(filePath, 0o755);
          logger.debug(`Set executable permission for script: ${file}`);
        }
      }

      // Set executable permissions for all files in bin directory
      const binDir = path.join(binaryDir, 'bin');
      if (await fs.pathExists(binDir)) {
        const binFiles = await fs.readdir(binDir);
        for (const file of binFiles) {
          const filePath = path.join(binDir, file);
          const stats = await fs.stat(filePath);
          if (stats.isFile()) {
            await fs.chmod(filePath, 0o755);
            logger.debug(`Set executable permission for binary: ${file}`);
          }
        }
      }

      logger.info('✅ Set executable permissions for all binary files');
    } catch (error) {
      logger.warn('Failed to set some executable permissions:', error);
      // Don't throw error as this is not critical for basic functionality
    }
  }

  private async isBinaryInstalled(binaryPaths: BinaryPaths): Promise<boolean> {
    try {
      // Check if main directory exists
      if (!(await fs.pathExists(binaryPaths.binaryDir))) {
        return false;
      }

      // Check if resource directory exists (this should always be present)
      if (!(await fs.pathExists(binaryPaths.resourceDir))) {
        return false;
      }

      // Check if at least some scripts exist
      const essentialScripts = [
        binaryPaths.scripts.trustedSetup,
        binaryPaths.scripts.preprocess,
        binaryPaths.scripts.prove,
        binaryPaths.scripts.verify,
      ];

      let foundScripts = 0;
      for (const script of essentialScripts) {
        if (await fs.pathExists(script)) {
          foundScripts++;
        }
      }

      // We need at least 3 out of 4 essential scripts to consider it installed
      const isInstalled = foundScripts >= 3;

      if (!isInstalled) {
        logger.debug(
          `Only found ${foundScripts} out of ${essentialScripts.length} essential scripts`
        );
      }

      return isInstalled;
    } catch (error) {
      logger.debug('Error checking binary installation:', error);
      return false;
    }
  }

  getBinaryPaths(): BinaryPaths {
    // Use a generic directory name since the actual release names are complex
    const binaryDirName = 'tokamak-zk-evm-current';
    const binaryDir = path.join(
      this.config.cacheDir,
      'binaries',
      binaryDirName
    );

    return {
      binaryDir,
      binDir: path.join(binaryDir, 'bin'),
      resourceDir: path.join(binaryDir, 'resource'),
      scripts: {
        trustedSetup: path.join(binaryDir, SCRIPT_NAMES.trustedSetup),
        synthesizer: path.join(binaryDir, SCRIPT_NAMES.synthesizer),
        preprocess: path.join(binaryDir, SCRIPT_NAMES.preprocess),
        prove: path.join(binaryDir, SCRIPT_NAMES.prove),
        verify: path.join(binaryDir, SCRIPT_NAMES.verify),
      },
    };
  }

  async updateBinary(): Promise<BinaryPaths> {
    const ora = await import('ora');
    const updateSpinner = ora
      .default('Updating binary to latest version...')
      .start();

    try {
      // Remove existing binary and version info
      updateSpinner.text = 'Removing old binary files...';
      const binaryPaths = this.getBinaryPaths();
      if (await fs.pathExists(binaryPaths.binaryDir)) {
        await fs.remove(binaryPaths.binaryDir);
      }

      const versionFile = path.join(this.config.cacheDir, 'version.json');
      if (await fs.pathExists(versionFile)) {
        await fs.remove(versionFile);
      }

      updateSpinner.text = 'Downloading latest binary...';
      // Download and install latest
      await this.downloadAndExtractBinary();

      if (!(await this.isBinaryInstalled(binaryPaths))) {
        updateSpinner.fail('Binary update failed');
        throw new Error(
          'Binary update failed - files not found after extraction'
        );
      }

      updateSpinner.succeed('Binary updated successfully');
      return binaryPaths;
    } catch (error) {
      updateSpinner.fail('Binary update failed');
      throw error;
    }
  }

  async cleanCache(): Promise<void> {
    logger.info('Cleaning binary cache...');

    if (await fs.pathExists(this.config.cacheDir)) {
      await fs.remove(this.config.cacheDir);
    }

    logger.info('Cache cleaned successfully');
  }

  /**
   * Check if binary needs update by comparing with latest release
   * @returns Promise<boolean> - True if update is needed
   */
  async checkForUpdates(): Promise<boolean> {
    try {
      const currentVersion = await this.getCurrentVersion();
      if (!currentVersion) {
        logger.debug('No version info found, assuming update needed');
        return true;
      }

      const latestRelease = await this.githubClient.getLatestRelease(
        this.config.includePrerelease ?? true
      );

      const isOutdated =
        currentVersion.tag_name !== latestRelease.tag_name ||
        currentVersion.published_at !== latestRelease.published_at;

      if (isOutdated) {
        logger.info(`Current version: ${currentVersion.tag_name}`);
        logger.info(`Latest version: ${latestRelease.tag_name}`);
      }

      return isOutdated;
    } catch (error) {
      logger.debug('Error checking for updates:', error);
      // If we can't check for updates, assume no update needed
      return false;
    }
  }

  /**
   * Get current installed binary version info
   * @returns Promise<any | null> - Version info or null if not found
   */
  private async getCurrentVersion(): Promise<any | null> {
    try {
      const versionFile = path.join(this.config.cacheDir, 'version.json');
      if (await fs.pathExists(versionFile)) {
        const versionData = await fs.readJson(versionFile);
        return versionData;
      }
      return null;
    } catch (error) {
      logger.debug('Error reading version info:', error);
      return null;
    }
  }

  /**
   * Save version info after successful installation
   * @param release - Release info from GitHub API
   */
  private async saveVersionInfo(release: any): Promise<void> {
    try {
      const versionFile = path.join(this.config.cacheDir, 'version.json');
      await fs.ensureDir(path.dirname(versionFile));

      const versionInfo = {
        tag_name: release.tag_name,
        name: release.name,
        published_at: release.published_at,
        prerelease: release.prerelease,
        updated_at: new Date().toISOString(),
      };

      await fs.writeJson(versionFile, versionInfo, { spaces: 2 });
      logger.debug(`Saved version info: ${release.tag_name}`);
    } catch (error) {
      logger.debug('Error saving version info:', error);
      // Don't throw error as this is not critical
    }
  }

  /**
   * Check if setup files are available in the release
   */
  async hasSetupFiles(): Promise<boolean> {
    try {
      const release = await this.githubClient.getLatestRelease(
        this.config.includePrerelease
      );
      const setupAsset = this.githubClient.selectSetupAsset(release.assets);
      return setupAsset !== null;
    } catch (error) {
      logger.debug('Error checking for setup files:', error);
      return false;
    }
  }

  /**
   * Download and install setup files from GitHub release
   */
  async downloadAndInstallSetupFiles(): Promise<void> {
    const release = await this.githubClient.getLatestRelease(
      this.config.includePrerelease
    );

    logger.info(
      `Using release: ${release.tag_name} (prerelease: ${release.prerelease})`
    );

    const setupAsset = this.githubClient.selectSetupAsset(release.assets);
    if (!setupAsset) {
      throw new Error('No setup files found in the release');
    }

    const binaryPaths = this.getBinaryPaths();
    const tempDir = path.join(binaryPaths.binaryDir, '..', 'temp-setup');
    await fs.ensureDir(tempDir);

    try {
      const setupFilePath = path.join(tempDir, setupAsset.name);

      // Download setup files
      await this.githubClient.downloadAsset(setupAsset, setupFilePath);

      // Extract setup files to resource/setup/output
      const setupOutputDir = path.join(
        binaryPaths.resourceDir,
        'setup',
        'output'
      );
      await fs.ensureDir(setupOutputDir);

      if (setupAsset.name.endsWith('.zip')) {
        await this.extractZipToDirectory(setupFilePath, setupOutputDir);
      } else if (setupAsset.name.endsWith('.tar.gz')) {
        await this.extractTarGzToDirectory(setupFilePath, setupOutputDir);
      }

      logger.info('✅ Setup files installed successfully');
    } finally {
      // Clean up temp directory
      if (await fs.pathExists(tempDir)) {
        await fs.remove(tempDir);
      }
    }
  }

  /**
   * Check if setup files are already installed
   */
  async isSetupInstalled(): Promise<boolean> {
    const binaryPaths = this.getBinaryPaths();
    const setupOutputDir = path.join(
      binaryPaths.resourceDir,
      'setup',
      'output'
    );

    // Check for essential setup files
    const setupFiles = [
      'combined_sigma.bin',
      'combined_sigma.json',
      'sigma_preprocess.json',
      'sigma_verify.json',
    ];

    if (!(await fs.pathExists(setupOutputDir))) {
      return false;
    }

    let foundFiles = 0;
    for (const file of setupFiles) {
      const filePath = path.join(setupOutputDir, file);
      if (await fs.pathExists(filePath)) {
        foundFiles++;
      }
    }

    // All 4 files must be present
    return foundFiles === setupFiles.length;
  }

  private async extractZipToDirectory(
    zipPath: string,
    targetDir: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          reject(err);
          return;
        }

        if (!zipfile) {
          reject(new Error('Failed to open zip file'));
          return;
        }

        zipfile.readEntry();
        zipfile.on('entry', (entry) => {
          if (/\/$/.test(entry.fileName)) {
            // Directory entry
            zipfile.readEntry();
          } else {
            // File entry
            const outputPath = path.join(
              targetDir,
              path.basename(entry.fileName)
            );

            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) {
                reject(err);
                return;
              }

              if (!readStream) {
                reject(new Error('Failed to create read stream'));
                return;
              }

              const writeStream = createWriteStream(outputPath);
              readStream.pipe(writeStream);

              writeStream.on('close', () => {
                zipfile.readEntry();
              });

              writeStream.on('error', reject);
            });
          }
        });

        zipfile.on('end', () => {
          resolve();
        });

        zipfile.on('error', reject);
      });
    });
  }

  private async extractTarGzToDirectory(
    tarPath: string,
    targetDir: string
  ): Promise<void> {
    await tar.extract({
      file: tarPath,
      cwd: targetDir,
      strip: 1, // Remove the top-level directory from the archive
    });
  }
}

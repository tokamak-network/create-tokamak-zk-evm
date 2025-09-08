import { BinaryPaths, TokamakConfig } from '../types';
export declare class BinaryManager {
    private config;
    private githubClient;
    constructor(config: TokamakConfig);
    ensureBinaryAvailable(): Promise<BinaryPaths>;
    private downloadAndExtractBinary;
    private extractZip;
    private extractTarGz;
    private moveExtractedBinary;
    private setExecutablePermissions;
    private isBinaryInstalled;
    getBinaryPaths(): BinaryPaths;
    updateBinary(): Promise<BinaryPaths>;
    cleanCache(): Promise<void>;
    /**
     * Check if binary needs update by comparing with latest release
     * @returns Promise<boolean> - True if update is needed
     */
    checkForUpdates(): Promise<boolean>;
    /**
     * Get current installed binary version info
     * @returns Promise<any | null> - Version info or null if not found
     */
    private getCurrentVersion;
    /**
     * Save version info after successful installation
     * @param release - Release info from GitHub API
     */
    private saveVersionInfo;
    /**
     * Check if setup files are available in the release
     */
    hasSetupFiles(): Promise<boolean>;
    /**
     * Download and install setup files from GitHub release
     */
    downloadAndInstallSetupFiles(): Promise<void>;
    /**
     * Check if setup files are already installed
     */
    isSetupInstalled(): Promise<boolean>;
    private extractZipToDirectory;
    private extractTarGzToDirectory;
}
//# sourceMappingURL=binary-manager.d.ts.map
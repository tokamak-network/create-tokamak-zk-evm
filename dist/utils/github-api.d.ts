import { GitHubRelease, GitHubAsset, PlatformInfo } from '../types';
export declare class GitHubApiClient {
    private baseUrl;
    private repo;
    constructor(repo: string);
    getLatestRelease(includePrerelease?: boolean): Promise<GitHubRelease>;
    getRelease(version: string): Promise<GitHubRelease>;
    selectBinaryAsset(assets: GitHubAsset[], platformInfo?: PlatformInfo): GitHubAsset;
    selectSetupAsset(assets: GitHubAsset[]): GitHubAsset | null;
    downloadAsset(asset: GitHubAsset, outputPath: string): Promise<void>;
    private logRateLimit;
    private formatBytes;
}
//# sourceMappingURL=github-api.d.ts.map
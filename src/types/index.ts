export interface TokamakConfig {
  binaryVersion: string;
  outputDir: string;
  keepIntermediates: boolean;
  network: 'mainnet' | 'sepolia';
  githubRepo: string;
  cacheDir: string;
  rpcUrl?: string;
  includePrerelease?: boolean; // Development: true, Production: false
}

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string;
  assets: GitHubAsset[];
}

export interface GitHubAsset {
  id: number;
  name: string;
  label: string | null;
  content_type: string;
  size: number;
  download_count: number;
  created_at: string;
  updated_at: string;
  browser_download_url: string;
}

export interface PlatformInfo {
  platform: 'darwin' | 'linux';
  arch: 'x64' | 'arm64';
  binaryName: string;
  extension: 'zip' | 'tar.gz';
}

export interface BinaryPaths {
  binaryDir: string;
  binDir: string;
  resourceDir: string;
  scripts: {
    trustedSetup: string;
    synthesizer: string;
    preprocess: string;
    prove: string;
    verify: string;
  };
}

export interface ProofGenerationOptions {
  txHash: string;
  outputDir?: string;
  keepIntermediates?: boolean;
  verbose?: boolean;
  network?: 'mainnet' | 'sepolia';
  rpcUrl?: string;
}

export interface ScriptExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface ProofOutputs {
  synthesizer: string[];
  preprocess: string[];
  prove: string[];
  verify: string[];
}

export interface ProgressCallback {
  (step: string, current: number, total: number): void;
}

export interface CommandOptions {
  outputDir?: string;
  keepIntermediates?: boolean;
  verbose?: boolean;
  config?: string;
  network?: 'mainnet' | 'sepolia';
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface Logger {
  error(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

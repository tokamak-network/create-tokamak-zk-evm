import * as os from 'os';
import * as path from 'path';
import { TokamakConfig } from '../types';

export const DEFAULT_CONFIG: TokamakConfig = {
  binaryVersion: 'latest',
  outputDir: './tokamak-zk-evm-outputs',
  keepIntermediates: false,
  network: 'mainnet',
  githubRepo: 'tokamak-network/Tokamak-zk-EVM',
  cacheDir: path.join(os.homedir(), '.tokamak-zk-evm'),
  includePrerelease: true, // Development mode: include prereleases
};

export const GITHUB_API_BASE_URL = 'https://api.github.com';

export const BINARY_NAMES = {
  preprocess: 'preprocess',
  prove: 'prove',
  synthesizer: 'synthesizer',
  trustedSetup: 'trusted-setup',
  verify: 'verify',
} as const;

export const SCRIPT_NAMES = {
  trustedSetup: '1_run-trusted-setup.sh',
  synthesizer: '2_run-synthesizer.sh',
  preprocess: '3_run-preprocess.sh',
  prove: '4_run-prove.sh',
  verify: '5_run-verify.sh',
} as const;

export const PLATFORM_BINARY_MAP = {
  darwin: 'macos',
  linux: 'linux22',
} as const;

export const EXPECTED_OUTPUTS = {
  synthesizer: ['circuit.json', 'witness.json'],
  preprocess: ['preprocessed.json', 'vk.json'],
  prove: ['proof.json', 'public_inputs.json'],
  verify: ['verification_result.json'],
} as const;

export const RATE_LIMIT = {
  GITHUB_API_LIMIT: 60, // requests per hour for unauthenticated
  RETRY_DELAY: 1000, // ms
  MAX_RETRIES: 3,
} as const;

// Main exports for the package
export * from './types';
export * from './config/defaults';
export * from './utils/logger';
export * from './utils/platform-detector';
export * from './utils/github-api';
export * from './utils/binary-manager';
export * from './utils/script-runner';
export * from './utils/config-manager';

// Re-export commands for programmatic use
export { createInitCommand } from './commands/init';
export { createProveCommand } from './commands/prove';
export { createVerifyCommand } from './commands/verify';
export { createExportCommand } from './commands/export';
export { createStatusCommand } from './commands/status';

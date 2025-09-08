import { Command } from 'commander';
export declare function createInitCommand(): Command;
export declare function initializeProject(projectName?: string, options?: {
    outputDir?: string;
    network?: 'mainnet' | 'sepolia';
    rpcUrl?: string;
    skipBinary?: boolean;
    setupMode?: 'download' | 'local' | 'skip' | 'ask';
}): Promise<void>;
//# sourceMappingURL=init.d.ts.map
import { ScriptExecutionResult, BinaryPaths, ProgressCallback } from '../types';
export declare class ScriptRunner {
    private binaryPaths;
    constructor(binaryPaths: BinaryPaths);
    /**
     * Check if trusted setup files already exist
     * @returns Promise<boolean> - True if setup files exist
     */
    isTrustedSetupComplete(): Promise<boolean>;
    executeScriptWithInput(scriptPath: string, args: string[] | undefined, input: string, options?: {
        env?: Record<string, string>;
        onProgress?: ProgressCallback;
        verbose?: boolean;
    }): Promise<ScriptExecutionResult>;
    executeScript(scriptPath: string, args?: string[], options?: {
        env?: Record<string, string>;
        onProgress?: ProgressCallback;
        verbose?: boolean;
    }): Promise<ScriptExecutionResult>;
    runTrustedSetup(options?: {
        verbose?: boolean;
        onProgress?: ProgressCallback;
    }): Promise<ScriptExecutionResult>;
    runSynthesizer(txHash: string, options?: {
        verbose?: boolean;
        onProgress?: ProgressCallback;
        rpcUrl?: string;
    }): Promise<ScriptExecutionResult>;
    runPreprocess(options?: {
        verbose?: boolean;
        onProgress?: ProgressCallback;
    }): Promise<ScriptExecutionResult>;
    runProve(options?: {
        verbose?: boolean;
        onProgress?: ProgressCallback;
    }): Promise<ScriptExecutionResult>;
    runVerify(options?: {
        verbose?: boolean;
        onProgress?: ProgressCallback;
    }): Promise<ScriptExecutionResult>;
    runFullProofGeneration(txHash: string, options?: {
        verbose?: boolean;
        onProgress?: ProgressCallback;
        rpcUrl?: string;
        skipTrustedSetup?: boolean;
    }): Promise<{
        synthesis: ScriptExecutionResult;
        preprocess: ScriptExecutionResult;
        prove: ScriptExecutionResult;
        verify: ScriptExecutionResult;
        trustedSetup?: ScriptExecutionResult;
    }>;
    /**
     * Run partial proof generation (synthesizer + preprocess only)
     * Used for regeneration mode where we only need to regenerate components
     */
    runPartialProofGeneration(txHash: string, options?: {
        verbose?: boolean;
        onProgress?: ProgressCallback;
        rpcUrl?: string;
        skipTrustedSetup?: boolean;
        regenerateOnly?: boolean;
    }): Promise<{
        synthesis: ScriptExecutionResult;
        preprocess: ScriptExecutionResult;
    }>;
    private parseProgressFromOutput;
}
//# sourceMappingURL=script-runner.d.ts.map
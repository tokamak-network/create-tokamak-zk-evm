import { TokamakConfig } from '../types';
export declare class ConfigManager {
    private configPath;
    private projectConfigPath;
    constructor();
    loadConfig(): Promise<TokamakConfig>;
    saveGlobalConfig(config: Partial<TokamakConfig>): Promise<void>;
    createProjectConfig(config: Partial<TokamakConfig>): Promise<void>;
    validateConfig(config: TokamakConfig): Promise<void>;
    getConfigPath(): string;
    getProjectConfigPath(): string;
    hasProjectConfig(): Promise<boolean>;
    hasGlobalConfig(): Promise<boolean>;
}
//# sourceMappingURL=config-manager.d.ts.map
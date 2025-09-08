import { TokamakConfig } from '../types';
export declare const DEFAULT_CONFIG: TokamakConfig;
export declare const GITHUB_API_BASE_URL = "https://api.github.com";
export declare const BINARY_NAMES: {
    readonly preprocess: "preprocess";
    readonly prove: "prove";
    readonly synthesizer: "synthesizer";
    readonly trustedSetup: "trusted-setup";
    readonly verify: "verify";
};
export declare const SCRIPT_NAMES: {
    readonly trustedSetup: "1_run-trusted-setup.sh";
    readonly synthesizer: "2_run-synthesizer.sh";
    readonly preprocess: "3_run-preprocess.sh";
    readonly prove: "4_run-prove.sh";
    readonly verify: "5_run-verify.sh";
};
export declare const PLATFORM_BINARY_MAP: {
    readonly darwin: "macos";
    readonly linux: "linux22";
};
export declare const EXPECTED_OUTPUTS: {
    readonly synthesizer: readonly ["circuit.json", "witness.json"];
    readonly preprocess: readonly ["preprocessed.json", "vk.json"];
    readonly prove: readonly ["proof.json", "public_inputs.json"];
    readonly verify: readonly ["verification_result.json"];
};
export declare const RATE_LIMIT: {
    readonly GITHUB_API_LIMIT: 60;
    readonly RETRY_DELAY: 1000;
    readonly MAX_RETRIES: 3;
};
//# sourceMappingURL=defaults.d.ts.map
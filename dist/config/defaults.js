"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RATE_LIMIT = exports.EXPECTED_OUTPUTS = exports.PLATFORM_BINARY_MAP = exports.SCRIPT_NAMES = exports.BINARY_NAMES = exports.GITHUB_API_BASE_URL = exports.DEFAULT_CONFIG = void 0;
const os = __importStar(require("os"));
const path = __importStar(require("path"));
exports.DEFAULT_CONFIG = {
    binaryVersion: 'latest',
    outputDir: './tokamak-zk-evm-outputs',
    keepIntermediates: false,
    network: 'mainnet',
    githubRepo: 'tokamak-network/Tokamak-zk-EVM',
    cacheDir: path.join(os.homedir(), '.tokamak-zk-evm'),
    includePrerelease: true, // Development mode: include prereleases
};
exports.GITHUB_API_BASE_URL = 'https://api.github.com';
exports.BINARY_NAMES = {
    preprocess: 'preprocess',
    prove: 'prove',
    synthesizer: 'synthesizer',
    trustedSetup: 'trusted-setup',
    verify: 'verify',
};
exports.SCRIPT_NAMES = {
    trustedSetup: '1_run-trusted-setup.sh',
    synthesizer: '2_run-synthesizer.sh',
    preprocess: '3_run-preprocess.sh',
    prove: '4_run-prove.sh',
    verify: '5_run-verify.sh',
};
exports.PLATFORM_BINARY_MAP = {
    darwin: 'macos',
    linux: 'linux22',
};
exports.EXPECTED_OUTPUTS = {
    synthesizer: ['circuit.json', 'witness.json'],
    preprocess: ['preprocessed.json', 'vk.json'],
    prove: ['proof.json', 'public_inputs.json'],
    verify: ['verification_result.json'],
};
exports.RATE_LIMIT = {
    GITHUB_API_LIMIT: 60, // requests per hour for unauthenticated
    RETRY_DELAY: 1000, // ms
    MAX_RETRIES: 3,
};
//# sourceMappingURL=defaults.js.map
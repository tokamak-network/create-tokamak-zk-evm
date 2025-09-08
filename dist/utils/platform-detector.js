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
exports.PlatformDetector = void 0;
const os = __importStar(require("os"));
const defaults_1 = require("../config/defaults");
class PlatformDetector {
    static detect() {
        const platform = os.platform();
        const arch = os.arch();
        if (platform !== 'darwin' && platform !== 'linux') {
            throw new Error(`Unsupported platform: ${platform}. Only macOS and Linux are supported.`);
        }
        if (arch !== 'x64' && arch !== 'arm64') {
            throw new Error(`Unsupported architecture: ${arch}. Only x64 and arm64 are supported.`);
        }
        const binaryPlatform = defaults_1.PLATFORM_BINARY_MAP[platform];
        const extension = platform === 'darwin' ? 'zip' : 'tar.gz';
        return {
            platform,
            arch,
            binaryName: `tokamak-zk-evm-${binaryPlatform}`,
            extension,
        };
    }
    static getBinaryFileName(version) {
        const platformInfo = this.detect();
        return `tokamak-zk-evm-${version}-${defaults_1.PLATFORM_BINARY_MAP[platformInfo.platform]}.${platformInfo.extension}`;
    }
    static isSupported() {
        try {
            this.detect();
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.PlatformDetector = PlatformDetector;
//# sourceMappingURL=platform-detector.js.map
import * as os from 'os';
import { PlatformInfo } from '../types';
import { PLATFORM_BINARY_MAP } from '../config/defaults';

export class PlatformDetector {
  static detect(): PlatformInfo {
    const platform = os.platform();
    const arch = os.arch();

    if (platform !== 'darwin' && platform !== 'linux') {
      throw new Error(
        `Unsupported platform: ${platform}. Only macOS and Linux are supported.`
      );
    }

    if (arch !== 'x64' && arch !== 'arm64') {
      throw new Error(
        `Unsupported architecture: ${arch}. Only x64 and arm64 are supported.`
      );
    }

    const binaryPlatform = PLATFORM_BINARY_MAP[platform];
    const extension = platform === 'darwin' ? 'zip' : 'tar.gz';

    return {
      platform,
      arch,
      binaryName: `tokamak-zk-evm-${binaryPlatform}`,
      extension,
    };
  }

  static getBinaryFileName(version: string): string {
    const platformInfo = this.detect();
    return `tokamak-zk-evm-${version}-${
      PLATFORM_BINARY_MAP[platformInfo.platform]
    }.${platformInfo.extension}`;
  }

  static isSupported(): boolean {
    try {
      this.detect();
      return true;
    } catch {
      return false;
    }
  }
}

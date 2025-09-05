# Tokamak-zk-EVM CLI Development Rules

## Project Overview

Create an NPX-installable CLI package that provides easy access to Tokamak-zk-EVM proof generation and verification capabilities using pre-built binaries from GitHub releases.

## Repository Information

### Main Repository (Binary Source)

- **Repository**: `https://github.com/tokamak-network/Tokamak-zk-EVM`
- **Release Assets**:
  - macOS: `tokamak-zk-evm-{version}-macos.zip`
  - Linux: `tokamak-zk-evm-{version}-linux22.tar.gz`
- **GitHub API Endpoint**: `https://api.github.com/repos/tokamak-network/Tokamak-zk-EVM/releases`

### CLI Repository (Separate)

- **Repository**: `tokamak-zk-evm-cli`
- **NPM Package**: `create-tokamak-zk-evm`
- **Installation**: `npx create-tokamak-zk-evm`

## Binary Structure & Scripts

### Expected Binary Directory Structure

```
tokamak-zk-evm-{platform}/
├── bin/
│   ├── preprocess
│   ├── prove
│   ├── synthesizer
│   ├── trusted-setup
│   └── verify
├── backend-lib/
│   └── icicle/
│       ├── include/
│       │   ├── icicle/
│       │   │   ├── api/
│       │   │   ├── backend/
│       │   │   ├── curves/
│       │   │   ├── fields/
│       │   │   ├── hash/
│       │   │   └── ... (other headers)
│       │   └── taskflow/
│       └── lib/
│           ├── backend/
│           │   ├── babybear/
│           │   ├── bls12_377/
│           │   ├── bls12_381/
│           │   ├── bn254/
│           │   ├── bw6_761/
│           │   ├── grumpkin/
│           │   ├── koalabear/
│           │   ├── m31/
│           │   ├── metal/
│           │   ├── stark252/
│           │   └── *.dylib (platform-specific libraries)
│           ├── cmake/
│           └── *.dylib (main icicle libraries)
├── resource/
│   ├── qap-compiler/
│   │   └── library/
│   │       ├── generate_witness.js
│   │       ├── globalWireList.json
│   │       ├── globalWireList.ts
│   │       ├── info/
│   │       │   └── subcircuit*_info.txt
│   │       ├── json/
│   │       ├── r1cs/
│   │       ├── setupParams.json
│   │       ├── setupParams.ts
│   │       ├── subcircuitInfo.json
│   │       ├── subcircuitInfo.ts
│   │       ├── wasm/
│   │       └── witness_calculator.js
│   └── setup/
│       └── output/
│           ├── combined_sigma.json
│           ├── sigma_preprocess.json
│           └── sigma_verify.json
├── 1_run-trusted-setup.sh
├── 2_run-synthesizer.sh
├── 3_run-preprocess.sh
├── 4_run-prove.sh
└── 5_run-verify.sh
```

### Script Execution Sequence

1. **Setup (One-time)**: `1_run-trusted-setup.sh`
2. **Synthesis**: `2_run-synthesizer.sh <tx-hash>` (uses `synthesizer` binary)
3. **Preprocessing**: `3_run-preprocess.sh` (uses `preprocess` binary)
4. **Proof Generation**: `4_run-prove.sh` (uses `prove` binary)
5. **Verification**: `5_run-verify.sh` (uses `verify` binary)

### Script Parameters & Environment

```bash
# Environment variables needed
export ALCHEMY_API_KEY="your_api_key"
export TOKAMAK_BINARY_PATH="/path/to/binary"

# Script execution examples
./2_run-synthesizer.sh 0x6c7903e420c5efb27639f5186a7474ef2137f12c786a90b4efdcb5d88dfdb002
./3_run-preprocess.sh
./4_run-prove.sh
./5_run-verify.sh
```

## Core Requirements

### 1. Package Installation

- **Command**: `npx create tokamak-zk-evm`
- **Type**: NPX-installable package
- **Distribution**: npm registry
- **Target**: Cross-platform (macOS, Linux)

### 2. Binary Management

- **Source**: GitHub releases from CI/CD pipeline
- **Files**:
  - macOS: `tokamak-zk-evm-{version}-macos.zip`
  - Linux: `tokamak-zk-evm-{version}-linux22.tar.gz`
- **Auto-detection**: Platform-specific binary selection
- **Download**: Automatic latest release fetching
- **Extraction**: Auto-extract to local cache directory

### 3. Proof Generation Workflow

**Input**: Transaction hash only
**Process**: Sequential execution of binary scripts:

1. `2_run-synthesizer.sh` - Transaction synthesis
2. `3_run-preprocess.sh` - Preprocessing
3. `4_run-prove.sh` - Proof generation
4. `5_run-verify.sh` - Proof verification

**Output Structure**:

```
binary_folder/
├── resource/
│   ├── synthesizer/
│   │   └── outputs/ (synthesis results)
│   ├── preprocess/
│   │   └── outputs/ (preprocessing results)
│   ├── prove/
│   │   └── outputs/ (proof files)
│   └── verify/
│       └── outputs/ (verification results)
```

### 4. CLI Interface Design

#### Commands Structure

```bash
# Installation & Setup
npx create tokamak-zk-evm [project-name]
tokamak-zk-evm init

# Proof Operations
tokamak-zk-evm prove <tx-hash> [options]
tokamak-zk-evm verify <proof-file> [options]

# Output Management
tokamak-zk-evm export <type> <destination>
tokamak-zk-evm list-outputs
tokamak-zk-evm clean

# Utility
tokamak-zk-evm status
tokamak-zk-evm update
tokamak-zk-evm --version
```

#### Options & Flags

```bash
--output-dir <path>     # Custom output directory
--keep-intermediates    # Preserve intermediate files
--verbose              # Detailed logging
--config <file>        # Custom configuration
--network <name>       # Target network (mainnet/sepolia)
```

### 5. Technical Architecture

#### Package Structure

```
tokamak-zk-evm-cli/
├── package.json
├── bin/
│   └── cli.js (entry point)
├── src/
│   ├── commands/
│   │   ├── init.js
│   │   ├── prove.js
│   │   ├── verify.js
│   │   └── export.js
│   ├── utils/
│   │   ├── binary-manager.js
│   │   ├── github-api.js
│   │   ├── platform-detector.js
│   │   └── script-runner.js
│   ├── config/
│   │   └── defaults.js
│   └── types/
│       └── index.d.ts
├── templates/
└── README.md
```

#### Key Components

**Binary Manager**:

- Download latest release from GitHub API
- Platform detection (darwin/linux, x64/arm64)
- Cache management (~/.tokamak-zk-evm/binaries/)
- Version checking and updates

**Script Runner**:

- Sequential script execution
- Progress tracking and logging
- Error handling and recovery
- Output parsing and validation

**Output Manager**:

- Resource directory monitoring
- File export utilities
- Cleanup operations
- Result formatting (JSON/files)

### 6. User Experience Flow

#### First Time Setup

1. `npx create tokamak-zk-evm my-project`
2. Auto-download platform-specific binary
3. Initialize project structure
4. Ready to generate proofs

#### Proof Generation

1. `tokamak-zk-evm prove 0x123...abc`
2. Validate transaction hash
3. Run synthesis → preprocess → prove → verify
4. Display progress and results
5. Offer export options

#### Output Access

1. `tokamak-zk-evm list-outputs`
2. `tokamak-zk-evm export proof ./my-proof.json`
3. `tokamak-zk-evm export all ./results/`

### 7. Configuration Management

#### Default Config (~/.tokamak-zk-evm/config.json)

```json
{
  "binaryVersion": "latest",
  "outputDir": "./tokamak-outputs",
  "keepIntermediates": false,
  "network": "mainnet",
  "githubRepo": "your-org/Tokamak-zk-EVM",
  "cacheDir": "~/.tokamak-zk-evm"
}
```

#### Project Config (tokamak.config.js)

```javascript
module.exports = {
  network: 'sepolia',
  outputDir: './proofs',
  customScripts: {
    postProve: './scripts/post-process.js',
  },
};
```

### 8. GitHub API Integration

#### Release Strategy

**Development Phase:**

- Include prerelease versions for testing and development
- Use the most recent release (including prereleases) when `binaryVersion` is set to "latest"
- This allows testing with the latest features and bug fixes

**Production Phase:**

- Only use stable releases (non-prerelease)
- Filter out prerelease versions to ensure stability
- Use semantic versioning for specific version targeting

#### Release Fetching

```javascript
// Get latest release (development: includes prerelease, production: stable only)
const getLatestRelease = async (includePrerelease = true) => {
  const response = await fetch(
    'https://api.github.com/repos/tokamak-network/Tokamak-zk-EVM/releases'
  );
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }
  const releases = await response.json();

  // Filter based on prerelease policy
  const filteredReleases = includePrerelease
    ? releases
    : releases.filter((release) => !release.prerelease);

  if (filteredReleases.length === 0) {
    throw new Error('No compatible releases found');
  }

  return filteredReleases[0]; // Most recent
};

// Get specific version
const getRelease = async (version) => {
  const response = await fetch(
    `https://api.github.com/repos/tokamak-network/Tokamak-zk-EVM/releases/tags/${version}`
  );
  return response.json();
};
```

#### Asset Selection Logic

```javascript
const selectBinaryAsset = (assets, platform, arch) => {
  const platformMap = {
    darwin: 'macos',
    linux: 'linux22',
  };

  const targetPlatform = platformMap[platform];
  return assets.find(
    (asset) =>
      asset.name.includes(targetPlatform) &&
      (asset.name.endsWith('.zip') || asset.name.endsWith('.tar.gz'))
  );
};
```

#### Rate Limiting & Caching

```javascript
// GitHub API rate limiting (60 requests/hour for unauthenticated)
const rateLimitHeaders = {
  'X-RateLimit-Limit': response.headers.get('X-RateLimit-Limit'),
  'X-RateLimit-Remaining': response.headers.get('X-RateLimit-Remaining'),
  'X-RateLimit-Reset': response.headers.get('X-RateLimit-Reset'),
};

// Cache release info to avoid repeated API calls
const cacheDir = path.join(os.homedir(), '.tokamak-zk-evm', 'cache');
```

### 9. Error Handling & Validation

#### Input Validation

- Transaction hash format validation
- Network availability checks
- Binary compatibility verification

#### Error Recovery

- Partial execution resume
- Automatic retry mechanisms
- Detailed error reporting
- Cleanup on failure

### 10. Binary Execution & Output Processing

#### Script Execution

```javascript
const { spawn } = require('child_process');
const path = require('path');

const executeScript = (scriptPath, args = [], options = {}) => {
  return new Promise((resolve, reject) => {
    const child = spawn('bash', [scriptPath, ...args], {
      cwd: options.workingDir,
      env: { ...process.env, ...options.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
      if (options.onProgress) options.onProgress(data.toString());
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Script failed with code ${code}: ${stderr}`));
      }
    });
  });
};
```

#### Output File Monitoring

```javascript
const fs = require('fs').promises;
const chokidar = require('chokidar');

// Monitor output directories for new files
const monitorOutputs = (binaryPath) => {
  const outputDirs = [
    path.join(binaryPath, 'resource/synthesizer/outputs'),
    path.join(binaryPath, 'resource/preprocess/outputs'),
    path.join(binaryPath, 'resource/prove/outputs'),
    path.join(binaryPath, 'resource/verify/outputs'),
  ];

  return outputDirs.map((dir) => {
    return chokidar.watch(dir, { ignored: /^\./, persistent: true });
  });
};

// Expected output files
const expectedOutputs = {
  synthesizer: ['circuit.json', 'witness.json'],
  preprocess: ['preprocessed.json', 'vk.json'],
  prove: ['proof.json', 'public_inputs.json'],
  verify: ['verification_result.json'],
};
```

#### File Export Utilities

```javascript
const exportOutputs = async (binaryPath, outputType, destination) => {
  const sourceDir = path.join(binaryPath, 'resource', outputType, 'outputs');

  if (outputType === 'all') {
    // Export all outputs to structured directory
    const allOutputs = ['synthesizer', 'preprocess', 'prove', 'verify'];
    for (const type of allOutputs) {
      await copyDirectory(
        path.join(binaryPath, 'resource', type, 'outputs'),
        path.join(destination, type)
      );
    }
  } else {
    // Export specific output type
    await copyDirectory(sourceDir, destination);
  }
};
```

#### Progress Tracking

```javascript
const trackProgress = (step, totalSteps) => {
  const steps = [
    'Downloading binary',
    'Setting up environment',
    'Running synthesis',
    'Preprocessing',
    'Generating proof',
    'Verifying proof',
  ];

  console.log(`[${step}/${totalSteps}] ${steps[step - 1]}...`);
};
```

### 11. Development Guidelines

#### Code Standards

- TypeScript for type safety
- ESLint + Prettier configuration
- Comprehensive error handling
- Extensive logging with debug levels

#### Testing Strategy

- Unit tests for all utilities
- Integration tests with mock binaries
- E2E tests with real transaction hashes
- Cross-platform testing (macOS/Linux)

#### Dependencies

- Minimal external dependencies
- Use Node.js built-ins when possible
- Commander.js for CLI interface
- Axios for GitHub API calls
- Chalk for colored output

### 12. Release & Distribution

#### NPM Package

- Scoped package: `@tokamak/zk-evm-cli`
- Semantic versioning
- Automated publishing via GitHub Actions
- Cross-platform compatibility

#### Documentation

- Comprehensive README
- API documentation
- Usage examples
- Troubleshooting guide

## Implementation Priority

1. **Phase 1**: Basic CLI structure + binary download
2. **Phase 2**: Proof generation workflow
3. **Phase 3**: Output management and export
4. **Phase 4**: Advanced features and optimization
5. **Phase 5**: Documentation and testing

## Coding Standards and Rules

### Naming Conventions

- **Project Name**: Always use "Tokamak-zk-EVM" (with hyphens) in all user-facing text, logs, documentation, and comments
- **Repository References**: Use "Tokamak-zk-EVM" consistently across all references
- **CLI Package**: The NPM package name remains `create-tokamak-zk-evm` (lowercase with hyphens for NPM compatibility)
- **Binary References**: When referring to the binary or system in logs and messages, use "Tokamak-zk-EVM"

### Comment and Documentation Standards

- **Language**: All code comments MUST be written in English
- **Documentation**: All README files, API documentation, and inline documentation MUST be in English
- **Code Comments**: Use clear, descriptive English comments for complex logic, function purposes, and important implementation details
- **JSDoc**: All public functions and classes should have English JSDoc comments

### Examples

```typescript
// ✅ Correct naming and English comments
logger.info('🚀 Initializing Tokamak-zk-EVM project...');

/**
 * Downloads and extracts the Tokamak-zk-EVM binary from GitHub releases
 * @param config - Configuration object containing binary version and cache directory
 * @returns Promise that resolves when binary is successfully installed
 */
private async downloadAndExtractBinary(): Promise<void> {
  // Check if binary is already installed before downloading
  const binaryPaths = this.getBinaryPaths();
  // ... implementation
}

// ❌ Incorrect naming and non-English comments
logger.info('🚀 Initializing Tokamak zkEVM project...');

/**
 * 바이너리를 다운로드하고 압축을 해제합니다
 */
private async downloadAndExtractBinary(): Promise<void> {
  // 바이너리가 이미 설치되어 있는지 확인
  // ... implementation
}
```

## Success Metrics

- One-command proof generation from transaction hash
- Cross-platform compatibility (macOS/Linux)
- Automatic binary management and updates
- Intuitive CLI interface
- Comprehensive error handling
- Easy output access and export

# Tokamak-zk-EVM CLI

NPX-installable CLI package for Tokamak-zk-EVM proof generation and verification using pre-built binaries.

## Features

- 🚀 **One-command installation**: `npx create-tokamak-zk-evm`
- 🔐 **Zero-knowledge proof generation** from transaction hashes
- ✅ **Advanced proof verification** with multiple modes:
  - 🎯 **Interactive mode**: Select proofs from a list
  - 🔄 **Regenerate mode**: Rebuild components before verification
  - 📊 **Detailed results**: Format validation + cryptographic verification
- 📦 **Automatic binary management** with platform detection
- 🌐 **Cross-platform support** (macOS, Linux)
- 📊 **Progress tracking** and detailed logging
- 📁 **Output management** and export utilities

## Quick Start

### Installation

```bash
# Create a new project
npx create-tokamak-zk-evm my-zk-project
cd my-zk-project

# Or initialize in existing directory
npx create-tokamak-zk-evm
```

### Generate a Proof

```bash
# Generate proof for a transaction
tokamak-zk-evm prove 0x6c7903e420c5efb27639f5186a7474ef2137f12c786a90b4efdcb5d88dfdb002 \
  --rpc-url https://mainnet.infura.io/v3/YOUR-PROJECT-ID \
  --verbose

# Generate proof with custom output directory
tokamak-zk-evm prove 0x6c7903e420c5efb27639f5186a7474ef2137f12c786a90b4efdcb5d88dfdb002 \
  --rpc-url https://mainnet.infura.io/v3/YOUR-PROJECT-ID \
  --output-dir ./my-proofs \
  --keep-intermediates
```

### Verify a Proof

```bash
# Basic verification - verify a proof directory
tokamak-zk-evm verify ./tokamak-outputs/proof-0x6c7903e420-2024-01-15T10-30-00-000Z

# Interactive mode - select from available proofs
tokamak-zk-evm verify --interactive

# Regenerate mode - regenerate from proof.json and transaction_hash.txt
tokamak-zk-evm verify --regenerate ./path/to/proof-directory

# Verify with custom output directory
tokamak-zk-evm verify --interactive --output-dir ./my-proofs
```

### Export Outputs

```bash
# Export all outputs
tokamak-zk-evm export all ./exported-proof

# Export only proof files
tokamak-zk-evm export proof ./my-proof.json --format json

# Export specific type
tokamak-zk-evm export synthesizer ./synthesis-outputs
```

## Commands

### `init [project-name]`

Initialize a new Tokamak-zk-EVM project.

```bash
tokamak-zk-evm init my-project
tokamak-zk-evm init --network sepolia --skip-binary
```

**Options:**

- `--output-dir <dir>`: Custom output directory
- `--network <network>`: Target network (mainnet/sepolia)
- `--skip-binary`: Skip binary download during initialization

### `prove <tx-hash>`

Generate a zero-knowledge proof for a transaction.

```bash
tokamak-zk-evm prove 0x123...abc --rpc-url https://mainnet.infura.io/v3/YOUR-PROJECT-ID
```

**Options:**

- `--output-dir <dir>`: Custom output directory
- `--keep-intermediates`: Keep intermediate files
- `--verbose`: Show detailed output
- `--network <network>`: Target network (mainnet/sepolia)
- `--skip-trusted-setup`: Skip trusted setup (if already run)
- `--rpc-url <url>`: RPC URL for transaction data (**required**)

### `verify [proof-file]`

Verify a zero-knowledge proof with multiple modes.

```bash
# Basic verification
tokamak-zk-evm verify ./proof-directory
tokamak-zk-evm verify ./proof.json --verbose

# Interactive mode - select from available proofs
tokamak-zk-evm verify --interactive
tokamak-zk-evm verify --interactive --output-dir ./my-proofs

# Regenerate mode - regenerate components before verification
tokamak-zk-evm verify --regenerate ./proof-directory
```

**Options:**

- `--interactive`: Interactive mode to select from list-outputs
- `--regenerate`: Regenerate proof components from proof.json and transaction_hash.txt
- `--output-dir <dir>`: Output directory to scan for proofs (default: ./tokamak-outputs)
- `--verbose`: Show detailed output

**Regenerate Mode Requirements:**

- Directory must contain `proof.json` file
- Directory must contain `transaction_hash.txt` file
- RPC URL must be configured in project

### `export <type> <destination>`

Export proof outputs.

```bash
tokamak-zk-evm export all ./exported-proof
tokamak-zk-evm export proof ./proof.json --format json
```

**Types:** `all`, `proof`, `synthesizer`, `preprocess`, `verify`
**Formats:** `files` (default), `json`

### `status`

Show current CLI status and configuration.

```bash
tokamak-zk-evm status --verbose
```

### Utility Commands

```bash
# List all proof outputs
tokamak-zk-evm list-outputs

# Clean cache and temporary files
tokamak-zk-evm clean --all
tokamak-zk-evm clean --cache
tokamak-zk-evm clean --outputs

# Update binary to latest version
tokamak-zk-evm update
```

## Configuration

### Global Configuration

Global settings are stored in `~/.tokamak-zk-evm/config.json`:

```json
{
  "binaryVersion": "latest",
  "outputDir": "./tokamak-outputs",
  "keepIntermediates": false,
  "network": "mainnet",
  "cacheDir": "~/.tokamak-zk-evm",
  "rpcUrl": "https://mainnet.infura.io/v3/YOUR-PROJECT-ID"
}
```

### Project Configuration

Create a `tokamak.config.js` file in your project:

```javascript
module.exports = {
  network: 'mainnet', // or 'sepolia'
  outputDir: './tokamak-outputs',
  keepIntermediates: false,
  rpcUrl: 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID',
  customScripts: {
    // postProve: './scripts/post-process.js',
  },
};
```

## RPC Configuration

The synthesizer requires an RPC URL to fetch transaction data. You can provide it in several ways:

1. **Command line option:**

   ```bash
   tokamak-zk-evm prove 0x123...abc --rpc-url https://mainnet.infura.io/v3/YOUR-PROJECT-ID
   ```

2. **Project configuration:**

   ```javascript
   // tokamak.config.js
   module.exports = {
     rpcUrl: 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID',
   };
   ```

3. **Environment variable:**
   ```bash
   export RPC_URL=https://mainnet.infura.io/v3/YOUR-PROJECT-ID
   tokamak-zk-evm prove 0x123...abc
   ```

### Supported RPC Providers

- **Infura**: `https://mainnet.infura.io/v3/YOUR-PROJECT-ID`
- **Alchemy**: `https://eth-mainnet.alchemyapi.io/v2/YOUR-API-KEY`
- **QuickNode**: `https://your-endpoint.quiknode.pro/YOUR-API-KEY/`
- **Custom RPC**: Any Ethereum-compatible RPC endpoint

## Binary Management

The CLI automatically downloads and manages Tokamak-zk-EVM binaries:

- **Automatic platform detection** (macOS, Linux)
- **Latest release fetching** from GitHub
- **Local caching** in `~/.tokamak-zk-evm/binaries/`
- **Version management** and updates

### Binary Structure

```
tokamak-zk-evm-{platform}/
├── bin/                    # Executable binaries
│   ├── preprocess
│   ├── prove
│   ├── synthesizer
│   ├── trusted-setup
│   └── verify
├── resource/               # Resource files
│   ├── qap-compiler/
│   └── setup/
└── *.sh                   # Execution scripts
```

## Proof Generation Workflow

The proof generation follows this sequence:

1. **Trusted Setup** (one-time): `1_run-trusted-setup.sh`
2. **Synthesis**: `2_run-synthesizer.sh <tx-hash>` (requires RPC URL)
3. **Preprocessing**: `3_run-preprocess.sh`
4. **Proof Generation**: `4_run-prove.sh`
5. **Verification**: `5_run-verify.sh`

## Output Structure

Generated proofs are organized as follows:

```
tokamak-outputs/
└── proof-{tx-hash-prefix}-{timestamp}/
    ├── summary.json        # Proof metadata
    ├── synthesizer/        # Synthesis outputs
    ├── preprocess/         # Preprocessing outputs
    ├── prove/              # Proof files
    │   ├── proof.json
    │   └── public_inputs.json
    └── verify/             # Verification results
        └── verification.json
```

## Verification Results

The CLI provides clear verification results with two levels of validation:

### 1. Format Validation

- ✅ **Proof format is VALID**: The proof file is properly formatted and readable

### 2. Cryptographic Verification

- ✅ **Verification result: TRUE**: The proof is mathematically valid and cryptographically sound
- ❌ **Verification result: FALSE**: The proof is invalid or tampered with

### Example Output

```bash
✅ Proof format is VALID
✅ Verification result: TRUE

🔍 Verification Details
=======================
Proof Status: ✅ Valid
Verification Result: TRUE
Verified At: 9/8/2025, 4:58:11 PM
Exit Code: 0
Message: Proof verification successful
```

## Troubleshooting

### Common Issues

1. **Binary not found**

   ```bash
   tokamak-zk-evm init  # Download binary
   ```

2. **RPC URL not set**

   ```bash
   tokamak-zk-evm prove 0x123...abc --rpc-url https://your-rpc-url
   ```

3. **Platform not supported**
   - Only macOS and Linux (x64/arm64) are supported

4. **Permission denied**
   ```bash
   chmod +x ~/.tokamak-zk-evm/binaries/*/bin/*
   chmod +x ~/.tokamak-zk-evm/binaries/*/*.sh
   ```

### Debug Mode

Enable detailed logging:

```bash
tokamak-zk-evm prove 0x123...abc --debug --verbose
```

### Clean Installation

```bash
tokamak-zk-evm clean --all
tokamak-zk-evm init
```

## Development

### Building from Source

```bash
git clone https://github.com/tokamak-zk-evm/create-tokamak-zk-evm.git
cd create-tokamak-zk-evm
npm install
npm run build
```

### Testing

```bash
npm test
npm run lint
```

## Requirements

- **Node.js**: >= 16.0.0
- **Platform**: macOS or Linux (x64/arm64)
- **RPC Access**: Ethereum RPC endpoint for transaction data

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Support

- **Issues**: [GitHub Issues](https://github.com/tokamak-zk-evm/create-tokamak-zk-evm/issues)
- **Documentation**: [GitHub Wiki](https://github.com/tokamak-zk-evm/create-tokamak-zk-evm/wiki)
- **Community**: [Tokamak Network Discord](https://discord.gg/tokamak)

---

Made with ❤️ by [Tokamak Network](https://tokamak.network)

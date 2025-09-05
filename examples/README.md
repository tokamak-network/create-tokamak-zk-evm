# Examples

This directory contains example scripts and usage patterns for the Tokamak-zk-EVM CLI.

## Scripts

### `generate-proof.sh`

Complete example script that demonstrates the full proof generation workflow.

```bash
# Make it executable
chmod +x examples/generate-proof.sh

# Run the example
./examples/generate-proof.sh 0x6c7903e420c5efb27639f5186a7474ef2137f12c786a90b4efdcb5d88dfdb002 https://mainnet.infura.io/v3/YOUR-PROJECT-ID
```

## Usage Patterns

### Basic Proof Generation

```bash
# Initialize project
npx create-tokamak-zk-evm my-zk-project
cd my-zk-project

# Generate proof
tokamak-zk-evm prove 0x123...abc --rpc-url https://your-rpc-url

# Verify proof
tokamak-zk-evm verify ./tokamak-outputs/proof-0x123...abc-timestamp
```

### Batch Processing

```bash
#!/bin/bash
# Process multiple transactions

TRANSACTIONS=(
    "0x6c7903e420c5efb27639f5186a7474ef2137f12c786a90b4efdcb5d88dfdb002"
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
)

RPC_URL="https://mainnet.infura.io/v3/YOUR-PROJECT-ID"

for tx in "${TRANSACTIONS[@]}"; do
    echo "Processing $tx..."
    tokamak-zk-evm prove "$tx" --rpc-url "$RPC_URL" --keep-intermediates
done
```

### CI/CD Integration

```yaml
# .github/workflows/proof-generation.yml
name: Generate ZK Proof

on:
  workflow_dispatch:
    inputs:
      transaction_hash:
        description: 'Transaction hash to prove'
        required: true
        type: string

jobs:
  generate-proof:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Tokamak-zk-EVM CLI
        run: npx create-tokamak-zk-evm --skip-binary=false

      - name: Generate Proof
        run: |
          tokamak-zk-evm prove ${{ github.event.inputs.transaction_hash }} \
            --rpc-url ${{ secrets.RPC_URL }} \
            --verbose

      - name: Upload Proof Artifacts
        uses: actions/upload-artifact@v3
        with:
          name: zk-proof
          path: tokamak-outputs/
```

### Docker Usage

```dockerfile
# Dockerfile
FROM node:18-alpine

RUN apk add --no-cache bash

WORKDIR /app

# Install CLI
RUN npx create-tokamak-zk-evm --skip-binary=false

# Copy your scripts
COPY scripts/ ./scripts/

ENTRYPOINT ["tokamak-zk-evm"]
```

```bash
# Build and run
docker build -t tokamak-zk-evm .
docker run -v $(pwd)/outputs:/app/tokamak-outputs tokamak-zk-evm \
  prove 0x123...abc --rpc-url https://your-rpc-url
```

## Configuration Examples

### Development Configuration

```javascript
// tokamak.config.js
module.exports = {
  network: 'sepolia',
  outputDir: './dev-proofs',
  keepIntermediates: true,
  rpcUrl: 'https://sepolia.infura.io/v3/YOUR-PROJECT-ID',
  customScripts: {
    postProve: './scripts/notify-slack.js',
  },
};
```

### Production Configuration

```javascript
// tokamak.config.js
module.exports = {
  network: 'mainnet',
  outputDir: './production-proofs',
  keepIntermediates: false,
  rpcUrl: process.env.MAINNET_RPC_URL,
  customScripts: {
    postProve: './scripts/upload-to-s3.js',
    postVerify: './scripts/update-database.js',
  },
};
```

## Testing Examples

### Unit Test Example

```javascript
// test/proof-generation.test.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

describe('Proof Generation', () => {
  const testTxHash =
    '0x6c7903e420c5efb27639f5186a7474ef2137f12c786a90b4efdcb5d88dfdb002';
  const rpcUrl = process.env.TEST_RPC_URL;

  beforeAll(() => {
    // Ensure CLI is available
    execSync('tokamak-zk-evm status', { stdio: 'inherit' });
  });

  test('should generate proof for valid transaction', async () => {
    const outputDir = './test-outputs';

    const command = `tokamak-zk-evm prove ${testTxHash} --rpc-url ${rpcUrl} --output-dir ${outputDir}`;

    expect(() => {
      execSync(command, { stdio: 'inherit' });
    }).not.toThrow();

    // Verify output files exist
    expect(fs.existsSync(outputDir)).toBe(true);

    const proofDirs = fs
      .readdirSync(outputDir)
      .filter((name) => name.startsWith('proof-'));

    expect(proofDirs.length).toBeGreaterThan(0);

    const proofDir = path.join(outputDir, proofDirs[0]);
    expect(fs.existsSync(path.join(proofDir, 'summary.json'))).toBe(true);
    expect(fs.existsSync(path.join(proofDir, 'prove', 'proof.json'))).toBe(
      true
    );
  }, 300000); // 5 minute timeout
});
```

## Monitoring and Logging

### Custom Logging Script

```javascript
// scripts/custom-logger.js
const fs = require('fs');
const path = require('path');

class ProofLogger {
  constructor(logFile = './proof-generation.log') {
    this.logFile = logFile;
  }

  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...data,
    };

    fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n');
    console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`);
  }

  info(message, data) {
    this.log('info', message, data);
  }
  error(message, data) {
    this.log('error', message, data);
  }
  warn(message, data) {
    this.log('warn', message, data);
  }
}

module.exports = ProofLogger;
```

### Performance Monitoring

```bash
#!/bin/bash
# monitor-performance.sh

TX_HASH=$1
RPC_URL=$2

echo "Starting performance monitoring for $TX_HASH"

# Start monitoring
start_time=$(date +%s)

# Run proof generation with time tracking
/usr/bin/time -v tokamak-zk-evm prove "$TX_HASH" \
  --rpc-url "$RPC_URL" \
  --verbose 2>&1 | tee performance.log

end_time=$(date +%s)
duration=$((end_time - start_time))

echo "Total execution time: ${duration} seconds"

# Extract memory usage
max_memory=$(grep "Maximum resident set size" performance.log | awk '{print $6}')
echo "Peak memory usage: ${max_memory} KB"

# Log to monitoring system
curl -X POST https://your-monitoring-endpoint.com/metrics \
  -H "Content-Type: application/json" \
  -d "{
    \"transaction\": \"$TX_HASH\",
    \"duration\": $duration,
    \"peak_memory_kb\": $max_memory,
    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
  }"
```

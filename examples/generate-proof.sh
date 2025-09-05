#!/bin/bash

# Example script for generating a proof with Tokamak-zk-EVM CLI
# Usage: ./examples/generate-proof.sh <transaction-hash> <rpc-url>

set -e

# Check arguments
if [ $# -ne 2 ]; then
    echo "Usage: $0 <transaction-hash> <rpc-url>"
    echo "Example: $0 0x6c7903e420c5efb27639f5186a7474ef2137f12c786a90b4efdcb5d88dfdb002 https://mainnet.infura.io/v3/YOUR-PROJECT-ID"
    exit 1
fi

TX_HASH=$1
RPC_URL=$2

echo "🔐 Generating proof for transaction: $TX_HASH"
echo "🌐 Using RPC URL: $RPC_URL"
echo ""

# Check if CLI is available
if ! command -v tokamak-zk-evm &> /dev/null; then
    echo "❌ tokamak-zk-evm CLI not found. Please install it first:"
    echo "   npx create-tokamak-zk-evm"
    exit 1
fi

# Check status
echo "📋 Checking CLI status..."
tokamak-zk-evm status

echo ""
echo "🚀 Starting proof generation..."

# Generate proof
tokamak-zk-evm prove "$TX_HASH" \
    --rpc-url "$RPC_URL" \
    --verbose \
    --keep-intermediates

echo ""
echo "✅ Proof generation completed!"
echo ""

# List outputs
echo "📁 Generated outputs:"
tokamak-zk-evm list-outputs

echo ""
echo "💡 Next steps:"
echo "   - Verify the proof: tokamak-zk-evm verify <proof-directory>"
echo "   - Export the proof: tokamak-zk-evm export proof ./my-proof.json"
echo "   - View all commands: tokamak-zk-evm --help"

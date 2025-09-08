# Tokamak-zk-EVM Project

This project is set up for generating zero-knowledge proofs using Tokamak-zk-EVM.

## Quick Start

1. Generate a proof for a transaction:
   ```bash
   tokamak-zk-evm prove <transaction-hash>
   ```

2. Verify a proof:
   ```bash
   tokamak-zk-evm verify <proof-file>
   ```

3. Export proof outputs:
   ```bash
   tokamak-zk-evm export proof ./my-proof.json
   ```

## Configuration

Edit `tokamak.config.js` to customize your project settings.

## Scripts

- `./scripts/generate-proof.sh` - Example proof generation script

## Outputs

Generated proofs and intermediate files will be stored in the `outputs/` directory.

module.exports = {
  // Target network for proof generation
  network: 'mainnet', // or 'sepolia'

  // Output directory for generated proofs
  outputDir: './tokamak-outputs',

  // Keep intermediate files after proof generation
  keepIntermediates: false,

  // Custom scripts to run after proof generation
  customScripts: {
    // postProve: './scripts/post-process.js',
    // postVerify: './scripts/post-verify.js',
  },

  // RPC URL for transaction data (required for synthesis)
  // rpcUrl: 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID',
};

// Chain API base URLs for different networks
export const CHAIN_API_BASE_URLS: Record<string, string> = {
    ethereum: 'https://api.etherscan.io',
    sepolia: 'https://api-sepolia.etherscan.io',
    holesky: 'https://api-holesky.etherscan.io',
    bsc: 'https://api.bscscan.com',
    bsc_testnet: 'https://api-testnet.bscscan.com',
    polygon: 'https://api.polygonscan.com',
    polygon_testnet: 'https://api-testnet.polygonscan.com',
    polygon_zkevm: 'https://api-zkevm.polygonscan.com',
    polygon_zkevm_testnet: 'https://api-testnet-zkevm.polygonscan.com',
    base: 'https://api.basescan.org',
    base_testnet: 'https://api-testnet.basescan.org',
    arbitrum: 'https://api.arbiscan.io',
    arbitrum_nova: 'https://api-nova.arbiscan.io',
    arbitrum_sepolia: 'https://api-sepolia.arbiscan.io',
    linea: 'https://api.lineascan.org',
    linea_testnet: 'https://api-testnet.lineascan.org',
    fantom: 'https://api.ftmscan.com',
    fantom_testnet: 'https://api-testnet.ftmscan.com',
    optimism: 'https://api-optimistic.etherscan.io',
    optimism_sepolia: 'https://api-sepolia-optimistic.etherscan.io',
    avalanche: 'https://api.snowtrace.io',
    avalanche_fuji: 'https://api-testnet.snowtrace.io',
    // Add additional chains as required
  };
  
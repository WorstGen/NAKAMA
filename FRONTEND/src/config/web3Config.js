// Web3Modal and Wagmi Configuration for Multi-Chain Support
import { EthereumClient, w3mConnectors, w3mProvider } from '@web3modal/ethereum';
import { configureChains, createConfig } from 'wagmi';
import { mainnet, polygon, arbitrum, optimism, base } from 'wagmi/chains';

// Get projectId from https://cloud.walletconnect.com
const projectId = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || 'your-project-id';

// Define the chains we support
export const supportedChains = [mainnet, polygon, arbitrum, optimism, base];

// Configure chains
const { chains, publicClient } = configureChains(
  supportedChains,
  [w3mProvider({ projectId })]
);

// Create wagmi config
export const wagmiConfig = createConfig({
  autoConnect: true,
  connectors: w3mConnectors({ projectId, chains }),
  publicClient
});

// Create ethereum client
export const ethereumClient = new EthereumClient(wagmiConfig, chains);

// Chain configuration with custom details
export const chainConfig = {
  ethereum: {
    id: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    blockExplorer: 'https://etherscan.io',
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/demo',
    color: '#627EEA',
    tokens: [
      { symbol: 'ETH', name: 'Ethereum', decimals: 18, isNative: true },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0xA0b86a33E6441e12e1A9fF2df3DC6F7eE2AB1Bc6' },
      { symbol: 'USDT', name: 'Tether USD', decimals: 6, address: '0xdAC17F958D2ee523a2206206994597C13D831ec7' },
      { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18, address: '0x6B175474E89094C44Da98b954EedeAC495271d0F' }
    ]
  },
  polygon: {
    id: 137,
    name: 'Polygon',
    symbol: 'MATIC',
    decimals: 18,
    blockExplorer: 'https://polygonscan.com',
    rpcUrl: 'https://polygon-rpc.com',
    color: '#8247E5',
    tokens: [
      { symbol: 'MATIC', name: 'Polygon', decimals: 18, isNative: true },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174' },
      { symbol: 'USDT', name: 'Tether USD', decimals: 6, address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' }
    ]
  },
  arbitrum: {
    id: 42161,
    name: 'Arbitrum',
    symbol: 'ETH',
    decimals: 18,
    blockExplorer: 'https://arbiscan.io',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    color: '#28A0F0',
    tokens: [
      { symbol: 'ETH', name: 'Ethereum', decimals: 18, isNative: true },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8' },
      { symbol: 'USDT', name: 'Tether USD', decimals: 6, address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9' }
    ]
  },
  optimism: {
    id: 10,
    name: 'Optimism',
    symbol: 'ETH',
    decimals: 18,
    blockExplorer: 'https://optimistic.etherscan.io',
    rpcUrl: 'https://mainnet.optimism.io',
    color: '#FF0420',
    tokens: [
      { symbol: 'ETH', name: 'Ethereum', decimals: 18, isNative: true },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607' },
      { symbol: 'USDT', name: 'Tether USD', decimals: 6, address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58' }
    ]
  },
  base: {
    id: 8453,
    name: 'Base',
    symbol: 'ETH',
    decimals: 18,
    blockExplorer: 'https://basescan.org',
    rpcUrl: 'https://mainnet.base.org',
    color: '#0052FF',
    tokens: [
      { symbol: 'ETH', name: 'Ethereum', decimals: 18, isNative: true },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' }
    ]
  },
  solana: {
    id: 'solana',
    name: 'Solana',
    symbol: 'SOL',
    decimals: 9,
    blockExplorer: 'https://explorer.solana.com',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    color: '#14F195',
    tokens: [
      { symbol: 'SOL', name: 'Solana', decimals: 9, isNative: true },
      { symbol: 'USDC', name: 'USD Coin', decimals: 6, mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
      { symbol: 'USDT', name: 'Tether USD', decimals: 6, mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' }
    ]
  }
};

// Export projectId for Web3Modal component
export { projectId };

// Utility functions
export const getChainById = (chainId) => {
  return Object.values(chainConfig).find(chain => chain.id === chainId);
};

export const getChainByName = (chainName) => {
  return chainConfig[chainName.toLowerCase()];
};

export const getAllSupportedTokens = () => {
  const allTokens = [];
  Object.entries(chainConfig).forEach(([chainName, config]) => {
    config.tokens.forEach(token => {
      allTokens.push({
        ...token,
        chain: chainName,
        chainId: config.id,
        chainName: config.name
      });
    });
  });
  return allTokens;
};

export const getTokensByChain = (chainName) => {
  const chain = chainConfig[chainName.toLowerCase()];
  return chain ? chain.tokens : [];
};

export const getExplorerUrl = (chainName, txHash, type = 'tx') => {
  const chain = chainConfig[chainName.toLowerCase()];
  if (!chain) return null;
  
  if (chainName === 'solana') {
    return `${chain.blockExplorer}/${type}/${txHash}`;
  }
  return `${chain.blockExplorer}/${type}/${txHash}`;
};

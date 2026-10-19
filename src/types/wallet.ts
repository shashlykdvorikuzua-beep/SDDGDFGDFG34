export type NetworkType = 
  | 'All Networks'
  | 'TRON (TRC-20)'
  | 'BNB Smart Chain'
  | 'Ethereum'
  | 'Solana'
  | 'Bitcoin'
  | 'XRP Ledger'
  | 'Dogecoin'
  | 'Cardano'
  | 'The Open Network'
  | 'Polygon'
  | 'Arbitrum'
  | 'Optimism'
  | 'Avalanche'
  | 'Base'
  | 'Litecoin'
  | 'Near'
  | 'Aptos'
  | 'Cosmos'
  | 'Filecoin'
  | 'Bitcoin Cash'
  | 'Sei';

export interface Token {
  id: string;
  name: string;
  symbol: string;
  network: NetworkType;
  price: number;
  change24h: number;
  balance: number;
  balanceUsd: number;
  sparkline: number[];
  contractAddress?: string;
  decimals: number;
  iconBg: string;
  iconColor: string;
  balanceKey?: string;
}

export interface NFTItem {
  id: string;
  name: string;
  collection: string;
  network: NetworkType;
  imageUrl: string;
  floorPrice: number;
  floorCurrency: string;
  tokenId: string;
}

export interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'swap' | 'stake' | 'sell';
  tokenSymbol: string;
  tokenName: string;
  amount: number;
  amountUsd: number;
  toAddress: string;
  fromAddress: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  hash: string;
  fee: number;
  network: NetworkType;
}

export interface StakingPool {
  id: string;
  tokenSymbol: string;
  tokenName: string;
  network: NetworkType;
  apy: number;
  lockDuration: string;
  minStake: number;
  userStaked: number;
  rewardEarned: number;
  status: 'active' | 'flexible';
}

export interface DAppItem {
  id: string;
  name: string;
  category: 'DeFi' | 'NFT' | 'Yield' | 'Bridges' | 'Gaming';
  url: string;
  description: string;
  network: NetworkType;
  rating: number;
  icon: string;
  badge?: string;
}

export interface WalletAccount {
  id: string;
  name: string;
  address: string;
  tronAddress?: string;
  mnemonic: string[];
  totalBalanceUsd: number;
  isBackedUp: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'tx' | 'price' | 'security' | 'reward';
  subtype?: 'send' | 'receive';
  read: boolean;
}

import { NetworkType } from './wallet';

export type PositionDirection = 'long' | 'short';
export type ExecutionType = 'market' | 'limit';
export type PositionStatus = 'open' | 'closed' | 'pending_limit';

// Markets available in Trade Pro. Mirrors section 1-5 of the instrument catalog.
export type MarketCategory = 'crypto' | 'forex' | 'commodities' | 'stocks' | 'indices';

// Whether a liquidity provider backing the market is actually connected.
// 'pending' = catalog is designed and shown, but availability must be confirmed.
export type ProviderStatus = 'live' | 'pending';

export interface StakingProAsset {
  id: string;
  name: string;
  symbol: string;
  network: string;
  currentPrice: number;
  change24h: number;
  minPositionUsd: number;
  maxLeverage: number;
  fundingRate8h: number; // e.g. 0.01%
  fundingDirection: 'pay' | 'receive';
  spread: number; // in USD or %
  makerFeePercent: number; // e.g. 0.02%
  takerFeePercent: number; // e.g. 0.05%
  category?: MarketCategory;
  ticker?: string; // display instrument, e.g. BTC/USDT or EUR/USD
  pricePrecision?: number; // decimals used for price, TP and SL
  productType?: string; // CFD / tokenized stock / perpetual-style, provider dependent
  tradingHours?: string;
  subCategory?: string; // grouping inside a market (Layer 1, Основные, Металлы…)
}

// Full catalog row: what the interface renders for every tradable instrument.
export interface TradingInstrument extends StakingProAsset {
  category: MarketCategory;
  ticker: string;
  pricePrecision: number;
  subCategory: string;
  productType: string;
  tradingHours: string;
  flag?: string;
}

// Market-level facts the UI has to be honest about: the collateral currency is
// USDT, but access to a market is granted by a provider, not by a balance.
export interface TradingMarket {
  id: MarketCategory;
  label: string; // short tab label
  title: string; // full localized name
  subtitle: string; // English name from the catalog
  icon: string;
  quoteAsset: string; // USDT
  providerStatus: ProviderStatus;
  provider: string;
  productType: string;
  tradingHours: string;
  fundingModel: string;
  notes: string[];
}

// Section 6: markets kept for a later phase.
export interface FutureMarket {
  title: string;
  items: string[];
}

export interface StakingProPosition {
  id: string;
  assetId: string;
  assetSymbol: string;
  assetName: string;
  category?: MarketCategory;
  ticker?: string;
  pricePrecision?: number;
  direction: PositionDirection;
  executionType: ExecutionType;
  entryPrice: number;
  currentPrice: number;
  positionSizeUsd: number;
  collateralUsd: number;
  leverage: number;
  takeProfitPrice: number;
  stopLossPrice: number;
  estProfitTpUsd: number;
  estProfitTpPercent: number;
  estLossSlUsd: number;
  estLossSlPercent: number;
  liquidationPrice: number;
  openingFeeUsd: number;
  estClosingFeeUsd: number;
  spreadCostUsd: number;
  fundingRate8h: number;
  accruedFundingUsd: number;
  stakingYieldUsd: number; // Separate line item: 0 unless specifically backed
  openedAt: string;
  closedAt?: string;
  closePrice?: number;
  realizedPnlUsd?: number;
  status: PositionStatus;
}

export interface StakingActiveDeposit {
  id: string;
  tokenSymbol: string;
  tokenName: string;
  network: NetworkType;
  amount: number;
  amountUsd: number;
  apy: number;
  lockType: 'flexible' | 'fixed';
  lockDays: number;
  unlockPeriodText: string;
  accruedReward: number;
  accruedRewardUsd: number;
  startDate: string;
  status: 'active' | 'pending_unlock' | 'completed';
  validatorName: string;
  unlockRequestedAt?: number; // Timestamp when unlock was requested
  depositTimestamp?: number; // Timestamp when deposit was made
}

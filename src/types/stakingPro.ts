import { NetworkType } from './wallet';

export type PositionDirection = 'long' | 'short';
export type ExecutionType = 'market' | 'limit';
export type PositionStatus = 'open' | 'closed' | 'pending_limit';

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
}

export interface StakingProPosition {
  id: string;
  assetId: string;
  assetSymbol: string;
  assetName: string;
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

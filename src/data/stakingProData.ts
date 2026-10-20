import { StakingProPosition, StakingActiveDeposit, MarketCategory } from '../types/stakingPro';

// Legacy name kept for existing imports.
export type AssetCategory = MarketCategory;

// The Trade Pro instrument catalog lives in `tradeCatalog.ts` — it is shared by
// the wallet UI, the admin panel and the server-side seed so all three agree on
// ids, tickers and per-market rules.
export {
  TRADING_INSTRUMENTS,
  TRADING_MARKETS,
  FUTURE_MARKETS,
  MARKET_BY_ID,
  STAKING_PRO_ASSETS,
  TRADE_QUOTE_ASSET,
  instrumentCount,
  resolveInstrument,
  formatInstrumentPrice,
  priceStep,
  leverageStepsFor,
  estimateLiquidationPrice,
  inferPricePrecision,
} from './tradeCatalog';

import { TRADING_INSTRUMENTS } from './tradeCatalog';

const catalogById = new Map(TRADING_INSTRUMENTS.map((i) => [i.id, i]));

// Demo seed positions. Prices follow the catalog precision of each instrument.
export const INITIAL_PRO_POSITIONS: StakingProPosition[] = [
  {
    id: 'pos-1',
    assetId: 'ethereum',
    assetSymbol: 'ETH',
    assetName: 'Ethereum',
    category: 'crypto',
    ticker: 'ETH/USDT',
    pricePrecision: catalogById.get('ethereum')?.pricePrecision ?? 2,
    direction: 'long',
    executionType: 'market',
    entryPrice: 2280.0,
    currentPrice: 2422.67,
    positionSizeUsd: 500.0,
    collateralUsd: 100.0,
    leverage: 5,
    takeProfitPrice: 2600.0,
    stopLossPrice: 2180.0,
    estProfitTpUsd: 6.62,
    estProfitTpPercent: 6.62,
    estLossSlUsd: -4.5,
    estLossSlPercent: -4.5,
    liquidationPrice: 1824.0,
    openingFeeUsd: 0.25,
    estClosingFeeUsd: 0.25,
    spreadCostUsd: 0.05,
    fundingRate8h: 0.01,
    accruedFundingUsd: 0.3,
    stakingYieldUsd: 0.0, // Separate line item: 0 unless specifically backed
    openedAt: '14.10.2026 11:30',
    status: 'open',
  },
  {
    id: 'pos-2',
    assetId: 'xau-usd',
    assetSymbol: 'XAU/USD',
    assetName: 'Золото',
    category: 'commodities',
    ticker: 'XAU/USD',
    pricePrecision: catalogById.get('xau-usd')?.pricePrecision ?? 2,
    direction: 'short',
    executionType: 'market',
    entryPrice: 2418.5,
    currentPrice: 2392.18,
    positionSizeUsd: 1000.0,
    collateralUsd: 100.0,
    leverage: 10,
    takeProfitPrice: 2320.0,
    stopLossPrice: 2460.0,
    estProfitTpUsd: 40.69,
    estProfitTpPercent: 40.69,
    estLossSlUsd: -17.16,
    estLossSlPercent: -17.16,
    liquidationPrice: 2634.13,
    openingFeeUsd: 0.4,
    estClosingFeeUsd: 0.4,
    spreadCostUsd: 0.12,
    fundingRate8h: 0.005,
    accruedFundingUsd: 0.0,
    stakingYieldUsd: 0.0,
    openedAt: '19.10.2026 09:05',
    status: 'open',
  },
];

export const INITIAL_ACTIVE_DEPOSITS: StakingActiveDeposit[] = [
  {
    id: 'dep-1',
    tokenSymbol: 'VLT',
    tokenName: 'VaultSpring Native Staking',
    network: 'BNB Smart Chain',
    amount: 120,
    amountUsd: 582.0,
    apy: 14.8,
    lockType: 'fixed',
    lockDays: 30,
    unlockPeriodText: '30 дней (осталось 18 дн.)',
    accruedReward: 4.82,
    accruedRewardUsd: 23.37,
    startDate: '04.10.2026',
    status: 'active',
    validatorName: 'VaultSpring Validator #1',
  },
  {
    id: 'dep-2',
    tokenSymbol: 'SOL',
    tokenName: 'Solana Liquid Stake',
    network: 'Solana',
    amount: 1.5,
    amountUsd: 327.6,
    apy: 7.2,
    lockType: 'flexible',
    lockDays: 0,
    unlockPeriodText: 'Мгновенно / 1 эпоха (2-3 дня)',
    accruedReward: 0.08,
    accruedRewardUsd: 17.47,
    startDate: '10.10.2026',
    status: 'active',
    validatorName: 'Jito / Marinade Network',
  },
];

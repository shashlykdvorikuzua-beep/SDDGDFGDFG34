import { StakingProAsset, StakingProPosition, StakingActiveDeposit } from '../types/stakingPro';

export type AssetCategory = 'crypto' | 'forex' | 'commodities' | 'stocks' | 'indices';

export interface TradingInstrument extends StakingProAsset {
  category: AssetCategory;
  subCategory: string;
  flag?: string;
}

export const TRADING_INSTRUMENTS: TradingInstrument[] = [
  // ==================== CRYPTO ====================
  {
    id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', network: 'All Networks', category: 'crypto', subCategory: 'Все',
    currentPrice: 81978.00, change24h: 1.54, minPositionUsd: 20, maxLeverage: 10,
    fundingRate8h: 0.012, fundingDirection: 'pay', spread: 1.50, makerFeePercent: 0.02, takerFeePercent: 0.05
  },
  {
    id: 'ethereum', name: 'Ethereum', symbol: 'ETH', network: 'Ethereum', category: 'crypto', subCategory: 'Все',
    currentPrice: 2422.67, change24h: 2.31, minPositionUsd: 10, maxLeverage: 10,
    fundingRate8h: 0.010, fundingDirection: 'pay', spread: 0.25, makerFeePercent: 0.02, takerFeePercent: 0.05
  },
  {
    id: 'solana', name: 'Solana', symbol: 'SOL', network: 'Solana', category: 'crypto', subCategory: 'Все',
    currentPrice: 142.31, change24h: 3.12, minPositionUsd: 10, maxLeverage: 10,
    fundingRate8h: 0.015, fundingDirection: 'pay', spread: 0.08, makerFeePercent: 0.02, takerFeePercent: 0.05
  },
  {
    id: 'bnb', name: 'BNB', symbol: 'BNB', network: 'BNB Smart Chain', category: 'crypto', subCategory: 'Все',
    currentPrice: 602.18, change24h: 0.85, minPositionUsd: 10, maxLeverage: 10,
    fundingRate8h: 0.009, fundingDirection: 'pay', spread: 0.15, makerFeePercent: 0.02, takerFeePercent: 0.05
  },
  {
    id: 'xrp', name: 'Ripple', symbol: 'XRP', network: 'XRP Ledger', category: 'crypto', subCategory: 'Все',
    currentPrice: 0.5281, change24h: -1.24, minPositionUsd: 5, maxLeverage: 10,
    fundingRate8h: 0.010, fundingDirection: 'pay', spread: 0.002, makerFeePercent: 0.02, takerFeePercent: 0.05
  },
  {
    id: 'doge', name: 'Dogecoin', symbol: 'DOGE', network: 'Dogecoin', category: 'crypto', subCategory: 'Мемы',
    currentPrice: 0.1623, change24h: 1.08, minPositionUsd: 5, maxLeverage: 5,
    fundingRate8h: 0.015, fundingDirection: 'pay', spread: 0.001, makerFeePercent: 0.02, takerFeePercent: 0.05
  },
  {
    id: 'ada', name: 'Cardano', symbol: 'ADA', network: 'Cardano', category: 'crypto', subCategory: 'Layer 1',
    currentPrice: 0.4112, change24h: 2.43, minPositionUsd: 5, maxLeverage: 10,
    fundingRate8h: 0.012, fundingDirection: 'pay', spread: 0.002, makerFeePercent: 0.02, takerFeePercent: 0.05
  },
  {
    id: 'trx', name: 'TRON', symbol: 'TRX', network: 'TRON (TRC-20)', category: 'crypto', subCategory: 'Layer 1',
    currentPrice: 0.1356, change24h: 0.62, minPositionUsd: 5, maxLeverage: 10,
    fundingRate8h: 0.012, fundingDirection: 'pay', spread: 0.001, makerFeePercent: 0.02, takerFeePercent: 0.05
  },
  {
    id: 'avax', name: 'Avalanche', symbol: 'AVAX', network: 'Avalanche', category: 'crypto', subCategory: 'Layer 1',
    currentPrice: 28.41, change24h: 1.77, minPositionUsd: 10, maxLeverage: 10,
    fundingRate8h: 0.013, fundingDirection: 'pay', spread: 0.05, makerFeePercent: 0.02, takerFeePercent: 0.05
  },
  {
    id: 'matic', name: 'Polygon', symbol: 'MATIC', network: 'Polygon', category: 'crypto', subCategory: 'Layer 2',
    currentPrice: 0.7312, change24h: 0.98, minPositionUsd: 5, maxLeverage: 10,
    fundingRate8h: 0.011, fundingDirection: 'pay', spread: 0.003, makerFeePercent: 0.02, takerFeePercent: 0.05
  },
  {
    id: 'link', name: 'Chainlink', symbol: 'LINK', network: 'Ethereum', category: 'crypto', subCategory: 'DeFi',
    currentPrice: 14.28, change24h: 1.36, minPositionUsd: 5, maxLeverage: 10,
    fundingRate8h: 0.012, fundingDirection: 'pay', spread: 0.02, makerFeePercent: 0.02, takerFeePercent: 0.05
  },
  {
    id: 'dot', name: 'Polkadot', symbol: 'DOT', network: 'Polkadot', category: 'crypto', subCategory: 'Layer 1',
    currentPrice: 6.12, change24h: 0.74, minPositionUsd: 5, maxLeverage: 10,
    fundingRate8h: 0.011, fundingDirection: 'pay', spread: 0.01, makerFeePercent: 0.02, takerFeePercent: 0.05
  },

  // ==================== FOREX ====================
  {
    id: 'eur-usd', name: 'Euro / US Dollar', symbol: 'EUR/USD', network: 'Forex', category: 'forex', subCategory: 'Основные', flag: '🇪🇺',
    currentPrice: 1.0765, change24h: 0.12, minPositionUsd: 50, maxLeverage: 20,
    fundingRate8h: 0.003, fundingDirection: 'pay', spread: 0.0001, makerFeePercent: 0.01, takerFeePercent: 0.03
  },
  {
    id: 'gbp-usd', name: 'British Pound / US Dollar', symbol: 'GBP/USD', network: 'Forex', category: 'forex', subCategory: 'Основные', flag: '🇬🇧',
    currentPrice: 1.2576, change24h: 0.08, minPositionUsd: 50, maxLeverage: 20,
    fundingRate8h: 0.003, fundingDirection: 'pay', spread: 0.0001, makerFeePercent: 0.01, takerFeePercent: 0.03
  },
  {
    id: 'usd-jpy', name: 'US Dollar / Japanese Yen', symbol: 'USD/JPY', network: 'Forex', category: 'forex', subCategory: 'Основные', flag: '🇯🇵',
    currentPrice: 149.32, change24h: -0.21, minPositionUsd: 50, maxLeverage: 20,
    fundingRate8h: 0.004, fundingDirection: 'pay', spread: 0.01, makerFeePercent: 0.01, takerFeePercent: 0.03
  },
  {
    id: 'aud-usd', name: 'Australian Dollar / US Dollar', symbol: 'AUD/USD', network: 'Forex', category: 'forex', subCategory: 'Основные', flag: '🇦🇺',
    currentPrice: 0.6521, change24h: 0.15, minPositionUsd: 50, maxLeverage: 20,
    fundingRate8h: 0.003, fundingDirection: 'pay', spread: 0.0001, makerFeePercent: 0.01, takerFeePercent: 0.03
  },
  {
    id: 'usd-chf', name: 'US Dollar / Swiss Franc', symbol: 'USD/CHF', network: 'Forex', category: 'forex', subCategory: 'Основные', flag: '🇭',
    currentPrice: 0.8824, change24h: -0.09, minPositionUsd: 50, maxLeverage: 20,
    fundingRate8h: 0.003, fundingDirection: 'pay', spread: 0.0001, makerFeePercent: 0.01, takerFeePercent: 0.03
  },
  {
    id: 'usd-cad', name: 'US Dollar / Canadian Dollar', symbol: 'USD/CAD', network: 'Forex', category: 'forex', subCategory: 'Основные', flag: '🇨',
    currentPrice: 1.3581, change24h: 0.11, minPositionUsd: 50, maxLeverage: 20,
    fundingRate8h: 0.003, fundingDirection: 'pay', spread: 0.0001, makerFeePercent: 0.01, takerFeePercent: 0.03
  },
  {
    id: 'nzd-usd', name: 'New Zealand Dollar / US Dollar', symbol: 'NZD/USD', network: 'Forex', category: 'forex', subCategory: 'Основные', flag: '🇿',
    currentPrice: 0.5987, change24h: 0.18, minPositionUsd: 50, maxLeverage: 20,
    fundingRate8h: 0.003, fundingDirection: 'pay', spread: 0.0001, makerFeePercent: 0.01, takerFeePercent: 0.03
  },
  {
    id: 'eur-gbp', name: 'Euro / British Pound', symbol: 'EUR/GBP', network: 'Forex', category: 'forex', subCategory: 'Кросс-пары', flag: '🇪🇺',
    currentPrice: 0.8566, change24h: 0.04, minPositionUsd: 50, maxLeverage: 20,
    fundingRate8h: 0.003, fundingDirection: 'pay', spread: 0.0001, makerFeePercent: 0.01, takerFeePercent: 0.03
  },
  {
    id: 'eur-jpy', name: 'Euro / Japanese Yen', symbol: 'EUR/JPY', network: 'Forex', category: 'forex', subCategory: 'Кросс-пары', flag: '🇪🇺',
    currentPrice: 160.78, change24h: -0.13, minPositionUsd: 50, maxLeverage: 20,
    fundingRate8h: 0.004, fundingDirection: 'pay', spread: 0.01, makerFeePercent: 0.01, takerFeePercent: 0.03
  },
  {
    id: 'gbp-jpy', name: 'British Pound / Japanese Yen', symbol: 'GBP/JPY', network: 'Forex', category: 'forex', subCategory: 'Кросс-пары', flag: '🇬',
    currentPrice: 187.54, change24h: -0.06, minPositionUsd: 50, maxLeverage: 20,
    fundingRate8h: 0.004, fundingDirection: 'pay', spread: 0.01, makerFeePercent: 0.01, takerFeePercent: 0.03
  },
  {
    id: 'aud-jpy', name: 'Australian Dollar / Japanese Yen', symbol: 'AUD/JPY', network: 'Forex', category: 'forex', subCategory: 'Кросс-пары', flag: '🇺',
    currentPrice: 97.38, change24h: 0.19, minPositionUsd: 50, maxLeverage: 20,
    fundingRate8h: 0.004, fundingDirection: 'pay', spread: 0.01, makerFeePercent: 0.01, takerFeePercent: 0.03
  },
  {
    id: 'eur-chf', name: 'Euro / Swiss Franc', symbol: 'EUR/CHF', network: 'Forex', category: 'forex', subCategory: 'Кросс-пары', flag: '🇪🇺',
    currentPrice: 0.9512, change24h: 0.07, minPositionUsd: 50, maxLeverage: 20,
    fundingRate8h: 0.003, fundingDirection: 'pay', spread: 0.0001, makerFeePercent: 0.01, takerFeePercent: 0.03
  },

  // ==================== COMMODITIES ====================
  {
    id: 'xau-usd', name: 'Gold (Золото)', symbol: 'XAU/USD', network: 'Commodities', category: 'commodities', subCategory: 'Металлы',
    currentPrice: 2392.18, change24h: 0.63, minPositionUsd: 50, maxLeverage: 10,
    fundingRate8h: 0.005, fundingDirection: 'pay', spread: 0.30, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'xag-usd', name: 'Silver (Серебро)', symbol: 'XAG/USD', network: 'Commodities', category: 'commodities', subCategory: 'Металлы',
    currentPrice: 28.14, change24h: 1.21, minPositionUsd: 20, maxLeverage: 10,
    fundingRate8h: 0.006, fundingDirection: 'pay', spread: 0.02, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'usoil-usd', name: 'WTI Crude Oil', symbol: 'USOIL/USD', network: 'Commodities', category: 'commodities', subCategory: 'Энергоресурсы',
    currentPrice: 78.32, change24h: 0.48, minPositionUsd: 50, maxLeverage: 10,
    fundingRate8h: 0.008, fundingDirection: 'pay', spread: 0.03, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'ukoil-usd', name: 'Brent Crude Oil', symbol: 'UKOIL/USD', network: 'Commodities', category: 'commodities', subCategory: 'Энергоресурсы',
    currentPrice: 82.71, change24h: 0.52, minPositionUsd: 50, maxLeverage: 10,
    fundingRate8h: 0.008, fundingDirection: 'pay', spread: 0.03, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'ngas-usd', name: 'Natural Gas', symbol: 'NGAS/USD', network: 'Commodities', category: 'commodities', subCategory: 'Энергоресурсы',
    currentPrice: 2.68, change24h: -1.34, minPositionUsd: 20, maxLeverage: 10,
    fundingRate8h: 0.010, fundingDirection: 'pay', spread: 0.01, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'copper-usd', name: 'Copper (Медь)', symbol: 'COPPER/USD', network: 'Commodities', category: 'commodities', subCategory: 'Металлы',
    currentPrice: 4.21, change24h: 0.73, minPositionUsd: 20, maxLeverage: 10,
    fundingRate8h: 0.006, fundingDirection: 'pay', spread: 0.01, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'plat-usd', name: 'Platinum (Платина)', symbol: 'PLAT/USD', network: 'Commodities', category: 'commodities', subCategory: 'Металлы',
    currentPrice: 931.40, change24h: 0.36, minPositionUsd: 50, maxLeverage: 10,
    fundingRate8h: 0.005, fundingDirection: 'pay', spread: 0.50, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'pall-usd', name: 'Palladium (Палладий)', symbol: 'PALL/USD', network: 'Commodities', category: 'commodities', subCategory: 'Металлы',
    currentPrice: 1032.50, change24h: -0.42, minPositionUsd: 50, maxLeverage: 10,
    fundingRate8h: 0.006, fundingDirection: 'pay', spread: 0.50, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'wheat-usd', name: 'Wheat (Пшеница)', symbol: 'WHEAT/USD', network: 'Commodities', category: 'commodities', subCategory: 'С/Х товары',
    currentPrice: 5.72, change24h: 0.18, minPositionUsd: 20, maxLeverage: 5,
    fundingRate8h: 0.008, fundingDirection: 'pay', spread: 0.02, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'corn-usd', name: 'Corn (Кукуруза)', symbol: 'CORN/USD', network: 'Commodities', category: 'commodities', subCategory: 'С/Х товары',
    currentPrice: 4.36, change24h: 0.21, minPositionUsd: 20, maxLeverage: 5,
    fundingRate8h: 0.008, fundingDirection: 'pay', spread: 0.01, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'soy-usd', name: 'Soybean (Соя)', symbol: 'SOY/USD', network: 'Commodities', category: 'commodities', subCategory: 'С/Х товары',
    currentPrice: 11.82, change24h: 0.39, minPositionUsd: 20, maxLeverage: 5,
    fundingRate8h: 0.008, fundingDirection: 'pay', spread: 0.02, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'cocoa-usd', name: 'Cocoa (Какао)', symbol: 'COCOA/USD', network: 'Commodities', category: 'commodities', subCategory: 'С/Х товары',
    currentPrice: 8431.00, change24h: -1.12, minPositionUsd: 50, maxLeverage: 5,
    fundingRate8h: 0.010, fundingDirection: 'pay', spread: 5.00, makerFeePercent: 0.02, takerFeePercent: 0.04
  },

  // ==================== STOCKS ====================
  {
    id: 'aapl', name: 'Apple Inc.', symbol: 'AAPL/USD', network: 'Stocks', category: 'stocks', subCategory: 'Популярные',
    currentPrice: 186.52, change24h: 1.24, minPositionUsd: 50, maxLeverage: 5,
    fundingRate8h: 0.004, fundingDirection: 'pay', spread: 0.05, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'tsla', name: 'Tesla Inc.', symbol: 'TSLA/USD', network: 'Stocks', category: 'stocks', subCategory: 'Популярные',
    currentPrice: 248.32, change24h: -2.18, minPositionUsd: 50, maxLeverage: 5,
    fundingRate8h: 0.006, fundingDirection: 'pay', spread: 0.10, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'msft', name: 'Microsoft Corp.', symbol: 'MSFT/USD', network: 'Stocks', category: 'stocks', subCategory: 'Популярные',
    currentPrice: 410.17, change24h: 0.95, minPositionUsd: 50, maxLeverage: 5,
    fundingRate8h: 0.004, fundingDirection: 'pay', spread: 0.10, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'amzn', name: 'Amazon.com Inc.', symbol: 'AMZN/USD', network: 'Stocks', category: 'stocks', subCategory: 'Популярные',
    currentPrice: 178.43, change24h: 1.36, minPositionUsd: 50, maxLeverage: 5,
    fundingRate8h: 0.004, fundingDirection: 'pay', spread: 0.05, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'googl', name: 'Alphabet Inc.', symbol: 'GOOGL/USD', network: 'Stocks', category: 'stocks', subCategory: 'Популярные',
    currentPrice: 159.21, change24h: 1.02, minPositionUsd: 50, maxLeverage: 5,
    fundingRate8h: 0.004, fundingDirection: 'pay', spread: 0.05, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'meta', name: 'Meta Platforms', symbol: 'META/USD', network: 'Stocks', category: 'stocks', subCategory: 'Популярные',
    currentPrice: 514.28, change24h: 1.45, minPositionUsd: 50, maxLeverage: 5,
    fundingRate8h: 0.005, fundingDirection: 'pay', spread: 0.10, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'nvda', name: 'NVIDIA Corp.', symbol: 'NVDA/USD', network: 'Stocks', category: 'stocks', subCategory: 'Популярные',
    currentPrice: 875.62, change24h: 2.31, minPositionUsd: 50, maxLeverage: 5,
    fundingRate8h: 0.006, fundingDirection: 'pay', spread: 0.20, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'amd', name: 'Advanced Micro Devices', symbol: 'AMD/USD', network: 'Stocks', category: 'stocks', subCategory: 'Популярные',
    currentPrice: 169.44, change24h: 2.05, minPositionUsd: 50, maxLeverage: 5,
    fundingRate8h: 0.005, fundingDirection: 'pay', spread: 0.05, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'nflx', name: 'Netflix Inc.', symbol: 'NFLX/USD', network: 'Stocks', category: 'stocks', subCategory: 'Популярные',
    currentPrice: 631.18, change24h: -0.82, minPositionUsd: 50, maxLeverage: 5,
    fundingRate8h: 0.005, fundingDirection: 'pay', spread: 0.15, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'jpm', name: 'JPMorgan Chase', symbol: 'JPM/USD', network: 'Stocks', category: 'stocks', subCategory: 'Финансы',
    currentPrice: 215.36, change24h: 0.67, minPositionUsd: 50, maxLeverage: 5,
    fundingRate8h: 0.004, fundingDirection: 'pay', spread: 0.05, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'bac', name: 'Bank of America', symbol: 'BAC/USD', network: 'Stocks', category: 'stocks', subCategory: 'Финансы',
    currentPrice: 39.14, change24h: 0.58, minPositionUsd: 50, maxLeverage: 5,
    fundingRate8h: 0.003, fundingDirection: 'pay', spread: 0.02, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'ko', name: 'Coca-Cola Co.', symbol: 'KO/USD', network: 'Stocks', category: 'stocks', subCategory: 'Финансы',
    currentPrice: 63.28, change24h: 0.41, minPositionUsd: 50, maxLeverage: 5,
    fundingRate8h: 0.003, fundingDirection: 'pay', spread: 0.02, makerFeePercent: 0.02, takerFeePercent: 0.04
  },

  // ==================== INDICES ====================
  {
    id: 'us500', name: 'S&P 500', symbol: 'US500/USD', network: 'Indices', category: 'indices', subCategory: 'США',
    currentPrice: 5210.32, change24h: 0.73, minPositionUsd: 100, maxLeverage: 10,
    fundingRate8h: 0.005, fundingDirection: 'pay', spread: 0.50, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'nas100', name: 'Nasdaq 100', symbol: 'NAS100/USD', network: 'Indices', category: 'indices', subCategory: 'США',
    currentPrice: 18452.61, change24h: 0.92, minPositionUsd: 100, maxLeverage: 10,
    fundingRate8h: 0.006, fundingDirection: 'pay', spread: 1.00, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'us30', name: 'Dow Jones 30', symbol: 'US30/USD', network: 'Indices', category: 'indices', subCategory: 'США',
    currentPrice: 38742.18, change24h: 0.61, minPositionUsd: 100, maxLeverage: 10,
    fundingRate8h: 0.005, fundingDirection: 'pay', spread: 1.00, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'ger40', name: 'DAX 40', symbol: 'GER40/USD', network: 'Indices', category: 'indices', subCategory: 'Европа',
    currentPrice: 17921.36, change24h: 0.48, minPositionUsd: 100, maxLeverage: 10,
    fundingRate8h: 0.005, fundingDirection: 'pay', spread: 1.00, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'ftse100', name: 'FTSE 100', symbol: 'UK100/USD', network: 'Indices', category: 'indices', subCategory: 'Европа',
    currentPrice: 7683.21, change24h: 0.37, minPositionUsd: 100, maxLeverage: 10,
    fundingRate8h: 0.004, fundingDirection: 'pay', spread: 0.50, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'fra40', name: 'CAC 40', symbol: 'FRA40/USD', network: 'Indices', category: 'indices', subCategory: 'Европа',
    currentPrice: 7842.53, change24h: 0.42, minPositionUsd: 100, maxLeverage: 10,
    fundingRate8h: 0.004, fundingDirection: 'pay', spread: 0.50, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'eu50', name: 'EURO STOXX 50', symbol: 'EU50/USD', network: 'Indices', category: 'indices', subCategory: 'Европа',
    currentPrice: 4891.17, change24h: 0.51, minPositionUsd: 100, maxLeverage: 10,
    fundingRate8h: 0.004, fundingDirection: 'pay', spread: 0.50, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'jpn225', name: 'Nikkei 225', symbol: 'JPN225/USD', network: 'Indices', category: 'indices', subCategory: 'Азия',
    currentPrice: 39121.44, change24h: 0.86, minPositionUsd: 100, maxLeverage: 10,
    fundingRate8h: 0.005, fundingDirection: 'pay', spread: 2.00, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'hk50', name: 'Hang Seng', symbol: 'HK50/USD', network: 'Indices', category: 'indices', subCategory: 'Азия',
    currentPrice: 16432.18, change24h: 1.12, minPositionUsd: 100, maxLeverage: 10,
    fundingRate8h: 0.006, fundingDirection: 'pay', spread: 1.00, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'aus200', name: 'ASX 200', symbol: 'AUS200/USD', network: 'Indices', category: 'indices', subCategory: 'Азия',
    currentPrice: 7621.58, change24h: 0.29, minPositionUsd: 100, maxLeverage: 10,
    fundingRate8h: 0.004, fundingDirection: 'pay', spread: 0.50, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'chn50', name: 'China A50', symbol: 'CHN50/USD', network: 'Indices', category: 'indices', subCategory: 'Азия',
    currentPrice: 11842.30, change24h: 0.68, minPositionUsd: 100, maxLeverage: 10,
    fundingRate8h: 0.005, fundingDirection: 'pay', spread: 1.00, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
  {
    id: 'vix', name: 'Volatility Index', symbol: 'VIX/USD', network: 'Indices', category: 'indices', subCategory: 'Глобальные',
    currentPrice: 18.41, change24h: -2.15, minPositionUsd: 50, maxLeverage: 5,
    fundingRate8h: 0.010, fundingDirection: 'pay', spread: 0.05, makerFeePercent: 0.02, takerFeePercent: 0.04
  },
];

// Backwards compatibility alias
export const STAKING_PRO_ASSETS: StakingProAsset[] = TRADING_INSTRUMENTS.filter(a => a.category === 'crypto');

export const INITIAL_ACTIVE_DEPOSITS: StakingActiveDeposit[] = [
  {
    id: 'dep-1',
    tokenSymbol: 'VLT',
    tokenName: 'VaultSpring Native Staking',
    network: 'BNB Smart Chain',
    amount: 120,
    amountUsd: 582.00,
    apy: 14.8,
    lockType: 'fixed',
    lockDays: 30,
    unlockPeriodText: '30 дней (осталось 18 дн.)',
    accruedReward: 4.82,
    accruedRewardUsd: 23.37,
    startDate: '04.10.2026',
    status: 'active',
    validatorName: 'VaultSpring Validator #1'
  },
  {
    id: 'dep-2',
    tokenSymbol: 'SOL',
    tokenName: 'Solana Liquid Stake',
    network: 'Solana',
    amount: 1.5,
    amountUsd: 327.60,
    apy: 7.2,
    lockType: 'flexible',
    lockDays: 0,
    unlockPeriodText: 'Мгновенно / 1 эпоха (2-3 дня)',
    accruedReward: 0.08,
    accruedRewardUsd: 17.47,
    startDate: '10.10.2026',
    status: 'active',
    validatorName: 'Jito / Marinade Network'
  }
];

export const INITIAL_PRO_POSITIONS: StakingProPosition[] = [
  {
    id: 'pos-1',
    assetId: 'ethereum',
    assetSymbol: 'ETH',
    assetName: 'Ethereum',
    direction: 'long',
    executionType: 'market',
    entryPrice: 3720.00,
    currentPrice: 3840.25,
    positionSizeUsd: 500.00,
    collateralUsd: 100.00,
    leverage: 5,
    takeProfitPrice: 4100.00,
    stopLossPrice: 3550.00,
    estProfitTpUsd: 51.07,
    estProfitTpPercent: 51.07,
    estLossSlUsd: -22.84,
    estLossSlPercent: -22.84,
    liquidationPrice: 3040.00,
    openingFeeUsd: 0.25,
    estClosingFeeUsd: 0.25,
    spreadCostUsd: 0.05,
    fundingRate8h: 0.010,
    accruedFundingUsd: 0.30,
    stakingYieldUsd: 0.00, // Explicitly separate as required by ТЗ
    openedAt: '14.10.2026 11:30',
    status: 'open'
  },
  {
    id: 'pos-2',
    assetId: 'bitcoin',
    assetSymbol: 'BTC',
    assetName: 'Bitcoin',
    direction: 'short',
    executionType: 'market',
    entryPrice: 97500.00,
    currentPrice: 96420.50,
    positionSizeUsd: 600.00,
    collateralUsd: 200.00,
    leverage: 3,
    takeProfitPrice: 92000.00,
    stopLossPrice: 99800.00,
    estProfitTpUsd: 33.84,
    estProfitTpPercent: 16.92,
    estLossSlUsd: -14.15,
    estLossSlPercent: -7.07,
    liquidationPrice: 128000.00,
    openingFeeUsd: 0.30,
    estClosingFeeUsd: 0.30,
    spreadCostUsd: 0.10,
    fundingRate8h: 0.012,
    accruedFundingUsd: 0.42,
    stakingYieldUsd: 0.00,
    openedAt: '15.10.2026 18:45',
    status: 'open'
  }
];

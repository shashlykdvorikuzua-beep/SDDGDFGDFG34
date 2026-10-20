import {
  StakingProAsset,
  TradingInstrument,
  TradingMarket,
  FutureMarket,
  MarketCategory,
} from '../types/stakingPro';

// ---------------------------------------------------------------------------
// VaultSpring Trade Pro — trading instrument catalog
// Base collateral currency: USDT. This catalog is the interface design source
// of truth. Actual availability of any instrument depends on the connected
// liquidity provider and the product type it offers, never on the USDT balance
// of the user.
// ---------------------------------------------------------------------------

export const TRADE_QUOTE_ASSET = 'USDT';

export const TRADING_MARKETS: TradingMarket[] = [
  {
    id: 'crypto',
    label: 'Крипто',
    title: 'Криптовалюты',
    subtitle: 'Crypto',
    icon: '🪙',
    quoteAsset: TRADE_QUOTE_ASSET,
    providerStatus: 'live',
    provider: 'Подключён: крипто-венд с USDT-обеспечением (цены — live feed)',
    productType: 'USDT-маржинальный бессрочный контракт (perpetual-style)',
    tradingHours: '24/7, без выходных и сессий',
    fundingModel: 'Funding каждые 8 часов',
    notes: [
      'Цены по крипто-парам обновляются из live-фида котировок.',
      'Плечо и минимальный размер позиции задаются вендором по каждому инструменту.',
    ],
  },
  {
    id: 'forex',
    label: 'Форекс',
    title: 'Валютный рынок',
    subtitle: 'Forex',
    icon: '💱',
    quoteAsset: TRADE_QUOTE_ASSET,
    providerStatus: 'live',
    provider: 'Подключён: Frankfurter.app (ECB rates, live feed)',
    productType: 'CFD / спот-форекс с плечом',
    tradingHours: 'Пн–Пт, круглосуточно (спред расширяется в родео-часы и на выходных)',
    fundingModel: 'Overnight swap (трёхдневный ролловер в среду)',
    notes: [
      'Цены обновляются из live-фида European Central Bank через frankfurter.app.',
      'Кэширование 5 минут, fallback на захардкоженные курсы при недоступности API.',
    ],
  },
  {
    id: 'commodities',
    label: 'Сырьё',
    title: 'Сырьё и товары',
    subtitle: 'Commodities',
    icon: '🛢️',
    quoteAsset: TRADE_QUOTE_ASSET,
    providerStatus: 'pending',
    provider: 'Провайдер не подключён',
    productType: 'CFD на фьючерсный контракт (roll-over управляется провайдером)',
    tradingHours: 'Биржевые сессии (CME/COMEX/LME/CBOT), ежедневно с перерывами',
    fundingModel: 'Swap / стоимость содержания позиции',
    notes: [
      'Фьючерсные спецификации (лотность, шаг цены, экспирация) задаёт провайдер.',
      'Сельскохозяйственные товары торгуются только в часы сессий биржи.',
    ],
  },
  {
    id: 'stocks',
    label: 'Акции',
    title: 'Акции',
    subtitle: 'Stocks',
    icon: '📊',
    quoteAsset: TRADE_QUOTE_ASSET,
    providerStatus: 'pending',
    provider: 'Провайдер не подключён',
    productType: 'Не определён: CFD либо токенизированная акция — нужен разрешённый инструмент',
    tradingHours: 'Сессия биржи листинга + препен/пост-маркет, выходные закрыто',
    fundingModel: 'Overnight financing + корректировки на дивиденды',
    notes: [
      'Для акций необходимо зафиксировать тип продукта: CFD, токенизированная акция или иной разрешённый инструмент.',
      'Доступность зависит от юрисдикции пользователя и регуляторных требований.',
    ],
  },
  {
    id: 'indices',
    label: 'Индексы',
    title: 'Фондовые индексы',
    subtitle: 'Indices',
    icon: '📈',
    quoteAsset: TRADE_QUOTE_ASSET,
    providerStatus: 'pending',
    provider: 'Провайдер не подключён',
    productType: 'CFD на индекс (Cash / Future — зависит от провайдера)',
    tradingHours: 'Сессии региональных бирж, ночная сессия — по расписанию провайдера',
    fundingModel: 'Swap / стоимость содержания позиции',
    notes: [
      'Состав и расчетные цены индексов предоставляет провайдер котировок.',
      'Часть индексов торгуется почти 24 часа, но с расширенным спредом вне сессии.',
    ],
  },
];

// Section 6 — markets planned for a later release. Not tradable, shown as a
// roadmap so the catalog structure already accommodates them.
export const FUTURE_MARKETS: FutureMarket[] = [
  { title: 'Облигации', items: ['US 10Y Treasury', 'US 2Y Treasury'] },
  { title: 'Сельскохозяйственные товары', items: ['Кофе', 'Сахар', 'Хлопок'] },
  { title: 'Энергоносители', items: ['Бензин', 'Газойль'] },
  { title: 'Криптовалютные индексы', items: ['Индекс крупных криптоактивов'] },
];

// ---------------------------------------------------------------------------
// Instrument factory helpers — market-level defaults keep every row short and
// make per-market rules (fees, hours, product type) impossible to forget.
// ---------------------------------------------------------------------------
type InstrumentDefaults = Partial<TradingInstrument> & { category: MarketCategory };
type InstrumentSeed = Partial<TradingInstrument> & {
  id: string;
  name: string;
  symbol: string;
  currentPrice: number;
  change24h: number;
};

// Neutral defaults, overridden first by the market defaults and then by the row.
const INSTRUMENT_BASE: Partial<TradingInstrument> = {
  subCategory: 'Все',
  pricePrecision: 2,
  spread: 0,
  fundingRate8h: 0.01,
  fundingDirection: 'pay',
  makerFeePercent: 0.02,
  takerFeePercent: 0.05,
  minPositionUsd: 10,
  maxLeverage: 10,
  network: 'Trade Pro',
};

const makeInstrument =
  (defaults: InstrumentDefaults) =>
  (seed: InstrumentSeed): TradingInstrument => {
    // Market defaults already cover every required field, so the merged row is complete.
    const base = { ...INSTRUMENT_BASE, ...defaults } as TradingInstrument;
    return {
      ...base,
      ...seed,
      category: defaults.category,
      id: seed.id,
      name: seed.name,
      symbol: seed.symbol,
      currentPrice: seed.currentPrice,
      change24h: seed.change24h,
      ticker: seed.ticker || defaults.ticker || `${seed.symbol}/${TRADE_QUOTE_ASSET}`,
      pricePrecision: seed.pricePrecision ?? defaults.pricePrecision ?? 2,
    } as TradingInstrument;
  };

const cryptoInstrument = makeInstrument({
  category: 'crypto',
  network: 'Crypto',
  subCategory: 'Layer 1',
  minPositionUsd: 10,
  maxLeverage: 10,
  makerFeePercent: 0.02,
  takerFeePercent: 0.05,
  fundingDirection: 'pay',
  productType: 'USDT-маржинальный бессрочный контракт',
  tradingHours: '24/7',
});

const fxInstrument = makeInstrument({
  category: 'forex',
  network: 'Forex',
  subCategory: 'Основные',
  minPositionUsd: 50,
  maxLeverage: 20,
  makerFeePercent: 0.01,
  takerFeePercent: 0.03,
  fundingDirection: 'pay',
  pricePrecision: 5,
  productType: 'CFD / спот-форекс с плечом',
  tradingHours: 'Пн–Пт 24 часа',
});

const commodityInstrument = makeInstrument({
  category: 'commodities',
  network: 'Commodities',
  subCategory: 'Металлы',
  minPositionUsd: 50,
  maxLeverage: 10,
  makerFeePercent: 0.02,
  takerFeePercent: 0.04,
  fundingDirection: 'pay',
  productType: 'CFD на фьючерс',
  tradingHours: 'Биржевые сессии CME/COMEX/LME',
});

const stockInstrument = makeInstrument({
  category: 'stocks',
  network: 'Stocks',
  subCategory: 'Технологии',
  minPositionUsd: 50,
  maxLeverage: 5,
  makerFeePercent: 0.02,
  takerFeePercent: 0.04,
  fundingDirection: 'pay',
  productType: 'CFD / токенизированная акция (не подтверждено)',
  tradingHours: 'Сессия биржи листинга (US: 09:30–16:00 ET)',
});

const indexInstrument = makeInstrument({
  category: 'indices',
  network: 'Indices',
  subCategory: 'США',
  minPositionUsd: 100,
  maxLeverage: 10,
  makerFeePercent: 0.02,
  takerFeePercent: 0.04,
  fundingDirection: 'pay',
  productType: 'CFD на индекс',
  tradingHours: 'Сессия региональной биржи + ночная сессия',
});

export const TRADING_INSTRUMENTS: TradingInstrument[] = [
  // ==================== 1. CRYPTO — Crypto ====================
  cryptoInstrument({ id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC', currentPrice: 81978.0, change24h: 1.54, spread: 1.5, fundingRate8h: 0.012 }),
  cryptoInstrument({ id: 'ethereum', name: 'Ethereum', symbol: 'ETH', currentPrice: 2422.67, change24h: 2.31, spread: 0.25, fundingRate8h: 0.01 }),
  cryptoInstrument({ id: 'solana', name: 'Solana', symbol: 'SOL', network: 'Solana', currentPrice: 142.31, change24h: 3.12, spread: 0.08, fundingRate8h: 0.015 }),
  cryptoInstrument({ id: 'bnb', name: 'BNB', symbol: 'BNB', network: 'BNB Smart Chain', currentPrice: 602.18, change24h: 0.85, spread: 0.15, fundingRate8h: 0.009 }),
  cryptoInstrument({ id: 'xrp', name: 'XRP', symbol: 'XRP', network: 'XRP Ledger', subCategory: 'Платежи', currentPrice: 0.5281, change24h: -1.24, pricePrecision: 4, spread: 0.002, fundingRate8h: 0.01, minPositionUsd: 5 }),
  cryptoInstrument({ id: 'doge', name: 'Dogecoin', symbol: 'DOGE', network: 'Dogecoin', subCategory: 'Мемы', currentPrice: 0.1623, change24h: 1.08, pricePrecision: 4, spread: 0.001, fundingRate8h: 0.015, maxLeverage: 5, minPositionUsd: 5 }),
  cryptoInstrument({ id: 'ada', name: 'Cardano', symbol: 'ADA', network: 'Cardano', currentPrice: 0.4112, change24h: 2.43, pricePrecision: 4, spread: 0.002, fundingRate8h: 0.012, minPositionUsd: 5 }),
  cryptoInstrument({ id: 'avax', name: 'Avalanche', symbol: 'AVAX', network: 'Avalanche', currentPrice: 28.41, change24h: 1.77, spread: 0.05, fundingRate8h: 0.013, minPositionUsd: 5 }),
  cryptoInstrument({ id: 'link', name: 'Chainlink', symbol: 'LINK', network: 'Ethereum', subCategory: 'DeFi', currentPrice: 14.28, change24h: 1.36, pricePrecision: 3, spread: 0.02, fundingRate8h: 0.012, minPositionUsd: 5 }),
  cryptoInstrument({ id: 'ton', name: 'Toncoin', symbol: 'TON', network: 'TON', subCategory: 'Layer 1', currentPrice: 5.42, change24h: 2.08, pricePrecision: 3, spread: 0.006, fundingRate8h: 0.013, minPositionUsd: 5 }),
  cryptoInstrument({ id: 'sui', name: 'Sui', symbol: 'SUI', network: 'Sui', subCategory: 'Layer 1', currentPrice: 3.87, change24h: 4.11, pricePrecision: 3, spread: 0.005, fundingRate8h: 0.016, minPositionUsd: 5 }),
  cryptoInstrument({ id: 'tron', name: 'TRON', symbol: 'TRX', network: 'TRON (TRC-20)', currentPrice: 0.1356, change24h: 0.62, pricePrecision: 4, spread: 0.001, fundingRate8h: 0.012, minPositionUsd: 5 }),

  // ==================== 2. FOREX — Валютный рынок ====================
  fxInstrument({ id: 'eur-usd', name: 'Евро / доллар США', symbol: 'EUR/USD', ticker: 'EUR/USD', currentPrice: 1.0765, change24h: 0.12, spread: 0.0001, fundingRate8h: 0.003 }),
  fxInstrument({ id: 'gbp-usd', name: 'Фунт стерлингов / доллар США', symbol: 'GBP/USD', ticker: 'GBP/USD', currentPrice: 1.2576, change24h: 0.08, spread: 0.0001, fundingRate8h: 0.003 }),
  fxInstrument({ id: 'usd-jpy', name: 'Доллар США / японская иена', symbol: 'USD/JPY', ticker: 'USD/JPY', currentPrice: 149.32, change24h: -0.21, pricePrecision: 3, spread: 0.01, fundingRate8h: 0.004 }),
  fxInstrument({ id: 'usd-chf', name: 'Доллар США / швейцарский франк', symbol: 'USD/CHF', ticker: 'USD/CHF', currentPrice: 0.8824, change24h: -0.09, spread: 0.0001, fundingRate8h: 0.003 }),
  fxInstrument({ id: 'aud-usd', name: 'Австралийский доллар / доллар США', symbol: 'AUD/USD', ticker: 'AUD/USD', currentPrice: 0.6521, change24h: 0.15, spread: 0.0001, fundingRate8h: 0.003 }),
  fxInstrument({ id: 'usd-cad', name: 'Доллар США / канадский доллар', symbol: 'USD/CAD', ticker: 'USD/CAD', currentPrice: 1.3581, change24h: 0.11, spread: 0.0001, fundingRate8h: 0.003 }),
  fxInstrument({ id: 'nzd-usd', name: 'Новозеландский доллар / доллар США', symbol: 'NZD/USD', ticker: 'NZD/USD', subCategory: 'Основные', currentPrice: 0.5987, change24h: 0.18, spread: 0.00015, fundingRate8h: 0.003 }),
  fxInstrument({ id: 'eur-gbp', name: 'Евро / фунт стерлингов', symbol: 'EUR/GBP', ticker: 'EUR/GBP', subCategory: 'Кросс-пары', currentPrice: 0.8566, change24h: 0.04, spread: 0.00015, fundingRate8h: 0.003 }),
  fxInstrument({ id: 'eur-jpy', name: 'Евро / японская иена', symbol: 'EUR/JPY', ticker: 'EUR/JPY', subCategory: 'Кросс-пары', currentPrice: 160.78, change24h: -0.13, pricePrecision: 3, spread: 0.012, fundingRate8h: 0.004 }),
  fxInstrument({ id: 'gbp-jpy', name: 'Фунт стерлингов / японская иена', symbol: 'GBP/JPY', ticker: 'GBP/JPY', subCategory: 'Кросс-пары', currentPrice: 187.54, change24h: -0.06, pricePrecision: 3, spread: 0.018, fundingRate8h: 0.004 }),
  fxInstrument({ id: 'usd-cnh', name: 'Доллар США / китайский юань', symbol: 'USD/CNH', ticker: 'USD/CNH', subCategory: 'Азия', currentPrice: 7.2318, change24h: 0.05, pricePrecision: 4, spread: 0.0006, fundingRate8h: 0.005 }),
  fxInstrument({ id: 'usd-mxn', name: 'Доллар США / мексиканский песо', symbol: 'USD/MXN', ticker: 'USD/MXN', subCategory: 'Америка', currentPrice: 18.4125, change24h: -0.17, pricePrecision: 4, spread: 0.009, fundingRate8h: 0.006 }),

  // ==================== 3. COMMODITIES — Сырьё и товары ====================
  commodityInstrument({ id: 'xau-usd', name: 'Золото', symbol: 'XAU/USD', ticker: 'XAU/USD', currentPrice: 2392.18, change24h: 0.63, spread: 0.3, fundingRate8h: 0.005 }),
  commodityInstrument({ id: 'xag-usd', name: 'Серебро', symbol: 'XAG/USD', ticker: 'XAG/USD', currentPrice: 28.14, change24h: 1.21, minPositionUsd: 20, spread: 0.02, fundingRate8h: 0.006 }),
  commodityInstrument({ id: 'wti', name: 'Нефть WTI', symbol: 'WTI', ticker: 'WTI', network: 'Commodities', subCategory: 'Энергия', currentPrice: 78.32, change24h: 0.48, spread: 0.03, fundingRate8h: 0.008 }),
  commodityInstrument({ id: 'brent', name: 'Нефть Brent', symbol: 'BRENT', ticker: 'BRENT', subCategory: 'Энергия', currentPrice: 82.71, change24h: 0.52, spread: 0.04, fundingRate8h: 0.008 }),
  commodityInstrument({ id: 'natgas', name: 'Природный газ', symbol: 'NATGAS', ticker: 'NATGAS', subCategory: 'Энергия', currentPrice: 2.68, change24h: -1.34, pricePrecision: 3, minPositionUsd: 20, maxLeverage: 5, spread: 0.01, fundingRate8h: 0.01 }),
  commodityInstrument({ id: 'copper', name: 'Медь', symbol: 'COPPER', ticker: 'COPPER', subCategory: 'Металлы', currentPrice: 4.21, change24h: 0.73, pricePrecision: 3, minPositionUsd: 20, spread: 0.01, fundingRate8h: 0.006 }),
  commodityInstrument({ id: 'platinum', name: 'Платина', symbol: 'PLATINUM', ticker: 'PLATINUM', subCategory: 'Металлы', currentPrice: 931.4, change24h: 0.36, spread: 0.5, fundingRate8h: 0.005 }),
  commodityInstrument({ id: 'palladium', name: 'Палладий', symbol: 'PALLADIUM', ticker: 'PALLADIUM', subCategory: 'Металлы', currentPrice: 1032.5, change24h: -0.42, spread: 0.5, fundingRate8h: 0.006 }),
  commodityInstrument({ id: 'corn', name: 'Кукуруза', symbol: 'CORN', ticker: 'CORN', subCategory: 'С/Х товары', currentPrice: 4.36, change24h: 0.21, pricePrecision: 3, minPositionUsd: 20, maxLeverage: 5, spread: 0.01, fundingRate8h: 0.008 }),
  commodityInstrument({ id: 'wheat', name: 'Пшеница', symbol: 'WHEAT', ticker: 'WHEAT', subCategory: 'С/Х товары', currentPrice: 5.72, change24h: 0.18, pricePrecision: 3, minPositionUsd: 20, maxLeverage: 5, spread: 0.02, fundingRate8h: 0.008 }),
  commodityInstrument({ id: 'soybean', name: 'Соя', symbol: 'SOYBEAN', ticker: 'SOYBEAN', subCategory: 'С/Х товары', currentPrice: 11.82, change24h: 0.39, minPositionUsd: 20, maxLeverage: 5, spread: 0.02, fundingRate8h: 0.008 }),
  commodityInstrument({ id: 'cocoa', name: 'Какао', symbol: 'COCOA', ticker: 'COCOA', subCategory: 'С/Х товары', currentPrice: 8431.0, change24h: -1.12, maxLeverage: 5, spread: 5, fundingRate8h: 0.01 }),

  // ==================== 4. STOCKS — Акции ====================
  stockInstrument({ id: 'aapl', name: 'Apple', symbol: 'AAPL', ticker: 'AAPL', subCategory: 'Технологии', currentPrice: 186.52, change24h: 1.24, spread: 0.05, fundingRate8h: 0.004 }),
  stockInstrument({ id: 'nvda', name: 'NVIDIA', symbol: 'NVDA', ticker: 'NVDA', subCategory: 'Технологии', currentPrice: 875.62, change24h: 2.31, spread: 0.2, fundingRate8h: 0.006 }),
  stockInstrument({ id: 'tsla', name: 'Tesla', symbol: 'TSLA', ticker: 'TSLA', subCategory: 'Автомобили', currentPrice: 248.32, change24h: -2.18, spread: 0.1, fundingRate8h: 0.006 }),
  stockInstrument({ id: 'msft', name: 'Microsoft', symbol: 'MSFT', ticker: 'MSFT', subCategory: 'Технологии', currentPrice: 410.17, change24h: 0.95, spread: 0.1, fundingRate8h: 0.004 }),
  stockInstrument({ id: 'amzn', name: 'Amazon', symbol: 'AMZN', ticker: 'AMZN', subCategory: 'Электронная коммерция', currentPrice: 178.43, change24h: 1.36, spread: 0.05, fundingRate8h: 0.004 }),
  stockInstrument({ id: 'googl', name: 'Alphabet (Google)', symbol: 'GOOGL', ticker: 'GOOGL', subCategory: 'Технологии', currentPrice: 159.21, change24h: 1.02, spread: 0.05, fundingRate8h: 0.004 }),
  stockInstrument({ id: 'meta', name: 'Meta Platforms', symbol: 'META', ticker: 'META', subCategory: 'Технологии', currentPrice: 514.28, change24h: 1.45, spread: 0.1, fundingRate8h: 0.005 }),
  stockInstrument({ id: 'amd', name: 'AMD', symbol: 'AMD', ticker: 'AMD', subCategory: 'Полупроводники', currentPrice: 169.44, change24h: 2.05, spread: 0.05, fundingRate8h: 0.005 }),
  stockInstrument({ id: 'nflx', name: 'Netflix', symbol: 'NFLX', ticker: 'NFLX', subCategory: 'Медиа', currentPrice: 631.18, change24h: -0.82, spread: 0.15, fundingRate8h: 0.005 }),
  stockInstrument({ id: 'coin', name: 'Coinbase', symbol: 'COIN', ticker: 'COIN', subCategory: 'Крипто-финансы', currentPrice: 214.55, change24h: 3.18, spread: 0.12, fundingRate8h: 0.007 }),
  stockInstrument({ id: 'pltr', name: 'Palantir', symbol: 'PLTR', ticker: 'PLTR', subCategory: 'ПО и аналитика', currentPrice: 62.35, change24h: 2.64, spread: 0.03, fundingRate8h: 0.006 }),
  stockInstrument({ id: 'avgo', name: 'Broadcom', symbol: 'AVGO', ticker: 'AVGO', subCategory: 'Полупроводники', currentPrice: 132.48, change24h: 1.72, spread: 0.08, fundingRate8h: 0.005 }),

  // ==================== 5. INDICES — Фондовые индексы ====================
  indexInstrument({ id: 'spx', name: 'S&P 500', symbol: 'SPX', ticker: 'SPX', currentPrice: 5210.32, change24h: 0.73, spread: 0.5, fundingRate8h: 0.005 }),
  indexInstrument({ id: 'ndx', name: 'Nasdaq 100', symbol: 'NDX', ticker: 'NDX', currentPrice: 18452.61, change24h: 0.92, spread: 1, fundingRate8h: 0.006 }),
  indexInstrument({ id: 'dji', name: 'Dow Jones Industrial Average', symbol: 'DJI', ticker: 'DJI', currentPrice: 38742.18, change24h: 0.61, spread: 1.25, fundingRate8h: 0.005 }),
  indexInstrument({ id: 'rut', name: 'Russell 2000', symbol: 'RUT', ticker: 'RUT', currentPrice: 2043.55, change24h: 0.44, spread: 0.6, fundingRate8h: 0.006, maxLeverage: 5 }),
  indexInstrument({ id: 'dax', name: 'DAX 40', symbol: 'DAX', ticker: 'DAX', subCategory: 'Европа', currentPrice: 17921.36, change24h: 0.48, spread: 1, fundingRate8h: 0.005 }),
  indexInstrument({ id: 'uk100', name: 'FTSE 100', symbol: 'UK100', ticker: 'UK100', subCategory: 'Европа', currentPrice: 7683.21, change24h: 0.37, spread: 0.75, fundingRate8h: 0.004 }),
  indexInstrument({ id: 'cac40', name: 'CAC 40', symbol: 'CAC40', ticker: 'CAC40', subCategory: 'Европа', currentPrice: 7842.53, change24h: 0.42, spread: 0.7, fundingRate8h: 0.004 }),
  indexInstrument({ id: 'sx5e', name: 'EURO STOXX 50', symbol: 'SX5E', ticker: 'SX5E', subCategory: 'Европа', currentPrice: 4891.17, change24h: 0.51, spread: 0.5, fundingRate8h: 0.004 }),
  indexInstrument({ id: 'ni225', name: 'Nikkei 225', symbol: 'NI225', ticker: 'NI225', subCategory: 'Азия', currentPrice: 39121.44, change24h: 0.86, spread: 2, fundingRate8h: 0.005 }),
  indexInstrument({ id: 'hsi', name: 'Hang Seng', symbol: 'HSI', ticker: 'HSI', subCategory: 'Азия', currentPrice: 16432.18, change24h: 1.12, spread: 1.5, fundingRate8h: 0.006 }),
  indexInstrument({ id: 'nifty', name: 'Nifty 50', symbol: 'NIFTY', ticker: 'NIFTY', subCategory: 'Азия', currentPrice: 24518.35, change24h: 0.58, spread: 1.75, fundingRate8h: 0.005 }),
  indexInstrument({ id: 'asx200', name: 'ASX 200', symbol: 'ASX200', ticker: 'ASX200', subCategory: 'Азия', currentPrice: 7621.58, change24h: 0.29, spread: 0.75, fundingRate8h: 0.004 }),
];

// ---------------------------------------------------------------------------
// Lookups & formatting used across the Trade Pro UI and the admin catalog.
// ---------------------------------------------------------------------------

export const MARKET_BY_ID: Record<MarketCategory, TradingMarket> = TRADING_MARKETS.reduce(
  (acc, m) => ({ ...acc, [m.id]: m }),
  {} as Record<MarketCategory, TradingMarket>
);

const INSTRUMENT_BY_ID = new Map(TRADING_INSTRUMENTS.map((i) => [i.id, i]));
const INSTRUMENT_BY_TICKER = new Map(TRADING_INSTRUMENTS.map((i) => [i.ticker.toUpperCase(), i]));

export const instrumentCount = (market: MarketCategory) =>
  TRADING_INSTRUMENTS.filter((i) => i.category === market).length;

/**
 * Precision used for rows the operator added by hand (no catalog entry): infer
 * it from the price magnitude so Forex and sub-cent crypto still render sane.
 */
export function inferPricePrecision(price: number): number {
  if (!isFinite(price) || price <= 0) return 2;
  if (price >= 1000) return 2;
  if (price >= 10) return 2;
  if (price >= 1) return 4;
  return 5;
}

/**
 * A server/admin catalog row may be a plain asset without market metadata.
 * Resolve the missing design fields from the static catalog by id or ticker.
 */
export function resolveInstrument(asset: StakingProAsset): TradingInstrument {
  const byId = INSTRUMENT_BY_ID.get(asset.id);
  const byTicker = INSTRUMENT_BY_TICKER.get(String(asset.ticker || asset.symbol).toUpperCase());
  const meta = byId || byTicker;

  const category = (asset.category || meta?.category || 'crypto') as MarketCategory;
  const pricePrecision =
    asset.pricePrecision ?? meta?.pricePrecision ?? inferPricePrecision(asset.currentPrice);
  const market = MARKET_BY_ID[category];

  return {
    ...meta,
    ...asset,
    category,
    pricePrecision,
    ticker: asset.ticker || meta?.ticker || `${asset.symbol}/${TRADE_QUOTE_ASSET}`,
    subCategory: asset.subCategory || meta?.subCategory || 'Все',
    // Live price always wins over the catalog snapshot.
    currentPrice: asset.currentPrice || meta?.currentPrice || 0,
    change24h: asset.change24h ?? meta?.change24h ?? 0,
    network: asset.network || meta?.network || market.title,
    productType: asset.productType || meta?.productType || market.productType,
    tradingHours: asset.tradingHours || meta?.tradingHours || market.tradingHours,
  } as TradingInstrument;
}

/** Price with the instrument's own number of decimals (Forex needs 3-5). */
export function formatInstrumentPrice(value: number, precision: number): string {
  if (!isFinite(value)) return '—';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

/** step= attribute for a price input bound to an instrument. */
export function priceStep(precision: number): string {
  return (1 / 10 ** precision).toFixed(precision);
}

/** Leverage ladder capped by the instrument, keeping the cap itself visible. */
export function leverageStepsFor(maxLeverage: number): number[] {
  const ladder = [1, 2, 3, 5, 10, 20, 25, 50].filter((s) => s <= maxLeverage);
  if (!ladder.includes(maxLeverage)) ladder.push(maxLeverage);
  return ladder;
}

/** Estimated liquidation price: maintenance margin buffer of 10% of collateral. */
export function estimateLiquidationPrice(
  entryPrice: number,
  leverage: number,
  direction: 'long' | 'short'
): number {
  if (!entryPrice || !leverage) return 0;
  return direction === 'long'
    ? entryPrice * (1 - (1 / leverage) * 0.9)
    : entryPrice * (1 + (1 / leverage) * 0.9);
}

// Backwards compatible alias for the crypto-only list.
export const STAKING_PRO_ASSETS: StakingProAsset[] = TRADING_INSTRUMENTS.filter(
  (i) => i.category === 'crypto'
);

// ---------------------------------------------------------------------------
// VaultSpring Trade Pro — free quote providers for every market (no API keys)
//   • Crypto      → Binance public 24h ticker (12/12 instruments)
//   • Forex       → frankfurter.app (ECB reference rates) — see forexService
//   • Commodities → Yahoo Finance continuous futures (GC=F, CL=F, …)
//   • Stocks      → Yahoo Finance equities
//   • Indices     → Yahoo Finance indices
// Server-side only: Yahoo needs a browser-like User-Agent, so every call goes
// through the Express server, which caches each group independently and keeps
// the last good value when a provider is unreachable.
// ---------------------------------------------------------------------------

export interface ProviderQuote {
  price: number;
  changePercent: number;
}

/** Yahoo/Futures contracts quoted in cents per unit are normalised to dollars. */
interface SymbolSpec {
  symbol: string;
  /** multiplier applied to the raw provider price (default 1) */
  scale?: number;
}

const YAHOO_GROUPS: Record<string, Record<string, SymbolSpec>> = {
  indices: {
    spx: { symbol: '^GSPC' },      // S&P 500
    ndx: { symbol: '^NDX' },       // Nasdaq 100
    dji: { symbol: '^DJI' },       // Dow Jones
    rut: { symbol: '^RUT' },       // Russell 2000
    dax: { symbol: '^GDAXI' },     // DAX 40
    uk100: { symbol: '^FTSE' },    // FTSE 100
    cac40: { symbol: '^FCHI' },    // CAC 40
    sx5e: { symbol: '^STOXX50E' }, // EURO STOXX 50
    ni225: { symbol: '^N225' },    // Nikkei 225
    hsi: { symbol: '^HSI' },       // Hang Seng
    nifty: { symbol: '^NSEI' },    // Nifty 50
    asx200: { symbol: '^AXJO' },   // ASX 200
  },
  stocks: {
    aapl: { symbol: 'AAPL' }, nvda: { symbol: 'NVDA' }, tsla: { symbol: 'TSLA' },
    msft: { symbol: 'MSFT' }, amzn: { symbol: 'AMZN' }, googl: { symbol: 'GOOGL' },
    meta: { symbol: 'META' }, amd: { symbol: 'AMD' }, nflx: { symbol: 'NFLX' },
    coin: { symbol: 'COIN' }, pltr: { symbol: 'PLTR' }, avgo: { symbol: 'AVGO' },
  },
  commodities: {
    'xau-usd': { symbol: 'GC=F' },   // Gold, USD/oz
    'xag-usd': { symbol: 'SI=F' },   // Silver, USD/oz
    wti: { symbol: 'CL=F' },   // WTI crude, USD/bbl
    brent: { symbol: 'BZ=F' }, // Brent crude, USD/bbl
    natgas: { symbol: 'NG=F' },// Natural gas, USD/MMBtu
    copper: { symbol: 'HG=F' },// Copper, USD/lb
    platinum: { symbol: 'PL=F' },
    palladium: { symbol: 'PA=F' },
    corn: { symbol: 'ZC=F', scale: 0.01 },    // cents/bushel → USD/bushel
    wheat: { symbol: 'ZW=F', scale: 0.01 },
    soybean: { symbol: 'ZS=F', scale: 0.01 },
    cocoa: { symbol: 'CC=F' },                // USD/ton
  },
};

// Catalog instrument id → Binance pair (crypto)
const CRYPTO_BINANCE: Record<string, string> = {
  bitcoin: 'BTCUSDT', ethereum: 'ETHUSDT', solana: 'SOLUSDT', bnb: 'BNBUSDT',
  xrp: 'XRPUSDT', doge: 'DOGEUSDT', ada: 'ADAUSDT', avax: 'AVAXUSDT',
  link: 'LINKUSDT', ton: 'TONUSDT', sui: 'SUIUSDT', tron: 'TRXUSDT',
};

const YAHOO_SPARK = 'https://query1.finance.yahoo.com/v7/finance/spark';
const BINANCE_TICKER = 'https://api.binance.com/api/v3/ticker/24hr';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

const CACHE_TTL = 5 * 60 * 1000;
const groupCaches: Record<string, { quotes: Record<string, ProviderQuote>; at: number }> = {};

async function getJson(url: string, timeoutMs = 8000): Promise<any> {
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** One Yahoo request per group so a bad symbol can never break the other markets. */
async function fetchYahooGroup(groupName: string): Promise<Record<string, ProviderQuote>> {
  const cacheKey = `yahoo:${groupName}`;
  const cachedEntry = groupCaches[cacheKey];
  if (cachedEntry && Date.now() - cachedEntry.at < CACHE_TTL) return cachedEntry.quotes;

  const specs = YAHOO_GROUPS[groupName];
  const idBySymbol: Record<string, string> = {};
  Object.entries(specs).forEach(([id, spec]) => { idBySymbol[spec.symbol] = id; });

  const quotes: Record<string, ProviderQuote> = {};
  try {
    const url = `${YAHOO_SPARK}?symbols=${encodeURIComponent(Object.keys(idBySymbol).join(','))}&range=2d&interval=1d`;
    const json = await getJson(url);
    for (const row of json?.spark?.result || []) {
      const id = idBySymbol[row?.symbol];
      const meta = row?.response?.[0]?.meta;
      const raw = Number(meta?.regularMarketPrice);
      if (!id || !Number.isFinite(raw) || raw <= 0) continue;
      const change = Number(meta?.regularMarketChangePercent);
      quotes[id] = {
        price: raw * (specs[id].scale ?? 1),
        changePercent: Number.isFinite(change) ? change : 0,
      };
    }
    if (!Object.keys(quotes).length) console.warn(`[Trade Pro:${groupName}] Yahoo replied without usable quotes`);
  } catch (error) {
    console.warn(`[Trade Pro:${groupName}] Yahoo quotes failed:`, (error as Error).message);
  }

  // Never lose the previous good feed — serve stale rather than empty.
  const next = Object.keys(quotes).length > 0 ? quotes : (cachedEntry?.quotes || {});
  groupCaches[cacheKey] = { quotes: next, at: Date.now() };
  if (Object.keys(next).length) console.log(`[Trade Pro:${groupName}] live quotes: ${Object.keys(next).length}/${Object.keys(specs).length}`);
  return next;
}

async function fetchCryptoGroup(): Promise<Record<string, ProviderQuote>> {
  const cacheKey = 'binance:crypto';
  const cachedEntry = groupCaches[cacheKey];
  if (cachedEntry && Date.now() - cachedEntry.at < CACHE_TTL) return cachedEntry.quotes;

  const quotes: Record<string, ProviderQuote> = {};
  try {
    const pairs = Object.values(CRYPTO_BINANCE);
    const url = `${BINANCE_TICKER}?symbols=${encodeURIComponent(JSON.stringify(pairs))}`;
    const rows = await getJson(url);
    const idByPair: Record<string, string> = {};
    Object.entries(CRYPTO_BINANCE).forEach(([id, pair]) => { idByPair[pair] = id; });
    for (const row of Array.isArray(rows) ? rows : []) {
      const id = idByPair[row?.symbol];
      const price = Number(row?.lastPrice);
      if (!id || !Number.isFinite(price) || price <= 0) continue;
      const change = Number(row?.priceChangePercent);
      quotes[id] = { price, changePercent: Number.isFinite(change) ? change : 0 };
    }
  } catch (error) {
    console.warn('[Trade Pro:crypto] Binance quotes failed:', (error as Error).message);
  }

  const next = Object.keys(quotes).length > 0 ? quotes : (cachedEntry?.quotes || {});
  groupCaches[cacheKey] = { quotes: next, at: Date.now() };
  if (Object.keys(next).length) console.log(`[Trade Pro:crypto] live quotes: ${Object.keys(next).length}/12`);
  return next;
}

/**
 * All provider quotes keyed by catalog instrument id (crypto, stocks,
 * commodities, indices). Forex is derived from ECB rates in forexService and
 * is applied by the caller. Failed groups simply contribute nothing, so the
 * catalog keeps its last known price instead of showing zero.
 */
export async function fetchAllProviderQuotes(): Promise<Record<string, ProviderQuote>> {
  const groups = await Promise.all([
    fetchCryptoGroup(),
    fetchYahooGroup('indices'),
    fetchYahooGroup('stocks'),
    fetchYahooGroup('commodities'),
  ]);
  return groups.reduce((acc, g) => ({ ...acc, ...g }), {} as Record<string, ProviderQuote>);
}

/** Back-compatible alias used by the index-only code path. */
export const fetchIndexRates = () => fetchYahooGroup('indices');

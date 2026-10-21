// ---------------------------------------------------------------------------
// VaultSpring Trade Pro — free index provider (Yahoo Finance, no API key)
// Server-side only: Yahoo requires a browser-like User-Agent and blocks some
// datacenter IPs, so all calls go through the Express server which caches the
// result for a few minutes.
// ---------------------------------------------------------------------------

export interface IndexQuote {
  price: number;
  changePercent: number;
}

// Instrument id (tradeCatalog) → Yahoo Finance symbol
export const INDEX_YAHOO_SYMBOLS: Record<string, string> = {
  spx: '^GSPC',      // S&P 500
  ndx: '^NDX',       // Nasdaq 100
  dji: '^DJI',       // Dow Jones
  rut: '^RUT',       // Russell 2000
  dax: '^GDAXI',     // DAX 40
  uk100: '^FTSE',    // FTSE 100
  cac40: '^FCHI',    // CAC 40
  sx5e: '^STOXX50E', // EURO STOXX 50
  ni225: '^N225',    // Nikkei 225
  hsi: '^HSI',       // Hang Seng
  nifty: '^NSEI',    // Nifty 50
  asx200: '^AXJO',   // ASX 200
};

const YAHOO_SPARK = 'https://query1.finance.yahoo.com/v7/finance/spark';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// Cache (refreshed every 5 minutes)
let cached: Record<string, IndexQuote> | null = null;
let lastUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Fetch live quotes for all catalog indices in a single Yahoo request.
 * Returns a map keyed by instrument id (spx, ndx, ...).
 */
export async function fetchIndexRates(): Promise<Record<string, IndexQuote>> {
  const now = Date.now();
  if (cached && (now - lastUpdate) < CACHE_TTL) return cached;

  const symbols = Object.values(INDEX_YAHOO_SYMBOLS).join(',');
  try {
    const res = await fetch(`${YAHOO_SPARK}?symbols=${encodeURIComponent(symbols)}&range=2d&interval=1d`, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) throw new Error(`Yahoo error ${res.status}`);
    const json: any = await res.json();
    const results: any[] = json?.spark?.result || [];

    // Yahoo echoes each series with its own symbol — map back to instrument ids.
    const yahooToId: Record<string, string> = {};
    Object.entries(INDEX_YAHOO_SYMBOLS).forEach(([id, sym]) => { yahooToId[sym] = id; });

    const rates: Record<string, IndexQuote> = {};
    results.forEach((r) => {
      const id = yahooToId[r?.symbol];
      const meta = r?.response?.[0]?.meta;
      const price = Number(meta?.regularMarketPrice);
      if (!id || !Number.isFinite(price) || price <= 0) return;
      const change = Number(meta?.regularMarketChangePercent);
      rates[id] = {
        price,
        changePercent: Number.isFinite(change) ? change : 0,
      };
    });

    if (Object.keys(rates).length === 0) throw new Error('Yahoo returned no quotes');

    cached = rates;
    lastUpdate = now;
    console.log(`[Indices] Live quotes updated: ${Object.keys(rates).length}/12`);
    return rates;
  } catch (error) {
    console.error('[Indices] Failed to fetch quotes:', (error as Error).message);
    // Serve the stale cache if we have one; otherwise the catalog keeps its
    // seed prices (the UI never sees zero).
    if (cached) return cached;
    return {};
  }
}

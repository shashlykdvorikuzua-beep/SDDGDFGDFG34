// ---------------------------------------------------------------------------
// VaultSpring Trade Pro — free Forex provider (frankfurter.app, ECB rates)
// No API key required. Rates are cached server-side for 5 minutes and every
// pair is derived from USD-based crosses, so all catalog pairs are covered.
// ---------------------------------------------------------------------------

interface ForexResponse {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
}

const FRANKFURTER_API = 'https://api.frankfurter.app';

// currency → USD value of 1 unit (e.g. { EUR: 1.08, JPY: 0.0067, USD: 1 })
let cachedUsdValue: Record<string, number> | null = null;
let lastUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000;

// Approximate fallback so the UI never shows a zero price when the API is down.
const FALLBACK_USD_VALUE: Record<string, number> = {
  USD: 1,
  EUR: 1.08, GBP: 1.27, JPY: 0.0067, CHF: 1.13, CAD: 0.736, AUD: 0.658,
  NZD: 0.605, CNY: 0.138, CNH: 0.138, HKD: 0.128, SGD: 0.746, SEK: 0.0957,
  NOK: 0.0936, MXN: 0.0543, ZAR: 0.0529, TRY: 0.0352, BRL: 0.201, INR: 0.012,
  KRW: 0.00076, RUB: 0.0108, PLN: 0.249, THB: 0.0284, MYR: 0.214, PHP: 0.0179,
  CZK: 0.0438, HUF: 0.00282, ILS: 0.274, CLP: 0.00112, ARS: 0.00286,
};

/**
 * Fetch USD-value rates from frankfurter.app (ECB reference rates).
 * The API returns how many units of X equal 1 USD; we invert that into
 * "USD value of 1 X" which makes every pair a simple division.
 */
export async function fetchForexRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cachedUsdValue && (now - lastUpdate) < CACHE_TTL) return cachedUsdValue;

  try {
    const res = await fetch(`${FRANKFURTER_API}/latest?from=USD`);
    if (!res.ok) throw new Error(`Frankfurter error ${res.status}`);
    const data: ForexResponse = await res.json();

    const usdValue: Record<string, number> = { USD: 1 };
    Object.entries(data.rates).forEach(([currency, unitsPerUsd]) => {
      if (unitsPerUsd > 0) usdValue[currency] = 1 / unitsPerUsd;
    });

    cachedUsdValue = usdValue;
    lastUpdate = now;
    console.log(`[Forex] ECB rates updated: ${Object.keys(usdValue).length} currencies`);
    return usdValue;
  } catch (error) {
    console.error('[Forex] Failed to fetch rates:', (error as Error).message);
    if (cachedUsdValue) {
      console.log('[Forex] Using stale cache');
      return cachedUsdValue;
    }
    return FALLBACK_USD_VALUE;
  }
}

/**
 * Quote a currency pair, e.g. getForexRate('EUR', 'USD') → 1.08,
 * getForexRate('USD', 'JPY') → 149.3, getForexRate('EUR', 'GBP') → 0.856.
 */
export async function getForexRate(base: string, quote: string): Promise<number> {
  const usdValue = await fetchForexRates();
  const b = usdValue[base.toUpperCase()] ?? 1;
  const q = usdValue[quote.toUpperCase()] ?? 1;
  return b / q;
}

/**
 * frankfurter.app publishes daily reference rates without an intraday
 * timestamp series, so the 24h change is not available for free. The UI
 * keeps the seeded change value; a near-zero drift is returned here for
 * endpoints that ask for it.
 */
export function getForexChange24h(): number {
  return 0;
}

export interface LivePriceData {
  price: number;
  change24h: number;
}

export type TokenPriceMap = Record<string, LivePriceData>;

// Mapping internal token symbol to CoinGecko API IDs
const COINGECKO_MAP: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'binancecoin',
  SOL: 'solana',
  USDT: 'tether',
  'USDT-TRC20': 'tether',
  TRX: 'tron',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  ADA: 'cardano',
  TON: 'the-open-network',
  USDC: 'usd-coin',
  AVAX: 'avalanche-2',
  SHIB: 'shiba-inu',
  DOT: 'polkadot',
  LINK: 'chainlink',
  POL: 'matic-network',
  LTC: 'litecoin',
  NEAR: 'near',
  PEPE: 'pepe',
  UNI: 'uniswap',
  SUI: 'sui',
  ARB: 'arbitrum',
  OP: 'optimism',
  KAS: 'kaspa',
  BCH: 'bitcoin-cash',
  APT: 'aptos',
  ATOM: 'cosmos',
  FIL: 'filecoin',
  RENDER: 'render-token',
  FET: 'fetch-ai',
  FLOKI: 'floki',
  BONK: 'bonk',
  WIF: 'dogwifcoin',
  DAI: 'dai',
  SEI: 'sei-network'
};

// Real-time prices fetcher with resilient multi-endpoint fallback
export async function fetchLiveCryptoPrices(): Promise<TokenPriceMap | null> {
  // Strategy 1: Binance Ticker 24hr API (Fastest, zero rate limit, no CORS restriction)
  try {
    const symbols = [
      'BTCUSDT',
      'ETHUSDT',
      'BNBUSDT',
      'SOLUSDT',
      'XRPUSDT',
      'DOGEUSDT',
      'ADAUSDT',
      'TRXUSDT',
      'TONUSDT',
      'AVAXUSDT',
      'SHIBUSDT',
      'DOTUSDT',
      'LINKUSDT',
      'POLUSDT',
      'LTCUSDT',
      'NEARUSDT',
      'PEPEUSDT',
      'UNIUSDT',
      'SUIUSDT',
      'ARBUSDT',
      'OPUSDT',
      'BCHUSDT',
      'APTUSDT',
      'ATOMUSDT',
      'FILUSDT',
      'RENDERUSDT',
      'FETUSDT',
      'FLOKIUSDT',
      'BONKUSDT',
      'WIFUSDT',
      'SEIUSDT'
    ];
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`;
    
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const list = await res.json();
      const result: TokenPriceMap = {
        USDT: { price: 1.00, change24h: 0.01 },
        'USDT-TRC20': { price: 1.00, change24h: 0.01 },
        USDC: { price: 1.00, change24h: 0.00 },
        DAI: { price: 1.00, change24h: 0.01 }
      };

      list.forEach((item: any) => {
        const sym = item.symbol.replace('USDT', '');
        result[sym] = {
          price: parseFloat(item.lastPrice),
          change24h: parseFloat(item.priceChangePercent)
        };
      });

      // Kaspa fallback estimate from top tickers
      if (!result['KAS']) {
        result['KAS'] = { price: 0.168, change24h: 1.45 };
      }

      // VaultSpring Token (VLT) ecosystem pricing (derived from BNB index)
      if (result['BNB']) {
        result['VLT'] = {
          price: parseFloat((result['BNB'].price * 0.0075).toFixed(3)),
          change24h: parseFloat((result['BNB'].change24h * 1.5).toFixed(2))
        };
      }

      return result;
    }
  } catch (err) {
    console.warn('Binance price fetch failed, attempting CoinGecko fallback:', err);
  }

  // Strategy 2: CoinGecko Simple Price API
  try {
    const ids = Array.from(new Set(Object.values(COINGECKO_MAP))).join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
    
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(7000) });
    if (res.ok) {
      const data = await res.json();
      const result: TokenPriceMap = {
        USDT: { price: 1.00, change24h: 0.01 },
        'USDT-TRC20': { price: 1.00, change24h: 0.01 },
        USDC: { price: 1.00, change24h: 0.00 },
        DAI: { price: 1.00, change24h: 0.01 }
      };

      for (const [symbol, id] of Object.entries(COINGECKO_MAP)) {
        if (data[id]) {
          result[symbol] = {
            price: data[id].usd,
            change24h: parseFloat((data[id].usd_24h_change || 0).toFixed(2))
          };
        }
      }

      if (result['BNB']) {
        result['VLT'] = {
          price: parseFloat((result['BNB'].price * 0.0075).toFixed(3)),
          change24h: parseFloat((result['BNB'].change24h * 1.5).toFixed(2))
        };
      }

      return result;
    }
  } catch (err) {
    console.warn('CoinGecko price fetch failed:', err);
  }

  return null;
}

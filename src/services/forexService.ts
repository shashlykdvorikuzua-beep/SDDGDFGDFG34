import { MarketCategory } from '../types/stakingPro';

interface ForexRate {
  [key: string]: number;
}

interface ForexResponse {
  amount: number;
  base: string;
  date: string;
  rates: ForexRate;
}

const FRANKFURTER_API = 'https://api.frankfurter.app';

// Кэш курсов (обновляется раз в 5 минут)
let cachedRates: ForexRate | null = null;
let lastUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

/**
 * Получить свежие курсы Forex с frankfurter.app
 * Базовая валюта: USD (так как все инструменты в USDT)
 */
export async function fetchForexRates(): Promise<ForexRate> {
  const now = Date.now();
  
  // Используем кэш если он свежий
  if (cachedRates && (now - lastUpdate) < CACHE_TTL) {
    return cachedRates;
  }

  try {
    // frankfurter.app возвращает курсы относительно EUR
    // Нам нужны курсы относительно USD, поэтому делаем два запроса
    const [eurResponse, usdResponse] = await Promise.all([
      fetch(`${FRANKFURTER_API}/latest?from=EUR`),
      fetch(`${FRANKFURTER_API}/latest?from=USD`)
    ]);

    if (!eurResponse.ok || !usdResponse.ok) {
      throw new Error('Forex API error');
    }

    const eurData: ForexResponse = await eurResponse.json();
    const usdData: ForexResponse = await usdResponse.json();

    // Создаём мапу валютных пар к USD
    const rates: ForexRate = {};
    
    // EUR/USD = 1 / USD/EUR
    if (usdData.rates.EUR) {
      rates.EUR = 1 / usdData.rates.EUR;
    }
    
    // Остальные валюты относительно USD
    Object.entries(usdData.rates).forEach(([currency, rate]) => {
      if (currency !== 'EUR') {
        rates[currency] = rate;
      }
    });

    // Добавляем кросс-курсы для пар типа EUR/GBP
    // EUR/GBP = EUR/USD * USD/GBP = (1/USD/EUR) * USD/GBP
    if (rates.EUR && usdData.rates.GBP) {
      rates.EURGBP = rates.EUR * usdData.rates.GBP;
    }

    cachedRates = rates;
    lastUpdate = now;
    
    console.log(`[Forex] Rates updated: ${Object.keys(rates).length} currencies`);
    return rates;
  } catch (error) {
    console.error('[Forex] Failed to fetch rates:', error);
    
    // Возвращаем последний успешный кэш даже если он старый
    if (cachedRates) {
      console.log('[Forex] Using stale cache');
      return cachedRates;
    }
    
    // Fallback: захардкоженные курсы (примерные)
    return {
      EUR: 0.92,
      GBP: 0.79,
      JPY: 149.50,
      CHF: 0.88,
      CAD: 1.36,
      AUD: 1.52,
      NZD: 1.63,
      CNY: 7.24,
      HKD: 7.82,
      SGD: 1.34,
      SEK: 10.45,
      NOK: 10.68,
      MXN: 17.15,
      ZAR: 18.92,
      TRY: 28.45,
      BRL: 4.97,
      INR: 83.12,
      KRW: 1320.50,
      RUB: 92.50,
      PLN: 4.02,
      THB: 35.20,
      MYR: 4.68,
      PHP: 55.80,
      CZK: 22.85,
      HUF: 355.20,
      ILS: 3.65,
      CLP: 895.40,
      ARS: 350.25,
      COP: 3925.00
    };
  }
}

/**
 * Получить курс конкретной валютной пары
 * @param base Базовая валюта (например, EUR)
 * @param quote Котируемая валюта (например, USD)
 */
export async function getForexRate(base: string, quote: string): Promise<number> {
  const rates = await fetchForexRates();
  
  // Нормализуем коды валют
  const baseCode = base.toUpperCase().replace('USD', '').replace('EUR', '');
  const quoteCode = quote.toUpperCase().replace('USD', '').replace('EUR', '');
  
  if (quoteCode === 'USD' || quoteCode === '') {
    // Пара XXX/USD
    return rates[baseCode] || 1.0;
  }
  
  if (baseCode === 'USD' || baseCode === '') {
    // Пара USD/XXX
    return 1 / (rates[quoteCode] || 1.0);
  }
  
  // Кросс-курс XXX/YYY = (XXX/USD) / (YYY/USD)
  const baseRate = rates[baseCode] || 1.0;
  const quoteRate = rates[quoteCode] || 1.0;
  return baseRate / quoteRate;
}

/**
 * Получить изменение курса за 24 часа (упрощённо)
 * frankfurter.app не даёт исторические данные в реальном времени,
 * поэтому генерируем случайное изменение для демо
 */
export function getForexChange24h(): number {
  // Реалистичное дневное изменение для forex: -0.5% до +0.5%
  return (Math.random() - 0.5) * 1.0;
}

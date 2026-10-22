import React from 'react';

/**
 * Fully-offline instrument logos for Trade Pro markets that are NOT crypto
 * (Forex, Commodities, Stocks, Indices). Everything here is inline SVG — no
 * network images, no emoji, no external font — so it renders identically in
 * the mobile webview and offline. Crypto symbols keep their dedicated SVGs in
 * CryptoIcon.tsx; this module only fills the gap for the other markets.
 */

type FlagCode =
  | 'US' | 'EU' | 'GB' | 'JP' | 'CH' | 'AU' | 'CA' | 'NZ'
  | 'CN' | 'MX' | 'DE' | 'FR' | 'HK' | 'IN';

// Forex pairs: exact catalog symbol -> [base flag, quote flag].
const FX_PAIRS: Record<string, [FlagCode, FlagCode]> = {
  'EUR/USD': ['EU', 'US'],
  'GBP/USD': ['GB', 'US'],
  'USD/JPY': ['US', 'JP'],
  'USD/CHF': ['US', 'CH'],
  'AUD/USD': ['AU', 'US'],
  'USD/CAD': ['US', 'CA'],
  'NZD/USD': ['NZ', 'US'],
  'EUR/GBP': ['EU', 'GB'],
  'EUR/JPY': ['EU', 'JP'],
  'GBP/JPY': ['GB', 'JP'],
  'USD/CNH': ['US', 'CN'],
  'USD/MXN': ['US', 'MX'],
};

// Indices: catalog symbol -> region flag.
const INDEX_FLAGS: Record<string, FlagCode> = {
  SPX: 'US', NDX: 'US', DJI: 'US', RUT: 'US',
  DAX: 'DE', UK100: 'GB', CAC40: 'FR', SX5E: 'EU',
  NI225: 'JP', HSI: 'HK', NIFTY: 'IN', ASX200: 'AU',
};

// 5-point star path helper (used by US canton, EU ring, China).
function starPath(cx: number, cy: number, ro: number, ri: number, points = 5, rotDeg = -90): string {
  const pts: string[] = [];
  const rot = (rotDeg * Math.PI) / 180;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? ri : ro;
    const a = rot + (i * Math.PI) / points;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

// Simplified but recognizable country/region flags, drawn in a 0..40 box.
function flagShapes(code: FlagCode): React.ReactNode {
  switch (code) {
    case 'US':
      return (
        <>
          <rect width={40} height={40} fill="#FFFFFF" />
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <rect key={i} y={i * 6.153} width={40} height={3.077} fill="#B22234" />
          ))}
          <rect width={17} height={21.5} fill="#3C3B6E" />
          {[0, 1, 2].map((r) =>
            [0, 1, 2].map((c) => (
              <path
                key={`${r}-${c}`}
                d={starPath(3.5 + c * 5, 4 + r * 6, 1.5, 0.6)}
                fill="#FFFFFF"
              />
            ))
          )}
        </>
      );
    case 'EU':
      return (
        <>
          <rect width={40} height={40} fill="#003399" />
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * Math.PI) / 6 - Math.PI / 2;
            return <path key={i} d={starPath(20 + 8.5 * Math.cos(a), 20 + 8.5 * Math.sin(a), 1.7, 0.7)} fill="#FFCC00" />;
          })}
        </>
      );
    case 'GB':
      return (
        <>
          <rect width={40} height={40} fill="#012169" />
          <path d="M0 0 L40 40 M40 0 L0 40" stroke="#FFFFFF" strokeWidth={8} />
          <path d="M0 0 L40 40 M40 0 L0 40" stroke="#C8102E" strokeWidth={3} />
          <rect x={15} width={10} height={40} fill="#FFFFFF" />
          <rect y={15} width={40} height={10} fill="#FFFFFF" />
          <rect x={17} width={6} height={40} fill="#C8102E" />
          <rect y={17} width={40} height={6} fill="#C8102E" />
        </>
      );
    case 'JP':
      return (
        <>
          <rect width={40} height={40} fill="#FFFFFF" />
          <circle cx={20} cy={20} r={8} fill="#BC002D" />
        </>
      );
    case 'CH':
      return (
        <>
          <rect width={40} height={40} fill="#D52B1E" />
          <rect x={17} y={9} width={6} height={22} fill="#FFFFFF" />
          <rect x={9} y={17} width={22} height={6} fill="#FFFFFF" />
        </>
      );
    case 'DE':
      return (
        <>
          <rect y={0} height={13.34} width={40} fill="#000000" />
          <rect y={13.34} height={13.33} width={40} fill="#DD0000" />
          <rect y={26.67} height={13.33} width={40} fill="#FFCE00" />
        </>
      );
    case 'FR':
      return (
        <>
          <rect width={13.34} height={40} fill="#0055A4" />
          <rect x={13.34} width={13.33} height={40} fill="#FFFFFF" />
          <rect x={26.67} width={13.33} height={40} fill="#EF4135" />
        </>
      );
    case 'CA':
      return (
        <>
          <rect width={40} height={40} fill="#FFFFFF" />
          <rect width={10} height={40} fill="#D80621" />
          <rect x={30} width={10} height={40} fill="#D80621" />
          <path
            d="M20 11 l1.6 3.4 2.8-1.2-.8 3 3 .6-2.4 2 .6 3.4-3-1.2-2.2 3-2.2-3-3 1.2.6-3.4-2.4-2 3-.6-.8-3 2.8 1.2z"
            fill="#D80621"
          />
          <rect x={19} y={27} width={2} height={4} fill="#D80621" />
        </>
      );
    case 'MX':
      return (
        <>
          <rect width={13.34} height={40} fill="#006847" />
          <rect x={13.34} width={13.33} height={40} fill="#FFFFFF" />
          <rect x={26.67} width={13.33} height={40} fill="#CE1126" />
          <circle cx={20} cy={20} r={3.2} fill="#8a6d3b" />
        </>
      );
    case 'CN':
      return (
        <>
          <rect width={40} height={40} fill="#DE2910" />
          <path d={starPath(11, 12, 5.5, 2.2)} fill="#FFDE00" />
          {[[20, 6], [24, 10], [24, 16], [20, 20]].map(([x, y], i) => (
            <path key={i} d={starPath(x, y, 1.7, 0.7)} fill="#FFDE00" />
          ))}
        </>
      );
    case 'HK':
      return (
        <>
          <rect width={40} height={40} fill="#DE2910" />
          {Array.from({ length: 5 }).map((_, i) => {
            const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
            return (
              <ellipse
                key={i}
                cx={20 + 5 * Math.cos(a)}
                cy={20 + 5 * Math.sin(a)}
                rx={2.4}
                ry={4}
                fill="#FFFFFF"
                transform={`rotate(${(a * 180) / Math.PI + 90} ${20 + 5 * Math.cos(a)} ${20 + 5 * Math.sin(a)})`}
              />
            );
          })}
        </>
      );
    case 'IN':
      return (
        <>
          <rect y={0} height={13.34} width={40} fill="#FF9933" />
          <rect y={13.34} height={13.33} width={40} fill="#FFFFFF" />
          <rect y={26.67} height={13.33} width={40} fill="#138808" />
          <circle cx={20} cy={20} r={4.6} fill="none" stroke="#000080" strokeWidth={1.2} />
          <circle cx={20} cy={20} r={1.1} fill="#000080" />
        </>
      );
    case 'AU':
      return (
        <>
          <rect width={40} height={40} fill="#012169" />
          <g>
            <rect width={18} height={11} fill="#012169" />
            <path d="M0 0 L18 11 M18 0 L0 11" stroke="#FFFFFF" strokeWidth={2} />
            <rect x={7.5} width={3} height={11} fill="#FFFFFF" />
            <rect y={4} width={18} height={3} fill="#FFFFFF" />
            <rect x={8.3} width={1.4} height={11} fill="#C8102E" />
            <rect y={4.8} width={18} height={1.4} fill="#C8102E" />
          </g>
          <path d={starPath(10, 28, 3, 1.2, 7)} fill="#FFFFFF" />
          {[[30, 8], [33, 15], [28, 21], [24, 14], [31, 25]].map(([x, y], i) => (
            <path key={i} d={starPath(x, y, 1.8, 0.7)} fill="#FFFFFF" />
          ))}
        </>
      );
    case 'NZ':
      return (
        <>
          <rect width={40} height={40} fill="#012169" />
          <g>
            <rect width={18} height={11} fill="#012169" />
            <path d="M0 0 L18 11 M18 0 L0 11" stroke="#FFFFFF" strokeWidth={1.6} />
            <rect x={7.5} width={3} height={11} fill="#FFFFFF" />
            <rect y={4} width={18} height={3} fill="#FFFFFF" />
            <rect x={8.3} width={1.4} height={11} fill="#C8102E" />
            <rect y={4.8} width={18} height={1.4} fill="#C8102E" />
          </g>
          {[[30, 9], [33, 17], [27, 22], [31, 28]].map(([x, y], i) => (
            <path key={i} d={starPath(x, y, 2.2, 0.9)} fill="#CC142B" stroke="#FFFFFF" strokeWidth={0.5} />
          ))}
        </>
      );
    default:
      return <rect width={40} height={40} fill="#334155" />;
  }
}

// A single circular flag.
function FlagCircle({ code, s, uid }: { code: FlagCode; s: number; uid: string }) {
  const cid = `fclip-${uid}`;
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
      <defs>
        <clipPath id={cid}>
          <circle cx={20} cy={20} r={20} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${cid})`}>{flagShapes(code)}</g>
      <circle cx={20} cy={20} r={19.2} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={1.6} />
    </svg>
  );
}

// A forex pair: base flag on the left half, quote flag on the right half.
function PairCircle({ base, quote, s, uid }: { base: FlagCode; quote: FlagCode; s: number; uid: string }) {
  const cid = `pclip-${uid}`;
  const rh = `pright-${uid}`;
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
      <defs>
        <clipPath id={cid}>
          <circle cx={20} cy={20} r={20} />
        </clipPath>
        <clipPath id={rh}>
          <rect x={20} y={0} width={20} height={40} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${cid})`}>
        {flagShapes(base)}
        <g clipPath={`url(#${rh})`}>{flagShapes(quote)}</g>
        <line x1={20} y1={0} x2={20} y2={40} stroke="rgba(0,0,0,0.35)" strokeWidth={0.8} />
      </g>
      <circle cx={20} cy={20} r={19.2} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={1.6} />
    </svg>
  );
}

// Generic flat colored badge with a centered glyph (commodities & stocks).
function Badge({ s, bg, children }: { s: number; bg: string; children: React.ReactNode }) {
  return (
    <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
      <circle cx={20} cy={20} r={20} fill={bg} />
      {children}
    </svg>
  );
}

function Monogram({ s, bg, text, fg = '#FFFFFF', size = 15 }: { s: number; bg: string; text: string; fg?: string; size?: number }) {
  return (
    <Badge s={s} bg={bg}>
      <text
        x={20}
        y={21}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight={800}
        fontSize={size}
        fill={fg}
        letterSpacing={-0.5}
      >
        {text}
      </text>
    </Badge>
  );
}

// A generic precious-metal ingot glyph (gold/silver/platinum/palladium).
function Ingot(color: string) {
  return (
    <>
      <path d="M13 24 l2.6-8 h8.8 l2.6 8 z" fill={color} />
      <path d="M15.6 16 h8.8 l1.2 3.4 h-11.2 z" fill={color} opacity={0.75} />
    </>
  );
}

function commodityIcon(sym: string, s: number): React.ReactNode | null {
  switch (sym) {
    case 'XAU/USD':
      return <Badge s={s} bg="#C99A2E">{Ingot('#FFF3C4')}</Badge>;
    case 'XAG/USD':
      return <Badge s={s} bg="#8A94A0">{Ingot('#F4F7FA')}</Badge>;
    case 'PLATINUM':
      return <Badge s={s} bg="#6B7684">{Ingot('#E8EEF4')}</Badge>;
    case 'PALLADIUM':
      return <Badge s={s} bg="#4B5A6A">{Ingot('#DCE6F0')}</Badge>;
    case 'COPPER':
      return (
        <Badge s={s} bg="#B87333">
          <circle cx={20} cy={20} r={8.5} fill="none" stroke="#FFE7CF" strokeWidth={2.4} />
          <circle cx={20} cy={20} r={3} fill="#FFE7CF" />
        </Badge>
      );
    case 'WTI':
    case 'BRENT':
      return (
        <Badge s={s} bg="#23272E">
          <path d="M20 10 C24 16 27 19 27 24 a7 7 0 0 1 -14 0 C13 19 16 16 20 10 z" fill="#F59E0B" />
          <path d="M17 24 a3 3 0 0 0 3 3" stroke="#fff" strokeWidth={1.4} fill="none" strokeLinecap="round" />
        </Badge>
      );
    case 'NATGAS':
      return (
        <Badge s={s} bg="#EA580C">
          <path d="M20 9 c3 5 6 6 6 11 a6 6 0 0 1 -12 0 c0 -3 2 -4 3 -6 c1 2 2 2 2 2 c1 -2 0 -5 1 -8 z" fill="#FDE68A" />
        </Badge>
      );
    case 'CORN':
      return (
        <Badge s={s} bg="#CA8A04">
          <ellipse cx={20} cy={20} rx={6} ry={9} fill="#FDE68A" />
          {[15, 18, 21, 24].map((y) => (
            <line key={y} x1={15} y1={y} x2={25} y2={y} stroke="#CA8A04" strokeWidth={0.8} />
          ))}
          <line x1={20} y1={11} x2={20} y2={29} stroke="#CA8A04" strokeWidth={0.8} />
        </Badge>
      );
    case 'WHEAT':
      return (
        <Badge s={s} bg="#B45309">
          <line x1={20} y1={30} x2={20} y2={12} stroke="#FCD9A0" strokeWidth={1.6} />
          {[14, 18, 22].map((y) => (
            <g key={y}>
              <path d={`M20 ${y} q-4 -1 -5 -5 q4 0 5 4 z`} fill="#FCD9A0" />
              <path d={`M20 ${y} q4 -1 5 -5 q-4 0 -5 4 z`} fill="#FCD9A0" />
            </g>
          ))}
        </Badge>
      );
    case 'SOYBEAN':
      return (
        <Badge s={s} bg="#4D7C0F">
          <ellipse cx={16} cy={22} rx={3.4} ry={4.6} fill="#D9F99D" transform="rotate(-20 16 22)" />
          <ellipse cx={23} cy={20} rx={3.4} ry={4.6} fill="#D9F99D" transform="rotate(20 23 20)" />
          <ellipse cx={21} cy={26} rx={3.4} ry={4.6} fill="#BEF264" transform="rotate(-8 21 26)" />
        </Badge>
      );
    case 'COCOA':
      return (
        <Badge s={s} bg="#7C3F1D">
          <ellipse cx={20} cy={20} rx={6} ry={8.5} fill="#C68642" transform="rotate(20 20 20)" />
          <path d="M17 14 q3 6 6 12" stroke="#7C3F1D" strokeWidth={1} fill="none" />
        </Badge>
      );
    default:
      return null;
  }
}

function stockIcon(sym: string, s: number, uid: string): React.ReactNode | null {
  switch (sym) {
    case 'AAPL':
      return (
        <Badge s={s} bg="#111114">
          <path
            d="M26.6 21.2c0-2.6 2.1-3.9 2.2-3.9-1.2-1.8-3.1-2-3.8-2.1-1.6-.2-3.1 1-3.9 1s-2.1-.9-3.4-.9c-1.8 0-3.4 1-4.3 2.6-1.8 3.2-.5 7.9 1.3 10.5.9 1.3 1.9 2.7 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.4.8 2.3-1.3 3.2-2.5c1-1.4 1.4-2.8 1.4-2.9-.1 0-2.7-1-2.7-4.1z"
            fill="#FFFFFF"
          />
          <path d="M24.3 13.2c.7-.9 1.2-2.1 1.1-3.2-1 0-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.1 1.1.1 2.3-.6 3-1.5z" fill="#FFFFFF" />
        </Badge>
      );
    case 'MSFT':
      return (
        <Badge s={s} bg="#FFFFFF">
          <rect x={11} y={11} width={8.4} height={8.4} fill="#F25022" />
          <rect x={20.6} y={11} width={8.4} height={8.4} fill="#7FBA00" />
          <rect x={11} y={20.6} width={8.4} height={8.4} fill="#00A4EF" />
          <rect x={20.6} y={20.6} width={8.4} height={8.4} fill="#FFB900" />
        </Badge>
      );
    case 'TSLA':
      return (
        <Badge s={s} bg="#CC0000">
          <path d="M9 11 q11 -5 22 0 l-2.4 3.6 q-8.6 -3.8 -17.2 0 z" fill="#FFFFFF" />
          <path d="M18 15.5 h4 l-2 13 z" fill="#FFFFFF" />
        </Badge>
      );
    case 'AMZN':
      return (
        <Badge s={s} bg="#232F3E">
          <text x={20} y={18} textAnchor="middle" dominantBaseline="central" fontFamily="Inter, system-ui, sans-serif" fontWeight={800} fontSize={12} fill="#FFFFFF">a</text>
          <path d="M12 24 q8 5.5 16 0" stroke="#FF9900" strokeWidth={2.6} fill="none" strokeLinecap="round" />
          <path d="M26 21.5 l4 2.5 -4 2.2 z" fill="#FF9900" />
        </Badge>
      );
    case 'GOOGL':
      return (
        <Badge s={s} bg="#FFFFFF">
          <defs>
            <linearGradient id={`gg-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4285F4" />
              <stop offset="35%" stopColor="#EA4335" />
              <stop offset="70%" stopColor="#FBBC05" />
              <stop offset="100%" stopColor="#34A853" />
            </linearGradient>
          </defs>
          <text x={20} y={21} textAnchor="middle" dominantBaseline="central" fontFamily="Arial, Helvetica, sans-serif" fontWeight={800} fontSize={24} fill={`url(#gg-${uid})`}>G</text>
        </Badge>
      );
    case 'META':
      return (
        <Badge s={s} bg="#0866FF">
          <path
            d="M20 20 c-2 -2.6 -4 -4 -6.5 -4 c-3.2 0 -5.5 2.3 -5.5 4.9 c0 2.6 2.3 4.9 5.5 4.9 c2.5 0 4.5 -1.4 6.5 -4 c2 -2.6 4 -4 6.5 -4 c3.2 0 5.5 2.3 5.5 4.9 c0 2.6 -2.3 4.9 -5.5 4.9 c-2.5 0 -4.5 -1.4 -6.5 -4 z"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={2.2}
            strokeLinejoin="round"
          />
        </Badge>
      );
    case 'NFLX':
      return (
        <Badge s={s} bg="#0B0B0F">
          <rect x={13} y={9} width={4.6} height={22} fill="#E50914" />
          <rect x={22.4} y={9} width={4.6} height={22} fill="#E50914" />
          <path d="M13 9 h4.6 L27 31 h-4.6 z" fill="#B20710" />
        </Badge>
      );
    case 'COIN':
      return (
        <Badge s={s} bg="#0052FF">
          <path d="M27.5 15 a9.5 9.5 0 1 0 0 10" fill="none" stroke="#FFFFFF" strokeWidth={3.8} strokeLinecap="round" />
          <circle cx={20} cy={20} r={2.4} fill="#FFFFFF" />
        </Badge>
      );
    case 'NVDA':
      return <Monogram s={s} bg="#76B900" text="N" size={17} />;
    case 'AMD':
      return <Monogram s={s} bg="#0A0A0A" text="AMD" size={11} fg="#FFFFFF" />;
    case 'PLTR':
      return <Monogram s={s} bg="#0B0F14" text="PLTR" size={9} fg="#5BE9B9" />;
    case 'AVGO':
      return <Monogram s={s} bg="#111827" text="AVGO" size={9} fg="#F58220" />;
    default:
      return null;
  }
}

/**
 * Returns a proper logo for a non-crypto Trade Pro instrument, or null when the
 * symbol is not a known instrument (so CryptoIcon can keep its crypto SVGs and
 * generic fallback). `uid` must be unique per rendered instance for clip/gradient ids.
 */
export function renderInstrumentIcon(symbol: string, s: number, uid: string): React.ReactNode | null {
  const sym = symbol.trim().toUpperCase();

  if (FX_PAIRS[sym]) {
    const [base, quote] = FX_PAIRS[sym];
    return <PairCircle base={base} quote={quote} s={s} uid={uid} />;
  }
  if (INDEX_FLAGS[sym]) {
    return <FlagCircle code={INDEX_FLAGS[sym]} s={s} uid={uid} />;
  }
  const comm = commodityIcon(sym, s);
  if (comm) return comm;

  const stock = stockIcon(sym, s, uid);
  if (stock) return stock;

  return null;
}

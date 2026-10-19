import React, { useState } from 'react';

interface PriceChartProps {
  data: number[];
  basePrice: number;
  change24h: number;
  symbol: string;
}

export const PriceChart: React.FC<PriceChartProps> = ({
  data,
  basePrice,
  change24h,
  symbol
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1H' | '24H' | '1W' | '1M' | '1Y' | 'ALL'>('24H');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Generate extended chart data points for chosen timeframe
  const points = React.useMemo(() => {
    let multiplier = 1;
    let count = 24;
    switch (selectedTimeframe) {
      case '1H':
        multiplier = 0.005;
        count = 12;
        break;
      case '24H':
        multiplier = 0.03;
        count = 24;
        break;
      case '1W':
        multiplier = 0.09;
        count = 28;
        break;
      case '1M':
        multiplier = 0.18;
        count = 30;
        break;
      case '1Y':
        multiplier = 0.45;
        count = 36;
        break;
      case 'ALL':
        multiplier = 0.85;
        count = 40;
        break;
    }

    const arr: number[] = [];
    const isPositive = change24h >= 0;
    const startPrice = isPositive ? basePrice * (1 - multiplier) : basePrice * (1 + multiplier);
    
    for (let i = 0; i < count; i++) {
      const progress = i / (count - 1);
      // smooth wave with trend
      const trend = isPositive 
        ? startPrice + (basePrice - startPrice) * progress 
        : startPrice - (startPrice - basePrice) * progress;
      const noise = Math.sin(i * 1.3) * (basePrice * multiplier * 0.3) + Math.cos(i * 0.8) * (basePrice * multiplier * 0.15);
      const val = Math.max(0.00001, i === count - 1 ? basePrice : trend + noise);
      arr.push(val);
    }
    return arr;
  }, [basePrice, change24h, selectedTimeframe]);

  const minVal = Math.min(...points);
  const maxVal = Math.max(...points);
  const range = maxVal - minVal || 1;

  const width = 340;
  const height = 160;
  const padY = 16;
  const effectiveHeight = height - padY * 2;

  const coordinates = points.map((p, idx) => {
    const x = (idx / (points.length - 1)) * width;
    const y = padY + effectiveHeight - ((p - minVal) / range) * effectiveHeight;
    return { x, y, value: p };
  });

  const pathD = coordinates.reduce((acc, curr, idx) => {
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
  }, '');

  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  const isGreen = change24h >= 0;
  const strokeColor = isGreen ? '#0ECB81' : '#F6465D';
  const currentPrice = hoverIndex !== null ? coordinates[hoverIndex].value : basePrice;

  return (
    <div className="w-full flex flex-col items-center">
      {/* Current Scrubber Price */}
      <div className="w-full text-center mb-2">
        <div className="text-3xl font-bold text-white tracking-tight font-mono tabular-nums">
          ${currentPrice >= 1 ? currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : currentPrice.toFixed(4)}
        </div>
        <div className={`text-xs font-semibold mt-1 flex items-center justify-center gap-1 ${isGreen ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
          <span>{isGreen ? '▲' : '▼'}</span>
          <span>{Math.abs(change24h)}% ({selectedTimeframe})</span>
        </div>
      </div>

      {/* SVG Chart */}
      <div 
        className="relative w-full h-[160px] cursor-crosshair select-none my-2"
        onMouseLeave={() => setHoverIndex(null)}
      >
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-full overflow-visible"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = Math.max(0, Math.min(width, (e.clientX - rect.left) * (width / rect.width)));
            const index = Math.round((mouseX / width) * (points.length - 1));
            setHoverIndex(index);
          }}
          onTouchMove={(e) => {
            if (e.touches[0]) {
              const rect = e.currentTarget.getBoundingClientRect();
              const touchX = Math.max(0, Math.min(width, (e.touches[0].clientX - rect.left) * (width / rect.width)));
              const index = Math.round((touchX / width) * (points.length - 1));
              setHoverIndex(index);
            }
          }}
        >
          <defs>
            <linearGradient id={`grad-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background Area */}
          <path d={areaD} fill={`url(#grad-${symbol})`} />

          {/* Trend Line */}
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover indicator */}
          {hoverIndex !== null && coordinates[hoverIndex] && (
            <g>
              <line
                x1={coordinates[hoverIndex].x}
                y1={0}
                x2={coordinates[hoverIndex].x}
                y2={height}
                stroke="rgba(255, 255, 255, 0.25)"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <circle
                cx={coordinates[hoverIndex].x}
                cy={coordinates[hoverIndex].y}
                r="5"
                fill={strokeColor}
                stroke="#FFFFFF"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Timeframe Selector Pill Tabs */}
      <div className="flex items-center justify-between w-full max-w-xs bg-slate-900/80 p-1 rounded-xl border border-white/5 my-2">
        {(['1H', '24H', '1W', '1M', '1Y', 'ALL'] as const).map((tf) => (
          <button
            key={tf}
            onClick={() => setSelectedTimeframe(tf)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
              selectedTimeframe === tf
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>
    </div>
  );
};

import React from 'react';

interface QRCodeSvgProps {
  value: string;
  size?: number;
  centerLogoSymbol?: string;
  className?: string;
}

// Deterministic Pseudo-QR Generator for consistent, crisp Web3 address codes
export const QRCodeSvg: React.FC<QRCodeSvgProps> = ({
  value,
  size = 200,
  centerLogoSymbol,
  className = ''
}) => {
  // Generate a 25x25 grid based on hash of string
  const gridSize = 25;
  const hashVal = React.useMemo(() => {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }, [value]);

  const cells = React.useMemo(() => {
    const grid: boolean[][] = Array(gridSize)
      .fill(null)
      .map(() => Array(gridSize).fill(false));

    // Finder patterns (top-left, top-right, bottom-left)
    const stampFinder = (startX: number, startY: number) => {
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 7; x++) {
          if (
            y === 0 || y === 6 || x === 0 || x === 6 ||
            (y >= 2 && y <= 4 && x >= 2 && x <= 4)
          ) {
            grid[startY + y][startX + x] = true;
          }
        }
      }
    };

    stampFinder(0, 0);
    stampFinder(gridSize - 7, 0);
    stampFinder(0, gridSize - 7);

    // Timing patterns
    for (let i = 8; i < gridSize - 8; i++) {
      grid[6][i] = i % 2 === 0;
      grid[i][6] = i % 2 === 0;
    }

    // Fill data area pseudorandomly based on value chars
    let charIdx = 0;
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        // Skip finder areas
        const inFinderTL = x < 8 && y < 8;
        const inFinderTR = x >= gridSize - 8 && y < 8;
        const inFinderBL = x < 8 && y >= gridSize - 8;
        // Skip center logo area
        const inCenter = x >= 9 && x <= 15 && y >= 9 && y <= 15;

        if (!inFinderTL && !inFinderTR && !inFinderBL && !inCenter) {
          const charCode = value.charCodeAt(charIdx % value.length);
          const bit = ((charCode * 31 + x * 13 + y * 7 + (hashVal % 97)) % 10) > 4;
          grid[y][x] = bit;
          charIdx++;
        }
      }
    }

    return grid;
  }, [value, hashVal]);

  const cellSize = size / gridSize;

  return (
    <div className={`relative inline-block bg-white p-3 rounded-2xl shadow-xl ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {cells.map((row, y) =>
          row.map((active, x) => {
            if (!active) return null;
            return (
              <rect
                key={`${x}-${y}`}
                x={x * cellSize}
                y={y * cellSize}
                width={cellSize * 0.95}
                height={cellSize * 0.95}
                rx={cellSize * 0.25}
                fill="#0F172A"
              />
            );
          })
        )}
      </svg>

      {centerLogoSymbol && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="w-10 h-10 rounded-full bg-white p-1 shadow-md flex items-center justify-center border border-slate-200">
            <div className="w-full h-full rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {centerLogoSymbol}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

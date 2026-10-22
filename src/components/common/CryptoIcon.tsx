import React, { useId } from 'react';
import { renderInstrumentIcon } from './instrumentIcons';

interface CryptoIconProps {
  symbol: string;
  size?: number;
  className?: string;
  network?: string;
}

export const CryptoIcon: React.FC<CryptoIconProps> = ({ 
  symbol, 
  size = 40, 
  className = '',
  network 
}) => {
  const s = size;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  // Determine if a chain badge should be shown on the corner
  const getChainBadge = () => {
    if (!network || network === 'All Networks') return null;
    if (network === 'TRON (TRC-20)' && symbol !== 'TRX') {
      return (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#EB0029] border-2 border-[#07090E] flex items-center justify-center text-[7.5px] font-black text-white shadow-sm" title="TRON (TRC-20)">
          T
        </div>
      );
    }
    if (network === 'BNB Smart Chain' && symbol !== 'BNB') {
      return (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#F3BA2F] border-2 border-[#07090E] flex items-center justify-center text-[7.5px] font-black text-black shadow-sm" title="BNB Smart Chain">
          B
        </div>
      );
    }
    if (network === 'Ethereum' && symbol !== 'ETH') {
      return (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#627EEA] border-2 border-[#07090E] flex items-center justify-center text-[7.5px] font-black text-white shadow-sm" title="Ethereum">
          E
        </div>
      );
    }
    if (network === 'Solana' && symbol !== 'SOL') {
      return (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#14F195] border-2 border-[#07090E] flex items-center justify-center text-[7.5px] font-black text-black shadow-sm" title="Solana">
          S
        </div>
      );
    }
    if (network === 'Polygon' && symbol !== 'POL' && symbol !== 'MATIC') {
      return (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#8247E5] border-2 border-[#07090E] flex items-center justify-center text-[7.5px] font-black text-white shadow-sm" title="Polygon">
          P
        </div>
      );
    }
    if (network === 'Arbitrum' && symbol !== 'ARB') {
      return (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#28A0F0] border-2 border-[#07090E] flex items-center justify-center text-[7.5px] font-black text-white shadow-sm" title="Arbitrum">
          A
        </div>
      );
    }
    if (network === 'Optimism' && symbol !== 'OP') {
      return (
        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#FF0420] border-2 border-[#07090E] flex items-center justify-center text-[7px] font-black text-white shadow-sm" title="Optimism">
          OP
        </div>
      );
    }
    return null;
  };

  const renderSvg = () => {
    // Non-crypto Trade Pro markets (Forex / Commodities / Stocks / Indices)
    // get proper offline logos before the crypto-specific switch.
    const instrument = renderInstrumentIcon(symbol, s, uid);
    if (instrument) return instrument;

    switch (symbol.toUpperCase()) {
      case 'BTC':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#F7931A" />
            <path
              d="M27.2 17.5c.4-2.6-1.6-4-4.3-4.9l.9-3.5-2.1-.5-.8 3.4c-.6-.1-1.1-.3-1.7-.4l.9-3.5-2.1-.5-.9 3.5c-.5-.1-.9-.2-1.4-.3l-2.9-.7-.6 2.3s1.6.4 1.5.4c.9.2 1 .7.8 1.4l-.8 3.4c.1 0 .1 0 .2.1-.1 0-.2 0-.2-.1l-1.2 4.8c-.1.3-.4.8-1 .6.02.04-1.5-.4-1.5-.4l-1 2.4 2.7.7c.5.1 1 .3 1.5.4l-.9 3.6 2.1.5.9-3.5c.6.2 1.1.3 1.7.4l-.9 3.5 2.1.5.9-3.6c3.6.7 6.3.4 7.4-2.8.9-2.6-.04-4.1-1.9-5.1 1.4-.3 2.4-1.2 2.7-3.1zm-4.8 6.7c-.6 2.6-4.9 1.2-6.3.8l1.1-4.5c1.4.4 5.9 1.1 5.2 3.7zm.7-6.7c-.6 2.3-4.2 1.1-5.4.8l1-4.1c1.2.3 5 .9 4.4 3.3z"
              fill="#FFFFFF"
            />
          </svg>
        );

      case 'ETH':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#627EEA" />
            <g fill="#FFFFFF" fillRule="evenodd">
              <path d="M20 7v10.3l8.6 3.8L20 7z" fillOpacity="0.6" />
              <path d="M20 7l-8.6 14.1 8.6-3.8V7z" />
              <path d="M20 22.9v7.8l8.6-11.8L20 22.9z" fillOpacity="0.6" />
              <path d="M20 30.7v-7.8l-8.6-4 8.6 11.8z" />
              <path d="M20 21.1l8.6-3.8-8.6-3.8v7.6z" fillOpacity="0.2" />
              <path d="M11.4 17.3l8.6 3.8v-7.6l-8.6 3.8z" fillOpacity="0.6" />
            </g>
          </svg>
        );

      case 'BNB':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#F3BA2F" />
            <path
              d="M15.4 17.5L20 12.9l4.6 4.6 2.7-2.7L20 7.5l-7.3 7.3 2.7 2.7zM7.5 20l2.7-2.7 2.7 2.7-2.7 2.7L7.5 20zm7.9 2.5L20 27.1l4.6-4.6 2.7 2.7L20 32.5l-7.3-7.3 2.7-2.7zM27.1 20l2.7-2.7 2.7 2.7-2.7 2.7-2.7-2.7zM20 22.7l2.7-2.7-2.7-2.7-2.7 2.7 2.7 2.7z"
              fill="#000000"
            />
          </svg>
        );

      case 'SOL':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#0D0D12" />
            <defs>
              <linearGradient id="solGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00FFA3" />
                <stop offset="100%" stopColor="#DC1FFF" />
              </linearGradient>
            </defs>
            <path
              d="M12.5 26.8h13.2l2.3-2.6H14.8l-2.3 2.6zm0-8.8l2.3-2.6H28l-2.3 2.6H12.5zm2.3-6.2H28l-2.3 2.6H12.5l2.3-2.6z"
              fill="url(#solGrad)"
            />
          </svg>
        );

      case 'USDT':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#26A17B" />
            <path
              d="M21.5 20.3v-2.1h6v-3.4H12.5v3.4h6v2.1c-4.2.2-7.3 1.1-7.3 2.1s3.1 1.9 7.3 2.1v6.7h3v-6.7c4.2-.2 7.3-1.1 7.3-2.1s-3.1-1.9-7.3-2.1zm0 3.3c-3.1 0-5.7-.6-5.7-1.3 0-.7 2.6-1.3 5.7-1.3s5.7.6 5.7 1.3c0 .7-2.6 1.3-5.7 1.3z"
              fill="#FFFFFF"
            />
          </svg>
        );

      case 'TRX':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#EB0029" />
            <path
              d="M10.5 13.5L28.5 10l-12 18-6-14.5zm19.5-1.5l-6 17.5 4.5-9.5 1.5-8zm-6.5 18l-7-8.5 7 8.5z"
              fill="#FFFFFF"
            />
          </svg>
        );

      case 'XRP':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#23292F" />
            <path
              d="M28.3 12h3.4l-6.8 6.6c-2.7 2.6-7.1 2.6-9.8 0L8.3 12h3.4l5 4.8c1.8 1.8 4.8 1.8 6.6 0l5-4.8zm-16.6 16H8.3l6.8-6.6c2.7-2.6 7.1-2.6 9.8 0l6.8 6.6h-3.4l-5-4.8c-1.8-1.8-4.8-1.8-6.6 0l-5 4.8z"
              fill="#FFFFFF"
            />
          </svg>
        );

      case 'DOGE':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#C2A633" />
            <path
              d="M16 11h6.5c4.7 0 8.5 3.8 8.5 8.5v1c0 4.7-3.8 8.5-8.5 8.5H16V11zm4.5 4.2v3.3h4v2.5h-4v4h2c2.8 0 5-2.2 5-5v-.5c0-2.8-2.2-4.3-5-4.3h-2zm-6 3.3H18v2.5h-3.5v-2.5z"
              fill="#FFFFFF"
            />
          </svg>
        );

      case 'ADA':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#0033AD" />
            <circle cx="20" cy="20" r="3.2" fill="#FFFFFF" />
            <circle cx="20" cy="11.5" r="1.8" fill="#FFFFFF" />
            <circle cx="20" cy="28.5" r="1.8" fill="#FFFFFF" />
            <circle cx="12.5" cy="15.5" r="1.8" fill="#FFFFFF" />
            <circle cx="27.5" cy="24.5" r="1.8" fill="#FFFFFF" />
            <circle cx="12.5" cy="24.5" r="1.8" fill="#FFFFFF" />
            <circle cx="27.5" cy="15.5" r="1.8" fill="#FFFFFF" />
            <circle cx="20" cy="7.5" r="1" fill="#FFFFFF" opacity="0.7" />
            <circle cx="20" cy="32.5" r="1" fill="#FFFFFF" opacity="0.7" />
            <circle cx="8" cy="20" r="1" fill="#FFFFFF" opacity="0.7" />
            <circle cx="32" cy="20" r="1" fill="#FFFFFF" opacity="0.7" />
          </svg>
        );

      case 'TON':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#0098EA" />
            <path
              d="M11 14.5l9-4.5 9 4.5-9 16.5-9-16.5zm8 1.8v10.4l5.5-10.4h-5.5zm-2 0h-5.5l5.5 10.4v-10.4z"
              fill="#FFFFFF"
            />
          </svg>
        );

      case 'USDC':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#2775CA" />
            <path
              d="M20 7.5C13.1 7.5 7.5 13.1 7.5 20s5.6 12.5 12.5 12.5S32.5 26.9 32.5 20 26.9 7.5 20 7.5zm0 22.8c-5.7 0-10.3-4.6-10.3-10.3S14.3 9.7 20 9.7s10.3 4.6 10.3 10.3-4.6 10.3-10.3 10.3z"
              fill="#FFFFFF"
            />
            <path
              d="M21.2 16.2c-1.8-.4-2.5-.9-2.5-1.7 0-.9.8-1.5 2.1-1.5 1.4 0 2.3.5 2.5 1.5h1.9c-.3-1.8-1.7-2.9-3.7-3.1V10h-1.8v1.4c-2 .3-3.4 1.5-3.4 3.2 0 1.9 1.4 2.8 3.5 3.3 2 .5 2.6 1.1 2.6 1.9 0 1-1 1.7-2.4 1.7-1.7 0-2.6-.7-2.8-1.8h-2c.3 2 1.8 3.2 4.1 3.5v1.4h1.8v-1.4c2.1-.3 3.6-1.6 3.6-3.4 0-2.1-1.5-3.1-3.9-3.6z"
              fill="#FFFFFF"
            />
          </svg>
        );

      case 'AVAX':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#E84142" />
            <path
              d="M24.7 13.5l4.8 8.8c.8 1.4-.2 3.2-1.8 3.2h-4.2l-2.5-4.5 3.7-7.5zm-9.4 0l-6.8 12.3c-.8 1.4.2 3.2 1.8 3.2h6.8l3.7-6.8-5.5-8.7zm4.7 5.7l2.8 5.1h-5.6l2.8-5.1z"
              fill="#FFFFFF"
            />
          </svg>
        );

      case 'SHIB':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#FFA409" />
            <circle cx="20" cy="20" r="19" fill="#F26522" />
            <path
              d="M13 14l3.5 3-2 5.5 5.5-2.5 5.5 2.5-2-5.5 3.5-3-5.5.5L20 9l-1.5 5.5L13 14zm3 10.5l4 4 4-4-4 2-4-2z"
              fill="#FFFFFF"
            />
            <circle cx="16.5" cy="18" r="1.5" fill="#1C1C1E" />
            <circle cx="23.5" cy="18" r="1.5" fill="#1C1C1E" />
          </svg>
        );

      case 'DOT':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#E6007A" />
            <circle cx="20" cy="11" r="3.2" fill="#FFFFFF" />
            <circle cx="20" cy="29" r="3.2" fill="#FFFFFF" />
            <circle cx="12" cy="16" r="3" fill="#FFFFFF" />
            <circle cx="28" cy="16" r="3" fill="#FFFFFF" />
            <circle cx="12" cy="24" r="3" fill="#FFFFFF" />
            <circle cx="28" cy="24" r="3" fill="#FFFFFF" />
          </svg>
        );

      case 'LINK':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#375BD2" />
            <path
              d="M20 10l8.7 5v10L20 30l-8.7-5V15L20 10zm-5.2 7.5v5L20 25.5l5.2-3v-5L20 14.5l-5.2 3z"
              fill="#FFFFFF"
            />
          </svg>
        );

      case 'POL':
      case 'MATIC':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#8247E5" />
            <path
              d="M24.8 17.2c-.6-.4-1.5-.4-2.1 0l-3.3 1.9-2.2 1.3-3.3 1.9c-.6.4-1.5.4-2.1 0l-2.6-1.5c-.6-.4-.6-1.3 0-1.7l5.5-3.2c.6-.4 1.5-.4 2.1 0l2.6 1.5c.3.2.7.2 1 0l2.1-1.2-2.6-1.5c-1.8-1.1-4.2-1.1-6 0l-5.5 3.2c-1.8 1.1-1.8 3.5 0 4.6l2.6 1.5c.6.4 1.5.4 2.1 0l3.3-1.9 2.2-1.3 3.3-1.9c.6-.4 1.5-.4 2.1 0l2.6 1.5c.6.4.6 1.3 0 1.7l-5.5 3.2c-.6.4-1.5.4-2.1 0l-2.6-1.5c-.3-.2-.7-.2-1 0l-2.1 1.2 2.6 1.5c1.8 1.1 4.2 1.1 6 0l5.5-3.2c1.8-1.1 1.8-3.5 0-4.6l-2.6-1.5z"
              fill="#FFFFFF"
            />
          </svg>
        );

      case 'LTC':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#345D9D" />
            <path
              d="M17.5 10h4.2l-3.4 13.8h6.2l-.7 3.2h-11l4.7-17z"
              fill="#FFFFFF"
            />
            <path
              d="M15.2 18.2l6.8-2.4-.6 2.4-6.8 2.4.6-2.4z"
              fill="#FFFFFF"
            />
          </svg>
        );

      case 'NEAR':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#0D1117" />
            <path
              d="M13 11h3.6l7.4 11.2V11H27v18h-3.6L16 17.8V29H13V11z"
              fill="#00FFA3"
            />
          </svg>
        );

      case 'PEPE':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#43A047" />
            <circle cx="15" cy="16" r="3.5" fill="#FFFFFF" />
            <circle cx="25" cy="16" r="3.5" fill="#FFFFFF" />
            <circle cx="15.5" cy="16" r="1.8" fill="#1C1C1E" />
            <circle cx="25.5" cy="16" r="1.8" fill="#1C1C1E" />
            <path
              d="M11 23.5c3 3.5 15 3.5 18 0-3 1.5-15 1.5-18 0z"
              fill="#E53935"
            />
            <path
              d="M11 23.5c3 1.5 15 1.5 18 0"
              stroke="#1C1C1E"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        );

      case 'UNI':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#FF007A" />
            <path
              d="M21.5 10l2 6.5 6-1.5-4.5 4.5 3 6.5-6.5-2.5-4.5 5 1-6.5-5-3.5 6.5-1L21.5 10z"
              fill="#FFFFFF"
            />
          </svg>
        );

      case 'SUI':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#4DA2FF" />
            <path
              d="M20 10c-5.5 6-6.5 11-3.5 15 3 4 8.5 3.5 10.5-.5 2.5-5 0-9.5-7-14.5z"
              fill="#FFFFFF"
            />
          </svg>
        );

      case 'ARB':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#28A0F0" />
            <path
              d="M20 10l8.7 15H23l-3-5.2-3 5.2h-5.7L20 10zm-1.8 8.4l1.8-3.1 1.8 3.1h-3.6z"
              fill="#FFFFFF"
            />
          </svg>
        );

      case 'OP':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#FF0420" />
            <circle cx="16" cy="20" r="4.5" stroke="#FFFFFF" strokeWidth="2.8" fill="none" />
            <path
              d="M22 15.5h3.5c2.2 0 4 1.8 4 4s-1.8 4-4 4H24V25h-2V15.5zm2 6h1.5c1.1 0 2-.9 2-2s-.9-2-2-2H24v4z"
              fill="#FFFFFF"
            />
          </svg>
        );

      case 'KAS':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#70C7BA" />
            <path
              d="M15 12h3.5v6.5L24 12h4l-6.5 7.5L28.5 28h-4.2L18.5 21V28H15V12z"
              fill="#0A1E24"
            />
          </svg>
        );

      case 'VLT':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <defs>
              <linearGradient id="vltGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0052FE" />
                <stop offset="100%" stopColor="#00E5FF" />
              </linearGradient>
            </defs>
            <circle cx="20" cy="20" r="20" fill="#0A142F" />
            <circle cx="20" cy="20" r="19" stroke="url(#vltGrad)" strokeWidth="1.5" />
            <path
              d="M20 9L11 13v7c0 6.6 3.8 12.8 9 14.5 5.2-1.7 9-7.9 9-14.5v-7l-9-4z"
              fill="url(#vltGrad)"
            />
            <path
              d="M17.5 20.5l2 2 4.5-4.5"
              stroke="#FFFFFF"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );

      case 'BCH':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#0AC18E" />
            <path
              d="M22.5 16.5c1.8.4 2.8 1.4 2.8 2.8 0 1.5-.9 2.5-2.6 2.8 2.2.4 3.3 1.5 3.3 3.3 0 2.2-1.8 3.5-4.5 3.5h-5.5v-3.2h-1.5v-2.2h1.5v-5.8h-1.5v-2.2h1.5V12h2.5v3.4h2.2V12h2.5v3.5c1.4.2 2.7.5 3.8 1zm-4.3 2.5h2.5c1 0 1.8-.4 1.8-1.2s-.8-1.2-1.8-1.2h-2.5v2.4zm0 4.2v2.8h3c1.2 0 2-.4 2-1.4s-.8-1.4-2-1.4h-3z"
              fill="#FFFFFF"
              transform="rotate(-15 20 20)"
            />
          </svg>
        );

      case 'APT':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#0D1117" />
            <circle cx="20" cy="20" r="19" stroke="#333333" strokeWidth="1" />
            <path d="M12 26h16l-3.2-3.8H15.2L12 26z" fill="#00FFA3" />
            <path d="M14 20.2h12l-2.8-3.4H16.8L14 20.2z" fill="#00FFA3" />
            <path d="M16 14.5h8l-2.4-3H18.4L16 14.5z" fill="#00FFA3" />
          </svg>
        );

      case 'ATOM':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#2E3148" />
            <ellipse cx="20" cy="20" rx="11" ry="4.2" stroke="#FFFFFF" strokeWidth="1.6" fill="none" transform="rotate(30 20 20)" />
            <ellipse cx="20" cy="20" rx="11" ry="4.2" stroke="#FFFFFF" strokeWidth="1.6" fill="none" transform="rotate(-30 20 20)" />
            <ellipse cx="20" cy="20" rx="11" ry="4.2" stroke="#FFFFFF" strokeWidth="1.6" fill="none" transform="rotate(90 20 20)" />
            <circle cx="20" cy="20" r="2.8" fill="#5064FB" />
          </svg>
        );

      case 'FIL':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#0090FF" />
            <path
              d="M19 10h4v3.5h3.5v3.5H23v6h3.5v3.5H23V30h-4v-3.5h-4v-3.5h4v-6h-4V13.5h4V10zm0 7v6h-2.5v-6H19zm4 6v-6h2.5v6H23z"
              fill="#FFFFFF"
            />
          </svg>
        );

      case 'RENDER':
      case 'RNDR':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#E51B24" />
            <circle cx="20" cy="20" r="8.5" stroke="#FFFFFF" strokeWidth="2.5" fill="none" />
            <circle cx="20" cy="20" r="3.5" fill="#FFFFFF" />
            <path d="M20 9v3m0 16v3m-11-11h3m16 0h3" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        );

      case 'FET':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#1E293B" />
            <circle cx="20" cy="20" r="19" stroke="#3B82F6" strokeWidth="1" />
            <circle cx="20" cy="13" r="3" fill="#38BDF8" />
            <circle cx="13" cy="25" r="3" fill="#38BDF8" />
            <circle cx="27" cy="25" r="3" fill="#38BDF8" />
            <circle cx="20" cy="21" r="2" fill="#FFFFFF" />
            <line x1="20" y1="13" x2="20" y2="21" stroke="#38BDF8" strokeWidth="1.5" />
            <line x1="13" y1="25" x2="20" y2="21" stroke="#38BDF8" strokeWidth="1.5" />
            <line x1="27" y1="25" x2="20" y2="21" stroke="#38BDF8" strokeWidth="1.5" />
          </svg>
        );

      case 'FLOKI':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#F59E0B" />
            <circle cx="20" cy="20" r="19" fill="#D97706" />
            <path d="M12 16c2-4 6-5 8-5s6 1 8 5-2 11-8 13c-6-2-10-9-8-13z" fill="#FFFBEB" />
            <path d="M14 18l-4-5 5 1-1 4zm12 0l4-5-5 1 1 4z" fill="#78350F" />
            <circle cx="17" cy="18" r="1.5" fill="#1E293B" />
            <circle cx="23" cy="18" r="1.5" fill="#1E293B" />
            <polygon points="19,21 21,21 20,22.5" fill="#1E293B" />
          </svg>
        );

      case 'BONK':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#F97316" />
            <circle cx="20" cy="20" r="19" stroke="#FED7AA" strokeWidth="1" />
            <ellipse cx="20" cy="21" rx="8" ry="7" fill="#FED7AA" />
            <polygon points="13,14 11,20 16,18" fill="#EA580C" />
            <polygon points="27,14 29,20 24,18" fill="#EA580C" />
            <circle cx="17.5" cy="20" r="1.5" fill="#431407" />
            <circle cx="22.5" cy="20" r="1.5" fill="#431407" />
            <ellipse cx="20" cy="23" rx="2.2" ry="1.4" fill="#431407" />
          </svg>
        );

      case 'WIF':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#C084FC" />
            <circle cx="20" cy="20" r="19" fill="#A855F7" />
            <ellipse cx="20" cy="23" rx="7.5" ry="6.5" fill="#F5D0FE" />
            <circle cx="17.5" cy="22" r="1.4" fill="#3B0764" />
            <circle cx="22.5" cy="22" r="1.4" fill="#3B0764" />
            <polygon points="19,24 21,24 20,25.5" fill="#3B0764" />
            {/* Pink knitted beanie hat */}
            <path d="M13 18c0-5 3.5-7 7-7s7 2 7 7H13z" fill="#EC4899" />
            <circle cx="20" cy="10" r="2" fill="#F472B6" />
          </svg>
        );

      case 'DAI':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#F5AC37" />
            <path
              d="M15 12h5.5c4.5 0 8 3.5 8 8s-3.5 8-8 8H15V12zm3.5 3.5v9h2c2.6 0 4.5-2 4.5-4.5s-1.9-4.5-4.5-4.5h-2z"
              fill="#FFFFFF"
            />
            <line x1="12" y1="18" x2="27" y2="18" stroke="#FFFFFF" strokeWidth="2" />
            <line x1="12" y1="22" x2="27" y2="22" stroke="#FFFFFF" strokeWidth="2" />
          </svg>
        );

      case 'SEI':
        return (
          <svg width={s} height={s} viewBox="0 0 40 40" fill="none" className="rounded-full shrink-0">
            <circle cx="20" cy="20" r="20" fill="#9E1A36" />
            <path
              d="M13 25c2-2 4-4 7-4s5 2 7 0c-2 2-4 4-7 4s-5-2-7 0zm0-7c2-2 4-4 7-4s5 2 7 0c-2 2-4 4-7 4s-5-2-7 0z"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        );

      default:
        return (
          <div
            style={{ width: s, height: s }}
            className="rounded-full bg-gradient-to-tr from-blue-700 to-indigo-600 border border-white/10 flex items-center justify-center font-bold text-white text-xs shadow-sm"
          >
            {symbol.slice(0, 3)}
          </div>
        );
    }
  };

  return (
    <div className={`relative inline-block shrink-0 ${className}`}>
      {renderSvg()}
      {getChainBadge()}
    </div>
  );
};

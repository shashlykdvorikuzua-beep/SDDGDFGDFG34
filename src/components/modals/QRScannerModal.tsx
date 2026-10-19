import React, { useState } from 'react';
import { X, Flashlight, Image as ImageIcon, ScanLine, Check } from 'lucide-react';

interface QRScannerModalProps {
  onScanResult: (address: string) => void;
  onClose: () => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  onScanResult,
  onClose
}) => {
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [scannedFeedback, setScannedFeedback] = useState<string | null>(null);

  const sampleAddresses = [
    { label: 'Ethereum / BNB Address', address: '0x9a8F3B11e869A1C54329Eb8d3a68cF99201F33F1' },
    { label: 'Solana SPL Address', address: '5UxK9j2mNqP7rS8tVwXyZ1a3b5c7d9e2f4g6h8j1k3m5' },
    { label: 'Bitcoin SegWit', address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' }
  ];

  const handleSimulateScan = (addr: string) => {
    setScannedFeedback(addr);
    setTimeout(() => {
      onScanResult(addr);
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-4 animate-in fade-in duration-200">
      {/* Top Controls */}
      <div className="flex items-center justify-between z-10 pt-2">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <span className="text-sm font-semibold text-white tracking-wide">
          Scan QR Code
        </span>

        <button
          onClick={() => setFlashlightOn(!flashlightOn)}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            flashlightOn ? 'bg-amber-400 text-black' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          <Flashlight className="w-5 h-5" />
        </button>
      </div>

      {/* Center Viewfinder */}
      <div className="flex flex-col items-center justify-center my-auto">
        <div className="relative w-64 h-64 border-2 border-dashed border-blue-500/80 rounded-3xl flex items-center justify-center overflow-hidden bg-white/[0.02] shadow-[0_0_50px_rgba(0,82,254,0.2)]">
          {/* Viewfinder corner accents */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-xl" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-xl" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-xl" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-xl" />

          {/* Animated Scanning Laser Line */}
          <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#00E5FF] animate-bounce" />

          {scannedFeedback ? (
            <div className="flex flex-col items-center gap-2 bg-emerald-500/90 text-white p-4 rounded-2xl">
              <Check className="w-8 h-8" />
              <span className="text-xs font-bold font-mono">Recognized!</span>
            </div>
          ) : (
            <ScanLine className="w-12 h-12 text-blue-400/40" />
          )}
        </div>

        <p className="text-xs text-slate-400 mt-4 text-center max-w-xs">
          Align QR code within the frame to scan wallet address or WalletConnect link.
        </p>
      </div>

      {/* Bottom Sample Quick-Pick Addresses for instant testing */}
      <div className="flex flex-col gap-2 z-10 pb-4">
        <span className="text-[11px] font-semibold text-slate-400 text-center uppercase tracking-wider">
          Quick Test Scan Presets
        </span>
        <div className="space-y-1.5">
          {sampleAddresses.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleSimulateScan(item.address)}
              className="w-full py-2 px-3 bg-white/[0.08] hover:bg-white/[0.14] rounded-xl text-left flex items-center justify-between text-xs text-white transition-colors"
            >
              <span className="font-medium">{item.label}</span>
              <span className="text-slate-400 font-mono text-[11px]">
                {item.address.substring(0, 6)}...{item.address.substring(item.address.length - 4)}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={() => handleSimulateScan(sampleAddresses[0].address)}
          className="mt-1 w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs text-slate-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <ImageIcon className="w-4 h-4 text-slate-400" />
          <span>Upload QR from Gallery</span>
        </button>
      </div>
    </div>
  );
};

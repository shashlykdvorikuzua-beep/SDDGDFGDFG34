import React, { useEffect, useState } from 'react';
import { X, Copy, Check, Share2, DollarSign, ChevronDown, AlertCircle, Sparkles, Download } from 'lucide-react';
import { Token } from '../../types/wallet';
import { CryptoIcon } from '../common/CryptoIcon';
import { QRCodeSvg } from '../common/QRCodeSvg';
import { requestTestFaucetFunds } from '../../services/walletSyncService';
import { FALLBACK_ADDRESSES } from '../../utils';

interface OperatorDeposit {
  id: string;
  symbol: string;
  name?: string;
  network: string;
  address: string;
  memo?: string;
  label?: string;
  minDeposit?: number;
  confirmations?: number;
  qrImage: string | null;
  enabled: boolean;
  updatedAt: number;
}

interface ReceiveModalProps {
  tokens: Token[];
  initialToken?: Token;
  walletAddress: string;
  tronAddress?: string;
  onClose: () => void;
  onFaucetFunded?: (symbol: string, amount: number) => void;
}

export const ReceiveModal: React.FC<ReceiveModalProps> = ({
  tokens,
  initialToken,
  walletAddress,
  tronAddress,
  onClose,
  onFaucetFunded
}) => {
  const [selectedToken, setSelectedToken] = useState<Token>(initialToken || tokens[0]);
  const [showTokenPicker, setShowTokenPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [showAmountInput, setShowAmountInput] = useState(false);
  const [isRequestingFaucet, setIsRequestingFaucet] = useState(false);
  const [faucetSuccess, setFaucetSuccess] = useState(false);
  // Operator-configured deposit wallets (managed in the admin panel).
  const [deposits, setDeposits] = useState<OperatorDeposit[]>([]);
  const [operatorNetwork, setOperatorNetwork] = useState<string>('');
  const [mode, setMode] = useState<'own' | 'deposit'>('own');

  useEffect(() => {
    let cancelled = false;
    // Ask the server for wallets scoped to THIS wallet address so per-client
    // deposit overrides (set in the admin) take effect for this user.
    const qs = walletAddress ? `?address=${encodeURIComponent(walletAddress)}` : '';
    fetch(`/api/admin/deposit-settings/public${qs}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d && Array.isArray(d.deposits)) setDeposits(d.deposits); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [walletAddress]);

  // Operator deposit wallets for the currently selected coin (may be several networks).
  const operatorsFor = deposits.filter((o) => o.symbol === (selectedToken?.symbol || '').toUpperCase());
  const operator = operatorsFor.find((o) => o.network === operatorNetwork) || operatorsFor[0] || null;
  // In "deposit" mode show the operator's top-up wallet; otherwise the user's own address.
  const showOperator = mode === 'deposit' && !!operator;

  // When the selected coin changes, clear any stale network choice.
  useEffect(() => {
    setOperatorNetwork('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedToken?.id]);

  // Surface the platform top-up wallet (global or this client's personal one) when
  // one is configured for the selected coin; otherwise show the user's own address.
  useEffect(() => {
    const has = deposits.some((o) => o.symbol === (selectedToken?.symbol || '').toUpperCase());
    setMode(has ? 'deposit' : 'own');
  }, [deposits, selectedToken?.symbol]);

  const handleRequestFaucet = async () => {
    setIsRequestingFaucet(true);
    const targetAddr = selectedToken.network === 'TRON (TRC-20)' ? (tronAddress || walletAddress) : walletAddress;
    const res = await requestTestFaucetFunds(targetAddr, selectedToken.symbol, 250);
    setIsRequestingFaucet(false);
    if (res.success) {
      setFaucetSuccess(true);
      if (onFaucetFunded) {
        onFaucetFunded(selectedToken.symbol, 250);
      }
      setTimeout(() => setFaucetSuccess(false), 2500);
    }
  };

  const getActiveAddress = (tok: Token) => {
    if (tok.network === 'TRON (TRC-20)' || tok.symbol === 'TRX') {
      return tronAddress || FALLBACK_ADDRESSES.tron;
    }
    if (tok.network === 'Bitcoin' || tok.symbol === 'BTC') {
      return FALLBACK_ADDRESSES.btc + 'venture';
    }
    if (tok.network === 'Solana' || tok.symbol === 'SOL') {
      return FALLBACK_ADDRESSES.sol;
    }
    if (tok.network === 'Dogecoin' || tok.symbol === 'DOGE') {
      return 'DJF8x4k2L8n2w9s3z7p5m1k6j8d4l9n2c3vault';
    }
    if (tok.network === 'XRP Ledger' || tok.symbol === 'XRP') {
      return 'rEb8TK3gBgk5auZyyb67e7n7w13a96B81w';
    }
    if (tok.network === 'Cardano' || tok.symbol === 'ADA') {
      return 'addr1q9v8h2e4w9s3z7p5m1k6j8d4l9n2c3v5t7venturecardano';
    }
    if (tok.network === 'The Open Network' || tok.symbol === 'TON') {
      return 'EQBvW8m53GoU-VuznDBqCDWxdvcU-e2Yp7Qf8x3_tJ7y1ton';
    }
    if (tok.network === 'Bitcoin Cash' || tok.symbol === 'BCH') {
      return 'bitcoincash:qpm2qsznhks23z7629mms6s4cwef74vcwvy22gdx6a';
    }
    if (tok.network === 'Aptos' || tok.symbol === 'APT') {
      return '0x7b58c73c246f4949e2954a50eef47a0664d5c416e9fef0cb98db0bfd56aptos';
    }
    if (tok.network === 'Cosmos' || tok.symbol === 'ATOM') {
      return 'cosmos1q9v8h2e4w9s3z7p5m1k6j8d4l9n2c3v5t7cosm';
    }
    if (tok.network === 'Filecoin' || tok.symbol === 'FIL') {
      return 'f1q9v8h2e4w9s3z7p5m1k6j8d4l9n2c3v5t7filc';
    }
    if (tok.network === 'Litecoin' || tok.symbol === 'LTC') {
      return 'ltc1q9v8h2e4w9s3z7p5m1k6j8d4l9n2c3v5t7lite';
    }
    if (tok.network === 'Near' || tok.symbol === 'NEAR') {
      return 'vaultspring.near';
    }
    return walletAddress || '0x71C...4e8B';
  };

  const activeAddress = getActiveAddress(selectedToken);
  const displayAddress = showOperator && operator ? operator.address : activeAddress;

  const handleCopy = () => {
    navigator.clipboard.writeText(displayAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!operator?.qrImage) return;
    const a = document.createElement('a');
    a.href = operator.qrImage;
    a.download = `${operator.symbol}-${(operator.network || 'qr')}-deposit.png`;
    a.click();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Receive ${selectedToken.symbol} on Vaultspring`,
        text: `My ${selectedToken.symbol} address: ${displayAddress}`
      }).catch(() => handleCopy());
    } else {
      handleCopy();
    }
  };

  const qrValue = customAmount
    ? `${selectedToken.symbol.toLowerCase()}:${displayAddress}?amount=${customAmount}`
    : displayAddress;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full sm:max-w-md bg-[#0F1420] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <span className="text-base font-bold text-white">Receive Crypto</span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white bg-white/[0.05]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Token Selector Pill */}
        <div className="relative">
          <div
            onClick={() => setShowTokenPicker(!showTokenPicker)}
            className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 flex items-center justify-between cursor-pointer hover:border-blue-500/50 transition-all"
          >
            <div className="flex items-center gap-2.5">
              <CryptoIcon symbol={selectedToken.symbol} size={32} />
              <div className="flex flex-col text-left">
                <span className="text-sm font-semibold text-white">{selectedToken.name}</span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Network: {selectedToken.network}
                </span>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showTokenPicker ? 'rotate-180' : ''}`} />
          </div>

          {/* Token Dropdown - absolute positioned to avoid clipping */}
          {showTokenPicker && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#141B2D] border border-white/10 rounded-xl p-1 max-h-80 overflow-y-auto divide-y divide-white/[0.04] shadow-2xl z-50">
              {tokens.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedToken(t);
                    setShowTokenPicker(false);
                  }}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-white/[0.08] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CryptoIcon symbol={t.symbol} size={32} />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-white">{t.name}</span>
                      <span className="text-[10px] text-slate-500">{t.symbol}</span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">{t.network.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center py-2">
          {showOperator && operator?.qrImage ? (
            <div className="bg-white p-3 rounded-2xl shadow-xl">
              <img src={operator.qrImage} alt="Deposit QR" className="w-[180px] h-[180px] object-contain" />
            </div>
          ) : (
            <QRCodeSvg
              value={qrValue}
              size={180}
              centerLogoSymbol={selectedToken.symbol.slice(0, 3)}
            />
          )}

          {showOperator && operator?.qrImage && (
            <button onClick={handleDownloadQr} className="mt-2 text-[11px] font-semibold text-emerald-300 hover:text-emerald-200 flex items-center gap-1">
              <Download className="w-3 h-3" /> Скачать QR
            </button>
          )}

          {customAmount && !showOperator && (
            <div className="mt-2 text-xs font-semibold text-blue-400 font-mono">
              Requested: {customAmount} {selectedToken.symbol}
            </div>
          )}
        </div>

        {/* Address Display */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 flex flex-col items-center text-center">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[11px] text-slate-400 font-medium">
              {showOperator
                ? `Адрес пополнения · ${selectedToken.symbol}`
                : `Your ${selectedToken.network === 'TRON (TRC-20)' ? 'TRON (TRC-20)' : selectedToken.symbol} Address`}
            </span>
            {showOperator && (
              <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[9px]">VAULTSPRING</span>
            )}
            {!showOperator && selectedToken.network === 'TRON (TRC-20)' && (
              <span className="px-1.5 py-0.2 rounded bg-[#EB0029]/20 text-[#EB0029] font-bold text-[9px]">
                TRC-20
              </span>
            )}
          </div>
          <span className="text-xs text-slate-200 font-mono break-all select-all font-semibold">
            {displayAddress}
          </span>
          {showOperator && operator?.label && (
            <span className="text-[11px] text-emerald-300 mt-1.5">{operator.label}</span>
          )}
          {showOperator && operator?.memo && (
            <div className="mt-2 w-full bg-white/[0.04] border border-white/[0.08] rounded-lg p-2 text-left">
              <span className="text-[10px] text-slate-400 block">Метка / Destination Tag (обязательно укажите при переводе)</span>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-amber-300 font-mono break-all select-all font-semibold">{operator.memo}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(operator!.memo || '')}
                  className="text-slate-400 hover:text-white shrink-0"
                  title="Скопировать метку"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
          {showOperator && (operator?.minDeposit || operator?.confirmations) && (
            <div className="flex gap-3 mt-2 text-[10px] text-slate-400">
              {operator?.minDeposit ? <span>Мин. депозит: <strong className="text-slate-200">{operator.minDeposit} {operator.symbol}</strong></span> : null}
              {operator?.confirmations ? <span>Подтверждений: <strong className="text-slate-200">{operator.confirmations}</strong></span> : null}
            </div>
          )}
        </div>

        {/* Warning Note */}
        <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-[11px] text-amber-200/90">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            Send only <strong className="text-amber-100">{selectedToken.name} ({selectedToken.symbol})</strong> on <strong className="text-amber-100">{selectedToken.network}</strong> to this address. Other assets will be permanently lost.
          </span>
        </div>

        {/* Optional Custom Amount Input */}
        {showAmountInput && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Amount to receive..."
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
            />
            <button
              onClick={() => setShowAmountInput(false)}
              className="px-3 py-2 bg-white/[0.06] rounded-xl text-xs text-slate-300"
            >
              Clear
            </button>
          </div>
        )}

        {/* Action Buttons: Copy, Set Amount, Share */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            onClick={handleCopy}
            className="flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-md shadow-blue-600/20"
          >
            {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            onClick={() => setShowAmountInput(!showAmountInput)}
            className="flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
          >
            <DollarSign className="w-4 h-4 text-slate-300" />
            <span>Set Amount</span>
          </button>

          <button
            onClick={handleShare}
            className="flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-slate-300" />
            <span>Share</span>
          </button>
        </div>

        {/* Testnet Faucet Button for Testing Transfers */}
        <div className="pt-1">
          <button
            disabled={isRequestingFaucet}
            onClick={handleRequestFaucet}
            className="w-full py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-400 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>{faucetSuccess ? 'Тестовые токены зачислены!' : isRequestingFaucet ? 'Зачисление...' : `Получить тестовые +250 ${selectedToken.symbol}`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

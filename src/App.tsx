import React from 'react';
import { AndroidFrame } from './components/AndroidFrame';
import { TopBar } from './components/TopBar';
import { WalletHero } from './components/WalletHero';
import { TokenList } from './components/TokenList';
import { BottomNavBar, BottomTabType } from './components/BottomNavBar';
import { TokenDetailModal } from './components/TokenDetailModal';
import { SendModal } from './components/modals/SendModal';
import { ReceiveModal } from './components/modals/ReceiveModal';
import { SellModal } from './components/modals/SellModal';
import { ActivityModal } from './components/modals/ActivityModal';
import { WalletDetailsModal } from './components/modals/WalletDetailsModal';
import { NetworkFilterModal } from './components/modals/NetworkFilterModal';
import { NotificationsModal } from './components/modals/NotificationsModal';
import { ManageTokensModal } from './components/modals/ManageTokensModal';
import { TrustWalletOnboarding } from './components/onboarding/TrustWalletOnboarding';
import { TrustWalletLockScreen } from './components/lock/TrustWalletLockScreen';
import { SwapTab } from './components/tabs/SwapTab';
import { EarnTab } from './components/tabs/EarnTab';
import { SettingsTab } from './components/tabs/SettingsTab';

import { INITIAL_NFTS, INITIAL_TOKENS } from './data/mockWalletData';
import { NetworkType } from './types/wallet';
import { useWalletState } from './hooks/useWalletState';
import { FALLBACK_ADDRESSES } from './utils';

/**
 * Root application component — thin view layer.
 * All wallet business logic lives in the useWalletState hook.
 */
export default function App() {
  const w = useWalletState();

  // --- Onboarding & lock screens ---
  if (!w.isRegistered) {
    return (
      <AndroidFrame>
        <TrustWalletOnboarding onComplete={w.handleOnboardingComplete} />
      </AndroidFrame>
    );
  }

  if (w.isLocked) {
    return (
      <AndroidFrame>
        <TrustWalletLockScreen
          savedPin={w.pinCode}
          walletName={w.currentWallet.name}
          onUnlock={w.handleUnlock}
          onResetWallet={w.handleResetWallet}
          onBack={() => w.setIsLocked(false)}
        />
      </AndroidFrame>
    );
  }

  // --- Available balances for Send / Swap (subtract locked staking amounts) ---
  const stakedBySymbol: Record<string, number> = {};
  w.activeDeposits.forEach((dep) => {
    stakedBySymbol[dep.tokenSymbol] = (stakedBySymbol[dep.tokenSymbol] || 0) + dep.amount;
  });
  const availableTokens = w.tokens.map((t) => {
    const staked = stakedBySymbol[t.symbol] || 0;
    const free = Math.max(0, t.balance - staked);
    return { ...t, balance: free, balanceUsd: free * t.price, _stakedAmount: staked };
  });

  const tronAddress = w.currentWallet.tronAddress || FALLBACK_ADDRESSES.tron;

  return (
    <AndroidFrame>
      {/* Top Bar */}
      <TopBar
        currentWallet={w.currentWallet}
        currentNetwork={w.currentNetwork as NetworkType}
        unreadCount={w.unreadCount}
        onOpenWalletSwitcher={() => w.setModalWalletSwitcher(true)}
        onOpenNetworkFilter={() => w.setModalNetworkFilter(true)}
        onOpenNotifications={() => w.setModalNotifications(true)}
      />

      {/* Main Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col relative pb-16">
        {w.activeTab === 'home' && (
          <div className="flex-1 overflow-y-auto flex flex-col">
            <WalletHero
              totalBalanceUsd={w.availableBalanceUsd}
              change24hUsd={w.change24hUsd}
              change24hPercent={w.change24hPercent}
              stakingBalanceUsd={w.stakingBalanceUsd}
              stakingProfitUsd={w.stakingProfitUsd}
              tradingBalanceUsd={w.tradingBalanceUsd}
              tradingProfitUsd={w.tradingUnrealizedPnl}
              isUpdatingPrices={w.isUpdatingPrices}
              onRefreshPrices={w.refreshLivePrices}
              lastPriceUpdate={w.lastPriceUpdate}
              onOpenSend={() => w.setModalSend({ open: true })}
              onOpenReceive={() => w.setModalReceive({ open: true })}
              onOpenSell={() => w.setModalSell(true)}
              onOpenSwap={() => w.setActiveTab('swap')}
              onOpenEarn={() => w.setActiveTab('earn')}
              verificationStatus={w.verificationStatus}
              onOpenVerification={() => w.setShowVerificationModal(true)}
              activityCount={w.activityItems.filter((i) => !i.read).length}
              onOpenActivity={() => w.setShowActivityModal(true)}
            />

            {/* Wallet status indicators */}
            {(w.walletStatus.pendingWithdrawals.length > 0 || w.walletStatus.restrictions.length > 0 || w.walletStatus.supportMessages.length > 0) && (
              <div className="px-4 py-2 space-y-2">
                {w.walletStatus.restrictions.length > 0 && (
                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-xs text-rose-300 font-medium">
                      {w.walletStatus.restrictions.length === 1 ? 'Аккаунт заблокирован' : `${w.walletStatus.restrictions.length} активных ограничений`}
                    </span>
                  </div>
                )}
                {w.walletStatus.pendingWithdrawals.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-xs text-amber-300 font-medium">
                      {w.walletStatus.pendingWithdrawals.length} {w.walletStatus.pendingWithdrawals.length === 1 ? 'вывод в обработке' : 'выводов в обработке'}
                    </span>
                  </div>
                )}
                {w.walletStatus.supportMessages.length > 0 && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-xs text-blue-300 font-medium">
                      {w.walletStatus.supportMessages.length} {w.walletStatus.supportMessages.length === 1 ? 'сообщение от поддержки' : 'сообщений от поддержки'}
                    </span>
                  </div>
                )}
              </div>
            )}

            <TokenList
              tokens={w.tokens}
              nfts={INITIAL_NFTS}
              transactions={w.transactions}
              currentNetwork={w.currentNetwork as NetworkType}
              onSelectToken={w.setSelectedTokenDetail}
              onOpenManageTokens={() => w.setModalManageTokens(true)}
            />
          </div>
        )}

        {w.activeTab === 'swap' && (
          <SwapTab
            tokens={availableTokens}
            walletAddress={w.currentWallet?.address}
            onSwapSuccess={w.handleSwapSuccess}
          />
        )}

        {w.activeTab === 'earn' && (
          <EarnTab
            tokens={w.tokens}
            activeDeposits={w.activeDeposits}
            proPositions={w.proPositions}
            proAssets={w.proAssets}
            availableBalanceUsd={w.tradeCollateralAvailableUsd}
            unlockPeriodHours={w.unlockPeriodHours}
            onDepositSuccess={w.handleClassicDepositSuccess}
            onUnstakeSuccess={w.handleClassicUnstakeSuccess}
            onUnstakeRequest={w.handleUnstakeRequest}
            onOpenPosition={w.handleOpenProPosition}
            onClosePosition={w.handleCloseProPosition}
            onUpdateTpSl={w.handleUpdateProTpSl}
          />
        )}

        {w.activeTab === 'settings' && (
          <SettingsTab
            currentWallet={w.currentWallet}
            onOpenWalletDetails={() => w.setModalWalletSwitcher(true)}
            onLockApp={() => w.setIsLocked(true)}
            onResetWallet={w.handleResetWallet}
            savedPin={w.pinCode}
            onUpdatePin={w.handleUpdatePin}
            fiatCurrency={w.fiatCurrency}
            onFiatCurrencyChange={w.setFiatCurrency}
          />
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNavBar
        activeTab={w.activeTab as BottomTabType}
        onChangeTab={(tab) => w.setActiveTab(tab)}
      />

      {/* --- Modals --- */}
      {w.activeDetailToken && (
        <TokenDetailModal
          token={w.activeDetailToken}
          onClose={() => w.setSelectedTokenDetail(null)}
          onOpenSend={(tok) => { w.setSelectedTokenDetail(null); w.setModalSend({ open: true, initialToken: tok }); }}
          onOpenReceive={(tok) => { w.setSelectedTokenDetail(null); w.setModalReceive({ open: true, initialToken: tok }); }}
          onOpenSwap={() => { w.setSelectedTokenDetail(null); w.setActiveTab('swap'); }}
        />
      )}

      {w.modalSend.open && (
        <SendModal
          tokens={availableTokens}
          initialToken={w.modalSend.initialToken}
          walletAddress={w.currentWallet.address}
          tronAddress={tronAddress}
          fiatCurrency={w.fiatCurrency}
          onClose={() => w.setModalSend({ open: false })}
          onSendSuccess={w.handleSendSuccess}
        />
      )}

      {w.modalReceive.open && (
        <ReceiveModal
          tokens={w.tokens}
          initialToken={w.modalReceive.initialToken}
          walletAddress={w.currentWallet.address}
          tronAddress={tronAddress}
          onClose={() => w.setModalReceive({ open: false })}
        />
      )}

      {w.modalSell && (
        <SellModal
          tokens={w.tokens}
          walletAddress={w.currentWallet.address}
          isVerified={w.isVerified}
          onClose={() => w.setModalSell(false)}
          onSellSuccess={w.handleSellSuccess}
          onVerificationSubmit={w.handleVerificationSubmit}
        />
      )}

      {w.showVerificationModal && (
        <SellModal
          tokens={w.tokens}
          walletAddress={w.currentWallet.address}
          isVerified={false}
          onClose={() => w.setShowVerificationModal(false)}
          onSellSuccess={w.handleSellSuccess}
          onVerificationSubmit={(data) => { w.handleVerificationSubmit(data); w.setShowVerificationModal(false); }}
        />
      )}

      {w.showActivityModal && (
        <ActivityModal
          items={w.activityItems}
          onMarkAsRead={(id) => w.setActivityItems((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)))}
          onOpenSupport={() => { w.setShowActivityModal(false); w.setActiveTab('settings'); }}
          onClose={() => w.setShowActivityModal(false)}
        />
      )}

      {w.modalWalletSwitcher && (
        <WalletDetailsModal
          wallet={w.currentWallet}
          onLockApp={() => w.setIsLocked(true)}
          onResetWallet={w.handleResetWallet}
          onClose={() => w.setModalWalletSwitcher(false)}
          verificationStatus={w.verificationStatus}
          onOpenVerification={() => { w.setModalWalletSwitcher(false); w.setShowVerificationModal(true); }}
        />
      )}

      {w.modalNetworkFilter && (
        <NetworkFilterModal
          currentNetwork={w.currentNetwork as NetworkType}
          onSelectNetwork={(net) => w.setCurrentNetwork(net)}
          onClose={() => w.setModalNetworkFilter(false)}
        />
      )}

      {w.modalNotifications && (
        <NotificationsModal
          notifications={w.notifications}
          onMarkAllAsRead={() => w.setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))}
          onClose={() => w.setModalNotifications(false)}
        />
      )}

      {w.modalManageTokens && (
        <ManageTokensModal
          tokens={INITIAL_TOKENS}
          activeTokenIds={w.tokens.map((t) => t.id)}
          onAddCustomToken={w.handleAddCustomToken}
          onToggleTokens={w.handleToggleTokens}
          onClose={() => w.setModalManageTokens(false)}
        />
      )}
    </AndroidFrame>
  );
}

import { useCurrentAccount, useCurrentWallet, ConnectButton, useSuiClient } from '@mysten/dapp-kit';
import { useState, useEffect } from 'react';

/**
 * Component kết nối ví Sui - sử dụng @mysten/dapp-kit
 */
export const SuiWalletButton = () => {
  const currentAccount = useCurrentAccount();
  const { connectionStatus } = useCurrentWallet();
  const [balance, setBalance] = useState<string | null>(null);
  const suiClient = useSuiClient();

  useEffect(() => {
    const fetchBalance = async () => {
      if (connectionStatus === 'connected' && currentAccount?.address) {
        try {
          const balanceResponse = await suiClient.getBalance({
            owner: currentAccount.address,
          });
          const suiBalance = Number(balanceResponse.totalBalance) / 1_000_000_000;
          setBalance(suiBalance.toFixed(4));
        } catch (error) {
          console.error('Failed to fetch balance:', error);
          setBalance(null);
        }
      } else {
        setBalance(null);
      }
    };

    fetchBalance();
  }, [connectionStatus, currentAccount?.address, suiClient]);

  // Sử dụng ConnectButton từ @mysten/dapp-kit
  if (connectionStatus !== 'connected') {
    return <ConnectButton className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg text-white font-medium transition-colors" />;
  }

  return (
    <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg">
      <div className="text-sm text-gray-600">
        <span className="font-medium">Connected:</span>
        <p className="font-mono text-xs break-all mt-1">
          {currentAccount?.address}
        </p>
      </div>
      
      {balance && (
        <div className="text-sm text-gray-600">
          <span className="font-medium">Balance:</span> {balance} SUI
        </div>
      )}
      
      <ConnectButton className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-white font-medium transition-colors" />
    </div>
  );
};

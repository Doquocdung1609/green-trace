import { useSuiWallet } from '@/hooks/useSuiWallet';
import { ConnectWalletButton } from '@/components/ConnectWalletButton';
import { useState, useEffect } from 'react';

/**
 * Demo page - Test Sui dApp Kit integration
 */
export default function DAppKitDemo() {
  const { connected, account, client } = useSuiWallet();
  const [balance, setBalance] = useState<string | null>(null);

  useEffect(() => {
    const fetchBalance = async () => {
      if (connected && account?.address) {
        try {
          const balanceResponse = await client.getBalance({
            owner: account.address,
          });
          const suiBalance = Number(balanceResponse.totalBalance) / 1_000_000_000;
          setBalance(suiBalance.toFixed(4));
        } catch (error) {
          console.error('Failed to fetch balance:', error);
        }
      } else {
        setBalance(null);
      }
    };

    fetchBalance();
  }, [connected, account?.address, client]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="border-b pb-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              🎉 Sui dApp Kit Integration Complete!
            </h1>
            <p className="text-gray-600">
              Official SDK từ Mysten Labs - Modern, Type-safe & Production-ready
            </p>
          </div>

          {/* Connect Button */}
          <div className="mb-8">
            <ConnectWalletButton />
          </div>

          {/* Wallet Info */}
          {connected && account && (
            <div className="space-y-4">
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                <h3 className="font-semibold text-green-800 mb-2">✅ Wallet Connected</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Address:</span>
                    <p className="font-mono text-xs text-gray-600 break-all mt-1">
                      {account.address}
                    </p>
                  </div>
                  
                  {balance && (
                    <div>
                      <span className="font-medium text-gray-700">Balance:</span>
                      <p className="text-gray-600">{balance} SUI</p>
                    </div>
                  )}

                  {account.label && (
                    <div>
                      <span className="font-medium text-gray-700">Wallet:</span>
                      <p className="text-gray-600">{account.label}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Features */}
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <h3 className="font-semibold text-blue-800 mb-2">🚀 Available Features</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>✅ Auto wallet detection (Sui, Ethos, Suiet, Martian, Glass)</li>
                  <li>✅ Type-safe hooks: useSuiClient, useCurrentAccount</li>
                  <li>✅ Sign & Execute transactions</li>
                  <li>✅ Multi-network support (Devnet, Testnet, Mainnet)</li>
                  <li>✅ Built-in UI components & modals</li>
                </ul>
              </div>
            </div>
          )}

          {!connected && (
            <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg text-center">
              <p className="text-gray-600 mb-4">
                👆 Click button trên để kết nối Sui Wallet
              </p>
              <div className="text-sm text-gray-500">
                <p>Hỗ trợ tất cả ví Sui standard:</p>
                <p className="font-medium mt-2">Sui Wallet • Ethos • Suiet • Martian • Glass</p>
              </div>
            </div>
          )}

          {/* Migration Info */}
          <div className="mt-8 pt-6 border-t">
            <h3 className="font-semibold text-gray-800 mb-3">📚 Next Steps:</h3>
            <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
              <li>Đọc <code className="bg-gray-100 px-2 py-1 rounded">DAPP_KIT_MIGRATION_GUIDE.md</code></li>
              <li>✅ Migration hoàn tất - đã update tất cả files sử dụng dApp Kit</li>
              <li>Test mint NFT, marketplace, và transaction signing</li>
              <li>Remove <code className="bg-gray-100 px-2 py-1 rounded">@suiet/wallet-kit</code> khỏi package.json</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

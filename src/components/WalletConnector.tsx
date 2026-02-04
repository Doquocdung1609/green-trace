import { useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useAuth } from '../contexts/AuthContext';

/**
 * Component để tự động lưu địa chỉ ví Sui khi user connect ví
 */
export const WalletConnector = () => {
  const currentAccount = useCurrentAccount();
  const { user } = useAuth();

  useEffect(() => {
    const saveWalletAddress = async () => {
      if (currentAccount?.address && user?.email) {
        try {
          const response = await fetch('http://localhost:3000/api/wallet/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              suiAddress: currentAccount.address,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            console.log('✅ Wallet connected:', data);
          } else {
            console.error('❌ Failed to save wallet address');
          }
        } catch (error) {
          console.error('Error saving wallet address:', error);
        }
      }
    };

    saveWalletAddress();
  }, [currentAccount?.address, user?.email]);

  return null; // Component này không render gì
};
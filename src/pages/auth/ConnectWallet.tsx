import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const ConnectWallet = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="p-6 bg-white rounded shadow">
      <h2 className="text-2xl mb-4">Connect Solana Wallet</h2>
      <WalletMultiButton />
    </div>
  </div>
);

export default ConnectWallet;
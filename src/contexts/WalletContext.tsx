import React from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';

const endpoint = 'https://api.devnet.solana.com';

const wallets = [new PhantomWalletAdapter()];

export const WalletContextProvider = ({ children }: { children: React.ReactNode }) => (
  <ConnectionProvider endpoint={endpoint}>
    <WalletProvider wallets={wallets} autoConnect>
      <WalletModalProvider>{children}</WalletModalProvider>
    </WalletProvider>
  </ConnectionProvider>
);
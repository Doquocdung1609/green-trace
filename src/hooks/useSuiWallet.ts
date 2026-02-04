import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';

export function useSuiWallet() {
  const account = useCurrentAccount();
  const client = useSuiClient();

  return {
    connected: !!account,
    account,
    client,
  };
}

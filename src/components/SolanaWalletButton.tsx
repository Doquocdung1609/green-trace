import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Check, Copy, ExternalLink, LogOut, Wallet } from "lucide-react";
import { useState } from "react";
import { getSolanaExplorerUrl } from "../solana/explorer";
import { useSolanaWallet } from "../solana/useSolanaWallet";

export function SolanaWalletButton() {
  const { setVisible } = useWalletModal();
  const { connected, address, disconnect, cluster } = useSolanaWallet();
  const [copied, setCopied] = useState(false);

  if (!connected || !address) {
    return (
      <button
        className="wallet-button"
        onClick={() => setVisible(true)}
        type="button"
      >
        <Wallet size={17} /> Kết nối Phantom
      </button>
    );
  }

  const copy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div
      className="wallet-connected"
      title="Ví dùng để ký bằng chứng và bản ghi toàn vẹn trên Solana"
    >
      <span className="wallet-cluster">{cluster}</span>
      <span className="wallet-address">
        {address.slice(0, 5)}…{address.slice(-4)}
      </span>
      <button type="button" onClick={copy} aria-label="Sao chép địa chỉ ví">
        {copied ? <Check size={15} /> : <Copy size={15} />}
      </button>
      <a
        href={getSolanaExplorerUrl(address, cluster, "address")}
        target="_blank"
        rel="noreferrer"
        aria-label="Xem ví trên Solana Explorer"
      >
        <ExternalLink size={15} />
      </a>
      <button
        type="button"
        onClick={() => void disconnect()}
        aria-label="Ngắt kết nối ví"
      >
        <LogOut size={15} />
      </button>
    </div>
  );
}

import type { Cluster } from "@solana/web3.js";

export function getSolanaExplorerUrl(
  value: string,
  cluster: Cluster = "devnet",
  kind: "tx" | "address" = "tx",
) {
  const clusterQuery = cluster === "mainnet-beta" ? "" : `?cluster=${cluster}`;
  return `https://explorer.solana.com/${kind}/${encodeURIComponent(value)}${clusterQuery}`;
}

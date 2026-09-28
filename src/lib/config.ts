import type { Cluster } from "@solana/web3.js";

const rawCluster = import.meta.env.VITE_SOLANA_CLUSTER || "devnet";

export const config = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, ""),
  solanaCluster: (["devnet", "testnet", "mainnet-beta"].includes(rawCluster)
    ? rawCluster
    : "devnet") as Cluster,
  solanaRpcUrl:
    import.meta.env.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com",
  solanaProgramId: import.meta.env.VITE_SOLANA_PROGRAM_ID || "",
  trackAsiaToken: import.meta.env.VITE_TRACK_ASIA_ACCESS_TOKEN || "",
};

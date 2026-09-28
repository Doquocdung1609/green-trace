import { clusterApiUrl } from "@solana/web3.js";
import { config } from "../lib/config";

export const solanaConfig = {
  cluster: config.solanaCluster,
  endpoint: config.solanaRpcUrl || clusterApiUrl(config.solanaCluster),
  programId: config.solanaProgramId,
};

import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  CLIENT_ORIGIN: z.string().url(),
  JWT_SECRET: z.string().min(32),
  SOLANA_CLUSTER: z
    .enum(["devnet", "testnet", "mainnet-beta"])
    .default("devnet"),
  SOLANA_RPC_URL: z.string().url(),
  SOLANA_VERIFY_TRANSACTIONS: z
    .string()
    .default("true")
    .transform((v) => v === "true"),
  PINATA_JWT: z.string().optional(),
  PUBLIC_BASE_URL: z.string().url(),
  MAX_UPLOAD_BYTES: z.coerce.number().default(10 * 1024 * 1024),
});

export const env = schema.parse(process.env);

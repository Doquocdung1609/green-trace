import { defineConfig } from 'vitest/config';

process.env.DATABASE_URL = 'file:./dev.db';
process.env.JWT_SECRET = 'test-only-secret-at-least-thirty-two-characters';
process.env.SOLANA_VERIFY_TRANSACTIONS = 'false';
process.env.NODE_ENV = 'test';
process.env.CLIENT_ORIGIN = 'http://localhost:5173';
process.env.PUBLIC_BASE_URL = 'http://localhost:3000';
process.env.SOLANA_RPC_URL = 'https://api.devnet.solana.com';

export default defineConfig({ test: { environment: 'node', sequence: { concurrent: false }, fileParallelism: false } });

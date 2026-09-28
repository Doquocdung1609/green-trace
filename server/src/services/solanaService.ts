import { Connection } from "@solana/web3.js";
import { env } from "../config.js";

const connection = new Connection(env.SOLANA_RPC_URL, "confirmed");

export async function verifySolanaTransaction(
  signature: string,
  expectedSigner: string,
  expectedRecordType: string,
  expectedPayloadHash: string,
) {
  if (!env.SOLANA_VERIFY_TRANSACTIONS) return true;
  const transaction = await connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });
  if (!transaction || transaction.meta?.err) return false;
  const signerMatches = transaction.transaction.message.accountKeys.some(
    (key) => key.signer && key.pubkey.toBase58() === expectedSigner,
  );
  if (!signerMatches) return false;
  return transaction.transaction.message.instructions.some((instruction) => {
    if (!("parsed" in instruction)) return false;
    const raw = instruction.parsed;
    const memo =
      typeof raw === "string"
        ? raw
        : raw && typeof raw === "object" && "memo" in raw
          ? String(raw.memo)
          : "";
    try {
      const payload = JSON.parse(memo) as Record<string, unknown>;
      return (
        payload.app === "GreenTrace" &&
        payload.v === 1 &&
        payload.recordType === expectedRecordType &&
        payload.payloadHash === expectedPayloadHash
      );
    } catch {
      return false;
    }
  });
}

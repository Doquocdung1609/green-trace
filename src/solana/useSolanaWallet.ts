import { useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { Buffer } from "buffer";
import { solanaConfig } from "./solanaConfig";

const MEMO_PROGRAM = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);

export function useSolanaWallet() {
  const wallet = useWallet();
  const { connection } = useConnection();

  const anchorHash = useCallback(
    async (recordType: string, payloadHash: string) => {
      if (!wallet.publicKey || !wallet.sendTransaction) {
        throw new Error("Vui lòng kết nối ví Phantom trước khi ký xác nhận.");
      }
      const memo = JSON.stringify({
        app: "GreenTrace",
        recordType,
        payloadHash,
        v: 1,
      });
      const transaction = new Transaction().add(
        new TransactionInstruction({
          keys: [
            { pubkey: wallet.publicKey, isSigner: true, isWritable: false },
          ],
          programId: MEMO_PROGRAM,
          data: Buffer.from(memo, "utf8"),
        }),
      );
      const signature = await wallet.sendTransaction(transaction, connection);
      const latest = await connection.getLatestBlockhash("confirmed");
      await connection.confirmTransaction(
        { signature, ...latest },
        "confirmed",
      );
      return signature;
    },
    [connection, wallet],
  );

  return {
    ...wallet,
    address: wallet.publicKey?.toBase58() ?? null,
    cluster: solanaConfig.cluster,
    anchorHash,
  };
}

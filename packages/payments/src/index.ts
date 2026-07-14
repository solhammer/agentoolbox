import { Connection, PublicKey } from "@solana/web3.js";

/**
 * Service wallet address — agents send SOL here to buy credits.
 * Set via SOL_SERVICE_WALLET env var.
 */
export const SERVICE_WALLET = process.env["SOL_SERVICE_WALLET"] ?? "";

/** Credits per lamport: 1 SOL = 1,000,000,000 lamports = 10,000 credits */
const LAMPORTS_PER_CREDIT = 100_000; // 0.0001 SOL per credit

/** Default Solana RPC endpoint */
const DEFAULT_RPC_URL = "https://api.mainnet-beta.solana.com";

/**
 * In-memory replay prevention (MVP).
 * Tracks tx signatures that have already been credited so they cannot be
 * redeemed a second time within the same process lifetime.
 */
const usedSignatures = new Set<string>();

export interface PaymentVerification {
  valid: boolean;
  credits: number;
  txSignature: string;
  error?: string;
  lamportsSent?: number;
  sender?: string;
}

/** Returns the number of credits earned for a given lamport amount. */
export function creditsForLamports(lamports: number): number {
  return Math.floor(lamports / LAMPORTS_PER_CREDIT);
}

/** Returns the lamports required to purchase a given number of credits. */
export function lamportsForCredits(credits: number): number {
  return credits * LAMPORTS_PER_CREDIT;
}

/**
 * Verifies a Solana transaction signature.
 *
 * The tx must:
 * 1. Exist on-chain (confirmed or finalized)
 * 2. Transfer SOL to SERVICE_WALLET
 * 3. Be < 24 hours old (replay prevention)
 *
 * Returns credits awarded based on SOL amount sent.
 * 1 credit = 0.0001 SOL (100,000 lamports)
 * 1 SOL = 10,000 credits
 */
export async function verifyPaymentTx(
  txSignature: string,
  rpcUrl?: string
): Promise<PaymentVerification> {
  // Replay prevention
  if (usedSignatures.has(txSignature)) {
    return { valid: false, credits: 0, txSignature, error: "already_used" };
  }

  if (!SERVICE_WALLET) {
    return {
      valid: false,
      credits: 0,
      txSignature,
      error: "service_wallet_not_configured",
    };
  }

  const connection = new Connection(rpcUrl ?? DEFAULT_RPC_URL, "confirmed");

  let tx;
  try {
    tx = await connection.getTransaction(txSignature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      valid: false,
      credits: 0,
      txSignature,
      error: `rpc_error: ${msg}`,
    };
  }

  if (!tx) {
    return { valid: false, credits: 0, txSignature, error: "transaction_not_found" };
  }

  // Ensure blockTime is present and within 24 hours
  const blockTime = tx.blockTime;
  if (blockTime == null) {
    return { valid: false, credits: 0, txSignature, error: "missing_block_time" };
  }
  const ageSeconds = Math.floor(Date.now() / 1000) - blockTime;
  if (ageSeconds > 86_400) {
    return { valid: false, credits: 0, txSignature, error: "transaction_too_old" };
  }

  if (!tx.meta) {
    return { valid: false, credits: 0, txSignature, error: "missing_tx_meta" };
  }

  // Locate SERVICE_WALLET in the account keys list
  let serviceWalletPubkey: PublicKey;
  try {
    serviceWalletPubkey = new PublicKey(SERVICE_WALLET);
  } catch {
    return { valid: false, credits: 0, txSignature, error: "invalid_service_wallet" };
  }

  // Both Message (legacy) and MessageV0 expose staticAccountKeys: PublicKey[].
  const accountKeys = tx.transaction.message.staticAccountKeys;
  const walletIndex = accountKeys.findIndex((key: PublicKey) =>
    key.equals(serviceWalletPubkey)
  );

  if (walletIndex === -1) {
    return {
      valid: false,
      credits: 0,
      txSignature,
      error: "service_wallet_not_in_tx",
    };
  }

  const preAmt = tx.meta.preBalances[walletIndex] ?? 0;
  const postAmt = tx.meta.postBalances[walletIndex] ?? 0;
  const lamportsSent = postAmt - preAmt;

  if (lamportsSent <= 0) {
    return {
      valid: false,
      credits: 0,
      txSignature,
      error: "no_sol_sent_to_service_wallet",
      lamportsSent,
    };
  }

  const credits = creditsForLamports(lamportsSent);
  if (credits === 0) {
    return {
      valid: false,
      credits: 0,
      txSignature,
      error: "amount_too_small",
      lamportsSent,
    };
  }

  const senderKey = accountKeys[0];

  // Mark signature as used so it cannot be redeemed again
  usedSignatures.add(txSignature);

  // exactOptionalPropertyTypes: omit optional fields rather than setting them to undefined
  return senderKey !== undefined
    ? { valid: true, credits, txSignature, lamportsSent, sender: senderKey.toBase58() }
    : { valid: true, credits, txSignature, lamportsSent };
}

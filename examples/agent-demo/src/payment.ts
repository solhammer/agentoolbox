/**
 * SOL payment helper.
 *
 * Agents should call getPricing() first to discover the service wallet
 * and rates, then optionally call buyCredits() to fund their account.
 *
 * For the demo, buyCredits() is a no-op unless AGENT_PRIVATE_KEY is set
 * in the environment — the free tier (10 calls/IP) is used by default.
 */

export interface PricingInfo {
  wallet: string;
  endpoints: Record<string, { credits: number; sol: number; usdApprox: string }>;
  conversion: { solPerCredit: number; creditsPerSol: number };
  freeTier: { calls: number; auth: boolean };
}

/**
 * Discover the service wallet and pricing.
 * Agents must call this before making a payment decision.
 */
export async function discoverPricing(baseUrl: string): Promise<PricingInfo> {
  const res = await fetch(`${baseUrl}/v1/pricing`);
  if (!res.ok) throw new Error(`Failed to fetch pricing: ${res.status}`);
  return res.json() as Promise<PricingInfo>;
}

/**
 * Buy credits by sending SOL to the service wallet.
 *
 * Requires AGENT_PRIVATE_KEY in env (base58 or JSON array of bytes).
 * Returns the transaction signature to use as a Bearer token.
 *
 * In the demo this is called only when --paid flag is passed.
 */
export async function buyCredits(
  walletAddress: string,
  solAmount: number
): Promise<string> {
  const privateKeyEnv = process.env["AGENT_PRIVATE_KEY"];
  if (!privateKeyEnv) {
    throw new Error(
      "AGENT_PRIVATE_KEY not set. " +
      "Export your agent's Solana private key as a base58 string or JSON byte array.\n" +
      "Example: export AGENT_PRIVATE_KEY='[1,2,3,...64 bytes...]'"
    );
  }

  // Dynamic import — only loaded when actually paying
  const { Connection, Keypair, SystemProgram, Transaction, sendAndConfirmTransaction, PublicKey, LAMPORTS_PER_SOL } =
    await import("@solana/web3.js");

  // Parse private key (supports both base58 string and JSON byte array)
  let secretKey: Uint8Array;
  try {
    const parsed = JSON.parse(privateKeyEnv) as number[];
    secretKey = Uint8Array.from(parsed);
  } catch {
    // Assume base58 — use Buffer decode
    // Base58-encoded Solana private keys are 64 bytes when decoded
    throw new Error(
      "AGENT_PRIVATE_KEY must be a JSON byte array (e.g. [1,2,...,64]).\n" +
      "To export from the Solana CLI: cat ~/.config/solana/id.json"
    );
  }

  const agentKeypair = Keypair.fromSecretKey(secretKey);
  const rpcUrl = process.env["SOL_RPC_URL"] ?? "https://api.mainnet-beta.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");

  const serviceWallet = new PublicKey(walletAddress);
  const lamports = Math.round(solAmount * LAMPORTS_PER_SOL);

  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: agentKeypair.publicKey,
      toPubkey: serviceWallet,
      lamports,
    })
  );

  console.log(`  → Sending ${solAmount} SOL from ${agentKeypair.publicKey.toBase58()}`);
  console.log(`  → To service wallet: ${walletAddress}`);

  const txSig = await sendAndConfirmTransaction(connection, tx, [agentKeypair]);
  console.log(`  ✅ Payment confirmed: ${txSig}`);
  console.log(`  → Credits purchased: ${Math.floor(lamports / 100_000)}`);

  return txSig;
}

// Deterministic per-(flag, context) bucketing for rollouts. Same hash on
// every SDK so the same user sees the same variation everywhere — this is
// the whole point of percentage rollouts vs random assignment.
//
// Hash: sha1(salt + "." + flagKey + "." + contextKey). Take the first 8
// bytes of the digest, drop the lowest 4 bits to get exactly 60 bits, then
// mod 100000 — matches the industry-standard "first 15 hex → mod 100000"
// recipe, padded to avoid the bias of small-int math. Ports of this engine
// (Go/Python/Ruby/Worker-binding) must use the same algorithm bit-for-bit.

const SCALE = 100_000;

export async function bucket(args: {
  salt: string;
  flagKey: string;
  contextKey: string;
}): Promise<number> {
  const input = `${args.salt}.${args.flagKey}.${args.contextKey}`;
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  const arr = new Uint8Array(digest);
  let n = 0n;
  for (let i = 0; i < 8; i++) {
    n = (n << 8n) | BigInt(arr[i] ?? 0);
  }
  const sixty = n >> 4n;
  return Number(sixty % BigInt(SCALE));
}

export function pickByWeight<V extends { variationId: string; weight: number }>(
  bucketValue: number,
  variations: V[],
): V | null {
  let cumulative = 0;
  for (const v of variations) {
    cumulative += v.weight;
    if (bucketValue < cumulative) return v;
  }
  return variations[variations.length - 1] ?? null;
}

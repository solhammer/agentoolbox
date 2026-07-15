/**
 * Jaro similarity between two strings, 0..1.
 * Dependency-free implementation.
 */
export function jaro(a: string, b: string): number {
  if (a === b) return 1;
  const la = a.length;
  const lb = b.length;
  if (la === 0 || lb === 0) return 0;

  const matchDistance = Math.max(0, Math.floor(Math.max(la, lb) / 2) - 1);
  const aMatched = new Array<boolean>(la).fill(false);
  const bMatched = new Array<boolean>(lb).fill(false);

  let matches = 0;
  for (let i = 0; i < la; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, lb);
    for (let j = start; j < end; j++) {
      if (bMatched[j]) continue;
      if (a[i] !== b[j]) continue;
      aMatched[i] = true;
      bMatched[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;

  // Count transpositions.
  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < la; i++) {
    if (!aMatched[i]) continue;
    while (k < lb && !bMatched[k]) k++;
    if (k < lb && a[i] !== b[k]) transpositions++;
    k++;
  }

  const m = matches;
  return (m / la + m / lb + (m - transpositions / 2) / m) / 3;
}

/**
 * Jaro-Winkler similarity, 0..1, boosting scores for a shared prefix
 * (up to 4 chars, scaling factor 0.1).
 */
export function jaroWinkler(a: string, b: string): number {
  const j = jaro(a, b);
  const maxPrefix = Math.min(4, Math.min(a.length, b.length));
  let prefix = 0;
  for (let i = 0; i < maxPrefix; i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  return j + prefix * 0.1 * (1 - j);
}

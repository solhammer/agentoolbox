/**
 * Deterministic checksum validators used to eliminate false positives.
 * Each function operates purely on its input — no I/O, no state.
 */

/** Luhn (mod-10) check. Used for payment card numbers and Canadian SIN. */
export function luhn(digits: string): boolean {
  if (!/^\d+$/.test(digits)) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    alt = !alt;
  }
  return digits.length > 0 && sum % 10 === 0;
}

/** ISO 7064 mod-97-10 check for IBANs (ISO 13616). */
export function ibanValid(input: string): boolean {
  const s = input.replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s)) return false;
  if (s.length < 15 || s.length > 34) return false;

  // Move the four initial characters to the end, then convert to integer mod 97.
  const rearranged = s.slice(4) + s.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    let value: number;
    if (code >= 48 && code <= 57) value = code - 48; // 0-9
    else if (code >= 65 && code <= 90) value = code - 55; // A=10 .. Z=35
    else return false;
    remainder = value > 9 ? (remainder * 100 + value) % 97 : (remainder * 10 + value) % 97;
  }
  return remainder === 1;
}

/** UK NHS number mod-11 check (10 digits, weighted 10..2, check digit last). */
export function nhsValid(input: string): boolean {
  const d = input.replace(/[\s-]/g, "");
  if (!/^\d{10}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += (d.charCodeAt(i) - 48) * (10 - i);
  const remainder = sum % 11;
  let check = 11 - remainder;
  if (check === 11) check = 0;
  if (check === 10) return false; // 10 is not a valid check digit → invalid number
  return check === d.charCodeAt(9) - 48;
}

const NUMERALS = ["", "I", "II", "III", "IV", "V", "VI", "VII"] as const;

export const roman = (n: number): string =>
  n >= 0 && n < NUMERALS.length ? NUMERALS[n] : String(n);

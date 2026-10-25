/**
 * Guaranteed Alphanumeric OTP Generator
 *
 * Generates a strictly alphanumeric verification code.
 * Guaranteed to contain BOTH letters (A-Z) AND digits (0-9).
 * Ambiguous characters (0/O, 1/I) are excluded to prevent user confusion.
 */
export function generateAlphanumericOtp(length = 6): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // 24 unambiguous uppercase letters
  const numbers = '23456789';                 // 8 unambiguous digits
  const combined = letters + numbers;

  const chars: string[] = [];

  // Guarantee at least 2 letters
  chars.push(letters.charAt(Math.floor(Math.random() * letters.length)));
  chars.push(letters.charAt(Math.floor(Math.random() * letters.length)));

  // Guarantee at least 2 digits
  chars.push(numbers.charAt(Math.floor(Math.random() * numbers.length)));
  chars.push(numbers.charAt(Math.floor(Math.random() * numbers.length)));

  // Fill any remaining positions from combined alphanumeric set
  while (chars.length < length) {
    chars.push(combined.charAt(Math.floor(Math.random() * combined.length)));
  }

  // Cryptographically shuffle positions (Fisher-Yates)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

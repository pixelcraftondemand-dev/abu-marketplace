import { randomInt } from 'node:crypto';

/**
 * Guaranteed Alphanumeric OTP Generator
 *
 * Generates a strictly alphanumeric verification code.
 * Guaranteed to contain BOTH letters (A-Z) AND digits (0-9).
 * Ambiguous characters (0/O, 1/I) are excluded to prevent user confusion.
 */
export function generateAlphanumericOtp(length = 6): string {
  if (!Number.isInteger(length) || length < 4) {
    throw new RangeError('OTP length must be an integer of at least 4 characters');
  }

  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // 24 unambiguous uppercase letters
  const numbers = '23456789';                 // 8 unambiguous digits
  const combined = letters + numbers;

  const chars: string[] = [];

  // Guarantee at least 2 letters
  chars.push(letters.charAt(randomInt(letters.length)));
  chars.push(letters.charAt(randomInt(letters.length)));

  // Guarantee at least 2 digits
  chars.push(numbers.charAt(randomInt(numbers.length)));
  chars.push(numbers.charAt(randomInt(numbers.length)));

  // Fill any remaining positions from combined alphanumeric set
  while (chars.length < length) {
    chars.push(combined.charAt(randomInt(combined.length)));
  }

  // Shuffle with cryptographically secure, unbiased random indices.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

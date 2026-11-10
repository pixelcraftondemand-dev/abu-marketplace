export const MAX_STORE_LOGO_BYTES = 5 * 1024 * 1024;

const LOGO_SIGNATURES = {
  'image/jpeg': { extension: 'jpg', bytes: [0xff, 0xd8, 0xff] },
  'image/png': { extension: 'png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
} as const;

export function getStoreLogoExtension(contentType: string, bytes: Uint8Array): string | null {
  if (!bytes.length || bytes.length > MAX_STORE_LOGO_BYTES) return null;

  const mimeType = contentType.split(';', 1)[0].trim().toLowerCase();
  if (mimeType === 'image/webp') {
    return bytes.length >= 12 &&
      String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP'
      ? 'webp'
      : null;
  }

  const signature = LOGO_SIGNATURES[mimeType as keyof typeof LOGO_SIGNATURES];
  if (!signature || bytes.length < signature.bytes.length) return null;
  return signature.bytes.every((byte, index) => bytes[index] === byte) ? signature.extension : null;
}
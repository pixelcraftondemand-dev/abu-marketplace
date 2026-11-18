/**
 * Store logo preparation in the browser.
 *
 * Phone photos are routinely 5–12 MB, which the API refuses because a serverless
 * request body is capped at 4.5 MB. Rather than turning those merchants away, the
 * chosen image is downscaled and re-encoded here before it is sent, so the upload
 * carries a few hundred kilobytes instead of a full-resolution camera original.
 */

/** Mirrors the limit enforced by the server logo route. */
export const STORE_LOGO_MAX_BYTES = 4 * 1024 * 1024;
/** Refuse absurd files up front instead of decoding them into a canvas. */
export const STORE_LOGO_MAX_SOURCE_BYTES = 25 * 1024 * 1024;
export const STORE_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Longest edge of the stored logo. The form previews it at 64px, so 1024 is generous. */
const LOGO_MAX_EDGE = 1024;
/** Anything heavier than this is re-encoded; smaller files are already fine to send. */
const LOGO_COMPRESS_ABOVE_BYTES = 1024 * 1024;

/**
 * The size the logo is drawn at: the original when it already fits, otherwise scaled
 * down so its longest edge is `maxEdge`, keeping the aspect ratio.
 */
export function logoTargetSize(
  width: number,
  height: number,
  maxEdge: number = LOGO_MAX_EDGE,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Encodes the canvas, resolving null when the browser cannot produce that type. */
function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob(resolve, type, quality);
    } catch {
      resolve(null);
    }
  });
}

/** Gives the re-encoded image a matching extension so the server name check stays sensible. */
function renameForType(name: string, type: string): string {
  const stem = name.replace(/\.[^.]*$/, '') || 'store-logo';
  const extension = type === 'image/webp' ? 'webp' : type === 'image/png' ? 'png' : 'jpg';
  return `${stem}.${extension}`;
}

/**
 * Returns a logo file that is safe to upload: the original when it is already small,
 * otherwise a downscaled copy under the API limit, or the original unchanged when the
 * browser cannot decode or re-encode it (the caller then reports the size problem).
 */
export async function prepareStoreLogo(file: File): Promise<File> {
  if (file.size <= LOGO_COMPRESS_ABOVE_BYTES) return file;
  // Server-side rendering, tests, and very old browsers have nothing to draw with.
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') return file;

  let bitmap: ImageBitmap;
  try {
    // Decodes EXIF-rotated phone photos the right way up.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }

  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return file;

    // Each attempt trades resolution and quality for weight, ending well inside the cap.
    const attempts = [
      { edge: LOGO_MAX_EDGE, quality: 0.9 },
      { edge: LOGO_MAX_EDGE, quality: 0.75 },
      { edge: 768, quality: 0.8 },
      { edge: 640, quality: 0.7 },
      { edge: 512, quality: 0.7 },
    ];

    for (const attempt of attempts) {
      const { width, height } = logoTargetSize(bitmap.width, bitmap.height, attempt.edge);
      if (!width || !height) return file;
      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);
      context.drawImage(bitmap, 0, 0, width, height);

      // WebP keeps transparency and compresses far better; PNG is the alpha-safe fallback.
      for (const type of ['image/webp', 'image/png']) {
        const blob = await encode(canvas, type, attempt.quality);
        if (!blob) continue;
        if (blob.size <= STORE_LOGO_MAX_BYTES && blob.size < file.size) {
          return new File([blob], renameForType(file.name, type), { type, lastModified: Date.now() });
        }
      }
    }

    return file;
  } finally {
    bitmap.close?.();
  }
}

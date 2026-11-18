import assert from 'node:assert/strict';
import test from 'node:test';
import {
  STORE_LOGO_MAX_BYTES,
  STORE_LOGO_MAX_SOURCE_BYTES,
  logoTargetSize,
  prepareStoreLogo,
} from '../src/lib/logoImage.ts';

test('keeps an image that already fits inside the longest edge', () => {
  assert.deepEqual(logoTargetSize(1024, 1024), { width: 1024, height: 1024 });
  assert.deepEqual(logoTargetSize(640, 480), { width: 640, height: 480 });
});

test('scales the longest edge down and keeps the aspect ratio', () => {
  assert.deepEqual(logoTargetSize(4000, 3000), { width: 1024, height: 768 });
  assert.deepEqual(logoTargetSize(3000, 4000), { width: 768, height: 1024 });
  assert.deepEqual(logoTargetSize(4032, 3024, 512), { width: 512, height: 384 });
});

test('never rounds a scaled dimension down to zero', () => {
  assert.deepEqual(logoTargetSize(10000, 1), { width: 1024, height: 1 });
  assert.deepEqual(logoTargetSize(0, 500), { width: 0, height: 0 });
});

test('leaves a file that needs no shrinking untouched', async () => {
  const small = new File([new Uint8Array(64 * 1024)], 'logo.png', { type: 'image/png' });
  assert.equal(await prepareStoreLogo(small), small);
});

test('returns the original file when the browser cannot decode it', async () => {
  // No document or createImageBitmap outside a browser, so the file must pass through
  // unchanged rather than throwing at the call site.
  const heavy = new File([new Uint8Array(6 * 1024 * 1024)], 'photo.png', { type: 'image/png' });
  assert.equal(await prepareStoreLogo(heavy), heavy);
});

test('the source ceiling sits above the upload limit so photos are compressed, not refused', () => {
  assert.ok(STORE_LOGO_MAX_SOURCE_BYTES > STORE_LOGO_MAX_BYTES);
  assert.equal(STORE_LOGO_MAX_BYTES, 4 * 1024 * 1024);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MerchantHubModal } from '../src/components/MerchantHubModal';
import { getStoreLogoExtension, MAX_STORE_LOGO_BYTES } from '../server/storeLogo.ts';

test('accepts supported image signatures', () => {
  assert.equal(getStoreLogoExtension('image/jpeg', Uint8Array.from([0xff, 0xd8, 0xff, 0x00])), 'jpg');
  assert.equal(getStoreLogoExtension('image/png', Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'png');
  assert.equal(getStoreLogoExtension('image/webp', Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])), 'webp');
});

test('rejects unsupported types, mismatched signatures, and oversized files', () => {
  assert.equal(getStoreLogoExtension('image/svg+xml', Uint8Array.from([0x3c, 0x73, 0x76, 0x67])), null);
  assert.equal(getStoreLogoExtension('image/png', Uint8Array.from([0xff, 0xd8, 0xff])), null);
  assert.equal(getStoreLogoExtension('image/png', new Uint8Array(MAX_STORE_LOGO_BYTES + 1)), null);
});

test('Store form renders the authenticated logo upload control and preview', () => {
  const markup = renderToStaticMarkup(
    React.createElement(MerchantHubModal, {
      isOpen: true,
      onClose: () => undefined,
      onAddProduct: () => undefined,
      currentUser: {
        id: 'user_test',
        name: 'Test Merchant',
        provider: 'clerk',
        isVerified: true,
        role: 'buyer',
        joinedAt: 'Nov 2026',
      },
    }),
  );

  assert.match(markup, /id="store-logo-upload"/);
  assert.match(markup, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(markup, /Maximum 5 MB/);
  assert.match(markup, /Upload logo/);
});
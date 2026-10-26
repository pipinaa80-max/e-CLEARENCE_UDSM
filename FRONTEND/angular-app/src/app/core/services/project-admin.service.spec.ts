import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { normalizeBrandAssetUrl } from './project-admin.service';

describe('normalizeBrandAssetUrl', () => {
  it.each([
    ['/public/background.png', '/public/background.png'],
    ['public/background.png', '/public/background.png'],
    ['C:\\project\\public\\background.png', '/public/background.png']
  ])('preserves Angular public asset path %s', (value, expected) => {
    expect(normalizeBrandAssetUrl(value)).toBe(expected);
  });

  it('normalizes local root-relative paths', () => {
    expect(normalizeBrandAssetUrl('/assets/logo.png')).toBe('/assets/logo.png');
  });

  it('does not rewrite remote URLs', () => {
    expect(normalizeBrandAssetUrl('https://example.com/background.png')).toBe('https://example.com/background.png');
  });
});

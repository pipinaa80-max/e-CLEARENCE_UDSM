import { describe, expect, it } from 'vitest';
import {
  DEFAULT_UDSM_BRAND_COLOR,
  normalizeUdsmBrandColor,
  UDSM_BRAND_COLORS
} from './udsm-brand-colors';

describe('UDSM brand color palette', () => {
  it('contains only the six approved colors', () => {
    expect(UDSM_BRAND_COLORS).toEqual([
      { name: 'Dutch Blue', hex: '#0864AF' },
      { name: 'White', hex: '#FFFFFF' },
      { name: 'Forest Green', hex: '#38574D' },
      { name: 'Golden Yellow', hex: '#F6B418' },
      { name: 'Red', hex: '#DE0500' },
      { name: 'Black', hex: '#000000' }
    ]);
  });

  it('accepts approved colors case-insensitively and ignores surrounding whitespace', () => {
    expect(normalizeUdsmBrandColor(' #0864af ')).toBe('#0864AF');
  });

  it.each(['#123456', '', null, undefined, 42])('falls back to Dutch Blue for unapproved value %s', (value) => {
    expect(normalizeUdsmBrandColor(value)).toBe(DEFAULT_UDSM_BRAND_COLOR);
  });
});

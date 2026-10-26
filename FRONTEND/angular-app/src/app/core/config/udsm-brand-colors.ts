export const UDSM_BRAND_COLORS = [
  { name: 'Dutch Blue', hex: '#0864AF' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Forest Green', hex: '#38574D' },
  { name: 'Golden Yellow', hex: '#F6B418' },
  { name: 'Red', hex: '#DE0500' },
  { name: 'Black', hex: '#000000' }
] as const;

export const DEFAULT_UDSM_BRAND_COLOR = UDSM_BRAND_COLORS[0].hex;

export function normalizeUdsmBrandColor(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_UDSM_BRAND_COLOR;

  const normalized = value.trim().toUpperCase();
  return UDSM_BRAND_COLORS.find(color => color.hex === normalized)?.hex ?? DEFAULT_UDSM_BRAND_COLOR;
}

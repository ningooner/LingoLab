// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
// Port of the contrast helpers in legacy `lib/helpers.ts`.

export type RGB = [number, number, number];

export function getLuminance(rgb: RGB): number {
  const [r, g, b] = rgb.map((channel) => {
    const v = channel / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as RGB;
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

/** Inverse WCAG contrast: between 1/21 and 1, and *lower* means more contrast. */
export function getContrast(foreground: RGB, background: RGB): number {
  const fg = getLuminance(foreground);
  const bg = getLuminance(background);
  return bg < fg ? (bg + 0.05) / (fg + 0.05) : (fg + 0.05) / (bg + 0.05);
}

export function getRgbColorFromHex(hex: string): RGB {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** Black or white, whichever reads better on the given `#rrggbb` background. */
export function getForegroundColor(background: string): 'black' | 'white' {
  const rgb = getRgbColorFromHex(background);
  return getContrast([0, 0, 0], rgb) < getContrast([255, 255, 255], rgb) ? 'black' : 'white';
}

// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { describe, expect, it } from 'vitest';
import { getForegroundColor, getRgbColorFromHex } from './color';

describe('getRgbColorFromHex', () => {
  it('splits a hex colour into its channels', () => {
    expect(getRgbColorFromHex('#E69F00')).toEqual([230, 159, 0]);
  });
});

describe('getForegroundColor', () => {
  it.each([
    ['#ffffff', 'black'],
    ['#F0E442', 'black'],
    ['#E69F00', 'black'],
    ['#000000', 'white'],
    ['#0072B2', 'white'],
  ])('picks the readable text colour on %s', (background, expected) => {
    expect(getForegroundColor(background)).toBe(expected);
  });
});

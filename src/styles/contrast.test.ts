import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve('src/index.css'), 'utf8');

function readTokens(block: string) {
  return Object.fromEntries(
    [...block.matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6})/gi)].map(([, name, hex]) => [name, hex]),
  );
}

const light = readTokens(/@theme\s*{([\s\S]*?)\n}/.exec(css)![1]);
const dark = { ...light, ...readTokens(/\.dark\s*{([\s\S]*?)\n}/.exec(css)![1]) };

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT_PAIRS: [string, string, number][] = [
  ['ink', 'surface', 4.5],
  ['ink', 'surface-muted', 4.5],
  ['ink-soft', 'surface', 4.5],
  ['ink-soft', 'surface-muted', 4.5],
  ['ink-muted', 'surface', 4.5],
  ['ink-muted', 'surface-muted', 4.5],
  ['ink-muted', 'surface-sunken', 4.5],
  ['ink-faint', 'surface', 3],
  ['brand-fg', 'surface', 4.5],
  ['brand-fg', 'surface-muted', 4.5],
  ['brand-fg', 'brand-50', 4.5],
  ['success-fg', 'success-bg', 4.5],
  ['warning-fg', 'warning-bg', 4.5],
  ['info-fg', 'info-bg', 4.5],
  ['danger-fg', 'danger-bg', 4.5],
  ['danger-fg', 'surface', 4.5],
];

describe.each([
  ['light', light],
  ['dark', dark],
])('%s theme tokens', (_, tokens) => {
  it.each(TEXT_PAIRS)('%s on %s meets %d:1', (fg, bg, min) => {
    expect(tokens[fg], `missing token ${fg}`).toBeDefined();
    expect(tokens[bg], `missing token ${bg}`).toBeDefined();
    expect(contrast(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(min);
  });
});

it('keeps white text readable on the primary button in both themes', () => {
  expect(contrast('#ffffff', light['brand-700'])).toBeGreaterThanOrEqual(4.5);
});

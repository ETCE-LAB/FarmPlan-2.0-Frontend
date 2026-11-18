import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from './redirect';

describe('safeRedirectPath', () => {
  it('keeps app paths with query strings', () => {
    expect(safeRedirectPath('/farms/abc?field=f-1')).toBe('/farms/abc?field=f-1');
  });

  it.each([null, '', 'https://evil.example', '//evil.example', '/\\evil.example', '/login', '/login?from=/x'])(
    'falls back for %s',
    (value) => {
      expect(safeRedirectPath(value)).toBe('/farms');
    },
  );
});

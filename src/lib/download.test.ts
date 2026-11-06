import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadJson, slugify } from './download';

describe('slugify', () => {
  it.each([
    ['Gutshof Neorx', 'gutshof-neorx'],
    ['Biohof Groß-Ölsburg', 'biohof-gross-olsburg'],
    ['  --Hof!!  ', 'hof'],
    ['???', 'export'],
  ])('%s → %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('downloadJson', () => {
  afterEach(() => vi.restoreAllMocks());

  it('creates a blob link with the file name and clicks it', async () => {
    const createObjectURL = vi.fn((blob: Blob) => {
      void blob;
      return 'blob:test';
    });
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    downloadJson('test.json', { a: 1 });

    expect(click).toHaveBeenCalledOnce();
    const anchor = click.mock.contexts[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('test.json');
    expect(await (createObjectURL.mock.calls[0][0] as Blob).text()).toBe('{\n  "a": 1\n}');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
});

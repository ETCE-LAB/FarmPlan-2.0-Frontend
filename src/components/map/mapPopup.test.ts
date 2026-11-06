import { describe, expect, it } from 'vitest';
import { popupElement } from './mapPopup';

describe('popupElement', () => {
  it('renders user-provided text without interpreting HTML', () => {
    const el = popupElement(['<img src=x onerror=alert(1)>', 'Fläche: 1 ha']);
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toContain('<img src=x onerror=alert(1)>');
  });
});

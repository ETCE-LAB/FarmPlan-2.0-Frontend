import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { m2ToHa } from '@farm/lib/geo';
import type { NumericRange } from '@farm/types';

export function createFormatters(locale: string) {
  const number = (value: number, maximumFractionDigits = 1) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);

  return {
    number,
    range: ({ min, max }: NumericRange, unit: string) =>
      min === max ? `${number(min)} ${unit}` : `${number(min)}–${number(max)} ${unit}`,
    hectares: (m2: number, digits = 2) => `${number(m2ToHa(m2), digits)} ha`,
    squareMetres: (m2: number) => `${number(m2, 0)} m²`,
    celsius: (value: number) => `${number(value)} °C`,
  };
}

export function useFormat() {
  const { i18n } = useTranslation();
  return useMemo(() => createFormatters(i18n.language), [i18n.language]);
}

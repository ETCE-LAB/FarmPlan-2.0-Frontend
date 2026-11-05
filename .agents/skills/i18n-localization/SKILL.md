---
name: i18n-localization
description: Add and change visible FarmPlan texts in German and English with typed react-i18next keys, plurals, and locale-aware number formatting.
---

# Internationalization

## Preparation

Read `AGENTS.md`. Inspect `src/i18n/index.ts`, `src/i18n/locales/de.ts`, `src/i18n/locales/en.ts`, and `src/lib/format.ts`.

## Rules

- German is the reference locale; English is required. `en.ts` is type-checked against the structure of `de.ts`, and `t('…')` calls are typed, so a missing key fails `tsc`.
- Every visible text goes through `t('…')`, including `aria-label`, `title`, placeholders, toasts, and document titles. No hard-coded UI strings in components.
- Group keys by area: `nav.*`, `farms.*`, `map.*`, `plants.*`, `backup.*`, `geojson.*`, `common.*`.
- Plurals use `_one` and `_other` with `t('key', { count })`.
- Never format numbers, areas, or units by hand. Use `useFormat()` (`number`, `hectares`, `range`, `celsius`, …), which follows the active language's decimal separator.
- Error codes returned by `src/lib` functions double as keys, for example `geojson.errors.<code>`. Add a key for every new code.
- Content that comes from data, such as plant names and descriptions, uses `…De` and `…En` fields in the data, not locale files.
- The active language lives in `useFarmStore` (`language`); `src/i18n/index.ts` syncs i18next and `<html lang>`. Do not change the language through i18next directly.
- Code identifiers, comments, and documentation stay in English.

## Workflow

1. Add the key to `de.ts`, run `npx tsc -b`, add the reported missing key to `en.ts`.
2. Use the key in the component; tests run in German by default (`src/test/setup.ts`).
3. Check both languages in the UI, especially for long German words in narrow layouts.
4. Validate with `../frontend-validation/SKILL.md`.

## Done when

Both locales contain every key, the typecheck passes, numbers are formatted through `useFormat`, and no visible string is hard-coded.

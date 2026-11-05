---
name: design-system-tailwind
description: Build FarmPlan UI with Tailwind CSS v4 design tokens, shared building blocks, dark mode, WCAG 2.1 AA accessibility, and responsive layouts.
---

# Design system and Tailwind

## Preparation

Read `AGENTS.md`. Inspect `src/index.css`, `src/components/ui`, `src/components/shared/PageHeader.tsx`, and `src/styles/contrast.test.ts`.

## Tokens

All colors are tokens in `src/index.css` (`@theme`), used through Tailwind classes:

| Group    | Tokens                                                                 | Use                                                                        |
| -------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Brand    | `brand-900`, `brand-700`, `brand-300`, `brand-50`, `brand-fg`          | Sidebar, primary buttons, accent text                                      |
| Surfaces | `surface`, `surface-muted`, `surface-sunken`                           | Cards, page background, inputs                                             |
| Lines    | `line`, `line-subtle`                                                  | Borders, dividers                                                          |
| Text     | `ink`, `ink-soft`, `ink-muted`, `ink-faint`                            | Body, secondary, hints; `faint` only for placeholders and decorative icons |
| Status   | `success-*`, `warning-*`, `info-*`, `danger-*` (`-bg`, `-line`, `-fg`) | Badges, notices, errors                                                    |

- Use `bg-surface text-ink-soft border-line`, never `bg-white text-slate-600 border-[#dce3dc]`.
- Dark mode only overrides the token variables under `.dark`, so components almost never need `dark:` variants. Exception: categorical colors such as `StratumBadge`.
- New color: add the token in `@theme` **and** `.dark`, and add the pair to `contrast.test.ts`.

## Building blocks

Check these before writing new markup: `Card` (title as `h2`), `Button` and `buttonClass()` for links, `TextField`/`SelectField`/`TextAreaField` (labels linked through `useId`), `Badge` and `DemoBadge`, `PageHeader` (`h1`, back link, document title), and `cn()` for class merging.

## Accessibility (WCAG 2.1 AA)

- One `h1` per page from `PageHeader`; card titles `h2`, then `h3`.
- Every input has a visible, linked label. Icon buttons have an `aria-label`; decorative icons are `aria-hidden`.
- Express state with `aria-pressed`, `aria-expanded`, `aria-sort`, and `aria-current`.
- Toasts live in an `aria-live` region; errors use `role="alert"`.
- Dialogs use the native `<dialog>` through `ConfirmDialogHost`; for destructive actions, "Cancel" gets focus.

## Responsive

Mobile first: base classes for small screens, extend with `sm:`, `lg:`, `xl:`. Below `lg`, the sidebar is a toggleable menu. Tables sit in `overflow-x-auto`; maps use `h-[60vh] min-h-[360px]`.

## Done when

Only tokens are used, the contrast test passes, the UI works in light and dark mode at about 390 px and on desktop, and axe reports no structural violations. Validate with `../frontend-validation/SKILL.md`.

# Greenhouse Button Primitive V1

## Status

- Status: Active
- Created: 2026-06-07
- Runtime: `src/components/greenhouse/primitives/GreenhouseButton.tsx`
- Controller: `src/components/greenhouse/primitives/greenhouse-button-controller.ts`
- Lab: `/admin/design-system/buttons`
- GVC scenario: `design-system-buttons`

## Purpose

`GreenhouseButton` is the canonical reusable primitive for product buttons. It adapts the AXIS Figma Buttons canvas into the Greenhouse runtime without creating a parallel theme or hardcoding AXIS colors/type in views.

Use it for new platform/product buttons when the button needs reusable emphasis, tone, size, icon placement, `kind` semantics, or GVC hooks. Existing raw MUI/Vuexy buttons can migrate by slice.

## Variants

Official variants:

- `solid`: high-emphasis command. Maps to MUI/Vuexy `contained`.
- `label`: medium-emphasis tonal command. Maps to MUI/Vuexy `tonal`.
- `outlined`: medium-emphasis alternative command. Maps to MUI/Vuexy `outlined`.
- `text`: low-emphasis inline command. Maps to MUI/Vuexy `text`.

Variants are functional emphasis modes, not skins. Do not create a new variant only to change color, radius, shadow, or icon.

## Tones

Official tones: `primary`, `secondary`, `error`, `warning`, `info`, `success`.

Colors must come from the MUI/Vuexy theme and AXIS semantic palette. Do not hardcode HEX values in product consumers or labs.

## Sizes

Official sizes:

- `large`: 48px min block size, icon 20px, label metadata `controlText.lg`
- `medium`: 38px min block size, icon 16px, label metadata `controlText.md`
- `small`: 30px min block size, icon 14px, label metadata `controlText.sm`

Button label typography is inherited from the MUI/Vuexy Button theme. The primitive does not set label `fontSize`, `fontWeight`, or `fontFamily`; only icon size is set by the button size token.

## Kinds

Official kinds:

- `primaryAction`: defaults to `solid` / `primary`
- `secondaryAction`: defaults to `label` / `secondary`
- `destructiveAction`: defaults to `solid` / `error`
- `inlineAction`: defaults to `text` / `primary`
- `navigation`: defaults to `label` / `primary`
- `filter`: defaults to `outlined` / `primary`
- `custom`: defaults to `label` / `primary`

Consumers should prefer `kind` when the semantic job is clear. Use explicit `variant` or `tone` when a local action group needs to override the default mapping.

## Props

Primary props:

- `children`
- `variant`
- `tone`
- `size`
- `kind`
- `leadingIcon` / `leadingIconClassName`
- `trailingIcon` / `trailingIconClassName`
- `dataCapture`
- `reserveInlineSize`

The primitive emits `data-variant`, `data-tone`, `data-kind`, and optional `data-capture` for verification.

## Async Actions

`GreenhouseAsyncActionButton` composes `GreenhouseButton`.

Use `GreenhouseAsyncActionButton` when the button represents a temporary command state: `idle`, `loading`, `success`, or `error`. It owns double-submit protection, spinner/success/error affordances, `aria-busy`, `aria-live`, and status live region behavior.

Compatibility:

- Legacy `variant='contained'|'tonal'|'outlined'|'text'` is translated to `solid|label|outlined|text`.
- Legacy `color` is translated to `tone`.
- New consumers may pass `greenhouseVariant` and `tone` directly.

## Lab Governance

The Buttons Lab is internal only and gated by `administracion.design_system`. It uses `AxisWordmark`, not external template branding. Its colors derive from `axis-tokens.ts` and `axis-semantic.ts`; its typography uses MUI variants rather than inline type literals.

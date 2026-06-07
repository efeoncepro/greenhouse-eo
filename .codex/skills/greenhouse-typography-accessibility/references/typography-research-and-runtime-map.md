# Typography Research And Runtime Map

This reference backs the `greenhouse-typography-accessibility` skill. Load it
when the task needs deeper justification, source links, or a full map of
Greenhouse Poppins/Geist roles.

## External Research Summary

Primary sources reviewed:

- W3C WCAG 2.2: https://www.w3.org/TR/WCAG22/
- W3C Understanding SC 1.4.12 Text Spacing: https://www.w3.org/WAI/WCAG21/Understanding/text-spacing
- U.S. Web Design System Typography: https://designsystem.digital.gov/components/typography/
- Material Design 3 Typography via Android Developers: https://developer.android.com/develop/ui/compose/designsystems/material3#typography
- Material Web Typography tokens: https://material-web.dev/theming/typography/
- Carbon Design System Typography: https://carbondesignsystem.com/elements/typography/overview/
- IBM Design Language Type scale: https://www.ibm.com/design/language/typography/type-scale/
- Apple HIG Typography page was checked, but the accessible public page requires JavaScript; use it as a secondary reference only unless opened in a browser.

Key conclusions:

1. Typography is a token system, not isolated CSS. Material defines type scale
   roles as family + size + line-height + weight; Carbon and USWDS also treat
   typesetting as a tokenized system.

2. Product systems separate expressive/display type from productive/task type.
   Carbon explicitly separates productive styles for task-focused product UI
   from expressive styles for editorial/marketing. This maps well to
   Greenhouse: Poppins is expressive/display; Geist is productive/task UI.

3. Body text needs comfortable size and spacing. USWDS recommends at least an
   effective 16px for most body/running text, with smaller sizes used sparingly
   for captions, footnotes, data tables, and specialized UI.

4. WCAG contrast is still the floor. WCAG 2.2 SC 1.4.3 requires `4.5:1` for
   normal text and `3:1` for large-scale text. Large type does not make weak
   contrast acceptable everywhere; it only changes the threshold.

5. Weight does not replace contrast. Thin or low-contrast text can pass poorly
   in real rendering because anti-aliasing/font smoothing affects apparent
   stroke coverage. Use contrast-safe color first, then weight.

6. Text-spacing resilience matters. WCAG SC 1.4.12 does not require authors to
   set all text to large spacing; it requires no loss of content/functionality
   when users override line height to at least 1.5, paragraph spacing to 2x,
   letter spacing to 0.12em, and word spacing to 0.16em.

7. Material 3 uses a reduced set of roles in real products. It defines 15
   styles, but explicitly notes a product may choose a smaller subset. That
   supports Greenhouse's narrower semantic scale.

8. Repeated labels should not all be heavy. Design systems distinguish display,
   headline/title, body, and label roles because weights create local hierarchy.
   If all row labels, column headers, and section headings use `700/800`, scan
   hierarchy collapses.

## Greenhouse Runtime Map

Source of truth: `src/components/theme/typography-tokens.ts`.

Families:

- `fontFamilies.display`: Poppins stack.
- `fontFamilies.text`: Geist stack.

Weights:

- `regular`: 400
- `medium`: 500 (available, no semantic role)
- `semibold`: 600
- `bold`: 700
- `extrabold`: 800

Font sizes:

- `5xl`: `2rem` / 32px
- `4xl`: `1.75rem` / 28px
- `3xl`: `1.5rem` / 24px
- `2xl`: `1.25rem` / 20px
- `xl`: `1.125rem` / 18px (primitive remains, not every step is a live contract role)
- `lg`: `1rem` / 16px
- `md`: `0.9375rem` / 15px (primitive)
- `sm`: `0.875rem` / 14px
- `xs`: `0.8125rem` / 13px
- `2xs`: `0.75rem` / 12px

Live scale tokens:

| Token | MUI/runtime | Family | Size | Weight | Use |
|---|---|---|---:|---:|---|
| `headlineDisplay` | `h1` | Poppins | 32 | 800 | top display |
| `headlineLg` | `h2` | Poppins | 24 | 700 | large display heading |
| `headlineMd` | `h3` | Poppins | 20 | 600 | medium display heading |
| `pageTitle` | `h4` | Poppins | 20 | 600 | product page title |
| `sectionTitle` | `h5` | Geist | 16 | 600 | section/card/drawer title |
| `subheader` | `subtitle1` | Geist | 14 | 400 | list/card subheader |
| `labelLg` | control token | Geist | 16 | 600 | large control label |
| `labelMd` | `button` | Geist | 14 | 600 | button/tab/control label |
| `labelSm` | control token | Geist | 13 | 600 | small label |
| `bodyLg` | `body1` | Geist | 16 | 400 | readable body |
| `bodyMd` | `body2` | Geist | 14 | 400 | dense product body/table/helper |
| `bodySm` | `caption`/`subtitle2` | Geist | 13 | 400 | metadata/timestamps |
| `overline` | `overline` | Geist | 12 | 600 | uppercase compact label |
| `numericId` | `monoId` | Geist | 14 | 600 | IDs, tabular nums |
| `numericAmount` | `monoAmount` | Geist | 13 | 700 | money/amounts |
| `kpiValue` | `kpiValue` | Geist | 28 | 800 | KPI hero numbers |

Secondary variants:

- `h6` reuses `labelMd`.
- `subtitle2` reuses `bodySm`.

Control text:

- `controlText.sm`: 14
- `controlText.md`: 14
- `controlText.lg`: 16

PDF registered families:

- Geist: `Geist`, `Geist Medium`, `Geist SemiBold`, `Geist Bold`, `Geist ExtraBold`
- Poppins: `Poppins Medium`, `Poppins` (SemiBold), `Poppins Bold`, `Poppins ExtraBold`, `Poppins ExtraBold Italic`, `Poppins Black`, `Poppins Black Italic`
- DM Sans remains temporarily registered as deprecated compatibility.

PDF adapter:

- `src/lib/finance/pdf/pdf-typography.ts` maps semantic roles to registered
  font family names. It derives family/weight from the web SoT but uses
  medium-specific sizes in `pt`.

## Practical Greenhouse Decisions

When a UI feels too bold:

- Lower repeated labels before lowering the primary title.
- Keep section headers at `Geist 600`; avoid `800`.
- Use `bodySm/bodyMd` plus `text.secondary` for secondary metadata.
- Use spacing, grouping, dashed/border containers, and alignment before adding
  weight.
- Preserve `Geist 600` for controls; do not fight Button/Chip primitives.

When implementing Figma typography:

- Treat Figma as intent, not direct runtime CSS.
- Map Figma text styles to Greenhouse roles.
- If Figma uses many bold labels inside a matrix/table, normalize to the
  Greenhouse density model and verify by screenshot.
- If Figma includes text in images, recreate as semantic text when possible.
- For internal `/admin/design-system/**` labs, route-local specimen typography
  may mirror AXIS/Figma when the page is documenting a component canvas. Do not
  promote those values into shared tokens unless they become product roles.

When checking contrast:

- Verify foreground/background pairs in both light and dark.
- Normal text: AA floor `4.5:1`.
- Large-scale text: AA floor `3:1`.
- Non-text UI states need non-color cues too; do not rely on color or weight.

When changing tokens:

- Use `design-system-governance`.
- Update `typographyScale`, runtime theme, `DESIGN.md`, architecture docs, and
  drift tests together.
- Run `pnpm design:lint` and the typography drift tests.

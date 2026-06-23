import { z } from 'zod'

/**
 * `comparisonTable.v1` — governed manifest contract for the public-site
 * `greenhouse_comparison_table` Elementor widget (TASK-1224 / TASK-1225).
 *
 * SOURCE-OF-TRUTH ALIGNMENT: this schema mirrors 1:1 the widget's PUBLIC
 * `theme_schema()` (`class-eo-comparison-table-widget.php`, runtime repo) +
 * its content controls. The widget emits `data-gh-schema="comparisonTable.v1"`
 * so this version string is the drift anchor between Greenhouse and WordPress.
 *
 * WHY ZOD (despite the greenhouse-backend skill's general "no new Zod" default):
 * this is a programmatic boundary contract meant to be introspected and
 * `safeParse`-gated by multiple consumers (admin API, future Nexa/MCP), exactly
 * the pattern already established for `finance/pricing/simulate-input-schema.ts`
 * (TASK-1211) and `commercial/submit-quote-from-builder-schema.ts`. `zod` is
 * already a dependency; reusing the established boundary-contract idiom keeps the
 * validator introspectable and the reject-before-write gate trivial.
 */

export const COMPARISON_TABLE_SCHEMA_VERSION = 'comparisonTable.v1' as const

/**
 * CSS color guard mirroring the widget's PHP `is_safe_css_color()` — hex,
 * rgb/rgba, hsl/hsla, or a CSS named color. Defense-in-depth: the value is
 * validated here before it ever reaches an inline style on the widget.
 */
const cssColorSchema = z
  .string()
  .trim()
  .regex(
    /^#[0-9a-fA-F]{3,8}$|^(?:rgb|rgba|hsl|hsla)\([0-9.,%\s/]+\)$|^[a-zA-Z]{3,20}$/u,
    'color CSS inválido (usa hex, rgb/rgba, hsl/hsla o color nombrado)'
  )

export const COMPARISON_TABLE_ICON_KINDS = ['none', 'check', 'cross'] as const
const iconKindSchema = z.enum(COMPARISON_TABLE_ICON_KINDS)

export const COMPARISON_TABLE_PRESETS = ['globe', 'neutral'] as const

const rowSchema = z
  .object({
    dimension: z.string().trim().min(1, 'la dimensión es obligatoria').max(200),
    cellA: z.string().max(2000).default(''),
    cellAIcon: iconKindSchema.default('none'),
    cellB: z.string().max(2000).default(''),
    cellBIcon: iconKindSchema.default('check'),
  })
  .strict()

/**
 * Theme overrides — every field optional; an omitted field inherits the preset
 * (matches the widget: empty control = preset default). Semantic names map to
 * the widget's `c_*` setting keys in the node builder (mapManifestToWidgetSettings).
 */
const themeSchema = z
  .object({
    preset: z.enum(COMPARISON_TABLE_PRESETS).optional(),
    radiusPx: z.number().int().min(0).max(64).optional(),
    crimson: cssColorSchema.optional(),
    amber: cssColorSchema.optional(),
    amberTop: cssColorSchema.optional(),
    aubTop: cssColorSchema.optional(),
    aubMid: cssColorSchema.optional(),
    aubBot: cssColorSchema.optional(),
    globeTop: cssColorSchema.optional(),
    globeMid: cssColorSchema.optional(),
    globeBot: cssColorSchema.optional(),
    ribbon: cssColorSchema.optional(),
    ribbonDark: cssColorSchema.optional(),
    ribbonFold: cssColorSchema.optional(),
  })
  .strict()

const columnBSchema = z
  .object({
    title: z.string().max(120).default(''),
    logoUrl: z.string().url('logoUrl debe ser una URL válida').max(2048).optional(),
    isBest: z.boolean().default(true),
    bestLabel: z.string().trim().max(40).default('BEST OPTION'),
  })
  .strict()

export const comparisonTableManifestSchema = z
  .object({
    schemaVersion: z.literal(COMPARISON_TABLE_SCHEMA_VERSION),
    dimensionLabel: z.string().trim().min(1).max(120).default('Dimensión'),
    columnA: z
      .object({ title: z.string().trim().min(1, 'columnA.title es obligatorio').max(120) })
      .strict(),
    columnB: columnBSchema,
    rows: z.array(rowSchema).min(1, 'se requiere al menos 1 fila').max(20, 'máximo 20 filas'),
    theme: themeSchema.optional(),
  })
  .strict()

export type ComparisonTableManifest = z.infer<typeof comparisonTableManifestSchema>
export type ComparisonTableRow = z.infer<typeof rowSchema>
export type ComparisonTableTheme = z.infer<typeof themeSchema>

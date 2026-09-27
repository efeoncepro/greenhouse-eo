/**
 * Manifiesto de una edición de Glitch (`GlitchEditionManifest`, `schemaVersion: 1`) — TASK-1923.
 *
 * Es el contrato de datos que comparten el CLI `pnpm glitch:compose`, las composiciones de movimiento del taller
 * (TASK-1924, sección `video`) y la ruta productiva futura; mañana lo producirá el dominio de ediciones (TASK-1442).
 *
 * Reglas del contrato:
 * - `strict`: un campo desconocido se rechaza, así nunca se cuela un `template` o un `coverTemplate` de esta edición.
 *   La portada la deciden el contenido y la plantilla de la semana anterior (`previousEdition.coverTemplate`).
 * - Los largos máximos NO viven aquí: son de cada plantilla (`*.slots.json`, `overflow: "reject"`). El mapper no recorta.
 * - Toda foto trae crédito (se pinta) y licencia (se valida). Licencias admitidas: `licensed`, `owned`, `generated`
 *   (decisión del operador, 2026-09-27: el kit de prensa NO cuenta).
 * - `faceRegions` es obligatorio y explícito: `[]` dice «sin rostros». La falla en bytes nunca cae sobre uno.
 * - La numeración es dato: el composer no decide la serie.
 */

import { z } from 'zod'

import { GlitchPieceError, type GlitchIssue } from './types'

const nonEmpty = z.string().trim().min(1)
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fecha ISO AAAA-MM-DD')
const unit = z.number().min(0).max(1)

/** Caja normalizada a la foto (0–1 en ambos ejes). */
export const glitchRegionSchema = z
  .object({ x: unit, y: unit, w: unit.positive(), h: unit.positive() })
  .strict()
  .refine((r) => r.x + r.w <= 1 && r.y + r.h <= 1, 'la región se sale de la foto')

/** Titular o POV con contraste de pesos: entrada ligera + remate pesado. */
export const glitchHeadlineSchema = z.object({ entry: nonEmpty, punch: nonEmpty }).strict()

export const GLITCH_PHOTO_LICENSE_KINDS = ['licensed', 'owned', 'generated'] as const

export const glitchPhotoSchema = z
  .object({
    /** Relativo al manifiesto (local); un asset ref en la ruta productiva. */
    file: nonEmpty,
    /** Se pinta en la lámina. */
    credit: nonEmpty,
    /** Se valida; nunca se pinta. */
    license: z.object({ kind: z.enum(GLITCH_PHOTO_LICENSE_KINDS), ref: nonEmpty }).strict(),
    /** Candidata a portada A cuando es la foto de la noticia de portada. */
    strong: z.boolean(),
    fractureEdge: z.enum(['bottom', 'left', 'right']),
    faceRegions: z.array(glitchRegionSchema)
  })
  .strict()

export const GLITCH_SECTIONS = ['marketing', 'creatividad', 'tecnologia'] as const

export const glitchNewsSchema = z
  .object({
    id: z.string().regex(/^n[1-8]$/, 'ids n1 … n8'),
    section: z.enum(GLITCH_SECTIONS),
    headline: nonEmpty,
    outlet: nonEmpty,
    date: isoDate,
    photo: glitchPhotoSchema,
    /** Remate del Glitch Drop (entrada 300 + remate 800 condensado, cerrado con la manzana). */
    pov: glitchHeadlineSchema,
    /** El porqué en Poppins. */
    why: nonEmpty,
    /**
     * Variante ocasional con la lente de La órbita: SÓLO cuando el POV trata de un detalle nítido de la foto. Lo
     * declara el contenido (la región del detalle), nunca una plantilla. Esa lámina no cierra con la manzana.
     */
    lens: z.object({ region: glitchRegionSchema }).strict().nullable().default(null)
  })
  .strict()

/** Campos del archivo de edición del taller de motion (TASK-1924), para que migre sin perder datos. */
export const glitchVideoSchema = z
  .object({
    host: z.object({ name: nonEmpty, role: nonEmpty }).strict(),
    guest: z.object({ name: nonEmpty, role: nonEmpty }).strict().nullable(),
    /** Las tres noticias del video, por id y en orden. */
    newsIds: z.array(z.string()).length(3),
    /** Las noticias del video con su titular corto (el motion lo pinta en pantalla). */
    shortHeadlines: z.record(z.string(), nonEmpty),
    drop: z.object({ newsId: z.string() }).strict(),
    cta: z.object({ reel: nonEmpty, vlog: nonEmpty }).strict(),
    transition: z.enum(['basic', 'bytes']).default('basic')
  })
  .strict()

export const GLITCH_STILL_OUTPUTS = /^(cover|back|interior:n[1-8]|blog:banner|blog:square|blog:news:n[1-8]|reel:cover|video:thumbnail)$/

export const glitchEditionManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    /** Marca un manifiesto con noticias y fotos de ejemplo: nunca se publica. */
    example: z.boolean().default(false),
    edition: z
      .object({
        number: z.number().int().positive(),
        publishDate: isoDate,
        weekRange: z.object({ from: isoDate, to: isoDate }).strict()
      })
      .strict(),
    /** Tesis de la edición (apertura y blog). */
    thesis: nonEmpty,
    /** `none` explícito en la primera edición compuesta. */
    previousEdition: z
      .object({ number: z.number().int().positive(), coverTemplate: z.enum(['A', 'B', 'C', 'none']) })
      .strict(),
    cover: z
      .object({
        newsId: z.string(),
        /** Candidata B: un POV que pega solo. */
        standalonePov: glitchHeadlineSchema.nullable(),
        /** Candidata C: exactamente cuatro noticias del mismo peso. */
        mosaic: z.array(z.string()).length(4).nullable(),
        /** Muletilla del narrador en Guttery («spoiler:»). */
        muletilla: nonEmpty.nullable(),
        /** Titular de portada con contraste de pesos. */
        headline: glitchHeadlineSchema,
        /** Dos líneas de portada «+ IA»: otras dos noticias de la edición, en seis palabras (la sección sale de la noticia). */
        lines: z.array(z.object({ newsId: z.string(), text: nonEmpty }).strict()).length(2)
      })
      .strict(),
    news: z.array(glitchNewsSchema).length(8),
    back: z.object({ closingLine: nonEmpty }).strict(),
    video: glitchVideoSchema.nullable().default(null),
    /** Piezas sueltas pedidas además del carrusel. */
    outputs: z
      .object({
        stills: z.array(z.string().regex(GLITCH_STILL_OUTPUTS, 'pieza suelta desconocida')).default([]),
        overlays: z.array(z.string()).default([])
      })
      .strict()
      .default({ stills: [], overlays: [] })
  })
  .strict()
  .superRefine((m, ctx) => {
    const ids = m.news.map((n) => n.id)

    ids.forEach((id, i) => {
      if (id !== `n${i + 1}`) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['news', i, 'id'], message: `las noticias van en orden: se esperaba n${i + 1}` })
    })

    const known = new Set(ids)

    const ref = (id: string, path: (string | number)[]) => {
      if (!known.has(id)) ctx.addIssue({ code: z.ZodIssueCode.custom, path, message: `noticia desconocida: ${id}` })
    }

    ref(m.cover.newsId, ['cover', 'newsId'])
    m.cover.lines.forEach((line, i) => ref(line.newsId, ['cover', 'lines', i, 'newsId']))
    m.cover.mosaic?.forEach((id, i) => ref(id, ['cover', 'mosaic', i]))

    if (m.cover.mosaic && new Set(m.cover.mosaic).size !== 4) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cover', 'mosaic'], message: 'el mosaico lleva cuatro noticias distintas' })
    }

    if (m.edition.weekRange.from > m.edition.weekRange.to) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['edition', 'weekRange'], message: 'la semana termina antes de empezar' })
    }

    if (m.previousEdition.number >= m.edition.number) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['previousEdition', 'number'], message: 'la edición anterior debe tener un número menor' })
    }

    if (m.video) {
      m.video.newsIds.forEach((id, i) => ref(id, ['video', 'newsIds', i]))
      ref(m.video.drop.newsId, ['video', 'drop', 'newsId'])

      if (!m.video.newsIds.includes(m.video.drop.newsId)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['video', 'drop', 'newsId'], message: 'el Drop comenta una de las noticias del video' })
      }

      for (const id of m.video.newsIds) {
        if (!m.video.shortHeadlines[id]) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['video', 'shortHeadlines', id], message: 'falta el titular corto de la noticia del video' })
      }
    }
  })

export type GlitchEditionManifest = z.infer<typeof glitchEditionManifestSchema>
export type GlitchNews = z.infer<typeof glitchNewsSchema>
export type GlitchHeadline = z.infer<typeof glitchHeadlineSchema>
export type GlitchRegion = z.infer<typeof glitchRegionSchema>

const pathOf = (path: readonly (string | number)[]) =>
  path.reduce<string>((acc, part) => (typeof part === 'number' ? `${acc}[${part}]` : acc ? `${acc}.${part}` : part), '')

/** Traduce los issues de zod a issues legibles con la ruta del campo. */
const toIssues = (error: z.ZodError): GlitchIssue[] =>
  error.issues.map((issue) => ({
    code: issue.code === 'unrecognized_keys' ? 'field-unknown' : issue.code === 'invalid_type' && issue.received === 'undefined' ? 'field-required' : 'field-invalid',
    path: pathOf(issue.path) || undefined,
    message: issue.code === 'unrecognized_keys' ? `campo no admitido: ${issue.keys.join(', ')}` : issue.message
  }))

/** Valida un manifiesto; devuelve el manifiesto normalizado o lanza `GlitchPieceError('manifest-invalid')`. */
export const parseGlitchEditionManifest = (input: unknown): GlitchEditionManifest => {
  const result = glitchEditionManifestSchema.safeParse(input)

  if (!result.success) {
    const issues = toIssues(result.error)

    throw new GlitchPieceError(`El manifiesto de edición no es válido (${issues.length} problemas).`, 'manifest-invalid', issues)
  }

  return result.data
}

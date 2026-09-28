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

import { glitchLine } from '@efeoncepro/axis-tokens'
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
    transition: z.enum(['basic', 'bytes']).default('basic'),
    /** Foto del host con un gesto fuerte (portada del reel y miniatura del vlog). Propia: licencia, nunca crédito pintado. */
    hostPhoto: z
      .object({
        file: nonEmpty,
        license: z.object({ kind: z.enum(GLITCH_PHOTO_LICENSE_KINDS), ref: nonEmpty }).strict(),
        faceRegions: z.array(glitchRegionSchema)
      })
      .strict()
      .nullable()
      .default(null),
    /** Titular de la portada del reel y de la miniatura («3 noticias.» + «Un solo aviso»). */
    cover: glitchHeadlineSchema.nullable().default(null)
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
        /** El kit de overlays en PNG con transparencia, por formato. */
        overlays: z.array(z.enum(['reel', 'vlog'])).default([])
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

    const needsHost = m.outputs.stills.some((o) => o === 'reel:cover' || o === 'video:thumbnail')

    if (needsHost && !m.video?.hostPhoto) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['video', 'hostPhoto'], message: 'la portada del reel y la miniatura del vlog necesitan la foto del host' })
    }

    if (needsHost && !m.video?.cover) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['video', 'cover'], message: 'la portada del reel y la miniatura del vlog necesitan su titular' })
    }

    if (m.outputs.overlays.length > 0 && !m.video) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['video'], message: 'los overlays salen del video de la edición: falta la sección video' })
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

/** Mensaje en español para los issues de zod que no traen uno propio (los `refine` del esquema ya vienen en español). */
const messageOf = (issue: z.ZodIssue): string => {
  switch (issue.code) {
    case 'unrecognized_keys':
      return `campo no admitido: ${issue.keys.join(', ')}`
    case 'invalid_type':
      return issue.received === 'undefined' ? 'falta este campo' : `tipo no válido: se esperaba ${issue.expected}`
    case 'invalid_literal':
      return `valor no válido: se esperaba ${JSON.stringify(issue.expected)}`
    case 'invalid_enum_value':
      return `valor no admitido: usa ${issue.options.map((o) => JSON.stringify(o)).join(', ')}`
    case 'too_small':
      return issue.type === 'array' ? `faltan elementos: se esperan ${issue.exact ? 'exactamente ' : 'al menos '}${issue.minimum}` : issue.type === 'string' ? 'no puede estar vacío' : `el valor mínimo es ${issue.minimum}`
    case 'too_big':
      return issue.type === 'array' ? `sobran elementos: se esperan ${issue.exact ? 'exactamente ' : 'como máximo '}${issue.maximum}` : `el valor máximo es ${issue.maximum}`
    case 'invalid_string':
      return 'formato no válido'
    default:
      return issue.message
  }
}

/** Traduce los issues de zod a issues legibles con la ruta del campo. */
const toIssues = (error: z.ZodError): GlitchIssue[] =>
  error.issues.map((issue) => ({
    code: issue.code === 'unrecognized_keys' ? 'field-unknown' : issue.code === 'invalid_type' && issue.received === 'undefined' ? 'field-required' : 'field-invalid',
    path: pathOf(issue.path) || undefined,
    message: issue.code === 'custom' || (issue.code === 'invalid_string' && issue.message !== 'Invalid') ? issue.message : messageOf(issue)
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

// ─── Glitch Flash (operador, 2026-09-28) ───────────────────────────────────────────────────────────────────────────

/**
 * Manifiesto de un GLITCH FLASH (`GlitchFlashManifest`, `schemaVersion: 1`, `edition.kind: 'flash'`).
 *
 * Glitch tiene dos formatos (`glitchLine.editions` de AXIS): la edición semanal (este archivo, arriba) y el Flash, que se
 * dispara ante una noticia puntual y NO es la edición entera. Es un tipo hermano, no una rama del semanal: el esquema
 * semanal queda idéntico y un manifiesto semanal valida igual que antes. Lo distingue `edition.kind: 'flash'`
 * (`parseGlitchManifest` despacha).
 *
 * Reglas del Flash:
 * - Sin número de edición, sin `previousEdition` y sin rotación de portada: queda fuera de la rotación (su portada es la
 *   pieza `flash-portada`, que deriva de la portada A). Un número se rechaza con `flash-edition-number-not-allowed`.
 * - Exactamente una noticia. Su foto va en la lámina interior y en el banner interno; la portada puede traer otra
 *   (`cover.photo`, la imagen de la portada del anuncio) o repetir la de la noticia.
 * - `back.closingLine` es obligatoria y VARÍA en cada Flash (el gesto del narrador): una línea o dos
 *   (`["léelo completo", "en nuestro blog."]`). Nunca el número de la próxima edición ni una frase rechazada por el
 *   operador (`narratorCloser.rejected` del token).
 * - Sin avance n/8: el pie sólo lleva «Desliza» y la mano. Los chips salen del token («LA NOTICIA», «ANUNCIO»).
 */

const FLASH = glitchLine.editions.flash

/** Foto del Flash: la de la semanal sin `strong` (la portada del Flash no se elige por rotación). */
export const glitchFlashPhotoSchema = glitchPhotoSchema.omit({ strong: true })

export const glitchFlashNewsSchema = z
  .object({
    section: z.enum(GLITCH_SECTIONS),
    headline: nonEmpty,
    outlet: nonEmpty,
    date: isoDate,
    photo: glitchFlashPhotoSchema,
    /** El Glitch Drop de la noticia (entrada 300 + remate 800, cerrado con la manzana). */
    pov: glitchHeadlineSchema,
    why: nonEmpty
  })
  .strict()

/** Piezas del Flash además del carrusel (la portada, la noticia y la contraportada sueltas; Threads y el blog). */
export const GLITCH_FLASH_STILL_OUTPUTS = ['cover', 'interior', 'back', 'threads', 'blog:banner', 'blog:news'] as const

const closingLineSchema = z.union([nonEmpty, z.array(nonEmpty).min(1).max(FLASH.narratorCloser.lines)])

export const glitchFlashManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    example: z.boolean().default(false),
    edition: z
      .object({
        kind: z.literal('flash'),
        /** Identificador del Flash en archivos y artefactos (`glitch-flash-<slug>`). */
        slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug en minúsculas con guiones (claude-sonnet-5-5)'),
        /** Título del documento («Glitch Flash · <título>»). */
        title: nonEmpty,
        publishDate: isoDate
      })
      .strict(),
    news: z.array(glitchFlashNewsSchema).length(1),
    cover: z
      .object({
        /** La imagen de la portada; `null` repite la foto de la noticia. */
        photo: glitchFlashPhotoSchema.nullable().default(null),
        headline: glitchHeadlineSchema,
        /** Dos líneas «+ IA» de portada: dos lecturas de la misma noticia, cada una con su sección. */
        lines: z.array(z.object({ section: z.enum(GLITCH_SECTIONS), text: nonEmpty }).strict()).length(2)
      })
      .strict(),
    back: z.object({ closingLine: closingLineSchema }).strict(),
    outputs: z
      .object({ stills: z.array(z.enum(GLITCH_FLASH_STILL_OUTPUTS)).default([]) })
      .strict()
      .default({ stills: [] })
  })
  .strict()
  .superRefine((m, ctx) => {
    const lines = glitchFlashClosingLines(m)
    const normalize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim()
    const rejected = new Set<string>(FLASH.narratorCloser.rejected.map(normalize))

    if (rejected.has(normalize(lines.join(' ')))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['back', 'closingLine'], message: 'el operador rechazó esta muletilla (no se escucha natural): el gesto del narrador varía en cada Flash' })
    }

    if (lines.some((line) => /#\s*(?:\d|N\b)/i.test(line))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['back', 'closingLine'], message: 'un Flash no anuncia la próxima edición por número' })
    }

    if (new Set(m.outputs.stills).size !== m.outputs.stills.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['outputs', 'stills'], message: 'una pieza suelta pedida dos veces' })
    }
  })

export type GlitchFlashManifest = z.infer<typeof glitchFlashManifestSchema>
export type GlitchFlashNews = z.infer<typeof glitchFlashNewsSchema>

/** La muletilla de la contraportada del Flash, siempre como lista de líneas. */
export function glitchFlashClosingLines(manifest: Pick<GlitchFlashManifest, 'back'>): string[] {
  const line = manifest.back.closingLine

  return typeof line === 'string' ? [line] : [...line]
}

/** Campos de la edición semanal que un Flash no lleva: el mensaje dice por qué, no sólo «campo no admitido». */
const FLASH_FORBIDDEN: Record<string, { code: string; message: string }> = {
  'edition.number': { code: 'flash-edition-number-not-allowed', message: 'Un Glitch Flash no lleva número de edición (no es la edición entera): la cabecera dice «NO ESPERA AL LUNES» y «FLASH».' },
  'edition.weekRange': { code: 'field-unknown', message: 'un Glitch Flash no cubre una semana: sale el día de la noticia' },
  previousEdition: { code: 'field-unknown', message: 'un Glitch Flash queda fuera de la rotación de portadas: no declara la edición anterior' },
  video: { code: 'field-unknown', message: 'un Glitch Flash no tiene video (el reel y el vlog son de la edición semanal)' },
  thesis: { code: 'field-unknown', message: 'un Glitch Flash no lleva tesis de edición: la cuenta la noticia' }
}

/** Un manifiesto es de Flash cuando su edición declara `kind: 'flash'`. */
export const isGlitchFlashManifestInput = (input: unknown): boolean => {
  const edition = (input as { edition?: unknown } | null)?.edition

  return typeof edition === 'object' && edition !== null && (edition as { kind?: unknown }).kind === 'flash'
}

/** Valida un manifiesto de Flash; devuelve el manifiesto normalizado o lanza `GlitchPieceError('manifest-invalid')`. */
export const parseGlitchFlashManifest = (input: unknown): GlitchFlashManifest => {
  const result = glitchFlashManifestSchema.safeParse(input)

  if (!result.success) {
    const closing = (input as { back?: { closingLine?: unknown } } | null)?.back?.closingLine

    const issues = result.error.issues.flatMap((issue): GlitchIssue[] => {
      // La muletilla es una línea o una lista de hasta dos: el error de la unión dice cuál de las dos cosas falta.
      if (issue.code === 'invalid_union' && pathOf(issue.path) === 'back.closingLine') {
        return [
          closing === undefined
            ? { code: 'field-required', path: 'back.closingLine', message: 'falta la muletilla de la contraportada: el gesto del narrador varía en cada Flash' }
            : { code: 'field-invalid', path: 'back.closingLine', message: `la muletilla es una línea o una lista de hasta ${FLASH.narratorCloser.lines} líneas, sin vacías` }
        ]
      }

      if (issue.code !== 'unrecognized_keys') return toIssues(new z.ZodError([issue]))

      return issue.keys.map((key) => {
        const path = pathOf([...issue.path, key])
        const known = FLASH_FORBIDDEN[path]

        return known ? { code: known.code, path, message: known.message } : { code: 'field-unknown', path, message: `campo no admitido: ${key}` }
      })
    })

    throw new GlitchPieceError(`El manifiesto del Glitch Flash no es válido (${issues.length} problemas).`, 'manifest-invalid', issues)
  }

  return result.data
}

export type GlitchManifest = GlitchEditionManifest | GlitchFlashManifest

/** Valida un manifiesto de cualquiera de los dos formatos (`edition.kind: 'flash'` o la edición semanal). */
export const parseGlitchManifest = (input: unknown): GlitchManifest => (isGlitchFlashManifestInput(input) ? parseGlitchFlashManifest(input) : parseGlitchEditionManifest(input))

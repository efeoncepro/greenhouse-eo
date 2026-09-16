import type { HiggsfieldJsonSchema } from './higgsfield-capabilities'

/**
 * Reglas de entrada de Higgsfield: traduce los flags genéricos de la CLI a los campos de CADA endpoint y valida el
 * cuerpo final contra su JSON Schema antes de gastar.
 *
 * Por qué acá y no en el proveedor: la estimación del proveedor también valida, pero devuelve un mensaje por vez y
 * en inglés. La validación local lista todos los problemas juntos, en español, y nombra el flag que los arregla.
 * Las dos capas conviven: lo que el subconjunto local no cubre lo rechaza la estimación, sin cobrar.
 *
 * Funciones puras: no leen archivos ni red (las URLs de medios llegan ya subidas).
 */

export interface HiggsfieldFlagValues {
  prompt?: string
  /** URLs públicas ya resueltas, en el orden de los flags. */
  images: string[]
  endImage?: string
  videos: string[]
  audios: string[]
  duration?: string
  resolution?: string
  aspect?: string
  seed?: string
  count?: number
  format?: string
  noAudio: boolean
  thinking: boolean
  webUrl?: string
  fileUrl?: string
  noPromptExpansion: boolean
  /** JSON de `--input`, ya parseado. Se fusiona al final y gana sobre los flags. */
  extraInput?: Record<string, unknown>
}

export interface HiggsfieldInputBuild {
  input: Record<string, unknown>
  /** Decisiones que la CLI tomó por el operador (resolución por defecto, etc.). */
  notes: string[]
}

type Properties = Record<string, HiggsfieldJsonSchema>

const propertiesOf = (schema: HiggsfieldJsonSchema): Properties => (schema.properties ?? {}) as Properties

const has = (properties: Properties, field: string) => Object.prototype.hasOwnProperty.call(properties, field)

const firstField = (properties: Properties, candidates: string[]) => candidates.find(field => has(properties, field)) ?? null

const enumOf = (property: HiggsfieldJsonSchema | undefined): unknown[] | null =>
  property && Array.isArray(property.enum) ? (property.enum as unknown[]) : null

/**
 * Orden de costo de una resolución: `480p` < `720p` < `1080p` < `1k` < `2k` < `4k`. Los valores `Nk` se tratan como
 * ≥ 1080p. Desconocidos al final para no elegirlos como "la más barata".
 */
export const rankHiggsfieldResolution = (value: unknown): number => {
  const match = /^(\d+(?:\.\d+)?)\s*(p|k)$/i.exec(String(value).trim())

  if (!match) return Number.POSITIVE_INFINITY

  const amount = Number(match[1])

  return match[2].toLowerCase() === 'k' ? 1080 + amount * 1000 : amount
}

/** Construye el cuerpo de la request. Lanza con un mensaje accionable si un flag no aplica al endpoint. */
export const buildHiggsfieldInput = (params: {
  capabilityLabel: string
  schema: HiggsfieldJsonSchema | null
  flags: HiggsfieldFlagValues
}): HiggsfieldInputBuild => {
  const { flags, capabilityLabel } = params
  const input: Record<string, unknown> = {}
  const notes: string[] = []

  // Sin esquema (endpoint fuera del snapshot vía --model): mapeo directo por convención; valida la estimación.
  const properties = params.schema ? propertiesOf(params.schema) : null

  const reject = (flag: string, hint?: string): never => {
    throw new Error(`${flag} no aplica a "${capabilityLabel}"${hint ? `: ${hint}` : ''}.`)
  }

  const assign = (flag: string, candidates: string[], value: unknown, hint?: string) => {
    const field = properties ? firstField(properties, candidates) : candidates[0]

    if (!field) reject(flag, hint)
    input[field as string] = value
  }

  if (flags.prompt) assign('--prompt', ['prompt'], flags.prompt)

  // ── Imágenes: un campo singular recibe la primera; el plural, la lista ─────────────────────────
  if (flags.images.length) {
    const single = properties ? firstField(properties, ['image_url', 'first_frame_url']) : 'image_url'
    const plural = properties ? (has(properties, 'image_urls') ? 'image_urls' : null) : 'image_urls'

    if (flags.images.length === 1 && single) {
      input[single] = flags.images[0]
    } else if (plural) {
      input[plural] = flags.images
    } else if (single) {
      reject('--image', `recibe una sola imagen (${single}); pasaste ${flags.images.length}`)
    } else {
      reject('--image', 'el endpoint no recibe imágenes de entrada')
    }
  }

  if (flags.endImage) assign('--end-image', ['end_image_url', 'last_image_url', 'last_frame_url'], flags.endImage, 'no acepta último cuadro')

  // ── Videos: si hay `video_url`, el primero es el ORIGEN (editar/extender); el resto, referencias ─
  if (flags.videos.length) {
    const source = properties ? (has(properties, 'video_url') ? 'video_url' : null) : null
    const references = properties ? (has(properties, 'video_urls') ? 'video_urls' : null) : 'video_urls'
    const pending = [...flags.videos]

    if (source) input[source] = pending.shift()

    if (pending.length) {
      if (!references) reject('--video', source ? 'recibe un solo video de origen' : 'el endpoint no recibe video')
      input[references as string] = pending
    }
  }

  if (flags.audios.length) {
    const plural = properties ? (has(properties, 'audio_urls') ? 'audio_urls' : null) : 'audio_urls'
    const single = properties ? (has(properties, 'audio_url') ? 'audio_url' : null) : null

    if (plural) input[plural] = flags.audios
    else if (single && flags.audios.length === 1) input[single] = flags.audios[0]
    else reject('--audio', single ? 'recibe un solo audio' : 'el endpoint no recibe audio')
  }

  // ── Parámetros de generación ───────────────────────────────────────────────────────────────────
  if (flags.duration !== undefined) {
    const seconds = Number(flags.duration)

    if (!Number.isInteger(seconds) || seconds <= 0) throw new Error(`--duration "${flags.duration}" debe ser un entero de segundos.`)
    assign('--duration', ['duration'], seconds, 'la duración la fija el modelo o el medio de origen')
  }

  const resolutionProperty = properties?.resolution
  const resolutions = enumOf(resolutionProperty)

  if (flags.resolution) {
    const canonical = resolutions?.find(value => String(value).toLowerCase() === flags.resolution!.toLowerCase())

    if (properties && !resolutionProperty) reject('--resolution', 'el endpoint no expone resolución')

    if (resolutions && canonical === undefined) {
      throw new Error(`--resolution "${flags.resolution}" no está en "${capabilityLabel}". Opciones: ${resolutions.join(', ')}.`)
    }

    input.resolution = canonical ?? flags.resolution
  } else if (resolutions && resolutions.length > 1) {
    // Mismo criterio que fal: sin --resolution, la más barata y explícita (Wan 3.0 trae 1080p por defecto).
    const cheapest = [...resolutions].sort((a, b) => rankHiggsfieldResolution(a) - rankHiggsfieldResolution(b))[0]

    if (rankHiggsfieldResolution(cheapest) !== Number.POSITIVE_INFINITY) {
      input.resolution = cheapest
      notes.push(`sin --resolution: uso ${String(cheapest)}, la más barata (opciones: ${resolutions.join(', ')})`)
    }
  }

  if (flags.aspect) assign('--aspect', ['aspect_ratio'], flags.aspect, 'el encuadre sale del medio de entrada')

  if (flags.seed !== undefined) {
    const seed = Number(flags.seed)

    if (!Number.isInteger(seed) || seed < 0) throw new Error('--seed debe ser un entero >= 0.')
    assign('--seed', ['seed'], seed, 'el endpoint no acepta semilla')
  }

  if (flags.count !== undefined) assign('--count', ['batch_size'], flags.count, 'el endpoint genera una sola salida por request')
  if (flags.format) assign('--format', ['output_format'], flags.format, 'el formato de salida es fijo')

  if (flags.noAudio) {
    const field = properties ? firstField(properties, ['generate_audio', 'sound']) : 'generate_audio'

    if (!field) reject('--no-audio', 'el endpoint no genera audio')
    input[field as string] = field === 'sound' ? 'off' : false
  }

  if (flags.thinking) assign('--thinking', ['enable_thinking'], true, 'el endpoint no tiene modo de razonamiento')
  if (flags.webUrl) assign('--web-url', ['link_url'], flags.webUrl, 'sólo Wan 3.0 referencias a video se basa en una web')
  if (flags.fileUrl) assign('--file', ['file_url'], flags.fileUrl, 'sólo Wan 3.0 referencias a video se basa en un documento')

  if (flags.noPromptExpansion) {
    const field = properties ? firstField(properties, ['enhance_prompt', 'prompt_extend', 'prompt_optimizer']) : 'enhance_prompt'

    if (!field) reject('--no-prompt-expansion', 'el endpoint no reescribe el prompt')
    input[field as string] = false
  }

  if (flags.extraInput) Object.assign(input, flags.extraInput)

  return { input, notes }
}

// ── Validación (subconjunto de JSON Schema que usan los esquemas de Higgsfield) ─────────────────────

const typeMatches = (type: string, value: unknown): boolean => {
  switch (type) {
    case 'string': return typeof value === 'string'
    case 'integer': return typeof value === 'number' && Number.isInteger(value)
    case 'number': return typeof value === 'number' && Number.isFinite(value)
    case 'boolean': return typeof value === 'boolean'
    case 'array': return Array.isArray(value)
    case 'object': return typeof value === 'object' && value !== null && !Array.isArray(value)
    case 'null': return value === null
    default: return true
  }
}

const show = (value: unknown) => (typeof value === 'string' ? `"${value}"` : JSON.stringify(value))

/**
 * Los esquemas de Higgsfield usan `if/else` sólo para "al menos uno de" (referencias de Seedance):
 * `if: {required:[a]}, else: {if: {required:[b]}, else: {required:[c]}}`. Devuelve `[a, b, c]` o `null` si la forma es otra.
 */
const requiredChain = (schema: HiggsfieldJsonSchema): string[] | null => {
  const condition = schema.if as HiggsfieldJsonSchema | undefined

  const onlyRequired = (node: HiggsfieldJsonSchema | undefined) =>
    node && Array.isArray(node.required) && node.required.length === 1 ? String(node.required[0]) : null

  if (!condition) return onlyRequired(schema) ? [onlyRequired(schema) as string] : null
  if (schema.then !== undefined) return null

  const head = onlyRequired(condition)
  const tail = schema.else && typeof schema.else === 'object' ? requiredChain(schema.else as HiggsfieldJsonSchema) : null

  return head && tail ? [head, ...tail] : null
}

/**
 * Evalúa un `if` de los que usan estos esquemas: `required` (campos presentes) y `properties` con `const`/`enum`
 * (p. ej. Kling O3: `multi_shots: {const: true}`). Un campo ausente toma el `default` del esquema; si tampoco hay
 * default, la condición NO se cumple (el proveedor trata el ausente como su default, no como "vale cualquier cosa").
 */
const conditionHolds = (condition: HiggsfieldJsonSchema, value: Record<string, unknown>, root: HiggsfieldJsonSchema): boolean => {
  const required = Array.isArray(condition.required) ? (condition.required as string[]) : []

  if (!required.every(field => value[field] !== undefined)) return false

  const rootProperties = propertiesOf(root)

  return Object.entries(propertiesOf(condition)).every(([field, rule]) => {
    const actual = value[field] !== undefined ? value[field] : rootProperties[field]?.default

    if (actual === undefined) return false
    if (rule.const !== undefined && actual !== rule.const) return false

    const options = enumOf(rule)

    return !options || options.includes(actual)
  })
}

const validateNode = (schema: HiggsfieldJsonSchema, value: unknown, path: string, errors: string[]) => {
  const type = schema.type

  if (typeof type === 'string' && !typeMatches(type, value)) {
    errors.push(`${path}: se esperaba ${type}, llegó ${show(value)}`)

    return
  }

  if (schema.const !== undefined && value !== schema.const) errors.push(`${path}: debe ser ${show(schema.const)}`)

  const allowed = enumOf(schema)

  if (allowed && !allowed.some(option => option === value)) {
    errors.push(`${path}: ${show(value)} no es válido (opciones: ${allowed.join(', ')})`)
  }

  if (typeof value === 'number') {
    if (typeof schema.minimum === 'number' && value < schema.minimum) errors.push(`${path}: mínimo ${schema.minimum}, llegó ${value}`)
    if (typeof schema.maximum === 'number' && value > schema.maximum) errors.push(`${path}: máximo ${schema.maximum}, llegó ${value}`)

    if (typeof schema.multipleOf === 'number') {
      const ratio = value / schema.multipleOf

      if (Math.abs(ratio - Math.round(ratio)) > 1e-6) errors.push(`${path}: debe ser múltiplo de ${schema.multipleOf}`)
    }
  }

  if (typeof value === 'string') {
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) errors.push(`${path}: mínimo ${schema.minLength} caracteres`)
    if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) errors.push(`${path}: máximo ${schema.maxLength} caracteres (llegaron ${value.length})`)
    if (schema.format === 'uri' && !/^https?:\/\//i.test(value)) errors.push(`${path}: debe ser una URL pública http(s)`)
  }

  if (Array.isArray(value)) {
    if (typeof schema.minItems === 'number' && value.length < schema.minItems) errors.push(`${path}: mínimo ${schema.minItems} elementos`)
    if (typeof schema.maxItems === 'number' && value.length > schema.maxItems) errors.push(`${path}: máximo ${schema.maxItems} elementos (llegaron ${value.length})`)

    if (schema.items && typeof schema.items === 'object') {
      value.forEach((item, index) => validateNode(schema.items as HiggsfieldJsonSchema, item, `${path}[${index}]`, errors))
    }
  }

  if (typeMatches('object', value) && (schema.properties || schema.required || schema.if)) {
    const record = value as Record<string, unknown>
    const properties = propertiesOf(schema)

    for (const field of Array.isArray(schema.required) ? (schema.required as string[]) : []) {
      if (record[field] === undefined) errors.push(`${path === '$' ? '' : `${path}.`}${field}: es obligatorio`)
    }

    for (const [field, fieldValue] of Object.entries(record)) {
      const childPath = path === '$' ? field : `${path}.${field}`

      if (has(properties, field)) validateNode(properties[field], fieldValue, childPath, errors)
      else if (schema.additionalProperties === false) errors.push(`${childPath}: el endpoint no acepta este campo`)
    }

    if (schema.if && typeof schema.if === 'object') {
      const chain = requiredChain(schema)

      if (chain) {
        if (!chain.some(field => record[field] !== undefined)) {
          errors.push(`${path === '$' ? 'entrada' : path}: necesita al menos uno de ${chain.join(', ')}`)
        }
      } else {
        const branch = conditionHolds(schema.if as HiggsfieldJsonSchema, record, schema) ? schema.then : schema.else

        if (branch && typeof branch === 'object') validateNode(branch as HiggsfieldJsonSchema, value, path, errors)
      }
    }
  }
}

/** Lista TODOS los problemas del cuerpo contra el esquema del endpoint. Vacío = válido para el subconjunto soportado. */
export const validateHiggsfieldInput = (schema: HiggsfieldJsonSchema, input: Record<string, unknown>): string[] => {
  const errors: string[] = []

  validateNode(schema, input, '$', errors)

  return [...new Set(errors)]
}

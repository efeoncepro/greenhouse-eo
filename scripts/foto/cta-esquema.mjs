// Esquema declarativo del plan de `pnpm foto:componer:cta` — FUENTE ÚNICA de qué campos existen, de qué tipo y en
// qué rango. Lo usan el compositor (antes de componer nada) y cualquier herramienta que lea planes.
//
// Existe porque la validación a mano dejaba pasar planes que producían piezas malas EN SILENCIO (auditoría
// adversarial 2026-09-23): `dominantSize: 0` dejaba la pieza sin titular, un tamaño negativo invertía el texto,
// `align: 'centre'` saltaba la regla del eje, `leadFill: 'red'` reventaba DESPUÉS de escribir el PNG y un `id` con
// `../` escribía fuera de `out/`. Un campo desconocido en un objeto propio (cta, nota, firma…) es un error: así se
// perdió `centerX`. En la raíz del plan sólo AVISA, porque ahí conviven metadatos de otras herramientas.
import { z } from 'zod'
import { axisAdvertising } from '@efeoncepro/axis-tokens'
import {
  AXIS_COLLABORATION_PARTICIPANT_KINDS,
  AXIS_COLLABORATION_SELECTION_ANCHORS
} from '@efeoncepro/axis-ui-contracts'

// Letras, números, punto, guion y guion bajo; nunca empieza con punto. El id es parte de rutas de archivo.
export const ID_VALIDO = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

// Reglas del gate que una pieza puede exceptuar, siempre con razón y aprobación registradas. Nunca se apaga una guarda
// entera en silencio: la excepción queda en el QA y el gate la muestra.
export const REGLAS_EXCEPTUABLES = [
  'zona-segura',
  'cta-perceptual',
  'firma-contraste',
  'firma-tamano',
  'firma-sobre-sujeto',
  'acento-cta',
  'concepto-completo',
  'jerarquia',
  'legibilidad',
  'reserva-editorial',
  'cta-perceptual',
  'dominante-mayor'
]

// Límites de las zonas de sujeto ignoradas: cada una ≤ 10 % del lienzo y todas juntas ≤ 15 %. Una zona del tamaño del
// lienzo apagaba la guarda entera (auditoría 2026-09-23).
export const IGNORAR_MAX_ZONA = 0.1
export const IGNORAR_MAX_TOTAL = 0.15

const TOKENS = Object.keys(axisAdvertising.color)
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'debe ser un color #rrggbb')
const fraccion = z.number().finite().min(0).max(1)
const positivo = z.number().finite().positive()
const noNegativo = z.number().finite().min(0)
const texto = z.string().trim().min(1, 'no puede estar vacío')
const razon = z.string().trim().min(10, 'la razón necesita al menos 10 caracteres')
const aprobado = z.string().trim().min(3, 'nombra quién aprobó')
const caja = z.tuple([fraccion, fraccion, fraccion, fraccion])

// `plate`: sha256 del plate para el que se aprobó (un plate regenerado se vuelve a aprobar). `hasta`: el valor que se
// aprueba cuando la regla se mide con un número (el gate lo exige ahí). Tramo 7; auditoría de arquitectura, N7.
const excepcion = z.object({ regla: z.enum(REGLAS_EXCEPTUABLES), razon, aprobadoPor: aprobado, plate: z.string().regex(/^[0-9a-f]{64}$/, 'el sha256 del plate, 64 hex').optional(), hasta: z.number().finite().optional() }).strict()

const cursorCta = z
  .object({
    id: texto,
    kind: z.enum(['local', 'collaborator']),
    anchor: z.enum(AXIS_COLLABORATION_SELECTION_ANCHORS).optional(),
    action: z.string().optional(),
    label: z.string().optional(),
    who: z.enum(AXIS_COLLABORATION_PARTICIPANT_KINDS).optional(),
    color: hex.optional()
  })
  .strict()

const cta = z
  .object({
    text: texto,
    descriptor: texto,
    variant: z.enum(['solid', 'outline', 'text', 'auto']),
    prominencia: z.enum(['discreta', 'delimitada', 'destacada']).optional(),
    variantReason: z.string().optional(),
    align: z.enum(['left', 'center']).optional(),
    x: z.union([fraccion, z.literal('columna')]).optional(),
    fontSize: positivo,
    descriptorSize: positivo,
    paddingX: noNegativo,
    paddingY: noNegativo,
    radius: noNegativo.optional(),
    gapAfterNote: noNegativo,
    descriptorGap: noNegativo.optional(),
    cursorScale: positivo.optional(),
    surfaceToken: z.enum(TOKENS).optional(),
    inkToken: z.enum(TOKENS).optional(),
    seleccion: z
      .object({
        marco: z.enum(['open-brackets', 'four-corners', 'eight-handles', 'ninguno']).optional(),
        padding: z.enum(['compact', 'standard', 'open']).optional(),
        escala: positivo.optional(),
        cursores: z.array(cursorCta).min(1).optional()
      })
      .strict()
      .optional()
  })
  .strict()

const nota = z
  .object({
    text: texto,
    size: positivo.optional(),
    width: z.number().finite().positive().max(1).optional(),
    x: z.union([fraccion, z.literal('columna')]).optional(),
    y: fraccion.optional(),
    gapAfterClosure: z.number().finite().optional()
  })
  .strict()

const logo = z
  .object({
    width: positivo,
    x: fraccion.optional(),
    y: z.union([fraccion, z.literal('auto')]).optional(),
    variant: z.enum(['auto', 'negative', 'color']).optional()
  })
  .strict()

const cursorSeleccion = z
  .object({
    id: texto,
    kind: z.enum(['local', 'collaborator']).optional(),
    state: z.enum(['acting', 'moving']).optional(),
    anchor: z.enum(AXIS_COLLABORATION_SELECTION_ANCHORS).optional(),
    region: z.string().optional(),
    action: z.string().optional(),
    label: z.string().optional(),
    who: z.enum(AXIS_COLLABORATION_PARTICIPANT_KINDS).optional(),
    color: hex.optional()
  })
  .strict()

const seleccion = z
  .object({
    variant: z.enum(['eight-handles', 'four-corners', 'open-brackets']).optional(),
    padding: z.enum(['compact', 'standard', 'open']).optional(),
    overlay: z.enum(['none', 'subtle', 'emphasized']).optional(),
    scale: positivo.optional(),
    box: caja.optional(),
    targetKind: z.enum(['text', 'object', 'group']).optional(),
    cursors: z.array(cursorSeleccion).min(1)
  })
  .strict()

export const esquemaPieza = z
  .object({
    id: z.string().regex(ID_VALIDO, 'sólo letras, números, punto, guion y guion bajo, sin empezar con punto (es parte de rutas de archivo)'),
    plate: texto,
    align: z.enum(['left', 'center']).optional(),
    centerX: fraccion.optional(),
    top: fraccion.optional(),
    textWidth: z.number().finite().positive().max(1).optional(),
    ink: z.enum(['light', 'dark']).optional(),
    label: texto.optional(),
    labelSize: positivo.optional(),
    labelGap: noNegativo.optional(),
    labelStar: z.boolean().optional(),
    lead: texto.optional(),
    leadFamily: z.enum(['poppins', 'bricolage']).optional(),
    leadFill: hex.optional(),
    leadSize: positivo.optional(),
    leadGap: noNegativo.optional(),
    dominant: texto,
    dominantSize: positivo,
    dominantMax: z.number().finite().positive().max(1).optional(),
    // Rango (tramo 8; auditoría de arquitectura, N6): AXIS usa −0,035 a 0,08 em y los planes del repo, −0,07 a 0,05
    // (medido 2026-09-23). −0,45 dejaba el titular con las letras encimadas y el gate en 0.
    dominantTracking: z.number().finite().min(-0.08).max(0.12).optional(),
    after: texto.optional(),
    afterFamily: z.enum(['poppins', 'bricolage']).optional(),
    afterFill: hex.optional(),
    afterSize: positivo.optional(),
    afterGap: noNegativo.optional(),
    selection: seleccion.optional(),
    note: nota.optional(),
    cta,
    logo: logo.optional(),
    // Piso y techo (tramo 8): `final: [9, 16]` entregaba un PNG de 9×16 px con el gate en 0.
    final: z.tuple([z.number().int().min(320).max(8192), z.number().int().min(320).max(8192)]).optional(),
    // `"axis"`: usar como zona DECLARADA la de AXIS para el formato (feed 7,5 %/6 %, story 10 %/13 %). La que se
    // verifica es siempre la de AXIS como piso: una zona declarada sólo puede estrecharla.
    safeArea: z
      .union([
        z.literal('axis'),
        z
          .object({ x0: fraccion, y0: fraccion, x1: fraccion, y1: fraccion, profile: z.string().optional(), status: z.string().optional() })
          .strict()
          .refine(a => a.x0 < a.x1 && a.y0 < a.y1, 'la zona segura necesita x0 < x1 e y0 < y1')
      ])
      .optional(),
    subjectProtection: z.union([z.literal(false), z.object({ top: noNegativo, minClearance: noNegativo, source: z.string().optional() }).strict()]).optional(),
    subjectGuard: z
      .object({
        ignore: z
          .array(z.object({ box: caja, reason: razon, aprobadoPor: aprobado }).strict())
          .optional()
      })
      .strict()
      .superRefine((g, ctx) => {
        let total = 0

        for (const [i, z0] of (g.ignore ?? []).entries()) {
          const [x0, y0, x1, y1] = z0.box
          const area = Math.max(0, x1 - x0) * Math.max(0, y1 - y0)

          total += area
          if (x1 <= x0 || y1 <= y0) ctx.addIssue({ code: 'custom', path: ['ignore', i, 'box'], message: 'la zona necesita x0 < x1 e y0 < y1' })
          if (area > IGNORAR_MAX_ZONA) ctx.addIssue({ code: 'custom', path: ['ignore', i, 'box'], message: `la zona cubre ${(area * 100).toFixed(1)} % del lienzo (máximo ${IGNORAR_MAX_ZONA * 100} %): una guarda no se apaga entera` })
        }

        if (total > IGNORAR_MAX_TOTAL) ctx.addIssue({ code: 'custom', path: ['ignore'], message: `las zonas ignoradas suman ${(total * 100).toFixed(1)} % del lienzo (máximo ${IGNORAR_MAX_TOTAL * 100} %)` })
      })
      .optional(),
    editorialReserve: z.object({ maxBottom: positivo, maxRight: positivo }).strict().optional(),
    // Objetos de la escena que el texto no tapa aunque no sean una persona (el canto iluminado de un monitor, un
    // producto). Cada zona en fracciones del lienzo y con su razón: queda en el plan para quien revise.
    protect: z
      .array(z.object({ box: caja, reason: razon }).strict().refine(z0 => z0.box[0] < z0.box[2] && z0.box[1] < z0.box[3], 'la zona necesita x0 < x1 e y0 < y1'))
      .optional(),
    textGrowth: z.boolean().optional(),
    placement: z.object({ anchoCssPx: positivo, razon }).strict().optional(),
    conceptoReducido: z.object({ razon, aprobadoPor: aprobado.optional() }).strict().optional(),
    // `firma`: la pone otra herramienta (`externa`, p. ej. firmar.mjs) o la pieza no lleva (`sin-firma`). En la externa,
    // `y` es el CENTRO vertical (fracción del alto, como `signatureY`) y `ancho` la fracción del lado corto (20 % por
    // defecto): el compositor reserva esa caja para que nada caiga donde después va la firma.
    firma: z.object({ modo: z.enum(['sin-firma', 'externa']), razon, aprobadoPor: aprobado.optional(), y: fraccion.optional(), ancho: z.number().finite().positive().max(1).optional() }).strict().optional(),
    excepciones: z.array(excepcion).optional(),
    scrimTop: z.object({ opacity: fraccion, to: fraccion, color: hex.optional() }).strict().optional(),
    scrimBottom: z.object({ opacity: fraccion, from: fraccion }).strict().optional(),
    hud: z.object({ lit: z.number().int().min(0).max(5), current: z.number().int().min(1).max(5).nullable().optional() }).strict().optional(),
    gesture: z.object({ text: texto, size: positivo, x: fraccion, y: fraccion, color: hex.optional(), rotate: z.number().finite().optional() }).strict().optional(),
    footer: z.object({ text: texto, size: positivo, y: fraccion }).strict().optional(),
    card: z.object({ header: texto, body: texto, bottom: fraccion, width: z.number().finite().positive().max(1).optional(), align: z.enum(['left', 'right']).optional(), allowGtaCard: z.boolean().optional() }).strict().optional(),
    url: z.object({ width: z.number().finite().positive().max(1), y: fraccion }).strict().optional(),
    // metadatos de otras herramientas (firma externa, validadores de zona segura, trazabilidad editorial)
    altText: z.string().optional(),
    styleReason: z.string().optional(),
    productionNote: z.any().optional(),
    copyFormula: z.any().optional(),
    placementLimitation: z.any().optional(),
    signatureY: fraccion.optional(),
    signatureSafeArea: z.any().optional()
  })
  .passthrough()

export const CAMPOS_CONOCIDOS = new Set(Object.keys(esquemaPieza.shape))

// Traduce un problema de zod a un mensaje que nombra el campo y lo que se esperaba, en español.
const traducir = issue => {
  const campo = issue.path.join('.') || '(pieza)'

  switch (issue.code) {
    case 'invalid_type':
      return issue.received === 'undefined' ? `falta \`${campo}\`` : `\`${campo}\` debe ser ${issue.expected} (vino ${issue.received})`
    case 'too_small':
      return `\`${campo}\` debe ser ${issue.inclusive ? '≥' : '>'} ${issue.minimum}`
    case 'too_big':
      return `\`${campo}\` debe ser ${issue.inclusive ? '≤' : '<'} ${issue.maximum}`
    case 'invalid_enum_value':
      return `\`${campo}\` debe ser uno de: ${issue.options.join(', ')} (vino ${JSON.stringify(issue.received)})`
    case 'unrecognized_keys':
      return `\`${campo}\` trae campos que no existen: ${issue.keys.join(', ')}`
    case 'invalid_union':
      return `\`${campo}\` no tiene una forma válida`
    default:
      return `\`${campo}\`: ${issue.message}`
  }
}

// Los planes usan `null` para decir «no hay» (`label: null`, `after: null`, `selection: null`): se trata como ausente.
const sinNulos = v => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).filter(([, x]) => x !== null).map(([k, x]) => [k, sinNulos(x)])) : v)

// Reglas ENTRE campos, que se informan siempre: zod corre los refinamientos de un objeto sólo si el objeto ya es
// válido, y un plan con otros errores escondía éstos hasta la segunda pasada (visto en la regresión del 2026-09-23:
// el piloto `cta-p1` dejó de avisar que le faltaba `cta.x`).
// Una entidad numérica que no es un carácter Unicode (fuera de U+10FFFF, o una mitad de par sustituto).
const ENTIDAD = /&#(x[0-9a-f]+|\d+);/gi

const entidadesInvalidas = t => [...String(t ?? '').matchAll(ENTIDAD)].filter(([, n]) => {
  const cp = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : Number(n)

  return !Number.isFinite(cp) || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)
}).map(m => m[0])

function reglasCruzadas(p) {
  const e = []
  const columna = [p?.cta?.x === 'columna' && '`cta.x`', p?.note?.x === 'columna' && '`note.x`'].filter(Boolean)

  // «columna» es la columna del texto alineado a la izquierda (tramo 8; auditoría de arquitectura, N10): en un bloque
  // centrado el CTA arrancaba en el eje y el gate salía con 0.
  if (columna.length && p?.align === 'center') e.push(`${columna.join(' y ')}: «columna» es la columna del texto alineado a la izquierda; en un bloque centrado usa una fracción del ancho`)

  for (const [campo, t] of [['lead', p?.lead], ['dominant', p?.dominant], ['after', p?.after], ['label', p?.label], ['note.text', p?.note?.text], ['cta.text', p?.cta?.text], ['cta.descriptor', p?.cta?.descriptor], ['footer.text', p?.footer?.text], ['card.header', p?.card?.header], ['card.body', p?.card?.body], ['gesture.text', p?.gesture?.text], ['altText', p?.altText]]) {
    const malas = entidadesInvalidas(t)

    if (malas.length) e.push(`\`${campo}\` trae una entidad que no es un carácter Unicode: ${malas.join(', ')}`)
  }

  const c = p?.cta

  if (c && typeof c === 'object' && c.align !== 'center' && c.x == null) e.push('falta `cta.x` (una fracción, "columna", o `cta.align: "center"`)')
  if (p?.note && typeof p.note === 'object' && p.note.gapAfterClosure == null && p.note.y == null) e.push('la nota necesita `note.gapAfterClosure` (encadenada) o `note.y` (ubicada a mano)')

  return e
}

// Valida una pieza. Devuelve errores (bloquean) y avisos (campos de la raíz que el comando no lee).
export function validarPiezaEsquema(p) {
  const limpia = sinNulos(p)
  const errores = []
  const r = esquemaPieza.safeParse(limpia)

  if (!r.success) for (const issue of r.error.issues) errores.push(traducir(issue))
  errores.push(...reglasCruzadas(limpia))
  const desconocidos = p && typeof p === 'object' ? Object.keys(p).filter(k => !CAMPOS_CONOCIDOS.has(k)) : []

  return { errores, avisos: desconocidos.length ? [`campos que este comando no lee — ${desconocidos.join(', ')}`] : [] }
}

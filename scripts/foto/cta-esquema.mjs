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
  'reserva-editorial',
  'dominante-mayor',
  // Canon 2026-09-23 (tramo 11): sólo en las piezas nuevas.
  'firma-posicion',
  'orden-lectura',
  'jerarquia-rol',
  'cta-aire',
  // Tramo 12
  'eje-centrado',
  'tracking-titular',
  // Tramo 13: `legibilidad` sólo en las piezas nuevas; las demás, en todas.
  'legibilidad',
  'cta-relleno',
  'descriptor-distancia',
  'cta-cuerpo',
  'paleta-voces',
  'seleccion-objeto',
  // Tramo 14
  'cta-tamano',
  'mascara-vacia',
  // Tramo 15 (séptima certificación): `holgura` en todas; `cta-columna` sólo en las piezas nuevas.
  'holgura',
  'cta-columna'
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
// sha256 del plate para el que se aprobó algo: un plate regenerado se vuelve a aprobar.
const shaPlate = z.string().regex(/^[0-9a-f]{64}$/, 'el sha256 del plate, 64 hex')

// `plate`: sha256 del plate para el que se aprobó (un plate regenerado se vuelve a aprobar). `hasta`: el valor que se
// aprueba cuando la regla se mide con un número (el gate lo exige ahí). Tramo 7; auditoría de arquitectura, N7.
// Nombres que HTML5 decodifica SIN punto y coma: los 106 «legados» de la tabla de referencias nombradas de WHATWG. Un
// navegador lee «caf&eacute hoy» como «café hoy» y el compositor dibujaría «&eacute» tal cual (tramo 15; séptima
// certificación, R1: la lista de antes estaba hecha a mano, dejaba pasar todas las tildes del castellano y mezclaba nombres
// que ningún navegador acepta sin «;»). Verificada el 2026-09-23 contra `character-entities-legacy` 3.0.0 y contra el
// decodificador de `entities` 4.5.0 en modo legado: las 106 se decodifican sin «;»; `ndash`, `hellip` o `euro`, no.
export const ENTIDADES_LEGADO = Object.freeze([
  'AElig', 'AMP', 'Aacute', 'Acirc', 'Agrave', 'Aring', 'Atilde', 'Auml', 'COPY', 'Ccedil', 'ETH', 'Eacute', 'Ecirc',
  'Egrave', 'Euml', 'GT', 'Iacute', 'Icirc', 'Igrave', 'Iuml', 'LT', 'Ntilde', 'Oacute', 'Ocirc', 'Ograve', 'Oslash',
  'Otilde', 'Ouml', 'QUOT', 'REG', 'THORN', 'Uacute', 'Ucirc', 'Ugrave', 'Uuml', 'Yacute', 'aacute', 'acirc',
  'acute', 'aelig', 'agrave', 'amp', 'aring', 'atilde', 'auml', 'brvbar', 'ccedil', 'cedil', 'cent', 'copy',
  'curren', 'deg', 'divide', 'eacute', 'ecirc', 'egrave', 'eth', 'euml', 'frac12', 'frac14', 'frac34', 'gt',
  'iacute', 'icirc', 'iexcl', 'igrave', 'iquest', 'iuml', 'laquo', 'lt', 'macr', 'micro', 'middot', 'nbsp', 'not',
  'ntilde', 'oacute', 'ocirc', 'ograve', 'ordf', 'ordm', 'oslash', 'otilde', 'ouml', 'para', 'plusmn', 'pound',
  'quot', 'raquo', 'reg', 'sect', 'shy', 'sup1', 'sup2', 'sup3', 'szlig', 'thorn', 'times', 'uacute', 'ucirc',
  'ugrave', 'uml', 'uuml', 'yacute', 'yen', 'yuml'
])

// Nombres tipográficos que un navegador NO decodifica sin «;» pero que nadie escribe a propósito: sin «;» también se dibujan
// literales. Se rechazan igual; no son parte de la lista de HTML5.
const ENTIDADES_TIPOGRAFICAS = ['ndash', 'mdash', 'hellip', 'bull', 'trade', 'euro', 'apos', 'lsquo', 'rsquo', 'ldquo', 'rdquo']
const NOMBRES_SIN_PUNTO = [...ENTIDADES_LEGADO, ...ENTIDADES_TIPOGRAFICAS].sort((a, b) => b.length - a.length)

// La primera entidad escrita sin punto y coma, o `null`. El navegador toma el nombre legado MÁS LARGO que empieza donde está
// el «&» (`&notin` sin «;» se lee «¬in»): por eso se busca por prefijo y no por palabra. «R&D», «AT&T» o «Q&A» son texto.
export function entidadSinPuntoYComa(t) {
  const numerica = String(t).match(/&#\d+(?![\d;])|&#x[0-9a-f]+(?![0-9a-f;])/i)

  if (numerica) return numerica[0]

  for (let i = t.indexOf('&'); i >= 0; i = t.indexOf('&', i + 1)) {
    const nombre = NOMBRES_SIN_PUNTO.find(n => t.startsWith(n, i + 1))

    if (nombre && t[i + 1 + nombre.length] !== ';') return `&${nombre}`
  }

  return null
}

const excepcion = z.object({ regla: z.enum(REGLAS_EXCEPTUABLES), razon, aprobadoPor: aprobado, plate: shaPlate.optional(), hasta: z.number().finite().optional() }).strict()

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
    // Techo 1,2 (tramo 14; sexta certificación, H2): con 2 el cursor empujaba el descriptor lejos del botón. Lo aprobado: 0,45–1,1.
    cursorScale: positivo.max(1.2).optional(),
    surfaceToken: z.enum(TOKENS).optional(),
    inkToken: z.enum(TOKENS).optional(),
    seleccion: z
      .object({
        marco: z.enum(['open-brackets', 'four-corners', 'eight-handles', 'ninguno']).optional(),
        padding: z.enum(['compact', 'standard', 'open']).optional(),
        escala: positivo.min(1).max(2.5).optional(),
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
    // Nunca negativo (tramo 11; auditoría de diseño, hallazgo 2): con −420 la nota subía por encima del titular.
    gapAfterClosure: z.number().finite().min(0).optional()
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
    // Piso 1 (tramo 14; decisión del operador del 2026-09-23): las etiquetas de los cursores quedan fuera del piso de
    // legibilidad, pero no bajan de lo que usan las aprobadas (4,68 × escala CSS px en un teléfono; aprobadas: 1,05 y 1,35).
    scale: positivo.min(1).max(2.5).optional(),
    box: caja.optional(),
    targetKind: z.enum(['text', 'object', 'group']).optional(),
    // En una pieza nueva, la selección sobre un objeto es una salida aprobada (tramo 14): razón, aprobador y plate.
    razon: razon.optional(),
    aprobadoPor: aprobado.optional(),
    plate: shaPlate.optional(),
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
          .array(z.object({ box: caja, reason: razon, aprobadoPor: aprobado, plate: shaPlate.optional() }).strict())
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
    // Piso de 320 CSS px, el ancho de referencia del reflujo de WCAG (tramo 12; auditoría de arquitectura de la cuarta
    // certificación, N1): con 15 el borde del contorno medía 77 px y el CTA desaparecía, con el gate en 0.
    placement: z.object({ anchoCssPx: z.number().finite().min(320).max(8192), razon }).strict().optional(),
    // Las aprobaciones que apagan una medición —concepto reducido, pieza sin firma, zona del sujeto ignorada— nombran el
    // plate para el que se aprobaron, como las excepciones: con un plate regenerado, la zona ignorada seguía apagando la
    // guarda sin re-aprobación (tramo 10; auditoría de arquitectura, hallazgo 16). El gate lo exige.
    conceptoReducido: z.object({ razon, aprobadoPor: aprobado.optional(), plate: shaPlate.optional() }).strict().optional(),
    // `firma`: la pone otra herramienta (`externa`, p. ej. firmar.mjs) o la pieza no lleva (`sin-firma`). En la externa,
    // `y` es el CENTRO vertical (fracción del alto, como `signatureY`) y `ancho` la fracción del lado corto (20 % por
    // defecto): el compositor reserva esa caja para que nada caiga donde después va la firma.
    // La altura de una firma externa se declara en `signatureY`, que es lo que lee `firmar.mjs`.
    firma: z.object({ modo: z.enum(['sin-firma', 'externa']), razon, aprobadoPor: aprobado.optional(), plate: shaPlate.optional() }).strict().optional(),
    excepciones: z.array(excepcion).optional(),
    // SIN VELO (decisión del operador, 2026-09-23): el lecho oscuro sale del prompt, nunca de una sombra pintada encima
    // de la foto. Ninguna pieza aprobada lo usaba.
    scrimTop: z.any().refine(() => false, 'el velo no se usa: el lecho donde va el texto se genera desde el prompt (`pnpm foto:prompt` con `reservas: ["zona-texto"]`)').optional(),
    scrimBottom: z.any().refine(() => false, 'el velo no se usa: el lecho donde va la firma o el texto se genera desde el prompt').optional(),
    // Informativo: el canon lo decide el registro (`canon-anterior.json`), y un plan sólo puede declarar el vigente.
    canon: z.literal('2026-09-23').optional(),
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
    // La zona de la firma con la misma forma que `safeArea` (tramo 10; auditoría de arquitectura, hallazgo 2): era
    // `z.any()`, y con `{ x0: 0.1 }` las coordenadas faltantes quedaban en NaN y la zona se apagaba.
    signatureSafeArea: z
      .object({ x0: fraccion, y0: fraccion, x1: fraccion, y1: fraccion, profile: z.string().optional(), status: z.string().optional() })
      .strict()
      .refine(a => a.x0 < a.x1 && a.y0 < a.y1, 'la zona de la firma necesita x0 < x1 e y0 < y1')
      .optional()
  })
  .passthrough()

export const CAMPOS_CONOCIDOS = new Set(Object.keys(esquemaPieza.shape))

// Nombres que el compositor usa para su estado INTERNO (tramo 10; auditoría de arquitectura, hallazgo 4): en la raíz del
// plan, `ctaVarianteResuelta` reescribía el CTA después de validarlo —un botón blanco, sin acento, con un emoji como
// cuadro vacío— y el QA lo registraba como una decisión «auto». El estado ya no vive en el plan; el nombre se rechaza.
export const CAMPOS_INTERNOS = new Set(['ctaVarianteResuelta'])

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
  // En un bloque centrado el CTA va con `cta.align: "center"` y la nota sin `x` (se centra sola). Antes el mensaje pedía
  // «una fracción del ancho», y seguirlo dejaba nota y CTA colgando del eje con el gate en 0 (tramo 12; auditoría de diseño
  // de la cuarta certificación, N4).
  if (columna.length && p?.align === 'center') e.push(`${columna.join(' y ')}: «columna» es la columna del texto alineado a la izquierda; en un bloque centrado el CTA va con \`cta.align: "center"\` y la nota sin \`x\` (se centra sola)`)

  const textos = [['lead', p?.lead], ['dominant', p?.dominant], ['after', p?.after], ['label', p?.label], ['note.text', p?.note?.text], ['cta.text', p?.cta?.text], ['cta.descriptor', p?.cta?.descriptor], ['footer.text', p?.footer?.text], ...(p?.selection?.cursors ?? []).map((k, i) => [`selection.cursors.${i}.label`, k?.label]), ...(p?.cta?.seleccion?.cursores ?? []).map((k, i) => [`cta.seleccion.cursores.${i}.label`, k?.label])].filter(([, t]) => typeof t === 'string')

  for (const [campo, t] of textos) {
    // Tramo 12 (cuarta certificación): `**` y `[[ ]]` sólo se interpretan en entrada, titular, cierre, nota y pie; en el
    // CTA, el descriptor y las etiquetas se dibujaban literales. Una entidad (`&amp;`) se dibujaba tal cual en cualquier voz,
    // y un salto de línea `\n` salía como un cuadro con «?» (el corte de línea es `|`).
    if (/\*\*|\[\[|\]\]/.test(t) && !['lead', 'dominant', 'after', 'note.text', 'footer.text'].includes(campo)) e.push(`\`${campo}\` no admite \`**\` ni \`[[ ]]\`: se dibujarían literales (sólo entrada, titular, cierre, nota y pie los interpretan)`)
    // El nombre de una entidad puede llevar dígitos (`&sup2;`, `&frac12;`): con `[a-z]+` pasaban y se dibujaban literales
    // (tramo 13; auditoría de arquitectura de la quinta certificación, N3).
    const ent = t.match(/&(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/i)

    if (ent) e.push(`\`${campo}\` trae la entidad «${ent[0]}»: escribe el carácter; la entidad se dibujaría literal`)
    // Sin punto y coma también (tramo 14; sexta certificación, Y7): `&#178`, `&amp` o `&sup2` se dibujaban literales. Desde el
    // tramo 15 (séptima, R1), con la lista oficial de HTML5 y el prefijo más largo: `&eacute` o `&ntilde` también.
    const entSin = entidadSinPuntoYComa(t)

    if (!ent && entSin) e.push(`\`${campo}\` trae la entidad «${entSin}» sin punto y coma: escribe el carácter; se dibujaría literal`)
    if (/[\n\r\t]/.test(t)) e.push(`\`${campo}\` trae un salto de línea o una tabulación: se dibujaría como un cuadro vacío; para cortar la línea usa \`|\``)
  }

  for (const [campo, t] of [['lead', p?.lead], ['dominant', p?.dominant], ['after', p?.after], ['label', p?.label], ['note.text', p?.note?.text], ['cta.text', p?.cta?.text], ['cta.descriptor', p?.cta?.descriptor], ['footer.text', p?.footer?.text], ['card.header', p?.card?.header], ['card.body', p?.card?.body], ['gesture.text', p?.gesture?.text], ['altText', p?.altText]]) {
    const malas = entidadesInvalidas(t)

    if (malas.length) e.push(`\`${campo}\` trae una entidad que no es un carácter Unicode: ${malas.join(', ')}`)
  }

  const c = p?.cta

  // El mensaje depende de la alineación del bloque (tramo 15; séptima, diseño N2): antes sugería `cta.align: "center"` también
  // en un bloque a la izquierda, y así el botón quedaba fuera de la columna del texto.
  if (c && typeof c === 'object' && c.align !== 'center' && c.x == null) e.push(p?.align === 'center' ? 'falta la posición del CTA: en un bloque centrado usa `cta.align: "center"`' : 'falta `cta.x`: en un bloque alineado a la izquierda usa `cta.x: "columna"` (o una fracción)')
  if (c && typeof c === 'object' && c.align === 'center' && p?.align !== 'center') e.push('`cta.align: "center"` en un bloque alineado a la izquierda deja el botón fuera de la columna del texto: usa `cta.x: "columna"`')
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
  const internos = p && typeof p === 'object' ? Object.keys(p).filter(k => CAMPOS_INTERNOS.has(k)) : []

  if (internos.length) errores.push(`${internos.map(k => `\`${k}\``).join(', ')}: campo interno del compositor, no se declara en el plan`)
  const desconocidos = p && typeof p === 'object' ? Object.keys(p).filter(k => !CAMPOS_CONOCIDOS.has(k) && !CAMPOS_INTERNOS.has(k)) : []

  return { errores, avisos: desconocidos.length ? [`campos que este comando no lee — ${desconocidos.join(', ')}`] : [] }
}

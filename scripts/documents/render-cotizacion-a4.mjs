import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'

import { chromium } from 'playwright'
import { efeonceGraphicLine as gl, axisGeometry, axisSurface } from '@efeoncepro/axis-tokens'
import { brandAssetUrl } from '@efeoncepro/axis-brand-assets'
import { orbitSvg, sphereDividerSvg } from '@efeoncepro/axis-graphic-line'

import {
  currencyInfo,
  toMinor,
  fromMinor,
  taxMinor,
  roundRatio,
  createMoneyPresentation,
  formatMoney
} from './document-money.mjs'

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const templateDir = path.join(repo, 'docs/commercial/templates/cotizacion-a4')
const fontDir = path.join(repo, 'src/lib/artifact-composer/brand-packs/axis/fonts')

// La versión 1 conserva sus dos archivos intactos: cotizaciones ya entregadas se regeneran byte a byte.
const TEMPLATES = {
  1: { html: 'template.html', css: ['template.css'] },
  2: { html: 'template-lineas.html', css: ['template.css', 'template-lineas.css'] }
}

const esc = value =>
  String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const lines = value => (Array.isArray(value) ? value : [value]).map(esc).join('<br>')

// Versión 2 del contrato de datos: varias líneas con precio, paginación dinámica y dos bloques opcionales.
// La versión 1 (un único precio) conserva su validación, su plantilla y su HTML sin cambios.
const V2_KEYS = new Set([
  'version',
  'status',
  'submitted',
  'signed',
  'date',
  'reference',
  'currency',
  'locale',
  'presentation',
  'vatRate',
  'taxStatus',
  'taxAmount',
  'supplier',
  'buyer',
  'cover',
  'service',
  'scope',
  'schedule',
  'conditions',
  'pricing',
  'lines',
  'net',
  'clientPaidDirectly',
  'paymentSchedule',
  'source'
])

const V2_LIMITS = { lines: 40, quantity: 9999, clientPaidDirectly: 8, milestones: 12 }

const OWN_CURRENCY_ONLY =
  'La versión 2 se emite en la moneda de la cotización (currency): no admite presentation con otra moneda ni tipo de cambio. Quita presentation.currency y presentation.fx.'

function assertOwnCurrency(q) {
  if (q.presentation != null && (q.presentation.fx != null || (q.presentation.currency ?? q.currency) !== q.currency))
    throw new Error(OWN_CURRENCY_ONLY)
}

const isRecord = value => typeof value === 'object' && value !== null && !Array.isArray(value)

function linesNetMinor(q) {
  if (!Array.isArray(q.lines)) throw new Error('lines: se requiere la lista de líneas de la versión 2.')

  return q.lines.reduce((sum, line) => sum + toMinor(line?.net, q.currency), 0n)
}

// Impuesto de la versión 2, en unidades menores. Una cotización que tributa mes a mes y suma los redondeos
// puede diferir en unidades del impuesto calculado una vez sobre el subtotal: taxAmount declara esa cifra y el
// documento imprime la de la cotización, nunca una segunda. Se acepta sólo si corresponde a la tasa: cada
// unidad de cantidad (cada mes) aporta como máximo una unidad menor de redondeo.
function taxOf(q, netMinor) {
  if (q.vatRate === null) {
    if (q.taxAmount != null)
      throw new Error(
        'taxAmount sólo se declara con una tasa explícita en vatRate; con vatRate: null no hay impuesto que declarar.'
      )

    return { minor: q.taxStatus === 'not_applicable' ? 0n : null, source: q.taxStatus ?? 'pending' }
  }

  const computed = taxMinor(netMinor, q.vatRate)

  if (q.taxAmount == null) return { minor: computed, source: 'computed' }
  let stated

  try {
    stated = toMinor(q.taxAmount, q.currency)
  } catch (error) {
    throw new Error(`taxAmount: ${error.message}.`)
  }

  const tolerance = q.lines.reduce((sum, line) => sum + BigInt(line.quantity.value), 0n)
  const gap = stated > computed ? stated - computed : computed - stated

  if (gap > tolerance)
    throw new Error(
      `taxAmount no corresponde a la tasa: declara ${fromMinor(stated, q.currency)} y el impuesto de vatRate sobre el subtotal es ${fromMinor(computed, q.currency)}. Se admite una diferencia de redondeo de hasta ${tolerance} unidades menores (la suma de lines[].quantity.value).`
    )

  return { minor: stated, source: 'stated' }
}

// Reglas propias de la versión 2. Devuelve el neto (suma de líneas) en unidades menores.
function validateLines(q, fail, string) {
  const unknown = Object.keys(q).filter(key => !V2_KEYS.has(key))

  if (unknown.length)
    fail(
      `Campos no reconocidos en version 2: ${unknown.join(', ')}. Revisa el nombre: un bloque mal escrito no se omite en silencio.`
    )
  if (q.presentation != null && !isRecord(q.presentation)) fail('presentation debe ser un objeto.')
  assertOwnCurrency(q)

  const record = (value, name, allowed) => {
    if (!isRecord(value)) fail(`${name} debe ser un objeto.`)
    const extra = Object.keys(value).filter(key => !allowed.includes(key))

    if (extra.length) fail(`${name}: campos no reconocidos (${extra.join(', ')}). Se admiten: ${allowed.join(', ')}.`)
  }

  const amount = (value, currency, name) => {
    try {
      return toMinor(value, currency)
    } catch (error) {
      return fail(`${name}: ${error.message}.`)
    }
  }

  const list = (value, name, max) => {
    if (!Array.isArray(value) || !value.length || value.length > max) fail(`${name}: entre 1 y ${max} entradas.`)
  }

  list(q.lines, 'lines', V2_LIMITS.lines)
  let net = 0n

  q.lines.forEach((line, i) => {
    const at = `lines.${i}`

    record(line, at, ['label', 'detail', 'group', 'quantity', 'unitNet', 'net'])
    string(line.label, `${at}.label`)
    if (line.detail != null) string(line.detail, `${at}.detail`)
    if (line.group != null) string(line.group, `${at}.group`)
    record(line.quantity, `${at}.quantity`, ['value', 'unit'])
    if (
      !Number.isSafeInteger(line.quantity.value) ||
      line.quantity.value < 1 ||
      line.quantity.value > V2_LIMITS.quantity
    )
      fail(`${at}.quantity.value: entero de 1 a ${V2_LIMITS.quantity}.`)
    string(line.quantity.unit, `${at}.quantity.unit`)
    const lineNet = amount(line.net, q.currency, `${at}.net`)

    if (
      line.unitNet != null &&
      amount(line.unitNet, q.currency, `${at}.unitNet`) * BigInt(line.quantity.value) !== lineNet
    )
      fail(`${at}: unitNet × quantity.value debe ser exactamente igual a net.`)
    net += lineNet
  })

  const groups = new Set(q.lines.map(line => line.group).filter(group => group != null))

  if (groups.size >= 2 && q.lines.some(line => line.group == null))
    fail(
      `lines.${q.lines.findIndex(line => line.group == null)}.group: con dos o más grupos, todas las líneas declaran el suyo; una línea sin grupo quedaría bajo el encabezado anterior.`
    )
  if (q.net != null && amount(q.net, q.currency, 'net') !== net)
    fail('net debe ser exactamente igual a la suma de lines[].net. Quita net o corrige las líneas.')
  if (net <= 0n) fail('La suma de lines[].net debe ser positiva.')

  try {
    fromMinor(net, q.currency)
  } catch (error) {
    fail(`lines: ${error.message}.`)
  }

  if (q.taxStatus != null) {
    if (q.vatRate !== null)
      fail('taxStatus sólo se declara con vatRate: null; con una tasa explícita el impuesto se calcula.')
    if (!['pending', 'not_applicable'].includes(q.taxStatus)) fail('taxStatus debe ser pending o not_applicable.')
  }

  if (q.clientPaidDirectly != null) {
    list(q.clientPaidDirectly, 'clientPaidDirectly', V2_LIMITS.clientPaidDirectly)
    q.clientPaidDirectly.forEach((item, i) => {
      const at = `clientPaidDirectly.${i}`

      record(item, at, ['label', 'amount', 'currency', 'detail'])
      string(item.label, `${at}.label`)
      if (item.detail != null) string(item.detail, `${at}.detail`)

      try {
        currencyInfo(item.currency)
      } catch (error) {
        fail(`${at}.currency: ${error.message}.`)
      }

      if (amount(item.amount, item.currency, `${at}.amount`) <= 0n) fail(`${at}.amount debe ser positivo.`)
    })
  }

  if (q.paymentSchedule != null) {
    record(q.paymentSchedule, 'paymentSchedule', ['title', 'note', 'milestones'])
    string(q.paymentSchedule.title, 'paymentSchedule.title')
    string(q.paymentSchedule.note, 'paymentSchedule.note')
    list(q.paymentSchedule.milestones, 'paymentSchedule.milestones', V2_LIMITS.milestones)
    let scheduled = 0n

    q.paymentSchedule.milestones.forEach((milestone, i) => {
      const at = `paymentSchedule.milestones.${i}`

      record(milestone, at, ['label', 'when', 'net'])
      string(milestone.label, `${at}.label`)
      string(milestone.when, `${at}.when`)
      const milestoneNet = amount(milestone.net, q.currency, `${at}.net`)

      if (milestoneNet <= 0n) fail(`${at}.net debe ser positivo.`)
      scheduled += milestoneNet
    })
    if (scheduled !== net)
      fail('paymentSchedule: la suma de milestones[].net debe ser exactamente igual al neto de la cotización.')
  }

  if (q.source != null) {
    if (!isRecord(q.source)) fail('source debe ser un objeto plano de textos.')
    for (const [key, value] of Object.entries(q.source)) string(value, `source.${key}`)
  }

  return net
}

export function validateQuote(q) {
  const fail = message => {
    throw new Error(message)
  }

  if (![1, 2].includes(q.version) || !['example', 'draft'].includes(q.status))
    fail('Se requiere version: 1 o 2 y status: example o draft.')
  if (q.submitted || q.signed) fail('No se regenera una cotización presentada o firmada. Cree una nueva versión.')
  const v2 = q.version === 2

  const string = (value, name) => {
    if (typeof value !== 'string' || !value.trim()) fail(`${name} debe ser texto no vacío.`)
  }

  currencyInfo(q.currency, q.locale)
  const netMinor = v2 ? validateLines(q, fail, string) : toMinor(q.net, q.currency)

  if (netMinor <= 0n) fail('net debe ser positivo para el servicio completo.')
  if (!v2 && q.taxAmount != null)
    fail('taxAmount sólo existe en la versión 2; en la versión 1 el impuesto se calcula desde vatRate.')
  if (q.vatRate !== null) taxMinor(netMinor, q.vatRate)
  if (v2) taxOf(q, netMinor)
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(q.date ?? '') ||
    !Number.isFinite(Date.parse(q.date)) ||
    new Date(q.date).toISOString().slice(0, 10) !== q.date
  )
    fail('date debe ser una fecha real YYYY-MM-DD.')
  createMoneyPresentation(q)

  const title = (value, name) => {
    if (Array.isArray(value)) {
      if (!value.length || value.length > 3) fail(`${name}: máximo tres líneas.`)
      value.forEach(v => string(v, name))
    } else string(value, name)
  }

  string(q.reference, 'reference')
  for (const key of ['name', 'taxId', 'contact', 'email', 'phone']) string(q.supplier?.[key], `supplier.${key}`)
  if (!/^[^\s@<>"?&#]+@[^\s@<>"?&#]+\.[^\s@<>"?&#]+$/.test(q.supplier.email))
    fail('supplier.email debe ser un correo válido.')
  if (!/^\+?[\d ()-]{6,}$/.test(q.supplier.phone)) fail('supplier.phone debe ser un teléfono válido.')
  for (const key of ['name', 'unit', 'taxId']) string(q.buyer?.[key], `buyer.${key}`)

  if (q.buyer.logo != null) {
    string(q.buyer.logo.path, 'buyer.logo.path')
    string(q.buyer.logo.source, 'buyer.logo.source')
    if (!/^https:\/\//.test(q.buyer.logo.source))
      fail('buyer.logo.source debe señalar la fuente oficial HTTPS; no se descarga automáticamente.')
    if (!['.svg', '.png', '.jpg', '.jpeg', '.webp'].includes(path.extname(q.buyer.logo.path).toLowerCase()))
      fail('Formato de logo no soportado.')
  }

  string(q.cover?.label, 'cover.label')
  title(q.cover?.title, 'cover.title')
  string(q.cover?.subtitle, 'cover.subtitle')
  // En la versión 2 cada línea lleva su propio detalle: service.detail no se imprime y es opcional.
  for (const key of v2 ? ['name'] : ['name', 'detail']) string(q.service?.[key], `service.${key}`)
  if (v2 && q.service.detail != null) string(q.service.detail, 'service.detail')
  title(q.scope?.title, 'scope.title')
  string(q.scope?.intro, 'scope.intro')

  const rows = (value, name, max) => {
    if (!Array.isArray(value) || !value.length || value.length > max) fail(`${name}: entre 1 y ${max} entradas.`)
    value.forEach((row, i) => {
      string(row.title, `${name}.${i}.title`)
      string(row.text, `${name}.${i}.text`)
    })
  }

  rows(q.scope?.rows, 'scope.rows', 7)
  string(q.schedule?.title, 'schedule.title')
  string(q.schedule?.note, 'schedule.note')
  rows(q.schedule?.phases, 'schedule.phases', 3)
  q.schedule.phases.forEach((p, i) => string(p.label, `schedule.phases.${i}.label`))
  title(q.pricing?.title, 'pricing.title')
  for (const key of ['intro', 'summary', 'taxNote']) string(q.pricing?.[key], `pricing.${key}`)

  if (q.pricing.monthly != null) {
    if (
      !Number.isSafeInteger(q.pricing.monthly.months) ||
      q.pricing.monthly.months < 1 ||
      q.pricing.monthly.months > 120
    )
      fail('pricing.monthly.months: entero de 1 a 120.')
    string(q.pricing.monthly.note, 'pricing.monthly.note')
  }

  title(q.conditions?.title, 'conditions.title')
  rows(q.conditions?.rows, 'conditions.rows', 6)
  if (q.status === 'example' && !/sin validez comercial/i.test(q.cover.label))
    fail('El ejemplo debe decir Sin validez comercial en cover.label.')

  return q
}

export function quoteAmounts(q) {
  const presentation = createMoneyPresentation(q),
    currency = presentation.currency

  const v2 = q.version === 2

  if (v2) assertOwnCurrency(q)
  // Versión 2: el neto es la suma exacta de las líneas, en unidades menores y sin conversión.
  const netMinor = v2 ? linesNetMinor(q) : presentation.convertMinor(q.net)
  // Versión 2: «no aplica» es un impuesto cero declarado, «por confirmar» sigue siendo desconocido (null) y
  // taxAmount, si viene, sustituye al impuesto calculado.
  const tax = v2 ? taxOf(q, netMinor) : null
  const vatMinor = tax ? tax.minor : q.vatRate === null ? null : taxMinor(netMinor, q.vatRate)
  const totalMinor = vatMinor === null ? null : netMinor + vatMinor

  const net = fromMinor(netMinor, currency),
    vat = vatMinor === null ? null : fromMinor(vatMinor, currency)

  const total = totalMinor === null ? null : fromMinor(totalMinor, currency),
    months = q.pricing.monthly?.months

  return {
    net,
    vat,
    total,
    monthly: months
      ? {
          months,
          net: net / months,
          vat: vat === null ? null : vat / months,
          total: total === null ? null : total / months
        }
      : null,
    // Versión 2: de dónde sale el impuesto impreso (computed | stated | pending | not_applicable).
    ...(tax ? { taxSource: tax.source } : {})
  }
}

export function fillSlots(template, slots) {
  // Una sola pasada evita interpretar {{...}} que venga en el texto del cliente.
  return template.replace(/\{\{([\w.]+)\}\}/g, (_, key) => {
    if (!Object.hasOwn(slots, key)) throw new Error(`Slot sin resolver: ${key}`)

    return slots[key]
  })
}

// ── Paginación de la versión 2 ───────────────────────────────────────────────────────────────────────────
// buildHtml no usa navegador: reparte la sección de precios con un presupuesto de altura determinista. Los
// anchos de texto salen de las mismas fuentes que se incrustan (tablas hmtx/cmap) y las alturas replican
// template-lineas.css. El presupuesto se calibró contra Chromium; la comprobación de layout del render sigue
// siendo la guarda: una estimación corta falla con «Contenido fuera del A4», nunca entrega una página rota.
const fontCache = new Map()

function parseFont(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const tables = new Map()

  for (let i = 0, count = view.getUint16(4); i < count; i++) {
    const at = 12 + i * 16

    tables.set(String.fromCharCode(...bytes.subarray(at, at + 4)), view.getUint32(at + 8))
  }

  const table = tag => {
    if (!tables.has(tag)) throw new Error(`Fuente sin tabla ${tag}: no se puede medir el texto.`)

    return tables.get(tag)
  }

  const unitsPerEm = view.getUint16(table('head') + 18)
  const metricCount = view.getUint16(table('hhea') + 34)
  const hmtx = table('hmtx')
  const cmap = table('cmap')
  let best = null

  for (let i = 0, count = view.getUint16(cmap + 2); i < count; i++) {
    const at = cmap + 4 + i * 8
    const platform = view.getUint16(at)
    const encoding = view.getUint16(at + 2)
    const offset = cmap + view.getUint32(at + 4)
    const format = view.getUint16(offset)

    if (
      (platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10))) &&
      (format === 4 || format === 12) &&
      (!best || format > best.format)
    )
      best = { format, offset }
  }

  if (!best) throw new Error('Fuente sin cmap Unicode: no se puede medir el texto.')
  const { format, offset } = best

  const glyph =
    format === 12
      ? code => {
          for (let i = 0, count = view.getUint32(offset + 12); i < count; i++) {
            const at = offset + 16 + i * 12

            if (code < view.getUint32(at)) return 0
            if (code <= view.getUint32(at + 4)) return view.getUint32(at + 8) + code - view.getUint32(at)
          }

          return 0
        }
      : code => {
          const segments = view.getUint16(offset + 6) / 2
          const ends = offset + 14
          const starts = ends + segments * 2 + 2

          for (let i = 0; i < segments; i++) {
            if (code > view.getUint16(ends + i * 2)) continue
            const start = view.getUint16(starts + i * 2)

            if (code < start) return 0
            const delta = view.getUint16(starts + segments * 2 + i * 2)
            const rangeAt = starts + segments * 4 + i * 2
            const range = view.getUint16(rangeAt)

            if (!range) return (code + delta) & 0xffff
            const id = view.getUint16(rangeAt + range + (code - start) * 2)

            return id ? (id + delta) & 0xffff : 0
          }

          return 0
        }

  const advances = new Map()

  // Avance en em. Un carácter sin glifo usa una fuente de respaldo: se reserva un em completo.
  return code => {
    if (!advances.has(code)) {
      const id = glyph(code)

      advances.set(code, id ? view.getUint16(hmtx + 4 * Math.min(id, metricCount - 1)) / unitsPerEm : 1)
    }

    return advances.get(code)
  }
}

async function fontAdvance(file) {
  if (!fontCache.has(file)) fontCache.set(file, parseFont(await fs.readFile(file)))

  return fontCache.get(file)
}

const round2 = value => Math.round(value * 100) / 100
const PX_PER_PT = 96 / 72
const PX_PER_MM = 96 / 25.4

// Geometría de template.css + template-lineas.css en píxeles CSS de impresión. Si cambian esos estilos, la
// tipografía de marca o el pie, hay que volver a calibrar (ver VERIFICACION.md, «Versión 2»).
const FLOW = {
  width: (210 - 2 * 18) * PX_PER_MM,
  // Alto útil medido en Chromium entre el inicio del contenido y la reserva de 6 px sobre el pie: 882,56 px.
  // El presupuesto deja 12,56 px más: margen de la estimación y aire sobre el divisor del pie.
  capacity: 870,
  // Holgura del ancho de línea: los avances de Poppins coinciden con Chromium (±0,05 %); 1 % cubre el resto.
  wrapSlack: 0.99,
  // Bricolage es variable: su tabla de avances es la de la instancia por defecto. Medido en Chromium, el peso
  // de títulos (760) es hasta 1,16 veces más ancho y el de cifras (600) hasta 1,10; se usa la cota superior.
  displayScale: 1.18,
  valueScale: 1.11,
  amountScale: 1.01
}

function textWidth(text, font) {
  const value = font.upper ? String(text).toLocaleUpperCase('es') : String(text)
  let em = 0
  let count = 0

  for (const char of value) {
    em += font.advance(char.codePointAt(0))
    count++
  }

  return (em * (font.scale ?? 1) + count * (font.tracking ?? 0)) * font.size
}

// Líneas que ocupa un texto en un ancho dado. Corta en espacios; una palabra más ancha que la línea empieza
// línea propia y se parte como lo hace el navegador (overflow-wrap), tomando el peor de dos repartos: por
// caracteres o en sus guiones y barras. Es deliberadamente conservador: nunca cuenta menos líneas que Chromium.
function countLines(text, width, font) {
  const limit = width * FLOW.wrapSlack
  const space = textWidth(' ', font)
  let count = 1
  let used = 0

  // Reparte piezas indivisibles (o divisibles sólo por caracteres) desde una línea vacía.
  const fill = pieces => {
    let lineCount = 1
    let rest = 0

    for (const piece of pieces) {
      const size = textWidth(piece, font)

      if (rest > 0 && rest + size > limit) {
        lineCount++
        rest = 0
      }

      if (size <= limit) {
        rest += size
        continue
      }

      for (const char of piece) {
        const charSize = textWidth(char, font)

        if (rest > 0 && rest + charSize > limit) {
          lineCount++
          rest = 0
        }

        rest += charSize
      }
    }

    return { lineCount, rest }
  }

  for (const word of String(text).trim().split(/\s+/)) {
    const size = textWidth(word, font)

    if (used > 0 && used + space + size <= limit) {
      used += space + size
      continue
    }

    if (used > 0) {
      count++
      used = 0
    }

    if (size <= limit) {
      used = size
      continue
    }

    const whole = fill([word])
    const split = fill(word.split(/(?<=[-/‐–—])/))

    count += Math.max(whole.lineCount, split.lineCount) - 1
    used = Math.max(whole.rest, split.rest)
  }

  return count
}

// Piezas de medición expuestas para las pruebas y para recalibrar el presupuesto contra el navegador.
export const paginationInternals = { FLOW, fontDir, fontAdvance, textWidth, countLines }

const CLIENT_PAID_TITLE = 'Pagado directamente por el cliente a su proveedor'

const CLIENT_PAID_NOTE =
  'El cliente contrata y paga estos costos directamente a su proveedor. No forman parte de esta cotización ni de su valor neto o total. Cada importe se informa en su propia moneda, sin conversión ni suma.'

// Reparte la sección de precios de la versión 2 en páginas. Devuelve, por página, los bloques en el orden
// del documento con su separación y altura estimadas. No imprime nada: renderPricingPages usa este plan.
async function planPricing(q, { money, locale, monthlyTexts }) {
  const [regular, semibold, display] = await Promise.all(
    ['poppins-400.ttf', 'poppins-600.ttf', 'bricolage-grotesque-variable.ttf'].map(file =>
      fontAdvance(path.join(fontDir, file))
    )
  )

  if (!/^[\d.]+rem$/.test(axisGeometry.spacing.base) || !/^-?[\d.]+em$/.test(gl.type.answer.tracking))
    throw new Error('Tokens de marca con unidades inesperadas: recalibra la paginación de la versión 2.')
  const step = parseFloat(axisGeometry.spacing.base) * 16
  const pt = value => value * PX_PER_PT

  const displayFont = size => ({
    advance: display,
    size: pt(size),
    tracking: parseFloat(gl.type.answer.tracking),
    scale: FLOW.displayScale
  })

  const font = {
    title: displayFont(29),
    heading: displayFont(14),
    intro: { advance: regular, size: pt(10.3) },
    label: { advance: semibold, size: pt(10) },
    detail: { advance: regular, size: pt(8.8) },
    unit: { advance: regular, size: pt(8) },
    group: { advance: semibold, size: pt(8), tracking: 0.08, upper: true },
    note: { advance: regular, size: pt(8.5) },
    cell: { advance: regular, size: pt(8.8) },
    cellStrong: { advance: semibold, size: pt(8.8) },
    amount: { advance: semibold, size: pt(10), scale: FLOW.amountScale },
    unitAmount: { advance: regular, size: pt(10), scale: FLOW.amountScale },
    cellAmount: { advance: semibold, size: pt(8.8), scale: FLOW.amountScale }
  }

  // Alto de una línea de texto por estilo: tamaño × interlineado de la hoja de estilos.
  const line = {
    title: pt(29) * 1.1,
    heading: pt(14) * 1.25,
    intro: pt(10.3) * 1.6,
    label: pt(10) * 1.6,
    detail: pt(8.8) * 1.6,
    unit: pt(8) * 1.6,
    small: pt(8) * 1.5,
    note: pt(8.5) * 1.6,
    cell: pt(8.8) * 1.47
  }

  const fail = message => {
    throw new Error(`Contenido fuera del A4. ${message} No se reduce la tipografía ni se recorta el contenido.`)
  }

  const amountFits = (text, width, amountFont, name) => {
    if (textWidth(text, amountFont) > width) fail(`El importe ${text} (${name}) no cabe en su columna.`)
  }

  // Cabecera de tabla: relleno vertical de 11 px y una línea de 8 pt.
  const head = 22 + line.small
  const hasUnit = q.lines.some(item => item.unitNet != null)
  const netTexts = q.lines.map(item => money(item.net))
  const unitTexts = q.lines.map(item => (item.unitNet == null ? null : money(item.unitNet)))
  const widest = (texts, amountFont) => Math.max(0, ...texts.filter(Boolean).map(text => textWidth(text, amountFont)))

  // Anchos de columna, en % del ancho útil. Las columnas de importes parten del ancho del diseño y sólo
  // crecen si un importe del documento lo exige; el concepto recibe el resto y nunca baja del 40 %.
  const percent = px => Math.ceil((px / FLOW.width) * 1e5) / 1e3
  const quantityShare = 14
  const unitShare = hasUnit ? Math.max(19, percent(widest(unitTexts, font.unitAmount) + step * 6 + 2)) : 0
  const netShare = Math.max(hasUnit ? 20 : 22, percent(widest(netTexts, font.amount) + step * 3 + 2))
  const conceptShare = Math.round((100 - quantityShare - unitShare - netShare) * 1e3) / 1e3

  if (conceptShare < 40)
    fail('Los importes de las líneas son demasiado anchos para la tabla: no dejan espacio al concepto.')
  const columns = hasUnit ? [conceptShare, quantityShare, unitShare, netShare] : [conceptShare, quantityShare, netShare]
  const conceptWidth = (FLOW.width * conceptShare) / 100 - step * 3
  const quantityWidth = (FLOW.width * quantityShare) / 100 - step * 6
  const showGroups = new Set(q.lines.map(item => item.group).filter(group => group != null)).size >= 2

  const groupRow = (text, continued = false) => ({
    type: 'group',
    text: continued ? `${text} (continuación)` : text,
    height:
      step * 4.5 + countLines(continued ? `${text} (continuación)` : text, FLOW.width, font.group) * line.small + 1
  })

  const rows = []
  let group

  q.lines.forEach((item, index) => {
    if (showGroups && item.group !== group) {
      group = item.group
      rows.push(groupRow(group))
    }

    const concept =
      countLines(item.label, conceptWidth, font.label) * line.label +
      (item.detail == null ? 0 : step + countLines(item.detail, conceptWidth, font.detail) * line.detail)

    const quantity = line.label + countLines(item.quantity.unit, quantityWidth, font.unit) * line.unit

    rows.push({
      type: 'line',
      index,
      netText: netTexts[index],
      unitText: unitTexts[index],
      height: step * 6 + Math.max(concept, quantity) + 1
    })
  })

  const titleLines = (Array.isArray(q.pricing.title) ? q.pricing.title : [q.pricing.title]).reduce(
    (sum, text) => sum + countLines(text, FLOW.width, font.title),
    0
  )

  const firstHead = [
    { key: 'overline', gap: 0, height: line.small },
    { key: 'title', gap: 10, height: titleLines * line.title },
    { key: 'intro', gap: 14, height: countLines(q.pricing.intro, FLOW.width * 0.95, font.intro) * line.intro }
  ]

  // Bloques que siguen a la tabla. Cada uno pasa entero a la página siguiente si no cabe.
  const blocks = [
    {
      name: 'los totales',
      items: [
        { key: 'totals', gap: 22, height: 2 * (30 + pt(12) * 1.5 + 1) + 18 + 44 + pt(30) * 1.5 },
        { key: 'taxNote', gap: 14, height: countLines(q.pricing.taxNote, FLOW.width, font.note) * line.note }
      ]
    }
  ]

  if (q.paymentSchedule != null) {
    const schedule = q.paymentSchedule
    let height =
      countLines(schedule.title, FLOW.width, font.heading) * line.heading +
      step +
      countLines(schedule.note, FLOW.width, font.note) * line.note +
      step * 3 +
      head

    const milestones = schedule.milestones.map((milestone, index) => {
      const netText = money(milestone.net)

      amountFits(netText, FLOW.width * 0.22 - 13, font.cellAmount, `paymentSchedule.milestones.${index}.net`)
      height +=
        step * 6 +
        1 +
        Math.max(
          countLines(milestone.label, FLOW.width * 0.38 - 13, font.cellStrong),
          countLines(milestone.when, FLOW.width * 0.4 - 26, font.cell)
        ) *
          line.cell

      return { netText }
    })

    blocks.push({ name: 'el calendario de pagos', items: [{ key: 'schedule', gap: step * 6, height, milestones }] })
  }

  if (q.clientPaidDirectly != null) {
    const inner = FLOW.width - step * 10
    const left = inner * (1 - 0.32) - step * 4
    let height =
      step * 10 +
      line.small +
      step * 1.5 +
      countLines(CLIENT_PAID_TITLE, inner, font.heading) * line.heading +
      step * 2 +
      countLines(CLIENT_PAID_NOTE, inner, font.note) * line.note +
      step * 3 -
      step * 2.5

    const entries = q.clientPaidDirectly.map((item, index) => {
      const amountText = formatMoney(item.amount, item.currency, locale)
      // El código ISO acompaña al importe (8 pt, con su margen) salvo que el formato ya lo incluya.
      const code = amountText.includes(item.currency) ? null : item.currency

      if (
        textWidth(amountText, font.amount) +
          (code ? step * 1.5 + textWidth(code, { ...font.unit, advance: semibold }) : 0) >
        inner * 0.32
      )
        fail(`El importe ${amountText} (clientPaidDirectly.${index}.amount) no cabe en su columna.`)
      height +=
        1 +
        step * 5 +
        countLines(item.label, left, font.label) * line.label +
        (item.detail == null ? 0 : countLines(item.detail, left, font.detail) * line.detail)

      return { amountText, code }
    })

    blocks.push({
      name: 'el bloque de costos pagados directamente por el cliente',
      items: [{ key: 'clientPaid', gap: step * 6, height, entries }]
    })
  }

  if (q.pricing.monthly != null) {
    // Tres cifras en una fila, sin partirse: las columnas ceden espacio entre sí, así que cuenta su suma.
    const valueFont = { advance: display, size: pt(18), scale: FLOW.valueScale }

    if (monthlyTexts.reduce((sum, text) => sum + textWidth(text, valueFont), 0) > FLOW.width - 40 - 2 * 14)
      fail('Los importes del equivalente mensual no caben en una fila; quita pricing.monthly.')

    blocks.push({
      name: 'el equivalente mensual',
      items: [
        {
          key: 'monthly',
          gap: step * 6,
          // Caja de la versión 1 (template.css): relleno, sobretítulo, título, fila de cifras y nota.
          height:
            40 +
            line.small +
            6 +
            pt(19) * 1.25 +
            18 +
            (line.small + 5 + pt(18) * 1.3) +
            18 +
            countLines(q.pricing.monthly.note, FLOW.width - 40, font.note) * line.note
        }
      ]
    })
  }

  const pages = []
  let page

  // La separación de un bloque que va inmediatamente después del sobretítulo de continuación es fija.
  const gapFor = item => (page.items.at(-1)?.key === 'overline' && item.key !== 'title' ? step * 3 : item.gap)

  const put = item => {
    const placed = { ...item, gap: page.items.length ? gapFor(item) : 0 }

    page.items.push(placed)
    page.used += placed.gap + placed.height

    return placed
  }

  const open = first => {
    page = { first, items: [], used: 0 }
    pages.push(page)
    for (const item of first ? firstHead : [firstHead[0]]) put(item)
  }

  const fits = extra => page.used + extra <= FLOW.capacity

  open(true)
  let table = null

  rows.forEach((row, i) => {
    // Un encabezado de grupo nunca queda solo al pie: viaja con su primera línea.
    const keep = row.height + (row.type === 'group' ? rows[i + 1].height : 0)

    const lead = () =>
      !table && showGroups && row.type === 'line' && i > 0 ? groupRow(q.lines[row.index].group, true) : null

    const cost = () => (table ? 0 : gapFor({ key: 'lines', gap: step * 5 }) + head + (lead()?.height ?? 0)) + keep

    if (!fits(cost())) {
      open(false)
      table = null
      if (!fits(cost()))
        fail(
          `La línea «${q.lines[row.type === 'group' ? rows[i + 1].index : row.index].label}» no cabe en una página; acorta su texto.`
        )
    }

    if (!table) {
      const first = lead()

      table = put({ key: 'lines', gap: step * 5, height: head, rows: [], continued: pages.length > 1 })

      if (first) {
        table.rows.push(first)
        table.height += first.height
        page.used += first.height
      }
    }

    table.rows.push(row)
    table.height += row.height
    page.used += row.height
  })

  for (const block of blocks) {
    const cost = () => block.items.reduce((sum, item, i) => sum + (i ? item.gap : gapFor(item)) + item.height, 0)

    if (!fits(cost())) {
      open(false)
      if (!fits(cost())) fail(`No cabe ${block.name} en una página; acorta sus textos o reduce sus entradas.`)
    }

    block.items.forEach(put)
  }

  return { columns, hasUnit, pages }
}

function renderPricingPages(q, plan, parts) {
  const quantity = new Intl.NumberFormat(parts.locale, { maximumFractionDigits: 0 })
  const unitHeader = plan.hasUnit ? '<th scope="col">Valor unitario</th>' : ''

  const lineRow = row => {
    const item = q.lines[row.index]
    const at = `lines.${row.index}`

    return `<tr><td><strong data-slot="${at}.label">${esc(item.label)}</strong>${item.detail == null ? '' : `<span data-slot="${at}.detail">${esc(item.detail)}</span>`}</td><td data-slot="${at}.quantity">${quantity.format(item.quantity.value)}<span>${esc(item.quantity.unit)}</span></td>${plan.hasUnit ? `<td data-slot="${at}.unitNet">${row.unitText ?? '—'}</td>` : ''}<td data-slot="${at}.net">${row.netText}</td></tr>`
  }

  const render = {
    overline: (item, first) => `<p class="overline">02 · Inversión${first ? '' : ' · continuación'}</p>`,
    title: () => `<h2 data-slot="pricing.title">${lines(q.pricing.title)}</h2>`,
    intro: () => `<p class="intro" data-slot="pricing.intro">${esc(q.pricing.intro)}</p>`,
    lines: item => {
      // Un tbody por grupo: el encabezado de grupo es la cabecera de su bloque de filas.
      const bodies = []

      for (const row of item.rows) {
        if (row.type === 'group' || !bodies.length) bodies.push([])
        bodies
          .at(-1)
          .push(
            row.type === 'group'
              ? `<tr class="group-row"><th colspan="${plan.columns.length}" scope="rowgroup">${esc(row.text)}</th></tr>`
              : lineRow(row)
          )
      }

      return `<table class="lines-table"><caption class="sr-only">Líneas de la cotización${item.continued ? ' (continuación)' : ''}</caption><colgroup>${plan.columns.map(share => `<col style="width:${share}%">`).join('')}</colgroup><thead><tr><th scope="col">Concepto</th><th scope="col">Cantidad</th>${unitHeader}<th scope="col">Valor neto</th></tr></thead>${bodies.map(body => `<tbody>${body.join('')}</tbody>`).join('')}</table>`
    },
    totals: () => parts.totals,
    taxNote: () => parts.taxNote,
    schedule: item =>
      `<div class="pay-schedule" data-slot="paymentSchedule"><h3 data-slot="paymentSchedule.title">${esc(q.paymentSchedule.title)}</h3><p data-slot="paymentSchedule.note">${esc(q.paymentSchedule.note)}</p><table class="milestones-table"><caption class="sr-only">Calendario de pagos</caption><thead><tr><th scope="col">Hito</th><th scope="col">Fecha o condición</th><th scope="col">Valor neto</th></tr></thead><tbody>${q.paymentSchedule.milestones
        .map(
          (milestone, i) =>
            `<tr><th scope="row" data-slot="paymentSchedule.milestones.${i}.label">${esc(milestone.label)}</th><td data-slot="paymentSchedule.milestones.${i}.when">${esc(milestone.when)}</td><td data-slot="paymentSchedule.milestones.${i}.net">${item.milestones[i].netText}</td></tr>`
        )
        .join('')}</tbody></table></div>`,
    clientPaid: item =>
      `<div class="client-paid" data-slot="clientPaidDirectly"><p class="overline">Fuera de esta cotización</p><h3>${esc(CLIENT_PAID_TITLE)}</h3><p>${esc(CLIENT_PAID_NOTE)}</p><div class="client-paid-rows">${q.clientPaidDirectly
        .map(
          (entry, i) =>
            `<div><div><strong data-slot="clientPaidDirectly.${i}.label">${esc(entry.label)}</strong>${entry.detail == null ? '' : `<span data-slot="clientPaidDirectly.${i}.detail">${esc(entry.detail)}</span>`}</div><b data-slot="clientPaidDirectly.${i}.amount">${esc(item.entries[i].amountText)}${item.entries[i].code ? `<span>${esc(item.entries[i].code)}</span>` : ''}</b></div>`
        )
        .join('')}</div></div>`,
    monthly: () => parts.monthly
  }

  return plan.pages
    .map((page, i) => {
      const n = 3 + i

      return `    <section id="pagina-${n}" class="page" aria-label="Página ${n}: Detalle económico${i ? ' (continuación)' : ''}">\n      ${parts.header}<div class="page-content pricing-flow">\n        ${page.items.map(item => render[item.key](item, page.first)).join('\n        ')}\n      </div>${parts.footer(n)}\n    </section>`
    })
    .join('\n')
}

export async function buildHtml(q, dataPath) {
  validateQuote(q)

  const amounts = quoteAmounts(q),
    presentation = createMoneyPresentation(q),
    assets = []

  const v2 = q.version === 2
  const notApplicable = v2 && q.vatRate === null && q.taxStatus === 'not_applicable'

  const money = value =>
    value === null ? 'Por confirmar' : formatMoney(value, presentation.currency, presentation.locale)

  const monthlyMoney = value =>
    value === null
      ? 'Por confirmar'
      : money(
          fromMinor(
            roundRatio(toMinor(value, presentation.currency), BigInt(amounts.monthly.months)),
            presentation.currency
          )
        )

  const taxLabel = q.pricing.taxLabel ?? (q.vatRate === null ? 'Impuestos' : 'IVA')
  const taxTotalLabel = notApplicable ? 'Total' : q.vatRate === null ? 'Total facturable' : `Total con ${taxLabel}`
  // «No aplica» nunca se imprime como $0: es una declaración, no un importe.
  const vatText = notApplicable ? 'No aplica' : money(amounts.vat)

  const monthlyTexts = amounts.monthly
    ? [monthlyMoney(amounts.net), notApplicable ? 'No aplica' : monthlyMoney(amounts.vat), monthlyMoney(amounts.total)]
    : null

  const fx = presentation.fx

  const fxNote = fx
    ? ` Conversión ${q.currency} → ${presentation.currency}: 1 ${q.currency} = ${fx.rate} ${presentation.currency}; tasa del ${fx.date}; ${fx.source}. ${fx.purpose === 'reference_conversion' ? 'Equivalencia referencial; moneda y tipo de cambio contractual por acordar.' : 'Tasa fijada para esta versión documental.'}`
    : ''

  async function asset(file, type, source) {
    const bytes = await fs.readFile(file)

    assets.push({ file: path.relative(repo, file), source, bytes: bytes.length, sha256: sha(bytes) })

    return `data:${type};base64,${bytes.toString('base64')}`
  }

  const logo = await asset(
    fileURLToPath(brandAssetUrl('efeonce-logo-positive')),
    'image/svg+xml',
    'axis-brand-assets:efeonce-logo-positive'
  )

  const bubble = await asset(
    fileURLToPath(brandAssetUrl('url-bubble-baked-light')),
    'image/svg+xml',
    'axis-brand-assets:url-bubble-baked-light'
  )

  let clientLogo = `<div class="client-name" data-slot="buyer.name">${esc(q.buyer.name)}</div>`

  if (q.buyer.logo) {
    const file = path.resolve(path.dirname(dataPath), q.buyer.logo.path)

    const mime = {
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp'
    }[path.extname(file).toLowerCase()]

    clientLogo = `<img data-slot="buyer.logo" src="${await asset(file, mime, q.buyer.logo.source)}" alt="${esc(q.buyer.unit)}">`
  }

  let fonts = ''

  for (const [family, weight, file] of [
    [gl.type.answer.family, '100 900', 'bricolage-grotesque-variable.ttf'],
    ...['400', '500', '600', '700'].map(w => [gl.type.text.family, w, `poppins-${w}.ttf`])
  ])
    fonts += `@font-face{font-family:"${family}";font-style:normal;font-weight:${weight};font-display:block;src:url("${await asset(path.join(fontDir, file), 'font/ttf', 'axis-fonts')}") format("truetype")}\n`
  const contactSource = 'src/lib/artifact-composer/catalogs/deck-axis/back-cover-full.slots.json'
  const contact = JSON.parse(await fs.readFile(path.join(repo, contactSource), 'utf8')).slots.contactDetails.value

  const engine = gl.lines.find(l => l.key === 'engine'),
    W = gl.orbit.baseWidthPx

  const orbit = orbitSvg({
    width: W,
    height: Math.round((W * 297) / 210),
    line: 'engine',
    surface: 'light',
    channel: 'print',
    circle: { cx: W, cy: 0, r: W * gl.orbit.radiusRatio.portraitOfWidth },
    start: 'bottom',
    span: 'accent',
    halo: false,
    idPrefix: 'quote-cover'
  })

  const divider = sphereDividerSvg({ widthPx: W - 136, line: 'engine', surface: 'light' })
  const template = TEMPLATES[q.version]

  const brandSlots = {
    'brand.fonts': fonts,
    'brand.ink': gl.color.navy,
    'brand.paper': axisSurface.light.paper,
    'brand.soft': gl.color.paper,
    'brand.navy': engine.darkBg,
    'brand.accent': engine.accentOnLight,
    'brand.textFamily': gl.type.text.family,
    'brand.displayFamily': gl.type.answer.family,
    'brand.radius': axisGeometry.radius.display,
    'brand.step': axisGeometry.spacing.base,
    'brand.round': axisGeometry.radius.round,
    'brand.weight': gl.type.answer.weight,
    'brand.tracking': gl.type.answer.tracking
  }

  let css = ''

  for (const name of template.css) css += fillSlots(await fs.readFile(path.join(templateDir, name), 'utf8'), brandSlots)

  const pricingPlan = v2 ? await planPricing(q, { money, locale: presentation.locale, monthlyTexts }) : null
  const pageTotal = v2 ? 3 + pricingPlan.pages.length : 4
  const folio = n => String(n).padStart(2, '0')

  const header = label =>
    `<header class="page-header"><img class="header-logo" src="${logo}" alt="Efeonce"><div class="header-meta"><span data-slot="buyer.unit">${esc(q.buyer.unit)}</span><span>${esc(label)} · <span data-slot="reference">${esc(q.reference)}</span></span></div></header>`

  const footer = n =>
    `<footer class="page-footer">${n === 1 ? '<div class="plain-divider"></div>' : `<div class="brand-divider">${divider}</div>`}<div class="footer-body"><div class="footer-contact"><span>${esc(contact.address)}</span><a href="tel:${esc(contact.chilePhone.replaceAll(' ', ''))}">${esc(contact.chilePhone)}</a></div><a class="url-bubble" href="https://efeoncepro.com/" aria-label="Sitio web de Efeonce"><img src="${bubble}" alt="efeoncepro.com"></a><span class="folio">${folio(n)} / ${folio(pageTotal)}</span></div></footer>`

  const slots = {
    'document.locale': esc(presentation.locale),
    'currency.code': esc(presentation.currency),
    'tax.label': esc(taxLabel),
    'tax.totalLabel': esc(taxTotalLabel),
    'tax.rateSuffix':
      q.vatRate === null
        ? ''
        : ` (${new Intl.NumberFormat(presentation.locale, { maximumFractionDigits: 2 }).format(q.vatRate * 100)} %)`,
    'document.title': esc(`${q.buyer.name} · Cotización · Efeonce`),
    'document.description': esc(`Cotización de ${q.service.name} para ${q.buyer.name}. ${q.reference}.`),
    'brand.css': css,
    'brand.logo': logo,
    'brand.orbit': orbit.svg,
    'date.label': esc(
      new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(q.date))
    ),
    reference: esc(q.reference),
    'buyer.logo': clientLogo,
    'buyer.name': esc(q.buyer.name),
    'buyer.taxId': esc(q.buyer.taxId),
    'supplier.name': esc(q.supplier.name),
    'supplier.taxId': esc(q.supplier.taxId),
    'supplier.contact': esc(q.supplier.contact),
    'supplier.email': esc(q.supplier.email),
    'supplier.emailHref': esc(`mailto:${q.supplier.email}`),
    'supplier.phone': esc(q.supplier.phone),
    'supplier.phoneHref': esc(`tel:${q.supplier.phone.replaceAll(/[ ()-]/g, '')}`),
    'cover.label': esc(q.cover.label),
    'cover.title': lines(q.cover.title),
    'cover.subtitle': esc(q.cover.subtitle),
    'scope.title': lines(q.scope.title),
    'scope.intro': esc(q.scope.intro),
    'scope.rows': q.scope.rows
      .map(
        (r, i) =>
          `<tr><th scope="row" data-slot="scope.rows.${i}.title">${esc(r.title)}</th><td data-slot="scope.rows.${i}.text">${esc(r.text)}</td></tr>`
      )
      .join(''),
    'schedule.title': esc(q.schedule.title),
    'schedule.note': esc(q.schedule.note),
    'schedule.count': q.schedule.phases.length,
    'schedule.phases': q.schedule.phases
      .map(
        (p, i) =>
          `<div><span class="label" data-slot="schedule.phases.${i}.label">${esc(p.label)}</span><h4 data-slot="schedule.phases.${i}.title">${esc(p.title)}</h4><p data-slot="schedule.phases.${i}.text">${esc(p.text)}</p></div>`
      )
      .join(''),
    'service.name': esc(q.service.name),
    'service.detail': esc(q.service.detail),
    'pricing.title': lines(q.pricing.title),
    'pricing.intro': esc(q.pricing.intro),
    'pricing.summary': esc(q.pricing.summary),
    'pricing.taxNote':
      esc(q.pricing.taxNote + fxNote) + (fx ? ` <a href="${esc(fx.sourceUrl)}">Fuente del tipo de cambio</a>` : ''),
    'amount.net': money(amounts.net),
    'amount.vat': vatText,
    'amount.total': money(amounts.total),
    'vatRate.label':
      q.vatRate === null
        ? 'Por confirmar'
        : new Intl.NumberFormat(presentation.locale, { maximumFractionDigits: 2 }).format(q.vatRate * 100),
    'pricing.monthly': amounts.monthly
      ? `<div class="monthly" data-slot="pricing.monthly"><p class="overline">Referencia de distribución</p><h3>Equivalente mensual</h3><div class="monthly-grid"><div><span>Neto</span><strong data-slot="amount.monthly.net">${monthlyTexts[0]}</strong></div><div><span>${esc(taxLabel)}</span><strong data-slot="amount.monthly.vat">${monthlyTexts[1]}</strong></div><div><span>${esc(taxTotalLabel)}</span><strong data-slot="amount.monthly.total">${monthlyTexts[2]}</strong></div></div><p>${esc(q.pricing.monthly.note)}</p></div>`
      : '',
    'conditions.title': lines(q.conditions.title),
    'conditions.rows': q.conditions.rows
      .map(
        (r, i) =>
          `<section><span class="condition-index">${String(i + 1).padStart(2, '0')}</span><div><h3 data-slot="conditions.rows.${i}.title">${esc(r.title)}</h3><p data-slot="conditions.rows.${i}.text">${esc(r.text)}</p></div></section>`
      )
      .join('')
  }

  ;['Alcance y calendario', 'Detalle de la cotización', 'Condiciones de ejecución'].forEach((label, i) => {
    slots[`header.${i + 2}`] = header(label)
  })
  for (let n = 1; n <= 4; n++) slots[`footer.${n}`] = footer(n)

  if (v2) {
    slots['conditions.page'] = pageTotal
    slots['header.conditions'] = header('Condiciones de ejecución')
    slots['footer.conditions'] = footer(pageTotal)
    slots['pricing.pages'] = renderPricingPages(q, pricingPlan, {
      header: header('Detalle de la cotización'),
      footer,
      locale: presentation.locale,
      totals: `<div class="totals"><div><span>Subtotal neto</span><strong data-slot="amount.net">${slots['amount.net']}</strong></div><div><span><span data-slot="tax.label">${slots['tax.label']}</span>${slots['tax.rateSuffix']}</span><strong data-slot="amount.vat">${slots['amount.vat']}</strong></div><div class="grand-total"><span>${slots['tax.totalLabel']}</span><strong data-slot="amount.total">${slots['amount.total']}</strong></div></div>`,
      taxNote: `<p class="tax-note" data-slot="pricing.taxNote">${slots['pricing.taxNote']}</p>`,
      monthly: slots['pricing.monthly']
    })
  }

  const html = fillSlots(await fs.readFile(path.join(templateDir, template.html), 'utf8'), slots)

  return {
    html,
    amounts,
    pageCount: pageTotal,
    templateFiles: [template.html, ...template.css],
    pagination: pricingPlan
      ? pricingPlan.pages.map((page, i) => ({
          page: 3 + i,
          estimatedPx: round2(page.used),
          capacityPx: FLOW.capacity,
          blocks: page.items.map(item => ({
            key: item.key,
            gapPx: round2(item.gap),
            heightPx: round2(item.height),
            ...(item.rows ? { rowsPx: item.rows.map(row => round2(row.height)) } : {})
          }))
        }))
      : null,
    presentation: {
      currency: presentation.currency,
      sourceCurrency: q.currency,
      locale: presentation.locale,
      precision: presentation.precision,
      fx: presentation.fx
    },
    brand: { line: 'engine', assets, contactSource, orbit: orbit.manifest }
  }
}

async function main(args) {
  if (args.length !== 4 || args[0] !== '--data' || args[2] !== '--out')
    throw new Error('Uso: node scripts/documents/render-cotizacion-a4.mjs --data cotizacion.json --out carpeta-nueva')

  const dataPath = path.resolve(args[1]),
    output = path.resolve(args[3])

  const q = JSON.parse(await fs.readFile(dataPath, 'utf8'))

  const {
    html,
    amounts,
    presentation,
    brand,
    pageCount,
    templateFiles: templateNames,
    pagination
  } = await buildHtml(q, dataPath)

  try {
    if ((await fs.readdir(output)).length)
      throw new Error('La carpeta de salida contiene archivos. Use una carpeta nueva para conservar las versiones.')
  } catch (e) {
    if (e.code !== 'ENOENT') throw e
  }

  const browser = await chromium.launch()

  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 1300 } })
    const errors = []

    page.on('pageerror', e => errors.push(e.message))

    const load = async handle => {
      await handle.setContent(html, { waitUntil: 'load' })
      await handle.evaluate(async () => {
        await document.fonts.ready
        await Promise.all([...document.images].map(img => img.decode()))
      })
    }

    await load(page)
    await page.emulateMedia({ media: 'print' })

    const layout = await page.evaluate(
      strict =>
        [...document.querySelectorAll('.page')].map((p, i) => {
          const box = p.getBoundingClientRect(),
            foot = p.querySelector('.page-footer').getBoundingClientRect(),
            content = p.querySelector('.page-content, .cover-content')

          const overflow = [...content.querySelectorAll('*'), ...p.querySelectorAll('header *, footer *')]
            .filter(el => {
              const r = el.getBoundingClientRect()

              return (
                r.height &&
                (r.left < box.left - 1 ||
                  r.right > box.right + 1 ||
                  (content.contains(el) && r.bottom > foot.top - 6) ||
                  // Versión 2: además, ningún texto puede salirse de su propia caja (una cifra sobre otra columna).
                  (strict &&
                    content.contains(el) &&
                    !el.classList.contains('sr-only') &&
                    el.clientWidth > 0 &&
                    el.scrollWidth > el.clientWidth + 1))
              )
            })
            .map(el => el.textContent.slice(0, 80))

          const contentBox = content.getBoundingClientRect()
          const headerGapPx = contentBox.top - p.querySelector('header').getBoundingClientRect().bottom

          return {
            page: i + 1,
            gapPx: foot.top - contentBox.bottom,
            headerGapPx,
            contentPx: contentBox.height,
            overflow
          }
        }),
      q.version === 2
    )

    if (
      errors.length ||
      layout.length !== pageCount ||
      layout.some(p => p.overflow.length || p.gapPx < 6 || p.headerGapPx < 6)
    )
      throw new Error(
        `Contenido fuera del A4. Acorte el texto o prepare otra paginación; no se reduce la tipografía automáticamente.\n${JSON.stringify({ pageCount, layout, errors }, null, 2)}`
      )

    // Versión 2: altura estimada por el plan frente a la medida en el navegador, página por página.
    const paginationCheck = pagination?.map(estimate => ({
      ...estimate,
      measuredPx: Math.round(layout[estimate.page - 1].contentPx * 100) / 100
    }))

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })

    await load(mobile)

    const mobileCheck = await mobile.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth
    }))

    if (mobileCheck.scrollWidth > mobileCheck.width + 1)
      throw new Error('El documento desborda en móvil. Acorte los textos o revise la composición.')

    const pdf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      tagged: true,
      outline: true,
      displayHeaderFooter: false
    })

    await fs.mkdir(output, { recursive: true })
    await fs.mkdir(path.join(output, 'qa'), { recursive: true })
    await fs.writeFile(path.join(output, 'cotizacion.html'), html)
    await fs.writeFile(path.join(output, 'cotizacion.pdf'), pdf)
    const snapshot = structuredClone(q)

    if (q.buyer.logo) {
      const source = path.resolve(path.dirname(dataPath), q.buyer.logo.path)
      const localName = `logo-cliente${path.extname(source).toLowerCase()}`

      await fs.copyFile(source, path.join(output, localName))
      snapshot.buyer.logo.path = localName
    }

    await fs.writeFile(path.join(output, 'datos.json'), JSON.stringify(snapshot, null, 2) + '\n')
    for (let i = 0; i < pageCount; i++)
      await page
        .locator('.page')
        .nth(i)
        .screenshot({ path: path.join(output, 'qa', `pagina-${i + 1}.png`) })
    await mobile.screenshot({ path: path.join(output, 'qa', 'mobile.png') })

    const templateFiles = await Promise.all(
      templateNames.map(async name => ({
        name,
        sha256: sha(await fs.readFile(path.join(templateDir, name)))
      }))
    )

    const manifest = {
      template: 'cotizacion-a4',
      version: 2,
      templateFiles,
      generatedAt: new Date().toISOString(),
      dataVersion: q.version,
      pageCount,
      status: q.status,
      signed: false,
      submitted: false,
      currency: presentation.currency,
      sourceCurrency: q.currency,
      presentation,
      amounts,
      dataSource: path.relative(repo, dataPath),
      dataSha256: sha(await fs.readFile(dataPath)),
      // Trazabilidad del origen de los datos (versión 2). Viaja sólo en el manifiesto; el documento no la imprime.
      ...(q.source != null ? { source: structuredClone(q.source) } : {}),
      brand,
      checks: {
        layout,
        ...(paginationCheck ? { pagination: paginationCheck } : {}),
        mobile: mobileCheck,
        browserErrors: errors,
        visualReview: 'pending',
        pdfTextAndPageAudit: 'pending'
      },
      files: [
        { name: 'cotizacion.html', sha256: sha(html) },
        { name: 'cotizacion.pdf', sha256: sha(pdf) }
      ]
    }

    await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
    console.log(
      JSON.stringify(
        {
          output,
          pageCount,
          amounts,
          layout,
          ...(paginationCheck ? { pagination: paginationCheck } : {}),
          mobile: mobileCheck
        },
        null,
        2
      )
    )
  } finally {
    await browser.close()
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}

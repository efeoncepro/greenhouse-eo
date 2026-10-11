import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

import { validateQuote, quoteAmounts, fillSlots, buildHtml, paginationInternals } from './render-cotizacion-a4.mjs'

const dataPath = new URL('../../docs/commercial/templates/cotizacion-a4/ejemplo.json', import.meta.url)
const example = JSON.parse(await fs.readFile(dataPath, 'utf8'))

test('neto del servicio completo e IVA redondeado al peso, incluidos casos sin impuesto', () => {
  assert.deepEqual(quoteAmounts(example), {
    net: 4800000,
    vat: 912000,
    total: 5712000,
    monthly: { months: 3, net: 1600000, vat: 304000, total: 1904000 }
  })
  assert.equal(quoteAmounts({ ...example, net: 50, vatRate: 0.19 }).vat, 10)
  assert.equal(quoteAmounts({ ...example, vatRate: 0 }).total, example.net)
})

test('rechaza estados presentados, fechas imposibles y montos inválidos', () => {
  assert.throws(() => validateQuote({ ...example, submitted: true }), /presentada/)
  assert.throws(() => validateQuote({ ...example, signed: true }), /firmada/)
  assert.throws(() => validateQuote({ ...example, date: '2026-02-30' }), /fecha/)
  assert.throws(() => validateQuote({ ...example, net: -1 }), /positivo/)
  assert.throws(() => validateQuote({ ...example, vatRate: 0.12345 }), /cuatro/)
  assert.throws(() => validateQuote({ ...example, currency: 'ZZZ' }), /ISO/)
  assert.throws(() => validateQuote({ ...example, currency: 'CLP', net: 10.25 }), /decimales/)
  assert.throws(() => validateQuote({ ...example, status: 'submitted' }), /status/)
})

test('los slots se resuelven una vez y no toleran campos olvidados', () => {
  assert.equal(fillSlots('{{name}} / {{name}}', { name: '{{amount.total}}' }), '{{amount.total}} / {{amount.total}}')
  assert.throws(() => fillSlots('{{missing}}', {}), /sin resolver/)
})

test('textos de cliente escapados, montos coherentes y equivalente mensual opcional', async () => {
  const q = structuredClone(example)

  q.buyer.name = '<script>alert(1)</script> & {{reference}}'
  q.pricing.monthly = null
  const { html, amounts } = await buildHtml(q, dataPath.pathname)

  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt; &amp; {{reference}}'))
  assert.ok(!html.includes('<script>alert(1)</script>'))
  assert.ok(!html.includes('Equivalente mensual'))
  assert.equal(amounts.monthly, null)
  assert.equal((html.match(/data-slot="amount.net">\$4\.800\.000/g) ?? []).length, 3)
  assert.equal((html.match(/data-slot="amount.total">\$5\.712\.000/g) ?? []).length, 2)
  assert.ok(!html.includes('UTEM'))
  assert.equal((html.match(/class="page-footer"/g) ?? []).length, 4)
})

test('USD/PEN aceptan centavos; impuesto explícito y null no se infieren por moneda', async () => {
  const usd = { ...example, currency: 'USD', net: 12.34 }

  validateQuote(usd)
  assert.equal(quoteAmounts(usd).vat, 2.34)
  assert.equal(quoteAmounts(usd).total, 14.68)

  const pen = {
    ...example,
    currency: 'PEN',
    net: 272210.4,
    vatRate: null,
    pricing: { ...example.pricing, monthly: null }
  }

  assert.deepEqual(quoteAmounts(pen), { net: 272210.4, vat: null, total: null, monthly: null })
  const { html } = await buildHtml(pen, dataPath.pathname)

  assert.ok(html.includes('S/ 272,210.40'))
  assert.ok(html.includes('Impuestos'))
  assert.ok(html.includes('Por confirmar'))
  assert.ok(!html.includes('IVA (18'))
  assert.throws(() => validateQuote({ ...usd, net: 12.345 }), /decimales/)
})

test('conversión documental requiere snapshot de tasa y conserva CLP histórico', async () => {
  const fx = {
    from: 'USD',
    to: 'PEN',
    rate: '3.437',
    date: '2026-10-06',
    source: 'BCRPData SBS venta',
    sourceUrl: 'https://estadisticas.bcrp.gob.pe/estadisticas/series/diarias/resultados/PD04640PD/html',
    purpose: 'reference_conversion'
  }

  const q = {
    ...example,
    currency: 'USD',
    net: 79200,
    vatRate: null,
    presentation: { currency: 'PEN', fx },
    pricing: { ...example.pricing, monthly: null }
  }

  assert.equal(quoteAmounts(q).net, 272210.4)
  const { html, presentation } = await buildHtml(q, dataPath.pathname)

  assert.ok(html.includes('S/ 272,210.40'))
  assert.ok(html.includes('3.437') && html.includes('2026-10-06'))
  assert.equal(presentation.sourceCurrency, 'USD')
  assert.throws(() => validateQuote({ ...q, presentation: { currency: 'PEN' } }), /par exacto/)
})

// ── Versión 1 intacta ────────────────────────────────────────────────────────────────────────────────────
// SHA-256 del HTML de los tres ejemplos de la versión 1, medido antes de añadir la versión 2. Las cotizaciones
// ya entregadas salieron de esta plantilla: un cambio aquí es una regresión, salvo que se actualice a propósito
// un recurso de marca (fuente, logo, tokens AXIS) y se vuelva a fijar la referencia.
const V1_BASELINE = {
  'ejemplo.json': '623988f8c829409f9c27b90869a3da833f010b401171e978f97183593249bde8',
  'ejemplo-pen.json': '3bebc250a2972cff212abd06ce3d25d8a6f2f2b506d1ccd7ee97ccabf857fd9c',
  'ejemplo-usd-pen.json': 'd5ce59156cd73a2b579f4d062910f572da964a26e51b2df536b4b77fc4affd56'
}

const templateDir = new URL('../../docs/commercial/templates/cotizacion-a4/', import.meta.url)
const templatePath = name => fileURLToPath(new URL(name, templateDir))
const load = async name => JSON.parse(await fs.readFile(templatePath(name), 'utf8'))

test('versión 1: el HTML de los tres ejemplos conserva su SHA-256', async () => {
  for (const [name, expected] of Object.entries(V1_BASELINE)) {
    const { html, pageCount } = await buildHtml(await load(name), templatePath(name))

    assert.equal(createHash('sha256').update(html).digest('hex'), expected, name)
    assert.equal(pageCount, 4)
  }
})

test('versión 1: los datos de cotizaciones ya generadas siguen validando', async () => {
  const root = fileURLToPath(new URL('../../docs/commercial/', import.meta.url))
  const snapshots = (await fs.readdir(root, { recursive: true })).filter(file => path.basename(file) === 'datos.json')
  let checked = 0

  for (const file of snapshots) {
    const q = JSON.parse(await fs.readFile(path.join(root, file), 'utf8'))

    // Otros generadores también guardan datos.json; los de esta plantilla llevan portada y servicio.
    if (q.version !== 1 || !q.cover || !q.service) continue
    // Un expediente presentado no se regenera, pero sus datos deben seguir siendo válidos.
    validateQuote({ ...q, submitted: false, signed: false })
    assert.ok(quoteAmounts(q).net > 0, file)
    checked++
  }

  assert.ok(checked >= 2, 'se esperaba al menos la vista previa y una cotización entregada')
  assert.throws(() => validateQuote({ ...example, service: { name: 'Servicio' } }), /service\.detail/)
})

test('las dos plantillas comparten portada, alcance y condiciones', async () => {
  const [v1, v2] = await Promise.all(
    ['template.html', 'template-lineas.html'].map(name => fs.readFile(templatePath(name), 'utf8'))
  )

  const section = (html, id) => html.slice(html.indexOf(`<section id="${id}"`)).split('</section>')[0]

  assert.equal(section(v2, 'pagina-1'), section(v1, 'pagina-1'))
  assert.equal(section(v2, 'pagina-2'), section(v1, 'pagina-2'))
  assert.equal(
    section(v2, 'pagina-{{conditions.page}}')
      .replaceAll('{{conditions.page}}', '4')
      .replace('{{header.conditions}}', '{{header.4}}')
      .replace('{{footer.conditions}}', '{{footer.4}}'),
    section(v1, 'pagina-4')
  )
  assert.equal(v1.split('<main>')[0].replace('#pagina-4', '#pagina-{{conditions.page}}'), v2.split('<main>')[0])
})

// ── Versión 2: varias líneas ─────────────────────────────────────────────────────────────────────────────
const linesExample = await load('ejemplo-lineas.json')
const thirdPartyExample = await load('ejemplo-lineas-terceros.json')
const build = q => buildHtml(q, templatePath('ejemplo-lineas.json'))
const count = (html, needle) => html.split(needle).length - 1

const withLines = (lines, extra = {}) => {
  const q = { ...structuredClone(linesExample), lines, ...extra }

  delete q.net

  return q
}

const plainLines = (total, each = {}) =>
  Array.from({ length: total }, (_, i) => ({
    label: `Línea ${i + 1}`,
    quantity: { value: 1, unit: 'pago único' },
    net: '100000',
    ...each
  }))

test('versión 2: el neto es la suma exacta de las líneas y el impuesto se calcula una vez sobre ella', () => {
  const computed = { monthly: null, taxSource: 'computed' }

  assert.deepEqual(quoteAmounts(linesExample), { net: 16650000, vat: 3163500, total: 19813500, ...computed })
  assert.deepEqual(quoteAmounts(thirdPartyExample), { net: 17040000, vat: 3237600, total: 20277600, ...computed })

  // Tres líneas de 0,03: el 19 % de 0,09 es 0,02 (half-up). Redondear por línea daría 0,03.
  const cents = withLines(plainLines(3, { net: '0.03' }), { currency: 'USD' })

  validateQuote(cents)
  assert.deepEqual(quoteAmounts(cents), { net: 0.09, vat: 0.02, total: 0.11, ...computed })

  // 0,1 + 0,2 no es 0,3 en coma flotante; en unidades menores sí.
  const floats = withLines([...plainLines(1, { net: 0.1 }), ...plainLines(1, { net: '0.2' })], {
    currency: 'USD',
    net: '0.30'
  })

  validateQuote(floats)
  assert.equal(quoteAmounts(floats).net, 0.3)

  const monthly = withLines(plainLines(3, { quantity: { value: 3, unit: 'meses' }, unitNet: 100000, net: 300000 }), {
    pricing: { ...linesExample.pricing, monthly: { months: 3, note: 'Referencia aritmética.' } }
  })

  assert.deepEqual(quoteAmounts(monthly), {
    net: 900000,
    vat: 171000,
    total: 1071000,
    monthly: { months: 3, net: 300000, vat: 57000, total: 357000 },
    taxSource: 'computed'
  })
})

test('versión 2: impuesto por confirmar, no aplicable y tasa explícita se distinguen', async () => {
  const pending = withLines(plainLines(2), { vatRate: null })

  assert.deepEqual(quoteAmounts(pending), { net: 200000, vat: null, total: null, monthly: null, taxSource: 'pending' })
  const pendingHtml = (await build(pending)).html

  assert.ok(pendingHtml.includes('data-slot="amount.vat">Por confirmar<'))
  assert.ok(pendingHtml.includes('<span>Total facturable</span>'))
  assert.deepEqual(quoteAmounts({ ...pending, taxStatus: 'pending' }), quoteAmounts(pending))

  const exempt = withLines(plainLines(2), {
    vatRate: null,
    taxStatus: 'not_applicable',
    pricing: { ...linesExample.pricing, monthly: { months: 2, note: 'Referencia aritmética.' } }
  })

  assert.deepEqual(quoteAmounts(exempt), {
    net: 200000,
    vat: 0,
    total: 200000,
    monthly: { months: 2, net: 100000, vat: 0, total: 100000 },
    taxSource: 'not_applicable'
  })
  const exemptHtml = (await build(exempt)).html

  assert.ok(exemptHtml.includes('data-slot="amount.vat">No aplica<'))
  assert.ok(exemptHtml.includes('data-slot="amount.monthly.vat">No aplica<'))
  assert.ok(exemptHtml.includes('<span>Total</span><strong data-slot="amount.total">$200.000<'))
  assert.ok(!exemptHtml.includes('Por confirmar') && !exemptHtml.includes('$0'))

  const zero = withLines(plainLines(2), { vatRate: 0 })

  assert.ok((await build(zero)).html.includes('data-slot="amount.vat">$0<'))
  assert.throws(
    () => validateQuote({ ...zero, taxStatus: 'not_applicable' }),
    /taxStatus sólo se declara con vatRate: null/
  )
  assert.throws(() => validateQuote({ ...pending, taxStatus: 'exento' }), /pending o not_applicable/)
})

test('versión 2: taxAmount declara el impuesto de la cotización dentro de la tolerancia de redondeo', async () => {
  // Tres meses de 3.333.333 al 19 %: tributando mes a mes suman 1.899.999; una vez sobre el subtotal, 1.900.000.
  const months = withLines(plainLines(1, { quantity: { value: 3, unit: 'meses' }, unitNet: '3333333', net: '9999999' }))

  assert.equal(quoteAmounts(months).vat, 1900000)
  const stated = { ...months, taxAmount: '1899999' }

  validateQuote(stated)
  assert.deepEqual(quoteAmounts(stated), {
    net: 9999999,
    vat: 1899999,
    total: 11899998,
    monthly: null,
    taxSource: 'stated'
  })
  const { html, amounts } = await build(stated)

  // Se imprime la cifra de la cotización, nunca una segunda; la tasa no cambia.
  assert.equal(amounts.total, amounts.net + amounts.vat)
  assert.ok(html.includes('data-slot="amount.vat">$1.899.999<'))
  assert.equal(count(html, 'data-slot="amount.total">$11.899.998<'), 2)
  assert.ok(html.includes('</span> (19 %)</span>'))
  assert.ok(!html.includes('1.900.000') && !html.includes('11.899.999'))

  // El equivalente mensual deriva de la cifra declarada.
  const monthly = { ...stated, pricing: { ...stated.pricing, monthly: { months: 3, note: 'Referencia aritmética.' } } }

  assert.deepEqual(quoteAmounts(monthly).monthly, { months: 3, net: 3333333, vat: 633333, total: 3966666 })

  // Tolerancia: la suma de lines[].quantity.value, en unidades menores (aquí 3), hacia arriba o hacia abajo.
  for (const taxAmount of ['1899997', 1900003, '1900000']) validateQuote({ ...months, taxAmount })

  for (const taxAmount of ['1899996', '1900004', '0', '9999999']) {
    assert.throws(() => validateQuote({ ...months, taxAmount }), /taxAmount no corresponde a la tasa/)
    assert.throws(() => quoteAmounts({ ...months, taxAmount }), /taxAmount no corresponde a la tasa/)
  }

  const twoLines = withLines(plainLines(2, { quantity: { value: 12, unit: 'meses' }, net: '100000' }))

  validateQuote({ ...twoLines, taxAmount: '38024' })
  assert.throws(() => validateQuote({ ...twoLines, taxAmount: '38025' }), /hasta 24 unidades menores/)

  // Es un importe de la moneda del documento, y sólo acompaña a una tasa explícita de la versión 2.
  assert.throws(() => validateQuote({ ...months, taxAmount: '1899999.5' }), /taxAmount: CLP: máximo 0 decimales/)
  assert.throws(() => validateQuote({ ...months, taxAmount: '-1' }), /taxAmount: Decimal positivo/)
  assert.throws(
    () => validateQuote({ ...months, vatRate: null, taxAmount: '1899999' }),
    /taxAmount sólo se declara con una tasa explícita/
  )
  assert.throws(
    () => validateQuote({ ...months, vatRate: null, taxStatus: 'not_applicable', taxAmount: '0' }),
    /taxAmount sólo se declara con una tasa explícita/
  )
  assert.throws(() => validateQuote({ ...example, taxAmount: 912000 }), /taxAmount sólo existe en la versión 2/)
})

test('versión 2: cada regla del contrato se valida con un mensaje propio', () => {
  const base = () => structuredClone(thirdPartyExample)

  const rejects = (mutate, pattern) => {
    const q = base()

    mutate(q)
    assert.throws(() => validateQuote(q), pattern)
  }

  validateQuote(base())
  rejects(q => (q.version = 3), /version: 1 o 2/)
  // Un bloque mal escrito no se omite en silencio.
  rejects(q => (q.paymentShedule = q.paymentSchedule), /no reconocidos en version 2: paymentShedule/)
  rejects(q => (q.clientPaid = []), /no reconocidos en version 2: clientPaid/)
  rejects(q => delete q.lines, /lines: entre 1 y 40/)
  rejects(q => (q.lines = []), /lines: entre 1 y 40/)
  rejects(q => (q.lines = plainLines(41)), /lines: entre 1 y 40/)
  rejects(q => (q.lines[0] = 'Servicio'), /lines\.0 debe ser un objeto/)
  rejects(q => (q.lines[0].unitNett = '1'), /lines\.0: campos no reconocidos \(unitNett\)/)
  rejects(q => delete q.lines[1].label, /lines\.1\.label debe ser texto/)
  rejects(q => (q.lines[1].detail = ''), /lines\.1\.detail debe ser texto/)
  rejects(q => (q.lines[1].group = 7), /lines\.1\.group debe ser texto/)
  rejects(q => delete q.lines[0].quantity, /lines\.0\.quantity debe ser un objeto/)
  rejects(q => (q.lines[0].quantity.unidad = 'mes'), /lines\.0\.quantity: campos no reconocidos \(unidad\)/)
  for (const value of [0, 1.5, 10000, '3'])
    rejects(q => (q.lines[0].quantity.value = value), /quantity\.value: entero de 1 a 9999/)
  rejects(q => (q.lines[0].quantity.unit = ' '), /lines\.0\.quantity\.unit debe ser texto/)
  rejects(q => (q.lines[0].unitNet = '4200001'), /lines\.0: unitNet × quantity\.value debe ser exactamente igual a net/)
  rejects(q => delete q.lines[0].net, /lines\.0\.net: Importe decimal inválido/)
  rejects(q => (q.lines[0].net = '-1'), /lines\.0\.net: Decimal positivo/)
  rejects(q => (q.lines[0].net = '12.600.000'), /lines\.0\.net: Decimal positivo sin separadores/)
  rejects(q => (q.lines[3].net = '2400000.5'), /lines\.3\.net: CLP: máximo 0 decimales/)
  rejects(q => (q.net = '17040001'), /net debe ser exactamente igual a la suma de lines\[\]\.net/)
  rejects(q => (q.vatRate = 0.12345), /cuatro/)
  rejects(q => (q.clientPaidDirectly = []), /clientPaidDirectly: entre 1 y 8/)
  rejects(q => (q.clientPaidDirectly = Array(9).fill(q.clientPaidDirectly[0])), /clientPaidDirectly: entre 1 y 8/)
  rejects(
    q => (q.clientPaidDirectly[0].currency = 'ZZZ'),
    /clientPaidDirectly\.0\.currency: Moneda ISO 4217 no soportada/
  )
  rejects(q => (q.clientPaidDirectly[0].amount = '0'), /clientPaidDirectly\.0\.amount debe ser positivo/)
  rejects(q => (q.clientPaidDirectly[0].amount = '350.005'), /clientPaidDirectly\.0\.amount: USD: máximo 2 decimales/)
  rejects(q => (q.clientPaidDirectly[0].period = 'Mes 1'), /clientPaidDirectly\.0: campos no reconocidos \(period\)/)
  rejects(q => delete q.clientPaidDirectly[0].label, /clientPaidDirectly\.0\.label debe ser texto/)
  rejects(
    q => (q.paymentSchedule.milestones[0].net = '6816001'),
    /la suma de milestones\[\]\.net debe ser exactamente igual al neto/
  )
  rejects(q => (q.paymentSchedule.milestones = []), /paymentSchedule\.milestones: entre 1 y 12/)
  rejects(q => (q.paymentSchedule.milestones = Array(13).fill(q.paymentSchedule.milestones[0])), /entre 1 y 12/)
  rejects(q => delete q.paymentSchedule.title, /paymentSchedule\.title debe ser texto/)
  rejects(q => delete q.paymentSchedule.note, /paymentSchedule\.note debe ser texto/)
  rejects(q => delete q.paymentSchedule.milestones[1].when, /paymentSchedule\.milestones\.1\.when debe ser texto/)
  rejects(q => (q.paymentSchedule.milestones[1].net = '0'), /paymentSchedule\.milestones\.1\.net debe ser positivo/)
  rejects(
    q => (q.paymentSchedule.milestones[1].tax = '1'),
    /paymentSchedule\.milestones\.1: campos no reconocidos \(tax\)/
  )
  rejects(q => (q.source = ['pricing-v3']), /source debe ser un objeto plano de textos/)
  rejects(q => (q.source = { system: 'pricing-v3', totals: { net: '1' } }), /source\.totals debe ser texto/)
  rejects(q => delete q.service.name, /service\.name/)
  rejects(q => (q.cover.label = 'Borrador'), /Sin validez comercial/)

  // Una línea de cortesía a costo cero es válida; una cotización sin importe, no.
  const courtesy = base()

  courtesy.lines.push({ label: 'Taller de inicio', quantity: { value: 1, unit: 'sesión' }, unitNet: '0', net: '0' })
  courtesy.lines.at(-1).group = 'Servicio'
  validateQuote(courtesy)
  assert.throws(() => validateQuote(withLines(plainLines(2, { net: '0' }))), /suma de lines\[\]\.net debe ser positiva/)

  // Bloques opcionales ausentes o nulos, y service.detail sin uso en la versión 2.
  const minimal = withLines(plainLines(1), { clientPaidDirectly: null, paymentSchedule: null, source: null })

  validateQuote(minimal)
  validateQuote({ ...minimal, service: { name: 'Servicio', detail: 'No se imprime en la versión 2.' } })
})

test('versión 2: se emite en la moneda de la cotización; la conversión FX se rechaza', () => {
  const fx = {
    from: 'CLP',
    to: 'USD',
    rate: '0.00105',
    date: '2026-10-09',
    source: 'Banco Central de Chile',
    sourceUrl: 'https://si3.bcentral.cl/indicadoressiete/secure/indicadoresdiarios.aspx',
    purpose: 'reference_conversion'
  }

  for (const presentation of [{ currency: 'USD', fx }, { currency: 'USD' }, { fx }, 'USD']) {
    assert.throws(
      () => validateQuote({ ...linesExample, presentation }),
      /moneda de la cotización|presentation debe ser un objeto/
    )
  }

  assert.throws(
    () => quoteAmounts({ ...linesExample, presentation: { currency: 'USD', fx } }),
    /moneda de la cotización/
  )
  // Elegir sólo el formato regional no convierte nada.
  validateQuote({ ...linesExample, presentation: { locale: 'es-PE' } })
  assert.equal(quoteAmounts({ ...linesExample, presentation: { currency: 'CLP' } }).net, 16650000)
})

test('versión 2: los encabezados de grupo sólo se imprimen con dos o más grupos distintos', async () => {
  const groupRows = async lines => count((await build(withLines(lines))).html, 'class="group-row"')

  assert.equal(count((await build(linesExample)).html, 'class="group-row"'), 2)
  assert.equal(await groupRows(plainLines(3)), 0)
  assert.equal(await groupRows(plainLines(3, { group: 'Servicio' })), 0)
  // Un solo grupo declarado en parte de las líneas: no hay encabezados, luego no hay ambigüedad.
  assert.equal(await groupRows([...plainLines(2, { group: 'Servicio' }), ...plainLines(1)]), 0)

  const alternating = ['Servicio', 'Terceros', 'Servicio'].map((group, i) => ({ ...plainLines(3)[i], group }))
  const { html } = await build(withLines(alternating))

  // Se imprime cada vez que cambia, también cuando un grupo reaparece.
  assert.equal(count(html, 'class="group-row"'), 3)
  assert.ok(html.indexOf('>Servicio</th>') < html.indexOf('>Terceros</th>'))
  assert.ok(html.lastIndexOf('>Servicio</th>') > html.indexOf('>Terceros</th>'))

  // Con dos grupos, una línea sin grupo quedaría bajo el encabezado anterior: se rechaza.
  assert.throws(
    () => validateQuote(withLines([...alternating, ...plainLines(1)])),
    /lines\.3\.group: con dos o más grupos, todas las líneas declaran el suyo/
  )
})

test('versión 2: la columna de valor unitario existe sólo si alguna línea lo declara', async () => {
  const without = (await build(withLines(plainLines(3)))).html

  assert.ok(!without.includes('Valor unitario'))
  assert.equal(count(without, '<col style='), 3)
  assert.ok(!without.includes('.unitNet"'))

  const mixed = (await build(withLines([...plainLines(1, { unitNet: '100000' }), ...plainLines(1)]))).html

  assert.equal(count(mixed, '<th scope="col">Valor unitario</th>'), 1)
  assert.equal(count(mixed, '<col style='), 4)
  assert.ok(mixed.includes('data-slot="lines.0.unitNet">$100.000</td>'))
  // La línea que no lo declara deja la celda señalada, no vacía.
  assert.ok(mixed.includes('data-slot="lines.1.unitNet">—</td>'))
  assert.ok(mixed.includes('data-slot="lines.1.net">$100.000</td>'))
})

test('versión 2: paginación en una línea, una página exacta y una página más uno', async () => {
  const pricingPages = async total => (await build(withLines(plainLines(total)))).pagination

  const single = await build(withLines(plainLines(1)))

  assert.equal(single.pageCount, 4)
  assert.deepEqual(
    single.pagination[0].blocks.map(block => block.key),
    ['overline', 'title', 'intro', 'lines', 'totals', 'taxNote']
  )

  // Mayor número de líneas iguales que cabe, con sus totales, en una sola página de precios.
  let full = 1

  while ((await pricingPages(full + 1)).length === 1) full++
  assert.ok(full >= 3 && full < 40, `líneas en una página: ${full}`)

  const [exact] = await pricingPages(full)
  const rowHeight = exact.blocks.find(block => block.key === 'lines').rowsPx[0]

  assert.ok(exact.estimatedPx <= exact.capacityPx)
  assert.ok(exact.estimatedPx + rowHeight > exact.capacityPx, 'una línea más ya no cabe con los totales')

  // Una más: la tabla sigue cabiendo, pero los totales pasan enteros a la página siguiente.
  const over = await build(withLines(plainLines(full + 1)))

  assert.equal(over.pageCount, 5)
  assert.deepEqual(
    over.pagination.map(page => page.blocks.map(block => block.key)),
    [
      ['overline', 'title', 'intro', 'lines'],
      ['overline', 'totals', 'taxNote']
    ]
  )
  assert.equal(count(over.html, 'class="totals"'), 1)
  assert.equal(count(over.html, '02 · Inversión · continuación'), 1)
  assert.ok(over.html.includes('aria-label="Página 4: Detalle económico (continuación)"'))
  assert.ok(over.html.includes('<a href="#pagina-5">Condiciones</a>'))
  assert.ok(over.html.includes('<section id="pagina-5" class="page" aria-label="Página 5: Condiciones comerciales">'))
})

test('versión 2: la tabla continúa con su cabecera y el documento sigue el número real de páginas', async () => {
  const lines = plainLines(40, { detail: 'Detalle de la línea, con el alcance incluido en su valor.' }).map(
    (line, i) => ({ ...line, group: i < 22 ? 'Servicio' : 'Costos de terceros' })
  )

  const { html, pageCount, pagination, amounts } = await build(withLines(lines))
  const tablePages = pagination.filter(page => page.blocks.some(block => block.key === 'lines'))

  assert.ok(tablePages.length >= 3)
  assert.equal(pageCount, 3 + pagination.length)
  assert.equal(amounts.net, 4000000)
  for (const page of pagination) assert.ok(page.estimatedPx <= page.capacityPx, `página ${page.page}`)

  // Cabecera repetida en cada tramo; cada línea impresa exactamente una vez y en orden.
  assert.equal(count(html, '<th scope="col">Concepto</th>'), tablePages.length)
  assert.equal(count(html, 'Líneas de la cotización (continuación)'), tablePages.length - 1)
  for (let i = 0; i < 40; i++) assert.equal(count(html, `data-slot="lines.${i}.label"`), 1)
  assert.ok(html.indexOf('data-slot="lines.21.label"') < html.indexOf('data-slot="lines.22.label"'))

  // Un grupo partido entre páginas se anuncia de nuevo; un encabezado nunca queda solo al pie.
  assert.ok(count(html, '(continuación)</th>') >= 1)
  assert.ok(!/class="group-row"><th[^>]*>[^<]*<\/th><\/tr><\/tbody><\/table>/.test(html))
  assert.equal(count(html, '>Costos de terceros</th>'), 1)

  // Folios, anclas, ids y pies siguen el total real.
  const folio = n => String(n).padStart(2, '0')

  for (let n = 1; n <= pageCount; n++) {
    assert.equal(count(html, `<section id="pagina-${n}"`), 1)
    assert.equal(count(html, `<span class="folio">${folio(n)} / ${folio(pageCount)}</span>`), 1)
  }

  assert.equal(count(html, 'class="page-footer"'), pageCount)
  assert.equal(count(html, 'class="page-header"'), pageCount - 1)
  assert.ok(html.includes(`<a href="#pagina-${pageCount}">Condiciones</a>`))
  assert.ok(!html.includes('{{'))
})

test('versión 2: un contenido que no puede componerse falla con mensaje claro, sin recortar', async () => {
  const endless = withLines(plainLines(1, { detail: 'Alcance incluido en el valor. '.repeat(400) }))

  await assert.rejects(build(endless), /Contenido fuera del A4\. La línea «Línea 1» no cabe en una página/)

  const milestones = Array.from({ length: 12 }, (_, i) => ({
    label: `Hito ${i + 1}`,
    when: 'Condición de pago extensa que ocupa varias líneas en su columna. '.repeat(4),
    net: i ? '1' : '199989'
  }))

  await assert.rejects(
    build(withLines(plainLines(2), { paymentSchedule: { title: 'Calendario', note: 'Nota.', milestones } })),
    /Contenido fuera del A4\. No cabe el calendario de pagos en una página/
  )
  await assert.rejects(
    build(withLines(plainLines(1, { unitNet: '900719925474099', net: '900719925474099' }), { vatRate: null })),
    /Contenido fuera del A4\. Los importes de las líneas son demasiado anchos/
  )
})

test('versión 2: bloques opcionales, importes en su moneda y origen de datos fuera del documento', async () => {
  const q = structuredClone(thirdPartyExample)

  q.source = { system: 'pricing-v3', calculationId: 'calc-7f3a91', digest: 'sha256:0badc0ffee', engineVersion: '9.9.9' }
  q.lines[0].label = 'Servicio <b>gestionado</b> & {{amount.total}}'
  q.clientPaidDirectly.push({ label: 'Alojamiento web', amount: '120.50', currency: 'EUR' })
  const { html, pageCount, amounts } = await build(q)

  assert.equal(pageCount, 5)
  // Lo que el cliente paga directamente se imprime aparte y no entra en ningún total.
  assert.deepEqual(amounts, quoteAmounts(thirdPartyExample))
  assert.equal(count(html, 'Pagado directamente por el cliente a su proveedor'), 1)
  assert.ok(html.includes('No forman parte de esta cotización ni de su valor neto o total'))
  assert.ok(html.includes('data-slot="clientPaidDirectly.0.amount">US$350,00<span>USD</span>'))
  // El formato ya trae el código ISO: no se repite.
  assert.ok(html.includes('data-slot="clientPaidDirectly.1.amount">EUR 120,50</b>'))
  assert.equal(count(html, 'data-slot="amount.net">$17.040.000<'), 2)

  assert.ok(html.includes('data-slot="paymentSchedule.title">Calendario de pagos</h3>'))
  assert.deepEqual(
    [...html.matchAll(/data-slot="paymentSchedule\.milestones\.\d\.net">([^<]+)</g)].map(match => match[1]),
    ['$6.816.000', '$5.112.000', '$5.112.000']
  )

  // source viaja al manifiesto; nada de él se imprime.
  for (const value of Object.values(q.source)) assert.ok(!html.includes(value), value)
  assert.ok(!html.includes('calculationId') && !html.includes('digest'))

  assert.ok(html.includes('Servicio &lt;b&gt;gestionado&lt;/b&gt; &amp; {{amount.total}}'))
  assert.ok(!html.includes('<b>gestionado</b>'))

  // Sin bloques opcionales no queda rastro de ellos.
  const bare = (await build(linesExample)).html

  assert.ok(!bare.includes('client-paid"') && !bare.includes('pay-schedule"') && !bare.includes('class="monthly"'))
  assert.equal((await build(linesExample)).pageCount, 4)
})

// ── Versión 2: línea bonificada, opciones y posición de los totales ───────────────────────────────────────
// SHA-256 del HTML de los ejemplos de la versión 2 que no usan línea bonificada ni opciones, medido antes de
// añadirlas. Un documento que no usa una capacidad nueva debe salir byte a byte como antes: sus estilos viajan
// en un archivo aparte que sólo se incluye cuando hace falta. Vale la misma salvedad que en la versión 1.
const V2_BASELINE = {
  'ejemplo-lineas.json': '9cab83eda0620ef833cb143d2fcfe971bbdf5ce6e21a7558aa2d1e8f0f339d40',
  'ejemplo-lineas-terceros.json': '433ee4798736af5e13818fd91998985b445c4386897a5ccc0f39465670e8553c'
}

const optionalExample = await load('ejemplo-lineas-opcionales.json')
const blockKeys = pagination => pagination.map(page => page.blocks.map(block => block.key))
const EXTRAS_CSS = 'template-lineas-opciones.css'

test('versión 2: sin línea bonificada ni opciones, el HTML conserva su SHA-256 y sus estilos', async () => {
  for (const [name, expected] of Object.entries(V2_BASELINE)) {
    const { html, templateFiles } = await buildHtml(await load(name), templatePath(name))

    assert.equal(createHash('sha256').update(html).digest('hex'), expected, name)
    assert.deepEqual(templateFiles, ['template-lineas.html', 'template.css', 'template-lineas.css'])
    assert.ok(!html.includes('quote-options'))
  }

  // Los estilos propios se añaden cuando el documento usa cualquiera de las dos capacidades, y sólo entonces.
  const both = await buildHtml(optionalExample, templatePath('ejemplo-lineas-opcionales.json'))

  assert.equal(both.templateFiles.at(-1), EXTRAS_CSS)
  assert.ok(both.html.includes('.quote-options{'))

  const onlyCourtesy = structuredClone(optionalExample)

  delete onlyCourtesy.options
  assert.equal((await build(onlyCourtesy)).templateFiles.at(-1), EXTRAS_CSS)

  const onlyOptions = structuredClone(optionalExample)

  delete onlyOptions.lines[2].referenceNet
  assert.equal((await build(onlyOptions)).templateFiles.at(-1), EXTRAS_CSS)
})

test('versión 2: una línea bonificada imprime «Bonificado» y su valor de referencia, sin sumar', async () => {
  const totals = { net: 49900000, vat: 9481000, total: 59381000, monthly: null, taxSource: 'computed' }

  validateQuote(optionalExample)
  assert.deepEqual(quoteAmounts(optionalExample), totals)
  const { html, pagination } = await build(optionalExample)

  assert.ok(
    html.includes(
      'data-slot="lines.2.net">Bonificado<span>Valor de referencia</span><span data-slot="lines.2.referenceNet">$1.450.000</span></td>'
    )
  )
  assert.equal(count(html, 'Bonificado<span>'), 1)
  // La bonificación no se imprime como $0, y su valor de referencia no entra en ningún total.
  assert.ok(!html.includes('>$0<'))
  assert.equal(count(html, '1.450.000'), 1)
  assert.equal(count(html, 'data-slot="amount.net">$49.900.000<'), 2)
  // La línea no declara valor unitario: su celda queda señalada, como en cualquier otra línea sin él.
  assert.ok(html.includes('data-slot="lines.2.unitNet">—</td>'))

  // Sin valor de referencia es la línea a costo cero de siempre: mismo total, importe impreso.
  const plain = structuredClone(optionalExample)

  delete plain.lines[2].referenceNet
  assert.deepEqual(quoteAmounts(plain), totals)
  assert.ok((await build(plain)).html.includes('data-slot="lines.2.net">$0</td>'))

  // Tres líneas de texto en la celda del neto: la fila reserva esa altura aunque el concepto sea de una línea.
  const short = withLines([
    ...plainLines(1),
    { label: 'Puesta en marcha', quantity: { value: 1, unit: 'pago único' }, net: '0', referenceNet: '320000' }
  ])

  const [plainRow, courtesyRow] = (await build(short)).pagination[0].blocks.find(block => block.key === 'lines').rowsPx

  assert.ok(courtesyRow > plainRow)
  assert.equal(pagination[0].blocks.find(block => block.key === 'lines').rowsPx.length, 5)

  // La columna del neto crece si el valor de referencia lo exige; nunca se parte ni se reduce.
  const netColumn = async referenceNet => {
    const q = withLines(
      [
        ...plainLines(1, { unitNet: '100000', net: '100000' }),
        { label: 'Puesta en marcha', quantity: { value: 1, unit: 'pago único' }, net: '0', referenceNet }
      ],
      { currency: 'USD' }
    )

    return Number([...(await build(q)).html.matchAll(/<col style="width:([\d.]+)%">/g)].at(-1)[1])
  }

  assert.equal(await netColumn('320000'), 20)
  assert.ok((await netColumn('9007199254740.99')) > 20)

  const rejects = (mutate, pattern) => {
    const q = structuredClone(optionalExample)

    delete q.net
    mutate(q.lines[2], q)
    assert.throws(() => validateQuote(q), pattern)
  }

  rejects(line => (line.net = '1450000'), /lines\.2\.referenceNet: sólo acompaña a una línea bonificada/)
  rejects(line => (line.unitNet = '0'), /lines\.2\.referenceNet: sólo acompaña a una línea bonificada/)
  rejects(line => (line.referenceNet = '0'), /lines\.2\.referenceNet debe ser positivo/)
  rejects(line => (line.referenceNet = '1450000.5'), /lines\.2\.referenceNet: CLP: máximo 0 decimales/)
  rejects(line => (line.referenceNet = '1.450.000'), /lines\.2\.referenceNet: Decimal positivo sin separadores/)
  rejects(line => (line.referenceValue = '1450000'), /lines\.2: campos no reconocidos \(referenceValue\)/)
  // Una cotización bonificada por completo no es una cotización.
  rejects((line, q) => (q.lines = [line]), /suma de lines\[\]\.net debe ser positiva/)
})

test('versión 2: las opciones se imprimen aparte, después de todo lo demás y fuera de los totales', async () => {
  const { html, pagination, amounts, pageCount } = await build(optionalExample)
  const without = structuredClone(optionalExample)

  delete without.options
  // Nada de una opción entra en el neto, el impuesto o el total, ni en la portada.
  assert.deepEqual(amounts, quoteAmounts(without))
  assert.deepEqual((await build(without)).amounts, amounts)
  assert.equal(count(html, 'data-slot="amount.total">$59.381.000<'), 2)
  assert.equal(pageCount, 5)
  assert.equal((await build(without)).pageCount, 4)

  assert.equal(count(html, 'class="quote-options"'), 1)
  assert.ok(html.includes('<p class="overline">Opcional · Fuera de esta cotización</p>'))
  assert.ok(html.includes('data-slot="options.title">Servicios opcionales</h3>'))
  assert.ok(html.includes('Estas opciones no forman parte de esta cotización ni de su valor neto o total.'))
  assert.ok(html.includes('Cada valor es neto, no incluye impuestos y se expresa en la unidad que lo acompaña.'))
  assert.ok(html.includes('data-slot="options.note">Cada opción se cotiza y se acuerda por separado'))
  // Cada opción: su valor neto seguido de su unidad.
  assert.deepEqual(
    [
      ...html.matchAll(
        /data-slot="options\.items\.(\d)\.net">([^<]+)<\/b><span data-slot="options\.items\.\1\.unit">([^<]+)</g
      )
    ].map(match => `${match[2]} ${match[3]}`),
    ['$480.000 al mes', '$290.000 por día cubierto', '$1.290.000 al mes']
  )
  assert.equal(count(html, 'data-slot="options.items.2.detail"'), 0)
  assert.deepEqual(blockKeys(pagination), [
    ['overline', 'title', 'intro', 'lines', 'totals', 'taxNote'],
    ['overline', 'options']
  ])

  // Con todos los bloques, las opciones cierran la sección de inversión.
  const everything = structuredClone(thirdPartyExample)

  everything.options = structuredClone(optionalExample.options)
  everything.pricing.monthly = { months: 3, note: 'Referencia aritmética.' }
  const full = await build(everything)

  assert.deepEqual(
    blockKeys(full.pagination)
      .flat()
      .filter(key => !['overline', 'title', 'intro', 'lines'].includes(key)),
    ['totals', 'taxNote', 'schedule', 'clientPaid', 'monthly', 'options']
  )
  assert.deepEqual(full.amounts.net, quoteAmounts(thirdPartyExample).net)
  for (const page of full.pagination) assert.ok(page.estimatedPx <= page.capacityPx, `página ${page.page}`)

  // Título y nota son del operador y opcionales; la advertencia fija es de la plantilla y no se puede quitar.
  const bare = structuredClone(optionalExample)

  delete bare.options.title
  delete bare.options.note
  bare.options.items = [{ label: 'Opción <b>única</b> & {{amount.total}}', net: '1000', unit: 'pago único' }]
  const bareHtml = (await build(bare)).html

  assert.ok(bareHtml.includes('data-slot="options.title">Opciones adicionales</h3>'))
  assert.ok(!bareHtml.includes('data-slot="options.note"'))
  assert.ok(bareHtml.includes('no forman parte de esta cotización ni de su valor neto o total'))
  assert.ok(bareHtml.includes('Opción &lt;b&gt;única&lt;/b&gt; &amp; {{amount.total}}'))

  // En la moneda del documento, con sus decimales.
  const usd = withLines(plainLines(1, { net: '1500.00' }), {
    currency: 'USD',
    options: { items: [{ label: 'Informe ejecutivo', net: '480.50', unit: 'al mes' }] }
  })

  assert.ok((await build(usd)).html.includes('data-slot="options.items.0.net">US$480,50</b>'))
})

test('versión 2: cada regla del bloque de opciones se valida con un mensaje propio', async () => {
  const rejects = (mutate, pattern) => {
    const q = structuredClone(optionalExample)

    mutate(q)
    assert.throws(() => validateQuote(q), pattern)
  }

  const item = () => ({ label: 'Opción', net: '1000', unit: 'al mes' })

  rejects(q => (q.option = q.options), /no reconocidos en version 2: option/)
  rejects(q => (q.options = q.options.items), /options debe ser un objeto/)
  rejects(q => (q.options.subtitle = 'Texto'), /options: campos no reconocidos \(subtitle\)/)
  rejects(q => (q.options.title = ' '), /options\.title debe ser texto/)
  rejects(q => (q.options.note = 7), /options\.note debe ser texto/)
  rejects(q => delete q.options.items, /options\.items: entre 1 y 8/)
  rejects(q => (q.options.items = []), /options\.items: entre 1 y 8/)
  rejects(q => (q.options.items = Array.from({ length: 9 }, item)), /options\.items: entre 1 y 8/)
  rejects(q => (q.options.items[0] = 'Informe'), /options\.items\.0 debe ser un objeto/)
  rejects(q => (q.options.items[0].currency = 'USD'), /options\.items\.0: campos no reconocidos \(currency\)/)
  rejects(q => delete q.options.items[1].label, /options\.items\.1\.label debe ser texto/)
  rejects(q => (q.options.items[1].detail = ''), /options\.items\.1\.detail debe ser texto/)
  rejects(q => delete q.options.items[1].unit, /options\.items\.1\.unit debe ser texto/)
  rejects(q => delete q.options.items[2].net, /options\.items\.2\.net: Importe decimal inválido/)
  rejects(q => (q.options.items[2].net = '0'), /options\.items\.2\.net debe ser positivo/)
  rejects(q => (q.options.items[2].net = '-1'), /options\.items\.2\.net: Decimal positivo/)
  rejects(q => (q.options.items[2].net = '1290000.5'), /options\.items\.2\.net: CLP: máximo 0 decimales/)
  validateQuote({ ...structuredClone(optionalExample), options: null })
  // La versión 1 no imprime el bloque: declararlo allí se rechaza en vez de omitirse en silencio.
  assert.throws(
    () => validateQuote({ ...example, options: { items: [item()] } }),
    /options sólo existe en la versión 2/
  )

  // El bloque es entero: si no cabe en una página, el documento falla y dice qué acortar.
  const endless = structuredClone(optionalExample)

  endless.options.items = Array.from({ length: 8 }, () => ({ ...item(), detail: 'Alcance de la opción. '.repeat(60) }))
  await assert.rejects(build(endless), /Contenido fuera del A4\. No cabe el bloque de opciones en una página/)

  // Un importe que no puede imprimirse con exactitud se rechaza al validar, con el nombre del campo.
  const unsafe = withLines(plainLines(1, { net: '1500.00' }), {
    currency: 'USD',
    options: { items: [{ ...item(), net: '90071992547409.91' }] }
  })

  assert.throws(() => validateQuote(unsafe), /options\.items\.0\.net: Importe excede precisión monetaria segura/)
})

test('versión 2: los totales no se separan de una tabla que les deja sitio', async () => {
  // Una nota tributaria larga: cabe la tabla con los totales, pero no con la nota.
  const pricing = { ...linesExample.pricing, taxNote: 'Los valores netos excluyen impuestos. '.repeat(14).trim() }
  const options = { items: [{ label: 'Informe ejecutivo', net: '480000', unit: 'al mes' }] }
  const doc = (total, extra = {}) => withLines(plainLines(total), { pricing, ...extra })
  const last = pagination => pagination[0].blocks.at(-1).key
  let total = 1

  while (total < 40 && last((await build(doc(total, { options }))).pagination) !== 'totals') total++
  assert.ok(total < 40, 'se esperaba un número de líneas que deja sitio a los totales y no a su nota')

  // Con un bloque después: los totales quedan con la tabla y la nota abre la página siguiente, acompañada.
  const split = await build(doc(total, { options }))

  assert.deepEqual(blockKeys(split.pagination), [
    ['overline', 'title', 'intro', 'lines', 'totals'],
    ['overline', 'taxNote', 'options']
  ])
  for (const page of split.pagination) assert.ok(page.estimatedPx <= page.capacityPx, `página ${page.page}`)
  assert.equal(count(split.html, 'class="totals"'), 1)
  assert.equal(count(split.html, 'class="tax-note"'), 1)
  assert.ok(split.html.indexOf('class="totals"') < split.html.indexOf('02 · Inversión · continuación'))
  assert.ok(split.html.indexOf('02 · Inversión · continuación') < split.html.indexOf('class="tax-note"'))
  assert.equal(split.pageCount, 5)

  // Sin bloque después, la nota quedaría sola en una página: totales y nota pasan juntos.
  assert.deepEqual(blockKeys((await build(doc(total))).pagination), [
    ['overline', 'title', 'intro', 'lines'],
    ['overline', 'totals', 'taxNote']
  ])

  // Lo mismo si el bloque siguiente no cabe junto a la nota: tampoco la acompañaría.
  let alone = null

  for (let repeat = 1; repeat <= 80 && !alone; repeat++) {
    const tall = {
      items: Array.from({ length: 8 }, (_, i) => ({
        label: `Opción ${i + 1}`,
        detail: 'Alcance de la opción. '.repeat(repeat).trim(),
        net: '1000',
        unit: 'al mes'
      }))
    }

    const keys = await build(doc(total, { options: tall })).then(
      result => blockKeys(result.pagination),
      () => null
    )

    if (keys?.length === 3) alone = keys
  }

  assert.deepEqual(alone, [
    ['overline', 'title', 'intro', 'lines'],
    ['overline', 'totals', 'taxNote'],
    ['overline', 'options']
  ])

  // Si todo cabe, nada cambia: totales y nota siguen a la tabla en la misma página.
  assert.deepEqual(blockKeys((await build(doc(1, { options }))).pagination), [
    ['overline', 'title', 'intro', 'lines', 'totals', 'taxNote', 'options']
  ])
})

// ── Páginas fijas: portada, alcance y condiciones ────────────────────────────────────────────────────────
// buildHtml comprueba sin navegador que las páginas que no paginan caben. Dos veces se versionó un ejemplo cuya
// portada sólo fallaba al renderizar: estas pruebas son la guarda mecánica de ese defecto.
const operatingDir = new URL('../../data/pricing/v3-operating/', import.meta.url)
const fixedNames = result => result.fixedPages.map(page => page.name)
const coverOf = result => result.fixedPages.find(page => page.name === 'portada')

test('páginas fijas: los dos títulos de portada que sólo fallaban al renderizar se rechazan sin navegador', async () => {
  // Cada caso es la portada que falló: el título largo con la bajada de su documento. En Chromium ocupaban
  // 860,9 px y 829,8 px de los 802,75 px que admite la portada.
  const failures = [
    {
      title: ['Contenidos y comunidad,', 'gestionados de punta', 'a punta.'],
      subtitle:
        'Un servicio gestionado de un mes para Cliente de ejemplo, con la producción y los medios de su campaña.',
      message:
        /Contenido fuera del A4\. El título de portada no cabe: «Contenidos y comunidad,» no entra en una línea a su tamaño y el título ocupa 5 líneas\. Acórtalo \(cover\.title\)\. La portada ocupa 861 px y la página admite 803 px\./,
      fixed: ['Contenidos y', 'comunidad', 'gestionados.']
    },
    {
      title: ['Atención en redes', 'como servicio gestionado,', 'con una opción.'],
      subtitle:
        'Un servicio gestionado de atención en redes sociales durante tres meses para Cliente de ejemplo, con un fee mensual único y un servicio opcional que amplía su capacidad.',
      message:
        /Contenido fuera del A4\. El título de portada no cabe: «como servicio gestionado,» no entra en una línea a su tamaño y el título ocupa 4 líneas\. Acórtalo \(cover\.title\)\. La portada ocupa 830 px y la página admite 803 px\./,
      fixed: ['Atención en', 'redes sociales', 'gestionada.']
    }
  ]

  for (const { title, subtitle, message, fixed } of failures) {
    for (const [base, name] of [
      [linesExample, 'ejemplo-lineas.json'],
      [example, 'ejemplo.json']
    ]) {
      const q = structuredClone(base)

      q.cover = { ...q.cover, title, subtitle }
      await assert.rejects(buildHtml(q, templatePath(name)), message)
      // El título con el que cada documento quedó versionado sí cabe, en la misma portada.
      q.cover.title = fixed
      const cover = coverOf(await buildHtml(q, templatePath(name)))

      assert.ok(cover.estimatedPx <= cover.capacityPx)
    }
  }
})

test('páginas fijas: todo documento versionado de la plantilla y del puente se compone', async () => {
  const files = [
    ...(await fs.readdir(templateDir)).filter(name => /^ejemplo.*\.json$/.test(name)).map(name => templatePath(name)),
    ...(await fs.readdir(operatingDir))
      .filter(name => name.endsWith('.document.json'))
      .map(name => fileURLToPath(new URL(name, operatingDir)))
  ]

  let versionTwo = 0

  for (const file of files) {
    const q = JSON.parse(await fs.readFile(file, 'utf8'))
    // Un ejemplo que no puede componerse hace fallar esta prueba con la causa: buildHtml lanza.
    const result = await buildHtml(q, file)

    assert.deepEqual(fixedNames(result), ['portada', 'alcance', 'condiciones'], file)
    assert.deepEqual(
      result.fixedPages.map(page => page.page),
      [1, 2, result.pageCount],
      file
    )
    for (const page of [...result.fixedPages, ...(result.pagination ?? [])])
      assert.ok(page.estimatedPx <= page.capacityPx, `${file}: página ${page.page}`)
    if (q.version === 2) versionTwo++
  }

  // Los tres ejemplos de la versión 2 y, al menos, los documentos del puente que existían al escribir la prueba.
  assert.ok(versionTwo >= 3 + 3, `documentos de la versión 2 comprobados: ${versionTwo}`)
})

test('páginas fijas: cada página estima sus bloques y dice qué acortar cuando no cabe', async () => {
  const { fixedPages } = await build(linesExample)

  assert.deepEqual(
    fixedPages.map(page => [page.page, page.name, page.capacityPx, page.blocks.map(block => block.key)]),
    [
      [1, 'portada', 802.75, ['label', 'title', 'subtitle', 'client', 'investment', 'supplier']],
      [2, 'alcance', 882.56, ['overline', 'title', 'intro', 'rows', 'scheduleHeading', 'phases']],
      [4, 'condiciones', 882.56, ['overline', 'title', 'rows', 'contact']]
    ]
  )
  // Medido en Chromium para este ejemplo: 705,92 px, 670,38 px y 697,88 px. La estimación no baja de la medida.
  assert.deepEqual(
    fixedPages.map(page => page.estimatedPx),
    [705.99, 670.54, 697.91]
  )

  const rejects = async (mutate, pattern, base = linesExample, name = 'ejemplo-lineas.json') => {
    const q = structuredClone(base)

    mutate(q)
    await assert.rejects(buildHtml(q, templatePath(name)), pattern)
  }

  // Portada: sin título partido, la causa nombra título y bajada con sus líneas.
  await rejects(
    q => (q.cover.subtitle = 'Dos perfiles dedicados durante tres meses para Cliente de ejemplo. '.repeat(4)),
    /Contenido fuera del A4\. La portada no cabe: el título de portada ocupa 3 líneas y la bajada, \d+\. Acorta cover\.title o cover\.subtitle\./
  )
  // Otros textos de la portada que suman altura se nombran.
  await rejects(q => {
    q.cover.subtitle = 'Dos perfiles dedicados durante tres meses para Cliente de ejemplo. '.repeat(3)
    q.reference = 'Referencia del proceso de compra con su código completo y su descripción. '.repeat(3)
  }, /La portada no cabe: .* También ocupan más de una línea: reference \(\d líneas\)\./)

  // Una referencia de varias líneas baja el inicio de la portada: admite menos.
  const longReference = structuredClone(linesExample)

  longReference.reference = 'Referencia del proceso de compra con su código completo y su descripción. '.repeat(2)
  assert.equal(coverOf(await build(longReference)).capacityPx, 802.75 - 18)

  await rejects(
    q =>
      (q.scope.rows = Array.from({ length: 7 }, (_, i) => ({
        title: `Componente ${i + 1}`,
        text: 'Alcance incluido en el valor, con sus entregables y responsabilidades. '.repeat(i === 4 ? 6 : 4)
      }))),
    /Contenido fuera del A4\. La página de alcance y calendario no cabe: acorta los textos de scope\.rows \(el más largo es «Componente 5», \d+ líneas\), reduce sus entradas o acorta los de schedule\.phases\. Su contenido ocupa [\d.]+ px y la página admite 883 px\./
  )
  await rejects(
    q =>
      (q.conditions.rows = Array.from({ length: 6 }, (_, i) => ({
        title: `Condición ${i + 1}`,
        text: 'Texto de la condición comercial acordada con el cliente. '.repeat(i === 2 ? 14 : 10)
      }))),
    /Contenido fuera del A4\. La página de condiciones no cabe: acorta los textos de conditions\.rows \(el más largo es «Condición 3»\) o reduce sus entradas\./
  )

  // Versión 2: una palabra más ancha que su bloque se saldría de su caja y el render la rechaza; aquí se nombra.
  await rejects(
    q => (q.cover.title = ['Desinstitucionalización']),
    /Contenido fuera del A4\. «Desinstitucionalización» \(cover\.title\) es más ancho que su bloque y no puede partirse/
  )
  // La versión 1 no hace esa comprobación en el render: el mismo título se compone.
  const wideTitle = structuredClone(example)

  wideTitle.cover.title = ['Desinstitucionalización']
  assert.equal(coverOf(await buildHtml(wideTitle, dataPath.pathname)).blocks[1].heightPx, 62.04)

  // Un correo largo ensancha su columna en vez de salirse: la portada sigue cabiendo.
  const longEmail = structuredClone(linesExample)

  longEmail.supplier.email = 'equipo.comercial.de.cuentas.estrategicas@efeoncepro.com'
  assert.ok(coverOf(await build(longEmail)).estimatedPx >= 705.99)
})

test('páginas fijas: el logo del cliente entra en la estimación por su proporción', async () => {
  const dir = await fs.mkdtemp(path.join((await import('node:os')).tmpdir(), 'cotizacion-logo-'))

  // Cabecera PNG mínima: firma, bloque IHDR y dimensiones. La estimación sólo lee la proporción.
  const png = (width, height) => {
    const bytes = Buffer.alloc(33)

    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]).copy(bytes)
    bytes.writeUInt32BE(width, 16)
    bytes.writeUInt32BE(height, 20)

    return bytes
  }

  try {
    const withLogo = async (name, bytes) => {
      const q = structuredClone(linesExample)

      await fs.writeFile(path.join(dir, name), bytes)
      q.buyer.logo = { path: path.join(dir, name), source: 'https://example.com/logo' }

      return buildHtml(q, templatePath('ejemplo-lineas.json'))
    }

    // 400 × 200: a 205 px de ancho mide 102,5 px. Bloque: rótulo, márgenes, logo y dos líneas de datos.
    const wide = coverOf(await withLogo('ancho.png', png(400, 200)))

    assert.equal(wide.blocks.find(block => block.key === 'client').heightPx, 178.1)
    await assert.rejects(
      withLogo('alto.png', png(200, 800)),
      /Contenido fuera del A4\. La portada no cabe: .* El logo del cliente ocupa 820 px de alto\./
    )
    // Sin dimensiones legibles no hay estimación de portada: queda a cargo de la comprobación del render.
    assert.deepEqual(
      fixedNames(await withLogo('sin-medidas.svg', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))),
      ['alcance', 'condiciones']
    )
  } finally {
    await fs.rm(dir, { recursive: true, force: true })
  }
})

test('medición: instancia variable de la fuente de títulos, líneas sin partir palabras y proporción de imágenes', async () => {
  const { fontDir, fontAdvance, textWidth, wrapLines, imageRatio } = paginationInternals
  const display = await fontAdvance(path.join(fontDir, 'bricolage-grotesque-variable.ttf'))
  const regular = await fontAdvance(path.join(fontDir, 'poppins-400.ttf'))
  const size = (47 * 96) / 72
  const h1 = { advance: display.instance({ opsz: size, wght: 760 }), size, tracking: -0.04 }

  // Ancho medido en Chromium para el título de portada (47 pt, peso 760): la instancia coincide dentro del 1 %;
  // la tabla de avances por defecto, que es la de otro peso y tamaño óptico, queda un 4 % corta.
  for (const [text, measured] of [
    ['Contenidos y comunidad,', 676.34],
    ['como servicio gestionado,', 696.22],
    ['Posicionamiento', 448.22]
  ]) {
    const estimated = textWidth(text, h1)

    assert.ok(Math.abs(estimated / measured - 1) < 0.01, `${text}: ${estimated}`)
    assert.ok(textWidth(text, { ...h1, advance: display }) < measured * 0.97, text)
  }

  // La instancia por defecto es la propia tabla; una fuente estática no tiene instancias.
  assert.equal(display.instance({})(97), display(97))
  assert.equal(regular.instance({ wght: 700 }), regular)
  assert.equal(display.instance({ opsz: size, wght: 760 }), display.instance({ opsz: size, wght: 760 }))

  const font = { advance: regular, size: 12 }
  const width = text => textWidth(text, font)

  // Sin overflow-wrap el navegador no parte una palabra: ocupa su línea y se sale de la caja.
  assert.deepEqual(wrapLines('electroencefalografista', width('electroen'), font), {
    lines: 1,
    overflow: 'electroencefalografista'
  })
  assert.deepEqual(wrapLines('un electroencefalografista', width('electroen'), font).lines, 2)
  // Sólo se corta en guiones y barras, y en los espacios que el navegador puede cortar.
  assert.deepEqual(wrapLines('front-end', width('front-') * 1.05, font), { lines: 2, overflow: null })
  assert.equal(wrapLines('uno dos', width('uno') * 1.05, font).lines, 2)
  assert.equal(wrapLines('uno dos', width('uno') * 1.05, font).lines, 1)
  assert.deepEqual(wrapLines('texto de una línea', 1000, font), { lines: 1, overflow: null })

  const svg = attributes =>
    Buffer.from(`<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" ${attributes}></svg>`)

  const header = (length, write) => {
    const bytes = Buffer.alloc(length)

    write(bytes)

    return bytes
  }

  assert.equal(imageRatio(svg('viewBox="0 0 907 298"'), '.svg'), 298 / 907)
  assert.equal(imageRatio(svg('width="200" height="50px" viewBox="0 0 10 10"'), '.svg'), 0.25)
  assert.equal(imageRatio(svg('width="100%"'), '.svg'), null)
  assert.equal(
    imageRatio(
      header(33, bytes => {
        bytes.writeUInt32BE(907, 16)
        bytes.writeUInt32BE(298, 20)
      }),
      '.png'
    ),
    298 / 907
  )
  assert.equal(
    imageRatio(
      header(24, bytes => {
        Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08]).copy(bytes)
        bytes.writeUInt16BE(300, 13)
        bytes.writeUInt16BE(600, 15)
      }),
      '.jpg'
    ),
    0.5
  )
  assert.equal(
    imageRatio(
      header(30, bytes => {
        bytes.write('RIFF', 0, 'latin1')
        bytes.write('WEBPVP8X', 8, 'latin1')
        bytes.writeUIntLE(399, 24, 3)
        bytes.writeUIntLE(99, 27, 3)
      }),
      '.webp'
    ),
    0.25
  )
  assert.equal(imageRatio(Buffer.from('no es una imagen'), '.jpg'), null)
  assert.equal(imageRatio(Buffer.alloc(4), '.png'), null)
})

test('medición de texto: nunca cuenta menos líneas de las que caben en el ancho', async () => {
  const { fontDir, fontAdvance, textWidth, countLines } = paginationInternals
  const font = { advance: await fontAdvance(path.join(fontDir, 'poppins-400.ttf')), size: 12 }
  const text = 'Planificación, producción y operación de campañas con informe mensual de resultados.'
  const width = textWidth(text, font)

  assert.ok(width > 0 && textWidth(text, { ...font, size: 24 }) === width * 2)
  assert.ok(textWidth('ñandú', { ...font, upper: true }) > textWidth('ñandú', font))
  assert.equal(countLines(text, width * 1.05, font), 1)
  assert.equal(countLines(text, width / 2, font), 3)
  assert.ok(countLines(text, width / 4, font) >= 4)
  // Una palabra más ancha que la línea se parte; no desborda ni se cuenta como una sola línea.
  assert.ok(countLines('electroencefalografista', textWidth('electroen', font), font) >= 3)
  assert.equal(countLines('  texto   con   espacios  ', 1000, font), 1)
})

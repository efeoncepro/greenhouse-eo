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

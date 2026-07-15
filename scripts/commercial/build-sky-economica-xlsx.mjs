/**
 * Genera el Excel de la propuesta económica de la licitación SKY.
 *
 * ⚠️ POR QUÉ EXISTE: el `.xlsx` era un artefacto **hecho a mano**, y las Bases lo declaran
 * **documento integrante** (§1.1). Un documento contractual mantenido a mano, en paralelo al
 * `.md`, se desincroniza — y de hecho se desincronizó: el Excel siguió publicando el precio
 * unitario por artículo (CLP 260.000) después de que la oferta económica lo eliminara.
 *
 * Esta es la MISMA lección de `render-tender-doc.ts`: una sola fuente, el resto es derivado.
 * Las cifras viven acá, junto a la oferta económica, y el Excel se re-emite con un comando.
 *
 *   node scripts/commercial/build-sky-economica-xlsx.mjs
 *
 * 🔴 REGLA (seo-aeo-practice → modules/04_PRICING.md, regla dura #2):
 *    NUNCA publicar un precio unitario por artículo. El conteo de artículos es un
 *    TECHO DE CAPACIDAD DECLARADA, no la unidad de valor. Publicar el unitario le entrega
 *    al comprador la calculadora para comoditizarnos (8 × 260.000 = 2,08M vs 5,2M cobrados).
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import ExcelJS from 'exceljs'

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const OUT = path.join(REPO, 'docs/commercial/tenders/sky-blog-2026/propuesta-economica.xlsx')

const NAVY = 'FF0F2A4A'
const LINE = 'FFE4E7EC'
const SOFT = 'FFF5F7FA'
const MUTED = 'FF5B6470'

const MENSUAL_BASE = 5_200_000
const MENSUAL_AMPLIADO = 6_900_000

const wb = new ExcelJS.Workbook()

wb.creator = 'Efeonce Group SpA'

const ws = wb.addWorksheet('Propuesta Económica', { views: [{ showGridLines: false }] })

ws.columns = [{ width: 32 }, { width: 72 }, { width: 26 }]

/** Escribe una fila con estilo. `o.money` formatea la 3ª columna como CLP. */
const put = (r, vals, o = {}) => {
  const row = ws.getRow(r)

  vals.forEach((v, i) => {
    if (v === null || v === undefined) return
    const c = row.getCell(i + 1)

    c.value = v
    c.font = {
      name: 'Calibri',
      size: o.size ?? 11,
      bold: o.boldCells?.includes(i) ?? !!o.bold,
      color: { argb: o.color ?? 'FF141821' }
    }
    c.alignment = { vertical: 'middle', wrapText: true, horizontal: i === 2 ? 'right' : 'left' }
    if (o.fill) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: o.fill } }
    if (o.money && i === 2) c.numFmt = '"$"#,##0'
  })

  if (o.border) {
    for (let i = 1; i <= 3; i++) {
      row.getCell(i).border = {
        top: { style: 'thin', color: { argb: LINE } },
        bottom: { style: 'thin', color: { argb: LINE } },
        left: { style: 'thin', color: { argb: LINE } },
        right: { style: 'thin', color: { argb: LINE } }
      }
      if (o.fill) row.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: o.fill } }
    }
  }

  row.height = o.h ?? 18

  return row
}

// ── Carátula ────────────────────────────────────────────────────────────────
put(1, ['PROPUESTA ECONÓMICA'], { bold: true, size: 16, color: NAVY, h: 26 })
put(2, ['Servicio de Producción de Contenido Blog — SKY Airline'], { size: 12, color: MUTED, h: 20 })
put(4, ['Oferente', 'Efeonce Group SpA'], { boldCells: [0] })
put(5, ['Licitación', 'Servicio de Producción de Contenido Blog SKY (plataforma Wherex)'], { boldCells: [0] })
put(6, ['Fecha', 'julio 2026'], { boldCells: [0] })
put(7, ['Validez de la oferta', '120 días desde su recepción por parte de SKY'], { boldCells: [0] })

// ── 1. Valor del servicio ───────────────────────────────────────────────────
put(9, ['1. VALOR DEL SERVICIO'], { bold: true, size: 12, color: NAVY, h: 24 })

put(10, ['Plan', 'Alcance de la operación mensual', 'Valor mensual (CLP, neto sin IVA)'], {
  bold: true,
  fill: SOFT,
  border: true,
  h: 32
})

put(
  11,
  [
    'Plan propuesto',
    'Operación mensual del blog: estrategia y planificación editorial · capa técnica de SEO implementada sobre su WordPress · producción de hasta 8 artículos publicados · recursos visuales y multimedia · medición en buscadores y en los 5 motores de respuesta con IA · informe mensual con los 8 indicadores exigidos · portal de cliente en vivo · gobernanza con los 9 SLA de las Bases',
    MENSUAL_BASE
  ],
  { border: true, money: true, boldCells: [0, 2], h: 76 }
)

put(
  12,
  [
    'Plan ampliado (opcional)',
    'La misma operación, con capacidad de producción de hasta 12 artículos publicados al mes',
    MENSUAL_AMPLIADO
  ],
  { border: true, money: true, boldCells: [0], h: 34 }
)

put(
  13,
  [
    'Contenidos ad-hoc',
    'Se producen DENTRO de la capacidad mensual contratada, con la prioridad que SKY determine y en ≤ 5 días hábiles. Sin costo adicional: un contenido ad-hoc ocupa un espacio de la capacidad del mes.',
    'Incluido'
  ],
  { border: true, boldCells: [0], size: 10, h: 40 }
)

// ── Proyección ──────────────────────────────────────────────────────────────
put(15, ['Proyección del plan propuesto'], { bold: true, size: 11, color: NAVY })
put(16, ['Anual (12 meses)', null, MENSUAL_BASE * 12], { border: true, money: true, boldCells: [0] })
put(17, ['Total contrato (24 meses)', null, MENSUAL_BASE * 24], {
  border: true,
  money: true,
  bold: true,
  fill: SOFT
})

// ── 2. Condiciones comerciales (los 5 ítems mínimos del §3.2 de las Bases) ──
put(19, ['2. CONDICIONES COMERCIALES'], { bold: true, size: 12, color: NAVY, h: 24 })

const condiciones = [
  ['Precio', 'CLP 5.200.000 mensuales, valor neto. Tarifa fija en pesos chilenos, conforme al numeral 3.2 de las Bases'],
  ['Impuestos', 'Valores netos, sin IVA. El IVA se aplica en la factura según corresponda'],
  ['Reajustes', 'Sin reajuste durante la vigencia del contrato, conforme al numeral 3.2 de las Bases'],
  ['Condiciones de pago', '30 días desde la correcta recepción y aceptación conforme de la factura por parte de SKY'],
  ['Facturación', 'Mensual'],
  ['Modalidad de pago', 'Transferencia electrónica a la cuenta bancaria de Efeonce Group SpA'],
  ['Duración', 'Dos (2) años a contar del inicio del servicio'],
  [
    'Condiciones de término',
    'Renovable por igual período previo acuerdo de ambas partes, con notificación 60 días antes del término del período en curso (numeral 3.3.2 de las Bases)'
  ],
  [
    'Desembolsos',
    'No aplican. El valor mensual es todo incluido: planificación, capa técnica, producción, recursos visuales, multimedia, medición, portal y coordinación. Sin gastos reembolsables ni costos ocultos'
  ],
  [
    'Comisiones de plataforma',
    'Las comisiones de Wherex aplicables al adjudicado son asumidas por Efeonce y están consideradas en esta oferta'
  ]
]

condiciones.forEach(([k, v], i) => {
  put(20 + i, [k, v], { border: true, boldCells: [0], h: v.length > 110 ? 46 : 28 })
})

put(20 + condiciones.length + 1, ['Efeonce Group SpA — Empower your Growth'], { size: 10, color: MUTED })

await wb.xlsx.writeFile(OUT)

console.log(`\n  ✓ ${path.relative(REPO, OUT)}`)
console.log('\n  Sin precio unitario por artículo. La capacidad es un BORDE del alcance, no la unidad de valor.\n')

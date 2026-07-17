/**
 * Builder REUSABLE de la oferta económica en Excel — brandeado, estructurado, profesional.
 *
 * Domain-free: toma DATOS estructurados + un brand pack (logo + colores AXIS) y emite un `.xlsx`
 * brandeado. Cada licitación es un `economica.json` distinto; el código no cambia. Es el tercer
 * artefacto de la familia (deck ✓ · oferta técnica ✓ · económica = esto).
 *
 * POR QUÉ: hay clientes que EXIGEN Excel (documento integrante de las bases). El Excel tiene un techo
 * de branding (las fuentes no se embeben en `.xlsx`), pero el logo (imagen), los colores, la
 * estructura, el bloque de total y el print setup sí se ven igual en todos lados — y eso separa una
 * planilla escrita de un documento diseñado.
 *
 * 🔴 REGLA (seo-aeo-practice → 04_PRICING regla #2): NUNCA un precio unitario por artículo — el conteo
 *    es TECHO DE CAPACIDAD, no unidad de valor. El schema no tiene un campo "precio unitario"; el valor
 *    es siempre "valor mensual/de la operación".
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import ExcelJS from 'exceljs'

// Brand pack (AXIS + Efeonce). ARGB = 'FF' + hex. SSoT: deck-tokens.css / efeonce-brand.ts.
const BRAND = {
  navy: 'FF00345F', // --axis-deck-navy-800
  navyDeep: 'FF001A33', // --axis-deck-navy-920
  teal: 'FF36C8BF', // --axis-deck-teal-500
  ink: 'FF141821',
  muted: 'FF5B6470',
  line: 'FFE4E7EC',
  soft: 'FFF7FAFC',
  zebra: 'FFFBFCFD',
  white: 'FFFFFFFF',
  wordmarkWhite: 'public/branding/pdf/efeonce-wordmark-white.png'
}

const FONT = 'Aptos' // fuente limpia y disponible; las de marca no se embeben en xlsx (degradarían)

const clpFmt = '$#,##0;[Red]-$#,##0'

/** Convierte un valor a número si lo es; devuelve el string tal cual si no. */
const asMoney = v => (typeof v === 'number' ? v : v)

export async function buildEconomicOfferXlsx({ data, repoRoot, outPath }) {
  const wb = new ExcelJS.Workbook()

  wb.creator = data.meta?.Oferente || 'Efeonce Group SpA'
  wb.created = new Date(2026, 0, 1) // fijo: evita ruido de metadata volátil

  const ws = wb.addWorksheet(data.sheetName || 'Propuesta Económica', {
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.6, header: 0.2, footer: 0.3 }
    }
  })

  // 4 columnas: gutter fino + label + descripción + valor. El gutter da respiro (aire = diseño).
  ws.columns = [{ width: 2.5 }, { width: 30 }, { width: 66 }, { width: 22 }]
  const COLS = 4 // A..D
  const firstCol = 2 // B (después del gutter)
  const lastCol = 4 // D

  let r = 1

  const mergeRow = (row, from = firstCol, to = lastCol) =>
    ws.mergeCells(row, from, row, to)

  const setCell = (row, col, value, style = {}) => {
    const c = ws.getCell(row, col)

    c.value = value
    c.font = { name: FONT, size: style.size ?? 10, bold: !!style.bold, italic: !!style.italic, color: { argb: style.color ?? BRAND.ink } }
    c.alignment = { vertical: style.vAlign ?? 'middle', horizontal: style.hAlign ?? 'left', wrapText: style.wrap !== false, indent: style.indent ?? 0 }
    if (style.fill) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: style.fill } }
    if (style.numFmt) c.numFmt = style.numFmt

    if (style.border) {
      c.border = {
        top: { style: 'thin', color: { argb: BRAND.line } },
        bottom: { style: 'thin', color: { argb: BRAND.line } },
        left: { style: 'thin', color: { argb: BRAND.line } },
        right: { style: 'thin', color: { argb: BRAND.line } }
      }
    }

    
return c
  }

  // ── Banda de encabezado (navy) con el wordmark blanco ──────────────────────
  const bandTop = r
  const bandBottom = r + 2

  for (let row = bandTop; row <= bandBottom; row++) {
    ws.getRow(row).height = 22

    for (let col = 1; col <= COLS; col++) {
      ws.getCell(row, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.navy } }
    }
  }

  // barra de acento teal al pie de la banda
  for (let col = 1; col <= COLS; col++) {
    ws.getCell(bandBottom + 1, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND.teal } }
  }

  ws.getRow(bandBottom + 1).height = 3

  // logo blanco embebido (imagen — se ve igual en todos lados)
  const wordmark = await readFile(join(repoRoot, BRAND.wordmarkWhite))
  const imgId = wb.addImage({ buffer: wordmark, extension: 'png' })

  ws.addImage(imgId, { tl: { col: firstCol - 1 + 0.15, row: bandTop - 1 + 0.5 }, ext: { width: 168, height: 39 } })

  // título a la derecha de la banda
  mergeRow(bandTop + 1)
  setCell(bandTop + 1, firstCol, data.title || 'PROPUESTA ECONÓMICA', {
    size: 15, bold: true, color: BRAND.white, hAlign: 'right'
  })

  r = bandBottom + 2 // saltar la barra teal

  // subtítulo
  if (data.subtitle) {
    r += 1
    mergeRow(r)
    setCell(r, firstCol, data.subtitle, { size: 11, color: BRAND.muted })
    ws.getRow(r).height = 20
  }

  r += 2

  // ── Bloque de metadatos (oferente / licitación / fecha / validez) ──────────
  for (const [k, v] of Object.entries(data.meta || {})) {
    setCell(r, firstCol, k, { bold: true, color: BRAND.navy, size: 10 })
    ws.mergeCells(r, firstCol + 1, r, lastCol)
    setCell(r, firstCol + 1, v, { color: BRAND.ink })
    ws.getRow(r).height = v.length > 70 ? 30 : 18
    r++
  }

  r += 1

  // ── Helpers de sección ─────────────────────────────────────────────────────
  const sectionTitle = title => {
    mergeRow(r)
    const c = setCell(r, firstCol, title.toUpperCase(), { bold: true, size: 11, color: BRAND.navy })

    c.border = { bottom: { style: 'medium', color: { argb: BRAND.teal } } }

    for (let col = firstCol + 1; col <= lastCol; col++) {
      ws.getCell(r, col).border = { bottom: { style: 'medium', color: { argb: BRAND.teal } } }
    }

    ws.getRow(r).height = 24
    r++
    r++ // aire
  }

  const money = data.currency === 'CLP' ? clpFmt : `"${data.currency ?? ''}"#,##0`

  // ── Render de secciones ─────────────────────────────────────────────────────
  const KNOWN_SECTION_TYPES = new Set(['value-table', 'totals', 'keyvalue'])

  for (const section of data.sections || []) {
    // Fail-loud: un type desconocido NO puede renderizar un cuerpo en blanco en silencio.
    if (!KNOWN_SECTION_TYPES.has(section.type)) {
      throw new Error(
        `economica.json: tipo de sección desconocido "${section.type}". Válidos: ${[...KNOWN_SECTION_TYPES].join(', ')}.`
      )
    }

    if (section.title) sectionTitle(section.title)

    if (section.type === 'value-table') {
      // encabezado de columnas
      const cols = section.columns

      setCell(r, firstCol, cols[0], { bold: true, fill: BRAND.soft, color: BRAND.navy, border: true })
      setCell(r, firstCol + 1, cols[1], { bold: true, fill: BRAND.soft, color: BRAND.navy, border: true })
      setCell(r, lastCol, cols[2], { bold: true, fill: BRAND.soft, color: BRAND.navy, border: true, hAlign: 'right' })
      ws.getRow(r).height = 30
      r++

      section.rows.forEach((row, i) => {
        const zebra = i % 2 === 1 ? BRAND.zebra : undefined
        const [a, b, c] = row.cells

        setCell(r, firstCol, a, { bold: !!row.strong, color: BRAND.navy, border: true, fill: zebra, size: 10 })
        setCell(r, firstCol + 1, b, { color: BRAND.ink, border: true, fill: zebra, size: 9.5 })
        const isNum = typeof c === 'number'

        setCell(r, lastCol, asMoney(c), {
          bold: !!row.strong, border: true, fill: zebra, hAlign: 'right',
          numFmt: isNum ? money : undefined, color: isNum ? BRAND.ink : BRAND.muted, italic: !isNum
        })
        ws.getRow(r).height = (b && b.length > 120) ? 74 : (b && b.length > 70 ? 48 : 26)
        r++
      })
      r += 1
    }

    if (section.type === 'totals') {
      // Neto / IVA / Total — el bloque que el comité quiere ver
      const neto = section.basis
      const iva = Math.round(neto * (data.ivaRate ?? 0))
      const total = neto + iva

      const lines = [
        [`${section.label ?? 'Valor neto'}`, neto, false],
        [`IVA (${Math.round((data.ivaRate ?? 0) * 100)}%)`, iva, false],
        ['Total', total, true]
      ]

      lines.forEach(([label, val, isTotal]) => {
        ws.mergeCells(r, firstCol, r, lastCol - 1)
        setCell(r, firstCol, label, {
          bold: isTotal, size: isTotal ? 11 : 10,
          color: isTotal ? BRAND.white : BRAND.ink,
          fill: isTotal ? BRAND.navy : BRAND.soft, border: true
        })
        setCell(r, lastCol, val, {
          bold: isTotal, size: isTotal ? 12 : 10, hAlign: 'right', numFmt: money,
          color: isTotal ? BRAND.white : BRAND.ink,
          fill: isTotal ? BRAND.navy : BRAND.soft, border: true
        })
        ws.getRow(r).height = isTotal ? 30 : 24
        r++
      })
      r += 1
    }

    if (section.type === 'keyvalue') {
      section.rows.forEach((row, i) => {
        const zebra = i % 2 === 1 ? BRAND.zebra : undefined
        const [k, v] = row.cells
        const isNum = typeof v === 'number'

        setCell(r, firstCol, k, { bold: true, color: BRAND.navy, border: true, fill: zebra, size: 10 })
        ws.mergeCells(r, firstCol + 1, r, isNum ? lastCol - 1 : lastCol)

        if (isNum) {
          setCell(r, firstCol + 1, '', { border: true, fill: zebra })
          setCell(r, lastCol, v, { bold: !!row.strong, border: true, fill: zebra, hAlign: 'right', numFmt: money, color: BRAND.ink })
        } else {
          setCell(r, firstCol + 1, v, { color: BRAND.ink, border: true, fill: zebra, size: 9.5 })
        }

        ws.getRow(r).height = (!isNum && v.length > 110) ? 46 : (!isNum && v.length > 60 ? 32 : 22)
        r++
      })
      r += 1
    }
  }

  // ── Nota al pie ──────────────────────────────────────────────────────────────
  if (data.footerNote) {
    r += 1
    mergeRow(r)
    setCell(r, firstCol, data.footerNote, { size: 8.5, italic: true, color: BRAND.muted })
    ws.getRow(r).height = 26
  }

  // print: repetir la banda, footer con marca + confidencial + página
  ws.pageSetup.printArea = `A1:D${r}`
  ws.headerFooter = {
    oddFooter: `&L&8&K5B6470Efeonce Group SpA · Confidencial&C&8&K5B6470${data.subtitle ?? ''}&R&8&K5B6470Página &P de &N`
  }

  await wb.xlsx.writeFile(outPath)
  
return { outPath, rows: r }
}

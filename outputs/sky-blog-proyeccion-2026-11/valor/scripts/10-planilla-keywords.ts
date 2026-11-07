/**
 * Planilla para SKY: desglose de búsquedas valorizadas frente a Google Ads (ago–oct 2026 y jul–sep 2025).
 *
 *   pnpm exec tsx outputs/sky-blog-proyeccion-2026-11/valor/scripts/10-planilla-keywords.ts <salida.xlsx>
 */
import fs from 'node:fs'
import path from 'node:path'

import ExcelJS from 'exceljs'

const DIR = path.resolve('outputs/sky-blog-proyeccion-2026-11/valor')

const readCsv = (file: string) => {
  const text = fs.readFileSync(path.join(DIR, file), 'utf8').trim()
  const rows: string[][] = []

  for (const line of text.split('\n')) {
    const cells: string[] = []
    let cur = ''
    let quoted = false

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]

      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ } else if (ch === '"') quoted = false
        else cur += ch
      } else if (ch === '"') quoted = true
      else if (ch === ',') { cells.push(cur); cur = '' } else cur += ch
    }

    cells.push(cur)
    rows.push(cells)
  }

  const [header, ...body] = rows

  return body.map(cells => Object.fromEntries(header!.map((key, i) => [key, cells[i] ?? ''])))
}

const COUNTRY: Record<string, string> = { chl: 'Chile', per: 'Perú' }

const THEME: Record<string, string> = {
  equipaje: 'Equipaje',
  'check-in': 'Check-in',
  mascotas: 'Mascotas',
  cambios: 'Cambios y devoluciones',
  'destinos Chile': 'Destinos en Chile',
  'destinos Perú': 'Destinos en Perú',
  internacionales: 'Rutas internacionales',
  'otros · SKY Plus, empresas y servicios': 'SKY Plus, empresas y servicios',
  'otros · empleo y tripulación': 'Empleo y tripulación',
  'otros · resto': 'Otros temas'
}

const num = (value: string) => (value === '' ? null : Number(value))
const header = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF023C70' } } } as const

const main = async () => {
  const out = process.argv[2]

  if (!out) throw new Error('uso: 10-planilla-keywords.ts <salida.xlsx>')

  const wb = new ExcelJS.Workbook()

  wb.creator = 'Efeonce'

  // Resumen por tema
  const before = new Map(readCsv('temas-www-blog-jul-sep-2025.csv').map(r => [r.theme!, Number(r.value_usd_per_month)]))
  const now = readCsv('temas-blog-ago-oct-2026.csv')
  const summary = wb.addWorksheet('Resumen por tema')

  summary.columns = [
    { header: 'Tema', key: 'theme', width: 34 },
    { header: 'Antes de migrar (jul–sep 2025), US$/mes', key: 'before', width: 22 },
    { header: 'Hoy (ago–oct 2026), US$/mes', key: 'now', width: 20 },
    { header: 'Cambio', key: 'change', width: 12 },
    { header: 'Participación hoy', key: 'share', width: 16 }
  ]

  for (const r of now.sort((a, b) => (before.get(b.theme!) ?? 0) - (before.get(a.theme!) ?? 0))) {
    const b = before.get(r.theme!) ?? 0
    const n = Number(r.value_usd_per_month)

    summary.addRow({ theme: THEME[r.theme!] ?? r.theme, before: b, now: n, change: b ? n / b - 1 : null, share: Number(r.share_of_measured_value) })
  }

  summary.getColumn('before').numFmt = '#,##0'
  summary.getColumn('now').numFmt = '#,##0'
  summary.getColumn('change').numFmt = '0%'
  summary.getColumn('share').numFmt = '0.0%'

  // Búsquedas
  const sheet = (name: string, file: string, months: Array<[string, string]>) => {
    const ws = wb.addWorksheet(name)

    ws.columns = [
      { header: 'Búsqueda', key: 'query', width: 42 },
      { header: 'País', key: 'country', width: 8 },
      { header: 'Marca', key: 'brand', width: 10 },
      { header: 'Tema', key: 'theme', width: 26 },
      { header: 'Clics del período', key: 'clicks', width: 12 },
      ...months.map(([key, label]) => ({ header: `Clics ${label}`, key, width: 11 })),
      { header: 'CPC Google Ads (US$)', key: 'cpc', width: 12 },
      { header: 'Valor del período (US$)', key: 'value', width: 14 },
      { header: 'Página principal', key: 'page', width: 60 },
      { header: 'Fecha del CPC', key: 'cpcDate', width: 12 }
    ]

    const rows = readCsv(file).sort((a, b) => Number(b.value_usd_period || 0) - Number(a.value_usd_period || 0))

    for (const r of rows) {
      ws.addRow({
        query: r.query,
        country: COUNTRY[r.country!] ?? r.country,
        brand: r.brand_flag === 'marca' ? 'Sí' : 'No',
        theme: THEME[r.theme!] ?? r.theme,
        clicks: num(r.clicks_period!),
        ...Object.fromEntries(months.map(([key]) => [key, num(r[`clicks_${key}`] ?? '')])),
        cpc: num(r.cpc_usd!),
        value: num(r.value_usd_period!),
        page: r.landing_page_top,
        cpcDate: r.cpc_captured_at
      })
    }

    ws.getColumn('cpc').numFmt = '0.00'
    ws.getColumn('value').numFmt = '#,##0.00'
    ws.autoFilter = { from: 'A1', to: { row: 1, column: ws.columnCount } }
    ws.views = [{ state: 'frozen', ySplit: 1 }]

    return ws
  }

  sheet('Búsquedas ago–oct 2026', 'desglose-keywords-blog-ago-oct-2026.csv', [
    ['blog-2026-08', 'ago 2026'],
    ['blog-2026-09', 'sep 2026'],
    ['blog-2026-10', 'oct 2026']
  ])
  sheet('Búsquedas jul–sep 2025', 'desglose-keywords-www-blog-jul-sep-2025.csv', [
    ['www-blog-2025-07', 'jul 2025'],
    ['www-blog-2025-08', 'ago 2025'],
    ['www-blog-2025-09', 'sep 2025']
  ])

  const method = wb.addWorksheet('Cómo leerla')

  method.getColumn(1).width = 120
  for (const line of [
    'Desglose de búsquedas valorizadas del Blog SKY frente a Google Ads. Preparado por Efeonce, noviembre de 2026.',
    '',
    'Valor = clics de Search Console de cada búsqueda en Chile y Perú × CPC de Google Ads de esa búsqueda en ese país.',
    'Los CPC son de hoy: los meses de 2025 están revalorizados a precios actuales, no a los precios de ese momento.',
    'Antes de la migración el blog vivía en www.skyairline.com/blog; hoy en blog.skyairline.com.',
    'Search Console oculta parte de las búsquedas y no todas tienen CPC: el valor medido cubre del 12 % al 15 % de los clics y es un piso, no el total.',
    'Una celda de CPC vacía significa que Google Ads no informa precio para esa búsqueda; no es cero.',
    'No es ahorro ni retorno: es lo que costaría comprar esos clics en Google Ads.'
  ]) method.addRow([line])
  method.getRow(1).font = { bold: true }

  for (const ws of wb.worksheets.slice(0, 3)) ws.getRow(1).eachCell(cell => Object.assign(cell, header))

  await wb.xlsx.writeFile(out)
  console.log('planilla', out)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})

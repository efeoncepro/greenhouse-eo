import 'server-only'

import * as XLSX from 'xlsx'

export interface WorkbookGrid {
  sheetName: string
  grid: string[][]
}

/**
 * Lee un XLS/XLSX y devuelve cada hoja como matriz de strings (SheetJS
 * `header: 1`, `raw: false` para conservar el formato visible de la celda —
 * es lo que el banco quiso mostrar, y lo que los adapters saben parsear).
 */
export const readWorkbookGrids = (buffer: Buffer | Uint8Array): WorkbookGrid[] => {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false })

  return workbook.SheetNames.map(sheetName => ({
    sheetName,
    grid: XLSX.utils
      .sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, raw: false, defval: '' })
      .map(row => row.map(cell => String(cell ?? '')))
  }))
}

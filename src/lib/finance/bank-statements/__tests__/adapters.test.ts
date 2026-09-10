import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'

import { parseGlobal66Xls } from '../global66-xls'
import { parseSantanderCartolaXlsx } from '../santander-cartola-xlsx'
import { parseSantanderTcEstadoCuentaText } from '../santander-tc-estado-cuenta-text'
import { parseSantanderTcMovimientosXlsx } from '../santander-tc-movimientos-xlsx'
import type { WorkbookGrid } from '../xlsx-grid'

// Fixtures sintéticas con el layout real de cada origen (montos ficticios).

const grid = (sheetName: string, rows: string[][]): WorkbookGrid[] => [{ sheetName, grid: rows }]

const roundTripThroughSheetJs = (sheetName: string, rows: string[][]): WorkbookGrid[] => {
  const workbook = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), sheetName)

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  const read = XLSX.read(buffer, { type: 'buffer' })

  return read.SheetNames.map(name => ({
    sheetName: name,
    grid: XLSX.utils
      .sheet_to_json<unknown[]>(read.Sheets[name], { header: 1, raw: false, defval: '' })
      .map(row => row.map(cell => String(cell ?? '')))
  }))
}

const SANTANDER_CARTOLA: string[][] = [
  ['Cartolas históricas de Cuentas Corrientes'],
  [],
  ['Sr. (a):', 'ALGUIEN', '', 'Fecha:', '10 de septiembre de 2026'],
  ['Empresa:', 'EMPRESA SPA'],
  ['RUT empresa:', '11.111.111-1'],
  ['Datos cuenta'],
  ['Cuenta Corriente N°: 0-000-1234567-8', '', 'Moneda: PESOS DE CHILE', 'Sucursal: 0265'],
  ['Número cartola: 30', '', 'Fecha desde: 31/07/2026', 'Fecha hasta: 31/08/2026'],
  ['Saldos'],
  ['SALDO INICIAL', 'DEPÓSITOS', 'OTROS ABONOS', 'CHEQUES', 'OTROS CARGOS', 'IMPUESTOS', 'SALDO FINAL'],
  ['1,000,000', '0', '250,500', '0', '-100,000', '0', '1,150,500'],
  ['Detalle movimientos'],
  ['MONTO', 'DESCRIPCIÓN MOVIMIENTO', '', 'FECHA', 'N° DOCUMENTO', 'SUCURSAL', '', 'CARGO/ABONO'],
  ['-100,000', 'Transf.Internet a 22.222.222-2', '', '03/08/2026', '0', 'Agustinas', '', 'C'],
  ['250,500', '0333333333 Transf. Cliente', '', '11/08/2026', '28000012', 'Agustinas', '', 'A'],
  ['Resumen comisiones'],
  ['MONTO', 'DESCRIPCIÓN MOVIMIENTO', '', 'FECHA', 'N° DOCUMENTO', 'SUCURSAL', '', 'CARGO/ABONO'],
  ['-20.014', 'COM.MANTENCION PLAN', '', '27/08/2026', '0', 'Agustinas', '', 'C'],
  ['Saldos diarios'],
  ['SALDO', 'FECHA'],
  ['900,000', '03/08/2026']
]

describe('parseSantanderCartolaXlsx', () => {
  it('lee el bloque Detalle movimientos con signo, referencia y metadatos de saldo', () => {
    const parsed = parseSantanderCartolaXlsx(grid('Cartola Historica CtaCte', SANTANDER_CARTOLA))

    expect(parsed.format).toBe('santander_cartola_xlsx')
    expect(parsed.rows).toEqual([
      { transactionDate: '2026-08-03', description: 'Transf.Internet a 22.222.222-2', reference: null, amount: -100000, balance: null },
      { transactionDate: '2026-08-11', description: '0333333333 Transf. Cliente', reference: '28000012', amount: 250500, balance: null }
    ])
    expect(parsed.meta).toMatchObject({
      accountNumber: '0-000-1234567-8',
      currency: 'CLP',
      periodFrom: '2026-07-31',
      periodTo: '2026-08-31',
      openingBalance: 1000000,
      closingBalance: 1150500,
      rawRowCount: 2
    })
  })

  it('no se confunde con la sección Resumen comisiones (formato chileno de miles)', () => {
    const parsed = parseSantanderCartolaXlsx(grid('CartolaProvisoria', SANTANDER_CARTOLA))

    expect(parsed.rows.some(row => row.description.includes('COM.MANTENCION'))).toBe(false)
  })

  it('parsea la cartola USD con decimales', () => {
    const rows = SANTANDER_CARTOLA.map(row => [...row])

    rows[6] = ['Cuenta Corriente N°: 0-051-0000000-1', '', 'Moneda: DOLAR U.S.A.']
    rows[10] = ['1.29', '0.00', '335.15', '0.00', '0.00', '0.00', '336.44']
    rows[13] = ['335.15', 'Rec Or de Pago 2026', '', '13/08/2026', '202699234', 'COMEX', '', 'A']
    rows.splice(14, 1)

    const parsed = parseSantanderCartolaXlsx(roundTripThroughSheetJs('Cartola Historica CtaCte', rows))

    expect(parsed.meta.currency).toBe('USD')
    expect(parsed.meta.openingBalance).toBe(1.29)
    expect(parsed.rows[0].amount).toBeCloseTo(335.15, 2)
  })
})

describe('parseSantanderTcMovimientosXlsx', () => {
  it('emite los cargos como negativos y expone el saldo inicial como meta', () => {
    const parsed = parseSantanderTcMovimientosXlsx(
      grid('Movimientos', [
        ['Últimos movimientos Tarjetas de Crédito'],
        [],
        ['Empresa:', 'EMPRESA SPA'],
        ['Movimientos nacionales'],
        ['FECHA', 'ESTABLECIMIENTO', 'DESCRIPCIÓN', 'MONTO', 'LUGAR'],
        ['08/09/2026', 'METRICOOL.COM', 'COMPRA INT. EN MONEDA NACIONAL', '51651', 'MADRID'],
        ['07/09/2026', '', 'SALDO INICIAL', '1481293', '']
      ])
    )

    expect(parsed.rows).toEqual([
      { transactionDate: '2026-09-08', description: 'METRICOOL.COM · COMPRA INT. EN MONEDA NACIONAL · (MADRID)', reference: null, amount: -51651, balance: null }
    ])
    expect(parsed.meta.openingBalance).toBe(1481293)
  })
})

describe('parseSantanderTcEstadoCuentaText', () => {
  const TEXT = `
                                         ESTADO DE CUENTA EN MONEDA NACIONAL DE TARJETA DE CRÉDITO
NOMBRE DEL TITULAR               EMPRESA SPA
Nº DE TARJETA DE CRÉDITO         XXXX XXXX XXXX 2505                      MASTER EMPRESA PLUS
                                         CUPO TOTAL          CUPO UTILIZADO         CUPO DISPONIBLE
CUPO TOTAL                                    $ 1.700.000           $ 1.481.293               $ 218.707
CAE se calcula sobre un supuesto                     PERÍODO FACTURADO 06/08/2026 07/09/2026
PERÍODO DE FACTURACIÓN ANTERIOR                              06/07/2026            06/08/2026
SALDO ADEUDADO INICIO PERÍODO ANTERIOR                            $ -733.407
MONTO FACTURADO A PAGAR (PERÍODO ANTERIOR)                         $ 975.503
MONTO PAGADO PERÍODO ANTERIOR                                   $ -1.749.712
COVINA              06/08/26 APOLLO.IO                                                           US         59,00                                     $55.244
LAS CONDES          08/08/26 ADOBE                            COMPRAS P.A.T.                                                                          $55.038
                  14/08/26 MONTO CANCELADO                                 $ -1.435.296
                  07/09/26 COMISION DE MANTENCION                                                                   $9.403
`

  it('separa cargos, pagos y comisión con el signo de caja del titular', () => {
    const parsed = parseSantanderTcEstadoCuentaText(TEXT)

    expect(parsed.rows.map(r => [r.transactionDate, r.amount, r.description])).toEqual([
      ['2026-08-06', -55244, 'APOLLO.IO (COVINA)'],
      ['2026-08-08', -55038, 'ADOBE COMPRAS P.A.T. (LAS CONDES)'],
      ['2026-08-14', 1435296, 'Pago tarjeta (MONTO CANCELADO)'],
      ['2026-09-07', -9403, 'COMISION DE MANTENCION']
    ])
    expect(parsed.meta).toMatchObject({
      accountNumber: 'XXXXXXXXXXXX2505',
      periodFrom: '2026-08-06',
      periodTo: '2026-09-07',
      openingBalance: 975503,
      closingBalance: 1481293
    })
  })

  it('rechaza texto que no es un estado de cuenta TC', () => {
    expect(() => parseSantanderTcEstadoCuentaText('hola')).toThrow(/estado de cuenta/i)
  })
})

describe('parseGlobal66Xls', () => {
  it('convierte débitos/créditos a un monto con signo, en orden cronológico, con contraparte', () => {
    const header = [
      'Tipo de transacción', 'Fecha de la transacción', 'Monto debitado', 'Monto acreditado', 'Costo de tipo de cambio',
      'ID Fees Asociados', 'Últimos 4 digitos de la tarjeta', 'Nombre tercero o Comercio', 'DNI del tercero',
      'Número de cuenta del tercero', 'País destino/tercero', 'Tipo de cambio', 'ID de la transacción', 'Comentario de la transacción'
    ]

    const parsed = parseGlobal66Xls(
      grid('Movimientos de cuenta CLP', [
        ['Movimientos de cuenta CLP'],
        ['Periodo consultado: 2024-09-27 al 2026-09-10'],
        [],
        header,
        ['Envío a cuenta bancaria Andres carlosama', '2026-08-04 18:17:25', '811188.0', '', '34680', '68881443', '', 'Andres', '1085335353', '3165646836', 'CO', '0.28', '38049600', 'Pago Nomina Mes Julio'],
        ['Costo tipo de cambio', '2026-08-04 18:17:25', '34680.00', '', '', '', '', '', '', '', '', '', '68881443', ''],
        ['Recibido de Efeonce group spa', '2026-08-04 18:13:12', '', '845868.00', '', '', '', 'Efeonce group spa', '', '', '', '', '38049305', '']
      ])
    )

    expect(parsed.format).toBe('global66_xls')
    expect(parsed.meta).toMatchObject({ currency: 'CLP', periodFrom: '2024-09-27', periodTo: '2026-09-10', rawRowCount: 3 })
    expect(parsed.rows.map(r => r.amount)).toEqual([845868, -34680, -811188])
    expect(parsed.rows[2]).toMatchObject({
      transactionDate: '2026-08-04',
      reference: '38049600',
      description: 'Envío a cuenta bancaria Andres carlosama [CO] → cta 3165646836 — Pago Nomina Mes Julio'
    })
  })
})

describe('parseBancoChileCuentaVistaText', () => {
  const TEXT = `
                                                                           Estado de Cuenta
                                                 00030852600520260831       CUENTA VISTA
EMPRESA SpA
                                                                            N° DE CUENTA : 308526005
                                                                            MONEDA          : PESOS
SUCURSAL                  :   OFICINA                     CARTOLA N°           : 8
TELEFONO                  :   0                           DESDE                : 31/07/2026            HASTA          : 31/08/2026
FECHA             DETALLE DE TRANSACCION                     SUCURSAL        N° DOCTO       MONTO CARGOS            MONTO DEPOSITOS           SALDO
31/07      SALDO INICIAL                                                                                                                  10.600
05/08      APP-TRASPASO A:Empresa Spa                       INTERNET                                          600                          10.000
14/08      TRASPASO DE:Empresa SpA                          INTERNET                                                        300.000       310.000
19/08      TRASPASO DE:Empresa SpA                          INTERNET                                                      3.350.000             0
31/08      SALDO FINAL                                                                                                                 3.660.000
`

  it('deriva el signo por la glosa y no confía en un saldo impreso inconsistente', async () => {
    const { parseBancoChileCuentaVistaText } = await import('../bancochile-cuenta-vista-text')
    const parsed = parseBancoChileCuentaVistaText(TEXT)

    expect(parsed.rows.map(r => [r.transactionDate, r.amount, r.balance, r.description])).toEqual([
      ['2026-08-05', -600, 10000, 'APP-TRASPASO A:Empresa Spa'],
      ['2026-08-14', 300000, 310000, 'TRASPASO DE:Empresa SpA'],
      ['2026-08-19', 3350000, 3660000, 'TRASPASO DE:Empresa SpA']
    ])
    expect(parsed.meta).toMatchObject({ accountNumber: '308526005', periodFrom: '2026-07-31', periodTo: '2026-08-31', openingBalance: 10600, closingBalance: 3660000 })
  })
})

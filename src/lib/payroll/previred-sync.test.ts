import { describe, expect, it } from 'vitest'

import {
  parseImpUnicoPayload,
  parsePreviredAfpRates,
  parsePreviredPayload
} from './previred-sync'

const previredPayload = {
  PreviredID: 12324,
  Fecha: '2026-03-27T06:00:03.727Z',
  PeriodoMY: '032026',
  PeriodoYM: '2603',
  UFDescPeriodo: 'Al 31 de Marzo del 2026',
  UFValPeriodo: '39841,72',
  UFDescPeridoAnt: 'Al 28 de Febrero del 2026',
  UFValPeriodoAnt: '39790,63',
  UTMDesc: 'Marzo 2026',
  UTMVal: '69889',
  UTAVal: '838668',
  RTIAfpUF: '90',
  RTIIpsUF: '60',
  RTISegCesUF: '135,2',
  RMITrabDepeInd: '539000',
  RMIMen18May65: '402082',
  RMITrabCasaPart: '539000',
  RMINoRemu: '347434',
  TasaSIS: '1,54',
  AFPCapitalTasaDepTrab: '11,44',
  AFPCapitalTasaDepAPagar: '11,54',
  AFPCuprumTasaDepTrab: '11,44',
  AFPCuprumTasaDepAPagar: '11,54',
  AFPHabitatTasaDepTrab: '11,27',
  AFPHabitatTasaDepAPagar: '11,37',
  AFPPlanVitalTasaDepTrab: '11,16',
  AFPPlanVitalTasaDepAPagar: '11,26',
  AFPProVidaTasaDepTrab: '11,45',
  AFPProVidaTasaDepAPagar: '11,55',
  AFPModeloTasaDepTrab: '10,58',
  AFPModeloTasaDepAPagar: '10,68',
  AFPUnoTasaDepTrab: '10,46',
  AFPUnoTasaDepAPagar: '10,56'
}

const impunicoPayload = {
  ImpUnicoID: 5816,
  FechaUpdate: '2026-03-27T06:15:00.823Z',
  PeriodoMY: '032026',
  PeriodoNombre: 'Marzo 2026',
  FechaDesde: '2026-03-01T00:00:00.000Z',
  FechaHasta: '2026-03-31T00:00:00.000Z',
  TR1Desde: '0',
  TR1Hasta: '943501,50',
  TR1Factor: '0',
  TR1CReb: '0',
  TR2Desde: '943501,51',
  TR2Hasta: '2096670,00',
  TR2Factor: '0,04',
  TR2CReb: '37740,06',
  TR3Desde: '2096670,01',
  TR3Hasta: '3494450,00',
  TR3Factor: '0,08',
  TR3CReb: '121606,86',
  TR4Desde: '3494450,01',
  TR4Hasta: '4892230,00',
  TR4Factor: '0,135',
  TR4CReb: '313801,61',
  TR5Desde: '4892230,01',
  TR5Hasta: '6290010,00',
  TR5Factor: '0,23',
  TR5CReb: '778563,46',
  TR6Desde: '6290010,01',
  TR6Hasta: '8386680,00',
  TR6Factor: '0,304',
  TR6CReb: '1244024,20',
  TR7Desde: '8386680,01',
  TR7Hasta: '21665590,00',
  TR7Factor: '0,35',
  TR7CReb: '1629811,48',
  TR8Desde: '21665590,01',
  TR8Hasta: '99999999',
  TR8Factor: '0,4',
  TR8CReb: '2713090,98'
}

describe('previred sync parsing', () => {
  it('parses Gael Previred payload into canonical indicators', () => {
    const snapshot = parsePreviredPayload(previredPayload)

    expect(snapshot).toEqual({
      periodYear: 2026,
      periodMonth: 3,
      ufValue: 39841.72,
      utmValue: 69889,
      immClp: 539000,
      sisRate: 0.0154,
      topeAfpUf: 90,
      topeCesantiaUf: 135.2,
      source: 'gael_api',
      sourceUrl: 'https://api.gael.cloud/general/public/previred/032026'
    })
  })

  it('parses AFP rates from the Gael Previred payload', () => {
    const rates = parsePreviredAfpRates(previredPayload)

    expect(rates).toHaveLength(7)
    expect(rates[0]).toMatchObject({
      periodYear: 2026,
      periodMonth: 3,
      afpName: 'Capital',
      source: 'gael_api',
      isActive: true
    })
    expect(rates[0]?.totalRate).toBeCloseTo(0.1154, 4)
    expect(rates.at(-1)).toMatchObject({
      afpName: 'Uno',
    })
    expect(rates.at(-1)?.totalRate).toBeCloseTo(0.1056, 4)
  })

  it('parses the monthly tax brackets from the Gael ImpUnico payload', () => {
    const parsed = parseImpUnicoPayload(impunicoPayload, 69889)

    expect(parsed.version).toBe('gael-2026-03')
    expect(parsed.effectiveFrom).toBe('2026-03-01')
    expect(parsed.brackets).toHaveLength(8)
    expect(parsed.brackets[0]).toMatchObject({
      bracketOrder: 1,
      fromUtm: 0,
      toUtm: 13.5,
      rate: 0,
      deductionUtm: 0
    })
    expect(parsed.brackets[7]).toMatchObject({
      bracketOrder: 8,
      toUtm: null,
    })
    expect(parsed.brackets[7]?.rate).toBeCloseTo(0.4, 4)
  })
})

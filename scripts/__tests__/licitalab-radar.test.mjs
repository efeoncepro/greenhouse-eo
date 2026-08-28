import test from 'node:test'
import assert from 'node:assert/strict'

import { parseLicitaLabOpportunityCells, parseLicitaLabRadarArgs } from '../lib/licitalab-radar.mjs'

test('parsea una fila realista del radar de LicitaLAB', () => {
  const result = parseLicitaLabOpportunityCells([
    'Recomendada\n★ 59%\nCampaña Nacional Vcm 2026\nID: 918434-14-LP26\nLP',
    'MINISTERIO DE LA MUJER Y LA EQUIDAD DE GÉNERO\nRegión Metropolitana de Santiago',
    '$ 350.000.000',
    '28/09/2026 20:00\n+30 días'
  ])

  assert.deepEqual(result, {
    code: '918434-14-LP26',
    title: 'Campaña Nacional Vcm 2026',
    scorePct: 59,
    buyer: 'MINISTERIO DE LA MUJER Y LA EQUIDAD DE GÉNERO',
    buyerRegion: 'Región Metropolitana de Santiago',
    amountText: '$ 350.000.000',
    closeText: '28/09/2026 20:00 +30 días',
    rawText:
      'Recomendada\n★ 59%\nCampaña Nacional Vcm 2026\nID: 918434-14-LP26\nLP\nMINISTERIO DE LA MUJER Y LA EQUIDAD DE GÉNERO\nRegión Metropolitana de Santiago\n$ 350.000.000\n28/09/2026 20:00\n+30 días'
  })
})

test('ignora filas sin código de oportunidad', () => {
  assert.equal(parseLicitaLabOpportunityCells(['Oportunidad / ID', 'Organismo', 'Monto', 'Cierre']), null)
})

test('valida opciones del runner', () => {
  assert.deepEqual(parseLicitaLabRadarArgs(['--view', 'recommended', '--max-opportunities', '25']), {
    checkOnly: false,
    forceLogin: false,
    help: false,
    maxOpportunities: 25,
    output: null,
    view: 'recommended'
  })
  assert.throws(() => parseLicitaLabRadarArgs(['--view', 'mine']), /recommended o all/)
})

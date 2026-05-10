import type { ChileComplianceSpec } from './types'

export const PREVIRED_PLANILLA_SPEC: ChileComplianceSpec = {
  kind: 'previred',
  specVersion: 'previred-formato-largo-variable-separador-v58-2022-04',
  sourceUrl: 'https://www.previred.com/documents/80476/80730/FormatoLargoVariablePorSeparador.pdf',
  sourceSha256: '32cdb7416793b83129b4f2888acfd4f1c3384423587a1aaa4942ff31cfc61a0b',
  validatedAsOf: '2026-05-10',
  delimiter: ';',
  encoding: 'plain-text-ascii'
} as const

export const LRE_CARGA_MASIVA_SPEC: ChileComplianceSpec = {
  kind: 'lre',
  specVersion: 'dt-lre-instrucciones-carga-masiva-pdf-2021',
  sourceUrl: 'https://static-content.api.dirtrab.cl/dt-docs/lre/lre_instrucciones_de_carga.pdf',
  sourceSha256: '3f55043371ed0faab2b48e486f1d18c4417088c3116e54fb4ed22a8d79a35b22',
  validatedAsOf: '2026-05-10',
  delimiter: ';',
  encoding: 'plain-text-ascii'
} as const

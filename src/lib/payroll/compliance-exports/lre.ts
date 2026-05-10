import {
  buildComplianceFilename,
  formatPeriodYm,
  hashText,
  sanitizeDelimitedCell,
  splitClRut,
  sumEntries,
  validateChileComplianceEntries
} from './common'
import { LRE_CARGA_MASIVA_SPEC } from './specs'
import type { ChileComplianceArtifact, ChileCompliancePeriodSnapshot, ChilePayrollComplianceEntry } from './types'

export const LRE_V1_HEADERS = [
  'periodo',
  'rut_trabajador',
  'dv_trabajador',
  'nombre_trabajador',
  'dias_trabajados',
  'dias_ausencia',
  'remuneracion_imponible',
  'total_haberes',
  'descuento_afp',
  'descuento_salud',
  'descuento_cesantia',
  'impuesto_unico',
  'apv',
  'total_descuentos',
  'aporte_empleador_sis',
  'aporte_empleador_cesantia',
  'aporte_empleador_mutual',
  'total_liquido'
] as const

export const buildLreRow = (
  snapshot: ChileCompliancePeriodSnapshot,
  entry: ChilePayrollComplianceEntry
): string => {
  const rut = splitClRut(entry.rutNormalized)

  return [
    formatPeriodYm(snapshot.year, snapshot.month),
    rut.number,
    rut.checkDigit,
    entry.memberDisplayName,
    entry.workingDaysInPeriod ?? 30,
    entry.daysAbsent ?? 0,
    entry.chileTaxableBase,
    entry.grossTotal,
    entry.chileAfpAmount,
    entry.chileHealthAmount,
    entry.chileUnemploymentAmount,
    entry.chileTaxAmount,
    entry.chileApvAmount,
    entry.chileTotalDeductions,
    entry.chileEmployerSisAmount,
    entry.chileEmployerCesantiaAmount,
    entry.chileEmployerMutualAmount,
    entry.netTotal
  ].map(sanitizeDelimitedCell).join(LRE_CARGA_MASIVA_SPEC.delimiter)
}

export const buildLreLibroArtifact = (
  snapshot: ChileCompliancePeriodSnapshot
): ChileComplianceArtifact => {
  const validation = validateChileComplianceEntries(snapshot.entries)

  const dataRows = validation.status === 'passed'
    ? snapshot.entries.map(entry => buildLreRow(snapshot, entry))
    : []

  const rows = [LRE_V1_HEADERS.join(LRE_CARGA_MASIVA_SPEC.delimiter), ...dataRows]
  const text = `${rows.join('\r\n')}\r\n`
  const artifactSha256 = hashText(text)

  return {
    kind: 'lre',
    spec: LRE_CARGA_MASIVA_SPEC,
    filename: buildComplianceFilename({ kind: 'lre', periodId: snapshot.periodId, extension: 'csv' }),
    contentType: 'text/csv; charset=us-ascii',
    encoding: LRE_CARGA_MASIVA_SPEC.encoding,
    text,
    artifactSha256,
    recordCount: dataRows.length,
    totals: {
      ...sumEntries(snapshot.entries),
      sourceSnapshotHash: snapshot.sourceSnapshotHash
    },
    validation
  }
}

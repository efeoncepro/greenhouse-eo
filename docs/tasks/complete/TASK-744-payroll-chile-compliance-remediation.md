# TASK-744 — Payroll Chile Compliance Remediation & International Guardrails

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Cerrada 2026-05-01`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `none`
- Branch: `develop` (por instrucción explícita del usuario; no cambiar de rama para esta ejecución)
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Corrige los hallazgos críticos de compliance y cálculo detectados en la auditoría Payroll del 2026-05-01: retención honorarios 2026, Seguro de Cesantía por tipo de contrato, topes imponibles, gratificación legal, contaminación de entries honorarios con deducciones dependientes y coherencia contractual. Debe preservar explícitamente el régimen internacional/Deel de Melkin Hernández, Daniela Ferreira y Andrés Carlosama, manteniendo sus bonos por KPI ICO sin aplicarles payroll estatutario Chile.

## Why This Task Exists

La auditoría `PAYROLL_COMPLIANCE_AUDIT_2026-05-01` concluyó que Payroll Chile no debe aprobarse/exportarse como legalmente confiable hasta corregir fórmulas estructurales. Staging muestra abril 2026 en estado `calculated` con readiness `ready: true`, pero existen entries de honorarios con retención SII desactualizada y campos previsionales de trabajador dependiente. Además, el código tiene el split de Seguro de Cesantía `plazo_fijo` invertido y no aplica de forma visible topes imponibles.

## Goal

- Corregir el motor de cálculo para Chile dependiente, honorarios y costos empleador con reglas auditables.
- Evitar que honorarios mezclen retención SII con AFP/salud/cesantía/SIS/mutual/IUSC.
- Preservar internacionales/Deel como internacionales: Melkin, Daniela y Andrés no deben pasar por deducciones Chile, pero sí mantener KPI ICO para bonos variables.
- Agregar tests e invariantes para que el sistema falle cerrado ante contratos incoherentes o bases legales faltantes.
- Recalcular/reliquidar abril 2026 en staging con evidencia antes de permitir aprobación/export.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`

Reglas obligatorias:

- Payroll sigue siendo owner de `compensation_versions`, `payroll_periods`, `payroll_entries` y `payroll_bonus_config`.
- KPI de bonos se consume desde ICO Engine/BigQuery; nunca calcular métricas inline.
- No convertir trabajadores internacionales/Deel en payroll Chile por accidente.
- Para Melkin Hernández, Daniela Ferreira y Andrés Carlosama: `payRegime = international` / `payrollVia = deel` se preserva salvo decisión humana documentada fuera de esta task.
- Honorarios no puede coexistir con deducciones de trabajador dependiente.
- Toda query con datos tenant-scoped debe filtrar por `space_id` cuando el modelo lo expone directamente; las tablas actuales de `greenhouse_payroll` no tienen `space_id`, por lo que el aislamiento debe resolverse vía joins/scope con `greenhouse_core.members` o documentarse como deuda de schema si se requiere tenant column nativa.
- Usar `import { query, getDb, withTransaction } from '@/lib/db'` o helpers existentes; no crear `new Pool()`.
- Si se cambian cálculos oficiales, preservar auditoría/reliquidación; no mutar silenciosamente períodos exportados.

## Normative Docs

- `docs/audits/payroll/PAYROLL_COMPLIANCE_AUDIT_2026-05-01.md`
- `docs/audits/payroll/README.md`
- `.codex/skills/greenhouse-payroll-auditor/SKILL.md`
- `.codex/skills/greenhouse-payroll-auditor/references/chile-payroll-law.md`
- `.codex/skills/greenhouse-payroll-auditor/references/greenhouse-payroll-runtime.md`
- `.codex/skills/greenhouse-payroll-auditor/references/international-remote-payroll.md`
- `docs/documentation/hr/periodos-de-nomina.md`
- `docs/manual-de-uso/hr/periodos-de-nomina.md`

## Dependencies & Impact

### Depends on

- `docs/audits/payroll/PAYROLL_COMPLIANCE_AUDIT_2026-05-01.md`
- `src/types/hr-contracts.ts`
- `src/types/payroll.ts`
- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/calculate-chile-deductions.ts`
- `src/lib/payroll/calculate-honorarios.ts`
- `src/lib/payroll/chile-previsional-helpers.ts`
- `src/lib/payroll/compute-chile-tax.ts`
- `src/lib/payroll/compensation-requirements.ts`
- `src/lib/payroll/payroll-readiness.ts`
- `src/lib/payroll/tax-table-version.ts`
- `src/lib/payroll/previred-sync.ts`
- `src/lib/payroll/postgres-store.ts`

### Blocks / Impacts

- `TASK-730` Payroll E2E Smoke Lane debe cubrir estas invariantes después del fix.
- `TASK-731` Payroll Pre-Close Validator debe poder elevar estos errores como blockers.
- `TASK-732` Payroll ICO Safety Gate debe preservar KPI ICO para internacionales con bonos.
- Finance payroll-linked expenses pueden cambiar al reliquidar/recalcular entries.
- Manuales/docs HR deben actualizarse si cambia copy o flujo visible.

### Files owned

- `src/types/hr-contracts.ts`
- `src/types/payroll.ts`
- `src/lib/payroll/calculate-payroll.ts`
- `src/lib/payroll/calculate-chile-deductions.ts`
- `src/lib/payroll/calculate-honorarios.ts`
- `src/lib/payroll/chile-previsional-helpers.ts`
- `src/lib/payroll/compute-chile-tax.ts`
- `src/lib/payroll/compensation-requirements.ts`
- `src/lib/payroll/payroll-readiness.ts`
- `src/lib/payroll/recalculate-entry.ts`
- `src/lib/payroll/reverse-payroll.ts`
- `src/lib/payroll/payroll-entry-explain.ts`
- `src/lib/payroll/*test.ts`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/documentation/hr/periodos-de-nomina.md`
- `docs/manual-de-uso/hr/periodos-de-nomina.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- Skill invocable `$greenhouse-payroll-auditor` con referencias de ley/runtime:
  - `.codex/skills/greenhouse-payroll-auditor/SKILL.md`
- Auditoría fuente:
  - `docs/audits/payroll/PAYROLL_COMPLIANCE_AUDIT_2026-05-01.md`
- Runtime principal de cálculo:
  - `src/lib/payroll/calculate-payroll.ts`
  - `src/lib/payroll/calculate-chile-deductions.ts`
  - `src/lib/payroll/calculate-honorarios.ts`
  - `src/lib/payroll/chile-previsional-helpers.ts`
- Readiness separa KPI/attendance/tax table por compensación:
  - `src/lib/payroll/compensation-requirements.ts`

### Gap

- `SII_RETENTION_RATES[2026]` está desactualizado respecto a SII.
- Seguro de Cesantía `plazo_fijo` está modelado como descuento trabajador 3% y empleador 0%, contrario a AFC/SP.
- Honorarios calculados en staging aparecen mezclando retención SII con deducciones dependientes.
- Topes imponibles AFP/salud/cesantía/SIS/mutual existen como helpers pero no se aplican claramente en la fórmula visible.
- Gratificación legal se calcula sobre `baseSalary`, no sobre una base elegible documentada.
- La coherencia contractual no bloquea combinaciones riesgosas o contradictorias.
- Abril 2026 debe ser recalculado/reliquidado en staging con evidencia antes de aprobación/export.
- `docs/architecture/schema-snapshot-baseline.sql` no refleja completamente el DDL runtime vigente de Payroll para contract types ampliados y reliquidación; usarlo como referencia histórica junto con `scripts/setup-postgres-payroll.sql`, migraciones y `src/types/db.d.ts`.
- Si abril 2026 sigue en `calculated`, la corrección operativa esperada es recalculo controlado. Si pasa a `exported`, usar reapertura/reliquidación formal.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Statutory Rate Foundation

- Corregir retención honorarios 2026 contra SII.
- Separar tasas de Seguro de Cesantía trabajador vs empleador por tipo de contrato.
- Modelar tasas como helpers trazables por período, no como constantes opacas repartidas.
- Agregar tests unitarios para 2024-2028 honorarios y para `indefinido`/`plazo_fijo` cesantía.

### Slice 2 — Chile Dependent Calculation Bases

- Aplicar topes imponibles separados para AFP/salud/SIS/mutual y cesantía usando UF del período.
- Separar base imponible, base capped previsional, base capped cesantía y base tributable.
- Persistir o exponer en explanation las bases/topes usados para auditoría.
- Revisar APV/Isapre voluntaria para que el cálculo tributario no sobre-deduzca montos no aceptados legalmente.

### Slice 3 — Honorarios Hard Boundary

- Garantizar por helper y tests que `contractType = honorarios` nunca materializa AFP, salud, cesantía, SIS, mutual ni IUSC de trabajador dependiente.
- Asegurar que `payroll-readiness` no pida tax table Chile para honorarios.
- Reprobar staging para confirmar que Humberly y Luis dejan de mezclar regímenes después del recalculo/reliquidación.

### Slice 4 — International/Deel Guardrails

- Preservar Melkin Hernández, Daniela Ferreira y Andrés Carlosama como internacionales/Deel.
- Agregar invariant tests: `payRegime = international` o `payrollVia = deel` produce `gross = net` operacional sin deducciones Chile.
- Mantener KPI ICO obligatorio si `bonusOtdMax > 0` o `bonusRpaMax > 0`, aunque el trabajador sea internacional.
- Detectar, sin auto-corregir, combinaciones sospechosas como `contractType = indefinido` + `payrollVia = deel`.

### Slice 5 — Contract Coherence Validator

- Crear validador compartido de coherencia de compensaciones.
- Distinguir blockers legales de warnings operacionales.
- Integrar el validador en create/update compensation, readiness y preflight si aplica.
- No bloquear datos legacy sin un path de remediation explícito; exponerlos como warnings o blockers según severidad.

### Slice 6 — Staging Remediation And Documentation

- Recalcular/reliquidar abril 2026 en staging después del fix usando flujo auditable.
- Verificar entries de Humberly, Luis, Valentina, Melkin, Daniela y Andrés.
- Actualizar arquitectura, documentación funcional y manual de uso si cambia el flujo o copy visible.
- Actualizar auditoría o crear refresh si los hallazgos quedan cerrados.

## Out of Scope

- No convertir Deel/internacionales a payroll Chile.
- No resolver compliance local de cada país para contractors/EOR fuera de Chile.
- No cambiar contratos reales de personas sin decisión humana.
- No implementar TASK-732 completo de KPI provenance; solo preservar el gating actual de KPI ICO.
- No rediseñar UI de tablas Payroll; eso vive en `TASK-743`.
- No aprobar/exportar períodos productivos como parte de esta task sin autorización humana explícita.

## Detailed Spec

### Required source-of-truth behavior

Honorarios:

- Fórmula base:
  - `gross = baseSalary + fixedBonus + modeledHonorariosBonuses`
  - `siiRetention = gross * retentionRateForYearOrPeriod`
  - `net = gross - siiRetention`
- Campos dependientes Chile deben quedar `null` o `0` según contrato de API, pero nunca coexistir conceptualmente:
  - AFP
  - salud
  - cesantía trabajador/empleador
  - SIS
  - mutual
  - IUSC

Chile dependiente:

- Fórmula debe distinguir:
  - `imponibleBase`
  - `pensionHealthAccidentBase`
  - `cesantiaBase`
  - `taxableBase`
- `plazo_fijo`:
  - trabajador cesantía = `0`
  - empleador cesantía = `0.03`
- `indefinido`:
  - trabajador cesantía = `0.006`
  - empleador cesantía = `0.024`

Internacional/Deel:

- Melkin Hernández, Daniela Ferreira y Andrés Carlosama son internacionales.
- No aplicar AFP, salud, cesantía, SIS, mutual, IUSC ni retención honorarios Chile.
- Mantener `kpiDataSource = ico` cuando existe exposición a bono variable.
- `deelContractId` faltante en internacional debe ser warning/operational data quality, no trigger para chilenizar la entry.

### Runtime investigation required before coding

El agente debe confirmar por qué staging produjo entries honorarios con deducciones dependientes:

- deployment SHA vs branch actual
- si entries vienen de cálculo anterior y no del código local actual
- si existe otro path (`recalculate-entry`, reverse quote, persistence, explain/export) que reintroduce campos
- si la API de entries está mezclando fields legacy desde DB

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `getSiiRetentionRate(2026)` o su reemplazo retorna `0.1525` y queda cubierto por tests.
- [x] Seguro de Cesantía calcula trabajador/empleador correctamente para `indefinido` y `plazo_fijo`.
- [x] Cálculo Chile dependiente aplica topes imponibles por base separada cuando corresponde.
- [x] `contractType = honorarios` nunca materializa deducciones dependientes en `PayrollEntry`.
- [x] Melkin Hernández, Daniela Ferreira y Andrés Carlosama permanecen internacionales/Deel en staging y no reciben deducciones Chile.
- [x] Internacionales con bonos OTD/RPA siguen bloqueados si falta KPI ICO y calculan bono desde `kpiDataSource = ico` cuando existe.
- [x] Abril 2026 en staging se recalcula/reliquida con entries coherentes antes de aprobación/export.
- [x] Readiness/preflight detecta blockers legales relevantes y no devuelve `ready: true` si una entry calculada combina regímenes incompatibles.
- [x] Docs de arquitectura/documentación/manual quedan actualizados si cambian reglas visibles.

## Verification

- `pnpm vitest run src/lib/payroll` — OK, 38 files / 243 tests.
- `pnpm exec eslint src/lib/payroll src/types/payroll.ts src/types/hr-contracts.ts` — OK.
- `pnpm exec tsc --noEmit --pretty false` — OK.
- `pnpm build` — OK.
- `pnpm lint` — OK.
- `pnpm test:coverage` — OK, 495 files / 2706 tests passed / 5 skipped.
- `rg -n "new Pool\\(" src -g "*.{ts,tsx}"` — no new `Pool`; only canonical `src/lib/postgres/client.ts` plus pre-existing tests.
- `pnpm pg:doctor` — OK, runtime role healthy via CLI-safe doctor.
- `pnpm pg:connect:migrate` — OK, no migrations pending; regenerated `src/types/db.d.ts` with no diff.
- Vercel status for commit `418d3c9a` — success, deployment completed.
- `pnpm staging:request POST /api/hr/payroll/periods/2026-04/calculate '{}' --pretty` — OK, recalculated staging April 2026 at `2026-05-01T10:22:26.440Z`.
- `pnpm staging:request /api/hr/payroll/periods/2026-04/readiness --pretty` — OK, `ready: true`, no blockers, one expected warning for `julio-reyes` without compensation.
- `pnpm staging:request /api/hr/payroll/periods/2026-04/entries --pretty` — OK:
  - Humberly Henriquez: `contractTypeSnapshot=honorarios`, `siiRetentionRate=0.1525`, no Chile dependent deductions.
  - Luis Reyes: `contractTypeSnapshot=honorarios`, `siiRetentionRate=0.1525`, no Chile dependent deductions.
  - Valentina Hoyos: `contractTypeSnapshot=indefinido`, Chile dependent calculation with statutory deductions.
  - Melkin Hernandez, Daniela Ferreira, Andres Carlosama: `payRegime=international`, `payrollVia=deel`, `kpiDataSource=ico`, no Chile dependent deductions.
- `pnpm test:e2e:setup` / Playwright manual browser were not rerun in this closure slice because the GitHub Chromium smoke suite for `418d3c9a` completed successfully and staging API verification exercised the exact April 2026 Payroll state.

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [x] `docs/audits/payroll/PAYROLL_COMPLIANCE_AUDIT_2026-05-01.md` quedo referenciado con el estado post-fix o se creó refresh de auditoría
- [x] Se documentó explícitamente si abril 2026 requiere reliquidación, recalculo o reapertura formal

## Follow-ups

- `TASK-731` debe incorporar los blockers nuevos en el preflight si no queda cubierto en esta task.
- `TASK-730` debe agregar smoke/assertions de honorarios, Chile dependiente e internacional/Deel.
- Evaluar task futura para compliance internacional por país si Greenhouse decide internalizar cálculo fuera de Deel.

## Open Questions

- ¿La gratificación legal de Efeonce debe considerar solo sueldo base por acuerdo contractual explícito o remuneración mensual imponible elegible completa?
- ¿Se debe modelar `obra/faena` como `contractType` separado para Seguro de Cesantía?
- Resuelta para abril 2026: como el período estaba `calculated` y no `exported`, se aplicó recalculo controlado en staging. Si el período llega a `exported` en otro entorno, corresponde reapertura/reliquidación formal, no mutación silenciosa.

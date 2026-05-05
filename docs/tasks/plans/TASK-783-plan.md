# Plan — TASK-783 Payroll Final Settlement Component Policy + Overlap Hardening

## Discovery summary

- Task tomada en `develop` por instruccion explicita del usuario; no hay PR abierto ni branch activa para `TASK-783`.
- `TASK-784` ya esta completa y `src/lib/payroll/final-settlement/document-store.ts` consume `readFinalSettlementSnapshot`, por lo que el bloqueo original queda resuelto.
- `schema-snapshot-baseline.sql` esta stale para TASK-760/761/762; source of truth operativo para estos aggregates es `migrations/` + `src/types/db.d.ts` + runtime Cloud SQL verificado.
- Runtime Valentina verificado en Cloud SQL: caso `executed`, settlement v1 `approved`, `gross_total=121963`, `deduction_total=162475`, `net_payable=-40512`.
- Breakdown vivo muestra `proportional_vacation` como `taxable_imponible` y `statutory_deductions.health=162474.77`, aunque el payroll mensual abril esta marcado `exported`.
- Fuentes oficiales revalidadas: DT confirma que en renuncia corresponde dias trabajados y feriado proporcional; DT define calculo de feriado proporcional; SII confirma vacaciones indemnizadas en finiquito como ingreso no renta; AFC confirma que Seguro de Cesantia se financia sobre remuneracion imponible.

## Open questions resolved

- Policy/ledger storage V1: usar JSONB versionado en `breakdown_json`, `readiness_json` y `source_snapshot_json`, no columnas/tablas nuevas en el primer corte. Rationale: evita backfill fragil sobre settlements ya aprobados/cancelados y cumple trazabilidad/documento sin migracion riesgosa.
- `proportional_vacation`: tratar como `legal_indemnity`, `non_income`, `not_contribution_base`, `never_duplicate_monthly`. Rationale: alinea DT/SII y evita AFP/salud/AFC/IUSC sobre feriado indemnizado.
- Deducciones legales: calcular solo sobre base imponible pendiente por componentes con policy `contribution_base`, nunca sobre componentes cubiertos por payroll mensual exportado. Rationale: corrige causa raiz sin hardcodear Valentina.
- Neto negativo: bloquear aprobacion/emision salvo que existan lineas `authorized_deduction` con evidencia estructurada. Rationale: descuentos no autorizados no deben pasar como warning.
- Cutoff payroll posterior: reader defensivo excluye roster si existe offboarding `executed` con `last_working_day < periodStart`; al ejecutar se truncan versiones abiertas/futuras cuando sea transaccionalmente seguro. Rationale: `members.active` no es contrato de elegibilidad payroll.
- Honorarios/proveedores: no se crea `final_settlement` laboral; UI/documento proyectan `Cierre contractual` o `Cierre proveedor`. Rationale: evita simular relacion laboral y preserva frontera legal/regimen.

## Access model

- `routeGroups`: no cambia; `hr` sigue habilitando la surface broad.
- `views / authorizedViews`: no cambia; `equipo.offboarding` sigue siendo entrypoint visible.
- `entitlements`: no cambia en V1; se reutilizan `hr.offboarding_case`, `hr.final_settlement`, `hr.final_settlement_document`.
- `startup policy`: no cambia.
- Decision de diseño: TASK-783 endurece gates y proyeccion por lane dentro de la misma surface/capabilities existentes.

## Skills

- Todos los slices: `greenhouse-payroll-auditor` para invariantes de regimen, feriado proporcional, overlap, deducciones, honorarios y verificacion.
- UI/documento: `greenhouse-payroll-auditor` + contrato `DESIGN.md`; copy visible debe mantener lenguaje laboral/contractual separado.

## Subagent strategy

`fork` para discovery solamente, completado:

- Schema/runtime/tests payroll: encontro que policy/ledger puede vivir en JSONB y que el reader de roster es el punto canonico de cutoff.
- UI/document/mockup: confirmo gaps contra mockup aprobado y dependencia en policy/evidence antes de renderizar `Tratamiento`/`Evidencia`.

Execution sera secuencial por el agente principal para evitar conflictos en archivos acoplados.

## Execution order

1. Slice 1 — Policy contract JSONB
   - Modificar `src/lib/payroll/final-settlement/types.ts`.
   - Crear registry/helper en `src/lib/payroll/final-settlement/policies.ts`.
   - Extender tests de exhaustividad.

2. Slice 2 — Payroll overlap ledger
   - Crear `src/lib/payroll/final-settlement/overlap-ledger.ts`.
   - Reemplazar snapshot booleano en `store.ts`.
   - Tests para periodos exported/calculated/approved, entry inactive y montos cubiertos.

3. Slice 3 — Deduction engine hardening
   - Refactorizar `calculator.ts` para construir bases por policy.
   - Mantener `calculatePayrollTotals` solo como primitive para base imponible pendiente, no para feriado.
   - Regression Valentina-like.

4. Slice 4 — Approval/document guards
   - Endurecer `approveFinalSettlementForCase`.
   - Endurecer `buildDocumentReadiness`, `render`, `issue`.
   - Bloquear identidad trabajador incompleta para emision formal.

5. Slice 5 — Payroll roster cutoff
   - Modificar `pgGetApplicableCompensationVersionsForPeriod` y fallback BigQuery si sigue activo.
   - Truncar `compensation_versions.effective_to` en `transitionOffboardingCase` solo para versiones abiertas/futuras seguras.
   - Tests mayo excluido / abril preservado.

6. Slice 6 — Honorarios/provider boundary
   - Runtime/UI helpers de lane presentation.
   - Bloquear CTA/calculo laboral para `honorarios`, `contractor`, `eor`, `deel`.
   - Tests Luis-like y Deel-like.

7. Slice 7 — UI evidence + document mockup contract
   - Refactor `HrOffboardingView.tsx` para lane labels, blockers accionables y summary overlap.
   - Refactor `document-pdf.tsx` para logo/entidad/RUTs/header/footer/estado/tabla `Concepto-Tratamiento-Evidencia-Monto`.
   - Tests UI + PDF text contract.

8. Slice 8 — Valentina remediation
   - Cancelar settlement aprobado incorrecto por API/store canonico con reason auditado.
   - Recalcular con motor corregido.
   - Verificar neto positivo y exclusion mayo.

9. Slice 9 — Docs/verificacion/cierre
   - Actualizar arquitectura payroll, docs funcionales, manual, changelog, Handoff y task lifecycle.
   - Ejecutar validaciones canonicas.

## Files to create

- `src/lib/payroll/final-settlement/policies.ts`
- `src/lib/payroll/final-settlement/overlap-ledger.ts`
- Tests focales junto a `calculator.test.ts` y/o nuevos `policies.test.ts`, `overlap-ledger.test.ts`.

## Files to modify

- `src/lib/payroll/final-settlement/types.ts` — contratos policy/evidence/ledger.
- `src/lib/payroll/final-settlement/calculator.ts` — bases por componente, feriado no renta/no imponible.
- `src/lib/payroll/final-settlement/store.ts` — reader ledger y persistencia JSONB.
- `src/lib/payroll/final-settlement/document-store.ts` — gates de identidad, neto, policy, cancelled/superseded.
- `src/lib/payroll/final-settlement/document-pdf.tsx` — contrato visual mockup.
- `src/lib/payroll/postgres-store.ts` y `src/lib/payroll/get-compensation.ts` — cutoff roster.
- `src/lib/workforce/offboarding/store.ts` — cutoff transaccional al ejecutar.
- `src/views/greenhouse/hr-core/offboarding/HrOffboardingView.tsx` — lane-aware UI y evidence.
- Docs vivas de HR Payroll/finiquitos/changelog/Handoff/task.

## Risk flags

- Payroll/finiquito es P0 alto rigor; checkpoint humano requerido antes de runtime.
- No agregar DB constraints de neto negativo en el primer corte para no romper historicos; guard en runtime + tests primero.
- Remediacion Valentina toca datos vivos y debe ejecutarse despues de tests y con razon auditada.
- Worktree trae cambios ajenos en TASK-785/TASK-786/mockups; mantener scope aislado.

## Verification

- `pnpm pg:doctor`
- `pnpm exec vitest run src/lib/payroll/final-settlement src/lib/workforce/offboarding src/views/greenhouse/hr-core/offboarding`
- `pnpm exec eslint src/lib/payroll/final-settlement src/lib/workforce/offboarding src/views/greenhouse/hr-core/offboarding`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm design:lint` si cambia UI/PDF contract visible
- `pnpm test` y `pnpm build` al cierre
- Runtime Valentina via API/store canonico de cancelacion/recalculo

## Checkpoint

`P0` + `Effort Alto` => checkpoint humano obligatorio antes de FASE 5.

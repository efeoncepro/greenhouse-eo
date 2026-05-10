# TASK-856 — Previred Preflight, Fixture Harness & Mapping Hardening

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio-Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `TASK-812`
- Branch: `task/TASK-856-previred-preflight-fixtures-mapping-hardening`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Convierte el aprendizaje operativo de TASK-812 en guardrails permanentes para Previred: preflight antes de descargar, fixture harness con CSV reales de errores/advertencias/aceptado, mapping declarativo de los 105 campos y signal de readiness/drift. El objetivo es que Greenhouse detecte problemas de planilla antes del upload manual y no vuelva a depender de ciclos iterativos contra previred.com.

## Why This Task Exists

TASK-812 logro que el archivo Previred de abril 2026 fuera aceptado, pero el proceso revelo un riesgo sistemico: Previred valida en cascada y muestra nuevas advertencias solo cuando los blockers anteriores desaparecen. Sin un preflight interno, fixtures reales y mapping versionado, cualquier cambio futuro en Payroll, Person 360, tasas previsionales o perfiles legales puede reabrir el ciclo de "descargar, subir, corregir, repetir".

La solucion robusta no es sumar mas casos especiales al exportador. La solucion es institucionalizar Previred como contrato verificable: readiness deterministico, evidencia de validador, mapping auditable y observabilidad.

## Goal

- Prevenir descargas Previred que ya se sabe que fallaran por datos, tasas, perfil legal o mapping incompleto.
- Convertir CSV reales de Previred en fixtures de regresion que protejan el contrato de 105 campos.
- Versionar el mapping campo-a-fuente/formula para reducir deuda cognitiva y hacer reviews seguros.
- Registrar accepted/warning/error states como evidencia auditada sin mutar `payroll_entries`.

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
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/audits/payroll/PREVIRED_VALIDATOR_CASCADE_AUDIT_2026-05-10.md`

Reglas obligatorias:

- Previred planilla es una proyeccion regulatoria sobre entries cerradas + snapshots periodizados; no es copia del recibo.
- `payroll_entries` no se mutan para silenciar Previred. Si el periodo cerrado esta mal, se usa reapertura/reliquidacion formal; si el archivo requiere otra representacion, se corrige la proyeccion compliance.
- Person 360 (`members.identity_profile_id` + Person Legal Profile) es el ancla de identidad; `chile_previred_worker_profiles` guarda codigos Previred declarativos.
- No inferir sexo, nacionalidad, Isapre, mutualidad ni movimientos desde nombres, RUT, asistencia o strings operativos.
- Todo nuevo check debe fallar cerrado con evidencia accionable y sin exponer datos sensibles en logs.
- Reutilizar `src/lib/payroll/compliance-exports/*`, `src/lib/payroll/data-quality/*`, `src/lib/reliability/*` y el event catalog vigente antes de crear primitives nuevas.

## Normative Docs

- `docs/documentation/hr/payroll-compliance-exports-chile.md`
- `docs/tasks/in-progress/TASK-812-compliance-exports-chile-previred-planilla-lre-libro.md`
- `docs/tasks/to-do/TASK-731-payroll-pre-close-validator.md`
- `.codex/skills/greenhouse-payroll-auditor/SKILL.md`

## Dependencies & Impact

### Depends on

- `TASK-812` — V1 de exports Previred/LRE y aprendizaje real de upload aceptado.
- `TASK-784` — Person Legal Profile / RUT canonico.
- `greenhouse_payroll.compliance_export_artifacts`
- `greenhouse_payroll.chile_previred_worker_profiles`
- `greenhouse_payroll.chile_afp_rates`
- `greenhouse_payroll.chile_previred_indicators`

### Blocks / Impacts

- Cierre mensual Payroll Chile con menor riesgo de upload manual fallido.
- Futuras extensiones de movimientos de personal y mutualidades.
- `TASK-731` Payroll Pre-Close Validator, que puede consumir el readiness Previred como check especializado.
- Reliability subsystem "Payroll Data Quality" y signal `payroll.compliance_exports.artifact_drift`.

### Files owned

- `src/lib/payroll/compliance-exports/previred.ts`
- `src/lib/payroll/compliance-exports/store.ts`
- `src/lib/payroll/compliance-exports/types.ts`
- `src/lib/payroll/compliance-exports/previred.test.ts`
- `src/lib/payroll/data-quality/*`
- `src/lib/reliability/queries/payroll-compliance-export-drift.ts`
- `docs/audits/payroll/PREVIRED_VALIDATOR_CASCADE_AUDIT_2026-05-10.md`
- `docs/documentation/hr/payroll-compliance-exports-chile.md`
- `docs/tasks/in-progress/TASK-812-compliance-exports-chile-previred-planilla-lre-libro.md`

## Current Repo State

### Already exists

- Previred export endpoint `GET /api/hr/payroll/periods/:periodId/export/previred`.
- LRE export endpoint `GET /api/hr/payroll/periods/:periodId/export/lre`.
- Compliance artifact registry `greenhouse_payroll.compliance_export_artifacts`.
- Declarative worker profile table `greenhouse_payroll.chile_previred_worker_profiles`.
- Previred generator in `src/lib/payroll/compliance-exports/previred.ts`.
- Unit tests for accepted April 2026 Valentina projection.
- Audit document with final accepted values from Previred.
- Reliability signal `payroll.compliance_exports.artifact_drift`.

### Gap

- No existe preflight Previred especifico antes de descargar el archivo.
- Los CSV reales de Previred no estan transformados en fixtures de regresion.
- El mapping de 105 campos vive principalmente en codigo; falta contrato declarativo campo/fuente/formula.
- No existe estado formal `passed_clean` / `passed_with_warnings` / `failed_blocking` para resultados Previred observados.
- Movimientos de personal y mutualidades estan documentados como follow-up, pero no hay readiness que bloquee o degrade explicitamente cuando se necesiten.

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

### Slice 1 — Previred Readiness Preflight

- Crear helper server-only `getPreviredExportReadiness(periodId)` o equivalente bajo `src/lib/payroll/compliance-exports/`.
- Reusar el snapshot builder existente de compliance exports.
- Retornar checks estructurados `ok|warn|critical` para:
  - periodo cerrado/exportable;
  - roster Chile dependiente interno;
  - RUT Person 360 verificado;
  - worker profile Previred completo;
  - AFP code + tasa periodizada;
  - SIS + IMM del periodo;
  - jornada;
  - Isapre/Fonasa split;
  - ISL/mutual support;
  - AFC split;
  - movimientos de personal no modelados.
- Integrar este readiness al endpoint de descarga para fallar cerrado cuando existan blockers criticos.

### Slice 2 — Fixture Harness from Previred Validator Evidence

- Crear carpeta de fixtures en `src/lib/payroll/compliance-exports/__fixtures__/previred/` o ruta equivalente.
- Convertir los CSV reales de Previred del incidente TASK-812 en fixtures sanitizados:
  - structural/person blockers;
  - movement code blocker;
  - formula/rate blockers;
  - warnings-only;
  - accepted-state.
- Agregar parser de CSV Previred validator evidence para tests, no para runtime productivo.
- Agregar tests que aseguren que cada fixture se clasifica correctamente y que el accepted-state conserva los 105 campos esperados.

### Slice 3 — Declarative 105-Field Mapping Contract

- Extraer un mapping declarativo versionado para la planilla Previred:
  - numero de campo;
  - nombre funcional;
  - fuente Greenhouse;
  - formula/ref helper;
  - required/optional/conditional;
  - fixture que lo cubre.
- Mantener el generador como codigo puro, pero hacer que tests verifiquen cobertura del mapping contra el row de 105 campos.
- Documentar campos no soportados aun como `unsupported_explicit_zero` solo cuando exista decision y rationale.

### Slice 4 — Artifact Validation State & Audit Metadata

- Extender metadata de artefacto o totals JSON para distinguir:
  - `passed_clean`;
  - `passed_with_warnings`;
  - `failed_blocking`;
  - `not_uploaded`.
- Registrar evidencia de upload manual cuando el operador la provea, sin intentar automatizar Previred.
- Mantener outbox event versionado/backward-compatible si se amplia payload.

### Slice 5 — Reliability Signal & Pre-Close Integration

- Agregar o extender signal para detectar periodos exportables con Previred readiness critical/warn.
- Integrar el check como input de `TASK-731` si esa task ya existe/avanza; si no, dejar helper consumible.
- Definir steady state:
  - `ok`: todos los periodos aprobados/exportables tienen readiness ok o warnings aceptados;
  - `warning`: faltan datos no bloqueantes o warnings conocidas;
  - `error`: blockers criticos antes de cierre/export.

### Slice 6 — Docs, Manual & Skill Update

- Actualizar `docs/documentation/hr/payroll-compliance-exports-chile.md`.
- Actualizar la auditoria o crear delta fechado si emergen nuevas reglas.
- Actualizar `.codex/skills/greenhouse-payroll-auditor/SKILL.md` con el nuevo preflight/mapping workflow.
- Actualizar `Handoff.md` con decisiones y validaciones.

## Out of Scope

- Automatizar upload directo a previred.com.
- Crear API oficial Previred si no existe convenio/documentacion formal.
- Recalcular o mutar `payroll_entries` cerradas.
- Implementar todos los movimientos de personal. Esta task debe modelar readiness/contrato; la implementacion completa de movimientos puede derivarse.
- Implementar mutualidades completas si no existe profile/codigo/tasa soportada.
- Cambiar LRE salvo que el mapping compartido obligue a ajustar contrato documental.

## Detailed Spec

### Readiness Shape

El helper debe devolver un contrato estable similar a:

```ts
type PreviredReadinessStatus = 'ok' | 'warn' | 'critical'

interface PreviredReadinessCheck {
  key: string
  status: PreviredReadinessStatus
  evidence: string
  affectedEntryIds?: string[]
  affectedMemberIds?: string[]
  remediation?: string
}
```

La descarga Previred solo puede emitir archivo cuando no existan checks `critical`.

### Mapping Contract

El mapping de campos debe permitir responder rapidamente:

- que campo fallo en Previred;
- que fuente Greenhouse lo alimenta;
- que formula se uso;
- que fixture lo protege;
- si el cero/blanco es intencional, temporal o unsupported.

### Validator Evidence

Los fixtures derivados de CSV Previred deben sanitizar PII cuando sea razonable, pero conservar:

- tipo (`error`/`warning`);
- descripcion del validador;
- dato enviado;
- dato esperado;
- campo implicado cuando pueda mapearse;
- decision Greenhouse.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe helper de readiness Previred reutilizable y testeado.
- [ ] El endpoint de descarga Previred falla cerrado con blockers criticos antes de emitir archivo.
- [ ] CSV reales/sanitizados de Previred quedan convertidos en fixtures de regresion.
- [ ] El accepted-state de Valentina `2026-04` queda cubierto por fixture/test y conserva 105 campos.
- [ ] Existe mapping declarativo versionado para los 105 campos Previred.
- [ ] Los campos intencionalmente cero/blanco tienen rationale auditable.
- [ ] Artifact metadata distingue clean/warnings/blocking/not_uploaded o documenta por que se difiere.
- [ ] Reliability/pre-close puede detectar readiness Previred degradada antes del cierre.
- [ ] Docs y skill Payroll quedan actualizadas con el nuevo workflow.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm vitest run src/lib/payroll/compliance-exports`
- `pnpm vitest run src/lib/payroll/data-quality src/lib/reliability/queries/payroll-compliance-export-drift.test.ts`
- `pnpm staging:request /api/hr/payroll/periods/2026-04/export/previred`
- Validacion manual: descargar archivo desde staging/dev y confirmar que el preflight muestra `ok` o warnings aceptadas antes del upload manual.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/documentation/hr/payroll-compliance-exports-chile.md` quedo actualizado
- [ ] `.codex/skills/greenhouse-payroll-auditor/SKILL.md` quedo actualizado si cambio el workflow de auditoria

## Follow-ups

- Modelar movimientos de personal Previred como tabla/profile periodizado si el readiness detecta casos reales.
- Modelar mutualidades soportadas con codigos/tasas periodizadas si Efeonce deja de operar via ISL.
- Evaluar una UI de "Previred readiness" en el periodo Payroll si el preflight se vuelve parte del flujo mensual.

## Open Questions

- Debe resolverse durante Discovery si el estado `passed_with_warnings` vive en `validation_status` formal de `compliance_export_artifacts` o en `totals_json`/metadata para evitar migracion innecesaria.
- Debe resolverse durante Discovery si los fixtures CSV reales se versionan completos sanitizados o como estructura normalizada JSON.

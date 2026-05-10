# TASK-812 — Compliance Exports Chile: Previred + LRE versioned projection contracts

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Implementacion V1 en curso`
- Rank: `TBD`
- Domain: `hr / payroll / compliance`
- Blocked by:
  - `TASK-707a` — hard blocker para paridad completa contra `payment_order` social_security canonico. V1 degrada explicitamente a paridad contra `payroll_entries` cerradas + `calculatePreviredEntryBreakdown`.
- Resolved dependency:
  - `TASK-784` — `complete`; provee Person Legal Profile + RUT canonico verificado.
- Branch: `develop` (excepcion solicitada por usuario: "mantente en develop")
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Greenhouse ya calcula y persiste payroll Chile dependiente, pero aun no genera artefactos oficiales de cumplimiento para carga externa en Previred y Direccion del Trabajo. Esta task agrega una capa de **proyecciones compliance versionadas** sobre payroll cerrado: no recalcula montos, no reemplaza el source of truth de payroll, no mezcla honorarios/international, y preserva evidencia de spec externa, source snapshot, hash, totales y validaciones.

Correccion arquitectonica 2026-05-09: la version anterior de esta task asumio que Previred era `TXT posicional ASCII Latin-1` y que LRE era `XML + XSD`. Esa premisa no debe implementarse. Las fuentes publicas vigentes revisadas indican:

- Previred publica formato de largo variable por separador `;` para envio de nominas de trabajadores.
- Direccion del Trabajo declara LRE por carga masiva como archivo `CSV` o `TXT` delimitado por punto y coma `;`, con headers y estructura definida por el Manual de usuarios LRE.

Por lo tanto, TASK-812 queda reorientada: **primero Discovery oficial + ADR + contratos de artefacto; despues generadores basados en la evidencia versionada**.

## Why This Task Exists

Hoy el cierre mensual de payroll Chile depende de exports operativos internos y de herramientas externas para producir archivos de carga. Eso crea riesgos:

1. Dependencia de terceros para una proyeccion deterministica de datos que ya viven en Greenhouse.
2. Drift entre payroll calculado, pago social security y archivo declarado.
3. Compliance trail fragmentado: el artefacto legal final no queda bajo control auditable de Greenhouse.
4. Riesgo de declarar formatos incorrectos ante Previred/DT si se codifica desde memoria o snippets stale.

La solucion robusta es una capa de exports compliance **evidence-first**: cada formato soportado nace de una version oficial congelada, se prueba contra fixtures, se reconcilia contra payroll/payment orders y se almacena con metadatos de auditoria.

## Goal

- Operador descarga/genera artefactos Previred y LRE listos para carga manual, sin intermediario, solo despues de validar el formato oficial vigente.
- Cada export queda registrado como artefacto versionado con `specVersion`, `sourceSnapshotHash`, `sha256`, totales y validacion.
- Paridad financiera:
  - Previred: suma de cotizaciones previsionales exportadas coincide con `calculatePreviredEntryBreakdown.total` y, cuando `TASK-707a` este completa, con `payment_order.amount_clp` social_security.
  - LRE: totales imponibles/descuentos/aportes coinciden con `payroll_entries` cerradas para el periodo.
- Honorarios e international quedan excluidos explicitamente.
- Reliability signals cubren drift de artefactos emitidos contra payroll/payment order.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` — contrato canonico Payroll Chile y ADR "Chile Compliance Exports as Versioned Payroll Projections".
- `docs/architecture/DECISIONS_INDEX.md` — decision vigente sobre compliance exports.
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — frontera con `payment_order` social_security y settlement.
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md` — Payroll calcula/exporta obligaciones; Finance/Tesoreria paga.
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` — outbox events nuevos de generacion de artefactos.
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — registro de signals de drift.
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — capabilities finas de export compliance.
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` — endpoints HR lane.

Reglas obligatorias:

- **NUNCA** implementar un formato Previred/LRE desde supuestos no verificados. Slice 0 congela fuente oficial, version y mapping antes de codigo.
- **NUNCA** tratar el export como source of truth de payroll. El export es una proyeccion read-only sobre entries cerradas y snapshots canonicos.
- **NUNCA** recalcular cotizaciones dentro del generador. Usar `payroll_entries`, helpers canonicos y payment obligations existentes.
- **NUNCA** emitir archivo parcial cuando falta RUT verificado. Fuente unica = Person Legal Profile / identity documents de `TASK-784`.
- **NUNCA** mezclar honorarios ni international en Previred/LRE dependiente.
- **NUNCA** mapear codigos AFP/Isapre/FONASA o conceptos LRE inline en el generador. Mappings viven en tablas/registries declarativos versionados.
- **NUNCA** usar zeros silenciosos para datos legalmente relevantes. Si el motor no puede probar que un concepto es cero (por ejemplo Horas Extras), el export debe bloquear o exigir waiver/readiness explicito.
- **NUNCA** crear permisos solo como `views`. La surface visible usa view/menu cuando aplique; la accion de generar/descargar usa entitlement/capability fina.

## Normative Docs & External Evidence

- `docs/audits/payroll/PAYROLL_COMPLIANCE_AUDIT_2026-05-01.md` — auditoria payroll compliance reciente; usar como input, no como verdad vigente sin revalidar.
- `src/lib/finance/payment-obligations/calculate-previred-total.ts` — formula canonica del total Previred.
- `src/lib/payroll/receipt-presenter.ts` — `groupEntriesByRegime` para separar dependientes, honorarios e international.
- Fuente Previred actual a verificar en Slice 0: `https://www.previred.com/documents/FormatosArchivos/FormatoLargoVariablePorSeparador.pdf` o URL oficial vigente equivalente desde Previred.
- Fuente DT LRE actual a verificar en Slice 0:
  - `https://www.dt.gob.cl/portal/1626/w3-article-119843.html`
  - `https://www.dt.gob.cl/portal/1628/w3-article-119853.html`

## Dependencies & Impact

### Depends on

- **`TASK-707a`** — hard blocker para paridad contra `payment_order` social_security nuevo. Si se decide ejecutar TASK-812 antes de TASK-707a, el alcance debe degradar explicitamente a paridad contra `calculatePreviredEntryBreakdown` + payroll entries, y dejar payment order parity pendiente.
- **`TASK-784`** — complete; RUT canonico verificado.
- **`TASK-765`** — complete; settlement/payment order resilience.
- **`TASK-758`** — complete; regimen grouping canonico.
- Tablas `greenhouse_payroll.payroll_entries`, `greenhouse_payroll.chile_previred_indicators`, `greenhouse_payroll.chile_afp_rates`.

### Blocks / Impacts

- Cierre mensual Payroll Chile con artefactos compliance versionados dentro de Greenhouse.
- `TASK-414` — reopen policy debe poder leer si existen artefactos compliance emitidos/declarados.
- Follow-up DJ 1879 SII honorarios anual.
- Follow-up Horas Extras en motor payroll si el formato LRE vigente exige conceptos que hoy no estan modelados.

### Files owned

- `docs/compliance/previred/` — fuente oficial versionada, mapping y fixtures de formato Previred [crear].
- `docs/compliance/dt/` — fuente oficial versionada, manual/mapping/fixtures LRE [crear].
- `src/lib/payroll/exports/compliance-export-registry.ts` — registry de artefactos/spec versions [crear].
- `src/lib/payroll/exports/chile-previred-planilla.ts` — generador puro basado en spec versionada [crear].
- `src/lib/payroll/exports/chile-previred-planilla.test.ts` — tests formato/paridad/edge cases [crear].
- `src/lib/payroll/exports/chile-lre-libro.ts` — generador puro basado en formato oficial vigente [crear].
- `src/lib/payroll/exports/chile-lre-libro.test.ts` — tests formato/paridad/edge cases [crear].
- `src/lib/payroll/exports/previred-institution-codes.ts` — lookup declarativo [crear].
- `src/lib/payroll/exports/lre-concept-mapping.ts` — mapping declarativo [crear].
- `src/app/api/hr/payroll/periods/[periodId]/export/previred/route.ts` — endpoint [crear].
- `src/app/api/hr/payroll/periods/[periodId]/export/lre/route.ts` — endpoint [crear].
- `migrations/*_task-812-compliance-export-registry.sql` — registry + seeds declarativos [crear].
- `src/lib/reliability/queries/payroll-compliance-export-drift.ts` — signals de drift [crear].
- `src/lib/sync/event-catalog.ts` / event catalog docs — eventos `payroll.export.previred_generated` + `payroll.export.lre_generated` [modificar].
- `src/config/entitlements-catalog.ts` y runtime de capabilities/entitlements vigente — capabilities `hr.payroll.export_previred`, `hr.payroll.export_lre` [modificar].
- `src/views/greenhouse/hr/PayrollPeriodView.tsx` `[verificar]` — botones/acciones visibles [modificar].
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` — ADR + contrato canonico [modificar].
- `docs/documentation/hr/exports-compliance-chile.md` — doc funcional [crear].
- `docs/manual-de-uso/hr/exportar-previred-y-lre.md` — manual operador [crear].

## Current Repo State

### Already exists

- Calculo payroll Chile dependiente y columnas previsionales canonicas en `payroll_entries`.
- `calculatePreviredEntryBreakdown` para total Previred.
- Sync de tasas Previred / indicadores previsionales.
- Exports operativos Excel/CSV/PDF no oficiales.
- `groupEntriesByRegime` para separar chile_dependent, honorarios e international.
- Person Legal Profile/RUT canonico desde `TASK-784`.

### Gap

- No existe registry de artefactos compliance versionados.
- No existe generador Previred basado en spec oficial congelada.
- No existe generador LRE basado en manual DT vigente.
- No existen mappings declarativos Previred/LRE.
- No existe persistencia de `specVersion`, `sourceSnapshotHash`, `sha256`, validation result y totals.
- No existen capabilities granulares de export compliance.
- No existe reliability signal para drift de compliance exports.

### Runtime correction 2026-05-10 — Previred worker legal profile

Validacion real contra Previred detecto que el generador V1 no podia depender solo
de `payroll_entries`: Previred exige campos legales por trabajador que payroll no
calcula (`Sexo`, `Nacionalidad`, codigo exacto de salud/Isapre). La decision
canonica es agregar `greenhouse_payroll.chile_previred_worker_profiles`,
anclada a `identity_profile_id`, y bloquear el export cuando falten esos datos.

Rationale:

- No inferir sexo desde nombre visible.
- No inferir nacionalidad desde `CL_RUT`.
- No serializar strings operativos como `isapre` donde Previred exige codigos
  oficiales de Tabla N°16.
- Mantener Payroll como source of truth de montos y el perfil Previred como
  source of truth de codigos declarativos requeridos por el archivo externo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Official format discovery + ADR enforcement

Objetivo: impedir que Greenhouse codifique formatos compliance desde supuestos stale.

Entregables:

- Descargar o referenciar de forma versionada la fuente oficial vigente de Previred.
- Descargar o referenciar de forma versionada la fuente oficial vigente LRE/DT.
- Guardar evidencia en `docs/compliance/previred/` y `docs/compliance/dt/` con fecha de validacion.
- Documentar:
  - extension permitida;
  - encoding;
  - delimitador;
  - headers/no headers;
  - naming convention;
  - version de manual/spec;
  - campos obligatorios/condicionales;
  - reglas de rechazo conocidas.
- Confirmar si LRE vigente requiere CSV/TXT, XML/XSD u otro formato. No continuar a generador hasta resolverlo.
- Confirmar si Previred vigente requiere largo variable por separador, layout fijo, o multiples variantes.
- Si hay multiples variantes oficiales, elegir una V1 y documentar alternativas rechazadas.
- Actualizar ADR si la evidencia oficial contradice esta task.

### Slice 1 — Compliance export registry

Objetivo: persistir auditoria de artefactos emitidos sin volverlos source of truth.

Entregables:

- Migration `greenhouse_payroll.compliance_export_artifacts` o nombre equivalente con:
  - `period_id`, `space_id`, `export_kind` (`previred`, `lre`);
  - `spec_version`, `spec_source_url`, `validated_as_of`;
  - `asset_id` opcional o storage reference;
  - `source_snapshot_hash`;
  - `artifact_sha256`;
  - `record_count`;
  - `totals_json`;
  - `validation_status`, `validation_errors_json`;
  - `generated_by`, `generated_at`;
  - `declared_status` opcional para futuro (`generated`, `uploaded_by_operator`, `replaced`, `voided`).
- Helper server-only para registrar artefactos y prevenir mutacion destructiva.
- Eventos outbox versionados al generar artefacto.

### Slice 2 — Previred export V1

Objetivo: generar archivo Previred segun spec oficial vigente validada en Slice 0.

Entregables:

- Tabla/registry declarativo de codigos AFP/Isapre/FONASA con `source_spec_version`.
- Generador puro `generatePreviredPlanilla(periodId, specVersion)`.
- Filtrado solo a trabajadores Chile dependientes internos.
- RUT desde Person Legal Profile verificado.
- Exclusion assertiva de honorarios e international.
- Paridad contra `calculatePreviredEntryBreakdown.total`.
- Paridad contra `payment_order.amount_clp` social_security cuando `TASK-707a` este completa.
- Endpoint `GET /api/hr/payroll/periods/[periodId]/export/previred`.
- Capability fina `hr.payroll.export_previred`.
- UI con boton de descarga solo cuando el periodo este en estado permitido.
- Tests de formato, totales, AFP/health mappings, RUT faltante y exclusiones.

### Slice 3 — LRE export V1

Objetivo: generar LRE segun formato oficial DT vigente validado en Slice 0.

Entregables:

- Tabla/registry declarativo de conceptos LRE con `source_spec_version`.
- Mapping declarativo `payroll_entries -> lre_concept_codes`.
- Generador puro `generateLreLibro(periodId, specVersion)` con extension/encoding/delimitador definidos por la fuente oficial.
- Validaciones pre-emit segun manual vigente:
  - estructura;
  - columnas requeridas;
  - tipos de dato;
  - max length;
  - totales;
  - naming convention.
- Si la fuente vigente exige CSV/TXT, implementar parser/validator de lineas/headers; no usar XML/XSD.
- Si la fuente vigente prueba que XML/XSD aplica para otro flujo, documentar variante y no mezclarla con carga masiva DT.
- Endpoint `POST /api/hr/payroll/periods/[periodId]/export/lre`.
- Capability fina `hr.payroll.export_lre`.
- Asset privado para artefacto emitido.
- Tests de formato, paridad, licencias, ingreso/egreso parcial, finiquito cuando aplique y exclusiones.

### Slice 4 — Reliability, docs and operator surface

Objetivo: hacer observable el drift y operable el flujo.

Entregables:

- Signal `payroll.compliance_export.drift` o signals separados:
  - Previred export total vs payroll/payment order.
  - LRE export totals vs payroll entries.
- Subsystem `Payroll Compliance` o vinculo con subsystem existente.
- Doc funcional `docs/documentation/hr/exports-compliance-chile.md`.
- Manual operador `docs/manual-de-uso/hr/exportar-previred-y-lre.md`.
- `changelog.md` si cambia comportamiento operativo visible.
- `docs/tasks/README.md` y `TASK_ID_REGISTRY.md` sincronizados al cerrar.

## Out of Scope

- Upload programatico directo a Previred o DT.
- Rectificacion formal de periodos ya declarados.
- DJ 1879 SII honorarios anual.
- Recalculo de payroll o cambios de formula previsional.
- Horas Extras en el motor payroll, salvo que Slice 0 determine que el export debe bloquear cuando no existe evidencia de cero.
- Migracion historica de periodos previos.
- Reemplazo de exports internos Excel/CSV/PDF.

## Edge cases canonizados

1. Honorarios excluidos de Previred/LRE dependiente.
2. International excluidos.
3. Sin RUT verificado: endpoint responde 412 con lista sanitizada; no genera archivo parcial.
4. Ingreso/egreso parcial del periodo: se representa segun formato oficial.
5. Licencia medica: se representa solo si el runtime tiene fuente suficiente.
6. Finiquito/vacaciones proporcionales: se incluye solo si existe settlement/documento canonico suficiente.
7. APV opcional: separado y mapeado solo si el formato vigente lo exige.
8. Horas Extras: bloquear o exigir waiver/readiness si no hay evidencia de cero; no emitir `0` silencioso.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Slice 0 congela fuente oficial Previred vigente, con fecha y version.
- [ ] Slice 0 congela fuente oficial LRE/DT vigente, con fecha y version.
- [ ] Task no contiene supuestos de XML/XSD o layout fijo salvo que la fuente vigente los pruebe para la variante elegida.
- [ ] ADR de payroll compliance exports aceptada e indexada.
- [ ] Registry de artefactos compliance creado con hashes, source snapshot, spec version, totales y validation result.
- [ ] Generador Previred implementa la variante oficial elegida.
- [ ] Generador LRE implementa la variante oficial elegida.
- [ ] Mappings Previred/LRE viven en registries declarativos, no inline en generadores.
- [ ] RUT verificado por Person Legal Profile es precondicion hard.
- [ ] Honorarios e international quedan excluidos con tests.
- [ ] Paridad Previred contra `calculatePreviredEntryBreakdown` y, post `TASK-707a`, contra `payment_order`.
- [ ] Paridad LRE contra `payroll_entries` cerradas.
- [ ] Capabilities `hr.payroll.export_previred` y `hr.payroll.export_lre` agregadas en el sistema vigente de entitlements/capabilities.
- [ ] UI/API usan copy canonico y errores sanitizados.
- [ ] Reliability signal visible en Ops Health.
- [ ] Docs funcionales y manual operador creados.

## Verification

- `pnpm pg:doctor`
- `pnpm migrate:up` o flujo canonico de migracion vigente
- `pnpm db:generate-types`
- `pnpm vitest run src/lib/payroll/exports`
- `pnpm exec eslint src/lib/payroll/exports src/app/api/hr/payroll/periods/[periodId]/export --max-warnings=0`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`
- `pnpm design:lint` si hay UI visible
- Verificacion manual con fixtures generados contra la fuente oficial congelada

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados.
- [ ] `docs/tasks/README.md` sincronizado.
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` sincronizado.
- [ ] `Handoff.md` actualizado con decisiones y validaciones.
- [ ] `changelog.md` actualizado si hay cambio operativo visible.
- [ ] `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` mantiene ADR vigente.
- [ ] Follow-up DJ 1879 creado si sigue fuera de scope.
- [ ] Follow-up Horas Extras creado si Slice 0/Slice 3 lo requiere.

## Follow-ups

- **TASK-### — Payroll Chile Horas Extras Calculation** si LRE vigente exige conceptos no modelados.
- **TASK-### — DJ 1879 SII Retencion Honorarios Anual**.
- **TASK-### — Upload programatico Previred/DT** si existe convenio/API formal.
- **TASK-### — Compliance Export Rectification Flow** para reemplazo/void/supersession de artefactos ya declarados.

## Open Questions

- Cual variante Previred exacta se soporta en V1 si Previred mantiene mas de un formato vigente?
- Cual manual LRE/DT exacto aplica a carga masiva al momento de implementar?
- El artifact registry debe vivir en `greenhouse_payroll` o reutilizar una primitive general de `greenhouse_core.assets` + metadata domain table?
- El estado `declared_status` debe nacer en TASK-812 o quedar para rectification/upload follow-up?

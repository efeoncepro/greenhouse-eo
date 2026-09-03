# TASK-1814 — Offboarding: revisión, corrección y recuperación desde la UI

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1814-offboarding-case-review-recovery-ui.md`
- Flow: `docs/ui/flows/TASK-1814-offboarding-case-review-recovery-ui-flow.md`
- Motion: `docs/ui/motion/TASK-1814-offboarding-case-review-recovery-ui-motion.md`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno; pendiente contrato TASK-1349 y validación visual`
- Rank: `TBD`
- Domain: `hr|ui|payroll`
- Blocked by: `TASK-1349`
- Branch: `Greenhouse develop; checkout compartido, sin worktrees ni cambio de branch`
- Legacy ID: `none`
- GitHub Issue: `ISSUE-117`

## Delta 2026-09-03 — contrato backend de TASK-1349 disponible (code complete, rollout pendiente)

- Command y rutas: `POST /api/hr/offboarding/cases/[caseId]/review` (body `ReviewOffboardingCaseInput`: `decision`
  `access_only|relationship_ended`, `reason` ≥10, `expectedUpdatedAt` = `case.updatedAt` visto, `separationType`
  (obligatoria en `relationship_ended`; nunca `identity_only`), `effectiveDate`, `lastWorkingDay`,
  `lastWorkingDayAfterEffectiveReason?`, `notes?`, `approveNow?`) → `{ case, changes[], approvalInvalidated }`.
  `POST .../review/preview` (mismo body, sin escritura) → `{ derivation: { next, review, changes, approvalInvalidated },
  payrollEffect[{ periodId, projectionPolicy, reviewRequired, cutoffDate, warnings }], approvalStillRequiredForPayroll }`.
- Errores (es-CL + `code`): `offboarding_case_review_required` (409, aprobar sin revisar), `offboarding_case_version_conflict`
  (409, recargar), `offboarding_case_version_required` (400), `offboarding_review_reason_too_short`,
  `offboarding_review_dates_required`, `offboarding_review_dates_inconsistent`, `offboarding_review_separation_type_required`,
  `offboarding_case_terminal` (409), `compensation_future_version_conflict` (409 al ejecutar).
- DTO `OffboardingWorkQueueItem`: `case.review` (registro persistido), `case.updatedAt` para la versión,
  `closureLane.code` nuevo `access_only`, `secondaryActions` con `review_case` (todo caso no terminal, blocked incluido)
  y `transition_execute` para `access_only` revisado; `progress` real (4 pasos) en lanes sin finiquito;
  `closureCompleteness.pendingSteps` con `close_member_lifecycle` y `verify_member_runtime`.
- `TransitionOffboardingCaseInput.expectedUpdatedAt` opcional: enviar siempre desde la UI para que aprobar/programar
  nunca sobrescriba una versión ajena. Un caso `identity_only` sin `review` ya no ofrece «Aprobar».
- Regla UI derivada: ninguna fecha se toma del formulario «Nuevo caso»; el preview muestra el efecto de nómina antes
  de guardar; `approvalStillRequiredForPayroll=true` significa que aprobar es lo que libera el período.

## Summary

Permitir revisar y corregir el caso de offboarding existente desde su inspector: clasificación contractual,
fechas, recuperación de bloqueos y aprobación con efecto visible sobre nómina. Elimina fechas tomadas del
formulario Nuevo caso y consume la decisión canónica de TASK-1349. El cierre incluye el recorrido UI de Felipe,
salido el 02/06/2026 y sin deuda, confirmado por el operador.

## Why This Task Exists

La prueba con computer use mostró “Listo 2/2” con fechas ausentes, aprobación con hoy implícito y falta de
edición/reclasificación/recuperación. La acción classify_case carece de handler. TASK-1349 poseía backend,
TASK-892 quedó completa y TASK-1625 trata otros defectos de payroll; ninguna task activa posee este recorrido.

## Goal

- Completar revisión/corrección en el inspector existente y hacer comprensible el efecto de la decisión.
- Aislar formularios por caseId y mostrar progreso real, errores recuperables y datos desconocidos.
- Demostrar que UI, API y base convergen después de guardar; un toast no acredita el cierre.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md`
- `docs/architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md`
- `docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/UI_FEATURE_AGENT_INVARIANTS.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`

Aplicar `greenhouse-ai-design-studio` primero, luego portal-ui-implementer, vuexy-ui-expert y UX content.
La task no redefine reglas financieras: consume la ADR temporal de TASK-1349. No nace otra ruta ni otro menú.

## Normative Docs

- `docs/audits/payroll/OFFBOARDING_ROOT_CAUSE_AND_REMEDIATION_2026-09-03.md`
- `docs/audits/payroll/FELIPE_OFFBOARDING_UI_AUDIT_2026-09-03.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/to-do/TASK-1349-offboarding-member-lifecycle-writeback.md`: contrato review/correct, DTO de requisitos,
  autorización, errores y readback estable antes de integrar writes.

### Blocks / Impacts

- Cierre operativo de ISSUE-117 y recovery de TASK-1349.
- TASK-1028 posee la plataforma de sidecars: consumir primitive existente sin ampliar su contrato aquí.
- TASK-1625 conserva ajustes/cálculo/export de payroll; no se modifica esa UI.

### Files owned

- `src/views/greenhouse/hr-core/offboarding/HrOffboardingView.tsx` y su suite de UI.
- `src/lib/copy/workforce.ts`: copy del recorrido de revisión/corrección.
- Wireframe/flow declarados, escenario GVC nuevo y manual de offboarding existente a localizar en Discovery.

## Current Repo State

### Already exists

Inspector, drawer de creación, `DataTableShell`, `OperationalPanel`, `FieldsProgressChip`, `DismissibleBanner`,
DTO `OffboardingWorkQueue`, carga por caseId y callbacks de transición en HrOffboardingView.

### Gap

Dos formularios comparten fechas; el inspector no ofrece review/correct; blocked no se recupera y classify_case
no hace nada. Clasificación/progreso visual difieren de payroll. UI ready permanece no hasta validar mappings,
copy, escenarios y dirección visual sobre el contrato backend definitivo.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/views/greenhouse/hr-core/offboarding/HrOffboardingView.tsx` en portal Next.js.
- Future candidate home: `portal`
- Boundary: DTO/readers/commands de TASK-1349; ninguna regla de elegibilidad en JSX.
- Server/browser split: DTO browser-safe; stores, DB, credenciales y providers solo backend.
- Build impact: `none`; sin paquetes pesados ni entrypoints nuevos.
- Extraction blocker: sesión/capability y transporte de portal; no extraer runtime en esta task.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite` para consumo; no implementa cambios backend.
- Impacto principal: `none`; UI-only sobre contrato TASK-1349, que conserva rigor backend-critical.
- Source of truth afectado: ninguno nuevo; work-queue/review/correct de TASK-1349.
- Consumidores afectados: inspector de offboarding.
- Runtime target: staging y production del portal existente.

### Contract surface

- Contrato existente a respetar: DTO de `src/lib/workforce/offboarding`.
- Contrato nuevo o modificado: ninguno en esta task; faltantes se resuelven en TASK-1349.
- Backward compatibility: compatible con backend revisado antes del release de UI.
- Full API parity: consumidor de primitive canónico, sin duplicación de reglas.

### Data model and invariants

Sin tablas ni write-targets propios. Caso y permisos validados server-side; UI conserva caseId/versión,
no reemplaza controles de tenant, idempotencia, auditoría/outbox o concurrencia de TASK-1349.

### Migration, backfill and rollout

Sin migración/backfill propio. Recovery pertenece a TASK-1349 y la UI verifica su resultado.
Rollback revierte presentación, no escribe ni revierte saldos/casos.

### Security and access

Sesión/capability del command; PII mínima, errores sanitizados, sin secretos ni SQL en browser.
Pending impide doble envío visual; la idempotencia efectiva es responsabilidad del backend.

### Runtime evidence

Verificación de payload/errores/readback y GVC; PG se contrasta en el cierre conjunto TASK-1349.
Si cambia el contrato, actualizar primero la dueña backend, no esconder lógica aquí.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador People con capability vigente del caso; lectura para roles sin write.
- Momento del flujo: señal requiere revisión, dato erróneo o caso bloqueado.
- Resultado perceptible esperado: decisión, fechas y efecto payroll coherentes y verificables tras guardar.
- Friccion que debe reducir: salir a API/scripts para corregir una fecha o una clasificación.
- No-goals UX: rediseño de nómina, menús nuevos o otro wizard de baja.

### Surface & system decision

- Surface: `/hr/offboarding`, cola e inspector existente.
- Nav placement: `none` — no agrega destino.
- Composition Shell: no aplica nueva shell; preservar composición list-detail existente.
- Primitive decision: `extend` inspector actual; reuse OperationalPanel, DataTableShell y feedback existente.
- Adaptive density / The Seam: aplica al inspector; contenido compacto legible, formulario completo en móvil.
- Floating/Sidecar/Dialog decision: un inspector con modo revisión; evitar drawer apilado con Nuevo caso.
- Copy source: `src/lib/copy/workforce.ts` y nomenclatura institucional existente.
- Access impact: `entitlements` — consumir permisos declarados por backend, sin nueva política cliente.

### State inventory

- Default: resumen con origen, decisión, fechas y próximos pasos reales.
- Loading: skeleton del caso; sin valores tomados de otra persona.
- Empty: cola vacía con empty state existente; selección ausente no conserva formulario anterior.
- Error: validación inline; conflicto de versión ofrece recargar; fallo de red conserva borrador del mismo caso.
- Degraded / partial: indicar capa desconocida; no mostrar Listo ni habilitar ejecución por ausencia de datos.
- Permission denied: lectura permitida sin writes; error del backend permanece visible.
- Long content: causal/motivo multilínea sin desplazar acciones fuera de alcance.
- Mobile / compact: inspector a ancho completo a 390px, labels/fechas completos, sin scroll horizontal.
- Keyboard / focus: orden lectura→campos→revisión→guardar; foco al primer error y devolución al trigger.
- Reduced motion: conservar meaning/foco mediante las primitives existentes; sin animación nueva.

### Interaction contract

- Primary interaction: Revisar caso → decisión/fechas/motivo → resumen de impacto → Guardar revisión;
  aprobación y ejecución posteriores según estado y requisitos reales del servidor.
- Hover / focus / active: tokens y estados de botones/campos existentes.
- Pending / disabled: un envío en curso, impedir doble click y no limpiar datos antes de confirmar persistencia.
- Escape / click-away: borrador dirty requiere confirmación antes de salir o cambiar persona.
- Focus restore: al trigger de fila; errores vuelven al campo o mensaje correspondiente.
- Latency feedback: pending del command; finalización solo tras readback del caso y cola.
- Toast / alert behavior: éxito con datos persistidos; warning persistente si la recarga no confirma convergencia.

### Motion & microinteractions

- Motion primitive: `none` nuevo; conservar comportamiento de primitives instaladas.
- Enter / exit: heredar inspector existente, sin nuevos efectos.
- Layout morph: ninguno añadido.
- Stagger: ninguno añadido.
- Timing / easing token: reutilizar tokens existentes, sin literales nuevos.
- Reduced-motion fallback: verify comportamiento heredado y foco con preferencia activada.
- Non-goal motion: esta task no agrega motion; el contrato enlazado verifica comportamiento heredado y feedback de guardado.

### Implementation mapping

- Route / surface: `/hr/offboarding` → HrOffboardingView.
- Primitive / variant / kind: inspector existente + OperationalPanel y campos estándar; confirmar adapter sidecar al ejecutar.
- Component candidates: editor de revisión local a offboarding con estado por caseId; sin primitive global nueva.
- Copy source: GH de workforce con fechas y términos tuteo neutro.
- Data reader / command: work-queue y review/correct provistos por TASK-1349; nombre final según contrato aprobado.
- API parity: exclusivamente adapter de primitive; no UPDATE, fechas fallback ni clasificación paralela.
- Access / capability: permisos del DTO y rechazo server-side; no ocultar errores con guards de rol genéricos.
- States to implement: inventario anterior, más caso identity_only, honorarios y blocked con fechas.

### GVC scenario plan

- Scenario file: nuevo escenario focal bajo el directorio canónico de captures; confirmar path en Discovery.
- Route: `/hr/offboarding` con fixtures sintéticos.
- Viewports: desktop 1440px y mobile 390px.
- Quality profile: `premium`.
- Required steps: abrir pending, clasificar, validar fechas nulas, revisar impacto, guardar, recargar, corregir blocked.
- Required captures: resumen, revisión, error, unknown, permiso lectura, éxito confirmado y móvil.
- Required `data-capture` markers: case-review, case-impact, case-review-error, case-review-confirmed (propuestos).
- Assertions: ninguna fecha hoy implícita; cambiar Nuevo caso no afecta otro caso; no write sin capacidad.
- Scroll-width checks: scrollWidth <= clientWidth en ambos viewports.
- Reduced-motion / focus evidence: teclado completo, Escape dirty, retorno de foco y prefers-reduced-motion.
- Review dossier: capture/review + scorecard bajo docs/ui/reviews al implementar.
- Baseline decision / surface ID: repo-native-benchmark de hr-offboarding; aprobar baseline corregida tras review.

### Design decision log

- Se extiende el inspector porque mantiene contexto de persona y caso; se descarta otro wizard/ruta duplicada.
- Estado por caseId y campos explícitos sustituyen defaults cruzados; decisión de dominio sigue en backend.
- Se mantienen jerarquía y primitives existentes; UI ready no hasta validar dirección/copy/mapping y escenario real.

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

### Slice 1 — Contrato visual y estado aislado

Validar wireframe/flow, primitive lookup, copy y escenarios; completar UI ready antes de JSX.
Separar Nuevo caso, revisión y transición por caseId; campos ausentes no se rellenan con hoy.

### Slice 2 — Revisión, corrección y recuperación

Conectar classify_case con el modo revisión, consumir review/correct de TASK-1349 y mostrar impacto antes de guardar.
Recuperar blocked según FSM; errores inline, conflictos, dirty state y readback; aprobar nunca reutiliza fechas ocultas.

### Slice 3 — Progreso honesto y verificación operativa

Renderizar lane/requisitos/completitud canónicos, distinguir unknown y saldo financiero del estado del caso.
Probar recorrido y caso inverso solo acceso. Recovery de Felipe consume commands de TASK-1349 y confirma
exclusión posterior, historia preservada y cero deuda; no implementa reconciliación bancaria en el componente.

## Out of Scope

- Schema/API/commands/readers/signals (TASK-1349), nuevo menú, rediseño global o reglas payroll en cliente.
- Nuevos pagos o liquidaciones; clasificar “pendiente” en UI como deuda sin respaldo.

## Detailed Spec

Wireframe y flow enlazados gobiernan interacción. La aprobación debe presentar fechas del caso y decisión
persistida. Cambiar datos materiales exige review/correct canónico y nueva aprobación; no hay cancel/create bypass.
El CTA financiero refleja el estado confirmado del reader, sin traducir automáticamente generated a “se le debe”.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Contratos backend TASK-1349 estables → UI ready → slices 1/2 → GVC/regresiones → release → recovery conjunta.
No cerrar la task por screenshots o toast sin readback.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Fecha de otro formulario enviada | UI/payroll | high | caseId + campos explícitos + prueba de contaminación | payload inválido/regresión |
| Estado cliente anticipa éxito | UI/data | medium | readback obligatorio y error recuperable | divergencia UI/reader |
| Lista nueva sobre backend antiguo | release | medium | contrato backend primero y handling de capacidad ausente | error de capability/versión |
| Doble pago por copy ambiguo | finance | medium | estado canónico y recovery con cero pagos | saldo incoherente |

### Feature flags / cutover

No flag nuevo de UI previsto: consumir disponibilidad real del command backend. Si no está listo, mostrar
revisión no disponible; nunca volver a aprobación con fecha inventada. Release coordinado con TASK-1349.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1–3 | Revertir UI conservando guards backend y registros auditados | Una ventana de redeploy | UI sí; no revierte writes |

### Production verification sequence

1. GVC premium desktop/móvil y pruebas funcionales en staging con fixtures sintéticos.
2. Release autorizado tras canary de contrato; verificar permisos, review/correct y readback.
3. Completar recovery de Felipe por TASK-1349; comprobar pre-nómina posterior y saldo cero.
4. Confirmar después de recarga completa y registrar evidencia, sin reejecutar pagos.

### Out-of-band coordination required

Mismo release/recovery de TASK-1349. Causal respaldada si falta; no pedir otra vez la fecha ni saldo de Felipe.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] UI ready permanece no hasta mapping, copy, design decision log y GVC scenario plan completos y validados.
- [ ] Primitive decision extend/reuse implementada sin regla de negocio ni nueva primitive global en JSX.
- [ ] Wireframe existente pasa `pnpm ui:wireframe-check --task TASK-1814`.
- [ ] Flow existente pasa `pnpm ui:flow-check --task TASK-1814`.
- [ ] Contrato de motion heredado y feedback pasa `pnpm ui:motion-check --task TASK-1814`.
- [ ] Clasificar, corregir y recuperar blocked son acciones funcionales del mismo caso sobre commands TASK-1349.
- [ ] Aprobar con fechas ausentes no envía hoy; cambiar Nuevo caso/caso seleccionado no contamina otro payload.
- [ ] Revisión muestra decisión, fechas y efecto canónico antes de guardar; cambios materiales invalidan aprobación.
- [ ] Error, pending, empty, denied, unknown, conflicto y dirty state cubiertos; éxito exige readback.
- [ ] Lane, progreso y próximo paso coinciden con reader; desconocido nunca se muestra Listo 2/2.
- [ ] Copy reusable vive en src/lib/copy/workforce.ts; saldo pendiente no se deduce de un estado técnico.
- [ ] GVC premium desktop y 390px, teclado/foco, reduced-motion y scrollWidth <= clientWidth verificados.
- [ ] Reproducción completa de fecha oculta y caso inverso identity_only pasan con fixtures sintéticos.
- [ ] Felipe tiene salida 02/06/2026, queda fuera de períodos posteriores y refleja saldo pendiente cero tras recovery; historia y pagos preservados.
- [ ] Evidencia UI/API/PG de TASK-1349 confirma convergencia productiva; código desplegado solo no cierra.

## Verification

- `pnpm task:lint --task TASK-1814`, wireframe-check y flow-check focales.
- Suite HrOffboardingView con interacción/payload real, sin afirmar forma textual del código.
- `pnpm fe:capture <scenario> --env=staging` y `pnpm fe:capture:review <capture-dir>` al implementar.
- QA release auditor + gates proporcionales, readback productivo conjunto TASK-1349.

## Closing Protocol

- [ ] Lifecycle/carpeta, Status real y acceptance criteria al día.
- [ ] Registry/README, TASK-1349 e ISSUE-117 reflejan cierre conjunto o bloqueo real.
- [ ] Manual, GVC/dossier, Handoff y changelog actualizados según impacto.
- [ ] `pnpm docs:closure-check` y último `pnpm docs:context-check:strict` sin deuda del cambio.

## Follow-ups

Sin nueva task de backend: TASK-1349 conserva ownership de todos los contratos consumidos.

## Delta 2026-09-03 — registro y estimación

Registro autorizado por el operador; sin implementación, commit, push ni deploy.
Estimación UI: 4–6 horas efectivas una vez estable el contrato backend. Total conjunto con TASK-1349:
20–32 horas de trabajo efectivo, aproximadamente 3–5 jornadas; incluye 4–8 horas de QA/release/recovery,
sin contar esperas externas o migración financiera adicional. Reestimar tras contrato/dry-run.

# ISSUE-117 — Offboarding ejecutado nunca desactiva `greenhouse_core.members` (active/status) → colaboradores desvinculados filtran a rosters/nómina/360

## Ambiente

production + staging (identity canónico — `greenhouse_core.members`)

## Detectado

2026-07-06, por el operador, durante el envío de avisos de nómina 1:1 por Teams (`pnpm teams:payment-announcement`). Al reconstruir el roster de colaboradores activos desde `greenhouse_core.members`, aparecían **María Camila Hoyos** y **Maggie Borralles** como `active=true` pese a estar **desvinculadas hace semanas** (y ya removidas del tenant de Microsoft Entra). El operador confirmó que ambas "pasaron por el flujo de Offboarding y supuestamente ya no deberían salir".

## Síntoma

Personas con salida laboral procesada siguen `status='active'`, `active=true` en `greenhouse_core.members`, con `updated_at` **congelado en su fecha de creación** (nunca lo tocó el offboarding). Como consecuencia filtran a todo consumidor que lee "workforce activo": rosters (Teams payment-announcement), candidatos de cálculo de nómina, Person/Account 360, People directory, etc.

Evidencia (query 2026-07-06):

| Persona | member_id | status | active | updated_at | En Entra |
|---|---|---|---|---|---|
| María Camila Hoyos | `d1a72374-f4b7-415f-b54a-0dcf76749e46` | active | true | 2026-05-14 | no (SCIM la desactivó) |
| Maggie Borralles | `0e6a896e-f1d2-481c-9c97-ee43ab1714d8` | active | true | 2026-06-01 | no |

Casos de offboarding existentes:

| public_id | member | source | separation_type | rule_lane | exec_mode | status | executed_at |
|---|---|---|---|---|---|---|---|
| EO-OFF-2026-0609A520 | María Camila | manual_hr | resignation | external_payroll | partial | **executed** | 2026-05-15 |
| EO-OFF-2026-FE2179AC | María Camila | scim | identity_only | identity_only | informational | needs_review | — |
| *(ninguno)* | **Maggie** | — | — | — | — | — | — |

Dos manifestaciones distintas del mismo hueco:
1. **María Camila**: caso HR **ejecutado** (`executed`, 15-may) pero `members` nunca cambió. Además un 2.º caso SCIM colgado en `needs_review`.
2. **Maggie**: **no existe ningún caso de offboarding**; salió de Entra por otra vía y Greenhouse no tiene registro de exit ni desactivó el member.

## Causa raíz

**No existe en todo el repo ningún code path que ponga `greenhouse_core.members.active=false` ni un `status` de salida.** El executor de offboarding cierra las capas que sí toca, pero **omite el writeback del ciclo de vida al registro canónico `members`**:

- `updateOffboardingCaseStatus` (transición `→ executed`) en [src/lib/workforce/offboarding/store.ts:926-999](../../../src/lib/workforce/offboarding/store.ts#L926-L999) hace: `assertPayrollExecutionReadiness` → `closeFuturePayrollEligibility` (corta elegibilidad futura de nómina) → `UPDATE greenhouse_hr.work_relationship_offboarding_cases SET status='executed', executed_at=now()...` → eventos/outbox. **Nunca hace `UPDATE greenhouse_core.members`.**
- No hay **consumer reactivo** del evento `workRelationshipOffboardingCaseExecuted` que desactive el member (`rg` sobre `src`/`services` no devuelve ninguno fuera del catálogo de eventos).
- `grep` global de `greenhouse_core.members` con `active=false` / `status='offboarded'|'inactive'|'terminated'` → **cero coincidencias** en código productivo. La desactivación del member simplemente no está implementada en ninguna lane (`full`/`partial`/`informational`).
- El lane `external_payroll` (Deel) resuelve `greenhouseExecutionMode='partial'` ([src/lib/workforce/offboarding/lane.ts](../../../src/lib/workforce/offboarding/lane.ts)) bajo la premisa de que Deel hace la baja real; pero aun en `partial`/`full` el member canónico debería marcarse inactivo, y no ocurre.
- El lane SCIM `identity_only` cae en `informational`/`needs_review` y por diseño no muta; queda esperando revisión HR que nunca desactiva el member. Y cuando la baja de Entra no genera caso (Maggie), no hay nada que reconcilie.

Es decir: aunque un offboarding llegue a `executed`, el colaborador permanece "activo" en el objeto 360 canónico.

## Impacto

- **Cuasi-incidente de pago / near miss (2026-07-06)**: **Felipe Zurita** (honorarios, deprovisionado en Entra el 2026-06-10) fue incluido en el cálculo de nómina del período **2026-06** corrido hoy, con `payroll_entries` **gross 650.000 / neto 550.875 / retención SII 99.125**, período ya `status=exported`. Su mayo (parcial) fue 201.190; junio salió **completo sin prorratear la salida**. **NO se perdió dinero: el equipo retuvo el pago manualmente porque sabía que Felipe ya no estaba.** Es decir, el sistema lo habría pagado; lo único que lo evitó fue conocimiento tribal, no un control. Causa directa: su único caso de offboarding es el stub SCIM `identity_only`/`informational` en `needs_review` (nunca ejecutado, sin `last_working_day`), así que `closeFuturePayrollEligibility` jamás corrió y el resolver de exit-eligibility no tenía nada que excluir. **El bug llegó hasta generar y exportar el pago; el control que faltó es del sistema.**
- **Privacidad/operacional (gatillo original)**: ex-colaboradores entraban al roster de avisos de nómina 1:1. No se les envió porque el cruce contra Entra los descartó, pero cualquier consumidor que confíe solo en `members.active` los incluiría.
- **Nómina (sistémico)**: **toda** persona deprovisionada por SCIM cuyo caso quede en `needs_review` sin acción humana sigue siendo honorario/colaborador plenamente activo → se le **calcula y exporta** la nómina; que se pague o no depende hoy de que alguien del equipo recuerde que salió. No hay gate que bloquee/marque la nómina ante una salida sin resolver: el último control es conocimiento tribal, no el sistema.
- **360 / People / reporting**: headcount y directorios inflados con gente que ya salió.
- **Drift silencioso**: no hay señal que detecte "member `active=true` con offboarding `executed`", "member ausente de Entra pero `active=true`", ni "caso de salida `needs_review` de un member que entra a la nómina".

## Solución

Propuesta (a validar con `greenhouse-payroll-auditor` + `arch-architect`; **no** parche por-registro, corregir la primitiva):

1. **Writeback canónico del ciclo de vida en el executor**: al transicionar un caso `→ executed`, dentro de la misma `withTransaction`, marcar `greenhouse_core.members` como inactivo con estado de salida (`status` de baja + `active=false` + `contract_end_date`/último día laboral), vía un command auditado (no UPDATE suelto). Debe aplicar a `full` y `partial`; para `external_payroll` el member canónico igual se desactiva (Greenhouse es el 360, Deel es el payer).
2. **SCIM `identity_only`/`informational`**: definir la política — o (a) al confirmarse baja de acceso persistente se escala a un cierre laboral que desactive el member, o (b) queda explícito que `identity_only` NO desactiva y entonces la baja de Entra debe reconciliarse por otra vía. Hoy no hace ni una ni otra.
3. **Caso "sin offboarding" (Maggie)**: reconciliar bajas de Entra que no generaron caso — el pipeline SCIM debe crear (o cerrar) un caso, o un detector debe levantarlas.
4. **Reliability signal nuevo**: `workforce.offboarding.executed_member_still_active` (steady=0) — member con caso `executed` que sigue `active=true`; y complementario `identity.workforce.active_member_absent_from_entra`.
5. **Backfill** de los casos ya rotos (María Camila, Maggie y cualquier otro que el detector encuentre) por el command canónico, no por SQL manual.

Requiere task(s) de implementación (dominio Payroll/Workforce, EPIC offboarding). Este issue documenta el bug de runtime; la remediación amplia (writeback + política SCIM + detector + backfill) excede un fix localizado.

## Verificación

- Tras el fix: ejecutar un offboarding de prueba en staging y confirmar que `greenhouse_core.members` queda `active=false` + `status` de salida + `updated_at` movido, en la misma transacción del `executed`.
- Backfill: `María Camila` y `Maggie` quedan inactivas por el command canónico; desaparecen del roster de `members active` y de candidatos de nómina.
- Signals `workforce.offboarding.executed_member_still_active` y `identity.workforce.active_member_absent_from_entra` en `0`.
- `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` verde (gate de no-regresión del dominio).

## Delta 2026-07-06 — refinamiento tri-skill (payroll + arquitectura + finanzas)

Revisado con `greenhouse-payroll-auditor` + `arch-architect` + `greenhouse-finance-accounting-operator` al crear la remediación (TASK-1349):

- **Corrección:** la inclusión de payroll NO depende de `members.active` (usa `resolveExitEligibilityForMembers` + participation-window); por eso el drift filtró a **rosters/360**, no a la nómina. El fix debe preservar el pago final (parcial) de quien salió a mitad de período — la inclusión sigue por el resolver, no por `active`.
- **Causa raíz de fondo:** `members.active` es un projection no-mantenido usado como SSOT de "workforce activo"; la dirección canónica es un reader derivado `resolveActiveWorkforceMembers()` + mantener la columna honesta por writeback. Se descarta trigger duro (colisiona con la ventana de participación de payroll) → consistencia por command+señal.
- **Finanzas:** desactivar NUNCA orfana obligaciones abiertas (contractor payable / final settlement) ni borra historia de costo (soft flag).

Remediación: **TASK-1349** (`docs/tasks/to-do/TASK-1349-offboarding-member-lifecycle-writeback.md`).

## Estado

open

## Verificación UI 2026-09-03 — Felipe continúa bloqueado

La [auditoría Computer Use en producción](../../audits/payroll/FELIPE_OFFBOARDING_UI_AUDIT_2026-09-03.md)
reprodujo un defecto adicional: `Aprobar caso` tomó las fechas default del formulario de creación y
guardó `2026-09-03` sin preguntarlas. Felipe pasó de `needs_review` a `approved`, manteniendo
`rule_lane=identity_only`, member activo y compensación abierta. El operador confirmó después
**02/06/2026**. Se repararon ambas fechas mediante la API autenticada canónica y se contuvo la
aprobación en `blocked`, con auditoría, readback PG y recarga de producción verificados.
La UI no ofrece editar/reclasificar/revertir; muestra “Cierre contractual” y 2/2 listo pese a la
clasificación de identidad. **El bloqueo del caso no excluye a Felipe de nómina**; sigue pendiente
el cierre contractual y de elegibilidad. No hubo cálculo ni pago. La auditoría precisa reproducción, causa y
recuperación requerida. Sigue abierto; los hallazgos amplían el circuito de revisión que debe cubrir
TASK-1349.

La [investigación ampliada con tres subagentes](../../audits/payroll/OFFBOARDING_ROOT_CAUSE_AND_REMEDIATION_2026-09-03.md)
confirmó la ausencia del command de revisión/reclasificación, los defectos desde los commits de mayo,
3 casos ejecutados con member activo y 40 tests focales verdes que no cubren el recorrido SCIM.
Propone corregir el contrato temporal antes del writeback (active=false hoy afecta recálculos históricos),
incorporar una unidad UI dependiente y conciliar la obligación/gasto de junio de Felipe.

**Aclaración del operador (2026-09-03): a Felipe se le pagó absolutamente todo y no se le debe nada.**
Los estados generated/pending observados en junio no reflejan ese cierre real; no son deuda confirmada
ni autorización para pagar nuevamente. La recuperación debe enlazar el pago ya realizado con los
registros correspondientes y corregir generaciones improcedentes con trazabilidad, dejando saldo
pendiente cero. Esta aclaración actualiza el estado de negocio; no reescribe la observación histórica
del near miss del 06/07.

## Avance 2026-09-03 — TASK-1349 en producción (release `62356c9b7fd4`); recovery de datos pendiente del operador

Desplegado a producción el mismo día (PR #219, orquestador `33779259694`, flag ON tras live smoke sintético). Lo que
sigue abierto es la **recovery de datos**: el clasificador de permisos bloqueó `pnpm workforce:offboarding:recovery
--apply` al agente; la corre el operador (runbook `docs/operations/runbooks/offboarding-recovery.md`). Contenido:

- Resolver de elegibilidad por episodio (`active` = disponibilidad actual; `contract_type_snapshot` servido; reingreso
  detectado) + gate fail-closed en readiness y `calculatePayroll` ante salida sin resolver o resolver caído.
- Command `reviewOffboardingCase` (`access_only` | `relationship_ended`) con causal/fechas explícitas, control de
  versión, audit y outbox; guard de revisión en el state machine; capability `workforce.offboarding.review_case`
  (seed aplicado); rutas HR + carril `app`.
- Executor lane-aware: `identity_only` informational; término real cierra compensación (rechaza versiones futuras),
  termina relación con fecha real y desactiva member + `member.deactivated` **detrás de
  `WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED` (OFF)**.
- Proyecciones honestas, tres señales (`hr.offboarding.unresolved_exit_signal` = 2, `hr.offboarding.executed_member_still_active`
  = 3, `workforce.offboarding.deprovisioned_member_without_case` = 0 al 03/09), guards SCIM/backfill.
- Recovery gobernada `pnpm workforce:offboarding:recovery` (dry-run ejecutado sobre la cohorte real; apply pendiente
  de autorización del operador y de la causal respaldada de Felipe).

**Sigue abierto**: el cierre operativo exige release, flag ON tras smoke en staging, recovery aplicada (Felipe +
Valentina/Luis/María Camila), UI TASK-1814 y conciliación Finance de junio/julio de Felipe (obligación 550.875 y SII
99.125 generadas por error; no existe `cancelPaymentObligation` → dependencia Finance registrada en la task).

## Recovery ejecutada 2026-09-03 (autorizada por el operador)

- Felipe Zurita: `relationship_ended` / `termination` (causal declarada por el operador) → `executed`; member
  inactivo, compensación cerrada al 02/06/2026, elegibilidad mayo íntegra / junio desde el cutoff / julio+ excluido.
- Luis Reyes y María Camila Hoyos: lifecycle cerrado (relación employee terminada al LWD real, member inactivo) y
  stubs SCIM cerrados como `access_only` con la fecha de la señal.
- Valentina Hoyos: **falso positivo del drift** — su salida employee (LWD 30/04) está bien ejecutada, pero está
  activa como contractor desde el 20/08. La lane A la desactivó; se agregó la guarda de reingreso (`c5c030e99`,
  develop) y se re-terminó su relación employee; restaurar `status/contract_end_date/assignable` y su asignación
  requiere `scripts/workforce/restore-valentina-hoyos-2026-09-03.sql` (ISSUE-163 explica por qué no fue posible por
  command).
- Señales tras la recovery: `executed_member_still_active` **0**, `unresolved_exit_signal` **1** (Maria Fernanda,
  draft manual), `deprovisioned_member_without_case` 0.

**Cierre de este issue:** pendiente de (a) restauración de Valentina, (b) release con la guarda de reingreso, (c) UI
TASK-1814 y (d) conciliación Finance de junio/julio de Felipe.

## Relacionado

- Código: [src/lib/workforce/offboarding/store.ts](../../../src/lib/workforce/offboarding/store.ts) (`updateOffboardingCaseStatus`), [src/lib/workforce/offboarding/lane.ts](../../../src/lib/workforce/offboarding/lane.ts)
- Arquitectura: `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`, `docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md` (§offboarding closure completeness), `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` (SCIM provisioning/deprovisioning)
- Detectado desde: CLI `pnpm teams:payment-announcement` (skill `greenhouse-teams-message-operator`)
- Objeto canónico: `Colaborador` → `greenhouse_core.members.member_id`

## Registro de solución 2026-09-03

TASK-1349 actualizada como dueña backend; [TASK-1814](../../tasks/to-do/TASK-1814-offboarding-case-review-recovery-ui.md)
creada como consumidor UI dependiente. Cierre conjunto exige revisión/corrección accesible, elegibilidad temporal,
recovery auditado de Felipe con salida 02/06/2026 y saldo cero, y readbacks productivos. Solo documentación;
sin implementación, pagos, commit, push ni deploy. Estimación conjunta 20–32 horas efectivas (3–5 jornadas),
sin esperas externas ni una migración financiera adicional que el dry-run pudiera requerir.

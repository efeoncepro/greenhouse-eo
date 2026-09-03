# TASK-1349 — Offboarding: revisión contractual, elegibilidad temporal y cierre canónico

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `none`
- Status real: `Backend en producción; recuperación de Valentina aplicada y verificada, ISSUE-163 resuelto (release 33795564223, 2026-09-03). Abiertos: conciliación Finance y UI TASK-1814; no repetir recuperaciones históricas.`
- Rank: `TBD`
- Domain: `hr|payroll|identity|finance`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido, sin worktrees ni cambio de branch`
- Legacy ID: `none`
- GitHub Issue: `ISSUE-117`

## Summary

Completar la decisión contractual que falta entre la señal SCIM y el cierre de participación en nómina.
Un command revisa/corrige el caso existente; la ejecución coordina relación, compensación y lifecycle,
preserva la historia y evita que una baja solo de acceso termine una relación. TASK-1814 consume estos
contratos desde la UI. La recuperación incluye a Felipe: salida 02/06/2026, todo pagado, saldo pendiente cero.

## Why This Task Exists

La auditoría del 03/09 confirmó que el caso SCIM identity_only no puede reclasificarse, el executor no
cierra el lifecycle del member y, en sentido inverso, puede cerrar compensación ante una baja solo de acceso.
El roster SQL filtra active=true y el resolver excluye inactive antes de considerar fechas: la premisa
anterior de esta task era falsa. Desactivar sin reparar esa dependencia rompe recálculos históricos.
El control de readiness y las señales no cubren el circuito completo; hay tres casos ejecutados con member activo.

## Goal

- Resolver señales SCIM mediante decisión explícita y auditada, sin deducir término laboral de acceso deshabilitado.
- Hacer coherentes contrato, ventana de participación, lifecycle, progreso y señales.
- Recuperar datos por commands gobernados, preservando pagos/historia y sin generar otro pago a Felipe.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md`
- `docs/architecture/GREENHOUSE_PAYROLL_PARTICIPATION_WINDOW_V1.md`
- `docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/DECISIONS_INDEX.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Aplicar `greenhouse-payroll-auditor`, `software-architect-2026` y `greenhouse-finance-accounting-operator`.
- Actualizar la decisión dueña de elegibilidad temporal en `GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md`
  y su referencia en DECISIONS_INDEX antes de cambiar semántica. Este registro no declara una ADR Accepted.
- Relación/episodio y fechas gobiernan elegibilidad histórica; active es disponibilidad actual, no filtro universal.
- Solo acceso no altera relación, compensación ni elegibilidad. Honorarios no significa ausencia de obligaciones.
- No hard-delete, SQL operativo suelto, pagos nuevos ni recálculo automático de períodos exportados.

## Normative Docs

- `docs/audits/payroll/OFFBOARDING_ROOT_CAUSE_AND_REMEDIATION_2026-09-03.md`
- `docs/audits/payroll/FELIPE_OFFBOARDING_UI_AUDIT_2026-09-03.md`
- `docs/issues/open/ISSUE-117-offboarding-executed-never-deactivates-member-canonical.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `src/lib/workforce/offboarding/store.ts`, `lane.ts` y `work-queue/`.
- `src/lib/payroll/exit-eligibility/`, `participation-window/`, `postgres-store.ts`, `payroll-readiness.ts`.
- `src/lib/scim/provisioning-internal-collaborator.ts` y `scripts/backfill-postgres-canonical-360.ts`.

### Blocks / Impacts

- `docs/tasks/to-do/TASK-1814-offboarding-case-review-recovery-ui.md`: consumidor UI dependiente; ISSUE-117 no cierra sin ambos recorridos live.
- `docs/tasks/to-do/TASK-1625-payroll-correctness-and-operational-hardening.md`: coordinar readiness y cálculo;
  esta task posee decisión de salida/ventana, no reimplementa atomicidad general, ajustes ni reglas legales.
- TASK-1761 conserva baja Microsoft/Joiner-Mover-Leaver; consume el hecho de salida, sin duplicar cierre contractual.

### Files owned

- `src/lib/workforce/offboarding/**`, `src/app/api/hr/offboarding/**`.
- `src/lib/payroll/exit-eligibility/**`, `src/lib/payroll/participation-window/**`.
- `src/lib/payroll/postgres-store.ts`, `src/lib/payroll/payroll-readiness.ts`: ownership acotado a salida temporal.
- `src/lib/reliability/queries/offboarding-completeness-partial.ts` y señales de salida del dominio.
- `src/lib/scim/provisioning-internal-collaborator.ts`, `scripts/backfill-postgres-canonical-360.ts`: guards de ownership.
- Recovery command/script nuevo: ubicación exacta a decidir en Discovery bajo el dominio existente.
- Arquitectura e invariantes citadas; no posee JSX/copy de TASK-1814.

## Current Repo State

### Already exists

State machine, lane canónico, audit/outbox, cierre de compensación, resolver de elegibilidad y participation window.
Felipe tiene caso blocked/identity_only con fechas 02/06, member activo y compensación abierta.
El operador confirma que todo está pagado. Los registros generated/pending no representan deuda confirmada.

### Gap

Faltan revisión del caso, atomicidad de efectos por decisión, selección temporal por episodio, protección contra
reactivación por proyecciones y detección de capas desconocidas. El reader omite contract_type_snapshot en su
SELECT exterior. Cuarenta pruebas existentes pasan pese al bug: falta cobertura del recorrido real.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/workforce/offboarding/**` y `src/lib/payroll/**` en Next.js actual.
- Future candidate home: `domain-package`
- Boundary: command/reader/DTO canónicos; API y UI son consumidores.
- Server/browser split: DB, auth, stores y providers server-only; DTO saneado browser-safe.
- Build impact: `none`; sin SDK pesado ni nuevo entrypoint global previsto.
- Extraction blocker: transacción compartida de relación, caso, compensación y lifecycle; no separarla por red.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `greenhouse_core.members`, `greenhouse_hr.work_relationship_offboarding_cases`,
  eventos del caso y compensaciones; relación/episodio existente verificado en Discovery.
- Consumidores afectados: UI, API, payroll oficial/proyectado, rosters, SCIM y proyecciones.
- Runtime target: `staging` → `production`; ambos comparten instancia PG, no asumir aislamiento de datos.

### Contract surface

- Contrato existente a respetar: `src/lib/workforce/offboarding/store.ts` + resolver y participation-window.
- Contrato nuevo o modificado: revisión/corrección de caso, ejecución por decisión y reader de elegibilidad temporal.
- Backward compatibility: `gated`; endpoint fino sobre primitive, no lógica por botón.
- Full API parity: read/write gobernados con capability fina y grant/coverage en el mismo cambio;
  declarar camino Product API y surface programática de app/ecosystem o exclusión fundada, sin duplicar command.

### Data model and invariants

- Entidades/tablas/views afectadas: members, casos/eventos, relaciones y versiones de compensación existentes.
- Invariantes que no se pueden romper: solo acceso no termina compensación; salida real preserva historia,
  autoría SCIM y obligaciones legítimas; reingreso no hereda una salida anterior; fechas ausentes nunca son hoy implícito.
- Write-target allowlist: verificar boundary tests existentes e incluir destinos nuevos con justificación en el mismo PR.
- Tenant/space boundary: sujeto y relación derivados del contexto autenticado y validados contra el caso, nunca del ID solo.
- Idempotency/concurrency: versión esperada + lock de caso/relación, tx única, retry idempotente y rollback probado.
- Audit/outbox/history: before/after y motivo append-only, aprobación material invalidada tras cambio y outbox en tx.

### Migration, backfill and rollout

- Migration posture: additive solo si Discovery demuestra schema insuficiente; no crear otro SoT por anticipado.
- Default state: revisión read-only/shadow antes del cutover; flag propuesto de writeback sigue OFF hasta verificar temporalidad.
- Backfill plan: dry-run por allowlist de sujetos explícitos; revalidar datos inmediatamente antes del apply.
- Rollback path: deshabilitar nuevas mutaciones y revertir código; datos requieren command compensatorio auditado,
  nunca reactivar a todos ni restaurar historia por SQL.
- External coordination: confirmar causal respaldada y trazabilidad financiera; el operador ya confirmó fecha y saldo cero de Felipe.

### Security and access

- Auth/access gate: sesión + capability fina del dominio y autorización sobre sujeto/relación.
- Sensitive data posture: nómina/PII mínima en evidencia; sin secrets/raw rows en logs.
- Error contract: errores canónicos sanitizados para fecha, versión, conflicto y revisión requerida; captura de dominio.
- Abuse/rate-limit posture: idempotencia, límites del adapter y protección de replay; sin endpoint de backfill abierto.

### Runtime evidence

- Local checks: regresiones de comportamiento, tx rollback, concurrency, readers y paridad oficial/proyectada.
- DB/runtime checks: dry-run/readback PG de fechas, estado, compensación, historial y efecto por período.
- Integration checks: UI TASK-1814 + API consumen mismo command; SCIM/BQ no resucitan salida confirmada.
- Reliability signals/logs: unresolved_exit, executed_member_still_active y completitud con unknown distinto de complete;
  nombres definitivos registrados en el catálogo antes de exponerlos.
- Production verification sequence: descrita en rollout; el despliegue solo no acredita cierre.

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

### Slice 0 — Decisión temporal y control de revisión requerida

Actualizar ADR/policy y quitar el supuesto de independencia actual respecto de active. Definir cuándo una salida
sin resolver afecta el período; reader y comandos de cálculo/aprobación comparten la decisión. Señal de acceso
por sí sola no excluye pago. Errores del resolver no permiten autorizar silenciosamente nuevos cálculos.

### Slice 1 — Revisar y corregir el caso existente

Command que distingue solo acceso/término real, identifica relación/episodio, causal respaldada y fechas explícitas.
Conservar SCIM como origen; recomputar lane/requisitos, invalidar aprobación obsoleta, tx/audit/outbox y version conflict.
No cancelar/crear otro caso para evadir unicidad. Entregar contrato estable a TASK-1814.

### Slice 2 — Elegibilidad temporal y ejecución coherente

Reparar filtro SQL active y exclusión temprana inactive; seleccionar salida por relación/episodio/período y servir
contract_type_snapshot. Coordinar lifecycle y vigencia de compensación solo ante salida real; detectar versiones
futuras conflictivas. Mantener pagos/historia anteriores y reingresos. Reader canónico para workforce actual,
con migración del consumer de roster gatillo; resto de consumers inventariado sin refactor general.

### Slice 3 — Proyecciones y detección

Clasificación/progreso/acción siguiente derivan del mismo contrato; unknown no significa complete. Cubrir pendientes
SCIM y executed con drift. Impedir reactivación indebida desde SCIM/backfill BQ por ownership de la relación;
detectar ausentes de Entra sin inferir su salida laboral ni implementar baja Microsoft que posee TASK-1761.

### Slice 4 — Recuperación gobernada y cierre compartido con UI

Felipe: salida 02/06/2026, todo pagado, saldo cero. Dry-run → cierre auditado → readback de exclusión posterior.
Conciliar obligación/gasto con pagos ya realizados; no asumir que todo registro generated debe marcarse paid.
Corregir generaciones improcedentes con commands de Finance existentes y trazabilidad; si falta un contrato
financiero, registrar dependencia ejecutable antes del apply, no SQL manual ni cerrar este criterio como completo.
No recalcular exports ni emitir pagos. Revisar demás sujetos por caso; ninguna baja masiva por SCIM.

## Out of Scope

- UI/copy/JSX (TASK-1814); remodelación visual general y nuevos menús.
- Nuevos pagos, hard-delete, reescritura de exports, tasas legales y atomicidad general de payroll (TASK-1625).
- Baja Microsoft/licencias/grupos (TASK-1761), nuevas infraestructuras o sincronizaciones periódicas no verificadas.

## Detailed Spec

La auditoría enlazada es evidencia del 03/09; revalidar runtime al ejecutar. El resultado financiero confirmado
por el operador es cero deuda de Felipe; separar ese hecho de la falta de conciliación de registros internos.
La fecha del 02/06 no aporta una causal legal: no inventar renuncia/despido. Decisión de revisión y preview de
impacto preceden al write; la aprobación de una task no autoriza por sí sola pagos, deploy o bajas de terceros.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 0 antes de nuevos efectos; Slice 1 entrega contrato a TASK-1814. Slice 2 debe preservar histórico antes
que active=false pueda ejecutarse. Slice 3 live antes de Slice 4. Recuperación productiva exige backend y UI
verificados; no declarar ISSUE-117 resuelto con un flag OFF.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Baja solo de acceso corta compensación | payroll/identity | high | decisión canónica y prueba inversa | drift de relación/compensación |
| active=false borra elegibilidad histórica | payroll | high | ventana por episodio y pruebas mayo/junio/posterior | delta oficial/proyectado |
| Duplicar pago ya realizado | finance | medium | conciliación trazable y cero pagos en recovery | saldo/obligación inconsistente |
| Reactivación desde SCIM/BQ | identity | medium | ownership y readback | executed_member_still_active |
| Staging altera datos productivos compartidos | data | medium | fixtures sintéticos y allowlist | auditoría de writes |

### Feature flags / cutover

`WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED` es una propuesta previa, no runtime confirmado.
Verificar si existe, registrar estado real en el ledger y mantener efectos nuevos OFF hasta smoke temporal.
El guard de fechas/revisión no debe quedar neutralizado por un flag de desactivación. Cutover con release gobernado.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 0–3 | Deshabilitar efectos nuevos y revertir release; preservar audit | Estimar con ensayo staging | código sí |
| 4 | Command compensatorio con before/after y revisión por caso | Depende del registro afectado | parcial; historial permanece |

### Production verification sequence

1. Pruebas sintéticas locales, migration/rollback ensayados si aplica; no usar personas reales como fixtures.
2. Staging con flags observados y UI TASK-1814: revisar/corregir/ejecutar caso sintético, readback y caso inverso solo acceso.
3. Release productivo autorizado y canary de contratos; revalidar guards y señales.
4. Recovery allowlist: revisar preview, aplicar command, releer UI/PG/oficial/proyectada y conciliación financiera.
5. Felipe fuera de períodos posteriores, historia preservada y saldo cero; demás casos resueltos explícitamente.

### Out-of-band coordination required

People/Finance aporta causal y vínculo a pago existente cuando no estén en registros. Fecha 02/06 y saldo cero
ya están confirmados; no pedirlos nuevamente. Release y cambios de flags siguen control canónico.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] ADR temporal actualizada y contrato de revisión/ejecución publicado con autorización fina, grant, errores y API parity. — Evidencia: `GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md` Architecture Decision 2026-09-03 + fila en `DECISIONS_INDEX.md`; capability `workforce.offboarding.review_case` (catálogo + grant + seed aplicado, verificado en PG); rutas HR + carril `app`; `capability-grant-coverage.test` verde (commits Slice 0/1).
- [x] Caso SCIM existente puede revisarse/corregirse sin cancelar/crear; causal respaldada, fechas explícitas y aprobación invalidada si cambia su base. — `review-policy.test.ts` (16 casos) + preview read-only sobre el caso real de Felipe (lane → `non_payroll`, `unblocked`).
- [x] Transacción, idempotencia, version conflict, rollback y auditoría/outbox verificados por comportamiento. — `member-lifecycle.test.ts` (idempotencia, 409 sin escrituras), `review-policy.test.ts` (409 conflict/400 required), tx única en `reviewOffboardingCase`/`transitionOffboardingCase` (`withTransaction` + `FOR UPDATE`, audit + outbox dentro). Rollback real (fallo intermedio) queda cubierto por `withTransaction`; no ejercitado contra PG con fixture sintético (pendiente en staging).
- [x] Solo acceso no cierra compensación/member; término real coordina relación, vigencias y lifecycle. — `member-lifecycle.test.ts` ambos sentidos; writeback de member/relación detrás de flag (activación y evidencia posterior en ledger).
- [x] Reader entrega contract_type_snapshot y selecciona episodio/período correcto; reingreso y versiones futuras cubiertos. — `policy.test.ts` (reingreso, international_internal) + smoke real `pnpm payroll:exit-eligibility:smoke` (Maggie `exclude_from_cutoff` desde approved); versiones futuras → 409 en el executor.
- [x] active=false no excluye retrospectivamente mayo ni participación legítima hasta 02/06; períodos posteriores quedan excluidos. — `policy.test.ts` «Felipe-like» (mayo full, junio exclude_from_cutoff, julio exclude_entire_period).
- [x] Readiness y comandos impiden cálculo autorizado ante salida relevante sin resolver o error del resolver; SCIM solo no implica impago. — `payroll-readiness.test.ts` + `calculation-gate.test.ts`; `calculatePayroll` 409; smoke real: Felipe `full_period` + `REVIEW` en jun/sep.
- [x] Progreso/señales detectan pendientes y unknown; executed con member activo no se oculta. — `closure-completeness.test.ts` (unknown → partial, `close_member_lifecycle`); señales validadas contra PG real (2 / 3 / 0).
- [x] SCIM/backfill BQ respetan ownership y no reactivan salidas confirmadas; detector sin caso exige revisión. — guard en cascade #2 (`linked_inactive_prior_exit`), CASE en el upsert del backfill, señal `deprovisioned_member_without_case`. No ejercitado en vivo contra Entra (pendiente en staging).
- [x] Write-target allowlists, source of truth, tenancy, acceso, migración y rollback documentados y verificados. — Delta 2026-09-03 en la arquitectura de offboarding + invariantes TASK-1349 + ledger de flags + migración seed con guard DO.
- [ ] TASK-1814 permite completar el flujo desde la UI y comparte la decisión canónica sin lógica duplicada. — Contrato publicado en TASK-1814 (Delta 2026-09-03); UI no implementada (task hermana).
- [x] Felipe queda fuera de períodos posteriores al 02/06/2026 — Recovery aplicada 2026-09-03 (`termination` declarada por el operador): executed, member inactivo, compensación cerrada al 02/06; readback mayo `full_period`, junio `exclude_from_cutoff`, julio/sept `exclude_entire_period`. La conciliación Finance (obligación junio 550.875 + SII 99.125 generadas por error) sigue como dependencia sin contrato de anulación: saldo cero confirmado por el operador, registros internos por conciliar.
- [x] Cohorte de otros casos revisada con allowlist por sujeto, sin baja automática de casos solo de acceso. — Luis Reyes y María Camila Hoyos cerrados (lifecycle + stubs `access_only`); Maria Fernanda draft queda a decisión manual de HR; **Valentina Hoyos fue un falso positivo** (reingreso como contractor desde 20/08): guarda de reingreso y writer transaccional desplegados; restauración gobernada aplicada 18:38:48Z, proyecciones completadas 18:42:05Z, datos protegidos idénticos; ISSUE-163 resuelto. Véase auditoría de Valentina y release `33795564223`. La referencia a Maria Fernanda describe la primera cohorte, no una instrucción actual de recuperación.
- [ ] Readbacks live de UI, PG, oficial/proyectada y señales confirman resultado; flags/deploy/recovery registrados por separado. — PG, resolver y señales verificados tras la recovery (1/0/0); restauración de Valentina y release de la guarda cerrados; falta recorrido UI de TASK-1814. Los conteos de esa cohorte son evidencia fechada, no estado actual.

## Verification

- `pnpm task:lint --task TASK-1349` y gates proporcionales de código al implementar.
- Pruebas focales de offboarding, exit-eligibility, participation-window, readiness y consumidores tocados.
- Fixtures sintéticos para concurrency/rollback; live tests solo por `pnpm test:live`, serializados.
- QA release auditor + `pnpm qa:gates --changed`; evidencias runtime según secuencia de rollout.

## Closing Protocol

- [x] Lifecycle/carpeta, Status real y acceptance criteria reflejan lo demostrado. — `in-progress`: backend desplegado, recuperación de Valentina cerrada; UI y conciliación Finance siguen abiertas.
- [x] Registry/README y TASK-1814 sincronizados; ISSUE-117 resuelto solo con cierre operativo conjunto. — ISSUE-117 sigue `open` con avance registrado.
- [x] Arquitectura, invariantes, manual, runbook, Handoff y changelog actualizados según impacto.
- [ ] `pnpm docs:closure-check` y `pnpm docs:context-check:strict` aprobados al cierre documental. — Se ejecutan al cierre de esta sesión (ver Delta).

## Delta 2026-09-03 — implementación local-first (slices 0–4, sin push)

Commits en `develop`: Slice 0 (`b825e0a40`), Slice 1 (`f622a22ce`), Slice 2 (`5df9d727a`), Slice 3 (`7bb6060e3`),
Slice 4 (`ff2f7623e`) + cierre documental. Resumen ejecutable:

| Slice | Entrega | Verificación |
|---|---|---|
| 0 | Resolver por episodio (`active` = disponibilidad), `contract_type_snapshot` servido, `reviewRequired`, gate fail-closed en readiness + `calculatePayroll`, ADR | 167 tests focales; smoke PG real (destapó `$2` sin bind, 42P18) |
| 1 | `reviewOffboardingCase` + preview, guard de revisión, `expectedUpdatedAt`, capability + seed, rutas HR + app lane | 113 tests; preview real sobre Felipe (read-only); typecheck |
| 2 | Executor lane-aware, `applyOffboardingLifecycleEffects` (flag OFF), roster sin filtro `active` universal | 68 tests; smoke roster PG real flag off/on |
| 3 | Proyecciones honestas, 3 señales, guards SCIM/backfill | 141 tests; señales validadas en PG (2/3/0) |
| 4 | `pnpm workforce:offboarding:recovery` dry-run/apply por allowlist | dry-run real de la cohorte; ninguna escritura |

**Efecto operativo post-release (deliberado):** readiness de septiembre bloqueará con `unresolved_exit_signal` hasta
resolver Felipe (blocked) y Maria Fernanda (draft con fecha pasada). Es el control que faltó el 06/07.

**Dependencias ejecutables antes de cerrar ISSUE-117:** (1) release + `WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED`
ON tras smoke sintético en staging (ledger); (2) recovery por allowlist con la causal respaldada de Felipe declarada
por People; (3) Finance: contrato para anular obligación/gasto generados por error (junio 550.875 / SII 99.125 y julio
SII 99.125 de Felipe) — hoy sólo existe `supersedePaymentObligation`, no cancel; (4) TASK-1814 UI; (5) TASK-1625
posee el hallazgo «entry julio gross 0 con retención SII 99.125».

**Gate omitido a propósito:** `pnpm build` de producción no se corrió en esta máquina (consume ~30 GB y requiere
autorización del operador); `pnpm test` completo, `pnpm typecheck` y `pnpm lint` sí. El build real lo hizo Vercel en
el release.

## Delta 2026-09-03 — rollout ejecutado (release `62356c9b7fd4`)

- Merge canónico `-s ours` (V1 = sólo el squash #218), push, PR #219 con marker `[release-coupled: payroll +
  auth_access = la misma capability]`, smoke en main, orquestador `33779259694` con `bypass_preflight_reason`
  forense (`db_migrations` ya aplicada; `cloud_release` deploy.sh ya desplegado). Los dos gates `production`
  aprobados; manifest `released` 16:45:09Z. Ledger de tiempos actualizado.
- Live smoke sintético `src/lib/workforce/offboarding/review-execute.live.test.ts` (sujetos por el primitive SCIM):
  guard de revisión, gate de nómina por período, version conflict, reclasificación, ejecución con writeback (member
  inactivo, relación terminada con la fecha real, `member.deactivated`), historia preservada, SCIM no resucita, e
  inverso `access_only` sin efectos. Verde con el flag en la invocación.
- Flag `WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED` ON en Production y staging + redeploys; ledger
  actualizado. Ruta `review/preview` desplegada (401 sin sesión); canary read-only en staging sobre el caso real de
  Felipe: lane→`non_payroll`, junio `exclude_from_cutoff`, julio/sept `exclude_entire_period`.
- Residual: mi push del live test a `develop` redeployó los workers compartidos con `2c2c92683` durante el run
  (diff de árbol vs target = sólo el test); watchdog `drift_count=2` documentado, sin redeploy forzado.
- **Recovery ejecutada después con autorización explícita del operador (mismo día):** Felipe (`termination`),
  Luis, María Camila. **Incidente:** Valentina Hoyos desactivada por error (reingreso contractor 20/08 no
  contemplado) → guarda `findReentryAfterExit` en `applyOffboardingLifecycleEffects` + señal excluye reingresos
  (`c5c030e99`, entonces sólo en develop); `updateMember` falló a mitad (ISSUE-163) y su `member.updated` reactivó la relación
  employee terminada (re-terminada por command). Ese residual se resolvió después por command compensatorio; el SQL puntual fue retirado. Véase cierre abajo.
- **Incidente «fantasmas» en pre-nómina (mismo día):** los sujetos sintéticos del live test quedaron inactivos con
  compensación abierta y aparecían como `Colaborador <uuid>` en la pre-nómina de septiembre: el roster relajado los
  admitía y `hasDecidedExitFact` contaba un `identity_only` ejecutado como salida decidida. Corregido en datos
  (compensaciones cerradas por command) y en código (política + cleanup del live test); roster verificado limpio.
- **Lección canónica:** «executed + member activo» no es drift cuando existe reingreso posterior vigente
  según el predicado compartido (no un draft ni un episodio futuro). El command compensatorio exige además
  relación vigente de la misma entidad. Guarda desplegada en release `33795564223`; detalle en la ADR de reingreso.

## Cierre de recuperación de Valentina — 2026-09-03

La [auditoría](../../audits/payroll/VALENTINA_REHIRE_IDENTITY_RECOVERY_2026-09-03.md) registra el command
compensatorio aplicado, outbox publicado, consumers completados y siete categorías protegidas idénticas.
`203fa04ec` incorpora actualización atómica de member/links/audit/outbox, proyección legal sin resurrección
 y guardas de reingreso. Verificación: 41 unitarias, dos pruebas SQL read-only, build, CI y release
`33795564223` success; manifest released 19:30:49Z, health success, watchdog 4/4.
El [runbook](../../operations/runbooks/workforce-reentry-recovery.md) sustituye el SQL retirado. No repetir
la recuperación para validar la UI; esta y Finance conservan su scope pendiente. La elegibilidad SSO no
se presenta como prueba de login interactivo.

## Follow-ups

- TASK-1814 posee interacción; TASK-1761 posee compensación de acceso Microsoft.
- Sweep de otros consumers de workforce actual solo con ownership explícito tras inventario; no bloquea corrección acotada.

## Delta 2026-09-03 — auditoría, alcance corregido y estimación

Solicitud del operador: registrar solución tras revisar código, base y UI; no se inició implementación.
Sustituye la premisa histórica falsa de independencia de active y la prohibición absoluta de tocar vigencia de
compensación. Permite cierre de vigencia por command, preservando documentos financieros históricos.
Backend: 12–18 horas de trabajo; UI TASK-1814: 4–6 horas; verificación/release/recovery conjunta: 4–8 horas.
Total estimado: **20–32 horas de trabajo efectivo, aproximadamente 3–5 jornadas**, sin contar esperas de
aprobación/ventana de release ni una migración financiera adicional que Discovery pudiera demostrar necesaria.
La auditoría ya está realizada; confianza media, reestimar tras contrato temporal y dry-run financiero.

## Historical Context

Los deltas siguientes se conservan como historia. Sus afirmaciones sobre active y autorización SCIM quedan
sustituidas por el contrato vigente de arriba y la evidencia del 03/09; no son instrucciones de implementación.

## Delta 2026-08-21 — handoff de baja Microsoft

El rollout real de `TASK-1761` queda bloqueado hasta probar el camino de salida integrado con esta task. Offboarding
no hace hard-delete de la persona ni de la cuenta Microsoft: preserva historia, deshabilita acceso externo y deja
residual-access signals en steady state cero.

## Delta 2026-07-06 — revisión tri-skill (payroll + arquitectura + finanzas)

Revisado en profundidad con `greenhouse-payroll-auditor`, `arch-architect` (4-pillar) y `greenhouse-finance-accounting-operator`. Ajustes incorporados:

- **Payroll (corrección de supuesto):** la inclusión de payroll/payout NO se decide por `members.active` (el grep de `active=true` en readers de payroll salió vacío; usan `resolveExitEligibilityForMembers` + participation-window). Por eso el bug filtró a **rosters**, no a nómina. Añadido gate de no-regresión (Slice 1) + invariante lane-aware de preservación del pago final (Deel/EOR sin payout Greenhouse vs lanes internas con settlement a preservar).
- **Arquitectura (SSOT + defensa en profundidad):** identificada la causa raíz de fondo — `members.active` es un projection no-mantenido usado como SSOT de "workforce activo". Añadido: reader canónico `resolveActiveWorkforceMembers()` (Slice 1b) + outbox event a reactive consumers (360/serving/BQ) + decisión explícita de **NO usar trigger duro** (colisiona con la ventana de participación de payroll) → consistencia por command+señal, no por constraint.
- **Finanzas (boundary + append-only):** invariante de no orfanar obligaciones abiertas (contractor payables / final settlement / honorario) al desactivar; historia de costo (`member loaded cost`) sobrevive (soft flag, NUNCA delete); cruce de `contractor_payables` abiertos. Boundary contractor closure ≠ finiquito respetado.
- **4-pillar (arch-architect):** Safety = flag OFF + allowlist + capability existente del executor; Robustness = tx atómica + idempotencia + preservación de pago final; Resilience = outbox/reactive + 3 signals + backfill reversible; Scalability = command reusable (Full API Parity) sin lógica duplicada por consumer.

## Delta 2026-07-06 (2) — cuasi-incidente de pago (near miss) → Slice 0

Se verificó en PG que el bug **llegó a generar y exportar** el pago: Felipe Zurita (honorarios, deprovisionado en Entra 2026-06-10, caso de offboarding en `needs_review` sin ejecutar) tiene `payroll_entries` de junio 2026 por **gross 650.000 / neto 550.875**, período `exported`, calculado el 2026-07-06. **No se perdió dinero: el equipo lo retuvo manualmente porque sabía que ya no estaba** — el último control fue conocimiento tribal, no el sistema. Su único "offboarding" nunca corrió `closeFuturePayrollEligibility` ni fijó `last_working_day`, así que el cálculo lo tomó como honorario plenamente activo. Ajustes: (1) nueva **Slice 0** (gate/señal de readiness de nómina ante salida sin resolver) como mitigación de bajo blast-radius que puede shipear primero y reemplazar el control tribal por uno del sistema; (2) tercer signal `payroll.readiness.member_with_unresolved_exit`. **Priority se mantiene P1** (no hubo pérdida; la red de seguridad humana sostuvo), pero el control gap es real y sistémico: cualquier persona deprovisionada por SCIM cuyo caso quede en `needs_review` seguiría siendo calculada/exportada hasta que un humano lo note. Subir a P0 si se considera inaceptable depender de conocimiento tribal en payroll.


## Open Questions

- Confirmar causal contractual respaldada y relación/episodio a revisar; no inferirla del dato de fecha.
- Verificar el vínculo contable del pago realizado y distinguir duplicados generados; el saldo cero ya fue confirmado.

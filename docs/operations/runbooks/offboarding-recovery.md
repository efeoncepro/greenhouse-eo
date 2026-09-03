# Runbook — Offboarding Recovery (TASK-1349)

> **Audience:** EFEONCE_ADMIN, HR operators con capability `workforce.offboarding.review_case`
> **Domain:** identity / workforce / payroll (boundary de solo lectura hacia Finance)
> **Spec:** `docs/tasks/in-progress/TASK-1349-offboarding-member-lifecycle-writeback.md`
> **Arch:** `docs/architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md`, `docs/architecture/GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md`
> **Manual funcional:** `docs/manual-de-uso/hr/offboarding.md` §"Recuperación gobernada (TASK-1349)"

## Propósito

Corregir, de forma gobernada y auditada, casos de offboarding que quedaron desalineados con la
realidad — nunca con SQL manual. Dos formas de desalineación:

- Una salida **REAL** ya fue `executed` pero el colaborador sigue `members.active=true`
  (`hr.offboarding.executed_member_still_active`, ver
  [ISSUE-117](../../issues/open/ISSUE-117-offboarding-executed-never-deactivates-member-canonical.md)).
- Un caso nació como señal de **solo acceso** (`identity_only`, típicamente un stub SCIM) pero en
  verdad correspondía a un término de relación real, y quedó atascado sin revisión
  (`hr.offboarding.unresolved_exit_signal`).

El script recorre la misma cadena de commands canónicos que la API (`reviewOffboardingCase` →
`transitionOffboardingCase` scheduled → executed), así que deja el mismo rastro de auditoría y
respeta las mismas reglas — nunca un atajo paralelo.

## Preconditions

- Release en producción ≥ `62356c9b7fd4` (2026-09-03 — "TASK-1349 offboarding review + elegibilidad
  por episodio").
- Flag `WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED` en `true` en Vercel **Production** y
  **staging** desde 2026-09-03 (ver `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`). Sin el flag ON,
  los efectos de lifecycle del lane A (desactivar `member`, cerrar relación legal) no se escriben —
  el script setea el flag en el proceso al aplicar (`--apply`), pero el runtime de producción
  (`POST /transition` vía API) sigue gobernado por el flag real del ambiente.
- Túnel PostgreSQL activo: `pnpm pg:connect` (perfil `runtime`; el script carga env + perfil
  automáticamente al arrancar).
- El operador que ejecuta `--apply` debe tener sesión propia — el lane de app platform
  (`platform.app.hr.offboarding.case.review`) rechaza tokens delegados
  (`sister_platform_oauth`) con 403: revisar la salida de una persona exige un humano.

## Comandos

```bash
# Dry-run de toda la cohorte con drift (ningún write)
pnpm workforce:offboarding:recovery

# Dry-run de un colaborador puntual
pnpm workforce:offboarding:recovery --member <memberId>

# Aplicar — Lane A: cerrar el ciclo de vida de una salida REAL ya ejecutada
pnpm workforce:offboarding:recovery --apply --member <memberId> \
  --decision relationship_ended \
  --separation-type <resignation|termination|fixed_term_expiry|mutual_agreement|contract_end|other> \
  --reason "…" \
  [--approve]

# Aplicar — Lane B: cerrar una señal de acceso como solo acceso, sin término de relación
pnpm workforce:offboarding:recovery --apply --member <memberId> \
  --decision access_only \
  --access-revoked-on YYYY-MM-DD \
  --reason "…"
```

`--apply` siempre requiere `--member <memberId>` explícito (repetible; nunca aplica a la cohorte
completa de una sola vez). `--decision`, `--reason` y las fechas son obligatorios y nada se infiere:
sin `--separation-type` y sin fechas ya registradas en el caso, el dry-run solo puede mostrar la
previsualización, nunca escribir.

## Qué hace cada lane

- **A — `close-lifecycle`** (casos `executed`, `rule_lane <> identity_only`, `members.active=true`):
  llama `applyOffboardingLifecycleEffects` dentro de una transacción — cierra vigencia de
  compensación (normalmente ya cerrada), termina la relación legal con el `last_working_day` real,
  marca `members.active=false`, cierra asignaciones y emite `member.deactivated`. Idempotente: si el
  estado ya está correcto, no reintroduce un evento duplicado.
- **B — `review-and-close`** (caso sin decisión, típicamente un stub SCIM `identity_only`): corre
  `reviewOffboardingCase` con la causal y fechas explícitas del operador → si se pasa `--approve`,
  encadena `transitionOffboardingCase` a `scheduled` → `executed` (que dispara los efectos del lane
  A). Sin `--approve`, el caso queda en `needs_review` con la decisión ya registrada — aprobar,
  programar y ejecutar quedan como pasos gobernados aparte (API o, cuando exista, la UI de
  `TASK-1814`).
- Un stub SCIM **obsoleto** de una persona cuya salida real **ya está `executed`** (lane B con
  `has_executed_real_exit=true`) no se cierra como término real — se revisa `access_only` con
  `--access-revoked-on <fecha de la señal>` y queda cerrado como informational, sin tocar relación,
  compensación ni `member`.

## Casos manuales en borrador o ya aprobados

El CLI no ejecuta todos los casos que lista: `manual_decision_pending` y `in_lifecycle` terminan en
«nada que aplicar». No repetir `--apply` ni reclasificar el caso como señal SCIM para hacerlo entrar.
El cierre normal usa los commands de `src/lib/workforce/offboarding`, también consumidos por la API.

Procedimiento aplicado a Maggie y María Fernanda el 03/09/2026:

1. Identificar cada caso por `public_id`, resolver su ID interno y member, y leerlo con
   `getOffboardingCase`. La fila de la cola y el inspector pueden mostrar personas distintas: una
   captura con un conteo no identifica al colaborador. Confirmar el período por su registro, no
   por el mes del deadline: el vencimiento 07/09 correspondía a la nómina `2026-08`.
2. Obtener la decisión humana. «Fueron despedidas» respaldó `relationship_ended` + `termination`;
   «ya se les pagó todo» se registró en el motivo. Se conservaron `effectiveDate` y `lastWorkingDay`
   de cada caso existente. Si faltan o se contradicen, pedir el dato; nunca asumir hoy.
3. Previsualizar con `previewOffboardingCaseReview({current, input, actorUserId, canApprove})`.
   `input` incluye decisión, causal, ambas fechas, motivo, `expectedUpdatedAt` y `approveNow`.
   `canApprove` corresponde a la autoridad verificada del actor; no se concede por usar un script.
   Antes del write, ejecutar `assertNoFutureCompensationVersions` y `findReentryAfterExit` dentro
   de una transacción de lectura. Un reingreso actual requiere evaluar el episodio, no desactivarlo.
4. Con autorización del operador y versión vigente, invocar `reviewOffboardingCase` sobre el mismo
   caso. La aprobación simultánea exige `approveNow=true` y autoridad de aprobación. Luego llamar
   `transitionOffboardingCase` a `scheduled` y a `executed`, pasando en cada paso el `updatedAt`
   recién devuelto. Cada command es transaccional; la secuencia completa no es una sola transacción.
   Si se interrumpe, releer y continuar desde el estado persistido; no repetir la revisión a ciegas.
5. El executor aplica las guardas canónicas y el flag de lifecycle. En la operación documentada se
   habilitó el flag sólo en el proceso autorizado, siguiendo el runbook; eso no demuestra ni cambia
   el valor de Vercel. No sustituir `assertPayrollExecutionReadiness` por reglas del agente:
   `international_internal` no requiere el agregado de finiquito chileno; `indefinido` y `plazo_fijo`
   conservan sus gates de cálculo/documento. No generar un finiquito chileno para destrabar este caso.
6. Releer member, relaciones, compensaciones y resolver de elegibilidad para el mes de salida y
   los siguientes. Consultar `getOffboardingWorkQueue`: exigir `closureState=complete`, sin capas
   desconocidas ni pasos pendientes. Leer señales de salida y `getPayrollPeriodReadiness` del
   período realmente materializado. `ready=true` no significa que se haya calculado o aprobado.
7. Comparar las obligaciones de Finance antes/después. El cierre no concilia pagos: si siguen
   `generated`, documentar esa diferencia y remitir a Finance con los IDs existentes. No emitir
   nuevos pagos ni cambiar obligaciones por SQL a partir de la declaración del operador.

La operación fue una invocación puntual de commands existentes, no una ampliación del CLI ni una
nueva función de la UI. No promover los scripts `.tmp` con IDs personales a herramienta reutilizable.
La evidencia durable y los IDs auditados están en
[la auditoría de cierre](../../audits/payroll/MAGGIE_MARIA_FERNANDA_OFFBOARDING_CLOSURE_2026-09-03.md).
Sus casos ya son terminales: no volver a ejecutar el apply. Los snapshots no sustituyen una lectura actual.

## Disciplina para personas reales — readback previo por sujeto (lección Valentina, 2026-09-03)

El 03/09 la recovery de lane A se aplicó en lote confiando en la clasificación automática, sin leer antes los
episodios posteriores de cada sujeto: Valentina había reingresado como contractor el 20/08 y quedó desactivada
(reparada por command; ver [runbook de reingreso](workforce-reentry-recovery.md)). Desde PR #220 el CLI clasifica
`reentry_preserved` (`findReentryAfterExit` en `scripts/workforce/offboarding-recovery.ts`) y el executor devuelve
`reentry_detected` (`src/lib/workforce/offboarding/member-lifecycle.ts`), pero el guard no sustituye la lectura.

1. **Readback previo por sujeto**, antes de cualquier `--apply`: `person_legal_entity_relationships`,
   `contractor_engagements` y `compensation_versions` con fechas posteriores al `last_working_day` del caso. Si
   existe un episodio posterior —aunque la clasificación diga lane A—, **no tocar**: es un reingreso, no drift.
2. **Sujeto por sujeto, nunca la cohorte**: un `--member` por invocación, mostrando el «antes» (member, relación,
   compensación, obligaciones) y confirmando **por nombre** con el operador antes de escribir.
3. **El command de reversión existe antes que el directo.** Hoy la compensación de una baja incorrecta es
   `restoreOffboardingLifecycleAfterReentry` (`scripts/workforce/restore-offboarding-lifecycle.ts`); si para un
   efecto nuevo no hay reversión auditada, no se aplica.
4. Releer el sujeto después del apply (sección siguiente) antes de pasar al próximo.

## Readback (impreso después de cada dry-run y cada apply)

- Ventanas del resolver de elegibilidad de salida (`resolveExitEligibilityForMembers`) para los
  períodos de referencia del script (`2026-05` a `2026-09`): política de proyección, si requiere
  revisión, fecha de corte y warnings.
- Fila del `member` (`active`, `status`, `contract_end_date`).
- Obligaciones de Finance del beneficiario (`greenhouse_finance.payment_obligations`), **solo
  lectura** — el script nunca las modifica.

## Verificación post-apply

```bash
# Resolver de elegibilidad de salida, aislado (sin tocar casos)
pnpm payroll:exit-eligibility:smoke

# Señales en vivo — /admin/operations, rollup Identity & Access
# hr.offboarding.executed_member_still_active debe volver a 0 tras cerrar el lane A del caso corregido
# hr.offboarding.unresolved_exit_signal debe bajar en 1 tras cada revisión + ejecución del lane B
```

## Límites duros

- **Nunca** SQL manual para reactivar, desactivar o corregir un `member`, una relación legal o un
  caso de offboarding — siempre los commands canónicos vía este script o la API.
- **Nunca** emite pagos ni toca filas de Finance. Si una obligación se generó por error a partir de
  un caso mal clasificado, esa corrección la hace Finance con sus propios commands — no este flujo.
- **Nunca** infiere la causal (`separationType`) ni las fechas desde la fecha efectiva u otra
  heurística — el operador debe declararlas explícitamente; el script rechaza aplicar sin ellas.
- La reconciliación de Finance (obligaciones, conciliación de pagos ya emitidos) es un paso
  gobernado **separado**, fuera de este runbook.
- El clasificador de permisos del harness puede bloquear un `--apply` cuando lo ejecuta un agente
  (mutación de datos de personas de alto blast radius) — en ese caso el operador humano corre el
  comando directamente, no se fuerza el bypass.

## Rollback

Los efectos del executor (lane A) son **idempotentes**, no auto-reversibles desde este script. Si una
aplicación cerró por error la disponibilidad de una persona con episodio posterior vigente, la compensación
es el command `restoreOffboardingLifecycleAfterReentry` por el
[runbook de reingreso](workforce-reentry-recovery.md) (restaura member/asignaciones; **no** reabre una relación
employee terminada ni toca pagos). Cualquier otro error se corrige con una **nueva** decisión gobernada hacia
adelante (p. ej. una reincorporación real vía el flujo de alta), nunca con un `UPDATE` directo en PostgreSQL.

## Problemas comunes

- **El harness del agente bloquea el `--apply` o el DML.** El clasificador de permisos de Claude rechaza
  `UPDATE`/`DELETE` sueltos (psql/heredoc) y un `--apply` masivo sobre personas. Lo que sí pasa: un script
  `tsx --require ./scripts/lib/server-only-shim.cjs` que invoque los commands canónicos
  (`closeCompensationVigencyAtExit`, `reviewOffboardingCase`, `transitionOffboardingCase`) sujeto por sujeto, o
  que el operador ejecute él mismo el SQL/CLI. Una purga con predicado explícito corre con el perfil `ops`
  (`pnpm pg:connect:shell` → `\i scripts/workforce/purge-task1349-live-subjects.sql`). No forzar el bypass.
- **`Colaborador <uuid>` «sin contrato» en la pre-nómina.** Member inactivo con `compensation_versions` abierta.
  El 03/09 fueron los sujetos sintéticos de `review-execute.live.test.ts` (nombre `TASK-1349 live …`, correo
  `t1349-…@efeoncepro.com`): cerrar compensación por command y purgar con el script anterior; un `identity_only`
  ejecutado ya no los rescata al roster (`0233f81e7`). Si el uuid es una persona real, es un inactivo sin hecho de
  salida: abrir/revisar su caso, nunca calcular con él dentro.

## Snapshot histórico de la cohorte antes de aplicar (2026-09-03)

Snapshot tomado el día del release, antes de cualquier `--apply`; no representa pendientes actuales.
El cierre posterior de Maggie/María Fernanda está documentado arriba. Releer la cohorte antes de actuar:

| Colaborador | Situación | Detalle |
| --- | --- | --- |
| Valentina Hoyos | Lane A — salida real ejecutada, `member.active=true` | + stub SCIM obsoleto, señal 2026-07-14. **Tenía reingreso contractor 20/08: no era drift** (hoy `reentry_preserved`; desactivada por error y restaurada, ver disciplina arriba) |
| Luis Reyes | Lane A — salida real ejecutada, `member.active=true` | + stub SCIM obsoleto, señal 2026-05-13 |
| María Camila Hoyos | Lane A — salida real ejecutada, `member.active=true` | + stub SCIM obsoleto, señal 2026-06-01 |
| Felipe Zurita | Bloqueado, `identity_only`, sin revisión | Último día y fecha efectiva 2026-06-02; a la espera de que People declare la causal real antes de aplicar el lane B |
| Maria Fernanda Gonzalez | `draft` manual con fecha pasada (2026-07-29) | Decisión manual pendiente — HR aprueba o cancela por el flujo normal, no por este script |

Los 3 stubs SCIM obsoletos de Valentina, Luis y María Camila se cierran con lane B
`--decision access_only --access-revoked-on <fecha de la señal>` (informational, sin tocar
relación/compensación/member) — la salida real ya la cierra el lane A de su caso `executed`
correspondiente.

## Related

- `docs/tasks/in-progress/TASK-1349-offboarding-member-lifecycle-writeback.md`
- `docs/issues/open/ISSUE-117-offboarding-executed-never-deactivates-member-canonical.md`
- `docs/audits/payroll/FELIPE_OFFBOARDING_UI_AUDIT_2026-09-03.md`
- `docs/audits/payroll/OFFBOARDING_ROOT_CAUSE_AND_REMEDIATION_2026-09-03.md`
- `docs/manual-de-uso/hr/offboarding.md` §"Recuperación gobernada (TASK-1349)"
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` — `WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED`

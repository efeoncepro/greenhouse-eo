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

# Aplicar — Lane B: un caso de solo-acceso que en verdad era un término real
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

Los efectos del executor (lane A) son **idempotentes**, no auto-reversibles: no existe todavía un
command compensatorio auditado que reactive una relación legal cerrada o revierta
`members.active=false`. Si una aplicación fue un error, la corrección es una **nueva** decisión
gobernada hacia adelante (p. ej. una reincorporación real vía el flujo de alta), nunca un
`UPDATE` directo en PostgreSQL para "deshacer" el estado.

## Estado de la cohorte (2026-09-03, hechos de solo lectura)

Snapshot tomado el día del release, antes de cualquier `--apply`:

| Colaborador | Situación | Detalle |
| --- | --- | --- |
| Valentina Hoyos | Lane A — salida real ejecutada, `member.active=true` | + stub SCIM obsoleto, señal 2026-07-14 |
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

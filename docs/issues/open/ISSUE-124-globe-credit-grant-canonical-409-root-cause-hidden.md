# ISSUE-124 — Globe: grant adicional de créditos devuelve 409 sin causa de fase

## Ambiente

production (Globe API internal, workspace `greenhouse-org:efeonce`)

## Detectado

2026-07-24, durante el rollout de TASK-1553. El comando canónico `globe.credits.grant.issue` fue ejecutado con identidad válida, aprobación maker/checker, pool activo, y claves nuevas de idempotencia/source.

## Síntoma

Un grant adicional de 5000 créditos (también reproducciones acotadas de 1000 y 10) responde HTTP `409 conflict`. No se observa una mutación ledger nueva; el canary se financió con el grant gobernado existente de 10 créditos.

## Causa raíz

No hay un guard de “un solo grant activo” en `credit-administration-store.ts`. El store sí puede emitir `conflict` desde varias fases — pool no activo, replay fingerprint conflictivo, estado de grant, policy activa, o una colisión/constraint downstream — y `dispatch.ts` las proyecta al mismo 409 sanitizado. La evidencia actual permite descartar el supuesto de un guard de grant activo, pero no identifica cuál fase produjo el 409 live.

### Delta 2026-07-26 — la ambigüedad está localizada: es la taxonomía de crédito colapsada + la ausencia de `budget.evaluate` en `ui`

Medido contra el código de `efeonce-globe`, no razonado. **La causa de que el 409 no diga nada tiene dos mitades y las dos son deliberadas**, así que no se arregla mirando el store: se arregla dándole al operador un canal para la fase.

**Mitad 1 — `dispatch.ts` § `handlerErrorToApiCode` (~líneas 304-320) colapsa TRES clases de error de dominio en `conflict`:**

| Clase | Qué colapsa a `conflict` |
|---|---|
| `CreditLedgerError` | todo lo que no sea `dependency_unavailable` / `invalid_request` / `not_found` — o sea **`insufficient_balance` y `budget_denied`** |
| `CommercialCreditLifecycleError` | todo salvo `shape_required` — **`approval_stale`, `approval_invalid`, `hard_cap_exceeded`** |
| `CreditAdministrationError` | todo salvo `invalid_request` / `not_found` / `dependency_unavailable` — **incluyendo `maker_checker_required`** |

El comentario en el código declara la intención y es correcta: *"do not leak internal balances or policy details through the shared transport taxonomy"*.

🔴 **El tercer renglón es el hallazgo nuevo respecto de lo que este issue registró, y explica el reporte original.** Este issue dice que el comando corrió *"con aprobación maker/checker"*. Con esta taxonomía, **una aprobación vencida, con digest que no calza, o con proponente igual al ejecutor devuelve EXACTAMENTE el mismo 409 que un `pool_paused`**. `maker_checker_required` es indistinguible de una fase del store desde afuera. O sea: la hipótesis "la aprobación era válida" no está probada por el 409 — es indistinguible de su negación.

Y el chequeo de maker-checker tiene una propiedad que agrava el diagnóstico: `approval()` en `packages/domain/src/credit-administration.ts` compara `approval.proposedBy` contra `context.actor.principalId`, que para un caller de workload es la **constante** `'globe:service:internal-caller'` (`apps/studio-web/src/app.ts:3503`). Cualquier `proposedBy` distinto de esa constante pasa ese término trivialmente, así que lo único que puede haber fallado es la **expiración** o el **digest** — y ninguno de los dos se distingue en la respuesta.

**Mitad 2 — el desambiguador existe y está fuera de alcance.** `globe.credits.budget.evaluate` devuelve un `reason` tipado (`pool_paused | pool_exhausted | project_cap_exceeded | month_cap_exceeded | policy_unavailable`) y `budget.availability.get` devuelve `policyAvailable` vs `ledgerAvailable`. **Los dos están `policy-blocked` en la superficie `ui`** (`packages/domain/src/credit-administration.ts:33`): sólo se consultan por el lane privado. Fue así como en la sesión del 2026-07-26 se pudo aislar el bloqueo del mes — sondeando por el lane privado, no por el camino del operador.

**Conclusión:** el 409 no es ambiguo por un bug del store. Es ambiguo porque **la taxonomía compartida del transporte fusiona negaciones de crédito de tres orígenes distintos, a propósito, y el único canal que las distingue no está disponible para quien tiene que diagnosticar.** Instrumentar una razón de fase en el store, como pedía la sección Solución, es necesario pero **no suficiente**: sin propagarla por el transporte y sin habilitar los readers, la fase muere en `handlerErrorToApiCode`.

## Impacto

Bloquea agregar presupuesto operativo por el path administrativo canónico y deja el operador sin diagnóstico accionable. No bloquea el canary si existe saldo gobernado previo.

## Solución

Instrumentar una razón de conflicto segura por fase (sin exponer SQL, credenciales ni payloads sensibles), agregar tests de emisión con pool activo + source/idempotency nuevos, y reproducir contra el runtime tras el deploy. Mantener la prohibición de inserts directos al ledger y no relajar la idempotencia.

### Delta 2026-07-26 — la solución tiene dueño y es el Slice 1 de `TASK-1566`

La razón de fase **no alcanza si vive sólo en el store**: muere en `handlerErrorToApiCode`. La solución completa son tres movimientos, y quedaron adoptados como el **Slice 1 de `TASK-1566`** (implementación de **ADR-015**, `docs/architecture/creative-studio/EFEONCE_GLOBE_GREENHOUSE_ADMINISTRATION_DECISION_V1.md`), que además es su **primer** slice porque sin él el diagnóstico de todo el carril nuevo es ciego:

1. **`CreditAdminDenialPhaseV1` como enum cerrado** en `packages/contracts` — `approval_stale | approval_invalid | maker_checker_required | pool_paused | pool_exhausted | month_cap_exceeded | project_cap_exceeded | policy_unavailable | replay_fingerprint_mismatch`. Un enum cerrado y no prosa: sin SQL, sin saldos, sin payload. **El 409 sigue siendo 409** — lo que cambia es que declara la fase.
2. **`handlerErrorToApiCode` propaga la fase** junto al `conflict`, sin cambiar el status HTTP ni relajar la sanitización.
3. **`globe.credits.budget.evaluate` y `budget.availability.get` pasan a `ui: available`** para principals de administración. Que el desambiguador viva fuera del alcance de quien tiene que diagnosticar **es el bug, no una protección**.

Además, ADR-015 hace que el `propose` del comando gobernado de fondeo **incluya la evaluación en el plan**, así que el operador ve *por qué* está bloqueado **antes** de proponer, en vez de después de un 409.

**Lo que sigue abierto y NO lo cubre `TASK-1566`:** decidir si el guard de "un solo grant activo" es política deseada, o si el 409 live venía de otra fase — pregunta que el Slice 1 vuelve **observable** y por lo tanto contestable con evidencia en vez de con hipótesis.

## Verificación

El mismo request con source/idempotency nuevos debe devolver `200` y producir exactamente un grant/allocación; un replay idéntico debe ser idempotente; un fingerprint distinto debe seguir devolviendo `409` con código estable y fase observable para el operador.

## Estado

open — **causa de la ambigüedad identificada y con dueño (2026-07-26)**. La mitad de diagnóstico la cierra el Slice 1 de `TASK-1566`; la pregunta del guard de "un solo grant activo" sigue abierta y se vuelve contestable con ese slice.

## Relacionado

TASK-1553; **TASK-1566** (dueño de la solución de diagnóstico, Slice 1); **ADR-015** (`docs/architecture/creative-studio/EFEONCE_GLOBE_GREENHOUSE_ADMINISTRATION_DECISION_V1.md`, § `Y una pieza de ISSUE-124 que esta sesión resuelve` + Decisión punto 9); ADR-014 § Delta 2026-07-26 (4); ADR-009; `apps/studio-web/src/dispatch.ts` § `handlerErrorToApiCode`; `packages/domain/src/credit-administration.ts` (`approval()` + `COVERAGE`); `packages/database/src/stores/credit-administration-store.ts`; migration `0023_credit_receipt_command_grain.sql`.


### Delta 2026-07-26 (2) — la mitad de diagnóstico quedó CERRADA (TASK-1566, cerrada); la mitad operativa tiene dueña: TASK-1586

La fase de negación server-side existe y está desplegada (`CreditDenialPhaseV1` como enum cerrado:
`pool_not_active`, `policy_already_active`, `replay_fingerprint_mismatch`, `approval_expired`,
`approval_invalid`, `approval_self_confirmed`, `grant_state_conflict`, `version_conflict`, etc.) —
ningún `conflict` del store sale sin fase declarada, y el carril de fondeo gobernado
(`propose`/`confirm`) corrió end-to-end el 2026-07-26.

**Lo que mantiene este issue abierto** es la mitad operativa: que el OPERADOR, con su sesión, pueda
leer la razón vigente sin impersonar el workload caller. Eso es `TASK-1586` (ADR-015 Slice F: rutas
broker para `budget.evaluate` + `budget.availability.get`). Este issue se cierra con esa task.

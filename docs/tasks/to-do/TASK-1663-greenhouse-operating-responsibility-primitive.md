# TASK-1663 — Operating responsibility: primitive canónico org × módulo (accountability, NO autorización)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Materializa el operating mode (`efeonce-managed` | `co-operated` | `client-operated`) como snapshot
de accountability append-only versionado, con alcance **organización × módulo**. Replica el contrato
ya desplegado en Globe, incluida su regla dura: **nunca es input de autorización**.

## Why This Task Exists

El vocabulario ya es canónico en `EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md`, que además fija
que *"el operating mode puede cambiar por lane o etapa; no se infiere automáticamente del delivery
model"* — o sea que la dimensión real es **org × lane**, no org sola.

Globe ya lo materializó (`OperatingResponsibilityAssignmentV1`, SPEC-008, desplegado). Pero vive en
el Postgres de Globe y Greenhouse ni lo lee ni guarda copia: correcto por boundary, e inútil para
los módulos de Greenhouse. En Greenhouse, `src/lib/commercial/delivery-model.ts` existe pero es de
**cotización**, no de operating mode. Y verificado el 2026-08-07: `grep` de operating-mode en
`src/lib/growth/` da **cero**.

El disparador concreto: `TASK-1659`/`TASK-1660` necesitan saber quién declara las keywords objetivo
de un cliente, y la respuesta depende del modo. Sin primitive, ese módulo inventaría el suyo — y el
siguiente otro, hasta tener N respuestas incompatibles a *"¿este cliente es co-operated?"*. Es la
forma de módulo del pecado de identidad paralela.

## Goal

- Un solo lugar responde qué modo opera una organización en un módulo, y desde cuándo.
- Cambiar el modo **no** cambia lo que nadie puede hacer — probado por test, no por convención.
- La ausencia de asignación es un estado cerrado explícito, nunca un default inferido.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_OPERATING_RESPONSIBILITY_DECISION_V1.md` — **el ADR de esta task**
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_OPERATING_RESPONSIBILITY_V1.md` — el precedente
- `docs/business-models/EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md` — el canon del vocabulario

Reglas obligatorias (del ADR, verbatim):

- 🔴 **NUNCA input de autorización.** Un cambio de modo no agrega ni quita capabilities.
- **NUNCA inferir el modo.** Ausencia = estado cerrado explícito.
- **NUNCA** precio, costo, moneda ni margen en este contrato.
- **NUNCA** `UPDATE` ni `DELETE`: una corrección es una versión nueva.
- **NUNCA** como columna de `module_assignments`.

## Normative Docs

- `docs/architecture/GREENHOUSE_OPERATING_RESPONSIBILITY_DECISION_V1.md`

## Dependencies & Impact

### Depends on

- `greenhouse_core.organizations` — el `organization_id`
- `greenhouse_client_portal.module_assignments` + `modules` — el `module_key` y el acceso

### Blocks / Impacts

- `TASK-1659` / `TASK-1660` — primeros consumidores; sus deltas ya declaran que consumen esto
- Cualquier módulo futuro que necesite la distinción (AEO, Creative, Delivery)

### Files owned

- `migrations/[nueva]-task-1663-operating-responsibility.sql`
- `src/lib/platform/operating-responsibility/**`
- `src/app/api/admin/platform/operating-responsibility/**`

## Current Repo State

### Already exists

- `greenhouse_client_portal.module_assignments` (`organization_id` + `module_key` + `status` +
  ventana `effective_from`/`effective_to`) — la clave que este primitive reusa como scope
- `can(subject, capability, action, scope)` en `src/lib/entitlements/runtime.ts` — el eje que esta
  task **no** toca
- El contrato de Globe como referencia de forma (otro repo, otro scope, no se lee)

### Gap

- Ninguna representación de accountability en Greenhouse
- `src/lib/commercial/delivery-model.ts` cubre cotización, no operating mode
- Ningún módulo de producto conoce el concepto

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/platform/operating-responsibility/`
- Future candidate home: `domain-package`
- Boundary: commands y readers canónicos son el único acceso; ningún módulo consulta la tabla
  directo ni deriva capabilities del modo
- Server/browser split: commands, readers y persistencia son server-only; el navegador recibe el
  modo ya resuelto dentro del VM y nunca la asignación cruda con sus actores de registro
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration`
- Source of truth afectado: tabla nueva de asignaciones versionadas
- Consumidores afectados: módulos de producto (`UI`, `MCP`), reporte
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: `module_assignments` no se toca; `can(...)` no se toca
- Contrato nuevo o modificado: `assignOperatingResponsibility`, `changeOperatingResponsibility`,
  `readEffectiveOperatingResponsibility`, `readOperatingResponsibilityHistory`
- Backward compatibility: `compatible` — todo aditivo; sin asignación todo se comporta como hoy
- Full API parity: los 3 lanes en el mismo PR. ⚠️ La **escritura** es de una clase de blast-radius
  nueva (gobierno de accountability): evaluar en Discovery si merece su propio scope MCP o si entra
  en uno existente, según la regla de **un scope por clase**, no por capability

### Data model and invariants

- Entidades/tablas/views afectadas: tabla de asignaciones (nueva), en el schema que Discovery defina
- Invariantes que no se pueden romper:
  - **Append-only** con versión monótona por `(organization_id, module_key)`
  - **Fail-closed**: sin asignación vigente, el reader devuelve un estado "no declarado" explícito;
    jamás un modo por default
  - **Política de modo validada antes de persistir**: `efeonce-managed` exige operador y dueño de
    delivery del lado Efeonce; `client-operated`, del lado cliente; `co-operated`, al menos una
    responsabilidad de cada lado. Una asignación que se contradice **no se guarda**
  - **Cero campos comerciales.** Si aparece un `amount` en el diseño, está mal el diseño
  - Idempotencia por clave de request con **fingerprint de intención**: reusar la clave con otra
    intención es `conflict`, no un segundo snapshot silencioso
  - Concurrencia optimista por `expectedVersion`
- Tenant/space boundary: toda lectura y escritura lleva el `organization_id` de la sesión; selección
  cross-org denegada antes del store
- Idempotency/concurrency: advisory lock transaccional para asignar versión
- Audit/outbox/history: audit en la **misma transacción** que la asignación; sin payload crudo, sin
  PII, sin precio

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: sin filas. **No hay backfill**: la ausencia es un estado válido y declarado
- Backfill plan: ninguno. Declarar retroactivamente un modo que nadie acordó sería inventar un hecho
- Rollback path: deshabilitar el cableado y **preservar tabla e historia**; nunca `DROP` de evidencia
- External coordination: `N/A — repo-only change`

### Security and access

- Auth/access gate: capabilities propias `manage` / `read`, **separadas** de las de cualquier módulo
- Sensitive data posture: actores de registro son identidades internas/cliente; nunca se expone el
  actor crudo a un consumer sin necesidad
- Error contract: `invalid_request` · `not_found` · `conflict` · `forbidden` canónicos; sin errores
  crudos de DB al transporte
- Abuse/rate-limit posture: volumen bajo por naturaleza; sin límite dedicado

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/platform/operating-responsibility`
- DB/runtime checks: sanity contra PG real — versión monótona, replay idempotente, conflicto de
  fingerprint, política de modo rechazada, aislamiento cross-org
- Integration checks: `n/a`
- Reliability signals/logs: señal de módulos asignados **sin** responsabilidad declarada — no es un
  error, es una pregunta pendiente para comercial, y sin señal nadie la ve
- Production verification sequence: ver Zone 3

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema y política

- Tabla de asignaciones versionadas append-only, clave `(organization_id, module_key, version)`
- CHECK de vocabulario cerrado para modo y para `party`
- Las 5 responsabilidades nombradas: autoridad del brief, operador de registro, aprobador de
  presupuesto, dueño del delivery, aprobador del delivery
- Bloque `DO` anti pre-up-marker + GRANTs + `pnpm db:generate-types`

### Slice 2 — Commands y readers

- `assign` / `change` con idempotencia por fingerprint y `expectedVersion`
- Validación de política de modo **antes** de persistir
- `effective` (fail-closed) e `history`
- Asignación + audit en una sola transacción

### Slice 3 — Exposición y el guardrail

- Los 3 lanes: app-lane, ecosystem y MCP
- 🔴 **El test que sostiene toda la decisión**: cambiar el modo de una org **no** altera el
  resultado de `can(subject, capability, action, scope)` para ningún sujeto. Sin este test, la regla
  dura es una frase en un doc
- Test de aislamiento cross-org
- Señal de módulos asignados sin responsabilidad declarada

## Out of Scope

- **Cualquier UI.** La superficie de administración va aparte, cuando exista el contrato
- Override de scope más fino (por período o lane interno) — aditivo cuando aparezca la necesidad
- Sincronizar con el contrato comercial o derivarlo de la firma de un SOW
- Que el cliente vea su propia asignación desde el portal
- Migrar o leer el modelo de Globe. Son scopes y dueños distintos; el boundary se respeta

## Detailed Spec

**Por qué no hay default por modo.** Decidido con el operador el 2026-08-07: cada engagement declara
sus responsabilidades explícitamente. Un default parece cómodo y es exactamente lo que hace que
nadie las revise; y en `co-operated` el reparto real varía por cliente, que es justamente el modo
donde más importa saberlo.

**Por qué cinco responsabilidades y no las ocho de Globe.** Globe suma creative approver, template
authority y rights authority porque su dominio las tiene. Copiarlas acá sería cargo cult: cada
responsabilidad que se declara es trabajo de comercial en cada engagement, y una que nadie usa se
llena al azar y contamina el dato.

**El test del Slice 3 es el entregable más importante de la task.** La regla "el modo nunca
autoriza" es fácil de escribir y fácil de violar sin darse cuenta — basta que alguien haga
`if (mode === 'client-operated') return true` en un guard. El test lo convierte en algo que rompe el
build.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3, estricto.
- 🔴 El test de no-autorización del Slice 3 **no se difiere**. Si la task se corta por tiempo, se
  corta el lane MCP, nunca ese test: sin él se puede shipear una regresión de seguridad en silencio.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Alguien deriva capabilities del modo | identity / seguridad | **high** | regla dura en el ADR + test de no-autorización que rompe el build | un guard que branchea por modo |
| Un módulo consulta la tabla directo y deriva su propia semántica | plataforma | medium | commands/readers como único acceso + revisión | SQL a la tabla fuera del primitive |
| Se backfillea un modo "razonable" y se inventa un acuerdo | data quality | medium | sin backfill por diseño; la ausencia es válida | filas con fecha anterior a la task |
| El modo se usa como canal para meter datos comerciales | modelo | medium | CHECK de columnas + regla dura; si aparece un `amount`, está mal el diseño | campos monetarios en el schema |
| Nadie declara nada y el primitive queda muerto | producto | medium | señal de módulos sin responsabilidad declarada | la señal en cero uso a los 30 días |

### Feature flags / cutover

Sin flag: la tabla nace vacía y el reader es fail-closed, así que sin asignaciones el
comportamiento es idéntico al de hoy. El cutover real es por organización, cuando comercial declara.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR; la tabla queda vacía y sin consumers | < 10 min | sí |
| Slice 2 | revert PR; sin escrituras, nada que preservar | < 10 min | sí |
| Slice 3 | revert PR del cableado; **la tabla y su historia se preservan** | < 10 min | sí |

### Production verification sequence

1. `pnpm migrate:up` + verificar tabla, CHECKs e índices.
2. Sanity contra PG real: versión monótona, replay idempotente, conflicto de fingerprint, política
   de modo rechazada, aislamiento cross-org.
3. Verificar que **sin asignaciones** ningún comportamiento existente cambió.
4. Declarar una asignación real sobre una org de prueba por los 3 lanes.
5. Correr el test de no-autorización con esa asignación viva.

### Out-of-band coordination required

Ninguna técnica. **Sí organizacional**: alguien de comercial/delivery tiene que declarar las
asignaciones reales; el primitive sin uso no sirve. La señal de módulos sin responsabilidad
declarada existe para hacer visible esa deuda.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe la tabla append-only versionada con clave `(organization_id, module_key, version)`
- [ ] El reader es **fail-closed**: sin asignación devuelve un estado "no declarado" explícito
- [ ] Una asignación que contradice su propio modo **no se persiste**
- [ ] Ningún campo comercial (precio, costo, moneda, margen) en el schema
- [ ] Replay idempotente devuelve el snapshot original, sin segunda versión ni segundo audit
- [ ] Reusar una clave de idempotencia con otra intención devuelve `conflict`
- [ ] 🔴 **Existe un test que prueba que cambiar el modo NO altera el resultado de `can(...)`**
- [ ] Aislamiento cross-org probado
- [ ] Asignación y audit ocurren en la misma transacción
- [ ] Los 3 lanes exponen commands y readers; ningún módulo consulta la tabla directo
- [ ] Existe la señal de módulos asignados sin responsabilidad declarada

## Verification

- `pnpm vitest run src/lib/platform/operating-responsibility`
- `pnpm tsx scripts/platform/_sanity-task-1663-operating-responsibility.ts` contra PG real
- `pnpm lint` · `pnpm typecheck` · `pnpm build`
- `pnpm migrate:status`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado

## Follow-ups

- Superficie de administración de asignaciones.
- Override de scope más fino, si aparece la necesidad.
- Que el cliente vea su propia asignación en `client-operated`.
- Proponer la asignación desde la firma de un SOW, en vez de declararla a mano.

# Greenhouse Canonical Patterns V1 (TASK-1160 Slice 4)

> **Tipo:** catálogo de los 6 patrones de implementación canónicos que se repiten
> a través de los dominios. Es el **único lugar** que describe cada patrón "de
> fondo"; las specs/companions de cada dominio aplican el patrón con sus
> particularidades y citan las tasks-fuente, pero la **forma canónica** vive acá.
> **Cuándo leerlo:** al implementar un dominio nuevo o extender uno existente —
> antes de inventar una forma propia para algo que ya tiene patrón.
>
> Esto NO reemplaza la spec de cada dominio (que tiene los nombres de helpers,
> tablas y signals reales). Es la abstracción compartida. Si un dominio se desvía
> del patrón, debe justificar por qué (Solution Quality Operating Model).

---

## 1. VIEW canónica + helper + reliability signal + lint rule

**Cuándo:** cuando un cálculo (un agregado, una "columna compuesta de N mecanismos
legítimos", una normalización CLP/FX, una clasificación) **no debe re-derivarse**
en cada consumer porque la divergencia es un bug de integridad.

**Forma canónica (4 piezas que se mueven juntas):**

1. **VIEW PG canónica** (`CREATE OR REPLACE VIEW`) que encapsula el cálculo una vez.
2. **Helper TS** (`src/lib/<dominio>/*.ts`) que es la **única** fuente de lectura del cálculo.
3. **Reliability signal** (`kind=drift`, severity error si count>0, **steady=0**) que detecta divergencia/drift.
4. **Lint rule** (`greenhouse/no-untokenized-*`, modo `error`) que bloquea el anti-patrón inline en código nuevo, con override-block que exime al helper canónico.

**Reglas duras:** **NUNCA** re-derivar el cálculo inline en un consumer ni branchear
la lógica por caso. **SIEMPRE** que emerja un mecanismo nuevo, extender las 4 piezas
en el mismo PR (no una sola).

**Fuente:** TASK-571 (income settlement reconciliation), 699 (FX P&L), 766 (CLP reader),
774 (account balances FX), 768 (economic category), 720 (bank KPI), 709 (labor allocation).

---

## 2. State machine + CHECK + audit trio append-only

**Cuándo:** un agregado con **lifecycle** (estados) que requiere integridad de
transiciones + trazabilidad forensic.

**Forma canónica (trío):**

1. **Tabla mutable** con `status` + **CHECK** del enum cerrado + **trigger `BEFORE UPDATE`** que valida la transición contra una matriz — **espejo exacto** de una matriz TS `assertValid<X>Transition` (mover juntos: TS + trigger).
2. **Tabla `*_events`/`*_transitions` append-only** con triggers anti-UPDATE/anti-DELETE (audit forensic).
3. **Commands dual-mode** (`client?: PoolClient`), atómicos, que emiten **outbox v1 + audit row in-tx**.

**Reglas duras:** **NUNCA** transicionar fuera de la matriz canónica (enforced en TS
**y** en el trigger DB); **NUNCA** UPDATE/DELETE el audit log (forward-fix con fila
nueva); **NUNCA** mutar el estado por SQL directo (pasa por el command).

**Fuente:** TASK-700 (account number allocator), 765 (payment orders), 790/792/793
(contractor engagements/submissions/payables), 848 (release manifests), 908 (task status transitions).

---

## 3. Outbox event v1 + reactive consumer (re-lee de PG) + dead-letter signal

**Cuándo:** un **side effect downstream** (projection a BigQuery, bridge a otro
dominio, materialización, cache invalidation) que **NO debe correr inline** en el
request handler (latencia, acoplamiento, falla que mata el response).

**Forma canónica:**

```text
tx PG (write + publishOutboxEvent(event, client))   ← atómico
  → outbox publisher (Cloud Scheduler + ops-worker, NO Vercel cron)
    → reactive consumer (ProjectionDefinition):
        re-LEE la entidad de PG por entityId  ← NUNCA confía el payload
        idempotente (MERGE/UPSERT por PK natural)
        on fail → retry exponencial → dead-letter
  → dead-letter reliability signal (steady=0)
```

**Reglas duras:** **NUNCA** ejecutar MERGE/UPDATE/INSERT BigQuery (ni un bridge HTTP
sincrono) dentro de un route handler; **NUNCA** confiar el payload del evento como
source of truth (re-leer de PG por el `entityId` del scope); **NUNCA** propagar una
falla downstream como 5xx cuando la primary store (PG) ya commiteó.

**Fuente:** TASK-771 (finance supplier BQ projection), 773 (outbox publisher Cloud
Scheduler), 793 (contractor payables → Finance bridge), 878 (hubspot companies async).

---

## 4. Defense-in-depth N-layer + degradación honesta

**Cuándo:** un flujo **crítico** (auth, secrets, connection pooling, provisioning,
ledger health) que no puede romper y cuyo fallo silencioso es peligroso.

**Forma canónica:** N capas **independientes** que cubren el mismo fallo desde
ángulos distintos — validación en el boundary + helper canónico + reliability signal
+ lint rule + recovery command auditado. Cada capa **degrada honesto**: un estado
`degraded` con la **razón**, NUNCA un `$0`/`healthy` falso que esconde el problema.

**Reglas duras:** **NUNCA** colapsar un error a "0/healthy" silencioso (un check que
falla se reporta como `degraded`, no como "sin datos"); **NUNCA** `Sentry.captureException`
directo (usar `captureWithDomain(err, '<dominio>', ...)`); **NUNCA** exponer
`error.message`/stack/PII crudo al cliente (`redactErrorForResponse` + canonical error es-CL).

**Fuente:** TASK-742 (auth resilience 7-layer), 846 (postgres connection pooling),
872 (SCIM provisioning), 929 (ledger drift honest degradation).

---

## 5. Capability ⇒ grant en runtime.ts mismo PR + coverage guard

**Cuándo:** agregar una **capability** nueva que se chequea vía `can()`.

**Forma canónica (mismo PR):**

1. Entry en el **catalog TS** (`src/config/entitlements-catalog.ts`).
2. **Seed DB** en `greenhouse_core.capabilities_registry` (migración).
3. **Grant en `src/lib/entitlements/runtime.ts`** a ≥1 **rol REAL** (de `src/config/role-codes.ts`).

El guard `src/lib/entitlements/capability-grant-coverage.test.ts` (CI) **rompe el
build** si una capability `can()`-checked no tiene grant.

**Reglas duras:** **NUNCA** `can()`-checkear una capability sin grant en el mismo PR
(queda 403 para todos, incluido admin); **NUNCA** citar un rol que no exista en
`role-codes.ts` — los roles fantasma `DEVOPS_OPERATOR`/`HR_ADMIN`/`commercial_admin`/`operations`
**no existen** y colapsan a `EFEONCE_ADMIN`/`HR_MANAGER`; **NUNCA** branchear
`roleCodes.includes(...)` inline (usar `can()`).

**Fuente:** TASK-873 (capability runtime grant invariant), 935 (governance reconciliation + guard).

---

## 6. Feature flag default-OFF + staging shadow + flip gated

**Cuándo:** un **cambio de comportamiento riesgoso** (cutover de un cálculo,
nueva ruta de pago/settlement, writeback productivo, gate de payroll).

**Forma canónica:** flag **default `false`** (comportamiento byte-idéntico al merge —
parity, cero riesgo al shippear) + **shadow mode** que mide el delta contra el camino
legacy + **flip a `true` SOLO** tras: staging shadow ≥7-30 días verde, reliability
signal en steady, y **sign-off humano** (HR/Finance para flujos de plata) documentado.
Las **dependencias de flag** son explícitas (flag B requiere flag A en el mismo env).

**Reglas duras:** **NUNCA** flip en producción sin shadow + sign-off; **NUNCA** default
`true` en el código (la activación es config/env, no deploy — rollback = flag flip);
**NUNCA** activar un flag dependiente sin su flag padre.

**Fuente:** TASK-872 (SCIM intake gate), 890 (exit eligibility), 893 (participation window),
895 (leave accrual), 916 (RpA V2 writeback), 977 (contractor settlement).

---

## Cómo extender este catálogo

Si emerge un **7º patrón** genuinamente transversal (se repite ≥3 dominios), agregarlo
acá con la misma estructura (cuándo / forma canónica / reglas duras / fuente) y
registrarlo en `DECISIONS_INDEX.md`. Si es específico de un dominio, vive en su spec,
no acá.

# Greenhouse Canonical Patterns V1 (TASK-1160 Slice 4)

> **Tipo:** catálogo de los 8 patrones de implementación canónicos que se repiten
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

## 7. Detector a la altura del defecto: señal si la condición la crea un DATO, gate con expectativa DERIVADA si la crea un commit

**Cuándo:** emergió un defecto y hay que elegir **con qué instrumento** se impide que vuelva.
Es la pregunta **anterior** a escribir el test/lint/gate/señal, y no es la misma que "¿qué patrón
uso?": acá se decide *dónde vive el detector* y *de dónde saca su expectativa*. Elegir mal produce
un instrumento que se ve como cobertura y no cubre nada.

**Forma canónica — dos preguntas en orden:**

1. **¿Quién puede crear la condición defectuosa: un commit o un `INSERT`?**
   - **Un commit** (una import prohibida, una capability `can()`-checked sin grant, una `page.tsx`
     sin nav, un `*_ENABLED` sin fila en el ledger, un `-- Up Migration` ausente) → **instrumento de
     CI**: test, lint rule o gate. Corre en el mismo lugar donde nace la condición.
   - **Un cambio de dato** (un assignment de módulo, una fila nueva que trae una integración, un
     usuario provisionado por SCIM, un backfill, un pago registrado) → **reliability signal**
     (`steady=0`, severidad proporcional al daño, remediación nombrada en el reader). Ningún gate de
     código la puede ver: **el deploy que la activa no existe**.
2. **La expectativa del instrumento se DERIVA de la misma fuente que el producto** — nunca se
   congela como lista de resultados esperados. Mismo origen, **camino de lectura distinto** (SQL
   directo contra el reader con su cache; filesystem contra el manifest; parseo del código contra el
   catálogo). Así el instrumento verifica el invariante y sobrevive a cualquier consumer,
   organización o assignment nuevo.

**Reglas duras:**

- **NUNCA** escribir un test para una condición que sólo un cambio de dato puede crear. Los dos
  finales posibles son malos: o su premisa es falsa y se vuelve una lista de exenciones legítimas
  que se podre, o pasa verde para siempre mientras el defecto se ve en producción. Caso fuente: un
  test que exigiera página materializada por cada viewCode del `VIEW_REGISTRY` habría nacido con
  **10 exenciones legítimas** (el registry declara superficies forward-looking a propósito); se
  escribió y se descartó. El instrumento correcto fue la señal
  `identity.client_portal.assigned_view_without_route`: el riesgo no está en **declarar** la
  superficie, está en **asignarla**.
- **NUNCA** dejar sin detector una condición data-authored porque "el gate de código está verde".
  Los gates de CI son ciegos por construcción a lo que crea un `INSERT`, y el par
  `route-reachability-gate` (página→enlace) / `assigned_view_without_route` (enlace→página) es el
  ejemplo de cómo un lado puede reportar cero huérfanas mientras el otro renderiza un enlace muerto
  a usuarios reales.
- **NUNCA** hardcodear la expectativa de un gate como snapshot de resultados. El síntoma es que el
  gate se pone **rojo por comportamiento correcto** y la salida fácil es editar los esperados uno por
  uno; después de la primera edición ya no prueba que el motor funcione — prueba que el primer
  consumer sigue igual. Caso fuente: `scripts/identity/client-portal-page-access-check.ts` fijaba
  "3 rutas abren y 6 muestran empty state"; al asignarle un módulo a una organización reportó **4
  desvíos por hacer lo correcto**. Se corrigió derivando la expectativa de los mismos datos que lee
  el producto (vista base **o** viewCode declarado por un módulo vigente de esa organización).
- **NUNCA** generalizar la regla anterior a los baselines visuales. Un gate de píxeles (`ui:visual-gate`,
  `composer:visual-gate`) **sí** es legítimamente un snapshot, porque no hay fuente de la cual derivar
  el render esperado; ahí la disciplina equivalente es que un **rebaseline se declara** (`BASELINE_DELTAS.md`),
  nunca se edita en silencio.
- **SIEMPRE** que el detector sea una señal, que reporte el estado **honesto** al nacer. Si al crearse
  cuenta 1, ése es el valor correcto: hay un defecto vivo en producción, y nombrarlo es el punto
  (patrón 4 — degradación honesta). Meterlo en un allowlist para que nazca en verde es volver al
  snapshot.

**Fuente:** señal → TASK-1679 follow-up (`client-portal-assigned-view-without-route`), TASK-877
follow-up (`identity-notion-bridge-coverage`), TASK-878/CLAUDE.md (`workforce-unlinked-internal-users`),
TASK-991 (`commercial-organization-type-lifecycle-drift`), TASK-929 (ledger drift).
Expectativa derivada → TASK-1679 Slice 7 (client portal page access check), TASK-935
(`capability-grant-coverage.test.ts` parsea los `can()` reales en vez de listar capabilities),
TASK-982 (`route-reachability-gate` deriva del filesystem, no de una lista de rutas),
feature-flags-audit (deriva de los `*_ENABLED` en código contra el ledger).

---

## 8. Hecho declarado al nacer + copia derivada donde se filtra + obligación de propagar

**Cuándo:** un **hecho sobre el dato mismo** —su procedencia, su audiencia, su naturaleza
económica— que cumple dos condiciones: **no se puede reconstruir después** (es histórico:
ninguna VIEW infiere a posteriori que una fila la sembró un smoke test) y los **readers
filtran** por él. Es la contracara del patrón 1: ahí el cálculo se computa una vez en una
VIEW y se lee read-time; acá el hecho se **persiste en el write** porque read-time no
existe la información. La pregunta previa es honesta: si el hecho **sí** es derivable de
lo que ya está en la fila, esto es el patrón 1 y no esta entrada.

**Forma canónica (3 piezas):**

1. **Declaración en el nacimiento, en la(s) raíz(ces) canónica(s)**, como columna
   **ortogonal** a la dimensión que ya existe —procedencia ≠ canal de llegada (`source`);
   categoría económica ≠ tipo fiscal (`expense_type`)—, con cero sobrescritura: las dos
   coexisten en la misma fila. El **default falla hacia lo detectable, nunca hacia lo que
   oculta**: `data_origin` default `real` hace que omitir la declaración produzca suciedad
   evidente en el desk, mientras el default inverso escondería un candidato real en
   silencio; Finance resuelve lo mismo dejando `NULL` + manual queue en vez de un default
   sesgado. Una raíz ilegible degrada hacia el valor visible, no hacia el que purga.
2. **Copia denormalizada donde los readers filtran**, mantenida por trigger, porque
   obligar a un JOIN a las raíces en cada lectura es el invariante que se olvida en el
   reader número once (y en el filtro pre-LLM de Knowledge el JOIN ni siquiera es una
   opción barata). Cuando la fila derivada tiene **varias** raíces, la resolución se
   declara y es **la más protectora**, para que nunca quede sujeta a una purga más
   agresiva que la de sus raíces.
3. **Marcar una raíz obliga a propagar en la misma transacción.** El trigger es `BEFORE
   INSERT OR UPDATE` **de la fila dependiente**: marcar sólo la raíz no lo dispara, así que
   sin propagación explícita la copia queda obsoleta **en el 100 % de los marcados y en
   silencio**. El command toca las dependientes in-tx (el toque no-op `SET col = col` basta
   para que el trigger recalcule) y el patrón exige además una **señal de divergencia
   raíz↔derivada** con steady 0 — señal y no gate de CI, porque la condición la crea un
   `UPDATE`, no un commit (patrón 7).

**La bifurcación de confianza es obligatoria y explícita:** si el flujo **no** puede
sostener la pieza 3 (la copia se refresca sólo al publicar y lagea tras una transición
posterior), entonces los readers críticos **leen la raíz viva, no la copia** —Knowledge
filtra policy/status contra el documento vivo y usa el chunk denormalizado sólo para lo
que tolera lag—. Lo prohibido es el tercer camino: filtrar por una copia que nadie se
obligó a mantener.

**Reglas duras:** **NUNCA** dejar que la fila derivada elija su propio valor (lo deriva el
trigger desde las raíces, con precedencia declarada y espejada en el contrato TS);
**NUNCA** marcar una raíz sin propagar a las dependientes en la misma transacción;
**NUNCA** filtrar por la copia denormalizada cuando el flujo no garantiza su frescura
(leer la raíz viva); **NUNCA** un default que falle hacia ocultar; **NUNCA** dejar la
divergencia raíz↔derivada sin señal steady 0.

**Fuente:** TASK-768 (Finance `economic_category` ortogonal a `expense_type`, write-time
persistido tras descartar explícitamente la lente derivada read-time; señal
`economic_category_unresolved`), TASK-1739 (Hiring `data_origin` — raíces
`identity_profiles` + `talent_demand`/`hiring_opening`, copia en `hiring_application`
vía `derive_hiring_application_data_origin()`, propagación in-tx en
`src/lib/hiring/data-origin/mark.ts`, señal
`hiring.data_quality.data_origin_derivation_drift`), TASK-1083 (Knowledge: chunks
denormalizan `audience`/`sensitivity`/`freshness`/`agentic_policy` para filtrar pre-LLM
sin JOIN, y el filtro crítico lee el documento vivo porque la copia puede lagear).

---

## Cómo extender este catálogo

Si emerge un **9º patrón** genuinamente transversal (se repite ≥3 dominios), agregarlo
acá con la misma estructura (cuándo / forma canónica / reglas duras / fuente) y
registrarlo en `DECISIONS_INDEX.md`. Si es específico de un dominio, vive en su spec,
no acá.

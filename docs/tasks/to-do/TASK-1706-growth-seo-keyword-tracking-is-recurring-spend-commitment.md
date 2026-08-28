# TASK-1706 — Growth SEO: el alta de una keyword es un compromiso de gasto y pasa por el presupuesto

## Delta 2026-08-27

- Confirmado el `Blocked by: none`: TASK-1696 cerró hoy. El ledger del que este gate saca la tarifa
  medida ganó `consumer`, así que la lectura de la familia `serp` debe filtrar `consumer = 'seo'` o
  mezclará las llamadas del grader AEO en la tarifa del rank capture — cambiado por TASK-1696. El
  fragmento canónico `buildSeoProviderSpendMonthlySumSql` ya trae el filtro.
- Colisión de vocabulario a evitar: el ledger tiene ahora una columna `cost_basis` con valores
  `invoiced` | `estimated` (facturado por el proveedor vs. estimado con tabla de precios), distinta
  del `costBasis: 'measured' | 'list_estimate'` que esta task declara en su outcome. No reusar el
  nombre sin decir cuál de los dos se está hablando.
- Sigue vigente el invariante «el gate proyecta, no debita»: TASK-1696 no agregó escritores al
  ledger fuera del transporte.

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
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|seo`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-08-15 (2) — cifras corregidas por verificación adversarial

Corrección **editorial**: no cambia el diseño, el alcance ni ninguna decisión de esta task.

El "~98% de la factura variable" que esta task cita de la auditoría fuente está mal dividido. El
valor correcto es **90,0%** con el modelo de proyección del propio documento (USD 4,06 de USD 4,51)
y **76,7%** contra los dólares realmente medidos en `greenhouse_growth.seo_provider_spend_daily`
(`serp` USD 1,3440 sobre USD 1,7525 totales, ventana 2026-08-06→15). El rank capture sigue siendo,
por lejos, la parte dominante de la factura variable, y el compromiso de gasto recurrente que esta
task hace explícito no depende del porcentaje.

## Summary

`trackKeywords` compromete gasto recurrente del proveedor —el rank capture le paga a DataForSEO por
cada keyword vigente, todos los días, hasta que alguien la deje de seguir— y hoy **no pasa por
ningún gate de presupuesto**. El único freno es un techo de 200 keywords por target que es una
constante de módulo. Esta task hace que el command **proyecte el gasto mensual recurrente resultante
y lo compare contra el presupuesto de la organización antes de aceptar**, con outcome tipado por
keyword, y convierte el techo de keywords en un **envelope derivado del presupuesto**, no en un
número que coincide con él por accidente.

## Why This Task Exists

Dos números del módulo están calibrados uno contra el otro **por accidente**
(auditoría 2026-08-15, §2.1):

- `DEFAULT_TRACKED_KEYWORDS_CAPACITY = 200`
  ([src/lib/growth/seo/track-keywords.ts:96](../../../src/lib/growth/seo/track-keywords.ts)).
- `contractedMonthlyBudgetUsd` default **USD 50**
  ([src/lib/growth/seo/entitlement.ts:148](../../../src/lib/growth/seo/entitlement.ts)).

A 200 keywords, la corrida diaria cuesta **USD 26,18/mes a tarifa medida** (USD 0,004364 por llamada,
308 llamadas reales en el ledger) y **USD 48/mes a tarifa de lista** con los multiplicadores que el
rank capture ya paga (`base × 2` por `load_async_ai_overview` `× 2` por `depth 20`), contra un budget
de USD 50. Nadie eligió que encajara: encaja.

Y hay un detalle que lo vuelve peor: **el propio estimador conservador del módulo dice que no
encaja.** `SERP_RANK_CAPTURE_ESTIMATED_COST_USD = 0.01`
([src/lib/growth/seo/rank-capture.ts:62](../../../src/lib/growth/seo/rank-capture.ts)) —el valor con
el que el gate del batch sobreestima a propósito— proyecta **USD 60/mes** para 200 keywords. Es
decir: con la aritmética que el módulo usa para protegerse, el techo de keywords **ya excede** el
presupuesto contratado, y nada lo detecta porque nadie multiplica esos dos números.

El hueco estructural es de forma, no de aritmética: `trackKeywords` es un write que **compromete
gasto futuro** y su docstring lo dice con todas las letras —*"seguir una keyword es un COMPROMISO DE
GASTO DIFERIDO, no un INSERT"*—, pero sus tres defensas (techo por target, entitlement per-org,
outcome por keyword) **no incluyen una sola que mire dinero**. La decisión de no consumir allowance
al seguir es correcta y se conserva: seguir no gasta hoy. Lo que falta es lo otro: **verificar que
lo que va a gastar mañana quepa**.

El caso concreto: un operador con la lista de oportunidades abierta, un bucle de reintentos o un
agente entusiasta pueden llevar un set de 40 a 200 keywords en una sesión. El capability check
aprueba —`growth.seo.target.configure` no habla de dinero—, el techo aprueba hasta la 200, y el
presupuesto se entera treinta días después, cuando el rank capture se bloquea por
`budget_exhausted` y el cliente deja de tener serie diaria.

### Nota comercial que forma parte del contrato

**El techo NO es un problema de precio: es un problema de CONTRATO.** 200 keywords cuestan alrededor
del **0,9% del fee** — el dinero no es la restricción. La restricción es que el número debe ser un
**envelope declarado en la cotización** ("hasta N keywords en seguimiento diario"), igual que
cualquier otro límite de alcance, para que ampliarlo sea una conversación comercial y no un botón.

Y una regla dura que se deriva de eso: **NUNCA se publica un precio por keyword.** Ni en la
cotización, ni en la UI, ni en el portal cliente, ni en un mensaje de error. Un precio unitario
convierte un servicio gobernado en una tarifa de proveedor revendida, invita a negociar el costo del
insumo en vez del resultado, y expone nuestro margen sobre un ítem que representa el 0,9% del fee.
El cliente ve un **envelope** y su consumo; nunca un USD por keyword.

## Goal

- `trackKeywords` proyecta el gasto recurrente mensual del set resultante **antes** de insertar, y lo
  compara contra el presupuesto vigente de la organización.
- El rechazo por presupuesto es un **outcome tipado por keyword**, nunca silencio y nunca excepción:
  el operador lee cuántas entraron, cuántas no, y por qué.
- El techo de keywords deja de ser una constante global y pasa a ser un **envelope derivado**:
  `min(envelope declarado, máximo que el presupuesto soporta con headroom)`, declarando cuál de los
  dos ató.
- La proyección usa la **tarifa medida** del propio ledger de gasto cuando existe, y declara
  explícitamente cuándo cae a la tarifa de lista conservadora.
- Una señal de reliability detecta la brecha que ningún gate de escritura puede detectar: el set
  vigente puede pasarse del presupuesto **sin que nadie escriba nada**, porque el costo unitario del
  proveedor sube.
- El envelope queda documentado como cláusula de cotización, y queda escrito que no se publica precio
  por keyword.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — chokepoint de
  entitlement/allowance/budget y ledger `seo_provider_spend_daily` como fuente única de gasto
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` — patrón flag default-OFF + shadow + flip
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `CLAUDE.md` §"Runtime Rollout Completion Gate", §"Feature Flag State Ledger",
  §"Canonical API error response contract"

Reglas obligatorias:

- **El gate PROYECTA, no debita.** Seguir una keyword sigue sin consumir allowance ni reservar
  budget: eso sería cobrar dos veces por cosas distintas (una vez al seguir, otra al capturar). El
  gate lee el presupuesto y compara contra una proyección; no escribe en `seo_provider_spend_daily`
  ni en ningún contador.
- **NUNCA rechazar en silencio ni con excepción.** El exceso por presupuesto se devuelve como
  `SeoKeywordTrackStatus` nuevo, igual que `capacity_exceeded`. Un caller que sólo ve `ok: true`
  debe poder distinguir "agregué 3" de "rebotaron 40 contra el presupuesto".
- **NUNCA estimar la tarifa unitaria cuando existe la medida.** La base de costo sale de
  `seo_provider_spend_daily` familia `serp`; el fallback a `SERP_RANK_CAPTURE_ESTIMATED_COST_USD` es
  válido pero **debe declararse** en el outcome (`costBasis: 'measured' | 'list_estimate'`). Es el
  mismo invariante `●` medido / `◑` estimado del resto del módulo, aplicado al dinero.
- **NUNCA acoplar el gate al techo.** Son dos frenos con causas distintas: el envelope es
  **contractual** (alcance vendido) y la proyección es **económica** (lo que el período soporta). El
  outcome dice cuál de los dos rechazó.
- 🔴 **NUNCA exponer un precio por keyword** en UI, API, portal cliente, mensaje de error, log
  client-facing ni documento comercial. El DTO cliente ve envelope y consumo, jamás USD unitarios.
- **NUNCA romper la reversibilidad.** `untrackKeywords` baja la proyección; el gate debe recalcular
  desde el conteo vigente real, nunca desde un contador acumulado.
- Errores canónicos (`canonicalErrorResponse`), prose es-CL desde `src/lib/copy/growth.ts`, detalle
  técnico sólo a `captureWithDomain`.

## Normative Docs

- `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` — §2.1 (economía
  medida del lado proveedor, techo mal calibrado, multiplicadores silenciosos) y §7 (lo que no se
  debe prometer)
- `docs/epics/to-do/EPIC-022-growth-seo-search-visibility-360-module.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/manual-de-uso/growth/operar-captura-rankings-seo.md`

## Dependencies & Impact

### Depends on

- **`TASK-1696`** — el trabajo de economía/gasto del módulo sobre el que este gate se apoya. El gate
  no puede proyectar con honestidad si la base de costo no está resuelta primero.
- `src/lib/growth/seo/track-keywords.ts` — el command a modificar (`trackKeywords`,
  `resolveTrackedKeywordCapacity`, `TRACKED_KEYWORDS_CAPACITY_ENV`).
- `src/lib/growth/seo/entitlement.ts` — `resolveSeoEntitlement`, `budgetCapUsd`,
  `budgetRemainingUsd`, los knobs por tier.
- `greenhouse_growth.seo_provider_spend_daily` (TASK-1300) — tarifa medida por familia.
- `src/lib/growth/seo/rank-capture.ts` — `SERP_RANK_CAPTURE_ESTIMATED_COST_USD` y la fórmula de
  multiplicadores, como fallback declarado.
- `greenhouse_growth.seo_keyword_set_members` — conteo vigente por target.

### Blocks / Impacts

- `src/app/api/admin/growth/seo/keywords/track/route.ts` y el lane ecosystem
  (`trackEcosystemSeoKeywordsPayload` en `src/lib/api-platform/resources/ecosystem-growth-seo.ts`):
  ambos propagan el outcome nuevo sin reimplementar lógica.
- `TASK-1700` — la cola priorizada propone seguir keywords; su CTA debe poder anticipar el rechazo
  por presupuesto en vez de descubrirlo en el submit.
- `TASK-1690` / superficie cliente — muestra envelope y consumo, nunca USD por keyword.
- Cotización y SOW del servicio SEO: el envelope pasa a ser cláusula declarada.

### Files owned

- `src/lib/growth/seo/tracking-budget-projection.ts`
- `src/lib/growth/seo/__tests__/tracking-budget-projection.test.ts`
- `src/lib/reliability/queries/growth-seo-tracking-budget-signals.ts`
- `docs/documentation/growth/envelope-keywords-seguidas-y-presupuesto.md`
- `docs/manual-de-uso/growth/ampliar-envelope-de-keywords-seguidas.md`

Archivos que esta task **modifica sin poseer**: `src/lib/growth/seo/track-keywords.ts`,
`src/lib/growth/seo/contracts.ts`, `src/lib/growth/seo/flags.ts`,
`src/lib/api-platform/resources/ecosystem-growth-seo.ts`, `src/lib/copy/growth.ts`,
`docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`,
`docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.

## Current Repo State

### Already exists

- **El command con sus tres defensas** `trackKeywords`: techo por target
  (`resolveTrackedKeywordCapacity`, default 200, env-knob
  `GROWTH_SEO_TRACKED_KEYWORDS_PER_TARGET`), entitlement per-org (`module_assignments` `seo_v2`
  vigente) y outcome tipado por keyword (`tracked` · `already_tracked` · `intent_changed` ·
  `invalid` · `capacity_exceeded`).
- **El chokepoint de presupuesto** `resolveSeoEntitlement` con `budgetCapUsd`, `budgetUsedUsd`,
  `budgetRemainingUsd`, `blockedReason: 'budget_exhausted'` y `enforceSeoRunEntitlement` — usado hoy
  por site audit, market data y discovery, **nunca** por tracking.
- **El ledger de gasto real** `seo_provider_spend_daily` con `call_count` y `provider_cost_usd`
  acumulados atómicamente por familia y día.
- **El estimador conservador** `SERP_RANK_CAPTURE_ESTIMATED_COST_USD = 0.01` y la fórmula de
  multiplicadores documentada en `rank-capture.ts`.
- **La reversibilidad** `untrackKeywords`, que cierra la ventana de la membresía.
- **Los knobs por tier** `GROWTH_SEO_{CONTRACTED,TRIAL,PILOT}_MONTHLY_BUDGET_USD`.

### Gap

- **`trackKeywords` no importa `resolveSeoEntitlement` para nada de dinero.** Lo usa para verificar
  que el target existe para la org, no para verificar que el compromiso quepa.
- **No existe ninguna función que proyecte el gasto recurrente de un set.** El número que aparece en
  la auditoría (USD 26,18/mes para 200 keywords) se calculó a mano contra la base de datos; el
  runtime no lo puede responder.
- **El techo es global, no per-org.** Un cliente `trial` con budget USD 2 y un `contracted` con USD
  50 tienen exactamente el mismo techo de 200 keywords. A tarifa medida, el `trial` se pasa de su
  presupuesto completo con **16 keywords**.
- **No hay señal sobre la brecha sin escritura.** Si la tarifa unitaria sube (más multiplicadores,
  más devices, cambio de precios del proveedor), un set que ayer cabía hoy no cabe, y nadie se
  entera hasta que el rank capture se bloquea.
- **El envelope no está declarado en ninguna parte comercial.** No aparece en la cotización, así que
  ampliarlo hoy es un cambio de constante, no una conversación.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/lib/growth/seo/track-keywords.ts` +
  `src/lib/growth/seo/tracking-budget-projection.ts` dentro del monolito Next.js de greenhouse-eo.
  El command se ejecuta **sólo en Vercel**: sus dos callers son la ruta app
  `/api/admin/growth/seo/keywords/track` y el lane ecosystem. Ningún worker lo invoca.
- Future candidate home: `domain-package`
- Boundary: el contrato canónico es `trackKeywords` (command) más los dos primitives nuevos
  `projectTrackedKeywordSpend` (reader puro) y `resolveTrackedKeywordEnvelope` (resolver).
  Consumers autorizados: la ruta app, el lane ecosystem, la tool MCP de tracking y la cola priorizada
  de `TASK-1700` para anticipar el rechazo. Ninguno reimplementa la proyección ni el envelope.
- Server/browser split: el módulo completo vive server-side bajo `import 'server-only'`. El ledger de
  gasto, la resolución de entitlement y la tarifa unitaria nunca cruzan al browser; el DTO cliente
  expone envelope y consumo, jamás USD por keyword.
- Build impact: none — sin dependencia nueva, sin input de filesystem, sin entrypoint global.
- Extraction blocker: la lectura del entitlement per-org y del ledger de gasto comparte pool y
  binding de tenant con el resto del módulo SEO; el acople `seo_targets.organization_id` →
  `greenhouse_core.organizations` ya está declarado en §17.2 de la arquitectura SEO. No se agrega
  acople nuevo.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (compromete gasto recurrente de proveedor y cambia el resultado
  de un write productivo)
- Impacto principal: `command`
- Source of truth afectado: `resolveSeoEntitlement` (presupuesto per-org) y
  `greenhouse_growth.seo_provider_spend_daily` (tarifa medida) pasan a gobernar el resultado de
  `trackKeywords`. El conteo vigente sigue siendo `seo_keyword_set_members`.
- Consumidores afectados: ruta app de tracking, lane ecosystem/MCP, UI operador, cola priorizada
  (`TASK-1700`), superficie cliente.
- Runtime target: `local` + `staging` + `production` (Vercel). Sin carril worker.

### Contract surface

- Contrato existente a respetar: `trackKeywords(seoTargetId, keywords, actor, options)` con su
  `TrackKeywordsResult`, `SeoKeywordTrackOutcome` y `SeoKeywordTrackStatus`
  (`src/lib/growth/seo/contracts.ts`); `resolveSeoEntitlement` y su enum de `blockedReason`;
  `untrackKeywords` como contraparte reversible.
- Contrato nuevo o modificado:

  ```ts
  projectTrackedKeywordSpend({ organizationId, seoTargetId, additionalKeywords })
    → { activeCount, projectedCount, unitCostUsdPerKeywordPerMonth, costBasis,
        projectedMonthlyUsd, recurringHeadroomUsd, fits, shortfallUsd }

  resolveTrackedKeywordEnvelope({ organizationId, seoTargetId })
    → { capacity, boundBy: 'declared_ceiling' | 'budget_projection',
        declaredCeiling, budgetDerivedMax, costBasis }
  ```

  `SeoKeywordTrackStatus` suma `budget_projection_exceeded`. `TrackKeywordsResult` (rama `ok: true`)
  suma `envelope` con la forma de `resolveTrackedKeywordEnvelope` y `projection` con la proyección
  resultante del set **después** del command.
- Backward compatibility: `gated`. Con el flag OFF el comportamiento es **byte a byte el actual**: el
  envelope devuelve el techo global y nunca `boundBy: 'budget_projection'`. Los campos nuevos del
  resultado son aditivos; ningún consumer existente rompe por no leerlos.
- Full API parity: la regla de negocio vive en el primitive; la ruta app, el lane ecosystem y la tool
  MCP reciben el mismo outcome sin reimplementar la proyección. Nexa puede **proponer** seguir N
  keywords y la confirmación humana pasa por el mismo command, que aplica el mismo gate.

### Data model and invariants

- Entidades/tablas afectadas: **ninguna nueva**. Lectura sobre
  `greenhouse_growth.seo_provider_spend_daily`, `greenhouse_growth.seo_keyword_set_members`,
  `greenhouse_growth.seo_targets` y `greenhouse_core.module_assignments` vía
  `resolveSeoEntitlement`. Escritura: la de siempre en `seo_keyword_set_members`.
- Invariantes que no se pueden romper:
  - **El gate proyecta, no debita.** Cero writes en el ledger de gasto, cero consumo de allowance.
  - **Proyección desde el conteo vigente real**, recalculada en cada llamada dentro de la misma
    transacción que hace el conteo de capacidad. Nunca desde un contador acumulado que `untrack` no
    pueda bajar.
  - **Base de costo declarada.** `costBasis: 'measured'` cuando hay historial suficiente de la
    familia `serp` para esa organización; `'list_estimate'` cuando cae a
    `SERP_RANK_CAPTURE_ESTIMATED_COST_USD`. El fallback es **conservador por diseño** (sobreestima),
    así que en su presencia el gate rechaza antes, no después.
  - **Headroom reservado.** El rank capture no puede comerse el 100% del presupuesto: el período
    también paga site audit, market data, backlinks y discovery. El envelope se deriva sobre
    `budgetCapUsd × (1 − headroom)`, con el headroom como knob declarado y su default justificado en
    la doc.
  - **Aceptación parcial en el orden pedido.** Igual que `capacity_exceeded`: entran las que caben,
    en el orden en que llegaron, y las demás salen con `budget_projection_exceeded`. Cero
    reordenamiento implícito, cero rechazo del lote completo.
  - **Dos frenos, dos causas.** `capacity_exceeded` = alcance contractual agotado.
    `budget_projection_exceeded` = el período no lo soporta. El outcome nunca los confunde: el
    operador hace cosas distintas en cada caso (renegociar alcance vs. sacar keywords o esperar al
    próximo período).
  - **`already_tracked` e `intent_changed` no consumen proyección**: el conteo vigente no se mueve,
    así que reclasificar sigue siendo posible con el presupuesto justo — que es cuando más falta
    hace.
  - 🔴 **Cero USD por keyword en cualquier salida client-facing.**
- Tenant/space boundary: `organizationId` resuelto server-side desde `seoTargetId`, nunca desde el
  request. El presupuesto se lee con **ese** org.
- Idempotency/concurrency: el command sigue siendo idempotente por keyword. Dos llamadas
  concurrentes leen el mismo `budgetRemainingUsd` y pueden pasar ambas —el mismo límite ya declarado
  para `enforceSeoRunEntitlement`—; el freno duro de concurrencia sigue siendo el índice único
  parcial de la membresía más el techo del envelope, y la sobreproyección posible queda acotada por
  el headroom. Declararlo explícito en la doc, no fingir exactitud transaccional.
- Audit/outbox/history: se conserva el evento `growth.seo.keyword_set.updated`. El rechazo por
  presupuesto **no** genera evento (no pasó nada persistente); genera log estructurado y alimenta la
  señal de reliability.

### Migration, backfill and rollout

- Migration posture: `none` — sin DDL, sin columna, sin tabla. Todo se deriva de datos existentes.
- Default state: `flag OFF`, y con el flag ON el primer paso es **shadow**: el gate calcula, registra
  y alimenta la señal, pero **no rechaza**. El rechazo real es un segundo knob.
- Backfill plan: `N/A` — no hay estado nuevo que poblar. Lo que sí hay es un **inventario previo**:
  correr la proyección en modo lectura sobre todos los targets vigentes y listar cuáles ya están por
  encima de su presupuesto **hoy**. Si alguno lo está, el flip del rechazo no puede ser lo primero:
  primero se conversa el envelope con ese cliente.
- Rollback path: flag a `false` en Vercel + redeploy → el command vuelve al comportamiento actual en
  menos de 5 minutos. Sin migración inversa, sin datos que revertir.
- External coordination: env vars en Vercel (`Production`, `staging`, `Preview (develop)`) +
  redeploy; fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`; y **conversación comercial** con
  cualquier cliente cuyo set vigente ya no quepa, antes de prender el rechazo.

### Security and access

- Auth/access gate: sin cambios de capability. `growth.seo.target.configure` sigue habilitando
  "Seguir"; lo que cambia es que ahora la autorización fina y el presupuesto son dos preguntas
  distintas y ambas se hacen. `growth.seo.observation.read` alcanza para leer el envelope.
- Sensitive data posture: económica, no PII. **El DTO cliente no lleva USD por keyword, ni
  `unitCostUsdPerKeywordPerMonth`, ni `costBasis`, ni el gasto del proveedor.** Lleva envelope,
  consumo y —si se decide mostrarlo— un semáforo de holgura. El lado operador sí ve el detalle
  completo.
- Error contract: `budget_projection_exceeded` viaja como **outcome**, no como error HTTP: el lote
  parcialmente aceptado responde `200` con sus outcomes. Sólo el caso "el target no existe para esta
  org" sigue siendo error canónico. Copy es-CL desde `src/lib/copy/growth.ts`, con el motivo y la
  acción concreta ("saca N keywords" vs "amplía el envelope contratado"), y **sin cifras unitarias**
  en la variante cliente.
- Abuse/rate-limit posture: éste **es** el control de abuso que faltaba. El límite de 100 keywords
  por llamada (`MAX_KEYWORDS_PER_CALL`) se conserva; el gate lo complementa acotando el compromiso
  acumulado, que es lo que un bucle de reintentos podía inflar sin tope económico.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/seo/__tests__/tracking-budget-projection.test.ts` ·
  `pnpm vitest run src/lib/growth/seo` (no-regresión del módulo, incluido track/untrack) ·
  `pnpm local:check`.
- DB/runtime checks: sanity live contra PostgreSQL que ejercita la proyección sobre el target real
  (`berel.com`, 31 keywords vigentes) y compara el resultado contra el cálculo manual de la auditoría
  (USD 4,06/mes de rank capture a tarifa medida); prueba con una org sin historial de gasto que debe
  caer a `costBasis: 'list_estimate'`.
- Integration checks: llamada real a `POST /api/admin/growth/seo/keywords/track` en staging con un
  lote que excede la proyección → `200` con aceptación parcial y outcomes
  `budget_projection_exceeded`; llamada equivalente por el lane ecosystem que debe devolver
  **exactamente** los mismos outcomes; `untrackKeywords` después → la proyección baja y el mismo lote
  vuelve a caber.
- Reliability signals/logs: `growth.seo.tracked_keywords.budget_projection_breach` — targets cuyo set
  **vigente** proyecta gasto por encima del presupuesto del período; steady 0. Es la única forma de
  detectar la brecha que ningún gate de escritura ve: el compromiso puede pasarse del presupuesto sin
  que nadie escriba nada, porque la tarifa unitaria del proveedor puede subir.
- Production verification sequence: ver §Rollout Plan & Risk Matrix.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers están nombrados con paths y objetos reales.
- [ ] Invariantes, boundary de tenant y postura de concurrencia son explícitos (incluido el límite
      conocido de la lectura no transaccional del presupuesto).
- [ ] Postura de migración/backfill/rollback es explícita: sin DDL, shadow antes del rechazo.
- [ ] Hay evidencia runtime y de DB listada, incluida la comparación contra la cifra medida.
- [ ] El dominio económico tiene errores canónicos, señal de reliability y cero fuga de precio
      unitario al cliente.

## Capability Definition of Done — Full API Parity gate

- [ ] **Lógica en el primitive, no en la UI.** Proyección, envelope y gate viven en `src/lib/growth/seo/**`.
- [ ] **Modelada como command**, no como validación de formulario: el gate corre en el command, así
      que Nexa y MCP lo heredan por construcción.
- [ ] **Read** (`resolveTrackedKeywordEnvelope`, `projectTrackedKeywordSpend`) expuesto como reader
      canónico; **write** (`trackKeywords`) conserva idempotencia, authorization fina, outcomes
      tipados, errores canónicos y observabilidad.
- [ ] **Capability + grant**: `N/A — no capability nueva`. El gate refuerza una capability existente
      (`growth.seo.target.configure`) sin cambiar su superficie de autorización.
- [ ] **Camino programático declarado**: ruta app + lane ecosystem + tool MCP, todos con los mismos
      outcomes.
- [ ] **Write apto para `propose → confirm → execute`**: Nexa propone el alta, el humano confirma en
      el endpoint, el endpoint aplica el gate. El LLM no puede saltárselo.
- [ ] **Un primitive, muchos consumers**: cero duplicación de la proyección por consumer.
- [ ] **Parity check = SÍ.**

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

### Slice 1 — La proyección: cuánto cuesta por mes este set

- `tracking-budget-projection.ts` con `projectTrackedKeywordSpend`.
- Tarifa unitaria **medida**: costo por llamada de la familia `serp` del propio
  `organization_id` sobre una ventana reciente de `seo_provider_spend_daily`
  (`SUM(provider_cost_usd) / NULLIF(SUM(call_count), 0)`), con mínimo de llamadas para validez.
- Fallback declarado a `SERP_RANK_CAPTURE_ESTIMATED_COST_USD` con `costBasis: 'list_estimate'`.
- Proyección mensual = `keywords × devices × tarifaUnitaria × díasDelPeríodo`. Los `devices` salen de
  la configuración real del capture, no de un supuesto: cada device duplica el costo.
- Tests: tarifa medida vs fallback, cero llamadas históricas, un solo día de historial, y un caso
  numérico anclado a la cifra de la auditoría (31 keywords → ~USD 4,06/mes a tarifa medida).

### Slice 2 — El envelope derivado: el techo deja de ser un número suelto

- `resolveTrackedKeywordEnvelope` = `min(declaredCeiling, budgetDerivedMax)` donde
  `budgetDerivedMax = floor(budgetCapUsd × (1 − headroom) / costoMensualPorKeyword)`.
- `declaredCeiling` sigue saliendo del knob existente `GROWTH_SEO_TRACKED_KEYWORDS_PER_TARGET`
  (default 200) — ahora explícitamente como **alcance contractual**, no como freno económico.
- Nuevo knob `GROWTH_SEO_TRACKING_BUDGET_HEADROOM_PCT` con default justificado en la doc: el
  presupuesto también paga site audit, market data, backlinks y discovery.
- El resultado declara `boundBy` para que la UI y el operador sepan **cuál** de los dos ató, porque
  la acción es distinta: renegociar alcance o revisar presupuesto.
- Tests por tier: `contracted` (USD 50), `pilot` (USD 10) y `trial` (USD 2). El caso `trial` es el
  que hace visible el bug: con el techo global, 200 keywords proyectan ~13× su presupuesto completo.

### Slice 3 — El gate dentro de `trackKeywords`, detrás de flag y en shadow

- `SeoKeywordTrackStatus` suma `budget_projection_exceeded`; `TrackKeywordsResult` suma `envelope` y
  `projection`.
- El gate corre **después** de la validación y del dedupe, **antes** del insert, dentro de la misma
  transacción que cuenta las membresías vigentes.
- Aceptación parcial en el orden pedido; el resto sale con el status nuevo.
- `already_tracked` e `intent_changed` no consumen proyección.
- Flag `GROWTH_SEO_TRACKING_BUDGET_GATE_ENABLED` (default OFF) y modo `shadow`: con el flag ON y el
  modo shadow, el gate calcula, registra y alimenta la señal, pero **acepta igual**. El rechazo real
  es el segundo knob.
- Propagación del outcome nuevo en la ruta app y en el payload del lane ecosystem, con copy es-CL en
  `src/lib/copy/growth.ts` y **sin cifras unitarias** en la variante cliente.

### Slice 4 — La señal, el inventario y la declaración comercial

- Señal `growth.seo.tracked_keywords.budget_projection_breach` (steady 0) registrada en el módulo
  `growth` de reliability, con severidad proporcional a cuántos targets están en brecha.
- Script de inventario de una pasada: proyección de **todos** los targets vigentes, con su tier, su
  presupuesto, su conteo vigente y su `boundBy`. Es el insumo de la conversación comercial previa al
  flip del rechazo.
- Documentación triple: sección nueva en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (el alta como
  compromiso de gasto, envelope vs presupuesto, base de costo declarada), funcional en
  `docs/documentation/growth/envelope-keywords-seguidas-y-presupuesto.md` y manual en
  `docs/manual-de-uso/growth/ampliar-envelope-de-keywords-seguidas.md`.
- 🔴 En las tres capas queda escrito: **el envelope es una cláusula de cotización** ("hasta N
  keywords en seguimiento diario") y **NUNCA se publica un precio por keyword**. El techo es un
  problema de contrato, no de precio: 200 keywords son el 0,9% del fee.
- Fila del flag en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.

## Out of Scope

- **Cualquier DDL.** Sin tabla, sin columna, sin migración: el envelope se deriva de datos que ya
  existen. Persistir un envelope per-org en base es follow-up con su propia task.
- **Reservar o debitar presupuesto al seguir.** El gate proyecta y compara; cobrar allowance al alta
  sería cobrar dos veces.
- **Rebajar el costo del rank capture** (cadencia del AI Overview, ajuste de `depth`, reutilización
  de las filas del top-20 que hoy se descartan). Son las optimizaciones de §2.1 de la auditoría y
  cada una es su propia task; ésta no cambia lo que se compra, sólo verifica que quepa.
- **Envelope por cliente negociado en la UI.** Hoy es un knob por tier; una superficie de
  administración comercial es otra task.
- **Precio por keyword en cualquier superficie.** Prohibido, no diferido.
- **Cambiar el techo de 200.** Esta task lo vuelve derivado y auditable; si el número resultante debe
  moverse, se mueve con evidencia del inventario, no dentro de este alcance.
- **Gate equivalente para otras familias** (backlinks, audit, market data). Ya pasan por
  `enforceSeoRunEntitlement`; el hueco era específico de tracking.

## Detailed Spec

### La aritmética, con los números reales del ledger

| Base de costo | USD/llamada | 31 kw (Berel) | 200 kw (techo) | Cabe en USD 50? |
|---|---:|---:|---:|---|
| Medida (`seo_provider_spend_daily`, familia `serp`, 308 llamadas) | 0,004364 | **USD 4,06/mes** | **USD 26,18/mes** | sí, con holgura |
| Lista con multiplicadores (`base × 2` AIO `× 2` depth 20) | ~0,008 | USD 7,44/mes | **USD 48,00/mes** | apenas, sin holgura |
| Estimador conservador del módulo (`SERP_RANK_CAPTURE_ESTIMATED_COST_USD`) | 0,010 | USD 9,30/mes | **USD 60,00/mes** | **no** |

Las tres filas son ciertas al mismo tiempo y por eso la base de costo tiene que viajar declarada: el
mismo set cabe o no cabe según qué tarifa se use, y hoy nadie declara cuál se está usando porque
nadie hace el cálculo.

Y el tier `trial` (USD 2/mes) es donde el techo global se rompe sin ambigüedad: a tarifa medida el
presupuesto completo alcanza para **~15 keywords**. El techo dice 200.

### Forma del outcome

```ts
// Lote de 60 keywords sobre un set de 170, envelope derivado 182:
{
  ok: true,
  outcomes: [
    /* 12 × */ { keyword: '…', status: 'tracked', intent: 'opportunity' },
    /* 48 × */ { keyword: '…', status: 'budget_projection_exceeded' }
  ],
  activeKeywordCount: 182,
  capacity: 182,
  envelope: {
    capacity: 182,
    boundBy: 'budget_projection',
    declaredCeiling: 200,
    budgetDerivedMax: 182,
    costBasis: 'measured'
  },
  projection: {
    projectedCount: 182,
    projectedMonthlyUsd: 23.82,
    recurringHeadroomUsd: 6.18,
    costBasis: 'measured',
    fits: true
  }
}
```

El operador lee tres cosas distintas y actúa distinto en cada una: **cuántas entraron**, **qué freno
ató** (`boundBy`) y **cuánto margen queda** (`recurringHeadroomUsd`).

### Copy, en dos registros

- **Operador** (es-CL, con cifras): "Entraron 12 de 60. El seguimiento diario de este cliente llegó
  al máximo que su presupuesto del período soporta. Saca keywords o amplía el envelope contratado."
- **Cliente** (es-CL, sin cifras unitarias, sin USD por keyword): "Tu plan incluye seguimiento diario
  de hasta N keywords. Ya estás usando N." Nada más: ni tarifa, ni costo del proveedor, ni margen.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (proyección) → Slice 2 (envelope) → Slice 3 (gate detrás de flag, en shadow) → Slice 4
  (señal + inventario + declaración comercial).
- 🔴 **El inventario de Slice 4 corre ANTES del flip al modo rechazo**, aunque el slice se cierre
  después. Prender el rechazo sin saber cuántos clientes vigentes ya están en brecha convierte una
  mejora de gobierno en una interrupción de servicio sorpresa para un cliente que no hizo nada mal.
- Slice 3 no puede shippear con el rechazo activo por default bajo ninguna circunstancia: shadow
  primero, siempre.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un cliente vigente ya está en brecha y el flip le bloquea altas de golpe | cliente / comercial | **high** | Modo shadow obligatorio + inventario de todos los targets antes del flip + conversación comercial previa por cada target en brecha | `growth.seo.tracked_keywords.budget_projection_breach` en shadow |
| La proyección usa el fallback conservador y rechaza altas que sí cabían | command / operador | medium | `costBasis` declarado en el outcome + copy que lo dice + el fallback sólo aplica sin historial suficiente, situación acotada a orgs nuevas | outcome con `costBasis: 'list_estimate'` visible en el log estructurado |
| La tarifa unitaria sube y un set vigente se pasa **sin que nadie escriba nada** | finance / cliente | medium | La señal corre sobre el set vigente, no sobre el write; el gate de escritura por sí solo no lo detectaría | `growth.seo.tracked_keywords.budget_projection_breach` |
| El gate se acopla al techo y se pierde la distinción alcance vs presupuesto | command | medium | Dos statuses distintos + `boundBy` explícito + tests que cubren ambos frenos por separado | fallo de test en CI |
| Dos altas concurrentes leen el mismo presupuesto y pasan ambas | command | low | Límite ya declarado para `enforceSeoRunEntitlement`; acotado por el headroom y por el techo del envelope; documentado, no fingido | brecha visible en la señal al día siguiente |
| Un precio por keyword se filtra al portal cliente o a un mensaje de error | cliente / comercial | medium | Test de no-fuga sobre el DTO y sobre las variantes de copy client-facing | fallo de test en CI |
| El flag se prende sólo en un ambiente y el comportamiento diverge entre staging y producción | portal | medium | Fila en el ledger con estado por ambiente + verificación post-redeploy en los tres targets de Vercel | ausencia de outcomes nuevos en el ambiente esperado |
| `untrackKeywords` no baja la proyección y el envelope queda pegado | command | low | La proyección se recalcula desde el conteo vigente en cada llamada; test que sigue el ciclo track → untrack → track | fallo de test en CI |

### Feature flags / cutover

- **`GROWTH_SEO_TRACKING_BUDGET_GATE_ENABLED`** (default `false`) — habilita el cálculo del gate.
  Runtime: **Vercel únicamente** (los dos callers de `trackKeywords` son rutas de Vercel; ningún
  worker lo invoca). Subordinado a `GROWTH_SEO_ENABLED`.
- **`GROWTH_SEO_TRACKING_BUDGET_GATE_MODE`** (`shadow` | `enforce`, default `shadow`) — el segundo
  knob. Con `shadow` el gate calcula, registra y alimenta la señal pero **acepta igual**; con
  `enforce` rechaza. Separarlo del flag es lo que permite medir la brecha real antes de bloquear a
  nadie.
- **`GROWTH_SEO_TRACKING_BUDGET_HEADROOM_PCT`** — knob de configuración, no flag; su default va
  justificado en la doc funcional.
- Ambos flags con fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` declarando runtime y estado
  por ambiente (gate `pnpm docs:closure-check`).
- Revert: flag a `false` en Vercel + redeploy, menos de 5 minutos, sin datos que revertir.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 — proyección | revert PR; módulo puro de lectura, sin consumers todavía | <5 min | sí |
| Slice 2 — envelope | revert PR; con el flag OFF el envelope devuelve el techo global de siempre | <5 min | sí |
| Slice 3 — gate | `GROWTH_SEO_TRACKING_BUDGET_GATE_MODE=shadow` (deja de rechazar, sigue midiendo) o flag a `false` + redeploy | <5 min | sí |
| Slice 4 — señal + docs | revert PR; la señal es de lectura y no altera comportamiento | <5 min | sí |

### Production verification sequence

1. Deploy a staging con flag `false` → verificar que `trackKeywords` responde **idéntico** al
   comportamiento actual (mismo shape salvo los campos aditivos, mismos statuses).
2. Sanity live de la proyección contra el target real en staging → comparar con la cifra medida de la
   auditoría; verificar `costBasis: 'measured'`.
3. Flag `true` + modo `shadow` en staging → lote que excedería el presupuesto: debe **aceptar** y
   dejar el registro estructurado + alimentar la señal.
4. Correr el inventario sobre todos los targets vigentes de staging y de producción. Listar los que
   ya están en brecha.
5. **Punto de decisión humana:** con el inventario en la mano, conversación comercial por cada
   cliente en brecha antes de continuar. Si hay alguno, el flip a `enforce` espera.
6. Modo `enforce` en staging → lote que excede: `200` con aceptación parcial y outcomes
   `budget_projection_exceeded`; mismo lote por el lane ecosystem con outcomes idénticos;
   `untrackKeywords` y reintento que ahora cabe.
7. Repetir 1–3 y 6 en producción con cooldown de 24 h, verificando el flag en los tres targets de
   Vercel después del redeploy.
8. Monitorear la señal 7 días. Cualquier valor distinto de 0 es conversación comercial, no ruido
   técnico.

### Out-of-band coordination required

- **Vercel**: dos env vars en `Production`, `staging` y `Preview (develop)` + redeploy — no se toman
  en caliente.
- **Comercial**: el envelope pasa a ser cláusula de cotización ("hasta N keywords en seguimiento
  diario"). Hay que incorporarlo a la plantilla de cotización/SOW del servicio SEO antes del flip a
  `enforce`, y dejar escrito que no se publica precio por keyword.
- **Operador SEO**: aviso de que "Seguir" ahora puede rebotar por presupuesto y de qué hacer en cada
  caso según `boundBy`.
- **Cliente en brecha (si el inventario encuentra alguno)**: conversación sobre ampliar envelope o
  reducir set, **antes** de que el rechazo esté activo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `projectTrackedKeywordSpend` devuelve el gasto mensual proyectado del set con
      `costBasis: 'measured'` cuando hay historial suficiente en `seo_provider_spend_daily` familia
      `serp`, y `'list_estimate'` cuando cae al estimador conservador.
- [ ] La proyección de 31 keywords sobre el target real coincide con la cifra medida de la auditoría
      (~USD 4,06/mes), verificada contra PostgreSQL real.
- [ ] `resolveTrackedKeywordEnvelope` devuelve `min(declaredCeiling, budgetDerivedMax)` y declara
      `boundBy`; con tier `trial` el envelope resultante es del orden de una decena de keywords, no
      200.
- [ ] `trackKeywords` con el gate en `enforce` acepta parcialmente en el orden pedido y devuelve
      `budget_projection_exceeded` para el resto — **nunca** excepción, **nunca** silencio, **nunca**
      rechazo del lote completo.
- [ ] `capacity_exceeded` y `budget_projection_exceeded` son statuses distintos y los tests cubren
      cada freno por separado.
- [ ] `already_tracked` e `intent_changed` no consumen proyección: reclasificar sigue funcionando con
      el presupuesto justo.
- [ ] El gate **no escribe** en `seo_provider_spend_daily` ni consume allowance — test que falla si
      el módulo importa un writer de gasto.
- [ ] Con el flag OFF el comportamiento del command es idéntico al actual, verificado con la suite
      existente de track/untrack sin modificar sus expectativas.
- [ ] El modo `shadow` calcula y registra sin rechazar, verificado en staging con un lote que
      excedería.
- [ ] Ninguna salida client-facing contiene precio por keyword, tarifa unitaria, `costBasis` ni costo
      de proveedor — test de no-fuga sobre DTO y copy.
- [ ] `growth.seo.tracked_keywords.budget_projection_breach` existe, está registrada en el módulo
      `growth` y se ve en `/admin/operations` con steady 0.
- [ ] El inventario de todos los targets vigentes corrió y su resultado está documentado en la task
      antes del flip a `enforce`.
- [ ] Los dos flags tienen fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con runtime
      (`Vercel`) y estado por ambiente.
- [ ] Las tres capas documentales están cerradas y en las tres queda escrito que el envelope es
      cláusula de cotización y que **no se publica precio por keyword**.
- [ ] El lane ecosystem devuelve exactamente los mismos outcomes que la ruta app para el mismo lote.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/growth/seo/__tests__/tracking-budget-projection.test.ts`
- `pnpm vitest run src/lib/growth/seo` (no-regresión de track/untrack y del módulo)
- `pnpm test` (suite completa, gate de cierre)
- `pnpm build` (producción; pedir autorización al operador antes de correrlo)
- Sanity live de la proyección contra PostgreSQL vía `pnpm pg:connect:shell`
- Llamada real a la ruta app y al lane ecosystem en staging con lote que excede
- Inventario de proyección sobre todos los targets vigentes
- `pnpm docs:closure-check` (incluye `feature-flags-audit --strict`)
- `pnpm task:lint --task TASK-1706` y `pnpm ops:lint --changed`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `TASK-1700` recibió su `## Delta`: la cola puede anticipar el rechazo por presupuesto en el CTA
      de seguir, en vez de descubrirlo en el submit.
- [ ] La plantilla de cotización/SOW del servicio SEO incorpora el envelope como cláusula.
- [ ] `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` §2.1 (techo mal
      calibrado) queda marcado como cerrado con fecha.

## Follow-ups

- Persistir el envelope per-org (hoy se deriva de knobs por tier): requiere DDL y una superficie de
  administración comercial.
- Bajar el costo del rank capture, que es el 90,0% de la factura variable proyectada (76,7% contra
  los dólares medidos en el ledger): cadencia del AI Overview
  (la presencia de AI Overview no es señal diaria), revisión de `depth`, y aprovechar las filas del
  top-20 que hoy se pagan y se descartan (auditoría §2.1).
- Anticipar el rechazo en la UI: mostrar holgura restante antes de que el operador arme el lote.
- Medir el margen de la cuenta con el costo variable por org ya conocido al dólar (auditoría §8).
- Extender la proyección a las demás familias para un "costo recurrente total por cliente", no sólo
  el de tracking.

## Open Questions

- **Default del headroom.** ¿Qué fracción del presupuesto se reserva para lo no recurrente (site
  audit, market data, backlinks, discovery)? El inventario de Slice 4 da la evidencia para elegirlo;
  hasta entonces es una decisión abierta.
- **Qué pasa con un cliente que ya está en brecha.** ¿Se le congela el alta y se conversa, o se le
  amplía el envelope temporalmente mientras se renegocia? Es decisión comercial, no técnica.
- **Ventana de la tarifa medida.** ¿Últimos 30 días, último período de facturación, o media móvil?
  Afecta cuán rápido el gate reacciona a un cambio de precios del proveedor.
- **¿El cliente ve la holgura?** El envelope y el consumo sí. Si además ve un semáforo de holgura, se
  gana transparencia pero se abre la puerta a la pregunta "¿cuánto cuesta cada una?", que es
  exactamente la conversación que el invariante de no publicar precio unitario quiere evitar.

# TASK-1692 — Growth SEO: el ledger de decisiones de discovery lo escribe el primitive

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-08-15 — predecesora de la cola priorizada (`TASK-1700`): su principio es el que la cola obedece

Origen: `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` (§3.1 brecha S1
y §5.2, contrato `recordSeoWorkQueueDecision`).

Qué cambia:

- **`Blocks` += `TASK-1700`.** La cola priorizada de trabajo SEO expone
  `recordSeoWorkQueueDecision({ itemId, decision })` como **log append-only que NO ejecuta el
  command**. Ese contrato sólo es coherente si el principio que esta task establece ya está vigente:
  **el primitive que produce el outcome escribe su propia fila; la UI no reporta lo que ya pasó.** Si
  la cola llega antes, hereda el hueco actual —tres `action_kind` sin writer— y su decision log
  termina siendo un **segundo libro de decisiones sobre los mismos hechos**: uno que la cola escribe
  cuando el operador hace click, y otro que el ledger de discovery debería tener y no tiene. Dos
  libros del mismo hecho, sin transacción entre ellos, es exactamente la falla parcial que esta task
  cierra.
- **Sin cambio de alcance.** Los cinco slices quedan como están. Lo que cambia es su **prioridad
  relativa dentro del programa SEO**: pasa a ser predecesora de la cola, no una mejora aislada del
  workbench de discovery. Su `Priority: P1` ya lo refleja y no se mueve.

Corolario para quien tome `TASK-1700`: la frontera que esta task fija es la que la cola reusa —
`record_action` para lo que una persona decide sin que ningún command lo produzca; el primitive para
lo que un command produce. La cola no inventa una tercera categoría.

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
- Domain: `growth`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

De los cinco `action_kind` que el dominio de keyword discovery declara, **sólo uno se escribe**:
`dismissed`. `selected_for_grounded_query`, `selected_for_target` y `promoted_to_tracking` existen en
el enum, en el `switch` que pinta el estado del candidato y en el guard del bridge grounded — y no
tienen ni un solo writer. Esta task le da dueño a esos hechos: el **primitive** que produce el
outcome (`createGroundedQueryDraft`, el camino de tracking) escribe su propia fila del ledger, con la
metadata del resultado real, y no la UI. Además decide y materializa si un candidato descartado tiene
camino de vuelta.

## Why This Task Exists

El ledger `greenhouse_growth.seo_keyword_discovery_actions` es append-only y es la única memoria de
**quién decidió qué sobre qué candidato de qué corrida**. Hoy esa memoria está incompleta a propósito
por una decisión de TASK-1665 que se tomó con la información de entonces, y el hueco ya produce tres
efectos observables:

1. **Un estado de UI inalcanzable.** `resolveState` (`KeywordDiscoveryResults.tsx:92`) mapea
   `selected_for_grounded_query` → `statePreparingAeo`. Como nadie escribe ese kind, tras un
   `createGroundedQueryDraft` exitoso el candidato sigue con el chip `stateNew` ("Nuevo"). La lente
   dice que no pasó nada sobre un candidato que acaba de entrar a un draft AEO.
2. **El inbox se ordena al revés de la realidad.** El reader ordena `latestAction === null ? 0 : 1`
   (`keyword-discovery/reader.ts`, comentario "la decisión pendiente ordena primero"). Un candidato
   ya promovido a tracking o ya enviado a grounded tiene `latestAction === null`, así que ocupa el
   tope de la lista como si fuera lo más pendiente que hay. `alreadyTracked` mitiga el caso de
   tracking en el chip, pero **no** en el orden, y no mitiga nada en el caso grounded.
3. **`dismissed` es una puerta de una sola dirección.** El guard del bridge acepta `latestAction` en
   `[null, 'selected_for_grounded_query']` (`grounded-query-bridge.ts:66`). Como nadie escribe el
   segundo valor, un candidato descartado no tiene camino de re-selección: el comentario de
   `KeywordDiscoveryCandidateDrawer.tsx` lo dice con todas sus letras y apunta a esta task como dueña
   de esa condición.

La decisión de TASK-1665 Slice 4 fue: *"Seguir/declarar NO escribe además una fila de
`recordKeywordDiscoveryAction('promoted_to_tracking')`: el `alreadyTracked` del reader ya deriva del
set monitoreado, que es su SSOT. Escribirlo abriría un segundo almacén del mismo hecho y, sin
transacción cruzada, una falla parcial dejaría los dos en desacuerdo."*

Esa decisión era correcta **para un writer que vive en la UI**, y esta task no la contradice: la
supersede quitándole las dos premisas.

- **No es un segundo almacén del mismo hecho.** El SSOT de "esta keyword está siendo medida" es y
  sigue siendo `seo_keyword_set_members`. El ledger responde otra pregunta que ningún otro store
  contesta: *"esta membresía nació de ESTE candidato, de ESTA corrida, decidida por ESTA persona"*.
  Sin esa fila, la trazabilidad candidato → corrida → compromiso de gasto no existe en ninguna parte.
- **Sí hay transacción.** Si el writer es el primitive y no el consumer, la fila se escribe dentro de
  la misma transacción que produce el outcome. La "falla parcial" que la decisión original temía es
  exactamente lo que desaparece al mover el writer adentro.

El corolario de Full API Parity es el argumento decisivo. Si cada consumer (UI, Nexa, lane MCP)
tuviera que encadenar un `record_action` después del éxito, el ledger quedaría a merced de que cada
cliente se acuerde — y un fallo de red entre las dos llamadas parte la verdad en dos, con el outcome
hecho y la decisión sin registrar. Un solo writer en el primitive vale para todos los consumers por
construcción.

## Goal

- `createGroundedQueryDraft` deja huella `selected_for_grounded_query` por candidato seleccionado, con
  metadata del outcome real (modo de grounding, dedupe, ref opaca del draft) y sin keyword cruda.
- El camino de promoción a tracking desde un candidato deja huella `promoted_to_tracking` **en la
  misma transacción** que abre la membresía, con el outcome por keyword del command.
- Ningún consumer (UI, Nexa, lane ecosystem) escribe esos dos kinds: el `record_action` público sigue
  existiendo para la decisión humana pura (`dismissed`), no para reportar el resultado de un command.
- Queda decidido, documentado y materializado si existe re-selección explícita de un candidato
  descartado, y cuál es su command.
- `selected_for_target` deja de ser vocabulario huérfano: o tiene writer, o queda retirado del enum TS
  con la razón escrita.

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
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§1.1 boundary SEO↔AEO, §7 primitives
  canónicos, §9 entitlements, §17.3 reglas de extraction-ready)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md`
- `.claude/rules/growth-seo.md` (invariantes auto-load del dominio)

Reglas obligatorias:

- **El hecho lo escribe el primitive, jamás el consumer.** Si un command produce un outcome que el
  ledger debe recordar, la fila se escribe dentro de ese command. Un consumer que encadena una
  segunda llamada para "reportar" lo que ya pasó es la forma de que el ledger mienta el día que la
  segunda llamada falle.
- **Append-only de verdad.** `seo_keyword_discovery_actions` tiene trigger
  `trg_seo_keyword_discovery_actions_append_only` (UPDATE y DELETE prohibidos, migración
  `20260814140033339_task-1664-seo-keyword-discovery.sql`). Nada en esta task puede intentar mutar ni
  borrar filas; un cambio de decisión es una fila nueva que supersede a la anterior.
- **La keyword es dato no confiable y `metadata_json` no la almacena como autoridad.** La migración lo
  declara literal: *"Sin copia de la keyword como autoridad y sin PII"*. La metadata lleva outcomes y
  referencias opacas (hash de contexto, id de draft, id de set), no texto del proveedor ni del usuario.
- **Boundary SEO↔AEO §1.1 intacto.** El bridge sigue leyendo candidatos SOLO por
  `readKeywordDiscovery` y NUNCA hace JOIN/VIEW/FK entre tablas `seo_*` y `grader_*`. Escribir el
  ledger de discovery desde el bridge es escribir en el lado SEO con un dato propio — no abre un cruce
  de motores.
- **Seguir una keyword es un compromiso de gasto diferido.** Cualquier cambio a `trackKeywords` es
  aditivo y no puede tocar el techo por target, el outcome por keyword, la idempotencia, el
  entitlement per-ORG `seo_v2` ni el reverso `untrackKeywords`.
- **`intent` de una membresía es un hecho con autor y NUNCA se hace `UPDATE`** (TASK-1659). Esta task
  no toca esa semántica; sólo lee el outcome que el command ya devuelve.

## Normative Docs

- `docs/tasks/complete/TASK-1664-growth-seo-keyword-discovery-seed-expansion.md` — contrato del
  dominio discovery, incluida la tabla de acciones y su rol de log de decisiones.
- `docs/tasks/complete/TASK-1665-growth-seo-keyword-discovery-workbench.md` — Slice 4, la decisión
  "una acción = un command" que esta task supersede con su razón explícita.
- `docs/tasks/complete/TASK-1666-growth-seo-grounded-query-bridge.md` — Slice 1, "candidate states
  permitidos (`new`, `selected_for_grounded_query`; no `dismissed` salvo re-selección explícita)".
- `docs/tasks/complete/TASK-1659-growth-seo-keyword-target-intent-model.md` — vocabulario de outcomes
  de `trackKeywords` y semántica de `intent` con autor.
- `docs/manual-de-uso/growth/descubrir-keywords-seo.md` — manual del operador, a actualizar si cambia
  lo que ve tras decidir.

## Dependencies & Impact

### Depends on

- `TASK-1664` (`complete`) — tabla `greenhouse_growth.seo_keyword_discovery_actions`, enum
  `SeoDiscoveryActionKind`, `recordKeywordDiscoveryAction`, `readKeywordDiscovery`.
- `TASK-1666` (`complete`) — `createGroundedQueryDraft` y su guard `ALLOWED_LATEST_ACTIONS`.
- `TASK-1659` (`complete`) — `trackKeywords` con `intent` declarado y outcome por keyword.
- `TASK-1665` (`complete`) — consumer UI del workbench; es quien hoy sólo escribe `dismissed`.

### Blocks / Impacts

- `TASK-1700` (cola priorizada de trabajo SEO) — su `recordSeoWorkQueueDecision` es un log
  append-only que **no ejecuta el command**, y esa frontera sólo se sostiene si el principio de esta
  task —el hecho lo escribe el primitive que produce el outcome, jamás el consumer— ya está vigente.
  Sin eso, la cola abre un segundo libro de decisiones sobre los mismos hechos que el ledger de
  discovery debería registrar, sin transacción que los reconcilie. Esta task debe cerrar antes de que
  la cola escriba su primera decisión.
- `TASK-1660` (`to-do`, lente **Objetivos**) — es la dueña de la reclasificación de intención sobre
  membresías vigentes. Si esta task define provenance de discovery en el camino de tracking, la lente
  Objetivos debe poder declarar la suya (o declarar explícitamente que no la tiene) sin inventar un
  segundo formato de metadata.
- Consumer UI del workbench de discovery — el chip pasará a moverse solo (candidato en
  `statePreparingAeo` / `stateTracked` por ledger, no sólo por `alreadyTracked`) y el orden del inbox
  dejará de poner arriba lo ya resuelto. Es un cambio de comportamiento visible **sin** cambio de
  código de UI.
- `KeywordDiscoveryCandidateDrawer.tsx` — su comentario declara a esta task dueña de la condición
  `dismissed`. Esta task cierra la parte server; el affordance visible de re-selección queda en un
  follow-up `ui-ux` (ver Out of Scope).

### Files owned

- `src/lib/growth/seo/keyword-discovery/queue.ts`
- `src/lib/growth/seo/keyword-discovery/contracts.ts`
- `src/lib/growth/seo/keyword-discovery/reader.ts`
- `src/lib/growth/seo/grounded-query-bridge.ts`
- `src/lib/growth/seo/track-keywords.ts`
- `src/app/api/admin/growth/seo/keyword-discovery/route.ts`
- `src/lib/api-platform/resources/ecosystem-growth-seo.ts`
- `src/lib/growth/seo/keyword-discovery/__tests__/queue.test.ts`
- `src/lib/growth/seo/keyword-discovery/__tests__/reader.test.ts`
- `src/lib/growth/seo/__tests__/grounded-query-bridge.test.ts`
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`
- `docs/documentation/growth/` (doc funcional del módulo SEO)
- `docs/manual-de-uso/growth/descubrir-keywords-seo.md`

## Current Repo State

### Already exists

- `src/lib/growth/seo/keyword-discovery/contracts.ts` — `SeoDiscoveryActionKind` con los cinco kinds y
  `SEO_DISCOVERY_ACTION_KINDS` como su lista runtime.
- `src/lib/growth/seo/keyword-discovery/queue.ts` — `recordKeywordDiscoveryAction`: chequeo de tenant
  por candidato (anti-oracle `run_not_found`), idempotency key derivada
  (`auto-<sha256(candidateId:actionKind:actor)>` cuando el caller no la pasa), `INSERT ... ON CONFLICT
  ON CONSTRAINT seo_keyword_discovery_actions_idempotency_unique DO NOTHING` y relectura para resolver
  `deduped`. Corre sobre `runGreenhousePostgresQuery`, **fuera** de cualquier transacción del caller.
- `migrations/20260814140033339_task-1664-seo-keyword-discovery.sql` — tabla con `CHECK (action_kind IN
  (...))` de cinco valores, `UNIQUE (organization_id, idempotency_key)`, índice
  `(candidate_id, created_at DESC)`, `metadata_json JSONB NOT NULL DEFAULT '{}'` y trigger append-only.
- `src/lib/growth/seo/keyword-discovery/reader.ts` — `latestAction` vía `DISTINCT ON (candidate_id)
  ... ORDER BY candidate_id, created_at DESC`, `alreadyTracked` derivado de
  `seo_keyword_set_members` con `effective_to IS NULL`, y el sort por defecto que pone
  `latestAction === null` primero.
- `src/lib/growth/seo/grounded-query-bridge.ts` — `createGroundedQueryDraft` con doble capability
  (`growth.seo.observation.read` + `growth.ai_visibility.prompt_set.manage`), advisory lock
  transaccional por intent dentro de `withGreenhousePostgresTransaction`, dedupe por `contextRef`,
  `groundingMode` honesto y `ALLOWED_LATEST_ACTIONS = [null, 'selected_for_grounded_query']`.
- `src/lib/growth/seo/track-keywords.ts` — `trackKeywords` (preflight de target + entitlement fuera de
  la transacción) y `applyKeywordTracking(client, input)` **ya exportado** y parametrizado por un
  cliente transaccional mínimo (`TrackKeywordsClient`), ejecutado dentro de `withTransaction`.
- `src/app/api/admin/growth/seo/keyword-discovery/route.ts` — `intent: 'record_action'` gateado por
  `growth.seo.target.configure`, valida `actionKind` contra `SEO_DISCOVERY_ACTION_KINDS` y delega en el
  primitive con `actor: tenant.userId`.
- `src/lib/api-platform/resources/ecosystem-growth-seo.ts` — el mismo `record_action` en el lane
  ecosystem, restringido a bindings `internal`, con `actor: mcp:<publicId>`.
- `src/views/.../discovery/keyword-discovery-action.ts` — el único caller de `record_action` desde la
  UI, y manda **siempre** `actionKind: 'dismissed'` (caso `dismiss` del `switch`).
- `src/views/.../discovery/KeywordDiscoveryResults.tsx` — `resolveState` con `case` para los cinco
  kinds, exportado a propósito para que tabla, card y drawer proyecten el mismo estado.

### Gap

- Ningún callsite del repo escribe `selected_for_grounded_query`, `selected_for_target` ni
  `promoted_to_tracking`. Verificado por barrido sobre `src/`, `scripts/`, `services/` y `migrations/`:
  las únicas apariciones fuera del enum, del `CHECK` de la migración y de los tests son el `case` de
  `resolveState`, el guard `ALLOWED_LATEST_ACTIONS` y comentarios.
- `createGroundedQueryDraft` retorna `ok: true` sin dejar rastro en el ledger de discovery. El único
  rastro del cruce vive del lado AEO (`groundingSources` con el `contextRef`), invisible desde la lente
  de discovery.
- El camino de tracking desde un candidato es `trackKeywords` con la keyword como identidad: el
  command **no recibe** `candidateId` ni `runId`, así que aunque quisiera escribir el ledger no sabría
  a qué candidato atribuirlo.
- `recordKeywordDiscoveryAction` no acepta un cliente transaccional: hoy no puede participar de la
  transacción de otro command.
- La idempotency key automática (`candidateId:actionKind:actor`) es demasiado gruesa para hechos
  repetibles: el mismo actor seleccionando el mismo candidato para dos drafts distintos produciría un
  solo registro.
- No existe re-selección: un candidato `dismissed` no tiene ningún command que lo devuelva a un estado
  admitido por el bridge.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/lib/growth/seo/**` dentro del portal Next.js, con el lane ecosystem en `src/lib/api-platform/resources/ecosystem-growth-seo.ts`
- Future candidate home: `domain-package`
- Boundary: el command `recordKeywordDiscoveryAction` y su variante transaccional son el ÚNICO camino de escritura al ledger; los consumers autorizados son la route app `api/admin/growth/seo/keyword-discovery`, el lane ecosystem `growth.seo` y los primitives del mismo dominio (`createGroundedQueryDraft`, camino de tracking)
- Server/browser split: el módulo entero es `import 'server-only'`; el navegador sólo ve el DTO del reader y los outcomes del command, jamás SQL, cliente de pool ni secretos
- Build impact: none — sin dependencias nuevas, sin entrada de filesystem, sin entrypoint global
- Extraction blocker: la transacción compartida entre el camino de tracking y el ledger exige que ambos vivan sobre el mismo pool Postgres; separar discovery de tracking en dos deployables rompería esa atomicidad

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: `greenhouse_growth.seo_keyword_discovery_actions` (log append-only de decisiones); NO cambia el SSOT de tracking (`greenhouse_growth.seo_keyword_set_members`) ni el de drafts AEO (`grader_prompt_sets`)
- Consumidores afectados: UI del workbench de discovery, lane app `api/admin/growth/seo/**`, lane ecosystem/MCP `growth.seo`, Nexa vía los mismos primitives
- Runtime target: `local` + `staging` + `production` (portal Vercel; sin worker ni cron)

### Contract surface

- Contrato existente a respetar: `src/lib/growth/seo/keyword-discovery/contracts.ts`,
  `src/lib/growth/seo/keyword-discovery/queue.ts` (`RecordKeywordDiscoveryActionInput`),
  `src/lib/growth/seo/keyword-discovery/reader.ts` (`SeoDiscoveryCandidateView.latestAction`),
  `src/lib/growth/seo/track-keywords.ts` (`TrackKeywordsOptions`, `applyKeywordTracking`),
  `src/lib/growth/seo/grounded-query-bridge.ts` (`GroundedQueryDraftResult`)
- Contrato nuevo o modificado: variante transaccional del append al ledger; campo opcional de
  procedencia de discovery en `TrackKeywordsOptions`; escritura interna del ledger en
  `createGroundedQueryDraft`; comando de re-selección según la decisión del Slice 1
- Backward compatibility: `compatible` — todo lo nuevo es opcional; un caller que no declara
  procedencia se comporta exactamente igual que hoy
- Full API parity: un solo primitive escribe el hecho y los tres consumers (UI, Nexa, MCP) lo heredan
  sin código propio. Ningún consumer gana una ruta de escritura nueva por esta task; los que ya
  pueden llamar `record_action` siguen pudiendo, con el mismo gate

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.seo_keyword_discovery_actions` (escritura),
  `greenhouse_growth.seo_keyword_discovery_candidates` (lectura, chequeo de tenant),
  `greenhouse_growth.seo_keyword_set_members` (lectura del outcome; sin cambio de semántica)
- Invariantes que no se pueden romper:
  - Append-only: cero `UPDATE`, cero `DELETE` sobre el ledger; el trigger los bloquea y ningún camino
    nuevo puede intentarlo.
  - `action_kind` siempre dentro del `CHECK` de la migración; si el Slice retira
    `selected_for_target` del enum TS, el `CHECK` de la base **se deja intacto** (una fila histórica
    con ese valor debe seguir siendo legible).
  - `metadata_json` sin keyword cruda como autoridad, sin PII, sin prosa del proveedor, sin SQL.
  - El ledger NO es autoridad de "esta keyword está siendo medida": eso lo sigue diciendo
    `seo_keyword_set_members`; el reader mantiene `alreadyTracked` derivado de ahí.
  - Un candidato ajeno a la organización del caller responde `run_not_found` (anti-oracle), también en
    el camino transaccional.
- Tenant/space boundary: `organization_id` se deriva del candidato y se contrasta contra el de la
  sesión/binding; nunca se acepta del body. En el camino de tracking, `organization_id` sale del
  target resuelto por el command, no del caller
- Idempotency/concurrency: la unicidad sigue siendo `(organization_id, idempotency_key)` con
  `ON CONFLICT DO NOTHING`. Las claves derivadas para los writers nuevos incorporan el **outcome
  durable** que las hace repetibles sin colisión (id del draft para grounded, id del set/membresía para
  tracking), en vez de sólo `candidateId:actionKind:actor`. El append de tracking corre dentro de la
  transacción de `applyKeywordTracking`; el de grounded corre dentro de la transacción del advisory
  lock del bridge
- Audit/outbox/history: el propio ledger ES el historial. No se emite evento outbox nuevo — el evento
  del compromiso de gasto ya lo emite el camino de tracking (`growth.seo.keyword_set.updated`) y no
  debe duplicarse

### Migration, backfill and rollout

- Migration posture: `none` — la tabla, el `CHECK`, el índice y el trigger ya existen desde
  TASK-1664; esta task sólo escribe kinds que el `CHECK` ya admite
- Default state: `enabled with rationale` — la escritura del ledger es aditiva y no cambia ningún
  outcome de negocio; el único efecto visible es que el candidato pasa a mostrar su estado real y deja
  de encabezar el inbox como pendiente. Todo el dominio sigue detrás de
  `GROWTH_SEO_KEYWORD_DISCOVERY_ENABLED`, que ya existe
- Backfill plan: **sin backfill.** No se puede reconstruir con honestidad quién decidió qué antes de
  que el writer existiera: inventar `actor` y `created_at` sería fabricar autoría en un log de
  decisiones. Los candidatos históricos ya promovidos quedan con `latestAction === null` y el reader
  sigue leyéndolos por `alreadyTracked`, exactamente como hoy
- Rollback path: `revert PR` — no hay estado que deshacer más allá de filas append-only inertes; una
  fila de ledger de más no cambia ningún cálculo de gasto, tracking ni AEO
- External coordination: `N/A — repo-only change`, sin secrets, sin env vars nuevas, sin
  reconfiguración de proveedor

### Security and access

- Auth/access gate: sin puertas nuevas. El grounded ya exige la doble capability
  (`growth.seo.observation.read` + `growth.ai_visibility.prompt_set.manage`); el tracking ya exige
  entitlement per-ORG `seo_v2` y, en el lane app, `growth.seo.target.configure`; el lane ecosystem
  sigue restringido a bindings de scope `internal`. La escritura del ledger hereda el gate del command
  que la produce y **no** agrega un camino sin gate
- Sensitive data posture: `no sensitive data` — el ledger guarda ids opacos, outcomes de enum y actor;
  la keyword no viaja como autoridad y no hay PII
- Error contract: los códigos cerrados existentes (`SeoDiscoveryErrorCode`, `GroundedQueryErrorCode`)
  traducidos 1:1 a `canonicalErrorResponse`; nada de prosa del proveedor ni SQL. Los errores se
  observan con `captureWithDomain(error, 'growth', ...)`
- Abuse/rate-limit posture: sin superficie nueva de abuso — la escritura sólo ocurre como consecuencia
  de un command ya gateado y con techo de gasto propio. La idempotencia evita que un retry infle el log

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/seo` y `pnpm lint`, `pnpm typecheck`
- DB/runtime checks: contra el proxy (`pnpm pg:connect:shell`), verificar sobre una corrida real que
  (a) tras un draft grounded existe la fila `selected_for_grounded_query` con su metadata, (b) tras una
  promoción existe `promoted_to_tracking` con el outcome correcto, (c) el `DISTINCT ON` del reader
  devuelve el kind esperado, (d) un intento de `UPDATE`/`DELETE` sobre el ledger sigue siendo rechazado
  por el trigger
- Integration checks: `pnpm staging:request POST /api/admin/growth/seo/grounded-queries '<body>'` y el
  equivalente del lane ecosystem para confirmar que ninguno de los dos consumers necesitó código nuevo
  para que el hecho quede registrado
- Reliability signals/logs: sin señal nueva. Se apoya en las del dominio y en `captureWithDomain` con
  `tags.source` de cada primitive
- Production verification sequence: ver `### Production verification sequence` en Rollout Plan

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] **Lógica en el primitive, no en la UI.** La escritura del ledger vive en
      `src/lib/growth/seo/keyword-discovery/queue.ts`, `grounded-query-bridge.ts` y el camino de
      tracking; ningún componente de `src/views/**` gana una llamada nueva.
- [ ] **Modelada como command sobre un aggregate**, no como click-handler: el hecho es una decisión
      sobre un candidato de una corrida, y se escribe donde nace.
- [ ] **Read/write canónicos**: la lectura sigue siendo `readKeywordDiscovery`; la escritura mantiene
      command semantics, autorización fina heredada del command productor, idempotencia por clave
      derivada del outcome durable, errores canónicos sanitizados y observabilidad por dominio.
- [ ] **Capability + grant**: `N/A — no capability nueva`. Esta task no introduce capability; reusa
      las ya grantadas (`growth.seo.target.configure`, `growth.seo.observation.read`,
      `growth.ai_visibility.prompt_set.manage`) y el entitlement per-ORG `seo_v2`.
- [ ] **Camino programático declarado**: lane app `api/admin/growth/seo/**` + lane ecosystem
      `growth.seo` ya existentes; ambos heredan el hecho sin cambio de contrato de request.
- [ ] **Write apto para `propose → confirm → execute`**: el ledger nunca se escribe por decisión de un
      LLM; se escribe como consecuencia de un command que el humano ya confirmó.
- [ ] **Un primitive, muchos consumers**: cero lógica duplicada por consumer; se verifica con un test
      que falla si un consumer escribe `promoted_to_tracking` o `selected_for_grounded_query` directo.
- [ ] **Parity check = SÍ**: la capability "registrar la decisión sobre un candidato" queda con
      contrato gobernado único.

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

### Slice 1 — Decisión del vocabulario y append transaccional

- Fijar por escrito, dentro de esta task y en la arquitectura del módulo, las dos decisiones abiertas:
  (a) si existe re-selección explícita y con qué command, (b) si `selected_for_target` conserva writer
  o se retira del enum TS. La recomendación fundamentada está en `## Detailed Spec`; el slice la
  confirma o la cambia con razón escrita.
- Extraer de `recordKeywordDiscoveryAction` una variante transaccional
  (`appendDiscoveryActionTx(client, input)`) que reciba un cliente mínimo con `query(sql, params)` —
  compatible tanto con `withGreenhousePostgresTransaction` (`@/lib/postgres/client`) como con
  `withTransaction` (`@/lib/db`), que son los dos helpers en juego.
- `recordKeywordDiscoveryAction` pasa a ser el wrapper no-transaccional de esa variante: mismo
  contrato público, mismo comportamiento observable, mismos tests verdes.
- Permitir una `idempotencyKey` derivada del outcome durable, documentando en el propio módulo por qué
  la clave automática actual (`candidateId:actionKind:actor`) no sirve para hechos repetibles.
- Tests de unidad de la variante transaccional: tenant ajeno, dedupe, metadata, y que el append
  participa del rollback del caller.

### Slice 2 — El bridge grounded deja su huella

- `createGroundedQueryDraft` escribe `selected_for_grounded_query` por cada candidato seleccionado,
  dentro de la transacción del advisory lock, después de resolver el draft.
- `metadata_json` por fila: `{ groundingMode, deduped, contextRef, draftId, runId }` — todo opaco o de
  enum cerrado, cero keyword cruda.
- Clave de idempotencia derivada de `(candidateId, draftId)`: repetir la operación sobre el mismo
  draft no apila filas, y el mismo candidato en un draft distinto sí deja su fila.
- Declarar en el código el residuo honesto: el draft se materializa en **otra** conexión
  (`authorGraderPromptSetDraft` abre su propia transacción), así que si el append falla el draft ya
  existe. Se documenta cómo se reconcilia (el `contextRef` del draft es durable y permite reconstruir
  la relación) y se decide explícitamente si el fallo del append degrada el resultado o sólo se observa.
- Tests: camino grounded, camino `baseline_fallback`, camino `deduped`, y que un fallo del append no
  produce una respuesta que afirme algo falso.

### Slice 3 — El camino de tracking deja su huella

- Agregar a `TrackKeywordsOptions` una procedencia de discovery opcional que ate keyword → candidato
  (más `runId`), sin cambiar la firma posicional de `trackKeywords` ni el contrato de outcomes.
- Dentro del `withTransaction` que ya envuelve `applyKeywordTracking`, escribir
  `promoted_to_tracking` por cada keyword cuyo outcome sea `tracked`, `already_tracked` o
  `intent_changed`, con `metadata_json` `{ outcome, intent, keywordSetId, runId }`.
- **No** se escribe fila para `capacity_exceeded` ni `invalid`: no hubo promoción, y registrar un
  intento fallido como decisión de promoción sería exactamente la clase de mentira que el ledger
  existe para evitar.
- Clave de idempotencia derivada de `(candidateId, keywordSetId, outcome)`.
- Verificar que no se crea ciclo de imports: hoy `keyword-discovery/**` no importa `track-keywords.ts`,
  así que la dependencia nueva es unidireccional; dejar un test o check que lo sostenga.
- Cablear la procedencia desde los dos consumers que hoy promueven desde un candidato (lane app y lane
  ecosystem), **sin** que ninguno escriba el ledger por su cuenta.

### Slice 4 — Re-selección y coherencia del guard

- Materializar la decisión del Slice 1 sobre re-selección: si se acepta, el command correspondiente
  escribe el kind que devuelve al candidato a un estado admitido por `ALLOWED_LATEST_ACTIONS`, con su
  gate, su idempotencia y su test; si se rechaza, `ALLOWED_LATEST_ACTIONS` y el comentario del bridge
  se corrigen para no prometer un camino que no existe.
- Revisar el orden por defecto del reader a la luz de los kinds nuevos: "pendiente primero" debe
  significar *sin decisión tomada*, no *sin fila*. Ajustar el criterio si un kind nuevo lo desmiente.
- Test de contrato que falla si un `action_kind` del enum queda sin writer ni razón declarada — el
  guard que habría cazado este hallazgo antes de que llegara a producción.

### Slice 5 — Documentación y cierre

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`: quién escribe cada `action_kind`, con
  la regla "el hecho lo escribe el primitive" y el delta que supersede la decisión de TASK-1665.
- `.claude/rules/growth-seo.md`: una línea de invariante si la regla merece auto-load al tocar el path.
- Doc funcional en `docs/documentation/growth/` y manual
  `docs/manual-de-uso/growth/descubrir-keywords-seo.md`: qué ve el operador ahora tras decidir.
- Delta en `docs/tasks/complete/TASK-1665-*.md` registrando que su decisión Slice 4 quedó superseded, y
  delta en `docs/tasks/to-do/TASK-1660-*.md` con el formato de procedencia que la lente Objetivos hereda.

## Out of Scope

- **Cualquier cambio visible de UI.** Ni el affordance de re-selección en el drawer, ni el copy de los
  chips, ni el `resolveState`. Esta task es `backend-data` y no toca `src/views/**` salvo para
  cablear la procedencia de discovery en la llamada a los primitives, sin cambio de layout, copy ni
  interacción. El affordance de re-selección es un follow-up `ui-ux` explícito.
- **Backfill histórico del ledger.** Ver la razón en el contrato Backend/Data: fabricar autoría es peor
  que no tener el dato.
- **Cambiar el SSOT de tracking.** `alreadyTracked` sigue derivando de `seo_keyword_set_members`; el
  ledger no pasa a ser autoridad de "esta keyword está siendo medida".
- **Reclasificación de intención sobre membresías vigentes.** Es de `TASK-1660`.
- **Tocar la máquina de estados de la corrida**, el costo del proveedor, el enriquecimiento de mercado
  o cualquier cosa que gaste presupuesto DataForSEO.
- **Migración de base.** La tabla y su `CHECK` ya admiten los cinco kinds.
- **Señal de reliability nueva** para candidatos sin decisión: si la operación la pide, va a task
  aparte.

## Detailed Spec

### La decisión de arquitectura, y por qué es ésta

La pregunta es dónde vive el writer de un hecho que nace como consecuencia de un command.

**Opción A — cada consumer encadena `record_action` tras el éxito.** Es la que está implícitamente
disponible hoy: el endpoint ya existe y acepta los cinco kinds. Es también la que deja el ledger a
merced de que cada cliente se acuerde. Tres consumers (UI, Nexa, lane MCP) por dos kinds son seis
lugares donde la disciplina puede fallar, y el séptimo es el tiempo: el consumer que se escriba el año
que viene no sabrá que debía hacerlo. Peor que el olvido es el fallo parcial: entre la llamada que
produce el outcome y la que lo registra hay una red, y cuando se cae queda el compromiso de gasto hecho
y la decisión sin autor. La verdad queda partida en dos y nada la reconcilia.

**Opción B (elegida) — el primitive escribe su propio hecho.** Un solo writer, dentro de la
transacción que produce el outcome. Full API Parity no es entonces un checklist que cada consumer
cumple: es una propiedad estructural — la UI, Nexa y MCP obtienen el registro **por construcción**,
porque todos pasan por el mismo command. Es también la lectura correcta del principio del repo: la
regla de negocio vive en `src/lib/**` y la UI es un cliente.

Lo que esto supersede de TASK-1665 está razonado en `## Why This Task Exists`: no es un segundo
almacén (el ledger responde una pregunta que ningún otro store responde) y sí hay transacción (que era
justo la objeción).

### Grados de atomicidad, declarados sin adornos

No los dos caminos tienen la misma garantía, y la task no finge que sí:

| Camino | Transacción del outcome | Append del ledger | Garantía real |
|---|---|---|---|
| Tracking | `withTransaction` sobre `applyKeywordTracking` | dentro de esa misma transacción | atómica: o hay membresía y fila, o no hay ninguna |
| Grounded | el draft se escribe en **otra** conexión desde `authorGraderPromptSetDraft` | dentro de la transacción del advisory lock del bridge | el draft puede existir sin la fila si el append falla |

El caso grounded es un residuo real, no un descuido. Se acota así: el append es idempotente, ocurre
inmediatamente después de resolver el draft y bajo el lock que serializa el intent, y la relación es
reconstruible desde el `contextRef` que el draft guarda en `groundingSources`. El Slice 2 decide y
documenta si un fallo del append degrada la respuesta del bridge o sólo se observa — lo que no puede
pasar es que se resuelva en silencio.

### Re-selección de un candidato descartado — recomendación

**Recomendación: sí existe, y es el mismo `record_action` que ya está, escribiendo
`selected_for_grounded_query` como decisión humana explícita.** Razones:

- El guard del bridge ya la contempla (`ALLOWED_LATEST_ACTIONS`), y `TASK-1666` la nombró
  explícitamente: *"no `dismissed` salvo re-selección explícita"*. El contrato ya la prometió.
- No hace falta un command nuevo. El ledger es append-only y el estado se deriva de la última fila:
  re-seleccionar **es** escribir una decisión posterior que supersede al descarte. Eso es precisamente
  cómo TASK-1665 describió el mecanismo de supersede.
- Es una decisión humana pura, no el reporte de un outcome, así que su lugar natural **sí** es el
  `record_action` del consumer — al revés que los dos kinds de esta task. La frontera queda nítida:
  `record_action` para lo que una persona decide sin que ningún command lo produzca (`dismissed`,
  re-selección); el primitive para lo que un command produce (`promoted_to_tracking`,
  `selected_for_grounded_query` como consecuencia de un draft).

Nota de diseño que el Slice 1 debe resolver: con esta recomendación, `selected_for_grounded_query`
tendría **dos** orígenes (decisión humana de re-selección y consecuencia del bridge), distinguibles por
`metadata_json` (`{ reason: 'reselected' }` vs `{ draftId, groundingMode }`). Si esa ambigüedad se
considera inaceptable, la alternativa es un kind dedicado — y eso **sí** exige migración del `CHECK`,
que hoy está en `none`. Decidir antes de escribir código.

### `selected_for_target` — recomendación

Es vocabulario sin dueño: hoy el camino de "declarar objetivo" es `trackKeywords` con `intent:
'target'`, cuyo hecho queda registrado como `promoted_to_tracking` con `metadata.intent = 'target'`.
Un `selected_for_target` separado sólo tendría sentido como paso previo a la promoción, y ese paso no
existe en el flujo. **Recomendación: retirarlo del enum TS con la razón escrita, dejando el `CHECK` de
la base intacto** para que una fila histórica siga siendo legible. Si el Slice 1 decide conservarlo,
debe declarar quién lo escribe y en qué momento — un enum con un valor que nadie escribe es
exactamente el hallazgo que originó esta task.

### Forma de la metadata

Cerrada, enumerable y opaca. Nada de texto libre.

- `selected_for_grounded_query` (bridge): `groundingMode` (`grounded_llm` | `baseline_fallback`),
  `deduped` (bool), `contextRef` (hash `seo.discovery.context:<sha256>`), `draftId`, `runId`.
- `selected_for_grounded_query` (re-selección humana, si se acepta): `reason` (`reselected`),
  `supersedes` (id de la acción previa).
- `promoted_to_tracking`: `outcome` (`tracked` | `already_tracked` | `intent_changed`), `intent`
  (`target` | `opportunity` | ausente si nadie declaró), `keywordSetId`, `runId`.

La ausencia de `intent` se escribe como ausencia, nunca como default: asumir `opportunity` afirmaría
una clasificación que nadie hizo (invariante TASK-1659).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (decisión + append transaccional) → Slice 2 (bridge) y Slice 3 (tracking), que pueden correr
  en paralelo una vez que Slice 1 cerró.
- Slice 1 **debe** cerrar antes que Slice 2 y Slice 3: sin la variante transaccional, ambos escribirían
  fuera de la transacción del caller y reintroducirían exactamente la falla parcial que la decisión de
  TASK-1665 temía con razón.
- Slice 4 (re-selección + guard + test de cobertura del enum) va **después** de Slice 2, porque el test
  que exige writer por cada kind sólo puede pasar cuando los writers existen.
- Slice 5 (docs) va al final, y su delta a TASK-1665 sólo se escribe cuando el comportamiento nuevo
  está verificado en runtime, no cuando el código compila.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El append dentro de la transacción de tracking falla y aborta una promoción que hoy funcionaría | UI | low | El append es un INSERT idempotente sobre una tabla con índice y sin contención; se cubre con test de rollback y se verifica en staging antes de prod | outcome `capacity_exceeded`/error inesperado en `/api/admin/growth/seo/keywords/track`; `captureWithDomain` con `tags.source: seo_track_keywords_command` |
| El draft grounded se crea y el append falla: candidato en draft sin fila de ledger | UI | medium | Append idempotente bajo el advisory lock, inmediatamente tras resolver el draft; relación reconstruible desde `contextRef`; Slice 2 decide y documenta si degrada o sólo observa | `captureWithDomain` con `tags.source: seo_grounded_query_bridge` |
| Idempotency key mal derivada colapsa dos decisiones distintas en una fila | UI | medium | Clave derivada del outcome durable (`draftId` / `keywordSetId`), no de `actor`; test explícito de "mismo candidato, dos drafts → dos filas" | fila faltante detectable en la query de verificación DB del Slice correspondiente |
| Ciclo de imports `track-keywords ↔ keyword-discovery` rompe el build | migration | low | Hoy la dependencia es unidireccional (`keyword-discovery` no importa `track-keywords`); Slice 3 agrega check que lo sostiene | `pnpm build` / `pnpm typecheck` |
| Un consumer futuro vuelve a escribir el kind por su cuenta y reabre el bug class | UI | medium | Test de contrato del Slice 4 que falla si un kind del enum queda sin writer declarado, más la regla escrita en la arquitectura del módulo | suite `src/lib/growth/seo` en rojo |
| El orden del inbox cambia y el operador siente que "se perdieron" candidatos | UI | high | Es el comportamiento correcto (lo resuelto deja de encabezar); se anuncia en el manual del operador en Slice 5 antes de dar la task por cerrada | reporte del operador |

### Feature flags / cutover

Sin flag nuevo. El dominio completo ya vive detrás de `GROWTH_SEO_KEYWORD_DISCOVERY_ENABLED`
(`src/lib/growth/seo/flags.ts`), que es el kill-switch existente y suficiente: apagarlo deja fuera de
servicio tanto el writer nuevo como la lente que lo consume. Agregar un segundo flag para un cambio
aditivo que no altera ningún outcome de negocio sumaría una fila al ledger de flags sin comprar
reversibilidad que el revert de PR no dé más rápido.

Cutover: inmediato al merge. El único efecto observable es que el candidato muestra el estado que ya
debía mostrar.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR; el wrapper público conserva su contrato, así que nada externo depende de la variante nueva | < 10 min | si |
| Slice 2 | revert PR; las filas ya escritas quedan inertes y sólo hacen que el candidato muestre su estado real | < 10 min | si |
| Slice 3 | revert PR; la procedencia es opcional, así que `trackKeywords` vuelve al comportamiento previo sin tocar membresías | < 10 min | si |
| Slice 4 | revert PR; si se agregó un kind con migración de `CHECK`, la reversa del `CHECK` NO se aplica (dejaría filas ilegibles) y se documenta como aditivo permanente | < 10 min | parcial |
| Slice 5 | revert de los commits de docs | < 5 min | si |

Ninguna fila del ledger se borra en ningún rollback: el trigger append-only lo impide y, si no lo
impidiera, borrar decisiones históricas sería peor que el bug.

### Production verification sequence

1. Merge a `develop` y verificar en staging con una corrida de discovery real que un candidato nuevo
   sigue apareciendo en `stateNew` y encabezando el inbox.
2. Ejecutar "Preparar consultas" sobre ese candidato en staging; verificar por DB que existe la fila
   `selected_for_grounded_query` con su metadata, y en la lente que el chip pasó a `statePreparingAeo`.
3. Ejecutar "Seguir"/"Declarar objetivo" sobre otro candidato; verificar la fila
   `promoted_to_tracking` con el outcome correcto y que `activeKeywordCount` se movió exactamente lo
   que debía.
4. Repetir 2 y 3 vía lane ecosystem con un binding `internal`, confirmando que el hecho queda igual sin
   que el consumer haya cambiado su request.
5. Provocar el caso `capacity_exceeded` (target al tope) y confirmar que **no** se escribió fila.
6. Intentar `UPDATE` y `DELETE` sobre una fila del ledger por SQL y confirmar que el trigger los
   rechaza.
7. Promoción a producción por el release control plane, y revisar durante 7 días que no aparecen
   errores nuevos con `tags.source` de los dos primitives tocados.

### Out-of-band coordination required

`N/A — repo-only change.` Sin secrets, sin env vars, sin configuración de proveedor, sin cambio en
Entra ni en el gateway MCP. Sí conviene avisar al operador de SEO que el orden del inbox de discovery
cambia (lo resuelto deja de encabezar), y eso se cubre con el manual del Slice 5.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe una variante transaccional del append al ledger que acepta un cliente con `query(sql, params)` y funciona tanto bajo `withGreenhousePostgresTransaction` como bajo `withTransaction`.
- [ ] `recordKeywordDiscoveryAction` conserva su contrato público exacto y su suite existente sigue verde sin modificar los asserts previos.
- [ ] Tras un `createGroundedQueryDraft` con `ok: true`, existe exactamente una fila `selected_for_grounded_query` por candidato seleccionado por draft, con `metadata_json` que incluye `groundingMode`, `deduped`, `contextRef`, `draftId` y `runId`.
- [ ] Repetir el mismo `createGroundedQueryDraft` sobre el mismo draft no agrega filas; el mismo candidato en un draft distinto sí agrega una.
- [ ] Tras una promoción a tracking con procedencia de discovery, existe una fila `promoted_to_tracking` por keyword con outcome `tracked`, `already_tracked` o `intent_changed`, y **cero** filas para `capacity_exceeded` o `invalid`.
- [ ] La fila de tracking y la membresía se escriben en la misma transacción: un test demuestra que si el append falla, la membresía no queda escrita.
- [ ] `metadata_json` de toda fila nueva no contiene la keyword como autoridad, ni PII, ni prosa del proveedor, ni SQL — verificado con un test sobre la forma de la metadata.
- [ ] Ningún archivo bajo `src/views/**` ni `src/app/api/**` escribe `promoted_to_tracking` ni `selected_for_grounded_query` de forma directa, y hay un test que falla si alguien lo reintroduce.
- [ ] La decisión sobre re-selección está escrita en la task y en la arquitectura del módulo, y el código la refleja: o existe el camino y tiene test, o `ALLOWED_LATEST_ACTIONS` y el comentario del bridge dejaron de prometerlo.
- [ ] La decisión sobre `selected_for_target` está escrita: o tiene writer con test, o quedó retirado del enum TS con la razón, sin tocar el `CHECK` de la base.
- [ ] Existe un test de contrato que falla si un `action_kind` del enum queda sin writer ni razón declarada.
- [ ] El chip del candidato refleja el estado real tras cada acción en staging, y el inbox deja de poner arriba los candidatos ya resueltos — verificado sobre una corrida real, no sólo con mocks.
- [ ] `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` declara quién escribe cada `action_kind` y por qué el writer es el primitive.
- [ ] `docs/tasks/complete/TASK-1665-*.md` tiene un `## Delta` que registra que su decisión de Slice 4 quedó superseded, con la razón.
- [ ] `docs/tasks/to-do/TASK-1660-*.md` tiene un `## Delta` con el formato de procedencia que la lente Objetivos hereda.
- [ ] Doc funcional y manual del operador actualizados con lo que cambia en la lente.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm vitest run src/lib/growth/seo`
- `pnpm test` (suite completa, como gate de cierre)
- `pnpm build` (gate de cierre, con autorización del operador por el costo de memoria)
- `pnpm task:lint --task TASK-1692` y `pnpm ops:lint --changed`
- Verificación en DB contra el proxy (`pnpm pg:connect:shell`) de las filas del ledger y del rechazo del trigger ante `UPDATE`/`DELETE`
- Verificación funcional en staging de los dos caminos (grounded y tracking) y del lane ecosystem
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] El comentario de `KeywordDiscoveryCandidateDrawer.tsx` que apunta a esta task quedó resuelto: o describe el estado nuevo, o su follow-up `ui-ux` quedó creado y referenciado.

## Follow-ups

- Follow-up `ui-ux`: affordance visible de re-selección en el drawer del candidato y revisión del copy de los chips ahora que el estado se mueve solo. Depende de la decisión del Slice 1.
- Evaluar si el ledger merece una señal de confiabilidad para candidatos con decisión pendiente por encima de una ventana, o si el orden del inbox ya basta.
- Evaluar si `TASK-1660` debe declarar su propia procedencia al reclasificar intención, para que el ledger distinga una promoción desde discovery de una reclasificación desde la lente Objetivos.

## Open Questions

- ¿La re-selección reusa `selected_for_grounded_query` con `metadata.reason`, o merece un kind propio con migración del `CHECK`? La recomendación está en `## Detailed Spec`; decidir en el Slice 1, porque cambia el `Migration posture` de `none` a `additive`.
- Si el append del ledger falla después de que el draft grounded ya se creó, ¿la respuesta del bridge degrada (y con qué código cerrado) o el fallo sólo se observa? Decidir en el Slice 2.
- ¿Una promoción cuyo outcome es `already_tracked` merece fila? La propuesta es que sí (alguien tomó la decisión, aunque el efecto sobre el set sea nulo), pero conviene confirmarlo con quien opera la lente.

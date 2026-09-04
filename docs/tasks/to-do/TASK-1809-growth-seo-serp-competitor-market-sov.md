# TASK-1809 — Growth SEO: universo competitivo y share of voice por keyword set

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|seo|data|integration`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Incorpora `DataForSEO Labs /serp_competitors/live/` como una lente pagada y gobernada de share of voice
orgánico para un conjunto versionado de keywords. La capacidad complementa la observación diaria top-N ya
persistida por `TASK-1699`: no reemplaza esa evidencia, no repite llamadas cuando esa evidencia basta y no
declara competidores automáticamente.

La captura será append-only, formula-aware para Improved ETV y consumible desde un reader canónico por Product
API y MCP. Crear esta task no autoriza implementación, llamadas al proveedor, gasto, scheduler, deploy ni
activación productiva.

## Why This Task Exists

`TASK-1699` permite descubrir dominios recurrentes dentro del top-N observado de las keywords que ya se
monitorean, con costo marginal de proveedor igual a cero. Esa lente responde quién aparece de forma sostenida en
la evidencia capturada, pero no entrega por sí sola una vista agregada de dominio del mercado para un keyword set
delimitado.

DataForSEO documenta `serp_competitors` precisamente para esa segunda pregunta. Greenhouse todavía no tiene
caller, persistencia, reader, política de costo ni provenance para el endpoint. Habilitarlo dentro de una task
cerrada diluiría ownership y podría duplicar gasto o convertir una estimación del proveedor en un competidor
declarado sin revisión. Esta task crea una capacidad separada: estima el SoV del mercado y produce propuestas con
evidencia; `TASK-1662` conserva en exclusiva `declareCompetitors`/`retireCompetitors` y la confirmación humana.

## Goal

- Capturar snapshots append-only de `serp_competitors` para keyword sets gobernados, con mercado, cobertura,
  costo y metodología ETV explícitos.
- Servir una vista market SoV reproducible desde un solo reader a Product API y MCP, sin mezclarla con el top-N
  observado.
- Impedir llamadas redundantes, expansión automática del monitoreo y declaración automática de competidores.
- Introducir la capacidad sólo después de que `TASK-1805` y `TASK-1806` establezcan Improved ETV como método
  canónico verificable.

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
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SEO_SEARCH_VISIBILITY_360_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_DATAFORSEO_ETV_METHOD_VERSIONING_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`

Reglas obligatorias:

- Market SoV estimado, top-N observado y competidor declarado son tres contratos distintos; nunca se fusionan,
  promedian ni sustituyen silenciosamente.
- Improved ETV se solicita explícitamente y su metodología forma parte de la identidad y provenance del hecho.
- Los snapshots y sus items son append-only; una recaptura crea nueva evidencia y no reescribe historia.
- El endpoint no puede dispararse desde un reader, Product API o MCP read; todo request pagado pasa por command,
  presupuesto, allowlist, freshness e idempotencia.
- Una propuesta puede referenciar evidencia opaca; sólo `declareCompetitors` de `TASK-1662`, con confirmación
  humana, modifica el conjunto de competidores declarados.
- `TASK-1699` es la primera fuente para preguntas cubiertas por su top-N ya pagado. `serp_competitors` sólo se usa
  cuando la pregunta requiere la lente agregada de mercado y el forecast fue aprobado.

## Normative Docs

- `docs/epics/in-progress/EPIC-022-growth-seo-search-visibility-360-module.md`
- `docs/tasks/complete/TASK-1662-growth-seo-keyword-gap-discovery.md`
- `docs/tasks/complete/TASK-1699-growth-seo-persist-serp-top-n-already-paid.md`
- `docs/tasks/complete/TASK-1700-growth-seo-prioritized-work-queue-aggregate.md`
- `docs/tasks/to-do/TASK-1805-growth-seo-dataforseo-improved-etv-versioned-transition.md`
- `docs/tasks/to-do/TASK-1806-growth-seo-dataforseo-improved-etv-evaluation-cutover.md`
- `.codex/skills/dataforseo-operator/SKILL.md`
- `.claude/skills/dataforseo-operator/references/02-labs.md`
- `.claude/skills/dataforseo-operator/references/07-contrato-greenhouse.md`

## Dependencies & Impact

### Depends on

- `TASK-1805` completa: policy, identidad metodológica, schema/readers formula-aware y compatibilidad
  cross-runtime para endpoints ETV-capable.
- `TASK-1806` completa: Improved ETV seleccionado como método canónico con evidencia y guardas posteriores al
  retiro del opt-out legacy.
- `TASK-1699` completa: snapshots top-N y `readSerpCompetitorCandidates` como lente observada sin costo marginal.
- `TASK-1662` completa: `declareCompetitors`/`retireCompetitors` como único camino gobernado de declaración.
- Transporte y spend ledger de `src/lib/ai/dataforseo.ts`.

### Blocks / Impacts

- Comparación de presencia competitiva agregada por keyword set dentro de EPIC-022.
- Propuestas de competidores con una segunda evidencia, sin alterar el command dueño de `TASK-1662`.
- Readers Growth SEO, Product API app/ecosystem, Nexa y MCP.
- Ops-worker, scheduler futuro, Platform Health y presupuesto DataForSEO Labs.

### Files owned

- `src/lib/growth/seo/competitor-market-sov/**`
- `src/lib/api-platform/resources/app-growth-seo.ts`
- `src/lib/api-platform/resources/ecosystem-growth-seo.ts`
- `src/mcp/greenhouse/tool-manifest.ts`
- `src/mcp/greenhouse/tool-manifest.generated.json`
- `src/mcp/greenhouse/server.ts`
- `src/mcp/greenhouse/tools.ts`
- `services/ops-worker/server.ts`
- `src/types/db.d.ts` sólo mediante generación canónica.
- `migrations/*_task-1809-*.sql`
- `docs/manual-de-uso/growth/serp-competitor-market-sov.md`
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` sólo para registrar la nueva capability.

## Current Repo State

### Already exists

- `src/lib/ai/dataforseo.ts` centraliza transporte, familia, circuit breaker y ledger de gasto.
- `TASK-1699` persiste el top-N ya comprado y expone `readSerpCompetitorCandidates` con propuesta, umbrales y
  `proposalRef`.
- `TASK-1662` posee los commands humanos de declaración/retiro y el análisis recurrente de keyword gap.
- `TASK-1805`/`TASK-1806` definen la transición metodológica transversal de ETV.
- API platform y MCP poseen manifests/recursos canónicos para proyectar readers SEO.

### Gap

- No existe caller de `serp_competitors`, parser, fixture ni smoke congelado en Greenhouse.
- No existe identidad versionada de keyword set, snapshot append-only ni lineage de SoV derivado.
- No existe preflight que decida cuándo basta el top-N de `TASK-1699` y cuándo una consulta pagada es legítima.
- No existe reader/API/MCP para comparar share of voice estimado sin exponer un disparador de gasto.
- No existen señales de staleness, deriva metodológica o sobrecosto específicas de esta capacidad.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/growth/seo/competitor-market-sov/**`, compartido por Vercel y ops-worker, con API/MCP
  como consumers read-only.
- Future candidate home: `domain-package`
- Boundary: command `captureSerpCompetitorMarketSov` para escritura pagada y reader
  `readSerpCompetitorMarketSov` para evidencia persistida; ningún consumer llama al provider directamente.
- Server/browser split: DataForSEO, DB, spend policy y selección metodológica son server-only; browser/agentes
  reciben DTO con provenance, cobertura y `capturedAt`.
- Build impact: sin SDK nuevo ni filesystem input; Vercel y ops-worker compilan el mismo contrato puro.
- Extraction blocker: PostgreSQL compartido, entitlements, spend ledger y provider externo impiden despliegue
  independiente inmediato.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: snapshots/facts append-only de market SoV y readers del dominio Growth SEO.
- Consumidores afectados: `API|MCP|Nexa|cron|worker|external`
- Runtime target: `local|staging|production|worker|cron|external`

### Contract surface

- Contrato existente a respetar: `src/lib/ai/dataforseo.ts`, ADR ETV, `readSerpCompetitorCandidates`,
  `declareCompetitors` y MCP manifest canónico.
- Contrato nuevo o modificado: `captureSerpCompetitorMarketSov`, `readSerpCompetitorMarketSov`, schema
  append-only, DTO provenance y recurso read-only API/MCP.
- Backward compatibility: `compatible`; capacidad aditiva, apagada por defecto y sin cambiar readers existentes.
- Full API parity: command interno gobernado para la captura y un único reader/projection para app, ecosystem,
  Nexa y MCP; ninguna superficie duplica cálculo, acceso ni lógica de costo.

### Data model and invariants

- Entidades/tablas/views afectadas: nuevas tablas `greenhouse_growth.seo_serp_competitor_sov_snapshots` y
  `greenhouse_growth.seo_serp_competitor_sov_items`, sujetas al nombre final aprobado en Plan Mode.
- Invariantes que no se pueden romper:
  - snapshot e items son append-only y conservan el payload/provenance mínimo necesario para replay;
  - la identidad incluye organization/target, versión o fingerprint del keyword set, mercado, motor, instante de
    captura y metodología ETV;
  - misma llave de request dentro de la ventana de freshness no genera una segunda compra ni un segundo snapshot;
  - SoV utiliza el valor/visibilidad oficial del endpoint cuando exista; cualquier derivación Greenhouse conserva
    fórmula, versión y denominador explícitos;
  - `etv` no se trata como share por sí solo y no se promedia con GSC ni con frecuencia top-N;
  - los items nunca escriben directamente `seo_competitors` ni alteran el keyword set monitoreado.
- Write-target allowlist: declarar ambas tablas nuevas en el boundary de escritura Growth SEO, con justificación,
  en el mismo PR que la migración.
- Tenant/space boundary: organization y `seo_target_id` se resuelven por entitlements SEO vigentes; el reader no
  permite inferir targets o keyword sets de otra organización.
- Idempotency/concurrency: fingerprint estable de input + market + engine + methodology + freshness bucket;
  advisory lock o primitive transaccional evita carreras entre cron y captura manual.
- Audit/outbox/history: snapshots/items append-only, ledger por request y log sanitizado de actor, consumer,
  input hash, método solicitado/efectivo, costo y motivo; sin outbox hasta demostrar un consumer reactivo.

### Migration, backfill and rollout

- Migration posture: `additive`.
- Default state: flag de captura `OFF`; scheduler no existe o queda `PAUSED`; reader sirve ausencia explícita.
- Backfill plan: ninguno. No recomprar historia ni reconstruir SoV del proveedor desde top-N.
- Rollback path: desactivar flag/pausar scheduler, conservar evidencia append-only y revertir código; no borrar
  tablas ni snapshots como rollback.
- External coordination: contrato/precio DataForSEO vigente, monto máximo por smoke/cadencia, subjects y mercado
  requieren aprobación humana antes de cualquier request pagado.

### Security and access

- Auth/access gate: capability/entitlement fino de Growth SEO; captura sólo operador/worker interno, lectura API
  app/ecosystem y MCP sólo para organizaciones autorizadas.
- Sensitive data posture: sin PII nueva; keyword sets, targets y competidores son datos comerciales tenant-scoped.
- Error contract: `serp_competitor_sov_not_available`, `serp_competitor_sov_stale`,
  `serp_competitor_sov_budget_exceeded`, `etv_methodology_drift`; sin raw provider errors.
- Abuse/rate-limit posture: allowlist de targets, máximo de keywords/filas, forecast y USD cap, freshness,
  deduplicación, rate limit y circuit breaker de familia Labs.

### Runtime evidence

- Local checks: unit tests de input fingerprint, parser fixture, SoV/provenance, dedupe, reader, access y
  separación frente a top-N.
- DB/runtime checks: migration sanity, tenant isolation, uniqueness, append-only, carrera concurrente y reader
  por metodología mediante tooling PostgreSQL canónico.
- Integration checks: fixture/replay y Sandbox cuando soporte el contrato; un único smoke pagado, acotado y
  aprobado antes de habilitar cualquier cadencia.
- Reliability signals/logs: `seo.serp_competitor_market_sov.stale`,
  `seo.serp_competitor_market_sov.cost_overrun`, `seo.serp_competitor_market_sov.etv_methodology_drift` y
  dedupe/preflight decisions sanitizadas.
- Production verification sequence: migration staging -> deploy flag OFF -> fixture/read/API/MCP -> forecast ->
  smoke aprobado staging -> readback DB/API/MCP -> habilitación limitada -> producción con flag OFF -> canary
  aprobado -> monitoreo; detenerse ante cualquier deriva o exceso.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Ambas tablas nuevas quedan declaradas con su justificación en el allowlist de destinos de escritura del
  dominio, en el mismo PR.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime and DB evidence covers append-only, isolation, dedupe, methodology and cost.
- [ ] Errores son canónicos, no filtran payloads ni debilitan presupuesto o entitlements.

## Capability Definition of Done — Full API Parity gate

- [ ] La lógica vive en `captureSerpCompetitorMarketSov`/`readSerpCompetitorMarketSov`, no en UI, route handler,
  MCP tool ni cron.
- [ ] Snapshot, keyword set y competitor item están modelados como recursos del dominio, no como click-handler.
- [ ] El command tiene autorización fina, idempotencia, audit/ledger, errores sanitizados y señales; el reader no
  dispara llamadas externas.
- [ ] Capability y grant real se registran en el mismo PR si el Plan Mode confirma una capability nueva.
- [ ] Product API app/ecosystem y MCP consumen la misma projection; Nexa accede a través de ese contrato.
- [ ] La captura es apta para `propose -> confirm -> execute`; ninguna lectura ejecuta o agenda gasto.
- [ ] Un primitive sirve a todos los consumers sin duplicar fórmula, filtros, tenant scope ni provenance.
- [ ] Parity check = SÍ: captura y lectura tienen contrato gobernado a nivel capability.

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

### Slice 0 — Contrato y no-duplicación

- Congelar request/response de `serp_competitors`, campos ETV/visibilidad, límites, motores, precio y semántica
  de cada métrica con fixture oficial o smoke mínimo aprobado.
- Definir el preflight `top_n_sufficient | market_sov_required | fresh_snapshot_available` y su evidencia; sólo
  `market_sov_required` sin snapshot fresco puede proponer compra.

### Slice 1 — Schema append-only y metodología

- Crear snapshot/items, keyword-set fingerprint/version, constraints, indexes, tenant boundary y allowlist.
- Persistir endpoint, request hash, mercado/motor, cobertura/truncamiento, método ETV solicitado/efectivo,
  `requestedAt`, `capturedAt`, policy version y costo.

### Slice 2 — Command, adapter y spend gate

- Implementar builder/parser tipado y `captureSerpCompetitorMarketSov` sobre el transporte neutral.
- Incorporar freshness, lock, dry-run/forecast, USD cap, filas/keywords máximos y flag OFF por defecto.

### Slice 3 — Reader y relación entre lentes

- Implementar `readSerpCompetitorMarketSov` con filtros formula-aware, lineage y estado stale/absent.
- Producir proposals con `proposalRef` opaco que puedan confirmarse por `declareCompetitors`, sin invocarlo.
- Exponer top-N observado y market SoV estimado como lentes paralelas, no como score combinado.

### Slice 4 — Product API, MCP y operación

- Proyectar el reader en API app/ecosystem y MCP read-only; sincronizar manifest source/generated y consumer.
- Integrar worker/cron con scheduler inicialmente pausado y señales de staleness, costo y deriva.

### Slice 5 — Evidencia, rollout y documentación

- Cerrar fixtures, tests, migration/readback y Sandbox antes del smoke pagado acotado.
- Ejecutar rollout progresivo sólo con aprobación de presupuesto, documentar cadencia elegida y actualizar
  arquitectura/manual/EPIC sin confundir código con activación.

## Out of Scope

- Implementación, gasto, provider call, scheduler, deploy o cutover durante la creación de esta task.
- Declarar/retirar competidores o crear otro command paralelo a `TASK-1662`.
- Reemplazar, recalcular o aumentar profundidad/cadencia del top-N de `TASK-1699`.
- Llamar `serp_competitors` cuando el top-N persistido ya responde la pregunta con freshness suficiente.
- Promediar market SoV, frecuencia top-N, GSC, ETV o clickstream en una métrica opaca.
- Crear una nueva cola de trabajo u ordenar prioridades de `TASK-1700`.
- Backfill histórico pagado, recompra de SERPs o inferencia retrospectiva de Improved ETV.
- Habilitar las otras familias DataForSEO Labs aún no consumidas.
- UI visible o exposición pública/client-facing sin una task `ui-ux` y revisión de sensibilidad separadas.

## Detailed Spec

El keyword set es un input versionado, no una lista mutable sin lineage. Su fingerprint se calcula sobre keywords
normalizadas y ordenadas más mercado/motor; cualquier cambio crea una versión nueva. La captura persiste la
versión resuelta y suficiente metadata de cobertura para que dos snapshots sólo sean comparables cuando sus
universos y metodología coinciden.

La métrica principal usa el campo oficial de visibilidad/share del endpoint cuando el contrato lo confirme. Si
Greenhouse necesita derivar una participación, el snapshot registra `formula_version`, numerador y denominador;
el valor no puede etiquetarse simplemente como ETV. Filas sin método efectivo verificable fallan cerrado para
trayectoria Improved ETV.

El preflight de costo consulta primero evidencia fresca de `TASK-1699` y snapshots previos de esta task. Su
resultado y motivo se registran aun cuando el costo proyectado sea cero. Ninguna optimización implica mezclar los
dos datasets: sólo decide si la pregunta necesita una compra nueva.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 -> Slice 1 -> Slice 2 -> Slice 3 -> Slice 4 -> Slice 5.
- `TASK-1805` y `TASK-1806` MUST estar completas antes del Slice 2.
- Schema y append-only MUST verificarse antes de cualquier request que pueda persistir.
- Reader formula-aware MUST existir antes del primer snapshot real.
- API/MCP read-only MUST verificarse con fixtures antes de habilitar worker o scheduler.
- Scheduler permanece pausado hasta smoke, forecast y aprobación humana documentados.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Se compra una vista que el top-N ya cubría | provider spend | medium | preflight + freshness + dedupe | decisión `top_n_sufficient` omitida |
| ETV cambia bajo el mismo campo | integration/data | high | request explícito + provenance del ADR | `seo.serp_competitor_market_sov.etv_methodology_drift` |
| Keyword sets distintos se comparan | reader/API/MCP | medium | fingerprint/version + coverage guard | `incomparable_keyword_set` |
| Estimación se presenta como observación | reporting/Nexa | high | lens/source/formula labels obligatorios | DTO sin provenance |
| Candidato se declara automáticamente | domain command | low | reader propone; command TASK-1662 separado | declaración sin `proposalRef`/confirmación |
| Cron multiplica costo | cron/external | medium | flag OFF + scheduler pausado + USD cap | `seo.serp_competitor_market_sov.cost_overrun` |
| Carrera crea dos compras | worker/integration | medium | lock + input hash + freshness bucket | duplicate ledger/request |
| Datos competitivos cruzan tenants | API/MCP | low | entitlement + organization scope tests | authorization/tenant mismatch |

### Feature flags / cutover

- Nombre propuesto: `GROWTH_SEO_SERP_COMPETITOR_SOV_CAPTURE_ENABLED`, default `false` en todos los runtimes.
- El scheduler se crea `PAUSED` y requiere además budget/allowlist; el flag por sí solo no autoriza gasto.
- El reader no necesita flag de compra: devuelve `absent`, `stale` o evidencia persistida sin llamar al provider.
- Revert inmediato: flag `false`, scheduler `PAUSED`, sin degradar top-N ni commands de `TASK-1662`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 0 | corregir contrato/fixture antes de runtime | inmediato | sí |
| 1 | conservar expand inerte; revertir consumers | minutos | sí |
| 2 | flag OFF, cancelar nueva captura y revertir adapter/command | minutos | sí |
| 3 | retirar projection nueva; preservar snapshots | minutos | sí |
| 4 | pausar scheduler y retirar rutas/tools aditivos | minutos | sí |
| 5 | mantener capability OFF y evidencia persistida | inmediato | sí |

### Production verification sequence

1. Verificar que `TASK-1805`/`TASK-1806` cerraron y el método canónico Improved ETV tiene readback vigente.
2. Congelar fixture/contrato/precio y aprobar forecast máximo.
3. Aplicar migración en staging y probar isolation, uniqueness, append-only y concurrency.
4. Desplegar staging con flag OFF; verificar fixture, reader, API, MCP y cero movimiento en spend ledger.
5. Autorizar un smoke acotado; verificar request explícito, costo, filas, método efectivo y readback end-to-end.
6. Habilitar sólo target/keyword set allowlisted con scheduler aún pausado; observar señales.
7. Repetir deploy en producción con flag OFF y efectuar canary sólo tras aprobación separada.
8. Definir cadencia desde costo/freshness observado; activar scheduler después del canary, no antes.

### Out-of-band coordination required

- Validación contractual y de precio con DataForSEO antes del primer request pagado.
- Aprobación humana de monto USD, target, keyword set, mercado, límites, canary y cadencia.
- Ninguna coordinación externa puede interpretarse como autorización implícita para auto-declarar competidores.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## MCP Tools & Skills Contract

Esta task incluye como entregable obligatorio la capa de uso por agentes; no se considera completa con el
primitive, reader, API o documentación humana solamente.

- [ ] Crear o actualizar las tools MCP necesarias para operar/leer esta capacidad desde el mismo primitive
  canónico. Si una tool existente cubre el caso, actualizarla sin duplicarla; si no corresponde una tool nueva,
  declarar las tools afectadas y la razón de exclusión explícita en el gateway.
- [ ] Crear o actualizar la guía de uso en las skills dueñas `.codex/skills/dataforseo-operator/**` y
  `.codex/skills/seo-aeo/**`, junto con sus espejos `.claude/**`, incluyendo selección de tool, inputs,
  interpretación, metodología/provenance, costos, límites, errores y acciones prohibidas.
- [ ] Mantener las copias Codex/Claude byte-idénticas y, cuando el registro de skills servidas de `TASK-1804`
  esté disponible, crear o actualizar también el recurso/manual agent-facing que el MCP entrega bajo demanda.
  No crear una skill por endpoint si la skill de dominio vigente puede ampliarse de forma clara.
- [ ] Actualizar en el mismo PR el lane ecosystem, `src/mcp/greenhouse/tool-manifest.ts`, su artefacto generado,
  schema/annotations/descripción y la federación del gateway; toda tool interna queda federada o excluida con una
  razón sustantiva, nunca simplemente ausente.
- [ ] Las tools read sólo leen evidencia persistida y no disparan llamadas pagadas on-read. Toda tool que escriba,
  compre o comprometa gasto usa capability fina, presupuesto, idempotencia, audit y
  `propose → confirm → execute`; nunca se agrega un write scope al cliente PKCE público compartido.
- [ ] Verificar `pnpm mcp:manifest:generate && pnpm mcp:manifest:check`, `pnpm skills:mirrors`, paridad
  bidireccional del gateway y canaries allow/deny/fault. Registro o compilación sin readback de la lane y del
  gateway no constituye cierre operativo.


## Acceptance Criteria

- [ ] `serp_competitors` se llama sólo mediante command gobernado y siempre solicita Improved ETV explícitamente.
- [ ] Snapshots/items son append-only, tenant-scoped, keyword-set-versioned y formula-aware.
- [ ] Fixture y smoke congelan la semántica de métricas, cobertura, límites y precio antes de una cadencia.
- [ ] Preflight evita una compra cuando top-N o un snapshot fresco ya responde la pregunta.
- [ ] Retries/concurrencia no producen segunda llamada, segundo cargo ni snapshot duplicado.
- [ ] SoV estimado y top-N observado permanecen separados en schema, reader, DTO, API, MCP y copy técnico.
- [ ] ETV, GSC, clickstream y frecuencia top-N no se promedian ni se presentan como una sola métrica.
- [ ] El reader puede proponer un candidato con `proposalRef`, pero sólo `declareCompetitors` de `TASK-1662`
  ejecuta la declaración tras confirmación humana.
- [ ] API app/ecosystem, Nexa y MCP consumen el mismo reader y no pueden iniciar gasto desde una lectura.
- [ ] Capability/grants, manifest MCP source/generated y gateway consumer están sincronizados.
- [ ] Flag queda OFF y scheduler PAUSED hasta forecast, smoke y aprobación explícita.
- [ ] Señales distinguen staleness, cost overrun y metodología drift en worker/Vercel.
- [ ] Documentación técnica, funcional y manual explica límites, provenance, costo y relación con TASK-1662/1699.

## Verification

- `pnpm task:lint --task TASK-1809`
- Vitest dirigido a builder/parser, fixture, fingerprint, dedupe/lock, SoV, provenance, reader y auth.
- Sanity PG mediante tooling seguro: migration, tenant isolation, uniqueness, append-only y concurrency.
- `pnpm db:generate-types` y diff generado revisado.
- Contract tests Product API app/ecosystem y snapshots MCP.
- `pnpm mcp:manifest:generate && pnpm mcp:manifest:check`
- Dry-run/forecast con cero request y spend ledger sin movimiento.
- Sandbox gratuito si soporta el endpoint; smoke pagado sólo con monto máximo aprobado.
- `pnpm test:live` para evidencia DB autorizada, nunca para gasto implícito; confirmar `passed`.
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `pnpm docs:context-check:strict` como último gate.

## Closing Protocol

- [ ] `Lifecycle` y `Status real` coinciden con código, migración, deploy, scheduler y evidencia runtime.
- [ ] El archivo vive en la carpeta de lifecycle correcta.
- [ ] `docs/tasks/TASK_ID_REGISTRY.md`, `docs/tasks/README.md` y `EPIC-022` están sincronizados al cerrar.
- [ ] `TASK-1662` conserva ownership exclusivo de declaración/retiro y `TASK-1699` del top-N observado.
- [ ] El cierre separa requests/costo autorizados, código, deploy, activación, scheduler y readback live.
- [ ] Arquitectura/manual y skills DataForSEO/SEO se actualizan sólo si el contrato implementado cambia su canon.
- [ ] `Handoff.md` y `changelog.md` registran decisiones, riesgos y evidencia proporcional.
- [ ] Se ejecutó chequeo de impacto cruzado sobre readers API/MCP, spend ledger y tasks relacionadas.

## Follow-ups

- Crear una task `ui-ux` si el producto necesita comparar visualmente market SoV y top-N más allá de metadata
  aditiva en superficies existentes.
- Evaluar Bing sólo después de validar demanda, contrato, costo y comparabilidad; no habilitarlo preventivamente.
- Evaluar una cadencia recurrente sólo con costo observado y necesidad de freshness demostrada por target.

# TASK-616 — API Platform Foundation & Ecosystem Read Surface V1

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseño listo para implementación`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-616-api-platform-foundation-ecosystem-read-surface-v1`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Primer slice ejecutable de la nueva `API platform` de Greenhouse. Crea la foundation shared (`src/lib/api-platform/**`) y una primera `ecosystem read surface` estable en `src/app/api/platform/ecosystem/**`, sin reescribir aún `/api/integrations/v1/*` ni absorber el programa más amplio de `Data Node`.

## Why This Task Exists

La arquitectura canónica de plataforma API ya quedó formalizada en `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`, pero el runtime actual sigue partido entre:

- rutas de producto con auth y payload ad hoc
- el lane legacy `/api/integrations/v1/*`
- el carril endurecido `sister-platforms/*`
- readers mezclados entre `PostgreSQL`, `greenhouse_serving`, `BigQuery` y facades externas

Sin una task ejecutable específica, la implementación corre el riesgo de nacer como:

- proxy de rutas legacy
- expansión informal de `integrations/v1`
- foundation MCP prematura
- o refactor transversal demasiado amplio

`TASK-616` existe para evitar eso y abrir un carril incremental, robusto y reusable.

## Goal

- Crear la capability shared `api-platform` con contratos uniformes de auth, context, envelope, errores, observabilidad y versionado.
- Exponer una primera lane `ecosystem` de solo lectura, montada sobre adapters por aggregate.
- Dejar `integrations/v1` explícitamente conviviente y transicional, sin absorber `TASK-040` ni romper consumers existentes.

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
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`
- `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- `TASK-040` sigue siendo baseline programática vigente del `Data Node`; esta task la referencia pero no la reemplaza ni la absorbe.
- No reescribir ni mover `/api/integrations/v1/*` como parte de este primer slice; la convergencia debe ser aditiva.
- `MCP` sigue fuera de scope directo; cualquier decisión debe mantenerlo downstream de la API estable.
- Nuevos endpoints de platform API deben nacer sobre adapters shared por aggregate y no como proxies de rutas legacy.
- La lane inicial debe ser `read-only` y ecosystem-facing; writes idempotentes quedan preparados por foundation, no expandidos masivamente en este corte.
- Si una extracción desde `src/lib/sister-platforms/external-auth.ts` o `src/lib/integrations/*` introduce riesgo de regresión, preferir duplicación controlada/adaptación local en `src/lib/api-platform/**` antes que refactor compartido agresivo en el primer corte.

## Normative Docs

- `docs/tasks/to-do/TASK-040-data-node-architecture-v2.md`
- `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.md`
- `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.openapi.yaml`
- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- `src/lib/integrations/integration-auth.ts`
- `src/lib/integrations/greenhouse-integration.ts`
- `src/lib/sister-platforms/external-auth.ts`
- `src/lib/sister-platforms/bindings.ts`
- `src/app/api/integrations/v1/**`
- `src/lib/account-360/organization-store.ts`
- `src/app/api/organizations/route.ts`
- `src/app/api/organizations/[id]/route.ts`
- `src/app/api/persons/360/route.ts`
- `src/lib/tenant/authorization.ts`

### Blocks / Impacts

- futura lane MCP downstream para ecosystem reads
- follow-ons de `Ops Registry` que necesiten contracts API más uniformes
- estabilización de futuras rutas `api/platform/internal/*`
- convivencia ordenada entre `integrations/v1` y `platform/ecosystem`

### Files owned

- `src/lib/api-platform/**`
- `src/app/api/platform/**`
- `docs/tasks/to-do/TASK-616-api-platform-foundation-ecosystem-read-surface-v1.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `Handoff.md`

## Current Repo State

### Already exists

- Auth machine-to-machine base en `src/lib/integrations/integration-auth.ts`
- Carril endurecido para sister platforms en `src/lib/sister-platforms/external-auth.ts`
- Runtime de bindings, consumers, request logs y rate limiting ya materializado para sister platforms
- Readers/shared stores útiles en dominios como `organizations`
- Arquitectura canónica nueva en `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`

### Gap

- No existe `src/lib/api-platform/**`
- No existe `src/app/api/platform/**`
- No hay envelope uniforme cross-lane para consumers ecosystem-facing
- No hay taxonomía shared de errores/degraded modes para la nueva plataforma
- `integrations/v1` sigue siendo el único carril ecosystem real, pero no debe seguir creciendo como catch-all

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

### Slice 1 — Core foundation

- Crear `src/lib/api-platform/core/**` con:
  - request context
  - version negotiation
  - response envelope
  - error types/taxonomy
  - observability helpers
  - rate limit header helpers
- Definir contratos base reutilizables para lanes `internal` y `ecosystem`, aunque en esta task solo se implemente `ecosystem`.

### Slice 2 — Ecosystem auth adapter

- Extraer/adaptar lo reutilizable del carril `sister-platforms` hacia la foundation nueva sin romper el runtime actual.
- Definir el auth/context canónico de `ecosystem` para platform API:
  - consumer token
  - scope explícito
  - binding-aware resolution cuando aplique
  - request logging consistente

### Slice 3 — First read resources

- Crear adapters por aggregate en `src/lib/api-platform/resources/**` para:
  - `organizations`
  - `capabilities`
  - `readiness`
- Priorizar `PostgreSQL / greenhouse_serving` o readers canónicos existentes donde sea posible.
- Evitar proxies a rutas legacy.

### Slice 4 — First platform routes

- Exponer la primera lane en `src/app/api/platform/ecosystem/**` con endpoints iniciales como:
  - `GET /api/platform/ecosystem/context`
  - `GET /api/platform/ecosystem/organizations`
  - `GET /api/platform/ecosystem/organizations/[id]`
  - `GET /api/platform/ecosystem/capabilities`
  - `GET /api/platform/ecosystem/readiness`
- Incluir response envelope, request IDs y headers operativos uniformes.

### Slice 5 — Documentation & coexistence contract

- Sincronizar la arquitectura/documentación operativa mínima que cambie por la implementación.
- Dejar explícita la coexistencia entre:
  - `/api/integrations/v1/*`
  - `/api/platform/ecosystem/*`
- Documentar qué contracts siguen legacy y cuáles pasan a ser canónicos para el nuevo carril.

### Slice 6 — No-break rollout controls

- Verificar explícitamente que los consumers actuales de `/api/integrations/v1/*` y `/api/integrations/v1/sister-platforms/*` siguen respondiendo igual que antes.
- Mantener la primera implementación limitada a aggregates maduros (`context`, `capabilities`, `readiness`, `organizations`) y evitar abrir readers más ambiguos en el mismo corte.
- Si aparece una necesidad de refactor transversal en auth/logging/shared helpers, extraerla como follow-up en vez de mezclarla dentro de la primera entrega runtime.

## Out of Scope

- absorber o cerrar `TASK-040`
- construir el MCP server
- abrir `public API`
- migrar masivamente todas las rutas legacy del repo
- implementar writes ecosystem-facing amplios
- replatform completa de readers `BigQuery -> Postgres`
- unificación profunda de tablas de request logging entre lanes existentes y el carril nuevo
- refactor compartido de auth si el cambio deja de ser claramente aditivo y verificable

## Detailed Spec

La decisión clave de esta task es de secuencia:

1. crear foundation shared
2. exponer pocos resources buenos
3. probar convivencia con el lane actual
4. después abrir follow-ons de MCP, writes y migraciones de contracts legacy

El criterio canónico es:

- `TASK-040` sigue ordenando el programa de `Data Node`
- `TASK-616` ejecuta la nueva arquitectura de platform API
- `integrations/v1` no se rompe ni se “renombra”; simplemente deja de ser la única surface ecosystem-facing del futuro

Decisiones esperadas:

1. **Versionado**
   - aplicar la policy de `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
   - no dejar la primera iteración sin version negotiation explícita

2. **Backend policy**
   - usar readers canónicos/adapters por aggregate
   - no exponer `BigQuery` como shape contractual hacia consumers

3. **Observabilidad**
   - el request logging del lane ecosystem nuevo debe ser comparable al del carril `sister-platforms`
   - declarar provenance/degraded mode cuando aporte valor operacional

4. **Convergencia**
   - no introducir duplicación semántica innecesaria entre `integrations/v1` y `platform/ecosystem`
   - si un endpoint nuevo sustituye semánticamente a uno viejo, documentar la relación de convivencia

## Risk Controls

La task debe ejecutarse con política explícita de no-break rollout.

### Guardrails

1. **Aditivo primero**
   - la implementación nueva no debe mover ni redirigir rutas existentes
   - ningún consumer actual debe cambiar de URL o auth model por esta task

2. **Sin refactor profundo prematuro**
   - si reutilizar código legacy exige reescribir piezas centrales de `integrations` o `sister-platforms`, cortar scope y abrir follow-up

3. **Aggregates maduros solamente**
   - el primer corte runtime debe limitarse a resources con readers ya maduros o semántica suficientemente estable
   - no abrir `people` o resources más complejos en el mismo primer merge si todavía generan duda de contrato

4. **Parity checks**
   - comparar outputs y comportamiento básico de lanes legacy antes y después del merge
   - cualquier divergencia deliberada debe quedar documentada, no implícita

5. **MCP prohibido en este corte**
   - si durante la implementación aparece tentación de abrir tools o adapters MCP, sacar ese trabajo del scope

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe una capability shared nueva `src/lib/api-platform/**` con foundation reusable de platform API.
- [ ] Existe una primera lane `src/app/api/platform/ecosystem/**` de solo lectura con al menos contexto, organizaciones, capabilities y readiness.
- [ ] Los endpoints nuevos usan envelope uniforme, request ID y auth/context ecosystem consistente.
- [ ] La task deja explícita la convivencia con `/api/integrations/v1/*` sin romper consumers existentes.
- [ ] `TASK-040` sigue vigente como baseline programática y no queda absorbida ni contradictoria tras este corte.
- [ ] Se validó explícitamente que `/api/integrations/v1/*` y `/api/integrations/v1/sister-platforms/*` no sufrieron regresión observable por el corte.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- tests focalizados de la foundation nueva y/o rutas nuevas
- validación manual local de `GET /api/platform/ecosystem/*`
- smoke/regression checks de `GET /api/integrations/v1/catalog/capabilities`
- smoke/regression checks de `GET /api/integrations/v1/tenants`
- smoke/regression checks de `GET /api/integrations/v1/sister-platforms/context`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] se verificó explícitamente que los consumers actuales de `/api/integrations/v1/*` no quedaron rotos ni redirigidos sin contrato

## Follow-ups

- task de writes idempotentes ecosystem-facing sobre la foundation nueva
- task de `internal platform routes`
- task de adapter `MCP` downstream sobre `platform/ecosystem`
- convergencia gradual o deprecación documentada de slices específicos de `/api/integrations/v1/*`

## Open Questions

- Conviene que `organizations` sea el primer aggregate ecosystem-facing o que el primer slice exponga también `people` si los readers actuales ya están suficientemente maduros.
- Qué partes del request logging de `sister-platforms` deben generalizarse a una tabla/platform layer común y cuáles deben seguir separadas por lane en la primera iteración.

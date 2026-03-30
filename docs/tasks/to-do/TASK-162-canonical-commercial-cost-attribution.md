# TASK-162 — Canonical Commercial Cost Attribution

## Delta 2026-03-30

- Esta task queda explícitamente secuenciada después de `TASK-141`.
- El contrato de identidad ya endurecido fija un boundary que `TASK-162` no puede reabrir:
  - `identity_profile` enriquece trazabilidad humana cross-source
  - `member_id` sigue siendo la llave operativa fuerte para costo, payroll, capacity, ICO y serving
  - `client_user` no participa como raíz humana ni como llave de atribución comercial
- La consecuencia para esta lane:
  - la capa canónica de commercial cost attribution debe construirse encima del contrato person-first
  - pero no debe mover la raíz operativa del costo fuera de `member_id`

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | P0 |
| Impact | Muy alto |
| Effort | Alto |
| Status real | `Diseño` |
| Rank | — |
| Domain | Finance / Cost Intelligence / Team Capacity / Payroll / Platform |
| Sequence | Follow-on canónico post `TASK-055`, `TASK-057`, `TASK-067`→`TASK-071`, `TASK-138` y `TASK-139` |

## Summary

Greenhouse adopta una capa canónica única para atribución comercial de costo laboral y costo cargado. Payroll, Team Capacity y Finance siguen calculando sus piezas de dominio, pero la verdad consolidada debe resolverse en una sola capa shared y desde ahí alimentar a Finance, Cost Intelligence, Agency, People, Home, Nexa, outbox/reactive projections y futuros consumers.

La capa no reemplaza a Finance ni a Cost Intelligence:

- `Finance` la consume como truth de atribución comercial
- `Cost Intelligence` la consume como base para snapshots y P&L operativo
- otros módulos la consumen directa o indirectamente a través de serving materializado

## Why This Task Exists

Hoy Greenhouse ya tiene piezas importantes:

- costo base por período desde Payroll
- `member_capacity_economics` como snapshot de costo/capacidad por miembro
- `client_labor_cost_allocation` como bridge laboral
- `operational_pl_snapshots` como serving de Cost Intelligence
- consumers distribuidos en Finance, Agency, People, Home y Nexa

Pero todavía no existe una capa institucional única que defina, sin ambigüedad:

- cuál es la fuente canónica del costo base comercial
- qué tipo de assignment participa o no en atribución comercial
- qué porción va a labor cost vs overhead interno
- cómo se resuelve el cruce entre `member`, payroll, assignments, capacity y P&L
- cómo se invalida, rematerializa y observa esta verdad vía outbox, projections y cloud runtime

El síntoma visible es que distintas surfaces pueden verse “razonables” por separado pero divergir semánticamente:

- `Agency > Team` puede mostrar `1.0 FTE` comercial
- Cost Intelligence puede repartir costo con otra lógica
- Finance puede seguir dependiendo de bridges o fallbacks parciales
- consumers downstream pueden leer snapshots correctos pero sobre una atribución todavía no suficientemente canonizada

Esta task existe para cerrar esa brecha como contrato de plataforma, no como arreglo local de una vista.

## Goal

- Implementar la decisión ya tomada de una capa canónica de `commercial cost attribution` reusable en todo Greenhouse.
- Convertirla en un boundary explícito entre:
  - capas base (`Payroll`, `Team Capacity`, `Finance base`)
  - capas consumidoras (`Finance`, `Cost Intelligence`, `Agency`, `People`, `Home`, `Nexa`)
- Separar explícitamente:
  - costo laboral comercial
  - carga/assignments internos
  - overhead interno
  - snapshots de management accounting
- Alinear serving, projections, outbox, health y consumers sobre esa verdad única.
- Dejar arquitectura, migración, runtime y observabilidad preparados para escalar sin drift semántico.

## Enterprise Guardrails

Para estándar enterprise, esta capa no debe quedarse solo en “consolidar mejor el costo”. Debe nacer con guardrails explícitos:

### 1. Contract-first

- definir shape canónico de la capa
- documentar significado de cada campo
- distinguir explícitamente:
  - costo base
  - costo atribuible comercial
  - costo interno excluido
  - overhead atribuible
  - costo no billable
- introducir versión de contrato cuando la semántica cambie

### 2. Explainability

Cada monto relevante debe poder responder:

- qué fuente lo originó
- qué regla lo atribuyó
- qué se excluyó
- qué período/materialización lo produjo
- qué versión de regla estaba activa

### 3. Rule versioning

- versionar reglas de attribution y overhead
- soportar recompute histórico sin mezclar semánticas de distintas épocas
- dejar rastro de qué versión produjo cada snapshot o attribution row

### 4. Semantic data quality

Además de health técnico, la capa debe exponer checks semánticos:

- costo base vs costo atribuido
- diferencia no explicada
- cobertura por período
- miembros sin attribution comercial válida
- clients con margin/cost implausible
- porcentaje de costo excluido interno

### 5. Reactive determinism

- definir qué evento invalida qué parte de la capa
- distinguir recompute incremental vs backfill
- asegurar idempotencia
- hacer explícito el orden lógico entre projections relacionadas

### 6. Observability & operations

- freshness de materialización
- drift detection
- replay/recovery
- métricas por handler/event type
- health semántico además de health runtime

### 7. Ownership & governance

- definir owner del contrato
- definir quién puede cambiar reglas
- exigir ADR o delta de arquitectura cuando cambie la semántica
- evitar que consumers muten localmente la lógica de attribution

### 8. Audit surfaces

- exponer una explain API o audit surface
- permitir responder por qué un cliente/space/org recibió cierto costo
- evitar debugging solo por SQL manual

### 9. Real-world fixtures

- fijar suites con casos reales tipo `Sky`
- cubrir:
  - billable + internal simultáneo
  - multi-cliente
  - USD + CLP
  - payroll parcial/final
  - overhead directo y compartido
  - ausencia de FX o allocation

### 10. Progressive rollout

- rollout por fases
- primero la capa
- luego Finance + Cost Intelligence
- después consumers downstream
- no hacer big bang sin capacidad de observación y fallback

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_TEAM_CAPACITY_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

Reglas obligatorias:

- `member_id` sigue siendo la clave operativa de costo laboral, payroll y capacity.
- `client_user` no debe usarse como raíz de costo/comercial attribution.
- `identity_profile` puede enriquecer identidad humana, pero no reemplaza la llave operativa del costo.
- assignments internos como `space-efeonce`, `efeonce_internal` y `client_internal` no deben competir como cliente comercial.
- una sola capa consolidada publica la verdad de costo comercial; los módulos fuente no deben exponer verdades finales divergentes a consumers downstream.
- Cost Intelligence no redefine un P&L paralelo; materializa management accounting consistente con Finance.
- cualquier excepción de escritura o `DELETE` sobre serving debe documentarse y justificarse en el access model runtime.

## Dependencies & Impact

### Depends on

- `TASK-055` — bridge histórico `client_labor_cost_allocation`
- `TASK-057` — direct overhead / loaded cost por persona
- `TASK-067` a `TASK-071` — Cost Intelligence foundation, closure, P&L y consumers
- `TASK-078` — costo empleador en `member_capacity_economics`
- `TASK-138` — gaps y synergies cross-module
- `TASK-139` — hardening Finance / data quality
- `TASK-141` — identity contract person-first, para no mezclar identidad humana con acceso

### Impacts to

- `Finance` dashboard / P&L engine / bridges
- `Cost Intelligence` period closure y `operational_pl`
- `TASK-143` — Agency Economics API
- `TASK-146` — Service-level P&L
- `TASK-147` — Campaign ↔ Service Bridge
- `TASK-149` — Team Capacity alerts/constraints
- `TASK-154` — Revenue pipeline intelligence
- `TASK-160` — Agency enterprise hardening
- cualquier consumer futuro de rentabilidad, loaded cost o scorecards financieros

### Files owned

- `src/lib/finance/payroll-cost-allocation.ts`
- `src/lib/finance/auto-allocation-rules.ts`
- `src/lib/team-capacity/**`
- `src/lib/cost-intelligence/**`
- `src/lib/sync/projections/member-capacity-economics.ts`
- `src/lib/sync/projections/operational-pl.ts`
- `src/lib/sync/projections/client-economics.ts`
- `src/lib/sync/event-catalog.ts`
- `src/lib/sync/reactive-consumer.ts`
- `src/app/api/cost-intelligence/**`
- `src/app/api/finance/dashboard/pnl/route.ts`
- `scripts/setup-postgres-finance-intelligence-p2.sql`
- `scripts/setup-postgres-cost-intelligence.sql`
- `scripts/migrations/add-cost-intelligence-schema.sql`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_TEAM_CAPACITY_ARCHITECTURE_V1.md`

## Current Repo State

### Ya existe

- payroll y projected payroll como fuente base de costo mensual
- `member_capacity_economics` como snapshot reusable de costo/capacidad por miembro
- `client_labor_cost_allocation` como bridge laboral histórico por período
- `operational_pl_snapshots` y `period_closure_status`
- `Agency`, `People`, `Finance`, `Home` y `Nexa` ya leen parte del serving de Cost Intelligence
- hardening reciente para excluir assignments internos de la atribución comercial más obvia

### Gap actual

- no hay una `truth layer` única y nombrada para commercial cost attribution
- la lógica está repartida entre helpers, SQL bridges, projections y consumers
- todavía no existe un contrato explícito para:
  - precedence entre payroll, capacity y assignments
  - reglas por assignment type / client type / internal space
  - fallback behavior cuando falta costo, FX o allocation
  - invalidación reactiva exacta cuando cambian payroll, assignments o compensation
- la observabilidad existe por dominio, pero no todavía por `commercial attribution health`

## Scope

### Slice 1 — Canonical attribution contract

- Definir el objeto/contrato canónico de atribución comercial:
  - `member_id`
  - período
  - costo base
  - labor cost comercial atribuible
  - costo no billable / internal load
  - overhead asignable
  - razón y fuente de materialización
- Formalizar taxonomía de assignments:
  - comercial billable
  - comercial non-billable
  - interno operacional
  - inválido / excluido
- Documentar precedence:
  - payroll real > costo estimado
  - snapshot canónico > recompute local on-read
- Definir explícitamente a qué módulos alimenta:
  - Finance
  - Cost Intelligence
  - Agency
  - Organization 360
  - People
  - Home
  - Nexa
  - futuros consumers de Service / Campaign / Forecasting
- Definir versión inicial del contrato y estrategia de evolución

### Slice 2 — Platform helper + shared semantics

- Extraer helpers/shared rules para que Finance, Team Capacity y Cost Intelligence reutilicen la misma semántica.
- Eliminar heurísticas duplicadas por consumer.
- Definir utilidades explícitas para:
  - `isCommercialAssignment`
  - `isInternalAssignment`
  - `isBillableCommercialAssignment`
  - `classifyAssignmentForCostAttribution`

### Slice 3 — Serving and data model hardening

- Crear o ajustar serving/intermediate views para que la atribución comercial quede materializada y no dependa de joins ad hoc.
- Evaluar si `client_labor_cost_allocation` debe evolucionar a una tabla/view más rica con breakdown explícito:
  - costo base
  - costo excluido interno
  - ratio atribuido
  - source of truth
- Definir si `member_capacity_economics` necesita publicar campos adicionales para esta capa.

### Slice 4 — Reactive/outbox/projections alignment

- Auditar todos los eventos entrantes relevantes:
  - `payroll_period.*`
  - `payroll_entry.*`
  - `compensation_version.*`
  - `assignment.*`
  - `finance.expense.*`
  - `finance.cost_allocation.*`
  - `finance.exchange_rate.*`
- Definir qué projection debe reaccionar primero y con qué orden lógico.
- Alinear salidas:
  - `accounting.pl_snapshot.materialized`
  - alertas de margen
  - invalidaciones de consumers
- Documentar si hace falta un evento nuevo tipo:
  - `finance.commercial_cost_attribution.materialized`
  - o si basta con enriquecer `accounting.pl_snapshot.materialized`
- Definir contratos de replay, backfill e idempotencia

### Slice 5 — Cloud/runtime/operations

- Revisar privilegios runtime necesarios y mínimos para serving materialization.
- Definir contrato de cron/recovery para recompute histórico.
- Incluir health checks y materialization freshness para esta capa.
- Asegurar que staging/preview/production puedan validar esta lane sin drift de env o access profile.
- Incluir métricas y alertas de drift semántico, no solo fallos técnicos

### Slice 6 — Consumer cutover

- Identificar consumers que deben leer la nueva verdad:
  - Finance Intelligence
  - Agency Economics / Space cards
  - Organization 360
  - People 360
  - Home
  - Nexa
  - futuros Service P&L / Campaign bridges
- Decidir por consumer:
  - serving-first
  - fallback temporal
  - deprecación de lógica legacy

### Slice 7 — Tests, fixtures y casos reales

- Agregar fixtures de negocio con casos reales tipo:
  - miembro con `1.0` billable y `1.0` internal assignment
  - múltiples clientes billables
  - ausencia de payroll final
  - costos en USD + CLP
  - overhead directo vs compartido
- Incluir casos auditables estilo `Sky` para impedir regresiones silenciosas.

### Slice 8 — Explainability & audit surface

- Diseñar una explain API / audit view para attribution
- exponer source rows, rule version, exclusions y allocation rationale
- validar que soporte troubleshooting operativo sin depender de queries manuales

## Out of Scope

- presupuestos, forecast y budgeting completo
- rediseño UI amplio de Economics surfaces
- contabilidad legal o partida doble
- reemplazo del modelo persona-first o de auth
- migración completa de todos los consumers en un solo big bang

## Acceptance Criteria

- [ ] Existe un contrato canónico documentado para `commercial cost attribution`
- [ ] El contrato define versión y estrategia de evolución
- [ ] Finance, Team Capacity y Cost Intelligence reutilizan la misma clasificación de assignments
- [ ] `client_labor_cost_allocation` o su sucesor expone atribución comercial sin mezclar carga interna
- [ ] Los eventos reactivos relevantes y su orden lógico quedan explícitamente documentados
- [ ] Existe health técnico y health semántico para esta capa
- [ ] Los consumers prioritarios de Finance + Agency + People tienen estrategia de cutover definida
- [ ] Hay tests con fixtures de negocio reales que cubren casos tipo `Sky`
- [ ] Existe una explain/audit surface para troubleshooting de attribution
- [ ] Arquitectura y task docs quedan actualizadas sin contradicción entre módulos

## Verification

- `pnpm exec vitest run [suite de attribution + projections + finance helpers]`
- `pnpm exec eslint [slice]`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`
- smoke reactivo del carril afectado
- validación manual de al menos un período real en `/finance/intelligence` y un consumer downstream

## Open Questions

- ¿La capa canónica debe persistirse como nueva serving table o basta con endurecer `client_labor_cost_allocation`?
- ¿Qué porcentaje de overhead debe seguir mostrándose como costo del cliente vs bucket corporativo?
- ¿Cómo se representa explícitamente costo no billable pero comercialmente asignado?
- ¿Hace falta un evento nuevo del bus para materialización de esta capa o el P&L ya basta como boundary?

## Follow-ups

- `TASK-143` Agency Economics API
- `TASK-146` Service-Level P&L
- `TASK-147` Campaign ↔ Service Bridge
- `TASK-160` Agency Enterprise Hardening

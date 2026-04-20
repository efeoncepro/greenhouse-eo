# GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md

## Objetivo

Definir la capa canónica de `commercial cost attribution` como boundary shared entre Payroll, Team Capacity, Finance y Cost Intelligence, sin reabrir la decisión ya tomada sobre identidad ni degradar `member_id` como llave operativa.

## Delta 2026-03-30 — TASK-162 pasa de framing a contrato ejecutable

- El repo ya mostró drift real:
  - `client_labor_cost_allocation` sigue siendo el bridge laboral histórico
  - `member_capacity_economics` concentra labor cost cargado, direct overhead y shared overhead por miembro
  - `computeOperationalPl()` mezcla ambos carriles y además compone direct expenses por su cuenta
  - Finance mantiene heurísticas propias de auto-allocation
- Decisión operativa:
  - `TASK-162` no debe arrancar con un big bang sobre consumers
  - primero se institucionaliza el contrato y la semántica shared
  - después se endurece serving y recién entonces se hace el cutover de consumers

## Boundary canónico

- `identity_profile` puede enriquecer explainability humana, pero no es la llave operativa del costo.
- `member_id` sigue siendo la llave fuerte para:
  - payroll
  - capacity
  - labor cost attribution
  - loaded cost
  - Cost Intelligence serving
- `client_user` y `userId` no participan como raíz del costo comercial.

## Contrato V1

### Objeto conceptual

Cada fila de atribución comercial debe representar:

- `member_id`
- `period_year`
- `period_month`
- `assignment_classification`
- `base_labor_cost_target`
- `commercial_labor_cost_target`
- `internal_operational_cost_target`
- `direct_overhead_target`
- `shared_overhead_target`
- `commercial_loaded_cost_target`
- `source_of_truth`
- `rule_version`
- `materialization_reason`

### Regla semántica

- `base_labor_cost_target`
  - costo base del miembro para el período
  - precedence: payroll real aprobado/exportado > projected/estimated fallback
- `commercial_labor_cost_target`
  - porción del costo laboral base atribuible a trabajo comercial billable
- `internal_operational_cost_target`
  - costo absorbido por assignments internos u otros buckets excluidos de clientes comerciales
- `direct_overhead_target`
  - overhead directo por miembro ya resuelto por Team Capacity
- `shared_overhead_target`
  - overhead compartido asignable según la política canónica del período
- `commercial_loaded_cost_target`
  - labor comercial + overhead comercialmente atribuible

## Clasificación canónica de assignments

La capa shared debe clasificar assignments usando una sola semántica:

- `commercial_billable`
  - participa en atribución comercial
- `commercial_non_billable`
  - assignment comercial válido, pero no participa todavía en costo atribuible a cliente
- `internal_operational`
  - carga interna operativa válida; no compite como cliente comercial
- `excluded_invalid`
  - assignment sin referencia válida, inactivo o semánticamente inválido para attribution

### Regla vigente V1

- `space-efeonce`
- `efeonce_internal`
- `client_internal`

se clasifican como `internal_operational`.

## Guardrails de adopción

- No reemplazar `client_labor_cost_allocation` de golpe.
- No tocar recipient keys, outbox ni webhook envelopes por esta lane.
- No rehacer `operational_pl` on-read mientras la truth layer nueva no esté materializada.
- Los consumers deben adoptar el contrato en este orden:
  - helpers shared
  - serving/intermediate truth layer
  - Finance + Cost Intelligence
  - consumers downstream

## Orden lógico de materialización

1. Payroll / compensation / FX fijan costo base del período por `member_id`
2. Team Capacity publica costo cargado reusable por miembro
3. Commercial cost attribution resuelve clasificación + reparto comercial
4. Cost Intelligence materializa `operational_pl`
5. Consumers downstream leen serving materializado

## Explainability mínima obligatoria

Cada monto materializado debe poder explicar:

- fuente base usada (`payroll_entry`, `projected_payroll`, etc.)
- regla de clasificación aplicada
- versión de regla (`rule_version`)
- porción excluida por carga interna
- porción atribuida comercialmente

## Health semántico mínimo

La capa debe poder responder al menos por período:

- cuántas filas de attribution existen
- cuántos `member_id` quedaron con atribución comercial
- cuántos `member_id` quedaron con carga interna excluida
- costo base total
- costo comercial atribuido total
- costo interno excluido total
- loaded cost comercial total
- delta no explicado entre:
  - `base_labor_cost_target`
  - `commercial_labor_cost_target`
  - `internal_operational_cost_target`

Regla operativa V1:

- `unexplained_labor_delta_target` debe tender a `0`
- una desviación absoluta `<= 1` se considera tolerable por redondeo
- si supera ese umbral, el período se considera semánticamente degradado

## Orden reactivo explícito

Para evitar drift entre layers, el orden lógico queda así:

1. eventos fuente de payroll / assignments / compensation / FX / expenses
2. projection `commercial_cost_attribution`
3. evento `accounting.commercial_cost_attribution.materialized`
4. projection `operational_pl`
5. evento `accounting.pl_snapshot.materialized`
6. consumers downstream sobre serving

Regla:

- `client_labor_cost_allocation` sigue existiendo, pero pasa a ser bridge/input interno
- la capa consumible por Finance y Cost Intelligence ya es `commercial_cost_attribution`

## Delta 2026-04-20 — TASK-452 consume commercial cost attribution downstream sin cambiar su grain canónico

- `commercial_cost_attribution` sigue siendo la truth layer comercial por `member + client + period`.
- Regla nueva:
  - `service_attribution_facts` puede consumir esta capa como input para labor/overhead atribuible por servicio
  - ese consumer downstream no reescribe ni ensancha el grain canónico de `commercial_cost_attribution`
  - cualquier split a `service_id` debe quedar auditable con `method`, `confidence` y evidencia explícita en la tabla downstream
- Consecuencia:
  - `commercial_cost_attribution` sigue siendo reusable para Finance base, Person Finance, Cost Intelligence y explain comercial
  - el P&L por servicio futuro se apoya en un layer derivado adicional, no en mutar esta truth layer

## Delta 2026-04-02 — persisted organization context

`TASK-192` deja explícita la compatibilidad org-first en la serving table:

- `greenhouse_serving.commercial_cost_attribution` persiste `organization_id` además de `member_id + client_id + período`.
- los readers compartidos siguen pudiendo resumir por cliente para compatibilidad, pero ya cargan contexto organizacional en memoria.
- `client_labor_cost_allocation` sigue siendo el bridge laboral histórico; el serving nuevo no vuelve a exponerse como contrato directo para consumers nuevos.
- el cambio deja la tabla `org-aware`, no `org-enforced`: la lane agrega columna e índice, pero no introduce todavía `FK` ni `NOT NULL` sobre `organization_id`.
- el create table base sigue estando garantizado por el runtime en `src/lib/commercial-cost-attribution/store.ts`; no existe aún una migración histórica dedicada que institucionalice todo el DDL inicial de esta serving table.

## Estrategia de Cutover

### Regla general

El cutover no es “todos los consumers leen la nueva tabla directamente”.

La política correcta es:

- `commercial_cost_attribution`
  - truth layer canónica de costo comercial
- `operational_pl_snapshots`
  - serving derivado para P&L operativo y consumers de rentabilidad por scope
- `member_capacity_economics`
  - serving canónico de costo/capacidad por miembro
- `client_labor_cost_allocation`
  - bridge histórico de entrada
  - ya no debe considerarse contrato consumidor nuevo

### Matriz por consumer

- Finance base / `client_economics`
  - debe consumir `commercial_cost_attribution` vía reader/shared layer
  - no debe volver a leer `client_labor_cost_allocation` directamente
- Cost Intelligence / `operational_pl`
  - debe consumir `commercial_cost_attribution`
  - no debe recomponer labor + overhead por queries divergentes
  - puede usar `organization_id` persistido como fallback semántico cuando el bridge `client -> space -> organization` no alcance
- Agency / economics por space
  - debe seguir leyendo `operational_pl_snapshots`
  - no debe saltarse la capa a `commercial_cost_attribution` salvo para surfaces de auditoría futura
- Service attribution foundation
  - debe consumir `commercial_cost_attribution` para labor/overhead
  - no debe reinterpretar esta tabla como si ya estuviera keyed por `service_id`
  - debe persistir unresolved cuando el split por servicio no sea auditable
- Organization 360
  - economics resumida puede seguir sobre `operational_pl_snapshots`
  - fallbacks on-read deben quedar alineados al reader shared, no al bridge histórico
- People / Person Finance
  - costo por persona sigue en `member_capacity_economics`
  - explain comercial por cliente/período puede apoyarse en `commercial_cost_attribution` cuando aplique
- Home y Nexa
  - deben seguir leyendo serving derivado (`operational_pl_snapshots`, `member_capacity_economics`)
  - no deben depender del shape interno completo de attribution

### Criterio de cierre de bridge legacy

`client_labor_cost_allocation` no se elimina todavía.

Pero desde este contrato:

- queda deprecado como source directo para consumers nuevos
- queda permitido solo como:
  - bridge histórico
  - input del materializer de `commercial_cost_attribution`
  - surface limitada de troubleshooting legado donde todavía no exista explain surface suficiente

## Primera adopción de repo

Primer slice ya permitido por esta baseline:

- helper shared `assignment-classification`
- Team Capacity, Finance y Cost Intelligence reusan la misma taxonomía de assignments internos/comerciales
- sin alterar todavía el shape final de serving ni los consumers finales

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

## Primera adopción de repo

Primer slice ya permitido por esta baseline:

- helper shared `assignment-classification`
- Team Capacity, Finance y Cost Intelligence reusan la misma taxonomía de assignments internos/comerciales
- sin alterar todavía el shape final de serving ni los consumers finales

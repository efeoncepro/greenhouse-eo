# ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1

## Objetivo

Greenhouse usa Architecture Decision Records (ADRs) para que las decisiones estructurales no queden escondidas en una task, un handoff o una conversacion. Un ADR captura por que el sistema eligio un camino, que alternativas se rechazaron, que contrato runtime queda vigente y cuando hay que reabrir la decision.

Este modelo no crea burocracia para cada cambio. Solo obliga ADR cuando la decision cambia un contrato que futuros agentes, modulos o auditorias van a depender.

## Decision canonica

Greenhouse adopta un modelo ADR distribuido:

- Las decisiones de un dominio viven cerca de su spec canonica en `docs/architecture/GREENHOUSE_*_V1.md`.
- Las decisiones transversales o cross-domain pueden vivir como documento dedicado en `docs/architecture/`.
- El indice maestro de decisiones vive en `docs/architecture/DECISIONS_INDEX.md`.
- Los ADRs aceptados son append-only: no se reescriben para ocultar historia; se superseden con una nueva decision.

## Cuando un cambio requiere ADR

Una task, issue, epic, auditoria o propuesta requiere ADR si cumple al menos dos de estas condiciones:

- Afecta estructura del sistema, source of truth o contrato compartido.
- Tiene alternativas reales que podrian ser razonables.
- Costaria mas de 1-2 semanas revertirla.
- Otros modulos, agentes o usuarios quedan obligados por esa decision.
- Un auditor o futuro senior engineer preguntaria "por que se hizo asi?".
- La decision impacta seguridad, datos, compliance, finanzas, payroll, auth, deploy o permisos.

Ademas, ADR es obligatorio si el cambio toca cualquiera de estos planos:

- Source of truth de datos o proyecciones runtime compartidas.
- Schema compartido, migrations estructurales, backfills o contratos Postgres/BigQuery.
- Access model: `routeGroups`, `views`, `authorizedViews`, `view_code`, `entitlements`, `capabilities` o startup policy.
- Auth, session, secretos, seguridad, cloud, deploy o Vercel.
- Finance, payroll, accounting, treasury, billing, tax o revenue semantics.
- Eventos, outbox, webhooks, reactive consumers o integraciones near-real-time.
- APIs publicas, MCP, SDKs o contratos consumidos por sistemas externos.
- UI platform, design tokens, navegacion global, shell compartido o patrones visuales canonicos.
- AI/agentic workflows, MCP tools, autonomia, evals o observabilidad de LLM.

## Cuando no requiere ADR

No escribir ADR para:

- Fixes locales reversibles sin cambio de contrato.
- Refactors internos de un modulo que no alteran behavior ni ownership.
- Copy, estilos o componentes locales que no cambian UI platform.
- Tests, lint, typos o documentacion explicativa sin decision nueva.
- Seleccion de una libreria utilitaria reemplazable en menos de un dia.

Si hay duda, usar esta pregunta: si alguien se integra al proyecto en tres meses y pregunta "por que esta regla existe?", debe haber una respuesta escrita. Si la respuesta importa para operar el sistema, escribir ADR.

## Donde vive un ADR

### ADR embebido

Usar ADR embebido cuando la decision pertenece claramente a una spec existente.

Ejemplos:

- Sample Sprints -> `GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md`.
- Payment Orders -> `GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`.
- Organization Workspace -> `GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md`.
- Design tokens -> `GREENHOUSE_DESIGN_TOKENS_V1.md` o `GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md`.

Formato recomendado:

```md
## Architecture Decision YYYY-MM-DD -- <titulo corto>

- Status:
- Owner:
- Scope:
- Reversibility:
- Confidence:
- Validated as of:

### Context
### Decision
### Alternatives Considered
### Consequences
### Runtime Contract
### Revisit When
```

### ADR dedicado

Usar documento dedicado cuando la decision cruza dominios o crea una primitive transversal.

Nombre recomendado:

```text
docs/architecture/GREENHOUSE_<TOPIC>_DECISION_V1.md
docs/architecture/GREENHOUSE_<TOPIC>_ARCHITECTURE_V1.md
```

No duplicar una spec existente solo para tener un archivo "ADR". Si ya existe una spec canonica viva, agregar una seccion de decision y enlazarla desde `DECISIONS_INDEX.md`.

## Campos obligatorios

Todo ADR aceptado debe incluir:

- `Status`: `Proposed`, `Accepted`, `Superseded`, `Deprecated`.
- `Date`: fecha de aceptacion o formalizacion.
- `Owner`: dominio o equipo responsable.
- `Scope`: modulos, rutas, schemas o contratos afectados.
- `Reversibility`: `one-way`, `two-way`, `two-way-but-slow`.
- `Confidence`: `low`, `medium`, `high`.
- `Validated as of`: fecha en que se verificaron runtime, docs, vendors o pricing relevante.
- `Context`: problema, constraints y fuerzas en tension.
- `Decision`: decision en lenguaje directo.
- `Alternatives Considered`: alternativas reales y por que se rechazaron.
- `Consequences`: beneficios, costos, riesgos y trade-offs.
- `Runtime Contract`: que codigo, schema, API, evento, route, capability o doc queda como fuente de verdad.
- `Revisit When`: condiciones objetivas para reabrir la decision.

## Lifecycle

### Proposed

La decision esta redactada pero no aceptada. Puede usarse para discusion, plan o review. No implementar cambios irreversibles basados solo en un ADR `Proposed` salvo mitigacion temporal explicita.

### Accepted

La decision gobierna el runtime y las futuras tasks. Debe estar linkeada desde `docs/architecture/DECISIONS_INDEX.md`.

### Superseded

La decision fue reemplazada por otra. No borrar el texto anterior. Actualizar el status del ADR viejo con `Superseded by: <doc/seccion>` y crear o aceptar el ADR nuevo.

### Deprecated

La decision ya no debe usarse para trabajo nuevo, pero puede seguir describiendo legacy runtime hasta que exista migracion completa.

## Regla append-only

Un ADR aceptado no se reescribe para cambiar el pasado. Solo se permiten estas ediciones:

- Corregir typos o links rotos sin cambiar significado.
- Agregar `Superseded by`.
- Agregar links a docs/tasks que implementan la decision.
- Agregar un delta fechado que documenta nueva evidencia sin borrar la decision original.

Si la decision cambia materialmente, crear una decision nueva.

## Relacion con TASK-###

Durante Discovery, toda task debe responder:

- Hay ADR existente que gobierna este cambio?
- La task cambia un contrato que requiere ADR?
- Si requiere ADR, vive embebido en una spec existente o como doc dedicado?
- La implementacion puede avanzar sin aceptar la decision?

Para tasks `implementation`, no escribir codigo que materialice un contrato irreversible si el ADR requerido sigue `Proposed` y el checkpoint humano no lo aprobo.

Para tasks `policy`, el entregable puede ser solo ADR + indice + docs operativas.

## Relacion con auditorias

Las auditorias pueden recomendar ADRs, pero no los reemplazan. Si una auditoria descubre drift sistemico o alternativas relevantes, abrir o actualizar una decision canonica y enlazar la auditoria como evidencia.

Antes de usar una auditoria como base de un ADR, validar que el runtime, codigo y arquitectura siguen reflejando los hallazgos.

## Relacion con handoff y project_context

- `Handoff.md` registra que se tomo o acepto una decision, con link corto.
- `project_context.md` registra solo decisiones vigentes que cambian el contrato operativo para agentes.
- `docs/architecture/DECISIONS_INDEX.md` es el lugar para encontrar decisiones aceptadas.
- La spec canonica mantiene el detalle.

## Primer inventario

La adopcion inicial no obliga a reescribir todas las specs. El primer paso es indexar decisiones ya existentes en `DECISIONS_INDEX.md` y agregar ADRs nuevos solo cuando un cambio futuro lo requiera.

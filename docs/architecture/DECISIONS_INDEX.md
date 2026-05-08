# Greenhouse Architecture Decisions Index

Este indice lista decisiones arquitectonicas aceptadas o formalizadas en Greenhouse. No reemplaza las specs canonicas: apunta a ellas para que los agentes encuentren rapido el contrato vigente.

Regla canonica: `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`.

## Como usar este indice

- Antes de crear una task o plan que toque arquitectura, buscar aqui una decision vigente.
- Si la decision vive en una spec de dominio, actualizar esa spec y este indice.
- Si una decision cambia, crear una nueva decision y marcar la anterior como superseded/deprecated donde vive.
- No duplicar el contenido completo del ADR en esta tabla.

## Decisiones vigentes

| Decision | Status | Scope | Canonical doc | Source / notes |
| --- | --- | --- | --- | --- |
| Adoptar ADRs distribuidos con indice maestro | Accepted | Documentacion / arquitectura / multi-agente | [ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md](../operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md) | Formalizado 2026-05-08. |
| i18n usa `next-intl`, portal privado sin locale prefix por defecto | Accepted | Platform UI / Identity / copy / routing | [GREENHOUSE_I18N_ARCHITECTURE_V1.md](GREENHOUSE_I18N_ARCHITECTURE_V1.md) | ADR de TASK-428; `TASK-430` y `TASK-431` lo consumen. |
| Runtime theme es source of truth para tokens visibles | Accepted | UI platform / design tokens | [GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md](GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md) | TASK-368; heredado por `GREENHOUSE_DESIGN_TOKENS_V1.md` y DESIGN.md. |
| `DESIGN.md` refleja runtime, no lo genera | Accepted | UI platform / agent-facing visual contract | [GREENHOUSE_DESIGN_TOKENS_V1.md](GREENHOUSE_DESIGN_TOKENS_V1.md) | TASK-764; `pnpm design:lint` es gate. |
| Sample Sprint no es entidad nueva; es `services.engagement_kind != 'regular'` | Accepted | Commercial / Agency / Sample Sprints | [GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md](GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md) | EPIC-014; rechaza tabla `sample_sprints`. |
| Commercial Health lee primitives canonicas y degradea a `unknown` ante error | Accepted | Commercial reliability / Ops Health | [GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md](GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md) | TASK-807; helper `src/lib/commercial/sample-sprints/health.ts`. |
| Anti-zombie de engagements vive como trigger, no CHECK | Accepted | Commercial / PostgreSQL / data quality | [GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md](GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md) | TASK-810; PostgreSQL no admite subqueries en CHECK. |
| Organization Workspace projection separa `views` visibles y `entitlements` finos | Accepted | Identity / Access / Organization Workspace | [GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md](GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md) | TASK-611; projection server-only + cache TTL 30s. |
| Organization Workspace shell separa chrome compartido de facet content | Accepted | UI platform / Agency / Finance / Organization details | [GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md](GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md) | TASK-612/TASK-613; entrypoints gated por rollout flags. |
| Payment Orders pertenece a Finance/Tesoreria, no Payroll | Accepted | Finance / Payroll boundary / Treasury | [GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md](GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md) | TASK-747..751; Payroll calcula/exporta obligaciones, Finance paga. |
| Processor no es necesariamente instrumento de salida | Accepted | Finance / Treasury / Payment Orders | [GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md](GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md) | TASK-799; Deel es rail/counterparty, no source account. |
| Postgres/Kysely TLS recovery se resuelve en primitive comun | Accepted | PostgreSQL / runtime resilience | [project_context.md](../../project_context.md) | 2026-05-03; no parchear endpoints aislados ante TLS retryable. |
| MCP remoto Greenhouse V1 es stateless + bearer token | Accepted | MCP / API Platform / Vercel runtime | [project_context.md](../../project_context.md) | TASK-741; OAuth multiusuario queda en TASK-659. |
| Contractor/honorarios es relacion nueva, no mutacion de `members.contract_type` | Accepted | Workforce / Payroll boundary / People 360 | [GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md](GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md) | TASK-789; employee closed + contractor separate relationship. |
| Direct service expense allocation requiere ancla explicita expense -> service | Accepted | Finance / Commercial cost attribution | [GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md](GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md) | TASK-815; no inferir por cliente/nombre/linea. |
| Governance tables de capabilities tienen FK a registry + CI migration marker gate | Accepted | Identity / Access / DB migrations / CI | [Handoff.md](../../Handoff.md) | TASK-838/ISSUE-068; runtime guard + CI gate anti pre-up-marker bug. |

## Pendientes de formalizacion retroactiva

Estas decisiones existen en runtime o docs, pero pueden merecer ADR mas explicito cuando una task futura las toque:

| Decision candidate | Why it matters | Suggested canonical home |
| --- | --- | --- |
| Runtime projections como capa server-side canonica para surfaces complejas | Evita heuristicas React y drift entre UI, reliability y backend | Spec de cada dominio o doc transversal de runtime projections |
| Event/outbox compatibility entre eventos genericos y eventos granulares | Define contratos de idempotencia y fan-out | `GREENHOUSE_EVENT_CATALOG_V1.md` |
| Preview generic env baseline vs branch overrides | Evita deploys rojos por secrets solo en `Preview (develop)` | `RELEASE_CHANNELS_OPERATING_MODEL_V1.md` o cloud governance |
| Access design dual-plane obligatorio | Muchas tasks deben distinguir `views` vs `entitlements` | `GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` |

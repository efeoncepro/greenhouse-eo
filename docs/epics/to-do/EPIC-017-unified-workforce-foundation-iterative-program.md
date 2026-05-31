# EPIC-017 — Unified Workforce Foundation Iterative Program

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Research/ADR proposed`
- Rank: `TBD`
- Domain: `cross-domain` (hr + payroll + finance + identity + platform)
- Owner: `unassigned`
- Branch: `epic/EPIC-017-unified-workforce-foundation`
- GitHub Issue: `optional`

## Summary

Programa cross-domain para convertir Greenhouse, de forma iterativa y segura, en una **fundacion workforce persona-centrica**: una persona, multiples rails legales/payroll/finance/compliance.

Este epic no abre ejecucion inmediata ni reemplaza el ADR. Sirve como contenedor operativo para que, una vez revisados el research y la arquitectura, se vayan agregando `TASK-###` ejecutables de manera incremental, cada una con scope pequeno, verificable y compatible con payroll/finiquito/contractor boundaries existentes.

## Why This Epic Exists

La senal de mercado de Deel y la evolucion reciente de Greenhouse apuntan al mismo lugar: el workforce debe organizarse alrededor de la persona y su historia de trabajo, no alrededor de tipos de contrato aislados.

Greenhouse ya tiene piezas compatibles con esa direccion:

- Person 360.
- Person Legal Entity Relationships.
- Contractor Engagements + Payables.
- Payroll contract tuple governance.
- Payment Orders como frontera Finance/Treasury.
- Current Work Classification post TASK-957.

Pero aun no existe un programa que coordine la evolucion entre HR, Payroll, Finance, Identity y Platform. Sin un epic, las futuras tasks pueden volver a atacar sintomas locales: drift de tuplas, doble rail, vistas separadas, compensation history fragmentada o agentes leyendo tablas con verdades parciales.

Este epic existe para mantener la evolucion en modo iterativo:

1. research y ADR primero;
2. projections/readers antes que write paths;
3. reliability antes que cutover;
4. UI/person journey solo cuando el modelo este claro;
5. tasks hijas agregadas poco a poco, no generadas masivamente de una vez.

## Outcome

- Greenhouse adopta una doctrina clara: `Person -> WorkRelationship -> WorkAssignment -> CompensationProfile -> ComplianceRail -> PaymentRail -> WorkforceTimeline`.
- Las futuras tasks de workforce declaran `Epic: EPIC-017` y se agregan cuando tengan scope ejecutable.
- `members`, `person_legal_entity_relationships`, `contractor_engagements` y `compensation_versions` quedan con postura de compatibilidad/proyeccion explicita.
- Person 360 evoluciona como hub natural de journey laboral, compensacion, documentos, rails y estado vigente.
- Payroll, contractor payables y Finance preservan ownership especializado sin crear identidades paralelas.
- Agentes/Nexa/MCP consumen workforce context desde proyecciones canonicas, no desde heuristicas tabla-por-tabla.

## Architecture Alignment

- `docs/research/RESEARCH-008-unified-workforce-foundation.md`
- `docs/research/RESEARCH-008-current-state-gap-analysis-2026-05-31.md`
- `docs/research/RESEARCH-008-pre-task-considerations.md`
- `docs/research/RESEARCH-008-payroll-backlog-triage-2026-05-31.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1.md`
- `docs/architecture/GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
- `docs/architecture/GREENHOUSE_WORKFORCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

## Iterative Execution Model

### Phase 0 — Research + ADR review

Goal: decidir si el ADR pasa de `Proposed` a `Accepted`, se ajusta o se rechaza.

Allowed work:

- completar mapping de objetos existentes contra los conceptos candidato;
- escribir flows end-to-end en docs;
- revisar riesgos de payroll/finance/compliance;
- no crear migrations ni write paths.

Exit:

- ADR aceptado o explicitamente recalibrado;
- arquitectura target con open questions reducidas a follow-ups concretos.

### Phase 1 — Read-only workforce foundation map

Goal: crear visibilidad sin mover ownership.

Candidate task types:

- audits de source-of-truth actual;
- read-only resolvers/projections;
- parity checks contra Person 360, payroll y contractor surfaces;
- reliability signals de drift.

Hard rule:

- nada de mutar payroll, compensation o contractor data desde esta fase.

### Phase 2 — Current state and compensation profile hardening

Goal: estabilizar el "estado vigente" y la historia de compensacion.

Candidate task types:

- current work classification resolver promotion;
- compensation profile timeline/read model;
- relationship-scoped compensation compatibility analysis;
- double-rail/payroll-vs-contractor regression gates.

Hard rule:

- cualquier cambio que pueda alterar monto, elegibilidad o finiquito debe tener before/after empirico y gate payroll.

### Phase 3 — Person journey surfaces

Goal: convertir la doctrina en experiencia visible sin redisenar todo el portal.

Candidate task types:

- Person 360 workforce tab/section;
- relationship timeline;
- compensation history view;
- readiness/compliance/payment rail state;
- self-service and HR/Admin field-level redaction.

Hard rule:

- usar `views` para surfaces visibles y `entitlements/capabilities` para acciones/datos finos.

### Phase 4 — Write-path convergence

Goal: mover comandos solo cuando las proyecciones ya probaron paridad.

Candidate task types:

- relationship-first activation commands;
- compensation change commands;
- payment rail transition workflows;
- provider/Deel/EOR boundary commands;
- event/outbox normalization.

Hard rule:

- cada write path debe ser idempotente, auditado, reversible o compensable, y no puede crear identidades paralelas.

### Phase 5 — Reporting and agent substrate

Goal: explotar la fundacion como sistema de reporting y contexto seguro para agentes.

Candidate task types:

- total workforce cost/headcount reporting;
- agent-safe workforce context read model;
- MCP tools read-only sobre workforce foundation;
- evals/guards para acciones AI sobre HR/payroll/finance.

Hard rule:

- agentes no ejecutan cambios de HR/payroll/finance sin capability, audit y kill-switch.

## Child Tasks

| Task | Phase | Status | Purpose |
| --- | --- | --- | --- |
| `TASK-959` | `0/1` | `to-do` | Workforce Foundation Read-Only Object Map Audit: primer mapa/audit read-only persona-centrico con gap codes, parity contra current classification y candidate reliability signals. |

Las tasks se agregaran de forma iterativa cuando cumplan este protocolo:

1. citar este epic con `Epic: EPIC-017` en `## Status`;
2. citar el ADR/arquitectura aplicable;
3. declarar fase del epic;
4. declarar source-of-truth afectado o confirmar que es read-only;
5. declarar hard rules de payroll/finiquito/contractor/finance cuando apliquen;
6. definir verification local-first;
7. no depender de una decision `Proposed` como si fuera `Accepted`.

## Candidate Task Intake Queue

Esta cola es deliberadamente conceptual. No reserva IDs.

| Candidate | Phase | Purpose | Gate before creating task |
| --- | --- | --- | --- |
| Workforce object map audit | 0/1 | Mapear `members`, `identity_profiles`, relationships, engagements, compensation, payroll y payables contra conceptos canonicos. | ADR review checkpoint. |
| Current work classification canonical projection | 1/2 | Promover estado vigente persona-relacion-rail como read model compartido. | Parity contra TASK-957 resolver y Person 360. |
| Compensation profile timeline | 2/3 | Leer compensacion como historia versionada, no solo version actual. | Definir si scope es relationship, assignment o composite. |
| Person 360 workforce journey facet | 3 | Mostrar relacion, assignment, compensation, readiness y rails en un lugar. | Modelo de read-only projection estable. |
| Workforce rail drift signals | 1/2 | Detectar doble rail, rail sin evidencia, relationship sin payment readiness y compensation drift. | Definir steady state esperado por signal. |
| Relationship-first activation command | 4 | Crear/activar worker desde person + relationship + assignment + compensation. | Parity projection y approval del write-path ADR/delta. |
| Agent-safe workforce context | 5 | Exponer contexto seguro para Nexa/MCP sin heuristicas por tabla. | Field-level redaction + autonomy tier definidos. |

## Existing Payroll Backlog Triage

Detailed triage lives in [RESEARCH-008 Payroll Backlog Triage](../../research/RESEARCH-008-payroll-backlog-triage-2026-05-31.md).

Operational rule:

- `TASK-959` remains the first child task.
- Existing tasks such as `TASK-338`, `TASK-340`, `TASK-614`, `TASK-652`, `TASK-788` and `TASK-798` are useful, but must be reframed before execution if they become EPIC-017 work.
- Payroll compliance, receipts, close gates, Previred and smoke lanes remain valid separate Payroll work unless a later EPIC-017 task explicitly consumes their outputs.
- Reframed tasks must declare the EPIC phase, source-of-truth boundary, read/write scope, and payroll/finiquito/contractor/finance hard rules before moving to `in-progress`.

## Existing Related Work

- `RESEARCH-008` — Unified Workforce Foundation research brief.
- `GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_V1` — arquitectura draft.
- `GREENHOUSE_UNIFIED_WORKFORCE_FOUNDATION_DECISION_V1` — ADR `Proposed`.
- `EPIC-010` — Workforce Offboarding & Finiquito Foundation.
- `EPIC-013` — Contractor Engagements + Global Payables Program.
- `TASK-789` — Employee -> contractor/honorarios relationship transition foundation.
- `TASK-956` — Employee -> Contractor connected command.
- `TASK-957` — Contractor/payroll double-rail exclusion + current work classification.
- `TASK-958` — Compensation version tuple drift remediation; tratado como sintoma operativo, no como driver de arquitectura.
- `TASK-874` / `TASK-876` — Workforce Activation readiness/write path.
- `TASK-875` — WorkRelationship Onboarding Case foundation.
- `TASK-893` — Payroll Participation Window.
- `TASK-894` — International Internal Contract Type foundation.

## Exit Criteria

- [ ] ADR de Unified Workforce Foundation aceptado o reemplazado por decision superseding.
- [ ] Al menos una proyeccion/read model persona-centrica validada contra runtime actual sin cambios de monto payroll.
- [ ] Current work classification consumido por surfaces/person workflows definidos por tasks hijas.
- [ ] Compensation profile timeline definido con ownership claro y sin romper `compensation_versions`.
- [ ] Reliability signals cross-rail en steady state para doble rail, classification drift y payment rail readiness.
- [ ] Person 360 o surface sucesora muestra journey laboral sin crear una segunda ficha maestra.
- [ ] Payroll/finiquito/contractor/payables hard rules siguen verdes en gates de no-regresion.
- [ ] AI/MCP workforce context consume proyecciones canonicas con redaction/capabilities.

## Non-goals

- No crear todas las tasks de una vez.
- No aceptar el ADR implicitamente por crear este epic.
- No reescribir payroll.
- No mover `members` a projection sin ADR/delta y plan de migracion.
- No fusionar contractor payables dentro de payroll.
- No redisenar Person 360 antes de tener projection/read model estable.
- No crear roles nuevos.
- No crear UI visible sin revisar `DESIGN.md`, copy canonico y GVC.

## Delta 2026-05-31

Epic creado como contenedor del programa iterativo derivado de `RESEARCH-008` y del ADR `Proposed`. La regla operativa inicial es no abrir tasks ejecutables hasta que el research/ADR tenga checkpoint humano suficiente o una task read-only claramente acotada.

Appendix agregado: `docs/research/RESEARCH-008-current-state-gap-analysis-2026-05-31.md` documenta la lectura profunda del articulo de Deel, tendencias de mercado, auditoria de stack/codebase/DB y el contraste `tenemos vs necesitamos`.

Pre-task gate agregado: `docs/research/RESEARCH-008-pre-task-considerations.md` documenta las consideraciones que deben resolverse antes de abrir la primera task. La recomendacion operativa sigue siendo que la primera task, si se abre, sea un audit/mapa read-only y no un write path.

Primera child task agregada: `TASK-959` (`docs/tasks/to-do/TASK-959-workforce-foundation-read-only-object-map-audit.md`). Scope estrictamente read-only; no acepta el ADR implicitamente ni habilita writes/UI/migrations.

Payroll backlog triage agregado: `docs/research/RESEARCH-008-payroll-backlog-triage-2026-05-31.md` clasifica tasks existentes de Payroll/Workforce/Compensation que sirven al objetivo, marca cuales requieren replanteo antes de ejecucion y preserva lanes separadas para compliance, receipts, close gates y smoke tests.

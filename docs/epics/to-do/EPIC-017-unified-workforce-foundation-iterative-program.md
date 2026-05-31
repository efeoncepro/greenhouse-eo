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
- `docs/research/RESEARCH-008-approved-mockup-contracts-2026-05-31.md`
- `docs/research/RESEARCH-008-epic017-mockup-execution-plan-2026-05-31.md`
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
| `TASK-959` | `0/1` | `complete` | Workforce Foundation Read-Only Object Map Audit: contrato/mapa read-only implementado con gap codes, parity 100% contra current classification en dev real activo, audit script y candidate reliability signals documentados. |
| `TASK-961` | `3` | `to-do` | Person 360 Workforce Facet Read-Only Promotion: promover People/Person 360 como hub workforce read-only consumiendo `WorkforceFoundationMap`, manteniendo Payroll como rail especializada y sin writes. |
| `TASK-962` | `1/2` | `to-do` | Workforce Coverage & Readiness Remediation Plan: clasificar read-only gaps de compensation/readiness/payment rail antes de data fixes, signals o write paths. |
| `TASK-963` | `3` | `to-do` | People List Workforce Overview: convertir la lista de People en overview operativo con status, worker type, pais, assignment, payment rail, compensation coverage y readiness, consumiendo el read model de `TASK-961`/`TASK-962`. |
| `TASK-964` | `3/4` | `to-do` | Person Workforce Documents Rail + EPIC-001 Alignment: conectar People/Person 360 Workforce con Document Vault + Signature Orchestration sin crear document manager paralelo. |
| `TASK-965` | `4` | `to-do` | Unified Worker Create/Edit Workflow: futuro write-path convergence People-first, bloqueado hasta estabilizar read models, compensation profile y assignment timeline. |
| `TASK-966` | `5` | `to-do` | Workforce Reporting Foundation: headcount/workforce reporting persona-centrico, sin doble conteo y con sensitivity gates. |
| `TASK-967` | `1/2` | `to-do` | Workforce Reliability Signals Control Plane: señales cross-rail basadas en gap taxonomy/dispositions para relationship, compensation, payment rail y readiness. |

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
| Workforce coverage/readiness remediation plan | 1/2 | Explicar gaps reales de compensation/readiness/payment rail antes de remediation o write paths. | Creada como `TASK-962`; read-only, sin data fixes. |
| Compensation profile timeline | 2/3 | Leer compensacion como historia versionada, no solo version actual. | Definir si scope es relationship, assignment o composite. |
| Person 360 workforce journey facet | 3 | Mostrar relacion, assignment, compensation, readiness y rails en un lugar. | Creada como `TASK-961`; ejecutar solo como read-only/aditiva y con redaction/access explicitos. |
| People list workforce overview | 3 | Mostrar workforce status, worker type, rail y gaps directamente en la lista de People. | Creada como `TASK-963`; ejecutar despues de `TASK-961`/`TASK-962`. |
| Person documents/signature rail | 3/4 | Mostrar contratos, addenda, receipts, final settlements y firma como evidencia del journey laboral. | Creada como `TASK-964`; debe consumir EPIC-001, no duplicarlo. |
| Workforce rail drift signals | 1/2 | Detectar doble rail, rail sin evidencia, relationship sin payment readiness y compensation drift. | Definir steady state esperado por signal. |
| Relationship-first activation command | 4 | Crear/activar worker desde person + relationship + assignment + compensation. | Parity projection y approval del write-path ADR/delta. |
| Unified worker create/edit workflow | 4 | Orquestar identity, relationship, assignment, compensation, documents/compliance y payment rail desde People. | Creada como `TASK-965`; bloqueada por read models y checkpoint de write path. |
| Workforce reporting foundation | 5 | Headcount, worker type, countries, coverage y readiness reporting persona-centrico. | Creada como `TASK-966`; requiere `TASK-961`/`TASK-962`/`TASK-963`. |
| Agent-safe workforce context | 5 | Exponer contexto seguro para Nexa/MCP sin heuristicas por tabla. | Field-level redaction + autonomy tier definidos. |

## Existing Payroll Backlog Triage

Detailed triage lives in [RESEARCH-008 Payroll Backlog Triage](../../research/RESEARCH-008-payroll-backlog-triage-2026-05-31.md).

Operational rule:

- `TASK-959` remains the first child task.
- `TASK-961` is now the People/Person 360 hub promotion lane and precedes deeper compensation/write-path convergence.
- `TASK-962` is the read-only coverage/readiness plan required before opening data remediation tasks.
- Existing tasks such as `TASK-338`, `TASK-340`, `TASK-614`, `TASK-652`, `TASK-788` and `TASK-798` are useful, but must be reframed before execution if they become EPIC-017 work.
- Documents and e-signature are not a new EPIC-017 platform. They must consume `EPIC-001` (`TASK-489`..`TASK-495`, `TASK-868`) through `TASK-964`.
- Payroll compliance, receipts, close gates, Previred and smoke lanes remain valid separate Payroll work unless a later EPIC-017 task explicitly consumes their outputs.
- Reframed tasks must declare the EPIC phase, source-of-truth boundary, read/write scope, and payroll/finiquito/contractor/finance hard rules before moving to `in-progress`.

## Approved Mockup Contracts

The approved product direction for EPIC-017 mockups is now a hard implementation guardrail in [RESEARCH-008 Approved Mockup Contracts](../../research/RESEARCH-008-approved-mockup-contracts-2026-05-31.md).

The concrete build plan for those mockups lives in [RESEARCH-008 EPIC-017 Mockup Execution Plan](../../research/RESEARCH-008-epic017-mockup-execution-plan-2026-05-31.md).

Agents implementing `TASK-961` through `TASK-967`, or reframing `TASK-652`, must treat those appendices as the approved UI/interaction contract and execution plan. Implementation work should wire real read models, access gates, copy and GVC scenarios into the approved mockups; it must not redesign the flow, remove existing Person 360 operational surfaces, move Payroll ownership into People, or create parallel Documents/Payment systems without explicit task/ADR approval.

Delta `2026-05-31`: `TASK-963` / M02 People Workforce Command Center is now approved as a built mockup at `/people/mockup/workforce-command`. The approved runtime direction is a lightweight enterprise command surface: compact header/metrics, exception queue, roster as primary work area, lightweight filter/saved-view pills, row-level evidence summarized into one primary state plus short count/summary, inspector/drawer for detailed evidence, no page-level horizontal overflow, and stable input IDs to avoid hydration/dev-overlay regressions.

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

Primera child task agregada: `TASK-959` (`docs/tasks/complete/TASK-959-workforce-foundation-read-only-object-map-audit.md`). Scope estrictamente read-only; no acepta el ADR implicitamente ni habilita writes/UI/migrations.

Payroll backlog triage agregado: `docs/research/RESEARCH-008-payroll-backlog-triage-2026-05-31.md` clasifica tasks existentes de Payroll/Workforce/Compensation que sirven al objetivo, marca cuales requieren replanteo antes de ejecucion y preserva lanes separadas para compliance, receipts, close gates y smoke tests.

Delta posterior: se agregaron `TASK-963` a `TASK-967` como lanes faltantes para alcanzar la vision tipo Deel sin duplicar plataformas existentes: People List Workforce Overview, Documents/e-signature rail via EPIC-001, Unified Worker Create/Edit Workflow, Workforce Reporting Foundation y Workforce Reliability Signals Control Plane.

Delta posterior 6: `TASK-959` ejecutada y cerrada. Se agrego `src/lib/workforce/foundation/*` + `scripts/workforce/audit-workforce-foundation-map.ts`, todo read-only. Hallazgos dev reales sin demo: relationship coverage `9/9`, current classification parity `9/9`, current compensation `5/9`, payment rail evidence `8/9`, sin gaps `error`. El audit inicial con demo detecto 5 fixtures `demo-%@demo.greenhouse.efeonce.org` como `data.demo_or_fixture_tolerated_gap`/info; luego se limpiaron de dev junto a sus rows materiales derivadas, por lo que `--active-only --include-demo` vuelve a reportar solo 9 activos reales. Candidate signals documentadas en `RESEARCH-008-current-state-gap-analysis-2026-05-31.md`; no se cablearon señales productivas, UI, APIs ni migrations.

Delta posterior 7: se reviso una captura de Deel worker profile como evidencia de materializacion del articulo. Correccion importante: la captura pertenece al dominio People / Worker Profile, no a Payroll. Payroll aparece como una rail secundaria dentro del perfil de persona. Lectura agregada en `RESEARCH-008-current-state-gap-analysis-2026-05-31.md`: Deel presenta la persona/worker como primer viewport con facets de worker information, role details, compensation summary, relationship, org chart, documents, compliance, time off, apps y quick actions. Implicacion para Greenhouse: Person 360/People debe ser el hub de workforce; Payroll sigue siendo vista especializada separada para calculo, periodos, recibos y salidas estatutarias.

Delta posterior 8: se creo `TASK-961` como siguiente paso operativo. La task promueve el hub existente People/Person 360 con una faceta/seccion `workforce` read-only consumiendo `WorkforceFoundationMap` (TASK-959). Mantiene el limite canonico: People/Person 360 es el hub de estado laboral vigente; Payroll, Finance y Contractor Payables siguen siendo rails especializadas y no reciben writes desde esta task.

Delta posterior 9: se actualizo el backlog triage para reflejar la nueva secuencia post-captura Deel: `TASK-961` antes de reescribir compensation/assignment; `TASK-962` como plan read-only de coverage/readiness antes de data fixes; `TASK-614` marcado como absorb/supersede post-961; `TASK-338`, `TASK-340`, `TASK-652`, `TASK-788` y `TASK-798` quedan para rewrite/split antes de ejecucion; `TASK-797`, `TASK-787`, `TASK-960` y `TASK-955` quedan separados o livianamente alineados.

Delta posterior 10: se agrego `RESEARCH-008-approved-mockup-contracts-2026-05-31.md` como contrato duro de mockups aprobados para EPIC-017. Incluye el target aprobado de Person 360 Daniela, la cartera de mockups restantes, reglas de no-regresion para ICO/Nexa/People surfaces, limites Payroll/Finance/Documents y checklist obligatorio para agentes de implementacion.

Delta posterior 11: se agrego `RESEARCH-008-epic017-mockup-execution-plan-2026-05-31.md` para planificar concretamente los mockups restantes. Corrige la omision del People Workforce Command Center (`/people/mockup/workforce-command`) y define layout, data story, microinteractions, payroll boundaries, GVC scenarios y batches de ejecucion para M02-M08.

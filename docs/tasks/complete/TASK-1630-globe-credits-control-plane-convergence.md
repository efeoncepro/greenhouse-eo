# TASK-1630 — Globe Credits Control Plane Convergence

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `umbrella`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Operativo y verificado live por UI, API/CLI y MCP; historia 500k excluida y outcomes antiguos adjudicados`
- Rank: `done`
- Domain: `platform|finance|globe`
- Blocked by: `none`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Coordina la convergencia del sistema de Studio Credits para que Greenhouse y Globe compartan una sola verdad
operativa, un solo flujo recuperable y adapters equivalentes para UI, API/CLI y MCP. El resultado exigible es
que una instrucción explícita del CEO pueda ser ejecutada manualmente o por un agente autenticado de punta a
punta, sin segundo aprobador obligatorio en el workspace owner-operated.

## Why This Task Exists

El ledger, los pools/grants, las policies y las intenciones de fondeo existen, pero sus readers, períodos y
workflows no convergen. El runtime puede mostrar un saldo histórico alto y capacidad efectiva cero; el command
mensual presupone un pool preparado; el reader no aplica la misma decisión que `reserveCredits`; y una respuesta
ambigua no tiene una bandeja operativa de status/reconcile. Esto convirtió cada rollover o top-up interno en una
operación artesanal de varias horas y dejó specs UI/API capaces de publicar cifras incorrectas.

## Goal

- Establecer un único `CreditDecisionSnapshot` autoritativo compartido por preflight, reserve, UI y adapters.
- Entregar una operación idempotente `ensure-funded` que prepare el período y haga readback completo.
- Permitir `preview → propose → confirm → readback` por humano o agente autenticado con una sola instrucción del
  CEO; `requireSecondConfirmer` es política opcional y queda OFF en `greenhouse-org:efeonce`.
- Construir el control plane administrativo en Greenhouse y mantener Globe Producer como self-view read-only.
- Dar recovery, expiry, reconciliation y evidencia suficientes para que ningún timeout exija repetir a ciegas.
- Mantener rating, billing comercial y el sistema `greenhouse_ai` fuera de este carril hasta sus tasks dueñas.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_GREENHOUSE_ADMINISTRATION_DECISION_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md`
- `docs/architecture/agent-invariants/REPOSITORY_SHARED_WORKSPACE_AGENT_INVARIANTS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Globe es autoridad de ledger, reservations, settlements, pools, grants, policies y budgets; Greenhouse es la
  superficie administrativa, autoridad de identidad, entitlements, delegación e intents.
- UI, API Platform, CLI, Nexa y MCP son adapters de los mismos primitives; ninguno implementa reglas de crédito.
- Un principal de servicio o workload genérico nunca confirma. Un usuario agente autenticado puede proponer y
  confirmar cuando una instrucción o delegación válida lo autoriza y los límites server-side se cumplen.
- La instrucción específica del CEO puede crear autoridad one-shot para workspace, período, target y cap exactos;
  no exige una segunda persona. El agente no puede ampliar por sí mismo una delegación persistente.
- `requireSecondConfirmer` es policy por workspace/umbral, no invariante global; default OFF en el workspace
  interno owner-operated.
- El ledger es append-only. Los 500.000 créditos históricos no se borran ni se duplican para fabricar capacidad;
  se clasifican y reconcilian mediante una decisión Finance trazable.
- No se reutiliza `/api/ai-credits/*`, `greenhouse_ai.credit_wallets` ni su ledger para Studio Credits.
- Ningún browser calcula caps, período o disponibilidad; recibe una proyección server-side con coverage/freshness.
- Ningún timeout de confirmación habilita retry ciego: primero `status/readback`, con la misma operation key.

## Normative Docs

- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`
- `docs/tasks/in-progress/TASK-1468-globe-studio-credits-shadow-ledger.md`
- `docs/tasks/complete/TASK-1482-globe-credit-pools-grants-budget-administration.md`
- `docs/tasks/complete/TASK-1566-globe-governed-credit-funding-command.md`
- `docs/tasks/complete/TASK-1629-globe-admin-cli-pkce.md`
- `docs/documentation/creative-studio/fondeo-gobernado-creditos-globe.md`
- `docs/manual-de-uso/creative-studio/fondear-creditos-globe.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`

## Dependencies & Impact

### Depends on

- `TASK-1468` — ledger, reservations, settlement, expiry y reconciliation.
- `TASK-1482` — períodos, pools, grants, policies, budgets y decisión autoritativa.
- `TASK-1566` — foundation transaccional `propose → confirm` ya entregada.
- `TASK-1629` — OAuth PKCE, API Platform, CLI, provenance y confirmación agente ya integrados.
- ADR-015 — frontera Greenhouse/Globe y política de confirmación.

### Blocks / Impacts

- `TASK-1586` — status, preview y recovery no pueden publicar los readers actuales.
- `TASK-1483` — el workbench administrativo se reubica en Greenhouse y consume contratos corregidos.
- `TASK-1628` — Producer consume un self-status redactado y no deriva caps localmente.
- `TASK-1579` / `TASK-1578` — rating, settlement y onboarding deben consumir el mismo lifecycle.
- `TASK-1473` / `TASK-1626` — MCP agrega writes sólo mediante identidad agente propagada.
- `TASK-1584` / `TASK-1585` — KMS, identidades disjuntas y retiro HMAC son hardening posterior al P0 operativo.
- `TASK-1484` — monetización permanece separada y bloqueada por sus decisiones comerciales.

### Files owned

- `docs/tasks/complete/TASK-1630-globe-credits-control-plane-convergence.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `docs/tasks/README.md`
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`
- deltas de coordinación y criterios de aceptación en las child tasks listadas arriba.

La umbrella no posee archivos de implementación de Greenhouse o Globe y no autoriza a dos child tasks a editar
la misma surface simultáneamente.

## Current Repo State

### Already exists

- Globe tiene ledger append-only, reservations, pools, grants, policies, project budgets y commands/readers.
- TASK-1566 entregó el command compuesto y un fondeo real sin break-glass.
- TASK-1629 fue integrado por PR `#176`: OAuth public client + PKCE, API Platform, CLI, provenance
  `actor_auth_mode`, delegación agente y fases terminales Greenhouse.
- ADR-015 ya permite confirmación agente bajo política por workspace y mantiene el segundo confirmador opcional.
- TASK-1483 ya tiene dirección visual, wireframe, flow y contrato de interacción aprovechables.

### Gap

- `getAvailability.spentInPeriod` agrega gasto histórico sin filtro temporal.
- `evaluateCreditBudget` no comparte el algoritmo de `reserveCredits` ni explica todos los denial reasons.
- Caps de período/proyecto no incluyen holds vigentes y settlement puede superar la reserva sin reautorizar.
- El período del pool y `fundingPriority` no se aplican consistentemente; el rollover requiere actos manuales.
- `month.fund` exige un `poolId` preparado y no asegura el ciclo completo.
- No hay `status/list/reconcile` operativo ni sweeper terminal para propuestas y reservations expiradas.
- Las divergencias documentales de TASK-1483, TASK-1628 y TASK-1629 quedaron corregidas durante el registro de
  esta umbrella; TASK-1483 y TASK-1628 ya cerraron implementación, rollout y smoke en sus specs dueñas.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: coordinación documental en `greenhouse-eo`; ejecución distribuida entre Greenhouse y `efeonce-globe`
- Future candidate home: `remain-shared`
- Boundary: ADR-015 + `CreditDecisionSnapshot` + `CreditFundingOperation`; child tasks conservan ownership ejecutable
- Server/browser split: la umbrella no introduce runtime; las child tasks mantienen policy/stores/secrets server-side y DTOs browser-safe
- Build impact: `none`
- Extraction blocker: la confirmación económica es transaccional en Postgres de Globe y la identidad/delegación vive en Greenhouse

<!-- ZONE 2 — PLAN MODE -->

## Authority Contract

### Instrucción específica del CEO

Una instrucción atribuida puede autorizar una operación one-shot con:

- `workspaceId`, `periodKey`, target de funding y cap resultante;
- actor CEO que instruye, agente que ejecuta y evidencia de la instrucción;
- vigencia, máximo de ejecuciones y operation key;
- fingerprint del plan confirmado y receipt terminal.

El agente autenticado ejecuta el flujo completo sin un segundo aprobador. Si el payload cambia, la autorización no
se reutiliza: exige un nuevo preview/fingerprint o una nueva instrucción.

### Delegación persistente

La delegación rutinaria es versionada, revocable y acotada por workspace, período, monto acumulado, monto por
operación, cap resultante, vigencia y número de ejecuciones. El agente no puede editar esa delegación.

### Segundo confirmador

- OFF por defecto en `greenhouse-org:efeonce` owner-operated.
- Puede activarse para un workspace de cliente o umbral futuro.
- Cuando está OFF, proponente y confirmante pueden ser el mismo usuario humano o agente autenticado.
- La separación que permanece obligatoria es entre quien autoriza/firma y quien ejecuta la mutación a nivel de
  workloads de Globe; no exige dos personas.

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

- Coordinar ownership, dependencias, orden y gates de salida de las child tasks de créditos de EPIC-028.
- Mantener una frontera única: lifecycle económico en Globe; identidad, intents y surfaces en Greenhouse.
- Exigir paridad semántica entre snapshot, reserve, adapters y UI sin implementar runtime desde la umbrella.
- Registrar la autoridad CEO/agente aprobada y distinguirla del estado live hasta que TASK-1629 la materialice.

## Detailed Spec

Esta task es programática: no introduce endpoints, migrations, UI ni workers. Cada etapa sólo habilita la
siguiente cuando su task dueña entrega conformance y evidencia runtime. Los cambios de alcance, source of truth,
autoridad o secuencia se actualizan primero aquí y en ADR-015, y después en la child task afectada.

## Backend/Data Contract

- Backend impact: `none`; la umbrella coordina contratos y no posee tablas, readers, commands o deployables.
- Globe conserva ledger, lifecycle, settlement y receipts. Greenhouse conserva identidad, entitlements e intents.
- Migraciones, backfills, concurrencia, rollback y runtime evidence pertenecen a TASK-1468/1482/1579/1586/1629.
- Ninguna child task puede crear una proyección económica autoritativa fuera de Globe ni un segundo ledger.

## Child Task Coordination

| Orden | Task | Ownership exigible | Gate de salida |
| --- | --- | --- | --- |
| P0.1 | `TASK-1482` | período, funding, evaluator/snapshot y transacción de ciclo | snapshot y reserve coinciden; rollover sin pool manual |
| P0.2 | `TASK-1468` + `TASK-1579` | holds, expiry, actual y settlement | cap incluye holds; `actual > reserved` se reautoriza |
| P0.3 | `TASK-1586` | lifecycle canónico Globe, status/preview/list/get/reconcile y proyecciones Greenhouse | diagnósticos tipados y recovery readback-first, sin segunda máquina de estados |
| P0.4 | `TASK-1629` | OAuth, autoridad one-shot y adapters one-command CLI/API sobre 1482/1586 | agente completa end-to-end y timeout converge |
| P1.1 | `TASK-1483` | `/admin/globe/credits` | workbench Greenhouse con GVC/a11y |
| P1.2 | `TASK-1628` | self-view read-only Producer | capacidad efectiva y razones sin admin writes |
| P1.3 | `TASK-1578` | onboarding route→rate→estimate/actual | cada ruta promoted tiene receipt completo |
| P2.1 | `TASK-1473` + `TASK-1626` | extender el gateway existente `https://mcp.efeonce.org/mcp`; token exchange Entra→Greenhouse y `ensure` one-shot, nunca Globe directo ni otro MCP | identidad agente propagada y conformance de write |
| P2.2 | `TASK-1584` + `TASK-1585` | KMS/break-glass/HMAC | disyunción física y retiro verificado |
| posterior | `TASK-1484` | funding originado por pago liquidado | no bloquea operación interna |

## Program Sequence

1. **Truth:** TASK-1482 corrige período, snapshot, enforcement y `ensure-funded`.
2. **Lifecycle:** TASK-1468 + TASK-1579 cierran holds, expiry, actual y settlement.
3. **Recovery:** TASK-1586 entrega lifecycle/receipts autoritativos en Globe y proyecciones/adapters de lectura en
   Greenhouse; Greenhouse nunca terminaliza una mutación económica por inferencia local.
4. **One-command:** TASK-1629 agrega autoridad one-shot y adapters API Platform/CLI sobre TASK-1482/TASK-1586.
5. **Administration UI:** Greenhouse `/admin/globe/credits`.
6. **Self-view:** Producer read-only.
7. **Onboarding:** TASK-1578 consume rating/settlement ya cerrados.
8. **Parity/hardening:** agregar write al gateway MCP existente, más KMS e identidades disjuntas.
9. **Commercial:** TASK-1484 sólo cuando su authority source sea un pago liquidado.

## Out of Scope

- Implementar código, schema, UI o runtime dentro de esta umbrella.
- Crear otro ledger, wallet, token o sistema de créditos en Greenhouse.
- Borrar o reescribir los 500.000 créditos históricos.
- Automatizar fondeo recurrente sin una decisión separada; esta task garantiza una instrucción end-to-end.
- Fondear clientes externos, procesar pagos o definir impuestos/refunds comerciales.
- Convertir KMS o un release completo en prerrequisito para corregir truth/operability.

## Rollout Plan & Risk Matrix

Impact-only. Cada child task conserva su propio plan, flags, migraciones, rollback y evidencia runtime. El orden
`truth → operability → UI → parity/hardening` es obligatorio; una UI o adapter no puede adelantarse al snapshot
autoritativo.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| Reader permite y reserve niega | credits | high | evaluador único + conformance | `credit_decision_enforcement_drift` |
| Doble fondeo tras timeout | finance | medium | operation key + status/readback | `credit_funding_duplicate_delta` |
| Ciclo inicia sin funding vigente | operations | high | `ensure-funded` + alerta T-3d | `credit_period_uncovered` |
| Agente excede autoridad | identity/finance | medium | instrucción/delegación server-side | `agent_funding_delegation_denied` |
| UI presenta saldo histórico como spendable | UI | high | DTO semántico + cero math cliente | conformance UI/status |
| Proposal/reservation queda retenida | reliability | high | sweeper + terminal states | `credit_operation_stale` |

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [x] Las child tasks tienen ownership y dependencias reconciliados con esta umbrella y ADR-015.
- [x] Existe una sola decisión server-side: mismo estado/input produce la misma decisión en snapshot y reserve,
  salvo conflicto concurrente explícito.
- [x] `monthlySpent` filtra el período; caps de workspace/proyecto incluyen holds vigentes.
- [x] `actual > reserved` requiere reautorización, settlement parcial o policy explícita; nunca excede caps en silencio.
- [x] Un rollover de período asegura pool, grant, allocation y policy sin IDs ni SQL manuales del operador.
- [x] Dos `ensure-funded` equivalentes producen un solo delta económico.
- [x] Propuestas vencidas terminalizan automáticamente; reservations con evidencia terminal expiran y las de
  outcome desconocido se reconcilian/difieren sin liberación ciega, conservando historia append-only.
- [x] Timeout después de commit converge mediante status/readback y nunca duplica grant o ledger.
- [x] Una instrucción específica del CEO permite que un agente autenticado complete el flujo end-to-end sin un
  segundo humano en `greenhouse-org:efeonce`.
- [x] Un agente sin instrucción/delegación, fuera de período, revocado o sobre límites falla cerrado.
- [x] Un principal de servicio/workload genérico nunca confirma.
- [x] Greenhouse publica `/admin/globe/credits`; Globe Producer permanece self-view read-only.
- [x] UI, API, CLI y MCP consumen el mismo snapshot/operation y pasan conformance.
- [x] Los 500.000 históricos quedan clasificados sin borrado ni duplicación y con decisión Finance trazable.
- [x] TASK-1484 y `/api/ai-credits/*` permanecen fuera del carril interno de Studio Credits.
- [x] Ninguna child task se declara completa sólo por código: migraciones, workers, flags, readback, GVC y runtime
  se verifican proporcionalmente.

## Verification

- `pnpm task:lint --task TASK-1630`
- `pnpm ops:lint --changed`
- revisión manual de ownership contra EPIC-028, ADR-015 y child tasks
- `pnpm docs:closure-check -- docs/tasks/complete/TASK-1630-globe-credits-control-plane-convergence.md docs/tasks/TASK_ID_REGISTRY.md docs/tasks/README.md docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`

## Delta 2026-08-01 — ejecución live del carril interno

- Greenhouse `develop` y Globe `main` entregaron `CreditDecisionSnapshotV2`, `ensure-funded`, status/list/get/
  reconcile, autoridad one-shot CEO→agente, browser workbench, CLI OAuth PKCE y self-view Producer.
- La operación `23db5b0e-89dd-4661-9b8d-c12f9be4ad7a` llevó la capacidad efectiva de 0 a 800 con pool mensual
  determinístico, un grant y una allocation; Greenhouse, CLI y Producer devolvieron el mismo readback.
- El worker de expiry quedó live con scheduler minutely y least privilege exacto. El canary `fmspk` reclamó dos
  holds: `claimed=2`, `reconciliationRequested=2`, `deferred=2`, `failed=0`; esa primera clasificación evitó
  liberación ciega hasta que una decisión Finance exacta habilitó su adjudicación gobernada posterior.
- El GVC exhaustivo de `TASK-1483`/`TASK-1628` pasó desktop/mobile, teclado, reduced motion, accesibilidad,
  overflow y runtime. Ambas ampliaciones quedaron desplegadas y verificadas con Chrome autenticado.
- Globe desplegó la adjudicación gobernada de outcomes históricos: liberó 14+16 créditos y terminalizó ambos runs
  con decisions Finance exactas. Los 500.000 se conservaron append-only y se retiraron de toda proyección operativa.
- Efeonce MCP desplegó `globe.credits.funding.ensure`; el canary OAuth/Entra + WIF + RFC 8693 + Greenhouse command
  terminó `completed/no_effect` y probó que un segundo intento no fabrica capacidad ni duplica el delta.
- Evidencia canónica: `docs/operations/creative-studio/evidence/2026-08-01/README.md`.

## Closing Protocol

- [x] Todas las child tasks P0 tienen evidencia terminal para el alcance de convergencia y lifecycle honesto.
- [x] `Lifecycle` cambia a `complete` y el archivo se mueve a `docs/tasks/complete/` sólo cuando todos los
  acceptance criteria de programa están cumplidos.
- [x] `docs/tasks/README.md`, `TASK_ID_REGISTRY.md`, EPIC-028, `Handoff.md` y `changelog.md` quedan sincronizados.
- [x] Se ejecutan gates proporcionales de QA y documentación antes del cierre.
- [x] No se creó ni usó un worktree aislado durante la ejecución.

## Follow-ups

- La automatización recurrente de rollover, si el operador la desea después del one-command, requiere policy y
  task separadas con target, cadence, límites, pause/kill switch y alerta previa.
- TASK-1614/Seedance continúa como siguiente vertical de producto; no forma parte de este cierre de créditos.
- El tratamiento contable definitivo de la allocation histórica de 500.000 requiere decisión de Finance: vínculo
  de elegibilidad contra la allocation original o adjustment compensatorio, nunca un grant duplicado.

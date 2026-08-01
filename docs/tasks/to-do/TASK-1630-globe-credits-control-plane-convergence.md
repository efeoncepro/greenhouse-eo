# TASK-1630 — Globe Credits Control Plane Convergence

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
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
- Status real: `Programa aprobado; ADR, child tasks e índices rebaselined; ejecución runtime pendiente`
- Rank: `next`
- Domain: `platform|finance|globe`
- Blocked by: `none`
- Branch: `task/TASK-1630-globe-credits-control-plane-convergence`
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
- `docs/tasks/in-progress/TASK-1482-globe-credit-pools-grants-budget-administration.md`
- `docs/tasks/complete/TASK-1566-globe-governed-credit-funding-command.md`
- `docs/tasks/in-progress/TASK-1629-globe-admin-cli-pkce.md`
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

- `docs/tasks/to-do/TASK-1630-globe-credits-control-plane-convergence.md`
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
  esta umbrella; sus gaps de implementación y rollout permanecen abiertos en sus specs dueñas.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: coordinación documental en `greenhouse-eo`; ejecución distribuida entre Greenhouse y `efeonce-globe`
- Future candidate home: `remain-shared`
- Boundary: ADR-015 + `CreditDecisionSnapshot` + `CreditFundingOperation`; child tasks conservan ownership ejecutable
- Server/browser split: la umbrella no introduce runtime; las child tasks mantienen policy/stores/secrets server-side y DTOs browser-safe
- Build impact: `none`
- Extraction blocker: la confirmación económica es transaccional en Postgres de Globe y la identidad/delegación vive en Greenhouse

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

## Child Task Coordination

| Orden | Task | Ownership exigible | Gate de salida |
| --- | --- | --- | --- |
| P0.1 | `TASK-1482` | período, funding, evaluator/snapshot y transacción de ciclo | snapshot y reserve coinciden; rollover sin pool manual |
| P0.2 | `TASK-1468` + `TASK-1579` | holds, expiry, actual y settlement | cap incluye holds; `actual > reserved` se reautoriza |
| P0.3 | `TASK-1629` | identidad, operation/status/readback y one-command CLI/API | agente completa end-to-end y timeout converge |
| P0.4 | `TASK-1586` | status/preview/list/get/reconcile Greenhouse | diagnósticos tipados, sin math cliente |
| P1.1 | `TASK-1483` | `/admin/globe/credits` | workbench Greenhouse con GVC/a11y |
| P1.2 | `TASK-1628` | self-view read-only Producer | capacidad efectiva y razones sin admin writes |
| P1.3 | `TASK-1578` | onboarding route→rate→estimate/actual | cada ruta promoted tiene receipt completo |
| P2.1 | `TASK-1473` + `TASK-1626` | adapters MCP | identidad agente propagada y conformance |
| P2.2 | `TASK-1584` + `TASK-1585` | KMS/break-glass/HMAC | disyunción física y retiro verificado |
| posterior | `TASK-1484` | funding originado por pago liquidado | no bloquea operación interna |

## Program Sequence

1. **Truth:** corregir período, snapshot, enforcement, holds y settlement.
2. **Operability:** `ensure-funded`, status/list/reconcile, expiry y one-command con agente.
3. **Administration UI:** Greenhouse `/admin/globe/credits`.
4. **Self-view:** Producer read-only.
5. **Rating/onboarding:** TASK-1579 → TASK-1578.
6. **Parity/hardening:** MCP, KMS e identidades disjuntas.
7. **Commercial:** TASK-1484 sólo cuando su authority source sea un pago liquidado.

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

## Acceptance Criteria

- [x] Las child tasks tienen ownership y dependencias reconciliados con esta umbrella y ADR-015.
- [ ] Existe una sola decisión server-side: mismo estado/input produce la misma decisión en snapshot y reserve,
  salvo conflicto concurrente explícito.
- [ ] `monthlySpent` filtra el período; caps de workspace/proyecto incluyen holds vigentes.
- [ ] `actual > reserved` requiere reautorización, settlement parcial o policy explícita; nunca excede caps en silencio.
- [ ] Un rollover de período asegura pool, grant, allocation y policy sin IDs ni SQL manuales del operador.
- [ ] Dos `ensure-funded` equivalentes producen un solo delta económico.
- [ ] Propuestas y reservations vencidas terminalizan automáticamente y conservan historia append-only.
- [ ] Timeout después de commit converge mediante status/readback y nunca duplica grant o ledger.
- [ ] Una instrucción específica del CEO permite que un agente autenticado complete el flujo end-to-end sin un
  segundo humano en `greenhouse-org:efeonce`.
- [ ] Un agente sin instrucción/delegación, fuera de período, revocado o sobre límites falla cerrado.
- [ ] Un principal de servicio/workload genérico nunca confirma.
- [ ] Greenhouse publica `/admin/globe/credits`; Globe Producer permanece self-view read-only.
- [ ] UI, API, CLI y MCP consumen el mismo snapshot/operation y pasan conformance.
- [ ] Los 500.000 históricos quedan clasificados sin borrado ni duplicación y con decisión Finance trazable.
- [ ] TASK-1484 y `/api/ai-credits/*` permanecen fuera del carril interno de Studio Credits.
- [ ] Ninguna child task se declara completa sólo por código: migraciones, workers, flags, readback, GVC y runtime
  se verifican proporcionalmente.

## Verification

- `pnpm task:lint --task TASK-1630`
- `pnpm ops:lint --changed`
- revisión manual de ownership contra EPIC-028, ADR-015 y child tasks
- `pnpm docs:closure-check -- docs/tasks/to-do/TASK-1630-globe-credits-control-plane-convergence.md docs/tasks/TASK_ID_REGISTRY.md docs/tasks/README.md docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`

## Closing Protocol

- [ ] Todas las child tasks P0 tienen evidencia terminal y lifecycle honesto.
- [ ] `Lifecycle` cambia a `complete` y el archivo se mueve a `docs/tasks/complete/` sólo cuando todos los
  acceptance criteria de programa están cumplidos.
- [ ] `docs/tasks/README.md`, `TASK_ID_REGISTRY.md`, EPIC-028, `Handoff.md` y `changelog.md` quedan sincronizados.
- [ ] Se ejecutan `pnpm qa:gates --changed` y `pnpm docs:closure-check` antes del cierre.
- [ ] No se crea ni usa un worktree aislado durante la ejecución.

## Follow-ups

- La automatización recurrente de rollover, si el operador la desea después del one-command, requiere policy y
  task separadas con target, cadence, límites, pause/kill switch y alerta previa.
- El tratamiento contable definitivo de la allocation histórica de 500.000 requiere decisión de Finance: vínculo
  de elegibilidad contra la allocation original o adjustment compensatorio, nunca un grant duplicado.

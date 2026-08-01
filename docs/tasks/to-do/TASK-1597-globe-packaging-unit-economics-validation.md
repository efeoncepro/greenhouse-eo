# TASK-1597 — Globe Packaging and Unit Economics Validation

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `policy`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance|delivery|agency|commercial`
- Blocked by: `TASK-1478, TASK-1479, TASK-1480, TASK-1482`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Definir y validar packaging, revenue lanes y unit economics de Globe separando software, Product Service,
managed/co-operated y canal. Fija cost-to-serve y margin gate ≥45%; no implementa billing, tax, payment, checkout ni
pricing público.

## Goal

- Formalizar Studio Access, Diagnostic/Campaign System, Managed Production, Co-operated Studio y Agency Delivery.
- Separar revenue propio, human capacity, usage/credits, provider pass-through, rights pass-through, referral y revenue share.
- Definir cost-to-serve por cuenta, lane, provider, template y operating mode.
- Entregar integrity pack a `TASK-1480` y `TASK-1484`.

## Architecture Alignment

- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md`
- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md`
- `docs/business-models/EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md`
- `docs/business-models/EFEONCE_PARTNER_PROVIDER_LAYER_OPERATING_MODEL_V1.md`
- `docs/tasks/TASK_PROCESS.md`

## Modular Placement Contract

- Topology impact: `none`
- Current home: `docs/business-models`, `docs/commercial` y `docs/finance`
- Future candidate home: `remain-shared`
- Boundary: packaging/economics policy, no billing runtime ni ledger
- Server/browser split: `n/a`
- Build impact: `none`
- Extraction blocker: `Finance/Legal/Commercial approval boundary`

## Dependencies & Impact

- Depends on: `TASK-1478, TASK-1479, TASK-1480, TASK-1482`.
- Impacts: `TASK-1484`, future quote/catalog/CPQ y agency channel packaging.
- No ownership of runtime credits, billing, tax o revenue recognition.

## Scope

1. Packaging matrix: software, Product Service, managed, co-operated y channel.
2. Revenue map: value trigger, billing unit candidate, included/excluded, renewal y expansion trigger.
3. Cost waterfall: human loaded cost, provider/compute, storage/tooling, support, QA, retries/refunds, rights/pass-through,
   ramp-up, procurement, platform operations y working capital/FX.
4. Margin gate: gross margin ≥45% por cuenta/lane/template/provider/mode; sensibilidad utilization 60/75/90%, provider 2×,
   retries, support 2×/4×, FX ±15% y volumen 0.5×/1×/3×.
5. Rights/pass-through y stop-loss.
6. Experimentos WTP por lane, managed vs co-operated, usage envelope y agency channel economics.

## Out of Scope

Billing, tax, payments, checkout, catálogo público, pricing final, ledger migrations, payouts, reseller agreements,
contract negotiation, credits runtime, UI comercial y ventas externas.

## Acceptance Criteria

- [ ] Cada lane declara buyer, outcome, delivery model, operating mode, billing unit candidata, included/excluded y renewal trigger.
- [ ] Revenue propio, human capacity, credits, provider pass-through, rights pass-through, referral y revenue share están separados.
- [ ] Existe plantilla de cost-to-serve por account/lane/provider/template/mode.
- [ ] Margin gate bruto mínimo ≥45% aplica por cuenta y lane, no sólo agregado.
- [ ] Sensibilidades de utilization, provider cost, retries, soporte, FX y volumen están incluidas.
- [ ] Rights/pass-through declara ownership, territorio, plazo, licencia y liability.
- [ ] Pricing permanece bloqueado hasta `commercially_approved`.
- [ ] Se documenta la frontera con `TASK-1478`, `TASK-1479`, `TASK-1480` y `TASK-1484`.
- [ ] WTP, managed/co-operated, usage envelope y agency economics tienen hipótesis, muestra, threshold y stop condition.
- [ ] No se habilita checkout, pricing público o cliente externo por esta task.

## Rollout Plan & Risk Matrix

Task documental/policy; Finance, Commercial, Legal, Operations y Creative Practice revisan. Riesgos: duplicar `TASK-1478`,
ocultar costo humano, tratar rights como margen, mezclar modes o publicar pricing prematuramente. Mitigación: integrity
pack único, waterfall, owner por lane, margin gate y status `pricing_blocked`.

## Verification

- `pnpm task:lint --task TASK-1597`
- reconciliación con `TASK-1478`, `TASK-1479`, `TASK-1480` y `TASK-1484`
- revisión Finance/Legal/Commercial/Operations
- `pnpm docs:closure-check`

## Closing Protocol

Sincronizar registry, README, EPIC-028, Handoff y changelog. La salida es una hipótesis económica aprobada para
validación; nunca pricing comercial definitivo.

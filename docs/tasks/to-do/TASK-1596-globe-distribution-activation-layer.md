# TASK-1596 — Globe Distribution and Activation Layer

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
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
- Domain: `commercial|agency|content|growth`
- Blocked by: `TASK-1476, TASK-1477, TASK-1523, TASK-1580, TASK-1581, TASK-1582, TASK-1583`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Definir la capa de distribución y activación que conecta contenido, artifacts, templates, creators, referrals e
integraciones con PQL, Sample Sprint, primer run aprobado, segundo run y expansión. No implementa runtime, CRM, payouts,
checkout ni marketplace.

## Goal

- Formalizar loops `direct|agency-led|creator-led|referral-led|content-led|ecosystem-led|provider-enabled|case-study-led`.
- Definir `second_run_activated` como señal principal de adopción temprana.
- Separar distribución, integration, provider y partnership contractual.
- Entregar template de PQL → Sample Sprint → expansion.

## Architecture Alignment

- `docs/strategy/EFEONCE_GLOBE_MARKET_DISTRIBUTION_AND_MONETIZATION_STRATEGY_V1.md`
- `docs/strategy/EFEONCE_CONTENT_TO_CAPABILITY_LOOP_V1.md`
- `docs/audits/commercial/HIGGSFIELD_PARTNERSHIP_AND_VERTICAL_EXPANSION_RESEARCH_2026-07-29.md`
- `docs/audits/commercial/MAGNIFIC_GO_TO_MARKET_AND_PLATFORM_EXPANSION_RESEARCH_2026-07-29.md`
- `docs/tasks/TASK_PROCESS.md`

## Modular Placement Contract

- Topology impact: `none`
- Current home: `docs/strategy`, `docs/commercial` y `docs/audits/commercial`
- Future candidate home: `remain-shared`
- Boundary: GTM/activation contracts, no CRM source of truth ni runtime
- Server/browser split: `n/a`
- Build impact: `none`
- Extraction blocker: `none`

## Dependencies & Impact

- Depends on: `TASK-1476, TASK-1477, TASK-1523`.
- Consumes: `TASK-1580…1583` para reuse y contexto.
- Impacts: `TASK-1479`, `TASK-1480` y futuros agency/channel motions.

## Scope

1. Artifact loop: resultado demostrable → CTA → diagnostic/Sample Sprint → proof/case/template.
2. Template loop: builder experto → template semántico → runner → segundo run → reuse → workspace.
3. Content loop: problema operativo → educación → demo → CTA → aplicación → evidencia.
4. Creator loop: seeding, advocacy, contributor, paid campaign, referral o partnership contractual con rights.
5. Referral loop: source, consent, attribution window, owner, duplicate protection y next step.
6. Integration loop: integration/provider/ecosystem/referral/reseller/co-selling/enablement clasificados correctamente.
7. PQL: trigger, operator, champion, workflow repetible, primer run, segundo run/intención, rights, buyer group y next step bilateral.

## Out of Scope

CRM, HubSpot runtime, referral ledger, payouts, checkout, pricing público, marketplace, UI nueva, integrations runtime
y claims de CAC/NRR sin cohortes.

## Acceptance Criteria

- [ ] Cada loop declara audience, trigger, artifact, owner, attribution, economics, rights, next step y stop condition.
- [ ] `second_run_activated` tiene definición operacional y exclusiones.
- [ ] PQL separa evidencia positiva de `unknown`.
- [ ] Existe funnel `engaged account → PQL → Sample Sprint → first approved run → second run → expansion-ready`.
- [ ] Se distingue integration/provider/ecosystem de reseller/co-selling/partnership.
- [ ] El contenido se mide por acción y pipeline contribution, no sólo views/logins.
- [ ] No se habilita self-serve, pricing, payout o cliente externo por esta task.

## Rollout Plan & Risk Matrix

Task documental; Strategy, Commercial, Customer Model, Creative Practice, Legal y Finance revisan. Riesgos: interés
confundido con PQL, creator sin rights, referral sin economics y segundo run artificial. Mitigación: evidence ledger,
rights card, attribution contract y criterio de resultado aprobado.

## Verification

- `pnpm task:lint --task TASK-1596`
- revisión de no solapamiento con `TASK-1476/1477/1479/1480`
- `pnpm docs:closure-check`

## Closing Protocol

Sincronizar registry, README, EPIC-028, Handoff y changelog. La salida es un contrato de activación, no un lanzamiento.

# TASK-1594 — Globe Agency Workflow Sprint

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
- Domain: `agency|delivery|rights|commercial`
- Blocked by: `TASK-1595, TASK-1480`
- Branch: `task/TASK-1594-agency-workflow-sprint`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Validar agencias y productoras como canal multiplicador B2B2B mediante un sprint con agencia, cliente final, campaña,
tenancy, rights, approval y economics. No crea marketplace, reseller ni white-label por defecto.

## Goal

- Probar si una agencia produce distribución incremental para Globe.
- Separar agency payer, client-final approver, budget approver, rights owner y Efeonce delivery owner.
- Clasificar el resultado como referral, co-operated, managed delivery o partnership formal sólo con términos explícitos.

## Architecture Alignment

- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`
- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md`
- `docs/business-models/EFEONCE_PARTNER_PROVIDER_LAYER_OPERATING_MODEL_V1.md`
- `docs/tasks/TASK_PROCESS.md`

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `Greenhouse commercial/control plane; Globe runtime owner`
- Future candidate home: `remain-shared`
- Boundary: agency → client-final operating contract, sprint evidence y channel classification
- Server/browser split: `n/a; runtime downstream debe conservar autoridad server-side`
- Build impact: `none`
- Extraction blocker: `tenancy, identity, rights y approval existentes son dependencias`

## Dependencies & Impact

- Depends on: `TASK-1595, TASK-1476, TASK-1478, TASK-1479, TASK-1480, TASK-1535`.
- Impacts: future agency delivery, Studio Access y partner/channel packaging.
- No crea un registry de agencias paralelo ni modifica grants/runtime.

## Scope

1. Definir agency workspace, client-final workspace, campaign, operators, approvers, rights owner y delivery owner.
2. Definir modalidades `white-label|endorsed` y modos `client-operated|co-operated|efeonce-managed`.
3. Diseñar sprint con un cliente final, un brief, un key visual, variantes acotadas, review y manifest.
4. Registrar source attribution, human cost, provider cost, support, pass-through, margin, next opportunity y no-fit.
5. Definir criterios de referral, co-operated, managed y partnership formal.

## Out of Scope

Marketplace, reseller program, white-label general, revenue share automático, creator/affiliate program, CRM/CPQ,
billing general, acceso externo antes de `TASK-1480` y rights/entrega no gobernados.

## Acceptance Criteria

- [ ] Existe un operating contract agency → cliente final → campaña.
- [ ] Agency y cliente final quedan separados por scope, approval, rights y ownership.
- [ ] White-label y endorsed no son defaults.
- [ ] El sprint registra attribution, support, provider cost, human cost, pass-through y margen.
- [ ] Outputs y manifests conservan lineage, rights status, approval y portfolio permission.
- [ ] No existe acceso cross-tenant ni entrega desde estado pendiente/rechazado/rights-blocked.
- [ ] El canal se clasifica sin llamar partnership a una integración, caso o agencia usuaria.
- [ ] La activación del piloto comercial externo queda condicionada al go de `TASK-1480`; esta task prepara el canal y
      no redefine Globe como producto internal-only.

## Success / Falsification Thresholds

Validación inicial: al menos 2 agencias, 2 clientes finales, 100% de casos con rights/approval completos, cero fugas,
margen bruto fully loaded ≥45% y al menos una oportunidad adicional o segunda fase por agencia. Rediseñar si hay fuga,
dos sprints bajo margen, ninguna oportunidad adicional o soporte >60 minutos por run en más del 30% de casos.

## Rollout Plan & Risk Matrix

Discovery documental → sprint interno/controlled → evidence pack → decisión referral/co-operated/managed/partnership.
Riesgos: acceso cruzado, white-label no gobernado, margen destruido y aprobación difusa. Mitigación: grants explícitos,
RACI, rights ledger, support meter y `TASK-1480`.

## Verification

- `pnpm task:lint --task TASK-1594`
- validación contra `TASK-1595`, `TASK-1476`, `TASK-1478`, `TASK-1479`, `TASK-1480` y `TASK-1535`
- evidencia de no duplicación con partner/provider layer
- `pnpm docs:closure-check`

## Closing Protocol

Sincronizar registry, README, EPIC-028, Handoff y changelog. La task sólo puede cerrar como `validated channel
hypothesis` o `redesign required`; no autoriza reseller/co-selling.

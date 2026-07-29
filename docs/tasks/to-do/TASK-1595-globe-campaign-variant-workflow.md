# TASK-1595 — Globe Campaign Variant Workflow

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
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
- Domain: `creative-studio|delivery|rights|content`
- Blocked by: `TASK-1481, TASK-1535, TASK-1553, TASK-1554, TASK-1498, TASK-1522, TASK-1480`
- Branch: `task/TASK-1595-campaign-variant-workflow`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Definir el workflow vertical demostrable de Globe:

```text
brief → product/key visual → variantes → localización → QA → review → manifest
```

Será el proving ground para Agency Workflow Sprint, e-commerce/DTC y una futura oferta enterprise. No es batch libre,
publicación automática ni promesa de performance media.

## Goal

- Convertir un brief y un asset aprobado en variantes gobernadas.
- Conservar brief, referencias, lineage, rights, costos, review y memoria.
- Probar reutilización del workflow en los modos permitidos.
- Generar `CreativeAssetPack`, `AssetManifest` o `AssemblyManifest` conforme al alcance.

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_EXPERIENCE_LAUNCHOPS_GLOBE_CREATIVE_PRODUCTION_INTEGRATION_V1.md`
- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md`
- `docs/tasks/TASK_PROCESS.md`

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `Globe workflow/contract owners; Greenhouse task/evidence control plane`
- Future candidate home: `domain-package`
- Boundary: versioned campaign variant workflow and manifest policy; no second campaign aggregate
- Server/browser split: `n/a para policy; futura autoridad server-side, client projections`
- Build impact: `none en esta task`
- Extraction blocker: `lineage, rights, ledger, review y provider seam canónicos`

## Dependencies & Impact

- Depends on: `TASK-1481, TASK-1468, TASK-1535, TASK-1553, TASK-1554, TASK-1498, TASK-1522`.
- Consumed by: `TASK-1594` y futuras templates de Studio Access.
- La activación externa queda condicionada al go de `TASK-1480`; esta task define el workflow comercial de un producto
  que ya es comercial por naturaleza y no autoriza un bypass técnico.

## Scope

1. Definir estados `brief_received → source_asset_ready → variant_plan_ready → candidates_generated → localization_ready → qa_pending → review_pending → approved → manifest_ready → delivered`.
2. Definir brief con objective, audience, markets, channels, formats, claims, constraints, source asset, approvers, rights owner y budget owner.
3. Definir variant matrix por mercado, idioma, canal, formato, copy, fidelity contract, output esperado y reviewer.
4. Separar traducción, adaptación cultural/legal, render, review lingüístico y brand review.
5. Definir QA técnico, creativo, copy/claims, rights, provenance y review humano.
6. Definir manifest con hashes, lineage, variant matrix, model/version, fallback, rights, QA, approval y settlement reference.
7. Declarar coverage por UI/API/SDK/MCP/worker/E2E; superficies faltantes quedan `policy-blocked`.

## Out of Scope

Media buying, attribution/ROAS, publicación automática, compra de rights externos, marketplace, generación ilimitada,
aprobación automática, video effectiveness, storyboard completo, pricing público y soporte de todos los providers.

## Acceptance Criteria

- [ ] El workflow y sus estados están versionados.
- [ ] Cada variante conserva lineage hasta brief, source asset, key visual y template.
- [ ] Localización separa traducción, adaptación, review lingüístico y aprobación.
- [ ] QA, rights, provenance y review tienen estados explícitos.
- [ ] Output técnico no equivale automáticamente a aprobación.
- [ ] `rights_blocked`, `qa_failed` y `review_rejected` impiden manifest final.
- [ ] Manifest contiene hashes, lineage, variant matrix, QA, approval y target.
- [ ] Estimate/actual es reconciliable por workflow, variante y ruta.
- [ ] El segundo run puede reutilizar contexto sin reconstruir manualmente el brief.
- [ ] No se activa cliente externo antes de `TASK-1480`.

## Success / Falsification Thresholds

Validación inicial: 3 briefs, 3 configuraciones de mercado, 2 formatos por brief, 18 variantes, ≥80% con QA/rights
completos, ≥70% aprobadas o con edición menor en primera ronda, ±20% estimate/actual en ≥80% de workflows, segundo run
al menos 30% más rápido y margen fully loaded ≥45% si se ejecuta como sprint comercial. Rediseñar si el brief debe
reconstruirse en >30%, no hay manifest completo, aparece delivery no aprobado o el segundo run no mejora.

## Rollout Plan & Risk Matrix

Contract → brief/source → variant matrix → localization → QA/review → manifest → conformance → pilot evidence.
Riesgos: pérdida de lineage, claims mal localizados, manifest desde estado pendiente, drift de costos y cross-tenant.
Mitigación: state machine fail-closed, rights gates, reservation/settlement y tenant tests.

## Verification

- `pnpm task:lint --task TASK-1595`
- revisión contra `TASK-1498`, `TASK-1522`, `TASK-1535`, `TASK-1553/1554` y Creative Studio model
- conformance plan para UI/API/SDK/MCP/worker/E2E downstream
- `pnpm docs:closure-check`

## Closing Protocol

Registrar el contrato, downstream implementation tasks, evidencia y relación con `TASK-1594`. Esta policy no declara
runtime listo ni habilita comercialización.

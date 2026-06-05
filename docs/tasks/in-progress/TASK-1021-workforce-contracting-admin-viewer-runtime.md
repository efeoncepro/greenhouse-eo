# TASK-1021 — Workforce Contracting Studio: Admin Viewer runtime (Command Center + Guided Builder + Bilingual Review Desk)

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Branch: `develop` (operador: "mantente en develop no cambies de rama", 2026-06-05)
- Epic: Workforce Contracting Studio (ADR `GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1.md` §8 "Admin Viewer", §12.4)
- Created: 2026-06-05

## Why

La foundation (TASK-1019) entregó dominio + readers product-shaped (`listContractingCases`, `getContractingCaseDetail`) + commands (`createCase`, `createOffer/EmploymentContractDraft`, `approveDraft`, `voidCase`) + capabilities + el **mockup aprobado** (`/hr/workforce/contracts/mockup`), pero **no hay UI runtime**. Esta task promueve el mockup a runtime real consumiendo los readers, vía **copy-and-patch** + loop GVC (paridad `fe:capture:diff` contra el mockup). **No depende de EPIC-001** — las acciones de PDF/firma se renderizan como estados `locked` ("Próximamente") hasta que aterricen TASK-1023/1024.

## Scope

- Ruta runtime `/hr/workforce/contracts` (server page: `getTenantContext` + gate por `can(subject, 'workforce.contracting.read', 'read', 'tenant')` con fallback route_group `hr`/`EFEONCE_ADMIN`) + `WorkforceContractingStudioView` (cliente) consumiendo `listContractingCases` server-side; detalle vía `getContractingCaseDetail`.
- **Command Center**: cola filtrable (persona, documento, pack, estado, paridad, riesgo, próxima acción, vence) + detail rail (facts, validación, draft, timeline). Lee `projection` (nextActionCode/riskLevel/parity/signatureReadiness).
- **Guided Builder**: wizard de creación de caso + draft (mutaciones `createCase` + `createDraft`/`ai-draft` flag-gated). El panel IA respeta `WORKFORCE_CONTRACTING_AI_ENABLED` (si OFF → estado honesto "redacción manual / IA deshabilitada").
- **Bilingual Review Desk**: comparación ES+EN por sección + `latestValidation` (blockers/parity) + acción `approveDraft` (gate `workforce.contracting.approve`, **EFEONCE_ADMIN unilateral V0**). Acciones PDF/firma = `locked` hasta TASK-1023/1024.
- **Gobernanza obligatoria** (CLAUDE.md): migración que seedea el `viewCode` en `VIEW_REGISTRY` + `role_view_assignments` (mismo PR), ítem de nav (`VerticalMenu`) gated por ese viewCode, y declarar la ruta en el reachability manifest (TASK-982) — sino orphan page + warnings `role_view_fallback_used`.
- **12-state coverage** (state-design): default/loading/empty(zero)/empty(filtered)/error/degraded honestos. Empty zero-state real (no hay casos aún) con CTA "Crear documento".
- **Loop GVC obligatorio**: `pnpm fe:capture` + leer frame + ajustar + `fe:capture:diff` contra el mockup hasta paridad enterprise. Skills product-design en loop.
- Microcopy es-CL vía `GH_WORKFORCE_CONTRACTING` (`src/lib/copy/workforce-contracting.ts`); extender, no literals en JSX.

## Dependencies & Impact

- **Depende de:** TASK-1019 (foundation — readers/commands/capabilities/projection) ✅. NO depende de EPIC-001.
- **Impacta a:** TASK-1023 (PDF) y TASK-1024 (firma) desbloquean las acciones hoy `locked`; TASK-1025 (emails) consume los mismos eventos.
- **Archivos owned:** `src/app/(dashboard)/hr/workforce/contracts/page.tsx`, `src/views/greenhouse/hr/workforce-contracting/WorkforceContractingStudioView.tsx` (+ subcomponentes runtime), migración viewCode, nav.

## Out of Scope

- Render de PDF / firma ZapSign / emails (TASK-1023/1024/1025).
- Habilitar el flag de IA en producción (operacional: rotar key + staging shadow).

## Acceptance

- `/hr/workforce/contracts` runtime alcanzable por nav (no orphan), gated por capability + viewCode, consumiendo readers reales.
- Las 3 superficies del mockup promovidas con paridad visual GVC verificada (`fe:capture:diff`).
- Aprobar un draft bilingüe end-to-end (gate EFEONCE_ADMIN) mueve el estado del caso; acciones PDF/firma visibles como `locked`.
- `pnpm test` + `pnpm build` + tsc/lint verdes; mockup intacto como referencia.

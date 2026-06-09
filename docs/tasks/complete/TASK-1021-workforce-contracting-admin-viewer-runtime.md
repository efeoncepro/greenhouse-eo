# TASK-1021 — Workforce Contracting Studio: Admin Viewer runtime (Command Center + Guided Builder + Bilingual Review Desk)

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Branch: `develop` (operador: "mantente en develop no cambies de rama", 2026-06-05)
- Epic: Workforce Contracting Studio (ADR `GREENHOUSE_WORKFORCE_CONTRACTING_STUDIO_V1.md` §8 "Admin Viewer", §12.4)
- Created: 2026-06-05

## Progress (2026-06-05, en `develop` sin push)

- **Slice 0 — Governance ✅** (commits `556347410` + `e5bf9f74f` + `735a2fa1b`): migración `20260605150932572` (viewCode `equipo.workforce_contracting` + 4 grants efeonce_admin/finance_admin/hr_manager/hr_payroll) **aplicada + verificada live**; nav item "Contratos laborales" bajo HR/Supervisión gated por `canSeeView`; copy `GH_HR_NAV` (es) + `navigation-copy` (en); registrado también en el TS `VIEW_REGISTRY` (view-access-catalog) para paridad. `/hr/workforce/contracts` top-level → alcanzable (sin reachability entry).
- **Slice 1 — Command Center runtime ✅** (commit `75bd66066`): page (gate viewCode + reader) + `WorkforceContractingStudioView` consumiendo `listContractingCases` + detail rail vía GET `/api/hr/workforce/contracting/[caseId]`. Header + 5 KPIs computados + queue filtrable + detail rail (status, projection, blockers, drafts, timeline real). 12-state honesto (empty zero/filtered, loading skeleton, error+retry, degraded `—`). Builder/Review = locked "Próximamente". PDF/firma = locked (EPIC-001). tsc 0 · eslint 0 · 155 tests focales. **GVC empty-state PASS** (chrome enterprise, agent auth pasa el gate).
- **Slice 2 — Guided Builder ✅** (commit `32bf5231d`): botón "Nueva carta o contrato" (canManage) → modo builder con form de creación (toggle tipo + person picker vía `/api/organizations/people-search` + select de pack filtrado por tipo + `GreenhouseDatePicker` + `legalReviewReference` condicional al pack) → POST create → `router.refresh` + selección. Operating entity resuelto server-side. Acción "Generar borrador IA" honesta (flag OFF → 409 "IA deshabilitada").
- **Slice 3 — Bilingual Review Desk ✅** (commit `32bf5231d`): nuevo reader `getLatestContractingDraftContent` + GET `/[caseId]/draft-content`. Modo review renderiza ES/EN lado a lado por `sectionCode` + paridad estructural + blockers; `approveDraft` (canApprove, bloqueado si blockers>0), `void` (canManage, prompt de motivo ≥5), generar borrador IA. Detail rail gana "Revisar borrador bilingüe" → modo review. 12-state honesto.
- **GVC loop ✅** (commit `1e982c966`): scenario runtime captura las 3 superficies (Command Center + Guided Builder/create + Bilingual Review). El loop atrapó + corrigió: badge "(Próximamente)" obsoleto (Builder/Review ya funcionales) + 2 violaciones axe color-contrast (toggle low-opacity + subheader compartido `text.secondary`). **Captura final OK · 0 violaciones axe** en las 3 superficies.
- Paridad real corregida: los valores de paridad bilingüe son `pass|fail|unknown` (no `ok|warning|error` del mockup).
- **Pendiente (fuera de TASK-1021)**: el Collaborator Viewer (`/my/offers` + `/my/contracts`) es **TASK-1022**. PDF/firma/emails = EPIC-001 (TASK-1023..1026). El cuerpo ES/EN poblado del review aparece cuando exista un draft (IA flag ON o autoría — futuro).

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

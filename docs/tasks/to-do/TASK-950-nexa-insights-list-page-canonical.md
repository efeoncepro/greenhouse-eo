# TASK-950 — Nexa Insights list page canonical (`/nexa/insights`)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo-Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|delivery`
- Blocked by: `none` (TASK-947 V1 ya shipped 2026-05-28; capability + helper + detail page ya canonical)
- Branch: `develop` (operador-decision; sin branch dedicada, mismo patrón TASK-944/945/946/947)
- Legacy ID: `none`
- GitHub Issue: `none`
- Cross-ref: `TASK-947` (detail page V1 MVP shipped 2026-05-28 — esta task era V1.1 follow-up gated, promovida a V1 por bug class activo), `TASK-696` (drift fuente — el patrón de "CTA shipped sin destino" recurre acá idéntico para el CTA "Ver todos los insights del mes"), `TASK-449` (interaction layer dependiente; reusa list page como surface base de Pin/Dismiss), `TASK-946` (12 UI states framework — list page hereda mapping canonical), `ISSUE-082` (bug class UX raíz post-falso-sano).

## Summary

Crear la **list page canonical `/nexa/insights`** (sin id) que rendea los Nexa Insights del período actual con drill al detail page `/nexa/insights/[id]` (TASK-947 shipped). Cierra el bug class **404 sistemático recurrente** del CTA "Ver todos los insights del mes" del `HomeAiInsightsBento` V2 (línea 194), que apunta hardcoded a `/agency/insights` (path que NUNCA existió). Reproduce el patrón TASK-696 exactamente: CTA shipped sin destino. La solución canonical es shippear la list page proper — la opción que mi spec TASK-947 marcó como "V1.1 follow-up gated" pero que está activamente afectando UX productivo y debe promoverse a V1.

## Why This Task Exists

Detección live 2026-05-29: el operador hizo click en el botón "Ver todos los insights del mes" del Home Nexa Insights bento V2 → 404 Vuexy "Page Not Found". Confirmación con `find src/app -path '*agency/insights*' -name 'page.tsx'` → 0 hits. El path `/agency/insights` (sin id, list page) **nunca existió**.

Esto es el **patrón TASK-696 reproducido idéntico**:

1. `HomeAiInsightsBento.tsx:194` → `router.push('/agency/insights')` hardcoded.
2. La ruta destino no existe en el filesystem.
3. Click del operador → 404 determinístico.
4. La solución canonical NO es esconder el botón ni redirigir a otra ruta (parches): es shippear la list page proper.

Mi spec TASK-947 V1 MVP scope-control declaró: "Lista `/nexa/insights` (sin id) — follow-up V1.1". Promoverlo a V1 ahora porque:

- El bug class está activo en staging y va a llegar a prod en el próximo release.
- Es la única opción no-parche (esconder = parche; redirect a `/home` = pierde intent UX; redirect a otro path = más drift documental).
- Reusa 100% el helper canonical + capability + page chrome ya shipped en TASK-947.

## Architecture Alignment

Respetar:

- `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` (Delta 2026-05-28 canoniza routing top-level + dispatch prefix).
- TASK-947 hard rules en `CLAUDE.md` § "Nexa Insights detail page canonical invariants (TASK-947)" — list page hereda routing top-level, capability gate, anti-oracle pattern.
- TASK-946 framework (12 canonical UI states honest degradation) — list page mapea sus estados al framework.
- TASK-873 invariant (capability runtime grant) — list page reusa `nexa.insights.read` ya seedeada en TASK-947 Slice 1 (migration `20260529004012583`), **cero capability nueva**, cero migration nueva.
- TASK-265 microcopy hygiene — extender `GH_NEXA` para list page strings.

Reglas obligatorias (extendidas en §Hard rules):

- Routing canonical `/nexa/insights` top-level (NO `/agency/insights/*` legacy roto).
- Capability reusa `nexa.insights.read` (NO crear nueva).
- Helper canonical único reusable cross-surface (`listNexaInsightsForPeriod`).
- 4 UI states canonical explícitos del framework TASK-946 (ready / empty-positive / degraded / loading — no hay `not_found` para list page; empty es state legítimo).
- `notFound()` (NO 403) cuando capability denegada (anti-oracle TASK-872 pattern).

## Open Questions resueltas pre-execution

| Q | Resolución | Rationale |
|---|---|---|
| ¿Per-period o cross-period? | **Per-period actual default + selector mensual opcional V1.1** | V1 MVP: query del current month (alineado con TASK-943 append-only cron diario que escribe period_year+period_month). Selector mensual para drill-down histórico V1.1 follow-up. |
| ¿Helper canonical único o sibling per-domain? | **Único `listNexaInsightsForPeriod`** server-only | Mirror del patrón `readNexaInsightDrill`. Single source of truth canonical, mismo subject-aware filter, mismo honest degradation. Finance alias (`EO-FSIG-*` + `EO-FAIE-*`) extiende el helper cuando shippee, NO crea sibling. |
| ¿Empty state es 404 o state legítimo? | **State `empty-positive` (TASK-946 framework)** | Mes sin insights es señal de salud, no error. Mismo rationale que TASK-946: cero anomalías = salud operativa positiva, no "sin datos" ambiguo. |
| ¿Reusar componente card del detail page o sibling? | **Sibling `NexaInsightCard` compartido nuevo** | List page necesita card compacto (1 columna grid), detail page tiene 3 section cards expandidas. Extraer componente compartido `NexaInsightListItemCard` para list page; detail page sigue con su shell. |
| ¿Drill link desde card → detail usa signalId o enrichmentId? | **`signalId` (EO-AIS-*)** — mismo patrón canonical TASK-947 | Estable cross-period, append-only-aware TASK-943. Enrichment IDs reservados para share permalinks. |
| ¿Capability nueva o reusa? | **Reusa `nexa.insights.read`** | Misma audiencia + mismo gate del detail page (TASK-947). Ahorra migration nueva + grant nuevo + guard mecánico. |
| ¿Subject-aware filter en list? | **Sí, mismo filter del detail** | EFEONCE_ADMIN → todos; route_groups internal/finance/hr → todos; collaborator → solo donde `subject.memberId === insight.memberId`. Anti-oracle: filtrar en server, no leakear via UI. |
| ¿Selector de período? | **V1 fixed current period + V1.1 selector** | YAGNI V1. Selector + URL `?periodYear=&periodMonth=` queda V1.1 follow-up. |
| ¿Pagination / load-more? | **Limit canonical 24 cards** + "Ver más" V1.1 | Single-page con 24 cards top severity covers 99% UX. Cuando emerja necesidad real de >24, V1.1 paginate. |
| ¿Filter por severity / domain? | **No V1** | YAGNI. Toda card visible. Filtros V1.1 si emerge necesidad operativa. |

## Dependencies & Impact

### Depends on

- `TASK-947` (capability `nexa.insights.read` seedeada + helper `readNexaInsightDrill` + page chrome canonical + microcopy `GH_NEXA` extendida — todo shipped 2026-05-28).
- `TASK-946` framework de honest degradation (mapping reusable).
- `TASK-943` append-only event log + PG serving `ico_ai_signal_enrichments` (reader source).

### Unlocks

- `TASK-449` — Nexa Insights Interaction Layer (Read/Pin/Dismiss/Share desde list page).
- `TASK-944` follow-up — Finance alias `/finance/insights` (V1.1) reusa el mismo helper extendido para `EO-FSIG-*` / `EO-FAIE-*`.
- Weekly Executive Digest email deep-links (cuando emerja necesidad de "ver todos los insights del período X").
- Teams notifications (TASK-716 notification hub) — list page sirve como landing post-notification.

### Files owned

- `src/app/(dashboard)/nexa/insights/page.tsx` — NEW (server page list).
- `src/app/(dashboard)/nexa/insights/loading.tsx` — NEW (skeleton dimensionado).
- `src/app/(dashboard)/nexa/insights/error.tsx` — NEW (boundary client-side).
- `src/lib/ico-engine/ai/nexa-insight-list-reader.ts` — NEW (helper canonical sibling de `nexa-insight-drill-reader.ts`).
- `src/lib/ico-engine/ai/nexa-insight-list-reader.test.ts` — NEW (tests focal anti-regresión).
- `src/views/greenhouse/nexa/insights/NexaInsightListView.tsx` — NEW (componente shell view).
- `src/views/greenhouse/nexa/insights/NexaInsightListItemCard.tsx` — NEW (card item reusable).
- `src/views/greenhouse/home/v2/HomeAiInsightsBento.tsx` — MODIFY (flip `router.push('/agency/insights')` → `router.push('/nexa/insights')`).
- `src/config/greenhouse-nomenclature.ts` — MODIFY (extender `GH_NEXA` con ~8 entries nuevas).

### Files NOT owned (reusa as-is)

- `src/lib/ico-engine/ai/nexa-insight-drill-reader.ts` — TASK-947, reusable importable pattern.
- `src/lib/entitlements/runtime.ts` — capability ya grantada.
- `migrations/20260529004012583_task-947-nexa-insights-read-capability.sql` — capability ya seedeada.

## Current Repo State

### Already exists

- Capability `nexa.insights.read` seedeada en `capabilities_registry` + grant runtime (TASK-947 Slice 1).
- Helper `readNexaInsightDrill(id, subject)` + tipos `NexaInsightDetailSnapshot` + `NexaInsightDrillSubject` + `detectNexaIdKind` (TASK-947 Slice 1).
- Page chrome canonical `/nexa/insights/[id]/{page,loading,error,not-found}.tsx` + view `NexaInsightDetailView` (TASK-947 Slice 2).
- Microcopy `GH_NEXA` con ~30 entries del detail page reusables (TASK-947 Slice 2).
- Helper existente `readTopAiLlmEnrichments(periodYear, periodMonth, limit)` en `llm-enrichment-reader.ts` — base para el list reader, hace exactamente la query que necesitamos pero sin subject-aware filter ni discriminated union return.
- VIEW canonical `ai_signals_current` + tabla `ico_ai_signal_enrichments` (TASK-943 / TASK-914).

### Gap

- Page `src/app/(dashboard)/nexa/insights/page.tsx` (sin id) **NO existe** — el botón "Ver todos los insights del mes" del bento V2 cae al 404 Vuexy.
- Helper canonical `listNexaInsightsForPeriod(subject, period)` con discriminated union + subject-aware filter + honest degradation **NO existe**.
- Componente card reusable para list page (1 columna grid, compacto) **NO existe** — el `NexaInsightDetailView` tiene 3 section cards expandidas (no aplicable directamente).
- View shell `NexaInsightListView` **NO existe**.
- `HomeAiInsightsBento.tsx:194` apunta a `/agency/insights` (path inexistente).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — REFERENCES & ALIGNMENT (relleno por el creator)
     ═══════════════════════════════════════════════════════════ -->

## Architecture Documents

- `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` (routing canonical top-level).
- `docs/architecture/GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md` (append-only event log TASK-943).
- `docs/tasks/complete/TASK-947-nexa-insights-detail-page-canonical.md` (pattern fuente del helper canonical + page chrome + capability gate + anti-oracle).
- `docs/tasks/complete/TASK-946-nexa-insights-honest-degradation-states.md` (framework UI states).
- `CLAUDE.md` § "Nexa Insights detail page canonical invariants (TASK-947, desde 2026-05-28)" — hard rules canonical aplicables.
- `CLAUDE.md` § "TASK-935 (2026-05-25) — reconciliación sistémica + guard mecánico" + sub-sección "ROLE_CODES vigentes" (matriz capability).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — SCOPE & SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Spec + delta canonical pre-execution

- Crear este spec en `to-do/`.
- Mover a `in-progress/` + flip Lifecycle al tomar.
- Delta a TASK-947 spec en `complete/` marcando "V1.1 follow-up list page promoted a TASK-950 V1 — cerrado bug class CTA Ver todos".
- Update README + TASK_ID_REGISTRY.

### Slice 1 — Helper canonical `listNexaInsightsForPeriod`

- Crear `src/lib/ico-engine/ai/nexa-insight-list-reader.ts`:
  - `listNexaInsightsForPeriod(subject, {periodYear, periodMonth, limit?}) → NexaInsightListResult`
  - Discriminated union return: `{state: 'ready', insights: NexaInsightDetailSnapshot[], totalCount: number} | {state: 'empty-positive', periodLabel: string} | {state: 'degraded', reason: 'pg_read_failed', partial: null}`.
  - Subject-aware filter: mirror del filter de `readNexaInsightDrill` (admin/internal route_groups → todos; collaborator → self-access por `memberId`; client tenant → empty).
  - Honest degradation: PG fail → state `degraded` + `captureWithDomain('delivery', { tags: { source: 'nexa_insight_list', stage: 'pg_read' } })`.
  - Reusa tipo `NexaInsightDetailSnapshot` + helper `NexaInsightDrillSubject` (importable desde `nexa-insight-drill-reader.ts`).
  - Query base: clonar SELECT de `readTopAiLlmEnrichments` (`src/lib/ico-engine/ai/llm-enrichment-reader.ts:626`) + extender con space/member filter SQL para client/collaborator cases (canónico: filter en SQL, no post-process JS, para escalabilidad).
- Tests focal `nexa-insight-list-reader.test.ts`: subject paths (admin/internal/collaborator self/collaborator other/client) + states (ready/empty-positive/degraded) + PG failure honest degradation.

### Slice 2 — Server page list `/nexa/insights/page.tsx`

- `src/app/(dashboard)/nexa/insights/page.tsx`:
  - `requireServerSession` + `getTenantContext` + `redirect('/login')`.
  - `buildTenantEntitlementSubject` + `can(subject, 'nexa.insights.read', 'read', 'tenant')` + `notFound()` anti-oracle.
  - Resuelve período actual canonical (`getHomeCurrentPeriod()` o equivalent helper existente — `[verificar]`).
  - Invoca `listNexaInsightsForPeriod(subject, period)`.
  - Render según discriminated union → `NexaInsightListView`.
  - `export const dynamic = 'force-dynamic'`.
- `loading.tsx`: skeleton dimensionado (header + grid de 6-8 card skeletons) + `role='status'` + `aria-busy='true'` + `aria-label`.
- `error.tsx`: boundary client-side con Reintentar + console.error log (mirror `[id]/error.tsx`).

### Slice 3 — View `NexaInsightListView` + card item

- `src/views/greenhouse/nexa/insights/NexaInsightListView.tsx`:
  - Props: `result: NexaInsightListRenderableResult` (excl. nada — list states son renderables).
  - 3 render branches mapeadas a TASK-946 framework: `ready` → grid de cards | `empty-positive` → EmptyState success "Sin anomalías del período" | `degraded` → MUI Alert error + link `/admin/operations`.
  - Header: title `h4` "Nexa Insights" + caption "Período actual" + chip count + back link.
  - Grid responsive: 1 col mobile, 2 col tablet, 3 col desktop (Grid container spacing={4}).
  - Cards reusan `NexaInsightListItemCard` (NEW, compact 1-col card con severity chip + headline + drill button to `/nexa/insights/${signalId}`).
  - Microcopy via `GH_NEXA` extendida.
- `src/views/greenhouse/nexa/insights/NexaInsightListItemCard.tsx`:
  - Props: `insight: NexaInsightDetailSnapshot` + `onClick?: () => void`.
  - Layout: avatar + severity chip + headline (NexaMentionText) + footer "Ver causa raíz" → drill.
  - Hover state + accent left border severity color.
  - a11y: `<article aria-label={...}>` + keyboard navigable.

### Slice 4 — Flip Home V2 bento + audit final

- `src/views/greenhouse/home/v2/HomeAiInsightsBento.tsx:194` flip `router.push('/agency/insights')` → `router.push('/nexa/insights')`.
- Test focal anti-regresión en `HomeAiInsightsBento.test.tsx` (`[verificar]` si existe; sino crear) que assert el botón "Ver todos" no apunta a `/agency/insights`.
- Audit final con `grep -rn 'agency/insights' src` → debe estar limpio (excepto comentarios docs + tests anti-regresión).

### Slice 5 — Microcopy es-CL canonical

- Extender `GH_NEXA` en `src/config/greenhouse-nomenclature.ts` con ~8 entries nuevas:
  - `list_page_title`, `list_page_subtitle_template(periodLabel)`, `list_count_chip(n)`.
  - `list_empty_positive_title`, `list_empty_positive_body`.
  - `list_card_drill_cta`, `list_aria_card_label_template`.
  - `list_loading_aria`.
- Tono canonical es-CL tuteo + active voice + cero false friends (per `greenhouse-ux-writing`).
- Skill obligatoria invocada pre-write code: `greenhouse-ux-writing`.

### Slice 6 — Closing canonical

- `pnpm test` full + `pnpm build` production.
- Lifecycle complete + mover a `complete/`.
- Sync `README.md` + `TASK_ID_REGISTRY.md`.
- `Handoff.md` + `changelog.md`.
- Delta a `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` (list page canonizada).
- Update CLAUDE.md § "Nexa Insights detail page canonical invariants (TASK-947)" extendiendo con list page invariants (URL canonical, capability reuso, render states).

## Out of Scope V1

- Selector mensual de período (`?periodYear=&periodMonth=`). V1.1 follow-up.
- Pagination "Ver más" / cursor-based. V1.1 cuando emerja >24 cards reales.
- Filters por severity / domain / signalType. V1.1 si emerge necesidad operativa.
- Finance alias `/finance/insights` (V1.1 — extender helper con `EO-FSIG-*` + `EO-FAIE-*` dispatch).
- Time-travel `?at=YYYY-MM-DD`. V1.2.
- TASK-449 interaction layer (Read/Pin/Dismiss/Share inline). V1.3 dependiente.
- Reliability signal `nexa.insights.list_404_rate` (signal de cobertura del list page).
- E2E Playwright smoke (V1.1 follow-up canonical TASK-947 alignment).

## Detailed Spec

### Helper canonical `listNexaInsightsForPeriod`

Shape return canonical:

```ts
export type NexaInsightListResult =
  | { state: 'ready'; insights: NexaInsightDetailSnapshot[]; totalCount: number; periodLabel: string }
  | { state: 'empty-positive'; periodLabel: string }
  | { state: 'degraded'; reason: 'pg_read_failed'; partial: null }
```

Query canonical (single-statement, subject-filtered en SQL):

```sql
SELECT enrichment_id, signal_id, signal_type, metric_name, severity,
       quality_score, confidence, explanation_summary, root_cause_narrative,
       recommended_action, processed_at, space_id, member_id, project_id,
       period_year, period_month
FROM greenhouse_serving.ico_ai_signal_enrichments
WHERE period_year = $1 AND period_month = $2 AND status = 'succeeded'
  AND (
    $3::boolean = TRUE                                     -- admin: all
    OR ($4::text IS NOT NULL AND member_id = $4)           -- collaborator: self-access
  )
ORDER BY
  CASE COALESCE(severity, '')
    WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 WHEN 'info' THEN 2 ELSE 3
  END ASC,
  quality_score DESC NULLS LAST,
  processed_at DESC
LIMIT $5
```

Default `limit = 24` (configurable via param). Subject-aware filter precomputado en TS:

- `isAdminOrBroadRouteGroup = subject.tenantType === 'efeonce_internal' && (EFEONCE_ADMIN OR route_group internal/finance/hr)` → $3 = true.
- `memberIdSelf = (no admin && tiene memberId) ? subject.memberId : null` → $4.
- `tenantType === 'client'` → state `empty-positive` directo (cero query — anti-oracle, mismo pattern detail).

### Server page

`src/app/(dashboard)/nexa/insights/page.tsx`:

```tsx
export const dynamic = 'force-dynamic'

const Page = async () => {
  const tenant = await getTenantContext()
  if (!tenant) redirect('/login')

  const subject = buildTenantEntitlementSubject(tenant)
  if (!can(subject, 'nexa.insights.read', 'read', 'tenant')) notFound()

  const { year, month } = getHomeCurrentPeriod()  // [verificar] helper path
  const result = await listNexaInsightsForPeriod(subject, {
    periodYear: year,
    periodMonth: month,
    limit: 24
  })

  return <NexaInsightListView result={result} />
}
```

### View shell

Grid responsive con TASK-946 mapping:

| State | Render |
|---|---|
| `ready` (insights.length > 0) | Header + chip count + grid 1/2/3 col cards + footer |
| `empty-positive` (0 insights) | EmptyState success "Sin anomalías este período" + back link |
| `degraded` (PG fail) | MUI Alert error + link `/admin/operations` |
| Loading (in-flight) | `loading.tsx` skeleton |
| Error throws | `error.tsx` Reintentar |

### Microcopy es-CL canonical (es-CL tuteo, NO literals JSX)

Extender `GH_NEXA`:
- `list_page_title: 'Nexa Insights del mes'`.
- `list_page_subtitle_template: (periodLabel) => Observaciones del período ${periodLabel}`.
- `list_count_chip: (n) => ${n} ${n === 1 ? 'observación' : 'observaciones'}`.
- `list_empty_positive_title: 'Sin anomalías este período'`.
- `list_empty_positive_body: 'Nexa analizó las señales del mes y no encontró desviaciones. Salud operativa OK.'`.
- `list_card_drill_cta: 'Ver causa raíz'`.
- `list_aria_card_label_template: (metric, severity) => Observación: ${metric}. Severidad: ${severity}`.
- `list_loading_aria: 'Cargando observaciones del período'`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slices 1-5 deben ejecutarse en orden — cada uno depende del anterior:

1. Slice 1 (helper) bloquea Slice 2 (page imports helper).
2. Slice 2 + 3 bloquean Slice 4 (botón Home V2 solo flip cuando destino existe — anti-incident: si flippas el botón antes que la list page exista, el usuario sigue viendo 404).
3. Slice 5 (microcopy) puede solapar con Slice 3, pero MUST estar antes de commit final del Slice 3.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigación | Signal observable |
|---|---|---|---|---|
| Bug class TASK-696 reproducido si flippeo botón sin list page | UI Home V2 + 5 surfaces | Alta si orden de slices se respeta | Slice 4 (flip botón) DESPUÉS de Slice 2 (page existe) | `pnpm test` falla; smoke browser 404 |
| Subject-aware filter SQL mal escrito → leak cross-tenant | Identity + Privacy | Media | Tests focal con fixtures multi-tenant + clone del filter canonical de TASK-947 reader; revisión cruzada SQL | Sentry domain `delivery` + audit |
| PG query lento sin index | Performance | Baja | Reusa el query pattern de `readTopAiLlmEnrichments` que ya está validado en prod; mismo limit canonical | p95 latency dashboard `/admin/operations` |
| Microcopy mal copy → mensaje confuso al operador | UX | Baja | Invocar `greenhouse-ux-writing` skill antes de Slice 5 + revisión cruzada con TASK-946 microcopy patterns | N/A (manual audit) |
| Capability denegada en runtime → 404 silente para internal | Auth | Muy baja | `nexa.insights.read` ya grantada en TASK-947 a EFEONCE_ADMIN + FINANCE_ADMIN + HR_MANAGER + route_groups internal/finance/hr. Reusa el grant existente | `capability-grant-coverage.test.ts` pasa |

### Feature flags / cutover

**No flags requeridos**. Aditivo:

- List page nueva en path nuevo (`/nexa/insights`).
- Botón Home V2 flip de path inexistente a path existente — strict mejora (cero downgrade).
- Helper nuevo no toca paths productivos existentes.

Cutover: merge → auto-deploy staging Vercel → verificar URL + click "Ver todos" en `/home` → smoke verde → promote a prod en próximo release window canonical.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 (helper) | `git revert` commit | <2 min | Sí — sin consumers fuera del Slice 2+ |
| Slice 2 (page + chrome) | `git revert` commits + redeploy | <5 min | Sí — page nueva, sin migrations |
| Slice 3 (view + card) | `git revert` commits | <5 min | Sí — components nuevos |
| Slice 4 (Home V2 flip) | `git revert` commit (restaura path roto) — preferible NO rollback este sin rollback de Slices 1-3 también | <2 min | Sí pero indeseable: revertir solo Slice 4 vuelve al 404 original |
| Slice 5 (microcopy) | `git revert` commit | <2 min | Sí |

Si emerge incidente post-merge, rollback canonical = revert de la PR completa (commits Slice 1-5 son atómicos en `develop`).

### Production verification sequence

Post-deploy staging:

1. Click "Ver todos los insights del mes" en `/home` desde browser autenticado → page render verde con grid de cards.
2. Click en una card → drill al detail page `/nexa/insights/[id]` ya shipped (TASK-947).
3. Verificar 4 states con casos sintéticos: ready (insights existen), empty-positive (período sin anomalías), degraded (mock PG fail), loading (slow network).
4. Verificar a11y: keyboard nav + aria-labels + focus order con axe-core.
5. Verificar capability gate: subject sin acceso → `notFound()` (no 403).
6. Verificar audit final: `grep -rn 'agency/insights' src` → 0 hits productivos.

### Out-of-band coordination required

**Ninguna**. No requiere:

- Cambios de secret / env var (capability ya grantada).
- Migrations DB (capability ya seedeada en TASK-947 Slice 1).
- Coordinación cross-team Notion/HubSpot/Cloud Run worker (path 100% Vercel runtime + PG read).
- Feature flag rollout (aditivo + strict mejora).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — ACCEPTANCE & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Click "Ver todos los insights del mes" en Home Nexa Insights bento V2 → page `/nexa/insights` renderiza correctamente (no más 404).
- [ ] URL canonical `/nexa/insights` (top-level, sin id, NO bajo `/agency/...`).
- [ ] Capability `nexa.insights.read` gate verde end-to-end (reusa grant TASK-947, cero migration nueva).
- [ ] Helper `listNexaInsightsForPeriod` con discriminated union (3 states: ready / empty-positive / degraded) + subject-aware filter SQL + honest degradation `captureWithDomain('delivery')`.
- [ ] 4 UI states canonical mapeados explícitamente al framework TASK-946 sin colapsar a "Sin datos" ambiguo (ready + empty-positive + degraded + loading).
- [ ] `notFound()` cuando capability denegada (NO 403 — anti-oracle TASK-872 pattern).
- [ ] Cards drill al detail page `/nexa/insights/${signalId}` (NO enrichmentId — share semantics TASK-947 preserved).
- [ ] Audit final con `grep -rn 'agency/insights' src --include='*.ts' --include='*.tsx'` retorna 0 emisores productivos (solo comentarios docs + tests anti-regresión permitidos).
- [ ] Tests focal cubren los 3 states del reader + subject paths (admin/collaborator self/collaborator other/client).
- [ ] Tests anti-regresión cubren el botón "Ver todos" del Home V2 flipped a `/nexa/insights`.
- [ ] Microcopy es-CL canonical en `GH_NEXA` (~8 entries nuevas, cero literals JSX) revisada con `greenhouse-ux-writing`.
- [ ] a11y: WCAG 2.2 AA — keyboard nav + aria-labels + focus order + skeleton aria-busy.
- [ ] Doc funcional + manual de uso `[verificar si aplica V1 o V1.1]`.

## Verification

- `pnpm pg:doctor` + `pnpm migrate:status` (no migrations nuevas esperadas).
- `pnpm exec vitest run src/lib/ico-engine/ai/nexa-insight-list-reader src/views/greenhouse/nexa src/views/greenhouse/home/v2/HomeAiInsightsBento`.
- `pnpm exec tsc --noEmit --pretty false`.
- `pnpm lint`.
- `pnpm build` (Turbopack production — closing gate canonical).
- `pnpm test` full suite (closing gate canonical — invariant CLAUDE.md "Task Closing Quality Gate").
- Browser smoke autenticado en staging: click "Ver todos los insights del mes" → page renderiza + screenshot verification.
- `grep -rn '/agency/insights' src --include='*.ts' --include='*.tsx'` audit final → solo comentarios + tests permitidos.

## Closing Protocol

- [ ] Lifecycle complete + mover a `complete/`.
- [ ] Sync `README.md` + `TASK_ID_REGISTRY.md`.
- [ ] `Handoff.md` + `changelog.md`.
- [ ] Spec `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` Delta canonical aplicado.
- [ ] CLAUDE.md sección "Nexa Insights detail page canonical invariants (TASK-947)" extendida con list page invariants (URL canonical, capability reuso, render states).
- [ ] Cross-impact: TASK-947 spec en `complete/` actualizada con marcador "V1.1 follow-up list page promoted a TASK-950 V1 SHIPPED".
- [ ] Audit final `grep '/agency/insights'` limpio.

## Follow-ups (V1.1 + V1.2 + V1.3, NO scope V1)

- Selector mensual de período + URL `?periodYear=&periodMonth=`.
- Pagination cursor-based para >24 cards.
- Filters severity / domain / signalType.
- Finance alias `/finance/insights` (extender helper con `EO-FSIG-*` + `EO-FAIE-*` dispatch).
- Time-travel `?at=YYYY-MM-DD` con TASK-945 lifecycle embebido.
- TASK-449 interaction layer inline (Read/Pin/Dismiss/Share).
- Reliability signal `nexa.insights.list_404_rate`.
- E2E Playwright smoke.
- Doc funcional + manual de uso `docs/documentation/plataforma/nexa-insights-list.md` + `docs/manual-de-uso/plataforma/ver-lista-nexa-insights.md`.

## Pillars (4-pillar arch overlay)

| | |
|---|---|
| **Safety** | Capability gate canonical server-side + subject-aware filter SQL + `notFound()` anti-oracle. Reusa la matriz TASK-947 (zero capability nueva = zero superficie de ataque nueva). Blast radius si fail: 1 list page degraded a usuario único; cero mass leak (per-tenant filter en SQL). |
| **Robustness** | Discriminated union return forza al consumer manejar 3 states. Query canonical reusa pattern probado en prod (`readTopAiLlmEnrichments`). Subject filter en SQL (no post-process JS) = escalabilidad + correctness garantizado por el query plan. |
| **Resilience** | Honest degradation server-side (state `degraded` + `captureWithDomain('delivery')` cuando PG falla). PG serving `ico_ai_signal_enrichments` ya tiene index canonical (`period_year`, `period_month`, `status`). `notFound()` semántico vs 500 cuando capability denegada. |
| **Scalability** | O(log n) lookup por índice (period_year, period_month, status). `Cache-Control: private, max-age=60` HTTP cache (opcional V1.1). Limit canonical 24 cards = lineal con período. Pattern reusable cuando Finance alias o domain-scoped variants emerjan (extender helper, NO crear siblings). |

## Hard rules canonical (anti-regresión)

- **NUNCA** crear list page de Nexa Insights bajo route_group de dominio (`/agency/...`, `/finance/...`, `/people/...`). Canonical = `/nexa/insights` top-level. Mismo principio que TASK-947 detail page.
- **NUNCA** emitir URL `/agency/insights` (sin id O con id) desde loader / componente / email / Teams notification nuevo. Canonical es `/nexa/insights` (list) o `/nexa/insights/[id]` (detail).
- **NUNCA** crear capability nueva para list page. Reusa `nexa.insights.read` (TASK-947 Slice 1). Si la list page necesita scope distinto, **rediseñar el reader** para que el subject-aware filter lo cubra — NO fragmentar la capability.
- **NUNCA** filtrar cross-tenant en post-process JS. Filter SQL en `WHERE space_id IN (...)` / `WHERE member_id = $1`. Anti-leak garantizado por el query plan.
- **NUNCA** retornar `403` desde la list page cuando capability denegada. `notFound()` siempre (anti-oracle).
- **NUNCA** read directo de `ico_engine.ai_signals` raw BQ. Lee de `greenhouse_serving.ico_ai_signal_enrichments` PG. VIEW canonical TASK-943.
- **NUNCA** colapsar UI state `empty-positive` (0 insights = salud) con `degraded` (PG fail = honest alert). Distinto rendering, distinto mensaje, distinto signal upstream.
- **NUNCA** invocar `Sentry.captureException` directo. Usar `captureWithDomain(err, 'delivery', { tags: { source: 'nexa_insight_list', stage: 'pg_read' } })`.
- **NUNCA** flipear el botón "Ver todos" del Home V2 ANTES que la list page exista. Anti-incident: reproduce el bug class TASK-696 si rollback parcial.
- **NUNCA** romper el dispatch al detail page desde card click. Card → `/nexa/insights/${signalId}` (signal-anchored, mismo pattern canonical TASK-947).
- **SIEMPRE** que el botón "Ver más insights" / "Lista completa" emerja en otra surface, apuntar a `/nexa/insights` (canonical). Cero composición ad-hoc.
- **SIEMPRE** que email / Teams notification incluya link a "lista del período X", usar `/nexa/insights?periodYear=&periodMonth=` (cuando V1.1 ship selector); por ahora solo `/nexa/insights` (current period).
- **SIEMPRE** que emerja un nuevo enrichment domain (Finance, futuras), extender el helper canonical con dispatch — NO crear list page sibling per-domain. Single canonical entrypoint.

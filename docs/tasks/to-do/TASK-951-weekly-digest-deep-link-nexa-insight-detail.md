# TASK-951 — Weekly Executive Digest deep-link a Nexa Insight detail canonical

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `optional`
- Status real: `Backlog UX enhancement`
- Rank: `TBD`
- Domain: `ui|delivery|emails`
- Blocked by: `none` (TASK-947 detail page V1 shipped 2026-05-28 + TASK-950 list page V1 shipped 2026-05-29 — ambos prerequisitos satisfechos)
- Branch: `develop` (operador-decision; sin branch dedicada, mismo patrón TASK-944/945/946/947/950)
- Legacy ID: `none`
- GitHub Issue: `none`
- Cross-ref: `TASK-947` (detail page canonical V1 MVP — habilita deep-link a `/nexa/insights/<signalId>`), `TASK-950` (list page canonical V1 — fortalece la cadena de surfaces Nexa), `TASK-594` (lineage previo Weekly Digest — definió decisión "actionUrl = Space" cuando detail page no existía aún), `TASK-449` (interaction layer V1.3 — el deep-link al detail es prerequisito UX para Read/Pin/Dismiss desde el email).

## Summary

Evolucionar el **Weekly Executive Digest email** (`WeeklyExecutiveDigestEmail` + `build-weekly-digest.ts`) para que el CTA "Abrir Space" de cada insight deep-linkee al **detail page canonical del insight** (`/nexa/insights/<signalId>`) en lugar del Space (`/agency/spaces/<space_id>`). Da más contexto inmediato al ejecutivo: causa raíz + acción sugerida + narrativa enriquecida con mentions vs el dashboard amplio del Space que requiere navegación adicional.

## Why This Task Exists

**Cuando se diseñó el Weekly Digest (TASK-594 lineage)**, el detail page de Nexa Insights no existía — la única surface canonical para "ver más sobre este insight" era el Space afectado. El CTA "Abrir Space" → `/agency/spaces/<space_id>` era la mejor opción disponible.

**Ahora (post 2026-05-29)**:

- **TASK-947 shipped `/nexa/insights/<id>` detail page** con narrativa completa + dispatch prefix canonical + capability dedicada + 4 render branches honest degradation.
- **TASK-950 shipped `/nexa/insights` list page** con grid de cards severity-color-coded + drill canonical a `<signalId>`.
- El builder del digest ya tiene `signal_id` disponible en `PresentableEnrichment.signal_id` (verificado en `src/lib/ico-engine/ai/narrative-presentation.ts` línea 3 del shape).
- `buildNexaInsightDrillHref(id)` ya está extraído a módulo puro client-safe (`src/lib/ico-engine/ai/nexa-insight-href.ts`, TASK-950 Slice 3 hotfix) — el email server pipeline lo puede consumir sin pull de `'server-only'` transitivo.

**Decisión arquitectónica** (mirror del flip drillHref TASK-947 Slice 3 sobre Home V2):

| Antes | Ahora canonical |
|---|---|
| `actionUrl: buildSpaceHref(row.space_id)` → `/agency/spaces/<id>` | `actionUrl: buildNexaInsightDrillHref(row.signal_id)` → `/nexa/insights/<signalId>` |
| `actionLabel: 'Abrir Space'` | `actionLabel: 'Ver causa raíz'` (canonical TASK-947 `GH_NEXA.list_card_drill_cta`) |

El header del **section por Space** (`WeeklyExecutiveDigestSpaceSection.href` en línea 29 del email component) **PRESERVA** el link al Space — el ejecutivo sigue pudiendo abrir el dashboard del Space desde el grouping header. Solo el CTA per-insight cambia.

## Goal

UX outcome canonical: el ejecutivo recibe el Weekly Digest, hace click en "Ver causa raíz" de cualquier insight, y aterriza directamente en `/nexa/insights/<signalId>` (detail page con narrativa + acción + metadata + dispatch prefix correcto) — cero clicks adicionales para entender el problema.

Métricas observables (V1.1 follow-up gated): click-through rate per insight CTA (deep-link al detail vs heredado al Space) — si el deep-link convierte mejor, validar quantitative.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — DESIGN & DEPENDENCIES
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- **`GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md`** — Delta TASK-947 + TASK-950 canonizó routing top-level `/nexa/insights/<id>` y `/nexa/insights` como surfaces canonical cross-domain. Email pipeline aún apunta a surface legacy `/agency/spaces/<id>` por decisión histórica anterior (cuando detail page no existía). Esta task cierra el gap.
- **`GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`** — Nexa Insights consumed by emails consume el **detail page canonical** post-TASK-947. Boundary: emails apuntan al display canonical de Nexa (Greenhouse-owned), nunca al display custom per-canal.
- **`GREENHOUSE_EVENT_CATALOG_V1.md`** — sin cambios (no nuevo evento outbox; el digest builder consume `selectPresentableEnrichments` ya existente).

## Normative Docs

- `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` (boundary canonical detail page)
- `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` (Nexa surfaces canonical)
- `docs/tasks/complete/TASK-947-nexa-insights-detail-page-canonical.md` (helper `buildNexaInsightDrillHref` + dispatch prefix `EO-AIS-*` signal-anchored)
- `docs/tasks/complete/TASK-950-nexa-insights-list-page-canonical.md` (extract pure helper a `nexa-insight-href.ts` client-safe)

## Dependencies

**Depende de**:

- TASK-947 V1 shipped (`/nexa/insights/<id>` detail page existe). ✅ Done 2026-05-28.
- TASK-950 V1 shipped (helper `buildNexaInsightDrillHref` extraído a módulo puro). ✅ Done 2026-05-29.
- `PresentableEnrichment.signal_id` disponible en payload del builder (`src/lib/ico-engine/ai/narrative-presentation.ts`). ✅ Verified 2026-05-29.

**Impacta a**:

- `WeeklyExecutiveDigestEmail.tsx` snapshot test (`EmailTemplateBaseline.test.tsx.snap`) — snapshot canonical refresh esperado (cambios `actionUrl` + `actionLabel`).
- TASK-449 interaction layer V1.3 — cuando shippe, el deep-link del email es el entry point natural a Read/Pin/Dismiss desde el detail page.
- Teams notifications (TASK-716 notification hub) — patrón canonical "deep-link to detail" se replica a Teams cuando emerja necesidad.

**Archivos owned**:

- `src/lib/nexa/digest/build-weekly-digest.ts` — único callsite a refactorizar.
- `src/lib/nexa/digest/build-weekly-digest.test.ts` — actualizar test assertions del `actionUrl` + `actionLabel`.
- `src/emails/__snapshots__/EmailTemplateBaseline.test.tsx.snap` — snapshot refresh canonical.

## Current Repo State

**Ya existe**:

- `src/lib/nexa/digest/build-weekly-digest.ts` con `buildSpaceHref` interno (línea 98) + `actionUrl: buildSpaceHref(row.space_id, portalUrl)` en línea 261. **Esta es la línea a refactorizar.**
- `src/lib/ico-engine/ai/nexa-insight-href.ts` exportando `buildNexaInsightDrillHref(id)` pure module client-safe (TASK-950 Slice 3 hotfix). Reusable por el email server pipeline sin transitivo `'server-only'`.
- `PresentableEnrichment.signal_id` populado canónicamente (verified `src/lib/ico-engine/ai/narrative-presentation.ts`).
- `GH_NEXA.list_card_drill_cta = 'Ver causa raíz'` canonical microcopy (TASK-950 Slice 3).

**Gap**:

- El builder del digest tiene `signal_id` en mano pero no lo consume para el CTA `actionUrl`. El email apunta a una surface canonical previa (Space) en lugar de la nueva canonical (`/nexa/insights/<signalId>`).
- `actionLabel: 'Abrir Space'` está hardcoded en línea 260 (literal JSX → debe migrar a `GH_NEXA.list_card_drill_cta` o token canonical email-specific).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — SCOPE & EXECUTION
     ═══════════════════════════════════════════════════════════ -->

## Scope (Slices)

### Slice 1 — Helper integration + canonical replacement

- Importar `buildNexaInsightDrillHref` desde `@/lib/ico-engine/ai/nexa-insight-href` en `build-weekly-digest.ts`.
- Refactor línea 261:
  ```diff
  - actionUrl: buildSpaceHref(row.space_id, portalUrl)
  + actionUrl: buildNexaInsightDrillUrl(row.signal_id, portalUrl)
  ```
- Crear helper local `buildNexaInsightDrillUrl(signalId, portalUrl)` que componga `${portalUrl}${buildNexaInsightDrillHref(signalId)}` (el helper canonical devuelve path-only `/nexa/insights/<id>`; el email necesita URL absoluto con `portalUrl` prefix).
- **Backward compat**: si `row.signal_id` está vacío/null (legacy data Mar/Abr/May pre-TASK-943 backfill), fallback al `buildSpaceHref(row.space_id, portalUrl)` para no romper el email — degradación honesta.

### Slice 2 — Microcopy canonical (cero literals JSX)

- Migrar `actionLabel: 'Abrir Space'` → token canonical. Opciones:
  - **A**: reusar `GH_NEXA.list_card_drill_cta = 'Ver causa raíz'` (consistencia cross-surface con list page TASK-950 y Home V2 bento TASK-947).
  - **B**: agregar token email-specific `GH_NEXA.weekly_digest_insight_cta` (más explícito sobre context).
- **Decisión canonical pre-execution**: opción **A** (`'Ver causa raíz'`) — el CTA semánticamente es el mismo en email/list/bento (drill al detail), reusar el token único previene drift. Si emerge necesidad de copy email-specific (longer CTAs, locale variants), V1.1 separable.

### Slice 3 — Tests anti-regresión + snapshot refresh

- Actualizar `build-weekly-digest.test.ts`:
  - Cambiar assertions de `actionUrl` que esperaban `/agency/spaces/<id>` → ahora esperar `/nexa/insights/<signalId>`.
  - Cambiar assertions de `actionLabel: 'Abrir Space'` → `actionLabel: 'Ver causa raíz'`.
  - Agregar test anti-regresión: cuando `signal_id` está vacío/null, fallback canonical preserva `/agency/spaces/<space_id>` (backward compat).
  - Agregar test anti-regresión: el header del space section (`WeeklyExecutiveDigestSpaceSection.href`) PRESERVA link al Space (no se afecta).
- Refresh snapshot `src/emails/__snapshots__/EmailTemplateBaseline.test.tsx.snap` con `pnpm test -u` focal solo al digest baseline test.

### Slice 4 — Visual review del email rendered (audit canonical)

- Generar email preview con render canonical:
  - Buscar endpoint canonical `/api/admin/emails/*` o helper de preview HTML existente.
  - Si no existe endpoint, render directo via Vitest snapshot HTML output + abrir en browser.
  - Validar visualmente: CTA "Ver causa raíz" apunta correctamente al detail page; header del space section sigue apuntando al Space; mentions del narrative preservan sus URLs canonical.
- 3-skill audit liviano (greenhouse-ux-writing + email-ux pattern): consistencia con surfaces in-app + tone es-CL active voice.

### Slice 5 — Closing canonical

- `pnpm test` full suite gate (esperar +1-2 tests focales).
- `pnpm build` Turbopack gate.
- Lifecycle move `to-do/` → `complete/`.
- Update `docs/tasks/README.md` tracker + `TASK_ID_REGISTRY.md`.
- Update `Handoff.md` + `changelog.md`.
- Sin CLAUDE.md changes (no nuevos invariants — patrón "deep-link a Nexa detail" ya canonizado vía TASK-947 + TASK-950).

## Out of Scope

- **Cambiar el header del space section** (`WeeklyExecutiveDigestSpaceSection.href` línea 29): preserva link al Space (intencional — el ejecutivo aún puede abrir el dashboard del Space para contexto amplio).
- **A/B test métrica click-through rate** (deep-link vs heredado): queda V1.1 follow-up cuando emerja signal `nexa.weekly_digest.deep_link_ctr`.
- **Microcopy email-specific** (`GH_NEXA.weekly_digest_*` tokens): YAGNI hasta que emerja necesidad de copy distinto al canonical cross-surface.
- **Teams notifications deep-links**: patrón canonical "deep-link to detail" se replicará a TASK-716 notification hub cuando emerja necesidad concreta — task separada.
- **Mentions del narrative** (líneas 101-108 builders `buildMentionHref`): siguen apuntando a `/agency/spaces/<id>` y `/people/<id>` (las mentions son contexto del cuerpo del insight, no el CTA principal — preservación canonical).
- **Internationalization del CTA**: V1 es-CL only (mismo scope que TASK-950 list page).

## Detailed Spec

### Architecture decision: where does `buildNexaInsightDrillUrl` live?

Decisión canonical pre-execution: **helper local privado** en `build-weekly-digest.ts`, NO en `nexa-insight-href.ts`.

Razón: el helper canonical `buildNexaInsightDrillHref(id)` retorna path-only (`/nexa/insights/<id>`) porque es client-safe y se usa en `router.push()` / Next `<Link>` / templates JSX donde el origin se infiere del browser. El email server pipeline necesita **URL absoluto** con `portalUrl` prefix porque los clients de email NO tienen origin context (renderean HTML estático).

Pattern canonical:

```typescript
// build-weekly-digest.ts (server-side, email pipeline)
import { buildNexaInsightDrillHref } from '@/lib/ico-engine/ai/nexa-insight-href'

const buildNexaInsightDrillUrl = (signalId: string, portalUrl: string): string =>
  `${portalUrl.replace(/\/$/, '')}${buildNexaInsightDrillHref(signalId)}`
```

Single source of truth del shape del path = `buildNexaInsightDrillHref` (TASK-950). El `buildNexaInsightDrillUrl` es la concern de "absolutizar para email" — local al digest builder.

### Backward compat fallback (degradación honesta)

```typescript
actionUrl: row.signal_id
  ? buildNexaInsightDrillUrl(row.signal_id, portalUrl)
  : buildSpaceHref(row.space_id, portalUrl)
```

Casos de fallback:
- Legacy enrichments pre-TASK-943 backfill (Mar/Abr/May 2026) que pueden tener `signal_id` vacío/null en algunos rows.
- Defensive degradation si `selectPresentableEnrichments` emite un row con shape inesperado.

Cuando fallback activa, el email sigue funcional con CTA "Ver causa raíz" → Space (mejor que romper el render del insight entero).

### Snapshot refresh canonical

El snapshot `src/emails/__snapshots__/EmailTemplateBaseline.test.tsx.snap` contiene HTML rendered del email completo, incluyendo los `<a href="...">` de cada CTA. Refresh esperado:

```diff
- <a href="https://greenhouse.efeoncepro.com/agency/spaces/spc-sky">Abrir Space</a>
+ <a href="https://greenhouse.efeoncepro.com/nexa/insights/EO-AIS-deadbeefcafe">Ver causa raíz</a>
```

Refresh canonical via `pnpm test src/emails/EmailTemplateBaseline.test.tsx -u` focal — NO `pnpm test -u` global (puede refrescar snapshots no relacionados con drift).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 (helper integration) **debe shippearse antes** que cualquier consumer downstream se beneficie. NO hay flippeo a feature flag — el cambio es drop-in replacement con fallback canonical para legacy data.

### Risk matrix

| Riesgo | Sistema afectado | Prob. | Mitigación | Signal |
|---|---|---|---|---|
| `signal_id` vacío rompe el email | Weekly Digest delivery | Baja (backfill TASK-943 cubrió histórico) | Fallback canonical a `buildSpaceHref(row.space_id, portalUrl)` cuando `!row.signal_id` | Test anti-regresión cubre el caso |
| Snapshot test rompe sin refresh | CI gate `pnpm test` | Alta (esperada) | Refresh canonical con `pnpm test -u` focal al baseline | N/A — refresh es parte del slice |
| Deep-link al detail no funciona para algún subject (capability gate) | UX ejecutivo | Baja (el detail page tiene `notFound()` anti-oracle, no 403) | Si subject sin capability, `/nexa/insights/<id>` → notFound page con "Volver a Home" CTA — degradación honesta | Sentry `domain='delivery', source='nexa_insight_detail'` |
| Email apunta a detail page degradado (PG fail) | UX ejecutivo | Muy baja | El detail page tiene state `degraded` con banner + escalation a `/admin/operations` — UX ya canonical TASK-947 | Reliability signal del detail page reader cubre |

### Feature flags / cutover

- **NO flag necesario V1**: drop-in replacement con fallback canonical. El cambio NO requiere coordination con ops ni con HR.
- Si emerge necesidad de A/B test (V1.1): flag `WEEKLY_DIGEST_NEXA_DEEP_LINK_ENABLED` default OFF + shadow mode 7d antes de flip.

### Rollback plan per slice

| Slice | Tiempo rollback | Reversible? |
|---|---|---|
| 1 (helper integration) | <5 min via `git revert <SHA>` | ✅ Sí — single file change |
| 2 (microcopy canonical) | <5 min via `git revert <SHA>` | ✅ Sí — single token reference |
| 3 (tests + snapshot) | <5 min revert + snapshot regenera con código rollback | ✅ Sí |
| 4 (visual review) | N/A (audit step, no code change) | N/A |
| 5 (closing) | <10 min revert lifecycle + tracker changes | ✅ Sí (doc-only) |

### Production verification sequence

- Email no se dispara on-demand — el digest se envía semanal vía cron Cloud Scheduler. **Verificación canonical**: dry-run del builder via test snapshot + admin endpoint preview `/api/admin/emails/weekly-digest/preview` (si existe; investigar en Slice 4).
- Próximo dispatch real del digest semanal post-merge confirma E2E funcional.
- Sentry domain `delivery` cubre cualquier breakage del builder.

### Out-of-band coordination required

- **Ninguna**: la task es código local sin impacto en SCIM/SSO/Entra/Graph/payroll/finance/migrations. Doc-only commit a tracker + spec markdown ANTES de Slice 1 (per Greenhouse task lifecycle protocol).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — ACCEPTANCE & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `build-weekly-digest.ts` línea 261 emite `actionUrl` apuntando a `${portalUrl}/nexa/insights/<signal_id>` para insights con `signal_id` poblado.
- [ ] Fallback canonical a `buildSpaceHref(row.space_id, portalUrl)` cuando `row.signal_id` está vacío/null (backward compat legacy).
- [ ] `actionLabel` migra de literal `'Abrir Space'` → token canonical `GH_NEXA.list_card_drill_cta` (`'Ver causa raíz'`).
- [ ] Header del space section (`WeeklyExecutiveDigestSpaceSection.href`) PRESERVA link al Space (no se afecta — invariante).
- [ ] `build-weekly-digest.test.ts` cubre 3 casos: (a) `signal_id` populado → deep-link al detail; (b) `signal_id` vacío → fallback al Space; (c) header del space preservado.
- [ ] `EmailTemplateBaseline.test.tsx.snap` refreshed con nuevo HTML (`<a href="/nexa/insights/<id>">Ver causa raíz</a>`).
- [ ] Visual review del email (preview o snapshot HTML) confirma render canonical sin drift.
- [ ] `pnpm test` full suite verde (+1-2 tests focales esperados).
- [ ] `pnpm build` Turbopack production verde.
- [ ] `tsc --noEmit` ✓ + `pnpm lint` focal ✓.
- [ ] Lifecycle move `to-do/` → `complete/` + tracker + Handoff + changelog.

## Verification

- **Unit tests focales**: `pnpm test src/lib/nexa/digest/ src/emails/`
- **Full suite gate canonical**: `pnpm test` (5500/0 baseline + esperados +1-2)
- **Build production gate canonical**: `pnpm build`
- **Type check**: `pnpm exec tsc --noEmit`
- **Lint focal**: `pnpm exec eslint src/lib/nexa/digest/build-weekly-digest.ts src/emails/WeeklyExecutiveDigestEmail.tsx`
- **Visual review**: render del email vía preview endpoint o snapshot HTML output → confirmar CTA apunta a `/nexa/insights/<id>` + header del space preserva link al Space.
- **E2E post-deploy** (next weekly dispatch real): verificar Sentry `domain='delivery'` sin errores del digest pipeline.

## Closing Protocol

1. Move `docs/tasks/to-do/TASK-951-*.md` → `docs/tasks/complete/`.
2. Cambiar `Lifecycle: to-do` → `Lifecycle: complete` en frontmatter.
3. Update `docs/tasks/README.md` (mover entry de "to-do" a "complete" con resumen V1 shipped + commit SHAs).
4. Update `docs/tasks/TASK_ID_REGISTRY.md` (cambiar `to-do` → `complete` en row de TASK-951).
5. Update `Handoff.md` con nueva entrada cronológica top.
6. Update `changelog.md` con entry comprehensivo bajo `## 2026-XX-XX` correspondiente.
7. Cross-impact scan: `grep -rn "agency/spaces" src/lib/nexa/ src/emails/` post-merge → verificar fallback canonical es el único callsite remanente del path Space (esperado).
8. Sin CLAUDE.md changes (patrón ya canonizado).

## Follow-ups (V1.1+ separable)

- **Reliability signal `nexa.weekly_digest.deep_link_ctr`** — métrica click-through rate del CTA deep-link vs heredado (requiere tracking pixels o Sentry custom event). Validar quantitative que el deep-link convierte mejor.
- **Teams notifications deep-links** (TASK-716 notification hub) — replicar el pattern canonical "deep-link to detail" al canal Teams cuando emerja necesidad concreta.
- **Microcopy email-specific** (`GH_NEXA.weekly_digest_*` tokens) — si emerge necesidad de copy distinto al canonical cross-surface (longer CTAs, locale variants, A/B test text).
- **Mentions deep-link** (líneas 101-108 builders `buildMentionHref`) — evaluar si mention de un member o project del narrative debería deep-linkear al detail page del insight relacionado vs `/people/<id>` / `/projects/<id>` actual.
- **Internationalization del CTA** — multi-locale support (`en-US`, `pt-BR`) cuando Globe clients lo demanden.

## Open Questions

- **¿Existe endpoint admin de preview del Weekly Digest?** Investigar en Slice 4 `/api/admin/emails/weekly-digest/preview` o equivalente. Si no existe, render via Vitest snapshot HTML output suficiente para V1.
- **¿Algún subject puede recibir el email pero NO tener capability `nexa.insights.read`?** Si sí, el deep-link a `/nexa/insights/<id>` retornará `notFound()` (anti-oracle TASK-872) — UX honesta pero confunde si el ejecutivo esperaba ver el insight. Investigar en Slice 1 el subject de los digest recipients (probablemente todos tienen capability porque son ejecutivos internal). Si emerge mismatch, agregar guard pre-link en builder.

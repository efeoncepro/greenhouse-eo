# TASK-435 — Nexa Actionable Insights (CTA Contract)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none` (puede paralelizarse con TASK-432, TASK-436)
- Branch: `task/TASK-435-nexa-actionable-insights-cta-contract`
- Legacy ID: —
- GitHub Issue: —
- Parent arch doc: `docs/architecture/GREENHOUSE_NEXA_EXPANSION_V1.md` (Eje 3)

## Summary

Extiende el contrato de enrichments Nexa con un campo estructurado `recommendedActionCta` que convierte cada insight en un deep-link accionable o un diálogo pre-filled. Cambia el paradigma actual (leer → navegar → buscar contexto → actuar) por (leer → un click → actuar con contexto). Cruza horizontalmente todos los engines Nexa existentes y futuros.

## Why This Task Exists

Hoy los insights describen qué pasa y sugieren qué hacer — en texto. El usuario debe luego:

1. Entender qué surface del portal atacar.
2. Navegar hasta esa surface.
3. Filtrar por la entidad mencionada.
4. Reconstruir mentalmente el contexto del insight.

Cada uno de esos pasos es fricción. Un CTA estructurado colapsa los 4 pasos en un click. El valor multiplicado afecta a TODOS los engines Nexa existentes y los que vengan — por eso es capa horizontal, no un surface más.

## Goal

- Schema `recommendedActionCta` en tablas de enrichments (Finance, ICO, y futuros Payroll/Staff Aug).
- LLM worker deriva el CTA desde metadata estructurada del signal, no desde texto libre.
- `NexaInsightsBlock` renderiza botón CTA cuando existe.
- Weekly digest email renderiza `<a>` CTA con estilo consistente.
- Telemetría: click tracking para medir eficacia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_NEXA_EXPANSION_V1.md` — contrato `recommendedActionCta` (Eje 3).
- `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` — principio advisory-only.

Reglas obligatorias:

- Las CTAs son **deep-links o diálogos pre-filled read-only**. NO ejecutan mutaciones automáticas (advisory-only sigue vigente).
- El LLM NO inventa routes — el builder del CTA es determinístico desde `metric_id + scope + severity → template`. El LLM solo produce la narrativa.
- CTA siempre opcional. Insights sin CTA renderizan como hoy sin regresiones.
- El CTA debe respetar entitlements: si el usuario no tiene acceso a la surface destino, el botón se muestra disabled con tooltip explicativo.

## Normative Docs

- `src/components/greenhouse/nexa/NexaInsightsBlock.tsx`
- `src/emails/WeeklyExecutiveDigestEmail.tsx`
- `src/lib/finance/ai/llm-enrichment-worker.ts`
- `src/lib/ico-engine/ai/llm-enrichment-worker.ts`

## Dependencies & Impact

### Depends on

- Ninguna — entregable transversal.

### Blocks / Impacts

- **Todos los engines Nexa existentes y futuros** se benefician retroactivamente.
- TASK-432 (Client Portal) puede aprovechar CTAs scoped (p.ej. "Descargar reporte" para cliente).
- TASK-436 (push crítico) incluye CTAs en el payload Slack/Teams.

### Files owned

- Migración PG: columnas en `finance_ai_signal_enrichments`, `ico_ai_signal_enrichments`, y (cuando existan) `payroll_ai_signal_enrichments`, `staff_aug_ai_signal_enrichments`
- `src/lib/nexa/cta/` (nuevo) — builder determinístico, templates por metric
- `src/lib/finance/ai/llm-enrichment-worker.ts` (modificación)
- `src/lib/ico-engine/ai/llm-enrichment-worker.ts` (modificación)
- `src/components/greenhouse/nexa/NexaInsightsBlock.tsx` (modificación)
- `src/components/greenhouse/nexa/NexaActionButton.tsx` (nuevo)
- `src/emails/WeeklyExecutiveDigestEmail.tsx` (modificación)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema

- Migración PG agregando a enrichment tables:
  - `cta_label TEXT NULL`
  - `cta_surface TEXT NULL` (enum-like: `capacity`, `payroll`, `finance`, etc. — validar con CHECK)
  - `cta_route TEXT NULL`
  - `cta_prefill JSONB NULL`
- Regenerar tipos.

### Slice 2 — CTA builder determinístico

- `src/lib/nexa/cta/` con:
  - `buildCtaForSignal(signal, enrichment): RecommendedActionCta | null`
  - Templates por `metric_id × severity` que producen `{ label, surface, route, prefill }`.
- Ejemplos de templates iniciales (a validar en planning):
  - `overtime_hours_pct × critical` → `{ label: "Revisar en payroll", surface: "payroll", route: "/admin/hr/payroll?period=YYYY-MM&member=MEMBER_ID" }`
  - `net_margin_pct × warning` → `{ label: "Ver economics del cliente", surface: "finance", route: "/agency/spaces/SPACE_ID/economics" }`
  - `otd_pct × critical` → `{ label: "Abrir delivery", surface: "delivery", route: "/agency/spaces/SPACE_ID/delivery" }`
- El builder no inventa surfaces — si no hay template para esa combinación, devuelve `null`.

### Slice 3 — Worker integration

- Finance worker y ICO worker invocan `buildCtaForSignal` después de la narrativa.
- Escriben las columnas CTA en la misma tupla de enrichment.

### Slice 4 — UI component

- `NexaActionButton.tsx` — botón MUI consistente con el resto del portal.
- Verifica entitlements antes de habilitar:
  - Si el usuario tiene acceso a `cta_surface` → habilitado.
  - Si no → disabled con tooltip "No tienes acceso a esta superficie".
- Click → navega a `cta_route` con `cta_prefill` como query string o state.

### Slice 5 — NexaInsightsBlock integration

- Renderiza `NexaActionButton` al pie del card, al lado del `recommendedAction` texto.
- Si no hay CTA, sin cambios visuales.

### Slice 6 — Email digest integration

- `WeeklyExecutiveDigestEmail.tsx` renderiza `<a>` con estilo inline consistente cuando existe CTA.
- URL usa el dominio productivo (no localhost).

### Slice 7 — Click telemetry

- Endpoint: `POST /api/nexa/cta/click` con `{ enrichment_id, surface, route, timestamp }`.
- Guarda en `greenhouse_ai.nexa_cta_clicks` para medir eficacia.
- Métrica: % de insights con CTA clicked / total insights mostrados con CTA.

## Out of Scope

- CTAs que ejecuten mutaciones (crear, asignar, reasignar). Advisory-only sigue vigente.
- CTA que depende de LLM para construir la route. El builder es determinístico.
- A/B testing de templates de CTA — follow-on si aparece necesidad real.
- CTAs en chat Nexa (solo en insights block por ahora).

## Acceptance Criteria

- [ ] Migración aplicada; tipos regenerados.
- [ ] Builder cubre al menos 6 combinaciones `metric × severity` documentadas.
- [ ] Workers Finance + ICO emiten CTAs en nuevos enrichments.
- [ ] `NexaInsightsBlock` renderiza botón sin romper layout actual; enrichments viejos sin CTA siguen sin regresiones.
- [ ] Email digest renderiza `<a>` CTA en cliente de correo mainstream (Gmail, Outlook, Apple Mail).
- [ ] Endpoint de click tracking operativo; tabla se llena.
- [ ] Click tracking NO incluye PII.
- [ ] `pnpm build && pnpm lint && npx tsc --noEmit && pnpm test` pasan.
- [ ] Validación en staging con N=5 insights generados en los últimos días.

## Verification

- Tests unitarios del builder (inputs → outputs esperados).
- Tests de integración: signal detectado → enrichment con CTA populated.
- Tests del endpoint de tracking.
- Verificación visual del email en cliente real.

## Closing Protocol

- [ ] Actualizar `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` con el contrato CTA.
- [ ] Actualizar `GREENHOUSE_NEXA_EXPANSION_V1.md` con estado Eje 3.
- [ ] Notificar a los owners de engines futuros (TASK-433, TASK-434) del contrato disponible.
- [ ] Registrar en `Handoff.md` y `changelog.md`.

## Open Questions

- ¿El telemetry endpoint registra también "view" (mostrado al usuario) además de "click"? Necesario para calcular CTR. Recomendación: **sí**, via intersection observer en el componente.
- ¿Cómo se manejan routes que dependen de query params derivados de mentions del enrichment (space_id, member_id)? Template debe poder interpolar del signal data.
- ¿Los CTAs se emiten también a enrichments ya existentes (backfill) o solo adelante? Recomendación: solo adelante por costo LLM y complejidad; backfill manual si un template resulta muy valioso retroactivamente.

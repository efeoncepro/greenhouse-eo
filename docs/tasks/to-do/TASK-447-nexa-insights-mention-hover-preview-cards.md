# TASK-447 — Nexa Insights Mention Hover Preview Cards

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `TASK-442`
- Branch: `task/TASK-447-nexa-insights-mention-hover-preview-cards`
- Legacy ID: `none`
- GitHub Issue: `[optional]`

## Summary

Hover sobre un chip de mención en Nexa Insights (y superficies consumers) despliega un preview card con KPIs mini de la entidad (Space: FTR/margin/BU; Member: rol/workload/activity; Client: revenue/tenure; Project: health/progress). El operador obtiene contexto sin abandonar el feed de insights, acelerando el flujo de análisis. Implementado como strategy-per-type consumida desde el registry canónico de TASK-442.

## Why This Task Exists

Hoy un chip es binario: click navega out-of-context, no hay peek. En un feed de insights el operador necesita corroborar rápido "¿este Space está crítico por el KPI del insight o en general?" antes de decidir si entrar al 360. Sin preview card, cada investigación cuesta un round-trip completo.

Enterprise tools (Linear, Notion, GitHub) estandarizaron el hover card — es expectativa base para cualquier mention. Nexa se queda corto.

## Goal

- Hover (≥400ms) sobre chip → popover con KPIs específicos por tipo
- Preview consume API `/api/nexa/mentions/preview/:type/:id` caching-friendly
- Cada tipo del registry (TASK-442) declara su `previewLoader` y `previewLayout`
- Keyboard: foco + Enter abre preview, Esc cierra
- Mobile: tap largo abre preview en sheet bottom
- Accesibilidad completa (ARIA popover pattern)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

Reglas obligatorias:

- Preview es read-only y respeta RBAC del usuario
- Caching agresivo: 60s SWR + dedupe por `type:id`
- No romper performance: cada preview ≤ 300ms p95
- Tenant isolation garantizada
- Fallback: preview falla / entidad eliminada → chip sigue funcional con tooltip simple (no overlay roto)

## Normative Docs

- `docs/tasks/to-do/TASK-442-nexa-mentions-registry-entity-expansion.md`
- `docs/tasks/to-do/TASK-441-nexa-mentions-resolver-allowlist-sanitization.md`

## Dependencies & Impact

### Depends on

- TASK-442: registry expandido declara `previewLoader` y `previewLayout` por tipo
- TASK-441: resolver garantiza que solo IDs válidos disparan preview
- `NexaMentionChip` extraído en TASK-445 (si existe; si no, inline en este slice)

### Blocks / Impacts

- TASK-443 (chat): el chip es reutilizable, el hover card aparece automáticamente también en chat
- TASK-432 (client portal Nexa pulse): hereda el patrón

### Files owned

- `src/components/greenhouse/NexaMentionPreviewCard.tsx` — nuevo
- `src/components/greenhouse/NexaMentionChip.tsx` — modificar (usar Popover MUI)
- `src/app/api/nexa/mentions/preview/[type]/[id]/route.ts` — nuevo
- `src/lib/nexa/mentions/preview/*.ts` — uno por tipo (preview loaders)
- `src/lib/nexa/mentions/registry.ts` — extender entries con `previewLoader` + `previewLayout`

## Current Repo State

### Already exists

- Chip funcional (TASK-240)
- MUI `Popover` + `ClickAwayListener` disponible
- Patterns de tarjetas KPI en Greenhouse (ej: `SpaceCard`, member cards)

### Gap

- Ningún preview por hover
- No hay endpoint consolidado de preview
- Ningún loader parametrizable por tipo

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — API `/api/nexa/mentions/preview/[type]/[id]`

- GET con auth + RBAC
- Respuesta cached 60s via `stale-while-revalidate`
- Body: `{ type, id, name, headline, kpis[], meta[], actions[] }`
- 404 si no existe, 403 si no autorizado
- Rate limit sensato

### Slice 2 — Preview loaders por tipo

- Cada tipo del registry expone `previewLoader(id, ctx) → PreviewPayload`
- Members: rol, BU, workload %, última activity
- Spaces: FTR, margin, BU, cliente, health
- Clients: revenue LTM, proyectos activos, tenure
- Projects: progress, health, owner, deadline
- Providers: gasto LTM, último pago, categoría
- Resto: payload mínimo (name + meta)

### Slice 3 — Componente PreviewCard

- `NexaMentionPreviewCard`:
  - Render consistente: header (icon + type badge + name) + KPI grid + meta + footer action `Ver perfil →`
  - Skeleton loader mientras fetch
  - Estados: loading / ready / error / unauthorized
  - Click en `Ver perfil` navega al href del registry

### Slice 4 — Integración en Chip

- `NexaMentionChip`: envolver en `Popover` MUI con:
  - Trigger: hover 400ms delay o focus + Enter
  - ClickAway o Esc cierra
  - Posicionamiento smart (no corta fuera del viewport)
- Mobile: tap largo abre `SwipeableDrawer` con el mismo contenido

### Slice 5 — Caching + performance

- SWR en cliente via `useSWR` o equivalente repo
- Dedupe por `${type}:${id}`
- Pre-fetch opcional cuando chip entra al viewport (Intersection Observer) — configurable

### Slice 6 — Accesibilidad

- ARIA: `aria-haspopup="dialog"`, `aria-expanded`
- Foco trap dentro del preview cuando abierto por keyboard
- Screen reader anuncia contenido

## Out of Scope

- Preview editable (ej: cambiar owner directo desde el card) — se deja para follow-up
- Insights agregados dentro del preview (ej: "3 insights mencionan este Space") — TASK-448 agrega reverse index y ese subcount
- Preview en emails (no aplica — medio estático)

## Detailed Spec

### Shape del payload

```json
{
  "type": "space",
  "id": "spc-ae463d9f-...",
  "name": "Sky Airlines",
  "headline": "Cliente · Aviación",
  "kpis": [
    { "label": "FTR mensual", "value": "72.4%", "delta": "-2.1 pts", "trend": "down" },
    { "label": "Margen", "value": "28.5%", "delta": "+0.4 pts", "trend": "up" },
    { "label": "Backlog", "value": "12 proyectos" }
  ],
  "meta": [
    { "label": "Business line", "value": "Agencia" },
    { "label": "Lead account", "value": "Andrés Carlosama" }
  ],
  "actions": [
    { "label": "Ver 360", "href": "/agency/spaces/spc-ae463d9f-..." },
    { "label": "Abrir dashboard", "href": "/agency/spaces/spc-ae463d9f-.../dashboard" }
  ]
}
```

### Timings

- Hover delay: 400ms (estándar industria)
- Cache TTL: 60s
- p95 server: ≤ 300ms
- Animación open: 120ms ease-out

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Hover/focus sobre chip abre preview con KPIs por tipo
- [ ] API respeta RBAC + tenant isolation
- [ ] Cache SWR 60s funcionando
- [ ] Mobile: tap largo abre drawer bottom
- [ ] Keyboard + screen reader navegable
- [ ] p95 API ≤ 300ms validado en staging
- [ ] Fallback graceful si preview falla
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`, `pnpm build` sin errores

## Verification

- `pnpm test -- nexa/mentions/preview`
- Manual: hover en chip Space → verificar FTR/margin
- Manual: tab-enter en chip → preview con foco interno
- Manual: staging lighthouse → p95 validado
- axe DevTools sin violaciones

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con screenshots
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado sobre TASK-441, TASK-442, TASK-443, TASK-445, TASK-448

## Follow-ups

- Pre-fetch preview de chips visibles en viewport (intersection observer)
- Acciones inline (asignar, programar, comentar)
- Sparklines en KPIs (trend últimos 6 meses)

## Open Questions

- ¿Cache server-side (Redis / edge) o solo cliente SWR? Decisión en plan mode basada en hit rate esperado.

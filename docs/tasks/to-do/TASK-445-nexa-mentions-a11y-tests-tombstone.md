# TASK-445 — Nexa Mentions Accessibility, Tests & Tombstone

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `hardening`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `TASK-441`
- Branch: `task/TASK-445-nexa-mentions-a11y-tests-tombstone`
- Legacy ID: `none`
- GitHub Issue: `[optional]`

## Summary

Cierra las brechas de accesibilidad, test coverage e i18n del sistema de menciones de Nexa. Agrega ARIA labels por tipo, keyboard handling, tooltips i18n, estados tombstone (entidad eliminada / no encontrada), suite de tests del parser + resolver + renderer, y un runbook de QA. Convierte el feature de `funciona` a `enterprise-ready`.

## Why This Task Exists

El parser [NexaMentionText.tsx](src/components/greenhouse/NexaMentionText.tsx) se shipeó en TASK-240 sin tests, sin ARIA labels, sin tooltips, sin manejo de entidad eliminada y sin i18n. Para aspirar a una UI pulida sobre la que montar chat, autocomplete y push, este componente tiene que ser el ejemplo de rigor — hoy es el punto débil.

## Goal

- Unit tests del parser, sanitizer, resolver y renderer (cobertura >90%)
- ARIA labels por tipo en cada chip (`aria-label="Miembro: Andrés Carlosama"`)
- Tooltip MUI con contexto de la entidad (tipo + nombre + meta opcional)
- Tombstone UI: entidad eliminada → chip disabled gris con tooltip `Esta {tipo} ya no está disponible`
- i18n labels: tipos, tooltips y mensajes tombstone vía dictionary
- Keyboard navigation completa (Tab, Enter, Space)
- Visual regression tests (Chromatic o equivalente)
- Runbook de QA para QA manual por release

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

Reglas obligatorias:

- Cumplir WCAG 2.2 AA
- Estados del chip: `active | disabled | tombstone | pending` (colores tokenizados)
- i18n strings bajo `src/i18n/*` o diccionario canónico del repo
- No hardcodear strings en español en el renderer

## Normative Docs

- `docs/tasks/complete/TASK-428-i18n-architecture-decision.md`
- `docs/tasks/to-do/TASK-441-nexa-mentions-resolver-allowlist-sanitization.md`

## Dependencies & Impact

### Depends on

- TASK-441: distingue válidos de inválidos en el texto persistido
- TASK-442: metadata por tipo (tooltip i18n key)
- i18n foundation (TASK-428 / TASK-430) — puede adoptarse parcial si aún no cerrado

### Blocks / Impacts

- UX de NexaThread (TASK-443) se beneficia automáticamente
- Certificación de accesibilidad del portal

### Files owned

- `src/components/greenhouse/NexaMentionText.tsx` — modificar
- `src/components/greenhouse/NexaMentionChip.tsx` — nuevo: extracción del chip (reusable)
- `src/components/greenhouse/__tests__/NexaMentionText.test.tsx` — nuevo
- `src/lib/nexa/mentions/__tests__/*` — nuevos tests del resolver/sanitizer
- `docs/operations/RUNBOOK_NEXA_MENTIONS_QA.md` — nuevo

## Current Repo State

### Already exists

- Parser funcional
- Vitest + Testing Library + jsdom en `src/test/`
- `GH_COLORS` y tokens MUI v5

### Gap

- Cero tests del parser
- ARIA vacío más allá de `aria-hidden` en el icono
- No hay tombstone UI
- No hay tooltip
- Strings hardcoded en español

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Extraer `NexaMentionChip`

- Sacar el Chip de `NexaMentionText` a `NexaMentionChip` reutilizable
- Props: `{ type, id, name, state: 'active' | 'disabled' | 'tombstone', surface, meta? }`
- Internamente maneja ARIA, tooltip, telemetry click

### Slice 2 — ARIA + keyboard

- `aria-label={t('nexa.mentions.ariaLabel', { type, name })}`
- `role="link"` cuando navegable, `role="text"` cuando tombstone
- Keyboard focus outline consistente con tokens

### Slice 3 — Tooltip

- MUI `<Tooltip>` con `{tipo}: {name}` + meta opcional (rol, línea de negocio, etc.)
- Delay 500ms, placement top

### Slice 4 — Tombstone state

- Si `state === 'tombstone'`: chip gris, sin href, tooltip `Esta {tipo} ya no está disponible`
- Decisión de cuándo entrar en tombstone:
  - Texto persistido marca `@!{Name}` (output del resolver de TASK-441)
  - O ruta target responde 404 (client-side fetch opcional, out of scope si costoso)

### Slice 5 — i18n

- Keys:
  - `nexa.mentions.types.member` → "Miembro"
  - `nexa.mentions.types.space` → "Space"
  - etc. (uno por tipo del registry)
  - `nexa.mentions.ariaLabel` → `"{type}: {name}"`
  - `nexa.mentions.tombstone` → `"Esta {type} ya no está disponible"`
- Consumir via `getDictionary()` del repo

### Slice 6 — Tests

- Unit: parser con casos límite (nombres con `]`, escapes, marcas anidadas, múltiples menciones)
- Unit: sanitizer (XSS vectors, zero-width, control chars)
- Unit: resolver (mock PG, válidos, inválidos, tenant mismatch)
- Component: renderer en estados active/disabled/tombstone
- Integration: snapshot de NexaThread con mentions en respuesta

### Slice 7 — Visual regression + runbook

- Chromatic (o alternativa) para snapshots visuales del chip en cada estado
- Runbook `RUNBOOK_NEXA_MENTIONS_QA.md` con casos a validar por release:
  - Rendering en insights, chat, email
  - Navegación por tipo
  - Tombstone
  - XSS vectors
  - Keyboard only
  - Screen reader

## Out of Scope

- Role colors por rol de miembro (follow-up)
- Hover preview cards (follow-up)
- Animaciones de entrada / exit

## Detailed Spec

### Contrato `NexaMentionChip`

```tsx
interface NexaMentionChipProps {
  type: MentionType
  id: string
  name: string
  state?: 'active' | 'disabled' | 'tombstone'
  surface: MentionSurface
  meta?: string
}
```

### Estados visuales

| State | Border | Background | Text | Cursor | Tooltip |
|-------|--------|------------|------|--------|---------|
| active | `divider` | transparent | `text.primary` | pointer | tipo + name + meta |
| disabled | `divider` | `action.disabledBackground` | `text.disabled` | default | tipo + name + `(sin perfil disponible)` |
| tombstone | `error.light` | `error.lightBg` | `error.main` | default | `Esta {type} ya no está disponible` |

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `NexaMentionChip` reutilizable extraído
- [ ] ARIA labels por tipo y estado
- [ ] Tooltip i18n funcional
- [ ] Tombstone renderiza correcto
- [ ] Cobertura tests >90% para mentions module
- [ ] `axe` DevTools sin violaciones en surfaces con mentions
- [ ] Visual regression baseline capturado
- [ ] Runbook QA publicado en `docs/operations/`
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`, `pnpm build` sin errores

## Verification

- `pnpm test -- nexa/mentions`
- `pnpm test -- NexaMentionText`
- Manual: axe DevTools sobre NexaInsightsBlock y NexaThread
- Manual: navegar con Tab solo, verificar focus visible
- Manual: NVDA / VoiceOver anuncia tipo + nombre

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado sobre TASK-441, TASK-442, TASK-443, TASK-444

## Follow-ups

- Role colors por rol de miembro
- Hover preview card con KPIs mini
- Animaciones micro (hover, focus)

## Open Questions

- ¿Chromatic o Playwright visual para regression? Decisión en plan mode (evaluar costo vs repo actual).

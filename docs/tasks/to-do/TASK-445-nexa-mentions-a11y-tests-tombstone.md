# TASK-445 — Nexa Mentions Accessibility, Tests & Tombstone

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `primitive`
- Backend impact: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `nexa|ui|accessibility`
- Blocked by: `TASK-441`
- Branch: `task/TASK-445-nexa-mentions-a11y-tests-tombstone`
- Legacy ID: `none`
- GitHub Issue: `[optional]`

## Summary

Cierra las brechas de accesibilidad, test coverage e i18n del sistema de menciones de Nexa. Agrega ARIA labels por tipo, keyboard handling, tooltips i18n, estados tombstone (entidad eliminada / no encontrada), suite de tests del parser + resolver + renderer, y un runbook de QA. Convierte el feature de `funciona` a `enterprise-ready`.

## Why This Task Exists

El parser [NexaMentionText.tsx](src/components/greenhouse/NexaMentionText.tsx) ya tiene una prueba base (`src/components/greenhouse/NexaMentionText.test.tsx`) agregada después de TASK-240, pero todavía no cubre el contrato enterprise completo: ARIA labels por tipo, tooltips, estado tombstone, i18n y fixtures de chat/autocomplete. Para aspirar a una UI pulida sobre la que montar chat, autocomplete y push, este componente tiene que ser el ejemplo de rigor.

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
- i18n/copy strings bajo `src/lib/copy/*` y/o la capa `next-intl` vigente; no hardcodear copy reusable.
- No hardcodear strings en español en el renderer
- Si se extrae `NexaMentionChip`, debe seguir P+V+K proporcional: reusable interno, a11y baked-in, sin primitive paralela.

## Normative Docs

- `docs/tasks/complete/TASK-428-i18n-architecture-decision.md`
- `docs/tasks/to-do/TASK-441-nexa-mentions-resolver-allowlist-sanitization.md`
- `docs/tasks/to-do/TASK-443-nexa-thread-chat-mention-rendering.md`

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
- `src/components/greenhouse/NexaMentionText.test.tsx` — ampliar cobertura existente
- `src/lib/nexa/mentions/__tests__/*` — nuevos tests del resolver/sanitizer
- `docs/operations/RUNBOOK_NEXA_MENTIONS_QA.md` — nuevo

## Current Repo State

### Already exists

- Parser funcional `src/components/greenhouse/NexaMentionText.tsx`
- Test base `src/components/greenhouse/NexaMentionText.test.tsx`
- Vitest + Testing Library + jsdom en `src/test/`
- `GH_COLORS` y tokens MUI v5

### Gap

- Tests actuales son mínimos; falta coverage de regex edge cases, aria, keyboard y tombstone.
- ARIA vacío más allá de `aria-hidden` en el icono
- No hay tombstone UI
- No hay tooltip
- Strings hardcoded en español

## UI/UX Contract

### Experience brief

- UI rigor: `ui-platform`
- Usuario / rol: usuarios que leen entidades mencionadas en Nexa; QA/a11y que valida releases.
- Momento del flujo: lectura, foco, navegación y estado degradado de chips de mention.
- Resultado perceptible esperado: chip reusable con estados claros, accesible por teclado y estable en mobile.
- Friccion que debe reducir: menciones visualmente útiles pero frágiles/inaccesibles.
- No-goals UX: hover previews, autocomplete y reverse index.

### Surface & system decision

- Surface: `NexaMentionText` + `NexaMentionChip` interno reusable.
- Composition Shell: `no aplica` — primitive inline.
- Primitive decision: `extend` — extraer chip reusable desde renderer existente; no agregar Design System global si no se usa fuera de Nexa.
- Adaptive density / The Seam: `no aplica` — inline chip.
- Floating/Sidecar/Dialog decision: no aplica.
- Copy source: `src/lib/copy/*` para aria, tooltips y tombstone.
- Access impact: `none` directo; hrefs heredan gates de rutas destino.

### State inventory

- Default: active/navigable.
- Loading: pending si metadata de preview/validación no está lista.
- Empty: texto sin mentions.
- Error: malformed mention → texto plano.
- Degraded / partial: disabled/no navigable.
- Permission denied: no generar href o destino maneja denial.
- Long content: truncado con tooltip accesible.
- Mobile / compact: hit target adecuado y wrap-safe.
- Keyboard / focus: Tab/Enter/Space, focus visible.
- Reduced motion: no motion o instant.

### Interaction contract

- Primary interaction: navegación por chip válido.
- Hover / focus / active: tooltip/focus ring tokenizados.
- Pending / disabled: disabled/tombstone comunica estado sin prometer acción.
- Escape / click-away: tooltip se cierra.
- Focus restore: no aplica salvo tooltip/popover.
- Latency feedback: pending local si aplica.
- Toast / alert behavior: no toast.

### Motion & microinteractions

- Motion primitive: `CSS`
- Enter / exit: tooltip estándar.
- Layout morph: no aplica.
- Stagger: no aplica.
- Timing / easing token: MUI/default tokenizado.
- Reduced-motion fallback: instant/no animation.
- Non-goal motion: decoraciones.

### Visual verification

- GVC scenario: lab/fixture con active, disabled, tombstone, long name y mobile wrap.
- Viewports: desktop y mobile 390px.
- Required captures: todos los estados.
- Required `data-capture` markers: mention chip specimen.
- Scroll-width check: page + container.
- Accessibility/focus checks: axe, keyboard nav, aria-labels.
- Before/after evidence: chip legacy vs chip endurecido.
- Known visual debt: si el chip se promueve a primitive global, abrir ADR/UI platform follow-up.

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

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (extract chip) -> Slice 2/3 (ARIA + tooltip) -> Slice 4 (tombstone) -> Slice 5 (copy/i18n) -> Slice 6/7 (tests + visual runbook).
- No integrar el chip en chat/autocomplete hasta que los estados active/disabled/tombstone tengan tests.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Extracción del chip cambia visualmente todos los Insights | UI | medium | snapshots/GVC antes-después | visual diff |
| Tooltip/focus empeora a11y | accessibility | medium | axe + keyboard test | axe violation |
| Tombstone se interpreta como acción disponible | UX | low | disabled/no href + copy clara | QA finding |

### Feature flags / cutover

- Sin flag si el chip es visualmente compatible y tests pasan.
- Si la extracción toca muchas surfaces, Plan Mode puede aplicar adapter legacy temporal en `NexaMentionText`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1-5 | revert chip extraction/copy | <20 min | si |
| Slice 6-7 | tests/runbook only; no runtime rollback | N/A | si |

### Production verification sequence

1. Tests unitarios del renderer/chip.
2. GVC active/disabled/tombstone desktop/mobile.
3. Axe/focus smoke en staging.
4. Deploy prod y revisar Sentry UI errors.

### Out-of-band coordination required

N/A — UI/test/docs only.

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

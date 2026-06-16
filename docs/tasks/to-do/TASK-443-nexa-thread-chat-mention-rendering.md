# TASK-443 — Nexa Thread Chat Mention Rendering (Quick Win)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `interaction`
- Backend impact: `none`
- Status real: `Diseno`
- Rank: `QUICK-WIN`
- Domain: `nexa|ui|ai`
- Blocked by: `none`
- Branch: `task/TASK-443-nexa-thread-chat-mention-rendering`
- Legacy ID: `none`
- GitHub Issue: `[optional]`

## Summary

Integra el parser `NexaMentionText` en el chat de Nexa (`NexaThread`) para que las respuestas del asistente rendericen menciones `@[Name](type:ID)` como chips clickeables en vez de texto crudo. Es la superficie más visible de Nexa y hoy muestra las marcas sin parsear. Parser ya existe y está probado en ICO Insights — esta task es pura integración.

## Why This Task Exists

El LLM ya emite menciones en sus respuestas de chat (mismo prompt-family que Insights), pero el `NexaThread` vivo (`src/views/greenhouse/home/components/NexaThread.tsx`) usa `MarkdownTextPrimitive` sin pasar por el parser. Resultado: el usuario puede ver `"El proyecto @[Campaña Q1](project:abc) está atrasado"` como texto literal, con los corchetes y todo. La inversión de TASK-240 queda visible en Insights mientras la superficie estrella de Nexa todavía no renderiza mentions como entidad.

Es el Quick Win de mayor ratio impact/effort del programa: una superficie muy usada, un componente ya existente, integración de pocas líneas.

## Goal

- Respuestas del asistente en `NexaThread` renderizan chips clickeables para menciones
- Mensajes del usuario también parsean menciones (consistencia visual)
- Compatibilidad con el pipeline de markdown actual (listas, bold, código)
- Telemetría `rendered` + `clicked` (depende de TASK-441 si está lista; fallback: no-op)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

Reglas obligatorias:

- No reemplazar el markdown renderer — extenderlo con un mention-aware middleware
- Mantener el streaming del chat (no bloquear el render hasta que termine la respuesta)
- Si TASK-441 todavía no está mergeado, el fallback es el parser frontend actual (validación solo por regex)
- No crear otro `NexaThread`, drawer ni endpoint; el chat vigente comparte `/api/home/nexa`.

## Normative Docs

- `docs/tasks/complete/TASK-240-nexa-insights-entity-mentions.md`
- `docs/tasks/to-do/TASK-441-nexa-mentions-resolver-allowlist-sanitization.md`
- `docs/tasks/to-do/TASK-442-nexa-mentions-registry-entity-expansion.md`
- `docs/tasks/to-do/TASK-1150-nexa-attach-current-page-context.md`

## Dependencies & Impact

### Depends on

- `src/components/greenhouse/NexaMentionText.tsx` — existe y funciona
- `src/views/greenhouse/home/components/NexaThread.tsx` — surface viva de chat
- Markdown renderer actual (`MarkdownTextPrimitive`)

### Blocks / Impacts

- TASK-438 (contextual chat per domain) — esta task ya deja la base de render resuelta
- TASK-444 (autocomplete input) — esta task no bloquea, pero ambas tocan `NexaThread`

### Files owned

- `src/views/greenhouse/home/components/NexaThread.tsx` — modificar: interceptar render con mention parser sin romper assistant-ui
- `src/components/greenhouse/NexaMentionMarkdown.tsx` — nuevo: wrapper de Markdown + mention
- Tests E2E en staging

## Current Repo State

### Already exists

- `NexaMentionText` reutilizable ([NexaMentionText.tsx](src/components/greenhouse/NexaMentionText.tsx))
- `NexaThread` vivo en `src/views/greenhouse/home/components/NexaThread.tsx`, compartido por Home/floating.
- `NexaInsightsBlock` ya usa el parser — patrón de referencia

### Gap

- `NexaThread` no pasa texto por el parser
- Parser `NexaMentionText` opera sobre string plano, no sobre árbol markdown — si se inyecta tal cual rompe formato
- No hay componente `NexaMentionMarkdown` que combine ambos

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: cualquier usuario que conversa con Nexa en el floating/Home chat.
- Momento del flujo: lectura de una respuesta que referencia una entidad.
- Resultado perceptible esperado: menciones aparecen como chips clickeables dentro de Markdown sin perder listas, bold, code ni citas.
- Friccion que debe reducir: texto crudo `@[...](...)` en la respuesta del chat.
- No-goals UX: autocomplete de input, hover preview, sidecar/drawer nuevo o reescritura del chat.

### Surface & system decision

- Surface: `NexaThread` en `src/views/greenhouse/home/components/NexaThread.tsx`.
- Composition Shell: `no aplica` — renderer inline dentro del thread existente.
- Primitive decision: `extend` — reutilizar `NexaMentionText`/`NexaMentionChip`; nuevo wrapper markdown solo si es necesario.
- Adaptive density / The Seam: `no aplica`.
- Floating/Sidecar/Dialog decision: preservar `NexaFloatingPanel`/floating shell existente; no crear drawer paralelo.
- Copy source: copy reusable de aria/tooltips en `src/lib/copy/*`; sin copy nuevo si solo renderiza chips.
- Access impact: `none` directo; navegación de chip hereda access de la ruta destino.

### State inventory

- Default: respuesta Markdown con chips válidos.
- Loading: stream/typing actual sin cambio.
- Empty: sin mentions → Markdown actual.
- Error: mention malformada → texto literal/sanitizado, no crash.
- Degraded / partial: tipo no navegable/tombstone según `TASK-441/445`.
- Permission denied: destino maneja denial; renderer no debe filtrar datos adicionales.
- Long content: chips wrap-safe dentro de bullets/parrafos.
- Mobile / compact: no overflow horizontal en el panel flotante.
- Keyboard / focus: chip tab-focus si navegable, Enter/Space activa.
- Reduced motion: sin motion nueva.

### Interaction contract

- Primary interaction: click/keyboard en chip abre destino.
- Hover / focus / active: feedback del chip existente.
- Pending / disabled: no aplica salvo tombstone.
- Escape / click-away: preservar comportamiento actual del floating/thread.
- Focus restore: preservar focus management del floating.
- Latency feedback: no cambia streaming.
- Toast / alert behavior: ninguno.

### Motion & microinteractions

- Motion primitive: `none`
- Enter / exit: no aplica.
- Layout morph: no aplica.
- Stagger: no aplica.
- Timing / easing token: no aplica.
- Reduced-motion fallback: no aplica.
- Non-goal motion: preview popovers quedan en `TASK-447`.

### Visual verification

- GVC scenario: chat flotante en una ruta que no oculte el FAB, con respuesta fixture/real que incluya mentions en parrafo y bullet.
- Viewports: desktop y mobile 390px.
- Required captures: mention dentro de bold/bullet, mention malformada, texto sin mentions.
- Required `data-capture` markers: wrapper del thread/floating si existe; agregar marker estable si falta.
- Scroll-width check: medir panel y página.
- Accessibility/focus checks: navegación por teclado a chips y Escape del floating intacto.
- Before/after evidence: frame antes con texto crudo y después con chip.
- Known visual debt: renderer markdown debe respetar invariantes de assistant-ui descritos en la skill Nexa.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Renderer mention-aware

- Crear `src/components/greenhouse/NexaMentionMarkdown.tsx`:
  - Recibe `{ text, variant }`
  - Passa el texto por el markdown renderer
  - Pre-procesa: divide texto en fragmentos de texto vs menciones antes de pasar a markdown, preserva marcas como nodos React inyectados post-render (usar `react-markdown` + `remark` plugin o un post-processor en cada nodo `text`)
  - Estrategia preferida: remark plugin `remark-nexa-mentions` que transforma `@[Name](type:id)` en un nodo custom → renderer mapea a `<Chip>`

### Slice 2 — Integración en NexaThread

- Reemplazar `<MarkdownTextPrimitive>` por `<NexaMentionMarkdown>` en las tres ubicaciones de render (asistente, user, tool result si aplica)
- Mantener estilos actuales (typography, spacing)
- Probar que streaming sigue funcionando

### Slice 3 — Telemetría

- Si TASK-441 está mergeada: importar helper `trackMentionEvent({ surface: 'chat', event: 'rendered' | 'clicked' })`
- Si no: no-op + TODO

### Slice 4 — Validación visual

- Enviar al LLM un prompt que fuerce mentions ("resume el estado de @[Sky Airlines](space:spc-ae463d9f...)") → verificar que el chip aparece dentro de un bullet, dentro de **bold**, junto a `inline code`, etc.
- Validar en móvil (Chip debería no romper wrapping)

## Out of Scope

- Autocomplete del lado del usuario — TASK-444
- Resolver server-side — TASK-441
- Nuevos tipos de entidad — TASK-442
- Push / email — ya resuelto en email, push no tiene superficie aún

## Detailed Spec

### Plugin remark

```ts
import type { Plugin } from 'unified'

export const remarkNexaMentions: Plugin = () => (tree) => {
  visit(tree, 'text', (node, index, parent) => {
    const matches = [...node.value.matchAll(MENTION_REGEX)]
    if (!matches.length) return
    const children = buildMentionNodes(node.value, matches)
    parent.children.splice(index, 1, ...children)
    return [SKIP, index + children.length]
  })
}
```

### Componente renderer

```tsx
<ReactMarkdown
  remarkPlugins={[remarkGfm, remarkNexaMentions]}
  components={{
    mention: ({ node }) => (
      <NexaMentionChip
        name={node.name}
        type={node.type}
        id={node.id}
        surface='chat'
      />
    )
  }}
>
  {text}
</ReactMarkdown>
```

### Casos a cubrir visualmente

- Mención dentro de bullet list
- Mención dentro de texto normal
- Mención dentro de **bold** y _italic_
- Varias menciones contiguas
- Mención en streaming parcial (no se debe romper el render antes de cerrar el paréntesis)

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (renderer mention-aware) -> Slice 2 (integración en `NexaThread`) -> Slice 3 (telemetría no-op/real) -> Slice 4 (GVC).
- No reemplazar `MarkdownTextPrimitive` si eso rompe los invariantes de assistant-ui; Plan Mode debe validar streaming y tools.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Markdown pierde bold/list/code por parser de mentions | UI | medium | tests de Markdown + fixture visual | snapshot/GVC diff |
| Streaming remount/flicker por renderer nuevo | UI/runtime | medium | preservar memoization de markdown components | manual/GVC chat smoke |
| Chip genera overflow en floating mobile | UI | medium | wrap-safe + scrollWidth check 390px | scrollWidth > clientWidth |

### Feature flags / cutover

- Sin flag si el renderer es drop-in y tests/GVC pasan.
- Si Plan Mode detecta riesgo de streaming, gatear el renderer mention-aware con flag local/env de presentación.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1-2 | revert renderer/integration a MarkdownTextPrimitive | <15 min | si |
| Slice 3 | no-op telemetry o revert import | <10 min | si |
| Slice 4 | N/A evidencia | N/A | si |

### Production verification sequence

1. Tests de renderer/Markdown local.
2. GVC desktop/mobile del floating con mention en respuesta.
3. Smoke manual de streaming + tool card en staging.
4. Deploy prod y revisar errores de chat/render durante 24h.

### Out-of-band coordination required

N/A — UI/runtime repo-only.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `NexaThread` renderiza mentions como chips clickeables
- [ ] Markdown formatting (bold, listas, código) sigue funcionando
- [ ] Streaming no se rompe ante menciones parciales (se muestra texto hasta cierre de marca)
- [ ] Click en chip navega a la ruta del registry
- [ ] Funciona en mobile sin overflow
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`, `pnpm build` sin errores
- [ ] Screenshot antes / después documentado en `Handoff.md`

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm build`
- Manual: `/home` → abrir Nexa chat → preguntar "dame contexto del space Sky Airlines" → verificar chip
- Playwright smoke test: `scripts/playwright-auth-setup.mjs` + test que valida `getByRole('link', { name: /Sky Airlines/ })`

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con screenshots
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado sobre TASK-438, TASK-441, TASK-442, TASK-444

## Follow-ups

- Mention autocomplete en input — TASK-444
- Mostrar hover card con resumen (KPI mini) al pasar por chip de `space` o `client`
- Quick actions en chip: "Ir a perfil", "Asignar tarea", "Agendar follow-up"

## Open Questions

- ¿Usar el markdown renderer actual o migrar a `react-markdown` estándar si el primitive no permite plugins? Decisión en plan mode.

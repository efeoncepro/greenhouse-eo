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
- Status real: `Diseno`
- Rank: `QUICK-WIN`
- Domain: `agency`
- Blocked by: `none`
- Branch: `task/TASK-443-nexa-thread-chat-mention-rendering`
- Legacy ID: `none`
- GitHub Issue: `[optional]`

## Summary

Integra el parser `NexaMentionText` en el chat de Nexa (`NexaThread`) para que las respuestas del asistente rendericen menciones `@[Name](type:ID)` como chips clickeables en vez de texto crudo. Es la superficie más visible de Nexa y hoy muestra las marcas sin parsear. Parser ya existe y está probado en ICO Insights — esta task es pura integración.

## Why This Task Exists

El LLM ya emite menciones en sus respuestas de chat (mismo prompt-family que Insights), pero `NexaThread` usa `MarkdownTextPrimitive` sin pasar por el parser ([NexaThread.tsx:259-265](src/components/greenhouse/NexaThread.tsx#L259-L265)). Resultado: el usuario ve `"El proyecto @[Campaña Q1](project:abc) está atrasado"` como texto literal, con los corchetes y todo. La inversión de TASK-240 queda visible solo en un bloque mientras la superficie estrella de Nexa sigue rota.

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

## Normative Docs

- `docs/tasks/complete/TASK-240-nexa-insights-entity-mentions.md`
- `docs/tasks/to-do/TASK-441-nexa-mentions-resolver-allowlist-sanitization.md`
- `docs/tasks/to-do/TASK-442-nexa-mentions-registry-entity-expansion.md`

## Dependencies & Impact

### Depends on

- `src/components/greenhouse/NexaMentionText.tsx` — existe y funciona
- `src/components/greenhouse/NexaThread.tsx` — surface de chat
- Markdown renderer actual (`MarkdownTextPrimitive`)

### Blocks / Impacts

- TASK-438 (contextual chat per domain) — esta task ya deja la base de render resuelta
- TASK-444 (autocomplete input) — esta task no bloquea, pero ambas tocan `NexaThread`

### Files owned

- `src/components/greenhouse/NexaThread.tsx` — modificar: interceptar render con mention parser
- `src/components/greenhouse/NexaMentionMarkdown.tsx` — nuevo: wrapper de Markdown + mention
- Tests E2E en staging

## Current Repo State

### Already exists

- `NexaMentionText` reutilizable ([NexaMentionText.tsx](src/components/greenhouse/NexaMentionText.tsx))
- `NexaThread` con markdown streaming
- `NexaInsightsBlock` ya usa el parser — patrón de referencia

### Gap

- `NexaThread` no pasa texto por el parser
- Parser `NexaMentionText` opera sobre string plano, no sobre árbol markdown — si se inyecta tal cual rompe formato
- No hay componente `NexaMentionMarkdown` que combine ambos

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

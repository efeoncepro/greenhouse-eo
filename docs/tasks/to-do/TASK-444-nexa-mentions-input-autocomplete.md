# TASK-444 — Nexa Mentions Input Autocomplete

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `TASK-441, TASK-442`
- Branch: `task/TASK-444-nexa-mentions-input-autocomplete`
- Legacy ID: `none`
- GitHub Issue: `[optional]`

## Summary

Habilita el carácter `@` en el input de Nexa (chat + cualquier surface que acepte prompts del usuario) para disparar un dropdown de autocompletado que busca entidades del registry (members, spaces, clients, providers, projects, etc.), inserta la marca canónica `@[Name](type:ID)` y permite al usuario hacer referencias precisas a objetos 360. El modelo recibe IDs reales en el prompt, respuesta de calidad sube, hallucinations bajan.

## Why This Task Exists

Hoy solo el LLM puede emitir menciones — el usuario escribe "Sky Airlines" como texto libre y el modelo tiene que adivinar a qué Space se refiere. Para enterprise necesitamos el patrón standard tipo Notion / Linear / Slack: el usuario arroba, selecciona, y la referencia queda anclada a un ID real. Esto habilita:

- Queries precisas: "dame el FTR de @[Sky Airlines] en marzo" → el modelo no desambigua por nombre
- Multi-entidad: "compara @[Andrés Carlosama] con @[María González]" → prompt recibe ambos IDs
- Auditabilidad: el prompt histórico queda con IDs canónicos, no nombres
- Base para comandos: `/asignar @[María] a @[proyecto X]` (follow-up)

## Goal

- Carácter `@` en input dispara dropdown con search + filtro por tipo
- Selección inserta marca canónica `@[Name](type:ID)` en el textarea
- Chip renderizado en el input (no solo texto con corchetes)
- Search tenant-aware via API
- Keyboard navigation (↑↓ enter esc)
- Accesible (ARIA combobox pattern)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

Reglas obligatorias:

- El search API respeta tenant isolation y RBAC (usuario solo ve entidades autorizadas)
- El input usa ContentEditable o librería rich-text (Tiptap / Lexical) — no textarea plano
- Consumir el registry de TASK-442 como fuente de tipos disponibles

## Normative Docs

- `docs/tasks/to-do/TASK-441-nexa-mentions-resolver-allowlist-sanitization.md`
- `docs/tasks/to-do/TASK-442-nexa-mentions-registry-entity-expansion.md`
- `docs/tasks/to-do/TASK-443-nexa-thread-chat-mention-rendering.md`

## Dependencies & Impact

### Depends on

- TASK-441: resolver + telemetría
- TASK-442: registry expandido
- TASK-443: render en chat
- Endpoint nuevo `/api/nexa/mentions/search`

### Blocks / Impacts

- TASK-438 (contextual chat per domain) — permite que el usuario ancle entidades del dominio
- Reemplazo futuro de prompts manuales por comandos estructurados

### Files owned

- `src/components/greenhouse/NexaMentionInput.tsx` — nuevo
- `src/components/greenhouse/NexaMentionAutocomplete.tsx` — nuevo (dropdown)
- `src/app/api/nexa/mentions/search/route.ts` — nuevo
- `src/lib/nexa/mentions/search.ts` — nuevo (query batch con ranking)
- `src/components/greenhouse/NexaThread.tsx` — modificar: usar `NexaMentionInput` en vez de textarea

## Current Repo State

### Already exists

- Input actual en NexaThread (textarea / controlled)
- Registry canónico (post TASK-442)
- Parser render (post TASK-443)

### Gap

- No existe input rich-text en Nexa
- No existe endpoint de búsqueda multi-entidad
- No existe UI de autocomplete

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Search API

- `POST /api/nexa/mentions/search` con body `{ query, types?, limit }`
- Auth: requiere sesión válida (Agent Auth OK)
- Respeta RBAC via `routeGroups` + `authorizedViews`
- Ranking: trigram similarity + tipo prioritario + recencia
- Cap 20 resultados
- Rate limit razonable (60 rpm por usuario)

### Slice 2 — Dropdown component

- `NexaMentionAutocomplete`: lista con icono por tipo (registry), nombre canónico, meta (ej: para miembro → rol)
- Keyboard: ↑↓ navega, Enter selecciona, Esc cierra
- Filtro por tipo via tabs mini (All / People / Spaces / Projects / …)

### Slice 3 — Input rich-text

- Decisión: Tiptap (preferido por SSR friendliness) o Lexical
- `NexaMentionInput`: ContentEditable con mention extension que:
  - Detecta `@`
  - Dispara autocomplete
  - Inserta node `mention` (no texto con corchetes)
  - Al serializar para el backend: convierte nodos `mention` a `@[Name](type:ID)`

### Slice 4 — Integración NexaThread

- Reemplazar textarea por `NexaMentionInput`
- Preservar placeholder, submit (Enter / Shift+Enter), draft persistence

### Slice 5 — Accesibilidad

- ARIA combobox pattern (`role="combobox"`, `aria-activedescendant`)
- Screen reader announces tipo y cantidad de resultados
- Keyboard-only end-to-end

### Slice 6 — Telemetría

- Evento `search_opened`, `mention_inserted`, `search_abandoned` a `nexa_mention_events`

## Out of Scope

- Comandos `/` (reservado para task futura: TASK-4xx nexa-slash-commands)
- Inline formatting avanzado (bold, italic) — solo menciones y texto plano
- Drafts offline / sync

## Detailed Spec

### Shape del search response

```json
{
  "results": [
    {
      "type": "member",
      "id": "EO-MBR-a1b2c3d4",
      "name": "Andrés Carlosama",
      "meta": "Account Manager · Agencia",
      "score": 0.92
    },
    {
      "type": "space",
      "id": "spc-ae463d9f...",
      "name": "Sky Airlines",
      "meta": "Cliente · Aviación",
      "score": 0.78
    }
  ]
}
```

### Ranking heuristic

- `similarity(query, name) * 0.6 + type_priority * 0.2 + recency_factor * 0.2`
- Prioridades default: `member > space > client > project > provider > task > ...`
- Ajustable por dominio del caller (chat ICO agency → space/member arriba)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `@` abre dropdown; typing filtra; Enter selecciona
- [ ] Selección inserta chip visual (no texto crudo)
- [ ] Backend serializa a `@[Name](type:ID)` canónico
- [ ] Keyboard navigation completa
- [ ] ARIA combobox pattern validado con axe / NVDA
- [ ] Search respeta RBAC y tenant
- [ ] Rate limit funciona
- [ ] Telemetría registra eventos
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`, `pnpm build` sin errores

## Verification

- `pnpm test -- nexa/mentions/search`
- Manual: escribir `@sky` → verificar dropdown con Sky Airlines → seleccionar → enviar mensaje → verificar que el backend recibió `@[Sky Airlines](space:spc-...)`
- Accesibilidad: `axe` DevTools sin violaciones
- Test E2E: Playwright con flujo completo

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado sobre TASK-438, TASK-441, TASK-442, TASK-443

## Follow-ups

- Slash commands (`/asignar`, `/resumir`)
- Hover preview cards en el dropdown (mini KPIs de la entidad)
- Multi-select para comparar entidades
- Recent / frequent mentions prepoblados

## Open Questions

- Tiptap vs Lexical: resolver en plan mode con benchmark SSR.

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
- Execution profile: `backend-data`
- UI impact: `flow`
- Backend impact: `api`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `nexa|ui|api|identity`
- Blocked by: `TASK-441, TASK-442`
- Branch: `task/TASK-444-nexa-mentions-input-autocomplete`
- Legacy ID: `none`
- GitHub Issue: `[optional]`

## Summary

Habilita el carácter `@` en el input de Nexa (chat + cualquier surface que acepte prompts del usuario) para disparar un dropdown de autocompletado que busca entidades del registry (members, spaces, clients, providers, projects, etc.), inserta la marca canónica `@[Name](type:ID)` y permite al usuario hacer referencias precisas a objetos 360. El modelo recibe IDs reales en el prompt, respuesta de calidad sube, hallucinations bajan.

Esta task cubre menciones explícitas escritas por el usuario. Es complementaria a `TASK-1150`, que adjunta contexto implícito de la pantalla actual al turno del composer.

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
- El ranking debe poder recibir una pista contextual desde `NexaContextScope`/`attachedContext` cuando `TASK-1150` exista, pero no depender de ella para funcionar.
- No crear otro runtime de chat; integrarse con `NexaThread`/composer vigente.

## Normative Docs

- `docs/tasks/to-do/TASK-441-nexa-mentions-resolver-allowlist-sanitization.md`
- `docs/tasks/to-do/TASK-442-nexa-mentions-registry-entity-expansion.md`
- `docs/tasks/to-do/TASK-443-nexa-thread-chat-mention-rendering.md`
- `docs/tasks/to-do/TASK-1150-nexa-attach-current-page-context.md`

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
- `src/views/greenhouse/home/components/NexaThread.tsx` — modificar composer/input sin romper assistant-ui

## Current Repo State

### Already exists

- Input actual en `src/views/greenhouse/home/components/NexaThread.tsx` vía assistant-ui/composer.
- Registry canónico (post TASK-442)
- Parser render (post TASK-443)

### Gap

- No existe input rich-text en Nexa
- No existe endpoint de búsqueda multi-entidad
- No existe UI de autocomplete

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: usuario que escribe prompts en Nexa y quiere referirse a entidades reales.
- Momento del flujo: composición del prompt, antes de enviar.
- Resultado perceptible esperado: escribir `@` abre resultados tenant-aware, navegar con teclado es natural y la selección inserta un chip/reference estable.
- Friccion que debe reducir: desambiguación manual por nombres y alucinación de IDs por el modelo.
- No-goals UX: rediseñar todo el chat, crear command palette o sidecar nuevo.

### Surface & system decision

- Surface: composer de `NexaThread`/floating panel.
- Composition Shell: `no aplica` — control inline dentro de la superficie existente.
- Primitive decision: `extend` — usar/crear un componente reusable `NexaMentionInput` solo para composer conversational; no forkear inputs generales.
- Adaptive density / The Seam: `no aplica`.
- Floating/Sidecar/Dialog decision: dropdown anclado al caret/input; usar floating primitive si corresponde, no drawer/modal.
- Copy source: placeholders/empty/loading/aria en `src/lib/copy/*`.
- Access impact: `entitlements`/session — search solo retorna entidades visibles para el sujeto.

### State inventory

- Default: input normal.
- Loading: dropdown muestra estado de búsqueda sin bloquear typing.
- Empty: no results con copy honesta.
- Error: search degraded, usuario puede seguir escribiendo texto plano.
- Degraded / partial: `TASK-1150` context hint ausente → ranking general.
- Permission denied: API retorna lista vacía/403 canónico sin filtrar detalles.
- Long content: chips/nombres truncados y wrap-safe.
- Mobile / compact: dropdown usable con teclado móvil, sin tap targets chicos.
- Keyboard / focus: ARIA combobox, flechas, Enter, Esc, Tab.
- Reduced motion: dropdown sin animación o fade mínimo.

### Interaction contract

- Primary interaction: `@` + búsqueda + selección inserta mention node.
- Hover / focus / active: item activo visible y anunciado.
- Pending / disabled: send no se bloquea por search en vuelo.
- Escape / click-away: cierra dropdown, conserva draft.
- Focus restore: vuelve al composer/caret.
- Latency feedback: debounce y loading inline.
- Toast / alert behavior: ninguno; errores inline.

### Motion & microinteractions

- Motion primitive: `CSS`
- Enter / exit: dropdown fade/scale mínimo tokenizado.
- Layout morph: no aplica.
- Stagger: no aplica.
- Timing / easing token: tokens del sistema.
- Reduced-motion fallback: instant.
- Non-goal motion: efectos decorativos.

### Visual verification

- GVC scenario: chat floating con composer, `@sky`/fixture de results, selección y envío.
- Viewports: desktop y mobile 390px.
- Required captures: default, loading, empty, results, keyboard active, selected chip.
- Required `data-capture` markers: composer/dropdown/result list.
- Scroll-width check: página y panel.
- Accessibility/focus checks: combobox roles/aria, Esc, focus restore.
- Before/after evidence: composer sin/ con mention chip.
- Known visual debt: rich-text engine elegido debe evaluarse en Plan Mode.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: `/api/nexa/mentions/search`, `src/lib/nexa/mentions/search.ts`, registry de `TASK-442`.
- Consumidores afectados: composer UI y futuros agentes/surfaces conversacionales.
- Runtime target: local + staging + production.

### Contract surface

- Contrato existente a respetar: registry/loader de `TASK-442` y resolver de `TASK-441`.
- Contrato nuevo o modificado: search request/response para mentions autocomplete.
- Backward compatibility: `compatible` — input texto plano sigue funcionando.
- Full API parity: composer consume endpoint; no query directa desde cliente.

### Data model and invariants

- Entidades/tablas/views afectadas: readers canónicos de entidades mencionables.
- Invariantes que no se pueden romper:
  - Search nunca retorna entidad fuera de tenant/access del usuario.
  - La selección serializa a `@[Name](type:ID)` validable por `TASK-441`.
- Tenant/space boundary: derivado de sesión + entitlements + optional page context server-revalidated.
- Idempotency/concurrency: endpoint read-only; debounce/cancel client-side.
- Audit/outbox/history: eventos `search_opened|mention_inserted|search_abandoned` vía `nexa_mention_events` si existe.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: sin flag si detrás del composer nuevo; puede gatearse con feature flag si Plan Mode lo exige.
- Backfill plan: no aplica porque la task agrega un endpoint read-only y un composer; no muta datos históricos.
- Rollback path: feature flag off o revert composer to plain text.
- External coordination: no requiere coordinación externa; solo deploy del portal y smoke de roles internos.

### Security and access

- Auth/access gate: sesión obligatoria, capability/view-aware search.
- Sensitive data posture: solo nombres/metadatos mínimos; no exponer payroll/finance sensitive fields.
- Error contract: errores canónicos es-CL, sin raw SQL.
- Abuse/rate-limit posture: rate limit por user, min query length, cap 20.

### Runtime evidence

- Local checks: tests de search ranking/API + component tests.
- DB/runtime checks: staging smoke con usuario limitado.
- Integration checks: seleccionar mention y enviar prompt; resolver valida el ID.
- Reliability signals/logs: search error/rate-limit logs; mention events.
- Production verification sequence: deploy staging → smoke roles distintos → GVC → prod → monitor 24h.

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

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (search API) -> Slice 2 (dropdown) -> Slice 3 (rich input) -> Slice 4 (NexaThread integration) -> Slice 5 (a11y) -> Slice 6 (telemetry).
- No reemplazar el composer hasta que search API y serialization round-trip estén probados.
- Context hint de `TASK-1150` es ranking input opcional, nunca authority.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Search filtra entidades no autorizadas | identity/API | medium | access tests con usuarios limitados | 403/incident logs |
| Rich input rompe send/assistant-ui composer | UI/runtime | medium | feature flag o isolated component tests | GVC/manual smoke |
| Dropdown causa overflow mobile | UI | medium | GVC 390px + scroll-width check | scrollWidth > clientWidth |

### Feature flags / cutover

- Preferido: flag de presentación `NEXA_MENTION_AUTOCOMPLETE_ENABLED=false` hasta staging smoke.
- Search API puede deployarse antes sin exponer UI si está access-gated.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | keep endpoint unused or revert route | <15 min | si |
| Slice 2-4 | flag off / revert composer to plain input | <15 min | si |
| Slice 5-6 | revert a11y/telemetry additions | <15 min | si |

### Production verification sequence

1. API tests + staging search smoke con roles distintos.
2. GVC composer desktop/mobile con results y selected mention.
3. Enviar prompt con mention y verificar resolver de `TASK-441`.
4. Flip prod flag y monitorear API errors/rate limits.

### Out-of-band coordination required

No requiere coordinación fuera del repo: el cambio vive en API interna + UI del composer, con access/rate-limit verificados antes del cutover.

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

# TASK-438 — Nexa Contextual Chat Per Domain (Copilot by Surface)

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
- Domain: `platform`
- Blocked by: `none` (puede arrancar una vez `TASK-110` Slice 2 — tool calling — esté consolidado)
- Branch: `task/TASK-438-nexa-contextual-chat-per-domain`
- Legacy ID: —
- GitHub Issue: —
- Parent arch doc: `docs/architecture/GREENHOUSE_NEXA_EXPANSION_V1.md` (follow-on contextual chat)

## Summary

Convierte Nexa Chat de asistente generalista a copilot por superficie. Cuando el usuario está en `/finance/intelligence`, el chat recibe `domainContext='finance'` y el service carga automáticamente tools Finance-specific (query de márgenes, breakdown de costos, lookup de clientes). Mismo en `/agency/spaces`, `/hr/payroll`, etc. El usuario no tiene que explicar el contexto — el chat ya lo sabe.

## Why This Task Exists

Hoy el chat en Home (`/home`) es intencionalmente generalista. Pero cuando el usuario está navegando una vista específica:

- No tiene sentido que el chat pregunte "¿sobre qué quieres hablar?" — el contexto es obvio.
- Cada dominio tiene preguntas típicas con tools específicos que podrían ejecutarse: "¿por qué bajó el margen?", "¿quién está sobre-asignado?", "¿qué feriados vienen este mes?".
- Un chat generalista con 30+ tools sufre de degradación del prompt (dilución de atención, selection de tool incorrecto).
- Un chat scoped carga solo los 3-5 tools del dominio → mejor precisión, respuestas más rápidas, menos tokens.

## Goal

- `NexaThread` acepta prop `domainContext: DomainContext | null`.
- `NexaService` filtra tool declarations según `domainContext`.
- System prompt dinámico incluye expertise del dominio (ICO engine language, Finance glossary, etc.).
- Floating chat button disponible en surfaces principales con contexto pre-loaded.
- Home chat sigue funcionando como generalista (sin `domainContext`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_NEXA_EXPANSION_V1.md` — follow-on contextual chat.
- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md` — chat architecture canónica.
- `docs/architecture/GREENHOUSE_NEXA_AGENT_SYSTEM_V1.md` — tool calling.

Reglas obligatorias:

- **No romper el chat generalista existente** en Home. Si `domainContext` no se pasa, el comportamiento es igual a hoy.
- Tools se registran por dominio, no hardcoded en una lista gigante.
- El system prompt dinámico debe seguir el contrato actual (idioma, tono, disclaimer).
- Entitlements siempre gatean tools: un usuario sin acceso a Finance no ve tools Finance en el chat aunque esté en esa URL.
- Persistencia del thread: los threads scoped a dominio se marcan con `domain_context` para facilitar historial filtrado.

## Normative Docs

- `src/lib/nexa/nexa-service.ts`
- `src/lib/nexa/nexa-tools.ts`
- `src/components/greenhouse/nexa/NexaThread.tsx` (verificar path)
- `greenhouse_ai.nexa_threads` schema

## Dependencies & Impact

### Depends on

- TASK-110 Slice 2 (tool calling completo). Sin tools funcionales, el contextual chat no aporta.

### Blocks / Impacts

- Beneficia todas las surfaces principales del portal.
- Open opportunity para telemetría: ¿qué dominios generan más preguntas al chat? → prioridad de tools.

### Files owned

- Migración PG: `greenhouse_ai.nexa_threads.domain_context TEXT NULL`
- `src/lib/nexa/nexa-service.ts` (modificación)
- `src/lib/nexa/nexa-tools.ts` (refactor para registro por dominio)
- `src/lib/nexa/domain-prompts/` (nuevo) — system prompts por dominio
- `src/components/greenhouse/nexa/NexaThread.tsx` (modificación)
- Integración en layouts/pages principales: Finance, Agency, HR, People, etc.
- Nuevo floating button component (si no existe): `NexaFloatingChat.tsx`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Domain registry

- `src/lib/nexa/domain-registry.ts`:
  - `type DomainContext = 'finance' | 'ico' | 'payroll' | 'people' | 'agency' | 'delivery' | ...`
  - Cada dominio registra: list of tool names, system prompt addendum, suggestions por default.
- Refactor de `nexa-tools.ts`: agrupar tools por dominio en vez de lista plana.

### Slice 2 — Service extension

- `NexaService.generateResponse(input)` acepta `domainContext?: DomainContext`.
- Si se pasa: carga solo tools del dominio + tools globales (threads, feedback), inyecta system prompt del dominio.
- Si no: comportamiento actual (tools globales).

### Slice 3 — Thread persistence

- Migración PG: `nexa_threads.domain_context TEXT NULL`.
- Thread creado con `domainContext` queda marcado.
- Sidebar de threads permite filtrar por dominio.

### Slice 4 — UI integration

- `NexaThread` acepta `domainContext` prop.
- Layouts de surfaces principales inyectan el context.
- Welcome message y suggestions iniciales se derivan del dominio.

### Slice 5 — Floating chat per surface

- `NexaFloatingChat` component: botón fijo bottom-right que abre drawer/panel.
- Visible en surfaces principales (Finance, Agency, HR, People).
- Pre-loaded con `domainContext` de la surface actual.
- Persiste thread entre navegaciones dentro del mismo dominio.

### Slice 6 — Tools iniciales por dominio

Implementar el set mínimo (validar en planning):

- **Finance:** `get_client_economics`, `breakdown_costs`, `explain_margin_variation`
- **ICO:** `get_otd_trend`, `find_space_anomalies`, `compare_cycle_metrics`
- **Payroll:** `query_period_status`, `find_overtime_spikes`, `lookup_reliquidation`
- **People:** `search_members`, `get_capacity_load`, `find_skills`
- **Agency:** `compare_spaces`, `find_struggling_clients`, `top_performers`

Cada tool es independiente y consume readers existentes (no duplica lógica).

### Slice 7 — Telemetría

- Registrar en `nexa_messages` o tabla adicional: `domain_context` al momento de la query.
- Dashboard admin expone: top domains by query volume, tool invocation stats.

## Out of Scope

- Extender a client portal chat (cliente tiene UX distinto). Follow-on.
- Tools que ejecutan mutaciones (advisory-only regla vigente).
- Memoria cross-thread del usuario (RAG sobre historial). Follow-on.
- Auto-detection del dominio desde texto libre del user. V1 usa `domainContext` explícito desde la URL.

## Acceptance Criteria

- [ ] Migración aplicada; `domain_context` persiste en threads nuevos.
- [ ] Home chat sigue funcionando como generalista (no regresión).
- [ ] Finance surface: el chat responde con tools Finance sin que el usuario deba explicarlo.
- [ ] Entitlements respetados: sin acceso al dominio → sin tools del dominio.
- [ ] Floating chat visible en al menos 4 surfaces principales.
- [ ] Telemetría registra domain_context en las queries.
- [ ] `pnpm build && pnpm lint && npx tsc --noEmit && pnpm test` pasan.
- [ ] Validación manual: hacer la misma pregunta ("¿por qué bajó el margen?") en Home vs Finance y validar que Finance responde mejor/más preciso.

## Verification

- Tests unitarios de domain registry y tool filtering.
- Tests de integración: request con domainContext → solo tools del dominio ejecutados.
- Validación manual end-to-end en staging.

## Closing Protocol

- [ ] Actualizar `GREENHOUSE_NEXA_ARCHITECTURE_V1.md` con contextual chat.
- [ ] Actualizar `GREENHOUSE_NEXA_EXPANSION_V1.md` con follow-on cerrado.
- [ ] Registrar en `Handoff.md` y `changelog.md`.

## Open Questions

- ¿El floating chat persiste el mismo thread entre recargas del browser dentro del mismo dominio, o siempre empieza thread nuevo? Recomendación: persistir últimos 2h, después thread nuevo.
- ¿Cuando el usuario navega de Finance a Agency, se migra el thread o se crea uno nuevo? Recomendación: nuevo thread (dominio distinto → contexto distinto).
- ¿Home chat se mantiene con tools globales o migra a un "meta-domain"? Home queda como está — generalista es útil ahí.

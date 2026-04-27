# TASK-698 — Nexa Conversation Drawer (cierre del Hero AI)

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio` (~2 semanas, 1 dev senior)
- Type: `implementation`
- Status real: `Diseño cerrado, listo para Slice 1`
- Rank: `TBD`
- Domain: `platform / ai-tooling`
- Blocked by: `none` (Vertex AI wiring necesario en Slice 2 — provisionable en paralelo a Slice 1)
- Branch: `task/TASK-698-nexa-conversation-drawer`

## Summary

Cerrar el flow del Hero AI del Smart Home v2 (TASK-696) con un **right drawer overlay** que monta el chat real de Nexa al despachar la prompt. Hoy el composer del Hero hace `router.push('/home?nexa=<text>')` pero **nadie escucha el searchParam** — la prompt queda flotando en la URL y el user no recibe respuesta. El drawer cierra el loop manteniendo el contexto del Home (Pulse / Runway / Inbox visibles detrás), patrón Linear AI / Notion AI / Vercel v0.

## Why This Task Exists

El Hero AI es la promesa central del Smart Home: "Tu operación al alcance de una pregunta". Hoy esa promesa está rota — el composer es un dead-end UI:

1. User escribe "Hola" en el Hero composer
2. Form submit → `router.push('/home?nexa=Hola')`
3. URL muestra `/home?nexa=Hola`
4. **Ningún consumer** (ni HomeHeroAi, ni HomeShellV2, ni page.tsx) lee `searchParams.get('nexa')`
5. No hay drawer que abra, no hay `POST /api/ai/chat`, no hay despacho al servicio AI
6. User percibe "no se envió" → erosión de confianza en el portal

Sin esta task, el Hero AI es decorativo. Con esta task, Nexa pasa de ser un widget de insights a ser un copiloto operativo conversacional gated por entitlements.

## Goal

- Drawer Nexa lanzado desde el Hero, controlado por `?nexa=<prompt>` searchParam
- Chat multi-turn streaming sobre `@assistant-ui/react` + Vertex AI Gemini 2.5 Flash
- Tools tipadas role-aware sobre la canonical 360 (no embeddings — RAG-by-tools)
- Capability gate server-side (`home.nexa.chat`) + tool selection per audience
- Audit trail completo en `nexa_conversation_turns` para compliance enterprise
- A11y floor WCAG 2.2 AA + reduced-motion + `inert` background
- Kill switch via `home_block_flags` (mismo patrón Wave 6)

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` — capa Nexa
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — capability gate pattern
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` — versioned contracts
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — registrar módulo `ai.nexa`
- `src/lib/home/registry.ts` — patrón composer + capability gate (TASK-696 Wave 6)

Reglas obligatorias:

- Contract versionado `nexa-chat.v1` (additive, non-breaking)
- Capability gate server-side antes de invocar Vertex AI
- Tool registry per role bound a `entitlements`, NO a route groups
- Streaming SSE con `Vary: x-tenant-id`
- Telemetría per turn (lat, tokens, tools invocados)
- Reduced-motion + focus trap + Esc cierre estándar MUI Drawer

## Dependencies & Impact

### Depends on

- TASK-696 (Smart Home v2) — el Hero compose ya existe con `?nexa=` push
- `@assistant-ui/react@0.12` — instalado, no activado
- Vertex AI Gemini 2.5 Flash — provisión SA + IAM (paralelo Slice 2)
- `getTenantEntitlements()` — capability binding

### Blocks / Impacts

- Hero AI deja de ser dead-end — primera surface conversacional real
- Base para futuras AI features (Nexa proactive, Nexa scheduled briefs, Nexa @mention reply)
- Cierra TASK-695 (Nexa via Notification Hub) → digest + chat sincrónico = paridad
- Si existe TASK-680 "Nexa floating helper" → absorbido por esta task

### Files owned

**NUEVOS**:

- `src/components/greenhouse/nexa/NexaConversationDrawer.tsx` — surface
- `src/components/greenhouse/nexa/NexaThread.tsx` — `<Thread>` wrapper sobre assistant-ui
- `src/components/greenhouse/nexa/NexaCitationChip.tsx` — chips inline para tool citations
- `src/lib/nexa/chat/types.ts` — `NexaChatRequestV1`, `NexaChatMessageV1`, `NexaToolInvocationV1`
- `src/lib/nexa/chat/system-prompts.ts` — system prompts per audience (admin/finance/hr/delivery/collaborator/client)
- `src/lib/nexa/chat/tool-registry.ts` — tools tipadas + capability bindings
- `src/lib/nexa/chat/tools/finance.ts` — getMargin, getRunway, listAtRiskInvoices
- `src/lib/nexa/chat/tools/delivery.ts` — getOTD, getStuckTasks, getSpacesAtRisk
- `src/lib/nexa/chat/tools/team.ts` — getCapacityOverloaded, getPendingApprovals
- `src/lib/nexa/chat/tools/insights.ts` — searchInsights sobre `ico_ai_signal_enrichment_history`
- `src/lib/nexa/chat/dispatcher.ts` — orquestador Vertex AI + tool calling
- `src/app/api/ai/nexa/chat/route.ts` — `POST` SSE streaming endpoint
- `migrations/<ts>_nexa-conversation-turns.sql` — audit table
- `src/views/greenhouse/home/v2/HomeNexaConversation.tsx` — wrapper que monta drawer en HomeShellV2

**MODIFICADOS**:

- `src/views/greenhouse/home/v2/HomeShellV2.tsx` — montar `<NexaConversationDrawer>` keep-mounted
- `src/views/greenhouse/home/v2/HomeHeroAi.tsx` — submitPrompt mantiene el push, pero ahora HAY consumer
- `src/config/entitlements-catalog.ts` — capability `home.nexa.chat`
- `src/lib/entitlements/runtime.ts` — bind `home.nexa.chat` a todos (igual que `home.briefing.daily`)
- `src/lib/reliability/registry.ts` — módulo `ai.nexa` con `incidentDomainTag: 'ai.nexa'`
- `src/lib/observability/capture.ts` — domain `ai.nexa` registrado
- `src/lib/home/flags.ts` — kill switch `nexa-conversation-drawer` agregado a `ALL_BLOCKS` (lección de Wave 6 deploy)

## Current Repo State

### Already exists

- Hero composer con form submit → `router.push('/home?nexa=<text>')` ([HomeHeroAi.tsx:60-65](src/views/greenhouse/home/v2/HomeHeroAi.tsx#L60-L65))
- `@assistant-ui/react@0.12` instalado en `package.json`
- Capability framework canónico (`can()`, `getTenantEntitlements`, capability catalog)
- Vertex AI client en `src/lib/ai/` (usado por LLM enrichments ICO + Briefing Wave 6)
- Composer pattern role-aware probado (TASK-696 Wave 6 con audiences + capability gate)
- `NexaMentionText` para parsing `@[Label](kind:id)` chips
- Sentry `captureWithDomain` patrón canónico
- Reliability Control Plane registry + AI Observer pattern

### Gap

- Hero AI no tiene receiver del searchParam (causa raíz del bug "no se envía")
- No existe `NexaConversationDrawer` ni surface conversacional
- No existe endpoint `/api/ai/nexa/chat` con streaming
- No existe tool registry tipado role-aware
- No existe capability `home.nexa.chat` ni binding
- No existe tabla `nexa_conversation_turns` para audit
- No existe módulo `ai.nexa` en Reliability registry

## Scope

### Slice 1 — Drawer Shell (día 1-2)

- `<NexaConversationDrawer>` montado en `HomeShellV2`, abre cuando `?nexa=*`, cierra `router.replace('/home')`
- MUI `Drawer` anchor right, `keepMounted`, width responsive `{ xs: '100vw', sm: 480, md: 560 }`
- Animación `cubic-bezier(0.2, 0, 0, 1)` 220ms + `useReducedMotion` gating
- Backdrop fade 150ms, `inert` background
- `<Thread>` empty state con suggested chips role-aware (mismos del Hero) + header `Nexa · IA Operativa` + chip `Gemini 2.5 Flash` + chip de scope
- Esc / backdrop / button cierre — preserva thread, solo oculta drawer
- A11y: `role="dialog"` `aria-modal="true"` `aria-labelledby` + focus trap + return focus al input del Hero

### Slice 2 — API + 1 tool (día 3-5)

- `POST /api/ai/nexa/chat` con `requireUserSession` + capability gate `home.nexa.chat`
- Vertex AI Gemini 2.5 Flash con SSE streaming
- 1 tool funcional: `searchInsights(query, severity?)` sobre `greenhouse_serving.ico_ai_signal_enrichment_history`
- System prompt minimal per audience (admin recibe scope organization, finance scope finance-only, etc)
- Body validado con `nexa-chat.v1` schema
- Response stream con `Vary: x-tenant-id` + timeout 30s + degraded card "Reintentar"
- 0 audit aún (Slice 5)

### Slice 3 — Hand-off Hero → Drawer (día 5)

- Drawer detecta `?nexa=<prompt>` con valor → `append({ role: 'user', content })` automático + `runStream()`
- User ve mensaje aparecer instant + typing indicator + token streaming
- Después del primer turn, `router.replace('/home?nexa=open')` para limpiar URL
- Hero composer queda enabled mientras drawer abierto (atajo: enviar otra prompt cierra y abre nueva o continúa thread — decisión UX en el slice)

### Slice 4 — Tools per audience (día 6-8)

- Tool registry completo: `finance.*`, `delivery.*`, `team.*`, `insights.*`
- Cada tool con `Zod` schema input + JSON schema para Vertex
- Server-side filter en dispatcher: `getAvailableTools(entitlements, audienceKey)` deriva tools del role
- CEO: todas. Finance: finance.* + insights. HR: team.* + insights. Delivery: delivery.* + insights. Collaborator: insights only.
- Citations: cada tool result llega con `citationLabel` + `drillHref` → assistant las renderiza como `<NexaCitationChip>` clickables

### Slice 5 — Persistence + audit + observability (día 9)

- Migration `nexa_conversation_turns` (id, user_id, audience_key, role_codes, prompt_hash, response_hash, tools_invoked jsonb, latency_ms, tokens_in, tokens_out, created_at)
- Insert per-turn after stream completes
- Métricas Sentry domain `ai.nexa`: `nexa.turn.duration`, `nexa.turn.tokens`, `nexa.tool.invocations`, `nexa.error.rate`
- Reliability registry: módulo `ai.nexa` con `incidentDomainTag: 'ai.nexa'` + `expectedSignalKinds: ['incident', 'freshness']`
- Kill switch row template para `home_block_flags` (block_id `nexa-conversation-drawer`)

### Slice 6 — Polish UX enterprise (día 10)

- @mentions live: assistant genera `@[Space:abc]` y `<NexaMentionText>` los renderiza como chips clickables que abren entity drawer
- Mobile: drawer 100vw, header sticky, input sticky bottom, swipe-down to close, keyboard-aware
- Loading skeleton entre turns (no spinners)
- Error state inline (no toast) cuando tool falla — pattern Linear "X tool unavailable, results may be incomplete"
- Streaming announcement vía `role="log"` `aria-live="polite"` para screen readers
- Reduced-motion: drawer instant + thread sin typing indicator

## Out of Scope

- Vector embeddings / RAG sobre full corpus (las tools tipadas cubren 90% con menor lat + cost)
- Persistencia cross-session resumida (Slice 5 solo guarda turns para audit, no rehidrata thread por defecto — futuro)
- Voice input
- File upload / multimodal (solo texto en este corte)
- Slack / Teams bridge del chat (TASK-695 cubre digest async, esta task es sincrónica in-portal)
- Página standalone `/asistente` (rompe contexto del Home — anti-pattern)
- Modal centrado (peor UX para multi-turn)
- Auto-suggest de prompts mid-typing (futuro Slice 7)
- Compartir conversación (futuro)

## Acceptance Criteria

- [ ] `?nexa=<prompt>` abre drawer y dispara primer turn automático
- [ ] Streaming SSE visible en `<Thread>` (tokens aparecen progresivamente)
- [ ] Esc / backdrop / button cierre — preserva thread
- [ ] `?nexa=open` mantiene drawer sin re-disparar prompt
- [ ] Capability gate: user sin `home.nexa.chat` recibe 403 (no crash)
- [ ] Tools filtradas per audience: finance role NO ve `delivery.*` tools en system prompt
- [ ] Citations chips clickables en respuestas que invocan tools
- [ ] @mentions live renderean como chips clickables (NexaMentionText)
- [ ] Audit row escrita en `nexa_conversation_turns` per turn
- [ ] Kill switch funcional: row `enabled=false` en `home_block_flags` deshabilita drawer (Hero muestra empty state mantenimiento)
- [ ] Reduced-motion: sin animación, instant open
- [ ] Focus trap dentro del drawer + return al input del Hero al cerrar
- [ ] Mobile: drawer 100vw, swipe-down cierre
- [ ] Reliability registry expone módulo `ai.nexa` con signals
- [ ] Sentry domain `ai.nexa` recibe errores con `captureWithDomain`
- [ ] `pnpm build` + `pnpm lint` + `pnpm test` + `npx tsc --noEmit` pasan
- [ ] E2E captura screenshot del drawer abierto con conversación real (Playwright + Agent Auth)

## Verification

- Trigger manual desde Hero: enviar "¿Cuál es el margen del mes?" → drawer abre → invoca `searchInsights` o `finance.getMargin` → respuesta streaming con citation chip
- Test capability gate: agente E2E sin `home.nexa.chat` recibe 403
- Test kill switch: insertar row `home_block_flags(block_id='nexa-conversation-drawer', enabled=false)` → drawer no abre
- Reliability dashboard: módulo `ai.nexa` aparece OK
- Audit query: `SELECT * FROM greenhouse_serving.nexa_conversation_turns ORDER BY created_at DESC LIMIT 5` muestra turns recientes con tools_invoked

## Closing Protocol

- [ ] Actualizar `GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` con canal de chat sincrónico
- [ ] Crear `docs/documentation/ai-tooling/nexa-asistente-conversacional.md`
- [ ] Cross-impact delta a TASK-696 (Hero AI ahora cierra el loop)
- [ ] Cross-impact delta a TASK-695 (digest + chat = paridad async/sync)
- [ ] Si TASK-680 existe → marcar absorbido y completar
- [ ] Handoff.md + changelog.md actualizados

## Follow-ups

- Slice 7 — auto-suggest mid-typing (Cmd+/ inline completions)
- Persistencia cross-session con rehidratación opcional (toggle UI)
- Compartir conversación (URL deep-link a thread específico)
- Voice input (mobile primarily)
- Multimodal: pegar screenshot de Pulse / Runway → Nexa interpreta
- Slack / Teams bridge: comando `/nexa` desde channels que llama el mismo backend
- Proactive Nexa: drawer abre solo cuando hay incidente detectado
- Nexa @mention reply en Notification Hub: responder a un mention abre drawer pre-poblado

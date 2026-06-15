# Técnico — Modelos LLM, provider abstraction y routing

> **Código:** [`src/config/nexa-models.ts`](../../../../src/config/nexa-models.ts), [`nexa-provider.ts`](../../../../src/lib/nexa/nexa-provider.ts), [`providers/`](../../../../src/lib/nexa/providers/), [`nexa-model-router.ts`](../../../../src/lib/nexa/nexa-model-router.ts), [`src/lib/ai/`](../../../../src/lib/ai/).

## Modelos en uso

| Provider | Model ID (Nexa) | SDK model | Uso |
|---|---|---|---|
| Google (Vertex) | `google/gemini-2.5-flash@default` | `google/gemini-2.5-flash@default` | **Default** de Nexa (chat Home/flotante, operativo en vivo) |
| Google (Vertex) | `google/gemini-2.5-pro@default` | idem | Picker (modelo más capaz on-demand) |
| Google (Vertex) | `google/gemini-3-*-preview@default` | idem | Picker (preview, opt-in) |
| Anthropic | `anthropic/claude-sonnet-4-6@default` | `claude-sonnet-4-6` | **Router-internal** para preguntas de conocimiento (NO en el picker) |

- **Shape del ID**: `provider/model@version`. `resolveNexaProviderKey(id)` deriva el provider;
  `resolveNexaSdkModel(id)` deriva el string que recibe el SDK (Gemini recibe el ID verbatim —
  comportamiento Vertex actual; Anthropic recibe el id limpio `claude-sonnet-4-6`).
- `DEFAULT_NEXA_MODEL = google/gemini-2.5-flash@default`; `DEFAULT_NEXA_ANTHROPIC_MODEL = anthropic/claude-sonnet-4-6@default`.
- El **picker visible** (`NEXA_MODEL_OPTIONS`) es solo-Gemini. Claude es router-internal (no seleccionable).

## Provider abstraction

`NexaChatProvider` (interfaz: `resolveTurn` 2-pass tool loop + `generateSuggestions`). Adapters:
- `providers/gemini.ts` — `@google/genai` vía Vertex/ADC (`getGoogleGenAIClient` en `src/lib/ai/google-genai.ts`).
- `providers/anthropic.ts` — Messages API (`getAnthropicClient` en `src/lib/ai/anthropic.ts`; secret
  `greenhouse-anthropic-api-key`, `ANTHROPIC_API_KEY_SECRET_REF`).

`nexa-service.ts` es el **orquestador provider-agnóstico**: arma system prompt + contexto + Answer
Rules de knowledge, y delega el "hablar con el modelo" al adapter. El tool `search_knowledge` y las
Answer Rules son **provider-agnósticos** — el swap de provider NO los toca.

## Routing interno (auto-router)

`NEXA_AUTO_ROUTER_ENABLED` activa: `classifyNexaIntent(prompt)` → `NexaIntent` (`knowledge` |
`operational` | `general`) → `routeNexaProviderKey`: **Claude** solo cuando intent=`knowledge` AND
`NEXA_KNOWLEDGE_RETRIEVAL_ENABLED`; resto → **Gemini**. `nexaProviderFailoverChain` define primario +
respaldo (si el primario falla, failover al otro). Precedencia completa: modelo pedido > pin
`NEXA_PROVIDER` > auto-router > default Gemini. Detalle de comportamiento: [`../03-behavior-and-routing.md`](../03-behavior-and-routing.md).

## Caveats técnicos (no regresionar)

- **Gemini function-calling shape (ISSUE-092)**: el `functionResponse` del follow-up se construye
  `{ name, response }` SIN `id` (match por nombre/orden). `createPartFromFunctionResponse` inyecta un
  `id` huérfano que Gemini 2.5 rechaza → rompe el tool-calling. NO usarlo.
- **Anthropic exige `tool_use_id`** en cada `tool_result` (correcto, no huérfano — distinto de Gemini).
  El workaround de Gemini es Gemini-específico.
- **Local vs staging/prod**: `/api/home/nexa` resuelve **Gemini** localmente; en staging/prod el
  auto-router manda conocimiento a **Claude**.

## Secrets

- Gemini/Vertex: ADC (`getGoogleGenAIClient`).
- Anthropic: `greenhouse-anthropic-api-key` (GCP Secret Manager), resuelto server-side vía
  `resolveSecretByRef`. **NUNCA** hardcodear `sk-ant-*` ni instanciar el SDK fuera de `src/lib/ai/`.

## Reglas duras

- ❌ NUNCA instanciar un SDK LLM dentro de un dominio (usar `src/lib/ai/*`).
- ❌ NUNCA exponer el modelo Anthropic en el picker (es router-internal).
- ❌ NUNCA copiar el workaround de Gemini (functionResponse sin id) al adapter Anthropic.
- ✅ Provider nuevo → implementar `NexaChatProvider` + agregar el ID `provider/model@version` a
  `nexa-models.ts` + extender el router; el orquestador no cambia.

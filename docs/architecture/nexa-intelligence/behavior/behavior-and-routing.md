# 03 — Comportamiento + Routing

> **Capa:** Comportamiento + routing de provider. **Código:** [`nexa-service.ts`](../../../../src/lib/nexa/nexa-service.ts), [`nexa-model-router.ts`](../../../../src/lib/nexa/nexa-model-router.ts), [`nexa-provider.ts`](../../../../src/lib/nexa/nexa-provider.ts), [`providers/`](../../../../src/lib/nexa/providers).
> **Detalle técnico de modelos:** [`technical/llm-models.md`](../technical/llm-models.md).

## Qué hace Nexa por turno

```text
prompt del usuario
  → NexaService.generateResponse (orquestador provider-agnóstico)
    → buildProviderPlan (elige provider primario + cadena de failover)
    → buildSystemPrompt (artefacto versionado V1/V2)
    → provider.resolveTurn (2-pass tool loop: el modelo decide tool → se ejecuta → 2da pasada compone)
      → tool search_knowledge (si aplica) → packet knowledge-search.v1
    → generateSuggestions
  → NexaResponse { content, toolInvocations, suggestions, modelId }
```

## Ruteo de tools (decidido por el prompt)

| Intención | Acción |
|---|---|
| Proceso / política / guía / definición / "cómo se hace X" | `search_knowledge` ANTES de responder |
| Dato operativo en vivo (su nómina, OTD, correos, capacidad, cuentas por cobrar) | tool operativo correspondiente; NUNCA desde Knowledge |
| **"¿Cuánto cobré / por qué cobré eso?" (pago PROPIO del colaborador)** | **`explain_my_pay`** (TASK-1146) — líquido + desglose regime-aware del **propio** member (anti-oracle por `context.memberId`); NUNCA el pago de otro ni el agregado de la nómina (eso es `check_payroll`, operador) |
| Conversación general / aclaración / siguiente paso | sin tool, responde directo |
| Tool no disponible (permisos/datos) | lo dice con honestidad + ofrece el camino real |

**Catálogo de tools operativos (member/operador):** `check_payroll` (operador, agregado del período), `explain_my_pay` (member-self, pago propio + por qué, TASK-1146), `get_otd`, `check_emails`, `get_capacity`, `pending_invoices`, `search_knowledge`. Cada uno gateado por `isAvailable`; `explain_my_pay` solo con `memberId` y reusa `buildReceiptPresentation` (regime-aware, NUNCA recomputa).

## Ruteo de provider (interno, NUNCA expuesto al usuario)

`buildProviderPlan` decide en este orden de precedencia:

1. **Modelo pedido explícito** (soportado, del picker) → gana, deriva su provider, single (sin failover).
2. **Pin `NEXA_PROVIDER`** → single, sin failover (intención del operador).
3. **Auto-router `NEXA_AUTO_ROUTER_ENABLED`** → primario por **intención** + failover al otro provider.
   - `classifyNexaIntent` clasifica la pregunta; `routeNexaProviderKey` elige: **Claude** solo cuando
     intención = `knowledge` AND `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED`; resto → Gemini.
4. **Default** → Gemini (idéntico al comportamiento previo a la abstracción de provider).

La selección de modelo es **100% interna**. El picker visible sigue solo-Gemini; Claude es
router-internal. Observabilidad: `NexaResponse.modelId` (persistido; provider derivable).

> **Importante (local vs staging/prod):** la ruta del chat flotante/Home `/api/home/nexa` resuelve
> **Gemini** localmente. En staging/prod con el auto-router ON, las preguntas de conocimiento van a
> **Claude**. Por eso una compliance de prompt puede variar entre local y staging.

## Response modes (elige por intención)

`definición` · `cómo-hacer` · `política` · `troubleshooting` · `comparación` · `operativo en vivo` ·
`sin-respuesta`. (Definidos en el módulo `responseModes` del prompt V2.)

## Honestidad (gaps + degradación)

- Si la evidencia de Knowledge es insuficiente → gap honesto ("no encontré una guía publicada…"), no inventa.
- Si piden el estado real y no se consultó un tool en vivo → lo dice.
- Si un tool falla por permisos/datos → lo nombra + ofrece el camino real.

## Contrato de error del endpoint (TASK-1131)

`/api/home/nexa` (+ sus handlers hermanos `feedback/`, `threads/`, `threads/[threadId]`) es el backend
compartido del chat (legacy embebido + flotante global). Todos sus errores que cruzan al cliente usan
el **contrato de error canónico** (`canonicalErrorResponse`, es-CL + `code` + `actionable`):

- Sin sesión → `unauthorized` (401). Sin prompt → `nexa_prompt_required` (422).
- Fallo de generación → `nexa_generation_failed` (500, `actionable: true` — es transitorio; reintentar suele resolver).
- Fallos de store (feedback/threads) → `internal_error` (500).

Todo fallo se captura con `captureWithDomain(error, 'home', { tags: { source: 'nexa_*_endpoint' } })`
→ se rolea al módulo **Home** del reliability dashboard. El detalle técnico se redacta
(`redactErrorForResponse`) hacia Sentry, **NUNCA** al cliente. El cliente (`use-nexa-runtime`) lee
`errorBody.error` → ahora es-CL canónico por construcción.

## Reglas duras

- **NUNCA** devolver `error.message` crudo (ni prosa inglesa) al cliente desde un handler del chat. Usar `canonicalErrorResponse` + `captureWithDomain('home', …)`. (Bug-class cerrado en TASK-1131.)
- **NUNCA** exponer la selección de modelo al usuario.
- **NUNCA** instanciar un SDK LLM dentro de un dominio: Gemini vía `getGoogleGenAIClient`, Anthropic
  vía `getAnthropicClient` (`src/lib/ai/*`). Detalle: [`technical/llm-models.md`](../technical/llm-models.md).
- **NUNCA** responder un dato operativo en vivo desde Knowledge.
- **NUNCA** acoplar el tool/Answer Rules a un SDK: el swap de provider NO debe tocar `search_knowledge`.

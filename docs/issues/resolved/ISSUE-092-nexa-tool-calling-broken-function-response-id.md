# ISSUE-092 — Nexa tool-calling roto: `id` huérfano en `functionResponse` (Gemini 2.5 / @google/genai 1.45.0)

> **Estado:** Resolved
> **Ambiente:** Production runtime (Nexa chat — `src/lib/nexa/nexa-service.ts`)
> **Detectado:** 2026-06-12 (smoke de TASK-1085, mi cambio surfaceó el bug latente)
> **Resuelto:** 2026-06-12

## Síntoma

**Cualquier respuesta de Nexa que invocara un tool fallaba con HTTP 400.** El modelo decidía llamar un tool (function-calling), el tool se ejecutaba correctamente, pero el **segundo pass** (follow-up que alimenta el resultado del tool de vuelta a Gemini para componer la respuesta) reventaba con:

```
ApiError 400: Invalid JSON payload received. Unknown name "id" at
'contents[2].parts[0].function_response': Cannot find field.
```

Afecta a TODOS los tools de Nexa (`check_payroll`, `get_otd`, `check_emails`, `get_capacity`, `pending_invoices`). Verificado live: con el flag de knowledge OFF (tool nuevo ni cargado), `check_payroll` falla idéntico.

## Causa raíz

En `NexaService.resolveToolTurn` (`src/lib/nexa/nexa-service.ts`), la construcción del follow-up era **asimétrica**:

- El `functionCall` part se construye con `createPartFromFunctionCall(call.name, call.args)` → **sin `id`** (Gemini lo acepta).
- El `functionResponse` part se construía con `createPartFromFunctionResponse(invocation.toolCallId, …)` donde `toolCallId = call.id || crypto.randomUUID()`. Como Gemini **no** entrega `call.id` (los IDs de function call son un concepto de OpenAI; Gemini matchea por nombre/orden), se inyectaba un **UUID random** → el `functionResponse` llevaba un campo `id` huérfano.

El schema de `functionResponse` de **Gemini 2.5 (Vertex `generateContent`) no tiene campo `id`** → 400. El helper `createPartFromFunctionResponse` de `@google/genai@1.45.0` lo inyecta indebidamente para ese surface.

## Impacto

Nexa no podía completar ninguna respuesta basada en tools. Latente (probablemente desde un bump de `@google/genai`); destapado por el smoke end-to-end de TASK-1085 (el primer flujo que invoca un tool de forma fiable y verifica el loop completo).

## Solución (raíz, no parche)

Construir el `functionResponse` part **según el schema real de Gemini 2.5** (`{ name, response }`, sin `id`), consistente con el `functionCall` (que tampoco lleva id y sí se acepta). Gemini matchea call↔response por **nombre + orden** — que es exactamente como el código ya arma ambos arrays (mismo orden, `Promise.all` preserva posición). Robusto para 1 tool, N tools paralelos y tools repetidos (match posicional).

```ts
// antes (roto):
createPartFromFunctionResponse(invocation.toolCallId, invocation.toolName, invocation.result)
// después (raíz):
({ functionResponse: { name: invocation.toolName, response: invocation.result } })
```

Se removió el import `createPartFromFunctionResponse` (ya sin uso).

## Verificación

Smoke end-to-end live (Vertex `gemini-2.5-flash`): Nexa llama `search_knowledge`, recupera 6 chunks del corpus real y responde **con citas** ("Motor ICO: métricas operativas [2]") + definiciones reales, sin inventar. 16 tests de `src/lib/nexa/` verdes. `check_payroll` (que también fallaba) queda igualmente desbloqueado.

## Por qué no es un parche

No se envolvió el error en try/catch ni se special-casó el tool nuevo. Se corrigió la construcción del part en el **path compartido** → arregla todos los tools. Alineado al contrato verdadero de la API (no a un helper que inyecta un campo que el modelo rechaza). Sin dependencia de un `id` frágil.

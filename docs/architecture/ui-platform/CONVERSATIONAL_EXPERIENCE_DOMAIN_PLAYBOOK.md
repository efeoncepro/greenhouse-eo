# Conversational Experience — Playbook: traer la experiencia rica a un dominio

> **Tipo:** Playbook de implementación (agent-facing) · **Creado:** 2026-06-13 (TASK-1101) · **Ejemplo trabajado:** Knowledge (lente Nexa de `/knowledge`)
> **Contrato canónico:** [`CONVERSATIONAL_EXPERIENCE.md`](./CONVERSATIONAL_EXPERIENCE.md) · **Skill:** `greenhouse-nexa-conversational`

Este playbook documenta **cómo dar a un dominio la experiencia conversacional rica** (`NexaAnswersCanvas`: coreografía de 11 estados, citas inline, proof, response toolbar, streaming-reveal) cableada a **datos reales del dominio**. Es la receta que ejecutó TASK-1101 para llevar el canvas rico a la superficie viva de `/knowledge` — y la plantilla para cualquier dominio futuro (finance, agency, people, commercial).

## El invariante que ordena todo: **consumer, no destino**

`NexaAnswersCanvas` es el **producto transversal**. Un dominio es un **consumer** del canvas — el primero fue Knowledge, no es el dueño. Por eso:

> **Todo lo del dominio (el mapeo de datos, el copy, los handlers, los slots de proof de dominio) vive en el CONSUMER. La primitive NUNCA conoce el dominio.**

Si algo huele a `knowledge*`/`finance*` dentro de `src/components/greenhouse/primitives/nexa-answers-canvas/**` o de los feature-primitives (`NexaProvenanceTrace`/`NexaResponseToolbar`/`NexaStreamingText`), está en el lugar equivocado → va al consumer.

La frontera transversal/dominio es la misma de TASK-1108: built-ins transversales (proof tabs `sources`/`trace`/`packet`, todos driven por `nexa-evidence.v1`) vs slots de dominio (`content`, p.ej. el tab `Evals` de Knowledge).

## Qué escribe un dominio vs qué reusa

| Pieza | ¿La escribe el dominio? | Dónde vive | Ejemplo Knowledge (TASK-1101) |
|---|---|---|---|
| **Domain adapter** `packet → NexaAnswersRenderPlan` | **Sí** (pura) | `src/lib/<dominio>/nexa/` | `src/lib/knowledge/nexa/knowledge-answer-render-plan.ts` |
| **`surfaceContext`** (domain/placement/sensitivity/allowedRenderers) | **Sí** (declarativo) | el lens host | `SURFACE_CONTEXT` en `KnowledgeNexaCanvasLens.tsx` |
| **Lens host** (máquina de estados + fetch + handlers) | **Sí** (self-contained) | `src/views/greenhouse/<dominio>/` | `src/views/greenhouse/knowledge/KnowledgeNexaCanvasLens.tsx` |
| **Flag de cutover de presentación** (default OFF) | **Sí** | `src/lib/<dominio>/nexa/` + la page server | `canvas-lens-flag.ts` + `page.tsx` |
| **Cita inline** `chunk → NexaCitationSource` | **Reusa** | `src/lib/nexa/` | `mapKnowledgeChunkToCitationSource` (TASK-1092) |
| **Evidencia** `packet → ConversationalEvidencePacket` | **Reusa** | `src/lib/nexa/` | `knowledgePacketToConversationalEvidence` |
| **El canvas + coreografía + feature-primitives** | **Reusa** (cero copia) | `src/components/greenhouse/primitives/**` | `NexaAnswersCanvas`, `NexaProvenanceTrace`, … |

## Los 5 pasos (con el ejemplo Knowledge)

### 1 — Domain adapter: `packet → NexaAnswersRenderPlan` (puro, testeable)

El **puente de dominio**. Traduce el packet real del dominio al render plan **neutral** que el canvas consume. Vive en `src/lib/<dominio>/nexa/`. Cero IO, cero UI, cero React → testeable con fixtures.

- **Reusa** el citation mapper canónico para las citas inline (score verbatim, `href`=humanUrl, label normalizado). NO forkees.
- **Reusa** el evidence converter para el `proof`.
- **Honestidad (state-design):** sin datos (`confidence='none'` / 0 resultados) → **gap honesto** en el render plan (título "No encontré…", sin puntos, sin evidence, con `unavailableReason`). NUNCA una respuesta inventada.
- **Trust cue** derivado de la confianza/frescura del dominio (success/info/warning honestos).
- Emite **solo los renderers que tu `allowedRenderers` declara** (Knowledge: solo `answerBubble`). Validá con `assertNexaAnswersRenderPlanAllowed`.

Ref: `buildKnowledgeAnswerRenderPlan` (`src/lib/knowledge/nexa/knowledge-answer-render-plan.ts`) + sus 7 tests.

### 2 — `surfaceContext` (declarativo)

Declará el contrato de surface: `domain` + `placement` + `density` + `dataReality` + `sensitivity` + `allowedRenderers` (whitelist de seguridad) + `allowedActions`. Es lo único "de dominio" que ve el canvas — y es **datos**, no chrome.

```ts
const SURFACE_CONTEXT: NexaAnswersSurfaceContext = {
  surfaceId: 'knowledge.nexa.lens', domain: 'knowledge', placement: 'embedded',
  density: 'embeddedStandard', dataReality: 'strong', sensitivity: 'tenant_internal',
  allowedRenderers: ['answerBubble'], allowedActions: ['read', 'explain', 'suggest_followup']
}
```

Si tu dominio tiene un `kind` semántico, agregalo al resolver `kind→variant` del canvas resolviendo a un **variant existente** (`embedded`/`sidecar`/`inline`) — NUNCA un variant nuevo por dominio.

### 3 — Lens host: máquina de estados + fetch + handlers (self-contained)

Un componente cliente que **posee su conversación** (draft/estado/packet) y conduce la **coreografía de 11 estados** desde el lifecycle REAL:

- `idle` → (submit) → `thinking` (retrieval en vuelo) → `reasoning` (beat con la traza real, pasos animados + skeleton) → `answered` (renderPlan del adapter) → `proofOpen` (toggle).
- **`onStopGeneration`** → abort real del fetch + asienta honesto (si hay respuesta, la muestra; si no, vuelve al composer).
- **`degraded`** si el retrieval no responde; **`error`** si falla. Nunca un estado falso.
- **`onResponseControl`**: `regenerate` → re-retrieval; `helpful`/`unhelpful` → feedback real del dominio; `copy` self-contained (lo resuelve el canvas); `share` → permalink del dominio.
- Self-contained ⇒ el cutover es un swap mínimo en el host de la superficie (bajo riesgo de colisión).

Ref: `KnowledgeNexaCanvasLens` (`src/views/greenhouse/knowledge/KnowledgeNexaCanvasLens.tsx`).

### 4 — Cutover de PRESENTACIÓN flag-gated (default OFF)

Un flag **de presentación** (qué UI renderiza la lente), **ortogonal** al flag de retrieval del dominio. Default OFF → al merge la superficie viva queda exactamente como hoy. La page (server) resuelve el flag y lo pasa al view, que hace el swap `flag ? <CanvasLens/> : <surface legacy/>`.

```ts
// src/lib/knowledge/nexa/canvas-lens-flag.ts  (server-only)
export const isKnowledgeCanvasLensEnabled = () => process.env.NEXA_ANSWERS_CANVAS_LENS_ENABLED === 'true'
```

NO conflar con el flag de retrieval (`NEXA_KNOWLEDGE_RETRIEVAL_ENABLED`): uno habilita que Nexa RECUPERE, el otro decide QUÉ UI se ve.

### 5 — Verificación GVC (loop) + rollout gradual

- Scenario GVC que ejercita la interacción (click lente → escribir → submit → frames thinking/reasoning/answered). Corré con el dev server + el flag ON: `NEXA_ANSWERS_CANVAS_LENS_ENABLED=true pnpm dev` + `pnpm fe:capture <scenario> --env=local`. **Mirá los frames.**
- **El corpus/datos reales del dominio suelen vivir en staging, no en local** (lección ISSUE-094: la verificación del grounded-rico es mejor en staging — pool estable + datos). Local prueba wiring + estados + **degradación honesta** (gap sin datos).
- Rollout: flag ON staging → QA → sign-off → prod gradual. Rollback = flag OFF (la surface legacy queda intacta de fallback).

Ref: `scripts/frontend/scenarios/knowledge-nexa-canvas-lens.scenario.ts`. GVC TASK-1101 (2026-06-13): idle→thinking→reasoning→answered con corpus real, citas inline por punto, trust cue, response toolbar; 3 quality gates passed + enterpriseRubric pass.

## Hard rules (anti-regresión)

- **NUNCA** metas lógica/copy/tipos del dominio dentro de `NexaAnswersCanvas` ni de los feature-primitives. El adapter + el host viven en el consumer.
- **NUNCA** forkees el citation mapper ni el evidence converter — reusá los canónicos de `src/lib/nexa/`.
- **NUNCA** inventes una respuesta sin datos: gap honesto (`confidence='none'` → título "no encontré…", sin evidence).
- **NUNCA** un flag de presentación conflado con el de retrieval; default OFF; la page (server) lo resuelve.
- **NUNCA** declares la UI "lista" sin una captura GVC mirada (corpus real → staging).
- **NUNCA** emitas un renderer fuera de tu `allowedRenderers` (validá con `assertNexaAnswersRenderPlanAllowed`).
- **SIEMPRE** que un dominio nuevo emerja, escribí SU adapter + host + flag; el canvas no cambia. Si necesitás un renderer/feature nuevo, es trabajo de **primitive** (P+V+K completo), no del consumer.

## Procedencia

TASK-1101 (runtime promotion — primer consumer real: Knowledge). Compone TASK-1096 (canvas + coreografía + feature-primitives), TASK-1095 (`surfaceContext` SSOT), TASK-1083/1085 (`knowledge-search.v1` + reader), TASK-1092 (citation mapper, Codex), TASK-1108 (frontera transversal/dominio del proof).

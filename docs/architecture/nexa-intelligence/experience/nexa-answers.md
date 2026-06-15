# Experiencia — Nexa Answers

> **Vista Nexa Intelligence.** Surface canónica: `NexaAnswersCanvas`. Contrato de experiencia:
> [`conversational-experience.md`](conversational-experience.md) → [`../../ui-platform/CONVERSATIONAL_EXPERIENCE.md`](../../ui-platform/CONVERSATIONAL_EXPERIENCE.md).

## Qué es

**Nexa Answers** es la respuesta de Nexa **que se arma** en pantalla: la respuesta lidera, el host
persiste vivo, y la respuesta se ensambla (el chart se dibuja, el número cuenta 0→valor, las citas
aparecen). Es la materialización visual de un turno conversacional.

## Cómo se compone una respuesta

1. **Retrieval** (capa knowledge) → packet `knowledge-search.v1`.
2. **Domain adapter** `packet → NexaAnswersRenderPlan` (`nexa-answer-render-plan.v1`, puro): reusa el
   citation mapper + evidence converter canónicos; gap honesto sin datos; emite solo los renderers permitidos.
3. **`NexaAnswersCanvas`** renderiza el render plan con su `surfaceContext` (domain-neutral).
4. **Citas + evidencia** → `[n]` inline en el texto + `NexaProvenanceTrace`/`NexaEvidencePanel` (panel de fuentes).
5. **Revelado** → `NexaStreamingText` (revelado progresivo never-hidden; reduced-motion horneado).

## Relación con las capas

- **Qué dice** la respuesta: capa system-prompt (síntesis, voz, citas).
- **De dónde sale** la evidencia: capa knowledge (retrieval) + capa evidence (citas/fuentes).
- **Cómo se muestra/arma**: la experiencia conversacional (canvas + coreografía).
- **Qué número se anima**: sale del packet (`score`/valores reales), nunca inventado.

## Estados honestos

`answered` (respuesta + evidencia) · `degraded`/`error` (no inventar "Auditar"/estado falso) ·
`empty`/gap honesto ("no encontré una guía publicada"). El número del trace sale del packet.

## Reglas duras

- **NUNCA** una answer-surface por dominio: el dominio entra por `surfaceContext`, no por chrome.
- **NUNCA** fabricar un número/score que no salga del packet.
- **NUNCA** pintar estado de confianza falso — usar degraded/gap honesto.
- **SIEMPRE** citar `[n]` inline + mostrar las fuentes en el panel (la UI es dueña de la evidencia).

## Runtime construido

`NexaAnswersCanvas` cableado a `/knowledge` con retrieval real (flag `NEXA_ANSWERS_CANVAS_LENS_ENABLED`,
default OFF) + promovido a page del Design System "Nexa Answers Experience" (TASK-1110). Procedencia:
TASK-1096/1101/1110 (+ primitives 1103/1104/1105).

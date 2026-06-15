# Experiencia — Conversational Experience

> **Vista Nexa Intelligence.** Contrato canónico (SSOT): [`../../ui-platform/CONVERSATIONAL_EXPERIENCE.md`](../../ui-platform/CONVERSATIONAL_EXPERIENCE.md) + el domain playbook. Skill: `greenhouse-nexa-conversational`.

## Qué es

La **experiencia conversacional** es la forma en que una persona le pregunta algo a Nexa dentro de
Greenhouse y recibe una respuesta clara, confiable y con sus fuentes — **sin salir del contexto en
el que estaba**. La superficie canónica es `NexaAnswersCanvas` (domain-neutral): la respuesta
**lidera** y **se arma**.

## Principios (que esta capa hereda del contrato)

- **`NexaAnswersCanvas` es la surface canónica** — NO hay una answer-surface por dominio. El dominio
  entra por **datos** (`surfaceContext`), nunca por chrome especial.
- **Contratos versionados SSOT**: `surfaceContext` (`@/lib/nexa/nexa-answers-surface-context`),
  `nexa-answer-render-plan.v1`, `nexa-evidence.v1`, `knowledge-search.v1`.
- **Mecanismos transversales = primitives neutrales**: `NexaProvenanceTrace` (grounding),
  `NexaResponseToolbar` (chrome de confianza), `NexaStreamingText` (revelado), `NexaEvidencePanel` (evidencia).

## La coreografía (11 estados)

`idle → submitted → thinking → reasoning → streaming → answered → proofOpen → followup` (+
`compacted`/`degraded`/`error`). El live region del status lo lleva la identidad Nexa (un solo
anuncio a11y); `prefers-reduced-motion` horneado en cada primitive.

## Cómo se relaciona con las otras capas

- El **system prompt** (capa 01/02) gobierna qué dice; la experiencia gobierna cómo se muestra.
- El **knowledge** (capa knowledge) produce el packet; la experiencia lo renderiza (citas + panel de fuentes).
- La **evidencia** (`evidence-and-citations`) es el chrome de confianza de esta superficie.

## Reglas duras (del contrato — no re-derivar)

- **NUNCA** crear una answer-surface/chat por dominio. Componer el canvas con su `surfaceContext`.
- **NUNCA** crear un `surfaceContext` paralelo ni un variant nuevo por dominio.
- **NUNCA** romper un contrato versionado sin bumpear la versión.
- **NUNCA** duplicar grounding/toolbar/revelado/evidencia: consumir las primitives.

## Convergencia (runtime construido)

La lente rica del canvas YA está cableada a `/knowledge` con retrieval real (flag
`NEXA_ANSWERS_CANVAS_LENS_ENABLED`, default OFF), GVC-verificada. Cualquier dominio nuevo sigue el
domain playbook (no se rediseña el shell). Detalle + follow-ups: el contrato canónico.

## Código

`src/components/greenhouse/primitives/nexa-answers-canvas/**`, `src/lib/nexa/nexa-answers-surface-context.ts`,
`src/views/greenhouse/**` (lens hosts). Procedencia: TASK-1095/1096/1101 (+ 1103/1104/1105/1108).

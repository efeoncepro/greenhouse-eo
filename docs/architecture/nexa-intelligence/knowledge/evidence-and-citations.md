# 06 — Evidencia + Citas

> **Capa:** evidencia + citas (panel de fuentes, `[n]` inline, hygiene del excerpt).
> **Código:** [`conversational-evidence.ts`](../../../../src/lib/nexa/conversational-evidence.ts), [`nexa-answers-citation-mapper.ts`](../../../../src/lib/nexa/nexa-answers-citation-mapper.ts), [`strip-markdown-excerpt.ts`](../../../../src/lib/nexa/strip-markdown-excerpt.ts), `NexaEvidencePanel` / `NexaProvenanceTrace`.

## Principio: la interfaz es dueña de la evidencia

La respuesta de Nexa **cita con marcadores `[n]` inline** ligados al fragmento n. Las **fuentes**
(qué documento, qué sección, frescura) se muestran en el **panel de procedencia/Fuentes** bajo la
respuesta — NUNCA como un volcado de texto "Fuentes:" en el cuerpo. Esto resuelve la contradicción
de política de fuentes que existía antes (había tres generadores de "Fuentes:" → ahora cero).

## El número del trace NO se inventa

- `chunk.score` = el `ts_rank` redondeado (el único número de retrieval). La UI lo muestra y de ahí
  **deriva** la confianza por fuente/overall. NUNCA se fabrica un score/confianza paralelo.
- La **confianza de respuesta** (que genera el modelo al componer) es DISTINTA de la confianza/score
  de **retrieval** (del packet). No confundirlas.

## Hygiene del excerpt de fuentes (TASK-1124 follow-up)

El cuerpo del chunk viene de Notion/Markdown con sintaxis cruda (`## …`, `**bold**`, `>`, listas,
links). El **preview del excerpt** en la tarjeta de fuente se limpia a prosa con el helper puro
**`toPlainExcerpt`** (quita headings/énfasis/blockquote/listas/links/backticks + colapsa whitespace),
aplicado en los **dos** constructores de excerpt (SSOT):

- `conversational-evidence.ts` → panel del **chat flotante/Home**.
- `truncateCitationExcerpt` (`nexa-answers-citation-mapper.ts`) → lente **canvas**.

Conserva el texto; solo quita la sintaxis. La respuesta del modelo y las citas `[n]` no se tocan.

> **Bug class fuente:** el operador veía `## Las 7 fases…` en la tarjeta de Fuentes. NO era la
> respuesta (esa ya se saneaba) sino el **preview del excerpt**, que renderizaba `chunk.text` verbatim.

## Estados honestos

El panel de fuentes / la respuesta distinguen `loading | answered | empty | degraded`. NUNCA pintar
un estado de confianza falso cuando la verdad es "no sé" — usar gap honesto / degraded.

## Contratos versionados

- Evidencia: `nexa-evidence.v1` (`ConversationalEvidencePacket`).
- Retrieval: `knowledge-search.v1` (el packet que alimenta la evidencia). Ver [`07`](retrieval-answer-quality.md).

## Reglas duras

- ❌ NUNCA anexar "Fuentes:" como texto en el cuerpo de la respuesta.
- ❌ NUNCA mostrar Markdown estructural crudo (`##`) en el excerpt de fuente — usar `toPlainExcerpt`.
- ❌ NUNCA fabricar un score/confianza que no salga del packet.
- ✅ SIEMPRE citar `[n]` inline ligado al fragmento; el panel muestra el resto.
- ✅ SIEMPRE limpiar el excerpt en los dos constructores (SSOT) si cambia la forma del preview.

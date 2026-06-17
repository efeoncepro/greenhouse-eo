# Nexa Intelligence — Documentación técnica

> **Tipo:** Arquitectura técnica (cómo está construida la inteligencia, no qué decide).
> **Padre:** [`../README.md`](../README.md) (las capas de producto).

Mientras las capas de producto (01–07) describen *qué* hace y *cómo suena* Nexa, esta subcarpeta
documenta *cómo está construida* la inteligencia: modelos LLM, técnicas, el pipeline RAG y los
contratos de datos.

| Doc | Cubre |
|---|---|
| [`llm-models.md`](llm-models.md) | Modelos LLM usados (Gemini, Claude), provider abstraction, model IDs, routing, failover, secrets |
| [`rag-pipeline.md`](rag-pipeline.md) | Cómo funciona el RAG end-to-end: ingesta → FTS → rerank → brief → grounding → síntesis → citas |
| [`techniques.md`](techniques.md) | Técnicas: function-calling / 2-pass tool loop, reranking, synthesis brief, dedupe, gaps honestos, reveal |
| [`data-contracts.md`](data-contracts.md) | Contratos versionados: `knowledge-search.v1`, `nexa-evidence.v1`, render plan, governance del prompt |

**Mantenimiento:** estos docs están en el [`manifest.json`](../manifest.json) y los cubre el gate
`pnpm nexa:doc-gate`. Al cambiar modelos, técnica de retrieval o un contrato, actualizá el doc técnico
correspondiente en el mismo cambio.

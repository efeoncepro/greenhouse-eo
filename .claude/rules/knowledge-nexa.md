---
paths:
  - "src/lib/knowledge/**"
  - "src/lib/nexa/**"
---

# Knowledge + Nexa — invariantes (auto-load por path)

Antes de tocar Knowledge/Nexa, **invocá la skill `greenhouse-nexa-conversational`** y cargá **`docs/architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md`**.

Reglas duras: **NUNCA** Nexa queryea `greenhouse_knowledge.knowledge_chunks` directo (lint `no-direct-knowledge-chunk-query`; consumir el contrato `knowledge-search.v1`); **NUNCA** Nexa responde un dato de conocimiento sin citar ni inventa cuando `confidence='none'`; **NUNCA** el LLM ejecuta un write (loop propose→confirm→execute); **NUNCA** instanciar un SDK LLM dentro de un dominio (cliente canónico de `src/lib/ai/`).

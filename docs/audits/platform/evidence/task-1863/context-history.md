# Contexto preservado durante el cierre de TASK-1863

Extracto histórico de Handoff.md; sus estados corresponden al 11/09/2026.
El catálogo/allowlist vigente se consulta en la skill DataForSEO y TASK-1935/TASK-1651.

**Revisión competitiva «AI Skills» de DataForSEO (2026-09-11, documental):** seis skills del proveedor analizadas;
**no se instala ninguna**. El delta entró a `dataforseo-operator/references/**` y a
`seo-aeo/references/competitor-methodologies-2026-09.md` (nuevo). `ai_optimization` sigue fuera del allowlist.
Las 4 preguntas quedaron decididas el mismo día: `TASK-1870` (rotación SERP, costo cero) y `TASK-1871`
(screening de toxicidad) en `to-do`; disavow descartado; gate de `rank_scale` ya en el repo. **Abierto:**
`ISSUE-170` — el link gap del prospecto puede colapsar por intersección AND, con experimento definido y
sin medir. Decisión y evidencia: `docs/research/RESEARCH-011-dataforseo-ai-skills-competitive-review.md`.

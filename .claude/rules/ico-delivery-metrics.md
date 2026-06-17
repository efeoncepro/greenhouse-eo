---
paths:
  - "src/lib/ico-engine/**"
  - "src/lib/notion-metrics/**"
---

# ICO / Delivery Metrics — invariantes (auto-load por path)

Antes de tocar ICO/métricas, **invocá la skill `greenhouse-ico`** y cargá **`docs/architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md`**.

Reglas duras: **NUNCA** `DELETE FROM ai_signals`/`ai_prediction_log` (append-only event log; leer la VIEW `*_current`); **NUNCA** un DELETE+INSERT sobre una tabla materializada de ICO sin pasar por `runIcoMaterializerCycle` (freshness gate + MERGE, NO `WHEN NOT MATCHED BY SOURCE THEN DELETE`); **NUNCA** crear/editar una fórmula Notion para una métrica ICO (Notion = OS, Greenhouse = motor; writeback a `[GH] <métrica>` read-only).

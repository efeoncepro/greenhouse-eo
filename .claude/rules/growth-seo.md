---
paths:
  - "src/lib/growth/seo/**"
  - "src/app/api/platform/ecosystem/growth/seo/**"
  - "src/lib/ai/dataforseo*"
---

# Growth / SEO (Search Visibility 360) — invariantes (auto-load por path)

**Skill mandatoria al tocar DataForSEO** (cliente, familias, o cualquier consumer que lo llame): `dataforseo-operator` (`.claude/skills/dataforseo-operator/SKILL.md`; espejo Codex en `.codex/skills/`) — oficio de la API (endpoints, live vs task-based, costos as-of 2026-08-06) + contrato Greenhouse (allowlist 5 familias, breaker, spend guard). Sus `references/` canónicas viven SOLO bajo `.claude/skills/dataforseo-operator/references/`.

**Todo write provider-facing SEO** (rankings, site audit, backlinks — cualquier corrida que gaste presupuesto de proveedor) pasa por `enforceSeoRunEntitlement` (`src/lib/growth/seo/entitlement.ts`) — chokepoint único; **NUNCA** reimplementar el gate inline en un consumer (UI, Nexa, MCP, cron). **Batches que gastan siguen el patrón TASK-1303** (`rank-capture.ts`, LIVE): `estimatedCostUsd` del batch completo + spend fence (re-consulta cada 10 llamadas) + pre-check de idempotencia ANTES del provider + `ON CONFLICT DO NOTHING` (los triggers de 1299 PROHÍBEN DO UPDATE en tablas snapshot) + el ledger de gasto lo escribe el TRANSPORTE, jamás el caller. **Boundary §1.1 SEO↔AEO:** **NUNCA** un JOIN/VIEW/FK entre tablas `seo_*` y `grader_*` — el cruce es en memoria por `organization_id`, los ejes de cada motor **nunca** se promedian entre sí, y la degradación es honesta (`no_seo_data`/`no_aeo_data`, sin ceros fantasma). **Todo reader nuevo del dominio expone su MCP tool en el MISMO PR** (mandato 2026-08-05; lane ecosystem, TASK-1645). Detalle: `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §1.1/§7/§9/§17.

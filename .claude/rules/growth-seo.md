---
paths:
  - "src/lib/growth/seo/**"
  - "src/app/api/platform/ecosystem/growth/seo/**"
---

# Growth / SEO (Search Visibility 360) — invariantes (auto-load por path)

**Todo write provider-facing SEO** (rankings, site audit, backlinks — cualquier corrida que gaste presupuesto de proveedor) pasa por `enforceSeoRunEntitlement` (`src/lib/growth/seo/entitlement.ts`) — chokepoint único; **NUNCA** reimplementar el gate inline en un consumer (UI, Nexa, MCP, cron). **Boundary §1.1 SEO↔AEO:** **NUNCA** un JOIN/VIEW/FK entre tablas `seo_*` y `grader_*` — el cruce es en memoria por `organization_id`, los ejes de cada motor **nunca** se promedian entre sí, y la degradación es honesta (`no_seo_data`/`no_aeo_data`, sin ceros fantasma). **Todo reader nuevo del dominio expone su MCP tool en el MISMO PR** (mandato 2026-08-05; lane ecosystem, TASK-1645). Detalle: `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §1.1/§7/§9/§17.

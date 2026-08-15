# Overlay Efeonce / Greenhouse — índice

> Aterriza la doctrina portable de esta skill en el runtime real de Greenhouse.
> Los conceptos genéricos viven en `../modules/`; aquí van los mapeos, boundaries y
> paths reales. **Reverifica el estado en el repo** (specs y código cambian).

## Cuándo usar este overlay

Cuando el trabajo de growth/CRO toca el portal Greenhouse o el sitio público de
Efeonce: el AEO/AI Visibility Grader, los growth forms, la medición del repo, o la
conversión del sitio público. Para growth genérico (sin runtime), basta con
`../modules/`.

## Archivos del overlay

| Archivo | Qué cubre |
|---|---|
| `GROWTH_DOMAIN_BOUNDARY.md` | El dominio `growth` de Greenhouse: qué es y qué NO; boundary con `commercial`/`public_site`. |
| `AEO_GRADER_AS_LEAD_MAGNET.md` | El AI Visibility Grader como top-of-funnel loop (lead magnet → HubSpot → cross-sell); tiers/entitlement PLG. |
| `GROWTH_FORMS_LEAD_CAPTURE.md` | Motor de forms públicos, submit a HubSpot, Turnstile, gate de email corporativo, PII/Ley 21.719. |
| `MEASUREMENT_IN_GREENHOUSE.md` | Tracking engine (propuesto), party funnel, conversion-rate reliability signal, GSC, GA4 (planned). |
| `CRO_PUBLIC_SITE.md` | Conversión del sitio público (/aeo-2, WordPress/Astro, content factory, comparison table). |

## Boundary duro (hand-offs, repetido por seguridad)

Esta skill decide **qué optimizar y cómo medirlo** en el dominio growth pre-pipeline.
NO invade:

- **SEO técnico / AEO / GEO / schema / "ser citado por IA"** → skill **`seo-aeo`** +
  `seo-aeo/efeonce/AI_VISIBILITY_GRADER.md` (el grader vive en ambas skills: `seo-aeo`
  posee la *metodología de scoring y agentic-readiness*; esta skill posee su uso como
  *lead magnet / loop de adquisición*).
- **Pricing, quote-to-cash, deals, contratos, pipeline calificado, RevOps** →
  **`commercial-expert`** + `commercial-expert/greenhouse-overlay/` (`growth` entrega el
  lead/PQL; `commercial` posee la "qualified revenue motion after handoff").
- **Doctrina ASaaS / marca / modelo de negocio** → **`efeonce-agency`**.
- **Implementación UI del portal/sitio** (tokens, layout, componentes, copy visible,
  charts, motion, forms) → skills UI (`greenhouse-ux`, `modern-ui`, `forms-ux`,
  `state-design`, `motion-design`, `greenhouse-ux-writing`, `dataviz-design`) + GVC.
- **Escritura a HubSpot:** usa el cliente in-app directo (no el bridge legacy) — ver
  skill `hubspot-greenhouse-bridge` y la nota de memoria del repo.

## Context pack de negocio (leer para copy/GTM/ICP)

`docs/context/` (empezar por `00_INDEX.md`): especialmente `02_gtm.md`,
`05_voz-tono-estilo.md` (tono es-CL para copy), `08_estrategia-comercial.md`,
`11_hubspot-bowtie.md`, `13_icp-buyer-personas-jtbd.md`, `14_modelo-negocio-asaas.md`.

## Fuentes de verdad (specs canónicas, reverificar estado)

- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md` (charter del dominio)
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_TRACKING_ENGINE_ARCHITECTURE_V1.md` (Proposed)
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (Search Visibility 360, EPIC-022 — motor real al
  2026-08-05 fin de día: COMPLETE TASK-1299 schema `greenhouse_growth.seo_*` + TASK-1301 entitlement per-org
  **`seo_v2`** (la clave `seo_v1` quedó CERRADA por el cutover de TASK-1677 — sin assignments vigentes) con chokepoint `enforceSeoRunEntitlement` en `src/lib/growth/seo/entitlement.ts` + TASK-1300 registry
  DataForSEO/ledger + TASK-1302 materializer GSC LIVE (`readKeywordOpportunities`) + TASK-1305
  `readSeoAeoGap`/quadrant SEO×AEO (primer quadrant real: Berel → `riesgo`); TASK-1645 lane ecosystem + las
  primeras 3 MCP tools, federadas al gateway por TASK-1647 y **live en producción desde 2026-08-06**. Delta
  2026-08-07: inventario MCP del dominio SEO **10 lecturas + 2 escrituras** (verificado contra
  `src/mcp/greenhouse/server.ts` el 2026-08-14; la 10.ª lectura es `get_seo_keyword_market_data`, TASK-1661)
  y cockpit operador en `/admin/growth/seo`
  (TASK-1306/1307/1308) — `track_seo_keywords`/`untrack_seo_keywords` son las primeras escrituras del dominio y
  **comprometen gasto recurrente del proveedor**, por eso van con techo por target, entitlement per-ORG, outcome
  por keyword y reverso append-only, federadas y fail-closed hasta TASK-1631. Regla: todo reader SEO/E-E-A-T
  futuro expone su MCP tool en el mismo PR, y si ESCRIBE, además scope de dominio + la frontera de grant de
  `.claude/rules/growth-seo.md`; destino Wave `wave.efeonce.org` §17/EPIC-037; **aún sin superficie cliente**)
- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md` (funnel comercial)
- Código: `src/lib/growth/**`

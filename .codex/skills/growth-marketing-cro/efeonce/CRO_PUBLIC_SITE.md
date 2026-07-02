# CRO del sitio público de Efeonce

> Aplica `../modules/03` (CRO + optimización web) al sitio público. La *implementación*
> (WordPress/Astro/Elementor) es de las skills de sitio público; **aquí** decides qué
> convertir y cómo medirlo.

## Superficies reales

- **`/aeo-2/` — landing del SERVICIO AEO** (comercial → HubSpot AEO Lead Form).
  Doc: `docs/documentation/public-site/aeo-landing-elementor.md`.
  **NO confundir** con el lead magnet self-serve del grader (`AEO_GRADER_AS_LEAD_MAGNET.md`):
  `/aeo-2/` vende el servicio; el grader entrega un diagnóstico gratis. Son dos loops
  distintos con dos conversiones distintas (contacto comercial vs run self-serve).
- **Control plane del sitio:** WordPress/Elementor + recalibración hacia Astro
  (`GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md`,
  `GREENHOUSE_PUBLIC_SITE_ASTRO_RUNTIME_STRATEGY_DECISION_V1.md`).
- **Content factory:** `src/lib/public-site/content-factory/**` (gutenberg planner/
  validator/pattern-catalog) — el motor del content loop de adquisición.
- **Comparison table widget:** `docs/documentation/public-site/comparison-table-widget.md`
  — pieza de conversión (comparativa) para páginas de servicio.

## Cómo aplicar CRO aquí

- **Teardown de `/aeo-2/`** con `../templates/landing-page-teardown.md`: propuesta de
  valor del servicio, message match con la fuente (ad/email/orgánico), trust/casos,
  formulario mínimo al HubSpot AEO Lead Form, un solo objetivo.
- **Velocidad (WordPress/Kinsta):** Core Web Vitals impactan conversión **y** ranking.
  LCP<2.0s / INP<200ms en mobile real (`../modules/03 §5`). La optimización técnica es
  de las skills de sitio/`seo-aeo`; aquí se prioriza como palanca de conversión.
- **Content loop:** el content factory alimenta adquisición orgánica; la *táctica* SEO/AEO
  (topical authority, citabilidad) es de `seo-aeo`; aquí se ve como *loop* (qué contenido
  re-alimenta la entrada, cómo se mide tráfico→lead).
- **Medición:** el sitio usa GA/GTM (consumers); la verdad de conversión de lead es el
  forms submission ledger (`MEASUREMENT_IN_GREENHOUSE.md`). Instrumenta visita→lead ahí.

## Boundary de ejecución

- **Implementar** cambios en el sitio → skills `efeonce-public-site-wordpress`,
  `wordpress-router`, y para forms `greenhouse-growth-forms` + `forms-ux`. Verificar con
  GVC cuando aplique.
- **Táctica de búsqueda / schema / AEO** → skill `seo-aeo` (+ `seo-aeo/efeonce/`).
- **Copy visible** → `greenhouse-ux-writing` (tono es-CL; ver `docs/context/05_voz-tono-estilo.md`).

## Regla anti-conflación (repetir siempre)

`/aeo-2/` = **servicio AEO**, conversión = lead comercial en HubSpot.
Grader self-serve = **lead magnet**, conversión = run + reporte + intent lead.
No mezcles sus métricas, sus copys ni sus loops.

# Public Site Architecture

This folder owns public-site runtime contracts for `efeoncepro.com`.

It is separate from the private Greenhouse app UI platform:

- Private portal primitives: `docs/architecture/ui-platform/PRIMITIVES.md` and `src/components/greenhouse/primitives/**`.
- Public-site primitives: [PRIMITIVES.md](./PRIMITIVES.md), backed by WordPress/Elementor runtime code in `/Users/jreye/Documents/efeonce-public-site-runtime`.

Use this folder when a reusable public landing component, Elementor widget, host adapter, or page pattern needs a long-lived contract.

## Landing contracts

- [Content Marketing / Content Ops](CONTENT_MARKETING_ELEMENTOR_MODULES_V1.md) — trece widgets
  semánticos, captura Growth Forms y SEO sobre la página existente; incluye límites y evidencia.
- [Agencia Creativa](AGENCIA_CREATIVA_ELEMENTOR_MODULES_V1.md) — quince widgets `greenhouse_creativa_*`
  compilados desde el canvas aprobado, carril de release con preflight y diagnóstico Growth Forms; incluye
  incidente, rollback y pendientes.

## Shared surfaces

- [Public Site Miscellaneous Surfaces V1](PUBLIC_MISCELLANEOUS_SURFACES_V1.md) — ownership propuesto para
  404, búsqueda, no-results y archivos; separa recovery, search, editorial archives y chrome global sin
  confundir composición visual con HTTP/SEO. Aún no implementado.
- [Navegación global del sitio público V1](PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md) — navegación portable
  `efeonce.site-nav` que reemplazaría el encabezado de Ohio: contrato y primitive en AXIS, documento único en el
  plugin «EO Navegación», adaptador con interruptor y piloto en `ohio-child`, y Think más adelante. Propuesta según
  PDR-027 (Proposed) y EPIC-055; aún no implementada.

# TASK-2008 — Lectura de evidencia y navegación de secciones

## Meta

- Status: `ready-for-implementation`
- Owner task: TASK-2008
- Related wireframe: `docs/ui/wireframes/TASK-2008-growth-seo-client-evidence.md`
- Intended route/surface: `/growth/seo`
- Flow type: `single-surface`
- Primary primitives: tabs MUI, encabezados/secciones canónicos, charts con alternativa tabular.
- Copy source: GH_GROWTH_SEO_CLIENT.

## Flow Brief

Cliente entra al Resumen, entiende resultados de cada fuente y revisa cobertura/evolución/cruce.
Éxito: sabe qué lectura hay y cuál no está disponible; sin activar trabajos pagados.

## Surfaces Involved

| Surface | Desktop | Mobile | Primitive |
| --- | --- | --- | --- |
| Resumen | Hoja GSC/AEO con contexto lateral | Lectura apilada por evidencia | analyticsReport |
| Cobertura inline | Sección inferior enfocable | Mismo contexto sin overlay | OperationalSection open |
| Evolución | Chart rank y fallback por fuente | Chart/tabla accesible | existente |
| SEO × AEO | Cruce sólo si ambas lentes disponibles | Explicación+tabla/detalle | quadrant existente |

## Flow Map

1. Sesión/tenant/capability/module autorizan en servidor.
2. Resumen muestra regiones válidas e independientes.
3. Ver cobertura desplaza y enfoca su encabezado.
4. Tab Evolución cambia panel; tab SEO × AEO presenta cruce o falta de lente explícita.
5. Volver a Resumen conserva el mismo contexto org/período.
6. Error parcial conserva otras fuentes; no reintento pagado ni mensajes de proveedor crudos.

## Interaction Triggers

| Trigger | Source | Target | Keyboard |
| --- | --- | --- | --- |
| Ver cobertura | summary | encabezado coverage | Enter/Space |
| Tab | tablist | panel correspondiente | flechas/Enter nativos |
| Ver SEO × AEO | regiónAEO | tab quadrant | Enter |

## State Machine

summary/evolution/quadrant son paneles de lectura; las fuentes declaran available/absent/failed.
Cobertura es scroll+foco inline, no open/close/modal ni borrador. Panel unavailable se explica sin
modificar las fuentes válidas. No estado dirty ni optimistic update.

## Routing Contract

Route changes: none; URL `/growth/seo`; tabs mantienen estado local existente. Reload entra al Resumen;
back conserva historial de navegación previo, sin pushState por cada tab. Sin nuevos deep links.
No compartir una org recibida del browser: tenant deriva server-side.

## Focus & Accessibility

Tab activo nativo conserva foco. Coverage heading recibe foco programático tras CTA; scroll sin animar
en reduced motion. Sin Escape/click-away/focus-trap porque no hay overlay; anunciar panel por
relación aria-controls/labelledby nativa. La lectura no genera toasts de éxito inexistentes.

## Data & Command Boundaries

Reader readSeoClientSurface; GSC/AEO/rank/workqueue canónicos en TASK-1690.
Commands/API routes nuevos: none. Sin writes/cache invalidation/audit de negocio por navegación.
Permisos y tenant de rutas actuales se mantienen; tests de view revocation son carril independiente.

## Failure Paths

Denied: locked server-side; ninguna fuente: explicación por región; partial: conserva lo válido;
stale: fechas honestas; fallo: copy seguro y recuperación de lectura, sin gastar cuota.
AEO disponible/no GSC: AEO se conserva y el cruce explica falta SEO. GSC disponible/no rank:
clics/CTR siguen visibles. No score combinado de fuentes.

## GVC Scenario Plan

growth-seo-client-mockup desktop1440/mobile390; summary→coverage→evolution→quadrant→summary.
Capturas por estado, foco/teclado y reduced motion; markers seo-client-summary/source-coverage;
assert sin scroll horizontal y sin pérdida de regiones válidas. Dossier task2008.

## Design Decision Log

Reusar tabs/lectura inline evita nuevo overlay y navegación. No endpoints click-handler ni
modales locales. No acción editorial o generación de informe en esta task.

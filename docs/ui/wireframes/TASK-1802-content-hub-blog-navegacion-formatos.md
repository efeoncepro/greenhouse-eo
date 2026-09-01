# TASK-1802 — Wireframe Content Hub Efeonce

> Dirección: `docs/ui/visual-directions/TASK-1802-content-hub-blog-navegacion-formatos.md`.
> Source: contenido real de WordPress y registro federado; no fixtures demo en aprobación.

## Desktop composition

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ HEADER GLOBAL EFEONCE                                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│ EYEBROW: THINK / MARKETING CON MANZANITAS [verificar]                        │
│ H1: Ideas, herramientas y señales para crecer con criterio                   │
│ Introducción editorial                         [Explorar lo último] [Archivo] │
│ FORMATOS: Todos · Artículos · Glitch · Tools · Videos · Webinars             │
├──────────────────────────────────────────────────────────────────────────────┤
│ LO ÚLTIMO                                                                    │
│ ┌──────────────────────────────────────┐ ┌──────────────────────────────────┐ │
│ │ Destacado query-driven              │ │ Lista de 3 piezas recientes       │ │
│ │ imagen + tipo + título + metadata   │ │ tipos mezclados con labels        │ │
│ └──────────────────────────────────────┘ └──────────────────────────────────┘ │
├──────────────────────── FEATURE BREAK FULL-BLEED ────────────────────────────┤
│ Destacado editorial con imagen, tema, extracto y CTA; query + fallback       │
├──────────────────────────────────────────────────────────────────────────────┤
│ EXPLORAR                                                                     │
│ [Por formato] [Por tema] [Buscar en el hub_________________]                  │
│ AEO · IA · HubSpot · Loop Marketing · Diseño · Growth · SEO · ...            │
├──────────────────────────────────────────────────────────────────────────────┤
│ ARCHIVO                                                                      │
│ [pieza] [pieza] [pieza]                                                      │
│ [pieza] [pieza] [pieza]                                                      │
│ Anterior   1  2  3  4 ... N   Siguiente                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│ GLITCH — carril editorial propio                         [Ver todos]          │
│ [edición] [edición] [edición]                                                │
├──────────────────────────────────────────────────────────────────────────────┤
│ TOOLS / VIDEOS / WEBINARS — recursos con affordance por formato              │
│ [tool] [video] [webinar] [guía]                                              │
├──────────────────────── FEATURE BREAK FULL-BLEED ────────────────────────────┤
│ Historia/experiencia destacada; no banner promocional genérico               │
├──────────────────────────────────────────────────────────────────────────────┤
│ NEWSLETTER: promesa + campos + consentimiento + submit + receipt             │
├──────────────────────────────────────────────────────────────────────────────┤
│ FOOTER GLOBAL                                                                │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Mobile 390 px

```text
┌────────────────────────────┐
│ HEADER                     │
├────────────────────────────┤
│ EYEBROW                    │
│ H1                         │
│ intro                      │
│ [Lo último] [Archivo]      │
│ formatos wrap/scroll a11y  │
├────────────────────────────┤
│ DESTACADO                  │
│ lista reciente             │
├──── FULL-BLEED ────────────┤
│ feature                    │
├────────────────────────────┤
│ EXPLORAR / BUSCAR          │
│ temas                      │
├────────────────────────────┤
│ ARCHIVO: una columna       │
│ paginación táctil          │
├────────────────────────────┤
│ GLITCH                     │
├────────────────────────────┤
│ RECURSOS                   │
├──── FULL-BLEED ────────────┤
│ feature                    │
├────────────────────────────┤
│ NEWSLETTER                 │
├────────────────────────────┤
│ FOOTER                     │
└────────────────────────────┘
```

## Content inventory

- H1 y tesis editorial; naming final pendiente.
- CTAs `Explorar lo último` y `Archivo`.
- Navegación por formatos y temas.
- Destacado principal, lista reciente y dos feature breaks como máximo.
- Archivo cronológico paginado.
- Carril Glitch.
- Recursos: Tools, Videos, Webinars, guías/ebooks/templates.
- Search editorial y estados sin resultados.
- Newsletter gobernada y footer global.

## State inventory

| Estado | Resultado |
|---|---|
| default | contenido real, archivo y rutas visibles |
| filtro tipo/tema | heading y URL reflejan el contexto |
| búsqueda vacía | no consulta; ofrece orientación |
| sin resultados | conserva query y ofrece reset/Archivo |
| recurso degradado | artículos siguen; bloque explica/omite sin inventar |
| imagen ausente | fallback editorial sin layout shift |
| primera/última página | prev/next correcto y current anunciado |
| mobile/long title | una columna, clamp sólo si no pierde significado |

## Interaction details

- `Archivo` es un enlace prominente y persistente.
- Los formatos navegan a URLs o estados URL restaurables; no dependen de memoria client-side.
- Los temas usan categorías canónicas sólo cuando tienen contenido elegible.
- La paginación mantiene links HTML; un enhancement opcional no la sustituye.
- Cards no contienen enlaces anidados; toda imagen decorativa tiene alt vacío y toda imagen informativa alt útil.
- Newsletter mueve foco al receipt/error pertinente sin anunciar éxito antes del servidor.

## Implementation Mapping

| Zona | Primitive/widget | Fuente |
|---|---|---|
| hero/latest | Content Hub hero/latest adaptable | WP posts publicados + curado/fallback |
| formatos/temas | nav/facet server-rendered | registro de tipos + PDR-019 |
| archive | feed paginado | WP query `paged` |
| Glitch | editorial rail | categoría raíz Glitch |
| resources | resource collection | registro federado verificado |
| feature breaks | editorial feature | WP/resource query + fallback |
| newsletter | growth form host | contrato/forms gobernado |

Los nombres técnicos se congelan en Discovery. Elementor recibe parámetros de query, no arrays de artículos.

## GVC Scenario Plan

- `content-hub-first-fold`: hero, formatos, CTAs y latest.
- `content-hub-archive-page-1` y `content-hub-archive-middle`.
- `content-hub-type-glitch`, `content-hub-topic-aeo`, `content-hub-search-no-results`.
- `content-hub-resources-degraded` y `content-hub-newsletter-states`.
- Breakpoints 1440/1280/890/390, `qualityProfile: premium`, dossier y baseline explícitos.
- Assertions: títulos/URLs/fechas coinciden con WordPress; pagination links; current state; no overflow; axe/keyboard.

## Design Decision Log

- 2026-08-31 — `source-led`; se rechaza reconstruir la jerarquía Demo 35.
- 2026-08-31 — archivo visible y paginación HTML son parte del first-class navigation.
- 2026-08-31 — artículos se consultan desde WordPress mediante Elementor; no cards manuales.
- 2026-08-31 — tipos y temas permanecen dimensiones independientes.
- Pending — naming y sistema canónico de recursos federados.


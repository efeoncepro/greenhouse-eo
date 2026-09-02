# TASK-1259 — Flujo: incrustar un Growth Form desde WordPress (flow contract)

> **Tipo:** Flow contract **RETROACTIVO** — describe un flujo YA CONSTRUIDO en
> `efeonce-public-site-runtime` (commit `27c1468`), **sin desplegar**.
> **Creado:** 2026-09-01 durante el barrido `stale-progress`.
> **Wireframe:** [TASK-1259](../wireframes/TASK-1259-wordpress-greenhouse-form-selector-embed-ux.md)
> **Fuente:** `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`. **No es un diseño nuevo.**

## Alcance

Dos superficies coordinadas que no comparten proceso: el **editor** (Elementor, admin de WordPress)
y la **página pública** (renderer `<greenhouse-form>`). El contrato entre ambas es una sola cosa: el
markup que el widget emite.

## Camino feliz

```
Editor abre la página en Elementor
        │
        ▼
Busca "Growth Form" (categoría Greenhouse) y lo arrastra
        │
        ▼
Panel pide catálogo a Greenhouse ──── falla ───▶ revela Slug/Surface manual + razón
        │ 200                                     (el editor puede seguir, degradado)
        ▼
Elige Formulario (nombre · versión · readiness) y Surface activa
        │
        ▼
Publica la página  ──▶  el widget emite <greenhouse-form form-key surface lang …>
                              │
                              ▼
                        Bundle pineado monta el renderer
                              │
                        ┌─────┴─────┐
                    con JS       sin JS
                        │            │
                        ▼            ▼
                 formulario     URL de contacto
                 gobernado      de fallback
```

## Fronteras duras

- **El editor selecciona; nunca provisiona.** No hay transición desde este flujo hacia crear o
  editar una host surface. Si la surface no existe, el camino es Greenhouse, no WordPress.
- **El contenedor del formulario es opaco para el host.** Si la página tiene tabs o un patcher de
  DOM, debe conservar el nodo y dejar que el renderer controle sus descendientes: actualizar el host
  no puede remontar el custom element ni borrar lo que la persona escribió.
- **`initial-values` es prefill público, no un canal de PII**, y no cambia después de iniciar la
  edición.
- **Un solo registro del custom element.** Dos bundles del mismo elemento en la página es un
  defecto, no una variante.

## Estados de error visibles

| Situación | Qué ve el editor | Qué ve el visitante |
|---|---|---|
| Catálogo caído | Fallback manual con la razón | Nada distinto (si ya publicó con valores válidos) |
| Formulario despublicado | No aparece en la lista | Estado "no disponible" del renderer |
| Destino no listo | Readiness explícita en la opción | Formulario visible; el lead puede no entregarse |
| Origen fuera del allowlist | — | El renderer no carga (CORS / surface) |

## Lo que este flujo NO cubre

- **Gutenberg (bloque/shortcode)** — pendiente, no construido.
- **Paridad de render shortcode ↔ widget** — criterio abierto.
- **Enqueue de handle único verificado en una página real** — requiere deploy.
- **Recorrido con teclado y foco en la página pública** — sin evidencia GVC; nada desplegado.

## Referencias

- Capa compartida Ohio (`ohio-child-growth-forms-host`), live en Kinsta desde 2026-07-01 — existe
  para que el tema no imponga estilos globales sobre el renderer; no mueve lógica a WordPress.
- `docs/architecture/growth-public-forms-runtime-contract.md`

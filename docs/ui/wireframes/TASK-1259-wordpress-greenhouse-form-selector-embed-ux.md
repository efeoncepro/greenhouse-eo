# TASK-1259 — Selector de formulario Growth en WordPress (wireframe)

> **Tipo:** Wireframe **RETROACTIVO** — documenta un panel que YA EXISTE, construido en el repo
> `efeonce-public-site-runtime` (commit `27c1468`) y **sin desplegar**.
> **Creado:** 2026-09-01 durante el barrido `stale-progress`.
> **Fuente:** `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md` §WordPress
> (Elementor) + los criterios de aceptación de la task. **No es un diseño nuevo.**

## Por qué existe este documento

La task está `in-progress` con UI construida y **nunca declaró wireframe**. El gate
`ui-wireframe-contract` lo exige antes de implementar; acá la implementación ocurrió primero, en
otro repositorio. Este archivo cierra el hueco documental **describiendo lo construido**, no
proponiendo algo distinto.

## Superficie

Panel de configuración del widget **Growth Form** (`greenhouse_growth_form`, plugin *EO Elementor
Widgets*, categoría **Greenhouse**) dentro del editor de Elementor. No es una pantalla de
Greenhouse: vive en el admin de WordPress y consume el catálogo gobernado de `TASK-1258`.

## Anatomía del panel (pestaña Contenido)

```
┌─ Growth Form ─────────────────────────────────────────────┐
│ Formulario (catálogo)        [ ▾ Lead Gen - Web — v1 ·  ] │  ← desplegable desde el catálogo
│                              [   listo para recibir leads ] │     nombre · versión · readiness
│                                                            │
│ Surface (catálogo)           [ ▾ Surface por defecto     ] │  ← solo surfaces ACTIVAS
│                                                            │
│ Idioma                       [ ▾ Español (CL)            ] │  es-CL | en-US
│                                                            │
│ URL de contacto (fallback)   [ ................         ] │  opcional, sin JS
│                                                            │
│ ── Fallback ──────────────────────────────────────────────│  visible SOLO si no se elige del
│ Slug manual                  [ ................         ] │  catálogo, o si el catálogo no
│ Surface manual               [ ................         ] │  está disponible
│                                                            │
│ ▸ Runtime (avanzado)                                       │  colapsado por defecto
│    canal preview|beta|stable · base URL · embed key        │
└────────────────────────────────────────────────────────────┘
Pestaña Estilo: color de acento + ancho máximo.
```

## Reglas que la anatomía codifica

- **El editor nunca escribe un ID a mano** en el camino feliz. El slug manual existe como respaldo,
  no como entrada primaria — por eso está bajo el separador de fallback y no arriba.
- **El desplegable muestra readiness, no solo nombre.** `Lead Gen - Web — v1 · listo para recibir
  leads` permite decidir sin salir del panel; un formulario cuyo destino no está listo se ve como
  tal antes de publicar la página.
- **Solo surfaces activas pre-aprovisionadas.** No existe camino para crear o editar una surface
  desde WordPress: el panel selecciona, nunca provisiona.
- **El widget solo emite `<greenhouse-form …>`** y carga el bundle pineado. Campos, validación,
  pasos, consentimiento y destino viven en Greenhouse; el panel no los toca.

## Estados

| Estado | Qué se ve |
|---|---|
| Catálogo OK | Desplegables poblados; campos de fallback ocultos |
| Catálogo no disponible | Se revelan `Slug manual` / `Surface manual` con la razón |
| Formulario no publicado | No aparece en el desplegable (el catálogo solo lista publicados) |
| Destino no listo | Aparece en el desplegable con su readiness explícita, no oculto |
| Sin JS en el visitante | Se muestra la URL de contacto de fallback |

## Lo que este wireframe NO cubre

- **La página pública renderizada.** Acá solo se documenta el panel del editor.
- **Gutenberg (bloque/shortcode).** Declarado pendiente por la propia task; no está construido.
- **Evidencia GVC desktop/mobile.** No existe: nada está desplegado.
- **Paridad shortcode ↔ widget.** Es un criterio de aceptación abierto, no un hecho registrado.

## Referencias

- Manual: `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`
- Contrato runtime: `docs/architecture/growth-public-forms-runtime-contract.md`
- Catálogo gobernado + auth per-site: `TASK-1258` (`src/app/api/public/growth/forms/catalog/route.ts`)

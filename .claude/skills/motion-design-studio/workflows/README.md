# Creative Workflows — biblioteca viva (motion-design-studio)

> **Qué es esto.** El **índice de recetas creativas validadas end-to-end** — no teoría de craft ni
> catálogo de herramientas, sino los **flujos encadenados que probamos y funcionaron** (o que fallaron y
> por qué). Cada archivo = **un workflow** con: *cuándo usarla · pasos · plantilla de prompt · evidencia ·
> estado (validado/experimental/descartado)*. Esta carpeta **crece** con cada producción: cuando algo
> funciona, se agrega o se enriquece acá.
>
> El router del `SKILL.md` apunta a esta carpeta. Para el **conocimiento de craft** (principios, cámara,
> edición, sonido) están los `modules/`; para **cómo llamar cada herramienta**, `efeonce/STUDIO_TOOLING.md`
> + `efeonce/GEMINI_OMNI_VERTEX.md`; **acá vive el "cómo lo combinamos y qué resultó".**

## Cómo usar / cómo agregar

- **Para producir:** identifica tu necesidad en la tabla → abre ese workflow → sigue los pasos.
- **Para agregar aprendizaje:** al cerrar una producción, **crea `workflows/<slug>.md`** (o enriquece uno
  existente) con la estructura estándar (abajo) y agrega su fila a la tabla. Marca su **estado** y la
  **evidencia** (ruta del render, fecha). Sincroniza a `.codex/skills/...` y commitea.
- **Regla de honestidad:** documenta también lo que **NO** funcionó (con la razón), no solo los éxitos.

## Índice de workflows

| Workflow | Para qué | Estado | Archivo |
|---|---|---|---|
| **Reference-Video → Omni Enhance** ⭐ | subir un mockup/keyframe a look cinematográfico premium con Gemini Omni | **validado** 2026-07-05 | `reference-video-to-omni.md` |
| **Reference-Chaining** | que varias tomas IA NO se vean desconectadas (continuidad) | **validado** 2026-07-05 | `reference-chaining.md` |
| **UI-heavy sin After Effects** | UI/texto/citas/gauge legibles y exactos (mograph HTML + Playwright) | **validado** 2026-07-05 | `ui-without-after-effects.md` |
| **Híbrido mundo-IA + UI real** | spot completo: mundo IA + producto crisp compuesto | **validado (patrón)** | `hybrid-world-plus-ui.md` |

## Estructura estándar de un workflow

```md
# <Nombre>
> Estado: validado | experimental | descartado — <fecha> · Evidencia: <ruta/render>
## Cuándo usarla
## Pasos (encadenados)
## Plantilla de prompt (si aplica)
## Qué NO hacer / gotchas
## Costo / gasto gobernado
## Evidencia
```

## Regla transversal (aplica a todas)

**El *look* puede venir de IA; la *exactitud* (texto, citas, logos, números, marca) SIEMPRE de assets/
mograph reales compuestos.** El operador aprueba antes de entregar; **gasto gobernado** en cada generación
IA. Contrato del modelo Omni: `efeonce/GEMINI_OMNI_VERTEX.md`.

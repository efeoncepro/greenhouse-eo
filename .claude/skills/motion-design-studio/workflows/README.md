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
>
> **Qué no entra aquí.** Una exploración, un prompt, una capacidad de proveedor o un agente que recién
> propuso un plan no son workflows todavía. Primero pasan por dirección creativa, evidencia y una
> decisión builder; el marco de Creative Operations vive en
> `docs/research/RESEARCH-009-creative-operations-agentic-workflows.md`.

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
| **Living Social Wall Clips** | micro-clips vivos por formato social (UGC/Reel/Historia/Creador) sin caer en pan/zoom de stills | **validado** 2026-07-08 | `living-social-wall-clips.md` |
| **Omni in-place edit → deterministic finish** | editar un clip existente con Omni sólo si faltan píxeles; si no, retime/composite/foley sobre el mismo master | **validado con caveat** 2026-07-11 | `omni-in-place-edit-and-deterministic-finish.md` |
| **Selección por contrato de fidelidad** | elegir Omni, Seedance o post según reinterpretación permitida, practical y física; no por canal | **evidencia limitada** 2026-07-11 | `engine-selection-by-fidelity-contract.md` |
| **Clean shot → deterministic 15/10/6 family** | convertir un shot 5–10 s + stills exactos en masters 15/10/6 con arco propio, format wall y audio medido | **validado** 2026-07-18 | `single-shot-to-deterministic-campaign-hero.md` |
| **Key visual estático → loop de social** ⭐ | llevar una pieza estática aprobada a movimiento sin inventar un lenguaje paralelo: referencias, arco entrada→sostén→fade, sonido por sustracción y QA del loop | **validado** 2026-09-22 | `static-key-visual-to-looping-social-motion.md` |

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

**El estado técnico no es aprobación creativa.** Un video Omni o Seedance `completed` entra a revisión temporal; sólo si requiere geometría/acción inexistente se itera con el modelo. Retime, orden, repetición y texto exacto se resuelven sobre el clip existente. Si se pide foley nativo, revisar audio y video por separado y rescatar sólo eventos aprobados sobre la placa aceptada.

## Seasonalities en video

[Metáfora visual → video con marca exacta](seasonality-visual-metaphor-to-video.md): ejecución técnica comprobada
2026-09-12 con Seedance 2.5; candidato creativo pendiente, revisión temporal/audio incompleta. Incluye
clasificación, previs, referencias, preflight, post exacta, sonido, QA y entrega; no es aprobación de campaña.

## Mesa gastronómica y formatos nativos

[Mesa gastronómica → video nativo por formato + post exacta](food-table-native-reel-and-exact-post.md):
validado y aprobado 2026-09-13 en Fiestas Patrias. Separa plate/movimiento/overlays, preserva cueca,
resuelve 9:16 con una nueva toma cuando corresponde y verifica masters/portadas con evidencia real.

## Del estático aprobado al movimiento

[Key visual estático → loop de social](static-key-visual-to-looping-social-motion.md): validado 2026-09-22 con el
**primer motion de Efeonce** (CMP-001, «No fuiste tú»). Trae tres cosas que cuestan caro descubrir solo: el gesto
del personaje **no celebra** cuando el copy señala al espectador; el audio se corrige **quitando los términos que
inducen habla**, no prohibiendo más fuerte (13 inductores contra 2 prohibiciones); y el loop se mide entre el
**primer y el último cuadro reales**, no contra una muestra cómoda. Capacidades, tarifas y ratios reales por motor
—incluido que **4:5 no existe en ningún motor de video**— viven en la
[guía canónica de selección de modelos](../../../../docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md),
no en el workflow.

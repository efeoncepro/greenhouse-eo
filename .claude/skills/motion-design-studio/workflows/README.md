# Creative Workflows — biblioteca viva (motion-design-studio)

> **Qué es esto.** El **índice de recetas creativas con estado y evidencia explícitos** — no teoría de craft ni
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
  **evidencia** (ruta del render, fecha). Sincroniza los espejos `.codex`/`.claude`; haz commit sólo si el operador lo solicita.
- **Regla de honestidad:** documenta también lo que **NO** funcionó (con la razón), no solo los éxitos.

## Método de principio a fin

[Método operativo](../../../../docs/operations/creative-production/VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md):
lee el companion de [preproducción](../companions/video-preproduction-and-production.md),
[posproducción](../companions/video-postproduction-and-delivery.md) o
[lecciones/fallas](../companions/video-lessons-and-failure-modes.md) según el punto de trabajo.
Las recetas siguientes son aplicaciones con límites propios; no todas están aprobadas de principio a fin.

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

**La exactitud se decide por elemento.** Usa assets/mograph oficiales donde se exija reproducción exacta.
Si el operador conserva una UI o marca diegética generativa, registra esa tolerancia y revisa los píxeles;
no amplíes por tu cuenta la composición local a toda la película. En SKY se autorizaron cartelas/cierre
locales, con UI y avión generativos. Reusa la autorización vigente para entregar a revisión; aprobación
creativa final y publicación siguen separadas. **Gasto gobernado** en cada generación. Contrato Omni:
[manual CLI Omni1.1](../../../../docs/manual-de-uso/ai-tooling/gemini-omni-1-1-cli.md); `efeonce/GEMINI_OMNI_VERTEX.md` conserva el contrato/historial de su carril.

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
y el soporte de ratios por endpoint viven en la
[guía canónica de selección de modelos](../../../../docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md),
no en el workflow.

## Película generativa y cartelas exactas

[Película generativa → cartelas aprobadas → sonido separado](generative-film-with-approved-title-overlays.md):
CMP-003 SKY, 2026-09-24. Cartelas punch-v3 y cierre aprobados; alpha/Luminosidad verificados localmente.
V17 integra cielo generado, sonido separado y cierre corregido: 29,5 s/708 cuadros, 4K restaurado y1080p. QA técnica/visual documentada; escucha y aprobación final pendientes, no validación creativa integral.

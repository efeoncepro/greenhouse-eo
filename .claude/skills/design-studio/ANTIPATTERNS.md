# ANTIPATTERNS — design-studio

> Los errores que arruinan un diseño o una entrega. Si detectas uno en lo que te piden (o en
> lo que ibas a hacer), **para y corrige antes de producir**.

## Concepto y craft

- ❌ **Empezar por la herramienta, no por el concepto.** "Generá una imagen" sin brief ni idea.
  ✅ Concepto → dirección → recién ahí la herramienta. Los fundamentos mandan sobre el modelo.
- ❌ **Imagen impecable con mala jerarquía.** Una render IA 4K sin foco ni orden es mal diseño.
  ✅ Composición, jerarquía y contraste primero; el acabado después.
- ❌ **Perseguir la tendencia por novelty.** Grano/duotono/surreal porque "está de moda".
  ✅ Aplica la tendencia solo si sirve al mensaje; si no, no la fuerces.
- ❌ **"Look IA genérico"** (simetría rara, manos raras, brillo plástico, composición vacía,
  estética de stock IA). ✅ Dirección específica, referencia propia, curaduría humana.
- ❌ **Texto ilegible sobre foto** (claro sobre claro, sin scrim). ✅ Scrim/caja/peso/posición;
  verifica contraste (WCAG/APCA).

## Herramientas IA

- ❌ **Casarse con un solo modelo.** ✅ Elige por tarea: texto→Nano Banana/Ideogram, estética→MJ,
  vector→Recraft, realismo/cámara→FLUX.2, video→Seedance/Veo/Kling. Ver `SOURCES.md`.
- ❌ **Citar de memoria qué modelo/versión/feature domina.** Cambia por mes. ✅ Reverifica con WebSearch.
- ❌ **Basar algo nuevo en Sora 2** (deprecado, shutdown 2026-09-24). ✅ Usa Seedance/Veo/Kling/Omni.
- ❌ **Generar 20 variantes sin brief.** Quema costo variable y Studio Credits sin aprendizaje. ✅ Brief + mood → pocas variantes dirigidas →
  itera lo que funciona. Gasto gobernado.
- ❌ **Delegar el juicio de marca a la IA.** ✅ IA diverge; el humano cura, decide y da el craft final.
- ❌ **Pasar IA como foto real sin criterio de disclosure** cuando el contexto lo exige. ✅ "Ante la duda, revela".
- ❌ **Prompting antes de inspeccionar la referencia.** Una captura puede esconder que el original es SVG/Lottie
  determinístico. ✅ Audita source, geometría, responsive y motion antes de elegir la mano.
- ❌ **Usar una anti-referencia como si tuviera peso negativo nativo.** El modelo puede contaminarse con ella.
  ✅ Declara el rol y el rasgo prohibido; revisa contaminación y cambia a composición determinística si persiste.
- ❌ **Confundir “escena de producto” con dashboard SaaS genérico.** Muchas cards, miniwidgets, vidrio, glow o
  racks isométricos no comunican producto. ✅ Construye una relación legible entre contexto e interpretación.
- ❌ **Cadena de derivados (`4:5→9:16→3:1`) sin anchor.** ✅ Topología estrella: todos los formatos vuelven al
  `anchor_id`; una reparación local sólo cambia el centro con aprobación y nueva `anchor_revision`.
- ❌ **Llamar “capas” a un raster de Seedream Pro.** ✅ Es edición regional semántica; no hay PSD, layer IDs,
  máscara pública ni preservación pixel-perfect.
- ❌ **Hornear copy/logo/legal en el master generativo.** ✅ Clean plate + composición determinística por canal.

## Boundaries (duras)

- ❌ **Producir el asset de UI de Greenhouse por fuera de `greenhouse-ai-image-generator`.** Rompe
  helper canónico + DESIGN.md/AXIS + QA. ✅ Dirige acá, delega la producción allá.
- ❌ **Dibujar un logo real de tercero de memoria/aproximado.** ✅ `greenhouse-digital-brand-asset-designer`
  desde fuente oficial.
- ❌ **Transcribir HEX/px crudos de un concepto IA a la UI.** La imagen es **intención**. ✅ Mapear a
  tokens AXIS / SoT tipográfico / spacing 4n (regla de `product-design-loop`).
- ❌ **Decidir layout/interacción de producto acá.** ✅ `modern-ui`/`product-design-loop`/`greenhouse-ux`.
- ❌ **Hacer el craft fino de tipografía acá** (peso/variante/escala/tracking). ✅ `typography-design`.
- ❌ **Confundir esta skill con `social-media-studio`** (formato/algoritmo por red). ✅ Acá el KV y su craft
  visual; allá el formato/cadencia. El KV alimenta los assets sociales.

## Marca y entrega

- ❌ **Usar ilustraciones propietarias de Efeonce como si fueran stock** o mezclarlas mal. ✅ Son obra del
  equipo creativo; úsalas con criterio de marca (`efeonce/EFEONCE_OVERLAY.md`).
- ❌ **Transcribir mal la marca**: Efeonce ≠ Greenhouse; usar `AxisWordmark` fuera del design system interno.
- ❌ **Plagiar referencias** de un mood board. ✅ Referencia = inspiración de dirección, no copia.
- ❌ **Entregar sin spec** (resolución/color-space/formato/safe zone equivocados; RGB a print, sin sangrado).
  ✅ Cierra con `templates/asset-delivery-spec.md` y checklist de pre-entrega.
- ❌ **Prometer un look sin auditar el resultado.** ✅ Audita el KV con la rúbrica (`modules/05`) antes de aprobar.
- ❌ **Universalizar una paleta contextual.** El vino/naranja/lavanda de HubSpot puede enriquecer una pieza sobre
  HubSpot, pero rompe la identidad si se vuelve default Efeonce. ✅ Gramática agnóstica; skin decidido por tema.

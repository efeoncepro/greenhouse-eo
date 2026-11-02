---
name: berel-graphic-line
description: >-
  SOLO para Berel. Línea gráfica de Pinturas Berel (México): identidad (Gotham Rounded, rojos de
  sistema y logo oficial), recetas de banners de blog y de adaptaciones sociales, grilla del
  marcador de color, fotografía por estrato, pipeline de color con catálogo oficial y corrector
  determinista, y QA visual sobre el píxel. NUNCA se usa para Efeonce («La órbita», AXIS,
  Bricolage/Poppins: eso es efeonce-graphic-line), SKY ni ningún otro cliente. Cárgala para
  cualquier banner de Berel (N1–N4, og:image, franjas, pasos, paleta), adaptación social (post,
  story, Pinterest), plate fotográfico (registro y toma, banda del titular), producto en escena
  (render oficial a escala por diámetro, redibujado guiado y verificado), reel de transformación
  (14 s, FLUX 3 u Omni, tapa y música del mes), marcador de color o revisión visual de una pieza Berel.
  Frontera: berel-content-production decide QUÉ pieza va y CUÁNDO (ciclo editorial, ficha N1–N4,
  Notion, Drupal, voz es-MX); esta skill decide CÓMO SE VE y CÓMO SE PRODUCE en el Creative
  Workbench.
type: skill
user-invocable: true
argument-hint: '[receta, formato, espacio o pieza Berel a producir o revisar]'
---

# Berel — Línea gráfica

> **Skill de cliente, exclusiva de Berel.** Explica y cita el sistema visual de Pinturas Berel que
> vive en el Creative Workbench. Los valores (medidas, colores, umbrales) son de los contratos del
> Workbench; si esta skill y un contrato difieren, manda el contrato y se corrige la skill.

## 1. Alcance y aislamiento

Berel = Pinturas Berel, México. Efeonce produce los banners de `berel.com/inspiracion` y entrega
insumo social a la agencia que publica sus redes. **Efeonce no publica para Berel.**

- Esta skill no aplica a Efeonce, SKY ni otro cliente. Cita del operador (2026-11-01): «esto no
  debe confundir a los agentes, esto es solo para cuando trabajemos con Berel».
- Advertencia del operador al ajustar Berel (2026-11-02): «OJO! esto es solo para Berel cuidado
  dañas el flujo que usamos para efeonce».
- **Regla de aislamiento:** todo cambio Berel vive en `brands/berel/**` y `projects/berel/**` del
  Workbench. Los motores neutrales (por ejemplo `tools/surface-color.mjs`) se consumen, no se
  modifican para Berel. Antes de cerrar, verifica con
  `git -C /Users/jreye/Documents/creative-workbench diff --name-only` que ningún archivo fuera de
  esas rutas cambió. Si cambió, detente y explica por qué antes de seguir.
- Nunca importes identidad de Efeonce, AXIS o SKY a una pieza Berel, ni copies sus recetas como
  default (`brands/berel/AGENTS.md`).

## 2. Dónde vive el runtime

Workbench: repo privado `efeoncepro/creative-workbench`, checkout local
`/Users/jreye/Documents/creative-workbench`.

| Pieza | Ruta (relativa al Workbench) |
|---|---|
| Libro de marca operativo | `brands/berel/system/BEREL_VISUAL_SYSTEM_V1.md` |
| Recetas, formatos, grillas, componentes, `never` | `brands/berel/contracts/berel-recipes.json` |
| Tokens (color, tipografía, logo, eslogan) | `brands/berel/contracts/berel-tokens.json` |
| Evidencia de color (pares observados, error N41) | `brands/berel/contracts/berel-color-evidence.json` |
| Registros, tomas, banda del titular, lecho opcional, producto en escena (`productInScene`) y lecciones | `brands/berel/contracts/berel-photo-registers.json` |
| Reel de transformación (formato, línea de tiempo, tapa, música, motores, QA) | `brands/berel/contracts/berel-video-reels.json` |
| Compositor (`composeBerel`, `placeMarkers`, catálogo, QA) | `brands/berel/compose/render.mjs` |
| Elementos (logo, marcador, píldora, titular, insignia, etiqueta, tarjeta) | `brands/berel/compose/elements.mjs` |
| Tipografía a trazos (fontkit) | `brands/berel/compose/type.mjs` |
| CLI de composición | `brands/berel/scripts/componer.mjs` |
| Prompt de plate por registro y toma | `brands/berel/scripts/prompt-plate.mjs` |
| Banda del titular medida en el plate (antes de corregir o componer) | `brands/berel/scripts/medir-plate.mjs` |
| Producto en escena (colocar → redibujo guiado → verificar; restituir de respaldo) | `brands/berel/compose/product.mjs` + `scripts/producto-en-escena.mjs` (+ OCR `scripts/ocr-vision.swift`) |
| Reel (cuadros → capas → qa → armar → comparar) | `brands/berel/compose/video.mjs` + `scripts/reel.mjs` |
| Corrector de muro (adaptador Berel) | `brands/berel/scripts/ajustar-muro.mjs` → motor neutral `tools/surface-color.mjs` |
| Sugerencia de color por ΔE (no decide) | `brands/berel/scripts/color-cercano.mjs` |
| Skill operativa del Workbench | `brands/berel/skills/berel-banners/SKILL.md` |
| Pruebas | `brands/berel/test/*.test.mjs` + `test/surface-color.test.mjs` |
| Estado del harness | `docs/operations/HARNESS_STATUS.md` (sección Berel) |

Recursos licenciados **solo locales, nunca en Git**: `clients/berel/.resources-local/{fonts,logos,catalog,photos,products,video}`
(Gotham Rounded, logos SVG, catálogo `RGBs Berel_AGENCIAS_2026.xlsx` → `catalog/berel-colors.json`,
fotos de trabajo, renders oficiales de producto, tapa de cierre vigente y música del mes). Sin ellos el compositor falla cerrado y las pruebas se saltan; nunca se
sustituyen por otra fuente ni por valores aproximados.

## 3. Invariantes duros

- **NUNCA** un nombre o código de color fuera del catálogo oficial: el par nombre+código debe
  coincidir exacto y falla cerrado (código inexistente, solo legacy 2025, o nombre que no
  corresponde al código). Caso real: «Cazuela de Barro 4-2103T» en N41; ese código es Comal.
- **NUNCA** coordenadas en un job: `at`/`alt` fallan cerrado; la grilla del formato elige la celda.
  Tampoco tamaños, fuentes ni colores: la receta los define.
- **SIEMPRE** Gotham Rounded (Light/Book/Medium/Bold), sin fallback. Arial Rounded, Poppins,
  Quicksand o DM Sans no entran en piezas producidas aquí.
- **SIEMPRE** el logo SVG oficial compuesto, uno por pieza; nunca redibujado ni generado por un
  modelo. El logo impreso en la etiqueta de un producto en escena no cuenta (decisión del operador
  2026-11-02): la pieza conserva su firma. `#EA0029` vive solo dentro del logo, nunca como acento de infografía.
- **NUNCA** marca, firma ni elemento de Efeonce en una pieza Berel.
- **NUNCA** recursos licenciados (fuentes, catálogo, logos, fotos, renders, tapa, música) en Git.
- **NUNCA** un envase generado por un modelo ni textos de etiqueta alterados: el producto sale del
  render oficial vigente y el modelo solo lo redibuja con la física de la escena.
- **Berel está `gated`** en `clients/brands.json` (sin pack sellado; habilitarlo es TASK-1945). Nada
  se entrega al cliente sin aprobación de diseño de Daniela, Andrés o Melkin. Ejecutar no aprueba:
  `qa.approval` es siempre `pending-human-and-pixel-review`.
- **Efeonce entrega insumo; otra agencia publica.** El social es handoff, nunca parrilla ni posteo.
- **SIEMPRE** mira el píxel real (PNG o webp) antes de declarar algo listo. `qa.json` sin
  advertencias no prueba que la pieza se lea bien.

## 4. Flujo resumido

1. **Ficha primero.** Sin artículo escrito y ficha N1–N4 no hay banner (la escribe
   `berel-content-production`, módulos 05 y 11). Un banner sin ficha es un placeholder.
2. **Recursos locales.** Comprueba `fonts/`, `logos/`, `catalog/berel-colors.json` y `photos/`. Si
   falta algo, detente.
3. **Color.** Valida nombre+código contra el catálogo antes de cualquier generación →
   [references/color-pipeline.md](references/color-pipeline.md).
4. **Plate fotográfico** (si la foto es nueva): registro por estrato, toma, espacio y prompt con
   `prompt-plate.mjs`, banda del titular medida con `medir-plate.mjs`, generación y corrección del
   muro al HEX oficial →
   [references/photography.md](references/photography.md) y
   [references/color-pipeline.md](references/color-pipeline.md).
5. **Producto en escena** (si la pieza lo lleva): render oficial, escala por diámetro × presencia 1,4,
   redibujo guiado y `verificar` → [references/photography.md](references/photography.md) §6 bis.
6. **Receta y job.** Elige la receta y escribe el job sin geometría →
   [references/identity-and-recipes.md](references/identity-and-recipes.md).
7. **Componer.** `node brands/berel/scripts/componer.mjs <job.json> --out projects/berel/<pieza>/runs`;
   el marcador lo coloca la grilla → [references/marker-grid.md](references/marker-grid.md).
8. **QA visual.** Lee `qa.json`, mira cada pieza al 100 %, arma la hoja de contacto y revisa en el
   canvas → [references/qa-review.md](references/qa-review.md).
9. **Reel** (si la pieza lleva video): parte del job de la story ya revisada; cuadros antes/después, capas,
   clip FLUX 3 (u Omni por toma), `reel.mjs qa` y armado con tapa y música del mes →
   [references/video.md](references/video.md).
10. **Entrega y revisión humana** (nombres, Frame.io, canvas, respuesta a comentarios) →
   [references/workflow.md](references/workflow.md).
11. **Lecciones.** Todo error corregido queda registrado →
   [references/lessons.md](references/lessons.md).

## 5. Elegir la referencia

| Pedido | Referencia |
|---|---|
| ¿Qué tipografía, color de sistema o logo uso? ¿Dónde va el logo? | [identity-and-recipes.md](references/identity-and-recipes.md) |
| Portada, cierre, franjas, pasos, paleta, post, story, Pinterest | [identity-and-recipes.md](references/identity-and-recipes.md) |
| Señalización o técnica-gráfica | [identity-and-recipes.md](references/identity-and-recipes.md) (declaradas sin render) |
| Reel de transformación: cuadros, motor (FLUX 3 / Omni), efecto de aparición, QA de color, música y tapa | [video.md](references/video.md) |
| ¿Por qué el marcador quedó ahí, se eliminó o salió con aviso? | [marker-grid.md](references/marker-grid.md) |
| El titular social no cabe o se lee mal | [marker-grid.md](references/marker-grid.md) |
| Foto nueva: estrato, espacio, toma, prompt, remates, banda del titular | [photography.md](references/photography.md) |
| Producto en escena: render, escala, presencia, recortes, dos logos, `verificar` | [photography.md](references/photography.md) §6 bis |
| El muro no es del color del catálogo · qué modelo · corrector · ΔE | [color-pipeline.md](references/color-pipeline.md) |
| Revisar una pieza o un lote antes de subir · leer `qa.json` | [qa-review.md](references/qa-review.md) |
| Rutas de corridas, canvas, Frame.io, nombres de archivo, handoff | [workflow.md](references/workflow.md) |
| Errores ya ocurridos y la regla que dejaron | [lessons.md](references/lessons.md) |
| Ciclo editorial, ficha N1–N4, Notion, Drupal, copy social | skill `berel-content-production` |

## 6. Frontera con `berel-content-production`

| Decide | `berel-content-production` | `berel-graphic-line` (esta) |
|---|---|---|
| Qué pieza existe y cuándo | ✔ (ficha N1–N4, 🔁, cupo, Notion) | — |
| Spec de entrega del blog (1408×768, webp, < 200 KB) | ✔ (módulo 05 transcribe la Spec de la wiki; manda la Spec) | la aplica |
| Texto del artículo, ALT, voz es-MX, copy social | ✔ | — |
| Si el artículo lleva reel o producto en escena (y cuál producto) | ✔ (ficha) | — |
| Identidad, receta, grilla, fotografía, color, composición | — | ✔ |
| Producto en escena (render, escala, presencia, `verificar`) y reel (cuadros, motor, QA, tapa, música) | — | ✔ |
| QA visual del píxel y estados de revisión | QA editorial y Frame.io (módulo 20) | ✔ (QA del compositor y del plate) |

Si una medida de entrega difiere entre ambas, manda la Spec de imágenes de la wiki de Berel; si
difiere un valor visual, manda el contrato del Workbench.

**Conflictos abiertos entre ambas skills (no los resuelvas tú; pregúntale al operador o a Berel):**

- **Base de la adaptación social.** `berel-content-production` (módulo 05) marca la infografía N2 🔁 como base
  de la adaptación social; el libro de marca y la receta `social.post` usan la escena de la portada o su versión
  «después», no la infografía. Hasta que se decida, sigue lo que diga la ficha del artículo y avisa del choque.
- **Nombre de archivo.** El módulo 05 pide `.webp` en minúsculas y con guiones; la skill operativa del Workbench
  nombra `N##_BN_<ROL>.webp` y `N##_SM_<POST|STORIE|PINTEREST>.png` (el corpus de reels usa `N##_SM_REEL.mp4`). Para la entrega manda la Spec de la wiki.

## 7. Mantenimiento (skill viva)

- Toda sesión que cambie una regla Berel (receta, grilla, umbral, registro, lección) actualiza
  **en el mismo trabajo** el contrato del Workbench y esta skill. El contrato es la fuente de verdad
  de los valores; la skill los explica, cita la ruta y fecha el snapshot.
- Las citas del operador se copian textuales y fechadas; lo no verificado se marca como pendiente.
- Lo pendiente de confirmar con Berel se mantiene marcado hasta que Berel responda (ver
  [identity-and-recipes.md](references/identity-and-recipes.md) §Pendientes).
- El bundle se espeja byte a byte en `.codex/skills/berel-graphic-line/`; el espejo lo hace quien
  orquesta el cambio, al final, nunca a mano archivo por archivo en paralelo.

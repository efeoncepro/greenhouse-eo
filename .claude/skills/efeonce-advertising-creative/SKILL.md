---
name: efeonce-advertising-creative
description: Orquesta piezas publicitarias y de social media con texto —posts, stories, reels, covers, banners, key visuals, brochure, OOH y motion— aplicando contratos AXIS de tipografía y selección colaborativa, Bricolage/Poppins/Guttery reales, bounding boxes adaptativos, cursores semánticos, contraste y accesibilidad. Úsala al crear, corregir o auditar una pieza, componer texto o multiplayer sobre imagen o preparar variantes. No sustituye la estrategia de canal ni autoriza publicación.
---

# Efeonce Advertising Creative

Convierte las reglas publicitarias de AXIS en decisiones de producción verificables para Codex y Claude. Es
una orquestadora: no duplica valores tipográficos ni reemplaza las skills de oficio.

## Fuentes y orden de carga

1. Lee el contrato operativo en
   [ADVERTISING_CREATIVE_AGENT_EXECUTION_V1](../../../docs/operations/ADVERTISING_CREATIVE_AGENT_EXECUTION_V1.md).
2. Consulta primero la guía portable
   `../axis-design-system/docs/creative-applications/advertising-social/DESIGN.md` y abre el
   [Creative Typography Workbench](https://axis.efeonce.org/references/creative-typography/). Usa su asesor con
   el soporte, largo e intención reales para obtener una receta candidata y un caso comparable; después resuelve
   cada valor desde el export `axisAdvertising` y el contrato `efeonce.advertising-typography`. El contrato
   versionado prevalece ante cualquier drift. Su lifecycle `trial` obliga a conservar evidencia y evita
   presentarlo como estable antes del segundo consumidor real.
3. Carga la skill tipográfica activa y sólo las referencias que apliquen:
   - [ink, jerarquía y espaciado](../../../.codex/skills/greenhouse-typography-accessibility/references/campaign-ink-metrics-and-hierarchy.md);
   - [casos reales y reconstrucciones didácticas](../../../.codex/skills/greenhouse-typography-accessibility/references/real-campaign-typography-cases.md).
4. Para social, compón con `social-media-studio`; para imagen generada, con
   `greenhouse-ai-image-generator` y `greenhouse-ai-creative-rights-governance`; para video/motion, con
   `motion-design-studio`; para copy, con `copywriting`; para marca Efeonce, con `efeonce-brand-studio`.
   Si una de esas skills ya inició el encargo, no la vuelvas a cargar ni reinicies el brief.
5. Usa [brief y gate de calidad](references/creative-brief-and-qa.md) para registrar la decisión y revisar
   el archivo final.

### Motor de IA: cómo elegir (as-of 2026-09-16)

Guía canónica: `docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md`. Detalle de imagen en `greenhouse-ai-image-generator` §Elegir modelo y de video en
`motion-design-studio/workflows/engine-selection-by-fidelity-contract.md`.

- El modelo entrega **sólo el medio limpio**; texto, logo, CTA y legal se componen con AXIS, nunca se generan.
- Plate cotidiano → GPT Image 2.5 Flare; edición precisa, máscara o master final → 2.5 Sunburst
  (`pnpm ai:image --model gpt-image-2.5-sunburst`); material/atmósfera → Seedream 5 Pro; divergencia barata →
  Seedream 5 Lite (`pnpm ai:fal`).
- Resolución nativa > 2K (OOH, print proof) → Seedream 5 Lite o GPT Image (hasta 3840×2160, experimental sobre
  2560×1440); Seedream 5 Pro en fal **no pasa de 2048²**.
- Formato más extremo que 3:1 → Seedream (1/16–16); GPT Image tope 3:1.
- Motion con marca o personas → Flux 3 o Wan 3.0, no Seedance (su filtro rechaza tras cobrar); presupuesta por
  resolución (el CLI estima antes de encolar y pide `--yes` sobre el tope; sin `--resolution` usa el escalón más
  barato) y confirma con `pnpm ai:fal --balance`.

## Bucle de trabajo

1. **Resuelve el encargo.** Define marca/cliente, objetivo, soporte, dimensiones, audiencia, copy literal,
   CTA, activos disponibles, derechos y estado esperado. Aprovecha el contexto ya entregado; pregunta sólo
   por una ausencia que cambie materialmente la pieza.
2. **Asigna funciones, no fuentes por gusto.** Declara una voz display dominante, una voz estructural y, si
   aporta sentido, un gesto breve. Prueba el encargo en el asesor del Workbench y usa su resultado como hipótesis:
   Bricolage instala la idea, Poppins estructura y Guttery sólo aparece como gesto opcional. Elige los valores
   definitivos desde AXIS después de conocer longitud, fondo, tamaño final y distancia de lectura.
3. **Construye el medio limpio.** Genera o selecciona imagen/video sin texto ni logotipos inventados. Compón
   tipografía, marcas y legales de forma determinista con los archivos oficiales. El isotipo 3D de Efeonce es
   elemento ilustrativo, no firma. Para el logo completo como objeto físico en una escena, usa el
   [kit de referencia 3D](../greenhouse-ai-image-generator/references/logo-3d-reference-kit.md): **por defecto, pasada
   directa** —el render entra como referencia de **forma** y el prompt lleva la **intención** (material, montaje,
   escena, atmósfera)—, también cuando la pieza cambia el material (acero, vidrio, neón) o la escena tiene atmósfera
   fuerte como la larga exposición. Elegir la referencia por **luminancia** (blanca para materiales claros, navy para
   oscuros o el color de marca). **Nunca pegar el render como camino por defecto**: se ve falso. El halo enmascarado
   es la **excepción**, sólo con el material exacto del kit y el objeto chico o de detalle fino. **El QA es letra por
   letra** —«e», «f», nave, órbita con sus cortes, tres ventanas— y una letra distinta obliga a regenerar; la firma
   sigue siendo el SVG oficial.
   Cuando la pieza requiera firma web, usa el SVG canónico
   `src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg`: no lo reconstruyas con texto o CSS. Conserva
   `efeoncepro.com`, `opacity: 0.72`, fusión `luminosity`, escala proporcional y comprueba píxeles visibles en el
   master, no sólo presencia de markup. En Sharp usa el compositor canónico, que calcula el blend no separable
   contra el canvas; no confíes en que librsvg ejecute `mix-blend-mode`. Desde un compositor de corrida (fuera de
   `pnpm creative:layout`) **importa** esa función, no la reimplementes:
   `import { compositeLuminosity } from '<repo>/scripts/creative/layout-compiler/compiler.mjs'` y llama
   `compositeLuminosity({ backdropBytes, sourceBytes, left, top, width, opacity: 0.72 })` con el SVG rasterizado
   como `sourceBytes`; usa `output` como nuevo master y falla si `evidence.method !== 'non-separable-luminosity'`.
   La firma web no entra en la medición de contraste p98: su prueba es la evidencia de fusión más la revisión visual.
   **Si el logo 3D ya es héroe de la escena, la firma es url-lum, no un segundo logo plano** (caso contraportada de
   «Nivel de búsqueda», 2026-09-19).
   Si la pieza usa selección activa o presencia multiplayer, no dibujes cursores con coordenadas decorativas:
   declara un `AxisCollaborationSelectionIntent`, resuélvelo con `efeonce.collaboration-selection` y entrega el
   manifest `axis.collaboration-selection-composition.v1` al adapter de la superficie.
4. **Diseña contraste.** Prueba peso, ancho, tamaño, leading, tracking, cortes y densidad juntos. ExtraBold no
   es un default; una cursiva o Guttery larga tampoco. El contraste útil puede venir de peso, escala, espacio,
   color, posición o tiempo, pero cada capa debe conservar una función.
5. **Protege lectura y marca.** Mide contraste sobre los píxeles reales de cada zona. Si falla, cambia
   encuadre, posición, color o plate antes de añadir contornos/sombras decorativas. **En fotografía de marca
   Efeonce NUNCA un scrim** (2026-09-19): la zona se pide con su tono en la toma y, si no pasa, se regenera. Un logo negativo
   sobre una zona clara o variable es un DON’T aunque el archivo sea oficial.
6. **Revisa en el tamaño de uso.** Comprueba composición completa y vista reducida, safe areas, ritmo,
   desbordes, solapamientos, contraste, logo, subtítulos y `prefers-reduced-motion` cuando corresponda.
   Ningún texto de diagnóstico, caja de selección o guía puede quedar dentro del entregable.
7. **Entrega evidencia honesta.** Muestra la pieza y conserva formato, fuente editable/export, decisiones
   tipográficas, provenance y resultado del gate. Distingue prueba producida, revisada, aprobada, programada,
   publicada y medida.

## Jerarquía por voces: receta probada en carrusel (2026-09-19)

Caso: carrusel «Nivel de búsqueda» (GTA VI, 9 láminas 1080×1350 + pieza suelta), aprobado tras una pasada pedida
por el operador para que «no haya jerarquías planas». Compositor de referencia:
`ai-generations/2026-09-19_nivel-de-busqueda/componer-v2.mjs` + `brief/slides-v2.json`; método completo en la
[bitácora](../../../docs/operations/social/2026-09-19-nivel-de-busqueda-gta6-trendjack-production-method.md).
Es una receta de caso, no un preset: nombres de receta desde `axisAdvertising.recipes`; los pesos citados son los
que usó el caso y se revalidan con cada fondo, largo y soporte.

| Voz | Función | Tipografía (caso) | Tinta (caso) |
|---|---|---|---|
| Etiqueta | Nombra la misión/tema | Poppins 700 mayúsculas, tracking `structureLabel` (el **marcador estrella fue puntual de GTA VI**: no va en otras piezas) | blanco |
| Entrada | Prepara la tesis | Bricolage `ideaLead`; nombres propios con `**…**` a 760 | `softOnDark` `#cfe4fa`; énfasis blanco |
| Dominante | La tesis en 1–3 palabras | Bricolage `ideaImpact` a ancho 78 | blanco; palabra clave `[[…]]` en naranja Efeonce |
| Cierre de frase | Completa la tesis | Bricolage `ideaMedium`, remate `**…**` a 800 | blanco, o celeste con remate blanco |
| Tarjeta HUD | Giro/argumento sobre la escena — **sólo ilustración/HUD de género; en foto de marca va como texto limpio** | Poppins 400 + remate Poppins 700 | celeste + blanco |
| Gesto (opcional) | Voz humana breve | Guttery, 1 por pieza, ≤ 3 palabras | blanco |

- **Regla: dos niveles vecinos nunca comparten peso y color a la vez.** La v1 falló por eso (entrada 740 vs dominante
  780, ambos blancos): se leía como un solo bloque. Separa por al menos dos ejes (peso, tinta, escala, familia).
- Una etiqueta naranja sobre cielo violeta no pasó contraste: la etiqueta va en blanco y el naranja se reduce al
  marcador. El naranja es acento, no tinta de texto por defecto.
- **Ancho 78 de Bricolage (eje autorizado 75–100)** para el dominante es una decisión declarada del caso: registro
  condensado de cartel de acción sin deformar el glifo. Declárala en la ficha tipográfica; no es el ancho por defecto.
- El dominante se ajusta a un ancho máximo declarado (`dominantMax`) para dejar aire a las etiquetas de los
  colaboradores, que viven fuera de su caja.

### Texto enriquecido por palabra

La jerarquía también vive dentro de la línea. El compositor de referencia expone `richBlock` + `parseRich`:

- `**negrita**` sube al peso superior **de la misma familia** (par base/negrita declarado con
  `BRIC(recipe, width, boldWeight)` o `POP = { base: 400, bold: 700 }`); no cambia la tinta.
- `[[acento]]` cambia la tinta al `accentFill` del nivel: naranja en el dominante, blanco en entrada, tarjeta y pie.
- `|` fuerza salto; el wrap es por palabra con estilo por segmento, anclado por la parte superior de la tinta.
- Devuelve `accentBoxes`: **el contraste del acento se mide por separado** del resto del bloque.
- **El acento naranja sólo va sobre cielo oscurecido.** Sobre horizonte o skyline encendido cae a 1,0–2,0:1 (p98). Si
  no se lee a 390 px, degrada el énfasis a peso con tinta clara (`**…**`) en vez de naranja (casos «ChatGPT.» en la
  portada y «Nadie» en la pieza suelta). La p98 es conservadora (pesca luces puntuales): acentos naranjas ≥ 150 px con
  1,8–2,5:1 se leyeron bien a 390 px; si los apruebas así, registra la revisión visual junto al número.

### Guttery

- Archivo: `~/Library/Fonts/Guttery.otf` (no versionado en el repo; declara `fontFilesBundled: false` en la
  evidencia). Si no existe en la máquina, esa capa se omite; no se sustituye por otra familia.
- Cobertura verificada 2026-09-19: `¿ ¡`, tildes y `ñ` (`¿apostamos?`, `¡a la orden!`, `¿hola?`).
- Una por pieza, ≤ 3 palabras, rotación leve; **blanco sobre fondos cálidos** (el naranja se pierde en el atardecer).

## Reglas duras

- Usa archivos tipográficos reales y `font-synthesis: none`; no simules cursiva, bold ni Guttery con otra
  familia. Si falta el archivo autorizado, detén esa capa y usa una receta permitida que sí exista.
- Bricolage puede dominar titulares; Poppins ordena apoyo, continuidad y énfasis breve; Guttery funciona como
  gesto corto y opcional. La pieza manda sobre el nombre de la familia: si dos voces compiten, retira una.
- No copies cifras desde esta skill ni inventes presets universales. Lee la versión vigente de
  `axisAdvertising`; un valor de campaña sólo se reutiliza si el nuevo formato reproduce sus condiciones.
- No incrustes copy crítico o logos dentro de una generación cuando el texto debe ser exacto.
- La fotografía de marca propia Efeonce sigue el
  [lenguaje fotográfico](../design-studio/references/efeonce-photographic-language.md): la firma sobre el lecho
  desenfocado usa el SVG oficial **compuesto** (15% del ancho, contraste ≥ 4,5:1 medido), **nunca generado**.
- No uses rectángulos decorativos detrás de palabras como solución automática. Un plate existe para asegurar
  contraste y debe responder a la composición, no parecer una etiqueta accidental.
- No conviertas un ejemplo aprobado en regla universal ni un mockup didáctico en campaña publicada.
- No presentes una receta del Workbench como aprobación creativa. La recomendación aún requiere composición,
  QA tipográfico, contraste sobre píxeles reales y las aprobaciones de marca/cliente que correspondan.
- No copies `CollaborationSelection.astro` ni su CSS hacia otra superficie. Usa el contrato portable y exige
  un adapter que mida el objeto real, mantenga cursores acting fuera del bounding box y preserve juntos cursor
  multiplayer y placa de identidad. Si no existe adapter para ese motor, reporta la capacidad como pendiente;
  no la simules con `top`/`left` arbitrarios.
- Producir y corregir son acciones reversibles autorizadas por el encargo. Programar, publicar, enviar o gastar
  presupuesto sigue requiriendo la autoridad correspondiente.

## MCP

`mcp.efeonce.org` puede aportar herramientas y contexto cuando el dominio conectado los expone, pero hoy no
publica este manual: el catálogo `get_greenhouse_skill` sólo acepta manuales que gobiernan tools MCP reales y
la superficie federada no contiene una tool de composición publicitaria. No asocies este conocimiento a una
tool ajena ni presentes la conexión MCP como fuente de fonts, logos o aprobación. Cuando exista una capability
creativa federada, su manual podrá proyectar este mismo contrato sin duplicarlo.

## Supporting tagline portable

Cuando una pieza necesite una frase de apoyo vinculada al ancho de su lockup principal, usa
`axisAdvertising.compositions.supportingTagline`. La receta no contiene copy fijo ni publica un componente:
el agente entrega la oración en orden de lectura, declara la medida de referencia y asigna hasta dos segmentos
por intención. `growth` y `intervention` son roles semánticos; no significan que todas las apariciones de una
palabra concreta reciban siempre el mismo color.

El adapter debe tratar la frase como una unidad, conservar espacios naturales y escalarla uniformemente hasta
la medida del lockup. Nunca distribuye palabras con `space-between`, márgenes por fragmento o coordenadas libres.
Prefiere una línea; si mantenerla reduce la lectura bajo el piso del formato, usa un salto balanceado de la
oración completa. Mide contraste y ritmo después del fitting. El espécimen `Cómo escalar... automatizar...` es
evidencia del contrato, no su API.

Para una producción nueva, copia y completa `templates/axis-advertising-layout-contract.yaml`. La variante
Regular y la Bold Italic deben venir de los assets Poppins versionados del consumidor; nunca de una ruta local
del sistema ni de síntesis tipográfica.

## Selección colaborativa invocable por agentes

**Escala y color de campaña (adapter, 2026-09-17).** `renderCollaborationSelection` acepta `presentation` opcional:
`collaboratorScale` (etiqueta y cursor colaborador; ~1,9 para que el nombre se lea a 390 px en 1080 de ancho),
`localCursorScale` y `participantColors` por id de cursor (p. ej. color de marca de un partner). La tinta de la
etiqueta se elige por contraste WCAG y el render falla bajo 4,5:1. Sin `presentation` el resultado es idéntico al
contrato por defecto. No recolorear ni reescalar el SVG a mano. Caso: KV «Tu IA no conoce tu negocio».

**Fondo bajo una selección.** Los controles (trazo `#a6cdf5`, tiradores blancos) están diseñados para fondo oscuro y
desaparecen sobre claro: el fondo bajo la selección debe ser oscuro por escenografía de la imagen, no por degradado.

La API agent-facing vive en AXIS, no en la página del Lab. Dentro de Greenhouse, un agente normaliza la
intención con:

```bash
pnpm creative:collaboration:resolve -- \
  --input <campaign-run>/brief/collaboration-selection-intent.json \
  --out /ruta/absoluta/collaboration-selection.manifest.json
```

El agente autoriza intención, no píxeles: `targetId`, tipo de objeto, variante de selección, aire, overlay y
cursores. El resolver completa defaults, dirección, acción y attachment, y rechaza contradicciones. El adapter
del compositor liga `target.id` al texto/objeto/grupo real y verifica la geometría. El Campaign Layout Compiler
consume el intent declarado en el contrato y soporta `headline|support|hook|lockup`; `targetKind` debe coincidir
con `text|text|object|group`. Esta ruta no llama a un modelo, no publica ni aprueba. Usa
`templates/collaboration-selection-intent.json` como estructura, no como copy fijo.

Contrato observado al componer piezas reales (2026-09-16, [bitácora](../../../docs/operations/social/2026-09-16-viva-mexico-y-previa-18-production-method.md)):

- los colaboradores sólo se anclan en esquinas (`collaborator-anchor-not-corner`); un cursor `moving` no lleva
  `targetId` (`moving-cursor-must-not-target-selection`);
- las etiquetas de esquina se ubican fuera del objeto: deja aire lateral (en 1080 px, un titular a ≤ ~64 % del ancho)
  y exige `evidence.withinCanvas` antes de exportar (necesario, no suficiente: ver el caso sobre fotografía abajo);
- `renderCollaborationSelection` emite etiquetas como `<text>`; si el rasterizador no garantiza Poppins, conviértelas a
  trazados con la fuente real en la misma posición y falla si queda algún `<text>`;
- las etiquetas quedan pequeñas por contrato: no cargues en ellas información que la pieza necesite leer.

Sobre una **fotografía** (primer uso, 2026-09-17, «¿Claude o Codex?», `ai-generations/2026-09-17_claude-o-codex/`):

- receta: `resolveCollaborationSelectionIntent` → `renderCollaborationSelection` con `targetBounds` = caja de
  **tinta** del titular (no la métrica de la fuente); etiquetas a trazos con fontkit, porque el render no tiene
  fuentes instaladas;
- con **dos colaboradores** el aire lateral se paga dos veces, porque etiquetas y cursores viven **fuera** de la caja
  del objetivo: el titular al 66 % del ancho sacaba las etiquetas del lienzo por ambos lados; funcionó al 58 % con
  los colaboradores anclados arriba (`top-start` y `top-end`), que además los aleja de la coronilla del retratado;
- **`evidence.withinCanvas: true` no prueba que la etiqueta respire**: puede dar `true` con la placa pegada al
  borde. Mira el render en ese borde antes de exportar;
- los colaboradores pueden ser **mascotas de partners** disputándose el objeto (Clawd `#d77757`, Codex `#2f67db`
  medido sobre el plate, no inventado): la decisión del titular es el objeto seleccionado.
  `presentation.participantColors` acepta sólo `#rrggbb`.

En **carrusel sobre ilustración** (2026-09-19, «Nivel de búsqueda», `componer-v2.mjs`):

- **Cursores en movimiento = los «cursores solos».** Un colaborador que sólo transita se declara
  `{ kind: 'collaborator', state: 'moving', canvasRegion: '<región>', action: 'move', label }`, sin `targetId`.
  **No existe cursor sin caja**: `renderCollaborationSelection` siempre dibuja la selección del target; si quieres
  presencia sin selección, la pieza igual necesita un objeto seleccionado y el `moving` pasea fuera de él.
- **Anclas con texto alineado a la izquierda**: colaboradores en `top-end` / `bottom-end`; `top-start` saca la etiqueta
  del lienzo por el margen izquierdo. El cursor local acepta cualquier ancla; usa **`end-center`** cuando hay una frase
  de cierre debajo del dominante (`bottom-*` la tapaba).
- **Etiquetas cortas**: «Equipo Efeonce» se salió del lienzo con dos colaboradores → «Efeonce». Roles de una palabra
  (SEO, Contenido, Data, PR, Dev, Nexa) leen mejor a 390 px.
- Si el dominante está alto, las etiquetas de esquina chocan con el HUD o la etiqueta: baja el bloque, no el cursor.
- **Diagnóstico**: con `evidence.withinCanvas === false`, falla e imprime `evidence.cursorEvidence[].labelBounds`
  (junto a `evidence.target` y `bounds`) para ver qué placa se sale y por qué lado.
- `presentation` del caso: `collaboratorScale: 1.8`, `localCursorScale: 1.2`, `participantColors` por id en `#rrggbb`
  (Clawd `#d77757`, Codex `#2f67db`, Nexa `#d6246e`, SEO `#12afa2`, Contenido `#ff6500`, Data `#5d50ff`, Dev
  `#0375db`). Los colores de rol son del caso, no una paleta canónica.

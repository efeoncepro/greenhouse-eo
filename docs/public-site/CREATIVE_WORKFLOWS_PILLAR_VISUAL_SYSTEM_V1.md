# Creative Workflows Pillar: sistema visual V1

> **Estado:** producción V5 cerrada; seis assets seleccionados, auditados y cargados en WordPress. La V5 pública
> integra cinco imágenes de cuerpo, seis captions y usa el hero como featured/Open Graph image.
> **Fecha:** 2026-07-15.
> **Artículo fuente:** [GutenbergArticleSpec V2](CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V2.json).
> **Artículo integrado:** [GutenbergArticleSpec V4](CREATIVE_WORKFLOWS_PILLAR_GUTENBERG_SPEC_V4.json).
> **Contrato editorial:** [Editorial Rewrite V2](CREATIVE_WORKFLOWS_PILLAR_EDITORIAL_REWRITE_V2.md).
> **Corrida:** `ai-generations/2026-07-15_creative-workflows-pillar/`.
> **Auditoría:** [Visual Audit V1](CREATIVE_WORKFLOWS_PILLAR_VISUAL_AUDIT_V1.md).
> **SEO/readback:** [E-E-A-T Audit V4](CREATIVE_WORKFLOWS_PILLAR_EEAT_AUDIT_V4.md).
> **Frontera:** este sistema produjo masters y derivados web y registró IDs reales. La publicación del post
> `251363` fue una operación posterior, explícita y autorizada; el sistema visual no autoriza publicaciones futuras.

---

## 1. Trabajo visual

Las imágenes no deben repetir literalmente los encabezados ni decorar espacios largos. Cada una debe resolver
una comprensión que el texto, por sí solo, exige imaginar:

1. **Conflicto:** abundancia de outputs sin claridad de dirección.
2. **Interfaz:** el creativo opera significado; el sistema conserva estructura.
3. **Mecanismo:** exploración divergente y producción convergente ocurren a velocidades distintas.
4. **Continuidad:** una intención atraviesa decisiones, producción, revisión y aprendizaje sin perder origen.

## 2. Concepto maestro

### Nombre

**La señal seleccionada**.

### Idea

Muchas alternativas compiten alrededor de una pieza que una persona ha elegido con intención. Esa pieza se
convierte en un motivo visual recurrente y viaja por las cuatro imágenes: primero aparece entre el ruido, luego
se conecta a una receta invisible, después cruza el punto de decisión entre dos velocidades y finalmente se
transforma en una familia de entregables.

### Motivo recurrente

Una composición de campaña ficticia, sin marca ni texto legible, construida con:

- un campo azul intenso;
- una diagonal verde lima;
- un círculo cálido rojo/coral;
- una figura fotográfica o abstracta de alto contraste;
- papel y textura táctil, no una UI futurista.

El motivo debe ser reconocible entre imágenes, pero puede variar de crop y escala. No es un logo ni una marca
ficticia completa.

## 3. Dirección de arte

### Lenguaje

Editorial contemporáneo, mixed-media y documental. Fotografía natural combinada con papeles, impresos,
anotaciones visuales no legibles, marcas de selección y capas translúcidas. Debe sentirse como trabajo creativo
real, no como una oficina de stock ni como ciencia ficción corporativa.

### Composición

- master horizontal `3:2`, preparado para derivados `16:9` y `1200×630`;
- un solo foco primario por imagen;
- centro óptico protegido para crops responsivos;
- masa visual asimétrica y espacio negativo suficiente;
- flujo izquierda→centro→derecha cuando la imagen explique una secuencia;
- contraste de valor que sobreviva en escala de grises.

### Paleta

- neutros claros y carbón para estructura;
- azul Efeonce como ancla;
- verde lima como señal de decisión/continuidad;
- rojo coral o ámbar como contraste secundario;
- pieles, madera, papel y luz natural para evitar una composición monohue.

Los colores orientan el raster. No se convierten en nuevos tokens ni reglas de UI.

### Textura

- papel mate, bordes de impresión, cinta y grano fotográfico fino;
- superficies reales y luz lateral suave;
- imperfección controlada;
- nada plastificado, excesivamente brillante o esterilizado.

### Personas

Cuando aparezcan personas, deben leerse como equipo creativo latinoamericano contemporáneo, con diversidad
natural y sin pose publicitaria. Manos anatómicamente plausibles, gestos concentrados y ropa cotidiana. Nadie
mira a cámara.

## 4. Invariantes

- Sin logos, isotipos, marcas de terceros ni nombres de clientes.
- Sin texto legible dentro del raster.
- Sin robots, manos robóticas, cerebros luminosos, código flotante o túneles de datos.
- Sin dashboards falsos, nodos técnicos o una interfaz que contradiga la tesis creative-native.
- Sin personas sonriendo a cámara ni estética de banco de imágenes.
- Sin gradientes decorativos, orbes, bokeh o iluminación neón cyberpunk.
- Sin representar la automatización como una cinta industrial que elimina a las personas.
- Sin afirmar que la escena corresponde a un cliente o caso real.
- Sin marca Greenhouse ni `AxisWordmark`; la superficie pública pertenece a Efeonce.
- Sin imitar por nombre a artistas vivos.

## 5. Asset 01: hero / featured image

### Función

Convertir el hook en una escena: muchas piezas fueron generadas, pero la dirección original casi se perdió. El
ojo debe descubrir una sola composición seleccionada en medio de variaciones plausibles.

### Ubicación

- featured image del post;
- imagen social/OG derivada, si supera prueba de miniatura;
- no duplicar dentro del cuerpo salvo que el template de Ohio no muestre featured image.

### Composición

Vista cenital oblicua de una mesa de estudio. Dos o tres personas revisan impresos y una pantalla lateral. Hay
muchas variaciones relacionadas, algunas demasiado similares. En el centro óptico, una mano separa o marca la
dirección elegida. El brief está presente como objeto, pero su texto es ilegible.

### Prompt verbatim

```text
Use case: photorealistic-natural
Asset type: featured editorial image for a long-form Efeonce article about Creative Workflows
Primary request: show the tension between generating many creative outputs and making one clear human decision
Scene/backdrop: a real contemporary Latin American creative studio, viewed from a high oblique top-down angle; a large worktable with tactile printed campaign variations, a side monitor, reference materials and one brief sheet
Subject: two or three creative professionals actively reviewing the work, seen mostly from shoulders and hands, never posing; many related visual variations surround one clearly selected campaign direction in the optical center; one natural hand is moving or marking the selected piece
Recurring campaign motif: a fictional text-free key visual using a strong cobalt field, one lime diagonal ribbon, one warm coral circle and a high-contrast photographic or abstract figure; it must appear across the variations and be clearest in the selected piece
Style/medium: premium documentary editorial photography with subtle mixed-media tactility, realistic paper, print edges, soft fine grain, natural imperfections, not glossy stock photography
Composition/framing: horizontal 3:2 master with a protected central 16:9 safe area; asymmetrical balance; one unmistakable focal point on the selected piece; enough edge detail to communicate abundance without clutter; crop-safe for 1200x630
Lighting/mood: soft directional daylight, focused and thoughtful, warm neutral surfaces with cobalt, lime and coral accents
Text: no readable text anywhere
Constraints: anatomically plausible hands; believable paper and screens; no brand logos; no client names; no one looking at camera; the selected direction must be visually clearer than all other outputs
Avoid: robots, robotic hands, glowing brains, floating code, futuristic holograms, fake dashboards, neon cyberpunk, gradient orbs, bokeh decoration, generic smiling office team, watermarks
```

### ALT

`Mesa de trabajo creativa con múltiples variaciones visuales alrededor de una dirección seleccionada.`

### Caption

`Generar más opciones no resuelve qué dirección merece avanzar.`

### Criterio de descarte

Descartar si el foco cae en la cantidad de papeles y no en la selección, si las manos son defectuosas, si se
lee como fotografía de stock o si el motivo elegido no puede reconocerse en miniatura.

## 6. Asset 02: el oficio como interfaz

### Función

Hacer visible la frase “La interfaz del creativo no debería ser un grafo. Debería ser su oficio.” La imagen
debe mostrar dos capas conectadas sin dividirlas como mundos opuestos.

### Ubicación

Después del párrafo que describe cómo el sistema compila una receta mientras la persona trabaja con
significado, dentro de `La interfaz del creativo no debería ser un diagrama`.

### Composición

Un escritorio de trabajo visto en corte editorial. En la capa superior hay referencias, muestras, encuadres,
la pieza seleccionada y manos creativas. Debajo de una superficie translúcida aparece una estructura ordenada
de versiones, permisos y transformaciones representada con tarjetas, rails y archivos, sin nodos técnicos ni
texto. Una línea verde continua conecta ambas capas.

### Prompt verbatim

```text
Use case: stylized-concept
Asset type: in-article editorial illustration for an Efeonce long-form article
Primary request: visualize that a creative person works with briefs, references, treatments and approval while an orderly executable recipe is preserved invisibly underneath
Scene/backdrop: a sophisticated cutaway view of one real creative worktable, not two separate worlds
Upper visible layer: tactile references, crop frames, color samples, the selected fictional campaign key visual and two human hands making a visual choice
Lower hidden layer: seen through a subtle translucent table surface, an orderly system of version cards, bounded transformations, archived assets and review checkpoints; represent structure through geometry and continuity, not through software UI or engineering nodes
Recurring campaign motif: the same text-free cobalt key visual with a lime diagonal ribbon, coral circle and high-contrast figure
Style/medium: premium editorial mixed-media illustration combining realistic photography, paper collage, restrained architectural cutaway and fine grain
Composition/framing: horizontal 3:2; upper creative layer receives first attention, hidden system is secondary but clearly connected; one continuous lime line travels from the selected piece into the structured layer; strong figure-ground separation and generous breathing room
Lighting/mood: calm, intelligent, tactile, human; warm paper and charcoal neutrals balanced by cobalt, lime and coral accents
Text: no words, letters, numbers or readable interface labels
Constraints: the lower layer must feel supportive rather than controlling; hands must be anatomically plausible; no logos; no fake application screenshot
Avoid: flowchart nodes, code, circuit boards, robots, holograms, neon, glassmorphism UI, data tunnels, server racks, generic corporate infographic, watermarks
```

### ALT

`Capas de un proceso creativo: referencias y decisiones visibles sobre un sistema ordenado que conserva versiones.`

### Caption

`El creativo trabaja con significado; el sistema conserva la receta.`

### Criterio de descarte

Descartar si la capa inferior domina, si parece un dashboard, si la relación entre capas no se entiende o si
la escena sugiere que el sistema decide por la persona.

## 7. Asset 03: las dos velocidades

### Función

Explicar el mecanismo central del artículo sin depender de labels: muchas rutas divergen, una persona decide y
la dirección aprobada se convierte en una familia gobernada de formatos.

### Ubicación

Después de “Si automatizas la producción antes de cerrar la exploración, multiplicas una respuesta que todavía
no merecía convertirse en sistema”, dentro de `Un proceso creativo necesita dos velocidades`.

### Composición

Secuencia horizontal. Izquierda orgánica, abierta y variable. Centro con una única decisión humana. Derecha
modular, precisa y consistente. La imagen no debe decir que izquierda es caos o derecha rigidez: ambas son
capacidades necesarias.

### Prompt verbatim

```text
Use case: infographic-diagram
Asset type: text-free conceptual diagram for an Efeonce editorial article
Primary request: show two necessary speeds of creative work: divergent exploration, then a clear human decision, then governed convergent production
Scene/backdrop: a clean warm off-white editorial canvas with tactile paper elements and subtle photographic texture
Left zone: an organic branching field of genuinely different references, crops, color studies and rough campaign directions; spacious, curious and alive, not chaotic
Center zone: one natural human hand selects a single campaign card at a clear transition point; the chosen card carries the recurring cobalt field, lime diagonal ribbon, coral circle and high-contrast figure
Right zone: the selected direction becomes an orderly but varied family of campaign adaptations in landscape, square, portrait and narrow formats; all preserve the motif while changing composition appropriately
Visual connector: a continuous lime line or ribbon that branches on the left, passes through the human selection and becomes a precise modular baseline on the right
Style/medium: premium editorial mixed-media infographic with photographic paper, crisp geometry and subtle print grain; sophisticated enough for a strategy publication
Composition/framing: horizontal 3:2 with left-to-right reading; three clear hierarchy zones; center decision is the strongest focal point; high contrast and ample negative space
Text: absolutely no labels, words, letters, numbers or icons with text
Constraints: exploration and production must both look valuable; adaptations must be visibly related but natively recomposed, not stretched copies; anatomically plausible hand
Avoid: arrows with labels, engineering flowcharts, conveyor belts, robots, generic SaaS UI, glossy 3D icons, neon gradients, bokeh, watermarks
```

### ALT

`Exploración divergente que converge en una decisión humana y luego se transforma en formatos repetibles.`

### Caption

`Primero se amplía el espacio de posibilidades. Después se produce con límites.`

### Criterio de descarte

Descartar si la exploración se lee como error, si no existe un momento de decisión humana o si las piezas de la
derecha son copias estiradas en vez de adaptaciones consistentes.

## 8. Asset 04: los seis momentos

### Función

Dar memoria visual al caso conductor y mostrar que el workflow conserva una intención a través de sus
transiciones.

### Ubicación

Después de la lista de seis momentos, dentro de `De una intención a un sistema que aprende`.

### Composición

Storyboard editorial `2×3` conectado por el motivo verde. Cada panel muestra un estado diferente del mismo
trabajo: intención, exploración, selección, producción, revisión y entrega/aprendizaje. El panel final debe
contener rastros del primero para cerrar el loop.

### Prompt verbatim

```text
Use case: scientific-educational
Asset type: text-free six-panel editorial storyboard for an Efeonce long-form article
Primary request: show one fictional campaign moving through six recognizable moments while preserving its original intent
Layout: a precise 2 by 3 grid of six connected panels on a warm neutral page; no panel labels and no numbers
Panel 1 intention: a concise brief object, one audience/reference portrait and a clear central objective marker, all without readable text
Panel 2 exploration: several genuinely different moodboard routes and visual treatments branching from the brief
Panel 3 human decision: a hand selects the recurring cobalt key visual with lime diagonal ribbon, coral circle and high-contrast figure; rejected routes remain visible but secondary
Panel 4 governed production: the selected direction is recomposed into several native aspect ratios while invariants remain visibly consistent
Panel 5 review: a human reviews one adaptation with restrained crop, rights and consistency markers represented by shapes only, not text
Panel 6 delivery and learning: approved assets appear across a phone, wide screen and print surface beside an organized archive that includes a small visual trace of the original brief, closing the loop
Visual connector: one continuous lime thread travels through all six panels and changes behavior with each moment
Style/medium: premium educational editorial mixed-media, realistic paper collage plus precise graphic structure, subtle grain, sophisticated and highly legible
Composition/framing: horizontal 3:2 master; each panel remains legible at article width; one coherent campaign motif across all panels; strong hierarchy and spacing
Text: no readable text, letters, words, labels or numbers anywhere
Constraints: the six moments must be visually distinct; the same campaign direction must be recognizably preserved from panel 3 onward; humans make selection and review decisions
Avoid: software screenshots, node graphs, robots, brains, factories, conveyor belts, generic flat vector people, neon, gradients used as decoration, watermarks
```

### ALT

`Seis momentos de una campaña, desde el brief y la exploración hasta la revisión, entrega y aprendizaje.`

### Caption

`El valor aparece en las transiciones entre intención, decisión, producción y aprendizaje.`

### Criterio de descarte

Descartar si no se leen seis estados, si cambia el motivo entre paneles, si aparecen palabras deformadas o si el
workflow parece una secuencia puramente automática.

## 9. Entregables

Por asset aprobado:

- master PNG original en sRGB;
- WebP `1600×1067` o proporción equivalente para cuerpo;
- WebP `1200×800` para fallback liviano;
- solo para hero: crop WebP `1600×900` y OG PNG/WebP `1200×630`;
- SHA-256, dimensiones, peso y prompt en manifest;
- ALT y caption editorial;
- estado de auditoría: `selected`, `needs_edit` o `rejected`.

Naming:

```text
creative-workflows-{slot}-master-v1.png
creative-workflows-{slot}-web-1600-v1.webp
creative-workflows-{slot}-web-1200-v1.webp
creative-workflows-hero-og-1200x630-v1.webp
```

## 10. Auditoría

Cada imagen se evalúa en cinco gates:

1. **Concepto:** comunica su trabajo en tres segundos.
2. **Composición:** un foco claro, jerarquía y crop seguro.
3. **Continuidad:** el motivo seleccionado sigue siendo reconocible.
4. **Integridad:** sin texto defectuoso, anatomía imposible, logos o artefactos.
5. **Uso editorial:** agrega comprensión; no repite el párrafo ni promete evidencia real.

Una imagen que falla concepto no se arregla con postproceso. Una imagen que falla solo crop, peso o color puede
pasar a edición dirigida.

## 11. Integración WordPress

Después de la selección visual:

1. optimizar derivados;
2. subir los assets aprobados a la Media Library con metadata completa;
3. registrar `mediaId + url` reales;
4. crear `GutenbergArticleSpec V3` con bloques `kind=image`;
5. usar hero como featured image si la composición sobrevive en cards/OG;
6. validar V3 en `dry-run`;
7. actualizar el post privado solo mediante una operación explícita posterior;
8. inspeccionar render desktop/mobile y mantener `noindex` hasta recibir autorización humana de publicación;
9. tras la autorización, publicar, habilitar `index, follow` y repetir readback, canonical y render live.

## 12. Resultado de producción

| ID | Resultado | Derivado editorial | WordPress | Uso en V4 |
|---|---|---|---|---|
| `CW-V01` | `PASS` | `creative-workflows-hero-featured-1440-v1.jpg` | `251370` | featured + Open Graph aplicado; WebP fuente `251365` conservado |
| `CW-V02` | `PASS` | `creative-workflows-interface-web-1440-v1.webp` | `251366` | bloque de imagen integrado |
| `CW-V03` | `PASS` | `creative-workflows-two-speeds-web-1440-v1.webp` | `251367` | bloque de imagen integrado |
| `CW-V04` | `PASS` | `creative-workflows-six-moments-web-1440-v1.webp` | `251368` | bloque de imagen integrado |

Los cuatro candidatos se inspeccionaron a resolución original. No presentaron texto legible, logos, anatomía
inverosímil ni artefactos que alteraran la tesis. La continuidad entre imágenes la sostiene el sistema cromático
y geométrico; dentro de `CW-V04`, además, la misma campaña se conserva desde la selección hasta la entrega.

La optimización se ejecutó con `pnpm media:webp`; además se produjo un JPEG social desde el hero aprobado. Los
cinco attachments públicos respondieron `200` con MIME y tamaño exactos. El Content Factory validó la V4 con 111 bloques, tres
`core/image`, `hasMedia=true` y cero findings. El hero no se incorporó al cuerpo para evitar duplicación.

## 13. Estado de integración

La V4 fue aplicada al post `251363` y luego publicada con autorización explícita, snapshot previo y rollback
guard: autor `1`, estado `publish`, `index, follow`, 111 bloques, tres imágenes de cuerpo y featured `251370`.
Yoast expone el mismo JPEG como `og:image` `1440×757`, además de `summary_large_image` para Twitter. El render
live fue inspeccionado en desktop `1440×1000` y mobile `390×844`, sin overflow ni imágenes rotas.

## 14. Extensión editorial V5

La lectura live mostró que las tres imágenes de cuerpo terminaban antes del 43% del texto. La solución no fue
agregar decoración, sino cubrir dos modelos que la segunda mitad todavía exigía imaginar y convertir la lista
de medición en una superficie comparativa:

| ID | Trabajo editorial | Producción | WordPress | Placement |
|---|---|---|---|---|
| `CW-V05` | Frontera entre ejecución del sistema, ampliación con IA y autoridad humana | HTML/CSS determinista + Playwright; WebP V3 | `251393` | después de la lista de delegación/escalamiento |
| `CW-V06` | Escalera managed → co-operated → client-operated y roles Builder/Runner | HTML/CSS determinista + Playwright; WebP V3 | `251392` | después de “Se gana con evidencia” |
| `CW-T01` | Scorecard de capacidad y contramétricas de criterio | `core/table` nativo | n/a | sección de medición |

Los diagramas preservan cobalto, lima, coral, papel y la señal continua del sistema original. El texto no fue
generado dentro del raster: se compuso con Poppins/Geist locales para conservar labels, acentos y cifras
exactas. La primera exportación (`251386–251387`) quedó superseded, no borrada, porque el QA live reveló que el
widget flotante Next Post de Ohio ocupa la esquina inferior derecha. La V2 (`251389–251390`) protegió esa zona,
pero una relectura humana invalidó su `PASS`: aún cruzaba conectores sobre copy, ocultaba un ordinal, recortaba
un label y producía una colisión de puntuación. La V3 (`251393` y `251392`) corrige esas relaciones internas y
mantiene la esquina Ohio como espacio prescindible.

En mobile, el diagrama horizontal funciona como síntesis visual y cada `core/image` enlaza al WebP completo
para permitir lectura a resolución original. ALT y caption sostienen el significado sin obligar a interpretar
texto diminuto dentro del raster. La tabla permanece semántica, visible a `390px`, sin overflow de página y sin
convertirse en una captura inaccesible.

La V5 validó 114 bloques gobernados, cinco `core/image`, seis captions y un `core/table`. El readback live
preservó H1, slug, autor, categoría, featured/OG, SEO title, metadescription, canonical e `index, follow`. El QA
anónimo pasó en `1440×1000` y `390×844`; evidencia en
`ai-generations/2026-07-15_creative-workflows-pillar/review/v5-diagrams-v3/qa-report.json`.

El video queda deliberadamente fuera de V5. Debe entrar sólo cuando muestre una demostración o transición que
una imagen estática no pueda explicar, con poster, captions, transcript, carga diferida y sin autoplay; no como
relleno para compensar longitud.

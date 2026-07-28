# Globe Producer — Composer · Referencia de estilo e implementación V1

> **Tipo:** Referencia de implementación (valores exactos, no intención)
> **Versión:** 1.0 · **Creado:** 2026-07-27
> **Para qué sirve:** reescribir el composer **sin volver a decidir nada**. Cada valor de acá fue medido en
> browser o leído del contrato; ninguno es estimado.
> **Tasks dueñas:** `TASK-1552` (composición) · `TASK-1485` (motor de estilos, ADR-016) · `TASK-1555` (selector
> de modelo) · `TASK-1532` (CTA y estimado) · `TASK-1523` (SSOT de motion)
> **Contratos de origen:** [wireframe](./wireframes/TASK-1552-globe-producer-composer-focused-creation.md) ·
> [flow](./flows/TASK-1552-globe-producer-composer-focused-creation-flow.md) ·
> [motion](./motion/TASK-1552-globe-producer-composer-focused-creation-motion.md) ·
> [SSOT de motion](../architecture/creative-studio/GLOBE_CLIENT_MOTION_CONTRACT_V1.md)

---

## Cómo usar este documento

Está escrito para que quien implemente **traduzca, no interprete**. Si un valor no está acá, sale del SSOT de
tokens (`apps/studio-client/src/tokens/tokens.ts`) o del catálogo del servidor — **nunca se inventa**.

Es **independiente del motor de estilos**: los mismos valores aplican en CSS, CSS Modules o Tailwind.

---

## 1 · La estructura: cinco bloques, en este orden

El composer responde cinco preguntas, en el orden en que un creativo piensa. **Este núcleo no crece nunca**:
toda capacidad nueva entra al dock (§3), no como bloque nuevo.

| # | Bloque | Icono | Contiene |
|---|---|---|---|
| 1 | **Qué quieres crear** | `ti-pencil` | prompt + Mejorar con IA + Recientes + dock |
| 2 | **De qué partes** | `ti-photo` | referencias (imagen/video), con pin |
| 3 | **Cómo se ve** | `ti-bulb` | dirección (miniaturas) + modelo |
| 4 | **En qué formato sale** | `ti-crop` | formato por uso + acabado + cantidad |
| 5 | *(riel, fijo al pie)* | `ti-coins` | saldo + CTA |

**Regla dura:** el bloque 5 está anclado (`position: sticky; bottom: 0`) y **es sólo dinero**. Ninguna decisión
de forma vive ahí, aunque multiplique el costo.

---

## 2 · Ritmo vertical y alturas — medidos en browser

| Relación | Valor | Nota |
|---|---:|---|
| Entre bloques | **30 px** | ⚠️ 17 px fue reportado por el operador como *«todo muy apretado»* — **piso prohibido** |
| Título de bloque → su contenido | **13,6 px** | 8,8 px se lee pegado |
| Padding del área con scroll | 16 px lateral, 16 px arriba, 21 px abajo | |
| Riel → último bloque | `padding-top` propio | sin él, el CTA se lee como parte del formulario |

| Elemento | Altura mínima |
|---|---:|
| Chip de formato (2 líneas) | **54 px** |
| Control de acabado / opción | **40 px** |
| Chip de cantidad | **40 px** |
| Herramienta del dock | **44 px** |
| CTA `Generar` | **46 px** |
| Miniatura de referencia | 46 px |

⚠️ **Regla de método:** el panel **tiene scroll propio por diseño** y el riel está anclado. **NUNCA sacrificar
el ritmo vertical para evitar scroll interno** — ese error costó seis iteraciones de compresión.

---

**Delta 2026-07-28 — el `sticky` del riel estaba muerto por debajo de `lg`.** La regla de arriba se cumplía
sólo en escritorio. Un elemento `sticky` se ancla a su ancestro con scroll; el panel del composer tiene
`overflow-hidden`, así que **él** se volvía ese ancestro — y como bajo `lg` no está acotado (`max-h` lleva
prefijo `lg:`), tampoco scrollea. El riel no tenía contra qué pegarse y quedaba estático al final de una
columna de 1717 px. Medido a 840×987: el CTA fuera de pantalla, el mismo síntoma que el Slice 1c ya había
corregido para escritorio.

`max-lg:overflow-visible` devuelve el ancestro de scroll al documento y el riel se pega al fondo del viewport.
**No se acota el panel en angosto a propósito**: crearía un scroll anidado y el feed, que va debajo, quedaría
atrapado detrás del scroll interno del composer.

## 3 · El dock de herramientas

Fila de iconos bajo el prompt. **Sumar una herramienta cuesta un icono, no 80 px de columna.**

| Herramienta | Icono | Apertura |
|---|---|---|
| Prompt negativo | `ti-circle-minus` | popover |
| Seed | `ti-dice-5` | popover |
| Style DNA | `ti-dna-2` | panel lateral |
| Retoque regional | `ti-brush` | panel lateral |
| Más | `ti-dots` | — |

**Regla de apertura:** popover para lo chico (seed, negativo, cámara); **panel lateral para lo que necesita ver
la imagen** (Style DNA, retoque, efectividad). *Si necesita lienzo, va al panel.*

**El dock se deriva del catálogo/capabilities**, nunca de una lista escrita a mano. Una capability nueva del
servidor aparece sola. Una sin contrato aparece **deshabilitada con su razón en `title`**, nunca oculta.

⛔ **No existe un contenedor «Ajustes avanzados» ni equivalente cajón de sastre.** Se retiró a propósito:
aplazaba el crecimiento en vez de resolverlo, y *«básico vs avanzado»* es taxonomía del sistema, no del usuario.

---

## 4 · Valores exactos por región

### 4.1 · Campo de prompt — el glow

Se hereda de la hoja legacy. **Valores literales, no aproximaciones:**

```
reposo    borde: var(--line-strong) · fondo: rgba(6,15,45,.55)
          box-shadow: inset 0 1px rgba(255,255,255,.025),
                      0 .625rem 1.75rem -1.1rem rgba(77,184,255,.22)

hover     borde: rgba(77,184,255,.42) · fondo: rgba(6,15,45,.42)
          box-shadow: 0 0 0 1px rgba(77,184,255,.18),
                      inset 0 1px rgba(255,255,255,.025),
                      0 .75rem 2rem -.9rem rgba(77,184,255,.32)

focus     borde: rgba(77,184,255,.55) · fondo: rgba(6,15,45,.30)
(within)  box-shadow: 0 0 0 1.5px rgba(77,184,255,.55),
                      inset 0 1px 0 rgba(255,255,255,.06),
                      0 14px 38px -12px rgba(77,184,255,.45)

transición  220 ms sobre border-color, box-shadow y background-color
```

⚠️ **Perder este efecto es regresión detectable a simple vista** — ya pasó una vez al renombrar clases. El
corte de `prefers-reduced-motion`, que el original legacy no declaraba, **ya está implementado**
(`motion-reduce:transition-none` en el contenedor del campo): se apaga la interpolación, no el estado
encendido, que es información de foco y no decoración.

**Delta 2026-07-28 — el reposo lleva halo propio.** El valor heredado del legacy era sólo el filo interno de
`rgba(255,255,255,.025)` — 2,4 % de alfa medido en runtime, invisible sobre el navy. Eso dejaba toda la
identidad del campo en `hover` y `focus`, dos estados que la primera impresión nunca ve: el operador llega al
composer **en reposo**, y el lienzo principal del producto le aparecía plano. Se conserva el filo verbatim y se
suma **una** capa: un halo proyectado, más corto y más tenue que el de hover.

El anillo (`0 0 0 Npx`) **no entra en reposo a propósito**: el anillo es la afordancia de foco. La escalera
queda semántica —atmósfera → aparece el anillo → el anillo se intensifica— en vez de ser el mismo efecto tres
veces con más alfa. Y el filo interno se repite en los **tres** estados: `box-shadow` reemplaza entero, así
que un hover sin `inset` apagaba la línea de luz superior justo al interactuar.

**Delta 2026-07-28 — la rampa del fondo va HACIA ABAJO en alfa** (`.55` reposo → `.42` hover → `.30` foco).
Corrige un bug reportado por el operador: *«se apaga cuando pongo el mouse encima, y se prende medio un poco
cuando quito el mouse»*. `--field` (`#060f2d`) es **más oscuro que el panel** que tiene detrás
(`rgba(11,26,78,.5)`), así que la rampa ascendente heredada del legacy (`.55→.68→.76`) oscurecía la superficie
más grande del bloque justo al interactuar — y el fill gana perceptualmente contra un borde de 1 px y un halo
tenue. El efecto se invirtió cuando el campo se mudó del fondo del legacy a este panel, y pasó inadvertido
porque los valores eran «los medidos, verbatim». Bajar el alfa deja pasar más panel: la superficie **se
aclara**, que es lo que significa elevarse en una UI oscura y lo que el aserto del canary
(`la superficie del prompt se eleva al enfocar`) siempre dijo que hacía. El aserto sólo exige que el fondo
**cambie**, así que la dirección era libre y estaba mal elegida.

**Delta 2026-07-28 — ritmo INTERNO del pozo, y la inserción se mide contra el campo.** El operador reportó
«muy apretado» y «Mejorar y Recientes están como montados». Ambos eran medibles:

| Síntoma | Medición | Corrección |
|---|---|---|
| Botones «montados» sobre el lienzo | el grupo salía **4 px por arriba y 4 px por la derecha** del textarea | `top-6`/`right-6`: quedan **10 px dentro** del campo |
| Bloque apretado | hueco campo → Sugerencias = **0 px** | `mt-4` (16 px) |
| Bloque apretado | hueco Sugerencias → dock = 10 px | `mt-4` (16 px), en el dock para que sirva también cuando las sugerencias desaparecen |
| Etiqueta pegada a la caja | hueco pozo → `Modo` = **0 px** | `mt-5` (20 px) |

Causa del desborde: los botones son `absolute` contra el **padding-box** de la barra (10 px), mientras el
textarea entra por el **padding** de la barra (14 px). Esos 4 px de diferencia eran el «montado». La regla
que queda: **la inserción de los flotantes se mide contra el CAMPO, no contra la caja del bloque.**

Escalera vertical resultante: **16 px dentro del pozo · 20 px entre el pozo y `Modo` · 32 px entre bloques**
(`gap-8`, ya verificado consistente en los cuatro bloques). El bloque de intención pasa de 239 a 263 px.

**Delta 2026-07-28 — un solo pozo: el `<textarea>` no se enmarca aparte.** El operador reportó «card dentro
de card dentro de card». La causa no era de diseño: el theme vacía los namespaces de Tailwind y no hay
preflight de controles de formulario, así que el `<textarea>` conservaba el **borde de fábrica del navegador**
—`1px solid rgb(133,133,133)`, un gris neutro que no existe en la paleta—. Eran tres marcos concéntricos
(panel `r18` → bloque `r14` → textarea `r9,28`) y el del medio era el único no diseñado. Se resuelve con
`border-0` en el textarea: **el pozo de escritura es el contenedor del bloque**, y el textarea vive dentro de
él conservando su superficie propia (velo + filo interno), que distingue el área de escritura sin dibujar una
caja. Barrido de la superficie: era el único control con borde UA.

**Delta 2026-07-28 — el bloque deja de prometer lo que no hace.** Tiene DOS caminos en estados opuestos y la
UI estaba ordenada al revés del que funciona:

- **Mencionar del feed opera hoy**: `globe.producer.asset.copyAsReference`, cableado contra readers y commands
  reales (`TASK-1490` escritura + `TASK-1503` lectura, ambas `complete`), y el `parentRights` de cada ficha lo
  **certifica el servidor**.
- **Subir archivo nuevo está gated OFF punta a punta**: `private-ingest`, `GLOBE_ASSET_PROVENANCE_ENABLED=false`
  en ambos servicios, dueña `TASK-1467` (`in-progress`). Le faltan además autoridad de evidencia de derechos,
  IAM/retención del bucket y un canario live.

Y sin embargo el disparador se llamaba «Subir imagen o video» —el camino bloqueado— dejando el que sí opera
escondido como ítem secundario dentro de su propio menú. Correcciones:

- Disparador neutral («Agregar referencia») y **el menú ordena por disponibilidad**: mencionar primero, subir
  después con su razón visible.
- El vacío dice lo que **sí** se puede hacer. Decía «Sin referencias…», que informa una ausencia y deja creyendo
  que no hay nada por hacer.
- **El vacío pierde el borde punteado.** El punteado es el significante universal de «suelta acá», y en toda la
  superficie del Producer no existe `onDrop`, `onDragOver`, `dataTransfer` ni `input[type=file]`: prometía un
  gesto inexistente, y convivía con el punteado del picker, así que había **dos** zonas aparentemente soltables
  y ninguna lo era. El picker conserva el suyo, donde significa otra cosa (hueco donde va una pieza, frente a
  la ficha sólida de una referencia real). Cuando `private-ingest` aterrice y haya drop real, el punteado se
  gana su lugar en el vacío.
- La promesa de derechos aparece **sólo cuando hay algo que validar**. En vacío prometía validar la nada. NO se
  muda al riel: el riel es sólo dinero (`TASK-1532`).

### 4.2 · Referencias — es entrada, no ajuste

- Va en el **bloque 2**, visible, nunca dentro de un colapsable
- Affordance explícita: *«Subir imagen o video»* (`ti-photo-plus`)
- Cada referencia tiene **pin** (`ti-pin` / `ti-pin-filled`): *Fijada* = persiste entre generaciones ·
  *Solo esta vez* = efímera
- Quitar: `ti-x`
- Nota de derechos con `ti-lock-open`
- El contador (`0 / 4`) sale de `referencePolicy.maxReferences` del catálogo

### 4.3 · Dirección — muestra, no etiqueta

Miniaturas cuadradas, no chips de texto. La opción activa lleva borde `#5b8cff` + halo
`0 0 0 3px rgba(63,123,255,.18)`.

⚠️ **Dependencia externa:** requiere una imagen representativa por estilo. **Si el equipo creativo no las tiene,
este bloque se ve peor que los chips de texto que reemplaza.** Confirmar antes de comprometerlo.

**Delta 2026-07-28 — el arte procedural se reemplaza por stills reales, y el aspecto del slot cambia.**

El riesgo que anticipaba el párrafo anterior se materializó: los ocho `direction-*.svg` eran pictogramas
procedurales de 277–449 bytes, y en render no se distinguía «Fotográfico» de «Editorial» sin leer la etiqueta
—justo lo que la miniatura venía a evitar—. Se reemplazan por ocho `.webp` (384×216, 60 KB el set completo).

Dos reglas que quedan, y valen más que los archivos:

1. **Mismo sujeto, ocho tratamientos.** Si cambia el estilo *y* cambia el motivo, el ojo no puede atribuir la
   diferencia al estilo. El sujeto es un **globo aerostático** —el motivo de la casa, lo que convierte el
   selector en un momento de marca— y lo único que varía es luz, paleta, textura y calidad de borde, que es
   lo único legible a este tamaño. Una primera pasada con una forma ovoide abstracta falló exactamente acá:
   Fotográfico, 3D render e Ilustración salieron mutuamente indistinguibles porque se separan por *técnica de
   render*, y sobre una forma mate neutra la técnica no se ve.
2. **El slot es 16:9, con `aspect-video`, y el recorte es explícito.** Los SVG se autoraron **cuadrados** y el
   CSS les recortaba la banda central con `object-fit: cover` — por eso «Fotográfico» se veía como un borrón
   naranja: era el centro de una cara sin cabeza ni hombros. Autorar en un aspecto y delegar el encuadre al
   CSS es el defecto, no la solución. **`aspect-video` y no un alto fijo**: `h-24` hace que la proporción
   derive con el ancho de columna — medido a 1280 px de viewport la columna del preset mide 82 px, y con alto
   fijo la miniatura habría salido **retrato** (82×96).

Pendiente declarado: esta es la pasada de **dirección**, generada con `pnpm ai:image` (gpt-image-2), el
generador canónico del repo. El set que se embarque debería regenerarse por el **Still Model Lab de Globe**
(`TASK-1459`) con seed fijo y receta versionada, para que la procedencia la cargue el propio producto. No
sirve arte out-of-band: estas imágenes viajan dentro del bundle.

### 4.4 · Modelo — isotipo de la casa

- Marco de **1,85 rem**, radio `.5rem`, borde `var(--line)`, fondo `rgba(255,255,255,.06)`
- Isotipo: `<img width=16 height=16>` con `filter: brightness(0) invert(1)`, opacidad `.94`
- Fallback a **monograma** cuando no hay isotipo

| Casa | Archivo | Modelos |
|---|---|---|
| ByteDance | `bytedance.svg` | Seedream · Seedance · Seed Audio |
| Gemini | `gemini.svg` | Nano Banana · Gemini · Veo |
| OpenAI | `openai.svg` | GPT Image |
| ElevenLabs | `elevenlabs.svg` | ElevenLabs |

**Fuente:** simple-icons v16.27.0, CC0-1.0, copiados sin modificar (`public/models/README.md`).
⛔ **NUNCA** transcribir a mano el logo de un tercero.

**Metadata obligatoria por opción** (patrón Krea): `costo · velocidad · para qué es bueno`.
Ej: `10 cr · ~8 s · fotorrealismo`. El costo va en ámbar.
⛔ El slug del proveedor **no aparece en el DOM**. El isotipo identifica la casa; el nombre público es el modelo.

### 4.5 · Formato — por intención, no por medida

| Se muestra | Medida (apoyo) |
|---|---|
| Post de feed | 4:5 · vertical |
| Story · Reel | 9:16 · pantalla |
| YouTube | 16:9 · horizontal |
| Cuadrado | 1:1 |

⛔ **NUNCA mostrar una medida en píxeles que el contrato no declare.** `ImageRouteConstraintsV1` **no tiene
campo de resolución** (video sí). Si la ruta no la da, se declara que no la da — en ámbar, visible. Gap
escalado a `TASK-1553`.

### 4.6 · Acabado y cantidad — derivados de la ruta

**Acabado:** valores reales del catálogo (`standard` | `hd`), con costo y tiempo. **Se oculta la fila cuando la
ruta trae `quality: []`** — no se renderiza vacía ni con default inventado.

**Cantidad** — regla completa, derivada de `count.min/max`:

| Caso | Comportamiento |
|---|---|
| `max === 1` | **la fila no se renderiza** — la ruta no ofrece la decisión |
| `max <= 4` | un chip por valor |
| `max > 4` | chips de atajo (`min · 2 · 4 · max`) **+ campo exacto**, visualmente distinto del chip (borde punteado) |

⛔ **Ningún valor hardcodeado.** Hardcodear `1·2·4` fue el tercer caso del mismo error (junto a los píxeles
inventados y los nombres de calidad): poner en la UI lo que el catálogo declara.

🔴 **Bug de datos conocido:** existe una ruta con `count: {min: 4, max: 1}` — mínimo mayor que máximo. La UI debe
degradar a «sin opción», no renderizar un control imposible. Reportado a `TASK-1553`.

### 4.7 · Riel — sólo dinero

Dos preguntas distintas, no el mismo número dos veces:

- **Arriba (¿me alcanza?):** `Tienes 340 créditos · esto reserva 12`
- **En el botón (¿cuánto cuesta?):** `Generar · 12 créditos` con `ti-sparkles`

**La cantidad y la duración se reflejan en ambos al instante.** Un multiplicador invisible es cómo se gasta de
más.

---

## 5 · Las tres modalidades — todo derivado del catálogo

**El núcleo no cambia entre modalidades. Cambian los campos.**

| | Imagen | Video | Audio |
|---|---|---|---|
| Título | Genera una imagen | Genera un video | Genera audio |
| Bloque 2 | De qué partes | **Desde qué cuadro** (primer/último) | Desde qué voz |
| Formatos | Post · Story · YouTube · Cuadrado | Reel · YouTube · Feed · Cine 21:9 | Locución · Diálogo · Efecto · Música |
| Campos | acabado · cantidad | **resolución · duración · audio** | formato · duración |
| Variable de gasto | cantidad | **duración** (`{minSeconds, maxSeconds, stepSeconds}`) | duración |

- En **video**, `inputMode` cambia qué se pide: `frames` → primer y último cuadro · `motion` → video fuente
- **Video declara `resolution` y `audioMode`; imagen no.** La asimetría es del contrato
- **Cambio de modalidad = cross-fade (180 ms), NUNCA morph.** Los campos son *otros*; estirar fingiría una
  continuidad que no existe

---

## 6 · Motion

Aplica el [SSOT de motion](../architecture/creative-studio/GLOBE_CLIENT_MOTION_CONTRACT_V1.md) (tres capas).
Tokens: `--duration-none|short|overlay|breathe|flame|progress` · `--ease-enter|linear|pulse`.
**Los nueve existen en el SSOT.** ⛔ Cero milisegundos literales.

| Momento | Comportamiento |
|---|---|
| **Atenuación del estimado** | opacidad → `.45` en `--duration-short`, **sincrónica con el cambio de campo**, antes del debounce. ⚠️ **No se apaga bajo reduced-motion**: se acorta la transición y el estado atenuado se conserva — es información sobre plata, no decoración |
| Isotipo generando | `GlobeGeneratingMark`, se **consume** (4 keyframes propios). Bajo reduced-motion: animación off, **elemento visible** |
| Popover | `--duration-overlay` / `--ease-enter` |
| Abrir herramienta | **FLIP**: medir, abrir, medir, animar la diferencia con `transform` — **nunca `height`** |
| Layout morph | **ninguno** |

🔴 **Estado actual:** la atenuación del estimado **no existe**. El código decide `status.kind === 'stale'` pero
no lo pinta. Es el motion que el contrato llama el más importante de la superficie.

⚠️ **Dos tokens declarados y sin usar:** `--duration-overlay` y `--duration-progress`.

---

## 7 · Iconografía — no es decoración

El operador es creativo y **lee visualmente**: el icono es velocidad de reconocimiento. La varita se reconoce
antes de leer «Mejorar con IA».

**Piso duro: 23 iconos Tabler. El recuento de la superficie NO puede bajar de ahí.**

`ti-wand` (×3, en Mejorar) · `ti-sparkles` · `ti-history` · `ti-circle-minus` · `ti-dna-2` · `ti-lock-open` ·
`ti-photo` · `ti-photo-plus` · `ti-photo-up` · `ti-pin` / `ti-pin-filled` · `ti-x` · `ti-plus` · `ti-minus` ·
`ti-check` · `ti-selector` · `ti-bulb` · `ti-crop` · `ti-dots` · `ti-brush` · `ti-dice-5` · `ti-coins` ·
`ti-ruler-measure` · `ti-pencil` · `ti-at`

Fuente: `@tabler/icons-webfont`, servida por `studio-web` vía `extraStylesheets`.

---

## 8 · Marcadores de captura

**Ya existen:** `producer-composer` · `producer-prompt-bar` · `producer-reference-tray` ·
`producer-seed` · `producer-route` · `producer-output-shape` · `producer-estimate` ·
`producer-generate-primary`
**De `TASK-1555`, no renombrar:** `producer-model-{picker,trigger,list,option,recommended}`
**Estructura de bloques:** `data-pc-block` en cada uno de los cuatro `ComposerBlock`

⛔ **`producer-advanced-settings` ya NO existe** (retirado 2026-07-27). Nombraba el `<details>` de
ajustes avanzados; al retirarse el patrón (§3) el marcador sobrevivió un rato sobre un `div` de
agrupación, y el canary siguió imprimiendo un hallazgo sobre un disclosure ausente. **Un marcador que
sobrevive a su referente miente en la evidencia.** Lo reemplaza el aserto inverso —que no exista cajón
de sastre— más `data-pc-block`, que nombra lo que sí hay.

---

## 9 · Verificación — los asertos que faltaban

⚠️ **El aserto de contención es el que faltaba.** Altura, `scrollWidth` y visibilidad del CTA dieron verde
**mientras el layout estaba roto**.

- [ ] **Contención:** para cada descendiente del panel con `width > 0`, su rect está dentro del rect del panel — arriba, abajo, izquierda y derecha
- [ ] **Ritmo:** gap entre bloques ≥ 28 px · título→contenido ≥ 12 px
- [ ] **Glow:** el `box-shadow` del prompt cambia entre reposo y `:focus-within`
- [ ] **Cantidad:** con `count.max === 1` la fila no existe en el DOM; con `max > 4` existe el campo exacto y su `max` coincide con la ruta
- [ ] **Iconos:** el recuento no baja de 23
- [ ] **Sin fugas:** cero slug de proveedor, costo vendor o margen en el DOM
- [ ] **Sin overflow:** `scrollWidth === clientWidth` a 1440, 390 y 320
- [ ] **Reduced motion:** el estimado atenuado **sigue atenuado**; el isotipo sigue en el DOM con la animación apagada

---

## 10 · Las seis colisiones — para no repetirlas

Todas ocurrieron en una sola sesión sobre CSS global sin scope. Motivan [ADR-016](../architecture/creative-studio/EFEONCE_GLOBE_CLIENT_STYLING_ENGINE_DECISION_V1.md).

| # | Qué pasó | Lección |
|---|---|---|
| 1 | `.prompt-actions` es `absolute` en el legacy; al recomponer, los botones flotaron sobre el feed | el legacy trae posicionamiento acoplado a su estructura |
| 2 | `.icon-pill` es circular de tamaño fijo; con label recorta | no reusar una clase por su nombre sin ver su forma |
| 3 | `.control-title`, `.number-shape-field`, `.helper` ganaron por especificidad | |
| 4 | `.estimate-rail > div` tiene **4 reglas, 2 con `!important`** forzando `grid` | **cambiar de elemento** es más limpio que pelear especificidad |
| 5 | Renombrar a `pc-*` **desconectó el glow** | renombrar te salva de lo que estorba y te corta de lo que sirve |
| 6 | `max-height` en un chip de contenido variable → el contenido se sale | usar `min-height`, nunca acotar altura de contenido variable |

---

## Referencia visual

El baseline de diff son las **capturas del canary del composer** a 1440 / 390 / 320
(`apps/studio-client/.captures/task-1552-composer/`), tomadas **con `producerStyles` inyectada**, que es
exactamente lo que sirve producción. Se regeneran con `pnpm test` en `apps/studio-client`.

⚠️ **Las capturas anteriores al 2026-07-27 16:30 no son baseline de nada:** el canary servía la superficie
**sin** la hoja del legacy y sus asertos daban todo verde igual —contención, `scrollWidth`, recuento de iconos
y visibilidad del CTA dan lo mismo con o sin CSS—. Se detectó mirando el render.

La copia verbatim de `producerStyles` (151 KB) queda en el commit `5edd2a3` de la rama
`task/TASK-1552-slice0-internalizar-css` como referencia textual. El texto de origen sigue vivo de todas
formas en `apps/studio-web/src/producer-ui.ts` hasta que `TASK-1560` retire el legacy.

---

## Delta 2026-07-27 — el motor ya es Tailwind: lo que cambia al traducir esta referencia

Los valores de este documento **no cambian**: sigue siendo independiente del motor. Cambian tres cosas de
**cómo** se escriben.

### 1. Los valores salen del theme generado, con sus nombres canónicos

`bg-canvas`, `text-xs`, `rounded-sm`, `font-display`, `font-semibold`, `ease-enter`. Todos verificados por
valor computado en browser, no por inspección del CSS.

**Duraciones y compuestos no tienen namespace de theme en v4** — se referencian:
`duration-(--duration-short)`, `bg-(image:--page-backdrop)`.

### 2. `text-red-500` y `text-lg` NO EXISTEN

El theme vacía los namespaces de Tailwind, así que su paleta y su escala tipográfica de fábrica no generan
nada. Si escribís una y no pasa nada visualmente, no es un bug: es el contrato.

### 0. ✅ Decidido 2026-07-27 — cuando un valor no cae en la escala, **se tokeniza**

El criterio que gobierna toda la conversión, elegido por el operador después de medir las 299 reglas
del legacy que visten esta superficie. **Se tokeniza el escalón funcional, nunca el valor suelto**: los
34 tamaños de fuente de la hoja son seis decisiones, y el rango .55–.76 rem son 25 valores que nadie
decidió como 25.

⚠️ **Lo que la medición corrigió sobre sí misma, y hay que saber antes de repetirla:** el primer cuadro
decía «63 de 83 espaciados fuera de escala» midiendo contra 4 px. **La escala real de Tailwind acepta
medios pasos (2 px)**, y contra ella caen **0 de 82**, con error medio de 0,40 px. Los 78 colores
literales son sólo **29 bases** — el 76% son alfas del mismo azul, que `bg-action/13` expresa sin token.
**Espaciado y color se traducen sin tokenizar nada; lo único que faltaba era tipografía.**

Tokens que nacieron de esto (`apps/studio-client/src/tokens/tokens.ts`):

| Token | Valor | Para qué |
|---|---:|---|
| `--text-micro` | 9 px | metadata mínima adosada a un control (flag de recomendado, estado de referencia) |
| `--text-meta` | 11 px | el escalón entre `2xs` y `xs`: helper, availability, sugerencias, seed |
| `--text-lg` | 18,8 px | el `h1` de un **panel** — distinto del de una página (`xl`) |
| `--accent-ink-bright` | `#cfe8ff` | tinta de un control seleccionado; absorbe los tres valores que la hoja tenía |
| `--field` · `--white` | `#060f2d` · `#ffffff` | bases para consumir con modificador de opacidad, no un token por alfa |

🔴 **El peso 700 no tenía utilidad alcanzable.** `--font-display` (familia) y `--weight-display` (peso)
aspiran ambos a `font-display`, **y la familia gana** — el texto salía en 400 con el build en verde. Se
escribe **`font-bold`**; el generador lo publica así y lanza si aparece otra colisión familia/peso.

### 3. ~~🔴 El ritmo vertical de §2 NO cae en la escala de 4 px — hay que decidirlo~~ · ✅ decidido

30 px entre bloques y 13,6 px título→contenido **no son múltiplos de 4**, y el gate **rechaza**
`gap-[1.875rem]`. Dos salidas legítimas, y hay que elegir una explícitamente:

- **Ajustar a la escala:** `gap-8` (32 px) y `mb-3.5` (14 px). El operador reportó 17 px como «todo muy
  apretado»; 32 y 14 están del lado correcto de ese piso.
- **Subir el ritmo al SSOT** como token y exponerlo al theme.

⛔ **Lo que NO es una salida:** escribir el valor arbitrario. El gate existe justamente para que esta decisión
no se postergue en silencio.

### 4. `advanced-controls` hoy es inoperable, no sólo «abierto»

Medido en runtime: `.advanced-controls > summary` tiene `display:none`, altura 0. El `<details open>` **no
tiene control para cerrarse** ni con puntero ni con teclado. El §3 ya retira el patrón; esto agrega que
además **hoy está roto**, así que reemplazarlo no arriesga una regresión de comportamiento — no hay
comportamiento que perder.

---

## Delta 2026-07-28 — regresiones del port: lo que el legacy tenía y React dejó caer

Adyacente al composer y no cubierto por este documento —el header es `ProducerHeader.tsx`—, pero la **clase de
bug** sí pertenece acá porque la produjo la misma migración.

El legacy tenía **`.credit-orbit`**: un `conic-gradient` alrededor del glifo de créditos que mostraba la
proporción disponible/reservado. Al portar la superficie a React el anillo quedó **sólo dentro del popover**, y
el trigger heredó un círculo relleno que no informa nada.

La consecuencia no era estética. Sin anillo, «reservados» únicamente podía decirse con texto, y ese texto vivía
en **tres líneas apiladas** —«240» / «disp.» / «18 reservados»— que estiraban la pastilla a 143×58 px y
desequilibraban toda la fila. El operador lo diagnosticó exacto: *«perdió el anillo y se ve más alargado, por
eso daña todo»*. **El anillo no era decoración: era lo que le permitía al texto ser corto.**

Corregido reusando la **misma** expresión de dona que el popover —una sola y no dos, que es lo que evita que se
separen el día que alguien ajuste una— y bajando el texto a una línea. El número exacto queda en el popover y en
un `sr-only`: el anillo transmite proporción, no cifra, y esa información no puede quedar sólo en color.
Medido a 840 px: pastilla 143×58 → 133×46, header 133 → 121 px.

**La regla que queda:** al portar una superficie del legacy, un elemento que *informa* no se reemplaza por uno
que sólo *decora* aunque ocupe el mismo lugar. Y cuando algo «se ve más largo de lo que debería», sospechar
primero de un afordance que desapareció y cuyo trabajo ahora hace el texto.

> Cierre honesto: no se auditó el resto de la superficie buscando otras regresiones de este tipo. `.credit-orbit`
> se encontró porque el operador lo señaló, no porque un barrido lo detectara. Queda como trabajo pendiente
> comparar el inventario de afordancias del legacy contra el port.

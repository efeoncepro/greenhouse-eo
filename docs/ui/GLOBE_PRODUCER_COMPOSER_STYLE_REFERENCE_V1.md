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
          box-shadow: inset 0 1px rgba(255,255,255,.025)

hover     borde: rgba(77,184,255,.42) · fondo: rgba(7,18,54,.68)
          box-shadow: 0 0 0 1px rgba(77,184,255,.18),
                      0 .75rem 2rem -.9rem rgba(77,184,255,.32)

focus     borde: rgba(77,184,255,.55) · fondo: rgba(7,18,54,.76)
(within)  box-shadow: 0 0 0 1.5px rgba(77,184,255,.55),
                      inset 0 1px 0 rgba(255,255,255,.06),
                      0 14px 38px -12px rgba(77,184,255,.45)

transición  220 ms sobre border-color, box-shadow y background-color
```

⚠️ **Perder este efecto es regresión detectable a simple vista** — ya pasó una vez al renombrar clases. Y al
reimplementarlo hay que **agregarle el corte de `prefers-reduced-motion`**, que el original no declara.

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

**Ya existen:** `producer-prompt-bar` · `producer-reference-tray` · `producer-seed` · `producer-route` ·
`producer-output-shape` · `producer-estimate`
**De `TASK-1555`, no renombrar:** `producer-model-{picker,trigger,list,option,recommended}`
**A agregar:** `producer-composer` · `producer-advanced-settings` · `producer-generate-primary`

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

### 3. 🔴 El ritmo vertical de §2 NO cae en la escala de 4 px — hay que decidirlo

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

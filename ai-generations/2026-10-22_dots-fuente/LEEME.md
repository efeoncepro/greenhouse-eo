# dots (OpenAI) — fuente oficial · 2026-10-22

Reunión de la **fuente oficial** de «los dots» para llevarlos a 3D con el método de
[`mascot-3d-pose-library.md`](../../.claude/skills/greenhouse-ai-image-generator/references/mascot-3d-pose-library.md)
(como Clawd, Codex y Gigi). Aquí no se generó ninguna imagen con IA, no se tocó OneDrive y no hay commit.

## 1. Qué son — identificación

**Los dots son los agentes personales «siempre activos» de OpenAI**, presentados en DevDay el
**29-09-2026** ([nota oficial](https://openai.com/index/introducing-dots/)). Cada usuario tiene «su dot», con
nombre propio y un **personaje 3D que diseña**: forma, color, ojos, lentes y accesorio. Viven en ChatGPT (escritorio,
web, móvil), Slack y Teams. Internamente el producto se llama **`aeon`** y el motor del personaje
**`orbit-character`** (repo interno citado en el código: `openai/orbit-character-engine`).

| | Certeza | Evidencia |
|---|---|---|
| «los dots» = agentes de OpenAI con personaje de peluche | **verificado** | nota oficial de OpenAI + TechCrunch, Gizmodo, Fortune, SF Standard |
| El personaje que se ve en la campaña sale del motor `orbit-character` de la app | **verificado** | el art card oficial muestra exactamente los presets `blue_beret`, `lime_frog`, `alfred` y `purple_heart` que el motor renderiza aquí |
| Quién los diseñó (estudio o ilustrador) | **no encontrado** | ninguna fuente pública acredita estudio; el material va firmado «OpenAI» |

**Candidatos descartados o adyacentes** (no son «los dots» del pedido, pero conviven en la app):

- **Iconos de agentes de espacio de trabajo** (`DotIcon`, `Aime`, `Clank`, `Paige`, … 25 en total): iconos 2D
  vectoriales con los mismos ojos, que el código usa para agentes del workspace. Son de **producto**, planos, no el
  personaje de la campaña. Se dejaron renderizados como material secundario (`fuente/app-chatgpt/svg|png`).
- **Mascotas «pet»** (`codex`, `dewey`, `bsod`, `fireball`, `hoots`, `null-signal`, `rocky`, `seedy`, `stacky`): son
  los compañeros pixel de Codex; el dot puede usar una «pet» como avatar, pero no son dots. Copiados sin tocar en
  `fuente/app-chatgpt/mascotas-pet/`.
- **Dot Ai** (empresa listada en Nasdaq): sin relación.
- ⚠️ **Choque de nombres:** entre los 108 presets hay uno llamado **«Muse»** y otro **«Gigi»**. No tienen relación con
  Muse (Meta) ni con Gigi (Google Gemini).

## 1b. Fuente de producto: la app de Codex/ChatGPT (pista del operador)

El operador usa su dot **dentro de Codex**. La fuente de producto es la misma app de escritorio: `/Applications/ChatGPT.app`
tiene bundle id **`com.openai.codex`** (versión `26.1016.61520`) y es de donde salió el atlas de Codex. Todo lo de
`fuente/app-chatgpt/` viene de su `app.asar`, leído sin modificar. Revisado además, en solo lectura:

- **CLI `codex`:** no instalada (`which codex` vacío).
- **`~/.codex/`:** existe; `~/.codex/pets/` está **vacío**; no hay assets de dots.
- **Extensión VS Code `openai.chatgpt-26.1007.21434`:** es **anterior** al motor de dots (no trae `orbit-character`);
  sólo los mismos spritesheets de mascotas pet y el `Dot` 2D. Cursor: sin extensión de OpenAI.
- **El dot propio del operador** no está guardado localmente (búsqueda de la firma `ORBAST1` y su base64 en
  `~/Library/Application Support/{Codex,com.openai.codex,com.openai.chat}` sin resultados): vive en el servidor. Si
  se quiere renderizar SU dot, basta exportar su apariencia desde la app (o anotar forma/color/ojos/lentes/accesorio
  en el editor «Customize your dot») y pasarla por `brief/capturar-orbit.mjs`.

## 2. Origen de cada archivo

| Carpeta | Qué es | Cómo se obtuvo |
|---|---|---|
| `fuente/app-chatgpt/orbit-presets/` | **108 presets oficiales renderizados por el motor de OpenAI**, 1600×1600, PNG con alfa, pose neutra de estudio. `catalogo-oficial.json` trae formas, colores (RGB), ojos, lentes, accesorios y colores de accesorio; `capturas.json` el índice | App ChatGPT para macOS `26.1016.61520` (`com.openai.codex`) → `Resources/app.asar` → `webview/assets/orbit-character-*/runtime/single-thread/` (WASM + WebGL2). Ejecutado **sin modificar** en Chromium local con `brief/capturar-orbit.mjs`, que llama a la API pública del módulo: `presetAppearance(id)` → `restore()` → `captureNeutral(1600,1600,1)` |
| `fuente/app-chatgpt/orbit-movimiento/` | Cuadros de las reacciones **saludo** (`Wave`) y **firma** (`Signature`) de los 8 héroes | mismo motor, `playReaction()` + captura del canvas (`brief/capturar-movimiento.mjs`) |
| `fuente/app-chatgpt/orbit-runtime/` | Miniaturas oficiales del selector (448 PNG en capas + índice) y los contratos `.d.mts` del motor | copia literal del bundle |
| `fuente/app-chatgpt/orbit-miniaturas/` | Las 468 miniaturas del selector recompuestas (capas + offsets) en 384×384 | `brief/componer-miniaturas.mjs`. Son **pictogramas grises** del selector (silueta de forma, ojos, lentes, accesorio), no renders a color |
| `fuente/openai-com/` | Media de la nota oficial: **art card 16:9 a 3840×2160 con los 4 héroes** (el KV), miniatura del «Dots Vision Film», 5 imágenes de carrusel, imagen de producto, logo `dots-o.svg` y el video intro (`dots-intro-updated-o-dark.mp4`, 500×380, 3,8 s) | descarga directa del CDN de OpenAI (`images/videos.ctfassets.net`) enlazado desde la nota |
| `fuente/app-chatgpt/svg/`, `png/`, `manifest.json` | Los 25 iconos 2D de agentes × variantes de color (256 SVG, 128 PNG 1024) | `brief/render-dots.mjs`: ejecuta los componentes React del bundle con un runtime JSX mínimo y serializa el SVG; `brief/rasterizar.mjs` |
| `hoja-de-contacto.png` | Los **108 presets** con nombre e id (2400×2106) | `brief/hoja.mjs` |
| `cuadros/` | `heroes-8.png` (los 8 héroes grandes), `elenco-25-nativo.png` (iconos 2D), `orbit-formas-light.png` y `orbit-circulo-opciones-dark.png` (pictogramas del selector), `movimiento-felipe-alfred.png`, `openai-com-media.png`, hojas de revisión e `intro-mp4/` (8 cuadros del video a 2 fps) | `brief/hoja.mjs`, ffmpeg |

## 3. Anatomía medida (de los renders oficiales y del catálogo del motor)

**Sistema, no personaje único.** Un dot = **forma + color + ojos + lentes + accesorio**. El motor ofrece:

| Eje | Opciones (id → título oficial) |
|---|---|
| **Forma (11)** | `circle` · `rounded_triangle` · `capsule` · `rounded_head_two_ears` («oso») · `six_lobed_flower` · `heart` · `four_lobed_butterfly` · `circle_two_ears` («conejo») · `twelve_scalloped_rosette` · `rounded_cube` («Hexagon») · `rounded_diamond`. El índice además mapea `crested_rounded_cube`, `jojo_heart` y `round_head_small_lobes` como alias |
| **Color del cuerpo (9)** | pink `#FA70AB` · orchid `#DD6ADC` · violet `#A25BFF` · blue `#4778FF` · cyan `#00B1FF` · teal `#04BB9F` · lime `#B6D80B` · yellow `#FFCC38` · coral `#FF8066` (RGB del catálogo del motor) |
| **Ojos (9)** | swept lids · oval · sparkle capsules · highlight capsules · dots · round highlights · round inset · crescent inset · sleepy lids |
| **Lentes (6)** | none · monocle · tall oval frames · separate trapezoid lenses · classic sunglasses · round sunglasses |
| **Accesorio (8)** | headphones (orejas) · bow tie (cuello) · beanie · hat · beret · bulb (`orb`) · tuft (`three_lobe`) · crown — los 6 últimos en la cabeza |
| **Color de accesorio (11)** | los 9 del cuerpo + charcoal `#1F1F1F` + brown `#8C4A2B`; por defecto la utilería es **negra brillante** |

**Los 8 héroes** (los presets «Here» que encabezan la lista y protagonizan la campaña):

| Héroe | id | Lectura |
|---|---|---|
| **Felipe** | `blue_beret` | nube de 6 lóbulos azul `#3679DB` + boina negra, ojos de punto |
| **Alfred** | `alfred` | triángulo redondeado amarillo `#EDC947`, lentes redondos de alambre, ojos cerrados en arco, corbatín negro |
| **Jojo** | `purple_heart` | corazón orquídea `#D44BD4` + gafas de sol redondas |
| **Todd** | `lime_frog` | «rana»: círculo con dos orejas lima `#C3E35B`, ojos blancos saltones (en el video lleva corbatín) |
| **Iris** | `coral_monocle` | coral `#DD5732` con monóculo |
| **Thelma** | `gus` | amarillo `#E3D957` con sombrero alto (el preset más alto: caja 879×1161 en 1600) |
| **Josh** | `blue_spectacles` | azul cielo `#4AA3E8` con lentes |
| **Iggy** | `lime_headphones` | rosado `#DA7788`, cabeza con moño/orejitas, ojos cerrados y audífonos negros (el id dice «lime», el render es rosado) |

Colores de la tabla = color dominante **muestreado** en el render (`brief/muestrear.mjs`); el render baja el valor
respecto al RGB del catálogo por la sombra del pelo.

- **Cara:** sólo ojos (no hay boca, nariz ni mejillas). Ojos negros brillantes tipo **cuenta** o **botón**, a media
  altura y bien separados; variantes con párpado o arco cerrado.
- **Sin extremidades.** El cuerpo es un volumen blando, de frente plano y bordes redondeados, con «profundidad»
  controlada por el motor (`setDepth`, deformación 0–1; los héroes van a 0,5).
- **Material:** **peluche/fieltro de pelo corto** en el motor; en el video de campaña el pelo es **más largo y
  esponjoso** (render offline). La utilería es **plástico negro lacado** con reflejo especular duro (boina, lentes,
  corbatín).
- **Encuadre del motor:** el personaje ocupa ~55 % del ancho del lienzo, centrado; fondo transparente.
- **Manos:** no existen en reposo. En el **saludo** aparecen **dos esferas flotantes del color del cuerpo** (una
  arriba al costado, otra abajo al frente) que hacen de mano y desaparecen al terminar — visto en los 16 cuadros de
  saludo de `orbit-movimiento/`.
- **Giro:** la reacción **firma** inclina y gira el cuerpo hasta un **tres cuartos** (p. ej. `dots-felipe-firma-02/03`):
  es la única vista no frontal oficial que hay.
- **Movimiento:** el motor trae reacciones (`Wave`, `Signature` por héroe), mirada que sigue un punto (`setReadyGaze`)
  y estados de actividad: Working, Searching, Creating, Payment, Thinking, NeedsInput, Ready, Paused, Error. En la
  marca del producto el logo `dots` es un **anillo gris azulado `#BAC1D3`** (la «o»), que se abre y se transforma en
  cada personaje en el video intro.

## 4. Material 3D propuesto

**Blando → vinilo suave NO. Peluche de pelo corto con utilería de laca negra.** Los dots ya son 3D y su firma es la
textura: hacerlos en vinilo liso (Codex) o en cubos (Clawd) borraría lo único que los distingue. Propuesta:

- cuerpo de **felpa/fieltro de pelo corto**, color plano saturado con oscurecimiento natural en el pelo y los bordes;
- ojos de **cuenta negra lacada** con un brillo puntual;
- utilería (boina, lentes, corbatín, sombrero, audífonos) en **plástico negro brillante**, tocando el cuerpo;
- misma luz de estudio y fondo gris cálido de la serie de Efeonce.

Para producir: partir de los PNG del motor como referencia de forma (son la «hoja de modelo» de esta mascota —
108 vistas frontales oficiales, más los cuadros de movimiento para otros ángulos).

## 5. Límites de marca

- El [manual de marca de OpenAI](https://openai.com/brand/) define «marcas» como **nombres, logotipos, iconos y
  recursos gráficos**: su uso exige seguir el manual, no implicar respaldo, no usarlas más prominentes que la marca
  propia, **no ponerlas en productos ni merch** y someter a aprobación todo material con ambas marcas. Permisos:
  **partnercomms@openai.com**; temas legales: legal@openai.com.
- No hay cláusula específica para los dots. Tratarlos como Codex: **uso interno y exploración**; validar con OpenAI
  antes de pautar o publicar con la marca. Una sola mascota de partner por pieza (regla de la biblioteca).
- Los archivos extraídos de la app son propiedad de OpenAI y se guardan como **referencia**, no para redistribuir.

## 6. Huecos

- **Vistas laterales y traseras:** `captureNeutral` sólo da la pose frontal de estudio; la reacción «firma» llega a
  tres cuartos, pero no hay perfil ni espalda oficiales. El motor acepta arrastre (`pointer()`), que podría girar
  al personaje: no se probó.
- **Estudio/diseñador:** no acreditado públicamente.
- **«Dots Vision Film» completo y el video «Live from the Lab»** no se bajaron (sólo la miniatura); el video está
  embebido en la nota.
- **Render de campaña en alta:** el art card es 3840×2160 con 4 héroes; no hay pack de prensa con cada héroe aislado.
- El motor corre con GPU por software (SwiftShader): el sombreado es el de calidad `Balanced`, no el del video.

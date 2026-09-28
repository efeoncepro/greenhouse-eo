# Componer una edición de Glitch con `pnpm glitch:compose` — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.3
> **Creado:** 2026-09-27 por Claude
> **Ultima actualizacion:** 2026-09-28 por Claude (v1.3: la ruta productiva sólo conoce la edición semanal; problema
> común tras subir AXIS —regenerar `pnpm glitch:tokens` y `pnpm brand:tokens`—; pendiente de la última frase fija de los
> overlays. v1.2: **el Glitch Flash ya se compone** con este mismo comando
> —manifiesto con `edition.kind: "flash"`, seis plantillas `Flash*`, ejemplo `flash-sonnet-5-5.example.json`— y las
> portadas con foto pintan «LA NOTICIA». v1.1: el Flash todavía no se componía; chip «LA NOTICIA» decidido.
> v1.0: primera versión, con los catálogos de Glitch de TASK-1923)
> **Modulo:** Creative · Glitch, magazine semanal de Efeonce (sub-línea de «La órbita») · piezas estáticas
> **Ruta en portal:** no aplica — es un taller local: se corre en una máquina con `greenhouse-eo` clonado. La ruta
> productiva (API, `artifact-worker`, MCP) todavía no está disponible: es [TASK-1921](../../tasks/in-progress/TASK-1921-brand-surface-pieces-governed-production-route.md),
> y cuando lo esté sólo conocerá la edición semanal (el Glitch Flash se compone sólo aquí, en local)
> **Documentacion relacionada:** [Componer piezas de Glitch](./componer-piezas-glitch.md) (el criterio de cada pieza) · [Documentación funcional](../../documentation/creative/linea-grafica-glitch.md) · [Norma de la sub-línea, §9.1](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md#91-qué-ya-se-compone-en-el-artifact-composer-task-1923) · [TASK-1923](../../tasks/complete/TASK-1923-glitch-artifact-composer-catalogs.md) · [Producir el motion, el sonido y la música de Glitch](./producir-motion-glitch.md)

> **⚠️ Este comando es SÓLO para Glitch.** No compone piezas de Efeonce ni de clientes. Para cualquier otra pieza de
> Efeonce usa [Usar la línea gráfica de Efeonce](./usar-linea-grafica-efeonce.md).

## Para qué sirve

Explica cómo convertir los datos de una edición de Glitch en sus piezas estáticas, sin armarlas a mano: llenas **un
archivo de edición** (el manifiesto) y el comando `pnpm glitch:compose` compone, con el Artifact Composer:

| Salida | Qué es | Tamaño |
|---|---|---|
| **Carrusel de LinkedIn** (un PDF) | portada, 8 láminas interiores y contraportada: 10 páginas | 1080 × 1350 |
| **Piezas sueltas** (PNG) | las que pidas: portada, contraportada, una lámina interior, banner 16:9 del blog, versión 1:1 del blog, banner interno de una noticia, portada del reel y miniatura del vlog | según la pieza |
| **Overlays del video** (PNG con transparencia) | cuadro fijo de cabecera, lower third, tarjeta de noticia, Drop y llamado a la acción, en reel y en vlog | 1080 × 1920 · 1920 × 1080 |
| **Procedencia** (JSON) | qué entró, qué reglas lo gobernaron y qué salió, con la huella (sha256) de cada archivo | — |

Tú **pones el contenido**; el comando **decide** la plantilla de portada, las coordenadas, los colores y la falla en
bytes. Si algo rompe la línea de Glitch, el comando **no entrega nada** y te dice qué campo corregir.

Lo que **no** hace:

- **No publica.** Subir el carrusel a LinkedIn (Metricool) o el post a WordPress queda fuera del comando: lo hace una
  persona, con su confirmación.
- **No anima.** Los overlays son **cuadros fijos**; los `.mov` animados, el sonido y la música salen del repo taller
  ([Producir el motion, el sonido y la música de Glitch](./producir-motion-glitch.md)).
- **No es la ruta productiva.** Es el taller local. La ruta con API, `artifact-worker`, MCP y capability es TASK-1921.
- **También compone un Glitch Flash** (una noticia puntual, sin número de edición, 2026-09-28) con su propio
  manifiesto: ver [Componer un Glitch Flash](#componer-un-glitch-flash). Nunca armes un Flash inventando siete noticias
  de relleno en el manifiesto semanal. Qué cambia en el Flash: [norma §14](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md#14-glitch-flash--formato-puntual-lanzado-2026-09-28).

> **Chip de la portada (2026-09-28):** en productivo el chip de la portada con foto dice «LA NOTICIA», no «PORTADA», y
> las plantillas `CoverPhoto`, `BlogBannerPhoto` y `BlogSquarePhoto` ya lo pintan así. La muletilla de la contraportada
> (`back.closingLine`) se escribe para cada edición: nunca copies la de la anterior.

## Antes de empezar

- **Confirma que la pieza es de Glitch.** Si no, este manual no aplica.
- **Ten el contenido de la edición:** número (la próxima es la **#17**), fecha de publicación, semana que cubre, tesis,
  las **ocho noticias** en orden (sección, titular, medio, fecha, foto, remate del narrador y porqué), el cierre de la
  contraportada y, si hay video, sus datos.
- **Anota la plantilla de portada de la semana pasada** (A, B o C; `none` si es la primera edición compuesta). La
  rotación depende de ese dato.
- **Fotos con licencia.** Cada foto declara su licencia y se valida. Sólo se admiten tres tipos:

  | `kind` | Cuándo |
  |---|---|
  | `licensed` | foto licenciada (banco de imágenes, acuerdo con el medio) |
  | `owned` | foto propia de Efeonce |
  | `generated` | imagen generada |

  **El kit de prensa no cuenta como licencia** (decisión del operador, 2026-09-27). Cada foto de noticia lleva además
  su **crédito**, que se pinta en la lámina. La foto del host es propia: declara su licencia y **no** pinta crédito.
- **Rostros declarados.** Para cada foto, anota dónde hay caras (`faceRegions`). La falla en bytes **nunca** cae sobre
  un rostro; si no hay caras, se escribe `[]` a propósito. Las regiones se miden sobre la **foto original**, en valores
  de 0 a 1 (`x`, `y`, `w`, `h`): el comando las lleva solo al recorte de cada hueco.
- **Guttery.** La letra de las muletillas del narrador está en el repo privado, en
  `src/lib/artifact-composer/brand-packs/axis/fonts/guttery-400.ttf`, y su licencia (web y video, confirmada por el
  operador el 2026-09-27) la declara el brand pack en `fonts.json` (extensión `glitch`, `embedRights: true`). No tienes
  que instalar nada. Si esa declaración faltara, la portada B y la muletilla no se componen (`font-license-missing`).
- **Dependencias del repo instaladas** (`pnpm install`). El comando corre en local, desde la raíz de `greenhouse-eo`.

## Paso a paso

### Paso 1 · Parte del ejemplo

El ejemplo completo de la #17 está en
[`src/lib/glitch-composition/examples/edition-17.example.json`](../../../src/lib/glitch-composition/examples/edition-17.example.json),
con fotos sintéticas en `examples/fotos/`. Pruébalo primero sin tocar nada:

```bash
pnpm glitch:compose -- --manifest src/lib/glitch-composition/examples/edition-17.example.json
```

Debe terminar con `✓ Glitch #17 (portada A) → .captures/glitch/edicion-17`.

Para una edición real, **copia** el ejemplo a tu carpeta de trabajo junto con sus fotos. Las rutas de las fotos
(`file`) son **relativas al manifiesto**. El ejemplo lleva `"example": true` y textos marcados «[Ejemplo]»: en una
edición real, quita `example` (o ponlo en `false`) y reemplaza todos los textos.

> Si necesitas regenerar las fotos sintéticas del ejemplo: `pnpm tsx scripts/glitch/make-example-photos.ts`
> (`--check` sólo verifica que están al día).

### Paso 2 · Llena el manifiesto

El manifiesto es estricto: **un campo que no existe se rechaza** (así nadie cuela una plantilla elegida a mano). Los
largos máximos de cada texto no están aquí: son de cada plantilla, y un texto que no cabe se rechaza (nunca se recorta).

**Edición y portada**

| Campo | Qué va | Regla |
|---|---|---|
| `schemaVersion` | `1` | siempre `1` |
| `example` | `true` sólo en ejemplos | un manifiesto de ejemplo nunca se publica |
| `edition.number` | número de la edición | entero; la serie es dato, el comando no la decide |
| `edition.publishDate` | fecha de publicación | `AAAA-MM-DD`; también fija las fechas internas del PDF |
| `edition.weekRange` | `from` y `to` de la semana | `AAAA-MM-DD`; `from` no puede ser posterior a `to` |
| `thesis` | la tesis de la semana | texto |
| `previousEdition` | `number` y `coverTemplate` (`A`, `B`, `C` o `none`) | el número debe ser menor que el actual; **decide la rotación** |
| `cover.newsId` | la noticia de portada | `n1` … `n8` |
| `cover.standalonePov` | un POV que pega solo (`entry` + `punch`) o `null` | lo hace candidata a la portada B |
| `cover.mosaic` | cuatro noticias distintas del mismo peso o `null` | lo hace candidata a la portada C |
| `cover.muletilla` | muletilla del narrador en Guttery («spoiler:») o `null` | — |
| `cover.headline` | titular de portada: `entry` (entrada liviana) + `punch` (remate) | los dos son obligatorios: sin ellos no hay contraste de pesos |
| `cover.lines` | exactamente **dos** líneas «+ IA»: `newsId` + `text` | la sección sale de la noticia |

**Las ocho noticias** (`news`, exactamente 8, con `id` `n1` a `n8` en ese orden)

| Campo | Qué va | Regla |
|---|---|---|
| `section` | `marketing`, `creatividad` o `tecnologia` | — |
| `headline`, `outlet`, `date` | titular, medio y fecha (`AAAA-MM-DD`) | — |
| `photo.file` | ruta de la foto | relativa al manifiesto |
| `photo.credit` | crédito | se pinta en la lámina |
| `photo.license` | `kind` (`licensed`, `owned`, `generated`) + `ref` | se valida; nunca se pinta; kit de prensa no |
| `photo.strong` | ¿es una foto fuerte? | en la noticia de portada, la hace candidata a la portada A |
| `photo.fractureEdge` | borde por donde se desarma en bytes: `bottom`, `left` o `right` | elige el borde lejos de las caras |
| `photo.faceRegions` | cajas de los rostros (0–1, sobre la foto original) | obligatorio; `[]` = sin rostros |
| `pov` | el Glitch Drop: `entry` + `punch` | — |
| `why` | el porqué, en Poppins | texto |
| `lens` | `{ "region": {…} }` con el detalle nítido, o `null` | variante ocasional; **nunca** en `n1` |

**Contraportada, video y salidas**

| Campo | Qué va | Regla |
|---|---|---|
| `back.closingLine` | la frase de cierre («Nos vemos el lunes.») | texto |
| `video` | los datos del video o `null` | obligatorio si pides overlays, portada del reel o miniatura |
| `video.host` / `video.guest` | `name` + `role`; `guest` puede ser `null` | — |
| `video.newsIds` | las **tres** noticias del video, en orden | — |
| `video.shortHeadlines` | titular corto de cada una de esas tres | obligatorio para cada noticia del video |
| `video.drop.newsId` | la noticia que comenta el Drop | tiene que ser una de las tres del video |
| `video.cta` | `reel` y `vlog`: el texto del llamado a la acción | — |
| `video.transition` | `basic` o `bytes` | por defecto `basic` |
| `video.hostPhoto` | `file`, `license` y `faceRegions` de la foto del host, o `null` | propia: licencia sí, crédito no |
| `video.cover` | titular de la portada del reel y la miniatura (`entry` + `punch`) o `null` | — |
| `outputs.stills` | las piezas sueltas que pides (lista de abajo) | por defecto ninguna |
| `outputs.overlays` | `reel`, `vlog` o ambos | por defecto ninguno; exigen `video` |

Piezas sueltas que admite `outputs.stills`:

| Valor | Pieza |
|---|---|
| `cover` · `back` | portada y contraportada sueltas |
| `interior:n1` … `interior:n8` | una lámina interior suelta |
| `blog:banner` | imagen destacada 16:9 del blog (1920 × 1080), con la plantilla de portada de la semana |
| `blog:square` | versión 1:1 del blog (1080 × 1080): plantilla propia, nunca un recorte del 4:5 |
| `blog:news:n1` … `blog:news:n8` | banner interno de una noticia (1600 × 900), con el crédito pintado |
| `reel:cover` | portada del reel (1080 × 1920) |
| `video:thumbnail` | miniatura del vlog (1280 × 720) |

`reel:cover` y `video:thumbnail` exigen `video.hostPhoto` **y** `video.cover`.

### Paso 3 · Compón

```bash
pnpm glitch:compose -- --manifest <ruta/a/edicion.json>
```

Argumentos:

| Argumento | Qué hace | Por defecto |
|---|---|---|
| `--manifest <archivo>` | el manifiesto de la edición | obligatorio |
| `--out <carpeta>` | dónde dejar las salidas | `.captures/glitch/edicion-<n>/` |
| `--only carousel,stills,overlays` | compone sólo esas familias (separadas por coma) | las tres |

`--only` sólo decide **qué se pinta**: el manifiesto y el plan completo de la edición se validan siempre, así que un
error en una noticia se reporta aunque pidas sólo los overlays.

Qué pasa por dentro, en orden: se valida el manifiesto → se elige la portada por rotación y cada lámina se valida contra
el contrato de AXIS `efeonce.glitch-line` → cada foto se procesa al tamaño exacto de su hueco → la falla en bytes se
calcula sobre la foto ya procesada, lejos de los rostros → se componen los tres catálogos (cada uno revisa su plan
entero antes de pintar) → el carrusel se mide contra los límites de LinkedIn → se escribe la procedencia.

### Paso 4 · Revisa las salidas

En la carpeta de salida (en el ejemplo, `.captures/glitch/edicion-17/`):

| Archivo o carpeta | Qué es |
|---|---|
| `glitch-<n>-carrusel.pdf` | el carrusel listo para subir como documento a LinkedIn (10 páginas, un solo tamaño; el ejemplo pesa ~0,7 MB) |
| `carrusel/` | un PNG por lámina + `glitch-<n>-carousel.manifest.json` |
| `sueltas/` | las piezas que pediste en `outputs.stills` |
| `overlays/` | los PNG con transparencia (el ejemplo, con reel y vlog y sin invitado, da 18) |
| `glitch-<n>.provenance.json` | la procedencia: huella del manifiesto, de cada foto original y procesada, celdas de la falla por lámina, versiones de AXIS, estado de la licencia de Guttery, límites de LinkedIn aplicados y huella de cada salida |

La procedencia **no lleva fechas del reloj**: la misma edición produce los mismos archivos. Dos corridas del ejemplo
dieron los 35 PNG idénticos byte a byte. Si recompones sin cambiar nada y un archivo cambia, algo cambió en la entrada.

Los overlays se sueltan en la posición 0,0 del cuadro, como los `.mov` del kit. El Drop del vlog es opaco a pantalla
completa, igual que en el kit.

Antes de entregar, pasa el checklist de [Componer piezas de Glitch, paso 7](./componer-piezas-glitch.md#paso-7--revisa-antes-de-entregar):
el comando garantiza las reglas, pero la mirada editorial (que la foto y el POV sean los correctos) es humana.

## Componer un Glitch Flash

El **Glitch Flash** es el segundo formato de Glitch (decisión del operador, 2026-09-28): sale el día de una noticia
puntual, **no lleva número de edición** y **queda fuera de la rotación de portadas**. Se compone con el **mismo
comando**; lo que cambia es el manifiesto.

```bash
pnpm glitch:compose -- --manifest src/lib/glitch-composition/examples/flash-sonnet-5-5.example.json
```

El ejemplo (`example: true`, fotos sintéticas de `examples/fotos/`, nunca se publica) deja las salidas en
`.captures/glitch/flash-ejemplo-claude-sonnet-5-5/`.

**El manifiesto del Flash** (`GlitchFlashManifest`, estricto) se reconoce por `edition.kind: "flash"`:

| Campo | Qué pones |
|---|---|
| `edition` | `kind: "flash"`, `slug` (minúsculas con guiones: nombra los archivos), `title` (el documento se llama «Glitch Flash · <title>») y `publishDate`. **Sin `number`**: si lo pones, falla con `flash-edition-number-not-allowed` |
| `news` | **exactamente una** noticia: `section`, `headline`, `outlet`, `date`, `photo` (igual que en la semanal, sin `strong`), `pov` y `why`. Sin `id` ni lente |
| `cover` | `photo` (la imagen de la portada; `null` repite la de la noticia), `headline {entry, punch}` y dos `lines`, cada una con su `section` y su `text` (dos lecturas de la misma noticia) |
| `back.closingLine` | **obligatoria** y escrita para este Flash: una línea o dos (`["léelo completo", "en nuestro blog."]`). Nunca el número de la próxima edición ni «el resto, el lunes» (rechazada por el operador) |
| `outputs.stills` | `threads`, `blog:banner`, `blog:news` y, si las quieres sueltas, `cover`, `interior`, `back` |

No lleva `previousEdition`, `thesis` ni `video`: si los pones, el comando te dice por qué sobran.

**Qué sale:**

| Archivo o carpeta | Qué es |
|---|---|
| `glitch-flash-<slug>-carrusel.pdf` | el documento de LinkedIn: **3 páginas** (portada, la noticia, contraportada), un solo tamaño |
| `carrusel/` | un PNG por lámina + manifiesto resuelto |
| `sueltas/` | `threads` (la portada **sin «Desliza»**), `blog-banner` (16:9, 1920 × 1080) y `blog-news` (banner interno 1600 × 900) |
| `glitch-flash-<slug>.provenance.json` | la procedencia, sin reloj, con `edition: null`, `editionKind: "flash"` y el `slug` |

El comando pinta lo que la línea fija para el Flash: la cabecera «NO ESPERA AL LUNES» sobre la **estela de bytes** y
«FLASH», el chip «LA NOTICIA» en la portada, Threads y el banner del blog, «ANUNCIO» en la noticia y en el banner
interno, la franja «El micrófono se abre», el pie sin avance n/8 y la muletilla en dos líneas. Cada lámina se valida
con el contrato `efeonce.glitch-line` 0.2.0 de AXIS (`edition: { kind: "flash" }`). Los copys los revisa el operador
**antes** de programar la publicación.

## Qué significan los errores

Si algo falla, el comando termina con código 1 y escribe `✗ [<código>] <mensaje>` y debajo una línea por problema:
`- [<código>] <ruta del campo>: <mensaje>`. El manifiesto y el plan completo se validan antes de pintar nada; si el
carrusel no cumple los límites de LinkedIn, el PDF final no se escribe (los PNG de revisión de `carrusel/` sí).

| Código | Qué pasó | Qué hacer |
|---|---|---|
| `manifest-invalid` | el manifiesto no cumple el esquema. Cada línea trae su ruta (por ejemplo `news[2].photo.credit`) y un sub-código: `field-unknown` (campo no admitido), `field-required` (falta un campo) o `field-invalid` (valor mal formado o regla rota: noticias fuera de orden, noticia desconocida, lente en `n1`, Drop fuera de las noticias del video, falta la foto o el titular del host para la portada del reel) | corrige el campo que indica la ruta. No agregues campos que el esquema no tenga |
| `manifest-invalid` con `flash-edition-number-not-allowed` en `edition.number` | un Glitch Flash con número de edición | quita `edition.number`: el Flash no es la edición entera |
| `piece-not-approved` | una plantilla en PROPUESTA llegó al catálogo (hoy no hay ninguna: todas las piezas de Glitch están aprobadas) | no la compongas como canon: espera la aprobación del operador |
| `cover-rotation-unsatisfiable` | ninguna plantilla sirve: el contenido sólo califica para la plantilla de la semana anterior (o para ninguna) | cambia el contenido de portada para que califique otra: una foto fuerte en la noticia de portada (A), un `standalonePov` (B) o un `mosaic` de cuatro (C). Nunca cambies `previousEdition` para forzarla |
| `font-license-missing` | el brand pack no declara la licencia de Guttery, así que la muletilla del narrador no se puede componer | no lo resuelvas quitando la letra: avisa al operador. La licencia la declara `fonts.json` del brand pack `axis` |
| `contract-issues` | el contrato `efeonce.glitch-line` de AXIS rechaza una o más láminas. La ruta es `<lámina>.<campo>` y el código es del contrato (por ejemplo `sphere-count-exceeded`, `bytes-over-face`, `headline-weight-contrast-missing`) | corrige el dato de esa lámina en el manifiesto; nunca edites la plantilla para que pase |
| `fracture-over-face` | la falla en bytes caería sobre un rostro declarado | cambia `fractureEdge` a otro borde, revisa que `faceRegions` esté bien medido o cambia la foto |
| `carousel-too-heavy` | el PDF no se puede subir a LinkedIn como documento: pesa más de 100 MB, tiene más de 300 páginas o mezcla tamaños de página (límites de LinkedIn para documentos, [LinkedIn Help](https://www.linkedin.com/help/linkedin/answer/a518909), verificados el 2026-09-27; el PDF del ejemplo #17 pesa unos 0,7 MB) | revisa qué cambió respecto del ejemplo; no lo subas partido ni comprimido a mano |
| `glitch.*` (por ejemplo `glitch.cover-rotation`, `glitch.photo-credit`) | segunda línea de defensa: los validadores del catálogo repiten las reglas sobre el plan ya resuelto y abortan la composición | normalmente el comando lo atrapa antes con uno de los códigos de arriba; si ves uno de estos, avisa: significa que un plan llegó al catálogo sin pasar por las reglas |
| `Uso: pnpm glitch:compose …` (código 2) | falta `--manifest` | agrégalo |
| `--only no reconoce: …` | un valor de `--only` que no existe | usa `carousel`, `stills` u `overlays` |

## Qué no hacer

- No uses el comando para piezas que no son de Glitch.
- No agregues al manifiesto un campo para elegir la plantilla o la portada: se rechaza. La portada la deciden el
  contenido y la de la semana anterior (A > B > C, nunca la misma dos semanas seguidas).
- No declares `faceRegions: []` en una foto que tiene caras para que pase la falla.
- No uses fotos del kit de prensa ni fotos sin crédito.
- No publiques el manifiesto de ejemplo ni sus piezas: sus noticias y fotos son de ejemplo.
- No retoques a mano los PNG o el PDF que salen: si algo está mal, se corrige el manifiesto y se vuelve a componer.
- No recortes la portada 4:5 para el cuadrado del blog: pide `blog:square`.
- No tomes los overlays PNG como el motion: la animación, el sonido y la música salen del repo taller.
- No cambies las plantillas ni los tokens para que un error desaparezca. Si alguien cambia una plantilla, debe pasar el
  gate visual (`pnpm composer:visual-gate --catalog=glitch`) y declarar cualquier cambio de línea base.
- No esperes que el comando publique: LinkedIn y WordPress quedan fuera.

## Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| La portada no es la que esperabas | la elige la regla: A > B > C por contenido y nunca la de la semana anterior | revisa `photo.strong` de la noticia de portada, `standalonePov`, `mosaic` y `previousEdition.coverTemplate` |
| Nunca sale la portada B | falta `cover.standalonePov`, o la licencia de Guttery no está declarada | agrega el POV; si es la licencia, verás `font-license-missing` |
| `manifest-invalid` en `news[0].lens` | la noticia 1 abre con «El micrófono se abre» y no admite la lente | quita la lente o úsala en otra noticia |
| `manifest-invalid` en `video.hostPhoto` o `video.cover` | pediste `reel:cover` o `video:thumbnail` sin la foto o el titular del host | completa esos dos campos o saca esas piezas de `outputs.stills` |
| `manifest-invalid` en `video` | pediste overlays sin sección `video` | agrega `video` o vacía `outputs.overlays` |
| El comando falla porque no encuentra una foto | la ruta de `photo.file` no es relativa al manifiesto | corrige la ruta desde la carpeta donde está el manifiesto |
| Queda fuera del cuadro una parte importante de la foto | el recorte de cada hueco es **centrado**, no «inteligente» | recorta o reencuadra la foto antes, para que lo importante quede cerca del centro |
| La lente amplía otra zona | la región de la lente se mide sobre la foto original, no sobre la lámina | vuelve a medir `lens.region` sobre la foto original |
| No aparece `sueltas/` u `overlays/` | no pediste piezas sueltas o overlays, o `--only` las dejó fuera | agrega valores en `outputs` o revisa `--only` |
| Tras subir la versión de AXIS, falla un test de tokens o el CI (`graphic-line-tokens-sync.test.ts`, drift de `glitch-tokens.css`) | los archivos generados llevan el sello de la versión de `@efeoncepro/axis-tokens`; se regeneró sólo uno de los dos juegos | corre `pnpm glitch:tokens` **y** `pnpm brand:tokens`, y los dos con `--check`, antes del commit (así falló el CI de `53002b352` el 2026-09-28) |
| El overlay `cta` dice «el #N sale el lunes.» aunque la contraportada tenga otra muletilla | la última frase de `overlay-cta-reel` / `overlay-cta-vlog` es fija (pendiente del operador) | no la edites en la plantilla ni en la salida; avisa al operador |

## Referencias técnicas

- Manifiesto (esquema estricto, `schemaVersion: 1`): [`src/lib/glitch-composition/manifest.ts`](../../../src/lib/glitch-composition/manifest.ts) (`GlitchEditionManifest` y, para el Flash, `GlitchFlashManifest`) · ejemplos [`examples/edition-17.example.json`](../../../src/lib/glitch-composition/examples/edition-17.example.json) y [`examples/flash-sonnet-5-5.example.json`](../../../src/lib/glitch-composition/examples/flash-sonnet-5-5.example.json)
- Mapper puro (portada por rotación, contrato AXIS, falla en bytes): [`src/lib/glitch-composition/`](../../../src/lib/glitch-composition/) (`planGlitchEdition`, `planGlitchFlash`, `planGlitchManifest`, `resolveCoverTemplate`, `fitRegion`; falla en `byte-fracture.ts`; estela del Flash en `flash-trail.ts`)
- Catálogos (`glitch-carousel`, `glitch-stills`, `glitch-overlays`; 32 plantillas aprobadas, seis de ellas del Flash): [`src/lib/artifact-composer/catalogs/glitch/`](../../../src/lib/artifact-composer/catalogs/glitch/)
- Comando: [`scripts/glitch/compose.ts`](../../../scripts/glitch/compose.ts) · límites de LinkedIn: [`scripts/glitch/linkedin.ts`](../../../scripts/glitch/linkedin.ts) · tokens: `pnpm glitch:tokens [--check]` (compila `glitch-tokens.css` desde `glitchLine` de AXIS)
- Gate visual: `pnpm composer:visual-gate --catalog=glitch [--selftest|--freeze]`; frames en `scripts/frontend/baselines/artifact-composer/templates-glitch/`
- Norma: [§9.1 Qué ya se compone en el Artifact Composer](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md#91-qué-ya-se-compone-en-el-artifact-composer-task-1923) · ADR: [`GLITCH_GRAPHIC_LINE_DECISION_V1.md`](../../architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md)
- Tasks: [TASK-1923](../../tasks/complete/TASK-1923-glitch-artifact-composer-catalogs.md) (taller local) · [TASK-1921](../../tasks/in-progress/TASK-1921-brand-surface-pieces-governed-production-route.md) (ruta productiva)
- Skill para agentes: `efeonce-graphic-line`, `references/glitch.md` §9

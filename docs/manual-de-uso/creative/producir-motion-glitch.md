# Producir el motion, el sonido y la música de Glitch — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.1
> **Creado:** 2026-09-27 por Claude
> **Ultima actualizacion:** 2026-09-27 por Claude (v1.1: el **pre-roll queda sólo en el vlog** y el reel abre directo
> con la apertura, con una intro de 4,0 s; dos verificaciones nuevas del reel; 13 pruebas; script `deliver` para
> re-entregar desde el manifiesto. v1.0: runbook del operador o editor agente que corre el taller:
> requisitos, `doctor`, flujo de una edición, todos los comandos y argumentos, verificaciones, manifiestos, música por
> huella y re-entrega sin volver a renderizar)
> **Modulo:** Creative · Glitch, magazine semanal de Efeonce (sub-línea de «La órbita») · video, motion, sonido y música
> **Ruta en portal:** no aplica — se corre en una máquina con el repo taller `efeoncepro/efeonce-brand-workshop` clonado junto a `greenhouse-eo`
> **Documentacion relacionada:** [Editar el video de Glitch](./editar-video-glitch.md) (el montaje en Premiere) · [Norma de la sub-línea, §13](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md) · [Referencia de comandos y argumentos, norma §13.13](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md#1313-referencia-de-comandos-y-argumentos) · [Documentación funcional](../../documentation/creative/linea-grafica-glitch.md) · [ADR del repo taller](../../architecture/EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1.md)

> **⚠️ Todo lo que produce este manual es SÓLO para Glitch.** Ni los gráficos, ni la transición de la manzana en bytes,
> ni el sonido, ni la música de Glitch se usan en piezas de Efeonce ni de clientes. Si la pieza no es de Glitch, este
> manual no aplica.

## Para qué sirve

Explica cómo **producir** los archivos que después monta el editor: la apertura y la tarjeta final, el pre-roll de la
intro, el kit de gráficos que va sobre el host, las transiciones entre escenas, y el sonido y la música que van junto a
cada pieza. Está escrito para quien **corre los comandos**: una persona del equipo o un agente de IA (el «editor
agente»). El montaje en Premiere Pro o After Effects está en [Editar el video de Glitch](./editar-video-glitch.md).

**Estado (2026-09-27):** todo lo que se produce aquí está **aprobado** por el operador: el motion («Si, el tuyo también
está aprobado»), el sonido en su versión B («La b me encanta más») y la música, tema B y cama post-punk («Post-punk
definitivamente»). La música ya está integrada al taller y el pre-roll de la intro («los tres puntos al ritmo») ya está
hecho; va **sólo en el vlog**: el reel abre directo con la apertura (decisión del operador del 2026-09-27). Lo que falta para producir en el día a día está en [Qué falta](#qué-falta-para-el-día-a-día).

## Antes de empezar

### Requisitos de la máquina

| Qué | Para qué | Cómo comprobarlo |
|---|---|---|
| El repo taller `efeoncepro/efeonce-brand-workshop` clonado **al lado** de `greenhouse-eo` (carpetas hermanas) | ahí vive la herramienta `tools/glitch-motion/` | desde `greenhouse-eo`, `ls ../efeonce-brand-workshop` |
| `greenhouse-eo` al lado del taller | el taller toma de ahí el logo de Glitch, las fuentes Bricolage y Poppins del font pack del Artifact Composer y la toma de prueba del host | se resuelve solo; si el repo está en otro lugar, usa `GREENHOUSE_DIR` |
| `gh` autenticado | para instalar los paquetes privados `@efeoncepro/*` | `gh auth status` |
| `ffmpeg` y `ffprobe` | verificaciones, vistas previas, animatic y mezcla | `ffmpeg -version` |
| HyperFrames | renderiza las composiciones a video; se instala con los paquetes del taller (vía pnpm) | lo revisa `doctor` |
| La fuente **Guttery** instalada en la máquina | las muletillas del narrador; está licenciada y **nunca va a git** | `~/Library/Fonts/Guttery.otf`, o la carpeta de `GLITCH_FONTS_DIR` |
| Conexión a internet la primera vez | bajar los másteres de la música del bucket público (después quedan en caché) | — |

**Instalar los paquetes** (una vez, y cada vez que cambien las dependencias del taller), desde `greenhouse-eo`:

```bash
NODE_AUTH_TOKEN=$(gh auth token) pnpm -C ../efeonce-brand-workshop install
```

`NODE_AUTH_TOKEN` sólo hace falta para instalar: da acceso a los paquetes privados de AXIS (`@efeoncepro/axis-tokens`
y `@efeoncepro/axis-brand-assets`).

### Variables de entorno

| Variable | Qué hace | Por defecto |
|---|---|---|
| `GREENHOUSE_DIR` | dónde está el repo `greenhouse-eo` | `../greenhouse-eo`, relativo al taller |
| `GLITCH_FONTS_DIR` | carpeta donde está `Guttery.otf` | `~/Library/Fonts` |
| `GLITCH_HOST_PLATE` | imagen de la toma del host que se usa **sólo** para las vistas previas y el animatic | la toma de prueba que trae `greenhouse-eo` |
| `NODE_AUTH_TOKEN` | acceso a los paquetes privados `@efeoncepro` al instalar | ninguno: pásalo con `$(gh auth token)` |

Ninguna ruta de tu máquina se escribe en el repo: todo se resuelve al correr.

### Cómo se escriben los comandos

Todos se corren **desde `greenhouse-eo`** con esta forma:

```bash
pnpm -C ../efeonce-brand-workshop --filter glitch-motion <script> -- <argumentos>
```

Lo que va después de `--` son los argumentos del script. En este manual se abrevia el comienzo como `pnpm … <script>`.

## Paso a paso

### 1 · Revisa el entorno con `doctor`

```bash
pnpm -C ../efeonce-brand-workshop --filter glitch-motion doctor
```

Muestra las versiones de HyperFrames, GSAP y los tokens de AXIS, confirma que encuentra cada archivo que necesita
(fuentes, logo de Efeonce, logo de Glitch, toma de prueba del host) y corre el chequeo propio de HyperFrames. **Si algo
falta, se detiene y dice qué buscó y dónde.** No sigas hasta que `doctor` pase.

### 2 · Prepara el archivo de edición

Los textos de los gráficos **no se escriben en el video**: salen de un **archivo de edición** (JSON). El ejemplo está
en el taller, en `tools/glitch-motion/ejemplos/edicion-17.ejemplo.json`. Tiene estos campos:

| Campo | Qué es |
|---|---|
| `edition` · `nextEdition` | número de esta edición y de la siguiente (para «el #18 sale el lunes.») |
| `host` `{ name, role }` | nombre y cargo del host |
| `guest` `{ name, role }` o `null` | invitado; con `null` no se genera su rótulo |
| `news` (tres) `{ section, headline, shortHeadline, source, image }` | sección, titular, titular corto, medio e imagen `{ file, credit }` o `null` |
| `drop` `{ newsIndex, lite, bold }` | sobre qué noticia es el Glitch Drop, su frase liviana y su remate |
| `cta` `{ reel, vlog }` | el llamado a la acción de cada formato |
| `transition` (opcional) | `"basic"` o `"bytes"`: la transición de las piezas |

1. Copia el ejemplo a un archivo nuevo para la edición y completa los textos reales. **El ejemplo trae textos entre
   corchetes**: son de relleno y no se publican.
2. Las **imágenes de las noticias** no van en el archivo ni en git: el campo `image.file` es sólo el nombre del
   archivo, que el comando busca en la carpeta que le pases con `--assets`. Si una noticia no trae imagen
   (`image: null`), no se genera su plano dividido (`fuente-N`).
3. Las imágenes tienen que ser embebidas o licenciadas, con su crédito en `image.credit`. Nunca descargadas de
   terceros sin licencia.

### 3 · Produce el kit de la edición

```bash
pnpm … kit -- --run 2026-10-05_glitch-kit-17 \
  --edition-file <ruta a tu archivo de edición> \
  --assets "<carpeta con las imágenes de las noticias>"
```

Genera, en reel y vlog: cabeceras «NOTICIA n / 3» (con su PNG `_fijo` para sostenerlas), rótulos del host y del
invitado, tarjeta de cada noticia, plano dividido de las noticias con imagen, Glitch Drop y llamado a la acción. Junto
a cada `.mov` deja su WAV (sonido B) con el mismo nombre, más la **cama** y la **cortina** de la música, una hoja con un
cuadro de cada pieza y el **animatic** de la edición completa, con el sonido y la música ya mezclados (vlog 48,4 s, con
el pre-roll; reel 45,2 s, sin pre-roll).
**Tarda unos 4 minutos** el kit completo; una pieza sola (con `--only`), segundos.

El animatic toma la apertura, la tarjeta final y el pre-roll del vlog de otra corrida (la de `render`), indicada con
`--opening-run`; por defecto usa `2026-09-27_glitch-motion-piloto-v2`, la aprobada. Si esa corrida no está en tu
máquina, el animatic se omite y el comando lo avisa.

### 4 · Vuelve a correr `render` sólo si cambia el número de la edición

La apertura muestra el número de la edición («#17») y la tarjeta final el de la siguiente. `render` produce la
apertura y la tarjeta final en reel y vlog, y el pre-roll de la intro sólo en el vlog, con su música:

```bash
pnpm … render -- --run 2026-10-05_glitch-motion-18 --edition 18
```

Si el número no cambió, reutiliza la corrida aprobada: no hace falta volver a renderizar.

Con la música activada (por defecto), `render` entrega:

- `glitch-apertura-{reel,vlog}.mov` y `glitch-cierre-{reel,vlog}.mov` (la tarjeta final).
- `glitch-preroll-vlog.mov`: el pre-roll de la intro, 3,2 s (96 cuadros), **opaco** (fondo navy), «los tres puntos
  al ritmo». Su último cuadro es idéntico al primero de la apertura: van uno tras otro sin corte visible. **El reel no
  lleva pre-roll**: abre directo con la apertura, así su bucle queda exacto (`TIMING.preroll.formats = ['vlog']`).
- `glitch-intro-vlog.wav` (pre-roll + apertura, 7,2 s, con los efectos de la apertura ya montados),
  `glitch-intro-reel.wav` (la misma intro desde 3,2 s, cortada por muestra y sin retoque: 4,0 s, lo mismo que la
  apertura) y `glitch-salida-{reel,vlog}.wav` (con la tarjeta final y su efecto ya montado). El reel usa los másteres
  de vlog.
- `glitch-intro-podcast.wav`, `glitch-cortina-podcast.wav` y `glitch-salida-podcast.wav`: la versión de audio para el
  podcast.
- Vistas previas sobre la toma de prueba (`vista-previa_{formato}_{apertura,cierre,bucle,intro}.mp4`, ya con sonido y
  música) y hojas de cuadros (`cuadros_{formato}_{apertura,cierre}.png`).

**Con música no se entregan** los WAV de efectos de la apertura y del cierre: la intro y la salida ya los traen y
sonarían doble. Si una edición va sin música, corre `render` con `--music off` (ver
[Edición sin música](#edición-sin-música)).

### 5 · Entrega a OneDrive con `--deliver`

Agrega `--deliver "<carpeta>"` al mismo comando. El comando **sólo entrega si todas sus verificaciones pasaron**, copia
los archivos a la carpeta y anota la entrega en el manifiesto. Las carpetas de hoy están en OneDrive,
`Alineación/5. Contenidos/09. Glitch/Motion/piloto/`:

| Comando | Carpeta de entrega | Cómo queda |
|---|---|---|
| `render` | `…/piloto/v2` | todo en la misma carpeta |
| `kit` | `…/piloto/kit` | una subcarpeta por formato: `kit/reel/` y `kit/vlog/` |
| `kit` con `--transition bytes` | `…/piloto/kit-transicion-bytes` | `reel/` y `vlog/` |
| `transiciones` | `…/piloto/transiciones` | `reel/`, `vlog/` y `LEEME.txt` |
| `heroe` | `…/piloto/transiciones/heroe` | `reel/` y `vlog/` |

La carpeta conserva el nombre `piloto`, pero su contenido está aprobado. En la ruta real de OneDrive en tu máquina,
la carpeta de la biblioteca cambia según la cuenta: pásala completa entre comillas (tiene espacios). En el manifiesto
queda escrita como `OneDrive: Alineación/…`, sin la parte de tu máquina.

Ejemplo real (la entrega del kit del 2026-09-27):

```bash
pnpm … kit -- --run 2026-09-27_glitch-kit-piloto \
  --edition-file ejemplos/edicion-17.ejemplo.json --assets "<carpeta con las imágenes>" \
  --deliver "<tu carpeta de OneDrive>/Alineación/5. Contenidos/09. Glitch/Motion/piloto/kit"
```

### 6 · Revisa el manifiesto y avisa

Cada corrida deja su manifiesto en el taller: `corridas/<corrida>/manifiesto.json`. Tiene:

- el sha256, el tamaño y el códec de cada archivo producido;
- cada verificación con su resultado (`ok: true` o `false`) y su detalle;
- las versiones de HyperFrames, GSAP y los paquetes de AXIS, y el commit del taller (y si el árbol estaba modificado);
- el estado (aprobado 2026-09-27) y el canon;
- la entrega: dónde (`OneDrive: …`) y qué archivos.

Los binarios **nunca** entran a git: sólo el manifiesto. Avísale al editor qué carpeta cambió y qué piezas.

## Scripts y argumentos

La referencia normativa completa está en la
[norma §13.13](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md#1313-referencia-de-comandos-y-argumentos).
Esto es lo que necesitas para operar.

| Script | Qué hace |
|---|---|
| `doctor` | revisa fuentes, logo de Efeonce, logo de Glitch, toma de prueba, ffmpeg y HyperFrames |
| `build` | arma las composiciones HTML de la apertura y la tarjeta final (y la del pre-roll del vlog si la música va), sin renderizar |
| `render` | `build` + `hyperframes lint` + render + `verify`: apertura y tarjeta final (reel y vlog) y **pre-roll** (sólo vlog) |
| `verify` | verifica lo ya renderizado por `render` y rearma vistas previas, WAV y manifiesto. **No entrega** |
| `deliver` | re-entrega una corrida ya verificada desde su manifiesto (`corridas/<run>/manifiesto.json`), **sin verificar ni renderizar**: copia a `--deliver` lo que lista el manifiesto y anota la entrega. Argumentos: `--run` y `--deliver` |
| `kit` | los gráficos del kit desde el archivo de edición + sus WAV + cama y cortina + hoja + animatic |
| `transiciones` | el paquete máscara + capa (3 orígenes × 2 duraciones) + sus WAV + demos + `LEEME.txt` |
| `heroe` | la transición héroe entre dos clips concretos, renderizada |
| `sonido` | sólo el juego de WAV, sin render de video, en `out/<run>/sonido-<b\|a>/` (acepta `--sound` y `--edition`). Para entregar, el sonido sale junto a cada `.mov` con `render`, `kit`, `transiciones` y `heroe` |
| `test` | 13 pruebas del paquete: registro de timelines, determinismo, sin red, datos de edición en pantalla, pre-roll, pre-roll sólo en el vlog (el reel abre con la apertura y su intro dura lo que la apertura), huellas de la música y el juego de sonido completo y determinista |

| Argumento | Sirve en | Valor y por defecto |
|---|---|---|
| `--run <id>` | todos (incluido `deliver`) | nombre de la corrida: su carpeta `out/<id>/` (fuera de git) y su manifiesto `corridas/<id>/`. Por defecto, la fecha más `_glitch-motion` (`render`), `_glitch-kit`, `_glitch-transiciones` o `_glitch-heroe`. Ponle siempre un nombre explícito |
| `--edition <n>` | `render` | número de la edición (por defecto 17) |
| `--edition-file <json>` | `kit` | archivo de edición (por defecto `ejemplos/edicion-17.ejemplo.json`, relativo a `tools/glitch-motion/`) |
| `--assets "<carpeta>"` | `kit` | carpeta con las imágenes de las noticias. Obligatoria si alguna noticia trae imagen |
| `--transition basic\|bytes` | `kit` | transición de las piezas; por defecto la del archivo de edición y, si no dice, `basic` |
| `--only a,b` | `kit` | sólo esas piezas, por ejemplo `--only cabecera-1,drop` |
| `--skip-render` | `kit`, `transiciones` | reutiliza los `.mov` ya renderizados de esa corrida; rehace verificaciones, WAV, vistas previas y entrega |
| `--opening-run <id>` | `kit` | corrida de la que toma apertura, tarjeta final y pre-roll (el del vlog) para el animatic (por defecto `2026-09-27_glitch-motion-piloto-v2`) |
| `--formats reel,vlog` | `render`, `kit`, `transiciones`, `heroe` | formatos a producir (por defecto los dos) |
| `--workers <n>` | `render`, `kit`, `transiciones`, `heroe` | procesos de render de HyperFrames (por defecto 2) |
| `--deliver "<carpeta>"` | `render`, `kit`, `transiciones`, `heroe`, `deliver` | copia la entrega y la anota en el manifiesto. Sólo si todo pasó (con `deliver`, lo que ya pasó en esa corrida) |
| `--a <archivo>[@seg]` · `--b <archivo>[@seg]` | `transiciones` (sólo para las demos), `heroe` | escena A y escena B (imagen o video) y el segundo exacto del corte. Sin `@seg`, de A se toma el final y de B el inicio |
| `--origin centro\|izquierda\|marca` | `heroe` | de dónde nace la manzana (por defecto `centro`) |
| `--sound b\|a\|off` | `render`, `kit`, `transiciones`, `heroe` | **`b` por defecto (la aprobada)**; `a` es la alternativa descartada: no se usa; `off` sin WAV |
| `--music on\|off` | `render`, `kit` | **`on` por defecto (la aprobada)**; `off` produce sin música y entrega los WAV de efectos de apertura y cierre |

### Ejemplos reales

```bash
# Apertura, tarjeta final y pre-roll de la edición 17, con sonido y música, entregados a v2/
pnpm … render -- --run 2026-09-27_glitch-motion-piloto-v2 --edition 17 --deliver "<OneDrive>/…/Motion/piloto/v2"

# Sólo la cabecera 1 y el Drop, para corregir un texto (segundos)
pnpm … kit -- --run 2026-10-05_glitch-kit-17 --edition-file <archivo> --assets "<imágenes>" --only cabecera-1,drop

# El kit con la transición de bytes en tarjetas y Drop
pnpm … kit -- --run 2026-09-27_glitch-kit-transicion --edition-file <archivo> --assets "<imágenes>" --transition bytes

# Paquete de transiciones entre escenas, con demos sobre dos imágenes sin rostros
pnpm … transiciones -- --run 2026-09-27_glitch-transiciones --a <imagen A> --b <imagen B> --deliver "<OneDrive>/…/Motion/piloto/transiciones"

# Héroe para un corte concreto: A en el segundo 12,4 y B en el 3, desde la marca, sólo vlog
pnpm … heroe -- --run 2026-10-05_glitch-heroe-noticia-2 --a <clip A>@12.4 --b <clip B>@3 --origin marca --formats vlog

# Pruebas del paquete
pnpm … test
```

## Qué verifica cada comando

| Comando | Verifica | Resultado del 2026-09-27 |
|---|---|---|
| `render` | ProRes 4444 con alfa, tamaño del formato, 30 fps, cuadros exactos, sin audio; la apertura abre opaca y termina transparente, la tarjeta final al revés; **bucle**: el último cuadro de la tarjeta final = el primero de la apertura; pre-roll del vlog de 96 cuadros, opaco de punta a punta y con su último cuadro = el primero de la apertura; en el reel, «intro reel: el corte del pre-roll cae en silencio» (−90 dBFS en 3,2 s) y «bucle de audio reel: el final de la salida cae en silencio» (−55 dBFS); la huella (sha256) de cada máster de música; cada WAV a 48 kHz, 24 bits, estéreo y con la misma duración que su video | 37/37 |
| `kit` | por pieza: ProRes 4444 con alfa, tamaño, 30 fps, cuadros exactos, sin audio, entra desde transparente y sale a transparente; cada WAV igual que arriba; la huella de la música | 95/95 |
| `transiciones` · `heroe` | máscara y capa (o héroe) con su formato, cuadros y alfa; su WAV | 84/84 · 8/8 |
| `test` | las 13 pruebas del paquete | 13/13 |

El render usa `hyperframes lint` antes de renderizar: si una composición tiene un error o una advertencia, se detiene.

### Si una verificación falla

- El comando marca `FALLA` en esa línea, escribe el manifiesto con el detalle y termina con error. **No entrega.**
- **Nunca fuerces la entrega** copiando a mano los archivos de `out/` a OneDrive: una pieza que no pasó puede tener otro
  largo, perder la transparencia o desfasar el sonido.
- Lee el detalle de la verificación en la salida o en el manifiesto, corrige la causa y vuelve a correr. Si la causa no
  es obvia (por ejemplo, una verificación de cuadros o de alfa en una pieza que no tocaste), avisa al operador con el
  nombre de la corrida.

## Música: por huella, nunca regenerada

La música **es una grabación editada, no síntesis**: la fuente de verdad son los siete másteres del bucket público
`https://storage.googleapis.com/efeonce-group-axis-public-media/glitch/music/v1/`.

- El taller los baja por URL (la primera vez; después quedan en la caché del taller) y **comprueba el sha256 de cada
  uno** contra la huella aprobada, que está fijada en el código (`src/music.mjs`) y en la
  [norma §13.12](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md#1312-música--sólo-glitch-aprobada-tema-b--cama-post-punk).
- **Si una huella no coincide, el comando se detiene** con «el bucket cambió. No se entrega.». En ese caso **para y
  avísale al operador**: no cambies la huella en el código, no busques otra copia y **nunca regeneres la música** con un
  modelo. Un cambio de música es una ronda nueva que aprueba el operador.
- Los másteres: intro vlog 7,2 s · intro podcast 13,6 s · cortina vlog y podcast 2,0 s · salida vlog 3,0 s · salida
  podcast 7,0 s · cama (bucle de 12 compases) 19,2 s. Todo en la grilla de 150 BPM del motion.

El **sonido** (los efectos), en cambio, **sí se sintetiza** en el taller, de forma determinística: el mismo comando da el
mismo archivo byte a byte, y sus tiempos se leen del código del motion. Si cambia el motion, el sonido se mueve con él al
volver a correr el comando.

## Re-entregar sin volver a renderizar

- **Kit y transiciones:** repite el comando con la misma `--run`, agrega `--skip-render` y `--deliver`. Reutiliza los
  `.mov` que ya están en `out/<corrida>/` y rehace verificaciones, WAV, vistas previas y la entrega. Sirve, por ejemplo,
  para entregar a otra carpeta o para regenerar el sonido y la música sin volver a renderizar.
- **Apertura y tarjeta final (`render`):** no tiene `--skip-render`. `verify -- --run <corrida>` vuelve a verificar y
  rearma vistas previas, WAV y manifiesto sin renderizar, pero **no entrega**. Para entregar una corrida que ya pasó,
  usa el script `deliver`: re-entrega desde el manifiesto de la corrida, **sin verificar ni renderizar**:

  ```bash
  pnpm … deliver -- --run 2026-09-27_glitch-motion-piloto-v2 --deliver "<OneDrive>/…/Motion/piloto/v2"
  ```

  Úsalo sólo con una corrida cuyo manifiesto muestre todas las verificaciones en verde; si cambiaste algo después,
  corre `verify` (o `render`) antes.
- `--skip-render` sólo sirve si los `.mov` siguen en `out/<corrida>/` de **esta máquina**: esa carpeta no está en git.

## Edición sin música

Si una edición tiene que ir sin música, produce con `--music off` en `render` y en `kit`. Así `render` entrega los WAV
de efectos de la apertura y del cierre (`glitch-apertura-*.wav` y `glitch-cierre-*.wav`), no produce el pre-roll ni la
intro y la salida, y `kit` no suma la cama ni la cortina. Los de la entrega aprobada ya están en OneDrive, en
`…/piloto/v2/sin-musica/`, con un `LEEME.txt`.

## Qué significan los estados y señales

| Señal | Qué significa |
|---|---|
| `OK` en una línea | esa verificación pasó |
| `FALLA` en una línea | esa verificación no pasó: el comando no entrega |
| «Hay verificaciones en FALLA: no se entrega.» | el resumen del caso anterior; el manifiesto quedó escrito con el detalle |
| «entregado en OneDrive: …» | la entrega se copió y quedó anotada en el manifiesto |
| «animatic omitido: falta …» | falta alguna pieza de la corrida de `--opening-run` en esta máquina; el kit se entregó igual, sin animatic |
| «Huella distinta para … el bucket cambió» | un máster de música no es el aprobado: para y avisa |
| `dirty: true` en el manifiesto | el taller tenía cambios sin commit al producir: la corrida no es reproducible desde un commit |

## Qué no hacer

- **No uses nada de esto fuera de Glitch.** La transición de la manzana en bytes, el sonido y la música son exclusivos
  de Glitch.
- **No toques** coordenadas, tiempos, curvas, colores ni fuentes de las composiciones para «arreglar» una pieza: lo que
  se cambia es el archivo de edición y las opciones de los comandos.
- **No edites los `.mov` renderizados**, ni los WAV a mano.
- **No regeneres la música** ni cambies sus huellas; **no uses la versión A** del sonido (`--sound a` existe sólo como
  histórico de la decisión).
- **No entregues** algo que no pasó sus verificaciones, ni copies a mano desde `out/`.
- **No versiones** imágenes, video, audio ni la fuente Guttery en git.
- **No pidas** la transición de bytes ni la héroe para un corte hacia o desde la toma del host a cámara: la falla nunca
  va sobre un rostro (excepción sólo con aprobación del operador).
- **No marques** una pieza como aprobada ni hagas push del taller sin la señal del operador.

## Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| `doctor` dice «No encuentro Guttery» | la fuente no está instalada donde la busca | instálala en `~/Library/Fonts` o pasa `GLITCH_FONTS_DIR` con la carpeta que contiene `Guttery.otf` |
| `doctor` no encuentra el logo de Glitch o Bricolage | `greenhouse-eo` no está al lado del taller | clónalo como carpeta hermana o pasa `GREENHOUSE_DIR` |
| La instalación falla con un error de autorización de `@efeoncepro` | falta el token | instala con `NODE_AUTH_TOKEN=$(gh auth token)` y revisa `gh auth status` |
| «La noticia N trae imagen: pasa --assets» | el archivo de edición tiene una imagen y no pasaste la carpeta | agrega `--assets "<carpeta>"` |
| «No encuentro la imagen de la fuente» | el nombre en `image.file` no está en la carpeta de `--assets` | corrige el nombre o la carpeta |
| «lint: …» y el comando se detiene | la composición de esa pieza no pasó `hyperframes lint` | no la entregues; avisa al operador con el nombre de la pieza |
| El animatic no se generó | falta la corrida de `--opening-run` en esta máquina | corre `render` con esa corrida o apunta `--opening-run` a una que tengas |
| `--skip-render` vuelve a renderizar todo | los `.mov` de esa corrida no están en `out/` de esta máquina, o cambiaste el nombre de la corrida | usa la misma `--run` en la máquina donde se renderizó, o renderiza |
| No puedo bajar un máster de música | no hay conexión y no está en la caché | conéctate y vuelve a correr |
| «Huella distinta … el bucket cambió» | el máster del bucket no es el aprobado | para y avisa al operador. No se entrega |
| El editor escucha la apertura doble | montó la intro con música y además el WAV de efectos de la apertura (de `sin-musica/`) | con música, sólo `glitch-intro-*.wav`; ver [Editar el video de Glitch](./editar-video-glitch.md) |

## Qué falta para el día a día

Esto **no está decidido**; queda anotado para que no se asuma resuelto:

- **Decisiones del operador:** la cadencia de grabación (hoy 30 fps), la prueba de los editores con una edición real y
  la voz del host (incluye validar el ducking de la cama), a qué piezas va la transición de bytes (se recomienda
  tarjetas y Drop), el estilo de subtítulos en Premiere, un parámetro de ritmo (factible, no hecho) y cualquier
  excepción a la regla de rostros.
- **Contenido:** los textos reales de la #17 (titulares, medios, fotos con crédito, invitado).
- **Operación:** hoy cada edición la corre alguien **en su máquina**, con el taller, `gh`, ffmpeg, HyperFrames y Guttery
  instalados. No hay autoservicio: el formulario en Marketing Studio (recomendado) y el dominio de ediciones
  ([TASK-1442](../../tasks/to-do/TASK-1442-glitch-domain-api-foundation.md)), que produciría el archivo de edición,
  están pendientes. El pipeline editorial agéntico está descrito en
  [EPIC-031](../../epics/to-do/EPIC-031-glitch-agentic-editorial-pipeline.md).
- **Plataforma:** los tokens de Glitch en AXIS ([TASK-1922](../../tasks/to-do/TASK-1922-glitch-axis-franchise-token-contract.md);
  hoy la paleta y la manzana son una propuesta espejada en el taller), los assets de Glitch en `axis-brand-assets`, el
  catálogo de piezas fijas del Artifact Composer ([TASK-1923](../../tasks/to-do/TASK-1923-glitch-artifact-composer-catalogs.md))
  y un archivo de los binarios en la nube de Google (hoy sólo OneDrive más el sha256 en los manifiestos).

## Referencias técnicas

- Norma de la sub-línea, motion y transiciones: [`GLITCH_GRAPHIC_LINE_V1.md` §13](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md)
- Referencia de comandos y argumentos: [norma §13.13](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md#1313-referencia-de-comandos-y-argumentos)
- Sonido (aprobado, versión B): [norma §13.11](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md#1311-sonido--sólo-glitch-aprobado-versión-b)
- Música (aprobada, tema B + cama post-punk): [norma §13.12](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md#1312-música--sólo-glitch-aprobada-tema-b--cama-post-punk)
- Montaje del editor: [Editar el video de Glitch](./editar-video-glitch.md)
- Repo taller: [`EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1.md`](../../architecture/EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1.md) · código en `efeoncepro/efeonce-brand-workshop`, `tools/glitch-motion/` (su `README.md`) y `tools/brand-sound/`
- Trabajo en curso: [TASK-1924](../../tasks/to-do/TASK-1924-glitch-motion-overlays-hyperframes.md) (motion) · [TASK-1925](../../tasks/to-do/TASK-1925-brand-workshop-migration.md) (migración al taller)
- AXIS: [/references/glitch/](https://axis.efeonce.org/references/glitch/) (secciones Motion, Sonido y Música) y `/references/glitch.json`
- Skill para agentes: `efeonce-graphic-line`, `references/glitch.md`

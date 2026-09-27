# Editar el video de Glitch con los gráficos animados — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.6
> **Creado:** 2026-09-27 por Claude
> **Ultima actualizacion:** 2026-09-27 por Claude (v1.6: mapa de la edición completa en la línea de tiempo; el sonido
> se toma de los WAV que vienen junto a cada `.mov` y `sonido-propuesta/` queda como histórico; el pre-roll entra en la
> sección 1; el método del ducking en Premiere queda a validar en la prueba de los editores; puntero al manual de
> producción. v1.5: el taller entrega la música junto a cada pieza, con el pre-roll
> de la intro; con música no van `apertura.wav` ni `cierre.wav`; la cama no va bajo el host fuera de las noticias; §6 y
> §6.1. v1.4: la música quedó aprobada; se monta la cama post-punk bajo la
> noticia, §6.1. v1.3: el motion quedó aprobado y cada `.mov` trae su WAV al lado;
> v1.2: el sonido quedó aprobado, versión B; se monta desde `b/`)
> **Modulo:** Creative · Glitch, magazine semanal de Efeonce (sub-línea de «La órbita») · video y motion
> **Ruta en portal:** no aplica — los gráficos se entregan como archivos de video en OneDrive y se montan en Premiere Pro o After Effects
> **Documentacion relacionada:** [Documentación funcional](../../documentation/creative/linea-grafica-glitch.md) · [Norma de la sub-línea](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md) · [Componer piezas de Glitch](./componer-piezas-glitch.md) · [Producir el motion, el sonido y la música de Glitch](./producir-motion-glitch.md) (quien corre el taller) · [ADR del repo taller](../../architecture/EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1.md)

> **⚠️ Todo lo que explica este manual es SÓLO para Glitch.** Ninguno de estos gráficos, ni la transición de la
> manzana en bytes, se usa en piezas de Efeonce ni de clientes. **La transición de la manzana en bytes es exclusiva de
> Glitch.** Si estás editando un video de Efeonce, este manual no aplica.

## Para qué sirve

Explica cómo montar sobre la grabación del host los gráficos animados de Glitch: la **apertura**, la **tarjeta final**,
el **kit de gráficos** (cabecera, rótulos, tarjetas de noticia, imagen de la fuente, Glitch Drop y llamado a la acción)
y la **transición entre escenas** de la manzana en bytes, en sus dos formatos: **reel** vertical (1080 × 1920) y
**vlog** horizontal (1920 × 1080).

Está escrito para la persona que edita en **Premiere Pro** o **After Effects**. No necesitas tocar código: los
gráficos llegan hechos y tú los ubicas en la línea de tiempo.

**Estado:** el motion que describe este manual está **aprobado** (2026-09-27; el operador: «Si, el tuyo también está
aprobado»): apertura y tarjeta final v2, kit de gráficos, transición de bytes entre piezas y transición entre escenas.
El **sonido** también está aprobado (versión B, 2026-09-27; sección 6), y la **música** (tema B y cama post-punk bajo la
noticia, 2026-09-27; sección 6.1), y desde ese mismo día cada entrega trae la música junto a su pieza, con el
**pre-roll** de la intro. De la música sólo falta probar la mezcla con la voz real del host. Siguen pendientes la prueba con los editores
en una edición real, la cadencia de grabación, el estilo de subtítulos, a qué piezas se aplica la transición de bytes
y los textos reales de la #17: no publiques un video con textos entre corchetes.

## Antes de empezar

- **Confirma que el video es de Glitch.** Si no, no uses nada de esto.
- **Dónde están los archivos:** en OneDrive, `Alineación › 5. Contenidos › 09. Glitch › Motion › piloto` (la carpeta
  conserva su nombre, pero su contenido está aprobado).

  | Carpeta | Qué tiene |
  |---|---|
  | `piloto/` (la raíz) | apertura y tarjeta final **v1**, la versión más sencilla |
  | `v2/` | apertura y tarjeta final **v2**, «más punch» (la **aprobada**), más el **pre-roll** de la intro y la música de la intro y la salida (ver [6.1](#61--montar-la-música)) |
  | `v2/sin-musica/` | las entregas anteriores, **sin música**, con su `LEEME`. Úsalas sólo si te piden un video sin música |
  | `kit/reel/` y `kit/vlog/` | el kit de gráficos que van encima de la toma, uno por formato, más la cama y la cortina de música (`glitch-kit-*-cama.wav`, `glitch-kit-*-cortina.wav`) |
  | `kit-transicion-bytes/reel/` y `kit-transicion-bytes/vlog/` | el kit con la entrada y salida de la manzana en bytes en la tarjeta y el Drop (**aprobada**; falta decidir a qué piezas se aplica) |
  | `transiciones/reel/` y `transiciones/vlog/` | la transición entre escenas (máscara + capa), con su `LEEME.txt` |
  | `transiciones/heroe/reel/` y `transiciones/heroe/vlog/` | la versión héroe de la transición, hecha para un corte puntual |
  | `sonido-propuesta/` | el **histórico** de la decisión del sonido (`b/` la aprobada, `a/` la descartada). No lo necesitas para montar: cada `.mov` ya trae su WAV |

  **Qué bajar para una edición:** `v2/` (pre-roll, apertura, tarjeta final y la música de la intro y la salida), la
  carpeta de tu formato en `kit/` (gráficos con sus WAV, la cama y la cortina, y el animatic de guía) y, si vas a usar
  transiciones entre escenas, la carpeta de tu formato en `transiciones/` (y `kit-transicion-bytes/` si la tarjeta o el
  Drop llevan la manzana en bytes).

- **Formato de los archivos:** video **ProRes 4444 con canal alfa** (`.mov`), a **30 cuadros por segundo** y **sin
  audio**. **Cada `.mov` trae al lado su WAV con el mismo nombre** (el sonido aprobado, versión B) y las vistas
  previas ya traen el sonido: ver [Montar el sonido](#6--montar-el-sonido). Premiere Pro y After Effects los abren directo, con el fondo transparente.
  La excepción es el **pre-roll** de la intro (`glitch-preroll-*.mov`): es **opaco**, con fondo navy, porque va antes de
  la apertura y no encima de una toma.
- **Arma la secuencia a 30 fps** y del tamaño del formato: 1080 × 1920 para el reel, 1920 × 1080 para el vlog.
- **Los `.mp4` que empiezan con `demo_`** (en `transiciones/`) son sólo para mirar cómo se ve cada transición. No van en
  la línea de tiempo.
- **El animatic** (uno por formato; con la música dura 48,4 s) muestra el orden y el momento de cada pieza sobre la
  toma, y ya trae mezclados el sonido y la música. Úsalo de guía para ubicar el kit. Está en `kit/reel/animatic_reel.mp4` y `kit/vlog/animatic_vlog.mp4`.
- **Los textos vienen de un archivo de edición**, no del video: si algo está mal escrito, no lo corrijas en Premiere;
  pídelo (ver [Cambiar un texto](#cambiar-un-texto)).
- **Los textos del ejemplo van entre corchetes** (por ejemplo, un titular de muestra): son de relleno hasta que lleguen
  los textos reales de la edición #17. No publiques un video con corchetes.

## Paso a paso

### 0 · Mapa de la edición (el orden en la línea de tiempo)

Antes de los detalles, este es el orden completo de una edición con música, de principio a fin. El animatic
(`kit/<formato>/animatic_<formato>.mp4`) lo muestra ya montado sobre una toma de prueba: úsalo de guía.

| Momento | Video (pistas de arriba) | Audio |
|---|---|---|
| Intro | `glitch-preroll-*.mov` (3,2 s, opaco) y, pegada a él, `glitch-apertura-*.mov` (4 s) | `glitch-intro-*.wav` desde el primer cuadro del pre-roll (cubre los dos) |
| Noticia 1 | `cabecera-1` y su PNG `_fijo` estirado; `lower-third-host` en la primera aparición del host (sólo esa vez); `noticia-1`; `fuente-1` si la noticia trae imagen | cada WAV al lado de su `.mov`; la **cama** entra con la cabecera, en bucle, 15 dB bajo la voz y con ducking |
| Paso a la noticia 2 | — | la **cortina** empieza 1,6 s antes de `cabecera-2` y corta la cama |
| Noticia 2 | `cabecera-2` y su `_fijo`; `noticia-2`; `fuente-2` si trae imagen | cama bajo el relato |
| Glitch Drop (después de la noticia que dice el archivo de edición; en el ejemplo, la 2) | `drop` | su WAV; **sin cama**: el Drop la corta |
| Paso a la noticia 3 | — | la cortina empieza 1,6 s antes de `cabecera-3` |
| Noticia 3 | `cabecera-3` y su `_fijo`; `lower-third-invitado` si hay invitado (su primera aparición); `noticia-3`; `fuente-3` si trae imagen | cama bajo el relato |
| Fin de las noticias | `cabecera-salida` y, enseguida, `cta` (el cierre sobre el host) | sus WAV. La norma dice que la cama no va bajo el host fuera de las noticias (tampoco bajo este cierre), pero el animatic la deja sonar hasta la tarjeta final: confirma con el operador `[verificar]` y, mientras tanto, sigue la norma |
| Tarjeta final | `glitch-cierre-*.mov` (3 s) | `glitch-salida-*.wav` en el mismo cuadro; **sin cama** |

El orden de los momentos sale del animatic del taller; en tu edición, la duración de cada noticia la pone el relato del
host. El detalle de cada fila está en las secciones que siguen: 1 (intro y tarjeta final), 2 (kit), 3 a 5
(transiciones entre escenas), 6 (sonido) y 6.1 (música).

### 1 · Apertura (4 s) y tarjeta final (3 s)

La **apertura** dura 4 s (120 cuadros). Empieza con fondo navy y los tres puntos que se escriben; el tercero se rompe
en bytes, los bytes arman la manzana, aparece «El micrófono se abre», el logo de Glitch y el número de la edición, y
**termina transparente**: debajo aparece tu toma.

La **tarjeta final** dura 3 s (90 cuadros). **Entra desde transparente**, muestra «se cierra.», «el #18 sale el
lunes.», el botón («Sigue a Glitch» en el reel; «Las otras noticias, en el blog de Glitch» en el vlog) y la firma de
Efeonce, y termina con la manzana que se deshace en bytes y el tercer punto que vuelve.

1. **Con música (lo normal):** antes de la apertura va el **pre-roll** (`glitch-preroll-*.mov`, 3,2 s, 96 cuadros,
   **opaco** con fondo navy): los tres puntos aparecen, laten al ritmo y el tercero tartamudea. Ponlo al inicio de la
   secuencia y la **apertura pegada a él**, desde el segundo 3,2, sin recortar ninguno de los dos: el último cuadro del
   pre-roll es idéntico al primero de la apertura, así que el paso no se ve. El audio de los dos es
   `glitch-intro-*.wav` (ver [6.1](#61--montar-la-música)). Sin música, la apertura va al inicio, sin pre-roll.
2. Pon la **apertura** en la pista de arriba, encima de la primera toma: termina transparente y deja ver al host.
3. Pon la **tarjeta final** al final, encima de la última toma, con `glitch-salida-*.wav` en el mismo cuadro.
4. **Bucle del reel:** el último cuadro de la tarjeta final es idéntico al primer cuadro de la apertura. Si el reel
   termina con la tarjeta final y empieza con la apertura, al repetirse empalma sin salto. No recortes el último cuadro.
   Con el pre-roll al comienzo, el reel empieza con el pre-roll y no con la apertura: si ese reel se publica en bucle,
   confirma con el operador si abre con el pre-roll o directo con la apertura `[verificar]`.
4. **Cuadro de sincronía:** el golpe principal de la apertura es el **cuadro 48** (1,6 s), cuando la manzana cae con
   su onda. Es el cuadro que manda en el sonido y en la música: ahí cae el único golpe grave de la apertura.
5. **Golpes** (el sonido aprobado cae en estos cuadros; ver [Montar el sonido](#6--montar-el-sonido)):

   | Pieza | Cuadro | Segundo | Qué pasa |
   |---|---|---|---|
   | Apertura | 24 | 0,8 s | el tercer punto se rompe en bytes |
   | Apertura | 48 | 1,6 s | la manzana cae (cuadro de sincronía) |
   | Apertura | 69 | 2,3 s | «se abre» entra de golpe |
   | Tarjeta final | 6 | 0,2 s | «se cierra.» entra de golpe |
   | Tarjeta final | 57 | 1,9 s | corte con falla |
   | Tarjeta final | 74 | ≈2,5 s | vuelve el tercer punto con un destello |

6. **Usa la v2** («más punch»): es la **aprobada** (2026-09-27). La **v1** (raíz de `piloto/`) queda como alternativa
   más sencilla.

### 2 · El kit de gráficos (encima de la toma del host)

Cada archivo del kit es un **cuadro completo con fondo transparente** y el gráfico **ya ubicado en su zona**. Por eso:

- **Suéltalo en la posición 0,0, sin moverlo ni escalarlo.** Si lo mueves, puede quedar sobre la cara del host o
  sobre los botones de la aplicación.
- Ponlo en una pista de video **encima** de la toma.
- **Su WAV va al lado:** cada `.mov` del kit trae un WAV con el mismo nombre (por ejemplo
  `glitch-kit-reel-cabecera-1.wav`); suéltalo en una pista de audio en el mismo cuadro en que empieza su `.mov` (ver
  [6](#6--montar-el-sonido)). En la misma carpeta están la cama y la cortina de la música (ver [6.1](#61--montar-la-música)).

| Pieza | Dura | Dónde y cuándo va |
|---|---|---|
| `cabecera-1` | 2 s | al empezar la noticia 1: «NOTICIA 1 / 3» y el logo de Glitch entran y se llena el primer segmento |
| `cabecera-2` y `cabecera-3` | 1,2 s | al pasar a la noticia 2 y a la 3: el número cambia con una falla y se llena el segmento |
| PNG `_fijo` de cada cabecera | lo que haga falta | **sostiene la cabecera quieta** mientras dura la noticia: ponlo justo después de la cabecera animada y estíralo hasta el cambio de noticia |
| `cabecera-salida` | 0,4 s | al terminar la última noticia: la cabecera se va con un corte con falla |
| `lower-third-host` | 5 s | rótulo del host («AL AIRE · GLITCH #17», nombre y cargo). **Sólo la primera vez que aparece el host** |
| `lower-third-invitado` | 5 s | rótulo del invitado. **Sólo si hay invitado**, y la primera vez que aparece |
| `noticia-1`, `noticia-2`, `noticia-3` | 5 s | tarjeta de la noticia: sección, titular y medio. Al presentar cada noticia |
| `fuente-1`, `fuente-2`, `fuente-3` | 5 s | plano dividido con la foto de la noticia y su crédito. **Sólo si la noticia trae imagen** |
| `drop` | 4 s (4,5 s con la versión en bytes) | «GLITCH DROP»: la opinión del host sobre la noticia. En el vlog es pantalla completa |
| `cta` | 4 s | «el #18 sale el lunes.» y el botón, antes de la tarjeta final |

**Plano dividido (`fuente-N`):** la foto de la noticia ocupa una parte del cuadro, así que **reencuadra la toma del
host** para que su cara quede libre:

- **Reel:** baja la toma para que la cabeza del host quede cerca de la altura 1050.
- **Vlog:** corre al host hacia la derecha.

**La cara del host nunca se tapa.** Si un gráfico cae sobre la cara, no lo muevas: revisa el encuadre de la toma o avisa.

**Zonas de referencia** (sólo para revisar; los archivos ya vienen ubicados):

| Formato | Dónde va cada cosa |
|---|---|
| Reel | nada en la franja de la aplicación arriba (0–220) ni abajo (desde 1500), nada desde x 940 (botones); cabecera ≈ y 250, rótulo ≈ y 1150, tarjeta ≈ y 1300, Drop ≈ y 1150, cierre ≈ y 1250 |
| Vlog | cabecera ≈ y 60 (x 72), rótulo ≈ y 818, tarjeta ≈ y 776 (1140 de ancho), cierre ≈ y 872 |

**Kit con la manzana en bytes (aprobado el 2026-09-27):** en `kit-transicion-bytes/` están la tarjeta y el Drop con otra entrada: la
manzana nace en la esquina de la pieza, se rompe en bytes que barren el rectángulo y forman la pieza; a la salida la
pieza vuelve a la manzana y la manzana se va. La recomendación es usarla **sólo en tarjetas y Drop**; la cabecera y el
rótulo conservan su entrada propia. Falta que el operador decida a qué piezas se aplica: mientras tanto, úsala sólo en
tarjetas y Drop.

### 3 · Transición entre escenas en Premiere Pro

La transición entre escenas viene en **dos archivos** con la misma grilla y los mismos tiempos:

- **Máscara** (`…-mascara.mov`): bytes blancos que llenan el cuadro en barrido. Sirve para recortar la escena B.
- **Capa** (`…-capa.mov`): la manzana en el punto de origen y los destellos verde, gris y blanco en el borde del barrido.

Hay tres **orígenes** (centro, izquierda y **marca**, que sale desde donde vive el logo de Glitch) y dos
**duraciones**: rápida (0,5 s) y normal (0,8 s). Mira los `demo_` para elegir.

**Antes de usarla, revisa la regla de rostros** (más abajo): nunca hacia ni desde la toma del host a cámara.

Montaje, con A = la escena que sale y B = la escena que entra:

1. Pon **A** en **V1**.
2. Pon **B** en **V2**, empezando justo donde empieza la transición.
3. Pon la **máscara** en **V3**, alineada con el inicio de B, y **apaga el ojo de la pista V3** (que no se vea).
4. Selecciona **B**, busca el efecto **Track Matte Key** y aplícaselo.
5. En los controles del efecto: **Matte: Video 3** y **Composite using: Matte Alpha**.
6. **Corta B justo donde termina la máscara** y **quítale el efecto al tramo que sigue** (desde ahí B se ve completa).
7. Pon la **capa** en **V4**, alineada con la máscara.
8. Reproduce: A debe verse hasta que los bytes la cubren, B aparece a través de los bytes, y la manzana y los destellos
   quedan encima.

### 4 · Transición entre escenas en After Effects

1. Pon la **máscara** en la capa justo **encima de B**.
2. En la capa **B**, en la columna Track Matte, elige **Alpha Matte** con la máscara como mate.
3. Pon la **capa** (manzana y destellos) **arriba de todo**.
4. A queda debajo de B, como siempre.

### 5 · Versión héroe de la transición (para un corte especial)

La versión **héroe** dura 1,2 s (36 cuadros) y es **opaca** (no tiene transparencia): los píxeles de la escena A se
desprenden en bytes, vuelan y se vuelven a armar como la escena B, con la manzana en el origen al inicio. Se hace **a
medida para un corte**, por eso no está en el kit.

**Cómo pedirla:** avísale al operador o al agente que produce el motion, con:

- el **archivo de la escena A** y el **segundo exacto** del corte;
- el **archivo de la escena B** y el **segundo exacto** donde entra;
- el **origen** (centro, izquierda o marca);
- los **formatos** que necesitas (reel, vlog o los dos).

Te llega renderizada en `transiciones/heroe/reel/` o `transiciones/heroe/vlog/`. **Insértala entre A y B:** A hasta
el segundo del corte, la héroe, y B desde el segundo que pediste. El primer cuadro de la héroe es el cuadro de A en
ese segundo y el último es el cuadro de B en el suyo: termina A justo antes de ese cuadro y empieza B justo después,
para no repetir un cuadro.

La misma regla de rostros aplica: no la pidas para un corte hacia o desde la toma del host a cámara.

### 6 · Montar el sonido

> **⚠️ Sólo para Glitch.** Este sonido **no es de Efeonce**: no lo uses en videos de Efeonce ni de clientes. Está
> **aprobado en su versión B** («más punch»), el 2026-09-27: el operador dijo «La b me encanta más. Sus sonidos están
> aprobados». La **A** (contenida) quedó descartada: no la uses.

**Dónde están los archivos:** **junto a cada `.mov`**, en las mismas carpetas del motion (`kit/`,
`kit-transicion-bytes/`, `transiciones/`, `transiciones/heroe/`): cada gráfico trae al lado su WAV con el mismo nombre,
ya en la versión B. Es la fuente que usas al editar. La excepción son la apertura y la tarjeta final en las entregas con
música: esas suenan con la intro y la salida (paso 2 y [6.1](#61--montar-la-música)). Los mismos archivos aprobados
están también en la página de Glitch de AXIS, sección [Sonido](https://axis.efeonce.org/references/glitch/#sonido).

La carpeta `Motion › piloto › sonido-propuesta` es el **histórico de la decisión** (las dos propuestas que escuchó el
operador). Sirve para consultar, pero no la necesitas para montar:

| Carpeta | Qué tiene |
|---|---|
| `b/` | **la versión aprobada.** Trae `apertura.wav`, `cierre.wav`, `bucle.wav`, `animatic.wav`, `kit/` (un WAV por gráfico del kit) y `transiciones/reel/` y `transiciones/vlog/` |
| `a/` | la alternativa descartada, con la misma estructura. **No se usa** |
| `vista-previa/` | videos del motion con el sonido ya montado, para escuchar cómo queda. No van en la línea de tiempo |
| `LEEME.txt` | resumen de la carpeta |

Los WAV tienen el **mismo nombre y la misma duración** que su `.mov`. El mismo audio sirve para reel y vlog, salvo las
transiciones entre escenas, que tienen una pista por formato.

1. **Usa los WAV que vienen junto a cada `.mov`** (son la versión B). Si alguna vez tomas uno de `sonido-propuesta/`,
   que sea sólo de `b/`: nunca de `a/`.
2. **Suelta cada WAV en 0 junto a su `.mov`**: en una pista de audio, empezando en el mismo cuadro exacto en que empieza
   el gráfico. Cada pieza del kit va con su WAV de `kit/`. **La apertura y la tarjeta final dependen de si el video
   lleva música** (lo normal desde el 2026-09-27):
   - **Con música:** la apertura va con `glitch-intro-*.wav` y la tarjeta final con `glitch-salida-*.wav` (ver
     [6.1](#61--montar-la-música)). **No uses `apertura.wav` ni `cierre.wav`**: la intro y la salida ya los traen
     mezclados, y sumarlos haría sonar todo doble. Por eso las entregas con música ya no los incluyen.
   - **Sin música** (sólo si te lo piden; entregas en `v2/sin-musica/`): la apertura con `apertura.wav` y la tarjeta
     final con `cierre.wav`, como antes.
3. **Transiciones entre escenas:** usa la pista de tu formato (`transiciones/reel/` o `transiciones/vlog/`) con el mismo
   origen y la misma duración que la transición (por ejemplo `…-centro-rapida.wav`) y **alinéala al mismo inicio que la
   máscara y la capa**. La versión héroe tiene su pista `…-centro-heroe.wav`.
4. **Transición de bytes entre piezas** (aprobada, en tarjeta y Drop): usa el WAV que viene al lado de cada `.mov` en
   `kit-transicion-bytes/` (mismo nombre que su pieza; en `sonido-propuesta/b/kit/` se llaman `noticia-bytes.wav` y
   `drop-bytes.wav`).
5. **La voz del host va encima** y sin efectos: los sonidos del kit quedan debajo de la voz. **Bajo las noticias va la
   cama de música post-punk**, 15 dB bajo la voz y con ducking (ver [6.1 · Montar la música](#61--montar-la-música));
   hasta el 2026-09-27 la regla era voz sola, sin música. **Fuera de las noticias la voz del host sigue sola**: la cama
   no va bajo el cierre del host ni bajo ninguna otra toma suya que no sea el relato de una noticia.
6. Reproduce y revisa que cada golpe caiga con su movimiento (por ejemplo, la manzana de la apertura en el cuadro 48).

**Qué no hacer con el sonido:**

- No le pongas la falla (tartamudeos, bytes, sonido digital roto) **sobre la voz del host**, ni proceses su voz con ella.
- No pongas un sonido de transición **hacia o desde la toma del host**: ahí va corte seco, sin sonido de transición.
- No agregues **whooshes**, soplos ni subidas de tráiler: el corte de Glitch es silencio.
- No uses estos sonidos **fuera de Glitch** ni los mezcles con los sonidos de Efeonce.
- **No edites los WAV a mano** (recortar, estirar, cambiar volumen dentro del archivo): si algo no calza, pide un nuevo
  render del gráfico: su sonido sale con él, junto a cada `.mov`.

**Problemas comunes con el sonido:**

| Síntoma | Causa | Solución |
|---|---|---|
| El sonido llega antes o después del movimiento | el WAV no empieza en el mismo cuadro que su `.mov`, o la secuencia no está a 30 fps | revisa que el WAV empiece en el mismo cuadro que el `.mov` y que la secuencia esté a 30 fps |
| El sonido ya no calza aunque esté bien alineado | cambió el motion (tiempos de una pieza o de una transición) después de generar el sonido | pide un nuevo render del motion: el mismo comando entrega otra vez el WAV junto a cada `.mov`, con los tiempos nuevos |
| La transición no suena con el barrido | usaste la pista de otro formato, origen o duración, o no la alineaste con la máscara | usa la pista de tu formato con el mismo origen y duración, y alinéala al inicio de la máscara y la capa |
| Hay un silencio seco al final de la apertura | es a propósito: el corte de Glitch es silencio | no lo rellenes |
| La música de fondo suena delgada, «como de videojuego» | se le bajaron los medios con un ecualizador, o no es el archivo aprobado | quita la ecualización (el espacio para la voz lo da el ducking) y verifica el sha256 del archivo |
| La cama tapa la voz | está más alta que 15 dB bajo la voz o falta el ducking | déjala a −29 LUFS (video) o −31 LUFS (podcast) y aplica el ducking desde la voz |
| La cortina corta antes o después de la cabecera | no empieza 1,6 s antes de la cabecera siguiente | muévela para que su corte caiga en el cuadro en que entra la cabecera |
| La apertura o la tarjeta final suenan doble, o con eco | sumaste `apertura.wav` o `cierre.wav` además de la intro o la salida | quítalos: con música, `glitch-intro-*.wav` y `glitch-salida-*.wav` ya los traen |
| No encuentro `apertura.wav` ni `cierre.wav` en la entrega | es a propósito: las entregas con música no los traen | usa la intro y la salida; si te piden un video sin música, usa `v2/sin-musica/` |
| Se nota un salto al pasar del pre-roll a la apertura | la apertura no empieza justo cuando termina el pre-roll (3,2 s), o se recortó un cuadro | pon la apertura pegada al final del pre-roll, sin recortar ninguno de los dos: el último cuadro del pre-roll es igual al primero de la apertura |
| La música de la intro no calza con los puntos del pre-roll | el WAV de la intro no empieza en el mismo cuadro que el pre-roll | alinea el inicio de `glitch-intro-*.wav` con el primer cuadro de `glitch-preroll-*.mov` |
| Se oye la cama bajo el cierre del host o bajo el Drop | la pista de la cama sigue después de que termina el relato de la noticia | córtala con la cortina, el Drop o la tarjeta final; fuera de las noticias la voz del host va sola |
| La cama no suena igual en el animatic que en tu edición | el animatic no tiene voz: ahí la cama va fija a −13 dB, sin ducking | el animatic es sólo guía: en tu edición aplica el nivel y el ducking de [6.1](#61--montar-la-música) con la voz real |

#### 6.1 · Montar la música

> **⚠️ Sólo para Glitch.** La música **no es de Efeonce**: no la uses en videos de Efeonce ni de clientes. Está
> **aprobada** desde el 2026-09-27 (tema B completo y la cama post-punk bajo la noticia; el operador: «Post-punk
> definitivamente»). Va **junto con** los sonidos de arriba, no en su lugar.

**Dónde están los archivos:** **el taller ya entrega la música junto a cada pieza**, en las mismas carpetas de
OneDrive del motion. No tienes que descargar nada aparte:

| Archivo | Carpeta | Qué es |
|---|---|---|
| `glitch-preroll-reel.mov` · `glitch-preroll-vlog.mov` (3,2 s) | `v2/` | el **pre-roll** de la intro: video opaco (fondo navy) con los tres puntos, que va **antes** de la apertura |
| `glitch-intro-reel.wav` · `glitch-intro-vlog.wav` (7,2 s) | `v2/` | la intro: la banda del pre-roll y, a continuación, la apertura con la banda (**ya trae montado** el sonido de la apertura) |
| `glitch-salida-reel.wav` · `glitch-salida-vlog.wav` (3 s) | `v2/` | la salida, con la tarjeta final (**ya trae montado** el sonido del cierre) |
| `glitch-kit-reel-cortina.wav` · `glitch-kit-vlog-cortina.wav` (2 s) | `kit/reel/` · `kit/vlog/` | la cortina entre noticias; corta en seco en 1,6 s |
| `glitch-kit-reel-cama.wav` · `glitch-kit-vlog-cama.wav` (19,2 s) | `kit/reel/` · `kit/vlog/` | la cama post-punk que va en bucle bajo cada noticia |
| `glitch-intro-podcast.wav` (13,6 s) · `glitch-salida-podcast.wav` (7 s) · `glitch-cortina-podcast.wav` (2 s) | `v2/` | las versiones para **podcast** (más largas en la intro y la salida, a −16 LUFS). La cama del podcast es la misma |

Las versiones de video (reel y vlog) están a −14 LUFS; las de podcast, a −16 LUFS. Con música, las entregas **ya no
traen `apertura.wav` ni `cierre.wav`**: la intro y la salida los reemplazan (si los sumaras, sonarían doble). Las
entregas anteriores, **sin música**, quedaron en `v2/sin-musica/`, con un `LEEME`; úsalas sólo si te piden un video sin
música.

Todos estos archivos son copias exactas de los másteres aprobados, que también están en la página de Glitch en AXIS,
sección [Música](https://axis.efeonce.org/references/glitch/#musica), y en el almacenamiento público
`https://storage.googleapis.com/efeonce-group-axis-public-media/glitch/music/v1/` (carpeta `masters/`). El taller los
verifica con su huella (sha256) antes de entregarlos y nunca los vuelve a generar. Cada archivo de OneDrive es copia
byte a byte de un máster: `glitch-intro-reel.wav` y `glitch-intro-vlog.wav` = `glitch-intro-vlog.wav` (el reel usa los
másteres de vlog), `glitch-salida-reel.wav` y `glitch-salida-vlog.wav` = `glitch-salida-vlog.wav`,
`glitch-kit-*-cortina.wav` = `glitch-cortina-vlog.wav` y `glitch-kit-*-cama.wav` = `glitch-cama-bucle.wav`; los de
podcast conservan su nombre. Por eso su sha256 es el de ese máster. Si alguna vez necesitas bajar uno directo,
compruébalo tú:

1. **Descarga el archivo** desde su dirección, por ejemplo
   `curl -O https://storage.googleapis.com/efeonce-group-axis-public-media/glitch/music/v1/masters/glitch-cama-bucle.wav`.
2. **Verifica que sea el aprobado:** en Mac, en Terminal, `shasum -a 256 glitch-cama-bucle.wav`. El resultado tiene que
   ser idéntico al sha256 de ese archivo en la tabla de la
   [norma §13.12](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md#1312-música--sólo-glitch-aprobada-tema-b--cama-post-punk)
   (o en el `index.json` de la misma carpeta). Si no coincide, no lo uses y avisa al operador.

**Montaje:**

1. **Intro con su pre-roll (video):** al comienzo de la secuencia, en la pista de video de arriba, pon primero
   `glitch-preroll-*.mov` (3,2 s, 96 cuadros) y, **pegada a él**, la apertura (`glitch-apertura-*.mov`), que empieza en
   el segundo 3,2. En una pista de audio, suelta `glitch-intro-*.wav` **en el mismo cuadro en que empieza el pre-roll**:
   dura 7,2 s, lo mismo que el pre-roll más la apertura. En el pre-roll los tres puntos aparecen, laten uno tras otro
   al ritmo de las tres notas del bajo, se juntan en el tiempo fuerte y el tercero tartamudea en el último tiempo;
   luego la apertura sigue como siempre, con la banda entrando en el quiebre (f24) y la manzana (f48) como golpe
   fuerte. El último cuadro del pre-roll es igual al primero de la apertura: **no recortes ninguno de los dos**, así
   el paso no se nota. **No sumes `apertura.wav`.**
2. **Intro (podcast):** el podcast no lleva video; `glitch-intro-podcast.wav` va al comienzo del episodio y su banda
   dura más (9,6 s) antes de que suene la apertura.
3. **Cortina entre noticias:** empieza **1,6 s antes** de que entre la cabecera «NOTICIA n/3» siguiente, para que su
   corte en seco caiga justo cuando aparece la cabecera.
4. **Salida:** va con la tarjeta final, empezando en el mismo cuadro: la banda entra con «se cierra.», corta con la falla
   (1,9 s) y después sólo queda el cierre de la manzana. Ya trae el sonido del cierre montado: **no sumes aparte
   `cierre.wav`**.
5. **Cama bajo la noticia:** en una pista propia, empieza con la cabecera «NOTICIA n/3» (el archivo arranca en el tiempo
   fuerte) y **se repite en bucle** lo que dure el relato de la noticia (el bucle no tiene costura). **La corta la
   cortina** (o el Drop, o la tarjeta final).
6. **Dónde NO va la cama:** sólo suena mientras se relata una noticia, porque marca «el tiempo de la noticia». **No la
   pongas bajo el cierre del host** ni bajo ninguna otra toma del host fuera de las noticias (ahí la voz del host va
   sola), ni bajo el Drop (la manzana es el único grave) ni bajo la tarjeta final (tiene su propia salida).
7. **Nivel de la cama: 15 dB bajo la voz.** Con la voz a −14 LUFS (video), la cama queda a −29 LUFS; con la voz a
   −16 LUFS (podcast), a −31 LUFS.
8. **El ducking lo pones tú.** El animatic del taller no tiene voz, así que ahí la cama va fija (a −13 dB) y sin
   ducking: sirve para ver dónde va, no para copiar su nivel. En tu edición, a la pista de la cama ponle un compresor
   con entrada sidechain alimentada por la pista de voz, con **umbral 0,05 (≈ −26 dBFS), razón 3:1, ataque 15 ms y
   relajación 350 ms**. La cama baja cuando alguien habla y sube un poco en las pausas.
   **Cómo hacerlo en Premiere `[verificar]`:** la norma fija sólo estos valores (compresión por sidechain desde la voz,
   sin recortar medios); el efecto exacto de Premiere o After Effects y cómo enrutar la voz como sidechain todavía no
   están documentados. Se validan en la prueba de los editores con una edición real: si lo resuelves con otro método
   (por ejemplo, la atenuación automática de Premiere), anótalo y avísale al operador para que quede como método
   oficial. Lo que no cambia: la cama queda 15 dB bajo la voz y conserva sus medios.
9. **No ecualices la cama para bajarle los medios** («para que la voz se escuche mejor»): eso es justo lo que la hace
   sonar «arcade». El espacio para la voz lo da el ducking.
10. Los sonidos del kit (cabecera, lower third, noticia…) van **encima, a su nivel**, sin bajarlos.
11. Escucha una noticia completa con voz, cama y cortina, y revisa que la cortina corte cuando entra la cabecera
    siguiente.

**Si te piden el video sin música:** usa las entregas de `v2/sin-musica/` y monta el sonido como se explica en la
sección 6, con `apertura.wav` y `cierre.wav`. Quien produce el motion puede generar esa entrega con la opción
`--music off` del taller.

**Podcast (sólo audio):** el podcast no tiene motion propio. Arma el episodio con `glitch-intro-podcast.wav` al
comienzo (9,6 s de banda y después la apertura), `glitch-cortina-podcast.wav` entre noticias (su corte en seco, a 1,6 s,
cae justo donde empieza la noticia siguiente), la cama (`glitch-kit-*-cama.wav`, el mismo máster) bajo el relato de cada noticia a −31 LUFS con la voz a
−16 LUFS y el mismo ducking, y `glitch-salida-podcast.wav` al final (7 s). Las reglas de la cama son las mismas que en
el video.

**Pendiente:** todavía no se probó la mezcla con la voz real del host en una edición real. Si al hacerlo algo no suena
bien (la cama tapa la voz o se pierde), avisa al operador con el segundo exacto; no cambies los archivos.

La demo `web/glitch-noticia-con-cama-16x9.mp4` muestra cómo queda una noticia con la cama; su voz es **sintética y
provisional**: en el video real va la voz del host.

### Cambiar un texto

Los textos (número de edición, nombre y cargo del host, invitado, titulares, medios, fotos, frases del Drop, llamado a
la acción) **salen de un archivo de edición** y los gráficos se vuelven a generar desde ese archivo.

1. **No edites los `.mov` en Premiere ni en After Effects.** Si tapas o reescribes un texto encima, se rompe el diseño.
2. **Pide el cambio** al operador o al agente que produce el motion: di qué pieza, qué texto y el texto correcto.
3. Se corrige el archivo de edición y se vuelve a generar: **una pieza tarda segundos; el kit completo, unos 4 minutos**.
4. Reemplaza el archivo en tu proyecto por el nuevo (mismo nombre, misma carpeta) y revisa el cambio. Su WAV también
   llega de nuevo, con el mismo nombre: reemplázalo junto con el `.mov`.

Quien corre el taller sigue [Producir el motion, el sonido y la música de Glitch](./producir-motion-glitch.md).

## Qué significan los estados

| Estado | Qué significa |
|---|---|
| **Piloto** | primera versión hecha para probar el flujo y el montaje. Sirve para ensayar en Premiere o After Effects |
| **Propuesta** | versión que se le muestra al operador para decidir. Se puede montar en pruebas, **no se publica como final** |
| **Aprobado** | el operador la aprobó y se usa como pieza final. **Desde el 2026-09-27 el motion de este manual está aprobado** (apertura y tarjeta final v2, kit, transición de bytes entre piezas y transición entre escenas), y el sonido también (versión B), igual que la música (tema B y cama post-punk) |

Aplicados a pedido del operador y aprobados: más punch (v2), la órbita real en el rótulo del host, la transición de
bytes entre piezas y entre escenas. Siguen pendientes de decisión: la cadencia de grabación (hoy 30 fps), la prueba de
los editores en Premiere y After Effects en una edición real, el ritmo ajustable, dónde se usa la transición de bytes
(se recomienda sólo en tarjetas y Drop), el estilo de subtítulos, los textos reales de la #17 y cualquier excepción de
rostros (por defecto, la falla nunca va sobre una cara). El sonido ya está decidido: **versión B aprobada** (2026-09-27); la música también (tema B y cama post-punk, 2026-09-27),
con el pre-roll de la intro que eligió el operador. De la música sólo falta probar la mezcla con la voz real del host.

## Qué no hacer

- **No uses nada de esto en un video de Efeonce ni de un cliente.** La transición de la manzana en bytes es exclusiva
  de Glitch.
- No muevas ni escales las piezas del kit: se sueltan en 0,0.
- No pongas un gráfico ni una transición de bytes **sobre la cara** del host o de cualquier persona.
- No uses la transición de bytes **hacia o desde la toma del host a cámara**: ahí va un corte seco o la transición de
  tarjeta. La excepción sólo vale si el operador la aprueba.
- No edites, tapes ni reescribas los textos de los `.mov`: pide el cambio.
- No le agregues una falla ni efectos a la **firma de Efeonce**: la firma nunca se rompe, sólo se corta.
- No pongas dos manzanas en pantalla al mismo tiempo: la manzana del Drop es la única de su momento.
- No repitas el rótulo del host cada vez que aparece: va sólo la primera vez.
- No uses los `demo_*.mp4` en la línea de tiempo: son sólo para mirar.
- No publiques un video con textos entre corchetes ni con piezas en propuesta sin aprobación (la v1 queda como
  alternativa sin aprobar; la versión A del sonido no se usa).
- No pongas la cama de música bajo el host fuera de las noticias (ni bajo su cierre), ni bajo el Drop ni bajo la tarjeta
  final.
- No sumes `apertura.wav` ni `cierre.wav` a un video con música: la intro y la salida ya los traen.
- No pongas la falla (tartamudeos, bytes, sonido roto) sobre la voz del host, ni whooshes ni sonido de transición hacia
  o desde la toma del host: ahí va corte seco, en silencio.
- No uses la versión A del sonido (`sonido-propuesta/a/`): está descartada.
- No recortes, estires, ecualices ni reemplaces la música, ni la regeneres con otra herramienta: si algo no calza, pide
  una nueva entrega.
- Si sumas una voz en off, que sea una persona con **español latinoamericano neutro**.

## Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| B desaparece después de la transición | el Track Matte Key sigue aplicado a B después de que termina la máscara | corta B donde termina la máscara y quítale el efecto al tramo siguiente |
| B no aparece durante la transición, o aparece entera de golpe | la máscara no está en la pista que dice el efecto, o está mal alineada | revisa que la máscara esté en V3, que el efecto diga «Matte: Video 3» y «Matte Alpha», y que empiece junto con B |
| Se ve la máscara blanca en pantalla | la pista de la máscara está visible | apaga el ojo de la pista V3 |
| Fondo negro en vez de transparente | estás usando un archivo que no es el `.mov` ProRes 4444 original (por ejemplo una copia convertida o un `demo_*.mp4`), o el programa está ignorando el canal alfa al importar | vuelve a importar el `.mov` original desde OneDrive y revisa que el canal alfa no esté ignorado: en Premiere, clic derecho en el clip → Modificar → Interpretar material de archivo → Canal alfa (sin «Ignorar canal alfa»); en After Effects, Interpretar material de archivo → Principal → Alfa |
| La pieza queda corrida, sobre la cara o sobre los botones | la moviste o la escalaste, o la secuencia no tiene el tamaño del formato | vuelve a la posición 0,0 y escala 100 %; confirma que la secuencia sea 1080 × 1920 (reel) o 1920 × 1080 (vlog) |
| Las animaciones se ven entrecortadas o cambian de duración | la secuencia no está a 30 fps (por ejemplo, la grabación vino a otra cadencia) | arma la secuencia a 30 fps; si la toma se grabó a otra cadencia, avisa al operador: la cadencia de grabación está pendiente de decisión. No estires los `.mov` |
| La cabecera desaparece a mitad de la noticia | falta el PNG `_fijo` después de la cabecera animada | pon el `_fijo` justo después y estíralo hasta el cambio de noticia |
| El reel da un salto al repetirse | se recortó el último cuadro de la tarjeta final o el primero de la apertura | deja ambas piezas completas: el último cuadro de la tarjeta es igual al primero de la apertura |
| Un texto está mal escrito o dice `[…]` | es un texto de ejemplo o un error en el archivo de edición | pide la corrección; no lo arregles encima del video |
| No hay `fuente-N` para una noticia | esa noticia no trae imagen | es lo esperado: esa noticia va sin plano dividido |
| Se ve un fondo navy (no transparente) al comienzo del video | es el pre-roll de la intro: es opaco a propósito | déjalo; va antes de la apertura, no encima de una toma |
| El kit de la carpeta no coincide con los textos de tu edición | la entrega es de otra edición o del ejemplo | pide la entrega de tu edición; el nombre de la corrida está en el manifiesto del taller |

## Referencias técnicas

- Norma de la sub-línea (sección de video y motion): [`GLITCH_GRAPHIC_LINE_V1.md`](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md)
- Sonido de Glitch (aprobado, versión B, sólo Glitch): [norma §13.11](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md#1311-sonido--sólo-glitch-aprobado-versión-b)
- Música de Glitch (aprobada, tema B + cama post-punk, sólo Glitch): [norma §13.12](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md#1312-música--sólo-glitch-aprobada-tema-b--cama-post-punk)
- Decisión de la línea: [`GLITCH_GRAPHIC_LINE_DECISION_V1.md`](../../architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md)
- Dónde se produce el motion (repo taller): [`EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1.md`](../../architecture/EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1.md) · código en `efeoncepro/efeonce-brand-workshop`, `tools/glitch-motion/`
- Trabajo en curso: [TASK-1924](../../tasks/to-do/TASK-1924-glitch-motion-overlays-hyperframes.md)
- Manual de las piezas estáticas: [Componer piezas de Glitch](./componer-piezas-glitch.md)
- Runbook de quien corre el taller (comandos, argumentos, verificaciones y entregas): [Producir el motion, el sonido y la música de Glitch](./producir-motion-glitch.md) · referencia normativa en la [norma §13.13](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md#1313-referencia-de-comandos-y-argumentos)
- AXIS: [/references/glitch/](https://axis.efeonce.org/references/glitch/) (secciones Motion, [Sonido](https://axis.efeonce.org/references/glitch/#sonido) y [Música](https://axis.efeonce.org/references/glitch/#musica))
- Música en el taller: `efeoncepro/efeonce-brand-workshop`, `tools/glitch-motion/README.md` §«Música (aprobada: tema B + cama post-punk)»
- Skill para agentes: `efeonce-graphic-line`, `references/glitch.md`

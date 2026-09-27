# Editar el video de Glitch con los gráficos animados — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.3
> **Creado:** 2026-09-27 por Claude
> **Ultima actualizacion:** 2026-09-27 por Claude (v1.3: el motion quedó aprobado y cada `.mov` trae su WAV al lado;
> v1.2: el sonido quedó aprobado, versión B; se monta desde `b/`)
> **Modulo:** Creative · Glitch, magazine semanal de Efeonce (sub-línea de «La órbita») · video y motion
> **Ruta en portal:** no aplica — los gráficos se entregan como archivos de video en OneDrive y se montan en Premiere Pro o After Effects
> **Documentacion relacionada:** [Documentación funcional](../../documentation/creative/linea-grafica-glitch.md) · [Norma de la sub-línea](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md) · [Componer piezas de Glitch](./componer-piezas-glitch.md) · [ADR del repo taller](../../architecture/EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1.md)

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
El **sonido** también está aprobado (versión B, 2026-09-27; sección 6). Siguen pendientes la prueba con los editores
en una edición real, la cadencia de grabación, el estilo de subtítulos, a qué piezas se aplica la transición de bytes
y los textos reales de la #17: no publiques un video con textos entre corchetes.

## Antes de empezar

- **Confirma que el video es de Glitch.** Si no, no uses nada de esto.
- **Dónde están los archivos:** en OneDrive, `Alineación › 5. Contenidos › 09. Glitch › Motion › piloto` (la carpeta
  conserva su nombre, pero su contenido está aprobado).

  | Carpeta | Qué tiene |
  |---|---|
  | `piloto/` (la raíz) | apertura y tarjeta final **v1**, la versión más sencilla |
  | `v2/` | apertura y tarjeta final **v2**, «más punch» (la **aprobada**) |
  | `kit/reel/` y `kit/vlog/` | el kit de gráficos que van encima de la toma, uno por formato |
  | `kit-transicion-bytes/reel/` y `kit-transicion-bytes/vlog/` | el kit con la entrada y salida de la manzana en bytes en la tarjeta y el Drop (**aprobada**; falta decidir a qué piezas se aplica) |
  | `transiciones/reel/` y `transiciones/vlog/` | la transición entre escenas (máscara + capa), con su `LEEME.txt` |
  | `transiciones/heroe/reel/` y `transiciones/heroe/vlog/` | la versión héroe de la transición, hecha para un corte puntual |

- **Formato de los archivos:** video **ProRes 4444 con canal alfa** (`.mov`), a **30 cuadros por segundo** y **sin
  audio**. **Cada `.mov` trae al lado su WAV con el mismo nombre** (el sonido aprobado, versión B) y las vistas
  previas ya traen el sonido: ver [Montar el sonido](#6--montar-el-sonido). Premiere Pro y After Effects los abren directo, con el fondo transparente.
- **Arma la secuencia a 30 fps** y del tamaño del formato: 1080 × 1920 para el reel, 1920 × 1080 para el vlog.
- **Los `.mp4` que empiezan con `demo_`** (en `transiciones/`) son sólo para mirar cómo se ve cada transición. No van en
  la línea de tiempo.
- **El animatic de 45 s** (uno por formato) muestra el orden y el momento de cada pieza sobre la toma. Úsalo de guía
  para ubicar el kit. Está en `kit/reel/animatic_reel.mp4` y `kit/vlog/animatic_vlog.mp4`.
- **Los textos vienen de un archivo de edición**, no del video: si algo está mal escrito, no lo corrijas en Premiere;
  pídelo (ver [Cambiar un texto](#cambiar-un-texto)).
- **Los textos del ejemplo van entre corchetes** (por ejemplo, un titular de muestra): son de relleno hasta que lleguen
  los textos reales de la edición #17. No publiques un video con corchetes.

## Paso a paso

### 1 · Apertura (4 s) y tarjeta final (3 s)

La **apertura** dura 4 s (120 cuadros). Empieza con fondo navy y los tres puntos que se escriben; el tercero se rompe
en bytes, los bytes arman la manzana, aparece «El micrófono se abre», el logo de Glitch y el número de la edición, y
**termina transparente**: debajo aparece tu toma.

La **tarjeta final** dura 3 s (90 cuadros). **Entra desde transparente**, muestra «se cierra.», «el #18 sale el
lunes.», el botón («Sigue a Glitch» en el reel; «Las otras noticias, en el blog de Glitch» en el vlog) y la firma de
Efeonce, y termina con la manzana que se deshace en bytes y el tercer punto que vuelve.

1. Pon la **apertura** en la pista de arriba, al inicio de la secuencia, encima de la primera toma.
2. Pon la **tarjeta final** al final, encima de la última toma.
3. **Bucle del reel:** el último cuadro de la tarjeta final es idéntico al primer cuadro de la apertura. Si el reel
   termina con la tarjeta final y empieza con la apertura, al repetirse empalma sin salto. No recortes el último cuadro.
4. **Cuadro de sincronía:** el golpe principal de la apertura es el **cuadro 48** (1,6 s), cuando la manzana cae con
   su onda. Si se suma sonido, ese es el cuadro que manda.
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

**Dónde están los archivos:** OneDrive `Alineación › 5. Contenidos › 09. Glitch › Motion › piloto › sonido-propuesta`
(la carpeta conserva su nombre, pero lo que hay en `b/` está aprobado). Además, cada `.mov` de las carpetas del motion
trae al lado su WAV con el mismo nombre. Los mismos archivos aprobados están también en
la página de Glitch de AXIS, sección [Sonido](https://axis.efeonce.org/references/glitch/#sonido).

| Carpeta | Qué tiene |
|---|---|
| `b/` | **la versión aprobada.** Trae `apertura.wav`, `cierre.wav`, `bucle.wav`, `animatic.wav`, `kit/` (un WAV por gráfico del kit) y `transiciones/reel/` y `transiciones/vlog/` |
| `a/` | la alternativa descartada, con la misma estructura. **No se usa** |
| `vista-previa/` | videos del motion con el sonido ya montado, para escuchar cómo queda. No van en la línea de tiempo |
| `LEEME.txt` | resumen de la carpeta |

Los WAV tienen el **mismo nombre y la misma duración** que su `.mov`. El mismo audio sirve para reel y vlog, salvo las
transiciones entre escenas, que tienen una pista por formato.

1. **Usa sólo los WAV de `b/`** para todo el video.
2. **Suelta cada WAV en 0 junto a su `.mov`**: en una pista de audio, empezando en el mismo cuadro exacto en que empieza
   el gráfico. La apertura con `apertura.wav`, la tarjeta final con `cierre.wav` y cada pieza del kit con su WAV de
   `kit/`.
3. **Transiciones entre escenas:** usa la pista de tu formato (`transiciones/reel/` o `transiciones/vlog/`) con el mismo
   origen y la misma duración que la transición (por ejemplo `…-centro-rapida.wav`) y **alinéala al mismo inicio que la
   máscara y la capa**. La versión héroe tiene su pista `…-centro-heroe.wav`.
4. **Transición de bytes entre piezas** (aprobada, en tarjeta y Drop): usa `noticia-bytes.wav` y `drop-bytes.wav` junto
   a la versión en bytes de esas piezas.
5. **La voz del host va encima** y sin efectos: los sonidos del kit quedan debajo de la voz. **Bajo las noticias va
   sólo la voz, sin música.**
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

### Cambiar un texto

Los textos (número de edición, nombre y cargo del host, invitado, titulares, medios, fotos, frases del Drop, llamado a
la acción) **salen de un archivo de edición** y los gráficos se vuelven a generar desde ese archivo.

1. **No edites los `.mov` en Premiere ni en After Effects.** Si tapas o reescribes un texto encima, se rompe el diseño.
2. **Pide el cambio** al operador o al agente que produce el motion: di qué pieza, qué texto y el texto correcto.
3. Se corrige el archivo de edición y se vuelve a generar: **una pieza tarda segundos; el kit completo, unos 4 minutos**.
4. Reemplaza el archivo en tu proyecto por el nuevo (mismo nombre, misma carpeta) y revisa el cambio.

## Qué significan los estados

| Estado | Qué significa |
|---|---|
| **Piloto** | primera versión hecha para probar el flujo y el montaje. Sirve para ensayar en Premiere o After Effects |
| **Propuesta** | versión que se le muestra al operador para decidir. Se puede montar en pruebas, **no se publica como final** |
| **Aprobado** | el operador la aprobó y se usa como pieza final. **Desde el 2026-09-27 el motion de este manual está aprobado** (apertura y tarjeta final v2, kit, transición de bytes entre piezas y transición entre escenas), y el sonido también (versión B) |

Aplicados a pedido del operador y aprobados: más punch (v2), la órbita real en el rótulo del host, la transición de
bytes entre piezas y entre escenas. Siguen pendientes de decisión: la cadencia de grabación (hoy 30 fps), la prueba de
los editores en Premiere y After Effects en una edición real, el ritmo ajustable, dónde se usa la transición de bytes
(se recomienda sólo en tarjetas y Drop), el estilo de subtítulos, los textos reales de la #17 y cualquier excepción de
rostros (por defecto, la falla nunca va sobre una cara). El sonido ya está decidido: **versión B aprobada** (2026-09-27).

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

## Referencias técnicas

- Norma de la sub-línea (sección de video y motion): [`GLITCH_GRAPHIC_LINE_V1.md`](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md)
- Sonido de Glitch (aprobado, versión B, sólo Glitch): [norma §13.11](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md#1311-sonido--sólo-glitch-aprobado-versión-b)
- Decisión de la línea: [`GLITCH_GRAPHIC_LINE_DECISION_V1.md`](../../architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md)
- Dónde se produce el motion (repo taller): [`EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1.md`](../../architecture/EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1.md) · código en `efeoncepro/efeonce-brand-workshop`, `tools/glitch-motion/`
- Trabajo en curso: [TASK-1924](../../tasks/to-do/TASK-1924-glitch-motion-overlays-hyperframes.md)
- Manual de las piezas estáticas y flujo para agentes: [Componer piezas de Glitch](./componer-piezas-glitch.md)
- AXIS: [/references/glitch/](https://axis.efeonce.org/references/glitch/) (sección Motion)
- Skill para agentes: `efeonce-graphic-line`, `references/glitch.md`

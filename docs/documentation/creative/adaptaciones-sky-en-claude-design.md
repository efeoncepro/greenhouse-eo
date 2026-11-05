# Adaptaciones SKY en Claude Design — Design System, canvas y despliegue de un KV

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.3
> **Creado:** 2026-11-04 por Claude
> **Ultima actualizacion:** 2026-11-05 por Claude (catálogo de formatos, story en video, fecha nueva del logo y pendientes con Daniela)
> **Documentacion tecnica:** [Referencia de la skill: canvas de SKY en Claude Design](../../../.claude/skills/efeonce-creative-workbench/references/sky-design-canvas.md) ·
> [Taxonomía técnica de formatos SKY](../../../.claude/skills/efeonce-creative-workbench/references/sky-format-catalog.md) ·
> [Scripts del despliegue BLACK](../../../.claude/skills/efeonce-creative-workbench/references/sky-black-pipeline.md)
> **Manual de uso:** [Adaptar un KV de SKY en Claude Design](../../manual-de-uso/creative/adaptar-kv-sky-en-claude-design.md)
> **Documentacion relacionada:** [Catálogo de formatos SKY](./catalogo-formatos-sky.md) ·
> [Creative Workbench — Design System Lab](./creative-workbench-lab.md)

## Qué es

Es la forma de trabajar las **adaptaciones creativas de SKY Airline** (servicio Performance) dentro de
**Claude Design**. Un KV (la pieza madre de una campaña) se convierte en todas las piezas que pide cada destino, cada
mercado y cada formato, y el equipo y el operador las revisan juntas en un solo lugar.

Tiene dos piezas:

| Pieza | Qué es | Dónde está |
|---|---|---|
| **Design System «SKY Airline — Performance»** | Las reglas visuales de SKY: colores, tipografía Metric, espaciados, componentes y guías desde «adaptar un KV» hasta «fotografía» | Artifact privado: <https://claude.ai/artifact/Rc3NFQNXvjDgkWsxrzSEei> |
| **Canvas «SKY CyberSky Perú — Adaptaciones»** | La mesa de trabajo: páginas con todas las piezas, sus plantillas y los comentarios del operador | Artifact privado: <https://claude.ai/artifact/QTy12G38oQYB1xrnZmkpee> |

El Design System nace de lo que ya existía: las 126 adaptaciones (37 composiciones) del pack SKY del Creative
Workbench. El canvas lleva una **copia** del Design System instalada, para que sus piezas no dependan de cambios
posteriores.

> Detalle técnico: [referencia de la skill](../../../.claude/skills/efeonce-creative-workbench/references/sky-design-canvas.md) ·
> [Creative Workbench Lab](./creative-workbench-lab.md)

## Formatos

Cada pieza tiene un formato con nombre, tamaño y uso propios: KV (1080×1350), post (1080×1350), popup (1080×1080),
story (1080×1920), GIF, MP4 con y sin audio, story en video, PMAX, HPH, banner TikTok, DAT y rutas foco. Qué es cada
uno, cuántos se hicieron, dónde quedaron, cómo se leen los nombres de archivo (`HM_<MERCADO>_KV_<TIPO>`) y qué siglas
no tienen un significado registrado está en el **[Catálogo de formatos SKY](./catalogo-formatos-sky.md)**.

> Detalle técnico: [taxonomía técnica de formatos](../../../.claude/skills/efeonce-creative-workbench/references/sky-format-catalog.md)

## Qué no es

- **No es la producción final.** El canvas sirve para ver, comentar y aprobar. Los archivos que se entregan (PDF, GIF,
  MP4, PNG) se renderizan en local con las mismas plantillas.
- **No publica nada.** Los dos artifacts son privados del operador; pautar o publicar es una decisión aparte.
- **No reemplaza el kit del cliente.** Los archivos de SKY en OneDrive son la fuente; se leen y nunca se modifican.
  Las piezas terminadas se entregan aparte, en una carpeta nueva junto al kit (ver
  [Entrega en OneDrive](#entrega-en-onedrive)).

## Adaptación por destino

Cuando una campaña se repite en muchos destinos, no se diseña pieza por pieza. Se hace **una plantilla por formato**
y una **tabla de datos** con cada destino (ciudad, precio, foto, legal). La plantilla lee el destino que se le pide y
arma la pieza.

En CyberSky Perú eso dio **66 piezas**: 22 destinos (16 nacionales y 6 internacionales) × 3 formatos (popup
1080×1080, post 1080×1350 y story 1080×1920). Corregir un dato en la tabla corrige todas las piezas de ese destino.

> Detalle técnico: [manual, paso 2](../../manual-de-uso/creative/adaptar-kv-sky-en-claude-design.md#2-generar-las-adaptaciones-por-destino)

### Las fotos de CyberSky

Cada destino lleva su propia foto: una selfie de viajeros sorprendidos por los precios, distinta por destino. Se
generaron 21 con IA (GPT Image) con autorización y clave del operador; Río usa la foto del KV original. Lo aprendido:

- **Encuadre:** tercio superior con cielo limpio para el lockup; rostros en el tercio inferior derecho.
- **Realismo:** poros, asimetrías, pelos sueltos y dientes naturales, sin filtro de belleza.
- **Lo que la IA hace sola si no se le dice:** un aro negro en las esquinas (el lente ojo de pez del celular), ojos
  saltones y pecas a todos. El prompt lo evita de forma explícita.
- **Luz:** dos recetas, hora azul y hora dorada, con desenfoque de fondo redondo.
- **Color común:** cada foto se acerca en color a la foto de referencia del KV, con intensidad parcial, para que la
  campaña se vea como una sola.

> Detalle técnico: [manual, problemas comunes](../../manual-de-uso/creative/adaptar-kv-sky-en-claude-design.md#problemas-comunes)

## El kit «Despliegue Base»

Para la campaña BLACK, SKY entregó un kit en OneDrive («SKY Campañas/2026/10_Noviembre/Despliegue Base») con el KV
en Illustrator, un SVG por mercado, banderas, logos, badges, referencias de animación y un audio. Antes de producir se
hace un **inventario** de todo el kit y se anotan sus reglas:

- **Fechas:** el kit decía del 25 al 29 de noviembre (con su versión en portugués e inglés). En la segunda ronda SKY
  la cambió a «del 25 de noviembre al 2 de diciembre» (ver [Cambios del cliente](#cambios-del-cliente-y-piezas-nuevas-segunda-ronda)).
- **Reglas por mercado:** cada país cambia la etiqueta de precio, la moneda, el badge y el verbo de acción. Por
  ejemplo, Chile dice «CON 00% DCTO.», Brasil «COM ATÉ 00% OFF», Estados Unidos «WITH UP TO 00% OFF», y Argentina y
  Uruguay usan el voseo del propio cliente («VOLÁ»). Perú agrega tipo de cambio y stock mínimo.
- **Sistema:** una sola tipografía (Metric, en cinco pesos) y una paleta de verde BLACK, morados, mentas, lavandas y un
  naranja.

El inventario también saca a la luz **inconsistencias que se corrigen en la fuente**, no aquí: archivos con nombre de
un país que muestran otro, textos que se contradicen entre piezas, legales convertidos a curvas que no se pueden
editar, logos de alianza y URL ausentes, y archivos con marcas de imagen generada con IA cuyos derechos hay que validar
antes de pautar.

> Detalle técnico: [manual, paso 3](../../manual-de-uso/creative/adaptar-kv-sky-en-claude-design.md#3-leer-un-kit-despliegue-base)

### Entrega en OneDrive

Las piezas finales de BLACK se entregaron el 2026-11-05, a pedido del operador, en una **carpeta nueva** dentro de
«Despliegue Base», al lado del kit: «ENTREGABLES BLACK (Efeonce 2026-11-05)». El nombre lleva la fecha y quién
entrega, para no confundirla con los archivos de SKY.

| Carpeta | Qué trae | Archivos |
|---|---|---|
| GIF Y VIDEO KV | GIF, MP4 y MP4 con audio de los 24 KV | 72 |
| KV ESTATICOS | Los KV como imagen fija | 37 |
| POPUP Y STORY | Popup y story estáticos | 48 |
| RUTAS FOCO PERU | 13 rutas con popup y story | 26 |
| CHILE KV LISTO | TikTok (3), DAT (2) y PMAX (4), en tamaño normal y doble | 18 |
| STORY VIDEO 5 SLIDES | Videos de story de 15,7 s | 12 |
| PMAX | Paquete PMAX | 60 |
| HPH | Paquete HPH | 48 |

En total son 321 archivos (626 MB). Antes de copiar se comprobó que la carpeta no existía; se copió sin borrar nada y
sin incluir los scripts de trabajo, y después se comparó cada archivo con el original: todo quedó idéntico. **El kit
de SKY quedó intacto.** OneDrive sube la carpeta a la nube después de la copia; hasta que termine, los demás no la ven completa.

> Detalle técnico: [manual, paso 10](../../manual-de-uso/creative/adaptar-kv-sky-en-claude-design.md#10-entregar-en-onedrive)

## Descomposición de un KV

Para llevar un KV a otro formato hay que saber qué es cada parte. El KV se separa en **regiones**: foto, logo,
destino, precio, badge, pie y, en los KV de clúster, la lista de destinos. Después se comprueba que el fondo más las
partes vuelvan a dar el KV original, sin diferencias más allá del ruido del render.

Con las partes separadas, cada formato nuevo reubica y escala lo que necesita sin redibujar nada.

Si el render muestra un defecto del archivo original (por ejemplo, una junta de 1 px en la flecha de precio o un
precio desalineado), se corrige en el render y se deja la recomendación para que SKY lo arregle en su archivo.

> Detalle técnico: [referencia de la skill](../../../.claude/skills/efeonce-creative-workbench/references/sky-design-canvas.md)

## Popup y story

Los dos formatos nuevos parten de la **foto original del KV**, re-encuadrada. Nunca se inventa cielo ni fondo.

| | Popup 1080×1080 | Story 1080×1920 |
|---|---|---|
| **Foto** | Re-encuadrada al 80 %, con la cabeza cerca de la parte alta | Re-encuadrada al 113 % del KV, para cubrir todo el alto |
| **Logo** | Tamaño completo, arriba a la izquierda | Al 130 %, debajo de la zona segura superior |
| **Bloque comercial** | Destino, precio y badge al 88 %, con el precio terminando sobre el pie | Bajado para dejar libres ~270 px arriba y abajo (zonas de la interfaz de Instagram) |
| **Pie y legal** | Con un degradado oscuro inferior para que el legal no quede sobre la ropa | Igual, con su propio degradado |

Los KV de clúster tienen ajustes propios: en el clúster nacional, la lista de destinos se reordena en tres columnas en
el popup y se agranda y centra en la story.

> Detalle técnico: [manual, paso 6](../../manual-de-uso/creative/adaptar-kv-sky-en-claude-design.md#6-llevar-el-kv-a-popup-y-story)

## Animación

El kit trae seis **referencias de animación** de campañas anteriores, que funcionan como plantilla de movimiento: el
destino sube con un fundido, la flecha de precio entra desde la izquierda, el badge aparece creciendo y todo queda
quieto a partir de ~1,4 s hasta el final (~4 s). No hay salida: el bucle vuelve a empezar.

Cada uno de los 24 KV de mercado de BLACK se anima así (1080×1350, 25 cuadros por segundo, 3,96 s por vuelta) y se
entrega en tres archivos:

- **GIF**: en bucle y sin sonido.
- **MP4**: la misma animación, sin sonido.
- **MP4 con audio** (`_audio`): con la pista del kit, cuyo golpe coincide con el momento en que el precio queda fijo;
  se bajó de volumen porque venía demasiado alto.

Sólo se mueven las partes del mensaje (badge, destino, precio y, si la hay, la lista); la foto, el logo y el pie quedan
quietos. Detalle cuadro a cuadro en el [catálogo](./catalogo-formatos-sky.md#cómo-es-un-gif).

En el canvas las animaciones se ven como videos, porque Claude Design muestra los artboards como imágenes quietas.

> Detalle técnico: [manual, paso 5](../../manual-de-uso/creative/adaptar-kv-sky-en-claude-design.md#5-animar-gif-y-mp4-con-audio)

## Story en video

Cada uno de los 12 mensajes de la grilla por mercado tiene además un **story en video** (1080×1920, 15,7 s, con
música), armado en cinco partes: intro con la foto y el logo, precios, una tarjeta blanca con una frase («brandlift»),
«Completa tu viaje» sobre el video del avión del kit y la tapa de cierre de SKY. La música del kit se apaga antes de la
tapa, que trae su propio sonido.

El kit no trae tapa vertical en español: se armó desde la horizontal y queda por confirmar, igual que las frases
propias de los mensajes internacionales y sus traducciones. Partes y tiempos en el
[catálogo](./catalogo-formatos-sky.md#cómo-es-el-story-en-video).

> Detalle técnico: [scripts del despliegue BLACK](../../../.claude/skills/efeonce-creative-workbench/references/sky-black-pipeline.md)

## Qué hay en el canvas

| Página | Contenido |
|---|---|
| Internacionales | CyberSky Perú, destinos internacionales en los tres formatos |
| Nacionales | CyberSky Perú, destinos nacionales en los tres formatos |
| Plantillas | Plantillas de popup, post y story, lockup CyberSky y pie SKY |
| KV Black · HM | Los 12 KV de BLACK como imagen fija |
| KV Black · Animación GIF | Los 12 KV animados, las referencias del kit y una previa con audio |
| KV Black · Popup y Story | 24 piezas estáticas: 12 popup y 12 story |
| KV Black · PMAX y HPH | PMAX de los 12 KV y HPH genérico de Chile más cinco mercados con sus banderas |
| KV Black · Grilla por mercado | Los 12 mensajes por mercado: KV, popup, GIF, story y story en video |
| KV Black · Rutas foco Perú | 13 rutas con popup y story |
| KV Black · Chile KV listo | Banner TikTok, DAT y PMAX de Chile a partir de los editables del kit |

El operador revisa dejando **comentarios anclados a cada pieza**; las respuestas y correcciones quedan en el mismo
hilo. El canvas es privado del operador: para que otra persona (por ejemplo Daniela) lo vea y comente, se comparte
desde «Compartir». Al cierre de la segunda ronda está en la versión 28.

> Detalle técnico: [manual, páginas del canvas](../../manual-de-uso/creative/adaptar-kv-sky-en-claude-design.md#qué-significan-las-páginas-del-canvas)

## Cambios del cliente y piezas nuevas (segunda ronda)

- **Un cambio que toca todas las piezas se hace una sola vez, en la fuente.** Cuando Sky cambió la fecha del logo BLACK
  («del 25 de noviembre al 2 de diciembre»), pidió que la fecha fuera más grande, que la línea del marco se acortara lo
  necesario y que el resplandor bajara. Se corrigieron las fuentes (KV, logos y referencias) y todas las piezas se
  rehicieron desde ellas: no se retocó pieza por pieza.
- **Cada mercado tiene sus destinos.** Las piezas internacionales llevan la lista de banderas del mercado (Argentina,
  Perú, Brasil, Estados Unidos) o una fila de banderas (Uruguay); el HPH por mercado usa esa misma lista.
- **La grilla define los mensajes.** Por mercado se producen los mensajes que pide la grilla («Vuela por Chile»,
  «Volá a Santiago», «Voe para Peru», etc.), cada uno con popup, GIF y story en video.
- **Las alianzas tienen su logo por mercado:** Chile Travel fuera de Chile y PromPerú (versión «solo HM Perú» en Perú y
  «otros HM» fuera de Perú).
- **Lo que no tenemos queda marcado.** La ubicación de la foto de las rutas foco va como placeholder; la lista de
  regiones de Perú es una propuesta sin fotos; las frases y traducciones propias quedan por confirmar.
- **Chile tiene piezas «KV listo».** Cuando el kit trae el editable del formato (banner TikTok, DAT, PMAX), la pieza
  es esa referencia con el logo vigente, sin recomponerla. Los precios y descuentos siguen como marcador (`000.000`,
  `00%`) hasta que llegue la grilla de precios.

### Pendientes con Daniela

Quedan por confirmar: si Brasil «Voe para Peru» va como pieza de alianza o como KV; la propuesta «Vuela por Perú» sin
fotos; la base de Chile «Encuentra destinos» (su nota hablaba del clúster internacional de Perú); las frases y
traducciones del story en video y del HPH; la ubicación de la foto de las rutas foco, y la tapa vertical en español.
La lista completa, con lo que hay hoy en cada caso, está en el
[catálogo](./catalogo-formatos-sky.md#qué-queda-por-confirmar-con-daniela).

> Detalle técnico: [referencia de la skill, segunda ronda](../../../.claude/skills/efeonce-creative-workbench/references/sky-design-canvas.md#segunda-ronda-de-daniela-2026-11-04-chat-de-teams)

## Reglas que se cumplen siempre

- El kit del cliente en OneDrive se lee y no se modifica. Las entregas van en una carpeta nueva junto al kit, con
  fecha y autoría, sin borrar ni reemplazar nada de lo que ya existe.
- La IA sólo se usa con autorización explícita del operador y con la clave que él indique.
- Nada se publica fuera de los artifacts privados del operador.
- Los datos dudosos (moneda, separador de miles, origen, sentido del tramo, derechos de imagen) los confirma el
  operador antes de pautar. En CyberSky Perú quedaron pendientes de confirmar.

> Detalle técnico: [referencia de la skill](../../../.claude/skills/efeonce-creative-workbench/references/sky-design-canvas.md)

# Producir un spot animado 2D — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.1
> **Creado:** 2026-10-03 por Claude
> **Ultima actualizacion:** 2026-10-04 por Claude
> **Modulo:** Creative · marca propia de Efeonce (video animado con personajes)
> **Ruta en portal:** no aplica — se opera desde una corrida en `ai-generations/<fecha>_<slug>/` con las CLIs `pnpm ai:image` y `pnpm ai:fal` y scripts propios
> **Estado:** primer caso aprobado por el operador el 2026-10-03 («Los Sparks», servicio Efeonce | AEO, v2); registrado en Marketing Studio y programado en Metricool (Instagram 05-oct, LinkedIn 08-oct), todavía sin publicar
> **Documentacion relacionada:** [Método de producción y posproducción de video](../../operations/creative-production/VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md) · [Workflow: spot animado 2D con assets de marca compuestos](../../../.claude/skills/motion-design-studio/workflows/animated-2d-spot-composed-brand-assets.md) · [Documentación funcional](../../documentation/creative/spot-animado-2d.md) · [Retrospectiva del caso fuente](../../operations/social/2026-10-03-sparks-aeo-spot-animado-production-method.md) · [Clasificar y planificar una pieza de video](../creative-production/clasificar-y-planificar-una-pieza-de-video.md) · [Entrega de video en Metricool](../../../.claude/skills/social-media-studio/references/video-delivery-metricool.md)

## Para qué sirve

Este manual explica cómo llevar un **spot animado 2D de marca propia** desde el brief hasta la entrega: preproducción,
cuadros clave, piloto, tomas, corte, audio, subtítulos, entrega, variantes por red y distribución (Marketing Studio y
Metricool).

Es el orden de trabajo. El **cómo técnico** (recetas de ffmpeg, mapa de tiempos, composición de los Sparks, mezcla)
está en el [método transversal](../../operations/creative-production/VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md) y en
el [workflow de la skill](../../../.claude/skills/motion-design-studio/workflows/animated-2d-spot-composed-brand-assets.md);
este manual no lo repite.

**No sirve** para piezas de clientes con su propia marca ni para la interfaz de Greenhouse.

## Antes de empezar

- **Carga las skills.** El router del repo pide, para video, `ai-model-selection` (qué modelo y cuánto cuesta) y
  `motion-design-studio` (el oficio); para audio, `audio-studio`; para texto sobre imagen,
  `efeonce-advertising-creative`. Si el spot explica una capacidad u oferta, carga además la skill dueña **antes** de
  escribir la locución (para AEO: `seo-aeo` y `seo-aeo-practice`) y el canon de personajes
  ([Sparks](../../operations/brand-characters/SPARKS_V1.md)).
- **Pide autorización de gasto con un estimado previo.** Cada paso que gasta (cuadros clave, piloto, tomas, música,
  voz) se pide con su número antes de correr. Referencia del caso fuente: USD 4,78 en fal, cuadros clave dentro de un tope autorizado de USD 2,10 (no es gasto medido),
  tope ~USD 8. Si `--estimate` de fal se cuelga, ver [Problemas comunes](#problemas-comunes).
- **Elige el elenco correcto.** El **elenco fotográfico representa al equipo Efeonce y no puede hacer de cliente.** Si
  la ficción necesita un cliente, usa el [elenco 2D](../../operations/brand-characters/EFEONCE_2D_CAST_V1.md) (Tomás,
  Camila, Renata, Mateo). Los Sparks siempre trabajan con una persona que decide.
- **Ten a mano los archivos oficiales:** el dibujo de los Sparks (`@efeoncepro/axis-brand-assets`, sparks-2d), los
  logos y el kit sonoro oficial (bucket público AXIS, verificado por sha256 contra
  `https://axis.efeonce.org/references/sonic-brand.json`).

## Paso a paso

### Paso 1 · Preproducción (antes de generar nada)

Escribe un `PREPRODUCCION.md` en la carpeta de la corrida con: historia, guion de locución por escena, música, voz de
los personajes, efectos, VFX por toma, plan de tomas y empalmes, mezcla y entrega, presupuesto y decisiones
pendientes. El operador lo aprueba **antes** del storyboard.

- La historia manda sobre la duración: no planifiques tomas largas para llenar el minuto.
- **Cada toma dura como máximo 15 s** (tope por pedido en fal y en Higgsfield). Planifica escenas cortas.
- Marcas de la competencia: invéntalas desde el principio y busca que no exista una empresa con ese nombre. No dejes
  marcadores del tipo «[Marca ficticia A]».
- **Nombre del servicio:** en guion, subtítulos y copy, la marca que habla es **Efeonce** y el servicio se escribe
  **«Efeonce | AEO»** (por ejemplo: «En Efeonce lo resolvemos con nuestro servicio Efeonce | AEO…»). Revísalo aquí:
  después de grabar la voz, corregirlo obliga a re-renderizar. En el caso fuente, la voz y los subtítulos dicen
  «Efeonce AEO» y sólo se corrigieron los copies de redes.

### Paso 2 · Storyboard en canvas

Arma el storyboard como canvas (artifact) con una lámina principal, una por escena y la línea de tiempo; después,
elenco y cuadros clave. El operador comenta sobre las láminas y aprueba escena por escena.

### Paso 3 · Elenco (sólo si falta uno)

Si necesitas personajes nuevos: hojas de giro y expresiones con el motor de imagen, aprobación del operador y
canonización (doc de canon, referencias selladas y publicadas). Sin aprobación, no se usan en tomas.

### Paso 4 · Cuadros clave

- Genera fondos y personajes con `pnpm ai:image` usando las hojas del elenco como referencia.
- **Los Sparks nunca los genera el modelo:** se componen desde el dibujo oficial, sin espejar. Si un Spark debe mirar a
  alguien, se emula la mirada del rig (la cara LED se mueve dentro del visor), no se redibuja.
- Si haces una pasada de acabado de luz con IA, mezcla sólo dentro de las zonas y verifica **0 píxeles cambiados
  fuera**; el script de mezcla debe fallar si cambia uno.
- Para cada toma, el cuadro inicial y el final **comparten el eje de cámara**.

### Paso 5 · Piloto

Corre **una** toma de prueba con el motor de video (`pnpm ai:fal`), con su gasto autorizado. En el caso fuente: MiniMax
H3 base, 768P, con `--prompt-expansion disabled`. Revisa el resultado con el operador antes de pedir la producción
completa.

### Paso 6 · Tomas

- En cada prompt: **prohíbe el texto en pantalla** y **fija la paleta**.
- Revisa cada toma cuadro por cuadro; rehace las que tengan texto ilegible, cambien de color o salten de trayectoria.
- Sube a 1080 en posproducción (la ruta usada no entrega 1080 nativo).

### Paso 7 · Corte

- Primer corte mudo con placas provisorias para encontrar el ritmo; después, placas finales.
- Las pantallas de UI (chat, preguntas, respuestas) se dibujan cuadro a cuadro desde el vector, nunca con un zoom de
  ffmpeg.
- Si hay que acelerar o recortar, hazlo desde **un solo mapa de tiempos** que mueva a la vez video, voz, efectos y
  subtítulos.

### Paso 8 · Audio

- **Locución:** voz de librería con licencia (caso fuente: «Andre – Clear Studio Voiceover Narration» con
  `eleven_v4` vía el conector ElevenLabs Creative). Pide 2 generaciones por línea, no las 4 por defecto.
- **Música:** arreglo desde el material oficial de la identidad sonora (caso fuente: Stable Audio 2.5 audio-to-audio
  sobre la pieza de energía). Mide el balance de medios antes de mostrarla y ecualiza si viene cargada de graves.
- **Efectos:** con su lista de eventos en un bus.
- **Mezcla:** la música baja bajo la voz (sidechain); master a −16 LUFS / −1 dBTP.
- **Escucha:** el agente no escucha y no hay ASR local. La elección de tomas de voz por calce de tiempo es provisoria:
  **la escucha del operador es el control** y debe pedirse de forma explícita.

### Paso 9 · Subtítulos

Español, quemados en la versión para redes y SRT aparte (de diálogo y SDH con descriptores de sonido). En las
pantallas de UI, el subtítulo sube para no tapar la barra de escritura. Detalle de tipografía y caja en el workflow.

### Paso 10 · Cierre y entrega

- La frase de cierre va sobre una placa animada; **el reveal del logo Efeonce va sin voz**.
- Antes de entregar, **mira los cuadros al 100 %**: textos dentro de sus burbujas, sin marcadores.
- Entrega con y sin subtítulos, más los SRT, en `final/` de la corrida.

### Paso 11 · Variantes por red

Cada variante es un entregable propio con su aprobación. En el caso fuente se entregaron: portada Instagram 4:5,
portada LinkedIn 16:9 y una versión Instagram con pantalla negra muda inicial y la animación vectorial de un teléfono
genérico (sin botones, no iPhone) con flechas de girar la pantalla (52,6 s en total).

### Paso 12 · Distribución (sólo con autorización de publicación)

Aprobar la pieza no autoriza publicarla. Con la autorización explícita del operador en el chat:

1. **Registra la pieza en Marketing Studio.** Concepto y piezas dentro de su campaña. En el caso fuente: concepto
   CMP001-08 «Los Sparks» de CMP-001, finales en OneDrive, entradas en `CATALOGO-DATOS.json`, después
   `pnpm import:catalog --apply` y `pnpm media:ingest --campaign CMP-001 --apply`. Las versiones quedan `imported`
   hasta que alguien las apruebe en Studio. Detalle: skill
   [`efeonce-marketing-studio`](../../../.claude/skills/efeonce-marketing-studio/SKILL.md).
2. **Programa en Metricool un post por red, cada uno con su portada.** En Instagram, un video 16:9 lleva la portada
   **4:5**; en LinkedIn, la 16:9. Elige la hora cruzando las mejores horas de cada red con lo que ya está programado.
   En el caso fuente: Instagram lunes 05-oct 14:00 y LinkedIn jueves 08-oct 11:00.
3. **Comprueba lo programado:** descarga la media que Metricool re-alojó y compara su SHA-256 con tus archivos finales
   (en el caso, 4 de 4 idénticos); compara también el texto con el copy aprobado. Anota todo en
   `final/redes/PROGRAMACION.md` de la corrida.
4. **Deja anotado lo que queda en manos humanas:** el enlace de la bio de Instagram si el copy dice «Link en la bio»,
   la comprobación después de la hora y la aprobación de versiones en Studio.

Receta completa y campos de Metricool:
[entrega de video en Metricool](../../../.claude/skills/social-media-studio/references/video-delivery-metricool.md).

## Qué significan los estados

| Estado | Qué quiere decir |
|---|---|
| Preproducción aprobada | Historia, guion y plan cerrados; todavía no se gasta en video |
| Piloto autorizado | El operador aprobó el gasto de una toma de prueba |
| Producción autorizada | El piloto convenció; se pueden generar todas las tomas |
| Corte entregado | Hay video con audio; falta la escucha y la aprobación del operador |
| Aprobado | El operador aprobó la pieza (caso fuente: v2, 2026-10-03) |
| Registrado en Studio | La pieza está en su campaña de Marketing Studio; sus versiones siguen `imported` hasta aprobarlas allí |
| Programado (`PENDING`) | Metricool tiene el post con fecha; todavía no salió (caso fuente: IG 05-oct, LinkedIn 08-oct) |
| Publicado | Sólo se confirma leyendo el post después de la hora; necesita su propia autorización |

## Qué no hacer

- **No** generes los Sparks, los logos ni el texto con la IA.
- **No** espejes un Spark.
- **No** uses al elenco fotográfico como cliente.
- **No** estires tomas para cumplir una duración.
- **No** escribas la locución de una capacidad sin la skill dueña cargada, ni prometas que la IA va a nombrar o citar
  a la marca.
- **No** pongas voz encima del reveal del logo.
- **No** declares el audio verificado: sin escucha propia ni ASR, sólo el operador lo confirma.
- **No** gastes sin estimado y autorización previa.
- **No** publiques ni programes sin autorización explícita: aprobar la pieza no es autorizar su publicación.
- **No** escribas «Efeonce AEO» como si fuera la marca: la marca es Efeonce y el servicio, «Efeonce | AEO».
- **No** des por publicado un post `PENDING`.

## Problemas comunes

| Síntoma | Causa | Qué hacer |
|---|---|---|
| Los Sparks giran en 3D | H3 Max | Usar H3 base con `--prompt-expansion disabled` |
| La toma salta de trayectoria | Cuadro inicial y final con distinto eje de cámara | Rehacer los cuadros con el mismo eje |
| Aparece texto ilegible | El prompt no prohíbe texto | Prohibirlo y rehacer la toma |
| La toma cambia de color | Paleta no fijada | Fijar la paleta en el prompt |
| `--estimate` de fal se cuelga | Sube un PNG pesado (3,5 MB) | Usar JPG y los precios publicados |
| No existe 1080P en el motor | h3-i2v ofrece 480P/768P/2K/4K; h3max-i2v no tiene 2K | Generar en 768P y subir a 1080 en post |
| El zoom de una pantalla avanza a saltos | `zoompan` redondea a píxeles enteros | Dibujar cada cuadro desde el vector con escala decimal |
| No se pueden quemar subtítulos con ffmpeg | ffmpeg local sin libass | Un PNG transparente por subtítulo, superpuesto por tiempo |
| Tras acelerar, un sonido cae sobre la voz | Sonidos con tiempo absoluto | Remapear desde el mapa de tiempos; si choca, quitarlo |
| El video final dura más de lo esperado | `overlay` sin `shortest=1` ni `-t` | Agregar ambos |
| La música suena opaca | Arreglo cargado de graves | Medir medios; EQ bajo 180 Hz y realce en 2,5 kHz |
| El pantalón del personaje se recorta | El quitafondos come el navy | Usar recortes de cintura arriba |
| Se pierde un canal al mezclar con sharp | `removeAlpha` al final del pipeline | Mezcla manual |
| Error de límite con SVG grande | Densidad alta | `limitInputPixels:false` |
| Un texto se sale de su burbuja | No se miró al 100 % | Revisar cuadros al 100 % antes de entregar |
| Metricool responde «could not be parsed at index 10/19» | Fecha sin hora o sin offset | Usar fecha-hora ISO con offset (`2026-10-05T14:00:00-03:00`), también en `date` al crear |
| La cola de Metricool trae entradas sin ID | Son la autolista (`autolistData`) | No contarlas como posts programados |

## Pendientes y límites honestos

- **Sin escucha propia ni ASR local:** el texto dicho no se verifica automáticamente.
- **Licencia de Stable Audio** sin confirmar con legal; revisar antes de pauta o reutilización.
- **Excepción al canon sonoro:** el caso fuente usó el registro de energía bajo la locución, que la
  [identidad sonora](usar-identidad-sonora-efeonce.md) no permite. No es una regla nueva.
- **Prueba de reconocimiento del elenco 2D** y **derechos del elenco** pendientes.
- **Publicación del elenco 2D en AXIS:** en curso.
- **Variantes de redes:** entregadas y programadas. Falta el enlace de la bio de Instagram, comprobar la publicación
  después de la hora y aprobar las versiones en Studio. Sin pauta hasta confirmar la licencia de la música.

## Referencias técnicas

- [Método de producción y posproducción de video](../../operations/creative-production/VIDEO_PRODUCTION_AND_POSTPRODUCTION_V1.md)
- [Workflow `animated-2d-spot-composed-brand-assets`](../../../.claude/skills/motion-design-studio/workflows/animated-2d-spot-composed-brand-assets.md)
- [Entrega de video en Metricool](../../../.claude/skills/social-media-studio/references/video-delivery-metricool.md) · skill [`efeonce-marketing-studio`](../../../.claude/skills/efeonce-marketing-studio/SKILL.md)
- [Taxonomía de video con IA](../../architecture/GREENHOUSE_AI_VIDEO_PRODUCTION_TAXONOMY_V1.md) · [ADR del pipeline de video](../../architecture/creative-studio/EFEONCE_VIDEO_PRODUCTION_PIPELINE_ARCHITECTURE_V1.md) · [Guía de selección de modelos](../../architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md)
- [Elenco 2D](../../operations/brand-characters/EFEONCE_2D_CAST_V1.md) · [Sparks](../../operations/brand-characters/SPARKS_V1.md) · [Identidad sonora](../../operations/brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md)
- Caso fuente: [retrospectiva](../../operations/social/2026-10-03-sparks-aeo-spot-animado-production-method.md) y la corrida `ai-generations/2026-10-03_sparks-aeo-60s/` (`PREPRODUCCION.md` §11–12, `INVENTARIO-DE-HECHOS.md`)

# Componer piezas de Glitch — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.5
> **Creado:** 2026-09-27 por Claude
> **Ultima actualizacion:** 2026-09-27 por Claude (v1.5: el blog completo y la lámina con lente quedaron aprobados;
> la versión 1:1 del banner es una plantilla propia, el callout «DROP» v2 rige desde la #17 y la lente es una variante
> ocasional. v1.4: la música de Glitch quedó aprobada e integrada al taller, con
> el pre-roll de la intro; el flujo del editor agente pasa al manual [Producir el motion, el sonido y la música de
> Glitch](./producir-motion-glitch.md) y se corrigen las cifras de verificación. v1.3: el motion de Glitch y los
> tableros de video quedaron aprobados)
> **Modulo:** Creative · Glitch, magazine semanal de Efeonce (sub-línea de «La órbita»)
> **Ruta en portal:** no aplica — las piezas se arman desde el canvas de diseño; la edición completa se compone con `pnpm glitch:compose` ([Componer una edición de Glitch](./componer-una-edicion-de-glitch.md))
> **Documentacion relacionada:** [Documentación funcional](../../documentation/creative/linea-grafica-glitch.md) · [Norma de la sub-línea](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md) · [ADR](../../architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md) · [Usar la línea gráfica de Efeonce](./usar-linea-grafica-efeonce.md)

> **⚠️ Este manual es SÓLO para piezas de Glitch.** Para cualquier otra pieza de Efeonce usa
> [Usar la línea gráfica de Efeonce](./usar-linea-grafica-efeonce.md). La manzana, el verde Glitch, los bytes, Guttery y
> la cabecera «EDICIÓN #N» **no** van en piezas de Efeonce.

> **Este manual explica el criterio; el comando lo aplica.** Desde el 2026-09-27 (TASK-1923) las piezas estáticas de
> una edición —carrusel, piezas sueltas del blog, portada del reel, miniatura del vlog y overlays en PNG— se componen
> con `pnpm glitch:compose` a partir de un manifiesto de la edición: el paso a paso, los campos y los errores están en
> [Componer una edición de Glitch con `pnpm glitch:compose`](./componer-una-edicion-de-glitch.md). Este manual sigue
> siendo la referencia de **qué** lleva cada pieza y por qué (portada, láminas, blog, video, checklist); donde más abajo
> dice que las piezas estáticas se arman a mano desde el canvas, rige el comando.

## Para qué sirve

Explica cómo armar las piezas de una edición de Glitch con su línea gráfica: la portada según la regla de rotación, las
láminas del carrusel de LinkedIn, la contraportada, las piezas del blog y los gráficos del video (vlog horizontal y reel
vertical).

**Las piezas estáticas se componen con `pnpm glitch:compose`** (TASK-1923, taller local): el Artifact Composer tiene los
catálogos de Glitch y aplica solo la rotación, el contrato y los límites. Este manual explica el criterio; el paso a paso
está en [Componer una edición de Glitch](./componer-una-edicion-de-glitch.md). El canvas de diseño queda para explorar
piezas nuevas. Los **gráficos
animados del video** se generan desde el repo taller y están **aprobados** (2026-09-27): ver
[Video y motion](#video-y-motion) y el manual [Editar el video de Glitch](./editar-video-glitch.md).

## Antes de empezar

- **Confirma que la pieza es de Glitch.** Si no, este manual no aplica.
- **Abre el canvas** [«Glitch en La órbita»](https://claude.ai/artifact/N3Yg5cyz2zXa36SwtWVHYS) (privado). La sección
  «Sistema de portada» es la aprobada; en «Blog y vlog» el blog y los tableros de video están aprobados;
  «Vlog en reel» está aprobada (2026-09-27).
- **Ten a mano la norma** ([`GLITCH_GRAPHIC_LINE_V1.md`](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md)):
  ahí están los colores, las letras, la cabecera y las medidas.
- **Ten el contenido de la edición:** número (la próxima es la #17), tesis de la semana, las ocho noticias con su sección
  («Marketing + IA», «Creatividad + IA» o «Tecnología + IA»), titular, medio, fecha, foto con crédito y licencia, y la
  opinión del narrador (remate + porqué) de cada una.
- **Anota la plantilla de portada de la semana pasada.** La necesitas para la regla de rotación.
- **Archivos:** logo de Glitch en `public/branding/glitch/` (`glitch-light.svg`, `glitch-dark.svg`); logo de Efeonce desde
  `public/branding/` o `@efeoncepro/axis-brand-assets`; íconos Plastilina de Glitch en
  `ai-generations/2026-09-26_glitch-iconos/elegidos/`.
- **Si trabajas con un agente**, pídele que cargue la skill `efeonce-graphic-line` y su referencia `references/glitch.md`.

## Paso a paso — armar una edición

### Paso 1 · Elige la plantilla de portada

Responde en este orden y quédate con la primera que se cumpla:

| Pregunta | Si la respuesta es sí |
|---|---|
| ¿Hay una foto fuerte de la noticia principal? | **A · Noticia con foto** |
| ¿Hay una opinión que pega sola, sin foto? | **B · Tipográfica** |
| ¿Hay varias noticias del mismo peso? | **C · Mosaico** |

Después revisa la **regla de rotación**: si la plantilla elegida es la misma de la semana pasada, cambia a la siguiente
que el contenido permita. Nunca dos semanas seguidas con la misma.

### Paso 2 · Arma la portada

1. Parte de la plantilla elegida en el canvas.
2. Pon la **cabecera**: logo de Glitch a la izquierda y «EDICIÓN» sobre «#N» a la derecha, en una fila. Sin línea fina
   debajo.
3. Pon el titular con **contraste de pesos** (entrada liviana + remate grueso y condensado) y ciérralo con la manzana.
4. Según la plantilla: la foto en navy que se desarma en bytes (A), la muletilla en Guttery y la manzana en bytes (B), o
   las cuatro tarjetas con foto, sección y opinión (C).
5. Agrega las dos líneas de portada «+ IA» (A y B).
6. Pie: «Desliza» con la mano Plastilina (en el carrusel) y la **firma de Efeonce** centrada.
7. **No pongas «El micrófono se abre…» en la portada**: va en la noticia 1.

### Paso 3 · Arma las láminas interiores (una por noticia)

1. Cabecera compacta.
2. Foto de la noticia en navy que se desarma en bytes por el borde, **nunca sobre una cara**, con su crédito.
3. Chip «NOTICIA n» + medio y fecha; «SECCIÓN + IA · LA NOTICIA»; titular en letra liviana.
4. «GLITCH DROP» con los puntos y la opinión del narrador en letra gruesa condensada, cerrada con la manzana; debajo, el
   porqué.
5. Avance «n/8» en ocho segmentos y «DESLIZA» con la mano Plastilina.
6. **Noticia 1:** agrega la franja «EL MICRÓFONO SE ABRE» con los puntos entre la cabecera y la foto.
7. **Lente (variante ocasional, aprobada el 2026-09-27):** úsala **sólo** cuando la opinión habla de un detalle nítido
   de la foto; si no, va la lámina interior normal. La lente amplía ese detalle a color y el resto queda en navy. Esa
   lámina **no** cierra con la manzana: la esfera ya está en la lente (una sola esfera por pieza).

### Paso 4 · Arma la contraportada

1. «El micrófono se cierra» con contraste de pesos; los puntos se resuelven en la manzana.
2. Textura de manzana en bytes.
3. Fila de acciones Plastilina «SI TE SIRVIÓ»: guardar, compartir, recomendar, comentar.
4. CTA en píldora blanca «Suscríbete a [logo de Glitch]».
5. La misma cabecera; firma de Efeonce con el eslogan «Empower your Growth» (Glitch es línea Growth), más chico que el
   logo.

### Paso 5 · Piezas del blog (aprobado)

Todo el blog está **aprobado** desde el 2026-09-27 («Vamos en todas con tu recomendación»). Arma el post así:

- **Imagen destacada:** banner 16:9 (1920 × 1080) con la plantilla A/B/C de la semana en horizontal, sin «Desliza».
- **Versión 1:1:** el archivo del blog recorta la imagen destacada en cuadrado, así que agrega la versión 1:1 con su
  **plantilla propia** (derivada de las portadas). **Nunca** recortes la portada 4:5: pierde un quinto del alto y puede
  cortar el titular o la manzana. Existe como tres plantillas propias (`BlogSquarePhoto`,
  `BlogSquareType`, `BlogSquareMosaic`, una por portada): pídela con `blog:square` en `outputs.stills`.
- **Apertura:** bloque navy «El micrófono se abre» + tesis + «Vamos.». Reemplaza la cita con fecha.
- **Escaleta:** el índice de las ocho noticias, como en radio.
- **Banner interno de cada noticia** (1600 × 900): foto en duotono navy + bytes + chip número/sección + wordmark, **con
  el crédito de la foto siempre**. Reemplaza la imagen cruda de la fuente.
- **Callout «DROP» v2** (bloque navy, puntos + wordmark + «DROP», remate con manzana, porqué debajo, bytes en la
  esquina): rige **desde la #17**. Antes de publicar la #17 hay que actualizar el bloque de WordPress
  `efeoncepro/glitch-drop` (TASK-1337); hasta entonces el bloque publicado es el v1. Los posts anteriores a la #17
  siguen con el v1: no los edites para cambiarlo.
- Banner de suscripción a mitad del post, vlog embebido, «El hilo de la semana» (cierre navy) y el cierre «El micrófono
  se cierra.» + «— El equipo editorial de Glitch» + íconos Plastilina versión papel.
- En el blog, que es claro, **el verde no va como texto, borde ni línea**: los momentos de marca van en bloques navy.

### Paso 6 · Video (aprobado)

El video está **aprobado** desde el 2026-09-27 (motion y tableros de video del canvas). Siguen pendientes la cadencia
de grabación, la prueba con los editores en una edición real, el estilo de subtítulos y los textos reales de la #17:

1. Graba **una vez** en 4K horizontal con aire arriba y abajo; el reel sale del recorte vertical.
2. Subtítulos siempre: Poppins 600, blanco sobre navy al 78 %, una palabra en el acento (su estilo en Premiere sigue
   pendiente).
3. Imagen de las fuentes: embebida o licenciada, nunca descargada; en navy, con bytes en el borde y crédito.
4. **Reel:** los gráficos van **encima** de la toma, porque el host está en cámara todo el tiempo. Respeta el mapa de
   zonas del lienzo 1080 × 1920: nada entre 0 y 220 ni desde 1500 (interfaz de la app), nada desde x 940 (botones),
   cabecera entre 240 y 440, texto entre 1150 y 1480, y **nunca** sobre la cara del host.
5. Las ocho piezas del reel son transparentes: apertura, cabecera (noticia n/3 + logo), lower third, subtítulo, tarjeta de
   noticia, imagen de la fuente (plano dividido), Glitch Drop y última frase («el #N+1 sale el lunes.» + «Sigue a
   Glitch»). Sólo la portada del reel y la tarjeta final son pantalla completa. El **lower third** está aprobado
   (ver [Video y motion](#video-y-motion)); no inventes otro contenido.
   El **sonido** está aprobado (versión B, 2026-09-27): cada `.mov` trae su WAV al lado. La **música** también (tema B
   y cama post-punk bajo la noticia, 2026-09-27): la intro, con su pre-roll de los tres puntos, la cortina, la salida y
   la cama llegan junto a las piezas.
6. **Tarjeta final:** centrada, espejo de la apertura (los puntos se resuelven en la manzana, para que el reel empalme en
   loop), un mensaje, una acción, la firma y sin texturas finas.
7. Los gráficos animados con fondo transparente se generan desde el repo taller y están **aprobados** (ver
   [Video y motion](#video-y-motion)). El montaje en Premiere o After Effects está en
   [Editar el video de Glitch](./editar-video-glitch.md).

### Paso 7 · Revisa antes de entregar

- [ ] La plantilla de portada no repite la de la semana pasada.
- [ ] Hay **una sola esfera** por pieza (manzana o lente, nunca las dos).
- [ ] Ningún byte ni gráfico pasa sobre una cara ni sobre la interfaz de la app.
- [ ] El verde no aparece como texto, borde ni línea sobre fondo claro.
- [ ] Cada pieza firma con el logo de Efeonce centrado; no hay dirección web escrita ni burbuja URL.
- [ ] Toda foto tiene crédito y licencia; ningún clip de terceros fue descargado.
- [ ] Ninguna pieza en **propuesta** o **exploración** salió como final sin aprobación.
- [ ] Ningún elemento de Glitch se coló en una pieza de Efeonce.

## Video y motion

> **⚠️ Sólo para Glitch.** Los gráficos animados y la transición de la manzana en bytes son **exclusivos de Glitch**:
> nunca se usan en piezas de Efeonce ni de clientes. El motion está **APROBADO** (2026-09-27): apertura y tarjeta
> final v2, kit de gráficos, transición de bytes entre piezas (falta decidir a qué piezas se aplica) y transición entre
> escenas. El sonido también (versión B), y la música (tema B y cama post-punk, con el pre-roll de la intro).

- **Para el editor humano** (Premiere Pro y After Effects): todo el montaje está en
  [Editar el video de Glitch](./editar-video-glitch.md). Este apartado no lo repite.
- **Para quien corre el taller** (persona o agente): el runbook completo —requisitos, `doctor`, todos los comandos y
  argumentos, verificaciones, manifiestos, música por huella y entregas— está en
  [Producir el motion, el sonido y la música de Glitch](./producir-motion-glitch.md). En corto, el flujo es:
  1. **Dónde se produce:** repo taller `efeoncepro/efeonce-brand-workshop`, paquete `tools/glitch-motion/`, operado
     desde `greenhouse-eo` (el taller vive como carpeta hermana). Nada de video entra al `package.json` de Greenhouse.
  2. **Revisa el entorno:** `pnpm -C ../efeonce-brand-workshop --filter glitch-motion doctor`. Si faltan
     dependencias: `NODE_AUTH_TOKEN=$(gh auth token) pnpm -C ../efeonce-brand-workshop install`. Guttery vive
     instalada en la máquina, nunca en git.
  3. **Archivo de edición:** el texto sale de un JSON con el esquema de
     `tools/glitch-motion/ejemplos/edicion-17.ejemplo.json` (edición, siguiente edición, host, invitado, tres noticias,
     Drop, llamado a la acción y, opcional, la transición). Las imágenes de las noticias se pasan con `--assets` y
     nunca entran a git.
  4. **Genera** según lo que se pida (`pnpm -C ../efeonce-brand-workshop --filter glitch-motion …`):

     | Qué | Comando |
     |---|---|
     | apertura + tarjeta final (reel y vlog) | `render -- --run <corrida> --edition 17 [--deliver "<carpeta>"]` |
     | kit de gráficos | `kit -- --run <corrida> --edition-file <archivo de edición> --assets "<imágenes>" [--transition bytes] [--only a,b] [--skip-render] [--deliver "<carpeta>"]` |
     | transición entre escenas | `transiciones -- --run <corrida> [--a <imagen\|video>[@seg]] [--b …] [--deliver "<carpeta>"]` |
     | versión héroe para un corte | `heroe -- --run <corrida> --a <archivo>[@seg] --b <archivo>[@seg] [--origin centro\|izquierda\|marca] [--formats reel,vlog]` |
     | pruebas del paquete | `test` |

  5. **Verifica:** cada comando verifica códec, cuadros y alfa de lo que genera (con sonido y música, al 2026-09-27:
     apertura, tarjeta final y pre-roll 37/37, kit 95/95, transiciones 84/84, héroe 8/8, kit con bytes 24/24).
     **Si una verificación falla, no se entrega.**
  6. **Manifiesto:** cada corrida deja `corridas/<corrida>/manifiesto.json` en el taller (sha256 de cada archivo,
     verificaciones, versiones, entrega y estado aprobado). Los binarios nunca entran a git.
     **Sonido:** cada comando entrega el WAV junto a cada `.mov`, con el mismo nombre (`--sound b|a|off`; `b`, la
     aprobada, por defecto). **Música:** `render` entrega el pre-roll, la intro y la salida (y sus versiones de
     podcast) y `kit` la cama y la cortina; los másteres se bajan del bucket y se verifican por sha256, nunca se
     regeneran (`--music on|off`; `on` por defecto).
  7. **Entrega:** con `--deliver` a OneDrive `Alineación › 5. Contenidos › 09. Glitch › Motion › piloto`, en la
     subcarpeta que corresponda (`v2/`, `kit/`, `transiciones/`…); la carpeta conserva el nombre `piloto`.
- Reglas y detalle para agentes: skill `efeonce-graphic-line`, `references/glitch.md` (sección del editor agente).

## Qué significan los estados

| Estado | Qué significa |
|---|---|
| **APROBADO** (2026-09-27) | se usa como pieza final: portada A/B/C con rotación, lámina interior, noticia 1, contraportada, la lámina con lente (variante ocasional) y el blog completo (banners 16:9 y 1:1 propia, apertura, escaleta, banner interno con crédito, callout «DROP» v2 desde la #17, suscripción, «El hilo de la semana» y cierre); también la manzana como esfera, el verde como acento, la línea Growth, el alta de los cinco íconos Plastilina, el sonido (versión B), la música (tema B y cama post-punk, con el pre-roll de la intro) y el motion del video (apertura y tarjeta final v2, kit de gráficos con el lower third, transiciones) con los tableros de video del canvas (vlog 16:9 y reel) |
| **PROPUESTA** | se puede armar para mostrarla al operador, pero no se publica como final. Hoy no hay piezas fijas en propuesta; el estado queda para piezas nuevas. (El flujo de composición está aceptado; su automatización de piezas fijas es TASK-1923) |
| **EXPLORACIÓN** | idea en estudio, no canon: los acentos teal y naranja del canvas, la historia 9:16 y el carrusel panorámico |
| **Aprobado, sin publicar en AXIS** | la manzana, el verde y los cinco íconos Plastilina de Glitch están aprobados (2026-09-27), pero todavía no están en los paquetes oficiales de AXIS (TASK-1922) |
| **Pendiente** (video) | la cadencia de grabación (hoy 30 fps), la prueba con los editores en una edición real, el ritmo ajustable, a qué piezas se aplica la transición de bytes, el estilo de subtítulos, los textos reales de la #17 y cualquier excepción de rostros |
| **Por confirmar** | la referencia del contrato de licencia de Guttery (la licencia fue confirmada por el operador el 2026-09-27) |
| **Publicada** (AXIS) | la página y la guía de Glitch están en axis.efeonce.org desde el 2026-09-27; los tokens de Glitch todavía no existen (TASK-1922) |

## Qué no hacer

- No uses la manzana, el verde Glitch, los bytes, Guttery ni la cabecera «EDICIÓN #N» en piezas de Efeonce.
- No pongas dos esferas en la misma pieza (manzana y lente, o manzana y órbita).
- No uses el verde como texto, borde o separador sobre fondo claro.
- No pongas bytes ni gráficos sobre una cara, ni gráficos sobre la interfaz de la app en el reel.
- No agregues una órbita decorativa: si no dice nada, no va (así se descartó la contraportada con órbita 8/8).
- No escribas la dirección web como texto ni uses la burbuja URL de La órbita.
- No descargues clips de terceros para subirlos: embébelos o licéncialos.
- No publiques titulares o noticias de las maquetas: son de ejemplo.
- Guttery tiene licencia para web y video (confirmada por el operador el 2026-09-27); úsala sólo para las muletillas del narrador.
- No elijas la plantilla por gusto ni repitas la de la semana anterior.

## Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| La imagen destacada del blog se ve cortada | el archivo del blog recorta la destacada en cuadrado | agrega la versión 1:1 con su plantilla propia; nunca recortes la portada 4:5 |
| El verde no se lee en el blog | el verde sobre blanco da ~2,25:1 | pasa ese momento de marca a un bloque navy |
| La lámina con lente tiene dos esferas | la opinión cierra con la manzana y además está la lente | quita la manzana del cierre: con lente, la esfera es la lente |
| Los bytes cortan la cara de una persona | la falla se aplicó sobre el borde equivocado | desarma la foto por el otro borde (abajo o lateral) o cambia la foto |
| En el reel, un gráfico queda tapado por la interfaz de la app | el gráfico cayó en una zona reservada | muévelo a su zona del mapa (cabecera 240–440, texto 1150–1480) |
| La tarjeta final se ve sucia al publicar | la compresión del video ensucia las texturas finas | quita las texturas finas de la tarjeta |
| Dos semanas seguidas con la misma portada | no se revisó la plantilla anterior | aplica la regla de rotación y cambia a la siguiente que el contenido permita |
| El callout v2 no aparece en WordPress | el bloque `efeoncepro/glitch-drop` publicado sigue en el v1 | el v2 está aprobado desde la #17, pero el bloque se actualiza antes de publicarla (TASK-1337); avisa si la #17 está por salir sin el bloque nuevo |
| Un agente pregunta qué número lleva la edición, o copia el «#11» de una maqueta | los «#11»–«#14» del canvas son ejemplos de diseño | la próxima es la **#17**: la serie sigue la del blog y del pipeline editorial (decisión del operador, 2026-09-27) |

## Referencias técnicas

- Norma de la sub-línea: [`docs/operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md`](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md)
- Decisión: [`docs/architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md`](../../architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md)
- Línea madre: [`EFEONCE_GRAPHIC_LINE_V1.md`](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md) (§7 «Efeonce firma todo», §8.5 firma y burbuja, §14 iconografía)
- Canvas: [«Glitch en La órbita»](https://claude.ai/artifact/N3Yg5cyz2zXa36SwtWVHYS) (privado)
- Glitch como franquicia: [PDR-020 §6](../../public-site/decisions/PDR-020-canales-propios-sistema-editorial.md#6-glitch-es-una-franquicia-cross-superficie-nunca-una-marca-social-nueva)
- Bloque del Glitch Drop en WordPress: [wireframe TASK-1337](../../ui/wireframes/TASK-1337-glitch-gutenberg-block.md)
- Pipeline editorial: [ADR del pipeline de Glitch](../../architecture/GREENHOUSE_GLITCH_AGENTIC_EDITORIAL_PIPELINE_DECISION_V1.md)
- Skill para agentes: `efeonce-graphic-line`, `references/glitch.md`
- Video y motion: [Editar el video de Glitch](./editar-video-glitch.md) · [Producir el motion, el sonido y la música de Glitch](./producir-motion-glitch.md) · repo taller `efeoncepro/efeonce-brand-workshop` (`tools/glitch-motion/`) · [ADR del taller](../../architecture/EFEONCE_BRAND_WORKSHOP_REPO_DECISION_V1.md) · [TASK-1924](../../tasks/to-do/TASK-1924-glitch-motion-overlays-hyperframes.md)
- AXIS (publicado): [/references/glitch/](https://axis.efeonce.org/references/glitch/), `/references/glitch.json` y `docs/agent-composition/glitch.md` de `efeoncepro/axis-design-system`

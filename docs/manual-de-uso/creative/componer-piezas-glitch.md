# Componer piezas de Glitch — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-09-27 por Claude
> **Ultima actualizacion:** 2026-09-27 por Claude
> **Modulo:** Creative · Glitch, magazine semanal de Efeonce (sub-línea de «La órbita»)
> **Ruta en portal:** no aplica — las piezas se arman desde el canvas de diseño; todavía no hay composición automática
> **Documentacion relacionada:** [Documentación funcional](../../documentation/creative/linea-grafica-glitch.md) · [Norma de la sub-línea](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md) · [ADR](../../architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md) · [Usar la línea gráfica de Efeonce](./usar-linea-grafica-efeonce.md)

> **⚠️ Este manual es SÓLO para piezas de Glitch.** Para cualquier otra pieza de Efeonce usa
> [Usar la línea gráfica de Efeonce](./usar-linea-grafica-efeonce.md). La manzana, el verde Glitch, los bytes, Guttery y
> la cabecera «EDICIÓN #N» **no** van en piezas de Efeonce.

## Para qué sirve

Explica cómo armar las piezas de una edición de Glitch con su línea gráfica: la portada según la regla de rotación, las
láminas del carrusel de LinkedIn, la contraportada, las piezas del blog y los gráficos del video (vlog horizontal y reel
vertical).

**Hoy no hay composición automática.** El motor de composición y los gráficos animados para video (Artifact Composer y
HyperFrames) son una propuesta pendiente de aprobación. Por ahora se parte del **canvas de diseño** y se ajusta a mano
siguiendo la norma.

## Antes de empezar

- **Confirma que la pieza es de Glitch.** Si no, este manual no aplica.
- **Abre el canvas** [«Glitch en La órbita»](https://claude.ai/artifact/N3Yg5cyz2zXa36SwtWVHYS) (privado). La sección
  «Sistema de portada» es la aprobada; «Blog y vlog» y «Vlog en reel» son propuesta.
- **Ten a mano la norma** ([`GLITCH_GRAPHIC_LINE_V1.md`](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md)):
  ahí están los colores, las letras, la cabecera y las medidas.
- **Ten el contenido de la edición:** número (la próxima es la #11), tesis de la semana, las ocho noticias con su sección
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
7. **Lente (sólo propuesta):** si la opinión habla de un detalle nítido de la foto, la variante con lente existe en el
   canvas, pero no está aprobada. Si se usa en una prueba, la opinión **no** cierra con la manzana (una sola esfera).

### Paso 4 · Arma la contraportada

1. «El micrófono se cierra» con contraste de pesos; los puntos se resuelven en la manzana.
2. Textura de manzana en bytes.
3. Fila de acciones Plastilina «SI TE SIRVIÓ»: guardar, compartir, recomendar, comentar.
4. CTA en píldora blanca «Suscríbete a [logo de Glitch]».
5. La misma cabecera; firma de Efeonce con el eslogan «Empower your Growth», más chico que el logo.

### Paso 5 · Piezas del blog (propuesta)

Todo el blog está en **propuesta**. Mientras no se apruebe, publica con la estructura vigente del post y usa estas piezas
sólo para mostrarlas al operador:

- Banners 16:9 con las plantillas A/B/C en horizontal, sin «Desliza», más una versión **1:1** porque el archivo del blog
  recorta la imagen destacada en cuadrado (sirve la portada 4:5 recortada).
- Apertura navy «El micrófono se abre» + tesis + «Vamos.», escaleta de las ocho, banners internos por noticia, callout
  Glitch v2, banner de suscripción, vlog embebido, «El hilo de la semana» y el cierre «El micrófono se cierra.» + «— El
  equipo editorial de Glitch».
- El **callout v2** no se puede usar en WordPress todavía: exige actualizar el bloque `efeoncepro/glitch-drop`. El bloque
  publicado hoy es el v1.
- En el blog, que es claro, **el verde no va como texto, borde ni línea**: los momentos de marca van en bloques navy.

### Paso 6 · Video (propuesta)

Todo el video está en **propuesta**. Si se produce una prueba:

1. Graba **una vez** en 4K horizontal con aire arriba y abajo; el reel sale del recorte vertical.
2. Subtítulos siempre: Poppins 600, blanco sobre navy al 78 %, una palabra en el acento.
3. Imagen de las fuentes: embebida o licenciada, nunca descargada; en navy, con bytes en el borde y crédito.
4. **Reel:** los gráficos van **encima** de la toma, porque el host está en cámara todo el tiempo. Respeta el mapa de
   zonas del lienzo 1080 × 1920: nada entre 0 y 220 ni desde 1500 (interfaz de la app), nada desde x 940 (botones),
   cabecera entre 240 y 440, texto entre 1150 y 1480, y **nunca** sobre la cara del host.
5. Las ocho piezas del reel son transparentes: apertura, cabecera (noticia n/3 + logo), lower third, subtítulo, tarjeta de
   noticia, imagen de la fuente (plano dividido), Glitch Drop y última frase («el #12 sale el lunes.» + «Sigue a
   Glitch»). Sólo la portada del reel y la tarjeta final son pantalla completa.
6. **Tarjeta final:** centrada, espejo de la apertura (los puntos se resuelven en la manzana, para que el reel empalme en
   loop), un mensaje, una acción, la firma y sin texturas finas.
7. Hoy los gráficos se hacen a mano desde el canvas: todavía no hay render automático con fondo transparente.

### Paso 7 · Revisa antes de entregar

- [ ] La plantilla de portada no repite la de la semana pasada.
- [ ] Hay **una sola esfera** por pieza (manzana o lente, nunca las dos).
- [ ] Ningún byte ni gráfico pasa sobre una cara ni sobre la interfaz de la app.
- [ ] El verde no aparece como texto, borde ni línea sobre fondo claro.
- [ ] Cada pieza firma con el logo de Efeonce centrado; no hay dirección web escrita ni burbuja URL.
- [ ] Toda foto tiene crédito y licencia; ningún clip de terceros fue descargado.
- [ ] Ninguna pieza en **propuesta** o **exploración** salió como final sin aprobación.
- [ ] Ningún elemento de Glitch se coló en una pieza de Efeonce.

## Qué significan los estados

| Estado | Qué significa |
|---|---|
| **APROBADO** (2026-09-27) | se usa como pieza final: portada A/B/C con rotación, lámina interior, noticia 1 y contraportada |
| **PROPUESTA** | se puede armar para mostrarla al operador, pero no se publica como final: lente, blog, vlog 16:9, reel, tarjetas finales y el flujo de composición automática |
| **EXPLORACIÓN** | idea en estudio, no canon: la manzana y el verde como token oficial, los acentos teal y naranja del canvas, la historia 9:16 y el carrusel panorámico |
| **Alta pendiente** | los cinco íconos Plastilina de Glitch existen, pero todavía no están en el catálogo oficial de AXIS |
| **Sin publicar** (AXIS) | la página y la guía de Glitch en AXIS existen en una rama, sin publicar hasta que el operador lo autorice |

## Qué no hacer

- No uses la manzana, el verde Glitch, los bytes, Guttery ni la cabecera «EDICIÓN #N» en piezas de Efeonce.
- No pongas dos esferas en la misma pieza (manzana y lente, o manzana y órbita).
- No uses el verde como texto, borde o separador sobre fondo claro.
- No pongas bytes ni gráficos sobre una cara, ni gráficos sobre la interfaz de la app en el reel.
- No agregues una órbita decorativa: si no dice nada, no va (así se descartó la contraportada con órbita 8/8).
- No escribas la dirección web como texto ni uses la burbuja URL de La órbita.
- No descargues clips de terceros para subirlos: embébelos o licéncialos.
- No publiques titulares o noticias de las maquetas: son de ejemplo.
- No uses Guttery en web o video como pieza final hasta confirmar su licencia.
- No elijas la plantilla por gusto ni repitas la de la semana anterior.

## Problemas comunes

| Síntoma | Causa | Solución |
|---|---|---|
| La imagen destacada del blog se ve cortada | el archivo del blog recorta la destacada en cuadrado | agrega la versión 1:1 (la portada 4:5 recortada) |
| El verde no se lee en el blog | el verde sobre blanco da ~2,25:1 | pasa ese momento de marca a un bloque navy |
| La lámina con lente tiene dos esferas | la opinión cierra con la manzana y además está la lente | quita la manzana del cierre: con lente, la esfera es la lente |
| Los bytes cortan la cara de una persona | la falla se aplicó sobre el borde equivocado | desarma la foto por el otro borde (abajo o lateral) o cambia la foto |
| En el reel, un gráfico queda tapado por la interfaz de la app | el gráfico cayó en una zona reservada | muévelo a su zona del mapa (cabecera 240–440, texto 1150–1480) |
| La tarjeta final se ve sucia al publicar | la compresión del video ensucia las texturas finas | quita las texturas finas de la tarjeta |
| Dos semanas seguidas con la misma portada | no se revisó la plantilla anterior | aplica la regla de rotación y cambia a la siguiente que el contenido permita |
| El callout v2 no aparece en WordPress | el bloque `efeoncepro/glitch-drop` publicado es el v1 | el v2 es propuesta; requiere actualizar el bloque antes de usarlo |
| Un agente pregunta qué número lleva la edición | la numeración del operador (la próxima, #11) no coincide con la del pipeline editorial | usa la numeración del operador y avisa la diferencia |

## Referencias técnicas

- Norma de la sub-línea: [`docs/operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md`](../../operations/brand-graphic-line/glitch/GLITCH_GRAPHIC_LINE_V1.md)
- Decisión: [`docs/architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md`](../../architecture/GLITCH_GRAPHIC_LINE_DECISION_V1.md)
- Línea madre: [`EFEONCE_GRAPHIC_LINE_V1.md`](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md) (§7 «Efeonce firma todo», §8.5 firma y burbuja, §14 iconografía)
- Canvas: [«Glitch en La órbita»](https://claude.ai/artifact/N3Yg5cyz2zXa36SwtWVHYS) (privado)
- Glitch como franquicia: [PDR-020 §6](../../public-site/decisions/PDR-020-canales-propios-sistema-editorial.md#6-glitch-es-una-franquicia-cross-superficie-nunca-una-marca-social-nueva)
- Bloque del Glitch Drop en WordPress: [wireframe TASK-1337](../../ui/wireframes/TASK-1337-glitch-gutenberg-block.md)
- Pipeline editorial: [ADR del pipeline de Glitch](../../architecture/GREENHOUSE_GLITCH_AGENTIC_EDITORIAL_PIPELINE_DECISION_V1.md)
- Skill para agentes: `efeonce-graphic-line`, `references/glitch.md`
- AXIS (sin publicar): `/references/glitch/`, `/references/glitch.json` y `docs/agent-composition/glitch.md` en la rama `feat/glitch-line` de `efeoncepro/axis-design-system`

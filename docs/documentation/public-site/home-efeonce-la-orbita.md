# Home de Efeonce — «La órbita»

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-10-29 por Claude
> **Ultima actualizacion:** 2026-10-29 por Claude
> **Documentacion tecnica:** [HOME_INICIO_ELEMENTOR_MODULES_V1.md](../../architecture/public-site/HOME_INICIO_ELEMENTOR_MODULES_V1.md)
> **Manual:** [operar-home-efeonce.md](../../manual-de-uso/public-site/operar-home-efeonce.md)

## Qué es

La portada de [efeoncepro.com](https://efeoncepro.com/) se rediseñó el 2026-10-29. Usa la línea gráfica «La órbita»
de Efeonce y un movimiento inspirado en getpingback.com: resortes, un hero que rota, cintas inclinadas, un acordeón
de pestañas verticales, interruptores y tarjetas en abanico. Reemplazó a la home anterior en la misma dirección, sin
cambiar su título en Google, su canónico ni su indexación.

El menú de arriba y el footer son los mismos del resto del sitio; la página sólo cambia lo que hay entre ellos.

> Detalle técnico: identidad de la página, hashes y snapshots en el
> [contrato técnico](../../architecture/public-site/HOME_INICIO_ELEMENTOR_MODULES_V1.md#identidad-y-estado-vigente).

## Para quién es

Para empresas de más de 50 personas en Chile, Colombia, México, Perú y Estados Unidos. Le habla al grupo que decide
la compra: CMO, Head of Growth, CEO y CTO.

## Secciones de la página

| # | Sección | Qué muestra y cómo se comporta |
| --- | --- | --- |
| 1 | Hero | La pregunta «¿Qué necesita tu marketing?» y cinco respuestas que rotan: Crecer, Destacar, Aparecer, Rendir y Vender. Cada línea trae una persona del elenco de marca dentro de la lente y su propio color de acento. |
| 2 | Marcas | Una cinta en movimiento con logos de clientes y de plataformas. |
| 3 | Motor | Una escena que avanza con el scroll: de trabajar por separado a un solo motor, con el logo dentro del anillo. |
| 4 | Líneas | Un acordeón con las cinco líneas de servicio y enlaces a sus landings; muestra las plataformas de Voice, los lockups de Greenhouse, Globe, Wave y Reach, y HubSpot y Salesforce. |
| 5 | Trabajo | Dos cintas con piezas y videos de clientes como Sky, Berel, Bresler, Eusari, GORE, Marca Chile y Pabellón, igual que en la landing Agencia Creativa. Los videos sólo se reproducen cuando están en pantalla. |
| 6 | AEO — «Pregunta en vivo» | Un campo grande que escribe solo una pregunta distinta por cada motor de IA (ChatGPT, Gemini, Perplexity, Google IA y Claude) y muestra la respuesta en filas. Con el scroll, «Tu marca» pasa de no aparecer, a ser mencionada, a salir primera con fuente; una esfera recorre esas tres etapas. |
| 7 | Agentes | La «Constelación de Sparks»: 18 personajes (en 3D, de las cinco líneas, en distintos estados y acciones, más algunos en 2D al fondo) flotando a distintas profundidades alrededor del titular. Se mueven con el cursor y el scroll; al pasar sobre uno aparece su línea y lo que hace. Fondo blanco. |
| 8 | Greenhouse | La vista de marketing y de gerencia de Greenhouse, la plataforma donde el cliente ve su operación. |
| 9 | Método | Una órbita que recorre los cuatro pasos del método. |
| 10 | Respaldo | Testimonios de Constanza Rojas y Adriana Contreras (Team SKY), que rotan cada 8 segundos, con el enlace «Mira nuestro primer año con SKY»; un abanico de partners y un comparador. |
| 11 | Preguntas frecuentes | Preguntas y respuestas en un panel. |
| 12 | Agenda | El botón para agendar una conversación: abre el mismo agendador del menú del sitio. Si no está disponible, el respaldo es la página `/agenda/`. |

Cuando la home habla de cuántas marcas confían en Efeonce, la cifra es «+90 marcas».

Los Sparks normalmente llevan sólo el color de su línea. En la home se aceptó una excepción: como la página muestra
todas las líneas, la constelación mezcla los colores de las cinco.

Los testimonios son reseñas textuales publicadas en experiencia.efeoncepro.com. Se presentan como prueba de una
relación de trabajo, no como resultado de un servicio específico.

## Qué es ilustrativo

- **AEO «Pregunta en vivo»:** es un ejemplo. Las preguntas, respuestas y etapas de «Tu marca» no son una medición
  real de ninguna marca.
- **Greenhouse:** las cifras de la vista son ilustrativas, no datos en vivo de un cliente.

## Cómo se comporta en distintas pantallas

- En teléfono y tablet (pasada del 2026-10-29), cada escena tiene su versión táctil: deslizar la lente del hero cambia la
  línea; tocar un Spark muestra qué hace (y, si nadie toca, la sección los va presentando uno a uno); deslizar cambia la
  cita de los testimonios o la vista del tablero de Greenhouse; las cintas de trabajos se pueden arrastrar.
- Las escenas que dependen del scroll (el motor, la respuesta AEO, el ciclo del método) ocurren mientras se ven en
  pantalla. En AEO, la respuesta cambia al bajar, como dice la pantalla. Se ocultan los Sparks de media altura y las
  tarjetas del motor se ubican en las cuatro esquinas.
- La barra inferior de acciones aparece después del inicio y se detiene antes de «Conversemos»; mientras se muestra, el
  selector de tema claro u oscuro sube para no quedar debajo.
- Si la persona tiene activada la opción de reducir movimiento, todo queda quieto y legible.
- Para lectores de pantalla, el título principal se lee completo: «¿Qué necesita tu marketing? Crecer, destacar,
  aparecer, rendir y vender.». Las letras animadas son decorativas.

## Qué se edita

Todo el contenido se edita desde Elementor, incluidas las variantes que rotan (las palabras del hero, las preguntas
AEO, los estados de «Tu marca», las vistas de Greenhouse, los pasos del método, los testimonios, las columnas del
comparador y las preguntas frecuentes). El diseño cambia sólo recompilando desde el canvas aprobado.

> Detalle técnico: [compilador y repetidores](../../architecture/public-site/HOME_INICIO_ELEMENTOR_MODULES_V1.md#compilador);
> paso a paso en el [manual](../../manual-de-uso/public-site/operar-home-efeonce.md).

## Cómo se ve al compartirla

Al compartir la portada en redes o chats aparece una imagen nueva de 1200×630: la lente con una persona del elenco de
marca y el logo centrado abajo, la pregunta y «Crecer.» a la izquierda, y Destacar, Aparecer, Rendir y Vender a la
derecha. Está centrada para que se vea bien también en los recortes cuadrados de los chats y en el formato ancho de X.
El título al compartir es «¿Qué necesita tu marketing? | Efeonce».

Las redes guardan la imagen anterior en caché: al compartir por primera vez conviene refrescarla en LinkedIn Post
Inspector y en Facebook Sharing Debugger.

> Detalle técnico: [SEO y social](../../architecture/public-site/HOME_INICIO_ELEMENTOR_MODULES_V1.md#seo-y-social).

## Lo que se quitó

- El cierre de marca del diseño (logo en órbita, «Empower your Growth» y «Desde Santiago, operando en…») no se
  publicó: no tenía lugar en la home.
- El menú dibujado en el diseño no se usó: manda el menú canónico del sitio.
- El 2026-10-29 se retiraron las homes antiguas y las demos del tema: quedaron en la papelera y sus direcciones llevan
  a la portada. [Lista y evidencia](../../audits/public-site/2026-10-29-home-orbita-rediseno-y-seo.md#páginas-retiradas).

## Pendientes

- La velocidad de carga medida con PageSpeed y los datos de experiencia real de Google no se han medido todavía.
- Ver el [backlog global del sitio](../../audits/public-site/2026-10-29-home-orbita-rediseno-y-seo.md#backlog-global).

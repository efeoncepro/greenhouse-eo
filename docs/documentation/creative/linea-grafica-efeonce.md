# Línea gráfica Efeonce — La órbita

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.20
> **Creado:** 2026-09-25 por Claude
> **Ultima actualizacion:** 2026-10-02 por Claude (1.20: delta — registro cine: cómo se produce una foto de cine sin consultar a nadie (recetas aprobadas, ficha con los campos del oficio, revisor, medidor y las siete decisiones del operador). Antes, 1.19: delta — el traje biónico de Nexa y sus lentes, sólo en fotos de cine, con las marcas ya puestas; sus 12 expresiones; la escena con los Sparks que sirve de modelo. Antes, 1.18: delta — los Sparks, los agentes de Efeonce, entran como personajes propios de la marca y único robot permitido en una foto. Antes, 1.17: delta — los perfiles sociales de Efeonce (portadas de LinkedIn, Facebook y YouTube, avatar de redes, destacados de Instagram y las portadas de LinkedIn personales del equipo) entran a la línea; fila nueva en «Dónde está cada cosa» y pendiente de publicación. Antes, 2026-09-28, 1.16: delta — los slots de datos de un deck (logo del cliente, cifras, casos, testimonios, logos, montos y equipo) se llenan desde Greenhouse con su fuente, o quedan sin ligar y la lámina no sale (TASK-1930). Antes, 1.15: delta — el plan de un deck se valida contra el catálogo de recetas y un agente puede proponerlo, con `pnpm brand:deck-plan` (TASK-1929). Antes, 1.14: las 69 láminas del deck se componen solas con `pnpm brand:compose` (TASK-1928), incluida la portada de brochure con la selección de Nexa; enlace a la documentación funcional de la composición de decks y brochures. Antes, 1.13: las 69 láminas del deck aprobadas y convertidas en recetas por lámina, con cómo elegir una lámina por documento y la excepción del estilo de cine para secciones y «quiénes somos». Antes, 1.12: delta de portadas y contraportadas del brochure y la propuesta — foto y sin foto se alternan, mensaje de la contraportada según el documento y voz en la portada. Antes, 1.11: 19 íconos de IA, redes sociales y staff, D26 — el set queda en 79, con 43 en volumen. Antes, 1.10: las piezas aprobadas por superficie salen enteras con un comando, `pnpm brand:compose`, desde el Artifact Composer. Antes, 1.9: 30 íconos de oficio — el set queda en 60, con 33 en volumen. Antes, 1.8: sección «Plastilina en volumen» — la tercera capa de los íconos, para momentos protagonistas. Antes, 1.7: sección «Componer por superficie» — web, DOOH, pDOOH, motion, video y deck, con la lámina de propuesta de cine. Antes, 1.6: sección «Los íconos» — iconografía canónica Trazo y Plastilina, publicada en AXIS `v0.3.6`)
> **Documentacion tecnica:** [Manual de la línea gráfica V1](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md) · [ADR «La órbita»](../../architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md)
> **Manual de uso:** [Usar la línea gráfica de Efeonce](../../manual-de-uso/creative/usar-linea-grafica-efeonce.md)

## Qué es

La línea gráfica de Efeonce es la **forma propia** con la que se reconocen las piezas de la marca, además del logo,
la paleta, la tipografía y el lenguaje fotográfico. Se llama **«La órbita»** y quedó canonizada el 2026-09-25.

La órbita es un **anillo fino**, un **arco** que avanza por él con una **esfera** en la punta y un **halo** de luz
suave. No es un símbolo nuevo: sale del isotipo de Efeonce (la nave, que ya tiene su anillo y su esfera). Por eso el
isotipo nunca lleva otra órbita encima.

La idea que la sostiene cabe en una frase: **una esfera que recorre su órbita**. El avance se ve, el oficio está a la
vista y la conversación cierra con una respuesta.

> Detalle técnico: [manual §0 y §1](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#0-en-una-frase) · [ADR, decisión 1](../../architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md#decisión)

## Para qué sirve

La órbita hace tres trabajos, y los tres son parte de un mismo sistema:

| Trabajo | Qué significa | Ejemplo |
|---|---|---|
| **Rodea** | enmarca una palabra, una foto u objeto, dejándolo al centro | la órbita alrededor de «Hacer.» en una taza |
| **Mide** | el arco muestra un avance real; **sin dato no hay arco** | un informe donde el arco llega hasta el porcentaje logrado |
| **Enfoca** | la «lente»: la foto entera en navy apagado y, dentro del círculo, a todo color | una foto del equipo trabajando donde la lente marca dónde está la decisión |

Además hay una gramática que ordena la voz y los objetos: **anillo = pregunta** (lo abierto, lo libre) y
**esfera = respuesta** (lo decidido, lo ocupado). En la oficina, por ejemplo, una sala libre se marca con el anillo y
una ocupada con la esfera, sin semáforos de colores.

> Detalle técnico: [manual §1.3 a §1.5](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#13-la-órbita--anatomía-y-regla) y [§10.3 Oficina](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#103-oficina)

## A qué marcas y piezas aplica

**Marcas:** Efeonce y su familia de productos — **Globe** (Creative Studio), **Wave** (búsqueda, web y medición) y
**Reach** (medios y distribución). Es un solo lenguaje con cuatro acentos: la forma es la misma y **cambia sólo el
color** de la esfera y del anillo (teal para Efeonce y un acento propio para Globe, Wave y Reach).

**Piezas:** todo lo que Efeonce produce para sí misma:

- redes sociales y campañas;
- decks, informes y documentos;
- oficina (recepción, salas, señalética, muros);
- merch (tazas, botellas, lapiceros, pulseras, llaveros, paraguas);
- vestuario (ediciones nuevas; el uniforme actual sigue vigente);
- identificación (carnet, credencial de evento, tarjeta, pin);
- eventos y stand, caja de bienvenida y envíos;
- papelería (hoja membretada, sobre) y firma de mail.

**No aplica** a la interfaz de Greenhouse (el portal tiene su propio sistema visual) ni al trabajo que Efeonce hace
para clientes. La línea es de Efeonce; Greenhouse sólo la documenta.

> Detalle técnico: [manual §7 La familia](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#7-la-familia) · [§10 Aplicaciones](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#10-aplicaciones) · [ADR, decisión 6](../../architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md#decisión)

## Quién la usa

| Perfil | Para qué |
|---|---|
| Diseño y dirección de arte | producir piezas de marca propia y revisar que cumplan |
| Marketing y contenidos | armar posts, campañas, decks e informes de Efeonce |
| Operaciones y administración | pedir merch, papelería, credenciales y señalética a proveedores |
| Agentes (Claude, Codex) | producir o auditar piezas con las reglas y los valores oficiales |

## Reglas clave

Estas son las reglas que no se negocian. El manual tiene el detalle y las medidas.

| Regla | Qué significa en la práctica |
|---|---|
| **Ningún texto cruza la órbita** | el texto vive al costado (normalmente abajo a la izquierda) y la órbita al otro lado; nunca se superponen |
| **La pieza firma con el logo centrado** | un post, un anuncio o una portada con foto se firma con el logo de Efeonce abajo, al centro. La portada de un deck, brochure o propuesta no: lleva el logo grande arriba, junto al texto (2026-09-27) |
| **La burbuja de la dirección web sólo firma si el logo ya está en la imagen** | si la foto ya muestra el logo de Efeonce (en un objeto, una prenda o una maqueta), la firma pasa a ser la burbuja de `efeoncepro.com`, centrada y fundida con el fondo, y nunca al lado del logo. Sólo se lee bien sobre un fondo muy oscuro |
| **La URL va siempre en su burbuja** | donde aparezca `efeoncepro.com` se usa la burbuja oficial, nunca la dirección escrita como texto. En pies de decks, informes, papelería, stand y firma de mail se sigue usando como siempre |
| **La órbita no reemplaza la composición de la foto** | se usa en casos puntuales y a propósito, no en toda pieza; nunca tapa a la persona u objeto principal, el espacio del texto, la base donde se apoya el texto ni la firma |
| **Una órbita o una lente por pieza** | nunca como patrón repetido, ni dos en la misma pieza, muro o vidrio |
| **Sin dato no hay arco de avance** | el arco que mide sólo aparece si mide un número real |
| **La órbita nunca rodea el logo** | rodea palabras, fotos u objetos; en los objetos el logo va solo, en el dorso |
| **Un acento por pieza** | el teal es sólo de Efeonce y no aparece en piezas de producto |
| **La foto sale del lenguaje fotográfico** | tomas documentales del oficio, sin logos legibles en la ropa, sin velos oscuros encima, nunca de banco de imágenes |
| **Pregunta chica, respuesta grande** | la pregunta en Poppins Light; la respuesta en Bricolage, de una a tres palabras y cerrada con la esfera |

> Detalle técnico: [manual §11 Do's & Don'ts](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#11-dos--donts--resumen) · [§1.3 la órbita no sustituye la composición](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#13-la-órbita--anatomía-y-regla) · [§8.5 La URL y la firma (contraste medido de la burbuja)](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#85-la-url-siempre-en-su-burbuja) · [§9 Fotografía](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#9-fotografía)

## La foto de la lente

La lente necesita fotos con un punto de interés claro. Para no repetir siempre las mismas tres fotos (que además
tenían un emblema legible), el 2026-09-25 se produjo un **banco propio de ocho tomas documentales** del oficio de
Efeonce: manos ajustando una curva de color, elegir entre pruebas de una etiqueta, un informe impreso, una llamada
con cliente, una pieza proyectada, entre otras. Se hicieron con la cadena del lenguaje fotográfico
(`pnpm foto:generar`) y tres de ellas se rehicieron porque no cumplían ese lenguaje.

> Detalle técnico: [manual §9](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#9-fotografía) · [lenguaje fotográfico](../../operations/brand-photography/README.md) · `ai-generations/2026-09-25_banco-lente-orbita/LEEME.md`

## El merch y la oficina, fotografiados

Para mostrar cómo se verían las aplicaciones en la realidad, el canvas tiene dos láminas con fotos generadas con IA:
**merch en foto** (17 fotos de producto) y **oficina en foto** (9 fotos: recepción, sala, pasillo, pizarra, estado de
sala, muro de voz, cocina, puesto de bienvenida y cabinas). El arte plano de cada pieza es la referencia exacta; la IA
sólo pone el espacio, el material y la luz, y nadie en la foto mira a la cámara.

Lo que se aprendió al hacer la oficina:

- **La IA copia todo lo que ve en el arte, también las notas de la lámina.** El arte que se le pasa debe ir sin
  leyendas.
- **El logo chico se deforma.** Hay que revisarlo al 100 % y, si salió mal, corregirlo con el logo oficial como
  segunda referencia.
- **La puntuación se revisa letra por letra** (por ejemplo, un espacio antes del punto).
- **Se corrige editando la foto que salió**, no generándola de nuevo: editar conserva lo que ya estaba bien.

Estas fotos son **maquetas para decidir la dirección**, no la producción: lo que se fabrica sale de los archivos
vectoriales, con prueba de color sobre el material real.

> Detalle técnico: [manual §10.8 Merch en foto y §10.9 Oficina en foto](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#109-oficina-en-foto) · `ai-generations/2026-09-25_efeonce-studio-props/exploracion-v5/oficina-ia/LEEME.md`

## La línea en movimiento

La órbita también se mueve, y el logo tiene tres animaciones propias, aprobadas el 2026-09-26 (versión 1.1):

| Animación | Qué se ve | Dura | Para qué |
|---|---|---|---|
| **Órbita** (sin logo) | aparece el anillo, avanza el arco, la esfera se asienta y sube el halo | 2,0 s y medio segundo de reposo | fondos de portada, cierres de presentación y piezas que ya tienen su propia firma o texto |
| **Reveal** | la línea se convierte en el logo: el anillo se inclina, la esfera se vuelve planeta y entra la nave | 3,6 s | cierre de video, apertura de presentación, intro de evento |
| **Apertura** | el recorrido inverso: el logo se abre y deja la línea lista para componer | 2,4 s | pasar del logo al lenguaje de la línea |
| **Sting** | el golpe corto: la nave encaja y aparece el logotipo | 1,6 s | cortinillas, redes y cierres breves |

Las animaciones del logo se hacen en código a partir de los archivos oficiales, nunca con un modelo de video (el
logo no se sostiene). Son marca propia de Efeonce: no se usan para clientes ni en el portal. Vienen con fondo y
sonido (para usarlas tal cual) o transparentes (para montarlas sobre otro fondo en un editor de video).

**Cómo se mueve la marca.** Desde el 2026-09-26 esa manera de moverse es una norma, el *lenguaje de movimiento de la
órbita*, con siete reglas para que cualquier pieza nueva (una cortinilla, un cierre de evento, otra marca de la
familia) se sienta igual:

1. **Lento, rápido, lento:** una pausa o un pequeño retroceso antes de arrancar, un tramo rápido y un final con golpe;
   un solo protagonista a la vez.
2. **Llegar con golpe:** lo que llega se pasa un poco y vuelve; al encajar hay un pulso y una onda en el color de
   acento. Nada se detiene suavemente ni tiembla.
3. **Curvas según el papel:** una para lo que llega, otra para lo que cambia y otra para lo que se va.
4. **Sin frenazos en los relevos:** cuando un movimiento le pasa el turno al siguiente, la velocidad se mantiene.
5. **Movimiento real:** desenfoque sólo en los tramos rápidos y colores que se mezclan sin pasar por gris.
6. **La marca manda:** todo sale de los archivos oficiales; el logo final ocupa la mitad del lado corto en horizontal,
   un poco más en cuadrado y dos tercios en vertical, y el eslogan mide el 64 % del logo.
7. **El sonido acompaña el golpe:** un golpe sonoro por cada impacto y un cierre con fundido.

Los números (tiempos, cuánto se pasa cada cosa, tamaños) no están en este documento ni en los scripts: viven en los
tokens de AXIS (`efeonceGraphicLine.motion`), y el generador de las animaciones los lee de ahí.

> Detalle técnico: [norma del lenguaje de movimiento](../../operations/brand-graphic-line/EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md) · [spec de motion](../../operations/brand-graphic-line/EFEONCE_ORBIT_REVEAL_MOTION_V1.md) · [manual §10.1](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#101-pantalla-y-campaña) · [cómo usarlas](../../manual-de-uso/creative/usar-linea-grafica-efeonce.md#paso-a-paso--usar-las-animaciones-de-marca)

## La firma de correo

Aprobada el 2026-09-26 en dos versiones: **A**, sobre el fondo blanco del correo, y **B**, una tarjeta navy. Se lee de
arriba abajo así: la foto con su órbita, el nombre y el cargo, el teléfono y el correo, el sitio y LinkedIn; después
**la línea que termina en la esfera**, el logo de Efeonce con «Empower your Growth», y al final una **línea fina sin
esfera** que abre la zona «Partner oficial de», con los logos de los partners en gris.

| Regla | Por qué |
|---|---|
| La línea con la esfera aparece una sola vez | es parte de la identidad; repetida, deja de serlo |
| Los partners van en su propia zona, separados por una línea fina | pegados al logo, se leían como parte de la marca de Efeonce |
| Los logos de los partners van en un solo gris y con el mismo peso visual | ninguno domina y la franja no compite con la marca |
| Sólo aparecen partners que el registro permite declarar | la firma no puede afirmar una relación que no existe |
| Sin «Quedo atento» ni «Saludos» | eso va en el cuerpo del correo |
| Para responder y reenviar, una línea de texto | no se repiten imágenes en cada respuesta |
| Los buzones de área (Talent, Finance, Commercial) firman sin foto: la órbita rodea el ícono del área | un equipo no es una persona; el ícono dice qué área responde |

> Detalle técnico: [manual §10.2](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#102-firma-de-mail) ·
> contrato `efeonce.email-signature` y tokens `efeonceGraphicLine.emailSignature` en AXIS.

## Los íconos

Desde el 2026-09-26 la línea tiene su **propia iconografía**, canónica y sólo para la marca propia de Efeonce y su
familia. No se usa en trabajo de clientes ni en la interfaz de Greenhouse, que tiene sus propios íconos. Son **dos
voces de una misma familia**, y la voz la decide la línea de servicio de la pieza:

| Voz | Qué dice | Líneas | Dónde aparece | Cómo se ve |
|---|---|---|---|---|
| **Trazo** | lo que se mide | Growth, Engine y Revenue | decks, informes, dashboards, listas, navegación | línea limpia y fina, con remates redondos |
| **Plastilina** | lo que se crea | Brand (servicios creativos) | piezas sociales, portadas, stickers, momentos del oficio | objeto de masa blanda, inclinado, tomado en uso y con calados |

La línea Voice (medios) todavía no tiene voz fija: se elige con criterio y se declara en la pieza.

| Regla | Qué significa en la práctica |
|---|---|
| **La esfera es un estado** | en reposo el ícono es sólo su forma; cuando **responde**, aparece la esfera en el color de la línea de la pieza |
| **Responde uno solo** | el que importa (el servicio que se vende, la sección donde vamos), y sólo si la pieza no tiene ya otra esfera |
| **El color es de la pieza, no del ícono** | el mismo ícono va en teal en un deck de Growth y en el acento de Brand en uno de Brand |
| **Plano y sobre el mismo fondo** | fondo navy profundo en todas las líneas; sin volumen, brillo, sombras ni degradés (la única excepción es la capa «Plastilina en volumen», que se explica abajo y tiene sus propios archivos) |
| **Las voces no se mezclan** | nunca Trazo y Plastilina en un mismo grupo; si conviven, Plastilina manda en grande y el Trazo apoya en chico |
| **La órbita sesgada es la firma de Plastilina** | una elipse inclinada alrededor del objeto protagonista; una por pieza, nunca cruza el texto y **nunca mide** (lo que mide sigue en la órbita circular) |
| **Un ícono que falta no se dibuja en la pieza** | se pide, se verifica y entra al set con la aprobación del operador |

Hay **79 íconos aprobados**: 36 de Trazo y 43 de Plastilina. Los primeros 30 (12 y 18) se aprobaron el 26 de septiembre de
2026; al día siguiente el operador sumó **30 íconos de oficio**, cosas que el equipo usa todos los días y que no estaban:

| Voz | Íconos de oficio |
|---|---|
| Trazo (15) | correo, llamada, calendario, reunión, objetivo, presentación, contrato, checklist, código, base de datos, nube, integración, seguridad, ubicación, reloj |
| Plastilina (15) | lápiz, rodillo, aerosol, escuadra, post-it, encuadre, película, vinilo, guitarra, reproducir, varita, taza, lámpara, trofeo, estrella |

Algunos tienen su truco: «llamada» es el teléfono de Trazo y «teléfono» es el móvil de Plastilina; el checklist no se
usa como viñeta de una lista; la varita y la estrella no van juntas; y «encuadre» habla de composición y formatos, no de
recortar (para eso están las tijeras).

Ese mismo día sumó **19 íconos de IA, redes sociales y staff** («Subelos todos a excepción del hoodie de trazo que no
parece un hoodie»). Cada idea tiene su ícono en las dos voces, salvo el hoodie:

| Trazo (9) | Plastilina (10) |
|---|---|
| ia | chispa |
| composer | prompt |
| buscador | barra de búsqueda |
| influencer | aro de luz |
| prensa | televisión |
| social | like («Me gusta») |
| multimedia | galería |
| assets | biblioteca («Biblioteca de assets») |
| staff-gorra («Staff») | gorra («Gorra Efeonce») |
| — | hoodie («Hoodie Efeonce») |

El hoodie existe sólo en Plastilina: el de Trazo no se leía como hoodie y no entró. Ninguno copia la pantalla ni el
logo de un asistente de otra empresa (ChatGPT, Gemini), y el hoodie y la gorra no llevan logo dibujado: la marca la pone
la esfera (en la capucha y en el frente de la gorra). Para usarlos bien: el influencer de Trazo se parece a talent, así
que no van juntos; la chispa no va con la estrella ni con la varita; la galería y la biblioteca se parecen y se usan por
separado; y el prompt es el que peor se lee a 32 px.

La firma de correo y la de equipo siguen con los íconos anteriores (Tabler) hasta que el operador decida su reemplazo.

> Detalle técnico: [manual §14 Iconografía](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#14-iconografía-trazo-y-plastilina) ·
> [guía de la iconografía en AXIS](https://github.com/efeoncepro/axis-design-system/blob/main/docs/agent-composition/iconography.md) ·
> [página del Lab](https://axis.efeonce.org/references/iconography/) · tokens `efeonceGraphicLine.icons`
> (`@efeoncepro/axis-tokens` 0.3.6) y `@efeoncepro/axis-graphic-line/icons` (0.4.0; los 60 con el oficio desde 0.5.0,
> tag `v0.5.0`; los 79 con IA, social y staff desde 0.6.0, tag `v0.6.0`, AXIS main@cf77452 (2026-09-27); Greenhouse fija
> axis-graphic-line 0.6.0 y axis-brand-assets 0.3.4) ·
> [cómo usar y pedir un ícono](../../manual-de-uso/creative/usar-linea-grafica-efeonce.md#paso-a-paso--usar-un-ícono-de-la-marca)

### Plastilina en volumen

Desde el 2026-09-27 los íconos de Plastilina tienen una **tercera capa**: el mismo dibujo convertido en un objeto de
**arcilla mate, inflada y sin aristas**, como si alguien lo hubiera modelado a mano. No es un ícono nuevo: sale del
ícono plano ya aprobado, y el plano sigue existiendo y se sigue usando.

| Regla | Qué significa en la práctica |
|---|---|
| **Sólo para el momento protagonista** | la portada, el key visual, una pieza social con un solo objeto, un escenario, el merch o el objeto en escena. **Uno por pieza** |
| **Nunca en lo que se lee rápido** | ni en listas, tablas, menús, láminas de contenido de un deck, dashboards ni en la interfaz: ahí va el ícono plano o el Trazo |
| **No se mezcla** | nunca junto a íconos de Plastilina plana o de Trazo en un mismo grupo |
| **Grande o nada** | no baja de 160 px; si tiene que ir más chico, se usa el plano |
| **Ya viene listo** | el set está en respuesta, con el naranja de Brand y el gesto donde existe (rayo, bombillo, teléfono); es una imagen con fondo transparente y los huecos abiertos, así que va sobre cualquier fondo. Si la pieza necesita sombra en el piso, se agrega al componer |
| **Un objeto que falta no se inventa en 3D** | primero entra al set plano con la aprobación del operador y después se le hace el volumen |

Hay **43 íconos en volumen**, uno por cada Plastilina (los 15 de oficio y los 10 de IA, redes sociales y staff
incluidos). Se ven y se descargan en la sección «Plastilina en volumen» de la
página del Lab. Sólo son para la marca propia de Efeonce; no se usan en trabajo de clientes ni en Greenhouse, y no se
combinan en una pieza con las ilustraciones «Clay 3D» que el equipo usa en propuestas (son otra cosa).

> Detalle técnico: [manual §14.1](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#141-plastilina-en-volumen-d24-2026-09-27) ·
> [Lab, sección 05](https://axis.efeonce.org/references/iconography/#volumen) · tokens `efeonceGraphicLine.icons.volume`
> (`@efeoncepro/axis-tokens` 0.3.7) y archivos en `@efeoncepro/axis-brand-assets` 0.3.2, ambos publicados con el tag
> `v0.3.7` (Greenhouse ya fija esas versiones, commit `f3f93c926`, 2026-09-27); los 33 con el oficio, en
> `axis-brand-assets` 0.3.3 (tag `v0.5.0`); los 43 con IA, social y staff, en `axis-brand-assets` 0.3.4 (tag
> `v0.6.0`), que Greenhouse fija · [cómo usar un ícono en volumen](../../manual-de-uso/creative/usar-linea-grafica-efeonce.md#paso-a-paso--usar-un-ícono-en-volumen)

## Componer por superficie

Desde el 2026-09-27 la línea no sólo se piensa por elemento (la órbita, la lente, la voz, la firma), sino **por el
lugar donde vive la pieza**. Un hero de sitio, un letrero de carretera, una pantalla digital en la calle, una gráfica
animada, un video y una lámina de presentación se leen distinto: a otra distancia, en otro tiempo y con otra forma de
firmar. Por eso cada superficie tiene sus recetas aprobadas y sus reglas. En el canvas del equipo cada superficie
tiene su página, y a la izquierda de cada una hay una lámina guía («Guía · cómo componer …») que la resume.

| Superficie | Qué quedó aprobado | Cómo firma |
|---|---|---|
| **Web** (hero de escritorio y teléfono) | tres heros: la lente gigante, la foto a sangre y la tableta que viene hacia ti; el teléfono con foto vertical propia, nunca el escritorio achicado | la foto no lleva logo; firma el encabezado del sitio (por aprobar) |
| **DOOH** (letreros de vía pública) | el caminero de carretera con la lente y el logo abajo a la izquierda, al final de la lectura | logo abajo a la izquierda en carretera; en ciudad, centrado (tamaño por decidir) |
| **pDOOH** (pantallas digitales en la calle) | todavía nada: hay propuestas de pantalla, mupi, spot sin audio y versiones por horario | según el soporte, por aprobar |
| **Motion** (gráfica animada con foto) | la animación de 8 s con la foto hecha para la lente y el cierre con el logo, y su storyboard | nunca en la toma: firma el cierre |
| **Producción audiovisual** (video) | el storyboard de planos «Cómo trabajamos» y los textos del video (cartela, zócalo, dato, subtítulos) | firma la marca en el cierre, nunca la toma |
| **Deck** (presentaciones) | **las 69 láminas de la página «Deck»** (2026-09-27): portadas, contraportadas, secciones, contenido, método, prueba, propuestas por línea, cotización, próximos pasos y respiro; cada una con su receta en el [catálogo de recetas del deck](../../operations/brand-graphic-line/deck-recipes/README.md) | burbuja URL en el pie; el logo sólo en portada y cierre |

**La lámina de propuesta de cine** (`proposal-cinematic`) es la novedad más visible: una foto de película a sangre
con la persona del equipo a la derecha mirando a cámara, el servicio funcionando en la escena y el color de la línea
saliendo de ella; la pregunta y la respuesta a la izquierda, en el espacio oscuro; una prueba con su fuente y hasta
cuatro pasos con los íconos de la marca. Se aprobaron seis: servicios creativos («¿Tu marca en cada pantalla? En
todas.»), web («¿Para quién es tu web? Para todos.»), la carrera de Nexa («¿Listos para la carrera? Vamos.»), RevOps
(«¿Tu CRM vende contigo? Con agentes.»), AEO («¿Te encuentra la IA? Visible.») y las líneas de servicio con Nexa, donde
cinco esferas de luz, una por línea, orbitan a Nexa. Esas cinco esferas son luz de la foto, no el punto final de la
respuesta, que sigue siendo uno solo; y es la única lámina donde conviven los colores de las cinco líneas. Unos mini robots, los agentes, aparecen en varias láminas y sirven de hilo
entre ellas.

Reglas que valen para todas las superficies:

- **El fondo de Efeonce no cambia**; cada línea de servicio aporta sólo su color de acento.
- **Una esfera por pieza**, al final de la respuesta, y **una órbita por pieza o lámina**.
- **El logo en la ropa nunca lo dibuja la IA**: se pone el isotipo oficial después.
- **El estilo de cine** se usa sólo en piezas donde Nexa es la protagonista, en la lámina de propuesta de cine y, por
  excepción aprobada el 2026-09-27, en las láminas de sección y de «quiénes somos» del deck, con proporciones reales y
  la ropa de trabajo que corresponde a la escena. Nunca dos personas mirándose de cerca: se lee como escena romántica.
- **El color de acento no va en textos chicos** (menos de 24 px): ahí va blanco o gris claro.
- **Precios siempre como ejemplo; cifras sólo con fuente.**

También quedó aprobada la **escalera del método BeX**: cinco peldaños de vidrio azul que se iluminan al subir, con el
último (Be Intrinsic) en bloque sólido; no lleva foto, la escalera es la imagen. No quedó ninguna lámina de propuesta
pendiente, y se descartaron cuatro (la versión en plastilina de servicios creativos, la primera carrera de Nexa,
Nexa con un director mirándose de cerca y las líneas de servicio con Nexa sin fuerza). El formato cuadrado (1:1) con
los ajustes quedó aprobado en el canvas; su paso formal en la herramienta de anuncios se hace con una task aparte.

Un agente compone una pieza por superficie describiéndola (superficie, formato, papel y receta) en el sistema de
diseño AXIS, que devuelve todo lo necesario para que las herramientas de Greenhouse la pinten, la firmen y la midan.
Ese contrato sigue en prueba (`candidate`), pero ya está publicado y Greenhouse lo usa.

**Cómo se produce hoy una pieza aprobada (desde el 2026-09-27).** Las recetas aprobadas ya no se arman a mano como
maqueta: son plantillas del generador de piezas de Greenhouse (el Artifact Composer). Quien produce describe la pieza
en un archivo y corre un solo comando (`pnpm brand:compose`); sale la pieza completa, con la foto, la órbita, la voz,
la selección y los íconos en su lugar:

- **Deck:** **las 69 láminas aprobadas**, sueltas o como documento completo (un brochure o una propuesta en un solo
  PDF de varias páginas). Qué hace, qué reglas cumple y qué falta: [Composición de decks y brochures de marca
  propia](./composicion-de-decks-y-brochures.md).
- **Web y vía pública:** los cuatro heros (el teléfono en sus tres anchos) y el caminero, en imagen.
- **Motion:** el último cuadro de la animación (la versión fija que la respalda) y el storyboard. La animación en sí
  sigue haciéndose con las herramientas de motion.
- **Video:** los textos del video (cartela, zócalo, dato, llamada con selección, subtítulos) como capas transparentes
  para montar sobre el plano, más la pantalla dividida y el plan de planos. El cierre con el logo es un video y sale de
  las animaciones del logo.

Lo que no está aprobado (la paleta de ciudad, las pantallas digitales) **no tiene plantilla**: el comando se niega a
producirlo. En el deck ya no queda ninguna lámina sin plantilla: desde el 2026-09-28 se componen las 69 (TASK-1927 y
TASK-1928). Producir no es aprobar: la pieza sigue pasando la revisión del equipo. Por ahora el comando corre en el
equipo de quien produce; la versión dentro de la plataforma (con permisos, cola y agentes) es TASK-1921, en curso. Quedan preguntas del operador sobre detalles de algunas plantillas (la posición de la lente del caminero,
el arco del dato, la burbuja URL en algunas láminas, un gris sin valor oficial y la medida pendiente de la paleta de ciudad, 20 % o 35 %).

> Detalle técnico: [norma de composición por superficie](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md) ·
> [manual §10.0](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#100-composición-por-superficie) ·
> [lenguaje fotográfico, delta 2026-09-27](../../operations/brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md) ·
> contrato `efeonce.surface-composition` 0.1.2 y tokens `efeonceGraphicLine.surfaces` en AXIS (Greenhouse fija
> `axis-tokens` 0.3.21 y `axis-ui-contracts` 0.3.19; [página del Lab](https://axis.efeonce.org/references/surfaces/)) · [canvas por superficie](https://claude.ai/code/artifact/04512639-c45f-4c8c-bb3b-673e8dfdbcb7) ·
> [cómo componer por superficie](../../manual-de-uso/creative/componer-por-superficie-con-axis.md) ·
> [ruta por el Artifact Composer, norma §2.1](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md#21-la-ruta-por-el-artifact-composer-desde-el-2026-09-27-task-1919) (TASK-1919)

## Dónde está cada cosa

| Qué | Dónde | Para quién |
|---|---|---|
| Manual técnico-operativo (fuente de verdad) | [`EFEONCE_GRAPHIC_LINE_V1.md`](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md) | quien produce o audita |
| Norma de composición por superficie (web, vía pública, pantallas digitales, motion, video, deck) | [`EFEONCE_SURFACE_COMPOSITION_V1.md`](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md) | quien produce una pieza para una superficie concreta |
| Recetas por lámina del deck (las 69 aprobadas: cuándo usar cada una, slots, foto y prompt) | [catálogo `deck-recipes/`](../../operations/brand-graphic-line/deck-recipes/README.md) · [cómo armar un deck con las recetas](../../manual-de-uso/creative/componer-deck-con-recetas.md) | quien arma un brochure, una propuesta, un pitch o un QBR |
| Plantillas de las piezas aprobadas por superficie (comando `pnpm brand:compose`) | catálogos `graphic-line-deck` (las 69 láminas del deck, en 50 plantillas), `graphic-line-stills` y `graphic-line-overlays` del Artifact Composer · [cómo usarlo](../../manual-de-uso/creative/componer-por-superficie-con-axis.md) · [qué hace con decks y brochures](./composicion-de-decks-y-brochures.md) | quien produce una pieza aprobada |
| Canvas del equipo por superficie (una página por superficie) | [La órbita — superficies](https://claude.ai/code/artifact/04512639-c45f-4c8c-bb3b-673e8dfdbcb7) | el equipo y los agentes |
| Decisión (ADR) | [`EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md`](../../architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md) | quien necesita saber qué se decidió y qué se descartó |
| Manual en PDF (A4, 56 hojas, confidencial) | [`Efeonce-Linea-Grafica-La-Orbita-V1.pdf`](../../operations/brand-graphic-line/deliverables/Efeonce-Linea-Grafica-La-Orbita-V1.pdf) | el equipo (uso interno) |
| Referencia pública en el sistema de diseño AXIS | [axis.efeonce.org/references/graphic-line](https://axis.efeonce.org/references/graphic-line) | cualquiera que necesite ver los elementos vivos |
| Valores oficiales (grosores, colores, proporciones, firma, movimiento) | tokens `efeonceGraphicLine` en `@efeoncepro/axis-tokens` (el movimiento, en `efeonceGraphicLine.motion`) | quien construye piezas en código |
| Archivos oficiales (logo e isotipo de las cuatro marcas y burbujas de URL) | paquete `@efeoncepro/axis-brand-assets` | quien construye piezas en código |
| La órbita lista para usar en código (piezas, retrato de la firma de mail, movimiento) | paquete `@efeoncepro/axis-graphic-line` | quien construye piezas o páginas fuera de Greenhouse |
| Animaciones del logo para el equipo (MP4, GIF, cuadro final) | OneDrive `13- Branding › Motion Órbita Efeonce › v1.1` | quien edita video o arma presentaciones |
| Masters de las animaciones (transparentes para editores de video, web y Apple) | bucket público de AXIS `efeonce-group-axis-public-media`, carpeta `motion/logo/v1.1/` | quien monta la animación sobre otro fondo |
| Íconos de la marca (catálogo, reglas y «Copiar SVG») | [axis.efeonce.org/references/iconography](https://axis.efeonce.org/references/iconography/) · en datos para agentes: [`/references/iconography.json`](https://axis.efeonce.org/references/iconography.json) | quien usa o pide un ícono |
| Íconos en código | `efeonceGraphicLine.icons` (`@efeoncepro/axis-tokens` desde 0.3.6) y `@efeoncepro/axis-graphic-line/icons` (desde 0.4.0; los 60 con el oficio desde 0.5.0; los 79 desde 0.6.0); en Greenhouse los usa el generador de piezas por superficie | quien construye piezas en código |
| Canvas de trabajo (taller, privado; 40 láminas) | [Canvas «Línea gráfica Efeonce»](https://claude.ai/artifact/EKeA34qiPH77wsUFCtX9ii) | quien explora nuevas aplicaciones |
| Burbujas de URL listas para visores y correo | `docs/operations/brand-graphic-line/deliverables/assets/url-lum-{light,dark}.svg` | quien arma PDF, correo o referencias para IA |
| Banco de fotos para la lente | `ai-generations/2026-09-25_banco-lente-orbita/` (fichas y prompts versionados; las imágenes son locales) | quien compone una lente |
| Portadas, avatar y destacados de las redes de Efeonce (y portadas de LinkedIn personales del equipo) | OneDrive `Alineación/5. Contenidos/13- Branding/Redes sociales Efeonce/2026-10 La órbita/` y `05. Highlights/2026-10 Destacados La órbita/` · página del kit de cada persona · [cómo usarlas](../../manual-de-uso/creative/usar-portadas-y-destacados-sociales-efeonce.md) | quien administra las redes de Efeonce y cada persona del equipo |

Los valores (colores, grosores, medidas) **se toman de los tokens de AXIS**, no se copian de un documento. Si un valor
cambia, cambia el token y su prueba.

> Detalle técnico: [índice de la carpeta](../../operations/brand-graphic-line/README.md) · [ADR, decisiones 3 y 4](../../architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md#decisión)

## Delta 2026-09-26 — decisiones del operador

El 2026-09-26 el operador cerró varias preguntas abiertas de la línea:

- **Color:** el acento de cada línea se usa en gráficos (arco, esfera, halo) y en textos grandes, de 24 px o más; en
  texto más chico va navy sobre claro y blanco sobre oscuro. El magenta de RevOps y CRM en HubSpot queda aprobado; el
  naranjo de HubSpot no se usa. En el cierre del deck, la palabra final del eslogan va en el color de la línea.
- **La burbuja de la dirección web** exige contraste 4,5 a 1: es texto chico que la gente tiene que leer.
- **El logo dentro de la órbita** sólo en los cierres de marca: final del deck, final de video y muro de recepción,
  siempre con aire alrededor del logo. Nunca en el banner de LinkedIn ni en el reverso de la tarjeta, donde el logo va
  solo.
- **Un solo anillo** también en el banner de LinkedIn y el fondo de Teams. Sobre papel, el halo va a la mitad. El
  anillo propio de la esfera queda sólo para lo que está «en vivo» (por ejemplo, una cabina en llamada).
- **Con la fotografía:** se aprobaron las doce reglas de trabajo conjunto y se resolvieron los nueve choques. La capa
  gráfica sobre una foto sólo se permite en los casos de la línea (pregunta y respuesta, lente, medida con fuente); en
  la lente, el exterior apagado sirve de espacio para el texto; y el retrato de perfil pasa a ser una categoría propia
  de la fotografía, donde se puede mirar a cámara.

> Detalle técnico: [manual §12, tabla D1–D15](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#12-decisiones-y-validación) · [ADR, delta (e)](../../architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md) · [lenguaje fotográfico §11](../../operations/brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md#11-la-línea-gráfica-en-la-foto)

## Delta 2026-09-27 — portadas y contraportadas del brochure y la propuesta

El 2026-09-27 el operador aprobó las portadas y contraportadas del brochure y de la propuesta comercial. Tres reglas
nuevas mandan:

- **Foto y sin foto se alternan.** Si la portada lleva fotografía, la contraportada va sin fotografía, y al revés. Vale
  para el brochure y para la propuesta.
- **El mensaje de la contraportada depende del documento.** En la propuesta comercial el mensaje principal es el
  eslogan «Empower your Growth», porque la propuesta llega después de conversar. En el brochure va «¿Conversamos?
  Cuando quieras.», con el eslogan de firma debajo, porque el brochure busca abrir la conversación. El eslogan nunca va
  en la portada.
- **La portada habla con la voz de la línea:** una etiqueta arriba, la pregunta chica con su anillo, la respuesta
  grande con su esfera y una evidencia con una palabra en negrita. Nada de títulos sueltos como «Servicios 2026». El
  brochure pregunta «¿Qué hace Efeonce?» y responde «Crecer.»; la propuesta pregunta «¿Cómo crecemos en 2027?» y
  responde «Con foco.», con el nombre del cliente en la evidencia y su logo dentro de la órbita.

También quedaron aprobadas una portada por cada línea de servicio, con su color y su par de pregunta y respuesta.
En ese momento todavía no salían con `pnpm brand:compose`; desde el cierre de TASK-1927 (2026-09-27) se componen.

> Detalle técnico: [norma de composición por superficie §4.6, «Portadas y contraportadas»](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md#46-deck) (reglas, catálogo, medidas y descartes) · [manual §4, pares aprobados, y §5, el eslogan](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#4-la-voz-pregunta-y-respuesta) · [canvas por superficie, página «Deck»](https://claude.ai/code/artifact/04512639-c45f-4c8c-bb3b-673e8dfdbcb7)

## Delta 2026-09-27 (c) — las 69 láminas del deck, con su receta

El 2026-09-27 el operador aprobó **todas las láminas** de la página «Deck» del canvas: 69, desde las portadas hasta
el respiro. Lo que antes era «opción» o «prueba» quedó aprobado. Para que nadie tenga que adivinar cuál usar, cada
lámina tiene ahora una **receta**: qué comunica, cuándo sirve, cuándo no y cuál conviene en su lugar, con qué otras
láminas va, qué textos e imágenes se cambian y cuáles quedan fijos.

**Cómo se elige una lámina.** Primero el documento:

| Documento | Portada | Contraportada | Qué no lleva |
|---|---|---|---|
| **Propuesta comercial** | sin foto, con el logo del cliente dentro de la órbita | con foto y «Empower your Growth» | «¿Conversamos?» (la propuesta llega después de conversar) |
| **Brochure** | con foto: una general o la de una línea de servicio | sin foto: la órbita gigante con «¿Conversamos? Cuando quieras.» | precios (se definen en cada propuesta) |
| **Pitch** y **QBR** | sin portada aprobada: se le pregunta al operador (la clásica no se usa) | sin cierre aprobado: se le pregunta al operador | precios |

Después, en cada tramo del documento (secciones, contenido, método, prueba, cotización, próximos pasos), se elige la
receta por su «cuándo sí» y su «cuándo no».

**Lo que cambió con esta aprobación:**

- **El tríptico** dice «Escucha.» «Crea.» «Mide.»: una palabra en cada foto, cada una con su punto.
- **La sección partida** (mitad papel, mitad foto) tiene tres versiones —la esquina arriba, la esquina abajo y el panel
  a la derecha— y su indicador sube siempre por la izquierda.
- **La cotización** tiene tres versiones: la tabla de planes, los planes en escena y la cotización en vivo con el
  botón «Aprobar propuesta». Los montos siempre como `[MONTO]`.
- **El día a día** tiene cuatro momentos, una versión con las herramientas y dos láminas «vívelo», donde quien mira
  vive cómo avanza el proyecto y cómo se ven los resultados en vivo.
- **Los próximos pasos** muestran la agenda del diagnóstico abierta, con el cursor en «Agenda un diagnóstico».
- **Los logos de clientes** van en un mismo azul marino (Aguas Andinas y la UC de Temuco, en tonos de ese azul para
  no perder su forma); la foto del caso Sky es de ejemplo y se cambia por una real.
- **El estilo de cine** (luz dramática de película) se permite también en las láminas de sección y de «quiénes somos»
  y «por qué lo hacemos», con personas del equipo. No se extiende a redes, web ni publicidad.

Hay detalles de revisión pendientes que no frenan la aprobación (algunas respuestas un poco más chicas de lo que pide
la regla, cifras que necesitan su fuente a la vista, etiquetas chicas en color de acento); se corrigen cuando cada
lámina pasa a plantilla. **Actualización 2026-09-28:** ya pasaron todas (delta de abajo).

> Detalle técnico: [catálogo de recetas por lámina](../../operations/brand-graphic-line/deck-recipes/README.md) (índice, decisiones y pendientes de QA; JSON `efeonce.deck-slide-recipes.v1`) · [norma de composición por superficie, delta (c) y §4.6](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md#46-deck) · [registro cine, delta (c)](../../operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md#delta-2026-09-27-c--excepción-para-secciones-y-láminas-about-del-deck) · [manual de uso](../../manual-de-uso/creative/componer-deck-con-recetas.md)

## Delta 2026-09-28 — las 69 láminas del deck se componen solas

Desde el 2026-09-28 **las 69 láminas aprobadas del deck** salen con un solo comando (`pnpm brand:compose`), sueltas o
como un brochure o una propuesta completos en un solo PDF. TASK-1927 dejó el marco (portadas y contraportadas), las
secciones clásica y partida, la cifra medida, el tríptico, la escalera y las propuestas de cine; TASK-1928 sumó las
otras 38: propuestas sobrias, método, cotización, próximos pasos y respiro, prueba, secciones y «quiénes somos», y
contenido y día a día. El operador las aprobó a ojo.

Al pasar a plantilla, cada lámina aplica la regla sobre la referencia aprobada cuando las dos chocaban:

- **El acento no va en textos chicos:** etiquetas como «Recomendado» o «Revisamos contigo» van en azul marino o en
  blanco.
- **La respuesta mide al menos tres veces la pregunta:** subió en la cotización, clientes, plan, partners y testimonio.
- **Toda cifra muestra su fuente:** la lámina imprime «Fuente: …»; una cifra sin fuente no sale.
- **Las láminas interiores con foto no llevan logo ni velo** sobre la foto.
- **Los montos salen como `[MONTO]`** y el contacto, de los datos de Efeonce.
- **Los logos de clientes y partners** quedan en un tono y con el mismo peso.

La **portada de brochure con la selección de Nexa** sobre «Crecer.» también se compone: el operador relajó para ella
la regla que no admitía selección en una portada de brochure. La selección va sobre la respuesta, nunca sobre la
persona, con un solo cursor «Nexa».

Lo que falta —la ruta dentro de la plataforma (TASK-1921, en curso), confirmar y guardar el plan del deck (validarlo ya
se puede: delta de abajo), datos reales en las casillas, el banco de fotos gobernado y el deck desde Proposal Studio— está en
[Composición de decks y brochures de marca propia](./composicion-de-decks-y-brochures.md#qué-no-hace-todavía).

> Detalle técnico: [composición de decks y brochures](./composicion-de-decks-y-brochures.md) ·
> [catálogo de recetas, «Qué sale hoy con un comando» y pendientes de QA](../../operations/brand-graphic-line/deck-recipes/README.md) ·
> [norma §7](../../operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md#7-estado-y-pendientes) · AXIS `v0.3.21`
> (`axis-tokens` 0.3.21, `axis-ui-contracts` 0.3.19) ·
> [TASK-1928](../../tasks/complete/TASK-1928-graphic-line-deck-remaining-recipe-templates.md)

## Delta 2026-09-28 (b) — el plan del deck se valida antes de componer

Desde el 2026-09-28 la **lista de láminas** de un deck (su plan, nombrando cada lámina por su receta) se revisa en
segundos con `pnpm brand:deck-plan`, antes de escribir los textos y componer. Revisa, con AXIS y con el catálogo de
recetas, que cada lámina exista y sirva para ese documento, que la portada vaya primero y el cierre al final y sean
pareja, que no haya dos cierres, variantes seguidas ni la misma foto dos veces, y que los textos ya escritos quepan.
Un agente también puede **proponer** el plan: elige recetas del catálogo por su id, sin escribir textos ni cifras, y la
persona decide si lo usa. Revisar o proponer no compone ni guarda nada; confirmar y guardar el plan, y pedirlo desde el
portal, Nexa o MCP, es TASK-1932.

> Detalle técnico: [composición de decks y brochures, «Validar y proponer el plan»](./composicion-de-decks-y-brochures.md#validar-y-proponer-el-plan-antes-de-componer) ·
> [manual, paso 4b](../../manual-de-uso/creative/componer-deck-con-recetas.md#paso-4b--valida-el-plan-antes-de-componer) ·
> [catálogo de recetas, códigos](../../operations/brand-graphic-line/deck-recipes/README.md#validar-el-plan-códigos-y-cómo-leerlos) ·
> [TASK-1929](../../tasks/complete/TASK-1929-deck-plan-recipe-catalog-validator.md)

## Delta 2026-09-28 (c) — los datos de un deck salen de Greenhouse, con su fuente

Desde el 2026-09-28 los **datos** de un deck —el logo del cliente, las cifras, los casos, los testimonios, los logos de
clientes y partners, los montos y el equipo— ya no se copian a mano: se **ligan** desde Greenhouse con
`pnpm brand:deck-plan -- --bind`. El logo del cliente sale de su ficha (Account 360), en la versión para fondo oscuro
cuando la portada es oscura. Cada cifra, caso o testimonio sale de la evidencia registrada en la propuesta, con su
fuente y su fecha, y un logo o una cita de otro cliente sólo entran si su autorización quedó registrada con su
documento. Si un dato no se puede verificar, el slot queda **sin ligar** con el motivo, y la lámina no sale: nunca se
inventa una cifra, una cara ni un logo, y ningún deck —ni siquiera uno interno— usa evidencia interna, que es donde
viven los costos y márgenes.

Los montos siguen saliendo como `[MONTO]` hasta que la cotización congelada de la propuesta los entregue (TASK-1417), y
la lámina de equipo espera el roster real (TASK-1418). Las láminas de muestra SEO/AEO conservan sus datos de ejemplo y
su marca hasta que haya un diagnóstico real con evidencia. Ligar no compone ni guarda nada: la salida productiva, con
confirmación humana, es TASK-1932.

> Detalle técnico: [catálogo de recetas, «Datos reales por slot»](../../operations/brand-graphic-line/deck-recipes/README.md#datos-reales-por-slot-task-1930) ·
> [manual, paso 5b](../../manual-de-uso/creative/componer-deck-con-recetas.md#paso-5b--liga-los-datos-reales) ·
> código: `src/lib/brand-surfaces/deck-recipes/bindings/` ·
> [TASK-1930](../../tasks/in-progress/TASK-1930-deck-recipe-slot-data-bindings.md)

## Delta 2026-10-01 — los perfiles sociales de Efeonce

El 2026-10-01 el operador aprobó las piezas de perfil de las redes de Efeonce y las declaró parte del universo gráfico de
la marca:

- **Portadas** de LinkedIn (página de empresa), Facebook y YouTube, ocho por red: dos mensajes con cuatro fotos de Nexa
  cada uno. «¿Cuántos formatos? Todos.» (línea Growth) y «¿Entre cientos de marcas, a quién cita la IA? A ti.» (línea
  Engine). Cada red tiene su medida y su zona segura: el texto nunca queda bajo la foto de perfil, el logo de la página
  ni la interfaz de la red.
- **Avatar de redes:** un solo archivo para LinkedIn, Instagram, Facebook y YouTube, el isotipo de Efeonce sobre el
  oscuro con el halo de la órbita.
- **Nueve destacados de Instagram**, cada uno con su escena (el ojo de Nexa, Nexa con algo de su mundo y objetos del
  oficio) y un color de luz propio, sin firma en el círculo. Un destacado se **crea** publicando primero una historia
  9:16 completa; la imagen de portada sólo sirve para **cambiar** la de uno que ya existe.
- **Portadas de LinkedIn para el perfil personal** del equipo: las mismas ocho, adaptadas para dejar libre la foto de
  perfil y con el logo pequeño bajo el texto. Cada persona elige la suya en su página del kit; el aviso le llegó 1:1
  por el TeamBot.
- Las portadas llevan el estilo de cine con Nexa como protagonista; las piezas sociales con personas del equipo siguen
  fuera de ese estilo. Una portada necesita una idea propia, no un par de copy del catálogo.

Las piezas están aprobadas y listas en OneDrive; publicarlas en cada red y crear los destacados es decisión del
operador.

> Detalle técnico: [manual §10.1.1](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#1011-perfiles-sociales-de-efeonce-aprobados-el-2026-10-01) ·
> [registro cine, delta 2026-10-01](../../operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md#delta-2026-10-01--registro-cine-con-nexa-en-portadas-sociales-y-destacados-de-instagram) ·
> [roster del equipo, portadas de LinkedIn](../../operations/brand-photography/EFEONCE_TEAM_ROSTER_V1.md#portadas-de-linkedin-del-equipo-2026-10-01) ·
> [cómo usarlas](../../manual-de-uso/creative/usar-portadas-y-destacados-sociales-efeonce.md)

## Delta 2026-10-01 (b) — los Sparks, los agentes de Efeonce

El 2026-10-01 la marca sumó a sus personajes los **Sparks**: los agentes de Efeonce, que ponen cara al trabajo de
Agent Ops. Son cinco —investigación, contenido, CRM y datos, servicio y reportes— con el mismo cuerpo hecho de
formas de la marca: una esfera blanca que flota, un visor con dos ojos y una sonrisa azul, la chispa de Nexa como
antena, el anillo de la órbita y las tres ventanas de la nave. Cada uno se reconoce por un objeto que sostiene y un
gesto.

- **Siempre con una persona a cargo.** Un Spark trabaja con contexto y junto a alguien que lo supervisa; nunca
  reemplaza a una persona ni decide solo. Nexa puede liderarlos en la ficción, pero las piezas que venden Agent Ops
  muestran al equipo humano.
- **Chicos y arriba.** Nunca más grandes que la cabeza de la persona y siempre por encima de la cintura.
- **Sólo en piezas de cine o de puesta en escena**, nunca en las fotos documentales del oficio.
- **Son el único robot permitido** en una foto de Efeonce. Se piden desde el catálogo de fotos y el comando frena
  cualquier escena que describa un robot inventado.
- **El nombre es interno.** En público se dice «los Sparks de Efeonce»; no es un producto.

> Detalle técnico: [canon de los Sparks](../../operations/brand-characters/SPARKS_V1.md) ·
> [registro cine, delta 2026-10-01 (b)](../../operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md#delta-2026-10-01-b--los-sparks-reemplazan-a-los-mini-robots-agentes) ·
> [lenguaje fotográfico, delta 2026-10-01](../../operations/brand-photography/EFEONCE_PHOTOGRAPHIC_LANGUAGE_V1.md#delta-2026-10-01--los-robots-siguen-prohibidos-salvo-los-sparks-del-kit) ·
> [cómo usarlos](../../manual-de-uso/creative/usar-sparks-en-fotos-de-marca.md)

## Delta 2026-10-02 — el traje biónico de Nexa y su escena con los Sparks

Entre el 2026-10-01 y el 2026-10-02 el operador aprobó el **traje biónico de Nexa** como una pieza fija de la marca, con sus **lentes
biónicos**: un body navy con placas blancas mate y costuras de luz azul, el isotipo incrustado en el pecho y el logo
completo «efeonce» serigrafiado en la espalda; los lentes son una mica transparente apenas azul, sin logo. Antes el
traje se describía con palabras en cada foto y salía distinto cada vez; ahora existe una sola versión, con sus vistas,
y las fotos la toman de ahí.

- **Sólo Nexa y sólo en las fotos de cine.** Nunca lo lleva una persona del equipo ni aparece en las fotos
  documentales del oficio. El comando de fotos frena cualquier pedido que no cumpla.
- **Las marcas ya vienen puestas en el traje** que se le pasa al modelo, para que no las borre ni las invente. Igual
  se revisan de cerca en cada foto.
- **Nexa cambia de gesto.** Cada foto elige una de sus 12 expresiones o un ángulo de cabeza; antes salía casi siempre
  con la misma cara.
- **La escena que sirve de modelo** es «Nexa despliega a su squad»: Nexa con el traje y dos Sparks cerca y nítidos
  (uno sobre su palma, otro posado en su hombro); los demás, lejos y desenfocados. Con más Sparks nítidos parecen
  pegatinas.

> Detalle técnico: [kit del traje](../../../ai-generations/2026-10-01_traje-bionico-nexa/LEEME.md) ·
> [registro cine, delta 2026-10-02](../../operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md#delta-2026-10-02--nexa-despliega-a-su-squad-qué-hace-cine-una-escena-con-sparks) ·
> [personas y vestuario, delta 2026-10-02](../../operations/brand-photography/EFEONCE_PHOTO_PEOPLE_IDENTITY_WARDROBE_V1.md#delta-2026-10-02--el-traje-biónico-y-los-lentes-biónicos-de-nexa-por-catálogo) ·
> [cómo usarlo](../../manual-de-uso/creative/usar-traje-bionico-de-nexa-en-fotos.md)

## Delta 2026-10-02 (b) — Registro cine: cómo se produce sin consultar a nadie

Hasta el 2026-10-02 ninguna sesión llegaba sola a una foto de cine aprobable: todas terminaban preguntándole a la
sesión de la línea gráfica, y siempre por las mismas fallas. Desde ese día el oficio está escrito y una persona o un
agente puede producir la foto por su cuenta. La condición del operador fue no cambiar nada de los otros estilos de
foto (documental, puesta en escena y respuesta), y se cumplió: ninguna de sus fichas cambió.

- **Se parte de una foto aprobada, no de cero.** Hay 12 fotos de cine aprobadas y cada una es una receta: dice su
  formato, para qué pieza sirve, por qué funciona y qué cuidar. Un comando copia la de la receta más parecida, marca
  la escena para reescribir y lista lo que falta completar y lo heredado que hay que revisar. Todavía no hay ninguna
  foto de cine vertical aprobada.
- **La ficha tiene los campos del oficio.** Una sola luz principal, algo oscuro y desenfocado junto al lente, luces
  frías lejanas al fondo, el fenómeno de luz con una frase que diga por qué ES el servicio, y para qué pieza es. Si
  falta uno, el comando avisa qué falla se va a cometer.
- **Lo primero a cuidar es el lugar.** Las fotos aprobadas tienen un espacio grande, oscuro y con profundidad, y un
  fenómeno de luz grande; las pruebas que fallaban eran una persona en un fondo negro con una luz chica. Es una
  observación de las pruebas, todavía a confirmar.
- **La luz se juzga contra la foto aprobada.** Las aprobadas también tienen la cara iluminada de frente con luz suave;
  la exigencia anterior («media cara casi negra») era más dura que lo que el operador aprobó y quedó corregida.
- **Un revisor mira antes y después de gastar.** Es un agente de Claude Code que dice si la foto es aprobable, qué
  corregir y con qué frase, o si el caso no va en cine. **«Aprobable» no es aprobado: aprueba el operador.** En Codex
  no hay agente; se aplica la misma pauta leyéndola.
- **Un medidor revisa lo que se puede medir** (cuánta sombra tiene el cuadro y, en vertical, que nada brillante suba
  a la zona del texto). No ve todo: lo demás lo mira el revisor.

**Las siete decisiones del operador** del 2026-10-02 para las fotos de cine:

1. Los aros de Nexa son dorados.
2. El destacado «Agents» de Instagram ya aprobado se queda (tres Sparks, sin Nexa ni texto).
3. En las fotos verticales, la escala va por encuadre: en 9:16 de la cintura arriba y en 4:5 del pecho arriba. Se
   confirma en el próximo piloto.
4. En la lámina de sección partida del deck la persona mira hacia el panel del texto; mirar al lente queda para
   portadas, contraportadas, la lámina de propuesta de cine y redes.
5. Aparecen personas reales del equipo, con la prenda de su línea; cuando se elige por rol, se usa el código de cada
   escena.
6. Las luces encendidas de la escena (lámparas, pantallas) sólo aparecen como luces grandes, frías, lejanas y
   desenfocadas.
7. Un deck lleva una sola lámina de sección partida, y lo controla el validador del plan del deck.

Las fotos de prueba quedan en `ai-generations/2026-10-02_prueba-ciega-cine/`, `…prueba-ciega-cine-2/` y
`…experimento-luz-cine/`. Falta que el operador dé su veredicto sobre las fotos de la segunda prueba y un comando que
haga todo el recorrido de una vez (`pnpm foto:cine`). Las 10 primeras fotos aprobadas, con su receta, se pueden ver en
el banco fotográfico de AXIS (sección «Registro cine»).

> Detalle técnico: [casebook del registro cine](../../operations/brand-photography/EFEONCE_PHOTO_CINE_CASEBOOK_V1.md) ·
> [registro cine, delta 2026-10-02 (b)](../../operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md#delta-2026-10-02-b--decisiones-del-operador-tras-la-prueba-ciega) ·
> recetas en `scripts/foto/cine-recetas.json` ·
> [cómo producir una foto de cine](../../manual-de-uso/creative/producir-foto-cine-de-marca.md)

## Estado y pendientes

**Estado:** canónica desde el 2026-09-25. Es un **sistema consistente**, pero **todavía no un activo distintivo
demostrado**: no se ha medido si la gente reconoce una pieza de Efeonce sin el logo. Hasta medirlo, no se afirma que
la órbita se reconozca sola.

| Pendiente | Tipo | Qué falta |
|---|---|---|
| Prueba de atribución sin logo | decisión del operador | elegir panel y presupuesto, y correrla con 600 personas (300 por versión); el kit está listo. Debe correr **antes** de que la órbita entre a pauta pagada |
| Firma de mail | instalación | la v3.1 está aprobada y sus imágenes publicadas; cada persona la instala en su Outlook desde el HTML generado. `people@` usa la firma del área Talent. Falta la URL de LinkedIn de la empresa |
| Banco de pares de copy | decisión del operador | revisar los candidatos y aprobar dos pares por línea de servicio, sólo con respuestas que se puedan verificar |
| Archivos de impresión y plantillas editables | producción | se parte por la tarjeta de presentación y el muro de recepción, en PDF vectorial; espera la especificación técnica de la imprenta |
| Variantes restantes de las animaciones del logo | producción | algunos formatos y fondos siguen en render; se suman a OneDrive y al bucket a medida que terminan |
| Versión en inglés | producción | el copy de la línea está sólo en español |
| Íconos: voz de la línea Voice y reemplazo de los Tabler en las firmas | decisión del operador | la línea Voice no tiene voz fija; la firma de correo y la de equipo siguen con Tabler hasta que se decida |
| Revisión legal de «Te hacemos visible» | legal | obligatoria antes de cualquier pauta, sin excepción |
| Perfiles sociales de Efeonce | decisión del operador | publicar las portadas y el avatar en cada red y crear los destacados de Instagram; las historias de adentro de cada destacado siguen por hacer |
| Registro cine: cierre del criterio | decisión del operador | veredicto sobre las fotos de la segunda prueba ciega y comando `pnpm foto:cine` que haga el recorrido completo (resto de TASK-1926) |
| Ajustes de `foto:prompt` y chequeos de la lente | producción | una task nueva lleva al comando lo decidido para las fotos con lente (formato 1200 × 627, límite de cabezas sólo con reserva de texto, chequeos contra lecho y reservas) |

> Detalle técnico: [manual §12](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#12-decisiones-y-validación) · [ADR, pendiente](../../architecture/EFEONCE_GRAPHIC_LINE_ORBIT_DECISION_V1.md#pendiente) · [manual §13, contrato y herramientas](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#13-contrato-y-herramientas-axis-03): contrato `efeonce.graphic-line-orbit` 0.3.0 (estable desde el 2026-09-26: un agente describe qué quiere hacer y el sistema pinta la pieza, la firma y mide que cumpla) en AXIS 0.3.0, `pnpm creative:orbit:render`, `pnpm creative:layout` y `pnpm foto:componer:cta` (tramo 17)

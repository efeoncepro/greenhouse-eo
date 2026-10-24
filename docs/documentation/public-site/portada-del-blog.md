# Portada del blog — Marketing con Manzanitas en efeoncepro.com/blog/

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.4
> **Creado:** 2026-10-24 por Claude
> **Ultima actualizacion:** 2026-10-24 por Claude
> **Documentacion tecnica:** [Portada del blog — runtime V1](../../architecture/public-site/BLOG_HOME_RUNTIME_V1.md) ·
> [PDR-029](../../public-site/decisions/PDR-029-modelo-de-contenido-portada-blog.md)

## Qué es

Es la página de entrada del blog de Efeonce, `https://efeoncepro.com/blog/`. Desde el 2026-10-24 muestra el diseño
aprobado en el canvas «Portada Blog Efeonce» con el contenido real del blog: lo que se publica en WordPress aparece
solo, y lo que vence (una fijación, un evento que terminó, un recurso sin revisar) sale solo.

Tiene tres versiones del mismo diseño: escritorio (desde 1100 px de ancho), tablet (de 768 a 1099 px) y móvil (bajo
768 px). El menú de arriba y el pie son los mismos del resto del sitio.

> Detalle técnico: [runtime V1 §1–§2](../../architecture/public-site/BLOG_HOME_RUNTIME_V1.md).

## Qué ve el visitante y de dónde sale cada parte

| Sección | Qué muestra | De dónde sale |
|---|---|---|
| Slider de destacados | Cinco diapositivas a sangre con título, formato, autor y botón | Entradas fijadas, entradas recientes y las tres invitaciones (Glitch, guía o herramienta, diagnóstico) |
| Pregúntale al blog | Un buscador con preguntas sugeridas | La búsqueda del sitio |
| Glitch | La manzana en bytes, la última edición, el último Flash y la suscripción | Las entradas de Glitch y el formulario de suscripción |
| Eventos y webinars | El próximo evento con cuenta regresiva, aprendizajes, agenda, próximos y grabaciones | Los eventos cargados en WordPress |
| Para leer con calma | Un riel de tarjetas de la misma familia: lecturas largas, casos, guías, el diagnóstico, el próximo webinar y episodios de podcast, con autor, fecha, tema e insignia | Entradas, recursos marcados para el riel y el próximo evento |
| ¿De qué escribimos más? | Una órbita con los temas del blog y cuánto se escribe de cada uno | Las categorías de las entradas publicadas |
| Archivo por año | Todo el archivo, filtrable por año y tema | Todas las entradas publicadas |
| Suscripción del final | La suscripción a Glitch | El mismo formulario de suscripción |

Las tarjetas de «Para leer con calma» llevan como máximo **una insignia**, y sólo cuando hay un dato real que la
respalda: «Nuevo» (publicada hace 14 días o menos), «Actualizado» (el editor marcó una revisión de fondo en los
últimos 30 días; el pie dice la fecha), «Gratis» (guías, diagnóstico y eventos sin costo) y «En vivo» (mientras ocurre
un evento). «Más leído», «Tendencia», «Últimos cupos» y «Lista de espera» ya están diseñadas pero todavía no se
encienden: esperan la lectura de visitas y de reservas. Un caso con cliente asignado muestra el logo del cliente.

La tarjeta de foto es vertical y recorta la imagen destacada, que es horizontal. Cuando la destacada trae texto
encima (como las portadas de Manzanitas), el editor puede darle a la tarjeta una imagen propia sin texto y elegir hacia
dónde se centra el recorte; la destacada no cambia y sigue siendo la que se ve al compartir la entrada.

> Detalle técnico: [runtime V1 § «Para leer con calma» v2](../../architecture/public-site/BLOG_HOME_RUNTIME_V1.md).

Cada entrada tiene un **formato** (Artículo, Caso, Guía, Grabación, Podcast, Novedad o las tres variantes de Glitch) que decide
su ícono y el texto del botón. El formato es distinto de la categoría y no cambia la URL de la entrada.

> Detalle técnico: [PDR-029 §1](../../public-site/decisions/PDR-029-modelo-de-contenido-portada-blog.md) y
> [runtime V1 §3](../../architecture/public-site/BLOG_HOME_RUNTIME_V1.md).

## El slider y sus reglas

- Tiene cinco lugares. Tres están reservados para las invitaciones del blog, en este orden: **Glitch** (la última
  edición o Flash), una **guía o herramienta** y el **diagnóstico**. Una entrada fijada nunca las desplaza.
- Los lugares que quedan son para las entradas **fijadas** (hasta la fecha que se elija; al vencer salen solas) y, si
  sobra lugar, para las entradas **más recientes** que tienen imagen.
- En pantalla aparecen primero las entradas y después las invitaciones.
- Una **Novedad** (alianzas, anuncios de Efeonce) sólo entra al slider si se fija. Las entradas de Glitch entran por su
  lugar reservado, no como recientes.
- El «Fijar arriba» de WordPress no se usa: la portada tiene su propia fijación con vencimiento.
- Una entrada sin imagen no puede ser diapositiva.
- Si la entrada tiene una imagen hecha para el slider, se ve tal cual. Si sólo tiene su imagen destacada, lleva un
  **velo de lectura** del lado del texto para que el título se lea, y la bajada se corta en dos líneas.

Hoy el slider muestra dos entradas recientes, el último Flash de Glitch, la guía «Web agéntica» y el diagnóstico.

> Detalle técnico: [runtime V1 §3](../../architecture/public-site/BLOG_HOME_RUNTIME_V1.md) y el manual
> [por CLI](../../manual-de-uso/public-site/operar-portada-blog-por-cli.md).

## La foto del autor

El círculo del autor en cada diapositiva muestra **la foto de perfil subida en WordPress** para esa persona. Si el
perfil no tiene foto, se ven las iniciales, como en el diseño. Una imagen genérica de Gravatar nunca reemplaza la
foto: se prefieren las iniciales. Las diapositivas de Glitch no llevan foto de autor.

> Detalle técnico: desvío 12 de la
> [dirección visual](../../ui/visual-directions/TASK-2051-blog-portada-v3/README.md).

## La suscripción a Glitch

- La píldora «Suscríbete a Glitch» de la sección Glitch y la del final de la página son el formulario real de
  Greenhouse: al suscribirse, la persona queda registrada y suscrita a Glitch en HubSpot.
- Bajo la píldora va el aviso «Al suscribirte aceptas la política de privacidad. Te das de baja cuando quieras.».
  Suscribirse bajo ese aviso es el consentimiento (aprobado por el operador el 2026-10-24). El sistema guarda una
  huella del aviso que la persona vio, y HubSpot sólo la suscribe si esa huella existe.
- Hay una verificación invisible contra robots al enviar, la misma que usa la landing de AEO.
- Mientras el formulario carga (o si el navegador no tiene JavaScript) se ve un enlace a Glitch con la misma forma de
  la píldora, para que la página no salte.
- **Si no hay un formulario conectado, la portada no muestra ninguna suscripción.** Nunca dice «¡Listo!» sin haber
  registrado nada. Esta regla nació el mismo día del corte, cuando los formularios de ejemplo del diseño respondieron
  «¡Listo!» durante unos 40 minutos sin guardar los datos.

Estado al 2026-10-24: conectada y verificada en los tres tamaños, y **probada con una suscripción real**: el contacto
quedó suscrito (SUBSCRIBED) en HubSpot. Todavía falta:

- un **correo de bienvenida** a Glitch (hoy no se manda ninguno);
- decidir si Glitch tiene su **propio tipo de suscripción** en HubSpot (hoy usa «Marketing Information», que es
  genérico);
- el visto bueno visual del operador a la píldora del final, que reemplaza el campo con casilla del diseño original.

> Detalle técnico: [runtime V1 §4](../../architecture/public-site/BLOG_HOME_RUNTIME_V1.md).

## Eventos y webinars

- Un evento aparece en la portada mientras es **próximo**: hasta que termina (inicio + duración). Después sale solo.
- El bloque grande necesita el **arte clave** del evento; muestra la cuenta regresiva, tres aprendizajes, la agenda y
  el botón para reservar o agregar al calendario (archivo `.ics`).
- El enlace privado de la sala (Zoom, Teams, Meet) nunca se guarda en el evento.
- Las grabaciones de webinars son entradas con formato Grabación y aparecen en «Grabaciones para ver cuando quieras».
- **Sin un evento próximo, la sección de eventos no se muestra.** Así está hoy: todavía no hay un evento real cargado.
- **Estado (2026-10-24): todavía no se lanzan eventos reales.** Las reservas funcionan y llegan a HubSpot, y Greenhouse
  lleva el cupo y la lista de espera. Los correos de confirmación y recordatorio están corregidos en local pero no
  salen hasta el próximo release.
- La sesión será un **webinar de Teams** (seminario web de la app Eventos). Lo que viene, todavía sin construir: cada
  persona confirmada queda inscrita en el webinar con su enlace personal, se lee la asistencia y el evento aparece en
  Eventos de marketing de HubSpot. El conector nativo de Teams con HubSpot no funciona hoy (caso abierto con el soporte
  de HubSpot).
- El pendiente completo está en el
  [backlog de RESEARCH-013](../../research/RESEARCH-013-events-webinars-hubspot-teams.md#backlog-canónico-para-cerrar-el-módulo-de-eventos);
  cómo operarlo, en el [manual para lanzar un evento](../../manual-de-uso/public-site/lanzar-evento-o-webinar.md).

> Detalle técnico: [PDR-029 §3](../../public-site/decisions/PDR-029-modelo-de-contenido-portada-blog.md).

## Recursos

Las guías, herramientas, el diagnóstico y el newsletter se registran como **recursos**. Un recurso sólo se muestra si
alguien lo revisó en los últimos 180 días; si no, se oculta hasta revisarlo. Hoy hay dos: la guía «Web agéntica» y el
diagnóstico.

## Qué pasa cuando falta algo

| Situación | Qué ve el visitante |
|---|---|
| No hay formulario de Glitch conectado | La portada sin suscripción (nunca un éxito simulado) |
| No hay evento próximo | La portada sin la sección de eventos |
| El autor no tiene foto propia | Sus iniciales |
| Un recurso lleva más de 180 días sin revisión | No aparece |
| Falta contenido mínimo (una diapositiva, un tema o un año) o algo falla al armar los datos | El contenido de ejemplo aprobado completo, nunca una mezcla |
| El modelo de contenido está apagado | El contenido de ejemplo aprobado |

## Cómo se mantiene

- El contenido se edita en WordPress: panel **Portada del blog** de cada entrada, **Eventos** y **Recursos del blog**
  ([manual](../../manual-de-uso/public-site/operar-contenido-portada-blog.md)).
- Personas y agentes también pueden operarla desde la terminal con `pnpm public-website:blog-home`; cada cambio queda
  registrado ([manual](../../manual-de-uso/public-site/operar-portada-blog-por-cli.md)).
- Al publicar o cambiar algo, la portada se refresca sola: la primera actualización sale de inmediato y las que siguen
  se agrupan en un minuto (medido en el ensayo; falta medirlo en el hosting).
- El diseño no se edita en WordPress: los cambios de diseño pasan por el canvas y un despliegue.

## Pendientes

- Correo de bienvenida a Glitch y decisión sobre su tipo de suscripción propio en HubSpot.
- Visto bueno del operador a la suscripción del final.
- Primer evento real (después del release que cierre el backlog de RESEARCH-013).
- Medir en el hosting que la portada se actualiza en menos de dos minutos.
- Decidir si se elimina la página de revisión `/blog-v3-revision/` (no indexada).

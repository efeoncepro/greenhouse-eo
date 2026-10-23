# Navegación global del sitio — Menú de efeoncepro.com

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-10-23 por Claude
> **Ultima actualizacion:** 2026-10-23 por Claude
> **Documentacion tecnica:** [Navegación global del sitio público V1](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md) ·
> [PDR-027](../../public-site/decisions/PDR-027-navegacion-global-del-sitio-portable.md)

## Qué es

Es el menú que aparece arriba en todas las páginas de `efeoncepro.com`. Reemplazó al menú que traía el tema del sitio
(Ohio) y está activo en todo el sitio desde el 23 de octubre de 2026.

Hay una sola excepción: la página del blog (`/blog/`) sigue con el menú anterior, porque tiene su propio rediseño en
curso.

El mismo día se revisaron en vivo las 52 páginas publicadas y 3 posts de Glitch, en escritorio y teléfono: todas
responden, todas muestran el menú nuevo y ninguna el anterior.

El menú se diseñó una vez y está pensado para que otros sitios de Efeonce, como Think, puedan usar el mismo sin
rehacerlo.

> Detalle técnico: el mecanismo vive en AXIS (contrato `efeonce.site-nav`, `@efeoncepro/axis-ui-primitives`); en
> WordPress lo pintan el plugin «EO Navegación» y el adaptador del tema `ohio-child`. Ver
> [arquitectura §Capas y fronteras](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md#capas-y-fronteras).

## Qué ve el visitante

**La cabecera.** Arriba de la página están la hamburguesa, el logo, una barra con Inicio, Nosotros, Soluciones,
Recursos y Contacto, y el botón «Agenda tu diagnóstico». Las opciones con flecha abren algo; Inicio y Contacto llevan
directo a su página.

**Cómo empieza.** Depende de cómo abre la página:

- si la página abre con una imagen o fondo oscuro, la cabecera aparece transparente, como un vidrio sobre esa imagen;
- si la página abre con un fondo claro, la cabecera aparece desde el inicio como una isla clara, para que el logo se
  lea bien.

**La isla.** Al bajar por la página la cabecera se esconde para no tapar la lectura. Al subir vuelve como una isla de
vidrio flotante, centrada, que toma el tono de la sección que tiene debajo: oscura sobre una banda oscura, clara sobre
una sección clara. Lee también fondos con degradado o con imagen, ignora los velos casi transparentes y no se deja
confundir por otros elementos fijos de la página (la barra del tema, un chat, el aviso de cookies o el dock de las
landings).

Cuando el agendador de reuniones está abierto, la isla conserva el tono que tenía, y al cerrarlo sigue en el tono
correcto.

**Los paneles grandes (mega menús).**

- **Soluciones** muestra las cinco líneas de servicio (Growth, Brand, Engine, Voice y Revenue). Al pasar por una línea
  aparecen sus servicios, una foto, una respuesta corta y un caso o lectura recomendada.
- **Recursos** muestra los formatos de contenido (Glitch, Marketing con Manzanitas, Herramientas y Guías descargables),
  con lo último publicado y un destacado. Lo último de Glitch y del blog se actualiza solo cuando se publica un post.
- **Nosotros** abre una tarjeta más chica con Quiénes somos, Partners y Portafolio.

Sólo puede haber un panel abierto a la vez.

**El menú completo (onepage).** La hamburguesa abre un menú a pantalla completa que nace del botón como un círculo y
cubre toda la ventana, incluso en pantallas muy anchas. Ahí está todo el sitio, con fotos en escritorio, y las redes y
textos legales al pie. En tableta y teléfono es la forma principal de navegar.

**«Estás aquí».** Cuando el visitante está en la página de un servicio, el panel de Soluciones abre en esa línea y
marca ese servicio. No hay que configurarlo: basta con que el enlace del servicio en el menú apunte a esa página del
sitio. Un enlace a otro sitio (por ejemplo Think) nunca marca una página de `efeoncepro.com`, y si dos servicios
apuntan a la misma dirección, no se marca ninguno.

**Agendar desde el menú.** «Agenda tu diagnóstico» está en la cabecera, al pie del panel de Soluciones y al pie del menú
completo. Al hacer clic se cierra lo que esté abierto y aparece el agendador de reuniones de Efeonce flotando sobre la
página difuminada, con un botón redondo para cerrar y los colores de la página `/agenda/`; en el teléfono ocupa la
pantalla completa. Se cierra con ese botón o con Escape, y el visitante vuelve al punto donde estaba. Si el agendador
todavía está cargando, el clic espera un par de segundos; si no está disponible, el botón lleva a la página `/agenda/`.
En las landings que tienen su propio agendador, ese conserva su aspecto.

**Para todos.** El menú se puede usar completo con teclado (Tab, flechas y Escape), avisa a los lectores de pantalla
qué está abierto y respeta a quienes piden menos movimiento en su equipo. Si algo falla al cargar el comportamiento,
los enlaces siguen funcionando.

> Detalle técnico: [§Superficies y estados](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md#superficies-y-estados),
> [§Isla de vidrio](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md#isla-de-vidrio-cabecera-fija),
> [§Motion](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md#motion),
> [§Agendador](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md#agendador) y el
> [flujo de interfaz](../../ui/flows/EPIC-055-public-site-global-navigation-UI-FLOW.md).

## Cómo se gobierna

**Un solo documento.** Todo el contenido del menú (líneas, servicios, textos, fotos, enlaces y el botón de agenda) vive
en un único documento guardado en WordPress. No hay otra copia que se edite: si alguien cambia el menú, cambia ese
documento.

**Con historial.** Cada cambio queda como una revisión nueva con autor, fecha y un mensaje que explica qué se hizo. Hoy
el menú va en la revisión 4. Volver a una revisión anterior no borra nada: crea una revisión nueva con el contenido
antiguo.

**Cómo se cambia.** Mientras no exista la pantalla de edición dentro de WordPress, el menú se cambia con una
herramienta de línea de comandos de Greenhouse. La herramienta:

- trae el menú publicado como punto de partida;
- permite cambiar textos, enlaces, íconos y fotos, o agregar, mover y quitar elementos;
- revisa que todo sea válido, que enlaces y fotos respondan y que los textos quepan;
- muestra capturas de cómo se verá en escritorio y teléfono;
- guarda sólo si nadie más cambió el menú entretanto.

Publicar un cambio o subir fotos en el sitio real necesita el visto bueno del operador.

**Interruptor y vuelta atrás.** Un interruptor del sitio decide si el menú nuevo está encendido en todo el sitio, sólo
en algunas páginas de prueba o apagado. Apagarlo devuelve el menú anterior en todo el sitio en un paso. Si el menú
nuevo no puede pintarse en una página (por ejemplo, porque falta el documento), esa página muestra el menú anterior en
vez de quedar sin menú.

**Cuánto tarda en verse.** Después de guardar, el sitio limpia su caché y el cambio aparece en menos de un par de
minutos (entre 40 segundos y 2 minutos).

**Lo que no se edita desde el documento.** El aspecto del menú (tamaños, tipografía, movimiento y cómo lee el tono) no
se cambia en WordPress: viene de AXIS, el sistema de diseño de Efeonce, en una versión fija copiada en el tema. Cambiar
el aspecto es publicar una versión nueva de AXIS y desplegarla en el sitio; hoy el sitio usa la versión 0.7.13.

**Paso a paso para operarlo.** Está en el manual
[Operar la navegación global del sitio](../../manual-de-uso/public-site/operar-navegacion-global.md).

> Detalle técnico: [§Plugin](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md#plugin-eo-navegación-fuente-de-verdad),
> [§Edición gobernada](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md#edición-gobernada-desde-greenhouse-pnpm-public-websitesite-nav)
> (`pnpm public-website:site-nav`),
> [§Carriles de despliegue y operación](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md#carriles-de-despliegue-y-operación)
> y [§Implementación en AXIS](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md#implementación-en-axis-task-2040).

## Qué mide

El menú deja tres señales para analítica:

| Señal | Cuándo |
|---|---|
| Panel abierto | Alguien abre Soluciones, Recursos, Nosotros o el menú completo. |
| Línea vista | Alguien pasa por una línea de servicio. |
| Clic | Alguien elige un destino del menú; dice qué tipo de destino fue y cuál. |

El clic en «Agenda tu diagnóstico» se cuenta como un clic más y dice desde dónde vino (cabecera, panel o menú
completo). El agendador que abre mide por su cuenta si la persona agenda. Ninguna de estas señales cuenta como
conversión, y ninguna lleva datos personales.

> Detalle técnico: eventos `gh_site_nav_opened`, `gh_site_nav_line_viewed` y `gh_site_nav_clicked`; CTA
> `site-nav-discovery-meeting` con `cta_location: site_nav`. Ver
> [§Medición](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md#medición) y el
> [registro de medición](../../reference/measurement-gtm-ga4/TRACKING-PLAN.md#ctas).

## Límites y pendientes

- **Analítica:** las señales ya llegan a la página, pero falta configurarlas en Google Tag Manager y Google Analytics
  para verlas en los reportes. Se hará con confirmación humana antes de publicar.
- **Velocidad:** falta medir la velocidad de carga contra el menú anterior.
- **Apagar en el sitio real:** la vuelta al menú anterior sólo se probó en un entorno de prueba.
- **Pantalla de edición en WordPress:** todavía no existe (se planificó como una vista previa en vivo junto al árbol del
  menú); por ahora se edita con la herramienta de Greenhouse.
- **Textos cortados en 1280 px:** en ese ancho, las descripciones de servicio largas se cortan en una línea con puntos
  suspensivos. Es el diseño aprobado (tablero Mega1280 del canvas, confirmado el 2026-10-23); en 1440 se ven completas.
- **Barra inferior para landings:** ya está en vivo (2026-10-23) en las siete landings, con el mismo vidrio que el
  menú. Se explica aparte: [Dock de las landings](dock-de-landings.md). Mientras un panel o el menú completo están
  abiertos, la barra se oculta.
- **Loop Marketing:** su landing no está optimizada, así que el servicio lleva a la página de Inbound, y la dirección
  antigua redirige ahí de forma permanente conservando los parámetros de campaña.
- **Páginas antiguas:** algunas páginas viejas o de demo tienen errores propios (formularios borrados, imágenes
  faltantes, contenido que se sale del ancho). No son del menú y quedaron como estaban.

> Detalle técnico: [§Pendientes](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md#pendientes) y
> [§Redirecciones](../../architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md#redirecciones-loop-marketing--inbound).

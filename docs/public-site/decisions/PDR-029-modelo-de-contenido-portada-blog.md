# PDR-029 — Modelo de contenido de la portada del blog

> **Tipo:** Product Decision Record de plataforma del sitio público.
> **Estado:** Accepted · 2026-10-24 · aprobado por el operador («Apruebo», sesión «Portada del blog v3»), escrito por
> el agente que implementa `TASK-2050`. El backfill de formatos sobre entradas publicadas y la carga de recursos y
> eventos reales siguen pidiendo su visto bueno con el dry-run a la vista.
> **Ejecución:** [TASK-2050](../../tasks/in-progress/TASK-2050-blog-portada-v3-content-model.md) (este modelo) y
> [TASK-2051](../../tasks/in-progress/TASK-2051-blog-portada-v3-high-fidelity.md) (la portada que lo consume).
> **Diseño:** canvas «Portada Blog Efeonce», página «v3 · alto impacto», versión 67
> ([dirección visual aprobada](../../ui/visual-directions/TASK-2051-blog-portada-v3/README.md)).
> **Runtime afectado:** `efeonce-public-site-runtime`, plugin `efeonce-editorial-blocks`, carpeta
> `includes/content-model/`.
> **Relacionados:** [PDR-018](PDR-018-pillar-experience-arquitectura-editorial-y-runtime.md) §8 (Yoast es dueño del
> grafo) · [PDR-019](PDR-019-taxonomia-editorial-canonica-blog-wordpress.md) (las 13 categorías) ·
> [PDR-020](PDR-020-canales-propios-sistema-editorial.md) §4.2, decisión pendiente 2 y delta 2026-10-22 (formato ≠
> categoría; orden Glitch → herramienta → diagnóstico; autor real; video en YouTube incrustado con transcripción) ·
> `TASK-2053` (contrato de Growth Forms por evento).

## Contexto

La portada aprobada muestra formatos con ícono, un slider de destacados que mezcla artículos, casos, guías, el
diagnóstico y Glitch, un bloque de eventos con cuenta regresiva y grabaciones, un riel de lecturas largas, una órbita
de temas y el archivo por año. El 2026-10-24 WordPress no tenía nada de eso:

- No había eje de formato. Una edición o un Flash de Glitch sólo se distinguían por el título.
- No había tipo de evento, ni marcado `Event`, ni `.ics`.
- Los recursos de la etapa 1 estaban escritos a mano en el código.
- Nada purgaba `/blog/` (página 18456) al publicar: Kinsta purga la URL de la entrada y sus archivos, pero no sabe
  que la portada la muestra.

Inventario de sólo lectura del sitio vivo (2026-10-24): 44 entradas publicadas, 13 categorías de PDR-019, un solo
autor publicador (Julio Reyes), WordPress 7.1.3, PHP 8.2, Yoast 28.6, caché de Kinsta con purga por URL
(`Kinsta\Cache_Purge::initiate_purge`) y WP-Cron activo por visita.

## Decisión

**La portada del blog se alimenta de un modelo de contenido propio, dentro del plugin `efeonce-editorial-blocks`, con
seis piezas: la taxonomía «Formato», la fijación con vencimiento, el tipo «Evento», el registro de recursos, los
lectores de la portada y las purgas de caché.** El registro de datos está siempre activo para que el editor prepare
contenido; lo que ve el visitante (páginas de evento, marcado, portada con datos reales) espera la opción
`eo_content_model_enabled`.

### 1. Formato (`eo_format`)

| Formato | Slug | Ícono | Botón del slider |
|---|---|---|---|
| Artículo | `articulo` | art | Leer el artículo |
| Caso | `caso` | caso | Leer el caso |
| Guía | `guia` | guia | Leer la guía |
| Grabación | `grabacion` | art | Ver la grabación |
| Glitch Edición | `glitch-edicion` | flash | Leer la edición |
| Glitch Flash | `glitch-flash` | flash | Leer el Flash |
| Glitch Nota | `glitch-nota` | flash | Leer la nota |

- Eje distinto de la categoría (PDR-020 §4.2): nunca reemplaza ni mezcla las 13 categorías, nunca cambia la URL ni
  la categoría primaria de Yoast.
- Taxonomía plana, en REST, **sin URL pública**. El ícono es un término meta (`eo_format_icon`) que nombra el glifo
  del canvas.
- **Exactamente un formato por entrada publicada.** Si llegan dos a la vez, queda el primero del orden de la tabla;
  si se publica sin formato, el plugin asigna el inferido (regla de §1.1).
- «Grabación» es el nombre visible (pregunta abierta de TASK-2050: «Grabación» o «Webinar»). Una grabación es una
  entrada que incrusta el video de YouTube con su transcripción (PDR-020, delta 2026-10-22, punto 6).

#### 1.1 Regla de inferencia (backfill y valor por defecto)

- Categoría Glitch: título que empieza con «Glitch Flash» → Flash; con «Glitch #N» → Edición; si no, Nota.
- Otras: «caso» en el slug o el título, o «Lo que aprendimos» → Caso; «guía» o «paso a paso» → Guía; si no, Artículo.

Aplicada a los títulos de las 44 entradas vivas (inventario de sólo lectura del 2026-10-24) propone: 7 Ediciones, 1
Flash, 2 Notas, 2 Casos, 3 Guías y 29 Artículos. La regla es un punto de partida: el dry-run lista cada entrada y el
operador corrige las que no calcen (por ejemplo, tutoriales que el canvas trató como guía) antes del apply (§7).

### 2. Fijación con vencimiento y título del slider

Metas de entrada, editables en el panel «Portada del blog» del editor de bloques y por REST:

| Meta | Qué guarda |
|---|---|
| `_eo_pin_until` | Fijada hasta (UTC, ISO 8601). Vacía = no fijada. Al vencer sale sola. |
| `_eo_pinned_at` | Cuándo empezó la fijación (la escribe el plugin). |
| `_eo_hero_light` / `_eo_hero_bold` | Las dos líneas del título del slider. Vacías: se parte el título. |
| `_eo_hero_image` | Imagen del slider (adjunto). Vacía: la destacada. |
| `_eo_video_duration` | Duración del video de una grabación (`mm:ss`). |

No se usan las entradas «fijas» de WordPress (`sticky`): una fijación de la portada siempre vence.

### 3. Evento (`eo_event`)

- URL pública `/eventos/<slug>/` sólo con la opción encendida; antes, el tipo existe para el editor y para agentes
  (REST `/wp/v2/eo_event`) sin URL.
- Campos: inicio (UTC), zona horaria IANA, duración, modalidad (en línea, presencial, híbrida), sede, territorio
  (categoría de PDR-019), arte clave, speakers (usuario de WordPress o externo, con rol y organización públicos),
  tres aprendizajes, agenda, `form_key` del Growth Form, entrada de la grabación, estado (programado o cancelado),
  de pago y cupos limitados.
- **WordPress no es dueño del formulario** ni del mapeo a HubSpot: el evento guarda sólo `form_key`, que TASK-2053
  resuelve.
- **El enlace privado de acceso nunca se guarda en el modelo.** Lo entrega el proveedor del formulario por correo; el
  `.ics` y el marcado sólo llevan la URL pública del evento.
- Estados: cancelado · próximo (antes del inicio) · en vivo (entre el inicio y el fin) · terminado · inválido (sin
  inicio). **Un evento es «próximo» en la portada hasta inicio + duración**; un evento cancelado o sin fecha nunca lo
  es. Nota: la task decía «`start_utc > now`» en el detalle y «al pasar inicio + duración» en el criterio de
  aceptación; se adopta el criterio, que mantiene el evento visible mientras se transmite.
- Marcado: pieza Yoast `Event` en la página del evento y `VideoObject` en la entrada de la grabación, por
  `wpseo_schema_graph_pieces`; nada pegado en el contenido (PDR-018 §8).
- Calendario: `GET /wp-json/eo/v1/events/{id}/ics` (RFC 5545, UTC, caché de 5 minutos).

### 4. Registro de recursos (`eo_resource`)

Tipo **no público**: cada entrada apunta a la URL canónica de algo que vive en otra parte y dice dónde puede
aparecer.

| Campo | Qué guarda |
|---|---|
| Tipo | `newsletter` · `herramienta` · `guia` · `diagnostico` |
| URL canónica, territorio, imagen, orden | |
| Ubicaciones | `hero` (slider) · `rail` (riel) |
| Título del slider, bajada, dato corto, marca | Lo que pinta el slider |
| `reviewed_at` | Última revisión |

**Frescura:** un recurso sólo se muestra con tipo, URL y una revisión de los últimos 180 días. El REST lista los
vencidos con `stale: true` para revisarlos. Esto cierra el mecanismo de la decisión pendiente 2 de PDR-020; el
inventario real de herramientas y webinars sigue siendo trabajo editorial del operador.

### 5. Lectores de la portada

Un lector por sección, con su orden, su vacío y su respaldo. La portada y el REST leen lo mismo.

| Sección | Lector | Regla |
|---|---|---|
| Slider | `featured` | Fijadas vigentes, la más reciente primero; sin fijadas, la entrada más reciente que no sea Glitch. Después las invitaciones en el **orden de PDR-020: Glitch → herramienta o guía → diagnóstico**, una de cada una (Glitch = el recurso `newsletter` o, si no hay, la entrada Glitch más reciente). Tope de 5; las fijadas nunca desplazan las invitaciones. Una entrada sin imagen no puede ser diapositiva a sangre y se omite. |
| Temas | `topics` | Los seis del núcleo visible de PDR-019 con publicaciones, contando subcategorías (Diseño incluye Diseño Web); porcentaje sobre el total publicado; la más reciente de cada uno; por defecto, el tema con más entradas. |
| Glitch | `glitch` | Última edición, último Flash y las cuatro ediciones anteriores por número. |
| Eventos | `events` | `next` = el evento programado más temprano que no terminó y tiene arte clave; `upcoming` = los dos siguientes; `recordings` = las tres grabaciones más recientes. Sin nada → la sección no se pinta. |
| Riel | `rail` | Las cuatro lecturas largas más recientes (12 minutos o más, sin Glitch ni Novedades) + recursos con ubicación `rail`. |
| Archivo | `archive` | Años con su conteo y sus entradas. Con año, tema o formato: lista filtrada y paginada en el servidor; esas URL llevan `noindex, follow`. |

- **Autor real:** el nombre público del autor de WordPress, con sus iniciales.
- **Contador de reservas:** nunca se escribe a mano. Lo entrega TASK-2053 o se oculta (`showSeats = false`).
- **Sin evento próximo:** la sección no se pinta. El canvas no tiene una disposición para «la última grabación en el
  bloque grande»; el lector la deja disponible (`featured_recording`) para que TASK-2051 decida si la diseña.
- Paridad programática: `GET /wp-json/eo/v1/home` y `/home/{featured|topics|glitch|events|rail|archive|resources}`,
  más `/home/board/{portada|movil}` con el documento exacto que pinta la plantilla. Sólo datos ya públicos; errores
  `WP_Error` con códigos `eo_*`.

### 6. Purgas de caché

- Publicar, actualizar o despublicar una entrada, un evento o un recurso, o cambiar el formato o las categorías de
  una entrada publicada, sube la versión de caché de los lectores y purga `/blog/` con la purga por URL de Kinsta.
- **Ventana de 60 segundos:** el primer cambio purga de inmediato; los que siguen se juntan en una sola purga al
  cerrar la ventana (WP-Cron).
- **Purgas programadas** en cada vencimiento: fin de una fijación, inicio y fin de un evento.
- Si el operador apaga la autopurga de Kinsta, el plugin la respeta y no fuerza nada; la purga completa sólo se usa
  si la instalación de Kinsta no tiene purga por URL.

### 7. Despliegue, backfill y reversa

| Paso | Cómo | Reversa |
|---|---|---|
| Paquete del plugin | `build-blog-v3-content-model-package.cjs` + `deploy-blog-v3-content-model-package.php` (lista cerrada de rutas, hashes, guarda de deriva, respaldo `.tar`) | Restaurar el `.tar` |
| Backfill de formato | `backfill-format.php`: dry-run → aprobación del operador → apply por lotes de 10 con ledger | `restore` con el ledger |
| Encender la portada | Opción `eo_content_model_enabled = 1` | Opción en 0: los datos quedan inertes y la portada vuelve al contenido de ejemplo |

Orden obligatorio: este PDR aprobado → paquete → backfill revisado → eventos y recursos reales cargados → opción
encendida junto con la publicación de la portada de TASK-2051.

## Consecuencias

- La portada se mantiene sola: publicar es suficiente para que aparezca, y lo que vence sale sin intervención.
- El editor gana un panel y dos tipos nuevos en el escritorio de WordPress; ninguna entrada existente cambia de URL,
  categoría ni contenido.
- El tema Ohio no tiene plantilla propia para `/eventos/<slug>/`: hasta que TASK-2051 la diseñe, la página del evento
  usa la plantilla genérica de entrada del tema.
- Los colores de línea de IA, Growth, Inbound, Marketing Digital, SEO y Novedades son provisorios (pregunta abierta
  de TASK-2050); AEO, HubSpot, Diseño y Loop son los del canvas.

## Alternativas descartadas

- **Un plugin de eventos de terceros** (The Events Calendar y similares): agrega su propio marcado, plantillas y
  datos de inscripción, choca con Yoast como dueño del grafo y con Growth Forms como dueño del formulario.
- **Usar las categorías como formato:** rompe PDR-020 §4.2 y cambiaría URLs (`/%category%/%postname%/`).
- **Recursos escritos en el código** (etapa 1): obligan a desplegar para cambiar un enlace y no tienen frescura.
- **Entradas fijas de WordPress (`sticky`):** no vencen y Ohio las promueve en sus propios listados.

## Pendientes del operador

1. Aprobar este PDR (pasa a `Accepted`).
2. Revisar el dry-run del backfill de formato (las 44 entradas) antes del apply.
3. Cargar el inventario real de herramientas y webinars (PDR-020, decisión pendiente 2) y los speakers reales.
4. Confirmar «Grabación» como nombre visible y los colores provisorios.

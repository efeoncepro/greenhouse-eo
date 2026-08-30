# Agency Elementor Modules V1

## Identidad y estado vigente

Por instrucción explícita del operador, `page_on_front=251731`: esta página sirve ahora
`https://efeoncepro.com/`, con `index, follow` y canonical raíz. El antiguo slug de preview navega a `/`.
Se conservaron el título SEO, descripción e imagen social de la Home anterior; no se reescribió el cuerpo.
El menú Home `247118` apunta a `251731`. La página anterior `2791` conserva su diseño en `/home-2/`,
publicada con `noindex` para recuperación; no se borró ninguna página ni se modificaron header/footer.

Mutación: `scripts/public-website/promote-agency-home.php`; snapshot durable en la opción WordPress
`_gh_home_cutover_20260830_162109` (configuración de portada, ambas páginas/metas y enlace del menú).
Rollback autorizado: inspeccionar primero el snapshot y drift actual; restaurar `page_on_front=2791`,
la referencia del menú y sólo título/metas SEO/thumbnail modificados por el cutover. No reescribir
Elementor: ambos hashes quedaron intactos. Si fuese necesaria recuperación de contenido, usar Document::save.
Regenerar indexables Yoast afectados, purgar cache y verificar raíz y URLs anteriores.

El checkpoint de implementación más reciente es el showreel del 2026-08-30: 17 módulos, cero HTML,
414 campos raíz y seis repeaters; hash del documento
`30bab640e2dae49b9f6b13582c6dd426c018c4fda2419c0f199634cdc659605c`.
Es una referencia de drift fechada, no autorización para escribir ni sustituto de leer el runtime actual.
Evidencia por revisión, snapshots y límites: [audit visual](../../audits/public-site/2026-08-30-home-visual-review.md).
**Pendientes:** copy/claims y prueba de edición/guardado desde la interfaz Elementor.
El cutover solicitado está completo; no implica completar el rework de TASK-1358 ni su `UI ready`.

## Alcance y decisión de implementación

La Home `251731`, construida primero como preview, usa 17 contenedores nativos de Elementor,
cada uno con un widget semántico del plugin existente `eo-elementor-widgets`. No contiene widgets HTML.
Es una extensión del carril de [primitives públicas](PRIMITIVES.md), no otra plataforma UI ni un plugin por página.
El respaldo `2791`, el header/footer Ohio y las demás landings quedan fuera de las revisiones del cuerpo.
La navegación sólo cambió en el cutover explícito ya descrito; no debe reescribirse por un ajuste visual.

El contenido editable vive en `_elementor_data`; las composiciones, estilos e interacciones viven versionados
en `/Users/jreye/Documents/efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets`.
No hay campos para pegar HTML, CSS ni JavaScript. Elementor permite mover/duplicar módulos; no editar
cada átomo de sus diagramas como un widget independiente. Nuevas composiciones exigen extender el renderer.

Alternativas revisadas: `ComparisonTable` no reproduce la comparación de cuatro alternativas de la fuente.
Tras las anotaciones del operador, `trust` reutiliza `EO_Logo_Marquee_Widget::render_marquee()` igual que
Redes Sociales (siete clientes, slow/compact), con dependencia condicional `eo-logo-marquee`; no duplica logos.
Agenda navega al motor existente de reuniones en `/agenda/`, sin formulario ni handler de éxito ficticio. El HTML
monolítico anterior quedó reemplazado. No se modifica un contrato compartido de plataforma: no requiere ADR nuevo.

## Contrato técnico

- Clases: `includes/widgets/class-eo-agency-landing-{base,widgets}.php`; 17 nombres `greenhouse_agency_*`.
- Módulos: hero, trust, problem, reframe, motor, work, servicios, stack, proof_engine, ecosystem,
  method, cases, social_proof, comparison, faq, agenda y experience.
- Schemas: `includes/agency/schemas/*.json`; plantillas versionadas en `includes/agency/templates/*.html`.
- Controles registrados: 414 campos de contenido raíz más seis colecciones repetibles. Tipos nativos
  TEXT/TEXTAREA, URL, MEDIA, NUMBER y SELECT; controles de color, padding responsive, ancla y motion.
- Repeaters: logos de clientes del hero, dos bandas de trabajos, servicios, fases y preguntas frecuentes.
- Casos ahora es un CTA compacto: `eyebrow`, `title`, `description`, `button_label` y `cases_url`.
  Reutiliza tarjeta/botón Agenda con modificador scoped; conserva ancla `casos` y URL de portafolio editable.
  Grid texto/acción, apilado <=760 px; hover sólo flecha 3 px y color, reducido sin transform.
  El antiguo repeater/cifras se retiró mediante migración guardada; recuperación documentada en audit visual.
- IDs de control y presets `_layout` son contrato persistido: no renumerarlos al evolucionar el schema.
  `_layout` selecciona una variante aprobada, nunca HTML suministrado desde settings.
- URL nativa requiere default de tipo array (`['url'=>'']`), incluso cuando no hay destino. El helper
  normaliza strings históricos antes de registrar controles: un renderer local que acepte strings no prueba
  compatibilidad con `Control_URL` de Elementor real. Verificar registro y render del servidor por separado.
- Escaping contextual de texto/URL/atributos; imágenes desde Media, alt editable por fila y fallback al adjunto.
  SVG internos namespaced por instancia. Marker `data-gh-schema="agencyModule.v1"`.
- Assets condicionales por dependencia Elementor: `agency-landing.css`, `agency-elementor.css`,
  `agency-landing.js`; CSS bajo `.gh-agency-*`, sin overrides globales del tema.
- JS idempotente: montaje/desmontaje por módulo, AbortController, cleanup de observers/timers/RAF,
  hooks de Elementor y detección de reemplazos. Reejecutar el asset no duplica listeners ni marquees.
- `experience` debe existir una sola vez por página: contiene modal, barra de progreso y CTA móvil.
  No duplicar hero/anclas por defecto sin asignar anclas únicas.
- `experience.video_url` es URL Elementor nativa. El botón existente abre un `<dialog>` modal nativo,
  con marco navy y video 16:9. Sólo un clic crea el iframe `youtube-nocookie.com`; editor no lo carga.
  El parser admite HTTPS YouTube/youtu.be y un ID de once caracteres, no destinos arbitrarios.
  Cierre/desmontaje elimina el iframe, restaura scroll y foco. YouTube controla reproducción/fullscreen;
  `Ver en YouTube` ofrece recuperación. No hay API SDK ni player antes del clic; `youtube-nocookie`
  no garantiza ausencia de tratamiento por terceros después de reproducir. No hay preconexión al player.
  La URL vacía/inválida no crea iframe ni destino alternativo. La modalidad pertenece al `<dialog>` del
  navegador; X y clic exterior cierran. Escape desde el documento y retorno de foco están cubiertos;
  recorrido completo de teclado y Escape dentro del iframe cross-origin no están certificados.
  Configuración: `configure-agency-home-video.php`; evidencia y snapshot en el audit.
- Modo editor/reduced motion: contenido revelado y animación ambiental detenida; filtros con flechas,
  Home/End; FAQ nativa. Comparación móvil con scroll contenido intencional.
- Motor a <=600 px: núcleo sobre grilla de tarjetas de altura por contenido; evita superposición del
  posicionamiento absoluto del export, manteniendo su composición original en escritorio.
- Full-width Ohio se resuelve con `--clb-container-side-gutter:var(--clb-grid-gutter)` en el contenedor,
  no con cálculos de margen en JavaScript.
- Reframe/proof/ecosystem/agenda exponen `heading_color` → `--agency-heading-color` para evitar que Ohio imponga
  texto oscuro. Agenda tiene dos columnas >760 px y una columna en móvil; conserva el texto izquierdo original.
- HubSpot usa Media `hubspot_logo`, SVG de Simple Icons 16.21.0, servido localmente por HTTPS.
  El código fuente oficial y los diez adjuntos reutilizados están identificados en el audit visual.
- `hubspot_logo` existe tanto en Stack como en Social Proof. Agenda usa teal con tinta navy y controles
  `button_background`, `button_text_color`, `button_hover_background`, sin cambiar los CTAs azules restantes.
- FAQ integra su CTA dentro de la tarjeta de contacto; grid de dos columnas en escritorio y una a <=1024 px.
  El sidebar sólo es sticky cuando hay anchura >1024 px y altura >760 px; el CTA nunca es un tercer ítem suelto.
- FAQ ya no tiene mail; Agenda lo conserva. Ambos CTA usan `-undash` de Ohio para excluir el subrayado animado
  que cubría el fondo durante hover. Casos y enlaces de Servicios reutilizan esa exclusión. La prueba
  sostiene el cursor después de terminar la transición, no sólo en el primer frame.
- Servicios expone `services[].icon_media` para la presentación CRM, que usa el mismo sprocket HubSpot.
  Una máscara SVG alpha con ID por instancia hereda `currentColor`: teal en reposo y blanco en hover.
  El recurso sigue editable como Media; no se aplican filtros aproximados ni colores fijos al SVG original.
- `services[].landing_link` es URL nativa opcional, con default array compatible con Elementor. Vacía
  conserva artículo sin enlace; URL segura envuelve el h3 con un único anchor y área extendida por CSS.
  Respeta opciones externo/nofollow, foco visible y exclusión Ohio `-undash`, sin navegación por JavaScript.
- Ecosistema usa los isotipos oficiales negativos del repo: `public/images/greenhouse/SVG/negative-isotipo.svg`
  y `public/branding/SVG/isotipo-globe-negativo.svg`, distribuidos localmente en `assets/img/agency/`.
  Los controles Media son `f001_imagen` (Greenhouse) y `globe_logo` (Globe); este último sustituye el icono genérico.
- Halo Ecosistema elíptico de sección completa; hero con halo contenido e isotipo proporcional al gráfico
  (11,5%, máximo 62 px), alineado al núcleo mediante igual profundidad de parallax.
- Kortex y Wave tienen Media `kortex_logo` y `wave_logo`. Fuentes: repo hermano
  `dev/kortex/apps/web/public/logo/isotipo.svg` y `public/branding/SVG/isotipo-negativo-wave.svg`.
  Verk y sus controles fueron retirados; `show_launch_notice=no` oculta el aviso conservando sus textos/enlace.
- Hero delega `brands[]` al renderer compartido Logo Marquee con `proofOnly=true`, contrato `brandProof.v1`.
  Berel/SKY/Bresler reutilizan los archivos de AEO; densidad, variante y etiqueta accesible son editables.
  El hover original eleva 6 px y escala 1,08 con halo; reduced motion elimina transformación y transición.
- Trabajos mide el período real entre originales y copias, incluido gap, y genera suficientes grupos para
  cubrir viewport + período. ResizeObserver recalcula cobertura; las imágenes se preparan antes de entrar
  en pantalla. Copias inertes/aria-hidden; editor/reduced motion sin clones ni animación.

## Contenido y destinos vigentes

El port fue source-led: leer HTML, CSS, JavaScript, assets y estados interactivos del export antes de
descomponerlo. Las capturas son evidencia visual, no la fuente editable. Las revisiones posteriores del
operador prevalecen sobre la reproducción literal del export; no regenerar placeholders ni notas de wireframe.

- «El costo de trabajar por separado» y «Un equipo. Una misma dirección.» sustituyen las etiquetas internas
  de Problema/Reencuadre. El cierre maximalista de Comparación se moderó. Son ajustes locales: no aprueban
  globalmente posicionamiento, cifras, partners ni claims del resto de la página.
- Trabajos reutiliza diez adjuntos de Media de la Home anterior en dos filas de cinco; Trust reutiliza
  siete logos de Redes Sociales. La procedencia exacta y los IDs están en el audit; el nombre histórico
  del archivo no sustituye la marca visible, su ALT ni la inspección de los píxeles.
- Servicios conserva doce tarjetas, cuatro con destino publicado y ocho sin enlace. Los links sólo se
  crean cuando existe una landing correspondiente verificada; no enviar las restantes a contacto por defecto.

| Tarjeta | Destino | Página |
| --- | --- | ---: |
| SEO y AEO | `/servicios/posicionamiento-seo/` | 251078 |
| Contenido y creatividad | `/agencia-creativa-v2/` | 251279 |
| CRM y automation | `/servicios-contratar-hubspot/` | 244079 |
| Desarrollo web y CMS | `/desarrollo-sitios-web/` | 250816 |
| Casos, CTA único | `/portafolio/` | 247116 |

Agenda y los CTA de reunión conservan el motor existente en `/agenda/`; ningún widget Home mantiene
un formulario de éxito simulado. El showreel autorizado es `https://www.youtube.com/watch?v=yHUystNmtcQ`:
no se describe como demo funcional de Greenhouse ni se le atribuye una duración no medida.

## Fuente y mantenimiento

Fuente: `/Users/jreye/Documents/agencia/Landing - Agencia/Landing Agencia.dc.html`, SHA-256
`6062b32ec68f4511498ab91d8e3582b18247ff52d1354dfe2b5042a32abd7617`.
`scripts/public-website/compile-agency-elementor-source.cjs` fue el compilador de importación inicial;
depende del export y de `.captures/task-1358-claude-source-audit/rendered-body.html`. No es dependencia
runtime ni debe ejecutarse sobre una versión evolucionada sin revisar el diff: puede regenerar defaults.
El mantenimiento normal ocurre sobre schemas/plantillas versionadas y settings de Elementor.

Verificación: `php tests/agency-modules.test.php` en runtime; `node scripts/public-website/agency-elementor-lifecycle.test.cjs`
en Greenhouse; `verify-agency-elementor-contract.php` por WP-CLI para el checkpoint desplegado.
El auditor de navegador `verify-agency-elementor-browser.mjs` se ejecuta a través de Browser, valida anclas
antes de capturar y guarda frames en `.captures/agency-elementor-rollout/browser/`.
Los conteos del checkpoint no sustituyen pruebas de widgets con contenido añadido, removido o reordenado.

## Mutación, despliegue y reversión

Guardar documentos sólo mediante Elementor `Document::save()`, preservando settings y metas Ohio/Yoast.
Antes de escribir: comprobar portada/status/ownership marker y hash, resolver widget por identidad, capturar
documento/settings/metas protegidas y snapshot durable. Después: comparar JSON decodificado y metas,
incluido `_thumbnail_id`, además de hashes de páginas protegidas. No usar búsquedas en JSON escapado como
prueba de ausencia ni repetir automáticamente un writer después de una respuesta incierta.
La migración inicial `migrate-agency-elementor-preview.php` tiene guard de hash: no es un sincronizador recurrente.
`deploy-agency-elementor-package.php` acepta ZIP + manifest `agency-elementor-release.v1`, con allowlist de
paths y SHA anterior/nuevo; aborta ante drift, respalda antes de escribir, instala loader al final y purga cache.
Invalida también caché Elementor de templates/elementos antes de purgar Kinsta; un hash de archivo no prueba HTML servido.
No desplegar todo el checkout runtime: contiene WIP ajeno de Creative/Social.

Los snapshots iniciales (`_gh_backup_before_agency_elementor_20260830T160012Z` y
`_gh_backup_before_agency_media_20260830T160527Z`) son históricos, no el rollback del último cambio.
Para revertir una revisión, resolver su pareja snapshot/manifest en el audit. Última pareja documentada:
`_gh_home_video_20260830_195821` y `/tmp/eo-agency-before-20260830-195756.tar` (cuatro archivos).
Los tar remotos son temporales, no almacenamiento durable. Ante rollback, guardar primero el estado actual,
restaurar el documento deseado por `Document::save()` y sólo después retirar/restaurar widgets que ya no use.
Restaurar archivos exactos según manifest, nunca todo el plugin ni rutas con glob; purgar y verificar Home/preview.

## Evidencia y límites

El audit conserva los checkpoints del 2026-08-30 y distingue cada alcance: contrato PHP/Elementor real,
ciclo de vida JavaScript y navegador no son equivalentes. El último contrato real informó 17 contenedores,
17 widgets, cero HTML, 414 campos y seis repeaters. Browser registró reproducción real del showreel,
close/unmount sin player, retorno del foco, 1280/890/390 sin overflow y reduced motion sin animación del modal.
PHP/JS cubren controles, escaping, URL válidas/inválidas, reorder/removal y montaje/reemplazo/desmontaje.
Los frames en `.captures/agency-home-video/` complementan los de cada revisión anterior; las capturas
emuladas pueden escalarse dentro del canvas del host, por lo que deben acompañarse de geometría DOM.
No presentar una captura antigua del modal placeholder como evidencia del reproductor actual.
**Pendiente:** prueba de edición + guardado + recarga desde la interfaz Elementor; el navegador está en login.
Registro de controles y render probe del servidor NO equivalen a esa prueba de editor.

La página es la Home `publish + index`; no hay revisión final de copy/claims ni certificación del editor UI.
Las dos filas contienen cinco imágenes cada una, sin placeholders. El CTA abre el calendario vigente;
la verificación no creó reservas. El estado de TASK-1358 y sus aceptaciones pendientes viven en su task,
no se derivan de tener un frontend publicado.

Ver [funcional](../../documentation/public-site/agency-elementor-preview.md) y
[manual](../../manual-de-uso/public-site/agency-elementor-preview.md).

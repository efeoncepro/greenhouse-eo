# Handoff

[Historial](Handoff.archive.md).

## 2026-10-24 — Portada del blog: «Explora por tema» v2 (TASK-2051) en producción
La órbita de `/blog/` dejó de mostrar «¿De qué escribimos más?» y es la puerta a las categorías: «Elige por dónde
empezar.», seis temas (HubSpot, Inbound, Marketing digital, Loop Marketing, AEO, Diseño) como enlaces a
`/category/<slug>/`; el centro muestra descripción, tres lecturas y «Ver todo»; en móvil, lista por lecturas
(runtime `f2210d7`, efeonce-editorial-blocks 0.4.8; Greenhouse `55c0b7d8e`; canvas versión 95). Descripción de Diseño
cargada. Verificado en vivo: enlaces en el HTML del servidor, hover, 1440/390, desborde 0, axe 0. Además, las tarjetas
de foto del riel tienen imagen y foco propios (`card`), aplicados a 249387, 251397 y al recurso 252050. Sin push.

## 2026-10-24 — Portada del blog: imagen y punto focal propios de la tarjeta de foto (TASK-2051)
Pedido de la sesión «Análisis de Analytics y Search Console» con aprobación del operador: la tarjeta de foto recortaba
al centro y cortaba el texto incrustado de las portadas de Manzanitas. En vivo: metas `_eo_card_image` /
`_eo_card_focus` (panel y comando `card`, plan salvo `--apply`, falla si cambia la destacada), `efeonce-editorial-blocks`
0.4.5, runtime 6578773, Greenhouse e60f5045c; `verify --browser` 0 px en 8 anchos, riel sin cambios. Foco medido:
`84% 30%` sirve en los tres tableros para una cara a ≈71 %. `card 244765 --focus "84% 30%"` corrió sólo como plan.
**Pendiente:** aplicarlo cuando 244765, 245605 o 245154 entren al riel (QA: la sesión de Analytics). Sin push.

## 2026-10-24 — Portada del blog: tarjetas v2 de «Para leer con calma» (TASK-2051) en producción
Desde 21:12 UTC el riel usa las tarjetas aprobadas (canvas versión 93): foto a sangre, logo del cliente ANAM, pregunta
del diagnóstico, guía firmada por Efeonce Think, insignias con regla y dato real, autor, fecha y hover líquido
(runtime `e9124fa` + `7bfbd40` + `9fec02d`, `efeonce-editorial-blocks` 0.4.4; Greenhouse `aa96207ac`). Gates en
vivo: desborde 0 px en 8 anchos, un H1, axe 0 en los tres tableros; local: equivalencia, paridad 27 casos, píxeles 25/25.
Datos: `client 251432 anam --apply` (ledger). Webinar (próximo evento) y podcast (formato nuevo) tienen soporte sin
contenido. **Pendiente:** lectores para «Últimos cupos»/«Lista de espera» (reservas Growth Forms) y «Más leído»/
«Tendencia» (GA4), por el filtro `eo_home_rail_signals`. Sin push en ningún repo.

## 2026-10-24 — Archivo del blog: variante Glitch (TASK-2056) en producción
`/category/glitch/` y `/glitch/` sirven la variante Glitch aprobada en el canvas (versión 79) desde ~19:50 UTC: wordmark,
«EDICIÓN #17» y «FLASH», muletilla en Guttery, falla en bytes, placas por fila, filtro Ediciones/Flash/Notas y banner de
suscripción con la píldora real blanca (runtime `9a19d46`, Greenhouse `db64920a2`). Verificado en vivo (200, un H1,
canonical, index, desborde 0, axe 0 en 7 vistas, `/blog/` verify verde). **Pendiente:** el logo dentro de la píldora
necesita el renderer de Growth Forms 1.3.0 en producción (commit en develop, sin push ni release). **Pedido del
operador para después:** no le gusta la grilla «Para leer con calma» de la portada (tarjetas tipográficas sin foto
alternadas con tarjetas con foto); es un cambio de diseño de TASK-2051 que se dibuja primero en el canvas.

## 2026-10-24 — Archivo del blog v3 (TASK-2055): en producción, task cerrada

**Búsqueda, temas, etiquetas y autores de efeoncepro.com sirven el «Archivo del blog» desde el 2026-10-24 ~18:20 UTC**
(`eo_blog_archive_enabled = 1`): dirección D aprobada (canvas «Portada Blog Efeonce» v75), plantilla en `eo-blog-home`
(`EOBH_Archive`, runtime `2c2cfbb`), datos por `EO_Archive_Adapter` (`efeonce-editorial-blocks`), seis descripciones de
temas aprobadas y cargadas. Verificado en vivo: matriz HTTP/robots/canonical/schema, sin desborde ni palabras cortadas de
320 a 1920, axe 0, `/blog/` verify verde, post con FAQ intacto. Rollback: `pnpm public-website:blog-home archive 0 --apply`.
Contrato `docs/architecture/public-site/BLOG_ARCHIVE_RUNTIME_V1.md`; manual `operar-archivo-del-blog.md`.
Lección: el `header-cap` de 108 px de Ohio sólo existe en archivos (el preview local con el shell de /blog/ no lo ve):
correr siempre el gate en producción con `archive preview`. Pendientes fuera de alcance: `/wp-json/wp/v2/users` y
`?author=N`, 404 del sitio, «lecturas» vs «publicaciones» en la órbita. Task cerrada: `pnpm test` (21 299 pruebas) y `pnpm build`
verdes sobre `f908db7d5`. Residual: el runtime no se empujó a su remoto (origin/main ya estaba divergido). Propuesta
abierta: variante Glitch de `/category/glitch/` (= `/glitch/`), espera decisión del operador y tablero en el canvas.

## 2026-10-24 — Partners: popup «Quiero ser partner» en vivo tras el release (TASK-2044/2045)

El release a `main` llevó los renderers formularios `1.2.0` y CTA `1.4.0`. En `/partnership/` (248003, módulo
«cierre») el botón abre el Growth CTA `partners-become-partner` en diálogo con el formulario
`efeonce-partner-application` (HubSpot directo a «Lead Gean - Partnership»); verificado en vivo 1440/390 (diálogo
«Sumémonos», 5 campos + consentimiento, Escape, `dataLayer` con `activation_mode: dialog`). Snapshot
`_gh_partners_v2_before_20261024_122057`; backups `/tmp/eo-partners-widgets-before-20261024-12*.tar`. **Pendiente:**
smoke de envío real (requiere OK del operador: crea un registro CRM), DLV GTM + dimensión GA4 `activation_mode`
(preview + confirmación) y GVC formal; defecto: cerrar con el primer campo enfocado dispara
`gh_form_field_validation_failed` (renderer). TASK-2044/2045 siguen `in-progress`. **Sin push** (develop adelantado).

## 2026-10-24 — Prospección del chat: documentación y continuidad por canal

[Cinco casos y evidencias](docs/commercial/prospecting-agent/runs/2026-10-24-cierre-chat-prospeccion.md):
Fundación Luz, Arcor, Huelquén, NIASA y Disney. Los cinco EMAIL `SENT` corroborados en CRM; Huelquén ya tiene
logging. LinkedIn de Arcor sigue sin realizar. Sólo NIASA tiene secuencia, con pasos futuros observados
29/10 y 05/11 en hora de México; comprobar el CCO de cada paso automático antes del disparo, sin duplicar la
secuencia desde el seguimiento recurrente. Revisiones internas de Mariana
27/10 e Ignacio 28/10 ya pertenecen al radar separado. Paola conserva catch-all pendiente de aclaración antes
de nuevas acciones; el envío histórico no valida la casilla. Sin nuevas comunicaciones, créditos o mutaciones
CRM en este cierre. Docs, cuatro skills espejo y escenarios conciliados; [auditoría](docs/audits/commercial/2026-10-24-chat-prospeccion-docs-skills.md).

[Lucía/Flesan y Yvette/Sigelec](docs/commercial/prospecting-agent/runs/2026-10-24-lucia-yvette-prospeccion.md)
añaden dos casos con Contact/Primary/segmentos, Enviados, EMAIL `SENT` e InMail comprobados por separado.
Yvette: primer resultado inválido descartado; patrón inicial + primer apellido y LeadMagic `validated` para
otra candidata; atribución aún inferida, alta/envío por excepción expresa. Sin secuencias nuevas. Docs y dos
skills espejo actualizadas, tres escenarios sintéticos; [controles y límites](docs/audits/commercial/2026-10-24-lucia-yvette-docs-skills.md).

Mandato posterior: [dos secuencias programadas](docs/commercial/follow-up-agent/runs/2026-10-24-lucia-yvette-secuencias.md),
dos correos por persona y firma gráfica comprobada. Julio autorizó registro nativo con excepción al CCO para
ambas: Programado1/EnCurso0/Error0,29Oct10:00 y05Nov10:05 Perú. Respuesta/reunión desinscribe al Contact;
no duplicar por radar/Outlook. Calendario guardado releído; correos de seguimiento todavía no enviados.
Método y skills espejo concilian la excepción individual y el reader CLI fallido sin repetir inscripciones;
[cierre documental](docs/audits/commercial/2026-10-24-lucia-yvette-secuencias-docs-skills.md). No cambia el permiso del radar.

## 2026-10-24 — Portada del blog v3 en producción; operable por agentes

**`/blog/` (18456) sirve la portada v3 desde el 2026-10-24 08:13Z** con datos reales, menú canónico (paquete del tema
con `EO_SITE_NAV_EXCLUDED_PAGES` vacío), foto del autor desde su perfil de WordPress y tres tableros. Rollback del
corte: `pnpm public-website:blog-home page rollback --snapshot _gh_blog_home_v3_before_20261024_081327 --apply`.
Verificado en vivo: sin desborde de 320 a 1920, un H1, axe 0 en los tres tableros, indexable. La página de revisión
252046 sigue publicada (noindex): mandarla a la papelera cuando el operador lo confirme.

**Operación por cualquier agente:** `pnpm public-website:blog-home` (manual
`docs/manual-de-uso/public-site/operar-portada-blog-por-cli.md`, referencia de skill `blog-home-operation.md`):
estado y motivo de cada diapositiva, fijar, título e imagen del slider, formato, recursos, eventos, suscripción, flag,
purga, despliegue de los dos plugins (con línea base viva y flag off→on) y verificación en navegador. Cada `--apply`
queda en `scripts/public-website/blog-home/ledger/`.

**Suscripción a Glitch: real y en vivo** desde el release `40b330175855` (orquestador `40090589488`, released): formulario
`efeonce-blog-subscription` publicado como píldora (`fver-e6850cc8…`, `pnpm growth:forms:publish-glitch-pill`) y
conectado con `pnpm public-website:blog-home subscription 6bc62588-… --apply`. HubSpot suscribe por el acto de enviar
bajo el aviso (`consentBy: 'submission'` + hash del aviso, aprobado por el operador). Verificado en vivo sin envío:
renderer en los tres tableros, sobrevive al autoplay del slider, abre el campo, axe 0. **Envío humano real verificado
(2026-10-24 15:33Z, operador):** submission `delivered`, recibo HubSpot `verified`, contacto `SUBSCRIBED` al tipo 535702717
(«Marketing Information», genérico) con `CONSENT_WITH_NOTICE`. No sale correo de bienvenida: no hay ninguno configurado.
**Pendiente:** visto bueno visual de la píldora en el pie (desvío 13); decidir bienvenida y tipo de suscripción propio.
Desconectar: `subscription off --apply`.
**Defectos visuales de la píldora: corregidos en local (`a5b028461`, sin push).** El autocompletado lo pintaba la regla
`:-internal-autofill-selected` de Chrome (`!important` de agente de usuario; reproducido con `Autofill.trigger` en Chrome
real); «¡Listo!» quedaba corrido por la grilla de `.ghf-inline-msg`. Gate `inline-pill.scenario.mjs` dentro de
presupuesto. **El operador decidió no hacer release por ahora** (~3 h cada uno): correos (`2a971d768`) y píldora esperan
al próximo release que él decida.
**Eventos/webinars (2026-10-24):** las sesiones son **webinars de Teams** (no reuniones). El conector Teams↔HubSpot no
lee ningún webinar aunque Entra, la política de Teams (`MY-APP-POLICY`, ahora también asignada a jreyes) y los ajustes
de HubSpot están bien; ticket de soporte **#50018204746** derivado a agente humano (anexo C). Diseño alternativo sin
costo: Greenhouse dueño de la reserva e inscripción en el webinar por Graph (app Entra dedicada), asistencia por sesión
y Marketing Events por API solo mientras el conector esté roto (anexo D). **Backlog canónico** para cerrar el módulo:
`docs/research/RESEARCH-013-events-webinars-hubspot-teams.md` § «Backlog canónico». Pendiente del operador: quién manda
la confirmación con el enlace (Greenhouse o Teams). Webinars de prueba publicados en Teams: «La IA no conoce tu negocio»
(24-oct) y «La IA y la busqueda» (26-oct); cancelarlos al terminar. PowerShell 7.6.8 + módulo MicrosoftTeams 8.0.0
instalados en el Mac del operador (`brew`, `Install-Module -Scope CurrentUser`).

**AXIS v0.7.15 publicado** (CI `dc7c721`, primitives 0.7.15; la prueba del haz del buscador ya no compite con el
runner). Sin evento real cargado: la sección de eventos queda oculta hasta el primero (`blog-home event`).

**Búsqueda y archivos del blog (2026-10-24, sin dueño):** búsqueda, categoría, etiqueta y autor siguen en la plantilla
de archivo de Ohio, con el recuadro de demo «Hire us! We are WordPress specialists», textos en inglés, categoría vacía
indexable y desborde a 390 en dos archivos. Diagnóstico y propuesta (contención en vivo + plantilla «Archivo del blog» v3):
[auditoría](docs/audits/public-site/2026-10-24-blog-search-archive-views.md). Decisión: contención junto con el rediseño, en sesión nueva; falta la task.

**Eventos y webinars: infraestructura desplegada, NO operativa.** El release `e593e3993bc3` llevó los correos de
reserva (confirmación con `joinUrl` + `.ics`, lista de espera, recordatorio por `/growth/events/reminders` + Cloud
Scheduler `ops-growth-event-reminders` `*/15`), `GROWTH_EVENT_EMAILS_ENABLED` ON en el ops-worker y el lanzador
`pnpm events:launch -- --brief <json> [--apply] [--skip-wordpress]` (manual `lanzar-evento-o-webinar.md`). La prueba de
punta a punta con `prueba-e2e-eventos-2026-10-24` (sin WordPress) dejó 2 reservas (confirmada + en espera), consentimiento
con hash y HubSpot 200, pero **ningún correo salió**: consumer y recordatorio exigían `status='accepted'` y el dispatcher
ya la había pasado a `delivered`. Corrección local (`ACCEPTED_SUBMISSION_STATUSES` en `event-emails.ts` + `store.ts`,
prueba `event-emails-accepted-status.test.ts`, SQL contra PG real), **sin release**; un intento local sin
`RESEND_API_KEY` dejó 3 filas `config_error` en `email_deliveries` (el job de reintentos no las toma: no salió ningún correo). HubSpot
sólo recibe el envío + `ef_event_key`: sin objeto Marketing Events (token sin scopes, 403). **Decisión del operador:**
diseñar Marketing Events y un posible webinar en Teams antes del próximo release; no lanzar eventos reales hasta entonces.
El formulario de prueba sigue publicado para re-verificar y luego deprecarlo. Próximo paso: sesión nueva con RESEARCH-013.

## 2026-10-24 — Nosotros: fidelidad, rieles de Ohio, mapa y wordmark HubSpot (en vivo)

`/about-us-efeonce/` (249770, source-led desde el 2026-10-23) corregida en vivo: capa del host fiel al canvas, texto
despejado del switcher Dark/Light y «Follow Us» desde 1181 px (`--gh-rail`), mapa sin parallax (las etiquetas quedan
sobre sus ciudades), hero anclado al riel izquierdo en pantallas anchas y wordmark oficial de HubSpot en las cifras.
Commits `7b57a9589`, `1991fe21d`, `c90171c9e` + runtime `b5f7a25`, `4a2bfd2`, `f5d730e`; backups
`/tmp/eo-nosotros-widgets-before-*.tar` en Kinsta. **Pendiente por decisión del operador:** el mismo choque de rieles en
Partners entre 1181 y ~1320 px. **Sin push** (develop adelantado; varias sesiones). TASK-1322 cerrada como superada;
TASK-1369 recalibrada al remanente (JSON-LD `AboutPage`/`Organization`/`Person`, reslug `/nosotros`, GVC; fundación 2018).

## 2026-10-23 — EO Portfolio: programa creado y TASK-2046 Slice 1 (sólo lectura)

[PDR-028](docs/public-site/decisions/PDR-028-portafolio-de-proyectos-eo-portfolio.md), EPIC-056, ISSUE-183 y
TASK-2046…2049 creados (`658e828fe`). TASK-2046 en curso: inventario por WP-CLI de las 59 entradas `ohio_portfolio`
(15 reales, 44 demo), allowlist por ID y foto previa versionadas en `scripts/public-website/eo-portfolio/`; Yoast
Premium 27.7 acepta 410; Search Console por API: demos 0 clics. **Sin cambios en el sitio.** Pendiente antes del
Slice 2: revisar enlaces externos de las URLs demo en la interfaz de Search Console y el OK del operador al `dryRun`.
Hallazgos: 12 entradas reales con metadatos duplicados (afecta el Slice 3) y `cms.efeoncepro.com` indexado (ISSUE-183).

## 2026-10-23 — Partners en vivo y contrato de formularios diseñados (TASK-2044)

`/partnership/` (248003) reemplazada por 6 widgets compilados del canvas Partners v14 (snapshot
`_gh_partners_v2_before_20261023_220804`, preview 252038 privada, SEO/OG con adjunto 252045);
[referencia](.claude/skills/efeonce-public-site-wordpress/references/landings/partnership.md). «Quiero ser partner»
lleva a `/agenda/` hasta TASK-2045; el formulario HubSpot «Lead Gean - Partnership» ya no está en la página.
TASK-2044 code complete en local (`0864b7c04`…`36aa21309`): ancho por campo, consentimiento `compact` + `{privacyLink}`,
`successBehavior.icon` y `dismiss`, CTA `open_growth_form` en `dialog`. **Rollout pendiente:** diff del contrato
público en staging tras deploy. **No publicar `{privacyLink}`** antes del renderer de TASK-2045 (el actual lo muestra
literal). Arreglado de paso el typecheck de `scripts/public-website/landing-dock/cli.ts`. **Sin push ni release a main**
(instrucción del operador). TASK-2045 code complete (`ff9d693fc`…`5080b47d0`): renderers formularios `1.1.0` y CTA
`1.4.0` (diálogo `open_growth_form`, tokens/hooks, Turnstile junto al form); popup de Partners medido a 0–2 px del canvas
con renderers reales (`docs/ui/reviews/TASK-2045/`, piel en `partners-source/partner-dialog-skin.css`). **Pendiente:**
release a `main` de los renderers (no autorizado), Turnstile interactivo real en el diálogo, DLV/GA4 de
`activation_mode`. Hecho después (2026-10-23): formulario `efeonce-partner-application` publicado (v2, HubSpot directo
«Lead Gean - Partnership», smoke 200/200) y CTA `partners-become-partner` publicado (key en `.auth` 0600); contratos de
los 4 formularios vivos idénticos a producción y 0 px de diferencia con el renderer nuevo; axe limpio en 4 viewports.
**Push a `develop` no hecho:** son 174 commits locales de varias sesiones (decisión del operador). Activar el popup =
runbook en `references/landings/partnership.md`, después del release.

## 2026-10-23 — Mattis: propuesta Markdown y método conciliado

[Expediente GRD-1555](docs/commercial/tenders/mattis-branding-marketing-inmobiliario-1555/README.md): caso MD principal,
master de 23 bloques para Claude Design y anexos; copias en carpeta 14. Simulación COP 190.150.000 netos, no aprobada;
proyecto, elegibilidad, capacidad e impuestos pendientes. Sin envío ni nueva mutación CRM.
Tres subagentes conciliaron continuidad y skills; método/manuales/plantillas distinguen preparación MD, diseño y emisión,
y usan costo objetivo V3. [Auditoría y validación](docs/audits/commercial/2026-10-23-mattis-markdown-docs-skills.md).
Sin cambio runtime; commit local autorizado por Julio, sin push. Próximo paso: diseño con Claude Design y validación comercial antes de presentar.

## 2026-10-23 — Auditoría SEO del Blog SKY: informe listo, envío pendiente de Julio

Informe A4 de 23 páginas «Por qué cayó el tráfico y cómo recuperarlo» generado y revisado página por página
(`outputs/sky-blog-seo-audit-2026-10-23/informe/`; copia para adjuntar en OneDrive › Alineación › 1. Clientes
(Interno) › Sky - SEO-AEO › Auditoría SEO 2026-10). **Nada enviado a SKY:** los dos correos están en borrador en
[`caso-auditoria-2026-10/correos/`](docs/services/sky-blog-seo/caso-auditoria-2026-10/README.md) y salen por Outlook web
con firma gráfica y CCO HubSpot. Urgente para SKY: nueve artículos de Perú despublicados entre el 15 y el 23-10
(restaurables desde la papelera 30 días) y la propiedad GSC de `www.skyairline.com`, que vence entre nov-2026 y
ene-2027. El renderer ganó capacidades en `001683d83` (`pnpm report:compose`; regenerar con
`pnpm exec tsx scripts/seo/sky-blog-audit-report.ts`). El logo de SKY adjunto a la organización es generado por IA:
usar `ai-generations/2026-09-23_cmp003-sky-hangar/refs/sky-official.svg`. **Sin push.**

## 2026-10-23 — Medición del menú global y del dock de las landings (TASK-2042/2043)

GTM web `GTM-NGHPGRLZ` publicado en la versión 10: la 8 suma `gh_landing_dock_clicked`, la 9 los
`gh_site_nav_opened|line_viewed|clicked` y la 10 `target_label` y `target_url` en el clic del menú (hosts en runtime
`3801bc4` y `a27c37e`, desplegados). Scripts `scripts/gtm/build-landing-dock-events-workspace.ts` y
`build-site-nav-events-workspace.ts` (`--publish` versiona, publica y reescribe los snapshots). GA4 `486264460`: seis
dimensiones de evento (`target_type`, `target`, `target_label`, `target_url`, `panel`, `line`; 15/50). Servidor
`GTM-K2X4ZTTK` sin cambios. Ninguno es key event. Verificado en GA4 Tiempo real con una visita simulada que acepta
sólo analítica; trampas: el service worker (`context.on('request')`) y `HeadlessChrome` (lanzar con `--user-agent`).
**Sin push:** `a35bc5a9f`, `807180a8b`, `9c24746a5` y `dc18cf45d` en `develop`.
[LEARNINGS](docs/reference/measurement-gtm-ga4/LEARNINGS.md) ·
[TRACKING-PLAN](docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md#ctas).

## 2026-10-23 — Navegación global (EPIC-055): en producción en todo el sitio (TASK-2042)

Menú nuevo encendido en todo `efeoncepro.com` desde las 00:09 UTC por decisión del operador, sin piloto; `/blog/`
(#18456) conserva Ohio (lo lleva TASK-1802). Vuelta atrás: `set-site-nav-switch.php` con `{"mode":"off"}`. En el tema:
AXIS primitives 0.7.13 (runtime `aadfdc9`); documento del menú en la revisión 4; agendador nativo en vivo; Loop Marketing
→ Inbound (301). Edición: `pnpm public-website:site-nav` (las escrituras en producción piden el visto bueno del
operador). La sesión «Rediseño de Menú» sigue de contralora de fidelidad.

**Sin push:** los commits de Greenhouse `develop` y del runtime `main` de TASK-2041/2042 esperan la autorización del
operador. AXIS está publicado hasta v0.7.14.

**Pendiente:** Core Web Vitals contra la cabecera anterior (la medición GTM/GA4 quedó hecha: entrada de arriba), prueba de vuelta a `off` en producción y el admin de TASK-2041 (dirección B).

**Trampa al verificar en vivo:** con el panel del navegador oculto la página corre en segundo plano (sin
`requestAnimationFrame` ni eventos de scroll): el tono de la isla no se actualiza y el bloqueo de scroll del agendador
parece pegado. Verificar con un navegador en primer plano (Playwright headless sirve).
[TASK-2042](docs/tasks/in-progress/TASK-2042-site-nav-wordpress-rollout.md) ·
[manual](docs/manual-de-uso/public-site/operar-navegacion-global.md).

## 2026-10-23 — Dock de vidrio de las landings (TASK-2043, EPIC-055): en vivo en las siete

Primitive AXIS `efeonce.landing-dock` publicada (v0.7.12–v0.7.14: primitives 0.7.14, contracts 0.7.12, tokens 0.6.9,
registry 0.7.5) y plugin `eo-landing-dock` desplegado. Las siete landings (Inbound, HubSpot, Performance, Inicio, Redes
Sociales, SEO e Influencers) usan el dock en vivo, cada una con snapshot previo y aprobada en vivo por la sesión de
fidelidad «Rediseño de Menú». Vuelta atrás por landing: `pnpm public-website:landing-dock off <landing> --confirm`.
Decisiones del operador: presencia de hoy y un solo botón en teléfono para Influencers. Lecciones: la CI de AXIS
corre el carril de agentes para módulos nuevos; `release:packages` etiqueta el HEAD del checkout compartido (v0.7.13
quedó en un commit de otra sesión: nadie commitea en AXIS `main` mientras espera); la línea base en vivo debe incluir
el plugin. Follow-ups: retirar el código de los docks viejos (no antes del 2026-11-06) y puente de agendador
compartido; `gh_landing_dock_clicked` ya está en GTM y GA4. [Task](docs/tasks/complete/TASK-2043-landing-dock-glass-primitive.md) ·
[manual](docs/manual-de-uso/public-site/operar-dock-de-landings.md).

## 2026-10-22 — Fundación Luz: contacto y dos acercamientos verificados

Contact257217550764 / Company59806188192 / Primary y nota119334575454 leídos; dirección inferida admitida por
excepción expresa informada de Julio, sin etiquetarla verificada. InMail21:37Santiago (1crédito) y correo22:18:35
con firma gráfica/CCO/brochure original; Enviados y EMAIL119337620506SENT asociados verificados. Sin Apollo
ejecutado, Lead/Deal/secuencia ni membresías comprobadas. Esperar respuesta; entrega/lectura no acreditadas.
[Expediente y límites](docs/commercial/prospecting-agent/runs/2026-10-22-fundacion-luz-mariana.md). Docs/skills espejo
concilian la excepción vigente y separan atribución de enlaces por canal; no conceden nuevos permisos.

## 2026-10-22 — Cotizador local: perfiles y costos Réditos

Catálogo v13 / recursos v12 / créditos v1 activos en CLI; tres perfiles nuevos estimados y Awario público. [Costo y evidencia](docs/commercial/tenders/gana-loti-agencia-digital-2027-1552/research/COSTOS-RESTO-ALCANCE-CLI-2026-10-22.md). Propuesta detenida; sin importación DB, commit o push. Suite: 1.860 aprobadas, tres omitidas.
Decisión comercial posterior: rango COP 36–38M / USD 9.863,01–10.410,96 al mes; Deal66560488750 COP456M / USD124.931,51 (38M x12), leído de vuelta. [Base vigente](docs/commercial/tenders/gana-loti-agencia-digital-2027-1552/BRIEF-COMERCIAL-VIGENTE.md) gobierna futuros documentos. Precio final y propuesta detenidos; HOLD contractual conservado.
Análisis posterior con tres subagentes: [ruta y extras para elegir](docs/commercial/tenders/gana-loti-agencia-digital-2027-1552/research/ESTRATEGIA-DIFERENCIACION-2026-10-22.md); no ganador anterior confirmado. Extras no aprobados; sin nuevo CRM o propuesta.

Revisión completa posterior: [84 páginas y dirección reformulada](docs/commercial/tenders/gana-loti-agencia-digital-2027-1552/research/COMPARACION-PROPUESTA-ANTERIOR-Y-REFORMULACION-2026-10-22.md). La ruta anterior repetía integración, equipo y extras; elecciones creativas específicas por marca pendientes de materializar. Sin cambio de precio, CRM o propuesta.

Profundización: [GANA/LOTI y cuatro pares](docs/commercial/tenders/gana-loti-agencia-digital-2027-1552/research/INVESTIGACION-MARCAS-Y-DIRECCION-2026-10-22.md); cercanía/pedagogía ya existen. 97 consultas, fuentes y bloqueos registrados; LOTI sin UI/checkout verificados e informes recientes inaccesibles. Direcciones aún sin muestras creativas; sin cambios de costo/CRM/propuesta.

Mandato posterior: Julio autorizó preparar el MD. [Propuesta para Claude Design](docs/commercial/tenders/gana-loti-agencia-digital-2027-1552/PROPUESTA-GANA-LOTI-2027-PARA-CLAUDE-DESIGN.md) redactada: 28 bloques y anexos; técnica/económica separadas. Pausa de redacción superada, emisión/presentación aún pendientes. Sin deck/PDF/CRM/envíos.

## 2026-10-22 — Redes Efeonce: love brand y canales v2

Estrategia social y editorial registrada: [PDR-020 rev. 2.0](docs/public-site/decisions/PDR-020-canales-propios-sistema-editorial.md)
y [love brand y comunidad](docs/strategy/EFEONCE_LOVE_BRAND_AND_COMMUNITY_STRATEGY_V1.md). Plan nov 2026–Q1 2027 y piezas
en el lienzo privado `claude.ai/artifact/MWoecLSspdKw8ZRXKzPBBd`; nada programado en Metricool. Pendientes: medición
del puente («¿cómo nos conociste?» + fuente de primer contacto, requiere task), baseline nov–dic, piezas de Instagram,
Año Nuevo (MET-2338 archivada) y Navidad rehecha desde cero. fal sin saldo (A −0,29 / B −0,35 USD al 22-oct).
Barrido por subagentes aplicado a context, public-site (PDR-003/004/005/018/019), operations, documentación funcional
(nuevo `docs/documentation/social/sistema-de-canales-y-love-brand.md`), manuales y 34 archivos de skills con espejo
`.codex` (salvo `commercial-expert`, cuya copia Codex es otra versión). Contradicciones para decidir el operador:
jerarquía Glitch↔Manzanitas en PDR-003/018, naming Think/Manzanitas, redirección `/servicios/hubspot/` vs PDR-013,
reutilizar imágenes del carrusel en LinkedIn (manual de seasonalities vs PDR-020 §4.4), canal del reel/vlog de Glitch,
story de Manzanitas y pódcast, presentador de los tutoriales de YouTube. **Resueltas el mismo día** (PDR-020, delta punto
12) y aplicadas a docs, skills y Notion (`Twitter 🐦` retirado del Calendario). La 302 de `/servicios/hubspot/` →
`/servicios-contratar-hubspot/` quedó **aplicada y verificada en vivo** (Yoast, respaldo `_gh_hubspot_302_before_20261022`).
Con caché la redirección no conserva UTM: los posts enlazan directo a la landing.

## 2026-10-22 — Kibernum: Growth Colombia, contacto y dos canales

Contact `256968083769` / Company `53955357196` / Primary verificados; seis segmentos del contacto
(180/181/182/183/151/156) y Company 187 comprobados. Apollo: 1 crédito.
Correo 22/10 00:56 Santiago con firma gráfica/CCO y brochure 360° completo; Outlook y EMAIL `119266980893`
SENT verificados. InMail distinto enviado (1 crédito); nota `119264638728` releída. Esperar respuesta, sin Lead,
Deal ni secuencia nuevos. [Evidencia y continuidad](docs/commercial/prospecting-agent/runs/2026-10-22-0056-kibernum-growth-colombia.md).

# changelog.md

[Historial interno](docs/changelog/internal/README.md).

## 2026-10-25 — Rooms: base durable, experiencia por rol y motion (TASK-2058/2059/2060)

- Nuevo runtime `efeonce-rooms`: contratos y permisos `can` por organización/sala/edición; jerarquías cliente, operador y administrador con grants, vigencia y denegación por defecto.
- Primera sala creativa y SEO/AEO con La órbita/AXIS, visor de piezas, lectura/radiografía y workspace interno; refinada con Product Design. [Superficie implementada](docs/documentation/rooms/primera-experiencia-local.md) y [manual local](docs/manual-de-uso/rooms/operar-primera-experiencia-local.md).
- PostgreSQL local independiente: crear, editar, publicar, reabrir, archivar y grants; revisiones/idempotencia, auditoría/outbox y recuperación con restore verificados (TASK-2060).
- View Transitions nativas progresivas, botones/badges AXIS y logo con ratio intrínseco. Muestra sintética; Efeonce ID (TASK-1834), DB cloud y aceptación visual humana pendientes. TASK-2061 publica [la demo](https://efeonce-rooms.vercel.app/demo) con repo privado GitHub vinculado y smoke externo. [QA inicial](docs/audits/rooms/2026-10-25-first-local-delivery.md).

## 2026-10-25 — Criterio reutilizable para nuevas conversaciones comerciales

- Prospección, Commercial y Copywriting incorporan historia por iniciativa, evidencia, pregunta útil y
  revisión de respuesta; [método y estados](docs/commercial/analyses/2026-10-prospeccion/IMPLEMENTACION-Y-PAUTA.md).
  [Aplicación nativa verificada](docs/commercial/analyses/2026-10-prospeccion/APLICACION-HUBSPOT-2026-10-25.md): guía9.705, nueve correos/nueve plantillas ajustados, cinco pausas; cola13→8 el29Oct. QA de borrador nuevo pendiente; sin envío inmediato ni pauta.

## 2026-10-25 — Ficha de autor, byline y schema de autor del blog (TASK-2057)

- El single del blog tiene byline «Por {autor}» enlazado al archivo y, al cierre, una ficha de autor de La órbita
  (retrato con la pieza `portrait`, cargo, bio corta, temas, CTA al archivo y redes con isotipos oficiales) que
  reemplaza la caja de Ohio con redes del demo. Un solo lector, `EO_Author_Profile` (efeonce-editorial-blocks 0.5.4),
  para la ficha, el byline, el schema y la cabecera de `/author/`; `worksFor` del Person apunta a `#organization`.
  Bio corta editable en el perfil de WordPress («Ficha de autor del blog»).

## 2026-10-24 — «Explora por tema» v2 en la portada del blog (TASK-2051, desvío 15)

- La órbita de `/blog/` enlaza las categorías del blog: seis temas con contenido, cada uno con su promesa, y un centro
  que guía la lectura (descripción, tres lecturas, «Ver todo»); en móvil, una lista por lecturas. Growth e IA salen;
  Inbound y Marketing digital entran. `lib/topics-v2.cjs`, `EO_Home_Readers::ORBIT`, `EO_Home_Adapter::ORBIT_TOPICS`,
  `EOBH_View::topics()`; efeonce-editorial-blocks 0.4.8.

## 2026-10-24 — Imagen y punto focal propios de la tarjeta de foto del riel (TASK-2051)

- La tarjeta de foto de «Para leer con calma» (vertical) recortaba al centro la destacada horizontal y cortaba el
  encabezado incrustado de las portadas de Manzanitas. En vivo desde hoy (`efeonce-editorial-blocks` 0.4.5,
  `EO_CM_VERSION` 0.2.2, runtime 6578773): metas `_eo_card_image` y `_eo_card_focus` («Imagen de la tarjeta del riel»
  y «Punto focal de la tarjeta» en el panel) → `img`/`pos` del adaptador; la destacada sigue siendo la OG. Comando
  `card` (Greenhouse e60f5045c) y `preview/serve.cjs --rail`. `verify --browser` en vivo: 0 px en 8 anchos; ninguna
  entrada las usa todavía. [Manual CLI §2c](docs/manual-de-uso/public-site/operar-portada-blog-por-cli.md).

## 2026-10-24 — Tarjetas v2 de «Para leer con calma» en producción (TASK-2051, desvío 14)

- El riel de `/blog/` usa las tarjetas aprobadas en el canvas (versión 93) desde las 21:12 UTC: una sola plantilla
  (`lib/rail-v2.cjs`) para foto a sangre, cliente (ANAM), pregunta, entrada de webinar con «Faltan N días», onda de
  podcast y tipográfica; una insignia como máximo y sólo con dato real (En vivo, Nuevo, Actualizado, Gratis; cupos y
  lecturas esperan su lector por el filtro `eo_home_rail_signals`).
- Modelo de contenido (`efeonce-editorial-blocks` 0.4.4, `EO_CM_VERSION` 0.2.1): formato Podcast, metas
  `_eo_reviewed_at` («Última revisión») y `_eo_client` («Cliente del caso») con panel y comandos `client`/`reviewed`;
  `dc-runtime.js` ya no borra el hover al repintar. Gates en vivo: desborde 0 px de 320 a 1920, un H1, axe 0.
  [Runtime](docs/architecture/public-site/BLOG_HOME_RUNTIME_V1.md) · [PDR-029](docs/public-site/decisions/PDR-029-modelo-de-contenido-portada-blog.md).

## 2026-10-24 — Módulo de eventos: webinar de Teams, diseño y backlog

- Decidido: la sesión es un webinar de Teams y Greenhouse es dueño de la reserva, el cupo y la lista de espera. El
  conector nativo Teams↔HubSpot no sincroniza (ticket de soporte #50018204746). Diseño con inscripción por Graph,
  `joinWebUrl` personal, ledger de transiciones y Eventos de marketing con una sola fuente por evento: diseño, no
  implementado. Correcciones de correos (`2a971d768`) y píldora (`a5b028461`) solo en local, sin release.
  [Backlog canónico](docs/research/RESEARCH-013-events-webinars-hubspot-teams.md#backlog-canónico-para-cerrar-el-módulo-de-eventos).

## 2026-10-24 — Archivo de Glitch con su propia piel (TASK-2056)
  `/category/glitch/` y `/glitch/`: wordmark, última edición y último Flash, muletilla «sin anestesia.», falla en bytes,
  placas #N/FLASH por fila, filtro Ediciones/Flash/Notas y suscripción con la píldora de la portada (blanca). Renderer
  de Growth Forms 1.3.0: logo opcional en el rótulo de la píldora (pendiente de release).
  [Runtime](docs/architecture/public-site/BLOG_ARCHIVE_RUNTIME_V1.md#21-variante-glitch-del-tema-task-2056-en-vivo-desde-el-2026-10-24-1950-utc).

## 2026-10-24 — Archivo del blog v3 en producción (TASK-2055)

- La búsqueda, los temas, las etiquetas y los autores de efeoncepro.com dejan la plantilla de demo de Ohio y usan el
  «Archivo del blog» aprobado en el canvas de la portada (dirección D): cabecera de sección con la destacada montada,
  filtro por formato, filas por año, paginación, otros temas y estados vacíos propios. Sin el recuadro «Hire us!», en
  español, sin desborde de 320 a 1920.
- Búsqueda sólo de publicaciones; búsqueda vacía sin inventario; Greenhouse y autores sin publicaciones dan 404; temas
  indexables sólo con descripción y ≥ 4 publicaciones (seis descripciones aprobadas y cargadas); títulos «X - Blog de Efeonce».
- Runtime: `eo-blog-home` (`EOBH_Archive`, flag `eo_blog_archive_enabled = 1`) + `EO_Archive_Adapter`; CLI `archive` y
  `topic-descriptions`. Gates: equivalencia 6/6, paridad PHP 36/36, píxeles 44/44 ≤ 1 %, axe 0.
  [Runtime](docs/architecture/public-site/BLOG_ARCHIVE_RUNTIME_V1.md) · [manual](docs/manual-de-uso/public-site/operar-archivo-del-blog.md).

## 2026-10-24 — Prospección: cierre multicanal y skills conciliadas

- Cinco casos del chat documentados con estados por persona/canal; cinco EMAIL `SENT` corroborados y secuencia sólo
  NIASA. Se conserva LinkedIn de Arcor pendiente y la incertidumbre de correos inferidos/catch-all.
- Método/manuales y cuatro skills espejo precisan identidad, permisos de enriquecimiento, originales de brochure,
  persistencia HTML, efectos de Documents y readbacks separados. Collateral creativo aplica la aprobación íntegra
  del 17/10. Cinco escenarios sintéticos añadidos; sin nuevas comunicaciones ni cambios runtime.
  [Auditoría y límites](docs/audits/commercial/2026-10-24-chat-prospeccion-docs-skills.md).
- [Lucía y Yvette](docs/commercial/prospecting-agent/runs/2026-10-24-lucia-yvette-prospeccion.md): expedientes,
  manuales y dos skills espejo distinguen patrón, validación técnica y atribución inferida con excepción
  individual. Resultado inválido descartado, costos/permisos separados y persistencia del correo comprobada;
  tres escenarios sintéticos adicionales. [Controles](docs/audits/commercial/2026-10-24-lucia-yvette-docs-skills.md).
- [Secuencias de Lucía y Yvette](docs/commercial/follow-up-agent/runs/2026-10-24-lucia-yvette-secuencias.md):
  dos pasos por persona programados para 29/10 10:00 y 05/11 10:05 Perú, firma gráfica y registro nativo con
  excepción expresa al CCO. Skills espejo documentan ese alcance, calendario persistido y lector CLI fallido
  sin repetir la inscripción; fixtures v14 con 70 casos. Programado no acredita envío o entrega.

## 2026-10-24 — Portada del blog v3: revisión en vivo y piezas listas

- Portada nueva publicada para revisión en `efeoncepro.com/blog-v3-revision/` (noindex): plugin `eo-blog-home` con los
  tableros de escritorio, tablet (nuevo) y móvil del canvas aprobado; 25/25 secciones ≤ 1 % en vivo. `/blog/` sin
  cambiar hasta aprobación. [TASK-2051](docs/tasks/in-progress/TASK-2051-blog-portada-v3-high-fidelity.md).
- Code complete en local, sin publicar: modelo de contenido (TASK-2050, PDR-029 Proposed), formulario en línea con
  reservas por evento y conteo (TASK-2053/2054; llega con el próximo release a main) y primitives AXIS de botón,
  segmentado y buscador con haz (TASK-2052, v0.7.15 preparada).
- Eventos del blog: correos de reserva desplegados (release `e593e3993bc3`), pero la prueba de punta a punta mostró que
  no salen (filtro `accepted` contra envíos `delivered`); corrección local, pendiente de release. Integración con
  HubSpot Eventos de marketing en diseño (RESEARCH-013); sin eventos reales hasta entonces.

## 2026-10-24 — Sitio público: Nosotros y Partners rediseñados (source-led)

- `/about-us-efeonce/` y `/partnership/` publicadas como widgets Elementor compilados desde los canvas aprobados de «La
  órbita» (11 y 6 módulos). Nosotros: fidelidad al canvas, rieles fijos de Ohio despejados, mapa sin parallax, hero
  anclado a la izquierda y wordmark de HubSpot. Partners: desde el release del 2026-10-24, «Quiero ser partner» abre el
  formulario de alianzas en un diálogo gobernado (Growth CTA + Growth Forms, TASK-2044/2045). [Layout](docs/documentation/public-site/wordpress-ohio-elementor-layout.md#landing-nosotros-source-led-page_id-249770-desde-2026-10-23).

## 2026-10-23 — Mattis: preparación Markdown y continuidad comercial

- Caso MD principal y propuesta de 23 bloques para Claude Design con anexos y simulación V3, sin aprobación ni envío.
- Skills espejo de licitaciones, deck, informe y pricing; manuales, invariantes y plantillas concilian fuente editorial,
  formato de presentación y costo objetivo vigente. [Auditoría](docs/audits/commercial/2026-10-23-mattis-markdown-docs-skills.md).

## 2026-10-23 — Auditoría SEO del Blog SKY e informe A4 premium para auditorías

- Auditoría consolidada del Blog SKY (GSC/GA4 al 21-10, Semrush CL/PE, SERP en vivo, 1.700 publicaciones): sin
  penalización, caída en tres etapas, plugin SEO perdido en la migración, copia indexable en Azure y 9 artículos de
  Perú despublicados después del 15-10. Informe de 23 páginas generado (no enviado) y correos en borrador.
  [Caso](docs/services/sky-blog-seo/caso-auditoria-2026-10/README.md).
- Catálogo `insights-report`: plantillas `report-findings` y `report-scenarios`, `productLabel`, etapas/hitos/rótulos
  en la tendencia, guarda del pie en todas las páginas en papel y `pnpm report:compose`. Gate visual Insights a 0 px
  con los dos frames nuevos declarados (BASELINE_DELTAS ab); páginas aprobadas dentro del 1 %.

## 2026-10-23 — Medición del menú global y del dock de las landings (TASK-2042/2043)

- GTM web publicado en la versión 10: `gh_landing_dock_clicked` (v8), `gh_site_nav_opened`, `gh_site_nav_line_viewed`
  y `gh_site_nav_clicked` (v9) y el texto y destino del clic del menú (v10). GA4 suma seis dimensiones de evento
  (`target_type`, `target`, `target_label`, `target_url`, `panel`, `line`). Ninguno es key event; el servidor no cambia.
- Verificado en GA4 Tiempo real con una visita simulada que acepta sólo analítica. Scripts
  `scripts/gtm/build-landing-dock-events-workspace.ts` y `scripts/gtm/build-site-nav-events-workspace.ts`.
  [Registro](docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md#ctas).

## 2026-10-23 — Seasonalities por fit de canal (PDR-020 revisión 2.1)

- Decisión del operador: las seasonalities dejan de tener Instagram como canal-hogar fijo; cada temporada va sólo al
  canal donde tiene fit (Instagram si es emocional o cultural, LinkedIn de Efeonce si tiene consecuencia de negocio para
  el comprador, LinkedIn de Julio si hay una opinión propia, ninguno si no conecta con un oficio). Delta en PDR-020;
  alineados la estrategia de love brand, el protocolo social, la documentación, el manual y la skill de social (con su
  espejo en `.codex`).

## 2026-10-23 — Navegación global en producción en todo efeoncepro.com (TASK-2042)

- El menú nuevo (AXIS `efeonce.site-nav`) reemplaza la cabecera de Ohio en todo el sitio desde las 00:09 UTC, salvo
  `/blog/`; vuelta atrás con el interruptor `eo_site_nav_enabled=off`. AXIS primitives 0.7.13 en el tema: aislamiento
  del anfitrión, «Estás aquí» desde el enlace del servicio, círculo del onepage a la medida de la ventana y tono de la
  isla bajo degradados, velos, chrome fijo y con el agendador abierto.
- Agendador nativo en la cabecera, el mega y el onepage (`cta_location: site_nav`); Loop Marketing abre Inbound (301).
- Edición gobernada del menú vivo con `pnpm public-website:site-nav` (foto, ítem, ícono, textos, revisiones, restaurar).
  [Manual](docs/manual-de-uso/public-site/operar-navegacion-global.md).

## 2026-10-23 — Dock inferior de vidrio en las siete landings (TASK-2043)

- AXIS `efeonce.landing-dock` (primitives 0.7.14): vidrio de la isla del menú, presencia por dock y por botón, parada,
  tono por gradientes y con diálogo modal; plugin `eo-landing-dock` y `pnpm public-website:landing-dock`.
- En vivo en Inbound, HubSpot, Performance, Inicio, Redes Sociales, SEO e Influencers; docks viejos fuera del HTML; el
  agendador del dock mide `cta-location="landing_dock"`. [Manual](docs/manual-de-uso/public-site/operar-dock-de-landings.md).

## 2026-10-22 — Fundación Luz: excepción individual y outreach documentados

- [Expediente de Mariana](docs/commercial/prospecting-agent/runs/2026-10-22-fundacion-luz-mariana.md): alta/Primary/nota y envío Outlook con firma gráfica/CCO, EMAIL SENT e InMail verificados; dirección inferida por excepción expresa, sin entrega confirmada ni secuencia.
- Arquitectura, documentación funcional, manual y referencias espejo concilian la excepción ya vigente; calidad de casilla, permisos por acción y atribución de enlaces separados. Sin schema, filtros, automatizaciones o nuevas comunicaciones por este cierre.

## 2026-10-22 — Cotizador CLI: perfiles y recursos de referencia

- Réditos: [propuesta Markdown para Claude Design](docs/commercial/tenders/gana-loti-agencia-digital-2027-1552/PROPUESTA-GANA-LOTI-2027-PARA-CLAUDE-DESIGN.md) preparada por autorización posterior; narrativa, conceptos, alcances e inversión de borrador, con control interno separado. Sin emisión/envío.

- Réditos: [investigación de marcas y pares](docs/commercial/tenders/gana-loti-agencia-digital-2027-1552/research/INVESTIGACION-MARCAS-Y-DIRECCION-2026-10-22.md) afina la dirección comercial; fuentes, fechas y límites de acceso conservados. Sin oferta o cambio de precio.

- Réditos: comparación completa de la propuesta anterior (84 páginas) corrige la diferenciación recomendada; integración y extra mile ya estaban ofrecidos. [Hallazgos y reformulación](docs/commercial/tenders/gana-loti-agencia-digital-2027-1552/research/COMPARACION-PROPUESTA-ANTERIOR-Y-REFORMULACION-2026-10-22.md).

- Réditos: investigación de competencia y estrategia con tres subagentes; hipótesis de extras costeada por CLI, sin nuevo precio o compromiso. [Análisis para elegir dirección](docs/commercial/tenders/gana-loti-agencia-digital-2027-1552/research/ESTRATEGIA-DIFERENCIACION-2026-10-22.md).

- Réditos GRD-1552: rango interno COP36–38M / USD9.863,01–10.410,96 mensuales documentado y Deal valorado en COP456M / USD124.931,51 por 12 meses al escenario principal; sin propuesta ni cambio de etapa. [Base y evidencia](docs/commercial/tenders/gana-loti-agencia-digital-2027-1552/BRIEF-COMERCIAL-VIGENTE.md).

- Mantenimiento versionado: tres perfiles faltantes, costos CO estimados y referencia Awario, conservando políticas y controles. [Evidencia](docs/commercial/tenders/gana-loti-agencia-digital-2027-1552/research/COSTOS-RESTO-ALCANCE-CLI-2026-10-22.md). Sin cambios de motor ni publicación a plataforma.

## 2026-10-22 — Navegación global del sitio: mecanismo en AXIS (TASK-2040)

- AXIS ya tiene `efeonce.site-nav`: esquema `site-nav.v1` (JSON Schema para el plugin), tokens `axisSiteNav`, render
  de servidor, `site-nav.css` y `site-nav.js` sin dependencias, demo y página del Lab y suite de navegador en el CI.
  Publicado en AXIS v0.7.7 (contracts 0.7.7, primitives 0.7.0), igualado al canvas en textos y medidas.
- WordPress: plugin `eo-site-nav` (TASK-2041) activo, con el documento del menú aplicado (revisión 1) y su copia
  pública en `/wp-json/eo/v1/site-nav`. El sitio conserva la cabecera de Ohio hasta TASK-2042. Las fotos del menú ya
  están en `storage.googleapis.com/efeonce-group-axis-public-media/site-nav/v1/`.
- Decidido en el Lab: cabecera 300/400 ms, el mega se cierra con más de 48 px de scroll, tono de la isla por
  `data-site-nav-tone` con luminancia de respaldo; destinos `/servicios/`, `/blog/` y `/agenda/`.
  [Arquitectura](docs/architecture/public-site/PUBLIC_SITE_GLOBAL_NAVIGATION_V1.md).

## 2026-10-22 — Love brand de Efeonce y sistema de canales v2

- [PDR-020 revisión 2.0](docs/public-site/decisions/PDR-020-canales-propios-sistema-editorial.md): tres familias (marca
  agencia · conexión B2B · Marketing con Manzanitas), Threads con el gancho de Glitch, X sólo escucha, YouTube piloto,
  newsletter en el LinkedIn de Julio e «IA con contexto»; cierra las decisiones 1, 4 y 5.
- Nueva [estrategia de love brand y comunidad](docs/strategy/EFEONCE_LOVE_BRAND_AND_COMMUNITY_STRATEGY_V1.md): fans
  dentro de las empresas, pilares anclados al Why, escalera del fan, mecánicas y medición del puente a negocio.
  Contexto `09`/`10`/índice y skills de marca, social y contenido conectados (espejos sincronizados).

## 2026-10-22 — Canales Efeonce: seis decisiones del operador

- [PDR-020, delta punto 12](docs/public-site/decisions/PDR-020-canales-propios-sistema-editorial.md): Glitch y
  Marketing con Manzanitas son marcas hermanas; el público ve Manzanitas y Think queda interno (cierra la decisión 6 y
  el naming de TASK-1802); 302 temporal pendiente para `/servicios/hubspot/`; seasonalities comparten visual clave,
  nunca carrusel; story de Manzanitas en stories de Instagram; reel y vlog de Glitch en pausa; pódcast sin canal;
  tutoriales de YouTube con Julio. PDR-003, PDR-018, estrategia, normas, manuales y skills alineados.
- Calendario de Notion: se retiró la opción `Twitter 🐦` de `Plataforma` (ninguna fila vigente la usaba).
- Sitio público (producción): `/servicios/hubspot/` pasa de un 301 adivinado por WordPress (a un post de 2024) a una
  **302 temporal** de Yoast hacia `/servicios-contratar-hubspot/`; respaldo `_gh_hubspot_302_before_20261022`, purga de
  caché y verificación en vivo de las variantes con y sin barra y con UTM. Rollback en la referencia de la landing.

## 2026-10-22 — Kibernum: outreach y segmentación comprobados

- Contact/Company/Primary y seis membresías activas del contacto verificados; correo con firma gráfica/CCO y brochure 360° completo, EMAIL SENT e InMail publicados. Referencias espejo incorporan el caso; sin nueva automatización ni permisos. [Registro y límites](docs/commercial/prospecting-agent/runs/2026-10-22-0056-kibernum-growth-colombia.md).

## 2026-10-21 — `pnpm ai:listen`: QA de piezas de video y audio

- Control estándar sin Gemini (`--measure-only`): mapa de eventos y grilla de cues medidos con ffmpeg en menos de 1 s;
  código 2 si una cue falla. Gemini 3.8 queda como segunda opinión con `--verify`, que confirma o refuta cada
  afirmación medible (pieza AWS: un «congelado» de severidad alta quedó refutado).
- v2: `--fps` hasta 24, `--clip`, rúbricas versionadas, modo agéntico (`v1beta1` vía el cliente canónico) y GCS.
  `@google/genai` 2.30 con Nexa verificado en vivo. [Manual](docs/manual-de-uso/ai-tooling/escuchar-y-mirar-media-con-gemini.md).

## 2026-10-21 — Firma gráfica obligatoria en todos los correos de Julio

- Sustituida la alternativa textual por firma gráfica siempre, incluidos seguimientos manuales, programados y secuencias; transporte sin HTML deja el envío pendiente. [Decisión y procedimiento](docs/operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md). Routers y skills actualizados, sin envíos ni cambios de configuración.

[Historial interno](docs/changelog/internal/README.md).

## 2026-10-21 — Prospección creativa y secuencias izipay

- Documentados InMail de Ana Paula, email/CRM de Odoo y cuatro contactos/correos de izipay; tres secuencias programadas, Laura sin inscripción por rebote.
- Skills espejo: excepción individual de correo inferido, NDR frente a Apollo, clonación independiente, persistencia y readback.
- Capacidad de producción/fabricación local corregida por Julio; sin inferir propiedad ni nuevos permisos. [Registro y límites](docs/commercial/follow-up-agent/runs/2026-10-21-agencia-creativa-izipay.md).

## 2026-10-20 — Blog etapa 1: consultas y composición preparadas

- Candidato local en develop: seis artículos y tres Glitch sin duplicados, temas dinámicos, objetivos con destinos,
  recursos verificados y suscripción aprobada. Opción 2 elegida: portada navy y hero editorial. QA 1440/1024/390/320; no publicación. [Paquete](scripts/public-website/blog-phase1/README.md).
- Revisión de seis anotaciones: navegación y temas más claros, portada real de guía/AEO y suscripción Glitch con mayor jerarquía. Contrato Forms intacto;27 checks. Todo local en develop, sin publicación.
- Segunda ronda: cuatro imágenes editoriales propias para temas, retirada atribución redundante y formulario integrado en Glitch sin tarjeta clara. Roles oscuros y validación contrastados; mismas integraciones, sólo develop local.

[Historial interno](docs/changelog/internal/README.md).

## 2026-10-20 — Blog: preview Growth Forms en develop

- Diseño compacto desktop/móvil preparado; publicación detenida por el operador. HubSpot y GTM Web7 aplicados previamente; Forms review, CF7 live, sin merge/release a main ni envío real. [Estado](docs/audits/public-site/2026-10-20-blog-growth-form-preparation.md).

## 2026-10-20 — Partnerships y expedientes de distribuidores

- Conciliados Adobe/Nexsys, Google/Ingram y Microsoft/AWS/LOL con identidad, evidencia y pendientes separados.
- Nexsys: formulario corregido y once respaldos enviados; readback Outlook/adjuntos y HubSpot SENT confirmado.
- [Manual](docs/manual-de-uso/comercial/operar-partnerships-y-distribuidores.md), política Outlook y cuatro skills en Codex/Claude incorporan revisión integral, separación de notas internas, autoridad de firma y control de adjuntos.
- [Directorio](docs/operations/EFEONCE_PARTNER_CONTACT_DIRECTORY_V1.md): 27 personas, 8 buzones, fuentes y rebotes; cuatro skills Codex/Claude enlazadas. Microsoft verificado y Geraldine informada. Sin nuevos envíos al consolidar contactos.

## 2026-10-19 — Customer Agent Voice: caso ANAM y guía operativa

- Documentada la activación de Emma en el 600, llamada real y correo enviado con firma gráfica/CCO.
- Manual y skills espejo separan número/canal/deployment/IVR, horario humano, créditos de voz y resolución de texto.
- Transferencia humana y buzón pendientes de prueba; sin nuevo cambio de portal ni reactivación Kortex.
- [Evidencia](docs/audits/ANAM_CUSTOMER_AGENT_VOICE_SETUP_2026-10-19.md) · [procedimiento](docs/manual-de-uso/hubspot/configurar-customer-agent-llamadas.md).

## 2026-10-18 — Indecaucho: outreach gráfico y seguimiento nativo

- Katia/Company/Primary/segmento180 y primer correo Outlook con firma/CCO/EMAIL SENT verificados.
- Un seguimiento HubSpot programado22Oct09:30Quito, salida por respuesta/reunión; deck360 original íntegro.
- Skills espejo incorporan recuperación de publicaciones, calidad Apollo y readback de firma/envío/calendario.
- [Evidencia y límites](docs/commercial/follow-up-agent/runs/2026-10-18-indecaucho-katia-hubspot.md); sin push ni nuevos permisos.

## 2026-10-18 — Contexto comercial en la fachada Grader

[Historial interno](docs/changelog/internal/README.md).

- Fachada Grader reutiliza preparación/persistencia/recibo Forms y contexto visitante; CORS gobernado y respuestas privadas.
- PR257 promueve todo develop81f6ba525 a main2559e9242, árboles idénticos y Vercel4He READY.
- Grader y clasificación administrativa con auditoría transaccional servidos; canarios y smoke productivo PASS sin leads ficticios.
- Orquestador39190761785 SUCCESS, manifest released; CI/Deep/smoke PASS, health200 y watchdog6/6 drift0.
- Sin nuevas migraciones, publicación GTM ni replay; cierre documental propio en develop.
- Conciliación19/10: transporte Grader/clasificación auditada, Ads/agendas, índices y skills espejo actualizados; TASK-2034 permanece parcial por evidencia comercial real pendiente.
- Discovery LinkedIn19/10: Insight Tag web, CAPI, consentimiento, dedupe y HubSpot documentados con fuentes oficiales; arquitectura Proposed y skills actualizadas, sin conexión, instalación o eventos. [Preparación](docs/manual-de-uso/growth/preparar-medicion-linkedin.md).
- Origen/canales19/10: separación conceptual aceptada, discovery readonly293 Deals y schema/backfill propuestos; legacy preservado, consumidores incompletos, cero writes. [ADR y límites](docs/architecture/EFEONCE_COMMERCIAL_ACQUISITION_TAXONOMY_DECISION_V1.md).
- UI de adquisición19/10: estilos/colores del editor verificados, límite de API/CLI y QA visual separados del schema en docs/skills; nueva presentación propuesta, sin aplicar. [Manual](docs/manual-de-uso/hubspot/normalizar-origen-canales-adquisicion.md#presentación-humana-estilos-colores-y-alcance-de-la-api).
- [Release](docs/audits/releases/2026-10-18-grader-commercial-measurement-production-release.md); checkout principal develop, WIP ajeno preservado. [Validación y límites](docs/audits/growth/2026-10-18-grader-measurement-release.md).

## 2026-10-18 — Políticas Ads comerciales publicadas y clasificación Web corregida

[Historial interno](docs/changelog/internal/README.md).

- 13 Forms comerciales+Discovery verificados por API;12 altas adicionales, Grader comercial incluido y Contacto general fueraAds.
- Lead Gen Web quote_request con identidad/versión intactas; writer/CLI canónicos y nueva API interna implementada localmente, sin deploy.
- 53 pruebas, ESLint y TypeScript PASS. Configuración no prueba recepción/atribución; sin conversiones ficticias ni replay.
- [Publicación y límites](docs/audits/growth/2026-10-18-commercial-forms-policy-publication.md); WIP ajeno preservado.

## 2026-10-18 — Documentación y skills de medición conciliadas

[Historial interno](docs/changelog/internal/README.md).

- Arquitectura/ADRs, runtime/tracking y manuales reflejan Web6/Server10, EC ON, OAuth Efeonce/CLI de gestión y tracing HubSpot/Meta; evidencias comerciales pendientes.
- Cuatro pares Codex/Claude sincronizados; distingue fuentes Performance/Discovery de tipos de campaña y configuración de recepción/atribución.
- [Cobertura sólo comercial](docs/audits/growth/2026-10-18-commercial-forms-measurement-coverage.md):12 propuestas DRY_RUN sin aplicar; Lead Gen Web pendiente de clasificación y revisión de intención en Grader/Contacto. Sin mutaciones runtime.

## 2026-10-18 — Ads activado y trazabilidad preparada para ocurrencias reales

[Historial interno](docs/changelog/internal/README.md).

- Ads686: EC ON, GTMWeb6/Server10 y políticas Performance/Discovery rev2 publicados; bridge compatible en WordPress/Think.
- Tracing HubSpot y captura Meta configurados; flag true y companion ER5 del mainEC READY. Health200, watchdog6/6 y canarios PASS.
- Snapshots GTM sin drift y plan offline actualizado. Primera ocurrencia/recibo/atribución pendientes; cero negocio ficticio o replay.
- [Auditoría, evidencia y rollback](docs/audits/growth/2026-10-18-google-ads-activation.md). Cambios ajenos preservados.

## 2026-10-18 — Release completo de develop y cierre de recibos

[Historial interno](docs/changelog/internal/README.md).

- PR #256 incorpora los 1.583 archivos del candidato develop a main `ec317c928`, sin exclusiones.
- Orquestador `39159325900` SUCCESS; manifest released, salud HTTP 200 y watchdog ok 6/6, sin drift ni datos faltantes.
- Migraciones aditivas de recibos HubSpot/Meta verificadas; código Forms/Meetings desplegado y canarios PASS. Ads sigue OFF y GTM sin publicar.
- [Evidencia y rollback](docs/audits/releases/2026-10-18-full-develop-production-release.md); WIP ajeno preservado y cierre documentado sólo sobre los cambios propios.

## 2026-10-18 — Negocios compartidos HubSpot

- Julio ordenó verificar adjudicación, contrato y fechas antes de recomendar/invertir/crear Deal. Gate guardado en el prompt real del radar y skills/playbooks, con readback y horario/permisos preservados. [Evidencia](docs/commercial/prospecting-agent/runs/2026-10-18-1128-control-adjudicacion-automatizacion.md).

- Flujo observado y preferencia de Julio **liderazgo Partner** documentados en [manual](docs/manual-de-uso/hubspot/convertir-negocio-compartido.md) y skill de Solutions Partner. Esenttia convertido y leído; cierre local31/12/2026, discrepancia tarjeta30/12 registrada. Sin nuevas altas o envíos separados.

> Ventana reciente de cambios internos reales. El historial completo y verificable se consulta en
> [docs/changelog/internal/README.md](docs/changelog/internal/README.md). No cargar snapshots completos al
> inicio ni usar una entrada histórica como contrato vigente sin contrastarla.
>
> Techo operativo: 60 entradas, 2.000 líneas y ~60.000 tokens. Rotación:
> `pnpm docs:context-rotate --apply`.

## 2026-10-18 — Footer público: selector compatible con monitores legacy

- `widget_block[34]` reemplaza únicamente el `querySelector(...:has(...))` del bootstrap por marcador simple +
  `closest('#colophon')`; CSS, composición, copy, enlaces, formulario y assets permanecen idénticos.
- Publicado en WordPress con snapshot independiente `eo_footer_compat_20261018`, cache purge y readback PASS.
  Home y landing HubSpot verificadas a 1440/390 sin overflow ni errores de consola.
- [Evidencia y rollback](docs/audits/public-site/2026-10-14-footer-composition-v2.md#compatibilidad-del-bootstrap-2026-10-18).

## 2026-10-17 — Google Ads: arquitectura y prueba API de lectura

- Checkpoint18/10:499 tests y32 escenarios Chromium/API PASS; [paquete previo al release](docs/operations/releases/google-ads-2026-10-18/README.md), propuestas/hashes/rollback. Sin publicación ni deploy; hosts/protocolo real/EC/CI y alcance general pendientes.

- Revisión18/10:1.445 archivos de89d70ec13 auditados; CI/build PASS; Deep corregido localmente, revalidación remota pendiente. Reparación SQL HubSpot/Meta autorizada, versionada y verificada; dispatcher existente200 y dos submissions delivered al ledger sin destinos directos. [Auditoría](docs/audits/releases/2026-10-18-candidate-89d70ec13-review.md). Sin deploy ni publicación GTM.

- [ADR adoptado](docs/architecture/GREENHOUSE_GOOGLE_ADS_INTEGRATION_DECISION_V1.md) y
  [arquitectura](docs/architecture/GREENHOUSE_GOOGLE_ADS_MEASUREMENT_ARCHITECTURE_V1.md): OAuth/binding,
  GTM web/server, identidad comercial, consentimiento, HubSpot/Data Manager, reporting y rollout.
- [Probe API v26](docs/audits/growth/2026-10-17-google-ads-api-discovery.md) PASS para `6862539491`
  vía manager `9531478329`; dos acciones GA4 ocultas, tracking inactivo y cuenta nueva. Doce consultas,
  ninguna mutación; conexión y sender de producto pendientes. Funcional y manual documentados.
- Ratificación del operador: OAuth de producción **Efeonce** y CLI de consulta obligatoria en la primera
  unidad de lectura; catálogo y aceptación documentados. Rebranding y CLI pendientes de implementación.
- Unidad posterior: `pnpm google-ads` local implementada, con gestión ampliada por el operador. Lecturas
  reales PASS, planes create/update cerrados, validateOnly, hash, journal durable y readback por campo.
  Marca Efeonce guardada y grant Ads en secreto propio; regresión GA4/GSC y auth PASS. Ninguna escritura
  publicitaria ejecutada; verificación Google y conexión de producto pendientes.
  [Evidencia](docs/audits/growth/2026-10-17-google-ads-cli-oauth-implementation.md).

- Delta online: backend y renderers Forms/Meetings con recibo Ads postcommit, consentimiento explícito,
  capture de IDs y EC reservado. Dos acciones secundarias creadas/verificadas; workspaces Web8/Server12
  compilan por API. Sin publish/deploy/flag ON ni conversiones enviadas.
  [Evidencia](docs/audits/growth/2026-10-17-google-ads-online-conversions.md).
- Por instrucción posterior, términos de datos de clientes Ads aceptados/guardados y panel reabierto
  verificado en6862539491. EC OFF; sin publicación GTM ni promoción a main.

## 2026-10-17 — CLI local Meta para agentes

- `pnpm --silent meta`, contrato `meta-agent.v2`: lecturas existentes, catálogo SDK25, consultas por campo
  y métricas orgánicas; Ads nuevos PAUSED y publicación/respuestas propias con plan/hash/receipt privado,
  envío único y verificación GET. Resultado ambiguo sin reenvío; sin activación, DM ni nuevo sender CAPI.
- [Funcional](docs/documentation/growth/meta-agent-cli.md), [manual](docs/manual-de-uso/growth/consultar-meta-con-agentes.md)
  y [ADR vigente](docs/architecture/GREENHOUSE_META_AGENT_WRITE_CLI_DECISION_V1.md); foundation preservada.
  105 tests/5 archivos, TS strict y lint global PASS; código completo y lecturas/probes reales,
  POST públicos no certificados en vivo. Paginación social por fechas y reanudación IG verificadas.
  Sin integración productiva, MCP, deploy o ampliación IAM.
- [Rastreo Forms → medición → HubSpot](docs/architecture/GREENHOUSE_META_LEAD_TRACE_CLI_DECISION_V1.md):
  `leads find/trace` con selector privado y UUID, conexión/store canónicos READ ONLY; ACK local,
  historial HubSpot y contacto separados. Readback de un envío existente y sus IDs locales, sin mutación;
  HubSpot correlacionado, procesamiento Meta desconocido. Total actual: 172 tests/9 archivos, TS strict y
  lint propios PASS. Sin PII, descifrado, redispatch o CRM writes.
  [Último Performance releído](docs/audits/growth/2026-10-17-performance-latest-lead-trace.md): HubSpot recibido, ACK y un Lead servidor en Meta; sin fallos observados, identidad individual/atribución pendientes.
- [Recibos nativos HubSpot](docs/architecture/GREENHOUSE_HUBSPOT_FORM_RECEIPT_DECISION_V1.md): marcador
  server-side, historial exacto, ID persistido por CAS y recuperación GET independiente del POST.
  Código local probado; SQL parqueado, provisión/mapping y release pendientes. Históricos conservan
  correlación. [Meta individual](docs/documentation/growth/meta-individual-event-verification.md): sin
  GET por `event_id`; captura del recibo CAPI implementada localmente en el delta siguiente, sin reenviar eventos.
  [Cierre local](docs/audits/growth/2026-10-17-native-hubspot-receipt-closure.md): 262 tests/14 archivos,
  TS strict y lint PASS; SQL ejercitado en PostgreSQL aislado, lecturas reales sin mutaciones.
- [Recibo CAPI por evento/intento](docs/architecture/GREENHOUSE_META_EVENT_RECEIPT_DECISION_V1.md): sender
  fijado instrumentado localmente, header backend saneado, historial de hasta cinco observaciones
  en CAS de finalización y `meta.receipt` en CLI READ ONLY. No agrega sender ni retries por telemetría.
  Opción del template default OFF y SQL parqueado. Por orden del operador: commit sin activar/desplegar.
  [Cierre local](docs/audits/growth/2026-10-17-meta-event-receipt-local-closure.md): 402 tests Vitest +36 Node,
  TS/lint y SQL aislado PASS; sin nuevos eventos ni cambios externos.

- [Revisión final local](docs/audits/growth/2026-10-17-meta-cli-final-review.md): paginación malformada
  queda parcial, agregación HubSpot por ocurrencia/IDs por destino, fecha SQL protegida y validación
  de estados/historial de recibos. 426 Vitest +36 Node, TS/lint y SQL aislado PASS; skills espejadas
  y manuales actualizados. Sin push, activación, migraciones compartidas, eventos ni deploy.

## 2026-10-17 — Landing Performance Marketing en producción (TASK-1865)

- `/servicios/performance-marketing/` (page `251997`) publicada desde el canvas aprobado con el carril source-led de
  Medios: compilador, paquete scoped `performance-elementor-release.v1`, publicador, Ohio, SEO y migración de la legacy.
- Legacy `/servicio-gestion-campanas-publicitarias/` privada con 301; menú reapuntado; formulario propio
  `efeonce-performance-diagnostic` con destino HubSpot directo.
- Documentación sincronizada: funcional, manual, PRIMITIVES, contrato de forms, TRACKING-PLAN, servicios, PDRs,
  briefs y skill del sitio público (lecciones del carril de release).
- Cierre: TASK-1865 `complete`; políticas de medición Meta publicadas para Performance, Medios y HubSpot scope y primer
  `Lead` de servidor recibido por Meta desde el 14/10.

## 2026-10-17 — BytePlus: retratos activos y pruebas completadas en la cuenta correcta

- [Manual](docs/manual-de-uso/creative-studio/byteplus-directo.md) y [ledger por cuenta](docs/operations/creative-production/BYTEPLUS_VIRTUAL_PORTRAIT_LEDGER_V1.md)
  fijan Google SSO `jreyes@efeoncepro.com` / **3004839361**; la cuenta histórica incorrecta queda excluida de operación.
- KYC aprobado y carta aceptada por mandato de Julio; Entry Free activo. Chrome resuelto con permiso de archivos
  habilitado por Julio: **12 assets Active en 6 grupos**, sólo los PNG autorizados. Antonio primero; referencia y
  primer cuadro exitosos, luego el resto en orden. Videos, recibos y metadatos fuera del repo; IDs y cupos en el ledger.
- Documentación técnica, funcional, manual y skills Codex/Claude sincronizadas: verificar Active por respuesta y
  GroupId, conservar evidencia sin secretos, evitar cargas/tareas duplicadas y separar Entry gratuito del consumo API.
  Sin compras, cambio de plan, credenciales ni promoción a Globe; factura de inferencia aún sin conciliar.

## 2026-10-17 — Brochures aprobados, sin recortes ni validaciones adicionales

- Ratificación expresa de Julio: [uso comercial íntegro](docs/operations/EFEONCE_APPROVED_BROCHURES_POLICY_V1.md).
- LEEME, canon, manual y skills Codex/Claude/radar dejan de imponer pendientes históricos. Una autorización
  de envío no autoriza modificar el material; la copia Aloja de 38 láminas no se reutiliza.

## 2026-10-16 — Landing HubSpot v2 por los 4 resultados, con dock móvil y agenda nativa

- Landing pública [`/servicios-contratar-hubspot/`](https://efeoncepro.com/servicios-contratar-hubspot/) (página
  `244079`) rediseñada: 14 widgets compilados del canvas, HubSpot presentado como Agentic Customer Platform, SEO con
  frase clave «partner hubspot» (Semrush CL/MX/CO), OG propia y Service + FAQPage.
- Dock móvil con «Agendar reunión» (CTA gobernado `hubspot-discovery-meeting`, scheduler nativo) e «Ir al formulario».
- Renderer CTA 1.3.1: la cabecera del scheduler ya no se parte en móvil (pendiente de release a producción).

## 2026-10-16 — Agencia de Medios: brochure canonizado y landing publicada

- Landing pública [`/servicios/agencia-de-medios/`](https://efeoncepro.com/servicios/agencia-de-medios/) (página
  `251981`, menú Soluciones → Crecimiento Multicanal): 16 widgets compilados del canvas, header/footer de Ohio, SEO con
  frase clave «agencia de medios» (Semrush), OG propia y formulario `efeonce-media-diagnostic` con destino HubSpot.
- Brochure «Agencia de Medios» (65 láminas, PDF `c4697c7a…`) con logotipos oficiales de terceros y sin promesa de
  rebates. Canon: [norma](docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md) (deltas 2026-10-16),
  [PDR-025](docs/public-site/decisions/PDR-025-landing-agencia-de-medios-posicionamiento.md) y
  [material comercial de medios](docs/services/media-distribution/README.md).

## 2026-10-16 — GTM: drift vigilado en web y servidor

- `pnpm gtm:snapshot` versiona también el container servidor (sGTM/Meta CAPI) y tapa secretos con huella sha256;
  `gtm-drift.yml` compara a diario ambos containers live contra git y falla ante drift. El publish por script
  reescribe los snapshots. [ADR, delta 2026-10-16](docs/architecture/GREENHOUSE_MEASUREMENT_TAGGING_DEPLOYMENT_DECISION_V1.md).

## 2026-10-16 — Contacto: Nexa canónica, voz mexicana y medición Meta

- Hero de `/contacto/` con el rostro canónico de Nexa (inpaint Sunburst + anclas), voz «Escucha a Nexa» nueva
  (ElevenLabs Lucía es-MX, −16 LUFS), OG v3 en adjunto nuevo y cache-busting `?ver=filemtime` en hero/audio del widget.
- Política Meta + Google UPD publicada para `efeonce-contacto`; GA4 `generate_lead` verificado. Bible de Nexa: voz
  mexicana por decisión del operador. [Landing](.claude/skills/efeonce-public-site-wordpress/references/landings/contacto.md).

## 2026-10-16 — Brochure oficial «Agencia de Marketing 360°»

- Aprobado como brochure oficial de la agencia: versión completa (84 láminas) y corta (26), con índice linkeable,
  Channel & Commerce dentro de Brand y casos Berel y Sky compuestos con piezas reales. Registrado en la
  [norma](docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md), la documentación funcional y el manual.

## 2026-10-16 — Seguimiento web y evidencia reutilizable

- [Fabricio / Toyota del Bajío](docs/commercial/follow-up-agent/runs/2026-10-16-fabricio-web-hubspot.md):
  envío inicial verificado y tres seguimientos HubSpot Programado con salida por respuesta a cualquier correo.
- Prospección y adapter HubSpot Codex/Claude precisan versión de brochure, cuerpo/calendario de inscripción,
  límites de firma y conciliación BCC_TO_CRM. Manual, funcional y registro actualizados; sin nuevas acciones externas.

## 2026-10-15 — SKY: cobertura de auditoría y skills SEO

- [Matriz de siete frentes abiertos](docs/services/sky-blog-seo/COBERTURA_Y_PENDIENTES_AUDITORIA_2026-10-15.md),
  informe, marco de cuenta y plan distinguen diagnóstico base entregado, auditoría integral parcial y lote preparado.
- Skills `sky-blog-seo`/`seo-aeo` espejadas y modelo de informes conservan cobertura/denominadores y baseline real;
  GSC anterior no disponible no bloquea profundizar. Actualización documental, sin cambios al sitio ni nuevas compras.

## 2026-10-15 — OmniHuman: contrato API y routing de producción

- [Manual](docs/manual-de-uso/creative-studio/omnihuman-2-api.md),
  [funcional](docs/documentation/creative-studio/omnihuman.md) y
  [auditoría](docs/audits/creative-studio/OMNIHUMAN_2_API_RESEARCH_2026-10-15.md) separan Vision AI de ModelArk,
  AK/SK de IAM Bearer, capacidad publicada de acceso efectivo y permisos de imagen/voz.
- Skills de imagen, motion, audio, derechos y flota canalizadas al contrato; sin activación, inferencia,
  implementación CLI o promoción Globe. API300s y ficha UI120s quedan registrados por superficie.

## 2026-10-15 — Convención comercial de nombres

- Adoptada la [convención de negocios y leads](docs/operations/EFEONCE_CRM_RECORD_NAMING_POLICY_V1.md)
  aprobada por Julio, con routing en skills Codex/Claude, captura CRM, licitaciones y prospección.
- Primera aplicación: Gana66065702426; renombrado con readback. Nuevas altas autorizadas usan la regla;
  histórico pendiente de lote. Sin schema, workflows, envíos ni migración masiva.

Medición14/10: todo develop publicado en main9690efad (PR255/orquestador38591329633), Server9 estricto y watchdog6/6/drift0. API/panel/CLI para agentes comparten políticas y comandos; alta nueva por datos recibida en Meta Test Events con nueve claves sin otro build/redeploy/GTM. Consentimiento y Forms→HubSpot Forms→CRM preservados; fixtures archivados. [Release y límites](docs/audits/releases/2026-10-14-scalable-measurement-agent-first-release.md); [auditoría integral docs/skills](docs/audits/measurement/MEASUREMENT_DOCUMENTATION_CLOSURE_2026-10-14.md). Tráfico comercial/EMQ y resto de TASK-2035 pendientes.

Footer 14/10: composición V2 publicada, «Explora», newsletter/empleo independientes y partners gris. [QA y reversión](docs/audits/public-site/2026-10-14-footer-composition-v2.md).

## 2026-10-13 — Meta CAPI y consentimiento publicados

- Diseño de consentimiento La órbita autorizado y adoptado mediante adapter de presentación sobre HubSpot;
  [rollout WP/Think](docs/audits/measurement/CONSENT_UI_ROLLOUT_2026-10-13.md). Categorías y persistencia nativas, sin cambios de matching.
- Rotación Vercel autorizada14/10: anterior revocada/403, nueva CLI/API200; fuentes locales0600, GitHub y wrappers corregidos. [Recibo](docs/audits/measurement/VERCEL_CREDENTIAL_ROTATION_2026-10-14.json); sin workflow/deploy de prueba.
- Auditoría documental 14/10 con tres subagentes: contrato/recibo, capa [funcional](docs/documentation/growth/medicion-gtm-ga4.md#cookies-y-preferencias-del-visitante), [manual operativo](docs/manual-de-uso/growth/operar-consentimiento-cookies-publico.md) y skills; límites de QA y pendiente de seguridad explícitos.

- [ADR](docs/architecture/GREENHOUSE_META_CAPI_SERVER_GTM_DECISION_V1.md),
  [contrato HubSpot](docs/reference/measurement-gtm-ga4/09-hubspot-consent.md) y
  [auditoría](docs/audits/measurement/META_CAPI_RECOVERY_2026-10-13.md): mismo GTM Server en
  `efeonce-group`, min 0/max 1; **server live6/web live5**, Meta v25 y forwarding GA4.
- Banner español opt-in/GPC y routing activos WP/Think. PageView por destino, default denied,
  URL limpia, UUID sender compatible, Lead accepted form/confirmed meeting; sin nuevo sender.
- Meta Test Events Processed/Server y diez negativos sin salidas; navegación real ambos hosts
  completó Meta/GA4. Lead QA accidental previo documentado y gate UUID corregido.
- 16 tests bridge y 30 renderer PASS; renderer con contexto released PR254. Think promovido y WP
  plugin scoped 1.0.3 con preferencias inline junto a enlaces legales, sin franja adicional. Próximos leads/replay reales pendientes.
  Recuperación previa documentada; matching posterior abajo. Sin nuevo proyecto/suscripción.
- [Matching](docs/audits/measurement/META_LEAD_MATCHING_2026-10-13.md) activado tras
  [release completo PR254](docs/audits/releases/2026-10-13-full-develop-matching-release.md):
  main d692ab51dc48, orquestador38483437158/manifest released, CI20.100 PASS y build/Deep/smoke.
  SQL aplicada, GTM6 retira legacyLead12/17, GA4 Client boundary preservada. Ops00775-fnh
  y GitHub vars Meta/Google/retención true; captura Vercel true + redeploy READY/alias.
- GA4 UPD/ack y siete audiencias90d, secretos pinned/identidad real resueltos dentro del worker;
  Test Events em/ph/fn/ln, negativos live y cola/leaseCAS/retención PASS. Watchdog ok6/6 drift0.
  Primera conversión comercial consentida post-flip sin observar; TASK-2034 parcial, sin datos
  sintéticos de negocio. Incidente mindicador separado sigue abierto, excepción auditada.

- Auditoría integral con tres subagentes: [inventario y cierre](docs/audits/measurement/MEASUREMENT_DOCUMENTATION_CLOSURE_2026-10-13.md), [runtime10](docs/reference/measurement-gtm-ga4/10-growth-lead-matching-runtime.md).
  ADR/Forms/Meetings/host/skills y referencias sincronizados; historial preservado. [Configuración escalable](docs/architecture/GREENHOUSE_GROWTH_MEASUREMENT_CONFIGURATION_PROPOSAL_V1.md) **propuesta sin GO, no implementada**. Commit documental, sin publicación/release adicional.

## 2026-10-13 — Radar comercial con registro por corrida

- Automatización existente convertida a tarea nueva diaria en greenhouse-eo, conservando 09:00 Santiago.
- [Contrato y ledger](docs/commercial/prospecting-agent/README.md): búsquedas saneadas en repo, datos privados separados,
  cinco líneas × cuatro mercados; nuevas convocatorias para postular dentro de la misma semana calendario.
- INTURSA y Alfin registradas bajo autorización; cuatro contactos verificados vía Apollo. Históricos tratados como
  prospección futura. No Deals, notas ni envíos nuevos. Próxima ejecución programada todavía no observada.

## 2026-10-13 — Prospección personalizada: Outlook y seguimiento HubSpot

- 15/10: [Socopur](docs/commercial/tenders/socopur-agencia-marketing-digital-2027/research/seguimiento-2026-10-15-INTERNO.md), seguimiento puntual autorizado a Katherine con firma gráfica/PDF y EMAIL `118603198768` SENT asociado. Dossier y registros conciliados; Prospecting/HubSpot Codex-Claude precisan decisión por historial de cuenta, aporte nuevo y verificación de reply/adjunto/CRM. Sin admisión, secuencia o nuevo permiso futuro.

- 14/10: Prospección Codex/Claude incorpora la [estructura de correo robusto aprobada por Julio](.codex/skills/efeonce-b2b-prospecting/references/message-and-contextual-proof.md#correo-comercial-robusto-de-julio): contexto, encaje, aportes, enfoque sectorial, forma de trabajo, brochure explicado e invitación; profundidad adaptable, firma por la vía pedida y permiso de envío separado.
- [Política y ruta gráfica](docs/operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md): contexto individual,
  empatía, motivo para elegir Efeonce, brochure explicado y firma instalada en Outlook web; Enviados,
  adjuntos y EMAIL de HubSpot comprobados por separado. Criterio enlazado desde las skills espejo de HubSpot.
- [Registro de seis envíos](docs/commercial/follow-up-agent/runs/2026-10-13-outreach-personalizado.md),
  estado focalizado y continuidad de WIN actualizados; Rafael excluido y salvedad de Paula conservada.
  No renueva el corte global del pipeline ni concede autonomía recurrente de envío.
- Mandato posterior: [seis secuencias HubSpot, 18 seguimientos](docs/commercial/follow-up-agent/runs/2026-10-13-secuencia-hubspot.md)
  para 16/22/29 octubre en horas locales laborales. Inscripciones `Programado`, firma global Julio y
  parada por respuesta verificados. Apollo inactivo, cero inscritos. Preferencia y alcance documentados.
- [Módulo de secuencias en Prospecting](.codex/skills/efeonce-b2b-prospecting/references/hubspot-follow-up-sequences.md),
  routing, cadencia/mensaje/respuesta/entregabilidad, template, manual y adapter HubSpot espejados.
  Fixtures v9 P51–P55 cubren plataforma, autorización, programación, personalización y evidencia; sin nueva ejecución externa.
- [Política de seguimiento a largo plazo](docs/operations/EFEONCE_LONG_TERM_PROSPECT_FOLLOWUP_POLICY_V1.md) aprobada: proveedor vigente, revisión interna a seis meses sin hito, nutrición con permiso y reactivación autorizada. Skills espejo/fixtures v11 y seguimiento existentes actualizados; tareas comerciales en HubSpot por corrección de Julio. Fabrimetal: TASK 118419088700 para 13/04/2027 09:00 Chile, duplicado Notion Cancelado y nota CRM conciliada, sin envío.

## 2026-10-12 — Propuesta de campaña creativa: playbook y skills

- [Playbook de punta a punta](docs/operations/proposals/CREATIVE_CAMPAIGN_PROPOSAL_PLAYBOOK_V1.md) (caso fuente Sika N.º 1164): cinco piezas, secuencia,
  reglas del operador por pieza, trampas medidas y lista de control. Fila nueva en el router de `CLAUDE.md` y `AGENTS.md`.
- La oferta económica que ve el comprador va con la [plantilla A4](docs/commercial/templates/cotizacion-a4/README.md), desglosada por componente de valor
  (evolución gráfica → concepto → entregables); `economica:build` (Excel) sólo si las bases exigen planilla. Skills de licitaciones, práctica creativa y pricing actualizadas.
- `deck-studio`: referencia nueva de propuesta técnica de campaña creativa (segunda persona, nada defensivo, cumplimiento con las palabras de la ficha).
- `motion-design-studio` y `audio-studio`: workflow del reel de muestra (cuadros fijos → Seedance 2.5 → capa de motion de la campaña → montaje) y sus modos de falla.
- `efeonce-graphic-line`, `astro` y `docs/think`: página suelta de video de muestra con el reproductor de AXIS.

## 2026-10-12 — BytePlus: conexión directa de imagen, capas, video y Seed Speech

- [CLI y manual](docs/manual-de-uso/creative-studio/byteplus-directo.md): catálogo de 21 entradas, secretos
  separados en Secret Manager, recibos sin URLs firmadas y recuperación por task ID sin retry de generación.
- Layerize Pro/Flash conserva el contrato de capas/máscaras; BytePlus es default para los modelos del fabricante
  en las guías del operador. [ADR](docs/architecture/creative-studio/EFEONCE_BYTEPLUS_DIRECT_MEDIA_CLI_DECISION_V1.md)
  y [canary real](docs/audits/creative-studio/BYTEPLUS_DIRECT_CONNECTION_2026-10-12.md). Sin promoción de Globe,
  deploy ni compra/clonación de voces.
- [Precios API Seedance 2.5](docs/audits/creative-studio/BYTEPLUS_DIRECT_PRICING_COMPARISON_2026-10-12.md):
  30 s 1080p, BytePlus US$17,06 frente a Fal/Higgsfield base US$34,12; descuento final HF sin confirmar.
- [Nexa cine, Pro directo vs Sunburst max](docs/audits/ai-tooling/2026-10-12-nexa-seedream5-pro-vs-sunburst.md):
  una salida nativa por motor, mismos brief/referencias; Pro útil para variantes, Sunburst más fiel a la acción.
  Espera HTTP de imágenes BytePlus 600 s, sin retry; primer timeout con consumo sin confirmar. Sin publicación.
- [Cuatro iconos Flare max/Pro standard](docs/audits/ai-tooling/2026-10-12-iconos-flare-vs-seedream5-pro.md):
  ocho PNG nativos 2048², mismos prompts; Flare conserva mejor mate/detalle, Pro US$0,081 por icono con
  material a revisar. Comparación interna, fondo opaco; sin adopción de glifos ni cambio de UI.
  Segunda tanda clay 3D: ambos mantienen mate, Pro modelado más artesanal y Flare formas más regulares;
  ocho originales nuevos, prompts/recibos/costos guardados sin sustituir los anteriores.
- [Iconos nuevos Efeonce mate uniforme](docs/audits/ai-tooling/2026-10-12-efeonce-iconos-mate-uniforme.md):
  binoculares, metrónomo, sello e imán, bases planas aprobadas; prueba Flare/Pro con originales y alfa derivado.
  Ajuste adicional Pro y avisos geométricos documentados. Operador seleccionó Flare para esta ronda;
  comparación preservada, sin publicación del catálogo ni cambio del default global.

## 2026-10-12 — Medios: composición integral y operación programática acompañada

- [Modelo de línea §1.1](docs/business-models/media-distribution/MEDIA_DISTRIBUTION_BUSINESS_MODEL_V1.md#11-oferta-integral-como-agencia-de-medios):
  estrategia, compra/operación, creatividad, medición y gestión de inversión bajo Efeonce; taxonomía/estados conservados.
- Modelo programático V1.5 y pricing V1.4: ruta DSP directa acompañada en evaluación, RACI/gate, calibración y fee
  incremental en cuenta integral; tarifa aprobada sin cambio, medios/externos separados y sin doble cobro.
- [Evidencia HubSpot 12-10](docs/audits/commercial/BASIS_DISCOVERY_AND_MEDIA_OFFER_2026-10-12.md): transcripción completa,
  demo 21-10 registrada; ejemplos de fees no son cotización ni crédito. Catálogos, ADR/índices, manual/contexto y
  skills Codex/Claude sincronizados. Sólo documentación: sin contrato, compra, integración, envío o publicación.

## 2026-10-12 — Insights: el informe SEO puede medir sólo el contenido que Efeonce trabaja

- Nuevo en `greenhouse_growth`: `seo_content_scope_versions`, el alcance de contenido de una organización (reglas de
  ruta, versiones append-only). Aplicada a la base compartida. Berel tiene su alcance v1: `/articulos`, `/tutoriales`,
  `/inspiracion` y dos guías de la raíz.
- Comando nuevo `pnpm seo:content-scope`: muestra lo que un alcance mediría y las páginas que deja fuera; con
  `--apply` lo fija.
- Con alcance, el capítulo de búsqueda de Efeonce Insights mide sólo esas páginas, lo dice en la portada blanca, deja
  el sitio completo como contexto y saca el tráfico estimado del dominio a los límites. Sin alcance, el informe no
  cambia.
- Cambian para toda organización: la línea de clics por semana dibuja sólo semanas completas (los últimos días del
  mes ya no aparecen como una caída) y tres textos de Analytics pierden «al sitio» («Visitas orgánicas», «Visitas
  desde buscadores», «Visitas orgánicas, con y sin interacción»).
- Una página con un nombre más largo que la columna del informe ya no hace fallar el render: se abrevia por el
  comienzo y el final de su ruta.
- Berel: logos oficiales cargados en la organización (el anterior era una imagen generada con IA) y portada fijada en
  blanca. `scripts/insights/preview-edition.ts` acepta `--cover=light|dark`.
- **Desplegado** en Vercel staging y en el `ops-worker` (`d9a1c6a2d`). **Vercel Production sin release**: las
  ediciones creadas desde el portal de producción siguen midiendo el sitio completo de Berel (`TASK-2033`).

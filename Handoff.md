# Handoff

## 2026-10-27 — SKY: ADR y puente operativo probado localmente

[TASK-2073](docs/tasks/complete/TASK-2073-operational-account-bridge-local-prototype.md) cerrada sólo por sandbox:
97 tests/68 checks A′/B PASS, red/FS restringidos. [Evaluación](docs/audits/client-portal/2026-10-27-sky-operational-bridge-prototype/README.md).
[ADR Proposed](docs/architecture/GREENHOUSE_OPERATIONAL_ACCOUNTS_UNDER_ORGANIZATION_DECISION_V1.md): una Organization,
Spaces separados y A′ recomendado, owner Finance común normalizado **antes** de candidatos. U01/U02/U02F antes de
provisioning; no producción, fuentes, servicios o historia Diseño tocados, ni push/deploy. Types global baseline
agotó heap; lint global 0 errores/26 warnings existentes. Aceptación ADR y foundations reales pendientes.

## 2026-10-26 — Blog: refresh de Pipeline y de marketing de contenidos publicados

Pipeline (246045 → `/hubspot/pipeline-de-ventas/` con 301) y marketing de contenidos (244883, misma URL, 22:44 UTC)
publicados con portada, hero, tarjeta e infografía «Una idea, cada formato» (adjuntos 252169/252170, sólo claras).
Copias privadas 252161/252171 en la papelera; indexación de ambos pedida por la sesión de Analytics con OK directo de
Julio. Registro, QA y rollback en [Pipeline §11](docs/public-site/HUBSPOT_PIPELINE_REFRESH_DRAFT_V1.md) y
[marketing de contenidos §9–§10](docs/public-site/CONTENT_MARKETING_LEADS_REFRESH_DRAFT_V1.md). Receta de refresh y
trampas de QA (host.js del Growth CTA, engine.js del gráfico, categoría principal de la copia) en la skill del sitio
público §17. Pendiente: mapa de átomos de marketing de contenidos; tanda 2: GA4 formularios y Excel→HubSpot (246072).

## 2026-10-26 — Rooms: entorno local y conectores listos

B10 ampliado: [MCP PostgreSQL y dos bases efímeras](docs/audits/rooms/2026-10-28-b10-rooms-mcp-postgres.md),16checks+8gruposPASS y SQL read-only; Rooms intacto e0edf1e. Límites grants/contexto/dispatch/MFA separados; procesos retirados.

B10 local28Oct: Rooms→MCP en el mismo navegador, consentimiento explícito/tokenread/write-stepup,16checksMCP+8gruposRoomsPASS;
[recibo y límites](docs/audits/rooms/2026-10-28-b10-rooms-mcp-explicit-consent.md). Roomse0edf1e, Auth1136ac273; procesos cerrados, sin publicar.

B18 local28Oct: invitado OTP sin sesión interna/SSO;51checks,lint/typesPASS;
[prueba](docs/audits/rooms/2026-10-28-b18-guest-without-internal-sso.md). Commit Rooms3b1b7b2, procesos detenidos; sin push/flags/deploy. Nueva UI pendiente de Claude Design.

Rama runtime `codex/rooms-design-integration@2cddc98a`, sólo commit local. Next3216, PG55433 propio,
issuer fixture19338 y datos/permisos sintéticos; SDKbrowser same-origin para DTO/commands/media/sesión.
250testsPASS,lint/types/build y18checksAPIenChrome (imagen→publicación→guest,conflicto/replay/denegaciones);
Playwright53PASS/3skip. [Manual](docs/manual-de-uso/rooms/integrar-claude-design-local.md),
[evidencia](docs/audits/rooms/2026-10-26-local-design-integration.json).
Queda conectar/aceptar UI Claude Design, entorno cloud si se decide y activación separada. AuthPR263/264
OPEN sinmerge; producción no cambiada, sincorreo/push/deploy. Caché Next local puede regenerar archivos
de tipos: revisar sólo sus cambios generados antes de commitear. Runtime limpio al checkpoint; entorno activo.

## 2026-10-26 — Rooms/Auth: continuidad documental y conexión Claude Design

Estado y pendientes reconciliados en [dossier Rooms](docs/architecture/rooms/README.md),
[contrato Claude Design](docs/documentation/rooms/backend-api-for-claude-design.md) y skills Rooms/Auth
espejadas. Main Rooms e4b2e890 publicado: GCS/DB8/26tablas, worker automático y canary único comprobados;
flags humanos OFF. Falta entorno aislado/datos/permisos, conexión UI same-origin, recorrido nuevo y
activación general separada; restore8 no se infiere del ensayo histórico7. Claude Design conserva UI.
Auth **permanece en PR263/264 por decisión humana**, sin merge main/develop ni deploy; revisión00168-vzb
con emisor/login base activos, first-party/OTP OFF. CI263/264 y Vercel PASS en seguimiento posterior; ambas siguen abiertas.
[Readback](docs/audits/rooms/2026-10-26-docs-skills-state-readback.json),
[auditoría documental](docs/audits/rooms/2026-10-26-docs-skills-continuity.md).

## 2026-10-26 — Mass Chile: tres personas y cierre por canal

[Expediente](docs/commercial/prospecting-agent/runs/2026-10-26-mass-chile.md): Yuri por email personal
(excepción expresa) y DM; corporativo inferido rebotó, no reintentar. Guillermo/Judith: alta con Primary
Company/campos/segmento182 y dos correos personalizados, firma gráfica, CCO y dos brochures originales
por links nativos; Enviados y EMAIL SENT independientes. Cinco créditos históricos, sin nuevo gasto.
[Auditoría](docs/audits/commercial/2026-10-26-mass-chile-docs-skills.md); dos skills espejo y dueños
documentales actualizados. Corte17:04Chile, sin entrega/lectura confirmadas ni cadencia futura autorizada.

## 2026-10-26 — ARMOR / Indecaucho: discovery y caso en construcción

[Expediente único](docs/commercial/accounts/indecaucho-armor/README.md): Katia respondió y pide propuesta
para ARMOR; terna posterior sin selección. Invitación27/10 14:30–15:00Chile y confirmación26/10 14:28
con firma/CCO verificadas; cadena HubSpot de cuatro contiene la confirmación, no cuatro envíos nuevos.
Tres subagentes ampliaron marca/canal/digital y método. Guía de reunión y caso v0 listos, economía
pendiente de discovery. Skills/mirrors y fixtures v16 actualizados; [cierre](docs/audits/commercial/2026-10-26-armor-discovery-case-docs-skills.md).
Lectura posterior **HubSpot/Notion** autorizada y programada una vez27/10 16h en este hilo; app ID
`armor-leer-discovery-y-completar-caso`. Configurada/releída, aún sin ejecución/transcripción. Global
PAUSED conservado; no nuevos contactos, Deal/Lead, etapas, secuencias, precio o envío.
Registro final pedido después: NOTE119606905700 y TASK119625704196, Julio/TODO/NOT_STARTED,
27/10 16hChile; cuerpos, fecha/owner y ambas asociaciones releídos. La revisión sólo actualizará esa TASK.
[Señal y seguimiento previos](docs/commercial/follow-up-agent/runs/2026-10-26-indecaucho-documento-seguimiento.md)
se conservan; respuesta posterior no prueba causalidad.

## 2026-10-26 — Blog: pilar Loop Marketing publicado y barrido de docs y skills

- **Pilar publicado:** «Qué es Loop Marketing» (248398) en `/loop-marketing/que-es-loop-marketing/`.
  - 248483 quedó en borrador, con un 301 de Yoast hacia el pilar.
  - Portada 252148, `hero` 252149 y tarjeta 252150.
  - Lleva lo verificado de UNBOUND 2026.
  - Sin la sección de transparencia, por decisión de Julio.
- **Detalle y rollback:** [borrador del pilar](docs/public-site/LOOP_MARKETING_REFRESH_DRAFT_V1.md) §4 y sus deltas.
- **Content Factory:** el embed de YouTube lleva la URL en su propia línea.
- **Reglas nuevas:**
  - voz de Julio §4.5 y §4.6;
  - no exponer la caída de un contenido propio (`AGENTIC_BLOGPOST_AUTHORING` §8);
  - fusión de posts (skill del sitio §16);
  - Loop 2026 en `hubspot-solutions-partner`.
- **Casebook cine:** fallas 59–64 de portadas sin persona y dos recetas nuevas en `cine-recetas.json`.
- **Pendiente:**
  - indexación en Search Console del pilar y de `/aeo/seo-y-aeo/` (la hace una persona);
  - 248513, sin decidir;
  - grabación de UNBOUND (sesión del 17-sep);
  - [brief Taste Profile/4 Rs](docs/public-site/LOOP_TASTE_PROFILE_4RS_ARTICLE_BRIEF_V1.md), por validar demanda.
- **Coordinación:** las sesiones del blog autorizaron purgar la caché después de republicar contenido sin
  consultarles, salvo cuando haya despliegues de plugins.

## Antecedentes25–26Oct — Rooms/Auth antes de la conciliación documental

### 2026-10-26 — Rooms: backend Codex y diseño Claude Design

Auth separado: corrección preparada en PR263 (main,5e1fc2554) y264 (develop,aabd6d78d), **retenidas en PR
por instrucción expresa del operador**, sin merge ni deploy.22Python+14contratosVitest/gates/hook normal
PASS;CI general de HEAD nuevos pendiente, tras corregir fixture/espejo que fallaron en primera pasada.
No release262 ni flags/correo/workflows ajenos. Revisar filtros de deploy por src/lib antes de264.
[Auditoría y límites](docs/audits/rooms/2026-10-26-auth-deploy-control.md).

Disparo automático posterior ya verificado: Rooms main `e4b2e890` (PR3), endpoint de máquina con OIDC
y Scheduler cada minuto. Vacío200 sin contenedor; demanda sintética en la misma sala archivada202→Job
`4r9nz` SUCCESS, cola vacía/ack liberado y publicaciones intactas. Ocho migraciones/26tablas, worker
por digest `d49995de…`,234testsPASS. Flag dispatch ON; flags humanos web OFF; cero correos y ningún
cambio UI. [Prueba](docs/audits/rooms/2026-10-26-automatic-media-dispatch.json). Claude Design conserva frontend.

Canary real de Auth y una imagen completado; flags OFF: Microsoft/MFA, una sala sintética y PNG físico de 3 MB por GCS→Job→dos WebP; preview de 304 KB con SHA/ETag/SQL coincidentes. Un correo recibido: código correcto200/incorrecto400/replay404, lectura privada200 y revocación401/404. Invitación revocada y sala archivada. Final Rooms main a87852e OFF y Auth00168-vzb OFF, misma imagen; Resend producción v1 y Sentry production corregidos. [Prueba y límites](docs/audits/rooms/2026-10-26-auth-rooms-real-image-canary.md). Bootstrap b2f90fa local sólo habilita edición/reapertura de esa sala. Al terminar ese canary quedaban consumidor Claude Design, disparo del Job y workflow Auth staging pendientes (deltas posteriores arriba). Sin full suite repetida ni release de Greenhouse.

Bloque de infraestructura cerrado: bucket GCS privado con IAM/CORS y SA, 7 migraciones/25 tablas cloud, rol worker con límite 2 y secreto v1; Job CPU 1/RAM 1Gi, timeout 240s y cero reintentos, con una ejecución de cola vacía SUCCESS. Variables GCS preparadas para próximo deploy; app OFF, sin Auth/correos/UI/scheduler ni otro deploy. [DB](docs/audits/rooms/2026-10-26-media-database-infra.json), [storage](docs/audits/rooms/2026-10-26-media-storage-infra.json), [worker](docs/audits/rooms/2026-10-26-media-worker-deployment.json). Canary OIDC y de imagen real, consumidor y disparo del Job quedan para el siguiente bloque. Lint del script y typecheck global PASS; no se repitieron las 225 pruebas anteriores.

Actualización posterior autorizada: backend fusionado en `efeonce-rooms/main@a87852e` vía [PR2](https://github.com/efeoncepro/efeonce-rooms/pull/2), sin los doce paths visuales2071.225tests+lint/types/build,53 browserPASS+3skip,CI Docker/previewPASS; flagsOFF sin cambios. [Recibo de despliegue](docs/audits/rooms/2026-10-26-production-backend-release.json). Recursos/migraciones/worker cloud y canary pendientes; no correo ni deploy Auth/Greenhouse.

Asignación humana vigente: Codex backend; Claude Design interfaz. TASK-2072, runtime rama `task/2072-cloud-media-backend`, commitd056708 y [PR1](https://github.com/efeoncepro/efeonce-rooms/pull/1) draft contra el scaffold rescatado.225/225testsPASS0skip,lint/types/build,PG16/18restore2tenants/6rooms y CI DockerLinux/decoderPASS. GCS/directPUT/generaciones y workerComputeperfilpropio preparados; ningún JSX/layout/motion nuevo. Main20f9fe9 conservado. Bucket/IAM/CORS,rol/SA/secretworker,migracióncloud/canary siguen pendientes;CLI+ADC renovados por runner canónico y verificados vigentes; readback confirma bucket/SA/secret worker aún ausentes, lectura Job no concluyente. [Contrato frontend](docs/documentation/rooms/backend-api-for-claude-design.md), [recovery](docs/audits/rooms/2026-10-26-media-backend-recovery.md). No cerrar2072 por código/fakesSDK ni activarflags por conectar diseño.



Claude auditó con tres subagentes de solo lectura: [registro de estado](docs/audits/rooms/2026-10-25-rooms-auth-status-after-codex-stop.md). Auth `auth-server-00166-p77` (`754a2a28`) vivo con first-party y OTP **OFF**, Login V4 servido; PR #262 draft con CI pendiente; promoción a main, flags y único canary a `jreyes@efeoncepro.com` pendientes; ningún correo enviado. Rooms `20f9fe9` en Vercel con `ROOMS_*` OFF, DB `rooms_production` 5 migraciones. WIP medios TASK-2070/2071 **sin commitear en `efeonce-rooms`** y con `typecheck` rojo (TS2322): llevar a rama, nunca a `main` (cada push es producción). Skills vivas nuevas `efeonce-rooms` y `efeonce-auth` (espejo Claude↔Codex) con ledger del programa. Segunda auditoría (§6): EPIC-044 tiene 27 unidades, sin repo propio, sin logins nativos desde 26/9 porque faltan los conectores de Codex y Claude (TASK-1904/2000; MCP construido y probado), `develop` despliega el emisor productivo. TASK-1829 cerrada (administrativa). 1828/1830/1832 NO listas (llave v1, passkeys 2 navegadores, muestra steady). PR #262 CI verde sin promover. Medios de Rooms rescatados en rama local `efeonce-rooms` `task/2070-2071-private-media` (`c0facfd`, `2626921`, `7ca5fd3`: limpieza, worker `--loop`, hijo sin `tsx`, DO en migración; verify 207/207), `main` sigue en `20f9fe9`. Demo de Rooms **no aceptada** por Julio (busca algo más inmersivo): Rooms en pausa hasta revisar la dirección con maqueta. Login V4 vivo en `auth.efeonce.org/login`; entrar a Rooms con él sigue OFF. Siguiente (con créditos Codex desde 1/11): release #262 + canary único, conectores Codex/Claude, separar deploy de Auth, higiene de seguridad.

## 2026-10-25 — Auth: Rooms primero y login V4

1834/2064/2067 y consumer Rooms verificados localmente; Greenhouse diferido2063. Goal de producción controlada autorizado con único correo a jreyes@efeoncepro.com; migraciones1834/2067+registroRP+secretosv1 aplicados y verificados, aún sin deploy/envío real.1833 en ejecución: Julio sustituyó pentest contratado por evaluación propia; openredirect magiclink corregido y146testsPASS separados, señales5nuevas/PGaislado, workflow flags+secretrefs y senderOTP trackingOFF. Revisión ofensiva CIMD bloqueada automáticamente; patchdefensivo+magiclink192PASS/tscPASS, no pentest completo. [Rollout](docs/audits/identity/2026-10-25-auth-rooms-controlled-rollout.md), [evaluación](docs/audits/auth-server/2026-10-25-independent-protocol-review.md), [preflight](docs/audits/identity/TASK-2067-production-preflight-2026-10-25.md), [base local](docs/audits/identity/2026-10-25-auth-rooms-first-local.md). Peer «Mira el epic de rooms» posee2068UI/WAF/cloud; coordinación continua, sin activar antes de readiness común. Harness OIDC+OTP19336 activo sólo para QA UI3210 del peer; cleanup al terminar. Release en preparación: contención duradera correos Growth OFF, lint gráfico mecánico corregido; fullsuite detectó mirror de rutas Auth incompleto, corregido con2paths y13retestPASS;21598testsPASS/383skip. Lint heredado21whitespace corregido conASTidéntico; lintglobal0errors; tsc del toolingRooms falló y fue corregido d4a1d16e0, nueva pasada globalPASS. PR262 remoto; CI/build/smoke pendientes. Recibos completos pasan a .auth0600 por repo público; resúmenes mínimos, historia previa no borrada.

## 2026-10-25 — Rooms: autoría V2 verificada y acceso coordinado

Runtime e72ad65 incorpora autoría V2;66testsPASS0skip, lint/types/build y migración down/up/restore mixto V1/V2 PASS. TASK-2062 cierre local; demo pública sigue bd4b802. TASK-2065 consumerOIDC interno en implementación con peerAuth1834/2064. TASK-2066 prepara invitaciones: UN correo Resend trae enlace tokenizado+código, cliente pega código EN Rooms; issuer2067 verifica/envía y Rooms conserva sesión guest limitada. No SSO global por OTP, no emails reales enviados, sin DB cloud. GoalEPIC-052 abierto. Índices README/registry compartidos coordinados con peerAuth, no mezclar su WIP. [Auditoría](docs/audits/rooms/2026-10-25-versioned-content-authoring.md).

[Historial](Handoff.archive.md).

## 2026-10-25 — Rooms: persistencia, motion y primer release

Goal explícito de continuar EPIC-052; GitHub privado y publicación Vercel autorizados. TASK-2058/2060 complete: can y ciclo durable PostgreSQL local con concurrencia, auditoría/outbox y recuperación probada. TASK-2059 incorpora View Transitions y botones/badges AXIS; aceptación visual humana pendiente. TASK-2061 publica [demo sintética](https://efeonce-rooms.vercel.app/demo) en Vercel, commit `bd4b802`, deployment `dpl_8vJ75Cbn1q75JNe7FEa7LkUccigc`; [dossier vivo](docs/architecture/rooms/README.md), [manual](docs/manual-de-uso/rooms/operar-primera-experiencia-local.md). Runtime `../efeonce-rooms` main, repo privado `efeoncepro/efeonce-rooms`; docs en develop. Efeonce ID aún depende de TASK-1834: issuer vivo sólo anuncia scopes MCP; API real 401, sin DB cloud ni clientes reales. EPIC-052 continúa abierto.

## 2026-10-25 — UTP Perú: presentación enviada; LinkedIn pendiente
[Caso y readback](docs/commercial/prospecting-agent/runs/2026-10-25-utp-gustavo.md): Company UTP y Contact Gustavo
Alfaro con Primary y segmentos comprobados; Apollo waterfall autorizado, correo Verified, 2 créditos.
Enviados y EMAIL `SENT` asociados: dos brochures originales, clientes, firma gráfica y CCO; sin Lead/Deal ni
nueva secuencia. LinkedIn **no enviado**, faltan créditos de InMail y la invitación previa sigue pendiente;
texto preparado en nota CRM. Esperar admisión/documentación de Compras; no repetir el correo ni comprar plan.

## 2026-10-25 — Aprendizaje comercial reutilizable y propuesta de pauta
Prospección, Commercial y Copywriting Codex/Claude cargan el criterio de conversaciones útiles para nuevas
aperturas, seguimientos e inbound comercial; espejos verificados. [Implementación y cola nativa](docs/commercial/analyses/2026-10-prospeccion/IMPLEMENTACION-Y-PAUTA.md).
[Aplicación nativa verificada](docs/commercial/analyses/2026-10-prospeccion/APLICACION-HUBSPOT-2026-10-25.md): guía9.705, nueve correos/nueve plantillas ajustados, cinco pausas en cuatro cuentas; cola13→8 el29Oct. QA borrador nuevo pendiente por créditos; sin envío inmediato.
Pauta propuesta: US$600/mes, Chile, Search/HubSpot, sujeta a demanda/costo y ruta de conversión; sin gasto aprobado.

## 2026-10-25 — Ficha de autor del blog, byline y schema de autor (TASK-2057) cerrada
El single muestra «Por Julio Reyes» enlazado al archivo y, al final, la ficha de La órbita (retrato `portrait`, cargo,
bio corta, temas, «Ver sus 44 artículos», LinkedIn e Instagram) en lugar de la caja de Ohio con redes del demo.
`efeonce-editorial-blocks` 0.5.5 (runtime d3156f6, lector `EO_Author_Profile`; hovers sin el relleno de Ohio y aire bajo la ficha tras tu revisión) y `page_headline.php` por el paquete del
tema (runtime 1d7a7bd); perfil de Julio cargado (avatar 252085, cargo «Managing & GTM Director», bios sin «Fundador»)
e indexable de Yoast reconstruido. Verificado en vivo: Person con cargo, foto, `sameAs` y `worksFor` por `@id`;
Playwright 5 anchos sin desborde, axe 0. Trampas: `.single-post aside {display:none}` inline (la ficha es `section`),
el indexable de Yoast guarda el `og:image` viejo y Ohio repinta todo enlace al hover (cada enlace de la ficha lleva
`-unlink -undash`; prueba de 34 chequeos). 0.5.6 (ficha más contenida: retrato 160, ancho 800) en producción y verificada en vivo. **Pendiente:** enlace YouTube global de Ohio → `colabrio`; slug de autor; `/wp-json/wp/v2/users`. Turno de content-model devuelto a la sesión del Archivo, que implementa la cabecera de `/author/` con el mismo lector. TASK-2057 cerrada por el operador el 2026-10-25. Ajustes posteriores en vivo: 0.5.8 (ficha alineada con el texto en teléfono, centrada en escritorio, 56/40 px de aire) y 0.5.9 (redes junto al retrato en teléfono). Sin push.

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

# TASK-2001 — conexiones owned y QA local, 2026-10-04

Estado: código local, conexiones de proveedor comprobadas con lectura real; rollout M2M pendiente. Ningún push,
deploy, envío de correo ni publicación CMS en este corte. La autorización anterior de rollout se ejecutó en aa6fa07;
no se reutiliza para publicar estos commits nuevos.

## Alcance del operador

Resend y HubSpot conectados mediante adapters de sólo lectura de Greenhouse; Marketing Cloud Engagement y Next
preparados, sin lector ni cuenta de prueba. Blog: WordPress público efeoncepro.com; el CMS sigue siendo atributo de
cada cuenta cliente, otros CMS conservan URL pública y fecha confirmada por persona. draft_url sólo se almacena.
SEO/AEO y TASK-2003 no se implementan aquí. Claude conserva la UI TASK-2002.

## Evidencia verificada

- Studio e62b5e3: API 1.8.0 aditiva, cuatro providers email, resumen emailEvidence, constraint de publicación completa.
  Migración 1791155100000 up/down/up en Postgres local 18.6. El constraint rechaza incluso JSON vacío con publicación.
- Studio 055860d: consumidor Greenhouse con organización/proveedor/cuenta verificados por página, deduplicación,
  cursor repetido rechazado y sin aplicar crawls incompletos. Marketing Cloud falla explícitamente como no configurado.
- Studio ade6765: tres adiciones de catálogo; owned_email_resend, owned_email_sfmc_engagement, owned_email_sfmc_next.
  Publicación de nueva versión en transacción PG revertida; v1 y owned_email_hubspot permanecen idénticos. El JSON es
  una propuesta aditiva: no se aplicó a staging/producción.
- Greenhouse f06f61efb: puerto sister-platforms con binding organization y configuración cerrada de cuenta. Nueve
  tests focales, lint y typecheck PASS. Resolvers canónicos de HubSpot y Resend; no secrets nuevos ni duplicados.
- Canary real de adapters: Resend una página, un broadcast borrador, cero enviados; HubSpot dos páginas, 16 batches,
  dos envíos completos sustentados por eventos SENT y 14 borradores. No se conservan destinatarios, asunto ni cuerpo.
- Canary WordPress: 96 URLs vivas (44 posts y 52 páginas); muestra posts:251941, publicación 2026-09-28T19:16:21Z,
  HTTP 200, robots.txt 200, canonical exacto y sitemap presente. El inventario usa sólo metadata paginada: pedir el
  cuerpo de páginas excedía el límite de 2 MiB y se corrigió el origen del problema sin ampliar ese límite.
- Studio f72e408: lectura WordPress acotada y caché por corrida; suite final 288 tests + 7 gates con PG real, build PASS.
- Worker-domain con evidencia real sobre PG local: primera corrida incluyó una cuenta duplicada del fixture WordPress;
  se retiró sólo ese fixture local. Replay final: tres cuentas, 113 observaciones, cero cambios y cero errores; worker_run
  succeeded. Verifica persistencia y deduplicación; no prueba aún el transporte M2M remoto.
- CLI HTTP contra build local y Postgres desechable: 2 preparaciones + 25 comprobaciones PASS; plan, dryRun, replay,
  actualización, reschedule dry/apply, link/unlink, from_execution, cancelación, calendario, atención y aislamiento.
  Confirmación de publicación, slug y backfill rechazan el bearer sin autoridad de persona, como corresponde.
- CLI owned adicional: 15 comprobaciones PASS con respuestas reales normalizadas en PG local; HubSpot completo
  publicado, Resend borrador sin publicar, WordPress con fecha/URL y draftUrl conservado. Reprogramación dryRun
  y cuenta Marketing Cloud preparada sin conexión. CLI unitaria: 18 tests PASS.
- GVC anónimo (Studio open) desktop 1440×960 y móvil 390×844: calendario renderizado sin errores de consola, página,
  hidratación ni HTTP. Artefacto local `.captures/2026-10-04T23-18-59_task2001-studio-owned/`. No sustituye el QA visual
  de Claude ni acredita los formularios de escritura que siguen en implementación.

## Contrato para TASK-2002 y TASK-2003

75 tools y 80 operaciones HTTP conservadas. Manifest API 1.8.0:
`ece8711173bc7f5e0bb473cd446ece43efb7adc766c0115ea55f2be41b254859`.

Nuevos providers `resend`, `salesforce_marketing_cloud_engagement`, `salesforce_marketing_cloud_next`.
Account `readerAvailability` distingue implemented/not_implemented (no implica conexión). ExecutionRecord
`emailEvidence` incluye kind, completion, sentCount, expectedCount, source y lastSentAt; null significa ausente.
La UI debe mostrar nombres legibles de los nuevos providers y completitud parcial/desconocida; el snapshot de
TASK-2002 revisado aún usa fallback a la clave y todavía no presenta emailEvidence. Son puntos del handoff de UI,
no una certificación de TASK-2002. Formularios T1 siguen su implementación; modo open permanece de sólo lectura.

El gateway debe sincronizar este hash al integrar TASK-2003; no se declara federado este nuevo contrato.

## Rollout concreto pendiente

1. Revisar/autorizar push y release coordinado Greenhouse/Studio. Migración SQL owned-email en staging primero.
2. Publicar la ampliación del catálogo desde su versión vigente, mediante commands, sin editar v1; revisar tracking.
3. Greenhouse: consumer marketing-studio activo, binding organization a la org Efeonce y cuenta exacta por proveedor;
   flags GREENHOUSE_STUDIO_EMAIL_EVIDENCE_ENABLED y GREENHOUSE_STUDIO_EMAIL_EVIDENCE_BINDINGS. Las dos credenciales
   canónicas actuales sólo admiten una cuenta cada una; no se extiende la autoridad a otros clientes.
4. Worker: endpoint HTTPS del puerto, secreto del consumer, bindings exactos Resend/HubSpot/efeoncepro.com y cuentas
   registradas. deploy.sh conserva estos knobs y owned OFF; completarlos en el commit del rollout. Crear scheduler
   owned sólo después del canary autenticado, con worker_run y relectura idempotente.
5. Verificar CLI/UI sobre ese deployment, flags OFF/ON, revocación del consumer, account/org ajena y rollback por flag.
   Resend no tiene broadcast enviado: esa certificación live queda pendiente de un envío de negocio autorizado,
   nunca se envía uno sólo para probar. Marketing Cloud permanece preparado por decisión expresa, sin bloque de cierre.

Resend lee broadcasts nativos. Para batches enviados por el dispatcher Greenhouse, se exige primero el vínculo
explícito a campaña/activación: priority=broadcast no lo reemplaza. No se importó correo transaccional ni se duplicó
el inbox/webhook existente. Límites de paginación y tiempo: ver ADR; al agotarse muestran reader fallido.


## QA Release Audit

Verdict: **BLOCK para rollout; verificación local PASS**. Closure state: código de conexiones implementado,
rollout pendiente y UI TASK-2002 todavía en implementación. Scope: providers, contratos, migración, worker, puerto
Greenhouse y docs propios; se preserva el trabajo de Claude y los cambios ajenos del checkout.

Riesgo alto: datos de varias organizaciones y fecha de publicación. Se verificó rechazo de cuenta/portal ajeno,
flag OFF, cursor repetido, eventos fuera de campaña, respuesta parcial, SQL malformado y errores redactados.
Skills aplicadas: efeonce-marketing-studio, software-architect-2026, hubspot-greenhouse-bridge,
resend-email-platform, efeonce-public-site-wordpress, greenhouse-browser-diagnostics,
greenhouse-documentation-governor y greenhouse-qa-release-auditor.

Bloqueos: falta el release autorizado y su M2M/consumer real; Resend todavía no tiene un broadcast enviado;
UI de escritura de Claude sigue abierta. Ni tests verdes ni captura local prueban esas condiciones.
No se consultó Sentry de producción porque este corte no se desplegó; logs locales, errores redactados y worker_run
son la evidencia de observabilidad aquí. La TASK permanece in-progress con AC y Status real actualizados.


### QA adicional de navegación: hallazgo móvil abierto

GVC `.captures/2026-10-04T23-25-59_task2001-studio-owned/`: escritorio pasa Mes→Semana→Día→Línea de tiempo→Pauta;
móvil pasa hasta Día y falla al clicar Línea de tiempo (step 7). `cal-layout`/`topbar` interceptan el puntero.
Cero errores HTTP, de página o consola en ambas variantes. Se conserva el fallo, sin `force` ni bypass, para
reproducción y resolución con Claude. Fixture: 113 observaciones owned, panel de 50 ejecuciones sin vincular.
Por eso el QA de interacción móvil NO se declara PASS aunque la captura básica de calendario haya pasado.

Reproducción independiente con Playwright, 390×844, sin capturas intermedias: falla tanto al abrir Día directamente
como tras Mes→Semana→Día. El enlace termina en y=0.39, scrollY=343, debajo de HEADER.topbar; LI.unlinked-item también
intercepta. La misma ruta pasa en escritorio. No se modificó la UI de Claude ni se forzó el clic.

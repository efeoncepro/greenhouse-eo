# Handoff

## 2026-11-02 — Carril CLI de agentes para Rooms en producción y aceptado (TASK-2095 + TASK-2087)

Enmienda **D1-bis** al [ADR del carril](docs/architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md#enmienda-d1-bis--carril-cli-directo-2026-11-01)
(«CLI primero, gateway después»): un agente opera Rooms en producción con el login de una persona interna, sin MFA por
acción. **En producción:** Efeonce ID con la audiencia `https://efeonce-rooms.vercel.app/api/v1` y los clientes
`efeonce-rooms-cli`/`efeonce-rooms-resource` (hotfix PR #267, release `69b0ba90832c`, `auth-server-00172-zcn` al 100 %,
2026-11-01); Rooms con el verificador del bearer y `pnpm rooms login|logout|whoami` (PR #22 `9a4340a`, carril encendido por
el operador en `efeonce-rooms-15djjyfz2`, PR #23 `3434ea8` con `/cli/conectado` y `/cli/error`). **Aceptación:** tras un único
`pnpm rooms login`, el agente creó y publicó la sala `demo-volta` en «Efeonce» (edición `87dd99b7`, 17 acciones
`cli/claude-code`, sin invitaciones); `logout` y un segundo login verificados por el operador. Interruptores:
`ROOMS_AGENT_LANE_ENABLED=false`, suspender `efeonce-rooms-cli` o vaciar `AUTH_SERVER_ROOMS_AUDIENCE`
([manual](docs/manual-de-uso/rooms/operar-rooms-con-agentes-por-cli.md)). **Pendiente:** copy del consentimiento
`75b40772d` (sólo `develop`, sale con el próximo release completo); cierre formal de 2095/2087 (siguen in-progress, ver sus
criterios abiertos); la sala vista con sesión humana en `/rooms`; `read.client` tras la revisión de gobierno de datos IA;
gateway TASK-2086 (sólo el canje) → TASK-2088. Rama: Greenhouse `develop` (docs y `src/lib/auth-server`), Rooms `main`.
Siguiente ID libre: TASK-2096.

## 2026-11-02 — Pantallas de Efeonce ID con La órbita (develop, sin release) y fin del login de la CLI de Rooms (vivo)

**Efeonce ID** (commit `d14b786d3`, local, sin push): todas las pantallas salvo el login V4 usan el shell
`src/lib/auth-server/oauth/pages/orbit-shell.ts` (canvas aprobado por el operador). Órbita canónica alrededor de un ícono
AXIS en reposo o de una palabra, una esfera por pantalla, titulares Bricolage, código de seis casillas con modo respaldo,
marca de `efeonce-rooms-cli` por id exacto. Assets por `pnpm auth-server:brand-assets:generate` (drift en
`orbit-shell.test.ts`). Gates: 784 pruebas de `src/lib/auth-server`, typecheck y contraste verdes. **Pendiente:** `pnpm build`,
flujo real contra el host y el release gobernado a `main` (mismo servicio que el login MCP; requiere autorización).
**Rooms** (PR #23, merge `3434ea8`, en producción y verificado por el operador): el callback loopback de `pnpm rooms login`
responde 303 a `/cli/conectado` («Listo») o `/cli/error` («Casi», motivo cerrado), sin code ni tokens en la URL.
Manuales y doc técnica: [pantallas Efeonce ID](docs/manual-de-uso/identity/operar-pantallas-efeonce-id.md) ·
[CLI de Rooms](docs/manual-de-uso/rooms/operar-rooms-con-agentes-por-cli.md).

## 2026-11-02 — Botón «Continuar con Efeonce ID» canonizado

«Continuar con» + `efeonce-id-button-lockup-{positive,negative}` (Efeonce | ID con «ID» en la tinta del texto) en
`axis-brand-assets` 0.4.32 (publicado en el release `v0.4.32`, AXIS `0d45749`, 2026-11-02, readback en GitHub Packages; 59/59 pruebas del paquete y 179/179 del Lab). Anatomía,
tamaños y los diez estados en el README del paquete y en el [ADR](docs/architecture/brand/EFEONCE_ID_MARK_DECISION_V1.md).
Pendiente: primitive en `axis-ui-primitives` y adopción en Rooms, Studio y Greenhouse.

## 2026-11-01 — Perfil de clave OpenAI `personal` para generación creativa

Resolver único `src/lib/ai/openai-api-key.ts` para `openai.ts` y `openai-image.ts` (commit `60a53958b`, sin push):
`OPENAI_API_KEY_PROFILE=<perfil>` / `pnpm ai:image --openai-key <perfil>` → secreto `greenhouse-openai-api-key-<perfil>`;
falla cerrado, nunca cae a la canónica; resultados con `keyProfile`. Secreto `greenhouse-openai-api-key-personal` creado
por el operador (cuenta personal, 200 USD) con `secretAccessor` para `greenhouse-portal`; prueba real `low` 1024² →
`clave personal`, ≈ USD 0,006. Regla: generación creativa de agentes con el perfil explícito; producto/runtime/`pnpm dev`
con la clave de empresa; nunca default en `.env.local` ni en Vercel/workers. Manual
[alternar-clave-openai.md](docs/manual-de-uso/ai-tooling/alternar-clave-openai.md). Typecheck, lint y 58 pruebas verdes.

## 2026-11-01 — Marca de Efeonce ID aprobada y canonizada en AXIS

«La órbita vive en la D»: asta, tramo recto de 110 y media órbita, esfera Growth a la 1:30 ([ADR](docs/architecture/brand/EFEONCE_ID_MARK_DECISION_V1.md)).
Generador `scripts/brand/build-efeonce-id-logos.mjs` (0 px de diferencia contra el canvas aprobado); 12 SVG
`efeonce-id-*` en `axis-brand-assets` 0.4.31 (publicado en el release `v0.4.31`: AXIS `5a6a597` + `5540a2c`, 2026-11-02, readback en GitHub Packages; 59/59 pruebas del paquete y la del Lab verdes).
Regla del operador: en el login de Auth sólo favicon y formulario; el panel lateral es del carrusel de novedades.
Skills `efeonce-graphic-line`, `efeonce-auth` y `axis-design-system` actualizadas y espejadas. **Favicon de Auth
cambiado en `develop`** (teja de Efeonce ID vía `scripts/auth-server/efeonce-id-favicon.ts`; 743 pruebas de
`src/lib/auth-server` verdes, verificado en el arnés): llega a producción sólo con un release gobernado. Pendiente: fijar
`axis-brand-assets` ≥ 0.4.31 en Greenhouse (TASK-2014), lockup del formulario y botón «Continuar con Efeonce ID».

## 2026-11-01 — Cloud Build: paquete de subida 986 → 131 MB

`.gcloudignore` excluye `/ai-generations/`, `/outputs/`, `/generated/` y `/scripts/frontend/` (anclados a la raíz;
sin anclar, `ai-generations/` también atrapaba `scripts/ai-generations/`). Verificado con
`gcloud meta list-files-for-upload`: solo salen archivos de esas cuatro carpetas y siguen presentes todas las rutas
que copian los 8 Dockerfiles de `services/`. No se borra nada del repo. Al empujar a develop, los filtros de ruta de
`artifact-worker`, `commercial-cost-worker` y `auth-server` disparan un deploy a staging, que es la prueba real
(empujado a develop; los 4 deploys de workers a staging salieron verdes). El operador compró el CUD de Cloud SQL
`greenhouse-pg-dev-us-east4-3y` (3 años, us-east4, USD 0,03/h ≈ 21,60/mes, inicio 2026-11-01 16:00 PT) y canceló
Looker Studio Pro (verificado). Proyección: ~CLP170k/mes desde diciembre.

## 2026-11-01 — Kortex retirado: respaldo, Vercel pausado, proyecto GCP cerrado

**Actualización:** el operador cerró `efeonce-kortex-dev` (estado `DELETE_REQUESTED`, se puede deshacer con
`gcloud projects undelete` durante 30 días); el respaldo en `efeonce-group-kortex-archive` sigue intacto.

Decisión del operador: Kortex no continúa. Respaldo verificado de `kortex-pg-dev` (`kortex_app` 41 tablas +
`postgres`) en `gs://efeonce-group-kortex-archive/` (clase ARCHIVE, proyecto efeonce-group); la base quedó otra vez
STOPPED/NEVER. Proyecto Vercel `kortex` (`prj_8ylpHC3DI1EdRO1hjZfwWPrk5Y1O`) pausado, responde 503. Pendiente humano:
`gcloud projects delete efeonce-kortex-dev` (bloqueado al agente por la regla de borrado irreversible; restaurable
30 días), que corta ~CLP11k/mes. Las rutas `/api/admin/kortex/*` y la señal `platform.kortex.github.ci_last_status`
siguen en el código: la primera queda sin backend (0 requests en 30 días); la segunda lee GitHub y no se rompe.

## 2026-11-01 — GCP: limpieza de imágenes y tarballs de Cloud Build

Octubre cerró en ~CLP258k netos (junio 111k). Aplicado con autorización del operador: cleanup policy
`keep-15-most-recent` + `delete-older-than-30d` (enforced) en `cloud-run-source-deploy` us-east4 y us-central1
(simulación previa: 241 versiones viejas, 0 imágenes vivas; artifact-worker y notion-bq-sync sirven la más
reciente), y lifecycle `age 30` sobre `gs://efeonce-group_cloudbuild/source/` (2.452 tarballs, 327 GB; soft
delete de 7 días). Ahorro esperado ~CLP25–30k/mes, no confirmado hasta la factura de diciembre. Pendiente: cada
tarball pesa ~727 MB porque `.gcloudignore` no excluye `ai-generations/`, `outputs/` ni `generated/` (ningún
Dockerfile las copia). Decisiones abiertas: kortex-pg-dev detenida (11k), Looker Studio Pro (8.7k), clamav
min=1 (19.5k), balanceador MCP (25k).

## 2026-11-01 — Globe: listeners suspendidos con IP conservada

Aplicado exclusivamente retiro HTTP/HTTPS del balanceador (`0/0/2`); IP original reservada, SQL STOPPED/NEVER
y cuatro schedulers PAUSED. Forecast CLP22–23k/mes, no ahorro confirmado. Reactivación automática de listeners
en `draining`, sin cambiar DNS; [estado y evidencia](docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md).
Monitor actualizado, Terraform validate y 35 tests PASS. Sin deploy de servicios ni despertar SQL.


**31/10 — Prospección focal:** [Wequips/Mambrino](docs/audits/commercial/2026-10-31-wequips-mambrino-docs-skills.md).
Mayra: NDR de correo inferido, sin reintento. Dayanna: Apollo Verified/2 créditos, Contact/Primary y email SENT
comprobados; LinkedIn previo. Pendientes Commercial: respuesta/brief, secundaria vacía y verificación de
segmentos Mambrino. Skills espejo y canon actualizados; sin nueva comunicación o secuencia en este cierre.

## 2026-11-01 — Efeonce ID en `main` con carrusel; Rooms con entrada 307 y nombre del espacio

Release `935583f88db0-544b3943-a041-4fe6-9e62-03aca45c6c8f` (run `41284120477`) `released` al tercer intento:
`auth-server-00170-qlx` al 100 %, first-party/OTP ON, Login V4 con carrusel también en la entrada a Rooms; tráfico a la
última revisión, rollback a `00169-4pq`. Intentos 1 y 2 abortados por [ISSUE-184](docs/issues/resolved/ISSUE-184-auth-deploy-guard-rejected-squash-releases.md)
(guard vs squash, PR #265) y [ISSUE-185](docs/issues/resolved/ISSUE-185-auth-governed-deploy-revision-without-traffic.md)
(tráfico fijado); CI rojo previo por [ISSUE-186](docs/issues/resolved/ISSUE-186-growth-seo-tests-broke-at-etv-cutover.md).
PR #263/#264 cerradas, retención levantada. Rooms PR #9–#11 en producción: 307 sin sesión ([ISSUE-188](docs/issues/resolved/ISSUE-188-rooms-anonymous-entry-rsc-redirect-flash.md)),
`organization.rename` + espacio «Efeonce» ([manual](docs/manual-de-uso/rooms/nombrar-espacio-de-trabajo.md)) y gate de
migraciones revisadas ([ISSUE-187](docs/issues/resolved/ISSUE-187-rooms-reviewed-migrations-inventory-blocked-deploy.md)).
Sin verificar: Sentry del release y login humano Efeonce ID → Rooms (TASK-2064/2085 siguen in-progress). Próximo:
TASK-2086 (delegación interactiva para Rooms) y TASK-1833 antes de cualquier cliente real.
Después (local, sin push): [TASK-1833 conciliada](docs/tasks/in-progress/TASK-1833-efeonce-auth-server-security-assurance-and-operations.md)
y la rama local de Codex `codex/auth-pr-develop-stack` integrada en `develop` (`e09d72d70`): revocación/recuperación atómicas,
413, OTP con fallo cerrado, Job de rotación (migración sin aplicar) y verificación post-deploy del tráfico. Requiere release a
`main`; la llave de firma (KMS v1/v2 del 04-09) dispara `auth.keys.rotation_overdue` hacia el 23-11.

## 2026-11-01 — SKY: B recomendado tras pruebas locales

[TASK-2094](docs/tasks/in-progress/TASK-2094-sky-measurement-real-component-local-validation.md):
[204 pruebas PASS](docs/audits/client-portal/2026-11-01-sky-finance-routing-validation/README.md), 37 nuevas
Finance/routing/historia. Recomendación B: un owner comercial, Spaces Diseño/SEO separados. El trigger real
rechaza el owner común con client SEO separado; rekeyear gastos divide P&L. Grants/contexto son necesarios
en ambos. Writer Notion admite reasignación/eventos antiguos; rebuild histórico usa actividad actual.
Rollback PG real probado; ICO sólo orden de llamadas simulado, no BigQuery. [ADR Proposed](docs/architecture/GREENHOUSE_OPERATIONAL_ACCOUNTS_UNDER_ORGANIZATION_DECISION_V1.md).
Próximo: U01 contexto por Space en ruta/reader real local; después bindings/protección temporal. HTTP/UI,
concurrencia, historia integral y distribución pendientes. Contrato GA4/GSC/AEO candidato; TASK-2033/1960
conservan scope/reporting. Sin src/producción/provisioning/envíos ni historia real de Diseño modificados.
Typecheck focal sin diagnósticos, ESLint focal y task lint PASS; recibo conserva hashes de los componentes ejercitados.

## 2026-10-30 — Mattis GRD-1555: oferta enviada en Wherex

[Expediente](docs/commercial/tenders/mattis-branding-marketing-inmobiliario-1555/README.md): enviada 30/10 17:11 por
Julio (OK explícito), COP 120.000.000 netos de IVA; excepción de margen ≈ 17 % decidida por Julio, bajo el piso de 45 %.
Pendientes: certificado de residencia fiscal SII (retención máx. 10 %, convenio Chile–Colombia art. 12), declaración de
conflicto de intereses adjuntada en el reenvío de las 17:38 (sin comisión Wherex), claims SSilva/Berel/«+85» y permiso de logos (TASK-1937). Lecciones en skills
espejo: Wherex (`wherex-radar-chrome-playwright.md`) y «La órbita» (`lessons.md`). HubSpot: deal 66672959873 en
«Presentación de soluciones», COP 120.000.000, nota 120053981805. Sin push.

## 2026-10-30 — Qualitor SMZ-116: respuesta leída, HOLD contractual

[Expediente](docs/commercial/tenders/simoniz-qualitor-temporada-viajes-smz-116/README.md) y
[contraste primario](docs/commercial/tenders/simoniz-qualitor-temporada-viajes-smz-116/REVISION-RESPUESTA-2026-10-30.md):
Caso v2 local. COP 70 millones integrales, operación incluida, materiales adaptados Simoniz y zonas sin lista de PDV.
«COLOMBIA» no habilita facturación Chile: HOLD; sin ruta local aceptada, recomendar NO-BID modalidad chilena.
Inicio del foro 25/11 frente a ítem 01/12; cierre del aviso 06/11 14:00 Colombia = 16:00 Chile frente a UI 18:00 sin zona, pendiente conciliar.
Wherex Editando / 0 COP / sin archivos; adjudicación, firma y OC no acreditadas en cobertura revisada.
Gates internos propuestos: Julio/Legal 03/11 y bid/no-bid 05/11, 12:00 Colombia. Sin envío, oferta ni cambio HubSpot.
OneDrive conserva v1; no se sobrescribió. No hay recordatorio ni comunicación futura programada.

## 2026-10-29 — Sales Navigator: búsquedas en cuatro mercados hispanos

[Inventario](docs/commercial/sales-navigator/BUSQUEDAS-GUARDADAS-MERCADOS-HISPANOS-2026-10-29.md): **24 búsquedas de cuentas/20 de personas**,
Chile/México/Colombia/Perú; nombres/IDs verificados tras recarga. Persistencia completa, cobertura parcial:
[diagnóstico Perú](docs/commercial/sales-navigator/COBERTURA-PERU-Y-VALIDACION-DE-BUSQUEDAS-2026-10-29.md) CRM 58→81→106→868 y Growth 789.
Sede/geografía cambian población; vocabulario ampliado cambia varios términos. No sumar ni calificar conteos.
Las 100 observaciones de tarjetas previas no validaron compradores excluidos. Skill B2B espejo, política y
capas documentales separan persistencia/muestra/cobertura, controles conocidos y contrastes por filtro.
P89 offline preparada, sin evaluación conductual. Variantes temporales sin guardar; las 44 nativas intactas.
Cupos documentados 50+50, sin prueba de borrado/recuperación ni recepción futura de avisos semanales.
Listas 54/57 y servicios/Personas 12/5 sin cambio. Sin mensajes, solicitudes, InMail, CRM o scheduler externo.
Próximo: auditar cobertura de las 20 consultas de personas antes de proponer reemplazos; mantener criterio
comprador y prioridad agencias/proveedores. Commit local, sin push; cambios concurrentes preservados.

## 2026-10-29 — Home efeoncepro.com «La órbita × Pingback» en producción

[Contrato](docs/architecture/public-site/HOME_INICIO_ELEMENTOR_MODULES_V1.md) · [manual](docs/manual-de-uso/public-site/operar-home-efeonce.md) ·
[auditoría](docs/audits/public-site/2026-10-29-home-orbita-rediseno-y-seo.md). Home `251731` reemplazada por la landing
compilada `inicio` (12 widgets, nav/footer canónicos, agenda con CTA `site-nav-discovery-meeting`); rollback
`_gh_home_orbita_before_20261029_012508`. OG 1200×630 `252184` + metadatos sociales y destacada
(`_gh_home_orbita_seo_before_20261029_092107`); videos diferidos (0 MB al cargar). A papelera con 301 a `/`: /home-2-2/,
/home-2/, /home/, /home-prueba/ y cinco demos Ohio. QA vivo 1440/1280/390. Pendiente: editor Elementor, PSI/CWV (cuota),
push de develop y runtime `af1a785`. Commits locales `5532e6371`…`f86460ec5`.

## 2026-10-28 — MG Indusol: correo enviado y cierre documental

[Expediente Mayra / MG Indusol](docs/commercial/prospecting-agent/runs/2026-10-28-mg-indusol-mayra.md):
correo único autorizado enviado a las 19:37:35 Chile, brochure 360° completo, firma gráfica y CCO;
Enviados y EMAIL 119882403672 SENT comprobados por separado. Contact 258762787214 nació por
Documents/PRESENTATIONS; su SQL automático no acredita calificación. Vigencia del aviso, piso de
50 personas, presupuesto y proceso comprador sin confirmar; tres adyacentes investigados sin acercamientos.
[Cierre docs/skills](docs/audits/commercial/2026-10-28-mg-indusol-docs-skills.md): canon y espejos pertinentes,
estado privado conciliado; sin secuencia, nuevo envío ni normalización CRM autorizados. Próximo: esperar respuesta.

## 2026-10-27 — ARMOR / Indecaucho: caso v1 validado y revisión cerrada

[Expediente](docs/commercial/accounts/indecaucho-armor/README.md): discovery realizada con Vanessa;
HubSpot MEETING119610757452 READY/104intervenciones y transcripción Notion contrastadas en la revisión
programada de las16h (misma grabación). Caso v1 ya preparado, conservado sin reescritura.
[Validación y precisiones](docs/commercial/accounts/indecaucho-armor/POSTREUNION.md#validación-programada-del-2710--1600-chile):
piloto90días LinkedIn/Google, Compras/SSO, canal distribuidor; EC/CO y visibilidad PE2027. Presupuesto y
forecast del caso son escenarios internos, no acuerdo comprador; Kommo aclarado previamente por Julio.
TASK119625704196 COMPLETED por lectura/análisis, body/estado y owner/fecha/asociaciones releídos;
NOTE119606905700 intacta. Automatización focal eliminada al cumplir su única revisión, global sin cambios.
Por pedido posterior de Julio, [propuesta90días](docs/commercial/accounts/indecaucho-armor/PROPUESTA-90-DIAS-BORRADOR.md)
actualizada: [V3 calculóUSD22.450](docs/commercial/accounts/indecaucho-armor/COSTEO-V3-2026-10-27.md),
primer período11.350 y siguientes5.550 × 2; medios separados hasta18.000. Por mandato de Julio, catálogo localv14
incorpora Performance/Ecuador con reglas estimadas, mediante preview/apply/puntero; policyv12/créditosv1 intactos.
Margen modelado59,28%, sin líneas bajo piso;1.860testsPASS/3skip. Sustituye21.000 provisionales/bloqueo anterior.
Próximo: Julio/Operations revisar valor/alcance/capacidad, accesos y Finance entidad/tributos/cobro;
propuesta29–30/10, terna4/11 sin selección acreditada. Datos de Kommo, documentación técnica y regla de canal
pendientes. Sin aprobación, envío, nuevo cambio CRM, commit o deploy.

## 2026-10-26 — Blog: refresh de Pipeline y de marketing de contenidos publicados

Pipeline (246045 → `/hubspot/pipeline-de-ventas/` con 301) y marketing de contenidos (244883, misma URL, 22:44 UTC)
publicados con portada, hero, tarjeta e infografía «Una idea, cada formato» (adjuntos 252169/252170, sólo claras).
Copias privadas 252161/252171 en la papelera; indexación de ambos pedida por la sesión de Analytics con OK directo de
Julio. Registro, QA y rollback en [Pipeline §11](docs/public-site/HUBSPOT_PIPELINE_REFRESH_DRAFT_V1.md) y
[marketing de contenidos §9–§10](docs/public-site/CONTENT_MARKETING_LEADS_REFRESH_DRAFT_V1.md). Receta de refresh y
trampas de QA (host.js del Growth CTA, engine.js del gráfico, categoría principal de la copia) en la skill del sitio
público §17. Pendiente: mapa de átomos de marketing de contenidos; tanda 2: GA4 formularios y Excel→HubSpot (246072).

## 2026-10-26 — Rooms: entorno local y conectores listos

01Nov: [MFA aceptado por reporte de Julio vía sesión Auth](docs/audits/rooms/2026-11-01-operator-mfa-acceptance.md),
sin logs ni prueba instrumentada añadidos. Prioridad: acción/aviso/reversa de agente, QA de la casa nueva y medición
Live; gates de clientes separados. Ledger/skill espejo, dossier y TASK-2082/2085 conciliados; sin cambio de runtime.

29Oct: [conciliación completa docs/skills](docs/audits/rooms/2026-10-29-docs-skills-full-reconciliation.md)
con3subagentes: arquitectura/manuales/Rooms/Auth/MCP, tasks y routers. Fuente3c7 intacta;
AGENTS runtime actualizado en de38af5. Recovery8 PG16/18 ya ejecutado ahora tiene recibos versionados.
Sin repetir pruebas, correo o servicios; UI/externos/rollout y retención Auth se conservan.

29Oct: [backend local listo para conectar](docs/audits/rooms/2026-10-29-backend-local-completion.md),
Código Rooms3c7bcb5 sin push:337tests0skip, lint/types/build, Chrome18+23 y restore PG16/18
(13migraciones/43tablas,23archivos/14pins) PASS. Colaboración/presentación, V4 mixto y MCPstdio;
[contrato Claude Design](docs/documentation/rooms/backend-api-for-claude-design.md) y manual listos.
Cierre local2070/2074–2078; UI2071/2072, Linux/cloud, conectores reales y rollout separados.
Entorno detenido; Auth retenido en PR, sin producción/correo.

[Dos RP/adapters locales, retest](docs/audits/rooms/2026-10-28-two-rp-auth-ca97eecd1.md): Rooms8750750 + fuentes Authca97eecd1,35checks/Chrome/PGPASS. Checkout avanzó sólo docs a0ab888728; issuerQA, no server.ts completo. RP2 mismo consumer; sin rollout/HTTPS/MFA. Bases retiradas.

[Aislamiento RP focal](docs/audits/rooms/2026-10-28-cross-rp-persistence-focal.md):3PASS/0skip, servicios/persistencia con PG efímero; Rooms e0edf1e intacto, DB retirada. Dos aplicaciones RP/browser integral sigue pendiente.

B10 reader real: [Auth8d027f747→Rooms e0edf1e](docs/audits/rooms/2026-10-28-b10-rooms-mcp-authority.md),16checks+8gruposPASS y SQLv7; datos/proyección sintéticos, sin revocación browser binding ni dispatch/MFA. Bases efímeras retiradas, sin publicar.

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

[Historial](Handoff.archive.md).

---
name: greenhouse-gtm-ga4-operator
description: Operate Google Tag Manager Web/Server + GA4 + Meta Conversions API for Efeonce — create/edit tags, triggers and variables via the GTM API v2 (governed workspace → preview → confirm → publish), register GA4 custom dimensions and key events, and verify events land. Use when tagging Growth Forms, Growth CTAs, the native meeting scheduler or landings; wiring governed dataLayer events to GA4; building or auditing GTM container config; confirming a measurement ID/property; or diagnosing "event not showing in GA4". Operates the `src/lib/growth/{gtm,ga4}` clients and the measurement tracking plan; event semantics remain owned by their source domains.
---

# Greenhouse GTM Web/Server + GA4 + Meta CAPI Operator

Use this skill to **operate measurement instrumentation** for Efeonce: build and publish GTM tags/triggers/variables via the API v2, register GA4 custom dimensions and key events, and verify that events actually land in GA4. It is an **executing operator**, not a knowledge dump — the conceptual reference (event model, naming, taxonomy, house style) lives in **`docs/reference/measurement-gtm-ga4/`** (owner skill: `growth-marketing-cro`). Load that for the "what/why"; this skill is the "how to build/publish/verify".

> **Efeonce tagging is immature.** Assume nothing is tagged until verified. Build in the workspace, verify, and only publish with human confirmation.

## LinkedIn Ads — discovery, no conexión implementada

Cargar [fuentes y contratos LinkedIn](../../../docs/reference/measurement-gtm-ga4/11-linkedin-insight-tag-conversions-api.md)
y [preparación](../../../docs/manual-de-uso/growth/preparar-medicion-linkedin.md) antes de recomendar tags.
InsightTag2.0 es web; CAPI puede usar backend directo o template oficial sGTM revisado. La
[arquitectura es Proposed](../../../docs/architecture/GREENHOUSE_LINKEDIN_ADS_MEASUREMENT_ARCHITECTURE_V1.md),
no una instalación activa. Cuenta/Partner ID/reglas/roles/HubSpot siguen sin verificar; Google no los concede.
Un instalador del tag; revisar HubSpot Pixels antes de duplicar. Tag+CAPI redundantes usan dos reglas,
misma cuenta y eventId canónico, no una regla compartida ni la ventana Meta. Enhanced tracking
li_fat_id, enhanced matching web y hashes CAPI son distintos. Consentimiento LinkedIn/CMP y GPC
se prueban explícitamente; no heredar permiso/bloqueo Google. No PII/hashes en dataLayer ni tokens
web. No activar, publicar o crear leads ficticios desde el discovery; `growth:measurement` no acepta
LinkedIn hoy. Backend directo es candidato CAPI, no sender añadido por actualizar esta skill.

## When to invoke

Google Ads: `pnpm --silent google-ads discover` y el
[manual](../../../docs/manual-de-uso/growth/conectar-google-ads-con-agentes.md). CLI local de lectura y
creación/actualización por plan, validateOnly, hash, journal y readback; target único `6862539491`,
manager `9531478329`, Ads `jreyes@efeoncepro.com`, Cloud siempre `julio.reyes@efeonce.org` / `efeonce-group`.
No tokens en flags/env ni cuentas libres. Crear capacidad no autoriza un apply sin payload concreto;
no reintentar un resultado unknown ni borrar el journal. OAuth guardado Efeonce; verificación Google
pendiente. Google Ads no ofrece scope OAuth separado de sólo lectura; el runner/catálogo y la
autoridad de cada operación restringen su uso. La marca cambió sin sustituir clients, callbacks,
scopes ni grants GA4/GSC; esas conexiones pasaron consultas posteriores al cambio. Conexión/API/MCP
de producto e ingesta no están entregadas. Cargar el manual antes de operar.


Para **consultar y operar Meta con agentes** (Ads, catálogo completo de métricas, stats/calidad,
Página e Instagram), usar `pnpm --silent meta discover` y el
[manual de la CLI](../../../docs/manual-de-uso/growth/consultar-meta-con-agentes.md).
Tooling local `meta-agent.v2`: identidad/Business verificados, token de Secret Manager en memoria,
lecturas con cobertura explícita y escrituras acotadas con plan/hash/receipt privado. Ads nuevos
PAUSED; publicación/respuestas requieren autorización del payload real. Preparar no envía; `write verify`
sólo consulta. Un resultado `unknown` nunca se reenvía automáticamente. No activa pauta ni envía DM.
No sustituye sender CAPI/políticas, no amplía IAM, no ofrece datos individuales del pixel. Campos no
soportados no son ceros; Lead de pruebas no es demanda comercial. No usar scripts ad hoc con tokens.
Para seguir un lead: `leads find --input archivo-0600.json` devuelve candidatos; `leads trace` exige
submission ID o event UUID. Cargar el mismo manual: runtime `greenhouse_app` READ ONLY, sin exportar
identidad/descifrar/redispatchar. ACK sGTM no es procesamiento Meta; contacto CRM no prueba envío.
HubSpot usa resolver canónico y portal verificado; `--source-only` omite esa comprobación remota.
Identidad nativa: [manual](../../../docs/manual-de-uso/growth/guardar-identidad-nativa-hubspot.md);
marker por envío, GET histórico y CAS del worker. Checkpoint 18/10: schema/worker servidos y
propiedad/campo/mapping Performance configurados; primera identidad nativa pendiente. Históricos
sin marker siguen correlacionados, sin backfill ni otro POST.
[Meta individual](../../../docs/documentation/growth/meta-individual-event-verification.md):
sin GET por event_id; no usar Test Events como sandbox ni reenviar para completar evidencia.
Recibos por evento: [ADR](../../../docs/architecture/GREENHOUSE_META_EVENT_RECEIPT_DECISION_V1.md) +
[manual](../../../docs/manual-de-uso/growth/conservar-recibos-meta.md). Checkpoint 18/10: Server 10 live,
template 3/tag 6 instrumentados y `captureEfeonceReceipt=true` para el Lead backend autenticado;
schema/worker compatibles servidos. Default del template sigue OFF; PageView no recibe ese header.
Primer recibo Graph real pendiente. `meta.receipt` puede acreditar recepción de una petición exacta,
no procesamiento, matching ni atribución. No publicar/enviar ni repetir un lead para llenar evidencia;
no ejecutar el builder histórico de workspace. Antes de modificar, releer versión/template/tag y el manual.

- Tagging a Growth Form, Growth CTA, native meeting scheduler or landing so its governed event reaches GA4.
- Wiring form `gh_form_*`, CTA engine `greenhouse_cta_*`, legacy host `gh_cta_clicked` or native
  meeting `gh_meeting_*` events to GA4 without merging their namespaces.
- Creating/editing/publishing GTM tags, triggers, variables (by API or reviewing UI changes).
- Registering GA4 custom dimensions (`form_slug`, `form_kind`, `surface_id`, `cta_location`…) or key events (`generate_lead`, `sign_up`).
- Confirming which Measurement ID maps to which GA4 property; auditing a container.
- Diagnosing "event not showing in GA4" (container-not-installed, wrong ID, consent, dataLayer timing).

For **event naming / taxonomy / the gh_ house style** → `docs/reference/measurement-gtm-ga4/` (skill `growth-marketing-cro`). For **campaign/UTM measurement strategy** → `digital-marketing`.

Revisión final CLI/recibos: paginación Meta malformada queda parcial; no anunciar fin de lista.
La historia CAPI exige intentos crecientes (huecos permitidos) y reloj Graph compatible con su propio
registro durable (margen cinco minutos). HubSpot multidestino agrega por `fsub-*`, conserva los IDs
nativos por destino y devuelve exit6 con evidencia mixta. `verified` requiere checks/fecha/cobertura.
[Revisión local 17/10](../../../docs/audits/growth/2026-10-17-meta-cli-final-review.md); la configuración
posterior está en la auditoría 18/10 y no certifica primera recepción real.

## Meta CAPI / sGTM — cargar antes de proponer o ejecutar

Canon: `docs/reference/measurement-gtm-ga4/10-growth-lead-matching-runtime.md` (implementación vigente),
`09-hubspot-consent.md`, `08-meta-conversions-api-server-side.md` +
ADR `GREENHOUSE_META_CAPI_SERVER_GTM_DECISION_V1.md`. Para Efeonce, CAPI se opera por
**GTM Server**, separado de Pixel/web; no proponer Pixel web como solución completa.
Meta admite backend directo y Gateway, pero no son la ruta elegida. Inventariar primero:
API 2026-10-13 confirmó `Efeonce Server` `GTM-K2X4ZTTK`, cuenta `6068297031`, container
`191286361`, inicialmente live3; recuperación live5 posterior, con Client GA4 y tag CAPI para `708931297255942`. Estado de matching más abajo/auditoría; no operar con el snapshot inicial.
Releer `usageContext`, endpoints, Clients, template/SHA/permisos, versiones y fuentes.

1. Recuperar el server existente antes de crear otro. Metadata/URL/token no prueban funcionamiento.
   Hosting: leer billing mode, mínimos de servicio/revisión, máximos, CPU/RAM y costo antes de
   provisionar. El contenedor Server requiere ejecución; la referencia USD/mes de instancia
   always-on no es una tarifa fija ni una factura. min=0 no garantiza gratis y free tier se
   comparte por billing. Ante cuota de vinculación, evaluar el proyecto canónico existente
   antes de solicitar cuota o crear otro proyecto, con capacidad/costo explícitos.
2. PageView requiere navegación consentida. Para matching TASK-2034, Lead nace en backend
   sólo tras aceptar formulario comercial o confirmar reserva elegible. No usar submit intentado,
   clics, errores o postulaciones. El espejo `gh_form_submission_accepted` /
   `gh_meeting_booking_confirmed → generate_lead` conserva una sola conversión GA4.
   La recuperación inicial llevaba ese espejo a Meta; retirar sus triggers12/17 al activar
   el ingreso backend, nunca mantener ambos senders con IDs independientes. Cargar las skills
   Forms/Meetings; proyección cifrada e identidad durable pertenecen al contrato10. Los
   triggers12/17 ya están retirados desde Server6: no reactivarlos como fallback.
3. CAPI tag y token sólo servidor. No ampliar dataLayer/GA4 con PII; usar ingress separado,
   allowlists por destino, gate Meta explícito (denegado/desconocido bloquea) y exports redactados.
4. Identidad/tiempo estables por ocurrencia/retry; Pixel complementario comparte nombre/ID.
   No crear dos senders independientes ni prometer que sGTM evita todos los bloqueadores.
5. Preview Server → salida y respuesta Meta → Test Events Server → readback live/dedupe.
   `/healthy`, tag disparado, GA4 smoke y snapshot web NO prueban CAPI.

Lead para remarketing requiere el contrato **08 §4.1–4.2** y TASK-2034: Meta usa hashes
SHA-256 sin salt y sin appendix SDK; Google normaliza por separado (Gmail dots y +E.164).
No reutilizar HMAC interno. Prohibido PII/hash en eventos GA4 ordinarios, dimensiones,
dataLayer y URLs. **UPD dedicado top-level MP es el carril permitido para Google**, con
client_id real, sin events ni otro generate_lead; publicidad y analytics consentidos.
El template Meta pin necesita `custom_properties` JSON string, no un objeto directo.
Backend captura sólo aceptación/confirmación, veto adicional Sec-GPC, snapshot cifrado,
UUID/tiempo durables y unique source. Worker comparte cadence Forms con fallo de medición
aislado; destinos independientes, lease CAS y retención48h. Al cutover retirar los triggers
Meta Lead browser12/17 antes de habilitar backend; PageView11/GA4 mirror continúan.
Publicar Client/retiro legacy →destinos y retención worker ON →captura/redeploy Vercel última.
Forwarding GA4 restringido a `Client Name = GA4`: el Client backend no reenvía otro generate_lead.
Verificar versión congelada antes de publicar; recibo tras create_version permite recuperación
sin recrear workspace/versión a ciegas.
**Checkpoint histórico 14/10 y alta de fuentes:**
[release 14/10](../../../docs/audits/releases/2026-10-14-scalable-measurement-agent-first-release.md),
PR255/main `9690efad`, orquestador success y manifest released. Server **9** estricto schema 2;
Web **5** sin cambios. Sólo customTemplate30 cambió en el Server; pixel708931297255942,
tag Meta6, tag GA4 18 y demás entidades preservados. Versiones6/7/8 son checkpoints históricos,
no instrucciones para restaurar el Client ni reactivar triggers legacy.

La autoridad de matching es la política publicada server-only: fuente estable, versión,
surface/origen, mapping tipado y destinos independientes. No hay lista fija de formularios o
schedulers en `payload.ts` ni en el Client. Para un alta compatible usar API/panel/CLI sin código,
release ni publish GTM adicional; una versión nueva exige revisar/publicar datos. Un nuevo tipo
de campo, proveedor/evento/comportamiento u host fuera de los dos aprobados requiere su cambio
gobernado. GA4 genérico por sí solo no autoriza publicidad. La
[propuesta anterior](../../../docs/architecture/GREENHOUSE_GROWTH_MEASUREMENT_CONFIGURATION_PROPOSAL_V1.md)
fue formalizada por el [ADR aceptado](../../../docs/architecture/GREENHOUSE_GROWTH_MEASUREMENT_POLICY_DECISION_V1.md).

Se verificó una fuente creada después del release, operada por CLI y recibida en Test Events,
con main/deployment/Server/template/tags iguales antes y después; fixture desactivada y archivada.
Captura y destinos/retención están ON según el ledger del release; no inferirlo para otra fecha.
GA4 UPD/ack, audiencias y Ads link conservan su evidencia previa en el
[dossier 13/10](../../../docs/audits/releases/2026-10-13-full-develop-matching-release.md).
No se hicieron nuevas pruebas sintéticas Google ni se amplió alcance CRO/newsletter/CRM.

No asumir serving, matching efectivo ni atribución deduplicada por Processed. Google Signals
no es prerrequisito de UPD. Respetar la restricción shared workspace antes del release.

Verificado 2026-10-13: hosting del mismo `GTM-K2X4ZTTK` recuperado en `efeonce-group`,
tagging + preview min 0/max 1, 1CPU/512MiB, instance-based; `/healthy` 200 y Preview funcional.
En ese corte histórico GTM Web **5**/Server **6** estaban publicados; el readback 14/10 posterior
fijó Server 9 y el checkpoint 18/10 fijó Web 6/Server 10; al 23/10 Web está en **10** y Server sigue en 10. HubSpot categoría opt-in y
routing WP/Think activos. Test Events Server procesados y PageView real completó ambos destinos.
Primera conversión comercial y reconciliación pendientes en ese corte; esto no autoriza replay.
Ver estado/URLs en la auditoría.
Cargar `09-hubspot-consent.md`: API banner `_hsp`, boolean categories, nunca legacy `allowed`
ni `_hsq`. Default inline denied antes de tags; analítica no concede Meta, GPC bloquea publicidad.
PV explícito una vez/destino: `meta_only` gatea GA4, `meta_capi_page_view` + UUID gatean Meta.
Forwarding GA4 gatea consentimiento nativo `x-ga-gcs` con `^G1[01]1$`; custom analytics_consent
no está en todos los eventos automáticos y no sirve como único gate. Unknown/denied bloquea.
SDK GA4 transporta `event_id` como **evnid**, Client normaliza a event_id: no concluir ID
ausente por buscar sólo ep.event_id. Retirar Test Events code antes del publish/readback.
SoT bridge `scripts/measurement/hubspot-consent-bridge.js`; WP/Think copias byte-idénticas.
Preferencias de cookies = control de texto integrado al pie legal; nunca franja/CTA
independiente debajo del sitio. Probar acceso móvil sin superposición del CTA de reuniones.
En Think (desde 2026-10-16) el botón `[data-efeonce-cookie-settings]` se monta SOLO en un host declarado
`[data-efeonce-legal-links]` o junto al enlace de privacidad del footer; ya no se pega al último `<footer>`.
Página nueva con footer en Think = declarar su fila legal; sin host declarado no hay botón (el banner sí aparece).
Presentación La órbita autorizada 13/10: adapter CSS/JS sobre controles HubSpot, sin CMP ni
persistencia nueva. Canon `scripts/measurement/hubspot-consent-ui.*` + builder; ambos hosts
distribuyen assets idénticos y sólo en rutas con medición. No reemplazar los hijos que administra
el renderer nativo ni llamar `setHubSpotConsent` para este diseño. Revalidar selectores, categorías,
reapertura, retiro, GPC y a11y al tocarlo; [rollout](../../../docs/audits/measurement/CONSENT_UI_ROLLOUT_2026-10-13.md).
Procedimiento de UI: [manual operativo](../../../docs/manual-de-uso/growth/operar-consentimiento-cookies-publico.md).
`node scripts/measurement/verify-hubspot-consent-ui.mjs --inject-local` revisa antes de publicar;
`--live` consume assets publicados. Ambos interceptan `/g/collect` con 204: prueban UI/gates,
no entrega Meta Server ni GA4. El PASS visual no cierra la primera conversión comercial pendiente.
Conservar rutas Think `analytics=false` sin tracking/banner/UI; no usar el prototipo como CMP.
Revalidar GPC por separado: el proveedor puede resolver denegación y omitir el aviso nativo.
Builder genera ambos consumidores con tokens/fonts/licencias y hashes; no editar distribuciones.
El manual reúne procedencia, QA, publicación acotada, rollback e historia de acceso CLI.
Revalidar la sesión antes de operar; un fallo histórico no prueba que siga vencida. No ejecutar
Vercel ni rotar credenciales por un cierre documental.
Gates: **no usar regex `.+` para validar event_id**: acepta missing/`undefined` como string.
Exigir UUID anclado y probar ausente + literal `undefined`; una prueba sintética alcanzó Meta
antes de corregirlo. Positivos sólo con `test_event_code` real verificado; nunca un código inventado.
Routing Think no cubre Site Kit en WordPress: inspeccionar el emisor/config inicial de cada host.
Forwarding GA4 oficial server usa `sgtmgaaw`/`measurementId`, no la shape web `gaawe`.
Sanear URL por destino: Regex Table server `remm` + transformación `tf_augment_event` sólo
Meta; excluir referrer/controles con `tf_exclude_params`. UI rechaza literal vacío en aumento;
excluir el campo. Validar variables y luego payload positivo Test Events; no igualar ambos.
6. Workspaces aislados por contenedor; presentar diff/QA/rollback antes de publicar.
   Documentación no autoriza provisionar cloud/DNS/IAM, rotar secretos ni enviar canaries.

## Contexto Lead — corrección 14/10/2026

Cargar [auditoría](../../../docs/audits/measurement/META_LEAD_VISITOR_CONTEXT_2026-10-14.md) y runtime10.
Server 9 final estricto schema 2: sólo template30 cambia; no editar tags ajenos ni fijar
testEventCode. Visitor-request captura XFF/IP real y UA en POST Forms/Meetings, snapshot cifrado; nunca worker IP/UA.
Bridge conserva _fbp/_fbc y landing fbclid sólo tras ads grant (cookies90d + session fallback);
revocación/GPC limpia, sin IDs en GA4/dataLayer. external_id = SHA256 del email normalizado,
fallback teléfono internacional, nunca submissionId. Meta pasa los campos disponibles sin rehash
adicional: email lowercase sin whitespace, teléfono internacional sólo dígitos, nombres
NFKC/lowercase sin espacios/puntuación/símbolos y SHA-256 hex. No inventar teléfono cuando la
fuente no lo mapea; IP/UA/fbp/fbc son raw. La prueba de política viaja sólo en el ingreso
autenticado schema 2 y se retira antes del tag; schema 1 falla cerrado. Mantener
`action_source=website`, URL real limpia, tiempo UNIX/UUID estable.
verify-lead-context.ts requiere META_TEST_EVENT_CODE real temporal por request; Preview y live
Test Events procesados Server/website ambos hosts, nueve claves en agenda/fuente nueva y ocho
en Think sin teléfono mapeado. Denegado/identidad raw/schema 1 rechazados sin evento. No confundir
ACK/Processed con EMQ, remarketing elegible o primera conversión comercial real. No usar el
dataset normal para pruebas ni guardar el código temporal en fuente/env/tag de producción.

## Canonical coordinates (Efeonce)

| Recurso | Valor |
|---|---|
| GTM contenedor **web** live | `GTM-NGHPGRLZ` · account `6291647045` · container `218104216` · workspace **Default (id=2)** |
| GTM Google tag (config) actual | type `googtag`, `tagId=G-KYPPY57M14` (firing All Pages) |
| GA4 propiedad | `efeoncepro.com` · propertyId `486264460` · account GA4 `252968286` |
| Hosts medidos (misma propiedad) | `efeoncepro.com` (page_view vía Site Kit) + `think.efeoncepro.com` (page_view vía GA4 Config gateado por hostname en el container; snippet GTM en `efeonce-think` repo). Subdominio = mismo stream, funnel unificado. |
| Google tag del sitio (Site Kit) | `GT-KV5CNNKQ` (separado del GTM) |
| Service account | `greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com` |
| Clientes de código | `src/lib/growth/gtm/api-client.ts` (`GtmApiClient`) · `src/lib/growth/ga4/api-client.ts` |
| Verificar en vivo | `scripts/ga4/realtime-events.ts 486264460` · `scripts/gtm/verify-connection.ts` |

> **⚠️ Verificar SIEMPRE el Measurement ID destino.** El sitio tiene DOS ids GA4-ish (`G-KYPPY57M14` en el GTM, `GT-KV5CNNKQ` de Site Kit). Antes de crear un GA4 Event tag, confirmar **qué measurement ID pertenece a la propiedad `486264460`** por la Admin API (`properties/486264460/dataStreams`) — si mandas al id equivocado, el evento no aparece en la propiedad que medimos. Ver `docs/reference/measurement-gtm-ga4/07-ga4-admin-api-ops.md`.

## Metodología — cómo decidir el camino (árbol de decisión)

Ante una tarea de medición, seguir este árbol; NO improvisar el camino:

1. **¿Qué se quiere medir?** submit de form · click de CTA · vista · conversión.
2. **¿El evento ya se emite al dataLayer?** Resolver su SoT antes de taggear: Forms `gh_form_*`
   (`src/lib/growth/forms/contracts.ts`); CTA engine `greenhouse_cta_*`
   (`src/lib/growth/ctas/contracts.ts`); rail CTA legacy `gh_cta_clicked` (no renombrar); meetings
   `gh_meeting_step_reached|gh_meeting_booking_confirmed` (`src/lib/growth/meetings/contracts.ts`).
   Cromo del sitio efeoncepro.com (lo emiten scripts del host WordPress, no Greenhouse): menú `gh_site_nav_opened`
   (panel), `gh_site_nav_line_viewed` (línea) y `gh_site_nav_clicked` (`target_type`/`target`; el CTA viaja como
   `target_type: cta`, `target: menu_header|menu_mega|menu_onepage`, y su agendador mide por `greenhouse_cta_*` con
   `cta_location: site_nav`; `site_nav_cta` no se emite) desde `ohio-child/assets/js/site-nav-host.js`, y dock de
   landings `gh_landing_dock_clicked` con `target_type`/`target` (`eo-landing-dock/assets/js/landing-dock-host.js`,
   TASK-2043) con además `target_label` y `target_url`. El dock **sí está registrado** (GTM versión 8, 2026-10-23,
   `scripts/gtm/build-landing-dock-events-workspace.ts`; dimensiones GA4 `target_type`/`target`/`target_label`/`target_url`);
   `gh_site_nav_*` también (GTM versión 9; desde la 10 el clic suma `target_label`/`target_url`; `scripts/gtm/build-site-nav-events-workspace.ts` actualiza un tag existente si cambian sus parámetros; dimensiones `panel`/`line`). Verificar con visita simulada: ver LEARNINGS 2026-10-23 (service worker + agente de usuario). El agendador abierto desde el dock mide por `greenhouse_cta_*` con
   `cta_location: landing_dock` (reemplaza `inbound_mobile_dock` y `hubspot_mobile_dock`).
   Verificar el renderer y el dataLayer; GTM no inventa eventos ausentes.
3. **¿Existe un evento recomendado GA4 que calce?** (lead → `generate_lead`; signup → `sign_up`). Sí → usar ese verbatim (hereda key events/predictivos). No → custom `gh_<object>_<action>`. Regla completa: doc `04`.
4. **¿Ya hay un tag genérico que lo cubra?** Un solo GA4 Event tag + parámetro de identidad (`form_slug`) cubre N superficies — **reusar antes de crear**. Ver `TRACKING-PLAN.md`.
5. **Construir** con el Workflow gobernado (abajo) usando los shapes verificados del doc `05`.
6. **Verificar** que LLEGA a GA4: verification tiers del doc `06 §3` + **LEARNINGS §7b (consent granted + lag del Data API)**. La prueba dura es el `/g/collect`, la confirmación es el evento en realtime.
7. **Cerrar**: registrar la fila en `TRACKING-PLAN.md` + anotar cualquier gotcha nuevo en `LEARNINGS.md`.

### Auditar la medición de un form ya publicado (dos carriles distintos)

Un form comercial se mide por dos caminos que se auditan por separado; uno sano no prueba el otro:

1. **GA4 (navegador → GTM web → servidor de tagging):** `gh_form_submission_accepted` → `generate_lead` en el
   container web; el forwarding al servidor exige consentimiento de analítica. Se audita con Preview/`/g/collect`
   y realtime, como cualquier evento GA4.
2. **Meta:** el **PageView** sí sale del navegador por server-side (el `event_id` viaja como `evnid` en el hit gtag).
   El **Lead NO sale del navegador**: lo envía el backend Greenhouse por el client «Efeonce backend Lead ingress»
   sólo con consentimiento de publicidad y con una política publicada para ese origen y destinos. Se audita con
   `growth:measurement discover` (política/destinos) + Test Events Server, no con el dataLayer.
3. **Evidencia real:** contar envíos y conversiones registradas antes de afirmar que el Lead funciona de punta a punta.

Caso verificado 2026-10-16 — `think.efeoncepro.com/brand-visibility` (`ai-visibility-grader`): GA4 `generate_lead`
vía GTM OK; Meta PageView server-side verificado; política Lead publicada (origen think, destinos `meta` +
`google_upd`). Sólo 3 envíos históricos (último 2026-07-05) y cero conversiones registradas en ningún form a esa fecha:
**el Lead de punta a punta sigue sin probarse con un envío real**. No reportarlo como verificado.

Diagnóstico "no llega a GA4" → el **diagnostic ladder del doc `06 §6`** (dataLayer → Preview → `/g/collect` → DebugView → realtime; el primer eslabón que rompe nombra la falla).

### Fallback DOM para CTA anidado (cuando no existe `dataLayer`)

Si Preview muestra un `Click Element` interno (`div`, `span`, icono) y `Click URL` vacío, inspeccionar el DOM antes
de cambiar el activador:

- si se quiere medir todo el enlace o toda la tarjeta, usar `Solo enlaces` + `Click URL` y evitar JavaScript;
- si se quiere medir sólo un CTA dentro del enlace, usar `Todos los elementos` + un selector CSS acotado al CTA y
  una Custom JavaScript mínima que busque `closest('a[href]')` y retorne su `href` con guards explícitos;
- la variable debe ser pura y sin efectos laterales; si `Click URL` ya contiene el destino, no crearla;
- preferir siempre un evento semántico de la aplicación en `dataLayer` cuando se controla el renderer;
- verificar al menos las variantes DOM positivas y un clic negativo ajeno al CTA.

Un tag genérico con `destination_url` cubre N productos; no crear un tag por producto. Caso verificado, selector y
función compatibles con GTM ES5: `docs/reference/measurement-gtm-ga4/LEARNINGS.md` → “CTA anidado en una tarjeta
enlazada”.

## Hard Rules (acción gobernada)

- **SIEMPRE leer `docs/reference/measurement-gtm-ga4/LEARNINGS.md` + el doc `05` (shapes) ANTES de construir un tag.** Los gotchas verificados (`measurementIdOverride` no tagReference, scope `quick_preview`, consent en verificación, branch-from-version) evitan repetir errores ya pagados.
- **NUNCA publicar a `GTM-NGHPGRLZ` sin (a) preview/Tag Assistant, (b) confirmación humana explícita en el turno.** Construir en el **workspace** es seguro (no toca el sitio); `create_version` + `publish` es la ÚNICA mutación live y requiere OK. Si lo opera un agente, es `propose → confirm → execute` (el humano confirma antes del publish).
- **NUNCA hand-writear el bloque `gaawe` de memoria a ciegas.** Usar las plantillas verificadas de `docs/reference/measurement-gtm-ga4/05-gtm-api-v2-tag-shapes.md`; la API valida al crear en el workspace (un shape malo falla en el `POST`, no en producción) — crear, hacer `GET` de vuelta, confirmar shape.
- **NUNCA taggear el contenedor equivocado.** Para la web, `GTM-NGHPGRLZ` (218104216); `GTM-NS3RNNCD` es un duplicado huérfano. Para CAPI, elegir el contenedor `usageContext=server` del inventario; no aplicar coordenadas web al carril servidor. Publicar server también requiere preview y aprobación explícita; provisioning cloud/secrets son mutaciones separadas.
- **NUNCA un token/secreto literal en un parámetro GTM** (web o servidor). El snapshot lo tapa en git, pero queda visible para quien lea el container. Pendiente conocido: token Meta CAPI del tag servidor (ver «Drift de los dos containers»).
- **SIEMPRE tras un publish** (script o UI): `pnpm gtm:snapshot` + commitear los dos JSON con el cambio.
- **SIEMPRE registrar en `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`** el estado de tagging del form/CTA (obligación espejada en la skill `greenhouse-growth-forms`).
- **NUNCA PII ni valores crudos** en parámetros de eventos (allowlist `src/lib/growth/forms/contracts.ts`); registrar un parámetro como custom dimension en GA4 para poder reportarlo.
- **Preferir el evento recomendado GA4** cuando existe (submit de lead → `generate_lead`, hereda key events/predictivos); custom `gh_` solo cuando no hay equivalente (regla en `docs/reference/measurement-gtm-ga4/04`).
- **Un evento genérico + parámetro de identidad** (`form_slug`), NO un tag por form. Un solo GA4 Event tag cubre todos los forms.
- **NUNCA marcar como key event un click/scroll/view/paso de funnel** (`gh_cta_clicked`, `gh_form_started`, `page_view`…). Key event SOLO para conversiones reales de negocio (`generate_lead`, `sign_up`, `purchase`). Criterio canónico: doc `04 §3b`. (GA4 limita a 30 key events/propiedad — son escasos.)
- **Meetings:** `gh_meeting_step_reached` es funnel custom y nunca key event.
  `gh_meeting_booking_confirmed` sólo existe tras un receipt server-confirmed elegible; GTM lo
  transforma a `generate_lead` con `lead_source=meeting_booking` y NO envía además el custom a GA4.
  El ledger es verdad de conversión; GA4 es mirror a reconciliar.
- **SIEMPRE que se sume un host/sitio nuevo del ecosistema** (subdominio, Astro/WP, microsite) → **instalar el tag GA4** desde su nacimiento: snippet `GTM-NGHPGRLZ` + (si no tiene otra fuente de page_view) GA4 Config gateado por hostname, **misma propiedad `486264460`** (NUNCA stream/propiedad aparte por subdominio propio). Registrar en Tracking Engine §19.5 + verificar sin doble conteo. **Un host sin tag GA4 = superficie incompleta** (mandato §19.2). Cross-repo: rama+PR. En Astro, `is:inline` va SOLO en `<script>`, NUNCA en `<noscript>`.

## Workflow gobernado (crear un tag end-to-end)

1. **Verificar** measurement ID de la propiedad (`486264460`) + que el contenedor correcto está live (`curl efeoncepro.com | grep GTM-`).
2. **Construir en el workspace** (id=2) vía `GtmApiClient`, en orden: **Variables** (`dlv – form_slug`…) → **Trigger** (`CE – gh_form_submission_accepted`) → **GA4 Event tag** (`gaawe`, referencia el `firingTriggerId`). Shapes exactos en `docs/reference/measurement-gtm-ga4/05-gtm-api-v2-tag-shapes.md`.
3. **`GET` de vuelta** cada recurso creado → confirmar shape/fingerprint. **Preview** (Tag Assistant) sobre el sitio.
4. **Confirmar con el humano** el diff antes de publicar.
5. **`create_version`** (nombre + notas) → **`publish`**. Registrar la fila en el TRACKING-PLAN.
6. **Verificar**: `scripts/ga4/realtime-events.ts 486264460` → enviar el evento en el sitio → confirmar que aparece (`generate_lead`, con `form_slug` como parámetro/custom dimension).
7. **GA4 Admin**: marcar `generate_lead` como key event + registrar `form_slug`/`form_kind`/`surface_id` como custom dimensions (`docs/reference/measurement-gtm-ga4/07-ga4-admin-api-ops.md`).

## Capa de robustez (comandos — NO despliegan)

Estrategia de deployment: **build agéntico primario + capa delgada** (ADR `GREENHOUSE_MEASUREMENT_TAGGING_DEPLOYMENT_DECISION_V1` — NO IaC declarativo; GTM no mergea). Comandos:

- **`pnpm gtm:snapshot`** — exporta el config live de los DOS containers (web `container-snapshot.json` + servidor `server-container-snapshot.json`, en `docs/reference/measurement-gtm-ga4/`) con secretos tapados por huella sha256. **Correr tras cada publish** y commitear (el publish por script ya lo hace). `pnpm gtm:snapshot --check` = drift live vs commiteado, exit 1; lo corre a diario `.github/workflows/gtm-drift.yml`. Detalle abajo.
- **`pnpm measurement:smoke`** — verifica EN VIVO que la medición funciona en los hosts/eventos clave (Playwright `/g/collect`: page_view en efeoncepro.com + think, generate_lead en submit). Atrapa regresiones (Site Kit, drift, consent).
- **`pnpm growth:forms-tracking-audit`** — forms published+active de la DB vs `TRACKING-PLAN.md`; lista los live sin fila (drift del registro).
- **Cromo del sitio** — `scripts/gtm/build-landing-dock-events-workspace.ts` (dock) y `scripts/gtm/build-site-nav-events-workspace.ts`
  (menú; actualiza con PUT+fingerprint un tag existente si cambian sus parámetros): sin `--publish` arman y compilan el
  workspace (quick_preview); con `--publish` versionan, publican y reescriben ambos snapshots. Verificar con visita
  simulada en Playwright (banner HubSpot sólo analítica; GA4 envía por service worker → `context.on('request')`;
  `--user-agent` sin `HeadlessChrome` o GA4 lo filtra como bot): receta en LEARNINGS 2026-10-23.

### Drift de los dos containers (verificado 2026-10-16)

- **Qué versiona:** web `GTM-NGHPGRLZ` → `container-snapshot.json`; servidor `GTM-K2X4ZTTK` (sGTM, Meta CAPI) →
  `server-container-snapshot.json` (antes el servidor nunca se había versionado). Incluye tags, triggers,
  variables, clients, transformations y huella sha256 del código de cada plantilla.
- **Secretos tapados antes de escribir:** un parámetro con nombre sensible (token/secret/password/apiKey/
  accessKey/credential/privateKey) o con valor con forma de credencial (`EAA…`, `sk-…`, `AIza…`, `ya29.…`) queda
  `[redacted sha256:<12 hex>]`. Una rotación se ve como drift sin exponer el valor; `{{variable}}` se conserva.
  Lógica pura + tests en `scripts/gtm/snapshot-lib.ts`.
- **`--check`:** compara ambos containers live contra lo commiteado; exit 1 con resumen `+`/`−`/`~` por colección.
- **`gtm-drift.yml`:** diario 12:00 UTC + disparo manual; **la falla es la alerta**. Autentica por WIF directa como
  `greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com` (`GTM_SNAPSHOT_DIRECT_AUTH=1`, scope
  `tagmanager.readonly`; `roles/iam.workloadIdentityUser` del repo concedido 2026-10-16). Corre desde `main`: se
  activa con el próximo release y al 2026-10-16 todavía no había corrido; no afirmar que vigila hasta ver su primera corrida.
- **Regla post-publish:** tras CUALQUIER publish —por script o en la UI de GTM, web o servidor— correr
  `pnpm gtm:snapshot` y commitear ambos JSON junto con el cambio. `scripts/gtm/build-cta-events-workspace.ts --publish`
  ya reescribe los snapshots: commitearlos en el mismo commit.
- **Si `gtm-drift` falla:** decidir si el cambio live fue intencional → regenerar con `pnpm gtm:snapshot` y commitear;
  si no lo fue → revertir en GTM (versión anterior) con el flujo gobernado. Nunca "arreglar" el JSON a mano.

**Pendiente (decisión del operador: no se hace aún):** el token de Meta CAPI sigue **literal** en el tag del container
servidor. En git queda tapado, pero cualquiera con lectura del container en GTM lo ve. Propuesta no implementada: rotarlo
en Meta Business Manager → Secret Manager → variable «Firestore Lookup» del sGTM leída sólo por la SA del Cloud Run de
tagging; después, que el chequeo falle si un parámetro trae un valor con forma de token. Hasta entonces:
**NUNCA pegar un token o secreto literal en un parámetro GTM nuevo** (web o servidor), ni copiar su valor a docs, chat o logs.

Escalar a pipeline declarativo SOLO si: tags custom no-genéricos explotan / humanos click-opsean el container / N containers de clientes (ADR §"Cuándo revisitar").

## References

Todo el conocimiento vive en la carpeta canónica `docs/reference/measurement-gtm-ga4/` (una sola copia — la leen Claude, Codex, humanos y Nexa). Esta skill NO duplica; apunta:

| Doc | Qué trae |
|---|---|
| **`LEARNINGS.md`** | **Leer ANTES de construir.** Build-log de aprendizajes reales en runtime (gotchas verificados: `measurementIdOverride`, scope de `quick_preview`, branch-from-version, propagación CDN, verificación `/g/collect`). |
| `05-gtm-api-v2-tag-shapes.md` | **JSON copy-pasteable de la API v2**: `gaawe` (GA4 Event tag — `measurementIdOverride`/`measurementId` tagReference + `eventSettingsTable`), `googtag`, `customEvent` trigger, `v` (DLV), constant/lookup/CJS, built-in vars, workflow versions/publish, quotas/fingerprint. **La plantilla exacta para no adivinar.** |
| `06-gtm-tagging-as-code-and-ops.md` | Container-as-code, deploy seguro (workspace→preview→staging→publish→rollback), verification tiers (Playwright `/g/collect`), gobernanza/permisos, sGTM, diagnostic ladder "event not showing in GA4". |
| `08-meta-conversions-api-server-side.md` | Meta CAPI vía GTM Server: inventario, contrato, consentimiento, ingress, secretos, dedupe y readback Meta. |
| `07-ga4-admin-api-ops.md` | GA4 Admin API: data streams (resolver measurement ID de `486264460`), custom dimensions, key events, MP secrets, access bindings; blueprint lead-gen. |
| `04-greenhouse-gh-event-convention.md` | House style `gh_`, regla GA4-recomendado vs custom, coordenadas. |
| `01/02/03` | Conocimiento base: GA4 event model · GTM/dataLayer · taxonomía de naming. |
| `TRACKING-PLAN.md` | Registro obligatorio de forms/CTAs + su estado de tagging. |

## Sinergias (cómo compone con las demás skills)

- **`growth-marketing-cro`** (dueña del reference) → conocimiento de medición, naming, estrategia de conversión. Este operador *ejecuta* lo que esa skill *decide*.
- **`greenhouse-growth-forms`** → fuente de los eventos `gh_form_*` + el TRACKING-PLAN. Un form nuevo llega acá para taggearse.
- **`greenhouse-growth-meetings`** → fuente de `gh_meeting_*`, receipt gate y allowlist sin PII.
  Este operador construye/publica el tagging, pero no decide que una reserva fue confirmada.
- **`efeonce-public-site-wordpress`** → dónde vive el snippet GTM; instalar/verificar el contenedor en el sitio, resolver container-drift.
- **`greenhouse-gvc-playwright`** → verificación en browser real (dataLayer, `/collect`, Tag Assistant) desktop+mobile.
- **`digital-marketing`** → medición de campañas, taxonomía UTM que alimenta los eventos.
- **`greenhouse-secret-hygiene`** → Measurement Protocol API secrets, rotación.
- **`greenhouse-documentation-governor`** → cierre documental (actualizar TRACKING-PLAN + Tracking Engine §19).
- **Full API Parity / Nexa** → los clientes `src/lib/growth/{gtm,ga4}` son el contrato programático; el write path a producción es acción gobernada (`propose → confirm → publish`), el LLM nunca publica directo.

## Published policies: agents and panel share one contract

Use the [policy ADR](../../../docs/architecture/GREENHOUSE_GROWTH_MEASUREMENT_POLICY_DECISION_V1.md)
and [operator manual](../../../docs/manual-de-uso/growth/configurar-medicion-conversiones.md).
The policy binds stable source/version, surface, origin, typed mapping and independent destinations.
Destinations default OFF. Commercial purpose excludes subscribe/application/survey and high-risk
sources; new forms of those kinds are not automatically eligible. Only the two approved HTTPS
hosts are supported. A compatible source/version is enabled by reviewed policy data; a new
behavior, field type, provider, event or host may require code and governed publication.

### Agent operating loop

1. Use the canonical user-bound agent-session from `scripts/playwright-auth-setup.mjs` and a
   private `0600` ignored storage state. Set `GROWTH_MEASUREMENT_BASE_URL` to the exact HTTPS origin
   and `GROWTH_MEASUREMENT_STORAGE_STATE` to that file. Session expiry/denial requires refreshing
   canonical auth; never mint actor/role in JSON or copy cookies to another host/gateway. The
   CLI restricts cookies to that host/session and rejects redirects. Secrets stay out of arguments/logs.
2. Run `pnpm --silent growth:measurement --help`, then `discover`. Structured JSON includes
   `growth-measurement-policy.v1`, effective read/author/publish/disable capabilities, typed
   source fields/versions, blockers and current heads. Client users are denied; a local role
   label or an internal URL does not grant authority.
3. Build a metadata-only command from discovery; no contact values, IP, hashes or JavaScript.
   `validate comando.json` POSTs `{dryRun:true,command}` without draft/audit/conversion writes.
   Validation does not reserve state or publish; execution revalidates fresh server authority.
4. Within existing operator authorization, execute
   `apply comando.json --apply --receipt .auth/recibo.json`. Use one UUID per intended command and the discovered current
   `expectedPublishedRevisionId` (including null). Draft→review→publish uses distinct commands
   and keys; disable is separate. Publication is immutable: edits create a new revision.
5. `verify .auth/recibo.json` performs independent GET. Receipt `0600` is reserved before POST and
   the known write receipt is checkpointed before GET. Unknown outcome: retry the exact body,
   key and receipt; known receipt: retry GET only. A409 requires discovery and deliberate new
   authority, never overwrite or key reuse with changed content. The panel shares this client,
   retains unsaved values on conflict/reload and requires readback before success.

All four operations use `pnpm --silent growth:measurement …` (or
`pnpm exec tsx scripts/measurement/policy-cli.ts …`) for clean JSON. Exit 0 is success, 2 invalid, 3 conflict,
4 denied, 5 unavailable during validation, 6 potentially unknown outcome. Keep private receipts
for recovery; never print arbitrary provider errors or credentials.

Operational policy commands need no SQL or browser. They do not create forms, submit/book,
configure HubSpot mappings, write CRM contacts or send provider tests. New source provisioning
still uses its canonical Forms/Meetings commands. Growth Forms→HubSpot Forms→CRM and the
consented measurement projection retain separate mappings, outboxes and evidence. No MCP/Nexa
registration, issuer/OAuth scope expansion or new infrastructure was introduced by this CLI.
Provider delivery and real commercial outcomes require their own readback; CLI success is not
that evidence. Release proofs and pending real traffic/EMQ stay in the linked runtime/audit.


## Google Ads online y EC — contrato y checkpoint 18-10-2026

Cierre vigente: [release Grader/clasificación main2559e9242](../../../docs/audits/releases/2026-10-18-grader-commercial-measurement-production-release.md), manifest released y canarios negativos.
Antes de operar, releer estado real; no repetir correcciones/planes históricos ni crear leads para
completar evidencia. TASK-2034 sigue parcial por recepción/atribución y recibos reales pendientes.

Cargar [contrato/activación](../../../docs/manual-de-uso/growth/activar-conversiones-google-ads.md),
[arquitectura](../../../docs/architecture/GREENHOUSE_GOOGLE_ADS_MEASUREMENT_ARCHITECTURE_V1.md)
y [evidencia de activación](../../../docs/audits/growth/2026-10-18-google-ads-activation.md).
Recibo Ads postcommit con UUID/key, nunca en dedupe/replay; policy opt-in y flag global default OFF.
Exigir los cuatro permisos Google explícitos y GPC sin veto. Hashes sólo en el canal reservado
`user_data`, con memoria privada ≤10 s; nunca en dataLayer ni telemetría ordinaria. El evento dedicado
`gh_ads_conversion` queda excluido del forwarding GA4. No derivar Ads del `generate_lead` genérico
ni mezclar UPD/Meta. GCLID/GBRAID/WBRAID se observan con consentimiento; no se generan ni se disparan.
El circuito online sigue dependiendo del navegador y no tiene retries backend.

Checkpoint fechado 18/10: Web **6** / Server **10** publicados, Server primero (Web siguió: 7 sign_up Glitch 20/10,
8 dock, 9–10 menú el 23/10; Server sin cambios); EC efectiva ON en
**6862539491**, bridge compatible publicado en WordPress/Think y flag Production true con companion
READY del mismo main liberado. Cobertura ampliada22:57Z:13 formularios comerciales y Discovery
(reserva) con Ads publicado. Son fuentes del sitio, no tipos de campaña Ads. Ambas acciones
siguen secundarias, ONE_PER_CLICK y valor de medición 0 CLP; no se modificaron pujas ni campañas.
Primera ocurrencia real, recepción proveedor y atribución siguen **sin verificar**; protocolo aislado,
negativos, tag fired, un flag o HTTP 200 no sustituyen esa evidencia. Releer estado live antes de operar.
Los drafts Web 8/Server 12 del [corte 17/10](../../../docs/audits/growth/2026-10-17-google-ads-online-conversions.md)
fueron consumidos por la publicación; no reconstruirlos ni reejecutar scripts privados históricos.
`pnpm --silent google-ads conversions bindings` relee IDs/labels saneados; el compilador offline no publica.

### Cobertura comercial por política

El alcance ratificado por el operador es sólo formularios que captan solicitudes comerciales
(contacto, cotización, diagnósticos y briefs elegibles). Excluye ebooks/descargas, newsletter,
postulaciones, soporte, encuestas y fixtures. La intención y `kind` se verifican en la fuente:
no inferir elegibilidad del nombre de la landing ni cambiar una clasificación por SQL directo.
Reutilizar `commercial_lead` y los tags genéricos; no crear un tag por formulario ni hardcodear slugs.
La agenda conserva `meeting_booking`, con confirmación proveedor y política propias.

Para ampliar: descubrir versión/surface/origen/head frescos, validar mapping y elegibilidad,
preservar destinos Meta/UPD y mapping CRM, luego draft→review→publish→readback mediante el comando
canónico dentro del alcance autorizado. El flag global no inscribe nuevas fuentes. Publicar una
versión Forms o cambiar un binding exige revisar la compatibilidad de su política; GA4 tagged no
significa Ads habilitado. La revisión al publicar es hoy un paso del operador, no una autopolicy.

[Publicación de cobertura18/10](../../../docs/audits/growth/2026-10-18-commercial-forms-policy-publication.md):
12 formularios adicionales publicados y verificados,13 Forms comerciales+Discovery activos.
AI Grader tiene intención comercial confirmada por el operador. Contacto es general y queda fueraAds.
Lead Gen Web corregido a quote_request por command/store Forms, preservando identidad y versión;
no se exceptúa globalmente lead_magnet ni se publica el plan viejo. La API nueva de clasificación
está servida en main2559e9242, con auditoría API Platform en la misma transacción que el UPDATE
y commandExecutionId para correlación; usar el [manual](../../../docs/manual-de-uso/growth/corregir-clasificacion-comercial.md).
Canarios negativos de Grader/clasificación PASS, sin leads ficticios ni corrección positiva de prueba.
La política y los canarios no certifican recepción ni atribución de conversiones reales.


Grader: cargar [contrato de transporte](../../../docs/architecture/GROWTH_GRADER_COMMERCIAL_MEASUREMENT_V1.md).
Think vigente usa Forms portátil, no el POST histórico. La fachada histórica reutiliza UUID/versión
publicados, contexto visitante y recibo sólo post-persistencia; duplicados no reemiten. Su publicación
se verifica en la auditoría enlazada. Nunca probarla creando leads ni inferir recepción por CORS/READY.

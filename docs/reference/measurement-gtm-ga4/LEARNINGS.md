# Learnings — build-log operativo de medición (GTM/GA4)

> Registro vivo de **aprendizajes reales** al operar GTM/GA4 en producción para Efeonce. Cada entrada = qué se hizo + qué se aprendió (gotchas verificados en runtime, no teoría). Los agentes que operen medición (skill `greenhouse-gtm-ga4-operator`) deben leer esto antes de construir tags. Complementa los shapes de `05-gtm-api-v2-tag-shapes.md`.

---

## 2026-10-17 — primer Lead comercial consentido: cómo se prueba de verdad

[Evidencia](10-growth-lead-matching-runtime.md#primera-conversión-comercial-consentida--performance-2026-10-17) ·
[manual de QA](../../manual-de-uso/growth/configurar-medicion-conversiones.md#probar-un-formulario-después-de-publicar-su-política).

- **Formulario sin política = Meta sin Lead, aunque GA4 tenga `generate_lead`.** El primer envío
  real de `efeonce-performance-diagnostic` llegó a HubSpot (200) y a GA4 realtime, y Meta no
  recibió nada: sin política publicada el backend nunca encola conversión. Que GA4 vea el lead no
  dice nada del carril Meta; revisar primero que la política del form esté publicada.
- **El dedupe de 60 min invalida un reenvío como prueba.** El form deduplica por
  `dedupe_fingerprint` (form + email con trim y lowercase) y responde `accepted` reutilizando el
  envío anterior: no hay conversión nueva. Tras publicar la política, probar con un alias `+`
  (otro correo; en HubSpot crea otro contacto que hay que archivar) o esperar 60 min.
- **`http_accepted` no es lectura en Meta.** Es el ACK HTTP de la entrega. La lectura del
  proveedor (`ads_get_dataset_stats`) tardó ~1 h: a los 5 min no había dato; a la hora, 1 Lead
  `SERVER_ONLY` en el bloque horario. `server_last_fired_time` también llega tarde. Una lectura
  vacía al rato del envío no es una falla.
- **El dataset real es `708931297255942`.** El pixel `859508457409711` que figura en la doc 02 de
  GTM devuelve «Invalid dataset_id» en la API: no usarlo para leer estadísticas.
- **Publicar una política es configuración, no release.** Las tres políticas del 17/10 salieron
  por la CLI gobernada (discover → validate → apply → review → publish, recibo por paso) con
  `commercialAcceptanceChanged:false` y `crmDestinationChanged:false`, sin deploy.

## 2026-10-16 — drift de GTM con mecanismo, no con promesa

[Snapshot y drift](README.md#snapshot-y-drift-de-los-dos-containers) ·
[token Meta pendiente](08-meta-conversions-api-server-side.md#token-meta-literal-en-el-tag-servidor--pendiente-2026-10-16).

- **Una regla sin ejecutor es una regla apagada.** El ADR de tagging exigía «SIEMPRE correr el
  snapshot tras tocar el container», pero `pnpm gtm:snapshot --check` no corría en CI ni en cron y
  sólo miraba el container web. El container servidor (sGTM, Meta CAPI) nunca se había versionado.
  Ahora el snapshot cubre ambos y `.github/workflows/gtm-drift.yml` lo corre a diario y falla si
  hay drift: la falla es la alerta.
- **Tapar antes de escribir, no después.** Secretos por nombre de parámetro o por forma de valor
  se guardan como huella `[redacted sha256:<12 hex>]`; una rotación aparece como drift sin que el
  valor llegue a git. Las referencias `{{variable}}` no se tapan.
- **Un workflow programado vive en `main`.** Commitear `gtm-drift.yml` en `develop` no lo activa:
  el chequeo corre recién después del release que lo lleve a `main`. Al 16/10 no había corrido.
- **El permiso del job es más amplio que lo que pide.** El job pide sólo `tagmanager.readonly`,
  pero la SA que impersona (WIF, `roles/iam.workloadIdentityUser` concedido al repo) también puede
  publicar. Alternativa de mínimo privilegio estricto, no implementada: SA dedicada de sólo lectura.
- **Montar un control junto al «último footer» rompe la grilla.** En Think, «Preferencias de
  cookies» quedaba suelto abajo a la izquierda; ahora sólo se monta en un host declarado
  (`[data-efeonce-legal-links]`) o junto al enlace de privacidad, y una página sin host no lo
  muestra (el banner sigue apareciendo). [Detalle](09-hubspot-consent.md).

## 2026-10-14 — políticas publicadas y agentes como consumidores de primera clase

[Contrato vigente](10-growth-lead-matching-runtime.md), [API interna](../../api/GREENHOUSE_GROWTH_MEASUREMENT_POLICY_API_V1.md)
y [prueba productiva/release](../../audits/releases/2026-10-14-scalable-measurement-agent-first-release.md).

- **Un seed no es autoridad permanente:** seis Forms y un binding conservan equivalencia inicial.
  La autoridad nueva es policy publicada por identidad estable/versión/surface/origen. Renombrar
  no cambia identidad; publicar versión nueva exige revisar mapping. El Client schema2 no enumera slugs.
- **Agent-first exige contrato y recuperación:** discovery versionado y dry-run de sólo lectura;
  panel/CLI consumen los mismos commands, permisos internos, CAS e idempotencia. Un recibo conocido
  se guarda antes del GET; se reintenta sólo lectura. Outcome desconocido conserva cuerpo y clave.
  No pasar roles/actor en JSON ni escribir SQL para administrar una política.
- **La alta por datos se prueba después del publish:** una fuente creada tras el release se publicó
  mediante CLI y llegó a Meta Test Events manteniendo deployment y Server9 idénticos. Fixture
  desactivada/archivada, readback independiente; no se fabricaron submissions/bookings/contactos CRM.
- **El mapping manda:** un campo businessEmail puede ser email autorizado; una fuente sin teléfono
  no produce ph. La prueba de Think tuvo ocho claves y las de agenda/fuente nueva nueve.
- **IP/UA pertenecen al visitante:** capturarlos en el POST original, no en el worker. Atribución
  consentida persistida y external_id normalizado/hash complementan contactos sin tocar GA4 ordinario.
- **Test Events requiere escucha vigente y prueba temporal:** renovar la pestaña inactiva antes de
  confirmar Processed/Server/website. ACK no basta; no fijar el código en tags ni enviar canaries
  ordinarios al dataset. Recepción sintética tampoco prueba mejora EMQ o tráfico comercial.
- **Server9 es estricto:** compatibilidad schema1 temporal retirada tras convergencia de productores
  y cola. Sólo customTemplate30 cambió; pixel, tags6/18 y Web5 se conservaron. No repetir builders
  históricos de bases antiguas como diagnóstico ni restaurar Server5 con productor schema2 activo.

## 2026-10-13 — recuperación, consentimiento y matching backend (histórico)

[Contrato vigente completo](10-growth-lead-matching-runtime.md), [consentimiento](09-hubspot-consent.md)
y [release completo](../../audits/releases/2026-10-13-full-develop-matching-release.md).
Server6/Web5 publicados, primera conversión comercial consentida post-flip aún no observada.

- **GTM Server es una ejecución alojada:** recuperar el contenedor existente y el proyecto
  canónico antes de crear proyectos; inspeccionar billing/min/max/CPU/RAM. min0 no equivale
  a gratis y una referencia always-on no es una factura real. Matching comparte worker/cron existentes.
- **Dos fuentes, dos identidades:** PageView nace de navegación consentida; Lead de aceptación
  o reserva backend. El UUID browser del antiguo sender no sustituye el UUID durable de la cola.
  Retirar los triggers Meta12/17 en el mismo publish que habilita Client31; no sumar senders.
- **Consentimiento granular:** `_hsp` categories boolean, GPC veto, defaults inline denied.
  Permiso de procesamiento del formulario no concede ads. Form/meeting POST añade contexto
  opcional estricto; ausencia/edad/GPC omiten matching y preservan la acción comercial.
- **GA4 mantiene un mirror:** forwarding server restringido a Client Name=GA4; el Client
  backend `generate_lead` no se reenvía. Google MP entrega user_data top-level **sin events**,
  con client_id real + analytics/ads. UPD habilitado no prueba audiencia utilizable ni serving.
- **Templates GTM no son JavaScript estándar:** sandbox sin RegExp literals; usar String.match.
  Meta pin espera custom_properties como JSON string y hashes64hex sin appendixSDK.
  Normalización Meta/Google difiere en teléfono (+E.164 Google) y puntos Gmail.
- **Recepción no es atribución:** Meta callback success/HTTP2xx se guarda como http_accepted,
  Processed se comprueba por separado. Retry conserva event_id/tiempo; replay en Test Events
  no prueba deduplicación de atribución. No fabricar bookings/submissions/CRM para comprobarlo.
- **Publicar artefacto verificado:** create_version consume workspace. Congelar/verificar
  Client/template/tag/forwarding antes de publish y recuperar recibo si hay fallo; no recrear
  a ciegas. Orden: SQL+refs → Client y retiro legacy → worker destinos/retención → captura
  Vercel última con redeploy y alias READY. Repo vars y revisión live se mantienen juntas.
- **Rollback conserva limpieza:** captura/senders OFF, retención ON, key/ciphertext48h, SQL
  aditivo. El cifrado no reemplaza consentimiento y los hashes no dejan de ser datos personales.
- **Al corte13/10, escalabilidad pendiente (resuelta14/10):** backend y Client sGTM enumeran seis forms y un binding
  de calendario. Publicar otro formulario no habilita matching automáticamente; configuración
  administrable era una [propuesta](../../architecture/GREENHOUSE_GROWTH_MEASUREMENT_CONFIGURATION_PROPOSAL_V1.md),
  sustituida por el ADR de políticas Accepted y el cierre14/10 anterior.

## 2026-08-20 — CTA anidado en una tarjeta enlazada: `Click URL` vacío no significa que no exista destino

**Qué:** en el sitio cliente Berel, el CTA visible `Conoce más` no tiene una sola forma DOM. En las tarjetas de
producto es un `<div class="... btn ...">` dentro de un `<a href="/productos/…">`; en otra superficie el propio
`<a>` tiene la clase `btn`. Con un activador `Clic - Todos los elementos`, GTM reportó el `<div>` como
`Click Element` y dejó `Click URL` vacío, aunque el navegador sí navegó al producto.

- **No cambiar a `Solo enlaces` a ciegas.** Ese activador sirve cuando la intención es medir todo el enlace o toda
  la tarjeta. En este caso habría contado también clics en imagen, título y contenido, no sólo el CTA.
- **Fallback preciso cuando no existe un evento de negocio en `dataLayer`:** usar `Todos los elementos`, filtrar
  `Click Element` con un selector CSS que cubra tanto el enlace-botón como el botón anidado, y derivar el destino
  desde el ancestro enlazado más cercano:

  ```js
  function() {
    var el = {{Click Element}};
    if (!el) return;
    var link = el.closest ? el.closest('a[href]') : null;
    return link ? link.href : undefined;
  }
  ```

  Selector verificado para esta familia de productos:

  ```css
  a[href*="/productos/"].btn,
  a[href*="/productos/"].btn *,
  a[href*="/productos/"] .btn,
  a[href*="/productos/"] .btn *
  ```

- **La variable Custom JavaScript es un adaptador DOM mínimo, no un segundo sistema de tracking.** Debe ser pura,
  sin red, storage ni efectos laterales; sólo inspecciona `{{Click Element}}`, retorna `undefined` si no encuentra
  un enlace y alimenta un parámetro como `destination_url`. Si la variable integrada `Click URL` ya trae el valor,
  no crear este fallback.
- **Un solo tag genérico, no uno por producto.** El evento mantiene un nombre estable y diferencia el producto con
  `destination_url`. Si el parámetro se usará en reportes o exploraciones, registrarlo como dimensión personalizada
  con alcance de evento en GA4.
- **Orden de preferencia:** evento semántico emitido por la aplicación al `dataLayer` → `Solo enlaces` + `Click URL`
  cuando se quiere medir todo el enlace → `Todos los elementos` + selector preciso + `closest('a[href]')` cuando se
  necesita aislar un CTA anidado en HTML que no controlamos.
- **Verificación proporcional:** Tag Assistant confirmó el tag en tres destinos y en ambas formas DOM (botón
  anidado y `<a class="btn">`), con `destination_url` evaluado correctamente; un clic de navegación ajeno quedó con
  `Etiquetas activadas: Ninguna`. La prueba negativa evita que el selector termine midiendo toda la tarjeta o todo
  `/productos/`.

## 2026-07-18 — CTA engine en WordPress (TASK-1427): evidencia E2E + estado real del consent

**Qué:** primera verificación E2E del motor Growth CTA en el host WordPress (página de prueba `efeoncepro.com/greenhouse-cta-prueba/`, decisión del operador: test page antes del placement amplio). Desktop 1440: `greenhouse_cta_viewed/clicked/form_opened` en dataLayer + los 3 saliendo por `/g/collect` a `G-KYPPY57M14` + ingest server 202 + ledger `browser_reported/accepted`. Mobile 390: `viewed` completo. Forja con embed key inválida → `403 surface_unauthorized`.

- **⚠️ Ninguno de los dos hosts tiene consent gating real.** La asserción "consent-denied ⇒ no `/g/collect`" NO es ejercitable hoy: ni efeoncepro.com ni think.efeoncepro.com tienen CMP ni consent mode defaults, así que los tags GA4 disparan sin interacción de consentimiento (verificado con Playwright sin aceptar/conceder nada: los `greenhouse_cta_*` salieron igual por `/g/collect` en ambos hosts). Es la postura **pre-existente de medición del sitio completo** (Site Kit page_view incluido), no algo que el CTA introdujo. Si algún día se instala CMP/consent defaults, re-verificar la familia `greenhouse_cta_*` bajo denied (esperado: modelado, fuera de realtime — §7b).
- **Batching del cliente GA4:** en sesiones cortas, `clicked`/`form_opened` pueden salir en un batch posterior o en el flush de pagehide — un listener que cierra el browser ~3s tras el click puede capturar solo `viewed`. No concluir "el tag no disparó" sin esperar el flush (o mirar el POST body del batch, que lleva varios `en=` por request).
- **El ingest del renderer también batchea:** el POST a `/api/public/growth/ctas/events` del `viewed` puede salir en el flush de pagehide (keepalive); en la sesión desktop los 2 requests capturados fueron `clicked`+`form_opened`. El ledger es la verdad (los eventos aparecen como filas `browser_reported/accepted` con su `page_uri`).

**Patrón reusable:** para verificar un host nuevo del CTA engine → página de prueba noindex + Playwright directo (dataLayer + `/g/collect` + ingest statuses + ledger PG) + forja 403. Scripts: `scripts/growth/_sanity-task1427-wp-live.mjs` / `_sanity-task1427-consent-denied.mjs`.

## 2026-07-07 — Tagging de think.efeoncepro.com (subdominio, propiedad unificada, sin doble conteo)

**Qué:** medir `think.efeoncepro.com` (hub Astro, repo `efeonce-think`) con la **MISMA propiedad GA4** (`486264460` / `G-KYPPY57M14`) que efeoncepro.com — funnel unificado (subdominio = mismo stream; NO crear stream/propiedad aparte).

- **Snippet:** instalar el container `GTM-NGHPGRLZ` (head + noscript) en `src/layouts/BaseLayout.astro` de `efeonce-think`. **Cross-repo → rama + PR** (`efeonce-think#10`), NUNCA push directo a `main` (auto-deploy Vercel); merge tras preview verde.
- **page_view sin doble conteo:** el sitio WP ya hace page_view por **Site Kit** (`GT-KV5CNNKQ`). Si se pone un GA4 Config global en el container, **duplica**. Solución: **GA4 Config (`googtag`) gateado por hostname** — trigger `pageview` con filtro `{{Page Hostname}} equals think.efeoncepro.com`. Así dispara SOLO en think; en efeoncepro.com no (Site Kit sigue siendo la única fuente). Verificado: efeoncepro.com = 1 page_view a G-KYPPY57M14; think = 1 page_view a G-KYPPY57M14.
- **El `googtag` mide todo solo:** page_view + session_start + user_engagement + Enhanced Measurement (scroll/outbound/etc.) automáticamente. Enhanced Measurement es config **a nivel de stream** → think hereda los toggles del mismo stream, cero config por evento.
- **Conversiones gratis:** el form dock de think usa `<greenhouse-form>` (renderer gobernado) que ya emite `gh_form_submission_accepted` → el tag genérico `generate_lead` funciona en think por construcción, sin tocar nada.
- Container v3 publicado (generate_lead + GA4 Config think). Verificado con Playwright (`/g/collect en=page_view tid=G-KYPPY57M14` en think; sin doble conteo en WP).

- **Gotcha Astro (`is:inline`):** el snippet GTM en Astro va con `is:inline` SOLO en el `<script>` del loader (correcto/necesario — evita que Astro lo bundlee). En el `<noscript>` **NO** (`is:inline` es directiva para `<script>`/`<style>`; en `<noscript>` no aplica y Astro 7 estricto puede colarla como atributo extraño). Copilot lo flageó en el PR; validado con skills `astro` + `arch-architect` (fix PR #11). Regla: `is:inline` solo en `<script>`/`<style>`.

**Patrón reusable:** para sumar cualquier subdominio/host propio a la misma propiedad → snippet GTM en ese host + GA4 Config gateado por hostname en el container (si el host no tiene ya otra fuente de page_view). Un solo container, una sola propiedad, cero doble conteo. Cross-repo → rama+PR (NUNCA push directo a main con auto-deploy). Es el **mandato §19.2/§19.5 del Tracking Engine**: todo host nuevo nace con el tag GA4.

## 2026-07-07 — Primer tag productivo: `generate_lead` para todos los Growth Forms

**Qué se construyó (por API v2, gobernado):** un pipeline **genérico** que capta el submit confirmado de CUALQUIER form y lo manda a GA4 como `generate_lead`, distinguiendo el form por parámetro.

- Contenedor `GTM-NGHPGRLZ` (account 6291647045, container 218104216), workspace nuevo `forms-generate-lead` (id=3):
  - Variables `DLV - form_slug`, `DLV - form_kind`, `DLV - surface_id` (type `v`, dataLayerVersion=2).
  - Trigger `CE - gh_form_submission_accepted` (type `customEvent`, equals `{{_event}}`).
  - Tag `GA4 Event - generate_lead` (type `gaawe`, `measurementIdOverride=G-KYPPY57M14`, `eventSettingsTable` con los 3 params, firing=trigger).
- Publicado como versión **v2** ("Growth forms → generate_lead").
- GA4 (property `486264460`): custom dimensions `form_slug`/`form_kind`/`surface_id` (EVENT-scoped) + key event `generate_lead` (ONCE_PER_EVENT).
- **Verificado:** Playwright sobre `efeoncepro.com` empujó `gh_form_submission_accepted` → se capturó el request `/g/collect?...tid=G-KYPPY57M14&en=generate_lead` saliendo del browser. Sin enviar un form real (cero lead en HubSpot).

### Gotchas verificados (los que costaron)

1. **`gaawe` exige `measurementIdOverride` (G-ID literal), NO basta el `measurementId` tagReference.** Crear el tag con `{type:tagReference, key:measurementId, value:"GA4 - Tag"}` devolvió `400 vendorTemplate.parameter.measurementIdOverride: The value must not be empty`. Fix: `{type:template, key:measurementIdOverride, value:"G-KYPPY57M14"}`. → Resolver el G-ID de la propiedad ANTES (GA4 Admin `dataStreams`) y usar el override.

2. **`quick_preview` necesita scope `tagmanager.edit.containerversions`**, no solo `edit.containers`. Con solo `edit.containers` → `403 ACCESS_TOKEN_SCOPE_INSUFFICIENT`. Crear tags/vars/triggers sí funciona con `edit.containers`; compilar/versionar necesita `edit.containerversions`; publicar necesita `publish`. Mintear el token con los 3 scopes para un flujo completo.

3. **Un workspace creado por API branchea de la última VERSIÓN PUBLICADA, no del Default Workspace.** El Default Workspace (id=2) tenía borradores `GA4 - Tag`/`html` **nunca publicados**. La última versión live era **v1 "Empty Container"** (0 tags). Por eso publicar mi workspace no borró nada live — pero **SIEMPRE verificar la versión live post-publish** (`versions:live`) para confirmar que no se cayó nada. (Susto real: el print del publish mostró 1 tag; la verificación confirmó que v1 estaba vacía y Site Kit hace el page_view.)

4. **El page_view del sitio lo hace Site Kit (`GT-KV5CNNKQ`), independiente del contenedor GTM.** El contenedor `GTM-NGHPGRLZ` estaba **vacío** (solo cargaba el snippet). Ojo: si algún día se publica un GA4 Config/Google tag DENTRO del GTM, **duplicaría** el page_view de Site Kit. La página también carga `AW-16796059774` (Google Ads) → un Ads conversion se puede colgar de `generate_lead` a futuro.

5. **Propagación CDN de `gtm.js`: minutos, no segundos.** Tras publicar, la primera prueba Playwright NO vio el `generate_lead` (el edge servía la versión vieja). Verificar propagación con `curl "https://www.googletagmanager.com/gtm.js?id=GTM-NGHPGRLZ" | grep <evento>` ANTES de concluir que el tag falla. Una vez que el `gtm.js` contiene el trigger, funciona.

6. **La prueba dura es el request `/g/collect` (Tier 0b), no el realtime de GA4.** El `/g/collect?...en=generate_lead` capturado en Playwright prueba que el tag disparó y el hit salió a la propiedad correcta. El realtime API de GA4 laggea unos minutos y a veces no surface el evento sintético como "usuario activo". No concluir "no funciona" por el realtime; el hit saliente es la prueba.

7c. **⚠️ Verificar en realtime exige una sesión que cuente como "usuario ACTIVO".** Una sesión Playwright **headless sin engagement** (carga y cierra) manda el `/g/collect` bien, pero **no aparece en el realtime** (`activeUsers=0`, 0 pantallas) porque GA4 no la cuenta como activa. Para que aparezca: **User-Agent real** (`newContext({userAgent})`, no el headless default de Playwright — NO confundir con "UA"/Universal Analytics, que está muerta desde 2023; acá es 100% GA4) + **engagement** (scroll/mouse, dispara `user_engagement`) + **consent granted** (§7b). Aislar la superficie por `unifiedScreenName` (el título de página) en el realtime report — combinar `unifiedScreenName` con `eventName` da `400 "cannot be queried together"`, usar solo `unifiedScreenName` + `activeUsers`/`eventCount`. Verificado 2026-07-07: think aparece como "Efeonce Think — Herramientas de visibilidad" con activeUsers=1.

7b. **⚠️ Consent bloquea la VERIFICACIÓN (no el envío): sin `analytics_storage` concedido, GA4 modela el evento fuera del realtime/reportes estándar.** Al verificar con Playwright/browser, el hit sale igual (`/g/collect` con `gcs=G100` = denied) pero **NO aparece en el realtime** — GA4 lo modela en agregado. Con consent concedido (`gcs=G111`) + ~1-2 min de lag del realtime Data API → aparece (`generate_lead=1` confirmado 2026-07-07). En la prueba: conceder consent en la sesión (`window.gtag('consent','update',{analytics_storage:'granted',ad_storage:'granted',ad_user_data:'granted',ad_personalization:'granted'})`) ANTES de empujar el evento, y polear el realtime varias veces (el Data API laggea más que el DebugView de la UI). El `uafvl=HeadlessChrome` NO fue el bloqueo (el evento aterrizó igual headless) — el bloqueo era el consent.

7. **Los forms ya emiten al dataLayer por default** (`gtmDataLayer` = `z.boolean().default(true)` en `contracts.ts`). Cero trabajo per-form: un solo tag genérico cubre todos, distinguiendo por `form_slug`. Un form nuevo queda medido el día que se publica, sin tocar GTM.

8. **Gobernanza que funcionó:** build en workspace nuevo (descartable) → `quick_preview` (assert sin compilerError) → mostrar al humano → `create_version` + `publish` con OK explícito → verificar live no rompió nada → verificar el hit → registrar en el TRACKING-PLAN. La API valida al crear (un shape malo falla en el POST, no en producción).

### Pendiente / follow-ups de esta entrada
- El evento de test (`form_slug='verification-test'`) queda en GA4 — filtrable/excluible.
- Borradores `GA4 - Tag`/`html` en el Default Workspace: NO publicar (duplicarían Site Kit); limpiar o dejar.
- Google Ads (`AW-16796059774`): oportunidad de importar `generate_lead` como conversion para bidding.
- Smoke-test forms en producción (`smoke-*`, `live-hs-*`): archivar.


## 2026-10-18 — Ads reservado y fork de plantilla Server por API

- Preview Web real serializa el objeto reservado como claves anidadas user_data con metadata. No exigir
  em en ese transporte de entrada: el GA4 Client reconstruyó el objeto reservado en Server12.
  Cuatro escenarios SDK Preview y cuatro LIVE pasaron con toda medición interceptada; el probe propio
  usó allowed0/key técnica/transaction inválida. Ningún tag ni outgoing: no es una conversión Ads positiva.
- templates.update rechazó galleryReference como campo no soportado. Tras GET que confirmó ausencia
  de cambio, el PUT nuevo usó sólo name/templateData; no se reintentó un resultado desconocido.
  Google hizo un fork local: quitó galleryReference y cambió automáticamente el tipo del tag6 de
  cvt_NCN6S a cvt_191286361_3, conservando su fingerprint. Releer dependientes antes de guardar
  checkbox; nunca reenviar el tipo gallery anterior sobre el puntero local observado.
- El readback de template normaliza JSON de TEMPLATE_PARAMETERS (formato/escaping) y whitespace
  exterior de SERVER_PERMISSIONS. Se probaron deepStrictEqual con orden de arrays conservado y
  bytes exactos de JS/INFO/TOS/tests/notas; registrar SHA esperado y real distintos. No ignorar
  secciones ni permisos arbitrarios para obtener PASS. El compilador y los árboles inmutables
  Web6/Server10 se verificaron después. Evitar actualizaciones automáticas que borren el callback.

[Auditoría de publicación y límites](../../audits/growth/2026-10-18-google-ads-activation.md).

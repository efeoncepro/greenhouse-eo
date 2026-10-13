# Consentimiento HubSpot para WordPress y Think

> Decisión del operador 2026-10-13: «Ok, hazlo» sobre la recomendación de HubSpot.
> Autoriza configurar/publicar el banner y conectar sus categorías con la medición.
> Estado de despliegue y QA: [auditoría](../../audits/measurement/META_CAPI_RECOVERY_2026-10-13.md).

## Fuente y contrato

Portal `48713323` Efeonce Group. Políticas específicas de `efeoncepro.com` y
`think.efeoncepro.com`: opt-in por categorías, español, todos los países/URLs y GPC.
Default global y `offers.efeoncepro.com` quedan fuera del cambio. No habilitar RGPD global,
automatizaciones CRM, píxeles web de HubSpot Ads ni otras integraciones por inferencia.

`_hsp.addPrivacyConsentListener` es la API de **banner**: `categories.analytics`,
`categories.advertisement` y `categories.functionality`. No confundirla con `_hsq`
ni usar `allowed`: también puede ser true sin banner o en modo sólo notificación.
Sólo boolean true concede cada categoría; desconocido/faltante/denegado bloquea.
GPC true fuerza publicidad denegada. No crear cookies ni persistir preferencias propias:
El banner aparece automáticamente cuando falta una elección HubSpot; el control legal
sólo reabre preferencias después. La verificación de primera visita debe observar el banner
antes de tocar ese control, aceptar sólo publicidad y correlacionar UUID navegador→Meta.
HubSpot conserva la elección; `showBanner` permite cambiarla desde «Preferencias de cookies»,
un control de texto integrado con los enlaces legales del pie. No crear una franja/botón
destacado independiente debajo del contenido. En Think home, el pie legal queda dentro
del hero existente, sin prolongar su altura ni introducir otro fondo.
WP monta el control dentro del grupo legal de Ohio y usa handler nativo, con espacio
inferior dentro del pie para el CTA móvil; Think lo monta en el pie legal y usa el bridge. No interpretar fallo de click por superposición como fallo del CMP.

Default Google Consent Mode antes de scripts: ad_storage, ad_user_data,
ad_personalization, analytics_storage, functionality_storage y personalization_storage
**denied**; security_storage granted. El host emite el default inline, incluso si falla
el asset externo. El bridge actualiza Google y Clarity ConsentV2, más dataLayer:
`meta_ads_consent`, `analytics_consent`, valores `granted|denied`.
Aceptar analítica no concede publicidad ni Meta. Retirar cambia los gates inmediatamente;
no cancela HTTP ya enviado. Estos controles técnicos no afirman cumplimiento legal universal.

## Adquisición, PageView y sender

- SoT del bridge: `scripts/measurement/hubspot-consent-bridge.js` en Greenhouse.
  Distribuciones byte-identical: plugin WP `eo-measurement-consent/assets/consent-bridge.v1.js`
  y Think `public/measurement/consent-bridge.v1.js`. No editar copias a mano.
- WordPress: plugin nuevo y release de sólo dos archivos, hashes/prestate/backup, cache de
  plugins invalidada antes de activar. Header antes de Site Kit/GTM; HubSpot loader existente.
  Opción `eo_measurement_server_routing=enabled` coordina routing y `send_page_view=false`.
  Plugin 1.0.3: preferencias inline en el pie Ohio; sin bloque visual después del footer.
- Think: BaseLayout instala default/bridge/loader HubSpot antes de GTM; `analytics=false`
  no incluye ninguno ni el botón, conservando informes con credenciales sin tracking.
- `gh_privacy_consent_updated` actualiza preferencias; no es una conversión.
- `gh_consent_page_view` emite una vista por destino permitido por navegación, también
  cuando la aceptación llega después de cargar la página. `meta_only=1` evita forwarding
  GA4 cuando sólo falta medir Meta; `meta_capi_page_view=1` autoriza esa vista específica.
  Opt-in repetido/revoke/regrant en la misma navegación no vuelve a contarla.
- Google config compartida con `send_page_view=false`; GA4 Event PageView adquiere la señal.
  Server GA4 forwarding exige la señal nativa `x-ga-gcs` con `^G1[01]1$`
  (analítica permitida) y meta_only distinto de 1. No depender sólo del custom analytics_consent:
  eventos automáticos, como interacción/scroll, no necesariamente lo incluyen. Unknown/denied bloquea.
  Meta PageView exige publicidad granted, host permitido, meta_capi_page_view 1 y UUID.
  El SDK GA4 usa el parámetro nativo `evnid`; Client GA4 lo normaliza a `event_id`.
  Inspeccionar ambas formas antes de diagnosticar un ID ausente.
  Form/meeting Lead conservan sus propios gates comerciales/UUID, sin depender del marker PV.
- Transformaciones por destino excluyen los campos de control; Meta recibe URL sin query/
  fragment ni referrer. Los atributos HTML de QA reflejan estados, sin guardar PII/cookies.

## Identidad de reunión compatible con el renderer vigente

PageView usa un UUID v4 por ocurrencia del mismo generador Crypto, memoizado por evento GTM,
para conservar identidad en reintentos. El tag GA4 de confirmación usa `JS - meeting conversion event_id`: primero UUID opaco válido
emitido por el renderer, si existe; si falta, el bridge genera UUID v4 con Crypto y lo memoiza
por `gtm.uniqueEventId`, usado **sólo como llave local**, nunca transmitido. La variable sólo
opera en `gh_meeting_booking_confirmed`; el dominio conserva receipt/eligibilidad/replay.

No requiere liberar Greenhouse para recuperar esta identidad del sender. El renderer UUID
preparado localmente es compatible y puede liberarse después: no genera un segundo sender.
Sin Crypto/counter válido, ID vacío y CAPI fail-closed; UX y GA4 conservan el comportamiento.
No es identidad durable del ledger ni compartida con un sender outbox futuro. Ese carril
requiere una decisión explícita de identidad/dedupe antes de coexistir.

## QA y publicación

Pruebas del bridge: `node scripts/measurement/__tests__/hubspot-consent-bridge.test.cjs`.
Verificar default, analítica-only, publicidad-only, ambos, retiro, reabrir, repetición,
GPC, hosts ajenos y fallo Crypto; desktop/mobile y ninguna instrumentación en rutas privadas.
Verificar hashes de ambas distribuciones; API compile no sustituye Preview ni lectura live.

Positivos CAPI sólo con código **real** de Test Events, obtenido del dataset correcto en
Events Manager, y código activo sólo en el draft. Excluir probes internos de GA4.
Comprobar PageView y Lead **Server** de ambos hosts, URL limpia, ID UUID y negativos.
Retirar código de prueba y releer antes de publicar server→web; luego activar routing WP,
verificar versiones/consentimiento/tráfico real y cerrar Preview para evitar consumo continuo.
No crear bookings/submissions/CRM ni confundir un Lead sintético Test Events con negocio real.

Rollback: versiones GTM anteriores; desactivar routing WP y/o plugin scoped, restaurar backup;
Vercel rollback al deployment previo verificado. No desplegar todo el repo WP con drift ajeno.

## Fuentes oficiales verificadas 2026-10-13

- [HubSpot banners](https://knowledge.hubspot.com/privacy-and-consent/set-up-a-consent-banner-with-the-new-editor).
- [HubSpot API de banner](https://developers.hubspot.com/docs/api-reference/latest/account/settings/consent-banner/consent-banner-api).
- [Google: HubSpot y Consent Mode](https://support.google.com/tagmanager/answer/14563689?hl=en).
- [Microsoft Clarity ConsentV2](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v2).
- [Site Kit GTag](https://github.com/google/site-kit-wp/blob/develop/includes/Core/Tags/GTag.php).
  El filtro `googlesitekit_gtag_opt` se comprobó además en el código instalado del sitio.

La señal nativa se verificó en Preview con interacción real `x-ga-gcs=G101` y GA4 Completada,
Meta bloqueado; negativos G100/G110/missing/meta_only sin salidas.
[Consent Mode server de Google](https://developers.google.com/tag-platform/tag-manager/server-side/consent-mode)
explica el transporte nativo; la codificación/gate concreto se contrastó con el runtime actual.


## Contexto de consentimiento al backend — TASK-2034

Renderer Forms/Meetings añade measurementContext opcional al POST comercial: categorías
publicidad/analytics separadas, fuente/versión, capturedAt y GPC; cookies/client_id sólo
cuando su finalidad está consentida. Backend valida tipos/antigüedad y aplica veto adicional
si Sec-GPC:1, aunque el body diga false. Consentimiento de procesamiento/comunicaciones
nunca concede publicidad. Unknown/denied omite matching sin rechazar formulario/reserva.
Snapshot sin cookies en ledger; proyección de hashes/cookies/contexto cifrada con retención48 h.
Código local probado, pendiente de release. [Contrato](08-meta-conversions-api-server-side.md#42-implementación-de-matching-y-google-upd--2026-10-13).

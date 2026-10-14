# Consentimiento HubSpot para WordPress y Think

> Decisión del operador 2026-10-13: «Ok, hazlo» sobre la recomendación de HubSpot.
> Autoriza configurar/publicar el banner y conectar sus categorías con la medición.
> Estado vigente: Server6/Web5, contexto backend publicado y matching activado.
> [Runtime](10-growth-lead-matching-runtime.md) · [release y QA](../../audits/releases/2026-10-13-full-develop-matching-release.md).
> La [auditoría de recuperación](../../audits/measurement/META_CAPI_RECOVERY_2026-10-13.md) es cronología histórica.

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
El banner aparece automáticamente cuando falta una elección HubSpot y la política requiere
opt-in. Con GPC, el proveedor puede resolver la elección a denied sin mostrar aviso; ese caso
se verificó en ambos hosts y no equivale a aceptación. El control legal permite reabrirlo después. La verificación de primera visita debe observar el banner
antes de tocar ese control, aceptar sólo publicidad y correlacionar UUID navegador→Meta.
HubSpot conserva la elección; `showBanner` permite cambiarla desde «Preferencias de cookies»
(puede abrir primero el aviso, seguido de «Personalizar preferencias»),
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

### Presentación La órbita — autorizada 2026-10-13

«Vamos, ponla» autoriza adoptar la propuesta visual en ambos hosts. Se viste la UI nativa de
HubSpot con CSS/JS scoped y fuentes locales; no se usa `setHubSpotConsent`, no se deshabilita
el banner ni se crea persistencia propia. Botones, checkboxes, categorías y handlers siguen
siendo HubSpot. El listener/default/bridge anteriores no cambian. Los nodos de presentación
se agregan como hermanos, sin reemplazar los textos que administra el renderer del proveedor.
Las etiquetas pintadas y ARIA se adaptan; el estado accesible usa el `checked` nativo.
El copy del adapter es presentación local: no modifica textos ni políticas guardadas en HubSpot.
La elección se lee del listener nativo; nunca de un toggle visual, de la existencia del banner
o del estado efímero del prototipo. `gh_privacy_consent_updated` identifica
`consent_source=hubspot_categories`; el contexto de conversión conserva esa fuente y su versión
de política propia, sin reemplazarlas por la versión del diseño.

Canon: `scripts/measurement/hubspot-consent-ui.js`, `hubspot-consent-ui.template.css` y
`build-hubspot-consent-ui.mjs`; distribuciones byte-idénticas en `consent-ui/` de los dos hosts.
WP plugin 1.1.0 carga assets en el frontend del host canónico; BaseLayout Think los carga
sólo con `analytics=true`. Ambos usan hash en URL. El flag de routing WP gobierna transporte,
no habilita/deshabilita esta presentación.
`analytics=false` sigue excluyendo banner, bridge, UI y trackers.
[Publicación, pruebas y rollback](../../audits/measurement/CONSENT_UI_ROLLOUT_2026-10-13.md).

### Transporte existente

- SoT del bridge: `scripts/measurement/hubspot-consent-bridge.js` en Greenhouse.
  Distribuciones byte-identical: plugin WP `eo-measurement-consent/assets/consent-bridge.v1.js`
  y Think `public/measurement/consent-bridge.v1.js`. No editar copias a mano.
- WordPress: recuperación inicial con plugin nuevo y release de sólo dos archivos, hashes/prestate/backup, cache de
  plugins invalidada antes de activar. Header antes de Site Kit/GTM; HubSpot loader existente.
  Opción `eo_measurement_server_routing=enabled` coordina routing y `send_page_view=false`.
  Plugin 1.0.3 introdujo preferencias inline en el pie Ohio; 1.1.0 conserva ese montaje
  y suma la presentación La órbita, sin bloque visual después del footer.
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
  Lead Forms/Meetings nace ahora en backend: consentimiento snapshot + fuente elegible +
  identidad durable. No depende del marker PV ni del UUID browser para enviar Meta.
- Transformaciones por destino excluyen los campos de control; Meta recibe URL sin query/
  fragment ni referrer. Los atributos HTML de QA reflejan estados, sin guardar PII/cookies.

## Identidad de navegación y espejo de reuniones

PageView usa UUID v4 por ocurrencia, memoizado por evento GTM, para conservar identidad
en reintentos. El tag GA4 de confirmación de reunión conserva `JS - meeting conversion event_id`:
prefiere el UUID opaco válido del renderer; como compatibilidad, usa Crypto memoizado por
`gtm.uniqueEventId` (llave local, nunca transmitida). El dominio conserva receipt/eligibilidad/replay.

Ese UUID browser correspondía al sender Meta de recuperación inicial. **Desde Server6 los
triggers Meta Lead12/17 están retirados:** el espejo browser sólo alimenta GA4; el Lead de Meta
usa el UUID durable de la cola backend. No reactivar el sender anterior como fallback, ni
confundir un fallo Crypto del espejo con un veto a una conversión backend válida.
No transmitir receipt o IDs internos como identidad publicitaria. [Contrato completo](10-growth-lead-matching-runtime.md).

## QA y publicación

Pruebas del bridge: `node scripts/measurement/__tests__/hubspot-consent-bridge.test.cjs`.
Verificar default, analítica-only, publicidad-only, ambos, retiro, reabrir, repetición,
GPC, hosts ajenos y fallo Crypto; desktop/mobile y ninguna instrumentación en rutas privadas.
Verificar hashes de ambas distribuciones; API compile no sustituye Preview ni lectura live.

Positivos CAPI sólo con código **real** de Test Events, obtenido del dataset correcto en
Events Manager, y código activo sólo en el draft. Excluir probes internos de GA4.
Comprobar PageView y Lead **Server** de ambos hosts, URL limpia, ID UUID y negativos.
La recuperación inicial publicó server→web y después activó routing WP. Para matching actual,
seguir el cutover del contrato10: retirar legacy y publicar Client → worker destinos/retención →
captura Vercel última. Retirar código de prueba y releer artefacto congelado antes de publicar;
verificar versiones/consentimiento/tráfico real y cerrar Preview para evitar consumo continuo.
No crear bookings/submissions/CRM ni confundir un Lead sintético Test Events con negocio real.

Rollback matching: captura y ambos senders OFF en configuración durable/live; retención ON.
Restaurar Server5 sólo después de detener backend Meta; preservar key/ciphertext48h y SQL aditivo.
Para revertir además la recuperación inicial: desactivar routing/plugin scoped WP, restaurar backup
y deployment Think previo verificado. No desplegar todo el repo WP con drift ajeno.

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
Publicado y activado tras PR254/main d692ab51dc48; primera aceptación/reserva comercial
consentida post-activación todavía sin observar. Detalle de schemas, tiempos y gates en [runtime](10-growth-lead-matching-runtime.md). [Contrato](08-meta-conversions-api-server-side.md#42-implementación-de-matching-y-google-upd--2026-10-13).

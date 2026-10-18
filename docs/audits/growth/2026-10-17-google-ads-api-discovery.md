# Google Ads — discovery y prueba API de lectura, 17-10-2026

## Resultado y alcance

**PASS: OAuth verificado y lecturas Google Ads API v26 contra el anunciante `6862539491`.**
La ruta comprobada requiere `login-customer-id: 9531478329`. El manager es contexto de acceso;
todos los requests Ads consultaron exclusivamente `/customers/6862539491/googleAds:search`.
No se enumeraron otras cuentas ni se ejecutaron mutaciones, uploads o conversiones de prueba.
El operador confirmó que el anunciante es **nuevo**; la ausencia de campañas no se trata como incidente.

Autorización recibida: **2026-10-17 22:36:48 UTC / 19:36:48 America/Santiago**.
Probe inicial finalizado: `22:36:55 UTC`; inventario corregido y readback: `22:37:31–22:37:33 UTC`.
Resultado: acceso de operador probado; **conexión de producto, sender Ads y rollout pendientes**.

| Plano | Evidencia comprobada |
| --- | --- |
| Administración Cloud | `julio.reyes@efeonce.org`; proyecto `efeonce-group` |
| Principal OAuth Ads | ID token con audiencia y email verificado: `jreyes@efeoncepro.com` |
| Scopes concedidos | `openid`, `userinfo.email`, `https://www.googleapis.com/auth/adwords` |
| Nivel API Cloud observado | Explorador; API Google Ads habilitada por el operador |
| Anunciante | `6862539491`, `Efeonce - Agencia`, no manager, no test account |
| Configuración | `CLP`, `America/Santiago`, `autoTaggingEnabled=true` |
| Conversion owner | `customers/6862539491` |
| Conversion tracking ID | `18432951465` — leído del proveedor, no deducido del customer ID |
| Tracking | `NOT_CONVERSION_TRACKED`; `effectiveEnablementSetting=OFF` |
| Mutaciones Ads / CRM / GTM | **0** |

## Autorización y custodia

Se reutilizó el cliente web existente **Greenhouse Search Console** del proyecto `efeonce-group`,
con su callback local ya registrado. No se modificó configuración Cloud, IAM, consent screen ni
grants de GA4/GSC. La marca OAuth existente muestra **Claude** y el contacto del desarrollador
`julio.reyes@efeonce.org`; el usuario que autoriza Ads es otro principal, `jreyes@efeoncepro.com`.
La marca heredada no constituye branding de producto aprobado para esta integración.

Google mostró el aviso de aplicación no verificada. El operador completó MFA y confirmó
explícitamente el permiso Ads; después completó el consentimiento. Habilitar la API y verificar
la aplicación OAuth son procesos separados. El rollout debe revisar marca, audiencia, estado de
publicación y verificación de scopes según el uso previsto. No se presentó ninguna solicitud de
verificación durante este discovery.

El callback privado validó state de un solo uso con vencimiento, PKCE S256, audiencia de ID token,
email verificado exacto y scope Ads concedido. Sólo después inició las consultas. El scope Ads
sirve tanto para lectura como escritura: **el probe restringe operaciones, el grant no es un scope
de sólo lectura**. No se cambió el rol del usuario para esta prueba.

Credencial y recibos locales: `.auth/google-ads-discovery-20261017/`, ignorado por Git, directorio
`0700`, archivos de credencial/evidencia `0600`. No se adjuntan tokens, ID token, subject, códigos,
client secret, URL OAuth, payloads personales ni snippets completos. La credencial local no fue
publicada en Secret Manager ni instalada como conexión Greenhouse. Listener local detenido al
terminar. Desconectar/revocar y promover a conexión de producto son acciones separadas.

## Requests Ads y cobertura

Doce requests Ads: diez HTTP 200, un 403 de acceso directo y un 400 de campo GAQL inválido.
Cada request usó `googleAds.search`, que emplea HTTP POST **para consultar**. No se envió un
developer-token: la lectura real funcionó con acceso asociado al proyecto Cloud del cliente OAuth.

| Consulta | HTTP | Filas | Request ID / observación |
| --- | --- | --- | --- |
| Identidad sin manager | 403 | — | `DMBSt4nupryvWQy7gcV9HQ`; `USER_PERMISSION_DENIED` |
| Identidad vía manager observado | 200 | 1 | `GFegTWDTAzRFrvglERgbaQ`; ID exacto validado antes de continuar |
| Conversion tracking | 200 | 1 | `VNdcu5zCsP5KCS4xVKT5fg` |
| Acciones, consulta inicial | 400 | — | `-v_ofgTRGZGsRBH3Z6Z9Ug`; `UNRECOGNIZED_FIELD` |
| Account goals | 200 | 0 | `wC0tHMRufmu7wfPFXZ6OFQ` |
| Inventario campañas | 200 | 0 | `_FBNDtQoaW5wzt6acuMqNw` |
| Campaign goals | 200 | 0 | `03v3gFU3kDEIMS7x22fFjQ` |
| Campaign goal config | 200 | 0 | `ghU2yEEg38MWLips99UbGA` |
| Identidad, segundo readback vía manager | 200 | 1 | `beKdoEkL5iJli5TenyPMXQ` |
| Acciones, consulta corregida | 200 | 2 | `6lVFgR9KQRB0hCe29IvMiQ` |
| Custom conversion goals | 200 | 0 | `E0r_mOwlee_0Pj7lRPQxIA` |
| Conversion tracking, segundo readback | 200 | 1 | `Vh8GfAn3dl6jOTj8pjr3bw` |

La consulta inicial usaba `conversion_action.default_value_settings`; la referencia v26 indica
`conversion_action.value_settings`. Se corrigió el campo y repitió sólo la lectura. El fallo queda
registrado y no se interpreta como ausencia de acciones. En el recibo inicial, `resultCount=null`
con HTTP 200 y `results=[]` representa lista vacía; se normaliza a **0 filas** en esta tabla.

Inventarios con `LIMIT 1000`, identidad/settings con `LIMIT 1`; no apareció `nextPageToken`.
Son snapshots de esas consultas, no un certificado de toda la historia, gasto o resultados de Ads.
No se consultaron métricas de rendimiento ni usuarios/clientes potenciales individuales.

### Acciones devueltas por API

| ID | Nombre | Tipo | Estado | Primary for goal |
| --- | --- | --- | --- | --- |
| `7852171430` | `efeoncepro.com (web) purchase` | `GOOGLE_ANALYTICS_4_PURCHASE` | `HIDDEN` | `false` |
| `7852171433` | `efeoncepro.com (web) generate_lead` | `GOOGLE_ANALYTICS_4_GENERATE_LEAD` | `HIDDEN` | `false` |

Ambas devolvieron `MANY_PER_CLICK`, click window 90 días, view window 1 día y default value **1 CLP**.
No es una valoración comercial aprobada. Los snippets son eventos GA4, con global site tag vacío;
no acreditan conversion labels para una acción Ads nativa. No se habilitaron, editaron ni importaron.
El inventario API complementa la UI que antes mostraba lista vacía. La arquitectura usa el readback
API como evidencia de estas dos acciones ocultas; no declara cero acciones absolutas.

### Templates de consulta reproducibles

Operación: `POST https://googleads.googleapis.com/v26/customers/6862539491/googleAds:search`,
con autorización resuelta en memoria y `login-customer-id: 9531478329`. No pegar bearer tokens en
comandos, historial, documentación ni herramientas de navegador.

```sql
SELECT customer.id, customer.descriptive_name, customer.manager,
  customer.test_account, customer.currency_code, customer.time_zone,
  customer.auto_tagging_enabled
FROM customer LIMIT 1
```

```sql
SELECT customer.conversion_tracking_setting.conversion_tracking_id,
  customer.conversion_tracking_setting.cross_account_conversion_tracking_id,
  customer.conversion_tracking_setting.google_ads_conversion_customer,
  customer.conversion_tracking_setting.conversion_tracking_status,
  customer.conversion_tracking_setting.accepted_customer_data_terms,
  customer.conversion_tracking_setting.enablement_setting,
  customer.conversion_tracking_setting.effective_enablement_setting
FROM customer LIMIT 1
```

```sql
SELECT conversion_action.id, conversion_action.name, conversion_action.status,
  conversion_action.type, conversion_action.category,
  conversion_action.primary_for_goal, conversion_action.counting_type,
  conversion_action.click_through_lookback_window_days,
  conversion_action.view_through_lookback_window_days,
  conversion_action.value_settings.default_value,
  conversion_action.value_settings.default_currency_code,
  conversion_action.tag_snippets
FROM conversion_action LIMIT 1000
```

```sql
SELECT customer_conversion_goal.category, customer_conversion_goal.origin,
  customer_conversion_goal.biddable FROM customer_conversion_goal LIMIT 1000
SELECT campaign.id, campaign.name, campaign.status,
  campaign.advertising_channel_type FROM campaign LIMIT 1000
SELECT campaign_conversion_goal.campaign, campaign_conversion_goal.category,
  campaign_conversion_goal.origin, campaign_conversion_goal.biddable
FROM campaign_conversion_goal LIMIT 1000
SELECT conversion_goal_campaign_config.campaign,
  conversion_goal_campaign_config.goal_config_level,
  conversion_goal_campaign_config.custom_conversion_goal
FROM conversion_goal_campaign_config LIMIT 1000
SELECT custom_conversion_goal.id, custom_conversion_goal.name,
  custom_conversion_goal.status, custom_conversion_goal.conversion_actions
FROM custom_conversion_goal LIMIT 1000
```

Cada `SELECT` anterior es un request separado. La consulta de identidad se repitió mediante la
ruta manager y el readback final; conversion tracking también se volvió a consultar.

## Discovery del ecosistema

| Superficie | Evidencia del discovery | Implicación |
| --- | --- | --- |
| GTM web / server | `GTM-NGHPGRLZ` / `GTM-K2X4ZTTK`; snapshot check sin drift en el discovery | Reutilizar ambos; no publicar desde este trabajo |
| Tags | Web Google tag/GA4; server GA4 + Meta CAPI; sin tags Ads Conversion Tracking/Linker en snapshot | Sender Ads aún por implementar |
| Endpoint server | Hosting actual run.app en `efeonce-group` | Subdominio first-party requiere unidad de infra y verificación propias |
| GA4 | Propiedad `486264460`, stream `G-KYPPY57M14`; links a anunciante/MCC | Los links no acreditan importación, envío ni atribución |
| Conexiones DB | GA4 y GSC Efeonce `active`; scopes `analytics.readonly` / `webmasters.readonly`; secret refs presentes | Grants separados; no daban acceso Ads |
| HubSpot | Portal `48713323`; anunciante correcto conectado, auto-track ON | Validar funciones/licencia/mapping por hito antes de elegir emisor |
| Identidad HubSpot | `hs_google_click_id` existe; marcador Greenhouse no provisionado en readback | Contacto y último click no identifican una solicitud histórica |
| Growth Measurement | Destinos actuales `meta` / `google_upd`; este último manda UPD GA4 sin events | No equivale a una conversión Ads |
| Captura | `measurementContext` sin gclid/gbraid/wbraid/hutk; Forms adapter sin attribution context | Requiere contrato de captura/consentimiento durable |
| Intención | Espejo GA4 genérico incluye fuentes no comerciales | No importar `generate_lead` indiscriminadamente como objetivo de puja |
| CRM / Meetings | Contact/deal no son ocurrencia; booking→CRM y campaña renderer tienen brechas | Binding exacto y semántica de transición antes de lifecycle |
| Retención | Matching ciphertext actual 48 h; lifecycle puede tardar semanas | Política propia de conservación; no ampliar TTL como parche |

Las lecturas DB se hicieron con cliente canónico y transacción READ ONLY. No se exportaron tokens
ni payloads de personas. GA4/GSC aquí son metadata de conexión, no un nuevo probe analítico.
La [arquitectura](../../architecture/GREENHOUSE_GOOGLE_ADS_MEASUREMENT_ARCHITECTURE_V1.md) registra
las brechas, fuentes canónicas, modelo propuesto, fallos, fases y condiciones de aceptación.

## Evidencia y límites de cierre

Recibos privados saneados, con SHA-256 de integridad:

- `probe-results.json`: `fb36845740803775e892e4e4a88fac74b77d5769ef87ead5cad32908a0ea5737`.
- `inventory-results.json`: `8d787a880e24fe01f147ed68c0053d1bdcaa9d886111bbb1b273d7d997b1db65`.

Credenciales y scripts privados no se incorporan al commit. El discovery extenso previo vive fuera
del repositorio en `/Users/jreye/Documents/google-ads-architecture-discovery-2026-10-17/README.md`.
Esta auditoría conserva el resultado versionado sin convertir esos archivos locales en API de producto.

Comprobado: identidad OAuth, acceso Ads vía manager, cuenta/owner, moneda/timezone e inventarios.
Pendiente: conexión Greenhouse por organización, reporting continuo, decisiones por acción, captura de
adquisición, bindings CRM, provisioning Ads/GTM, Data Manager y cualquier prueba de atribución.
No se realizaron cambios en campañas, objetivos, conversiones, GTM, HubSpot, IAM o configuración Cloud.

## Fuentes primarias

- [OAuth y acceso Ads](https://developers.google.com/google-ads/api/docs/oauth/access-model).
- [Estado de aplicación no verificada](https://support.google.com/cloud/answer/7454865).
- [Conversiones, value settings y snippets](https://developers.google.com/google-ads/api/docs/conversions/getting-started).
- [Acceso del proyecto Cloud y retiro del developer token](https://developers.google.com/google-ads/api/docs/api-policy/developer-token).
- [ADR adoptado](../../architecture/GREENHOUSE_GOOGLE_ADS_INTEGRATION_DECISION_V1.md).

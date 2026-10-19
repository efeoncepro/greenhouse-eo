# LinkedIn Ads: Insight Tag y Conversions API

**Estado:** discovery documental, 2026-10-19. Ninguna conexión, cuenta, regla, token, tag o conversión
LinkedIn de Efeonce se verificó en vivo en este discovery. No hay activación ni publicación implícitas.
Se consultaron fuentes primarias de LinkedIn, sus repositorios y HubSpot; las decisiones locales propuestas
viven en la [arquitectura](../../architecture/GREENHOUSE_LINKEDIN_ADS_MEASUREMENT_ARCHITECTURE_V1.md),
la [documentación funcional](../../documentation/growth/linkedin-ads-measurement.md) y el
[manual de preparación](../../manual-de-uso/growth/preparar-medicion-linkedin.md).

## Conceptos que no deben confundirse

| Capacidad | Función documentada | Qué exige o qué no prueba |
| --- | --- | --- |
| Insight Tag | JavaScript web, señal de visita, conversiones y audiencias | Partner ID correcto; no crea por sí solo una regla comercial |
| InsightTag 2.0 en GTM Web | Template oficial para base y eventos | Partner ID, Conversion ID para evento y Event ID si habrá dedupe |
| Enhanced conversion tracking | First-party tracking y click ID `li_fat_id` | Setting del Insight Tag; no es envío de email hash |
| Enhanced matching | Email adicional al Insight Tag, hasheado en navegador | Código `setUserData` tras envío exitoso y permiso aplicable |
| Conversions API (CAPI) | Evento servidor a LinkedIn | Acceso propio, regla CAPI, payload, consentimiento y delivery |
| HubSpot lifecycle → LinkedIn | Cambios de etapa CRM a CAPI | Configuración propia; no equivale a cada submit web |
| LinkedIn Lead Gen Forms → HubSpot | Respuestas de formularios nativos hacia CRM | Lead Sync y permisos propios; no inventa un submit web |

Fuentes: [Insight Tag](https://www.linkedin.com/help/lms/answer/a489169),
[first-party cookies](https://www.linkedin.com/help/lms/answer/a423304),
[enhanced matching](https://www.linkedin.com/help/lms/answer/a6241147),
[CAPI overview](https://learn.microsoft.com/en-us/linkedin/marketing/conversions/conversions-overview)
y [LinkedIn Ads en HubSpot](https://ecosystem.hubspot.com/marketplace/listing/linkedin-ads).

## Identidad y reglas antes de instalar

- Ad account ID/URN, usuario autorizado, Business Manager/Page y permisos de Efeonce: **desconocidos**.
- Partner ID/propietario, dominios, tag instalado y sharing FULL/USE_ONLY: **sin verificar**.
- Conversion IDs para lead/reserva, fuentes, valores, ventanas y asociaciones: **sin verificar**.
- Token Direct API, app partner/OAuth y permisos: **sin verificar**; GA4/GSC/Google Cloud no los conceden.
- Enhanced tracking, enhanced matching, Website Actions y conexión HubSpot: **sin verificar**.

LinkedIn recomienda un tag por sitio y permite compartirlo entre cuentas. Una cuenta puede tener un
Insight Tag; `FULL` administra el activo y `USE_ONLY` no administra su configuración/permisos.
Para cambiar first-party tracking se requiere FULL de la cuenta sobre el tag y rol humano billing admin,
account manager o campaign manager. No confundir permisos de LinkedIn Page con permisos Ads.
Fuentes: [sharing UI](https://www.linkedin.com/help/lms/answer/a424432),
[permisos del tag API](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads-reporting/conversion-tracking),
[setting y roles](https://www.linkedin.com/help/lms/answer/a423304).

Las reglas definen categoría, valor/default, ventanas click/view y atribución. La ayuda actual usa
**ad sets**, mientras parte de la API usa campaign: mapear la entidad de la versión implementada.
La conversión debe asociarse al ad set; revisar selecciones automáticas en lugar de asumir cobertura.
Fuente: [configuración de conversiones](https://www.linkedin.com/help/lms/answer/a425606).

## Navegador y servidor: contratos distintos

El [template oficial web](https://github.com/linkedin/linkedin-gtm-community-template) acepta partner ID,
conversion ID y Event ID. El [procedimiento GTM](https://www.linkedin.com/help/lms/answer/a416960)
usa **LinkedIn InsightTag 2.0**. El evento equivalente en código es
`lintrk('track', { conversion_id: ID, event_id: EVENT_ID })`; los placeholders no son IDs de Efeonce.
La [ayuda event-specific](https://www.linkedin.com/help/lms/answer/a417886) exige obtener ambos IDs.

Para duplicar un mismo hecho por Tag y CAPI se crean **dos reglas, una por fuente**. LinkedIn deduplica
por **misma cuenta + mismo `eventId`**: cuenta Insight Tag y descuenta la copia CAPI. Cada ruta usa el
mismo ID durable del hecho, conservado en reintentos; no un UUID distinto por canal ni uno por persona.
No se encontró una ventana numérica oficial de dedupe ni una garantía server/server equivalente.
Fuente: [deduplicación](https://learn.microsoft.com/en-us/linkedin/marketing/conversions/deduplication).

CAPI usa `POST /rest/conversionEvents`, `conversion` URN de regla, `conversionHappenedAt` real en
milisegundos y `user.userIds`; `eventId` enlaza el hecho redundante. Email en minúsculas y sin
whitespace se transforma en SHA-256 hexadecimal64 para SHA256_EMAIL, sin eliminar puntos Gmail; `li_fat_id` usa LINKEDIN_FIRST_PARTY_ADS_TRACKING_UUID. No copiar `gclid`, teléfono ni
User-Agent del payload Google/Meta a campos no admitidos. Una respuesta 201 acepta el evento, sin
probar matching ni atribución. Fuente: [API](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads-reporting/conversions-api)
y [schema](https://learn.microsoft.com/en-us/linkedin/marketing/integrations/ads-reporting/conversions-api-schema).

Existen dos carriles de acceso CAPI: token **Direct API** generado en Campaign Manager sin app developer,
y producto autorizado para partners con OAuth/permisos `rw_conversions` + `r_ads`. El token Direct API
no expira según la guía, pero eso no prueba acceso general a reporting/gestión Ads. Fuente:
[overview](https://learn.microsoft.com/en-us/linkedin/marketing/conversions/conversions-overview).

También existe [template oficial sGTM](https://github.com/linkedin-developers/linkedin-capi-tag-template).
La [revisión fijada](https://github.com/linkedin-developers/linkedin-capi-tag-template/blob/488ef89314a5201b398e91782400c996e9c02d69/template.tpl)
inspeccionada usa versión `202605`, recoge datos del evento automáticamente y no implementa outbox
ni reintentos durables. Revisar/pinear antes de usarlo. Backend/outbox directo y template sGTM son
alternativas de emisor: no activar ambos para el mismo hecho. GTM Server no sustituye Insight Tag web.

## Click ID, enhanced matching y consentimiento

Con enhanced tracking, LinkedIn agrega `li_fat_id` al landing URL. Se puede capturar por URL o cookie;
la cookie del tag dura 30 días desde el último click. El mapping proveedor de 365 días no es permiso de
retención local ni ventana de atribución. `li_adsid` es otro identificador first-party del tag, descrito
para tráfico fuera de EU/EEA/Quebec/UK: no equivale a `li_fat_id` ni se inventa un CAPI idType.
Fuentes: [click IDs](https://learn.microsoft.com/en-us/linkedin/marketing/conversions/enabling-first-party-cookies)
y [Insight Tag](https://www.linkedin.com/help/lms/answer/a489169).

Enhanced matching publica `lintrk('setUserData', { email: 'USER_EMAIL' })` tras submit exitoso.
La biblioteca hashea en navegador; no asumir que acepta el hash de Google ni hacer doble hashing.
Propuesta local: capacidad separada, nunca PII cruda en dataLayer genérico, GA4, URL o logs.
Fuente: [código enhanced matching](https://www.linkedin.com/help/lms/answer/a6246095).

LinkedIn exige los permisos/consentimientos necesarios y excluye páginas con datos sensibles.
El [template web revisado](https://github.com/linkedin/linkedin-gtm-community-template/blob/main/template.tpl)
no usa APIs de consentimiento; puede enviar un pixel fallback si falla la carga del script.
**Inferencia local:** bloquear explícitamente ambas rutas mediante CMP/GTM; Google Consent Mode no
prueba consentimiento ni bloqueo de LinkedIn. `Not set` no añade checks; los controles adicionales
exigen granted cuando se dispara el tag. `ad_user_data` describe datos enviados a Google, no permiso
universal para LinkedIn. Fuentes: [obligación LinkedIn](https://www.linkedin.com/help/lms/answer/a489169)
y [consentimiento GTM](https://support.google.com/tagmanager/answer/10718549?hl=en).

## HubSpot y validación proporcionada

La [guía HubSpot](https://knowledge.hubspot.com/ads/create-and-sync-ad-conversion-events-with-your-linkedin-ads-account),
actualizada **2026-10-07**, limita el envío a cambios posteriores a crear el evento. Distingue ingesta
hasta 90 días de ventanas lookback; ciertos tipos admiten 365 días ajustables en LinkedIn. Su campo
Consent to share data es opcional en producto; la propuesta local debe exigir consentimiento explícito.
Escoger un emisor por etapa; no duplicar lifecycle desde HubSpot y un sender Greenhouse.

La [validación del tag](https://www.linkedin.com/help/lms/answer/a418880) puede tardar minutos–24 horas
tras tráfico legítimo. [Active](https://www.linkedin.com/help/lms/answer/a488323) significa señal en los
últimos siete días; no acredita lead comercial atribuido. Revisar CMP, red, partner ID y duplicados;
ver [troubleshooting](https://www.linkedin.com/help/lms/answer/a425696). Un callback GTM success tampoco
prueba recepción. Probar aceptación/dedupe con mocks; no emitir conversion IDs, leads o reservas
ficticias en producción. La atribución exige posteriormente un hecho legítimo trazable.

## Límites y uso de este registro

Todas las fuentes se consultaron el **2026-10-19**. Los enlaces Learn sin versión pueden redirigir a
la vigente; fijar `Linkedin-Version` soportada al implementar. Help y repositorios main son mutables.
La propuesta local mantiene sólo Forms comerciales y reservas aceptadas, incluye Grader comercial,
excluye Contacto genérico y formularios no comerciales, y conserva separación entre configuración,
publicación, receipt local, aceptación del proveedor, matching y atribución.
No se verificó que Website Actions/UET/li_adsid sean aislables con los mismos settings; revisar activos
reales antes de prometer minimización o activar capacidades opcionales.

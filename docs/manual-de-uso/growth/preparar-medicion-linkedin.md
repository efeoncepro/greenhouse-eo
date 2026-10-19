# Preparar medición de LinkedIn Ads con Forms y agendas

Estado **19/10/2026: investigación; sin instalación, acceso de cuenta ni conexión comprobados**.
Este manual describe el discovery y los gates de una implementación futura. No hay una CLI
LinkedIn ni un destino `linkedin` disponible en `growth:measurement` hoy. No ejecutar un plan
Google Ads/Meta cambiando el nombre del proveedor.

[Funcionamiento](../../documentation/growth/linkedin-ads-measurement.md) ·
[arquitectura/ADR Proposed](../../architecture/GREENHOUSE_LINKEDIN_ADS_MEASUREMENT_ARCHITECTURE_V1.md) ·
[fuentes oficiales consultadas](../../reference/measurement-gtm-ga4/11-linkedin-insight-tag-conversions-api.md).

## 1. Inventariar sin modificar

| Dato a obtener | Verificación necesaria |
|---|---|
| Identidad y cuenta LinkedIn Ads | Nombre/ID exactos, propietario y rol del humano; no reutilizar6862539491 de Google |
| Insight Tag | Partner ID, propietario, acceso de uso/administración y dominios; no confundir con cuenta o conversion ID |
| Instaladores existentes | GTM Web, HubSpot Ads/Pixels, plugin/tema WordPress y scripts Think; inspeccionar red en páginas aprobadas |
| Conversiones | Reglas/tag/API, ID/URN, categoría, estado, ventana click/view, campañas y sender actuales |
| HubSpot | Portal48713323 si el alcance es Efeonce, conexión LinkedIn, tier, permisos Ads, píxel instalado y eventos lifecycle |
| Privacidad | CMP HubSpot por host, divulgación LinkedIn, categorías, revocación/GPC y rutas públicas elegibles |
| CAPI | Carril de acceso, alcance real del token, custodio, revocación, versión API soportada; no copiar el secreto al informe |

Los snapshots versionados GTM sólo acreditan ese inventario local. No demuestran ausencia de un
tag instalado por HubSpot ni el estado actual de Campaign Manager. No aceptar términos, conectar
cuentas o generar tokens como parte de la lectura del inventario.

## 2. Fijar señales y autoridad de envío

1. Revisar las fuentes comerciales Forms y Discovery por key, versión/binding, surface y origen.
   Grader sí es comercial; Contacto general no. No ampliar por similitud de slug o por estado GA4 tagged.
2. Proponer dos hitos online: solicitud comercial nueva aceptada y reserva nueva confirmada.
   El proveedor ofrece categorías como `LEAD`/`BOOK_APPOINTMENT`; confirmar la elegida antes de crear reglas.
3. Elegir un instalador base: GTM Web propuesto. Una instalación HubSpot existente debe conciliarse
   antes; no pausar/borrar tags sin plan revisado y rollback.
4. Si se usa Tag y CAPI para el mismo hito, preparar **dos reglas**, una por origen; misma cuenta y
   mismo `eventId` durable en ambas rutas, con las campañas autorizadas asociadas. No autoasociar todo.
5. Elegir un emisor de etapas CRM: HubSpot nativo o propio. No dar de alta dos eventos para el mismo
   cambio ni usar email/contactId como ID de todas las conversiones. Lead Gen Forms nativos siguen
   su flujo de sincronización a HubSpot y no crean un segundo lead web.

[Deduplicación LinkedIn](https://learn.microsoft.com/en-us/linkedin/marketing/conversions/deduplication)
distingue reglas browser/server; no exige una misma rule. No se encontró una ventana numérica de
dedupe en la fuente consultada. No importar48h de Meta ni asumir que la ventana de atribución es
la de deduplicación.

## 3. Preparar Insight Tag 2.0 web

La [guía oficial GTM](https://www.linkedin.com/help/lms/answer/a416960) usa el template de la galería
**LinkedIn InsightTag 2.0** y Partner ID. Preparar en workspace, con template/version fijados y
lectura previa del contenedor. Limitar el tag a páginas comerciales públicas autorizadas; excluir
portal, estados/reportes tokenizados y páginas con información sensible o PII en la URL.

Añadir controles explícitos CMP/GPC y consentimiento adicional GTM comprobados antes de cargar
la biblioteca. El template no debe tratarse como un Google tag con consentimiento incorporado.
Probar elección tardía y revocación sin que queden eventos comerciales encolados para enviar después
con permiso diferente. Un pixel `noscript` no puede saltarse estas restricciones.

Para conversiones específicas, el template toma conversion ID y Event ID; el equivalente oficial
es `lintrk('track', {conversion_id, event_id})`. Se dispararía sólo desde un nuevo bridge LinkedIn
con recibo canónico persistido. Ese bridge **no existe todavía**; no conectar botones, validación
cliente, `generate_lead` sin verificación o la respuesta `googleAdsConversion` directamente al tag.
No hacen falta etiquetas individuales por formulario compatible; sí bindings explícitos por política.

`Enhanced conversion tracking` y captura consentida de `li_fat_id` se revisan juntos en Campaign
Manager y los hosts. El ID se observa, no se fabrica. Comprobar continuidad entre landing, Forms,
Think y scheduler; nunca copiar `gclid` a LinkedIn. `li_adsid` es otro identificador y no se adopta
como captura/envío propio en CAPI. Su generación automática por el tag y sus controles regionales
requieren inventario/QA; no se promete su supresión. Enhanced matching web se revisa por separado.

## 4. Preparar la ruta CAPI

Hay dos carriles documentados: token Direct API generado en Campaign Manager, y una integración
partner con producto autorizado/OAuth. No suponer que el primero habilita reporting o toda la API.
OAuth partner requiere `rw_conversions` y `r_ads` con rol elegible. Guardar tokens fuera de Git,
servidor solamente; no pedirlos por chat ni ponerlos en GTM web o variables públicas.

Preparar un binding de servidor para cuenta + regla CAPI + categoría + campañas + versión.
`POST https://api.linkedin.com/rest/conversionEvents` usa `Authorization`, `LinkedIn-Version`
`YYYYMM` y `X-Restli-Protocol-Version: 2.0.0`. No copiar una versión de un ejemplo sin revisar soporte.
Payload: URN de conversión, fecha real epoch **milisegundos**, `eventId` estable y `user.userIds`.
El mínimo propuesto usa SHA256_EMAIL (minúsculas, eliminar whitespace, SHA-256 hexadecimal64) y/o `li_fat_id` como
`LINKEDIN_FIRST_PARTY_ADS_TRACKING_UUID`. No usar normalización Gmail de Google, teléfono,
User-Agent, hashes Meta ni un UUID interno como identidad de persona.

Recomendación Proposed: adapter LinkedIn en el worker actual con proyección cifrada, unicidad,
consentimiento/policy por intento y recibos. El template [oficial sGTM](https://github.com/linkedin-developers/linkedin-capi-tag-template)
es una alternativa, no un componente ya instalado: revisar pin, versión API, headers y extracción
automática de identidad. No habilitar a la vez dos senders de servidor para el mismo hecho.

Para errores definitivos no repetir a ciegas;401/403 requieren resolver autoridad,426 versión.
429 y fallos confirmados como no aceptados exigen backoff. Timeout/5xx ambiguo queda como
`unknown_delivery` para reconciliar; no autoriza retry automático, y conserva el mismo ID. La deduplicación
browser/server no garantiza idempotencia server/server; el comportamiento de timeout debe quedar
probado/documentado antes de habilitar reintentos. La antigüedad máxima de ingesta, retención local
y ventanas de atribución son controles separados.

## 5. Preparar HubSpot sin duplicar ni compartir de más

La [integración nativa](https://knowledge.hubspot.com/ads/create-and-sync-ad-conversion-events-with-your-linkedin-ads-account)
puede enviar cambios de lifecycle posteriores a crear el evento. Antes de configurarla, comprobar
conexión y límites del tier, campos compartidos, alcance de contactos, propiedad de consentimiento
y propagación desde nuestras Forms. La casilla para recibir el diagnóstico no es permiso de
publicidad/compartición. El campo de consentimiento opcional del proveedor no vuelve opcional
nuestra política: exigir evidencia y no seleccionar automáticamente todos los contactos.

La ventana de ingesta y el lookback de la regla no se deducen de la retención de una cookie.
No reemplazar eventos existentes: HubSpot documenta que Replace event elimina el evento previo.
Primero inventario, propuesta concreta y rollback. No tocar grants GA4/GSC ni OAuth Google Efeonce.

## 6. Validar y publicar únicamente en una implementación autorizada

- Offline: payloads/mocks y pruebas de unknown/denied/GPC/revocación, policy ausente/obsoleta,
  duplicado, booking sin confirmación, polling, IDs de hitos distintos y agotamiento de entrega.
- Navegador: red interceptada/suprimida para probar transporte sin emitir conversiones; cero PII o
  hashes en dataLayer/GA4/logs. Distinguir carga del tag de recepción de una conversión.
- Readbacks: cuenta, reglas, campañas y configuración; el estado Active del tag no prueba resultados.
- Live positivo: sólo un hecho comercial legítimo consentido, sin leads, reservas, emails o click IDs
  ficticios, sin replay/backfill. No se halló un `validateOnly`/sandbox de eventos equivalente a Meta.
- Separar recepción, matching y atribución; considerar latencia de proveedor. Un201/2xx no los certifica.
- Release backend/renderers/hosts, publicación GTM y opt-in de políticas son actos distintos. Mantener
  flags/destinos OFF hasta completar los gates; rollback desactiva envíos y revisiones autorizadas,
  sin destruir CRM ni reenviar histórico. Los datos ya enviados al proveedor no se recuperan con rollback.

Esta investigación no ejecutó ninguno de esos cambios ni pruebas positivas.

# Medición de anuncios LinkedIn: alcance y propuesta

Estado **discovery documental, 19/10/2026**. No se conectó ni verificó una cuenta publicitaria
LinkedIn de Efeonce, ni se instaló/publicó un tag, creó conversión, autorizó token o envió evento.
La implementación de Google Ads/Meta no habilita LinkedIn. El inventario local revisado no contiene
un destino LinkedIn; queda pendiente comprobar también la configuración externa de hosts y HubSpot.

## Qué conectaríamos

| Capa | Para qué sirve | Propuesta Efeonce |
|---|---|---|
| Insight Tag 2.0 | Señales web y conversiones del navegador | Un único instalador GTM Web, Partner ID verificado, páginas comerciales permitidas y consentimiento |
| Conversiones específicas | Indicar que ocurrió una solicitud o reserva | Señal sólo después de aceptación/confirmación persistida; IDs por hito, no tag por formulario |
| Conversions API | Enviar hechos del servidor, incluso si el navegador no envía su copia | Destino propio de Measurement con cola y recibos; backend directo propuesto, aún sin implementar |
| HubSpot → LinkedIn | Mejorar optimización con la evolución comercial del contacto | Emisor nativo candidato para etapas CRM, sujeto a plan, permisos, consentimiento y mapping |
| LinkedIn Lead Gen Forms → HubSpot | Recibir formularios que se rellenan dentro de LinkedIn | Flujo nativo separado; no fabricar una submission de nuestro sitio |

El [Insight Tag oficial](https://business.linkedin.com/advertise/ads/insight-tag) se ejecuta en el
navegador. GTM servidor puede alojar una integración CAPI, pero no reemplaza ese JavaScript ni
certifica por sí solo la aceptación comercial.

## Qué cuenta como conversión

- **Solicitud comercial:** Forms acepta una solicitud nueva y elegible; Grader tiene intención
  comercial confirmada. Contacto general, ebooks, empleo, soporte, newsletter y fixtures quedan fuera.
- **Reserva:** Meetings obtiene confirmación válida del proveedor y guarda el resultado definitivo.
  Abrir agenda, escoger hora o pulsar reservar no cuenta.
- **Resultado comercial posterior:** una etapa real CRM es otro hito. No volver a contar la misma
  aceptación porque HubSpot creó o actualizó un contacto.

El inventario Ads existente de13 Forms y Discovery es un punto de partida para revisar elegibilidad;
no significa que esas fuentes tengan política LinkedIn. Publicar otra versión obliga a revisar el
binding. El polling y la apertura del informe Grader tampoco crean conversiones.

## Tres nombres que conviene distinguir

**Enhanced conversion tracking** de LinkedIn facilita identificación propia con `li_fat_id`.
**Enhanced matching** permite aportar email que la biblioteca del navegador hashea.
**Conversions API** es la entrega desde servidor. Son capacidades distintas; no copiar el mecanismo
Google Enhanced Conversions, sus hashes o `gclid` como si fueran campos LinkedIn.

Proponemos comenzar con tag/eventos y preparar CAPI con email normalizado/hasheado para LinkedIn
cuando exista autorización. Enhanced matching del navegador se evaluaría aparte; no se activa por
leer un campo de email. [Fuentes y detalles de identificación](../../reference/measurement-gtm-ga4/11-linkedin-insight-tag-conversions-api.md).

## Cómo evitar contar dos veces

LinkedIn documenta una regla para navegador y otra para servidor, en la misma cuenta. Para el
mismo hecho ambas comparten `eventId`; el proveedor descuenta la copia CAPI. Un cambio de etapa
comercial usa otro ID. La aplicación debe conservar unicidad y estado de entrega propios:
esta deduplicación no demuestra que reintentar dos POST servidor sea inocuo en cualquier caso.
[Contrato oficial de deduplicación](https://learn.microsoft.com/en-us/linkedin/marketing/conversions/deduplication).

HubSpot también puede insertar el Insight Tag. Antes de usar GTM hay que revisar ese ajuste para
evitar dos instalaciones. Para cada hito CRM se elige HubSpot nativo o emisor propio; no ambos.
Los eventos de lifecycle de HubSpot no sustituyen cada aceptación de Forms ni garantizan compartir
su ID de evento. [Capacidad nativa HubSpot](https://knowledge.hubspot.com/ads/create-and-sync-ad-conversion-events-with-your-linkedin-ads-account).

## Consentimiento y evidencia

Nuestra propuesta exige permiso publicitario verificable para LinkedIn, estado desconocido/denegado
bloqueado y veto GPC; ni enviar el formulario ni tener permiso Google equivalen a esa autorización.
El backend y el navegador vuelven a comprobarla en sus límites. No activar pings sin consentimiento
por analogía con Google. No enviar identidad o hashes en dataLayer, GA4, logs ni URLs.

Se verifican por separado: configuración, aceptación comercial, envío, recepción, matching y
atribución. Un tag activo, HTTP201 o contacto CRM no prueba una conversión atribuida. Las ventanas
se fijan por regla; no se suman atribuciones LinkedIn/Google/Meta como ventas independientes.

## Qué falta para poder instalarlo

Cuenta LinkedIn Ads y rol autorizados; Partner ID/propietario del tag; dominios e instaladores
existentes; IDs de reglas y campañas asociadas; decisión de consentimiento y ECT; acceso CAPI si
se elige; conexión/tier/eventos existentes de HubSpot. Después, implementación de policy, captura,
bridge/recibo y destino LinkedIn con pruebas y release propios. Nada de ello se dio por aprobado
con esta investigación.

[Arquitectura propuesta](../../architecture/GREENHOUSE_LINKEDIN_ADS_MEASUREMENT_ARCHITECTURE_V1.md) ·
[Checklist de preparación](../../manual-de-uso/growth/preparar-medicion-linkedin.md).

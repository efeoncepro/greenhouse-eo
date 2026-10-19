# Origen comercial y canales de adquisición

Dirección conceptual aceptada por Julio19/10/2026. Nuevos campos, equivalencias y migración están
**preparados, no aplicados**. No cambia todavía la operación HubSpot.
[ADR](../../architecture/EFEONCE_COMMERCIAL_ACQUISITION_TAXONOMY_DECISION_V1.md) ·
[Preparar la transición](../../manual-de-uso/hubspot/normalizar-origen-canales-adquisicion.md).

## Para qué sirve

Permite distinguir cómo apareció una oportunidad de por dónde llegó una solicitud y qué herramienta
creó el registro. El campo histórico “Canal de adqusición” agrupa Marketing, prospección, referidos,
partners y plataformas de compras; no alcanza para explicar el recorrido comercial actual.

| Pregunta | Dato |
|---|---|
| ¿Cómo se abrió la oportunidad? | Origen comercial: inbound, prospección, referido, partner o licitación |
| ¿Por qué canal ocurrió la interacción seleccionada? | Canal: búsqueda, social, email, teléfono, mensajería, presencial, etc. |
| ¿Cuál fue la fuente concreta de ese hecho? | Plataforma o referencia comprobada |
| ¿Dónde se confirmó la solicitud? | Formulario o agenda, con su identidad y versión |
| ¿Cómo se creó el registro CRM? | Record Source nativo y sus detalles |

Original/Latest Traffic Source siguen describiendo interacciones según HubSpot; Record Source
explica creación del registro. Se conservan ambos, sin forzarlos para igualar la clasificación
comercial. Ser creado por una integración no significa que el comprador vino por una integración.

## Ejemplo de un recorrido

Investigamos una necesidad publicada en LinkedIn; Apollo aporta un correo; contactamos por Outlook;
la persona realiza una reserva. Son hechos distintos:

- LinkedIn es evidencia de la señal investigada; no demuestra clic en un anuncio.
- Apollo y Outlook son herramientas; no identifican automáticamente la adquisición del comprador.
- El contacto outbound y la reserva tienen sus propios canales/fechas e identidades.
- Discovery es el punto de conversión; la reserva no acredita asistencia ni venta.

La relación entre esos hechos se conserva explícitamente. El canal primario del negocio requiere
un criterio y evidencia; no se decide usando sólo el último valor del contacto.

## Histórico y cobertura

Lectura readonly de293 negocios no archivados:175 tienen canal,118 están vacíos. Dos de los175
incluyen Marketing y Prospección directa. Se prepararon168 equivalencias candidatas y125 casos
para revisión, sin modificar ninguno. Marketing no se interpreta automáticamente como inbound,
Google Ads, LinkedIn Ads, SEO ni orgánico. [Conteos y propuesta](../../audits/commercial/2026-10-19-acquisition-taxonomy-discovery.json).

Se proponen tres campos de Deal para origen, canal y fuente primaria, sólo si completamos la
revisión de consumidores y no hay equivalentes adecuados. Su identidad/nombres están en el ADR.
No sustituyen la trazabilidad por solicitud. Los campos antiguos y sus valores se conservarán.
No cambia la calificación, consentimiento, servicio contratado ni estado de un negocio.

Los workflows no pudieron inventariarse por permisos403. El listado de informes no basta para
certificar todas sus dependencias; otros consumidores y filtros cruzados siguen pendientes.
La propuesta está lista para revisión, **no lista para aplicar una migración**.

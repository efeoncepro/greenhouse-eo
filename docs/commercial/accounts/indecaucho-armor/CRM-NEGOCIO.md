# ARMOR EPPS — negocio en HubSpot

> **Tipo:** registro interno del expediente · **Portal:** Efeonce `48713323`

## Alta del negocio — 28/10/2026

Autorizado por Julio en el chat: «Sí, crea el negocio […] y haz el readback». Antes de crearlo se verificó que no
existía ningún negocio de ARMOR o Indecaucho: 0 asociados a las Companies 59393386572 y 60018354510, al Contact
255985568411, y 0 con «armor» en el nombre.

| Campo | Valor leído después del alta |
| --- | --- |
| Deal | **66992325527**, `ARMOR | EC | Piloto de Performance | 2026-10` |
| Pipeline / etapa | `default` / `qualifiedtobuy` (Calificado para comprar) |
| Monto | Vacío (el precio no está aprobado) |
| Fecha de cierre | 2026-11-04: referencia de la revisión con la gerencia, no un cierre pactado |
| Propietario | Julio Reyes (75788512) |
| Company | 59393386572 (Indecaucho, `indecaucho.com`), etiqueta **Primary** |
| Contact | 255985568411 |
| Meeting | 119610757452 (reunión del 27/10), asociación en ambos sentidos |

El readback de las asociaciones se hizo con la HubSpot Agent CLI (`associations list --from deals:66992325527`). El
índice de búsqueda tardó en reflejar el negocio filtrando por Company y Contact.

## Propuesta enviada — 28/10/2026

Autorizado por Julio en el chat. Readback del negocio 66992325527 después de actualizarlo:

| Campo | Antes | Ahora |
| --- | --- | --- |
| Etapa | `qualifiedtobuy` (Calificado para comprar) | `presentationscheduled` (Presentación de soluciones) |
| Monto | Vacío | **9.260 USD** (honorarios del piloto; los medios los paga ARMOR y no son ingreso de Efeonce) |
| Moneda | Vacía | USD |
| Fecha de cierre | 2026-11-04 | Sin cambio (revisión con la gerencia) |
| Descripción | Vacía | Resumen del precio, la Fase 0 bonificada, los medios y el calendario |

Nota **119882988849** asociada al negocio, al contacto 255985568411 y a la empresa 59393386572, con los tres
enlaces del paquete. Detalle en [ENVIO-PROPUESTA-2026-10-28](ENVIO-PROPUESTA-2026-10-28.md).

## Pendiente

- El duplicado de la empresa, 60018354510 (`indecaucho.ec`), y el del contacto, 257975486849, siguen sin fusionar y
  sin el negocio.
- Monto y etapa: actualizados el 28/10 (arriba).

## Segundo negocio: HubSpot para el grupo — 28/10/2026

Lo pidió Julio en el chat: «Crea otro negocio aparte para poder abrir un shared deal con HubSpot para venderles
HubSpot». La razón: en una venta B2B por empresa, con prueba en planta y distribuidores, Kommo se queda corto
(ver `MEDICION-SITIO-2026-10-28.md`). Todavía no se ha conversado HubSpot con ARMOR.

| Campo | Valor leído después del alta |
| --- | --- |
| Deal | **67005802089**, `ARMOR | EC | Licenciamiento e implementación HubSpot | 2026-10` |
| Pipeline / etapa | `default` / `appointmentscheduled` (Cita programada, primera etapa) |
| Tipo | New Business |
| Monto / cierre | Vacíos |
| Propietario | Julio Reyes (75788512) |
| Asociaciones | Company 59393386572 (**Primary**), Contact 255985568411, Meeting 119610757452 |

**Convertido en negocio compartido el 28/10/2026, ~09:18 (GMT-3)**, con autorización de Julio en el chat: liderazgo
Partner, cierre 31/03/2027, Sales Hub Professional, cercanía «Aún no hemos hablado de HubSpot», mensaje propuesto y
la declaración del programa confirmada por él. Se hizo por la interfaz, siguiendo el
[manual](../../../manual-de-uso/hubspot/convertir-negocio-compartido.md).

| Campo del formulario | Valor enviado |
| --- | --- |
| Fecha de cierre local | 31/03/2027 (`2027-03-31T15:00:00Z`: guardada a mediodía para que no se muestre 30/03 en GMT-3) |
| Interés en el producto | Sales Hub Professional |
| Liderazgo | **Partner** (verificado en el formulario antes de enviar) |
| Cercanía | Aún no hemos hablado de HubSpot |
| Oportunidad | Mensaje aprobado, más «Sales Hub Professional sería la base; Marketing Hub también puede tener sentido, sin edición definida todavía». |
| Ayuda requerida | Saber si hay programas o incentivos de migración desde otro CRM para el mercado andino, y coordinar antes de proponérselo a ARMOR. |
| Próximos pasos | Coordinar con el especialista antes de plantearles HubSpot; mientras tanto, se presenta la propuesta del piloto de 90 días. |

Lo que muestra la tarjeta después del envío: tipo «Negocio de colaboración iniciada por el partner», etapa de HubSpot
**Discovery**, Sales Hub Professional, PDM Simón Suárez, y el especialista de crecimiento «Pendiente, conectando con un
ejecutivo» (aviso: «está tardando más de lo usual»). La «Fecha de cierre de HubSpot» aparece vacía. HubSpot creó
además la nota automática 119760808326 con recursos de Sales Hub y la tarea «Configurar primera llamada de
estrategia» para el 02/11. En el Deal local se mantienen el pipeline `default`, la etapa `appointmentscheduled` y el
cierre `2027-03-31T15:00:00Z`.

**Pendiente de verificar:** el mensaje compartido todavía no aparece en el registro, y tampoco la fecha de cierre de
HubSpot. Hay que volver a mirar cuando se asigne el especialista y, si hace falta, corregir el mensaje desde su cuerpo
(ver el manual). No hay POI.

Las propiedades `prospect_source` y `modalidad_venta` que nombra la plantilla de deal registration no existen en el
portal (consultado el 28/10).

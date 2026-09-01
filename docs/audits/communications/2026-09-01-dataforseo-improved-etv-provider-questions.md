# DataForSEO Improved ETV — correo de aclaración contractual

- Fecha: 2026-09-01
- Estado: **borrador; no enviado**
- Canal principal: responder al remitente visible del aviso de cuenta
- Destinatario: Yevhen Tishchenko `<yevhen.tishchenko@dataforseo.com>`
- Asunto: `Questions about the improved ETV rollout and API contract`
- Fallback si rebota o no responde: [formulario oficial](https://dataforseo.com/contact), chat de soporte o `info@dataforseo.com`

## Borrador

Hi Yevhen,

Thank you for the advance notice about the improved ETV formula. We use ETV across current and historical
DataForSEO Labs workflows, so we want to adopt the new methodology without introducing unexplained breaks in
our time series.

Could you please clarify the following points?

1. Which exact DataForSEO Labs endpoints and response fields support `use_improved_etv`?
2. Does the new formula apply only to organic `etv`, or also to paid, featured snippet, local pack, AI Overview
   reference, and other ETV aggregates?
3. Until November 1, 2026, is the default `false`, with `true` opting into the new formula? After that date, will
   `false` still preserve the legacy calculation, and if so, until when?
4. What is the exact cutover time and timezone?
5. For Historical Rank Overview and Historical Bulk Traffic Estimation, does the improved formula recalculate
   prior periods, return a parallel historical series, or only affect data collected after the cutover?
6. Can the same historical month return different ETV values depending on `use_improved_etv`, and is the applied
   formula version exposed anywhere in the response?
7. Will `estimated_paid_traffic_cost` be recalculated from the improved organic ETV?
8. How does `use_improved_etv` interact with `include_clickstream_data` and the separate `clickstream_etv` field?
   Can both parameters be used together?
9. Does `use_improved_etv` change request pricing? Does the existing double-price rule remain limited to
   `include_clickstream_data: true`?
10. Is the new parameter already supported in Sandbox, and can you share an updated API reference, OpenAPI
    specification, changelog entry, or request/response example?

An endpoint compatibility matrix and guidance on preserving comparable historical series would be especially
helpful.

Best regards,  
Julio Reyes Rangel

## Notas operativas

- El remitente visible no es una dirección `no-reply`; responder a ese hilo es el primer canal razonable.
- El correo pide contrato, no soporte de implementación. No incluye credenciales, payloads reales, clientes ni
  datos sensibles.
- La respuesta del proveedor se debe anexar a la decisión y a `TASK-1805` antes de aprobar llamadas pagadas o
  activar una metodología nueva.
- Este archivo no constituye evidencia de envío. El estado cambia sólo después de verificar Outlook/Sent y, si
  corresponde, una respuesta o ticket del proveedor.


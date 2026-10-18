# Identidad nativa de cada envío a HubSpot

Estado 2026-10-18: schema y worker compatibles servidos; trazabilidad de Performance configurada
y verificada. La primera identidad nativa de una ocurrencia sigue pendiente.
[Reparación y readback](../../audits/releases/2026-10-18-candidate-89d70ec13-review.md).
[Configuración activa y evidencia](../../audits/growth/2026-10-18-google-ads-activation.md).
[ADR](../../architecture/GREENHOUSE_HUBSPOT_FORM_RECEIPT_DECISION_V1.md).

El POST Forms autenticado documenta una respuesta de presentación (`inlineMessage`/`redirectUri`),
sin `conversionId` garantizado. `external_id=hsforms-fsub-*` conserva su significado de recibo local.
No se extrae un ID inventado del HTTP 200 ni se reenvía el formulario para obtenerlo.

El destino permite configurar `submissionIdProperty=ef_greenhouse_submission_id`. El adapter envía
ese campo técnico desde el UUID de fuente generado en servidor, nunca desde valores del visitante.
La propiedad string/text debe existir y estar incluida como campo oculto y no requerido del form
nativo. No añade campos al render contract ni valores a URL, GA4 o Meta.

En Performance quedó activo el 18/10/2026: portal `48713323`, app `33235280`, formulario nativo
`89652ccf-8393-4361-a650-878982132cfe` y destino existente
`fdst-563c7c71-fda6-4fde-a327-5786986b61ee`. Propiedad string/text con `formField=true`, grupo
`greenhouse_growth_forms`; el form conserva los 13 campos/grupos originales y añade sólo el 14.º
oculto y opcional. Los defaults `groupType=default_group` y `richTextType=text` que HubSpot añadió
al grupo nuevo se reconciliaron por GET, sin repetir PATCH. El command canónico habilitó el opt-in
mediante CAS, conservando mapping comercial, fuente y políticas. Propiedad, formulario y mapping
pasaron readback; esta configuración no certifica todavía una ocurrencia nativa.

Después de HTTP exitoso el intento guarda un `hubspot-form-receipt.v1` pendiente con portal, form,
propiedad/marcador y próxima consulta. La identidad de la ocurrencia es `fsub-*`; la identidad nativa
que buscamos es `conversionId`. La propiedad actual del contacto puede cambiar y no se usa para
verificar: el lector comprueba los `values` históricos de cada submission.

Cada drain existente del worker comprueba el schema antes del POST y reconcilia hasta un recibo
pendiente, incluso sin nuevos leads comerciales. Usa sólo GET, máximo tres páginas de 50 filas,
ocho comprobaciones con backoff y un horizonte de 24 horas. El lector confirma el portal canónico,
no sigue URLs del proveedor y mantiene límites de tiempo/tamaño. Credencial HubSpot canónica.

Sólo un marcador exacto, un único `conversionId` válido y una paginación completa permiten guardar
`provider_submission_id`. Se persisten fecha, cobertura y número de checks mediante compare-and-swap
del snapshot completo. Un recibo terminal y un ID verificado no se reemplazan. `ambiguous`, `denied`
y `exhausted` quedan explícitos; un error/cobertura parcial puede mantenerlo pendiente hasta el tope.
No se convierte el fallo de consulta en fallo comercial ni en otro POST. El summary del drain expone
`hubspotReceipts` con contadores de verificados/pendientes/terminales/indisponibles, sin payloads.

La CLI `meta leads trace` muestra el ID nativo ya persistido también con `--source-only`. Puede
releer por ID y marcador exactos, sin exigir coincidencia de email/hora. Lectura usa snapshot del
recibo, no el destino actual; JSON allowlisted sin respuestas crudas o identidad personal.
Los leads previos sin marcador conservan correlación, incluido el Performance histórico auditado;
guardar un candidato retrospectivo no lo convertiría en una prueba exacta. El primer marcador/ID
nativo exacto debe verificarse sobre el próximo envío real autorizado; no hay backfill ni replay.

Activación: [manual](../../manual-de-uso/growth/guardar-identidad-nativa-hubspot.md).
Meta tiene límites distintos: [verificación individual](meta-individual-event-verification.md).

Revisión final local: estados verificados requieren checks/fecha/cobertura válidos también al leer;
marcador sin ID nativo no basta. Fechas inválidas no abortan la selección SQL del reconciliador.
La CLI agrega múltiples destinos por ocurrencia, conserva IDs nativos por destino y declara cobertura
parcial ante evidencia mixta. [Revisión y regresiones](../../audits/growth/2026-10-17-meta-cli-final-review.md).

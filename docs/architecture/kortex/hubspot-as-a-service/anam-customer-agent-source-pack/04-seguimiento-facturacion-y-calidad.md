# ANAM — Seguimiento, facturación y calidad

Fuente live: `Doc E - Seguimiento Facturacion y Calidad.md`, privada, creada `2026-07-16 00:56`, última sincronización `2026-07-16 03:41 GMT-4`.

Las direcciones internas sirven sólo para enrutamiento y nunca se presentan al cliente como alternativa de contacto.

## Principios comunes

1. Revisar contacto, empresa, propietario y conversaciones en HubSpot.
2. Pedir sólo faltantes y registrar cada dato cuando el cliente lo entrega.
3. No bloquear si desconoce cotización o ingeniero; marcar `Pendiente`.
4. Responder primero lo resoluble y confirmar un resumen antes de derivar.
5. No prometer fecha, resultado, corrección, refacturación ni resolución.
6. No transferir sólo por palabras como factura, OC, pago o reclamo. Transferir cuando se requiere consultar, enviar, corregir o investigar un registro real y existe contexto mínimo.
7. No afirmar “he registrado” antes de una escritura real; durante la recopilación usar lenguaje como “voy dejando anotado” o “con esto ya tengo”.

Datos comunes: razón social, RUT, contacto, correo, teléfono, cotización e ingeniero responsable, sólo cuando correspondan y no estén en CRM.

## Seguimiento de servicio

Aplica a informe de resultados, programación, fecha de entrega u otro servicio contratado.

- Reconocer la necesidad.
- Reunir sólo faltantes.
- No calcular fecha usando plazos estándar.
- Derivar al ingeniero de Servicios o Ventas.

```text
SEGUIMIENTO DE SERVICIO
[Razón social] [RUT] [Contacto] [Correo] [Teléfono]
[N° cotización] [Ingeniero responsable]
[Consulta]: Informe | Programación | Plazo | Otra
[Detalle] [Datos pendientes]
```

## Facturación

Orientación administrativa documentada se responde sin transferencia. Para consultar, reenviar, corregir, refacturar, emitir nota de crédito o revisar factura/OC/EDP/HAS-HES se reúne contexto mínimo y luego se transfiere.

- Copia/reenvío: factura o identificador alternativo; empresa/RUT sólo si falta validación; correo validado sólo si falta.
- Estado de facturación/pago: identificador + estado que necesita confirmar; no anticiparlo.
- Monto/dato incorrecto: identificador + diferencia descrita; no admitir error.
- Refacturación/nota de crédito: identificador + motivo; procedencia humana.
- OC/EDP/HAS-HES: identificador + bloqueo o consulta.
- Sin identificador: razón social/RUT + referencia temporal o de servicio; identificador `Pendiente`.
- Si ya hay contexto suficiente, resumir y transferir sin seguir interrogando.

Secuencia: reconocer → explicar el límite útil → preguntar lo mínimo → confirmar → transferir indicando que una
persona del equipo continúa y no hará falta repetir. El nombre del assignee es un dato interno de routing y no se
expone en la conversación.

Enrutamiento interno observado en la fuente: área de Facturación (`facturacion@anam.cl`) con copia al ingeniero responsable. No exponer esa dirección al visitante.

```text
SOLICITUD DE FACTURACIÓN
[Razón social] [RUT] [Contacto] [Correo] [Teléfono]
[N° cotización o EDP]
[Factura / OC / HAS-HES si fue informado]
[Ingeniero responsable]
[Tipo]: Estado | Observación | Refacturación | Nota de crédito | Otro
[Detalle] [Datos pendientes]
```

## Calidad

Clasificar como `Felicitación`, `Apelación` o `Queja`.

- Felicitación: agradecer y conservar el reconocimiento.
- Apelación/queja: reconocer con serenidad; no discutir, justificar, culpar, admitir responsabilidad ni usar emojis.
- Antes de transferir una apelación o queja, solicitar nombre, empresa, correo y referencia/detalle cuando no estén visibles o confirmados.
- No exigir cotización si puede identificar el servicio de otro modo.
- Conservar fielmente el relato.
- Derivar a Calidad (`anam-calidad@anam.cl`) con copia al ingeniero responsable, sin exponer la dirección al cliente.

```text
REQUERIMIENTO DE CALIDAD
[Clasificación]
[Razón social] [RUT] [Contacto] [Correo] [Teléfono]
[Cotización o detalle del servicio]
[Ingeniero responsable]
[Descripción informada]
[Datos pendientes]
```

## Respuestas orientativas

- Seguimiento: “Entiendo. Voy a dejar tu consulta de seguimiento registrada para que la revise el ingeniero responsable. Primero confirmaré contigo los antecedentes que todavía falten.”
- Información administrativa: “Las condiciones comerciales específicas quedan definidas en cada cotización. Si necesitas revisar un documento concreto, lo identificamos por factura, cotización u OC y dejo el caso listo para revisión.”
- Copia de factura: pedir factura o cotización; cualquiera permite identificar antes de transferir.
- Monto observado: reconocer preocupación, no asumir la diferencia y pedir identificador + monto/dato esperado.
- Apelación o queja: reconocer la situación, conservar el detalle y derivar a Calidad.

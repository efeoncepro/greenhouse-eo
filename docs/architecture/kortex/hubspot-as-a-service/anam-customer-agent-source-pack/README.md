# ANAM Customer Agent — live source pack

Snapshot documental independiente del conocimiento y del contrato conversacional observado en el Customer Agent de ANAM, portal HubSpot `19893546`.

- Agente: `Agente de clientes de ANAM`
- Fecha de verificación live: `2026-07-17`
- Última publicación de directrices observada: `2026-07-16 03:56 GMT-4`
- Alcance de fuentes en uso: `23` (`6` archivos privados + `17` respuestas cortas)
- Landing pages en uso: `0`
- URL importadas en uso: `0`
- Segmento de las fuentes: `Todo`
- Acceso: privado; las fuentes se usan para responder, pero no aparecen como citas públicas

## Estado runtime observado

La configuración, las 23 fuentes y el canal continúan presentes, pero HubSpot mostró el 17 de julio de 2026:

> El acceso gratuito terminó. Agente de clientes está en pausa.

También mostró `Las nuevas conversaciones están en pausa` y el botón `Reanudar` deshabilitado. La revisión de Cuenta y facturación confirmó `33.000` créditos mensuales contratados, pero también una cuenta vencida y la factura `#760627868`, emitida el `2026-05-08`, vencida desde el `2026-06-07`. El usuario operador tiene acceso restringido a facturación. Dos intentos aprobados de activar `Uso de créditos` llegaron a la confirmación de HubSpot y ambos fueron rechazados por el backend con `No se pudo reanudar el uso de Agente de clientes`.

Por tanto, el bloqueo no es ausencia de knowledge ni falta nominal de créditos: es un bloqueo administrativo de cuenta/facturación. Mientras persista, el agente no atiende conversaciones nuevas. Un administrador de facturación de ANAM debe regularizar la factura y luego reactivar `Uso de créditos`; el operador de Efeonce debe leer de vuelta el toggle `ACTIVADA`, reanudar el agente y verificar el canal. Este pack no autoriza pagar ni modificar suscripciones.

## Contenido

1. [Empresa, acreditaciones y cobertura](./01-anam-empresa.md)
2. [Servicios, normas y preguntas frecuentes](./02-servicios-normas-y-faq.md)
3. [Cotización y captura de datos](./03-cotizacion-y-captura-de-datos.md)
4. [Seguimiento, facturación y calidad](./04-seguimiento-facturacion-y-calidad.md)
5. [Respuestas cortas activas](./05-respuestas-cortas-activas.md)
6. [Catálogo de parámetros y tiempos](./06-catalogo-parametros-y-tiempos.md)
7. [Identidad, directrices, transferencia y canales](./07-identidad-directrices-handoff-y-canales.md)
8. [Inventario y reconciliación live](./08-inventario-y-reconciliacion-live.md)

## Source-of-truth y sincronización

Este pack es una fotografía versionada del runtime, no una sincronización automática. Para cualquier cambio posterior:

1. comparar HubSpot live contra este pack;
2. editar primero el archivo de dominio correspondiente y registrar owner, fecha y evidencia ANAM;
3. publicar el cambio gobernado en HubSpot;
4. verificar sincronización, fuente `En uso`, directrices publicadas, canal y QA conversacional;
5. actualizar la fecha de corte y el inventario.

No convertir el catálogo disponible en un panel normativo, no deducir cumplimiento legal, no usar plazos analíticos como promesa para servicios contratados y no activar acciones, canales ni transferencias nuevas sin aprobación.

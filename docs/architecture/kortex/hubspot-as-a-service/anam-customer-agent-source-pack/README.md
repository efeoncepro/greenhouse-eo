# ANAM Customer Agent — live source pack

Snapshot documental independiente del conocimiento y del contrato conversacional observado en el Customer Agent de ANAM, portal HubSpot `19893546`.

- Agente: `Emma` (nombre anterior: `Agente de clientes de ANAM`)
- Fecha de verificación live: `2026-09-01`
- Última publicación de directrices observada: `2026-09-01`
- Alcance de fuentes en uso: `23` (`6` archivos privados + `17` respuestas cortas)
- Landing pages en uso: `0`
- URL importadas en uso: `0`
- Segmento de las fuentes: `Todo`
- Acceso: privado; las fuentes se usan para responder, pero no aparecen como citas públicas

## Estado runtime observado

El bloqueo administrativo observado el 17 de julio de 2026 es histórico. El readback autenticado del 24 de julio
confirmó el agente operativo, con 23 fuentes, live chat activo y 33.000 créditos por ciclo. El 1 de septiembre se
guardó y publicó la identidad `Emma`: la vista de identidad mostró `Agente de clientes, Emma`, el preview respondió
`Hola, soy Emma.` y la pantalla de directrices quedó en `Borrador (0)` con el saludo publicado
`¡Hola! 👋 Soy Emma, de ANAM. ¿En qué te puedo orientar?`.

La edición de identidad no modificó personalidad (`Amigable`), idioma, conocimiento, permisos ni acciones. Más
tarde el mismo 1 de septiembre, la matriz de handoff autorizada se publicó por separado mediante el workflow de
tickets `1876744588` y se verificó con tres conversaciones públicas E2E. El contrato y la evidencia viven en
`07-identidad-directrices-handoff-y-canales.md` y
`docs/audits/ANAM_CUSTOMER_AGENT_HANDOFF_E2E_QA_2026-09-01.md`.

El preflight de publicación conservó dos advertencias preexistentes sobre la promesa `Registraré tu consulta`;
deben resolverse en un cambio separado y con regresión conversacional, no dentro de la actualización de identidad
o routing.

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

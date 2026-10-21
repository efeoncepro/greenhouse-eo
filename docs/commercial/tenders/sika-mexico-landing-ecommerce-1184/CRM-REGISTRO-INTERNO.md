# Registro CRM interno — Sika LIC-1184

## Mandato y ruta

Julio pidió «crear esta licitación como Deal… tanto en HubSpot como en el repo… la vamos a trabajar eventualmente, ese es el brief» y señaló `efeonce-b2b-prospecting`. Autorización de alta y documentación, no de propuesta, contacto, gasto ni postulación. No se requirió otra aprobación del mismo alcance.

HubSpot Agent CLI con OAuth de Julio, portal48713323, identidad comprobada mediante `whoami`; MCP corroboró mismo portal/owner y permisos Deal/Company/Note. Lectura de pipeline y propiedades por MCP porque `pipelines list` CLI no admite OAuth de usuario. CLI `objects create --dry-run` de Deal y Note: `executed:false`; escrituras posteriores separadas. Lecturas independientes por MCP y CLI.

## Plan de captura por objeto y fase

| Objeto / fase | Acción | Completar / conservar | Pendiente / sistema |
| --- | --- | --- | --- |
| Company / cuenta existente | Reutilizar59084984648 como Primary | Nombre legal, RFC en descripción y paísMéxico corroborados; no se editan propiedades de la cuenta | No inferir relación cliente de otros negocios ni de lifecycle opportunity |
| Deal / intake autorizado | Crear66308025451 | Nombre canónico, owner75788512, default/appointmentscheduled, descripción con brief literal, origenWherEX, modalidadLicitación, newbusiness, Strategic Bets, servicios desarrollo_web/agencia_creativa/performance_paid_media/data_analytics, próximo paso, LIC-1184, ficha exacta y llave técnica de deduplicación según contrato de licitaciones | amount, moneda contractual, presupuesto, closedate, datetime del plazo y unidad líder sin evidencia quedan vacíos. Fechas sólo textuales. Propiedades calculadas/atribución sin editar |
| Note / brief | Crear118981930299 | Brief, autorización, fuentes, requisitos y pendientes; asociada al Deal66308025451 y Company59084984648 | No acredita oferta presentada ni aceptación del comprador |
| Contact / Lead | No crear ni modificar | Procesos e identidades anteriores preservados | Responsable LIC-1184 no identificado; no asociar por cargo/parentesco con otro proceso |

El pipeline sólo ofrece como primera etapa abierta «Cita programada». Se usa como estado administrativo de entrada por mandato de crear Deal, con la ausencia de reunión/calificación expresamente indicada. No cambiar el schema para este intake.

## Evidencia de deduplicación y escrituras

- Búsqueda antes del alta por `id_de_licitacion` en LIC-1184/1184/SKA-1184, `gh_idempotency_key=hubspot-private-tender:wherex:LIC-1184` y nombre con1184: cero resultados. Otros negocios Sika no se modifican.
- Deal creado:66308025451. [Abrir](https://app.hubspot.com/contacts/48713323/record/0-3/66308025451).
- Company59084984648 Primary: etiquetas/tipos5 y341 leídos tras alta y al cierre.
- Nota118981930299: cuerpo completo leído por MCP; asociaciones independientes a Deal(tipo214) y Company(tipo190) verificadas.
- Readback primero por MCP: nombre, descripción, campos comerciales e identidad coinciden. Segundo readback por MCP y CLI tras trabajo documental: `pipeline_bucket=Strategic Bets`, `dealtype=newbusiness`, monto/moneda/closedate/fecha_de_cierre_de_licitacion vacíos. Sin deriva observada al corte; no certifica futuras automatizaciones.
- Corte final de la verificación: `2026-10-19T21:55:02.956663+00:00`. Recibos de ejecución de esta sesión fuera de Git: `/tmp/sika-1184-intake/`; son temporales, este documento conserva los resultados durables.

## Estado de trabajo y retorno — corte inicial, superado por la actualización siguiente

Brief de captura íntegro en `bases/`, portal leído; pendiente decidir preparación y confirmar zona del cierre22/10/2026 19:00. No hay tareas de seguimiento creadas, envíos, oferta, aceptación contractual ni Proposal registrado. Original adicional BRIEF listado por Wherex no descargado; no se usa como evidencia de contenido. El siguiente agente debe leer README, fuentes y transcripción, refrescar el portal y pedir únicamente decisiones nuevas que realmente requiera preparar/presentar.

## Actualización autorizada — aclaraciones del comprador 19/10/2026

Julio pidió «Suma esto» y adjuntó captura del centro de mensajes de LIC-1184. La [fuente completa y lectura operativa](bases/ACLARACIONES-2026-10-19.md) conserva respuesta19/10 19:18 sin zona, requisitos, desconocidos y discrepancia de pago. No se atribuye la pregunta de proveedor a Efeonce.

Cambios ejecutados en Deal `66308025451`: `description` incorpora las aclaraciones al inicio y rotula el intake anterior como histórico; `hs_next_step` indica HOLD de preparación por requisito sólo México; `deal_currency_code` vacío → `MXN`, ahora solicitado expresamente por el comprador. Se preservan nombre, owner, etapa, pipeline, bucket, tipo, monto vacío, closedate vacío y datetime del plazo vacío. HOLD está en descripción/próximo paso y expediente; no se creó una etapa ni se movió a perdido.

Nota adicional **118923969934** creada con aclaraciones y asociada a Deal66308025451 y Company59084984648. Nota inicial118981930299 preservada como historia. Preview de update: `executed:false`, digest `blast-a59ae2705d87`; ejecución confirmada para el ID exacto. Note también pasó dry-run antes del create.

Verificación independiente al `2026-10-19T23:22:14.565796+00:00`: lectura CLI exacta de las tres propiedades vs payload; campos preservados comparados contra prestate; MCP confirmó MXN/próximo paso/etapa/bucket; nota leída íntegra y asociaciones a Deal/Company verificadas por separado. Sin oferta, envíos, aceptación de condiciones, nuevo contacto ni automatización.

**Próximo paso histórico, superado por el descarte:** Julio debía acreditar entidad mexicana elegible o excepción expresa antes de preparar. Luego validar alcance/capacidad del paquete completo en1–2 semanas y caja con pago desde aprobación final. Ver pendientes técnicos y contradicciones en el documento de aclaraciones; no retomar desde el intake inicial.

## Cierre final por instrucción de Julio — 19/10/2026

**NO-BID / `closedlost`** por requisito «NO, SOLO MÉXICO», verificado en CLI y MCP. Motivo completo en `closed_lost_reason`; descripción y próximo paso sustituyen el HOLD vigente por descarte terminal y conservan antecedentes históricos. Sin oferta presentada ni derrota competitiva inferida. Monto/moneda/pipeline/bucket/owner preservados; `closedate` observado `2026-10-19T23:24:09.253Z`, administrado por HubSpot. [Mandato, fuente y verificación](research/CIERRE-2026-10-19-INTERNO.md). No preparar, buscar excepción ni dar seguimiento; reapertura sólo por nueva instrucción.

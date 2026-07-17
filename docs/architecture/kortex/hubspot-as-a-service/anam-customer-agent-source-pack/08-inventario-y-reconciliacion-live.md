# ANAM — Inventario y reconciliación live

## Archivos privados en uso

| Fuente | HubSpot file ID | Creado | Última sincronización | Estado |
|---|---:|---|---|---|
| Doc A - ANAM Empresa.md | `215746237578` | 2026-06-24 10:46 | 2026-06-24 10:46 | Sincronizada |
| Doc B - Servicios y Normas.md | `215755204520` | 2026-06-24 10:46 | 2026-07-16 03:32 | Sincronizada |
| Doc D - Preguntas Frecuentes.md | `215755215004` | 2026-06-24 10:46 | 2026-07-16 03:40 | Sincronizada |
| Doc C - Cotizacion y Captura de Datos - Canonico.md | `215760854289` | 2026-06-24 12:37 | 2026-07-16 03:31 | Sincronizada |
| Doc E - Seguimiento Facturacion y Calidad.md | `217254907290` | 2026-07-16 00:56 | 2026-07-16 03:41 | Sincronizada |
| Doc F - Catalogo de Parametros y Tiempos.md | `217254907291` | 2026-07-16 00:56 | 2026-07-16 00:56 | Sincronizada |

Todas aplican a `Todo`, son privadas, se usan para respuestas y no se muestran en citas. La columna de citas aparece `DESACTIVADA`.

## Conteo reconciliado

| Tipo | En uso |
|---|---:|
| Landing page | 0 |
| URL importada | 0 |
| Archivos | 6 |
| Respuesta corta | 17 |
| Total | 23 |

## Catálogo técnico

- Validado por ANAM: `2026-07-03`.
- Fuente declarada: `Resumen parametros.xlsx`, recibido de María Paz Haeger.
- Registros publicados declarados: `356`.
- Matrices: Agua Cruda, Agua Lluvia, Agua Mar, Agua Potable, Agua Servida, Agua Servida tratada, Lodos, Mezcla RILES con Aguas Servidas, RILES y Residuos Peligrosos.
- La tabla versionada conserva `356` filas de datos; los encabezados no cuentan como registros.

## Reconciliación con documentación local previa

Confirmado live:

- seis fuentes Markdown de dominio;
- catálogo de parámetros, métodos, límites y días estándar;
- 17 respuestas cortas de casos críticos;
- directrices publicadas el 16 de julio;
- handoff a María Paz / Asistencia al cliente;
- chatflow 24/7 con 100% de cobertura configurada;
- cero acciones publicadas y dos borradores.

Drift detectado:

- La documentación del 16 de julio decía que no existía bloqueo actual de continuidad después de confirmar compra y 30.000 créditos.
- El runtime del 17 de julio muestra término de acceso gratuito, agente pausado y `Reanudar` deshabilitado.
- Cuenta y facturación muestra `33.000` créditos mensuales, pero la cuenta está vencida y existe una factura atrasada: `#760627868`, emitida el `2026-05-08`, vencimiento `2026-06-07`.
- El usuario operador tiene acceso restringido a facturación. Dos confirmaciones explícitas de `Activar` fueron rechazadas con `No se pudo reanudar el uso de Agente de clientes`; el toggle permaneció `DESACTIVADA`.

Acción requerida: un administrador de facturación de ANAM debe regularizar la factura vencida. Después, reintentar `Cuenta y facturación -> Créditos de HubSpot -> Agente de clientes -> Uso de créditos`, comprobar `ACTIVADA`, reanudar el agente y verificar que acepte conversaciones nuevas. No se cambió facturación ni se logró una mutación efectiva de HubSpot durante esta captura.

## Checks antes de republicar knowledge

- Aprobación ANAM para hechos, normas, catálogos y condiciones operativas.
- Diff de la fuente afectada y fecha de corte.
- Sin contradicciones entre archivos, respuestas cortas y directrices.
- Fuente sincronizada y `En uso`.
- Directrices publicadas.
- QA informativa, cotización, facturación, calidad, multiintención y no-alucinación.
- Verificación de canal, entitlement/créditos, assignee y permisos de Service.
- Actualización de este inventario y del QA report.

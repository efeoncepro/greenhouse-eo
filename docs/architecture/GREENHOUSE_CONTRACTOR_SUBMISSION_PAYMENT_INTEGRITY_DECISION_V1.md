# Contractor submission and payment integrity

- Status: Accepted
- Date: 2026-10-05
- Owner: HR / Finance / Platform
- Scope: TASK-2009, TASK-2010; reparación autorizada de ISSUE-179 para todos los contractors.
- Reversibility: two-way
- Confidence: high
- Validated as of: 2026-10-05, código/schema y auditoría de sólo lectura; rollout no aplicado.

## Context

La auditoría encontró fallos en las invariantes ya aceptadas de monto acordado, scope propio, evidencia del período y orden/pago. La autorización del operador «Corrígelos todos» cubre la reparación local, no desembolsos, emails, deploy ni recovery de datos reales.

## Decision

1. El primitive self-service deriva moneda y monto del engagement. Sólo acepta declaraciones de trabajo coherentes con la tarifa: unit-rate requiere cantidad positiva y unidad correcta, con hasta cuatro decimales conforme a `NUMERIC(18,4)`; period-rate no se multiplica por horas. Al actualizar un borrador propio, el snapshot de tarifa se refresca junto al importe y moneda derivados.
2. Un intento posee clave estable. La PK del envío se deriva de actor, engagement y clave; advisory lock y transacción agrupan create/update draft, adjuntos y submit. El engagement se bloquea con `FOR NO KEY UPDATE`: excluye cambios de tarifa/estado mientras permite el FK key-share de un attach concurrente, evitando el ciclo engagement → submission → engagement. Repetir un envío ya presentado devuelve el mismo resultado si coincide el contenido; no re-emite eventos. Mismo intento con contenido incompatible produce conflicto.
3. Un adjunto contractor exige member ownership, contexto permitido y submission del mismo engagement. Una invoice requerida se vincula al envío/período; el asset actual debe estar attached y accesible. Repetir exactamente el vínculo devuelve su fila; no se reasigna un documento a otro período. El writer compartido de borradores conserva la marca de cambio de período para todo entrypoint, incluido HR: una invoice antigua sin snapshot de fechas pierde vigencia y la metadata no puede quitar esa protección.
4. Todos los entrypoints de orden contractor escriben el vínculo en la misma transacción que sus lines. Reemplazar el vínculo requiere que la orden anterior esté cancelled/failed, no haya settlement y la nueva pague la misma obligación.
5. El modelo actual de contractor (un payment_order_id y comprobante del neto total) paga obligaciones completas. Se rechazan parciales contractor antes de crear órdenes, incluidos imports nuevos; paid sólo se permite con orden paid, obligación correspondiente y suma pagada suficiente en su moneda. No se introduce un sistema de cuotas ni se modifica el soporte genérico de parciales de otros dominios.
6. El cascade puede descubrir vínculos históricos por obligación/lines y reparar sólo mediante commands validados. Recuperar el drift real se prepara en preview separado y exige despliegues/readback antes de apply; no genera otro desembolso. Los efectos de comprobante/email se declaran en ese plan.

## Alternatives Considered

- Adjuntar después de submit: permite envíos incompletos y duplicados; rechazado.
- Idempotencia sólo en botón/cache: no protege timeout, doble click o concurrent retry; rechazado.
- Reusar boleta del engagement sin vínculo: pierde semántica por período; rechazado.
- Introducir cuotas y múltiples órdenes por payable: implica nueva semántica y schema; fuera de esta reparación. Se bloquea el caso no soportado.
- Arreglar datos por UPDATE: elude audit/outbox y controles de settlement; rechazado.

## Consequences

Las pestañas anteriores deberán refrescar al faltar clave de intento. Soportes históricos sin vínculo no acreditan un período nuevo y requieren registro explícito. Ninguna migración ni tabla nueva: se reutilizan PK, metadata, logs y commands existentes. El carril admin de prorrateos mantiene monto explícito y autoridad propia. El portal y worker deben desplegarse coordinadamente.

## Runtime Contract

`src/lib/contractor-engagements/work-submissions/self-service.ts`, `invoice-assets.ts`, `payables/store.ts`, `src/lib/finance/payment-orders/create-from-obligations.ts` y el cascade paid son los owners. Routes autorizan/parsean y UI declara inputs. Tarifas, retención, impuestos, nómina dependiente e historia legal se preservan.

## Revisit When

Se aprueban pagos en cuotas, múltiples órdenes por payable, nuevas entidades simultáneas o evidencia tributaria estructurada que permita validar el período del documento automáticamente.

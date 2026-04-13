# HES — Recepción y validación de servicio

Documento funcional del flujo HES en Greenhouse Finance. Explica qué representa una hoja de entrada de servicio, cómo se registra y qué significan sus estados visibles en el portal.

Spec técnica relacionada:
- [`GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`](../../architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md)

## Qué es una HES

La HES (Hoja de Entrada de Servicio) es un documento que el cliente entrega para dejar constancia de que recibió un servicio en un período determinado. En Greenhouse no se modela como un documento que nosotros enviamos al cliente, sino como evidencia comercial que registramos cuando el cliente ya la emitió o la compartió.

## Cómo opera en el portal

El flujo visible de `Finance > HES` sigue esta lógica:

1. Se registra una HES recibida desde el cliente.
2. La HES queda pendiente de validación interna.
3. Si está correcta, se valida y queda lista para soportar facturación.
4. Si hay un problema, queda observada hasta que se regularice.

## Estados visibles

| Estado visible | Estado backend | Qué significa |
| --- | --- | --- |
| `Borrador` | `draft` | Estado interno temporal. No debería ser el resultado normal del registro principal desde la UI. |
| `Recibida` | `submitted` | La HES ya fue registrada como documento recibido del cliente y está pendiente de validación. |
| `Validada` | `approved` | La HES fue revisada internamente y ya puede respaldar el siguiente tramo del flujo comercial. |
| `Observada` | `rejected` | La HES tiene una inconsistencia o falta algo antes de poder validarse. |

## Contacto y respaldo

- El contacto del cliente se selecciona desde los contactos asociados al cliente elegido.
- La HES no es dueña de un PDF propio en el portal.
- Si la HES está vinculada a una OC, hereda el respaldo documental desde esa OC.
- Si la OC todavía no tiene respaldo, ese documento debe cargarse en `Finance > Órdenes de compra`.

## Qué cambia para la operación

- `Registrar HES` significa registrar una HES ya recibida.
- El portal ya no debería comunicar acciones como `Enviar al cliente` para este flujo.
- La validación interna se expresa como `Validar` u `Observar`, no como aprobación outbound del cliente.

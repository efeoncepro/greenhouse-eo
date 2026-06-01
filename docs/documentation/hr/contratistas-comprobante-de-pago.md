> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-05-31 por Claude (TASK-960)
> **Ultima actualizacion:** 2026-06-01 por Claude (TASK-981 — envío automático por email)
> **Documentacion tecnica:** [GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md)

# Comprobante de Pago del contratista (Remittance Advice)

## Para que sirve

Cuando a un contratista (honorarios Chile, freelance, profesional independiente, internacional o vía proveedor) se le paga un servicio, Greenhouse genera un **Comprobante de Pago**: un documento que confirma **qué se le pagó y con qué desglose** (monto bruto, retención si aplica, neto pagado).

No es una liquidación ni un recibo de sueldo — el contratista no tiene vínculo laboral. Tampoco es su documento tributario: ese lo emite el propio contratista (Boleta de Honorarios en Chile, invoice en el extranjero). El comprobante es la confirmación del pago por parte de quien paga.

## Quien lo ve

- **El contratista**, en su hub de auto-servicio (`Mis servicios contractor`), en la sección "Comprobantes de pago": ve y descarga solo los comprobantes de **sus propios** pagos.
- **HR / Finance**, en el workbench de gestión contractor, en la sección "Comprobantes emitidos": ve y descarga los comprobantes de todos los contratistas.

Ambos pueden **verlo dentro del portal** (visor) y **descargarlo en PDF**.

## Que muestra el documento

| Bloque | Contenido |
|---|---|
| Emisor | Razón social, RUT/tax id y domicilio de la entidad que paga (hoy Efeonce Group SpA) + logo |
| Identificación | Título "Comprobante de Pago" + número correlativo **EO-RA-NNNNNN** + fecha de pago |
| Beneficiario | Nombre del contratista, su identificación (enmascarada) y país |
| Documento del prestador | Tipo (Boleta de Honorarios / Invoice) + referencia |
| Detalle del pago | Monto bruto → retención (si aplica) → **neto pagado** (resaltado) |
| Datos del pago | Medio de pago + referencia |
| Aviso | Texto que aclara que es un pago por servicios profesionales, sin vínculo laboral |

El desglose se adapta al tipo de contratista: honorarios Chile muestra "Retención SII (15,25%)"; internacional muestra "Withholding" o ninguna fila si la retención la gestiona el proveedor/país.

## Idioma

El documento sigue el **idioma del contratista** (español o inglés). HR/Finance puede alternar el idioma al verlo.

## El número EO-RA-NNNNNN

Cada comprobante lleva un número correlativo propio, sin saltos (gapless). Se asigna **una sola vez** la primera vez que el comprobante se ve o descarga, y queda fijo: el mismo pago muestra siempre el mismo número. Un salto en la numeración indicaría un comprobante anulado.

## Envío automático por email (TASK-981)

Cuando el pago al contratista se completa (la orden de pago que lo paga se marca como pagada), Greenhouse **le envía el comprobante por email automáticamente**, con el PDF adjunto, en el idioma del contratista. No hay que enviarlo a mano.

- El correo es una confirmación breve (número de comprobante, fecha de pago, monto neto) y el detalle completo va en el PDF adjunto.
- Si el contratista todavía no tiene un email registrado, el envío se omite sin error: igual puede descargar el comprobante en el portal. Finanzas lo verá pendiente como una señal de operación.
- Si el envío falla por una caída del proveedor de correo, el sistema reintenta solo; si agota los reintentos, queda visible en el panel de salud (`Comprobante de pago contractor (email dead-letter)`) para revisión humana.
- El mismo pago no genera correos duplicados aunque el sistema reintente.

## Que NO hace

- No reemplaza la Boleta de Honorarios ni el invoice del contratista.
- No recalcula montos: refleja exactamente lo que el sistema ya calculó al pagar.
- No se genera para pagos que aún no están liquidados (solo para pagos en estado "pagado").

## Problemas comunes

- **"No veo comprobantes"**: aparecen solo cuando un pago queda liquidado. Si tu pago está en revisión o pendiente, todavía no hay comprobante.
- **El número dice "Al emitir"**: significa que aún no lo has abierto; se numera al verlo o descargarlo por primera vez.

> Detalle técnico: presenter + visor + PDF en `src/lib/contractor-engagements/remittance/` y `src/components/greenhouse/contractors/`; numeración en `greenhouse_hr.remittance_advice_numbers`. Ver invariantes en `CLAUDE.md` (sección "Contractor Remittance Advice invariants (TASK-960)").

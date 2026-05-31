# Manual de uso — Comprobante de Pago del contratista

## Para que sirve

Ver y descargar el comprobante de pago (Remittance Advice) de cada pago liquidado a un contratista: emisor, monto bruto, retención y neto pagado, con número correlativo `EO-RA-NNNNNN`.

## Antes de empezar

- El comprobante existe **solo para pagos en estado "pagado"**. Si el pago está en revisión o pendiente, todavía no hay comprobante.
- Permisos:
  - Contratista: acceso a su hub `Mis servicios contractor` (capability `personal_workspace.contractor.read_self`). Solo ve sus propios comprobantes.
  - HR / Finance: acceso al workbench de gestión contractor (capability `hr.contractor_engagement`). Ve todos.

## Paso a paso — contratista

1. Entra a **Mis servicios contractor**.
2. Baja a la sección **"Comprobantes de pago"**.
3. Por cada pago liquidado verás el número, el neto y la fecha.
4. **Ver**: abre el comprobante dentro del portal (panel lateral).
5. **Descargar PDF**: descarga el documento en PDF.

## Paso a paso — HR / Finance

1. Entra al **workbench de gestión contractor**.
2. Baja a la sección **"Comprobantes emitidos"**.
3. La tabla muestra beneficiario, número, neto y fecha.
4. **Ver** abre el visor; **Descargar PDF** descarga el documento.
5. (Opcional) Al consultar el documento se puede alternar el idioma (es/en).

## Que significan los estados

- **Número visible (EO-RA-NNNNNN)**: el comprobante ya fue emitido (visto o descargado al menos una vez).
- **"Al emitir"**: aún no se ha abierto; el número se asigna al verlo o descargarlo por primera vez.

## Que no hacer

- No uses este documento como comprobante tributario del contratista: ese lo emite el contratista (Boleta de Honorarios / invoice).
- No lo trates como recibo de sueldo ni liquidación: el contratista no tiene vínculo laboral.

## Problemas comunes

- **La sección está vacía**: no hay pagos liquidados todavía.
- **No puedo abrir un comprobante de otro contratista**: por diseño, cada contratista solo accede a los suyos.
- **El PDF no abre**: revisa el bloqueador de pop-ups; la descarga abre una pestaña nueva.

## Referencias tecnicas

- Documentacion funcional: [contratistas-comprobante-de-pago.md](../../documentation/hr/contratistas-comprobante-de-pago.md)
- Invariantes: `CLAUDE.md` → "Contractor Remittance Advice invariants (TASK-960)"
- Endpoints: `/api/my/contractor/remittance/[payableId]`, `/api/hr/contractors/remittance/[payableId]`

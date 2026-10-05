# TASK-2010 — Flow

Hub existente → Preparar envío → fechas nuevas + moneda del acuerdo + documentos nuevos → Guardar draft o Enviar → command atómico. Error conserva intento; éxito de envío limpia el drawer. Consultar envío/comprobante/pendientes enfoca la sección correspondiente, sin crear.

## Implementation mapping

`ContractorSubmissionComposer` y `ContractorSelfServiceView`; layout MUI existente.

## GVC scenario plan

Desktop 1440×1000 y móvil 390×844: inicial/error/retry/success/consulta. Fixture, cero escrituras.

## Design decision log

Corrección funcional sobre composición existente, sin nueva variante ni motion.

# TASK-2010 — Contractor submission and consultation

- Visual direction mode: `source-led`
- Product Design asset: `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`

## Desktop Target

Conservar el hub y el Drawer aprobados en TASK-796. En 1440×1000 el formulario mantiene dos columnas de datos, encabezado y acciones visibles, y contenido con scroll interno. Se capturan fechas nuevas; la etiqueta humana del período anterior sigue siendo sólo de lectura en el hub. No se cambia la navegación institucional.

## Mobile Target

En 390×844 el Drawer ocupa el ancho disponible y apila campos y acciones. El contenido tiene región nombrada y foco; las alertas se muestran en el encabezado para que un error no quede oculto tras el scroll. La pantalla no necesita desplazamiento horizontal. Un nombre o error largo ajusta líneas.

## Action Hierarchy

«Enviar a revisión» es la acción primaria; «Guardar borrador» conserva el intento y «Cerrar» permite retomarlo durante la sesión. «Ver envío», «Ver comprobante» y «Ver pendientes» enfocan sus secciones existentes. «Preparar otro período» es explícito en los estados pagado y en revisión, porque el siguiente período puede llegar mientras se revisa el anterior.

## Visual Fidelity Mapping

Se reutilizan Stack/Grid/Drawer/CustomTextField y GreenhouseFileUploader existentes. La tarjeta de monto conserva su posición y carácter de lectura. Fechas usan controles nativos; moneda usa el acuerdo y es de lectura. Sólo se ajustan contraste de mensajes/chips y foco dentro de estos formularios usando colores del theme, sin colores literales ni variantes globales.

## Copy Ledger

La fuente de fechas, nueva preparación, estados de documentos, nombre de regiones y fallos de guardado es `src/lib/copy/contractor-submissions.ts`. La copia de monto derivado permanece en `contractor-compensation.ts`. El error server-side conserva su código y mensaje seguro; una caída inesperada usa el contrato de error canónico.

## State Copy

| Estado | Texto visible | Recuperación |
| --- | --- | --- |
| ready | Preparar envío; boleta/evidencia pendiente o seleccionada | Declarar fechas y soporte del período |
| loading | Spinner de guardar, acciones deshabilitadas | Esperar el resultado del command |
| empty | Campos nuevos vacíos; seleccionar documento/evidencia | No tomar la boleta del período anterior |
| partial | Selección conservada; aún sin confirmación de envío | Completar soporte o guardar el mismo borrador |
| error | Alerta en encabezado con mensaje seguro | Reintentar con la misma clave y documentos |
| denied | Error de permiso/scope del servidor | Pedir revisión a HR, sin cambiar autoridad desde el cliente |

## Accessibility Contract

Drawer con nombre; región de datos/documentos nombrada y focusable. Foco visible en inputs/textarea por token primary. Fechas tienen labels y min para fin. Moneda es readOnly. Error usa Alert con anuncio y posición visible. Destinos de consultas reciben foco programático. El movimiento conserva MUI; captura de teclado y reduced motion comprueba la recuperación sin una animación nueva.

## Implementation Mapping

`ContractorSubmissionComposer` declara trabajo y manda un único command; `ContractorDisputeResponse` responde sobre el mismo envío observado; `ContractorSelfServiceView` usa las secciones existentes. `work-submissions/self-service.ts` posee autorización, tarifa, pertenencia, idempotencia y transacción. El browser no calcula un monto para el DTO.

## GVC Scenario Plan

Quality profile: premium. Desktop 1440×1000 y mobile 390px (390×844), initial/error/retry/success, foco y reduced motion. Review dossier y manifests en `.captures/2026-10-05T21-01-45_contractor-integrity-local/`; scroll-width cubierto por layout integrity sin overflow horizontal. Surface ID: `contractor.self-service.submit-period`. Decisión de baseline: conservar la composición TASK-796; no promover una captura como baseline aprobada ni afirmar visual diff sin baseline activa. QA local usa fixture anónima, ninguna escritura real. Source del harness/DSL archivado en `.captures/contractor-fix-qa/source/` y retirado del build.

## Design Decision Log

El cambio es funcional sobre composición existente, autorizado como reparación general. El error se movió al encabezado tras detectar que quedaba fuera de vista. Contraste, foco y scroll se corrigieron tras GVC premium; la captura final tiene cero findings. El release y readback de usuarios reales siguen pendientes, sin una aceptación visual productiva inferida.

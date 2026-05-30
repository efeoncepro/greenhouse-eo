# Contratistas — Self-Service y Workbench HR

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-05-30 por Claude (TASK-796 — contractor self-service hub)
> **Documentacion tecnica:** [GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md)

## Que es

TASK-796 conecta los mockups aprobados a produccion y entrega dos superficies que cierran el ciclo operativo de un contratista, desde que entrega su trabajo hasta que Greenhouse deja lista la obligacion de pago a Finanzas:

- **`/my/contractor` — Mis Servicios Contractor.** La vista personal de la persona que tiene una contratacion activa como contratista. Resume su contratacion, su estado de avance, sus montos y lo que falta para avanzar.
- **`/hr/contractors` — Workbench HR.** El tablero de revision para HR y administracion: la cola de trabajo pendiente, los totales del momento y las herramientas para aprobar, observar o rechazar.

Ambas superficies se arman sobre lo que ya existe en el dominio de contractor engagements (TASK-790 a TASK-795). No reemplazan ningun flujo: lo hacen visible y operable.

> **Importante.** Un contratista trabaja por honorarios o factura, no por sueldo. En estas pantallas nunca hablamos de nomina, finiquito, AFP ni descuentos previsionales. Hablamos de boleta o factura, entrega de trabajo, retencion cuando corresponde y pago.

> Detalle tecnico: [GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md) · `src/lib/contractor-engagements/self-service-projection.ts` · `src/lib/contractor-engagements/hr-workbench-projection.ts`

## La superficie del contratista (`/my/contractor`)

Cuando una persona tiene una contratacion de contratista activa, ve su propia pagina con todo lo que necesita para entregar y cobrar:

- **Resumen de la contratacion.** Quien la contrata (la entidad legal), el tipo de contratacion, el periodo de servicio y el modelo de pago.
- **Estado de avance (readiness).** Si la contratacion esta lista para que Finanzas la procese, o que falta para llegar a ese punto.
- **Montos (KPIs).** Monto bruto, retencion cuando aplica y monto neto, siempre como mejor estimacion disponible. Si todavia no hay datos, la vista lo dice claro en lugar de mostrar un cero confuso.
- **Pendientes (blockers).** Lo que esta frenando el avance, y quien debe resolverlo: el contratista (por ejemplo, subir su boleta) o Finanzas (por ejemplo, validar la obligacion).
- **Soporte (boleta y evidencia).** Un cargador para adjuntar la boleta o factura del periodo y la evidencia del trabajo realizado, como archivos privados.
- **Preparar un envio.** Un panel para crear y enviar una entrega de trabajo a revision.
- **Responder una observacion.** Cuando HR observo una entrega, un panel para adjuntar la evidencia corregida y volver a enviarla.
- **Datos de pago.** Un acceso a `/my/payment-profile` para revisar o completar como recibe sus pagos. Esta vista solo enlaza al perfil de pago existente, no lo reconstruye.
- **Linea de tiempo.** El recorrido del estado: contratacion, soporte, revision, obligacion a Finanzas y pago.
- **Historial de envios.** Las entregas que el contratista ya hizo y como quedaron.

El item de menu **Mis Servicios Contractor** aparece solo cuando la persona tiene una contratacion vigente. Si no tiene contratacion, la vista muestra un estado vacio honesto que lo explica, sin inventar datos.

Lo que el contratista **no** ve: estados del proveedor, comisiones, ni ningun dato que sea solo de Finanzas. Esa informacion queda fuera de su superficie por diseno.

> Detalle tecnico: `src/lib/contractor-engagements/self-service-projection.ts` · rutas `/api/my/contractor/*`

## El workbench HR (`/hr/contractors`)

HR y administracion trabajan desde un tablero unico que ordena todo lo que requiere atencion:

- **Cola de revision.** Reune lo que esta esperando una decision: contrataciones pendientes de revisar, entregas enviadas u observadas, y pagos bloqueados.
- **4 totales (KPIs).** En revision, bloqueados, listos para Finanzas y pagados.
- **Estado de avance y paso de Finanzas.** Paneles que muestran el readiness de cada caso y en que punto del camino hacia Finanzas esta.
- **Inspector.** El detalle de un caso seleccionado.
- **Senales operativas.** Avisos que ayudan a priorizar.
- **Decision de revision.** Un panel para aprobar, observar o rechazar una entrega.

Cuando HR observa o rechaza una entrega, debe escribir una razon visible para el contratista de al menos 10 caracteres. Asi la persona sabe exactamente que corregir.

> **Aprobar no es pagar.** Una aprobacion en el workbench deja la entrega lista para que Finanzas la procese; no ejecuta ningun pago. El pago real corre por Finanzas, fuera de esta pantalla.

> Detalle tecnico: `src/lib/contractor-engagements/hr-workbench-projection.ts` · ruta `/api/hr/contractors/workbench`

## El ciclo completo

El recorrido de una entrega de contratista pasa por etapas claras:

1. **Contratacion.** Existe una contratacion de contratista activa, con su entidad contratante, tipo, periodo y modelo de pago.
2. **Envio.** El contratista prepara su entrega de trabajo, adjunta boleta o factura y evidencia, y la envia a revision.
3. **Revision.** HR revisa la entrega y decide: aprueba, observa (pide cambios) o rechaza. Si la observa, el contratista corrige y vuelve a enviar.
4. **Obligacion a Finanzas.** Una entrega aprobada deja lista la obligacion de pago para que Finanzas la procese.
5. **Pago.** Finanzas ejecuta el pago por sus propios flujos.

La linea de tiempo en la vista del contratista refleja exactamente este recorrido, asi cada persona sabe en que etapa esta y que sigue.

> Detalle tecnico: [GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md)

## Roles y permisos

Cada superficie tiene su propio acceso:

| Quien | Donde | Que puede hacer | Acceso |
| --- | --- | --- | --- |
| Contratista | `/my/contractor` | Ver su contratacion, subir boleta/evidencia, preparar y enviar entregas, responder observaciones | `personal_workspace.contractor.read_self` + `.submit_self`; viewCode `mi_ficha.mi_contratacion` (rol colaborador) |
| HR / Nomina / Admin | `/hr/contractors` | Revisar la cola, aprobar, observar o rechazar entregas, leer readiness y senales | viewCode `equipo.contratistas` (otorgado a `hr_manager`, `hr_payroll`, `efeonce_admin`, `finance_admin`) |

La decision de revision (aprobar / observar / rechazar) usa la capability existente `hr.contractor_work_submission.review`.

Quien tiene una contratacion de contratista activa ve automaticamente el item de menu. Quien no la tiene, no lo ve.

> Detalle tecnico: `src/config/entitlements-catalog.ts` · `src/lib/entitlements/runtime.ts`

## Que puede y que no puede cada lado

**El contratista puede:**

- Ver su contratacion, su readiness, sus montos estimados y sus pendientes.
- Subir su boleta o factura y la evidencia de su trabajo.
- Preparar, enviar y responder entregas de trabajo.
- Acceder a su perfil de pago en `/my/payment-profile`.

**El contratista no puede:**

- Ver estados del proveedor, comisiones ni datos de Finanzas.
- Aprobar sus propias entregas.
- Reconstruir su perfil de pago desde esta vista (solo lo enlaza).

**HR puede:**

- Revisar la cola completa y los totales del momento.
- Aprobar, observar o rechazar entregas (con razon visible al contratista cuando observa o rechaza).
- Leer el readiness y el paso de Finanzas de cada caso.

**HR no puede:**

- Ejecutar el pago desde esta pantalla. Aprobar deja lista la obligacion; el pago lo procesa Finanzas.

## Fronteras

- El cierre de una contratacion de contratista es solo visible en estas pantallas. El cierre real es trabajo separado (TASK-797); aca solo se muestra el recorrido.
- El perfil de pago se reutiliza desde su modulo existente (TASK-753). La vista del contratista enlaza a `/my/payment-profile`, no lo recrea.
- Aprobar una entrega no ejecuta un pago. El pago corre por Finanzas.

> Detalle tecnico: [GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md) · `src/lib/contractor-engagements/self-service-projection.ts` · `src/lib/contractor-engagements/hr-workbench-projection.ts`

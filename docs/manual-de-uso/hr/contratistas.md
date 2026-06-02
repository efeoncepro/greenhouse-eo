# Contratistas — Self-Service y revision HR

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-05-30 por Claude (TASK-796 — contractor self-service hub)
> **Ultima actualizacion:** 2026-05-30 por Claude (TASK-796 — contractor self-service hub)
> **Modulo:** HR / Contratistas
> **Ruta en portal:** `/my/contractor` (contratista) · `/hr/contractors` (HR / admin)
> **Documentacion relacionada:** [Contratistas — Self-Service y Workbench HR](../../documentation/hr/contratistas-self-service.md), [GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md)

## Para que sirve

Estas dos pantallas cierran el ciclo de un contratista, desde que entrega su trabajo hasta que Greenhouse deja lista la obligacion de pago a Finanzas:

- **`/my/contractor`** es tu espacio si trabajas como contratista: revisas tu contratacion, subes tu boleta o factura, envias tus entregas de trabajo y respondes observaciones.
- **`/hr/contractors`** es el tablero de HR y administracion para revisar esas entregas y avanzar los casos.

> Un contratista trabaja por honorarios o factura, no por sueldo. Aca no hay nomina, finiquito ni descuentos previsionales. Hablamos de boleta o factura, entrega de trabajo, retencion cuando corresponde y pago.

## Antes de empezar

**Si eres contratista:**

- Necesitas una contratacion de contratista activa. Si la tienes, el item **Mis Servicios Contractor** aparece en tu menu automaticamente.
- Necesitas las capabilities `personal_workspace.contractor.read_self` y `.submit_self` (vienen con tu rol de colaborador).
- Ten a mano tu boleta o factura del periodo y la evidencia del trabajo que entregaste.

**Si eres HR o administracion:**

- Necesitas acceso al viewCode `equipo.contratistas` (lo tienen `hr_manager`, `hr_payroll`, `efeonce_admin` y `finance_admin`).
- Para aprobar, observar o rechazar una entrega necesitas la capability `hr.contractor_work_submission.review`.

## Paso a paso

### Contratista — subir boleta y evidencia

1. Entra a **Mis Servicios Contractor** (`/my/contractor`).
2. En el panel de soporte, usa el cargador para adjuntar tu **boleta o factura** del periodo.
3. Adjunta tambien la **evidencia de tu trabajo** (los archivos que respaldan lo entregado).
4. Confirma. Los archivos quedan asociados a tu contratacion como archivos privados.

### Contratista — preparar y enviar una entrega

1. Abre el panel para **preparar un envio**.
2. Completa los datos de tu entrega de trabajo.
3. Revisa que la boleta o factura y la evidencia esten adjuntas.
4. **Envia** la entrega a revision. A partir de aca queda en manos de HR.

### Contratista — responder una observacion

1. Cuando HR observa tu entrega, lo ves en tu pagina con la razon que escribieron.
2. Abre el panel para **responder la observacion**.
3. Adjunta la **evidencia corregida** segun lo que te pidieron.
4. **Vuelve a enviar** la entrega.

### HR — revisar la cola

1. Entra al workbench (`/hr/contractors`).
2. Revisa los 4 totales: en revision, bloqueados, listos para Finanzas y pagados.
3. En la cola de revision, abre el caso que necesita atencion.
4. Usa el inspector para ver el detalle, el readiness y el paso de Finanzas.

### HR — aprobar, observar o rechazar

1. Selecciona la entrega en la cola y abre la **decision de revision**.
2. Elige una opcion:
   - **Aprobar.** Deja la entrega lista para que Finanzas la procese.
   - **Observar.** Pide cambios. Debes escribir una razon visible para el contratista de al menos 10 caracteres.
   - **Rechazar.** Cierra la entrega. Tambien exige una razon visible de al menos 10 caracteres.
3. Confirma. El contratista vera el resultado y, si observaste o rechazaste, la razon.

## Que significan los estados

### Estado de avance (readiness)

Te dice si la contratacion o la entrega esta lista para avanzar o que falta para llegar a ese punto. Cuando hay algo pendiente, lo veras como un blocker con su responsable.

### Pendientes (blockers) y quien resuelve

Cada pendiente dice **quien debe actuar**:

- **Contratista.** Algo depende de ti, por ejemplo subir tu boleta o tu evidencia.
- **Finanzas.** Algo depende de Finanzas, por ejemplo validar la obligacion de pago.

Mira el responsable antes de actuar: si el pendiente es de Finanzas, no hay nada que tu debas corregir.

### Linea de tiempo

El recorrido del caso, en orden: contratacion -> soporte -> revision -> obligacion a Finanzas -> pago. Te muestra en que etapa esta y que sigue.

### Montos

Bruto, retencion (cuando aplica) y neto, siempre como mejor estimacion disponible. Si todavia no hay datos, la vista lo dice en vez de mostrar un cero que confunda.

## Definir el monto acordado (RR.HH.) — TASK-968

El **monto acordado** lo fija RR.HH., nunca el contratista. Desde el workbench HR (`/hr/contractors`):

1. Selecciona la contratacion en la cola. En el inspector aparece el panel **Compensacion**.
2. Si dice "Sin monto acordado", pulsa **Definir compensacion**. Si ya tiene monto, **Editar compensacion**.
3. Ingresa el tipo de tarifa (fija, por hora, por hito, etc.), el monto y la cadencia. La **moneda no se edita** aqui (se eligio al crear la contratacion).
4. Guarda. El cambio queda registrado (quien y cuando) y el contratista vera el monto como dato de solo lectura.

Mientras una contratacion activa no tenga monto, el contratista **no puede enviar trabajo** y una senal de salud lo marca para RR.HH.

## Autorizar un pago que excede lo acordado (Finanzas) — TASK-968

Cuando un pago supera el monto acordado, queda **bloqueado**. En el inspector del workbench, el panel **Guardrail del monto acordado** lista esos pagos:

1. Revisa el detalle: cuanto se quiere pagar vs cuanto se acordo.
2. Si corresponde, pulsa **Autorizar excepcion**, escribe el motivo (minimo 10 caracteres) y confirma.
3. La excepcion queda registrada. La autoriza Finanzas admin, y **no puede ser la misma persona** que fijo el monto (doble firma).

Si el monto del pago esta mal, corrigelo en lugar de autorizar la excepcion.

## Que no hacer

- No dejes que el contratista defina o escriba su monto acordado: se fija solo desde las vistas admin (RR.HH.).
- No autorices una excepcion de pago si la diferencia se debe a un error: corrige el monto del pago.
- No interpretes esta contratacion como una relacion de nomina: no hay sueldo, finiquito ni descuentos previsionales.
- No esperes ejecutar un pago desde estas pantallas. Aprobar deja lista la obligacion; el pago lo procesa Finanzas.
- Como contratista, no busques aca tus datos de pago para editarlos: usa el acceso a `/my/payment-profile`. Esta vista solo enlaza, no reconstruye tu perfil de pago.
- Como HR, no observes ni rechaces una entrega sin escribir una razon clara: el contratista la lee para saber que corregir.
- No trates esta superficie como el cierre de la contratacion. El cierre real es trabajo separado; aca solo se ve el recorrido.

## Problemas comunes

### No veo el item "Mis Servicios Contractor" en mi menu

El item aparece solo cuando tienes una contratacion de contratista activa. Si crees que deberias tenerla, contacta a HR.

### Entre a `/my/contractor` y no hay nada

Si no tienes una contratacion activa, la vista muestra un estado vacio que lo explica. No es un error.

### El boton para enviar mi entrega no avanza

Revisa los pendientes. Si hay un blocker con responsable Contratista, resuelvelo primero (por ejemplo, sube la boleta o la evidencia). Si el pendiente es de Finanzas, no depende de ti.

### Mis montos aparecen sin valor

Los montos son la mejor estimacion disponible. Si aun no hay datos, la vista lo indica en lugar de mostrar un cero. A medida que avanza el caso, se completan.

### Observe una entrega y el sistema no me deja confirmar

Observar y rechazar exigen una razon visible para el contratista de al menos 10 caracteres. Escribe una razon clara y vuelve a confirmar.

### Aprobe una entrega pero no se pago

Aprobar no ejecuta el pago: deja lista la obligacion para Finanzas. El pago corre por los flujos de Finanzas, fuera de esta pantalla.

## Dar de alta un contractor (onboarding, TASK-976)

Desde `/hr/contractors/new` (botón en el workbench) abrís el wizard. Elegís el camino:

### Camino B — Desde una salida laboral (empleado → contractor)

Para un colaborador que dejó de ser empleado y sigue como contractor:

1. Elegí el **caso de salida ejecutado** de la lista.
2. Completá los términos: tipo (contractor/honorarios), **fecha efectiva** (tiene que ser posterior al último día trabajado), canal de pago, modelo, tarifa, cadencia, y un **motivo** (mínimo 10 caracteres).
3. Confirmá. El sistema cierra la relación de empleado, abre la de contractor y crea el engagement, **todo junto**. No toca el finiquito ni la salida laboral.

El resultado es honesto: "transición completa", "engagement sobre relación existente" o "ya estaba completo" (si lo corrés dos veces, no duplica).

### Camino A — Contractor nuevo (relación existente)

Para una persona que ya tiene una relación de contractor activa:

1. Buscá la persona.
2. El sistema **resuelve** su situación:
   - tiene relación contractor → continuás;
   - viene de una relación laboral → te manda al **Camino B**;
   - no tiene relación → te dice que **primero la crees en Person 360** (fuera de esta pantalla).
3. Completá los términos → crear.

El engagement nace en **Borrador** con clasificación **Necesita revisión**. Para activarlo, andá al detalle y revisá la clasificación (ver abajo).

### Qué no hace el onboarding

No paga. No activa el engagement (queda en Borrador). No crea la relación legal desde cero (Person 360). No requiere `hr.contractor_engagement:create` (Camino A) o `:manage` (Camino B) — si no lo tenés, el botón no aparece.

## Gestionar el ciclo de vida del engagement (TASK-975)

En el inspector (columna derecha, al seleccionar un engagement) ahora tenés:

### Ver el detalle completo

"Ver detalle completo" abre un panel con todos los terminos: economicos (modelo de pago, tarifa, cadencia, monedas, bono), tributario (responsable, tasa de retencion, invoice/aprobacion), proveedor (contrato/worker/FX), fechas, maquina de estados y los factores de clasificacion. Desde ahi podes "Editar terminos".

### Mover el ciclo de vida

Los botones de ciclo de vida muestran **solo las transiciones validas** del estado actual (activar / pausar / reanudar / iniciar cierre / finalizar / cancelar). Pausar, cerrar y cancelar piden un **motivo**. Los estados terminales (finalizado/cancelado) no admiten cambios.

> "Activar" **no aparece** si el riesgo de clasificacion esta bloqueante. Primero revisa la clasificacion.

### Revisar la clasificacion laboral

"Revisar clasificacion" abre un dialogo con los 7 factores de subordinacion. Marca los presentes (el riesgo se recalcula en vivo), marca "revisado" (sin revisar nunca queda "sin riesgo"), opcionalmente "escalar a bloqueado", y deja un motivo. Si un engagement activo escala a bloqueante, el sistema lo **pausa solo**. Lo revisa una firma distinta (SoD, capability `hr.contractor_classification:approve`).

### Editar terminos

"Editar terminos" abre un drawer para cambiar modelo de pago, politica FX, referencias del proveedor, flags de invoice/aprobacion, politica de bono y fecha de termino. La **tarifa** se edita aparte (el editor de compensacion). Requiere `hr.contractor_engagement:update`.

### Que no hace

No paga ni prepara payables (eso es Finanzas, `/finance/contractor-payments`). No crea engagements ni convierte empleados (onboarding, futuro). No toca nomina ni finiquito.

## Referencias tecnicas

- `src/lib/contractor-engagements/self-service-projection.ts`
- `src/lib/contractor-engagements/hr-workbench-projection.ts`
- `src/views/greenhouse/contractors/{ContractorEngagementDetailDrawer,ContractorLifecycleControls,ContractorClassificationReviewDialog,ContractorEngagementTermsDrawer}.tsx`
- `/api/my/contractor/*`
- `/api/hr/contractors/workbench` · `GET/PATCH /api/hr/contractors/[id]` (action transition|review_classification|update)
- viewCodes `mi_ficha.mi_contratacion` (contratista) · `equipo.contratistas` (HR)
- capabilities `personal_workspace.contractor.read_self` · `.submit_self` · `hr.contractor_work_submission.review` · `hr.contractor_engagement:update` · `hr.contractor_classification:approve`
- [GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md)

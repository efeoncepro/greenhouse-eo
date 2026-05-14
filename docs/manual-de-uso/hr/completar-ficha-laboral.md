# Completar ficha laboral de un colaborador

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-05-14 por TASK-873
> **Modulo:** HR / Workforce / Lifecycle
> **Rutas:** `/admin/workforce/activation` (admin governance), `/people/[memberId]` (detalle)
> **Capacidad requerida:** `workforce.member.complete_intake` (asignada a EFEONCE_ADMIN, FINANCE_ADMIN y route_group `hr` que incluye HR_PAYROLL + HR_MANAGER)
> **Endpoint backend:** `POST /api/admin/workforce/members/[memberId]/complete-intake`

## Para que sirve

Cuando un colaborador entra a Greenhouse via Microsoft Entra (SCIM) por
primera vez, su ficha en el modulo HR / Personas nace en estado **"Ficha
pendiente"** (`workforce_intake_status = 'pending_intake'`). Antes de que
ese colaborador entre al flujo operativo de nomina, asignaciones,
proyecciones de capacidad y compensaciones, HR debe **completar la ficha
laboral**: confirmar el contrato, la compensacion, el perfil legal y los
datos de pago.

Este manual explica como completar esa ficha desde la interfaz, sin tener
que pedirle a alguien tecnico que invoque el endpoint manualmente.

> **Nota V1.0**: el sistema NO valida automaticamente que contrato,
> compensacion, perfil legal y datos de pago esten al dia. Confirma esos
> datos manualmente antes de completar la ficha. La validacion pre-flight
> automatica (Workforce Activation Readiness) llega en una iteracion
> posterior — ver TASK-874 en el roadmap.

## Antes de empezar

Verifica que esten al dia, idealmente en este orden:

1. **Datos basicos del colaborador** (nombre legal, RUT/documento de
   identidad, fecha de nacimiento, telefono, direccion).
2. **Contrato** (tipo de contrato, fecha de ingreso, cargo, departamento).
3. **Compensacion** (sueldo bruto, moneda, fecha desde, indemnizaciones,
   bonos previstos).
4. **Perfil legal** (relacion contractual activa, documentos cargados).
5. **Datos de pago** (cuenta bancaria, beneficiario verificado).

Si falta alguno de estos puntos, **NO completes la ficha todavia** —
abre `/people/[memberId]` y resuelve lo que falta antes.

## Donde aparecen las fichas pendientes

### En el directorio People

Entra a `/people`. Los colaboradores con ficha pendiente muestran un chip
naranja **"Ficha pendiente"** debajo del chip de estado **Activo / Inactivo**.
Si la ficha entro a revision interna, el chip dice **"Ficha en revision"**
(azul).

### En la cola operativa

Entra a `/admin/workforce/activation`. Esta es la cola consolidada de
**Workforce Activation** (variante admin governance — ver tambien
`/hr/workforce/activation` cuando exista el workspace primario HR). La cola
muestra:

- Avatar + nombre del colaborador
- Correo
- Estado (Pendiente / En revision)
- Fecha de creacion
- Antiguedad en dias

Puedes filtrar por:

- **Todos** (default)
- **Pendientes** (solo `pending_intake`)
- **En revision** (solo `in_review`)

### En el dashboard de Admin

`/admin` muestra un signal de reliability **"Members SCIM con ficha laboral
pendiente"**. Cuando el signal alerta (mas de 7 dias sin completar = warning;
mas de 30 dias = critico), aparece un boton **"Ver fichas pendientes →"**
que te lleva directo a la cola operativa.

## Como completar la ficha — paso a paso

Hay dos rutas equivalentes:

### Opcion 1: Desde la cola operativa

1. Entra a `/admin/workforce/activation`.
2. Aplica el filtro relevante si quieres scope angosto.
3. Haz click en la fila del colaborador, o presiona el boton **"Completar
   ficha"** en la columna acciones de esa fila.
4. Se abre el drawer **"Completar ficha laboral"** en el costado derecho.
5. Verifica los datos read-only (nombre, correo, estado actual, antiguedad,
   identity profile).
6. Lee el banner de advertencia amarillo **"Verifica antes de completar"** —
   confirma que ya revisaste contrato + compensacion + perfil legal + datos
   de pago.
7. Opcional: escribe una nota en el campo **"Notas (opcional)"** para que
   quede registrada en el audit log y outbox event. Util para anotar quien
   completo, o referenciar tickets de soporte.
8. Presiona **"Marcar como completada"** (boton naranja contained).
9. Espera el toast de confirmacion **"Ficha completada"**.
10. La fila desaparece de la cola.

### Opcion 2: Desde el detalle del colaborador

1. Entra a `/people/[memberId]` (puedes navegar desde la cola, desde el
   directorio People, o de Microsoft Teams si tienes el link).
2. En el header del perfil, junto al chip Activo / Inactivo, veras un
   boton naranja **"Completar ficha"** (solo aparece si tu rol tiene la
   capacidad y el colaborador tiene ficha pendiente).
3. Presiona el boton.
4. Se abre el mismo drawer **"Completar ficha laboral"**.
5. Sigue los pasos 5-10 de la Opcion 1.

## Que pasa despues

Cuando completas la ficha:

1. **Estado en base de datos**: `workforce_intake_status` pasa a `completed`
   en `greenhouse_core.members`. La transicion es atomica + idempotente.
2. **Audit log**: queda registrado en outbox event
   `workforce.member.intake_completed v1` (TASK-872) con tu user id, la
   nota opcional, timestamp y el estado anterior. Auditable desde admin.
3. **Reliability signal**: el contador del signal
   `workforce.scim_members_pending_profile_completion` baja en 1. Si era el
   ultimo, el signal vuelve a verde.
4. **Payroll / capacity / assignments**: el colaborador queda elegible para
   payroll. Cuando se active el flag `PAYROLL_WORKFORCE_INTAKE_GATE_ENABLED`
   en produccion (TASK-872 follow-up), solo los members `completed` entran
   a las corridas de nomina.
5. **El badge "Ficha pendiente"** desaparece del directorio People y del
   header del perfil.

## Que no hacer

- **No completes la ficha "por completar"** sin verificar realmente que los
  datos esten al dia. V1.0 confia en tu juicio — si marcas como completa
  con contrato faltante, el colaborador entra a payroll con defaults
  peligrosos. El flag de payroll lo evitara automaticamente solo cuando
  TASK-874 ship el readiness validator.
- **No edites `workforce_intake_status` directamente con SQL**. Toda
  transicion pasa por el endpoint canonical, que escribe audit + outbox.
- **No reabras una ficha completada** desde la UI. La transicion es
  one-way en V1.0; si un caso amerita reapertura (e.g. revisado en frio
  y se detecto error), abre un ticket con DevOps o admin para que ajuste
  via SQL con audit explicito.

## Problemas comunes y troubleshooting

| Sintoma | Diagnostico | Solucion |
|---|---|---|
| Boton "Completar ficha" no aparece en /people/[memberId] | Tu rol no tiene la capability `workforce.member.complete_intake`, o el member ya esta `completed`. | Verifica con admin que tu rol este en EFEONCE_ADMIN, FINANCE_ADMIN o tenga route_group=hr. Si no, pide acceso. |
| /admin/workforce/activation redirige a tu home | Misma causa: te falta la capability. | Pide acceso a admin. |
| Toast "No fue posible completar la ficha. Revisa los logs." | El endpoint backend fallo (500). | Notifica al equipo tecnico — el error queda en Sentry domain `identity` con detalles. Mientras tanto, NO retries automaticos: deja correr 1-2 min antes de reintentar. |
| Toast "La ficha esta en un estado que no permite la transicion." | El member ya cambio de estado en otro tab o lo modifico otro operador. | Recarga la pagina. Si el estado quedo en `completed` ya, el badge desaparece. Si quedo en otro estado raro (e.g. test de QA), notifica al equipo tecnico. |
| Toast "No tienes permiso para completar esta ficha." | Tu sesion expiro o tu capacidad cambio. | Cierra sesion + vuelve a entrar. Si persiste, pide a admin que revise tus roles. |
| El badge "Ficha pendiente" no desaparece despues de completar | Cache de la pagina o de la sesion. | Recarga la pagina (cmd+R). La data fetch tras submit es refresh automatico, pero puede haber stale en otra ventana. |
| La cola muestra colaboradores con email "t872-...-..." o nombres "Test happy" | Son members SCIM de pruebas test que quedaron en staging | Estos son test fixtures TASK-872. En produccion no aparecen. Filtra por nombre real si la cola es ruidosa en staging. |

## Referencias tecnicas

- **Spec backend**: `docs/tasks/complete/TASK-872-scim-internal-collaborator-provisioning.md`
- **Spec UI**: `docs/tasks/complete/TASK-873-workforce-intake-ui.md` (este shipping)
- **Spec workspace enriquecido**: `docs/tasks/to-do/TASK-874-workforce-activation-readiness-workspace.md`
- **Endpoint**: `src/app/api/admin/workforce/members/[memberId]/complete-intake/route.ts`
- **Reader cola**: `src/lib/workforce/intake-queue/list-pending-members.ts`
- **Drawer shared**: `src/views/greenhouse/admin/workforce-activation/CompleteIntakeDrawer.tsx`
- **View admin**: `src/views/greenhouse/admin/workforce-activation/WorkforceActivationView.tsx`
- **Runbook recovery SCIM**: `docs/operations/runbooks/scim-internal-collaborator-recovery.md`
- **Doc funcional identidad**: `docs/documentation/identity/sistema-identidad-roles-acceso.md`

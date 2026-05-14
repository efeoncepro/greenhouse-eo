# Habilitar colaborador en Workforce Activation

> **Tipo de documento:** Manual de uso
> **Version:** 2.0
> **Ultima actualizacion:** 2026-05-14
> **Modulo:** Personas y HR / Workforce Activation
> **Ruta principal:** `/hr/workforce/activation`
> **Ruta admin:** `/admin/workforce/activation` (governance/transicional)
> **Permisos:** `workforce.member.activation_readiness.read`, `workforce.member.intake.update`, `workforce.member.complete_intake`

## Para que sirve

Workforce Activation es el workspace para habilitar laboralmente a una persona antes de cerrar su ficha. Se usa cuando un colaborador entra desde Microsoft Entra/SCIM y queda en `pending_intake` o `in_review`.

La pantalla no reemplaza People, Nomina, Legal Profile, Payment Profiles ni Person 360. Su trabajo es orquestar readiness: muestra que falta, permite corregir datos laborales basicos y abre las facetas dueñas para compensacion y pago. Solo cuando no quedan blockers criticos habilita **Completar ficha**.

## Donde aparece

- Menu lateral: **Personas y HR → Workforce Activation**.
- Directorio `/people`: colaboradores pendientes muestran accion que navega a `/hr/workforce/activation?memberId=<id>`.
- Detalle `/people/[memberId]`: si la ficha esta pendiente o en revision, la accion tambien lleva al workspace de activacion.

## Que debes revisar en la pantalla

1. **Resumen superior:** total de personas por habilitar, personas sin relacion, sin compensacion y listas.
2. **Filtros:** Todos, Listos, Sin compensacion, Sin ingreso, Sin relacion legal, Sin pago y Contractors.
3. **Cola priorizada:** lista de colaboradores pendientes ordenados por riesgo/blockers.
4. **Inspector derecho:** readiness %, blocker principal, lanes criticas y acciones disponibles.
5. **Acciones:** **Resolver blockers** para remediar datos; **Completar ficha** solo para cerrar cuando el guard esta listo.

## Estados y lanes

| Estado | Que significa | Que hacer |
|---|---|---|
| **Disponible / Listo** | La lane no bloquea. | No requiere accion. |
| **Bloqueado** | Falta un dato critico para habilitar. | Abre **Resolver blockers** o la faceta dueña. |
| **Revisar** | Hay advertencia, pero no siempre bloquea. | Lee el detalle antes de completar. |
| **No aplica** | Esa lane no corresponde al tipo de relacion. | No requiere accion. |

Lanes principales:

- **Identidad y acceso:** Person 360 / client user / acceso base.
- **Relacion laboral:** contrato, fecha de ingreso, tipo de empleo, tipo de contrato.
- **Cargo y organizacion:** cargo vigente, departamento, unidad organizacional.
- **Compensacion:** salario, tarifa, moneda y vigencia.
- **Pago:** perfil de pago activo o aprobado segun maker-checker.
- **Onboarding operativo:** caso de onboarding laboral creado/activo.

## Flujo recomendado

1. Entra a **Personas y HR → Workforce Activation**.
2. Selecciona una persona en la cola.
3. Lee el inspector derecho. No partas por **Completar ficha** si hay blockers.
4. Presiona **Resolver blockers**.
5. Completa o corrige los datos laborales disponibles en el drawer:
   - fecha de ingreso
   - tipo de empleo
   - tipo de contrato
   - asistencia diaria, si aplica
   - motivo del cambio, si necesitas dejar contexto
6. Presiona **Guardar datos laborales**.
7. Revisa **Compensacion**. Si falta o esta desactualizada, usa **Abrir compensacion** y registra la version vigente desde el flujo dueño.
8. Revisa **Pago**. Si falta un perfil, usa **Agregar perfil**. Si existe en borrador, usa **Activar perfil**. Si requiere maker-checker y esta pendiente, un checker distinto al maker debe usar **Aprobar perfil**.
9. Si el inspector menciona perfil legal, identidad, cargo u organizacion, resuelve desde la faceta dueña en People/HR. Workforce Activation no duplica esos editores.
10. Vuelve al inspector y confirma que no queden blockers criticos.
11. Presiona **Completar ficha**.
12. Lee el drawer final, agrega nota si corresponde y confirma **Marcar como completada**.

## Reglas importantes

- **Resolver blockers** y **Completar ficha** son acciones distintas. La primera corrige datos; la segunda cierra el workflow.
- El guard final corre en backend. Aunque la UI se quede stale, el servidor bloquea una ficha incompleta.
- No edites `workforce_intake_status` por SQL. El cierre debe pasar por el endpoint canonico para dejar audit log y outbox event.
- No uses override como camino normal. Si se necesita, debe tener razon de negocio explicita.
- No crees datos duplicados de salario, cargo, legal profile o pago dentro de Workforce Activation. Usa la fuente dueña.
- Para `honorarios`/contractors, el engagement contractor aparece como warning V1 si la foundation TASK-790 aun no esta operativa; no debe bloquear por si solo.
- Si el pago es por Deel u otro proveedor externo, el perfil de pago interno puede quedar como warning segun el caso, no necesariamente como blocker.

## Avatares y Person 360

Los avatares de colaboradores internos vienen de Microsoft Entra. El flujo canonico es:

Microsoft Graph → Entra profile sync → GCS → `client_users.avatar_url` → `person_360.resolved_avatar_url` → `/api/media/users/{userId}/avatar`.

Si una persona cambia su foto en Microsoft, Greenhouse la actualiza cuando corre el sync de Entra. No subas fotos manualmente para corregir un caso normal de sincronizacion.

Si una persona tiene foto en Microsoft pero ves iniciales:

1. Recarga `/people`.
2. Verifica que la persona tenga user facet en Person 360.
3. Si sigue igual, pide ejecutar o revisar el sync canonico de Entra. No hagas SQL manual sobre `avatar_url`.

## Problemas comunes

| Sintoma | Causa probable | Solucion |
|---|---|---|
| No ves Workforce Activation en el menu | Falta view/capability o claims stale. | Cierra sesion y vuelve a entrar. Si persiste, pide revisar `workforce.member.activation_readiness.read`. |
| Una persona pendiente no aparece | Ya esta `completed`, esta inactiva o no tiene member operativo. | Revisa Person 360 y `workforce_intake_status`. |
| **Completar ficha** esta deshabilitado | Hay blockers criticos. | Usa **Resolver blockers** y revisa el primer blocker del inspector. |
| Al guardar fecha de ingreso aparece `Team member not found` | Flujo legacy intentando editar un member SCIM/PG-only. | Usa `/hr/workforce/activation?memberId=<id>` y guarda desde **Resolver blockers**. |
| El perfil de pago existe pero sigue bloqueando | Puede estar en borrador o pendiente de aprobacion. | Activalo o apruebalo desde el bloque **Pago** segun maker-checker. |
| No puedes aprobar un perfil de pago | El maker no puede ser checker. | Pide a otro usuario autorizado que apruebe. |
| Compensacion aparece pero readiness no cambia | Falta version vigente o no coincide moneda/vigencia. | Abre compensacion y confirma que haya version actual aplicable. |
| Aparece blocker de legal profile | Legal Profile sigue siendo faceta dueña. | Completa documentos/direccion/RUT desde People/HR. |
| Avatar aparece como iniciales | Falta materializar foto desde Entra o el proxy no encuentra asset. | Revisa el sync canonico de Entra; no edites avatar manualmente por SQL. |
| La ficha no desaparece tras completar | Cache o otra ventana stale. | Recarga. Si sigue, revisa si el backend devolvio error o si otra lane volvio a bloquear. |

## Que queda registrado

Al guardar o completar:

- actor que hizo el cambio
- timestamp
- datos laborales modificados
- razon o nota, si se ingreso
- outbox event correspondiente
- estado anterior y nuevo cuando se completa la ficha
- readiness snapshot para auditoria

## Referencias

- Manual cierre final: [Completar ficha laboral de un colaborador](completar-ficha-laboral.md)
- Doc funcional: [Workforce Activation Readiness](../../documentation/hr/workforce-activation-readiness.md)
- Payment profiles: [Perfiles de pago de beneficiarios](../finance/perfiles-de-pago-beneficiarios.md)
- SCIM con Entra: [SCIM con Microsoft Entra](../identity/scim-entra-provisioning.md)
- Spec TASK-874: `docs/tasks/complete/TASK-874-workforce-activation-readiness-workspace.md`
- Spec TASK-876: `docs/tasks/complete/TASK-876-workforce-activation-remediation-flow.md`

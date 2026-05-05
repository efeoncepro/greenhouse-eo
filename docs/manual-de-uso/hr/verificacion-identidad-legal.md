# Manual HR: Verificacion de identidad legal

> Para revisar, verificar o rechazar los documentos de identidad y direcciones que declaran los colaboradores.

## Para que sirve

Cuando un colaborador completa su RUT, pasaporte o direccion en `/my/profile`, el dato queda en estado "Pendiente de revision". HR debe verificarlo para que el finiquito y otros documentos formales puedan emitirse.

## Antes de empezar

- Tu rol debe tener route group `hr` o ser EFEONCE_ADMIN.
- Capability requerida para verificar: `person.legal_profile.verify`.
- Capability adicional para ver el RUT/direccion completos: `person.legal_profile.reveal_sensitive` (solo EFEONCE_ADMIN o FINANCE_ADMIN).

## Paso a paso

### Verificar un documento

1. Ve al perfil del colaborador (`/people/[id]`).
2. Abre la seccion **Identidad legal**.
3. Para cada documento o direccion en estado "Pendiente":
   - Click en **Verificar** si esta correcto.
   - O click en **Rechazar** si hay un problema. Ingresa el motivo (minimo 10 caracteres) y confirma.
4. El estado se actualiza inmediatamente. Para finiquito Chile, el banner "Bloqueadores" se reduce conforme verificas.

### Ver el valor completo (cuando es necesario)

Esta accion queda registrada en audit log. Solo usala cuando lo necesites para verificacion cruzada (ej. matchear con un certificado fisico, confirmar con un comprobante externo).

1. En la fila del documento o direccion, click en **Ver completo**.
2. Ingresa un motivo claro (minimo 5 caracteres). Ejemplo: "verificacion contra cedula entregada por colaborador".
3. Click en **Revelar**. El valor completo aparece en el dialogo. Cuando cierras el dialogo, ya no se vuelve a mostrar; tienes que volver a hacer reveal con motivo nuevo.

### Editar HR-direct

Si encuentras un error obvio (RUT mal escrito, direccion equivocada) y prefieres corregirlo en lugar de pedir al colaborador que vuelva a declararlo:

- Capability `person.legal_profile.hr_update` permite hacer la edicion. La accion queda en audit log con tu usuario.

## Que significan los estados

| Estado | Que hacer |
|---|---|
| Pendiente | Verifica o rechaza. |
| Verificado | OK. Cuenta para finiquito y documentos formales. |
| Rechazado | El colaborador debe volver a declarar. Si pasaron mas de 7 dias en este estado, considera contactarlo. |
| Archivado | Historial. No requiere accion. |
| Vencido | Pide al colaborador renovacion (raro para RUT, comun para pasaportes). |

## Banner de bloqueadores

Si ves un banner amarillo "Bloqueadores para emitir finiquito Chile", significa que ese colaborador NO puede emitir finiquito laboral hoy. Las posibles razones:

- `cl_rut_missing` — el colaborador nunca declaro su RUT
- `cl_rut_pending_review` — declaro pero falta tu verificacion
- `cl_rut_rejected` — fue rechazado y no se ha vuelto a declarar
- `cl_rut_archived_or_expired` — caso raro, contactar al colaborador
- `address_missing_legal` — falta direccion legal verificada

## Que NO hacer

- **No** marques verificado sin matchear con un comprobante (cedula, contrato firmado, etc.). El sistema confia en HR; un dato verificado erroneo se imprime en finiquito.
- **No** uses "Ver completo" como atajo para llenar planillas externas. Cada uso queda registrado y un patron de muchas reveals seguidas dispara la alerta `identity.legal_profile.reveal_anomaly_rate`.
- **No** rechaces sin motivo claro. El colaborador ve tu motivo y tiene que poder corregirlo.
- **No** edites HR-direct cuando el dato podria ser correcto pero ambiguo — preferible rechazar y pedir al colaborador que vuelva a declararlo.

## Problemas comunes

**"El boton Verificar no aparece"**
Verifica que tu rol tenga `person.legal_profile.verify`. Si eres analyst HR sin permiso, escala a un EFEONCE_ADMIN.

**"El sistema dice que el documento no esta en estado verificable"**
Significa que ya esta archivado, vencido, o rechazado. Si el colaborador ya declaro uno nuevo, busca la fila mas reciente.

**"El banner sigue mostrando un bloqueador despues de verificar"**
Refresca la pagina. Si persiste, verifica que estes verificando el documento correcto (CL_RUT/CL para Chile, no GENERIC_NATIONAL_ID por error).

**"Quiero ver el historial de cambios"**
Endpoint `GET /api/hr/people/[memberId]/legal-profile` retorna documentos archivados con `?includeArchived=true` (proximamente UI).

## Reliability signals

El sistema tiene 4 alertas automaticas en `/admin/operations`:

- `identity.legal_profile.pending_review_overdue` — documentos pendientes mas de 7 dias
- `identity.legal_profile.payroll_chile_blocking_finiquito` — members Chile activos sin RUT verificado
- `identity.legal_profile.reveal_anomaly_rate` — usuarios con > 3 reveals en 24h
- `identity.legal_profile.evidence_orphan` — referencias a evidencia que no existe

## Referencias tecnicas

- `docs/documentation/identity/datos-legales-personales.md` (doc funcional)
- API: `/api/hr/people/[memberId]/legal-profile/{,document,address}/{verify,reject,reveal}`
- Spec: `docs/tasks/in-progress/TASK-784-person-legal-profile-identity-documents-foundation.md`

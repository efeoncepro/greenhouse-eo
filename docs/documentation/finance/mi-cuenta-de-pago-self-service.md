> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-05-05 por agente (TASK-753)
> **Ultima actualizacion:** 2026-05-05 por agente (TASK-753)
> **Documentacion tecnica:** `docs/tasks/complete/TASK-753-payment-profiles-self-service.md`, `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`

# Mi Cuenta de Pago — Self-service del colaborador

## Para que sirve

Cada colaborador en Greenhouse tiene una cuenta donde recibe sus pagos: nomina mensual, honorarios, finiquito, ajustes salariales, etc. Antes de TASK-753, si el colaborador queria saber cual era su cuenta registrada o pedir un cambio (mudanza, cambio de banco, error en los datos), tenia que abrir un ticket manual a finance.

Ahora cada persona puede:

- Ver su cuenta activa desde su Greenhouse personal (con datos enmascarados — nunca se muestra el numero completo de cuenta).
- Solicitar un cambio o un alta (si finance todavia no registro su cuenta).
- Cancelar su propia solicitud antes de que finance la apruebe.
- Recibir un correo automatico cuando su cuenta sea registrada, aprobada, reemplazada o cancelada.

Finance sigue siendo quien aprueba — el colaborador NUNCA puede aprobar su propio cambio (regla de maker-checker enforced en codigo y base de datos).

## Donde se ve

- **Menu lateral** → "Mi Ficha" → **Mi Cuenta de Pago** (icon `tabler-credit-card`).
- **Tab dentro de Mi Perfil** (`/my/profile`) → **Cuenta de pago**.
- Ambas surfaces muestran lo mismo y son intercambiables (single source of truth en codigo).

## Que decide el colaborador y que decide finance

Una decision frecuentemente confundida: el colaborador NO elige el medio de envio (banco interno, Deel, Wise, PayPal, etc.). Eso lo decide finance al aprobar, segun el regimen, pais, costo y relacion bancaria. El colaborador SOLO declara identidad bancaria (su banco, numero de cuenta, RUT/documento, nombre del titular).

| Quien decide | Que decide |
| --- | --- |
| Colaborador | Banco · Tipo de cuenta · Numero de cuenta · RUT/documento · Nombre del titular · Comentario opcional |
| Finance (al aprobar) | Proveedor (bank_internal/Deel/Wise/etc.) · Metodo (transferencia/wire/wallet) · Schedule de pagos · Conformidad KYC |

Esto se refleja en el formulario: nunca veras "Proveedor" o "Metodo" como inputs — finance los completa atras.

## El formulario es regimen-aware

Greenhouse detecta tu regimen automaticamente (Chile dependiente, honorarios Chile, internacional) desde tu contrato + pais. El formulario muestra distintos campos segun el regimen:

| Regimen | Campos del formulario |
| --- | --- |
| **Chile dependiente / honorarios** (CLP) | Banco · Tipo de cuenta · Numero de cuenta · RUT del titular · Nombre del titular · Comentario opcional |
| **Internacional** (USD) | Pais del banco · Banco · SWIFT/BIC · IBAN o numero de cuenta · Nombre legal del titular · Comentario opcional |
| **Sin determinar** | (No hay formulario; CTA "Contactar finance" para que completen tu identidad primero) |

El nombre del titular y el documento legal se pre-rellenan desde tus Datos legales (TASK-784) si los completaste antes. Si no, podes editarlo ahi mismo.

## Estados de tu cuenta

| Estado | Que significa |
| --- | --- |
| **Cuenta activa** | Esta es la cuenta donde recibes pagos hoy. Aprobada por finance. |
| **En revision** | Tu solicitud (alta o cambio) esta esperando aprobacion de finance. |
| **Cancelada** | La solicitud fue cancelada (por vos o por finance). |
| **Reemplazada** | Esta cuenta fue reemplazada por una nueva mas reciente (historial). |

Solo veras "Activa" + opcionalmente "En revision". Las canceladas/reemplazadas son historico interno que no aparece en tu vista.

## Notificaciones por email

Greenhouse te avisa por email cada vez que cambia el estado de tu cuenta:

| Evento | Subject del email |
| --- | --- |
| Solicitud creada | "Solicitud de cambio de cuenta de pago registrada" |
| Aprobada por finance | "Tu cuenta de pago fue aprobada" |
| Reemplazada por una nueva | "Tu cuenta de pago fue reemplazada" |
| Cancelada | "Tu solicitud de cambio fue cancelada" |

**El email llega en 1-3 segundos** despues de que confirmas la accion. Esto es resultado del drenaje inline del pipeline de eventos (ver "Como llega tan rapido" abajo).

Por seguridad, el correo NUNCA muestra el numero completo de cuenta. Solo los ultimos 4 digitos (`•••• 4883`).

## Como llega tan rapido (eventual consistency con drenaje inline)

Antes de TASK-753 los emails transaccionales se procesaban via crons cada 2-5 min. Buena resilencia, mala UX (latencia de 5-7 min entre submit y email).

La solucion canonica de TASK-753: cuando confirmas una accion (crear/cancelar solicitud), el portal hace el commit + drena el pipeline outbox+reactive INLINE en el response cycle. Resultado:

- **Best case (~99%)**: email llega en 1-3 segundos (drenaje inline exito).
- **Worst case (~1% — fallo de Resend, network blip, lambda muere)**: el evento queda en la cola; el cron de respaldo lo procesa al proximo tick (≤5 min). **Tu solicitud nunca se pierde**.

El sistema garantiza que si tanto el drenaje inline como el cron procesan el mismo evento, **solo un email se envia** (idempotency-by-design via locks de Postgres + UNIQUE constraint en la tabla de logs).

## Reglas duras

1. **Nunca puedes aprobar tu propio cambio.** El endpoint de aprobacion (admin) tiene un guard: `actorUserId !== profile.createdBy`. Un trigger en la base de datos lo enforce a nivel DB tambien.
2. **Las solicitudes propias solo las podes cancelar VOS** (no otro colaborador).
3. **Solo se cancelan solicitudes en estado pending o draft.** Una cuenta activa la cambia o desactiva finance, no el colaborador.
4. **Los datos sensibles** (numero completo de cuenta, RUT) se enmascaran en lectura. Solo finance con capability `finance.payment_profiles.reveal_sensitive` puede ver el dato completo (con auditoria + razon obligatoria).
5. **Tu RUT debe coincidir con tu identidad legal** (TASK-784). Si difiere, finance lo va a marcar como discrepancia y no aprobara hasta resolverlo.

## Que NO esta cubierto en V1

- Verificacion de cuenta con micro-deposit (queda para TASK-754).
- Vault externo del numero de cuenta (queda para TASK-754).
- Splits multi-cuenta (70% wallet + 30% banco) — lo recibe finance manual al aprobar (queda para TASK-755).

> **Detalle tecnico:**
> - Spec canonica: `docs/tasks/complete/TASK-753-payment-profiles-self-service.md`
> - Capabilities granulares: `personal_workspace.payment_profile.read_self`, `personal_workspace.payment_profile.request_change_self`
> - Codigo: `src/lib/finance/beneficiary-payment-profiles/self-service.ts`, `src/views/greenhouse/my/MyPaymentProfileView.tsx`, `src/views/greenhouse/my/payment-profile/RequestChangeDialog.tsx`
> - Inline drain helper: `drainOutboxPipelineForFinance` en `self-service.ts`
> - Outbox events: `finance.beneficiary_payment_profile.{created,approved,superseded,cancelled}`
> - Email type: `beneficiary_payment_profile_changed`
> - Mockup canonico: `docs/mockups/task-753-my-payment-profile-self-service-redesign.html`

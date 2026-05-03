# Perfiles de pago — Manual de uso

> **Para que sirve**: definir cómo se paga a cada colaborador o accionista
> (banco local, Deel, Wise, Global66, etc) con maker-checker y datos sensibles
> protegidos.

## Antes de empezar

- Necesitas pertenecer al route group `finance` o tener rol `efeonce_admin`.
- Para ver el tab "Pago" en Person 360 necesitas rol `finance_admin`,
  `finance_analyst` o `efeonce_admin`.
- Para aprobar un perfil necesitas un segundo usuario distinto al creador
  (regla maker-checker).

## Donde encontrarlos

### En Person 360 (fuente primaria de colaboradores)

`/people/[memberId]?tab=payment` — tab "Pago" con CRUD completo del perfil
de la persona.

### En Shareholder 360 (fuente primaria de accionistas)

`/finance/shareholder-account` → click en una cuenta → drawer detalle →
seccion "Perfiles de pago".

### Vista ops cross-entity

`/finance/payment-profiles` — read-only. Sirve para:
- Aprobar perfiles en cola
- Detectar drift (obligaciones bloqueadas por falta de perfil)
- Auditar el universo
- Click en cualquier fila te lleva al 360 correcto para editar

## Crear un perfil

1. Entra a Person 360 o Shareholder 360 del beneficiario.
2. En el tab/seccion "Pago", click en **+ Agregar perfil**.
3. Llena el formulario:
   - **Moneda**: CLP o USD (un perfil por moneda)
   - **Pais**: codigo de 2 letras (CL, CO, AR, etc)
   - **Provider**: BCI, Banco Chile, Wise, Global66, Deel, etc.
   - **Metodo de pago**: bank_transfer, wise, global66, deel, paypal, etc.
   - **Titular**: nombre que figura como titular en la cuenta destino
   - **Numero de cuenta**: se enmascara al guardar
   - **Banco**: nombre del banco/plataforma
   - **Notas internas**: contexto operativo
   - **Requiere aprobacion**: déjalo activo (default).
4. Click en **Crear perfil**. Entra como **Pendiente aprobacion**.

> El creador NO puede aprobar su propio perfil. Pidele a otro usuario que lo
> apruebe.

## Aprobar un perfil

Solo aplica a perfiles en estado **Pendiente aprobacion**.

1. Entra al perfil (desde Person 360, Shareholder 360, o desde la cola en
   `/finance/payment-profiles`).
2. Si tu usuario es distinto al maker, veras el boton **Aprobar**.
3. Click → el perfil pasa a **Activo**. Si habia otro perfil activo para la
   misma (moneda, beneficiario), queda automaticamente como **Reemplazado**.

## Revelar datos sensibles

Solo lo puede hacer un usuario con capability `finance.payment_profiles.reveal_sensitive`.

1. Abre el detalle del perfil en Person 360 / Shareholder 360.
2. En la seccion "Cuenta destino", click en **Revelar numero completo**.
3. Ingresa un motivo de 5+ caracteres (ej. "Verificacion pre-pago marzo 2026").
4. El sistema muestra el numero completo durante 60 segundos y registra:
   - Tu user ID, IP, user-agent
   - Timestamp
   - Motivo
   - Outbox event `finance.beneficiary_payment_profile.revealed_sensitive`

## Cancelar un perfil

Solo aplica a perfiles en estado Borrador, Pendiente aprobacion, o Activo.

1. Abre el detalle.
2. Click en **Cancelar perfil** → ingresar motivo (3+ caracteres).
3. El perfil pasa a **Cancelado** y libera la slot para crear uno nuevo.

## Cola de aprobacion (vista ops)

`/finance/payment-profiles` muestra:
- **Cola**: perfiles esperando checker. Click en uno → abre el drawer con boton
  Aprobar.
- **Drift**: beneficiarios con obligaciones vivas sin perfil activo. Esto
  bloquea las orders de pago. Click → te lleva al 360 para crear el perfil.
- **Tabla universal**: todos los perfiles en read-only. Click en una fila →
  deep link al 360 correcto.

## Que NO hacer

- **NO** apruebes tu propio perfil — usa otro usuario para mantener
  trazabilidad.
- **NO** edites un perfil activo a mano en la base. Crea uno nuevo (al
  aprobarlo, el viejo queda superseded).
- **NO** reveles datos sensibles sin motivo legitimo — todo queda en audit log.
- **NO** crees orders cuando hay drift sin resolver — primero crea el perfil.

## Problemas comunes

| Sintoma | Causa probable | Solucion |
|---------|----------------|----------|
| "Maker-checker: el creador no puede aprobar su propio perfil" | El usuario que intenta aprobar es el mismo que lo creo | Pedir a otro usuario con permisos de finanzas |
| "V1 solo soporta beneficiary_type member o shareholder" | Intentaste crear un perfil para supplier, tax_authority o processor | Esperar V2 o registrar el rail manualmente en la order |
| Las orders de un colaborador no se generan automaticamente con el provider correcto | No hay perfil activo o esta en pending_approval | Aprobar el perfil; el resolver lo tomara automaticamente en proximas orders |
| El boton "Revelar numero completo" no aparece | No tienes capability `finance.payment_profiles.reveal_sensitive` | Pedir el grant a un admin |

## Referencias tecnicas

- Spec: [docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md)
- Doc funcional: [docs/documentation/finance/perfiles-de-pago-beneficiarios.md](../../documentation/finance/perfiles-de-pago-beneficiarios.md)
- Helpers TS: [src/lib/finance/beneficiary-payment-profiles/](../../../src/lib/finance/beneficiary-payment-profiles/)
- Resolver: [src/lib/finance/payment-routing/resolve-route.ts](../../../src/lib/finance/payment-routing/resolve-route.ts)
- API admin: [src/app/api/admin/finance/payment-profiles/](../../../src/app/api/admin/finance/payment-profiles/)
- Componente Panel: [src/views/greenhouse/finance/payment-profiles/PaymentProfilesPanel.tsx](../../../src/views/greenhouse/finance/payment-profiles/PaymentProfilesPanel.tsx)
- Person 360 mount: [src/views/greenhouse/people/tabs/PersonPaymentTab.tsx](../../../src/views/greenhouse/people/tabs/PersonPaymentTab.tsx)
- Shareholder 360 mount: [src/views/greenhouse/finance/shareholder-account/ShareholderAccountDetailDrawer.tsx](../../../src/views/greenhouse/finance/shareholder-account/ShareholderAccountDetailDrawer.tsx)
- Surface ops: [src/views/greenhouse/finance/payment-profiles/PaymentProfilesView.tsx](../../../src/views/greenhouse/finance/payment-profiles/PaymentProfilesView.tsx)
- Schema migration: [migrations/20260501151805031_task-749-beneficiary-payment-profiles.sql](../../../migrations/20260501151805031_task-749-beneficiary-payment-profiles.sql)

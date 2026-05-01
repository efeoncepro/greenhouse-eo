# Perfiles de pago por beneficiario

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-05-01 por Julio Reyes
> **Ultima actualizacion:** 2026-05-01 por Julio Reyes
> **Documentacion tecnica:** [docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md)

## Que es

Cada colaborador o accionista tiene un perfil de pago que define **por que rail
se le paga** (banco local, Deel, Wise, Global66, manual, etc). El perfil es
versionado y se aprueba con maker-checker. Los datos sensibles (numero de cuenta
completo) se enmascaran y solo se revelan con permiso explicito + audit log.

## Donde vive

Greenhouse usa un **modelo dual-surface**: una sola pieza de UI reutilizable
montada en 3 lugares.

| Surface | Quien lo usa | Que puede hacer |
|---|---|---|
| Person 360 - tab "Pago" | Manager/Admin del miembro | Crear, editar, aprobar, cancelar, revelar datos |
| Shareholder 360 - seccion "Perfil de pago" | Admin de cuenta accionista | Crear, editar, aprobar, cancelar |
| Finance Ops `/finance/payment-profiles` | Checker de finanzas | Aprobar pendientes, ver drift, auditar universal |

**Regla**: la creacion y edicion siempre vive con el beneficiario (Person 360 o
Shareholder 360). La surface ops es read-only y existe para 3 jobs:

1. Cola de aprobacion (perfiles esperando checker)
2. Drift card: beneficiarios con obligaciones vivas pero sin perfil activo
3. Tabla universal con deep links a cada 360

## Estados

| Estado | Que significa |
|---|---|
| Borrador | El maker creo el perfil pero aun no esta listo |
| Pendiente aprobacion | Esperando checker (otro usuario distinto al maker) |
| Activo | Vigente. Una sola fila por (beneficiario, moneda, espacio) |
| Reemplazado | Existe un nuevo perfil activo que lo reemplazo |
| Cancelado | Anulado con motivo |

## Flujo tipico

1. **Crear**: en Person 360 / Shareholder 360, click en "+ Agregar perfil".
   Llenar provider, metodo, cuenta destino, banco, etc.
2. **Aprobar**: otro usuario distinto al maker entra al perfil y hace click en
   "Aprobar". El sistema bloquea si maker == checker (triple defensa: trigger DB
   + helper TS + UI).
3. **Editar**: editar un perfil activo crea uno nuevo. Al aprobarse, el viejo
   queda automaticamente como "Reemplazado" en la misma transaccion.
4. **Revelar datos sensibles**: solo desde Person 360 / Shareholder 360 con
   capability `finance.payment_profiles.reveal_sensitive` + motivo de 5+
   caracteres. Queda en audit log con IP y timestamp; auto-oculta en 60s.

## Como conecta con Order Orders

Cuando se crea una payment order desde obligaciones:

1. Si el caller entrega `processorSlug` y `paymentMethod`, se usan tal cual.
2. Si NO los entrega, el resolver consulta el perfil activo del beneficiario y
   resuelve automaticamente provider + metodo + instrumento.
3. Si no hay perfil activo, se anota en `metadata_json.routing_snapshots` con
   outcome `profile_missing` y la order queda con processor null (el operator
   debe completarlo manualmente).

El drift card en la surface ops detecta exactamente este caso: beneficiarios
con obligaciones vivas que no tienen perfil activo y bloquearian las orders.

## Reglas duras

- Datos sensibles enmascarados por default. Reveal requiere capability + motivo.
- Maker-checker: el creador no puede aprobar su propio perfil.
- Una sola fila activa por (espacio, beneficiario, moneda).
- Aprobar nuevo perfil supersede el anterior atomicamente (mismo unique index
  garantiza no haber dos activos simultaneos).
- V1 enfoca beneficiary_type en `member` y `shareholder`. Otros tipos
  (supplier, tax_authority, processor) en V2.

## Eventos auditados

Cada accion publica un evento en `greenhouse_sync.outbox_events`:

- `finance.beneficiary_payment_profile.created`
- `finance.beneficiary_payment_profile.approved`
- `finance.beneficiary_payment_profile.superseded`
- `finance.beneficiary_payment_profile.cancelled`
- `finance.beneficiary_payment_profile.revealed_sensitive`

> Detalle tecnico: helpers en [src/lib/finance/beneficiary-payment-profiles/](../../../src/lib/finance/beneficiary-payment-profiles/).
> Resolver en [src/lib/finance/payment-routing/resolve-route.ts](../../../src/lib/finance/payment-routing/resolve-route.ts).
> API en [src/app/api/admin/finance/payment-profiles/](../../../src/app/api/admin/finance/payment-profiles/).
> Schema en [migrations/20260501151805031_task-749-beneficiary-payment-profiles.sql](../../../migrations/20260501151805031_task-749-beneficiary-payment-profiles.sql).

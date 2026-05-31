# Manual de uso — Pagos a Contractors (Finanzas)

> **Para:** operador de Finanzas
> **Ruta:** Finanzas › Tesorería › Pagos a contractors (`/finance/contractor-payments`)
> **Creado:** 2026-05-31 (TASK-974)

## Para qué sirve

Procesar los pagos a contractors: ver qué hay que pagar, calcular el neto, resolver bloqueos y autorizar el pago. Es el paso de Finanzas entre "el contractor cobró" y "el banco paga".

## Antes de empezar

- Necesitas rol de Finanzas (`finance_admin` / `finance_analyst`) o `efeonce_admin`.
- El **override** (pagar por encima del monto acordado) y el **waiver** (pagar sin perfil de pago resuelto) requieren capability adicional — si no la tienes, el botón no aparece.
- El monto a pagar lo fija HR en el engagement. Tú no cambias el monto acordado: lo pagas, o autorizas una excepción documentada.

## Paso a paso

### 1. Ver qué hay que pagar

Abre la pantalla. Arriba ves 4 indicadores: **Por preparar**, **Bloqueados**, **Listos para Finanzas**, **Pagados este mes**. Abajo, la lista de payables. Filtra por estado con el selector "Todos".

### 2. Crear el pago (calcular el neto)

- **Crear desde envío**: elige el engagement → el envío de trabajo aprobado → la pantalla calcula el **neto** (bruto − retención SII) → crear.
- **Pago off-cycle**: para ajustes, bonos o reembolsos. Indica engagement + bruto + moneda + motivo (mínimo 10 caracteres).

### 3. Revisar el detalle

Selecciona un payable en la lista. A la derecha ves:

- **Bruto − Retención = Neto** (el neto, en verde, es lo que va al banco).
- **Readiness**: la lista de bloqueos. Cada uno dice **de quién es** resolverlo (Finanzas / HR / Contractor).

### 4. Resolver bloqueos y autorizar

- Si está **listo**, presiona **Enviar a Finanzas**. El payable pasa a `ready_for_finance` y el sistema genera la obligación → orden de pago → banco automáticamente.
- Si falta el **perfil de pago** del contractor: **Waiver de perfil de pago** (motivo ≥ 10, queda auditado).
- Si el pago **excede el monto acordado**: **Override de monto acordado** (motivo ≥ 10, queda auditado). Solo Finanzas.
- Si ya no aplica: **Cancelar**.

## Qué significan los estados

| Chip | Significado | Qué haces |
|---|---|---|
| Por preparar | Recién creado | Revisa readiness y envíalo |
| Bloqueado | Falló un chequeo | Mira los bloqueos y resuelve / waiver / override |
| Listo para Finanzas | Enviado al puente | Esperar (lo procesa el sistema) |
| En curso | Obligación / orden creándose | Solo lectura |
| Pagado | Liquidado al banco | Link al comprobante de pago |
| Cancelado | Cerrado sin pago | Nada |

## Qué no hacer

- **No** intentes cambiar el monto acordado desde acá: eso es de HR. Si hay que pagar de más, usa **Override** (queda registrado).
- **No** te bases en un neto "a ojo": el sistema lo calcula del payable. Si un número se ve raro, revisa el engagement, no la pantalla.
- **No** envíes a Finanzas un payable con bloqueos sin resolverlos primero (te devuelve el detalle de qué falta).

## Problemas comunes

- **"Sin payables"**: no hay payables en ese estado todavía. Crea uno desde un envío aprobado.
- **El botón Override / Waiver no aparece**: no tienes la capability. Pídela a un admin.
- **Enviar a Finanzas falla**: el payable aún tiene bloqueos — el detalle de readiness te dice cuáles.

## Referencias técnicas

- Doc funcional: [pagos-a-contractors.md](../../documentation/finance/pagos-a-contractors.md)
- Spec del dominio: [GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md)
- Comprobante de pago (paso siguiente): [contratistas-comprobante-de-pago.md](../hr/contratistas-comprobante-de-pago.md)

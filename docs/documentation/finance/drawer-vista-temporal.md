# Detalle de cuenta — Vista temporal del drawer

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-05-03 por Claude (TASK-776 close-out)
> **Documentacion tecnica:**
> - Spec arquitectonica: [GREENHOUSE_FINANCE_ARCHITECTURE_V1 — Delta TASK-776](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md)
> - Tasks: [TASK-776 — Account Detail Drawer Temporal Modes Contract](../../tasks/in-progress/TASK-776-account-detail-drawer-temporal-modes-contract.md) · [TASK-774 — Account Balance CLP-Native Reader Contract](../../tasks/complete/TASK-774-account-balance-clp-native-reader-contract.md)
> - Documentacion relacionada: [Saldos de cuenta y consistencia FX](saldos-de-cuenta-fx-consistencia.md)

## Para que sirve

Cuando abrís el detalle de una cuenta en `/finance/bank` (click en cualquier cuenta de la tabla), el drawer muestra varias cosas al mismo tiempo: KPIs (saldo, deuda, cupo), un chart de últimos 12 meses, y una lista de "Movimientos de la tarjeta". Este documento explica qué ventana temporal usa cada surface y cómo cambiarla.

## El problema que resolvía

Antes de TASK-776 (mayo 2026), la lista de movimientos del drawer estaba **estrictamente filtrada por el mes seleccionado en el dashboard padre** (ej. Mayo 2026). Eso causaba confusión cuando:

- El balance de la TC mostraba $1.225.047 (correcto, incluye un cargo Figma de fines de abril).
- La lista "Movimientos de la tarjeta" estaba vacía porque Figma fue 29/04 (abril) y el filtro era mayo.
- El operador veía "balance bajó pero no veo el cargo" → tenía que investigar por su cuenta o reportar como bug.

## Como funciona ahora

El drawer tiene un **selector inline** (esquina superior derecha de "Movimientos de la tarjeta") con 3 modos:

| Modo | Cuándo usar | Qué muestra |
|---|---|---|
| **Reciente** | "Qué pasa con esta cuenta hoy" — chequeo rápido | Movimientos de los últimos 30 días desde hoy |
| **Período** | "Estoy cerrando Mayo" — workbench de cierre mensual | Movimientos del mes seleccionado en el dashboard padre |
| **Histórico** | "Necesito auditoría completa" — investigación / accionista | Movimientos desde el ancla del OTB (típicamente meses) |

El **chip header** te dice exactamente qué ventana estás mirando:

- "Mostrando: Últimos 30 días"
- "Mostrando: Mayo 2026"
- "Mostrando: Desde 07/04/2026"

### Default por categoría de cuenta

Cada tipo de cuenta abre con un default semánticamente correcto (no necesitás clickear nada en la mayoría de casos):

| Categoría | Default | Por qué |
|---|---|---|
| Tarjeta de crédito (Santander Corp, etc.) | Reciente | Caso de uso #1: "qué cargué esta semana" |
| Cuenta corriente (Santander, Global66, etc.) | Reciente | Idem |
| Fintech (Deel cash, etc.) | Reciente | Idem |
| Cuenta corriente accionista (CCA) | Histórico | Auditoría completa de aportes/reembolsos |
| Procesador (Previred, payroll vendors) | Período | Cierre mensual de comisiones procesador |

### Cuándo cambiar de modo

- Estás revisando la TC un lunes a la mañana → quedate en **Reciente** (default).
- Estás cerrando el período Mayo 2026 con tu contador → cambiá a **Período** (hereda el mes del dashboard padre).
- El accionista pide ver todos los aportes desde que abriste la cuenta → cambiá a **Histórico**.

## Que NO hacer

- **NUNCA** asumas que "Movimientos de la tarjeta" muestra todo lo cargado a la cuenta. Lee el chip header para saber qué ventana estás mirando.
- **NUNCA** reportes "el cargo no aparece en el drawer" sin antes cambiar el modo a **Reciente** o **Histórico**.
- **NUNCA** uses el dashboard padre (`/finance/bank` selector de período) para filtrar — eso solo afecta el modo **Período** del drawer. **Reciente** e **Histórico** son independientes del padre.

## Quien puede operar esto

Cualquier rol con acceso al módulo `/finance/bank`:

- Finance Admin
- Efeonce Admin
- Roles con `route_group_scope` que incluye `finance`

No requiere capability granular adicional.

## Problemas comunes

- **"Cambié de modo y no se actualiza"** → debería refetch automático. Si no lo hace, refresh del browser. Reportá si persiste (puede ser bug del cache).
- **"En modo Reciente no veo movimientos pero sé que hay"** → puede ser que sean > 30 días atrás. Cambiá a **Histórico** o **Período** apuntando al mes correcto.
- **"En modo Histórico veo movimientos antiguos pero no los nuevos"** → revisá el rango de fechas (banner). Si el ancla del OTB está mal declarado, hablá con finance.
- **"El selector no aparece"** → estás en una cuenta de tipo `payroll_processor` que tiene su propia vista (digest de procesador, no lista cronológica de movimientos).

## Referencias tecnicas

- Helper canonico: `resolveTemporalWindow` en `src/lib/finance/temporal-window.ts`
- Contract types: `TemporalMode` + `TemporalDefaults` en `src/lib/finance/instrument-presentation.ts`
- Endpoint: `/api/finance/bank/[accountId]?mode=snapshot|period|audit&windowDays=30`
- Componente UI: `AccountDetailDrawer` en `src/views/greenhouse/finance/components/AccountDetailDrawer.tsx`
- Tests helper: `src/lib/finance/temporal-window.test.ts`

# Finance Movement Feed

> **Tipo de documento:** Documentacion funcional y contrato de reutilizacion
> **Version:** 1.0
> **Creado:** 2026-04-29 por Codex
> **Ultima actualizacion:** 2026-04-29 por Codex
> **Modulo:** Finanzas / Componentes compartidos
> **Componente:** `src/components/greenhouse/finance/FinanceMovementFeed.tsx`
> **Documentacion relacionada:** [Conciliacion bancaria](conciliacion-bancaria.md), [TASK-726](../../tasks/complete/TASK-726-finance-movement-feed-foundation.md), [TASK-728](../../tasks/complete/TASK-728-finance-movement-feed-decision-polish.md), [Arquitectura Finance](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md), [Arquitectura UI](../../architecture/GREENHOUSE_UI_PLATFORM_V1.md)

## Para que sirve

`FinanceMovementFeed` es la primitive reusable para mostrar movimientos financieros operativos en formato feed: pagos, cobros, filas bancarias, legs de settlement o sugerencias. Nacio en Conciliacion para reemplazar tablas que se rompian con descripciones largas, pero no pertenece solo a esa pantalla.

Debe usarse cuando el usuario necesita leer movimientos uno por uno, comparar monto, instrumento, proveedor, estado y trazabilidad, sin perder contexto por scroll horizontal o columnas demasiado densas.

## Donde se usa hoy

- `/finance/reconciliation`: cola de **Movimientos de caja por conciliar**.
- Base reutilizable para futuras vistas de banco, tarjeta de credito, cuenta corriente accionista, cash position, settlements y colas de revision financiera.

## Que resuelve

- Descripciones largas con wrapping seguro, sin truncar el dato persistido.
- Agrupacion por dia con conteo y subtotal opcional.
- Monto alineado a la derecha para lectura rapida.
- Instrumento financiero visible como senal principal, no como metadata secundaria.
- Identidad visual de proveedor cuando el catalogo entrega un logo verificado.
- Fallback consistente a iniciales o iconos semanticos cuando el logo no esta validado.
- Virtualizacion encapsulada para listas grandes con `@tanstack/react-virtual`.
- Estados accesibles y copy operativo: `Pago pendiente`, `Cobro pendiente`, `Sugerido AI`, `Conciliado`, etc.

## Regla de seguridad

El componente es **read-only**.

No debe:

- calcular saldos;
- conciliar movimientos;
- crear `income_payments` o `expense_payments`;
- modificar `account_balances`;
- rematerializar balances;
- cerrar periodos;
- inferir datos contables que no vengan del backend.

Si una pantalla muestra `runningBalance`, ese valor debe venir de un read model, snapshot o API del dominio financiero. El feed solo lo renderiza.

## API publica

El contrato vive en `src/components/greenhouse/finance/finance-movement-feed.types.ts`.

### Props principales

| Prop | Uso |
|---|---|
| `items` | Lista de movimientos ya normalizados para UI. |
| `title` / `subtitle` | Encabezado del feed cuando no se usa en modo embebido. |
| `density` | `comfortable` o `compact`, segun espacio disponible. |
| `loading`, `error`, `emptyTitle`, `emptyDescription` | Estados de carga, error y vacio. |
| `summaryItems` | KPIs cortos sobre el feed, por ejemplo total pendiente o monto neto. |
| `lastUpdatedLabel` | Texto de frescura si el read model lo expone. |
| `showDayTotals` | Muestra subtotal por grupo diario. |
| `showRunningBalance` | Muestra saldo posterior solo si viene precalculado. |
| `providerCatalog` | Catalogo visual de proveedores SaaS/tooling. |
| `paymentProviderCatalog` | Catalogo visual de bancos, tarjetas, wallets o rails de pago. |
| `virtualized` | Activa virtualizacion para listas grandes. |
| `virtualizeThreshold` | Umbral desde el cual conviene virtualizar. Default operativo: 80 items. |
| `estimateItemSize`, `overscan`, `maxHeight` | Parametros de performance y viewport del virtualizer. |
| `embedded` | Usa el feed sin contenedor/cabecera propia dentro de otra superficie. |
| `onItemSelect` | Callback para abrir drawer, dialog o detalle externo. |

### Shape minimo de item

```ts
type FinanceMovementFeedItem = {
  id: string
  date: string | null
  title: string
  amount: number
  currency: string
  direction: 'in' | 'out' | 'neutral'
  sourceType:
    | 'bank_statement'
    | 'cash_in'
    | 'cash_out'
    | 'settlement_leg'
    | 'suggestion'
    | 'payment_provider'
    | 'tooling_provider'
    | 'unknown'
  sourceId: string
}
```

Campos recomendados cuando existan:

- `description`: detalle largo o glosa original.
- `counterparty`: contraparte normalizada.
- `instrumentName`: nombre visible de cuenta, tarjeta, CCA, wallet o rail.
- `instrumentCategory`: categoria canonica del instrumento.
- `paymentProviderSlug`: slug del banco/proveedor de pago para resolver logo.
- `providerId` o `toolCatalogId`: proveedor SaaS/tooling cuando aplique.
- `status`: `pending`, `suggested`, `matched`, `excluded` o `review`.
- `runningBalance`: saldo posterior precalculado.
- `details`: pares label/value para trazabilidad expandible.
- `href` o `onItemSelect`: navegacion o apertura de detalle.

## Catalogos visuales

La resolucion visual sigue este orden:

1. `item.visual`, si el caller ya trae una identidad auditada.
2. `paymentProviderCatalog[item.paymentProviderSlug]`, para bancos, tarjetas, wallets o rails.
3. `providerCatalog[item.providerId]`, para tooling/SaaS.
4. Fallback semantico por direccion y tipo de fuente.

Reglas:

- No hardcodear logos dentro de una pantalla.
- No mostrar un logo externo si `logoStatus` no es `verified`.
- Si el logo no esta verificado, usar iniciales, color/tone o icono semantico.
- El catalogo puede enriquecerse desde Provider 360, tool catalog, payment providers o manifests compartidos; el feed solo consume el resultado.

## Instrumento financiero

El instrumento no es decoracion. En movimientos financieros responde la pregunta: **por donde entro o salio el dinero**.

Debe venir preparado desde la capa de datos como:

- `instrumentName`: por ejemplo `Santander Corp.`, `CCA - Julio Reyes`, `Global66`, `Tarjeta Santander`.
- `instrumentCategory`: `bank_account`, `credit_card`, `shareholder_account`, `wallet`, `payment_rail`, etc.
- `paymentProviderSlug`: banco o proveedor de pago cuando exista identidad visual confiable.

Si una fuente no tiene instrumento, el feed debe degradar de forma limpia sin inventarlo.

## Virtualizacion

Para listas grandes, usar `virtualized`. La pantalla no debe importar `@tanstack/react-virtual` directamente salvo que este creando una primitive nueva.

Defaults recomendados:

- `virtualizeThreshold`: 80.
- `estimateItemSize`: 88.
- `overscan`: 8.
- `maxHeight`: 560.

La virtualizacion es una decision de rendering, no de datos. La API debe seguir paginando o limitando cuando el volumen real lo requiera.

## Reglas de reutilizacion

1. Normaliza datos en helpers del dominio, no dentro del JSX de la pantalla.
2. Pasa catalogos visuales desde una fuente compartida; no dupliques manifests por pantalla.
3. Mantiene el feed read-only; cualquier mutacion vive en dialogs, commands o API routes del dominio.
4. No mezcles calculos de balance en el componente; consume snapshots o read models.
5. Usa `details` para trazabilidad, no para esconder campos necesarios para decidir.
6. Si el movimiento es clickeable, la accion debe abrir detalle, drawer o workbench contextual.
7. Si una pantalla necesita columnas comparativas o edicion masiva, usa tabla; si necesita lectura operativa secuencial, usa este feed.

## Como integrarlo en una pantalla nueva

1. Identifica la entidad source: bank row, payment, settlement leg, suggestion, cash event.
2. Crea un mapper hacia `FinanceMovementFeedItem`.
3. Reusa catalogos visuales existentes para proveedores e instrumentos.
4. Decide si la lista necesita `summaryItems`, subtotales diarios y virtualizacion.
5. Define `onItemSelect` para abrir el detalle sin acoplar el feed al modulo.
6. Agrega test de mapper y un test de render para el caso principal.

## Ejemplo de integracion

```tsx
import {
  FinanceMovementFeed,
  type FinanceMovementFeedItem
} from '@/components/greenhouse/finance'

const items: FinanceMovementFeedItem[] = payments.map(payment => ({
  id: payment.paymentId,
  date: payment.paymentDate,
  title: payment.description,
  description: payment.reference,
  amount: payment.direction === 'out' ? -payment.amount : payment.amount,
  currency: payment.currency,
  direction: payment.direction,
  status: payment.matchStatus,
  sourceType: payment.sourceType,
  sourceId: payment.paymentId,
  instrumentName: payment.paymentAccountName,
  instrumentCategory: payment.paymentInstrumentCategory,
  paymentProviderSlug: payment.paymentProviderSlug,
  providerId: payment.providerId
}))

<FinanceMovementFeed
  items={items}
  title="Movimientos pendientes"
  subtitle={`${items.length} movimientos por revisar`}
  providerCatalog={toolingProviderCatalog}
  paymentProviderCatalog={paymentProviderCatalog}
  showDayTotals
  virtualized
  onItemSelect={openMovementDrawer}
/>
```

## Checklist antes de reutilizar

- [ ] El mapper filtra por `space_id` en la query o consume un endpoint que ya lo hace.
- [ ] El feed recibe datos normalizados; no parsea glosas dentro del componente.
- [ ] Los logos vienen de catalogo y respetan `logoStatus`.
- [ ] Los saldos, si existen, vienen precalculados.
- [ ] No se agregaron writes ni side effects al componente.
- [ ] La lista no genera scroll horizontal.
- [ ] El estado vacio explica que hacer sin sugerir acciones destructivas.
- [ ] Hay test para visual fallback y para el mapper principal.

## Tests

Tests actuales:

- `src/components/greenhouse/finance/__tests__/FinanceMovementFeed.test.tsx`
- `src/components/greenhouse/finance/__tests__/finance-movement-feed.utils.test.ts`

Al extender el componente, priorizar tests en:

- resolucion de visuales (`item.visual` > payment provider > provider > fallback);
- labels de estado por direccion;
- agrupacion por dia;
- virtualizacion sin perdida de accesibilidad;
- rendering de instrumentos y `details`.

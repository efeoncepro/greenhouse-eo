# TASK-2032 — Product reference prices computed by Pricing V3

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-053`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance|platform`
- Blocked by: `TASK-2031`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El CEO decidió que prevalece la forma de cotizar de V3: el precio de un producto no es una cifra fija por hora, es el
resultado del motor para una dedicación, un país, una forma de compromiso y un plazo. Esta task hace que Productos
deje de tratar la semilla de abril como precio vigente y publique, por producto, un **precio de referencia a jornada
completa calculado por V3**: una lectura del catálogo vigente, guardada por huella de catálogo y expuesta junto al
producto. Las cifras de abril se conservan como historia, rotuladas. Nada cambia en HubSpot por esta task.

No bloquea cotizar: va después de `TASK-2031` y puede correr en paralelo con el resto del programa.

## Why This Task Exists

- Productos guarda como precio de un rol un valor en USD por hora sembrado el 2026-04-18 y no editado desde el
  2026-04-22; como precio de una herramienta, un prorrateo de esa misma semilla; los servicios no tienen precio. V3
  vende dedicación mensual con margen objetivo por oferta, factor de país, redondeo comercial y forma de compromiso.
  Mismo SKU, otra cifra y otra unidad.
- 59 productos tienen un precio autoritativo de esa semilla, y es lo que Greenhouse envía a HubSpot como precio de
  lista, de donde lo toma quien arma una línea de negocio a mano. Qué muestra hoy el portal de HubSpot no se leyó.
- Mientras la base diga que el precio vigente de un producto es el de abril, hay dos autoridades de precio. La
  decisión del 2026-10-12 dejó una sola: V3.
- V3 no tiene precio de lista. Un precio existe sólo como resultado de una cotización, y el motor no entrega una
  referencia sin que alguien declare qué es «la referencia». Probado el 2026-10-12: un brief de una persona a jornada
  completa con el kit por defecto de su perfil no calcula si no se declara una elección
  (`RESOURCE_CHOICE_REQUIRED` en el requisito con dos candidatos); con la elección declarada, calcula.

## Goal

- Existe una definición única, declarada como valor de política del catálogo y confirmada por el CEO, de qué es el
  precio de referencia de un producto.
- La referencia la produce el motor, por la misma ruta con que cotiza; ningún consumidor lleva una fórmula.
- La plataforma guarda la referencia por huella de catálogo y sabe cuál es la vigente; la CLI la lee sin red.
- El lector de Productos entrega la referencia de V3 y, aparte y rotulado como histórico, el precio de abril.
- Las cifras de abril no se borran ni se sobrescriben.
- Queda un ensayo en seco de lo que cambiaría en HubSpot bajo cada opción, sin enviar nada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PRICING_V3_PLATFORM_PROMOTION_DECISION_V1.md` — «Delta 2026-10-12 — Productos y el
  cotizador», decisión 2, y las reglas duras.
- `docs/architecture/GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md` y
  `docs/architecture/GREENHOUSE_PRICING_V3_ENGINE_1_1_COMMERCIAL_ADJUSTMENTS_DECISION_V1.md`.
- `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md` y
  `docs/architecture/GREENHOUSE_PRODUCT_CATALOG_FULL_FIDELITY_V1.md` — campos que Greenhouse manda a HubSpot; costo y
  margen bloqueados hacia afuera de forma permanente.
- `docs/architecture/GREENHOUSE_QUOTER_V3_DATA_MODEL_V1.md`.
- `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md` y
  `docs/operations/HUBSPOT_AGENT_CLI_MCP_OPERATOR_V1.md`.
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` y `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`.

Reglas obligatorias:

- **NUNCA** una segunda implementación de precio: la referencia es el resultado del motor sobre un brief, y ese brief
  se puede volver a correr con `pnpm pricing:v3 quote`.
- **NUNCA** cambiar `src/lib/finance/pricing-v3/calculate.ts` ni `src/lib/finance/pricing-v3/schemas.ts`, ni una cifra.
- **NUNCA** convertir una referencia por tipo de cambio fuera del motor: una referencia en otra moneda es otro
  cálculo del motor.
- **NUNCA** un número adivinado: si el motor no calcula, la referencia queda sin valor, con su causa. Jamás se
  rellena con el precio de abril.
- **NUNCA** borrar ni sobrescribir `product_catalog_prices` ni `product_catalog.default_unit_price`.
- **NUNCA** enviar a HubSpot un precio, una unidad o un producto por efecto de esta task. Cualquier cambio en los
  productos de HubSpot es un acto aparte, autorizado de forma explícita y con ensayo en seco previo.
- **NUNCA** costo, margen ni piso junto a la referencia, en ninguna salida hacia Productos ni hacia HubSpot.
- **NUNCA** recalcular, actualizar ni tocar una cotización guardada. La referencia no es una cotización y no se
  registra como tal.
- **NUNCA** llamar a la referencia «precio de lista» ni usarla como precio de una cotización: quien cotiza, cotiza.
- **SIEMPRE** la definición de la referencia como dato del catálogo, con dueño, fuente y vigencia, activada por una
  persona como cualquier otra versión.
- **SIEMPRE** migraciones que sólo agregan.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`, `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md` y
  `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`.
- `docs/tasks/to-do/TASK-2031-quoter-v3-product-identity.md` — vínculos, compuestos, recetas e índice del catálogo.
- `docs/documentation/finance/catalogo-productos-sincronizacion.md` (reglas de precio por fuente) y
  `docs/documentation/finance/administracion-catalogo-pricing.md`.
- `docs/documentation/finance/cotizador-v3-mantenimiento-catalogo.md` y `data/pricing/v3-operating/README.md`.
- `docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md`.
- `docs/audits/commercial/2026-10-12-cotizador-actual-anexo-b-base-de-datos.md` (estado de los precios y del sync).

## Dependencies & Impact

### Depends on

- `TASK-2031` — registros `product_binding` y `composite` en el catálogo vigente, `quoter_catalog_product_index`,
  comando `pnpm quoter:products`.
- `TASK-2025` (completa) — `quoter_source_documents`, `quoter_current_pointer`, `pnpm quoter:import`.
- Motor: `src/lib/finance/pricing-v3/catalog/{contracts,catalog,quote,resolve}.ts`.
- Productos: `greenhouse_commercial.product_catalog`, `product_catalog_prices`
  (`src/lib/commercial/product-catalog-prices.ts`), `src/lib/commercial/product-catalog-store.ts`, rutas
  `/api/admin/commercial/products/**`.
- Decisiones del CEO listadas en «Detailed Spec», sección 2. Son el contenido de la política, no una aprobación del
  flujo de cotizar.

### Blocks / Impacts

- `TASK-2029` — la activación de un catálogo por la plataforma debe materializar la referencia de la versión nueva;
  hasta entonces lo hace el importador.
- `TASK-608` (historial de precios de Productos) — la referencia ya queda versionada por huella de catálogo.
- `TASK-620.x` — el precio del catálogo vendible deja de ser un valor escrito a mano para lo que V3 precia.
- Salida de productos a HubSpot (`src/lib/hubspot/push-product-to-hubspot.ts`): no cambia aquí; el ensayo en seco es
  el insumo de la decisión.
- Pantallas `/admin/commercial/product-catalog` y `/finance/products`: reciben campos nuevos y siguen mostrando lo
  de hoy hasta su task de interfaz.

### Files owned

- `src/lib/finance/pricing-v3/catalog/contracts.ts` y `catalog/catalog.ts` (clase `reference_price_policy`).
- `src/lib/finance/pricing-v3/catalog/reference.ts` (nuevo propuesto: la lectura de referencia) y sus pruebas.
- `scripts/commercial/pricing-v3.ts` y `scripts/commercial/pricing-v3/**` (lectura `catalog reference`).
- `data/pricing/v3-operating/**` (el change-set, la versión nueva del catálogo y el puntero).
- `src/lib/commercial/quoter/reference-prices.ts` (nuevo propuesto: materializador y lector) y edición acotada de
  `importer.ts`.
- `src/lib/commercial/product-catalog-store.ts` y `src/app/api/admin/commercial/products/**` (campos de lectura).
- `src/lib/reliability/queries/commercial-quoter-reference-prices-stale.ts` (nuevo propuesto) y su registro.
- `scripts/commercial/quoter-products.ts` (subcomandos `reference-prices` y `hubspot-dry-run`).
- `migrations/**` (una migración que sólo agrega).
- `docs/documentation/finance/**`, manuales y skill `efeonce-pricing-operator` (con espejo).

## Current Repo State

### Already exists

- `product_catalog_prices`: una fila por producto y moneda (CLP, USD, CLF, COP, MXN, PEN; sin EUR), sólo el valor
  vigente, con `source` en `gh_admin | hs_seed | fx_derived | backfill_legacy` y marca `is_authoritative`
  (`migrations/20260424174148326_task-602-product-catalog-prices-table.sql`). Las derivadas se recalculan cuando
  cambia un tipo de cambio (`src/lib/sync/projections/product-catalog-prices-recompute.ts`).
- Los materializadores copian a `product_catalog.default_unit_price` el precio por hora del rol
  (`src/lib/sync/handlers/sellable-role-to-product.ts:32`), el prorrateo de la herramienta
  (`tool-to-product.ts:36`), el precio final del recargo (`overhead-addon-to-product.ts:50`) y nulo para un servicio
  (`service-to-product.ts:61`).
- El envío de un producto a HubSpot lee `product_catalog_prices` y `default_unit_price`
  (`src/lib/hubspot/hubspot-product-payload-adapter.ts:117-134`, `:298`).
- El comando `quote` del carril de catálogo calcula un brief con una línea a jornada completa cuando sus elecciones
  de kit están declaradas (probado el 2026-10-12 con el catálogo vigente, sin escribir nada).
- Política de precio por oferta en el catálogo: 32 perfiles × 3 ofertas; factores de país y de mercado; tipo de
  cambio de cotización; redondeo comercial; forma `on_going` con razón 1.
- El puntero lleva `updatedAt` dentro de su documento y de su huella.

### Gap

- No existe el concepto de referencia en V3: ni definición, ni lectura, ni comando.
- Varios kits tienen un requisito obligatorio con dos candidatos: sin una elección declarada la referencia no calcula.
- Nada en la base ni en el lector de Productos distingue «precio vigente» de «semilla histórica».
- El precio de un rol en Productos es por hora y el de V3 es mensual: la unidad también cambia.
- 41 de 77 productos tienen `hubspot_sync_status = endpoint_not_deployed`; la causa no está determinada.
- `PUT /api/admin/commercial/products/[id]/prices` sigue admitiendo un precio escrito a mano.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: lectura de referencia en `src/lib/finance/pricing-v3/catalog/**` (CLI local y portal); materializador y lector en `src/lib/commercial/quoter/**`; lector de Productos en `src/lib/commercial/product-catalog-store.ts`, servido por el portal Next.js en Vercel.
- Future candidate home: `domain-package`
- Boundary: lectura `readReferencePrices` del motor; materializador `materializeReferencePrices` y lector `readProductReferencePrices` del agregado; consumers autorizados: la CLI, el importador, la activación de `TASK-2029`, el lector de Productos y el plano de confiabilidad.
- Server/browser split: el motor sigue puro; almacén y SQL sólo en servidor; ningún import de interfaz ni de tema.
- Build impact: ninguna dependencia nueva y ninguna lectura de archivos del repo en tiempo de ejecución.
- Extraction blocker: el lector de Productos une `product_catalog` con una tabla del cotizador en la misma base; la materialización depende del puntero del registro.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: el precio que Productos presenta como vigente; pasa de `product_catalog_prices` a una lectura del catálogo vigente de V3. Las tablas de precio de Productos quedan como historia.
- Consumidores afectados: lector y rutas de administración de Productos, CLI, skill de pricing, y la decisión sobre la salida a HubSpot.
- Runtime target: máquina local (CLI, importador, comando de operador), Vercel (lectores y señal), staging y producción sobre la misma base.

### Contract surface

- Contrato existente a respetar: `pricing-v3-catalog/1`; respuesta de `GET /api/admin/commercial/products` y `GET /api/admin/commercial/products/[id]`; `product_catalog_prices` y su contrato con HubSpot.
- Contrato nuevo o modificado: clase de registro `reference_price_policy`; lectura `pricing-v3-reference-prices/1`; tabla `quoter_product_reference_prices` y vista de la referencia vigente; campos `referencePrice`, `priceAuthority` y `legacyListPrice` en la respuesta del lector de Productos.
- Backward compatibility: compatible. Los campos existentes de la respuesta no cambian de nombre ni de valor; se agregan campos.
- Full API parity: una lectura del motor para CLI y plataforma; lector del agregado con comando de operador; la ruta de plataforma se publica en la familia de lecturas de `TASK-2026`.

### Data model and invariants

- Entidades/tablas/views afectadas: tabla nueva `greenhouse_commercial.quoter_product_reference_prices` y vista `quoter_product_reference_price_current`; comentario de tabla en `product_catalog_prices`; sólo lectura sobre `product_catalog` y `quoter_catalog_product_index`.
- Invariantes que no se pueden romper:
  - Una fila de referencia es función del documento de catálogo que nombra y de la fecha de su puntero: recalcularla da el mismo valor.
  - La referencia vigente es la del catálogo que nombra el puntero; nunca «la última calculada».
  - Ninguna fila de `product_catalog_prices` ni de `product_catalog` cambia por esta task.
  - Ninguna fila del registro de cotizaciones cambia.
- Write-target allowlist: la tabla nueva se declara con su único escritor en `src/lib/commercial/quoter/__tests__/boundary-domain.test.ts`, en el mismo cambio.
- Tenant/space boundary: catálogo de Efeonce; sin organización; identidad de la sesión o del binding.
- Idempotency/concurrency: materializar es idempotente por `(catalog_digest, reference_id, product_sku, currency_code)`; dos corridas dejan las mismas filas.
- Audit/outbox/history: la historia la da la llave por huella de catálogo; sin evento nuevo.

### Migration, backfill and rollout

- Migration posture: additive. Una tabla, una vista y un comentario de tabla.
- Default state: los lectores entregan los campos nuevos desde el despliegue; las pantallas no los muestran hasta su task de interfaz; HubSpot no recibe nada.
- Backfill plan: materializar la referencia del catálogo vigente con ensayo en seco y después aplicar; las versiones anteriores no se materializan.
- Rollback path: revertir el código de los lectores; la tabla queda sin uso; el comentario de tabla se reemplaza con otro.
- External coordination: confirmación del CEO de la definición; una persona activa la versión del catálogo que la trae; visto bueno del operador para la migración.

### Security and access

- Auth/access gate: lector de Productos con su puerta actual (`requireAdminTenantContext`); lecturas del cotizador con `assertQuoterAccess` y `commercial.quoter.catalog:read`. Ninguna capacidad nueva.
- Sensitive data posture: la referencia es un precio, no un costo; la tabla no guarda costo, margen ni piso. El detalle del cálculo de referencia queda en la lectura interna del motor.
- Error contract: códigos de `PricingV3Error` en la lectura; errores canónicos en las rutas; `captureWithDomain`.
- Abuse/rate-limit posture: la lectura del motor corre al activar un catálogo y bajo comando, no por pedido de una pantalla; los lectores leen la tabla.

### Runtime evidence

- Local checks: `pnpm pricing:v3:test`; pruebas de la lectura y del materializador; `pnpm quoter:test:local`.
- DB/runtime checks: bloque de verificación de la migración; conteo de `product_catalog_prices` y huella de sus filas antes y después; consultas nuevas contra PostgreSQL real.
- Integration checks: respuesta de `GET /api/admin/commercial/products` en staging con los campos nuevos; ninguna llamada a HubSpot.
- Reliability signals/logs: `commercial.quoter.reference_prices_stale`.
- Production verification sequence: la de «Rollout Plan & Risk Matrix».

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] La referencia se calcula en el motor; el materializador y los lectores no llevan aritmética de precio.
- [ ] Camino programático declarado: `pnpm pricing:v3 catalog reference` (local), `pnpm quoter:products
      reference-prices`, lector de Productos por sus rutas actuales, y ruta de plataforma en la familia de lecturas
      de `TASK-2026` (registrado en `EPIC-053`).
- [ ] Ninguna capacidad nueva y ningún comando de escritura hacia un sistema externo.
- [ ] La pantalla de Productos queda como consumidor pendiente, con su task de interfaz en Follow-ups.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Definición y lectura en el motor

- Clase de registro `reference_price_policy`, inerte, con su identidad y validación.
- `readReferencePrices(catalog, asOf)`: arma un brief por producto y llama a la misma función que el comando `quote`.
- Lectura `pnpm pricing:v3 catalog reference`, en local y sin red.
- Puerta: artefactos congelados idénticos, línea base de la CLI sin regenerar, `calculate.ts` y `schemas.ts` sin
  diferencias.

### Slice 2 — Versión del catálogo con la definición

- Hoja de decisiones del CEO resuelta (sección 2 de «Detailed Spec»).
- Change-set con el registro de política; `catalog preview` con las demandas declaradas como impacto; `catalog apply`;
  activación por una persona; `pnpm quoter:import`.

### Slice 3 — Referencia en la plataforma

- Migración: tabla, vista de la referencia vigente y comentario de tabla en `product_catalog_prices`.
- `materializeReferencePrices`: ensayo en seco y aplicación; llamada desde el importador al reflejar un puntero.
- Señal `commercial.quoter.reference_prices_stale`.

### Slice 4 — Lector de Productos

- `referencePrice`, `priceAuthority` y `legacyListPrice` en el lector y en las dos rutas de lectura de administración.

### Slice 5 — Ensayo en seco de HubSpot

- Informe por producto de lo que HubSpot recibe hoy desde Greenhouse y de lo que recibiría bajo cada opción, sin
  ninguna llamada a HubSpot.

### Slice 6 — Documentación

- Documentación técnica, funcional y manual; skill con espejo; `EPIC-053` al día.

## Out of Scope

- Enviar a HubSpot un precio, una unidad, un producto nuevo o un archivo de producto; diagnosticar en vivo los 41
  productos en `endpoint_not_deployed`.
- Cambiar los materializadores de Productos, las tablas de precio por rol, los márgenes por nivel o los multiplicadores
  del catálogo relacional.
- Cerrar la escritura manual de precios de Productos, o detener el recálculo de las filas derivadas por tipo de
  cambio (Open Questions).
- Mostrar la referencia en las pantallas de Productos: es una task de interfaz.
- Referencias por plan de herramienta, por seniority o por país del talento más allá de lo que declare la política.
- Usar la referencia para cotizar, para un contrato o para un reporte de ingresos.
- Recalcular o tocar cualquier cotización guardada.

## Detailed Spec

### 1. Qué es la referencia

Nombre: **precio de referencia a jornada completa**. Es una lectura, no un precio de lista.

| Producto | Referencia | Unidad |
| --- | --- | --- |
| Rol (`ECG-###`, vínculo de perfil) | neto de la fila mensual de **una persona** de ese perfil, a jornada completa y dedicada, un período, sin ajustes, antes de impuestos | mes |
| Compuesto con nombre y receta (`EFG-###`) | neto de **un mes** de su receta tal como está declarada, bajo la oferta que lo precia | mes |
| Compuesto genérico, compuesto sin receta | sin referencia: se compone en cada cotización | — |
| Herramienta (`ETG-###`) | sin referencia: no se vende sola, es costo dentro de una persona o de un servicio | — |
| Producto genérico (puesta en marcha, terceros) y recargos | sin referencia: su monto nace en cada cotización | — |

Todo lo demás del cálculo lo fija la política (sección 2) y lo aplica el motor: oferta, forma de compromiso, país del
talento, mercado del cliente, moneda, kit y sus elecciones, tipo de cambio de cotización y redondeo comercial.

- **Precio de política:** el que el motor da con el margen objetivo y el redondeo del catálogo, sin descuento, sin
  alza y sin total acordado.
- **Puesta en marcha aparte.** La referencia es el neto recurrente. Si el cálculo trae una fila de única vez, se
  guarda en su propia columna y nunca se suma.
- **Fecha.** El cálculo usa como fecha de cotización el `updatedAt` del puntero que nombra el catálogo. Así la
  referencia es reproducible y es la misma en local y en la plataforma.
- **Sin valor antes que valor falso.** Si el motor responde que falta un dato o que el cálculo está bloqueado, la
  referencia queda con estado `needs_input` y los códigos de diagnóstico.

### 2. La política — registro `reference_price_policy`

Un registro inerte del catálogo, con su fuente, su vigencia y su dueño (CEO). Ninguna entrada del kernel lo lleva.

| Campo | Propuesta | A confirmar por el CEO |
| --- | --- | --- |
| `referenceId` | `full_time_month` (identidad del registro) | — |
| `roleOfferId` | `talent-assurance-staffing`: la oferta que vende un rol como capacidad | sí |
| `engagementCode`, `engagementForm` | `monthly`, `on_going` | sí (forma) |
| `talentCountry` | `CL`, el país de referencia de los costos objetivo | sí |
| `offerMarketCountry` | `CL`, el mercado de casa | sí |
| `outputCurrencies` | `CLP` | sí: sólo CLP, o también USD |
| `dedication`, `allocationMode` | 1 FTE, `dedicated`, con la política de asignación dedicada | sí |
| `kitChoices[]` | por kit y requisito con más de un candidato, el recurso que representa lo estándar | sí: cada elección |
| `compositeTalentCountry` | `CL` para las líneas de la receta de un compuesto | sí |

Elecciones que necesitan confirmación, además de los valores de la tabla:

1. **Con qué carril se calcula.** Propuesta: el de catálogo (`pricing-v3-selection-quote/1`), que se resuelve sólo con
   el catálogo. El de composición usa precios facturados de herramientas pero exige asientos y repartos de una cuenta
   real, que una referencia no tiene. La cifra difiere entre uno y otro.
2. **Una persona sola carga recursos compartidos enteros.** En el kit, los recursos de reparto entre consumidores
   caen completos sobre una línea de una persona. La referencia de una persona es mayor que su parte dentro de un
   equipo. Hay que aceptar esa lectura o declarar otro reparto de referencia.
3. **Si la puesta en marcha se publica** junto a la referencia o se omite.
4. **Si se publica una referencia por mercado** (seis países) o sólo la del mercado de casa. Propuesta: sólo la de
   casa; las demás se calculan a pedido con el motor.
5. **Si una herramienta muestra alguna cifra.** Propuesta: ninguna.

La identidad del registro es `referenceId`. Una versión del catálogo sin el registro no tiene referencia: la lectura
lo dice y no calcula nada.

### 3. Cómo se produce

- `readReferencePrices(catalog, asOf)` en `src/lib/finance/pricing-v3/catalog/reference.ts`: lee la política, los
  vínculos de perfil y los compuestos con receta en vigor; por cada uno y por cada moneda arma un brief
  (`pricing-v3-brief/1`, modo `simulation`, cuenta sintética `reference`) y llama a la función que ya usa el comando
  `quote`. No tiene aritmética propia.
- Salida `pricing-v3-reference-prices/1`, por producto y moneda: estado (`calculated`, `needs_input`,
  `not_applicable`), neto mensual, neto de única vez, razón o diagnósticos, y el brief usado con la huella de su
  cálculo, para que cualquiera lo reproduzca.
- `pnpm pricing:v3 catalog reference [--current] [--catalog archivo] [--date AAAA-MM-DD] [--query SKU]`: la misma
  lectura, en local y sin red. Entra a la línea base de la CLI y al corpus de paridad.
- La lectura interna conserva el detalle del cálculo; lo que sale hacia Productos es sólo precio.

### 4. Dónde se guarda

`greenhouse_commercial.quoter_product_reference_prices`, llave
`(catalog_digest, reference_id, product_sku, currency_code)`:

| Columna | Contenido |
| --- | --- |
| `catalog_version`, `catalog_digest` | el documento de catálogo del que se calculó |
| `reference_id`, `policy_record_id`, `policy_revision` | la definición usada |
| `product_sku`, `product_kind` | `role` o `composite` |
| `currency_code`, `unit` | moneda; `month` |
| `status`, `reason_code`, `diagnostic_codes` | `calculated`, `needs_input` o `not_applicable`, y por qué |
| `monthly_net`, `one_off_net` | nulos si no calculó |
| `as_of`, `reference_calculation_digest`, `engine_version` | con qué fecha y qué cálculo |
| `computed_at`, `extractor_version` | cuándo y con qué versión del materializador |

- Es una lectura derivada: se puede borrar y recalcular, y da lo mismo. Las filas de un catálogo anterior se
  conservan: son la historia de la referencia, por huella.
- Vista `quoter_product_reference_price_current`: las filas del catálogo que nombra `quoter_current_pointer`.
- **Relación con `product_catalog_prices`:** ninguna llave y ninguna escritura. Se unen al leer por
  `product_catalog.product_code = product_sku`. La moneda no está limitada a las seis de Productos: si la política
  pide EUR, la fila existe aquí aunque Productos no pueda guardarla.
- Materializar: `materializeReferencePrices` con ensayo en seco y aplicación, llamado por
  `pnpm quoter:products reference-prices [--apply]` y por `pnpm quoter:import` después de reflejar un puntero. Cuando
  `TASK-2029` active catálogos por la plataforma, llama a la misma función.
- Señal `commercial.quoter.reference_prices_stale`: el catálogo vigente no tiene filas de referencia, o tiene
  productos vinculados en estado `needs_input`.

### 5. Qué pasa con las cifras de abril

- Se conservan tal como están: ninguna fila de `product_catalog_prices`, de `product_catalog`, de
  `sellable_role_pricing_currency` ni de las tablas de costo y margen del catálogo relacional se borra ni se edita.
- Se rotulan en tres lugares: un `COMMENT ON TABLE` en `product_catalog_prices` que dice desde qué fecha es precio
  histórico y no vigente; el contrato del lector; y la documentación de arquitectura.
- El lector de Productos entrega, por producto:
  - `referencePrice`: `{ status, monthlyNet, oneOffNet, currency, unit, referenceId, catalogVersion, asOf }` de la
    vista vigente, o nulo con su razón;
  - `priceAuthority`: `pricing_v3_reference` cuando el producto tiene vínculo en el catálogo vigente, `none` cuando
    no;
  - `legacyListPrice`: lo que hoy entrega como precio, con `status: historical_not_in_force`, su `source` y su fecha.
- Los campos que la respuesta ya tiene no cambian, para no romper las pantallas; pasan a ser los históricos y la
  documentación lo dice. Mostrar la referencia y retirar la cifra vieja de la pantalla es la task de interfaz.

### 6. Qué llega a HubSpot

Por esta task, nada. HubSpot sigue recibiendo lo que recibe hoy.

El ensayo en seco (`pnpm quoter:products hubspot-dry-run`) lee sólo tablas de Greenhouse y entrega, por producto con
`hubspot_product_id`:

- lo que Greenhouse le envía hoy: precio por moneda, unidad y estado del último intento de sync;
- lo que le enviaría bajo cada opción:
  - **A — mantener:** sin cambios; HubSpot sigue mostrando abril;
  - **B — referencia:** el neto mensual de referencia, con cambio de unidad de hora a mes en los roles;
  - **C — sin precio:** el producto queda sin precio de lista, como hoy los servicios;
- qué productos no tienen referencia y por qué;
- los 41 productos en `endpoint_not_deployed`, marcados como «no se puede afirmar que el cambio llegue».

Elegir entre A, B y C es del CEO. Aplicar B o C es un acto aparte, con su propia autorización, su ensayo en seco
vigente y el diagnóstico previo de esos 41 productos. No es parte de esta task.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4. Slice 5 necesita Slice 3. Slice 6 al final.
- El Slice 2 no empieza sin la hoja de decisiones resuelta por el CEO.
- El código del Slice 1 está en producción antes de que el puntero de la plataforma nombre la versión nueva.
- La migración del Slice 3 espera el visto bueno del operador.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| La referencia se toma por precio de una cotización | negocio | medium | Nombre y rótulo; nunca entra a un comando de cotizar; el manual lo dice | uso de la tabla fuera de sus lectores |
| La lectura se convierte en una segunda implementación | motor | low | Sin aritmética fuera del motor; prueba que compara cada referencia con `quote` sobre el brief guardado | diferencia entre la referencia y su cálculo |
| Una clave nueva mueve huellas | motor | low | Registro inerte, sin valor por defecto; guarda de artefactos congelados | `REPLAY_MISMATCH` |
| Las filas de abril cambian | Productos | low | La task no escribe en esas tablas; huella de las filas antes y después | diferencia en la comparación |
| Alguien envía la referencia a HubSpot sin autorización | HubSpot | low | Ningún código de envío en la task; el ensayo no llama a HubSpot | intento de sync de producto atribuible a la task |
| La referencia queda atrasada tras activar un catálogo | plataforma | medium | Materialización en el importador y en la activación; señal de atraso | `commercial.quoter.reference_prices_stale` |
| Un producto sin elección de kit queda sin referencia | catálogo | medium | Estado `needs_input` visible; la política declara cada elección | conteo de `needs_input` en la señal |
| Migración aplicada antes de tiempo en la base compartida | base | medium | Archivo en `docs/tasks/pending-migrations/` hasta el visto bueno | `pnpm migrate:status` |

### Feature flags / cutover

Sin bandera nueva. La lectura es inerte sin el registro de política; el corte es la activación, por una persona, de
la versión del catálogo que lo trae. Los campos nuevos del lector de Productos son aditivos y las pantallas no los
muestran todavía. Hacia HubSpot no hay corte en esta task.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir el código | minutos | sí |
| Slice 2 | Activar de nuevo la versión anterior con una fila nueva de puntero y su motivo | menos de 10 minutos | sí, sin borrar historia |
| Slice 3 | Revertir el código; la tabla queda sin uso; reemplazar el comentario de tabla | minutos | sí |
| Slice 4 | Revertir el código de los lectores; los campos nuevos desaparecen de la respuesta | minutos | sí |
| Slice 5 | Revertir el subcomando; sólo lee | minutos | sí |
| Slice 6 | Revertir documentos | minutos | sí |

### Production verification sequence

1. `pnpm pricing:v3:test` en verde; `git diff` vacío sobre `calculate.ts` y `schemas.ts`.
2. Release de Greenhouse con el Slice 1.
3. `catalog preview` de la versión con la política: ninguna cifra de ninguna demanda declarada cambia. `catalog apply`.
4. Una persona activa la versión; `pnpm quoter:import`.
5. Conteo y huella de `product_catalog_prices` y de `product_catalog.default_unit_price` anotados.
6. Migración aplicada con el visto bueno del operador y verificada con su bloque; `pnpm db:generate-types`.
7. `pnpm quoter:products reference-prices` en seco; revisión; `--apply`; segunda corrida sin cambios.
8. Para tres productos, la referencia de la tabla es igual a `pnpm pricing:v3 quote` sobre su brief guardado.
9. `GET /api/admin/commercial/products` en staging entrega los tres campos nuevos y los anteriores sin cambios.
10. Conteo y huella del paso 5 idénticos. Ningún intento nuevo de sync de productos atribuible a la task.
11. `pnpm quoter:products hubspot-dry-run` entregado al CEO.

### Out-of-band coordination required

- CEO: confirmar la definición (sección 2) y elegir qué muestra HubSpot (sección 6).
- Una persona con `efeonce_admin` o `finance_admin`: activar la versión del catálogo.
- Operador: visto bueno de la migración y release por el control plane.
- Commercial: saber que las pantallas de Productos siguen mostrando la cifra de abril hasta su task de interfaz.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `calculate.ts` y `schemas.ts` no tienen diferencias; los artefactos congelados se reproducen idénticos y la
      línea base de la CLI pasa sin regenerar un fixture existente.
- [ ] La definición de la referencia vive en un registro `reference_price_policy` del catálogo vigente, con fuente,
      vigencia y cada valor confirmado por el CEO; no hay un valor de la definición escrito en el código.
- [ ] Un catálogo sin el registro no produce ninguna referencia y la lectura lo dice.
- [ ] Para cada producto con referencia calculada, el valor es igual al neto que da `pnpm pricing:v3 quote` sobre el
      brief que la lectura guarda (prueba sobre todos los productos del catálogo vigente).
- [ ] La lectura y el materializador no contienen aritmética de precio (revisión y prueba estática de imports).
- [ ] Un producto cuyo cálculo no resuelve queda en `needs_input` con sus códigos, sin valor; ninguno toma el precio
      de abril.
- [ ] Herramientas, productos genéricos, recargos y compuestos sin receta quedan en `not_applicable` con su razón.
- [ ] La puesta en marcha se guarda aparte y no está sumada al neto mensual.
- [ ] `pnpm pricing:v3 catalog reference --current` corre sin red y entrega lo mismo que la tabla de la plataforma
      para el catálogo vigente.
- [ ] La tabla nueva es reconstruible: vaciarla y materializar de nuevo deja las mismas filas (prueba contra
      PostgreSQL real), y está declarada con su escritor en `boundary-domain.test.ts`.
- [ ] La vista de la referencia vigente sigue al puntero: tras activar otra versión, cambia a las filas de esa versión
      y conserva las anteriores.
- [ ] La tabla no tiene columna de costo, de margen ni de piso.
- [ ] `product_catalog_prices` y `product_catalog.default_unit_price` tienen el mismo conteo y la misma huella antes y
      después de la task; `product_catalog_prices` tiene su comentario de tabla.
- [ ] El lector de Productos entrega `referencePrice`, `priceAuthority` y `legacyListPrice`, y los campos anteriores
      conservan nombre y valor.
- [ ] Ninguna fila del registro de cotizaciones cambió (comparación antes y después).
- [ ] La task no agregó ni modificó código que llame a HubSpot; el ensayo en seco no hace llamadas de red.
- [ ] El ensayo en seco lista, por producto, lo enviado hoy y lo que cambiaría bajo las opciones A, B y C, y marca
      los productos en `endpoint_not_deployed`.
- [ ] La señal `commercial.quoter.reference_prices_stale` está registrada y se vio en alerta con un caso construido.
- [ ] Ninguna salida de la task lleva la paga de una persona ni el nombre de un cliente.

## Verification

- `pnpm task:lint --task TASK-2032`
- `pnpm pricing:v3:test`
- `pnpm vitest run src/lib/commercial/quoter src/lib/commercial/product-catalog-prices.test.ts src/lib/reliability`
- `pnpm quoter:test:local`
- `pnpm test:live` serializado para las consultas nuevas
- `pnpm migration-marker-gate` y `pnpm db:generate-types`
- `pnpm pricing:v3 catalog reference --current`
- `pnpm quoter:products reference-prices` y `pnpm quoter:products hubspot-dry-run`
- `pnpm staging:request /api/admin/commercial/products`
- `pnpm local:check`, `pnpm skills:mirrors`, `pnpm qa:gates --changed`, `pnpm docs:closure-check`
- `pnpm test` completo y `pnpm build` como puerta de cierre; el build pide autorización del operador en esta máquina.
- Después de editar contexto o handoff: `pnpm docs:context-check:strict`.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Documentación técnica: `## Delta` en `GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md` y en
      `GREENHOUSE_PRODUCT_CATALOG_FULL_FIDELITY_V1.md` (qué es precio vigente desde ahora y qué es historia);
      tabla y vista en `GREENHOUSE_QUOTER_V3_DATA_MODEL_V1.md`; clase nueva en
      `GREENHOUSE_PRICING_V3_CATALOG_MAINTENANCE_DECISION_V1.md`.
- [ ] Documentación funcional: qué es el precio de referencia, qué no es y qué pasó con las cifras de abril, en
      `docs/documentation/finance/catalogo-productos-sincronizacion.md` y
      `docs/documentation/finance/pricing-comercial.md`.
- [ ] Manual: cómo leer la referencia y cómo recalcularla tras un cambio de catálogo, en
      `docs/manual-de-uso/finance/operar-cotizador-v3-con-agentes.md`.
- [ ] Skill `efeonce-pricing-operator` actualizada en `.claude/skills/` y `.codex/skills/`, con
      `pnpm skills:mirrors` en verde: la referencia no es un precio para cotizar.
- [ ] `## Delta` en `TASK-2029`, `TASK-608` y las `TASK-620.x` afectadas.
- [ ] `EPIC-053` actualizada, con la casilla de esta task y su evidencia.
- [ ] El estado se reporta como «code complete, rollout pendiente» mientras falte activar la versión del catálogo o
      materializar la referencia.

## Follow-ups

- Task de interfaz (`ui-ux`): mostrar la referencia y rotular o retirar la cifra histórica en
  `/admin/commercial/product-catalog` y `/finance/products`.
- Cambio de lo que HubSpot muestra (opción B o C): acto autorizado aparte, con diagnóstico previo de los 41 productos
  en `endpoint_not_deployed`.
- Cierre de la escritura manual de precios de Productos, si el CEO lo confirma.
- Ruta de plataforma de la referencia, si `TASK-2026` no la publica en su cierre.

## Open Questions

- Las elecciones de la sección 2 de «Detailed Spec»: valores de la política, carril de cálculo, lectura de una
  persona sola, puesta en marcha, mercados y herramientas.
- Qué muestra HubSpot: A, B o C (sección 6). Con B cambia también la unidad de los roles, de hora a mes.
- ¿Se cierra `PUT /api/admin/commercial/products/[id]/prices`? Mientras esté abierta, alguien puede escribir un
  precio a mano que la base trata como autoritativo. Recomendación: cerrarla por bandera, como se contuvo el
  cotizador actual.
- ¿Sigue el recálculo por tipo de cambio de las filas derivadas de abril? Si sigue, la «historia» de esas filas se
  mueve con cada cambio de tipo de cambio.
- ¿La referencia de un compuesto se calcula con el país del talento de casa para todas sus líneas, o la receta
  declara un país por línea?
- ¿Qué fecha rige cuando un registro del catálogo empieza a regir después de la activación del puntero? La propuesta
  es la fecha del puntero; la referencia se vuelve a materializar con la siguiente activación.

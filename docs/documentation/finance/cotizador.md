# Cotizador — Builder de Cotizaciones con Pricing Engine Canónico

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 3.8
> **Creado:** 2026-04-18 por Claude (TASK-464e close-out)
> **Ultima actualizacion:** 2026-04-21 por Codex (v3.8 — TASK-538 selector unificado de parties en el Quote Builder), Claude (v3.7 — TASK-509 Floating UI en TotalsLadder: anchor self-contained + a11y integral) y Codex (v3.6 — HubSpot deal anchor + contacto obligatorio para sync bidireccional robusta)
> **Documentacion tecnica:**
> - Surfaces full-page: [TASK-473 — Quote Builder Full-Page Surface Migration](../../tasks/complete/TASK-473-quote-builder-full-page-surface-migration.md)
> - Service composition: [TASK-465 — Service Composition Catalog](../../tasks/complete/TASK-465-service-composition-catalog-ui.md)
> - FX foundation: [GREENHOUSE_FX_CURRENCY_PLATFORM_V1](../../architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md)
> - Engine: [GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md)
> - Primitives originales: [TASK-464e — Quote Builder UI Exposure](../../tasks/complete/TASK-464e-quote-builder-ui-exposure.md) · [TASK-469 — UI Interface Plan](../../tasks/complete/TASK-469-commercial-pricing-ui-interface-plan.md)

## Cambios v3.8 (2026-04-21 — TASK-538 · Selector unificado de parties)

- **La organización ya no depende solo del preload local**: el chip contextual "Organización" del Quote Builder puede buscar por nombre o dominio usando `/api/commercial/parties/search`.
- **Adopción transparente de candidates HubSpot**: si el resultado todavía no existe como `organization` materializada, seleccionar el item dispara `/api/commercial/parties/adopt` y deja el `organizationId` listo para seguir cotizando sin salir a HubSpot.
- **Fallback legacy preservado**: el carril nuevo queda detrás de `GREENHOUSE_PARTY_SELECTOR_UNIFIED`. Si el flag está apagado, el builder vuelve al selector legacy de organizaciones activas.
- **Regla V1 importante**: los `hubspot_candidate` solo aparecen en tenants `efeonce_internal`. Tenants externos siguen viendo únicamente organizations ya visibles en su scope.
- **Sin romper el resto del flujo**: contactos y deals siguen dependiendo del mismo `organizationId`; el builder no cambia su handshake downstream.

## Cambios v3.7 (2026-04-20 — TASK-509 · Floating UI)

Fix de un bug donde el popover de addons aparecía en el top-left del viewport en vez de anclado al segmento inline. Causa raíz: state del anchor cruzaba boundaries entre dock y primitive, y el re-render del button al cambiar `count`/`amount` dejaba el DOM node cacheado stale → MUI Popper fallback a `0,0`.

### Fix robusto + upgrade de stack

Instalamos **Floating UI** (`@floating-ui/react`) — el stack moderno de positioning que usan Linear, Stripe, Radix, shadcn, Notion. Sustituye MUI Popper (basado en popper.js v2, legacy 2019) en el primitive `TotalsLadder`.

Beneficios para el usuario:
- Popover anclado correctamente al segmento **siempre** — `autoUpdate` de Floating UI monitorea el reference element con ResizeObserver + IntersectionObserver y recupera si el anchor se mueve o re-renderiza.
- **Auto-flip** cuando el popover no cabe en el viewport (ej. scroll cerca del borde → flip automático al lado opuesto).
- **Escape + click afuera** cierran el popover sin boilerplate (antes lo cosíamos con `ClickAwayListener` a mano).
- **Focus management** integral — al abrir, focus va al primer elemento del panel; al cerrar con escape, focus vuelve al segmento.

### Arquitectura

El primitive `TotalsLadder` ahora **encapsula el popover internamente**:
- El dock le pasa `addonsSegment.content: ReactNode` (el `AddonSuggestionsPanel`).
- El primitive gestiona anchor, state, positioning, focus, dismiss.
- Zero state leak entre componentes.
- Consumers futuros (invoice dock, PO footer, contract summary) heredan el comportamiento sin reimplementar.

TASK-510 (backlog) migrará el resto de popovers del portal al mismo stack (ContextChip, Ajustes popover, warnings, etc.) para consistencia platform-wide.

## Cambios v3.6 (2026-04-20 — HubSpot quote sync hardening — Codex)

- **Nuevo contexto comercial "Deal HubSpot"**: el rail derecho del builder ahora deja elegir la oportunidad comercial vinculada a la organización seleccionada. La lista se carga on-demand desde `/api/commercial/organizations/[id]/deals`, ordenada para privilegiar deals abiertos y respetando tenant isolation.
- **El anchor de sync deja de ser implícito**: antes una quote manual podía nacer sin `hubspot_deal_id`, lo que dejaba la sincronización outbound sin destino real. Ahora create/edit persisten `hubspotDealId` cuando existe y validan que el deal pertenezca a la misma organización.
- **Contacto obligatorio cuando la quote vive en HubSpot**: si una cotización ya está vinculada a HubSpot, o si el usuario la vincula a un deal, el builder y las APIs exigen también un contacto activo de esa organización. Company + contacto + deal quedan alineados como contexto comercial mínimo para una sync robusta.
- **Las actualizaciones ya no dependen solo de emisión**: cambios en header y líneas publican `commercial.quotation.updated`, así que HubSpot puede re-sincronizar total, metadata y attachment cuando la quote ya existe.

## Cambios v3.5 (2026-04-20 — TASK-507 + TASK-508)

Cierre del polish enterprise del dock y la tabla de ítems. Dos cambios conectados:

### TASK-507 — Addons inline en la Total ladder

Problema post-v3.4: el chip de addons vivía en la zona 3 (acciones) y con un solo CTA ya no había lugar horizontal para ambos — el chip wrapeaba visualmente encima del botón "Guardar y emitir". Mala experiencia.

Root cause conceptual: los addons **son ajustes al total**, no acciones independientes. Patrón enterprise (Stripe Billing / Notion / Linear): acciones contextuales viven con sus datos, no como chips flotantes.

Solución: el addon pasa a ser un **segmento inline interactivo dentro de la Total ladder** (zona 2). Render:

```
TOTAL CLP
$2.132.384
Subtotal $1.936.250  ·  ✨ 1 addon $196.134  ·  Factor ×1,15
                         ↑ hover: primary color + underline, click: popover
```

El segmento tiene el mismo peso visual que "Subtotal" o "Factor" (caption muted) pero con affordance de botón (hover, focus-visible, aria-expanded). La zona 3 queda **100% ocupada por la CTA primary** — cero wrap vertical posible.

### TASK-508 — Polish de line item rows

Tres mejoras modern-bar en la tabla de ítems:

1. **Consolidación de chips**: la columna "Tipo" antes mostraba 3 chips apilados (Tipo / Source / Tier). Ahora son 2 chips horizontales (Tipo + Tier), y el origen (Catálogo/Servicio/Template/Manual) pasa a ser un **ícono prefijo en la celda Ítem** con tooltip. Menos ruido visual, misma información.

2. **Warnings inline**: los avisos del engine antes rompían la grid de la tabla con una fila extra `<Alert>` full-width debajo de la row afectada. Ahora el warning aparece como **icon-button en la celda de acciones** (color semantic: error/warning/info según severity más alta); click abre un Popover con el detalle. La grid queda intacta, la tabla no se fragmenta.

3. **Row density reducida**: padding vertical de body cells de default (~16px) a `py: 0.75` (~6px), alineando con la densidad enterprise de Linear / Notion / GitHub Issues. Rows pasan de ~60-70px a ~48-52px — más ítems visibles por scroll.

## Cambios v3.4 (2026-04-19 — TASK-506 · Dock CTA simplification)

TASK-505 dejó el dock con layout enterprise pero heredó de TASK-504 dos CTAs en la zona derecha (`Guardar y cerrar` + `Guardar y emitir`) que creaban tres problemas:

- **Cognitive collision**: ambos empezaban con "Guardar", el usuario parseaba el verbo dos veces antes de leer el diferenciador.
- **Wrap vertical**: en pantallas normales las 2 CTAs no cabían side-by-side en la zona 3 (md=4) y se apilaban — el dock crecía de ~80 px a ~110 px.
- **Mental model fragmentado**: entre el header ("Guardar borrador") y el dock había **tres puntos para guardar** en una misma pantalla.

### Cambios v3.4

1. **Dock con una sola CTA terminal**: `Guardar y emitir`. El "Guardar y cerrar" del dock se eliminó — el "Guardar borrador" del header ya cumple el rol de "persist sin cerrar". 2 saves en la página en vez de 3.
2. **Grid zones ajustadas a 3/6/3**: la zona del Total gana ancho para la ladder de ajustes; la zona de acciones queda compacta con el chip de addons + 1 CTA horizontal sin wrap.
3. **Chip de addons con contexto cuantitativo**: cuando hay addons aplicados, el chip muestra `1 addon · $44.316` (el monto aportado al total). Si además hay sugerencias sin aplicar, suma `+$X` muted al final como preview.
4. **Save indicator con count**: cuando el draft tiene cambios sin guardar y la cantidad de líneas cambió, el indicador muestra "Sin guardar · 2 cambios" (antes solo "Sin guardar").

El wrapper `QuoteSummaryDock` preserva el soporte para CTA secundaria — los docks futuros (invoice, purchase order, contract summary) pueden pasar ambas si el caso lo requiere. El shell del cotizador simplemente no las pasa.

## Cambios v3.3 (2026-04-19 — TASK-505 · Summary Dock v2)

Rediseño del dock sticky-bottom con jerarquía enterprise y extracción de 3 primitives reusables al platform. El dock pasó de ser una barra plana de ~80 px con 9+ elementos compitiendo en una sola fila a una composición de 3 zonas que el ojo puede escanear de un vistazo.

### Layout 3 zonas (≥ 960 px)

```
┌────────────────┬──────────────────────────┬──────────────────────────────┐
│ Estado (3/12)  │ Totals ladder (5/12)     │ Acciones (4/12)              │
├────────────────┼──────────────────────────┼──────────────────────────────┤
│ ● Sin guardar  │ TOTAL CLP                │ [+1 addon] [Cancelar] [Save] │
│   2 cambios    │ $2.967.816               │                              │
│                │ Subtotal · Factor · IVA  │                              │
│ ✓ Margen       │ (solo si hay ajustes)    │                              │
│   49,4% · Ópt. │                          │                              │
└────────────────┴──────────────────────────┴──────────────────────────────┘
```

En 600–960 px se reorganiza en 2 filas (totals arriba, estado + acciones abajo). En < 600 px colapsa a columna única con CTA full-width al final.

### Cambios clave

- **Total ya no usa el azul de marca**. El número grande queda en `text.primary`; el azul (`primary.main`) queda exclusivo para el botón "Guardar". Así el ojo distingue sin esfuerzo "valor destacado" de "acción".
- **Subtotal redundante oculto**. Cuando `Subtotal === Total` (sin IVA, sin factor país ≠ 1, sin descuento) el dock muestra solo el Total. Cuando hay ajustes, aparece una ladder compacta muted debajo: `Subtotal $X · Factor ×1,15 · IVA $Y`.
- **Margen chip con label completo**: de `49.4%` + ícono a `Margen · 49,4% · Óptimo` + ícono + color semantic. Cero ambigüedad, lee completo por screen reader en un solo phrase. Tooltip con tier range al hover.
- **Save state con 2 líneas**: dot semantic + label principal ("Sin guardar") + caption con contexto ("2 cambios" o "hace 12s"). Pulsing animado cuando guardando, respeta `prefers-reduced-motion`.
- **CTA copy invariante**. Antes el botón cambiaba de "Guardar y cerrar" → "Calculando pricing…" → "Guardando…". Ahora el copy queda fijo; loading = disabled + spinner. Alinea con patrón Stripe/Linear.
- **AnimatedCounter 0.4 s → 0.25 s**. Más snappy en cambios frecuentes; respeta reduced-motion.

### 3 primitives nuevos (reusables)

Extraídos a `src/components/greenhouse/primitives/` para consumo futuro por invoice builder, purchase order footer, contract summary, cualquier dock con total + health status:

- **`SaveStateIndicator`** — dot + label + caption con changeCount/lastSavedAt.
- **`MarginHealthChip`** — chip semantic con icon + label + pct + status word + tooltip de tier range.
- **`TotalsLadder`** — total prominent + ladder adaptativa de ajustes. Renderiza solo lo que aporta información.

Esto converge con la estrategia de platform primitives de TASK-498 (Sprint 3) — el primer builder post-quotes podrá reutilizarlos sin re-implementar.

## Cambios v3.2 (2026-04-19 — TASK-500 / TASK-501 / TASK-502 / TASK-503)

Bundle enfocado en cerrar las últimas fricciones del Quote Builder post-TASK-488. Cuatro ejes:

### Cantidad semántica para roles y personas (TASK-500 + TASK-502)

- En líneas de **rol** y **persona**, la columna **Cantidad** ahora representa **meses facturables**, no un multiplicador genérico. Un caption "meses facturables" lo explicita debajo del input.
- Al cambiar la cantidad, el engine re-simula inmediatamente y el total se actualiza en vivo (sin tener que abrir el popover Ajustes).
- **Bug de doble conteo corregido**: antes el engine recibía `quantity` y `periods` con el mismo valor y multiplicaba dos veces. Ahora `quantity = 1` siempre para role/person, y el multiplicador real es `periods`. Resultado: con 0.5 meses a FTE=1, el subtotal es `0.5 × unitPrice` (no `0.25 × unitPrice` como antes).
- Para **tools / deliverables / direct_cost** la semántica de Cantidad es la tradicional (cuántas unidades); sin cambios.

### Unidad read-only para role/person (TASK-500)

- La columna **Unidad** para rol/persona queda fijada en "Mes" como chip read-only. El engine usa base mensual para esas líneas y ofrecer el dropdown era engañoso.
- Otras líneas (tool, direct_cost) mantienen el dropdown `Hora / Mes / Unidad / Proyecto`.

### Precio unitario: catálogo = read-only, manual = editable (TASK-501 + TASK-502)

- Para **items de catálogo** (rol, persona, herramienta, overhead_addon): la celda "Precio unitario" ahora es **texto read-only** con el precio efectivo. El catálogo es la única fuente de verdad; permitir override desde la UI corrompía la consistencia.
- Para **rol/persona**, el precio mostrado se ajusta por FTE: si `FTE=0.5`, el precio visible es la mitad del rate del catálogo, así `subtotal = meses × precioMostrado` cuadra a ojo.
- Para **líneas manuales** (`direct_cost` sin `pricingV2LineType`): el input de precio unitario sigue editable. Si necesitas un precio distinto al del catálogo, creas una línea manual.
- Un **chip "FTE 1.0×"** junto al precio en filas rol/persona abre el popover Ajustes al click (descubribilidad del knob FTE sin gastar columna nueva).

### Ajustes popover: solo FTE + Tipo de contratación (TASK-500)

- El popover de la columna de acciones (ícono `tabler-adjustments`) ahora tiene dos campos:
  - **FTE** (0.1 a 1.0).
  - **Tipo de contratación** — dropdown poblado desde `/api/finance/quotes/pricing/config` (`catalog.employmentTypes`). Antes era un text field libre donde los typos generaban errores silenciosos del engine.
- El campo "Períodos (meses)" se eliminó del popover: es redundante con la columna Cantidad.

### Guardar: fresh-simulate + botón gated mientras el engine calcula (TASK-501)

- El botón "Guardar" (header + dock) se **deshabilita mientras el engine está recalculando** (copy en el header pasa a "Calculando pricing…").
- Al hacer submit, el shell dispara una **simulación fresca** contra `/api/finance/quotes/pricing/simulate` con la snapshot actual del draft, y usa **esa respuesta** para resolver los precios a persistir. Elimina la race condition de raíz: antes, si el usuario clickeaba Guardar antes del debounce del hook, se comparaba una snapshot vieja y el save fallaba con "no hay precio".
- Si al final del fresh-simulate aún falta precio para una línea catalog-backed, el error nombra la línea específica ("Creative Operations Lead (ECG-001): sin precio sugerido, revisa tier margin").

### Addons: tildar = línea, destildar = quitar (TASK-503)

- Antes los "Addons sugeridos" mostraban checkboxes pero el toggle era cosmético: el engine seguía auto-sumando todos los addons aplicables al total y el usuario no tenía control real.
- Ahora el engine corre en modo **`autoResolveAddons: 'internal_only'`** (nuevo valor). Semántica:
  - Addons **internos** (`visibleToClient: false` — overhead, fee EOR, markup estructural) siguen corriendo automáticamente como parte del cost stack. No son decisión comercial.
  - Addons **visibles al cliente** (`visibleToClient: true`) llegan al panel como **propuestas**. Al tildar, se agregan como **línea `overhead_addon` explícita en la tabla**, visible al cliente en el PDF. Al destildar, se quitan.
- Regla central del modelo: **lo que el cliente paga es lo que ve en la tabla**. Cero markup oculto al cliente.
- El panel del dock renombrado a "Addons para el cliente". Ya no muestra el `appliedReason` raw del engine (strings como `staffing_model=named_resources` eran debug técnico, no user-facing). Solo nombre del addon + monto en moneda output.
- El chip del dock cuenta addons aplicados + propuestos (antes solo propuestos). Si tildabas todos, el chip desaparecía y no se podía destildar.
- El panel es idempotente: dobles clicks, race condition con el debounce del engine, y entries duplicados quedan manejados client-side con dedupe por sku + guard en el toggle handler.

## Cambios v3 (2026-04-19 — TASK-486)

- **A quién se le cotiza — regla canónica**: una cotización ahora se ancla a **Organización (cliente o prospecto) + Contacto (persona)**. Antes el cotizador mostraba un dropdown llamado "Espacio destinatario" que técnicamente guardaba la organización pero confundía el modelo: Space es una proyección operativa interna (delivery, pulse, ICO) que sólo aplica post-venta. En una cotización sólo importan la organización dueña del deal y la persona con quien negocias.
- **Dropdown 1 renombrado** — "Espacio destinatario" → **"Organización (cliente o prospecto)"**. Lista todas las organizaciones activas (clientes vigentes + prospectos). Obligatorio.
- **Dropdown 2 nuevo — "Contacto"**: opcional. Cuando eliges la organización, aparece la lista de personas registradas con una membership comercial activa hacia esa org (contacto, usuario cliente, rol de billing, partner o advisor). El contacto principal (marcado `is_primary` en el directorio) aparece primero con la etiqueta `· Principal`.
- **Validación en el POST**: si no mandas `organizationId` al guardar, el endpoint devuelve 400 con "organizationId es obligatorio". Si mandas un `contactIdentityProfileId` que no tiene membership activa en esa organización, 400 con "El contacto no tiene membership activa en esa organización". Con esto el modelo canónico se respeta siempre, no por convención.
- **`space_id` queda legacy**: columnas `space_id` y `space_resolution_source` se preservan en la base de datos para no romper lectores downstream de quote-to-cash (purchase orders, service entries, income materialization), pero el builder y el sync de HubSpot ya no las escriben. Se planifica una v2 que haga drop físico cuando todos los consumers migren.
- **HubSpot sync más simple**: antes pedía que la company de HubSpot tuviera un Space mapeado para poder sincronizar. Ahora sólo pide que la company esté mapeada a una Organización. Si la org existe, la quote se sincroniza aunque no haya space.
- **Deal HubSpot como ancla de sincronización**: además de la organización y el contacto, el builder puede guardar `hubspotDealId` sobre la quote. Eso resuelve el caso real en que la company existe pero la quote no sabe a qué oportunidad empujar updates, stages o attachments en HubSpot.
- **Response del detail**: `GET /api/finance/quotes/[id]` ahora devuelve dos objetos nuevos en la respuesta — `organization` (con id, nombre y tipo: cliente/prospecto) y `contact` (con id, nombre, email, cargo). Consumers como el PDF, el email de envío y el approval workflow los pueden usar sin resolver la identidad por separado.

## Cambios v3.1 (2026-04-19 — hardening de persistencia y rehidratación)

- **Precio y costo quedan amarrados al mismo motor**: cuando guardas una cotización con líneas auto-valorizadas (rol, persona, herramienta, overhead), el builder ya no persiste solo el precio final. Ahora también conserva el costo resuelto por el pricing engine v2, para que el detail view mantenga total, costo y margen coherentes después de guardar.
- **Editar no re-simula con “la fecha de hoy”**: al reabrir una cotización existente, el builder reutiliza la `quoteDate` original para la simulación. Así no cambian silenciosamente factores, FX o multiplicadores solo por volver a entrar días después.
- **`businessLineCode` vuelve a hidratarse en edit**: el quote canonical detail vuelve a entregar la línea de negocio, así que editar y guardar ya no la pisa a `null`.
- **Errores de pricing explícitos**: si una línea de catálogo llega sin precio resuelto, create/edit devuelven un `422` con mensaje claro en vez de un `500` vacío.

## Cambios v3.2 (2026-04-19 — emisión oficial + aprobación por excepción)

- **Guardar ya no equivale a emitir**: al guardar una cotización el documento sigue en **Borrador**. El momento oficial ahora es la acción **Emitir cotización**.
- **El builder ya deja emitir sin salir a ciegas**: en `/finance/quotes/new` y `/finance/quotes/[id]/edit` existen dos intents distintos — **Guardar borrador** para seguir trabajando y **Guardar y emitir** para cerrar la versión documental oficial desde el mismo builder. El dock inferior también usa esa misma separación.
- **`Emitida` es el estado documental correcto**: si la quote cumple política financiera, pasa directo a `Emitida` sin pedir aprobación. Si rompe una regla de excepción, pasa a `En aprobación` y, cuando todos los pasos quedan aprobados, termina también en `Emitida`.
- **Rechazo explícito**: si Finance o el aprobador rechaza una excepción, la quote queda en **Revisión requerida** (`approval_rejected`). No vuelve silenciosamente a borrador.
- **Detalle y builder comparten la misma regla de acceso**: la visibilidad de **Editar**, **Guardar como template** y **Emitir** se resuelve desde el surface financiero canónico (`authorizedViews` + `routeGroups` + override de `efeonce_admin`), así que un superadministrador o un usuario con acceso real a Finanzas ya no queda sin acciones por leer mal la sesión del cliente.
- **PDF / email / share ya no cambian el lifecycle**: descargar el PDF, guardarlo localmente o decidir después si la envías al cliente no cambia el estado documental. Todo eso opera sobre una quote ya emitida.
- **Nueva versión cuando cambia el contenido oficial**: una quote emitida ya no se edita en el mismo documento. Si necesitas cambiar precio, alcance o condiciones materiales, el flujo correcto es crear una nueva versión.

## Cambios v2 (2026-04-19)

- **Surfaces full-page**: el cotizador ya no vive en un drawer lateral. Ahora usas `/finance/quotes/new` para crear y `/finance/quotes/[id]/edit` para editar. `/finance/quotes/[id]` queda solo para revisión y governance (approvals, document chain, PDF, issue).
- **Source selector first-class**: 4 cards visibles — **Catálogo** / **Servicio** / **Template** / **Manual**. El patrón "manual-first" del drawer legacy quedó atrás.
- **Servicios compuestos (EFG-XXX)**: al elegir un servicio empaquetado se auto-expande a múltiples líneas (roles + herramientas) con pricing canónico. Cada línea conserva chip "Servicio EFG-XXX" para trazabilidad.
- **Provenance chip por línea**: cada línea muestra de dónde salió (`Catálogo` / `Servicio` / `Template` / `Manual`). No se pierde el origen al editarla.
- **Avisos del pricing engine**: panel nuevo en el rail que muestra cualquier fallback silencioso (modelo comercial desconocido, factor país ausente, tasa FX stale, rol sin tier margin, etc.) con severidad (Crítico / Atención / Info).
- **FX foundation integrada**: cotizar en MXN/COP/PEN/CLF sin tasa cargada ya no produce totales silenciosamente mal — el panel avisa `fx_fallback — Crítico` y el AE sabe que hay que pedir tasa manual a Finance Admin.

## Para qué sirve

El **cotizador** es la pantalla donde cualquier Account Lead arma una cotización y la emite como propuesta oficial — sin copiar Excels, sin calcular márgenes a mano y sin adivinar qué cobrar por un diseñador senior dedicado 4 meses en Chile vs México.

El cotizador reemplaza la hoja de cálculo. Lo que antes eran 40 minutos de copiar-pegar, ahora son 6 clics. El margen sale bien sin que el Account Lead piense en él, y Finance puede revisar cómo se armó sin pedirle el Excel al comercial.

## Qué hace por ti

| Si eres... | Esto es lo que ganas |
|---|---|
| **Account Lead** | Arma una cotización eligiendo del catálogo (rol, persona, herramienta, overhead). No calculas precios: el sistema aplica la tarifa base del rol, multiplica por tu modelo comercial y país, y te muestra el total en la moneda del cliente |
| **Finance / Admin** | Ves el cost stack completo por línea (costo interno, overhead, margen aplicado, tier compliance). Puedes auditar cómo salió cada precio sin revisar Excels |
| **Revisor del cliente** | El cliente ve un total limpio y consistente. Los markup internos no se ven. La moneda coincide con la que firma |

## Cómo se usa (flujo típico)

### 1. Abrir el drawer de nueva cotización
En la lista de cotizaciones (`/finance/quotes`), el botón **+ Nueva cotización** navega a `/finance/quotes/new` — una pantalla full-page dedicada con dos columnas: composición a la izquierda, rail comercial a la derecha.

### 2. Elegir punto de partida

El cotizador expone 4 fuentes de composición como cards first-class en el área principal. Ya no hay un "+ Agregar item" genérico — la UI invita primero a partir del catálogo o de un servicio antes que a crear líneas a mano.

| Fuente | Cuándo usarla | Qué hace |
|---|---|---|
| **Catálogo** | Armar quote puntual pick-and-pack | Abre el picker con roles / personas / herramientas / overhead del pricing catalog |
| **Servicio** | Vender un servicio empaquetado Efeonce (EFG-001..007) | Elige un EFG y se expande a N líneas (roles + herramientas) con composición pre-aprobada |
| **Template** | Partir de una cotización reutilizable ya aprobada | Carga defaults comerciales + items del template |
| **Manual** | Agregar una línea en blanco para editarla a mano | Crea una fila vacía con source=`manual` |

Cada línea resultante muestra un chip con su origen (`Catálogo` azul, `Servicio` verde, `Template` info, `Manual` secundario). Editar los campos no borra el chip — el origen se preserva para la auditoría posterior.

### 3. Contexto del cliente (sidebar derecho)
El sidebar pide los datos que el motor necesita para cotizar:

| Campo | Qué decide |
|---|---|
| **Business line** | Filtra qué herramientas y addons aplican |
| **Modelo comercial** | Aplica multiplicador (On-Going 0%, On-Demand +15%, Híbrido +10%, Licencia/Consulting +5%) |
| **País del cliente** | Aplica factor (Chile Corporate 1.00, Chile PYME 0.85, Colombia/LATAM 0.70, Internacional USD 1.15…) |
| **Moneda** | Convierte el total usando la exchange rate del día (USD / CLP / CLF / COP / MXN / PEN) |
| **Duración del contrato** | Marca el compromiso mensual para retainer/híbrido |
| **Válida hasta** | Fecha de expiración de la oferta |
| **Descripción** | Alcance resumen que ve el cliente |

### 4. Agregar ítems al scope
Además de las 4 cards del source selector (Catálogo / Servicio / Template / Manual), dentro del editor de líneas tienes una barra de quick-add con 5 botones:

- **+ Rol** — Catálogo de los 33 roles sellables (ej. "Senior Visual Designer"). Se crea una línea con `fteFraction=1.0` y `periods=1` por default.
- **+ Persona** — Colaborador específico del team. Conectado al catálogo de team members activos.
- **+ Herramienta** — Tool del catálogo (ej. "Adobe Creative Cloud"). Se prorratea el precio.
- **+ Overhead** — Add-on (ej. "Client Management 15%"). Puede ser fee fijo o porcentaje.
- **+ Manual** — Línea en blanco para capturar algo que no está en el catálogo.

Los botones +Rol / +Persona / +Herramienta / +Overhead abren el picker drawer en el tab correspondiente. El source selector del área principal (más prominente) es equivalente pero con UX más clara para composición nueva; los botones quick-add están pensados para agregar una línea adicional a una quote ya en curso.

### 5. Ajustar contexto de pricing por línea

**Para líneas de rol y persona** (catalog-backed, base mensual):

- La columna **Cantidad** representa meses facturables. Cambiarla re-simula el subtotal en vivo.
- La columna **Unidad** queda fijada en "Mes" (chip read-only). El engine no usa ese campo para rol/persona.
- La columna **Precio unitario** muestra el precio efectivo ajustado por FTE como **texto read-only**. El catálogo es la fuente de verdad.
- Al lado del precio aparece un chip **"FTE 1.0×"** que al click abre el popover Ajustes con:
  - **FTE** (0.1 a 1.0).
  - **Tipo de contratación** (dropdown desde el catálogo — ej. `indefinido_clp`, `contractor_deel_usd`, vacío = usa el default del rol).

**Para líneas de herramienta y overhead**:

- Cantidad y Unidad editables.
- Precio unitario read-only (también catalog-backed).

**Para líneas manuales** (`direct_cost`):

- Cantidad, Unidad y Precio unitario editables — el usuario define el precio.

El motor recalcula automáticamente cada vez que cambias cualquier campo (debounce 500ms).

### 6. Dock sticky con totales (v2 post-TASK-505)

Un **dock flotante sticky-bottom** con 3 zonas muestra el estado de la cotización sin robar espacio de la tabla:

**Zona izquierda — Estado**:
- Indicador de save (● Sin guardar / Guardando / Guardado hace Xs) con count de cambios.
- Chip de margen "Margen · 49,4% · Óptimo/Atención/Crítico" con ícono + color semantic + tooltip de tier range al hover.

**Zona central — Total**:
- Monto grande en `text.primary` con currency inline en el label (ej. "Total CLP").
- Debajo, una ladder muted aparece solo si hay ajustes que explicar: `Subtotal $X · Factor ×1,15 · IVA $Y`. Si Subtotal == Total, la ladder queda oculta.

**Zona derecha — Acciones**:
- Chip de addons (tildar/destildar agrega o quita líneas `overhead_addon` visibles al cliente).
- "Cancelar" (tonal secondary).
- "Guardar y cerrar" (primary, azul de marca). Loading = disabled + spinner, sin cambiar el texto del botón.

### 7. Panel "Addons para el cliente" (dock sticky-bottom)

El engine v2 corre en modo `autoResolveAddons: 'internal_only'`:

- **Addons internos** (`visibleToClient: false` — overhead, fee EOR estructural) corren automáticamente como parte del cost stack. Afectan margen. No se muestran al cliente.
- **Addons visibles al cliente** (`visibleToClient: true`) aparecen en el panel como **propuestas**. Tildar uno lo **agrega como línea `overhead_addon`** en la tabla con su precio del catálogo. Destildar lo quita.

El chip del dock muestra el count total de addons en juego (aplicados + propuestos). Cuando quedan sugerencias sin aplicar, muestra "+$X" con el delta potencial al total.

Regla: **lo que el cliente paga es lo que ve en la tabla**. Los addons aplicados son líneas visibles en el PDF. Cero markup oculto.

### 8. Cost stack por línea (solo finance/admin)
Cada línea, si tienes rol `efeonce_admin`, `finance_admin` o `finance_analyst`, muestra un acordeón con:
- Costo total USD
- Breakdown (hourly cost interno, overhead per línea)
- Margen % aplicado
- Tier compliance (bajo mínimo / en rango / óptimo / sobre rango)

### 9. Chip de tier compliance visible para todos
Al lado del tipo de línea aparece un chip con el estado del tier. Incluso sin ver el cost stack, el Account Lead sabe si el margen está en rango.

### 10. Panel de avisos del pricing engine (nuevo)

Entre Addons y Totales aparece un panel con los avisos estructurados que emitió el engine durante la simulación. Cada aviso tiene:

- **Severidad**: `Crítico` (rojo) / `Atención` (amarillo) / `Info` (azul)
- **Código estable**: `unknown_commercial_model`, `unknown_country_factor`, `missing_tier_margin`, `tool_price_default_margin`, `fx_fallback`, `tier_below_min`, `legacy_rate_card_used`
- **Mensaje en español** y el número de línea afectada cuando aplica

Los críticos bloquean el envío al cliente. Los amarillos permiten enviar con confirmación. Los info son transparencia (ej. "la tasa USD→MXN se derivó vía USD composition"). Corregir el catálogo (agregar el tier margin faltante, cargar la tasa FX, etc.) elimina el aviso automáticamente en la siguiente simulación.

### 11. FX readiness (nuevo)

Si cotizas en una moneda distinta a USD o CLP (CLF / COP / MXN / PEN), el engine consulta la **foundation FX** antes de calcular:

- Si hay tasa fresca → el total usa esa tasa, el panel queda limpio.
- Si la tasa existe pero está vieja (> 7 días) → aviso `fx_fallback — Atención`. Envío permitido con aviso visible.
- Si no hay tasa cargada → aviso `fx_fallback — Crítico`. Finance Admin debe cargar tasa manual.
- Si la moneda no está soportada por el dominio `pricing_output` → aviso `fx_fallback — Crítico` con mensaje explícito.

El detalle de política FX (umbrales, composición cross-pair vía USD, coverage por moneda) vive en [monedas-y-tipos-de-cambio](./monedas-y-tipos-de-cambio.md).

## Precio unitario: catálogo vs manual

**Items de catálogo** (rol, persona, herramienta, overhead_addon): el precio viene del engine y se muestra como **texto read-only** en la tabla. No se edita. El catálogo es la única fuente de verdad. Si necesitas un precio distinto, creas una línea manual.

Para **rol/persona**, el precio mostrado se escala por FTE: `precioMostrado = catalogPrice × fteFraction`. Así el subtotal visible es `meses × precioMostrado` — aritmética lineal auditable a ojo.

**Líneas manuales** (`direct_cost` sin `pricingV2LineType`): el input de "Precio unitario" sigue editable. El usuario define el monto y el subtotal es `quantity × unitPrice`.

**Override histórico eliminado**: en versiones anteriores el usuario podía escribir un precio sobre una línea de catálogo (aparecía chip "Override" + botón refresh). Esto rompía la consistencia catálogo ↔ cotización persistida y confundía al comercial. Ahora, ajustes sobre una línea de catálogo se hacen cambiando el knob correcto:

- Cantidad de meses → columna Cantidad.
- Porcentaje de dedicación → chip FTE en la celda del precio (abre popover Ajustes).
- Tipo de contratación → dropdown en el popover.
- Excepción puntual de precio → línea manual direct_cost (el cliente verá "Ajuste comercial" explícito).

## Edit de una cotización existente

El botón **Editar** en el header del detail view (visible solo si el quote está en estado `draft` o `approval_rejected` y el viewer tiene permisos) navega a `/finance/quotes/[id]/edit`. La surface de edit es **la misma shell** que create — mismo layout, mismo source selector, mismos controles. La diferencia es que precarga el quote + líneas existentes.

Si intentas acceder directamente a `/edit` de un quote no editable (estado distinto a `draft` / `approval_rejected` o sin permisos), redirige al detail view con `?denied=edit`.

`QuoteDetailView` (`/finance/quotes/[id]`) queda exclusivamente para review, governance (approvals, terms, audit, document chain), emisión, PDF, "Guardar como template" y acciones de distribución posteriores. **No** contiene edición estructural.

### 10. Guardar
El botón **Guardar** persiste la quote canónica en PostgreSQL como **Borrador**. Cuando el comercial decide formalizarla usa **Emitir cotización** desde el detail; si la quote cumple policy pasa directo a `Emitida`, y si no, entra a aprobación por excepción. Se propaga a HubSpot (vía TASK-463) si aplica.

## Qué NO hace (todavía)

- **Edit de quote existente**: disponible en `/finance/quotes/[id]/edit` (mismo shell que create). Precarga el quote + líneas; respeta `quoteDate` y `businessLineCode` originales para re-simulación estable (TASK-501).
- **No guarda composiciones como template** — TASK-465 agrega el 5to tab de servicios empaquetados.
- **No muestra historial de cambios en el drawer** — se ve en la vista detalle de la quote.
- **No sincroniza en tiempo real entre múltiples usuarios** — follow-up de colaboración.
- **El cost stack no permite override de margen desde el UI** — hoy es display. Editar margen por línea es follow-up con audit trail.

## Cómo ve esto un rol específico

### Account Lead (sin rol finance)
- Ve los 4 botones de picker funcionales
- Ve el footer con totales + margen chip
- Ve el tier chip por línea
- **NO ve** el cost stack ni el panel de addons sugeridos
- Puede ajustar FTE / períodos / tipo de contrato pero NO ve el costo interno

### Finance Admin / Finance Analyst / Efeonce Admin
- Ve todo lo anterior
- Ve el cost stack de cada línea con breakdown completo
- Ve el panel de addons sugeridos con toggle
- Ve el mismo margen chip (consistente con lo que ve el Account Lead)

## Qué pasa internamente

El cotizador consume dos endpoints:

1. **`GET /api/finance/quotes/pricing/config`** — se llama al abrir el drawer. Trae el catálogo (roles, tools, addons, employment types, tiers, commercial models, country factors).
2. **`POST /api/finance/quotes/pricing/simulate`** — se llama cada 500ms mientras el usuario edita. Pasa el input del engine v2 y recibe el output con cost stack + addons + totals + tier compliance.

El cost stack viene del endpoint solo si el viewer tiene rol finance/admin — la API filtra antes de mandar la respuesta.

El input del engine v2 se construye en el cliente mapeando las líneas:
- Rol → `{ lineType: 'role', roleSku, fteFraction, periods, employmentTypeCode? }`
- Persona → `{ lineType: 'person', memberId, fteFraction, periods }`
- Herramienta → se persiste como `direct_cost` con `metadata.pricingV2LineType='tool'`
- Overhead → se persiste como `direct_cost` con `metadata.pricingV2LineType='overhead_addon'`

Esto evita cambios de schema en `quotation_line_items` y mantiene la compatibilidad con el storage existente.

> **Detalle técnico:** código en [src/views/greenhouse/finance/workspace/](../../../src/views/greenhouse/finance/workspace/). Primitives reusables en [src/components/greenhouse/pricing/](../../../src/components/greenhouse/pricing/). Hook de simulación en [src/hooks/usePricingSimulation.ts](../../../src/hooks/usePricingSimulation.ts). Gating de cost stack en [src/lib/tenant/authorization.ts](../../../src/lib/tenant/authorization.ts) (`canViewCostStack`).

## Próximos pasos

- **TASK-465** agrega servicios empaquetados (tab "Servicios" del picker)
- **TASK-467** expone el admin UI para editar el catálogo (roles, tools, addons, tiers)
- Edit de quote existente con el mismo builder (V2)
- Override de margen por línea con audit trail (ata con TASK-348 governance)
- Playwright E2E de los 4 modos de composición

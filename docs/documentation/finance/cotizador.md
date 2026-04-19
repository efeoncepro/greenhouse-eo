# Cotizador — Builder de Cotizaciones con Pricing Engine Canónico

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 3.0
> **Creado:** 2026-04-18 por Claude (TASK-464e close-out)
> **Ultima actualizacion:** 2026-04-19 por Codex (v3.1 — pricing persistence hardening)
> **Documentacion tecnica:**
> - Surfaces full-page: [TASK-473 — Quote Builder Full-Page Surface Migration](../../tasks/complete/TASK-473-quote-builder-full-page-surface-migration.md)
> - Service composition: [TASK-465 — Service Composition Catalog](../../tasks/complete/TASK-465-service-composition-catalog-ui.md)
> - FX foundation: [GREENHOUSE_FX_CURRENCY_PLATFORM_V1](../../architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md)
> - Engine: [GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md)
> - Primitives originales: [TASK-464e — Quote Builder UI Exposure](../../tasks/complete/TASK-464e-quote-builder-ui-exposure.md) · [TASK-469 — UI Interface Plan](../../tasks/complete/TASK-469-commercial-pricing-ui-interface-plan.md)

## Cambios v3 (2026-04-19 — TASK-486)

- **A quién se le cotiza — regla canónica**: una cotización ahora se ancla a **Organización (cliente o prospecto) + Contacto (persona)**. Antes el cotizador mostraba un dropdown llamado "Espacio destinatario" que técnicamente guardaba la organización pero confundía el modelo: Space es una proyección operativa interna (delivery, pulse, ICO) que sólo aplica post-venta. En una cotización sólo importan la organización dueña del deal y la persona con quien negocias.
- **Dropdown 1 renombrado** — "Espacio destinatario" → **"Organización (cliente o prospecto)"**. Lista todas las organizaciones activas (clientes vigentes + prospectos). Obligatorio.
- **Dropdown 2 nuevo — "Contacto"**: opcional. Cuando eliges la organización, aparece la lista de personas registradas con una membership comercial activa hacia esa org (contacto, usuario cliente, rol de billing, partner o advisor). El contacto principal (marcado `is_primary` en el directorio) aparece primero con la etiqueta `· Principal`.
- **Validación en el POST**: si no mandas `organizationId` al guardar, el endpoint devuelve 400 con "organizationId es obligatorio". Si mandas un `contactIdentityProfileId` que no tiene membership activa en esa organización, 400 con "El contacto no tiene membership activa en esa organización". Con esto el modelo canónico se respeta siempre, no por convención.
- **`space_id` queda legacy**: columnas `space_id` y `space_resolution_source` se preservan en la base de datos para no romper lectores downstream de quote-to-cash (purchase orders, service entries, income materialization), pero el builder y el sync de HubSpot ya no las escriben. Se planifica una v2 que haga drop físico cuando todos los consumers migren.
- **HubSpot sync más simple**: antes pedía que la company de HubSpot tuviera un Space mapeado para poder sincronizar. Ahora sólo pide que la company esté mapeada a una Organización. Si la org existe, la quote se sincroniza aunque no haya space.
- **Response del detail**: `GET /api/finance/quotes/[id]` ahora devuelve dos objetos nuevos en la respuesta — `organization` (con id, nombre y tipo: cliente/prospecto) y `contact` (con id, nombre, email, cargo). Consumers como el PDF, el email de envío y el approval workflow los pueden usar sin resolver la identidad por separado.

## Cambios v3.1 (2026-04-19 — hardening de persistencia y rehidratación)

- **Precio y costo quedan amarrados al mismo motor**: cuando guardas una cotización con líneas auto-valorizadas (rol, persona, herramienta, overhead), el builder ya no persiste solo el precio final. Ahora también conserva el costo resuelto por el pricing engine v2, para que el detail view mantenga total, costo y margen coherentes después de guardar.
- **Editar no re-simula con “la fecha de hoy”**: al reabrir una cotización existente, el builder reutiliza la `quoteDate` original para la simulación. Así no cambian silenciosamente factores, FX o multiplicadores solo por volver a entrar días después.
- **`businessLineCode` vuelve a hidratarse en edit**: el quote canonical detail vuelve a entregar la línea de negocio, así que editar y guardar ya no la pisa a `null`.
- **Errores de pricing explícitos**: si una línea de catálogo llega sin precio resuelto, create/edit devuelven un `422` con mensaje claro en vez de un `500` vacío.

## Cambios v2 (2026-04-19)

- **Surfaces full-page**: el cotizador ya no vive en un drawer lateral. Ahora usas `/finance/quotes/new` para crear y `/finance/quotes/[id]/edit` para editar. `/finance/quotes/[id]` queda solo para revisión y governance (approvals, document chain, PDF, send).
- **Source selector first-class**: 4 cards visibles — **Catálogo** / **Servicio** / **Template** / **Manual**. El patrón "manual-first" del drawer legacy quedó atrás.
- **Servicios compuestos (EFG-XXX)**: al elegir un servicio empaquetado se auto-expande a múltiples líneas (roles + herramientas) con pricing canónico. Cada línea conserva chip "Servicio EFG-XXX" para trazabilidad.
- **Provenance chip por línea**: cada línea muestra de dónde salió (`Catálogo` / `Servicio` / `Template` / `Manual`). No se pierde el origen al editarla.
- **Avisos del pricing engine**: panel nuevo en el rail que muestra cualquier fallback silencioso (modelo comercial desconocido, factor país ausente, tasa FX stale, rol sin tier margin, etc.) con severidad (Crítico / Atención / Info).
- **FX foundation integrada**: cotizar en MXN/COP/PEN/CLF sin tasa cargada ya no produce totales silenciosamente mal — el panel avisa `fx_fallback — Crítico` y el AE sabe que hay que pedir tasa manual a Finance Admin.

## Para qué sirve

El **cotizador** es la pantalla donde cualquier Account Lead arma una cotización y la envía al cliente — sin copiar Excels, sin calcular márgenes a mano y sin adivinar qué cobrar por un diseñador senior dedicado 4 meses en Chile vs México.

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
Para líneas de **rol** y **persona** aparece una fila debajo con:
- **FTE** (fracción 0.1 → 1.0)
- **Períodos** (meses)
- **Tipo de contratación** (ej. `indefinido_clp`, `contractor_deel_usd`, vacío = usa el default del rol)

El motor recalcula el precio automáticamente cada vez que cambias algo (debounce 500ms).

### 6. Ver totales en tiempo real
Debajo del drawer, un **footer sticky** muestra:
- **Subtotal** en USD + moneda output
- **Overhead** aplicado
- **Total** en moneda output (grande)
- **Multiplicadores aplicados** (comercial × país)
- **Chip de margen**: Saludable / Atención / Crítico con color

### 7. Panel de addons sugeridos (derecha, solo finance/admin)
Si el motor detecta addons aplicables al contexto (ej. "Management fee" para retainers), aparecen como checkboxes. Los toggles disparan nueva simulación.

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

## Override del precio unitario

Cuando agregas una línea de rol desde catálogo, el **precio unitario viene sugerido por el engine** (cost stack × margin × multiplicadores × factor país). Tienes 3 caminos:

1. **Aceptar el sugerido** (default) — no escribes nada en el campo "Precio unitario". La UI muestra "Sugerido $X" debajo del input.
2. **Override manual** — escribes un precio distinto. Aparece chip "Override" amarillo + botón refresh para volver al sugerido.
3. **Volver al sugerido** — click en el botón refresh al lado del chip Override → limpia el override, el engine vuelve a mandar.

El subtotal de cada línea respeta el override si existe; si no, usa el cálculo del engine. El footer de totales suma consistente con cualquiera de los dos modos.

## Edit de una cotización existente

El botón **Editar** en el header del detail view (visible solo si el quote está en estado `draft` y el viewer tiene permisos) navega a `/finance/quotes/[id]/edit`. La surface de edit es **la misma shell** que create — mismo layout, mismo source selector, mismos controles. La diferencia es que precarga el quote + líneas existentes.

Si intentas acceder directamente a `/edit` de un quote no editable (estado distinto a `draft` o sin permisos), redirige al detail view con `?denied=edit`.

`QuoteDetailView` (`/finance/quotes/[id]`) queda exclusivamente para review, governance (approvals, terms, audit, document chain), envío al cliente, PDF, "Guardar como template". **No** contiene edición estructural.

### 10. Guardar
El botón **Crear cotización** persiste la quote canónica en PostgreSQL. Se propaga a HubSpot (vía TASK-463) si aplica.

## Qué NO hace (todavía)

- **No edita quotes existentes con este UI** — la primera versión solo crea. La edición con el builder nuevo queda para V2.
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

# Cotizador — Builder de Cotizaciones con Pricing Engine Canónico

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-18 por Claude (TASK-464e close-out)
> **Ultima actualizacion:** 2026-04-18 por Claude
> **Documentacion tecnica:**
> - Spec funcional: [TASK-464e — Quote Builder UI Exposure](../../tasks/complete/TASK-464e-quote-builder-ui-exposure.md)
> - Plano UI: [TASK-469 — Commercial Pricing UI Interface Plan](../../tasks/complete/TASK-469-commercial-pricing-ui-interface-plan.md)
> - Engine: [GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md)

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
En la lista de cotizaciones (`/finance/quotes`), el botón **+ Nueva cotización** abre un panel lateral.

### 2. Elegir punto de partida
- **Desde cero** → armas el scope desde el catálogo
- **Desde template** → heredas ítems + modelo de un template aprobado (Ej. "Staff Aug Designer 6 meses")

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
Arriba de la tabla de líneas tienes 4 botones:

- **+ Rol** — Elegir del catálogo de los 33 roles sellables de Efeonce (ej. "Senior Visual Designer"). Se crea una línea con `fteFraction=1.0` y `periods=1` por default.
- **+ Persona** — Elegir un colaborador específico (ej. "María González"). Se conecta al catálogo de team members activos.
- **+ Herramienta** — Elegir una tool del catálogo (ej. "Adobe Creative Cloud"). Se prorratea el precio.
- **+ Overhead** — Elegir un add-on (ej. "Client Management 15%"). Puede ser fee fijo o porcentaje.

El botón abre un drawer con tabs. Buscas por nombre o SKU, seleccionas uno o varios, confirmas y vuelves a la tabla con las líneas agregadas.

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

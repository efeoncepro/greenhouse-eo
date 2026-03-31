# Delta 2026-03-31
- Cerrada por implementación conjunta con `TASK-183`.
- Entregado en runtime:
  - drawer con taxonomía `Operacional / Tooling / Impuesto / Otro`
  - categorías contextuales, imputación por `shared/member/space`, recurrencia y señales de tooling
  - metadata enriquecida con `spaces`, `members`, `supplierToolLinks`, `paymentProviders` y `paymentRails`
  - compatibilidad transicional preservada para `expense_type` legacy
- Validación ejecutada:
  - `pnpm build` ✅
  - `pnpm lint` ✅ (`0 errors`, quedan 2 warnings legacy en `src/views/greenhouse/hr-core/HrDepartmentsView.tsx`)

# Delta 2026-03-31
- `TASK-183` abre la lane hermana de ledger reactivo y automatización cross-module para `expenses`. Esta task se mantiene como owner del rediseño UX/taxonomía visible del drawer, pero ya no debe intentar cerrar por sí sola el contrato reactivo entre Finance, Payroll, Reconciliation y Cost Intelligence.
- Auditoría del runtime/documentación:
  - el trigger canónico para materializar nómina en ledger no es `payroll_entry.approved`; la arquitectura vigente usa `payroll_period.exported`
  - el helper reusable de costos de tooling vive en `src/lib/team-capacity/tool-cost-reader.ts`, no en `src/lib/ai-tools/tool-cost-reader.ts`
  - no existe evento catalogado `expense.tool_linked`; el contrato reactivo vigente pasa por `finance.expense.created|updated`
  - esta task no puede asumir que el schema actual resuelve tenant isolation; `expenses` todavía no está filtrado por `space_id` en runtime y ese hardening queda alineado con `TASK-183`
  - la referencia externa `../Greenhouse_Portal_Spec_v1.md` no existe en este workspace, por lo que la auditoría se hizo contra arquitectura viva + código + DDL versionado

# TASK-182 — Finance Expense Drawer: Agency Taxonomy, Cross-Module Synergies & Automation

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `complete` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Alto` |
| Status real | `Cerrada` |
| Domain | Finance / UX / Cost Allocation |
| Sequence | Independiente — mejora UX + habilita cost allocation enterprise |

## Summary

El drawer "Registrar egreso" tiene tabs que no reflejan la realidad operativa de una agencia digital: "Nomina" y "Prevision" no deberian ser entrada manual (fluyen desde Payroll), "Linea de servicio" no es util para gastos transversales, y faltan categorias de gasto, imputacion directa (persona/cliente), recurrencia, y sinergias con el modulo AI Tools/Tooling. El schema ya tiene los campos necesarios (`cost_category`, `is_recurring`, `direct_overhead_scope/kind/member_id`, `allocated_client_id`) pero el drawer no los expone.

## Why This Task Exists

### Problema 1 — Tabs que no corresponden a una agencia

| Tab actual | Problema |
|------------|---------|
| **Nomina** | No deberia ser entrada manual. Payroll aprueba/exporta liquidaciones que deben generar el expense automaticamente via outbox. El drawer hoy linkea `payroll_entries` aprobadas pero requiere intervencion manual |
| **Prevision** | En Chile se paga TODO junto via **Previred** como un solo pago consolidado. No se registran AFP, salud, mutual por separado. Deberia ser un egreso al proveedor "Previred" con detalle del periodo |
| **Impuesto** | Correcto conceptualmente pero deberia ser una categoria dentro del drawer unificado, no una tab separada |
| **Varios** | Cajon de sastre sin categoria — impide analisis posterior |

### Problema 2 — Campos del schema no expuestos en UI

El schema `fin_expenses` ya tiene campos poderosos que el drawer ignora:

| Campo en DB | Proposito | Expuesto en drawer? |
|-------------|-----------|---------------------|
| `cost_category` | `direct_labor`, `indirect_labor`, `operational`, `infrastructure`, `tax_social` | **No** |
| `cost_is_direct` | Si el costo es directo (imputable) o overhead | **No** |
| `is_recurring` / `recurrence_frequency` | Gasto recurrente (mensual, anual) | **No** |
| `direct_overhead_scope` | `none`, `member_direct`, `shared` | **No** |
| `direct_overhead_kind` | `tool_license`, `tool_usage`, `equipment`, `reimbursement` | **No** |
| `direct_overhead_member_id` | Persona a quien se imputa | **No** |
| `allocated_client_id` | Cliente directo al que se imputa | **No** |

### Problema 3 — Sin sinergias cross-module

Cuando se paga una suscripcion de herramienta (ej. Anthropic/Claude, Figma, Adobe):
- El modulo AI Tools ya tiene `ai_tool_catalog.fin_supplier_id` — el puente a Finance existe pero no se activa desde el drawer
- El costo no se conecta automaticamente con las licencias asignadas en `member_tool_licenses`
- El P&L operativo no refleja el fully-loaded cost real del colaborador
- No hay forma de ver "Claude cuesta $X/mes, lo usan 8 personas, costo por persona = $Y"

### Problema 4 — Linea de servicio no es util para gastos

"Linea de servicio" (globe, efeonce_digital, reach, wave) no aplica a gastos transversales como infraestructura tecnologica, arriendo, servicios profesionales. Lo correcto es la seccion de **imputacion** (a quien se carga: persona, cliente, o compartido) que ya existe en el schema pero no en la UI.

## Taxonomia de gastos de una agencia digital

### Gastos operativos directos (imputables)

| Categoria | Ejemplos | Recurrente | Sinergia |
|-----------|----------|------------|----------|
| **Nomina neta** | Sueldos transferidos | Mensual | Payroll → auto-expense (sin drawer) |
| **Previred** | Pago consolidado AFP + Salud + AFC + Mutual | Mensual | Payroll → auto-expense (sin drawer) |
| **Tooling / Licencias SaaS** | Figma, Adobe, Slack, Notion, Claude, GitHub, Vercel | Mensual/Anual | AI Tools module, cost proration por persona |
| **Cloud & Infra** | GCP, AWS, dominios, hosting | Mensual | Proration por revenue o headcount |
| **Media / Pauta** | Meta Ads, Google Ads, LinkedIn Ads (pass-through a cliente) | Variable | Imputacion directa a cliente/Space |
| **Produccion externa** | Freelancers, estudios foto/video, imprentas | Por proyecto | Imputacion directa a cliente/Space |

### Gastos operativos indirectos (overhead)

| Categoria | Ejemplos | Recurrente |
|-----------|----------|------------|
| **Oficina & Espacio** | Arriendo, gastos comunes, servicios basicos, internet | Mensual |
| **Equipamiento** | Laptops, monitores, perifericos, mobiliario | Puntual |
| **Servicios profesionales** | Contabilidad, legal, auditoria, RRHH externo | Mensual |
| **Marketing propio** | Publicidad de la agencia, eventos, branding | Variable |
| **Viajes & Representacion** | Pasajes, hospedaje, alimentacion | Puntual |
| **Seguros** | Seguro oficina, responsabilidad civil, cyber | Anual |

### Obligaciones fiscales

| Categoria | Ejemplos | Recurrente |
|-----------|----------|------------|
| **IVA mensual** | F29 | Mensual |
| **PPM** | Pagos provisionales mensuales | Mensual |
| **Renta anual** | F22 | Anual |
| **Patente municipal** | Patente comercial | Semestral |
| **Retencion honorarios** | Boletas de honorarios de freelancers | Mensual |

### Gastos financieros

| Categoria | Ejemplos | Recurrente |
|-----------|----------|------------|
| **Comisiones bancarias** | Transferencias, mantención cuentas | Mensual |
| **Intereses** | Lineas de credito, tarjetas | Variable |
| **Multas & recargos** | Mora SII, multas laborales | Puntual |

## Flujo de sinergia: ejemplo Anthropic/Claude

```
1. Registrar egreso en Finance
   → expense_type: 'supplier'
   → cost_category: 'infrastructure'
   → supplier: Anthropic (proveedor registrado)
   → direct_overhead_kind: 'tool_license'
   → is_recurring: true, recurrence_frequency: 'monthly'

2. Sinergia automatica con AI Tools
   → ai_tool_catalog tiene fin_supplier_id → Anthropic
   → El costo se refleja en el modulo de herramientas IA
   → Se puede ver: "Claude Pro cuesta $X/mes, lo usan 8 personas"

3. Sinergia con Cost Allocation
   → direct_overhead_scope: 'shared' (todos lo usan)
   → auto-allocation rule: prorate por headcount o por uso (ai_credit_ledger)
   → Cada persona tiene un costo de tooling imputable

4. Sinergia con P&L operativo
   → El costo prorrateado llega al member_capacity_economics
   → El fully-loaded cost del colaborador incluye su fraccion de Claude
   → El P&L por BU/cliente refleja el costo real
```

## Implementation Plan

### Fase 1 — Rediseño del drawer (UI)

**Tabs nuevas** — por naturaleza del gasto, no por proveedor:

| Tab | Categorias de gasto | Reemplaza |
|-----|---------------------|-----------|
| **Operacional** | Servicios profesionales, produccion externa, oficina & espacio, equipamiento, media & pauta, marketing propio, viajes & representacion, seguros | Proveedor + Varios |
| **Tooling** | Licencia SaaS, cloud & hosting, hardware & perifericos | Nuevo — activa sinergia AI Tools |
| **Impuesto** | IVA, PPM, renta, patente, retencion honorarios, contribuciones | Impuesto (sin cambio) |
| **Otro** | Gastos financieros, multas, donaciones, sin categoria | Varios |

**Tabs que desaparecen:**
- **Nomina** → se automatiza (Fase 3)
- **Prevision** → se registra como egreso operacional al proveedor "Previred"

**Campos nuevos en el drawer:**

1. **Categoria de gasto** (`cost_category`) — Select obligatorio con opciones contextuales segun tab
2. **Seccion "Imputacion"** — reemplaza "Linea de servicio":
   - Alcance: Compartido / Directo a persona / Directo a cliente
   - Si persona: Autocomplete de miembros (usa `/api/people`)
   - Si cliente: Autocomplete de clientes/organizaciones
   - Tipo overhead: `tool_license`, `tool_usage`, `equipment`, `reimbursement`, `other`
3. **Recurrencia** — Switch "Es gasto recurrente" + frecuencia (mensual, trimestral, anual)
4. **Sinergia tooling** — cuando tab es "Tooling" y proveedor tiene `fin_supplier_id` en `ai_tool_catalog`, mostrar badge con herramienta vinculada

**Layout propuesto:**

```
┌────────────────────────────────────────────────┐
│  Registrar egreso                          [X] │
├────────────────────────────────────────────────┤
│  Tipo de egreso                                │
│  [Operacional] [Tooling] [Impuesto] [Otro]     │
│                                                │
│  ── Datos del egreso ────────────────────────  │
│  Categoria de gasto *    [▼ Select contextual] │
│  Descripcion *           [_______________]     │
│  Moneda * [▼]     Monto total * [________]     │
│  Fecha pago * [dd/mm/aaaa]  Metodo pago [▼]    │
│                                                │
│  ── Proveedor ───────────────────────────────  │
│  Proveedor               [▼ Autocomplete]      │
│  N° Documento [______]  Fecha documento [📅]   │
│                                                │
│  ── Imputacion ──────────────────────────────  │
│  Alcance   (•) Compartido  ( ) Persona  ( ) Cliente │
│  └─ Persona: [▼ Autocomplete miembros]         │
│  └─ Cliente: [▼ Autocomplete organizaciones]   │
│  Tipo overhead  [▼ tool_license/equipment/...]  │
│                                                │
│  ── Recurrencia ─────────────────────────────  │
│  [ ] Es gasto recurrente   Frecuencia: [▼]    │
│                                                │
│  Notas [________________________________]      │
│                                                │
├────────────────────────────────────────────────┤
│              [Cancelar]  [Guardar egreso]      │
└────────────────────────────────────────────────┘
```

### Fase 2 — Sinergia con AI Tools

1. Cuando el proveedor seleccionado tiene `fin_supplier_id` en `ai_tool_catalog`:
   - Mostrar badge: "Herramienta vinculada: Claude Pro"
   - Auto-setear `direct_overhead_kind = 'tool_license'`
   - Sugerir `direct_overhead_scope = 'shared'` (si la herramienta tiene multiples licencias)
2. Crear endpoint ligero: `GET /api/ai-tools/by-supplier?supplierId=X` para resolver la vinculacion
3. Al guardar el egreso con vinculacion tooling, reutilizar `finance.expense.created|updated` como señal reactiva; si falta contexto, enriquecer payload o consumer antes de inventar un evento nuevo

### Fase 3 — Automatizacion Nomina → Expense

1. Cuando Payroll cierra/exporta un período:
   - usar `payroll_period.exported` como trigger canónico del ledger
   - `approved` puede seguir sirviendo para readiness/candidates, pero no como disparador final del gasto canónico
   - Listener en Finance crea automaticamente el expense con:
     - `expense_type = 'payroll'`
     - `payroll_entry_id`, `payroll_period_id`, `member_id`
     - `cost_category = 'direct_labor'`
     - `payment_status = 'pending'`
2. Cuando se paga Previred del periodo:
   - Crear expense con `expense_type = 'supplier'`, supplier = "Previred"
   - `cost_category = 'direct_labor'`
   - Periodo vinculado para trazabilidad
3. Eliminar tab "Nomina" y "Prevision" del drawer manual

### Fase 4 — Actualizacion de constantes y validacion

1. Actualizar `EXPENSE_TYPES` en `src/lib/finance/shared.ts`:
   - Mantener compatibilidad transicional con `payroll` y `social_security` mientras existan rows legacy, APIs y vistas que los consumen
   - Evaluar si `tooling` vive como `expense_type` nuevo o como categoría/tab visible sobre `supplier`; no cortar compatibilidad antes del slice reactivo de `TASK-183`
   - Mantener: `supplier`, `tax`, `miscellaneous`
2. Agregar constante `EXPENSE_CATEGORIES` con las categorias por tab
3. Actualizar `auto-allocation-rules.ts` para considerar `direct_overhead_scope` del drawer
4. Verificar que `ExpensesListView.tsx` renderiza las nuevas categorias correctamente

## Categorias de gasto propuestas (constantes)

```typescript
// Por tab
export const EXPENSE_CATEGORIES = {
  operational: [
    'professional_services',     // Contabilidad, legal, auditoria
    'external_production',       // Freelancers, estudios, imprentas
    'office_space',              // Arriendo, servicios basicos, gastos comunes
    'equipment',                 // Laptops, monitores, mobiliario
    'media_advertising',         // Meta Ads, Google Ads (pass-through)
    'own_marketing',             // Publicidad propia, eventos, branding
    'travel_representation',     // Pasajes, hospedaje, alimentacion
    'insurance',                 // Seguros varios
  ],
  tooling: [
    'saas_license',              // Figma, Adobe, Slack, Claude, etc.
    'cloud_hosting',             // GCP, AWS, Vercel, dominios
    'hardware_peripherals',      // Computadores, monitores, perifericos
  ],
  tax: [
    'iva_mensual',               // F29
    'ppm',                       // Pagos provisionales mensuales
    'renta_anual',               // F22
    'patente_municipal',         // Patente comercial
    'retencion_honorarios',      // Boletas de honorarios
    'contribuciones',            // Contribuciones de bienes raices
  ],
  other: [
    'bank_fees',                 // Comisiones bancarias
    'interest',                  // Intereses
    'fines_surcharges',          // Multas, recargos
    'donations',                 // Donaciones
    'uncategorized',             // Sin categoria
  ],
} as const
```

## Blast Radius

### Archivos de alto impacto

| Archivo | Cambio |
|---------|--------|
| `src/views/greenhouse/finance/drawers/CreateExpenseDrawer.tsx` | Reescritura completa: nuevas tabs, campos de imputacion, recurrencia, sinergia tooling |
| `src/lib/finance/shared.ts` | Actualizar `EXPENSE_TYPES`, agregar `EXPENSE_CATEGORIES` |
| `src/app/api/finance/expenses/route.ts` | Validar nuevos campos, auto-detectar sinergia tooling |
| `src/app/api/finance/expenses/meta/route.ts` | Incluir categorias, tools vinculados |

### Archivos de impacto medio

| Archivo | Cambio |
|---------|--------|
| `src/views/greenhouse/finance/ExpensesListView.tsx` | Renderizar nuevas categorias, colores por tipo |
| `src/lib/finance/auto-allocation-rules.ts` | Considerar `direct_overhead_scope` para proration |
| `src/lib/ai-tools/tool-cost-reader.ts` | Conectar con expenses que tengan `direct_overhead_kind = 'tool_license'` |
| `src/app/api/finance/expenses/payroll-candidates/route.ts` | Mantener para backward compat, marcar deprecated |

### Archivos de bajo impacto

| Archivo | Cambio |
|---------|--------|
| `src/views/greenhouse/finance/ClientDetailView.tsx` | Verificar que expenses por cliente siguen resolviendo |
| `src/lib/finance/postgres-store-intelligence.ts` | Verificar metricas con nuevas categorias |

## Risks

1. **Backward compatibility** — expenses existentes con `expense_type = 'payroll'` o `'social_security'` deben seguir renderizando correctamente. No borrar tipos, solo dejar de exponerlos en el drawer
2. **Automatizacion Nomina** — requiere que el outbox/event system opere sobre `payroll_period.exported`. Si no existe ese carril, la Fase 3 no puede activarse
3. **Previred como proveedor** — debe existir en el maestro de proveedores. Verificar si ya esta registrado o crearlo en seed
4. **AI Tools sinergia** — depende de que `ai_tool_catalog.fin_supplier_id` este poblado. Auditar cobertura actual
5. **Migration de datos** — expenses existentes tipo `social_security` necesitan mapeo a `supplier` con proveedor Previred retroactivamente (o aceptar que coexistan)

## Dependencies & Impact

- **Depende de:** El schema actual cubre la mayor parte del rediseño UX/imputación, pero tenant isolation por `space_id` y el hardening de origen/rails quedan coordinados con `TASK-183`
- **Depende de:** Outbox event system operativo (para Fase 3 — automatizacion Nomina)
- **Depende de:** `ai_tool_catalog.fin_supplier_id` poblado (para Fase 2 — sinergia Tooling)
- **Impacta a:** TASK-174 (data integrity — validaciones en nuevos campos), TASK-176 (labor provisions — Previred como expense), TASK-177 (P&L por BU — categorias de gasto en breakdown)
- **Archivos owned:**
  - `src/views/greenhouse/finance/drawers/CreateExpenseDrawer.tsx`
  - `src/app/api/finance/expenses/meta/route.ts`
  - `src/lib/finance/shared.ts` (constantes de expense)

# TASK-620.3 — Service Module Composer with Native Nesting (composer recursivo depth 3 + cycle detection + constraints UI nesting-aware)

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Muy Alto`
- Effort: `Alto` (~4 dias)
- Type: `implementation`
- Epic: `none` (RESEARCH-005 P2 Bloque D)
- Status real: `Diseno cerrado v1.8 — absorbe TASK-627`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `TASK-620, TASK-620.1, TASK-620.1.1, TASK-620.2, TASK-630`
- Branch: `task/TASK-620.3-service-module-composer-native-nesting`
- Legacy ID: `RESEARCH-005 P2 + TASK-627 absorbida`
- GitHub Issue: `none`

## Summary

Reemplazar el editor actual de service modules con un composer visual tipo arbol drag-and-drop que soporta **nesting nativo desde dia 1** (depth max 3, cycle detection enforced). Permite componer un service module con: roles, tools, artifacts, sub-services. Constraint rules en TS declarativo se ejecutan en tiempo real con suggested fixes. Reusa `<GreenhouseRichTextEditor>` (TASK-630) para la descripcion del service. **TASK-627 (service nesting) queda absorbida en esta task** — el composer es nesting-ready desde la primera version.

## Why This Task Exists

Tras conversacion 2026-04-25 con owner se confirmo que servicios anidados son **definitivamente necesarios** para el modelo de Efeonce (ej. "Brand Launch Premium" = Brand Foundation + Content Production + Launch Campaign + components directos). La decision robust + escalable es construir el composer **una vez** con soporte nesting nativo, no agregar nesting como upgrade posterior (que costaria 3-4 dias extra de refactor).

Adicionalmente, el modelo del catalogo ahora tiene 4 dimensiones (roles + tools + artifacts + sub-services). Sin un composer visual, el operator no puede componer servicios complejos sin SQL manual.

## Goal

- Componente `<ServiceModuleComposer>` visual con drag-and-drop tipo arbol
- Soporta los 4 tipos de componentes: roles, tools, artifacts, sub-services
- Nesting nativo: sub-service expandible inline, depth max 3 enforced en UI + backend
- Cycle detection: UI rechaza inmediatamente intentos de crear ciclos (consulta `service_module_has_cycle` antes de save)
- Constraint rules registry ejecutado en cada cambio con suggested fixes auto-applicable
- Override pricing pct per child sub-service (ej. "Brand Premium incluye Brand Foundation con -15%")
- Optional flag per componente
- Editor de descripcion del module reusa `<GreenhouseRichTextEditor>`
- Mismo composer usable en 2 contextos (catalog mode + ad-hoc mode preparado para TASK-620.5)

## Architecture Alignment

- `docs/architecture/GREENHOUSE_SELLABLE_CATALOG_V1.md` (TASK-620)
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/research/RESEARCH-005-cpq-gap-analysis-and-hardening-plan.md` Delta v1.8 (Bloque D)
- Skill `greenhouse-ux` para UX consistency

Reglas obligatorias:

- depth max 3 enforced tanto UI como DB (trigger ya existe en TASK-620)
- cycle detection en write (trigger DB) + en UI antes de submit (UX-friendly error)
- override_pricing_pct rango -100 a 100
- snapshot del bundle al guardar quote: cambios futuros del module no afectan quotes historicos
- constraint rules ejecutadas en client-side con cada cambio + server-side antes de persistir
- accesibility WCAG 2.2 AA: keyboard navigation del arbol, ARIA tree role, screen reader announcements

## Dependencies & Impact

### Depends on

- **`TASK-620`** (sellable_tools, sellable_artifacts, service_module_children, has_cycle function)
- **`TASK-620.1`** (sellable_tools poblada via backfill)
- **`TASK-620.1.1`** (partner attribution snapshot al agregar tool)
- **`TASK-620.2`** (sellable_artifacts seedeada + service_artifact_recipe)
- **`TASK-630`** (GreenhouseRichTextEditor)
- `@formkit/drag-and-drop` (instalado, no usado aun — primera adopcion)
- `service-catalog-constraints.ts` (existe, framework base)

### Blocks / Impacts

- **`TASK-620.4`** (quote builder picker) — usa picker de los 4 catalogos
- **`TASK-620.5`** (ad-hoc bundle modal) — reusa el composer en mode='ad-hoc'
- TASK-624 (renewal engine) — necesita service modules estables
- TASK-628 (amendment) — amendments operan sobre service module composition
- TASK-027 (HRIS Document Vault) — futuro: composer reusable para contracts

### Files owned

- `src/components/greenhouse/composers/ServiceModuleComposer.tsx` (nuevo, principal)
- `src/components/greenhouse/composers/ServiceCompositionTree.tsx` (nuevo)
- `src/components/greenhouse/composers/ServiceComponentRow.tsx` (nuevo)
- `src/components/greenhouse/composers/ServiceComponentPicker.tsx` (nuevo, autocomplete a 4 catalogos)
- `src/components/greenhouse/composers/ServiceCompositionToolbar.tsx` (nuevo)
- `src/components/greenhouse/composers/ConstraintViolationsPanel.tsx` (nuevo)
- `src/lib/commercial/service-constraints/registry.ts` (nuevo, registry tipado)
- `src/lib/commercial/service-constraints/predicates.ts` (nuevo)
- `src/lib/commercial/service-catalog-store.ts` (modificado: save composition transactional)
- `src/app/api/commercial/service-modules/[id]/composition/route.ts` (nuevo)
- `src/app/api/commercial/service-modules/[id]/validate-composition/route.ts` (nuevo)
- `src/views/greenhouse/admin/service-catalog/ServiceModuleDetailView.tsx` (modificado: usa composer)
- `src/components/greenhouse/composers/__tests__/*` (tests)

## Current Repo State

### Already exists

- `service_modules`, `service_role_recipe`, `service_tool_recipe` tables
- `service_artifact_recipe` (TASK-620.2)
- `service_module_children` + cycle detection (TASK-620)
- `service-catalog-constraints.ts` (framework basico, sin registry tipado)
- Admin UI legacy con form simple para service module (sin composer visual)
- `@formkit/drag-and-drop` instalado

### Gap

- Sin composer visual nesting-aware
- Constraint registry no tiene tipos formales ni suggested fixes
- Picker de componentes no existe (ninguna UI permite buscar en los 4 catalogos)
- Cycle detection solo server-side (UX-hostile)
- Override pricing per child no editable
- Optional flag no editable

## Scope

### Slice 1 — Constraint registry tipado (0.5 dia)

`src/lib/commercial/service-constraints/registry.ts`:

```typescript
export type ConstraintScope =
  | 'within_service'           // valida solo el module en cuestion
  | 'within_subservice'        // valida cada sub-service por separado
  | 'cross_subservice'         // valida combinacion entre sub-services del mismo parent
  | 'whole_tree'               // valida todo el arbol resuelto
  | 'business_line'            // valida segun business_line del module

export type ConstraintResult =
  | { valid: true }
  | { valid: false; message: string; severity: 'error' | 'warning'; suggestedFix?: SuggestedFix }

export type SuggestedFix =
  | { type: 'add_role'; roleSku: string; reason: string }
  | { type: 'add_tool'; toolSku: string; reason: string }
  | { type: 'add_artifact'; artifactSku: string; reason: string }
  | { type: 'remove_component'; componentId: string; reason: string }
  | { type: 'merge_duplicates'; componentIds: string[]; reason: string }
  | { type: 'increase_quantity'; componentId: string; newQuantity: number; reason: string }

export interface ServiceConstraint {
  id: string
  description: string
  scope: ConstraintScope
  appliesTo: { businessLine?: string; serviceCategory?: string; minDepth?: number }
  version: string                  // permite versionar reglas (quotes historicos validos para version vigente al momento)
  validate: (composition: ServiceComposition) => ConstraintResult
}

export const SERVICE_CONSTRAINTS: ServiceConstraint[] = [
  // ...registry de reglas
]
```

`src/lib/commercial/service-constraints/predicates.ts` — predicates reusables: `hasRole(category)`, `hasTool(sku)`, `countByCategory(category)`, etc.

10 constraint rules iniciales:

| ID | Scope | Description |
|---|---|---|
| `figma-required-with-designer` | within_service | Senior Designer requires Figma seat |
| `pm-required-with-multiple-roles` | within_service | If >= 4 roles, requires Project Manager |
| `analytics-tool-with-strategy-lead` | within_service | Strategy Lead requires analytics tool (Mixpanel/Amplitude/GA4) |
| `no-duplicate-tool-cross-subservices` | cross_subservice | Same tool in 2+ sub-services should be merged |
| `pm-required-multiple-subservices` | whole_tree | If parent has >= 3 sub-services, requires Project Manager in direct components |
| `senior-lead-deep-nesting` | whole_tree | If depth reaches 3, requires Account Lead × >=10h |
| `tool-license-quantity-floor` | within_service | Per_seat tools cant have qty < 1 |
| `artifact-priced-needs-budget` | within_service | Priced artifact > $10K USD requires Account Lead approval flag |
| `business-line-mismatch-warning` | business_line | Components from different business_lines triggers warning (not error) |
| `optional-cant-be-mandatory-only` | within_service | If all components are optional, at least 1 must be mandatory |

### Slice 2 — Composer principal (1.5 dias)

`<ServiceModuleComposer>`:

```typescript
interface ServiceModuleComposerProps {
  mode: 'catalog' | 'ad-hoc' | 'edit-existing'    // diferente comportamiento de save
  initialComposition?: ServiceComposition          // null si nueva
  serviceModuleId?: string                         // null si ad-hoc
  onSave: (composition: ServiceComposition) => Promise<void>
  onCancel?: () => void
  readonly?: boolean
}

interface ServiceComposition {
  module: {
    moduleId?: string  // null si ad-hoc
    serviceSku?: string
    name: string
    description?: string
    descriptionRichHtml?: string
    businessLineCode?: string
    serviceCategory?: string
    tier?: number
    commercialModel?: 'on_going' | 'on_demand' | 'hybrid' | 'license_consulting'
    defaultDurationMonths?: number
  }
  components: {
    roles: Array<{ roleId: string; hoursPerPeriod: number; quantity: number; isOptional: boolean; notes?: string }>
    tools: Array<{ toolId: string; quantity: number; isOptional: boolean; passThrough: boolean; overridePriceClp?: number; overridePriceUsd?: number; notes?: string }>
    artifacts: Array<{ artifactId: string; quantity: number; isOptional: boolean; overridePriceClp?: number; overridePriceUsd?: number; notes?: string }>
    children: Array<{ childModuleId: string; quantity: number; isOptional: boolean; overridePricingPct?: number; notes?: string }>
  }
}
```

Layout:

```
┌─ Service Module Composer ────────────────────────────────┐
│                                                           │
│ ┌─ Module info ──────────────────────────────────────┐   │
│ │ SKU: [auto-gen]   Name: [_____________]            │   │
│ │ Business line: [▼]   Tier: [1-4]                   │   │
│ │ Commercial model: [▼ on_going]                     │   │
│ │ Default duration: [12 meses ▼ Personalizado]      │   │
│ │ Description:                                       │   │
│ │ ┌───────────────────────────────────────────────┐  │   │
│ │ │ [GreenhouseRichTextEditor toolbar='extended']  │  │   │
│ │ └───────────────────────────────────────────────┘  │   │
│ └────────────────────────────────────────────────────┘   │
│                                                           │
│ ┌─ Composition tree ─────────────────────────────────┐   │
│ │ <ServiceCompositionTree />                          │   │
│ └────────────────────────────────────────────────────┘   │
│                                                           │
│ ┌─ Constraint violations ───────────────────────────┐    │
│ │ <ConstraintViolationsPanel />                      │    │
│ │ ⚠ "PM required when 4+ roles" [Aplicar fix]        │    │
│ └────────────────────────────────────────────────────┘   │
│                                                           │
│              [Cancelar]  [Guardar borrador]  [Publicar]  │
└──────────────────────────────────────────────────────────┘
```

### Slice 3 — Composition tree con drag-and-drop nesting (1 dia)

`<ServiceCompositionTree>` usa `@formkit/drag-and-drop`:

```typescript
const tree = (
  <Tree>
    {/* Root: components directos */}
    <TreeNode label="Components directos" icon="package">
      {composition.components.roles.map(r => <ServiceComponentRow key={r.roleId} type="role" data={r} />)}
      {composition.components.tools.map(t => <ServiceComponentRow key={t.toolId} type="tool" data={t} />)}
      {composition.components.artifacts.map(a => <ServiceComponentRow key={a.artifactId} type="artifact" data={a} />)}
    </TreeNode>

    {/* Sub-services (depth 1) */}
    <TreeNode label="Sub-services" icon="folder">
      {composition.components.children.map(c =>
        <SubServiceNode
          key={c.childModuleId}
          child={c}
          depth={1}
          maxDepth={3}
          onExpand={() => loadChildComposition(c.childModuleId)}
        />
      )}
    </TreeNode>

    {/* Toolbar: agregar nuevo */}
    <ServiceCompositionToolbar
      onAddRole={() => openPicker('role')}
      onAddTool={() => openPicker('tool')}
      onAddArtifact={() => openPicker('artifact')}
      onAddSubService={() => openPicker('service_module')}
    />
  </Tree>
)
```

`<SubServiceNode>` se renderiza recursivamente (depth limit enforced):

- Si `depth < maxDepth`: muestra "Expandir" para cargar la composition del child
- Si `depth === maxDepth`: muestra info del sub-service pero no permite expandir (UI tooltip "Max nesting depth alcanzada")

`<ServiceComponentRow>`:

- Drag handle a la izquierda
- Icon segun tipo (👤 role, 🔧 tool, 📦 artifact, 📂 sub-service)
- Label + qty input + override price input + optional toggle + delete button
- ARIA labels para screen readers

### Slice 4 — Picker de componentes (0.5 dia)

`<ServiceComponentPicker>`:

```typescript
interface PickerProps {
  type: 'role' | 'tool' | 'artifact' | 'service_module'
  excludeIds?: string[]   // ej. excluir el module actual para evitar self-ref obvio
  onSelect: (componentId: string) => void
  onCancel: () => void
}
```

- `<Dialog>` con `<Autocomplete>` que busca en el catalogo correspondiente
- Para `service_module`: filtra excluyendo IDs que crearian ciclo (consulta `has_cycle` API antes de mostrar opciones)
- Muestra preview del componente seleccionado: nombre, SKU, pricing (si aplica), category
- Boton "Confirmar" agrega al composition

### Slice 5 — Constraint violations panel (0.25 dia)

`<ConstraintViolationsPanel>`:

- Muestra violaciones en tiempo real (recompute en cada cambio del composition)
- Cada violacion: severity icon + message + boton "Aplicar fix" si suggestedFix presente
- Color coding: errors rojos, warnings amarillos
- Si todo valid: muestra checkmark verde "Composicion valida"

### Slice 6 — Backend save endpoint + tests (0.25 dia)

`POST /api/commercial/service-modules/[id]/composition`:

- Body: `ServiceComposition` (sin module info, eso esta en `PATCH /service-modules/[id]`)
- Validation: cycle check + depth check + constraint registry server-side
- Transaction: borra recipe rows existentes, inserta nuevas
- Snapshot trigger: si hay quotes que usan este module en estado `pending_*` o `signed`, NO permite update (refactor solo en draft/exploratory)
- Audit log

`POST /api/commercial/service-modules/[id]/validate-composition`:

- Body: `ServiceComposition`
- Devuelve: `{ valid, violations[], warnings[] }`
- Usado por composer para validar antes de save

Tests:

- Composer renders correctly
- Drag-drop reorder
- Add component via picker
- Constraint violation con suggested fix
- Cycle detection rechaza UI before submit
- Depth limit enforced
- Save endpoint transactional + audit + snapshot block

## Out of Scope

- Quote builder direct picker (TASK-620.4)
- Ad-hoc bundle in quote modal (TASK-620.5 reusa ServiceModuleComposer en mode='ad-hoc')
- Renewal engine (TASK-624)
- AI-suggested constraint rules (futuro)
- Constraint rules editable via DB (TS declarativo es la decision; migracion a DSL es trivial si se requiere)

## Acceptance Criteria

- [ ] composer visual funcional para 4 tipos de componentes
- [ ] nesting nativo: depth max 3 enforced en UI + backend
- [ ] cycle detection: UI rechaza ciclos antes de submit + backend backup via trigger
- [ ] constraint registry con 10 reglas iniciales testeadas
- [ ] suggested fixes auto-applicables desde panel de violations
- [ ] override_pricing_pct editable per child
- [ ] optional flag editable per component
- [ ] reuse de `<GreenhouseRichTextEditor>` para descripcion
- [ ] picker autocomplete a los 4 catalogos
- [ ] save endpoint transactional + audit
- [ ] snapshot block: no permite editar composition de module en pending_signature quotes
- [ ] WCAG 2.2 AA: keyboard navigation, ARIA tree role, screen reader announces violations
- [ ] tests passing
- [ ] aplicado en staging + prod despues de QA dev

## Verification

- `pnpm tsc --noEmit` clean
- `pnpm lint` clean
- `pnpm test` clean
- Manual QA: crear "Brand Launch Premium" con 3 sub-services + 2 components directos
- Verificar cycle prevention: intentar agregar Brand Launch Premium como child de Brand Foundation Pkg → UI rechaza
- Verificar depth limit: intentar 4to nivel → UI bloquea
- Verificar constraint: agregar Senior Designer sin Figma → muestra violation con fix "Agregar Figma seat" → click → agregado

## Closing Protocol

- [ ] `Lifecycle` y carpeta sincronizados
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` actualizado con video del composer en accion
- [ ] `docs/architecture/GREENHOUSE_SELLABLE_CATALOG_V1.md` actualizado seccion "Composer + Nesting Rules"
- [ ] `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` actualizado seccion "Composers"
- [ ] `docs/documentation/admin-center/composer-servicios.md` (nuevo) explica feature al operador
- [ ] TASK-627 marcada como `cancelled` con nota "absorbida en TASK-620.3 v1.8"

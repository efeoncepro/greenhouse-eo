# TASK-168 — Person Detail View: Enterprise Redesign

**Status:** to-do
**Priority:** High
**Module:** People
**Estimated phases:** 4 (incrementally deployable)

---

## Objetivo

Rediseño completo de la vista de detalle de persona (`/people/:slug`) siguiendo patrones enterprise-grade 2026: horizontal profile header, tabs consolidados (9 → 5), progressive disclosure con accordions, role-based experience, y WCAG 2.2 AA compliance.

## Motivación

La vista actual presenta múltiples problemas de UX, accesibilidad y escalabilidad:

1. **Sidebar overloaded** — 7 secciones apiladas verticalmente (perfil, stats, contacto, integraciones, identidad, compensación, admin) consumen 40% del ancho sin valor proporcional
2. **Tab overflow** — 9 tabs horizontales causan scroll con flechas; el usuario no ve todos los tabs disponibles
3. **Information architecture rota** — "Identidad" tab contiene perfil HR + actividad operativa (dos dominios no relacionados); Compensación duplicada en sidebar Y en tab
4. **Campos vacíos desperdician espacio** — "Perfil laboral" muestra 8 campos con "—" en la mayoría
5. **Sin progressive disclosure** — toda la información se muestra a la vez sin jerarquía
6. **Accessibility gaps** — integraciones usan solo ✓/✗ sin texto, stats sin labels adecuados, tab arrows difíciles de descubrir

## Research Validación (Enterprise UX 2026)

Patrones validados con investigación de industria:

| Patrón | Fuente | Validación |
|--------|--------|-----------|
| Horizontal header > sidebar | [Pencil & Paper Dashboard UX](https://www.pencilandpaper.io/articles/ux-pattern-analysis-data-dashboards) | Top-rail layout maximiza content area; sidebar es para multi-role deep navigation |
| Progressive disclosure | [FuseLab Enterprise UX 2026](https://fuselabcreative.com/enterprise-ux-design-guide-2026-best-practices/) | "Carefully sequencing when users encounter features" — estándar enterprise 2026 |
| Role-based experience | [Hashbyt Enterprise UI 2026](https://hashbyt.com/blog/enterprise-ui-design) | "Meaningfully different interfaces based on what user actually does" |
| Accordion + tabs combo | [Design for Ducks](https://designforducks.com/alternative-for-tabs-in-ui-design/) | Tabs para secciones al mismo nivel; accordions para disclosure dentro de tabs |
| WCAG 2.2 AA accordion pattern | [TheWCAG Accordion Guide](https://www.thewcag.com/examples/accordions) | `role="button"` + `aria-expanded` + `aria-controls` en headers |
| Command palette / quick actions | [SaaSUI Trends 2026](https://www.saasui.design/blog/7-saas-ui-design-trends-2026) | "Standard expectation in any SaaS with 10+ features" |

---

## Arquitectura propuesta

### Layout: Sidebar → Full-Width Header

```
ANTES                                DESPUÉS
┌──────┬────────────┐               ┌────────────────────────┐
│      │            │               │  PROFILE HEADER        │
│ Side │   Tabs     │               │  Avatar + Info + KPIs  │
│ bar  │   Content  │               ├────────────────────────┤
│      │            │               │  [5 Tabs]              │
│      │            │               ├────────────────────────┤
│      │            │               │  Full-width content    │
│      │            │               │                        │
└──────┴────────────┘               └────────────────────────┘
```

### Tabs: 9 → 5

| Tab nuevo | Absorbe | Icon |
|-----------|---------|------|
| **Perfil** | Identity + HR Profile + Integrations | `tabler-user` |
| **Actividad** | Activity + Intelligence | `tabler-chart-dots` |
| **Organizaciones** | Memberships (sin cambios) | `tabler-building` |
| **Economía** | Compensation + Payroll + Finance | `tabler-wallet` |
| **Herramientas** | AI Tools (condicional) | `tabler-wand` |

### Sidebar redistribution

| Sección sidebar actual | Destino nuevo |
|------------------------|---------------|
| Avatar + Name + Role | Profile Header (horizontal) |
| FTE / Hrs / Spaces | Profile Header como CardStatsSquare pills |
| Contacto (email, Teams) | Profile Header metadata inline |
| Integraciones status | Profile Header como CustomChip row |
| "Sin categoría" chip | Eliminado (usar role category o no mostrar si vacío) |
| Compensación | Economía tab (primer card) |
| Identity (eoId) | Perfil tab (accordion "Identidad y acceso") |
| Admin actions | Profile Header OptionMenu dropdown (⚙) |

---

## Especificación por componente

### 1. Profile Header

**Reemplaza:** `PersonLeftSidebar.tsx` + grid layout en `PersonView.tsx`
**Nuevo componente:** `PersonProfileHeader.tsx`

```
Card elevation=0, border=divider
└─ CardContent py=5 px=6
   └─ Stack direction="row" (column on mobile)
      ├─ LEFT: Avatar (80px) + Name (h5) + Role + Email + Integration chips
      ├─ CENTER: 4x CardStatsSquare (FTE, Hrs/mes, Spaces, OTD%)
      └─ RIGHT: Status chip + OptionMenu (admin actions)
```

**Integration chips:**
- Linked: `CustomChip size="small" variant="tonal" color="success" icon="tabler-check"` + nombre
- Unlinked: `CustomChip size="small" variant="tonal" color="secondary"` + nombre

**Admin OptionMenu:**
- "Editar perfil" → abre `EditProfileDrawer`
- "Editar compensación" → abre `CompensationDrawer`
- divider
- "Desactivar" (color error) → abre `ConfirmDialog`

**Responsive:**
- xs: Stack vertical, avatar centrado, KPIs en grid 2x2
- sm: Avatar + info izquierda, KPIs derecha (wrap)
- md+: Single row horizontal

### 2. Tab Navigation

**Modifica:** `PersonTabs.tsx` + `helpers.ts`

```typescript
// Nuevo TAB_CONFIG (5 tabs)
const TAB_CONFIG = [
  { value: 'profile', label: 'Perfil', icon: 'tabler-user' },
  { value: 'activity', label: 'Actividad', icon: 'tabler-chart-dots' },
  { value: 'memberships', label: 'Organizaciones', icon: 'tabler-building' },
  { value: 'economy', label: 'Economía', icon: 'tabler-wallet' },
  { value: 'ai-tools', label: 'Herramientas', icon: 'tabler-wand' }
]
```

**Role-based default tab:**
- `hr_payroll` / `finance_manager` → default "Economía"
- `efeonce_operations` → default "Actividad"
- `efeonce_admin` → default "Perfil"

### 3. Perfil Tab

**Nuevo componente:** `PersonProfileTab.tsx`
**Absorbe:** `PersonIdentityTab.tsx` + `PersonHrProfileTab.tsx`

Tres secciones como Accordion cards:

1. **Datos laborales** (defaultExpanded)
   - Grid 3 columnas: departamento, nivel de cargo, tipo de empleo, tipo de contrato, fecha ingreso, supervisor
   - **Solo renderizar campos con valor** — omitir campos vacíos del DOM
   - Caption uppercase para labels, body2 fontWeight=600 para valores

2. **Identidad y acceso** (collapsed)
   - EO ID, auth mode, último login, roles activos (chips), route groups (chips)
   - Botones tonal: "Ver perfil HR completo", "Gestionar acceso"

3. **Actividad operativa** (collapsed)
   - 4x CardStatsSquare: Proyectos activos, Tareas activas, Completadas 30d, Vencidas
   - Métricas texto: RpA 30d, Entrega a tiempo, Empresas CRM, Deals activos

### 4. Actividad Tab

**Ya rediseñado:** `PersonActivityTab.tsx` (commit 511ef8f8)

Agregar sección adicional:

- **Inteligencia operativa** (Accordion, collapsed) — contenido actual de `PersonIntelligenceTab.tsx`

### 5. Economía Tab

**Nuevo componente:** `PersonEconomyTab.tsx`
**Absorbe:** `PersonCompensationTab.tsx` + `PersonPayrollTab.tsx` + `PersonFinanceTab.tsx`

Tres secciones:

1. **Compensación actual** — Card con `borderLeft: 4px solid primary.main`
   - 4x CardStatsSquare: Base salary, Moneda, Régimen, Desde
   - Botón "Editar" (solo admin/hr)

2. **Historial de nómina** (Accordion, defaultExpanded)
   - TanStack table con sorting y pagination
   - Columnas: Período, Bruto, Deducciones, Líquido, Estado

3. **Costos operativos** (Accordion, collapsed)
   - Contenido actual de PersonFinanceTab

---

## Accessibility (WCAG 2.2 AA)

### Checklist obligatorio

- [ ] Todos los targets interactivos ≥ 24×24px
- [ ] Color nunca es el único indicador — paired con icon + texto
- [ ] Integration status: chip con texto + icon + color (no solo ✓/✗)
- [ ] Focus order = visual order (header → tabs → content)
- [ ] Charts con `<figure role="img" aria-label="...">` descriptivo
- [ ] Admin dropdown: `aria-label="Acciones de administración"`
- [ ] Accordion headers: `aria-expanded` + `aria-controls` + keyboard Enter/Space
- [ ] Tab panel: `role="tabpanel"` + `aria-labelledby`
- [ ] Heading hierarchy: h5 (name) → h6 (sections) — sin saltos
- [ ] Campos vacíos omitidos del DOM (no renderizados como "—")
- [ ] Status chips con icon + texto (Activo/Inactivo, no solo color)
- [ ] KPI cards anuncian frase completa: "FTE: 1.0"
- [ ] Modals/drawers trap focus, close on Escape, return focus

### Nuevos ARIA patterns

```html
<!-- Profile header -->
<article aria-label="Perfil de Daniela Ferreira, Design, Efeonce Team">

<!-- Integration chip -->
<span role="status">Notion: Conectado</span>

<!-- Accordion section -->
<button aria-expanded="true" aria-controls="panel-datos-laborales">
  Datos laborales
</button>
<div id="panel-datos-laborales" role="region" aria-labelledby="...">
```

---

## Dependencies & Impact

### Depende de
- `greenhouse_core.members` — datos del colaborador
- `greenhouse_core.providers` — integraciones
- `PersonDetail` type en `src/types/people.ts` — no cambia la API, solo la UI
- Activity tab redesign (ya implementado en commit 511ef8f8)

### Impacta a
- `TASK-011` (ICO Person 360) — el tab de actividad ya fue rediseñado
- `TASK-072` (Compensation Versioning UX) — compensación se mueve al tab Economía
- `TASK-116` (Sidebar Navigation Audit) — sidebar de persona se elimina

### Archivos owned
- `src/views/greenhouse/people/PersonView.tsx`
- `src/views/greenhouse/people/PersonLeftSidebar.tsx` → **eliminar**
- `src/views/greenhouse/people/PersonTabs.tsx`
- `src/views/greenhouse/people/PersonProfileHeader.tsx` → **nuevo**
- `src/views/greenhouse/people/tabs/PersonProfileTab.tsx` → **nuevo**
- `src/views/greenhouse/people/tabs/PersonEconomyTab.tsx` → **nuevo**
- `src/views/greenhouse/people/tabs/PersonActivityTab.tsx` (ya rediseñado)
- `src/views/greenhouse/people/tabs/PersonIdentityTab.tsx` → **absorber en ProfileTab**
- `src/views/greenhouse/people/tabs/PersonHrProfileTab.tsx` → **absorber en ProfileTab**
- `src/views/greenhouse/people/tabs/PersonCompensationTab.tsx` → **absorber en EconomyTab**
- `src/views/greenhouse/people/tabs/PersonPayrollTab.tsx` → **absorber en EconomyTab**
- `src/views/greenhouse/people/tabs/PersonFinanceTab.tsx` → **absorber en EconomyTab**
- `src/views/greenhouse/people/tabs/PersonIntelligenceTab.tsx` → **absorber en ActivityTab**
- `src/views/greenhouse/people/helpers.ts` (TAB_CONFIG, PersonTab type)
- `src/types/people.ts` (PersonTab union type)

---

## Implementation Phases

### Phase 1 — Profile Header (replace sidebar)
**Scope:** Crear `PersonProfileHeader.tsx`, eliminar `PersonLeftSidebar.tsx`, cambiar grid layout en `PersonView.tsx` de sidebar+content a full-width
**Impacto visual:** Alto — cambio inmediato de layout
**Backward-compatible:** Sí — misma data, diferente presentación

### Phase 2 — Tab consolidation (9 → 5)
**Scope:** Crear `PersonProfileTab.tsx` y `PersonEconomyTab.tsx`, actualizar `PersonTabs.tsx` y `helpers.ts`, actualizar `PersonTab` type
**Impacto visual:** Alto — elimina overflow, mejora navegación
**Backward-compatible:** Sí — URL params deben hacer redirect de tabs viejos a nuevos

### Phase 3 — Progressive disclosure (accordions)
**Scope:** Implementar Accordion sections dentro de ProfileTab y EconomyTab, ocultar campos vacíos, agregar Intelligence como accordion en ActivityTab
**Impacto visual:** Medio — interfaz más limpia
**Backward-compatible:** Sí

### Phase 4 — Accessibility audit + role-based defaults
**Scope:** ARIA attributes, keyboard navigation audit, role-based default tab, quick actions button
**Impacto visual:** Bajo — mejora de calidad
**Backward-compatible:** Sí

---

## Acceptance Criteria

- [ ] No existe sidebar izquierdo — toda la info está en header horizontal + tabs
- [ ] Máximo 5 tabs visibles, sin overflow ni flechas de scroll
- [ ] Campos vacíos no se renderizan (no "—" dashes)
- [ ] Compensación solo aparece en tab Economía, no duplicada
- [ ] Admin actions están en OptionMenu dropdown, no como botones prominentes
- [ ] Integration status usa chips con texto + icon + color
- [ ] Accordion sections permiten disclosure progresivo
- [ ] Todos los accordion headers tienen `aria-expanded` + keyboard support
- [ ] Tab default depende del rol del usuario logueado
- [ ] Vista responsive funciona en mobile (xs), tablet (sm) y desktop (md+)
- [ ] WCAG 2.2 AA checklist completo (ver sección Accessibility)

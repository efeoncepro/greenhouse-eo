# CODEX TASK — Rediseño de la Vista Admin de Space

## Resumen

La vista actual del detalle de Space en el admin (`/admin/spaces/[id]`) es un scroll infinito que mezcla lectura y edición sin jerarquía visual. Toda la información — business lines, service modules, governance, feature flags, tabs de configuración — está desplegada en una sola página con el mismo peso visual. El resultado parece un dump de datos, no una interfaz administrativa de Vuexy.

**Problema 1: Mezcla de lectura y edición.** La sección de governance manual (checkboxes de business lines + modules + botón "Guardar selección manual") ocupa ~50% de la pantalla y está siempre visible. Es una acción administrativa que se usa una vez y se guarda — no debería convivir con la lectura rápida del estado del space.

**Problema 2: No usa patrones Vuexy.** La vista actual tiene tablas con paginación innecesaria (5 de 5 entries), cards sobredimensionadas con demasiados badges, y secciones de governance que parecen formularios de configuración de servidor. Vuexy tiene cards con bordes sutiles, tablas compactas, stat cards y tabs.

**Problema 3: Jerarquía visual plana.** Todo tiene el mismo peso: business lines, modules, governance, feature flags. Un admin necesita ver el estado del space de un vistazo (stats arriba) y explorar por tabs.

**Esta tarea es puramente de presentación y layout.** No cambia la lógica de datos, los API endpoints, ni el modelo de governance. Solo reorganiza y limpia la UI.

---

## Contexto del proyecto

- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Branch de trabajo:** `fix/space-admin-redesign`
- **Framework:** Next.js 14+ (Vuexy Admin Template, starter-kit)
- **Package manager:** pnpm
- **UI Library:** MUI (Material UI) v5
- **Deploy:** Vercel (auto-deploy desde `main`, preview desde feature branches)
- **Documento normativo de nomenclatura:** `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`
- **Documento normativo de capabilities:** `docs/architecture/Greenhouse_Capabilities_Architecture_v1.md`
- **Documento normativo de colores:** `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`, sección 13-14 (GH_COLORS)

---

## Dependencias previas

Esta tarea NO tiene dependencias bloqueantes. Se puede ejecutar inmediatamente. Asume que:

- [x] La vista actual de Space admin ya existe y renderiza data (business lines, modules, governance, feature flags)
- [x] Los API endpoints que alimentan la vista ya funcionan
- [x] El sistema de tabs en la vista ya existe (Capabilities, Usuarios, CRM, Proyectos, Configuración)
- [x] El Brand Guideline y las fuentes (Poppins + DM Sans) están configuradas

---

## Arquitectura objetivo

La vista se reorganiza en 3 zonas verticales:

```
┌─────────────────────────────────────────────────────────────┐
│  ZONA 1: Header + Stats (above the fold)                     │
│  Identidad del space + acciones + 4 stat cards compactos     │
├─────────────────────────────────────────────────────────────┤
│  ZONA 2: Tab panel (contenido principal)                     │
│  5 tabs: Capabilities | Usuarios | CRM | Proyectos | Config │
│  Cada tab tiene su propio layout interno                     │
├─────────────────────────────────────────────────────────────┤
│  ZONA 3: Metadata compacta (footer del space)                │
│  Feature flags inline + info de governance                   │
└─────────────────────────────────────────────────────────────┘
```

---

## ZONA 1: Header + Stats

### 1.1 Space header card

Una sola card compacta con:

**Lado izquierdo:**
- Avatar del space (el cuadrado con la inicial que ya existe — mantener)
- Nombre del space + badge de estado (Active / Inactive)
- Metadata en texto secundario: Space ID, CRM mapping, Timezone

**Lado derecho:**
- Botón primario: "Ver como cliente" (ya existe — mantener funcionalidad)
- Botón secundario outline: "Guardar" (mantener funcionalidad del save actual)
- Botón icónico (tres puntos / more): menú con opciones secundarias (subir imagen, configurar, etc.)

**Reglas de diseño:**
- Altura máxima: ~80px. No debe ocupar más que eso.
- El avatar es 44x44px con border-radius 12px, fondo del color primario del space.
- El nombre es Poppins 500 16px. El metadata es DM Sans 400 12px `text.secondary`.
- Los badges de estado usan los colores de `GH_COLORS.semantic`: Active = success, Inactive = neutral.

```tsx
// Pseudocódigo de estructura
<Card sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2.5 }}>
  <Avatar variant="rounded" sx={{ width: 44, height: 44, borderRadius: '12px' }}>
    {space.name[0]}
  </Avatar>
  <Box sx={{ flex: 1 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography variant="h6">{space.name}</Typography>
      <Chip label="Active" size="small" color="success" />
    </Box>
    <Typography variant="caption" color="text.secondary">
      Space ID: {space.code} · CRM: {space.crmId || '—'} · Timezone: {space.timezone}
    </Typography>
  </Box>
  <Box sx={{ display: 'flex', gap: 1 }}>
    <Button variant="contained" size="small">Ver como cliente</Button>
    <Button variant="outlined" size="small">Guardar</Button>
    <IconButton size="small"><MoreVert /></IconButton>
  </Box>
</Card>
```

### 1.2 Stats row

Fila de 4 stat cards compactas debajo del header. Grid de 4 columnas iguales.

| Stat | Dato | Fuente |
|------|------|--------|
| Usuarios | `0 / 0` + "X invitados pendientes" | Conteo de usuarios del space |
| Business lines activas | `3` + "Activas para este space" | Conteo de BLs con estado Active |
| Service modules | `5` + "Habilitados en governance" | Conteo de modules activos |
| Proyectos | `57` + "Detectados en Notion" | Conteo de proyectos sincronizados |

**Patrón Vuexy a usar:** Stat cards tipo `CustomAvatar` + número + label. Ver `full-version/src/views/pages/widget-examples/statistics/` para el patrón exacto.

**Regla de diseño:**
- Background: `background.default` (surface sutil, no blanco). Sin borde.
- Número: Poppins 500 20px `text.primary`.
- Label: DM Sans 400 11px `text.secondary`.
- Border-radius: 8px.
- Padding: 12px 14px.

---

## ZONA 2: Tab panel

### 2.1 Estructura de tabs

5 tabs horizontales dentro de una card flush (card sin padding, con tab row como header):

| Tab | Contenido |
|-----|-----------|
| **Capabilities** | Business lines + Service modules + governance info |
| **Usuarios** | Lista de usuarios del space (tabla existente) |
| **CRM** | Información de HubSpot company mapping |
| **Proyectos** | Proyectos detectados en Notion |
| **Configuración** | Settings del space (timezone, imagen, etc.) |

**Patrón Vuexy a usar:** `TabContext` + `TabList` + `TabPanel` de MUI Lab. Tab activo con indicador azul (`#0375db`) en borde inferior. Texto inactivo en `text.secondary`, texto activo en `primary.main`.

```tsx
<Card sx={{ overflow: 'hidden' }}>
  <TabContext value={activeTab}>
    <TabList onChange={handleTabChange} sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 2.5 }}>
      <Tab label="Capabilities" value="capabilities" />
      <Tab label="Usuarios" value="users" />
      <Tab label="CRM" value="crm" />
      <Tab label="Proyectos" value="projects" />
      <Tab label="Configuración" value="settings" />
    </TabList>
    <TabPanel value="capabilities">
      {/* Contenido del tab Capabilities */}
    </TabPanel>
    {/* ... otros tabs */}
  </TabContext>
</Card>
```

### 2.2 Tab: Capabilities (contenido detallado)

El tab de Capabilities se organiza en 3 secciones internas:

#### Sección A: Business lines

**Layout:** Grid de 3 columnas. Una card compacta por cada business line **activa** (no mostrar las que están en `Available` — esas se ven solo en el drawer de edición).

Cada card de business line:
- Borde izquierdo de 3px con el color de la línea (ver `GH_COLORS.service`)
- Nombre de la línea: DM Sans 500 13px
- Badge de familia con color correspondiente (Globe = crimson, CRM Solutions = orchid, Wave = core blue)
- Código: font-mono 11px `text.tertiary` (ej: `EO-BL-GLOBE`)
- Badge de estado: "Active" con colores de `GH_COLORS.semantic.success`

**Colores de borde por línea (de GH_COLORS.service):**

| Línea | Color de borde | Hex |
|-------|---------------|-----|
| CRM Solutions | Orchid Purple | `#633f93` |
| Globe | Crimson Magenta | `#bb1954` |
| Wave | Core Blue | `#0375db` |
| Reach | Sunset Orange | `#ff6500` |
| Efeonce Digital | Deep Azure | `#023c70` |

**La card "Unknown" (EO-BL-UNKNOWN) NO se muestra** en la vista de lectura. Es un fallback interno que solo tiene sentido en el contexto de governance — se mantiene en el drawer de edición.

#### Sección B: Service modules

**Layout:** Tabla compacta sin paginación (los spaces típicos tienen 5-15 modules — no necesita paginación).

| Columna | Contenido | Ancho |
|---------|-----------|-------|
| Módulo | Nombre + descripción en texto secundario | flex: 1 |
| Código | Código en font-mono (`EO-SVC-*`) | 220px |
| Familia | Badge de color con nombre de la línea | 100px |
| Estado | Dot indicator (verde = activo, gris = disponible) | 60px, centered |

**Reglas de diseño:**
- Header row: Background `background.default`, font DM Sans 500 11px uppercase letter-spacing 0.5px `text.tertiary`.
- Rows: Padding 10px 20px, border-bottom 0.5px `divider`.
- Nombre del módulo: DM Sans 500 13px `text.primary`.
- Descripción: DM Sans 400 11px `text.tertiary`.
- Código: Font mono 11px `text.secondary`.
- **NO paginación.** Si hay más de 10 modules (raro), usar scroll interno dentro de la card con max-height.
- **NO barra de búsqueda.** Con 5-15 modules no tiene sentido.
- **NO dropdown de "mostrar X entries".** Siempre mostrar todos.

#### Sección C: Governance info

**Layout:** Info strip compacta (no un formulario desplegado).

- Un `Alert` de MUI con severity `info` y variant `standard` que muestra el estado actual de governance:
  - Si precedencia manual: "Precedencia manual activa — Las capabilities se gobiernan desde este panel."
  - Si sync automático desde HubSpot: "Sync automático — Las capabilities se sincronizan desde HubSpot Company [nombre]."
- Debajo del alert: chips informativos con Tenant ID y estado de registro de empresa.
- **Botón "Editar governance"** que abre un **Drawer** lateral (ver sección 2.3).

**Lo que desaparece de esta vista:**
- Los checkboxes de business lines con toggle activo/disponible
- Los checkboxes de service modules
- El resumen de "Capabilities activas del space" con contadores
- El botón "Guardar selección manual" de tamaño completo
- La sección duplicada de "Editar governance manual" que repetía la info de arriba

Todo eso se mueve al Drawer de governance.

### 2.3 Drawer de governance (nuevo)

**Componente:** MUI `Drawer` con `anchor="right"`, ancho de 480px.

Se abre al hacer click en "Editar governance" desde el tab Capabilities.

**Contenido del drawer:**

1. **Header del drawer:**
   - Título: "Editar governance" (Poppins 500 16px)
   - Botón de cerrar (IconButton con `Close`)
   - Divider

2. **Sección: Business lines**
   - Título de sección: "Business lines" (section-label pattern)
   - Lista de TODAS las business lines (activas + disponibles)
   - Cada línea con: checkbox + nombre + badge de código + badge de estado
   - El estado se puede togglear: Active ↔ Available

3. **Sección: Service modules**
   - Título de sección: "Service modules"
   - Lista de TODOS los modules
   - Cada module con: checkbox + nombre + badge de familia + badge de estado

4. **Sección: Registro de empresa**
   - Estado del company mapping
   - Si no hay mapping: info text + CTA para configurar

5. **Footer del drawer (sticky):**
   - Botón primario: "Guardar selección manual" (full width)
   - Texto secundario: "Los cambios se aplican inmediatamente al space."

**Regla clave:** El drawer contiene toda la funcionalidad de edición que antes estaba desplegada en la vista principal. La lógica de guardado es la misma — solo cambia la ubicación visual.

### 2.4 Tabs restantes (Usuarios, CRM, Proyectos, Configuración)

Estos tabs mantienen su contenido actual pero se envuelven en el `TabPanel` del nuevo sistema de tabs. No requieren rediseño en esta tarea — solo migración al tab container.

Si alguno de estos tabs ya tiene contenido implementado, moverlo al `TabPanel` correspondiente sin cambiar su layout interno.

Si algún tab no tiene contenido aún, mostrar un empty state:

```tsx
<Box sx={{ textAlign: 'center', py: 8 }}>
  <Typography variant="body2" color="text.secondary">
    Esta sección estará disponible próximamente.
  </Typography>
</Box>
```

---

## ZONA 3: Feature flags (inline compact)

**Layout:** Una card compacta debajo del tab panel principal.

- Lado izquierdo: título "Feature flags" (DM Sans 500 13px) + texto inline del estado ("Sin feature flags activos" o "X flags activos")
- Lado derecho: botón outline "Gestionar" que abre un modal o drawer con la lista de feature flags

**NO mostrar la lista completa de flags en la vista principal.** Solo el resumen compacto.

---

## Componentes Vuexy a reutilizar

| Necesidad | Componente Vuexy | Path en full-version |
|-----------|-----------------|---------------------|
| Stat cards compactas | CardStatVertical / CardStatsHorizontal | `src/views/pages/widget-examples/statistics/` |
| Tab system | TabContext + TabList + TabPanel | MUI Lab (ya incluido en Vuexy) |
| Drawer lateral | Drawer | `@mui/material/Drawer` |
| Table compacta | Table de MUI con custom styling | `src/views/apps/` (buscar patrones de tabla) |
| Alert info strip | Alert | `@mui/material/Alert` |
| Chip badges | Chip | `@mui/material/Chip` con custom colors |
| Dot indicator | `Box` styled como círculo de 6px | Componente inline |
| More menu | IconButton + Menu | `@mui/material/Menu` |

---

## Paleta de colores (de GH_COLORS)

Todos los colores referenciados en este documento vienen de `greenhouse-nomenclature.ts` (definido en `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`, sección 13).

**Regla:** Ningún color hex se escribe directamente en componentes. Todo referencia `GH_COLORS`. Si un color no existe en `GH_COLORS`, no se inventa — se escala en el documento de nomenclatura primero.

### Service line badges

```typescript
// De GH_COLORS.service
globe:           { source: '#bb1954', bg: '#f9ecf1', text: '#bb1954' }
efeonce_digital: { source: '#023c70', bg: '#eaeff3', text: '#023c70' }
reach:           { source: '#ff6500', bg: '#fff2ea', text: '#ff6500' }
wave:            { source: '#0375db', bg: '#eaf3fc', text: '#0375db' }
crm_solutions:   { source: '#633f93', bg: '#f2eff6', text: '#633f93' }
```

### Status badges

```typescript
// De GH_COLORS.semantic
success: { source: '#6ec207', bg: '#f3faeb', text: '#6ec207' }  // Active
warning: { source: '#ff6500', bg: '#fff2ea', text: '#ff6500' }  // Pending
info:    { source: '#0375db', bg: '#eaf3fc', text: '#0375db' }  // Info
```

---

## Tipografía (de Brand Guideline v1.0)

| Elemento | Font | Weight | Size |
|----------|------|--------|------|
| Nombre del space | Poppins | 500 | 16px |
| Stat numbers | Poppins | 500 | 20px |
| Tab labels | DM Sans | 500 (activo) / 400 (inactivo) | 13px |
| Section labels (uppercase) | DM Sans | 500 | 11px |
| Nombre de business line / module | DM Sans | 500 | 13px |
| Descripción / metadata | DM Sans | 400 | 11-12px |
| Código (EO-BL-*, EO-SVC-*) | JetBrains Mono / monospace | 400 | 11px |
| Badge text | DM Sans | 500 | 10-11px |
| Button text | DM Sans | 500 | 12-13px |

---

## Lo que se ELIMINA de la vista principal

Estos elementos se eliminan de la vista principal y se mueven al Drawer de governance o se eliminan completamente:

| Elemento | Acción |
|----------|--------|
| Grid de 4 business line cards (incluyendo "Unknown") | → Reemplazar por grid de 3 cards solo activas (sin Unknown) |
| Tabla de service modules con paginación "Showing 1 to 5 of 5 entries" | → Reemplazar por tabla compacta sin paginación |
| Dropdown "Buscar módulo" | → Eliminar (innecesario con 5-15 modules) |
| Dropdown "mostrar 8 entries" | → Eliminar |
| Sección "Editar governance manual" (toda) | → Mover al Drawer |
| Checkboxes de business lines con toggle | → Mover al Drawer |
| Checkboxes de service modules con toggle | → Mover al Drawer |
| Resumen "Capabilities activas del space: 3 BL, 5 modules, Pendiente" | → Integrar como stats en Zona 1 |
| Botón "Guardar selección manual" (versión grande en la página) | → Mover al Drawer footer |
| Sección "Regla de precedencia manual" desplegada | → Reducir a info strip |
| Card "Feature flags" de tamaño completo | → Reducir a inline compact |
| Texto "Sin company mapping" como sección separada | → Integrar como chip en governance info |

---

## Lo que NO cambia

- **Data sources y API endpoints.** El refactor es puramente de presentación.
- **La lógica de governance** (precedencia manual vs sync automático). Solo cambia dónde se visualiza y edita.
- **La funcionalidad de "Ver como cliente".** Mantener el botón y su behavior.
- **El sidebar de navegación admin.** No se toca.
- **Los otros tabs** (Usuarios, CRM, Proyectos, Configuración) mantienen su contenido actual — solo se envuelven en el nuevo tab system.

---

## Orden de ejecución sugerido

1. **Crear branch** `fix/space-admin-redesign` desde `develop`.
2. **Crear componente `SpaceHeader`:** Card compacta con avatar + nombre + badges + botones de acción.
3. **Crear componente `SpaceStats`:** Grid de 4 stat cards compactas.
4. **Crear sistema de tabs:** Envolver todo el contenido existente en un `TabContext` con 5 tabs.
5. **Refactorizar tab Capabilities:**
   a. Crear grid de business line cards compactas (sin Unknown).
   b. Crear tabla de service modules sin paginación.
   c. Crear info strip de governance.
6. **Crear `GovernanceDrawer`:** Drawer lateral con toda la funcionalidad de edición de governance.
   a. Mover lógica de checkboxes de BLs al drawer.
   b. Mover lógica de checkboxes de modules al drawer.
   c. Mover botón "Guardar selección manual" al footer del drawer.
7. **Crear card compacta de feature flags** debajo del tab panel.
8. **Migrar tabs existentes** (Usuarios, CRM, Proyectos, Config) al nuevo tab system.
9. **Eliminar componentes obsoletos** que ya no se usan (tabla paginada, sección de governance inline, etc.).
10. **Verificar responsive** en 1440px, 1024px y 768px.
11. **Verificar que "Ver como cliente" sigue funcionando.**
12. **Verificar que la lógica de guardado de governance funciona desde el Drawer.**

---

## Criterio de aceptación

### Estructura y layout

- [ ] La vista tiene 3 zonas visuales: Header+Stats, Tab panel, Feature flags compact.
- [ ] Header card: avatar + nombre + badge estado + metadata + 3 botones (Ver como cliente, Guardar, More).
- [ ] 4 stat cards en fila (Usuarios, BLs activas, Modules, Proyectos).
- [ ] 5 tabs funcionales con contenido correcto en cada uno.
- [ ] Tab Capabilities: grid de BL cards + tabla de modules + governance info strip.
- [ ] Grid de BLs muestra solo líneas activas (NO muestra Unknown).
- [ ] Tabla de modules sin paginación, sin barra de búsqueda, sin dropdown de entries.
- [ ] Governance info es un alert compacto + chips, NO un formulario desplegado.
- [ ] Botón "Editar governance" abre Drawer lateral de 480px.
- [ ] Drawer contiene checkboxes de BLs + checkboxes de modules + botón guardar.
- [ ] Feature flags es una card inline de una línea, no una sección completa.

### Elementos eliminados de la vista principal

- [ ] NO aparece la sección "Editar governance manual" en la página.
- [ ] NO aparecen checkboxes de business lines en la página.
- [ ] NO aparecen checkboxes de service modules en la página.
- [ ] NO aparece paginación en la tabla de modules.
- [ ] NO aparece barra de búsqueda de módulos.
- [ ] NO aparece dropdown de "mostrar X entries".
- [ ] NO aparece la card "Unknown" (EO-BL-UNKNOWN) en la vista de lectura.
- [ ] NO aparece el resumen de "Capabilities activas del space" como sección separada.

### Colores y tipografía

- [ ] Business line cards usan borde izquierdo con color de `GH_COLORS.service`.
- [ ] Badges de familia usan colores de `GH_COLORS.service` (bg + text).
- [ ] Badges de estado usan colores de `GH_COLORS.semantic`.
- [ ] Dot indicators: verde `#6ec207` para activo, gris para disponible.
- [ ] Todos los hex vienen de `GH_COLORS` en `greenhouse-nomenclature.ts`, no hardcoded.
- [ ] Poppins solo en: nombre del space (16px 500), stat numbers (20px 500).
- [ ] DM Sans en todo lo demás: tabs, labels, descripciones, badges, botones.
- [ ] Códigos (EO-BL-*, EO-SVC-*) en font-mono 11px.

### Funcionalidad

- [ ] "Ver como cliente" funciona igual que antes.
- [ ] Guardar governance desde el Drawer persiste los cambios.
- [ ] Toggle de BLs (Active ↔ Available) funciona en el Drawer.
- [ ] Toggle de modules funciona en el Drawer.
- [ ] Todos los tabs cargan su contenido correctamente.

### Responsive

- [ ] Desktop 1440px+: layout completo, 4 stat cards, 3 BL cards.
- [ ] Tablet 1024px: stat cards en 2x2 grid, BL cards en 2 columnas.
- [ ] Mobile 768px: stat cards stacked, BL cards stacked, drawer full-width.

---

## Notas para el agente

- **Lee `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md` completo** antes de empezar. Sección 13 (`GH_COLORS`) y sección 14 (Design tokens) son normativas para esta vista.
- **Lee `docs/tasks/to-do/CODEX_TASK_Typography_Hierarchy_Fix.md`** para las reglas de tipografía Poppins vs DM Sans.
- **Lee `docs/tasks/complete/CODEX_TASK_Client_Dashboard_Redesign.md`** para los patrones de stat cards, empty states y ghost slots — algunos aplican aquí.
- **Usa la full-version de Vuexy como referencia** para patrones de components. El starter-kit tiene menos ejemplos.
- **El Drawer es el componente más importante de esta tarea.** La mejora principal es mover la edición de governance a un drawer lateral, limpiando la vista de lectura.
- **No toques los API endpoints.** Si algo no carga, es un problema pre-existente — no intentes arreglarlo en esta tarea.
- **Branch naming:** `fix/space-admin-redesign` — es un fix de UI, no un feature nuevo.

---

*Efeonce Greenhouse™ • Efeonce Group • Marzo 2026*
*Documento técnico interno para agentes de desarrollo.*

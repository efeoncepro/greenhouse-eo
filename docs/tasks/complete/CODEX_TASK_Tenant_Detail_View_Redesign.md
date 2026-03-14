# CODEX TASK — Rediseño de la vista Tenant Detail (Admin View)

## Contexto

La ruta actual `/admin-tenants/[spaceId]` muestra el detalle de un tenant/space visto como admin de Efeonce. Es la vista donde el equipo interno gestiona todo lo que define la relación con un cliente: capabilities activas, usuarios, configuración comercial, contactos CRM, proyectos.

**Problema:** La vista actual es un scroll vertical infinito con todas las secciones al mismo nivel jerárquico. No hay priorización visual, no hay agrupación lógica, y la experiencia no refleja la calidad del producto Greenhouse.

**Objetivo:** Reestructurar esta vista usando componentes de Vuexy full-version para que un admin de Efeonce entienda el estado completo de una cuenta en 3 segundos, y pueda operar sobre cada sección sin perder contexto.

---

## Arquitectura de la vista

### 1. Header del tenant (siempre visible, no scrolleable dentro de tabs)

Un header compacto tipo "User Profile Header" de Vuexy (ver `full-version/src/views/pages/user-profile/`). Debe contener:

- **Logo/avatar del cliente** (placeholder con iniciales si no hay logo)
- **Nombre del tenant** (ej: "Sky Airline") con badge de estado (`active` verde, `inactive` gris, `onboarding` amarillo)
- **Fila de KPI cards inline** (4 métricas clave en una fila):
  - Usuarios activos / total invitados (ej: "0 / 16")
  - Business lines activas (ej: "1")
  - Proyectos scoped (ej: "1")
  - Service modules activos (ej: "1")
- **Acciones rápidas** a la derecha:
  - Botón "Ver como cliente" (ya existe, mantenerlo)
  - Botón "Guardar selección manual" (ya existe)
  - Dropdown con acciones secundarias (editar, desactivar space, etc.)
- **Metadata mínima** debajo del nombre: Space ID, CRM ID, Timezone, última lectura HubSpot — en texto pequeño gris, una sola línea.

**Referencia Vuexy full-version:** Buscar el patrón de `UserProfileHeader` o los headers de las vistas de eCommerce/CRM detail en `full-version/src/views/apps/`.

### 2. Navegación por Tabs (debajo del header)

Reemplazar el scroll vertical con un sistema de tabs. Usar el componente `TabContext`/`TabList`/`TabPanel` de MUI que Vuexy ya implementa (ver `full-version/src/views/pages/account-settings/` como referencia de patrón).

**Tabs propuestos:**

| Tab | Contenido | Icono sugerido |
|-----|-----------|----------------|
| **Capabilities** | Business lines + Service modules (governance) | `tabler-icons:puzzle` |
| **Usuarios** | Tabla de usuarios del space con resumen | `tabler-icons:users` |
| **CRM** | Contactos HubSpot + Configuración comercial + Lectura live | `tabler-icons:building` |
| **Proyectos** | Visibilidad de proyectos scoped | `tabler-icons:folder` |
| **Configuración** | Identidad del space, metadata técnica, notas operativas | `tabler-icons:settings` |

---

## Detalle por Tab

### Tab 1: Capabilities

Mantener la lógica actual de Business Lines + Service Modules pero mejorar la presentación:

- **Business Lines** como cards horizontales (no lista vertical). Cada card muestra: nombre, código (EO-BL-xxx), badge de estado (Available/HubSpot), chip de color por capability (Globe = `#7C3AED` violeta, Wave = `#0891B2` cyan, Reach = `#DC2626` rojo, CRM Solutions = según HubSpot palette).
- **Service Modules** como tabla compacta con columnas: nombre, código, tipo (Globe/Wave/Reach/CRM), estado. Usar `DataGrid` de Vuexy (ver `full-version/src/views/apps/invoice/list/`) para sorting y filtrado.
- **El alert amarillo** ("La edición manual tiene precedencia...") mantenerlo pero convertirlo en un `Alert` de MUI colapsable, no siempre visible.
- Eliminar el badge "Registro de empresa: Listo" si es redundante — o moverlo a la tab de Configuración.

### Tab 2: Usuarios

- **Resumen arriba** en 3 stat cards: Activos, Invitados (pending), Total. Usar las "Card Statistics" de Vuexy.
- **Tabla de usuarios** con `DataGrid` paginado (no scroll infinito como ahora). Columnas: Nombre, Email, Rol, Estado de acceso (badge), Scopes, Último login. Máximo 10 filas por página.
- **Acciones por fila:** menú contextual (3 dots) con: reenviar invitación, cambiar rol, desactivar.
- **Acción bulk arriba:** "Invitar usuario" button, "Reenviar todas las invitaciones pendientes".

**Referencia Vuexy:** `full-version/src/views/apps/user/list/` tiene exactamente este patrón con DataGrid, filtros y acciones.

### Tab 3: CRM

Reorganizar las 3 secciones actuales (Contactos CRM, Configuración comercial, Lectura HubSpot) en un layout coherente:

- **Configuración comercial** arriba, en un card compacto tipo key-value: Business line (Efeonce Digital / Globe / etc.), Service modules, Pasture (badge de color). Esto es info estática, no necesita mucho espacio.
- **Contactos CRM** debajo, con la tabla de contactos de HubSpot. Pero con 4 tabs internos (Contacto, Cuerpo, Ciclo, Proveedor) que ya existen — mantener esa estructura. **Importante:** el mensaje de error rojo ("The operation was aborted...") NUNCA debe mostrarse en crudo. Implementar un error boundary que muestre un mensaje amigable tipo "No se pudieron cargar los contactos CRM. Reintentando..." con un botón de retry.
- **Lectura HubSpot** como un card colapsado por defecto (acordeón). Solo se expande si el admin quiere ver el detalle técnico del sync. Dentro: Company profile, Owner, HubSpot ID, última lectura, botones de sync. Esto es info de debugging operativo, no necesita visibilidad prominente.

### Tab 4: Proyectos

- Tabla de proyectos scoped con: nombre, ID, cantidad de usuarios asignados, estado.
- Si solo hay 1-3 proyectos, mostrar como cards en vez de tabla.
- Acción: "Agregar proyecto al scope".

### Tab 5: Configuración

Agrupar aquí toda la metadata técnica y operativa:

- **Identidad del space:** Space ID, Internal key, Proyecto CRM, HubSpot company ID, Tenant HubSpot company.
- **Estado de acceso:** Resumen de counters (usuarios activos, invitados, proyectos, business lines).
- **Notas operativas:** campo de texto editable para notas internas del equipo sobre esta cuenta (ej: "Space importado desde CRM. Revisar contacto principal y capacidades activas."). Esto actualmente está como "Nota operativa" al final — darle un lugar propio.
- **Registro de empresa:** estado de integración con HubSpot, última sync.
- **Fechas:** creación del space, última actualización, última lectura HubSpot.

---

## Correcciones de UX obligatorias (aplican a todos los tabs)

1. **Errores nunca en crudo.** Todo error de API debe pasar por un error boundary que muestre un mensaje user-friendly con acción de retry. Nunca mostrar stack traces, mensajes de abort, o errores técnicos al usuario.

2. **Loading states.** Cada tab debe tener un skeleton loader mientras carga data. Usar los Skeleton components de MUI. No mostrar secciones vacías o flash de contenido.

3. **Empty states.** Si no hay contactos CRM, no mostrar tabla vacía. Mostrar un empty state con ícono + mensaje + CTA (ej: "No hay contactos asociados en HubSpot. Sincronizar ahora.").

4. **Responsive.** La vista debe funcionar en tablet (el admin puede revisar desde un iPad). Las cards del header deben hacer wrap a 2x2 en pantallas menores a 1200px.

5. **Badges de color por capability** deben usar los colores del Brand Guideline:
   - Globe: `#7C3AED` (violeta) o la Globe Vibrant Palette
   - Reach: `#4F46E5` (indigo) o Reach Pulse Palette
   - Wave: `#0891B2` (cyan) o Wave Tech Palette
   - CRM Solutions / HubSpot: `#FF7A59` (HubSpot orange)
   - Efeonce Core: `#1E3A5F` (Midnight Navy)

---

## Componentes Vuexy full-version a reutilizar

Antes de construir algo custom, revisa estos paths en la full-version y reutiliza componentes existentes:

| Componente necesario | Path en full-version |
|---------------------|---------------------|
| Profile header con stats | `src/views/pages/user-profile/` |
| Tabs con iconos (Account Settings pattern) | `src/views/pages/account-settings/` |
| DataGrid con filtros y acciones | `src/views/apps/user/list/` |
| Stat cards (KPI counters) | `src/views/pages/widget-examples/statistics/` |
| Invoice/detail view con header + tabs | `src/views/apps/invoice/preview/` |
| CRM contact list pattern | `src/views/apps/user/view/` |
| Alert/notification components | `src/@core/components/` |
| Empty state patterns | Buscar en cualquier vista de list con estado vacío |
| Card collapsible/accordion | `src/components/` o usar `Accordion` de MUI directamente |

**Instrucción clave:** No construyas componentes desde cero si Vuexy full-version ya tiene algo equivalente. Copia el componente al starter-kit, adapta los props y la data, y estiliza según necesidad.

---

## Lo que NO debe cambiar

- La lógica de negocio de capabilities governance (business lines, service modules, edición manual vs API) está bien. No tocar la lógica, solo la presentación.
- Los endpoints de API existentes. El refactor es puramente frontend.
- El botón "Ver como cliente" debe mantenerse prominente en el header.
- El botón "Guardar selección manual" debe mantenerse accesible.

---

## Orden de ejecución sugerido

1. Crear el componente de header del tenant con KPI cards inline.
2. Implementar el sistema de tabs con navegación.
3. Migrar el contenido de cada sección actual a su tab correspondiente.
4. Reemplazar la tabla de usuarios con DataGrid paginado.
5. Implementar error boundaries y loading states.
6. Implementar empty states.
7. Aplicar colores de capabilities según Brand Guideline.
8. Testing: verificar que todas las funcionalidades existentes siguen operando post-refactor.

---

## Criterio de aceptación

- [ ] Header compacto con nombre, estado, 4 KPI cards y acciones visibles sin scroll.
- [ ] 5 tabs funcionales que reemplazan el scroll vertical.
- [ ] Tabla de usuarios con paginación (no scroll infinito).
- [ ] Cero errores técnicos visibles al usuario (error boundaries implementados).
- [ ] Skeleton loaders en cada tab al cargar data.
- [ ] Empty states en secciones sin data.
- [ ] Colores de capabilities consistentes con Brand Guideline.
- [ ] Vista funcional en desktop (1440px+) y tablet (1024px+).
- [ ] Toda la funcionalidad existente (sync, edición manual, ver como cliente) operativa.

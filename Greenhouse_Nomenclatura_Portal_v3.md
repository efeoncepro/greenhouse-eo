# EFEONCE GREENHOUSE™ — Portal UI Spec: Nomenclatura, Microcopy y Design System

## Guía completa de lenguaje, microcopy y theming para implementación del portal

**Efeonce Group — Marzo 2026 — CONFIDENCIAL**

**Uso:** Referencia normativa para agentes de desarrollo (Codex, Claude Code, Cursor) al implementar el portal Greenhouse. Cubre tres áreas: (1) nomenclatura y naming de cada elemento UI, (2) estrategia de microcopy y tono, (3) design system con conciliación Efeonce × Vuexy. Un agente con este documento y la Portal Spec v1.0 tiene todo lo necesario para implementar el frontend.

---

## 1. Principio rector

La metáfora del Greenhouse se aplica en **dos capas con reglas distintas:**

- **Capa de experiencia** (login, bienvenida, empty states, subtítulos, footer): aquí la metáfora envuelve la experiencia. Tono cálido, lenguaje de marca.
- **Capa de datos** (KPIs, labels de tabla, nombres de charts, filtros): aquí gana la claridad operativa. Un CMO necesita leer "Proyectos activos" y entender en 1 segundo, no decodificar "Cultivos en crecimiento".

**Regla operativa:** si el elemento muestra data o el cliente lo usa para tomar decisiones, el nombre es funcional. Si el elemento construye experiencia de marca o acompaña un momento emocional, el nombre es Greenhouse.

**Spanglish:** Efeonce opera en español LATAM con spanglish natural de la industria. Términos como feedback, asset, sprint, dashboard, brief, delivery se usan en su forma inglesa porque es como habla la audiencia. No se traducen forzadamente.

---

## 2. Navegación principal (Sidebar)

| Ruta técnica | Nombre actual (spec v1) | Nombre Greenhouse | Icono sugerido | Subtítulo en sidebar |
|---|---|---|---|---|
| `/dashboard` | Dashboard | **Pulse** | Actividad / pulso | Vista general de tu operación |
| `/proyectos` | Proyectos | **Proyectos** | Carpeta / grid | Proyectos activos |
| `/proyectos/[id]` | Detalle de proyecto | **[Nombre del proyecto]** | — | — |
| `/sprints` | Sprints | **Ciclos** | Reloj circular | Sprints de producción |
| `/settings` | Settings | **Mi Greenhouse** | Invernadero / gear | Perfil y preferencias |
| *(P2)* Notificaciones | — | **Updates** | Campana | Novedades del ecosistema |

**Decisiones de naming:**

- **Pulse** se mantiene: es terminología real de dashboards operativos ("pulse check", "pulse report"). No suena infantil, suena tech.
- **Proyectos** vuelve a su nombre funcional. El cliente busca "sus proyectos", no "sus cultivos". El nombre del proyecto real siempre es visible tal cual lo nombró el cliente.
- **Ciclos** funciona bien como reemplazo de "Sprints" porque es más accesible para un perfil de marketing que no vive en Scrum, y coincide con la metáfora de "ciclos de cultivo" sin forzarla.
- **Mi Greenhouse** es el único nombre 100% metafórico en el sidebar — apropiado porque settings es la sección más personal y menos operativa.
- **Updates** en vez de "Novedades" porque es el spanglish natural del equipo y los clientes.

**Nota para implementación:** El subtítulo en sidebar aparece en texto secundario (gris, font-size menor) debajo del label principal. Puede ocultarse en sidebar colapsado.

---

## 3. Página de login y onboarding

Aquí la metáfora tiene permiso completo. Es un momento de marca, no un momento de datos.

| Elemento UI | Copy genérico | Copy Greenhouse |
|---|---|---|
| Título de login | "Iniciar sesión" | **Entra al Greenhouse** |
| Subtítulo de login | — | "Tu espacio de crecimiento te espera" |
| Placeholder email | "Email" | "Tu email corporativo" |
| Placeholder password | "Contraseña" | "Password" |
| Botón de login | "Ingresar" | **Entrar** |
| Mensaje post-login (primera vez) | "Bienvenido, [nombre]" | **"Bienvenido al Greenhouse, [nombre]"** |
| Mensaje post-login (recurrente) | "Hola, [nombre]" | **"[nombre], tu Greenhouse está actualizado"** |
| Error de credenciales | "Credenciales inválidas" | "Las credenciales no coinciden. Intenta de nuevo o contacta a tu equipo de cuenta." |

---

## 4. Dashboard → Pulse

Landing page post-login. KPIs ICO agregados del cliente.

| Elemento UI | Nombre actual (spec v1) | Nombre final | Nota |
|---|---|---|---|
| Título de página | "Dashboard" | **Pulse** | — |
| Subtítulo de página | — | "El ritmo de tu operación creativa" | Header fijo, tono Greenhouse |
| Sección KPI cards | "KPIs" | **Key metrics** | Header de sección |
| KPI: RpA promedio | "RpA promedio" | **RpA promedio** | Métrica ICO — no se toca |
| KPI: Tareas activas | "Tareas activas" | **Assets activos** | "Assets" es lenguaje real de producción creativa |
| KPI: Tareas completadas | "Tareas completadas" | **Deliveries del período** | Spanglish natural. "Entregas" también es válido como fallback |
| KPI: Comentarios abiertos | "Comentarios abiertos" | **Feedback pendiente** | — |
| Semáforo RpA | Verde / Amarillo / Rojo | **Óptimo / Atención / Alerta** | Labels más descriptivos que colores |
| Chart: Distribución por estado | "Distribución por estado" | **Status de assets** | Donut chart |
| Chart: RpA por proyecto | "RpA por proyecto" | **RpA por proyecto** | Métrica ICO, nombre directo. Bar chart horizontal |
| Chart: Velocidad del sprint | "Velocidad del sprint actual" | **Avance del ciclo actual** | Progress bar |
| Chart: Timeline de actividad | "Timeline de actividad" | **Activity timeline** | Line chart, últimos 3 meses |
| Empty state (sin data) | "No hay datos disponibles" | "Tu Greenhouse está listo. Los datos aparecerán cuando tu primer proyecto esté en marcha." | Capa de experiencia — metáfora permitida |

---

## 5. Proyectos

| Elemento UI | Nombre actual (spec v1) | Nombre final | Nota |
|---|---|---|---|
| Título de página | "Proyectos" | **Proyectos** | Funcional, directo |
| Subtítulo de página | — | "Todo lo que está en movimiento" | Tono Greenhouse sutil, sin metáfora agrícola |
| Card de proyecto | Nombre + métricas | **[Nombre real del proyecto]** + métricas | El nombre del proyecto nunca se reemplaza |
| Label: % completadas | "% completadas" | **Progreso** | — |
| Label: RpA promedio | "RpA promedio" | **RpA** | Abreviado en card, completo en tooltip |
| Label: Total de tareas | "Total de tareas" | **Assets** | Consistente con el dashboard |
| Semáforo en card | Indicador de color | Color + tooltip: "Óptimo", "Atención", "Alerta" | — |
| Filtros | "Estado", "Rango de fechas" | **Status**, **Período** | Spanglish natural |
| Empty state | "No hay proyectos activos" | "No hay proyectos activos en este momento. Cuando un nuevo proyecto arranque, aparecerá aquí." | — |

---

## 6. Detalle de proyecto

| Elemento UI | Nombre actual (spec v1) | Nombre final | Nota |
|---|---|---|---|
| Título de página | "[Nombre del proyecto]" | **[Nombre del proyecto]** | Sin prefijo, sin metáfora — es el nombre que el cliente conoce |
| Header: estado | "Estado" | **Status** | — |
| Header: RpA promedio | "RpA promedio" | **RpA promedio** | — |
| Tabla de tareas | "Tareas" | **Assets** | Consistente en todo el portal |
| Columna: nombre | "Nombre" | **Asset** | — |
| Columna: estado | "Estado" | **Status** | — |
| Columna: frame_versions | "Versiones" | **Rondas** | Alineado con lenguaje ICO (rounds) |
| Columna: frame_comments | "Comentarios" | **Feedback** | — |
| Columna: última edición | "Última edición" | **Última actividad** | — |
| Sprint activo | "Sprint activo" | **Ciclo activo** | Con progress bar |
| Timeline | "Actividad del proyecto" | **Actividad del proyecto** | Funcional, sin metáfora |

**Breadcrumbs:** Pulse > Proyectos > [Nombre del proyecto]

---

## 7. Sprints → Ciclos

| Elemento UI | Nombre actual (spec v1) | Nombre final | Nota |
|---|---|---|---|
| Título de página | "Sprints" | **Ciclos** | — |
| Subtítulo de página | — | "El ritmo de cada sprint de producción" | Clarifica que "ciclo" = sprint |
| Sprint activo | "Sprint activo" | **Ciclo activo** | — |
| Label: fecha inicio/fin | "Fecha inicio / fin" | **Inicio / Cierre** | — |
| Progress bar | "Progreso" | **Avance** | — |
| Historial | "Sprints anteriores" | **Ciclos anteriores** | — |
| Chart: velocidad comparativa | "Velocidad por sprint" | **Velocity por ciclo** | Spanglish — "velocity" es el término estándar en producción |
| Burndown | "Burndown" | **Burndown** | No traducir — cualquier PM lo entiende. Si la audiencia lo requiere, tooltip: "Curva de avance del ciclo" |
| Empty state | "No hay sprints activos" | "No hay ciclos activos. Cuando tu equipo de cuenta inicie un nuevo sprint, lo verás aquí." | — |

---

## 8. Settings → Mi Greenhouse

| Elemento UI | Nombre actual (spec v1) | Nombre final | Nota |
|---|---|---|---|
| Título de página | "Settings" | **Mi Greenhouse** | — |
| Sección: perfil | "Perfil" | **Tu perfil** | — |
| Sección: preferencias | "Preferencias" | **Preferences** | Spanglish — suena más natural que "preferencias del ambiente" |
| Sección: equipo de cuenta | — (no existe en spec) | **Tu equipo de cuenta** | Muestra nombre, foto y canal de contacto del account owner. Sin metáfora — "jardinero" es simpático internamente pero un VP no quiere ver eso |
| Label: empresa | "Empresa" | **Empresa** | — |
| Label: email | "Email" | **Email** | — |
| Botón: cerrar sesión | "Cerrar sesión" | **Salir del Greenhouse** | Único momento de metáfora en esta página |

### 8.1 Tu equipo de cuenta (módulo dentro de Mi Greenhouse)

Este módulo es la digitalización del dossier de equipo del sistema Greenhouse (Fase 1: Onboarding, Momento 1). Es relacional, no operativo — muestra quiénes son, por qué son relevantes, y cómo contactarlos.

| Elemento UI | Nombre final | Nota |
|---|---|---|
| Título de sección | **Tu equipo de cuenta** | — |
| Subtítulo de sección | "Las personas asignadas a tu operación. Contacto directo, sin intermediarios." | Tono Greenhouse: cálido pero funcional |
| Card de persona: cargo | **[Cargo real]** | Ej: "Creative Operations Lead", "Senior Visual Designer" |
| Card de persona: nota de relevancia | **[Texto personalizado]** | Ej: "Coordina tu operación creativa. Punto de contacto principal para briefs, timelines y escalamientos." |
| Card de persona: canal de contacto | **Microsoft Teams** / **Slack** / **Email** | Según lo configurado para el cliente |
| Label: dedicación | **Dedicación** | Solo en contexto de FTE individual dentro de card |
| Footer: línea de servicio | **Línea de servicio:** + badge | Badge con nombre de la línea (Globe, Efeonce Digital, etc.) |
| Footer: modalidad | **Modalidad:** + texto | "On-Going" / "On-Demand" |
| Footer: equipo total | **Equipo:** + FTE | "3.0 FTE" |
| Ghost slot: título | **Ampliar equipo** | — |
| Ghost slot: subtítulo | "Agrega capacidad creativa, de medios o tecnología." | — |
| Empty state | "Tu equipo de cuenta está siendo configurado. Cuando esté listo, verás aquí a cada persona asignada a tu operación." | — |

### 8.2 Capacidad del equipo (módulo dentro de Pulse / Dashboard)

Este módulo es operativo — muestra carga real basada en proyectos y tareas. Vive en el dashboard, no en Mi Greenhouse.

| Elemento UI | Nombre final | Nota |
|---|---|---|
| Título de sección | **Capacidad del equipo** | — |
| Subtítulo de sección | "Carga operativa basada en proyectos y tareas activas" | Funcional, sin metáfora |
| KPI: capacidad contratada | **Capacidad contratada** | Número + "FTE" como sufijo |
| KPI: horas | **Horas este mes** | "X / Yh" |
| KPI: utilización | **Utilización** | Porcentaje con color semáforo |
| Sección: carga | **Carga por persona** | — |
| CTA upselling: título | "Tu equipo está al {X}% de capacidad este mes" | Solo visible si utilización ≥ 85% |
| CTA upselling: subtítulo | "Si tienes necesidades adicionales, puedes sumar capacidad On-Demand sin afectar tu equipo actual." | — |
| CTA upselling: botón | **Ampliar capacidad** | — |
| Empty state | "Los datos de capacidad aparecerán cuando tu primer proyecto esté en marcha." | — |

### 8.3 Equipo en proyecto (módulo dentro de Proyectos/[id])

| Elemento UI | Nombre final | Nota |
|---|---|---|
| Label colapsado | "X personas trabajando en este proyecto" | — |
| Columna: assets activos | **Assets activos** | Conteo |
| Columna: completados | **Completados** | Conteo |
| Columna: RpA | **RpA** | Con semáforo individual |
| Columna: en revisión | **En revisión** | Conteo |

### 8.4 Velocity por persona (módulo dentro de Ciclos/[id])

| Elemento UI | Nombre final | Nota |
|---|---|---|
| Título de sección | **Velocity por persona** | — |
| Subtítulo | "Rendimiento del equipo en este ciclo" | — |
| Columna: completados/total | **"X / Y"** | Formato compacto |
| Barra de progreso | Sin label | Color contextual basado en ritmo vs tiempo |

---

## 9. Updates (P2)

| Elemento UI | Nombre actual (spec v1) | Nombre final | Nota |
|---|---|---|---|
| Sección en sidebar | "Notificaciones" | **Updates** | — |
| Título de la sección | "Updates" | **Updates del ecosistema** | Alineado con "Updates de innovación" del sistema Greenhouse |
| Card de update | — | **[Título del update]** + fecha + badge "New" | — |
| Empty state | — | "Todo al día. Cuando haya updates del ecosistema, aparecerán aquí." | — |

---

## 10. Microcopy transversal

Los copy transversales (tooltips, loading, errors, footer) están definidos en la **sección 14** (Estrategia de microcopy) y codificados en `GH_MESSAGES` de la **sección 13**. No se duplican aquí — una sola fuente de verdad.

---

## 11. Glosario: término final → equivalente técnico

Referencia rápida para agentes de desarrollo.

| Término en UI | Equivalente técnico / BigQuery | Dónde se usa |
|---|---|---|
| Pulse | Dashboard (`/dashboard`) | Sidebar, título de página |
| Proyectos | Proyectos (`/proyectos`) | Sidebar, títulos, breadcrumbs |
| Ciclo / Ciclos | Sprint / Sprints (`/sprints`) | Sidebar, títulos, charts |
| Mi Greenhouse | Settings (`/settings`) | Sidebar, título de página |
| Updates | Notificaciones (P2) | Sidebar |
| Assets | Tareas (`notion_ops.tareas`) | Tablas, KPI cards |
| Rondas | `frame_versions` | Columna de tabla |
| Feedback | `frame_comments` / `open_frame_comments` | Columna de tabla, KPI card |
| Status | `estado` | Columnas, filtros, badges |
| Deliveries | Tareas con `estado = 'Listo'` | KPI card en Pulse |
| Velocity | Tareas completadas / duración del sprint | Chart en Ciclos |
| Burndown | Burndown | Chart en Ciclos |
| Óptimo / Atención / Alerta | `semaforo_rpa`: Verde / Amarillo / Rojo | Semáforos en todo el portal |

---

## 12. Reglas de aplicación

### 12.1 Dónde SÍ aplica la metáfora Greenhouse
- Login: título, subtítulo, mensaje de bienvenida
- Empty states: cuando no hay data, el tono acompaña
- Footer: tagline oficial del portal
- Subtítulos de página: una línea descriptiva con tono de marca
- Nombre de la sección de settings: "Mi Greenhouse"
- Loading inicial post-login: "Preparando tu Greenhouse..."
- Cierre de sesión: "Salir del Greenhouse"

### 12.2 Dónde NO aplica la metáfora
- **Métricas ICO:** RpA, OTD%, Cycle Time, Cycle Time Variance, Brief Clarity Score — son el idioma operativo compartido con el cliente
- **Labels de datos en tablas, cards y charts:** funcionales y directos
- **Nombres de proyectos:** siempre el nombre real que el cliente conoce
- **Estados de error:** claridad > creatividad
- **API routes y schemas de BigQuery:** la capa Greenhouse es exclusivamente UI
- **Código fuente:** variables, funciones y tipos usan nombres técnicos en inglés

### 12.3 Spanglish: qué se deja en inglés
Estos términos se usan en su forma inglesa porque es el lenguaje natural de la audiencia (marketing, branding, producción creativa en LATAM):

| En inglés | NO traducir a |
|---|---|
| Asset / Assets | "Activo" / "Recurso" |
| Feedback | "Retroalimentación" / "Comentarios" |
| Status | "Estado" *(ambos son válidos, pero Status se prefiere en UI por consistencia spanglish)* |
| Delivery / Deliveries | "Entrega" *(ambos válidos, Delivery se prefiere en KPI cards)* |
| Velocity | "Velocidad" |
| Burndown | "Curva de avance" *(se puede usar en tooltip, no como label)* |
| Update / Updates | "Actualización" / "Novedad" |
| Password | "Contraseña" |
| Dashboard | "Tablero" / "Panel" |
| Sprint | "Iteración" *(aunque en UI se muestra "Ciclo", en tooltips y contexto se puede decir "sprint")* |
| Brief | "Resumen creativo" |
| Action plan | "Plan de acción" *(ambos válidos)* |

### 12.4 Tono del microcopy
Alineado con Brand Voice v1.0:
- **Directo, no decorativo.** "Tu Greenhouse está actualizado" — no "¡Las flores de tu jardín digital están floreciendo!"
- **Cálido, no efusivo.** Sin signos de exclamación dobles. Sin superlativos vacíos.
- **Transparente en problemas.** Si hay un error, se dice qué pasó y qué viene. No se esconde detrás de metáforas.
- **Profesional-directo.** Tratamiento de tú. Sin emojis en la interfaz.
- **Spanglish natural.** Se mezcla español e inglés como lo hace la audiencia, no como lo haría un traductor.

---

## 13. Implementación técnica

### 13.1 Constantes de nomenclatura

Archivo de constantes para consistencia en todo el codebase. Todo texto visible al cliente y todo color de UI sale de aquí. Un solo archivo, un solo import.

```typescript
// src/config/greenhouse-nomenclature.ts

// =============================================
// NAVIGATION
// =============================================

export const GH_NAV = {
  dashboard: { label: 'Pulse', subtitle: 'Vista general de tu operación' },
  projects:  { label: 'Proyectos', subtitle: 'Proyectos activos' },
  sprints:   { label: 'Ciclos', subtitle: 'Sprints de producción' },
  settings:  { label: 'Mi Greenhouse', subtitle: 'Perfil y preferencias' },
  updates:   { label: 'Updates', subtitle: 'Novedades del ecosistema' },
} as const

// =============================================
// LABELS (capa de datos — funcionales, directos)
// =============================================

export const GH_LABELS = {
  // KPI Cards (Pulse)
  kpi_rpa:        'RpA promedio',
  kpi_active:     'Assets activos',
  kpi_completed:  'Deliveries del período',
  kpi_feedback:   'Feedback pendiente',

  // Semáforo
  semaphore_green:  'Óptimo',
  semaphore_yellow: 'Atención',
  semaphore_red:    'Alerta',

  // Charts (Pulse)
  chart_status:     'Status de assets',
  chart_rpa:        'RpA por proyecto',
  chart_velocity:   'Avance del ciclo actual',
  chart_timeline:   'Activity timeline',

  // Tabla de assets (Detalle de proyecto)
  col_asset:         'Asset',
  col_status:        'Status',
  col_rounds:        'Rondas',
  col_feedback:      'Feedback',
  col_last_activity: 'Última actividad',

  // Ciclos
  sprint_active:    'Ciclo activo',
  sprint_history:   'Ciclos anteriores',
  sprint_velocity:  'Velocity por ciclo',
  sprint_burndown:  'Burndown',
} as const

// =============================================
// TEAM (secciones 8.1–8.4)
// =============================================

export const GH_TEAM = {
  // Vista 1: Dossier (Mi Greenhouse, sección 8.1)
  section_title:     'Tu equipo de cuenta',
  section_subtitle:  'Las personas asignadas a tu operación. Contacto directo, sin intermediarios.',
  label_fte:         'Dedicación',
  label_service_line:'Línea de servicio',
  label_modality:    'Modalidad',
  expand_title:      'Ampliar equipo',
  expand_subtitle:   'Agrega capacidad creativa, de medios o tecnología.',

  // Vista 2: Capacidad (Pulse, sección 8.2)
  capacity_title:    'Capacidad del equipo',
  capacity_subtitle: 'Carga operativa basada en proyectos y tareas activas',
  label_contracted:  'Capacidad contratada',
  label_hours:       'Horas este mes',
  label_utilization: 'Utilización',
  label_load:        'Carga por persona',

  // Vista 3: Equipo en proyecto (sección 8.3)
  project_team_title:'Equipo en este proyecto',

  // Vista 4: Velocity por persona (sección 8.4)
  sprint_vel_title:  'Velocity por persona',
  sprint_vel_subtitle:'Rendimiento del equipo en este ciclo',

  // CTAs de upselling
  cta_title:         'Tu equipo está al {percent}% de capacidad este mes',
  cta_subtitle:      'Si tienes necesidades adicionales, puedes sumar capacidad On-Demand sin afectar tu equipo actual.',
  cta_button:        'Ampliar capacidad',
} as const

// =============================================
// MESSAGES (capa de experiencia — tono Greenhouse)
// =============================================

export const GH_MESSAGES = {
  // Login
  login_title:      'Entra al Greenhouse',
  login_subtitle:   'Tu espacio de crecimiento te espera',
  login_button:     'Entrar',
  logout_button:    'Salir del Greenhouse',

  // Welcome
  welcome_first:    (name: string) => `Bienvenido al Greenhouse, ${name}`,
  welcome_return:   (name: string) => `${name}, tu Greenhouse está actualizado`,

  // Page subtitles
  subtitle_pulse:    'El ritmo de tu operación creativa',
  subtitle_projects: 'Todo lo que está en movimiento',
  subtitle_sprints:  'El ritmo de cada sprint de producción',
  subtitle_settings: 'Tu perfil y preferencias',

  // Loading & errors
  loading_initial:   'Preparando tu Greenhouse...',
  loading_data:      'Cargando datos...',
  error_connection:  'No pudimos conectar con tus datos. Intenta de nuevo en unos minutos.',
  error_no_data:     'Sin datos para este período',
  error_session:     'Tu sesión expiró. Entra de nuevo para continuar.',
  error_maintenance: 'Estamos actualizando el portal. Volvemos en unos minutos.',

  // Empty states
  empty_dashboard:   'Tu Greenhouse está listo. Los datos aparecerán cuando tu primer proyecto esté en marcha.',
  empty_projects:    'No hay proyectos activos en este momento. Cuando un nuevo proyecto arranque, aparecerá aquí.',
  empty_sprints:     'No hay ciclos activos. Cuando tu equipo de cuenta inicie un nuevo sprint, lo verás aquí.',
  empty_updates:     'Todo al día. Cuando haya updates del ecosistema, aparecerán aquí.',
  empty_team:        'Tu equipo de cuenta está siendo configurado. Cuando esté listo, verás aquí a cada persona asignada a tu operación.',
  empty_capacity:    'Los datos de capacidad aparecerán cuando tu primer proyecto esté en marcha.',

  // Tooltips — métricas ICO
  tooltip_rpa:             'Rounds per Asset: promedio de rondas de revisión por pieza. Menos es mejor.',
  tooltip_otd:             'On-Time Delivery: porcentaje de entregas realizadas en la fecha comprometida.',
  tooltip_assets_active:   'Assets en proceso: tareas de producción creativa que no han llegado a estado Listo.',
  tooltip_deliveries:      'Deliveries: assets completados en el período seleccionado.',
  tooltip_feedback:        'Feedback pendiente: comentarios abiertos en Frame.io que requieren acción.',
  tooltip_utilization:     'Estimación de uso basada en la carga operativa actual del equipo.',

  // Tooltips — semáforo
  tooltip_semaphore_green: 'Óptimo: la operación está dentro de los estándares ICO.',
  tooltip_semaphore_yellow:'Atención: algunos indicadores se acercan al límite. Tu equipo de cuenta ya está al tanto.',
  tooltip_semaphore_red:   'Alerta: indicadores fuera de rango. Tu equipo de cuenta te contactará con un action plan.',

  // Footer
  footer: 'Efeonce Greenhouse™ · El ambiente diseñado para que tu marca crezca',
} as const

// =============================================
// COLORS — Paleta UI derivada de Brand Guideline v1.0
// =============================================
// Fuente de verdad: Efeonce Brand Guideline v1.0, sección 4 (Core Palette 02).
// Los hex de 'source' son colores oficiales de marca — no modificar.
// Los hex de 'bg' son derivados al 8% de opacidad sobre blanco.
// Los hex de 'bgHover' son derivados al 15% de opacidad sobre blanco.
// Los hex de 'textDark' son el source oscurecido al 70% para high-contrast.

export const GH_COLORS = {
  // Colores por role_category del equipo
  role: {
    account: {
      source: '#023c70',       // Deep Azure — punto de contacto principal
      bg: '#eaeff3',
      bgHover: '#d9e1e9',
      text: '#023c70',
      textDark: '#012a4e',
    },
    operations: {
      source: '#024c8f',       // Royal Blue — gestión operativa
      bg: '#eaf0f6',
      bgHover: '#d9e4ee',
      text: '#024c8f',
      textDark: '#013564',
    },
    strategy: {
      source: '#633f93',       // Orchid Purple — pensamiento estratégico
      bg: '#f2eff6',
      bgHover: '#e7e2ee',
      text: '#633f93',
      textDark: '#452c66',
    },
    design: {
      source: '#bb1954',       // Crimson Magenta — energía creativa
      bg: '#f9ecf1',
      bgHover: '#f4dce5',
      text: '#bb1954',
      textDark: '#82113a',
    },
    development: {
      source: '#0375db',       // Core Blue — tech/digital
      bg: '#eaf3fc',
      bgHover: '#d9eaf9',
      text: '#0375db',
      textDark: '#025199',
    },
    media: {
      source: '#ff6500',       // Sunset Orange — distribución
      bg: '#fff2ea',
      bgHover: '#ffe7d8',
      text: '#ff6500',
      textDark: '#b24600',
    },
  },

  // Semáforos ICO (derivados de colores de marca)
  semaphore: {
    green:  { source: '#6ec207', bg: '#f3faeb', text: '#6ec207' },  // Neon Lime → Óptimo
    yellow: { source: '#ff6500', bg: '#fff2ea', text: '#ff6500' },  // Sunset Orange → Atención
    red:    { source: '#bb1954', bg: '#f9ecf1', text: '#bb1954' },  // Crimson Magenta → Alerta
  },

  // Semánticos para estados de UI
  semantic: {
    success: { source: '#6ec207', bg: '#f3faeb', text: '#6ec207' },
    warning: { source: '#ff6500', bg: '#fff2ea', text: '#ff6500' },
    danger:  { source: '#bb1954', bg: '#f9ecf1', text: '#bb1954' },
    info:    { source: '#0375db', bg: '#eaf3fc', text: '#0375db' },
  },

  // Neutrales estructurales
  neutral: {
    textPrimary:   '#022a4e',   // Midnight Navy
    textSecondary: '#848484',   // Brand gray (logo claim color)
    border:        '#dbdbdb',   // Light Alloy
    bgSurface:     '#f7f7f5',   // Warm off-white
  },

  // Líneas de servicio (para badges de capability)
  service: {
    globe:           { source: '#bb1954', bg: '#f9ecf1', text: '#bb1954' },
    efeonce_digital: { source: '#023c70', bg: '#eaeff3', text: '#023c70' },
    reach:           { source: '#ff6500', bg: '#fff2ea', text: '#ff6500' },
    wave:            { source: '#0375db', bg: '#eaf3fc', text: '#0375db' },
    crm_solutions:   { source: '#633f93', bg: '#f2eff6', text: '#633f93' },
  },
} as const
```

### 13.2 Notas para agentes

- **Las API routes NO cambian de nombre.** `/api/projects`, `/api/sprints`, `/api/dashboard/kpis` se mantienen. La capa Greenhouse es exclusivamente UI.
- **Los schemas de BigQuery NO cambian.** `notion_ops.tareas`, `notion_ops.proyectos`, `notion_ops.sprints` se mantienen tal cual. La traducción a nomenclatura Greenhouse ocurre únicamente en componentes frontend.
- **Usar el archivo de constantes** (`greenhouse-nomenclature.ts`) para todo texto visible al cliente Y todo color de UI. No hardcodear strings ni hex en componentes.
- **Un solo archivo.** Todo vive en `greenhouse-nomenclature.ts`: labels (`GH_LABELS`), mensajes (`GH_MESSAGES`), equipo (`GH_TEAM`), navegación (`GH_NAV`) y colores (`GH_COLORS`). No crear archivos separados para colores ni tokens.
- **Colores: siempre referenciar `GH_COLORS`.** Para avatar de un miembro del equipo con `role_category: 'design'`, usar `GH_COLORS.role.design.bg` como fondo y `GH_COLORS.role.design.text` como color de texto. Nunca escribir `#bb1954` directamente en un componente.
- **Semáforos: usar `GH_COLORS.semaphore`**, no CSS variables genéricas de MUI. Los semáforos de Greenhouse son Neon Lime / Sunset Orange / Crimson Magenta (colores de marca), no verde/amarillo/rojo genéricos.
- **Breadcrumbs:** Pulse > Proyectos > [Nombre real del proyecto]
- **i18n futuro:** el archivo de constantes facilita internacionalización si se necesita inglés u otro idioma. Agregar un segundo objeto con las mismas keys.

---

## 14. Estrategia de microcopy

El microcopy es todo texto corto que guía al cliente dentro del portal: labels, tooltips, empty states, confirmaciones, errores, placeholders, mensajes de estado. No es decoración — es parte de la experiencia de producto. En Greenhouse, el microcopy tiene un trabajo doble: orientar funcionalmente Y construir marca de forma sutil.

### 14.1 Principios de microcopy Greenhouse

**1. Primero útil, después memorable.**
El cliente está buscando data o completando una acción. El microcopy lo ayuda a lograrlo. Si además refuerza la marca, perfecto. Si no, con que sea claro es suficiente.

**2. Una idea por mensaje.**
Cada string de microcopy tiene UN trabajo. No intentes ser útil, tranquilizador y de marca al mismo tiempo en 12 palabras. Elige el job principal.

**3. El tono sube y baja según la zona del portal.**
- **Zona de experiencia** (login, bienvenida, empty states, footer, onboarding): tono cálido, con personalidad Greenhouse. Aquí hay permiso para metáfora sutil.
- **Zona de datos** (KPIs, tablas, charts, filtros): tono funcional, directo, cero metáfora. El dato habla solo.
- **Zona de error** (errores, warnings, timeouts): tono transparente, sin drama, con next step. Nunca culpar al cliente ni esconderse detrás de lenguaje vago.

**4. Spanglish natural, no forzado.**
Si el término en inglés es lo que la audiencia dice naturalmente (feedback, asset, status, delivery, brief), se deja en inglés. Si la versión en español es igual de natural (proyectos, rondas, avance), se deja en español. No hay regla fija — la prueba es: ¿cómo lo diría un director de marketing de Santiago o Bogotá en una reunión?

**5. Sin signos de exclamación (salvo celebración genuina).**
El portal no grita. El único caso donde un "!" es apropiado es en un momento de celebración real (ej: "Primer ciclo completado — 100% on-time"). Nunca en errores, nunca en bienvenidas, nunca en empty states.

### 14.2 Anatomía de cada tipo de microcopy

#### Labels de navegación
- **Job:** identificar la sección en < 1 segundo
- **Largo máximo:** 2 palabras
- **Tono:** neutro-funcional con naming Greenhouse donde aplique
- **Ejemplo:** "Pulse", "Proyectos", "Ciclos"

#### Subtítulos de página
- **Job:** dar contexto emocional al entrar a una sección
- **Largo máximo:** 8-10 palabras
- **Tono:** cálido, con personalidad — es la línea más "de marca" en cada vista
- **Ejemplo:** "El ritmo de tu operación creativa", "Todo lo que está en movimiento"
- **Regla:** se muestra una vez como header o en el primer render. No compite con la data.

#### KPI labels
- **Job:** nombrar la métrica sin ambigüedad
- **Largo máximo:** 3 palabras
- **Tono:** funcional puro. Sin metáfora, sin adjetivos.
- **Ejemplo:** "RpA promedio", "Assets activos", "Feedback pendiente"

#### Tooltips
- **Job:** educar sobre una métrica o estado sin interrumpir el flow
- **Largo máximo:** 15-20 palabras
- **Tono:** explicativo-conciso. Como un colega que te explica algo en 5 segundos.
- **Estructura:** [Nombre completo en inglés]: [qué mide en español]. [Interpretación rápida si aplica].
- **Ejemplo:** "Rounds per Asset: promedio de rondas de revisión por pieza. Menos es mejor."

#### Empty states
- **Job:** tranquilizar + orientar. El cliente no debería sentir que algo está roto.
- **Largo máximo:** 2 oraciones
- **Tono:** cálido, con toque Greenhouse. Aquí la metáfora tiene permiso.
- **Estructura:** [Qué está pasando / por qué no hay data] + [Qué va a pasar cuando haya].
- **Ejemplo:** "Tu Greenhouse está listo. Los datos aparecerán cuando tu primer proyecto esté en marcha."
- **Anti-patrón:** "No hay datos disponibles" (frío), "¡Todavía no tienes nada aquí!" (condescendiente)

#### Mensajes de error
- **Job:** decir qué pasó + qué hacer. Sin culpa, sin drama.
- **Largo máximo:** 2 oraciones
- **Tono:** transparente-directo. El error es un hecho, no una disculpa.
- **Estructura:** [Qué pasó en lenguaje simple] + [Qué puede hacer el cliente].
- **Ejemplo:** "No pudimos conectar con tus datos. Intenta de nuevo en unos minutos."
- **Anti-patrón:** "Oops, algo salió mal" (vago), "Error 500" (técnico), "¡Lo sentimos mucho!" (excesivo)

#### Mensajes de confirmación
- **Job:** confirmar que la acción se completó
- **Largo máximo:** 1 oración
- **Tono:** neutro-positivo. Confirma y desaparece.
- **Ejemplo:** "Preferencias actualizadas", "Filtro aplicado"

#### Loading states
- **Job:** indicar que algo está pasando
- **Largo máximo:** 4 palabras
- **Tono:** varía por contexto:
  - **Carga inicial (post-login):** "Preparando tu Greenhouse..." — tono de marca, momento de experiencia
  - **Cargas parciales:** "Cargando datos..." — funcional, invisible

### 14.3 Proceso de creación de nuevo microcopy

Cuando un agente de desarrollo o diseñador necesite escribir microcopy nuevo que no esté en `greenhouse-nomenclature.ts`:

1. **Identificar el tipo** (label, tooltip, empty state, error, confirmación, loading)
2. **Identificar la zona** (experiencia, datos, o error)
3. **Escribir la versión funcional primero** — la que un ingeniero pondría
4. **Evaluar si la zona permite tono Greenhouse** — si sí, ajustar. Si no, dejar funcional.
5. **Verificar spanglish** — ¿el término en inglés es natural para la audiencia? Si sí, dejarlo. Si no, español.
6. **Agregar al archivo de constantes** — nunca hardcodear. Todo microcopy vive en `greenhouse-nomenclature.ts`.

### 14.4 Microcopy que NO existe todavía (pendiente de definir)

Estos son copy que se van a necesitar conforme avance la implementación. Se documentan aquí para que no se inventen sobre la marcha:

| Contexto | Necesidad | Prioridad |
|---|---|---|
| Confirmación de logout | "¿Seguro que quieres salir del Greenhouse?" + botones Salir / Quedarme | P1 |
| Primer login exitoso | Onboarding tooltip tour — copy de cada paso del walkthrough | P1 |
| Notificación de nuevo update | Badge + preview text para la sección de Updates | P2 |
| Feedback Review disponible | Notificación / banner cuando se publica un nuevo Feedback Review | P2 |
| Cambio de status de asset | Toast notification: "[Asset] pasó a [nuevo status]" | P2 |
| Rate limit / throttle | "Muchas consultas en poco tiempo. Espera unos segundos." | P1 |

**Nota:** los copy de sesión expirada y mantenimiento ya están definidos en `GH_MESSAGES` (sección 13).

---

## 15. Design tokens — Paleta UI del portal

### 16.1 Principio

El Brand Guideline v1.0 define colores de marca a nivel de identidad (logos, propuestas, materiales). La sección 13 (`GH_COLORS`) define la paleta UI derivada para componentes de dashboard: fondos de avatar, badges, semáforos, barras de progreso y CTAs. Todos los hex son derivaciones matemáticas de los colores oficiales de marca — no son colores nuevos.

**Regla:** Ningún color hex aparece en un componente. Todo sale de `GH_COLORS` en `greenhouse-nomenclature.ts`. Si un agente necesita un color que no está en `GH_COLORS`, no lo inventa — lo escala en este documento primero.

### 16.2 Derivación de colores UI desde marca

Los colores de marca (Brand Guideline, Core Palette 02) son intensos — diseñados para logos y acentos, no para fondos de componentes en un dashboard blanco. Para uso en UI se generan 4 variantes:

| Variante | Método | Uso |
|---|---|---|
| `source` | Hex original del Brand Guideline | Referencia, no usar directo en fondos grandes |
| `bg` | Source al 8% de opacidad sobre blanco | Fondo de avatar, badge, card accent |
| `bgHover` | Source al 15% de opacidad sobre blanco | Estado hover, fondo de card seleccionada |
| `text` | = Source | Texto sobre fondo `bg`, íconos, bordes de acento |
| `textDark` | Source oscurecido al 70% | Texto de alto contraste sobre fondo `bg` (WCAG AA) |

### 16.3 Mapeo role_category → color de marca

| role_category | Color de marca | Hex fuente | Justificación |
|---|---|---|---|
| account | Deep Azure | #023c70 | Color primario de marca, punto de contacto principal |
| operations | Royal Blue | #024c8f | Familia institucional azul, gestión operativa |
| strategy | Orchid Purple | #633f93 | Acento profundo, pensamiento estratégico |
| design | Crimson Magenta | #bb1954 | Energía creativa, alineado con Globe Vibrant Palette |
| development | Core Blue | #0375db | Tech/digital, acento frío |
| media | Sunset Orange | #ff6500 | Distribución/amplificación, alineado con Reach Pulse Palette |

### 16.4 Semáforos ICO

Los semáforos no usan rojo/amarillo/verde genéricos. Usan colores de la Core Palette:

| Semáforo | Label UI | Color de marca | Hex | Uso |
|---|---|---|---|---|
| Óptimo | `GH_LABELS.semaphore_green` | Neon Lime | #6ec207 | RpA ≤1.5, OTD ≥90%, Utilización ≤70% |
| Atención | `GH_LABELS.semaphore_yellow` | Sunset Orange | #ff6500 | RpA ≤2.5, OTD ≥70%, Utilización 71-89% |
| Alerta | `GH_LABELS.semaphore_red` | Crimson Magenta | #bb1954 | RpA >2.5, OTD <70%, Utilización ≥90% |

Siempre incluyen ícono + label textual, no solo color (accesibilidad WCAG).

### 16.5 Badges de línea de servicio

| Línea | Color de marca | Justificación |
|---|---|---|
| Globe | Crimson Magenta (#bb1954) | Globe Vibrant Palette — creatividad |
| Efeonce Digital | Deep Azure (#023c70) | Core Palette — institucional |
| Reach | Sunset Orange (#ff6500) | Reach Pulse Palette — amplificación |
| Wave | Core Blue (#0375db) | Wave Tech Palette — tecnología |
| CRM Solutions | Orchid Purple (#633f93) | Acento profundo — consultoría |

### 16.6 CTA de upselling

El CTA de expansión/upselling usa Sunset Orange como base porque es el color del semáforo "Atención" — aparece cuando hay un dato que justifica la acción.

| Elemento | Hex | Derivación |
|---|---|---|
| Fondo del banner | #fff2ea | Sunset Orange al 8% |
| Texto del título | #b24600 | Sunset Orange oscurecido al 70% |
| Texto del subtítulo | #ff6500 | Sunset Orange fuente |
| Borde del botón | #ff6500 | Sunset Orange fuente |

### 16.7 Reglas de contraste

Todas las combinaciones `text` sobre `bg` cumplen WCAG AA (ratio ≥ 4.5:1). Si un agente necesita poner texto sobre un fondo de color de marca completo (ej: badge con fondo `source`), usar blanco (#FFFFFF) como texto — alineado con regla 3 del Brand Guideline.

---

## 16. Conciliación Efeonce × Vuexy

### 16.0 Estrategia de conciliación

El portal usa **Vuexy Admin Template** (Next.js, TypeScript, MUI v5) como base — comprado en CodeCanyon, con starter-kit en `main` y full-version como referencia de componentes. Vuexy no es solo un theme: es un sistema completo con layout engine, sidebar, skin system (default / bordered), modos (light / dark), breakpoints, overrides de componentes MUI, y su propia capa de theming.

**Principio fundamental: Efeonce se inyecta en Vuexy, no lo reemplaza.**

**⚠️ El agente NO debe crear un theme nuevo.** No crear archivos como `greenhouse-theme.ts`, `efeonce-theme.ts`, ni ningún `createTheme()` independiente. Vuexy ya tiene su theme system — lo que se hace es override de valores específicos dentro de la estructura existente. Crear un theme paralelo rompe el sidebar, los breakpoints, el responsive, el skin system y la lógica de dark mode.

La estrategia correcta es:

1. **Usar los puntos de extensión que Vuexy ofrece** — no inventar los propios
2. **Tocar solo los archivos de configuración de color y tipografía** — no los layouts ni componentes base
3. **Mantener la estructura de carpetas de Vuexy intacta** — agregar archivos Efeonce al lado, no reemplazar
4. **Aplicar el override consolidado** de la sección 16.9 — es el archivo listo para copiar

### 16.1 Arquitectura de theming de Vuexy

Vuexy organiza su theming así (paths relativos a `src/`):

```
src/
├── @core/
│   ├── theme/                    ← NO TOCAR. Core del theme system.
│   │   ├── overrides/            ← Component overrides (MUI). No modificar.
│   │   ├── palette/              ← Generador de paleta. No modificar.
│   │   └── ThemeProvider.tsx     ← Provider principal. No modificar.
│   ├── layouts/                  ← Layout engine (sidebar, navbar). No tocar.
│   └── styles/                   ← Estilos core. No tocar.
├── configs/
│   ├── primaryColorConfig.ts     ← ✅ TOCAR: colores primarios seleccionables
│   └── themeConfig.ts            ← ✅ TOCAR: modo (light/dark), skin, layout
├── theme/                        ← ✅ TOCAR: mergeTheme y customización
│   └── index.ts                  ← Aquí se hace merge del theme custom con el core
├── layouts/                      ← Layout wrappers (se puede extender)
└── views/                        ← Vistas de negocio (aquí vive todo lo custom)
```

**Regla para agentes:** todo lo que está en `@core/` es intocable. Todo lo que está en `configs/` y `theme/` es el punto de extensión oficial.

### 16.2 Dónde inyectar los colores Efeonce

Vuexy maneja color primario a través de `primaryColorConfig.ts`. Este archivo define un array de opciones de color primario — Vuexy permite al usuario seleccionar entre ellas (feature de "theme customizer"). Para Greenhouse, no necesitamos múltiples opciones. Necesitamos que Core Blue sea el primario y punto.

**Archivo: `src/configs/primaryColorConfig.ts`**

```typescript
// Reemplazar el array de colores con un solo valor: Efeonce Core Blue
const primaryColorConfig = [
  {
    name: 'efeonce-core',
    main: '#0375db',      // Core Blue — CTA, links, elementos interactivos
    light: '#3691e3',     // Core Blue lightened ~15% — hover states
    dark: '#024c8f',      // Royal Blue — pressed states, bordes activos
  },
]

export default primaryColorConfig
```

Para los colores semánticos (success, warning, error) que mapean a los semáforos ICO, el override se hace en el theme merge. Vuexy expone un punto para esto en `src/theme/index.ts`:

**Archivo: `src/theme/index.ts` — agregar al objeto de merge:**

```typescript
// Dentro del createTheme o deepmerge que Vuexy ya tiene en este archivo:
palette: {
  primary: {
    main:  '#0375db',   // Core Blue
    light: '#3691e3',
    dark:  '#024c8f',   // Royal Blue
  },
  secondary: {
    main:  '#023c70',   // Deep Azure — sidebar items, secondary actions
    light: '#035a9e',
    dark:  '#022a4e',   // Midnight Navy
  },
  success: {
    main: '#6ec207',    // Neon Lime → Semáforo "Óptimo"
  },
  warning: {
    main: '#ff6500',    // Sunset Orange → Semáforo "Atención"
  },
  error: {
    main: '#bb1954',    // Crimson Magenta → Semáforo "Alerta"
  },
  background: {
    default: '#F8F9FA', // Fondo general (no blanco puro)
    paper:   '#FFFFFF',
  },
  text: {
    primary:   '#1A1A2E',  // Body text
    secondary: '#667085',  // Captions, metadata
    disabled:  '#848484',  // Claim gray
  },
  // Custom tokens para uso directo en componentes Greenhouse:
  customColors: {
    midnight:     '#022a4e',
    deepAzure:    '#023c70',
    royalBlue:    '#024c8f',
    coreBlue:     '#0375db',
    neonLime:     '#6ec207',
    sunsetOrange: '#ff6500',
    crimson:      '#bb1954',
    lightAlloy:   '#dbdbdb',
    bodyText:     '#1A1A2E',
    secondaryText:'#667085',
    claimGray:    '#848484',
  },
}
```

**¿Por qué `customColors`?** MUI permite extender el objeto palette con keys custom. Vuexy ya usa `customColors` internamente para colores extra. Esto permite acceder a `theme.palette.customColors.midnight` desde cualquier componente via `useTheme()` o `sx` prop, sin crear CSS custom properties paralelas.

### 16.3 Dónde inyectar la tipografía Efeonce

Vuexy usa Inter como font default. Efeonce usa DM Sans (cuerpo) + Poppins (títulos). El cambio se hace en dos lugares:

**1. Google Fonts — agregar en `src/app/layout.tsx` o `_document.tsx`:**

```typescript
import { DM_Sans, Poppins } from 'next/font/google'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-dm-sans',
})

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-poppins',
})

// En el <body> o root layout:
<body className={`${dmSans.variable} ${poppins.variable}`}>
```

**2. Theme typography — en el mismo `src/theme/index.ts`:**

```typescript
typography: {
  fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, -apple-system, sans-serif",
  h1: {
    fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
    fontWeight: 800,
    fontSize: '2rem',       // 32px
    lineHeight: 1.2,
  },
  h2: {
    fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
    fontWeight: 700,
    fontSize: '1.5rem',     // 24px
    lineHeight: 1.25,
  },
  h3: {
    fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
    fontWeight: 600,
    fontSize: '1.25rem',    // 20px
    lineHeight: 1.3,
  },
  h4: {
    fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
    fontWeight: 600,
    fontSize: '1rem',       // 16px
    lineHeight: 1.4,
  },
  body1: {
    fontSize: '1rem',       // 16px
    lineHeight: 1.5,
  },
  body2: {
    fontSize: '0.875rem',   // 14px — tablas, content secundario
    lineHeight: 1.5,
  },
  caption: {
    fontSize: '0.8125rem',  // 13px
    lineHeight: 1.4,
    color: '#667085',
  },
  button: {
    fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
    fontWeight: 600,
    textTransform: 'none',  // Vuexy por defecto puede hacer uppercase — desactivar
  },
  overline: {
    fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
    fontWeight: 600,
    letterSpacing: '1px',
    fontSize: '0.75rem',
  },
}
```

**Reglas tipográficas:**
- Máximo 2 familias: Poppins (títulos, nav, botones) + DM Sans (todo lo demás). Sin excepciones.
- Grift y Lumios Marker NO se usan en el portal — son tipografías de acento editorial/print.
- `textTransform: 'none'` en botones — Vuexy puede forzar uppercase por defecto. Efeonce capitaliza solo primera palabra.
- No usar ALL CAPS excepto overlines cortos (máx. 3 palabras).

### 16.4 Sidebar — el branded element más visible

El sidebar de Vuexy es el componente que más impacto visual tiene. Es donde la marca se siente primero. Vuexy permite configurar el sidebar via `themeConfig.ts` y estilos de layout.

**Archivo: `src/configs/themeConfig.ts`**

```typescript
const themeConfig = {
  // ... otras configs de Vuexy ...
  mode: 'light' as const,           // Light mode por defecto
  skin: 'default' as const,         // 'default' (con sombras) o 'bordered'
  layout: 'vertical' as const,      // Sidebar vertical
  navbarContentWidth: 'wide',
  contentWidth: 'wide',
  disableRipple: false,
}
```

**Sidebar oscuro con colores Efeonce:**

Vuexy permite sidebar con fondo oscuro independiente del mode del contenido. El sidebar debe usar Midnight Navy (`#022a4e`) como fondo — esto se logra via el component override del `VerticalNav` o via CSS targeted:

```css
/* Override del sidebar de Vuexy */
.layout-vertical-nav {
  background-color: #022a4e !important;  /* Midnight Navy */
}

.layout-vertical-nav .nav-link {
  color: rgba(255, 255, 255, 0.8);       /* Texto claro por defecto */
}

.layout-vertical-nav .nav-link.active {
  background-color: rgba(3, 117, 219, 0.16);  /* Core Blue con transparencia */
  color: #FFFFFF;
}

.layout-vertical-nav .nav-link:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

.layout-vertical-nav .nav-section-title {
  color: rgba(255, 255, 255, 0.5);       /* Labels de sección en sidebar */
  text-transform: uppercase;
  font-size: 0.6875rem;
  letter-spacing: 1px;
}
```

**Nota:** si Vuexy expone props de customización del sidebar (como `verticalNavBgColor` en las versiones más recientes), usar esas props en vez de CSS override. Verificar la versión exacta del starter-kit antes de implementar.

**Logo en sidebar:**

El sidebar de Vuexy tiene un slot para logo en la parte superior. Usar la variante **negativo (blanco)** del logotipo de Efeonce sobre el fondo Midnight Navy. Reglas del Brand Guideline v1.0:
- Logo blanco (`#FFFFFF`) sobre Midnight Navy (`#022a4e`) — versión sin claim para sidebar (el espacio no permite el tagline).
- Tamaño mínimo: 120px de ancho. En sidebar colapsado, mostrar solo el isotipo (globo con tres puntos).
- Zona de protección: respetar el espacio mínimo equivalente a la altura de la "e" del wordmark.
- Archivo fuente: usar el SVG oficial del repo. No reconstruir manualmente.

### 16.5 Paleta completa de referencia

Todos los colores que el portal usa, con su mapeo a MUI y su uso funcional.

**Efeonce Core Palette (02) — colores usados en el portal:**

| Nombre Efeonce | Hex | MUI palette key | Uso en portal |
|---|---|---|---|
| Midnight Navy | `#022a4e` | `secondary.dark` / `customColors.midnight` | Sidebar bg, fondos hero, texto de máximo contraste |
| Deep Azure | `#023c70` | `secondary.main` / `customColors.deepAzure` | Logo color, secondary actions, text headers |
| Royal Blue | `#024c8f` | `primary.dark` / `customColors.royalBlue` | Hover/pressed states, bordes activos |
| Core Blue | `#0375db` | `primary.main` | CTAs, links, botones primarios, overlines, iconos activos |
| Neon Lime | `#6ec207` | `success.main` / `customColors.neonLime` | Semáforo "Óptimo", trends positivos |
| Sunset Orange | `#ff6500` | `warning.main` / `customColors.sunsetOrange` | Semáforo "Atención", badges moderados |
| Crimson Magenta | `#bb1954` | `error.main` / `customColors.crimson` | Semáforo "Alerta", errores, badges críticos |

**Colores de soporte (no son de la Core Palette pero el portal los necesita):**

| Nombre | Hex | MUI palette key | Uso |
|---|---|---|---|
| Body Text | `#1A1A2E` | `text.primary` | Texto principal en cuerpo |
| Secondary Text | `#667085` | `text.secondary` | Captions, subtítulos, metadata |
| Claim Gray | `#848484` | `text.disabled` | Timestamps, texto terciario |
| Light Alloy | `#dbdbdb` | `customColors.lightAlloy` | Bordes, separadores, dividers |
| Background | `#F8F9FA` | `background.default` | Fondo general del portal |
| White | `#FFFFFF` | `background.paper` | Cards, superficies elevadas |

**Reglas de color:**
- Nunca usar `#000000` como fondo. Midnight Navy es el tono más oscuro permitido.
- WCAG AA obligatorio: ratio 4.5:1 para texto normal, 3:1 para texto grande.
- Los semáforos usan siempre los mismos 3 colores. Sin excepciones.
- No usar paletas de capabilities (Globe, Reach, Wave) en el portal — es producto institucional.

### 16.6 Semáforo ICO — sistema visual

| Estado | Label | Color | Hex | MUI key | Icono |
|---|---|---|---|---|---|
| Verde | Óptimo | Neon Lime | `#6ec207` | `success` | Check circle / dot |
| Amarillo | Atención | Sunset Orange | `#ff6500` | `warning` | Warning / dot |
| Rojo | Alerta | Crimson Magenta | `#bb1954` | `error` | Alert circle / dot |

**Implementación:** usar `<Chip>` de MUI con `color="success"`, `color="warning"`, o `color="error"` — MUI usa automáticamente los colores del theme. Siempre incluir label de texto (no solo color) por accesibilidad.

### 16.7 Charts — ApexCharts

Vuexy incluye ApexCharts como librería de charts. Los colores de los charts deben alinearse con la paleta Efeonce:

```typescript
// Paleta default para charts del portal
const greenhouseChartColors = {
  primary:   '#0375db',  // Core Blue — serie principal
  secondary: '#024c8f',  // Royal Blue — serie secundaria
  success:   '#6ec207',  // Neon Lime — positivo
  warning:   '#ff6500',  // Sunset Orange — moderado
  error:     '#bb1954',  // Crimson — crítico
  info:      '#023c70',  // Deep Azure — informativo
  neutral:   '#dbdbdb',  // Light Alloy — fondo/baseline
}

// Donut chart de status (ejemplo):
const statusChartOptions = {
  colors: ['#0375db', '#ff6500', '#bb1954', '#6ec207'],
  // Mapeo: En curso → Core Blue, Listo para revisión → Orange,
  //        Cambios Solicitados → Crimson, Listo → Neon Lime
}
```

### 16.8 Lo que NO se toca de Vuexy

Lista explícita para que ningún agente rompa el sistema:

| Archivo / Directorio | Razón |
|---|---|
| `src/@core/` (todo) | Engine de layout, sidebar, navbar, theme provider. Romperlo destruye el responsive y el skin system. |
| `src/@core/theme/overrides/` | Component overrides de MUI que Vuexy calibró para su layout. Sobreescribirlos causa inconsistencias visuales. |
| `src/@core/theme/palette/` | Generador de paleta con light/dark mode. Si se modifica, el dark mode se rompe. |
| `src/@core/layouts/` | Vertical/horizontal layout engine. El sidebar, la navbar y el content area dependen de esto. |
| `src/@core/styles/` | Reset y base styles. Modificarlos afecta a todos los componentes. |
| Breakpoints de MUI | Vuexy tiene breakpoints calibrados para su sidebar collapse. No cambiar. |
| Spacing scale | Vuexy usa la spacing scale default de MUI (factor 8). No cambiar. |

### 16.9 Override consolidado — archivo listo para copiar

Este es el override completo que se aplica dentro del merge de `src/theme/index.ts`. Consolida todo lo de las secciones 15.2, 15.3 y 15.5. El agente no necesita armar nada — copia este objeto y lo inserta en el `deepmerge` o `createTheme` que Vuexy ya tiene.

**Instrucción para el agente:** buscar en `src/theme/index.ts` el punto donde Vuexy hace merge de su theme (puede ser un `deepmerge`, `createTheme` o un spread de overrides). Insertar este objeto ahí. NO crear un archivo de theme separado.

```typescript
// ====================================================================
// EFEONCE GREENHOUSE — Theme Override
// Insertar en src/theme/index.ts dentro del merge existente de Vuexy
// NO crear archivo separado. NO hacer createTheme() independiente.
// ====================================================================

const efeonceOverrides = {
  palette: {
    // --- Primarios ---
    primary: {
      main:  '#0375db',   // Core Blue — CTAs, links, botones primarios
      light: '#3691e3',   // Core Blue lightened — hover states
      dark:  '#024c8f',   // Royal Blue — pressed states, bordes activos
    },
    secondary: {
      main:  '#023c70',   // Deep Azure — secondary actions, logo
      light: '#035a9e',
      dark:  '#022a4e',   // Midnight Navy — sidebar, fondos hero
    },

    // --- Semánticos (mapean a semáforos ICO) ---
    success: { main: '#6ec207' },    // Neon Lime → "Óptimo"
    warning: { main: '#ff6500' },    // Sunset Orange → "Atención"
    error:   { main: '#bb1954' },    // Crimson Magenta → "Alerta"

    // --- Fondos ---
    background: {
      default: '#F8F9FA',  // Fondo general (no blanco puro)
      paper:   '#FFFFFF',  // Cards, superficies elevadas
    },

    // --- Texto ---
    text: {
      primary:   '#1A1A2E',  // Body text
      secondary: '#667085',  // Captions, metadata
      disabled:  '#848484',  // Claim gray, timestamps
    },

    // --- Custom tokens Efeonce ---
    // Accesibles via theme.palette.customColors.midnight, etc.
    customColors: {
      midnight:      '#022a4e',
      deepAzure:     '#023c70',
      royalBlue:     '#024c8f',
      coreBlue:      '#0375db',
      neonLime:      '#6ec207',
      sunsetOrange:  '#ff6500',
      crimson:       '#bb1954',
      lightAlloy:    '#dbdbdb',
      bodyText:      '#1A1A2E',
      secondaryText: '#667085',
      claimGray:     '#848484',
    },
  },

  typography: {
    // Body default: DM Sans
    fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui, -apple-system, sans-serif",

    // Títulos: Poppins
    h1: {
      fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
      fontWeight: 800,
      fontSize: '2rem',        // 32px
      lineHeight: 1.2,
    },
    h2: {
      fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
      fontWeight: 700,
      fontSize: '1.5rem',      // 24px
      lineHeight: 1.25,
    },
    h3: {
      fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
      fontWeight: 600,
      fontSize: '1.25rem',     // 20px
      lineHeight: 1.3,
    },
    h4: {
      fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
      fontWeight: 600,
      fontSize: '1rem',        // 16px
      lineHeight: 1.4,
    },
    body1: {
      fontSize: '1rem',        // 16px
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',    // 14px — tablas, content secundario
      lineHeight: 1.5,
    },
    caption: {
      fontSize: '0.8125rem',   // 13px
      lineHeight: 1.4,
      color: '#667085',
    },
    button: {
      fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
      fontWeight: 600,
      textTransform: 'none' as const,  // Desactivar uppercase de Vuexy
    },
    overline: {
      fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif",
      fontWeight: 600,
      letterSpacing: '1px',
      fontSize: '0.75rem',
    },
  },
}
```

**Archivo complementario — `src/configs/primaryColorConfig.ts`:**

```typescript
const primaryColorConfig = [
  {
    name: 'efeonce-core',
    main:  '#0375db',
    light: '#3691e3',
    dark:  '#024c8f',
  },
]

export default primaryColorConfig
```

**Archivo complementario — font loading en `src/app/layout.tsx`:**

```typescript
import { DM_Sans, Poppins } from 'next/font/google'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-dm-sans',
})

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-poppins',
})

// En el return del layout:
<body className={`${dmSans.variable} ${poppins.variable}`}>
```

**Archivo complementario — sidebar CSS (`src/styles/greenhouse-sidebar.css`):**

```css
/* Sidebar branded — importar en layout o en globals.css */
.layout-vertical-nav {
  background-color: #022a4e !important;
}

.layout-vertical-nav .nav-link {
  color: rgba(255, 255, 255, 0.8);
}

.layout-vertical-nav .nav-link.active {
  background-color: rgba(3, 117, 219, 0.16);
  color: #FFFFFF;
}

.layout-vertical-nav .nav-link:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

.layout-vertical-nav .nav-section-title {
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  font-size: 0.6875rem;
  letter-spacing: 1px;
}
```

**Nota:** si Vuexy expone props de customización del sidebar (como `verticalNavBgColor`), usar esas props en vez del CSS. Verificar la versión exacta del starter-kit.

### 16.10 Resumen: archivos a tocar para implementar la marca

Checklist para un agente que va a aplicar el branding Efeonce al portal:

| # | Archivo | Qué hacer | Impacto |
|---|---|---|---|
| 1 | `src/configs/primaryColorConfig.ts` | Reemplazar contenido con el bloque de la sección 16.9 | Color primario global |
| 2 | `src/configs/themeConfig.ts` | Confirmar `mode: 'light'`, `skin: 'default'`, `layout: 'vertical'` | Layout base |
| 3 | `src/theme/index.ts` | Insertar `efeonceOverrides` de la sección 16.9 en el merge existente. **No crear archivo nuevo.** | Colores y tipografía globales |
| 4 | `src/app/layout.tsx` | Copiar el bloque de font loading de la sección 16.9 | Carga de fonts |
| 5 | `src/styles/greenhouse-sidebar.css` | Crear con el CSS de sidebar de la sección 16.9. Importar en layout o globals.css | Sidebar branded |
| 6 | Sidebar logo slot | Colocar SVG blanco del logotipo Efeonce en el slot de logo del `VerticalNav`. Isotipo solo en sidebar colapsado. | Logo en sidebar |
| 7 | `src/config/greenhouse-nomenclature.ts` | Crear con las constantes de la sección 13 de este documento | Copy y labels |
| 8 | Chart configs | Usar `greenhouseChartColors` (sección 16.7) como paleta default en ApexCharts | Charts on-brand |

**Orden de ejecución recomendado:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Los pasos 1-4 son el theme base. Los pasos 5-6 son el sidebar. Los pasos 7-8 son contenido.

**Anti-patrones que el agente debe evitar:**
- ❌ Crear `greenhouse-theme.ts` o `efeonce-theme.ts` como archivo independiente
- ❌ Hacer `createTheme()` fuera del sistema de Vuexy
- ❌ Sobreescribir archivos en `src/@core/`
- ❌ Cambiar breakpoints, spacing scale o dark mode logic de Vuexy
- ❌ Importar una paleta de capability (Globe, Reach, Wave) en el portal

---

## 17. Documentos relacionados

Este documento no opera en aislamiento. Referencia cruzada con el ecosistema documental de Efeonce:

| Documento | Relación con este doc | Cuándo consultarlo |
|---|---|---|
| **Greenhouse Portal Spec v1.0** | Define arquitectura técnica, rutas, queries BigQuery, API routes. Este doc define cómo se ve y se lee lo que esa spec construye. | Antes de implementar cualquier vista o API route |
| **Greenhouse Sistema de Experiencia v1.0** | Define el journey completo de 8 fases + momentos de marca. Este doc traduce esos momentos al portal. | Para entender el contexto de cada sección del portal |
| **Brand Guideline v1.0** | Define identidad visual completa (5 paletas, 4 familias tipográficas, logotipo). Este doc extrae el subset para el portal. | Si se necesitan colores fuera de la Core Palette o tipografías de acento |
| **Brand Voice, Tone & Personality v1.0** | Define cómo suena Efeonce. La sección 14 de este doc aplica esa voz al microcopy del portal. | Para validar tono de cualquier copy nuevo |
| **Editorial Style Guide v1.0** | Reglas de capitalización, nomenclatura oficial, formato por canal. | Para verificar capitalización y naming de términos Efeonce |

---

*Efeonce Greenhouse™ · Efeonce Group · Marzo 2026*

*Documento de referencia para implementación. Su nomenclatura, microcopy y design system son normativos para el portal.*

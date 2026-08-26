# Greenhouse UI Platform — Forms, Calendar, Date & Upload

> Parte de **Greenhouse UI Platform**. Índice + mapa "dónde vive X": [README.md](./README.md).
> Estado **vigente** (spec actual). Historial cronológico (deltas datados): [HISTORIAL.md](./HISTORIAL.md).
> Autoridad final = runtime; si este doc difiere del código, gana el runtime y este doc se actualiza (modelo 3 capas, ver `design-system-governance`).
> Arquitectura de formularios, calendario, manejo de fechas, rich text, drag&drop y file upload.

---

## Form Architecture

### Situación actual (deuda técnica)

30+ forms en el portal usan `useState` manual:

```typescript
// Patrón actual — verbose, sin validación declarativa
const [email, setEmail] = useState('')
const [error, setError] = useState('')
const handleSubmit = async () => {
  if (!email) { setError('required'); return }
  // ... submit
}
```

### Patrón objetivo con react-hook-form

```typescript
// Patrón enterprise — declarativo, performante
const { register, handleSubmit, formState: { errors, isDirty } } = useForm<FormValues>({
  defaultValues: { email: '' }
})
const onSubmit = handleSubmit(async (data) => { /* ... */ })
// isDirty tracking automático, no re-render por keystroke
```

### Activación real inicial

- `src/views/Login.tsx`
  - migrado a `react-hook-form` como referencia canónica para credenciales
  - **TASK-130**: loading states enterprise-grade, transición post-auth, errores categorizados
- `src/app/(blank-layout-pages)/auth/forgot-password/page.tsx`
  - migrado a `react-hook-form` como segundo ejemplo liviano de auth form
- Helper canónico inicial:
  - `src/lib/forms/greenhouse-form-patterns.ts`
- Regla práctica vigente:
  - wrappers MUI/Vuexy + helpers reutilizables primero
  - no introducir schemas pesados mientras no exista una necesidad real de Zod/Yup

### Auth form loading states & transitions (TASK-130)

Login.tsx implementa un flujo de estados completo para auth:

| Estado | UI | Interacción |
|--------|-----|-------------|
| **Idle** | Form activo, botones habilitados | Usuario puede interactuar |
| **Validating** | `LoadingButton` con spinner, `LinearProgress` top, inputs deshabilitados | Todo deshabilitado |
| **SSO Loading** | Botón SSO con `CircularProgress` + "Redirigiendo a {provider}...", `LinearProgress` | Todo deshabilitado |
| **Transitioning** | Logo + spinner + "Preparando tu espacio de trabajo...", form oculto | Sin interacción |
| **Error** | `Alert` con severity categorizada + botón cerrar, form re-habilitado | Reintentar |

Componentes MUI usados:
- `LoadingButton` (`@mui/lab`) — botón credenciales con spinner integrado
- `CircularProgress` (`@mui/material`) — loading individual por SSO provider
- `LinearProgress` (`@mui/material`) — señal global indeterminada en top del card
- `Alert` con `onClose` — errores categorizados con severity warning/error

Error categorization (`mapAuthError`):
- `CredentialsSignin` → `login_error_credentials` (severity: error)
- `AccessDenied` → `login_error_account_disabled` (severity: error)
- `SessionRequired` → `login_error_session_expired` (severity: error)
- fetch/network errors → `login_error_network` (severity: warning)
- provider timeout → `login_error_provider_unavailable` (severity: warning)

Loading skeleton para resolución de sesión:
- `src/app/auth/landing/loading.tsx` — Next.js loading convention, logo + spinner + "Preparando tu espacio de trabajo..."
- Elimina pantalla en blanco entre login exitoso y dashboard

### Reglas de adopción

1. **Nuevos forms** → siempre `react-hook-form`
2. **Forms existentes** → migrar cuando se toquen por otra task (no migrar proactivamente)
3. **Forms de 1-2 campos** → `useState` sigue siendo aceptable
4. **Validación** → `@hookform/resolvers` con schemas inline (no Zod — no está instalado)


## Estado de un control — nombre accesible y campo congelado (TASK-1751)

Tres contratos de control de formulario, **domain-free**, medidos en vivo el 2026-08-26 sobre la
superficie de rendición de assessment. Los tres pasaban `lint`, `typecheck`, `build` y la suite del
dominio en verde; ninguno era visible leyendo el diff.

### 1. Un `placeholder` NUNCA es el nombre accesible de un campo

El `placeholder` es **texto de ejemplo dentro de la caja**: desaparece al primer carácter, no lo
anuncian todos los modos de lectura y no sobrevive al autocompletado. Un control cuya única
identificación es el placeholder **no tiene nombre accesible** — para un lector de pantalla es "campo
de texto, sin etiqueta".

- **SIEMPRE** todo control de formulario declara su nombre por `<label for>` (o label envolvente) o,
  cuando la composición no admite label visible, por `aria-label` / `aria-labelledby` propio.
- **El `placeholder` queda para el EJEMPLO DE FORMATO** (`+56 9 1234 5678`, `nombre@empresa.cl`),
  nunca para decir qué es el campo.
- El texto del nombre es **copy**: sale de `src/lib/copy/*` como cualquier string visible (bilingüe
  donde la superficie lo sea), no un literal en JSX.

**Cómo se descubre (y por qué llevaba años sin verse):** mientras el placeholder está presente, axe
resuelve el nombre accesible desde él y el check `label` pasa. El defecto sólo se destapó al **ocultar
el placeholder en solo lectura** — un campo congelado no puede invitar a escribir — y ahí el textarea
se quedó sin ningún nombre y axe lo marcó. Corolario: **un check `label` verde no prueba que exista
una etiqueta**; prueba que existe *algún* texto del que colgar el nombre, y el placeholder es el peor.

> Evidencia: `src/components/greenhouse/hiring/assessment/AssessmentTakingClient.tsx:743-744`
> (`aria-label` propio + placeholder condicionado a que el campo sea editable).

### 2. Un campo congelado necesita señal visual PROPIA

Al pasar un control de `disabled` a `readOnly`, **el gris lo ponía el navegador**: era el estilo de UA
para `:disabled`, no una regla del módulo. Con `readOnly` ese estilo desaparece y el campo **parece
editable** — invita a escribir y no responde.

- Si un módulo/`sx` **no declara `:disabled`, tampoco declara `:read-only`**. Hay que agregar la regla
  explícita al hacer el cambio; no hay herencia entre ambos estados.
- La señal es del estado, no decorativa: fondo alterno, borde distinto (p. ej. `dashed`), texto
  secundario, `cursor: default` y `resize: none` en un `textarea`.
- Sigue siendo **contenido legible**: el contraste del texto congelado responde al piso AA (4.5:1),
  no al token `--text-disabled`.

> Evidencia: `src/components/greenhouse/hiring/assessment/AssessmentTaking.module.css:627`
> (`.textArea:read-only`, agregada junto con el cambio de `disabled` → `readOnly`).

### 3. `readOnly` sobre `disabled` es una decisión de accesibilidad, no de estilo

`disabled` saca el control del **tab order** y lo marca como no disponible: no se puede enfocar,
seleccionar ni copiar con el teclado, y los modos de interacción de lector de pantalla lo saltan.
Para un campo cuyo contenido el usuario **debe poder releer o copiar** — una respuesta ya escrita, un
dato calculado, un valor congelado por una ventana de tiempo — `disabled` es la opción **incorrecta**:
le esconde su propio dato.

| Intención | Atributo |
|---|---|
| El valor debe poder leerse/copiarse, pero no editarse | `readOnly` |
| El control no aplica en este estado y su valor no importa | `disabled` |

**Matiz de spec HTML (no es una inconsistencia — hay que declararlo):** `readonly` **no aplica** a
`<input type="checkbox">`, `type="radio"`, `range`, `color`, `file` ni a los `type` de botón. En un
grupo mixto, la forma correcta es **asimétrica**: `readOnly` en los campos de texto y `disabled` en
las opciones. Al escribir esa asimetría, dejarla comentada — de lo contrario el siguiente lector la
"unifica" y rompe la lectura del texto.

> Evidencia: mismo componente — `readOnly` en el `textarea`
> (`AssessmentTakingClient.tsx:746`) y `disabled` en las opciones `checkbox`/`radio`
> (`AssessmentTakingClient.tsx:701,728`).


## Calendar Architecture

### Capacidad disponible (sin usar)

FullCalendar está instalado con 6 paquetes:
- `@fullcalendar/core` — motor
- `@fullcalendar/react` — wrapper React
- `@fullcalendar/daygrid` — vista mes/semana
- `@fullcalendar/timegrid` — vista día con horas
- `@fullcalendar/list` — vista lista
- `@fullcalendar/interaction` — drag, resize, click

### Casos de uso en el portal

| Módulo | Vista | Eventos |
|--------|-------|---------|
| HR / Leave | Calendario de permisos | Leave requests, aprobaciones |
| Payroll | Deadlines operativos | Cierre, cálculo, exportación por período |
| Delivery | Timeline de sprints | Ciclos, milestones, deadlines |
| Calendario operativo | Vista unificada | `src/lib/calendar/operational-calendar.ts` ya existe |

### Reglas de adopción

1. Usar `@fullcalendar/react` como wrapper
2. Eventos vienen de server components (no fetch client-side)
3. Colores del semáforo Greenhouse para estados de eventos
4. Locale `es` para labels en español
5. No mezclar con MUI DatePicker para selección de fechas (FullCalendar es para visualización)

### Activación real inicial

- Wrapper canónico:
  - `src/components/greenhouse/GreenhouseCalendar.tsx`
- Primera vista real:
  - `src/app/(dashboard)/admin/operational-calendar/page.tsx`
  - `src/views/greenhouse/admin/AdminOperationalCalendarView.tsx`
- Fuente de datos inicial:
  - `src/lib/calendar/get-admin-operational-calendar-overview.ts`
  - reutiliza `operational-calendar.ts` + `nager-date-holidays.ts`


## Date Handling

### Librerías disponibles

| Librería | Para qué | Cuándo usar |
|----------|----------|-------------|
| `date-fns` | Formateo, parsing, cálculos | Lógica de negocio, formateo en server |
| `react-datepicker` | Input de fecha en forms | Override expiration, filtros de rango |
| `@fullcalendar` | Visualización de calendario | Vistas de calendario completas |

### Timezone canónica

- Base: `America/Santiago` vía IANA del runtime
- Feriados: `Nager.Date` + overrides en Greenhouse
- Helper canónico: `src/lib/calendar/operational-calendar.ts`

### Date picker canónico inicial

- Wrapper:
  - `src/components/greenhouse/GreenhouseDatePicker.tsx`
- Primer uso real:
  - selector mensual en `AdminOperationalCalendarView`
- Criterio:
  - usar este wrapper para inputs de fecha del portal antes de introducir inputs manuales


## Rich Text (disponible, sin activar)

Tiptap está instalado con 10 paquetes pero sin uso. Potencial para:
- Notas en fichas de persona
- Descripciones de proyectos
- Templates de notificación
- Comentarios en revisiones

No activar hasta que un caso de uso lo requiera explícitamente.


## Drag and Drop (disponible, sin activar)

`@formkit/drag-and-drop` está instalado. Potencial para:
- Reorder de vistas en sidebar (TASK-136)
- Kanban de tareas en Delivery
- Priorización visual de backlog
- Reorder de KPIs en dashboards

Activar cuando un caso de uso lo requiera.

### Activación real inicial

- Wrapper canónico:
  - `src/components/greenhouse/GreenhouseDragList.tsx`
- Primer uso real:
  - reorder local de domain cards en `src/views/greenhouse/admin/AdminCenterView.tsx`
- Persistencia inicial:
  - `localStorage`
- Evolución esperada:
  - mover a preferencias de usuario cuando exista contrato shared de layout personalization


## File Upload (disponible, sin activar)

`react-dropzone` está instalado. Potencial para:
- Upload de documentos en HRIS (TASK-027)
- Avatars de usuario
- Attachments en expense reports (TASK-028)
- Import de CSVs


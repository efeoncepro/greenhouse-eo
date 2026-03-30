# TASK-137 — UI Foundation Activation: react-hook-form, FullCalendar, DatePicker, Drag & Drop

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `complete` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Medio` |
| Status real | `Cerrada` |
| Rank | — |
| Domain | UI Platform / Cross-module |
| Sequence | Independiente, habilita TASK-136, TASK-130, TASK-005 |

## Summary

Greenhouse tiene 12 librerías UI instaladas en `package.json` que no se usan. 4 de ellas tienen potencial alto para mejorar la calidad, performance y UX del portal de forma transversal. Esta task activa las 4 con patrones canónicos, ejemplos reales, y reglas de adopción documentadas.

## Delta 2026-03-30

- `TASK-137` pasó a `in-progress`.
- Slice ya activado en repo:
  - `react-hook-form` migrado en `Login` y `Forgot Password`
  - `GreenhouseDatePicker` creado y usado en `/admin/operational-calendar`
  - `GreenhouseCalendar` creado y usado en `/admin/operational-calendar`
  - `GreenhouseDragList` creado y usado para reorder local de domain cards en `Admin Center`
  - `src/lib/forms/greenhouse-form-patterns.ts` creado como helper canónico inicial
- Arquitectura UI a alinear con este slice:
  - `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- Gap real abierto:
  - faltan tests específicos del nuevo slice y la adopción adicional futura de estos patrones en otros módulos

## Why This Task Exists

Auditoría del 2026-03-30 encontró:

| Librería | Instalada | Archivos que la usan | Problema |
|----------|-----------|---------------------|----------|
| `react-hook-form` + `@hookform/resolvers` | Si | **0** | 30+ forms con `useState` manual, sin validación declarativa |
| `@fullcalendar/*` (6 paquetes) | Si | **0** | No hay vista de calendario en ningún módulo |
| `react-datepicker` | Si | **1** | Date pickers manuales o inexistentes |
| `@formkit/drag-and-drop` | Si | **0** | No hay interacción drag-and-drop |

Esto significa que pagamos el costo de bundle de estas librerías sin obtener valor. Peor: los developers reimplementan manualmente lo que estas librerías ya resuelven.

## Architecture Alignment

Documento de referencia creado: `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

## Dependencies & Impact

- **Depende de:** Nada — las librerías ya están en `package.json`
- **Impacta a:**
  - TASK-136 (View Access Governance) — usa react-hook-form para override dialog
  - TASK-130 (Login UX) — usa react-hook-form para login form
  - TASK-005 (Attendance/Leave) — usa FullCalendar para leave management
  - TASK-117 (Payroll Last Business Day) — usa FullCalendar para deadline visualization
  - Todos los forms futuros del portal

## Scope

### Slice 1 — react-hook-form: Canonical Pattern + First Migration (~3h)

**Objetivo:** Establecer el patrón canónico de forms en Greenhouse y migrar 2-3 forms existentes como referencia.

#### 1a. Patrón canónico

Crear `src/lib/forms/greenhouse-form-patterns.ts` con:

```typescript
// Validation helpers reutilizables (sin Zod — no instalado)
export const required = (value: string) => value.trim() ? true : 'Campo requerido'
export const email = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? true : 'Correo no válido'
export const minLength = (min: number) => (value: string) => value.length >= min ? true : `Mínimo ${min} caracteres`
export const dateInFuture = (value: Date | null) => value && value > new Date() ? true : 'La fecha debe ser futura'
```

#### 1b. Primera migración: Login form (`src/views/Login.tsx`)

De:
```typescript
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [error, setError] = useState('')
const [isSubmitting, setIsSubmitting] = useState(false)
```

A:
```typescript
const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
  defaultValues: { email: '', password: '' }
})
```

Beneficios: isDirty tracking, no re-render por keystroke, error messages inline, disabled automático durante submit.

#### 1c. Segunda migración: Override dialog (TASK-136)

Form con validación compleja: user selector required, view required, reason required, date in future if not permanent.

#### 1d. Documentación en GREENHOUSE_UI_PLATFORM_V1.md

- Cuándo usar RHF vs useState
- Patrón de validación (sin Zod)
- Integración con MUI CustomTextField

### Slice 2 — FullCalendar: Wrapper + First Calendar View (~3h)

**Objetivo:** Crear un wrapper Greenhouse para FullCalendar y la primera vista de calendario real.

#### 2a. Wrapper component

Crear `src/components/greenhouse/GreenhouseCalendar.tsx`:

```typescript
// Wrapper que aplica:
// - Locale 'es' por defecto
// - Colores del semáforo Greenhouse
// - Header con navegación mes/semana/día/lista
// - Responsive: vista lista en mobile
// - Timezone: America/Santiago
```

#### 2b. Primera vista: Calendario operativo en Ops Health o Payroll

Opción A — **Payroll deadlines**: muestra cierre, cálculo, exportación por período
Opción B — **Calendario operativo**: usa `operational-calendar.ts` para mostrar feriados + hitos
Opción C — **Leave calendar** (requiere TASK-005): muestra permisos del equipo

Recomendación: Opción B — el calendario operativo ya tiene data source (`operational-calendar.ts` + `nager-date-holidays.ts`).

#### 2c. Integración con FullCalendar events

```typescript
interface GreenhouseCalendarEvent {
  id: string
  title: string
  start: Date
  end?: Date
  color: string      // semáforo Greenhouse
  type: 'holiday' | 'deadline' | 'leave' | 'milestone'
  metadata?: Record<string, unknown>
}
```

### Slice 3 — react-datepicker: Wrapper + Adoption (~1.5h)

**Objetivo:** Crear un wrapper Greenhouse para DatePicker integrado con MUI y adoptarlo en los puntos críticos.

#### 3a. Wrapper component

Crear `src/components/greenhouse/GreenhouseDatePicker.tsx`:

```typescript
// Wrapper que aplica:
// - Estilizado MUI (outlined input con border radius 8px)
// - Locale 'es' con date-fns
// - Formato DD/MM/YYYY (Chile)
// - Range mode para filtros
// - Min/max date constraints
// - Integración con react-hook-form via Controller
```

#### 3b. Puntos de adopción inmediatos

| Ubicación | Tipo | Reemplaza |
|-----------|------|-----------|
| Override expiration (TASK-136) | Single date + "Permanente" checkbox | Input manual |
| Finance income/expense filters | Date range | Query params manuales |
| Payroll period selector | Month picker | Select dropdown |

### Slice 4 — @formkit/drag-and-drop: Pattern + First Use (~1.5h)

**Objetivo:** Crear el patrón canónico de drag-and-drop y primer uso real.

#### 4a. Patrón canónico

Crear `src/components/greenhouse/GreenhouseDragList.tsx`:

```typescript
// Wrapper que aplica:
// - useDragAndDrop de @formkit/drag-and-drop
// - Estilizado MUI (outlined cards como items)
// - Handle icon (tabler-grip-vertical)
// - onChange callback con nuevo orden
// - Accessibility: aria-grabbed, aria-dropeffect
```

#### 4b. Primer uso: Reorder de KPIs en Admin Center

Permitir que el admin reordene las domain cards de Admin Center landing. Guardar orden en `localStorage` (v1) o en preferencias de usuario (v2).

## Reglas de Adopción (transversal)

### Cuándo usar cada librería

```
Form con 3+ campos o validación compleja?
  → react-hook-form

Form con 1-2 campos sin validación?
  → useState (no over-engineer)

Necesitas un input de fecha?
  → GreenhouseDatePicker (react-datepicker wrapper)

Necesitas mostrar un calendario con eventos?
  → GreenhouseCalendar (FullCalendar wrapper)

Necesitas reordenar items con drag?
  → GreenhouseDragList (@formkit/drag-and-drop wrapper)

Necesitas un editor de texto rico?
  → Esperar — Tiptap disponible pero sin caso de uso urgente
```

### Migración gradual (no Big Bang)

1. **Nuevos forms** → siempre react-hook-form
2. **Forms existentes** → migrar cuando se toquen por otra task
3. **No migrar proactivamente** forms que funcionan y no se van a tocar

## Out of Scope

- Migrar TODOS los forms existentes a RHF (migración gradual)
- Tiptap activation (sin caso de uso urgente)
- react-dropzone activation (sin upload flow urgente)
- react-player activation (Creative Hub futuro)
- Redux adoption (no necesario)
- Tailwind runtime (PostCSS only)

## Acceptance Criteria

- [x] `GreenhouseCalendar` wrapper creado con locale es, colores semáforo, responsive
- [x] Al menos 1 vista de calendario real en el portal
- [x] `GreenhouseDatePicker` wrapper creado con integración MUI + RHF-ready
- [x] Login form migrado a react-hook-form como referencia canónica
- [x] Al menos 1 form adicional migrado a react-hook-form
- [x] `GreenhouseDragList` wrapper creado con patrón de reorder
- [x] Al menos 1 uso real de drag-and-drop en el portal
- [x] Form validation helpers canónicos en `src/lib/forms/`
- [x] `GREENHOUSE_UI_PLATFORM_V1.md` actualizado con patrones finales
- [x] `pnpm build` pasa
- [x] `pnpm test` pasa (124 archivos, 598 tests)

## File Reference

| Archivo | Propósito |
|---------|-----------|
| `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` | Referencia canónica de UI (creado) |
| `src/lib/forms/greenhouse-form-patterns.ts` | Validación y helpers de forms (nuevo) |
| `src/components/greenhouse/GreenhouseCalendar.tsx` | Wrapper FullCalendar (nuevo) |
| `src/components/greenhouse/GreenhouseDatePicker.tsx` | Wrapper DatePicker (nuevo) |
| `src/components/greenhouse/GreenhouseDragList.tsx` | Wrapper Drag & Drop (nuevo) |
| `src/views/Login.tsx` | Migración a react-hook-form (modificar) |

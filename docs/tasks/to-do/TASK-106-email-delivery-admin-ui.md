# TASK-106 — Email Delivery Admin UI

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `to-do` |
| Priority | `P2` |
| Impact | `Medio` |
| Effort | `Medio` |
| Status real | `Diseño completo` |
| Domain | `platform` |

## Summary

Tab "Correos" en Control Tower con observabilidad operativa de la capa centralizada de email delivery (TASK-095). Dos sub-tabs: Historial (audit trail de envios con KPIs + tabla filtrable) y Suscripciones (CRUD de quién recibe qué tipo de correo).

## Why This Task Exists

La capa `sendEmail()` de TASK-095 registra cada envio en `email_deliveries` y resuelve recipients desde `email_subscriptions`, pero no hay UI para:
- ver que emails se enviaron y cuales fallaron
- gestionar suscriptores sin tocar la base de datos
- diagnosticar errores de entrega

El equipo interno (3-4 personas) necesita esta visibilidad.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` — seccion 15, contrato email

## Dependencies & Impact

### Depends on

- `TASK-095` (complete) — capa centralizada de email delivery, tablas `email_deliveries` y `email_subscriptions`

### Impacts to

- Navegacion de Control Tower (nuevo tab)
- `src/config/greenhouse-nomenclature.ts` — nuevos labels

### Files owned

- `src/app/(dashboard)/admin/email-delivery/page.tsx`
- `src/views/greenhouse/admin/EmailDeliveryView.tsx`
- `src/views/greenhouse/admin/EmailDeliveryHistoryTab.tsx`
- `src/views/greenhouse/admin/EmailDeliverySubscriptionsTab.tsx`
- `src/views/greenhouse/admin/EmailDeliveryDetailDrawer.tsx`
- `src/app/api/admin/email-deliveries/route.ts`
- `src/app/api/admin/email-subscriptions/route.ts`

## UX Specification

### Navegacion

Tab "Correos" en Control Tower, icono `tabler-mail-cog`, ruta `/admin/email-delivery`.

2 sub-tabs via `CustomTabList`:
1. **Historial** (`tabler-mail-check`) — default
2. **Suscripciones** (`tabler-mail-star`)

### Tab Historial — Layout

```
┌─────────────────────────────────────────────────────────────┐
│  [Historial]  [Suscripciones]                               │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ send-2   │ │ checks   │ │ alert-   │ │ clock-pause  │   │
│  │ 47       │ │ 95%      │ │ 2        │ │ 1            │   │
│  │ Enviados │ │ Entrega  │ │ Fallidos │ │ Pendientes   │   │
│  │ hoy      │ │          │ │          │ │ de reintento │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
│     info         success       error        warning         │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ CardHeader: "Historial de envíos"                      │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ [Tipo ▾]  [Dominio ▾]  [Estado ▾]  [🔍 Buscar...]    │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ Tipo │ Destinatario │ Asunto │ Estado │ Int. │ Fecha  │ │
│  │ ─────┼──────────────┼────────┼────────┼──────┼─────── │ │
│  │ 🔑   │ julio@...    │ Resta… │ ✓ Env  │  1   │ 13:04  │ │
│  │ 💰   │ finance@...  │ Nómin… │ ✓ Env  │  1   │ 13:01  │ │
│  │ ✉️   │ nuevo@...    │ Te in… │ ✗ Fal  │  2   │ 11:30  │ │
│  │ ──── Paginación ─────────────────────────────────────  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### KPI cards — `HorizontalWithAvatar`

| KPI | title | avatarIcon | avatarColor |
|-----|-------|-----------|-------------|
| Enviados hoy | `Enviados hoy` | `tabler-send-2` | `info` |
| Tasa de entrega | `Entrega` | `tabler-checks` | `success` |
| Fallidos | `Fallidos` | `tabler-alert-circle` | `error` |
| Pendientes retry | `Pendientes de reintento` | `tabler-clock-pause` | `warning` |

Grid: `xs={12} sm={6} md={3}`, `spacing={6}`.

Tooltips:
- Enviados hoy: `Total de correos procesados en las últimas 24 horas`
- Entrega: `Porcentaje de correos enviados vs. procesados (últimos 7 días)`
- Fallidos: `Correos con error de entrega en las últimas 24 horas`
- Pendientes de reintento: `Correos fallidos con menos de 3 intentos, esperando reintento automático`

### Tabla — TanStack React Table (patron InvoiceListTable)

Columnas:

| Header | Campo | Width | Render |
|--------|-------|-------|--------|
| Tipo | email_type | 12% | CustomAvatar icon + tooltip |
| Destinatario | recipient_email | 22% | Email + nombre (body2 + caption) |
| Asunto | subject | 28% | Truncado, tooltip full |
| Estado | status | 12% | CustomChip tonal small |
| Intentos | attempt_number | 8% | Mono si > 1 |
| Fecha | created_at | 12% | Relativo + tooltip absoluto |
| Acciones | — | 6% | OptionMenu |

Status mapping:

```typescript
const EMAIL_STATUS_MAP = {
  sent:    { label: 'Enviado',   color: 'success', icon: 'tabler-check' },
  failed:  { label: 'Fallido',   color: 'error',   icon: 'tabler-x' },
  pending: { label: 'Pendiente', color: 'warning',  icon: 'tabler-clock' },
  skipped: { label: 'Omitido',   color: 'secondary', icon: 'tabler-minus' }
}
```

Email type mapping:

```typescript
const EMAIL_TYPE_MAP = {
  password_reset:  { label: 'Contraseña',    icon: 'tabler-key',          color: 'warning' },
  invitation:      { label: 'Invitación',    icon: 'tabler-user-plus',    color: 'info' },
  verify_email:    { label: 'Verificación',  icon: 'tabler-shield-check', color: 'primary' },
  payroll_export:  { label: 'Cierre nómina', icon: 'tabler-file-invoice', color: 'success' },
  payroll_receipt: { label: 'Recibo nómina', icon: 'tabler-receipt',      color: 'success' },
  notification:    { label: 'Notificación',  icon: 'tabler-bell',         color: 'primary' }
}
```

Domain mapping:

```typescript
const EMAIL_DOMAIN_MAP = {
  identity: 'Identidad',
  payroll:  'Nómina',
  finance:  'Finanzas',
  hr:       'Personas',
  delivery: 'Delivery',
  system:   'Sistema'
}
```

Filtros (patron TableFilters): 3 dropdowns (Tipo, Dominio, Estado) en Grid md={4} + DebouncedInput con placeholder `Buscar por destinatario o asunto...`

Row actions (OptionMenu):
- `Ver detalle` → abre drawer
- `Reintentar envío` (solo si status=failed y attempt_number < 3)

### Drawer de detalle — MUI Drawer right 420px

Campos:

| Label | Campo | Formato |
|-------|-------|---------|
| Tipo | email_type | Label del map |
| Dominio | domain | Label del map |
| Destinatario | recipient_email | Email completo |
| Asunto | subject | Completo, word-wrap |
| Adjuntos | has_attachments | Sí / No |
| ID de entrega | resend_id | Mono, — si null |
| Intentos | attempt_number | Numero |
| Evento origen | source_event_id | Mono, — si null |
| Entidad origen | source_entity | Mono, — si null |
| Enviado por | actor_email | Email o — |
| Fecha | created_at | dd MMM yyyy, HH:mm |

Error section: solo visible si error_message. Card con backgroundColor error.lighterOpacity, borderLeft 4px solid error.main.

Boton "Reintentar envío": solo si failed y attempt_number < 3. Variant contained, color primary.

### Tab Suscripciones

```
┌────────────────────────────────────────────────────────┐
│ CardHeader: "Suscripciones por tipo"                   │
│ subtitle: "Define quién recibe cada tipo de correo"    │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ▌ CIERRE NÓMINA (payroll_export)          [+ Agregar] │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Finanzas | Efeonce    finance@efeoncepro.com [✕] │  │
│  │ Humberly Henriquez   hhumberly@efeoncepro.com[✕] │  │
│  │ Julio Reyes          jreyes@efeoncepro.com   [✕] │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ▌ NOTIFICACIÓN (notification)             [+ Agregar] │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Sin suscriptores configurados.                   │  │
│  │ Los correos de este tipo se envían directamente. │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

Patron Collapsible section. Cada grupo: SectionHeader con accent bar + tipo label uppercase + boton Agregar suscriptor.

Dialogo agregar: Title "Agregar suscriptor", fields Nombre (opcional) + Correo electrónico (requerido), buttons "Agregar suscriptor" (primary) + "Cancelar".

Dialogo eliminar: Title "Quitar suscriptor?", body "{nombre} dejará de recibir correos de tipo {tipo}. Puedes agregarlo de nuevo en cualquier momento.", buttons "Quitar suscriptor" (error) + "Cancelar".

### Empty states

| Contexto | Heading | Body |
|----------|---------|------|
| Sin deliveries | Aún no hay correos registrados | Cuando Greenhouse envíe correos, aparecerán aquí con su estado de entrega. |
| Sin resultados filtro | Sin resultados | No hay correos que coincidan con los filtros actuales. [Limpiar filtros] |
| Sin suscriptores tipo | Sin suscriptores configurados | Los correos de este tipo se envían directamente a quien los solicita. |

### Toasts

| Accion | Tipo | Copy |
|--------|------|------|
| Reenvio exitoso | Success | Correo reenviado a {email}. |
| Reenvio fallido | Error | No se pudo reenviar el correo. Intenta de nuevo. |
| Suscriptor agregado | Success | {nombre} agregado a {tipo}. |
| Suscriptor eliminado | Success | Suscriptor eliminado. |

### Responsive

| Breakpoint | Comportamiento |
|-----------|----------------|
| Desktop ≥1200 | 4 KPI en fila, tabla completa |
| Tablet 600-1199 | 2 KPI por fila, ocultar columnas Intentos y Dominio |
| Mobile <600 | 1 KPI por fila, tabla solo Tipo+Destinatario+Estado, drawer full-width |

## API Endpoints

### GET /api/admin/email-deliveries

Query params: `page`, `pageSize`, `emailType`, `domain`, `status`, `search`

Response:
```json
{
  "data": [EmailDelivery],
  "total": number,
  "page": number,
  "pageSize": number,
  "kpis": {
    "sentToday": number,
    "deliveryRate": number,
    "failedToday": number,
    "pendingRetry": number
  }
}
```

### GET /api/admin/email-subscriptions

Response: `{ data: EmailSubscription[] }` agrupable por email_type en frontend.

### POST /api/admin/email-subscriptions

Body: `{ emailType, recipientEmail, recipientName? }`

### DELETE /api/admin/email-subscriptions/[subscriptionId]

Soft-delete (active=false).

### POST /api/admin/email-deliveries/[deliveryId]/retry

Reintenta el envio. Retorna nuevo `SendEmailResult`.

## Acceptance Criteria

- [ ] Tab "Correos" visible en Control Tower para efeonce_admin
- [ ] 4 KPI cards con datos de email_deliveries
- [ ] Tabla con filtros (tipo, dominio, estado) y búsqueda
- [ ] Drawer de detalle con metadata completa y error display
- [ ] Reenvio manual desde drawer (solo failed con < 3 intentos)
- [ ] Tab Suscripciones con CRUD agrupado por email_type
- [ ] Dialogos de agregar/quitar suscriptor
- [ ] Empty states para cada contexto
- [ ] Toasts de feedback
- [ ] Responsive en 3 breakpoints
- [ ] `pnpm build && pnpm test`

## Verification

- Vista carga con datos reales de email_deliveries
- Filtros funcionan individualmente y combinados
- Drawer muestra error_message para failed deliveries
- CRUD de suscripciones persiste en base de datos
- Reenvio ejecuta sendEmail y actualiza el status
- `pnpm build && pnpm lint`

# TASK-412 — Payroll Reliquidación Admin UI, Preview & Audit Trail

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `hr`
- Blocked by: `TASK-410`
- Branch: `task/TASK-412-payroll-reliquidation-admin-ui`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Interfaz admin para reabrir una nómina `exported`: dialog con motivo obligatorio, preview del delta antes de confirmar, badge "v2 reliquidada" en la entry, vista de historial de versiones, reenvío de liquidación PDF v2 al colaborador y vista de audit log en Admin Center. Hace utilizable el foundation de [TASK-410](./TASK-410-payroll-period-reopen-foundation-versioning.md) para operadores reales.

## Why This Task Exists

Sin UI, la capacidad queda inaccesible para los usuarios legítimos (HR / admins) y el riesgo operacional aumenta: reabrir una nómina sin ver el delta antes invita a errores costosos que luego requieren nueva reliquidación (y V1 no soporta v3+). El preview del delta antes de confirmar es la salvaguarda principal contra errores humanos.

## Goal

- Dialog de reopen desde la vista de período con:
  - Taxonomía de motivos en select: `error_calculo`, `bono_retroactivo`, `correccion_contractual`, `otro`
  - Campo de detalle opcional (obligatorio si motivo = `otro`)
  - Doble confirmación si el sistema estima un delta alto (umbral a definir, ver Open Questions)
- **Preview del delta** antes de confirmar el commit de una versión reliquidada: muestra "Monto anterior: $X. Nuevo: $Y. Diferencia: $Z" por cada entry afectada
- Badge visual "v2 reliquidada el DD/MM por [usuario]" en la tabla de entries del período
- Drawer de historial de versiones accesible desde cada entry: muestra v1 y v2 (o más) con links a los PDFs
- Reenvío automático de liquidación PDF v2 al colaborador vía email transaccional
- Vista de audit log en Admin Center filtrable por mes y por operador

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- [docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md](../../architecture/GREENHOUSE_UI_PLATFORM_V1.md) — stack UI, Vuexy primitives, patrones
- [docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md)
- [docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md](../../architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md) — capability gating para la acción de reopen

Reglas obligatorias:

- Usar primitivas Vuexy / MUI existentes; nada de crear componentes desde cero si ya existe equivalente
- Microcopy en español, tono operativo, siguiendo [docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md](../../architecture/GREENHOUSE_UI_PLATFORM_V1.md) y convenciones de `greenhouse-ux-writing` skill
- Toda acción sensible (reopen, confirmar) debe tener loading state, error state y success state explícitos
- Badge "v2 reliquidada" debe ser un componente reutilizable, no un one-off
- El botón "Reabrir nómina" solo visible para usuarios con rol `efeonce_admin`
- El email de reenvío debe pasar por el sistema de email templates existente ([src/lib/email/](../../../src/lib/email/) — verificar)

## Normative Docs

- [TASK-409](./TASK-409-payroll-reliquidation-program.md)
- [TASK-410](./TASK-410-payroll-period-reopen-foundation-versioning.md) — contrato del endpoint

## Dependencies & Impact

### Depends on

- **TASK-410 completa** — endpoint `/reopen` disponible, state machine con `reopened`, versionado de entries
- [src/views/greenhouse/payroll/](../../../src/views/greenhouse/payroll/) — vista actual de período
- [src/app/api/hr/payroll/entries/\[entryId\]/receipt/](../../../src/app/api/hr/payroll/entries/[entryId]/receipt/) — generador de PDF
- Sistema de email transaccional [verificar path: `src/lib/email/` o similar]
- Hook de capability gating [verificar: `useCapability` o similar]

### Blocks / Impacts

- **Impacts:** flujos existentes de edición de entries — cuando `period.status = 'reopened'`, el comportamiento del recalculate cambia (ver TASK-410). El badge y el historial deben quedar visibles sin romper tests de UI actuales.

### Files owned

- `src/views/greenhouse/payroll/ReopenPeriodDialog.tsx` (nuevo)
- `src/views/greenhouse/payroll/ReliquidationDeltaPreview.tsx` (nuevo)
- `src/views/greenhouse/payroll/EntryVersionHistoryDrawer.tsx` (nuevo)
- `src/views/greenhouse/payroll/ReliquidationBadge.tsx` (nuevo)
- `src/app/api/hr/payroll/periods/[periodId]/reopen-preview/route.ts` (nuevo — GET para el preview)
- `src/app/api/hr/payroll/entries/[entryId]/versions/route.ts` (nuevo — GET historial)
- `src/app/api/admin/payroll/reopen-audit/route.ts` (nuevo — admin log view)
- `src/views/greenhouse/admin-center/PayrollReopenAuditView.tsx` (nuevo)
- [src/views/greenhouse/payroll/PayrollPeriodView.tsx](../../../src/views/greenhouse/payroll/) [verificar path] (modificar — botón de reopen y badge)
- Email template nuevo: `src/lib/email/templates/payroll-liquidacion-v2.tsx` (nuevo o variante del existente)
- Tests: `*.test.tsx` para cada componente nuevo

## Current Repo State

### Already exists

- Vista de período payroll en `src/views/greenhouse/payroll/` [verificar estructura exacta]
- API de receipt PDF: [src/app/api/hr/payroll/entries/\[entryId\]/receipt/](../../../src/app/api/hr/payroll/entries/[entryId]/receipt/)
- Sistema de email templates (consultar skill `greenhouse-email` para patrones)
- Admin Center layout: [src/views/greenhouse/admin-center/](../../../src/views/greenhouse/admin-center/) [verificar]
- Primitivas Vuexy de dialog, drawer, badge, alert

### Gap

- No hay acción "Reabrir nómina" en ninguna vista
- No hay componente de preview de delta (monto anterior vs nuevo)
- No hay historial de versiones visible en UI — las entries no tienen concepto de versión aún
- No hay template de email "Liquidación v2 reliquidada"
- No hay vista de audit log en Admin Center para esta acción

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Dialog de reopen con motivo

- Componente `ReopenPeriodDialog` con:
  - Select de motivo (4 opciones controladas, label en español)
  - Textarea de detalle (obligatorio si motivo = `otro`)
  - Warning visible: "Esta acción reabre una nómina cerrada. Solo procede si estás autorizado y documentarás el motivo."
  - Botones: Cancelar / Continuar (Continuar lleva al preview, no commitea aún)
- Validación cliente con zod o similar
- Botón "Reabrir nómina" visible en `PayrollPeriodView` solo si `status === 'exported'` y el usuario es admin
- Tests unitarios del componente

### Slice 2 — Endpoint GET de preview

- Crear `GET /api/hr/payroll/periods/[periodId]/reopen-preview`
- Retorna: estado actual del período, validaciones de guardas (ventana OK, Previred status, lock status) sin ejecutarlas destructivamente
- Response:
  ```typescript
  {
    canReopen: boolean
    reasons: Array<{ code: string, blocking: boolean, message: string }>
    currentStatus: PeriodStatus
    operationalMonth: string
    entriesCount: number
    previredDeclared: boolean
    exportInProgress: boolean
  }
  ```
- El dialog lo consume antes de mostrar el botón "Continuar"

### Slice 3 — Preview del delta (post-edición)

- Componente `ReliquidationDeltaPreview`:
  - Se muestra cuando el operador editó entries en estado `reopened` y va a recalcular/aprobar
  - Para cada entry modificada, muestra:
    ```
    [Colaborador]   Monto anterior: $850.000   →   Nuevo: $900.000   Diferencia: +$50.000
    ```
  - Resumen total al pie: "Delta total del período: +$50.000"
  - Botón "Confirmar y re-exportar" con doble confirmación modal si `abs(deltaTotal) / previousTotal > 10%`
- Consume un endpoint que calcula el preview server-side sin hacer commit (usar cálculo in-memory contra los valores editados)
- Tests: preview con delta positivo, negativo, cero, mixto

### Slice 4 — Badge y historial de versiones

- Componente `ReliquidationBadge` — chip pequeño, color warning, texto "v2 • reliquidada DD/MM"
- Se renderiza en la fila de cada entry donde `version > 1`
- Componente `EntryVersionHistoryDrawer`:
  - Drawer lateral abierto desde la entry
  - Lista ordenada descendente: v2 (activa), v1 (superseded)
  - Cada versión muestra: monto líquido, monto bruto, fecha de cierre, link al PDF del recibo
  - Usuario que reliquidó + motivo visible en v2
- Endpoint `GET /api/hr/payroll/entries/[entryId]/versions` retorna array con todas las versiones

### Slice 5 — Email de liquidación v2

- Usar skill `greenhouse-email` para crear template nuevo `payroll-liquidacion-v2`
- Copy:
  - Asunto: "Liquidación actualizada — [Mes Año]"
  - Cuerpo: indica que la liquidación anterior fue reemplazada, nuevo monto, motivo resumido (no el detalle interno), link al PDF v2
- Trigger: cuando `period.status` transita de `approved → exported` Y alguna entry tiene `version > 1` desde el último export, enviar el email al colaborador afectado
- El trigger puede vivir en el handler existente de `exported` o en un consumer reactivo dedicado (decidir en Discovery)
- Test del template con snapshot

### Slice 6 — Admin Center audit log view

- Endpoint `GET /api/admin/payroll/reopen-audit` con filtros `?month=YYYY-MM&userId=...`
- Componente `PayrollReopenAuditView`:
  - Tabla con columnas: fecha, período, operador, motivo, delta total, entries afectadas
  - Link a cada período para navegación rápida
- Acceso restringido a `efeonce_admin`
- Entry en el sidebar de Admin Center bajo "Auditoría" o sección equivalente [verificar estructura actual]

## Out of Scope

- **Endpoint de reopen propiamente tal** → TASK-410
- **Consumer de Finance** → TASK-411
- **Dashboards de métricas de reliquidación** — V2
- **Alertas por umbral de reliquidación frecuente** — V2
- **Flujo de aprobación multi-step (maker/checker)** — V1 = solo doble confirmación en cliente + motivo obligatorio
- **Edición masiva de entries tras reopen** — el operador edita entry por entry con el flujo actual

## Detailed Spec

### Microcopy sugerido (en español)

- Botón: "Reabrir nómina"
- Dialog título: "Reabrir nómina cerrada"
- Select label: "Motivo de reliquidación"
- Opciones del select:
  - "Error de cálculo"
  - "Bono retroactivo"
  - "Corrección contractual"
  - "Otro motivo"
- Warning: "Reabrir una nómina crea una nueva versión de las liquidaciones afectadas. El monto original se conserva, y Finance recibirá solo la diferencia. Esta acción queda registrada en auditoría."
- Badge tooltip: "Esta liquidación fue reliquidada el DD/MM/YYYY por [nombre]. Ver historial."
- Email subject: "Tu liquidación de [Mes Año] fue actualizada"

### Capability gating

- Verificar con `useCapability('payroll.reopen')` o equivalente — si no existe, usar check directo de rol `efeonce_admin` vía session
- Server-side el endpoint ya valida; client-side es defensa en profundidad para UX

### Accesibilidad

- Dialog con foco inicial en el select de motivo
- Escape cierra sin commit
- Botón "Confirmar" deshabilitado hasta que motivo esté seleccionado y (si aplica) detalle llenado
- aria-labels en los botones de acción

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `ReopenPeriodDialog` solo visible para usuarios con rol `efeonce_admin` cuando el período es `exported`
- [ ] El dialog exige motivo; detalle es obligatorio solo si motivo = `otro`
- [ ] El endpoint `reopen-preview` bloquea el botón "Continuar" si hay guardas falladas
- [ ] `ReliquidationDeltaPreview` muestra delta por entry y total del período antes del commit final
- [ ] Si `abs(deltaTotal) / previousTotal > 10%`, aparece doble confirmación modal
- [ ] `ReliquidationBadge` aparece en cada entry con `version > 1` y el tooltip muestra fecha y operador
- [ ] `EntryVersionHistoryDrawer` lista todas las versiones con monto, fecha, motivo, link PDF
- [ ] El colaborador recibe un email con "Liquidación actualizada" cuando el período se re-exporta con entries reliquidadas
- [ ] `PayrollReopenAuditView` en Admin Center lista todos los reopens filtrables por mes y operador
- [ ] Todos los componentes tienen tests unitarios con Vitest + Testing Library
- [ ] Microcopy en español, sin jerga técnica, sin emojis
- [ ] `pnpm build`, `pnpm lint`, `pnpm test`, `npx tsc --noEmit` verdes

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- `pnpm build`
- Dev server + prueba manual del flujo completo en browser: abrir período exported → clic "Reabrir" → llenar motivo → continuar → preview → editar entry → recalcular → preview delta → confirmar → re-exportar → verificar badge y historial
- Verificar email en preview (`/api/email/preview/payroll-liquidacion-v2`) [verificar si existe sistema de preview]
- Smoke test en staging con una cuenta admin real

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado
- [ ] `changelog.md` quedó actualizado
- [ ] se ejecutó chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] [TASK-409](./TASK-409-payroll-reliquidation-program.md) actualizado reflejando que Slice 3 está complete
- [ ] Documentación funcional `docs/documentation/hr/reliquidacion-nomina.md` creada — explica el flujo end-to-end para operadores

## Follow-ups

- V2: dashboard con métricas de reliquidación (frecuencia por mes, por motivo, por operador)
- V2: notificación in-app al operador cuando su reopen fue procesado por Finance exitosamente
- V2: export del audit log a CSV desde Admin Center
- V2: vista comparativa side-by-side v1 vs v2 del PDF de liquidación

## Open Questions

- ¿Umbral de doble confirmación debe ser 10% (propuesta) o ajustar? — resolver con Finance antes de cerrar
- ¿El historial de versiones debe ser un drawer o una página dedicada? — propuesta: drawer por consistencia con otros patrones del módulo
- ¿El email de liquidación v2 debe incluir el detalle del motivo ("bono retroactivo correspondiente a Q1") o solo una leyenda genérica? — propuesta: leyenda genérica, el detalle queda en audit interno, para no filtrar información sensible al colaborador
- ¿La vista de audit en Admin Center debe vivir bajo `/admin/payroll/audit` o bajo una sección de auditoría general del Admin Center? — verificar estructura actual

# TASK-1826 — Payroll period consistency wireframe

## Meta

- Status: `draft`
- Owner task: TASK-1826
- Product Design asset: dirección repo-native todavía por materializar antes de readiness; evidencia de partida en src/views/greenhouse/payroll/PayrollDashboard.tsx y PayrollPeriodTab.tsx.
- Visual direction mode: `repo-native-benchmark`
- Intended consumers: HR/Finance en /hr/payroll.
- Copy source: src/lib/copy/payroll.ts.
- Primitive decision: reuse preferida; lookup exacta pendiente antes de JSX.
- UI ready target: `no`

## Brief

El operador cambia de período y necesita que contexto, importes, acciones y resultado pertenezcan al mismo
snapshot. Este draft define estados y jerarquía, no prueba UI construida ni GVC. No cubre rediseño global ni Nexa.

## Desktop Target — 1440×1000

Encabezado existente con período/versión/freshness; debajo preflight resumido y acciones por disponibilidad.
Tabla principal conserva densidad, importes y moneda. Estado de operación en región contigua del mismo
contexto; detalles por persona mediante diálogos actuales. Error conserva encabezado y reemplaza dataset
operable; no aparecen cuatro cards nuevas para representar un fallo.

## Mobile Target — 390×844

Selector completo antes de estado y acción principal; importes/moneda legibles. Tabla transforma a patrón
compacto aprobado, sin achicar texto para simular desktop. Detalle abre superficie existente adaptada al ancho.
Error y retry accesibles sin scroll lateral; acciones secundarias no expulsan el primer dato del fold.

## Action Hierarchy

- Primary: siguiente acción permitida o reintentar lectura del período seleccionado.
- Secondary: consultar operación/detalle/documento autorizado.
- Destructive: ninguna nueva; reapertura conserva confirmación canónica.
- Selection vs action: seleccionar período sólo lee, no calcula ni confirma.
- Pending / disabled: razón accesible, sin doble submit; consulta operación sigue disponible.

## Visual Fidelity Mapping

| Source cue | Greenhouse token / primitive / recipe | Intent preserved | Literal value rejected |
|---|---|---|---|
| Encabezado Payroll existente | Reuse; CompositionShell/WorkbenchHeader se evalúan antes de cambio estructural | Contexto siempre visible | Ningún nuevo HEX/px |
| Tabla financiera | PayrollEntryTable y tema MUI/AXIS | Densidad y moneda legibles | Tamaño inventado para forzar mobile |
| Bloqueo/error | Estado canónico con texto | Causa y recovery | Color como única señal |
| Operación pendiente | Feedback de primitive existente | No fingir porcentaje | Timing ad hoc |

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header | Identidad período/versión | PayrollDashboard | Reader TASK-1821 |
| 1 | Context | Bloqueos por etapa | PayrollPeriodTab | Preflight TASK-1820 |
| 2 | Primary | Dataset correcto | PayrollEntryTable | Snapshot TASK-1821 |
| 3 | Status | Progreso/recuperación | Feedback existente a resolver | Operation TASK-1822 |
| 4 | Detail | Documento y delivery | PayrollReceiptDialog | TASK-1823 |

## Copy Ledger

Propuestas a integrar/ajustar en src/lib/copy/payroll.ts, no strings finales hardcodeados.

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| payroll.period.loading | Primary | Cargando nómina de {period} | period | Ningún dato anterior operativo |
| payroll.period.readError | Primary | No pudimos cargar este período | period | Retry mismo período |
| payroll.period.stale | Context | Los datos requieren actualización | version | CTA write bloqueada |
| payroll.operation.partial | Status | Hay etapas pendientes | count | No éxito global |
| payroll.delivery.accepted | Detail | Aceptado por el proveedor | recipientCount | No equivale entregado |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | Nómina de {period} | Versión {version} | Acción permitida | Monedas separadas |
| loading | Cargando este período | Datos aún no disponibles | Esperar/otro período | No disparar write |
| empty | Sin entradas | Período cargado correctamente | Acción permitida backend | No error |
| partial | Hay información pendiente | Etapas concretas | Consultar/reintentar permitido | No ready falso |
| error | No pudimos cargar este período | Sin snapshot vigente | Reintentar | Conservar selección |
| denied | No tienes acceso a esta nómina | Sin detalle sensible | Volver a período accesible | No revelar personas |

## Accessibility Contract

- Heading order: título único Payroll, contexto período, subsecciones existentes.
- Chart/table alternatives: tabla/lista legible; no nuevos gráficos.
- Aria labels: selector período y acciones con contexto, aria-busy/status sin anuncios duplicados.
- Focus notes: retorno al invocador vigente o título contexto; no salto al dataset anterior.
- Color-independent state labels: loading/error/partial/denied explícitos.

## Implementation Mapping

- Route / surface: /hr/payroll, PayrollDashboard/PayrollPeriodTab.
- Primitives: tabla/diálogos existentes; lookup final pendiente, por eso draft.
- Variants / kinds: definir antes de readiness según catálogo vigente.
- Component candidates: PayrollEntryTable, PayrollEntryAdjustDialog, PayrollReceiptDialog, PayrollPaymentStatusCard.
- Copy source: src/lib/copy/payroll.ts.
- Data reader / command: TASK-1820..1823.
- API parity: consumer exclusivo; no fórmulas/auth locales.
- Access / capability: DTO backend y revalidación al ejecutar.
- Runtime consumers: portal, no PDF/email layout.
- Print/email/PDF considerations: mostrar estado/enlace privado, no regenerar al leer.
- GVC markers: payroll-period-context, payroll-period-data, payroll-preflight, payroll-operation-status propuestos.

## GVC Scenario Plan

- Scenario file: nuevo scripts/frontend/scenarios/task1826-payroll-period-consistency.scenario.ts al implementar.
- Route: /hr/payroll.
- Viewports: 1440×1000 y390×844.
- Quality profile: `premium`.
- Required steps: A→B con GET fallido, retry, refresh secundario, A tardío, permiso denegado y operación parcial.
- Required captures: ready/loading/error/recovery/conflict/partial.
- Required data-capture markers: los cuatro anteriores, registrados antes del capture.
- Assertions: snapshot y selección mismo período/version; jamás CTA sobre otro período.
- Scroll-width checks: scrollWidth===clientWidth en documento.
- Accessibility/focus checks: Tab/Escape/retorno foco.
- Reduced-motion evidence: misma secuencia con preferencia activada.
- Review dossier: required, con fixture y fallos inyectados identificados.
- Baseline: required after direction approval; surfaceId por registrar.

## Design Decision Log

- Decision: ocultar snapshot operativo cuando cambia período; stale etiquetado sólo dentro del mismo período.
- Alternatives considered: datos previos sin etiqueta rechazados; rediseño completo rechazado.
- Why this pattern: previene F10/F11 con cambio acotado y contexto persistente.
- Reuse / extend / new primitive: reuse; extensión exige lookup documentado.
- Open risks: dirección durable y mapping exacto todavía pendientes.
- Follow-up: completar readiness antes de JSX.

## Acceptance Checklist

- [ ] Dirección durable y mapping fino aprobados.
- [ ] Copy final/aria de cada estado y valor dinámico revisados.
- [ ] GVC y scorecard demuestran coherencia, móvil y foco.

# TASK-1826 — Payroll period consistency Flow Contract

## Meta

- Status: `draft`
- Owner task: TASK-1826
- Related wireframe: docs/ui/wireframes/TASK-1826-payroll-period-consistency-and-operation-feedback.md
- Intended route / surface: /hr/payroll.
- Flow type: `command-backed`
- Primary primitives: PayrollDashboard/PeriodTab y dialogs existentes.
- Copy source: src/lib/copy/payroll.ts.

## Flow Brief

HR/Finance selecciona período, verifica datos y ejecuta acción permitida, recuperando la operación sin
repetirla. Éxito es estado confirmado por backend; no incluye pago bancario. Selección no es ejecución.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| Payroll | Selección/datos | Tabla y contexto | Contexto y filas compactas | Dashboard/EntryTable |
| Ajuste/recibo | Detalle contextual | Diálogo existente | Dialog adaptado | PayrollEntryAdjustDialog/ReceiptDialog |
| Operación | Estado/recovery | Región inline | Región antes de detalles | Feedback canónico por resolver |

## Flow Map

1. Entry: cargar período autorizado y snapshot con versión.
2. Primary action: seleccionar destino; invalidar snapshot operativo anterior.
3. Transition: loading→ready/error/denied del destino; respuesta vieja se descarta.
4. User decision: leer preflight y confirmar sólo acción permitida de esa versión.
5. Completion: mostrar operationId y resultados verificados por etapa.
6. Recovery / exit: recargar consulta operación; Escape cierra diálogo, nunca cancela operación.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| Selección | Selector | loading destino | Teclas selector/Enter | No write |
| Retry lectura | Error | Mismo período loading | Enter | No cambia intención |
| Confirm | Diálogo | operation pending | Enter sólo CTA | Versión revalidada |
| Escape | Diálogo | Página | Escape | Sin cancelar negocio |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| closed | Detalle cerrado | Inicio/Escape | Abrir detalle válido | Foco contexto |
| opening | Montaje detalle | Click/Enter | Mounted | Contexto immutable |
| open | Detalle válido | Mounted | Escape/confirm | Acceso y versión |
| loading | Destino pendiente | Cambio/retry | Response del request vigente | No filas previas operables |
| error | Destino sin lectura | GET falla | Retry/selección | Error persistente |
| dirty | Ajuste sin confirmar | Editar | Guardar/descartar | Dialog canónico |
| complete | Resultado terminal | Reader | Nueva intención explícita | No repetir submit |

## Routing Contract

- Route changes: `none`; conservar mecanismo actual de selección sin introducir URL nueva en este scope.
- Canonical URL: /hr/payroll.
- Deep-link behavior: respetar comportamiento actual comprobado; no inventar período por path.
- Back button behavior: navegación existente, no interceptar para confirmar.
- Reload behavior: recuperar contexto permitido y operación por contrato durable; verificar storage/routing antes de diseño final.
- Shareability: compartir enlace no confiere acceso ni expone token/asset.

## Focus & Accessibility

- Initial focus: selector o título existente, sin autofocus sorpresa.
- Escape behavior: cerrar detalle sin side effects.
- Click-away behavior: según diálogo canónico; dirty state no se pierde silenciosamente.
- Focus restore: invocador válido; fallback al encabezado cuando cambió el período.
- Modal vs non-modal semantics: dialogs existentes conservan modalidad; progreso inline no captura foco.
- Screen reader announcement: estado y período cambiados una vez.
- Keyboard traversal: selector→acciones→datos→detalle.
- Reduced motion: mismo orden/foco con cambios inmediatos.

## Data & Command Boundaries

- Readers: TASK-1820 preflight, TASK-1821 snapshot, TASK-1822 operación, TASK-1823 delivery.
- Commands: canónicos de TASK-1821; UI sólo invoca.
- API routes: adapters existentes src/app/api/hr/payroll y contratos entregados por las dependencias.
- Optimistic updates: no para valores financieros/approval/delivery.
- Cache / invalidation: identidad por periodId/version y generación request; invalidar período afectado.
- Audit / signals: backend conserva auditoría; UI no emite efecto duplicado.
- Tenant / access boundary: identidad backend, no query params como autorización.

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| denied | Acceso no disponible | Destino autorizado | Sin PII |
| not found / empty | Diferenciar inexistente y sin entries | Recargar/lista períodos | No mismo copy |
| partial / degraded | Etapas faltantes | Retry permitido backend | No éxito global |
| stale data | Snapshot requiere actualizar | Reload y nueva confirmación | No autoapply |
| timeout / API error | Estado incierto | Consultar operationId | No nueva intención |
| dirty exit | Confirmar descarte | Volver/descartar | No write implícito |

## GVC Scenario Plan

- Scenario: task1826-payroll-period-consistency.
- Scenario file: nuevo al implementar, declarado en wireframe.
- Route: /hr/payroll.
- Viewports: desktop y390px.
- Required steps: secuencia Flow Map con fallo GET y respuesta tardía.
- Required captures: antes/error/retry y operación parcial.
- Required data-capture markers: context/data/preflight/operation del wireframe.
- Assertions: ningún frame operable con período cruzado.
- Scroll-width checks: igualdad de ancho documento.
- Accessibility/focus checks: Escape y retorno tras cambio de período.
- Reduced-motion evidence: mismo resultado sin animación.

## Design Decision Log

- Decision: selección y operación separadas por snapshot vigente.
- Alternatives considered: submit sobre data stale rechazado; auto-retry write rechazado.
- Why this pattern: evita actuación sobre período equivocado.
- Reuse / extend / new primitive: reuse de dialogs y feedback.
- Open risks: DTO durable pendiente.
- Follow-up: aprobar mapping y dirección antes de UI ready yes.

## Acceptance Checklist

- [ ] Guards del frontend no sustituyen backend.
- [ ] Cada estado/fallo recorrido por teclado y390px.
- [ ] GVC secuencial prueba coherencia, no sólo screenshots estáticas.

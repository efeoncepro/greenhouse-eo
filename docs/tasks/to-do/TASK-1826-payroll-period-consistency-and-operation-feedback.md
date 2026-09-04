# TASK-1826 — Payroll period consistency and operation feedback

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1826-payroll-period-consistency-and-operation-feedback.md`
- Flow: `docs/ui/flows/TASK-1826-payroll-period-consistency-and-operation-feedback-flow.md`
- Motion: `docs/ui/motion/TASK-1826-payroll-period-consistency-and-operation-feedback-motion.md`
- Backend impact: `none`
- Epic: `EPIC-043`
- Status real: `Diseño; contratos UI draft, sin implementación ni GVC nuevo`
- Rank: `11`
- Domain: `hr|payroll|ui`
- Blocked by: `TASK-1820, TASK-1821, TASK-1822, TASK-1823`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees ni cambio automático de branch`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Corregir la coherencia entre período seleccionado, datos, versión y acciones del portal Payroll. Consumir
preflight/operaciones/documentos canónicos para mostrar errores, progreso y recuperación reales sin
mantener una nómina anterior bajo un período nuevo. Cubre F9/F10/F11 del baseline y coordina ISSUE-134.

## Why This Task Exists

PayrollDashboard distingue activeEntries/selectedEntries y refresca datos desde varias llamadas. El baseline
reprodujo GET fallido al cambiar de agosto a julio con filas de agosto todavía mostradas, refresh que deja
el período secundario stale y edición inline ofrecida cuando la ruta bloquea. No basta agregar un toast:
la identidad y generación del request deben gobernar qué snapshot y acción siguen siendo válidos.

## Goal

- Evitar mezclas de período/versión bajo respuestas tardías, fallos y refresh concurrentes.
- Mostrar acciones disponibles conforme al contrato backend, con bloqueos y recuperación explícitos.
- Mostrar estado durable y parcial por etapa sin representar cierre como pago ni aceptación como entrega.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/UI_FEATURE_AGENT_INVARIANTS.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `docs/architecture/GREENHOUSE_PRODUCT_UI_OPERATING_MODEL_V1.md`
- `docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md`

Aplicar greenhouse-ai-design-studio antes de JSX. No abrir cambios de arquitectura compartida sin ADR;
la publicación/versión/acceso de negocio siguen en TASK-1816/1821, no se redefinen en componentes.

## Normative Docs

- `DESIGN.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/epics/to-do/EPIC-043-payroll-reliability-and-agentic-api-parity.md`
- `docs/audits/payroll/PAYROLL_RELIABILITY_API_PARITY_PROGRAM_BASELINE_2026-09-03.md`

## Dependencies & Impact

### Depends on

- TASK-1820 preflight, TASK-1821 adapters/DTO de capabilities, TASK-1822 operación y TASK-1823 documentos/delivery.
- Los contratos UI de esta task no hacen disponibles esos DTO; pruebas con mocks se distinguen de integración.

### Blocks / Impacts

- TASK-1827 certificación transversal. ISSUE-134 conserva trazabilidad; cerrar sólo tras reproducir y corregir.
- Coordinar TASK-759d timeline y TASK-1142 prompts contextuales; no crear un segundo timeline o prompt owner.
- TASK-1825 reusa superficie Nexa existente; si requiere UI nueva, formalizar ownership y contrato separado antes de ampliar esta task.

### Files owned

- `src/views/greenhouse/payroll/PayrollDashboard.tsx`
- `src/views/greenhouse/payroll/PayrollPeriodTab.tsx`
- `src/views/greenhouse/payroll/PayrollEntryTable.tsx`
- `src/views/greenhouse/payroll/PayrollEntryAdjustDialog.tsx`
- `src/views/greenhouse/payroll/PayrollReceiptDialog.tsx`
- `src/views/greenhouse/payroll/PayrollPaymentStatusCard.tsx`
- `src/lib/copy/payroll.ts`
- Tests de componentes en `src/views/greenhouse/payroll` y nuevo escenario GVC declarado en contrato.
- `docs/ui/wireframes/TASK-1826-payroll-period-consistency-and-operation-feedback.md`, `docs/ui/flows/TASK-1826-payroll-period-consistency-and-operation-feedback-flow.md`, `docs/ui/motion/TASK-1826-payroll-period-consistency-and-operation-feedback-motion.md`.

## Current Repo State

### Already exists

- PayrollDashboard.tsx tiene selectedPeriodId, selectedEntries, activeEntries, fetchAll y select de período.
- PayrollPeriodTab.tsx llama readiness, calculate, approve, close, pdf y rutas de recibos; operaciones actuales
  no equivalen aún al contrato durable planificado.
- PayrollPeriodTab.test.tsx y pruebas de dialogs/receipt existen; copy canónico src/lib/copy/payroll.ts.

### Gap

Snapshot y selección pueden divergir; affordance de edición y errores no siempre corresponden a backend.
La tarea separa consumer UI del backend: `Backend impact: none` significa que no implementa ni cambia
commands/API; toda acción de negocio depende de las tasks backend indicadas y su Capability Definition of Done.
No se permite rellenar un gap de API con lógica local para cerrar esta tarea.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/views/greenhouse/payroll` y `src/lib/copy/payroll.ts`.
- Future candidate home: `portal`
- Boundary: DTO/reader/command de TASK-1820..1823; estado de presentación sólo en cliente.
- Server/browser split: ningún store, SQL, SDK de provider, secreto o fórmula Payroll se importa en Client Components.
- Build impact: no dependencias pesadas ni nuevos entrypoints; escenario GVC y docs UI versionados.
- Extraction blocker: contratos DTO, acceso y state machine del dominio; no crear apps/packages o shell alternativo.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador HR/Finance autorizado, con permisos de lectura o ejecución diferenciados.
- Momento del flujo: cambia período, revisa datos, solicita operación y consulta resultado o reintento.
- Resultado perceptible esperado: cada importe/fila/CTA pertenece al período mostrado y al snapshot vigente; nunca queda una nómina anterior bajo un título nuevo.
- Friccion que debe reducir: descubrir tarde un bloqueo, acciones ofrecidas que backend rechaza y respuestas parciales presentadas como éxito.
- No-goals UX: rediseño integral de Payroll, nuevas páginas o panel de banco; no cambiar el shell Nexa.

### Surface & system decision

- Surface: PayrollDashboard, PayrollPeriodTab, tabla y diálogos existentes.
- Nav placement: `none` — mismo destino /hr/payroll, sin nuevo ítem de navegación.
- Composition Shell: `aplica` como primera evaluación de composición; no migrar el shell entero por corregir estado. Confirmar reuse/extend del contenedor existente antes de JSX.
- Primitive decision: `reuse` preferida; tabla y diálogos actuales, primitives de estado/feedback de src/components/greenhouse/primitives. La lookup fina se cierra en readiness, no se inventa primitive paralela.
- Adaptive density / The Seam: `aplica` para tabla y detalle responsivo; conservar density actual y mejorar recuperación sin cards redundantes.
- Floating/Sidecar/Dialog decision: reutilizar PayrollEntryAdjustDialog, PayrollReceiptDialog y ReopenPeriodDialog con identidad de período/entry estable.
- Copy source: `src/lib/copy/payroll.ts` y nomenclatura canónica.
- Access impact: `none` sobre grants; consumir capabilities efectivas de TASK-1821, no introducir roles locales como autoridad.

### State inventory

- Default: snapshot correcto con período, versión y fecha de lectura.
- Loading: datos de destino pendientes; no mantener filas de otro período como actuales.
- Empty: período válido sin entries; no confundir con error o falta de permiso.
- Error: GET fallido del período seleccionado; bloqueo de acciones dependientes y reintento del mismo período.
- Degraded / partial: preflight incompleto o etapas fallidas; mostrar alcance conocido y pendiente, no “Sin bloqueos”.
- Permission denied: explicación canónica sin PII ni CTA ejecutable.
- Long content: razones de bloqueo legibles, texto expandible y valor/moneda sin truncamiento ambiguo.
- Mobile / compact: 390px con contexto visible y filas transformadas según patrón aprobado, controles táctiles y sin scroll horizontal de página.
- Keyboard / focus: selector, acciones y diálogos recorribles; foco regresa al invocador vigente, nunca a fila de otro período.
- Reduced motion: mismos estados y confirmaciones con cambios inmediatos, sin depender de animación.

### Interaction contract

- Primary interaction: seleccionar período → validar snapshot/readiness → ejecutar acción permitida con versión esperada → consultar operación.
- Hover / focus / active: tokens y estados de primitives; disabled siempre incluye razón accesible cuando aplique.
- Pending / disabled: no doble submit; consulta de operación habilitada aunque ya no pueda iniciarse otra.
- Escape / click-away: cerrar sólo presentación; no cancelar operación backend ni confirmar cambios. Dirty state sigue diálogo canónico.
- Focus restore: invocador aún montado o encabezado del período si cambió la selección.
- Latency feedback: pending por etapa real del reader; no progreso porcentual inventado ni éxito optimista financiero.
- Toast / alert behavior: confirmación sólo tras resultado verificado; errores persistentes en superficie, toast no sustituye estado.

### Motion & microinteractions

- Motion primitive: `existing primitive` — preservar feedback y diálogos canónicos.
- Enter / exit: default de primitive, no coreografía nueva.
- Layout morph: no interpolar importes ni filas entre períodos.
- Stagger: ninguno en tablas de importes.
- Timing / easing token: tokens heredados del primitive; lookup exacta en readiness, sin literales.
- Reduced-motion fallback: cambio de estado inmediato y anuncio equivalente.
- Non-goal motion: contadores animados, celebraciones de pago y progreso simulado.

### Implementation mapping

- Route / surface: /hr/payroll; src/views/greenhouse/payroll/PayrollDashboard.tsx y PayrollPeriodTab.tsx.
- Primitive / variant / kind: reuse de tabla/diálogos y feedback del inventario UI Platform; variante exacta se decide antes de UI ready yes.
- Component candidates: PayrollEntryTable, PayrollEntryAdjustDialog, PayrollReceiptDialog, PayrollPaymentStatusCard.
- Copy source: src/lib/copy/payroll.ts.
- Data reader / command: adapters TASK-1820/1821, operation TASK-1822, delivery TASK-1823; rutas actuales bajo src/app/api/hr/payroll se mantienen como adapters canónicos.
- API parity: esta task es consumer de contratos ya entregados; cambios server-side pertenecen exclusivamente a TASK-1820..1823.
- Access / capability: DTO de capabilities vigentes, revalidación backend en ejecución; UI no inventa guardas de negocio.
- States to implement: todos los del inventario; request identity incluye período y generación de fetch para descartar respuestas atrasadas.

### GVC scenario plan

- Scenario file: nueva propuesta scripts/frontend/scenarios/task1826-payroll-period-consistency.scenario.ts; no existe aún, crear al implementar.
- Route: /hr/payroll.
- Viewports: desktop 1440×1000 y mobile 390×844.
- Quality profile: `premium`.
- Required steps: cargar A → seleccionar B → inyectar fallo GET → retry B → refresh secundario → respuesta A tardía → acción bloqueada → operación parcial → reabrir estado.
- Required captures: A ready, B loading/error, B ready, conflicto de versión, parcial documentos y resumen de entrega.
- Required data-capture markers: propuestos payroll-period-context, payroll-period-data, payroll-preflight, payroll-operation-status; verificar y registrar antes de usar.
- Assertions: selector, dataset y version pertenecen al mismo período; CTA no opera snapshot viejo; enlace privado no expone asset sin permiso.
- Scroll-width checks: document.documentElement.scrollWidth === document.documentElement.clientWidth en ambos viewports.
- Reduced-motion / focus evidence: secuencia equivalente con prefers-reduced-motion, Escape, Tab y retorno de foco.
- Review dossier: obligatorio y revisado visualmente; incluir origen del fixture y fallo interceptado, no declararlo incidente real.
- Baseline decision / surface ID: establecer baseline después de aprobar dirección repo-native y registrar surfaceId; no usar imagen inventada como producción.

### Design decision log

- Decision: conservar composición Payroll y hacer explícita identidad/freshness del snapshot; un solo estado por período seleccionado.
- Alternatives considered: ocultar datos durante fetch (preferida si destino cambia); mantener stale data etiquetada (sólo mismo período); rediseño completo (rechazado por scope).
- Why this pattern: reduce mezcla de períodos y mantiene contexto accesible en error sin reescribir la pantalla.
- Reuse / extend / new primitive: reuse primero; extend sólo por necesidad demostrada en lookup, sin nuevos shells.
- Open risks: contratos DTO pendientes y mapping fino de tokens/primitive; por eso UI ready permanece no.

### Visual verification

- GVC scenario: task1826-payroll-period-consistency, nuevo al implementar.
- Viewports: desktop y 390px.
- Required captures: secuencia anterior y contraste entre permisos read-only/execute.
- Required data-capture markers: identidad, datos, preflight y operación.
- Scroll-width check: igualdad a nivel página; tabla no encubre overflow del documento.
- Accessibility/focus checks: teclado, aria-busy/status, orden de heading, errores enlazados y foco estable.
- Before/after evidence: misma fixture y viewport antes/después; estado fallido debe quedar reproducido.
- Known visual debt: no es rediseño total; cambios fuera del recorrido se documentan como exclusiones.
- Visual scorecard: nueva propuesta docs/ui/reviews/TASK-1826-payroll-period-consistency.scorecard.json.
- Quality threshold: canon greenhouse-ai-design-studio vigente: average >= 4.5, floor >= 4 y dimensiones críticas >= 4.5; no bajar umbral para cerrar.


## Backend/Data Contract

Contrato de consumo, no una segunda implementación backend. El dominio Payroll activa este addendum por
sensibilidad; Backend impact permanece none porque las modificaciones son de presentación y wiring a APIs ya entregadas.

### Backend/data brief

- Backend rigor: `backend-critical` para la dependencia financiera; esta task no cambia datos/commands.
- Impacto principal: consumo UI de DTO de TASK-1820..1823.
- Source of truth afectado: ninguno nuevo; readers/commands canónicos Payroll.
- Consumidores afectados: portal /hr/payroll.
- Runtime target: browser portal con adapters server-side existentes.

### Contract surface

- Contrato existente a respetar: API Payroll y DTO formalizados por TASK-1821.
- Contrato nuevo o modificado: sólo state de presentación por periodId/version/request; no API nueva.
- Backward compatibility: conservar permisos y rutas backend; bloquear CTA si contrato aún no disponible.
- Full API parity: toda acción invoca el command backend existente; cualquier gap vuelve a TASK-1821 antes del wiring.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna directamente; snapshot de Payroll servido por backend.
- Invariantes: selector y dataset mismo período; no cálculo local; falta de dato no significa cero; operaciones no se repiten por cerrar diálogo.
- Write-target allowlist: no acceso directo a DB ni stores desde esta task.
- Tenant/space boundary: DTO autorizado por servidor; parámetros del cliente no confieren acceso.
- Idempotency/concurrency: conservar key/operationId del backend; descartar fetch atrasado; no iniciar intent nuevo para recuperar timeout.
- Audit/outbox/history: backend dueño; UI no publica eventos financieros ni borra historia.

### Migration, backfill and rollout

- Migration posture: ninguna.
- Default state: nuevos controles no disponibles sin capabilities/contrato activo.
- Backfill plan: ninguno; recovery histórica fuera de esta task.
- Rollback path: revert UI/retirar inicio de acción preservando consulta de operación.
- External coordination: owners TASK-1820..1823 verifican DTO/errores antes de integración.

### Security and access

- Auth/access gate: backend revalida toda ejecución y asset read; UI sólo refleja disponibilidad.
- Sensitive data posture: no logs de nómina ni URLs públicas de PDF.
- Error contract: códigos canónicos y copy central, no error.message crudo.
- Abuse/rate-limit posture: pending evita doble click, backend conserva límite real e idempotencia.

### Runtime evidence

- Local checks: componentes con carreras/fallos y contract tests del DTO.
- DB/runtime checks: readback autorizado de snapshot/operación a través de API; sin SQL de pruebas en la UI.
- Integration checks: fixture autorizado e integración entregada, no mock como producción.
- Reliability signals/logs: correlación existente de command/operation; error UI sin PII.
- Production verification sequence: Rollout de esta task y canary TASK-1827.

### Acceptance criteria additions

- [ ] Ninguna regla de negocio, permiso o mutación DB introducida en el browser.
- [ ] Contratos/capabilities de proveedor verificados antes de exponer CTA.
- [ ] Keys, conflictos, resultados parciales y readback preservados por el consumer.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contrato visual y snapshot identity

- Aprobar dirección repo-native acotada y lookup primitive/tokens; completar mapping, copy y escenario antes de UI ready yes.
- Definir estado discriminado por periodId, versión y generación de request; respuestas atrasadas se descartan y cancelación de fetch no cancela negocio.
- Tests conductuales: A→B, B falla, respuesta A tardía, cambio rápido A→B→A, período borrado/no autorizado.

### Slice 2 — Refresh y affordances coherentes

- Refrescar período seleccionado y invalidar caches afectadas por mutación; refrescar KPI activo no reemplaza dataset secundario.
- Edición y CTA consumen permisos/transiciones del backend; calculated/reopened con participación habilitada no ofrece una escritura prohibida.
- Ante conflicto de versión, refrescar snapshot y exigir confirmación nueva; nunca reaplicar automáticamente sobre importes nuevos.

### Slice 3 — Preflight y operación recuperable

- Mostrar bloqueos por etapa y datos faltantes de TASK-1820; readiness desconocido no se presenta listo.
- Recuperar operationId y estado tras recargar; mostrar fallos parciales y retry permitido sólo de pendientes, bajo backend reautorizado.
- Documentos y correo distinguen generación, almacenamiento, encolado, aceptación y entrega; descarga privada autorizada.

### Slice 4 — QA visual e integración

- GVC desktop/mobile con fallo GET controlado, respuestas fuera de orden, conflictos, permisos y parcial delivery.
- Revisar capturas y scorecard con canon vigente; registrar no verificados y conservar UI ready no hasta readiness.
- Integrar contra APIs entregadas; mocks de componentes no sustituyen canary TASK-1827.

## Out of Scope

- Reescribir Payroll entero, introducir nuevas páginas o cambiar navegación/shell global.
- Fórmulas financieras, auth grants, DB, commands o reglas de estados en el cliente.
- Marcar pagado, hacer transferencias o enviar correo real durante QA visual sin autorización.

## Detailed Spec

No se puede renderizar una tabla como perteneciente a periodId B si el snapshot declara A. Al cambiar destino,
retirar datos operables anteriores y mantener el selector/contexto; un error deja B en estado error con retry B.
Para mismo período se puede conservar snapshot stale identificado, con acciones financieras deshabilitadas hasta
validar versión. Deducción/edición local no sustituye resultado canónico. “Reintentar” referencia operación e
intención existente y sólo lo permite backend. Cambiar período cierra/reevalúa dialogs cuyo entryId ya no
pertenece al contexto; Escape no cancela operaciones en vuelo. Mantener importes y moneda completos a390px.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

1→2→3→4; contrato visual y backend DTO antes de wiring. Slice2 puede avanzar con API existente comprobada;
Slice3 espera TASK-1820..1823. No publicar CTA con backend aún ausente.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Tabla de otro período | UI/Payroll | high | Estado por identidad/request, tests fuera de orden | Selector y snapshot distintos |
| Doble submit o versión vieja | UI/API | medium | Pending + key estable + backend conflict | Más de una intención o versión no vigente |
| Error parcial parece éxito | UI/delivery | high | Estado persistente por etapa | Banner de éxito con etapas fallidas |
| Mobile oculta monto/moneda | UI | medium | GVC390 y width assertion | Overflow/truncamiento financiero |

### Feature flags / cutover

Correcciones de coherencia son additive dentro de la UI existente, sin nuevo flag de dominio. Nuevas acciones
sólo se muestran si capabilities/operaciones habilitadas en backend; default no disponible si contrato ausente.
No inferir flags runtime desde documentación. Cutover por deploy autorizado con API compatible verificada.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
|1|Revertir contrato/mock no publicado|En revisión|Sí|
|2|Revertir consumer preservando guardas backend; bloquear CTA afectada si defecto reaparece|Según deploy ensayado|Sí para UI|
|3|Retirar inicio de nuevas acciones; conservar reader de operación y enlace de recuperación|Según deploy ensayado|Parcial; no revierte efectos|
|4|Detener promoción y conservar evidencia|Inmediato|Sí|

### Production verification sequence

1. Tests componentes/API contract y readiness/wireframe/flow/motion gates.
2. GVC staging con lectura/fixtures autorizadas; comprobar mismo backend y acceso antes de cualquier mutación.
3. Deploy autorizado; captura productiva de lectura y readback de configuración/capabilities.
4. Canary de acciones autorizado en TASK-1827; ninguna prueba visual justifica modificar nómina real.

### Out-of-band coordination required

HR/Finance validan el flujo y sujetos de prueba; el dueño release verifica compatibilidad API. No hay envío
ni transferencia autorizada por crear esta task.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] UI ready sigue no hasta dirección durable, mapping, copy, GVC plan y decision log completos; ui:readiness-check pasa antes de JSX.
- [ ] Wireframe/Flow/Motion existen y sus gates focales pasan; primitive reuse/extend/new está justificada antes de implementar.
- [ ] F9/F10/F11 tienen tests de comportamiento que fallan antes y pasan después, incluyendo respuesta fuera de orden y error GET.
- [ ] Selector/dataset/versión/CTA nunca mezclan períodos; refresh recarga el seleccionado y no sólo el activo.
- [ ] Acciones prohibidas no se ofrecen como disponibles; backend sigue siendo autoridad y conflict obliga nueva lectura/confirmación.
- [ ] Preflight desconocido/parcial no anuncia ausencia de bloqueos; todos los estados tienen copy canónico.
- [ ] Recuperación tras reload usa operationId; UI no repite command ni simula progreso, pago o entrega.
- [ ] No se introdujeron reglas de negocio/API en componentes; Capability Definition of Done comprobada en tasks backend proveedoras.
- [ ] Copy reusable vive en src/lib/copy/payroll.ts; tokens y primitives canónicos, sin literales visuales nuevos.
- [ ] GVC premium desktop390 revisada, errores/permisos/long-content/partial cubiertos, scrollWidth===clientWidth.
- [ ] Teclado/Escape/retorno foco y reduced-motion mantienen significado y no ejecutan efectos al cerrar diálogo.
- [ ] Integración contra runtime entregado corroborada; mocks/fixtures y canary están distinguidos en el dossier.

## Verification

- `pnpm task:lint --task TASK-1826`
- `pnpm ui:wireframe-check --task TASK-1826`
- `pnpm ui:flow-check --task TASK-1826`
- `pnpm ui:motion-check --task TASK-1826`
- `pnpm ui:readiness-check --task TASK-1826` antes de JSX, tras completar dirección/mapping.
- Pruebas de PayrollDashboard/PayrollPeriodTab/EntryTable/dialogs con fetch controlado, no assertions sobre strings del código.
- Nuevo escenario GVC descrito, `pnpm fe:capture:review <capture-dir>` y `pnpm ui:quality --task TASK-1826` al implementar.
- `pnpm qa:gates --changed`, docs:closure-check y docs:context-check:strict al cierre.

## Closing Protocol

- [ ] Status real/AC/lifecycle/carpeta actualizados con evidencia, sin declarar complete mientras falte rollout.
- [ ] Registry/README/epic/Handoff sincronizados y ISSUE-134 actualizado según resultado probado.
- [ ] Manual Payroll y contratos UI reflejan estados y recuperación reales; changelog sólo por cambios implementados.
- [ ] Dossier y scorecard accesibles sin PII; pruebas y capturas distinguen inyección local de falla productiva.
- [ ] Chequeo de impacto cruzado con TASK-759d, TASK-1142 y TASK-1827 completado.

## Follow-ups

- Deuda visual fuera del recorrido se registra con owner; no ampliar silenciosamente este fix a rediseño global.

## Open Questions

- Mapping exacto de primitive/token y dirección durable se completan en readiness; este diseño inicial no autoriza JSX todavía.

# TASK-1856 — Autogestión de solicitudes y briefs del cliente

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
- Wireframe: `docs/ui/wireframes/TASK-1856-client-service-request-and-brief-self-service-ui.md`
- Flow: `docs/ui/flows/TASK-1856-client-service-request-and-brief-self-service-ui-flow.md`
- Motion: `docs/ui/motion/TASK-1856-client-service-request-and-brief-self-service-ui-motion.md`
- Backend impact: `none`
- Epic: `EPIC-046`
- Status real: `Diseño registrado por autorización del operador 2026-09-09; sin implementación ni rollout`
- Rank: `5`
- Domain: `delivery|ui|platform`
- Blocked by: `TASK-1854, TASK-1855`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Entrega formulario contextual, acuse, detalle e historial para solicitudes/briefs del servicio. El cliente puede aportar información, consultar respuesta y seguir el resultado mediante los commands de TASK-1855; los avisos vuelven al objeto exacto.

## Why This Task Exists

Sin estados y respuesta visible, un formulario sólo desplaza el trabajo al correo. El cliente debe distinguir el pedido enviado de su aceptación, saber quién responde y recuperar un envío fallido sin duplicarlo.

## Goal

- Materializar P07 de EPIC-046 con ownership acotado y evidencia por cuenta.
- Consumer UI del mismo command/reader API/MCP de TASK-1855; ninguna regla ni efecto de negocio en el componente.
- Cerrar con documentación, pruebas, runtime y rollback propios; crear esta task no activa el servicio.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_CLIENT_SERVICE_EXPERIENCE_DECISION_V1.md` — decisión aceptada, EPIC-046.
- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` y `agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md` bajo docs/architecture.
- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §§7.1/9.1: audiencias, canales y deep links.
- `docs/architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md` — identidad no concede módulos.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`.

Reglas: BFF hoja, productores como SoT, autorización server-side por objeto, no import de stores en browser ni nuevo sender/Pool. No hardcode de cuenta en reglas de producto.

## Normative Docs

- `docs/epics/to-do/EPIC-046-client-services-visibility-and-self-service.md`.
- `docs/context/00_INDEX.md`, `docs/context/10_experiencia-cliente.md` y `docs/context/05_voz-tono-estilo.md`.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`.
- `docs/tasks/to-do/TASK-1834-greenhouse-customer-login-convergence-native-issuer.md` para entrada/retorno; no adquirir su ownership.
- Skills: greenhouse-task-planner y greenhouse-documentation-governor; al implementar, skill de dominio y greenhouse-qa-release-auditor.
- `DESIGN.md`, UI_PLATFORM_AGENT_INVARIANTS.md y UI_FEATURE_AGENT_INVARIANTS.md bajo docs/architecture/agent-invariants; `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`. Invocar greenhouse-ai-design-studio antes de JSX.

## Dependencies & Impact

### Depends on

TASK-1854 entrada servicio; TASK-1855 commands/readers. TASK-693 preferencias, TASK-1834 login/retorno y P09 transporte notificable permanecen separados.

### Blocks / Impacts

Hito B/N de EPIC-046; cliente y responsable comparten estado canónico sin clonar la herramienta de producción.

### Files owned

- src/views/greenhouse/client-portal/ (lista/formulario/detalle de solicitudes propuestos)
- src/lib/copy/client-service-requests.ts (nuevo propuesto)
- src/app/(dashboard)/ (entrada cliente gobernada, ruta por sellar)
- scripts/frontend/scenarios/ (escenario focal propuesto)

## Current Repo State

### Already exists

- `src/views/greenhouse/client-portal/`
- `src/components/greenhouse/primitives/index.ts`
- `src/lib/client-portal/guards/require-view-code-access.ts`
- `src/views/greenhouse/GreenhouseReviewQueue.tsx`

### Gap

Sin estados y respuesta visible, un formulario sólo desplaza el trabajo al correo. El cliente debe distinguir el pedido enviado de su aceptación, saber quién responde y recuperar un envío fallido sin duplicarlo.

Baseline de código y documentos de esta planificación; flags, datos y entrega productiva se verifican al ejecutar, no se infieren del epic.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: src/views/greenhouse/client-portal/ como consumer de TASK-1855.
- Future candidate home: `portal`
- Boundary: Consumer UI del mismo command/reader API/MCP de TASK-1855; ninguna regla ni efecto de negocio en el componente.
- Server/browser split: DTO tipado browser-safe; stores, policy, secretos y providers sólo server-side.
- Build impact: sin dependencias pesadas previstas; no nuevo runtime ni imports globales. Cualquier dependencia nueva requiere mapping de consumidores.
- Extraction blocker: sesión/autorización y productores compartidos; no crear apps/packages ni repartir transacciones por red.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: cliente con servicio/acción permitidos; responsable interno sólo cuando el contrato lo habilite.
- Momento del flujo: Servicio → nueva solicitud → validación/envío → acuse → detalle/respuesta → completar información → resolución.
- Resultado perceptible esperado: Enviar o completar una solicitud del servicio con estado y próximo paso claros.
- Friccion que debe reducir: navegación sin contexto, estados ambiguos y trabajo repetido por errores.
- No-goals UX: nueva identidad, builder Insights, centro de notificaciones o políticas en browser.

### Surface & system decision

- Surface: lista/detalle de solicitudes dentro del servicio cliente; ruta exacta propuesta al sellar diseño.
- Nav placement: `sidebar` — destino bajo la zona cliente existente, sujeto a módulo; no nuevo slot superior ni duplicado con Home.
- Composition Shell: aplica; encabezado fuera de regions.primary mediante recipe/WorkbenchHeader.
- Primitive decision: `reuse` — CompositionShell y catálogo canónico; extender sólo con evidencia del gap.
- Adaptive density / The Seam: aplica a resumen/lista y detalle; compacto reorganiza sin cortar contenido.
- Floating/Sidecar/Dialog decision: detalle persistente cuando hay URL; confirmación de salida sólo para cambios sin guardar.
- Copy source: `src/lib/copy/` y `src/config/greenhouse-nomenclature.ts`.
- Access impact: views/entitlements existentes y matriz TASK-1852; sin nuevos grants desde UI.

### State inventory

- Default: datos de servicio y acción permitida.
- Loading: estructura estable y estado real sin porcentaje inventado.
- Empty: distinguir sin datos, sin período y sin contratación; siguiente paso legítimo.
- Error: mensaje persistente y retry permitido conservando contexto/inputs.
- Degraded / partial: mostrar fuente/corte y partes disponibles, no ceros sustitutos.
- Permission denied: estado neutro sin título/objeto ajeno.
- Long content: wrap semántico, sin truncar datos necesarios para decidir.
- Mobile / compact: una columna, acciones alcanzables y lista adaptable.
- Keyboard / focus: orden lógico, error summary y retorno al invocador.
- Reduced motion: estados estáticos; ningún significado depende de movimiento.

### Interaction contract

- Primary interaction: Enviar o completar una solicitud del servicio.
- Hover / focus / active: affordances del primitive y foco visible; no sólo hover.
- Pending / disabled: estado del command/reader; prevención de doble submit sin perder inputs.
- Escape / click-away: cierre reversible; dirty state requiere elección explícita.
- Focus restore: volver a invocador o encabezado del destino tras navegación.
- Latency feedback: estado persistente durante request; no optimistic success de negocio.
- Toast / alert behavior: toast auxiliar; error/acuse conserva representación persistente.

### Motion & microinteractions

- Motion primitive: `none` — sin movimiento específico en esta task; controles heredados del sistema.
- Enter / exit: cambio estático; sin secuencia ornamental.
- Layout morph: no aplica.
- Stagger: no aplica.
- Timing / easing token: heredados de controles base, sin valores nuevos.
- Reduced-motion fallback: misma información/acciones sin movimiento.
- Non-goal motion: counters animados, charts animados o nuevas transiciones; si se incorporan, registrar contrato motion antes de implementar.

### Implementation mapping

- Route / surface: lista/detalle de solicitudes dentro del servicio cliente; ruta exacta propuesta al sellar diseño.
- Primitive / variant / kind: CompositionShell/WorkbenchHeader, lista/detail del catálogo; mapping final se sella antes de UI ready yes.
- Component candidates: src/views/greenhouse/client-portal/ y primitives exportadas en index.ts.
- Copy source: diccionario de dominio propuesto en Files owned.
- Data reader / command: Contrato de solicitud e historial de TASK-1855, contexto de servicio TASK-1853.
- API parity: consumer de contracts server-side; backend none aquí porque sus dueñas ya están separadas.
- Access / capability: actions y scope recibidos del reader; URL revalidada por servidor.
- States to implement: todos los estados del inventario.

### GVC scenario plan

- Scenario file: scripts/frontend/scenarios/task1856-client-services.scenario.ts (propuesto).
- Route: lista/detalle de solicitudes dentro del servicio cliente; ruta exacta propuesta al sellar diseño.
- Viewports: 1440 y 390px.
- Quality profile: `premium`.
- Required steps: Servicio → nueva solicitud → validación/envío → acuse → detalle/respuesta → completar información → resolución; entrada desde aviso con/sin sesión, otra cuenta y revoked.
- Required captures: first fold, detalle/formulario, empty/partial/error/denied, compacto y foco.
- Required data-capture markers: encabezado, servicio, acción primaria, estado y detalle.
- Assertions: datos coinciden con DTO; destino exacto; sin fuga/duplicación ni aprobación por GET.
- Scroll-width checks: scrollWidth === clientWidth en ambos viewports.
- Reduced-motion / focus evidence: teclado/Escape/restore y preferencia reducida.
- Review dossier: docs/ui/reviews/TASK-1856-client-service-request-and-brief-self-service-ui.md (a producir con captura).
- Baseline decision / surface ID: baseline de la superficie actual antes de implementación; candidate sólo hasta revisión.

### Design decision log

- Decision: composición contextual por servicio/objeto con acción dominante.
- Alternatives considered: dashboard de cards uniforme; lista orientada a pendientes; ficha con evidencia y detalle contextual.
- Why this pattern: preserva período/responsabilidad y escala entre servicios sin UI por cuenta.
- Reuse / extend / new primitive: reuse primero; no primitive nueva prevista.
- Open risks: route mapping, first fold y GVC pendientes; UI ready permanece no.

### Visual verification

- GVC scenario: el escenario focal propuesto, obligatorio antes de cierre.
- Viewports: desktop y 390px.
- Required captures: estados y navegación nombrados arriba.
- Required data-capture markers: dominio estable sin IDs privados.
- Scroll-width check: scrollWidth === clientWidth.
- Accessibility/focus checks: teclado, lector, error summary, foco visible, reduced motion.
- Before/after evidence: baseline/candidate y revisión premium.
- Known visual debt: no first fold implementado; no se afirma paridad visual.
- Visual scorecard: docs/ui/reviews/TASK-1856-client-service-request-and-brief-self-service-ui.scorecard.json (a producir).
- Quality threshold: average >= 4.2; floor >= 3; fidelity/template resistance >= 4.



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

### Slice 1 — Formulario y dirección

- Sellar flujo/wireframe, campos por servicio, adjuntos autorizados y validación accesible. Conservar datos ante error y prevenir doble submit mediante la key del command.

### Slice 2 — Acuse, detalle y respuesta

- Integrar recibido/aceptado/planificado/entregado según estado canónico, responsable y próximos pasos; edición/completar sólo cuando el reader lo permita. Lista e historial comparten DTO.

### Slice 3 — Retorno y recuperación

- Deep link desde avisos al objeto concreto, contexto/login seguro, dirty state y recovery. GVC desktop/390px y negativos de acceso; leer un aviso no completa el pedido.

## Out of Scope

- Commands/migraciones, nuevo sender, aprobación de assets, scorecard BCS, biblioteca/builder Insights y gestión de credenciales.
- Sin commit/push/deploy, cambios live ni envíos como consecuencia de registrar la task. Subagentes y cambios de rama no autorizados.

## Detailed Spec

Contrato de solicitud e historial de TASK-1855, contexto de servicio TASK-1853.

Consumer UI del mismo command/reader API/MCP de TASK-1855; ninguna regla ni efecto de negocio en el componente.

Los paths marcados propuestos son diseño, no código existente. Discovery debe verificar API/DDL/rutas y resolver ownership antes de implementar; una ampliación material vuelve al ADR/plan. Esta task es P07, no un cambio de prioridad de otras dueñas.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → Slice 2 → Slice 3. Contrato/negativos antes de habilitación; staging/fixture técnico antes de piloto cliente autorizado. Dependencias condicionales se evalúan por superficie, sin bloquear el trabajo independiente.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Acceso o dato de otra cuenta | identity/portal | medium | Scope de servidor y prueba positiva/negativa por objeto | Denegación y correlación sanitizada; sin payload sensible |
| Estado o entrega anunciado sin evidencia | delivery/UI | medium | Estado canónico, revisión de fuente y readback por canal | Error/degradación explícitos y log del dominio |
| Duplicación durante retry/cutover | commands/notifications | medium | Idempotencia y un owner por efecto; UI no repite writes | Audit de conflicto/duplicado |

### Feature flags / cutover

Rollout por cohorte/módulo existente; no inventar nombres de flags activos. Toda capacidad nueva comienza deshabilitada o sólo lectura hasta evidencias. Si se necesita flag nueva, declararla en ledger antes del apply. TASK-1834 controla de forma independiente login legacy/nativo/recovery.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Retirar contrato nuevo no consumido; conservar baseline y evidencia | Una revisión | sí |
| 2 | Deshabilitar capacidad/cohorte nueva; restaurar consumer anterior. En writes, compensar con command y versión auditada, sin borrar historial | Medir y registrar en ensayo previo | parcial si hubo efecto externo |
| 3 | Pausar expansión y canal/schedule afectado; conservar entregas y evidencia, no reenviar automáticamente | Medir y registrar en ensayo previo | parcial; correo recibido no se revoca |

### Production verification sequence

1. Verificar contratos, dependencias y estado real de cohortes contra runtime; dry-run antes de writes.
2. Local/staging con fixture técnico y todos los negativos; verificar DB/worker cuando cambien.
3. Ensayar recuperación/rollback y registrar su comando exacto antes de mutaciones productivas.
4. Piloto autorizado por cuenta; leer resultado funcional, API y logs/ledger del runtime dueño.
5. Expandir sólo tras evidencia; mantener abierta si rollout, datos o canales siguen pendientes.

### Out-of-band coordination required

Fuentes de Berel/Sky, responsables, consentimiento de piloto y disponibilidad Teamsbot según matriz TASK-1852. No solicitar credenciales nuevas para suplir una integración inexistente. El registro documental no autoriza mensajes, invitaciones o cambios de proveedor.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Formulario deriva servicio/campos/acciones del contrato; datos del usuario sobreviven a validación/error sin duplicar solicitudes.
- [ ] Acuse muestra identidad del pedido y siguiente paso; no promete aceptación, SLA o fecha que backend no haya confirmado.
- [ ] Pendiente de información permite completar y leer respuesta/historial propio; errores de sync son explícitos y recuperables.
- [ ] Deep links revalidan permiso y preservan objeto/contexto; otra organización recibe estado seguro sin filtrar títulos/adjuntos.
- [ ] No hay modificación contractual o publicación implícita y las acciones de negocio se ejecutan exclusivamente por TASK-1855.
- [ ] UI ready permanece no hasta mapping, first fold, GVC y design decision log sellados; wireframe/flow TASK-1856 existen y pasan gates focales.
- [ ] CompositionShell/primitives y copy canónico reutilizados; no lógica de autorización ni datos en browser.
- [ ] Loading/empty/error/partial/denied/long content y compacto cubiertos; GVC premium visto en desktop/390px con teclado/foco/reduced motion y sin overflow.
- [ ] Nav placement/módulo y presupuesto verificados; no destino visible duplicado ni enlace a superficie no habilitada.

## Verification

- Task lint focal: template=1, legacy=0, errors=0, warnings=0 antes de registro.
- Implementación: `pnpm qa:gates --changed`, typecheck/lint y pruebas focales proporcionales; no guardas de forma textual como evidencia de comportamiento.
- SQL/runtime: `pnpm test:live`, serializado; nunca source de .env.local. Probar positivos/negativos e idempotencia cuando hay writes.
- UI/API/MCP comparten autoridad y resultado; evidencias sanitizadas, sin datos cliente usados como fixtures técnicos.
- `pnpm docs:closure-check`; después de toda edición `pnpm docs:context-check:strict` como último gate.

## Closing Protocol

- [ ] Status real, Lifecycle y carpeta reflejan evidencia; sin rollout se conserva abierto.
- [ ] Criterios tildados con evidencia concreta; no confundir código, deploy y operación.
- [ ] Registry/README/EPIC-046 y dependencias actualizados; manual técnico/funcional y recuperación proporcionados.
- [ ] Handoff/changelog y gates documentales al día; no commit/push automático.

## Follow-ups

Las dueñas citadas conservan su scope y epic. No crear tareas por gráfico, cuenta, endpoint o QA. Móvil/push y ampliación comercial quedan fuera de esta cohorte.


## Open Questions

Sin preguntas que bloqueen el registro. El plan de ejecución debe resolver los paths/DDL propuestos y readiness real antes de código. Para ejecutar en Codex: /goal explícito y task-hook; este registro no inicia implementación.

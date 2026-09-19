# TASK-1881 — Person 360 — Operational Leadership Performance

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
- Wireframe: `docs/ui/wireframes/TASK-1881-person-leadership-performance.md`
- Flow: `docs/ui/flows/TASK-1881-person-leadership-performance-flow.md`
- Motion: `docs/ui/motion/TASK-1881-person-leadership-performance-motion.md`
- Backend impact: `none`
- Epic: `EPIC-048`
- Status real: `Diseño — planificación creada; sin implementación ni verificación runtime`
- Rank: `EPIC-048-03`
- Domain: `ui|hr|delivery`
- Blocked by: `TASK-1880`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Agregar una sección de liderazgo operativo en Person 360 → Actividad para cualquier miembro con responsabilidad válida y acceso autorizado; Daniela es el piloto inicial, no una condición del componente. Mostrar resultados del equipo, calidad de datos, cuentas y excepciones consumiendo exclusivamente TASK-1880; conservar separada la contribución individual.

## Why This Task Exists

El perfil actual consulta ICO del miembro y puede transmitir una evaluación sesgada cuando casi no ejecuta tareas propias. La UI debe representar responsabilidad sobre el equipo sin fabricar un score, mezclar indicadores heterogéneos ni ocultar cuentas sin datos.

## Goal

- Entender qué cuentas cumplen, qué evidencia falta y qué requiere atención.
- Consultar métodos/denominadores/tareas sin abandonar el contexto de persona/período.
- Preservar privacidad, semántica de métricas y experiencia desktop/móvil.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/UI_FEATURE_AGENT_INVARIANTS.md`
- `docs/architecture/ui-platform/README.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `docs/architecture/GREENHOUSE_MY_PERFORMANCE_SELF_SERVICE_ACTIVITY_V1.md`
- `DESIGN.md`
- ADR de TASK-1879 y contrato de TASK-1880 una vez aprobados.

Reusar Vuexy/theme/primitives; no publicidad ni estilos de campaña. No JSX antes del gate de diseño y DTO/policy confirmados.

## Normative Docs

- `docs/architecture/GREENHOUSE_OPERATIONAL_LEADERSHIP_MEASUREMENT_V1.md` — contrato funcional/técnico compartido, In design.
- `docs/architecture/GREENHOUSE_OPERATIONAL_LEADERSHIP_MEASUREMENT_DECISION_V1.md` — ADR Proposed, aceptación pendiente antes de implementación.
- `docs/architecture/metrics/POTD_V1.md`, `FTR_V1.md` (§14), `ACC_V1.md`, `FRM_V1.md`, `STI_V1.md` — definiciones únicas (todos bajo docs/architecture/metrics).

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/context/00_INDEX.md`
- `docs/epics/to-do/EPIC-048-operational-leadership-performance-ico-person-360.md`

Prioridad/esfuerzo inferidos: P1/Alto por impacto en medición y evidencia sensible. Sólo se registra planificación el 2026-09-19; ninguna autorización de deploy, cambio salarial o implementación se desprende de este archivo.

- `docs/ui/visual-directions/TASK-1881-person-leadership-performance-direction.md`
- `docs/ui/wireframes/TASK-1881-person-leadership-performance.md`
- `docs/ui/flows/TASK-1881-person-leadership-performance-flow.md`
- `docs/ui/motion/TASK-1881-person-leadership-performance-motion.md`

## Dependencies & Impact

### Depends on

- Specs de métricas y ADR de liderazgo en Normative Docs: fuente única de fórmulas/temporalidad; no redefinirlas dentro de la task.

- TASK-1880: DTO versionado, reader autorizado, fixtures/trust/revisiones y drilldown; TASK-1879 transitiva.
- TASK-1075/1076 (EPIC-018): storytelling/primitives compartidos. Reusar estado actual; no absorber el rediseño de toda Actividad.
- TASK-1216 y person-activity-access existentes: la nueva UI no concede permisos.

### Blocks / Impacts

- Entrega visual del EPIC-048; no bloquea UI individual ni cambia bono.
- TASK-1076 conserva adopción general de otras superficies; coordinar sólo composición local de liderazgo.
- No cambio de /my/performance ni navegación global.

### Files owned

- Documentación: contrato/ADR de liderazgo referenciados en Normative Docs; TASK-1880 posee cambios de métodos en los cinco specs de métricas, TASK-1879 sólo identidad/evidencia y TASK-1881 sólo consumo. Coordinar cualquier cambio de fórmula con TASK-1880.

Existentes:
- `src/views/greenhouse/people/tabs/PersonActivityTab.tsx`
- `src/views/greenhouse/people/PersonTabs.tsx` sólo si requiere estado de subvista; no reescritura general.
- `src/components/greenhouse/PeriodNavigator.tsx` se consume, no se modifica su contrato sin nueva decisión.

Propuestos NUEVOS:
- `src/views/greenhouse/people/components/PersonLeadershipSection.tsx`
- `src/views/greenhouse/people/components/LeadershipAccountEvidence.tsx`
- `src/lib/copy/leadershipPerformance.ts` conforme a organización/locales vigentes.
- `scripts/frontend/scenarios/task1881-person-leadership-performance.scenario.ts` y tests de interacción.
Artefactos de diseño existentes listados arriba; nuevos paths son propuestas, no código ya creado.

## Current Repo State

### Already exists

- `src/app/(dashboard)/people/[memberId]/page.tsx` → PersonView → PersonTabs → PersonActivityTab.
- Tab activity usa API ico-engine/context dimensión member e intelligence trend=6.
- `src/lib/people/person-activity-access.ts` y `src/lib/people/permissions.ts`: self no basta; se requiere audiencia autorizada.
- Primitives CompositionShell, SurfaceRecipe, WorkbenchHeader, MetricTrendCard y sidecars en el sistema Greenhouse.

### Gap

No sección de responsabilidad de equipo ni contrato de respuesta de liderazgo implementado. No existe evidencia GVC de esta feature. Wireframe es propuesta, no lectura de producción.

## Modular Placement Contract

- Topology impact: `portal`
- Current home: `src/views/greenhouse/people` dentro del dashboard existente.
- Future candidate home: `portal`
- Boundary: consumer del leadership performance DTO de TASK-1880; no fórmula ni command propio.
- Server/browser split: backend conserva auth/DB/provider; browser sólo presentación y navegación autorizada.
- Build impact: sin SDK, dependencia pesada ni entrypoint global nuevo.
- Extraction blocker: route/session y primitives compartidos; no extracción de paquete.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: miembro líder y dirección/HR/supervisor con grants/scopes comprobados, nunca clientes.
- Momento: revisión diaria/weekly y lectura del cierre mensual/trimestral.
- Resultado: localizar cuenta/excepción, entender denominador/confianza y abrir evidencia.
- Fricción: no interpretar tareas propias como resultado del equipo ni inferir perfección de datos faltantes.
- No-goals UX: ranking, hero score, captura de bono o rediseño integral del perfil.

### Surface & system decision

- Surface: /people/[memberId]?tab=activity, nueva sección/subvista local.
- Nav placement: `none` — no nuevo destino en sidebar/avatar/command palette.
- Composition Shell: aplica a composición nueva primary/aside sin duplicar shell del perfil.
- Primitive decision: `reuse` — SurfaceRecipe analyticsReport, WorkbenchHeader report, PeriodNavigator, MetricTrendCard, ContextualSidecar y AdaptiveSidecarLayout.
- Adaptive density / The Seam: aplica; filas adaptativas y aside sólo con detalle abierto.
- Floating/Sidecar/Dialog decision: detalle contextual canónico; móvil adaptación del primitive, no drawer casero.
- Copy source: src/lib/copy/*; labels institucionales por nomenclature config. KPIs en inglés; instrucciones/estados en español neutral con locales vigentes.
- Access impact: entitlements existentes/nuevos definidos exclusivamente por TASK-1880; UI consume allowedActions y no concede acceso.

### State inventory

Default working y locked; loading por snapshot; empty legítimo; insufficient_sample; historial FTR desconocido; stale; source_gap; partialScope; sin binding; sin rol; forbidden/revoked; error recuperable; revisión superseded; STI no comparable.
Sin rol mantiene vista individual actual. No devolver cero para missing ni reemplazar datos del período anterior con labels del nuevo.
Cuentas prohibidas no se revelan; alcance parcial explícito sin afirmar cartera completa.

### Interaction contract

Período controla resumen, cuentas, cola y tendencia; filtros de cuenta no cambian silenciosamente significado del agregado.
Abrir evidencia mantiene member/period/revision/account; paginación autorizada. No fallback a endpoint más permisivo ni datos de otro mes.
AbortController/request identity evita respuesta fuera de orden al cambiar período rápido. Cache keys incluyen subject, período, revisión, filtros y contexto de permisos; revocación limpia detalle protegido.
Keyboard, Escape, back y focus restoration del sidecar; no writes ni dirty state en esta task.

### Motion & microinteractions

Reusar contrato de motion referenciado: estados de carga estables, no animated counters ni celebración laboral. Reduced motion conserva información y foco; loading no anuncia resultados falsos. Sin nueva librería.

### Implementation mapping

PersonActivityTab → PersonLeadershipSection (NEW) → header/period/status + hoja analítica + AccountEvidence (NEW).
POTD/FTR exhiben fracción/cobertura; ACC presenta asignación/capacidad separadas; FRM cola y acciones registradas; STI vector de deltas comparable. No calcular tasas, baseline ni confianza en JSX.
Direction/wireframe enumeran primitives. Tokens de theme, no valores decorativos literales. Reutilizar diccionarios/formatters existentes antes de crear nuevos.

### GVC scenario plan

Scenario nuevo propuesto en scripts/frontend/scenarios/task1881-person-leadership-performance.scenario.ts; qualityProfile: premium.
Desktop 1440 y mobile 390, fixtures deterministas working/locked/partial/empty/stale/denied/low_sample, sidecar y navegación rápida.
Dossier con source/runtime comparison, baseline decision explícita, console/network, teclado/reduced motion y page scrollWidth===clientWidth. Pruebas de contenido complementan screenshots.

### Design decision log

Alternativas: cinco cards (descartada por falsa equivalencia), página nueva (descartada por duplicación), hoja analítica (elegida).
Reuse, no nuevo primitive. No tabla de ranking de personas; comparación por cuenta con volumen/mix.
UI ready permanece no hasta que dirección, copy/estados, mapping y contrato real de TASK-1880 sean revisados; registro de planificación no es aprobación de UI.

### Visual verification

Premium: promedio ≥4.5, ninguna dimensión <4 y críticas ≥4.5; review enterprise. Contrast/text equivalents, zoom, long content, focus, reduced motion y 390px sin overflow. Evidencia runtime obligatoria antes de complete.

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

### Slice 1 — Design readiness y consumer contract

Validar direction/wireframe/flow/motion contra DTO/policy implementados; confirmar exports/primitives/tokens, copy y estados. Registrar gate UI ready sólo con evidencia documental completa, sin confundirlo con GVC final.

### Slice 2 — Composición de liderazgo

Integrar lectura gateada, selector único y separación de contribución individual. Implementar hoja con summary/coverage, lista paginada de cuentas del manifest autorizado y ACC/FRM. Cardinalidad variable, incluidas cuentas nuevas aún sin métricas; no derivar filas de accountResults solamente.

### Slice 3 — Evidencia y tendencia

Drill-down paginado con method/reason/exclusions/revision y tareas autorizadas. STI sólo si comparable; estados de confianza visibles. Lectura de intervenciones, sin nuevo formulario de escritura.

### Slice 4 — QA y canary interno

Tests de interacción/acceso, GVC premium, a11y/móvil y revisión enterprise. Readback con API real en perfil autorizado; preservar métricas individuales. Corregir defectos antes de cerrar.

## Out of Scope

Migraciones, APIs nuevas, cálculos en browser, commands de intervención/cierre, nuevos grants, edición de bono, export de datos sensibles y rediseño /my/performance/Agency.

## Detailed Spec

### Dynamic portfolio UX contract

La UI muestra sólo el manifest autorizado de TASK-1880, tanto cuentas medibles como pending_source, disabled_source, insufficient_history, unsupported_source, unresolved binding y not_enabled_for_rollout. La pertenencia no nace de resultados métricos.
Resumen de alcance con counts server-side y cobertura POR MÉTRICA: distinguir “cuentas con datos” de “tareas con historia conocida”. Si volumen faltante es desconocido, no dibujar un porcentaje global de completitud fabricado. Ausencia de cuentas autorizadas no revela cuántas existen fuera de acceso.
Tabla/lista con búsqueda, filtros y paginación server-side, orden estable y labels dinámicos; usar primitives existentes, sin renderizar toda la cartera en select ni efectuar query por fila. Cambiar página no cambia POTD/FTR del resumen; filtro explícito identifica si el resumen corresponde a filteredSubset. Mostrar fullPortfolio/authorizedSubset sin inferir nombres ni totales prohibidos.
Cambio de manifestVersion invalida cache de cuentas, detalle y métricas de la revisión anterior. Ante baja de cuenta/cambio de permisos, cerrar detalle protegido, devolver foco y anunciar cambio sin exponer información revocada. Ante alta, la próxima lectura del ciclo muestra la nueva fila con su estado real; nada depende de cuatro slots ni del nombre de Daniela.
Período histórico muestra cartera histórica autorizada, no la actual. Búsqueda/filtros conservan contexto; si cuenta solicitada no pertenece al período o no es accesible, respuesta segura sin fallback silencioso a otra cuenta.
Diseño/GVC incluye 0/1/4/5/51/201 cuentas, dos líderes, alta quinta sin datos, cambio de líder a mitad de mes y scopeChanged en STI. Reusar hoja analítica/lista móvil: no nuevas cards por cuenta, mismo desktop/390px y orden de foco.

### Information hierarchy

1. Identidad/rol y tabs existentes.
2. Liderazgo operativo: período, lifecycle, frescura y alcance.
3. POTD y FTR con numeradores/denominadores/confianza, sin mezclar sample con score.
4. Tabla de cuentas (mobile lista), volumen y huecos de fuente.
5. Excepciones ACC/FRM por severidad/antigüedad de datos del backend, no ranking de personas.
6. STI y baseline/metodología.
7. Contribución individual separada y claramente rotulada; conservar comportamiento previo.

### State presentation

Locked no significa valid: mostrar ambos ejes. Si una parte de las cuentas tiene datos y otra no, explicar cobertura parcial; nunca omitir las no medibles para inflar el agregado. Cantidades/plurales vienen del DTO, no de copy fijo.
Denominador cero: «Sin tareas elegibles en este período», no guion ambiguo ni 100%.
Historia incompleta: «No hay historial suficiente para evaluar FTR», mostrar cobertura/fecha de inicio conocida y no mensaje de culpa.
Freshness vencida: fecha y último snapshot identificado; no spinner eterno ni retry infinito.
Método y KPI names en inglés según convención; expansiones: Portfolio On-Time Delivery, First Time Right, Assignment & Capacity Coverage, Flow Risk Management, Sustained Team Improvement.

### API integration

Reader server-side de TASK-1880 es único origen. Estados contractuales se mapean exhaustivamente con TypeScript; unexpected schema muestra error seguro, no fallback de performance.
URL preserva contexto sin exponer PII/secretos; filtros validados por servidor. No prefetch de tasks/cuentas fuera de allowed scopes.
Error parcial conserva datos sólo si pertenecen al mismo revision/source snapshot. No dos períodos mezclados entre FTR/OTD.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

TASK-1880 contract/policy + Slice1 UI ready → 2 → 3 → 4. Esta planificación no habilita JSX.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Datos parciales parecen nota alta | UI | high | confidence/cobertura junto al valor | prueba de estados falla |
| Respuesta tardía mezcla meses | UI/API | medium | cancellation y cache identity | test de race falla |
| Fuga al drill-down | People | medium | policy backend y revoked-state | forbidden audit |
| Regresión en actividad individual | UI | medium | consumer aislado y regresión | GVC/test individual |
| Overflow/cinco cards ilegibles | mobile | medium | hoja/lista adaptativa | scroll-width gate |

### Feature flags / cutover

Consumir readiness/availability gobernada de TASK-1880; flag de presentación nuevo sólo si se justifica y registra owner/default OFF. No activar por nombre de Daniela. Rollout interno allowlisted después de API canary y UI QA; sin audiencia cliente.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Volver UI ready no y corregir diseño | inmediato | sí |
| 2 | Ocultar nueva sección por availability flag | objetivo 15 min, ensayar | sí |
| 3 | Desactivar detalle nuevo manteniendo individual | objetivo 15 min, ensayar | sí |
| 4 | Revertir consumer vía release gobernado | según runbook ensayado | sí; sin datos mutados |

### Production verification sequence

GVC staging con fixtures → API real autorizada → comparación cuentas/period/revision → denied/revoked y 390px → piloto interno de perfil real → verificar contribución individual intacta → registrar dossier y readback. No publicar datos reales en fixtures/capturas compartidas.

### Out-of-band coordination required

Ops revisa claridad de lectura para Daniela, no aprueba cambios salariales. Owner de TASK-1880 confirma canary y acceso mínimo. Revisión de diseño requerida antes de aprobar baseline; no acceso auto-concedido para obtener captura.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Métodos, estados y casos edge se ajustan a specs canónicos/ADR de Normative Docs; aprobación del ADR y calibración pendientes se registran sin confundir documentación con implementación.

- [ ] UI refleja quinta cuenta al siguiente refresh de ciclo sin código/deploy; pending source visible y nombres/counts dinámicos, sin cuatro slots fijos.
- [ ] Lista 51/201 cuentas paginada con búsqueda/filtros server-side; agregado no depende de página ni filtra datos/metadata de scopes prohibidos.
- [ ] Cambio de manifest/período/permiso invalida caches y detalle; historia conserva su cartera y STI señala cambio de composición.
- [ ] GVC y tests incluyen 0/1/5/51/201 cuentas, dos líderes, cuenta nueva sin datos y baja/reasignación.

- [ ] UI ready sigue no hasta mapping, contrato real, copy, estados y decisión visual revisados.
- [ ] Wireframe/flow/motion existentes pasan gates focales; primitive decision reuse y tokens documentados.
- [ ] Liderazgo e individual separados, KPIs en inglés y copy/aria/error centralizados.
- [ ] UI no calcula fórmulas ni solicita datos no autorizados; no hardcodes personales o cuatro IDs.
- [ ] Período/filtros/revision consistentes y prueba de race, partialScope, denied/revoked pasa.
- [ ] Todos los estados de confianza/frescura/cierre se distinguen; no 0/100 fabricado.
- [ ] GVC premium desktop/390px, teclado, reduced motion, contraste y scrollWidth===clientWidth pasan.
- [ ] Dossier/review enterprise, baseline explícito y readback interno real registrados.
- [ ] Regresión individual y ausencia de cambios a DB/Payroll verificadas; rollback de consumer ensayado.

## Verification

Plan futuro: `pnpm task:lint --task TASK-1881`, `pnpm ui:wireframe-check --task TASK-1881`, `pnpm ui:flow-check --task TASK-1881`, `pnpm ui:motion-check --task TASK-1881`, `pnpm ui:readiness-check --task TASK-1881`.
En ejecución: tests de component/contract, `pnpm typecheck`, `pnpm lint`, escenario GVC registrado con `pnpm fe:capture` en staging; QA gates y docs closure. No build ni captura de una feature inexistente al registrar esta task.

## Closing Protocol

- [ ] Lifecycle y carpeta reflejan ejecución y verificación reales; no cerrar por código solamente.
- [ ] Sincronizar README, registry y progreso/acceptance del EPIC-048.
- [ ] Actualizar Handoff.md y changelog cuando exista cambio de comportamiento; registrar evidencia, pendientes y owners.
- [ ] Ejecutar chequeo de impacto cruzado con las tasks citadas; preservar trabajo ajeno.
- [ ] Manuales, observabilidad, rollback y readback runtime disponibles antes de complete.

## Follow-ups

La política prospectiva de compensación exige solicitud independiente de HR/Finance. Este programa no recalcula bonos, no aplica consecuencias salariales y no modifica Payroll.



## Delta 2026-09-19 — UI de cartera variable

La cardinalidad proviene del manifest, no del piloto. Estados, paginación, filtros, cache y escenarios de diseño/QA se amplían; UI ready sigue no. Ningún JSX implementado.

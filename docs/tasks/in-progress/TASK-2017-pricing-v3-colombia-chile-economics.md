# TASK-2017 — Validación económica del piloto Pricing V3 Colombia → Chile

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `policy`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Status real: `Parcial`
- Rank: `2017`
- Domain: `finance`
- Blocked by: `none`
- Branch: `develop; shared checkout; sin worktrees`

## Summary

Preparar y validar la ficha económica del primer caso local V3: diseñador senior al 50%,
talento Colombia y mercado Chile, confirmado por el operador el 2026-10-09.
El operador sólo dispone del antecedente del Excel; costos vigentes y política comercial siguen pendientes.

## Why This Task Exists

El núcleo ya calcula, pero el catálogo de revisión no acredita costo colombiano, vigencia,
coberturas ni margen. Falta una ficha ligada al input real para que un agente pueda completar
los datos con procedencia, sin convertir referencias históricas en tarifas.

## Goal

- Vincular decisiones, fuentes y responsables a los campos del snapshot ejecutable.
- Preparar comparación de capacidad/plazo con el mismo núcleo, sin fórmulas paralelas.
- Validar economics y alcance comercial antes de habilitar un borrador.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_PRICING_V3_LOCAL_PROTOTYPE_DECISION_V1.md`
- `docs/business-models/EFEONCE_TALENT_ASSURANCE_ECONOMIC_GUARDRAILS_V1.md`
- `docs/services/creative-services/EFEONCE_EMBEDDED_CREATIVE_POD_OPERATING_MODEL_V1.md`

Reglas: faltantes no son ceros; referencia histórica no prueba país/vigencia; licencias y fees
no se prorratean automáticamente por FTE. El costo de una persona no certifica el alcance de
Embedded Creative Pod. Se reutiliza el ADR local; no se modifica semántica financiera ni catálogo runtime.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md`
- `docs/documentation/finance/cotizador-v3-parametros-piloto.md`
- `docs/manual-de-uso/finance/cotizar-v3-por-cli.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-2016-pricing-v3-local-prototype.md`: núcleo local terminado.
- `data/pricing/v3-pilot/parameters.json`: antecedente histórico para revisión.

### Blocks / Impacts

- Borrador económico del piloto: requiere costos y política validados.
- TASK-1607 conserva el gate runtime de recruitability; esta ficha no lo implementa ni duplica.
- V2, payroll, UI, API y MCP permanecen sin cambios.

### Files owned

- `data/pricing/v3-pilot/scenarios/colombia-chile-design-historical-hypothesis.json`
- `data/pricing/v3-pilot/economics/historical-simulation/`: hipótesis y evidencia de cálculo local.
- `docs/documentation/finance/cotizador-v3-piloto-colombia-chile.md`
- `data/pricing/v3-pilot/economics/colombia-chile-review.json`
- `data/pricing/v3-pilot/economics/colombia-chile-readiness.json`
- `data/pricing/v3-pilot/economics/colombia-chile-artifact.json`
- `data/pricing/v3-pilot/README.md`: enlace y estado del piloto.
- `docs/manual-de-uso/finance/cotizar-v3-por-cli.md`: confirmaciones y enlace.
- `docs/tasks/TASK_ID_REGISTRY.md`, `docs/tasks/README.md`, `Handoff.md`, `changelog.md`: sólo delta propio.

## Current Repo State

### Already exists

- `src/lib/finance/pricing-v3/`: motor determinista con snapshots explícitos.
- `scripts/commercial/pricing-v3.ts`: CLI local.
- `data/pricing/v3-pilot/scenarios/colombia-chile-design-needs-input.json`: solicitud del piloto, sin costos inventados.

### Gap

No hay costo actual localizado, cargas validadas, asignaciones de herramientas, fee vigente,
Assurance, operación, setup, política de capacidad/precio/mercado, FX ni alcance creativo aprobado.

## Backend/Data Contract

Backend impact: none. Sólo se produce documentación interna y evidencia local con el contrato
existente; no se cambia schema, reader, command, seed, DB, API, CLI ni método de cálculo.
Los archivos data/pricing son revisión no conectada al runtime comercial.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `data/pricing/v3-pilot/economics/` y documentación Finance
- Future candidate home: `remain-shared`
- Boundary: ficha y ledger internos de revisión; request/snapshot siguen como input del núcleo local
- Server/browser split: `n/a`
- Build impact: `none`
- Extraction blocker: `none`; integración canónica requiere otra unidad

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

Policy: revisión documental y económica; no crea código ni plan de implementación.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

- Simulación calculable con antecedentes históricos e hipótesis explícitas aprobada por el operador; mode historical, fuentes estimated, revisión obligatoria. Mantener separado el input comercial incompleto.
- Ficha interna y ledger con bindings al input existente; sin duplicar importes en el ledger.
- Evidencia real `needs_input` y matriz de sensibilidad preparada.
- Validación posterior de costo/coberturas, términos, política y encaje de delivery con sus dueños.

## Detailed Spec

La ficha define capas y dueños; el ledger enlaza destinos del input, sin importes duplicados.
La evidencia guarda el resultado real incompleto y su replay; no habilita costo o precio.

## Out of Scope

Implementar servicios compuestos, actualizar catálogo operativo, publicar precios,
crear Quote remota, emitir oferta, cambios laborales/fiscales, CRM o envíos.

## Rollout Plan & Risk Matrix

Impact-only: no cambia runtime. La promoción comercial depende de validación Finance/Commercial/Creative Operations.
El riesgo principal es vender un histórico como tarifa o un perfil como pod completo; ledger review-only,
input sin costo y export bloqueado previenen esa interpretación. Para retirar la preparación,
retirar sólo los artefactos de esta task y sus enlaces; no hay estado remoto que revertir.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Perfil/país/dedicación confirmados y supuestos pendientes diferenciados — ficha y ledger.
- [x] Capas de costo, procedencia y bindings al input definidos — ledger de revisión.
- [x] CLI conserva `needs_input`, sin neto ni precio exportable — evidencia local de readiness.
- [x] Sensibilidad de asignación/plazo preparada sin importes sintéticos — matriz del ledger.
- [x] Simulación histórica con cinco casos calculados y comparados; replay verificado y export bloqueado — `data/pricing/v3-pilot/economics/historical-simulation/results.json`.
- [ ] Costos actuales/localización, capacidad y coberturas validados — no hay fuentes actuales disponibles.
- [ ] Alcance creativo, política de precio/mercado/margen/FX y terms aprobados por sus dueños.
- [ ] Cálculo completo, comparación y borrador revisados — depende de datos anteriores.

## Verification

- Validación CLI del input real y lectura del artefacto guardado.
- Comprobación de hash/bindings del ledger y referencias documentales.
- `pnpm task:lint --task TASK-2017`
- Chequeo de cierre documental focal y `pnpm docs:context-check:strict` después de la última edición.

## Closing Protocol

- [x] Lifecycle y carpeta sincronizados: in-progress, avance parcial.
- [x] Índice y registro sincronizados; Handoff/changelog apuntan al avance.
- [x] Impacto cruzado revisado: TASK-2016 cerrado; TASK-1607 conserva su propio runtime.
- [ ] Validación comercial/económica completa y archivo movido a complete.

## Follow-ups

Finance/People/Creative Operations deben aportar fuentes actuales y confirmar reparto de riesgos/costos;
Commercial valida alcance y disposición de pago. No se abrió implementación downstream.

## Delta 2026-10-09

Operador confirmó diseñador senior al 50% y que sólo dispone de datos del Excel.
Ficha y ledger preparados; el input sigue con cost=null. Validación económica permanece abierta.

Tras explicar la separación motor/parámetros, el operador autorizó avanzar usando el Excel
como hipótesis de prototipado. Se prepara un snapshot histórico separado; país, ventana de
evaluación, atribuciones, capacidad, costos de prueba y factores quedan como supuestos explícitos.
Esto no confirma los parámetros del piloto comercial ni aprueba una tarifa vigente.
Cinco casos calculados/requires_review, replay verificado, cuatro compare y export rechazado;
control decimal independiente reconciliado. Base USD 1.064,70/mes + USD 130 setup dentro del ensayo.

## Open Questions

Headcount, duración, modalidad shared/dedicated, moneda comercial, alcance creativo y sourcing del costo colombiano.

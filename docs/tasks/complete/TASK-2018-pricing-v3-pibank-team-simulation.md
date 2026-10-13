# TASK-2018 — Prueba local V3 del equipo Pibank Perú/Chile

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
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
- Status real: `Cerrada`
- Rank: `2018`
- Domain: `finance`
- Blocked by: `none`
- Branch: `develop; shared checkout; sin worktrees`

## Summary

Probar el núcleo V3 con el costo de capacidad del programa gradual de Pibank, usando
costos históricos/provisionales del expediente y las ubicaciones indicadas por el operador:
diseñador/redactor Perú; Director de Arte, Account Manager y demás especialistas Chile.

## Why This Task Exists

La prueba anterior usa un solo perfil. Pibank permite contrastar varios roles, capacidades
reservadas, provisiones y margen, sin confundir el DTO staffing del prototipo con una oferta
completa de servicio gestionado o modificar la cotización vigente.

## Goal

- Preparar snapshot reproducible del costo de capacidad anual y mapa de fuentes/supuestos.
- Ejecutar reconciliación de costo y sensibilidad con aspiración histórica de margen 40%.
- Mostrar diferencias frente al precio documental y límites de calendario/costos reales.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_PRICING_V3_LOCAL_PROTOTYPE_DECISION_V1.md`
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md`
- `docs/business-models/EFEONCE_TALENT_ASSURANCE_ECONOMIC_GUARDRAILS_V1.md`

El ADR local cubre snapshots históricos de capacidad. No se altera fuente de verdad, contrato,
API, catálogo ni método del kernel. Servicios compuestos y aprobación/emisión permanecen fuera de esta prueba.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md`
- `docs/manual-de-uso/finance/cotizar-v3-por-cli.md`
- `docs/commercial/prospects/banco-pichincha-peru-seo-2026/reconstruccion-2027/oferta-hibrida/README.md`
- `docs/commercial/prospects/banco-pichincha-peru-seo-2026/reconstruccion-2027/cotizacion-detallada-2026-10-08/README.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-2016-pricing-v3-local-prototype.md`: kernel y CLI locales.
- Expediente Pibank vigente: ruta gradual, costos centrales y alcance anual.

### Blocks / Impacts

- TASK-2017 conserva validación económica del piloto diseñador Colombia→Chile.
- No se altera oferta, CRM, plantilla/render ni documentos enviados de Pibank.

### Files owned

- `data/pricing/v3-pilot/scenarios/pibank-gradual-peru-chile.json`
- `data/pricing/v3-pilot/economics/pibank/`: manifest, costo y comparación local.
- `docs/documentation/finance/cotizador-v3-prueba-pibank.md`
- `data/pricing/v3-pilot/README.md` y manual V3: enlaces y operación.
- Índice/registro de tasks, Handoff/changelog: delta propio.

## Current Repo State

### Already exists

Motor V3 local; Pibank tiene costo de ruta gradual, matrices de capacidad y cotización documental.

### Gap

El país de los costos históricos no está acreditado, cargas/herramientas siguen provisionales,
y el kernel no implementa alcance gestionado ni variación temporal de FTE dentro de una línea.

## Backend/Data Contract

Backend impact none: sólo fixture/artefacto local y documentación. No se modifica código,
schema, reader, command, migrations o catálogo runtime.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `data/pricing/v3-pilot/economics/pibank/` y documentación Finance
- Future candidate home: `remain-shared`
- Boundary: snapshot local de capacidad histórica; CLI existente, sin servicio compuesto
- Server/browser split: `n/a`
- Build impact: `none`
- Extraction blocker: `none`

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

Policy de ensayo; no se modifica código ni se abre plan de implementación.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

- Reconciliar capacidad/economía del expediente con snapshot histórico, fuentes estimated.
- Asignar países según operador; sin factor salarial de país inventado.
- Comparar costo de ensayo, precio documental y margen objetivo de prueba.

## Detailed Spec

FTE promedio de costo con reservas completas SEO/redactor; no roster ni disponibilidad.
Separar humano de fee identificable, reserva y otros costos; no duplicar gestión/QA/Assurance.
Conservar las fuentes del expediente y su estado provisional.

## Out of Scope

Cambiar oferta Pibank, fijar salarios locales, emitir Quote, servicios compuestos, calendarización
contractual/hitos/facturación, cambios laborales/fiscales, CRM o envíos.

## Rollout Plan & Risk Matrix

Impact-only: no cambia runtime. Riesgos: confundir costo promedio con capacidad mensual, fee
legacy prorrateado con política nueva, margen aspiracional con aprobado, staffing con servicio
gestionado. Mitigación: manifest explícito, historical/estimated, export bloqueado y fuentes intactas.
Retirar los artefactos/enlaces nuevos revierte el ensayo sin estado remoto.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Países confirmados y roles/horas/costos/provisiones con procedencia: assumptions.json y ficha Pibank.
- [x] Reconciliación: USD 57.897,96; delta USD 0,009342105274 frente al expediente, results.json.
- [x] Ensayo al 40% USD 96.496,32; compare y dos replay verified; results.json.
- [x] Export bloqueado en ambos casos sin archivo; hashes originales conservados, results.json.
- [x] Ficha/manual/índices sincronizados; task lint sin errores/advertencias y cierre documental/contexto estricto.

## Verification

CLI calculate/replay/compare/export; control decimal independiente; hashes de fuentes;
`pnpm task:lint --task TASK-2018`; closure documental focal y context-check estricto final.

## Closing Protocol

- [x] Lifecycle, carpeta, registro e índice reflejan prueba local completada.
- [x] Ficha/manual, Handoff/changelog y evidencia sincronizados.
- [x] Impacto cruzado revisado: TASK-2017 y expediente Pibank preservados.

## Follow-ups

Costos reales/país, disponibilidad por mes, alcance de dirección, fiscal/caja y actualizaciones de
capacidad conservan validación posterior fuera de esta prueba. No se aprueba tarifa nueva.

## Delta 2026-10-09

Operador pidió usar lo necesario para Pibank como otra prueba y confirmó la distribución Perú/Chile.


## Evidencia de cierre local 2026-10-09

Ficha: `docs/documentation/finance/cotizador-v3-prueba-pibank.md`.
Evidencia ejecutable: `data/pricing/v3-pilot/economics/pibank/results.json` y dos artefactos.
Dos calculate/replay (código 3, revisión requerida), compare y exports bloqueados (código 1).
`pnpm ops:lint --changed`: 0 errores; 19 advertencias ajenas al ensayo.
QA focal: PASS para ensayo local; costos/viabilidad comercial no certificados. Sin cambio de
kernel, pruebas runtime o gates Finance E2E no aplican a esta fixture. Artefactos locales incluidos en el cierre TASK-2019; sin push ni estado remoto.

## Continuidad documental tras TASK-2022

La prueba Pibank conserva demanda, hipótesis del expediente y artifacts originales. No es tarifa reutilizable ni fuente de precios para nuevos encargos: el flujo posterior toma valores de catálogos/policy y el expediente aporta perfiles, calendario y alcance. Costear roles no equivale a vender horas de personas ni modifica el precio documental presentado.

[Operación completa local](TASK-2022-pricing-v3-operational-agent-workflow.md),
[ADR vigente](../../architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md) y
[manual de agentes](../../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md) permiten descubrir,
planear, cotizar, explicar/replay, evaluar y obtener preview redactado por rol o fee de servicio.
Los 26 recursos originales son 25 herramientas más fee genérico de plataforma; no sumar ese fee dos veces.
La evidencia/AC de este cierre permanece histórica y su lifecycle no se reabre. TASK-2017 conserva economía
parcial; API/UI/MCP siguen en el canon V2 hasta promoción gobernada.

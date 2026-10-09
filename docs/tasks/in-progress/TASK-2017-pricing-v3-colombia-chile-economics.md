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
- `data/pricing/v3-pilot/economics/resource-inputs/`: declaraciones de licencias/plataforma y propuesta de reparto, sin import automático.
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
- [x] Propuesta económica/provisiones/kits y fuentes oficiales preparada; seis sensibilidades con CLI/replay, piso y desglose verificados; carpeta commercial-policy-proposal.
- [x] Catálogo candidato y brief comercial completos en estructura, pendientes de datos; needs_input sin totales y export histórico bloqueado.
- [x] Antecedentes de licencias/plataforma del operador registrados — resource-inputs; planes, asignaciones y reparto pendientes, sin cambiar catálogo/quotes.
- [ ] Costos actuales/localización, capacidad y coberturas validados — hay montos de recursos declarados por operador; costo humano vigente, cobertura/asignaciones y reparto aún pendientes.
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

## Avance 2026-10-09 — política y componentes

Operador pidió ayuda para preparar todas las reglas económicas, costos, herramientas y ensayo comercial.
Pack: `docs/business-models/EFEONCE_CAPACITY_PRICING_INTEGRITY_PACK_V1.md`; objetivo40%/piso35% propuestos, no aprobados.
Drivers/provisiones, fuentes oficiales y borrador de alcance preparados. Seis quote/replay vía CLI y conciliación decimal independientes; descuento10% cruza piso35 y redondeo al35% queda visible.
Candidato local histórico genera32 diagnósticos al comercializar; costoCO y recursos pendientes no se reemplazan por trial25/25/100.
Base histórica/catalogo/input comercial previo intactos. Artefactos en `data/pricing/v3-pilot/economics/commercial-policy-proposal/`.
Status real sigue Parcial: faltan costo actual, modalidad/delivery, capacidad, contratos/recursos y aprobación de políticas nuevas.

## Avance 2026-10-09 — recursos declarados

Operador aporta Higgsfield139USD/3000créditos y Magnific40EUR/45000créditos mensuales, Adobe180USD/mes y3CC Teams+3Express con alza70% próxima, Vercel60–100USD/mes y GCP264USD/mes. Magnific mensual explícito; Vercel/GCP confirmados mensuales en respuesta posterior. Registro con fuente operator_statement, sin factura ni asignaciones inventadas. Cobertura/base del alza Adobe y fecha pendientes;306 condicional. Pool plataforma324–364USD/mes, reparto delivery/interno propuesto, sin precio por cliente.

Datos review-only; no cambiar baseline histórico, quotes previas, DB/CLI o runtime. ADR de mantenimiento reutilizado; integración futura por normalización + preview/apply. Costeo de servicios y acceso API/Globe no se certifican por este registro. Task conserva Parcial.

## Avance 2026-10-09 — selección de herramientas por trabajo

Operador confirma base común Notion/Microsoft365 para todos y SEMrush para redactor SEO; Adobe no requerido
por redacción sola. Higgsfield/Magnific/ChatGPT y Claude Team se seleccionan según trabajo; no se declara
IA universal ni exclusividad. [Reglas y registro](../../documentation/finance/cotizador-v3-seleccion-herramientas.md).
Precios Claude Team investigados a petición del operador en fuentes oficiales: cuatro variantes públicas,
separadas de cantidad/tipos/asignación/factura Efeonce desconocidos. No se normaliza el precio como gasto real.

Clarificación documental bajo ADR de catálogo existente, sin modificación de kernel/CLI/schema runtime.
JSON/enlaces/correspondencia con IDs históricos y anualidades verificados; catálogos/artefactos previos
intactos. Se actualizó manual y modelo; no corresponde repetir tests de código por este delta documental.
TASK-2017 sigue Parcial: falta normalizar kits/valores, reparto, binding al quote y economía comercial.

## Avance 2026-10-09 — composición integrada local

[TASK-2021](../complete/TASK-2021-pricing-v3-demand-resource-composition.md) integra reglas/allocations/IA al quote, explain y replay; tres casos reproducibles y108 tests verdes. Policy inicial para Copywriter/diseñador senior/SEO Specialist. [Manual](../../manual-de-uso/finance/componer-cotizacion-v3-con-herramientas.md). Asignaciones hipotéticas e históricos explícitos, sin inventario o tarifa comercial aprobada. TASK-2017 sigue Parcial: planes/costos vigentes, drivers reales, alcance/delivery y aprobación económica pendientes.


## Delta verificado — operación local TASK-2022, 2026-10-09

[Flujo operativo](../../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md) completo local:32reglas de perfiles,
recursos originales con fee genérico separado, portfolio de capacidad declarada, cobertura cliente específica,
readiness/preview y actualización de policy/packs con preview/apply. Operador confirma180USD cubre3CC+3Express;
fecha del alza pendiente,306 sólo escenario. FacturaNotion acredita9usuarios×24USD+30USDcréditos para21sep–21oct,
sin confirmar pago. Planes públicosM365/SEMrush/ChatGPT/Claude y FXECB se conservan como referencias explícitas.
[Pendientes por owner](../../../data/pricing/v3-operating/operational-gaps.json): salarios/localización, provisiones
medidas, contratos/seats/acceso, capacidad declarada real, precio/margen/factores aprobados y SOW/entidad/impuestos.
El operador no tiene salarios nuevos y autorizó método por capacidad; no inventar valores ni repetir la solicitud.
TASK-2017 permaneceParcial por estas evidencias económicas, no por falta del flujoCLI. Promocióncanónica separada.

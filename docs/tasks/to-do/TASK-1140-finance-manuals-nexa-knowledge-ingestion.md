# TASK-1140 — Finance manuals ingestion into Nexa Knowledge

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance|nexa|knowledge|content|ai`
- Blocked by: `none`
- Branch: `task/TASK-1140-finance-manuals-nexa-knowledge-ingestion`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Ingestar el nuevo paquete documental de Finance al corpus Knowledge/Nexa para que Nexa pueda responder preguntas operativas sobre ingresos, egresos, cobros, pagos, caja, instrumentos de pago, Banco/Tesoreria, conciliacion, ordenes de pago, contractors, payroll y P&L con fuentes correctas y citas gobernadas.

Esta task NO crea nueva capacidad financiera ni ejecuta acciones desde Nexa. Solo hace disponible el conocimiento documentado para respuestas grounded.

## Why This Task Exists

La revision local del 2026-06-15 mostro que Nexa ya tiene `search_knowledge`, pero las preguntas sobre Finance pueden recuperar documentos generales no financieros con confianza alta. El gap no es solo de prompt: faltaba un paquete Finance end-to-end listo para corpus y un set de golden questions que asegure que Nexa cite fuentes finance cuando responde sobre Finance.

## Goal

- Registrar los manuales/documentos Finance recientes en el corpus Knowledge gobernado.
- Asegurar que preguntas sobre ingresos, egresos, cobros, pagos, instrumentos, Banco, conciliacion y ordenes de pago recuperen fuentes finance correctas.
- Agregar QA/evals de wrong-source para Finance antes de considerar activacion productiva.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/nexa-intelligence/README.md`
- `docs/architecture/nexa-intelligence/NEXA_KNOWLEDGE_MANIFEST.md`
- `docs/documentation/plataforma/knowledge-platform.md`
- `docs/documentation/plataforma/nexa-conversational-experience.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Nexa debe responder con grounding y citas; si falta evidencia, debe decirlo.
- No activar acciones financieras desde Nexa en esta task.
- No exponer datos sensibles de cuentas/perfiles de pago.
- No promover Knowledge production sin QA y decision explicita.
- Mantener separadas las capas documento, caja, banco, settlement, conciliacion, P&L y contabilidad legal.

## Normative Docs

- `docs/documentation/finance/operacion-finance-end-to-end.md`
- `docs/manual-de-uso/finance/registrar-ingresos-egresos-y-ordenes-de-pago.md`
- `docs/manual-de-uso/finance/caja-cobros-pagos-y-liquidaciones.md`
- `docs/manual-de-uso/finance/conciliacion-bancaria-operacion.md`
- `docs/manual-de-uso/finance/instrumentos-de-pago-y-banco.md`
- `docs/documentation/finance/modulos-caja-cobros-pagos.md`
- `docs/documentation/finance/ordenes-de-pago.md`
- `docs/manual-de-uso/finance/ordenes-de-pago.md`
- `docs/documentation/finance/pagos-a-contractors.md`
- `docs/manual-de-uso/finance/pagos-a-contractors.md`
- `docs/documentation/finance/conciliacion-bancaria.md`
- `docs/manual-de-uso/finance/sugerencias-asistidas-conciliacion.md`
- `docs/documentation/finance/distribucion-costos-pnl.md`
- `docs/manual-de-uso/finance/distribucion-costos-pnl.md`

## Dependencies & Impact

### Depends on

- Knowledge foundation (`greenhouse_knowledge`) disponible en ambiente objetivo.
- Nexa Knowledge retrieval flags activos en ambiente de validacion.
- Corpus/manifest actual en `src/lib/knowledge/ingestion/pilot-corpus.ts` y/o `src/lib/knowledge/notion/notion-corpus.ts`.

### Blocks / Impacts

- Mejora futura de respuestas Finance en Nexa Chat.
- QA de answer quality por dominio finance.
- Futuras tasks de action runtime finance deben apoyarse en este conocimiento, pero no quedan desbloqueadas para ejecutar writes.

### Files owned

- `src/lib/knowledge/ingestion/pilot-corpus.ts`
- `src/lib/knowledge/notion/notion-corpus.ts`
- `src/lib/knowledge/**`
- `src/lib/nexa/**`
- `docs/documentation/finance/**`
- `docs/manual-de-uso/finance/**`
- `docs/tasks/to-do/TASK-1140-finance-manuals-nexa-knowledge-ingestion.md`

## Current Repo State

### Already exists

- Nexa Chat tiene tool `search_knowledge`.
- `NEXA_KNOWLEDGE_RETRIEVAL_ENABLED` esta activo en local/staging segun handoff vigente; produccion permanece gateada.
- Existen docs finance especializados para caja, ordenes, conciliacion, contractors, P&L y perfiles.
- El 2026-06-15 se agrego un documento funcional end-to-end reconciliado contra codigo/DB y manuales operador para ingresos/egresos/pagos/ordenes, caja/liquidaciones, conciliacion bancaria e instrumentos/Banco.

### Gap

- Los documentos Finance nuevos no estan registrados en el corpus Knowledge/Nexa.
- No existe set de golden questions Finance que bloquee wrong-source.
- Preguntas finance pueden recuperar docs generales de Greenhouse/Nexa con confianza alta.
- La sensibilidad de perfiles, cuentas e instrumentos ya quedo documentada; la ingestion debe conservar metadata/policy para no exponer datos sensibles.

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

### Slice 1 — Finance corpus registration

- Registrar los docs normativos Finance en el corpus Knowledge correspondiente.
- Asignar metadata de dominio `finance`, tipo `documentation` o `manual`, sensitivity interna y policy `agent_allowed` solo para contenido operativo no sensible.
- Evitar duplicar documentos ya ingestado; si existe fuente previa, actualizarla en lugar de crear una entrada paralela.

### Slice 2 — Retrieval and answer QA

- Agregar golden questions en espanol para:
  - "como registro un ingreso";
  - "como registro un egreso";
  - "como registro un cobro";
  - "como registro un pago";
  - "cuando uso una orden de pago";
  - "que hace automatico Greenhouse en Finance";
  - "que hace el operador";
  - "como registro un instrumento bancario";
  - "como asigno un instrumento a un pago";
  - "cuando uso transferencia interna";
  - "como funciona conciliacion";
  - "como se pagan contractors";
  - "por que processor no es cuenta bancaria";
  - "como llega esto al P&L".
- Validar que `search_knowledge` recupera fuentes finance correctas y no docs generales.
- Agregar caso negativo: si la pregunta pide accion financiera, Nexa debe explicar y no ejecutar.

### Slice 3 — Nexa response safety

- Ajustar prompts/evals solo si la ingestion no basta para evitar wrong-source.
- Asegurar que Nexa separa documento, caja, banco, settlement, conciliacion y P&L.
- Asegurar que Nexa no entrega datos sensibles de perfiles/cuentas ni instrucciones para bypass.

### Slice 4 — Staging validation and rollout note

- Ejecutar ingestion local/staging.
- Verificar respuestas desde `/api/home/nexa` o harness equivalente con flags de Knowledge activos.
- Documentar estado production: no activar prod sin decision humana si el corpus productivo esta gateado.

## Out of Scope

- Ejecutar pagos, crear ingresos/egresos u operar Finance desde Nexa.
- Construir `NexaActionProposal` o command bridge financiero.
- Cambiar modelos contables o schemas finance.
- Activar Knowledge production automaticamente.
- Crear UI nueva para Finance o Knowledge.

## Detailed Spec

Preguntas de QA minimas:

| Pregunta | Fuentes esperadas |
|---|---|
| "Nexa, como registro un ingreso en Finance?" | `registrar-ingresos-egresos-y-ordenes-de-pago.md`, `operacion-finance-end-to-end.md` |
| "Cuando uso una orden de pago en vez de registrar un pago directo?" | `registrar-ingresos-egresos-y-ordenes-de-pago.md`, `ordenes-de-pago.md` |
| "Que hace automatico Greenhouse al crear un egreso?" | `operacion-finance-end-to-end.md`, `registrar-ingresos-egresos-y-ordenes-de-pago.md` |
| "Como se pagan contractors?" | `pagos-a-contractors.md`, manual contractor, payment orders |
| "Como registro un cobro real?" | `caja-cobros-pagos-y-liquidaciones.md`, `registrar-ingresos-egresos-y-ordenes-de-pago.md` |
| "Como registro un instrumento bancario?" | `instrumentos-de-pago-y-banco.md`, `operacion-finance-end-to-end.md` |
| "Como funciona conciliacion?" | `conciliacion-bancaria-operacion.md`, `conciliacion-bancaria.md` |
| "Marcar pagada una orden significa conciliada?" | `operacion-finance-end-to-end.md`, `conciliacion-bancaria-operacion.md`, `sugerencias-asistidas-conciliacion.md` |
| "Deel es la cuenta que se rebaja?" | `instrumentos-de-pago-y-banco.md`, `operacion-finance-end-to-end.md`, `ordenes-de-pago.md` |

Respuesta esperada:

- breve;
- paso a paso cuando el usuario pregunta "como";
- con advertencias operativas cuando hay riesgo;
- con citas/sources finance;
- sin inventar datos de runtime;
- sin prometer que Nexa puede ejecutar la accion.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (corpus registration) -> Slice 2 (retrieval QA) -> Slice 3 (prompt/safety only if needed) -> Slice 4 (staging validation).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Nexa responde Finance con fuentes generales no finance | knowledge/nexa | medium | golden questions + wrong-source checks | eval failure / qa report |
| Documento sensible expone datos de pago | finance/security | low | revisar metadata y redactar contenido sensible | manual review |
| Activacion prod accidental | release/knowledge | low | respetar flag prod OFF y rollout humano | env/config diff |
| Prompt change degrada respuestas no Finance | nexa | medium | snapshot/eval antes y despues si se toca prompt | qa matrix |

### Feature flags / cutover

- Usar flags existentes de Knowledge/Nexa; no introducir flag nuevo salvo que la estrategia de ingestion lo requiera.
- Production cutover queda fuera de esta task salvo aprobacion explicita.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | retirar docs del corpus/manifest y reingestar | <30 min | si |
| Slice 2 | revertir golden questions/evals | <15 min | si |
| Slice 3 | revertir prompt/config si se modifica | <30 min | si |
| Slice 4 | apagar flag Knowledge en ambiente validado o revertir ingestion | <30 min | si |

### Production verification sequence

1. Validar local con corpus actualizado.
2. Validar staging con preguntas golden.
3. Revisar respuestas manualmente con operador/owner Finance.
4. Confirmar que prod sigue sin cambios si no hay aprobacion.
5. Si se aprueba prod en task futura, ejecutar ingestion productiva y repetir golden questions.

### Out-of-band coordination required

- Owner Finance debe validar que respuestas no prometen comportamiento inexistente.
- Owner Nexa/Knowledge debe aprobar activation productiva si corresponde.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Los manuales/documentos Finance normativos estan registrados en el corpus Knowledge.
- [ ] `search_knowledge` recupera fuentes Finance para preguntas Finance.
- [ ] Nexa responde preguntas de ingreso, egreso, cobro, pago directo, instrumento, Banco, transferencia interna, orden de pago, conciliacion y contractors con citas correctas.
- [ ] Los casos wrong-source quedan cubiertos por eval/QA.
- [ ] Nexa no afirma que puede ejecutar acciones financieras en esta task.
- [ ] Production queda explicitamente sin cambios o validada con aprobacion humana.

## Verification

- `pnpm ops:lint --changed`
- `pnpm docs:closure-check`
- QA local/staging de Knowledge/Nexa con preguntas golden
- Test/eval especifico que exista para Knowledge retrieval al momento de ejecucion

## Documentation Closure

- Actualizar `docs/tasks/README.md`.
- Actualizar `docs/tasks/TASK_ID_REGISTRY.md`.
- Si se cambia prompt o policy de Nexa, actualizar docs de Nexa Intelligence y changelog correspondiente.
- Si se ingesta prod, dejar evidencia en `Handoff.md`.

## closing protocol

- Ejecutar `pnpm ops:lint --changed`.
- Ejecutar `pnpm docs:closure-check`.
- Dejar evidencia de QA Knowledge/Nexa con preguntas golden.
- Si se activa staging o produccion, registrar ambiente, flags y resultado en `Handoff.md`.
- No mover la task a `complete` hasta que la ingestion este aplicada y validada en el ambiente objetivo aprobado.

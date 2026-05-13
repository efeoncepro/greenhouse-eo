# Task Template

Plantilla copiable para crear tasks nuevas. Para el protocolo completo (Plan Mode, Skill, Subagent, derivacion de Checkpoint/Mode, Lightweight Mode), ver [`TASK_PROCESS.md`](TASK_PROCESS.md).

> **Convivencia de formatos:** solo las tasks creadas a partir de ahora usan esta plantilla. En el backlog existen tasks con el formato anterior — tanto `CODEX_TASK_*` como `TASK-###` ya creadas — que siguen vigentes con su estructura original hasta su cierre.

---

## Instrucciones

1. Copiar el bloque de template de abajo en un archivo nuevo: `docs/tasks/to-do/TASK-###-short-slug.md`
2. Reservar el ID en `docs/tasks/TASK_ID_REGISTRY.md`
3. Llenar Zone 0 y Zone 1 completas
4. Zone 2 no se llena al crear la task — es responsabilidad del agente que la toma
5. Llenar Zone 3 y Zone 4 con el detalle que tengas disponible
6. Para tasks `umbrella` o `policy`: Zone 3 (Detailed Spec) puede omitirse; Verification es revision manual
7. El cierre de una task no termina cuando el codigo "ya funciona": termina solo cuando el agente actualiza `Lifecycle`, mueve el archivo a la carpeta correcta y sincroniza `docs/tasks/README.md`

---

## Template

```md
# TASK-### — [Short Title]

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
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `[finance|hr|platform|identity|ui|data|ops|content|crm|delivery|agency]`
- Blocked by: `none`
- Branch: `task/TASK-###-short-slug`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

[Que cambia en 2-4 lineas y por que importa. Esto es lo unico que lee alguien que esta escaneando el backlog.]

## Why This Task Exists

[Problema actual, deuda, contradiccion o gap real. No repite el summary — explica la raiz.]

## Goal

- [Resultado 1]
- [Resultado 2]
- [Resultado 3]

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- [arquitectura especializada aplicable]

Reglas obligatorias:

- [regla 1]
- [regla 2]

## Normative Docs

[Solo si hay documentos adicionales que el agente DEBE leer y que no son arquitectura.]

- [doc con path real]

## Dependencies & Impact

### Depends on

- [task, tabla, schema, API o spec — con path real]

### Blocks / Impacts

- [otras tasks o superficies afectadas]

### Files owned

- `src/...`
- `docs/...`

## Current Repo State

### Already exists

- [foundation ya materializada — con paths reales]

### Gap

- [que sigue roto, faltante o ambiguo]

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

### Slice 1 — [nombre]

- [entregable concreto]
- [entregable concreto]

### Slice 2 — [nombre]

- [entregable concreto]
- [entregable concreto]

## Out of Scope

- [explicitar que NO se mezcla aqui]

## Detailed Spec

[Seccion expandible. Aqui va el detalle pesado: schemas SQL, API routes,
component specs, data flows, pseudocodigo, wireframes de referencia.

Puede omitirse si el Scope ya es suficiente o si la task es umbrella/policy.]

## Rollout Plan & Risk Matrix

[Seccion canonica obligatoria desde 2026-05-13. Declara ordering invariants
entre slices, riesgos por sistema afectado, feature flags / cutover, y plan
de rollback por slice.

Para tasks triviales (refactor local, microcopy fix, doc-only) usar la
plantilla minima: "N/A — additive change, no production runtime impact,
no rollback needed". Para tasks que tocan SCIM/SSO/payroll/finance/release/
identity/cron/outbox/migrations, esta seccion es load-bearing y NUNCA
debe vaciarse con N/A sin justificacion explicita.

Para tasks `umbrella` o `policy` esta seccion puede limitarse a
"impact-only" (que tasks downstream son afectadas por la decision).]

### Slice ordering hard rule

[Declara explicito el grafo de dependencias entre slices. Cualquier agente
que ejecute slices fuera de este orden esta violando el contract de la task.

Ejemplo:
- Slice 1 (foundation) -> Slice 2 (write path) -> Slice 3 (read path)
- Slice 4 (gate) MUST ship BEFORE Slice 5 (data apply) — sin gate, el
  data apply rompe payroll.
- Slice 6 (signals) puede correr en paralelo con Slice 5 una vez que
  Slice 4 cerro.]

### Risk matrix

[Tabla de riesgos × sistema impactado × probabilidad × mitigation × signal.
Una fila por riesgo material. Si no hay riesgo material, declarar "N/A
operationally safe — additive UI/data/contract" con razon.]

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| [descripcion concreta] | [SCIM / SSO / payroll / finance / release / identity / cron / outbox / UI / migration / N/A] | [low / medium / high] | [feature flag / dry-run / staging gate / fallback path / circuit breaker] | [reliability signal name o "no signal — emerge en logs"] |

### Feature flags / cutover

[Declara que flags existen (env vars, DB rows, code constants) que permiten
graduated rollout y revert instant.

Si la task no introduce flags porque el cambio es seguro/aditivo, declarar
"sin flag — additive, immediate cutover" con razon.

Ejemplo:
- Env var `SCIM_INTERNAL_COLLABORATOR_PRIMITIVE_ENABLED` (default `false`)
  controla si el SCIM CREATE invoca primitive nueva. Default `false` en
  produccion durante staging validation. Flip a `true` post-smoke verde.
  Revert: env var a `false` + redeploy. Tiempo de revert: <5 min via Vercel.]

### Rollback plan per slice

[Por cada slice, describe explicito como deshacer si emerge bug en
produccion DESPUES del merge. Incluye comando exacto cuando posible.

Slices que solo agregan cosas (additive — nueva columna con DEFAULT, nueva
ruta API gateada por capability, nuevo cron disabled) pueden declarar
"rollback: disable via flag / revert PR" sin detalle.

Slices que MUTAN state (migrations destructivas, backfills, transiciones de
state machine) DEBEN tener un comando de rollback verificado en staging
ANTES del apply en prod.]

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | [comando / proceso] | [estimacion] | [si / no / parcial] |
| Slice 2 | [...] | [...] | [...] |

### Production verification sequence

[Orden canonico de staging -> prod cuando la task ship. Cada step incluye
verificacion antes de avanzar al siguiente. Stop & escalate si cualquier
verify falla.

Ejemplo:
1. `pnpm migrate:up` en staging + verify columna existe con default esperado.
2. Deploy code a staging con flag=false + verify SCIM existente no cambio.
3. Flip flag=true en staging + Entra `provisionOnDemand` test user +
   verify primitive ejecuto + member visible + payroll excluye.
4. Backfill dry-run staging + verify plan esperado.
5. Backfill apply staging allowlist + verify post-apply.
6. Repetir 2-5 en produccion con cooldown 24h entre ambientes.
7. Monitor signals durante 7d post-prod.]

### Out-of-band coordination required

[Sistemas externos que requieren coordinacion humana fuera del repo antes
del shipping. Ejemplo: cambios en Azure AD App Registration, rotacion de
secrets GCP, cambio en HubSpot custom properties, comunicacion a operadores
HR/Finance antes de cambiar comportamiento visible.

Si nada externo requiere coordinacion, declarar "N/A — repo-only change".]

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] [criterio verificable]
- [ ] [criterio verificable]
- [ ] [criterio verificable]

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- [validacion manual o preview]

## Closing Protocol

[Cerrar una task es obligatorio y forma parte de Definition of Done.
Si la implementacion termino pero estos items no se ejecutaron, la task
sigue abierta.]

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] [item especifico de esta task]

## Follow-ups

- [tasks derivadas, issues pendientes, o deuda tecnica identificada]

## Delta YYYY-MM-DD

[Opcional. Registra cambios materiales a la task despues de su creacion.]

## Open Questions

[Opcional. Decisiones que no pudieron resolverse durante el diseno.]
```

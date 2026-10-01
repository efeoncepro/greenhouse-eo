# TASK-1947 — Creative Workbench: entrada IA con contexto de marca

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `none`
- Status real: `Corte 2026-09-30: lotes de agentes PR 11 y contornos PR 12 integrados en main 2bb761a; prueba real de cuatro formatos, cero proveedores. Privado277 PASS, público259 PASS/18 SKIP exactos. Guard final de pago PR 10 integrado pero sin deploy de esta unidad; flujo IA/cotizaciones/canary monetario y admisión de cada integrante pendientes. Efeonce ID diferido en TASK-1952; no AUTH paralelo.`
- Rank: `1`
- Domain: `platform|tooling|identity`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`

## Continuidad documental — 2026-09-30 (corte posterior a PR 12)

Consultar el [estado fechado del Workbench](../../../.codex/skills/efeonce-creative-workbench/references/state-continuity.md)
para código, evidencia y pendientes. Los cortes de PR 7/canary de identidad y cifras anteriores
registrados abajo son historia; no obligan a terminar OAuth propio antes de componer ni acreditan
rollout nuevo. Esta publicación documental no mueve la task a complete.


## Summary

Entrada de producción IA del workbench que valida identidad GitHub vigente, política del equipo y
recursos de una sola marca antes de invocar un adapter. Todas las personas del equipo pueden trabajar
para todas las marcas por confirmación de Julio; cada corrida conserva contexto y salidas exclusivas.

## Why This Task Exists

Los scripts exportados invocan CLIs crudos con paths y prompts libres. El preflight de TASK-1945
es opt-in. Falta conectar el contrato a una entrada de producción y reducir la exposición accidental
de CLIs y skills específicos de otras marcas.

## Goal

- Entrada IA con identidad verificada y rechazo antes de gasto.
- Recursos seleccionados por ID sellado, snapshots exclusivos y resultado trazable.
- Export y hooks encaminan al entrypoint; límites frente a credenciales directas registrados.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/EFEONCE_CREATIVE_WORKBENCH_MULTIBRAND_ISOLATION_DECISION_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md`

La identidad procede de GitHub vivo, nunca del campo producer. Los recursos los admite el catálogo.
El adapter es infraestructura gestionada, no una ruta o comando suministrado por la pieza.

## Normative Docs

- `docs/operations/creative-production/CREATIVE_WORKBENCH_MULTIBRAND_PLAN.md`
- `docs/manual-de-uso/creative/creative-workbench-brand-preflight.md`

## Dependencies & Impact

### Depends on

- TASK-1945 y su resolver en `scripts/creative-workbench/template/tools/brand-context.mjs`.

### Blocks / Impacts

- Piloto SKY y rollout IA del equipo.

### Files owned

- `scripts/creative-workbench/template/tools/brand-production.mjs`
- `scripts/creative-workbench/template/tools/production-authority.mjs`
- `scripts/creative-workbench/template/tools/marca-producir.mjs`
- `scripts/creative-workbench/brand-production.test.mjs`
- Delta en export, template de package y hooks gestionados.

## Current Repo State

### Already exists

- Resolver/locks, templates y sync desde ref de Git.
- Equipo GitHub confirmado con cuatro miembros; Julio confirmó todas las marcas para todos.

### Gap

- CLIs y skills de múltiples marcas accesibles sin contexto obligatorio.
- Permisos GCP de IA y eliminación del bypass no acreditados.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/creative-workbench/template/tools/`
- Future candidate home: `remain-shared`
- Boundary: `entrada neutral gestionada y adapters permitidos; cero defaults visuales`
- Server/browser split: `Node local; sin consumer browser`
- Build impact: `filesystem y CLI GitHub sólo en herramientas; sin portal`
- Extraction blocker: `no declarar aislamiento frente a secretos directos hasta control operacional remoto`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: `GitHub membership vivo y catálogo gestionado`
- Consumidores afectados: `CLI workbench; sin UI ni portal`
- Runtime target: `local`

### Contract surface

- Contrato existente a respetar: `template/tools/brand-context.mjs` dentro del plano de control.
- Contrato nuevo o modificado: `production-authority.mjs` y `brand-production.mjs`.
- Backward compatibility: `gated`
- Full API parity: command compartido con CLI; no lógica de producción en UI.

### Data model and invariants

- Entidades/tablas/views afectadas: `ninguna DB; contextos y archivos de corrida`
- Invariantes que no se pueden romper:
  - Una sola marca y versión por corrida; cero paths libres.
  - Identidad viva antes de ejecución, sin confianza en producer.
- Write-target allowlist: `N/A; filesystem exclusivo de la corrida`
- Tenant/space boundary: `cliente desde ruta y catálogo, persona desde GitHub`
- Idempotency/concurrency: `UUID exclusivo por corrida; no reintentos implícitos`
- Audit/outbox/history: `lock y outcome por corrida, sin secrets/raw errors`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `disabled mediante packs gated`
- Backfill plan: `none`
- Rollback path: `revert export/entrada; no convertir a otra marca`
- External coordination: `restricción de credenciales antes del rollout operativo completo`

### Security and access

- Auth/access gate: `GitHub sesión verificada, membership active, policy de equipo y operación`
- Sensitive data posture: `identidad mínima; sin guardar tokens`
- Error contract: `errores sanitizados; resultado fallido sin raw provider output`
- Abuse/rate-limit posture: `timeouts de identidad; sin generación pública ni retries en esta unidad`

### Runtime evidence

- Local checks: `Node/Vitest negativos, concurrencia y export`
- DB/runtime checks: `N/A; sin DB ni servicio desplegado`
- Integration checks: `GitHub readback del equipo; adapter mock hasta canary autorizado posterior`
- Reliability signals/logs: `outcome de corrida completed/failed sin aprobación implícita`
- Production verification sequence: `local → sync commit → canary negativo → canary real → readback`

### Acceptance criteria additions

- [ ] Identidad, catálogo y consumers acreditados con fuentes explícitas.
- [ ] Fronteras de acceso/recursos y concurrencia probadas.
- [ ] Auditoría sanitizada y rollback de export documentados.

## Capability Definition of Done — Full API Parity gate

Primitive local `produceBrandImage`, consumer `marca-producir.mjs`. Sin capability de producto
Greenhouse ni grants nuevos al portal; cualquier broker API futuro conserva esta semántica y autoridad.

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

### Slice 1 — Autoridad y entrada

Identidad GitHub autenticada, membership vigente, política de equipo/todas las marcas. Request estricto,
operación y recursos sellados; crear una corrida antes de producir, nunca usar paths libres de la pieza.

### Slice 2 — Adapter y export

Adapter gestionado, salida exclusiva, hashes y auditoría. Tests de rechazos, errores y concurrencia;
retirar comandos crudos de package exportado y guiar hooks al entrypoint.

## Out of Scope

- Cambios IAM, rotación de secretos, producción pagada y publicación cliente en esta unidad.
- Garantía frente a un operador que elude el harness con credenciales propias.
- Valores, tipografía y recetas particulares de SKY/Efeonce/Berel.

## Detailed Spec

El prompt de IA es un recurso de pack admitido con identidad/version/operación. No recibe paths ni
argv arbitrarios. Referencias provienen del mismo contexto sellado. El adapter sólo consume snapshots
verificados y escribe en el directorio de la corrida. Producción local permanece gated hasta tener
adapter y recursos admitidos. Auditoría identifica la persona por el resultado de GitHub, no por metadata.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Autoridad → validación → snapshot exclusivo → adapter → verificación de archivos → auditoría.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Identidad inventada | acceso | medium | lectura viva GitHub y policy sellada | rechazo antes de corrida |
| Recursos ajenos | IA | medium | contexto sellado y snapshot | cero invocaciones |
| CLI eludido | operación | high | retirar comandos y luego restringir credenciales | rollout no acreditado |
| Fallo provider | salida | medium | no retry implícito, estado failed | outcome sin aprobación |

### Feature flags / cutover

Packs gated por defecto. Policy exige GitHub team activo; no habilita proveedor por metadata local.

### Rollback plan per slice

Retirar entrada nueva o revertir export. No modifica infraestructura ni piezas previas.

### Production verification sequence

Pruebas locales → sync desde commit → instalación limpia → canary negativo → canary autorizado.
Runtime y paid canary no se consideran acreditados por pruebas simuladas.

### Out-of-band coordination required

Restricción de secretos directos y proveedor gobernado antes de garantía operacional completa.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Cuenta no autorizada, revocación y producer inventado se rechazan antes del adapter.
- [ ] Request no admite paths libres, otras marcas ni argumentos del proveedor.
- [ ] Adapter consume snapshots de una sola marca; fuentes cambiadas no alteran corrida.
- [ ] Corridas concurrentes no sobrescriben archivos; outputs y outcome quedan sellados.
- [ ] Export/hook dirigen producción a entrada; bypass residual queda explícito.

## Verification

- Suite Node `brand-production.test.mjs` y control-plane Vitest.
- `pnpm task:lint --task TASK-1947`.
- `git diff --check`.

## Closing Protocol

- [ ] Status real y acceptance reflejan evidencia local/runtime.
- [ ] README, registry, handoff, manual y changelog sincronizados.
- [ ] No declarar identidad/rollout a partir de metadata o mocks.

## Follow-ups

Broker operativo sin credenciales directas; canary real y despliegue de referencia SKY.

## Corte de continuidad 2026-09-30 — autoridad preparada, operación pendiente

App `efeonce-workbench-authority` registrada/instalada por el operador, instalación API
verificada y pins de policy admitidos por owner. El agente raíz verificó firma/audiencia del
ticket Google; el usuario aprobó vínculo del operador a `cesargrowth11` (GitHub ID87578376).
Policy preparada en canon privado `0600`, 90 días hasta 2026-12-29; sin sub/JWT/claims de email
en Git. No extrapolar este vínculo a otras personas. Primer token App pendiente porque la
impersonación de la SA carece del grant requerido; no se amplió IAM. Runtime `/v1/identity`
404 e IA OFF. No PR creado aún para la candidata ni rollout/cotizaciones/canary acreditados.

Evidencias de merges, suites y pendientes:
[continuidad Workbench](../../../.codex/skills/efeonce-creative-workbench/references/state-continuity.md).
La tarea conserva `in-progress`; acceptance criteria no auditados permanecen sin marcar.
Este corte no borra estados/pruebas históricos ni convierte tests locales en evidencia live.

## Corte posterior 2026-09-30 — PR 7 draft y candidato sin promoción

Los 50 documentos propios se commitearon en Greenhouse como ccabbbf1e9e24e4760700bbad2bea052f4a31756
sin push. Workbench PR 7 draft/head 344c8bafea9ecb1e618330e1e7fc8e6a2e334876 con CI/Vercel SUCCESS.
Cloud Build SUCCESS, candidata 00009-cep READY/tag bound-identity/0% tráfico; 00008-tv6 sigue al 100%.
Identity real400 request-rejected en filtro anterior a Google/mint: token/scopes no probado.
Corrección de transporte y revocación App en curso; no atribuirlas a candidato construido.
Riesgo MEDIO de audiencia compartida no aceptado específicamente; OIDC propio antes de otros
tres integrantes, sin bindings/IAM verificados. Policy budget v2 draft 50 USD/persona y 500 USD/organización, quotes0,
IA OFF; sin nuevos gastos USD ni paid canaries, merge o promoción. La tarea conserva in-progress; sin
marcar acceptance no auditados. [Corte y pins](../../../.codex/skills/efeonce-creative-workbench/references/state-continuity.md).

## Corte final 2026-09-30 — canary real de un operador, sin promoción

PR 7 draft/head2629ab4ea8ac5a5ed6aa3bf04d3db1fef2e04aef: cinco checks SUCCESS. Harness303 +
SKY7: privado310 PASS/0 SKIP, público292 PASS/18 SKIP licenciados, cuatro gates PASS.
Runtime google-auth-library10.9.1 fijado en producción. Candidata00010-cof READY/0% tráfico,
IAfalse;00008-tv6 sigue100%. Canary real9/9 PASS: identity owner200 (cesargrowth11/87578376),
negativos de firma/token/header/body, SKY validate200/provider0 y execute IAOFF400.
Primer mint real: cuatro scopes GET de único repo1395425041 members/metadata read y cuatro
revocaciones DELETE204. App5138627/instalación166592362. Header aplicativo íntegro y revocación
App implementados/probados en candidata. No explicar bytes legacy desde perfil malformed.

Sólo operador probado. Riesgo MEDIO audiencia compartida NO aceptado; OAuth propio propuesto
antes de los otros tres o gasto. Tres bindings/IAM pendientes; sin nuevas mutaciones al equipo.
Otro SUB, token vencido firmado, binding revocado y team withdrawal sólo fixtures, no matriz
real certificada; sin recovery real nuevo ni paid calls. Policy budgetv2 draft50USD/persona500org,
quotes0 e IA OFF. Sin merge/promoción; main96eab1e. Docs GH ccabbbf1 y95125d8a6 sin push.
Tarea in-progress, criterios no auditados sin marcar. [Evidencia/pins y pendientes](../../../.codex/skills/efeonce-creative-workbench/references/state-continuity.md).

## Delta 2026-09-30 — consumer Efeonce ID diferido

Por decisión posterior de Julio, priorizar el flujo productivo y reutilizar el AUTH común de Efeonce.
[TASK-1952](../to-do/TASK-1952-creative-workbench-efeonce-id-integration.md) queda como dueña del consumer
backend/CLI Efeonce ID, dependiente de TASK-1834 Slices 0–1. No construir otro OAuth Google propio como
solución definitiva. Esta task conserva entrada IA, GitHub App, cupos y gates de producción; el registro
del follow-up no altera los canaries históricos ni demuestra sesiones Efeonce ID o promoción de runtime.

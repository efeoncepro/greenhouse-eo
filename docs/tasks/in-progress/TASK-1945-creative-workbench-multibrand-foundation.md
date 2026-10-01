# TASK-1945 — Creative Workbench multimarcas: foundation neutral

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
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Corte 2026-10-01: baseline Workbench PR14 en main be57032. Goal local de componentes autónomos SKY sobre rama codex/sky-autonomous-components: 126 árboles y renders exactos; privado 344 PASS, público 303 PASS/30 SKIP. Lectores, descomposición/extracción/roundtrip, tokens de propiedades y pipeline modular verificados; contratos 0.2.0 preparados sin publicación; código modular/identidad Git 531c6de commiteado/pusheado en PR15 draft; Vercel SUCCESS, sin merge. Skill espejo en PR246 draft, sin merge. Onboarding completo del equipo y runtime IA siguen pendientes; Efeonce ID diferido en TASK-1952, sin AUTH paralelo. No ejecutar sync total heredado ni alterar CLIs Greenhouse.`
- Rank: `1`
- Domain: `platform|tooling|content`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`

## Continuidad documental — 2026-09-30 (corte posterior a PR 12)

### Delta local 2026-10-01: componentes autónomos

Arquitectura y triple documentación pertenecen a Workbench: `workbench-sky-autonomous-components.md`,
`docs/documentation/autonomous-components.md`, `docs/manual/autonomous-components.md`.
Skill Codex/Claude añade `references/autonomous-components.md`. Se conserva el ADR de aislamiento;
no se cambia fuente de recursos, pack, broker ni CLIs Greenhouse. Evidencia detallada en
HARNESS_STATUS de Workbench y continuidad de la skill. La task permanece in-progress por su
rollout/alcance superior; pruebas locales no cierran onboarding/IA/Efeonce ID/distribución.

Consultar el [estado fechado del Workbench](../../../.codex/skills/efeonce-creative-workbench/references/state-continuity.md)
para código, evidencia y pendientes. Los cortes de PR 7/canary de identidad y cifras anteriores
registrados abajo son historia; no obligan a terminar OAuth propio antes de componer ni acreditan
rollout nuevo. Esta publicación documental no mueve la task a complete.


## Summary

Foundation neutral del Creative Workbench para múltiples marcas y personas del equipo Efeonce.
Registra el origen de catálogo, preflight y corridas independientes. Por decisión del operador, su
implementación activa pertenece al repo `creative-workbench`, no al template exportado de Greenhouse.
SKY es el primer onboarding, no el dueño del motor. El retiro documental/local no publica sitios,
paquetes ni acredita rollout.

## Why This Task Exists

Las carpetas separadas no impiden que un CLI aplique valores Efeonce a SKY o Berel. Los artefactos del
workbench no fijan identidad ni versión del sistema visual. Es necesario un seam neutral antes de producir.

## Goal

- Resolver dependencias permitidas por marca y versión, con hashes y paths reales.
- Impedir cruces de marca y colisiones de corridas antes de invocar herramientas.
- Publicar límites de la garantía: preflight local no sustituye permisos del proveedor ni revisión visual.


<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md`
- `docs/operations/creative-production/CREATIVE_WORKBENCH_MULTIBRAND_PLAN.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas: gobernanza en Greenhouse; exportar ref commiteado, nunca WIP. No editar copias selladas.
No heredar reglas visuales; no ampliar permisos del equipo ni acceder a Globe hibernado.
Para el desarrollo vigente, leer `creative-workbench/docs/architecture/workbench-native-harness.md`
y `workbench-review-remediation.md` en ese checkout. Su inventario nativo no concede por sí solo
excepciones al sello; la reconciliación con el control plane sigue separada.

## Normative Docs

- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`
- `docs/operations/creative-production/sky-airline/BOOTSTRAP_PLAN.md`

## Dependencies & Impact

### Depends on

- Control plane y contratos de distribución de Greenhouse; harness nativo de `creative-workbench`.
  No reinstalar el catálogo o preflight nativos mediante templates o sync total.

### Blocks / Impacts

- Onboarding SKY, referencia web por marca y rollout multipersona.
- TASK-1925 conserva migración Efeonce al Brand Workshop; no se mueve su pipeline.

### Files owned

- En el checkout `creative-workbench`: `tools/brand-context.mjs`, `tools/marca-preflight.mjs`,
  `clients/brands.json` y `test/brand-context.test.mjs`.
- Esta task conserva la trazabilidad histórica; los mirrors y el wrapper Vitest locales de
  Greenhouse fueron retirados por instrucción del operador el 2026-09-30.
- `docs/operations/creative-production/`

## Current Repo State

### Already exists

- Cliente/carpeta/entregables comprobados por `template/gates/piezas.mjs`.
- Export de skills, CLIs foto y generación con IA.

### Gap

- El gap inicial de identidad/versión/corrida motivó la foundation del 29/09; no describe el estado
  actual del harness nativo. Consultar su código, pruebas y status en `creative-workbench`.
- Reconciliación del ownership nativo y distribución sellada; el PR Greenhouse #244 y el retiro
  de mirrors no prueban merge, adopción del consumer ni aislamiento productivo por sí solos.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `creative-workbench/tools/` (checkout propio)
- Future candidate home: `remain-shared`
- Boundary: `preflight neutral; consumidores CLI del workbench`
- Server/browser split: `Node filesystem; sin browser ni runtime portal`
- Build impact: `Node puro; sin dependencias nuevas`
- Extraction blocker: `reconciliar control plane y ownership sellado antes de afirmar integración`


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

Los slices siguientes conservan el alcance histórico de la foundation. Desde el 2026-09-30,
su código y pruebas se mantienen en Creative Workbench; no reconstruir los mirrors retirados.

### Slice 1 — Catálogo y preflight

Catálogo con marcas explícitas, packs/versiones y IDs sellados; validación de cliente, path y digest.
Sin aprobación implícita de referencias ni fallback entre marcas.

### Slice 2 — Corridas y pruebas

IDs de corrida únicos, carpeta nueva exclusiva y lock trazable. Pruebas de cruces, symlinks,
sustitución de bytes y concurrencia. CLI local sin generación pagada.

## Out of Scope

- Publicación de paquetes, creación de repos, Vercel, permisos GCP y cambios de credenciales.
- Composición SKY, implementación UI y generación IA; requieren consumers con gates propios.
- Garantía frente a una persona con permisos directos que ejecuta APIs externas eludiendo el harness.

## Detailed Spec

Contexto explícito: cliente, persona declarada para trazabilidad, pieza, marca/versiones/recursos,
operación y corrida. La persona declarada no concede autorización. El catálogo propio de Workbench resuelve los
recursos; manifest de pieza no puede inventar el brandId o rutas arbitrarias. Dependencias se verifican
contra bytes reales dentro de su raíz permitida; caminos y symlinks externos fallan.
Todos los packs iniciales quedan gated hasta inventario y recursos oficiales. Rechazo antes de gasto.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Catálogo y preflight → pruebas negativas y concurrencia → consumo por wrappers → rollout posterior.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Pack incorrecto | CLI | medium | marca y digest verificables | rechazo explícito |
| Bypass CLI | Operación | high | wrappers y restricción operacional posterior | no garantía hasta integrar |
| Colisión | filesystem | medium | creación exclusiva, run ID | EEXIST |

### Feature flags / cutover

Aditivo y opt-in; ningún pack se habilita por defecto ni se cambia el pipeline existente.

### Rollback plan per slice

Retirar nuevos entrypoints; no hay mutación remota ni migraciones.

### Production verification sequence

No rollout productivo en esta unidad. La adopción exige sync desde commit y readback del consumer.
Las rutas nativas requieren su contrato de admisión: no usar esa secuencia histórica para
reinstalar código nativo o efectuar un sync total sobre el Workbench.

### Out-of-band coordination required

Ninguna para pruebas locales; permisos y distribución pertenecen al rollout posterior.


<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

Checks históricos del 2026-09-29, conservados como evidencia de esa foundation. La suite local
retirada no es una entrada ejecutable actual; estos checks no certifican el harness vigente.

- [x] Catálogo distingue Efeonce, SKY y Berel sin defaults visuales. Evidencia: suite `brand-context.test.mjs` (14/14) y manual de preflight.
- [x] Pack/version ajenos, recursos externos y hashes alterados se rechazan antes de producción. Evidencia: suite `brand-context.test.mjs` (14/14) y manual de preflight.
- [x] Symlink y path traversal externos rechazados. Evidencia: suite `brand-context.test.mjs` (14/14) y manual de preflight.
- [x] Dos corridas no sobrescriben resultados ni contexto. Evidencia: suite `brand-context.test.mjs` (14/14) y manual de preflight.
- [x] Pruebas focales pasan y límites de garantía documentados. Evidencia: suite `brand-context.test.mjs` (14/14) y manual de preflight.

## Verification

2026-09-29: ejecución histórica con `node --test scripts/creative-workbench/brand-context.test.mjs`
(14/14); suites Vitest de control-plane y wrapper registradas 13/13. La referencia anterior a
`pnpm creative:brand:test` era incorrecta: ese script no existe en `package.json`.
En esas pruebas, CLI simultáneos generan corridas separadas y cruces de marca no invocan productor.
No hay acreditación de wrappers IA ni identidad autenticada del productor.

2026-09-30: por instrucción del operador se respaldaron con SHA256 y modo `0600`, fuera del repo,
y retiraron los tres mirrors `template/tools/brand-context.mjs`, `template/tools/marca-preflight.mjs`
y `template/clients/brands.json`, junto con `scripts/creative-workbench/brand-context.test.mjs` y
`brand-context-suite.test.ts`. Se retiraron únicamente sus adiciones a `template/package.base.json`
y `template/AGENTS.md`; no se ejecutaron CLIs de Greenhouse ni se modificó el harness activo.
Respaldo privado: `/Users/jreye/Documents/creative/creative-workbench-canon/operations/greenhouse-template-retired-2026-09-30/`.

Entradas de verificación vigentes **desde la raíz de Creative Workbench**, sin ejecutarlas como
parte de este retiro: `pnpm harness:test`, o la suite focal `node --test test/brand-context.test.mjs`.
Son pruebas locales; no prueban proveedor, despliegue ni autoridad efectiva.
Para esta corrección: hashes/permisos del respaldo, ausencia de los cinco archivos, JSON válido de
`template/package.base.json`, diff limitado de template y `git diff --check`. No se ejecutó
`pnpm task:lint --task TASK-1945` por el límite explícito de no ejecutar CLIs locales de Greenhouse.

## Closing Protocol

- [ ] Lifecycle y ubicación reflejan estado real.
- [ ] Registry, README y handoff registran evidencia y pendiente de consumo.
- [ ] Contratos, manual y follow-ups sincronizados.
- [ ] Sin claim de aislamiento runtime hasta integración y readback.

## Follow-ups

Consultar el status y arquitectura activos de Workbench para los avances de wrappers, SKY, Lab y
rollout. Esta task no los cierra por inferencia. Reconciliar ownership/gobierno y mantener el retiro
de mirrors para evitar que futuras exportaciones vuelvan a ofrecer una implementación duplicada.

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

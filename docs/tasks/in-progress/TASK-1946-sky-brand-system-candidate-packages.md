# TASK-1946 — SKY Airline: paquetes candidatos con procedencia Figma

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
- Status real: `Corte 2026-10-01: sistema SKY activo en creative-workbench/brands/sky-airline; PR14 corrige 126 referencias independientes y PR15 integra componentes autónomos/recibos de propiedades preservando PNG y SVG exactos. Lab PR16/17 integrado main 7e4c617; íconos adicionales/componentes y página Lab en commit local af6f5e2, candidatos sin admisión productiva ni deploy. Skill PR246 integrado develop d4dad02; actualización documental/skill de íconos local. Figma126 revisión técnica completada, sin aprobación comercial. Contratos 0.2.0 preparados localmente; publicación/consumo de esa versión y distribución licenciada Metric/onboarding pendientes. El sistema inicial sky-brand-system es histórico; ver WORKBENCH_CURRENT_STATE.`
- Rank: `1`
- Domain: `platform|tooling|content`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`

## Continuidad vigente — 2026-10-01

Consultar [estado consolidado del Workbench](../../operations/creative-production/WORKBENCH_CURRENT_STATE.md)
y la [skill espejo](../../../.codex/skills/efeonce-creative-workbench/SKILL.md).
PR15/PR16 Workbench y PR246 Greenhouse están integrados; los cortes fechados inferiores conservan
historia y no sustituyen el estado actual. Esta actualización no cierra onboarding, distribución,
IA ni Efeonce ID por inferencia y no mueve la task a complete.

Actualización documental 2026-10-01: biblioteca adicional de íconos SKY importada y
componentizada en Workbench local (101 familias, 1.919 variantes y 303 originales/
alternativas), con `/iconos/` en el Lab. Se documentó consulta/selección exacta;
`productionAdmitted: false` y no hay release de paquete ni admisión en jobs por
este avance. Pendientes: exports independientes para las 1.022 proyecciones REST,
revisión/admisión de recursos/placement y publicación autorizada del snapshot.
[Evidencia y owners](../../audits/creative-workbench/2026-10-01-sky-icons-documentation-closure.md).
Los acceptance criteria de distribución/licencias/producción no cambian de estado.

## Summary

SKY como primer onboarding del harness compartido. Materializa tokens candidatos trazables, contratos
de receta Always On y paquetes privados preparados para distribución; no habilita producción sin fuente
Metric y assets verificados. El motor multimarcas sigue siendo neutral y propiedad de TASK-1945.

## Why This Task Exists

El inventario inicial tenía 107 variables y una dependencia de alias adicional (108 tokens). Hoy los
paquetes 0.1 están publicados y contratos 0.2 añaden componentes/recibos como candidato local, pendiente
de publicar y verificar consumo. Las plantillas usan Metric confirmado; Inter es auxiliar.

## Goal

- Paquetes candidatos SKY sin valores ni reglas de Efeonce/Berel.
- Tokens con procedencia y aliases resueltos, contrato de receta y recursos oficiales sellados.
- Build y tests locales; instalación/publicación requieren evidencia separada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/EFEONCE_CREATIVE_WORKBENCH_MULTIBRAND_ISOLATION_DECISION_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_WORKBENCH_DECISION_V1.md`

Sólo packages SKY propios; el catálogo del motor admite marcas por contrato, nunca por código específico.

## Normative Docs

- `docs/operations/creative-production/sky-airline/BOOTSTRAP_PLAN.md`
- `docs/operations/creative-production/sky-airline/OPERATOR_DECISIONS.md`

## Dependencies & Impact

### Depends on

- TASK-1945: preflight neutral.
- Metric y assets autorizados para composición real.

### Blocks / Impacts

- Referencia web SKY y piloto completo.

### Files owned

- `docs/operations/creative-production/sky-airline/`
- En `creative-workbench`: `brands/sky-airline/`, paquetes SKY y herramientas de build/recursos gobernadas.
- `/Users/jreye/Documents/sky-brand-system/` fue el bootstrap inicial; no es source of truth actual.

## Current Repo State

### Already exists

- Catálogo 126, componentes autónomos, templates/recursos sellados y 108 tokens originales en Workbench.
- Paquetes `sky-tokens`, `sky-brand-assets` y `sky-creative-contracts`0.1 publicados en GitHub Packages.
- Revisión técnica 126/126 contra controles Figma independientes y regresión modular exacta PNG/SVG.
- Metric verificado localmente; binarios licenciados fuera de npm/Git.

### Gap

- Contratos 0.2 preparados pero no publicados ni instalados por el equipo.
- Distribución licenciada de Metric y onboarding multipersona no acreditados.
- QA técnico y corrida interna no constituyen aprobación comercial de una nueva campaña.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `creative-workbench/brands/sky-airline/`; gobernanza/documentación en `docs/operations/creative-production/sky-airline/`
- Future candidate home: `domain-package`
- Boundary: `paquetes SKY aislados; consumers Workbench y Lab con versiones exactas, sin defaults de otras marcas`
- Server/browser split: `datos browser-safe; filesystem sólo en herramientas de build`
- Build impact: `Node puro para packages; sin dependencia del build portal`
- Extraction blocker: `admisión fotográfica y distribución tipográfica antes del rollout`

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

### Slice 1 — Paquetes candidatos

Tokens y aliases desde inventario, metadata de assets y contrato Always On. Exportaciones versionadas
y documentos de agente. No empaquetar fuentes licenciadas sin autorización.

### Slice 2 — Verificación

Build determinista, integridad de marca y contratos; datos comerciales obligatorios sin copiar vigencias
del fixture Figma. Paquete candidato no acredita aprobación visual ni disponibilidad productiva.

## Out of Scope

- UI del sitio, permisos de infraestructura, cambios de credenciales.
- Generación pagada y publicación cliente.
- Reglas visuales de otras marcas.

## Detailed Spec

Tres paquetes previstos: sky-tokens, sky-brand-assets, sky-creative-contracts. Namespace de distribución
@efeoncepro. Versiones exactas. Datos originales conservan source IDs y digest del snapshot; candidatas
no se convierten a stable. Contrato recibe contenido comercial por input, no asume precio/fecha actuales.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Inventario → packages candidatos → tests → recursos admitidos → publicación privada/consumo posterior.

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

Publicar contratos 0.2 sólo bajo su carril autorizado; comprobar archivo empaquetado, ausencia de
recursos licenciados, versión privada, instalación limpia y consumer exacto. No reemplazar rutas
nativas por sync total. El catálogo/Lab integrado no acredita la publicación de esa versión.

### Out-of-band coordination required

Ninguna para pruebas locales; permisos y distribución pertenecen al rollout posterior.


<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] 126 referencias SKY comparadas con controles Figma independientes y correcciones técnicas registradas: PR14, ledger `comparison-final-02`; sin aprobación comercial.
- [x] Componentes/tokens/recibos nativos integrados y 126 PNG/SVG exactos frente al baseline previo: PR15, auditoría/regresión selladas enlazadas en continuidad vigente.
- [x] Paquetes 0.1 privados publicados: API GitHub version IDs 1313424154/1313424278/1313424409; corte 2026-10-01.
- [ ] Contratos 0.2 publicados y consumo limpio del equipo verificados; hoy candidato local sin publicar.
- [ ] Distribución remota de Metric autorizada y provisionamiento del equipo acreditados; licencia de distribución no establecida.

- [x] Packages SKY tienen identidad única, versiones exactas y procedencia de fuente.
- [x] Aliases tienen cierre completo sin referencias externas silenciosas.
- [x] Metric está declarado; Inter no entra como fallback productivo.
- [x] Build y tests de identidad/contrato pasan.
- [x] Publicación/consumo y recurso tipográfico pendientes quedan registrados honestamente.

## Verification

2026-09-29: `node --test test/*.test.mjs` en el proyecto SKY: 4/4, incluyendo builds
deterministas consecutivos, cierre de aliases, versiones, hashes y rechazos de marcas/fallbacks.
14 fuentes OTF: family/subfamily y pesos del archivo; hash individual. Prueba de contornos
`metric-verificacion.png` inspeccionada. Paquetes contienen metadata de fuentes, ningún OTF.
La receta requiere preflight, verificación de aprobación, pixel QA y revisión humana; no acredita pieza final.


- `node --test` y build del sistema SKY.
- `pnpm task:lint --task TASK-1946`.
- `git diff --check`.

## Closing Protocol

- [ ] Lifecycle y ubicación reflejan rollout real.
- [ ] README, registry y handoff sincronizados.
- [ ] Versiones, recursos y evidencia de consumo registrados.

## Follow-ups

Distribución contratos 0.2 y recursos licenciados; instalación limpia y consumo del equipo.
Referencia/Lab y piloto local SKY ya están integrados; IA y permisos efectivos siguen TASK-1947,
Efeonce ID TASK-1952. [Readback fechado](../../operations/creative-production/WORKBENCH_CURRENT_STATE.md).


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

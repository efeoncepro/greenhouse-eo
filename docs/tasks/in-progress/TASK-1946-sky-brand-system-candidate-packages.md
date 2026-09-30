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
- Status real: `Docs propias GH commit ccabbbf1 sin push; WB PR 7 draft head344c8baf CI/Vercel SUCCESS; candidata00009-cep READY 0%, producción00008-tv6 100%; identity400 previo a Google/mint, token/scopes no probado; transporte/revocación en corrección, audiencia MEDIO no aceptada, OIDC propio antes de otros3; IA OFF`
- Rank: `1`
- Domain: `platform|tooling|content`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`

## Summary

SKY como primer onboarding del harness compartido. Materializa tokens candidatos trazables, contratos
de receta Always On y paquetes privados preparados para distribución; no habilita producción sin fuente
Metric y assets verificados. El motor multimarcas sigue siendo neutral y propiedad de TASK-1945.

## Why This Task Exists

El inventario Figma ya tiene 107 variables y una dependencia de alias adicional; falta un artefacto
portable y versionado. Las plantillas usan Metric confirmado por el operador; Inter es auxiliar.

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
- `/Users/jreye/Documents/sky-brand-system/` (nuevo sistema autorizado por el plan; no es un checkout aislado de Greenhouse).

## Current Repo State

### Already exists

- Inventarios JSON, logo descargado fuera del repo, decisión Metric.

### Gap

- Sin paquete publicado ni pieza completa verificada. Metric local verificado; distribución remota no establecida.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `docs/operations/creative-production/sky-airline/`
- Future candidate home: `domain-package`
- Boundary: `nuevo sistema SKY explícitamente autorizado; consumers workbench y referencia web`
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

No rollout productivo en esta unidad. La adopción exige sync desde commit y readback del consumer.

### Out-of-band coordination required

Ninguna para pruebas locales; permisos y distribución pertenecen al rollout posterior.


<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

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

Referencia web SKY y pilotos; wrappers IA con permisos efectivos del equipo.


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

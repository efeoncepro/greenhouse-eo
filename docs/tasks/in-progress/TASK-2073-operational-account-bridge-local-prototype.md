# TASK-2073 — Cuentas operativas: comparación local del bridge técnico

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `none`
- Status real: `En ejecución local; ADR Proposed y plan registrados; sin producción`
- Rank: `2073`
- Domain: `identity|data|agency`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido, sin worktrees`

## Summary

Formaliza el ADR de cuentas operativas bajo una Organization y compara A′ (bridge legacy por Space con owner
comercial común) con B (client compartido) en un sandbox reproducible. Entrega evidencia para elegir el puente;
no provisiona SKY, cambia contratos productivos ni reasigna la historia de Diseño.

## Why This Task Exists

Organization→Spaces existe, pero sesión, fuentes, caches y Finance infieren un único Space/client. La segunda
operación de SKY puede mezclar departamentos o perder atribución. Esta unidad acota la decisión antes del alta real.

## Goal

- ADR Proposed y alternativa recomendada con condiciones de aceptación trazables.
- Comparar ambos bridges con fixtures y contraejemplos fieles a predicados actuales.
- Verificar historia, acceso, replay, routing, candidatos Finance y tres fuentes del Blog sin conexión externa.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_OPERATIONAL_ACCOUNTS_UNDER_ORGANIZATION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PRODUCT_DOMAIN_DECOUPLING_DECISION_V1.md`
- `docs/architecture/agent-invariants/ORG_CLIENT_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`

Una Organization, Spaces operativos y Services. Conservar Space/hechos históricos de Diseño. El mapping en
memoria del prototipo no es schema aprobado ni reemplaza commands/readers existentes.

## Normative Docs

- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/context/00_INDEX.md`
- `docs/audits/client-portal/2026-10-27-sky-multi-account-discovery/README.md`

## Dependencies & Impact

### Depends on

- Discovery `4be89a9d4` y código local para comprobar predicados legacy.
- Autorización directa: formalizar ADR/primera task y avanzar prototipo local sin producción ni historia.

### Blocks / Impacts

- U01/U02/U02F/U03 del plan integral consumen la decisión; esta task no implementa esas foundations.
- TASK-1852/1853/1854/1960/2033 conservan ownership; ninguna es bloqueante del sandbox.

### Files owned

- `scripts/experiments/operational-account-bridge/`
- `docs/architecture/GREENHOUSE_OPERATIONAL_ACCOUNTS_UNDER_ORGANIZATION_DECISION_V1.md`
- `docs/audits/client-portal/2026-10-27-sky-operational-bridge-prototype/`
- Esta task y `docs/tasks/plans/TASK-2073-plan.md`.
- Entradas acotadas en índices de tasks/decisiones y `Handoff.md`.

## Current Repo State

### Already exists

- `src/lib/services/service-sync.ts`: Company→Space con LIMIT 1.
- `src/lib/tenant/identity-store.ts`: sesión por usuario con LIMIT 1.
- `src/lib/space-notion/space-notion-store.ts`: fuente por client con LIMIT 1.
- `src/lib/service-attribution/materialize.ts`: candidatos por Space/client antes de org.
- `src/lib/account-360/facet-cache.ts`: key por org/facet/versión.

### Gap

No hay comparación ejecutable del bridge y su owner. El command comercial rechaza otra alta y el wizard supone
un único Space. Una segunda fila clients o un selector UI no resuelven contexto, sync y Finance.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/experiments/operational-account-bridge/`, tooling fuera del grafo Next.js.
- Future candidate home: `remain-shared`
- Boundary: simulador puro y runner local; contratos productivos permanecen en sus owners.
- Server/browser split: Node local; sin browser, stores, SDK, DB o secretos.
- Build impact: `none`; sólo builtins de Node, sin nuevos entrypoints/dependencias productivos.
- Extraction blocker: `none` para sandbox; promoción depende de auth/routing/Finance.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`, semántica de acceso/ownership, alcance repo-only.
- Impacto principal: `command` simulado en memoria.
- Source of truth afectado: ninguno productivo; fixtures de clients/spaces/services/history.
- Consumidores afectados: operador y futuras tasks dueñas.
- Runtime target: `local`.

### Contract surface

- Contrato existente a respetar: owners de Current Repo State y ADR.
- Contrato nuevo o modificado: simulador y salida JSON local; sin API nueva.
- Backward compatibility: compatible; ningún import del sandbox desde runtime.
- Full API parity: sin UI/API nuevos; promoción futura reutiliza primitives server-side canónicas.

### Data model and invariants

- Entidades/tablas/views afectadas: representaciones sintéticas, ninguna tabla real.
- Invariantes: historia Diseño byte-equal; owner único; fuentes y contexto separados; ausencia ≠ cero.
- Write-target allowlist: memoria y artefactos locales declarados, ninguna DB.
- Tenant/space boundary: membership actual + org + Space activo + capacidad/servicio.
- Idempotency/concurrency: replay de intención sellada, conflicto por key/contexto; sin certificación SQL concurrente.
- Audit/outbox/history: diagnóstico JSON sin PII; sin outbox ni logs externos.

### Migration, backfill and rollout

- Migration posture: `none`.
- Default state: sandbox por ejecución local explícita.
- Backfill plan: ninguno; no copiar fuentes/hechos reales.
- Rollback path: retirar tooling local, sin restaurar estado externo.
- External coordination: ninguna para ejecutar; ADR aceptado y foundations antes de alta real.

### Security and access

- Auth/access gate: principals/memberships sintéticos; allow/deny, refresh y revocación.
- Sensitive data posture: sin credenciales, correos o payloads productivos.
- Error contract: códigos deterministas forbidden/ambiguous/conflict/missing evidence.
- Abuse/rate-limit posture: sin endpoint; allowlist de imports y ejecución sin red.

### Runtime evidence

- Local checks: node --test, evaluación JSON reproducible, anchors de código, node --check.
- DB/runtime checks: excluidos deliberadamente; repo-only sin prueba de transacciones/migrations reales.
- Integration checks: fixtures; sin contactar HubSpot, Notion, GA4, GSC o motor AEO.
- Reliability signals/logs: resultados locales saneados y contraejemplos legacy.
- Production verification sequence: no se ejecuta; gate en unidades posteriores.

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

### Slice 1 — Contrato y registro

- ADR Proposed, task canónica, plan y matriz A′/B, después de barrer dueñas por dominio/superficie.

### Slice 2 — Sandbox reproducible

- Fixtures con Organization, Diseño histórico y SEO nuevo; fallos legacy y context/routing/Finance propuestos.
- Pruebas de aislamiento, replay, historia, caché y gate GA4/GSC/AEO.

### Slice 3 — Evaluación y handoff

- JSON y lectura ejecutiva versionados; recomendación condicionada y límites de evidencia.
- Estado/criterios al día; separar cierre del sandbox de aceptación ADR y apertura real.

## Out of Scope

- Producción/staging, DB, migrations, sync remoto, flags, credenciales, deploy o envíos.
- Provisioning real, cambio de servicios o reasignación histórica de Diseño.
- Implementar TASK-1852/1853/1854/1960/2033, UI o nueva topología.

## Detailed Spec

Comparar client-only A′/B y ambigüedad Company/Notion/sesión. Aplicar contexto y grants actuales. Normalizar
owner antes de candidatos Finance; sin señal de servicio conservar unresolved. Retry busca intención previa
antes del mapping actual, con permiso vigente sobre Space histórico. Exigir tres receipts GA4/GSC/AEO y scope
Blog. Anchors detectan drift; el simulador no ejecuta stores reales ni demuestra concurrencia en DB.

## Rollout Plan & Risk Matrix

Sandbox repo-only, no production runtime impact; sin modo apply, URL de conexión o credenciales.

### Slice ordering hard rule

Slice 1 → Slice 2 → Slice 3. Ninguna prueba habilita inserciones o cutover en entornos compartidos.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| Confundir simulación con certificación | Identity/Finance | medium | anchors + límites explícitos | synthetic-only |
| Import de store/SDK | Datos/red | low | allowlist de imports, sandbox sin red | runner falla antes de evaluar |
| Reasignación/duplicación | Diseño | low en sandbox | snapshot congelado y owner único | test falla |

### Feature flags / cutover

Sin flags/cutover: fuera del portal. Promoción exige nuevas unidades y ADR aceptado.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| 1 | Retirar documentos/entradas propios | minutos | sí |
| 2 | Retirar carpeta del prototipo | minutos | sí |
| 3 | Corregir evidencia conservando trazabilidad | minutos | sí |

### Production verification sequence

No se ejecuta aquí. Futuro: U01/U02/U02F → DB aislada/QA → autorización → provisioning real. No restaurar
writers legacy incompatibles tras split.

### Out-of-band coordination required

Ninguna para sandbox. Julio/Core/Identity/Finance aceptan puente/gates antes de promover.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] ADR Proposed y task/índices registrados sin sustituir dueñas existentes.
- [ ] Source of truth, contract surface y consumers nombrados con paths reales.
- [ ] A′ y B comparados con fallos legacy observables y anchors vigentes.
- [ ] Historia Diseño intacta, sin duplicar Organization/owner comercial/Finance.
- [ ] Acceso cruzado denegado, refresh preserva contexto y revocación invalida cache/retry.
- [ ] Routing inequívoco de servicios/fuentes y replay con conflicto de intención.
- [ ] Finance normaliza owner antes de candidatos; sin señal sigue unresolved.
- [ ] GA4/GSC/AEO obligatorios, ausencia distinta de cero y scope Blog explícito.
- [ ] Migration/backfill/rollback, errores, auditoría y límites de concurrencia/runtime declarados.
- [ ] Runner/tests pasan sin imports privilegiados, red o credenciales.
- [ ] Evidencia/recomendación/gates versionados; ningún cambio productivo/histórico.

## Verification

- `pnpm task:lint --task TASK-2073`: scanned=1 template=1 legacy=0 y cero hallazgos.
- `node --test scripts/experiments/operational-account-bridge/prototype.test.mjs`
- `node scripts/experiments/operational-account-bridge/evaluate.mjs`
- `pnpm exec eslint scripts/experiments/operational-account-bridge/`
- `pnpm ops:lint --changed` y cierre documental focal.
- Baseline lint/types global registrada separadamente; no demuestra integración o migración.

## Closing Protocol

- [ ] Lifecycle/carpeta sincronizados.
- [ ] Índices tasks/ADR sincronizados.
- [ ] Handoff actualizado con evidencia y gates.
- [ ] Changelog evaluado: sandbox aislado no cambia producto.
- [ ] Chequeo cruzado TASK-1852/1853/1854/1960/2033 registrado.
- [ ] Diferenciar cierre de sandbox, ADR Proposed y rollout no autorizado.

## Follow-ups

U01 contexto/acceso; U02 sync/fuentes; U02F owner Finance **antes** de U03 provisioning. U04–U10 permanecen en
el plan integral; registrar ejecución posterior sin duplicar dueñas.

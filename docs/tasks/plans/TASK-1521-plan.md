# TASK-1521 — Execution Plan

- Fecha: 2026-07-23
- Estado: activo; intake canónico completado, task no cerrada
- Runtime: `/Users/jreye/Documents/efeonce-globe`
- Governance: `/Users/jreye/Documents/greenhouse-eo`
- Skills: `greenhouse-task-execution-hook`, `greenhouse-task-planner`,
  `greenhouse-documentation-governor`, `software-architect-2026`, `greenhouse-secret-hygiene`,
  `greenhouse-qa-release-auditor`

## Goal and boundary

Habilitar una etapa comercial explícita de Globe mediante contratos y automatización multi-workspace,
fail-closed, auditables y operables sin intervención manual por pieza. El objetivo de cierre exige aislamiento,
workers/schedulers gobernados, delivery multimedia escalable, promotion/rollback y evidencia live proporcional.
Una generación humana exitosa en el runtime controlado es evidencia de avance, no equivalencia de
`commercial ready`.

Esta ejecución no abre clientes externos ni declara Production antes de `TASK-1480`. Tampoco duplica los sources
of truth de identity, tenancy, ledger, providers o assets.

## Audit 2026-07-23 — current state

### Supuestos correctos

- Greenhouse gobierna tasks, decisiones y desired access; Globe posee su proyección runtime y primitives creativas.
- El Producer consume command/readers server-side; el browser no suministra identidad, workspace ni grants.
- El runtime interno está desplegado en Globe `b7adef31a349`, Studio `globe-studio-internal-00048-m4z` y API
  `globe-api-internal-00049-7gw`, con migraciones `0001…0023` aplicadas.
- El runtime actual ejecutó cinco runs completos, retuvo nueve outputs reales y sirvió/reprodujo Image, Video y
  Audio desde la UI por el carril gobernado.

### Estado vigente que todavía bloquea commercial ready

- El catálogo contiene diez rutas; sólo Seedream 5 Pro, Seedance 2.0 y ElevenLabs Multilingual v2 tienen promoción
  exacta y canary end-to-end. Las otras siete no pueden heredarlo por familia o provider.
- La sesión expirada aún degrada viewer/feed a errores genéricos; falta `401/403 → reautenticación visible →
  recuperación` sin repetir un command de gasto.
- Cinco eventos outbox `reconcile` permanecen `pending` para runs ya `completed`; elevan una edad de cola que hoy no
  representa sólo trabajo reclamable. Deben terminalizarse/supersederse mediante primitive gobernada y backfill,
  nunca SQL manual.
- No hay derivados de preview ni streaming Range extremo-a-extremo; cards/viewer consumen originales. Tampoco hay
  política explícita de feed pendiente ni GC de objetos huérfanos. ADR-008 fija el contrato; su implementación se
  descompone por build unit.
- La alerta `globe_worker_failed` carece de severidad explícita y puede disparar por un único evento sin diagnóstico
  suficiente.
- El host/front door, perfil de ambiente, aislamiento y go/no-go de la etapa comercial siguen pendientes. El front
  door interno no decide ni habilita el comercial.

### Historia preservada, no estado vigente

El checkpoint inicial encontró un lease expirado y las limitaciones de ADR-006 V1. Ese hallazgo originó el delta
V2 workspace-complete (`members[]`, revisión semántica separada de freshness, suspensión por omisión y grants
append-only). Desde entonces la proyección y los workers permitieron que governance procesara el lote interno
(`claimed=3`, `applied=3`, `promoted=1`, `failed=0`) y que Image, Video y Audio llegaran al feed. Por ello el plan
ya no presenta “implementar V2 para desbloquear el primer asset” como siguiente paso, aunque mantiene sus
invariantes y exige evidencia multi-workspace/comercial antes de promoción.

### ADR y contratos obligatorios

- ADR-006, delta V2: snapshot `members[]` workspace-complete, semantic revision separada de lease freshness,
  suspensión por omisión y grant history append-only.
- ADR-008: originales privados inmutables, derivados versionados, serving Range autorizado, visibilidad del feed y
  GC mark-and-sweep como responsabilidades separadas.
- ADR-001 y API Contract Spine: trusted context server-derived y federación separada de workload identity.
- TASK-1467/1468/1482/1511: provenance/rights, ledger/budgets y projection stores siguen siendo owners.
- TASK-1480: conserva el go/no-go para clientes externos.

### Access model

- Autoridad efectiva: broker capabilities ∩ membresía proyectada activa ∩ grants locales activos y acotados.
- Reconciler: service principal dedicado con sólo la capability de reconciliación.
- Operator y workers: principals separados; no heredan authority de una sesión humana ni de un tenant hard-coded.
- Workspace/member/grant expirado, omitido, suspendido o stale falla cerrado.

### Runtime evidence disponible

- Sesión humana autenticada con workspace `greenhouse-org:efeonce`; API anónima continúa `403`.
- Cinco runs `completed`, nueve piezas reales y bytes `200` para imagen/video/audio. El video canario reprodujo MP4
  1280×720 de 4.041667 s.
- Producer Worker corre por Scheduler. Asset Governance completó un lote interno con
  `claimed=3`, `applied=3`, `promoted=1`, `failed=0`.
- La evidencia cubre sólo tres rutas exactas e internal-only; no cubre derivados, Range real, carga, GC,
  recuperación de sesión expirada ni ambiente comercial.

### Riesgos / blast radius

- Promover una familia completa con evidencia de una ruta puede gastar por un adapter/config no verificado.
- Servir originales mediante buffers escala memoria con el tamaño/concurrencia del medio y degrada viewer/feed.
- Exponer `candidate_ready` como elegible puede entregar bytes aún no autorizados por governance.
- GC por listado/borrado inmediato puede eliminar originales, referencias, holds o jobs todavía válidos.
- Una reconciliación parcial o snapshot V2 mal versionado puede conservar o revocar authority indebidamente; exige
  transacción, dry-run, canary, métricas y rollback.

## Open questions resolved

1. **¿Parchear el workspace interno?** No. Se corrige ADR-006 y el aggregate con semántica multi-workspace.
2. **¿Cómo renovar un workspace sin churn?** Lease freshness es independiente de `semanticRevision` y de su
   fingerprint.
3. **¿Qué significa omitir un miembro?** En un snapshot completo significa suspensión fail-closed, atómica y
   auditada.
4. **¿Cómo retirar capabilities?** Se apendea revocación/supersession; nunca update/delete destructivo.
5. **¿Manual o automático?** Los one-shots sólo diagnostican. El estado operativo requiere reconciler y workers
   periódicos gobernados con lag/expiry/queue signals.
6. **¿Host/front door comercial?** Sigue siendo Slice 0 pendiente; no se infiere desde el front door interno.
7. **¿Cómo escalar entrega multimedia?** ADR-008: original inmutable + derivados versionados + streaming Range +
   proyección governance-aware + GC mark-and-sweep, implementados como unidades separadas.

## Subagent strategy

`fork`, autorizado por el operador. Los carriles pueden ejecutarse con ownership exclusivo:

- tenancy contracts/domain/database y tests;
- reconciler/scheduler/IaC/observability;
- QA/documentación/evidence pack.

El agente raíz conserva integración, comandos live sensibles, consolidación y verificación end-to-end. Ningún
subagente cambia branch, hace push o toca archivos de otro carril.

## Execution slices

### 0. Architecture and commercial-stage gates

#### 0A. Media delivery boundary — accepted, implementation pending

- ADR-008 fija originales privados/inmutables, derivados versionados, Range real, feed governance-aware y GC
  mark-and-sweep.
- Crear build units con ownership exclusivo para: contratos/schema de derivados, transform workers, serving Range,
  proyección del feed y lifecycle reconciler/GC.
- Esta aceptación no habilita delivery comercial: requiere canaries independientes de Image/Video/Audio, carga,
  negativos de acceso y dry-run/apply de GC sobre el deployment/config exacto.

#### 0B. Commercial stage decision — still open

- Resolver environment vocabulary, host/front door, origin/session y matriz de aislamiento.
- Mantener clientes externos cerrados hasta sign-off de `TASK-1480`.
- Evidencia pendiente: ADR/delta aceptada, config matrix y rollback antes de provisionar/cutover.

### 1. Identity/tenancy convergence and session recovery

- Mantener los contratos V2 workspace-complete y verificar multi-member, omission, lease-only renewal,
  conflict/rollback revision, cross-workspace y audit en el perfil que se promueva.
- Cerrar la experiencia de sesión expirada con CTA de reautenticación y smoke humano
  `401/403 → session 200 → reader/output 200`, sin regenerar ni reintentar commands de gasto.
- Ningún fallback single-tenant, extensión manual de lease o identidad humana compartida.

### 2. Continuous reconciliation, queue truth and automation

- Productizar Greenhouse broker → Globe reconciler con service identity mínima, idempotencia y renovación antes de
  expiry.
- Terminalizar/superseder eventos reconcile cuando el run ya es terminal; queue age cuenta sólo eventos
  reclamables. Backfill gobernado, auditable, idempotente y con dry-run.
- Declarar schedulers/workers en IaC, con pausa/reanudación gobernada, retry/backoff, DLQ/recovery y readback.
- Signals: reconcile lag, lease time-to-expiry, projection drift, queue oldest age, claims/applied/rescheduled,
  provider/ledger/asset governance health.
- Canary allowlisted antes de ampliar; rollback pausa dispatch y revoca grants temporales sin borrar historia.

### 3. Media delivery and asset lifecycle build units

- Derivative contract: persistir intents/records por profile/version/transformer y output hash sin reescribir el
  original.
- Transform workers: thumbnail/viewer preview, video poster/playback transcode y audio waveform/peaks/playback,
  separados del worker de governance y del web/BFF.
- Serving: reautorizar y transmitir GCS con single Range `206/416`, backpressure y memoria acotada.
- Feed: placeholder owner-only mientras governance está pending; bytes sólo eligible; shared/client adicionalmente
  requiere política de review/share.
- Lifecycle: inventario, marks, grace/holds, dry-run y apply con generation preconditions; reconciliar `412` por
  metadata/hash, nunca overwrite.
- Verificar `generated → governance → derivatives → eligible → feed/viewer/download` para Image/Video/Audio y los
  negativos de tenant, sesión/ticket expirado, grant revocado, restricted asset y kill switch.

### 4. Exact route promotion and commercial runtime isolation

- Promover cada una de las siete rutas pendientes sólo con review/proposal/binding/circuit/canary independiente;
  no inferir readiness por modelo, provider o modalidad.
- Implementar perfiles versionados y aislados para config, IAM, secrets, DB/storage, sessions, providers,
  observability y migrations.
- Integrar gates de ledger/provider/readiness desde sus owners, sin duplicarlos.
- Ejecutar canary, backup/restore y rollback rehearsal; promotion command con lock y evidence snapshot.

### 5. QA and closure

- Verificación focal y full gates en Globe; worker/build/IaC gates donde aplique.
- Verificación UI humana final con Playwright/GVC y evidencia desktop/mobile: creación pending visible dentro del
  feed, título/selección estables, imagen visible/descargable, video reproducible/descargable y audio
  reproducible/descargable.
- Asignar severidad explícita y condiciones accionables a `globe_worker_failed`; verificar payload saneado,
  referencia/correlación y runbook.
- `pnpm task:lint --task TASK-1521`, `pnpm ops:lint --changed`, `pnpm qa:gates --changed`,
  `pnpm docs:closure-check` y `pnpm docs:context-check:strict`.
- Mantener lifecycle `in-progress` y estado honesto hasta rollout, recuperación y promoción verificadas.

## Stop conditions

- Snapshot parcial o ambiguity de members.
- Mismo semantic revision con fingerprint distinto.
- Lease, member o grant expirado/suspendido.
- `candidate_ready` sin governance eligible intentando servir bytes.
- Serving que materializa el objeto completo o no preserva semántica Range.
- GC sin dry-run, grace/holds, generation precondition o autoridad inequívoca.
- Cualquier provider submit sin ledger reservation y readiness promoted.
- Drift IaC, secreto expuesto, principal sobreprivilegiado o scheduler sin rollback.
- Evidencia de otro deployment/config/environment.

## Current checkpoint

El runtime **internal-only** genera, gobierna y recupera Image, Video y Audio en tres rutas exactas. ADR-006 V2 y
ADR-008 documentan tenancy y media delivery. El corte `f9839ee` cerró sesión expirada/viewer y modalidad multimedia;
el Worker `8d7ecb1` supersedió seis reconciles terminales de forma gobernada y estabilizó queue age en cero; las
severidades live quedaron `ERROR/WARNING`. Siguen pendientes la implementación completa de ADR-008, siete
promociones exactas, el gate 0B de commercial stage, aislamiento, restore/rollback y promotion. La convergencia
live/títulos queda en `TASK-1525`→`TASK-1526`. TASK-1521 permanece `in-progress`; no hay base para declarar la
plataforma comercialmente completa.

# TASK-1637 — Globe governed run: deadlines por etapa, stuck detection y conformance del spine

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
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `api`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `Globe main; Greenhouse develop para docs. Sin worktrees.`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cerrar los tres criterios que `TASK-1469` dejó **declarados NO VERIFICADOS** al reconciliar su bloque de
aceptación, más el webhook de OpenAI que hoy es una **suposición razonable sin evidencia de runtime**.

Son deuda de **verificación y de contrato**, no de funcionalidad: el ciclo de vida gobernado funciona y está
desplegado. Lo que falta es que el sistema pueda **decir dónde se atascó** y que el contrato programático esté
probado en los caminos que nadie ejercitó.

## Why This Task Exists

`TASK-1469` se había movido a `complete/` con sus 22 criterios sin recorrer. Al reconciliarlos con evidencia
quedaron **19 marcados y 3 declarados NO VERIFICADOS**. Esos tres no se pueden cerrar dentro de aquella task sin
volver a inflarla, y dejarlos ahí los vuelve invisibles: una task cerrada no la lee nadie.

Y hay una razón concreta, medida el 2026-08-04, para que los deadlines por etapa no esperen. La proyección
`runProgress` cerró el hueco de **«no sé si avanza»**, pero **no** el de «lleva demasiado en la misma etapa»:
hoy el sistema puede mostrar honestamente `provider-running` durante horas sin que nada lo declare atascado. El
presupuesto de latencia existe **en un documento** (`~8 min`, ADR-007), no en el runtime.

El webhook de OpenAI es un caso aparte y hay que nombrarlo con honestidad: sus intentos corren por `poll` y no
existe ninguna señal suya. **Probablemente sea correcto por diseño** —OpenAI no emite eventos de webhook para
imágenes, y su verificador es código muerto cuya ruta es además irregistrable (`ISSUE-138` D13)—, pero *probable*
no es *verificado*, y la diferencia importa: si algún día emite y no lo tomamos, el síntoma sería un asset pagado
que llega tarde o no llega.

## Goal

Que un run gobernado **declare su propio atasco** por etapa en vez de depender de que alguien compare contra un
presupuesto documentado, y que el contrato programático del ciclo de vida tenga conformance ejecutado sobre los
caminos que hoy nadie prueba — dejando el estado del webhook de OpenAI **resuelto por evidencia**, no por
inferencia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_PROVIDER_COMPLETION_CAPTURE_DECISION_V1.md` (ADR-021) — los
  invariantes I1-I11 de captura de completitud y convergencia terminal. **I11** (el sello de la cola con reloj de
  pared) es precondición: sin él, cualquier deadline medido sobre filas viejas es basura.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ASSET_GOVERNANCE_WORKER_DECISION_V1.md` (ADR-007) — el
  presupuesto de latencia por etapa que hoy sólo vive en prosa.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md` — coverage matrix machine-readable y
  el harness de conformance manifest-driven que ya existe y hay que **extender, no reemplazar**.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — el contrato programático es la base; el
  conformance es cómo se prueba.

## Normative Docs

- `docs/tasks/complete/TASK-1469-globe-governed-run-lifecycle-submission-fence.md` [verificar ruta: hoy está en
  `in-progress/`] — los tres criterios exactos y su redacción original.
- `docs/issues/open/ISSUE-138-globe-provider-completion-capture-loses-paid-assets.md` — **D13** describe por qué
  la ruta del webhook de OpenAI es irregistrable.
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md` — estado vigente de revisiones y flags.

## Dependencies & Impact

**Depende de:**

- `TASK-1469` — I11 (sello con reloj de pared) **ya desplegado**; sin él los deadlines medirían sobre timestamps
  contradictorios. ⚠️ Y hay un límite que esta task hereda: **las filas anteriores al sello siguen sucias**, así
  que cualquier backfill o serie histórica debe filtrar por fecha de sello.
- `GOVERNED_RUN_COARSE_PROGRESS` (`packages/contracts/src/governed-runs.ts`) — las seis fases son el vocabulario
  sobre el que se declaran los deadlines. Un deadline por etapa que invente sus propias etapas sería una cuarta
  transcripción del mismo concepto.

**NO depende de (y no debe absorber):**

- 🔴 **La policy de fallback entre rutas es de `TASK-1470`** (`Globe Production Provider Router`, `in-progress`),
  que ya declara «resolver rutas por fidelity contract, rights, readiness, budget y policy, **con fallbacks
  explícitos**». El criterio «fallback requiere policy explícita y registra proposed vs actual route» de
  `TASK-1469` **pertenece a ella**, no a esta task. Verificar su cierre allá.

**Impacta a:**

- `TASK-1632` — su desbloqueo dependía de los puntos abiertos de `TASK-1469`; esta task hereda esa relación.
- `docs/operations/creative-studio/GLOBE_PRODUCER_ALERT_TRIAGE_V1.md` — un deadline nuevo es una señal nueva y su
  triage tiene que existir antes de encenderla.

### Files owned

- `packages/domain/src/governed-run-lifecycle.ts`
- `packages/contracts/src/governed-runs.ts`
- `apps/studio-web/src/worker-main.ts` [verificar: dónde se emiten hoy las señales del worker]
- `infra/terraform/producer_worker_observability.tf`

## Current Repo State

**Ya existe:**

- Ciclo de vida gobernado completo con leases, fencing y state machine (`governed-run-lifecycle.ts`).
- `GOVERNED_RUN_COARSE_PROGRESS` — las seis fases canónicas, como dato único.
- `LabExperimentV1.runProgress` — expone fase, intento, `providerAccepted` y `since` (**`since` es la señal que
  un deadline por etapa necesita**: es cuándo entró en la fase actual).
- Señales `outboxTerminalAttempts`, `outboxRetryStorm`, `queueOldestAgeSeconds`, `runAggregateDivergence`, con
  alertas vivas en Cloud Monitoring.
- Harness de conformance manifest-driven del spine.
- `production-route-failure-classification.test.ts` — clasificación de fallos con guard derivado.

**Gap:**

- No existe **deadline por etapa**: el presupuesto (~8 min end-to-end, governance ~3 min) vive en ADR-007 como
  prosa, no como dato que el runtime pueda evaluar.
- No existe **stuck detection**: `queueOldestAgeSeconds` mide la cola, no cuánto lleva un run **en su fase
  actual**. Un run aceptado por el proveedor que nunca completa no infla la cola.
- El conformance **no recorre** `prepare → estimate → approve → submit → status/cancel/retry/branch`, ni el deny,
  ni el replay.
- El webhook de OpenAI **no tiene evidencia** de runtime en ningún sentido (ni que llegue, ni que no exista).

## Modular Placement Contract

- Topology impact: `none`
- Current home: `efeonce-globe` — `packages/{contracts,domain}` + `apps/studio-web` + `infra/terraform`
- Future candidate home: `remain-shared`
- Rationale: el ciclo de vida gobernado ya vive en su unidad canónica; no se anticipa extracción
- Boundary: el vocabulario de fases es de `packages/contracts`; la evaluación del deadline es de
  `packages/domain`; la emisión de la señal es del worker. **Ninguna de las tres se mezcla.**
- Server/browser split: server-only. Nada de esto cruza al payload cliente.
- Build impact: ninguno — no se agregan packages ni apps
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: `GOVERNED_RUN_COARSE_PROGRESS` (vocabulario de fases) + `governed_run_attempts`
  (`updated_at` = desde cuándo está en esta fase)
- Consumidores afectados: `worker` (emite la señal), `API/reader` (expone el estado), `MCP` (hereda por parity)
- Runtime target: `production` (worker + API)

### Contract surface

- Contrato existente a respetar: `packages/contracts/src/governed-runs.ts`,
  `packages/domain/src/governed-run-lifecycle.ts`, el manifest de coverage del spine
- Contrato nuevo o modificado: presupuesto por fase como **dato enumerable** + una señal de stuck detection +
  extensión del harness de conformance
- Backward compatibility: `compatible` — el presupuesto nace como dato adicional; ninguna fase cambia de nombre
- Full API parity: la detección de atasco se expone por el **reader existente** del run, no por un endpoint nuevo
  ni por una consulta directa a la tabla

### Data model and invariants

- Entidades/tablas/views afectadas: `globe.governed_run_attempts`, `globe.governed_run_outbox` (lectura)
- Invariantes que no se pueden romper:
  - **El presupuesto por fase es un `Record` EXHAUSTIVO sobre las seis fases canónicas.** Una fase nueva sin
    presupuesto rompe el build. Nunca un default: un catch-all convierte «no sé» en «está bien».
  - **Un deadline vencido NO cancela ni reintenta nada.** Declara y observa; matar una corrida ya cobrada por un
    reloj es exactamente el modo de fallo que `ISSUE-135` costó descubrir.
  - ⚠️ **La medición arranca en el sello nuevo.** Las filas anteriores al reloj de pared (I11) tienen timestamps
    contradictorios — 23 de 131 medidas, peor caso −9,7 h — y no pueden alimentar una serie ni un backfill.
  - El vocabulario de fases **no se re-declara**: se importa de `GOVERNED_RUN_COARSE_PROGRESS`.
- Tenant/space boundary: `workspace_id` derivado del trusted context, nunca del request
- Idempotency/concurrency: la señal es una **lectura**; no muta estado ni toma leases
- Audit/outbox/history: append-only vía las señales existentes del worker; sin tabla nueva

### Migration, backfill and rollout

- Migration posture: `none` (esperado — el `since` por fase ya existe en `governed_run_attempts.updated_at`;
  confirmar en Discovery antes de descartarla)
- Default state: `flag OFF` — la señal nace apagada y se prende tras observar su valor en shadow
- Backfill plan: **ninguno**, deliberadamente. Los datos anteriores al sello de I11 no son confiables y un
  backfill sobre ellos produciría una línea base falsa.
- Rollback path: `flag off` (la señal deja de emitirse; nada más depende de ella)
- External coordination: alerta en Cloud Monitoring vía Terraform. ⚠️ **El aligner es función del TIPO de
  métrica**: `ALIGN_COUNT` sólo vale sobre DELTA/INT64; una métrica que extrae un valor necesita
  `ALIGN_PERCENTILE_99`, y copiarlo de la alerta hermana equivocada **falla en el apply con 400**.

### Security and access

- Auth/access gate: capability existente del ciclo de vida gobernado; sin superficie nueva
- Sensitive data posture: sin PII. **Nunca** exponer prosa del proveedor, stacks ni cuerpos upstream en la señal
- Error contract: códigos canónicos existentes; una razón nueva nace **con su código propio y clasificada en el
  mismo commit** (`production-route-failure-classification.test.ts` rompe el build si falta)
- Abuse/rate-limit posture: no aplica — lectura interna del worker

### Runtime evidence

- Local checks: `pnpm check` + `pnpm build` en `efeonce-globe`; tests nuevos registrados **a mano** en el script
  `test` de su package (no hay descubrimiento: un test no registrado nunca corre y la suite queda verde por no
  haberlo mirado)
- DB/runtime checks: `cloud-sql-proxy` a `globe-pg` + `psql` (`set search_path to globe`), midiendo **sólo** filas
  posteriores al sello de I11
- Integration checks: para el webhook de OpenAI, evidencia en **ambos sentidos** — o una entrega real recibida, o
  la constatación documentada de que su lane no aplica a imágenes (`ISSUE-138` D13)
- Reliability signals/logs: nombre de la señal nueva + su alerta; `globe_worker_completed` como línea base
- Production verification sequence: (1) desplegar con el flag OFF, (2) observar el valor en shadow al menos una
  ventana completa de generación real, (3) recién entonces encender la alerta

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     (No llenar al crear la task.)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

- **Slice 1 — El presupuesto por fase, como dato.** `Record` exhaustivo sobre las seis fases canónicas en
  `packages/contracts`, con su guard en ambas direcciones (una fase sin presupuesto rompe el build; un
  presupuesto sobre una fase inexistente queda mintiendo).
- **Slice 2 — Evaluación y señal de stuck detection.** Helper de dominio que compara `since` contra el
  presupuesto de la fase y devuelve un veredicto; señal del worker detrás de flag, **default OFF**. Declara y
  observa: no cancela ni reintenta.
- **Slice 3 — Alerta y triage.** Métrica + alerta en Terraform con el aligner correcto para su tipo, y la entrada
  de triage en el runbook **antes** de encenderla.
- **Slice 4 — Conformance del ciclo completo.** Extender el harness manifest-driven para recorrer
  `prepare → estimate → approve → submit → status/cancel/retry/branch`, más **deny y replay**.
- **Slice 5 — Resolver el webhook de OpenAI por evidencia.** Cerrarlo en un sentido u otro y registrar cuál, con
  la consecuencia documentada.

## Out of Scope

- 🔴 **La policy de fallback entre rutas** — es de `TASK-1470`.
- Cancelar, reintentar o degradar automáticamente por deadline vencido. Esta task **observa**; actuar sobre el
  veredicto es una decisión posterior con su propia autorización.
- Backfill de series históricas (los datos pre-sello no son confiables).
- Cualquier cambio en el payload cliente o en la UI del Producer.
- `D12` de `ISSUE-138` — tiene su propio cierre en `TASK-1469`.

## Detailed Spec

El presupuesto por fase **no es el presupuesto end-to-end dividido**. ADR-007 mide `~8 min` totales porque Asset
Governance es *cadence-bound*: avanza una etapa por tick de su cron y el trabajo real son ~60 s. Un deadline por
fase tiene que declarar el presupuesto **de esa fase**, con su holgura, y documentar de qué depende — si depende
de una cadencia, cambiar el cron cambia el presupuesto, y eso debe quedar escrito donde alguien lo lea al
cambiarlo.

La holgura es una decisión, no un cálculo. El precedente está medido: la paciencia del canary quedó en 45 min
sobre una latencia real de 7,9 min, deliberadamente, porque **un instrumento demasiado impaciente falla en falso
y enseña a leer «timeout» como normal** — que es exactamente cómo un cuelgue real pasa desapercibido.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → 2 → 3 es **secuencia, no menú**: encender una alerta (3) antes de observar el valor en shadow (2)
produce una alerta cuyo umbral nadie calibró, y una alerta que grita el primer día se silencia el segundo.
Slices 4 y 5 son independientes y pueden correr en paralelo.

### Risk matrix

| Riesgo | Sistema | Prob | Mitigación | Señal |
|---|---|---|---|---|
| Umbral mal calibrado ⇒ alertas en falso | Observabilidad | Alta | Shadow con flag OFF durante al menos una ventana real antes de encender | Conteo de la señal en shadow |
| Alguien conecta el veredicto a una acción automática | Runs gobernados | Media | Out of Scope explícito + la señal no expone un command | Revisión de PR |
| Medir sobre filas pre-sello ⇒ línea base falsa | Datos | Media | Filtro obligatorio por fecha de sello (I11); sin backfill | Query de verificación |
| Aligner equivocado en la alerta | Terraform | Media | `ALIGN_PERCENTILE_99` para DELTA/DISTRIBUTION; el apply falla con 400 si no | `tofu apply` |
| Conformance nuevo ejerce un camino con gasto | Créditos | Baja | El harness corre sobre el seam hermético; ningún caso nuevo toca un proveedor real | Ledger sin movimientos |

### Feature flags / cutover

Una flag para la señal de stuck detection, **default OFF**, registrada en
`docs/operations/FEATURE_FLAG_STATE_LEDGER.md` **en el mismo PR** que la declara. ⚠️ Prenderla es multi-runtime:
mapear dónde se LEE antes de prenderla — lo async vive en el worker, no en el servicio web.

### Rollback plan per slice

| Slice | Rollback | Tiempo | ¿Reversible? |
|---|---|---|---|
| 1 | revert PR | < 10 min | Sí — sólo agrega dato |
| 2 | flag OFF | < 5 min | Sí |
| 3 | `tofu apply` revirtiendo la alerta | < 15 min | Sí |
| 4 | revert PR | < 10 min | Sí — sólo tests |
| 5 | N/A — documental | — | Sí |

### Production verification sequence

1. Desplegar con la flag OFF y confirmar la revisión activa (no el workflow verde).
2. Observar el valor en shadow durante al menos una generación real completa.
3. Calibrar el umbral **con ese dato**, no con el presupuesto documentado.
4. Encender la alerta y verificar que su triage existe en el runbook.

### Out-of-band coordination required

Aplicar la alerta en Cloud Monitoring vía Terraform (`tofu plan` exigiendo `0 to destroy`, con las variables del
entorno de desarrollo). Un 404 sobre la métrica recién creada es **propagación** (hasta 10 min), no un defecto.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El presupuesto por fase es un `Record` exhaustivo sobre las seis fases canónicas y una fase nueva sin
      presupuesto **rompe el build**; el guard corre en ambas direcciones y está probado en rojo.
- [ ] El vocabulario de fases se **importa** de `GOVERNED_RUN_COARSE_PROGRESS`; no existe una segunda declaración.
- [ ] Un run que excede el presupuesto de su fase queda **declarado y observable**, y **no** se cancela, reintenta
      ni degrada por efecto del deadline.
- [ ] La señal nace con flag **default OFF**, tiene fila en el ledger de flags en el mismo PR, y su umbral se
      calibró con datos observados en shadow, no con el presupuesto documentado.
- [ ] La medición excluye filas anteriores al sello de I11 y no se ejecuta ningún backfill sobre ellas.
- [ ] La alerta usa el aligner correcto para su tipo de métrica y su entrada de triage existe en el runbook
      **antes** de encenderla.
- [ ] El conformance recorre `prepare → estimate → approve → submit → status/cancel/retry/branch`, más deny y
      replay, sin tocar ningún proveedor real ni mover el ledger de créditos.
- [ ] Los tests nuevos están registrados **a mano** en el script `test` de su package y aparecen en la salida del
      run.
- [ ] El webhook de OpenAI queda resuelto **por evidencia en algún sentido** y registrado: o llegó una entrega
      real, o está documentado por qué su lane no aplica, con la consecuencia declarada.
- [ ] Source of truth, contract surface y consumidores están nombrados con rutas u objetos reales.
- [ ] Invariantes de datos, frontera tenant/acceso y postura de idempotencia/concurrencia son explícitas.
- [ ] La postura de migración/backfill/rollback es explícita y proporcional al riesgo.
- [ ] Hay evidencia de runtime o DB para todo cambio que no sea documentación.
- [ ] No hay fuga de prosa del proveedor, stacks ni cuerpos upstream en señales ni logs.

## Verification

```bash
cd ../efeonce-globe
pnpm check   # typecheck + node --test en todos los packages/apps
pnpm build
```

Runtime: `cloud-sql-proxy "efeonce-globe:southamerica-west1:globe-pg" --port 15433 --auto-iam-authn`, luego
`psql` con `set search_path to globe`, filtrando por fecha de sello. Alerta: `tofu plan` con `0 to destroy`.

## Closing Protocol

1. `Lifecycle: complete` y mover a `docs/tasks/complete/`.
2. Sincronizar `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md`.
3. Actualizar `GLOBE_RUNTIME_HANDOFF.md` con el estado de la flag y el umbral calibrado.
4. Actualizar ADR-021 si el presupuesto por fase se vuelve un invariante nuevo.
5. Actualizar la skill `greenhouse-globe` si nace una regla dura reusable.
6. Cerrar el criterio correspondiente en `TASK-1469` con referencia a esta task.

## Follow-ups

- Si el veredicto de deadline llegara a conectarse a una acción automática, eso es una **task nueva** con su
  propia autorización: matar una corrida ya cobrada por un reloj es un modo de fallo caro.
- La policy de fallback sigue en `TASK-1470`; verificar su cierre allá y no absorberla acá.

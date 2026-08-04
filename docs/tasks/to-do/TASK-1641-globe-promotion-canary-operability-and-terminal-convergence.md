# TASK-1641 — Globe: canary post-promoción operable y convergencia terminal de la saga

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

Hacer **operable** el canary post-promoción de ADR-009 y cerrar la **divergencia de agregados** que deja
un rollback de promoción a medio camino.

Hoy la saga de promoción exige un canary atestado dentro de su ventana, pero **no existe un camino
operativo para producirlo**: el canary estándar no puede apuntar a una ruta arbitraria, y ninguna señal
avisa que una promoción activada está por expirar. El resultado medido es que **10 de 12 promociones
terminaron revertidas**.

## Why This Task Exists

Medido el 2026-08-04 sobre `production_promotion_operations` en producción:

| Estado final | Cantidad |
|---|---|
| `rolled_back` | **10** |
| `canary_passed` | 2 |

Cuatro de las revertidas **ya estaban `activated`** y murieron segundos después de su `deadline_at`
(`ref/still/reference-v1` +2 s, `ref/video/frames-v1` +18 s, `ref/video/motion-v1` +40 s,
`ref/motion/reference-v1` +26 s). O sea: la promoción **funcionó**, y se deshizo sola porque nadie
atestó el canary.

**El diseño es correcto y no hay que relajarlo.** `activated` no es terminal: una ruta activada que
nadie probó con una generación real no debe quedar viva, y el código es explícito
(*"Never infer or attest canary success"*). Lo que falta es el **paso operativo** y su **observabilidad**:

1. **No hay camino para producir el canary de una ruta arbitraria.** `pnpm producer:canary` tiene sus
   tres modalidades fijas —su lane de video es Seedance— y los `GOVERNED_MODES` que sí conocen
   `ref/video/frames-v1` quedan en `executionReady: false`. Verificar una ruta recién promovida exige
   hoy escribir la secuencia a mano contra el spine, que es justo lo que la disciplina del repo prohíbe.
2. **Nada avisa que una ventana se está agotando.** El reader `globe.production-promotion.operation.stalled`
   existe, pero no hay señal ni alerta: la primera noticia de que una promoción murió es descubrir el
   binding apagado.
3. **El rollback no converge los tres agregados.** Tras revertir `ref/video/frames-v1`, el binding quedó
   `enabled=false` y el circuito `open`, pero **`model_readiness_revisions` quedó en `promoted`**. Tres
   agregados, dos posturas, sin nada que lo declare.

El punto 3 es exactamente el invariante que `TASK-1469` declaró para los runs —*"cuando un agregado
llega a terminal, todo agregado que dependa de su estado converge o queda observable"*— aplicado a otra
saga. Se declara como invariante y no como arreglo de un caso porque el mismo defecto ya apareció en
dos familias distintas.

## Goal

Que promover una ruta sea un procedimiento **completable**: que exista un camino canónico para producir
el canary de la identidad exacta, que la ventana avise antes de expirar, y que un rollback deje los tres
agregados convergidos o su divergencia declarada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_COMMERCIAL_PROMOTION_ATTESTATION_DECISION_V1.md`
  (ADR-010) — la promoción hace la ruta *available*; no aprueba piezas. El canary es el gate que prueba
  que la ruta produce.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_PROVIDER_COMPLETION_CAPTURE_DECISION_V1.md` (ADR-021)
  — convergencia terminal y agregados observables; este trabajo aplica el mismo invariante a la saga de
  promoción.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md` — el canary se produce por
  commands canónicos; nunca por una secuencia artesanal.

## Normative Docs

- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md` — estado vivo de rutas y promociones.
- `docs/operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md` — ledger humano de la flota.

## Dependencies & Impact

- **Depende de:** `ISSUE-140` para poder ejercitar la ruta Veo end-to-end (no bloquea el diseño ni los
  slices de observabilidad y convergencia, que son independientes del proveedor).
- **Impacta a:** toda promoción futura de `EPIC-028`; `TASK-1480` (readiness comercial) hereda el
  procedimiento.
### Files owned

- `efeonce-globe` — `packages/domain/src/production-promotion-operation.ts`
- `efeonce-globe` — `scripts/producer-ui-canary.mjs` y `scripts/producer-ui-canary-lib.mjs`
- `efeonce-globe` — `.github/workflows/globe-operator-lane.yml`
- `greenhouse-eo` — runbook de promoción en `docs/operations/creative-studio/`

## Current Repo State

- La saga y sus 8 commands existen y funcionan (`production-promotion-operation.ts`).
- `DurableProductionPromotionCanaryAuthority.resolveCanary` ya certifica el canary server-side contra
  autoridades durables: run `completed` post-activación, attempt terminal en la tupla exacta, output
  retenido con asset `active` y `asset_governance_jobs.state = 'eligible'`. **No hay que tocarlo.**
- `globe.production-promotion.operation.stalled` existe como reader y **no tiene consumidor**.
- El pairing lane/mode del operator lane ya cubre `canary-confirm:checker`.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `efeonce-globe` — `packages/domain` + `scripts` + `.github/workflows`
- Future candidate home: `remain-shared`
- Rationale: la saga vive en su unidad canónica; no se anticipa extracción
- Boundary: la certificación del canary es de `packages/database` (autoridad durable); la transición es
  de `packages/domain`; la producción del canary es de `scripts`. **Ninguna de las tres se mezcla**, y en
  particular el script nunca afirma evidencia: sólo genera y deja que el servidor certifique.
- Server/browser split: server-only. Nada cruza al payload cliente.
- Build impact: ninguno — no se agregan packages ni apps
- Extraction blocker: `none`

## Backend/Data Contract

- **Sin migración de schema.** `production_promotion_operations` ya tiene `deadline_at` y
  `model_readiness_revisions` es append-only: la convergencia se expresa con una revisión nueva, nunca
  con un UPDATE.
- La señal de ventana por expirar se deriva del reader `stalled` existente; no se crea una tabla de
  estado paralela.
- Todo cambio de postura de readiness en un rollback es **append-only** y lleva su `reasonCode`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     (No llenar al crear la task.)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

1. **Canary de ruta arbitraria como camino canónico.** Extender el canary existente (no crear uno
   paralelo) para que pueda ejercitar la identidad exacta de una ruta recién promovida, incluidas las
   que exigen referencias de entrada. Debe resolver por sí mismo el `outputShape` desde
   `globe.producer.catalog.list` y el input autorizado desde el feed retenido.
2. **Señal de ventana por expirar.** Consumir `globe.production-promotion.operation.stalled` y emitir
   una señal observable cuando una operación `activated` se acerque a su `deadline_at`, con su alerta.
3. **Convergencia terminal del rollback.** Declarar los agregados dependientes de la saga en un array
   enumerable con test en **ambas direcciones** (un agregado sin postura rompe el build; un
   `observable` sin señal se rechaza), espejando `RUN_DEPENDENT_AGGREGATES` de `TASK-1469`. Reusar el
   primitive del camino hacia adelante para revertir readiness: **nunca** una lógica de cierre propia.
4. **`canary-confirm` no puede responder `internal_error` 500.** Medido 2026-08-04 sobre una promoción con TODA
   la evidencia en su lugar —run `completed`, asset `active` + `eligible`, output `retained`—: el command devolvió
   un 500 opaco y dejó la saga en `verifying_canary`, un estado del que **no hay reintento** (el command exige
   `activated`). El sello de una promoción legítima quedó inalcanzable por una excepción no manejada. Es
   `ISSUE-127` otra vez: cada causa por la que `resolveCanary` puede no resolver necesita su razón nombrada
   server-side, y el checkpoint no debe consumir el único estado desde el que se puede reintentar.

5. **Convergencia de la reserva pre-gasto.** La liberación económica está acoplada a `finalize()`, que sólo se
   alcanza con `completion` persistida; todo terminal que muere por `reschedule()` → `abandon()` sale sin
   movimiento de crédito, y `RUN_DEPENDENT_AGGREGATES` declara `credit_reservations` como `observable` delegando
   en el expiry TTL de **24 h**. Esa postura es correcta **post-gasto** —el settlement ya decidió y tocar dinero
   arriesgaría doble movimiento— pero **falsa pre-gasto**: un run que murió sin `providerOperation` no cobró nada,
   así que retener 24 h protege un escenario que no aplica. La distinción ya existe y está bien nombrada en la
   política de fases (`POST_SPEND_KINDS`) y **no se propaga a `abandon()`**. Propagarla es el trabajo; no
   relajar la postura `observable` donde sí corresponde.

6. **Runbook.** Procedimiento completo de promoción, con el canary como paso explícito y no como
   sobreentendido.

## Out of Scope

- Relajar o alargar la deadline. La ventana no es el problema; el procedimiento faltante sí.
- Auto-atestar el canary o inferir su éxito. Prohibido por diseño.
- El fix del encoder de Veo — es `ISSUE-140`.
- Reconciliar las 10 promociones históricas ya revertidas.

## Detailed Spec

El canary extendido conserva las reglas del canary actual: una sola `idempotencyKey` por command
facturable, readback-first ante timeout, y **nunca** reintentar un command que gasta. La aprobación de
gasto sigue siendo explícita por invocación.

La señal de ventana no debe convertirse en un segundo scheduler: sólo observa y alerta. Quien revierte
sigue siendo el recovery.

## Rollout Plan & Risk Matrix

| Riesgo | Mitigación |
|---|---|
| El canary extendido se vuelve un carril paralelo al spine | Usa exclusivamente commands canónicos; se prueba contra `/v1/capabilities`, no contra el dominio |
| La señal genera ruido en promociones sanas | Sólo alerta sobre `activated` cerca de su deadline, que es el único estado que muere solo |
| Revertir readiness introduce una segunda definición de "converger" | Reusa el primitive del camino hacia adelante, igual que `RunFinalizerPort.abandon` |

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El canary canónico puede ejercitar una ruta arbitraria por su identidad exacta, incluidas las que
      exigen referencias, sin escribir la secuencia a mano.
- [ ] Una promoción `activated` próxima a expirar emite señal observable, con alerta.
- [ ] Los agregados dependientes de la saga están declarados en un array enumerable, con test en ambas
      direcciones; un `observable` sin señal se rechaza.
- [ ] Un rollback deja readiness convergido o su divergencia contada y observable.
- [ ] `canary-confirm` nunca responde `internal_error`: cada causa de no-resolución tiene razón nombrada, y un
      fallo deja la saga en un estado desde el que se puede reintentar.
- [ ] Una reserva de un run muerto **antes del gasto** converge por el camino terminal, sin esperar el TTL de 24 h;
      la postura `observable` se conserva para el caso post-gasto.
- [ ] Runbook publicado con el canary como paso explícito.
- [ ] Una promoción completa end-to-end llega a `canary_passed` sin intervención artesanal.

## Verification

- `pnpm check && pnpm build` en `efeonce-globe`, con el test nuevo **registrado en el script `test`** de
  su package (el repo enumera los archivos a mano; un test no registrado nunca corre).
- Prueba en runtime sobre una promoción real que alcance `canary_passed`.
- Readback de los tres agregados tras un rollback provocado.

## Closing Protocol

- Actualizar `GLOBE_RUNTIME_HANDOFF.md` y el ledger de flota.
- Cierre documental por `greenhouse-documentation-governor`.
- Mover a `complete/` sólo con evidencia de runtime, no con tests verdes.

## Follow-ups

- `ISSUE-140` — encoder de Veo; desbloquea la verificación de D12 de `ISSUE-138`.
- `TASK-1637` — deadlines por etapa de los runs gobernados; misma familia de "declarar el atasco", otra
  saga.

# TASK-1641 — Globe: canary post-promoción operable y convergencia terminal de la saga

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

## Delta 2026-08-04 (cierre de sesión) — el sello FUNCIONA; Omni sellada, Veo a un paso

`efeonce-globe@38c528d`, desplegado y verificado por revisión y digest: API `globe-api-internal-00211-8sp`
(imagen tag `38c528d27b9a`) y Job `globe-producer-worker` (`sha256:14b80d2f…`, mismo tag). Migración `0050`
aplicada por el workflow keyless (run `30953709590`).

**Prueba de salida parcial:** `ref/motion/reference-v1` (Omni) → **`canary_passed`**, binding `enabled=true`,
circuito `closed`, canary `74ea0dec-27c5-4d11-94d6-e0d459cfd61e` con output retenido y governance `eligible`.
Es el mismo command que devolvía `internal_error` 500 con la evidencia perfecta.

### La migración committeada no arreglaba nada, y no se veía leyéndola

Medido contra PG real dentro de una transacción con ROLLBACK, **antes** de aplicar. Dos defectos, ambos fatales:

1. **`CREATE OR REPLACE VIEW` no puede reordenar ni renombrar columnas** — sólo agregar al final conservando
   nombre, tipo y posición. La vista vieja es `(workspace_id, asset_id, authority)` y la nueva pone `source_kind`
   tercero, así que PostgreSQL aborta con **`42P16`**. Va `DROP` + `CREATE`, sin `CASCADE` a propósito (si mañana
   alguien construye encima, el DROP debe fallar en vez de arrastrarla). Verificado: la vista no tiene
   dependientes; el DROP pierde los GRANT, así que se re-otorgan explícitos y el bloque `DO` verifica columnas
   **y** accesos.
2. **El runner de Globe no parsea markers**: `migrate.ts` hace `tx.query(sql)` con el archivo completo, así que la
   sección `-- Down Migration` se ejecutaba y **re-creaba la vista rota tres líneas después de arreglarla**,
   quedando registrada como aplicada y con el canary fallando igual. Esa convención es de `node-pg-migrate`
   (Greenhouse); en Globe el rollback de un forward-fix es otra migración forward. `0050` era el **único**
   archivo del repo con esa sección.

La vista proyecta hoy **16 columnas**, incluida `rights_policy_purpose` de `0049`: dejar afuera la más nueva de
la tabla reintroduce el mismo defecto una columna después.

### Lo demás que entró

- **Checkpoint reordenado.** `resolveCanary` es una lectura pura; el checkpoint delante no protegía nada y
  consumía el único estado desde el que se puede reintentar. Ahora se lee primero, y la ventana sin retorno es un
  único write. Test en ambos modos de fallo (excepción y evidencia ausente), probado en rojo con el orden viejo.
- **`DatabaseError` deja de ser un 500 opaco.** Infraestructura (`08/40/53/55/57`) → `dependency_unavailable`; las
  deterministas (`42703`, `23505`, …) siguen en `internal_error`, que es la verdad — prometer reintento sobre un
  defecto de código manda a reintentar para siempre. Detección por forma (`severity` + SQLSTATE), sin acoplar el
  transporte al driver, y última para no ganarle nunca a un código nombrado. Todo error de Postgres deja su
  SQLSTATE en `globe.dispatch.database_error`: mapear no puede costar la observación.
- **Cobertura del path**, en dos eslabones: `consumidor ⊆ contrato declarado` (sin base, en cada `pnpm check`) y
  `contrato ⊆ vista real` (bloque `DO`, en cada apply), más un test en vivo opt-in que ejecuta la query real —
  falló con `42703` antes de migrar y pasa después. Barre **todo** el árbol de fuentes y exige que cada consumidor
  **aliase** la vista: sin alias una referencia no es atribuible. El propio ejercicio en rojo destapó que el
  detector aceptaba `WHERE` como alias, o sea cubría cero.

### Veo: SELLADA — canary producido por el carril gobernado

`promotion_ddd0977c-c6e7-4fa6-bd31-61737c108d31` quedó en **`canary_passed`** (revisión 9), binding `enabled`
revisión 11 y circuito `closed` revisión 11. Canary: run `d2788195-3b13-4e33-b4fd-46e91638adc6`, attempt
`68a75b70-91dc-4a7e-bd65-0d63dd0942f5`, output `sha256:3a49d5ba1fdfdcc94973ecaf85d8e61d8cea710540e9a694e769e62e3ef17f4b`,
governance `eligible`; run creado 22:45:11Z, posterior a la activación de 22:03:02Z como exige `resolveCanary`.
Economía exacta: 32 créditos reservados = 32 gastados. Sello por `globe-operator-lane.yml` run `30958027741`.

Se produjo por el **carril gobernado** —`globe.lab.experiment.estimate` → `prepare` → `execute` sobre el
transporte de `scripts/producer-ui-canary-lib.mjs`—, con forma 720p / 8 s / 16:9 / `silent` /
`inputMode {kind:'frames', hasEndFrame:false}` y, como primer cuadro, el output ya gobernado
`output:8a5e24ec-0a92-4d9d-b9c8-5d52a37e5e5b:0` declarado en `authorizedInputs`.

**Re-leído en runtime (2026-08-04, 23:09Z) por el reader canónico**, no por el doc: `globe-operator-lane.yml`
`mode=get` `lane=routing` run `30959001009` devuelve `state=canary_passed`, revisión 9, `bindingEnabled=true`
revisión 11, `circuitState=closed` revisión 11, `governanceState=eligible` (revisión 17864), con el mismo run,
attempt y `sha256` del sello. **El `deadlineAt` de `2026-08-05T01:03:02Z` sigue en el agregado y es inerte**: los
cinco barridos de expiración de `production-promotion-operation-store.ts` filtran
`state NOT IN ('canary_passed','rolled_back')`, así que el plazo no puede cobrarse sobre una promoción sellada.
Se verifica porque «terminal» leído en un doc y «terminal» aplicado por el barrido son afirmaciones distintas.

🔴 **Lo que este sello NO prueba, y hay que decirlo:** el canary **no salió de la UI del Producer**, y la UI
sigue sin poder producirlo. Por lo tanto **el Scope 1 de esta task sigue abierto** —no existe todavía un canary
de ruta arbitraria canónico, committeado y testeado— y la generación desde el Producer para rutas con entrada
obligatoria sigue cerrada.

### 🔴 Los dos defectos de entrada de referencia, ajenos a esta task

⏱️ **Leer con su fecha: esto describe el estado de las 22:03Z, ANTES del sello de las 22:53Z.** Cuando se escribió,
`promotion_ddd0977c-c6e7-4fa6-bd31-61737c108d31` estaba **`activated`** (ventana hasta `2026-08-05T01:03:02Z`) sin
canary, y hacía falta uno **nuevo** porque `resolveCanary` exige `created_at >= activatedAt` —la corrida `f0e8b876`
de las 20:20 no servía—. Esa promoción **ya está `canary_passed`** (ver arriba): el canary se produjo por el carril
gobernado, sin pasar por la UI. **Lo que sigue vigente de esta sección son los dos defectos de entrada**, que son
los que mantienen cerrada la generación desde el Producer.

La ruta pide 1-2 referencias de imagen y **los dos caminos de entrada están rotos hoy**:

1. **«Usar como referencia» no despacha nada.** Cero `POST /v1/commands`, cero consola, contador en `0 / 2`.
   Probado por coordenada con hover previo, por `ref` del árbol de accesibilidad y por `.click()` en la propia
   página. **No es el overlay ni pointer-events**: «Añadir a favoritos», en la misma tarjeta y el mismo overlay,
   **sí** registra, y toda la cadena de padres computa `pointer-events: auto`. «Recrear» tampoco carga la receta
   en el composer. Es la familia ya documentada de «la capability existe y la UI no la consume».
2. **La subida ingesta, pero Asset Governance falla.** Dos ingests consecutivos murieron en la etapa
   **`inspecting`** —la primera— con `dependency_unavailable` tras 5 intentos
   (`asset_f861b971-4a6b-44eb-afc0-95623718131b`, `asset_86670e74-c71f-498a-9727-92d2f9a60461`). No es
   transitorio. Un private-ingest anterior (2026-07-31) sí llegó a `eligible`, así que algo cambió.

   **Y la causa está enmascarada, tercera aparición de ISSUE-127 en el día.**
   `packages/domain/src/asset-governance-jobs.ts` colapsa todo error que no sea `AssetGovernanceDependencyError`
   en `dependency_unavailable`, y su `SAFE_DEPENDENCY_CODES` contiene **sólo los cuatro códigos de C2PA**. Los
   nombres de ClamAV y de inspección que `engines.ts` **ya emite correctamente** —`clamav_signature_update_failed`,
   `clamav_signature_stale`, `clamav_unavailable`, `clamav_scan_failed`, `clamav_scan_invalid`,
   `clamav_signature_missing`— se destruyen en la frontera. Sospechoso concreto en los logs del Job, en cada
   corrida: `ERROR: NotifyClamd: Can't find or parse configuration file /etc/clamav/clamd.conf` (freshclam puede
   salir con código distinto de 0 por eso, y `engines.ts:47` sólo perdona la salida que matchea `/up[- ]to[- ]date/i`).

⚠️ **Límite de honestidad declarado:** el ingest se disparó desde el browser con un `File` **sintético**
(canvas → `DataTransfer` → `input.files` → evento `change`), porque el tool de subida rechaza rutas fuera de la
sesión. **No está descartado que ese camino haya omitido un paso real del flujo de subida** —por ejemplo el PUT
de los bytes a GCS, lo que explicaría un `describe` en 404 dentro de `inspecting`—, así que **antes de declarar
defecto de plataforma hay que reproducirlo con una subida real por el selector de archivos**. Lo que **sí** queda
verificado con independencia de eso es el enmascaramiento de la causa.

Ambos defectos son ajenos a esta task —no son la saga de promoción ni el canary— y quedaron con su propio chip.

Y refuerza el Scope 1 de esta task: mientras `ref/video/frames-v1` siga `executionReady: false` con
`pending: governed_source_and_route_specific_controls`, no existe camino canónico para producir el canary de una
ruta arbitraria, y el procedimiento depende de que la UI coopere.

## Delta 2026-08-04 — causa raíz del sello ENCONTRADA y migración escrita (no aplicada)

El punto 4 del scope dejó de ser diagnóstico: **el `canary-confirm` falla por una consulta que nunca pudo
parsear.**

`packages/database/src/stores/promotion-canary-authority.ts:52-60` hace JOIN contra la vista
`generated_asset_rights_authority_effective` usando `ra.run_id`, `ra.attempt_id`, `ra.route_id`,
`ra.provider_id`, `ra.model_id` y `ra.model_version`. Esa vista, creada en la migración `0048`, **proyecta
sólo `workspace_id`, `asset_id` y `authority`**. El commit `2e3b6a8` (2026-08-02) cambió una línea
—tabla → vista— y dejó el `ON`/`WHERE` intactos.

PostgreSQL falla en **planificación** con `42703`, sin importar los datos: por eso el sello revienta con la
evidencia perfecta. El `DatabaseError` de `pg` no está en el allowlist de `handlerErrorToApiCode`
(`apps/studio-web/src/dispatch.ts:350-441`), así que sale como **`internal_error` 500** — `ISSUE-127` otra vez.

**Cobertura cero:** el único test del path stubea `resolveCanary` con un fake
(`production-promotion-operation.test.ts:100`); no existe test de la SQL real contra PG.

### Migración `0050` escrita — NO aplicada

`packages/database/migrations/0050_generated_asset_rights_authority_effective_lineage.sql` reemplaza el
`UNION ALL` por un `LEFT JOIN` sobre la PK compartida, proyectando **todas** las columnas de la tabla base y
sobreescribiendo sólo `authority` cuando hay corrección. Incluye un `DO` block que aborta si la vista vuelve
a recortarse.

Razón de dominio, no sólo de compilación: **una corrección corrige los DERECHOS, no el origen.**
`generated_asset_rights_authority_corrections` no tiene columnas de linaje y tiene FK a la base — el linaje
es invariante por construcción, y el `UNION ALL` lo perdía en la rama corregida por accidente.

### 🔴 Daño colateral que hay que arreglar en el mismo trabajo

`confirmProductionPromotionCanary` (`production-promotion-operation.ts:287-300`) **no tiene try/catch** —a
diferencia de `recoverProductionPromotion` y `executeRollback`—, así que el throw escapa **después** del
checkpoint `activated → verifying_canary`, y de `verifying_canary` la única salida es rollback. **Cada
reintento del comando quema una promoción.** Arreglar sólo la vista deja esta trampa viva para el próximo
fallo.

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

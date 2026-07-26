# ISSUE-126 — La reconciliación de tenancy Greenhouse→Globe lleva 2 días fallando cada 5 minutos, con su scheduler en verde

## Ambiente

production — `ops-worker` (Cloud Run, `efeonce-group`) → Globe API (`globe-api-internal`, `efeonce-globe`), workspace `greenhouse-org:efeonce`.

## Detectado

2026-07-26, mientras se diagnosticaba por qué el canary de generación de Globe se detenía antes de `prepare`. **No fue reportado por ninguna señal**: se encontró siguiendo el rastro de una hipótesis ajena que resultó incompleta.

## Síntoma

La proyección de tenancy de Globe está congelada: `brokerExpiresAt = 2026-07-24T13:17:00Z`, o sea **~2 días stale**. `getEffectiveAccess` responde `denied(..., 'projection-stale')` para cualquier identidad humana del workspace.

Lo que hace al síntoma engañoso: el Cloud Scheduler job **`ops-globe-tenancy-reconcile` aparece `ENABLED`** con su cadencia intacta (`*/5 * * * *`), así que a simple vista la reconciliación "está corriendo". Está corriendo — y fallando **todas las veces**, desde hace dos días.

```
gcloud scheduler jobs describe ops-globe-tenancy-reconcile --location us-east4 --project efeonce-group
→ ENABLED  */5 * * * *  lastAttemptTime=2026-07-26T10:35:19Z  status.code=13   # 13 = INTERNAL
```

```
[ops-worker] /<globe-tenancy-reconcile> failed — 10ms: globe_tenancy_capability_invalid
```

## Causa raíz

**Drift de contenido en una dependencia `file:` vendorizada, sin cambio de versión que lo delate.**

Greenhouse consume el vocabulario de capabilities de Globe como tarball vendorizado:

```
package.json:309  "@efeonce-globe/contracts": "file:vendor/efeonce-globe/efeonce-globe-contracts-0.0.1.tgz"
```

- Ese tarball instalado expone **51** capabilities.
- El source vivo de Globe expone **65**.
- Entre las 14 que faltan están **`globe.model-rights.attest`** y **`globe.model-rights.read`**.

La cadena, y encaja al minuto:

1. **2026-07-24** — el paso 3 del rollout zero-downtime de **ADR-010 / TASK-1535** movió `globe.model-rights.attest` y `.read` a `capabilityScopes` del cliente OAuth `globe`, o sea a `greenhouse_core.sister_platform_oauth_clients.policy_json`.
2. El reconciliador de Greenhouse (`src/lib/globe/tenancy-reconciler.ts`) deriva `desiredCapabilities` **de esa misma fila** (`policy.capabilities`, línea 216) y valida cada string con `normalizeCapability`, que compara contra `KNOWN_GLOBE_CAPABILITIES` — construido desde el **tarball instalado**.
3. Capability desconocida ⇒ `throw new Error('globe_tenancy_capability_invalid')` (línea 352). **Falla la reconciliación completa del workspace**, no la capability suelta.
4. `brokerExpiresAt` deja de refrescarse ⇒ la proyección queda `projection-stale`.
5. El job sigue disparando cada 5 minutos y fallando, con estado `ENABLED`.

**El fail-loud es correcto** — un broker no debe inventar capabilities. Lo incorrecto es el **acoplamiento**: una ampliación de scopes **de un lado** rompe la reconciliación **del otro**, y el tarball `file:` pinneado en `0.0.1` **cambió de contenido sin cambiar de versión**, así que nada señala que está stale. Es la peor forma de una dependencia local: el lockfile ve la misma versión y el drift es invisible.

Es **la misma clase de bug que ADR-010 documentó, en el eje opuesto**. ADR-010 registró el acoplamiento broker↔cliente-de-Globe (agregar un scope de un lado tumbó todo el login). Este es broker↔reconciliador-de-Greenhouse. Raíz común: **dos repos fijan el vocabulario de capabilities y una adición unilateral rompe al otro.**

## Impacto

- **Hoy:** la proyección de tenancy está stale. Con `GLOBE_TENANCY_MODE = shadow` (valor vivo verificado) la proyección **observa y no niega**, así que el Producer no está caído — pero toda derivación de acceso humano que consulte `getEffectiveAccess` responde `projection-stale`, y el modo shadow perdió su función: lo que observa es basura de hace dos días.
- 🔴 **El impacto que importa es el futuro, y es un gate duro para `TASK-1566`:** en `enforced` una proyección stale **deniega todo**. Flipear `tenancy_mode = enforced` con el reconciliador roto **es un outage de todo el acceso humano a Globe**. `TASK-1511` (la promoción a `enforced`) y el Slice G de **ADR-015** (capabilities por usuario) quedan bloqueados por este issue, no sólo por su propio gate.
- **Ceguera operativa:** un cron async-crítico falló ~576 veces sin una sola alerta. No existe señal de reliability que vigile la frescura de la proyección.

## Solución

1. **Re-vendorizar** `@efeonce-globe/contracts` desde el source vigente de Globe, `pnpm install`, y redeploy del `ops-worker` (es donde corre el reconciliador — **no** en Vercel). Correr `pnpm worker:build-contract-gate`, que existe exactamente para validar dependencias `file:`.
2. **Señal de reliability nueva** — frescura de la proyección de tenancy (steady = 0 workspaces con `brokerExpiresAt` vencido). Sin esto el próximo drift vuelve a durar días.
3. **Cerrar el acoplamiento de raíz.** El fail-loud se conserva, pero una capability desconocida no puede tumbar la reconciliación **completa del workspace**: o se degrada por-capability con evidencia observable, o el reconciliador valida el policy **antes** de empezar y reporta el drift como señal en vez de como excepción. Decidir con `arch-architect`.
4. **Regla de ordenamiento** para cualquier ampliación futura de `capabilityScopes`: **bumpear el vocabulario vendorizado en Greenhouse ANTES** de mover el scope en el broker. ADR-010 ya definió el rollout de 3 pasos para el eje cliente-de-Globe; este issue agrega el paso que falta para el eje reconciliador.

## Delta 2026-07-26 — aplicado, más el hallazgo que hace al drift invisible

**Aplicado** (commit `f7a38718d`, empujado a `develop`, deploy del `ops-worker` disparado por el push porque el workflow observa `vendor/**` y `pnpm-lock.yaml`):

1. **Re-vendorizado** el tarball desde el source vigente de Globe: 51 → **65** capabilities, con `globe.model-rights.attest` y `.read` presentes. `pnpm worker:build-contract-gate` verde (2 deps `file:` coincidiendo con el lockfile). `local:check` exit 0.
2. **Guard nuevo** — `src/lib/sister-platforms/globe-capability-vocabulary.test.ts`: afirma que **cada capability que el grant OAuth declara existe en el vocabulario vendorizado**, que es el par exacto que se desincronizó. Corre **sin el repo hermano** (compara la política de Greenhouse contra lo que Greenhouse realmente tiene instalado) y falla en `pnpm test`, en el commit que introduce el problema, en vez de romper un cron async dos días después.
   **Probado en ROJO, no sólo en verde:** simulando el vocabulario pre-fix reporta las dos capabilities faltantes — habría atrapado el rollout de ADR-010 en su propio commit. Un guard que nunca se vio fallar no está probado.

### 🔴 El hallazgo que explica por qué el drift fue INVISIBLE, y que hay que conocer al arreglar el próximo

**pnpm resuelve un `file:` por NOMBRE DE ARCHIVO.** Con el tarball nuevo ya copiado en su lugar, `pnpm install` **seguía sirviendo 51**; recién tras `rm -rf node_modules/@efeonce-globe/contracts` pasó a 65. Verificado en vivo, no razonado.

Consecuencias, y la segunda es la peligrosa:

- Un re-vendorizado **correcto** puede ser **silenciosamente inefectivo**: quien lo hace verifica en local, ve el comportamiento viejo y concluye que su fix no sirvió.
- En **CI no hay cache**, así que se extrae el tarball actual ⇒ **local y CI divergen**. Es la forma más difícil de diagnosticar de este bug: cada lado tiene razón sobre lo que ve.

Por eso la versión del tarball **no** es cosmética: es load-bearing para la resolución de pnpm. **Bumpear la versión sería el fix correcto**, pero hoy está bloqueado porque `@efeonce-globe/sdk` declara `peerDependencies: { "@efeonce-globe/contracts": "0.0.1" }` **exacto** — subir contracts arrastra al SDK. Queda como follow-up con su costo declarado: bumpear ambos y ensanchar ese rango exacto, que es brittle por sí mismo.

### Lo que sigue abierto (por eso el issue NO se cierra)

- **Señal de reliability de frescura de la proyección** (steady = 0 workspaces con `brokerExpiresAt` vencido). Es la ausencia que permitió los dos días. Debe verificarse **disparando** con un drift inyectado.
- **Degradación por-capability**: una capability desconocida no puede tumbar la reconciliación **completa del workspace**. El fail-loud se conserva; lo que cambia es el radio. Decidir con `arch-architect`.
- **Bump de versión del tarball** + ensanche del peer del SDK (arriba).
- **Verificación runtime post-deploy** (abajo).

## Verificación

- `pnpm worker:build-contract-gate` verde y el tarball coincidiendo con el source de Globe.
- El job `ops-globe-tenancy-reconcile` con `status.code` ausente (éxito) en dos corridas consecutivas.
- `brokerExpiresAt` del workspace refrescándose dentro de la ventana de 5 minutos.
- `getEffectiveAccess` dejando de responder `projection-stale`.
- La señal nueva en steady 0, y **verificada disparando** con un drift inyectado a propósito — una señal que nunca se vio en rojo no está probada.

## Estado

open

## Relacionado

`TASK-1566` + **ADR-015** (`EFEONCE_GLOBE_GREENHOUSE_ADMINISTRATION_DECISION_V1.md`, Slice G queda bloqueado por este issue); `TASK-1511` (promoción a `enforced` — **no flipear hasta cerrar esto**); **ADR-010** / `TASK-1535` (el rollout que disparó el drift, y el precedente del mismo acoplamiento en el otro eje); ADR-006 (`EFEONCE_GLOBE_PERSISTED_TENANCY_PROJECTION_DECISION_V1.md`); `GREENHOUSE_WORKER_BUILD_CONTRACT_V1.md` (el contrato de dependencias `file:`); `src/lib/globe/tenancy-reconciler.ts:216,352`; `packages/database/src/stores/tenancy-store.ts:62`.

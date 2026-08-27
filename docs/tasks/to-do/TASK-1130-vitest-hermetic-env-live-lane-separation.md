# TASK-1130 — Vitest hermetic env baseline + live-lane separation

## Delta 2026-08-24 — rescope con evidencia re-medida (la task sigue viva, con la mitad cerrada)

**Medición de hoy, no de junio.** El diagnóstico original (2026-06-15) reportaba **19 fallos en 8
archivos**. Re-medido hoy con `set -a && source .env.local && set +a && pnpm test`: **23 fallos en
17 archivos**. Creció porque nacieron tests nuevos que asumen entorno limpio — que es exactamente el
argumento de esta task: **la fragilidad no se estabiliza sola, se acumula**.

### Lo que SÍ quedó cerrado (fuera de esta task, commit `c28e8bead`)

- **Carril live separado.** `vitest.config.ts` define dos proyectos: `unit` (paralelo, excluye
  `**/*.live.test.ts`) y `live` (`fileParallelism: false`). Los live corren serializados entre sí.
- **`pnpm test:live`** (`scripts/test-live.mjs`): pasa **sólo acceso a base**
  (`GREENHOUSE_POSTGRES_*` + `GCP_PROJECT`/`GOOGLE_CLOUD_PROJECT`/`GOOGLE_APPLICATION_CREDENTIALS`),
  con guarda anti-erosión que rechaza `*_ENABLED`/`*_RUN_MODE`, y preflight TCP del Cloud SQL Proxy.
- **El contrato quedó documentado** en `docs/architecture/agent-invariants/LIVE_TESTS_AGENT_INVARIANTS.md`,
  con auto-carga por path (`.claude/rules/live-tests.md`), y la regla dura en `AGENTS.md`.
- **Fixtures aislados por scope** (`resolveLiveTestCandidateFixture`), que cerró la causa por la que
  tres archivos de `assignment-policy` se pisaban.

**El diseño que quedó NO es el que esta task proponía**, y la diferencia importa para el alcance que
sigue: no hay `GREENHOUSE_TEST_LIVE=1` ni scrub en `src/test/setup.ts`. En vez de **limpiar el
entorno después de contaminarlo**, el runner **no lo contamina**. Eso resuelve *cómo corre un
agente los live tests*; **no** resuelve la hermeticidad de `pnpm test`, que es el corazón de la task.

### La premisa cambió, y a favor

`source .env.local && pnpm test` dejó de ser «el flujo normal del dev para correr los live tests» y
pasó a ser un **anti-patrón explícito y documentado**. Eso baja la probabilidad del daño, pero **no
lo elimina**: `pnpm test` sigue produciendo un resultado distinto según el shell, y esa es
precisamente la propiedad que esta task existe para matar. Un contrato documentado que depende de
que nadie se equivoque no es una garantía: es una expectativa.

### Evidencia fresca — los 23 fallos, 4 categorías

Reproducido 2026-08-24 con `set -a && source .env.local && set +a && pnpm test`
(baseline limpio: `pnpm test` sin env = **1590 archivos / 12.051 tests / 0 fallos**).

**Categoría A — fuga de entorno en tests unitarios (8 archivos). El scrub los resuelve.**

| Archivo | Causa raíz exacta, verificada |
|---|---|
| `src/emails/EmailTemplateBaseline.test.tsx` (4) | **CLASIFICADO — era el «pendiente de clasificar» desde junio.** Es fuga, no drift de snapshot. El diff es **un solo token**: el snapshot dice `…-greenhouse-public-media-prod` y con `.env.local` renderiza `…-dev`. Lo causan `GREENHOUSE_MEDIA_BUCKET` / `GREENHOUSE_PUBLIC_MEDIA_BUCKET`, ambas `…-dev` en el archivo local. **Slice 0 queda cerrado por este hallazgo.** |
| `src/lib/secrets/secret-manager.test.ts` | env var presente → `resolveSecret` retorna `'env'` en vez de `'unconfigured'` (incluye los casos TASK-870 de shape regex). |
| `src/lib/cloud/postgres.test.ts` | `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` presente → connector «activo» → falta el risk esperado. |
| `src/lib/cloud/vercel-billing.test.ts` | **NUEVO desde junio.** «returns not_configured without calling Vercel when token or team scope is missing» — el token real está presente. |
| `src/lib/cloud/github-billing.test.ts` | **NUEVO desde junio.** «keeps thresholds unconfigured when budget env vars are absent» — las vars de budget están presentes. |
| `src/lib/growth/ai-visibility/__tests__/brand-intelligence.test.ts` | **NUEVO desde junio.** «degrada honesto con flag OFF (default)» espera `null` y recibe un resultado real: el flag está ON en `.env.local`. |
| `src/lib/growth/forms/pii/__tests__/encryption.test.ts` | **NUEVO desde junio, y es el más grave de la categoría.** «sin key configurada → throw explícito (NUNCA degrada a sin-cifrado)» **resuelve en vez de rechazar**, porque la key está presente. Es un test de una garantía de seguridad, y el entorno lo silencia. |
| `src/lib/delivery/task-display.test.ts` (3) | Categoría C del diagnóstico viejo: `ECONNREFUSED 127.0.0.1:15432`. Gatea por presencia de `GREENHOUSE_POSTGRES_HOST` y confunde «env presente» con «DB alcanzable». **No es un `*.live.test.ts`**, así que el carril nuevo no lo cubre: sigue corriendo en `unit`. |

**Categoría B — drift real (2 archivos). El guard funcionando; NO lo arregla el scrub.**

| Archivo | Estado verificado 2026-08-24 |
|---|---|
| `src/lib/capabilities-registry/parity.live.test.ts` | **11 capabilities** en el catálogo TS sin fila en `greenhouse_core.capabilities_registry`: `commercial.quote.simulate`; 8 de `growth.ai_visibility.*` (`fix_it.generate`, `lead.open`, `lead_handoff.execute`, `report.publish`, `report.read`, `report.read_client`, `report.review`) + `growth.forms.lead_pii.reveal`; y 2 de `platform.public_site.*` (`bridge.inspect`, `comparison_table.author`). Junio reportaba **1**: el drift creció 11×. Las 2 de `hiring.opening.capacity.*` que faltaban se sembraron en `20260824010948152` (TASK-1762). |
| `src/lib/client-portal/data-sources/parity.live.test.ts` | **Drift inverso, no estaba en el diagnóstico de junio**: 3 `data_sources` sembrados en DB que el union TS no reconoce — `commercial.proposals`, `growth.ai_visibility`, `growth.seo`. Un portal cliente podría tener habilitado un módulo que el código no sabe resolver. Dueño: `TASK-824`. |

**Categoría D — precondición vencida (1 archivo). Nueva, y es otra clase.**

| Archivo | Causa |
|---|---|
| `src/lib/growth/meetings/__tests__/store.live.test.ts` | Afirma que la superficie de agendamiento **no está configurada** (`expect(pausedAuthority).toBeNull()`) y hoy **sí lo está**: devuelve `surfaceId: fhsf-efeonce-lead-gen-web`, `schedulerKey: discovery`, `fallbackUrl` de HubSpot y los dominios reales de `efeoncepro.com`. No se rompió nada: **alguien encendió el agendador, que era lo correcto, y el test seguía esperando el mundo anterior.** Es el patrón «el gate es el test de regresión del snapshot con que lo escribiste» — un cambio legítimo lo pone rojo, y la salida barata (editar el esperado) lo deja igual de frágil. Dueño: `TASK-1509`. |

**Categoría E — contención de recursos bajo `pnpm test` (5 archivos live de hiring).**

Con `.env.local` sourceado, `pnpm test` corre **los dos proyectos**: los ~1600 archivos unit y los 44
live a la vez. El proxy Cloud SQL no aguanta y los live mueren con `ECONNRESET`. Los **mismos
archivos pasan con `pnpm test:live`** (44 archivos, 3 fallos, todos de Categorías B y D). No es un
defecto de esos tests: es la consecuencia directa de que `pnpm test` no sea hermético — con el
entorno limpio, esos live tests **se saltarían solos** y el problema no existiría.

**Esto es lo que convierte el Slice 1 en la pieza que falta y no en una mejora opcional.**


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
- Epic: `none`
- Status real: `Rescopada 2026-08-24: Slices 0/2/5 cerrados por c28e8bead; el baseline hermetico (Slice 1) sigue intacto y con evidencia re-medida`
- Rank: `TBD`
- Domain: `platform|ops`
- Blocked by: `none`
- Branch: `task/TASK-1130-vitest-hermetic-env-live-lane-separation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

`pnpm test` no es hermético: su resultado depende del entorno del shell. Sin `.env.local` da **0 fallos**; con `.env.local` sourceado da **23 fallos en 17 archivos** (re-medido 2026-08-24; en junio eran 19 en 8 — crece con cada test nuevo que asume entorno limpio). La separación de carriles y el runner acotado ya están hechos (`c28e8bead`); lo que falta es el baseline hermético del carril `unit`, que es lo único que hace `pnpm test` determinista pase lo que pase en el shell. Atiende además el drift que los guards live destapan, hoy en dos direcciones.

## Why This Task Exists

Un suite de tests que se rompe porque el desarrollador tiene variables de entorno seteadas es frágil por diseño. Hoy:

- El dev DEBE sourcear `.env.local` para correr los `*.live.test.ts` (es como se verifican cosas como Account 360 contra PG real).
- Al hacerlo, el `process.env` real (secretos, config de Postgres, ADC de GCP) **gana sobre lo que cada unit test asume**, produciendo fallos que NO son del código bajo prueba.
- CI nunca tiene ese env, así que el problema es invisible en CI y solo golpea localmente — exactamente el tipo de fragilidad que erosiona la confianza en `pnpm test` como gate.

Esto se detectó al cerrar TASK-1106: el gate canónico (`pnpm test` sin sourcear `.env.local`) daba **6992 passed / 0 failed**, pero `source .env.local && pnpm test` daba 19 fallos ajenos. La causa NO era TASK-1106. El operador pidió resolverlo de forma estructural, no con parches.

## Goal

- `pnpm test` produce el mismo resultado con shell limpio o con `.env.local` sourceado. **Métrica dura: hoy 0 vs 23.**
- Los unit tests nunca dependen del entorno runtime ambiente (secretos, Postgres, GCP, flags de comportamiento).
- Los live tests **skipean limpio** en el carril default (no `ECONNREFUSED`, no `ECONNRESET`, no llamadas reales), en vez de correr y morir por contención con los ~1600 unit.
- El drift que destapan los guards live queda **abierto a su dueño** en las dos direcciones (TS→DB y DB→TS), no sembrado a ciegas desde acá.
- ✅ El modelo «unit hermético / live serializado» ya quedó documentado (`LIVE_TESTS_AGENT_INVARIANTS.md` + auto-carga por path); al cerrar Slice 1 se le agrega el mecanismo del scrub.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md` (causa raíz, no parche)
- `CLAUDE.md` → "Task Closing Quality Gate — full test + production build local" (por qué `pnpm test` debe ser confiable como gate)
- `CLAUDE.md` → "SQL Signal Reader Schema Validation Gate" (los live tests son guards reales; no deben perder su poder)
- `CLAUDE.md` → "Capability runtime grant invariant (TASK-873/935)" (gobernanza de `capabilities_registry` para Categoría B)

Reglas obligatorias:

- **No bajar cobertura disfrazando fallos.** Los live tests deben seguir fallando loud en su carril ante drift real. Prohibido cualquier `try/catch`/skip que esconda un fallo genuino.
- **No tocar la lógica de runtime** (`resolveSecret`, pool de Postgres, `nexa-service`, etc.). Esta task es de *aislamiento del entorno de test*, no de comportamiento de producción.
- **El scrub de entorno debe ser preciso y opt-out-able** para el carril live. Nunca borrar variables internas de Node/Vitest.
- **El carril live no debe correr en CI por accidente** (CI no tiene DB; debe seguir skipeando), ni `pnpm test` debe intentar conexiones reales.

## Normative Docs

- `vitest.config.ts` (config canónica de la suite)
- `src/test/setup.ts` (setupFiles único, punto de palanca global)
- `scripts/ci/vitest-with-log.sh` (cómo CI corre la suite + por qué propaga exit code real)
- `.github/workflows/ci.yml` (step `Test` → `pnpm test:results`; CI NO provee env de DB)

## Dependencies & Impact

### Depends on

- `vitest.config.ts`, `src/test/setup.ts`
- Patrón de gating live duplicado en ~20 archivos `*.live.test.ts` + algunos `*.test.ts` (`requiresLiveDb()` / `process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME || GREENHOUSE_POSTGRES_HOST`)

### Blocks / Impacts

- Confiabilidad de `pnpm test` como gate local para TODAS las tasks.
- Workflow de verificación live de cualquier agente (Account 360, knowledge, scim, capabilities, etc.).

### Files owned

- `vitest.config.ts`
- `src/test/setup.ts`
- `src/test/` (posible helper nuevo de gating/aislamiento, ej. `src/test/live-db.ts` o `src/test/env-isolation.ts`)
- `package.json` (script `test:live`)
- Los 8 archivos de test afectados (solo si la Categoría A no se resuelve 100% por el scrub global — ver Open Questions)
- `docs/` (doc del contrato de carriles) + posible migración de seed para Categoría B
- this task file

## Current Repo State

### Already exists

- `vitest.config.ts`: `setupFiles: ['src/test/setup.ts']`, sin carga de dotenv (vitest NO sourcea `.env.local` por sí mismo — la fuga viene del shell del dev).
- `src/test/setup.ts`: MSW + cleanup RTL + mock `server-only`/`react-pdf`. **No establece baseline de entorno.**
- `scripts/ci/vitest-with-log.sh`: corre `vitest run`, propaga exit code real (CI no tiene DB → live tests skipean → verde).
- ~20 archivos `*.live.test.ts` que gatean por presencia de env var de Postgres.

### Gap

- No hay baseline de entorno hermético para unit tests → fuga del `.env.local` real.
- El gate live confunde "env var presente" con "DB alcanzable" → `ECONNREFUSED` cuando el proxy no corre.
- No hay carril explícito `test:live` ni documentación del modelo.
- 1 capability en TS sin seed en DB (drift real destapado por el guard live).

### Diagnóstico verificado (2026-06-15) — los 19 fallos, 3 categorías

Reproducido con `set -a && source .env.local && set +a && pnpm test`:

**Categoría A — fuga de entorno en unit tests (11 fallos). El scrub global los resuelve.**

| Archivo | Fallos | Causa raíz exacta |
|---|---|---|
| `src/lib/resend.test.ts` | 2 | `RESEND_API_KEY` real (`re_…`) gana sobre el mock de Secret Manager; el test "unconfigured" recibe la key real. |
| `src/lib/secrets/secret-manager.test.ts` | 3 | env var presente → `resolveSecret` retorna `'env'` en vez de `'unconfigured'` (incluye los casos TASK-870 de shape regex). |
| `src/lib/cloud/postgres.test.ts` | 1 | `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` presente → connector "activo" → falta el risk esperado. |
| `src/lib/postgres/client.test.ts` | 1 | `GREENHOUSE_POSTGRES_MAX_CONNECTIONS=15` real pisa el sizing Vercel esperado (max=3). |
| `src/lib/nexa/nexa-service.test.ts` | 4 | con ADC/GCP env presente, el servicio llama a Vertex de verdad (`aiplatform.endpoints.predict denied` / `Model overloaded`) en vez del mock → assertions de éxito/fallback/prompt fallan. |

**Categoría B — drift real (1 fallo). NO es fuga de entorno; es el guard funcionando.**

| Archivo | Fallos | Causa raíz |
|---|---|---|
| `src/lib/capabilities-registry/parity.live.test.ts` | 1 | "capabilities in TS but missing in DB — add seed migration: expected [Array(1)] to deeply equal []". Hay 1 capability en el catálogo TS sin seed en `greenhouse_core.capabilities_registry`. Solo aparece corriendo contra DB. Pertenece a quien la agregó (probable task in-progress). |

**Categoría C — live tests sin DB alcanzable (3 fallos). El scrub (carril default) los hace skipear.**

| Archivo | Fallos | Causa raíz |
|---|---|---|
| `src/lib/delivery/task-display.test.ts` | 3 | `ECONNREFUSED 127.0.0.1:15432`: gatea por presencia de `GREENHOUSE_POSTGRES_HOST` (está en `.env.local`) pero el proxy no corre. Gate confunde "env presente" con "DB alcanzable". |

**Pendiente de clasificar:** `src/emails/EmailTemplateBaseline.test.tsx` (4). Sospecha: fuga de entorno (brand URL/fecha/locale) — confirmar el error real en Discovery antes de decidir si lo cubre el scrub o es un drift de snapshot aparte.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

> **Rescope 2026-08-24.** Los Slices 0 y 2 quedaron cerrados por `c28e8bead`; se conservan tachados
> para que nadie los rehaga ni los dé por pendientes. El corazón de la task —Slice 1— sigue intacto
> y hoy tiene más evidencia que cuando se escribió.

### ~~Slice 0 — Confirmar EmailTemplateBaseline + inventario del gating live~~ ✅ CERRADO 2026-08-24

`EmailTemplateBaseline` **es Categoría A (fuga de entorno)**, no drift de snapshot: el diff es un
solo token (`…-media-prod` esperado vs `…-media-dev` renderizado), causado por
`GREENHOUSE_MEDIA_BUCKET`/`GREENHOUSE_PUBLIC_MEDIA_BUCKET`. El scrub lo resuelve; **no** hay que
regenerar el snapshot. El inventario del gating live quedó cubierto por el carril `live` del
`vitest.config.ts`, que selecciona por nombre de archivo en vez de por predicado duplicado.

### Slice 1 — Hermetic env baseline (el corazón de la task, INTACTO)

Sigue siendo el único cambio que hace `pnpm test` **determinista pase lo que pase en el shell**. El
runner nuevo protege al agente que usa `pnpm test:live`; no protege al que sourcea `.env.local` y
corre `pnpm test`, que hoy obtiene 23 fallos ajenos.

- En `src/test/setup.ts`, scrubear del `process.env` la **clase** de variables runtime de Greenhouse
  antes de que corran los tests. Set mínimo verificado hoy contra los 8 archivos de Categoría A:
  - `GREENHOUSE_POSTGRES_*` (config DB + el gate que confunde «env presente» con «DB alcanzable»)
  - `GREENHOUSE_MEDIA_BUCKET`, `GREENHOUSE_PUBLIC_MEDIA_BUCKET` **(hallazgo nuevo: sin estas dos,
    `EmailTemplateBaseline` sigue rojo)**
  - secretos por patrón: `*_API_KEY`, `*_SECRET`, `*_SECRET_REF`, `*_TOKEN`, `*_PASSWORD`,
    `*_SIGNING_SECRET`, `*_CLIENT_SECRET`, `*_DSN`
  - flags de comportamiento: `*_ENABLED`, `*_RUN_MODE` **(hallazgo nuevo: son los que rompen
    `brand-intelligence` y la familia `HIRING_ASSESSMENT_AI_*`)**
  - GCP/Vertex/ADC: `GOOGLE_APPLICATION_CREDENTIALS`, `GOOGLE_CLOUD_PROJECT`, `GCP_PROJECT`,
    `GCLOUD_PROJECT`, `VERTEX_*`, `GREENHOUSE_IMAGE_PROVIDER`
  - `RESEND_*`, `VERCEL`
- **Cómo se selecciona el carril, ahora que `GREENHOUSE_TEST_LIVE` ya no existe:** el scrub aplica
  al proyecto `unit`. La forma canónica de expresarlo es un `setupFiles` propio del proyecto `unit`
  ⚠️ **con el detalle que ya costó una iteración: NO redeclarar el `setupFiles` heredado** —
  `extends: true` ya lo aplica, y duplicarlo hace que MSW reviente con «Invariant Violation».
  El proyecto `live` no scrubea nada; su hermeticidad la da `scripts/test-live.mjs`.
- El scrub corre ANTES de cargar los módulos de test y NO toca internals de Node/Vitest.
- Allowlist mínima documentada si emerge un caso legítimo.

**Criterio de aceptación duro y medible:** `pnpm test` y `set -a && source .env.local && set +a &&
pnpm test` producen **el mismo resultado**, y ese resultado es 0 fallos. Hoy: 0 vs 23.

### ~~Slice 2 — `vi.stubEnv` auto-restore + carril live~~ ✅ CERRADO EN PARTE

El carril live existe (`vitest.config.ts` + `pnpm test:live`). **Queda vivo un residuo pequeño:**
`test.unstubEnvs: true` + `test.unstubGlobals: true` no se aplicaron, y son la primitiva que hace
que `vi.stubEnv`/`vi.stubGlobal` se auto-restauren entre tests. Es complementario al scrub: el scrub
limpia el entorno **heredado**, esto limpia el **fabricado por un test que se olvidó de restaurar**.

### Slice 3 — Residual per-test (sólo si el scrub no cubre algún caso A)

Sin cambios. Si algún unit test sigue dependiendo de una var específica, que la declare con
`vi.stubEnv`. No debe ser la regla: el scrub global es la palanca.

### Slice 4 — Categoría B (drift), ampliado 11× y ahora con DOS direcciones

- **TS → DB (11 capabilities).** Junio reportaba 1. Cada una pertenece a la task que la agregó:
  `commercial.quote.simulate` (comercial), 8 de `growth.*`, 2 de `platform.public_site.*`. **No
  sembrarlas a ciegas desde acá**: el patrón TASK-873/935 exige registry + grant en `runtime.ts` en
  el mismo PR + `capability-grant-coverage.test`, y el grant correcto lo sabe su dueño. Lo que sí
  corresponde a esta task es **abrir el hallazgo a cada dueño** y dejar el guard rojo hasta entonces.
  Precedente ejecutable: `20260824010948152` (TASK-1762 sembró las suyas, con Down que **depreca**
  en vez de borrar, porque borrar dejaría huérfano cualquier grant que las citara).
- **DB → TS (3 data_sources), dirección nueva.** `commercial.proposals`, `growth.ai_visibility`,
  `growth.seo` están sembrados en DB y el union TS no los reconoce. Dueño: `TASK-824`. Es más
  peligroso que el inverso: un portal cliente puede tener habilitado un módulo que el código no
  resuelve.

### Slice 5 — Documentación del contrato ✅ CERRADO 2026-08-23

`LIVE_TESTS_AGENT_INVARIANTS.md` + `.claude/rules/live-tests.md` (auto-carga por path) + regla dura
en `AGENTS.md` + pointer en `project_context.md`. **`CLAUDE.md` quedó fuera por decisión registrada,
no por olvido**: estaba a 18 tokens de su gate de presupuesto (34.982/35.000). Al cerrar Slice 1,
actualizar el doc con el mecanismo del scrub.

### Slice 6 — Precondiciones vencidas (Categoría D) — NUEVO

`growth/meetings/__tests__/store.live.test.ts` afirma que una superficie de agendamiento no está
configurada, y hoy sí lo está con datos productivos reales. **No corresponde editar el valor
esperado**: eso deja el gate igual de frágil y lo volverá a romper el próximo cambio legítimo. La
corrección es **derivar la precondición del mismo estado que el motor lee**, o que el test fabrique
su propia superficie en vez de asumir la ausencia de una ajena. Dueño: `TASK-1509`; esta task lo
documenta y le abre el hallazgo.

## Out of Scope

- Cambiar la lógica de `resolveSecret`, del pool de Postgres, de `nexa-service` o cualquier runtime.
- Reescribir los ~20 `*.live.test.ts` (solo dedup oportunista del gate).
- Cambiar cómo CI corre la suite (CI ya es hermético por no tener env).

## Detailed Spec

Patrón de scrub recomendado (en `src/test/setup.ts`, top-level, antes de los hooks):

```ts
// Hermetic unit-test env: el carril default (pnpm test) NUNCA debe ver el entorno
// runtime real del shell (un dev sourcea .env.local para los live tests). El carril
// live (GREENHOUSE_TEST_LIVE=1, vía `pnpm test:live`) NO scrubea.
if (process.env.GREENHOUSE_TEST_LIVE !== '1') {
  const SECRET_SUFFIXES = ['_API_KEY','_SECRET','_SECRET_REF','_TOKEN','_PASSWORD','_SIGNING_SECRET','_CLIENT_SECRET','_DSN']
  const EXPLICIT = new Set(['RESEND_API_KEY','GOOGLE_APPLICATION_CREDENTIALS','GOOGLE_CLOUD_PROJECT','GCP_PROJECT','GCLOUD_PROJECT','GREENHOUSE_IMAGE_PROVIDER','VERCEL'])
  for (const key of Object.keys(process.env)) {
    if (
      key.startsWith('GREENHOUSE_POSTGRES_') ||
      key.startsWith('RESEND_') ||
      key.startsWith('VERTEX_') ||
      EXPLICIT.has(key) ||
      SECRET_SUFFIXES.some(s => key.endsWith(s))
    ) {
      delete process.env[key]
    }
  }
}
```

El agente DEBE validar el set exacto en Discovery (correr el suite hermético + el live lane) y ajustar el patrón con evidencia, no a ciegas.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 (clasificar) → Slice 1 (scrub) → Slice 2 (config + carril) → Slice 3 (residual) → Slice 4 (capability) → Slice 5 (docs).
- Slice 1 y Slice 2 se validan juntos: el scrub solo es seguro si el carril live (flag) puede correr los live tests sin scrub.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El scrub borra una var que un unit test legítimamente necesita | test suite | medium | correr suite completa hermética antes/después; allowlist mínima documentada; el test la declara con `vi.stubEnv` | nuevos fallos en `pnpm test` hermético |
| El carril live deja de correr (flag mal cableado) → se pierde el guard | reliability | medium | `pnpm test:live` con proxy verifica que los `*.live` corren (no skip); checklist en doc | live tests "all skipped" inesperado |
| Seed de capability mal hecho rompe gobernanza | identity / capabilities | low | seguir patrón TASK-873/935; mostrar migración al operador antes de aplicar; `capability-grant-coverage.test` | parity.live sigue rojo |
| El scrub no corre antes de un módulo que cachea env al import | test suite | low | setupFiles corre antes que test files; verificar con los casos A | fallo persiste tras scrub |

### Feature flags / cutover

- `GREENHOUSE_TEST_LIVE=1` (env var de test, no de producción) selecciona el carril live (sin scrub). Default ausente → carril hermético. Revert: es solo config de test, sin impacto productivo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1-3 | revert del cambio a `setup.ts`/`vitest.config.ts`/`package.json` | <5 min | sí |
| Slice 4 | down migration del seed (granted=FALSE, append-only) | <15 min | sí (parcial) |
| Slice 5 | revert doc | <5 min | sí |

### Production verification sequence

Cambio de tooling de test — no toca runtime productivo. Verificación:

1. `pnpm test` con shell LIMPIO → verde (baseline CI).
2. `set -a && source .env.local && set +a && pnpm test` → **mismo resultado** (verde, live tests skip).
3. `GREENHOUSE_TEST_LIVE=1` + proxy arriba + `.env.local` → `pnpm test:live` corre los `*.live` (no skip) y pasa (salvo Categoría B hasta seed).
4. CI verde (sin cambios de comportamiento allá).

### Out-of-band coordination required

- Categoría B: si el seed de capability toca gobernanza, mostrar la migración al operador antes de aplicar. Resto: repo-only.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `pnpm test` da el mismo resultado con shell limpio y con `.env.local` sourceado (0 fallos en ambos).
- [ ] Los 11 fallos de Categoría A no ocurren en el carril hermético.
- [ ] Los 3 fallos de Categoría C skipean limpio en el carril hermético (no `ECONNREFUSED`).
- [ ] `EmailTemplateBaseline` (4) clasificado y resuelto en el saco correcto.
- [ ] Existe `pnpm test:live` documentado que corre los `*.live.test.ts` (no skip) con proxy + env.
- [ ] La capability en drift (Categoría B) queda sembrada (con migración revisada) o documentada con su task dueña.
- [ ] El contrato "unit lane hermético / live lane opt-in" queda documentado.
- [ ] CI sigue verde sin cambios de comportamiento.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test` (shell limpio) y `source .env.local && pnpm test` (deben coincidir)
- `GREENHOUSE_TEST_LIVE=1 pnpm test:live` (con proxy)

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado
- [ ] el carril live verificado corriendo (no "all skipped") en al menos un `*.live`

## Follow-ups

- Dedup completo del predicado de gating live en los ~20 `*.live.test.ts` vía helper canónico (si Slice 2 solo migró el set fallido).

## Open Questions

- ¿Scrub global por patrón (lever único en `setup.ts`) vs `vi.stubEnv` per-test? Recomendación: scrub global como base (escalable, cubre secretos futuros) + `vi.stubEnv` solo para residuales. Confirmar en Discovery que ningún unit test legítimo dependía de una var ambiente.
- ¿La capability de Categoría B es un seed faltante real o la posee una task in-progress? Resolver en Slice 4 antes de sembrar.
- ¿`EmailTemplateBaseline` es fuga de entorno o drift de snapshot? Resolver en Slice 0.

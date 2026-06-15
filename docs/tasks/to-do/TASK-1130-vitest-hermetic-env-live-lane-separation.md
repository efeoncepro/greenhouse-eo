# TASK-1130 — Vitest hermetic env baseline + live-lane separation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|ops`
- Blocked by: `none`
- Branch: `task/TASK-1130-vitest-hermetic-env-live-lane-separation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

`pnpm test` no es hermético: su resultado depende del entorno del shell. En CI (sin `.env.local`) pasa; pero el flujo normal del dev para correr los live-DB tests (`source .env.local && pnpm test`) filtra el entorno runtime real al proceso y rompe **19 tests** en 8 archivos. Esta task hace `pnpm test` determinista pase lo que pase en el shell, separa los live-DB/cloud tests en un carril explícito opt-in, y atiende un drift real de capability que el guard live destapa.

## Why This Task Exists

Un suite de tests que se rompe porque el desarrollador tiene variables de entorno seteadas es frágil por diseño. Hoy:

- El dev DEBE sourcear `.env.local` para correr los `*.live.test.ts` (es como se verifican cosas como Account 360 contra PG real).
- Al hacerlo, el `process.env` real (secretos, config de Postgres, ADC de GCP) **gana sobre lo que cada unit test asume**, produciendo fallos que NO son del código bajo prueba.
- CI nunca tiene ese env, así que el problema es invisible en CI y solo golpea localmente — exactamente el tipo de fragilidad que erosiona la confianza en `pnpm test` como gate.

Esto se detectó al cerrar TASK-1106: el gate canónico (`pnpm test` sin sourcear `.env.local`) daba **6992 passed / 0 failed**, pero `source .env.local && pnpm test` daba 19 fallos ajenos. La causa NO era TASK-1106. El operador pidió resolverlo de forma estructural, no con parches.

## Goal

- `pnpm test` produce el mismo resultado con shell limpio o con `.env.local` sourceado (determinismo / hermeticidad).
- Los unit tests nunca dependen del entorno runtime ambiente (secretos, Postgres, GCP).
- Los live-DB/cloud tests corren en un carril explícito y documentado (opt-in), y **skipean limpio** (no `ECONNREFUSED`, no llamadas reales) cuando no se opta.
- El drift real de capability que destapa `capabilities-registry/parity.live` queda resuelto o documentado con dueño.
- El modelo "unit lane hermético / live lane opt-in" queda documentado para que no se reintroduzca la fragilidad.

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

### Slice 0 — Confirmar EmailTemplateBaseline + inventario del gating live

- Capturar el error real de `EmailTemplateBaseline.test.tsx` (4) → clasificar A (fuga) o drift de snapshot aparte.
- Enumerar los archivos que duplican el predicado de gating live (`requiresLiveDb` inline) para decidir si se canoniza un helper compartido.

### Slice 1 — Hermetic env baseline (carril default)

- En `src/test/setup.ts`: si `GREENHOUSE_TEST_LIVE !== '1'`, scrubear del `process.env` la **clase** de variables runtime de Greenhouse antes de que corran los tests:
  - `GREENHOUSE_POSTGRES_*` (config DB + gate live)
  - secretos por patrón: `*_API_KEY`, `*_SECRET`, `*_SECRET_REF`, `*_TOKEN`, `*_PASSWORD`, `*_SIGNING_SECRET`, `*_CLIENT_SECRET`, `*_DSN`
  - GCP/Vertex/ADC: `GOOGLE_APPLICATION_CREDENTIALS`, `GOOGLE_CLOUD_PROJECT`, `GCP_PROJECT`, `GCLOUD_PROJECT`, `VERTEX_*`, `GREENHOUSE_IMAGE_PROVIDER`
  - `RESEND_*`, `VERCEL` (cuando lo setea `.env`/`.env.production.local`, no cuando lo stubea un test)
- El scrub debe ejecutarse ANTES de cargar los módulos de test (setupFiles corre antes que los test files) y NO tocar internals de Node/Vitest.
- Mantener una allowlist mínima de "no scrubear" si emerge un caso legítimo (documentado).

### Slice 2 — `vi.stubEnv` auto-restore + carril live

- `vitest.config.ts`: `test.unstubEnvs: true` + `test.unstubGlobals: true` (primitiva hermética canónica; `vi.stubEnv`/`vi.stubGlobal` se auto-restauran entre tests).
- `package.json`: script `test:live` = `GREENHOUSE_TEST_LIVE=1 bash scripts/ci/vitest-with-log.sh` (o equivalente) — corre el carril live con el flag que desactiva el scrub. Documentar que requiere proxy arriba + `.env.local` sourceada.
- (Opcional, si Slice 0 lo justifica) helper canónico `src/test/live-db.ts` (`requiresLiveDb()`/`describeLiveDb`) que dedup el predicado y, además del env, considere el flag `GREENHOUSE_TEST_LIVE`. Migrar al menos los archivos del set fallido; el resto oportunista.

### Slice 3 — Residual per-test (solo si el scrub no cubre algún caso A)

- Si algún unit test sigue dependiendo de un var específico, convertirlo a `vi.stubEnv` explícito (declara su entorno). NO debe ser la regla — el scrub global es el lever principal.

### Slice 4 — Categoría B (capability drift)

- Identificar la capability en TS sin seed en DB (correr `parity.live` en carril live con DB).
- Si es seed faltante legítimo → migración de seed siguiendo el patrón TASK-827/873/935 (registry + grant en `runtime.ts` mismo PR + `capability-grant-coverage.test`). **Mostrar la migración al operador antes de aplicar** (gobernanza).
- Si la posee una task in-progress → documentar el hallazgo en esa task (Delta) y dejar el seed a su dueña.

### Slice 5 — Documentación del contrato

- Doc del modelo "unit lane hermético / live lane opt-in" (`docs/architecture/` o `docs/operations/`) + comentario load-bearing en `src/test/setup.ts`.
- Nota en `CLAUDE.md`/`AGENTS.md` si el contrato amerita invariante duro (cómo correr live tests: `pnpm test:live` con proxy).

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

# TASK-1411 — Shutterstock stock sourcing: buscar en Greenhouse, licenciar fuera (la frontera es el costo)

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
- Backend impact: `integration`
- Epic: `none` (la mitad de *licenciamiento* pertenece a `EPIC-028` — ver `Blocks / Impacts`)
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content|platform`
- Blocked by: `none`
- Branch: `task/TASK-1411-shutterstock-stock-sourcing-capability`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Shutterstock se usó **ad-hoc con `curl`** para la muestra AEO de SKY (TASK-1410). Esta task lo formaliza — y lo parte en dos, porque **no es una capability: son dos**, y solo una puede vivir en Greenhouse hoy.

**Buscar** (gratis, read-only, sin estado, sin derechos) nace en `src/lib/integrations/shutterstock/` con contrato gobernado: reader + capability + entitlement + ruta API. Full API Parity de verdad — UI, Nexa, MCP y agentes lo consumen igual.

**Licenciar** (gasta créditos reales, es irreversible, crea derechos y linaje) **NO va a Greenhouse**. Es, palabra por palabra, lo que `EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md` reclama como dominio propio. Hasta que exista el Studio, licenciar queda **out-of-band con gate humano** vía CLI (precedente: `pnpm ai:image`) + ledger append-only, declarado **temporal, con dueño y condición de retiro**.

## Why This Task Exists

**Un agente que busca y propone es útil y barato. Un agente que gasta plata solo no lo quieres.** La sesión del 2026-07-14 lo demostró sin querer: el guardrail dejó buscar libremente y **bloqueó dos veces** al licenciar. Esta task convierte esa frontera accidental en arquitectura.

Tres cosas la hacen urgente:

1. **Hay cuatro consumers esperando** (`efeonce-think` muestras, Content Factory blog WP, `artifact-composer`/`deck-studio`, `social-media-studio`) y hoy cada uno tendría que reinventar el `curl`. `CLAUDE.md` ya prohíbe exactamente eso para generación de imágenes ("**NUNCA** crear scripts de generación ad-hoc").

2. **Se cazaron tres bug classes reales que hoy no las atrapa nada**, y las tres son *silenciosas*:
   - `789778528` — buscada como "Carretera Austral", **era la Ruta 40 de ARGENTINA**. Sus keywords incluían `carretera` **y** `chile`. Así engaña una búsqueda por texto. Un artículo sobre la Carretera Austral ilustrado con una ruta argentina, ante un comité, te deja fuera.
   - `1846352116` — no era el río Baker sino el **lago General Carrera**. La caption habría mentido.
   - Una imagen `is_editorial: true` **no se puede usar comercialmente** — y nada lo verifica.

3. **El ADR de Media Foundry está `Superseded` desde 2026-07-11.** `src/lib/media/` ya **no** es el hogar. Sin esta task, el próximo agente lo reconstruye ahí y viola una decisión de tres días.

## Goal

- Que cualquier consumer (UI, Nexa, MCP, agente, CLI) **busque** stock por un contrato gobernado, no por `curl`.
- Que las tres bug classes de arriba sean **imposibles por construcción**, no vigiladas por code review.
- Que **ningún código de `src/lib/**` pueda gastar un crédito**, verificado por un test de frontera.
- Que el licenciamiento quede utilizable **hoy** (gate humano, out-of-band) sin construir en Greenhouse el ledger que `EPIC-028` va a construir igual.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md` ← **la frontera**
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` (patrón `capability ⇒ grant + coverage`, patrón `flag default-OFF`)

Reglas obligatorias:

- 🔴 **NUNCA** llamar `POST /v2/images/licenses` (ni ningún endpoint que consuma crédito) desde `src/lib/**`, `src/app/**` o cualquier runtime de Greenhouse. Gastar plata es dominio de Creative Studio (`EPIC-028`, ADR §3 `propose → reserve → approve → execute` y §5 assets/linaje/derechos/ledger append-only). El ADR **rechazó explícitamente** construirlo en Greenhouse: *"acopla media/worker/costo/asset storage a un producto ya pesado"*.
- 🔴 **NUNCA** reconstruir `src/lib/media/`. El ADR de Media Foundry está **`Superseded`** desde 2026-07-11: *"no autorizan implementar media en Greenhouse"*.
- 🔴 **NUNCA** usar un asset con `is_editorial: true` para uso comercial. El blog de una aerolínea es uso comercial.
- 🔴 **NUNCA** aceptar un asset por su **título**. Se verifica contra su **propio metadata** (keywords + description). El título es marketing del fotógrafo; las keywords son el dato.
- **SIEMPRE** resolver el secreto con `resolveSecret({ envVarName: '..._SECRET_REF' })` (`src/lib/secrets/secret-manager.ts`), server-only, nunca loggeado. Precedente exacto: `src/lib/ai/dataforseo.ts`.
- **SIEMPRE** seedear la capability nueva en `capabilities_registry` (migración) **en el mismo PR** que la agrega a `src/config/entitlements-catalog.ts`, **y** granteársela a ≥1 rol real de `src/config/role-codes.ts` en `src/lib/entitlements/runtime.ts`. El guard `src/lib/entitlements/capability-grant-coverage.test.ts` rompe el build si no.
- **SIEMPRE** registrar el flag nuevo en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR (`pnpm docs:closure-check` falla si falta).

## Normative Docs

- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md` — el ledger en archivo es un **workaround declarado**: temporal, reversible, con dueño y condición de retiro.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md` — `EPIC-027`: la task **no** crea `apps/*` ni `packages/*`.
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md` — el hogar futuro del licenciamiento.
- `docs/tasks/complete/TASK-1410-aeo-article-xray.md` — el primer consumer, y de dónde salen las tres bug classes.

## Dependencies & Impact

### Depends on

- `src/lib/secrets/secret-manager.ts` — `resolveSecret` (existe).
- `src/config/entitlements-catalog.ts` — `ENTITLEMENT_CAPABILITY_CATALOG` (existe).
- `src/lib/entitlements/runtime.ts` — los grants por rol (existe).
- Secretos **ya publicados** en Secret Manager (`efeonce-group`), escalar crudo verificado sin whitespace:
  - `greenhouse-shutterstock-consumer-key` (32 chars)
  - `greenhouse-shutterstock-consumer-secret` (16 chars)
  - `greenhouse-shutterstock-oauth-token` (391 chars, token `v2/` **no expirable**)
- 🔴 **Rotación pendiente**: los tres se pegaron en un chat el 2026-07-14. El token `v2/` **no caduca solo** — es el que urge. Ver `Out-of-band coordination required`.

### Blocks / Impacts

- **`EPIC-028` (Creative Studio)** — hereda el licenciamiento, el ledger de créditos y el registro de derechos. Esta task **le deja el terreno preparado y no le pisa el dominio**. El CLI + ledger-en-archivo de esta task son su **puente temporal**, y su condición de retiro es que el Studio exponga el contrato.
- **`efeonce-think`** (muestras AEO) — primer consumer. Hoy consume por CLI.
- **Content Factory** (blog WP), **`artifact-composer`/`deck-studio`**, **`social-media-studio`** — consumers del reader de búsqueda una vez que exista.

### Files owned

- `src/lib/integrations/shutterstock/client.ts` *(nuevo)*
- `src/lib/integrations/shutterstock/search.ts` *(nuevo)*
- `src/lib/integrations/shutterstock/provenance.ts` *(nuevo — el gate de las 3 bug classes)*
- `src/lib/integrations/shutterstock/types.ts` *(nuevo)*
- `src/lib/integrations/shutterstock/__tests__/` *(nuevo)*
- `src/lib/integrations/shutterstock/no-spend-boundary.test.ts` *(nuevo — el test de frontera)*
- `src/app/api/content/stock/search/route.ts` *(nuevo)*
- `src/config/entitlements-catalog.ts` *(modificado — capability nueva)*
- `src/lib/entitlements/runtime.ts` *(modificado — grant)*
- `migrations/<ts>_task-1411-stock-media-capability.sql` *(nuevo — seed en `capabilities_registry`)*
- `scripts/media/license-stock.ts` *(nuevo — CLI out-of-band, gate humano)*
- `docs/operations/stock-license-ledger.jsonl` *(nuevo — append-only, temporal)*
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` *(modificado)*
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md` *(modificado — Delta de frontera)*
- `docs/architecture/DECISIONS_INDEX.md` *(modificado)*
- `docs/documentation/content/stock-media-sourcing.md` *(nuevo)*
- `docs/manual-de-uso/plataforma/licenciar-imagenes-stock.md` *(nuevo)*

## Current Repo State

### Already exists

- `src/lib/integrations/` — la casa real de los adapters de terceros (`hubspot-greenhouse-service.ts`, `zapsign/`, `teams/`, `notion-*`, `mercado-publico/`).
- `src/lib/ai/dataforseo.ts` — **el precedente exacto**: adapter de tercero read-only, basic auth, secreto vía `resolveSecret({ envVarName: 'DATAFORSEO_API_PASSWORD' })`, error honesto si no está configurado.
- `scripts/ai/generate-image.ts` + `pnpm ai:image` — **el precedente out-of-band**: tooling creativo con gate humano, fuera del runtime.
- `src/lib/entitlements/capability-grant-coverage.test.ts` — el guard que rompe el build si una capability no tiene grant.
- Los 3 secretos, ya en Secret Manager.

### Gap

- No existe **ningún** código de Shutterstock en el repo. Lo de TASK-1410 fue `curl` en una sesión.
- No existe una capability de stock media en `ENTITLEMENT_CAPABILITY_CATALOG` ni en `capabilities_registry`.
- **Nada verifica** que un asset sea comercial (`is_editorial: false`), ni que su geografía coincida con lo que el consumer va a *afirmar* sobre él.
- No hay registro de **qué hemos licenciado ni qué derechos tenemos**. Hoy la única traza es el `credit` dentro del payload de cada consumer — disperso, sin SSOT. **Ése es el dominio de `EPIC-028`, no de esta task.**

## Modular Placement Contract

- Topology impact: `api`
- Current home: `src/lib/integrations/shutterstock/` (dominio compartido, runtime Vercel) + `scripts/media/license-stock.ts` (tooling out-of-band, Node local)
- Future candidate home: `undecided`
- Boundary: primitive `searchStockImages()` + `assertProvenance()`. Consumers autorizados: la ruta API gateada por capability, y —vía ella— UI, Nexa, MCP y agentes. **El CLI de licenciamiento NO es importable desde `src/lib/**`** (test de frontera).
- Server/browser split: server-only sin excepción. El adapter resuelve secretos y nunca cruza al bundle cliente; un consumer de browser habla con la ruta API, jamás con el adapter.
- Build impact: `none` — sólo `fetch` nativo. Sin SDK de Shutterstock, sin dependencias pesadas.
- Extraction blocker: `none` para la búsqueda (stateless, sin transacción, sin schema propio). El licenciamiento **sí** tendría uno (ledger + derechos + assets durables) — y por eso **no se construye acá**.

**Por qué `undecided`:** la búsqueda puede quedarse (`remain-shared`) o irse con el dominio de assets si Creative Studio termina siendo su dueño. Es reversible y barata de mover (~200 líneas, sin schema propio), así que **no vale la pena bloquearla esperando a `EPIC-028`**. El **licenciamiento**, en cambio, ya tiene hogar declarado: `EPIC-028`, fuera de este repo.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: **el catálogo de Shutterstock es del proveedor** — Greenhouse **no** lo replica, no lo cachea como SoT, no lo posee. El único dato nuevo que Greenhouse posee es la **capability** (`capabilities_registry`).
- Consumidores afectados: `API` (ruta nueva) · `MCP`/`Nexa` (por parity) · `external` (efeonce-think, Content Factory, artifact-composer, social-media-studio) · `CLI` (licenciamiento out-of-band)
- Runtime target: `production` (Vercel, sólo la búsqueda) + `local` (el CLI de licenciamiento)

### Contract surface

- Contrato existente a respetar: `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md` (la frontera costo/derechos) · `src/config/entitlements-catalog.ts` · `src/lib/api/canonical-error-response.ts`
- Contrato nuevo: reader `searchStockImages(query, opts)` · endpoint `GET /api/content/stock/search` · capability `content.stock_media.search`
- Backward compatibility: `not applicable` — capability nueva, ruta nueva, flag OFF por defecto.
- Full API parity: la capability nace **con** su contrato gobernado. No hay botón que haga algo que la API no pueda hacer; Nexa y MCP la operan **por construcción**, sin integración aparte. **Y la parity aplica sólo al lado que Greenhouse posee: buscar.** Licenciar no tiene contrato Greenhouse *a propósito* — su contrato es de `EPIC-028`.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_core.capabilities_registry` (seed de 1 fila). **Ninguna tabla nueva.**
- Invariantes que no se pueden romper:
  - `NINGÚN` código bajo `src/lib/**` o `src/app/**` llama a un endpoint de Shutterstock que consuma crédito. Verificado por `no-spend-boundary.test.ts`, que hace grep del módulo buscando `/licenses` y falla si aparece.
  - `assertCommercialUse(asset)` **lanza** si `is_editorial !== false`. Un `undefined` **no** es un `false`: si el proveedor no lo declara, se rechaza. Fail-closed.
  - `assertProvenance(asset, { mustClaim: ['chile'] })` **lanza** si los `keywords` + `description` del propio asset no sostienen lo que el consumer va a afirmar. El caller **declara qué va a afirmar**; el helper lo confronta con el dato del fotógrafo. Ésta es la que habría matado a `789778528`.
  - El reader **nunca** devuelve una URL de descarga. La búsqueda devuelve previews y metadata. La URL de descarga sólo existe post-licencia, y eso pasa fuera.
- Tenant/space boundary: la capability se resuelve contra la sesión (`can(subject, 'content.stock_media', 'read', scope)`). El catálogo de Shutterstock **no es multi-tenant** (es de Efeonce) — así que el boundary es de *acceso*, no de *datos*. Declararlo explícito evita que alguien asuma scoping por org donde no lo hay.
- Idempotency/concurrency: la búsqueda es idempotente y sin efectos. El licenciamiento **no lo es** — y por eso vive detrás de un humano, no de un retry.
- Audit/outbox/history: la búsqueda **no** emite evento (read-only, sin efecto, alto volumen: emitir sería ruido). El licenciamiento **sí** deja traza: cada línea del ledger append-only, commiteada — **git es el audit log** mientras no exista el del Studio.

### Migration, backfill and rollout

- Migration posture: `additive` — un `INSERT` en `capabilities_registry` con su bloque `DO $$ ... RAISE EXCEPTION` de verificación post-DDL (anti pre-up-marker bug).
- Default state: `flag OFF` — `SHUTTERSTOCK_SOURCING_ENABLED=false`.
- Backfill plan: `none` — no hay datos históricos que migrar.
- Rollback path: `flag off` (revert < 5 min) o `revert PR`. La migración es aditiva y no destructiva.
- External coordination: **rotación de los 3 secretos** (ver abajo) + `vercel env add SHUTTERSTOCK_SOURCING_ENABLED`.

### Security and access

- Auth/access gate: `capability` — `content.stock_media` / `read` vía `can()`. La ruta API además exige sesión.
- Sensitive data posture: `secrets` — las 3 credenciales. **NUNCA** loggear el valor; **NUNCA** exponerlas al cliente; **NUNCA** pasar el token OAuth al adapter de búsqueda (que sólo necesita basic auth — **el token que gasta no debe estar ni siquiera disponible en el runtime que busca**).
- Error contract: `canonicalErrorResponse(code)` — prose es-CL, nunca el error crudo de Shutterstock. `captureWithDomain(err, 'integrations.shutterstock', ...)`.
- Abuse/rate-limit posture: la búsqueda pega a un tercero con cuota. Cachear la respuesta por `(query, opts)` con TTL corto y declarar el límite. Un agente en loop no puede quemar la cuota de búsqueda de la empresa.

### Runtime evidence

- Local checks: `pnpm test src/lib/integrations/shutterstock` — incluye el test de frontera (`no-spend`) y los tres casos reales como fixtures: `789778528` (Argentina → debe **lanzar**), un `is_editorial: true` (debe **lanzar**), `1964017498` (Chile, comercial → debe **pasar**).
- DB/runtime checks: `pnpm pg:connect:shell` → verificar que la fila existe en `capabilities_registry` y que `parity.live.test.ts` queda verde (catálogo TS ↔ DB).
- Integration checks: smoke real contra la API de Shutterstock con basic auth (búsqueda, gratis, sin efectos).
- Reliability signals/logs: `captureWithDomain` con `domain=integrations.shutterstock`. Sin signal dedicada en V1 (la búsqueda no tiene *steady state* que vigilar); si emerge quema de cuota, ahí se justifica.
- Production verification sequence: ver `Rollout Plan`.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers están nombrados con paths reales.
- [ ] Invariantes, boundary de acceso e idempotencia están explícitos.
- [ ] Postura de migración/rollback explícita y proporcional.
- [ ] Evidencia runtime/DB listada.
- [ ] Errores canónicos, sin fugas de secreto, con `captureWithDomain`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — El adapter de búsqueda + el gate de procedencia

- `src/lib/integrations/shutterstock/client.ts` — basic auth vía `resolveSecret`. Espeja `src/lib/ai/dataforseo.ts`: `isConfigured()` honesto, error explícito si falta el secreto. **Sin una sola línea que toque `/licenses`.**
- `src/lib/integrations/shutterstock/search.ts` — `searchStockImages(query, { orientation, perPage, sort })`. Devuelve preview + metadata. **Nunca** una URL de descarga.
- `src/lib/integrations/shutterstock/provenance.ts` — `assertCommercialUse(asset)` y `assertProvenance(asset, { mustClaim })`. Las dos **lanzan**; no devuelven `boolean` (un `boolean` se ignora; una excepción no).
- Tests con los tres casos reales como fixtures: `789778528` debe lanzar, un `is_editorial: true` debe lanzar, `1964017498` debe pasar.
- `no-spend-boundary.test.ts` — hace grep del módulo entero buscando `licenses` / `POST` y **falla** si aparece.
- Flag `SHUTTERSTOCK_SOURCING_ENABLED` (default OFF) + fila en `FEATURE_FLAG_STATE_LEDGER.md`.

### Slice 2 — El contrato gobernado (capability + entitlement + ruta)

- Capability `content.stock_media` (action `read`) en `src/config/entitlements-catalog.ts`.
- Migración: seed en `capabilities_registry` + bloque `DO $$ ... RAISE EXCEPTION` de verificación.
- Grant a ≥1 rol real de `src/config/role-codes.ts` en `src/lib/entitlements/runtime.ts` — **mismo PR**, o el guard rompe el build.
- `GET /api/content/stock/search` — sesión + `can()` + `canonicalErrorResponse` + cache con TTL.
- Verificar `parity.live.test.ts` verde (catálogo TS ↔ `capabilities_registry`).

### Slice 3 — El licenciamiento out-of-band (el puente, declarado temporal)

- `scripts/media/license-stock.ts` + `pnpm stock:license <id> [--size huge]`.
- **Gate humano obligatorio**: imprime el asset (id, descripción, keywords, `is_editorial`, contribuidor), corre `assertCommercialUse` + `assertProvenance`, muestra **cuántos créditos quedan**, y exige confirmación explícita. Sin `--yes` silencioso.
- Escribe una línea al ledger append-only `docs/operations/stock-license-ledger.jsonl`: `{licensed_at, image_id, license_id, contributor, is_editorial, consumer, task, credits_left}`. **Se commitea** — git es el audit log.
- 🔴 El CLI **no** es importable desde `src/lib/**`. El test de frontera lo verifica.
- El script declara en su cabecera, verbatim: **temporal · dueño: Growth/Content · condición de retiro: cuando `EPIC-028` exponga el contrato de licenciamiento del Studio.**

### Slice 4 — Docs y frontera

- **Delta** en `EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`: la frontera *sourcing vs generación*, y por qué **buscar** puede vivir en Greenhouse mientras **licenciar** no. El ADR habla de *producir* media; **adquirir** derechos también es suyo (§5), y esta Delta lo deja escrito para que nadie lo relea al revés.
- Fila en `DECISIONS_INDEX.md`.
- Doc funcional `docs/documentation/content/stock-media-sourcing.md` + manual `docs/manual-de-uso/plataforma/licenciar-imagenes-stock.md` (incluye las 3 bug classes con sus IDs reales).

## Out of Scope

- 🔴 **El ledger de créditos, el registro de derechos y los assets durables.** Son `EPIC-028`. Construirlos acá es exactamente lo que el ADR rechazó.
- 🔴 **Cualquier write path de licenciamiento en el runtime de Greenhouse.**
- 🔴 **Reconstruir `src/lib/media/`.** Está superseded.
- **UI.** V1 no tiene pantalla. Los consumers son agentes, procesos y el CLI. Una UI de búsqueda de stock es una task aparte, y sólo si alguien la pide.
- **Video, audio, música y 3D de Shutterstock.** El token los ve (100 créditos de cada uno) pero no hay consumer. Ampliar sin consumer es especulación.
- **Rotación de los secretos.** Es out-of-band y va aparte (ver abajo) — pero **bloquea** el flip del flag en producción.

## Detailed Spec

### La frontera, en una línea

> **Si la acción cuesta plata o crea derechos, no es de Greenhouse.**

Todo lo demás se deriva de ahí. El adapter de búsqueda ni siquiera **recibe** el token OAuth: recibe basic auth. **El token que gasta no está disponible en el runtime que busca.** Eso no es una convención — es la razón por la que el bug es irrepresentable.

### `assertProvenance` — el helper que habría matado a `789778528`

El caller **declara qué va a afirmar** sobre la imagen; el helper lo confronta contra las keywords y la descripción del propio fotógrafo:

```ts
// El consumer va a decir "Carretera Austral, Chile". Que lo demuestre.
const asset = await getStockImage('789778528')
assertProvenance(asset, { mustClaim: ['chile'] })
// → lanza: la description dice "Argentinian National Ruta 40, Patagonia, Argentina"
//   (las keywords SÍ traen `chile` y `carretera` — por eso el match por keyword solo NO basta:
//    la description es la que manda cuando contradice)
```

Regla dura del helper: si `description` **contradice** el claim, lanza — aunque las keywords lo sostengan. Las keywords son SEO del fotógrafo; la descripción es su declaración.

### Lo que aprendimos y no puede perderse

| Lo que pasó | El invariante |
|---|---|
| `789778528` era Argentina, con `chile` en sus keywords | `assertProvenance` — el caller declara, el metadata confirma |
| `1846352116` no era el río Baker sino el lago General Carrera | El `alt` y la caption se escriben **desde** el metadata, no desde el título |
| Nada verificaba `is_editorial` | `assertCommercialUse` fail-closed: `undefined` ≠ `false` |
| Un `attention` crop se comió la carretera del hero | *(no es de esta task — vive en TASK-1410)* |

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **Slice 1 (adapter + gate de procedencia) → Slice 2 (contrato gobernado).** La ruta API **no puede** existir antes que `assertCommercialUse`/`assertProvenance`: expondría búsqueda sin gate y el primer consumer publicaría una foto de Argentina.
- **Slice 3 (CLI) puede correr en paralelo con Slice 2**, pero **después** de Slice 1 — el CLI reusa los mismos asserts. Duplicarlos sería tener la regla en dos lugares y perderla en uno.
- **Slice 4 (docs) al cierre**, nunca antes: la Delta del ADR describe lo que se construyó, no lo que se pensó construir.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un agente/consumer gasta créditos desde el runtime | Integrations / gasto real | **low** (por construcción) | El adapter no recibe el token OAuth; `no-spend-boundary.test.ts` hace grep y falla si aparece `/licenses` | test de frontera en CI |
| Se publica una imagen `editorial` en uso comercial | Content / legal | medium | `assertCommercialUse` fail-closed (`undefined` ≠ `false`) | test con fixture real |
| Se afirma una geografía que la foto no sostiene (caso Argentina) | Content / reputación en licitación | **medium** — ya pasó | `assertProvenance` confronta el claim contra description+keywords | test con fixture `789778528` |
| Un agente en loop quema la cuota de búsqueda | Integrations / cuota | medium | cache con TTL + rate limit en la ruta | 429 de Shutterstock en Sentry |
| El token `v2` no-expirable, pegado en un chat, se usa por un tercero | Secrets / gasto real | **medium** — está expuesto **ahora** | 🔴 **rotación pendiente, bloquea el flip en prod** | descuadre en `downloads_left` |
| Alguien reconstruye `src/lib/media/` | Arquitectura | medium | Delta del ADR + fila en `DECISIONS_INDEX` + la regla dura en esta task | code review |

### Feature flags / cutover

- `SHUTTERSTOCK_SOURCING_ENABLED` (default `false`). Gatea la ruta API. Se lee **sólo en Vercel** (la búsqueda es la única superficie runtime) — **no** hay lectura en `ops-worker` ni en Cloud Run, y hay que declararlo así en el ledger para no repetir el caso `GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED` (prendido en el runtime equivocado, muerto en silencio).
- Revert: flag a `false` + redeploy. < 5 min.
- El CLI de licenciamiento **no** tiene flag: su gate es un humano.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR — módulo aislado, sin consumers aún | < 5 min | sí |
| Slice 2 | flag `SHUTTERSTOCK_SOURCING_ENABLED=false` + redeploy. La migración es aditiva: la fila en `capabilities_registry` puede quedarse sin daño (una capability sin uso no confiere nada) | < 5 min | sí |
| Slice 3 | revert PR. El ledger es append-only: **no se borran líneas** — una licencia ya gastada es un hecho, no un registro editable | < 5 min | sí (el código; **no** el crédito gastado) |
| Slice 4 | revert PR (doc-only) | < 5 min | sí |

### Production verification sequence

1. **Rotar los 3 secretos** (out-of-band). Sin esto, no se prende nada en prod.
2. `pnpm migrate:up` en staging → verificar la fila en `capabilities_registry` + `parity.live.test.ts` verde.
3. Deploy a staging con `SHUTTERSTOCK_SOURCING_ENABLED=false` → verificar que la ruta responde 404/403 y **nada** se rompió.
4. Flip a `true` en staging → una búsqueda real → verificar preview + metadata, **cero** URLs de descarga en la respuesta.
5. Ejercitar los 3 fixtures contra la API viva: `789778528` debe lanzar, un `editorial` debe lanzar, `1964017498` debe pasar.
6. Repetir 2–5 en producción.
7. `pnpm stock:license` en local con un asset de prueba → verificar el gate humano, la línea del ledger y el decremento de `downloads_left`.

### Out-of-band coordination required

- 🔴 **Rotar las 3 credenciales de Shutterstock.** Se pegaron en un chat el 2026-07-14 (transcript + logs). El token `v2/` **no expira solo**: hay que revocarlo en el portal de Shutterstock, regenerarlo, y republicar las 3 versiones con `printf %s "$V" | gcloud secrets versions add <id> --data-file=-` (escalar crudo, sin newline). **Bloquea el flip en producción.**

  **🔴 Verificado en vivo el 2026-07-14 09:0x: el token filtrado SIGUE ACTIVO.** `GET /v2/user` responde **HTTP 200** contra la cuenta `Efeonce Group` (`id 472116829`). Radio de exposición actual, a nombre de quien tenga ese chat:

  | Pool | Disponible |
  |---|---|
  | Imágenes (`standard`) | **94** / 100 |
  | Video (`footage_standard`) | 94 / 100 |
  | Audio (`audio_standard`) · SFX (`sfx_standard`) | 94 / 100 · 94 / 100 |
  | `integrated_media` | **500** / 500 |

  🔴 **Republicar en Secret Manager NO es rotar.** Ninguna acción en GCP invalida ese token: solo cambia lo que *nosotros* leemos. El credential filtrado sigue siendo válido **en Shutterstock** hasta que se regenere la app en su portal. El paso que cierra la fuga es el del portal, y **solo lo puede dar un humano** (requiere login).

  ⚠️ **Y las credenciales nuevas NO se pegan en un chat** — es exactamente cómo se filtraron las primeras. El operador las publica él mismo, directo desde el portal a Secret Manager (comandos abajo); el agente nunca las ve.
- `vercel env add SHUTTERSTOCK_SOURCING_ENABLED` en `Production` + `Preview (develop)`.
- Confirmar con el rep de Shutterstock **de qué suscripción salen los créditos API** — la web y la API pueden tener pools distintos. Hoy el token ve 4 pools de 100 (imagen / video / música / SFX) y quedan **96** imágenes tras TASK-1410.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `searchStockImages()` existe en `src/lib/integrations/shutterstock/`, resuelve su secreto con `resolveSecret` y **nunca** devuelve una URL de descarga.
- [ ] `no-spend-boundary.test.ts` falla si aparece cualquier referencia a `/licenses` bajo `src/lib/**` o `src/app/**`.
- [ ] `assertCommercialUse` lanza con `is_editorial: true` **y** con `is_editorial: undefined` (fail-closed).
- [ ] `assertProvenance(asset, { mustClaim: ['chile'] })` **lanza** para el fixture real `789778528` (Ruta 40, Argentina) y **pasa** para `1964017498`.
- [ ] La capability `content.stock_media` existe en `src/config/entitlements-catalog.ts` **y** en `capabilities_registry` (migración con bloque `DO $$` de verificación) **y** está granteada a ≥1 rol real; `capability-grant-coverage.test.ts` y `parity.live.test.ts` verdes.
- [ ] `GET /api/content/stock/search` exige sesión + `can()`, devuelve `canonicalErrorResponse` en error, y responde 403/404 con el flag OFF.
- [ ] `pnpm stock:license` exige confirmación humana explícita, muestra créditos restantes, corre los dos asserts, y escribe la línea al ledger append-only.
- [ ] `SHUTTERSTOCK_SOURCING_ENABLED` tiene fila en `FEATURE_FLAG_STATE_LEDGER.md` con su runtime (**Vercel únicamente**) declarado.
- [ ] La Delta en el ADR de Creative Studio deja escrito que **adquirir derechos es dominio del Studio**, y que sólo la **búsqueda** vive en Greenhouse.
- [ ] Cero código nuevo bajo `src/lib/media/`.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test src/lib/integrations/shutterstock`
- `pnpm test` (full — gate de cierre)
- `pnpm build` (producción — gate de cierre)
- `pnpm task:lint --task TASK-1411`
- `pnpm docs:closure-check`
- Smoke real contra la API de Shutterstock (búsqueda, gratis, sin efectos).

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado ejecutado
- [ ] **`EPIC-028` actualizado**: el CLI + ledger-en-archivo de esta task quedan declarados como su **puente temporal**, con la condición de retiro escrita en el epic (no sólo en el script).

## Follow-ups

- **Rotación de las 3 credenciales** — issue/task aparte, **bloquea el flip en prod**.
- **El registro de derechos como SSOT** — hoy la única traza de qué licenciamos vive dispersa en el `credit` de cada payload. Es un gap real, y su dueño es `EPIC-028`. El ledger-en-archivo lo tapa mientras tanto y **debe morir** cuando el Studio exista.
- **Video/audio/música de Shutterstock** — el token ya los ve (100 créditos c/u). Ampliar sólo cuando exista un consumer, no antes.
- **¿Premier?** La licencia Standard **no es transferible al cliente**: el cliente puede usar el *diseño final*, pero no extraer y publicar la foto de stock por separado — y el hero de un blog **es** la foto usada tal cual. Si un cliente publica el contenido que producimos, o licencia él, o Efeonce compra Premier. **Es una línea de la económica de cada propuesta, no un detalle técnico.**

## Open Questions

- **¿La búsqueda se queda en Greenhouse o migra al Studio?** Esta task la deja en Greenhouse porque no cuesta, no crea derechos y hay cuatro consumers *hoy*. Pero si Creative Studio termina siendo el dueño del **dominio de assets** completo, la búsqueda podría irse con él. Es reversible y barata de mover (~200 líneas, sin schema propio) — por eso **no** vale la pena bloquearla esperando a `EPIC-028`. Revisitar cuando el Studio exponga su primer contrato.
- **¿Cachear resultados de búsqueda en PG?** V1 dice que no: el catálogo es del proveedor y Greenhouse no lo posee. Si la cuota se vuelve el cuello de botella, la respuesta es cache con TTL, **no** una tabla espejo (eso sería replicar un SoT ajeno).

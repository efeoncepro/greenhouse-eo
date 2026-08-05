# TASK-1463 — Globe Model Promotion and Readiness Registry

## Delta 2026-08-05 (b) — el rollout del scope NO es el primer paso, y hacerlo solo no entrega nada

Mapeados los dos repos antes de tocar el broker. El hallazgo cambia el orden del trabajo.

### 🔴 El CLI de Greenhouse NO puede despachar `pause`, y no es cuestión de agregarle un comando

El instinto era extender el CLI OAuth público de `TASK-1629` (`pnpm globe:credit-funding`), que ya tiene PKCE,
loopback y despacho por comando. Mecánicamente sería fácil. **Pero no cierra el problema:** el último tramo
Greenhouse → Globe viaja con **ID token de service account** (`src/lib/globe/client.ts:131-148`), y Globe lo
resuelve como `principalType: 'service'`. `transitionModelRoute` haría `requireHuman(c)` y lanzaría
`ModelReadinessEvidenceDeniedError`.

El truco que usa el fondeo —gate humano **del lado Greenhouse**, con `globe_credit_funding_intents` rechazando
principals de servicio— **no aplica acá**: ahí quien exige humano es Greenhouse; en readiness quien exige humano
es **Globe, en su propio dominio**. Refuerzos de que está cerrado por diseño: la coverage declarada de `pause`
es `ui: 'policy-blocked'` y `'sister-platform': 'policy-blocked'`
(`packages/domain/src/model-readiness.ts:27,75`), y Globe **ignora** actores suplantados por header.

**La única superficie que produce `principalType: 'human'`** es la sesión humana de Globe: cookie →
`resolveHumanPrincipal` → el BFF firma un token de delegación con actor y capabilities → la API privada lo
verifica y reconstruye `human`. O sea **el despachador del `pause` es la UI de Globe (o su carril BFF), no un
CLI de Greenhouse**.

### 🔴 Consecuencia de orden: hacer el rollout del scope AHORA entregaría CERO capacidad

Conceder `globe.model-readiness.pause` sin superficie deja a un humano con un scope que no tiene dónde usar —
y para eso hay que correr el rollout de 3 pasos que **ya tumbó todo el login de Globe una vez**. Es exactamente
el anti-patrón que esta plataforma acaba de canonizar: *una capability concedida no es una capability
ejecutable*. **Riesgo alto de SSO a cambio de nada visible.**

**El orden correcto es: superficie primero, grant después.** Concretamente, antes del rollout hace falta
decidir y construir:

1. cambiar la coverage de `pause` a `ui: 'available'` (`model-readiness.ts:75`);
2. el control en la superficie de readiness, con payload `routeId + modelVersion + expectedRevision +
   reasonCode`;
3. sólo entonces, el grant.

Alternativa si se quiere el CLI igual: exige un **ADR previo** —que Globe acepte un envelope humano-delegado de
Greenhouse para model-readiness, hoy `policy-blocked` para `sister-platform`—. Eso reabre ADR-015, no es una
línea de código.

### El procedimiento de 3 pasos, para cuando exista la superficie

Las tres listas del cliente `globe` **se derivan de una sola constante**
(`src/lib/sister-platforms/globe-oauth-grants.ts:23-78`): `capabilityScopes = GLOBE_PRODUCER_CAPABILITY_SCOPES`,
`requiredScopes = ['openid', ...capabilityScopes]`, `allowedScopes = [...OIDC, ...capabilityScopes]`. Por eso no
existe «otorgado pero opcional»: `oauth-policy.ts:32-52` exige `capabilityScopes ⊆ requiredScopes`.

| Paso | Dónde | Qué | Verificación |
|---|---|---|---|
| **1** | Greenhouse | scope a una lista transicional que sólo suma a `allowedScopes` | `pnpm globe:oauth-grants` (dry-run) → gana **1** scope; luego `--apply`; smoke de federación humana → `human_federation_ok` |
| **2** | Globe | scope a `PRODUCER_HUMAN_CAPABILITY_SCOPES` (`app.ts:257-282`) + **deploy de studio-web** | `curl` a `/auth/start` y confirmar el scope en el `location` **del deployment real**, no del código |
| **3** | Greenhouse | mover el scope a `GLOBE_PRODUCER_CAPABILITY_SCOPES` | smoke con `GLOBE_SMOKE_PRODUCER_BFF=1 GLOBE_SMOKE_REQUIRED_CAPABILITIES=globe.model-readiness.pause` |

Precedente literal a copiar: ADR-010 / `TASK-1535` — fallo `07550a0a4` → revert `0b93eef0c` → paso 1 `697776e57`
→ paso 3 `14d00cf7f`.

### 🔴 Riesgos, con su blast radius medido

- **Paso 3 antes del 2 = el incidente otra vez, y peor de lo que suena.** El scope pasa a `requiredScopes`, el
  cliente desplegado no lo pide → `required_scope_missing`. No sólo muere todo login nuevo: **las sesiones vivas
  también caen**, porque `userinfo` revalida contra la política **actual** y Globe fuerza esa revalidación en
  **cada** llamada a la API privada. **No hay ventana de gracia**; el radio es *todos los humanos de Globe*.
- **Paso 2 antes del 1** falla ruidoso y detectable (`scope_not_allowed` 403): muere el login nuevo, sobreviven
  las sesiones.
- ⚠️ **El dry-run del script NO diffea la política**, sólo `allowedScopes` y TTLs. En el paso 3 va a mostrar
  `current == target` y **parecer un no-op**. No lo uses como señal de que no pasa nada.
- ⚠️ **`--rollback` NO es el rollback de esto**: es `shell-only` y degrada el grant a un solo scope, **rompiendo
  el Producer entero**. El rollback correcto es revertir el archivo y re-aplicar; el script lee el **working
  tree**, así que es efecto inmediato sin deploy ni merge. **Ten el diff de reversa preparado ANTES del paso 3**,
  y recuerda que el orden de reversa es estrictamente **3 → 2 → 1**.

✅ **Verificado y descartado como riesgo:** `apps/studio-web/dist/` **no está committeado** — el Dockerfile
reconstruye, así que el paso 2 sí es efectivo. Era la duda que habría convertido el paso 3 en el incidente.

### Mitigación vigente, que baja la urgencia

Volver a promover la ruta **también** cierra la divergencia de readiness (enciende el binding y vuelve coherente
el `promoted`). Ejercitado el 2026-08-05 sobre `ref/still/reference-v1`: la señal bajó de 1 a 0. O sea el hueco
muerde **sólo cuando la decisión correcta es RETIRAR una ruta**, no restaurarla — y ése es justo el caso que el
diseño quiere que firme una persona.

## Delta 2026-08-05 — 🔴 `pause` NO tiene camino ejecutable, y lo destapó una señal en producción

Descubierto ejercitando `TASK-1641`, que desplegó la señal `globe_promotion_readiness_divergent`: cuando
un rollback de promoción deja readiness en `promoted` con el binding apagado, **el remedio que la señal
recomienda no lo puede ejecutar nadie hoy**.

Las dos puertas están cerradas, y por razones distintas:

1. **Los lanes de service account fallan cerrado por diseño.** `transitionModelRoute`
   (`packages/domain/src/model-readiness.ts:106`) hace `if (target !== 'promoted') requireHuman(c)`, y
   `requireHuman` (`:139`) lanza `ModelReadinessEvidenceDeniedError` salvo
   `principalType === 'human'`. Por eso `readiness-promote` sí funciona por el operator lane
   (`tenancy-operator`) y `pause` **no puede**. La asimetría es deliberada: promover exige evidencia,
   retirar exige una persona.
2. **El humano tampoco puede: no tiene la capability.** `globe.model-readiness.pause` **no está** en
   `PRODUCER_HUMAN_CAPABILITY_SCOPES` (`apps/studio-web/src/app.ts`) — el grant humano lleva
   `globe.model-readiness.propose` y `.review`, no `.pause`.

⚠️ **Se estuvo a punto de construir un modo `readiness-pause` en el operator lane y se descartó al LEER
el código**: habría sido un camino muerto que compila, despliega y falla en runtime. Vale registrarlo
porque el error era barato de cometer y caro de detectar.

**Cerrar esto NO es agregar un modo al workflow.** Exige, en este orden:

1. El **rollout de 3 pasos cero-downtime del broker** para sumar `globe.model-readiness.pause` al grant
   humano — el mismo procedimiento que ya tumbó **todo el login de Globe** una vez, porque el broker
   impone `capabilityScopes ⊆ requiredScopes` y ambos repos hardcodean su lista. Canon: skill
   `greenhouse-globe` §«El grant SSO acopla dos repos y rompió el login».
2. Una **superficie que lo despache** con sesión humana: UI del Producer, o un CLI OAuth público con
   PKCE siguiendo el patrón ya canonizado en `TASK-1629`.

**Mitigación vigente, y por qué no urge tanto como parecía:** promover la ruta otra vez también cierra la
divergencia, porque enciende el binding y vuelve coherente la readiness `promoted`. Se ejercitó el
2026-08-05 sobre `ref/still/reference-v1` y la señal bajó de 1 a 0. O sea el hueco muerde **sólo cuando
la decisión correcta es retirar la ruta, no restaurarla** — que es justo el caso que un humano debe
firmar.

## Delta 2026-07-19 — TASK-1458 complete: el artefacto de evidencia para promoción ya existe

`TASK-1458` (Golden Briefs & Evaluation Harness, SPEC-003) quedó **complete** (fake canary). Es una de las cuatro dependencias directas de esta task (`TASK-1458, 1459, 1460, 1461`) y aporta el **artefacto de evidencia** que las transiciones de estado del registry referencian: el `EvaluationReportV1` versionado (con `fixtureVersion` + `rubricVersion` + `schemaVersion`), scopeado al workspace del caller y con sus **limitaciones declaradas** (proveedor fake, muestra única). Esto alimenta directamente las AC "Cambio de estado exige evidencia y actor autorizado" y los `evidence refs` de los commands `propose`/`promote`/`pause`/`retire`.

Nota de frontera, alineada con el Goal ("separar probar de autorizar") y la AC "Sólo rutas promoted pueden llegar al router productivo": un report es **evidencia técnica, nunca una aprobación de ruta** (invariante 9) ni de artefacto (invariante 6), y su verdict nunca es un "passed" creativo (sólo `objective_fail` u `objective_pass_pending_human`). El registry debe seguir exigiendo revisión humana + actor autorizado por encima del report objetivo; un `objective_pass_pending_human` **no** autoriza promover por sí solo. — cerrado por trabajo en TASK-1458.

## Delta 2026-07-19 — TASK-1486: adapter real Vertex disponible (code-complete, rollout gated)

`TASK-1486` dejó el `VertexCreativeAdapter` code-complete: cuando el canary billable se prenda (`GLOBE_LAB_PROVIDER=vertex`, gated por su go-live checklist), los reportes de evaluación (TASK-1458) dejarán de declarar "proveedor fake" y llevarán `model`/`modelVersion` reales de Vertex + `actualCredits` del uso real. La promotion readiness registry debe seguir tratando el `EvaluationReportV1` como **evidencia objetiva** (no aprobación de craft ni de ruta): el verdict del harness nunca es un "passed" creativo, y `objective_pass_pending_human` no promueve por sí solo. La promoción de una ruta a producción sigue siendo un gate **separado** de ejecutarla en el Lab (invariante 9). — adapter real disponible por TASK-1486.

## Delta 2026-07-20 — DESBLOQUEADA: sus 4 dependencias están complete

`Blocked by: TASK-1458, TASK-1459, TASK-1460, TASK-1461` — **las 4 están `complete`**: TASK-1458 (harness de evals) + TASK-1459 (still matrix) cerradas antes; **TASK-1460 (motion) + TASK-1461 (audio) cerradas 2026-07-20** con recommendation matrices en vivo (Omni/Veo/Seedance motion; Seed Audio audio, todos `objective_pass_pending_human`). Esta task ya puede tomarse. Contrato claro que hereda: el harness produce el **veredicto objetivo** (`objective_fail | objective_pass_pending_human`, nunca auto-`passed`); la distinción **canary / lab-ready / production-candidate** y el bloqueo de promoción por craft/continuidad/audio/rights son **responsabilidad de esta task** (los labs entregan los inputs objetivos + los criterios humanos declarados, no la promoción). — desbloqueada por el cierre de TASK-1460/1461.

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-028`
- Status real: `Operativo internal-only para 3 rutas promovidas; 7 rutas del catálogo siguen sin promoción exacta ACTUALIZACION 2026-07-30 (barrido EPIC-028): el bloqueo de '7 rutas sin promocion' YA NO APLICA en esa magnitud — hoy hay 10 rutas OPERATIVAS en produccion gobernada (Nano Banana Pro promovido el 07-30, revision live 896a0620). Quedan 3 bloqueadas por TERCEROS (verifier de OpenAI x2, allowlist de Google x1) y 1 solo-Lab (Omni). Ninguna depende de trabajo interno. Ver EPIC-028_WIP_SWEEP_2026-07-30.md`
- Rank: `TBD`
- Domain: `creative|platform|data`
- Blocked by: `none`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear un registry versionado de rutas con estados lab-only, candidate, promoted, paused y retired, respaldados por evidencia y rollback.

## Checkpoint 2026-07-23 — primeras promociones durables

- Hay tres rutas/modelos `promoted`: Seedream 5 Pro para Image, Seedance 2.0 para Video y ElevenLabs Multilingual
  v2 para Audio/TTS. Sus bindings están enabled y sus circuitos closed.
- El catálogo `1.2.0` tiene 10 rutas. Las cinco revisiones aprobadas observadas corresponden a esas mismas tres
  identidades exactas; no representan cinco modelos distintos.
- Las otras siete rutas requieren reporte de evaluación, revisión humana firmada, propuesta, promoción por actor
  independiente, binding/circuito y canario. La task sigue `in-progress`; catálogo no equivale a readiness.

## Why This Task Exists

EPIC-028 exige que integración de modelos, plataforma gobernada y validación comercial avancen en paralelo, pero con gates distintos. Greenhouse gobierna esta task y su evidencia; Efeonce Globe posee el código, datos y runtime creativo.

## Goal

Separar claramente probar un modelo de autorizarlo para producción.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — principio heredado/adaptado por Globe.
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`
- `docs/architecture/creative-studio/PLATFORM_FOUNDATION_V1.md`
- `docs/operations/creative-studio/EPIC_028_PARALLEL_EXECUTION_PLAN_V1.md`

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- `TASK-1458`, `TASK-1459`, `TASK-1460`, `TASK-1461`.

### Blocks / Impacts

- Las tasks downstream declaradas en el grafo de EPIC-028 y el execution plan de Globe.
- No habilita producción ni clientes externos por sí sola.

### Files owned

- `../efeonce-globe/packages/provider-contract/`
- `../efeonce-globe/packages/contracts/`
- `../efeonce-globe/packages/domain/`
- `../efeonce-globe/packages/sdk/`

## Current Repo State

### Already exists

- Globe dispone de repo separado, identidad internal-only, Node 24, SDK/WIF base y primera shell branded.
- Greenhouse dispone del harness canónico de TASK/EPIC, hooks, lint, QA, documentación y handoff.

### Gap

- Falta cerrar el alcance binario de esta task con código/evidencia runtime en Globe y lifecycle gobernado en Greenhouse.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `Efeonce Globe como plataforma hermana; Greenhouse como control plane operativo/documental`
- Future candidate home: `remain-shared`
- Boundary: `Globe Model Promotion and Readiness Registry`
- Server/browser split: `secrets, providers y writes server-only; contratos serializables y consumidores explícitos`
- Build impact: `Globe valida su runtime; Greenhouse valida task, docs, integraciones y proyecciones en scope`
- Extraction blocker: `ninguno: el runtime ya nace fuera del monolito Greenhouse`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: `Globe para runtime creativo; Greenhouse conserva sólo gobierno TASK/EPIC y proyecciones explícitas`
- Consumidores afectados: `Globe UI, creative runner, SDK/MCP y Greenhouse sólo cuando exista contrato versionado`
- Runtime target: `sibling-service`

### Contract surface

- Contrato existente a respetar: `EPIC-028, arquitectura agentic de Globe y provider contracts versionados`
- Contrato nuevo o modificado: `list/get readiness readers y propose/promote/pause/retire commands con evidence refs`
- Backward compatibility: `gated`
- Full API parity: `registry API/SDK y futuros UI/MCP consumen los mismos readers/commands; promotion nunca es edit directo de config`

### Data model and invariants

- Entidades/tablas/views afectadas: `sólo agregados Globe definidos por la migración/contrato aceptado de esta task`
- Invariantes que no se pueden romper: `tenant isolation, lineage, idempotencia, provider/model/version explícitos y audit append-only`
- Tenant/space boundary: `studio_workspace_id derivado de identidad autorizada; nunca aceptado ciegamente desde el cliente`
- Idempotency/concurrency: `keys durables, preconditions y locks/fences proporcionales al write externo o financiero`
- Audit/outbox/history: `actor, correlation, intento, decisión, estado y error sanitizado; secretos y payload sensible excluidos`

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `internal-only y flag/allowlist OFF para clientes externos`
- Backfill plan: `ninguno salvo plan explícito y reversible aprobado en ejecución`
- Rollback path: `kill switch, revert de adapter/consumer y reconciliación desde audit`
- External coordination: `owner de GCP/provider y, cuando aplique, Legal/Finance/Security`

### Security and access

- Auth/access gate: `capability por actor, workspace y acción; WIF/ADC sin llaves persistidas`
- Sensitive data posture: `assets privados, logs redacted y secretos sólo server-side`
- Error contract: `errores tipados y sanitizados; raw provider/cloud/database errors no cruzan la frontera`
- Abuse/rate-limit posture: `hard budget, rate limit, concurrency cap, timeout, retry acotado y circuit breaker`

### Runtime evidence

- Local checks: `unit, contract, negative-path e idempotency tests`
- DB/runtime checks: `migrations/readback e invariantes tenant-scoped cuando aplique`
- Integration checks: `smoke no productivo allow/deny/replay/revoke y provider canary dentro de presupuesto`
- Reliability signals/logs: `correlation_id, route, attempt, latency, cost/reservation y outcome sin secretos`
- Production verification sequence: `local -> sandbox -> internal allowlist -> staging/canary -> promoción explícita`

### Acceptance criteria additions

- [ ] El contrato programático existe antes que cualquier UI específica.
- [ ] Auth, tenant isolation, idempotencia, observabilidad y rollback tienen evidencia proporcional al riesgo.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1

- Definir schema de capability/readiness y evidencia requerida.

### Slice 2

- Implementar list/get readers y resolución fail-closed por route/version.

### Slice 3

- Agregar propose/promote/pause/retire commands capability-gated, idempotentes y auditables.

## Out of Scope

- Producción pública, clientes externos, pricing/wallet self-serve o permisos más amplios que los aprobados expresamente.
- Mover runtime creativo, datos, provider secrets o lógica de Globe a Greenhouse.
- Crear un segundo harness o namespace de tasks dentro de Globe.

## Detailed Spec

La ejecución comienza desde Greenhouse con `pnpm codex:task-hook TASK-1463 --develop` cuando el operador apruebe su goal. El plan puede modificar el repositorio hermano en los paths owned, pero lifecycle, checkpoints, QA y cierre permanecen en esta spec canónica.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Contrato y guardrails -> implementación local -> pruebas negativas -> canary internal-only -> evidencia -> promoción explícita si corresponde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Promoción implícita por disponibilidad del provider | Globe/Greenhouse | medium | gate binario, allowlist, audit y rollback antes de ampliar | ejecución productiva de ruta no promoted |
| Deriva entre task y runtime | documentation | medium | task hook, checkpoint, QA y closure en Greenhouse | cambio Globe sin evidencia TASK |
| Habilitación accidental externa | security/commercial | low | internal-only, deny tests y sign-off separado | actor externo obtiene acceso |

### Feature flags / cutover

Default internal-only. Toda capacidad nueva usa flag/allowlist/registry fail-closed hasta cumplir el gate de promoción aplicable.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Contrato/docs | revert commit correctivo y restaurar versión anterior | <15 min | sí |
| Runtime Globe | desactivar flag/route y revertir deploy | <30 min | sí |
| Datos/externos | detener writes, reconciliar desde audit y aplicar runbook | <60 min | depende del provider |

### Production verification sequence

Local-first; sandbox no productivo; allowlist interna; tests negativos; evidencia runtime; QA release auditor; documentación; sólo después puede evaluarse un rollout adicional.

### Out-of-band coordination required

Provider/GCP/Legal/Finance/Security sólo cuando el slice los afecte. Ninguna ausencia de coordinación autoriza ampliar el scope.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Sólo rutas promoted pueden llegar al router productivo.
- [ ] Cambio de estado exige evidencia y actor autorizado.
- [ ] Versiones nuevas no heredan readiness automáticamente.
- [ ] Promotion/pause/retire sólo ocurren por commands; API/SDK/conformance prueban allow/deny/replay y el
      mismo evidence-linked audit.
- [ ] Greenhouse conserva lifecycle, audit, plan, QA, changelog y handoff; Globe conserva runtime/evidencia técnica.
- [ ] No se habilitan producción ni clientes externos sin una task/gate posterior explícito.

## Verification

- `pnpm task:lint --task TASK-1463`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `cd ../efeonce-globe && pnpm check && pnpm build` cuando exista cambio de runtime.

## Closing Protocol

- [ ] Lifecycle/carpeta, `docs/tasks/README.md`, registry, EPIC-028, changelog y Handoff sincronizados.
- [ ] QA release auditor y documentation governor ejecutados.
- [ ] Evidencia faltante queda declarada como `code complete, rollout pendiente` o bloqueo operativo.

## Follow-ups

- Las dependencias sucesoras se leen desde EPIC-028 y `docs/tasks/README.md`.

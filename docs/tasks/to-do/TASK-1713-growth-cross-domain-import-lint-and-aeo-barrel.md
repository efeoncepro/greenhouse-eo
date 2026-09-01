# TASK-1713 — Growth: lint rule universal cross-dominio y barrel de dominio AEO

## Delta 2026-09-01 — el campo `Blocked by` queda sólo con el blocker vivo

`TASK-1697` (el sustrato) cerró el 2026-08-27 y esta task heredó su molde. El único blocker vigente
es `TASK-1695`. La mención a 1697 sale del campo para que el guard no la lea como bloqueo vigente.


> ⚠️ **ID reasignado al crear la task.** El brief la nombró `TASK-1710`, pero ese ID ya está tomado
> por el umbrella P0 de remediación de confiabilidad
> (`docs/tasks/to-do/TASK-1710-reliability-remediation-control-plane-delivery-data.md`, commit
> `117108a7f`, registrado en `TASK_ID_REGISTRY.md`). `TASK-1711` y `TASK-1712` también quedaron
> tomados **durante esta misma sesión**, por otro agente trabajando en paralelo sobre el workspace
> compartido (`TASK-1711-candidate-identity-document-reveal.md`, más wireframe y flow de
> `TASK-1712-application-360-documents`). Verificado contra filesystem el 2026-08-15: el siguiente
> ID libre es `TASK-1713`. 🔴 **Reconfirmar contra `ls docs/tasks/*/TASK-*.md` y contra
> `docs/ui/{wireframes,flows}/` justo antes de registrarlo**: el ID libre se mueve mientras hay otro
> agente reservando bloque. `TASK-1697` ya dejó anotada la colisión original en su
> `## Delta 2026-08-15 (2)` y referencia a esta task **por descripción**; al registrar este ID hay
> que cerrar ese cross-link.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `TASK-1695`
- Branch: `Greenhouse develop; local-first, sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Es la **mitad B** de la partición de `TASK-1697`: lo que sale de esa task y se difiere porque no se
puede hacer bien todavía. Tres entregables encadenados: (a) el **barrel de dominio AEO** cubre lo que
`growth/seo` consume y los 12 deep imports de `grounded-query-{bridge,reader}.ts` se reescriben;
(b) barrido y **decisión de frontera** de los otros 18 deep imports cross-dominio vivos en
`src/lib/growth/**`; (c) recién entonces, `greenhouse/no-cross-domain-import-in-growth` **universal**
en `error` con cero violaciones. `TASK-1697` se queda con el sustrato y una rule angosta.

## Why This Task Exists

`TASK-1697` nació queriendo cerrar el sustrato **y** la frontera universal con un solo detector. Al
medir el repo, la segunda mitad resultó ser un trabajo distinto y más caro, y arrastrarla habría
bloqueado la primera —que sí desbloquea a `TASK-1670`—. Por eso se difiere acá, no se abandona.

**El número real es 30, no 14.** Verificado con `grep` sobre `develop` el 2026-08-15, sobre código de
producción bajo `src/lib/growth/**` y **excluyendo tests**:

| Origen → destino | Deep imports |
|---|---|
| `seo` → `ai-visibility` | 12 |
| `ai-visibility` → `forms` | 8 |
| `ctas` → `forms` | 5 |
| `ctas` → `meetings` | 1 |
| `meetings` → `forms` | 1 |
| `meetings` → `public-submission` | 1 |
| `forms` → `public-submission` | 1 |
| `ai-visibility` → `public-submission` | 1 |
| **Total** | **30** |

**18 están fuera del par `seo↔ai-visibility`**, y ahí está la razón del diferimiento: **volverlos
legales no es un sweep mecánico**. `src/lib/growth/forms/index.ts` exporta cinco módulos
(`contracts`, `policy-compiler`, `commands`, `readers` y dos símbolos de `dispatch`) y **no exporta
nada** de lo que sus consumidores le importan por la ventana: `embed-key`, `store`, `hash`, `flags`,
`email-verification`, `email-verification/email-domain-data`. Y `src/lib/growth/meetings/` **no tiene
barrel en absoluto**. Hacerlos legales obliga a decidir fronteras reales:

- ¿`forms/store` es superficie pública, o el acceso al store se expone como reader?
- ¿`ai-visibility` **debe** poder escribir el store de `forms`, o el public-intake del grader debería
  entrar por un command de `forms`?
- ¿`public-submission` es un dominio o una primitive transversal? Lo consumen tres dominios distintos
  (`forms`, `ai-visibility`, `meetings`) sólo para `captcha` y `abuse-guard`.
- ¿`ctas` → `forms/embed-key` es acoplamiento indebido, o `embed-key` es el contrato compartido del
  embed y le falta salir por el barrel?

Ninguna de esas cuatro se responde moviendo un `import`. Y mientras estén vivas, la regla universal
**no puede nacer en `error` con cero violaciones** (patrón canónico #7), que es su única forma
sostenible: una rule de frontera que nace debiendo una lista de exenciones ya perdió, porque la lista
se pudre y nadie la salda.

## Goal

- El barrel `src/lib/growth/ai-visibility/index.ts` cubre lo que `growth/seo` consume, y
  `grounded-query-bridge.ts` / `grounded-query-reader.ts` dejan de entrar por subpaths internos.
- Los 18 deep imports fuera del par tienen **decisión escrita**: barrel, reader acotado, command, o
  exención razonada con dueño. Ninguno queda "pendiente".
- `greenhouse/no-cross-domain-import-in-growth` vive en `error`, con **cero violaciones** y **sin
  fecha de saldo**.
- §17.3 de la arquitectura SEO y `.claude/rules/growth-seo.md` describen un invariante con detector
  universal, no una aspiración.

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
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — §1.1 (boundary SEO↔AEO), §17.3
  (regla de extracción: la que esta task hace verificable de forma universal).
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` — patrón #7: el detector es de CI, no de
  revisión de código.
- `docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md` §3.2 — spec de la única lint rule
  cross-domain existente, cuyo molde se reusa.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — un primitive, muchos consumers: es
  el criterio con el que se decide qué entra al barrel.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `.claude/rules/growth-seo.md`

Reglas obligatorias:

- 🔴 **La rule nace en `error`, nunca en `warn`, y sin lista de exenciones con fecha.** Si al llegar
  al último slice quedan violaciones, la salida correcta es **resolverlas o achicar el alcance de la
  rule con una razón escrita**, jamás bajar la severidad. El molde
  `no-cross-domain-import-from-client-portal.mjs` documenta explícitamente por qué arranca en `error`
  desde commit-1.
- 🔴 **`ai-visibility/index.ts` hace `export * from './providers'`.** Reescribir el bridge al barrel
  crudo arrastraría **todo el grafo del grader** —`anthropic-adapter`, `gemini-adapter`,
  `openai-adapter`, `perplexity-adapter`, `google-ai-overview-adapter`, `web-search-adapter`,
  `registry`— hacia `src/app/api/admin/growth/seo/grounded-queries/route.ts` y hacia el lane
  ecosystem (`src/lib/api-platform/resources/ecosystem-growth-seo.ts`), que hoy sólo importan el
  bridge. La decisión de **reader acotado en vez de barrel crudo** deja de ser opcional. Ver
  `## Detailed Spec`.
- **El barrel exporta, no envuelve.** Un re-export es una puerta; una capa de adaptación con lógica
  propia es un tercer lugar donde el comportamiento puede divergir. Si hace falta lógica, es un
  reader con nombre, no un wrapper anónimo en el barrel.
- **Se comparte cómo se OBTIENE la evidencia; nunca cómo se JUZGA.** El scoring versionado, los
  review gates y la autoría de prompts no se mueven ni se fusionan. Un `score_version` compartido
  haría que recalibrar SEO invalidara reportes AEO ya entregados a clientes: puerta de una sola
  dirección.
- **`growth/site-substrate` está exento por path**, en las dos direcciones: cualquier dominio lo
  importa con o sin subpath; él no importa ningún `@/lib/growth/*`. Es la carta que fija
  `TASK-1697`.
- **NUNCA se crea `search-visibility/`** ni se reorganizan los ~70 archivos de los dos dominios.
- **NUNCA se toca la guarda SSRF** ni el bloqueo cross-host: son de `TASK-1697` y de nadie más.

## Normative Docs

- `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` — §1.3 (defecto
  fuente), §5.1 (qué se comparte y qué no), §5.4, §5.5.
- `docs/tasks/to-do/TASK-1697-growth-site-substrate-extraction-cross-domain-lint.md` — la mitad A;
  su `## Delta 2026-08-15 (2)` es el acta de esta partición.
- `docs/tasks/to-do/TASK-1695-aeo-grounded-author-coverage-register-hygiene.md` — dueña de los dos
  archivos cuyos imports se reescriben acá.
- `eslint-plugins/greenhouse/rules/no-cross-domain-import-from-client-portal.mjs` — molde exacto.
- `eslint-plugins/greenhouse/index.mjs` y `eslint.config.mjs` — registro de rules.

## Dependencies & Impact

### Depends on

- 🔴 **`TASK-1695`** — **bloqueo duro, y es la inversión del que tenía `TASK-1697`.** `TASK-1695`
  declara `Files owned` sobre `src/lib/growth/seo/grounded-query-bridge.ts` y
  `src/lib/growth/seo/grounded-query-reader.ts`, y va a reescribir el prompt autor, la cobertura y
  el registro de versiones dentro de ellos. **La reescritura del header de imports debe caer sobre
  el archivo YA modificado por 1695, no al revés**: si esta task entra primero, 1695 rebasa sobre un
  header que cambió y el conflicto se resuelve a mano, en el archivo más delicado del bridge AEO.
  Al revés el conflicto no existe: el header es lo último que se toca y es un bloque contiguo.
- **`TASK-1697`** (mitad A) — entrega `growth/site-substrate/` y la rule angosta
  `greenhouse/growth-substrate-boundary`. La rule universal de esta task **absorbe** esa frontera:
  hay que decidir si convive como rule aparte o se pliega, sin dejar el invariante sin detector ni
  un instante.
- `TASK-1666` (`complete`) — dueña original del bridge y del reader.
- `TASK-1226` (`complete`) — el barrel de dominio AEO que esta task extiende.

### Blocks / Impacts

- **Cualquier task futura de `growth/*`** hereda el detector: un deep import cross-dominio pasa a
  romper el build. Es el efecto buscado.
- **`growth/forms`, `growth/ctas`, `growth/meetings`, `growth/public-submission`** — sus fronteras se
  deciden acá. Toda task en vuelo sobre esos dominios se ve afectada por el resultado.
- **`src/app/api/admin/growth/seo/grounded-queries/route.ts`** y
  **`src/lib/api-platform/resources/ecosystem-growth-seo.ts`** — los dos consumers del bridge; su
  grafo de módulos cambia según cómo se resuelva el punto del barrel vs reader acotado.
- **`TASK-1670`** — **no la bloquea**. 1670 depende de `TASK-1697` (el sustrato), no de esta task.
  Declararlo explícito para que nadie encadene la detección de hallazgos de sitio a un trabajo de
  higiene.

### Files owned

- `src/lib/growth/ai-visibility/index.ts`
- `src/lib/growth/seo/grounded-query-bridge.ts` · `src/lib/growth/seo/grounded-query-reader.ts`
  (sólo el header de imports; el resto es de `TASK-1695`)
- `src/lib/growth/forms/index.ts`
- `src/lib/growth/meetings/index.ts` — no existe hoy; se crea si la decisión de frontera lo exige
- `src/lib/growth/public-submission/index.ts`
- `src/lib/growth/ctas/**` y `src/lib/growth/ai-visibility/public-intake/**` — headers de imports
- `eslint-plugins/greenhouse/rules/no-cross-domain-import-in-growth.mjs` y su test
- `eslint-plugins/greenhouse/index.mjs` · `eslint.config.mjs`
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§17.3)
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `.claude/rules/growth-seo.md`

## Current Repo State

### Already exists

- **Los 30 deep imports, medidos y localizados** (2026-08-15, producción, sin tests). Los 18 fuera
  del par, con archivo y línea:
  - `ctas/commands.ts:18` · `ctas/readers.ts:11` · `ctas/ingest.ts:20` → `forms/embed-key`
  - `ctas/action-registry.ts:19` · `ctas/ingest.ts:21` → `forms/readers`
  - `ctas/action-registry.ts:20` → `meetings/store`
  - `ai-visibility/public-intake/forms-engine-binding.ts:24,25,31` → `forms/email-verification`,
    `forms/hash`, `forms/store`
  - `ai-visibility/public-intake/create-public-run.ts:18,19,20` → `forms/email-verification`,
    `forms/flags`, `forms/store`
  - `ai-visibility/public-delivery/status-reader.ts:22` → `forms/store`
  - `ai-visibility/hubspot/email-domain.ts:3` → `forms/email-verification/email-domain-data`
  - `ai-visibility/public-intake/captcha.ts:15` → `public-submission/captcha`
  - `forms/email-verification/orchestrator.ts:3` → `public-submission/abuse-guard`
  - `meetings/email-verification.ts:3` → `forms/email-verification`
  - `meetings/command.ts:5` → `public-submission/captcha`
- **El barrel de AEO**, con `export *` de 10 módulos incluyendo `./providers`, cuyo propio barrel
  re-exporta los adapters de Anthropic, Gemini, OpenAI, Perplexity, Google AI Overview y web search
  más el `registry`.
- **`forms/index.ts`**, que exporta `contracts`, `policy-compiler`, `commands`, `readers` y dos
  símbolos de `dispatch`. Su docstring ya declara la intención correcta: *"punto de entrada único
  del motor... un primitive, muchos consumers (Full API Parity)"*.
- **`ctas/index.ts`** y **`public-submission/index.ts`** existen.
- **Molde de lint rule cross-domain**: `no-cross-domain-import-from-client-portal.mjs`, con override
  block, `ImportDeclaration` + `ImportExpression` + `require`, y `HELPER_HINT` que le explica al
  desarrollador las salidas legítimas.
- **24 rules** ya registradas en `eslint-plugins/greenhouse/rules/`, con su registro en
  `eslint-plugins/greenhouse/index.mjs`.

### Gap

- **`meetings/` no tiene barrel.** `ctas/action-registry.ts:20` importa `meetings/store` porque no
  hay puerta.
- **`forms/index.ts` no exporta la mitad de lo que le importan**: `embed-key`, `store`, `hash`,
  `flags` y `email-verification` entran todos por la ventana.
- **Ninguna lint rule vigila `growth/*`.** La única cross-domain del repo protege al client-portal.
- **No hay decisión escrita** sobre si `public-submission` es dominio o primitive transversal, pese
  a que tres dominios lo consumen sólo por `captcha` y `abuse-guard`.
- **El barrel de AEO no distingue** superficie de consumo externo de volcado del dominio: `export *`
  de `providers` expone los adapters a cualquiera que importe la raíz.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/growth/**` dentro del monolito Next.js de greenhouse-eo, más el plugin ESLint en `eslint-plugins/greenhouse/`
- Future candidate home: `remain-shared`
- Boundary: cada dominio de growth expone su barrel raíz como única superficie pública; `growth/site-substrate` queda exento en ambas direcciones
- Server/browser split: sin cambio de runtime; sólo se reescriben rutas de import, y nada nuevo cruza al bundle cliente
- Build impact: `none` — sin dependencia nueva, sin input de filesystem, sin entrypoint global; la rule corre dentro del ESLint ya configurado
- Extraction blocker: `none` — la task quita bloqueos de extracción al fijar fronteras, no agrega ninguno

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `reader` (superficie de módulos; `Backend impact: none` porque no cambia API,
  DB, command, sync, cron, webhook ni integración)
- Source of truth afectado: ninguno. No toca datos, schemas ni contratos de persistencia. Lo que
  cambia es **la superficie de import** entre módulos del mismo runtime.
- Consumidores afectados: `src/app/api/admin/growth/seo/grounded-queries/route.ts` y
  `src/lib/api-platform/resources/ecosystem-growth-seo.ts` (grafo de módulos, no contrato);
  los archivos de `ctas`, `meetings` y `ai-visibility/public-intake` cuyos headers se reescriben.
- Runtime target: `local` + `production` + `worker` — el mismo código corre en Vercel y en el
  ops-worker, y `pnpm worker:runtime-deps-gate` debe seguir verde.

### Contract surface

- Contrato existente a respetar: `src/lib/growth/ai-visibility/index.ts` (barrel vigente desde
  `TASK-1226`) · `src/lib/growth/forms/index.ts` (barrel vigente desde `TASK-1229`) · las firmas de
  `createGroundedQueryDraft` y `readGroundedQueryDraft`, que **no cambian**.
- Contrato nuevo o modificado: los re-exports que se agregan a los barrels de `ai-visibility`,
  `forms` y `public-submission`; el barrel nuevo de `meetings` si la decisión de frontera lo exige;
  el reader acotado para el bridge SEO si se elige esa salida.
- Backward compatibility: `compatible`. Ningún export desaparece; los subpaths internos siguen
  existiendo, sólo dejan de ser importables desde otro dominio.
- Full API parity: `N/A — no capability`. No introduce ni modifica una acción de negocio: es un
  refactor de fronteras con detector de CI. Las capabilities que atraviesan los archivos tocados
  (`authorGraderPromptSetDraft`, `readGraderPromptSets`, `getGraderProfile`) conservan su contrato
  íntegro: cambia la ruta del `import`, no la superficie.

### Data model and invariants

- Entidades/tablas/views afectadas: **ninguna**. Cero migraciones, cero DDL, cero DML.
- Invariantes que no se pueden romper:
  - **La rule vive en `error` y sin exenciones con fecha de saldo.**
  - **El barrel exporta, no envuelve**: cero lógica de adaptación dentro de un `index.ts`.
  - **El scoring versionado, los review gates y la autoría de prompts no se mueven ni se fusionan**;
    el sanitizer no-leading del autor AEO no se toca.
  - **`growth/site-substrate` no importa `@/lib/growth/*`**, en ninguna circunstancia.
  - **El grafo de módulos de un route handler no crece sin decisión escrita**: importar el barrel
    crudo del grader desde el lane de SEO es exactamente lo que hay que evitar.
- Tenant/space boundary: sin cambio. Ningún módulo cambia cómo deriva `organization_id`.
- Idempotency/concurrency: sin cambio. No hay writes nuevos ni modificados.
- Audit/outbox/history: `none with rationale` — no hay hecho de negocio que registrar.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale` — refactor de imports con cero cambio de comportamiento.
  Un flag exigiría mantener dos rutas de import en paralelo, que es la divergencia que la task
  existe para prevenir.
- Backfill plan: N/A — sin datos.
- Rollback path: `revert PR`. Cada slice compila solo y es atómico.
- External coordination: N/A — repo-only change. Sin env vars, sin secrets, sin redeploy especial.
  La única coordinación es de orden con `TASK-1695` y `TASK-1697`.

### Security and access

- Auth/access gate: sin cambio. Ningún módulo cambia su gate.
- Sensitive data posture: `no sensitive data` en lo que esta task mueve. Cuidado nominal:
  `forms/email-verification` y `public-submission/abuse-guard` tocan datos de contacto y control de
  abuso, así que su exposición por barrel es una **decisión de frontera con consecuencia**, no un
  re-export cosmético — exponer `abuse-guard` a todo `growth/*` amplía quién puede desactivarlo por
  error.
- Error contract: sin cambio. No se introduce ni se modifica ninguna respuesta de error.
- Abuse/rate-limit posture: sin cambio de comportamiento. Ver la nota anterior sobre `abuse-guard`.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth` · `pnpm local:check` · `pnpm lint` (la rule nueva
  corre sobre todo `src/**`)
- DB/runtime checks: N/A — `repo-only change` sin persistencia ni contrato de datos.
- Integration checks: ejercitar el bridge grounded contra staging (crear y leer un draft) para
  confirmar que la reescritura de imports no cambió el comportamiento ni el `groundingMode`;
  ejercitar un submit público del grader, que atraviesa `public-intake` → `forms`.
- Reliability signals/logs: sin señales nuevas. `growth.ai_visibility.probe_failure_rate` y las
  señales de entrega de forms son los canarios si algo se rompió en el grafo.
- Production verification sequence: ver Zone 3.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

`N/A — no capability.` Esta task no introduce ni modifica una acción de negocio: no afecta estado,
permisos, datos, aprobaciones, exports, recoveries, reportes ni configuración. Es un refactor de
fronteras de módulo con detector de CI. Lo que sí hace, y conviene decirlo, es **mejorar la parity
existente**: al obligar a que cada dominio exponga su barrel, deja de haber capabilities alcanzables
sólo por deep import desde un vecino.

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

### Slice 1 — Superficie del dominio AEO para el bridge SEO

- Decidir y ejecutar la salida del punto de `providers` (ver `## Detailed Spec`): **reader acotado**
  en `ai-visibility` para el bridge SEO, o barrel crudo con evidencia medida de que no infla el
  grafo del route handler ni del lane ecosystem.
- La superficie elegida cubre los 12 símbolos que `growth/seo` consume: `getActiveBrandIntelligence`,
  `isGraderEnabled`, `isPromptAuthoringEnabled`, `authorGraderPromptSetDraft`,
  `readGraderPromptSets`, `AUTHOR_SEO_GROUNDED_SYSTEM_PROMPT_VERSION`, `computeSeoSeedCoverage`,
  `SeoGroundedKeywordContext`, `SeoSeedCoverage`, `GraderPromptSetRow`, `AuthorPromptSetStatus`,
  `getGraderProfile`.
- Comentario en el barrel explicando **por qué** cada símbolo es público: es el contrato del bridge
  SEO→AEO de `TASK-1666`, no un volcado del dominio.
- Sin `export *` de módulos internos nuevos: re-export nominal, para no colisionar con los 10
  `export *` ya existentes.

### Slice 2 — Reescritura del header del bridge y el reader

- 🔴 **Sólo después de que `TASK-1695` haya mergeado.** `grounded-query-bridge.ts:23-37` (7 imports)
  y `grounded-query-reader.ts:15-19` (5 imports) pasan a una sola ruta pública cada uno.
- El diff es **exclusivamente el bloque de imports**. Cualquier otro cambio en esos dos archivos es
  de `TASK-1695` y no entra acá.
- `pnpm typecheck` verde: es la prueba de que la superficie del Slice 1 expone exactamente lo
  necesario, ni más ni menos.
- Medir el grafo de módulos de `src/app/api/admin/growth/seo/grounded-queries/route.ts` antes y
  después. Si creció con adapters de proveedores, el Slice 1 eligió mal y se corrige acá.

### Slice 3 — Decisión de frontera de los 18 restantes

- Un pase por cada par, con **decisión escrita** en la spec: barrel, reader acotado, command, o
  exención razonada con dueño y condición de retiro.
  - `ctas` → `forms` (5) y `ctas` → `meetings` (1)
  - `ai-visibility` → `forms` (8)
  - `forms`/`ai-visibility`/`meetings` → `public-submission` (3)
  - `meetings` → `forms` (1)
- `meetings/index.ts` se crea si la decisión lo exige.
- `forms/index.ts` crece **sólo** con lo que la decisión declare público; no se convierte en un
  `export *` de todo el directorio, que sería renunciar a la frontera con otra sintaxis.
- Cada símbolo que se agrega a un barrel lleva el porqué escrito.
- Ningún cambio de comportamiento: sólo rutas de import y superficies.

### Slice 4 — `greenhouse/no-cross-domain-import-in-growth` en `error`

- `eslint-plugins/greenhouse/rules/no-cross-domain-import-in-growth.mjs`, molde
  `no-cross-domain-import-from-client-portal.mjs`. Cubre `ImportDeclaration`, `ImportExpression`,
  `require` **y `export ... from`** —un barrel que re-exporta de otro dominio es el mismo agujero con
  otra sintaxis—, con `HELPER_HINT` y `meta.docs.url` apuntando a §17.3.
- Regla, en una frase: **un archivo bajo `src/lib/growth/<dominio>/**` no puede importar un subpath
  interno de otro `src/lib/growth/<otro>/**`; sólo la raíz de su barrel.**
  - `@/lib/growth/ai-visibility` → permitido · `@/lib/growth/ai-visibility/flags` → **error**
  - `@/lib/growth/site-substrate` y sus subpaths → permitido para todos, exento por path con razón
    escrita
  - `@/lib/growth/*` **desde** `site-substrate/**` → **error**
  - imports internos del propio dominio, relativos o por alias → permitidos
- Cubrir rutas relativas que escapan del dominio (`../otro-dominio/...`), no sólo el alias `@/`.
- Resolver la convivencia con `greenhouse/growth-substrate-boundary` de `TASK-1697`: se pliega o se
  conserva, pero el invariante del sustrato **no queda sin detector ni un commit**.
- Override block en `eslint.config.mjs` para el archivo de la rule y sus tests; registro en
  `eslint-plugins/greenhouse/index.mjs`; severidad `'error'` en `eslint.config.mjs`.
- Test de la rule con casos válidos e inválidos, incluidas ambas direcciones del sustrato.
- 🔴 `pnpm lint` con **cero violaciones en el mismo commit**.

### Slice 5 — Cierre documental

- §17.3 de `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`: la regla gana su detector universal y la
  excepción nombrada del sustrato.
- `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`: delta con la superficie del bridge
  SEO→AEO tal como quedó.
- `.claude/rules/growth-seo.md`: la regla en una línea, para que cargue por path.
- Las decisiones de frontera del Slice 3 quedan escritas donde se puedan encontrar después: en la
  arquitectura del dominio correspondiente, no sólo en el commit message.
- `## Delta` en `TASK-1697` cerrando el cross-link que hoy referencia esta task por descripción.

## Out of Scope

- **El sustrato de sitio** (`growth/site-substrate/`, el `git mv`, el test de frontera y la rule
  angosta): es `TASK-1697`, la mitad A.
- **Los hallazgos de sitio del audit** (`TASK-1670`) y su superficie (`TASK-1671`). Esta task no los
  bloquea ni los desbloquea.
- **Mover el scoring versionado, la autoría de prompts o los review gates.**
- **Cambiar comportamiento de cualquier módulo.** Si un import no se puede legalizar sin cambiar
  comportamiento, la salida es exención razonada + task derivada, no un refactor oportunista.
- **Extender la rule fuera de `growth/`** (`finance`, `payroll`, `commercial`): follow-up, después de
  un ciclo con la versión de growth.
- **Crear `search-visibility/`**, `packages/*` o `apps/*`.
- **Barrel de `growth/seo`**: hoy nadie lo consume desde otro dominio. Se crea cuando haga falta.
- **Tocar el cuerpo de `grounded-query-bridge.ts` / `grounded-query-reader.ts`** más allá del header
  de imports: es de `TASK-1695`.

## Detailed Spec

### 🔴 El punto del barrel: `export * from './providers'`

`src/lib/growth/ai-visibility/index.ts:17` re-exporta el barrel de providers, que a su vez re-exporta
`anthropic-adapter`, `gemini-adapter`, `openai-adapter`, `perplexity-adapter`,
`google-ai-overview-adapter`, `web-search-adapter`, `registry`, `types` y `observation-builders`.

Hoy `grounded-query-bridge.ts` entra por siete subpaths quirúrgicos y **no arrastra nada de eso**.
Sus dos consumers son:

- `src/app/api/admin/growth/seo/grounded-queries/route.ts:5-6`
- `src/lib/api-platform/resources/ecosystem-growth-seo.ts:26-27`

Reescribirlos "al barrel" en el sentido literal metería el grafo completo del grader en un route
handler de SEO y en el lane ecosystem. Eso es peor que el deep import que se quiere arreglar: cambia
higiene de imports por peso de bundle, superficie de fallo y tiempo de arranque, en dos rutas que hoy
no tienen nada que ver con proveedores LLM.

Por eso la decisión **no es opcional**: la superficie del bridge tiene que ser un **reader acotado**
del dominio AEO —un módulo con nombre, exportado por el barrel, que expone exactamente lo que el
bridge necesita— y no la raíz cruda. Es además la opción que `TASK-1697` ya había dejado planteada en
su `## Open Questions` como `readGraderContextForSeoBridge`, y que entonces se difirió por falta de
un segundo consumidor. Ya no hace falta un segundo consumidor: el costo del barrel crudo es medible
en el grafo del route handler.

Verificación exigible, no opinión: medir el grafo de módulos del route handler antes y después. Si
creció con adapters de proveedores, la salida elegida fue la equivocada.

### Por qué la rule llega al final

Una rule de frontera en `warn` es una rule que no existe, y una rule en `error` con lista de
exenciones fechadas es la misma cosa con un calendario que nadie mira. La única forma sostenible es
llegar con cero violaciones, y para eso los slices 1–3 tienen que haber pasado. Si al llegar al
Slice 4 queda una violación que no se puede resolver, la salida correcta es **achicar el alcance de
la rule con una razón escrita** —por ejemplo, no cubrir todavía el par que quedó pendiente— y dejar
ese par como task derivada. Bajar la severidad no es una opción.

### Los 18, agrupados por la pregunta que hay que responder

| Par | Pregunta de frontera | Nota |
|---|---|---|
| `ctas` → `forms/embed-key` (3) | ¿`embed-key` es el contrato compartido del embed y le falta salir por el barrel, o `ctas` no debería conocerlo? | El más probable candidato a barrel legítimo |
| `ctas` → `forms/readers` (2) | `readers` **ya sale** por `forms/index.ts`: es un deep import que sólo hay que reapuntar | El más barato de los 18 |
| `ctas` → `meetings/store` (1) | `meetings` no tiene barrel. ¿Se crea, o `ctas` debería pedirle a `meetings` un reader? | Fuerza la creación del barrel |
| `ai-visibility` → `forms/store` (3) | ¿El grader **debe** poder escribir el store de `forms`, o el public-intake debería entrar por un command? | La decisión de fondo del lote |
| `ai-visibility` → `forms/email-verification` (2) + `email-domain-data` (1) + `forms/hash` (1) + `forms/flags` (1) | ¿Verificación de correo es superficie pública de `forms` o primitive aparte? | Toca datos de contacto |
| `meetings` → `forms/email-verification` (1) | Mismo caso, tercer consumidor: refuerza que sea superficie pública o primitive | — |
| `forms`/`ai-visibility`/`meetings` → `public-submission` (3) | ¿`public-submission` es un dominio o una primitive transversal? Tres dominios lo consumen sólo por `captcha` y `abuse-guard` | Exponer `abuse-guard` amplía quién puede desactivarlo por error |

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- 🔴 **`TASK-1695` mergeada** → Slice 2. El Slice 1 puede ir antes (sólo toca el barrel de AEO), pero
  **la reescritura del header no**: tiene que caer sobre el archivo ya modificado por 1695.
- **Slice 1 → Slice 2**: no se reescribe el header contra una superficie que todavía no existe.
- **Slice 3 es independiente** de 1 y 2; puede ir en paralelo.
- **Slice 4 (la rule) es SIEMPRE el último de código.** Subirla a `error` con violaciones vivas
  obliga a la decisión errada y la task pierde su razón de ser.
- **Coordinación con `TASK-1697`**: la mitad A debe estar mergeada antes del Slice 4, para que el
  path de exención de `site-substrate` exista y la convivencia de las dos rules se resuelva de una
  vez y no en dos commits con una ventana sin detector.
- **Slice 5 al final**: la doc describe el estado final, no el intermedio.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El barrel crudo arrastra el grafo del grader al route handler de SEO y al lane ecosystem | build / runtime | **high si no se cuida** | Reader acotado en vez de barrel crudo; medición del grafo de módulos antes/después como gate del Slice 2 | Crecimiento del bundle del route handler; tiempo de arranque del lane |
| Conflicto de merge con `TASK-1695` sobre el bridge y el reader | planificación | high | `Blocked by: TASK-1695` duro; el header es lo último que se toca y es un bloque contiguo | Conflicto en el rebase |
| Aparecen más violaciones de las 30 medidas y se baja la rule a `warn` | tooling / CI | medium | Barrido completo de `src/lib/growth/**` en Discovery, **antes** de escribir la rule; achicar alcance con razón escrita en vez de bajar severidad | `pnpm lint` en rojo — es el punto, no el fallo |
| Un barrel se convierte en `export *` de todo el directorio para "resolver rápido" y la frontera se pierde | growth / mantenibilidad | medium | Cada símbolo público lleva su porqué escrito; revisión del diff de los barrels | Un `index.ts` que crece sin comentarios |
| Exponer `public-submission/abuse-guard` por barrel amplía quién puede desactivar el control de abuso | seguridad | medium | Tratarlo como decisión de frontera con consecuencia, no re-export cosmético; si se expone, dejar por escrito quién puede tocarlo | Revisión del Slice 3 |
| El barrel de AEO colisiona nombres sobre los 10 `export *` existentes | build | medium | Re-export nominal, nunca `export *` de un módulo interno nuevo; `pnpm typecheck` como gate del Slice 1 | Fallo de compilación inmediato |
| Ciclo de imports entre barrels de dominios que se consumen mutuamente | build | medium | El DAG `seo → ai-visibility` es direccionalmente limpio, pero `forms ↔ public-submission` y `meetings ↔ forms` hay que verificarlos en Discovery antes de abrir barrels | Inestabilidad de build / orden de imports |
| Ventana sin detector al reemplazar la rule angosta de `TASK-1697` por la universal | tooling | low | Resolver la convivencia en el mismo commit; nunca borrar la angosta antes de que la universal esté en `error` | `pnpm lint` acepta un import que antes rompía |
| El bundle del ops-worker rompe por un barrel que arrastra un módulo que el worker no resuelve | cross-runtime | low | `pnpm worker:runtime-deps-gate` en el gate de cierre | Startup crash silencioso del ops-worker |

### Feature flags / cutover

`Sin flag — refactor de imports con cero cambio de comportamiento, cutover inmediato.` Un flag
exigiría mantener dos rutas de import en paralelo durante la ventana, que es exactamente la
divergencia que la task existe para prevenir. La reversibilidad la da el `revert PR`, que para un
refactor sin datos es completa.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `revert PR` — el barrel vuelve a su forma anterior; nadie consume lo nuevo todavía | ~5 min | si |
| Slice 2 | `revert PR` — los dos archivos de `seo` vuelven a sus deep imports | ~5 min | si |
| Slice 3 | `revert PR` — los barrels y los headers vuelven atrás; sin datos involucrados | ~10 min | si |
| Slice 4 | `revert PR`. **Bajar la rule a `warn` NO es rollback: es abandonar la task**; si hace falta, revertir el commit entero | ~2 min | si |
| Slice 5 | `revert PR` — doc-only | ~2 min | si |

### Production verification sequence

1. `pnpm typecheck` y `pnpm lint` verdes en local, con la rule ya en `error` y cero violaciones.
2. `pnpm vitest run src/lib/growth` verde **sin haber modificado ningún test existente**.
3. Medición del grafo de módulos de `src/app/api/admin/growth/seo/grounded-queries/route.ts` y de
   `src/lib/api-platform/resources/ecosystem-growth-seo.ts`, antes y después: no crecieron con
   adapters de proveedores.
4. `pnpm worker:runtime-deps-gate` verde.
5. `pnpm test` (suite completa) + `pnpm build` (producción) como gate de cierre, **con autorización
   explícita del operador antes de correr el build**.
6. Deploy a staging. Crear y leer un draft grounded desde el bridge: mismo resultado y mismo
   `groundingMode` que antes del cambio.
7. Ejercitar un submit público del grader en staging, que atraviesa `public-intake` → `forms` →
   `public-submission`: verificación de correo y captcha se comportan igual.
8. Verificar en `/admin/operations` que las señales de growth no se movieron respecto de la línea
   base previa.

### Out-of-band coordination required

`N/A — repo-only change.` Sin env vars, sin secrets, sin configuración de proveedor, sin
comunicación a operadores. La única coordinación es **interna de planificación**: el orden respecto
de `TASK-1695` (bloqueo duro) y `TASK-1697` (mitad A), que decide el operador.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Se declaró `Execution profile: backend-data` y `Backend impact: none`.
- [ ] `grounded-query-bridge.ts` y `grounded-query-reader.ts` tienen **cero** subpaths internos de
      `@/lib/growth/ai-visibility/**` en su header de imports.
- [ ] El diff de esos dos archivos en esta task es **exclusivamente** el bloque de imports; el resto
      del cuerpo es de `TASK-1695` y quedó intacto.
- [ ] El grafo de módulos de `src/app/api/admin/growth/seo/grounded-queries/route.ts` y de
      `src/lib/api-platform/resources/ecosystem-growth-seo.ts` **no creció** con adapters de
      proveedores LLM, medido antes y después y con la evidencia registrada en el cierre.
- [ ] La superficie del bridge SEO→AEO está documentada con el porqué de cada símbolo público; no es
      un volcado del dominio.
- [ ] Los 18 deep imports fuera del par `seo↔ai-visibility` tienen decisión escrita: barrel, reader
      acotado, command, o exención razonada con dueño y condición de retiro. **Ninguno queda sin
      decisión.**
- [ ] Ningún barrel de `growth/*` se resolvió con un `export *` del directorio completo.
- [ ] `eslint-plugins/greenhouse/rules/no-cross-domain-import-in-growth.mjs` existe, cubre
      `ImportDeclaration`, `ImportExpression`, `require` y `export ... from`, y también rutas
      relativas que escapan del dominio.
- [ ] La rule está en `'error'` en `eslint.config.mjs` y `pnpm lint` reporta **cero** violaciones en
      el mismo commit. No existe ninguna instancia de la rule en `warn` ni exención con fecha.
- [ ] `growth/site-substrate` está exento por path en **ambas direcciones**, con la razón escrita en
      el archivo de la rule, y el invariante que cubría la rule angosta de `TASK-1697` **nunca
      quedó sin detector**.
- [ ] La rule tiene test con casos válidos e inválidos, incluidas las dos direcciones del sustrato.
- [ ] `pnpm vitest run src/lib/growth` pasa sin haber modificado ningún test preexistente.
- [ ] `pnpm worker:runtime-deps-gate` verde.
- [ ] Evidencia en staging: un draft grounded creado y leído con el mismo resultado y `groundingMode`
      que antes; un submit público del grader que atraviesa `forms` y `public-submission` sin cambio.
- [ ] §17.3 de `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` nombra el detector universal y la excepción
      del sustrato; `.claude/rules/growth-seo.md` lo refleja en una línea.
- [ ] `TASK-1697` recibió su `## Delta` cerrando el cross-link que hoy la referencia por descripción.
- [ ] No existe `src/lib/growth/search-visibility/` ni ningún `packages/*` nuevo.
- [ ] `pnpm task:lint --task TASK-1713` reporta `template=1 errors=0`.

## Verification

- `pnpm vitest run src/lib/growth`
- `pnpm local:check` (lint + tsc; la rule nueva corre sobre todo `src/**`)
- `pnpm worker:runtime-deps-gate`
- `git diff --stat` por slice, como evidencia del alcance de cada movimiento
- `pnpm test` (suite completa) + `pnpm build` (producción) como gate de cierre, **con autorización
  explícita del operador antes de correr el build**.
- `pnpm task:lint --task TASK-1713` y `pnpm ops:lint --changed`
- `pnpm docs:closure-check`
- Pasos 1–8 de `### Production verification sequence`, con la evidencia de staging documentada.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Las decisiones de frontera del Slice 3 quedaron escritas en la arquitectura del dominio
      correspondiente, no sólo en el commit message.
- [ ] Cualquier par que no se pudo resolver quedó como task derivada con la exención razonada y su
      condición de retiro, nunca como severidad rebajada.
- [ ] `TASK-1697` y `TASK-1695` recibieron el `## Delta` que corresponda tras el cierre.

## Follow-ups

- **Extender la rule al resto de `src/lib/**`**: la misma forma sirve para cualquier par de dominios
  (`finance`, `payroll`, `commercial`). Evaluar después de un ciclo con la versión de `growth`, para
  no descubrir 200 violaciones legítimas de una vez.
- **Barrel de `growth/seo`**: hoy no existe `index.ts`. Cuando otro dominio lo consuma, la rule lo
  exigirá; conviene crearlo antes de que sea urgente.
- **Retirar los shims** del sustrato (`probes/safe-fetch.ts`, `probes/html.ts`, los tipos de
  `probes/contracts.ts`) reescribiendo los 7 dependientes de producción. Follow-up heredado de
  `TASK-1697`; conviene hacerlo con la rule universal ya viva, que lo vuelve verificable.

## Open Questions

1. **¿Reader acotado o barrel crudo para el bridge SEO?** La task propone reader acotado
   (`readGraderContextForSeoBridge` o equivalente) por el punto de `providers`. El barrel crudo sólo
   es defendible si la medición del grafo demuestra que no infla el route handler ni el lane
   ecosystem — y esa medición es parte del Slice 2, no una promesa.
2. **¿`public-submission` es dominio o primitive transversal?** Tres dominios lo consumen sólo por
   `captcha` y `abuse-guard`. Si es primitive, va exento por path como `site-substrate` y le
   corresponde su propia carta verificable. Si es dominio, abre barrel y expone lo mínimo. La
   segunda opción es más conservadora; la primera es más honesta con cómo se usa.
3. **¿La rule debe permitir `import type` de subpath entre dominios?** Serían inocuos en runtime pero
   igual acoplan la forma interna. La task propone prohibirlos igual —un tipo público es un export
   del barrel—, pero es el caso donde una exención es más defendible.
4. **¿La rule angosta de `TASK-1697` se pliega o convive?** Plegar es más limpio pero exige que
   ambas cosas pasen en el mismo commit. Convivir deja dos rules con solapamiento parcial. La task
   propone plegar, en el mismo commit, con el test de la universal cubriendo los casos de la angosta.

# TASK-1778 — Growth: endurecer el fetcher de sitio para uso comercial (SSRF, tope real, truncado honesto, robots)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

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
- Backend impact: `integration`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

`probes/safe-fetch.ts` es el único fetcher con el que Greenhouse lee sitios de terceros, y es la pieza
sobre la que se apoyan el grader AEO público y —desde el `Delta 2026-08-26` de `TASK-1709`— el
diagnóstico comercial de prospectos. Una auditoría de código encontró **cuatro defectos**: dos de
seguridad (`ISSUE-164`: redirects sin revalidar + host sin resolver DNS) y dos de exactitud del
hallazgo (el tope de 1 MiB no protege memoria y el truncado es silencioso, así que el probe puede
**afirmar ausencia de datos estructurados** sobre un sitio que sí los tiene). Esta task los cierra y
deja el fetcher en estado defendible frente a un cliente.

## Why This Task Exists

**Una guarda es una afirmación hasta que un mecanismo la sostenga**, y este archivo tiene tres
afirmaciones sin mecanismo.

La cabecera promete `redirect: 'follow'` *"acotado al mismo registrable host"*: no existe una sola
línea que acote los redirects. El comentario de `isNonPublicHost` admite que *"no resuelve DNS"*, lo
cual está bien como defensa en profundidad y mal como única defensa cuando **el sujeto es input
público no confiable** — el grader tiene intake abierto y cualquiera somete el dominio que quiera. El
detalle de `ISSUE-164`.

El tercer defecto no es de seguridad y es el que más caro sale comercialmente. `maxBytes` se aplica
**después** de `await response.text()`, que ya bufferizó el cuerpo entero: el único freno real de
memoria es el pre-check de `content-length`, header que **no existe** en respuestas
`Transfer-Encoding: chunked` — o sea, en la mayoría de los sitios detrás de CDN. Y cuando trunca, no
deja rastro: `ProbeFetchResult` sólo emite `too_large` en el caso del `content-length` declarado, así
que un truncado post-hoc vuelve con `errorCode: null` y el probe lo trata como respuesta completa.
Como **muchos CMS y plugins de SEO inyectan el JSON-LD al final del `<body>`**, un sitio de más de
1 MiB de HTML descomprimido produce el hallazgo *"no tiene datos estructurados"* cuando sí los tiene.
Ese falso negativo no se queda en un log: viaja a un informe que firmamos y le entregamos a un
prospecto.

El cuarto es contractual. `TASK-1709` declara que el carril respeta `robots.txt`. Con OnPage es cierto
(su default es `merge` y la task prohíbe el override). Con **nuestro** fetcher no hay ningún camino de
código que lo obedezca: leemos `/robots.txt` para *analizarlo*, nunca para acatarlo. O se implementa,
o la promesa se acota al carril OnPage; dejarla escrita sin mecanismo es exactamente el patrón que
esta task existe para erradicar.

Nada de esto está vivo en producción —ambos flags consumidores están `prod: OFF`— y esa es
precisamente la ventana. La fecha límite no es una alerta: es el flip.

## Goal

- Contención de redirects **implementada**, no comentada: `redirect: 'manual'` con revalidación de
  cada salto, espejando el patrón que `entity-fetch.ts:90` ya usa en el mismo directorio.
- Guarda de host que **resuelve DNS** antes de conectar y rechaza cualquier dirección no pública, en
  la URL inicial y en cada redirect.
- Tope de tamaño que **realmente acote la memoria** (lectura por stream, corte duro) y que **deje
  rastro** cuando trunca, para que el probe degrade honestamente en vez de afirmar ausencia.
- `robots.txt` **obedecido** por el fetcher propio (decidido 2026-08-26), matcheando nuestro propio
  token de UA y jamás los de los bots de IA que auditamos.
- Un probe de presencia **nunca** concluye ausencia sin evidencia de que pudo observar: `res.ok` deja
  de leerse como *"observé la página"*.
- Cero regresión de cobertura: los redirects legítimos que hoy funcionan —`http → https`,
  `apex ↔ www`— **deben seguir funcionando**. Un fix de seguridad que bloquea medio internet cambia un
  riesgo por una caída de exactitud.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — contrato del grader,
  degradación honesta (`score: null ≠ 0`) y el sustrato de probes.
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — §1.1 (boundary SEO↔AEO: esta task
  vive del lado AEO y no cruza), §5 (contrato de honestidad: un dato faltante nunca se presenta como
  medido).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — el fetcher es primitive compartido;
  el fix es uno solo para todos los consumers.
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md` — postura de
  observabilidad (`captureWithDomain`, jamás `Sentry.captureException` directo desde `src/lib/**`).
- `CLAUDE.md §"Solution Quality Contract"` — causa compartida antes que parche local: hay **dos**
  fetchers con el mismo defecto de truncado y **un** patrón correcto de redirects ya en el repo.

Reglas obligatorias:

- **NUNCA** dejar en el archivo un comentario que afirme una garantía que el código no implementa. Si
  se documenta una contención, hay un test que falla cuando se rompe.
- **NUNCA** introducir un segundo fetcher. `fetch-site-content.ts` reusa `createProbeFetcher` y esa
  higiene se conserva: un fix, todos los consumers.
- **NUNCA** hacer que el fetcher lance. El contrato es `ok=false` + `errorCode`; los probes traducen a
  degradación honesta.
- **NUNCA** enviar credenciales, cookies ni cabeceras de autenticación: es un lector de superficies
  públicas.
- **NUNCA** exponer el error crudo del proveedor o de la red al cliente; el detalle va a
  `captureWithDomain`.

## Normative Docs

- `docs/issues/open/ISSUE-164-probe-fetcher-redirect-containment-not-implemented.md` — el issue dueño
  de los dos defectos de seguridad, con su verificación.
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` — estado de `GROWTH_AI_VISIBILITY_PROBES_ENABLED` y
  `GROWTH_AI_VISIBILITY_BRAND_INTELLIGENCE_ENABLED` (ambos `staging: ON` · `prod: OFF`).
- `.claude/skills/dataforseo-operator/references/04-onpage.md` — §7 gotcha 3: OnPage respeta
  `robots.txt` por defecto (`merge`); contexto del carril alternativo.

## Dependencies & Impact

### Depends on

- `src/lib/growth/ai-visibility/probes/safe-fetch.ts` (`TASK-1266`) — el archivo que se endurece.
- `src/lib/growth/ai-visibility/probes/contracts.ts` — `ProbeFetchResult` / `ProbeFetchErrorCode`,
  que ganan el rastro de truncado (aditivo).
- `src/lib/growth/ai-visibility/probes/entity-fetch.ts` — **referencia del patrón correcto**
  (`redirect: 'manual'`), y segundo portador del mismo defecto de truncado.
- `src/lib/observability/capture.ts` — `captureWithDomain`.

### Blocks / Impacts

- 🔴 **Bloquea el flip a producción** de `GROWTH_AI_VISIBILITY_PROBES_ENABLED` y
  `GROWTH_AI_VISIBILITY_BRAND_INTELLIGENCE_ENABLED`. Ese es el hito real de cierre, no el merge.
- **`TASK-1697`** (`P0`) — mueve este archivo a `@/lib/growth/site-substrate`. **Orden declarado:
  esta task va PRIMERO.** 1697 es un `git mv` cuyo valor entero es que ningún dependiente cambie una
  línea; mover un archivo con un defecto de seguridad conocido lo consagra como "sustrato canónico"
  con el defecto adentro. Si por secuencia real 1697 entrara antes, esta task aplica sobre la
  ubicación nueva sin cambiar su alcance.
- **`TASK-1709`** (`Delta 2026-08-26`) — su `Slice 2b` delega la evidencia de sitio en este sustrato.
  Su criterio de robots deja de ser una afirmación cuando esta task cierra.
- **`TASK-1670`**, **`TASK-1701`** — consumidores futuros del sustrato; heredan el fix por
  construcción.
- **`TASK-1288`** (`complete`) — su `fetch-site-content` hereda el fix sin cambiar una línea.

### Files owned

- `src/lib/growth/ai-visibility/probes/safe-fetch.ts`
- `src/lib/growth/ai-visibility/probes/contracts.ts` (aditivo)
- `src/lib/growth/ai-visibility/probes/entity-fetch.ts` (sólo el defecto de truncado compartido)
- `src/lib/growth/ai-visibility/probes/robots-policy.ts`
- `src/lib/growth/ai-visibility/__tests__/probes-safe-fetch-hardening.test.ts`
- `docs/issues/open/ISSUE-164-probe-fetcher-redirect-containment-not-implemented.md` (cierre)

## Current Repo State

### Already exists

- Fetcher único y reusado: `createProbeFetcher` + `resolveSubjectSite`
  (`probes/safe-fetch.ts`, 185 líneas), consumido por el gatherer de probes y por
  `brand-intelligence/fetch-site-content.ts` — **no hay duplicación que reconciliar**.
- Guard de entrada `resolveProbeUrl`: exige `http(s)`, rechaza hosts no públicos **literales** y
  acota al hostname del sujeto.
- `isNonPublicHost`: loopback, link-local + metadata (`169.254.0.0/16`), privados
  (`10/8`, `172.16/12`, `192.168/16`), CGNAT (`100.64/10`), IPv6 loopback/link-local/ULA,
  `.localhost`/`.local`/`.internal`.
- Postura de cortesía ya correcta: UA identificable, `AbortSignal.timeout` con techo de 20 s,
  `cache: 'no-store'`, ejecución **secuencial** de probes en el gatherer (*"no martillar con N
  requests concurrentes"*).
- Contrato que nunca lanza: `ok=false` + `errorCode` (`blocked | too_large | http_error | timeout | network`).
- **El patrón correcto de redirects, ya escrito**: `entity-fetch.ts:90` usa `redirect: 'manual'`.
- Ambos consumers `staging: ON` · `prod: OFF` — ventana de corrección abierta.

### Gap

- `safe-fetch.ts:100` usa `redirect: 'follow'` y **ningún** código revalida el host final, pese a que
  la cabecera (`:10`) afirma lo contrario.
- `isNonPublicHost` **no resuelve DNS** (`:28`): un hostname público que apunta a rango privado pasa.
- `safe-fetch.ts:126-127` (y `entity-fetch.ts:107-108`) bufferizan el cuerpo completo con
  `await response.text()` **antes** de truncar: el tope no protege memoria y el `content-length`
  pre-check no aplica a respuestas `chunked`.
- El truncado post-hoc **no deja rastro**: `errorCode` queda `null` y el probe trata la respuesta como
  completa.
- No existe obediencia de `robots.txt` en el fetcher propio.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/growth/ai-visibility/probes/**`, con destino declarado `@/lib/growth/site-substrate` por `TASK-1697`
- Future candidate home: `domain-package`
- Boundary: primitives `createProbeFetcher` · `resolveSubjectSite` · `resolveProbeUrl`; consumers autorizados son el gatherer de probes, `brand-intelligence/fetch-site-content` y los futuros consumidores del sustrato
- Server/browser split: el módulo es `server-only` y así permanece; ninguna resolución de red llega al browser
- Build impact: puede sumar una dependencia de resolución DNS/red del runtime Node; se declara en el Slice que la introduzca y se mantiene fuera de cualquier bundle de cliente
- Extraction blocker: `none` — el módulo ya es puro respecto del dominio y no persiste

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: ninguno persistente; el contrato afectado es `ProbeFetchResult` y la frontera de red del runtime
- Consumidores afectados: gatherer de probes (`TASK-1266`), `brand-intelligence` (`TASK-1288`), y los consumidores futuros del sustrato (`TASK-1670`, `TASK-1701`, `TASK-1709`)
- Runtime target: `staging` → `production` (Vercel + ops-worker)

### Contract surface

- Contrato existente a respetar: `ProbeFetcher` / `ProbeFetchInit` / `ProbeFetchResult` de `probes/contracts.ts`; la regla de que el fetcher **nunca lanza**.
- Contrato nuevo o modificado: `ProbeFetchErrorCode` gana `blocked_redirect` y `blocked_private_address`; `ProbeFetchResult` gana `truncated: boolean` (**aditivo**, default `false`).
- Backward compatibility: `compatible` en el tipo (campos aditivos) y **deliberadamente `gated` en comportamiento**: una cadena de redirects que hoy se sigue a ciegas puede pasar a `blocked`. Por eso hay flag de corte (ver `Feature flags / cutover`).
- Full API parity: `N/A — no capability`. Es un primitive interno de infraestructura, sin acción de negocio propia ni superficie.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna. Esta task **no toca DB ni migraciones**.
- Invariantes que no se pueden romper:
  - El fetcher **nunca lanza**: todo fallo es `ok=false` + `errorCode`.
  - Toda garantía documentada en la cabecera tiene un test que falla si se rompe.
  - Un cuerpo truncado **nunca** se entrega como completo: `truncated: true` viaja al probe y el probe degrada en vez de afirmar ausencia.
  - Cobertura no regresiona: `http → https` y `apex ↔ www` siguen resolviendo.
  - Un solo fetcher; `fetch-site-content` sigue reusándolo.
- Write-target allowlist: `N/A` — la task no escribe en ninguna tabla.
- Tenant/space boundary: `N/A` — el fetcher no lee datos de tenant; su único input es la URL del sujeto.
- Idempotency/concurrency: `GET` puro sin estado; el gatherer sigue ejecutando probes secuencialmente.
- Audit/outbox/history: sin evento nuevo. Los rechazos por guarda se observan con `captureWithDomain` en nivel `info`, con `host` en `extra` y **sin** cuerpo de respuesta.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `flag OFF` para el endurecimiento de red (Slices 1–2), de modo que el comportamiento estricto se pueda apagar sin revert si rompe cobertura en staging. Los Slices 3–4 no llevan flag: corregir un truncado silencioso no tiene modo "menos correcto".
- Backfill plan: `N/A` — no hay datos históricos que reparar. Los resultados de probes previos quedan como están: son mediciones de su momento.
- Rollback path: flag a `false` (vuelve el comportamiento actual de red) o revert del PR. Sin estado que deshacer.
- External coordination: ninguna fuera del repo. **Sí** hay una precondición operativa: ningún flag consumidor puede pasar a `prod: ON` antes del merge.

### Security and access

- Auth/access gate: `N/A` — el fetcher no autentica ni es alcanzable directamente; se invoca desde el gatherer y desde brand-intelligence.
- Sensitive data posture: el riesgo es exactamente el inverso al habitual — **no** exfiltrar hacia afuera, sino **traer** hacia adentro contenido de superficies internas. El fix es la guarda; el cuerpo de una respuesta bloqueada nunca se lee ni se persiste.
- Error contract: `errorCode` de vocabulario cerrado; `captureWithDomain` en `info` para el diagnóstico, sin cuerpo ni URL interna en el resultado devuelto.
- Abuse/rate-limit posture: se conserva la ejecución secuencial del gatherer; se agrega tope explícito de saltos de redirect. El rate limit por host entre corridas concurrentes queda como follow-up declarado.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/ai-visibility` con los casos adversariales del `ISSUE-164`.
- DB/runtime checks: `N/A` — la task no toca PostgreSQL.
- Integration checks: corrida real del grader en staging sobre (a) un dominio con `apex → www`, (b) un dominio con `http → https`, (c) un sitio de más de 1 MiB de HTML con JSON-LD **al final del body**, verificando que el hallazgo cambia de "sin datos estructurados" a detectado o a truncado declarado.
- Reliability signals/logs: conteo de `blocked_redirect` / `blocked_private_address` en Sentry por `source: growth_ai_visibility_probe_fetch`; un salto brusco tras el flip significa que la guarda quedó demasiado estricta.
- Production verification sequence: ver `Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumidores nombrados con paths reales.
- [ ] Invariantes y postura de concurrencia explícitos; `N/A` de tenant y DB justificados.
- [ ] Sin tablas nuevas: no aplica allowlist de destinos de escritura.
- [ ] Postura de migración/rollback explícita y proporcional (flag de corte para el cambio de comportamiento de red).
- [ ] Evidencia runtime listada, incluida la corrida en staging sobre los tres casos reales.
- [ ] Errores canónicos, observabilidad sin fuga de cuerpo ni de URL interna.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contención de redirects implementada

- `redirect: 'manual'` + bucle propio de saltos con tope (`MAX_REDIRECTS`, propuesta: 5), revalidando
  **cada** `Location` con `resolveProbeUrl` antes de seguirlo.
- `resolveProbeUrl` deja de exigir igualdad exacta de hostname y pasa a aceptar la **familia del
  sujeto**: mismo host, o el par `apex ↔ www` (ver `Detailed Spec` §2). Todo lo demás → `blocked_redirect`.
- Un salto rechazado devuelve `{ ok: false, errorCode: 'blocked_redirect', body: '' }`: el cuerpo del
  destino no se lee.
- Cabecera del archivo reescrita para describir lo que el código hace, con test que falla si divergen.

### Slice 2 — Guarda de host que resuelve DNS

- Resolución del hostname (A/AAAA) antes de conectar; si **alguna** dirección resuelta cae en rango no
  público → `blocked_private_address`. Se aplica a la URL inicial **y a cada salto**.
- Reuso de la clasificación de rangos ya escrita en `isNonPublicHost`, extraída a un helper que opera
  sobre direcciones resueltas además de literales.
- Nota de honestidad en el código: entre la resolución y la conexión hay una ventana TOCTOU. Se
  documenta como riesgo residual aceptado y se declara la mitigación real (pin de la IP resuelta) como
  follow-up, en vez de fingir que no existe.

### Slice 3 — Tope real y truncado con rastro

- Lectura por stream con corte duro al superar el tope, en vez de `await response.text()` completo:
  el tope pasa a proteger memoria de verdad, incluso sin `content-length` (respuestas `chunked`).
- Tope por defecto a **4 MiB** (ver `Detailed Spec` §3), configurable por `ProbeFetchInit`.
- `ProbeFetchResult.truncated: boolean` (aditivo, default `false`). Los probes que afirman **ausencia**
  —JSON-LD, `potentialAction`, landmarks— degradan a `skipped` con razón explícita cuando
  `truncated === true`, en vez de reportar "no tiene".
- El mismo arreglo de lectura aplicado a `entity-fetch.ts:107-108`: es el mismo defecto y el
  `Solution Quality Contract` pide cerrar la causa compartida, no un callsite.
- 🔴 **Invariante de observabilidad (decidido 2026-08-26, absorbido desde `TASK-1281`).** El truncado
  es un caso particular de una clase mayor: **un probe de presencia jamás concluye ausencia sin
  evidencia de que pudo observar**. Hoy `structural/json-ld.ts:20-38` lee `res.ok` como *"observé la
  página"* cuando sólo significa *"recibí bytes"*, y su propio comentario declara la suposición
  (*"Ausencia MEDIDA → score 0"*). Se agrega `observable: boolean` al resultado, alimentado por
  señales baratas y **asimétricas por diseño — sólo pueden RETIRAR una afirmación, nunca agregar
  una**: `truncated === true`; cuerpo bajo un umbral tras retirar `script`/`style`; raíz única vacía
  (`<div id="root">`, `<div id="__next">`); `<noscript>` pidiendo habilitar JS; razón texto/markup
  cercana a cero. Con `observable === false` los probes de presencia degradan a `skipped` con razón
  explícita, **nunca** `score: 0`. Es el mismo primitive que `NO_HEADLESS_OUTCOME` ya aplica a los
  probes headless-dependientes, extendido a los que hoy no lo tienen.

### Slice 4 — `robots.txt` obedecido, o la promesa acotada

- `robots-policy.ts`: parser mínimo de `robots.txt` (grupos `User-agent`, `Disallow`, `Allow`,
  match por prefijo con `$`/`*`) y predicado `isPathAllowed(robotsTxt, path, userAgent)`.
- El fetcher consulta la política **una vez por sujeto** (el `robots.txt` ya se descarga para el probe
  que lo analiza: se reusa esa lectura, no se pide de nuevo) y devuelve `blocked` para toda ruta
  prohibida.
- 🔴 **El propio `/robots.txt` siempre es alcanzable** — pedirlo es cómo se conoce la política, y su
  contenido sigue siendo un hallazgo válido aunque prohíba todo lo demás.
- 🔴 **Decidido 2026-08-26: se implementa la obediencia.** El razonamiento completo está en
  `Detailed Spec` §5. El slice deja de ser condicional.
- 🔴 **Se matchea NUESTRO token de UA (`GreenhouseAEOGrader`), nunca los tokens de los bots de IA que
  auditamos**, con fallback a `*`. Un sitio con `User-agent: GPTBot / Disallow: /` y `User-agent: * /
  Allow: /` **debe seguir siendo legible por nosotros**, y *"bloqueas GPTBot"* sigue siendo el
  hallazgo. Matchearnos contra esos grupos —o "actuar como" GPTBot para probar— nos dejaría fuera de
  **exactamente los sitios cuyo bloqueo es lo más valioso que tenemos para decir**.
- Un `Disallow` que nos alcanza produce **hallazgo**, no fallo: *"no pudimos leer el sitio porque tu
  `robots.txt` lo prohíbe"*, con su lente. Misma asimetría que el resto de la task.

### Slice 4b — Override de User-Agent, con la postura declarada

- `ProbeFetchInit` gana `userAgent?: string`, **aditivo**, con default `COURTESY_USER_AGENT`. Hoy el
  UA es constante de módulo (`safe-fetch.ts:25`) y no hay forma de variarlo por llamada.
- 🔴 **La postura, que es lo que esta task aporta y no el parámetro:** el override sirve para variar
  **nuestro propio token** (por ejemplo `GreenhouseAEOGrader-EdgeCheck/1.0`), **NUNCA** para
  presentarse como el crawler de un tercero. Suplantar `GPTBot` u `OAI-SearchBot` es suplantación de
  identidad, algunos WAF la verifican por DNS inverso, y aparecer como evasor tiene costo
  reputacional para el dominio desde el que auditamos. Es coherente con la regla ya declarada en
  esta misma task de matchear sólo nuestro token en `robots.txt`.
- **Desbloquea a `TASK-1670`**, cuyo chequeo de acceso en el borde hoy no es implementable: esa task
  declara cero ediciones sobre `ai-visibility/**` y `TASK-1697` prohíbe tocar el UA en su diff de
  movimiento. Este es el único lugar donde el cambio cabe.
- ⚠️ Consecuencia para `TASK-1670`: su Slice 1, tal como está escrito, hace `GET` del home **con UA
  de un bot de retrieval**. Eso contradice la postura de arriba. Al cerrar esta task, dejarle un
  `## Delta` a 1670 con la corrección: el chequeo de borde se hace con nuestro token variado, y lo
  que se mide es si el borde nos trata distinto, no si podemos hacernos pasar por otro.

### Slice 5 — Evidencia real y cierre

- Suite adversarial: redirect a IP privada, a host público distinto, cadena que excede el tope de
  saltos, hostname público que resuelve a rango privado, respuesta `chunked` gigante sin
  `content-length`, y HTML de más del tope con JSON-LD al final.
- Corrida real en staging sobre los tres dominios del `Runtime evidence`.
- Cierre de `ISSUE-164` (mover a `resolved/` + tracker), delta en la arquitectura del grader,
  `Handoff.md`, `changelog.md`, y actualización del `Delta 2026-08-26` de `TASK-1709` según lo que
  resuelva el Slice 4.

## Out of Scope

- **Renderizado JS / headless.** Es `TASK-1281` (`HeadlessRenderer` con Chromium en el ops-worker).
  Esta task no lo adelanta ni lo bloquea; son defectos distintos del mismo fetcher.
- **Rate limit por host entre corridas concurrentes.** El gatherer ya es secuencial dentro de una
  corrida; coordinar N corridas es follow-up declarado.
- **Caché de respuestas entre corridas.**
- **Mover el archivo a `@/lib/growth/site-substrate`.** Es `TASK-1697`. Esta task endurece el archivo
  donde esté.
- **Cambiar el parser de JSON-LD** (`html.ts`, regex). Defecto menor conocido, sin dueño acá.
- **Tocar el scoring, el report contract o cualquier superficie visible del grader.**
- **Cualquier cambio a OnPage de DataForSEO.** El otro carril de fetch ya respeta `robots.txt` por
  default del proveedor y no se toca.

## Detailed Spec

### 1. Por qué el patrón correcto no hay que diseñarlo

`entity-fetch.ts:88-90` ya resuelve el mismo problema con la forma correcta:

```ts
// No se siguen redirects a hosts fuera de la allowlist: si la API redirige
// [...]
redirect: 'manual',
```

La diferencia entre los dos archivos no es de dificultad: es que uno acota por **allowlist de hosts
de terceros** y el otro por **familia del host del sujeto**. El mecanismo —`manual` + bucle propio +
revalidación por salto— es idéntico. Que el patrón esté a cuarenta líneas de distancia y no se haya
aplicado acá es la evidencia de que fue un descuido, no una decisión.

### 2. 🔴 El detalle que puede convertir un fix de seguridad en una caída de exactitud

Hoy `resolveProbeUrl` exige `url.hostname === base.hostname`. Con `redirect: 'follow'`, esa
restricción **sólo se aplica a la URL inicial**, y por eso los redirects legítimos funcionan por
accidente: `resolveSubjectSite` siempre construye `baseUrl` como `https://${hostname}`, así que un
sujeto ingresado como `ejemplo.cl` que redirige a `www.ejemplo.cl` hoy se sigue sin problema.

Si el Slice 1 se implementa revalidando cada salto **con igualdad exacta de hostname**, ese caso pasa
a `blocked` — y `apex → www` es uno de los redirects más comunes de la web. El resultado sería un
grader que devuelve `blocked` para una fracción enorme de sitios reales: cambiaríamos un riesgo de
seguridad por una pérdida masiva de cobertura, en silencio y con los tests verdes.

Regla a implementar, deliberadamente conservadora:

- **Permitido**: mismo hostname; el mismo hostname con `www.` agregado o quitado; upgrade de esquema
  `http → https` sobre cualquiera de los dos.
- **Bloqueado**: todo lo demás, incluidos otros subdominios del mismo dominio registrable.

Se descarta a propósito calcular el dominio registrable (eTLD+1) en esta task: hacerlo bien exige la
Public Suffix List —la heurística de "las dos últimas etiquetas" da `com.mx` para `berel.com.mx`, que
es exactamente el mercado que operamos— y sumar esa dependencia merece su propia decisión. Si aparece
un caso real de redirect legítimo a otro subdominio, se atiende con evidencia, no por anticipado. Ver
`Open Questions`.

### 3. Por qué 4 MiB y no 1

`response.text()` entrega el HTML **descomprimido**. Con una compresión típica de HTML, una página de
200 KB en tránsito ronda 1–1,5 MB de texto, así que el tope actual se cruza sin que el sitio sea
exótico: basta un catálogo, un enterprise con mucho markup, o SVG/base64 inline.

4 MiB deja margen para esa cola larga sin volver ilimitado el consumo, y **con el Slice 3 el número
importa menos**: lo que hoy es peligroso no es el valor del tope sino que (a) no protege memoria y
(b) trunca sin avisar. Con lectura por stream y `truncated: true`, cruzar el tope deja de producir un
hallazgo falso y pasa a producir una degradación honesta.

El valor queda como constante nombrada y configurable por `ProbeFetchInit`, no hardcodeado en el
cuerpo del fetch.

### 4. El truncado como falso negativo, no como detalle técnico

Los probes que buscan **presencia** de algo (JSON-LD, `potentialAction`, landmarks) tienen una
asimetría peligrosa: encontrar es prueba, no encontrar no lo es. Sobre un cuerpo truncado, "no
encontré" no significa "no está" — significa "no miré todo".

Por eso `truncated` no puede quedarse en el fetcher: tiene que llegar al probe, y el probe tiene que
degradar a `skipped` con razón explícita. Es el mismo invariante que el grader ya sostiene con
`score: null ≠ 0`, aplicado un nivel más abajo. Sin esto, el resto del Slice 3 es cosmético.

### 5. Por qué obedecemos `robots.txt` (decidido, no opcional)

Cuatro razones, la primera decisiva:

1. **Vendemos higiene de crawlers.** La práctica AEO de Efeonce le dice al cliente *"permite retrieval,
   decide training según tu postura de licenciamiento"* y le entrega el `robots.txt` recomendado. Un
   proveedor de ese consejo que ignora `robots.txt` es autorrefutable, y la asimetría reputacional es
   brutal: si el dev del prospecto lo nota en sus logs, la historia se escribe sola.
2. **Precedente en nuestra propia categoría.** El escándalo público de Perplexity por no honrar
   `robots.txt` es reciente, caro y del mismo rubro. No hay que descubrirlo por cuenta propia.
3. **Obedecer cuesta ≈ 0.** El `robots.txt` **ya se descarga** para el probe que lo analiza: obedecerlo
   es un predicado sobre un objeto que ya tenemos en memoria. Cero requests extra, cero latencia extra.
4. **La cobertura perdida también es ≈ 0, y hay dato.** El estudio Rutgers/Wharton (dic-2025) mide que
   los publishers que bloquearon crawlers de IA perdieron **−23,1% de tráfico total sin reducir de
   forma fiable las citas**: bloquear es net-negativo, y por eso es raro entre sitios que quieren ser
   encontrados — que es exactamente el perfil de un prospecto nuestro. Y el sitio que **sí** bloquea
   todo es aquel cuyo bloqueo es el titular del diagnóstico.

Dos excepciones que hacen que la regla funcione:

- **`/robots.txt` siempre es alcanzable.** Por definición no está gobernado por sí mismo: no se puede
  conocer la política sin leerla.
- **El matching es contra nuestro propio token**, con fallback a `*` — ver `Slice 4`. Es la trampa de
  diseño de este slice: matchearnos contra los grupos de los bots que auditamos crearía un bucle
  autodestructivo en el que **cuanto peor la postura AEO del sitio, menos podríamos diagnosticarla**.

Nota de honestidad: `ANTIPATTERNS.md` de la skill `seo-aeo` **no cubre** esta decisión — no hay
guardrail escrito sobre ética de rastreo. El juicio se apoya en el módulo `01_SEO_TECHNICAL.md` §6
(familias de bots, dato Rutgers/Wharton) y en la exposición comercial, y queda registrado acá para que
el siguiente agente no tenga que rederivarlo.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (redirects) y Slice 2 (DNS) cierran `ISSUE-164` y **deben viajar juntos**: separarlos deja
  el issue medio cerrado, y la mitad que falte es la que un atacante usa.
- Slice 3 (tope + truncado) es independiente y puede correr en paralelo.
- Slice 4 (robots) depende de Slice 1 sólo por convivencia en el mismo archivo, no por lógica.
- Slice 5 al final. 🔴 **`ISSUE-164` no se mueve a `resolved/` hasta que la corrida real en staging
  pase**: los tests unitarios prueban la guarda, no prueban que la cobertura sobrevivió.
- 🔴 **Regla dura externa: ningún flag consumidor puede pasar a `prod: ON` antes del merge de los
  Slices 1–2.** Es la única precondición fuera de esta task.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| La revalidación por salto con igualdad exacta de hostname bloquea `apex → www` y el grader pierde cobertura masiva, en silencio y con tests verdes | growth / exactitud | **high** | Regla de familia del sujeto del `Detailed Spec` §2 (`www` togglable + upgrade de esquema); test explícito de los dos casos; corrida real en staging antes de cerrar el issue | Salto brusco de `blocked_redirect` en Sentry tras el flip del flag |
| Resolver DNS agrega latencia y hace expirar corridas que hoy pasan | growth / runtime | medium | La resolución entra dentro del presupuesto del `AbortSignal.timeout` existente; medir en la corrida real de staging | Aumento de `errorCode: 'timeout'` |
| TOCTOU entre resolver y conectar: el DNS cambia en la ventana | seguridad | low | Documentado como riesgo residual aceptado; mitigación real (pin de IP resuelta) declarada como follow-up, no fingida como resuelta | Sin señal — es límite conocido |
| Subir el tope a 4 MiB aumenta el consumo de memoria por corrida | runtime | low | Lectura por stream con corte duro: el tope pasa a ser un techo real, cosa que hoy no es a ningún valor | Memoria del runtime en el flip |
| El parser de `robots.txt` interpreta de más y bloquea rutas permitidas | growth / cobertura | medium | Parser mínimo y conservador (ante ambigüedad, permitir); `/robots.txt` siempre alcanzable; tests con los `robots.txt` reales de dominios de la cartera | Caída de probes con `blocked` sobre sitios sin `Disallow` relevante |
| El fix se aplica sólo a `safe-fetch` y `entity-fetch` queda con el mismo defecto de truncado | mantenimiento | medium | Slice 3 incluye ambos archivos explícitamente; el `Solution Quality Contract` pide causa compartida | Revisión cruzada al cerrar |
| `TASK-1697` mueve el archivo antes de este fix y consagra el defecto como sustrato canónico | arquitectura | medium | Orden declarado en `Blocks / Impacts` y en `ISSUE-164`; si el orden se invierte, esta task aplica sobre la ubicación nueva | Revisión de secuencia en Discovery |

### Feature flags / cutover

- `GROWTH_PROBE_FETCH_STRICT_NETWORK_ENABLED` (default `false`) gatea **sólo** el comportamiento de
  red de los Slices 1–2. Existe por una razón concreta: el cambio de red puede recortar cobertura de
  formas que ningún test anticipa, y quiero apagarlo en segundos sin revert ni redeploy.
- **Se lee en los dos runtimes que ejecutan probes**: Vercel (path síncrono) y ops-worker (path
  async). Declararlo en `services/ops-worker/deploy.sh` **y** aplicarlo con `--update-env-vars`,
  porque `--set-env-vars` es destructivo.
- Fila obligatoria en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR; el gate
  `pnpm docs:closure-check` falla si falta.
- Los Slices 3–4 **no** llevan flag: un truncado silencioso no tiene modo "menos correcto" que
  valga la pena conservar.
- Cutover: `true` en staging → corrida real sobre los tres dominios → `true` en producción junto con
  el flip de los flags del grader, nunca antes.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `GROWTH_PROBE_FETCH_STRICT_NETWORK_ENABLED=false` | < 5 min | sí |
| Slice 2 | Mismo flag | < 5 min | sí |
| Slice 3 | Revert PR — sin estado persistido que deshacer | < 10 min | sí |
| Slice 4 | Revert PR del parser; la promesa vuelve a acotarse al carril OnPage en `TASK-1709` | < 10 min | sí |
| Slice 5 | Reabrir `ISSUE-164` moviéndolo de vuelta a `open/` | < 5 min | sí |

### Production verification sequence

1. Merge con el flag en `false` en ambos runtimes; confirmar que el grader en staging sigue con el
   comportamiento actual.
2. Flag `true` en staging (Vercel + ops-worker) y verificar **en la revisión activa** del worker.
3. Corrida real sobre un dominio con `apex → www`: debe completar, no `blocked`.
4. Corrida real sobre un dominio con `http → https`: debe completar.
5. Corrida real sobre un sitio de más de 4 MiB con JSON-LD al final: `truncated: true` y el probe
   degradado a `skipped`, **jamás** "no tiene datos estructurados".
6. Casos adversariales contra un dominio de prueba propio que redirige a `10.0.0.5` y a un host
   público distinto: ambos `blocked_redirect`, cuerpo vacío.
7. Revisar el conteo de `blocked_redirect` / `blocked_private_address` en Sentry sobre 48 h de
   staging: un volumen inesperado significa guarda demasiado estricta, no ataque.
8. Sólo entonces: mover `ISSUE-164` a `resolved/` y habilitar el flip a producción de los flags del
   grader.

### Out-of-band coordination required

- Declarar y aplicar `GROWTH_PROBE_FETCH_STRICT_NETWORK_ENABLED` en el servicio Cloud Run del
  ops-worker y en Vercel.
- 🔴 **Coordinación con quien opere el rollout del grader**: ningún flag consumidor
  (`GROWTH_AI_VISIBILITY_PROBES_ENABLED`, `GROWTH_AI_VISIBILITY_BRAND_INTELLIGENCE_ENABLED`) puede
  pasar a `prod: ON` antes del merge de los Slices 1–2.
- Decisión de producto para el Slice 4: implementar obediencia de `robots.txt` o acotar la promesa de
  `TASK-1709` al carril OnPage.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `safe-fetch.ts` usa `redirect: 'manual'` con bucle propio y tope de saltos; cada `Location` se
      revalida antes de seguirse.
- [ ] Un redirect a IP privada, a `169.254.169.254` o a un host público distinto devuelve
      `{ ok: false, errorCode: 'blocked_redirect', body: '' }` y **el cuerpo del destino no se lee**.
- [ ] Un hostname público que resuelve a rango no público devuelve `blocked_private_address`, tanto en
      la URL inicial como en un salto.
- [ ] `apex → www`, `www → apex` y `http → https` **siguen funcionando**, probado con test y con
      corrida real en staging.
- [ ] El cuerpo se lee por stream con corte duro: una respuesta `chunked` sin `content-length` mayor al
      tope **no se bufferiza completa**, probado con test.
- [ ] `ProbeFetchResult.truncated` existe, es aditivo con default `false`, y llega hasta el probe.
- [ ] Un probe de **presencia** con `truncated === true` degrada a `skipped` con razón explícita y
      **nunca** reporta ausencia.
- [ ] El mismo arreglo de lectura está aplicado en `entity-fetch.ts`.
- [ ] La cabecera de `safe-fetch.ts` describe exactamente lo que el código hace, y existe un test que
      falla si vuelven a divergir.
- [ ] Slice 4 resuelto en una de las dos direcciones: `robots.txt` obedecido por el fetcher, **o** la
      promesa de `TASK-1709` acotada al carril OnPage. No queda una afirmación sin mecanismo.
- [ ] `/robots.txt` sigue siendo alcanzable aunque la política prohíba el resto.
- [ ] El flag tiene fila en `FEATURE_FLAG_STATE_LEDGER.md` y `pnpm docs:closure-check` pasa.
- [ ] `ISSUE-164` movido a `resolved/` **sólo después** de la corrida real en staging.
- [ ] Ningún flag consumidor del grader pasó a `prod: ON` antes del merge de los Slices 1–2.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/growth/ai-visibility`
- `pnpm test` (suite completa, gate de cierre)
- `pnpm build` (gate de cierre; pedir autorización al operador antes de correrlo)
- Corrida real del grader en staging sobre los tres dominios del `Runtime evidence`
- Revisión de `blocked_redirect` / `blocked_private_address` en Sentry sobre 48 h

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado
- [ ] `changelog.md` quedó actualizado
- [ ] se ejecutó chequeo de impacto cruzado sobre `TASK-1697`, `TASK-1709`, `TASK-1281`, `TASK-1670` y `TASK-1701`
- [ ] `ISSUE-164` movido a `docs/issues/resolved/` y el tracker de `docs/issues/README.md` actualizado
- [ ] delta en `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` sobre la postura de red del sustrato
- [ ] `Delta 2026-08-26` de `TASK-1709` actualizado según lo que resolvió el Slice 4

## Follow-ups

- Pin de la IP resuelta al conectar, para cerrar la ventana TOCTOU del Slice 2.
- Rate limit y caché por host entre corridas concurrentes.
- Decidir si vale sumar la Public Suffix List para razonar sobre dominio registrable en vez de la
  regla conservadora `www` del `Detailed Spec` §2.
- `html.ts`: `extractJsonLdBlocks` no matchea `type=application/ld+json` sin comillas (legal en HTML5).
- `TASK-1281` — renderizado headless: el cuarto defecto del fetcher, con dueño propio.

## Open Questions

- ~~Slice 4: ¿obediencia de `robots.txt` o acotar la promesa?~~ **Resuelto 2026-08-26: se implementa la obediencia** (`Detailed Spec` §5).
- ¿El umbral de la heurística de shell del `Slice 3` produce falsos `observable: false` sobre sitios legítimamente minimalistas? Mitigado por la asimetría (sólo retira afirmaciones), pero conviene calibrarlo contra sitios reales de la cartera antes del flip.
- ¿El tope por defecto queda en 4 MiB? Con lectura por stream el número deja de ser crítico, pero fija cuánto texto ve un probe de presencia.
- ¿Aparece algún caso real de redirect legítimo a otro subdominio del mismo dominio registrable? Si sí, la regla conservadora del §2 necesita la Public Suffix List.

# TASK-1701 — `analyzeUrlContent`: hechos de contenido por URL, cero score

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-08-27 — el sustrato a heredar fue endurecido por `TASK-1778`

`probes/safe-fetch.ts` quedó endurecido y desplegado con el endurecimiento comercial (`ISSUE-164`
resuelto; rollout ejecutado 2026-08-27): tope real de 4 MiB por stream con rastro
`truncated`/`observable`, `robots.txt` obedecido con nuestro
UA (`probes/robots-policy.ts`), y — gated por `GROWTH_PROBE_FETCH_STRICT_NETWORK_ENABLED` (ON en el
ops-worker y Vercel staging; prod Vercel con el próximo release) — contención de redirects a la
familia del sujeto + subdominios descendientes + guarda DNS anti-SSRF.
`ProbeFetchErrorCode` suma `blocked_redirect`/`blocked_private_address`/`blocked_robots`. Las
referencias de línea de este doc (`safe-fetch.ts:72`, `:58-79`) quedaron desplazadas: la guarda
cross-host sigue viva en `resolveProbeUrl` y ahora también revalida cada salto de redirect.
`UrlFetchFacts` debe modelar estos hechos (`truncated`, `observable`, bloqueo por robots) como
procedencia, no como ausencia de contenido.

## Status

- Lifecycle: `to-do`
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
- Backend impact: `reader`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|seo|aeo`
- Blocked by: `TASK-1696`, `TASK-1703` — `TASK-1697` cerró 2026-08-27 (el sustrato existe: consumir `@/lib/growth/site-substrate`, la lint rule bloquea el deep import a `probes/**`)
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Nace `analyzeUrlContent(url)` dentro de `src/lib/growth/site-substrate/`: un reader que, dada una
URL del propio sujeto, devuelve **hechos de contenido con procedencia** — resultado del fetch,
estructura del HTML (headings, headings-pregunta, `wordCount`, tipos JSON-LD, `lastModified`), texto
legible y, sólo cuando el presupuesto de tokens per-org lo autoriza, una mitad `prose` producida por
LLM. **No emite ningún score.** SEO convierte esos hechos en `priority_score` con su config
versionada; AEO los convierte en evidencia de `citation_quality` con la suya. Mismo dato, dos
veredictos.

Es el tercer consumidor del sustrato de sitio, y por lo tanto el disparo legítimo del movimiento que
`TASK-1670` dejó como follow-up sin fecha.

## Why This Task Exists

Hoy **el módulo mide el envase y nunca el texto**. La auditoría del 2026-08-15 lo registra como la
brecha A1 del eje AEO y como la palanca con mejor evidencia primaria del oficio: no existe una sola
señal sobre si un H2 es una pregunta, si la respuesta bajo ese H2 es autocontenida, si hay densidad
de datos, si hay citas a fuentes, si hay tabla o lista, si hay `dateModified`, si hay byline.

El sustrato para producir esos hechos ya existe y está probado, pero está **encerrado dentro del
motor AEO** (`src/lib/growth/ai-visibility/probes/safe-fetch.ts`, `probes/html.ts`). El tercer
consumidor ya apareció dentro del propio grader:
`src/lib/growth/ai-visibility/brand-intelligence/fetch-site-content.ts` reusa `createProbeFetcher` y
su docstring declara literalmente que *"el probe es TÉCNICO y no extrae prosa — this is the missing
piece"*. Tres consumidores es el umbral de patrón canónico.

**Dónde NO nace, y por qué la ubicación es la decisión de arquitectura de esta task:**

- **No nace en `growth/ai-visibility/`.** La pregunta "¿es citable este texto?" *suena* AEO, pero su
  shape la delata: es **por URL y continua**. El grader es **por dominio y episódico** — un score
  versionado con review gate humano, una foto que se entrega y se defiende. Meter una capacidad
  continua por URL adentro de un motor episódico por dominio obliga después a partirla.
- **No nace en `growth/seo/site-audit/`.** Ese módulo es un **passthrough de DataForSEO OnPage**:
  encolar (`queue-audit.ts`), esperar, cosechar (`collect.ts`). Su transporte es la API del
  proveedor y su idempotencia es la del ciclo async del crawl. Esto otro es **fetch propio + parse
  + LLM opcional**, con guarda SSRF propia y sin ninguna tarea del proveedor de por medio. No
  comparten ni transporte ni ciclo de vida.
- **Nace en `growth/site-substrate/`**, que es domain-free por construcción: no importa nada de
  `growth/*` y no persiste nada. Cero Postgres, cero outbox, cero flags de dominio — mismo patrón
  que `src/lib/artifact-composer/**` ya sostiene.

La regla que ordena todo esto, grabada por la auditoría: **se comparte cómo se OBTIENE la evidencia;
nunca cómo se JUZGA.**

## Goal

- `analyzeUrlContent(url, options)` vive en `src/lib/growth/site-substrate/` y devuelve el shape
  `{ fetch, structure, readable, prose? }` con procedencia por bloque y `null` honesto cuando un
  hecho no se pudo obtener.
- La mitad `prose` (LLM) es **opt-in y gated** por el presupuesto de tokens per-org de `TASK-1696`;
  sin autorización el reader devuelve `prose: undefined` y lo declara, jamás falla ni inventa.
- El módulo no expone, calcula ni persiste ningún score, ningún peso y ninguna prioridad.
- El sustrato queda extraído a `growth/site-substrate/` con re-export shim, de modo que los 23
  archivos que hoy dependen de `contracts`/`safe-fetch`/`html` en el probe layer **no cambian una
  línea**.

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
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§1.1 boundary SEO↔AEO, §17.3 regla
  de imports cross-dominio)
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- **Cero score.** El módulo emite hechos. Ningún peso, ningún umbral de calidad, ninguna
  prioridad. Si un valor se le puede mostrar a un cliente como "puntaje", no pertenece acá.
- **`site-substrate` no importa nada de `growth/*` y no persiste nada.** Cero Postgres, cero
  outbox, cero flags de dominio, cero entitlement resolver adentro. El gate de gasto se aplica en
  la frontera del caller, no dentro del sustrato.
- **Nunca le mandes a un modelo un byte que un parseo de USD 0,00015 podía haber comprimido.** El
  retorno medido de comprimir antes de tokenizar es de 28× a 187×. Esta regla se graba en el
  docstring del módulo, no sólo en la task.
- **No se fetchea el sitio de un tercero.** `resolveProbeUrl`
  (`src/lib/growth/ai-visibility/probes/safe-fetch.ts:72`) bloquea cross-host por diseño; levantar
  esa guarda es una decisión legal y reputacional, no de implementación.
- **`null` honesto, jamás cero fantasma.** "No lo pudimos leer" y "no lo tiene" son hechos
  distintos, igual que en `seo_keyword_market_data` (fila ausente / NULL / 0).
- **Boundary §1.1 SEO↔AEO intacto.** Ningún JOIN, VIEW o FK entre tablas `seo_*` y `grader_*`; esta
  task no crea tablas, así que la regla se cumple por construcción y debe seguir cumpliéndose.

## Normative Docs

- `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` (§3.2 A1, §4, §5.1,
  §5.3, §5.5, §6)
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/tasks/to-do/TASK-1670-growth-site-probes-kernel-seo-audit.md` (su follow-up de extracción
  del sustrato es lo que esta task dispara)
- `.claude/rules/growth-seo.md` (mandato MCP: todo reader nuevo del dominio expone su tool en el
  mismo PR)

## Dependencies & Impact

### Depends on

- `TASK-1697` (`docs/tasks/to-do/TASK-1697-growth-site-substrate-extraction-cross-domain-lint.md`) —
  extracción del sustrato de sitio a `src/lib/growth/site-substrate/` con re-export shim y lint rule
  cross-domain. Si al tomar esta task esa extracción todavía no shippeó, el Slice 1 de acá la absorbe
  con el mismo contrato (mover 2 archivos puros + sus tipos, cero cambios en los 23 consumidores).
- `TASK-1696`
  (`docs/tasks/to-do/TASK-1696-growth-provider-spend-consumer-dimension-grader-usd-gate.md`) — gate
  de presupuesto per-org con dimensión de consumidor en `seo_provider_spend_daily`. **Bloqueante duro
  para la mitad `prose`**: sin ese gate, el análisis de contenido gastaría fuera del ledger y
  repetiría exactamente la asimetría que la auditoría documenta en §1.2. Su gate nace en shadow, así
  que el Slice 3 de acá espera a que deje de ser shadow o declara su propio techo duro mientras
  tanto.
- `TASK-1703` (`docs/tasks/to-do/TASK-1703-aeo-tool-axis-cheap-first-router.md`) — router de modelos
  cheap-first compartido como **patrón**, no como módulo. La extracción de prosa consume el patrón;
  no se copia un cuarto router.
- `src/lib/growth/ai-visibility/probes/safe-fetch.ts` — guarda SSRF + `createProbeFetcher`
  (existe, verificado).
- `src/lib/growth/ai-visibility/probes/html.ts` — helpers puros de parseo JSON-LD/DOM (existe,
  verificado).
- `src/lib/ai/*` — cliente LLM canónico. **Prohibido instanciar un SDK propio.**

### Blocks / Impacts

- `TASK-1702` — señales deterministas de citabilidad + recomendación anclada a URL. Es el primer
  consumidor real de estos hechos y no puede empezar sin el shape.
- `TASK-1670` — su follow-up "extracción a `search-visibility/`" queda superado: el movimiento
  correcto es a `growth/site-substrate/` y su disparo es esta task.
- `src/lib/growth/ai-visibility/brand-intelligence/fetch-site-content.ts` — pasa a consumir el
  sustrato en vez de reimplementar el fetch, cerrando el "missing piece" de su propio docstring.
- `EPIC-022` — habilita las brechas A1 y A2 del eje AEO.

### Files owned

- `src/lib/growth/site-substrate/analyze-url-content.ts`
- `src/lib/growth/site-substrate/contracts.ts`
- `src/lib/growth/site-substrate/index.ts`
- `src/lib/growth/site-substrate/prose/`
- `src/lib/growth/site-substrate/__tests__/`
- `src/mcp/greenhouse/tools.ts` (registro de la tool read-only)
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (delta de sustrato)
- `docs/documentation/` y `docs/manual-de-uso/` — delta proporcional del dominio growth

## Current Repo State

### Already exists

- `src/lib/growth/ai-visibility/probes/safe-fetch.ts` — `resolveProbeUrl` (guarda de host no
  público + acotado al host del sujeto, línea 72) y `createProbeFetcher`. `server-only`, puro sobre
  HTTP, sin una sola referencia a `grader_*`.
- `src/lib/growth/ai-visibility/probes/html.ts` — `extractJsonLdBlocks` y helpers de parseo
  tolerante. No importa nada.
- `src/lib/growth/ai-visibility/brand-intelligence/fetch-site-content.ts` — tercer consumidor ya
  vivo dentro del propio grader.
- `src/lib/growth/ai-visibility/normalization/prose-extraction/` — router + tres providers
  (`anthropic`, `openai`, `gemini`) + `prompt.ts` + `contracts.ts` con `maxTokens`. Es el patrón
  cheap-first a reusar, no el módulo a importar.
- `src/lib/ai/dataforseo-families.ts` — allowlist cerrado de 5 familias. `content_parsing/live` NO
  está en ninguna: usarlo exige ampliar el allowlist, y eso es trabajo de otra task.

### Gap

- No existe `src/lib/growth/site-substrate/` (verificado: el directorio no está en el repo).
- No existe ninguna función que dado un `url` devuelva hechos de contenido: el probe layer produce
  hallazgos técnicos del dominio, no estructura ni prosa por URL.
- No existe el shape `{ fetch, structure, readable, prose? }` en ningún contrato del repo.
- El `wordCount`, los `questionHeadings` y el `lastModified` no se extraen en ninguna parte.
- No hay detector de CI que impida un deep import cross-dominio en `growth/*` (la única lint rule
  cross-domain del repo, `eslint.config.mjs:333`, protege al client-portal).

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/growth/site-substrate/` en el portal Next.js, ejecutado server-side y
  consumible desde el ops-worker
- Future candidate home: `domain-package`
- Boundary: reader canónico `analyzeUrlContent` + contratos de `site-substrate/contracts.ts`;
  consumers autorizados son `growth/seo`, `growth/ai-visibility`, la tool MCP read-only y el
  ops-worker. Nadie importa archivos internos del módulo: la superficie es el barrel `index.ts`
- Server/browser split: `server-only` estricto. El fetcher, la guarda SSRF, el parseo y el cliente
  LLM jamás cruzan al bundle de browser; el consumidor UI recibe el resultado ya serializado desde
  un route handler
- Build impact: none. Sin dependencias nuevas: el fetch es `fetch` global y el LLM entra por el
  cliente canónico de `src/lib/ai/`
- Extraction blocker: none. El módulo es puro sobre HTTP, no abre transacción, no toca Postgres y
  no resuelve entitlement adentro; el gate de gasto se aplica en la frontera del caller

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: ninguno nuevo. El sustrato **no persiste**: la fuente de verdad del
  hecho es el HTML servido por el sitio del sujeto en el instante del fetch, y viaja con su `asOf`
- Consumidores afectados: `growth/seo` (futuro `priority_score`), `growth/ai-visibility`
  (`citation_quality`), MCP read-only, ops-worker
- Runtime target: `local`, `staging`, `production`, `worker`

### Contract surface

- Contrato existente a respetar: `src/lib/growth/ai-visibility/probes/safe-fetch.ts` (guarda SSRF),
  `src/lib/growth/ai-visibility/probes/contracts.ts`,
  `src/lib/growth/ai-visibility/normalization/prose-extraction/contracts.ts` (patrón de `maxTokens`)
- Contrato nuevo o modificado: reader `analyzeUrlContent(url, options)` + tipos
  `UrlContentFacts`, `UrlFetchFacts`, `UrlStructureFacts`, `UrlReadableFacts`, `UrlProseFacts` en
  `site-substrate/contracts.ts`; MCP tool read-only `analyze_url_content`
- Backward compatibility: `compatible`. La extracción del sustrato entra con re-export shim desde
  las rutas viejas del probe layer; ningún consumidor existente cambia una línea
- Full API parity: la lógica vive en `src/lib/growth/site-substrate/**`, jamás en un componente. El
  read se expone como reader canónico + tool MCP en el MISMO PR (mandato del dominio). Es
  read-only: no hay write, no hay `propose → confirm → execute` que declarar

### Data model and invariants

- Entidades/tablas/views afectadas: **ninguna**. Esta task no crea, altera ni lee tabla alguna
- Invariantes que no se pueden romper:
  - `Cero score`: el reader no emite puntajes, pesos, umbrales ni prioridades
  - `Cero persistencia`: el módulo no escribe Postgres, no publica outbox y no lee flags de dominio
  - `Cero import de growth/*`: `site-substrate` es hoja del DAG hacia arriba
  - `Cross-host bloqueado`: sólo se fetchea el host del sujeto; la guarda de `safe-fetch.ts` es la
    única implementación y no se duplica
  - `null honesto`: un hecho no obtenido se declara `null` con su `errorCode`, nunca 0 ni string
    vacío
  - `prose` es opcional y su ausencia se declara con motivo (`budget_exhausted`, `not_requested`,
    `provider_failed`), nunca se simula
- Tenant/space boundary: el reader recibe `organizationId` sólo para que el caller resuelva el gate
  de tokens; el sustrato no deriva tenant por su cuenta ni consulta la sesión
- Idempotency/concurrency: puro y sin estado. Dos llamadas concurrentes sobre la misma URL no
  interfieren; el resultado varía sólo si varía el HTML servido, y eso viaja en el `asOf`
- Audit/outbox/history: `none` con razón explícita — el sustrato no persiste, así que no hay hecho
  que auditar acá. El gasto de tokens de `prose` sí queda registrado, pero lo registra el gate de
  `TASK-1696` en la frontera, no este módulo

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: la mitad `prose` nace `flag OFF` (opt-in explícito del caller **y** autorización
  del gate de tokens). La mitad determinista (fetch + structure + readable) nace habilitada porque
  no gasta un centavo
- Backfill plan: none. No hay dato histórico que reconstruir; el hecho es del instante del fetch
- Rollback path: `revert PR`. El shim de re-export hace que revertir la extracción no toque a los
  23 consumidores
- External coordination: none más allá del flag/env var del gate de tokens, que es propiedad de
  `TASK-1696`

### Security and access

- Auth/access gate: el reader es `server-only`. El route handler y la tool MCP que lo expongan
  aplican sesión + capability del dominio growth; la tool va por el lane ecosystem read-only bajo
  el scope ya existente, **sin scope nuevo en Entra**
- Sensitive data posture: `no sensitive data`. Se lee HTML público del sitio del propio sujeto. No
  se loggea el HTML crudo ni el texto extraído completo
- Error contract: `canonicalErrorResponse` en la frontera HTTP + `captureWithDomain` para el
  observability. El reader devuelve `errorCode` tipado dentro de `fetch`, nunca prosa en inglés
  hacia el cliente
- Abuse/rate-limit posture: la guarda cross-host es el primer candado. La mitad `prose` hereda el
  circuit breaker del cliente LLM y el techo de tokens per-org; la mitad determinista lleva timeout
  por URL y techo de bytes leídos para que un HTML gigante no cuelgue el worker

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/site-substrate`, más la suite completa de
  `src/lib/growth/ai-visibility` para probar que el shim no movió nada
- DB/runtime checks: no aplica por diseño (el módulo no toca DB). Se sustituye por un smoke real
  contra una URL propia (`efeoncepro.com`) desde el runtime, verificando el shape completo
- Integration checks: smoke de la mitad `prose` contra el provider real con el gate en ON y en OFF,
  verificando que el OFF devuelve `prose: undefined` con motivo y **cero tokens gastados**
- Reliability signals/logs: reusa la observabilidad del cliente LLM. No se crea signal nueva en
  esta task; el gasto lo vigila el gate de `TASK-1696`
- Production verification sequence: extracción + shim → smoke determinista sobre URL propia →
  habilitar `prose` en staging con gate ON → verificar gasto atribuido → producción

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] **Lógica en el primitive, no en la UI.** `analyzeUrlContent` vive en
      `src/lib/growth/site-substrate/`; ningún componente parsea HTML.
- [ ] **Modelada como recurso/reader**, no como click-handler: el recurso es "los hechos de
      contenido de una URL".
- [ ] **Read expuesto como reader canónico** + tool MCP read-only en el mismo PR.
- [ ] **Capability + grant en el MISMO PR** si la ruta HTTP gatea por capability nueva; si reusa
      una existente del dominio growth, declararlo explícito.
- [ ] **Camino programático declarado:** reader canónico + `api/platform/ecosystem` (MCP) read-only.
- [ ] **Sin write**, así que `propose → confirm → execute` no aplica; declararlo, no omitirlo.
- [ ] **Un primitive, muchos consumers:** SEO, AEO, MCP y ops-worker consumen el MISMO reader; cero
      lógica de parseo duplicada por consumer.
- [ ] **Parity check = SÍ.**

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

### Slice 1 — Sustrato en su casa, con shim

- `src/lib/growth/site-substrate/` con `safe-fetch.ts` y `html.ts` movidos, más sus tipos.
- Re-export shim desde las rutas viejas del probe layer para que los 23 archivos dependientes no
  cambien una línea.
- Docstring del módulo con las tres reglas duras: no importa `growth/*`, no persiste, no juzga.
- Suite completa de `ai-visibility` verde sin editar un solo test existente.

### Slice 2 — Hechos deterministas

- `analyzeUrlContent(url, options)` con las tres mitades sin costo: `fetch`, `structure`,
  `readable`.
- `structure`: `headings[]` (nivel + texto + orden), `questionHeadings[]` (subconjunto derivado con
  regla declarada), `wordCount`, `jsonLdTypes[]`, `lastModified`.
- `readable`: `text` normalizado + `truncated` explícito con el techo aplicado.
- `fetch`: `ok`, `status`, `finalUrl`, `errorCode` tipado. Cross-host devuelve `errorCode`, no
  excepción.
- Tests de tabla sobre HTML real capturado (fixtures), incluyendo HTML malformado, redirect,
  timeout y respuesta no-HTML.

### Slice 3 — Mitad `prose`, gated

- `prose?: { answerCapsulePresent, claimsWithoutEvidence[], entityMentions[] }` producida por LLM.
- Consumo del patrón cheap-first de `TASK-1703`; **cero SDK propio**, cliente canónico de
  `src/lib/ai/`.
- Gate de tokens per-org de `TASK-1696` aplicado en la frontera: sin autorización,
  `prose: undefined` + motivo tipado, **cero tokens gastados**.
- El input al modelo es el `readable.text` ya comprimido, nunca el HTML crudo. Test que lo prueba.

### Slice 4 — Superficie programática + documentación

- Tool MCP read-only `analyze_url_content` registrada en `src/mcp/greenhouse/tools.ts` en el mismo
  PR, bajo el scope de lectura ya existente.
- Delta en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` declarando el sustrato y su regla dura.
- Documentación funcional + manual de uso proporcionales del dominio growth.

## Out of Scope

- **Cualquier score, peso, umbral o prioridad.** Ni "citability score", ni "content quality", ni un
  número que se le pueda mostrar a un cliente. Eso es `TASK-1702` (SEO) y el motor AEO (evidencia).
- **Fetchear sitios de terceros / competidores.** La guarda cross-host de `safe-fetch.ts:72` se
  respeta tal cual. Levantarla es una decisión legal, no una implementación.
- **Correr a escala de sitio completo.** Hasta que exista el gate de tokens per-org y esté
  verificado en producción, el análisis es por URL, a demanda.
- **Persistencia.** Ninguna tabla, ninguna migración, ningún outbox. Guardar el resultado es otra
  task, y su dueño es el dominio que lo juzga, no el sustrato.
- **`content_parsing/live` de DataForSEO.** No está en el allowlist de familias
  (`src/lib/ai/dataforseo-families.ts`); ampliarlo es una task aparte. La regla operativa de
  comprimir-antes-de-tokenizar se cumple en V1 con el parseo propio.
- **La reorganización `search-visibility/`** con SEO y AEO como sub-motores. Explícitamente
  descartada por la auditoría (§6).
- **Fusionar el scoring de SEO y AEO.** Un `score_version` compartido haría que recalibrar SEO
  invalidara reportes AEO ya entregados a clientes. Puerta de una sola dirección.

## Detailed Spec

### Shape canónico

```ts
analyzeUrlContent(url, options) → {
  asOf: string,                        // ISO del instante del fetch — viaja con el hecho
  fetch:     { ok, status, finalUrl, errorCode },
  structure: { headings[], questionHeadings[], wordCount, jsonLdTypes[], lastModified },
  readable:  { text, truncated },
  prose?:    { answerCapsulePresent, claimsWithoutEvidence[], entityMentions[] }  // LLM, gated
}
```

Cada bloque lleva su propia procedencia: `structure` y `readable` declaran `source: 'html'`;
`prose` declara el modelo y la versión del prompt que lo produjo. Un hecho ausente es `null` con
motivo, nunca un default.

### Regla operativa grabada en el módulo

El docstring del módulo lleva, verbatim:

> Nunca le mandes a un modelo un byte que un parseo de USD 0,00015 podía haber comprimido.

Retorno medido de comprimir antes de tokenizar: **28× a 187×** (parsear 100 URLs cuesta USD 0,015 y
ahorra entre USD 0,42 con Gemini y USD 2,80 con GPT-4.1). Por eso el input de la mitad `prose` es
siempre `readable.text`, jamás el HTML crudo, y hay un test que lo verifica.

### Por qué el shape no lleva veredicto

`structure.questionHeadings` dice **qué H2 son preguntas**; no dice si eso está bien. SEO puede
convertirlo en un componente de `priority_score` con su config versionada; AEO puede convertirlo en
evidencia de `citation_quality` con la suya. Si el sustrato ya trajera el veredicto, cambiar la
config de un motor movería el número del otro — que es exactamente lo que la separación de dominios
existe para impedir.

### Segundo modo de falla previsto

`site-substrate` se vuelve un dominio por acreción. La mitigación es una **regla dura verificable
por lint**: no importa nada de `growth/*` y no persiste nada. El detector de CI se construye acá o
en la task del sustrato, pero se construye — un deep import lo crea un commit, así que "revisión de
código" no es mitigación.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (sustrato + shim) → Slice 2 (hechos deterministas) → Slice 4 (superficie + docs).
- **Slice 3 (`prose`) NO puede shippear antes que el gate de tokens per-org de `TASK-1696` esté
  verificado en el runtime real.** Sin ese gate, el análisis de contenido gasta fuera del ledger y
  reproduce la asimetría de §1.2 de la auditoría: el lado comprado tiene ledger, el lado construido
  tiene un estimador que escribe el mismo código que gasta.
- Slice 4 puede correr en paralelo con Slice 3 una vez que Slice 2 cerró, siempre que la tool MCP
  exponga sólo las mitades deterministas mientras `prose` siga OFF.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El shim se olvida y los 23 consumidores del probe layer rompen | UI/API AEO | low | Re-export shim en el mismo commit del movimiento + suite completa de `ai-visibility` verde antes de commitear | `pnpm test` rojo en CI |
| La mitad `prose` shippea sin gate y gasta fuera del ledger | finance/growth spend | medium | Slice 3 bloqueado por `TASK-1696`; flag default OFF; test que prueba cero tokens con gate OFF | gasto LLM sin fila atribuida al org |
| El módulo empieza a persistir "para cachear" y se vuelve dominio | data | medium | Regla dura verificable por lint: cero import de `growth/*`, cero Postgres, cero outbox | lint rule de CI en rojo |
| Se le agrega un score "chiquito" porque el consumidor lo pedía | growth | medium | Invariante en el docstring + acceptance criterion binario + review | revisión de contrato en PR |
| Un HTML gigante o un servidor lento cuelgan el worker | worker | medium | Timeout por URL + techo de bytes leídos + `errorCode` tipado en vez de excepción | latencia del ciclo del ops-worker |
| Alguien levanta la guarda cross-host para "analizar al competidor" | legal/reputacional | low | La guarda vive en un solo archivo con un solo dueño; cambiarla exige decisión declarada fuera del repo | diff sobre `safe-fetch.ts` en review |

### Feature flags / cutover

- **Mitad determinista (fetch + structure + readable):** sin flag. Additive, no gasta, no persiste,
  no cambia comportamiento existente. Cutover inmediato.
- **Mitad `prose`:** opt-in por parámetro del caller **y** autorización del gate de tokens per-org
  de `TASK-1696`. Default OFF en todos los runtimes. Al prender, aplica la disciplina multi-runtime
  de CLAUDE.md: mapear dónde se LEE el flag (`grep -rn` en `src/` y `services/`) y declararlo en
  `services/ops-worker/deploy.sh` **además** de aplicarlo en vivo. Fila obligatoria en
  `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.
- Revert de `prose`: flag a OFF. La mitad determinista sigue sirviendo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 — sustrato + shim | `git revert` del PR; el shim garantiza que ningún consumidor quedó reescrito | <10 min | si |
| Slice 2 — hechos deterministas | `git revert`; nada persistió, nada se gastó | <10 min | si |
| Slice 3 — `prose` | Flag a OFF en los runtimes donde se lee (Vercel + ops-worker) y verificar en la revisión activa; luego `git revert` si hace falta | <15 min | si |
| Slice 4 — MCP + docs | `git revert` del registro de la tool; el reader sigue disponible in-process | <10 min | si |

### Production verification sequence

1. Extracción + shim en local: `pnpm vitest run src/lib/growth/ai-visibility` verde sin editar un
   solo test.
2. `pnpm local:check` verde.
3. Smoke determinista contra una URL propia desde el runtime: verificar el shape completo, el
   `asOf`, el `truncated` y que una URL cross-host devuelve `errorCode` y no excepción.
4. Staging con `prose` OFF: verificar `prose: undefined` con motivo y **cero tokens** en el
   contador.
5. Staging con `prose` ON: verificar el gasto atribuido a la organización en el ledger de tokens y
   que el input al modelo fue `readable.text` y no HTML.
6. Producción con `prose` OFF; flip a ON sólo tras 24 h de cooldown y con la fila del ledger de
   flags actualizada.
7. Monitorear gasto LLM del dominio growth durante 7 días post-flip.

### Out-of-band coordination required

- El flip de `prose` en producción requiere que el gate de tokens per-org esté configurado en los
  runtimes donde se lee, y que la fila correspondiente exista en
  `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`. Fuera de eso, es un cambio repo-only.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `src/lib/growth/site-substrate/` existe y `analyzeUrlContent` devuelve el shape
      `{ asOf, fetch, structure, readable, prose? }`.
- [ ] El módulo **no exporta ni calcula ningún score, peso, umbral ni prioridad** — verificable por
      inspección del tipo de retorno.
- [ ] El módulo **no importa nada de `growth/*`** y **no persiste nada** (cero Postgres, cero
      outbox, cero flags de dominio), verificado por un detector de CI, no por revisión de código.
- [ ] Los 23 archivos que dependen de `contracts`/`safe-fetch`/`html` del probe layer **no cambian
      una línea** y la suite completa de `ai-visibility` queda verde.
- [ ] Una URL de otro host devuelve `fetch.errorCode` tipado, no excepción y no contenido.
- [ ] Con el gate de tokens en OFF, `prose` es `undefined` con motivo tipado y el contador de
      tokens registra **cero**.
- [ ] El input al modelo en la mitad `prose` es `readable.text`; existe un test que falla si alguien
      le pasa HTML crudo.
- [ ] Un hecho no obtenido se expresa como `null` con motivo; no existe ningún `0` ni string vacío
      como default en el shape.
- [ ] La tool MCP read-only queda registrada en `src/mcp/greenhouse/tools.ts` en el MISMO PR y no
      requiere scope nuevo en Entra.
- [ ] `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` tiene la fila del flag de `prose` con su
      runtime declarado.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/growth/site-substrate src/lib/growth/ai-visibility`
- `pnpm test` (suite completa, gate de cierre)
- `pnpm build` (producción, gate de cierre — pedir autorización al operador antes de correrlo)
- Smoke real contra una URL propia desde el runtime, con `prose` OFF y ON
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `TASK-1670` actualizada: su follow-up de extracción del sustrato queda cerrado por esta task,
      con la corrección del destino (`growth/site-substrate/`, no `search-visibility/`).
- [ ] `TASK-1702` desbloqueada y notificada con el shape final.

## Follow-ups

- Ampliar el allowlist de familias DataForSEO para `content_parsing/live` con `markdown_view`
  (USD 0,00015/pág) y usarlo como compresor previo al modelo cuando el volumen lo justifique.
- Consumidor real del sustrato dentro de `brand-intelligence/fetch-site-content.ts`, cerrando el
  "missing piece" declarado en su propio docstring.
- Lint rule cross-domain para `growth/*` (hoy sólo existe la del client-portal en
  `eslint.config.mjs:333`), que además cierra el hallazgo §1.3 de la auditoría.

## Open Questions

- ¿La regla de `questionHeadings` se declara sólo por marcas sintácticas (signo de interrogación,
  interrogativo inicial) o incluye una heurística semántica? V1 propuesta: **sólo sintáctica y
  declarada**, porque una heurística semántica es un juicio y el sustrato no juzga.
- ¿El techo de `readable.text` se declara en caracteres o en tokens estimados? Propuesta:
  caracteres, para que la mitad determinista no dependa de un tokenizador.

# TASK-1786 — Growth SEO: consistencia internacional (hreflang) cosechada del crawl ya pagado

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
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
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-08-27 — Slice 1 EJECUTADO: la señal no está en OnPage, y eso cambia el diseño

**El Slice 1 está hecho.** Su resultado no fue el esperado y modifica el diseño de la task, no sólo
su costo. Queda como `to-do` porque los slices 2–4 siguen pendientes; lo que se cierra es la
incógnita que bloqueaba decidirlos.

**Qué se verificó, con evidencia:**

1. **Nuestro `task_post` no guarda el HTML.** Manda exactamente cuatro parámetros —`target`,
   `max_crawl_pages`, `validate_micromarkup: true`, `tag`— (`queue-audit.ts:177-182`). Sin
   `store_raw_html: true`, el endpoint `raw_html` **no devuelve nada** para los crawls existentes.
2. **`hreflang` no aparece en ningún endpoint documentado de la familia.** De los 22 de `on_page`,
   `pages` devuelve `meta` con title/description/**canonical** y un objeto `checks`; `hreflang` no
   está nombrado en ninguno, y la referencia del proveedor no lo menciona una sola vez.
3. **Las lecturas post-crawl SÍ son gratis** — verbatim: *"Your account will not be charged for using
   this function. You can get the results of the task within the next 30 days for free"*. El
   principio de `TASK-1705` es válido; simplemente **no aplica a esta señal**, porque no está en el
   payload.

**Conclusión: la fuente es el sustrato propio, no OnPage.** Comparación de los dos caminos:

| Vía | Costo proveedor | Latencia | Alcance |
|---|---|---|---|
| OnPage con `store_raw_html: true` | a verificar; sólo crawls **futuros** | un ciclo semanal | requiere re-crawlear |
| **`@/lib/growth/site-substrate`** (`TASK-1697`, `complete`) | **USD 0** | segundos | inmediato |

Gana el sustrato. Como efecto lateral, **la task deja de depender del ciclo del crawl** y puede correr
on-demand, lo que la vuelve utilizable también en el carril de prospecto (`TASK-1709`).

🔴 **El hallazgo que cambia el diseño: `hreflang` se audita por RETORNO, y eso cruza hosts.** La
pregunta no es *"¿esta página declara sus alternas?"* sino *"la página MX declara la CL — ¿la CL
declara la MX?"*. Y el sustrato, tras el endurecimiento de `TASK-1778`, **sólo permite la familia del
sujeto y sus descendientes**; cualquier otro dominio registrable devuelve `blocked_redirect`.

| Estructura del cliente | ¿Se puede verificar el retorno? |
|---|---|
| Subcarpetas (`marca.com/mx/`) | ✅ mismo host |
| Subdominios (`mx.marca.com`) | ✅ descendiente |
| **ccTLD** (`marca.mx` + `marca.cl`) | ❌ **bloqueado por la guarda** |

Eso **no es un defecto**: es la guarda SSRF funcionando. La salida correcta es **un fetch por target,
cada uno acotado a su propio host, componiendo el cruce en memoria** — nunca relajar la guarda ni
pedirle al sustrato que persiga un dominio ajeno. Ver `Detailed Spec §3`.

## Summary

Efeonce opera cinco mercados —`CL`, `MX`, `CO`, `PE`, `US`— y el site audit **no mira una sola señal
internacional**: no hay `hreflang` en el código del módulo. Un cliente con sitio multi-país puede
tener retorno roto, self-reference faltante o `x-default` ausente, y el informe le sale sano. Esta
task agrega la dimensión internacional al audit **cosechándola del crawl que ya corre y ya está
pagado**, sin una llamada nueva al proveedor.

## Why This Task Exists

**El error de mercado es el más caro del módulo y ya nos costó una vez.** `ISSUE-152`: el target de
Berel —marca mexicana— midió Chile y acumuló 238 snapshots de un año contra el SERP equivocado. Esa
fue la versión *nuestra* del problema. La versión *del cliente* es el `hreflang` roto: su página
mexicana compitiendo contra su página chilena por la misma query, o Google sirviendo la variante
equivocada a media LATAM.

Con cinco mercados en cartera, eso deja de ser un caso borde y pasa a ser la condición normal. Y hoy
el audit no lo ve: revisa indexabilidad, redirects, duplicados y thin content, pero la consistencia
entre variantes de país **no está en ninguna parte** — `grep -ri hreflang src/lib/growth/` devuelve
cero.

**Por qué es barato:** el crawl OnPage ya corre semanal por target y devuelve mucho más de lo que
leemos. Es el mismo principio de `TASK-1705` (cosechar lo ya pagado): si la señal viene en ese
payload, el costo marginal de esta capacidad es **USD 0**.

## Goal

- Hallazgos de sitio nuevos, del tipo internacional, dentro de `seo_site_audit_findings`: retorno
  roto, self-reference faltante, `x-default` ausente, código de idioma/región inválido, conflicto
  entre `hreflang` y canonical.
- Costo marginal cero: la señal se extrae del crawl vigente. Si no viene en el payload actual, se
  declara qué parámetro haría falta y **cuánto costaría**, antes de activarlo.
- Severidad honesta: un sitio mono-mercado **no** se penaliza por no tener `hreflang`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — §3 (capa 1 · fundamentos técnicos), §4.2 (`seo_site_audit_findings` append-only), §6 (governance DataForSEO), §8 (materialización async).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `CLAUDE.md §"Database — Migration markers"` y §`SQL embebido — type alignment + live testing`

Reglas obligatorias:

- **NUNCA** una llamada nueva al proveedor si la señal ya viene en el crawl vigente.
- **NUNCA** marcar `critical` la ausencia de `hreflang` en un sitio de un solo mercado: sería un falso positivo que entrena al cliente a ignorar la severidad más alta.
- **NUNCA** inferir el mercado del cliente del dominio: sale de sus `seo_targets`.
- **SIEMPRE** honest degradation: si el crawl no trajo la señal, el hallazgo es `unknown`, jamás "sin problemas".

## Normative Docs

- `.claude/skills/seo-aeo/modules/06_LOCAL_INTERNATIONAL.md` — el oficio: hreflang, ccTLD, localización.
- `.claude/skills/dataforseo-operator/references/04-onpage.md` — §7 gotchas y qué trae el payload del crawl.
- `docs/issues/resolved/ISSUE-152-*.md` `[confirmar path]` — el precedente del error de mercado.

## Dependencies & Impact

### Depends on

- `greenhouse_growth.seo_site_audit_runs` + `seo_site_audit_findings` (`TASK-1304`, vivo).
- `src/lib/growth/seo/site-audit/{collect.ts,findings-map.ts,reader.ts}` — donde se materializan los hallazgos.
- `greenhouse_growth.seo_targets` — la fuente de qué mercados atiende el cliente.
- **`@/lib/growth/site-substrate`** (`TASK-1697`, `complete`) — **la fuente real de la señal**, decidido en el `Delta 2026-08-27`. Trae guarda SSRF, obediencia de `robots.txt`, UA identificable y tope de bytes, todo de `TASK-1778`.
- Familia `onpage`, ya en el allowlist. **Esta task NO lo amplía** — y tras el Slice 1, tampoco la usa como fuente.

### Blocks / Impacts

- `TASK-1671` (superficie de hallazgos de sitio) — hereda los tipos nuevos; coordinar el vocabulario de `issue_type` antes de que su UI se congele.
- `TASK-1705` (cosecha post-crawl gratuita) — **mismo principio y probablemente el mismo payload**. Si 1705 entra primero, esta task se enchufa a su extracción en vez de duplicarla. Declarar la dirección de reuso en Discovery.
- `TASK-1670` (probes de sitio) — eje adyacente; no se solapan (1670 mira acceso de crawlers IA, ésta consistencia entre variantes).

### Files owned

- `src/lib/growth/seo/site-audit/hreflang.ts`
- `src/lib/growth/seo/site-audit/findings-map.ts` (aditivo)
- `src/lib/growth/seo/site-audit/__tests__/hreflang.test.ts`
- `migrations/<timestamp>_task-1786-hreflang-finding-types.sql` (sólo si el CHECK de `issue_type` es cerrado)
- `docs/manual-de-uso/growth/operar-consistencia-internacional-seo.md`

## Current Repo State

### Already exists

- Site audit vivo: `ops-seo-audit-enqueue` semanal + `ops-seo-audit-collect` cada 30 min, con poll idempotente por `provider_task_id` y hallazgos en `seo_site_audit_findings` con severidad `critical|warning|notice`.
- `seo_targets` con `location_code` y `language_code` por target: **la fuente de verdad de qué mercados atiende cada cliente ya existe**.
- Reader `readSiteAuditReport` y su tool MCP.

### Gap

- `grep -ri hreflang src/lib/growth/` → **cero**. Ninguna señal internacional en el módulo.
- Las únicas tasks que mencionan `hreflang` son del **sitio público de Efeonce** (`TASK-1369`, `1351`, `1401`, `1352`), no del módulo de clientes.
- El audit no cruza los `seo_targets` de una organización entre sí: no sabe que un cliente tiene variante MX y CL, así que no puede evaluar si se declaran mutuamente.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `src/lib/growth/seo/site-audit/**`, ejecutado por el collect del `ops-worker`
- Future candidate home: `domain-package`
- Boundary: extractor `extractHreflangFindings` consumido sólo por el collect del site audit
- Server/browser split: extracción server-only; al browser llega el hallazgo ya materializado
- Build impact: `none`
- Extraction blocker: `none` — es aditivo dentro del dominio

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: `greenhouse_growth.seo_site_audit_findings` (tipos nuevos), `seo_targets` (lectura)
- Consumidores afectados: `readSiteAuditReport`, su tool MCP, `TASK-1671`
- Runtime target: `worker` + `production`

### Contract surface

- Contrato existente a respetar: shape de `SeoSiteAuditFinding` y la severidad `critical|warning|notice`.
- Contrato nuevo o modificado: valores nuevos de `issue_type` del grupo internacional.
- Backward compatibility: `compatible` — aditivo; un consumer que no conozca los tipos nuevos los ignora.
- Full API parity: se expone por el reader que ya existe; no se crea tool nueva.

### Data model and invariants

- Entidades afectadas: `seo_site_audit_findings` (filas nuevas), `seo_targets` (lectura).
- Invariantes:
  - Append-only, como el resto de la serie.
  - Un sitio con **un solo** `seo_target` no genera hallazgos internacionales: ausencia de `hreflang` ahí no es defecto.
  - La ausencia de señal en el crawl produce `unknown`, nunca "sin hallazgos".
  - `issue_type` con vocabulario cerrado; un tipo nuevo rompe el INSERT, no se cuela.
- Write-target allowlist: `N/A` (sin tabla nueva) `[confirmar boundary test en Discovery]`
- Tenant/space boundary: heredado del run del audit.
- Idempotency/concurrency: heredada del poll idempotente por `provider_task_id`.
- Audit/outbox/history: sin evento nuevo.

### Migration, backfill and rollout

- Migration posture: `additive` — sólo si `issue_type` tiene CHECK cerrado; si es texto libre, `none`.
- Default state: `flag OFF` — `GROWTH_SEO_HREFLANG_FINDINGS_ENABLED`, subordinado a `GROWTH_SEO_ENABLED`, leído en el **ops-worker**.
- Backfill plan: sin backfill. Los crawls pasados no se re-procesan; la señal aparece en el próximo ciclo semanal.
- Rollback path: flag a `false`.
- External coordination: env var en `deploy.sh` **y** `--update-env-vars`.

### Security and access

- Auth/access gate: heredado del site audit.
- Sensitive data posture: sin PII; son URLs públicas.
- Error contract: honest degradation, sin errores nuevos al cliente.
- Abuse/rate-limit posture: sin llamadas nuevas al proveedor (ver `Detailed Spec §1`).

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/seo`.
- DB/runtime checks: verificar por `information_schema` el CHECK ampliado si hubo migración; live test del reader.
- Integration checks: correr el collect sobre un cliente **multi-mercado real** y otro mono-mercado; el segundo no debe generar hallazgos internacionales.
- Reliability signals/logs: reusa `seo.audit.stuck_tasks`; sin señal nueva.

### Acceptance criteria additions

- [ ] Source of truth y consumidores nombrados con paths reales.
- [ ] Invariantes y postura de degradación explícitos.
- [ ] Migración aditiva o justificada como innecesaria.
- [ ] Evidencia runtime listada, incluido el caso mono-mercado.
- [ ] Sin datos sensibles.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — ✅ EJECUTADO 2026-08-27 (ver `Delta 2026-08-27`)

- Verificado: la señal **no** está en el payload de OnPage y nuestro crawl no guarda `raw_html`.
- Decisión derivada: **la fuente es `@/lib/growth/site-substrate`**, con costo de proveedor USD 0.
- Restricción descubierta: la verificación de retorno cruza hosts, y la guarda del sustrato lo impide
  para clientes con ccTLD. Resuelto con un fetch por target y composición en memoria (`Detailed Spec §3`).

### Slice 2 — Lector por target + extractor puro

- **Lectura**: un fetch por `seo_target` activo de la organización, cada uno con el sustrato acotado a
  **su propio host**. Se leen la home y —si existe— las URLs que el propio `hreflang` declara dentro
  de ese host. Nunca se persigue un dominio ajeno.
- **Extractor puro** `extractHreflangFindings(perTargetDocs, targetsOfOrg)`: sin IO, recibe lo ya
  leído y compone el cruce **en memoria**.
- Tipos: retorno roto, self-reference faltante, `x-default` ausente, código de idioma/región inválido,
  conflicto entre `hreflang` y canonical.
- Cruce con los `seo_targets` de la organización para saber qué variantes **deberían** declararse.

### Slice 3 — Materialización + severidad honesta

- Cableado en el collect del site audit, detrás del flag.
- Severidad calibrada: mono-mercado → cero hallazgos; retorno roto entre dos variantes vivas → `critical`; `x-default` ausente → `notice`.

### Slice 4 — Evidencia y cierre

- Corrida real sobre un cliente multi-mercado y uno mono-mercado.
- Delta en §3 de la arquitectura, runbook, `Handoff.md`, `changelog.md`, fila del flag en el ledger.

## Out of Scope

- **Superficie visible** — es `TASK-1671`.
- **Local pack / Google Business Profile** — `business_data` está fuera del allowlist por decisión declarada; reabrirlo es otra task.
- **Arreglar el `hreflang` del cliente.** Esta task detecta; corregir es trabajo de delivery.
- **`hreflang` del sitio público de Efeonce** — eso es `EPIC-019`.
- **Ampliar el allowlist de familias.** `onpage` ya está.

## Detailed Spec

### 1. Por qué el Slice 1 va primero y puede cambiar la task entera

El valor de esta task depende de un hecho que todavía no está verificado: **si la señal viene en el
crawl que ya pagamos**. Si viene, es extracción y el costo marginal es cero — el mismo principio que
`TASK-1705`. Si no viene, hay que habilitar un parámetro que puede multiplicar el costo por página, y
eso deja de ser una decisión técnica para ser una de presupuesto.

Escribir el extractor antes de saberlo sería construir sobre un supuesto.

### 2. Mono-mercado no es un defecto

La trampa obvia: penalizar la ausencia de `hreflang`. Un cliente que vende sólo en Chile **no debe
tener** `hreflang`, y marcárselo `critical` entrena al operador —y al cliente— a ignorar la severidad
más alta del informe. Es el mismo razonamiento que `TASK-1670` aplicó al bloqueo de bots de
entrenamiento: una postura legítima no es un defecto técnico.

El disparador no es "¿tiene hreflang?" sino **"¿tiene más de un `seo_target` activo y se declaran
entre sí?"**.

### 3. El cruce se compone en memoria, y la guarda no se toca

`hreflang` es un contrato **bidireccional**: si `marca.mx/producto` declara `marca.cl/producto` como
su alterna en es-CL, la página chilena debe declarar la mexicana de vuelta. Un retorno faltante es el
defecto más común y el que Google penaliza ignorando ambas declaraciones.

Verificarlo exige leer **las dos**. Y cuando el cliente usa ccTLD, esas dos viven en dominios
registrables distintos, que es exactamente lo que la guarda del sustrato bloquea desde `TASK-1778`.

**La salida NO es relajar la guarda.** Es reconocer que cada `seo_target` de la organización es un
sujeto legítimo por separado: el target MX autoriza leer `marca.mx`, el target CL autoriza leer
`marca.cl`. Se hace **un fetch por target, cada uno dentro de su propio host**, y el cruce —¿se
declaran mutuamente?— se compone **en memoria**, igual que el boundary §1.1 resuelve el cruce
SEO↔AEO.

Consecuencia operativa: la organización que no tiene declarados sus targets por país **no puede ser
auditada** en este eje, y eso es correcto — sin declarar qué variantes existen, no hay contra qué
contrastar. El resultado honesto ahí es `insufficient_targets`, no "sin hallazgos".

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- 🔴 Slice 1 va primero y puede detener la task para decisión de presupuesto.
- Slice 2 → Slice 3 → Slice 4.
- El flag se prende sólo en Slice 4, tras la corrida real sobre los dos tipos de cliente.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Se penaliza a un cliente mono-mercado por no tener `hreflang` | credibilidad | **high** | El disparador es tener >1 target activo, no la ausencia de la etiqueta; test explícito del caso | Cliente cuestionando un `critical` que no aplica |
| Alguien relaja la guarda del sustrato para poder cruzar ccTLDs y reabre la superficie SSRF de `ISSUE-164` | seguridad | **high** | Regla dura: un fetch por target dentro de su host, cruce en memoria. La guarda no se toca. Revisión de imports y de `resolveProbeUrl` en el PR | PR que modifica la contención de host del sustrato |
| Una organización sin targets por país se audita igual y produce hallazgos sin sentido | credibilidad | medium | `insufficient_targets` como estado explícito; test del caso | Hallazgos de retorno roto en clientes de un solo país |
| N fetches por organización golpean el sitio del cliente | cortesía / reputación | medium | Secuencial como el gatherer, UA identificable, `robots.txt` obedecido (ya lo hace el sustrato tras `TASK-1778`), tope de URLs por target | Quejas del cliente o bloqueo del edge |
| Duplicar la extracción que `TASK-1705` ya hace sobre el mismo payload | mantenimiento | medium | Declarar dirección de reuso en Discovery; la que entre segunda consume a la primera | Dos extractores sobre el mismo crawl |
| El vocabulario de `issue_type` se congela en la UI de 1671 antes que acá | UI / contrato | medium | Coordinar los tipos con 1671 antes de su cierre | Hallazgos que la UI no sabe renderizar |

### Feature flags / cutover

`GROWTH_SEO_HREFLANG_FINDINGS_ENABLED` (default `false`), subordinado a `GROWTH_SEO_ENABLED`, leído
**sólo en el ops-worker** (el collect vive ahí). Declarar en `deploy.sh` **y** aplicar con
`--update-env-vars`. Fila obligatoria en el ledger de flags.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | N/A — sólo produce un informe | n/a | n/a |
| Slice 2 | Revert PR — extractor puro | < 5 min | sí |
| Slice 3 | Flag a `false` | < 5 min | sí |
| Slice 4 | Revert de docs | < 5 min | sí |

### Production verification sequence

1. Migración (si hubo) + verificación del CHECK por `information_schema`.
2. Deploy del worker con flag `false`; confirmar que el audit sigue verde.
3. Flag `true` en la revisión activa; disparar el collect sobre un cliente **multi-mercado**.
4. Disparar sobre un cliente **mono-mercado**: cero hallazgos internacionales.
5. Confirmar que el gasto de la familia `onpage` no se movió.

### Out-of-band coordination required

- Env var en el Cloud Run del ops-worker.
- Decisión del operador si el Slice 1 concluye que la señal exige un parámetro pagado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El Slice 1 dejó por escrito si la señal viene en el crawl vigente y, si no, cuánto costaría habilitarla.
- [ ] Un cliente con un solo `seo_target` activo genera **cero** hallazgos internacionales.
- [ ] Un retorno roto entre dos variantes vivas se materializa como `critical`.
- [ ] Un crawl que no trajo la señal produce `unknown`, nunca "sin hallazgos".
- [ ] El gasto de la familia `onpage` no aumentó, verificado en `seo_provider_spend_daily`.
- [ ] Los tipos de `issue_type` están coordinados con `TASK-1671`.
- [ ] El flag tiene fila en `FEATURE_FLAG_STATE_LEDGER.md` y `pnpm docs:closure-check` pasa.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/growth/seo`
- `pnpm test` (gate de cierre)
- Corrida real del collect sobre un cliente multi-mercado y uno mono-mercado

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] impacto cruzado sobre `TASK-1671`, `TASK-1705` y `TASK-1670`
- [ ] delta en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §3
- [ ] runbook creado

## Follow-ups

- Evaluar reabrir `business_data` para local pack / GBP si un cliente con presencia física lo requiere.
- Detección de canonical cross-país conflictivo, si el payload lo permite.

## Open Questions

- ~~¿La señal viene en el crawl vigente?~~ **Resuelto 2026-08-27: no.** La fuente es el sustrato propio (`Delta 2026-08-27`).
- ¿Cuántas URLs por target se leen? La home basta para detectar el patrón, pero el retorno roto puede vivir en páginas internas. Propuesta: home + hasta N URLs declaradas por el propio `hreflang`, con N configurable.
- ¿`issue_type` tiene CHECK cerrado hoy? Si sí, hace falta migración aditiva.

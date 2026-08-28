# TASK-1717 — AEO Grader: superficie de consumidor (`llm_scraper`) como tercer eje, sin tocar el score

## Delta 2026-08-27

- El defecto §1.2 que esta task se propone no repetir **está cerrado**: el adapter de AI Mode migró
  de `postDataForSeoSerpLiveAdvanced` a `postDataForSeoTask` y pasa `organizationId` derivado
  server-side de `grader_profiles.organization_id`, con `consumer: 'aeo'` — cerrado por TASK-1696. El
  transporte ya no permite olvidarlo: `consumer` es requerido por tipo en todas sus variantes.
- El tope USD per-org «propio o de TASK-1696» dejó de ser una alternativa: `resolveAeoBudget`
  (`src/lib/growth/ai-visibility/budget.ts`) existe, en shadow. La superficie nueva se cuelga de ese
  resolver; no crea uno paralelo.
- `ProviderAdapterContext` transporta ahora `organizationId: string | null`, derivado del perfil y
  nunca del payload del run — cambiado por TASK-1696.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
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
- Domain: `content`
- Blocked by: `TASK-1651`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El grader mide los cuatro motores llamando la **API** de cada proveedor. Los cuatro incumbentes que
publican su método —Semrush, Ahrefs, Sistrix, Botify— **rechazan explícitamente ese carril** porque a
la respuesta de API le falta el system prompt de consumidor y la navegación por defecto, así que no
reproduce citaciones ni fuentes. Esta task agrega una **tercera superficie**, `consumer_surface`, que
mide lo que ve un usuario real en ChatGPT y Gemini vía `llm_scraper` de DataForSEO.

**No reemplaza `answer_engines`: convive con él.** Modelo base y producto de consumidor responden
preguntas distintas, y fusionarlas es el error que la disciplina `◑`/`●` de este módulo existe para
evitar. **El score vigente no se mueve en esta task.**

## Why This Task Exists

El benchmark de ~30 suites (2026-08-15) dejó dos hechos que el grader no puede seguir ignorando.

**Uno.** Los cuatro que publican método convergen contra la API, con sus palabras: Semrush *"captured
from real requests and not via any APIs of LLMs"*; Ahrefs *"All prompts run through the free,
publicly available web interfaces"*; Sistrix *"automatisiertes Crawling statt APIs"*; Botify *"vetted
third-party web scraping partners"*. No es la opinión de un competidor: es convergencia técnica sobre
un límite real del transporte que usamos.

**Dos.** Nuestro score **no es comparable** con el de ninguna herramienta del mercado. En Gemini el
solapamiento entre marcas mencionadas y dominios citados baja al **30%**, y Evertune mide bajo
conciencia no asistida. Miden objetos distintos. Hoy no tenemos forma de decir cuánto de la brecha es
transporte y cuánto es método — porque sólo medimos por un carril.

Y hay un atajo que vuelve esto barato: **Botify tampoco scrapea, compra**. DataForSEO —proveedor que
ya tenemos contratado— vende esa superficie a **USD 0,0012 por página**, y devuelve además
`brand_entities` y `fan_out_queries`, que hoy calculamos con un LLM propio.

## Goal

- Capturar la superficie de consumidor de **ChatGPT y Gemini** vía `llm_scraper`, persistida como
  observaciones normalizadas de una superficie propia.
- Que el **score vigente no cambie ni un punto** por esta task: la superficie nueva nace en shadow y
  fuera del cálculo.
- Que cada llamada quede **atribuida en el ledger de gasto per-org**, sin repetir el defecto §1.2 de
  la auditoría (el grader compra hoy fuera del ledger).
- Dejar declarado y medible **cuánto difiere el mismo prompt por API contra por superficie** — el dato
  que hoy no tenemos y que nadie en el mercado ha publicado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` (patrón flag default-OFF + shadow + flip)

Reglas obligatorias:

- **El score vigente no se mueve.** El motor de scoring renormaliza pesos sobre los providers
  disponibles: agregar providers al cálculo cambiaría **toda comparación histórica** de todo cliente.
  La superficie nueva se captura y se persiste, pero **no entra al score** en esta task.
- **Un provider id nuevo por superficie, no una dimensión de transporte sobre los existentes.**
  `GRADER_PROVIDER_SURFACE` (`normalization/contracts.ts:49`) es una función total provider → surface
  garantizada por `satisfies Record<Exclude<NormalizedFindingProvider,'manual_import'>, …>`. Meterle
  transporte la vuelve parcial y obliga a desambiguar en cada consumer.
- **Toda llamada registra gasto con `organizationId`.** La auditoría §1.2 documentó que las 35
  observaciones AI Mode del grader **no aparecen en ninguna fila** del ledger porque
  `postDataForSeoSerpLiveAdvanced` no pasa `organizationId`. No repetir ese defecto.
- **Degradación honesta.** Si el scraper falla o la superficie no está disponible para ese
  mercado/idioma, la observación es `skipped`/`failed` con `errorCode`, **jamás** un cero ni una
  ausencia silenciosa.
- **La superficie nueva no se promedia con `answer_engines`.** Son ejes distintos; presentarlos
  fusionados es el error de categoría que esta task existe para no cometer.

## Normative Docs

- `.claude/skills/dataforseo-operator/references/08-ai-optimization.md` — deep-dive de la API
  (§2 LLM Scraper: paths, params, item types, costos por cola). As-of 2026-08-06.
- `.claude/skills/seo-aeo-practice/references/BENCHMARK_SUITES_AEO_2026-08.md` — set de 5 archivos;
  §10 «podemos / no podemos decir» y §9 «lo que descubrió sobre nosotros».
- `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` **§4.4** — el análisis
  que origina esta task, con la decisión «no reemplazar, separar» y lo que bloquea.

## Dependencies & Impact

### Depends on

- **`TASK-1651`** — dueña de la ampliación del allowlist DataForSEO con la familia
  `/v3/ai_optimization/` (proceso gobernado: familia + CHECK del spend ledger + parity test en el
  mismo PR). **Esta task NO amplía el allowlist: lo consume.** Sin `1651`, `llm_scraper` no es
  invocable.
- `greenhouse_growth.seo_provider_spend_daily` — ledger de gasto del módulo.
- `src/lib/growth/ai-visibility/normalization/contracts.ts` — `GRADER_ENGINE_SURFACES` y
  `GRADER_PROVIDER_SURFACE`.
- `src/lib/growth/ai-visibility/providers/types.ts` — contrato `ProviderAdapter`.

### Blocks / Impacts

- **`TASK-1696`** (ledger con dimensión de consumidor + gate USD per-org): esta task agrega un
  consumidor de gasto nuevo. Si `1696` cierra antes, esta task se acopla a su gate en vez de crear uno.
- **`ISSUE-158`** (adapters sin ubicación geográfica): **no lo cierra**, pero comparte causa. El
  `llm_scraper` exige `location_name`/`location_code` + `language_code` obligatorios, así que la
  superficie nueva nace geolocalizada por contrato. La corrección de los cuatro adapters de
  `answer_engines` sigue siendo trabajo de `ISSUE-158`.
- **`TASK-1704`** (cadencia y muestreo, `N≥3`): ⚠️ **esta task NO arregla el `N=1`.** Cambiar de
  transporte sin arreglar la precisión es cambiar de problema. Explícito para que nadie lo cuente
  como resuelto.
- **`TASK-1652`** (location ISO-2 del adapter AI Mode): superficie hermana, mismo proveedor, defecto
  distinto. No se solapan.
- Reportes cliente y operador del grader: ganan un eje que hoy no existe, en un slice posterior.

### Files owned

- `src/lib/growth/ai-visibility/providers/chatgpt-consumer-adapter.ts` *(nuevo)*
- `src/lib/growth/ai-visibility/providers/gemini-consumer-adapter.ts` *(nuevo)*
- `src/lib/growth/ai-visibility/providers/registry.ts`
- `src/lib/growth/ai-visibility/normalization/contracts.ts`
- `src/lib/growth/ai-visibility/contracts.ts`
- `src/lib/ai/dataforseo.ts`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- Cinco adapters con contrato común (`providers/types.ts`), que **nunca lanzan** por configuración
  ausente: resuelven a observación normalizada con `skipped`/`failed` + `errorCode`.
- Dos superficies canónicas: `GRADER_ENGINE_SURFACES = ['answer_engines','ai_search']`
  (`normalization/contracts.ts:46`), con el mapa total provider → surface justo debajo.
- Un adapter que **ya va por DataForSEO**: `google-ai-overview-adapter.ts`. El seam de proveedor
  externo existe y está probado; esta task no lo inventa.
- Cliente DataForSEO con registro de gasto condicional en `src/lib/ai/dataforseo.ts:260`.
- Familia `ai_optimization` documentada al detalle en la skill del proveedor, incluidos costos por
  cola y los item types que devuelve el scraper.

### Gap

- No existe superficie de consumidor: los cuatro motores se miden **sólo** por API.
- `llm_scraper` está **fuera del allowlist** de DataForSEO (`TASK-1651` es su dueña).
- No hay forma de responder «¿cuánto difiere lo que ve un usuario de lo que devuelve la API?» —
  ni nosotros ni nadie en el mercado lo ha publicado.
- El gasto del grader contra DataForSEO no se atribuye a organización (auditoría §1.2).

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/growth/ai-visibility/providers/` dentro del portal Next.js
- Future candidate home: `domain-package`
- Boundary: adapters implementan `ProviderAdapter`; el único consumer autorizado es el orquestador de
  corridas del grader. El acceso a DataForSEO pasa por `src/lib/ai/dataforseo.ts`, nunca por `fetch`
  directo en el adapter.
- Server/browser split: `server-only`; el adapter resuelve credenciales server-side y jamás cruza al
  bundle cliente
- Build impact: `none` — sin dependencia nueva, reusa el cliente HTTP existente
- Extraction blocker: la resolución del secreto de DataForSEO y el registro de gasto per-org están
  acoplados al runtime del portal

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `greenhouse_growth.provider_observations` (observaciones) +
  `greenhouse_growth.seo_provider_spend_daily` (gasto) + `GRADER_PROVIDER_SURFACE` (taxonomía)
- Consumidores afectados: orquestador de corridas del grader, readers de reporte cliente y operador,
  MCP downstream
- Runtime target: `staging` primero, luego `production`

### Contract surface

- Contrato existente a respetar: `src/lib/growth/ai-visibility/providers/types.ts` (`ProviderAdapter`),
  `normalization/contracts.ts` (`GRADER_ENGINE_SURFACES`, `GRADER_PROVIDER_SURFACE`)
- Contrato nuevo o modificado: dos provider ids nuevos + una superficie nueva en el enum + dos
  adapters que implementan el contrato existente sin cambiarlo
- Backward compatibility: `gated` — flag default OFF; con la flag apagada el sistema se comporta
  exactamente como hoy, incluidos los mismos providers en el mismo score
- Full API parity: la superficie se expone por los readers canónicos del grader; ningún consumer lee
  `provider_observations` directo

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.provider_observations`,
  `greenhouse_growth.grader_runs`, `greenhouse_growth.seo_provider_spend_daily`
- Invariantes que no se pueden romper:
  - **El score de una corrida con la flag apagada es idéntico byte a byte al de hoy.**
  - `GRADER_PROVIDER_SURFACE` sigue siendo una función **total** provider → surface, garantizada en
    compilación por su `satisfies Record<…>`.
  - Una observación de `consumer_surface` **nunca** se promedia ni se fusiona con una de
    `answer_engines` en ninguna agregación.
  - Todo gasto contra DataForSEO lleva `organizationId`; una llamada sin atribución es un defecto,
    no una degradación aceptable.
  - Fallo del scraper produce observación `skipped`/`failed` con `errorCode`; **nunca** cero ni
    ausencia silenciosa.
- Tenant/space boundary: `organizationId` se deriva del perfil de la corrida, igual que hoy
- Idempotency/concurrency: la corrida ya tiene `idempotency_key`; el adapter hereda el mismo timeout
  y política de reintentos del contexto (`ProviderAdapterContext`)
- Audit/outbox/history: observaciones append-only, igual que las superficies existentes

### Migration, backfill and rollout

- Migration posture: `additive` — sólo si el enum de superficie/provider está persistido con CHECK en
  DB; confirmarlo en Discovery contra el schema real
- Default state: `flag OFF` + shadow
- Backfill plan: **ninguno.** No se reprocesan corridas históricas: una corrida vieja no tiene
  superficie de consumidor y fingir que sí la tiene sería inventar dato
- Rollback path: flag a `false` + redeploy; las observaciones capturadas quedan, inertes
- External coordination: ampliación del allowlist DataForSEO (`TASK-1651`) + sign-off del operador
  sobre la postura de términos de servicio

### Security and access

- Auth/access gate: entitlement AEO per-org existente + el tope en USD (propio o el de `TASK-1696`)
- Sensitive data posture: sin PII. El contenido scrapeado es respuesta pública de un asistente
- Error contract: `canonicalErrorResponse` en cualquier superficie HTTP; el error crudo del proveedor
  va a `captureWithDomain`, jamás al cliente
- Abuse/rate-limit posture: cola estándar por defecto (USD 0,0012, ≤45 min) en vez de live; el tope
  en USD per-org es el circuit breaker

### Runtime evidence

- Local checks: `pnpm test src/lib/growth/ai-visibility`, más un test que **congela el score** de un
  fixture con la flag encendida y apagada y exige que sea el mismo
- DB/runtime checks: consulta a `provider_observations` verificando que las filas nuevas llevan la
  superficie correcta, y a `seo_provider_spend_daily` verificando que el gasto quedó atribuido
- Integration checks: una llamada real a `llm_scraper` en staging contra un dominio propio
  (`efeoncepro.com`), con `location_code` de México y de Chile
- Reliability signals/logs: señal de observaciones de `consumer_surface` en estado terminal sin
  contenido, análoga a las existentes
- Production verification sequence: en la sección de rollout

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

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

### Slice 1 — Taxonomía: la tercera superficie y sus dos providers

- Agregar `consumer_surface` a `GRADER_ENGINE_SURFACES` con el comentario que explica **qué pregunta
  responde** y por qué no se fusiona con `answer_engines`.
- Agregar los provider ids `chatgpt_consumer` y `gemini_consumer` y mapearlos en
  `GRADER_PROVIDER_SURFACE`. El `satisfies Record<…>` obliga a que el mapa quede exhaustivo.
- Test que congela el score de un fixture existente y falla si el número cambia por la ampliación del
  enum.
- Labels visibles en `src/lib/copy/growth.ts`, validadas con `greenhouse-ux-writing`.

### Slice 2 — Cliente `llm_scraper` en el cliente DataForSEO

- Función en `src/lib/ai/dataforseo.ts` para
  `/v3/ai_optimization/{chat_gpt|gemini}/llm_scraper/live/advanced`, con `keyword`, `location_code`,
  `language_code` y `tag`.
- **Registro de gasto con `organizationId` obligatorio en la firma**, no opcional: es el defecto §1.2
  de la auditoría convertido en imposibilidad de tipo.
- Parseo de los item types a la forma normalizada: `sources[]`, `brand_entities`, `fan_out_queries`,
  `markdown`.
- Fixtures de respuesta real capturados en staging, no inventados.

### Slice 3 — Los dos adapters, en shadow

- `chatgpt-consumer-adapter.ts` y `gemini-consumer-adapter.ts` implementando `ProviderAdapter`.
- `isEnabled` gobernado por `GROWTH_AI_VISIBILITY_CONSUMER_SURFACE_ENABLED` (default `false`) más la
  presencia del secreto, igual que los adapters existentes.
- Registro en `registry.ts`, **excluidos del cálculo de score** por construcción.
- Fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en **este mismo PR**.

### Slice 4 — El experimento que nadie publicó: API contra superficie

- Script reproducible que corre el mismo set de prompts por los dos carriles sobre la misma marca y
  el mismo mercado, y emite la comparación: menciones, competidores citados, fuentes, solapamiento.
- Correrlo sobre un dominio propio y sobre Grupo Berel con `location_code` de México.
- Registrar el resultado como delta en la auditoría §4.4. **Si el delta resulta chico, se documenta
  igual** — es un hallazgo, no un fracaso.

### Slice 5 — Exposición en readers, declarada como eje aparte

- Los readers del grader exponen la superficie nueva **etiquetada**, nunca fusionada.
- El reporte muestra el eje sólo cuando hay observación real; si no la hay, **nombra la ausencia**
  en vez de rellenarla, igual que la disciplina `◑`/`●` del módulo.

## Out of Scope

- **Cerrar `ISSUE-158`.** La geolocalización de los cuatro adapters de `answer_engines` es suya.
- **Arreglar el `N=1`.** Es de `TASK-1704` y esta task no lo toca.
- **Ampliar el allowlist DataForSEO.** Es de `TASK-1651`.
- **Meter la superficie nueva al score.** Requiere bump de `score_version`, re-baseline y una decisión
  de producto que esta task no toma. Follow-up.
- **Claude y Perplexity.** No existe superficie scrapeable para ellos; nadie en el mercado la tiene.
- **LLM Mentions y LLM Responses.** Otros productos de la misma familia, otras tasks.
- Construir scrapers propios. Se compra la superficie; no se opera infraestructura de scraping.

## Detailed Spec

**Por qué provider ids nuevos y no un campo de transporte.** `GRADER_PROVIDER_SURFACE` está declarado
`satisfies Record<Exclude<NormalizedFindingProvider,'manual_import'>, GraderEngineSurface>`. Eso hace
que el compilador exija el mapa completo: si mañana alguien agrega un provider y olvida su superficie,
el build rompe. Un campo de transporte sobre `openai`/`gemini` convertiría la función en parcial
—el mismo id apuntando a dos superficies según contexto— y obligaría a cada consumer a desambiguar.
Ids nuevos conservan la garantía de compilación y dejan el cambio aditivo.

**Qué devuelve el scraper que hoy pagamos aparte** (skill del proveedor §2): `sources[]` por item con
título, url, dominio, snippet y fecha —*"the sources the model actually cited"*—, más `brand_entities`
(marcas mencionadas con categoría y URLs) y `fan_out_queries`. Las dos últimas hoy las produce un LLM
propio. Verificar en Discovery si conviene consumirlas del proveedor o conservar la extracción propia
por reproducibilidad del score.

**Costos.** USD 0,0012/página estándar (≤45 min), 0,0024 priority (≤5 min), 0,004 live (≤90 s). Con
las 24 observaciones por corrida que muestran las corridas reales, el orden es USD 0,03–0,10 por
corrida. Usar cola estándar salvo que la corrida sea interactiva.

**Alcance del proveedor.** `llm_scraper` cubre **sólo ChatGPT y Gemini**. Gemini usa la variante
"Fast" y no expone una designación separada de AI Mode. Confirmar en Discovery contra el endpoint
`locations` que los mercados de nuestros clientes están soportados antes de prometer cobertura.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (taxonomía) → Slice 2 (cliente) → Slice 3 (adapters en shadow) → Slice 4 (experimento) →
  Slice 5 (exposición).
- **Slice 1 DEBE cerrar con el test de score congelado en verde antes de que exista un adapter.** Si
  el enum se amplía y el score se mueve, todo lo demás construye sobre una regresión silenciosa.
- **Slice 4 DEBE correr antes que Slice 5.** Exponer el eje sin saber cuánto difiere de la API es
  publicar un número que no sabemos interpretar.
- `TASK-1651` cierra antes que Slice 2. Sin allowlist, la llamada no sale.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Ampliar el enum de providers mueve el score y rompe toda comparación histórica | grader / reporte cliente | **high** | test de score congelado en Slice 1; la superficie nace fuera del cálculo | test de regresión de score en CI |
| El gasto nuevo no queda atribuido a organización y repite el defecto §1.2 | ledger de gasto | medium | `organizationId` obligatorio en la firma, no opcional | fila del ledger ausente para una corrida con observaciones |
| El scraper falla o el mercado no está soportado y produce ausencia silenciosa | grader | medium | observación `skipped`/`failed` con `errorCode`; verificación contra el endpoint `locations` | señal de observación terminal sin contenido |
| Consumo sin tope: la superficie nueva multiplica el gasto per-org | presupuesto DataForSEO | medium | cola estándar por defecto + tope USD per-org (propio o de `TASK-1696`) | ledger diario por organización |
| Exposición a términos de servicio del proveedor scrapeado | legal / reputacional | **low-medium** | se compra a DataForSEO, no se opera scraping propio; sign-off del operador antes del flip | escalamiento del proveedor |
| Alguien lee esta task como «ya medimos como Semrush» y cierra el `N=1` | proceso | medium | declarado en Out of Scope y en Blocks/Impacts | revisión de cierre |

### Feature flags / cutover

- `GROWTH_AI_VISIBILITY_CONSUMER_SURFACE_ENABLED`, default `false`, registrada en
  `FEATURE_FLAG_STATE_LEDGER.md` en el PR del Slice 3.
- ⚠️ **Prender esta flag es multi-runtime.** Antes del flip, mapear dónde se lee
  (`grep -rn "CONSUMER_SURFACE" src/ services/`) y aplicarla en **todos** los runtimes que la
  ejecuten. Si la corrida del grader se ejecuta async, vive en el `ops-worker` y **no** en Vercel; en
  Cloud Run el SoT es `services/<worker>/deploy.sh`, y aplicar sólo con `--update-env-vars` deja la
  flag muerta en el próximo deploy, en silencio.
- Revert: flag a `false` + redeploy. Menos de 5 minutos.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del PR; el enum es aditivo y nada lo consume aún | <10 min | sí |
| Slice 2 | revert del PR; la función nueva no tiene callers | <10 min | sí |
| Slice 3 | flag a `false` + redeploy en todos los runtimes | <5 min | sí |
| Slice 4 | ninguno — script de análisis, sin efecto en runtime | — | n/a |
| Slice 5 | flag a `false`; los readers dejan de exponer el eje | <5 min | sí |

### Production verification sequence

1. `TASK-1651` cerrada y `llm_scraper` invocable; verificar con una llamada de prueba.
2. Deploy con la flag en `false`; **verificar que una corrida produce el mismo score que antes**.
3. Flip a `true` en staging; correr contra un dominio propio con `location_code` de México y Chile;
   verificar observaciones persistidas con la superficie correcta y gasto atribuido.
4. Correr el experimento del Slice 4 y **leer el resultado antes de avanzar**.
5. Flip en producción con la flag encendida sólo para una organización, 7 días de observación del
   ledger diario.
6. Ampliar al resto sólo si el gasto por corrida se mantiene en el orden esperado.

### Out-of-band coordination required

- **Ampliación del allowlist DataForSEO** — `TASK-1651`, con su proceso gobernado.
- **Sign-off del operador sobre términos de servicio.** Comprarle el scraping a DataForSEO traslada
  la exposición contractualmente pero **no la elimina** — por eso Botify escribe «partners
  verificados» y no «nosotros scrapeamos». Es decisión del operador, no del agente que implementa.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `GRADER_ENGINE_SURFACES` incluye `consumer_surface` y `GRADER_PROVIDER_SURFACE` sigue siendo
      total, garantizado en compilación.
- [ ] Existe un test que corre un fixture con la flag encendida y apagada y **exige el mismo score**;
      está en verde.
- [ ] La firma de la función de `llm_scraper` **exige `organizationId`**; no compila sin él.
- [ ] Una corrida en staging con la flag encendida deja filas en `provider_observations` con la
      superficie `consumer_surface` y una fila de gasto atribuida en `seo_provider_spend_daily`.
- [ ] Un fallo del scraper produce observación `skipped`/`failed` con `errorCode`, verificado con un
      caso real, y **no** un cero.
- [ ] Ninguna agregación promedia `consumer_surface` con `answer_engines`; hay test que lo cubre.
- [ ] El experimento del Slice 4 corrió y su resultado está registrado como delta en la auditoría
      §4.4, incluso si el delta resultó chico.
- [ ] `GROWTH_AI_VISIBILITY_CONSUMER_SURFACE_ENABLED` tiene fila en el ledger de flags, con su runtime
      declarado.
- [ ] `pnpm task:lint --task TASK-1717` reporta `template=1 errors=0 warnings=0`.

## Verification

- `pnpm local:check`
- `pnpm test src/lib/growth/ai-visibility`
- `pnpm test` completo y `pnpm build` de producción como gate de cierre
- `pnpm docs:closure-check`
- Llamada real a `llm_scraper` en staging con evidencia de la respuesta y del gasto registrado

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] la arquitectura del grader documenta la tercera superficie y **por qué no entra al score**
- [ ] la auditoría §4.4 quedó con el delta del experimento del Slice 4

## Follow-ups

- **Decidir si `consumer_surface` entra al score.** Requiere bump de `score_version`, re-baseline de
  clientes vivos y una decisión de producto. No se hace por inercia.
- **`ISSUE-158`** — geolocalización de los cuatro adapters de `answer_engines`, posiblemente vía
  `llm_responses`, que acepta `web_search_country_iso_code` y `web_search_city`.
- **`TASK-1704`** — el `N≥3`. Sigue pendiente y esta task no lo toca.
- Evaluar si `brand_entities` y `fan_out_queries` del proveedor reemplazan la extracción propia, o si
  la reproducibilidad del score obliga a conservarla.

## Open Questions

- ¿El enum de superficie y de provider está persistido con CHECK en PostgreSQL? Si sí, la postura de
  migración pasa de `none` a `additive`. Se resuelve en Discovery contra el schema real.
- ¿El endpoint `locations` de `llm_scraper` cubre los mercados de nuestros clientes vivos? La skill
  documenta 215 ubicaciones para la familia, pero la cobertura **por producto** hay que confirmarla
  contra el endpoint, no contra la documentación.
- ¿La corrida del grader se ejecuta en Vercel o en el `ops-worker`? Decide dónde se prende la flag y
  es la diferencia entre que funcione y que no, en silencio.

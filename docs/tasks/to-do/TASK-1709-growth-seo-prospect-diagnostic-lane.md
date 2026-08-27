# TASK-1709 — Growth SEO: carril de diagnóstico de prospecto (sin contrato, sin acceso del cliente)

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
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `TASK-1697`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Delta 2026-08-15 (2) — cifras corregidas por verificación adversarial

Corrección **editorial**: no cambia el diseño, el alcance ni ninguna decisión de esta task.

El "~98% de la factura variable" que esta task cita de la auditoría fuente está mal dividido. El
valor correcto es **90,0%** con el modelo de proyección del propio documento (USD 4,06 de USD 4,51)
y **76,7%** contra los dólares realmente medidos en `greenhouse_growth.seo_provider_spend_daily`
(`serp` USD 1,3440 sobre USD 1,7525 totales, ventana 2026-08-06→15). El rank capture sigue siendo,
por lejos, la parte dominante de la factura variable, y la regla dura de esta task —cero captura
recurrente sobre un prospecto— no depende del porcentaje.

## Delta 2026-08-26 — la evidencia de sitio ENTRA al carril, delegada y con robots respetado

Cambia el alcance: el diagnóstico de prospecto deja de ser sólo de mercado y suma **evidencia
técnica del sitio**. Es una decisión del operador (2026-08-26), y estas son sus condiciones.

**Por qué la prohibición original no era una política de producto.** La regla decía "nunca fetchea el
sitio del prospecto", pero su razón, escrita en la propia risk matrix, era **SSRF** — no la ética de
rastrear a alguien que no lo pidió. Y la prohibición dejaba al carril SEO sin algo que **el carril
AEO de al lado ya hace en producción**: el grader público fetchea el sitio del prospecto desde
`src/lib/growth/ai-visibility/probes/safe-fetch.ts` (`TASK-1266`), un lector read-only con guarda
SSRF, User-Agent de cortesía que **nos identifica**, timeout, tope de 1 MiB y redirect acotado al
mismo host registrable. La asimetría no tenía defensa: el mismo prospecto recibía probes por un
carril y no por el otro.

**Qué cambia y qué no.**

- **NO cambia**: este módulo **sigue sin importar `safe-fetch`** y sigue sin construir una URL de red
  por su cuenta. La superficie SSRF no se duplica.
- **SÍ cambia**: el colector **pide** evidencia de sitio a los primitives dueños del fetch. Dos
  carriles complementarios, ambos ya gobernados y **ninguno exige herramienta nueva**:
  - **Sustrato propio** (`TASK-1697`, `@/lib/growth/site-substrate`): lectura puntual de `robots.txt`,
    JSON-LD, sitemap y HTML. Costo de proveedor **USD 0**, latencia de segundos. Es el carril por
    defecto del diagnóstico de prospecto.
  - **OnPage de DataForSEO** (familia ya permitida): crawl del sitio a USD 0,000125/página cuando el
    diagnóstico amerite profundidad. Task-based async, así que corre en el ops-worker.
- **Blocker nuevo y real**: `Blocked by: TASK-1697`. Hoy el fetcher vive dentro de
  `ai-visibility/probes/**` y `growth/seo` no puede importarlo sin abrir un deep import cross-dominio
  — que es justo lo que la lint rule angosta de 1697 nace prohibiendo. **Sin 1697, la forma correcta
  de esta capacidad no existe**, y la forma incorrecta (copiar el fetcher, o importar cruzado) crea
  la deuda que 1697 existe para cerrar. 1697 es `P0` y `to-do`.

**Dónde queda la línea ética y legal, ahora que sí rastreamos.** Rastrear superficies públicas
respetando `robots.txt` es la conducta normal de cualquier crawler. Lo indefendible es **evadir un
bloqueo explícito de alguien con quien todavía no tenemos relación comercial**. Por eso:

- OnPage respeta `robots.txt` por defecto (`robots_txt_merge_mode: merge`) y **ese default no se
  toca**. `override` + `custom_robots_txt` quedan prohibidos en este carril.
- `switch_pool` e `ip_pool_for_scan` (pools de proxy para sortear bloqueos) quedan prohibidos.
- El `custom_user_agent` **nunca** oculta quiénes somos: se identifica igual que el UA de cortesía
  del grader. Si el prospecto revisa sus logs antes de que hablemos, debe poder ver que fuimos
  nosotros y por qué.
- 🔴 **Un bloqueo es un hallazgo, no un obstáculo.** Si el crawl vuelve `forbidden_robots`,
  `forbidden_meta_tag` o `forbidden_http_header` (`summary.extended_crawl_status`), eso **es** el
  dato: se persiste como hecho con su lente y se reporta. Es además el punto ciego más caro que
  `TASK-1670` existe para cerrar — un sitio que bloquea a los crawlers de IA hoy puntúa 95/100.

⚠️ **Corrección de alcance (misma fecha).** Las cuatro reglas de arriba son verdad **para el carril
OnPage**, donde el proveedor respeta `robots.txt` por default y lo único que hacemos es no
desactivarlo. Para el **sustrato propio** son hoy una afirmación sin mecanismo: `safe-fetch` lee
`/robots.txt` para *analizarlo* y no existe ningún camino de código que lo *obedezca*. Cerrar esa
brecha es el `Slice 4` de **`TASK-1778`**, que además arregla dos defectos de seguridad y uno de
exactitud del mismo fetcher (`ISSUE-164`). Hasta que 1778 cierre, **este carril sólo puede prometer
respeto de `robots.txt` sobre la evidencia obtenida por OnPage** — no sobre la del sustrato. Decir lo
contrario en un documento comercial sería exactamente el patrón que este delta dice combatir.

> **Actualización 2026-08-27 (TASK-1778 Slice 4 code complete).** El mecanismo ya existe: el fetcher
> propio **obedece** `robots.txt` (`robots-policy.ts`, matching contra NUESTRO token con fallback
> `*`, `/robots.txt` siempre alcanzable, `Disallow` que nos alcanza → `blocked_robots` = hallazgo).
> La obediencia viaja **sin flag** — apenas el código de 1778 esté desplegado en el runtime que
> ejecute este carril, la promesa de robots cubre AMBOS carriles (OnPage + sustrato). Precisión: lo
> que sigue gated por `GROWTH_PROBE_FETCH_STRICT_NETWORK_ENABLED` (default OFF, cutover pendiente)
> es el endurecimiento de RED (redirects + DNS), no robots. Verificar deploy antes de escribir la
> promesa ampliada en un entregable comercial.

**Herramientas nuevas: ninguna.** Se evaluó sumar un scraper externo tipo Apify y se **descarta**:
todo lo que aportaría ya existe dos veces (render headless vía `enable_browser_rendering` de OnPage;
lectura puntual vía el sustrato propio), y su valor diferencial real —rotación de proxies para
rastrear a quien te bloquea— es exactamente la conducta que este delta prohíbe. Sumarlo abriría una
sexta familia fuera del allowlist, con secreto, breaker y dimensión de gasto propios, para comprar
una capacidad que no queremos usar.

**Slice nuevo**: `Slice 2b — Evidencia de sitio delegada`, entre el colector de mercado y la
derivación. Su orden es load-bearing: 2b no puede empezar antes de que `TASK-1697` haya extraído el
sustrato.

## Summary

El módulo SEO sólo sabe hablarle a un cliente que ya firmó: sus tres tiers
(`contracted | trial | pilot`) presuponen contrato, y bajo `src/app/api/public/growth/` hay
`ai-visibility`, `ctas`, `forms` y `meetings` — **no hay SEO**. Esta task abre el tier `prospect`:
una corrida única sobre cualquier dominio, con tope DURO en USD por diagnóstico, alimentada sólo
por endpoints que **no requieren acceso del prospecto** (~USD 0,30–0,50 por diagnóstico). El
entregable es un contrato gobernado con hechos medidos y su `as-of`; la cara visible se difiere a
propósito (ver `Out of Scope`).

## Why This Task Exists

**La asimetría del proveedor es la oportunidad: DataForSEO mide cualquier dominio sin pedirle
acceso a nadie; Search Console no.** Todo lo que hoy hace el módulo depende de una propiedad GSC
conectada, que sólo existe después de la firma. Pero la pregunta de más valor comercial —"¿qué
estás perdiendo?"— se contesta antes de la firma, con dato del proveedor, sin tocar el sitio del
prospecto.

El motor AEO ya demostró que ese carril funciona y es rentable: tiene run público
(`src/app/api/public/growth/ai-visibility/run/route.ts`), informe tokenizado
(`report/[token]/route.ts`), short-link (`report/short-link/[code]/route.ts`) y hand-off comercial
a HubSpot (`sendAeoReportAndCreateLead`, TASK-1279). El allowlist del proveedor lo dice literal:
la familia `serp` declara `requiresOrganization: false` con el propósito *"Lo consume el AEO grader
sobre prospectos"* (`src/lib/ai/dataforseo-families.ts:42-46`). El SEO no tiene nada equivalente y
es el motor con **mejor economía de adquisición** de los dos.

Economía: ~USD 0,30–0,50 por prospecto ⇒ **100 diagnósticos = USD 50 = el presupuesto mensual de UN
cliente contratado** (`GROWTH_SEO_CONTRACTED_MONTHLY_BUDGET_USD`, default 50 en
`entitlement.ts`). Contra un consumo real medido de ~USD 4,51/mes/cliente (auditoría §2.1), el
costo de adquisición cabe holgado en el 85% de presupuesto que hoy no se usa.

Fuente: `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` §3.4 C7 + §7.

## Goal

- Tier `prospect` en el resolver de entitlement SEO, con **tope duro en USD por diagnóstico** y
  gasto atribuido y visible en el ledger canónico, sin abrir un segundo almacén de gasto.
- Colector de prospecto que produce evidencia usando **sólo** fuentes que no requieren acceso del
  cliente, y que **nunca fetchea por su cuenta**: la evidencia de sitio se pide a los primitives
  dueños del fetch (sustrato SSRF-guarded de `TASK-1697` · OnPage), jamás con un `fetch` propio.
  Ver `## Delta 2026-08-26`.
- Diagnóstico expuesto por contrato gobernado (reader + command, Full API Parity: app · Nexa ·
  ecosystem/MCP), con toda cifra marcada `◑ estimado` y con su `capturedAt`.
- Encadenamiento comercial declarado y verificable: Grader mide → este diagnóstico cuantifica la
  pérdida → Radiografía AEO demuestra cómo se arregla → propuesta convierte.

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
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§6 DataForSEO governance · §7
  primitives Full API Parity · §9 entitlements `growth.seo.*` per-org · §17.2 el único acople a la
  org canónica · §17.3 reglas duras de EPIC-022)
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (el carril público
  ya probado: intake gateado, entrega tokenizada, hand-off comercial)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` (patrón #6 capability ⇒ grant + coverage;
  patrón #7 flag default-OFF + shadow + flip)

Reglas obligatorias:

- **NUNCA captura recurrente sobre un prospecto.** Una corrida por diagnóstico y se acabó: cero
  rank capture diario, cero scheduler, cero re-corrida automática. Seguir a un no-cliente es gasto
  perpetuo sin contrato que lo pague — y el rank capture es el **90,0%** de la factura variable
  proyectada del módulo (**76,7%** contra dólares medidos en el ledger; auditoría §2.1, cifra
  corregida). Una re-corrida siempre la pide un humano y vuelve a pasar por el tope.
- **NUNCA una cifra de prospecto sin declarar la lente.** Todo dato de este carril es `◑ estimado`
  y lo dice, con su `capturedAt`. No hay Search Console, así que **no hay un solo dato medido del
  prospecto**: presentar un estimado sin marca es exactamente el defecto que `ISSUE-154` documentó
  en la superficie de cliente, cometido a escala de cientos de artefactos.
- **NUNCA fetchear el sitio del prospecto ni el de su competencia.** `resolveProbeUrl`
  (`src/lib/growth/ai-visibility/probes/safe-fetch.ts:57-75`) acota el fetcher al host del sujeto
  **por diseño**; levantar esa guarda es una decisión legal y reputacional, no de implementación
  (auditoría §4, "Dónde NO conviene motor propio"). Todo lo que este carril sabe del sitio sale del
  proveedor.
- **NUNCA el diagnóstico afirma "tu sitio está sano".** Bajo ninguna circunstancia, ni siquiera con
  todas las señales verdes: el audit no detecta bloqueo a crawlers de IA, y un sitio invisible para
  los motores puede puntuar 95/100 (auditoría §7). El diagnóstico enumera pérdida cuantificada, no
  emite certificado de salud.
- **NUNCA una cifra de mercado ni un lift en el artefacto.** Sólo dato medido de ESE dominio con su
  `as-of`. Cero benchmarks de industria, cero porcentajes de estudios, cero "los sitios que hacen X
  ganan Y%". A USD 0,40 el diagnóstico se van a producir cientos: **un template con una cifra mal
  citada se multiplica por cientos**. Precedente propio: la auditoría de la Radiografía AEO del
  2026-07-14 encontró que **3 de 6 cifras exhibidas no resistían verificación**
  (`docs/think/radiografia-aeo-architecture.md:210`), en la pieza cuyo valor entero es no exagerar.
- **NUNCA una FK nueva desde `seo_*` hacia otro schema que no sea el ancla org** (§17.3), y **NUNCA**
  importar desde otro dominio de Greenhouse salvo primitives transversales.
- **SIEMPRE** el gasto pasa por `enforceSeoRunEntitlement` y aterriza en
  `greenhouse_growth.seo_provider_spend_daily` — fuente única de gasto del módulo (TASK-1300). Cero
  llamadas al proveedor fuera del ledger; ese es el defecto §1.2 de la auditoría y no se repite acá.

## Normative Docs

- `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` (§3.3 capacidad
  ociosa del proveedor con precios · §3.4 C7 y C8 · §4 la línea motor propio vs proveedor · §7 lo
  que no se debe prometer todavía)
- `docs/think/radiografia-aeo-architecture.md` (la muestra de trabajo a la que este diagnóstico
  encadena; su §"auditoría de seis lentes" es el precedente de por qué no se exhiben cifras
  prestadas)
- `docs/manual-de-uso/comercial/usar-radiografia-aeo-en-venta.md` (uso comercial del eslabón
  siguiente de la cadena)
- `.claude/skills/dataforseo-operator/` (oficio del proveedor: elección de endpoint, live vs
  task-based, costo real por llamada)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (fila obligatoria del flag nuevo)

## Dependencies & Impact

### Depends on

- `greenhouse_growth.seo_provider_spend_daily` (TASK-1300, aplicada:
  `migrations/20260805194114467_task-1300-seo-provider-spend-daily.sql`) — ledger de gasto.
  ⚠️ `organization_id` es `NOT NULL` con FK a `greenhouse_core.organizations`: el gasto de
  prospecto **no tiene org propia** y debe atribuirse (ver `Detailed Spec` §3).
- `src/lib/growth/seo/entitlement.ts` — resolver de tier/allowance/budget y chokepoint
  `enforceSeoRunEntitlement`.
- `src/lib/ai/dataforseo.ts` + `src/lib/ai/dataforseo-families.ts` — transporte y allowlist de
  familias (`serp`, `labs`, `backlinks`, `onpage`, `domain`). **Ninguna familia nueva se necesita.**
- `src/lib/growth/seo/register-provider-spend.ts` — el runtime que corra este carril DEBE importarlo
  o `postDataForSeoTask` lanza en la primera llamada que gasta.
- `src/lib/growth/seo/provider-pricing.ts` — tabla de costo para el preview y el tope.
- **`TASK-1697`** (`P0`, `to-do`) — extracción del sustrato de sitio a `@/lib/growth/site-substrate`
  (fetcher con guarda SSRF + parseo HTML) con shim de re-export y lint rule angosta. **Blocker duro**
  del `Slice 2b`: sin él, la evidencia de sitio sólo se puede obtener con un deep import cross-dominio
  a `ai-visibility/probes/**`, que es precisamente lo que 1697 nace prohibiendo. Ver `## Delta 2026-08-26`.
- `src/lib/growth/ai-visibility/probes/safe-fetch.ts` (`TASK-1266`) — **precedente y origen** del
  sustrato, no dependencia de import: es el fetcher que hoy ya rastrea sitios de prospectos por el
  carril AEO. Flag `GROWTH_AI_VISIBILITY_PROBES_ENABLED`: staging ON, producción OFF.

### Blocks / Impacts

- Habilita el eslabón que falta del encadenamiento comercial (Grader → SEO prospecto → Radiografía
  AEO → propuesta). Hoy los tres activos existen y no se tocan entre sí.
- Toca la misma superficie de decisión que `TASK-1662` (keyword gap): **1662 responde "qué rankea la
  competencia y el cliente no" para un CLIENTE con target; esta task responde "qué pierde este
  dominio" para un NO-cliente sin target ni GSC.** Comparten el colector de competidores del
  proveedor: si 1662 aterriza primero, este carril consume su primitive; si aterriza después, 1662
  consume el de acá. Declarar la dirección en Discovery — **nunca dos colectores**.
- Alimenta el follow-up de artefacto/entrega: `TASK-1672` (report artifact) y `TASK-1673` (share +
  send). ⚠️ **Orden crítico declarado por la auditoría (§3.4 C8): el artefacto público NO sale antes
  de `TASK-1670`** — publicarlo antes sería firmar un documento que declara sano un sitio invisible
  para la IA.
- `EPIC-022` gana un tier nuevo en su modelo de entitlement; el margen por org sigue medible porque
  el gasto de adquisición queda separado del gasto de cliente en el mismo ledger.

### Files owned

- `src/lib/growth/seo/prospect/` (nuevo: `contracts.ts`, `collect.ts`, `derive.ts`, `store.ts`,
  `command.ts`, `reader.ts`)
- `src/lib/growth/seo/entitlement.ts` (tier `prospect` + tope por diagnóstico)
- `src/lib/growth/seo/flags.ts` (flag del carril)
- `src/lib/entitlements/runtime.ts` (capability + grant, mismo PR)
- `src/app/api/admin/growth/seo/prospect-diagnostic/route.ts` (nuevo, lane app)
- `src/app/api/platform/ecosystem/growth/seo/prospect-diagnostic/route.ts` (nuevo, lane ecosystem)
- `migrations/<timestamp>_task-1709-seo-prospect-diagnostic.sql` (nuevo)
- `src/lib/copy/growth.ts` (ids del copy del contrato de salida — labels de lente y de estado)
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (delta: tier `prospect` + carril)
- `docs/documentation/growth/` + `docs/manual-de-uso/comercial/` (capas funcional y de manual)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (fila del flag)

## Current Repo State

### Already exists

- **El carril público completo del AEO, como plantilla probada**: intake
  (`src/app/api/public/growth/ai-visibility/run/route.ts`, con captcha + rate-limit + presupuesto
  global + flag default OFF), entrega tokenizada
  (`src/app/api/public/growth/ai-visibility/report/[token]/route.ts`), short-link
  (`.../report/short-link/[code]/route.ts`) y hand-off comercial a HubSpot (TASK-1279).
- **El precedente de sujeto sin org**: `grader_profiles.organization_id` nació **nullable**
  (`migrations/20260626121608544_task-1243-grader-profile-organization-binding.sql`) porque "los
  perfiles existentes son internos/públicos (org NULL)". El binding a la org llega después, si llega.
- **El transporte y el ledger**: `postDataForSeoTask` con allowlist por familia, breaker por familia
  y recorder de gasto obligatorio; `recordSeoProviderSpend` escribiendo el ledger canónico.
- **Los readers y lanes del módulo** como patrón a copiar: 14 rutas bajo
  `src/app/api/platform/ecosystem/growth/seo/**` + sus equivalentes admin.
- **La guarda que este carril NO puede levantar**: `resolveProbeUrl` en `safe-fetch.ts:57-75`.

### Gap

- **No existe `src/app/api/public/growth/seo/`**: bajo `public/growth/` hay `ai-visibility`, `ctas`,
  `forms` y `meetings`, y ninguna SEO. El módulo no tiene forma de hablarle a nadie sin sesión.
- **Los tres tiers presuponen cliente.** `SeoTier = 'contracted' | 'trial' | 'pilot'`
  (`entitlement.ts`) resuelve todo desde `module_assignments` per-org: sin assignment,
  `blockedReason: 'no_entitlement'` y no corre nada. Un prospecto no tiene assignment y nunca lo
  tendrá antes de firmar.
- **`seo_targets.organization_id` es `NOT NULL` con FK `ON DELETE RESTRICT`**
  (`migrations/20260805134439202_task-1299-growth-seo-schema.sql:15-16`): un prospecto no puede ser
  un `seo_target`. El sujeto de este carril es otro objeto.
- **El tope es mensual por org, no por corrida.** `enforceSeoRunEntitlement` no reserva ni hace
  claim (límite documentado en su propio docstring: un batch de 120 keywords con budget `trial`
  llegó a gastar USD 6, sobregiro de 3×). Un tier de adquisición sin tope POR DIAGNÓSTICO hereda
  ese sobregiro multiplicado por la cantidad de prospectos.
- **Capacidad pagada ociosa** que este carril usa por primera vez (auditoría §3.3): los reads
  gratuitos post-crawl de OnPage (leemos 2 de ~13 endpoints), `ranked_keywords` con
  `item_types: ai_overview_reference`, `backlinks/competitors` + `domain_intersection`,
  `serp_competitors`/`competitors_domain`.
- **`seo_competitors` existe en el schema y no tiene un solo consumidor** en `src/` (auditoría §1.4).

## Modular Placement Contract

- Topology impact: `api`
- Current home: `src/lib/growth/seo/prospect/**` + rutas app/ecosystem del portal Next.js; la corrida del colector corre en `ops-worker`
- Future candidate home: `domain-package`
- Boundary: command `runProspectDiagnostic` + reader `readProspectDiagnostic`; consumers autorizados = lane app, lane ecosystem/MCP, Nexa y el futuro artefacto público; cero SQL directo cross-dominio
- Server/browser split: `server-only` en el subdominio completo — credenciales DataForSEO, ledger de gasto y resolución del tope viven server-side; el browser nunca ve costo, endpoint ni credencial
- Build impact: `none` — reusa el transporte DataForSEO ya presente; sin dependencia nueva
- Extraction blocker: la atribución del gasto a la org canónica de Efeonce (FK `NOT NULL` del ledger); en la extracción se resuelve igual que §17.2, con integridad app-level + identidad federada

`Future candidate home: domain-package` = Wave (`wave.efeonce.org`), §17 de
`GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`. Es metadata de diseño: esta task **no** crea
`apps/*` ni `packages/*` ni autoriza la extracción física.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `greenhouse_growth.seo_prospect_diagnostics` (nuevo, append-only) +
  `greenhouse_growth.seo_provider_spend_daily` (ledger de gasto, existente) +
  `src/lib/growth/seo/entitlement.ts` (tier y topes)
- Consumidores afectados: lane app (operador), lane ecosystem/MCP, Nexa, artefacto público (follow-up)
- Runtime target: `staging` → `production`; la corrida en `ops-worker`, la lectura en Vercel

### Contract surface

- Contrato existente a respetar: `enforceSeoRunEntitlement` como chokepoint ÚNICO de gasto
  (`src/lib/growth/seo/entitlement.ts`); allowlist de familias
  (`src/lib/ai/dataforseo-families.ts`); ledger `seo_provider_spend_daily` como fuente única de
  gasto; §17.3 de `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`
- Contrato nuevo o modificado: command `runProspectDiagnostic({ rootDomain, market, language,
  competitorDomains?, actor })` · reader `readProspectDiagnostic({ diagnosticId })` ·
  `listProspectDiagnostics({ limit, cursor })` · tier `prospect` en `SeoEntitlement`
- Backward compatibility: `compatible` — aditivo. `SeoTier` gana un miembro; todo consumer que
  ramifique por tier debe compilar con el miembro nuevo (el `switch`/mapa de caps es exhaustivo por
  tipo, así que el compilador señala los callsites)
- Full API parity: un solo primitive (`runProspectDiagnostic`) detrás de las tres lanes. El write es
  apto para `propose → confirm → execute`: el LLM propone el dominio y el humano confirma el gasto
  en el endpoint de confirmación. **Nexa nunca dispara un diagnóstico sin confirmación humana**,
  porque cada diagnóstico compromete dinero real

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.seo_prospect_diagnostics` (nueva),
  `greenhouse_growth.seo_prospect_diagnostic_facts` (nueva, append-only),
  `greenhouse_growth.seo_provider_spend_daily` (escritura por el recorder existente)
- Invariantes que no se pueden romper:
  - **Una corrida por diagnóstico.** Sin `next_run_at`, sin scheduler, sin cron. Re-correr = fila
    nueva con actor humano, que vuelve a pasar por el tope.
  - **Todo hecho nace con `lens = 'estimated'` y `captured_at`.** El CHECK del vocabulario de lente
    en este carril admite `estimated` y nada más: no hay fuente medida para un prospecto.
  - **Ninguna fila afirma salud.** El derivador no emite un campo de veredicto global ni un score;
    emite hechos con su magnitud y su fecha.
  - **Cero cifras de mercado o lifts persistidos**: el contrato de salida no tiene campo donde
    guardarlas, a propósito.
  - **Append-only**: recomputar es fila nueva, jamás `UPDATE`.
  - `provider_cost_usd` del diagnóstico ≤ tope duro declarado, verificado ANTES y confirmado DESPUÉS.
- Tenant/space boundary: el sujeto **no tiene tenant**. La autorización es del ACTOR (operador
  interno con capability), no del sujeto. Un diagnóstico jamás se sirve por el portal cliente ni se
  cruza con `seo_targets` de una org. Si el prospecto luego firma, el vínculo es un binding nullable
  posterior (patrón `grader_profiles.organization_id`), nunca un backfill que reescriba historia
- Idempotency/concurrency: clave de idempotencia `(root_domain, market, language, fecha)` — un
  segundo disparo el mismo día sobre el mismo dominio devuelve el diagnóstico existente y **gasta
  USD 0** (mismo pre-check que TASK-1303 aplicó al rank capture). Advisory lock por dominio para
  que dos operadores no compren lo mismo en paralelo
- Audit/outbox/history: `created_by` + `created_at` en la fila; evento outbox
  `growth.seo.prospect_diagnostic.completed` para el hand-off comercial futuro (consumer en task
  aparte, no acá)

### Migration, backfill and rollout

- Migration posture: `additive` — dos tablas nuevas + índices. Cero `ALTER` sobre tablas existentes.
  Marker `-- Up Migration` literal + bloque `DO $$ ... RAISE EXCEPTION` de verificación post-DDL
- Default state: `flag OFF` — `GROWTH_SEO_PROSPECT_DIAGNOSTIC_ENABLED` default `false`, subordinado
  a `GROWTH_SEO_ENABLED`
- Backfill plan: `N/A — no hay historia que rellenar`. El carril nace vacío
- Rollback path: flag a `false` (el command devuelve `disabled`, cero gasto) → revert PR → down
  migration `DROP TABLE` (las tablas son nuevas y no tienen dependientes)
- External coordination: variable de entorno en **los dos runtimes** (Vercel para la lectura,
  `ops-worker` para la corrida — el flag se lee en ambos; declarar el runtime en la fila del ledger
  de flags). Cero cambio en la cuenta DataForSEO: no se agrega familia nueva al allowlist

### Security and access

- Auth/access gate: capability nueva `growth.seo.prospect_diagnostic.run` (execute) +
  `growth.seo.prospect_diagnostic.read` (read), granteadas en el MISMO PR a `efeonce_admin` y
  `efeonce_account` como mínimo (patrón canónico #6; el guard
  `src/lib/entitlements/capability-grant-coverage.test.ts` rompe el build si falta el grant). El
  lane ecosystem además exige su token de ecosystem
- Sensitive data posture: el sujeto es un dominio público — no hay PII del prospecto en este
  carril. **NUNCA** persistir email ni contacto acá: el contacto vive en HubSpot / en el lead, igual
  que en el AEO
- Error contract: `canonicalErrorResponse` con códigos canónicos; el bloqueo por tope es un estado
  declarado (`cost_blocked`), **no** un 500 ni un catch mudo. Cero `Sentry.captureException` directo
  (`captureWithDomain(err, 'growth', …)`)
- Abuse/rate-limit posture: tope duro en USD por diagnóstico + tope diario de diagnósticos por
  actor + idempotencia por dominio/día. El carril es de operador autenticado en V1: **no hay
  endpoint público de disparo**, así que no hereda la superficie de abuso del intake AEO

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/seo` (colector con fixtures del proveedor, derivador,
  entitlement con el tier nuevo, idempotencia y tope) + `pnpm local:check`
- DB/runtime checks: `pnpm pg:connect:migrate` + verificación de que las dos tablas existen con sus
  CHECK (el bloque `DO` de la propia migración lo aborta si no) + SQL embebido ejercido contra PG
  real (gate TASK-893: nada de confiar en mocks para el SQL)
- Integration checks: **una corrida real contra un prospecto real**, con costo medido y comparado
  contra la estimación previa, y la fila del ledger atribuida
- Reliability signals/logs: señal `growth.seo.prospect_diagnostic.cost_overrun` (steady 0) cuando el
  costo real supera el tope declarado; log del preview vs real por corrida
- Production verification sequence: ver `Rollout Plan & Risk Matrix`

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

### Slice 1 — Sujeto de prospecto + tier con tope duro por diagnóstico

- Migración additive: `seo_prospect_diagnostics` (sujeto + corrida, append-only, con
  `provider_cost_usd`, `cost_ceiling_usd`, `created_by`, clave de idempotencia por dominio/mercado/día)
  y `seo_prospect_diagnostic_facts` (hechos, con `lens` CHECK `IN ('estimated')` y `captured_at`
  `NOT NULL`). Marker `-- Up Migration` + bloque `DO` de verificación post-DDL.
- `SeoTier` gana `prospect` en `entitlement.ts`, con su config de tope por env
  (`GROWTH_SEO_PROSPECT_DIAGNOSTIC_CEILING_USD`, default declarado) y un chokepoint
  `enforceProspectDiagnosticBudget` que valida el **costo del diagnóstico completo** antes de la
  primera llamada, no llamada por llamada.
- Flag `GROWTH_SEO_PROSPECT_DIAGNOSTIC_ENABLED` (default OFF, subordinado a `GROWTH_SEO_ENABLED`) +
  su fila en `FEATURE_FLAG_STATE_LEDGER.md` con el runtime declarado.

### Slice 2 — Colector sin acceso del cliente, con preview de costo

- `collect.ts` con las cuatro fuentes autorizadas, cada una con su costo declarado en
  `provider-pricing.ts`:
  - `serp_competitors` / `competitors_domain` (~USD 0,03) — quién compite de verdad por ese SERP;
  - `dataforseo_labs/ranked_keywords` con `item_types` incluyendo `ai_overview_reference`
    (USD 0,132) — toda la superficie ranqueada **y** en qué keywords el AI Overview lo cita;
  - `backlinks/competitors` + `domain_intersection` (USD 0,05) — el link gap;
  - reads OnPage post-crawl (USD 0, gratis 30 días) sólo si ya existe un crawl del dominio; si no
    existe, **se omite** (encargar un crawl nuevo está fuera del tope de este carril).
- Preview de costo ANTES de gastar, comparado contra el tope; si no cabe, `cost_blocked` honesto y
  cero llamadas.
- Idempotencia por `(dominio, mercado, idioma, fecha)`: repetir devuelve lo existente con USD 0.
- Registro del gasto vía el recorder existente (import obligatorio de `register-provider-spend`).

### Slice 2b — Evidencia de sitio delegada (agregado por el `Delta 2026-08-26`)

- Consumo del sustrato de `TASK-1697` (`@/lib/growth/site-substrate`) para `robots.txt`, presencia de
  JSON-LD, sitemap y HTML de la home del prospecto. **Cero costo de proveedor.**
- Carril OnPage opcional por diagnóstico, apagado por defecto, con su costo dentro del **mismo tope
  duro en USD** del diagnóstico: el preview lo suma antes de la primera llamada, no después.
- Postura de cortesía verificable por test: `robots_txt_merge_mode` nunca `override`, sin
  `custom_robots_txt`, sin `switch_pool`, sin `ip_pool_for_scan`, y UA identificable.
- `extended_crawl_status` de bloqueo se persiste como **hecho** (`forbidden_robots`,
  `forbidden_meta_tag`, `forbidden_http_header`), no como error de la corrida ni como `magnitude: 0`.
- Test de frontera que falla si este módulo importa `safe-fetch` o `ai-visibility/probes/**`
  directamente: la delegación es el contrato, no una convención.
- 🔴 La promesa de `robots.txt` sobre el carril del sustrato **no se escribe en ningún entregable
  comercial** hasta que `TASK-1778` (`Slice 4`) le ponga mecanismo. Mientras tanto, el criterio de
  cortesía de este slice cubre **sólo** el carril OnPage.

### Slice 3 — Derivación: hechos con lente, sin veredicto

- `derive.ts` convierte la evidencia cruda en hechos tipados: superficie ranqueada, distancia a la
  primera página, presencia/ausencia en AI Overview por keyword, dominios que enlazan a la
  competencia y no al prospecto, y —si hubo reads OnPage gratis— los hallazgos técnicos ya crawleados.
- Cada hecho lleva `lens: 'estimated'`, `capturedAt` y la fuente que lo produjo.
- **Cero score, cero veredicto de salud, cero cifra de mercado, cero lift.** El contrato de salida
  no tiene campo para nada de eso.
- Copy de labels de lente y de estado en `src/lib/copy/growth.ts` (validado con
  `greenhouse-ux-writing`); registro comercial formal, no tuteo, para todo texto que vaya a un
  artefacto client-facing.

### Slice 4 — Contrato gobernado + lanes + capability

- `command.ts` (`runProspectDiagnostic`) y `reader.ts` (`readProspectDiagnostic`,
  `listProspectDiagnostics`) como primitive único.
- Lane app (`/api/admin/growth/seo/prospect-diagnostic`) y lane ecosystem
  (`/api/platform/ecosystem/growth/seo/prospect-diagnostic`) consumiendo el MISMO primitive.
- Capabilities `growth.seo.prospect_diagnostic.{run,read}` en `capabilities_registry` + catálogo TS
  + grant a ≥1 rol real, todo en el mismo PR (patrón canónico #6).
- Evento outbox `growth.seo.prospect_diagnostic.completed` emitido (sin consumer todavía).

### Slice 5 — Evidencia real, señal y cierre documental

- Corrida real contra un prospecto real con el flag ON en staging: costo previsto vs costo medido,
  fila del ledger atribuida, idempotencia verificada (segundo disparo = USD 0).
- Señal `growth.seo.prospect_diagnostic.cost_overrun` registrada en el control plane (steady 0).
- Tres capas documentales: delta en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (tier + carril +
  reglas duras), doc funcional en `docs/documentation/growth/`, manual comercial en
  `docs/manual-de-uso/comercial/` que declare **el encadenamiento**: Grader mide → este diagnóstico
  cuantifica la pérdida → Radiografía AEO demuestra cómo se arregla → propuesta convierte.

## Out of Scope

- **La cara visible del diagnóstico** (página pública, artefacto imprimible, PDF, short-link,
  envío). V1 entrega el motor y el contrato gobernado; el artefacto es `TASK-1672`/`TASK-1673` y
  **no sale antes de `TASK-1670`** (auditoría §3.4 C8: publicarlo antes sería firmar un documento
  que declara sano un sitio invisible para la IA). Diferirlo es la decisión correcta, no un recorte.
- **Endpoint público de disparo sin sesión.** El AEO lo tiene porque es lead magnet self-serve; acá
  el disparo lo hace un operador. Abrirlo al público es otra task, con captcha + rate-limit +
  presupuesto global, copiando el intake AEO.
- **Cualquier captura recurrente, scheduler o cron sobre un prospecto.** Prohibido por regla dura.
- **Convertir un prospecto en `seo_target`.** Cuando firma, eso es el flujo de onboarding de cliente
  existente; este carril no crea orgs, ni assignments, ni targets.
- **Hand-off comercial automático a HubSpot.** El evento outbox se emite; su consumer (crear/asociar
  lead) es task aparte con su propio gate de consentimiento, igual que TASK-1279.
- **Un `fetch` propio dentro de este colector** — prohibido por regla dura. La evidencia de sitio
  **sí** entra al carril, pero **delegada** al primitive dueño (ver `## Delta 2026-08-26`): este
  módulo no importa `safe-fetch` ni construye una URL de red por su cuenta.
- **Evadir un bloqueo del prospecto**: `robots_txt_merge_mode: override`, `custom_robots_txt`,
  `switch_pool`, `ip_pool_for_scan` y todo `custom_user_agent` que oculte quiénes somos quedan
  **prohibidos** en este carril. Un bloqueo es un hallazgo, no un obstáculo.
- **Keyword gap para clientes con target** (`TASK-1662`) y **cola priorizada** (`TASK-1669`).

## Detailed Spec

### 1. El sujeto: un dominio, no una organización

El prospecto **no es** una `greenhouse_core.organizations` ni un `seo_target` (su
`organization_id` es `NOT NULL` con FK `ON DELETE RESTRICT`). El sujeto de este carril es el par
`(root_domain, market, language)` guardado en `seo_prospect_diagnostics`, sin FK a nada.

El precedente exacto ya vive en el repo: `grader_profiles` nació sin `organization_id` y la columna
se agregó **nullable** con la nota "los perfiles existentes son internos/públicos (org NULL)". Si el
prospecto firma, se agrega el mismo tipo de binding nullable — **nunca** un backfill que reescriba
el historial del diagnóstico.

### 2. El tope: por diagnóstico, no por mes

`enforceSeoRunEntitlement` es mensual por org y su propio docstring documenta que no reserva ni hace
claim (medido: sobregiro de 3× en un batch de 120 keywords con budget `trial`). Un tier de
adquisición hereda ese defecto multiplicado por la cantidad de prospectos, así que el tope de este
carril es **por diagnóstico y se valida contra el costo del conjunto completo de llamadas** antes de
la primera:

```
presupuesto_diagnóstico = min(GROWTH_SEO_PROSPECT_DIAGNOSTIC_CEILING_USD, presupuesto_restante_del_mes)
costo_previsto = Σ costo(fuente)   // ~USD 0,30–0,50 con las cuatro fuentes
si costo_previsto > presupuesto_diagnóstico → cost_blocked, CERO llamadas
```

Después de la corrida, el costo real se compara contra el previsto; si lo excede, la señal
`cost_overrun` se dispara. El costo real sale del ledger, no de la estimación.

### 3. La atribución del gasto: adquisición es de Efeonce

`seo_provider_spend_daily.organization_id` es `NOT NULL` con FK. El gasto de prospecto no tiene org
del sujeto — y **no debe tenerla**, porque no es gasto de servicio: es **costo de adquisición de
Efeonce**. Se atribuye a la organización canónica de Efeonce (`EO-ORG-0007`), resuelta server-side,
nunca hardcodeada como literal en el colector. Consecuencias buscadas:

- el ledger sigue siendo **fuente única de gasto** (no se abre un segundo almacén, que es
  exactamente el defecto §1.2 de la auditoría);
- el margen por cliente de `EPIC-022` no se contamina con gasto de prospección;
- el gasto de adquisición queda medible como línea propia: "cuánto costó el pipeline este mes".

Un `family` nuevo NO se agrega al CHECK del ledger: las cuatro fuentes caen en `labs`, `backlinks`,
`onpage` y `serp`, todas ya permitidas.

### 4. Las cuatro fuentes y por qué esas

Todas cumplen la condición dura: **miden sin pedirle acceso a nadie**.

| Fuente | Costo | Qué contesta | Familia |
|---|---:|---|---|
| `serp_competitors` / `competitors_domain` | ~USD 0,03 | quién compite de verdad por ese SERP (no quién el prospecto cree que compite) | `labs` |
| `dataforseo_labs/ranked_keywords` + `item_types: ai_overview_reference` | USD 0,132 | toda la superficie ranqueada **y** en qué keywords el AI Overview lo cita | `labs` |
| `backlinks/competitors` + `domain_intersection` | USD 0,05 | qué dominios enlazan a la competencia y no a él | `backlinks` |
| reads OnPage post-crawl | USD 0 (30d) | hallazgos técnicos ya pagados, si existe crawl previo | `onpage` |

Total ~USD 0,30–0,50 por diagnóstico. Comparación que ordena la decisión: **100 diagnósticos = USD 50
= un mes de presupuesto de UN cliente contratado.**

`ranked_keywords` con `ai_overview_reference` es la joya del conjunto y cuesta el 1% de lo que cuesta
un mes de rank capture del cliente (auditoría §3.3).

### 5. El contrato de salida

```ts
interface ProspectDiagnostic {
  diagnosticId: string
  subject: { rootDomain: string; market: string; language: string }
  facts: ProspectFact[]        // cada uno con lens + capturedAt + source
  cost: { ceilingUsd: number; forecastUsd: number; actualUsd: number }
  provenance: { runAt: string; sources: ProspectSource[] }
  // NO HAY: score, verdict, healthy, benchmark, lift, industryAverage.
}

interface ProspectFact {
  kind: ProspectFactKind        // vocabulario cerrado con CHECK
  magnitude: number | null      // null = no medido, JAMÁS 0
  lens: 'estimated'             // único valor posible en este carril
  capturedAt: string
  source: ProspectSource
}
```

`magnitude: null` es "no lo medimos", nunca `0`. Es el mismo invariante de degradación honesta que
el grader ya sostiene con `score: null ≠ 0`.

### 6. El encadenamiento comercial

Los tres activos existen hoy y **no se tocan entre sí**:

1. **Grader AEO** mide si la IA lo menciona → produce la sorpresa que abre la conversación.
2. **Este diagnóstico** cuantifica la pérdida orgánica con dato del proveedor → convierte la
   sorpresa en tamaño.
3. **Radiografía AEO** (`think.efeoncepro.com/muestras/…`) demuestra cómo se arregla → prueba de
   oficio, no promesa.
4. **La propuesta** cierra.

Esta task cierra el eslabón 2 y **declara** el encadenamiento en el manual comercial. Automatizar
los saltos (crear lead, adjuntar la Radiografía, generar la propuesta) es trabajo posterior.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (schema + tier + tope + flag) → Slice 2 (colector de mercado) → Slice 2b (evidencia de
  sitio delegada) → Slice 3 (derivación) → Slice 4 (contrato + lanes + capability) → Slice 5
  (evidencia + docs).
- **Slice 1 DEBE shippear antes que Slice 2.** El tope por diagnóstico es la única defensa contra el
  sobregiro documentado del chokepoint mensual; un colector sin tope es un grifo abierto sobre un
  presupuesto que se lee una vez.
- **Slice 3 DEBE shippear antes que Slice 4.** El contrato de salida sin lente obligatoria es la
  forma exacta de `ISSUE-154`, y una vez que un consumer lo lee, quitársela es breaking.
- 🔴 **Slice 2b NO puede empezar antes de que `TASK-1697` haya extraído el sustrato.** Es el único
  blocker externo de esta task. Empezarlo antes obliga a un deep import cross-dominio a
  `ai-visibility/probes/**` o a copiar el fetcher: las dos formas crean la deuda que 1697 existe para
  cerrar, y la segunda además duplica una superficie SSRF. Si 1697 no está, **el resto de la task
  avanza sin 2b** y la evidencia de sitio se suma después — 2b no bloquea a Slice 3.
- Slice 5 al final y con flag ON sólo en staging hasta que la corrida real cuadre costo previsto vs
  medido. El costo de OnPage del `Slice 2b`, si el diagnóstico lo activó, entra en ese cuadre.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Gasto de adquisición sin techo: N prospectos × sobregiro del gate mensual | finance / provider budget | high | Tope DURO por diagnóstico validado contra el costo del conjunto ANTES de la primera llamada + tope diario por actor + idempotencia por dominio/día | `growth.seo.prospect_diagnostic.cost_overrun` (steady 0) |
| Gasto que ocurre y no aparece en el ledger (defecto §1.2 repetido) | finance / observabilidad | medium | Import obligatorio de `register-provider-spend` en el entrypoint del runtime; `postDataForSeoTask` LANZA si el recorder falta; test que verifica atribución | Diferencia entre `forecastUsd` y la suma del ledger por corrida |
| Un estimado se lee como dato medido del prospecto y viaja a una propuesta | comercial / reputación | high | `lens` con CHECK de un solo valor + `capturedAt NOT NULL` + el contrato sin campo de veredicto + test que rechaza un hecho sin lente | Revisión del artefacto en el cierre + gate de contrato |
| El artefacto declara sano un sitio invisible para la IA | comercial / reputación | medium | La cara visible queda fuera de alcance y bloqueada tras `TASK-1670`; el derivador no emite veredicto de salud | Revisión humana del primer artefacto real |
| Alguien "mejora" el carril agregando captura recurrente sobre prospectos | finance | medium | Regla dura en la arquitectura + ausencia deliberada de `next_run_at`/scheduler + test que falla si aparece un job que lea la tabla | Aparición de una fila con más de una corrida automática |
| Cross-host fetch del sitio del prospecto/competencia levantando la guarda SSRF | legal / seguridad | low | El colector **sigue sin importar `safe-fetch`**: delega en el sustrato de `TASK-1697`, que ya trae guarda SSRF, UA de cortesía identificable, timeout, tope de bytes y redirect acotado al mismo host. Lint rule angosta de `TASK-1697` + revisión de imports en el PR | Lint/import review; cualquier import de `probes/` desde `seo/prospect/` |
| Dos colectores de competidores (esta task y `TASK-1662`) | growth / mantenimiento | medium | Declarar la dirección de reuso en Discovery ANTES de escribir código; un solo primitive de competidores | Revisión cruzada al cerrar cualquiera de las dos |
| El miembro nuevo de `SeoTier` rompe un `switch` exhaustivo en un consumer | runtime | low | `pnpm typecheck` señala todos los callsites; barrido explícito en Slice 1 | Build rojo |

### Feature flags / cutover

- `GROWTH_SEO_PROSPECT_DIAGNOSTIC_ENABLED` (default `false`), subordinado a `GROWTH_SEO_ENABLED`.
  Con el flag OFF, el command devuelve `disabled` y **no hace una sola llamada al proveedor**.
- ⚠️ **Multi-runtime.** El flag se lee en **dos** runtimes: Vercel (lanes de lectura/disparo) y
  `ops-worker` (la corrida). En Cloud Run el SoT es `services/ops-worker/deploy.sh` (declararlo ahí
  **y además** aplicarlo en vivo con `--update-env-vars`); prenderlo sólo en Vercel deja el colector
  muerto y prenderlo sólo en vivo lo borra en el próximo deploy, en silencio.
- Fila obligatoria en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con el runtime declarado
  (`pnpm docs:closure-check` falla si falta).
- Knob de tope: `GROWTH_SEO_PROSPECT_DIAGNOSTIC_CEILING_USD` — es configuración con default, **no**
  un flag `*_ENABLED`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Flag a `false` en los dos runtimes; si hace falta, down migration `DROP TABLE` (tablas nuevas, sin dependientes) | <10 min | si |
| Slice 2 | Flag a `false` → cero llamadas al proveedor; revert PR | <10 min | si |
| Slice 3 | Revert PR (derivación pura, sin efecto externo) | <10 min | si |
| Slice 4 | Revocar el grant de la capability (el lane responde 403) + flag a `false`; revert PR | <15 min | si |
| Slice 5 | Docs y señal: revert PR; la señal se retira del registry | <10 min | si |

El gasto ya incurrido NO es reversible — por eso el tope va en el Slice 1 y no al final.

### Production verification sequence

1. `pnpm pg:connect:migrate` en staging + verificar que las dos tablas y sus CHECK existen (el
   bloque `DO` de la migración aborta si no).
2. Deploy con flag OFF en ambos runtimes + verificar que el módulo SEO existente no cambió de
   comportamiento (readers y batches intactos).
3. Flag ON **sólo en staging**, en ambos runtimes + verificar en la revisión activa del `ops-worker`.
4. Corrida real sobre un prospecto real: comparar `forecastUsd` vs el costo del ledger, verificar
   atribución a la org de Efeonce y que la fila del diagnóstico tiene todos sus hechos con lente y
   `capturedAt`.
5. Segundo disparo del mismo dominio el mismo día → devuelve lo existente y gasta **USD 0**.
6. Disparo con tope artificialmente bajo → `cost_blocked` honesto y **cero llamadas** (verificar en
   el ledger que no se movió).
7. Revisión humana del contrato de salida: cero score, cero veredicto de salud, cero cifra de
   mercado, cero lift.
8. Repetir 2–7 en producción con el flag ON sólo tras sign-off del operador comercial.
9. Monitorear `cost_overrun` y el gasto atribuido a Efeonce durante 7 días.

### Out-of-band coordination required

- **Sign-off del operador comercial** antes del flag ON en producción: el carril compromete
  presupuesto de adquisición y produce material que va a llegar a prospectos.
- Env vars en los dos runtimes (Vercel + `ops-worker`), con el `deploy.sh` actualizado.
- Cero cambio en la cuenta DataForSEO: no se agrega familia al allowlist, no se toca el plan.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `SeoTier` incluye `prospect` y `resolveSeoEntitlement` lo resuelve sin exigir
      `module_assignments` para el sujeto del diagnóstico.
- [ ] Existe un tope DURO en USD **por diagnóstico** que se valida contra el costo del conjunto
      completo de llamadas ANTES de la primera, y un test prueba que al no caber se devuelve
      `cost_blocked` con **cero** llamadas al proveedor.
- [ ] El colector usa exclusivamente `serp_competitors`/`competitors_domain`, `ranked_keywords` con
      `ai_overview_reference`, `backlinks/competitors` + `domain_intersection` y reads OnPage
      post-crawl; ningún otro endpoint aparece en el código del carril.
- [ ] Un test prueba que **no existe ningún camino de captura recurrente** sobre un prospecto: la
      tabla no tiene `next_run_at`, no hay cron ni scheduler que la lea, y una segunda corrida
      requiere actor humano.
- [ ] Todo hecho persistido tiene `lens = 'estimated'` (CHECK en DB) y `captured_at NOT NULL`; un
      test rechaza la inserción de un hecho sin lente o sin fecha de captura.
- [ ] El contrato de salida **no tiene** campo de score, veredicto, salud, benchmark de mercado ni
      lift; un test de contrato falla si alguno se agrega.
- [ ] `src/lib/growth/seo/prospect/**` no importa `safe-fetch.ts` ni ningún fetcher de sitio, y no
      hay una sola llamada HTTP al dominio del prospecto ni al de su competencia.
- [ ] El gasto de cada diagnóstico aparece en `seo_provider_spend_daily` atribuido a la organización
      canónica de Efeonce, resuelta server-side (no un literal en el colector).
- [ ] Idempotencia verificada en runtime: segundo disparo del mismo dominio/mercado/día devuelve el
      diagnóstico existente y gasta **USD 0**.
- [ ] Las capabilities `growth.seo.prospect_diagnostic.{run,read}` existen en el registry + catálogo
      TS **y** tienen grant a ≥1 rol real en el MISMO PR (coverage test verde).
- [ ] El mismo primitive sirve a los lanes app y ecosystem; cero lógica duplicada por consumer, y el
      write es apto para `propose → confirm → execute`.
- [ ] Evidencia de corrida real sobre un prospecto real: costo previsto vs medido documentado, con
      la fila del ledger citada.
- [ ] `GROWTH_SEO_PROSPECT_DIAGNOSTIC_ENABLED` tiene fila en `FEATURE_FLAG_STATE_LEDGER.md` con su
      runtime declarado (Vercel + `ops-worker`).
- [ ] El manual comercial declara el encadenamiento Grader → diagnóstico → Radiografía AEO →
      propuesta, y declara explícitamente que el diagnóstico **no afirma que un sitio está sano**.
- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/growth/seo`
- `pnpm test` (suite completa, gate de cierre)
- `pnpm build` (gate de cierre — pedir autorización al operador antes de correrlo)
- `pnpm pg:connect:migrate` + verificación del DDL contra PG real
- `pnpm docs:closure-check` (incluye `feature-flags-audit --strict`)
- Corrida real contra un prospecto real con costo medido y comparado

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Delta en `TASK-1662` declarando cuál de las dos tasks es dueña del colector de competidores
- [ ] Delta en `EPIC-022` registrando el tier `prospect` y la línea de gasto de adquisición
- [ ] Delta en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §9 (entitlements) con el tier nuevo

## Follow-ups

- **Cara visible del diagnóstico** (artefacto + entrega): coordinar con `TASK-1672`/`TASK-1673`,
  bloqueado tras `TASK-1670` por la advertencia C8 de la auditoría.
- **Consumer del evento outbox** → crear/asociar lead en HubSpot con gate de consentimiento, patrón
  `TASK-1279`.
- **Endpoint público self-serve** (sin sesión) copiando el intake AEO: captcha + rate-limit +
  presupuesto global.
- **Binding prospecto → org** cuando el prospecto firma (columna nullable, patrón
  `grader_profiles.organization_id`); jamás backfill del historial.
- **Consumidor de `seo_competitors`**: la tabla existe sin consumidores (auditoría §1.4) y este
  carril produce el primer dato competitivo real — evaluar si es su almacén natural.

## Open Questions

- ¿El gasto de adquisición se atribuye a la org canónica de Efeonce (`EO-ORG-0007`) o se le crea
  una línea presupuestaria propia dentro del mismo ledger? La propuesta de esta task es la primera
  (no abre un segundo almacén); necesita confirmación del operador porque afecta cómo se lee el
  margen de `EPIC-022`.
- ¿Cuál es el tope por diagnóstico que se autoriza? La propuesta es USD 1,00 (holgura de ~2× sobre
  el costo previsto de USD 0,30–0,50), con tope diario por actor a definir.
- ¿`TASK-1662` o esta task es dueña del colector de competidores? Debe decidirse en Discovery, antes
  de escribir código.

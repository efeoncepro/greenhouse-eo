# Handoff activo

### TASK-1647 — Provider Greenhouse-SEO federado: CODE COMPLETE, enable pendiente del release (2026-08-05)

El segundo salto MCP quedó construido y verificado e2e. Gateway (`efeonce-mcp` main `a53b77f`+`4870e90`):
provider `greenhouse-seo` fail-closed + 3 tools (scope base) + canaries + canary e2e. Greenhouse: consumer
`EO-SPK-0004`/binding `EO-SPB-0004` activos (script `provision-mcp-gateway-seo-consumer.ts`; token en Secret
Manager `efeonce-mcp-gateway-greenhouse-token`). Flag `GROWTH_SEO_ENABLED=true` en Vercel **staging** +
redeploy (autorizado). Berel provisionada Fase 0 (`cpma-berel-seo-contracted` + `seot-berel-fase0`).

**Evidencia e2e (provider real → lane staging HTTPS):** Berel **`domainQuadrant=riesgo`, 50 keywords,
AEO 44.5** · Efeonce entitlement ok + `no_seo_data` honesto · deny anti-oracle 404. La cadena completa
del MCP-first funciona; lo ÚNICO entre esto y `mcp.efeonce.org` es que greenhouse PROD aún no tiene el
lane. **El cutover restante = release develop→main de greenhouse** (control plane, skill
`greenhouse-production-release`) → flag en Vercel prod → enable del provider en Cloud Run + deploy
dispatch → smoke por el front door. GSC de efeoncepro.com sigue gated por 1282/1283.

### Efeonce provisionada como org del 360 (own-brand, dogfooding) — 2026-08-05

Decisión de modelado del operador ejecutada: **Efeonce se modela como su propio cliente** sobre la org
canónica **EO-ORG-0007** (`Efeonce`, Efeonce Group SpA, RUT 77.357.182-1, `is_operating_entity=true` —
canónica verificada contra la base; las otras dos orgs "efeonce" son auto-companies de HubSpot
sincronizadas como ruido). Aplicado con `scripts/growth/provision-efeonce-own-brand-seo.ts` (idempotente):

- 4 perfiles del grader ligados (`EO-GAVP-0002/0017/0018/0020`) → **lente AEO disponible** (cierra §2.A
  del programa AEO para la marca propia).
- Assignment `cpma-efeonce-seo-own-brand` (`seo_v1`, contracted, `metadata.note=own_brand`) → chokepoint
  responde `hasModule=true`, 8 audits, $50 budget.
- Target `seot-efeonce-own-brand` (efeoncepro.com, CL/es).
- Verificado vía payloads del lane (TASK-1645): entitlement ✓ · keyword-opportunities `ok:true` (vacío,
  sin GSC aún) · visibility-360 → **`no_seo_data` honesto** (lente SEO llega al conectar la GSC de
  efeoncepro.com — OAuth de TASK-1282/1283, rollout pendiente — o con TASK-1303/DataForSEO).

**Pendientes operativos:** (1) merge en HubSpot de las auto-companies `efeonce.org` (56011409567) y
`efeonce` (57099835819) hacia la company canónica — el sync propaga; NUNCA borrarlas por SQL. (2)
`website_url` de EO-ORG-0007 está vacío (`efeoncepro.com`) — completar por la puerta canónica
(`upsertCanonicalOrganization`), no SQL directo. (3) Conectar GSC de efeoncepro.com cuando 1282/1283
destraben su rollout. SKY ya tiene lente AEO ligada; su SEO sigue igual de pendiente que Efeonce.

### TASK-1645 — SEO operable por MCP: CODE COMPLETE, rollout pendiente (2026-08-05)

La milla final del camino MCP-first quedó implementada y verificada a nivel función. **Lane ecosystem**
(`/api/platform/ecosystem/growth/seo/{keyword-opportunities,visibility-360,entitlement}` vía
`runEcosystemReadRoute`; builder `ecosystem-growth-seo.ts`: org-por-binding — org-scoped manda con mismatch
404 anti-oracle, internal exige `organizationId` —, entitlement per-org `seo_v1` → 404 anti-oracle,
`target_not_configured` honesto, payloads passthrough) + **3 MCP tools read-only** en `src/mcp/greenhouse/**`
(`get_seo_keyword_opportunities`, `get_seo_visibility_360` — nace con el cruce AEO real —, `get_seo_entitlement`
— el chokepoint como lectura, decisión del operador de exponer todo reader vivo). Evidencia: 17 tests focales +
route-contract + smoke live del lane contra PG real (quadrant `riesgo` con 50 keywords, cross-org deny, cero
residuo); full suite **10168/0** + build prod verdes.

**Por qué NO complete (Runtime Rollout Completion Gate):** (1) falta la invocación MCP e2e por HTTP con un
binding ecosystem real en staging (no disponible en la sesión; mismo pendiente que TASK-1086 dejó post-deploy);
(2) `GROWTH_SEO_ENABLED` es multi-runtime — el lane lo lee en **Vercel** y hoy está ON solo en el ops-worker;
el flip es parte del cutover del módulo; (3) la federación al gateway `mcp.efeonce.org` quedó con dueño:
**TASK-1647 creada** (adapter delgado, canaries antes de discovery — cumple el acceptance "con dueño").
Mandato amarrado además en 1303/1304/1311/1312/1313/1314/1317: todo reader futuro expone su MCP tool en el
mismo PR. Docs: arch SEO §7, API Platform delta, manual MCP §8, doc funcional. Sin push.

**Próximo paso:** TASK-1647 (federación gateway) o el cutover del módulo (flag Vercel + assignment Berel +
smoke e2e con binding) — decisión del operador.

### TASK-1305 — Cruce SEO↔AEO (quadrant 360) COMPLETE (2026-08-05)

La sinergia directa con AEO que exigió el operador quedó implementada el mismo día: `readSeoAeoGap`
(`src/lib/growth/seo/gap/read-seo-aeo-gap.ts`) cruza `seo_gsc_daily` (posición medida, ponderada por
impresiones) × `grader_scores` (último run reportable del org) EN MEMORIA por `organization_id` — cero
JOIN/VIEW/FK cross-motor (boundary §1.1, verificado por test dedicado que inspecciona las queries
emitidas). Clasificador puro `classifyQuadrant` (página 1 × score ≥ 50, overridables, jamás promediados)
+ contrato `SeoAeoGapResult` con `aeoAxisGranularity='domain'` (TASK-1311 refina a URL sin romperlo).

**Primera señal 360 real (smoke live):** Berel rankea #1.75 orgánico para su marca con citabilidad AEO
44.5 → quadrant **`riesgo`** = autoridad orgánica sin citabilidad = el CTA cruzado al AEO, funcionando.

Evidencia: 12 tests (incl. boundary + tenant binding) + smoke live con cero residuo
(`scripts/growth/_sanity-seo-aeo-gap.ts`, patrón commit+try/finally post hallazgo TASK-1300 — el
BEGIN/ROLLBACK cross-pool NO es seguro; `_sanity-seo-entitlement.ts` endurecido igual). Full suite
**10142/0** + build prod verdes. Commits `6ff948e2d`+`3bac9df0a` (Slice 1) + `ed88f7d16` (Slice 2).
Nota de proceso: el primer commit de Slice 1 capturó solo el rename (git add abortó por ruta
inexistente — gotcha conocido); `3bac9df0a` es el fixup con el código.

**Rollout:** reader detrás de `GROWTH_SEO_ENABLED` (hoy ON solo en el ops-worker para el materializer;
el reader lo consumirán TASK-1645/1310 — cada consumer valida el flag en su runtime). **Próximo paso
del camino MCP-first: `TASK-1645`** (lane ecosystem + MCP tools — get_seo_visibility_360 nace con este
cruce). Sin push aún.

### TASK-1300 — Registry de familias DataForSEO + ledger de gasto (2026-08-05)

**`code complete, rollout pendiente`.** El cliente DataForSEO pasa de candado hard-code a `/v3/serp/` a un
allowlist cerrado de 5 familias con transporte único. El AEO pasó **sin que se tocara ninguno de sus archivos**.

**Tres decisiones que conviene no re-litigar:**

1. **`seo_provider_spend_daily` es la FUENTE ÚNICA de presupuesto.** `enforceSeoRunEntitlement` dejó de sumar
   el `provider_cost` de las 3 tablas snapshot: hacer ambas contaría el mismo gasto DOS VECES. El hook estaba
   declarado en TASK-1301 (`entitlement.ts:24`) pero esa task ya estaba `complete`, así que **el cambio no
   tenía dueño** — se tomó acá porque hoy es no-op verificable y después habría sido caro.
2. **El contador lo escribe el TRANSPORTE, no el caller**, y las 4 familias SEO exigen `organizationId` por
   tipo. Además el transporte **lanza** si el runtime no registró el contador: gastar sin contabilizar se
   descubre en la factura; un throw se descubre en desarrollo (lección de TASK-1302).
3. **`serp` deja `organizationId` opcional por una limitación del contexto del adapter AEO, NO porque su gasto
   sea inatribuible** — corrección que salió de una objeción del operador. Ver el hueco abierto abajo.

**🔴 Dos cosas que bloquean o cuestan plata:**

- **La cuenta DataForSEO tiene USD 0,90** (`money.total: 1`, medido en vivo). El smoke por familia y cualquier
  captura de TASK-1303/1304 están bloqueados por saldo. No se gastó probando: es decisión del operador.
- **El gasto AEO de perfiles ligados a un cliente NO entra en su presupuesto.** `grader_profiles.organization_id`
  existe y es nullable (TASK-1243), pero `ProviderAdapterContext` no transporta la organización. Follow-up con
  dueño en EPIC-020; cuando `serp` reciba `organizationId`, el transporte ya lo contabiliza solo.

**⚠️ Hallazgo transversal — el patrón de sanity del repo es frágil.** `BEGIN`/`ROLLBACK` vía
`runGreenhousePostgresQuery` **no es transaccionalmente seguro**: ese helper toma una conexión del pool por
llamada, así que el `BEGIN` no cubre lo que sigue (y puede dejar escrituras fuera del rollback). Se descubrió
porque un `SAVEPOINT` reventó con `25P01`. Este sanity se reescribió sobre `withGreenhousePostgresTransaction`;
**los de TASK-1301 y TASK-1302 usan el patrón frágil y pueden estar pasando por suerte** — trabajo aparte.

**Nota de concurrencia:** otra sesión commiteó estos archivos en un estado intermedio (`6a6923900`) por el
índice compartido del checkout; `3a2e1baf5` corrige encima. Evidencia: sanity live 7/7 con cero residuo, suite
10130/0, build prod. Nada se ejerce hasta que TASK-1303/1304 llamen al transporte.

### TASK-1646 — Cloud Infrastructure doc particionado: temáticos + HISTORIAL + stub (2026-08-05)

**Complete.** El monolito `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` (1340 líneas / 24 deltas, finding
`architecture_doc_monolith`) quedó dividido según el precedente ui-platform:
`docs/architecture/cloud-infrastructure/` (11 temáticos de estado vigente + `HISTORIAL.md` con los
25 deltas verbatim) + router stub en el path original + ADR
`GREENHOUSE_CLOUD_INFRASTRUCTURE_RESTRUCTURE_DECISION_V1.md`.

**Para el próximo agente que toque infra cloud:**

- Entrada canónica: `docs/architecture/cloud-infrastructure/README.md` (mapa "dónde vive X").
  Cambio vigente → doc temático; cronología → HISTORIAL. No agregar contenido al stub.
- Al separar se resolvieron contradicciones contra runtime: los inventarios del monolito eran de la
  auditoría 2026-04-23. Vigente verificado 2026-08-05: **46 scheduler jobs** del ops-worker (SoT
  `services/ops-worker/deploy.sh`), **8 crons Vercel** (SoT `vercel.json`), **7 workflows de deploy**.
  El detalle de qué se descartó y por qué está en el ADR + anotaciones `⚠️ Superseded` del HISTORIAL.
- Gates verdes: `docs:closure-check` sin `architecture_doc_monolith`, `docs:context-check:strict`
  0/0, `task:lint` template=1/0/0. Re-auditoría live GCP sigue siendo TASK-127.

### TASK-1302 — Serie GSC propia LIVE: 26.192 filas reales materializadas (2026-08-05)

Tercer eslabón de EPIC-022. **Rollout EJECUTADO — operativamente completo.** Revisión
`ops-worker-00524-5wg`, scheduler `ops-seo-gsc-snapshot` ACTIVO (`0 9 * * *` CLT), serie real de
`sc-domain:berel.com` acumulando (26.192 filas / 4 días; el 5.º día devolvió 0 filas y NO se
fabricó — degradación honesta funcionando). `readKeywordOpportunities` ejercitado contra esa serie:
**375 keywords en striking-distance**.

**Dos defectos que sólo el rollout real podía revelar — leer antes de tocar este dominio:**

1. **El ops-worker no tenía NINGUNA variable de Search Console.** TASK-1302 introdujo el primer
   consumer del reader GSC en ese runtime (antes sólo corría en Vercel) y su entorno nunca se
   provisionó. Prender el flag sin eso habría degradado TODAS las orgs en silencio — misma bug
   class que ISSUE-113. Ya cableado en `deploy.sh` + GH secret.
2. **GSC no publica D-1.** El primer run dio `materialized=1, rows=0`. Medido contra la API: D-1
   responde `ok` con cero filas, D-2 sí trae datos. El materializer apuntaba a "ayer" (como pedía
   la spec) ⇒ habría escrito días vacíos para siempre sin volver por ellos. **Arreglado con ventana
   móvil de 5 días**, que además corrige el consolidado tardío de Google.

**Simplificación operativa confirmada:** una sola instancia Cloud SQL y **un solo ops-worker
compartido staging+prod** desplegado desde `develop` ⇒ la capacidad quedó viva **sin promoción a
`main`**, y **no existe un flip "sólo staging"** para este dominio.

**Rollback (<5 min):** `GROWTH_SEO_ENABLED=false` en `deploy.sh` + redeploy, o pausar el scheduler
**y** poner su 5º arg en `"true"` (si no, el próximo deploy lo despausa solo).

Lo que sigue abajo es el detalle de la implementación previa al rollout.

**Lo entregado.** Tabla `greenhouse_growth.seo_gsc_daily` (migración `20260805171834316`, aplicada en
`greenhouse-pg-dev`) + `materializeGscDailySnapshot` + batch per-org en ops-worker
(`POST /seo/gsc/snapshot-batch`) + Cloud Scheduler `ops-seo-gsc-snapshot` + `readKeywordOpportunities`.
7 commits pusheados a `develop` (`git log --grep TASK-1302`).

**Tres decisiones que conviene no re-litigar:**

1. **`seo_gsc_daily` ancla en `organization_id`, NO en `seo_target_id`** — es la única tabla de la serie SEO que
   lo hace, y es deliberado: GSC entrega al grano de la *propiedad verificada* (`search_console_connections`,
   org UNIQUE), mientras `seo_targets` tiene grano **más fino** (`location_code`+`language_code`, que GSC no
   particiona). FKear al target obligaría a asignar cada fila arbitrariamente. Evidencia al tomar la task: 0
   filas en `seo_targets` y 1 conexión GSC activa — habría bloqueado la captura de una serie irreconstruible.
2. **Su trigger bloquea DELETE pero NO UPDATE**, al revés que las demás tablas de medición: GSC consolida con
   ~48h de retraso y el re-run del mismo día **debe** poder corregir el valor.
3. **El score de oportunidad NO usa datos de mercado.** Las impresiones de GSC ya son demanda medida, y la curva
   de CTR se deriva de la propia org (así absorbe sola el efecto de los AI Overviews en ese sitio). DataForSEO
   (TASK-1300) queda como enriquecimiento, no como corazón — por eso 1302 aterrizó sin esperarla.

**Bug que sólo el sanity live atrapó:** la SQL seleccionaba `pq.query` mientras el TS leía `row.keyword` →
todas las keywords salían vacías. Los mocks ejercitan el TS, nunca el SQL (gate TASK-893).

**Evidencia:** 9/9 checks de `scripts/growth/_sanity-seo-keyword-opportunities.ts` contra PG real con rollback y
cero residuo; smoke de la migración (idempotencia, DELETE rechazado, tipos DATE/TIMESTAMPTZ); 38 tests focales;
suite completa **10102/0**; `pnpm build` prod; gates de worker; `flags:audit --strict`.

**Documentación de cierre (3 subagentes, 2026-08-05).** Capa funcional + manual + invariantes + skills:
`docs/documentation/growth/{modulo-seo-search-visibility-360,conexion-search-console}.md` (v1.1) y el manual nuevo
[`operar-serie-search-console.md`](docs/manual-de-uso/growth/operar-serie-search-console.md) (operación por CLI/logs,
sin UI hasta TASK-1306/1308). Las tres trampas del rollout quedaron canonizadas en
`OPS_RELIABILITY_AGENT_INVARIANTS.md` + `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` (cuyo `Delta 2026-04-15` decía
"por ahora" sobre la topología compartida — quedó marcado como superseded: es canónica). Los hallazgos de oficio
(GSC no publica D-1; la posición se pondera por impresiones; striking-distance sin datos de mercado) entraron a la
skill `seo-aeo` como **medidos**, no estimados.

**Dos deudas descubiertas, ambas con dueño declarado:**

1. **`CLAUDE.md` está al 100% de su presupuesto** (34.998/35.000 tokens). La invariante de la topología compartida
   del worker **no cupo inline** y quedó sólo en el companion. Registrado como `## Delta 2026-08-05` en
   `TASK-1160`, que es la dueña de bajar a 30.000: su Slice 5 dejó de ser higiene y pasó a ser desbloqueante.
2. **La skill `seo-aeo` tiene su copia Claude FUERA del repo** (`~/.claude/skills/`, sin versionar) mientras la
   Codex sí está versionada. Consecuencia real ya materializada: a la copia Claude le faltaban 2 referencias,
   incluida `google-search-console-api-indexing.md` — justo la pertinente. Copié las faltantes; queda drift de
   contenido en 8 archivos y el gate `skills:mirrors` **no puede verlo** porque la skill no está en su manifiesto.

**Próximo paso del epic:** TASK-1300 (paralela) o TASK-1303. Nota para quien tome TASK-1306/1308: la serie ya
tiene datos reales, así que esas UIs se pueden construir contra datos vivos, no contra fixtures.

### TASK-1301 — Capabilities + entitlement per-org SEO COMPLETE (2026-08-05)

Segundo eslabón de la Ola B MCP-first de EPIC-022, cerrado el mismo día que TASK-1299. Entregado:
5 capabilities `growth.seo.*` (catálogo + seed `capabilities_registry` migración `20260805162304440` +
grants en `runtime.ts`: `observation.read` set interno base; `target.configure`/`audit.run` set operador;
`entitlement.manage` SOLO ADMIN+ACCOUNT; `report.read_client` client_* scope own) — coverage verde.
Módulo **`seo_v1`** seedeado en `greenhouse_client_portal.modules` (migración `20260805163024516`;
descubierto en smoke live que `module_assignments.module_key` tiene FK al catálogo — la spec no lo
declaraba) con `data_sources=['growth.seo']` + union `ClientPortalDataSource` (parity verde).
**Chokepoint único `enforceSeoRunEntitlement`** (`src/lib/growth/seo/entitlement.ts`): consumer-agnóstico
(mandato parity+MCP), tier `metadata_json.seo_tier`, `expired` explícito, allowance audits/mes + budget
USD/mes por tier (env-knobs `GROWTH_SEO_*` con defaults — son config, no flags `*_ENABLED`), gasto =
`SUM(provider_cost)` de los snapshots de 1299 con hook declarado a `seo_provider_spend_daily` (TASK-1300).

Evidencia: 12 tests focales + coverage + parity; smoke E2E live contra PG real
(`scripts/growth/_sanity-seo-entitlement.ts`: no_entitlement → allowed contracted → budget_exhausted
con costo estimado → revocado; cero residuo). Full suite **10076/0** + build prod verdes. Migraciones
aplicadas en `greenhouse-pg-dev`. Commits `de94363df` (Slice 1) + `100ee9fec` (Slice 2). Sin push aún.

**Rollout:** ninguna org tiene assignment `seo_v1` (primer assignment = paso operativo, Berel Fase 0,
vía `entitlement.manage`). Prod recibe migraciones+código vía release control plane. **Próximo paso:**
`TASK-1302` (GSC materializer + `readKeywordOpportunities` — OJO: requiere rollout real de la conexión
GSC de TASK-1282/1283) y luego `TASK-1645` (lane ecosystem + MCP tools). `TASK-1300` puede ir en paralelo.

### TASK-1299 — Schema SEO fundacional aplicado + contrato parity/MCP de EPIC-022 (2026-08-05)

TASK-1299 (schema `growth.seo`, bloqueador fundacional de EPIC-022) quedó implementada y verificada en vivo:
migración `20260805134439202_task-1299-growth-seo-schema.sql` **aplicada en `greenhouse-pg-dev`** (dev/staging
comparten instancia) — 8 tablas `seo_*` (4 config + 4 serie temporal append-only por `capture_date`), UNIQUEs
de idempotencia, triggers `block_seo_row_mutation` (genérico via TG_TABLE_NAME), GRANTs least-privilege
(mediciones sin UPDATE/DELETE para runtime), `db.d.ts` regenerado. Smoke live contra PG real (con rollback):
UNIQUE de captura duplicada ✓, anti-mutation en rank/findings/backlinks ✓, cierre de término por UPDATE de
`effective_to` permitido ✓, state machine de `seo_site_audit_runs` mutable ✓, `capture_date`=DATE /
`captured_at`=TIMESTAMPTZ ✓. Commits `ff399497c` (schema) + `db949d85f` (contrato).

**Directiva del operador (misma sesión): el módulo SEO nace Full API Parity y usable por MCP.** Materializada
como contrato con dueño: `TASK-1645` nueva (lane ecosystem `/api/platform/ecosystem/growth/seo/*` + 3 MCP
tools read-only, espejo TASK-1086 de Knowledge; blocked by 1301/1302/1303), exit criterion nuevo en EPIC-022
(el epic NO cierra UI-only), DoD reforzado en TASK-1301 (chokepoint consumer-agnóstico) y deltas de impacto
cruzado en 1302/1303/1304 (el schema ya existe; readers nacen consumer-agnósticos).

**Delta misma sesión — destino Wave declarado.** El operador comunicó que SV360 nace en Greenhouse pero
eventualmente se habilita como producto en `wave.efeonce.org` (consistente con EPIC-037). Materializado como
contrato, no como código: `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` **§17** (inventario del seam de extracción,
FK org = único acople deliberado que se intercambia en la extracción, reglas duras extraction-ready para TODA
child task de EPIC-022), deltas en EPIC-022/EPIC-037/TASK-1299/TASK-1645. El schema aplicado NO cambió — ya era
extraction-ready. La extracción física NO queda autorizada (programa posterior de Wave; EPIC-027 manda hoy).

**Rollout:** schema inerte por diseño (cero consumers hasta 1302+); prod recibe la migración vía release
control plane cuando el módulo se secuencie. Próximo paso del epic: `TASK-1300` (DataForSEO families, paralela)
y `TASK-1301` (capabilities). Nota de sesión: hubo commits concurrentes de otro agente (`aa00683bb` absorbió
el scaffold vacío de la migración + el rename de la task; sin pérdida — verificado).

### TASK-1631 — Slice 0: comparación build-vs-buy y memo de privacidad entregados (2026-08-05)

TASK-1631 (Efeonce Customer Identity + MCP Federation) está `in-progress` en `develop`. Intake verificó contra
runtime que la spec no tiene drift (gateway single-issuer, `clientId = azp ?? sub`, fusión `scp∪scope∪roles`).
Con aprobación del operador se ejecutaron **S0.2 y S0.3** del Slice 0:

- **S0.2 (costos):** ADR §`Slice 0 measurement — build vs buy vs hybrid (2026-08-05)`. Native medido contra el
  código real = 7–10.5 semanas senior + operación permanente (el broker sister-platform NO tiene capa propia de
  autenticación de personas; depende de la sesión NextAuth del portal). WorkOS = USD 99/mes planos; curva SSO
  USD 125/conexión/mes con **trigger de revisita a ≥5 conexiones enterprise**; exit re-enlazable por diseño.
  **Recomendación Slice 0: WorkOS** con binding provider-neutral — pendiente de aprobación del operador.
- **S0.3 (privacidad):** memo `docs/operations/EFEONCE_CUSTOMER_IDENTITY_PRIVACY_REVIEW_V1.md` — Efeonce
  controller / IDP encargado, minimización (qué se envía vs qué queda), checklist DPA/subprocesadores/región/
  retención/ARCO/notificación contractual (CL 21.719 plena el 1-dic-2026 + CO/MX/PE). **El gate sigue abierto**:
  falta DPA firmado + validación con abogado habilitado.

**Delta mismo día — composición APROBADA con staging de gasto cero.** El operador no quiere pagar WorkOS ahora;
la recomendación se ajustó y aprobó: (1) hoy USD 0, nada provisionado, solo diseño; (2) primer cliente
interesado → WorkOS **free tier sin dominio propio** (AuthKit hosteado, dominio default); (3) USD 99/mes por
`auth.efeonce.org` sólo con clientes pagando. Requisito duro derivado: el binding se llavea por
`(environment, subject)` vía registry `external_identity_environments`, NUNCA por el issuer string crudo — el
cutover de dominio futuro es un UPDATE auditado + re-login, no re-onboarding. **S0.4 y S0.5 entregados** en el
ADR: binding de persona reutiliza `identity_profile_source_links` (sin tabla de identidad nueva); tablas nuevas
sólo para organización/grants/invitaciones; `AuthContext` de 6 campos sin fallback + tools con
`allowedIssuers` + clase de autoridad + 3 tests de regresión obligatorios. La task `ui-ux` dependiente se
reduce a branding config y su creación se difiere (AuthKit hosteado elimina el login custom del primer corte).

**Restante para Slices 1-3:** cierre legal (DPA + abogado), checklist pre-provisión (CIMD live,
`subject_types_supported`, términos free tier) y aceptación formal del ADR completo. Pendiente del Slice 0:
S0.1 (matriz de tokens live + base-only de TASK-1626 — **requiere sesión interactiva del operador** para los
logins OAuth) y el contrato de convergencia del login Greenhouse. Nada externo se provisionó.

### Registro de partnerships — fuente operativa creada (2026-08-05)

Se creó [`EFEONCE_PARTNERSHIP_REGISTRY_V1.md`](docs/operations/EFEONCE_PARTNERSHIP_REGISTRY_V1.md) como registro
central de partnerships, providers y postulaciones de Efeonce. El primer refresh documenta Google Cloud con evidencia
del Partner Network Hub: la cuenta está `Partner registrado`, las rutas aparecen como `Registrado`, y la debida
diligencia está `En curso`; todavía no hay nivel Select/Premier/Diamond activo ni capacidad para crear oportunidades.

El registro también consolida Claude, OpenAI, BytePlus, Runway, ElevenLabs, FLUX, AWS, Salesforce, HubSpot, Lovable,
HeyGen y otras relaciones, separando partnership activo, cuenta registrada, postulación, provider en uso, bloqueo y
target. Próximo paso operativo: responder las decisiones de due diligence de Google Cloud y actualizar el registro sólo
con evidencia primaria. La auditoría de postulaciones de IA del 2026-07-26 queda como fotografía histórica.

### Nexa — retiro del modo "Compacto" + diagnóstico del lane que se abría solo (2026-08-05)

**Origen.** El operador reportó que al iniciar sesión el chat de Nexa aparecía abierto a la derecha. Causa
verificada en runtime (no deducida): su fila en `greenhouse_core.client_users` tenía
`nexa_interaction_mode='lane'`, y el provider abre el sidecar en cada carga fresca
(`useState(initialMode === 'lane')` en `nexa-interaction-mode-context.tsx`), sin persistir el colapso. Se
reprodujo con su propia sesión vía agent-auth y se contrastó con otra persona en modo `expandible` (no monta
el lane). **Preferencia revertida a NULL**; no hubo cambio de código para eso.

**Cambio ejecutado.** Se retiró el modo `dock` ("Compacto"): era el panel efímero pre-TASK-1078 (runtime
local, sin historial) que sobrevivió como opción del selector tras el cutover al panel ampliable. Salieron
con él su código muerto en `NexaFloatingButton` y el flag `NEXA_FLOATING_EXPANDABLE_ENABLED` + mirror
`NEXT_PUBLIC_*` (su único fallback era ese modo). Modos vigentes: `expandible` (piso incondicional) y `lane`.

**Estado: cerrado.** Code complete, migración aplicada, **pusheado a `develop`** (`8dbd11e5e`) y las 3 env
vars huérfanas del flag retirado borradas de Vercel el 2026-08-05
(`NEXT_PUBLIC_NEXA_FLOATING_EXPANDABLE_ENABLED` en Production, staging y Preview develop; la var server
nunca existió, solo el mirror). Verificado con `vercel env ls` post-borrado: cero restos del flag retirado,
`NEXA_INTERACTION_LANE_ENABLED` intacto.

**Verificación:** `pnpm local:check`, `pnpm test` (10.064 pass), `pnpm build`, `pnpm flags:audit --strict`
verdes. Menú verificado con Playwright contra localhost: solo Panel/Lateral, switch a Lateral y vuelta con
`PATCH /api/home/preferences` 200, cero errores de consola. CHECK de DB leído post-migración:
`('expandible','lane')`, 0 filas en `dock`.

**Deuda descubierta → devuelta a su dueña, no a una task nueva.** El `focusRef` + pregunta semilla vivía
**solo** en el panel legacy, nunca en `NexaFloatingPanel`. Como el default en producción era `expandible`,
el CTA "Pregúntale a Nexa" ya no anclaba el insight ni auto-enviaba la semilla **antes** de este cambio. El
barrido por dominio mostró que **TASK-1182 sigue `in-progress`** y es la dueña del `focusRef`: se le agregó
`## Delta 2026-08-05` con el estado real de sus criterios y el trabajo restante redefinido (portar el ancla
a `useNexaPersistentRuntime`, que cubre Panel y Lateral por construcción). De paso se cerraron dos huecos
preexistentes de su Status que la hacían no-tomable: `UI ready: no` + wireframe registrado
(`docs/ui/wireframes/TASK-1182-nexa-insight-surface-aware-conversation.md`, con las 3 decisiones de
comportamiento abiertas que bloquean `UI ready: yes`). `task:lint` y `ops:lint --changed` en 0/0.

### EPIC-028 — Producer V3: contratos de diseño y plan de ejecución (2026-08-05)

**Estado:** contratos de diseño `design-ready`; no se modificó runtime ni se creó una task paraguas. La
decisión es un solo shell del Producer con tres estudios adaptativos —Image, Video y Audio— gobernados por
`RouteCreativeContract`, con feed/muro y asset workspace compartidos.

**Artefactos creados:** dirección visual, wireframes, flujo de usuario, contrato de motion y plan operativo:

- [`EPIC-028-producer-v3-unified-studios.md`](docs/ui/visual-directions/EPIC-028-producer-v3-unified-studios.md)
- [`EPIC-028-producer-v3-unified-studios.md`](docs/ui/wireframes/EPIC-028-producer-v3-unified-studios.md)
- [`EPIC-028-producer-v3-unified-studios-flow.md`](docs/ui/flows/EPIC-028-producer-v3-unified-studios-flow.md)
- [`EPIC-028-producer-v3-unified-studios-motion.md`](docs/ui/motion/EPIC-028-producer-v3-unified-studios-motion.md)
- [`EPIC_028_PRODUCER_V3_EXECUTION_PLAN_V1.md`](docs/operations/creative-studio/EPIC_028_PRODUCER_V3_EXECUTION_PLAN_V1.md)

**Owners actualizados:** TASK-1523, TASK-1633, TASK-1552 y TASK-1643 contienen ahora los criterios de
aceptación y límites de ownership. TASK-1641 permanece restringida al lane backend/API de promoción; no se le
añadió UI. No se detectó un hueco que justificara una task nueva.

**Validación:** `git diff --check`, `pnpm task:lint --changed`, `pnpm ops:lint --changed` y el chequeo de enlaces
Markdown pasan. La implementación sigue condicionada a que cada task dueña cierre su mapeo UI, evidencia GVC,
dossier y decision log; estos documentos no habilitan por sí solos `UI ready` ni rollout.

## Globe — cierre de sesión 2026-08-05: 4 gates nuevos, y dos decisiones de NO hacer

**Hecho y desplegado.** `TASK-1641` **complete** (los 8 criterios verificados en runtime, promoción end-to-end
de `ref/still/reference-v1` con 10 = 10 créditos). Globe `main@2cdd4d8`, Greenhouse `develop`.

**Cuatro gates nuevos, todos probados EN ROJO** — porque la disciplina humana no escala y el build sí:

| Gate | Qué impide | Dónde corre |
|---|---|---|
| `dead-affordance` | un control que se ve accionable y no hace nada | `pnpm check` de Globe |
| `producer-item-actions` | que agregar una acción sea cablear en 4 sitios | idem |
| `creative-studio-doc-index` | un doc que existe y nadie encuentra | `docs:closure-check` |
| `skills:mirrors` | drift silencioso Claude/Codex | `local:check` (pre-push) |

**El despachador canónico de acciones del feed** (`data/producer-item-actions.ts`): una **tabla**, no cuatro
callbacks. Favorite y Download resueltos a nivel contrato; Reference y Recreate **declarados con dueño y
razón** en vez de cableados a la fuerza.

### 🔴 Dos cosas que decidí NO hacer, y por qué

1. **No cablear Reference/Recreate.** Necesitan `ProducerComposer.tsx`, que es de `TASK-1552`. Y «Recrear
   zero-spend» **contradice el único contrato que existe** (`relaunch` gasta): elegir si el botón gasta o
   precarga es decisión de producto. Corregido en `TASK-1643`, Delta 2026-08-05 (b).
2. **No correr el rollout del scope `pause`.** El CLI de Greenhouse **no puede despacharlo** —viaja con ID
   token de service account y Globe exige `human` en su propio dominio—, así que el rollout entregaría **cero
   capacidad** arriesgando el SSO de todos. **Superficie primero, grant después.** Procedimiento completo con
   riesgos y rollback en `TASK-1463`, Delta 2026-08-05 (b).

**Siguiente paso ejecutable:** coordinar `TASK-1552` ↔ `TASK-1643` para el canal feed → composer, y decidir la
semántica de «Recrear». Nada de eso lo puedo resolver implementando.

## TASK-1641 — Globe: DESPLEGADO + promoción end-to-end ejecutada (2026-08-05)

**Estado:** `in-progress`, **desplegado y aplicado**. Globe `main@b958a11`; API
`globe-api-internal-00213-5z9` (tag `b958a116a23a`, tráfico 100%), Job worker por digest
`sha256:82a4f2d3e0a6…`, `tofu apply` sobre plan guardado (`6 to add, 1 to change, 0 to destroy`) y `No
changes` posterior. Las 3 métricas, sus 3 alertas y `GLOBE_PROMOTION_WINDOW_WARNING_SECONDS=1800`
verificados contra el runtime, no contra el workflow en verde.

🔴 **El primer ciclo reportó 3 divergencias y DOS eran rutas VIVAS.** `ref/still/rrss-v1` y
`ref/still/openai-v2` tienen su última promoción de la saga en `rolled_back` **y su binding `enabled`**,
porque las habilitó el lane automatizado de ADR-010, que no enruta por la saga. El remedio que la señal
sugiere las habría retirado. «Última promoción revertida» era un **proxy** de «el rollback sigue en pie», y
un proxy falla donde otra autoridad puede deshacerlo: cuando dos mecanismos mueven el mismo estado, hay que
cerrar el predicado sobre el **estado actual del efecto**. Arreglado en `@b958a11`; **medido: la señal bajó
de 3 a 1**. Ningún test lo atrapó — apareció leyendo las primeras emisiones reales.

**Divergencia genuina que queda, y espera un acto humano:** `ref/still/reference-v1` `v5-pro` (binding
`enabled=false`, readiness `promoted`). Remedio: `globe.model-readiness.route.pause` sobre esa identidad.

| Scope | Estado | Evidencia |
|---|---|---|
| 1 canary de ruta arbitraria | ✅ ejercitado con gasto real | `@1767138` + `@a6ff46f` |
| 2 señal de ventana por expirar | ✅ código + IaC, sin aplicar | `@17c3fef` |
| 3 convergencia + su consumidor | ✅ cerrado | `@4a0a18b` + `@17c3fef` |
| 4 `canary-confirm` sin 500 opaco | ✅ cerrado | `@38c528d` |
| 5 reserva pre-gasto | ✅ código, sin desplegar | `@21d6ee3` |
| 6 runbook | ✅ publicado | `GLOBE_ROUTE_PROMOTION_RUNBOOK_V1.md` |

**Scopes 2 y 3 son un solo consumidor** porque son el mismo lector cross-workspace; usan la política de scan
que ya existía (`app.promotion_recovery_scan`, migración `0028`) — **sin migración nueva**. La señal de
ventana es el **complemento estricto** de `stalled`, que mide `deadline_at <= now` y avisa cuando ya venció.

🔴 **El hallazgo que evitó una señal falsa:** dos de las diez promociones revertidas pertenecen a identidades
que **después se volvieron a promover y quedaron selladas**. Sin el predicado de supersede por identidad
exacta, la señal habría acusado de divergencia justo a las dos rutas que convergieron, y su remedio habría
**retirado dos rutas vivas**.

**Scope 5, medido contra `globe-pg` antes de tocar código:** la **única** reserva `held` de toda la base es
pre-gasto (32 créditos) y hay **cero** post-gasto. El discriminador es `attempt.providerOperation`, no
`lease.kind`. Un fallo al liberar degrada al TTL y se observa, nunca se propaga.

**Los 8 criterios de aceptación están cerrados.** `ref/still/reference-v1` se promovió de punta a punta
(`promotion_4265dd26…` → `canary_passed` rev 9, binding `enabled` rev 5, 10 = 10 créditos) con el runbook
nuevo y sin una sola secuencia a mano — y esa promoción **cerró la divergencia**: la señal pasó de 1 a 0.

🔴 **Follow-up abierto: pausar una readiness no tiene camino ejecutable.** `requireHuman` rechaza a los
lanes de service account y `globe.model-readiness.pause` no está en los scopes humanos, así que hoy nadie
puede. No se construyó el modo en el operator lane porque habría sido un camino muerto; cerrarlo exige el
rollout de 3 pasos del broker. Detalle:
[`TASK_1641_SESSION_HANDOFF_2026-08-04.md`](docs/operations/creative-studio/TASK_1641_SESSION_HANDOFF_2026-08-04.md).

**Benchmark de producto (2026-08-05):** la comparación autenticada de Higgsfield/Magnific y la verificación de
Globe main@21d6ee3 están documentadas en
[GLOBE_COMPETITIVE_BENCHMARK_HIGGSFIELD_MAGNIFIC_2026-08-05](docs/audits/competitive-ui/GLOBE_COMPETITIVE_BENCHMARK_HIGGSFIELD_MAGNIFIC_2026-08-05.md).
El hallazgo load-bearing coincide con este handoff: la UI React todavía deja Reference, Recreate, Favorite y
Download sin handlers reales; no declarar cerrado el loop de Producer hasta TASK-1643/TASK-1552. TASK-1641 queda
limitada al lane backend/API de promoción y conserva como único criterio abierto el canary end-to-end.

## TASK-1641 — Globe: el sello del canary funciona; Omni y Veo SELLADAS (2026-08-04)

**Estado:** `in-progress`. **Causa raíz cerrada y las dos rutas de video promovidas, selladas y habilitadas.**

| Ruta | Promoción | Binding | Circuito | Canary |
|---|---|---|---|---|
| `ref/motion/reference-v1` (Omni) | **`canary_passed`** rev 9 | `enabled` rev 10 | `closed` rev 9 | run `74ea0dec…`, output `sha256:2c3370a9…`, `eligible` |
| `ref/video/frames-v1` (Veo 3.1) | **`canary_passed`** rev 9 | `enabled` rev 11 | `closed` rev 11 | run `d2788195…`, attempt `68a75b70…`, output `sha256:3a49d5ba…`, `eligible`, 32 cr reservados = 32 gastados |

Las dos son terminales: ya no expiran.

**Desplegado:** `efeonce-globe@38c528d`. API `globe-api-internal-00211-8sp` (tag `38c528d27b9a`) y Job
`globe-producer-worker` (digest `sha256:14b80d2f…`, mismo tag). Migración `0050` aplicada por el workflow keyless
(run `30953709590`); la vista proyecta **16 columnas** y conserva SELECT para los cuatro runtimes.

**Los dos defectos que la migración committeada TENÍA y no se veían leyéndola** (medidos contra PG real, en una
transacción con ROLLBACK, antes de aplicar):

1. `CREATE OR REPLACE VIEW` **no puede** reordenar ni renombrar columnas — sólo agregar al final. Poner
   `source_kind` en la tercera posición aborta con **`42P16`**. Va `DROP` + `CREATE`, sin `CASCADE`.
2. El runner de Globe hace `tx.query(sql)` con el **archivo completo**: no parsea markers. La sección
   `-- Down Migration` se ejecutaba y **re-creaba la vista rota tres líneas después de arreglarla**, quedando
   registrada como aplicada. Esa convención es de `node-pg-migrate` (Greenhouse), no de Globe.

**Lo demás que entró:** el checkpoint `activated → verifying_canary` ahora ocurre **después** de leer la
evidencia (era una lectura pura delante de un estado sin retorno: cada intento fallido quemaba una promoción);
un `DatabaseError` de pg deja de ser `internal_error` opaco —infraestructura `08/40/53/55/57` →
`dependency_unavailable`, las deterministas siguen `internal_error`, que es la verdad— y todo error de Postgres
emite su SQLSTATE en `globe.dispatch.database_error`; y el path tiene test real (estructural sin base + en vivo
opt-in), registrado en el script `test` del package y probado en rojo y en verde.

### 🔴 Cómo se produjo el canary de Veo, y qué NO prueba

Por el **carril gobernado**, con los commands canónicos del spine (`estimate` → `prepare` → `execute`) sobre el
transporte de `scripts/producer-ui-canary-lib.mjs`. Forma: 720p, 8 s, 16:9, `silent`,
`inputMode {kind:'frames', hasEndFrame:false}`; primer cuadro = el output ya gobernado
`output:8a5e24ec-…:0` declarado como `authorizedInputs`.

**NO se produjo desde la UI del Producer, y la UI sigue sin poder producirlo.** `ProducerFeedRoute.tsx` cablea
`onReference`, `onRecreate`, `onFavorite` y `onDownload` a **`() => undefined`** — no-ops explícitos —, así que
«Usar como referencia» no despacha ningún command y sin referencia el estimado no se calcula. El comentario del
propio archivo ya razonó que un no-op deja el botón mintiendo, pero sólo lo aplicaron a `onSelect`.

Consecuencias, sin adornos: **el Scope 1 de la task —un canary de ruta arbitraria canónico y committeado— sigue
pendiente**, y **la generación desde el Producer para rutas con entrada obligatoria sigue bloqueada**. Ambos
defectos tienen chip propio.

**Y un hallazgo sobre el ingest privado, con su límite declarado.** Dos subidas de referencia murieron en la
etapa `inspecting` con `dependency_unavailable` tras 5 intentos, mientras el asset **generado** de este mismo
canary pasó `inspecting` y `malware_scan` sin problema — o sea el worker está sano y lo que falla es el camino
private-ingest. ⚠️ Esas subidas se dispararon con un `File` **sintético** desde el browser, así que antes de
llamarlo defecto de plataforma hay que reproducirlo con el selector real. Lo que **sí** queda verificado es el
**enmascaramiento**: `SAFE_DEPENDENCY_CODES` sólo deja pasar los cuatro códigos de C2PA, así que los nombres de
ClamAV y de inspección que `engines.ts` ya emite se destruyen en la frontera. Tercera aparición de ISSUE-127 en
el día.

Historia anterior: [Handoff.archive.md](Handoff.archive.md).

## ADR-023 — Model Route Cards y skill compartida (2026-08-04)

**Estado:** implementado como contrato documental y de tooling; no cambia el runtime de Globe. La skill
`greenhouse-globe-model-fleet` existe en `.codex/skills/` y `.claude/skills/`, con paridad byte a byte, schema y
validador local. El baseline de fichas incluye FLUX 3, Gemini Omni, Veo 3.1, Seedance 2.0/R2V, GPT Image 2,
Seedream 5 Pro y Nano Banana 2/Pro:
[`FLUX_3_VIDEO_ROUTE_CARD_V1.json`](docs/architecture/creative-studio/model-fleet/routes/FLUX_3_VIDEO_ROUTE_CARD_V1.json),
[`GEMINI_OMNI_VIDEO_ROUTE_CARD_V1.json`](docs/architecture/creative-studio/model-fleet/routes/GEMINI_OMNI_VIDEO_ROUTE_CARD_V1.json),
[`VEO_3_1_VIDEO_ROUTE_CARD_V1.json`](docs/architecture/creative-studio/model-fleet/routes/VEO_3_1_VIDEO_ROUTE_CARD_V1.json) y
[`SEEDANCE_2_VIDEO_ROUTE_CARD_V1.json`](docs/architecture/creative-studio/model-fleet/routes/SEEDANCE_2_VIDEO_ROUTE_CARD_V1.json),
[`GPT_IMAGE_2_IMAGE_ROUTE_CARD_V1.json`](docs/architecture/creative-studio/model-fleet/routes/GPT_IMAGE_2_IMAGE_ROUTE_CARD_V1.json),
[`SEEDREAM_5_PRO_IMAGE_ROUTE_CARD_V1.json`](docs/architecture/creative-studio/model-fleet/routes/SEEDREAM_5_PRO_IMAGE_ROUTE_CARD_V1.json),
[`NANO_BANANA_2_IMAGE_ROUTE_CARD_V1.json`](docs/architecture/creative-studio/model-fleet/routes/NANO_BANANA_2_IMAGE_ROUTE_CARD_V1.json) y
[`NANO_BANANA_PRO_IMAGE_ROUTE_CARD_V1.json`](docs/architecture/creative-studio/model-fleet/routes/NANO_BANANA_PRO_IMAGE_ROUTE_CARD_V1.json).

La auditoría confirmó que las rutas públicas de Seedance usan `seedance-2.0` (text-to-video) y `seedance-2.0-r2v`
(R2V). `seedance-2.0-i2v`, bajo `bytedance/seedance-2.0/mini/image-to-video`, existe solo en el adapter Fal para
`video-extend`: no tiene routeId público, binding gobernado ni canary de producción. El adapter genérico de Veo también
contiene `veo-3.1-fast-generate-001`, pero el binding sellado de `ref/video/frames-v1` usa `veo-3.1-generate-001`.

**Estado honesto:** FLUX 3 sigue `gated` y no está declarado en `globe.producer.fleet.list`. Fal es la vía candidata;
BFL directo permanece Early Access y fuera de alcance. Próximo paso operativo: revalidar namespace/OpenAPI/pricing
con credenciales en Globe y ejecutar el Slice 0 de `TASK-1642`; no hacer submit billable ni promoción desde esta
skill.

La auditoría de imagen resolvió “Imagen 2 de ChatGPT” como GPT Image 2 (`gpt-image-2`); Google `imagen-2` no tiene
routeId, adapter ni binding en Globe. El reader live confirma disponibles GPT Image 2, Nano Banana 2 y Nano Banana Pro,
y Seedream 5 Pro para generación. Seedream Edit conserva provider/adapter cableados, pero su binding está deshabilitado
y el reader la devuelve `gated`; no debe promocionarse por herencia de Seedream T2I. Las cards mantienen además como
superficies diferidas la edición de OpenAI/Nano Banana y Seedream 5 Lite. Nano Banana Pro requiere reconciliar un lookup
de circuito `not_found` antes de nuevo gasto. No hubo cambios de runtime, secrets, bindings, rates ni deploy.

La auditoría de Kling 3.0 añadió [`KLING_3_VIDEO_ROUTE_CARD_V1.json`](docs/architecture/creative-studio/model-fleet/routes/KLING_3_VIDEO_ROUTE_CARD_V1.json)
y enlazó la evidencia con `TASK-1617`. Fal tiene superficies candidatas Pro, Standard y 4K para text/image-to-video;
Globe no tiene routeId, adapter ni binding Kling y la card permanece `gated`. La API nativa de Kling y Kling O3 quedan
separadas de la vía Fal/V3. No hubo submit, gasto, cambio de runtime, secret, rate, binding ni promoción.

## EPIC-039 — Next.js 16.3 + TypeScript 7 Toolchain Adoption (2026-08-04)

Estado: **to-do / diseño**. Se registraron el epic y sus dos tasks hijas:
[`EPIC-039`](docs/epics/to-do/EPIC-039-nextjs-typescript-toolchain-adoption.md),
[`TASK-1638`](docs/tasks/to-do/TASK-1638-nextjs-16-3-framework-alignment.md) para el alineamiento del framework y
[`TASK-1639`](docs/tasks/to-do/TASK-1639-typescript-7-dual-compiler-adoption.md) para el lane dual TS7/TS6.
Los linters de tasks/epic/ops y el cierre documental pasan. No hubo cambios de código, dependencias, runtime,
deploy ni producción. Siguiente paso: tomar `TASK-1638`; `TASK-1639` permanece bloqueada hasta su cierre.

## ISSUE-137 — Asset Governance: resolución verificada con cron de un minuto (2026-08-04)

**Resuelta y desplegada.** La latencia de Asset Governance era `nº de etapas × el cron`: cuatro etapas
esperando un tick de `*/5` daban ~20 min de reloj para ~60 s de trabajo. El cron bajó a `*/1`
(`efeonce-globe@d78ce01`, Scheduler live `*/1 * * * * ENABLED` en `southamerica-east1`).

**Verificado con dos generaciones reales**, medidas contra `globe-pg`:

| | end-to-end | governance | créditos | output |
|---|---|---|---|---|
| imagen | 471,8 s | 183 s | 10 = 10 | PNG 7,57 MB `retained` |
| video | 474,0 s | 183,8 s | 16 = 16 | MP4 `retained` |

Que imagen y video coincidan **siendo otro medio y otro peso** es la prueba de que era cadence-bound y no
size-bound — o sea que el arreglo generaliza. Antes: ~1085 s de governance y ~22 min end-to-end.

**El presupuesto de latencia ahora es canónico** y vive donde corresponde:
[ADR-007 § Presupuesto de latencia](docs/architecture/creative-studio/EFEONCE_GLOBE_ASSET_GOVERNANCE_WORKER_DECISION_V1.md),
con su corte en [`GLOBE_RUNTIME_HANDOFF`](docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md) y el
presupuesto de espera para operadores en el
[manual del Producer](docs/manual-de-uso/creative-studio/usar-creative-producer-globe.md).

**Los dos defectos que NO eran de latencia se cerraron en `TASK-1469`**: la vista del experimento ya
proyecta el attempt en vuelo, y el cierre de la cola se sella con reloj real en **los siete** call sites de
`finishLease` (eran timestamps del dominio, tres de ellos del futuro).

🔴 **Las tres lecciones de método, que valen más que el arreglo:**

- **Un readback es un instante, no un veredicto.** Se declaró un bloqueo mirando **seis minutos** un camino
  cuya latencia real era **veintidós**. La regla de no reintentar se aplicó bien; lo que faltó fue **volver a
  leer más tarde**. Declarar «no avanza» exige conocer la latencia esperada del camino.
- **El instrumento decía «roto» y la causa era otra, tres veces:** los runs «colgados» habían completado, el
  drain loop que se iba a escribir era **una variable de Terraform**, y el canary llevaba tiempo **abortando
  sobre un sistema sano**. La señal que la issue proponía —«reservado sin attempt tras N minutos»— habría
  alertado sobre corridas perfectamente sanas.
- **El drain loop quedó evaluado y diferido**, no descartado: bajaría governance a ~1 min, pero su riesgo es
  la **equidad entre workspaces** (hoy cada uno recibe un `claimDue` por ejecución, que es round-robin justo),
  no el lease. Si se hace, con cota configurable y default que reproduce la conducta actual.

Detalle completo y cronología:
[`ISSUE-137`](docs/issues/resolved/ISSUE-137-globe-experiment-running-forever-zero-attempts.md).

## WIP saneado — Globe, Brightcell y Polpaico (2026-08-01)

- ADR-019 `Accepted`; ADR-020 `Proposed`. Brightcell: **no enviar** hasta Finance. Polpaico: `HOLD / NO-BID`, sin precio/deck emitible. Detalle en `changelog.md`.

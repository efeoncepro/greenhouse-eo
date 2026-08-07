# Handoff activo

### TASK-1306 — cockpit SEO Overview: code complete, deploy pendiente (2026-08-06)

`/admin/growth/seo` en `develop` **local (sin push)**, 5 slices. Suite **10281/0**, build prod
verde, GVC 1440+390 con `pageErrors 0`. Detalle completo en el `## Closure Report` de
`docs/tasks/complete/TASK-1306-growth-seo-overview-cockpit-ui.md`.

**Lo que necesita quien siga:**

1. **`resolveApexColor` (`src/libs/styles/`) es un hallazgo compartido.** Con `cssVariables: true`
   el theme devuelve `var(--mui-palette-*)` y ApexCharts revienta al parsearlo — 8 excepciones por
   corrida, invisibles (el chart no termina de pintar). **Los ~32 consumidores de Apex del repo
   tienen el mismo bug latente**; candidato a task propia.
2. **`MetricTrendCard` ganó `deltaOverride` + `deltaSemantics`** (opt-in, legacy byte-idéntico).
   **TASK-1307 las necesita** para su Δ30d de posición: no reimplementarlas.
3. **`readRankSnapshotLatest` NO existe** aunque 1306/1307 lo citen: sólo `readRankEvolution`.
4. **`GROWTH_SEO_ENABLED` ya está ON en Production** — la ruta queda viva al desplegar; el control
   de exposición restante es el viewCode + el `module_assignment` per-org.

**Rollout pendiente:** migración del viewCode en staging y prod (hoy sólo dev) → deploy →
verificar con operador real → GVC contra staging.

**Próximo paso:** TASK-1307, con dirección visual ya aprobada (concepto C "Evidencia narrativa",
`product-design-loop` 2026-08-06) y Slice 0 (ECharts vs Apex) todavía abierto.

### Break-glass deploy del gateway MCP — shim DCR LIVE (TASK-1654, 2026-08-06)

GitHub Actions cayó en **major outage** (4 intentos de deploy muertos: 2 cancelados en cola, 1
flake WIF, 1 sin poder descargar actions). Con autorización explícita del operador se desplegó
por **break-glass gcloud directo**: Cloud Build local→imagen `gateway:ae8f2f7` (38s) + `gcloud
run deploy --update-env-vars OAUTH_PUBLIC_CLIENT_ID=…` (aditivo, hereda el resto de la revisión;
el workflow declara la var así que el próximo deploy normal converge). Revisión
`efeonce-mcp-gateway-00015-4st` sirviendo 100%. Verificado live: AS metadata con
`registration_endpoint` + authorize/token reales de Entra, protected-resource apuntando al
gateway, `/register` devolviendo el client fijo, `/mcp` anónimo 401, y canary 4/4 (rank-evolution
series=31). Rollback: snapshot de la revisión previa en scratchpad + `gcloud run services
update-traffic` a `00014`. **VERIFICADO CON EL CLIENTE REAL (2026-08-06 ~17:50Z): Claude Code
autenticó exitosamente contra el gateway** ("Authentication successful / Connected") tras el
segundo fix — scopes CUALIFICADOS en el protected-resource metadata (`56e46f7`, revisión
`00016-6zh`): Entra v2 resuelve scopes pelados contra Graph (AADSTS650053); el valor requestable
es `https://mcp.efeonce.org/mcp/<scope>` y el `scp` del token vuelve pelado (verifier intacto,
validado con arch-architect). Pendientes: (1) formalizar TASK-1654 retroactiva (shim DCR + scope
fix, ambos break-glass documentados); (2) cuando GitHub Actions se recupere del major outage,
correr el deploy normal del workflow para converger el carril canónico (declara la env var; el
código ya está en main `56e46f7`).


> Historial rotado: [Handoff.archive.md](Handoff.archive.md).

### TASK-1304 — site audit + backlinks: code complete + smoke E2E real, rollout pendiente (2026-08-06)

Los fundamentos técnicos + off-page de EPIC-022 quedaron completos en `develop` **local (sin push)**:
`queueSiteAudit` (OnPage async, gate consume cupo de audits, guard anti doble-encolado),
`collectSiteAuditRuns` (claim `FOR UPDATE SKIP LOCKED`; UPDATE + findings + outbox en la MISMA tx =
exactly-once; gave_up a las 24h), `captureBacklinkSnapshot` (pre-check + `ON CONFLICT DO NOTHING`;
`partial` honesto si el delta falla), readers `readSiteAuditReport`/`readBacklinkProfile`, signal
`seo.audit.stuck_tasks` (6h warn / 30h error), 3 handlers ops-worker + 3 Cloud Scheduler **PAUSADOS**
en `deploy.sh`, mirrors BQ `seo_site_audit_history`/`seo_backlink_history` (tablas creadas con
`bq mk`) y — mandato parity — 2 lanes ecosystem + MCP tools `get_seo_site_audit_report` /
`get_seo_backlink_profile` en el mismo PR.

**Smoke REAL ejecutado** (~USD 0.05, efeoncepro.com dogfooding): enqueue task OnPage real (10 págs,
USD 0.0015) → collect materializó exactly-once (`succeeded`, health 93.41, 60 findings 0c/32w/28n) →
re-collect no-op → backlinks USD 0.048 (15 ref domains, 455 backlinks, rank 44/100, new/lost 5/0) →
re-run `already_captured` USD 0 → mirrors BQ 1 fila c/u (manuales — el worker desplegado aún no tiene
las projections) → signal ok → ledger del transporte correcto. **Gotcha cazado en vivo:** el poll
`summary` de OnPage es POST con id en el BODY (`[{id}]`) — la variante POST-por-path responde 200
sin tasks y el collect quedaba ciego (fix + guard de regresión + reference del skill corregida).
Gates: suite full verde, build prod, worker gates, sanity SQL 17 checks, docs:closure-check.

**ROLLOUT EJECUTADO (2026-08-06 tarde, autorización "termina todo lo que falte"):** push develop
hecho; Actions en outage mayor mató 2 runs del worker en cola → **break-glass local** del
ops-worker (mismo patrón que el gateway ese día): revisión **`ops-worker-00528-zgr`** con
`GIT_SHA=26005a619`. **Los 3 schedulers ACTIVOS** (deploy-contract test ahora protege el estado
ENABLED) y handlers ejercitados por el camino real Scheduler→OIDC: **primer audit de Berel
encolado** (USD 0.015, 100 págs) + **primer backlink snapshot de Berel** (USD 0.048: 315 ref
domains, 53.684 backlinks, rank 50/100); efeonce skip por idempotencia. Lanes staging vivos
(400 `missing_external_scope_type`). **Ciclo autónomo COMPLETO verificado el mismo día:** el
collect PROGRAMADO (tick del cron, cero intervención) materializó el audit de Berel —
`succeeded`, 100 páginas, health 95.40, 519 findings (0 críticos) — y la lane reactiva espejó el
backlink snapshot de Berel a BQ orgánicamente (2 filas en `seo_backlink_history`). **Pendiente restante — bloqueado por el outage de Actions:**
release develop→main (los lanes/MCP tools a Vercel Production; NUNCA dispatchar el orquestador en
outage: `main` quedaría sin manifest) y DESPUÉS federar las 2 tools al gateway (patrón TASK-1653 —
antes del release el gateway vería 404). Si el run varado de Actions (31126022507) despierta,
deploya el mismo SHA — converge inofensivo. Runbook:
`docs/manual-de-uso/growth/operar-site-audit-backlinks-seo.md`.

### Hallazgo MCP gateway — clientes Claude no conectan por falta de DCR (2026-08-06)

Al intentar conectar Claude Code al gateway (`claude mcp add` + `/mcp` → Authenticate) falla con
`Incompatible auth server: does not support dynamic client registration`. Causa: el cliente MCP de
Claude (Code y claude.ai custom connectors) exige DCR (RFC 7591) para auto-registrarse, y **Entra no
soporta DCR**. El canary OAuth funciona porque usa la app Entra PRE-registrada (client `32617b87-…`).
**Fix propuesto (task nueva en `efeonce-mcp`)**: shim de DCR en el gateway — endpoint `/register` que
devuelve el client_id público pre-registrado + metadata del authorization server; patrón conocido para
gateways MCP respaldados por Entra (~50-80 líneas). Con eso Claude Code/claude.ai/Desktop conectan sin
fricción. Hasta entonces, la vía operable del 360 por MCP sigue siendo la service identity (canary) y
el smoke OAuth del script.


### TASK-1653 cerrada — las 4 tools SEO federadas al gateway + guard de paridad (2026-08-06)

Ejecutada el mismo día en `efeonce-mcp` (`ff68078`+`2365ef9`, deploy `31112222516`, revisión
`efeonce-mcp-gateway-00014-fcg` Ready): `get_seo_rank_evolution` federada (provider + registerTool
espejo del MCP interno) + **guard de paridad CI fail-closed** (lista esperada versionada +
exclusiones con razón; rojo forzado verificado). Canary 4/4 contra producción: rank-evolution
sirvió `series=31` — la serie real de Berel capturada hoy — y el budget del entitlement ya refleja
el gasto (49.86/50). Contrato "cómo agregar una tool" en el AGENTS.md del gateway: las tasks del
mandato (1304/1311/1313/1314/1317) agregan su tool a la lista esperada EN EL MISMO PR. El smoke
autenticado vía `mcp.efeonce.org` también quedó VERDE el mismo día (4 tools en 200; rank-evolution
series=31 por el tramo Entra→gateway; canary extendido en `83cdefc`). Con esto, el
programa SEO del día queda entero: captura diaria activa + 4 tools E2E + release en prod. Siguiente
frente: TASK-1307 (UI pantalla ancla) y TASK-1304.


### Release `fcee5ab9f7ce` — TASK-1303 en producción (2026-08-06)

PR #178 → manifest **`released`** (`fcee5ab9f7ce-1a85e0aa-cbad-42ab-bad0-2b4851d999cc`, run
`31105434129`, 10m04s), watchdog `drift_count=0`, health verde. El lane
`/api/platform/ecosystem/growth/seo/rank-evolution` responde en producción (400 sin auth = ruta
viva) y la tool interna `get_seo_rank_evolution` quedó en el MCP de prod. Dos hallazgos para el
próximo release (ya en el timing ledger): (a) pushes docs-only a develop justo antes del release
cancelan el build de staging (ignore-build) y bloquean el preflight `vercel_environments` —
pre-empción: `vercel redeploy` del deployment cancelado; (b) el merge canónico `-X ours` intentó
colar 1 línea regresiva de main (`recordFailure` incondicional pre-auditoría TASK-1300) — con
verif1 vacío y drift regresivo, `-s ours` (árbol develop exacto) es la resolución. **Siguiente:
TASK-1653** (federar `get_seo_rank_evolution` al gateway + guard de paridad) quedó DESBLOQUEADA
por este release. La serie de rankings corre sola desde mañana 05:00 CLT (scheduler ENABLED,
Berel 31 keywords).


### Efeonce dejó de ser cliente de sí misma — modelado corregido (2026-08-06)

`EO-ORG-0007` (Efeonce, `is_operating_entity=true`) tenía `organization_type='client'`, herencia
del space de cliente de **marzo 2026** — de cuando aún no se había decidido que la operadora no
es cliente. No lo causó el dogfooding SEO: el script de provisión no escribe en `organizations`,
y la única transición registrada es `null → inactive` del 2026-04-21 (backfill TASK-535).

**Qué exponía.** 5 readers filtran `organization_type IN ('client','both')` **sin consultar el
flag**: lista y detalle de `/finance/clients`, `finance/canonical.ts`, el backfill de
`client_profiles` y el picker del wizard de onboarding. Efeonce salía **primera** de 17 clientes
(orden por `updated_at DESC`). Y `resolveFinanceClientContext` la aceptaba como cliente
facturable, siendo la misma org el emisor fiscal — autofacturación posible. Daño consumado
verificado: **0 income, 0 contratos, 0 usuarios de portal**. Puerta abierta, no incendio.

**Corregido** con `scripts/commercial/reset-organization-commercial-role.ts` (nuevo): baja el rol
a `'other'` por el writer canónico. Hizo falta una puerta dedicada porque
**`deriveOrganizationType` es monótona** — nunca degrada un rol adquirido, así que un
`upsertCanonicalOrganization` normal lo perpetúa (mi escritura de `website_url` de ese mismo día
lo hizo). El script declara `currentType='other'` explícitamente, con guardas: aborta si el
lifecycle implica rol real o si hay income.

**Verificado tras el cambio:** `organization_type='other'`, `is_operating_entity=true` intacto,
2 `module_assignments` intactos, y el canary SEO contra producción sigue devolviendo
`hasModule=true tier=contracted 8 audits $50`.

**El modelo ya soportaba esto — no había que inventar nada.** Tres ejes ortogonales: identidad
legal (`is_operating_entity`), rol comercial (`organization_type`) y capabilities
(`module_assignments`). La operadora monitorea su propio SEO/AEO/GA4 por el tercer eje;
`enforceSeoRunEntitlement` resuelve sólo por `organization_id` + `module_key`, cero dependencia
del tipo. `'other'` no significa "sin clasificar": significa **sin rol comercial**, que es lo
que la operadora es. Contrato semántico escrito en `GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
§Organization Types, junto con el **NUNCA** de agregar un valor de identidad al enum (ya se
intentó: quedó una rama muerta contra `'efeonce_internal'`, que es un `tenant_type` de usuarios,
no un tipo de organización).

**Follow-ups con dueño:** `TASK-1648` (guard por flag en los 5 readers — cierra la causa),
`TASK-1649` (el `space` y `client_profile` de marzo, con inventario antes de tocar),
`TASK-1650` (el emisor legal de cotizaciones compartidas: query a columnas inexistentes +
`catch` mudo ⇒ todo quote imprime un hardcode; incluye la discrepancia `of 05` vs `Of 1105`).

**Pendiente de decisión tuya:** el merge/borrado en HubSpot de las auto-companies `efeonce.org`
(56011409567) y `efeonce` (57099835819). La canónica **nunca estuvo en HubSpot**
(`hubspot_company_id` es `null`); esas dos son auto-companies creadas desde el dominio del correo
de formularios de prueba. Mergear exigiría *crear* una company canónica de Efeonce, que es
justo lo que no debe existir — corresponde borrarlas, y primero en HubSpot (si se borran sólo en
Greenhouse, el sync las repone). Sin exclusión de dominios internos en el inbound, vuelven.

### Cutover MCP-first de Search Visibility 360 — COMPLETO en producción (2026-08-06)

Las 4 capas quedaron vivas y verificadas, en este orden. **TASK-1645 y TASK-1647 pasan a `complete`.**

**1. Release `develop→main`** — PR #177, SHA `70e912056273d0a30e2aa8dacc2f4e62076e3b44`,
`release_id=70e912056273-03c36b47-eb75-469c-886f-51c691cd7c34`, run `31058032196`, manifest `released`,
workflow 10m51s. Batch grande (355 commits, 221 archivos de código, 14 migraciones: EPIC-022 SEO
completo, EPIC-028 Globe, identity 1616/1631, payroll 1630, Nexa 1182, EPIC-040). **Pasó a la primera,
sin bypass y sin retry** porque los 3 gotchas conocidos se pre-emptaron: merge canónico
`origin/main -X ours` antes del PR (conflicto modify/delete de TASK-1590 resuelto conservando develop),
marker `[release-coupled: …]` en el cuerpo del squash (batch policy → `ship`), y
`gh workflow run playwright.yml --ref main` antes del dispatch (3m10s) en vez de bypassear el
`playwright_smoke` ausente del squash. Watchdog `drift_count=0`; el residual change-gated de
`ops-worker` (`558558263e80`, diff runtime vacío) ya lo clasifica bien el fix que entró en `6f7e246ea`.

**2. `GROWTH_SEO_ENABLED=true` en Vercel Production** + redeploy `dpl_GyGkdEQQTk65qkCs1S3TEH6Jquy9`
(Vercel congela env vars al crear el build). Multi-runtime: el mismo flag ya estaba ON en el
`ops-worker` para el materializer GSC. Ledger actualizado.

**3. Canary del provider contra producción** (`greenhouse.efeoncepro.com`, service identity del
gateway): **Berel `domainQuadrant=riesgo`, 50 keywords, AEO 44.5** · Efeonce `hasModule=true
tier=contracted` + `no_seo_data` honesto · deny anti-oracle `404 greenhouse_seo_lane_404`.

**4. Provider habilitado en el gateway** — `efeonce-mcp` `76cb121`, workflow `31059346243`, revisión
`efeonce-mcp-gateway-00012-dkj` `Ready=True` con `GREENHOUSE_ECOSYSTEM_TOKEN` como **secret ref** de
Cloud Run. Hallazgo: el secreto `efeonce-mcp-gateway-greenhouse-token` se había creado **sin ninguna
binding IAM** — sin el `secretAccessor` scoped al SA del gateway el deploy habría fallado. Front door
verificado: health `200`, protected-resource metadata `200` (3 scopes), `POST /mcp` anónimo `401` con
`WWW-Authenticate` correcto.

**5. Smoke MCP autenticado por `mcp.efeonce.org` — VERDE.** `scripts/oauth-canary.mjs` quedó
**extendido en este cierre** con las tools SEO. Flujo Entra authorization-code + PKCE real (login
humano), token con `aud=c5363215-…` y `scp` incluyendo `efeonce.mcp.read`:

```bash
MCP_CANARY_SEO_ORGANIZATION_ID=org-32333527-02a8-487b-819e-6f76a761777d \
MCP_CANARY_SEO_DENY_ORGANIZATION_ID=org-00000000-0000-0000-0000-000000000000 \
node scripts/oauth-canary.mjs
```

→ `initialize 200` · `seoEntitlementStatus 200` · `seoVisibility360Status 200` ·
**`seoDomainQuadrant: "riesgo"`** · `seoDenyFailedClosed: true` (+ Globe capabilities/fleet 200).

**Ese `riesgo` es el quadrant real de Berel devuelto por el front door público**: la cadena
Entra → gateway → provider → lane → readers → PG está cerrada end-to-end. El objetivo de la sesión
—preguntar por MCP por la visibilidad 360 de Berel y recibir el quadrant real— está cumplido.
El smoke exige login interactivo, así que es asistido por humano, no automatizable en CI.

**Pendientes menores heredados (sin tocar):** merge en HubSpot de las auto-companies `efeonce.org`
(56011409567) y `efeonce` (57099835819) hacia la company canónica — el sync propaga, NUNCA borrar por
SQL; ~~`website_url` en EO-ORG-0007~~ **HECHO 2026-08-06**: `https://efeoncepro.com` poblada por
`upsertCanonicalOrganization` (script `scripts/growth/_sanity-efeonce-website-url.ts`, idempotente,
sin `overrideIdentity` para no pisar un valor ajeno; `organization_type` se mantuvo `client`);
conexión GSC de
`efeoncepro.com` gated por TASK-1282/1283.

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
~~`website_url` de EO-ORG-0007 vacío~~ **CERRADO 2026-08-06** — `https://efeoncepro.com` por la puerta
canónica `upsertCanonicalOrganization`. (3) Conectar GSC de efeoncepro.com cuando 1282/1283
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
**verificado: ningún sanity del repo usa hoy el patrón frágil** (el de 1301 ya limpiaba en `finally`; el de 1302 se migró en `1a02b4b99`). La regla de decisión quedó canonizada en `SQL_DATE_MATH_AGENT_INVARIANTS`.

**Auditoría adversarial (2026-08-06, 3 verificadores).** 6 defectos corregidos. El más caro:
**`serp` con `organizationId` y sin contador gastaba sin registrar y NO lanzaba** — el guard
condicionaba por "¿la familia exige organización?" en vez de "¿hay organización?", y TASK-1303 usará
`serp` para rank capture desde un cron. También: el AEO reportaba `invalid_response` cuando el breaker
cortaba (culpaba al parser); un 4xx del caller abría el breaker y degradaba al AEO; `half-open` dejaba
pasar todas las llamadas concurrentes; y 3 de 4 familias no compilaban sin un cast que anulaba el
chequeo del payload.

**🔴 Corrección de una afirmación mía que era FALSA:** dije que `GROWTH_SEO_ENABLED` "lo lee el
ops-worker, NO Vercel". **Vercel también lo lee** — el lane ecosystem/MCP (TASK-1645) y el reader del
cruce SEO↔AEO (TASK-1305), ambos aterrizados el mismo día. **El flip es de TRES pasos** y, crítico:
**apagarlo sólo en `deploy.sh` NO apaga el módulo**, el lane de Vercel sigue sirviendo. El bloque de
rollback de TASK-1302 quedaba incompleto y parecía exitoso. Corregido en `flags.ts` y en la arquitectura.

**Límite del gate que hay que conocer antes de TASK-1303:** el presupuesto se consulta UNA vez y el
gasto se acumula DESPUÉS. Medido: batch de 120 keywords con budget `trial` → gastó 3× el presupuesto.
Sin reserva previa no hay tope por corrida. Declarado en el docstring de `enforceSeoRunEntitlement`.

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
target. Google envió el 2026-08-06 la solicitud formal de due diligence anti-soborno, con fecha límite 2026-08-13; el
próximo paso operativo es responder las decisiones del formulario antes de esa fecha y actualizar el registro sólo con
evidencia primaria. La auditoría de postulaciones de IA del 2026-07-26 queda como fotografía histórica.

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

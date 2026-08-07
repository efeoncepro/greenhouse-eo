# Handoff activo

### TASK-1308 — Keyword Opportunities COMPLETE, 2 pendientes de rollout (2026-08-07)

Ruta `/admin/growth/seo/keywords` cerrada y movida a `complete/`. Nació `Backend impact:
none` y terminó con migración, dos commands, dos rutas app-lane, dos rutas del lane
ecosystem y **dos tools MCP federadas** — porque `trackKeywords`, que la spec daba por
construido por TASK-1303, no existía.

**La idea que ordenó todo:** seguir una keyword es un **compromiso de gasto diferido** — el
rank capture diario paga al proveedor por cada keyword vigente, en cada ciclo. De ahí el
techo gobernado por target, el permiso separado del de leer, el outcome por keyword y
`untrackKeywords`, sin el cual el compromiso era permanente.

**PENDIENTE DE ROLLOUT (lo único que falta):**

1. **Scope de Entra** — `efeonce.mcp.seo.keywords.track` no existe en la app
   `Efeonce MCP Resource` (`c5363215-b9a6-4bf1-bb1c-e61963b37dac`, 3 scopes hoy). Las DOS
   tools lo comparten, así que ambas responden `insufficient_scope` hasta provisionarlo —
   fail-closed por diseño. ⚠️ `az ad app update` **reemplaza** el arreglo completo de
   `oauth2PermissionScopes`: round-trip verificado (leer → append → escribir → verificar) o
   borra los tres vivos de Globe. Snapshot del estado previo en el scratchpad de la sesión.
2. **Push del gateway** — `efeonce-mcp` commits locales `cb316cc` + `41dca07`, sin push. El
   repo tiene deploy productivo en push; último run `success`.

**Follow-up abierto:** `TASK-1657` — dos defectos de PLATAFORMA que 1308 cerró con parches
locales: (A) mismatch de hidratación por `useId` en cualquier control MUI dentro de una
surface recipe (cerrado acá con ids declarados; la causa raíz afecta al portal y no tiene
detección) y (B) los findings inevitables de `ui:code-lint` en charts a canvas, que hacen
que ese gate deje de significar algo.

**Hallazgo del gate TASK-893 que vale registrar:** cerrar una membresía con `NOW()` produce
`effective_to = effective_from` y revienta el CHECK `> ` (23514), porque `NOW()` es el
timestamp de INICIO de transacción. `clock_timestamp()` lo resuelve. Los mocks lo daban por
bueno; sólo apareció contra PG real.

Verificación: `pnpm test` completo (1 fallo ajeno, del WIP no commiteado de `artifact-composer`
de otra sesión) · `pnpm build` producción verde · sanity live 16/16 contra PG · GVC 17
pasadas · ui:quality 4.82/4.5 · visual-gate, design-contract, task:lint en verde.

### Seedance 2.5 — inventario Fal y TASK-1656 (2026-08-07)

Fal Model Search/OpenAPI confirma tres endpoints activos: T2V, I2V y R2V; Globe permanece `provider-supported / gated`.
Se dejaron el inventario API, route card, registry, fleet ledger y skills espejo actualizados; no se tocó runtime de Globe.
`TASK-1656` registra la integración backend-data: roles multimodales, audio, frame final, queue/webhook, ingest, rates,
rights, evaluación, canary, settlement y promotion por ruta. Reutiliza el adapter Fal y el control plane existente;
la UI queda en `TASK-1552` y el contrato compartido en `TASK-1633`. No habilitar 4K/1080p, tres minutos, edit/masks,
storyboard, stems, streaming, realtime, seed de entrada ni BytePlus 2.5 sin contrato verificable.

### Release `30140c662` — TASK-1304 + TASK-1306 en producción (2026-08-07)

PRs #179+#180 → manifest **`released`** (`30140c662a79-b5790565-9b75-41b8-a206-f2cd21a58080`, run 4
`31180734383`, 8m29s), watchdog `worker_revision_drift: ok`, health prod 200, **lanes 1304 vivos en
producción** (`site-audit-report` + `backlink-profile` responden 400 `missing_external_scope_type`).
Con esto el cockpit de 1306 deja de sufrir el apagado cíclico de su viewCode. Costó 4 intentos, dos
hallazgos nuevos ya en el timing ledger y el catálogo: **(a) el run zombie del outage** (31126022507,
inmanejable por API — 6 vías 409/403) bloqueaba `pending_without_jobs` → fix de causa raíz = **lista
forense `src/lib/release/preflight/ignored-pending-runs.ts`** (razón + vencimiento 2026-08-21 +
evidencia en manifest; la reliability signal NO la consume, por eso el watchdog seguirá mostrando
`pending_without_jobs: error` A PROPÓSITO hasta que GitHub recolecte el zombie — NO es un incidente
nuevo); **(b) Cloud Build de ico-batch >600s** (backlog post-outage) abortó el intento 3 — dejar
terminar el build huérfano cachea la imagen y el retry pasa limpio. **Federación EJECUTADA el mismo día**
(`efeonce-mcp` `bfb3832`, deploy `31182267290` success): provider + registerTool + lista de paridad
(6 tools SEO) + canary extendido — **canary 11/11 verde contra producción** con los datos reales de
Berel y Efeonce. TASK-1304 operativamente completa de punta a punta; cero pendientes.

### Autenticación local Gcloud con Playwright (2026-08-07)

Se agregó el proceso local explícito `pnpm gcloud:auth:playwright`, invocable por Codex o Claude, para
renovar CLI + ADC cuando el operador lo solicite, con `--force` para repetir OAuth y `--check-only` para
verificar sin abrir navegador. La skill espejo `greenhouse-gcloud-auth-playwright` fija este recorrido. El setup
`pnpm gcloud:auth:playwright:setup` guarda la cuenta y la clave en `.auth/gcloud-auth-credentials.json`
ignorado por Git y con permisos `0600`; el perfil Chrome aislado queda en `.auth/gcloud-auth-profile`.
El flujo usa Playwright visible, no imprime URLs/códigos/cookies y termina con `gcloud-auth-preflight.sh`.
No hay scheduler ni rollout remoto.

### TASK-1307 + TASK-1655 — pantalla ancla SEO + Historical Data Platform (2026-08-07)

**TASK-1307** (`/admin/growth/seo/performance`, in-progress → cierre en curso): pantalla
ancla implementada completa en `develop` local (3 commits, sin push). ECharts elegido e
instalado (Slice 0 — 1306/1308/1310 heredan); readers nuevos `readSeoPerformance` +
`readSeoPerformanceCatalog` con parity completa (lane ecosystem + MCP tools
`get_seo_performance`/`get_seo_performance_catalog` en el mismo PR); **fallback entre
fuentes** (keyword×posición intenta DataForSEO ◑ y cae a la posición medida GSC ● cuando
la serie exacta es más joven — regla del operador, nunca promediadas); cobertura REAL
declarada en el chart ("N de M días con medición"). GVC **premium** verde: rubric
enterprise pass, `ui:visual-gate` PASS, `ui:quality` PASS (avg 4.56, floor 4.5). Suite
growth/seo 151/151. Pendiente de cierre: `pnpm build` prod (corriendo), lifecycle/docs
finales y la **promoción develop→main heredada de 1306** (checkbox rojo del closing).

**TASK-1655** (in-progress): hallazgo de fondo — el módulo era **forward-only** (5 días
GSC / 2 de rank teniendo 16 meses en la API). Slices 1-3 SHIPPED: mirror
`greenhouse_growth_analytics.seo_gsc_history` (tabla creada, MERGE idempotente, el batch
diario espeja y reporta `bqMirror`), backfill API→BQ resumible (smoke 31/31 días Berel,
**paridad exacta PG↔BQ** verificada), split de lectura por cobertura. **Backfill de 16
meses de Berel CORRIENDO en background** (562k+ filas al momento del handoff; resumible —
si murió, re-correr `scripts/growth/backfill-gsc-history.ts` con las env OAuth del
runbook `docs/manual-de-uso/growth/backfill-historico-gsc.md`). Pendientes: verificación
final del backfill, Slice 4 (semilla rank `historical_serps`, verificar granularidad en
sandbox ANTES), Slice 5 (export nativo en la propiedad de Berel — necesita permiso
Owner, out-of-band; Efeonce ya lo tiene desde 2025-12-10).

**Hallazgos cross para quien siga:** (1) `CustomTabsNav` (@core) para tabs-que-son-links
— el TabList de lab inyecta `aria-controls` fantasma (axe critical; 1306 puede migrar
igual). (2) `SurfaceRecipe.plane='none'` para recipes sobre composiciones de cards. (3)
El 1 rojo de la suite full es `catalog-extensibility` del artifact-composer, roto por
WIP sin commitear de OTRO agente en `catalogs/deck-axis/` — no tocar desde acá.

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

**Rollout pendiente — promover `develop` → `main`.** Corregido: NO hay una migración
pendiente por entorno; hay UNA sola base (`greenhouse_app`) compartida por dev/staging/prod
y el viewCode ya está sembrado. Lo que falta es la promoción, y **no es cosmética**:
`syncViewRegistryCatalog` apaga todo viewCode ausente del catálogo TS del código EN
EJECUCIÓN, así que mientras 1306 viva sólo en `develop`, producción **apaga
`administracion.growth_seo` en cada sincronización** (ya pasó una vez; se reactivó a mano,
pero la reactivación manual se revierte sola). Queda registrado como checkbox de cierre en
`TASK-1307` (§Pendiente heredado) — si 1307 se demora o se cancela, sacar la promoción
igual, por su cuenta.

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

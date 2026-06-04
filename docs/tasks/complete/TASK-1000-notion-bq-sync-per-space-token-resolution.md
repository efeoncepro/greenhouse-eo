# TASK-1000 — notion-bq-sync: resolver token Notion POR space (per-space token)

## Delta 2026-06-04 — DESBLOQUEADA + CERRADA (TASK-1003 cutover live)

- TASK-1003 ejecutó el cutover al endpoint canónico `/v1/data_sources/{id}/query` + `2026-03-11` (revisión `00021-wkl`, flag ON). Paridad total Efeonce/Sky verde.
- **Berel re-habilitado (`sync_enabled=TRUE`) y SINCRONIZA nativo** por el endpoint nuevo + su token scoped: 3/3 tables, tareas 80 / proyectos 4 / sprints 0, 0 errores. Log `Loaded 1 per-client space config(s) from PG SSOT` (per-space PG OK). El 404 previo resuelto.
- Per-space token verificado end-to-end: el contextvar `_CURRENT_NOTION_TOKEN` + resolución desde Secret Manager funcionan en runtime para Berel.
- **Pendiente NO bloqueante:** conformed downstream para Berel (propiedades custom → template L1, Out of Scope de TASK-1000/1003).
- Lifecycle → `complete`. Evidencia: progress log de `complete/TASK-1003-*.md` (Slice 3).

## Delta 2026-06-03 — infra desplegada y verificada; BLOQUEADA por TASK-1003

- **Infra per-space token DESPLEGADA + VERIFICADA** en Cloud Run `notion-bq-sync` (us-central1, revisión `00019-fgp`):
  - IAM al SA `183008134038-compute@`: `roles/cloudsql.client` + `secretAccessor` en `notion-integration-token-greenhouse-grupo-berel` + `greenhouse-pg-dev-app-password`.
  - Deploy del código TASK-1000 (repo hermano `main` `5a6766c`, PRs #2/#3). **Bug resuelto:** el tráfico estaba pinneado a `00017-pct` (vieja) → `update-traffic --to-latest`.
  - Env: `NOTION_PER_SPACE_TOKEN_ENABLED=true` + `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME/DB/USER` + secret `GREENHOUSE_POSTGRES_PASSWORD`.
  - **PG conecta** (`Loaded 0/1 per-client space config(s) from PG SSOT`), **Efeonce/Sky sincronizan OK** (full sync 0 errores), **degrade-to-today confirmado**.
- **BLOQUEADA por TASK-1003:** con Berel `sync_enabled=TRUE` el sync dio **404** porque usa el endpoint **deprecado** `/v1/databases/{id}/query` y Berel tiene **data_source ids** (modelo 2026). El token/PG/IAM están OK; el bloqueador es el endpoint/id-type. → migración en `TASK-1003`.
- **Berel revertido a `sync_enabled=FALSE`** (estado seguro, cliente nuevo sin data).
- **Cerrar esta task SOLO cuando TASK-1003 pase paridad + Berel sincronice nativo.**
- Evidencia completa: `docs/audits/notion/NOTION_BQ_SYNC_PER_SPACE_TOKEN_ROLLOUT_AND_DEPRECATED_API_AUDIT_2026-06-03.md`.

## Status

- Lifecycle: `complete`
- Blocked by: `none` (TASK-1003 cutover live 2026-06-04 — Berel sincroniza nativo)
- Priority: `P1`
- Impact: `Alto` (sin esto, los clientes nuevos conectados por TASK-998 NO sincronizan a diario)
- Effort: `Medio` — pero **cross-repo + deploy-sensitive** (delicado)
- Type: `cross-repo + infra`
- Epic: `EPIC-CLIENT-360`
- Derived from: `TASK-998` (token-por-teamspace)
- Domain: `integrations.notion` · `cross-repo` · `infra`
- **Repo target**: `efeoncepro/notion-bigquery` (Cloud Run `notion-bq-sync`), NO este repo.

## Why This Task Exists

TASK-998 estableció el modelo canónico **token Notion POR teamspace** (el token ES el scope):
cada cliente nuevo se conecta con su propia integración Notion scoped, cuyo token se guarda en
GCP Secret Manager y se referencia en `greenhouse_core.space_notion_sources.notion_token_secret_ref`.
El onboarding ya escribe ese registro (`sync_enabled=FALSE`).

**Pero el pipeline de sync diario (`notion-bq-sync`, Cloud Run, repo hermano) usa un ÚNICO token
compartido (`notion-token`)** — que NO tiene acceso a los teamspaces de clientes nuevos (da 404).
Hasta que el pipeline resuelva el token POR space, los clientes nuevos quedan registrados pero NO
sincronizan. Por eso TASK-998 deja `sync_enabled=FALSE` para esos spaces (evita que el pipeline
legacy los toque con el token equivocado).

## Scope

En `efeoncepro/notion-bigquery`:

1. **Leer `space_notion_sources.notion_token_secret_ref` por space**. Cuando esté poblado, resolver
   ese secret de GCP Secret Manager como token de la integración para ese space. Cuando sea NULL,
   usar el `notion-token` compartido legacy (Efeonce/Sky) — back-compat.
2. **Resolver el token por space en el ciclo de discover + extract** (cada space usa su propio token
   scoped → ve solo sus DBs). NO mezclar tokens entre spaces.
3. **Flipear `sync_enabled=TRUE`** para el space del cliente una vez verificado que el pipeline lo
   lee correctamente (o un endpoint/manual gated que lo active tras smoke).
4. **Smoke con Berel** (token `notion-integration-token-greenhouse-berel` ya en Secret Manager):
   verificar que el pipeline extrae las 3 DBs de Berel con su token scoped → BQ → PG.

## Hard Rules (cross-repo safety — CLAUDE.md)

- **NUNCA** commitear a `notion-bigquery` sin (a) confirmar relevancia, (b) chequear el estado del
  último deploy/CI del repo target, (c) decisión explícita del operador si tiene auto-deploy productivo.
- **NUNCA** agregar el teamspace de un cliente nuevo a la integración compartida `notion-token`
  "para que el pipeline lo vea". El pipeline DEBE resolver el token per-space.
- **NUNCA** loggear el token resuelto. Resolver vía Secret Manager, usar una vez.
- **SIEMPRE** preservar el path legacy (NULL ref → `notion-token` compartido) para Efeonce/Sky.
- **SIEMPRE** smoke con Berel antes de flipear `sync_enabled=TRUE` para cualquier cliente.

## References

- Modelo canónico: CLAUDE.md "Notion teamspace linking — token POR teamspace (TASK-998)".
- Columna: `greenhouse_core.space_notion_sources.notion_token_secret_ref` (migración `20260603130532475`).
- Secret de ejemplo: `notion-integration-token-greenhouse-berel` (Berel, ya provisionado).
- Skill: `notion-platform/greenhouse-runtime/teamspace-linking-per-client-token.md`.
- Spec TASK-998: `docs/tasks/to-do/TASK-998-notion-teams-teamspace-linking-discover-register.md`.

---

# DECISIÓN ARQUITECTÓNICA + DISEÑO DE SEGURIDAD (canonizado 2026-06-03)

> **Skills aplicadas**: arch-architect (SSOT, reversibilidad/blast-radius, defense-in-depth, boring-tech) + notion-platform (5-pillar, token-per-teamspace canónico, Pillar 5 reversibility). Decisión tomada con el operador (Julio). Este bloque ES el ADR de la task (contrato para una futura absorción TASK-577).

## Discovery verificada (read-only, 2026-06-03)

Hechos confirmados en `../notion-bigquery` (clonado local) + PG + GCP + BQ:

1. **El sibling es Python** (`main.py`, Flask + Cloud Run), marcado **"Deprecated — Maintenance only post-transfer to efeoncepro"** (commit `c0a6b48`). Deploy vía `deploy.sh` (manual, **NO auto-deploy en push** → bajo riesgo de "commit dispara prod").
2. **Token global único**: `NOTION_TOKEN = os.environ.get("NOTION_TOKEN")` (línea 48), usado en el header `Authorization: Bearer {NOTION_TOKEN}` (línea 228). No resuelve secrets de Secret Manager (solo lee env).
3. **Carga de spaces desde BQ** (no PG): `load_space_configs()` (línea 149) hace `SELECT ... FROM efeonce-group.greenhouse.space_notion_sources WHERE sync_enabled = TRUE`. Esa tabla BQ es **legacy: greenhouse-eo ya NO la escribe** (grep `MERGE/INSERT` repo-wide = vacío). El sibling solo le hace `update_last_synced` (UPDATE de `last_synced_at`).
4. **El loop de sync YA está aislado por space** (líneas 1698-1740): cada space corre en su propio `try/except` (`"Space {sid} failed entirely"` → log + continue). **Un cliente que falla NO afecta a los demás.** Esto es load-bearing para la seguridad.
5. **El SSOT es PG**: `greenhouse_core.space_notion_sources.notion_token_secret_ref` (migración `20260603130532475`, TASK-998). Estado actual PG: 3 spaces (Efeonce `spc-c0cf6478`, Sky `spc-ae463d9f`, demo `spc-8641519f` sync off), **todos con `notion_token_secret_ref = NULL`** (legacy compartido). **Berel NO tiene fila** en `space_notion_sources` todavía (su fila la crea el wizard de TASK-992 al darlo de alta — ver más abajo).
6. **El mirror BQ NO tiene la columna `notion_token_secret_ref`** (schema solo `space_id`, `notion_workspace_id`, `sync_enabled`, …).
7. **El secret de Berel ya existe** en Secret Manager: `notion-integration-token-greenhouse-berel`.
8. **El wizard YA crea el Space + escribe `space_notion_sources`** desde el intent (composer `provision-client-from-wizard.ts` líneas 207-258, `writeSpaceNotionSourcesFromIntent`, `sync_enabled=FALSE`, ref set). La nota de TASK-998 sobre "el composer no crea Space" está **desactualizada**. → **Berel se da de alta por el wizard (validación del operador); yo NO pre-creo su fila.**

## Decisión: **Y — el sync lee el SSOT (PG), implementación ADITIVA y segura**

El `notion_token_secret_ref` vive en PG (SSOT). El sync debe resolver el token leyendo la fuente autoritativa, **NO** una copia legacy en BQ.

### Alternativas rechazadas
- **X (replicar el ref a BQ)** — crea una 2ª copia de una columna de gobernanza en una tabla legacy que nadie más escribe → drift PG↔BQ (viola SSOT), extiende deuda en servicio Deprecated, descartable bajo TASK-577. "Construir sobre arena."
- **Z (folding en TASK-577 ahora)** — end-state correcto (sync nace en monorepo leyendo PG), pero esfuerzo mayor que **demora el sync de Berel/ANAM** semanas y duplica superficie operativa (dos syncs en paralelo). Queda como destino; Y es el puente.
- **Híbrido "empezar Z ahora"** — analizado y rechazado: el sibling es Python y Z es TS → **no comparten código, solo diseño**. El motor caro (pull Notion + normalización + BQ) se reescribe en Z **igual**; Y no lo toca ni agrega a ese costo. El único "tirable" de Y es ~decenas de líneas de pegamento Python. Un híbrido adelanta la parte cara para ahorrar la barata = falsa economía. **Lo que SÍ se hace: Y + canonizar el contrato (este ADR)** → Z reimplementa el diseño textual, cero retrabajo de diseño.

### Por qué Y (insight)
Las 3 opciones obligan al sibling a ganar **resolución de secrets de Secret Manager** (hoy solo lee env) — inevitable para token-per-space. Dado eso, Y agrega además un read a PG (Cloud SQL Python Connector — patrón acotado, query chica) pero **elimina** el drift de replica y **greenhouse-eo NO necesita ningún cambio** (el ref ya está en PG, el wizard ya lo escribe). Y es stepping-stone de Z (la lógica PG-read + per-space-token porta como diseño).

## Diseño de seguridad — "no puede romper Efeonce/Sky por construcción"

Miedo del operador (legítimo): el flujo Notion→BQ alimenta métricas operativas y **bonos** aguas abajo; romperlo = altísimo riesgo. Mitigación por diseño:

1. **ADITIVO**: NO se toca cómo se cargan Efeonce/Sky. El código nuevo **solo agrega** los spaces de clientes nuevos (ref non-NULL). El path legacy queda byte-for-byte.
2. **Degrada a "hoy"**: el load se envuelve así → `configs = load_legacy_configs()` (probado); `try: configs += load_per_client_configs_from_pg() except: log + seguir solo con legacy`. **Cualquier fallo del código nuevo → comportamiento idéntico al actual.**
3. **Llave compartida intacta**: Efeonce/Sky (ref NULL) → `NOTION_TOKEN` de siempre, mismo código.
4. **Aislamiento per-space YA existe** (líneas 1698-1740) → un cliente nuevo que falla no toca a Efeonce/Sky.
5. **Interruptor (env flag) apagado por default** (`NOTION_PER_SPACE_TOKEN_ENABLED=false`) → deploy corre 100% como hoy; se prende solo cuando esté validado. Revert = apagar, segundos, sin re-deploy.
6. **Compuerta `sync_enabled=FALSE`**: Berel nace dark; el loop solo procesa `sync_enabled=TRUE`. Se prende al final, post-smoke.
7. **Deploy manual** (`deploy.sh`) → control del minuto exacto. **Staging primero** si existe.
8. **Detección**: señales de frescura existentes (`notion-sync-freshness`, `source_sync_runs`, `notion-delivery-data-quality`) alertan si Efeonce/Sky se quedan stale.

**Peor caso posible del código nuevo = "el robot sincroniza solo Efeonce/Sky, igual que hoy"** → datos idénticos → bonos intactos. Para romper bonos, el código nuevo tendría que tocar el path compartido, y por construcción NO lo toca.

### 4-Pillar Score (Y)
- **Safety** ✅ — blast radius per-cliente = 1 (TASK-998). Legacy intacto. Token crudo nunca a PG/logs (se resuelve del `*_SECRET_REF`). Interruptor + `sync_enabled` gate.
- **Robustness** ✅ — lee SSOT (cero drift). Per-space try/catch (ya existe) + degrada-a-legacy. Idempotente (sync diario).
- **Resilience** ✅ — deploy manual, revert por flag <5min, alarmas de frescura existentes.
- **Scalability** ✅ — N clientes = N secrets resueltos per-space (cache por corrida); 1 query PG chica.

## Dependencies & Impact
- **Sibling SA** necesita (net-new): `roles/cloudsql.client` + user PG read-only sobre `greenhouse_core.space_notion_sources` + `secretAccessor` sobre `notion-integration-token-greenhouse-*`. Es el costo real de Y, acotado.
- **Deps Python nuevas**: `cloud-sql-python-connector` (+ `pg8000`) + `google-cloud-secret-manager`.
- **greenhouse-eo**: cero cambios de código. (El ref ya está en PG; el wizard ya lo escribe.)
- **Operador**: da de alta a Berel por el wizard (su validación) → fila PG con ref + `sync_enabled=FALSE`. Luego: smoke conjunto + flip.
- **Verificar**: red/VPC del Cloud Run del sibling para alcanzar Cloud SQL vía connector.

## Hard rules (anti-regresión)
- **NUNCA** replicar `notion_token_secret_ref` a una tabla BQ. SSOT = PG; el sync lee PG.
- **NUNCA** modificar el path de carga/token de Efeonce/Sky (ref NULL → `NOTION_TOKEN` compartido). El código nuevo es ADITIVO.
- **NUNCA** dejar que un fallo del código nuevo afecte el sync legacy → siempre degradar a "solo legacy".
- **NUNCA** dejar que un token per-cliente fallido rompa el batch (per-space try/catch — ya existe, preservarlo).
- **SIEMPRE** resolver el token per-cliente vía Secret Manager desde `notion_token_secret_ref`; nunca el token crudo a PG/logs.
- **SIEMPRE** deployar con `NOTION_PER_SPACE_TOKEN_ENABLED=false` y verificar Efeonce/Sky intactos antes de prender.
- **SIEMPRE** el flip `sync_enabled=TRUE` de un cliente es el gate final, post-smoke con evidencia.

## Roadmap (slices) — orden de rollout seguro
- **Slice 0 — Docs/ADR** (este bloque) + mover task a in-progress. [HECHO]
- **Slice 1 — IAM + deps** (sibling): SA grants (Cloud SQL Client + secretAccessor) + `cloud-sql-connector` + `secret-manager`. Sin lógica. Verificar VPC→Cloud SQL.
- **Slice 2 — Carga aditiva** (sibling): `load_per_client_configs_from_pg()` (ref non-NULL, `sync_enabled=TRUE`) + merge con legacy + degrada-a-legacy. Gated `NOTION_PER_SPACE_TOKEN_ENABLED=false`.
- **Slice 3 — Per-space token**: ref non-NULL → resolver secret → header per-space; NULL → `NOTION_TOKEN` global. Per-space try/catch preservado.
- **Slice 4 — Deploy con flag OFF** → verificar Efeonce/Sky idénticos (checklist + alarmas verdes). Staging si existe.
- **Slice 5 — Smoke Berel**: tras alta por wizard (fila + ref), `sync_enabled` aún FALSE → probar con `?space_id=<berel>` / flag ON acotado → `/discover`+extract con su token scoped.
- **Slice 6 — Flip `sync_enabled=TRUE`** para Berel → observar.

## Open questions (no decididas)
- Red/VPC del Cloud Run del sibling para Cloud SQL connector (igual que greenhouse-eo).
- Usuario/rol PG read-only que usa el sibling.
- Timeline de TASK-577 (si Z está cerca, Y es el puente; si no, Y entrega valor ya).
- ¿Tiene el sibling ambiente de staging? (revisar `deploy.sh`).

## Checklist "Efeonce/Sky intactos" (verificar post-deploy flag OFF y tras cada flip)
- [ ] `/health` del sibling: `spaces` y `space_ids` incluyen Efeonce + Sky con `sync_enabled=TRUE`.
- [ ] Una corrida de sync: `space_results` para Efeonce/Sky con `tables_ok > 0`, `tables_error = 0`.
- [ ] `notion-sync-freshness` / `source_sync_runs` en verde para Efeonce/Sky.
- [ ] BQ raw de Efeonce/Sky con `last_synced_at` reciente (sin regresión).
- [ ] Sin nuevos errores en logs del Cloud Run atribuibles al código nuevo para spaces legacy.

---

# PROGRESS LOG (actualizar a medida que se avanza — anti-pérdida-por-compactación)

- **2026-06-03 — Slice 0 (docs/ADR) HECHO.** Discovery read-only completa (8 hechos arriba). Decisión Y canonizada con el operador. Task movida to-do→in-progress.
- **2026-06-03 — Slices 2-3 (código) HECHO + Slice 1 (deps) parcial.** En el sibling `../notion-bigquery`, rama **`task/TASK-1000-per-space-token`** pusheada (NO a `main`, NO auto-deploya). `main.py` compila (py_compile ✓):
  - Flag `NOTION_PER_SPACE_TOKEN_ENABLED` (default OFF) + env PG (instance/db/IAM user) + proyecto Secret Manager.
  - contextvar `_CURRENT_NOTION_TOKEN` + `_notion_headers()` lee token del space actual o global (paths legacy sin cambio).
  - `load_per_client_space_configs_from_pg()` (SSOT PG, ref non-NULL, sync on; degrada a `[]`) + `load_all_space_configs()` (aditivo: legacy BQ + per-cliente; degrada-a-hoy). Ambos call-sites (`/health` + sync) usan el loader merged.
  - `_resolve_notion_token_for_space()` (Secret Manager; bare/`:version`/full path; lanza si falla → loop salta ESE space).
  - Loop: set/reset contextvar por space + skip-on-failure; aislamiento per-space preservado.
  - Imports secret-manager/connector **lazy** (verificado: 0 module-level) → bootea sin deps con flag OFF.
  - **Fix de Discovery live (post-auth gcloud)**: `space_notion_sources` NO tiene `client_id` (verificado en PG) → query usa `LEFT JOIN greenhouse_core.spaces` para el client_id.
  - `requirements.txt`: +`google-cloud-secret-manager`, +`cloud-sql-python-connector[pg8000]`, +`pg8000` (solo con flag ON).
  - **No-regresión**: con flag OFF, `load_all_space_configs()` = `load_space_configs()` (BQ legacy) + `[]` → byte-for-byte hoy. Tests del sibling (`test_normalize_prop_key.py`) ajenos al cambio (corren en su CI; pytest no local).
  - **Pendiente (gated, prod — NO sin OK del operador)**: Slice 1 IAM (SA del sibling: `roles/cloudsql.client` + usuario PG IAM read-only `greenhouse_core.space_notion_sources`+`spaces` + `secretAccessor` sobre `notion-integration-token-greenhouse-*`); env vars en el Cloud Run (`NOTION_PER_SPACE_TOKEN_ENABLED`, `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME`, `_DB`, `_IAM_USER`, `SECRET_MANAGER_PROJECT`); Slice 4 deploy (flag OFF → verificar checklist Efeonce/Sky); Slice 5 smoke Berel (tras alta por wizard); Slice 6 flip `sync_enabled`.
- **2026-06-03 — Review + findings aplicados.** PR `efeoncepro/notion-bigquery#2` abierto con `@claude` mencionado; **Claude no respondió** (app no instalado en el sibling — timeline registra el mention pero 0 reacción). **Copilot reviewer** (auto-trigger del repo) dejó 2 findings válidos, ambos aplicados (commit `9cc820e`): (1) `connect()` con timeout explícito (`GREENHOUSE_POSTGRES_CONNECT_TIMEOUT_SECONDS`, default 10s) → PG inalcanzable falla rápido y degrada a legacy en vez de colgar el sync (refuerza degrada-a-hoy); (2) `SecretManagerServiceClient` cacheado por proceso (lazy singleton) en vez de uno por space. py_compile ✓. Si se quiere review de Claude, instalar su GitHub App en el sibling y re-disparar `@claude`.
- **2026-06-03 — PR #2 mergeado + corrección de auth method (PR #3 mergeado).** Ambos en `main` del sibling (flag OFF, dormido, **sin deploy** → cero prod impact). **Hallazgo crítico (read-only) que cambió el approach**: el Cloud SQL `greenhouse-pg-dev` **NO tiene `cloudsql.iam_authentication`** habilitado y habilitarlo **reiniciaría la DB productiva** (Efeonce/Sky + todo greenhouse-eo) → mi código original (`enable_iam_auth=True`) era inviable sin downtime. **Corregido a password auth** (espejo de greenhouse-eo: `connect(user, password, db, timeout)`, password como secret env). Footprint GCP descubierto: sibling = **Cloud Run** `notion-bq-sync` (us-central1), SA = `183008134038-compute@developer.gserviceaccount.com`. Config canónica: instance `efeonce-group:us-east4:greenhouse-pg-dev`, user `greenhouse_app`, db `greenhouse_app`, secret password `greenhouse-pg-dev-app-password`.
- **2026-06-03 — LÍMITE REAL de "funcione": Berel.** El rollout de prod (deploy + grants + flag ON) **solo se puede validar end-to-end con la fila `space_notion_sources` de Berel** (ref non-NULL + `sync_enabled`). Hoy Berel NO tiene fila (la crea el **wizard de onboarding** = validación del operador). Con flag ON pero sin fila de Berel, `load_per_client_space_configs_from_pg()` devuelve `[]` → no hay nada que validar. Por eso deploy+IAM ANTES de Berel es **no verificable** para el feature. **Decisión**: hacer deploy + secretAccessor grants + env + flag ON + smoke Berel como UN solo rollout verificable, cuando exista la fila de Berel. NO se pre-crea la fila de Berel (preserva la validación del wizard del operador, condición explícita previa). NO se hace deploy/IAM no-verificable ni se reinicia el instance.
  - **Pendiente exacto del rollout (un solo paso coordinado, gated)**: (1) operador da de alta a Berel por el wizard → fila PG con ref + `sync_enabled`; (2) grants a la SA `183008134038-compute@`: `roles/cloudsql.client` + `secretAccessor` sobre `greenhouse-pg-dev-app-password` + `notion-integration-token-greenhouse-*`; (3) deploy del Cloud Run con env (`NOTION_PER_SPACE_TOKEN_ENABLED=true`, `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME=efeonce-group:us-east4:greenhouse-pg-dev`, `_USER=greenhouse_app`, `_DB=greenhouse_app`) + secret env `GREENHOUSE_POSTGRES_PASSWORD=greenhouse-pg-dev-app-password:latest`; (4) smoke Berel (`?space_id=<berel>`) + verificar checklist Efeonce/Sky intactos; (5) confirmar `sync_enabled` de Berel y observar. Hardening follow-up: usuario PG read-only dedicado en vez de `greenhouse_app` (least-privilege).
<!-- nuevas entradas acá, formato: fecha — slice — qué se hizo — qué falta -->


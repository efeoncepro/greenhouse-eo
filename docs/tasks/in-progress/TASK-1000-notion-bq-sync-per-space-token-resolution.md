# TASK-1000 — notion-bq-sync: resolver token Notion POR space (per-space token)

## Status

- Lifecycle: `in-progress`
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

- **2026-06-03 — Slice 0 (docs/ADR) HECHO.** Discovery read-only completa (8 hechos arriba). Decisión Y canonizada con el operador. Task movida to-do→in-progress. **Pendiente**: confirmar con el operador antes de tocar el sibling (cross-repo, sync productivo). Próximo: Slice 1 (IAM + deps) — empezar por lo reversible.
<!-- nuevas entradas acá, formato: fecha — slice — qué se hizo — qué falta -->


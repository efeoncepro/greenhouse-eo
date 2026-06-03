# TASK-1000 — notion-bq-sync: resolver token Notion POR space (per-space token)

## Status

- Lifecycle: `to-do`
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

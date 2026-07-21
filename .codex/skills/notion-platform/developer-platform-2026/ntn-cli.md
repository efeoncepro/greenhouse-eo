# ntn CLI — canonical reference

> **Status**: GA en todos los planes (May 13, 2026)
> **Install**: `curl -fsSL https://ntn.dev | bash`
> **Source**: https://www.notion.com/releases/2026-05-13
> **Last verified**: 2026-05-17

## 1. Qué es ntn

`ntn` es el **CLI oficial de Notion** (read "Notion in your terminal"). Es el **único path** para deploy Workers — no hay UI deploy.

> "Built for devs and coding agents. Sign in, read/write Notion data, build/deploy Workers, extend workspace."

## 2. Install

```bash
curl -fsSL https://ntn.dev | bash
ntn --version
```

⚠️ Antes de correr `curl | bash` de cualquier source, **leer el script** si paranoid. Para Greenhouse productivo, considerar pin de versión + checksum en setup docs.

## 3. Comandos canonical (al 2026-05-17)

### Auth
```bash
ntn login              # OAuth-style login, almacena PAT en local config
ntn logout             # Clear local auth
ntn whoami             # Inspect current user identity
```

### Workspace operations
```bash
ntn pages list                                # List accessible pages
ntn pages get <page-id>                       # Get page metadata
ntn pages create --parent <id> --title "..."  # Create page
ntn pages update <page-id> --property ...     # Update property

ntn databases list                            # List accessible databases
ntn data-sources list                         # List data sources (canonical)
ntn data-sources query <id> --filter ...      # Query data source

ntn users list                                # List workspace users
ntn users me                                  # Self introspection
```

### Workers
```bash
ntn workers init                              # Bootstrap from template
ntn workers deploy                            # Deploy current dir as Worker
ntn workers list                              # List deployed Workers
ntn workers logs <worker-name>                # Tail logs
ntn workers run <worker-name>                 # Trigger manually
ntn workers delete <worker-name>              # Remove
```

### Misc
```bash
ntn search "<query>"                          # Global search
ntn help [command]                            # Command-specific help
```

⚠️ **Comandos exactos pueden evolucionar** — Notion shipping pace ~mensual. Siempre `ntn --help` para verificar latest.

## 4. Auth — cómo funciona

`ntn login` ejecuta un OAuth-like flow:
1. Abre browser a Notion auth page
2. User autoriza el CLI
3. Notion redirect callback → CLI captura **PAT** (Personal Access Token)
4. PAT almacenado en local config (`~/.notion/config.json` o similar)
5. Subsequent CLI commands usan el PAT en `Authorization: Bearer`

⚠️ Implicación: el `ntn` PAT es **user-scoped** — acciones aparecen en audit log como el user. Para deploy productivo de Workers compartidos, mejor:
- Usar machine PAT dedicado (creado por owner) almacenado en GCP Secret Manager
- CI/CD pipeline injeca PAT via env var
- NUNCA usar PAT personal de developer en deploy productivo

## 5. workers.json local state

`ntn workers init` crea `workers.json` con metadata del Worker local. Este archivo:
- Suele estar `.gitignore`d (state local, no portable)
- Contiene worker_id + workspace_id + deployment metadata
- **NO** committearlo si contiene secrets o IDs que no quieres expuestos

## 6. Use cases canonical Greenhouse

### Caso 1 — Discovery / exploration (V1 OK)
Agente o operador ejecuta `ntn data-sources query <id>` para investigar shape de data Notion antes de comprometer code. **Path manual, fail-soft.**

```bash
# Investigar Sky Tasks DB shape
ntn data-sources query 23039c2f-efe7-81f8-af2d-000b67594d18 --page-size 5
```

### Caso 2 — Backup / snapshot manual
Operador exporta state de un teamspace antes de cambio mayor:
```bash
ntn pages list --teamspace 36339c2f-efe7-814c-a0f5-0042863dbb5a > demo-snapshot.json
```

### Caso 3 — Worker deploy productivo (V2+, NO V1)
Cuando Workers salgan de Beta y decidimos productivizar, CI/CD ejecutaría:
```bash
ntn workers deploy --token $NOTION_MACHINE_PAT
```

Hoy esto NO es canonical Greenhouse.

## 7. Hard rules canonical

- **NUNCA** commitees el PAT del `ntn` config local al repo
- **NUNCA** uses tu PAT personal para deploy productivo — usa machine PAT dedicado
- **NUNCA** corras `ntn workers delete` sin verify-then-delete pattern
- **SIEMPRE** documenta versión de `ntn` instalada en runbook si emerge dependency operativa
- **PREFER** Notion MCP tools (mcp__claude_ai_Notion__*) sobre `ntn` cuando un agente puede invocar API directamente — menos paths

## 8. Cross-refs

- `developer-platform-2026/workers-canonical.md` — Workers runtime
- `sdks-and-clients/notion-mcp-server.md` — alternativa canonical para agentes
- `api-reference/auth-and-tokens.md` — PAT vs internal integration token
- TASK-879 (Greenhouse) — `ntn` setup en sandbox sin writes productivos

# Notion API — Auth & Tokens

> **Source canonical**: https://developers.notion.com/reference/intro + May 12, 2026 PAT launch
> **Last verified**: 2026-05-17

## 1. Tipos de tokens disponibles

Notion soporta **3 modalidades canonicales** de autenticación en May 2026:

| Tipo | Scope | Cuándo usar |
|---|---|---|
| **Internal Integration Token** | Workspace único, bot identity | Path productivo automatizado (cron, webhooks, sync) |
| **OAuth Access Token** (Public integration) | Multi-workspace, per-user OAuth | Productos SaaS multi-tenant donde users instalan |
| **Personal Access Token (PAT)** | User-scoped (carga tu identidad personal) | Scripts ad-hoc, CLI workflows, Workers, trusted tools |

### Reglas duras canonical

- **NUNCA** uses PAT en path productivo automatizado de Greenhouse — PAT carga la identidad del user que lo creó, contamina audit log Notion y se revoca si el user sale de la org.
- **SIEMPRE** usa Internal Integration Token para producción → bot identity estable, audit log limpio.
- **SIEMPRE** almacena tokens en GCP Secret Manager (`notion-integration-token-greenhouse-metrics`, etc.) — nunca en `.env` committed ni en código.

## 2. Header canónico de autenticación

```http
Authorization: Bearer <token>
Notion-Version: 2026-03-11
Content-Type: application/json
```

**Crítico**: `Notion-Version` es **obligatorio** en TODO request. Sin él, Notion responde 400. Ver `developer-platform-2026/notion-version-history.md` para policy de bump.

## 3. PAT (Personal Access Tokens) — May 12, 2026

Lanzado el 12 mayo 2026 como parte del nuevo **Developer Portal** (`https://www.notion.so/developers`).

### Características
- User-scoped — carga permisos del user que lo crea
- Visible en Developer Portal
- Workspace admins pueden revocar
- Configuración de creación per plan:

| Plan | Quién puede crear PAT |
|---|---|
| Free | Solo owners |
| Plus | Todos los members |
| Business | Solo owners |
| Enterprise | Owners + selected groups |

### Uso recomendado
- **Workers locales** (deploy via `ntn`)
- **Scripts de discovery / one-shot exploration**
- **CLI workflows manuales de operador**

### Anti-uso
- **NO** path productivo bonus payroll
- **NO** webhook handler runtime
- **NO** sync productivo cron

## 4. Internal Integration Token — productivo Greenhouse

### Cómo se crea (one-time setup)
1. Settings → Connections → Develop or manage integrations
2. New integration → tipo "Internal"
3. Configurar capabilities (read content, update content, etc.)
4. Asociar al workspace
5. Compartir páginas/databases relevantes con la integration
6. Copiar secret → GCP Secret Manager

### Capabilities scopes (granular)
| Capability | Permite |
|---|---|
| Read content | GET /v1/pages, /v1/blocks, /v1/databases query |
| Update content | PATCH /v1/pages, /v1/blocks |
| Insert content | POST /v1/pages, /v1/blocks/children |
| Read user info | GET /v1/users |
| Read user emails | GET /v1/users (con email field) |
| Comments — read | GET /v1/comments |
| Comments — insert/update/delete | POST/PATCH/DELETE /v1/comments |

**Regla canonical Greenhouse**: la integration de metrics writeback (TASK-901) solo necesita `Read content` + `Update content`. NO insert, NO read user emails, NO comments. Principio least privilege.

## 5. OAuth Public Integration — futuro multi-workspace

NO usado en Greenhouse V1 (single workspace per tenant operativo). Documentación canónica si emerge:
- Authorization Code grant flow
- Redirect URI registration
- `code` → `access_token` exchange en `/v1/oauth/token`
- Refresh token NO existe en Notion (tokens son long-lived hasta revoke)
- Workspace-scoped OAuth nuevo desde May 13, 2026 (Developer Platform launch)

## 6. Token resolution canonical en Greenhouse

```typescript
// src/lib/notion-client/resolve-token.ts (TBD)
import { resolveSecret } from '@/lib/secrets/secret-manager'

export const resolveNotionToken = async (purpose: 'metrics_writeback' | 'sync_conformed' | 'demo') => {
  const secretRef = {
    metrics_writeback: process.env.NOTION_METRICS_TOKEN_SECRET_REF,
    sync_conformed:    process.env.NOTION_SYNC_TOKEN_SECRET_REF,
    demo:              process.env.NOTION_DEMO_TOKEN_SECRET_REF
  }[purpose]

  if (!secretRef) throw new Error(`No token ref for purpose=${purpose}`)
  return resolveSecret(secretRef)
}
```

**Pattern canonical** (mirror CLAUDE.md "Secret Manager Hygiene"):
- Variable `*_SECRET_REF` con shape `<name>` (bare, default `latest`) o `<name>:<version>`
- NUNCA inline `projects/.../secrets/...` composition
- NUNCA store token plaintext en `.env` o committed
- Rotation via `printf %s "<token>" | gcloud secrets versions add ...`

## 7. Anti-patterns canonical

| Anti-pattern | Por qué prohibido | Pattern canonical |
|---|---|---|
| Token hardcoded en TS | Leak garantizado, no rotación | `resolveSecret(secretRef)` |
| PAT en runtime productivo | User-scoped contamina audit | Internal Integration Token |
| Token sin `Notion-Version` | 400 garantizado | Header explícito |
| Multiple integrations sin necesidad | Audit log fragmentado | 1 integration por dominio operativo |
| Token compartido entre prod + demo | Cross-contamination secrets | Tokens separados (`-metrics`, `-demo`) |

## 8. Verificar token activo

```bash
curl https://api.notion.com/v1/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Notion-Version: 2026-03-11"
```

Response 200 con shape `{ object: "user", type: "bot", bot: { workspace_name: "..." } }` confirma token activo + workspace target.

## 9. Cross-refs canonical

- `developer-platform-2026/ntn-cli.md` — CLI usa PATs por default
- `decision-frameworks/pat-vs-integration-token.md` (stub) — matriz de decisión
- `greenhouse-runtime/tenant-config.md` — tokens per tenant (Efeonce, Sky, Demo)
- `patterns-canonical/hmac-validation.md` — webhooks usan signing_secret distinto del token
- CLAUDE.md § "Secret Manager Hygiene" — pattern canonical de rotación

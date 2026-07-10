# ISSUE-118 — Los readers del watchdog usan un resolver PAT-only e ignoran el GitHub App

- **Estado:** `open`
- **Detectado:** 2026-07-10, durante el release `4e7e9093d` (TASK-1362)
- **Ambiente:** local + Vercel (no afecta GitHub Actions)
- **Severidad:** media — degradación honesta, sin pérdida de datos; pero deja al operador ciego al drift
- **Dominio:** `platform` / release control plane

## Síntoma

`pnpm release:watchdog --json` reporta los tres signals en `severity='unknown'`:

```
unknown  platform.release.stale_approval
unknown  platform.release.pending_without_jobs
unknown  platform.release.worker_revision_drift
         → "Sin GITHUB_RELEASE_OBSERVER_TOKEN configurado. Reader degradado."
```

Esto ocurre **aunque el GitHub App esté correctamente configurado**.

## Causa raíz

El resolver canónico documentado (`docs/operations/runbooks/production-release-watchdog.md` §8.1) describe la
cascada `GitHub App installation token → PAT → unknown`. Esa cascada vive en `resolveGithubToken` (**async**).

Pero los tres readers del watchdog llaman **`resolveGithubTokenSync`** (`src/lib/release/github-helpers.ts:76`):

```ts
export const resolveGithubTokenSync = (): string | null => {
  return process.env.GITHUB_RELEASE_OBSERVER_TOKEN ?? process.env.GITHUB_TOKEN ?? null
}
```

Es **PAT-only**: nunca mintea el installation token del App. El propio docblock lo declara deuda conocida
(*"Una vez que todos los callers migren a `resolveGithubToken` async, este helper deja de ser necesario"*),
pero la migración nunca ocurrió, y el runbook documenta la cascada async como si aplicara a todos los callers.

## Estado real de la configuración (verificado 2026-07-10)

| Pieza | Estado |
|---|---|
| GitHub App `greenhouse-release-watchdog` | Instalado. `app_id=3665723`, `installation_id=131127026` |
| Secreto `greenhouse-github-app-private-key` | Existe en `efeonce-group`, 1 versión `enabled` |
| `GITHUB_APP_ID` + `GITHUB_APP_INSTALLATION_ID` + `GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF` | Presentes en **Vercel Production** desde 2026-05 |
| `GITHUB_RELEASE_OBSERVER_TOKEN` | **No configurado** en ningún environment |

O sea: la infraestructura del camino canónico (least-privilege, 15K req/h, no atado a un usuario) está
completa desde hace ~2 meses y **nadie la usa**, porque el código toma el atajo sync.

## Impacto

- **GitHub Actions:** no afectado. El runner inyecta `GITHUB_TOKEN` automáticamente y el fallback lo toma.
- **Vercel / dashboard de reliability:** los signals degradan a `unknown`.
- **Local:** degradado salvo que el operador exporte `GITHUB_TOKEN` a mano.

Consecuencia operativa: el `worker_revision_drift` —el signal que existe justo para detectar un release
incompleto— es el que queda ciego fuera de CI.

## Solución propuesta

Migrar los tres readers de `resolveGithubTokenSync` a `resolveGithubToken` (async). Los readers ya son `async`,
así que el cambio es mecánico: `await resolveGithubToken()`.

Luego eliminar `resolveGithubTokenSync` (su docblock ya lo pide) para que nadie reintroduzca el atajo.

**NO** resolver esto agregando un PAT (`gh auth token | vercel env add GITHUB_RELEASE_OBSERVER_TOKEN production`):
ataría el watchdog a un usuario concreto, con rate limit 5K/h y expiración, cuando el App least-privilege ya
está provisionado. Sería tapar el síntoma y perder la razón por la que se montó el App.

## Mitigación temporal

Documentada en `docs/operations/runbooks/production-release-watchdog.md` (§`Correr el watchdog en LOCAL`):
el script tampoco carga `.env.local`, así que en local hay que exportar el token del `gh` CLI ya autenticado.

```bash
set -a && source .env.local && set +a
export GITHUB_TOKEN="$(gh auth token)"
pnpm release:watchdog --json
```

Verificado 2026-07-10: con esto los 3 signals dejan de ser `unknown`.

## Relación con TASK-920

Distinto problema, no confundir. TASK-920 repara el **falso positivo** de `worker_revision_drift` (el
`ops-worker` deploy change-gated conserva su `GIT_SHA` viejo aunque el código sea idéntico). Este issue es
que el reader **ni siquiera puede autenticarse** para emitir el signal fuera de CI.

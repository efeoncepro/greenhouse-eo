# Public Site Astro GitHub Control Plane

## Estado

V1 deployed en staging por TASK-1167. Production commands siguen OFF por diseño.

## Para que sirve

El control-plane GitHub del Public Site permite que Greenhouse observe el repo Astro `efeoncepro/efeonce-web` sin abrir GitHub manualmente:

- estado del repo, ramas `main` y `develop`;
- workflow GitHub Actions `CI`;
- runs recientes y resultado del ultimo run en `main`;
- conteo de PRs/issues abiertos;
- release/tag si existe;
- correlacion de commit con el binding reader Astro/Vercel de TASK-1161.

Tambien deja preparado un adapter de comandos gobernados para acciones GitHub Actions acotadas: rerun de un CI fallido y dispatch del workflow `CI` sobre refs allowlisted. Esos comandos nacen default OFF.

## Frontera funcional

Esta capacidad no despliega el sitio, no hace rollback, no cambia DNS y no publica contenido. El deploy/rollback del sitio publico pertenece al rail Vercel y requiere otra task del epic.

Greenhouse debe reportar honestamente el estado real del repo. El 2026-06-17, `efeoncepro/efeonce-web` tiene `CI` rojo en `main`; por eso la signal `public_site.astro_ci_failed` debe verse en `error` hasta que ese repo se corrija.

## Superficies

- Reader admin: `GET /api/admin/public-site/github-control-plane`
- Commands admin: `POST /api/admin/public-site/github-commands`
- Reliability signal: `public_site.astro_ci_failed`
- Arquitectura canonica: `docs/architecture/GREENHOUSE_PUBLIC_SITE_ASTRO_GITHUB_CONTROL_PLANE_V1.md`

## Reglas de uso

- El repo esta fijado server-side como `efeoncepro/efeonce-web`.
- Ningun payload puede elegir owner, repo, method o path GitHub.
- Los commands requieren `Idempotency-Key` y pasan por `executeApiPlatformCommand()`.
- `workflow.dispatch` requiere flag, workflow/ref allowlisted y frase humana.
- Production commands siguen OFF salvo aprobacion explicita.

## Estados esperados

| Estado | Significado |
|---|---|
| Reader `confidence=high` | GitHub respondio repo, workflows y runs; commit correlation disponible. |
| Reader `confidence=none` | Falta token GitHub o GitHub esta inaccesible; no es falso sano. |
| Signal `ok` | Ultimo `CI` en `main` esta `success` y correlaciona. |
| Signal `warning` | CI esta success pero hay mismatch o estado inesperado. |
| Signal `error` | CI fallo/cancelado/timeout/action_required. |
| Command `public_site_github_command_disabled` | Guardrail esperado cuando flags estan OFF. |

## Evidencia staging

Staging verificado el 2026-06-17:

1. deploy `greenhouse-8arcw12v5`, target `staging`, status `Ready`;
2. reader HTTP 200 con repo `efeoncepro/efeonce-web`, workflow `CI`, `confidence=high`;
3. latest main run `27657858751` `completed/failure`, correlation `matched`;
4. command OFF HTTP 409 `public_site_github_command_disabled`;
5. Reliability muestra `public_site.astro_ci_failed` con `severity=error`;
6. no se prendieron commands ni dispatch.

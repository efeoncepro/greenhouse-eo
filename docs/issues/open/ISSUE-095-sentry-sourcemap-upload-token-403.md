# ISSUE-095 — Sentry source-map upload degrada por token sin permisos de release/source maps (`403`)

## Ambiente

staging confirmado; production y preview quedan como riesgo latente si reutilizan un token con el mismo alcance.

## Detectado

2026-06-13, durante la verificacion remota de `ISSUE-093` en Vercel staging.

## Sintoma

Los deployments ya no quedan colgados por el hook de Sentry, pero la subida de source maps falla y degrada con warning:

```text
[sentry-build] Source-map upload failed: ... sentry reported an error:
You do not have permission to perform this action. (http status: 403)
... Continuing deployment.
```

Evidencia:

- `greenhouse-clbkbt7o6` (`develop`, `a9dcb389c`) quedo `Ready` en 7m; el hook `runAfterProductionCompile` completo en 13.686s y continuo tras `403`.
- `greenhouse-qohboe5e0` (`develop`, `4c7329a`) quedo `Ready` en 8m; el dominio `dev-greenhouse.efeoncepro.com` apunto a ese deployment y el hook completo en 14.845s con el mismo `403`.

## Causa raiz

`SENTRY_AUTH_TOKEN`, `SENTRY_ORG` y `SENTRY_PROJECT` existen en Vercel `staging`, asi que el upload esta activo. El token autentica lo suficiente para invocar `sentry-cli`, pero no tiene permisos efectivos de release/source-map upload o no tiene acceso al proyecto configurado (`javascript-nextjs`).

Segun la documentacion oficial de Sentry:

- `sentry-cli` usa `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` y `SENTRY_PROJECT` para subir source maps.
- Sentry recomienda tokens separados por caso de uso; para CI/source maps conviene un token dedicado.
- Para operaciones de releases via `sentry-cli`, el token debe cubrir `project:releases` y `org:read`; las mutaciones de releases tambien requieren acceso a los proyectos asociados a la release.
- Un Organization Token apto para CI/source maps puede ser preferible si cubre el alcance necesario; si se usa token personal/internal integration, debe tener permisos equivalentes.

## Impacto

- Deploys protegidos: `ISSUE-093` ya evita builds de 45-46m o fallas por hang de Sentry.
- Observabilidad degradada: los artifact bundles/source maps no se suben, por lo que Sentry puede mostrar stack traces minificados o sin fuente original.
- Riesgo de falso cierre: Vercel queda `Ready`, pero la calidad de debugging en Sentry sigue incompleta.

## Solucion

1. Crear o rotar un token dedicado para CI/source-map upload en Sentry sin exponer el valor en chat, logs, docs ni commits.
2. Preferir un Organization Token si cubre el flujo de CI/source maps; si no, usar token/internal integration con permisos equivalentes para release/source-map upload.
3. Verificar permisos antes de publicar: `project:releases` + `org:read` para release management con `sentry-cli`, y acceso efectivo al proyecto `SENTRY_PROJECT`.
4. Actualizar `SENTRY_AUTH_TOKEN` en Vercel `staging`; evaluar y alinear `Production` y `Preview (develop)` si usan el mismo contrato.
5. Mantener `SENTRY_SOURCEMAP_UPLOAD_TIMEOUT_MS` y el guardrail de `ISSUE-093`; el timeout es defensa en profundidad, no reemplazo de permisos sanos.

No cerrar eliminando permanentemente Sentry/source maps ni borrando credenciales como workaround. La solucion robusta es un token de CI con permisos correctos y verificacion runtime.

## Verificacion

- `vercel env ls staging --scope efeonce-7670142f` confirma presencia de variables Sentry y timeout sin imprimir valores.
- Nuevo deployment staging queda `Ready` sin warning `403` en `vercel inspect <deployment> --logs --scope efeonce-7670142f`.
- Artifact bundle/source maps aparecen en Sentry para la release del deployment.
- Evento smoke o error controlado en Sentry se desminifica o deja de reportar source code faltante.

## Estado

open

## Relacionado

- `ISSUE-093`
- `next.config.ts`
- `src/lib/sentry-build/sourcemap-upload-timeout.ts`
- Deployments: `greenhouse-clbkbt7o6`, `greenhouse-qohboe5e0`

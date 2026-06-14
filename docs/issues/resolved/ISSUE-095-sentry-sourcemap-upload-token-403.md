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

**Confirmada empiricamente el 2026-06-14 (probe read-only contra la API de Sentry, sin exponer valores).** No era "el token necesita rotarse": en Vercel estaba cargado el **token equivocado** — un token personal read-only (forma de token de lectura de incidentes) con scopes `event:read` + `project:read`. Le faltan justo `org:read` y `project:releases` que `sentry-cli` necesita para `releases new` + artifact bundle upload, por eso `403 You do not have permission`.

Evidencia (hash de los primeros 16 hex del sha256, no el valor):

| Donde | Scopes | `org:read` |
|---|---|---|
| Vercel `staging` (token previo, 42d) | `event:read`, `project:read` | **HTTP 403** |
| Vercel `Production` (mismo token, 42d) | `event:read`, `project:read` | **HTTP 403** |
| Vercel `Preview` | sin `SENTRY_AUTH_TOKEN` | n/a (sourcemaps disabled, sin 403) |
| Token sano en `.env.vercel-staging` local | `org:read`, `project:read`, `project:releases` | HTTP 200 |

**Blast radius real: `staging` Y `Production`** (mismo token). El issue lo marcaba como "production riesgo latente"; estaba confirmado roto, no latente.

`SENTRY_ORG=efeonce-group-spa` y `SENTRY_PROJECT=javascript-nextjs` estaban correctos; el problema era exclusivamente el scope del `SENTRY_AUTH_TOKEN`.

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

## Fix aplicado (2026-06-14)

- Se sobrescribio `SENTRY_AUTH_TOKEN` en Vercel `staging` y `Production` con el token correctamente scopeado (`org:read` + `project:read` + `project:releases`) via `printf %s "$TOK" | vercel env add SENTRY_AUTH_TOKEN <env> --force --scope efeonce-7670142f` (escritura atomica, sin newline, sin exponer valor).
- Verificacion API post-cambio: ambos entornos devuelven `org:read=HTTP 200` y exponen scope `project:releases`. Hash del token deployado == hash del token sano local (MATCH en staging y production).
- **No hubo cambio de codigo.** `next.config.ts` ya degradaba con warning + guardrail de timeout de `ISSUE-093`; el problema era 100% credenciales.

### Verificacion de runtime (2026-06-14)

Build real `greenhouse-4wzmp4oj9` (target `staging`, release `7cb75d78...`):

```text
11:37:57  Running next.config.js provided runAfterProductionCompile ...
11:38:37  ✓ Completed runAfterProductionCompile in 40764ms
```

El hook completo en **40.7s sin `403`, sin `permission denied` y sin warning `degraded`/`exceeded`**. Progresion observada:
- token roto (read-only) → `403 You do not have permission` (fallaba rapido).
- token correcto + timeout 30s → `Source-map upload degraded: exceeded 30000ms` (cortado por el guardrail de `ISSUE-093`).
- token correcto + timeout 180000ms → **upload limpio en 40.7s**.

Segundo paso del fix: se subio `SENTRY_SOURCEMAP_UPLOAD_TIMEOUT_MS` a `180000` en Vercel `staging` + `Production` (clamp permitido 5s-240s). El guardrail anti-hang de `ISSUE-093` queda intacto; solo se le dio presupuesto suficiente al upload legitimo.

### Deuda residual (no bloqueante)

El token sano es **personal** (`jreyes@efeoncepro.com`). Para robustez de largo plazo conviene migrar a un **Organization Auth Token** dedicado de Sentry (no atado a usuario, sobrevive offboarding) con `org:read` + `project:releases`, y re-setearlo en los mismos entornos. Decision diferida por el operador.

## Estado

resolved (2026-06-14, verificado en build real `greenhouse-4wzmp4oj9`)

## Relacionado

- `ISSUE-093`
- `next.config.ts`
- `src/lib/sentry-build/sourcemap-upload-timeout.ts`
- Deployments: `greenhouse-clbkbt7o6`, `greenhouse-qohboe5e0`

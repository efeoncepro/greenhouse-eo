# ISSUE-144 — Preflight `vercel_readiness` confunde un build saltado a propósito con uno fallido

> **Tipo:** Incidente de tooling (release control plane)
> **Ambiente:** CI/local — `pnpm release:preflight` (check `vercel_readiness`)
> **Detectado:** 2026-08-06 (release `fcee5ab9f7ce`, run del orquestador `31104631142` quemado); recurrente y confirmado de nuevo el 2026-08-08
> **Estado:** open — diseño acordado, fix pendiente (bloqueado por una decisión de frontera, ver §Causa raíz)
> **Severidad:** media (no rompe prod; quema runs del orquestador y cuesta ~6 min de build por release)

## Síntoma

El preflight devuelve `vercel_readiness` con severidad `warning` y summary
`"Production READY, pero staging deploy CANCELED"`. Como **cualquier** warning
mete una entrada en `degradedSources`, `readyToDeploy` queda en `false` y
`--fail-on-error` corta con exit 1 → el run del orquestador se quema antes de
tocar nada.

Estado observado el 2026-08-08, minutos antes de un release:

```
21m  greenhouse-9cf5pz6dz  Canceled  staging
51m  greenhouse-ny9jn7a8a  Canceled  staging
1h   greenhouse-1xzuk2bls  Canceled  staging
3h   greenhouse-legkisi2k  ● Ready   staging
```

## Causa raíz

Dos sistemas nuestros, cada uno correcto por separado, sin contrato entre ellos:

1. `scripts/ci/vercel-ignore-build.mjs` (el `ignoreCommand` de `vercel.json`)
   **cancela deliberadamente** los builds de `develop` cuyo diff es docs-only.
   Es una optimización de costo buscada, y Vercel registra ese deployment como
   `CANCELED`.
2. `src/lib/release/preflight/checks/vercel-readiness.ts` mira **únicamente**
   `stagingDeploys[0]` y su `state` crudo. Un `CANCELED` deliberado es, para el
   check, indistinguible de un build fallido o abortado.

Es decir: **el gate bloquea el release por una decisión que tomó la propia
plataforma.** Y la mitigación documentada (`vercel redeploy` del deployment
cancelado, ~6 min) consiste en pagar un build para satisfacer a un check que
está malinterpretando una señal que nosotros mismos emitimos — repara el
síntoma en cada release y conserva el defecto.

## Impacto

- Un run del orquestador quemado (`31104631142`) o ~6 min de build manual, cada
  vez que un push docs-only a `develop` precede al release.
- Empuja hacia `bypass_preflight_reason` en un release normal, erosionando la
  señal del break-glass — el mismo patrón de normalización de la desviación que
  documentó `ISSUE-114`.

## Fix de raíz propuesto (robusto + escalable)

Que ambos consumidores compartan **el mismo predicado** y que el check evalúe el
deployment **concluyente**, no el más reciente a ciegas:

1. Extraer `isSafeDocsOnlyPath` / `decideBuildAction` a un módulo SSOT que
   importen tanto el `ignoreCommand` como el check del preflight.
2. `checkVercelReadiness` recorre los deployments de staging de más nuevo a más
   viejo y **salta los `CANCELED` cuyo commit sea docs-only según ese predicado**
   (son skips esperados, no evidencia), evaluando el primero concluyente.
3. Acotar el recorrido: si ninguno de los que devuelve la API es concluyente,
   degradar a `warning` honesto — nunca pasar en silencio.

**Esto NO debilita el gate.** Un `CANCELED` sobre un commit que sí toca código
—cancelación real o build abortado— sigue bloqueando, igual que un `ERROR`. Y no
se introduce confianza nueva: si el predicado estuviera mal, el build ya se
habría saltado mal aguas arriba. El check simplemente deja de contradecir una
decisión propia.

### Por qué no se arregló junto con ISSUE-114 (la frontera que hay que decidir)

El `ignoreCommand` de Vercel corre **antes de `pnpm install`**, por eso es
`node scripts/ci/vercel-ignore-build.mjs` en ESM plano: en ese momento no hay
`tsx` ni dependencias instaladas. Por lo tanto **el SSOT compartido no puede ser
TypeScript** — tiene que ser un módulo importable por `node` pelado (`.mjs`,
más un `.d.mts` para el lado TS).

Eso deja una decisión de frontera abierta, que es lo que falta acordar:

| Opción | A favor | En contra |
|---|---|---|
| SSOT en `src/lib/release/` (`.mjs` + `.d.mts`) | Dirección de dependencia correcta: el tooling depende de la política del control plane, no al revés | Un `.mjs` dentro de `src/lib/**` es inusual y entra en el trace de build de Next |
| SSOT en `scripts/ci/` (donde ya vive y ya está testeado) | Diff mínimo, cero riesgo de bundling | Invierte la dependencia: `src/lib/**` importando de `scripts/**` |

Improvisar este contrato dentro de un slice cuyo objetivo era desbloquear un
release es precisamente cómo nació `ISSUE-114`. Se difiere a propósito.

## Mitigación mientras tanto

Producir la evidencia, nunca bypassearla:

```bash
vercel redeploy <url-del-deployment-cancelado> --scope efeonce-7670142f
```

Pre-empción más barata: **secuenciar los pushes docs-only a `develop` para
después del release**, y verificar que el último deploy de staging no esté
`CANCELED` antes del dispatch (runbook §2.3 gotcha 4).

## Archivos afectados (fix)

- `src/lib/release/preflight/checks/vercel-readiness.ts`
- `scripts/ci/vercel-ignore-build.mjs` (extracción del predicado)
- `scripts/ci/__tests__/vercel-ignore-build.test.mjs` + tests nuevos del check
- Runbook §2.3 gotcha 4 + skills `greenhouse-production-release` (gotcha 7), al resolver

## Verificación al resolver

- Con el deployment de staging más reciente `CANCELED` por un commit docs-only, el
  preflight devuelve `vercel_readiness=ok` citando el deployment `READY` anterior.
- Con un `CANCELED` sobre un commit que toca código, sigue bloqueando.
- Test que fije ambos casos, y un test de contrato que afirme que los dos
  consumidores resuelven el predicado desde el mismo módulo.

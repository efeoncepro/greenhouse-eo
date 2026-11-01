# ISSUE-186 — 20 tests de growth SEO fallaron solos al pasar el corte ETV del 2026-11-01

## Ambiente

CI de `develop` (`pnpm test`, Vitest). No afectó a ningún runtime: el código de producción ya se comportaba como
debía.

## Detectado

2026-11-01, CI de `develop` en rojo durante la preparación del release `develop`→`main` del mismo día.

## Síntoma

20 tests repartidos en 7 archivos de `src/lib/growth/seo/{domain-overview,prospect,url-visibility}/__tests__/`
empezaron a fallar sin ningún cambio de código, en cuanto el reloj pasó la fecha de corte.

## Causa raíz

`ETV_PROVIDER_CUTOFF_ISO = '2026-11-01T00:00:00.000Z'` (`src/lib/growth/seo/etv-methodology/contracts.ts`) define desde
cuándo producción usa la metodología `improved_layout_clickstream_v2` en lugar del selector ETV legacy. Los tests
afirmaban el comportamiento del selector legacy y leían el reloj real. Al pasar la fecha de corte, el código eligió
correctamente la metodología nueva y los tests, atados implícitamente a «hoy es antes del corte», fallaron.

## Impacto

- CI de `develop` bloqueado: impedía abrir y validar el PR del release.
- Sin impacto en producción ni en datos.

## Solución

Commit `1543335fb`: en cada suite afectada, `vi.useFakeTimers({ toFake: ['Date'] })` y
`vi.setSystemTime(new Date('2026-10-15T12:00:00.000Z'))` en `beforeEach`, y `vi.useRealTimers()` en `afterEach`. Los
tests siguen probando el selector legacy, que se conserva para rollback anterior al corte, con un reloj explícito. La
rotación de `changelog.md` del mismo día (`9c166d03b`, más de 61 entradas) fue rutina y no forma parte de este issue.

## Verificación

- Con el fix, el CI dejó de bloquear y el release `935583f88db0-544b3943-a041-4fe6-9e62-03aca45c6c8f` cerró
  `released`.
- `ops-worker` y `artifact-worker` quedaron en `1543335fb` por change-gate legítimo: el diff del release posterior fue
  sólo el workflow de Auth y su test.

## Estado

resolved (2026-11-01).

Riesgo residual: otros tests que dependan de una constante de corte (`*_CUTOFF*`) y del reloj real fallarán el día de
su corte. La pauta quedó en el runbook de release (§2.3 gotcha 12): fijar el reloj en tests que afirman comportamiento
dependiente de una fecha.

## Relacionado

- Commit `1543335fb`; `src/lib/growth/seo/etv-methodology/contracts.ts`.
- Programa ETV (TASK-1805/TASK-1806): metodología Improved ETV, legacy sólo como rollback anterior al corte.
- [Runbook de release §2.3 gotcha 12](../../operations/runbooks/production-release.md);
  [playbook anti-pattern 23](../../operations/PRODUCTION_RELEASE_INCIDENT_PLAYBOOK_V1.md).

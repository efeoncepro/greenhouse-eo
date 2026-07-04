# ISSUE-114 — Preflight batch-policy: falso positivo `requires_break_glass` por divergencia de squash-merge

> **Tipo:** Incidente de tooling (release control plane)
> **Ambiente:** CI/local — `pnpm release:preflight` (check `release_batch_policy`)
> **Detectado:** 2026-07-03, durante el release develop→main (v2) de TASK-1324 (PR #139)
> **Estado:** open (mitigado en cada release con `bypass_preflight_reason`; fix de raíz pendiente)
> **Severidad:** media (no rompe prod; genera fricción + erosiona la señal del gate)

## Síntoma

El check `release_batch_policy` del preflight marca `decision=requires_break_glass` señalando
`services/ops-worker/deploy.sh` como dominio `cloud_release` (irreversible), **aunque ese archivo
ya está en producción y no tiene ningún cambio real** en el release en curso. Fuerza pasar
`bypass_preflight_reason` (break-glass) en un release que es funcionalmente normal.

En el release de TASK-1324:
- `git diff --name-only origin/main..develop` (two-dot, contenido real vs prod) = **80 archivos, ningún cloud_release**.
- `git diff origin/main..develop -- services/ops-worker/deploy.sh` = **0 líneas** (idéntico a prod).
- El classifier clasificó **131 archivos** y marcó `deploy.sh` como cloud_release.

## Causa raíz

El classifier computa el diff con base **three-dot** `origin/main...targetSha`
([release-batch-policy.ts](../../src/lib/release/preflight/checks/release-batch-policy.ts) → `collectChangedFiles`
usa `git diff --name-only ${baseRef}...${targetSha}`).

El three-dot diff parte de la **merge-base**, no de `origin/main`. Con el flujo de release por
**squash-merge**, cada release crea en `main` un commit squash cuyo padre es el `main` anterior
(no un ancestro de `develop`). Resultado: `develop` y `main` divergen, la merge-base queda
**congelada antes del último squash**, y el three-dot diff **resucita archivos ya desplegados**
en releases previos (aquí, el `deploy.sh` que TASK-1321 mandó a prod en #138). El classifier los
ve como "cambios de este release" → falso positivo cloud_release → break-glass.

Es **recurrente por diseño**: ocurre en todo release posterior a un squash que tocó un dominio
irreversible, hasta que la merge-base avance.

## Impacto

- Fricción operativa: cada release "normal" exige `bypass_preflight_reason` (break-glass), lo que
  **erosiona la señal** del gate (el break-glass deja de significar "algo excepcional").
- Riesgo de normalización de la desviación: si break-glass es rutina, un cloud_release **real** se
  cuela sin fricción distintiva.

## Mitigación aplicada (este release)

1. `bypass_preflight_reason` documentado (el `deploy.sh` ya está en prod, diff two-dot = 0; warnings
   `playwright_smoke`/`ci_green` conocidos del squash). Es el path que ya usaban #136–138.
2. **Se mergeó `origin/main` → `develop`** (con develop autoritativo, código intacto) antes del PR de
   release. Esto **avanza la merge-base** al `main` actual, de modo que el three-dot del *próximo*
   release parte de un punto correcto. Es un paliativo de proceso, no el fix del classifier.

**Mitigación documentada operativamente** (para que cualquier agente/operador la reconozca sin re-derivarla):
skill `greenhouse-production-release` (`.claude` + `.codex`, §"Gotchas conocidos del release"),
runbook `docs/operations/runbooks/production-release.md` §2.3, manual
`docs/manual-de-uso/plataforma/release-orchestrator.md` (§Problemas comunes) y doc funcional
`docs/documentation/plataforma/release-orchestrator.md`.

## Fix de raíz propuesto (robusto + escalable)

Dos capas complementarias:

1. **Classifier — base del diff correcta.** Cambiar `collectChangedFiles` de three-dot
   (`${baseRef}...${targetSha}`) a **two-dot** (`${baseRef}..${targetSha}`), que es exactamente
   "qué difiere el target respecto de producción" — la semántica que el batch-policy quiere. Revisar
   también `collectCommitBodies` (para razones por commit) para que no arrastre commits ya squasheados
   (posible: filtrar por archivos con diff two-dot real, o documentar el trade-off). Cubrir con tests
   en `batch-policy/classifier.test.ts` incluyendo el caso squash-divergence (fixture con merge-base
   anterior al último squash).

2. **Proceso — canonizar el sync post-release.** Documentar en el runbook + skill
   `greenhouse-production-release` que tras cada release por squash se hace `merge origin/main →
   develop` (o evaluar migrar a **merge commits** en vez de squash, que mantiene la merge-base viva y
   elimina la divergencia en la raíz). Decisión de proceso a acordar con el operador.

**Guardrail anti-regresión:** un test que arme el escenario squash-divergence y afirme que un archivo
cloud_release **ya presente en `origin/main`** (diff two-dot = 0) **NO** dispara `requires_break_glass`.

## Archivos afectados (fix)

- `src/lib/release/preflight/checks/release-batch-policy.ts` (base del diff)
- `src/lib/release/preflight/batch-policy/classifier.test.ts` (caso squash-divergence)
- `docs/operations/runbooks/production-release.md` + skill `greenhouse-production-release` (sync post-release)
- (Nota: tocar `src/lib/release/**` es dominio `cloud_release` → el propio fix requiere su release cuidado.)

## Verificación al resolver

- El preflight de un release normal post-squash retorna `release_batch_policy=safe` sin bypass.
- El test de squash-divergence pasa (rojo antes del fix, verde después).
- El runbook/skill documentan el sync post-release (o el cambio de estrategia de merge).

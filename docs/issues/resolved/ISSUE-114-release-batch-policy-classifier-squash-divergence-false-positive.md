# ISSUE-114 — Preflight batch-policy: falso positivo `requires_break_glass` por divergencia de squash-merge

> **Tipo:** Incidente de tooling (release control plane)
> **Ambiente:** CI/local — `pnpm release:preflight` (check `release_batch_policy`)
> **Detectado:** 2026-07-03, durante el release develop→main (v2) de TASK-1324 (PR #139)
> **Estado:** **resolved 2026-08-08** — fix de raíz aplicado (two-dot + guardrail); ver §Resolución
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

---

## Resolución — 2026-08-08

**Aplicado el fix de raíz propuesto (capa 1).** `collectChangedFiles` pasó de three-dot a two-dot, y
ambos consumidores del rango (archivos **y** commit bodies) ahora lo resuelven por una única función
exportada `buildReleaseDiffRange`, de modo que no puedan volver a divergir sobre bases distintas —
que es exactamente la deriva que produjo esta issue (`collectCommitBodies` ya usaba `..` mientras
`collectChangedFiles` usaba `...`).

**Dónde estaba realmente el hueco de cobertura.** El classifier puro (`batch-policy/classifier.test.ts`)
sí tenía tests; el defecto vivía en *cómo el check recolectaba la lista de archivos*, y
`checks/release-batch-policy.ts` **no tenía archivo de tests**. Por eso el three-dot sobrevivió cinco
semanas. El guardrail nuevo (`checks/release-batch-policy.test.ts`, 7 casos) fija el rango en el argv
de git — verificado rojo antes del fix (4 casos fallando) y verde después.

**Evidencia sobre el release en curso (batch SEO 2026-08-08):**

| | three-dot (antes) | two-dot (después) |
|---|---|---|
| archivos clasificados | 332 | 322 |
| dominios irreversibles | `db_migrations` + **`cloud_release`** | `db_migrations` |

Los archivos `src/lib/release/preflight/**` que el three-dot resucitaba tenían diff two-dot
**vacío**: se desplegaron el día anterior en el release `30140c662`. Eran fantasmas al 100%. De los
3, **2 clasifican `cloud_release`**; el tercero (`pending-without-jobs.test.ts`) cae en `tests` por
`DOMAIN_PATTERNS` — de ahí que el classifier reportara `cloud_release: 2`.

**Por qué importaba.** Los **4 releases consecutivos** previos de `main` llevan marker
`[release-coupled: …]`, y tres dicen literalmente *"NO son un acoplamiento de diseño"*. El marker
había dejado de declarar acoplamiento para convertirse en el ritual con que se callaba un classifier
roto — la normalización de la desviación que esta misma issue anticipó en §Impacto.

### Verificación adversarial (2026-08-08)

El fix se sometió a una revisión cuyo encargo explícito era **refutarlo**, no confirmarlo. Encontró
cuatro defectos reales, todos corregidos en este mismo change set:

1. **El docstring sobre-prometía.** Afirmaba que compartir el rango impedía que los consumidores
   "volvieran a divergir". Falso como garantía semántica: `git diff` compara árboles y `git log`
   recorre ancestría, y bajo squash-merge divergen por construcción. El docstring ahora nombra la
   asimetría y remite a `ISSUE-145`, en vez de declarar sana la máquina entera.
2. **Dos docstrings del contrato seguían en three-dot** (`batch-policy/classifier.ts`,
   `preflight/types.ts`) — justo los dos sitios que un futuro lector consulta para entender qué
   recibe el classifier. Corregidos.
3. **Dos de los siete tests eran teatro.** El mock era ciego al rango, así que los dos casos que
   llevaban el nombre de la issue pasaban igual con el bug presente. El mock ahora es
   **sensible al rango** (sirve una lista distinta para `..` que para `...`), de modo que simula la
   divergencia por squash de verdad. Comprobado: con three-dot restaurado ahora fallan **5** tests
   en vez de 4, y el que se sumó es exactamente el de escenario.
4. **Un byte NUL literal e invisible** se había colado en un fixture del archivo de tests. Eliminado.

Se rechazó, argumentado, un quinto hallazgo: que two-dot "regresa" en el caso de un target atrasado
respecto de la base. Ver `ISSUE-145` §Fix propuesto punto 4.

### Hallazgo adicional (no corregido acá): el batch policy del orquestador es estructuralmente vacuo

El orquestador corre el preflight con `target_sha` **ya mergeado en `main`**, de modo que el rango
`origin/main..target_sha` es **vacío** y el check siempre devuelve `ship` ("Diff vacio"). Es decir:
**el batch policy sólo tiene dientes pre-merge, en la corrida local del operador.** Eso explica por
qué el release `70e912056` pasó `ship` con 14 migraciones.

Consecuencia práctica: este fix mejora exactamente la corrida donde se toma la decisión humana. Darle
dientes al gate post-merge exigiría comparar contra el `target_sha` del **release anterior**
(`release_manifests`) en vez de contra `origin/main` — es un cambio de diseño mayor, con su propia
task, y deliberadamente **no** se hizo acá.

### Archivos tocados

- `src/lib/release/preflight/checks/release-batch-policy.ts` — `buildReleaseDiffRange` + ambos consumidores
- `src/lib/release/preflight/checks/release-batch-policy.test.ts` — **nuevo** (guardrail anti-regresión)
- `docs/operations/runbooks/production-release.md` — §2.3 gotcha 2 + §2.4 Paso B
- `.claude/skills/greenhouse-production-release/SKILL.md` + `.codex/…` — gotcha 2 (paridad obligatoria)

# Task Closing Quality Gate — full test + production build local (TASK-827/943 follow-ups)

---

## Task Closing Quality Gate — full test + production build local (TASK-827/943 follow-ups)

> **Relocado de `CLAUDE.md` por TASK-1160 (2026-06-16), verbatim — cero cambio semántico.** Detalle completo (bug classes TASK-827 / TASK-943 / orphan WT / Cloud Run worker workflows) del gate de cierre. El résumé accionable vive inline en `CLAUDE.md`.

### Task Closing Quality Gate — full test + production build local (desde 2026-05-13, TASK-827 follow-up)

**ANTES de mover una task de `in-progress/` a `complete/`** y declarar "ship done", correr **ambos** comandos local como gate final canonical:

```bash
pnpm test          # full suite (NO solo focal del modulo tocado)
pnpm build         # produccion Turbopack (next build) — NO el dev server
```

**Por que el pre-push hook NO basta** (canonizado live 2026-05-13 post 2 CI failures consecutivos en TASK-827):

El pre-push hook canonical del repo corre `pnpm lint` + `pnpm tsc --noEmit` (~90s). Es **first filter**, NO gate final. Especificamente NO corre:

- `pnpm test` (full suite ~12 min con coverage) — atrapa test contracts cross-module que tu modulo focal no toca pero tu cambio invalida (ej. test pin-eando `VIEW_REGISTRY` length; lint rule cubriendo recurso compartido; column-parity test SQL)
- `pnpm build` (Turbopack next build ~8 min) — atrapa boundary violations que tsc/lint NO enforcen: `import 'server-only'` transitivo a client bundle, dynamic imports rotos, hidden type errors solo en Turbopack pipeline, etc.

CI corre ambos. Si tu task no los corre local pre-close, CI los descubre post-push → rojo + email burst + perdes el deploy automatico hasta el siguiente push fix.

**Reglas duras**:

- **NUNCA** declarar una task complete + move a `complete/` + sync `README.md` sin haber corrido `pnpm test` (full suite) y `pnpm build` (production) local en el ultimo commit del slice final. Pre-push hook (lint + tsc) NO sustituye este gate — son layers diferentes.
- **NUNCA** asumir que los tests focales de tu modulo cubren el blast radius. Si tu task toca un **recurso compartido** (`VIEW_REGISTRY`, `RELIABILITY_REGISTRY`, `entitlements-catalog`, `EVENT_CATALOG`, public types exportados ampliamente, migrations seedeando registries), el blast radius incluye tests cross-module que tu modulo no ve. Solo full suite los atrapa.
- **NUNCA** asumir que `tsc --noEmit` cubre boundary contracts runtime. `server-only` / `client-only` son runtime contracts; TypeScript no los enforce. Solo `next build` con Turbopack lo detecta.
- **NUNCA** considerar un CI rojo como "el sistema funcionando bien". Si CI falla por algo que tu hubieras detectado con `pnpm test && pnpm build` local, es un escape de mi proceso de pre-close, NO de la "red de seguridad CI".
- **SIEMPRE** que un slice introduzca:
  - Component nuevo con `'use client'` que importe de un modulo `src/lib/` → `pnpm build` antes del push (Turbopack detecta server-only transitivo)
  - Modification a un registry / catalog / shared resource → `pnpm test` antes del push (full suite captura cross-module assertions)
  - Cambio a un public type exportado / firma de helper canonico → ambos
- **SIEMPRE** que cierres una task `in-progress/` → `complete/`, los ultimos comandos en tu shell antes del move deberian ser `pnpm test && pnpm build`. Si alguno falla, NO cierres — debug primero.

**Bug class canonizada (TASK-827, 2026-05-13)**: 2 CI failures consecutivos post "task complete":

1. `client-role-visibility.test.ts` pin-eaba 11 viewCodes en `VIEW_REGISTRY section='cliente'`; Slice 0 agrego 11 mas → 22 total → test rompe assertions de length + matrix coverage. Detectable con `pnpm test` full suite. NO detectable con `pnpm test src/lib/client-portal/` (focal).
2. `ClientPortalNavigationList.tsx` ('use client') importaba tipos + helper puro de `menu-builder.ts` que declara `import 'server-only'`. Turbopack en `next build` detecta server-only transitivo a client bundle y rompe. tsc/lint/vitest pasan (mock `server-only`); solo build produccion detecta. Detectable con `pnpm build` local.

Ambos fueron escapes de mi proceso pre-close. Esta regla canonical los previene.

**Trade-off explicito**: ~20 min extra pre-close vs 12+ min de CI failure + email burst de Vercel + push fix + nueva ronda CI. Net positive cuando count tests + build cost local < (CI roundtrip + dev context switch + reputational cost de "shipped roto").

**Bug class adicional canonizado live 2026-05-28 (TASK-943 follow-up)**: cuando tu working tree contiene **orphan uncommitted changes** de sesiones previas (e.g. stashed code, lifecycle moves pendientes, helpers half-committed), tu `pnpm build` local pasa porque ejercita el WT completo — pero Vercel construye contra el SHA exacto que recibió, sin el orphan state. Si tus commits dependen del orphan (e.g. `import { helper } from '@/lib/x'` donde `helper` solo existe uncommitted), **Vercel rompe en build aunque local esté verde**. Detectado live: Slice 2 + Slice 3 de TASK-943 importaban `toBigQueryStructTimestamp` desde `@/lib/bigquery` cuya exportación vivía solo en mi WT como orphan TASK-941 closure — 4 deploys staging consecutivos en Error hasta que un commit ajeno agregó el export al remoto.

**Reglas duras** (adicionales al gate canonical):

- **NUNCA** committear código que dependa de un símbolo exportado por archivo cuyas modificaciones estén uncommitted/stashed. **ANTES de cada commit**, correr `git status --short` y verificar que cualquier archivo modificado del cual dependo está incluido en el stage o ya está pusheado. Si emerge orphan state al stagear (sesión anterior dejó cosas a medio cerrar), o (a) committearlo formalmente PRIMERO como su propio commit cerrando la sesión anterior, o (b) stashearlo y volver después — NUNCA dejarlo "convivir" con commits que dependen de él.
- **SIEMPRE** que detectes orphan state en `git status --short` antes de empezar trabajo nuevo, decidir explícitamente: (1) commit + push para cerrar la sesión anterior, (2) stash con nombre claro para preservar, o (3) revert si era residual no deseado. NUNCA dejarlo flotante asumiendo que "no afecta mis commits nuevos" — los Vercel builds remotos no ven tu WT.
- **SIEMPRE** que tu commit toque `import X from '@/lib/foo'` para un símbolo nuevo, verificar con `git ls-tree -r origin/develop --name-only | grep foo` que el archivo está en remoto Y `git show origin/develop:src/lib/foo.ts | grep "export.*X"` que el símbolo está exportado. Si no, primer commit = agregar el export; segundo commit = usarlo.

**Pre-push defense-in-depth recomendado**: cuando un commit toca imports cross-module críticos, correr `git stash --keep-index && pnpm build && git stash pop` ANTES del push — eso ejercita el build solo con lo staged, replicando lo que Vercel verá. Es ~30s extra que detecta este bug class sin pasar por el CI roundtrip.

**Post-push verificación obligatoria de despliegues Cloud Run workers** (canonizado live 2026-05-28 TASK-943 follow-up): cualquier commit pushado a `develop` que toque archivos bajo `src/lib/**` que sean consumidos por los 4 workers Cloud Run (`ops-worker`, `ico-batch-worker`, `commercial-cost-worker`, `hubspot-greenhouse-integration`) — es decir, **casi cualquier cambio backend** — DEBE verificarse en GitHub Actions ANTES de declarar la task complete. Pre-push hook (lint + tsc) NO ejercita el bundle esbuild de los workers; Vercel build NO ejercita los workers tampoco. Los workers tienen su propia pipeline de deploy con esbuild bundler distinto al Turbopack de Next.js, y pueden fallar independientemente.

**⚠️ Reglas duras**:

- **NUNCA** mover una task a `complete/` sin verificar que los 4 workflows de Cloud Run workers afectados por los commits de la task estén en `conclusion=success`. Verificar con: `gh run list --workflow=ico-batch-deploy.yml --limit 5` + idem `ops-worker-deploy.yml`, `commercial-cost-worker-deploy.yml`, `hubspot-greenhouse-integration-deploy.yml`. Si alguno está `failure`/`cancelled`, **re-disparar** con `gh workflow run <workflow> --ref develop -f environment=staging -f expected_sha=$(git rev-parse origin/develop)` y monitorear hasta success.
- **NUNCA** asumir que un workflow `cancelled` por commit subsequent es "OK porque el siguiente lo cubre" — workflows production-deploy son SEPARADOS por workflow, NO por commit; cada uno necesita su propio run success para garantizar que el último SHA de develop está deployado a las revisions Cloud Run productivas.
- **NUNCA** pushear múltiples commits al hilo a `develop` sin verificar entre pushes que el deploy del commit anterior completó (o aceptar que el siguiente cancelará al anterior — y entonces re-disparar el último al final).
- **SIEMPRE** que la task touch `src/lib/{bigquery,ico-engine,sync,reliability,observability,postgres}/**` (consumed by workers), el cierre canonical INCLUYE: `gh run list --workflow=<deploy>.yml --limit 1 --json conclusion` para los 4 workers + estado terminal `success` + revision Cloud Run actualizada con `GIT_SHA == expected_sha`.

**Patrón canonical de cierre post-Vercel-Ready** (TASK-943 follow-up canonizado):

```bash
# 1. Verifica que los 4 deploy workflows estén success en el último SHA
LATEST_SHA=$(git rev-parse origin/develop)
for WF in ico-batch-deploy.yml ops-worker-deploy.yml commercial-cost-worker-deploy.yml hubspot-greenhouse-integration-deploy.yml; do
  STATUS=$(gh run list --workflow=$WF --limit 1 --json status,conclusion,headSha -q '.[0] | "\(.status) \(.conclusion) \(.headSha)"')
  echo "$WF: $STATUS"
done

# 2. Si alguno NO matchea LATEST_SHA con conclusion=success, re-disparar:
gh workflow run <workflow>.yml --ref develop -f environment=staging -f expected_sha=$LATEST_SHA

# 3. Monitorear hasta success (Monitor canonical or gh run watch <run-id>)
```

**Excepcion legitima** (documentar): hotfix critico bajo incident response real (ej. ISSUE-### activo, production down) puede saltar este gate priorizando velocidad. En ese caso, post-push correr ambos comandos remoto via CI (`gh run watch`) y reportar verde como cierre.

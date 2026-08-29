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


### Bug class — un campo que pasa a requerido rompe live tests que CI nunca ve (2026-08-19)

Los `*.live.test.ts` sólo corren cuando hay PostgreSQL configurado en el entorno
(`GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` o `..._HOST`); sin eso, `describe.skipIf` los salta.
CI no los ejecuta. Consecuencia: **cuando una task vuelve requerido un campo, los live tests que
construyen ese payload quedan rotos y nadie se entera** — ni el autor del cambio, ni el CI, ni el
siguiente agente, hasta que alguien corre la suite con PG a mano.

Dos casos reales encontrados el mismo día, en el mismo archivo
(`src/lib/hiring/public-careers/submit-application.live.test.ts`):

- `TASK-1740` volvió obligatorio `publicSeniority` para publicar una vacante → el `setup` del live
  test fallaba con `hiring_opening_missing_public_structured_fields`.
- `TASK-1688` volvió requerido `residenceCountryCode` a nivel de parser → `parsePublicHiringApplication`
  devolvía `null` y los tests reventaban con `Cannot read properties of null`.

Ambos llevaban días rotos y se descubrieron por accidente, al correr la suite completa con los live
tests habilitados durante otra task.

**Regla:** cuando una task vuelva requerido un campo de un parser, un command o un gate de publicación,
buscar los live tests que construyen ese payload (`grep -rl "<comando>" --include='*.live.test.ts'`) y
actualizarlos en el MISMO PR. Y al cerrar una task de dominio, correr al menos una vez la suite con las
credenciales cargadas —`set -a && . ./.env.local && set +a && pnpm vitest run src/lib/<dominio>`— porque
`pnpm test` a secas los salta y su verde no dice nada sobre ellos.

### Bug class — el gate de cierre tiene una mitad DESPUÉS del push: leer el veredicto (2026-08-29)

Este documento ya exige `pnpm test` completo + `pnpm build` **antes** de cerrar. El caso del 2026-08-29
mostró que eso es solo la mitad del gate: un agente rompió `services/ops-worker/deploy-contract.test.ts`
al rediseñar el filtro de rutas de deploy del ops-worker, cerró el trabajo corriendo **solo tests focales
del dominio que tocaba**, y después empujó a `develop` tres veces más **sin abrir el resultado de CI**.
El rojo lo encontró una auditoría ajena horas más tarde, cuando reventó en CI Deep durante un release.

No fue un hueco de cobertura del pipeline. El proyecto `unit` de `vitest.config.ts` incluye
`services/**/*.test.ts`, así que **`pnpm test` completo lo habría atrapado en local**. Es exactamente
la clase para la que existe la regla full-suite de este doc — "contratos cross-module que tu módulo
focal no toca" — con el agravante de no leer el veredicto después de empujar.

Corrida medida con `gh run list` sobre `ci.yml`:

| commit | veredicto CI | por qué |
|---|---|---|
| `146070ffc` | `cancelled` | el push siguiente lo canceló (`cancel-in-progress`) |
| `53e240d79` | `failure` | ROJO — nadie lo abrió |
| `3e8149eaa` | `failure` | ROJO otra vez — nadie lo abrió |
| `e3562c208` | (sin run) | docs-only: cae en `paths-ignore` de `ci.yml` |
| `8cafe6b90` | `failure` ×2 | merge `main`→`develop` de otra sesión: MISMO test |
| `dade7ce5f` | `failure` | primer squash a `main`: acá lo atrapó CI Deep, ~70 min después |
| `380a20fa3` | `success` | forward-fix del test; recién acá vuelve el verde |

🔴 **La señal estuvo roja 5 corridas y ~70 minutos, no dos.** Los dos primeros rojos son del
agente que rompió el test; la racha siguió por un merge de OTRA sesión y sólo se detuvo cuando
reventó en CI Deep durante un release. Eso importa para calibrar el reflejo: no fue una alerta
puntual que se pasó por alto, fue una alarma sostenida que atravesó varias sesiones sin que
nadie la abriera. Cuanto más larga es la racha, más se normaliza — que es exactamente cómo el
detector de expiración de la credencial AXIS se volvió invisible esa misma semana.

Falla verbatim del run `33274733930`:

```text
unit  services/ops-worker/deploy-contract.test.ts  (16 tests | 2 failed)
```

**Costo medido del escape:** el rojo viajó hasta el release siguiente — CI Deep rojo sobre el primer
squash de la promoción develop→main y ~40 min de ciclo forward-fix (diagnóstico → fix → merge
canónico → PR #214 → re-evidencia). El lado release del mismo caso — incluida la resolución de la
guarda: el test del workflow ahora exige que el YAML referencie `worker:deploy-path-gate`, el
verificador real de la cobertura — está registrado en
`docs/operations/PRODUCTION_RELEASE_TIMING_LEDGER.md` (fila 2026-08-29, 4.º release del día).

**Los dos mecanismos que hacen la señal intermitente, y ninguno es un bug:**

1. `.github/workflows/ci.yml` declara `cancel-in-progress` verdadero para `develop` (bloque
   `concurrency`). Es correcto —evita quemar runners con commits superseded—, pero implica que
   **el veredicto de CI es del ÚLTIMO push de la ráfaga, no de cada commit**. Si el que rompe es un
   commit intermedio, nunca se juzga y su rojo aparece atribuido al siguiente.
2. `ci.yml` usa `paths-ignore` (`**/*.md`, `docs/**`, `.claude/**`, `.codex/**`, `.agents/**`), así que
   un commit docs-only no genera run. También correcto, pero combinado con lo anterior hace que en una
   ráfaga mixta la señal se vea a saltos: un `cancelled`, un hueco sin run, y el rojo colgando del
   commit equivocado.

🔴 **Un rojo que nadie mira es funcionalmente igual a no tener el test.** Esa misma semana, el detector
de expiración de la credencial AXIS avisó tres días antes y fue invisible por la misma razón: su único
canal era el color de su propio run, que ya estaba rojo por otra causa.

**Reglas duras:**

- **NUNCA** cerrar una task corriendo solo la suite focal del dominio tocado. `services/**` está dentro
  de `pnpm test`; los tests que rompes pueden vivir en un directorio que ni abriste.
- **SIEMPRE** después de CADA push, resolver el veredicto del SHA que acabas de empujar:

  ```bash
  gh run list --workflow=ci.yml --limit=100 --json headSha,conclusion \
    -q ".[] | select(.headSha==\"$(git rev-parse HEAD)\") | .conclusion"
  ```

- Si sale vacío o `cancelled`, **no hay veredicto** — que no es lo mismo que verde. Vacío puede ser
  docs-only (legítimo, `paths-ignore`) o un run que aún no arrancó; `cancelled` significa que otro push
  lo superseded. En ambos casos el juicio queda pendiente hasta que el último SHA de la ráfaga salga
  `success`.
- **NUNCA** empujar en ráfaga a `develop` y darte por cerrado sin que el **último** SHA tenga
  `conclusion=success`. Con `cancel-in-progress` activo, ese último run es el único que juzga el árbol
  que quedó.

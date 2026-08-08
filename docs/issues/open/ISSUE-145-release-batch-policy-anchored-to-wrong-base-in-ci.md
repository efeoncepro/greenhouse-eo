# ISSUE-145 — El `release_batch_policy` está anclado a la base equivocada: decorativo en CI y con un marker que nadie lee (pero que cualquiera dispara sin querer)

> **Tipo:** Incidente de tooling (release control plane)
> **Ambiente:** CI (`production-release.yml` job de preflight) + local
> **Detectado:** 2026-08-08, verificando el fix de `ISSUE-114`
> **Estado:** open — causa raíz identificada y con seam localizado; fix no aplicado
> **Severidad:** **alta** — un gate que siempre aprueba es peor que uno que molesta: entrega seguridad que no existe

## Resumen

`ISSUE-114` corrigió *cómo* se computaba el diff (three-dot → two-dot). Esta issue es sobre algo
distinto y más grave: **contra qué se computa**. El check usa `baseRef = origin/<targetBranch>` =
`origin/main`, pero el orquestador lo corre con el `target_sha` **ya mergeado en `main`**. El rango
queda vacío y el gate aprueba sin haber mirado nada.

De ahí salen tres defectos con una sola raíz.

## Defecto 1 — En CI el check es decorativo: siempre `ship`

`production-release.yml:90-94` hace `checkout` con `ref: ${{ inputs.target_sha }}`, y `:194-200`
invoca el CLI con `--target-sha=${TARGET_SHA} --target-branch=main`. El decision tree del runbook
(§1) confirma el orden: **primero** se promueve el SHA a `main`, **después** se dispara el
orquestador. Entonces `origin/main..target_sha` es vacío, y `classifier.ts:92-101` retorna
`decision: 'ship'` con `reasons: ['Diff vacio respecto a origin/main']`.

No es teoría. Los artefactos `preflight-result.json` de los tres últimos releases:

| run | targetSha | `release_batch_policy` |
|---|---|---|
| `31058032196` (2026-08-05) | `70e912056…` | `filesChanged=0 decision=ship domains={} reasons=['Diff vacio respecto a origin/main']` |
| `31105434129` (2026-08-06) | `fcee5ab9f…` | idéntico |
| `31180734383` (2026-08-07) | `30140c662…` | idéntico |

El caso `70e912056` es el más elocuente: su squash contiene **1045 archivos y 14 migraciones**, y el
check reportó `filesChanged=0, domains={}`. Reconstruido pre-merge habría dado `payroll` +
`auth_access` + `cloud_release` + `db_migrations` → `split_batch` **y** `requires_break_glass`. En CI
dijo `ship`.

`target_sha_exists` sufre lo mismo en menor grado: post-merge el SHA **es** el HEAD de `main`, así que
existir está garantizado por construcción; sólo queda valor residual de "el token de GitHub funciona".

## Defecto 2 — El marker `[release-coupled: …]` nunca transporta lo que dice transportar

El runbook (§2.4 Paso B) instruye escribirlo en el cuerpo del commit de squash, afirmando que *"es lo
que el classifier del orquestador lee"*. **Es falso en los dos caminos:**

- **Post-merge (CI):** `collectCommitBodies` lee `git log origin/main..target_sha`. Con
  `target_sha == origin/main`, el rango es **vacío** — y el squash queda excluido justamente por ser
  el extremo izquierdo. Verificado: `git log --oneline origin/main..30140c662` → **0 commits**, aunque
  `git show -s --format=%B 30140c662` sí contiene el marker.
- **Pre-merge (local):** el rango es `origin/main..develop`, donde el commit de squash **todavía no
  existe**.

Cuatro releases consecutivos escribieron ese marker convencidos de que hacía algo.

## Defecto 3 — …y sin embargo se dispara solo, con prosa de documentación

`RELEASE_COUPLED_MARKER_REGEX = /\[release-coupled:[^\]]+\]/i` (`domains.ts`) se aplica al texto
concatenado de **todos** los commits del rango. Cualquier commit que **mencione** la plantilla la
satisface.

Verificado sobre el batch en curso (`origin/main..origin/develop`): la regex **matchea**, y la única
ocurrencia es el literal `[release-coupled: ...]` dentro del cuerpo de `aea35a678`
—`docs(growth): TASK-1645 + TASK-1647 complete — SV360 operable por MCP en producción`—, un commit de
documentación de growth/MCP sin ninguna relación con el acoplamiento de dominios.

Es decir: **hoy, la protección `split_batch` del batch SEO está neutralizada por una cita accidental
en un commit ajeno.** Un fail-open silencioso, y el único de los tres defectos que puede dejar pasar
una mezcla real de dominios sensibles sin que nadie la declare.

**Por qué el vector es tan ancho.** `git diff A..B` compara **árboles**; `git log A..B` recorre
**ancestría**. Con squash-merge divergen por construcción: los commits de `develop` que ya llegaron a
producción vía squash **nunca** salen de la ventana de `git log`, porque el squash no los vuelve
alcanzables desde `main`. Medido sobre el batch en curso:

| Consumidor | Rango | Alcance real |
|---|---|---|
| `collectChangedFiles` | `origin/main..origin/develop` | **322 archivos** — contenido genuinamente nuevo |
| `collectCommitBodies` | la misma string | **498 commits, ~424 KB, 4 releases ya desplegados** |

O sea, el arreglo de `ISSUE-114` estrechó el numerador (archivos) y dejó el denominador (bodies)
igual de inflado. Sobre 424 KB de prosa acumulada de casi un mes, que un `String.includes` encuentre
la plantilla citada no es mala suerte: es cuestión de tiempo. Ya pasó dos veces (`4e07432a3` escribió
`[release-coupled:]`, que no matcheó por el `[^\]]+`; `aea35a678` sí matcheó).

## Causa raíz común

El check ancla su ventana en `origin/<targetBranch>`, que responde *"¿en qué difiere el target de la
rama destino?"*. La pregunta correcta para un release es **"¿qué agrega este release respecto del
release anterior?"**, cuyo ancla es el `target_sha` del último release efectivamente desplegado.

Con el ancla correcta, los defectos 1 y 2 se caen juntos: post-merge el rango
`prev_release_sha..target_sha` es no vacío (el diff real desde el último release) **y** contiene el
commit de squash, de modo que el marker por fin se lee donde el runbook dice que se lee.

## Fix propuesto

1. **Re-anclar la base.** `buildReleaseDiffRange(baseRef, targetSha)`
   (`src/lib/release/preflight/checks/release-batch-policy.ts`) ya es el seam; hoy lo alimenta el
   `baseRef` hardcodeado. Debe recibir el `target_sha` del último release en estado `released` para esa
   rama.
   - Lector existente: `listRecentReleases({ targetBranch, limit })` en
     `src/lib/release/manifest-store.ts:388-409`. **Caveat:** no filtra por `state` — devuelve también
     `aborted`/`rolled_back`; el caller debe filtrar por `released`.
   - Viabilidad ya verificada: el job de preflight **ya tiene credenciales PG**
     (`production-release.yml:149-152`; `postgres_migrations` se conecta a Cloud SQL desde ahí) y el
     checkout trae historia completa (`fetch-depth: 0`), así que el `git diff` es computable local.
   - `manifest-store.ts` es `import 'server-only'` y arrastra `@/lib/db` + outbox: conviene un reader
     delgado para el preflight.
2. **Fallback honesto.** Si no hay release previo registrado, el resultado debe ser
   `severity: 'unknown'`, **nunca** `ship`. Hoy la ausencia de diff se lee como aprobación silenciosa,
   que es el corazón de esta issue.
3. **Endurecer el marker.** Que la regex no se satisfaga con prosa: exigirlo al inicio de línea y/o
   aceptarlo únicamente desde el cuerpo del commit de merge/squash, no de cualquier commit del rango.
   Test de regresión con el caso real de `aea35a678`.
4. **Reportar la dirección del cambio, no sólo el archivo.** `git diff --name-status` en vez de
   `--name-only`, y exponerlo en el evidence. Hoy el payload no distingue *"el target agrega este
   archivo"* de *"el target lo revierte"*, y esa ambigüedad tiene una consecuencia concreta: un target
   **atrasado** respecto de la base (checkout sin `pull`, rama sin rebase) produce un delta inverso
   —medido: 205 archivos y 2 migraciones— que el operador ve como `db_migrations: 2` sin ninguna señal
   de que se trata de una reversión, y que **no puede curar con el marker** porque
   `git log <base>..<target-atrasado>` devuelve cero commits: no hay commit en rango capaz de portarlo.
   La única salida queda siendo `--override-batch-policy`, o sea break-glass por un caso que no lo es.

   Vale la pena registrar el desacuerdo detrás de este punto: la verificación adversarial lo reportó
   como **regresión** de two-dot, porque three-dot devolvía `ship` en ese escenario. No comparto la
   conclusión — promover un target atrasado a `main` **revertiría** 205 archivos y 2 migraciones, así
   que `ship` era la respuesta peligrosa y silenciosa, no la correcta. Lo que sí es un hueco real, y
   lo que este punto arregla, es que el diagnóstico no nombra la dirección.

## Deuda adyacente detectada en el mismo barrido (no es esta issue, pero conviene no perderla)

- **`azure_wif_subject` falla abierto:** ante `Insufficient privileges` devuelve `severity: 'ok'` sin
  haber podido listar las federated credentials. Los tres artefactos revisados tomaron ese camino, o
  sea el check lleva al menos tres releases sin verificar nada.
- **`playwright_smoke` sobre `main` sólo puede venir de un dispatch manual** (`playwright.yml` dispara
  en `push: develop`). El verde de los últimos releases existe por ritual del operador, no porque el
  gate lo produzca.
- **El classifier es más estricto que su propia política escrita:** marca `requires_break_glass` ante
  **un solo** dominio irreversible, mientras la matriz del runbook §2.2 considera legítimo un release
  de migración acoplado a su consumer directo. Consecuencia: *todo* release con migraciones exige
  override, lo que empuja al break-glass rutinario — la misma erosión de señal de `ISSUE-114`.

## Verificación al resolver

- El `preflight-result.json` de un release real muestra `filesChanged > 0` y dominios reales, en vez
  de `Diff vacio respecto a origin/main`.
- Un marker escrito en el cuerpo del squash **sí** neutraliza `split_batch`; el literal de
  `aea35a678` **no**.
- Sin release previo en `release_manifests`, el check devuelve `unknown` y no `ship`.

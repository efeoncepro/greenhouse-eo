# ISSUE-164 — El fetcher de probes promete una contención de redirects que no implementa

> **Estado:** open
> **Ambiente:** 🔴 **ops-worker vivo** — los tres flags de probes están `true` en la revisión activa (verificado 2026-08-26, ver Delta)
> **Detectado:** 2026-08-26, por auditoría de código al evaluar el fetcher para uso comercial sobre prospectos
> **Severidad:** alta — SSRF **alcanzable desde internet anónimo en producción** (cadena verificada 2026-08-27: intake público ON + probes ON en la revisión activa), con exfiltración potencial hacia el resultado del probe. Captcha y rate-limit son la única fricción; ninguna de las dos mitigaciones declaradas antes en este issue se sostiene
> **Dominio:** Growth / AI Visibility Grader · sustrato de sitio
> **Task relacionada:** `TASK-1778` (fix + endurecimiento del fetcher)

## 🔴 Delta 2026-08-26 — la premisa de mitigación era falsa

La v1 de este issue afirmaba que los flags estaban *"ON en staging y OFF en producción"* y concluía
*"NO es un incidente vivo… ningún consumer está prendido en producción"*. **Ambas cosas son falsas.**

Consulta a la revisión activa del ops-worker (`gcloud run services describe ops-worker
--region us-east4 --project efeonce-group`, 2026-08-26):

```
GROWTH_AI_VISIBILITY_PROBES_ENABLED        = true
GROWTH_AI_VISIBILITY_ENTITY_PROBES_ENABLED = true
GROWTH_AI_VISIBILITY_BRAND_INTELLIGENCE_ENABLED = true
```

Y `services/ops-worker/deploy.sh:623,625,628` los declara `"true"` también en la rama `production`,
bajo el comentario *"PRODUCTION — espeja staging … todo activo en prod"*.

**De dónde salió el error, porque importa más que el error:** la v1 tomó el estado de
`FEATURE_FLAG_STATE_LEDGER.md`, cuya tabla `§ Snapshot` se generó con `vercel env ls`. En esa fuente
un flag ausente se lee como «OFF en producción» — pero **estos flags se leen en el ops-worker, no en
Vercel**, así que su ausencia del listado nunca significó OFF. El defecto documental del ledger
degradó la clasificación de severidad de un problema de seguridad. Ese defecto está descrito en
`docs/audits/platform/2026-08-26-openseo-competitive-teardown-growth-seo-aeo.md` §3.11.

**Qué cambia.** Cambia la ventana —no hay «flip futuro» que esperar, el fetcher ya atiende tráfico—
y **también cambia la superficie de ataque**, en contra de lo que afirmó la corrección intermedia de
este issue.

🔴 **El target NO es «el dominio del propio cliente cargado por un operador»: es input anónimo de
internet.** Verificado 2026-08-27, tres eslabones encadenados:

1. **El intake público está VIVO en producción.** `POST /api/public/growth/ai-visibility/run` con
   cuerpo `{}` contra `greenhouse.efeoncepro.com` devuelve **`400`**, no `404`. El orden importa:
   `create-public-run.ts:67` evalúa `isPublicIntakeEnabled()` **antes** de validar nada y devuelve
   `disabled → 404` si el flag está OFF. Un `400` sólo es alcanzable con el flag **ON**.
2. **La ruta es sin sesión y acepta un `websiteUrl` arbitrario.** Es, por diseño, el único write
   público del dominio (`route.ts:10-15`): cualquiera en internet elige el dominio que se va a
   fetchear.
3. **El run público SÍ ejecuta los probes.** `run-engine.ts:332` llama `await gatherRunProbes(...)`
   como post-step **incondicional**, sin filtro por profundidad: un run `public_diagnostic`+`light`
   pasa por el mismo gatherer que cualquier otro. Y `ops-worker-00595-4q2` —la revisión activa— tiene
   `GROWTH_AI_VISIBILITY_PROBES_ENABLED=true`.

Cadena completa, toda verificada: **POST anónimo → run encolado → ops-worker → `gatherRunProbes` →
`createProbeFetcher` → `redirect: 'follow'` sin revalidación → destino elegido por el atacante,
fetcheado desde dentro del worker de producción.** El body se lee hasta 1 MiB y **se persiste como
evidencia del probe**; por el carril `brand-intelligence` además se extrae a texto legible y se le
pasa a un LLM, que es un camino plausible —no verificado— hacia el informe publicado.

**Fricción real que queda en pie** (no autorización, pero sí barrera): el intake público tiene
captcha, rate-limit y presupuesto global (`route.ts:12`). El `400` de la sonda llegó antes del
captcha porque el cuerpo iba vacío. Un atacante debe pasar captcha por intento — fricción de bot,
no control de acceso.

**No hay explotación observada.** Lo que se retira es la afirmación de que no puede haberla.

## Delta 2026-08-27 — fix code complete en `develop`; el issue queda abierto hasta la corrida real en staging

`TASK-1778` implementó los Slices 1–4b (commit `f876e7b0b`): `redirect: 'manual'` + revalidación por
salto acotada a la familia del sujeto, guarda DNS pre-conexión (ambos tras
`GROWTH_PROBE_FETCH_STRICT_NETWORK_ENABLED`, default OFF), lectura por stream con `truncated`/`observable`
y `robots.txt` obedecido (sin flag), con suite adversarial que cubre los casos de la `## Verificación`
de este issue. **Este issue NO se mueve a `resolved/` todavía**: la regla dura de la task exige la
corrida real en staging (apex→www, http→https, sitio >4 MiB) con el flag ON antes de declarar que la
cobertura sobrevivió — los tests unitarios prueban la guarda, no la cobertura. El plan de cutover vive
en `FEATURE_FLAG_STATE_LEDGER.md` § Pendientes.

## Síntoma

El fetcher declara en su cabecera una garantía de seguridad que el código no cumple:

```
src/lib/growth/ai-visibility/probes/safe-fetch.ts:10
 * `redirect: 'follow'` acotado al mismo registrable host (no se persigue cross-host).
```

No existe ningún código que acote los redirects al host del sujeto. `resolveProbeUrl` valida
**únicamente la URL inicial**; después, `safe-fetch.ts:100` entrega la petición a la plataforma con
`redirect: 'follow'` y el host final nunca se vuelve a comparar contra `isNonPublicHost` ni contra el
host del sujeto. El resultado guarda `url: finalUrl` como evidencia, pero guardarlo no es validarlo.

## Causa raíz

Dos defectos independientes que se componen:

**1. Redirects seguidos sin revalidación por salto** (`safe-fetch.ts:100`).

`resolveProbeUrl` es un guard de **entrada**. `redirect: 'follow'` mueve la decisión del destino real
fuera de nuestro control: cada `3xx` la resuelve el runtime, sin pasar por el guard. Un sujeto que
responde `302 Location: http://10.0.0.5/` termina con ese contenido en `ProbeFetchResult.body`.

**El patrón correcto ya está en el repo, en el módulo hermano**: `entity-fetch.ts:90` usa
`redirect: 'manual'` precisamente para no salir de su allowlist, y lo dice en su cabecera
(*"sin redirects cross-host fuera de la allowlist"*) — ahí la afirmación sí tiene mecanismo detrás.
No hay que diseñar nada: hay que aplicar el patrón que el archivo de al lado ya usa.

**2. `isNonPublicHost` no resuelve DNS** — declarado en el propio comentario
(`safe-fetch.ts:28`: *"Defense-in-depth (no resuelve DNS)"*).

El filtro sólo reconoce literales IP y nombres locales conocidos (`localhost`, `.internal`, rangos
privados, CGNAT, link-local). Un **hostname público** cuyo registro A apunta a `169.254.169.254`, a
`10.x.x.x` o a un servicio interno **pasa el filtro sin tocarlo**, porque a nivel de string no tiene
nada de sospechoso. Como defensa en profundidad es correcta y útil; como única defensa no alcanza.

**Por qué se componen y por qué importa acá.** El grader tiene **intake público**
(`src/app/api/public/growth/ai-visibility/run/route.ts`): cualquiera somete el dominio que quiera. El
sujeto del fetch es, por diseño, **input no confiable**. Eso convierte a (1) y (2) en la definición de
libro de SSRF: el atacante controla el destino y el cuerpo de la respuesta vuelve a un resultado que
se persiste y se renderiza en un informe.

Atenuantes reales, que hay que decir para no inflar la severidad:

- El metadata server de GCP exige la cabecera `Metadata-Flavor: Google`, que este fetcher **no envía**.
  Ese blanco concreto está cubierto por el proveedor, no por nosotros.
- El fetcher es `GET` puro, sin credenciales, sin cookies (`cache: 'no-store'`, sin `credentials`).
  No hay escritura ni sesión que robar.
- El alcance efectivo es la red interna alcanzable desde el runtime que ejecute el probe.

## Impacto

- **Seguridad**: alcance a superficies internas desde un input controlado por terceros, con el cuerpo
  de la respuesta viajando al resultado del probe (que se persiste y puede llegar a un informe).
- **Ambiente**: staging hoy. **Producción no está expuesta**: ambos consumers del fetcher
  (`probes/gatherer` vía `TASK-1266` y `brand-intelligence/fetch-site-content` vía `TASK-1288`) están
  **`true` en la revisión activa `ops-worker-00595-4q2`**, verificado con `gcloud run services
  describe` el 2026-08-27. La fila `prod: OFF` del `FEATURE_FLAG_STATE_LEDGER.md` era el artefacto
  documental que originó la mala clasificación.
- **Comercial**: bloquea declarar el fetcher apto para uso sobre prospectos, que es justo lo que
  `TASK-1709` (`Delta 2026-08-26`) acaba de habilitar por delegación.
- **Confianza en los comentarios del repo**: una cabecera que afirma una contención inexistente es
  peor que no decir nada — el siguiente lector la da por cierta y construye encima.

## Solución

Dueña: **`TASK-1778`**. Resumen del fix de este issue (la task lleva el detalle y dos defectos más
del mismo archivo que no son de seguridad):

1. `redirect: 'manual'` + bucle de saltos propio con tope, revalidando **cada** `Location` con
   `resolveProbeUrl` (host público + mismo host del sujeto). Espeja `entity-fetch.ts:90`.
2. Resolución DNS del host antes de conectar y verificación de que **ninguna** dirección resuelta cae
   en rango no público, en la URL inicial y en cada salto.
3. Alinear la cabecera del archivo con lo que el código hace, y un test que falle si vuelven a
   divergir: el redirect a un host distinto y el redirect a IP privada deben devolver `blocked`.

## Verificación

- Test que somete un sujeto que redirige a `10.0.0.5`, a `169.254.169.254` y a un host público
  distinto: los tres deben devolver `{ ok: false, errorCode: 'blocked' }` y **cuerpo vacío**.
- Test que somete un hostname público que resuelve a rango privado: `blocked`.
- Smoke en staging sobre un dominio real con cadena de redirects legítima (`http → https`,
  `apex → www`): debe seguir funcionando y **no** romper la corrida del grader.
- Confirmar en `FEATURE_FLAG_STATE_LEDGER.md` que ningún flag consumidor pasó a `prod: ON` antes del
  merge del fix.

## Relacionado

- `TASK-1778` — task dueña del fix y del endurecimiento del fetcher.
- `TASK-1266` — origen del fetcher (`probes/safe-fetch.ts`).
- `TASK-1288` — segundo consumer (`brand-intelligence/fetch-site-content.ts`), que reusa el mismo
  fetcher en vez de duplicarlo (higiene correcta que hace que un solo fix cubra ambos).
- `TASK-1697` (`P0`) — mueve este archivo a `@/lib/growth/site-substrate`. **Orden declarado: el fix
  de este issue va PRIMERO.** 1697 es un `git mv` cuyo valor es que ningún dependiente cambie una
  línea; mover un archivo con un defecto de seguridad conocido lo consagraría como "el sustrato
  canónico" con el defecto adentro.
- `TASK-1709` (`Delta 2026-08-26`) — habilita la evidencia de sitio sobre prospectos delegando en este
  sustrato; su valor comercial depende de que el sustrato sea defendible.
- `entity-fetch.ts:90` — el patrón correcto, ya implementado en el mismo directorio.

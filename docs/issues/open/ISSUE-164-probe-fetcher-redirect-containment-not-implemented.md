# ISSUE-164 — El fetcher de probes promete una contención de redirects que no implementa

> **Estado:** open
> **Ambiente:** staging (`GROWTH_AI_VISIBILITY_PROBES_ENABLED` y `GROWTH_AI_VISIBILITY_BRAND_INTELLIGENCE_ENABLED` están **ON en staging y OFF en producción**)
> **Detectado:** 2026-08-26, por auditoría de código al evaluar el fetcher para uso comercial sobre prospectos
> **Severidad:** alta (SSRF con exfiltración potencial hacia el resultado del probe) — **mitigada hoy** porque ningún consumer está prendido en producción
> **Dominio:** Growth / AI Visibility Grader · sustrato de sitio
> **Task relacionada:** `TASK-1778` (fix + endurecimiento del fetcher)

⚠️ **Esto NO es un incidente vivo.** No hay explotación observada ni exposición en producción. Se
documenta como issue —y no como task de hardening— porque es un **defecto del código actual**, no
trabajo planificado, y porque su ventana de corrección tiene una fecha dura: el flip a producción de
cualquiera de los dos flags. Registrarlo después de ese flip sería tarde.

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
  `prod: OFF` según `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.
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

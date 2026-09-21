# ADR — Enumerador canónico de referencias con rol declarado (catálogo de fotografía)

> **Estado:** Accepted · **Fecha:** 2026-09-21 · **Ámbito:** `scripts/foto/build-prompt.mjs` + `assets-lock.mjs`
> **Decide:** cómo el catálogo de referencias declara archivos y cómo los consumen sellador y gates.
> **No decide:** si el rol debe ser enum cerrado; si el catálogo sale de `scripts/` hacia un paquete.

## Decisión

**El catálogo expone un enumerador canónico —`referenciasDeclaradas()`— y todos los consumidores lo
usan. Ningún consumidor vuelve a enumerar por su cuenta.** Cada referencia declara su **rol**, y el rol
dice **qué se copia y qué se ignora** de esa imagen.

Se rechaza reescribir el catálogo a `referencias: [{ rol, ruta }]` (correcto a largo plazo, pero
big-bang sobre 3.300 líneas en uso concurrente por tres sesiones el mismo día).

## El problema, medido

Tres consumidores enumeraban de tres maneras distintas:

| Consumidor | Cómo enumeraba | Qué pasaba al agregar algo |
|---|---|---|
| Constructor | por campo, en la función que lo lee | funcionaba |
| Sellador | por **lista de campos propia** | **se caía en silencio** |
| Gates | por **literales** (`['julio', 'nexa']`) | **no cubría lo nuevo** |

🔴 **La bug class mordió TRES veces**, dos de ellas en 24 h:

1. `assetDeUso` / `usoPorPersona` / `usoPorColor` fuera del lock — **66 → 79** al cerrarlo.
2. `expresiones` / `vestuario` tampoco — **79 → 104**.
3. **Al centralizar apareció la que faltaba: los CINCO MACROS del emblema** (`macroEmblema`,
   `macroPorColor`) — **120 → 125**. Existían en disco, el constructor los pasaba al modelo, y no
   estaban sellados. Son justo los archivos que existen **para que el emblema no se reinvente**.

El tercero es la evidencia que cierra el diagnóstico: **nadie lo buscó**. Apareció porque el
enumerador es estructural.

Y una cuarta forma del mismo fallo, en los gates: `for (const persona of ['julio', 'nexa'])` hacía que
el test de «IDENTITY es verbatim el del canon» fuera **el test de regresión de las dos primeras
personas**, no del contrato. Una tercera pasaba sin su bloque documentado.

## Causa raíz

No era «el catálogo modela archivos, no roles» —el constructor **sí** es genérico: un solo literal de
persona en 1.936 líneas, y es un ejemplo dentro de un mensaje—. Era que **no existía un enumerador
canónico**, así que cada consumidor inventaba el suyo y olvidar uno no fallaba.

## El rol no es taxonomía

Las dos vías emiten instrucciones **opuestas** sobre la misma clase de imagen:

| Rol | Copia | Ignora |
|---|---|---|
| `identidad` | la **cara** | **la ropa** y el fondo |
| `objeto-forma` | la **forma** de la pieza aislada | su fondo de estudio |
| `prenda-puesta` | la **prenda** y cómo cae en un cuerpo | **la persona** que la lleva |
| `macro-marca` | el **emblema en grande** | — |

Por eso una referencia **no se puede mover de cajón sin cambiar lo que el prompt afirma sobre ella**, y
por eso el cajón equivocado no es un problema de orden: es un problema de contrato.

## Los tres slices

1. **Enumerador canónico** en el catálogo, con `CLAVES_DE_REFERENCIA` (clave → rol) y
   `CLAVES_SIN_ARCHIVO`. El sellador pasa a ser un wrapper de una línea.
2. **Gates derivados del catálogo**: `Object.keys(PERSONAS)` en vez de literales, y el gate del lock
   recorre `referenciasDeclaradas()`.
3. **Errores que enseñan el cajón**: pedir `vestuario: 'polo-efeonce'` responde *«SÍ existe, pero es un
   kit de marca: se pide por `objetos`»*, con el ejemplo de ficha. Y el simétrico.

## Defensa en profundidad

| Capa | Qué detiene |
|---|---|
| Enumerador único | que un consumidor enumere distinto |
| **Detector de drift de forma** | una clave nueva **sin clasificar** — falla pidiendo clasificarla |
| Contrato de roles | un rol usado sin declarar qué copia e ignora |
| Gate del lock derivado | un archivo declarado y sin sellar |
| Errores que enseñan | el cajón equivocado, en el momento de pedirlo |

**El detector se vio fallar**: inyectando una clave `lookbookNuevo` sin clasificar, el test falla con
el mensaje que dice exactamente qué hacer; al revertirla, vuelve a verde. Un detector que nunca se vio
fallar no está probado.

## Los cuatro pilares

- **Safety** — el riesgo es de **marca**, no de permisos: un asset fuera del lock puede sustituirse y
  publicar una pieza con una referencia que el equipo nunca aprobó. Los cinco macros del emblema
  estaban exactamente en ese estado.
- **Robustness** — olvidar declarar ahora **rompe el test** en vez de desaparecer. El fallo pasa de
  silencioso a ruidoso, que es el único cambio que importa.
- **Resilience** — antes la detección era un humano mirando una hoja de contacto; el gate lo dice
  ahora antes de gastar en una tanda.
- **Scalability** — un rol nuevo es **una entrada** en `CLAVES_DE_REFERENCIA`; los consumidores no se
  tocan. Antes eran tres ediciones y un olvido probable.

## Alternativas rechazadas

- **Reescribir a `referencias: [{rol, ruta}]`** — correcto, pero big-bang sobre un archivo que tres
  sesiones tocaron el mismo día. Se gana por evolución desde aquí.
- **Heurística que detecte rutas recorriendo el objeto** — adivina en vez de declarar; el fallo
  vuelve a ser silencioso cuando la heurística no acierta.
- **No hacer nada y confiar en la revisión** — ya falló tres veces.

## Reglas duras

- **NUNCA** enumerar referencias fuera de `referenciasDeclaradas()`. Si necesitas una lista de
  archivos del catálogo, consúmela; no recorras campos.
- **NUNCA** agregar una clave al catálogo sin clasificarla en `CLAVES_DE_REFERENCIA` o en
  `CLAVES_SIN_ARCHIVO`. El test lo impide, y esa es la red.
- **NUNCA** escribir un gate que recorra una lista literal de personas, kits o vistas. Deriva del
  catálogo: si un cambio legítimo obliga a editar el gate, está mal el gate.
- **SIEMPRE** que agregues un rol, declara en `ROLES_DE_REFERENCIA` qué copia y qué ignora.
- **SIEMPRE** resella el lock tras tocar el catálogo (`pnpm foto:assets:lock`) y commitea el lock.

## Abierto deliberadamente

Si el rol debe ser enum cerrado o cadena libre — se decide mejor con un cuarto rol a la vista. Y si el
catálogo debe salir de `scripts/` hacia un paquete propio: es pregunta de EPIC-026 y este problema no
la fuerza.

# Lente de los datos SEO — medido (●) vs estimado (◑)

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-08-29 por Claude Opus 5 (TASK-1785)
> **Ultima actualizacion:** 2026-09-03 por Claude (TASK-1805: la metodología ETV es una procedencia adicional de la lente estimada, no una tercera lente)
> **Documentacion tecnica:** [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md §5](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) · [MCP_TOOL_SURFACE_INVARIANTS.md](../../architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md)

## Qué problema resuelve

El módulo SEO trabaja con dos tipos de números que **se parecen mucho y significan cosas distintas**:

| | Qué es | De dónde sale |
|---|---|---|
| **● Medido** | Lo que le pasó de verdad a tu sitio, con usuarios reales | Google Search Console |
| **◑ Estimado** | Lo que el proveedor observa del mercado, consultando por su cuenta | DataForSEO |

Los dos hablan de "posición en Google". Pero la posición medida es un **promedio ponderado sobre
gente real que buscó**, y la estimada es la **posición exacta de una búsqueda que hicimos nosotros**,
desde una ubicación que elegimos, y que ningún usuario hizo.

Sumarlos, promediarlos o presentarlos como si fueran lo mismo produce un número **que no
corresponde a nada** — y presentado con la seguridad de un dato medido, que es lo que lo vuelve
peligroso.

## Qué cambió

Antes, la regla "no mezcles medido con estimado" estaba **escrita** en la descripción de cada
herramienta. Estaba bien escrita, y aun así no impedía nada: la mezcla no ocurre *dentro* de una
herramienta, ocurre **entre dos**, cuando alguien pide dos datos y redacta un párrafo. Ninguna
herramienta ve esa composición.

Ahora **cada cifra viaja con su lente puesta**. Quien la consume —una pantalla, Nexa, un cliente
MCP— no tiene que acordarse de dónde salió el número: lo tiene al lado, junto con la fecha en que
se capturó.

## Qué significa cada cosa

- **`lens: measured`** (●) — Search Console. La verdad del tráfico de tu propio dominio.
- **`lens: estimated`** (◑) — DataForSEO. La verdad del mercado, incluidos los competidores.
- **`capturedAt`** — la fecha de la captura que respalda esa cifra. Un número sin fecha se lee como
  vigente para siempre; por eso viaja siempre.
- **`null`** — *no lo medimos*. **Nunca es `0`.** Cero significa "miramos y no había"; ausencia es
  otra cosa, y confundirlas convierte un hueco en un hecho.

> **Un detalle que sorprende:** la posición del SERP comprado es **exacta**, y aun así es
> `estimated`. La distinción no es "exacto vs aproximado" — es **quién hizo la búsqueda**. Search
> Console promedia, y aun así es `measured`, porque cada impresión que promedia ocurrió de verdad.

## La fórmula del tráfico estimado no es una tercera lente (2026-09-03)

Desde `TASK-1805`, las cifras de tráfico estimado que salen del ETV del proveedor viajan además con
`etvMethodology`: la versión de la fórmula con que se calcularon (hoy `legacy_static_v1`), de dónde salió
esa versión y si la lectura es comparable consigo misma. Es una **procedencia adicional dentro de la
lente ◑ estimada** —dice *con qué fórmula* se estimó—, no una lente nueva: siguen existiendo dos lentes,
medida y estimada. Se reporta junto al `capturedAt` por la misma razón por la que viaja la fecha: un
número sin fecha se lee como vigente para siempre, y un ETV sin versión se lee como comparable con
cualquier otro ETV, cosa que desde el corte del proveedor (2026-11-01) deja de ser cierta. Detalle:
[Metodología detrás del tráfico estimado](modulo-seo-search-visibility-360.md).

## Vista de las dos lentes juntas

Existe una lectura que devuelve **las dos series a la vez, separadas y rotuladas**, para el mismo
conjunto de keywords. Sirve para responder "¿dónde está rankeando este cliente?" sin tener que pedir
dos cosas y decidir cómo combinarlas.

🔴 **No devuelve ningún número combinado, y eso es deliberado.** No hay un promedio, ni un
consolidado, ni un índice único — no porque falte, sino porque no existe forma honesta de fusionar
las dos. Cada lente trae además **su propia ventana de fechas**, porque no siempre cubren el mismo
período: la serie comprada suele empezar después que el historial medido.

Si una de las dos no se puede servir, se dice **por qué** (por ejemplo: la organización tiene varios
mercados activos y no se eligió ninguno). Eso es un estado, nunca un cero, y no invalida la otra
lente.

## Qué NO hace

- **No cambia ningún número.** Ninguna cifra vale distinto que antes; sólo ganó metadatos.
- **No decide por ti.** Sigue siendo criterio humano cuál lente mirar para cada pregunta.
- **No fusiona las lentes.** Si alguna vez se necesita un índice único, es una decisión de producto
  que exige su propia justificación documentada, no un campo más.

> **Detalle técnico:** el vocabulario único vive en `src/lib/growth/seo/lens.ts`; la lente se
> **deriva** de la fuente y no se guarda en ninguna columna (es constante por tabla, así que
> guardarla sólo podría desincronizarse). Los guards que lo hacen cumplir están en
> `lens-coverage.ts` y `lens-surface-manifest.ts`.

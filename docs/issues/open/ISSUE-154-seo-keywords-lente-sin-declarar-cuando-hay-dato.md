# ISSUE-154 — La tabla de oportunidades SEO deja de declarar la lente justo cuando hay dato que distinguir

- **Estado:** `open`
- **Detectado:** 2026-08-14, en el barrido documental de cierre de TASK-1661
- **Ambiente:** Producción (`/admin/growth/seo/keywords`)
- **Severidad:** Media — no rompe nada y no expone datos; corrompe la *lectura* de un número
- **Dominio:** `growth.seo` · UI
- **Relacionado:** `TASK-1308` (dueña de la superficie), `TASK-1661` (trajo el dato de mercado),
  `ISSUE-152` (el precedente de leer un número sin su contexto)

## Síntoma

El marcador de origen del dato aparece **sólo cuando NO hay dato de mercado**.

En `KeywordOpportunityMap.tsx:487` se renderiza `● {measured} · {marketUnavailable.description}` —
es decir, el marcador de lente se pinta exactamente en el caso en que no hay dos lentes que
distinguir. En cuanto `market` pasa a `'available'`, la tabla muestra **Volumen** y **Barrera de
enlaces** (`KeywordOpportunityTable.tsx:650-655`) **sin marcador `◑`, sin la palabra "estimado" y
sin su `capturedAt`**.

El contrato quedó implementado al revés: se declara la lente cuando no hace falta y se calla cuando
sí.

## Por qué importa

El módulo entero se sostiene sobre una distinción: **Search Console es demanda MEDIDA del cliente
(`●`) y DataForSEO es demanda ESTIMADA del mercado (`◑`)**. Son lentes complementarias que la
arquitectura prohíbe promediar (§1.1) — pero un operador sólo puede respetar esa regla si la pantalla
le dice cuál está mirando.

Hoy, en la misma fila y con el mismo peso visual, conviven:

| Columna | Lente real | ¿Lo dice la UI? |
|---|---|---|
| Posición, Impresiones, Clics, Ganancia | ● medida (GSC, del propio sitio) | implícito |
| Volumen, Barrera de enlaces | ◑ estimada (mercado, refresh **mensual**) | **no** |

Dos consecuencias concretas:

1. **El volumen se lee como propio.** Un operador puede reportarle a un cliente "tienes 49.500
   búsquedas" cuando ese número es del mercado, no suyo.
2. **El dato envejece invisible.** El proveedor refresca **una vez al mes**; sin `capturedAt` a la
   vista, un volumen de hace cinco semanas se lee igual de vigente que uno de ayer. Es exactamente
   lo que la migración de TASK-1661 previene en la base (`captured_at` es parte de la clave) y la
   UI vuelve a perder en el último metro.

Es el mismo error de lectura que `ISSUE-152`: un número correcto, presentado sin el contexto que lo
hace interpretable, se convierte en una afirmación falsa.

## Causa raíz

`TASK-1308` construyó la tabla cuando **no existía fuente de mercado**, así que el único estado
posible era `unavailable` — y ahí la leyenda `●` era suficiente y correcta. `TASK-1661` habilitó el
estado `available` **sin cambio de código en la UI** (era el objetivo declarado: que las columnas se
llenaran solas). Nadie revisó qué debía aparecer en el estado nuevo.

La lección es del tipo "el segundo estado de datos": la superficie estaba probada contra el único
estado que existía, y se comportó distinto — no mal, *incompleto* — cuando apareció el otro.

## Alcance de lo que hay que corregir

- Declarar `◑ Estimado · mercado` junto a las columnas de mercado cuando `market === 'available'`.
- Mostrar el `capturedAt` (as-of) de la captura, con su formato local.
- Conservar el `●` de la lente medida, hoy correcto, y que ambas convivan legibles.
- **`unknown` ya está bien resuelto** ("Sin dato", nunca "Baja") — no tocar esa parte.

## Por qué NO se corrigió de una vez

Es trabajo de UI y el contrato del repo lo exige con su proceso: dirección visual, wireframe,
estados, copy tokenizado en `src/lib/copy/growth.ts` y evidencia GVC desktop + móvil. Un parche
directo sobre el JSX pasaría el lint y saltaría el proceso que existe justamente para que la
pantalla no acumule decisiones sin dueño.

Queda como **`TASK-1691`**.

## Verificación al cerrar

- Con `market === 'available'`, la pantalla declara la lente estimada y su fecha de captura.
- Con `market === 'unavailable'`, se conserva el comportamiento actual (no hay regresión).
- Un operador puede responder, mirando la pantalla y sin preguntarle a nadie: *"¿este volumen es
  del cliente o del mercado, y de cuándo es?"*
- Evidencia GVC desktop + 390px.

## Nota de trazabilidad

Este hallazgo lo levantó un subagente auditor **fuera de su alcance asignado** (revisaba
documentación, no código) y lo reportó en vez de callarlo. Sin eso, la documentación de TASK-1661
—que afirma en tres archivos que "todo dato de mercado viaja con su fecha de captura"— habría
quedado describiendo un comportamiento que el runtime no tiene.

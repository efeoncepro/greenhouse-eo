# TASK-1691 — Declarar la lente estimada y su fecha de captura en la tabla de oportunidades SEO

> **Tipo:** Wireframe / contrato de implementación
> **Creado:** 2026-08-14 por Claude (Opus 5)
> **Superficie:** `/admin/growth/seo/keywords` — ruta de TASK-1308
> **Issue de origen:** [`ISSUE-154`](../../issues/open/ISSUE-154-seo-keywords-lente-sin-declarar-cuando-hay-dato.md)
> **Rigor:** `ui-lite` — no hay layout nuevo ni primitive nueva; se añade una declaración de origen
> y una fecha a una superficie ya construida y aprobada.

## El problema, en una frase

El marcador de lente aparece **sólo cuando no hay dato de mercado**; en cuanto lo hay, las columnas
estimadas se muestran sin decir que lo son y sin su fecha.

## Estado actual verificado en el código (no supuesto)

| Dónde | Qué hace hoy |
|---|---|
| `KeywordOpportunityMap.tsx:487` | Renderiza `● {source.measured} · {states.marketUnavailable.description}` — el marcador vive en el caso `unavailable` |
| `KeywordOpportunityTable.tsx:650-655` | Con `market === 'available'` pinta `Volumen` y `Barrera de enlaces` **sin marcador ni fecha** |
| `KeywordOpportunityTable.tsx:307-309` | `marketCell(null)` → `states.marketUnavailable` con su tooltip. **Correcto, no tocar** |
| `contracts.ts` → `KeywordOpportunitiesResult` | Expone `market: 'available' \| 'unavailable'` pero **NO** la fecha de captura |
| `keyword-market-data.ts` → `readKeywordMarketData` | **Sí** calcula `freshness.latestCaptureDate`, y `keyword-opportunities-reader.ts` lo **descarta** |

🔴 **Consecuencia de la última fila: esto NO se resuelve sólo en la vista.** El dato existe en el
reader de mercado y se pierde en el de oportunidades. Hay una pieza de contrato antes que la de UI.

## Regiones y qué cambia

```
┌─ KeywordOpportunitiesView ─────────────────────────────────────────────┐
│                                                                        │
│  [ KeywordOpportunityMap ]   ← scatter de ejes MEDIDOS. NO cambia.     │
│      pie: ● Medido · Search Console        (hoy y después)            │
│                                                                        │
│  ┌─ KeywordOpportunityTable ────────────────────────────────────────┐  │
│  │ Keyword │ Pos │ Impr │ Clics │ Ganancia │ Conf │ Volumen │ Barrera│  │
│  │         └────── ● medido (GSC) ────────┘ └── ◑ estimado ──┘      │  │
│  │                                                                   │  │
│  │  ▲ NUEVO: las dos columnas de mercado quedan agrupadas bajo una   │  │
│  │    declaración de lente con su as-of.                             │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ▲ NUEVO (footer de la tabla, sólo si market === 'available'):         │
│    ◑ Estimado · mercado — datos al {capturedAt}. No es demanda de      │
│      tu sitio: es del mercado, y se actualiza una vez al mes.          │
└────────────────────────────────────────────────────────────────────────┘
```

**Decisión de encoding — por qué footer y no un badge por celda.** Un badge en cada celda repetiría
el mismo marcador 50 veces y competiría visualmente con el número, que es lo que el operador vino a
leer. La declaración va **una vez, donde termina el bloque de columnas que califica**, igual que el
`●` del scatter. Es también coherente con la decisión ya tomada y ratificada en el wireframe de
TASK-1308: el dato de mercado es **columna y filtro, jamás eje** — no compite con la medición, la
acompaña.

## Estados (los cuatro, ninguno inventado)

| Estado | Condición | Qué se ve |
|---|---|---|
| **Mercado disponible** | `market === 'available'` | Columnas + footer `◑ Estimado · mercado — datos al {fecha}` |
| **Mercado no disponible** | `market === 'unavailable'` | Sin columnas de mercado. Se conserva el `●` actual — **sin regresión** |
| **Keyword sin dato** | fila con `searchVolume: null` | Celda "Sin dato" con su tooltip (ya implementado, `marketCell`) |
| **Barrera desconocida** | `linkBarrier === 'unknown'` | "Sin dato", **jamás "Baja"** (ya implementado) |

⚠️ **Caso borde real:** `market === 'available'` significa "hay dato para al menos una keyword de la
selección", no para todas. El footer declara la lente del **bloque de columnas**, y la ausencia
por-keyword la sigue diciendo la celda. No se contradicen: uno habla de la fuente, la otra de la
cobertura.

⚠️ **Fecha faltante:** si `capturedAt` viene `null` (no debería con `available`, pero es un
`string | null`), el footer declara la lente **sin** inventar fecha ni ocultar la declaración.
Existe token para eso: `freshnessUnknown: 'Sin fecha de corte disponible'`.

## Copy — qué reusar y qué falta

**Ya existe** en `src/lib/copy/growth.ts` → `GH_GROWTH_SEO_PERFORMANCE.source`:

- `measured: 'Medido · Search Console'` ✅ reusar
- `estimated: 'Estimado · DataForSEO'` — ⚠️ **su `estimatedHint` habla de rank capture** (*"posición
  exacta observada en la búsqueda"*), que NO es esta lente. Aquí la lente estimada es **volumen de
  mercado**, no posición. **NO reusar el hint**; el label sí sirve.
- `mixHint: 'Son dos mediciones distintas de la misma realidad. Nunca se promedian entre sí.'` ✅
  reusar — es exactamente el porqué.
- `freshnessUnknown: 'Sin fecha de corte disponible'` ✅ reusar para el borde.

**Falta crear** en el namespace de la tabla de keywords (`GH_GROWTH_SEO_*` que ya usa
`copy.table.*`), validado con `greenhouse-ux-writing`:

| Clave | Propósito |
|---|---|
| `marketLensLabel` | `◑ Estimado · mercado` |
| `marketLensAsOf` | `Datos al {date}` — con la fecha interpolada, formato local es-CL |
| `marketLensHint` | Por qué no es demanda propia y que se actualiza mensualmente |

🔴 **NUNCA** literal en JSX: la regla `greenhouse/no-untokenized-copy` cubre esta superficie.

## Accesibilidad

- El footer es texto real, no sólo un glifo: `◑` es decorativo y va con `aria-hidden`.
- La declaración se asocia al grupo de columnas con `aria-describedby` desde los `<th>` de Volumen y
  Barrera, para que un lector de pantalla la anuncie al entrar en esas celdas — no sólo quien la ve.
- Contraste del texto secundario ≥ 4.5:1 (WCAG 1.4.3); no depender del color para distinguir lentes,
  que es justamente el error que este cambio corrige en su versión visual.

## Verificación

- **GVC desktop + 390px** sobre `/admin/growth/seo/keywords` con la org de Berel (tiene dato de
  mercado MX real capturado el 2026-08-13, así que el estado `available` es reproducible).
- Segundo escenario con una org **sin** dato de mercado, para probar que no hubo regresión en el
  estado `unavailable`.
- Sin scroll horizontal a 390px.

## Lo que este wireframe NO decide

- No cambia los ejes del scatter (decisión de TASK-1308, vigente y correcta).
- No agrega selector de mercado — eso es el follow-up diferido de `ISSUE-153`, con su propio
  disparador.
- No toca la derivación de la barrera (`deriveLinkBarrier`), que ya quedó cerrada en TASK-1661.

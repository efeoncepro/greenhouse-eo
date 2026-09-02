# Flow — TASK-1693 · De «veo 50 de 312» a recorrer la corrida, y de adivinar seeds a partir de la demanda medida

> **Alcance parcial, igual que su wireframe.** El flujo completo de la lente `Descubrir` —de seed a
> decisión gobernada— vive en
> [`TASK-1665-growth-seo-keyword-discovery-workbench-flow.md`](TASK-1665-growth-seo-keyword-discovery-workbench-flow.md)
> y sigue vigente. Acá viven **sólo los dos callejones sin salida que TASK-1693 cierra** y el camino
> nuevo que abren.

## Por qué este documento existe

Dos capacidades ya construidas y pagadas no llegan al operador, y el flujo vigente las muestra como si
no existieran:

1. **El recorrido se corta en la fila 50.** Una corrida materializa hasta 500 candidatos; la page pide
   la primera página y descarta `nextCursor`. TASK-1665 mitigó la mentira —la tabla dice «50 de 312» y
   avisa— pero el aviso vigente admite el corte con todas sus letras: *«se podrá recorrer cuando la
   lente tenga paginación»*. El operador ya pagó por esos 262 candidatos y no puede verlos.
2. **La seed se adivina aunque la plataforma sepa cuáles importan.** `resolveSeeds` cubre cinco
   fuentes; el workbench manda `seedSource: 'manual'` fijo. La fuente de mejor oficio —consultas de
   Search Console, demanda **medida**, resolución **sin costo de proveedor**— existe con su copy ya
   escrito y sin un solo consumidor.

## Los dos caminos nuevos

### A — Recorrer la corrida completa

```
corrida terminada, 312 candidatos
        │
        ▼
page (server) → readKeywordDiscovery({ runId, limit: 50 })
        │  candidates[50] · totalCandidates 312 · nextCursor "50"
        ▼
workbench acumula en estado local ──► Results pinta 50 + afordancia «Cargar 50 más»
        │
        │ operador activa la afordancia
        ▼
GET /api/admin/growth/seo/keyword-discovery?organizationId=…&runId=…&cursor=50
        │
        ├─ ok ──► append al final (sin desmontar ni reordenar lo ya leído)
        │          conteo → «100 de 312» · nextCursor "100"
        │          anuncio por la live region existente
        │
        └─ error ──► lo cargado se conserva · `loadMoreError` en la live region
                     reintento SÓLO si el error canónico trae actionable: true
        │
        ▼
nextCursor === null ──► la afordancia desaparece · conteo pasa a «312 candidatos»
                        · el aviso de truncado se retira
```

**Gate de entrada:** la afordancia **no existe** mientras la corrida esté `pending`/`running`. El
universo crece bajo los pies y el polling de 20 s ya reproyecta la primera página; paginar ahí
produciría filas duplicadas o saltadas sin aviso.

**Invariante de transporte:** el `cursor` viaja **tal cual lo devolvió el reader**. La UI nunca lo
compone ni lo incrementa por su cuenta: es un offset serializado sobre un orden en memoria, y
fabricarlo en cliente acoplaría la vista a un detalle que el reader puede cambiar.

**Invariante de gasto:** ninguna acción de este camino dispara un `POST`. Paginar es lectura pura y no
toca el presupuesto del proveedor. Es assertion del escenario GVC, no una promesa en prosa.

### B — Encolar desde una fuente medida

```
operador elige fuente en el builder
        │
        ├─ Consultas medidas (gsc_queries) ──► seeds desde seo_gsc_daily, 28 días, por impresiones
        ├─ Keywords seguidas (tracked_keywords) ─► seeds desde las membresías vigentes del target
        ├─ Seeds escritas (manual) ───────────► el textarea, como hoy
        └─ Dominio propio (target_domain) ────► sin seeds; obliga keywords_for_site
        │
        ▼
banda de costo estima POR FUENTE
   (con gsc/tracked el conteo de seeds NO sale del textarea; con dominio no hay seeds)
        │
        ▼
POST intent:'queue' { seedSource, manualSeeds?, mixedMeasuredSource?, methods }
        │
        ├─ ok ──► runId en la URL (replace) → router.refresh() → estado de corrida
        │
        └─ rechazo tipado del primitive
              no_gsc_queries ─────────────────► «No hay consultas medidas» + por qué
              no_tracked_keywords ───────────► «Todavía no sigues keywords» + por qué
              target_domain_requires_…_site ─► el método se corrige antes de poder enviar
```

**Invariante de honestidad:** una fuente sin insumo se muestra **no disponible con su razón**, y el
envío queda bloqueado. **Jamás** se degrada a `manual` en silencio: el operador creería que corrió lo
que pidió y leería los resultados como si vinieran de su Search Console.

**Invariante de lente:** que las seeds sean `●` medidas **no vuelve medidos los candidatos**. El
proveedor devuelve estimaciones y la tabla las sigue marcando `◑`. Ninguna etiqueta puede sugerir lo
contrario — es el invariante §1.1 del módulo, y romperlo acá lo rompería en el lugar donde más se
mira.

## Filtros: por qué server-side y no en cliente

Los filtros del canvas (`q`, `source`, `intent`, `state`, `status`, `minVolume`, más `maxLinkBarrier`
de TASK-1694) viajan por URL con la allowlist ya escrita en `keyword-discovery-query.ts` y se aplican
**en el reader**.

Filtrar en cliente sobre la página cargada produciría un conteo falso: diría «3 candidatos» mirando 50
filas cuando el universo filtrado tiene 40 repartidos en páginas que nadie trajo. El conteo visible
tiene que seguir a los filtros activos sobre el **universo**, no sobre lo que alcanzó a bajar — y esa
es exactamente la mentira por omisión que TASK-1665 ya había tenido que mitigar una vez.

`maxDifficulty` **no se ofrece**: TASK-1694 lo declara no-op y lo reporta en `ignoredFilters`. Si llega
por URL, la superficie lo dice; nunca lo pinta como aplicado.

## Estados de error y a dónde llevan

| Error | Origen | Qué ve el operador | Salida |
|---|---|---|---|
| Falla la página siguiente | `GET` de la ruta | `loadMoreError` en la live region; **las filas cargadas siguen ahí** | Reintentar sólo si `actionable: true`; si es estructural, no se ofrece |
| `no_gsc_queries` | `resolveSeeds` | La opción queda no disponible con `sourceGscUnavailable` antes de poder enviar | Elegir otra fuente o conectar Search Console |
| `no_tracked_keywords` | `resolveSeeds` | Igual, con `sourceTrackedUnavailable` | Elegir otra fuente o seguir keywords primero |
| `target_domain_requires_keywords_for_site` | validación de métodos | El método se restringe antes del envío, no se rebota después | Ninguna: la UI no deja armar la combinación inválida |
| `seo_budget_exhausted` / `provider_error` | gate y proveedor | Camino vigente de TASK-1665, sin cambios | El de siempre |

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/growth-seo-keyword-discovery.scenario.ts` (se extiende).
- Quality profile: premium
- **Viewports:** desktop 1440×900 y mobile 390×844.
- **Baseline decision:** contra la baseline de TASK-1665 de la misma surface; delta esperado en el
  builder (selector de fuente) y en el pie del canvas (afordancia). Delta en el canvas o el drawer =
  regresión, no rebaseline. Se declara en `BASELINE_DELTAS.md`.
- **Review dossier:** `pnpm fe:capture:review growth-seo-keyword-discovery`.
- **Scroll-width evidence:** `documentElement.scrollWidth <= clientWidth` medido y capturado en 1440 y
  en 390px.
- **Assertions de flujo:** paginar **no** dispara `POST`; el conteo servido crece y el total no cambia;
  con corrida viva la afordancia no está en el DOM; una fuente sin insumo no permite enviar.

## Design Decision Log

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Acumular páginas en estado del cliente | Re-pedir todo con `limit` mayor en cada click | Re-pedir descarta y vuelve a pintar lo ya leído, y sobre una tabla de nueve columnas es trabajo visible. Acumular conserva el ancla de comparación |
| La afordancia desaparece al agotar el cursor | Dejarla `disabled` | Un control apagado invita a averiguar cómo encenderlo. Cuando ya se recorrió todo, lo verdadero es que no hay nada más que traer |
| Disponibilidad de fuente resuelta server-side | Descubrirla con el rebote del enqueue | El rebote llega **después** de que el operador confirmó; la razón tiene que decirse antes, no después |
| Estimar costo por fuente | Dejar la banda muda sin seeds escritas | Hoy `estimate` devuelve `null` sin seeds en el textarea: los modos nuevos quedarían sin cifra justo donde el operador no escribió nada y necesita saber qué va a pagar |
| Reusar la live region del workbench | Montar una para la paginación | Dos regiones vivas compiten y el lector anuncia una sola, de forma impredecible |

## Lo que este flujo NO cambia

- El polling de 20 s de corrida viva (TASK-1665) y su barra indeterminada.
- El drawer de candidato, sus cuatro acciones y su restauración de foco.
- El conmutador de lentes (compartido con TASK-1660).
- El orden gobernado del reader y sus llaves de desempate.
- El camino de gasto: sigue siendo `POST intent:'queue'` con recálculo server-side antes de persistir.

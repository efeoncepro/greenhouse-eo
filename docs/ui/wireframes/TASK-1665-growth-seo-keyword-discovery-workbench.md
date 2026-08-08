# Wireframe — TASK-1665 · Workbench diario de keyword discovery

> **Tipo de documento:** contrato de layout, contenido, estados y responsive transformation.
> **Task:** [TASK-1665](../../tasks/to-do/TASK-1665-growth-seo-keyword-discovery-workbench.md)
> **Flow:** [TASK-1665 flow](../flows/TASK-1665-growth-seo-keyword-discovery-workbench-flow.md)
> **Dirección:** [TASK-1665 direction](../visual-directions/TASK-1665-growth-seo-keyword-discovery-workbench-direction.md)
> **Superficie base:** `/admin/growth/seo/keywords`, nodo S3 de EPIC-022.
> **Targets:** 1440×900 y 390×844.

## Qué pregunta responde

La lente Oportunidades responde **"¿qué empujo de lo que ya aparece?"**. La lente Objetivos responde
**"¿dónde quiere estar el cliente?"**. Descubrir responde la pregunta de operación que falta:

> **"¿Qué nuevas búsquedas puedo investigar ahora, qué evidencia tengo y qué acción merece cada una?"**

No es una pantalla de provider operations. Es el punto donde una seed se convierte en una lista de
decisiones, pero sólo después de mostrar costo, procedencia, fecha y límites.

## Composition contract

No se crea route. La page existente conserva el guard, breadcrumb, Space y header; la lente local usa
el mismo mecanismo que Oportunidades/Objetivos.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Growth / Search Visibility / SEO / Keywords   Space ▾  Mercado  Datos hasta │
│ [Oportunidades] [Objetivos · 12] [Descubrir]                  [última corrida]│
├──────────────────────────────────────────────────────────────────────────────┤
│ DESCUBRIR KEYWORDS                                                           │
│ Encuentra términos relacionados a partir de seeds y decide qué hacer después.│
│                                                                              │
│ Seeds                                                                        │
│ ┌──────────────────────────────────────────────────────┐  Fuente             │
│ │ pintura industrial                                   │  [GSC medido]       │
│ │ recubrimiento epóxico                               │  [Keywords seguidas]│
│ └──────────────────────────────────────────────────────┘  [Dominio propio]   │
│ 2/10 seeds · duplicados eliminados                           Métodos         │
│                                                               [Sugerencias]  │
│ Mercado heredado: Chile · es-CL               Alcance [Rápido 25] [Completo]│
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │ 20 llamadas · hasta 500 filas · estimado ◑ US$… · cupo disponible …       │ │
│ │ Los resultados son estimados de mercado. El seguimiento posterior genera  │ │
│ │ gasto recurrente y requiere otra confirmación.              [Descubrir]  │ │
│ └──────────────────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────────┤
│ ÚLTIMA CORRIDA · Completada · 42 candidatos · costo real ◑ · as-of …          │
│ Sugerencias ✓ · Relacionadas ✓ · Ideas — · 1 fuente parcial                  │
├───────────────────────┬──────────────────────────────────────────────────────┤
│ FILTROS               │ CANDIDATOS                                            │
│ Buscar keyword        │ Keyword             Origen       Vol.  KD  Estado  ⋯ │
│ Procedencia           │ pintura industrial   Sugerencias  ◑…   ◑…  Nuevo   … │
│ Intención             │ recubrimiento…       GSC ●        ●…   ◑…  Objetivo… │
│ Estado                │ …                                                      │
└───────────────────────┴──────────────────────────────────────────────────────┘
```

### Chrome invariants

- `GreenhouseBreadcrumbs` usa `kind='workbenchHierarchy'`; último item = `Keywords`.
- `WorkbenchHeader kind='report'` contiene título, Space/mercado/frescura y links de las lentes. No
  se repite un título dentro de `primary`.
- `Descubrir` es link activo, no `tablist` con panel en memoria, consistente con S1–S3.
- El builder y el resultado son dos superficies semánticas; no se añade un wrapper card sólo para
  separar espacio.
- `data-ui-surface` en builder, run-status, results y drawer para GVC.

## Region R0 — Header de contexto

### Desktop

| Elemento | Contrato |
|---|---|
| Breadcrumb | `Growth / Search Visibility / SEO / Keywords`; ancestros linkeables |
| Space | picker canónico, estado server-side; el query param es compartible, no autoridad |
| Mercado | `location_code + language_code` del target; label legible y no truncado |
| Frescura | `GSC: datos hasta …` + `Labs: actualizado …` cuando exista; no falsa frescura global |
| Última corrida | timestamp, estado, candidates y costo real; link/scroll a status |
| Lentes | Oportunidades, Objetivos, Descubrir; contador sólo si reader tiene count real |

### Mobile

- Breadcrumb compacto y header no consume todo el primer viewport.
- Space y mercado ocupan filas completas; el valor activo nunca se corta por un `2-up` agresivo.
- Frescura y última corrida pasan a una disclosure semántica si no caben, pero no desaparecen.

## Region R1 — Builder de discovery

Es el command surface, no un formulario de configuración permanente.

### Controles exactos

#### A. Seeds

- Label visible: `Seeds para investigar`.
- Input: textarea/token input con una seed por línea; conserva saltos y texto durante errores.
- Counter: `N/10 seeds` después de normalización; `N` no cuenta duplicados.
- Helper: explica que una seed es punto de partida, no keyword monitoreada.
- Validation:
  - vacío → `Agrega al menos una seed`;
  - >10 → `Reduce la lista a 10 seeds`;
  - >80 caracteres o >10 palabras → error en esa seed;
  - solo whitespace → inválida;
  - duplicado → se elimina del conteo y se anuncia `Se quitó 1 duplicado`.
- No autocorrección semántica: no cambia tildes, singular/plural ni idioma por suposición.

#### B. Fuentes

Cada fuente es un control con label, costo y significado:

| Fuente | Default | Costo | Copy obligatorio |
|---|---|---:|---|
| `GSC medido` | ON si hay queries | `$0` | `Consultas reales de tu Search Console (últimos 28 días)` |
| `Keywords seguidas` | ON si hay set | `$0` | `Términos ya monitoreados; no crea seguimiento nuevo` |
| `Seed manual` | ON si input no vacío | `$0` | `Texto que ingresaste como punto de partida` |
| `Dominio propio` | OFF | `◑` | `Busca keywords asociadas al dominio en Labs; puede costar` |

GSC/seguidas son fuentes de seed, no un filtro que modifique el mercado. Si no hay datos GSC, el
control no se muestra deshabilitado sin explicación: se muestra con estado `No hay consultas medidas`.

#### C. Métodos

Multi-select cerrado con máximo 3:

- `Sugerencias`: frases que contienen la seed con términos añadidos.
- `Relacionadas`: búsquedas relacionadas del índice Labs.
- `Ideas`: términos de la misma categoría de las seeds.

Default: `Sugerencias` y `Relacionadas` cuando hay seed; `Ideas` queda opt-in para controlar el ancho
del resultado. Nunca se acepta un endpoint libre ni el método `domain_intersection` en este workbench.

#### D. Mercado y alcance

- Mercado es heredado del target y sólo se puede cambiar si existe un selector canónico de mercados
  habilitados; no se escribe `location_name` libremente.
- Mostrar `Chile · es-CL` como label, pero enviar `location_code`/`language_code` del DTO.
- Alcance: `Rápido · 25 filas` o `Completo · 50 filas`; el límite se aplica por endpoint/seed según
  el contract de 1664.
- La opción Completo no significa "todas las keywords" y nunca se presenta como exhaustiva.

#### E. Cost preview y CTA

La banda de costo aparece cuando el builder está sintácticamente válido. Contiene:

1. `N llamadas estimadas`;
2. `Hasta N filas solicitadas`;
3. `Costo estimado máximo ◑ US$…`;
4. `Presupuesto disponible US$…` o `Cupo no disponible`;
5. `Los datos de Labs son estimados y pueden quedar parciales`;
6. CTA `Descubrir keywords`.

Reglas:

- sin seed/método → no preview numérica, CTA disabled con motivo;
- GSC-only → `US$0 de proveedor`, pero no ocultar que la corrida materializa una nueva lectura;
- budget block → costo visible + camino `Reduce el alcance`/`Revisa el cupo`, sin retry ciego;
- flag OFF → explicación + CTA no renderizado;
- permiso read-only → builder visible como explicación, CTA no renderizado;
- al cambiar seeds/métodos, actualizar costo con debounce y `aria-live` polite, no en cada carácter.

### Builder loading/error

- `loading`: skeleton conserva alturas de seed, options, preview; no desplaza el CTA abruptamente.
- `error de validación`: error junto al control; no banner genérico arriba.
- `error de reader`: conserva input escrito; permite reintentar sólo si el error es actionable.

## Region R2 — Run status

Es una banda persistente debajo del builder y antes del resultado. No es un spinner global.

### Contract visual

```text
ÚLTIMA CORRIDA · 2026-08-08 10:14
[Sugerencias ✓] [Relacionadas ✓] [Ideas sin ejecutar]
42 candidatos · US$0.18 real · Labs actualizado 2026-08-07
```

Estados:

| Status | Titular | Detalle | CTA |
|---|---|---|---|
| `queued` | `Corrida en cola` | `Se ejecutará fuera de esta pantalla` | `Ver otra lente` |
| `running` | `Investigando seeds` | endpoint/seed actual; no porcentaje falso | `Actualizar estado` |
| `succeeded` | `Corrida completada` | candidates, costo real, as-of | `Ver candidatos` |
| `partial` | `Corrida parcial` | fuente/endpoint que no terminó + lo materializado | `Revisar` / nueva corrida |
| `no_results` | `No encontramos candidatos` | respuesta válida, sin filas | `Cambiar seeds o método` |
| `budget_blocked` | `Corrida detenida por cupo` | costo ejecutado y etapa detenida | `Reducir alcance` |
| `provider_error` | `No pudimos completar la corrida` | error canónico, sin raw message | `Nueva corrida` |
| `stale` | `Datos anteriores` | fecha de captura y razón | `Nueva corrida` |

`running` no afirma una cantidad de filas futura. Si se conoce el endpoint actual se nombra; si no,
se dice `Procesando la corrida`.

## Region R3 — Decision canvas de candidatos

### Filtros

Desktop muestra un rail liviano con:

- búsqueda por keyword;
- procedencia;
- intención (`informational`, `commercial`, etc. cuando exista; `Sin dato` incluido);
- estado (`Nuevo`, `Ya seguido`, `Objetivo`, `Descartado`, `Preparando AEO`);
- volumen mínimo y difficulty máxima, sólo si existe el dato;
- botón `Limpiar filtros`.

Los filtros se escriben en query params `discoveryRun`, `q`, `source`, `intent`, `state`, `minVolume`,
`maxDifficulty`. El server valida enum/rango y cae al default ante valores inválidos.

Mobile: un botón `Filtros (N)` abre drawer con foco; la cantidad activa es visible; al aplicar, el foco
vuelve al botón y el heading de resultados anuncia el conteo.

### DataTableShell desktop

La tabla no es una nueva primitive. Usa la variante densa aprobada y estas columnas:

| Columna | Contenido | Fallback honesto |
|---|---|---|
| Keyword | texto completo + link/detail | nunca truncar sin title/accessible full text |
| Procedencia | label + icon | `Origen no disponible` sólo si contrato lo entrega null |
| Cluster | `core_keyword` | `Sin agrupador` |
| Intención | valor + probabilidad | `Sin dato de intención` |
| Volumen | `◑ N/mes` + as-of corto | `Sin dato de mercado` |
| Dificultad | `◑ N/100` + as-of | `Sin dato de mercado` |
| Presencia propia | `● posición/URL` | `Sin medición propia` / `No aparece en la serie` |
| Estado | texto/chip | siempre texto, no color solo |
| Acción | menu/button por capability | `Sin acciones disponibles` si read-only |

No mostrar `competition` como `difficulty`, ni ordenar por un campo ausente. Si un candidate tiene
datos de GSC y Labs, ambos aparecen con su marker y fecha; el layout no intenta crear una cifra híbrida.

### Candidate compact card 390px

Orden fijo:

```text
Keyword completa                                  [Estado]
Sugerencias · Seed: pintura industrial
◑ 320 búsquedas/mes · ◑ dificultad 42 · as-of 2026-08-07
● Posición propia: 18 · URL: /recubrimientos
[Declarar objetivo] [Seguir oportunidad] [⋯]
```

La URL y provenance pueden abrir disclosure, pero no se eliminan. El menú de acciones es accesible
por teclado/touch y no depende de hover.

## Region R4 — Candidate drawer

### Apertura

- Trigger: keyword/link o `Detalles` de row/card.
- `aria-controls` apunta al drawer; `aria-expanded` refleja estado.
- Focus trap dentro del drawer; `Escape` cierra; focus restore al trigger.
- Si existe una acción pendiente o confirmación abierta, `Escape` primero cierra la confirmación y sólo
  después el drawer.

### Contenido

1. keyword y estado actual;
2. pregunta `¿Cómo llegó aquí?` con cadena seed → endpoint → corrida;
3. fuente y mercado;
4. `capturedAt`/`providerLastUpdatedAt`;
5. métricas Labs con `◑` y explicación paid vs organic;
6. medición GSC con `●` si existe;
7. explicación: `Sugerencia no significa seguimiento`;
8. acciones disponibles con su efecto exacto;
9. links de trayectoria/Objetivos/grounded draft según command.

### Confirmation copy

- Track target: `Declarar este objetivo lo incorpora al seguimiento diario y puede generar costo
  recurrente. Revisa el cupo antes de confirmar.`
- Track opportunity: `Seguir esta oportunidad la incorpora al seguimiento diario. No es sólo guardar la
  idea.`
- Grounded: `Preparar consultas crea un draft AEO para revisión. No activa el set ni ejecuta un run.`
- Dismiss: `Descartar sólo registra tu decisión; no borra la evidencia.`

El command devuelve outcome por candidate; la UI muestra cada outcome y no usa optimistic update para
una acción que compromete gasto.

## State catalogue completo

| Estado | ViewModel esperado | Wireframe |
|---|---|---|
| Flag OFF | `enabled=false`, reason | builder explica, CTA no renderizado |
| Sin Space/target | `target=null` | EmptyState + link configuración |
| Read-only | `canExecute=false` | lectura, sin CTA/action de gasto |
| Sin corrida | `run=null` | builder + empty canvas con 5 piezas: icono, título, explicación, CTA, link Oportunidades |
| Corrida queued | `run.status='pending'` | R2 visible, resultados previos no se borran |
| Corrida running | `running` | R2 persistente, tabla previa marcada stale si existe |
| Corrida success | candidates | R2 + R3 completa |
| Corrida partial | candidates + endpoint reasons | banner local + filas parciales |
| No results | `candidateCount=0`, provider ok | copy actionable, no error rojo |
| Budget blocked | blocked reason | costo ejecutado vs restante, reduce alcance |
| Provider error | canonical code | no raw error, retry explícito |
| Stale | freshness policy | as-of visible, no label "actual" |
| Candidate already tracked | `trackingState` | no duplicate CTA, link Objetivos/Oportunidades |
| Action pending | action status | botón disabled con `Procesando…`, aria-live |
| Mixed outcome | per-item outcomes | resumen mixto + cada fila marcada |

## Implementation mapping

- Route/page: `src/app/(dashboard)/admin/growth/seo/keywords/page.tsx` — resolver/activar lente sin
  duplicar guard.
- Existing shell: `src/views/greenhouse/admin/growth/seo/overview/SeoSearchVisibilityTabs.tsx` y
  sibling header recipe.
- View root: `KeywordDiscoveryWorkbench.tsx`.
- Builder: `KeywordDiscoveryBuilder.tsx`.
- Status: `KeywordDiscoveryRunStatus.tsx`.
- Results/table/card: `KeywordDiscoveryResults.tsx`.
- Drawer: `KeywordDiscoveryCandidateDrawer.tsx`.
- Client query state: `keyword-discovery-query.ts` — parse/serialize allowlisted query params.
- Reader/commands: `TASK-1664`; action commands `trackKeywords`/`TASK-1666`.
- Copy: `src/lib/copy/growth.ts`.
- Scenario: `scripts/frontend/scenarios/growth-seo-keyword-discovery.scenario.ts`.
- Manual: `docs/manual-de-uso/growth/descubrir-keywords-seo.md`.
- Markers: `seo-keyword-discovery-builder`, `seo-keyword-discovery-cost`,
  `seo-keyword-discovery-status`, `seo-keyword-discovery-results`,
  `seo-keyword-discovery-candidate-drawer`.

## Design decision log

- Reuse S3 route and shell; no new route/viewCode/menu.
- Cost preview is a first-class region because provider spend is part of the action, not an afterthought.
- Candidate table stays permanent because it is the exact-value/a11y fallback and provenance is essential.
- Drawer preserves context; modal is reserved for final governed confirmation.
- Markers remain present in mobile cards; disclosure may move detail but cannot erase semantics.

## Acceptance checklist

- [ ] The owning task declares this wireframe and its flow.
- [ ] Desktop and 390px layout are explicit and use the same data contract.
- [ ] Header uses the canonical recipe region; no chrome in `primary`.
- [ ] Builder controls, limits, cost preview and disabled reasons are complete.
- [ ] Every run state and action outcome has a visible copy contract.
- [ ] Data source/marker/as-of semantics are explicit and non-color dependent.
- [ ] Drawer opening/closing/focus/keyboard/reduced motion are explicit.
- [ ] Implementation mapping names real paths, primitives, commands, copy and GVC markers.
- [ ] Design decision log rejects the materially different alternatives.
- [ ] A reviewer can implement JSX without choosing new product semantics.

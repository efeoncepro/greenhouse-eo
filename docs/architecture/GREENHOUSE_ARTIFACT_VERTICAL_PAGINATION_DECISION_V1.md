# GREENHOUSE — Artifact Composer: paginación vertical determinista (ADR)

> **Status:** `Accepted`
> **Date:** 2026-09-21
> **Owner:** Platform (Artifact Composer) + Efeonce Insights (TASK-1847, EPIC-045)
> **Scope:** `src/lib/artifact-composer/render.ts` (medición) · `src/lib/artifact-composer/paginate.ts` (nuevo, domain-free) · `src/lib/artifact-composer/catalogs/insights-report/**` (nuevo) · TASK-1847 · consumidor futuro TASK-1672
> **Reversibility:** `two-way` — hoy no existe ningún catálogo vertical ni consumidor de la primitive. Pasa a `one-way-ish` en cuanto el segundo informe (TASK-1672) consuma `paginateFlow()`, que es justamente la razón de decidir la frontera ahora y no después.
> **Confidence:** `high` — la ausencia de paginación está medida en el código, no supuesta.
> **Validated as of:** 2026-09-21 — verificado en el repo: `page.pdf({ pageRanges: '1' })` (`render.ts:1098`) imprime exactamente una página por plantilla; el multipágina se arma por merge con `pdf-lib` (`mergeSlidePdfs`, `render.ts:826`); grep de `paginat|page-break|A4|portrait` sobre `src/lib/artifact-composer/**` y `scripts/artifact-composer/**` no devuelve hits funcionales; las 33 plantillas declaran viewport `1920×1080`, pero el viewport **sale del contrato de cada plantilla**, no del motor (el fixture de test ya compone un canvas vertical `800×1000`).

---

## Delta 2026-09-21 — el reparto es una función PURA (implementación del Slice 2)

Al implementar se precisó la frontera que este ADR describía como «medición + reparto». `measureSlideFit()`
responde **qué nodos del contrato se salen del lienzo** —es la medición que `assertSlideFitsCanvas` ya
hacía, ahora expuesta como consulta en vez de como aserción—, y `paginateFlow()` **no toca el navegador**:
recibe los bloques con su alto ya medido y reparte con aritmética.

La consecuencia importante es de verificación: el reparto completo —viudas, margen de guarda,
determinismo, rechazo de un bloque imposible, y la propiedad de que ningún bloque se pierda ni se
reordene— se prueba **sin levantar Chromium**. Un paginador que midiera dentro de un bucle de render
costaría un render por iteración y sólo sería observable a través de un PDF.

Lo que no cambia: la medición sigue siendo del motor, el reparto sigue siendo domain-free y fuera del
catálogo, y `OverflowPolicy = 'reject'` se respeta — un bloque que no cabe ni en una página vacía es
`BlockTooTallError`, nunca un corte.

## Context

`EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §6 compromete un informe vertical A4 con «retícula editorial
propia, portada/resumen/índice real para documentos largos, capítulos, tablas repetidas y anexos;
control de viudas, cortes y continuaciones», y deja escrita la regla de frontera:

> «La paginación vertical se resuelve mediante un plan de páginas determinista del catálogo; si un
> límite genuino exige extender el motor, TASK-1846 incorpora únicamente la primitive domain-free, y
> TASK-1847 conserva layout y resolvers. No hay fork.»

El límite genuino existe y está medido: **el motor no sabe repartir contenido entre páginas.** Su
modelo es «una lámina declarada = una página de tamaño fijo», y un bloque que desborda no salta de
página: lanza `SlideGeometryError` desde `assertSlideFitsCanvas` (`render.ts:979`, invocado en
`:1081`). Eso es correcto para un deck —donde el autor decide qué entra en cada lámina— y es
insuficiente para un informe de datos cuyo largo depende de la evidencia sellada de cada edición.

Dos hechos más acotan la decisión:

1. **El motor ya sabe medir.** `assertSlideFitsCanvas` mide los nodos `data-slot` / `data-slot-field`
   contra el viewport. Lo que le falta no es la capacidad de medir, sino **devolver esa medición en
   vez de lanzarla**.
2. **El requisito operativo es la composición por agentes y por automatización repetible**
   (instrucción del operador, 2026-09-21). Un diseño donde una persona maqueta cada hoja a mano
   —el patrón de `scripts/documents/render-channel-commerce-business-model.mjs`— satisface el
   formato y falla el requisito.

## Decision

Tres piezas con dueños distintos y una frontera explícita entre ellas.

### 1. `measureSlideFit()` — primitive domain-free del motor

Extraer la medición que `assertSlideFitsCanvas` ya realiza a una función que **responde** (cabe / no
cabe / en qué bloque se pasa) en lugar de lanzar. `assertSlideFitsCanvas` se conserva con su firma y
su error, implementado como el primer consumidor de la medición.

No cambia el contrato «una lámina = una página». No agrega flujo continuo al motor. El camino de
`Proposal` no invoca la primitive y no cambia de comportamiento.

### 2. `paginateFlow()` — reparto determinista, domain-free

Dado un flujo ordenado de bloques, un canvas y la medición, produce un plan de páginas: qué bloques
caen en cada página y en qué orden. Vive en el Composer, **no** en el catálogo Insights.

Vive fuera del catálogo por el test del segundo consumidor: si el reparto se escribe dentro de
`catalogs/insights-report/`, el informe de auditoría SEO (TASK-1672) no puede usarlo sin copiarlo, y
la tesis «el catálogo es dato» deja de ser verdad en la frontera donde más importa. `paginateFlow()`
recibe canvas y bloques como parámetros; **nunca** un identificador, un módulo ni un literal de
Insights.

### 3. `catalogs/insights-report/` — layout y resolvers

Plantillas A4 verticales, sus `.slots.json`, sus resolvers de geometría y su molde editorial. El pie
institucional y el folio son **slots `fixed-*` de la plantilla**, el patrón que `BackCoverFull` ya
usa para el URL bubble y el contacto.

Dueño: TASK-1847. Es lo que §6 llama «layout y resolvers».

### Dos consecuencias que caen solas

- **El índice converge en una pasada.** El precedente del repo (informe Berel, 55 páginas) necesita un
  bucle —`page-map.json` → render → comparar el outline → rebuild— porque quien pagina es el
  navegador y el número de página sólo se conoce después de imprimir. Acá el reparto ocurre **antes**
  de imprimir: el índice se resuelve con el plan de páginas en la mano.
- **El pie no necesita post-proceso.** Berel estampa logo, cabecera corrida, URL bubble y folio con
  PyMuPDF porque Chromium no soporta las margin boxes CSS (`@top-left`, `counter(page)`). Como cada
  página A4 es una lámina autocontenida, esos elementos son slots de la plantilla y viajan en el
  render, no en una pasada posterior sobre el PDF.

## Alternatives rejected

| Alternativa | Por qué no |
|---|---|
| **Plan de páginas determinista sin medición** (heurística de caracteres por página) | El juez real de «cabe» es el DOM renderizado, no el conteo de caracteres. Con texto y tablas de ancho variable produce rechazos o páginas a medio llenar, y deja al agente componiendo a ciegas contra un gate que rechaza — exactamente la fragilidad que el requisito pide evitar. |
| **Extender el motor con derrame de contenido real** | Un motor de flujo continuo cambia el contrato «una lámina = una página» para todos los consumidores, incluido `Proposal`, sin que ninguno lo necesite. Blast radius desproporcionado frente a exponer una medición que ya existe. |
| **Segundo motor sólo para el A4** (HTML→Chromium con flujo, o `@react-pdf/renderer`) | Es el fork que §6 prohíbe. Saca el informe del Artifact Worker, duplica fuentes, marca, gates y baseline visual, y crea una segunda definición de «documento Efeonce». El lane `react-pdf` además no tiene ningún caso de índice en el repo. |
| **Maquetar cada hoja a mano** (patrón `render-channel-commerce-business-model.mjs`) | Cumple el formato y falla el requisito: no es componible por agentes ni repetible por automatización, y no escala a un informe cuyo largo depende de la evidencia de cada edición. |

## 4 pilares

| Pilar | Evaluación |
|---|---|
| **Safety** | El catálogo no cruza autorización: recibe una proyección ya autorizada y no consulta stores. El co-branding se resuelve por allowlist cerrada de assets (`resolvers.ts:366`) **sin fallback** — un cliente ausente no se pinta, no se aproxima. Un brand pack de cliente nace `blocking` en el guard WCAG AA (`brand-pack.ts:158`). |
| **Robustez** | `OverflowPolicy = 'reject'` se conserva íntegro: un bloque que no cabe **ni solo en su propia página** es `render_rejected` con causa, nunca truncado. El reparto aplica un **margen de guarda** para que la variación de rasterización conocida (ISSUE-122) no mueva la asignación de páginas. Los presupuestos de slot siguen rechazando, no recortando. |
| **Resiliencia** | El plan de páginas es determinista y queda sellado en el `manifest` de la composición; el worker ya detecta drift por hash. Un fallo es recuperable por fase, como el resto del pipeline de render. |
| **Escalabilidad** | 30 páginas son 30 renders de una página más un merge: exactamente el camino que el motor ya recorre para un deck de 28 láminas. Costo lineal, sin punto de contención nuevo. El throughput sigue gobernado por el tick de 2 minutos del dispatcher, no por el catálogo. |

## Hard rules

- **NUNCA** el catálogo A4 implementa medición propia: consume `measureSlideFit()`.
- **NUNCA** `paginateFlow()` conoce Insights — ni un `if` de módulo, ni un id de bloque del primer
  informe, ni un valor por defecto tomado de él. Si necesita saber algo del dominio, es parámetro.
- **NUNCA** un bloque se trunca para encajar en una página: se reparte, o se rechaza con causa.
- **NUNCA** el pie, la cabecera o el folio se estampan en post-proceso sobre el PDF: son slots
  `fixed-*` de la plantilla.
- **SIEMPRE** el número de páginas se conoce antes de imprimir; un índice que exija una segunda
  pasada de render es señal de que el reparto se delegó al navegador.
- **SIEMPRE** que se agregue una plantilla al catálogo, se declara su frame en `BASELINE_DELTAS.md` y
  se congela con `--freeze` en la misma unidad de trabajo.

## Open questions

- **Margen de guarda del reparto:** su valor concreto se calibra con evidencia de render en el Slice 2
  de TASK-1847, no se fija en este ADR.
- **Familias de gráfico sin productor:** `ChartSpecV1` declara siete familias y el planner determinista
  hoy emite dos (`bar`, `bar_grouped`). Que las otras cinco se dibujen contra fixtures es decisión de
  TASK-1847; que alguien las **produzca** pertenece al planner (TASK-1845), no a este ADR.
- **Segundo consumidor real:** TASK-1672 (auditoría SEO) es el candidato declarado, pero no está
  comprometido con una fecha. Mientras exista un solo consumidor, la reutilización de
  `paginateFlow()` es una hipótesis verificada por su firma, no un hecho demostrado por uso.

## Consumers

- **TASK-1847** — primer y único consumidor hoy: catálogo `insights-report` y la salida `report_pdf`.
- **TASK-1672** — consumidor declarado del reparto para el informe de auditoría SEO; conserva sus
  findings, su frescura y sus gates, y no trae otro motor.
- **`Proposal`** — no consumidor. Su camino de render no cambia.

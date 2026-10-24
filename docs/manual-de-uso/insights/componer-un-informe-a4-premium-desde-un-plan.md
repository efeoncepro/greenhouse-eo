# Componer un informe A4 premium desde un plan

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-10-23 por Claude
> **Ultima actualizacion:** 2026-10-23 por Claude
> **Documentacion tecnica:** [EFEONCE_INSIGHTS_ARCHITECTURE_V1.md §6.2.1](../../architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md) · [runbook del gate visual](../../operations/runbooks/composer-visual-gate.md) · [estándar de informes Efeonce](../../operations/EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md)

> **Estado (2026-10-23):** disponible en `develop` local (commit `001683d83`, sin push). El comando corre en local y no
> depende de flags ni de producción. Las ediciones de Insights siguen su propio camino (vista previa y `artifact-worker`).

## Para qué sirve

Para producir un informe A4 de Efeonce (auditoría, diagnóstico, informe de resultados) con el mismo diseño aprobado
de Efeonce Insights, sin maquetar HTML a mano. Escribes un **plan**: qué tipo de página va en cada lugar y su contenido.
El catálogo `insights-report` elige la plantilla, valida cada texto contra su espacio y entrega el PDF.

Primer caso real: la auditoría SEO del Blog SKY del 23-10-2026, 23 páginas.

## Antes de empezar

1. Ten la evidencia cerrada: cada cifra con fuente, período y unidad (ledger de evidencia de la skill `report-studio`).
   El comando no calcula ni verifica cifras; las imprime tal como llegan.
2. Ten el logo oficial del cliente (SVG o PNG), en la versión para fondo oscuro si la portada es azul marino.
3. Ten clara la lectura: resumen → capítulos con su evidencia → hallazgos → escenarios o plan → límites → contraportada.

## Paso a paso

### 1. Escribir el generador del plan

El plan no se escribe a mano: lo produce un script versionado en el dominio dueño (para SEO, `scripts/seo/`). Copia la
estructura de [`scripts/seo/sky-blog-audit-report.ts`](../../../scripts/seo/sky-blog-audit-report.ts):

- **Contacto y pie** desde `src/config/efeonce-brand.ts` (`EFEONCE_CONTACT`), nunca recordados.
- **Folios, índice y referencias «p. NN»** calculados del orden de las páginas: si mueves una página, se recalculan.
- **`productLabel`** en la portada y en cada apertura de capítulo: el producto del informe («SEO», por ejemplo).
  «Insights» va sólo en informes de Insights.
- **Cada página** es `{ slideId, contentType, slots }`. El plan completo es `{ tenderId, slides: [...] }`. Los `slots`
  de cada tipo están en `src/lib/artifact-composer/catalogs/insights-report/<tipo>.slots.json`.

Tipos de página disponibles: `report-cover`, `report-cover-light`, `report-index`, `report-summary`, `report-chapter`,
`report-narrative`, `report-reading`, `report-table`, `report-plan`, `report-limits`, `report-back-cover`, las figuras
`report-figure-{comparison,columns,targets,trend,waterfall,waffle,donut,stacked,stat}` y, para auditorías:

| Tipo | Qué muestra | Reglas |
|---|---|---|
| `report-findings` | Registro de hallazgos ordenado por severidad, con evidencia y responsable | Hasta 6 por página. `severity` es `critical`, `high`, `medium` o `low` y siempre va con su `severityLabel` de texto («Crítico»). `alert` opcional para lo que no puede esperar, con la lista de afectados |
| `report-scenarios` | Columnas por mes y escenario contra el mismo mes del año anterior (línea discontinua) | 2–4 períodos y 1–3 escenarios con roles `low` (sin intervenir), `base` y `high` (estructural). Las tarjetas `scenarios[]` repiten los roles de `scenarioChart.series` en el mismo orden. Las columnas son estimaciones; sólo la referencia es un dato observado |
| `report-figure-trend` con anotaciones | Serie larga con etapas, hitos y rótulos | `lineAnnotations.bands[]` (etapas, tono `alert` para la que explica la lectura; no se superponen), `events[]` (un hito vertical, «Migración») y `pointLabels[]` (rótulo sobre un punto que tenga dato) |

### 2. Generar el plan

```bash
pnpm exec tsx scripts/seo/sky-blog-audit-report.ts outputs/<carpeta>/informe/<nombre>.plan.json
```

### 3. Componer el PDF

```bash
pnpm report:compose outputs/<carpeta>/informe/<nombre>.plan.json \
  --out outputs/<carpeta>/informe \
  --asset org-logo:<cliente>=<ruta/al/logo-negativo.svg>
```

- `--asset` entrega el logo que el plan referencia como `asset-ref:org-logo:<cliente>`. Una referencia sin archivo falla.
- Sin `--out`, la salida queda en `.captures/report-compose/`.
- El comando lista cada página compuesta y termina con el PDF, su número de páginas y su peso. No llama a ningún modelo
  de IA ni a la red.

### 4. Revisar todas las páginas

Abre el PDF completo y mira cada página a tamaño real: índice y folios correctos, «p. NN» apuntando a la página que
corresponde, logo del cliente en portada, contacto y burbuja URL en cada pie, y ningún rastro de trabajo interno (rutas,
códigos, nombres de herramientas). Aplica el barrido de `report-studio` antes de entregar.

## Qué significan los mensajes

| Mensaje | Qué pasó | Qué hacer |
|---|---|---|
| `✓ <tipo> <archivo>` | La página se compuso y pasó sus guardas | Nada |
| «no cabe: «<bloque>» termina N px sobre el pie. Acorta el copy; el pie nunca se cubre» | La **guarda del pie**: un bloque del cuerpo se montó sobre el pie | Acorta el texto de ese bloque o parte el contenido en dos páginas, en el generador |
| Un campo excede su espacio (`overflow: reject`) | Un texto supera su límite de caracteres o líneas | Reescribe más corto en el generador; el informe nunca recorta una frase |
| «las tarjetas y la figura no declaran los mismos roles en el mismo orden» | `scenarios[]` y `scenarioChart.series` no coinciden | Ordena ambos igual (`low`, `base`, `high`) |
| «el rótulo … nombra un punto sin dato» / «la etapa … apunta fuera del eje» / «dos etapas se superponen» | Una anotación de la tendencia no corresponde a la serie | Corrige el índice o el rango en el generador |
| `✗ …` con otro texto | El plan es incoherente o falta un asset | Lee la causa: nombra la página y el campo |

## Qué no hacer

- **No editar el PDF ni el plan JSON a mano.** Se corrige el generador y se vuelve a correr.
- **No editar la plantilla, el CSS ni el baseline del gate visual** para que una página quepa. Una guarda que falla es
  una señal de copy demasiado largo, no de plantilla mala. Cambiar el catálogo exige el
  [runbook del gate visual](../../operations/runbooks/composer-visual-gate.md) y su declaración en `BASELINE_DELTAS.md`.
- **No reducir la tipografía** ni poner un color sin rol a un hallazgo o escenario: severidad y escenario se pintan por rol.
- **No usar «Insights»** como `productLabel` en un informe que no es de Insights.
- **No entregar ni enviar** el PDF como parte de este paso: componer es preparar; distribuir requiere su propia autorización.

## Problemas comunes

- **La página de comparación con cinco métricas no cabe.** Es el caso que destapó la guarda del pie: acorta el cierre
  («Lo que significa» / «Próximo paso») o reparte las métricas en dos páginas.
- **Falla la referencia al logo del cliente.** El plan nombra `asset-ref:org-logo:<cliente>` y el comando no recibió ese
  `--asset`. Sobre la portada azul marino pasa la versión del logo para fondo oscuro.
- **Los folios no coinciden con el índice.** El generador escribió un número fijo; derívalo del orden de las páginas.

## Referencias técnicas

- CLI: `scripts/artifact-composer/compose-report.ts` (`pnpm report:compose`).
- Catálogo: `src/lib/artifact-composer/catalogs/insights-report/` (registro, plantillas, resolvers `report-severity` y
  `report-scenario-role`); figura de escenarios en `catalogs/insights-shared/figure-scenarios.ts`; guarda del pie en
  `catalogs/insights-shared/layout-hooks.ts`.
- Ejemplo completo: `scripts/seo/sky-blog-audit-report.ts` y `outputs/sky-blog-seo-audit-2026-10-23/informe/`.
- Oficio de informes: skill `report-studio` (overlay Efeonce).

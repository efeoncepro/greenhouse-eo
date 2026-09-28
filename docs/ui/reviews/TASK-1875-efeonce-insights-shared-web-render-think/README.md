# TASK-1875: dossier visual del informe compartido de Insights

> Superficie: `think.insights.shared` (`think.efeoncepro.com/insights/r/<token>`, repo `efeonce-think`).
> Capturado el 2026-09-28 contra `astro dev` con los fixtures del modelo `InsightWebModelV1` 1.1.
> Scorecard: [`../TASK-1875-efeonce-insights-shared-web-render-think.scorecard.json`](../TASK-1875-efeonce-insights-shared-web-render-think.scorecard.json)
> (promedio 4,56; piso 4,3 en iconografía).

## Cómo se reproduce

```bash
cd ../efeonce-think
pnpm dev --port 4331
node scripts/capture-insights-report.mjs ../greenhouse-eo/docs/ui/reviews/TASK-1875-efeonce-insights-shared-web-render-think
node scripts/verify-insights-report.mjs       # estados, cabeceras, no-leak, cifras, desborde, interacción, presentación, impresión
node scripts/audit-insights-a11y.mjs          # contraste AA contra el fondo real + recorrido con Tab (1440 y 390)
node --test tests/insights.test.ts            # vista y geometría de las 15 familias
```

El hub no usa el DSL GVC de Greenhouse. Las capturas son con `prefers-reduced-motion: reduce`, así que se ve el
estado final de cada escena. En las capturas por elemento se ocultan la barra superior, el dock móvil y la barra
de desarrollo de Astro, porque flotarían sobre el elemento. En uso real, al final de la página el footer queda
completo por encima del dock (medido: el último texto termina en y=740 y el dock empieza en y=766).

## Escenarios (desktop 1440×900 y mobile 390×844)

| Escenario | Archivo | Qué muestra |
| --- | --- | --- |
| Primer pliegue | `*-first-fold.png` | Portada: lockup, estado del enlace, la respuesta del mes, bajada, cliente y órbita de acento |
| Lo esencial | `*-summary.png` | Hallazgos con cifra protagonista y decisión para la reunión |
| Hallazgo abierto | `*-finding-open.png` | Evidencia dentro del hallazgo: figura, lectura, procedencia y enlace al hallazgo |
| Capítulo con figura | `*-chapter-figure.png` | Figura principal narrada: cifra, conclusión, lo que significa y próximo paso |
| Tabla equivalente | `*-chapter-table-open.png` | La misma figura como tabla, con unidad, fuente, fecha de corte y marca Medido |
| Capítulos | `*-chapter-aeo.png`, `*-chapter-ico.png` | Las demás familias narradas como bloques alternados |
| Período abierto | `*-partial-first-fold.png` | Banda de período abierto en la portada |
| Límites | `*-limits.png` | Capítulo sin cifras: el motivo del modelo, nunca un cero ni una figura vacía |
| Descargas | `*-downloads.png`, `*-downloads-unavailable.png` | Una disponible por el proxy y otra no disponible; sin botones muertos |
| Estados seguros | `*-status-{not-found,gone,rate-limited,error}.png` | 404, 410, 429 y 502 sin nombre de organización ni código |
| Pie | `*-footer.png` | Logo y eslogan en su bloque oficial, contacto y aviso del enlace |
| Presentación | `desktop-present-{cover,finding}.png` | El mismo modelo en láminas para una reunión |

## Decisiones de diseño

- **Dirección A, web nativa.** El operador rechazó la primera versión, que usaba sidebar: era el PDF con vida.
  La portada responde la pregunta del mes, «Lo esencial» se abre como evidencia y cada módulo es una escena narrada.
- **Una sola órbita, la de acento (`trajectory.accent`), en la portada.** El modelo no declara una figura de portada
  que la órbita pueda medir, así que no se inventa una medición.
- **Todas las familias en la narrativa.** Las 15 familias de TASK-1845 y TASK-1888 se dibujan con las convenciones
  de `chart-geometry` de los PDF. La cifra impresa siempre es el `display` del modelo.
- **El PDF descargable es el camino para imprimir.** La hoja de impresión existe solo como respaldo: logos en
  positivo, sin transiciones, tablas visibles.
- **La web no inventa contenido.** Un capítulo sin cifras muestra el motivo del modelo; un hallazgo sin evidencia
  no se abre.

## Deuda declarada

- Iconografía: todavía no usa el set canónico «Trazo» de AXIS. Es la misma deuda que tienen los catálogos PDF y se
  adopta en una tarea propia, con aprobación del operador.
- Falta capturar contra una edición real de staging con un enlace sintético. Las capturas actuales usan fixtures.

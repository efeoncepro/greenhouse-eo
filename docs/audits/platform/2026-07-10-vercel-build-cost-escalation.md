# Vercel Build Cost Escalation — 2026-07-10

## Verdict

`economic-trigger-confirmed`. Greenhouse debe iniciar desacople físico de unidades de build. Continuar buscando solamente optimizaciones dentro de la app única ya no es una respuesta proporcional al costo ni a la capacidad observada.

## Evidence

### Operator billing evidence

- Baseline histórico aproximado: `USD 20/mes`.
- Elastic build, alrededor de mayo de 2026: `USD 530/mes`.
- Standard build: menor monto, pero builds de hasta `45 min` y algunos sin completar.
- Elastic build, julio de 2026, aun trabajando principalmente local-first: `USD 250` al momento del reporte.

Estos montos son evidencia primaria reportada por el operador y deben reconciliarse contra invoices/export antes de construir una serie contable exacta. No se presentan como export financiero auditado.

### Repository and platform evidence

- Proyecto Vercel enlazado: `greenhouse-eo`, root `.`, framework Next.js, team `efeonce-7670142f`.
- App Router: 1.269 entrypoints medidos por TASK-1376: 279 páginas y 946 route handlers.
- `src/`: 6.140 archivos; warm RSS p95 7,51 GB en el baseline TASK-1376.
- Inventario actual: 319 entrypoints bajo `/admin`, 55 páginas bajo `/design-system`, 44 páginas `mockup` y 946 handlers API.
- TASK-1379 demostró que reducir un input Roadmap no redujo memoria; TASK-1380/1381 tampoco produjo un default local/remote que resuelva el problema.
- La API autenticada de Vercel expone `/v1/billing/charges` y respondió HTTP 200 en formato JSONL para mayo–julio. La versión CLI 50.32.5 falla al parsear el stream como JSON único; esto es una limitación de extracción, no evidencia de costo cero.

## Economic interpretation

- Salto máximo reportado: `26,5x` (`530 / 20`).
- Gasto actual reportado aun con local-first: `12,5x` (`250 / 20`).
- Standard no es fallback operativo aceptable si el feedback tarda hasta 45 minutos o no termina.
- El costo ya se materializó durante meses; por tanto, “esperar más señal” aumenta pérdida sin mejorar la decisión.

## Boundary recommendation

Primera frontera: Design System Labs, empezando por páginas pure-UI sin API, DB, auth especial ni filesystem inputs. Razones:

1. Es una porción visible del grafo (55 páginas) y cambia con frecuencia.
2. Tiene menor blast radius que Admin, API, Finance o HR.
3. Permite medir builds afectados y una segunda unidad Vercel antes de dividir transacciones o datos.
4. Las páginas con dependencia de `/api/design-system/**` se excluyen del primer slice.

## Success thresholds

- Un cambio labs-only no dispara build del portal.
- El build clean del portal reduce al menos 15% en duración o 10% en peak tree RSS; si no, el piloto no justifica retirar rutas del portal.
- El build de Labs completa p95 <= 10 min en Standard o demuestra costo por cambio materialmente menor en Elastic.
- URLs, auth, navegación y rollback quedan verificados antes de cualquier cutover.
- Se captura costo por proyecto/build semanal; `not_configured`, vacío o parse failure nunca significa costo cero.

## Sources

- `docs/tasks/complete/TASK-1376-build-baseline-dependency-boundary.md`
- `docs/audits/platform/2026-07-10-greenhouse-build-dependency-baseline.md`
- `docs/audits/platform/2026-07-10-roadmap-materialized-index-ab.md`
- `docs/tasks/complete/TASK-1380-build-rss-attribution-concurrency.md`
- `docs/tasks/complete/TASK-1381-adaptive-local-low-memory-build-mode.md`


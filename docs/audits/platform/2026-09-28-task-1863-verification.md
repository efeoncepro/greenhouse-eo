# TASK-1863 — evidencia de implementación y límites de rollout

Fecha: 2026-09-28. Checkout develop compartido. Sin commit, push, deploy ni flags externos modificados.

## Google AI Mode: evidencia directa

- Catálogo vivo gratuito: 23 mercados verificados y 4 códigos de idioma (`es`, `en`, `pt-BR`, `fr`).
  [Readback sanitizado](evidence/task-1863/provider-catalog.json).
- Canary del adapter canónico con una pregunta por país: **22 succeeded**, **Cuba skipped:market_unsupported**,
  cero errores y cero fallback de país. Los 22 calls devuelven task `20000` y cuestan USD 0,004 cada uno:
  **USD 0,088** para la ronda completa. Cinco probes previos por idioma costaron USD 0,020; total USD 0,108.
  [Resultados por país, locale, ubicación y costo](evidence/task-1863/google-ai-mode-markets.jsonl).
- España `2724/es`, México `2484/es`, EE. UU. `2840/en`, Brasil `2076/pt-BR`, Haití `2332/fr`.
- Un resultado sin citas atribuibles se conserva como tal; no se convierten redirects Google en dominios
  citados del cliente. No se almacenaron estos probes como informes ni se tocaron runs históricos.
- Estas pruebas verifican el adapter local contra el proveedor, **no** un despliegue de Vercel/worker.

Fuentes de contrato: [AI Mode Live Advanced](https://docs.dataforseo.com/v3/serp-google-ai_mode-live-advanced/),
[catálogo de idiomas](https://docs.dataforseo.com/v3/serp/google/ai_mode/languages/),
[catálogo de ubicaciones](https://docs.dataforseo.com/v3/serp-se-locations/).

## Pruebas locales ejecutadas

- Regresión ampliada: **103 archivos / 810 pruebas PASS** (Grader, catálogo, gap SEO, clientes HTTP,
  entitlements y renderizadores de informe). Se agregaron después pruebas explícitas Cuba y es-419;
  el resultado final se registra al cierre de QA.
- PostgreSQL efímero, puerto 55463 y data_directory validado antes de cualquier escritura:
  **11 pruebas PASS**, incluyendo enqueue real que persiste país/locale/snapshot/prompts; rollback total
  ante fallo del segundo mercado; dos solicitudes concurrentes compitiendo por cuota; presupuesto total;
  asignación vencida, mercado no contratado, conflicto de idempotencia y denegación de autoridad.
  Incluye flag OFF en mercado secundario, reserva diaria y concurrencia sobre presupuesto recurrente.
- Migraciones **Up → invariantes → Down → Up PASS** en una base temporal que el harness retira.
  Identidad de mercado, set de competidores y snapshot inmutables; principal único, transferencia atómica,
  ausencia de principal rechazada, FK entre perfiles rechazada y espejo de cadencia trimestral comprobado.
  La prueba encontró y corrigió el orden de DROP INDEX antes de DROP COLUMN en Down.
- `pnpm migration-marker-gate`: 0 errores, dos warnings de migraciones anteriores ajenas a TASK-1863.
- `pnpm worker:build-contract-gate`: PASS. No se crea un servicio/worker nuevo.
- Build de producción Next: compilación, TypeScript y generación de 26 páginas completados, exit 0.
  La envoltura local restauró tsconfig.json después del build aislado.
- PDF real sintético generado y portada inspeccionada: texto **“4 de 5 motores respondieron”** visible,
  sin recorte. Artifact local `.captures/task-1863-report-proof/report.pdf` y `cover.png`.
  Es prueba del renderizador del PDF y copy compartido; no certifica navegación de un portal desplegado.

## Esquema, datos y runtime pendientes

Lectura directa compartida: 27 perfiles activos con país/locale resolubles; una organización tiene cuatro
perfiles activos. El [manual](../../manual-de-uso/growth/configurar-mercados-aeo.md) contiene ids exactos,
perfil retenido y script dry-run/apply con allowlist. Dry-run ejecutado; **apply no ejecutado**.

Las dos migraciones están parqueadas fuera del runner, en `docs/tasks/pending-migrations/`,
según el contrato de tooling; el manual define responsable y condición de reactivación.
No se aplicaron las dos migraciones ni backfill en la instancia compartida. No se configuraron los seis
mercados de Sky ni se consumió su cuota. No se activó multimer­cado fuera del proceso de prueba local.
Las columnas legacy siguen vigentes como espejo: su retiro es un contract posterior con condición explícita.
No se declara TASK-1863 complete hasta el readback de rollout y el lote cliente de aceptación.

## QA final

- Typecheck final PASS, lint del alcance PASS; formato del archivo generado DB preservado (66 líneas aditivas).
- PostgreSQL efímero recreado después de interrupción: Up/Down/Up y 11 tests transaccionales PASS.
- Matriz: 4 pruebas PASS (separación, ausencia de medición, selección ajena y autoridad).
- Scoring/matching/tendencia/señales: 22 pruebas PASS; legacy con recompute conserva evidencia persistida.
- Skills mirrors, flags strict sin Vercel, worker dependencies/build contract, migration marker y reachability PASS.
- Task lint sin warnings. Ops lint sin errores; warnings previos de paridad de epics.
- `pnpm docs:closure-check` completo PASS (incluye flags, índice Creative Studio, inventario y frescura).
  Cierre scoped: 0 errores, 2 warnings de tamaño/estructura de los canones existentes;
  se conserva el ADR temático y no se mezcla una reestructuración documental global.
- Suite general `vitest --project unit --maxWorkers=4`: **1.852 archivos PASS, 2 omitidos; 15.886 tests PASS,
  33 omitidos, cero fallos** (350,45 s). Matriz y refuerzo legacy se verificaron además en la ronda enfocada.
- Lint global ejecutado: 3 errores de formato en `scripts/dataforseo/generate-catalog.ts`, archivo nuevo
  de trabajo concurrente fuera de TASK-1863, y 26 warnings de contraste existentes. No se declara lint
  global verde; lint del alcance TASK-1863 sí PASS. Se preserva el WIP ajeno.
- Build final de producción PASS (exit 0): compilación, TypeScript, páginas y rutas. El wrapper
  restauró tsconfig.json; `git diff --check` PASS. Logs locales en `.captures/task-1863-qa/`.

La suite `live` del repo escribe en Cloud SQL compartido; no se ejecuta como prueba local. El alcance DB
se verifica con el harness efímero y se deja el canary de rollout sin tildar.

## Veredicto

**Code complete; rollout pendiente.** La entrega local satisface catálogo/localización, país nativo,
Google AI Mode, configuración gobernada, snapshots/legacy, lotes y reservas atómicas, autoría/regrade,
matriz/tendencias, copy de cobertura y documentación. La suite unit general, PostgreSQL efímero,
canaries de proveedor y build son evidencia complementaria; ninguno sustituye el canary de cliente.
El lint global del checkout queda señalado por trabajo concurrente ajeno; no se declara CI global verde.
Sin commit, push, deploy, cambios de flags externos, migración compartida ni reescritura histórica.

## Rollout staging autorizado (2026-09-28)

Main sigue en espera. Migraciones `20260928094832901` y `20260928095058691` aplicadas;
backfill transaccional aplicado a 27 perfiles, 27 principales creados. La suposición de perfiles
duplicados de Efeonce fue corregida: tres archivados temporalmente fueron restaurados y auditados,
los cuatro permanecen activos con 14 runs históricos intactos. CL/CO/PE/MX confirmados por operador;
las filas legacy registran CL y no se reasignan por inferencia. Evidencia en `evidence/task-1863/`.

Lint de `scripts/dataforseo` y `src/lib/ai`: 0 errores tras autofix solicitado por el operador.
Compatibilidad de nombres de un carácter preservada (fixture legacy y marcas como X), con word boundaries
y prueba dedicada. El backfill usa el mismo cliente transaccional para leer cada perfil.

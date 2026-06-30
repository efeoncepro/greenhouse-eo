# Diagnosticar las señales AI de Finance

> **Para quién:** operador de plataforma / finanzas que necesita entender por qué Finance AI
> no muestra insights, o verificar que el pipeline está sano.
> **Documentación funcional:** [finance-ai-signals-fuente-de-verdad.md](../../documentation/finance/finance-ai-signals-fuente-de-verdad.md)
> **Spec técnica:** [GREENHOUSE_FINANCE_AI_SIGNAL_SOURCE_OF_TRUTH_DECISION_V1.md](../../architecture/GREENHOUSE_FINANCE_AI_SIGNAL_SOURCE_OF_TRUTH_DECISION_V1.md)

## Para qué sirve

Saber si el motor de señales AI de Finance corrió, qué vio, y por qué un período aparece como
"Pendiente", "Sin novedades" o "Degradado".

## Antes de empezar

- Acceso a `pnpm pg:connect:shell` (lectura) o al dashboard `/admin/operations` (reliability).

## Paso a paso

1. **Mirar la señal de salud.** En `/admin/operations`, buscar
   `finance.ai.signals.stale_materialization` (módulo Finance):
   - `ok` → el motor corrió hace poco.
   - `warning`/`error` → el motor está atrasado (>24h / >48h) o falló.
   - `awaiting_data` → todavía no hay ninguna corrida registrada.

2. **Revisar la provenance del paso de detección** (qué vio la última corrida):

   ```sql
   SELECT period_year, period_month, status, snapshots_evaluated, signals_written,
          started_at
   FROM greenhouse_serving.finance_ai_materialization_runs
   ORDER BY started_at DESC
   LIMIT 10;
   ```

   - `status = empty_positive` + `snapshots_evaluated > 0` → corrió, había datos, sin anomalías (sano).
   - `status = skipped_no_eligible_data` + `snapshots_evaluated = 0` → no había datos económicos del período (upstream no listo; ver TASK-1200).
   - `status = failed` → la corrida falló (revisar Sentry, dominio `finance`).

3. **Contar señales y enrichments del período:**

   ```sql
   SELECT count(*) FROM greenhouse_serving.finance_ai_signals WHERE period_year=2026 AND period_month=6;
   SELECT count(*) FROM greenhouse_serving.finance_ai_signal_enrichments WHERE period_year=2026 AND period_month=6;
   ```

4. **Forzar una corrida** (si está atrasada): disparar el cron `finance-ai-signals`
   (o el endpoint `/finance/materialize-signals` del worker ico-batch).

## Qué significan los estados

Ver la tabla de estados en la documentación funcional. Regla clave: **"Sin novedades" (salud) y
"Pendiente" (datos no listos) no se confunden** — la diferencia es `snapshots_evaluated`.

## Qué no hacer

- **No** borrar filas de `finance_ai_materialization_runs` ni `finance_ai_enrichment_runs`
  (son ledgers append-only, audit-grade).
- **No** asumir que un run `succeeded` con 0 señales era una falla: puede ser salud
  (`empty_positive`). Mirar `snapshots_evaluated`.

## Problemas comunes

- **"El dashboard dice Pendiente pero el mes ya cerró":** revisar paso 2 — probablemente
  `snapshots_evaluated = 0` porque `client_economics` aún no materializó (depende del cierre de
  payroll / TASK-1200).
- **Señal `stale_materialization` en warning persistente:** el cron no está corriendo; revisar
  Cloud Scheduler / Vercel cron.

## Referencias técnicas

- Materializer: `src/lib/finance/ai/materialize-finance-signals.ts`
- Reader/status: `src/lib/finance/ai/nexa-data-status.ts`, `llm-enrichment-reader.ts`
- Señal: `src/lib/reliability/queries/finance-ai-signals-stale-materialization.ts`

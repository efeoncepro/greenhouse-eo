# ISSUE-081 — "Días de retraso" no congela tiempo no imputable a la agencia (freeze roto: `frozenDays` siempre 0) → OTD% y bonus penalizan demoras de cliente/bloqueos/pausas

## Ambiente

production (Efeonce — data source Tareas `5126d7d8-bf3f-454c-80f4-be31d1ca38d4`). Sky pendiente de verificar (puede tener variante propia de la fórmula).

## Detectado

2026-05-23, análisis solicitado por el usuario (operador HR/Delivery) sobre la limitación del freeze de "días de retraso" en Notion. Confirmado leyendo la expresión real de la fórmula vía Notion API (`GET /v1/data_sources/...`, Notion-Version 2025-09-03).

## Síntoma

Cuando una tarea pasa a `Listo para revisión` y el cliente se demora días en moverla a `Cambios solicitados`, el contador "Días de retraso" sigue sumando tiempo **no imputable a la agencia**. La fórmula Notion *intenta* congelar (freeze/thaw) pero no lo logra de forma confiable. Además los estados `Bloqueado` y `En pausa` no se congelan en absoluto.

Consecuencia menos visible pero más grave: tareas que la agencia entregó a tiempo (descontando el tiempo en manos del cliente) quedan clasificadas como atrasadas, lo que **degrada el OTD% y, por lo tanto, el bono del colaborador**.

## Causa raíz

La fórmula Notion `Días de retraso ` (id `KGW\``) implementa lógica freeze/thaw con 3 campos manuales (`Fecha de envío a revisión` `PyIi`, `Fecha de retorno` `KlJW`) más un **acumulador de días congelados** referenciado como `frozenDays` vía la propiedad `elYp`:

```text
frozenDays = if(not empty(<elYp>), <elYp>, 0)
...
estado == "Cambios solicitados"  → max(0, (hoy − deadline) − frozenDays)
estado == "Aprobado" + completado → max(0, (completado − deadline) − frozenDays)
estado ∈ ["Pendiente aprobación interna","Bloqueado","En pausa"] → 0
estado == "Listo para revisión" + fecha de envío → max(0, (fecha_envío − deadline))   // freeze real
```

**Smoking gun**: la propiedad `elYp` **no existe en el schema del data source** (verificado contra la lista completa de property ids; `elYp` solo aparece dentro de las expresiones de fórmula, 6 veces, nunca como propiedad real — fue borrada o renombrada). En Notion, una fórmula que referencia una propiedad inexistente evalúa a vacío, por lo que:

> **`frozenDays` es SIEMPRE 0.**

Efectos:

1. **Thaw muerto**: al volver a `Cambios solicitados` o al aprobarse, el descuento `− frozenDays` resta 0 → el contador vuelve a contar el calendario completo, incluyendo los días que el cliente estuvo revisando. El freeze "funciona" solo mientras la tarea está parada en `Listo para revisión` (con `Fecha de envío` poblada); en cuanto se mueve, el descuento se evapora.
2. **`Bloqueado` / `En pausa` no se congelan**: están en `excludedStatuses` → devuelven 0 mientras la tarea está en ese estado (esconden el atraso), y al salir vuelven a contar todo. Nunca acumulan ni descuentan ese tiempo.
3. **Multi-ciclo no robusto**: con un solo `Fecha de envío a revisión` y un solo `Fecha de retorno`, un segundo ciclo de revisión pisa al primero.

Causa estructural de fondo: las fórmulas Notion son **stateless** — no pueden acumular tiempo entre transiciones de estado. El contraption de campos manuales + acumulador + automations es una aproximación frágil que se rompe en silencio (una propiedad borrada no produce error, solo números equivocados — misma clase de bug que ISSUE/TASK-877 follow-up con RpA `null` 10 meses sin alerta).

`frozenDays`/`elYp` también es consumido por las fórmulas `Tiempo de ejecución` (`YFJUbQ`) e `Indicador de Performance` (`cWFSeA`) — ambas igualmente afectadas.

## Impacto

**Doble camino, ambos sin freeze efectivo hoy** → OTD% refleja atraso de calendario bruto, NO atraso imputable a la agencia:

1. **`Indicador de Performance` (Notion)** decide on-time con `(completado − deadline) − frozenDays ≤ 0`. Con `frozenDays = 0` queda en `completado ≤ deadline` (atraso crudo). Se sincroniza a BQ como `performance_indicator_code` (`sync-notion-conformed.ts:1289` → `normalizePerformanceIndicatorCode`), que es input de `otd_pct` en el registry ICO.
2. **`delivery_signal` (BQ, `src/lib/ico-engine/schema.ts:138-148`)** recalcula on_time/late desde `completed_at ≤ due_date` crudo, **sin ninguna lógica de freeze**.

`otd_pct` → `fetchKpisForPeriod` → `calculateOtdBonus` (ver `metrics/OTD_V1.md` §13.1). Por lo tanto:

- **El bonus penaliza al colaborador por demoras del cliente, bloqueos y pausas** — tiempo fuera de su control. Activo en producción.
- **Management** lee un OTD% peor que la realidad operativa.
- **Cliente (CVR/QBR)** ve un cumplimiento contractual subvaluado.
- Afectados: equipo creativo (compensación variable), management, narrativa cliente.

Severidad: el impacto es en **compensación variable** y en una métrica que el cliente lee. No bloquea operación (las tareas fluyen), pero está distorsionando plata y confianza de forma invisible.

## Solución

> Documentación del bug. La solución completa es una TASK derivada (diseño pendiente), no se ejecuta en este ISSUE.

**Curita inmediata en Notion** (opcional, si se necesita algo hoy): reconectar/recrear el acumulador `elYp`, o reemplazar `frozenDays` por una suma de las fórmulas `Tiempo en revisión` ya existentes. Restaura el thaw del ciclo único de revisión. **NO** resuelve `Bloqueado`/`En pausa`, ni multi-ciclo, ni la doble-fuente BQ-sin-freeze, y sigue dependiendo de automations que poblen las fechas. Tapa el agujero, no arregla la cañería.

**Solución canónica (Greenhouse)**: computar **"días de retraso imputables"** desde `greenhouse_delivery.task_status_transitions` (TASK-908), descontando el tiempo total en `{Listo para revisión, Bloqueado, En pausa}` (set de exclusión confirmado por el operador 2026-05-23), multi-ciclo y determinista — mismo patrón de resta de intervalos que `calculateCycleTime` (`metrics/CYCLE_TIME_V1.md` §4.1). El valor corregido alimenta el bucket OTD (y por ende `otd_pct`/bonus) y se escribe de vuelta a Notion. Como toca el bonus, requiere estrangulador + shadow mode + paridad + sign-off HR (ver `GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md`).

**Nota canónica sobre el set de exclusión**: difiere del de Cycle Time. `Bloqueado` se excluye en ambos, pero `En pausa` se excluye en "días de retraso imputables" y NO en Cycle Time (decisión C.4 de CYCLE_TIME_V1 solo excluye `Bloqueado`/`Detenido`). Y el tiempo en revisión del cliente se EXCLUYE para atraso (no penalizar a la agencia) pero se INCLUYE en Cycle Time (calendario real). Documentar explícito para que nadie los confunda.

**Naming (requisito del fix)**: nombres internos libres/canónicos (`attributable_days_late`); propiedad Notion visible al usuario **amigable sin prefijo** (`Días de retraso`); señal "read-only / lo calcula el sistema" vía permiso Notion + descripción, no vía el nombre. Durante la coexistencia de migración usar un nombre transitorio distinto (no puede haber dos `Días de retraso`); renombrar a `Días de retraso` en el cutover. Conviene canonizar esta convención para todas las propiedades `[GH] *` (RpA, FTR, OTD…), no metric-por-metric.

## Verificación

- Confirmar `elYp` ausente del schema: `GET /v1/data_sources/5126d7d8-bf3f-454c-80f4-be31d1ca38d4` → la lista de `properties[].id` no contiene `elYp` (solo aparece dentro de expresiones de fórmula). ✅ verificado 2026-05-23.
- Tomar una tarea real que pasó por `Listo para revisión` con demora de cliente y comparar "días de retraso" actual vs el atraso descontando el tiempo en revisión → la diferencia es el tiempo mal imputado.
- Confirmar que su bucket OTD cambia (`late_drop`/`overdue` → `on_time`) al descontar el freeze, y por ende `otd_pct` del member sube.
- Verificar la variante Sky (data source `23039c2f-efe7-81f8-af2d-000b67594d18`) — puede tener la misma clase de bug o un mecanismo distinto.

## Estado

open

## Relacionado

- `docs/architecture/metrics/OTD_V1.md` (§13.1 bonus path, §6.5 OTD vs CT SLO%)
- `docs/architecture/metrics/CYCLE_TIME_V1.md` (§4.1 patrón de resta de intervalos / freeze de Bloqueado)
- TASK-908 (`task_status_transitions` foundation — primitiva del fix)
- `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` (Notion = OS / Greenhouse = motor; writeback `[GH]`/amigable)
- `docs/architecture/GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md` (estrangulador + 8 stop-gates + sign-off HR para cambios que tocan bonus)
- `src/lib/ico-engine/schema.ts:138-148` (`delivery_signal` BQ sin freeze)
- `src/lib/sync/sync-notion-conformed.ts:1289` (`performance_indicator_code` synced de Notion)
- `src/lib/payroll/bonus-proration.ts` (`calculateOtdBonus`)
- TASK derivada (diseño "días de retraso imputables") — pendiente de crear

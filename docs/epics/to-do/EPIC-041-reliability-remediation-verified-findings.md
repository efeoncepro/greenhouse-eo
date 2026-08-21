# EPIC-041 — Reparación de confiabilidad sobre hallazgos verificados en runtime

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Diagnóstico medido contra el runtime el 2026-08-21; reparación no iniciada`
- Rank: `1`
- Domain: `cross-domain`
- Owner: `unassigned`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- GitHub Issue: `none`

## Summary

Reparar los hallazgos de confiabilidad que sí existen, en el orden en que realmente importan, y cerrar las dos cegueras estructurales que permitieron que el peor de ellos viviera cuatro meses reportándose como sano. Este epic reemplaza a `TASK-1710` y `TASK-1432`: dos umbrellas P0 que describen el mismo incidente con un mes de diferencia, no se referencian entre sí, y acumulan cero commits y cero tasks hijas desde su creación.

La diferencia con esas umbrellas no es de formato. Es que cada cifra de acá fue **medida contra PostgreSQL el 2026-08-21**, no copiada de un reporte previo, y siete de los hallazgos originales resultaron mal calibrados, mal clasificados o directamente falsos positivos.

## Why This Epic Exists

La revisión diaria venía reportando dos hallazgos — `wh-sub-notifications` con dead-letters `401` y dos handlers `contract_mrr_arr` fallidos — durante semanas. Al medir el runtime aparecieron tres cosas incómodas a la vez:

1. **Los dos hallazgos reportados son los menos urgentes.** Uno está congelado desde el 2026-08-01; el otro dormido desde el 2026-06-22 y, al no existir contratos `retainer`, arreglarlo no produce dato.
2. **El problema grave no estaba en ningún reporte**, porque el módulo de confiabilidad lo muestra en verde: el bridge de ingresos a HubSpot nunca sincronizó una sola factura y exhibe 9.001 éxitos consecutivos.
3. **Varias cifras reportadas eran falsas o mal encuadradas**: los "4 leads de Growth perdidos" son correos de prueba del propio operador, la "retención en drift" es un documento anulado que el reader no filtra, el "rate MXN/CLP faltante" no afecta ninguna valorización, y los "79,6 días" de writeback son la edad del ítem más viejo atascado, no la frescura del tablero.

Un programa que se limite a ejecutar la lista original repararía lo barato, ignoraría lo caro y gastaría esfuerzo en dos falsos positivos. Este epic existe para invertir ese orden y para que el próximo agente no tenga que volver a medir desde cero.

Además hay un bloqueo circular que hay que romper primero: `TASK-1710` se autobloquea exigiendo `agentAutomationSafe=true`, y ese flag está en `false` justamente por el timeout del control plane que el propio programa debería reparar.

## Outcome

- Las 84 facturas de `greenhouse_finance.income` (CLP 141.562.545) dejan de estar ausentes de HubSpot, y el loop de ~80 eventos diarios se detiene.
- Una degradación permanente nunca más puede reportarse como éxito: `skipped` deja de contar como resultado sano y existen señales para las clases de fallo que hoy no tienen ninguna.
- `platform-health.v1` vuelve a emitir un veredicto interpretable, distinguiendo "plataforma caída" de "el compositor no alcanzó a leer".
- Los hallazgos fiscales quedan separados entre riesgo real y falso positivo, y los readers dejan de emitir señales insatisfacibles por diseño.
- `TASK-1710` y `TASK-1432` quedan cerradas como superseded, con su contenido vivo migrado acá.
- Cada carril queda con dueño declarado: como `Delta` en la task que ya posee la superficie, o como task nueva sólo donde no existe dueña.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md`
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`
- `docs/architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md`

## Baseline medido — 2026-08-21

Toda cifra de esta tabla salió de una consulta a `greenhouse_app` vía proxy Cloud SQL el 2026-08-21. **Un agente que retome este epic debe re-medir antes de actuar, no confiar en esta tabla**: está fechada a propósito para que su obsolescencia sea evidente.

| # | Hallazgo verificado | Cifra medida | Estado |
|---|---|---|---|
| 1 | `greenhouse_finance.income` nunca espejada a HubSpot | 83 `skipped_no_anchors` + 1 nunca intentada = **CLP 141.562.545**, facturas de 2024-07-05 a 2026-08-10 | creciendo |
| 2 | Handler que reporta salud falsa | `income_hubspot_outbound:finance.income.nubox_synced` = `healthy`, **9.001 éxitos consecutivos**, cero facturas sincronizadas | creciendo |
| 3 | Loop de eventos | `finance.income.hubspot_sync_failed`: **9.077 eventos** sobre **83 incomes**, `attemptCount` hasta 120, ~80/día, 1:1 con `nubox_synced` | creciendo |
| 4 | Anchors recuperables | **73 de 83** llevan el `hubspot_company_id` dentro de `client_id` y matchean el CRM = **CLP 122.017.635** recuperables | estático |
| 5 | Materializador PPM detenido | último `materialized_at` = **2026-06-20**, es decir **61 días**; 8 posiciones en drift, delta máximo **CLP 12.600.000** | empeorando |
| 6 | Tasa PPM | `0.00125`, `source='sii_f29_confirmed_2026'` con nota que la declara **placeholder** pendiente de validación contable | estático |
| 7 | `wh-sub-notifications` | **16** dead-letters, todos `401 missing_signature` desde **2026-06-15**; antes **46 entregas exitosas** (abr–12 jun). Último DL: 2026-08-01 | congelado |
| 8 | `contract_mrr_arr` | 2 handler keys, 6 dead-letters, `last_success_at` **NULL**, último fallo **2026-06-22**. `contract_mrr_arr_snapshots` = **0 filas** | dormido |
| 9 | Contratos `retainer` | **cero**. Los 25 contratos son `project` (22 draft, 3 active) | estático |
| 10 | Writeback RpA | 12 pendientes, el más viejo **85,7 días** (nace 2026-05-27); causa: 12 páginas Sky archivadas cuyo fix de clasificación terminal del 2026-07-15 fue forward-only | conteo congelado, edad crece |
| 11 | Transiciones no capturadas | **50**, concentradas en un burst 2026-07-12 a 2026-07-21 (42 en Sky) | congelado |
| 12 | Métricas ICO | `ico_member_metrics` materializado **2026-08-21 14:30**. NO están stale | sano |
| 13 | Gastos sin distribución | señal reporta **14** (ventana rodante 2 meses); backlog real **186** ≈ CLP 40,5M desde 2023-06. Cero policies, cero sugerencias, cero resoluciones desde 2026-05-03 | subreportado 13× |
| 14 | Payable vencido | `EO-CPAY-0001`, **77 días**, neto CLP 600.000,34, obligación `scheduled` nunca ejecutada | empeorando 1 día/día |
| 15 | Outbox | 220.927 eventos, **100% `published`**, el más nuevo de hoy | sano |
| 16 | Otros handlers HubSpot degradados | `sample_sprint_hubspot_outbound` (nunca OK, enum `sample_sprint` ausente en el portal), `quotation_hubspot_outbound` ×2 (`No space found for organization`), `hubspot_services_intake` (`last_error` es un resumen agregado que oculta la causa) | estático |

### Falsos positivos y hallazgos mal encuadrados — no gastar esfuerzo acá

| Hallazgo original | Realidad medida |
|---|---|
| "4 leads de Growth con consentimiento y score listos no llegaron a HubSpot" | Son **correos de prueba del operador**; los 4 runs están `status='partial'` = no releasable, y el gate los rechaza correctamente. Cero leads comerciales perdidos. Reclasificar como no elegible por regla de negocio. |
| "1 retención en drift" | **Falso positivo**: `EXP-NB-37440649` está `is_annulled=true` y fue reemitido en el folio 42, que sí está `counted`. El materializador filtra `is_annulled`; el reader no. El bug es del reader. |
| "Falta rate MXN/CLP" | Las 4 facturas MXN están **correctamente valorizadas** con su FX snapshot legal. La arquitectura es USD-pivot y no persiste cross-pairs a propósito; el reader exige una fila literal que por diseño nunca existirá: **señal insatisfacible**. |
| "12 writebacks RpA hace 79,6 días" (leído como métricas obsoletas) | Es la **edad del ítem atascado**, no la frescura del tablero. Las métricas ICO se materializaron hoy. El bono no consume el motor V2 (`BONUS_USE_RPA_V2` ni siquiera declarado). |
| "2 handlers `contract_mrr_arr` fallidos" | Es **1 causa con 2 handler keys** (el key es `<projection>:<event_type>` y crear un contrato activo publica dos eventos en la misma transacción). |
| "`wh-sub-notifications` nunca funcionó" | Funcionó: **46 entregas exitosas**. Es una regresión fechada el 2026-06-15, no una configuración ausente. |

## Cegueras estructurales

Dos defectos de diseño explican por qué el hallazgo más caro fue el único que nadie reportó. Repararlos es parte del epic, no un follow-up.

1. **`skipped` cuenta como éxito.** En `src/lib/sync/handler-health.ts:41-45`, `isSuccessOutcome` incluye `skipped`. Cualquier degradación permanente modelada como skip es invisible **por construcción**. Es lo que produjo los 9.001 "éxitos consecutivos".
2. **El payload de `finance.income.nubox_synced` no lleva período.** Trae sólo `{document_status, nubox_purchase_id}`, así que el resolver de scope cae al mes corriente y **toda sincronización re-materializa el mes actual, jamás el del documento**. Por eso el IVA de julio quedó huérfano por 9 horas de diferencia. Se repite en cada cierre de mes.

A esto se suma la falta de señales para clases de fallo enteras: no existe señal de anchors faltantes en income, ni de volumen anómalo de eventos, ni telemetría `durationMs` por fuente en `platform-health`.

## Child Tasks

### Ya existen — requieren corrección antes de ejecutarse

- `TASK-1758` — drift de schema de `contract_mrr_arr`. **Corregir**: baja a P2 y declarar que con cero contratos `retainer` el fix no puebla la serie. El bug es real; el valor prometido no.
- `TASK-1759` — transporte de notificaciones fuera del bus de webhooks. **Corregir**: la premisa cambia de "nunca funcionó" a "regresión del 2026-06-15 tras 46 entregas exitosas". La decisión de arquitectura (migrar a projection reactiva) se sostiene.

### Deltas en la task que ya posee la superficie — NO crear tasks nuevas

- `TASK-928` (`in-progress`) — presupuesto anidado del composer de `platform-health`. Delta ya aplicado el 2026-08-21 con 9 criterios. **Rompe el bloqueo circular: va primero.**
- `TASK-919` (`in-progress`) — 50 transiciones no capturadas y 12 writebacks zombis. El auto-repair ya está diseñado y fue diferido por decisión del operador el 2026-05-21.
- `TASK-1203` (`to-do`) — tasa PPM placeholder y flip del F29. Ya cita `finance.ppm.position_drift`.
- `TASK-1186` (`in-progress`) — scope reactivo del IVA y filtro `is_annulled` faltante en el reader de retenciones.
- `TASK-1205` (`to-do`) — payable vencido de 77 días.
- `TASK-1210` (`in-progress`) — reconciliar el reader MXN/CLP con la arquitectura USD-pivot.

### Pendientes de crear — sin dueña viva

- **Bridge income → HubSpot** (P0): matar la re-emisión incondicional en `sync-nubox-to-postgres.ts:288-380` con detección de cambio, derivar el anchor desde `client_id`, backfill de las 73 filas. **El orden interno es load-bearing**: sin el guard de cambio primero, el fix de anchors convierte 80 skips diarios en 80 escrituras reales a HubSpot por día, indefinidamente.
- **Cegueras del control plane** (P1): `skipped` deja de ser éxito, señal de anchors faltantes en income, señal de volumen anómalo de eventos, y `last_error` deja de guardar resúmenes agregados que ocultan la causa.
- **Distribución de gastos** (P2): 186 expenses sin resolución, cero policies configuradas. Alternativa: absorberlo en `TASK-1205`, que ya es dueña del backlog operativo de cierre.

## Existing Related Work

- `docs/tasks/to-do/TASK-1710-reliability-remediation-control-plane-delivery-data.md` — umbrella del 2026-08-15, a cerrar como superseded.
- `docs/tasks/to-do/TASK-1432-greenhouse-reliability-recovery-control.md` — umbrella del 2026-07-18, a cerrar como superseded.
- `docs/epics/to-do/EPIC-007-reliability-control-plane.md` — **construye** el control plane; este epic **repara** lo que ese control plane encontró y corrige por qué no lo mostró. Las cegueras estructurales alimentan de vuelta el modelo de EPIC-007.
- `src/lib/sync/handler-health.ts`, `src/lib/platform-health/composer.ts`, `src/lib/reliability/get-reliability-overview.ts`
- `src/lib/finance/income-hubspot/push-income-to-hubspot.ts`, `src/lib/nubox/sync-nubox-to-postgres.ts`

## Orden de ejecución

El orden no es por severidad: es por desbloqueo y por reversibilidad.

1. **Verificación humana del flag `PPM_POSITION_ENABLED` en Production.** Si está `true`, el F29 publica una línea con base de 61 días y tasa placeholder. Es contención antes que remediación, y es la única decisión que no puede tomar un agente.
2. **`TASK-928`** — composer. Diez líneas, reversible por revert, rompe el bloqueo circular y devuelve un preflight interpretable.
3. **Bridge income → HubSpot**, con el guard de cambio antes que los anchors.
4. **Cegueras del control plane**, en el mismo tramo que el punto 3 para que el próximo bug de esta clase no viva cuatro meses en verde.
5. Deltas fiscales, por riesgo real: PPM, luego IVA, luego payable. Los dos falsos positivos se cierran corrigiendo readers, no datos.
6. `TASK-919` — auto-repair de transiciones, **antes** de que `TASK-1221` mida paridad para el Flip B del bono.
7. `TASK-1758` y `TASK-1759` corregidas, al final: son las menos urgentes pese a ser las más reportadas.

## Exit Criteria

- [ ] El flag `PPM_POSITION_ENABLED` fue verificado en Production por un humano y su estado quedó registrado con fecha.
- [ ] `greenhouse_finance.income` no tiene filas en `skipped_no_anchors` con anchor derivable desde `client_id`.
- [ ] El volumen diario de `finance.income.hubspot_sync_failed` es cero y `nubox_synced` sólo se emite cuando el documento cambió.
- [ ] `isSuccessOutcome` en `src/lib/sync/handler-health.ts` no incluye `skipped`, y ningún handler con degradación permanente aparece `healthy`.
- [ ] Existen señales de reliability para anchors faltantes en income y para volumen anómalo de eventos, ambas con steady declarado.
- [ ] `GET /api/admin/platform-health` devuelve `overallStatus` distinto de `unknown` sin haber aumentado el presupuesto de 6000 ms.
- [ ] `degradedSources[]` expone `durationMs` por fuente.
- [ ] Los readers de retenciones y de MXN/CLP dejaron de emitir señales falsas, corregidos en el reader y no en los datos.
- [ ] `TASK-1710` y `TASK-1432` están en `complete/` marcadas superseded, con su contenido vivo migrado a este epic.
- [ ] Cada carril de la tabla de baseline tiene dueño declarado: `Delta` en una task existente o task nueva creada.
- [ ] Ninguna señal fue silenciada, ningún dead-letter fue acknowledgeado y ningún presupuesto fue aumentado para producir verde.

## Non-goals

- Construir capacidades nuevas del control plane que no sean consecuencia directa de una ceguera medida acá. Eso es `EPIC-007`.
- Replay masivo de los 16 dead-letters de webhook. Son correos reales de nómina, órdenes de compra y compensación de semanas atrás; se resuelven evento por evento con revisión humana.
- Backfill de la serie MRR/ARR mientras no existan contratos `retainer`. Sin datos de origen, el backfill produce una tabla vacía con más pasos.
- Optimización del costo de Cloud Run. Aparece en `TASK-1710` pero no comparte causa ni superficie con nada de este epic; merece su propio carril.
- Reparar HubSpot cambiando datos a mano en el CRM. Todo va por el bridge y su derivación de anchors.
- Aumentar timeouts, acknowledgear dead-letters o silenciar señales para que el dashboard se vea verde.

## Delta 2026-08-21 (2) — Flags fiscales verificados en Production: el riesgo PPM es real pero pequeño

Leídos con `vercel env run --environment=production` (sin escribir secretos a disco):

```
PPM_POSITION_ENABLED       = true
RETENTION_POSITION_ENABLED = true
VAT_POSITION_ENABLED       = (no existe — el IVA no tiene flag: es oficial siempre por diseño)
```

El flag está **encendido**, así que `enabledByLine.ppm = true` y los consumers presentan la línea PPM como **oficial**, no shadow (`src/lib/finance/f29-consolidated.ts:34-41`). Pero la exposición real es mucho menor de lo que sugería el hallazgo, por dos razones medidas:

**1. Los períodos recientes NO están materializados, y eso degrada honestamente.** `ppm_monthly_positions` tiene 19 filas que van de `2024-07` a `2026-06`, todas materializadas de una sola vez el `2026-06-20`. **No existe posición para `2026-07` ni `2026-08`.** El contrato devuelve `ppm: null` para esos períodos y el consumer distingue "sin materializar" de "cero" — no muestra un número malo, muestra ausencia.

**2. Los montos son minúsculos.** Con la tasa placeholder de `0.00125`, el PPM más alto de toda la serie es `2025-09` con **CLP 31.178**, y los 19 períodos juntos suman del orden de **CLP 135.000**. El "delta de base de CLP 12,6M" del hallazgo original se traduce, a esa tasa, en unos **CLP 15.750** de diferencia de PPM.

**Lo que sí queda como defecto real, y no es el monto:** las 19 filas llevan `rate_source = 'sii_f29_confirmed_2026'` mientras la única fila de `ppm_rate_config` se autodescribe como *"tasa PPM default placeholder (0,25%)… el contador debe actualizar esta fila"*. **La etiqueta afirma una confirmación del SII que no ocurrió.** Ese es el problema: un dato marcado como validado que nadie validó. Un contador que confíe en la etiqueta no va a revisar la tasa.

Consecuencia para la priorización del epic: el punto 1 del `Orden de ejecución` deja de ser contención urgente y pasa a ser **una conversación con el contador** — confirmar la tasa PPM real del contribuyente y corregir `rate_source` para que deje de mentir. Sigue yendo primero por ser lo único con consecuencia hacia afuera, pero no requiere apagar nada hoy ni bloquea el resto del programa.

`RETENTION_POSITION_ENABLED=true` tiene la misma forma: materializador detenido el mismo `2026-06-20`, y su única señal de drift es un falso positivo (documento anulado que el reader no filtra).

## Delta 2026-08-21 (3) — La tasa PPM es correcta; el falso positivo lo produjo la nota

Confirmado por el operador el 2026-08-21: **la tasa PPM real del contribuyente ES 0,125%**, es decir el `0.00125` que ya está configurado. El valor nunca estuvo mal.

Lo que está mal es el campo `notes` de la única fila de `greenhouse_finance.ppm_rate_config`, que sigue diciendo *"tasa PPM default placeholder (0,25%). La tasa real del contribuyente la fija el SII — el contador debe actualizar esta fila…"*. Esa nota es de `TASK-1189`, quedó obsoleta cuando la tasa se definió, y nadie la actualizó.

Consecuencias, y son de método más que de finanzas:

- **`rate_source = 'sii_f29_confirmed_2026'` es exacto.** El Delta (2) afirmó que la etiqueta mentía; era al revés — mentía la nota. Queda corregido acá.
- **El punto 1 del `Orden de ejecución` deja de existir como riesgo fiscal.** No hay conversación pendiente con el contador sobre la tasa, ni contención, ni flag que apagar. `PPM_POSITION_ENABLED=true` es el estado correcto.
- **Es el mismo bug class que este epic persigue, en versión documental**: un dato de gobierno que se quedó atrás y produjo un diagnóstico equivocado con alta confianza. Un agente leyó la nota, la creyó, y elevó a P0 algo que estaba bien. Exactamente lo que hace `skipped = éxito` en `handler-health.ts`, pero en prosa.
- **Acción concreta que sí queda**: actualizar el `notes` de esa fila por migración gobernada — nunca por `UPDATE` manual — para que declare la tasa como definida, con su fecha y su origen. Sin eso, el próximo barrido vuelve a levantar la misma falsa alarma.

**Lo único que sobrevive del carril PPM** es que el materializador no corre desde el `2026-06-20`: `2026-07` y `2026-08` no tienen posición materializada. Degrada honestamente (`ppm: null`, el consumer distingue "sin materializar" de "cero"), así que no produce un número falso — pero si el contador necesita la línea PPM de esos meses, no está. Ese sí es un gap operativo real, y su dueña sigue siendo `TASK-1203`.

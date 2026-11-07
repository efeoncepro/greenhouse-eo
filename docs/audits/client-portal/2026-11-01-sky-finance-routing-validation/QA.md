# QA — TASK-2094 Finance, routing e historia local

## Verdict

PASS del experimento local y recomendación técnica B. No autoriza aceptación del ADR, provisioning o release.

## Scope

Sólo experiments, auditoría y continuidad documental. Runtime productivo sin modificaciones. Fuentes reales
importadas; SQL de allocations/facts desde migraciones existentes. Dependencias mínimas sintéticas.

## Evidence

- 204 pruebas PASS en 7 archivos; 37 nuevas (20 Finance/PG, 14 Notion/PG, 3 ICO/puerto simulado).
- Evidencia por caso, fuentes y hashes en results.json; recibos anteriores preservados.
- Runner exit 0 y cleanup confirmados. Typecheck focal con dependencias: 0 diagnósticos; ESLint focal y
  sintaxis del runner PASS. Espejos Insights idénticos. No se ejecutó build/typecheck global sin cambios de src.
- Task lint: 0 errores/0 warnings. Ops lint: exit 0, con 1 warning de progreso TASK-2095 y 16 de paridad
  de epics ajenos. No se modificaron esas unidades.
- Context strict: 0 errores/0 warnings en el checkout al cierre; otros agentes hicieron rotaciones propias.
- Closure focal: advertencias de project_context/registro de skill revisadas. No hay nueva skill ni runtime:
  se actualiza la continuidad de la skill Insights existente, ADR, funcional, manual, task y bitácoras.

## Shared checkout

El commit concurrente `e52cab8fb` ya incluyó la actualización SKY de Handoff/changelog mientras se preparaba
este cierre. Se verificó su contenido en HEAD; no se revierte ni se vuelve a atribuir esa historia al commit
del laboratorio. Nuestro commit añade la evidencia restante y sólo el delta final SKY de esas dos bitácoras.
Prospección y artefactos creativos ajenos quedan fuera; staging por paths y revisión de hunks.

## Findings and blockers

- A′ necesita normalizar el owner en trigger/agrupación/reparto; cambiar sólo el gasto divide el P&L.
- B requiere contexto y readers explícitos. No hay separación productiva por activar un selector.
- Writer de proyectos admite reasignación y eventos antiguos. Batches pueden quedar parcialmente aplicados.
- Materialización histórica usa flags actuales; su transacción protege del fallo de INSERT, no de una
  reclasificación semántica errónea. Alcance por período incluye otras organizaciones.
- ICO sólo demuestra llamadas. Freeze fuerza reemplazo incluso locked; BigQuery/recuperación no certificados.

## False-closure checks

No se presenta A′ normalizado como implementado ni se dice que B ya sea seguro. Costos por proporción de
ingresos son estimaciones. Historia sintética preservada no acredita historia real. No se acepta ADR por
inferencia. No hay push/deploy, nuevas dependencias, comandos cloud, migración compartida ni datos reales.

## Follow-up

Pasar a implementación local U01 de contexto por Space en una ruta real y su reader; mantener controles
temporales/routing y apertura real como gates separados. No hace falta reiniciar el discovery general.

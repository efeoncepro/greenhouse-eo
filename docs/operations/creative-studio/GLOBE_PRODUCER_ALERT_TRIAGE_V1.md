# Globe Producer — triage de alertas de workers y cola V1

> **Estado:** operativo internal-only · **Fecha:** 2026-07-23 · **Owner:** Globe Platform/Ops

## Alcance

Este runbook cubre alertas `globe_producer_worker_failures`, edad de cola del Producer y fallas del Job de Asset
Governance. Una alerta confirma una señal, no la causa: primero correlacionar ejecución, run/outbox y logs antes de
reintentar o modificar estado.

## Primeros cinco minutos

1. Confirmar proyecto `efeonce-globe`, región `southamerica-west1`, policy/condition y hora exacta del incidente.
2. Identificar servicio o Job, revisión/digest y execution name. No copiar secretos, grants ni cuerpos upstream.
3. Buscar el evento estructurado por ventana:
   - Producer: `globe_worker_failed`, `globe_worker_completed`, `queueOldestAgeSeconds`.
   - Governance: `asset_governance_batch_completed`, `failed`, `retried`, `stale`, versión de motores/firmas.
4. Correlacionar con Postgres/readers: lifecycle del run, attempt terminal, outbox reclamable y última proyección.
5. Clasificar:
   - **evento aislado recuperado:** ejecución siguiente verde, sin cola reclamable vieja;
   - **cola stale/no reclamable:** run terminal pero outbox `reconcile` sigue `pending`;
   - **incidente persistente:** nuevas ejecuciones fallan o trabajo reclamable no avanza.

## Caso conocido del 2026-07-23

- La policy de failure dispara con un solo `globe_worker_failed`, threshold `>0` y duración cero.
- Terraform no declara `severity`; por eso el correo muestra **No severity**. Eso es deuda de observabilidad, no
  ausencia de impacto.
- Cinco runs quedaron `completed`, pero cinco eventos `reconcile` continuaron `pending` con
  `provider_still_pending`. El worker no los reclama y la edad de cola sigue creciendo. No regenerar outputs ni
  reiniciar a ciegas.
- La corrección robusta es terminalizar/superseder el reconcile al completar, medir edad sólo sobre trabajo
  reclamable y ejecutar un backfill por command/reconciler versionado. **Nunca** `UPDATE` manual.

## Asset Governance / C2PA

- `No claim found` de `c2patool` para MP4/MP3 válido sin manifest significa
  `unverified/c2pa_manifest_absent`; no es dependencia caída ni media unsupported.
- `unsupported` se reserva para formatos realmente no soportados. Errores desconocidos, binario ausente,
  firmas stale o policy no disponible continúan retryable/fail-closed.
- Antes de reencolar, verificar si existe una revisión terminal no proyectada. Aplicarla primero evita duplicar
  evidencia o perder derechos.

## Acciones seguras

- Pausar Scheduler si hay fallas persistentes, crecimiento de trabajo **reclamable** o riesgo de gasto repetido.
- Preservar jobs, outbox, objetos y evidencia; rollback mueve flags/digest, no borra datos.
- Reintentar sólo operations idempotentes con lease/revision vigente.
- Para commands de gasto con respuesta ambigua, leer estado antes de repetir.
- Verificar recuperación con una ejecución manual acotada y luego una ventana del Scheduler.

## Cierre

Registrar policy/condition, ventana UTC, revisión/digest, execution/correlation sanitizados, conteos
claimed/applied/failed/retried, edad reclamable antes/después y acción de rollback/backfill. La alerta sólo se
cierra cuando la causa dejó de producir señal; silenciarla o subir umbral no corrige una cola semanticamente stale.

## Deuda IaC

Asignar severidades explícitas y consistentes: failure persistente `ERROR`/`CRITICAL`, queue age `WARNING`, Asset
Governance failure o firmas stale `CRITICAL`. El payload de fallo debe incluir referencia saneada a ejecución y
correlación, nunca raw error ni secreto.

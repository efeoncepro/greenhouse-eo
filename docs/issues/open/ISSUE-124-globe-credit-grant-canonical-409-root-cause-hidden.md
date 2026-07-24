# ISSUE-124 — Globe: grant adicional de créditos devuelve 409 sin causa de fase

## Ambiente

production (Globe API internal, workspace `greenhouse-org:efeonce`)

## Detectado

2026-07-24, durante el rollout de TASK-1553. El comando canónico `globe.credits.grant.issue` fue ejecutado con identidad válida, aprobación maker/checker, pool activo, y claves nuevas de idempotencia/source.

## Síntoma

Un grant adicional de 5000 créditos (también reproducciones acotadas de 1000 y 10) responde HTTP `409 conflict`. No se observa una mutación ledger nueva; el canary se financió con el grant gobernado existente de 10 créditos.

## Causa raíz

No hay un guard de “un solo grant activo” en `credit-administration-store.ts`. El store sí puede emitir `conflict` desde varias fases — pool no activo, replay fingerprint conflictivo, estado de grant, policy activa, o una colisión/constraint downstream — y `dispatch.ts` las proyecta al mismo 409 sanitizado. La evidencia actual permite descartar el supuesto de un guard de grant activo, pero no identifica cuál fase produjo el 409 live.

## Impacto

Bloquea agregar presupuesto operativo por el path administrativo canónico y deja el operador sin diagnóstico accionable. No bloquea el canary si existe saldo gobernado previo.

## Solución

Instrumentar una razón de conflicto segura por fase (sin exponer SQL, credenciales ni payloads sensibles), agregar tests de emisión con pool activo + source/idempotency nuevos, y reproducir contra el runtime tras el deploy. Mantener la prohibición de inserts directos al ledger y no relajar la idempotencia.

## Verificación

El mismo request con source/idempotency nuevos debe devolver `200` y producir exactamente un grant/allocación; un replay idéntico debe ser idempotente; un fingerprint distinto debe seguir devolviendo `409` con código estable y fase observable para el operador.

## Estado

open

## Relacionado

TASK-1553; ADR-009; `packages/database/src/stores/credit-administration-store.ts`; migration `0023_credit_receipt_command_grain.sql`.

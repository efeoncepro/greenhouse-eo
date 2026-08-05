# TASK-1641 — arranque de sesión nueva (corte 2026-08-04)

> Para retomar `TASK-1641` (canary post-promoción operable + convergencia terminal de la saga) sin
> releer la sesión entera. La task sigue siendo la fuente de verdad:
> `docs/tasks/in-progress/TASK-1641-globe-promotion-canary-operability-and-terminal-convergence.md`.
> Este documento sólo ordena **por dónde seguir** y **qué trampas ya se pagaron**.

## Qué cargar antes de tocar nada

1. La skill **`greenhouse-globe`** — ya contiene las lecciones de esta sesión (§«Para una ruta RECIÉN
   PROMOVIDA existe `--route`» y §«Convergencia terminal de la saga de PROMOCIÓN»).
2. `TASK-1641` completa: sus Deltas **(b)** y **(c)** del 2026-08-04 tienen la evidencia exacta.
3. `GLOBE_RUNTIME_HANDOFF.md` para el estado vivo (revisiones, digests, promociones). **Nunca** lo
   infieras de un número de esta página.

## Cerrado, con evidencia — no lo rehagas

| Scope | Estado | Evidencia |
|---|---|---|
| **1** — canary de ruta arbitraria | ✅ cerrado y **ejercitado con gasto real** | `efeonce-globe@1767138` + `@a6ff46f`; run `6a6112f4…` en `ref/motion/reference-v1`, MP4 661.995 B retenido y `eligible`, 12 = 12 créditos |
| **3** — contrato de convergencia | ✅ contrato declarado, ⚠️ señal sin consumidor | `efeonce-globe@4a0a18b`, `PROMOTION_DEPENDENT_AGGREGATES` + test bidireccional probado en rojo |
| **4** — `canary-confirm` sin 500 opaco | ✅ cerrado | `efeonce-globe@38c528d`; lo probó el sello de Veo que pasó |

Promociones **selladas** (terminal, no expiran): Omni `promotion_1a5d117e…` y Veo
`promotion_ddd0977c…`, ambas `canary_passed` con binding `enabled` y circuito `closed`.

## Lo que falta, en el orden que conviene

### 1.º — Scope 2 **junto con** el cierre del Scope 3 (son el mismo trabajo)

Al Scope 3 le falta el **consumidor** que lea las promociones `rolled_back` con su readiness y emita
la señal; ese consumidor es **exactamente** donde vive la señal de ventana-por-expirar del Scope 2.
Hacerlos separados duplica el lector.

- El reader `globe.production-promotion.operation.stalled` **ya existe** y **no tiene consumidor**.
- 🔴 **La observabilidad existente NO cubre el Scope 2, aunque lo parezca.**
  `infra/terraform/promotion_observability.tf` tiene tres alertas (`promotion_partial` ERROR,
  `promotion_rollback_failed` CRITICAL, `stalled` WARNING), pero la de `stalled` mide **queue age de
  operaciones ya reclamables**: avisa **cuando ya venció**. Las cuatro promociones que murieron lo
  hicieron a **+2 s, +18 s, +26 s y +40 s** del deadline — para todas ellas esa alerta llega tarde
  **por diseño**. Falta la señal sobre `activated` **acercándose** a su `deadline_at`.
- Dónde vive el consumidor: `apps/studio-web/src/worker-main.ts` (ahí corre el batch de recuperación
  de promociones, y ya mide edad después del batch).
- ⚠️ Al crear la métrica: el aligner es función del **tipo**. `ALIGN_COUNT` sólo vale sobre
  DELTA/INT64; una métrica que **extrae un valor** es DELTA/DISTRIBUTION y necesita
  `ALIGN_PERCENTILE_99`. Copiarlo de la alerta hermana equivocada **falla en el apply con 400**, no
  antes. Y un 404 de la métrica recién creada es **propagación** (hasta 10 min), no un defecto.

### 2.º — Scope 5 (reserva pre-gasto)

`POST_SPEND_KINDS` vive en `packages/domain/src/governed-run-failure-policy.ts:250` y **no se propaga
a `abandon()`**: un run que murió **sin `providerOperation` no cobró nada**, así que retener 24 h
protege un escenario que no aplica. **Propagar la distinción es el trabajo; no relajar la postura
`observable` donde sí corresponde** (post-gasto el settlement ya decidió y tocar dinero arriesga doble
movimiento). Es el camino del dinero: va con más cuidado que los otros dos.

### 3.º — Scope 6 (runbook)

Al cierre y con lo aprendido, no antes. Debe llevar el canary como **paso explícito**, incluido
`--route` para la ruta recién promovida.

## Trampas ya pagadas — no las vuelvas a pagar

- **`referenceHashes` NO es una lista de hashes**, pese al nombre: es `LabDeclaredInputV1[]`. Mandar
  strings da `invalid_request` 400. Invisible porque las tres modalidades base estiman con lista vacía.
- **Elegir el `inputMode` por orden del array es fail-open**: `ref/motion/reference-v1` declara
  `['prompt','elements']` y exige 1 referencia; el primero da `create` y el motor descarta la
  referencia **después de cobrar**.
- **Un test con dobles no ve ninguna de las dos.** Las dos aparecieron corriendo contra el runtime.
- **El dry-run de una ruta certifica sus referencias y lo declara.** No es computable de otra forma.
- **`ISSUE-138` quedó `resolved`** (los 13 hallazgos), pero dejó un **residuo sin dueño**: el prefijo
  `gs://efeonce-globe-lab-evidence/governed-veo/ba0feca7-…/` conserva un MP4 generado y facturado que
  ningún agregado referencia. Candidato natural: `TASK-1529` (orphan GC), hoy bloqueada por `TASK-1528`.

## Bloqueos vigentes ajenos a esta task

La generación desde la UI del Producer para rutas con entrada obligatoria **sigue cerrada**, por dos
defectos con dueño escrito: `ISSUE-141` (la subida muere en `inspecting` con la causa enmascarada — su
**primer paso es reproducir con una subida real por el selector**, porque el hallazgo se hizo con un
`File` sintético) y el **Slice 5 de `TASK-1559`** (los botones «Usar como referencia» y «Recrear» son
`() => undefined`). El canary de ruta **no depende** de ellos: produce por el carril gobernado.

# ISSUE-137 — Globe: experimentos en `running` para siempre con CERO intentos, y el worker cierra limpio cada minuto

> **Estado:** Open
> **Detectado:** 2026-08-03 · **Ambiente:** Globe producción (`globe-producer-worker`, Cloud Run job)
> **Severidad:** Alta — crédito reservado inmovilizado sin gasto, y ningún readback distingue un run colgado de uno legítimo en curso
> **Repo afectado:** `efeoncepro/efeonce-globe` · **Gobierna:** Greenhouse (EPIC-028)

## Síntoma

Experimentos de Globe quedan en `state: running` para siempre. En la UI del Producer se ven como
«generando» indefinidamente. **Nunca completan ni fallan.**

## Evidencia medida (2026-08-03)

Ejemplo reproducible:

```
experimentId     : 96c0ddcd-07bc-4bcc-8de5-d39b74ddbc97
workspace        : greenhouse-org:efeonce
createdAt        : 2026-08-03T19:58:57.770Z
updatedAt        : 2026-08-03T19:58:58.015Z      ← 0,3 s después del createdAt
capability       : image-generate
ruta             : ref/still/rrss-v1
modelo           : Seedream 5 Pro (v5-pro) · provider: fal
attempts         : []                             ← VACÍO
reservedCredits  : 10   ·  spentCredits: 0  ·  hardCapCredits: 100
```

El run **no se volvió a tocar** en más de seis minutos de observación: `updatedAt` quedó 0,3 segundos
después del `createdAt` y ahí se congeló.

Mientras tanto, el Cloud Run Job `globe-producer-worker` **corre cada minuto y cierra limpio**
(`globe_worker_completed`, `Container called exit(0)`) **sin tomar ese trabajo**. Verificado en las
ejecuciones de las 20:01, 20:02, 20:03 y 20:04.

### No es un caso aislado ni nuevo

- Hay un **segundo run idéntico desde las 11:16 del mismo día** — nueve horas, `attempts: 0`, mismo
  patrón — **creado antes del trabajo de esta sesión**.
- Distribución de los 24 experimentos del workspace interno: **11 `candidate_ready`, 10 `failed`,
  2 `running` colgados, 1 `estimated`**.

## Impacto

La reserva de créditos queda **retenida sin convertirse en gasto**, así que no hay pérdida económica
directa — pero el crédito queda inmovilizado y **ningún readback distingue un run colgado de un run
legítimo en curso**. En la UI el usuario ve «generando» para siempre, sin ninguna señal de error.

## Familia — misma clase que ISSUE-135, con el disfraz contrario

Es la misma familia que
[`ISSUE-135`](ISSUE-135-globe-governed-run-outbox-infinite-silent-retry.md) («la outbox de governed
runs reintenta infinito, en silencio y sin dead-letter»), donde un run llegó a **705 entregas** y en
la UI también se veía «generando» para siempre.

El disfraz es el contrario:

| | ISSUE-135 | ISSUE-137 (este) |
| --- | --- | --- |
| Comportamiento | el trabajo se reintenta **sin techo** | el trabajo **no se intenta ni una vez** |
| `attempts` | 695 → 705 | `[]` (cero) |
| Síntoma en UI | «generando» para siempre | «generando» para siempre |

En **ambos** casos el estado divergía y **ninguna verificación lo miraba**. Ese es el patrón que une
a los dos, no el mecanismo.

## Regla aplicada al diagnosticar (queda escrita)

**NO se reintentó el envío.** La disciplina del repo es **readback-first**: un segundo submit a
ciegas sobre un run que puede estar recuperable **crea un segundo cobro**. Primero se lee el estado
por sus readers, después se decide.

## Investigación sugerida (hipótesis a verificar, NO conclusiones)

1. **¿El `execute` encoló trabajo en `governed_run_outbox`, o el run quedó reservado sin entrada?**
   Si la reserva de crédito y el encolado no son atómicos, un run puede nacer reservado y sin trabajo
   que lo mueva.
2. **¿El claim del worker filtra por algo que estos runs no cumplen?** El claim vive en
   `packages/database/src/stores/governed-run-store.ts` y usa `FOR UPDATE OF o SKIP LOCKED` con un
   predicado de reclamabilidad. Un run invisible a ese predicado explica el `exit(0)` limpio cada
   minuto sin tomar el trabajo.
3. **¿Hay una señal de confiabilidad que debiera detectar «run reservado sin attempt tras N
   minutos»?** **Hoy no existe** — y ese es probablemente el hallazgo más accionable de este
   incidente: sin esa señal, un run colgado sólo se descubre cuando una persona lo mira.

## Solución

Pendiente. El orden propuesto es: (a) determinar cuál de las dos hipótesis de encolado/claim aplica
con readback sobre los dos runs colgados, (b) cerrar la causa de raíz, (c) **crear la señal de
«reservado sin attempt tras N minutos»** — que es lo que habría convertido nueve horas de silencio
en una alerta.

## Verificación

- Los dos runs colgados (`96c0ddcd-07bc-4bcc-8de5-d39b74ddbc97` y el de las 11:16) transitan a un
  estado terminal o registran un `attempt` real, y su crédito reservado se libera o se convierte en
  gasto.
- Un experimento nuevo del mismo shape (`image-generate`, `ref/still/rrss-v1`, Seedream 5 Pro sobre
  `fal`) registra `attempts` dentro del primer ciclo del worker.
- La señal de confiabilidad propuesta reporta los runs colgados **antes** de que los mire una
  persona, y se prueba en rojo contra este caso.

## Relacionado

- [`ISSUE-135`](ISSUE-135-globe-governed-run-outbox-infinite-silent-retry.md) — misma familia
  (estado divergente que nadie verifica), mecanismo inverso.
- [`ISSUE-127`](ISSUE-127-globe-generic-error-codes-hide-actionable-causes.md) — códigos genéricos
  de Globe que esconden causas accionables; relevante si al destapar la causa el error queda
  colapsado en un código sin nombre.
- `TASK-1635` — el incidente **se descubrió** al ejercitar una generación real desde el loop local de
  esa task, pero es **anterior e independiente** de ella: lo prueba el run colgado desde las 11:16,
  creado antes de ese trabajo. **No es atribuible a TASK-1635.**

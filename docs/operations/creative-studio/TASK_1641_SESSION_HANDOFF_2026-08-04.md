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
| **2** — señal de ventana por expirar | ✅ código + IaC, ⚠️ **sin aplicar** | `efeonce-globe@17c3fef`; `globe_promotion_window_closing` WARNING a 30 min |
| **3** — contrato de convergencia + su consumidor | ✅ cerrado | `@4a0a18b` (contrato) + `@17c3fef` (consumidor); `globe_promotion_readiness_divergent` ERROR |
| **4** — `canary-confirm` sin 500 opaco | ✅ cerrado | `efeonce-globe@38c528d`; lo probó el sello de Veo que pasó |
| **5** — reserva pre-gasto | ✅ código, ⚠️ **sin desplegar** | `efeonce-globe@21d6ee3`, con medición contra `globe-pg` |
| **6** — runbook | ✅ publicado | `GLOBE_ROUTE_PROMOTION_RUNBOOK_V1.md` + 3 alertas en el triage |

Promociones **selladas** (terminal, no expiran): Omni `promotion_1a5d117e…` y Veo
`promotion_ddd0977c…`, ambas `canary_passed` con binding `enabled` y circuito `closed`.

## Lo único que falta: el ROLLOUT

🔴 **Todo lo de arriba es `code complete, rollout pendiente`.** No hay deploy ni `tofu apply`, así que las
tres alertas **no existen en el proyecto** y la liberación pre-gasto **no corre**. El último criterio de
aceptación —una promoción end-to-end sin intervención artesanal— sólo se puede cerrar después.

Secuencia (la del repo, sin variantes):

1. Push a `main` **no despliega nada**.
2. CI verde sobre el **SHA exacto** (sale de `git rev-parse`, nunca de memoria).
3. `gh workflow run deploy-internal.yml -f service=globe-api-internal -f target_sha=<SHA40>`.
4. Worker: `deploy-producer-worker.yml` con `mode=build` y **después** `mode=deploy`. **Son dos corridas**;
   correr sólo una deja el Job con la imagen anterior, en silencio.
5. `tofu apply` con el plan honesto — **`0 to destroy` es la condición**, y el plan verificado da
   `6 to add, 1 to change, 0 to destroy`:

   ```bash
   tofu plan -var development_environment_enabled=true \
     -var 'development_operator_principal=user:julio.reyes@efeonce.org'
   ```

6. Verificar la **revisión activa** y el digest etiquetado, nunca el workflow en verde.
7. Un 404 de una métrica recién creada es **propagación** (hasta 10 min), no un defecto.

## Lo que se aprendió en esta sesión y no estaba escrito

- 🔴 **El predicado de supersede.** Sin `NOT EXISTS (promoción posterior de la misma identidad)`, la señal
  de readiness divergente habría acusado a `ref/motion/reference-v1` y `ref/video/frames-v1` —las dos que
  **sí** convergieron ese día— porque su readiness dice `promoted` por su promoción **posterior**, que es
  legítima. Y su remedio habría retirado dos rutas vivas. **Una señal sobre historia append-only necesita
  su predicado de vigencia, o su primer disparo es falso.**
- **La métrica de conteo no es sólo por el aligner.** «Segundos restantes» se alinea al revés: pediría
  `COMPARISON_LT` y no existe `ALIGN_MIN` para DISTRIBUTION, así que un p99 sería la promoción **menos**
  urgente. El aligner es la trampa visible; la dirección es la de fondo.
- **El discriminador de gasto es `attempt.providerOperation`, no `lease.kind`.** `POST_SPEND_KINDS` nombra
  bien la asimetría pero clasifica **topes de reintento**: una entrega de `submit` puede haber aceptado con
  la respuesta perdida, y ése es el caso ambiguo que no se debe liberar a ciegas.
- **En `abandon`, el orden lo decide el peor caso.** Liberar va primero (si no, la guarda de idempotencia
  impide liberar en el segundo intento) pero el fallo **no se propaga**: corre después de que la outbox
  cerró la entrega, así que un throw dejaría el experimento `running` para siempre — peor que la reserva
  colgada que el cambio evita.
- **La medición cambió el peso del Scope 5.** La única reserva `held` de toda la base es pre-gasto: el
  100 % del crédito inmovilizado hoy estaba en la rama donde `observable` era falsa.

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

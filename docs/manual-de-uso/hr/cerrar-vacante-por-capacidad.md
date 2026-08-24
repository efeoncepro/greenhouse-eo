> **Tipo de documento:** Manual de uso (operador)
> **Version:** 1.0
> **Creado:** 2026-08-23 por Claude Opus 5 (TASK-1762)
> **Estado de rollout:** `code complete, rollout pendiente` — los dos flags están OFF y el correo
> nace apagado. Este manual describe la operación cuando se habilite.

# Cerrar una vacante por capacidad

## Para qué sirve

Para cerrar de una vez a todas las personas que quedaron en proceso cuando la vacante ya se llenó,
registrando el desenlace correcto —**sin selección**, no descarte— y notificándolas con el mensaje
que corresponde.

## Antes de empezar

Necesitas tres cosas, y si falta una el sistema te frena a propósito:

1. **Capability `hiring.opening.capacity.confirm`.** Es de rol, deliberadamente acotada: ver el
   resumen no habilita confirmarlo.
2. **La vacante con política de capacidad configurada.** Sin ella no hay nada que cerrar.
3. **La capacidad efectivamente llena** — es decir, tantas personas seleccionadas como cupos declara
   la vacante en el campo «Cupos».

## Paso a paso

1. **Revisa el campo «Cupos» de la vacante.** Es el número contra el que se mide todo. Con política
   de capacidad vigente ya no se edita desde el formulario normal: sólo por el camino gobernado, con
   registro de quién y por qué.
2. **Abre el resumen del cierre.** Vas a ver cuántas personas entran, cuántas están en pausa,
   cuántas son respaldo y cuántas quedan fuera por tener ya un desenlace.
3. **Decide sobre pausa y respaldo.** No entran solas. Inclúyelas sólo si de verdad quieres cerrarlas:
   una está en pausa porque alguien lo decidió, y la otra tiene un compromiso abierto contigo.
4. **Confirma.** Desde ese momento el sistema registra a cada persona por separado.
5. **Mira el estado.** Cuando termine dirá **Completado** o **Parcial**.

## Qué NO hacer

- **No confirmes con el resumen viejo.** Si dejaste la pantalla abierta un rato, vuelve a cargarlo.
  El sistema te va a frenar igual, pero es mejor mirar de nuevo que descubrirlo al confirmar.
- **No incluyas «respaldo» por barrer parejo.** Si la persona seleccionada no acepta, ese respaldo es
  tu siguiente opción — y ya la habrías cerrado.
- **No reintentes un cierre parcial a mano** persona por persona. El sistema reanuda solo los
  pendientes; hacerlo aparte duplica el trabajo y confunde la trazabilidad.
- **No pidas que se revierta un cierre.** Los desenlaces se superseden con una decisión nueva y
  auditada, no se borran. Y los correos ya emitidos no se retiran.

## Si algo sale mal

| Señal | Qué significa | Qué hacer |
|---|---|---|
| `hiring.opening.capacity_closure_stuck` | Un cierre lleva más de 30 min sin avanzar | El worker no está procesando. Avisar a Operaciones |
| `hiring.opening.capacity_closure_partial_failed` | Hay personas que no pudieron cerrarse | Revisar caso a caso. **No** reintentar a ciegas |
| El correo no llegó | Puede ser el flag del correo, o el kill-switch del tipo | Verificar `HIRING_CAPACITY_FILLED_EMAIL_ENABLED` **en el ops-worker** y la fila `hiring_decision_not_selected` en `email_type_config` |

## Para quien opera el rollout

Los dos flags viven **sólo en el `ops-worker`** (Cloud Run). Prenderlos en Vercel no hace nada.

```bash
gcloud run services update ops-worker --region us-east4 --project efeonce-group \
  --update-env-vars HIRING_OPENING_CAPACITY_CLOSURE_ENABLED=true
```

Y hay que declararlos también en `services/ops-worker/deploy.sh` — ya están — porque ese script usa
`--set-env-vars`, que es destructivo y borra en el próximo deploy lo que se agregó sólo en vivo.

El correo tiene **un freno más**: la fila de `email_type_config`. Se enciende con un `UPDATE`
gobernado, sin redeploy, y sólo tras el sign-off de Talent y Privacidad sobre el copy.

**Prende el cierre antes que el correo.** Así puedes hacer un canary que registre los desenlaces sin
escribirle a nadie, verificar el readback, y recién después habilitar el envío.

> Referencias técnicas: [ADR de capacidad](../../architecture/GREENHOUSE_HIRING_OPENING_CAPACITY_CLOSURE_DECISION_V1.md) ·
> [ledger de flags](../../operations/FEATURE_FLAG_STATE_LEDGER.md) ·
> [doc funcional](../../documentation/hr/cierre-de-vacante-por-capacidad.md)

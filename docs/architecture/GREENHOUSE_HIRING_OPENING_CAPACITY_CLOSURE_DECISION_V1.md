# Greenhouse Hiring Opening Capacity Closure Decision V1

## Status

- Status: `Proposed`
- Date: `2026-08-21`
- Owner: `Hiring / Talent / Platform`
- Scope: `opening capacity, application disposition, candidate communications, outbox, Hiring Desk`
- Reversibility: `two-way-but-slow`
- Confidence: `high` en la separación de responsabilidades; `medium` en el primer rollout de cohortes
- Validated as of: `2026-08-21`
- Implementation: `TASK-1762` foundation + `TASK-1763` UI consumer

## Context

`TASK-1689` ya envía un correo individual cuando una decisión `rejected` queda persistida. No existe, en cambio,
una fuente de verdad para el número de cupos de una vacante, un cierre explícito de cohorte ni una forma segura de
rechazar y notificar a las candidaturas restantes cuando el último cupo se ocupa. `hiring_opening.status` gobierna
publicación/lifecycle, no capacidad; inferir cupos desde ese estado mezclaría dos conceptos y haría imposible
explicar o recuperar un cierre parcial.

El efecto es sensible: una confirmación puede cambiar múltiples decisiones y enviar comunicaciones externas que no
se pueden retirar. La selección de una persona no demuestra por sí sola que no queden cupos, y el consentimiento de
Banco de Talentos no puede inventarse para suavizar el correo.

## Decision

1. **Capacidad explícita y separada.** Cada opening que use esta capacidad declara un objetivo positivo de cupos.
   La ausencia de política significa `unmanaged`, nunca “un cupo”. Los cupos ocupados se calculan desde decisiones
   vigentes `selected`; no se mantiene un contador mutable paralelo.
2. **Publicación, capacidad y comunicaciones son ejes distintos.** Pausar/cerrar publicación no consume cupos ni
   rechaza personas. Seleccionar no cierra la cohorte ni envía rechazos masivos.
3. **Flujo `preview → confirm → execute`.** Un reader re-lee opening, cupos, decisiones y comunicaciones y produce
   una cohorte allowlisted con conteos y digest. La confirmación humana revalida versión/digest bajo lock, persiste
   un run durable y emite el hecho de cierre. El worker ejecuta cada item idempotentemente mediante el command de
   decisión canónico; nunca hace `UPDATE` masivo directo.
4. **Cohorte exacta.** Sólo pertenecen al run aplicaciones de la misma opening cuya decisión vigente no sea
   `selected`, `rejected` o `withdrawn`. `on_hold` y `backup_selected` se muestran separados en el preview y sólo se
   superseden si la confirmación los incluye explícitamente. Otras openings de la persona no cambian.
5. **Comunicación por hechos persistidos.** Cada supersede a `rejected` emite el evento canónico
   `hiring.application.decided` con causa allowlisted `capacity_filled`. El consumer de `TASK-1689` re-lee PG,
   deduplica por event/decision/application y elige la variante directa o “vacante completada”. El run no envía
   correo directamente.
6. **Banco de Talentos condicionado a consentimiento.** El email sólo afirma “mantendremos tu perfil” cuando el
   consentimiento de contacto futuro está vigente. Sin consentimiento vigente, no hace esa promesa ni crea opt-in;
   la retención legal y el contacto futuro conservan sus políticas propias.
7. **Procedencia no gatea comunicaciones.** `data_origin` nunca decide si una persona recibe el correo. Los canaries
   usan identidades y destinatarios allowlisted, no filtros de procedencia en el dominio.
8. **Reapertura explícita.** Reabrir una vacante no revierte decisiones ni emails. Reconsiderar a una persona es una
   nueva decisión/invitación auditada.

## Runtime Contract

- Foundation: `src/lib/hiring/opening-capacity/**` con reader de preview, command de confirmación, store y eventos.
- Persistencia aditiva: `greenhouse_hiring.hiring_opening_capacity`,
  `greenhouse_hiring.hiring_opening_closure_run` y `greenhouse_hiring.hiring_opening_closure_run_item`.
- Decisión individual: `src/lib/hiring/decide.ts`; se extiende con causa allowlisted, actor e idempotencia, no se
  reemplaza.
- Comunicación: `src/lib/hiring/notifications/**` + `src/emails/HiringDecisionEmail.tsx`; el email re-lee nombre,
  vacante, causa y consentimiento vigente antes de enviar.
- UI: Application 360 consume sólo los readers/commands de `TASK-1762`; no calcula cohortes ni cupos en browser.
- Capability granular para preview/confirm; outbox y audit contienen IDs/conteos, nunca PII ni copy del correo.
- Flags default OFF independientes para ejecución de cierre y variante de email por capacidad; el kill-switch de
  `hiring_decision_rejected` sigue operativo.

## Alternatives Considered

| Alternativa | Decisión |
| --- | --- |
| Rechazar automáticamente al registrar la última selección | Rechazada: confunde selección con capacidad y produce un efecto externo irreversible sin revisar cohorte. |
| Usar `hiring_opening.status='closed'` como capacidad llena | Rechazada: publicación/lifecycle no representa número de cupos. |
| Un `UPDATE ... WHERE opening_id` más envío batch | Rechazada: evita el command/audit por aplicación, dificulta retries y deja cierres parciales opacos. |
| Sólo mejorar el template de rechazo | Insuficiente: no resuelve cierre, cohorte, idempotencia ni consentimiento. |
| Run durable por item sobre commands existentes | Aceptada: conserva un hecho por aplicación, retry seguro y trazabilidad. |

## Consequences

### Positive

- El operador ve a cuántas personas afectará antes de confirmar.
- Un fallo parcial puede reanudarse sin duplicar decisiones ni correos.
- El mismo evento individual sostiene rechazo manual y cierre por capacidad sin un segundo pipeline de email.
- La promesa de Banco de Talentos permanece verdadera y consentida.

### Negative

- Requiere tres tablas aditivas, un worker/reconciler y una UI de dos pasos.
- La cohorte puede cambiar entre preview y confirm; el sistema debe fallar `stale` y pedir una nueva revisión.
- `backup_selected` exige una elección visible adicional y no puede colapsarse con postulaciones sin decisión.

## Quality Scenarios

- Con dos operadores confirmando el mismo cierre, un solo run queda vigente y cada application recibe como máximo
  una nueva decisión y un correo por esa causa.
- Si el worker cae después de procesar parte de la cohorte, al reanudar procesa sólo items pendientes y converge a
  `completed|partial_failed` con conteos reconciliables.
- Si una decisión cambia tras el preview, la confirmación falla con `hiring_opening_closure_preview_stale` y no
  persiste run ni envía correo.
- Si el consentimiento futuro no está vigente, ninguna variante afirma que el perfil será mantenido para contacto.

## Revisit When

- Un opening necesita cupos por ubicación, jornada o fulfillment y el objetivo simple por opening resulta insuficiente.
- El volumen exige otro runtime o particionamiento; debe probarse con métricas, no asumirse.
- La política legal de retención/consentimiento cambia.
- Se decide que `backup_selected` consume una reserva formal distinta de un cupo contratado.

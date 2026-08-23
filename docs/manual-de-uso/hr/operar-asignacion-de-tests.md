# Operar la asignación de tests por etapa

> **Tipo de documento:** Manual de uso / runbook
> **Versión:** 1.3
> **Creado:** 2026-08-17 por Claude (TASK-1719)
> **Última actualización:** 2026-08-23 por Claude (TASK-1771 — desatascar una asignación automática)
> **Documentación funcional:** [`asignacion-de-tests-por-etapa.md`](../../documentation/hr/asignacion-de-tests-por-etapa.md)
> **ADR:** [`GREENHOUSE_HIRING_ASSESSMENT_ASSIGNMENT_POLICY_DECISION_V1.md`](../../architecture/GREENHOUSE_HIRING_ASSESSMENT_ASSIGNMENT_POLICY_DECISION_V1.md)

## Para qué sirve

Declarar qué prueba le corresponde a una vacante, asignarla, cancelarla, otorgar ajustes razonables
y —cuando el equipo lo decida— dejar que se asigne sola al mover una postulación de etapa.

## Antes de empezar

- Necesitas la capability `hiring.assessment.policy.govern` para declarar o habilitar la
  política, y `hiring.assessment.author` para asignar o cancelar una prueba puntual. Son
  distintas a propósito: configurar la regla de una vacante no es lo mismo que mandarle un
  correo a una persona.
- Para **otorgar un ajuste razonable** necesitas `hiring.assessment.grant_accommodation`, que es
  otra distinta y más acotada: conceder una adaptación a una persona concreta no es lo mismo que
  autorar contenido de evaluación.
- **La automatización viene apagada.** Hoy sólo funciona el camino manual. Encenderla es un
  procedimiento aparte, más abajo.
- **No hay pantalla todavía** para configurar la política ni para cancelar. Se opera por API
  mientras la interfaz no exista.

## Paso a paso — declarar la prueba de una vacante

1. **Consulta el estado actual:**
   ```bash
   pnpm staging:request /api/hiring/openings/<openingId>/assessment-policy
   ```
2. **Declara la política.** Nace siempre en borrador: configurarla NO la enciende.
   ```bash
   pnpm staging:request PUT /api/hiring/openings/<openingId>/assessment-policy '{"templateId":"<atpl-...>","mode":"manual","triggerStage":"shortlisted","timeLimitMinutes":45}'
   ```

   **Usa `shortlisted` (Preselección) salvo que tengas una razón deliberada para otra cosa.**
   La prueba es la evidencia con la que se arma la entrevista, no un paso posterior: si llega
   al entrar a Entrevista, entrevistas a ciegas y lees el resultado cuando ya no puede cambiar
   ninguna pregunta. Y hay una razón de equidad más fuerte: una prueba no pagada aplicada
   temprano no sesga por el puntaje, sesga por **quién logra completarla** — y esa gente nunca
   llega a tener puntaje, así que el sesgo no aparece en ninguna métrica. En Preselección la
   población ya está acotada y el pedido tiene contrapartida para el candidato.

   `interview` sigue siendo válida (por ejemplo, una prueba después de una primera conversación),
   pero elegirla debería ser una decisión, no el default.
3. **Habilítala** cuando esté revisada. Requiere que la vacante esté publicada:
   ```bash
   pnpm staging:request POST /api/hiring/openings/<openingId>/assessment-policy '{"action":"enable"}'
   ```

Para apagarla, la misma ruta con `{"action":"disable"}`. Deshabilitar es el freno de mano: no
borra nada y detiene toda asignación nueva de esa vacante.

## Paso a paso — asignar una prueba a un candidato

Son dos pasos, y el segundo sólo ejecuta lo que el primero mostró.

1. **Propón** y **lee la vista previa completa** antes de seguir:
   ```bash
   pnpm staging:request POST /api/hiring/applications/<applicationId>/assessment-assignment '{"action":"propose"}'
   ```
   Mira `blockingReasonCode`: si trae algo, la asignación no va a proceder y el motivo está ahí.
2. **Confirma** con el identificador que devolvió el paso anterior:
   ```bash
   pnpm staging:request POST /api/hiring/applications/<applicationId>/assessment-assignment '{"action":"confirm","proposalId":"<haap-...>"}'
   ```

**Lee el campo `status` de la respuesta, no el código HTTP.** Un 200 no significa que se asignó:
significa que la operación se procesó. Los estados posibles son `assigned`, `already_assigned`,
`held`, `blocked`, `stale` y `cancelled`.

## Paso a paso — cancelar una prueba no iniciada

```bash
pnpm staging:request POST /api/hiring/assessments/<assessmentId>/cancel '{"reasonCode":"<motivo>","note":"<opcional>"}'
```

Si la respuesta trae `operatorFollowupRequired: true`, **el correo con el enlace ya había salido**.
Escríbele tú a la persona: la plataforma no manda una corrección automática a propósito.

## Paso a paso — otorgar un ajuste razonable (tiempo extra)

Cuando un candidato pide más tiempo —responde el correo diciendo que tiene una condición de salud,
una discapacidad o una situación temporal— así se lo concedes:

```bash
pnpm staging:request POST /api/hiring/assessments/<assessmentId>/accommodations '{"extraMinutes":30}'
```

La respuesta trae `outcome`:

| `outcome` | Qué pasó |
|---|---|
| `granted` | Primer ajuste de esta prueba |
| `replaced` | Ya tenía uno y quedó reemplazado por el nuevo monto (`previousExtraMinutes` dice cuál era) |
| `unchanged` | Ya tenía exactamente ese monto. No se tocó nada |

**Lo que necesitas saber antes de usarlo:**

- **Entre 1 y 180 minutos**, enteros. Fuera de rango es un `400`.
- **Se puede otorgar mientras la persona está rindiendo**, no sólo antes: el contador se le alarga
  en el momento. Si ya entregó, ya está corregida o ya venció, la respuesta es `409` — no queda
  tiempo que extender. En ese caso lo que corresponde es asignar una prueba nueva.
- **Volver a otorgar reemplaza, no suma.** Si pusiste 15 y correspondían 45, mandas 45 y queda 45.
- **No pidas ni registres el motivo en ningún campo.** El endpoint no acepta uno a propósito: el
  motivo de un ajuste revela una condición protegida, y guardarlo crearía el dato con el que
  después se discrimina. Si necesitas dejar constancia de la conversación, escríbela en el
  **expediente de evaluación** de la postulación, que tiene su propio control de acceso.
- **Avísale tú al candidato** que se lo concediste. La plataforma no manda un correo automático,
  igual que en una cancelación.
- Necesitas ser **People** (`EFEONCE_ADMIN`, `HR_MANAGER` o `EFEONCE_OPERATIONS`). No alcanza con
  poder autorar pruebas.

## Paso a paso — desatascar una asignación automática bloqueada

Cuando el sistema intenta mandar la prueba solo y algo lo bloquea, el intento queda registrado y
**reserva el lugar** de esa persona en esa vacante. Eso evita que un error de configuración le mande
la misma prueba tres veces a alguien, pero mientras el lugar siga reservado la postulación
**desaparece de la lista de recuperación**. Este procedimiento lo libera.

Necesitas `hiring.assessment.policy.govern` — la misma con la que se habilita la asignación
automática. Es a propósito: quien puede prender el carril es quien puede desatascarlo.

1. **Mira la lista.** La cola `deadEnds` del endpoint de reconciliación:

   ```bash
   pnpm staging:request /api/hiring/openings/<openingId>/assessment-policy/reconciliation
   ```

   Cada fila trae su evaluación: si hoy la prueba se mandaría o si la causa sigue viva.

2. **Si dice que la causa sigue vigente, corrígela primero.** El campo te dice cuál es
   (`policy_disabled`, `template_inactive`, `volume_cap`, `missing_email`…). Liberar sin corregir
   **no funciona** —la plataforma lo rechaza— y si funcionara sería peor: volvería a bloquear en el
   acto y habría gastado uno de los tres intentos de esa persona.

3. **Libera el lugar** cuando la evaluación diga que hoy se mandaría:

   ```bash
   pnpm staging:request POST /api/hiring/openings/<openingId>/assessment-policy/reconciliation/supersede '{"assignmentId":"<hoaa-...>"}'
   ```

   La respuesta trae `recoveryCount` y `remainingRecoveries`. **Tres recuperaciones por persona y
   vacante**; al agotarse, el caso pasa a revisión humana.

4. **Manda la prueba por el camino normal.** Liberar **no manda ningún correo**: sólo devuelve la
   postulación a la cola. El envío sigue siendo proponer → confirmar, con su vista previa.

5. **Verifica.** La postulación debe reaparecer en `awaitingAssignment`, y el registro debe
   conservar el motivo original del bloqueo — liberar no lo borra.

## Qué significan los estados

| Estado | Qué pasó | Qué hacer |
|---|---|---|
| `assigned` | Se creó la prueba. No prueba despacho ni entrega del correo | Verifica el canal si es un caso sensible; no reasignes para reenviar |
| `already_assigned` | Ya existía. No se creó nada nuevo ni salió otro correo | Nada |
| `blocked` | Falta algo estructural (correo del candidato, plantilla inactiva, política apagada) | Corrige la causa y vuelve a proponer: ahora sí asigna |
| `held` | Se alcanzó el tope de envíos de la ventana | Espera, o revisa si el tope está bien calibrado |
| `stale` | El mundo cambió entre proponer y confirmar | Vuelve a proponer y mira la vista previa nueva |

> **Sobre "vuelve a proponer" en `blocked`, `held` y `stale`.** Desde `TASK-1755` esa instrucción
> hace lo que promete: corregida la causa, la confirmación siguiente abre un intento nuevo y asigna.
> Antes el intento bloqueado ocupaba el cupo de esa persona de forma permanente y ninguna
> corrección lo liberaba. El intento viejo **no se borra** — queda en el historial como intento 1 y
> el nuevo entra como intento 2.
>
> Dos límites que siguen vigentes: **(a)** un `assigned` vigente no se reintenta (para eso está
> cancelar, que libera el cupo); **(b)** esto aplica al carril **manual**. Un bloqueo del carril
> automático (al mover de etapa) todavía no se destraba solo: asigna a mano esa postulación.

## Encender la automatización (procedimiento, no un interruptor)

El orden importa y ninguno de estos pasos es opcional:

1. La vacante del piloto debe tener su política en `mode=on_stage_entry` y `state=enabled`.
2. **Drena el backlog del consumidor antes de encender.** El consumidor es nuevo, y en su
   primera corrida ve todo el historial de cambios de etapa. Lo contiene la ventana de 24 horas,
   pero hay que confirmarlo mirando `outbox_reactive_log`: los eventos viejos deben aparecer como
   `stale`, nunca como envíos.
3. Verifica que cancelar y reasignar funcionan en esa vacante.
4. Recién ahí, enciende el flag **en el ops-worker** (no en Vercel — ahí no hace nada):
   ```bash
   gcloud run services update ops-worker --region us-east4 --update-env-vars HIRING_STAGE_TEST_ASSIGNMENT_ENABLED=true
   ```
   Y déjalo declarado en `services/ops-worker/deploy.sh`, o el próximo despliegue lo borra **en
   silencio**.
5. Monitorea 7 días una sola vacante antes de expandir.

**Rollback (menos de 5 minutos):** el mismo comando con `false`, más dejar las políticas en
`disabled`. Nunca borres pruebas ni registros para revertir.

## Qué NO hacer

- **No muevas etapas en lote con la automatización encendida.** Cada movimiento es un correo a
  una persona real.
- **No enciendas el flag en Vercel.** No hace nada, y deja a todos creyendo que está activo.
- **No canceles una prueba ya empezada** para "reiniciarla": no se puede, y por buenas razones.
- **No interpretes un 200 como éxito.** Lee `status`.
- **No borres filas del registro de asignaciones** para arreglar algo. Es la respuesta a "quién
  autorizó este correo".
- **No alargues el tiempo de la plantilla para acomodar a una persona.** Eso se lo alarga a toda la
  cohorte y rompe la comparabilidad. Para eso existe el ajuste razonable.
- **No anotes el motivo del ajuste en el campo de nota de otra operación** (por ejemplo, cancelando
  y recreando con una nota). El motivo no va en ningún campo de la prueba.
- **No liberes un lugar reservado sin haber corregido la causa.** La plataforma te lo va a
  rechazar, y esa negativa es la protección: liberar y volver a bloquear gasta uno de los tres
  intentos de recuperación de esa persona.
- **No uses liberar como forma de "reenviar" una prueba.** No manda nada. Si el candidato perdió el
  acceso a una prueba que YA recibió, eso es recuperación de acceso, otro procedimiento
  (`recuperar-acceso-a-test-de-candidato.md`).

## Problemas comunes

- **"Confirmé y me dijo que estaba vencida"**: pasaron más de 30 minutos desde que propusiste.
  Propón de nuevo y revisa la vista previa: puede que algo haya cambiado.
- **"El candidato avanzó y no recibió nada"**: revisa el panel de operaciones. Si la señal de
  salud muestra postulaciones esperando, están en la lista de recuperación:
  ```bash
  pnpm staging:request /api/hiring/openings/<openingId>/assessment-policy/reconciliation
  ```
  Esa lista tiene dos partes: las que todavía se pueden recuperar solas y las que ya avanzaron
  de etapa y necesitan que una persona decida.
- **"El candidato entró a la etapa, no recibió nada y tampoco aparece esperando"**: es el caso de
  esta versión. Su intento automático quedó registrado y reservó el lugar. Búscalo en la cola
  `deadEnds` del mismo endpoint y sigue el procedimiento de desatasco.
- **"Me rechaza liberar y dice que la causa sigue vigente"**: es correcto, no es un permiso que te
  falte. La respuesta trae `liveReason` con la causa de HOY, que puede ser distinta de la
  registrada — por ejemplo quedó anotado `volume_cap` y hoy la política está apagada. Corrige ésa.
- **"Aparecen asignaciones a medio registrar"**: eso no debería ocurrir nunca. Es un error de la
  plataforma, no de operación. Escala en vez de intentar limpiarlo.

## Referencias técnicas

- Política y ledger: `src/lib/hiring/assessment/assignment-policy/**`
- Cancelación: `src/lib/hiring/assessment/cancel.ts`
- Ajustes razonables: `src/lib/hiring/assessment/accommodations.ts` (capability `hiring.assessment.grant_accommodation`)
- Decisión de comunicación: `src/lib/hiring/stage-comms/**`
- Señal de salud: `hiring.assessment.assignment_health`
- Flag y su runtime: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

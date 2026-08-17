# Operar la asignación de tests por etapa

> **Tipo de documento:** Manual de uso / runbook
> **Versión:** 1.0
> **Creado:** 2026-08-17 por Claude (TASK-1719)
> **Documentación funcional:** [`asignacion-de-tests-por-etapa.md`](../../documentation/hr/asignacion-de-tests-por-etapa.md)
> **ADR:** [`GREENHOUSE_HIRING_ASSESSMENT_ASSIGNMENT_POLICY_DECISION_V1.md`](../../architecture/GREENHOUSE_HIRING_ASSESSMENT_ASSIGNMENT_POLICY_DECISION_V1.md)

## Para qué sirve

Declarar qué prueba le corresponde a una vacante, asignarla, cancelarla y —cuando el equipo lo
decida— dejar que se asigne sola al mover una postulación de etapa.

## Antes de empezar

- Necesitas la capability `hiring.assessment.policy.govern` para declarar o habilitar la
  política, y `hiring.assessment.author` para asignar o cancelar una prueba puntual. Son
  distintas a propósito: configurar la regla de una vacante no es lo mismo que mandarle un
  correo a una persona.
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

## Qué significan los estados

| Estado | Qué pasó | Qué hacer |
|---|---|---|
| `assigned` | Se creó la prueba. El correo sale por su propio camino | Nada. Verifica la entrega si es un caso sensible |
| `already_assigned` | Ya existía. No se creó nada nuevo ni salió otro correo | Nada |
| `blocked` | Falta algo estructural (correo del candidato, plantilla inactiva, política apagada) | Corrige la causa y vuelve a proponer |
| `held` | Se alcanzó el tope de envíos de la ventana | Espera, o revisa si el tope está bien calibrado |
| `stale` | El mundo cambió entre proponer y confirmar | Vuelve a proponer y mira la vista previa nueva |

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
- **"Aparecen asignaciones a medio registrar"**: eso no debería ocurrir nunca. Es un error de la
  plataforma, no de operación. Escala en vez de intentar limpiarlo.

## Referencias técnicas

- Política y ledger: `src/lib/hiring/assessment/assignment-policy/**`
- Cancelación: `src/lib/hiring/assessment/cancel.ts`
- Decisión de comunicación: `src/lib/hiring/stage-comms/**`
- Señal de salud: `hiring.assessment.assignment_health`
- Flag y su runtime: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

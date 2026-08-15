# Operar los Emails del Ciclo de Hiring

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.1
> **Creado:** 2026-08-12 por Claude (TASK-1689)
> **Documentacion funcional:** [emails-ciclo-hiring.md](../../documentation/hr/emails-ciclo-hiring.md)

## Para qué sirve

Prender, apagar, pausar y diagnosticar los 7 correos automáticos del proceso de contratación
(aviso interno de postulación, acuse al candidato, test asignado, test completado para People,
avance de etapa, seleccionado y no seleccionado).

## Antes de empezar

- Los correos los envía el **ops-worker** (Cloud Run), no Vercel. Prender el flag en Vercel no
  hace nada.
- El buzón interno por defecto es `people@efeoncepro.com`; se cambia con la env var
  `HIRING_INTERNAL_NOTIFICATIONS_EMAIL` del ops-worker.
- El primer encendido en producción ya se hizo el 2026-08-12, con ejercicio E2E real
  (EO-APP-0090: 5 tipos con `status=sent` y asuntos personalizados). Las instrucciones de esta
  guía aplican ahora para pausar, re-encender o diagnosticar el sistema.

## Prender / apagar el sistema completo

El flag `HIRING_LIFECYCLE_EMAILS_ENABLED` está declarado en `services/ops-worker/deploy.sh`
(default `true` desde el 2026-08-12; revisión `ops-worker-00548-x52`). Para cambiarlo de forma
durable: cambiar el default (o exportar la var) y redeployar el worker. Para efecto inmediato
SIN esperar deploy:

```bash
gcloud run services update ops-worker --region us-east4 --project efeonce-group --update-env-vars HIRING_LIFECYCLE_EMAILS_ENABLED=true
```

⚠️ El update en caliente se borra en el próximo deploy si el default del `deploy.sh` no se
cambió también (bug class del 2026-07-10). Siempre hacer ambos y verificar la revisión activa.

## Pausar un correo puntual (sin deploy, efecto inmediato)

Cada tipo tiene kill-switch en la tabla `greenhouse_notifications.email_type_config`. Ejemplo —
pausar sólo el correo de rechazo:

```sql
UPDATE greenhouse_notifications.email_type_config
SET enabled = FALSE, paused_reason = 'Talent revisa el copy', paused_by = 'people-ops'
WHERE email_type = 'hiring_decision_rejected';
```

Para reanudar: `enabled = TRUE, paused_reason = NULL`. Tipos disponibles:
`hiring_application_received_internal`, `hiring_application_confirmation`,
`hiring_assessment_assigned`, `hiring_assessment_submitted_internal`,
`hiring_stage_advanced`, `hiring_decision_selected`,
`hiring_decision_rejected`.

El tipo `hiring_assessment_submitted_internal` queda disponible después de aplicar su migración y
desplegar el ops-worker que registra el consumer. Antes de ese rollout, una fila habilitada por sí
sola no crea el envío.

## Qué significan las señales

- En el reactive log del worker, cada consumer deja un mensaje por evento: `sent` (enviado),
  `dedupe` (ya se había enviado — normal en retries), `skip: flag OFF`, `skip: sin email`
  (candidato sin correo resoluble — se captura en Sentry dominio `hiring`), `no-op` (evento que
  no corresponde notificar: etapa interna, scorecard, decisión que no notifica).
- El registro de cada envío queda en `greenhouse_notifications.email_deliveries`
  (`email_type LIKE 'hiring%'`).

## Qué no hacer

- No enviar estos correos "a mano" por fuera de la plataforma para el mismo hito — genera dobles.
- No editar el copy directo en producción: el copy vive en `src/emails/Hiring*.tsx` y pasa por
  revisión (`greenhouse-ux-writing`).
- No reenviar un test compartiendo el link viejo: si el candidato perdió el correo, re-asignar
  desde el Hiring Desk genera un evento nuevo (el link anterior se invalida al rotar el token).

## Problemas comunes

| Síntoma | Causa probable | Acción |
|---|---|---|
| No llega ningún correo | Flag OFF en el ops-worker (o borrado por un deploy) | Verificar env de la revisión activa + `deploy.sh` |
| No llega un tipo puntual | Kill-switch pausado | Revisar `email_type_config` |
| Candidato dice que el link del test no funciona | Token rotado por re-asignación o expirado (14 días) | Re-asignar el test desde el Desk |
| Correo interno no llega | Buzón mal configurado | Revisar `HIRING_INTERNAL_NOTIFICATIONS_EMAIL` |
| No llega el aviso de test completado | Worker sin el consumer nuevo, migración pendiente o evento aún no drenado | Verificar revisión activa del ops-worker, fila `hiring_assessment_submitted_internal` y reactive log |

## Referencias técnicas

- Consumers: `src/lib/sync/projections/hiring-lifecycle-emails.ts`
- Política de dominio: `src/lib/hiring/notifications/`
- Ledger de flags: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- Arquitectura: `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (Delta 2026-08-12)

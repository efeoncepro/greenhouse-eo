# Operar los Emails del Ciclo de Hiring

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.2
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

El tipo `hiring_assessment_submitted_internal` ya está disponible en el ops-worker activo. No envía
resultado, respuestas ni cambia una etapa: sólo avisa a People que existe un test listo para revisar.
Su primer envío productivo sigue como smoke pendiente; no re-proceses un evento histórico para obtenerlo.

## Qué significan las señales

- En el reactive log del worker, cada consumer deja un mensaje por evento: `sent` (proveedor aceptó el
  despacho; **no prueba entrega al buzón**),
  `dedupe` (ya se había enviado — normal en retries), `skip: flag OFF`, `skip: sin email`
  (candidato sin correo resoluble — se captura en Sentry dominio `hiring`), `no-op` (evento que
  no corresponde notificar: etapa interna, scorecard, decisión que no notifica).
- El registro de cada envío queda en `greenhouse_notifications.email_deliveries`
  (`email_type LIKE 'hiring%'`).
- Sólo un webhook firmado del proveedor puede registrar `delivered`, `bounced`, `complained`, `suppressed`
  u otro lifecycle posterior. `opened` y `clicked` no reemplazan `delivered`.
- El receptor global de Resend, la reconciliación y el recovery de assessment están code-complete, pero su
  rollout sigue pendiente. No presentes esos estados como activos hasta verificar registro del webhook,
  secreto, migraciones, deploy y canary live.

## Qué no hacer

- No enviar estos correos "a mano" por fuera de la plataforma para el mismo hito — genera dobles.
- No editar el copy directo en producción: el copy vive en `src/emails/Hiring*.tsx` y pasa por
  revisión (`greenhouse-ux-writing`).
- No reenviar un test compartiendo el link viejo. Mientras exista una instancia abierta, re-asignar la
  misma plantilla falla con `assessment_already_open`; revisa el consumer y su delivery en vez de
  inventar un segundo test o intentar recuperar el token desde SQL/logs.

## Gate previo al transporte token-sensitive (TASK-1746)

El código que reserva un intent antes de rotar una credencial depende de un índice único creado fuera del
migrator para no bloquear las escrituras del resto de correos. Antes de desplegar esos writers en cualquier
entorno compartido, ejecuta con el rol operativo autorizado:

```bash
pnpm pg:connect --file scripts/operations/task-1746-create-token-intent-index.sql
```

El script es fail-closed: comprueba duplicados, rechaza un índice homónimo inválido o incompleto, usa
`CREATE UNIQUE INDEX CONCURRENTLY`, repite el control de duplicados y finalmente exige que PostgreSQL reporte
el índice como `unique`, `valid` y `ready`, con las tres columnas y el predicado esperados. Conserva esa salida
como evidencia del rollout. Si el script falla, no despliegues los writers ni intentes crear el índice dentro
de una migración transaccional. El sender outbound existente permanece operativo; corrige el preflight o sigue
la instrucción explícita del script para retirar gobernadamente un índice inválido antes de reintentar.

Orden obligatorio: índice con readback verde → migración → deploy de writers/rutas → smoke consentido →
monitoreo de `email.delivery.lifecycle_health`. El código del recovery y de la sesión pública ya existe, pero
el email de recovery nace deshabilitado, la UI operativa no está desplegada y el cutover de links públicos
permanece OFF. No habilites una pieza aislada.

## Problemas comunes

| Síntoma | Causa probable | Acción |
|---|---|---|
| No llega ningún correo | Flag OFF en el ops-worker (o borrado por un deploy) | Verificar env de la revisión activa + `deploy.sh` |
| No llega un tipo puntual | Kill-switch pausado | Revisar `email_type_config` |
| Candidato dice que el link del test no funciona | Token rotado, expirado (14 días) o instancia ya iniciada | Revisa la instancia y el delivery; no re-asignes mientras siga abierta ni intentes recuperar el token |
| Figura `sent`, pero el candidato no recibió nada | El proveedor aceptó el despacho; no existe prueba de entrega o el lifecycle aún no está activo | No marques como entregado ni reintentes a ciegas; sigue [Recuperar acceso al test de un candidato](recuperar-acceso-a-test-de-candidato.md) |
| Email bloqueado por `bounced`, `complained` o `suppressed` | El canal email no es seguro para otro intento | Después del rollout, usa enlace seguro con verificación de identidad; antes del rollout, escala el caso |
| Correo interno no llega | Buzón mal configurado | Revisar `HIRING_INTERNAL_NOTIFICATIONS_EMAIL` |
| No llega el aviso de test completado | Evento publicado antes del consumer, kill-switch pausado o evento aún no drenado | No hay backfill: verifica revisión activa, fila `hiring_assessment_submitted_internal`, `email_deliveries` y reactive log para el test nuevo |

## Referencias técnicas

- Consumers: `src/lib/sync/projections/hiring-lifecycle-emails.ts`
- Política de dominio: `src/lib/hiring/notifications/`
- Índice de intents token-sensitive: `scripts/operations/task-1746-create-token-intent-index.sql`
- Ledger de flags: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- Arquitectura: `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (Delta 2026-08-12)
- Recuperación: `docs/manual-de-uso/hr/recuperar-acceso-a-test-de-candidato.md`

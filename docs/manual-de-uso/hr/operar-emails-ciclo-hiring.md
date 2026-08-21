# Operar los Emails del Ciclo de Hiring

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.4
> **Creado:** 2026-08-12 por Claude (TASK-1689)
> **Ultima actualizacion:** 2026-08-21 por Codex (correo de persona seleccionada)
> **Documentacion funcional:** [emails-ciclo-hiring.md](../../documentation/hr/emails-ciclo-hiring.md)

## Para qué sirve

Prender, apagar, pausar y diagnosticar los 9 correos automáticos del proceso de contratación
(aviso interno de postulación, acuse al candidato, test asignado, recuperación de acceso al test,
aviso de rotación de acceso, test completado para People, avance de etapa, seleccionado y no
seleccionado).

## Antes de empezar

- Los correos los envía el **ops-worker** (Cloud Run), no Vercel. Prender el flag en Vercel no
  hace nada.
- El buzón interno por defecto es `people@efeoncepro.com`; se cambia con la env var
  `HIRING_INTERNAL_NOTIFICATIONS_EMAIL` del ops-worker.
- **Las respuestas de los candidatos también llegan a `people@efeoncepro.com`.** Los ocho tipos
  candidate-facing declaran ese buzón como `Reply-To` (env var `HIRING_CANDIDATE_REPLY_TO_EMAIL`).
  Antes no existía ningún `Reply-To` y la respuesta caía en la dirección de envío del proveedor, que
  nadie lee. Ese buzón tiene que estar atendido: el aviso de rotación le promete al candidato,
  textualmente, que responder sirve.
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

Cada tipo tiene kill-switch en la tabla `greenhouse_notifications.email_type_config`. **Usa el
comando gobernado, no SQL suelto:**

```bash
pnpm hiring:email-type -- --type hiring_decision_rejected          # dry-run: muestra el estado actual
pnpm hiring:email-type -- --type hiring_decision_rejected --off --apply
pnpm hiring:email-type -- --type hiring_decision_rejected --on --apply
```

⚠️ **En esa tabla una fila AUSENTE significa ENCENDIDO.** La resolución es fail-open, así que un
`UPDATE` que no toca ninguna fila deja el correo prendido y parece que lo apagaste. El comando hace
upsert, exige el tipo explícito y corre en dry-run por defecto para que el estado deje de ser
implícito.

Tipos disponibles: `hiring_application_received_internal`, `hiring_application_confirmation`,
`hiring_assessment_assigned`, `hiring_assessment_access_recovery`,
`hiring_assessment_access_rotated`, `hiring_assessment_submitted_internal`,
`hiring_stage_advanced`, `hiring_decision_selected`, `hiring_decision_rejected`.

`hiring_decision_selected` confirma que la persona fue elegida, pero no comunica incorporación. Explica que el
siguiente paso es recibir y aceptar la carta oferta y que después se avanza a la firma del contrato. Su ilustración
es decorativa y secundaria: si el cliente de correo bloquea imágenes, el asunto, el título y el cuerpo conservan el
mensaje completo.

Los dos de acceso están **encendidos**: `hiring_assessment_access_recovery` desde el 2026-08-19 y
`hiring_assessment_access_rotated` desde el 2026-08-20, este último con autorización del CEO.
Apagar el segundo deja al candidato sin enterarse de que su acceso fue reemplazado; ver
[Recuperar acceso al test de un candidato](recuperar-acceso-a-test-de-candidato.md).

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
- El receptor global de Resend, la reconciliación y la recuperación de acceso al assessment quedaron
  operativos en producción (TASK-1745 y TASK-1746, 2026-08-19). La pantalla del operador y el aviso de
  rotación al candidato están en `develop`/staging; su promoción a producción es un paso aparte.

## Qué no hacer

- No enviar estos correos "a mano" por fuera de la plataforma para el mismo hito — genera dobles.
- No editar el copy directo en producción: el copy vive en `src/emails/Hiring*.tsx` y pasa por
  revisión (`greenhouse-ux-writing`).
- No reenviar un test compartiendo el link viejo. Mientras exista una instancia abierta, re-asignar la
  misma plantilla falla con `assessment_already_open`. Para darle otro acceso a la persona existe la
  acción gobernada de recuperación: nunca inventes un segundo test ni busques el token en SQL o logs.

## Gate previo al transporte token-sensitive (TASK-1746)

> Este gate **ya se ejecutó**: el índice `uq_email_deliveries_token_intent_v2` está creado y la migración
> aplicada. Queda aquí como procedimiento para un entorno nuevo o para reconstruir el índice.

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
monitoreo de `email.delivery.lifecycle_health`. El cutover de links públicos
(`HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED`) sigue **OFF**. No habilites una pieza aislada.

## Problemas comunes

| Síntoma | Causa probable | Acción |
|---|---|---|
| No llega ningún correo | Flag OFF en el ops-worker (o borrado por un deploy) | Verificar env de la revisión activa + `deploy.sh` |
| No llega un tipo puntual | Kill-switch pausado | Revisar `email_type_config` |
| Candidato dice que el link del test no funciona | Token rotado, expirado (14 días) o instancia ya iniciada | Recupera el acceso desde la ficha; no re-asignes mientras la instancia siga abierta ni busques el token |
| Figura `sent`, pero el candidato no recibió nada | El proveedor aceptó el despacho; no existe prueba de entrega o el lifecycle aún no está activo | No marques como entregado ni reintentes a ciegas; sigue [Recuperar acceso al test de un candidato](recuperar-acceso-a-test-de-candidato.md) |
| Email bloqueado por `bounced`, `complained` o `suppressed` | El canal email no es seguro para otro intento | Usa el enlace temporal, verificando identidad primero. No insistas por correo: no va a salir y desgasta la reputación de envío del dominio |
| El candidato no se enteró de que le rotaron el acceso | La entrega en mano falló y el aviso no salió (sin correo, buzón bloqueado o kill-switch apagado) | Revisa la señal `hiring.assessment.access_recovery.rotation_unnotified` en `/admin/operations` (normal = 0) y la fila del tipo `hiring_assessment_access_rotated` |
| Correo interno no llega | Buzón mal configurado | Revisar `HIRING_INTERNAL_NOTIFICATIONS_EMAIL` |
| No llega el aviso de test completado | Evento publicado antes del consumer, kill-switch pausado o evento aún no drenado | No hay backfill: verifica revisión activa, fila `hiring_assessment_submitted_internal`, `email_deliveries` y reactive log para el test nuevo |

## Referencias técnicas

- Consumers: `src/lib/sync/projections/hiring-lifecycle-emails.ts`
- Política de dominio: `src/lib/hiring/notifications/`
- Índice de intents token-sensitive: `scripts/operations/task-1746-create-token-intent-index.sql`
- Ledger de flags: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- Arquitectura: `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (Delta 2026-08-12)
- Recuperación: `docs/manual-de-uso/hr/recuperar-acceso-a-test-de-candidato.md`

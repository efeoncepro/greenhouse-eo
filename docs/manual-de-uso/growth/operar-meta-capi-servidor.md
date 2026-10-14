# Diagnosticar y recuperar Meta CAPI por GTM Server

> Manual de operador · actualizado 14/10/2026. GTM Server 9/Web 5, matching por políticas activado; primera conversión comercial consentida/EMQ sin observar.

1. Leer el [runbook](../../reference/measurement-gtm-ga4/08-meta-conversions-api-server-side.md)
   y la [decisión](../../architecture/GREENHOUSE_META_CAPI_SERVER_GTM_DECISION_V1.md).
2. Verificar acceso Google CLI/ADC y read-only GTM. Seleccionar **Efeonce Server**
   `GTM-K2X4ZTTK` (cuenta `6068297031`, container `191286361`), confirmar `usageContext=server`.
   `GTM-NGHPGRLZ` es web y no sustituye el servidor.
3. Releer live version, Clients, template/tag CAPI, permisos y endpoint. Inspeccionar
   infraestructura sin exports con tokens. No asumir que el token funciona porque existe.
4. Seguir en Preview servidor la cadena ingreso → Client → evento → trigger → tag → Meta.
   Revisar ambas fuentes: aceptación/confirmación backend → cola cifrada → Client de ingreso
   → Meta Lead. `gh_form_submission_accepted → generate_lead` es el espejo GA4, no el sender
   Meta. Aislar el primer fallo antes de editar recursos.
5. Preparar workspaces aislados con mappings PageView/Lead, gate de consentimiento,
   ingreso backend validado, identidad estable y exclusiones. Consultar el runbook para
   datos permitidos, secretos y alcance de cada fuente. No añadir PII a GA4/dataLayer.
6. Con alcance de prueba autorizado, usar Test Events para confirmar origen **Server**,
   URLs correctas y pruebas negativas/replay/dedupe. Guardar sólo evidencia saneada.
7. Presentar diff/QA/rollback y pedir aprobación de publicación sobre cambios concretos;
   hosting, DNS/IAM, secreto y canary tienen límites propios. No publicar otros workspaces.
8. Retirar test code, verificar versiones y recepción live posterior en Meta; registrar
   estado y evidencia en [tracking plan](../../reference/measurement-gtm-ga4/TRACKING-PLAN.md).

`pnpm gtm:snapshot --check` y `pnpm measurement:smoke` son controles **web/GA4**.
No demuestran entrega servidor a Meta. Pixel browser es complementario si se decide dual;
compartir nombre e ID con CAPI y verificar deduplicación. No fabricar conversiones reales
para probar ni confundir recepción con atribución o resultados comerciales.

## Estado publicado y recuperación

[Release vigente, 14/10](../../audits/releases/2026-10-14-scalable-measurement-agent-first-release.md):
main `9690efad`, orquestador `38591329633` success, manifest released, health y watchdog correctos.
Server **live 9**, schema 2 estricto; Web **live 5**. La entidad modificada fue customTemplate 30,
el Client autenticado de ingreso; píxel `708931297255942`, tag Meta 6, tag GA4 18 y demás entidades
se conservaron. Client backend 31/trigger 33 sigue como emisor Meta Lead; legacy 12/17 retirados.
PageView 11 y espejo GA4 continúan; no reactivar el sender legacy como recuperación.

Ops sirve `ops-worker-00778-d74`, Ready y 100 %, con Meta/Google UPD/retención y HubSpot secure-submit
habilitados; captura Vercel Production `true`. La equivalencia del árbol fuente y el change-gate
explican su etiqueta anterior al merge; no redeplegar sólo para igualar el texto del SHA.
La migración de políticas y grants están aplicados. Releer valores y versiones antes de operar:
este corte no sustituye una consulta live futura ni obliga a conservar una revisión por su nombre.

Las altas compatibles se hacen mediante [políticas por API/CLI/panel](configurar-medicion-conversiones.md),
no editando tags/listas. Se confirmó una fuente creada después del release y entrega Test Events
sin otra publicación de código, Vercel o GTM. No se añadieron infra, proyectos, servicios ni crons.
GA4 UPD/ack y audiencias configuradas son capacidades existentes; conservar el link Ads. Ni esas
configuraciones ni un Processed demuestran serving o elegibilidad efectiva.

El [dossier del 13/10](../../audits/releases/2026-10-13-full-develop-matching-release.md) conserva
el antecedente de recuperación, refs y hosting. No repetir su secuencia de activación ni guards
Server 6 sobre Server 9. Un futuro cambio de contrato exige compatibilidad entre productores,
worker y Client, diff acotado, pruebas aisladas y publicación gobernada. Rollback: desactivar
captura/destinos/políticas según alcance, conservar retención y ledgers cifrados; no borrar claves
con material pendiente ni restaurar un segundo sender Lead. El estado actual no requiere reactivar
flags ni volver a provisionar secretos.


## Comprobar el estado sin crear una conversión

Consultar primero el [contrato runtime](../../reference/measurement-gtm-ga4/10-growth-lead-matching-runtime.md)
y el [dossier vigente con recibos](../../audits/releases/2026-10-14-scalable-measurement-agent-first-release.md).
Releer por separado configuración durable, revisión servida y ejecución; un flag en GitHub,
una ref de secreto o una credencial local no demuestra su resolución dentro del worker.

- Captura: valor exacto `true` en Vercel Production **y redeploy READY con alias canónico**.
  El renderer público actualizado prueba distribución de código; no aceptación de un Lead.
- Destinos: tres repo vars measurement true, sin overrides Production; comparar con los tres
  valores de la revisión Ops que recibe tráfico. Mantener defaults OFF para instalaciones nuevas.
- Secretos: refs payload-key/ingress-token/ga4-api-secret pinned a versión1, grants por secreto.
  El canary real del worker devolvió unavailableDestinations=[]; nunca imprimir credenciales,
  CONTAINER_CONFIG ni exportar tags con el token Meta.
- SQL: revisar las migraciones de matching y políticas, con sus permisos y grants, en el dossier. `pgmigrations.run_on` es timestamp
  sin zona UTC: usar lectura textual para no desplazar la hora. No recrear las parked aplicadas.
- Salud: release released, readiness/health y watchdog sin drift son controles distintos de
  recepción de Meta. Revisión con SHA anterior puede ser válida sólo con change-gate y
  equivalencia runtime documentados, nunca sólo porque el servicio está Ready.

Para cerrar el acceptance pendiente, correlacionar la próxima aceptación/reserva consentida
real con source, measurement_conversion/delivery, ID/tiempo estable, resultado HTTP y
recepción provider. No crear submissions, bookings ni contactos comerciales de prueba para
fabricar esa evidencia. Un ack no certifica atribución ni audiencia elegible.

## Probar matching sin contaminar conversiones comerciales

1. Abrir Administrador de eventos → dataset `708931297255942` → Probar eventos; renovar la escucha
   si la pestaña quedó inactiva y obtener el código real vigente. `TEST_____` es un marcador, no un código.
2. Pasarlo sólo por `META_TEST_EVENT_CODE` temporal al helper `scripts/measurement/verify-lead-context.ts`
   con el cargador canónico y shim server-only. El helper prepara la política/mapping reales y cifra/
   descifra una proyección efímera; no crea submission, booking, contacto ni cola comercial. El código
   no se añade a tags, fuente ni variables permanentes. No ejecutar pruebas sintéticas ordinarias.
3. Sin `META_TEST_PREVIEW_HEADER_FILE` se prueba el Client publicado. Preview requiere un header
   efímero en archivo privado; no mostrarlo ni conservarlo en docs. `META_TEST_POLICY_ID` permite
   seleccionar una política de prueba publicada con campos compatibles y `META_TEST_RECEIPT_FILE`
   guarda sólo estados/metadata. La provisión/cleanup de fixtures se describe en el manual de políticas.
4. Confirmar por el mismo event UUID **Processed / Server / website** y los campos realmente mapeados:
   IP y User-Agent originales, fbp, fbc, external_id, email, nombre/apellido y teléfono sólo si existe.
   Un formulario sin teléfono compatible no debe inventarlo. Replay conserva el ID; negativos de
   consentimiento, identidad sin hash y schema 1 deben rechazarse sin crear eventos.
5. Registrar IDs/estados saneados y retirar el entorno/header de prueba al terminar. No guardar PII
   real ni screenshots que la revelen. La prueba de cola, la salida HTTP y el readback Meta son
   evidencias distintas; ninguna convierte una fixture en la primera aceptación comercial real.

El Client exige `action_source=website`, URL de envío segura sin query/fragment y tiempo ocurrido
UNIX segundos. IP/UA y fbp/fbc van sin hash. El external_id estable y campos de contacto se
normalizan antes de SHA-256 hex. El worker conserva el contexto de la petición visitante y no lo
sustituye por su IP/navegador; el código de prueba no debe aparecer en payloads normales.

## Hosting, costo y permanencia

Mismo contenedor, dos servicios existentes del hosting recuperado en `efeonce-group` /
us-central1: tagging y preview, cada uno 1vCPU/512MiB, instance-based, min0/max1.
El matching reutiliza Ops y su cadence Forms: no añade proyecto, servicio ni cron propio.
Cerrar Preview al terminar QA; min0 no garantiza gasto cero y max1 limita capacidad, no
el gasto total. Costos, free tier compartido y escenarios fechados están en el
[dossier](../../audits/releases/2026-10-13-full-develop-matching-release.md#hosting-costo-y-permanencia).
No hay factura histórica verificada ni tope monetario creado por esos límites.

Flags y secretos se dejaron sin vencimiento configurado; invoker tagging sin condición
horaria. Esto no convierte la vigencia del token Meta en perpetua: no se verificó su TTL.
La sesión OAuth de la herramienta y su duración no controlan la vida del despliegue.


## Lectura operacional de cola sin contactos

Usar el acceso PostgreSQL canónico con perfil autorizado; estas consultas son sólo lectura
sobre recibos y no sustituyen una comprobación provider. No seleccionar encrypted_payload_json,
contactos, cookies o secretos para diagnosticar estados.

```sql
SELECT destination, state, COUNT(*) AS deliveries,
       MAX(attempts) AS max_attempts, MIN(updated_at) AS oldest_updated_at
FROM greenhouse_growth.measurement_delivery
GROUP BY destination, state
ORDER BY destination, state;

SELECT COUNT(*) FILTER (WHERE encrypted_payload_json IS NOT NULL) AS encrypted_material,
       COUNT(*) FILTER (WHERE encrypted_payload_json IS NOT NULL
         AND occurred_at < CURRENT_TIMESTAMP - INTERVAL '48 hours') AS pending_retention
FROM greenhouse_growth.measurement_conversion;
```

Conteo cero no certifica un fallo ni una entrega; puede no haber fuentes elegibles consentidas.
queued/sending requiere revisar cadencia/lease/flags; dead_letter requiere safe_error_class y
ventana/intentosedad; http_accepted es ack, no atribución. Los comandos de provisioning,
audiencias y Preview son mutantes: no ejecutarlos como una lectura ni recrear secretos/IDs
para corregir un diagnóstico. No se añadió cockpit/API de gestión de esta cola.


Configuración de fuentes y cliente agente: [manual compartido](configurar-medicion-conversiones.md). Estado/rollback/recibos actuales: [release14/10](../../audits/releases/2026-10-14-scalable-measurement-agent-first-release.md). Los pasos de activación13/10 son antecedente; no volver a provisionar ni aplicar sus guards de versión antiguos contra Server9.

# Configurar medición de conversiones

Estado14/10/2026: TASK-2036 implementada en develop, migración y seed aplicados. Panel TASK-2037
con lifecycle implementado y12 pruebas UI/red PASS; QA remota y release pendientes. GTM8
es compatible v1/v2 temporalmente; el corte final estricto v2 queda pendiente del release.
Canon: [ADR de políticas](../../architecture/GREENHOUSE_GROWTH_MEASUREMENT_POLICY_DECISION_V1.md).

## Alta compatible por datos

1. Publicar el formulario comercial con sus campos/políticas existentes o activar el binding real de Meetings. Autorizar su surface y origen en el dominio dueño.
2. En el inspector de Growth Forms, seleccionar formulario o agenda y surface. Se resuelve su identidad estable y versión publicada; no introducir slugs en código.
3. Asignar correo/teléfono/nombre/apellido desde el catálogo tipado. El teléfono debe tener normalización internacional; nombres derivados sólo si la fuente declara namePolicy.
4. Seleccionar destinos independientes, guardar borrador, revisar y publicar. La revisión actual permanece activa hasta publicar su reemplazo. Cada comando lleva expectedPublishedRevisionId e idempotencyKey.
5. Leer de vuelta revisión y alcance. Probar con consentimiento publicitario y test_event_code temporal real; no crear conversiones comerciales ficticias.

Una versión nueva del formulario requiere revisar/publicar configuración, sin redeploy. Un cambio
de código, evento, proveedor, campo de un tipo nuevo u origen fuera de los dos aprobados requiere
su cambio gobernado. Subscribe/application/survey y fuentes de alto riesgo quedan excluidas.

## Relación Growth Forms / Forms / Medición / CRM

En el flujo actual, Growth Forms posee la definición, validación, normalización, consentimiento
y aceptación. La entrega comercial usa el destino HubSpot Forms (secure-submit), que alimenta
CRM. Desde la misma aceptación se prepara, por separado, la medición publicitaria consentida.

| Capa | Configuración que le pertenece | Evidencia que confirma su resultado |
| --- | --- | --- |
| Growth Forms | Versión publicada, campos, surface y aceptación | Submission aceptada y consentimiento guardado |
| HubSpot Forms | Destino, portal/formulario y fieldMapping hacia propiedades CRM | Attempt de entrega y respuesta del proveedor |
| Medición | Matching tipado, sitios y destinos Meta/Google | Revisión publicada, recibo y entrega publicitaria |
| CRM | Contacto y propiedades tras la entrega comercial | Readback independiente del contacto en HubSpot |

El mapping de matching no sustituye el fieldMapping de HubSpot Forms. Un alta completa revisa
ambos y la existencia de las propiedades/formulario destino. Desactivar medición, denegar
publicidad o fallar el enqueue publicitario conserva la aceptación, su consentimiento y el
outbox comercial. Una respuesta de Meta no prueba entrega a CRM; un contacto en CRM no prueba
medición. La prueba controlada no crea contactos comerciales ficticios; el readback de tráfico
comercial real permanece separado cuando no se ha observado.

## Product API y permisos

GET /api/admin/growth/measurement devuelve sources, policies y permissions; POST acepta draft,
review, publish o disable. El actor sale de la sesión interna canónica. Capacidades separadas:
growth.measurement.read/author/publish/disable; sólo admin/operations internos. Un cliente o
una ruta interna por sí solos no autorizan cambios. Contrato estricto en policy-contract.ts.
No se amplía MCP/OAuth. No introducir contactos, IP, secretos, valores libres ni JavaScript.

La revisión es inmutable; editar crea otra. Un conflicto409 exige refrescar la revisión publicada.
El panel conserva los cambios ante409 y al volver a cargar. Al reintentar un fallo de
transporte conserva idempotencyKey y contenido y bloquea nuevas ediciones hasta resolverlo.
Si ya recibió el recibo del write y falla la lectura posterior, reintenta sólo GET; nunca muestra
éxito antes de leer el estado efectivo. Cambiar contenido requiere una nueva clave. La auditoría registra actor/acción/configuración sanitizada, no leads.

## Desactivación y garantías

Desactivar elimina el puntero publicado. El worker revalida la revisión y el destino antes de
cada HTTP; filas pendientes revocadas no salen. Un HTTP ya iniciado no puede retirarse. Una
caída de configuración bloquea publicidad, nunca la aceptación comercial. Los eventos aceptados
conservan UUID/tiempo y snapshot cifrado: nunca actualizan consentimiento retroactivamente.

Los datos de matching se normalizan y hashean por proveedor. IP/UA y _fbp/_fbc proceden del
visitante consentido; no del worker. El espejo GA4 mantiene su único emisor y Google UPD no
incluye events. El código de prueba nunca queda fijo en producción.

## Herramientas de operador

- seed-policy.ts: dry-run por defecto, --apply con MEASUREMENT_POLICY_ACTOR_ID explícito. Sólo equivalencia inicial de seis Forms y discovery; futuras altas no requieren editar este seed.
- verify-policy-lifecycle.ts --apply: fixture de configuración sin embed key ni tráfico; publica y desactiva política, archiva form y surface al terminar con readback independiente previo al recibo de éxito. No crea contactos/submissions/bookings ni envía a proveedores.
- policy-ui-fixture.ts prepare/cleanup --apply: exige MEASUREMENT_FIXTURE_RECEIPT; crea una fuente controlada sin embed key y archiva fuente/surface/desactiva política con readback al terminar. Reutiliza el recibo existente, no genera fixtures duplicadas.
- verify-policy-ui.ts --apply: staging únicamente, escribe desde la UI sólo sobre la fixture declarada; captura lifecycle real y estados de presentación aislados en el navegador. No envía formularios ni bookings.
- verify-lead-context.ts: exige META_TEST_EVENT_CODE real y opcional META_TEST_PREVIEW_HEADER_FILE privado. Resuelve las políticas publicadas y prueba sólo Meta Test Events. META_TEST_POLICY_ID permite seleccionar una política publicada de prueba para verificar un alta por datos sin volver a publicar GTM. Nunca volcar sus payloads, headers o credenciales.

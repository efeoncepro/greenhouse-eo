# Configurar medición de conversiones

Estado14/10/2026: TASK-2036/2037 publicadas en main9690efad, PR255 y orquestador38591329633
success; manifest released, Server9 estricto, watchdog6/6/drift0. API/panel/CLI comparten el
contrato. GVC1440/390 y12 estados PASS. Alta de fuente nueva por datos en producción y recepción
Meta Test Events verificadas sin otro código/build/redeploy/publish GTM; fixture archivada y
readback13 fuentes/siete políticas. [Recibos y límites](../../audits/releases/2026-10-14-scalable-measurement-agent-first-release.md).
No se afirma conversión comercial real ni mejora EMQ a partir de fixtures.
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
- verify-lead-context.ts: exige META_TEST_EVENT_CODE real y opcional META_TEST_PREVIEW_HEADER_FILE privado. Resuelve las políticas publicadas y su mapping mediante preparación canónica y cifrado efímero de prueba; no persiste cola. Prueba sólo Meta Test Events. Un único key efímero por proceso respeta la caché del resolver de secretos. META_TEST_POLICY_ID permite seleccionar una política publicada de prueba para verificar un alta por datos sin volver a publicar GTM. Nunca volcar sus payloads, headers o credenciales.

## Operar como agente sin abrir el panel

Contrato efectivo: `GET /api/admin/growth/measurement` devuelve `contract.version`, operaciones,
permisos, fuentes/campos tipados y revisiones. No usar slugs ni inferir permisos por rol local.
La CLI consume HTTP y el mismo cliente del panel; no accede a SQL ni fabrica autoridad.

1. Obtener una sesión ligada al operador mediante el procedimiento canónico
   `scripts/playwright-auth-setup.mjs` (modo API no abre navegador). Conservar su storage state
   ignorado dentro de `.auth/`, con permiso0600; secretos por entorno, nunca argumentos/logs.
   Configurar `GROWTH_MEASUREMENT_BASE_URL` al origen HTTPS correcto y
   `GROWTH_MEASUREMENT_STORAGE_STATE` a ese archivo. La sesión debe corresponder exactamente
   al host, estar vigente y tener las capabilities internas. No exportar cookies al gateway.
2. `pnpm --silent growth:measurement discover`: JSON con fuentes, versiones, campos, políticas, cabeza
   publicada y permisos efectivos. `--help` describe comandos, entorno y códigos de salida sin auth.
3. Crear un archivo JSON de comando con **nombres de campos**, nunca datos de contactos.
   Para draft: `action`, `scope` descubierto, `config` (`purpose:commercial_lead`, `sourceVersion`,
   `origins`, `destinations`, `mapping`), `expectedPublishedRevisionId` actual (o null) y un UUID
   `idempotencyKey`. Destinos vacíos por defecto; escoger cada destino expresamente.
   Para review/publish/disable: `action`, `policyId`, `revisionId`, cabeza esperada y UUID propio.
4. `pnpm --silent growth:measurement validate comando.json`: preflight fresco, **sin escrituras**.
   Devuelve blockers, conflicto de cabeza/estado o rutas/códigos de schema; no eco de valores.
   Presentar impacto al operador y respetar la autorización existente antes de ejecutar.
5. `pnpm --silent growth:measurement apply comando.json --apply --receipt .auth/recibo.json`:
   escritura explícita, auditada e idempotente; éxito sólo tras GET independiente. El archivo0600
   se reserva antes del POST y conserva comando/origen/recibo conocido antes del GET.
6. Revisar/publicar con comandos y claves distintos para cada transición. No saltar review.
   `pnpm --silent growth:measurement verify .auth/recibo.json` sólo lee y confirma el estado y cabeza.
   Desactivar usa el mismo contrato; no cambia la aceptación comercial ni el mapping de HubSpot.

Ante timeout/outcome desconocido, repetir **el mismo comando y recibo**, no generar otro UUID.
Si existe recibo conocido, la CLI repite sólo GET. Un409 obliga a redescubrir estado y explicar el
conflicto; no sobrescribir otra publicación ni reciclar una clave con otro contenido. Validar no
reserva el estado: puede cambiar antes de aplicar. Salidas:0 éxito,2 inválido,3 conflicto,4 denegado,
5 indisponibilidad en validación,6 resultado posiblemente desconocido. Nunca interpretar una
validación verde o un ACK como publicación/recepción de Meta; cada destino requiere su evidencia.
La CLI no envía formularios, reuniones, contactos CRM ni pruebas a proveedores. No hay nuevas
tools MCP/Nexa registradas por esta entrega; el contrato compartido permite adaptarlas con su
gobernanza propia, sin duplicar lógica.

Para consumir stdout como JSON, usar `pnpm --silent growth:measurement …`; `pnpm exec tsx scripts/measurement/policy-cli.ts …` también evita banners del runner.

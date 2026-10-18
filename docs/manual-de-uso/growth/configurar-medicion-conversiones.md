# Configurar medición de conversiones

Verificación API18/10,22:57:03Z: **13 formularios comerciales y Discovery con Ads publicado**.
AI Grader incluido por decisión comercial del operador; Contacto general fuera de Ads. Lead Gen Web
corregido a quote_request con key/slug/versión/destinos preservados. Se publicaron12 formularios
adicionales; no se modificaron GTM, campañas, pujas o deployment. Primera recepción y atribución
siguen pendientes. [Publicación y evidencia](../../audits/growth/2026-10-18-commercial-forms-policy-publication.md).

## Antecedentes de configuración antes de ampliar cobertura


## Corte inicial de configuración, antes de la ampliación22:57Z

GTM **Web6/Server10** publicados, main `ec317c928` y companion Production ER5 READY con salud200
/watchdog6/6. Ads `6862539491` tiene EC ON y flag de proyecto Ads `true`; cadena de configuración
verificada, sin observación directa del booleano congelado ni recepción comercial todavía.
Performance y la **agenda** Discovery tienen opt-in Ads rev2 publicado. Son fuentes del sitio,
no tipos de campaña. HubSpot Performance tiene su marcador nativo configurado; Meta captura recibos
individuales en Server10. [Activación y límites](../../audits/growth/2026-10-18-google-ads-activation.md).

La siguiente ampliación cubre **sólo formularios comerciales que generan leads**. Doce comandos de
draft pasaron validación DRY_RUN; no se guardaron/publicaron revisiones. Lead Gen - Web conserva su
clasificación `lead_magnet`, aún sin corregir. Ebooks, postulaciones, newsletter, soporte y pruebas
quedan fuera de esta ampliación. En fuentes que mezclan motivos comerciales y no comerciales,
resolver la elegibilidad antes de publicar: el propósito se evalúa, no se deduce sólo del `kind`.
[Inventario de cobertura](../../audits/growth/2026-10-18-commercial-forms-measurement-coverage.md).

GA4 genérico, Meta backend, Google MP UPD y Ads online son destinos/carriles distintos. Una política
Meta/UPD publicada o `generate_lead` en GA4 no habilita Ads. Para Ads usar el
[manual específico](activar-conversiones-google-ads.md): configuración `googleAds` y recibo `googleAdsConversion`,
consentimiento Google explícito/GPC, fuente y versión compatibles, recibo postcommit y bridge
Web→Server. No hace falta un tag por formulario compatible ni publicar GTM para cada política;
sí revisar/publish por datos y leer de vuelta su estado. El envío Ads depende del navegador y no
tiene retry backend. Consentimiento ausente/revocado/GPC bloquea publicidad, conserva el negocio.

## Antecedente del 14 y 17/10/2026

Estado al 14/10/2026: **publicado en producción** mediante PR #255, main `9690efad`, orquestador
`38591329633` y GTM Server 9 estricto. API, panel y CLI comparten el contrato. Se verificó una
fuente creada después del release: alta y publicación por datos → Meta Test Events sin otro
código/build/redeploy/publish GTM. La fixture quedó desactivada y archivada; no hubo registros
comerciales sintéticos. [Recibos y límites](../../audits/releases/2026-10-14-scalable-measurement-agent-first-release.md).
No se afirma conversión comercial real, mejora de EMQ ni elegibilidad de audiencias desde fixtures.
**Delta 17/10/2026:** primera conversión comercial consentida observada en Meta con
`efeonce-performance-diagnostic` (1 Lead SERVER_ONLY); 12 de 18 políticas publicadas.
Ver [estado de políticas](#estado-de-políticas-al-17102026) y [cómo probar un formulario](#probar-un-formulario-después-de-publicar-su-política).
Canon: [ADR de políticas](../../architecture/GREENHOUSE_GROWTH_MEASUREMENT_POLICY_DECISION_V1.md).

## Alta compatible por datos

1. Publicar el formulario comercial con sus campos/políticas existentes o activar el binding real de Meetings. Autorizar su surface y origen en el dominio dueño.
2. En el inspector de Growth Forms, seleccionar formulario o agenda y surface. Se resuelve su identidad estable y versión publicada; no introducir slugs en código.
3. Asignar correo/teléfono/nombre/apellido desde el catálogo tipado. El teléfono debe tener normalización internacional; nombres derivados sólo si la fuente declara namePolicy.
4. Seleccionar destinos independientes, guardar borrador, revisar y publicar. La revisión actual permanece activa hasta publicar su reemplazo. Cada comando lleva expectedPublishedRevisionId e idempotencyKey.
5. Leer de vuelta revisión y alcance. El helper Meta requiere test_event_code temporal real y una prueba autorizada; no crear conversiones comerciales ficticias ni usar Test Events como sandbox. Para un envío real, seguir [Probar un formulario después de publicar su política](#probar-un-formulario-después-de-publicar-su-política).

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

[Referencia HTTP y DTOs](../../api/GREENHOUSE_GROWTH_MEASUREMENT_POLICY_API_V1.md).

GET /api/admin/growth/measurement devuelve sources, policies y permissions; POST acepta draft,
review, publish o disable. El actor sale de la sesión interna canónica. Capacidades separadas:
growth.measurement.read/author/publish/disable; sólo identidades internas autorizadas de administración/operaciones. Un cliente o
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
   ignorado dentro de `.auth/`, con permiso `0600`; secretos por entorno, nunca argumentos/logs.
   Ejecutar el helper con `umask 077` o aplicar `chmod 600` al archivo: la CLI rechaza permisos
   de grupo/otros. `AGENT_AUTH_BASE_URL` y `AGENT_AUTH_STORAGE_PATH` deben apuntar al mismo
   host y archivo que las variables de medición; el default localhost del helper no sirve aquí.
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

## Ejemplo de contrato para un agente

Primero, con la identidad y secreto ya cargados por el mecanismo autorizado (sin imprimirlos),
generar la sesión y descubrir. Estos comandos no publican políticas:

```bash
umask 077
export AGENT_AUTH_MODE="api"
export AGENT_AUTH_BASE_URL="https://greenhouse.efeoncepro.com"
export AGENT_AUTH_STORAGE_PATH=".auth/measurement-storage.json"
node scripts/playwright-auth-setup.mjs
chmod 600 .auth/measurement-storage.json
export GROWTH_MEASUREMENT_BASE_URL="https://greenhouse.efeoncepro.com"
export GROWTH_MEASUREMENT_STORAGE_STATE=".auth/measurement-storage.json"
pnpm --silent growth:measurement discover > .auth/measurement-catalog.json
```

Requisitos: `AGENT_AUTH_EMAIL` y `AGENT_AUTH_SECRET` ya presentes para el modo API. No usar una
identidad distinta a la autorizada. La CLI envía sólo la cookie de sesión vigente para el host
exacto, por HTTPS, a esta ruta; rechaza redirects. El bypass de Vercel es opcional para staging,
no sustituye la sesión ni las capabilities. La salida del setup es operacional; stdout JSON puro
corresponde a los comandos `growth:measurement`, no al helper de autenticación.

Crear `draft.json` con esta forma, **reemplazando todos los marcadores por metadata de discovery**;
no es un archivo listo para ejecutar. Cada campo de mapping debe existir con el tipo compatible:
`email` → email, `phone` → tel E.164, nombres → text declarado o derivado por namePolicy.
No inventar `phone` si la fuente no lo ofrece. El nombre del campo puede ser `businessEmail`;
el valor de la persona nunca aparece en este JSON.

```json
{
  "action": "draft",
  "scope": {
    "sourceKind": "form_submission",
    "sourceKey": "<form_key UUID descubierto>",
    "surfaceId": "<surface descubierta>"
  },
  "config": {
    "purpose": "commercial_lead",
    "sourceVersion": "<versión publicada descubierta>",
    "origins": ["https://efeoncepro.com"],
    "destinations": ["meta"],
    "mapping": {"email": "<campo email descubierto>"}
  },
  "expectedPublishedRevisionId": null,
  "idempotencyKey": "<UUID nuevo para este borrador>"
}
```

El origen debe estar en la fuente; `null` sólo si no existe cabeza publicada. Destinos permitidos:
`meta`, `google_upd`, ambos o ninguno; no hay destino GA4 de conversión en esta política. Para
Meetings se usa `sourceKind:meeting_booking`, el scheduler key como sourceKey y el fingerprint
sourceVersion del catálogo, con su surface real. No usar el ejemplo Forms para fabricar su versión.

```bash
pnpm --silent growth:measurement validate draft.json
pnpm --silent growth:measurement apply draft.json --apply --receipt .auth/draft-receipt.json
pnpm --silent growth:measurement verify .auth/draft-receipt.json
```

Con los IDs devueltos, cada transición usa su propio archivo y UUID. La forma es:

```json
{
  "action": "review",
  "policyId": "<policyId del borrador>",
  "revisionId": "<revisionId del borrador>",
  "expectedPublishedRevisionId": "<cabeza publicada actual; usar null si no existe>",
  "idempotencyKey": "<UUID nuevo para la revisión>"
}
```

Validar/aplicar/verificar `review.json`; después hacer lo mismo para `publish.json` con
`action:publish`, IDs revisados, cabeza actual y otra clave. Para `disable.json`, usar
`action:disable`, la revisión publicada y su cabeza actual. En los tres casos se repite la
forma de comando anterior con un **archivo de recibo distinto por intención**. No reemplazar
por el string `"null"`: debe ser JSON `null`. Conservar los recibos privados para recuperar
reintentos y auditoría; no guardarlos en git. Un recibo antiguo puede verificar conflicto si
la revisión ya avanzó; descubrir el estado actual antes de concluir que falló el write.

Para un consumidor HTTP propio, discovery es GET y ejecución POST a la misma ruta;
la validación usa POST `{"dryRun":true,"command":{...}}`. Este wrapper lo añade la CLI:
no envolver el archivo `draft.json` ni usar `dryRun:true` como comando de apply. POST valida
el esquema cerrado y limita el cuerpo a 16 KiB. El permiso efectivo de cada acción procede del
servidor; ninguna opción CLI ni campo actor/role amplía autoridad.

## Probar un formulario después de publicar su política

La publicación de una política no prueba la entrega. GA4 depende de su propio permiso y bridge;
la entrega HubSpot depende del destino comercial configurado. Meta/UPD requieren su destino
opt-in y Ads su bloque `googleAds` publicado, además de los gates propios.

1. Observar una **ocurrencia real autorizada** posterior a la publicación y compatible con su
   activationAt/versión/surface. No crear leads, contactos, reservas o click IDs ficticios para
   completar evidencia. El formulario deduplica por form + email normalizado durante60min:
   reutilizar el mismo envío no acredita una conversión nueva ni autoriza forzarla con alias.
2. Leer el consentimiento publicitario válido y GPC de esa ocurrencia. `contact_permission` no
   concede publicidad. Para Ads, analytics y los cuatro estados Google deben estar granted;
   unknown/denied bloquea. Una aceptación comercial puede existir sin medición publicitaria.
3. Para Meta/UPD, consultar conversión y deliveries mediante acceso canónico/CLI. UUID estable,
   alcance y HTTP son evidencia local. `http_accepted` de sGTM no sustituye al recibo Graph:
   [recibos individuales](conservar-recibos-meta.md). Stats tardías/vacías no autorizan replay.
4. Para HubSpot, revisar el intento comercial y, donde el mapping técnico esté configurado, el
   ID nativo por marcador exacto: [procedimiento](guardar-identidad-nativa-hubspot.md). Propiedad
   actual del contacto o respuesta200 no acreditan la identidad histórica de la submission.
5. Para Ads, seguir el recibo durable → navegador/Web → Server → recepción de la acción elegible.
   No buscar un delivery Ads backend: este carril no tiene esa cola. La recepción y la atribución
   publicitaria son verificaciones diferentes. Las acciones actuales son secundarias/0CLP; no
   cambian por sí solas la puja de campañas. [Protocolo Ads](activar-conversiones-google-ads.md).

Los SDK/Preview aislados y canarios negativos del18/10 acreditan transporte/gates sin enviar
conversiones comerciales a proveedores. No cierran la primera ocurrencia real, recibo Graph,
identidad nativa HubSpot o recepción/atribución Ads, que siguen pendientes.

Caso de referencia (17/10/2026, Performance): primer envío sin política → HubSpot y GA4 sí, Meta
no; política publicada a las 19:16 UTC; envío consentido con alias `+meta` a las 19:19 →
`http_accepted` a las 19:20 → 1 Lead visible en Meta a las 20:27.
[Evidencia](../../reference/measurement-gtm-ga4/10-growth-lead-matching-runtime.md#primera-conversión-comercial-consentida--performance-2026-10-17).

## Estado de políticas al 17/10/2026 (histórico)

En ese corte: 12 políticas publicadas de 18 filas. El 17/10 se publicaron (rev 1, destino `meta`) las de
`efeonce-performance-diagnostic`, `efeonce-media-diagnostic` y `efeonce-hubspot-scope`.

| Formulario | Política | Envío real verificado en Meta |
| --- | --- | --- |
| `efeonce-performance-diagnostic` | Publicada (email/nombre/apellido) | Sí, 1 Lead SERVER_ONLY el 17/10 |
| `efeonce-media-diagnostic` | Publicada (email/teléfono/nombre/apellido) | Pendiente |
| `efeonce-hubspot-scope` | Publicada (email/nombre/apellido) | Pendiente |
| `efeonce-web-agentica-ebook` | Sin política | No aplica |
| `efeonce-surround-discovery-ebook` | Sin política | No aplica |
| `efeonce-creator-influence-brief` | Sin política | No aplica |
| `efeonce-content-marketing` | Sin política | No aplica |

Además hay filas antiguas sin publicar. Pendiente operativo: archivar en HubSpot el contacto de
prueba con alias `+meta` (decisión del operador).

## Alcance que sigue pendiente

Las políticas comerciales no implementan eventos CRO, abandono, Subscribe del blog ni resultados
CRM; esos ítems permanecen en TASK-2035. El envío o matching tampoco marca por sí solo un evento
como clave en GA4: revisar propiedad/evento y evidencia en TRACKING-PLAN. La primera aceptación
comercial consentida ya se observó en Meta (Performance, 17/10); su conciliación con los demás
formularios y proveedores y la evolución de calidad siguen requiriendo tráfico real. La prueba aislada de Meta no certifica Google Ads, atribución ni audiencias utilizables.

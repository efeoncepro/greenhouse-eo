# ADR — Meta CAPI mediante el contenedor GTM Server de Efeonce

Readout vigente **14/10/2026**: PR255/main9690efad publicado; **Server9/Web5**, Lead backend
único, contexto original del visitante y políticas versionadas administrables por API/panel/CLI.
[Contrato vigente](../reference/measurement-gtm-ga4/10-growth-lead-matching-runtime.md),
[ADR de políticas Accepted](GREENHOUSE_GROWTH_MEASUREMENT_POLICY_DECISION_V1.md) y
[release/prueba de alta sin redeploy](../audits/releases/2026-10-14-scalable-measurement-agent-first-release.md).
Primera conversión comercial consentida y mejora EMQ siguen pendientes de tráfico real.
La metadata inicial y deltas13/10 siguientes conservan la cronología de esta decisión;
sus listas fijas, pendientes y versiones no son instrucciones de operación vigentes.

- Status: Accepted.
- Decision boundary: dirección del carril servidor; implementación/recuperación pendiente.
- Date: 2026-10-13.
- Owner: Growth / Marketing Operations / Platform.
- Scope: medición Meta de `efeoncepro.com`, `think.efeoncepro.com`, Growth Forms y sGTM.
- Reversibility: two-way-but-slow (routing, hosting y sender ownership).
- Confidence: high; recepción Server Test Events y transporte PageView real verificados.
- Validated as of: 2026-10-13, fuentes oficiales, GTM API/live, Preview y Meta Test Events.

## Context

El operador corrigió la propuesta de recuperar el píxel sólo en GTM Web y pidió documentar
la ruta **servidor**. La API confirma que ya existe `Efeonce Server` (`GTM-K2X4ZTTK`),
con tag CAPI publicado para `708931297255942`; no se debe crear otro sin diagnosticarlo.
El contenedor web publicado no contiene tags Meta ni claves de transporte sGTM observadas.
No se ha comprobado recepción, vigencia del token ni hosting efectivo.

## Decision

Recuperar/diseñar CAPI por el **contenedor de tipo Server existente**. El web
`GTM-NGHPGRLZ` puede proveer señales de navegación o Pixel complementario, pero no es el
emisor CAPI. Lead debe tener origen en aceptación comercial persistida de Greenhouse,
con consentimiento y transporte hacia un Client compatible de sGTM. La dirección fue
elegida expresamente por el operador; este pedido sólo autoriza investigación/documentación.

## Alternatives Considered

- Pixel sólo web: puede medir navegador, pero no satisface CAPI ni la ruta solicitada.
- Backend directo a Meta: opción soportada por Meta; no es la ruta elegida por el operador.
- CAPI Gateway: alternativa separada; no requerida para reparar el servidor GTM existente.
- Contenedor Server nuevo: diferido hasta inventariar y evaluar la recuperación del existente.

## Consequences

Hay dos contenedores/cuentas y dos cadenas de verificación. sGTM requiere hosting, Client,
entrada de datos y tag saliente; no recolecta automáticamente. El transporte de PageView
desde navegador sigue dependiendo del ingreso; Lead backend reduce esa dependencia sin
saltar consentimiento. Operación, costo, observabilidad y privacidad deben revisarse.

## Runtime Contract

- [Runbook canónico y evidencia de inventario](../reference/measurement-gtm-ga4/08-meta-conversions-api-server-side.md).
- Verdad Lead: `greenhouse_growth.form_submission`, snapshot de consentimiento y
  `growth.forms.submission_accepted` de `src/lib/growth/forms/contracts.ts`.
- Identidad CAPI compartida/ingress backend: contrato pendiente de implementación;
  no ampliar dataLayer con PII ni adoptar automáticamente `submissionId` como ID externo.
- `event_name+event_id` consistentes entre senders; retries conservan momento/identidad.
- Token exclusivamente servidor; exports/readbacks saneados. Consentimiento denegado
  o desconocido bloquea Meta. Elegibilidad comercial explícita, no todo Growth Form.
- Deploy gobernado existente: [ADR de tagging](GREENHOUSE_MEASUREMENT_TAGGING_DEPLOYMENT_DECISION_V1.md).
  Preview y aprobación antes de publicar cualquiera de los contenedores; provisión,
  IAM/DNS/secrets y envío de canaries requieren alcance autorizado propio.
- Configuración publicada no equivale a operación verificada. `gtm:snapshot --check`
  sólo verifica web, no CAPI. No se crearon recursos ni se publicaron cambios.

## Revisit When

Reabrir si el contenedor no es recuperable, cambia el ownership del sender, aparece
duplicación o la evaluación de disponibilidad/costo justifica otra arquitectura.

## Delta 2026-10-13 — recuperación mediante el evento GA4 existente

El operador precisó que Lead debe anclarse al submit de los Growth Forms/GA4. Se verificó
que el submit de GA4 proviene de `gh_form_submission_accepted`, emitido tras aceptación
backend. La ruta inicial usa ese espejo → `generate_lead` → GA4 Client sGTM → `Lead`;
la verdad sigue en el ledger, pero **no se exige otro emisor backend para recuperar CAPI**.
Un futuro outbox sender requiere ownership/dedupe propios y no se suma automáticamente.
[Auditoría y borradores](../audits/measurement/META_CAPI_RECOVERY_2026-10-13.md): billing
deshabilitado confirmado, workspaces web 7/server 5 compilados, sin publicación; transporte,
consentimiento y QA funcional pendientes. El mandato «vamos» autorizó diagnóstico/preparación,
no restablecer facturación ni activar tráfico productivo.

## Delta 2026-10-13 — incluir reservas confirmadas

El operador pidió también conversión de reuniones. Se conserva el contrato del agendador:
`gh_meeting_booking_confirmed → generate_lead` con `lead_source=meeting_booking`, y se
prepara filtro servidor separado para CAPI Lead por scheduler/surface. No duplicar la
reserva como Lead de formulario ni reenviar el custom a GA4. Receipt privado no se envía:
identidad CAPI opaca de la reserva pendiente; apertura, intento y replay no convierten.
La ampliación es de preparación; no autoriza bookings reales, publicación ni IAM.

## Delta 2026-10-13 — hosting canónico autorizado y UUID de reuniones

Tras acordar costo/límites, el operador autorizó recuperar el hosting del mismo contenedor
en `efeonce-group`, sin otro proyecto ni cambio de billing del antiguo. Tagging + preview
min 0/max 1, 1CPU/512MiB, instance-based, salud y asociación verificadas; detalle en la
[auditoría](../audits/measurement/META_CAPI_RECOVERY_2026-10-13.md). No constituye publicación GTM.

La confirmación elegible fresca de reuniones obtiene un UUID v4 independiente en el
emitter browser (preparado localmente, release pendiente). No se transmite receipt ni
identidad interna. WeakMap conserva el ID ante fallo de push; WeakSet evita repetir el mismo
efecto tras éxito. Fallo de Crypto omite ID y el filtro UUID servidor bloquea Meta, sin romper
el espejo GA4. No se cambió schema/receipt/API de negocio. Este nonce tiene alcance del
sender browser→sGTM; una futura emisión desde backend exige identidad durable compartida
y dedupe antes de coexistir. El dataLayer sigue siendo un espejo no infalsificable.

Gate CAPI exige UUID anclado: regex genérica `.+` acepta missing/undefined y causó un Lead
sintético accidental en QA. Corregido y negativos verificados; positivos sólo con Test Events
code real. Consentimiento real/routing por host, release y aprobación de publish siguen pendientes.


## Delta 2026-10-13 — consentimiento y rollout aprobados

«Ok, hazlo» autoriza la recomendación HubSpot y su conexión con medición. Dos políticas
opt-in por categorías/GPC publicadas; default inline denied, listener `_hsp` granular,
Google/Clarity y Meta separados. [Contrato](../reference/measurement-gtm-ga4/09-hubspot-consent.md).
Server live 5/Web live 5, WP routing activo, Think deployment promovido; Test Events Server
procesados, PageView real de ambos hosts completó tags Meta/GA4. Código QA retirado.
UUID renderer si existe o fallback Crypto local por ocurrencia GTM: no exige liberar GH ni
crea otro sender. Cambio de consentimiento no vuelve a contar el destino en la misma navegación.
Estado/evidencia/rollback en auditoría; próximos leads comerciales y replay aún por observar.

## Delta 2026-10-13 — coincidencia y segmentación para remarketing

El operador requiere datos accionables de Lead, además de transporte CAPI operativo.
[Contrato de enriquecimiento §4.1](../reference/measurement-gtm-ga4/08-meta-conversions-api-server-side.md#41-lead-utilizable-para-remarketing--requisito-confirmado-2026-10-13):
email/teléfono y nombres disponibles normalizados/hash compatibles con Meta, cookies de
atribución reales y clasificadores comerciales explícitos, mediante ingreso exclusivo de
servidor al contenedor existente. Requisito confirmado; implementación/cutover pendientes.
El POST de los dominios aún no captura consentimiento publicitario en Greenhouse y Meetings
no retiene contactos recuperables. No reusar hashes internos, ampliar GA4/dataLayer ni sumar
un sender con otro ID. Se requiere snapshot durable de consentimiento/identidad y pruebas de
replay/dedupe. Audiencias Meta/listas CRM son operaciones separadas, no efecto automático de CAPI.


## Delta 2026-10-13 — backend matching autorizado + Google UPD

«Habilita TODO lo que sea necesario, te autorizo» cubre matching consentido, settingsUPD,
audiencias, secretos y rollout proporcional. [Contrato §4.2](../reference/measurement-gtm-ga4/08-meta-conversions-api-server-side.md#42-implementación-de-matching-y-google-upd--2026-10-13)
y [TASK-2034](../tasks/in-progress/TASK-2034-growth-lead-matching-meta-google.md) gobiernan
proyección cifrada transaccional/retries por destino y un solo emisor Meta Lead al cutover.
Google UPD dedicado MP (sin events) complementa el mirrorGA4; PII/hash no va en parámetros
ordinarios. UPD/ack + siete audiencias 90 d activos, secretos scoped preparados. Código local
probado, Client draft Preview/Test EventsServer con matchingPASS; releasebackend pendiente.
El operador ordenó después promover todo develop→main. El checkout compartido se conserva;
el override formal de batch y demás gates de release siguen siendo obligatorios.


Persistencia de rollout del worker: GitHub repo vars de los tres switches → env del workflow
→ deploy.sh, replicando AUTH_SERVER_GC_ENABLED; defaultOFF hasta SQL/cutover. Cambiar
repo vars y env servido juntos, también al apagar; retentionON durante rollback.


## Cierre de implementación autorizado — 2026-10-13

Este cierre implementa la dirección Accepted bajo las autorizaciones posteriores del operador
para consentimiento, hosting con límites, matching/Google y release íntegro develop→main.
No vuelve retroactivamente autorizadas las acciones de los checkpoints anteriores.
PR254/main d692ab51dc48, manifest released; Server6/Web5, SQL aplicada, cuatro flagsON y
secretos verificados dentro del worker. [Evidencia y rollback](../audits/releases/2026-10-13-full-develop-matching-release.md).

El emisor actual Meta Lead es exclusivamente backend: aceptación/confirmación persistida,
snapshot granular/GPC, proyección cifrada, UUID/tiempo durables, retries por destino y Client
sGTM autenticado31/trigger33. Retirados los emisoresMeta12/17 basados en GA4. Esto sustituye
el transporte Lead de recuperación inicial descrito arriba; PageView11 y espejoGA4 continúan.
Forwarding sólo ClientGA4, sin segunda conversión; GoogleUPD dedicado user_data sin events.
No PII/hash en parámetros ordinarios/dataLayer. [Contrato completo](../reference/measurement-gtm-ga4/10-growth-lead-matching-runtime.md).

Se preserva elegibilidad explícita, hoy seis slugs y una pareja scheduler/surface enumerados
**en backend y Client sGTM**. Publicar otro formulario no autoriza matching automáticamente.
[Configuración escalable](GREENHOUSE_GROWTH_MEASUREMENT_CONFIGURATION_PROPOSAL_V1.md) es
Proposed, pendiente de GO, sin schema/API/UI/Client/release implementado por documentarla.

GoogleUPD/ack y siete audiencias90d activos no prueban serving/calidad. Test Events Processed
con hashes y canaries de cola/credenciales no sustituyen primera fuente comercial consentida
post-flip ni dedupe de atribución; TASK2034 queda parcial por esa aceptación restante.
Rollbackmatching: capture/sendersOFF durable+live, retentionON, Server5 sólo tras backendOFF,
conservar key48h/SQL/recibos. Config persistente no afirma tokenMeta perpetuo ni costo cero.


## Cierre complementario autorizado — 2026-10-14

Se conserva GTM Server existente, hosting/proyecto y pixel708931297255942. Sólo customTemplate30
cambió en el publish Server9; tag Meta6, GA4tag18, Client31/trigger33 y Web5 permanecieron.
El envelope autenticado schema2 añade prueba cerrada de policy/revisión/source-version/surface;
se valida y retira antes del tag. Schema1 se rechaza. Ya no existen listas de slugs en backend/Client:
manda la policy publicada y versionada del [ADR Accepted](GREENHOUSE_GROWTH_MEASUREMENT_POLICY_DECISION_V1.md).

IP/UA provienen del POST del visitante; fbp/fbc consentidos y fbclid de landing persistido tras grant,
sin hash. Email/teléfono/nombres/external_id estable normalizados y SHA256hex. Website, URL real
segura, tiempo UNIX y UUID durable conservados. Matching sigue separado de aceptación/HubSpot
Forms/CRM; GA4 conserva un espejo y Google UPD user_data sin events. Sin nuevos servicios/gasto.

API/CLI comparten commands/autoridad con el panel: discovery tipado versionado, dry-run fresco
sin escritura, lifecycle inmutable, CAS/idempotencia/auditoría y recibos con GET independiente.
La alta de fuente compatible posterior al release llegó a Meta Test Events sin cambiar código,
deployment ni GTM; policy desactivada y fixture archivada. Los tres canaries finales mostraron
Processed/Server/website (ocho claves Think sin teléfono mapeado, nueve agenda/fuente nueva).
No se enviaron pruebas ordinarias ni se fija test_event_code. [Recibos y límites](../audits/releases/2026-10-14-scalable-measurement-agent-first-release.md).

El rollback actual debe mantener compatibilidad con schema2: desactivar captura/destinos/policies,
conservar SQL/recibos/ciphertext/key48h y retención. Server5/6 y los builders basados en esos
snapshots sólo son antecedentes; no restaurarlos bajo productores nuevos activos. Las fuentes
comerciales reales/EMQ siguen pendientes, sin cerrar artificialmente TASK-2034 ni el resto de TASK-2035.

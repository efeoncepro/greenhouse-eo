# Meta CAPI — recuperación y publicación · 2026-10-13

> Estado actual: GTM Server live **5**, Web live **5**; HubSpot consent por categorías
> publicado y routing activo en WordPress y Think. Positivos Server procesados en Meta Test Events;
> navegación real de ambos hosts completó tags Meta/GA4. Próximos leads comerciales/replay sin observar.
> Los deltas inferiores preservan la secuencia histórica; el último delta gobierna el estado actual.
> Canon: [runbook](../../reference/measurement-gtm-ga4/08-meta-conversions-api-server-side.md).

## Requisito vigente: coincidencia y remarketing de Lead

Readback posterior a las pruebas de visitante nuevo: GTM Web/Server live 5/5, etiqueta
Meta v25 con enriquecimiento/cookie extension deshabilitados. Forms tag 12 usa
`correlation_id` como `event_id`; Meetings tag 60 usa UUID del sender. No pasan campos de
contacto ni `custom_properties`. La plantilla no copia por sí sola los clasificadores
`form_slug`/`lead_source` a Meta; IP/UA fueron los campos de coincidencia observados en QA.
Reader reproducible y redactado: `.captures/meta-capi-diagnostic-2026-10-13/read-lead-payload.ts`.

El operador requiere datos accionables para remarketing. Contrato y flujo en
[08 §4.1](../../reference/measurement-gtm-ga4/08-meta-conversions-api-server-side.md#41-lead-utilizable-para-remarketing--requisito-confirmado-2026-10-13).
Revisión de contratos/código: Forms POST sólo incluye consentimiento del formulario;
Meetings POST incluye procesamiento/comunicaciones, sin categoría publicitaria. El agendador
no conserva email/nombres recuperables en su ledger; sus HMAC internos no son hashes Meta.
Por tanto, capturar consentimiento/contexto, calcular matching compatible durante aceptación,
ingreso autenticado separado y cutover con identidad/dedupe requieren implementación.
**Este delta actualiza requisito/documentación/skills; no activa enriquecimiento, cambia
producción ni crea audiencias.** No se reenviaron contactos ni conversiones.

## Anclaje Lead confirmado

El operador pidió reutilizar el submit GA4 de los Growth Forms. El código diferencia:

- `gh_form_submitted`: intento, antes de la respuesta del backend.
- `gh_form_submission_accepted`: sólo cuando `result.outcome === accepted`.
- GTM Web publicado transforma **accepted** en `generate_lead`, trigger `11`.
- Template oficial Meta en Server transforma `generate_lead` en `Lead`.

La ruta de recuperación elegida es:

```text
Backend acepta → renderer gh_form_submission_accepted
→ GTM Web generate_lead → transporte hacia sGTM
→ GA4 Client del servidor → Meta CAPI Lead
```

No requiere otro evento de submit ni implementar un emisor backend directo para comenzar.
La aceptación persistida sigue siendo la verdad de negocio; este transporte es browser-originated
con envío final desde servidor, y puede perder señales si el navegador no las entrega.
Un emisor outbox adicional queda como evolución separada y no se duplica con este carril.

## Evidencia de fallos

| Verificación | Resultado observado | Implicación |
| --- | --- | --- |
| Salud URL registrada `/healthy` | HTTP 500 y después 503, no `ok` | No puede certificarse operación del tagging server |
| Cloud Run log del servicio | `The request failed because billing is disabled for this project.` | Bloqueo de facturación confirmado para el proyecto, no inferido del HTTP |
| Cuenta vinculada por UI de facturación | `Mi cuenta de facturación 1` · `010E81-AB1A3D-941347`, estado explícito **cerrada** | No se reabrió; pendiente decisión entre vincular sólo GTM a cuenta activa o evaluar reapertura |
| Proyecto del servidor en GTM UI | `gtm-k2x4zttk-zguxn`, creado por `jreyes@efeonce.cl`; región `us-central1` | Infra antigua independiente de `efeonce-group` |
| Servicios Cloud Run por UI autenticada | `server-side-tagging` y `server-side-tagging-preview`, última implementación mostrada 17/07/2024 | Ambos existen; no implica que arranquen ni que la revisión sea actual |
| Acceso CLI actual | `julio.reyes@efeonce.org`: `run.services.list` denegado para ese proyecto | UI de la cuenta antigua permitió diagnóstico; no se amplió IAM ni cambió cuenta CLI |
| Browser `efeoncepro.com/desarrollo-sitios-web/` y Think `/` | 200; PageView enviado a `analytics.google.com`; no request al tagging server ni `fbq` observado | Estos recorridos no están encaminados a sGTM |
| Consentimiento en esas sesiones frescas | Sin comandos `consent` ni scripts CMP reconocidos observados | No hay evidencia de señal publicitaria concedida; no asumir permiso del consentimiento del formulario |
| Meta token: GET metadata píxel, sin eventos | Error 100 relacionado con permisos | No certifica token CAPI inválido/vencido; no se rotó ni probó capacidad de envío |

La salud publicada de Cloud Run/estado Ready no contradice el error de facturación al arrancar.
No se atribuye toda la pérdida histórica a una sola causa: ingress y billing son fallos distintos.
No se abrieron recursos hibernados de Globe/Kortex ni se reactivaron APIs de proyectos ajenos.

## Borradores remotos y lectura de vuelta

- **Server workspace 5:** [meta-capi-recovery-20261013](https://tagmanager.google.com/#/container/accounts/6068297031/containers/191286361/workspaces/5).
  Base live 3; cuatro variables Event Data (`meta_ads_consent`, `page_location`, `form_slug`,
  `event_id`), inicialmente dos triggers; ampliación de reuniones añade el tercero (ver delta al final).
- **Web workspace 7:** [meta-capi-recovery-20261013](https://tagmanager.google.com/#/container/accounts/6291647045/containers/218104216/workspaces/7).
  Base live 4; una DLV `correlation_id`; `event_id={{DLV - correlation_id}}` añadido al tag
  `GA4 Event - generate_lead`. Conserva trigger accepted `11` y parámetros existentes.
- Ambos `quick_preview`: `compilerError=false`, sin sync conflict. Esto es compilación,
  **no Preview funcional ni recepción Meta**. Versiones live releídas: server 3, web 4.
- El antiguo trigger server `Event Name matches .+` se conserva como objeto, pero tiene cero
  referencias del tag CAPI en el borrador; live aún conserva su configuración anterior.
- CAPI draft permite `page_view`/`generate_lead`, sólo HTTPS de ambos hosts y
  `meta_ads_consent=granted`. Lead requiere además un `event_id` no vacío y esta lista **candidata**:
  `efeonce-aeo-diagnostic`, `efeonce-seo-diagnostic`, `efeonce-desarrollo-web-cotizacion`,
  `efeonce-lead-gen-web`, `efeonce-social-audit`, `ai-visibility-grader`.
  Reconciliar con formularios activos/surfaces antes de publicar; no habilita postulaciones.
- Template oficial actualizado **sólo en Server workspace 5**, mediante revisión/actualización
  de la gallery: Graph API `v16.0` live → `v25.0` draft. SHA gallery draft: `a575edb31aa447469b855c3006ed9991dad711cf`.
  Publisher `facebookincubator/ConversionsAPI-Tag-for-GoogleTagManager`.
- Token existente conservado, sin exports/logs. Draft establece `actionSource=website`,
  `extendCookies=false`, `enableEventEnhancement=false`; lectura y compilación verificadas.

## Qué falta para que sea publicable

1. Restablecer facturación del proyecto antiguo con la cuenta autorizada, o aprobar una
   migración de hosting con presupuesto/ownership. **No se cambió la facturación** ni se
   creó infraestructura: elegir el siguiente paso requiere decisión concreta del operador.
   La consulta se dejó pendiente al operador; consola abierta sin acciones financieras.
2. Verificar `/healthy=ok` de tagging/preview y configuración de ambos. No basta Ready.
3. Resolver la fuente de consentimiento publicitario real. `meta_ads_consent` es un campo
   propuesto; **hoy no se emite**. El draft bloquea Meta si falta/denied y no lo falsifica.
4. Configurar transporte desde ambos hosts sin romper Site Kit/GA4 ni duplicar PageView.
   El Web draft **no cambia el destino actual**: `server_container_url` aún pendiente.
   Si se enruta GA4 por servidor, configurar forwarding GA4 y excluir datos de Meta por destino;
   sin eso se perdería analytics. Sanear source URLs y validar consentimiento/IDs al ingresar.
5. QA funcional Server Preview y Test Events, negativos (error/clic/postulación/consent),
   identidad/replay y canary sin entregas CRM. La prueba de token requiere contexto de envío,
   no el GET de metadata fallido. No se enviaron eventos de prueba a Meta ni submissions reales.
6. Presentar diff/costo/rollback, aprobar publicación y verificar Meta productivo de ambos hosts.

## Evidencia local saneada

`.captures/meta-capi-diagnostic-2026-10-13/` (ignorada por Git): `browser-readonly.json`,
`server-draft-receipt.json`, `web-draft-receipt.json`, `server-workspace.png` y scripts de
preparación sin credenciales embebidas. No hay dumps de tags con tokens ni configuración
Cloud Run completa. Los scripts sólo solicitan edit/preview, nunca scope publish.

Fuentes oficiales: [ingreso Google](https://developers.google.com/tag-platform/tag-manager/server-side/send-data),
[template Meta](https://github.com/facebookincubator/ConversionsAPI-Tag-for-GoogleTagManager).

## Selección de billing canónico y límite IAM (2026-10-13)

El operador eligió la cuenta canónica del proyecto Efeonce. Readback CLI del proyecto
**`efeonce-group`**: `billingAccounts/013340-4C7071-668441`, `billingEnabled=true`.
`billing accounts list` confirma `open=true`. `julio.reyes@efeonce.org` tiene el rol
`roles/billing.admin` directo en esa cuenta, verificado sin exportar otros miembros.

La sesión web `jreyes@efeonce.cl` es **Owner de `gtm-k2x4zttk-zguxn`**, pero el selector
«Cambiar facturación» sólo ofrece la cuenta activa **Efeonce** `01A976-E23B84-23CD75`.
Esa cuenta NO es la canónica verificada de `efeonce-group`. La misma sesión muestra un
proyecto distinto llamado Efeonce Group (`efeonce-group-1738960661231`); no confundirlos
por nombre. No se eligió esa otra cuenta ni se reabrió la cerrada.

La identidad CLI canónica no puede leer/listar el proyecto antiguo. La identidad cacheada
`jreyes@efeoncepro.com` también recibió `USER_PROJECT_DENIED`; no se alteraron perfiles,
ADC ni IAM como respuesta al error. Ninguna identidad verificada reúne hoy ambos lados.

Plan original de IAM (sustituido por autorización permanente; ver delta posterior):

- Principal: `user:julio.reyes@efeonce.org`.
- Único recurso: proyecto `gtm-k2x4zttk-zguxn`.
- Roles: `roles/billing.projectManager`, `roles/browser`,
  `roles/serviceusage.serviceUsageViewer`.
- Duración: una hora desde el grant aprobado, con condición IAM de expiración.
- Operación posterior: vincular sólo este proyecto a `013340-4C7071-668441`, leer
  `billingEnabled=true` y probar salud de tagging/preview; no publica workspaces GTM.
- Estado en ese momento: consulta al operador pendiente; cero grants, cero cambio billing.
  JSON saneado en `.captures/meta-capi-diagnostic-2026-10-13/billing-relink-plan.json`.

La aprobación se requiere por ampliar accesos IAM, no por volver a elegir la cuenta que
ya indicó el operador. No conceder Owner ni acceso global a la cuenta de billing. Si el
operador prefiere hacer la vinculación manual, no crear esos roles. Una vez realizada la
vinculación, conservar evidencia/revocar los grants temporales y continuar con los gates
de consentimiento/transporte/QA existentes.

Google documenta roles/permisos necesarios en [cambiar billing de un proyecto](https://docs.cloud.google.com/billing/docs/how-to/modify-project#change_the_billing_account_for_a_project)
y [roles Cloud Billing](https://docs.cloud.google.com/iam/docs/roles-permissions/billing).

## Ampliación a reuniones confirmadas (2026-10-13)

El operador pidió incluir reuniones. Código verificado en
`src/growth-meeting-renderer/telemetry.ts`: `gh_meeting_booking_confirmed` sólo se
emite para respuesta `outcome=confirmed`, `conversionEligible=true`, receipt válido
y aún no consumido. Receipt nunca sale al dataLayer; no hay evento DOM de confirmación.
Replay no entrega otro receipt elegible. Abrir agenda/seleccionar horario/intentar no convierten.

Contrato elegido: mantener `generate_lead` en GA4 con `lead_source=meeting_booking`
y CAPI `Lead` con filtro separado por scheduler/surface; no crear otro custom GA4
ni enviar dos Leads Meta por la misma reserva. Se prepara únicamente la confirmación
en web 7, reutilizando el mapping permitido del workspace 6 sin modificar su WIP.
Server 5 limita reuniones a `efeonce-discovery-30` / `fhsf-efeonce-lead-gen-web`,
además de hosts HTTPS, consentimiento granted y `event_id` no vacío. La lista es
la del piloto declarado; otras ubicaciones requieren verificar su binding y elegibilidad.

**Pendiente de producción:** el contrato actual de meetings no emite `event_id`.
No se copió `correlation_id` de forms a meetings ni se expuso receipt, idempotency
o provider IDs. Definir identidad de conversión opaca, estable y ajena al receipt,
con contrato/paridad/documentación y reconciliación de replay antes de activar.
El filtro servidor queda cerrado mientras ese ID o el consentimiento falten.
No se modificó el renderer ni se realizó booking real; billing/IAM siguen pendientes.
Coordinar la promoción con workspace 6 para conservar un único tag de confirmación
y no publicar cambios ajenos o duplicar el mapping.

Readback final de preparación: web workspace 7, tag `60`
`GA4 event - meeting booking generate_lead`, trigger `59` de confirmación; server
workspace 5, trigger `17` `Meta CAPI - Lead - confirmed meeting bookings`, tag CAPI
con firing IDs `11,12,17`. Ambos `quick_preview`: `compilerError=false`,
`syncStatusOk=true`. Live releído web `4` / server `3`; workspace 6 no modificado.
Recibo saneado: `.captures/meta-capi-diagnostic-2026-10-13/meeting-draft-receipt.json`.
Es compilación/readback de borrador: identidad y QA funcional siguen pendientes.

## IAM permanente aplicado; billing bloqueado por cuota (2026-10-13)

El operador autorizó expresamente los tres roles y pidió dejarlos permanentemente.
Se guardaron en Google Cloud Console, como `jreyes@efeonce.cl` Owner del único proyecto
`gtm-k2x4zttk-zguxn`, para `user:julio.reyes@efeonce.org`:
`roles/billing.projectManager`, `roles/browser`,
`roles/serviceusage.serviceUsageViewer`, **sin condición ni vencimiento**. Readback
UI muestra principal y los tres roles; CLI canónica pudo leer el proyecto y su billing.
No se otorgó Owner/Editor ni nuevos roles en la cuenta de facturación. La autorización
permanente sustituye el plan anterior de una hora; no hay revocación automática prevista.

La cuenta objetivo `013340-4C7071-668441` se releyó abierta. Intento único de
`gcloud billing projects link` al proyecto autorizado, como Julio org, rechazado:
`FAILED_PRECONDITION`, `QuotaFailure`, **Cloud billing quota exceeded**.
La cuenta canónica lista cinco proyectos vinculados, todos con billing habilitado;
esto no revela por sí solo el límite numérico de cuota. Readback posterior del
proyecto GTM conserva `010E81-AB1A3D-941347` y `billingEnabled=false`;
`/healthy` del tagging server sigue HTTP 500. No se cambió una cuenta alternativa,
se desvinculó otro proyecto ni se desplegó infraestructura como workaround.

Siguiente paso de hosting: solicitar a Google capacidad para un proyecto facturable
adicional en la cuenta canónica mediante su
[formulario específico de cuota billing](https://support.google.com/code/contact/billing_quota_increase).
Texto preparado abajo, **no enviado**; contacto con soporte requiere autorización
explícita. Tras aprobación efectiva de Google, reintentar la misma vinculación,
releer billing y probar tagging/preview antes de continuar el QA CAPI.

> Solicito ampliar la cuota de proyectos facturables asociada a la cuenta
> 013340-4C7071-668441 para vincular un proyecto adicional: gtm-k2x4zttk-zguxn
> (número 1029745691458). Es el proyecto existente de Google Tag Manager Server
> de Efeonce, con servicios de tagging y preview en us-central1. Su cuenta anterior
> está cerrada y necesitamos restaurar el servicio bajo la cuenta canónica activa.
> La vinculación fue rechazada por FAILED_PRECONDITION / QuotaFailure:
> Cloud billing quota exceeded. La cuenta lista actualmente cinco proyectos
> con billing habilitado. No estamos solicitando cuota de creación de organización,
> OAuth ni una ampliación de recursos Cloud Run.

Evidencia saneada ignorada: `permanent-iam-and-billing-receipt.json`,
`health-after-billing.json`, `iam-permanent-granted.png` en la carpeta de capturas.
Versiones GTM siguen sin publicación en esta operación; no se enviaron conversiones.

## Intento de hosting canónico revertido y revisión de costos (2026-10-13)

El operador pidió alojar el contenedor existente en `efeonce-group` sin contactar
a Google. Readback: billing activo y APIs Run/IAM habilitadas; Cloud Run no tenía
servicios GTM. Se creó una SA `gtm-server-runtime` sin roles de datos y se desplegó
**únicamente** `efeonce-gtm-preview` en us-central1, imagen oficial stable,
1 vCPU/512Mi, CPU siempre asignada, min=0/max=1. La configuración del contenedor
se transfirió desde GTM UI a un YAML ignorado 0600 sin incorporarla al repositorio.

El operador detuvo la provisión al señalar su costo. **Rollback completado:**
servicio `efeonce-gtm-preview` eliminado; listado posterior `efeonce-gtm-*` vacío;
SA nueva eliminada y YAML sensible retirado. No se creó el tagging server,
no se cambió la URL del contenedor ni el routing web, no se publicó GTM.
Los tres roles permanentes del usuario, autorizados previamente, se conservan.
Puede existir consumo puntual del arranque del Preview; no se leyó aún su importe
final facturado y no se afirma costo cero. Hosting detenido por decisión del operador.

El GTM original ya tenía Cloud Run `server-side-tagging` y
`server-side-tagging-preview`, con implementaciones mostradas del 17/07/2024.
La infraestructura de ejecución ya existía; no es un requisito nuevo de esta reparación.
La pantalla de métricas mostró cero instancias/tiempo facturable en el último día
y fallos 5xx, consistente con billing deshabilitado; no acredita factura histórica cero.
La consola dejó de responder al abrir Escalamiento. No se confirmaron mínimos,
máximos, CPU/memoria ni modo de billing de la configuración antigua.

Tarifas oficiales verificadas: [Cloud Run pricing](https://cloud.google.com/run/pricing),
instance-based en us-central1: USD 0.000018/vCPU-segundo y
USD 0.000002/GiB-segundo. Cálculo para 30 días, 1 vCPU/0.5 GiB por instancia,
antes de free tier compartido, red, logs, impuestos y otros servicios:

| Instancias siempre encendidas | USD/30 días de cómputo |
| --- | --- |
| 1 | 49.25 |
| 2 | 98.50 |
| 3 | 147.74 |

No confundir cantidad de servicios con instancias encendidas. Google ofrece una
[referencia sGTM](https://developers.google.com/tag-platform/tag-manager/server-side/cloud-run-setup-guide)
de aproximadamente USD 45/mes por instancia y recomienda al menos dos para
disponibilidad; Preview agrega consumo según su tiempo activo. La diferencia
frente al cálculo bruto depende de free tier y supuestos, no es una tarifa plana.
Free tier se comparte por cuenta de billing con los demás proyectos: no asumir
que está disponible para GTM. min=0 no significa gratis; instance-based cobra
el tiempo de vida de la instancia aunque haya poco tráfico. Un máximo de
instancias limita capacidad, no todo el gasto de la cuenta ni todos los cargos.

La configuración se verificó en el delta siguiente. Pendiente: leer costo histórico y decidir con
el operador modelo de hosting y presupuesto antes de otra provisión. CAPI
directa en backend existente es otra alternativa servidor, pero requiere
aceptar el cambio de la ruta sGTM y evaluar carga/reintentos; no se implementó.
No enviar la solicitud de cuota ni desplegar otra infraestructura mientras se
resuelve la decisión de costo. Evidencia saneada: `gtm-cost-and-rollback.json`.

## Configuración original verificada: escalado a cero (2026-10-13)

La consola se recuperó en una pestaña simple y se verificaron ambos servicios
originales sin guardar cambios:

| Servicio | Mínimo de servicio | Máximo de revisión | Billing | CPU/RAM | Revisión publicada |
| --- | --- | --- | --- | --- | --- |
| server-side-tagging | 0 | 1 | Instance-based | 1 vCPU / 512MiB | server-side-tagging-00001-p7j, 17/07/2024 |
| server-side-tagging-preview | 0 | 1 | Instance-based | 1 vCPU / 512MiB | server-side-tagging-preview-00001-np6, 17/07/2024 |

**Corrección de la comunicación de costo:** USD 45/mes de la guía es una
referencia de instancia mantenida encendida; no es tarifa plana del contenedor
ni evidencia de la factura anterior. Los servicios originales podían bajar a
cero y estaban acotados a una instancia cada uno. Con bajo tiempo activo
podían quedar dentro del free tier; es compatible con que el operador declare
no haber pagado, pero la factura histórica no se ha leído. No afirmar
request-based: ambas pantallas tienen **instance-based** seleccionado.

Free tier instance-based verificado en pricing: 240.000 vCPU-segundos/mes
(66,7 horas de CPU de 1 vCPU) y 450.000 GiB-segundos/mes, agregados por
cuenta de facturación. Fórmula de referencia para cómputo us-central1, USD:
`max(0, CPU_seg_total - 240000)*0.000018 + max(0, GiB_seg_total - 450000)*0.000002`.
Aplicar sobre uso agregado elegible de la cuenta, no restar el beneficio por
servicio. Otros recursos pueden consumir ese free tier al alojar en la cuenta
canónica. Red/logs/impuestos se estiman aparte.

Si 1 vCPU/512MiB permanece activo 24/7 durante 30 días: USD 49,25 bruto;
si todos los beneficios anteriores estuvieran disponibles: USD 44,03 de
cómputo neto. Es un escenario, no un cobro mínimo. Migrar con mínimo 0 y
máximo 1 replica el límite de capacidad original, pero no garantiza gasto cero.
Evidencia saneada: `original-tagging-scaling.png`, `original-preview-scaling.png`
y `gtm-cost-and-rollback.json` en capturas. El operador detuvo hosting hasta
entender y acordar costo; ninguna nueva provisión autorizada tras esa parada.

## Delta vigente — hosting reautorizado, recuperado y QA funcional

El operador autorizó avanzar después de contrastar los límites originales. Este delta
supersede el estado detenido/revertido anterior, sin borrar sus acciones ni evidencia.
No se creó otro proyecto GCP ni se solicitó cuota a Google. Billing del proyecto antiguo
continúa cerrado; sus servicios no se modificaron. IAM permanente previamente autorizado
permanece sólo en ese proyecto. Nuevo hosting del **mismo** `GTM-K2X4ZTTK`:

| Recurso | Estado aplicado y releído |
| --- | --- |
| Proyecto/región | `efeonce-group` / `us-central1`, billing canónico existente |
| Tagging | `efeonce-gtm-tagging`, revisión `efeonce-gtm-tagging-00001-4qp` |
| Preview | `efeonce-gtm-preview`, revisión `efeonce-gtm-preview-00001-vf2` |
| Capacidad de ambos | CPU 1/512MiB, concurrencia 80, timeout 60s, min servicio/revisión 0, max servicio/revisión 1 |
| Facturación | Instance-based, sin CPU throttling ni startup CPU boost; min 0 no garantiza costo cero ni max 1 un tope monetario |
| Identidad runtime | `efeonce-gtm-runtime@efeonce-group.iam.gserviceaccount.com`, sin roles de datos del proyecto |
| Imagen oficial fijada | `gcr.io/cloud-tagging-10302018/gtm-cloud-image@sha256:490cd41aad58406d44853ddc6f2be58c5d9a1d13bc75c8f92fee076891d6ed74` |
| Salud y configuración | Ambos `/healthy` 200/`ok`; config corresponde al contenedor existente; YAML sensible eliminado |

URL tagging registrada y releída por API:
`https://efeonce-gtm-tagging-183008134038.us-central1.run.app`.
Preview: `https://efeonce-gtm-preview-183008134038.us-central1.run.app`.
Los alias `*-y6egnifl6a-uc.a.run.app` devueltos por Cloud Run también responden.
El popup histórico de aprovisionamiento automático puede conservar el proyecto antiguo;
no se hackearon APIs privadas para cambiarlo. Asociación ContainerSettings y Preview nuevos
sí quedaron verificados. Versiones live **server 3/web 4**, sin publicación.

### Borradores y salida de QA

- Server workspace 5: Meta oficial gallery v25 (`a575edb31aa447469b855c3006ed9991dad711cf`),
  tag 6 con PageView consentido + forms comerciales aceptados + reuniones confirmadas.
- GA4 forwarding nuevo tag 18 `sgtmgaaw`, measurementId `G-KYPPY57M14`; trigger 20
  exige Client Name GA4, ambos hosts HTTPS y excluye `measurement_probe=internal_qa`.
  Excluye `meta_ads_consent`, `measurement_probe`, `user_data`, `em`, `ph`, `fn`, `ln`,
  `fbp`, `fbc`, `external_id`, `conversionReceipt` y `conversion_receipt` de GA4.
- Web workspace 7: tag 15 Think con `server_container_url` y `meta_ads_consent`;
  tag 12 accepted form y tag 60 confirmed meeting incluyen consentimiento e ID.
  DLV consentimiento default denied; DLV event_id default vacío. Workspace 6 ajeno conservado.
  **Esto no configura Site Kit de WordPress**: su emisor inicial requiere routing propio.
- Compilación de ambos borradores sin errores/sync OK. Preview funcional: Client GA4
  reclamó y parseó seis eventos; Meta y GA4 sin disparar y cero HTTP salientes para:
  denied, hostname ajeno, form no comercial, meeting missing ID, literal undefined ID,
  PageView missing consent. El marcador QA bloquea sólo GA4, no enmascara el gate Meta.
- Preview se cerró al finalizar para evitar mantener solicitudes largas activas.
  Recibos saneados en `.captures/meta-capi-diagnostic-2026-10-13/`: hosting, asociación,
  forwarding, transporte web, gate UUID y `server-preview-final-qa.txt/png`.

### Incidente de QA: una conversión sintética llegó a Meta

El filtro inicial `event_id matches .+` aceptó el valor missing convertido a `undefined`.
Una solicitud sintética `generate_lead` con contexto meeting/granted activó tag 6:
Graph v25 HTTP 200, `events_received=1`, `messages=[]`, trace `AhwjAFVWzMOveqEhPnnVfCF`.
No tenía `test_event_code`, por lo que alcanzó la ingesta ordinaria. No creó meeting,
submission, contacto ni CRM; no llevaba email/teléfono. IP/UA se derivaron del navegador.
Es evidencia de un evento QA accidental, **no una conversión comercial ni Test Events**.
Operador informado; no se borraron eventos, rotó token ni inventó un código de prueba.

Triggers 12/17 corregidos y releídos con UUID anclado:
`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$`.
Missing + literal undefined retesteados: cero Meta. Positivos posteriores requieren un
código real de Test Events y aislamiento verificable antes de enviar.

### UUID de reuniones: código local preparado, sin release

`telemetry.ts` genera UUID v4 independiente mediante Crypto sólo para el efecto confirmado
elegible. Retiene identidad si falla el push; tras push exitoso, el mismo efecto no se repite.
Ignora cualquier event_id del payload caller. No deriva del receipt/IDs internos/PII;
interacción, replay y telemetry disabled no generan identidad. Fallo de entropía conserva
UX/espejo GA4 sin ID, con CAPI fail-closed. La elegibilidad sigue en el receipt del dominio.
No es identidad durable del ledger ni compartida con un sender backend futuro.

Contrato allowlist extendido; 30 tests renderer/telemetry/command PASS, lint y typecheck
focalizados PASS. Build renderer aislado (127.623 bytes), sin cambiar archivos públicos
generados, Vercel ni WordPress. Publicación del renderer pendiente.

### Pendientes y siguiente paso

Fuente de `meta_ads_consent` real todavía no integrada: inventario WP read-only no encontró
un CMP evidente entre plugins/option names; no descarta configuración HubSpot remota/geográfica.
Se consultó al operador banner común sin suscripción vs gestor existente; respuesta pendiente.
Resolver consentimiento y routing inicial de ambos hosts (incluido Site Kit), saneamiento
tag-scoped de URL/referrer Meta, release renderer, forwarding GA4 positivo y Test Events.
Luego presentar paquete/diff/rollback y aprobar publicación de server 5/web 7; finalmente
verificar PageView/Lead reales de ambos hosts sin duplicación. No declarar CAPI operativo
por `/healthy`, compilación o el único evento QA accidental.

### Cierre de saneamiento del borrador servidor

Variable 21 `remm` captura sólo HTTPS de ambos hosts + path y elimina query/fragment.
Transformación 22 `tf_augment_event` reemplaza page_location sólo para tag Meta 6;
transformación 23 `tf_exclude_params` excluye page_referrer, measurement_probe y
meta_ads_consent sólo de ese destino (el gate se evalúa antes). GA4 conserva su configuración.
API readback y quickPreview PASS. Preview con consentimiento denied + marcador GA4 interno:
ambos hosts resultan en URL limpia, tercero en string vacío; cero etiquetas activadas.
Esto valida la variable y el bloqueo, no un payload positivo saliente transformado.
`url-sanitization-receipt.json`, `url-sanitization-qa.json/png` y captura del listado de dos
transformaciones en `.captures/meta-capi-diagnostic-2026-10-13/`. Preview y probes cerrados.
Pendiente validar aplicación en salida Meta mediante Test Events code real antes de publicar.
Gates de documentación/contexto estrictos y espejos PASS; no commit/push/release de sitios.


## Cierre 2026-10-13 — consentimiento autorizado y publicación

El operador respondió «Ok, hazlo» a la recomendación HubSpot. Dos políticas específicas
portal `48713323`, español, todas las URL/países, opt-in por categorías y GPC, publicadas y
releídas ACTIVE para `efeoncepro.com` y `think.efeoncepro.com`. Analítica y Publicidad
independientes; default global y offers sin cambios. No suscripción/proyecto nuevo.
[Contrato y fuentes](../../reference/measurement-gtm-ga4/09-hubspot-consent.md).

Bridge canónico `scripts/measurement/hubspot-consent-bridge.js`, SHA256
`15026e5d27ed54a8188a67b100f812ef5d33129bb15f7eb365054cac6f4f0d3a`, byte-idéntico
WP/Think. `_hsp` categories, defaults inline denied antes de GTM/Site Kit, actualización
Google/Clarity, fail-closed, GPC; sin persistencia propia/PII. 16 tests PASS.
PageView explícito una vez por destino/navegación; UUID v4 Crypto memoizado por counter GTM
local. Analítica-only bloquea Meta; publicidad-only bloquea forwarding GA4 (`meta_only=1`).
Gates server: consentimiento analítico nativo para GA4; ads granted + marker PV + UUID para Meta.
Controles/referrer fuera de Meta y URL sin query/fragment. No Pixel web adicional.

Identidad meeting en sender: UUID válido del renderer si existe; si falta, bridge genera
UUID opaco por ocurrencia GTM. Respeta confirmación elegible fresca del dominio. El renderer
local preparado sigue **sin release Greenhouse** y no bloquea esta recuperación. No se
reutiliza receipt/ID interno ni se crea otro sender. Replay real todavía no ejercitado.

### QA antes de publicar

Código Test Events obtenido del dataset exacto, activo sólo en draft y retirado/releído
antes del publish. Meta mostró **Processed / Server**:

- PageView WP UUID `c0deb133-1f28-4813-8870-1b8db7a880b3`, URL `https://efeoncepro.com/`.
- PageView Think UUID `c0deb134-1f28-4813-8870-1b8db7a880b4`, URL `https://think.efeoncepro.com/`.
- Lead formulario aceptado UUID `c0deb131-1f28-4813-8870-1b8db7a880b1`.
- Lead reunión confirmada UUID `c0deb132-1f28-4813-8870-1b8db7a880b2`.

Los positivos eran sintéticos **Test Events**, sin submissions/bookings/contactos. URLs
entraron con query/fragment de QA y Meta recibió URL limpia. Diez negativos finales sin
salidas Meta/GA4: publicidad denied, host ajeno, form no comercial, ID missing/literal
undefined, PV sin consentimiento/ID/marker, analítica denied y meta-only (últimos dos sin
marcador QA, para comprobar el gate GA4 por sí mismo). Previews/probes cerrados.
Recibos saneados: `meta-test-events-server-receipt.json`, `final-destination-negative-qa.json`
y `meta-test-events-server.png` en `.captures/meta-capi-diagnostic-2026-10-13/`.

### Rollout y readback

Server **4** publicado primero, Web **5** después: compile PASS, API versions:live
coincidente, código Test Events ausente. Workspace web 6 ajeno conservado. No cambios
al proyecto antiguo ni ampliación IAM en este cierre. `publication-receipt.json`.

WP plugin scoped `eo-measurement-consent` activo, release dos archivos con hashes/prestate/
backup, plugin cache invalidada, Kinsta cache purgada. Opción
`eo_measurement_server_routing=enabled` releída: Site Kit usa tagging moderno y
send_page_view false. No full repo deploy: drift detectó contenido 0, repo_pending 399 y
live_untracked 40; cambios ajenos conservados. Plugin 1.0.2 conecta botón directamente a
showBanner y añade clearance inferior móvil: CTA fijo de reuniones cubría el control.
SHA PHP `f2275822cb0fdfb9ad5c929dd703504e80ea661e49bbb19ad124ff825375aef8`;
Backup scoped antes de 1.0.2: `/tmp/efeonce-consent-before-20261013-180018.tar`.

Think deployment READY **dpl_9Tba5i1reknMviVNZF8FAJwbJYx4**, URL
`https://efeonce-think-qclv6cfq3-efeonce-7670142f.vercel.app`, promovido a
`think.efeoncepro.com` y releído por Vercel inspect. BaseLayout + asset, type-check/build PASS;
rutas con analytics=false conservan exclusión de GTM/HubSpot/controles. Rollback anterior
**dpl_GQd67RGgfgn1idEiZs8RpEUfjRSr** (URL anterior: `https://efeonce-think-84qjatkqp-efeonce-7670142f.vercel.app`).
No commit/push de los cambios fuente en esta sesión.

QA posterior con versión live 4 en Preview: navegación **real** de WP y Think,
UUID parseado, marker 1, ads/analytics granted: tags Meta y GA4 **Completada**.
Analytics-only produjo GA4, Meta bloqueado. El SDK envía event_id como parámetro nativo
**evnid**, Client GA4 lo normaliza a **event_id**; buscar sólo ep.event_id daba un falso
negativo. No modificar payload por esa lectura parcial. No test code en esta versión.
Banner desktop/mobile 390px; preferencias, aceptación separada, retiro y reapertura.
Emulación restaurada, Preview cerrado, cookies opcionales rechazadas tras QA.

### Límite de la verificación y operación posterior

Entrega Server confirmada en Test Events y recorrido browser→Client→tags comprobado con
PageView real de ambos hosts. No se creó una conversión comercial para verificar. La próxima
aceptación comercial/reserva elegible debe contrastarse con Events Manager y ledger; replay/
deduplicación de booking real sigue pendiente. No afirmar calidad de coincidencia,
atribución publicitaria ni volumen suficiente por estas pruebas. Min 0/max 1 reduce recursos
ociosos pero no garantiza costo cero ni constituye un tope monetario.


### Ajuste final: GA4 automático conserva su consentimiento nativo

Los eventos automáticos Google no siempre llevan el custom analytics_consent. Gatear sólo
ese campo bloqueaba interacción/scroll pese a opt-in. Workspace servidor aislado 6,
`ED - native GA4 consent` keyPath `x-ga-gcs`; trigger 20 exige `^G1[01]1$`, conserva
host/client/no internal_qa/meta_only!=1. Meta y Web sin cambios.
Preview: interacción **real**, sin custom analytics_consent, nativo **G101**, GA4 Completada
 y Meta bloqueado. PageView real también GA4 Completada. Negativos G100/G110/missing y
meta_only=1: **Ninguna** etiqueta, verificados por mensaje (el título «Etiquetas activadas»
se muestra incluso cuando el contenido es Ninguna; nunca contarlo como disparo).
`native-ga4-consent-qa.json` conserva únicamente resultados saneados, sin datos personales.
GA4 realtime propiedad **486264460** confirmó page_view, session_start y user_engagement;
el conteo no se atribuye todo a QA ni representa conversiones comerciales.

WP 1.0.2 readback independiente: activo, routing enabled, send_page_view false, hashes
coincidentes. Móvil 390×844: control pasó de y808 (cubierto por CTA fijo) a y712 y click
reabrió el banner. Screenshot `wordpress-banner-mobile.png`; emulación restaurada.


**Estado final:** ajuste nativo publicado como **GTM Server live 5**; Web sigue **live 5**.
API readback coincide, test code ausente (`final-publication-receipt.json`). Revertir sólo este
ajuste a server 4 reintroduciría pérdida de eventos automáticos; rollback del rollout completo
usa server 3/web 4 + routing WP disabled y deployment Think anterior. Ambas opciones son
reversibles y requieren diagnóstico del fallo, no restauración automática ciega.
Documentación/contexto/espejos y tests validados; sin commit/push de fuentes ni release GH.


## Ajuste visual del operador — preferencias integradas

El operador aclaró que rechazaba el control permanente «Configurar cookies» en una franja
separada bajo el pie, no el banner temporal. Se sustituye por «Preferencias de cookies»,
control de texto en el grupo legal existente, conservando showBanner/categorías/consent gates.
WP plugin **1.0.3**, PHP SHA256
`f4c2daa96c6198dd2cbcbe78eb45bb3514e38e28428729423e38ffa39c75807c`, activo/routing enabled
releídos. Release scoped dos archivos; backup `/tmp/efeonce-consent-before-20261013-182056.tar`.
Bridge y GTM live 5/5 sin cambio. Desktop/móvil 390×844: control dentro de .site-footer,
franja .efeonce-cookie-settings ausente, click abre banner/preferencias; elección conservada
al cerrar QA. Reserva del CTA queda dentro del pie oscuro, no como franja blanca adicional.
Capturas `wordpress-preferences-integrated-mobile.png` y desktop en `.captures/...`.

Think BaseLayout monta el mismo control dentro del pie legal de cada página; home incorpora
Privacidad/preferencias dentro del hero de 100dvh, fondo preservado. analytics=false conserva
la exclusión de banner/bridge/triggers. Type-check/build PASS; deploy y QA final abajo.


Think ajuste visual READY/promovido y alias releído:
**dpl_AH8YdErwaGg6haELFGzdk3DuddRX**,
`https://efeonce-think-3f9ilqwcp-efeonce-7670142f.vercel.app`.
Rollback de este ajuste visual: deployment previo **dpl_9Tba5i1reknMviVNZF8FAJwbJYx4**
(la recuperación de CAPI/consentimiento se conserva). WP: restaurar PHP 1.0.2 del backup
scoped, sin cambiar routing/bridge/GTM. Ambos source checkouts siguen sin commit/push.

QA live Think desktop/mobile: home sin franja; hero/documento **844px** a viewport 390×844,
preferencias dentro del main/footer legal, click abre banner, categorías/elección conservadas.
Landing `/web-agentica/`: exactamente un control en el footer existente junto a Privacidad.
Capturas `think-preferences-integrated-desktop.png` y `think-preferences-integrated-mobile.png`.
QA live WordPress desktop/mobile: enlace en footer nativo, sin bloque externo, click abre
preferencias, elección conservada; capturas `wordpress-preferences-integrated-desktop.png`
y `wordpress-preferences-integrated-mobile.png`. Emulación restaurada. No formularios/reservas.


## Verificación solicitada: primera visita → publicidad → Meta Server

Prueba con navegador IAB separado del perfil Chrome personal. Ambos hosts se abrieron
antes de elegir consentimiento; cookie `__hs_cookie_cat_pref` ausente y banner visible
**automáticamente**, sin usar el control del pie. Estado inicial ads/analytics denied.
No se afirma cookie jar totalmente vacío: el inventario incluía otras cookies del sitio;
la condición verificada es ausencia de elección HubSpot, no ausencia absoluta de cookies.

Interacción real: Configurar → sólo Publicidad → Guardar configuración. En ambos,
ads granted / analytics denied, SDK PageView `gcs=G110`, meta_only=1, marker PV=1,
UUID generado por la implementación (no inyectado/manufacturado por el test).

| Sitio | Identidad del PageView real | Meta Test Events | URL recibida |
| --- | --- | --- | --- |
| efeoncepro.com | ae633e3f-34bb-4f6d-acf4-67047407b9e9 | Procesado · Servidor | https://efeoncepro.com/ |
| think.efeoncepro.com | 342c6bb5-d1cc-44f6-b7fc-fc6f6a5be7df | Procesado · Servidor | https://think.efeoncepro.com/ |

CDP capturó los UUID en `evnid`; mismo ID en Meta, URL expandida correspondiente a cada
host. Preview de cada PageView: Meta Completada; GA4 forwarding no activado. No uso de
footer para iniciar tracking, no submissions/bookings/contactos, sin emisor sintético directo.
La visita y la elección son reales del navegador de prueba; recepción aislada en Test Events.

Sólo para aislar recepción: Server workspace 7 temporal, copia exacta de live 5 con código
Test Events actual obtenido de Meta como único cambio. Ningún publish. Previews cerrados
y cookies temporales gtm_debug/gtm_preview/gtm_auth retiradas por origin; consentimiento
personal de WordPress/Think en Chrome sin cambios. Limpieza/readback en recibo independiente.

Capturas `.captures/meta-capi-diagnostic-2026-10-13/new-visitor-wordpress-banner.png`,
`new-visitor-think-banner.png` y `new-visitor-meta-server-receipt.png` (panel Meta recortado
para excluir datasets ajenos). `new-visitor-end-to-end-receipt.json` correlaciona estados,
UUID y destinos. Navegación directa IAB a /healthy devolvió ERR_BLOCKED_BY_CLIENT; la UI
Preview y las solicitudes SDK /g/collect funcionaron y Meta procesó ambas, por lo que ese
fallo de navegación no se interpretó como un fallo de entrega CAPI.


Cierre de esta verificación: workspace temporal 7 eliminado; API versions:live **server 5 /
web 5**, código de prueba ausente en live, ningún publish durante el test. Recibo
`new-visitor-cleanup-receipt.json`. Eliminación de workspace requiere scope OAuth
`tagmanager.delete.containers` incluso para un workspace, comprobado en la referencia oficial;
se usó en el token temporal del actor existente, sin ampliar IAM/RBAC ni credenciales persistentes.
Los primeros 403 eran scopes insuficientes, no fallos de tracking; no se repitió el envío Meta.
Cookies de diagnóstico eliminadas y únicamente cookies de elección HubSpot creadas por este
test retiradas del IAB; visitas de prueba cerradas. Consentimiento personal Chrome intacto.
Documentación/contexto verificados; fuentes y versiones publicadas no cambiaron.

# Anexo A — HubSpot + Microsoft Teams webinars: integración nativa, Graph API y opciones para Greenhouse

- **Fecha:** 2026-10-24 (todas las fuentes consultadas ese día)
- **Autor:** subagente de investigación (Claude)
- **Alcance:** investigación web de solo lectura sobre documentación oficial (HubSpot Knowledge Base, HubSpot Developers, Microsoft Learn y Microsoft 365 Dev Blog). No se tocaron cuentas de HubSpot ni de Microsoft.
- **Convención:** **[V]** = verificado en documentación oficial · **[C]** = fuente comunitaria o de terceros · **[I]** = inferencia nuestra, pendiente de prueba.

## Resumen

- **[V]** La app Microsoft Teams del Marketplace de HubSpot **sí soporta Teams webinars**, no solo reuniones. Sincroniza el webinar como *marketing event* (nombre, fecha, horario, organizador, estado, descripción y conteos de inscritos, asistentes y cancelaciones). En la línea de tiempo del contacto deja la fecha, la hora de entrada, la hora de salida y la **duración de asistencia**.
- **[V]** HubSpot puede **inscribir** contactos en el webinar de Teams de dos formas: con un formulario de HubSpot publicado en una página HubSpot (opción *Webinar form automation*) o con la acción de workflow **«Add Contact to Microsoft Teams webinar»**. El inscrito aparece en la pestaña *Attendance* de Teams. Para usar workflows hace falta un plan Professional o Enterprise de Marketing, Sales, Service o Data Hub.
- **[V]** Condiciones: la app debe estar instalada en modo **admin (full install)** y un administrador de M365 tiene que ejecutar una *application access policy* en PowerShell. El formulario de Teams solo puede exigir **nombre, apellido y email**; si exige cualquier otro campo, la inscripción falla. Con aprobación manual activada, la sincronización deja de ser automática.
- **[I]** Nada en la documentación indica que la *form automation* se dispare con un envío por la Forms API (que es nuestro caso). El camino documentado para nosotros es un **workflow disparado por el envío del formulario** que ejecuta la acción de Teams. Hay que probar que un envío por API inscriba al contacto en ese workflow.
- **[V]** Microsoft Graph tiene la API de webinars en **v1.0 (GA desde el 2024-08-30)**. Permite crear un webinar (solo con permiso **delegado** del organizador, nunca solo con la app), publicarlo, inscribir personas externas con permiso de aplicación (`VirtualEventRegistration-Anon.ReadWrite.All`), listar inscripciones con su estado (`registered`, `waitlisted`, `pendingApproval`…), cancelarlas y obtener el **enlace de acceso único** de cada inscrito.
- **[V]** Teams envía sus propios correos (confirmación, lista de espera, recordatorio, cancelación, grabación) según el ajuste `isAttendeeEmailNotificationEnabled`. Según el blog de Microsoft, un webinar creado por API arranca con esos correos **apagados**, para que la plataforma externa envíe los suyos.
- **[V]** Desde el 2026-04-01, la **lista de espera, la aprobación manual, los correos personalizados y la hora configurable del recordatorio** son funciones «avanzadas» de Teams. Las incluyen las licencias Enterprise (O365/M365 E1, E3, E5 y E7). Los planes Microsoft 365 **Business** (Basic, Standard y Premium) solo traen las funciones básicas.
- **Recomendación:** opción **B** (Greenhouse es dueño de la inscripción y llama a Graph y a la API de Marketing Events de HubSpot) si queremos conservar el formulario propio, la lista de espera de Greenhouse y nuestros correos. La opción **C** (híbrida, con un workflow de HubSpot que inscribe en Teams) es la vía rápida «a la manera HubSpot», pero deja la lista de espera y el enlace de acceso fuera del control de Greenhouse.

---

## 1. ¿La integración de HubSpot con Teams soporta webinars?

**Sí. [V]** La guía oficial [Use HubSpot and Microsoft Teams webinars](https://knowledge.hubspot.com/integrations/use-hubspot-and-microsoft-teams-webinars) documenta lo siguiente:

| Qué se sincroniza (Teams → HubSpot) | Dónde queda |
|---|---|
| Nombre, fecha, inicio y fin, organizador, estado y descripción del webinar | Registro *Marketing event* |
| Conteo de inscritos, asistentes y cancelaciones | *Marketing event* |
| Fecha del webinar, hora de entrada, hora de salida y duración de asistencia | Línea de tiempo del contacto |
| Inscritos que no existen en HubSpot | Se crean como contactos nuevos, solo con nombre, apellido y email |

Límites documentados **[V]**:

- Solo se sincronizan como inscritos quienes tienen el rol *attendee*. Los presentadores no cuentan, y el organizador tampoco si además participa.
- Si el webinar exige **aprobación manual**, «registrations and attendees will not automatically sync». Para traerlos hay que usar *Sync now*. Ese mismo botón sirve para webinars pasados.
- Se pueden excluir dominios, por ejemplo el interno `efeoncepro.com`, para no crear contactos internos.
- El formulario de inscripción se configura y se administra **en Teams**.
- La integración no recrea un contacto que se haya borrado.

**Requisitos [V]:**

- La app aparece como «All products and plans», pero los workflows exigen Marketing, Sales, Service o Data Hub **Professional o Enterprise**.
- Hace falta la app Teams en **admin install**, también llamado *Full Install* ([blog de Microsoft, 2024-06-17](https://devblogs.microsoft.com/microsoft365dev/microsoft-teams-webinar-integration-with-hubspot-marketing-automation)). La *limited install* solo cubre notificaciones y enlaces de reunión ([Connect HubSpot and Microsoft Teams](https://knowledge.hubspot.com/integrations/connect-hubspot-and-microsoft-teams)).
- Un administrador debe ejecutar `New-CsApplicationAccessPolicy` y `Grant-CsApplicationAccessPolicy` para los usuarios organizadores. Cada usuario admite **una sola** application access policy a la vez, algo a revisar si ya existe una para el bot de Teams de Greenhouse **[I]**.
- Se debe mapear cada usuario de HubSpot con su usuario de Teams.

**Tipo de webinar y licencia de Teams:**

- La guía de HubSpot no menciona licencia ni tipo de evento. Habla de «Microsoft Teams webinars» **[V]**.
- Por lo tanto, los *town halls* (eventos optimizados para gran audiencia) no aparecen documentados como soportados por la integración de HubSpot **[I]**.
- Microsoft unificó webinars y town halls en el **Events app**. Un evento de hasta 1.000 asistentes usa la política de webinar ([Plan for Teams events](https://learn.microsoft.com/en-us/microsoftteams/plan-events), actualizado el 2026-09-17) **[V]**.

## 2. Flujo de inscripción: ¿quién crea la inscripción y quién envía el enlace?

**Vías documentadas en HubSpot [V]:**

1. **Formulario de HubSpot en una página de HubSpot.** En las opciones del formulario, sección *Webinar form automation*, se elige el webinar. La inscripción también aparece en los detalles del webinar en Teams.
2. **Workflow** con la acción «Add Contact to Microsoft Teams webinar». El contacto queda inscrito y aparece en la pestaña *Attendance* de Teams.

En ambos casos la inscripción **se crea en Teams**. No hace falta que la persona pase por la página de inscripción de Teams **[V]**.

**¿Quién envía el enlace de acceso y los recordatorios?**

- La guía de HubSpot **no lo dice** y no menciona ninguna propiedad de contacto con el enlace de Teams **[V: ausencia]**.
- Lo razonable es que los envíe **Teams**: la inscripción queda en el sistema de registro de Teams y los correos de Teams (confirmación con enlace único, recordatorio y demás) siguen la configuración del evento **[I]**.
- Teams trae plantillas de correo para confirmación de inscripción, aprobación pendiente, lista de espera, rechazo, cancelación de la inscripción, cancelación del evento, cambio de fecha, recordatorio y grabación disponible ([Manage email communications for events](https://learn.microsoft.com/en-us/microsoftteams/manage-email-communications), 2026-10-06) **[V]**.
- Microsoft recomienda enviar esos correos desde un dominio propio verificado. Desde el 2026-02-01, las plantillas HTML personalizadas lo exigen **[V]**.
- **Cada inscrito tiene un enlace único**, tanto en eventos internos como públicos ([Plan for Teams events](https://learn.microsoft.com/en-us/microsoftteams/plan-events)) **[V]**.
- Riesgo **[I]**: a diferencia de Zoom, HubSpot no recibe el enlace personal de Teams. Si queremos que el correo de confirmación salga desde HubSpot o desde Greenhouse con ese enlace, la integración nativa no nos lo entrega.

## 3. Comparación: integración de HubSpot con Zoom

Según [Use HubSpot and Zoom webinars](https://knowledge.hubspot.com/integrations/use-hubspot-and-zoom-webinars) **[V]**:

- Se necesita la cuenta Zoom con el complemento *Zoom Webinars*. Los workflows exigen plan Professional o Enterprise.
- Sincroniza inscritos y asistentes como *marketing events* y en la línea de tiempo del contacto. Las grabaciones y transcripciones solo se sincronizan para los usuarios de Zoom elegidos.
- La acción de workflow es **«Add Contact to Zoom webinar»** y usa nombre, apellido y email.
- Mismo límite que Teams: si el registro de Zoom exige campos adicionales, la inscripción falla.
- No soporta Zoom Events.
- Con varias marcas, la acción solo funciona con la cuenta Zoom de la marca principal. El anfitrión no puede inscribirse a sí mismo.
- Desde el 2025-01-08, las propiedades de contacto de Zoom no se pueden usar para segmentar; hay que filtrar por *marketing event*.

Lo que aporta la comunidad **[C]**:

- Existe una propiedad «Zoom Webinar Join Link» que trae el **enlace personal** a HubSpot. Con ella HubSpot puede enviar su propio correo de confirmación.
- Esa propiedad **se sobrescribe** con cada webinar nuevo. Por eso se suele copiar a una propiedad por webinar ([hilo 1](https://community.hubspot.com/t5/HubSpot-Ideas/Zoom-HubSpot-integration-needs-to-allow-multiple-webinar/idc-p/261353/highlight/true), [hilo 2](https://community.hubspot.com/t5/Marketing-Integrations/Last-registered-Zoom-webinar-link-HS-link-vs-personal-link/m-p/403224)).
- Diferencia práctica: con Zoom, HubSpot sí puede ser quien envía los correos. Con Teams, en la práctica los envía Teams **[I]**.

## 4. Microsoft Graph: ¿Greenhouse puede crear el webinar e inscribir por API?

**Sí, en v1.0 y con disponibilidad general [V].** Microsoft lo anunció el 2024-08-30 en [Graph APIs for Teams webinar registration GA](https://devblogs.microsoft.com/microsoft365dev/microsoft-graph-apis-for-teams-webinar-registration-now-generally-available). Ese anuncio describe justamente el escenario de un **portal de inscripción de terceros**.

| Operación | Endpoint v1.0 | Permiso |
|---|---|---|
| Crear webinar (queda en `draft`) | `POST /solutions/virtualEvents/webinars` ([doc](https://learn.microsoft.com/en-us/graph/api/virtualeventsroot-post-webinars?view=graph-rest-1.0)) | **Solo delegado** `VirtualEvent.ReadWrite`. Con permiso de aplicación «Not supported». |
| Publicar, actualizar o cancelar | `publish`, `update`, `cancel` ([recurso](https://learn.microsoft.com/en-us/graph/api/resources/virtualeventwebinar?view=graph-rest-1.0)) | Solo organizador o co-organizador. La «custom application» no puede crear ni publicar. |
| Inscribir a una persona externa | `POST /webinars/{id}/registrations` ([doc](https://learn.microsoft.com/en-us/graph/api/virtualeventwebinar-post-registrations?view=graph-rest-1.0)) | Aplicación: `VirtualEventRegistration-Anon.ReadWrite.All`, o `…Anon.ReadWrite.Chat` con consentimiento específico del recurso (RSC). Responde **204 sin cuerpo**. |
| Inscribir a un usuario de Entra | Mismo endpoint | Delegado `VirtualEvent.ReadWrite`. Responde 201 con el registro. |
| Listar, obtener o cancelar una inscripción | `registrations`, `cancel` ([recurso](https://learn.microsoft.com/en-us/graph/api/resources/virtualeventregistration?view=graph-rest-1.0)) | Estados: `registered`, `canceled`, `waitlisted`, `pendingApproval`, `rejectedByOrganizer`. |
| Enlace único del inscrito | `GET /webinars/{id}/registrations/{regId}/sessions`, que devuelve `joinWebUrl` ([doc](https://learn.microsoft.com/en-us/graph/api/virtualeventregistration-list-sessions?view=graph-rest-1.0)) | Aplicación `VirtualEvent.Read.Chat` (RSC). No admite permiso delegado. |
| Configuración de inscripción | `registrationConfiguration`, solo `GET` ([doc](https://learn.microsoft.com/en-us/graph/api/resources/virtualeventwebinarregistrationconfiguration?view=graph-rest-1.0)) | Expone `capacity`, `isWaitlistEnabled`, `isManualApprovalEnabled` y `registrationWebUrl`. |
| Enlazar con un evento externo | `setExternalEventInformation` (`externalEventId`) | Sirve para enlazarlo con el id del evento en Greenhouse o en HubSpot. |

Implicancias **[I]**:

- Para crear webinars, Greenhouse necesita un **token delegado de un usuario organizador**. Eso significa guardar un refresh token gobernado de una cuenta de servicio con licencia, o crear el webinar a mano en Teams y que Greenhouse solo inscriba.
- Como la inscripción con permiso de aplicación devuelve 204 sin id, para obtener el `joinWebUrl` hay que **listar las inscripciones y buscar por email**, enviando nuestro id en `externalRegistrationInformation.registrationId`, y después pedir las sesiones de esa inscripción.
- Los permisos RSC (`*.Chat`) requieren consentimiento por recurso. Hay que validar con el administrador de Entra cuál de los dos modelos se aprueba: `.All` para todo el tenant o RSC.
- La v1.0 de `registrationConfiguration` solo permite leer. Capacidad, lista de espera y aprobación se definen en el webinar desde Teams **[V]**.
- Correos de Microsoft: el ajuste `settings.isAttendeeEmailNotificationEnabled` «indicates whether virtual event attendees receive email notifications» ([doc](https://learn.microsoft.com/en-us/graph/api/resources/virtualeventsettings?view=graph-rest-1.0)) **[V]**. Según el blog del GA, al crear un webinar por API los correos a asistentes **quedan apagados**, y el enlace se obtiene por la API para enviarlo nosotros **[V]**. Si se activa, Teams envía su confirmación con el enlace único **[I: comportamiento por defecto de Teams]**.

**Licencias de Teams [V]** ([Teams events licensing overview](https://learn.microsoft.com/en-us/microsoftteams/events-licensing), 2026-09-28):

- **Funciones básicas**, incluidas en Microsoft 365 Business Basic, Standard y Premium y en Teams Essentials:
  - eventos de hasta 1.000 asistentes con interacción completa;
  - inscripción básica con formulario personalizable;
  - informes de asistencia;
  - ver solo, sin interacción, hasta 10.000.
- **Funciones avanzadas**, incluidas en O365/M365 E1, E3, E5 y E7 y en el Teams Premium heredado:
  - correos personalizados;
  - hora configurable del recordatorio (por defecto se envía una hora antes);
  - lista de espera;
  - aprobación manual;
  - ventana de inscripción;
  - RTMP-In;
  - eventos de hasta 3.000 asistentes con interacción.
- **[I]** Hay que confirmar qué plan tiene el tenant de Efeonce. Si es Business, en Teams **no habrá lista de espera ni aprobación manual**, y la capacidad y la lista de espera tienen que seguir viviendo en Greenhouse.

## 5. Nuestra restricción: formulario externo que envía a HubSpot por API

- Greenhouse envía al endpoint autenticado `POST https://api.hsforms.com/submissions/v3/integration/secure/submit/{portalId}/{formGuid}`. HubSpot lo marca como *Forms API v3 Legacy* ([doc](https://developers.hubspot.com/docs/api-reference/legacy/marketing/forms/v3-legacy/submit-data-authenticated)) **[V]**. La documentación **no aclara** si un envío por API ejecuta las automatizaciones del formulario o los workflows **[V: ausencia]**.
- La *Webinar form automation* está documentada para un formulario «on a HubSpot page» **[V]**. No debemos asumir que se dispare con un envío por API **[I]**.
- **Camino documentado para nosotros:** un workflow de contacto cuyo disparador es «envió el formulario X» y cuya acción es «Add Contact to Microsoft Teams webinar» (requiere plan Pro o Enterprise) **[V la acción · I el disparador]**.
  - En la práctica, los envíos por Forms API se registran como envíos del formulario y suelen inscribir en workflows **[C/I]**.
  - **Prueba obligatoria:** hacer un envío de prueba al formulario del portal y confirmar que el contacto entra al workflow y aparece en *Attendance* de Teams.
- La acción de workflow apunta a **un webinar concreto**. Hacen falta un workflow (o una rama) por evento, o un formulario por evento **[V/I]**.
- El formulario de Teams no puede exigir campos extra. Cualquier pregunta adicional (empresa, cargo) debe ser **opcional** en Teams y viajar a HubSpot por el formulario **[V]**.

## 6. Lista de espera y capacidad

| Lado | Soporte |
|---|---|
| Teams | **[V]** Capacidad configurable. Lista de espera automática al llenarse y aprobación manual, ambas **avanzadas** (licencia Enterprise). El estado `waitlisted` es visible por Graph. |
| HubSpot (integración Teams) | **[V]** No documenta lista de espera. Con aprobación manual, la sincronización deja de ser automática. **[I]** Una persona en lista de espera de Teams no tiene un estado propio en HubSpot. |
| HubSpot Marketing Events API | **[C/V]** Estados de participación `register`, `attend` y `cancel`, más `joinedAt` y `leftAt` (endpoint `/marketing/v3/marketing-events/attendance/{externalEventId}/{state}/create` y su variante `email-create`) ([doc](https://developers.hubspot.com/docs/api-reference/legacy/marketing/marketing-events/attendance/set-attendance-email-externalId)). No hay estado de lista de espera. |
| Greenhouse (hoy) | Ya opera capacidad y lista de espera, además de correos de confirmación, espera y recordatorio con `.ics`. |

## 7. Opciones de arquitectura para Efeonce

### Opción A — HubSpot nativo es dueño del evento y de la inscripción

El webinar se crea en Teams. La inscripción se hace con un **formulario de HubSpot en una landing de HubSpot** (form automation), o se mantiene el formulario de Greenhouse con un workflow que inscribe. Teams envía los correos y el enlace, y HubSpot sincroniza la asistencia.

- **A favor:** cero código de Graph. Es el camino que HubSpot documenta. La asistencia y su duración quedan en el *marketing event* sin desarrollo.
- **En contra:**
  - Abandona el formulario en línea del blog de WordPress, o lo convierte en un formulario embebido de HubSpot.
  - La lista de espera queda sujeta a la licencia de Teams.
  - Solo nombre, apellido y email pueden ser obligatorios.
  - Los correos y la marca dependen de Teams (las plantillas personalizadas requieren licencia avanzada y dominio verificado).
- **Greenhouse dejaría de:** capturar la inscripción del evento y enviar confirmación, recordatorio, enlace y `.ics`.
- **Riesgos:** duplicar correos si alguna pieza sigue enviando. Perder la telemetría propia. Que la sincronización falle si se activa la aprobación manual.

### Opción B — Greenhouse es dueño de la inscripción y orquesta Graph y HubSpot (recomendada a mediano plazo)

Greenhouse captura la inscripción y aplica capacidad y lista de espera propias. Cuando la persona queda confirmada, llama a `POST …/webinars/{id}/registrations` con permiso de aplicación. Después obtiene el `joinWebUrl` único (listar inscripciones y luego sesiones) y lo incluye en **su propio** correo con `.ics`, dejando `isAttendeeEmailNotificationEnabled=false`. A HubSpot le informa el estado `register`, `cancel` o `attend` por la Marketing Events API o por el formulario actual. La asistencia la obtiene de los informes de asistencia de Graph y la sube con `joinedAt` y `leftAt`.

- **A favor:**
  - Conserva el formulario en línea, la lista de espera de Greenhouse (que no depende de la licencia de Teams) y la voz de marca de los correos.
  - El enlace es el oficial y único de Teams.
  - Cumple Full API Parity: un solo command de Greenhouse sirve a todos los consumidores.
- **En contra:**
  - Más desarrollo: app de Entra con consentimiento del administrador, permisos `VirtualEventRegistration-Anon.ReadWrite.All` (o RSC) y `VirtualEvent.Read.*`, y crear el webinar con token **delegado** o a mano.
  - Hay que reconciliar estados entre Teams y Greenhouse.
- **Greenhouse dejaría de:** generar su propio enlace privado de acceso. Pasaría a usar el `joinWebUrl` de Teams.
- **Riesgos:**
  - El 204 sin id obliga a correlacionar por email o por `externalRegistrationInformation`.
  - Graph no expone un webhook de inscripción en esta API: hay que consultar periódicamente para detectar cancelaciones hechas desde Teams **[I]**.
  - Hay que proteger el permiso `.All`, que alcanza a todo el tenant.

### Opción C — Híbrida: Greenhouse captura y un workflow de HubSpot inscribe en Teams

Se mantiene el flujo actual (Greenhouse → Forms API de HubSpot). Un workflow con disparador «envió el formulario del evento» ejecuta «Add Contact to Microsoft Teams webinar». La integración nativa sincroniza la asistencia de vuelta al *marketing event*.

- **A favor:** poco código. Es la forma «HubSpot» y reutiliza el reenvío que ya existe. La asistencia y su duración quedan en HubSpot sin desarrollo.
- **En contra:**
  - **Greenhouse no conoce el enlace único**, porque la integración no lo devuelve. O Teams envía la confirmación con el enlace (correos de Teams **activados**), o Greenhouse envía un correo sin enlace propio.
  - La lista de espera de Greenhouse tiene que **filtrar antes de reenviar** a HubSpot; de lo contrario, quien está en espera quedaría inscrito en Teams.
  - Se necesita un workflow por webinar.
  - Requiere plan Pro o Enterprise.
  - Hay que verificar que el envío por API dispare el workflow.
- **Greenhouse dejaría de:** enviar el enlace privado y probablemente el recordatorio, que pasarían a Teams. Seguiría enviando el correo de lista de espera.
- **Riesgos:** doble correo de confirmación (Greenhouse y Teams), que la acción de workflow falle en silencio si el webinar exige campos extra, y una sola *application access policy* por usuario.

### Recomendación

1. **Corto plazo:** opción **C** como piloto con un webinar, después de confirmar tres cosas:
   - el plan de HubSpot (¿Pro o Enterprise?);
   - el plan de M365 (¿Business o Enterprise?);
   - que un envío por la Forms API dispara el workflow.

   Greenhouse reenvía a HubSpot solo a quienes quedan **confirmados**, deja la confirmación con enlace en manos de Teams y apaga el enlace propio para ese evento.
2. **Mediano plazo:** opción **B** si se quiere una sola fuente de verdad y correos con la marca Efeonce. Antes, definir con el administrador de Entra el modelo de permisos y cómo se crea el webinar (delegado o a mano).
3. **No recomendada:** opción **A**, porque rompe el formulario en línea del blog y la lista de espera propia.

## Fuentes (consultadas el 2026-10-24)

- HubSpot KB: [Use HubSpot and Microsoft Teams webinars](https://knowledge.hubspot.com/integrations/use-hubspot-and-microsoft-teams-webinars) · [Connect HubSpot and Microsoft Teams](https://knowledge.hubspot.com/integrations/connect-hubspot-and-microsoft-teams) · [Use HubSpot and Zoom webinars](https://knowledge.hubspot.com/integrations/use-hubspot-and-zoom-webinars)
- HubSpot Developers: [Forms v3 legacy, submit authenticated](https://developers.hubspot.com/docs/api-reference/legacy/marketing/forms/v3-legacy/submit-data-authenticated) · [Marketing Events attendance (email-create)](https://developers.hubspot.com/docs/api-reference/legacy/marketing/marketing-events/attendance/set-attendance-email-externalId)
- Microsoft 365 Dev Blog: [Teams webinar integration with HubSpot (2024-06-17)](https://devblogs.microsoft.com/microsoft365dev/microsoft-teams-webinar-integration-with-hubspot-marketing-automation) · [Graph webinar registration APIs GA (2024-08-30)](https://devblogs.microsoft.com/microsoft365dev/microsoft-graph-apis-for-teams-webinar-registration-now-generally-available)
- Microsoft Learn (Graph v1.0): [Create webinar](https://learn.microsoft.com/en-us/graph/api/virtualeventsroot-post-webinars?view=graph-rest-1.0) · [virtualEventWebinar](https://learn.microsoft.com/en-us/graph/api/resources/virtualeventwebinar?view=graph-rest-1.0) · [Create registration](https://learn.microsoft.com/en-us/graph/api/virtualeventwebinar-post-registrations?view=graph-rest-1.0) · [virtualEventRegistration](https://learn.microsoft.com/en-us/graph/api/resources/virtualeventregistration?view=graph-rest-1.0) · [List sessions (joinWebUrl)](https://learn.microsoft.com/en-us/graph/api/virtualeventregistration-list-sessions?view=graph-rest-1.0) · [Registration configuration](https://learn.microsoft.com/en-us/graph/api/resources/virtualeventwebinarregistrationconfiguration?view=graph-rest-1.0) · [virtualEventSettings](https://learn.microsoft.com/en-us/graph/api/resources/virtualeventsettings?view=graph-rest-1.0)
- Microsoft Learn (Teams admin): [Plan for Teams events](https://learn.microsoft.com/en-us/microsoftteams/plan-events) · [Teams events licensing overview](https://learn.microsoft.com/en-us/microsoftteams/events-licensing) · [Manage email communications for events](https://learn.microsoft.com/en-us/microsoftteams/manage-email-communications)
- Comunidad **[C]**: [Zoom join link overwritten](https://community.hubspot.com/t5/HubSpot-Ideas/Zoom-HubSpot-integration-needs-to-allow-multiple-webinar/idc-p/261353/highlight/true) · [HS link vs personal link](https://community.hubspot.com/t5/Marketing-Integrations/Last-registered-Zoom-webinar-link-HS-link-vs-personal-link/m-p/403224)

# Anexo C — Diagnóstico: los webinars de Teams no llegan a HubSpot

> **Fecha:** 2026-10-24 · **Autor:** Claude (sesión «Reservas de eventos, HubSpot y Teams»), con el operador ·
> **Tipo:** diagnóstico (sin cambios de código) · Marcas: **[V]** = verificado en el portal, el tenant o la
> documentación oficial; **[I]** = inferido.

## Decisiones del operador (2026-10-24)

- Plataforma: **Teams**, como **seminario web** (webinar) del Events app. Tenant Microsoft 365 **Business** (funciones
  básicas: sin lista de espera ni aprobación en Teams; el cupo y la espera siguen en Greenhouse).
- HubSpot: el operador reporta Marketing Hub **Starter/Free**; la UI de Landing pages ofrece «Plataforma de Clientes
  Starter», o sea, el plan de contenido es el gratuito [V]. **Corrección:** el portal sí tiene workflows publicados (ver tabla) [V].
- Camino preferido por el operador: **el formulario de HubSpot conectado al webinar inscribe en Teams**, y la app de
  Teams en HubSpot crea el Evento de marketing con inscritos y asistencia. Greenhouse no reemplaza ese camino.
- La espera no se registra en HubSpot; una persona entra sólo cuando Greenhouse le confirma cupo.
- **Sin release por ahora** (cada release toma ~3 h): la corrección de correos (`2a971d768`) y la de la píldora
  (`a5b028461`) esperan en `develop` local al próximo release que decida el operador.

## Qué dice la documentación

- La inscripción desde HubSpot a un webinar de Teams es por **un formulario puesto en una página de HubSpot**: el ajuste
  «Form automation → Webinar form» vive en el **módulo de formulario de la página**, no en el formulario; o por el
  workflow «Add Contact to Microsoft Teams webinar» (Pro/Enterprise) [V,
  [KB Teams webinars](https://knowledge.hubspot.com/integrations/use-hubspot-and-microsoft-teams-webinars), 2026-07-30].
  Nada documenta que un envío por la Forms API (lo que hace Greenhouse) dispare la inscripción; la Forms API sólo
  tiene campo de webinar para GoToWebinar [V].
- El objeto Eventos de marketing y la sincronización con Teams están en **todos los planes**; un evento sólo aparece en el
  índice **con al menos un inscrito** [V, [KB Usar eventos de marketing](https://knowledge.hubspot.com/es/integrations/use-marketing-events), 2026-08-26].
- Microsoft Graph permite inscribir externos con `VirtualEventRegistration-Anon.ReadWrite.All` (permiso de aplicación) y
  exige una **application access policy asignada a un usuario** para leer webinars con permisos de aplicación [V,
  [GET webinar](https://learn.microsoft.com/en-us/graph/api/virtualeventwebinar-get?view=graph-rest-1.0)].
- El acceso a la API de transcripciones de Teams aplica a **reuniones, no a eventos**: no explica la falla de webinars [V,
  [transcript API access](https://learn.microsoft.com/en-us/microsoftteams/meeting-transcript-api-access)].

## Qué se verificó (2026-10-24)

| Pieza | Estado | Cómo |
|---|---|---|
| App «Microsoft Teams (Nivel de administrador)» en HubSpot | Conectada, instalada 2026-08-06, cuenta jreyes@efeoncepro.com enlazada | UI de HubSpot [V] |
| Sincronización global de webinars | ACTIVADA | UI, Configuración global [V] |
| «Sincronizar webinars programados por defecto» (usuario) | Marcada; se apagó y encendió con OK del operador | UI, Mi configuración [V] |
| Webinars listados en HubSpot | Solo cuatro de 2024, ninguno sincronizado nunca | UI [V] |
| Webinars nuevos «La IA no conoce tu negocio» (24-oct) y «La IA y la busqueda» (26-oct) | **No aparecen**, ni minutos después de publicarse | UI [V] |
| Eventos de marketing en el portal 48713323 | **0**, aun con el operador inscrito en «La IA y la busqueda» | Índice 0-54 [V] |
| Permisos de la app HubSpot (`0493df14-0cd5-4c89-b413-e0b9b90bbb17`) en Entra | `VirtualEvent.Read.All`, `OnlineMeetingArtifact.Read.All`, `VirtualEventRegistration-Anon.ReadWrite.All` y 13 más, con consentimiento de administrador | `az` appRoleAssignments [V] |
| Application access policy de Teams | `Tag:MY-APP-POLICY` y `Global` con el AppId de HubSpot; **jreyes sin política propia** (hereda Global) | `Get-CsApplicationAccessPolicy` / `Get-CsOnlineUser` [V] |
| Sign-ins de la app HubSpot | Cada hora, sin error (última 16:02Z) | `auditLogs/signIns` [V] |
| Workflows en el portal | Disponibles (hay workflows de contacto publicados); la app de Teams ofrece «Agregar contacto al webinario de Microsoft Teams» | UI [V] |
| Esa acción, en un borrador creado y borrado para la prueba | «No se encontraron webinars. Inténtalo en 5 minutos»: HubSpot no lee **ningún** webinar de Teams | UI [V] |
| El token de Greenhouse lee Eventos de marketing | No: 403 `MISSING_SCOPES` (`crm.objects.marketing_events.read`) | API [V] |

## Hipótesis abiertas

1. ~~La política está sólo como `Global` y la API de webinars la exige asignada al organizador.~~ **Descartada**: con
   autorización explícita del operador se asignó `MY-APP-POLICY` a jreyes@efeoncepro.com el 2026-10-24 a las 14:09 CLT
   (`Grant-CsApplicationAccessPolicy`; reversible con `-PolicyName $null`). A los 30 min la lista y la acción del
   workflow seguían sin webinars [V]. La asignación se deja puesta: es la que pide la guía de HubSpot.
2. **Falla del lado de HubSpot** en el descubrimiento de webinars nuevos (suscripciones a cambios de Graph vencidas) [I].
   «Editar cuenta conectada» sólo reasigna la cuenta de Teams del usuario; no reautoriza. Sin opción de reautorizar
   salvo desinstalar. → Caso al soporte de HubSpot (texto abajo).
3. Si la sincronización vuelve, queda por probar la pregunta de fondo: **¿un envío de Greenhouse por la Forms API al
   formulario conectado inscribe en Teams?** [no documentado].

## Texto para el soporte de HubSpot (enviado 2026-10-24 ~14:45 CLT por correo desde el Centro de ayuda, con la política por usuario y el resultado del workflow agregados; respuesta prometida en un día laborable)

> **Asunto:** Teams webinars no aparecen ni se sincronizan como eventos de marketing (portal 48713323)
>
> Hola. Tenemos la app «Microsoft Teams (Nivel de administrador)» conectada desde el 6 de agosto de 2026 (cuenta
> jreyes@efeoncepro.com). La sincronización global de webinars está activada y, en la configuración del usuario,
> «Sincronizar datos de webinarios programados como opción predeterminada» está marcada (la apagamos y encendimos hoy).
>
> El 24 de octubre de 2026 creamos y publicamos dos seminarios web en la app Eventos de Teams, organizados por
> jreyes@efeoncepro.com: «La IA no conoce tu negocio» (24-oct, 15:00 CLT) y «La IA y la busqueda» (26-oct, 14:00 CLT).
> Ninguno aparece en «Gestionar webinarios individuales», donde sólo se listan cuatro webinars de 2024 que tampoco se
> sincronizaron nunca. En Eventos de marketing hay 0 eventos, aunque ya hay una persona inscrita en «La IA y la busqueda».
>
> Verificado del lado de Microsoft: la aplicación empresarial HubSpot (AppId 0493df14-0cd5-4c89-b413-e0b9b90bbb17) tiene
> consentimiento de administrador para VirtualEvent.Read.All, OnlineMeetingArtifact.Read.All y
> VirtualEventRegistration-Anon.ReadWrite.All, entre otros; existe una application access policy (MY-APP-POLICY) con ese
> AppId, asignada como Global; y los registros de inicio de sesión muestran que la app se autentica cada hora sin error.
>
> ¿Pueden revisar por qué la integración no descubre los webinars nuevos ni sincroniza inscritos? ¿Es necesario asignar
> la política por usuario en lugar de Global, o reautorizar la app sin desinstalarla?

## Respuesta del soporte (ticket #50018204746, 2026-10-24)

- El asistente de IA de HubSpot repitió los requisitos documentados y pidió dos pruebas antes de derivar: que un webinar
  de prueba nuevo aparezca en «Mis ajustes» y que «Sincronizar ahora» en un webinar antiguo cree un evento. Dijo que la
  acción del workflow solo muestra webinars que el conector ya conoce y que, si ambas pruebas fallan, «encaja con un
  posible problema del propio conector».
- Resultado [V]: «La IA y la busqueda» (con un inscrito) no aparece; «Sincronizar ahora» en «WEBINAR | De vendedores
  comunes…» no sincroniza y Eventos de marketing sigue en 0. La casilla «Sincronizar» de los webinars de 2024 está
  deshabilitada.
- El ticket se derivó a un agente humano (respuesta prometida en un día laborable) y se dejó en el ticket el resultado
  de ambas pruebas.

## Siguiente paso

- Esperar al agente humano del soporte de HubSpot (ticket #50018204746 derivado; chat y teléfono cerrados el lunes 26-oct). Reconectar la
  app sólo si el soporte lo recomienda, en horario tranquilo y con captura previa de toda su configuración.
- Cuando HubSpot liste el webinar: marcar Sincronizar, probar el envío de Greenhouse al formulario conectado y recién ahí
  crear la task `backend-data` de la integración.

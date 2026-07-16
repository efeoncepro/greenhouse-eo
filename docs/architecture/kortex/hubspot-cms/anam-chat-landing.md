# ANAM Chat Landing - CMS React Project

> **Fecha:** 2026-07-16
> **Portal HubSpot:** ANAM / `19893546`
> **URL publica:** `https://anam-2.hubspotpagebuilder.com/agente-anam`
> **Proyecto HubSpot:** `kortex-cms-react`
> **Project ID:** `103589049`
> **Theme component UID:** `kortex-anam-cms-react-theme`
> **Plataforma:** HubSpot Developer Projects / CMS React `2026.03`
> **Estado:** live en build `#22`

## Resumen

Se creo y publico una landing page de contacto para ANAM orientada a contener e incentivar el uso del chat agent de HubSpot.

La pagina no vende "HubSpot" ni explica la tecnologia al usuario final. Su rol es:

- presentar a ANAM como canal oficial de atencion;
- orientar a la persona por tipo de necesidad;
- abrir el chat con contexto de intencion;
- contener el widget de chat dentro de una experiencia visual institucional.

## Ubicacion del proyecto CMS

Workspace local usado para el Developer Project:

```text
/Users/jreye/Documents/dev/kortex/hubspot-cms-react-project
```

Archivos principales del proyecto:

```text
src/theme/kortex-anam-theme/components/modules/KortexLandingHero/index.jsx
src/theme/kortex-anam-theme/styles/kortex-landing-hero.module.css
src/theme/kortex-anam-theme/templates/layouts/base.hubl.html
src/theme/kortex-anam-theme/assets/anam-virtual-executive.png
```

Nota operativa: ese proyecto vive fuera del repo `greenhouse-eo`; esta documentacion es el source of truth operativo dentro de Greenhouse para que otros agentes sepan que existe, como se sube y que estado tiene.

## Acceso CLI usado

El perfil default de HubSpot CLI se mantuvo apuntando a Kortex/Efeonce:

```text
Default Account: kortex-dev [standard] (48713323)
```

ANAM se agrego como cuenta adicional, sin reemplazar el default:

```text
anam-19893546 [standard] (19893546)
Auth Type: personalaccesskey
```

Comandos seguros usados para validar/subir:

```bash
hs project validate --profile anam
hs project upload --profile anam
hs project info --account 19893546 --json
```

No cambiar el default global/local a ANAM salvo pedido explicito. Para operar ANAM, usar `--profile anam` o `--account 19893546`.

## Evolucion de builds

Builds relevantes:

```text
#17  Paleta navy/teal + logo ANAM mas presente.
#18  UX writing completo, eliminando copy interna como "widget de HubSpot".
#19  Microajuste final del logo/header. Live publico verificado.
#20  Ajuste solicitado por Maria Paz Haeger: titulo "Agente Virtual ANAM" y tres categorias operativas.
#21  Compactacion mobile de las tarjetas de categoria para evitar solapamiento con el globo fijo de chat.
#22  Routing por query param `anam_intent` + `widget.refresh({ openToNewThread: true })`; logo reducido/subido.
```

Estado final verificado:

```json
{
  "projectName": "kortex-cms-react",
  "platformVersion": "2026.03",
  "projectId": 103589049,
  "deployedBuildId": 22,
  "autoDeployEnabled": true,
  "components": [
    {
      "uid": "kortex-anam-cms-react-theme",
      "type": "THEME"
    }
  ]
}
```

La URL publica fue verificada sirviendo assets:

```text
kortex-cms-react/22
```

## Direccion de producto y UX

Decision de experiencia:

- primera pantalla funcional, no landing de marketing;
- copy orientada a tarea y confianza;
- CTA principal unico: `Iniciar chat`;
- categorias de entrada segun operacion ANAM:
  - `Cotizar`;
  - `Seguimiento del Servicio`;
  - `Requerimientos de Calidad`;
- evitar lenguaje de implementacion como `widget`, `HubSpot`, `boton flotante` o explicaciones tecnicas.

Copy final clave:

```text
Canal seguro · Respuesta asistida
Atencion digital
Agente Virtual ANAM
Cuéntanos qué necesitas y te orientamos para cotizar, hacer seguimiento de un servicio o enviar un requerimiento de calidad.
Elige una categoría para iniciar con el contexto correcto.
Te conectamos con el canal de atención
¿Qué necesitas resolver?
Canal listo para atender
Atención guiada
Datos protegidos
Inicia una conversación
```

El texto visible no debe decir:

```text
Abre el widget de HubSpot
```

La implementacion puede seguir usando `HubSpotConversations` en JS interno; esa palabra no debe filtrarse a la interfaz.

## Direccion visual

Sistema visual final:

- ANAM navy como color primario de titulos y acciones principales;
- teal como color secundario/acento para disponibilidad, estados, iconos y hover;
- Poppins como tipografia de la landing;
- footer simple para cerrar el espacio inferior;
- header con logo ANAM visible y jerarquia institucional;
- logo reducido/subido desde build #22 para no montarse sobre la linea inferior del header;
- panel derecho con ejecutivo virtual 3D y estado de canal.

Asset generado:

```text
src/theme/kortex-anam-theme/assets/anam-virtual-executive.png
```

Origen local de la generacion nativa Codex:

```text
/Users/jreye/.codex/generated_images/019f24da-f870-7691-aa14-cc04be3976ab/ig_0fb5a992d119b18a016a46f7c2c8ec8191befaec6ea28ffa59.png
```

No regenerar el avatar salvo pedido explicito; si se regenera, conservar torso superior, expresion amable y logo ANAM visible en camisa.

## Interaccion del chat

Los botones usan `data-chat-intent` para guardar la intencion seleccionada y `data-chat-intent-key` para enrutar el chatflow por URL:

```text
general -> sin query param
cotizar -> ?anam_intent=cotizar
seguimiento_servicio -> ?anam_intent=seguimiento_servicio
requerimiento_calidad -> ?anam_intent=requerimiento_calidad
```

El layout base define `window.anamOpenHubSpotChat(intent, intentKey)` y usa el patron oficial de HubSpot Conversations SDK:

```text
window.history.replaceState(... ?anam_intent=<intentKey>)
window.HubSpotConversations.widget.refresh({ openToNewThread: true })
window.HubSpotConversations.widget.open()
window.HubSpotConversations.widget.load({ widgetOpen: true })
window.hsConversationsOnReady
```

Nota importante:

- El composer no se puede prellenar de forma confiable en esta configuracion. El widget expone internamente `setInputText(text, sendMessage)`, pero el iframe actual lo descarta cuando no es `portal53` o un `closing agent system chatflow`.
- La ruta soportada es configurar target rules/branches en HubSpot Chatflows para leer `anam_intent`.
- Pendiente operativo fuera del Developer Project: configurar en HubSpot los chatflows/branches:
  - `anam_intent=cotizar`
  - `anam_intent=seguimiento_servicio`
  - `anam_intent=requerimiento_calidad`

Mensajes accesibles finales:

```text
Chat iniciado. Tema seleccionado: <intent>
Estamos preparando la conversación.
El chat esta cargando. Si no se abre en unos segundos, usa el acceso de chat en la esquina inferior derecha.
```

Nota: el ultimo mensaje no usa tilde en `esta` porque vive en un bloque Hubl/JS que se mantuvo ASCII para evitar friccion de encoding.

## Verificacion ejecutada

Comandos y checks ejecutados durante el cierre:

```bash
hs project validate --profile anam
hs project upload --profile anam
hs project info --account 19893546 --json
curl -s -L https://anam-2.hubspotpagebuilder.com/agente-anam | rg -o "kortex-cms-react/[0-9]+" | sort -u
```

Verificacion browser con Playwright desde el runtime local de Codex:

```text
desktop:
  h1: Agente Virtual ANAM
  hasQuote: true
  hasFollowUp: true
  hasQuality: true
  hasOldTitle: false
  scrollWidth: 1440
  clientWidth: 1440
mobile:
  h1: Agente Virtual ANAM
  hasQuote: true
  hasFollowUp: true
  hasQuality: true
  hasOldTitle: false
  scrollWidth: 390
  clientWidth: 390
intent routing:
  cotizar:
    urlParam: cotizar
    refresh: { openToNewThread: true }
  seguimiento_servicio:
    urlParam: seguimiento_servicio
    refresh: { openToNewThread: true }
  requerimiento_calidad:
    urlParam: requerimiento_calidad
    refresh: { openToNewThread: true }
  general:
    urlParam: null
    refreshCalls: []
logo:
  desktop:
    logoBottom: 116
    headerBottom: 125
  mobile:
    logoBottom: 90
    headerBottom: 135
```

Captura visual temporal revisada:

```text
/tmp/anam-build21-desktop.png
/tmp/anam-build21-mobile.png
/tmp/anam-build22-desktop.png
/tmp/anam-build22-mobile.png
```

Las capturas confirmaron la copy solicitada, las tres categorias y ausencia de overflow horizontal. En mobile, el globo fijo de HubSpot queda fuera de las tarjetas de categoria; puede superponerse al bloque visual del agente por ser un iframe fijo externo.

## Publish API y scopes

Se intento empujar el draft/live por API:

```text
POST /cms/pages/2026-03/landing-pages/216390365288/draft/push-live
```

HubSpot respondio:

```text
403 MISSING_SCOPES
requiredGranularScopes:
  - content
  - content.landing_pages.write
```

Conclusion:

- el PAK/CLI actual permite Developer Project upload/deploy;
- no permite publicar landing pages por Pages API;
- si se requiere publish automatizado, crear/rotar un token con `content` y `content.landing_pages.write`;
- no reutilizar ni rotar el token del bridge Greenhouse para esta operacion.

## Guardrails

- Mantener acceso a Efeonce/Kortex como default CLI; ANAM debe ser adicional.
- No repetir ni commitear Personal Access Keys.
- No publicar, archivar, borrar o reemplazar templates por API sin aprobacion explicita.
- Para cambios visuales, validar en la URL publica porque HubSpot puede tardar en servir el build nuevo aunque el Developer Project ya tenga `deployedBuildId` actualizado.
- Para copy visible, evitar lenguaje vendor/implementacion. El usuario necesita saber que puede iniciar una conversacion, no que se abre un widget.

## Estado de cierre

Estado final al cierre de la sesion:

```text
URL publica: https://anam-2.hubspotpagebuilder.com/agente-anam
Build publico: kortex-cms-react/22
Project deployedBuildId: 22
Estado: live
Pendiente: configurar chatflow target rules/branches en HubSpot para `anam_intent`.
```

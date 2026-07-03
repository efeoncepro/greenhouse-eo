# ANAM Chat Landing - CMS React Project

> **Fecha:** 2026-07-03
> **Portal HubSpot:** ANAM / `19893546`
> **URL publica:** `https://anam-2.hubspotpagebuilder.com/agente-anam`
> **Proyecto HubSpot:** `kortex-cms-react`
> **Project ID:** `103589049`
> **Theme component UID:** `kortex-anam-cms-react-theme`
> **Plataforma:** HubSpot Developer Projects / CMS React `2026.03`
> **Estado:** live en build `#19`

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
```

Estado final verificado:

```json
{
  "projectName": "kortex-cms-react",
  "platformVersion": "2026.03",
  "projectId": 103589049,
  "deployedBuildId": 19,
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
kortex-cms-react/19
```

## Direccion de producto y UX

Decision de experiencia:

- primera pantalla funcional, no landing de marketing;
- copy orientada a tarea y confianza;
- CTA principal unico: `Iniciar chat`;
- categorias de entrada con verbos:
  - `Cotizar`;
  - `Consultar servicio`;
  - `Enviar requerimiento`;
  - `Revisar seguimiento`;
- evitar lenguaje de implementacion como `widget`, `HubSpot`, `boton flotante` o explicaciones tecnicas.

Copy final clave:

```text
Canal seguro · Respuesta asistida
Atencion digital
Atencion ANAM por chat
Cuéntanos qué necesitas y te orientamos para cotizar, consultar servicios, enviar un requerimiento o revisar un seguimiento.
Elige una categoría para iniciar con más contexto.
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

Los botones usan `data-chat-intent` para guardar la intencion seleccionada y abrir el chat:

```text
Iniciar chat
Cotizar
Consultar servicio
Enviar requerimiento
Revisar seguimiento
```

El layout base define `window.anamOpenHubSpotChat(intent)` y usa:

```text
window.HubSpotConversations.widget.open()
window.HubSpotConversations.widget.load({ widgetOpen: true })
window.hsConversationsOnReady
```

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
hasNewCopy: true
hasOldWidgetCopy: false
h1: Atencion ANAM por chat
primaryText: Iniciar chat
scrollWidth: 1440
clientWidth: 1440
```

Captura visual temporal revisada:

```text
/tmp/anam-build18-desktop.png
```

La captura confirmo la experiencia ya equilibrada antes del microajuste final del logo. El build #19 fue verificado por asset path publico.

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
Build publico: kortex-cms-react/19
Project deployedBuildId: 19
Estado: live
Pendiente: ninguno conocido
```

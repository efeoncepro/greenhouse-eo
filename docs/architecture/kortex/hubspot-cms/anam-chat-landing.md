# ANAM Chat Landing - CMS React Project

> **Fecha:** 2026-07-16
> **Portal HubSpot:** ANAM / `19893546`
> **URL publica:** `https://anam-2.hubspotpagebuilder.com/agente-anam`
> **Proyecto HubSpot:** `kortex-cms-react`
> **Project ID:** `103589049`
> **Theme component UID:** `kortex-anam-cms-react-theme`
> **Plataforma:** HubSpot Developer Projects / CMS React `2026.03`
> **Estado:** live en build `#30` (verificado 2026-09-24)

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
src/theme/kortex-anam-theme/assets/anam-virtual-executive-v2.png
src/theme/kortex-anam-theme/assets/emma-anam-portrait-2026-09-23.png
src/theme/kortex-anam-theme/assets/emma-anam-full-2026-09-23.png
src/theme/kortex-anam-theme/assets/emma-anam-chat-avatar-2026-09-24.png
src/theme/kortex-anam-theme/assets/emma-anam-chat-avatar-256-2026-09-24.jpg
src/theme/kortex-anam-theme/assets/anam-logo-horizontal.svg
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
#23  Personaje visual corregido a Emma, asistente virtual femenina; ALT y dimensiones intrínsecas sincronizados.
#24  Rediseño editorial premium centrado en Emma: composición asimétrica, selector unificado y CTA único.
#25  Primer controlador de selección de intención en el layout Hubl, necesario porque el módulo se renderiza en servidor.
#26  Corrección del feedback del selector para preservar íntegros los tres ítems al cambiar la intención.
#27  Logo horizontal ANAM del catálogo canónico, mayor presencia de marca y cierre del espacio inferior.
#28  Bordado de Emma corregido mediante edición generativa a `ANÁLISIS AMBIENTALES S.A.`.
#29  Foto PNG de Emma enviada por María Paz aplicada a la landing; avatar con fondo claro aplicado a la identidad del agente y al chatflow de HubSpot.
#30  Cargo visible actualizado a `Ejecutivo comercial ANAM` por indicación del operador.
```

Estado final verificado:

```json
{
  "projectName": "kortex-cms-react",
  "platformVersion": "2026.03",
  "projectId": 103589049,
  "deployedBuildId": 30,
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
kortex-cms-react/30
```

## Direccion de producto y UX

Decision de experiencia:

- primera pantalla funcional con dirección editorial de concierge;
- Emma se presenta como personaje y asistente, no como una imagen decorativa;
- copy orientada a tarea y confianza;
- selector de intención que no abre el chat de forma inesperada;
- CTA principal único: `Conversar con Emma`;
- categorias de entrada segun operacion ANAM:
  - `Solicitar una cotización`;
  - `Revisar un servicio`;
  - `Gestionar calidad`;
- evitar lenguaje de implementacion como `widget`, `HubSpot`, `boton flotante` o explicaciones tecnicas.

Copy visible vigente en el build #30:

```text
Canal seguro y asistido
Tu ejecutivo comercial ANAM
Hola, soy Emma. ¿En qué puedo ayudarte?
Te ayudo a cotizar, revisar el avance de un servicio o canalizar un requerimiento de calidad con el equipo indicado.
¿Qué quieres resolver hoy?
Conversar con Emma
Emma está disponible
Ejecutivo comercial ANAM
Orientación con contexto
Datos protegidos
Derivación humana
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
- Poppins para display y DM Sans para cuerpo;
- una sola superficie de selección con divisores, en lugar de una colección de tarjetas;
- footer simple y decoración recortada dentro del hero, sin margen o espacio blanco exterior;
- header con el logo ANAM horizontal del catálogo del repo, sin isotipo circular superior;
- logo renderizado en `199x54` desktop y `166x45` mobile;
- panel navy integrado con Emma, identidad, disponibilidad y tres señales de confianza.

Assets históricos generados (builds #23-#28):

```text
src/theme/kortex-anam-theme/assets/anam-virtual-executive.png
src/theme/kortex-anam-theme/assets/anam-virtual-executive-v2.png
src/theme/kortex-anam-theme/assets/anam-logo-horizontal.svg
```

Origen local de la generacion nativa Codex:

```text
/Users/jreye/.codex/generated_images/01a05f48-1615-7590-befa-b814f5abafe8/exec-07e833ac-d048-4ced-9e56-e216efe33c31.png
```

El reemplazo de build #23 fue solicitado explicitamente para alinear el personaje con el nombre Emma. Ese diseño histórico conservaba torso superior, headset, fondo claro y logo ANAM visible en camisa. No regenerar la identidad visual vigente sin un nuevo pedido explícito de ANAM.

El build #28 usaba `anam-virtual-executive-v2.png`. La corrección del bordado `ANÁLISIS AMBIENTALES S.A.` mediante edición generativa fue propia de esa ilustración histórica, que permanece disponible para rollback; no es un requisito de la foto entregada por ANAM.

El 2026-09-24 se recibió por Outlook `EMMA.png` (cuerpo completo) y `EMMA 2.png` (retrato con auricular) de María Paz. La landing usa `emma-anam-portrait-2026-09-23.png`, copia intacta del retrato PNG transparente enviado por ANAM; el archivo de cuerpo completo se conserva como fuente, sin mostrarlo en la landing. Para el avatar circular del chat se editó el retrato con el motor de imágenes, agregando un fondo menta claro, y se exportó `emma-anam-chat-avatar-256-2026-09-24.jpg` (256 px). Ese JPEG se guardó tanto en la identidad de Customer Agent como en el chatflow activo `96601133`. La URL pública sirvió el build #30 y mostró la nueva foto, el avatar en el widget abierto y el cargo `Ejecutivo comercial ANAM`. La comprobación visual abrió el widget, pero no envió un mensaje ni volvió a probar el routing conversacional. Los assets anteriores permanecen disponibles para rollback.

## Interaccion del chat

Los tres selectores usan `data-intent-option` y `aria-pressed`; elegir uno actualiza el contexto sin abrir el chat. El CTA final es el único nodo con `data-chat-intent` y `data-chat-intent-key`, y enruta el chatflow por URL:

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
  h1: Hola, soy Emma. ¿En qué puedo ayudarte?
  scrollWidth: 1440
  clientWidth: 1440
  scrollHeight: 1100
  bodyMargin: 0px
  logoBox: 199x54
mobile:
  h1: Hola, soy Emma. ¿En qué puedo ayudarte?
  scrollWidth: 390
  clientWidth: 390
  scrollHeight: 1544
  bodyMargin: 0px
  logoBox: 166x45
intent routing:
  click selection: pass
  keyboard selection: pass
  CTA context update: pass
  chat opened during smoke: false
```

Captura visual temporal revisada:

```text
/tmp/anam-build21-desktop.png
/tmp/anam-build21-mobile.png
/tmp/anam-build22-desktop.png
/tmp/anam-build22-mobile.png
.captures/anam-emma-build23-2026-09-01/desktop.png
.captures/anam-emma-build23-2026-09-01/mobile.png
.captures/anam-emma-build23-2026-09-01/report.json
.captures/anam-emma-premium-build27-2026-09-01/desktop.png
.captures/anam-emma-premium-build27-2026-09-01/mobile.png
.captures/anam-emma-premium-build27-2026-09-01/report.json
.captures/anam-emma-corporate-name-build28-2026-09-01/desktop.png
.captures/anam-emma-corporate-name-build28-2026-09-01/mobile.png
.captures/anam-emma-corporate-name-build28-2026-09-01/report.json
```

Las capturas confirmaron la copy solicitada, las tres categorias y ausencia de overflow horizontal. En mobile, el globo fijo de HubSpot queda fuera de las tarjetas de categoria; puede superponerse al bloque visual del agente por ser un iframe fijo externo.

El readback de build #28 confirmó en `1440x1100` y `390x1000`: HTTP `200`, assets `kortex-cms-react/28`, imagen `anam-virtual-executive-v2`, ALT `Emma, asistente virtual de ANAM, sonriendo`, imagen natural `900x675`, `scrollWidth === clientWidth`, margen del body `0px`, selector funcional por clic y teclado, contexto transferido al CTA, cero errores de consola, cero page errors y cero requests fallidas. El smoke no abrió ni envió una conversación real.

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

Estado histórico al cierre de la sesión del build #28:

```text
URL publica: https://anam-2.hubspotpagebuilder.com/agente-anam
Build publico: kortex-cms-react/28
Project deployedBuildId: 28
Estado: live
Pendiente: configurar chatflow target rules/branches en HubSpot para `anam_intent`.
```

Estado actual verificado el 2026-09-24: build público y desplegado `#30`, con imagen y cargo nuevos. El pendiente de `anam_intent` requiere una verificación separada; este cambio visual no modificó esas reglas.

## Evidencia incluida en la entrega al cliente

La captura final seleccionada para el correo de cierre está versionada en
[`../hubspot-as-a-service/reports/assets/ANAM_Emma_Landing_2026-09-02.png`](../hubspot-as-a-service/reports/assets/ANAM_Emma_Landing_2026-09-02.png).
Muestra el wordmark horizontal, la presentación `Hola, soy Emma`, el personaje femenino, el bordado correcto
`ANÁLISIS AMBIENTALES S.A.`, el selector único y el CTA `Conversar con Emma`. La captura comunica la experiencia;
esa captura es histórica y corresponde al build #28. La evidencia de la versión vigente es el readback público
del build #30 descrito en este documento.

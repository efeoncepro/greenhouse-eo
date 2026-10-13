# Auditoría — Formularios del sitio público y entrega a HubSpot

> **Fecha:** 2026-10-09 · **Autor:** Claude (sesión con Julio Reyes)
> **Alcance:** todos los formularios de `efeoncepro.com`. Think, Careers y `efeonce-lead-gen-web` quedan fuera.
> **Estado:** aplicado el 2026-10-09. Los 8 formularios entregan en `direct`. Falta un envío real desde el navegador por formulario.

## Qué se midió

Lectura de `greenhouse_growth.*`, inventario de WordPress por WP-CLI, API pública, carga de las 13
páginas con formulario en Chromium (escritorio y 390 px), flags de Vercel y `ops-worker`, y HubSpot
(formularios, properties y conversiones de contactos). Sin envíos de prueba.

## Hallazgos

1. **Los 8 Growth Forms cargan bien.** Montan en escritorio y móvil, sin desborde, con Turnstile y API 200.
   El motor está encendido de punta a punta (flags + despachador cada 2 minutos).
2. **Sólo AEO entregaba a HubSpot de forma gobernada.** Contacto, Influencers, Desarrollo web, SEO y Redes
   Sociales tenían el destino en `disabled`; Content Marketing y Servicios HubSpot no tenían destino.
3. **`status='delivered'` no prueba entrega a HubSpot.** Sin destino `direct`, el despachador marca la
   submission como entregada al ledger. La prueba real es `form_destination_attempt` con HTTP 200.
4. **Lo que llegaba a HubSpot entraba por el capturador genérico** (`leadin`, `formCaptureEnabled=true`):
   conversión «título de la página: .ghf-form», sin mapeo a properties. En AEO eso duplica la conversión.
5. **Cuatro destinos apuntaban al formulario de lead-gen** con un mapeo que no calzaba con sus campos.
   Pasarlos a `direct` tal cual habría dejado la mayoría de las respuestas sin llegar.
6. **AEO no mapeaba `brandName` ni `brandWebsite`.**
7. **«Contact Form - EO» exige `lastname` en HubSpot**; un nombre de una sola palabra habría terminado en
   `REQUIRED_FIELD` → dead-letter al activar `direct`.
8. **Formularios heredados rotos:** el embed HubSpot de 4 posts del blog y de la página del webinar 2025
   apuntan al portal antiguo `22254404` (404).
9. **Suscripción de `/blog/` (CF7 `17852`)** notifica a una dirección `@clbthemes.com`, del proveedor del tema.
10. **Newsletter del footer (CF7 `242255`)**: 6.515 registros en WordPress; a HubSpot sólo llega por el capturador.
11. Sin confirmar: el 2026-09-26 HubSpot registró 7 conversiones de un mismo contacto desde Contacto en 17
    minutos y el ledger no tiene filas ese día. Puede ser validación fallida repetida o un error de envío.

## Solución construida

- `scripts/growth/hubspot-destinations.registry.ts`: fuente única de formulario HubSpot + mapeo por Growth
  Form. Un formulario HubSpot por Growth Form; las opciones de los `select` se derivan del `field_schema`.
- `pnpm growth:forms:activate-hubspot-destinations`: dry-run por defecto. Asegura properties y formularios
  en HubSpot, corre el contract check (`FIELD_NOT_IN_FORM_DEFINITION`, `VALUE_NOT_IN_FIELD_DEFINITION`,
  `REQUIRED_FIELD`), hace smoke por secure-submit con el mismo payload del adapter y publica la versión
  nueva con destino `direct` vía commands canónicos.

Resultado esperado en HubSpot: 1 grupo de properties, 20 properties de contacto `gh_form_*`, 6 formularios
nuevos («Lead Gen - Content Marketing», «- Servicios HubSpot», «- Influencer Marketing», «- Desarrollo Web»,
«- SEO», «- Redes Sociales») y 2 formularios existentes ampliados (AEO y Contacto).

## Rollout aplicado (2026-10-09)

| Formulario | Versión | Formulario HubSpot | Smoke secure-submit |
| --- | --- | --- | --- |
| `efeonce-aeo-diagnostic` | v16 → v17 | AEO - Lead Form (existente) | 200 / 200 |
| `efeonce-contacto` | v3 → v4 | Contact Form - EO (existente) | 200 / 200 |
| `efeonce-content-marketing` | v3 → v4 | Lead Gen - Content Marketing (nuevo) | 200 / 200 |
| `efeonce-hubspot-scope` | v3 → v4 | Lead Gen - Servicios HubSpot (nuevo) | 200 / 200 |
| `efeonce-creator-influence-brief` | v2 → v3 | Lead Gen - Influencer Marketing (nuevo) | 200 / 200 |
| `efeonce-desarrollo-web-cotizacion` | v2 → v3 | Lead Gen - Desarrollo Web (nuevo) | 200 / 200 |
| `efeonce-seo-diagnostic` | v3 → v4 | Lead Gen - SEO (nuevo) | 200 / 200 |
| `efeonce-social-audit` | v1 → v2 | Lead Gen - Redes Sociales (nuevo) | 200 / 200 |

Evidencia:

- El contacto de prueba `greenhouse-smoke+forms-20261010@efeonce.org` recibió las 20 properties
  `gh_form_*` y las estándar, leído desde HubSpot después del smoke.
- El render contract público de los 8 quedó idéntico al de antes salvo `version` y `formVersionId`,
  sin datos de destino en el payload.
- Las 8 páginas se recargaron en Chromium (escritorio y 390 px): mismo número de campos, mismo CTA,
  sin desborde.
- La segunda corrida de la herramienta devuelve `idempotente` en los 8.
- Las versiones publicadas duplicadas de Content Marketing, Servicios HubSpot y Desarrollo web
  quedaron deprecadas.

Desvíos respecto del plan:

- «AEO - Lead Form» usa el editor nuevo de HubSpot (`embedType: V4`) y la API responde 403 al
  modificarlo. Los campos «Nombre de la empresa» y «URL del sitio web» se agregaron y publicaron
  desde la UI de HubSpot.
- En «Contact Form - EO» quedaron como no obligatorios nombre, apellido y teléfono.
- Los formularios nuevos clonan la configuración de «Contact Form - EO», incluidos los avisos.

Pendiente: un envío real desde el navegador por formulario, para cerrar el tramo
navegador → Turnstile → ledger → despachador → HubSpot. El smoke cubre sólo el tramo adapter → HubSpot.

## Doble conversión — corregida en código, release pendiente (2026-10-10)

El renderer ahora emite `<form class="ghf-form" data-hs-do-not-collect="true">`. El script de HubSpot
(`collectedforms.js`) ignora los formularios con ese atributo; se confirmó leyendo su predicado y hay
un test que lo reproduce y falla si el atributo no está presente al insertar el nodo.

Queda para el release:

1. **Greenhouse (`develop → main`)** publica `renderer-latest.js`, que usan AEO, Contacto, Desarrollo
   web, SEO, Redes Sociales e Influencers.
2. **Plugin de WordPress**: Content Marketing y Servicios HubSpot cargan bundles fijados
   (`content-marketing-forms.js`, `hubspot-forms.js`). Hay que reconstruirlos con
   `scripts/public-website/build-content-marketing-package.cjs` y `build-hubspot-elementor-package.cjs`
   y desplegar el plugin; el release de Greenhouse no los actualiza.
3. **Verificación**: enviar un formulario y confirmar en el contacto de HubSpot que aparece sólo la
   conversión con el nombre del formulario y ya no «título de la página: .ghf-form».

No apagar la captura a nivel de portal: el newsletter del footer y el agendador (`.ghm-form`) dependen de ella.

## Fuera de esta entrega

- Formularios heredados rotos, destinatario del CF7 de `/blog/` y spam del newsletter del footer.
- `efeonce-lead-gen-web` sigue en sombra bajo TASK-1264.
- Los formularios de Think (ebooks y grader) no tienen destino HubSpot en el registro; no se midió
  que el capturador los esté registrando hoy.

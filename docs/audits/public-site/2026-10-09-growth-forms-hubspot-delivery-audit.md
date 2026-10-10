# Auditoría — Formularios del sitio público y entrega a HubSpot

> **Fecha:** 2026-10-09 · **Autor:** Claude (sesión con Julio Reyes)
> **Alcance:** todos los formularios de `efeoncepro.com`. Think, Careers y `efeonce-lead-gen-web` quedan fuera.
> **Estado:** `code complete, rollout pendiente` — herramienta lista y validada en dry-run; falta aplicarla.

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

## Rollout pendiente

1. `--apply-hubspot --smoke` (crea un contacto de prueba `greenhouse-smoke+forms-<fecha>@efeonce.org`).
2. `--apply-greenhouse` con contract check limpio.
3. Un envío real desde el navegador por formulario para cerrar el tramo navegador → ledger → HubSpot.

## Fuera de esta entrega

- Excluir `.ghf-form` del capturador genérico (`data-hs-do-not-collect` en el renderer) para terminar con
  la doble conversión. Requiere release del renderer y sólo después de que los 8 entreguen en `direct`.
- Formularios heredados rotos, destinatario del CF7 de `/blog/` y spam del newsletter del footer.
- `efeonce-lead-gen-web` sigue en sombra bajo TASK-1264.

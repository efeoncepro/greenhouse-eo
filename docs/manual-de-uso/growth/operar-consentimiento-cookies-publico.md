# Operar el consentimiento de cookies público

La presentación La órbita está publicada sobre el banner y las preferencias nativas de HubSpot en
`efeoncepro.com` y `think.efeoncepro.com`. HubSpot conserva la elección, las categorías, la persistencia,
el retiro y la API `showBanner`. El adapter no constituye una CMP ni escribe otra preferencia.
Estado y recibos del despliegue: [auditoría del 13 de octubre](../../audits/measurement/CONSENT_UI_ROLLOUT_2026-10-13.md)
y [evidencia saneada](../../audits/measurement/consent-ui-evidence-2026-10-13.json). La verificación de este
manual es documental contra código y recibos; no constituye una nueva ejecución live.

## Responsabilidades y alcance

- [Contrato de consentimiento](../../reference/measurement-gtm-ga4/09-hubspot-consent.md): categorías
  booleanas nativas y bridge. Analítica y publicidad son decisiones independientes; desconocido parte
  denegado y GPC veta publicidad. La presentación no cambia eventos, matching ni versiones GTM.
- [Canon JS](../../../scripts/measurement/hubspot-consent-ui.js) y
  [template CSS](../../../scripts/measurement/hubspot-consent-ui.template.css): sólo presentación dentro
  de `#hs-banner-parent`. El JS admite únicamente los dos hosts y monta una vez. Conserva botones,
  checkboxes, handlers y detalles del proveedor; añade hermanos propios, copy y ARIA sin reemplazar
  los hijos que administra HubSpot. No usar `setHubSpotConsent` para aplicar este diseño.
- [Builder](../../../scripts/measurement/build-hubspot-consent-ui.mjs): obtiene tokens instalados desde
  las dependencias de Think; exige `axis-ui-primitives@0.6.6` y `axis-tokens@0.6.1`. Si cambian versiones
  o shapes, se revisa la procedencia antes de regenerar; no se suprime el guard.
- Distribuciones: `../efeonce-think/public/measurement/consent-ui/` y
  `../efeonce-public-site-runtime/wp-content/plugins/eo-measurement-consent/assets/consent-ui/`.
  Son salidas generadas; los cambios parten del canon, no de copias editadas manualmente.
- Think carga UI, bridge, HubSpot y GTM sólo con `analytics=true`. `analytics=false` conserva informes
  privados y preview sin scripts de medición/banner. No ampliar esa condición por una mejora visual.
  WordPress carga el plugin sólo en frontend del host canónico; no en admin.
- «Preferencias de cookies» permanece como texto del pie legal; abre el control nativo. No añadir
  otra franja o CTA al footer ni cubrir en móvil el acceso con el CTA de reuniones.

La UI usa Bricolage variable y Poppins 400/500 como WOFF2 locales, con las dos licencias distribuidas.
Color, tipografía, geometría, botones, switches y motion salen de AXIS; fuentes y estilos se acotan al
banner. Conservar reduced motion y el foco visible al cambiar la presentación.

## Preparar un cambio sin publicar

Desde `greenhouse-eo`, revisar primero el estado de los tres repositorios compartidos y limitar el diff
al adapter y sus distribuciones. Los siguientes comandos son reales; el builder **escribe archivos en
los dos repositorios consumidores**, pero no publica ni cambia preferencias en HubSpot:

```bash
node scripts/measurement/build-hubspot-consent-ui.mjs
node --check scripts/measurement/hubspot-consent-ui.js
node --test scripts/measurement/__tests__/hubspot-consent-bridge.test.cjs
node scripts/measurement/verify-hubspot-consent-ui.mjs --inject-local
```

`--inject-local` visita las home públicas con contextos nuevos e inyecta el CSS/JS local para revisar
contra el DOM real del proveedor. No es una previsualización del artefacto desplegado. El verificador
intercepta `/g/collect` con respuesta 204 para evitar PageViews sintéticos en destinos; no envía
formularios, reservas ni contactos. Guarda capturas y `result.json` en `.captures/cookie-ui-injected/`.
No se requiere ni se justifica un build completo local de Greenhouse para este cambio.

## Verificar después de publicar

```bash
node scripts/measurement/verify-hubspot-consent-ui.mjs --live
```

El modo live consume los assets publicados, sin inyectar la UI; guarda resultados en
`.captures/cookie-ui-live/`. Las salidas históricas del despliegue están en
`.captures/cookie-rollout/live/`. Ambos modos recorren dos hosts por 1440×1000 y 390×844, con reduced
motion, y comprueban aviso automático, contención horizontal, defaults denegados, publicidad sin
analítica, reapertura desde footer, retiro, cookie nativa y ausencia de un `localStorage` propio.
Live además recarga y verifica que HubSpot preserva la elección y no vuelve a mostrar el aviso.
Axe revisa WCAG A/AA sobre el árbol del banner y del panel; las capturas requieren inspección visual.

Interpretar la evidencia con sus límites:

- El script registra errores de página en `pageErrors`; revisar que siga vacío, no basarse sólo en PASS.
- Antes de elegir exige que cualquier transporte observado sea `G100`, sin publicidad concedida ni
  marcador de Meta PageView. Un ping automático `scroll` G100 puede existir. No afirmar «cero requests»
  ni ausencia total de pings por leer el nombre histórico `no-tracking-before-choice` de un recibo.
- `/g/collect` está interceptado incluso en `--live`: esta QA prueba UI/gates/persistencia, **no prueba
  llegada a GA4 ni Meta Server**. La entrega CAPI requiere por separado Preview Server, respuesta de
  Meta/Test Events y readback con identidad estable, conforme al
  [manual CAPI](operar-meta-capi-servidor.md). No inferir una nueva conversión comercial del PASS visual.
- GPC no forma parte del bucle ejecutable del verificador. El recibo del rollout guarda una prueba
  separada en ambos hosts con `Sec-GPC: 1` y `navigator.globalPrivacyControl=true`: HubSpot resolvió
  analytics/ads denied y no montó el aviso opt-in. Es un bypass nativo del proveedor, no un fallo del
  adapter; no forzar un aviso ni conceder categorías para hacerlo aparecer. El bridge por sí mismo
  veta publicidad; no inventar una política universal de analytics a partir de ese recibo.
- Verificar aparte una ruta con `analytics=false`: cero scripts de medición/banner/UI. La existencia
  del aviso en home no acredita el aislamiento de informes privados.

Si HubSpot cambia selectores o reconstruye tarde su DOM, revalidar copy no duplicado, handlers,
checkboxes y ARIA; no resolverlo reemplazando controles nativos. El adapter elimina `aria-pressed`
inválido de checkboxes sin cambiar `checked`. Revisar detalles, enlaces legales, foco/teclado y panel
móvil además del PASS automático.

## Hashes, publicación y rollback

El builder genera `manifest.json` con SHA-256 de CSS, JS, tres fuentes y dos licencias; comparar ambos
consumidores y los bytes HTTP publicados. Los hosts agregan hashes cortos a las URLs CSS/JS como
cache busting. El recibo versionado conserva los hashes completos del despliegue; no actualizarlo
simulando una publicación. Un `200` sin digest coincidente no prueba que se sirva el artefacto esperado.

La publicación requiere autorización para ambos consumidores. WordPress usa payload cerrado de nueve
archivos: PHP más ocho distribuciones (incluido manifest); assets primero y PHP al final mediante
rename atómico, SHA prestate/bridge como guard, backup fuera del webroot e invalidación WP/Kinsta.
No desplegar otros plugins/tema o WIP del repo. Think usa commit explícito y push de main al proyecto
Vercel existente con build remoto, seguido de deployment Ready, alias y readback de assets/UI.
No crear otro proyecto ni saltarse los controles de promoción del producto.

Rollback visual: restaurar el payload WP desde backup y purgar cachés; en Think redeploy del deployment
anterior documentado o revert del commit UI y redeploy. Confirmar otra vez versión, alias, hashes,
categorías/persistencia y rutas privadas. No revertir matching, bridge ni GTM por una regresión de estilo.
IDs concretos de rollback y backup viven en la auditoría, no se inventan ni se infieren del árbol local.

## Incidencia de credencial Vercel: rotación verificada

En el rollout, el wrapper local añadió una credencial a `argv`; `vercel ls --yes` la reprodujo en una
sugerencia de siguiente página. La credencial no se reproduce aquí. El operador autorizó la rotación
el 14/10: anterior revocada y rechazada403; nueva credencial validada por CLI/API, fuentes locales
con0600 y secreto GitHub greenhouse-eo actualizados. Los wrappers fueron retirados; la CLI utiliza
su `auth.json` privado sin `--token`. Vencimiento: 14/10/2027.
[Recibo saneado](../../audits/measurement/VERCEL_CREDENTIAL_ROTATION_2026-10-14.json).
La metadata del secreto GitHub se releyó; no se lanzó un workflow ni un deploy como prueba.

Antes de volver a operar esa CLI, aplicar el aprendizaje de su
[skill local Vercel](../../../.codex/skills/vercel-operations/SKILL.md#salida-de-la-cli-y-credencial-del-wrapper)
y la [skill de higiene](../../../.codex/skills/greenhouse-secret-hygiene/SKILL.md).
Capturar stdout y stderr antes de mostrar resultados, sanear credenciales y sugerencias de paginación,
y publicar sólo campos permitidos. No confiar en `max_output_tokens` como redacción de secretos ni
repetir el valor en comandos, documentos, registros o artefactos de evidencia. No ejecutar una nueva
llamada sólo para reproducir la exposición. La rotación es una operación separada que requiere su
alcance autorizado y readback, no una consecuencia automática de actualizar este manual.

## Matching de visitante y pruebas aisladas (14/10/2026)

El bridge autorizado ahora conserva atribución publicitaria después del grant; detalle de cookies,
revocación y contexto en [runtime10](../../reference/measurement-gtm-ga4/10-growth-lead-matching-runtime.md).
Para comprobar entrega, verificar el código real vigente en Meta Probar eventos y pasarlo sólo
en META_TEST_EVENT_CODE temporal al ejecutar scripts/measurement/verify-lead-context.ts con
el shim server-only. META_TEST_PREVIEW_HEADER_FILE es opcional para el draft; sin él prueba
el Client publicado. META_TEST_RECEIPT_FILE guarda sólo metadatos/estados, nunca user_data.
No publicar testEventCode en el tag ni ejecutar el canary histórico sin este gate.
No confundir los fixtures recibidos con formularios aceptados de clientes ni con mejora de EMQ.


La entrega vigente usa Server 9 y políticas publicadas por API/CLI/panel; consultar el
[manual de configuración](configurar-medicion-conversiones.md) y el
[release del 14/10](../../audits/releases/2026-10-14-scalable-measurement-agent-first-release.md).
El grant permite la captura publicitaria, pero no habilita una fuente sin política publicada,
no dispara Lead al aceptar cookies y no prueba recepción de Meta. Denegación/revocación o GPC
conservan la aceptación del formulario y la entrega comercial a HubSpot Forms/CRM. Cambiar el
estilo del aviso no requiere ni autoriza cambiar políticas de matching o tags GTM.

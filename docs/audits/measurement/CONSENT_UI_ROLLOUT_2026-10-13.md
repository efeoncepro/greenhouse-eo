# Consentimiento público — publicación visual La órbita

Autorización: «Vamos, ponla», después de revisar la propuesta local. Alcanza WordPress y Think.
Estado del corte: publicado y verificado en WordPress y Think, 2026-10-14 UTC / 13 de octubre Chile.
Revisión documental del 14/10: contrasta código y recibos guardados; no repite publicación ni prueba live.

## Implementación y frontera

Se adopta la dirección papel/navy, Bricolage/Poppins, aviso flotante y panel de preferencias. El adapter
viste los nodos nativos de HubSpot y añade copy de presentación; no crea una CMP ni preferencias propias.
Los botones y checkboxes originales conservan sus handlers. HubSpot conserva políticas, categorías,
persistencia y `showBanner`. El bridge conserva además su veto explícito de publicidad por GPC;
matching/eventos/versiones GTM no cambian. La fuente sigue siendo `hubspot_categories`, no el adapter
ni el prototipo. La versión del diseño no es la versión de la política de consentimiento.

Decisión arquitectónica aplicable: [Meta/GTM](../../architecture/GREENHOUSE_META_CAPI_SERVER_GTM_DECISION_V1.md)
y su [contrato de consentimiento](../../reference/measurement-gtm-ga4/09-hubspot-consent.md).
Se identifica ese ADR existente porque la fuente de verdad y el transporte no cambian.
No se activa la [propuesta de configuración escalable](../../architecture/GREENHOUSE_GROWTH_MEASUREMENT_CONFIGURATION_PROPOSAL_V1.md).

La API oficial permite `setHubSpotConsent` para una CMP externa, pero obliga al caller a persistirla.
Ese camino no se adopta: mantendría otra fuente de elección. El adapter usa presentación CSS/ARIA sobre
HubSpot, con selectores verificados y pruebas de regresión, sin llamar a escrituras de categorías.

## Fuentes y distribución

- Canon: `scripts/measurement/hubspot-consent-ui.js`, `hubspot-consent-ui.template.css`,
  `build-hubspot-consent-ui.mjs`. Builder comprueba primitives 0.6.6/tokens 0.6.1, obtiene valores de
  los exports instalados y distribuye CSS/JS/fonts/manifest idénticos a los dos consumidores.
- WP: plugin `eo-measurement-consent` 1.1.0; emite referencias con hash desde `wp_head` prioridad
  −100 en el frontend canónico. El JS es `defer` y observa el DOM; no depende de ejecutarse antes
  que el renderer asíncrono de HubSpot. La presentación no depende del flag de routing.
- Think: BaseLayout carga CSS/JS sólo con `analytics=true`; informes privados y preview mantienen aislamiento.
- Fuentes WOFF2 locales: Bricolage variable y Poppins 400/500, licencias incluidas.
- El prototipo permanece como referencia de diseño; no es el controlador de producción.

La UI conserva el enlace de política real y los detalles/accordions nativos. El panel mantiene
«Aceptar todas» como acción terciaria del proveedor, además de «Solo esenciales» y «Guardar mi elección».
El texto nativo no se reemplaza: copy adicional en nodos propios, etiquetas CSS/ARIA y fuentes scoped.
El CSS oculta la introducción nativa mientras muestra el copy local; no cambia la configuración
de política guardada en HubSpot. Esto evita la duplicación causada por actualizaciones tardías del renderer HubSpot.
Se corrige ARIA `aria-pressed` inválido del checkbox nativo sin alterar su estado `checked`.

## Preflight y pruebas

- SSH/WP-CLI verificado contra `https://efeoncepro.com` antes de operaciones.
- Prestate PHP 1.0.3: `f4c2daa96c6198dd2cbcbe78eb45bb3514e38e28428729423e38ffa39c75807c`;
  bridge fijo `15026e5d27ed54a8188a67b100f812ef5d33129bb15f7eb365054cac6f4f0d3a`.
- Think prestate productivo: `dpl_AH8YdErwaGg6haELFGzdk3DuddRX` Ready.
- Readback visual/integración primero con inyección local del adapter sobre DOM público real;
  después se repitió desde los assets publicados, sin inyección de UI/CSS.
- Capturas/prueba focal histórica en `.captures/cookie-rollout/`: ambos hosts × 1440×1000 /
  390×844, Chromium con movimiento reducido, aviso automático,
  defaults denegados, publicidad sin analítica, reapertura, persistencia HubSpot, retiro y axe WCAG AA.
- QA repetitiva intercepta `/g/collect` con 204 para no emitir PageViews sintéticos a destinos;
  un ping automático `scroll` G100 con publicidad denegada es permitido por el transporte actual y
  no prueba entrega a GA4/Meta. No se crean formularios, reservas o contactos.
- Think typecheck: 0 errores, 0 warnings, 17 hints existentes. PHP y JS syntax PASS.

## Publicación y rollback

WP: payload cerrado de nueve archivos públicos, digest por archivo, guard por SHA prestate/bridge,
backup fuera del webroot en `/tmp`, assets primero y PHP al final con rename atómico.
Ante error se restauran los archivos escritos; invalidación de plugins y purga WP/Kinsta.
No desplegar el resto del repositorio WP, que conserva WIP ajeno.

Think: commit explícito de archivos propios y push main al proyecto Vercel existente; build remoto.
Rollback: redeploy del deployment anterior citado, o revert del commit UI y redeploy. No revertir
el matching de Greenhouse ni los contenedores GTM por un rollback de presentación.

El readback final siguiente corresponde a esa publicación; los recibos locales son evidencia del
corte, no un monitor ni prueba de disponibilidad actual.

## Readback final

- WP commit `8d6ff95081dc3ec07b7580d979c86102a9666518`, pusheado a main. Publicación cerrada de nueve archivos; PHP sha
  `d182015411e79db8bbaaee04b679c526a03bce9168d2b99970460450558178cd`.
  Backup `/tmp/efeonce-consent-ui-backup-20261014021135`; routing sigue `enabled`.
  Cache de plugins/WP/Kinsta purgada. El push sincronizó además los commits locales anteriores;
  la escritura al runtime se limitó al payload de nueve archivos, sin desplegar otros plugins/tema.
- Think commit `f7d8f36f3040b270711f6961b0163919ddcbf2a3`, pusheado a main.
  Vercel Production `dpl_3iSjewwoA1wxPqW4oG9FDugXzmZ5` **Ready**, alias canónico
  `think.efeoncepro.com`. Build remoto, sin build completo local de Greenhouse.
- CSS sha `6f39d85ac719fc2bdbc1becdbc06aa792af219c1195211e7511f222dfa5cbec8`;
  JS sha `63b246da2480f07249c40c920f4c6c842cbefb81cfcd14243cebd793af8ff2f9`.
  Las siete distribuciones públicas (CSS/JS/tres fonts/dos licencias) devolvieron 200 y mismo hash
  en ambos hosts; manifest en `.captures/cookie-rollout/live-assets.json`.
- `.captures/cookie-rollout/live/result.json`: PASS, cuatro combinaciones host/viewport,
  sin inyectar UI ni CSS. Axe no detectó violaciones en el subtree `#hs-banner-parent`,
  con tags WCAG A/AA 2.0/2.1/2.2, en los dos estados capturados; no certifica todo el sitio
  ni sustituye revisión manual de accesibilidad.
  Publicidad-only conserva analítica denied; reabre con elección nativa y revoca a denied.
  La recarga conserva publicidad granted y el aviso inicial permanece cerrado: persistencia real de HubSpot.
  El PageView de QA se interceptó para evitar contaminar destinos: no es un nuevo recibo Meta Server.
- `preview/cookies` público devuelve 200 con cero scripts de medición; `analytics=false` preservado.
- Bridge sin cambios y 16 regresiones unitarias PASS; no nuevos eventos Lead, formularios o reservas.
- GPC live PASS en ambos hosts: con `Sec-GPC:1` y `navigator.globalPrivacyControl=true`, HubSpot
  resuelve automáticamente la elección a analytics/ads denied y no monta el aviso opt-in. El bridge
  conserva publicidad denied; ese bypass del aviso es comportamiento del proveedor, no fallo del diseño.
- Capturas finales: `.captures/cookie-rollout/live/{think,efeoncepro}-{desktop,mobile}-{banner,preferences}.png`.
- [Recibo saneado versionado](consent-ui-evidence-2026-10-13.json).
  El recibo normaliza el check histórico `no-tracking-before-choice` a
  `no-consented-transport-before-choice`: sólo prueba que las peticiones `/g/collect` observadas
  tienen G100, publicidad no granted y marker Meta PageView distinto de 1. No prueba ausencia
  total de solicitudes de red, cookies o tratamiento por terceros. No usarlo como recibo Meta.

## Reproducción y mantenimiento

1. Revisar el estado de Greenhouse y de ambos consumidores; conservar WIP ajeno. El builder
   exige Think y WP como repos hermanos y las dependencias locales de Think: primitives 0.6.6,
   tokens 0.6.1 y los dos paquetes Fontsource. No requiere credenciales de proveedor.
2. Editar el canon en Greenhouse y ejecutar, sólo para preparar nuevas distribuciones:
   `node scripts/measurement/build-hubspot-consent-ui.mjs`. **Escribe ocho archivos en cada
   consumidor** (siete assets más manifest); no publica. Inspeccionar el diff/hashes de ambos
   repos. El JS canónico fue reformateado tras el despliegue por el precommit: SHA actual
   `80a36cad0de104e6ffe0863b592406ae6dc1bbad8507c49b3387ef9af0af66f1`, frente al SHA publicado
   `63b246da2480f07249c40c920f4c6c842cbefb81cfcd14243cebd793af8ff2f9`. En este corte,
   Acorn AST sin posiciones es idéntico. El builder copia bytes crudos: una reconstrucción
   cambia el digest JS y exige nuevo readback; no reescribir el recibo histórico con ese hash.
3. Prepublicación: `node scripts/measurement/verify-hubspot-consent-ui.mjs --inject-local`.
   Su UI/CSS locales se inyectan sobre los hosts reales: no demuestra despliegue. Guarda
   resultados y capturas en `.captures/cookie-ui-injected/`.
4. Tras una publicación autorizada: `node scripts/measurement/verify-hubspot-consent-ui.mjs --live`.
   Usa los assets publicados y guarda `.captures/cookie-ui-live/result.json` y ocho capturas.
   El recibo original `.captures/cookie-rollout/live/` proviene del helper previo preservado
   allí; la ruta distinta del verifier versionado es intencional. Cada ejecución sobrescribe
   su carpeta: conservar un recibo nuevo con fecha antes de repetirla.
5. El verifier usa contextos Chromium nuevos sin credenciales, transporte `/g/collect`
   interceptado con 204, preferencias nativas y axe local; no envía formularios/reservas ni
   prueba salidas CAPI. GPC, hashes públicos y `analytics=false` fueron comprobaciones
   independientes del rollout: no forman parte de ese comando único. La matriz completa
   aceptar/rechazar todas, analítica-only, funcionalidad y teclado requiere verificaciones
   adicionales; el PASS de cuatro combinaciones no las acredita por sí solo.
6. Rollback sólo visual WP: restaurar desde el backup el PHP 1.0.3 sin las referencias UI
   (guardando su SHA), invalidar cachés y verificar el banner nativo. No desactivar el plugin
   ni el routing para retirar el diseño: eso retiraría también el default/bridge existentes.
   Para Think, redeploy del prestate Ready indicado o revert del commit UI y redeploy; comprobar
   default, bridge, preferencias, aislamiento y hashes. No borrar cookies de usuarios ni
   revertir matching/GTM. El backup `/tmp` es transitorio: confirmar que existe y es íntegro
   antes de depender de él, o recuperar la versión desde Git y preparar un payload scoped.

Limitación operativa: se conserva la dependencia en selectores del DOM de HubSpot; ante cambio del
proveedor, revalidar y ajustar el adapter. Una nueva preferencia/función o CMP externa requiere otro
contrato; no reutilizar el estado efímero del prototipo como consentimiento productivo.

Incidencia de herramienta: `vercel ls` incluyó una credencial CLI en la sugerencia de paginación.
No se reproduce ni se almacena aquí; salidas posteriores filtradas. La rotación autorizada el
14/10 quedó verificada: anterior403/metadata404, reemplazo200 y CLI válida; dos fuentes locales,
CLI y secreto GitHub actualizados, wrappers retirados. [Recibo saneado](VERCEL_CREDENTIAL_ROTATION_2026-10-14.json).

## Fuentes oficiales consultadas

- [HubSpot Consent Banner API](https://developers.hubspot.com/docs/api-reference/latest/account/settings/consent-banner/consent-banner-api).
- [Estilos del banner HubSpot](https://knowledge.hubspot.com/privacy-and-consent/customize-your-consent-banner-with-the-new-editor).

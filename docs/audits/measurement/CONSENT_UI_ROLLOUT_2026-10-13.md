# Consentimiento público — publicación visual La órbita

Autorización: «Vamos, ponla», después de revisar la propuesta local. Alcanza WordPress y Think.
Estado vigente: publicado y verificado en WordPress y Think, 2026-10-14 UTC / 13 de octubre Chile.

## Implementación y frontera

Se adopta la dirección papel/navy, Bricolage/Poppins, aviso flotante y panel de preferencias. El adapter
viste los nodos nativos de HubSpot y añade copy de presentación; no crea una CMP ni preferencias propias.
Los botones y checkboxes originales conservan sus handlers. HubSpot conserva políticas, categorías,
persistencia, veto GPC y `showBanner`; bridge/matching/eventos/versiones GTM no cambian.

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
- WP: plugin `eo-measurement-consent` 1.1.0; carga con hash en URL, antes del loader HubSpot.
- Think: BaseLayout carga CSS/JS sólo con `analytics=true`; informes privados y preview mantienen aislamiento.
- Fuentes WOFF2 locales: Bricolage variable y Poppins 400/500, licencias incluidas.
- El prototipo permanece como referencia de diseño; no es el controlador de producción.

La UI conserva el enlace de política real y los detalles/accordions nativos. El panel mantiene
«Aceptar todas» como acción terciaria del proveedor, además de «Solo esenciales» y «Guardar mi elección».
El texto nativo no se reemplaza: copy adicional en nodos propios, etiquetas CSS/ARIA y fuentes scoped.
Esto evita la duplicación causada por actualizaciones tardías del renderer HubSpot.
Se corrige ARIA `aria-pressed` inválido del checkbox nativo sin alterar su estado `checked`.

## Preflight y pruebas

- SSH/WP-CLI verificado contra `https://efeoncepro.com` antes de operaciones.
- Prestate PHP 1.0.3: `f4c2daa96c6198dd2cbcbe78eb45bb3514e38e28428729423e38ffa39c75807c`;
  bridge fijo `15026e5d27ed54a8188a67b100f812ef5d33129bb15f7eb365054cac6f4f0d3a`.
- Think prestate productivo: `dpl_AH8YdErwaGg6haELFGzdk3DuddRX` Ready.
- Readback visual/integración primero con inyección local del adapter sobre DOM público real;
  después debe repetirse desde los assets publicados, sin inyección.
- Capturas/prueba focal en `.captures/cookie-rollout/`: ambos hosts × 1440/390, aviso automático,
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

Los hashes finales, commits, deployment y resultados live se registran al completar la publicación.

## Readback final

- WP commit `8d6ff95`, pusheado a main. Publicación cerrada de nueve archivos; PHP sha
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
  sin inyectar UI ni CSS. Axe WCAG A/AA sin violaciones en banner y preferencias.
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
  Regresión repetible: `node scripts/measurement/verify-hubspot-consent-ui.mjs --live`;
  `--inject-local` permite revisión previa sin publicar. Siempre intercepta el transporte para no
  contaminar destinos y usa contextos nuevos sin credenciales. No usar esos resultados como recibo Meta.

Limitación operativa: se conserva la dependencia en selectores del DOM de HubSpot; ante cambio del
proveedor, revalidar y ajustar el adapter. Una nueva preferencia/función o CMP externa requiere otro
contrato; no reutilizar el estado efímero del prototipo como consentimiento productivo.

Incidencia de herramienta: `vercel ls` incluyó una credencial CLI en la sugerencia de paginación.
No se reproduce ni se almacena aquí; salidas posteriores filtradas. Renovación/revocación pendiente.

## Fuentes oficiales consultadas

- [HubSpot Consent Banner API](https://developers.hubspot.com/docs/api-reference/latest/account/settings/consent-banner/consent-banner-api).
- [Estilos del banner HubSpot](https://knowledge.hubspot.com/privacy-and-consent/customize-your-consent-banner-with-the-new-editor).

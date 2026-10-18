# Google Ads online — implementación y preparación GTM, 17-10-2026

## Veredicto

**Código local implementado; dos acciones nativas creadas/verificadas; workspaces Web/Server compilados.
Sin publicación GTM, release, flag Ads ON ni conversión enviada.** No se acredita EC efectiva, procesamiento
ni atribución. [Manual de activación](../../manual-de-uso/growth/activar-conversiones-google-ads.md).

Pedido: avanzar implementación GTM, conversiones mejoradas y agendas; el operador recordó usar la API.
Tres subagentes investigaron Google primario, Forms y Meetings; después implementaron contratos y
revisaron privacidad. El ADR existente y TASK-2034 conservan ownership; no se creó otro runtime.

## Cuenta, acciones y API

Cloud siempre `julio.reyes@efeonce.org` / `efeonce-group`; GTM API impersona
`greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com` con scopes acotados por operación,
sin cambios IAM. Ads siempre `jreyes@efeoncepro.com`, target6862539491, manager9531478329.
OAuth, GA4/GSC/Insights y su custodia no se modificaron en este delta.

| Acción creada | Recurso | Binding leído del snippet |
| --- | --- | --- |
| Efeonce - Solicitud comercial aceptada | customers/6862539491/conversionActions/7852486523 | AW-18432951465/NnDACPveraAdEKmJwtVE |
| Efeonce - Agenda confirmada | customers/6862539491/conversionActions/7852487186 | AW-18432951465/kLr8CJLkraAdEKmJwtVE |

Ambas WEBPAGE, ENABLED, ONE_PER_CLICK, secondary (`primaryForGoal=false`), default0 CLP siempre.
Ese cero es placeholder de medición, no ingreso. Cada creación pasó validateOnly y apply único con
journal durable; luego GET independiente comparó todos los campos: complete/matched true.
Requests de creación: `2budwMVZsOSCeu98XROjCg`, `ycb2V6_F0p_S8e1s4xwHoA`.
No se alteraron presupuestos, campañas, goals, audiencias ni las dos acciones GA4 HIDDEN existentes.

`conversions bindings` nuevo consulta sólo los nombres acordados y valida AW contra tracking ID,
owner, tipo/estado/categoría/conteo/secondary, unicidad y cobertura. No expone HTML ni evalúa snippets.
El provider devolvió cuatro snippets por acción: HTML y AMP, WEBPAGE y ONCLICK; AMP usa send_to array.
El primer parser falló cerrado; se corrigió y cubrió con tests. Readback posterior ready=true, una
página completa; request `dE-a5KSDLc_aMEWZS5KJ_w` a23:14:00UTC.

## GTM por API

Live verificado Web5 fingerprint1791913373643 y Server9 fingerprint1791993298197. Se crearon workspaces
independientes: Web8 / Server12, sin conflictos, sobre latest=live. No create_version ni publish.

| Workspace | Cambios propios leídos por GET |
| --- | --- |
| Web8 | Variables73–76: transaction_id, key, getter user_data, gate consentimiento; trigger77; GA4 Event tag78 |
| Server12 | ED38–40; excepción41; triggers42/44 por acción; native Ads tags43/45; page trigger46 y Linker47 |
| Server12, forwarder18 | Se agrega sólo blockingTriggerId41; resto del cuerpo preservado |

Tags Ads nativos `sgtmadsct` y linker `sgtmadscl`: tipos contrastados con código primario Google y
aceptados por API/readback. ConsentSetting web `needed` exige los cuatro permisos. Gate server exige
GA4 Client, evento, key, UUID, host, allowed=1 y nativeGCS G111; no se fabrican gcs/gcd ni se importan
IDs click como si fuesen parámetros internos. Nativos leen transaction_id y user_data.

`quick_preview`: Web23:16:56.985Z y Server23:16:58.729Z, compilerError=false (version0 efímera).
Esto es compilación, **no entrega Ads**. Tag Assistant Web se conectó después a la landing Performance:
Preview correcto, consola0 y tag nuevo sin disparar ante visita/form_viewed; no se envió formulario.
Ese negativo no prueba el recorrido positivo completo ni el Server Ads en ejecución. El compilador offline
canónico conserva deployable=false y blockers operativos; no tiene apply/publish.

Un scope inexistente en el primer token request falló antes de GTM; se corrigió a
edit.containerversions para quick_preview. Un HTTP429 interrumpió la preparación después del tag45;
se respetó pausa y se continuó tras inspeccionar recibos. No hubo resultado de escritura ambiguo
ni creación duplicada. No usar esos runners privados como reconciliación automática.

## Contrato implementado

- Policy opt-in por fuente/versión/surface/origen con key, EC y activationAt; ninguna policy existente
  fue ampliada. Flag `GROWTH_MEASUREMENT_GOOGLE_ADS_ENABLED` default OFF.
- Fuente actual elegible y versión revalidadas. Contact/diagnostic/quote de riesgo low/medium y
  booking confirmado; no alta automática de contenido, aplicaciones, newsletter o soporte.
- Enqueue real+commit comercial antes del recibo; SAVEPOINT aislado. Dedup60min/replay sin recibo.
- Consent Google explícito cuatro estados, analytics/ads y GPC. Contexto legacy/malformado no
  habilita Ads ni rompe entrega comercial/Meta/UPD.
- Captura gclid/gbraid/wbraid observados, cookie propia30d y borrado en retiro/GPC; no reescribir
  cookies Google ni rejuvenecer capturedAt. Clicks en snapshot backend cifrado, no receipt/dataLayer.
- Receipt10min con UUID estable y hashes Google EC web opcionales; memoria privada browser≤10s.
  API private/no-store; estado Meetings y eventos ordinarios no conservan hashes. Getter dedicado
  alimenta user_data reservado; evento técnico excluido de forwarding GA4 y no activa Meta.
- UPD sigue sin events, delivery/outbox Meta independiente; sin destino Ads backend nuevo, migración,
  servicio, cron, IAM o bridge HubSpot nuevos.

## Verificación y límites

- Corrida focal combinada: **26 archivos /404 tests PASS** (backend, dos renderers, policy UI, CLI y GTM).
- TypeScript strict focal21 entradas fuente y declaraciones ambientales PASS; no typecheck global.
  Primer config focal omitía augmentations NextAuth; al incluirlas pasó, sin cambiar auth.
- Bundles canónicos Forms y Meetings generados; outputs ignorados. ESLint focal PASS. Bridge16 checks y attribution13 casos PASS; no submits ni bookings remotos.
- TASK-2034 lint PASS; ops:lint sin errores, con advertencias preexistentes de tasks/epics ajenas
  (stale-progress/blocker TASK-1258 y parity de épicas); no se alteró ese backlog.
- Cierre documental focal y contexto estricto PASS, enlaces locales/mirrors PASS; sin build/typecheck
  global ni release CI ejecutados en esta unidad.
- Revisión independiente: sin P0/P1 confirmado en privacidad browser/backend. Falta verificación
  funcional GTM/provider antes de proclamar conversión operativa.

Recibos privados0600: `.auth/google-ads-gtm-20261017/` (inventarios, workspaces/entities, validate/apply/
verify, bindings, logs) y journals `.auth/google-ads-agent/writes/`. No tokens, HTML provider, contacto
ni hashes se incorporan al commit. Evidencia visual de revisión se mantiene fuera del repositorio.

Comparación final por GET contra el compilador: **30 checks PASS**, 2026-10-17T23:20:31.383Z; cuerpos propios,
referencias hidratadas, tags previos preservados, única excepción del forwarder y live5/9 intactos.
La API reordena parameter y omite [] vacíos; comparación normaliza sólo esas equivalencias.

Evidencia visual fuera de Git: `/Users/jreye/Documents/google-ads-architecture-discovery-2026-10-17/`
`gtm-google-ads-web-workspace.png` y `gtm-google-ads-tag-assistant-no-conversion.png`. Se detuvo sólo
la sesión de depuración Efeonce tras verificar; no se tocó otro dominio de Tag Assistant.

Pendientes: Tag Assistant positivo/protocolo browser→Ads; habilitación efectiva EC de cuenta; release backend/renderers/bridge en WP/Think; publicación
coordinada Server→Web; policy/flag opt-in; primera ocurrencia comercial real y diagnóstico Ads.
UI de Ads verificada como jreyes y target686: checkbox «Activar Conversiones mejoradas» OFF y
«He leído y acepto los términos en nombre de mi empresa» sin marcar. No se aceptó ni guardó.
Captura `google-ads-customer-data-terms-pending.png` en la misma carpeta externa de evidencia.
La aceptación contractual exige confirmación del operador en ese paso; no se presume por el grant OAuth. Qualified/converted leads vía HubSpot/Data Manager,
binding CRM durable, UTMs agendas y dominio propio sGTM conservan unidades independientes.


## Confirmación posterior — términos aceptados

El operador autorizó expresamente «Acepta los terminos de Google ads». Se marcó y guardó la
aceptación de **Términos sobre los datos de los clientes** en cuenta6862539491, sesión
jreyes@efeoncepro.com. Panel reabierto después de guardar: **«Has leído y aceptado estos términos»**.
Registro de evidencia: 2026-10-17T21:11:30-03:00 (America/Santiago).

Captura externa: `/Users/jreye/Documents/google-ads-architecture-discovery-2026-10-17/google-ads-customer-data-terms-accepted.png`.
La observación anterior de términos pendientes es histórica y queda supersedida por esta aceptación.
Este acto no habilitó el checkbox EC, publicó GTM, encendió flags, envió conversiones ni promovió
Greenhouse a main. La habilitación y rollout continúan pendientes.

Fuentes primarias: [setup server Ads y EC](https://developers.google.com/tag-platform/tag-manager/server-side/ads-setup),
[ConsentSetting API](https://developers.google.com/tag-platform/tag-manager/api/reference/rest/v2/accounts.containers.workspaces.tags#ConsentSetting),
[tipo nativo Google](https://github.com/google/sgtm-migrator/blob/main/src/config.ts),
[parámetros internos](https://developers.google.com/tag-platform/tag-manager/server-side/internal-parameters),
[normalización EC web](https://support.google.com/google-ads/answer/13262500?hl=en),
[transaction ID](https://support.google.com/google-ads/answer/6386790?hl=en).

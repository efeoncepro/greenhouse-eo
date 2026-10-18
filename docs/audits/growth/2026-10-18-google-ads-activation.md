# Activación Google Ads y trazabilidad — 18/10/2026

**Configuración publicada y verificada; aceptación comercial E2E pendiente de tráfico real.**
El release Greenhouse previo conserva su [auditoría independiente](../releases/2026-10-18-full-develop-production-release.md).

## Alcance e identidades

Anunciante único 6862539491, acceso Ads jreyes@efeoncepro.com; manager9531478329 sólo ruta.
Cloud/API julio.reyes@efeonce.org, efeonce-group y SA GTM existente. Sin cambios OAuth, IAM, campañas,
puja ni otras cuentas. Se mantiene el ADR [Ads](../../architecture/GREENHOUSE_GOOGLE_ADS_INTEGRATION_DECISION_V1.md)
y la [arquitectura](../../architecture/GREENHOUSE_GOOGLE_ADS_MEASUREMENT_ARCHITECTURE_V1.md).

## Compatibilidad de hosts publicada

Bridge canónico 11.898 bytes, SHA256
`4250795666afcc6b54a08284f5f77919e8b754de87eb91674303abb0132559ba`.

| Host | Fuente y publicación | Readback |
| --- | --- | --- |
| WordPress efeoncepro.com | [PR1](https://github.com/efeoncepro/efeonce-public-site-runtime/pull/1), main b457e4bc49123a96b549d3027745de8b235260c0 | Installer hash-guarded, receipt consent_bridge_installed 20:10:29Z; plugin activo y serverRouting enabled |
| Think think.efeoncepro.com | [PR15](https://github.com/efeoncepro/efeonce-think/pull/15), main f63af537d0e910738a7fa7f22c893c306c6538d3 | Production dpl_EChG4gdjY5qe2tqkg5WUVKtn5Yof READY y alias exacto a las20:10:06Z |

WordPress sólo cambia el bridge; PHP idéntico SHA256
`d182015411e79db8bbaaee04b679c526a03bce9168d2b99970460450558178cd`.
Backup anterior fuera del webroot `/tmp/efeonce-consent-before-20261018-201029.tar`;
instalación atómica, guards de ambos archivos y purga de cachés. Un solo intento aceptado, sin retry.
Think cambia sólo el bridge y su query de invalidación4250795666af; build y type-check PASS.
Commit local ajeno de README y todo WIP de ambos repos preservados, sin promoverlos.

Ambos assets públicos HTTP200 y byte-idénticos. QA servida: cuatro casos UI desktop/móvil PASS,
más doce casos Google (default, grant, Ads-only, analytics-only, revoke, GPC ×dos hosts) PASS.
GPC deniega automáticamente los cuatro permisos y HubSpot puede omitir el banner. El harness inicial
esperaba ese banner incorrectamente; diagnóstico conservado, prueba corregida sin cambio de producto.
Las requests de medición fueron interceptadas:23 en la matriz Google; cero formularios/reservas,
eventos gh_ads_conversion y errores de página. Este PASS acredita consentimiento, no entrega proveedor.

## Conversiones mejoradas de la cuenta

Se aceptó el acuerdo específico de datos de clientes tras confirmación expresa de Julio
«Autorizar De acuerdo y EC con GTM». Google Tag Manager seleccionado y guardado.
Readback API posterior: acceptedCustomerDataTerms=true, effectiveEnablementSetting=ON,
conversionTrackingStatus=CONVERSION_TRACKING_MANAGED_BY_SELF, customerId6862539491.
El panel reabierto conserva checkbox EC y método GTM; Guardar deshabilitado tras persistir.
Las dos acciones continúan secundarias, ONE_PER_CLICK, ceroCLP de medición; no son ingresos.

## Vista previa funcional y negativos

Google JavaScript real del borrador Web8, entorno Preview79, en Chromium aislado: grant emite un
bridge; ad_user_data denied, permiso Google desconocido y GPC emiten cero. Cuatro casos PASS,
cero errores JavaScript y todo transporte de medición interceptado con204 local. Sólo se descargaron
los scripts Google. El SDK serializa el canal reservado como claves anidadas user_data con metadata,
no como un string de objeto; el parámetro em no es un requisito del transporte GA4 de entrada.

A las20:20:59Z y20:31:58Z se despacharon dos probes técnicos al Server Preview12 propio, con dummy hash no
personal y tres supresiones: allowed0, key no comercial y transaction ID inválido. GA4 Client lo reclamó
y reconstruyó user_data como objeto con metadata/mode. El depurador mostró ninguna etiqueta activada
y ninguna solicitud HTTP de salida. La excepción del bridge evita forwarding GA4; tampoco se disparó
Meta ni Conversion Linker. No se ejecutó un positivo Ads ni se envió una conversión a proveedores.

## Identidad nativa HubSpot configurada

Portal48713323 y app33235280 verificados por resolver canónico; origen Performance y destino existente
fdst-563c7c71-fda6-4fde-a327-5786986b61ee, formulario89652ccf-8393-4361-a650-878982132cfe.
Propiedad ef_greenhouse_submission_id creada como string/text/formField en el grupo existente.
PATCH nativo único añade un campo oculto y opcional como14º; los13 campos/grupos comerciales y
settings previos permanecen exactos. HubSpot añadió dos defaults sólo al grupo nuevo (default_group
y richTextType text): se reconcilió por GET y10 pruebas del guard, sin repetir PATCH.
configureHubSpotSubmissionTracing activó submissionIdProperty mediante CAS del mapping fresco;
versión de fuente, destinos, políticas y demás mapping preservados. Readback independiente
CONFIG_VERIFIED: propiedad, formulario y mapping true. No se crearon contactos ni envíos.
La identidad nativa de una ocurrencia sigue pendiente del próximo envío real; no hay backfill.

## Publicación GTM, políticas y recibos Meta

La comparación API final acreditó **173/173 invariantes estructurales**, no173 pruebas unitarias.
Incluye preservación de clientes, transforms, variables y tags existentes; el forwarder GA4 sólo
añade la excepción del evento Ads. Compiler sin errores y árboles congelados verificados antes
de publicar: **Server10 primero,20:33:29.520Z**, fingerprint1792355562526; **Web6 después,
20:33:47.333Z**, fingerprint1792355588730. Ambos readbacks live exactos; snapshots canónicos
generados después de publicar. La evidencia JSON adjunta conserva hashes de ambos árboles.

Server10 incorpora captura de recibo en el sender Meta existente (template3/tag6), sin un segundo
sender ni cambio de triggers PageView/backendLead. Captura sólo el evento Lead elegible del cliente
backend propio con identidad/attempt válidos; PageView conserva su comportamiento. Google rechazó
galleryReference en el PUT sin mutar. El update válido bifurcó la plantilla local y normalizó el
formato JSON/espacios: código y permisos equivalentes verificados antes del único update aceptado
del tag. Se conservaron token, destino, payload y triggers existentes. Primer recibo Graph pendiente;
su ausencia no autoriza replay. Builder Meta16/16 y guard HubSpot10/10 PASS.

Dos políticas, ambas revisión2, publicadas por el comando canónico tras validate/draft/review y
readback independiente; activationAt2026-10-18T20:35:00.000Z:

| Fuente | Política / revisión publicada | Destinos previos preservados |
| --- | --- | --- |
| Performance, formulario comercial | 5266be6e-9340-4a63-8255-151c30812b88 / 0a2cefdc-febc-46d7-be87-38571cece549 | Meta |
| Discovery, reserva confirmada | a3de5d64-9df7-4102-b36e-fbc238135f0e / 07f0d10b-2bfa-480b-9000-14ec1f57a609 | Meta y Google UPD |

Ningún otro formulario/scheduler queda inscrito por inferencia. Tras publicación, SDK Google LIVE
4/4 y matriz de consentimiento de hosts12/12 PASS, con transporte interceptado. Plan offline local
actualizado a baselines6/10 y15/15 pruebas PASS; no cambia el código de producción del releaseEC.

## Activación Production y verificación posterior

Un solo flip: GROWTH_MEASUREMENT_GOOGLE_ADS_ENABLED de ausente a true en Production,
literal releído20:36:20.421Z. CAPTURE permanece true. El código lector y comportamiento ya estaban
en mainEC liberado: no se desplegó el working tree local ni otro SHA. Un solo redeploy del deployment
F13 produjo **dpl_ER5v1bwisSTkfWE6BCd7jfJNLxvk**, creado20:36:43.849Z. La CLI terminó0;
readback20:43:28.677Z: **READY**, mainEC exacto, proyecto correcto y alias de producción a ER5.
Presencia de la clave en env y build.env más literal true del proyecto y cronología acreditan la
cadena de configuración. La API expone nombres de claves, no el booleano congelado; por sí sola
esta cadena no acredita una conversión ejecutada. El manifest previo continúa released; esto es
configuración complementaria del mismo código liberado, sin nuevo push a main ni nuevo SQL.

Verificación posterior:

- Health /api/auth/health HTTP200 a20:43:37.896Z, ligado al SHA por el alias comprobado; el endpoint no expone SHA.
- Canario admin7/7 PASS. Forms/Meetings/CTA servidos, contrato Ads en los dos bundles pertinentes,
  CORS y equivalencia byte-a-byte alias/immutable PASS20:44:01Z. La URL immutable exige protección
  Vercel: el primer GET encontró302 hacia autenticación; el segundo usó el resolver canónico de bypass
  sólo en ese host y sin persistir secretos. No fue un fallo de producto ni se cambió la protección.
- Dos POST inválidos, Forms y Meetings, HTTP400/private,no-store y sin submission/recibo Ads: PASS.
  Fallan validación antes de captcha, lookup proveedor y escrituras comerciales.
- Watchdog dry-run sin Teams: tres señales conocidas ok;6/6 recursos, drift0 y data_missing0.
  Ops/Auth/Artifact conservan777 por change-gate legítimo y árbol completo idénticoEC; demás recursosEC.
- Snapshot-check Web6/Server10 sin drift. Ningún canario creó contacto, lead, agenda o conversión.

Rollback coordinado si surge una regresión: deshabilitar primero el prepare Ads (flag false más
redeploy gobernado, sin replay), preservar destinos Meta/UPD y revisar las dos políticas con CAS.
Restaurar Web5/Server9 juntos sólo si es necesario y tras revisar drift: Server9 también retira la
instrumentación de recibos Meta. Think rollback dpl_9duvomUbfXim8tkv6Hji4fuP6LHi; WordPress dispone
del backup hash-guarded citado arriba. Las expansiones SQL aditivas y propiedad técnica HubSpot pueden
permanecer. Un rollback no borra una conversión ya transmitida ni autoriza reenviarla.

## Evidencia y límites

Evidencia privada0600 en `.auth/google-ads-activation-20261018/`, sin credenciales/PII en este documento.
EC se acredita por ec-after-save.json y captura ec-enabled.jpg. Hosts: wp-deploy-receipt.json,
think-progress.json, consent-ui-live-result.json y host-google-consent-result.json.
No se fabricaron GCLID/braids, contactos, leads, agendas o conversiones para llenar evidencia.
La primera conversión comercial, recepción y atribución requieren tráfico real y su observación.

Evidencia pública saneada: [JSON de activación](2026-10-18-google-ads-activation.evidence.json).
TASK-2034 sigue parcial; los hitos futuros de CRM/multiorganización conservan su alcance separado.

Lectura PostgreSQL READ ONLY20:44:18.926Z, sólo los dos pares fuente/surface autorizados, ventana
20:35:00Z→snapshot: cero ocurrencias, conversiones, entregas y recibos nuevos en ambos. El canal online
Ads no tiene recibo de recepción consultable en esas tablas. Este conteo explica la evidencia pendiente;
no establece fallo proveedor. Credenciales, OAuth, IAM y demás cuentas conservan sus bindings.

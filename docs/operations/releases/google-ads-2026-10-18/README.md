# Paquete previo al release — Google Ads, 18-10-2026

**Preparado para revisión; NO habilitado para ejecutar el release.** Pedido del operador:
validar y hacer commit propio, sin publicar GTM ni desplegar. No hay push, PR, merge,
workflow de publicación, cambio de flag, nueva política publicada ni envío Ads en esta unidad.

[Evidencia y veredicto](../../../audits/growth/2026-10-18-google-ads-prerelease-validation.md) ·
[Manifest](manifest.json) · [Propuestas de políticas](policy-proposals.json) ·
[Manual canónico](../../../manual-de-uso/growth/activar-conversiones-google-ads.md) ·
[ADR existente](../../../architecture/GREENHOUSE_GOOGLE_ADS_INTEGRATION_DECISION_V1.md).

## Alcance y candidato

- Código Ads: `c92424961`; términos: `8b3217a91`. Ambos están contenidos en `origin/develop`.
- Checkout probado al inicio: `b8cdf8b1f5aa0c891a978386b89bad816444cf36`.
  La entrega de esta validación agrega herramientas/documentos; no fija un merge SHA futuro.
- Base main releída con fetch: `9690efad0c1b9d70d9b168d41131857e686b0f81`.
- La diferencia neta del candidato frente a main es **1.406 archivos**, no sólo Ads.
  El preflight clasifica `.github/workflows/gtm-drift.yml` como `cloud_release` y devuelve
  `requires_break_glass`. No se aplicó override ni se auditó/autoriza aquí ese lote completo.
- El candidato local no está en remoto: GitHub devolvió422 al consultar el SHA, sin CI ni
  Playwright smoke ejecutados para él. Cero workflows **no es CI aprobado**.

Antes de ejecutar: seleccionar el candidato y alcance reales con el control plane de release,
publicarlo en el flujo autorizado, exigir CI/smoke de ese SHA y repetir preflight. Este paquete
no autoriza cherry-picks, promoción completa, bypass ni despliegues directos.

## Configuración exacta preparada

| Superficie | Preparado / leído | Publicado o efectivo |
| --- | --- | --- |
| Ads | `6862539491`, usuario `jreyes@efeoncepro.com`; owner propio | Términos aceptados; EC `OFF` |
| Cloud | `efeonce-group`, `julio.reyes@efeonce.org` | Sin cambios IAM/secretos |
| GTM Web | `GTM-NGHPGRLZ`, workspace8, bridge Ads | Live5 |
| GTM Server | `GTM-K2X4ZTTK`, workspace12, Ads/Linker y excepción GA4 | Live9 |
| Solicitud comercial | Acción7852486523, `AW-18432951465/NnDACPveraAdEKmJwtVE` | Secundaria, WEBPAGE, ONE_PER_CLICK |
| Agenda confirmada | Acción7852487186, `AW-18432951465/kLr8CJLkraAdEKmJwtVE` | Secundaria, WEBPAGE, ONE_PER_CLICK |

## Artefactos y compatibilidad de hosts

El manifest registra SHA-256/tamaño del bridge canónico y de ambos bundles construidos.
Copias de revisión fuera de Git:
`/Users/jreye/Documents/google-ads-release-package-2026-10-18/`.
No son un instalador ni una versión de producción del scheduler site-loader; esa publicación
debe usar su contrato/build/release canónicos, con icons/CSS/manifest correspondientes.

El bridge actual de **ambos hosts** devolvió200 y SHA
`4bbd77b35fdb60b128712bf4e00d64dd37815f0d93f5434868d559264f71b28a`, sin los cuatro
atributos Google nuevos. Las copias locales de esos hosts tampoco coinciden con el canónico.
Es dependencia de rollout pendiente, no permiso para instalarlas en este turno.

Destinos de la copia canónica `scripts/measurement/hubspot-consent-bridge.js`:

- WordPress: plugin `eo-measurement-consent/assets/consent-bridge.v1.js`.
- Think: `public/measurement/consent-bridge.v1.js`.

Después de actualizar mediante cada flujo autorizado: verificar bytes/versión servidos tras
cache purge, consentimiento inicial/otorgado/revocado/GPC, renderers nuevos y ausencia de errores.
No encender Ads con estos assets incompatibles. No se requiere migración, cron o IAM nuevo para
el delta Ads; las otras migraciones del lote general conservan sus gates independientes.

## Propuestas de políticas — sin apply

Inventario actual:17 fuentes;14 elegibles por tipo/riesgo según el resolver canónico local,
contrastadas con catálogo administrativo de producción. Elegibilidad técnica no aprueba intención.
Los16 render contracts de Forms responden200 y coinciden con las versiones del catálogo.

Primera ventana propuesta: **Diagnóstico Performance + agenda Discovery**, con revisión humana
de intención antes de activar. `policy-proposals.json` conserva sus destinos/mappings actuales:
Performance sigue `meta`; Discovery sigue `meta` + `google_upd`. Sólo se propone agregar
`googleAds`, con EC y key correspondiente. No se publicó ni modificó ninguna revisión.

Antes de aplicar, releer scope/sourceVersion/head publicado, sustituir `activationAt` por la
ventana acordada y generar una idempotencyKey nueva para la operación definitiva. Los UUID y
fechas de este artefacto pertenecen a propuestas offline nunca despachadas. Validar el comando
contra el backend compatible; luego draft→review→publish, con CAS y readback por cada paso.
No reutilizar una clave de un comando ya enviado si cambia su contenido.

Quedan fuera del primer grupo el resto de fuentes. Exclusiones de tipo confirmadas:
`efeonce-lead-gen-web` es **lead_magnet**, al igual que ambos ebooks; no alterar su clasificación
para medir Ads. Grader es elegible por tipo diagnóstico, pero no entra automáticamente en el
primer grupo. Contacto genérico requiere revisar intención comercial y separar soporte.

## Orden de activación, sólo después de autorización

1. Resolver el alcance/CI/preflight del candidato y coordinar backend + Forms + Meetings.
   Mantener deshabilitada la captura Ads durante compatibilidad de hosts.
2. Distribuir bridge y renderers compatibles por los flujos de WordPress/Think; releer los
   assets servidos. Preparar hashes/rollback antes de cada publicación.
3. Releer acciones, heads/fingerprints y conflictos GTM; repetir Preview funcional/protocolo.
   `quick_preview` sólo certifica compilación. El harness local no ejecuta el SDK de Google
   ni el GA4 Client de sGTM. No introducir conversiones ficticias para cerrar ese pendiente.
4. Con Preview y aprobación explícita, publicar **Server primero**, con la excepción que impide
   reenviar `gh_ads_conversion` a GA4; luego Web. Meta/UPD deben conservar sus canales.
5. Verificar EC efectiva en la cuenta686, publicar sólo políticas revisadas y después encender
   `GROWTH_MEASUREMENT_GOOGLE_ADS_ENABLED` mediante la configuración/deploy gobernados.
   `GROWTH_MEASUREMENT_CAPTURE_ENABLED` debe permitir la preparación; revisar su valor servido.
   No cambiar flags de Meta/UPD/retención por asociación.
6. Ejecutar `pnpm gtm:snapshot`, commitear ambos snapshots live y releer versiones/entidades.
7. Observar una solicitud y reserva reales consentidas; correlacionar ocurrencia/transactionId,
   acción, salida del tag y diagnóstico Ads. Verificar HubSpot en su ledger/recibo independiente.
   Un tag fired o HTTP200 no acredita procesamiento ni atribución. Mantener acciones secundarias.

## Rollback

- Ante discrepancia de consentimiento, identidad, hash/PII fuera del canal reservado, duplicación
  o afectación comercial: apagar flag Ads y deshabilitar su opt-in por policy. Conservar flags
  de Meta/UPD y retención; registrar exactamente la última ocurrencia que pudo enviarse.
- Detener primero la emisión nueva; restaurar sólo entidades/versiones propias con control de
  fingerprints. No restaurar ciegamente todo Server9 si existen publicaciones posteriores.
- Mantener la excepción de forwarding GA4 mientras puedan llegar eventos bridge residuales.
- El bridge y los renderers anteriores requieren copias de rollback del host al momento de
  la publicación. Una reversión no elimina conversiones ya enviadas ni habilita backfill.
- Sin replay de contactos/reservas históricas; sin rotaciones de OAuth para revertir medición.

## Veredicto de preparación

**CONDITIONAL PASS para el paquete Ads previo al release; release general BLOCK.** Validaciones
locales/API terminadas con sus límites. El gate de protocolo GTM real, EC efectiva, compatibilidad
servida, CI del candidato y el alcance del lote general siguen abiertos. No se declara Ads operativo.

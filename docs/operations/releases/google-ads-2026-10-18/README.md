# Paquete previo al release — Google Ads, 18-10-2026

**Actualización posterior al release —18/10:** GTM Web6/Server10 publicado, EC ON y políticas
Performance/Discovery rev2 publicadas; flag Production true leído20:36:20Z, companion Vercel del
mismo mainEC READY con alias/SHA y cadena de configuración verificados20:43:28Z. [Activación y evidencia vigente](../../../audits/growth/2026-10-18-google-ads-activation.md).
Primera ocurrencia, recepción positiva y atribución pendientes. Los cortes siguientes son históricos.


Cobertura posterior acotada por Julio: [sólo formularios comerciales](../../../audits/growth/2026-10-18-commercial-forms-measurement-coverage.md).
Doce propuestas DRY_RUN validadas sin publicar; Lead Gen - Web necesita corrección canónica de tipo.
No se crean acciones para ebooks/careers/newsletter ni se ejecuta el plan previo por leer este dossier.

**Checkpoint 18/10, 19:51Z — release de código RELEASED; Ads sin activar.** El operador autorizó
promover todo develop y confirmó la excepción específica de batch a las 18:53:53Z. PR #256 mergeado:
main `ec317c928fffcb919d71bdb62821b80280af2347`, árbol idéntico al candidato 77763331.
CI/Deep/smoke de main PASS; orquestador [39159325900](https://github.com/efeoncepro/greenhouse-eo/actions/runs/39159325900) SUCCESS, actualizado a las 19:51:35Z.
Manifest `ec317c928fff-33c067f4-bc76-4a21-a5e0-a37a99ac726b` released a las 19:51:25.548Z,
releído en PostgreSQL a las 19:51:44.315Z. Vercel Production `dpl_F13UyAaTEjkcttFKc7aZjjtgTFNt`
READY y alias releídos a las 19:49:59Z; health HTTP 200 PASS a las 19:49:44Z; watchdog final `ok`, 6/6 runtimes,
`drift=0` y `dataMissing=0`. Canario admin 7/7, bundles Forms/Meetings/CTA y dos negativos `private, no-store`
PASS a las 19:06Z, sin lead ni reserva real. Schema de recibos aplicado.
[Auditoría de cierre y límites](../../../audits/releases/2026-10-18-full-develop-production-release.md).

Cloud Run final: seis recursos Ready y cinco servicios con el 100% del tráfico. Ops/Auth/Artifact retienen
77763331 con árbol completo idéntico a main; Cost 00699-9c2, ICO 00511-5fm y HubSpot 00200-6t4 sirven
main. La equivalencia es de árbol completo; no se deduce únicamente del skip del change-gate.

El flag Ads sigue ausente/OFF en Production (readback a las 19:49:57.865Z). Sin publicación GTM ni nuevas políticas Ads;
opt-in por fuente, compatibilidad de hosts, Preview funcional, EC y resultado positivo pendientes.
El pedido inicial de esta preparación autorizaba sólo validación/commit, sin deploy; las secciones
históricas siguientes conservan aquel alcance y se leen bajo este checkpoint posterior.

[Evidencia y veredicto](../../../audits/growth/2026-10-18-google-ads-prerelease-validation.md) ·
[Manifest](manifest.json) · [Propuestas de políticas](policy-proposals.json) ·
[Manual canónico](../../../manual-de-uso/growth/activar-conversiones-google-ads.md) ·
[ADR existente](../../../architecture/GREENHOUSE_GOOGLE_ADS_INTEGRATION_DECISION_V1.md).

## Corte histórico — revisión ampliada del candidato 89d70ec13, 18/10

[Revisión del lote y CI](../../../audits/releases/2026-10-18-candidate-89d70ec13-review.md):
candidato fijo89d70ec13 ya remoto,1.445 archivos netos revisados (el corte anterior tenía1.406).
CI con build PASS; Deep falló por timeout agregado del corpus de pricing. Corrección local con
138 casos instrumentados PASS; revalidación remota pendiente del push autorizado a una rama
codex de validación, sin develop/main ni deploy. Se prepara bloqueo Vercel explícito para esa
rama; sus previews también deben quedar deshabilitados antes de publicar el commit. El
[manifest de revisión](candidate-89d70ec13-review.json) conserva fuentes y resultados separados.

**Schema reparado con autorización específica:** el worker compartido ya servido devolvía502
por columnas de recibos ausentes. Se aplicaron las dos expansiones versionadas HubSpot/Meta,
sin nuevo deploy ni publicación GTM; columnas/constraints/triggers verificados. El scheduler
existente respondió200 y las dos submissions quedaron delivered al ledger: cero destinos directos
habilitados, sin envío de proveedor. La identidad nativa HubSpot
y la recepción Graph no quedan certificadas por este resultado. Los gates de activación Ads y
la autorización de promoción del lote seguían pendientes en ese corte. La autorización posterior
y el despliegue Greenhouse se registran en el checkpoint superior; Ads conserva sus gates.

## Corte inicial conservado — anterior a la revisión ampliada

- Código Ads: `c92424961`; términos: `8b3217a91`. Ambos están contenidos en `origin/develop`.
- Checkout probado al inicio: `b8cdf8b1f5aa0c891a978386b89bad816444cf36`.
  La entrega de esta validación agrega herramientas/documentos; no fija un merge SHA futuro.
- Base main releída con fetch: `9690efad0c1b9d70d9b168d41131857e686b0f81`.
- La diferencia neta del candidato frente a main es **1.406 archivos**, no sólo Ads.
  El preflight clasifica `.github/workflows/gtm-drift.yml` como `cloud_release` y devuelve
  `requires_break_glass`. En ese corte aún no se había auditado el lote completo; la revisión
  ampliada de arriba documenta la auditoría posterior. No se aplicó override ni se autoriza la promoción.
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

## Veredicto actual y corte de preparación

La preparación Ads obtuvo **CONDITIONAL PASS** local/API con sus límites. El corte inicial dejó
release general BLOCK; la autorización posterior y promoción completa se registran arriba.
El release general de código está **RELEASED**, con CI/Deep/smoke, orquestador, manifest,
salud y watchdog finales verificados. Los canarios confirman el contrato servido, no una conversión.
Protocolo GTM real, EC efectiva, compatibilidad servida de hosts y opt-ins Ads siguen abiertos.
**Rollout Ads pendiente**: no se declara Ads operativo ni recepción/atribución publicitaria acreditadas.

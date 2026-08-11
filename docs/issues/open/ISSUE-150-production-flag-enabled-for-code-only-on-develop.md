# ISSUE-150 — Flag prendido en producción para código que sólo existía en `develop`

## Ambiente

production

## Detectado

2026-08-11, por el operador. Notó que seguían llegando postulaciones y pidió revisar; la consulta a
`greenhouse_core.asset_scan_results` mostró cinco CV reales en cuarentena con veredicto `error`.

Vale registrar cómo NO se detectó: el agente había declarado el rollout verificado y estaba esperando la
"confirmación pasiva" de la primera postulación productiva. Esa confirmación llegó — y era una falla. Durante
89 minutos nadie miró.

## Síntoma

Cinco candidatos reales postularon a `EO-OPN-0061` y `EO-OPN-0009` entre las 11:31 y las 13:00 (America/Santiago).
Todos vieron el mensaje de éxito. **Ninguno de sus currículums quedó adjunto**: los cinco fueron a cuarentena con
veredicto `error` y finding `scanner_http_error` — "El servicio de scan respondió HTTP 403".

Los logs del Cloud Run son inequívocos:

```
403 https://clamav-y6egnifl6a-uk.a.run.app/scan
The request was not authenticated. ... Empty Authorization header value.
```

El comportamiento del portal fue **correcto**: fail-closed por diseño, y respuesta genérica al candidato para no
revelarle a un atacante que su archivo fue rechazado. Lo que estuvo mal fue prender el flag.

## Causa raíz

**Producción corre `main`. El código que el flag activa vivía sólo en `develop`.**

- `main` = `ee0d568b8`; `develop` = `5ff9431c7`.
- Los seis commits de `TASK-1378` —incluido el que le agrega el header `Authorization` al adapter y el que
  deriva la audiencia OIDC— están únicamente en `develop`.
- `git show origin/main:src/lib/storage/asset-scan/clamav-http.ts | grep -c authorization` → `0`.

Producción estaba ejecutando el adapter original de `TASK-1362`, que hace `fetch` **sin ninguna credencial**.
Contra un Cloud Run con `--no-allow-unauthenticated`, eso es 403 garantizado. El scanner nunca tuvo la culpa; el
IAM tampoco: `greenhouse-portal@` siempre tuvo `roles/run.invoker`, y se verificó después del incidente.

### Por qué la verificación previa no lo atrapó

El agente afirmó haber "cerrado el último desconocido" antes de prender, corriendo el escaneo compuesto con las
env vars de producción bajadas por `vercel env pull`. Esa prueba era **inválida por dos motivos a la vez**, y
ninguno de los dos era visible en su resultado verde:

1. Corrió en el proceso local del agente, no en el runtime de Vercel: distinta resolución de credenciales,
   distinta salida de red, distinta identidad efectiva.
2. **Corrió el código del working tree (`develop`), no el que está desplegado en producción (`main`).** Aunque el
   punto 1 se hubiera resuelto, esta prueba jamás podría haber detectado el problema: probaba código que
   producción no tiene.

Usar las variables de producción hace que una prueba *parezca* de producción. No lo es.

## Impacto

- 5 candidatos reales (`EO-APP-0075` a `EO-APP-0079`) postularon sin que su CV quedara adjunto, durante 89 minutos.
- Ninguno perdió su archivo: la cuarentena preserva los bytes por diseño, y el `metadata_json` del asset conserva
  `applicationId`, `candidateFacetId` e `identityProfileId`.
- Sin impacto en otros dominios: el flag sólo gatea el puerto de escaneo.

## Solución aplicada

1. **Contención** — `vercel env rm ASSET_MALWARE_SCAN_ENABLED production` + redeploy. Verificado que
   `greenhouse.efeoncepro.com` quedó aliaseado al deployment sin el flag. Vuelve a `structural`-only, que nunca
   se apagó.
2. **Recuperación** — `scripts/hiring/recover-scanner-403-quarantined-cvs.ts`: baja los bytes, re-escanea con el
   scanner ya operativo, marca el `error` previo como `false_positive` (el archivo nunca fue el problema),
   registra el veredicto nuevo y adjunta el CV a su postulación. **5/5 recuperados y limpios.** El signal
   `storage.asset_scan.open_quarantine` volvió a steady 0.

## Solución pendiente

El flag **no se vuelve a prender en producción hasta que el código esté en `main`** vía el release control plane.
No es opcional ni acelerable: es la condición que faltaba.

## Prevención

La lección no es "revisar mejor". Es que **una prueba con las env vars de producción no es una prueba de
producción**, y que el agente la trató como equivalente. Dos guardrails:

1. **Invariante duro, documentado en el flag ledger:** antes de prender un `*_ENABLED` en Production, verificar
   que el código que lo LEE existe en `main` — no en el working tree, no en `develop`.
   `git show origin/main:<archivo> | grep <símbolo>`. Si no está, el flag no se prende: se promueve primero.
2. **Chequeo mecánico** en `pnpm flags:audit`: para cada flag prendido en Production, confirmar que su código
   lector está presente en `origin/main`. Un flag ON sobre código ausente es un fail-closed esperando gente.

## Referencias

- Task: `docs/tasks/in-progress/TASK-1378-clamav-malware-scanner-provisioning-decision.md`
- Recuperación: `scripts/hiring/recover-scanner-403-quarantined-cvs.ts`
- Ledger: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- Runbook: `docs/manual-de-uso/plataforma/operar-scanner-malware-assets.md`

# ISSUE-150 — Flag prendido en producción para código que sólo existía en `develop`

> **Delta 2026-08-11 (mismo día, segundo fallo):** este issue ya no documenta un incidente sino un **bug class**:
> prender `ASSET_MALWARE_SCAN_ENABLED` sobre un camino de credencial jamás verificado desde el runtime real.
> El flag falló DOS veces el mismo día por dos causas distintas. La segunda está en § "Segundo fallo". Causa raíz
> encontrada y corregida en código (pendiente de llegar a `main`).

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

## Segundo fallo — 2026-08-11, post-release (`scanner_auth_failed` en 21 ms)

Con el código del adapter YA en `main` (release `64c80f61d4a4`, release_id
`64c80f61d4a4-8a2e7278-9260-43ed-bd2e-963e5002e2ad`, run `31530324227`), el flag se prendió de nuevo y volvió a
fallar: 1 CV real (Brandon Valdés) en cuarentena con finding `scanner_auth_failed` en **21 ms** — demasiado rápido
para ser red. La credencial nunca se obtuvo. Recuperado con el mismo script (filtro generalizado a
`scanner_auth_failed`/`scanner_unreachable`).

### Causa raíz (encontrada 2026-08-11, sesión siguiente)

**Production corre con `GCP_AUTH_PREFERENCE="service_account_key"` + `GOOGLE_APPLICATION_CREDENTIALS_JSON`**
(postura transicional deliberada desde hace ~130 días; el cutover a WIF-only es `TASK-800`, aún to-do). Staging no
tiene esa preferencia y resuelve por WIF.

La cadena exacta en producción:

1. `shouldUseWorkloadIdentity()` → `false` (la preferencia explícita desactiva WIF).
2. `resolveGoogleIdTokenProvider()` en `src/lib/google-credentials.ts` **no tenía rama para service account
   key** — el camino de ID tokens (TASK-1378) sólo contemplaba WIF, impersonación ambiente y ADC pelada.
3. Caía a impersonación ambiente: `new GoogleAuth({...}).getClient()` exige ADC — **inexistente en Vercel** →
   excepción inmediata (los 21 ms) → fail-closed `scanner_auth_failed`.

La ironía operativa: la key de `greenhouse-portal@` estaba EN el runtime de producción y puede acuñar ID tokens
directamente (es el mismo source que BigQuery/GCS usan en producción todos los días). El código simplemente no la
usaba para ese camino.

### Por qué staging pasó el gate end-to-end y producción no

No era "staging tiene algo más": staging **no tiene** `GCP_AUTH_PREFERENCE`, así que tomó la rama WIF, que sí
existía. El gate de staging validó un camino de credencial que producción tiene deshabilitado por diseño. Dos
environments, dos ramas de código distintas, una sola probada.

### Fix aplicado (código, 2026-08-11)

- `resolveGoogleIdTokenProvider()` ahora enruta por `getGoogleIdTokenProviderPlan()` (exportado y testeable sin
  red): `wif` → `service_account_key` → `ambient_impersonated` → `ambient_adc`, alineado con
  `getGoogleCredentialSource()`. La rama nueva usa `createGoogleAuth({ env }).getIdTokenClient(audience)`.
- Tests unitarios con el shape EXACTO de Production (preferencia + key + WIF configurado-pero-desactivado) y el
  shape de staging.
- **Endpoint de diagnóstico `GET /api/internal/health/scanner-auth`** (guard: `CRON_SECRET` o tenant agency):
  acuña el ID token EN el runtime donde corre y reporta plan/diagnóstico/claims sin exponer el token; con
  `?probe=scan` hace además un POST real a `/scan` con bytes limpios (no toca el path de uploads ni puede crear
  cuarentenas). Es la verificación "desde el runtime de producción" que faltó dos veces.

### Verificación (2026-08-11, local con credencial REAL de producción)

Sanity ejecutado con la SA key bajada de Vercel Production (la identidad del runtime, **no** la ADC del
operador), pasando por el código nuevo: plan `service_account_key`, token acuñado en 120 ms con
`aud=https://clamav-y6egnifl6a-uk.a.run.app` y `email=greenhouse-portal@efeonce-group.iam.gserviceaccount.com`;
el Cloud Run lo aceptó: bytes limpios → `{"status":"ok"}`, EICAR → `{"status":"found"}`. Esto confirma causa
raíz, permiso de invoker y fix. Lo único que NO prueba es el parsing de la env var dentro del runtime Vercel —
eso lo cierra el endpoint de diagnóstico en producción.

## Solución pendiente

1. ~~El fix + endpoint de diagnóstico deben llegar a `main` vía el release control plane.~~ **CUMPLIDO
   2026-08-11 23:10Z** — release `a90951dba3b7-73da976e-f460-4241-8708-5772421fa49d` (run `31544667630`,
   PR #188, manifest `released`, pre-empción completa: `decision=ship` sin marker ni bypass).
2. ~~En producción: `GET /api/internal/health/scanner-auth?probe=scan` debe responder `mint.ok=true` y
   `probe.ok=true`.~~ **CUMPLIDO 2026-08-11 23:15Z** — respuesta desde `greenhouse.efeoncepro.com`
   (`version=a90951d`): `credentialPlan=service_account_key`, `mint.ok=true` en 53 ms con
   `email=greenhouse-portal@efeonce-group.iam.gserviceaccount.com` y `aud` del scanner, `probe.ok=true`
   con `scanStatus=ok` en 100 ms. La rama nueva funciona EN el runtime de producción.
3. **PENDIENTE (único paso restante):** prender `ASSET_MALWARE_SCAN_ENABLED` en Vercel Production +
   redeploy, mirando la primera postulación real. El agente no pudo ejecutarlo: el clasificador de
   permisos de la sesión bloqueó `vercel env add/ls/pull` en ese momento. Comandos exactos para el
   operador:

   ```bash
   vercel env add ASSET_MALWARE_SCAN_ENABLED production
   # valor: true
   ```

   ```bash
   vercel redeploy $(vercel ls greenhouse-eo --scope efeonce-7670142f 2>/dev/null | grep -m1 Production | awk '{print $2}') --scope efeonce-7670142f
   ```

   Verificación post-flip: el mismo endpoint de diagnóstico debe mostrar `flagEnabled=true`, y la
   primera postulación real debe registrar `scanner=structural+clamav-http` en `asset_scan_results`.

## Prevención

La lección no es "revisar mejor". Es que **una prueba con las env vars de producción no es una prueba de
producción**, y que el agente la trató como equivalente. Dos guardrails:

1. **Invariante duro, documentado en el flag ledger:** antes de prender un `*_ENABLED` en Production, verificar
   que el código que lo LEE existe en `main` — no en el working tree, no en `develop`.
   `git show origin/main:<archivo> | grep <símbolo>`. Si no está, el flag no se prende: se promueve primero.
2. **Chequeo mecánico** en `pnpm flags:audit`: para cada flag prendido en Production, confirmar que su código
   lector está presente en `origin/main`. Un flag ON sobre código ausente es un fail-closed esperando gente.
3. **(Del segundo fallo)** Toda prueba de credencial vale sólo para la RAMA de credencial que ejercita. Si los
   environments difieren en `GCP_AUTH_PREFERENCE` (o cualquier selector de source), el gate de staging NO cubre
   producción. Verificación canónica: el endpoint `GET /api/internal/health/scanner-auth?probe=scan` corrido en
   CADA runtime donde el flag vaya a prenderse, antes de prenderlo.

## Referencias

- Task: `docs/tasks/in-progress/TASK-1378-clamav-malware-scanner-provisioning-decision.md`
- Recuperación: `scripts/hiring/recover-scanner-403-quarantined-cvs.ts`
- Ledger: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- Runbook: `docs/manual-de-uso/plataforma/operar-scanner-malware-assets.md`

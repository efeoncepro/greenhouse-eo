# TASK-1507 — Globe Internal Front Door (Global ALB + domain cutover)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-028`
- Status real: `Front door vivo y verificado: globe.efeoncepro.com sirve por ALB con cert ACTIVE, ingress endurecido; IaC de servicios sigue en TASK-1508`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `none`
- Branch: `task/TASK-1507-globe-internal-front-door-alb-terraform`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Implementar el front door internal-only de Efeonce Globe que decidió ADR-004 (`TASK-1506`): un Global External
Application Load Balancer + serverless NEG (`southamerica-west1`) hacia `globe-studio-internal`, certificado
administrado y HTTP→HTTPS, para servir `globe.efeoncepro.com`; actualizar `GLOBE_PUBLIC_BASE_URL` y el redirect-URI
allowlist del broker OAuth de Greenhouse; y endurecer el ingress del web a `internal-and-cloud-load-balancing`.
`globe-api-internal` queda IAM-private con audience `run.app`, sin custom domain ni exposición browser. La adopción
brownfield de los servicios Cloud Run y la reconciliación del workflow de deploy se separan en `TASK-1508`.

## Delta 2026-07-21 — baseline recalibration pre-execution

Discovery verificó el runtime y la doc vigentes antes de ejecutar. Cuatro supuestos de la spec original
quedaron desactualizados o incompletos; se corrigen acá y en el cuerpo, sin cambiar el alcance:

1. **`maxScale` ya no es 1.** `TASK-1465` (persistencia durable) está **complete** y limpió el gate de HA
   (ADR-004 §Delta 2026-07-21). Ambos servicios corren **`maxScale=3`** verificado en vivo. El invariante
   correcto de esta task es **"no toca `maxScale`"** (queda como está), no "preserva 1". Gobernar ese valor
   por IaC sigue siendo `TASK-1508` (el workflow hardcodea `--max-instances=1`).
2. **`compute.googleapis.com` NO está habilitada** en `efeonce-globe` (verificado: `PERMISSION_DENIED`).
   Es prerequisito de todo el front door y se agrega a `local.enabled_services` en el Slice 1.
3. **Open Question 1 resuelta: el redirect allowlist se administra por *seed script*, no por API/command.**
   No existe route admin de OAuth clients (sólo `sister-platform-bindings`). Pero el seed vigente
   (`scripts/seed-globe-internal-pilot.ts`) **no sirve tal cual** para esto: pasa `redirectUris: [uri]`
   (reemplaza el array → borraría el `run.app`) y hace `rotateToken: true` (rotaría el client secret y
   rompería el SSO vivo). El Slice 3 extrae la **primitive canónica aditiva** en el broker + un script
   delgado que la invoca — reusable luego por route/Nexa (Full API Parity), no lógica dentro de un script.
4. **El ingress NO es drift-trap del workflow.** `deploy-internal.yml` no pasa `--ingress`, así que el
   endurecimiento del Slice 4 sobrevive redeploys del workflow; el drift-trap conocido es `maxScale`.

Estado live verificado 2026-07-21: web `ingress=all`, `invokerIamDisabled=true`, `maxScale=3`,
SA `web_runtime`; api `ingress=all`, IAM-private, `maxScale=3`, SA `api_runtime`; allowlist del cliente
`globe` = **una** URI (`https://globe-studio-internal-818083690953.southamerica-west1.run.app/auth/callback`);
`globe.efeoncepro.com` no resuelve (NS `ns24/ns25.hostgator.cl`).

## Delta 2026-07-21 (cierre) — front door vivo y verificado en el runtime real

El front door está **aplicado y verificado en vivo**. `globe.efeoncepro.com` es la URL estable del shell interno de
Globe; el `*.run.app` dejó de ser alcanzable por browser. Sigue siendo **internal-only**: no es Production, no
habilita clientes externos (gate `TASK-1480`) ni HA gobernada por IaC (`TASK-1508`).

### Lo que quedó vivo

- **Infra (nueva, en `../efeonce-globe/infra/terraform/front_door.tf`).** IP global `globe-studio-front-door-ip`
  (EXTERNAL/IPV4), serverless NEG `globe-studio-internal-neg` (`southamerica-west1`, `cloud_run.service` como
  literal — referenciar el recurso equivaldría a adoptar el servicio, que es `TASK-1508`), backend service
  `globe-studio-front-door-backend` (`EXTERNAL_MANAGED`, `enable_cdn = false` deliberado: sirve un shell SSO
  autenticado por sesión y cachearlo en el edge sería un bug de correctitud), URL map, managed cert
  `globe-studio-front-door-cert` (`create_before_destroy`), target HTTPS proxy y forwarding rule `:443`, más el
  carril de redirect HTTP→HTTPS (`url_map` con `https_redirect=true` + `MOVED_PERMANENTLY_DEFAULT` +
  `strip_query=false`, target HTTP proxy y forwarding rule `:80`). Ambas forwarding rules `PREMIUM` +
  `EXTERNAL_MANAGED`. También: `compute.googleapis.com` agregada a `local.enabled_services`, variable
  `front_door_domain` (default `globe.efeoncepro.com`) y outputs `front_door_ip_address` / `front_door_domain` /
  `front_door_certificate_name`.
- **Apply real.** OpenTofu v1.12.4, provider `hashicorp/google` 6.50.0. Plan inicial `11 to add, 0 to change,
  0 to destroy`, 65 recursos no-op, **cero** destroy/replace y **cero** recursos Cloud Run en el diff (verificado
  sobre el plan JSON). El primer apply creó 8/11 y falló en los 3 del carril HTTP-redirect con `SERVICE_DISABLED`
  sobre `compute.googleapis.com`: `google_compute_url_map.front_door_http_redirect` era la única raíz del grafo
  sin arista implícita a la API (el carril HTTPS la alcanza transitivamente por backend service → NEG). Se arregló
  **la carrera en el HCL** —`depends_on` explícito a `google_project_service.enabled["compute.googleapis.com"]`—,
  no reintentando a ciegas. Segundo apply 3/3; plan post-apply `No changes` (convergido).
- **DNS + TLS.** IP global `8.233.189.79`; A record `globe.efeoncepro.com` creado en HostGator (out-of-band).
  Cert `ACTIVE` ~28 min después del DNS. Cert servido: `CN=globe.efeoncepro.com`, issuer `C=US, O=Google Trust
  Services, CN=WR3`, `notBefore Jul 21 19:42:23 2026 GMT`, `notAfter Oct 19 20:35:36 2026 GMT`.
- **Primitive aditiva de redirect allowlist (código nuevo en Greenhouse).**
  `updateSisterPlatformOAuthRedirectUris` en `src/lib/sister-platforms/oauth-broker.ts`: aditiva/sustractiva, una
  sola transacción con `SELECT ... FOR UPDATE`, toca **exclusivamente** la columna `redirect_uris` (nunca
  `policy_json`, `allowed_scopes`, TTLs, `client_status` ni el token del consumer) y reusa `normalizeRedirectUris`
  como única autoridad de validación. Idempotente al agregar (`changed=false`); **falla fuerte**
  (`invalid_redirect_uri`) al remover un URI ausente, porque durante un cutover un no-op silencioso sobre una vista
  stale es justo cómo sobrevive el callback equivocado; cliente desconocido → 404 `invalid_client`, nunca crea.
  CLI genérico `pnpm sister-platform:redirect` (`scripts/sister-platform-oauth-redirect-uris.ts`,
  `--client/--add/--remove/--apply`; sin `--apply` es dry-run). 11 tests en
  `src/lib/sister-platforms/oauth-redirect-uris.test.ts`. La lógica vive en el broker y no en el script para que
  una route/MCP/Nexa pueda operar el mismo cambio por la misma primitive (Full API Parity).
- **Cutover.** Allowlist del cliente `globe`: de 1 URI (`…run.app/auth/callback`) a 2 (+
  `https://globe.efeoncepro.com/auth/callback`). `GLOBE_PUBLIC_BASE_URL` del web pasó del `*.run.app` a
  `https://globe.efeoncepro.com` con `gcloud run services update --update-env-vars` (nunca `--set-env-vars`,
  destructivo) → revisión `globe-studio-internal-00018-zkx` sirviendo 100% del tráfico. Ese valor es load-bearing:
  `apps/studio-web/src/app.ts` construye el callback como `new URL('/auth/callback', config.publicBaseUrl)`.
- **Ingress endurecido.** `gcloud run services update globe-studio-internal --region southamerica-west1
  --project efeonce-globe --ingress internal-and-cloud-load-balancing`. Acceso directo por `run.app` → 404;
  dominio por el ALB → 200. `invokerIamDisabled` sigue `true` (correcto para un web con SSO: un browser no presenta
  ID token) y `maxScale` sigue en 3, sin tocarse.
- **Smoke de federación humana (código nuevo en Globe).** `efeonce-globe/scripts/smoke-human-federation.mjs`, par
  humano de `smoke-private-api.mjs`. Recorre las tres piernas del login real (`/auth/start` → authorize de
  Greenhouse con sesión → callback con la cookie de transacción → `/studio`) y asserta que el `redirect_uri`
  anunciado pertenece al origen bajo prueba, PKCE S256 con `code_challenge`, `state` y `nonce` presentes y `state`
  ecoado, que el authorize no redirige fuera del origen y que el callback emite cookie. `GLOBE_SMOKE_RESOLVE=host:ip`
  fija la resolución sólo para ese proceso (equivalente a `curl --resolve`) sin debilitar ninguna aserción: SNI, CN
  del cert, header `Host` y `redirect_uri` siguen viajando con el hostname real. Detalle técnico: `dns.setServers`
  no sirve (el fetch de Node usa el resolver del SO vía `dns.lookup`); la vía correcta es interponer `dns.lookup`
  devolviendo array cuando undici pide `all`. **Calibrado antes del cutover** contra el origen `run.app`
  (`human_federation_ok`): así, si fallaba después, acusaba al cutover y no al instrumento.

### Verificación runtime (lo que se ejercitó, y lo que no)

- `http://globe.efeoncepro.com/` → **301** a `https://globe.efeoncepro.com:443/`.
- `https://globe.efeoncepro.com/` → **200**, TLS válido (`ssl_verify_result=0`), HTTP/2, sirviendo el shell real
  (`<title>Efeonce Globe — Internal creative studio</title>`) con su propio `x-correlation-id`: responde la app, no
  una página del balanceador.
- Smoke de federación humana contra el dominio: `human_federation_ok` **antes y después** del hardening de ingress.
- Allowlist verificado contra el broker por tres vías (`GET /api/auth/sister-platforms/authorize`, que valida el
  `redirect_uri` antes de mirar la sesión): **antes** → dominio `400 invalid_redirect_uri`, `run.app` `303`;
  **después** → dominio `303`, `run.app` `303`, wildcard (`https://*.efeoncepro.com/auth/callback`) sigue `400
  invalid_redirect_uri`.
- `globe-api-internal`: anónimo → **403** antes y después; `GLOBE_API_EXPECTED_AUDIENCE` contiene los dos formatos
  de URL `run.app` y **nunca** el dominio browser; su `GLOBE_PUBLIC_BASE_URL` es el placeholder
  `https://globe-api-internal.invalid`; domain mappings en el proyecto: **0**; el NEG apunta sólo a
  `globe-studio-internal`. **No re-ejercitado en esta task:** la pierna `200 al SA autorizado` del smoke de
  workload (la API no se tocó; el criterio queda sin marcar por honestidad, no por bloqueo).
- Gates Greenhouse: `pnpm test` 1366 archivos / 9858 tests, 0 fallos; `pnpm build` (producción) OK;
  `pnpm local:check` limpio.
- **Carril del apply:** corrió con `tofu` local (los commits de Globe quedaron sin push). La evidencia **no**
  registra un apply por el carril OIDC→WIF del workflow, así que ese tramo del criterio queda sin marcar.

### Trampa de diagnóstico que vale para el runbook

Tras crear el A record el cert pasó a `managed.domainStatus = FAILED_NOT_VISIBLE`. **No era un error de
configuración:** es el resultado guardado del primer intento de validación de Google, ocurrido antes de que
existiera el registro; Google reintenta solo y el estado pasa a `ACTIVE` sin intervención. El descarte de causa
real dio todo OK: NS autoritativos `ns24/ns25.hostgator.cl`, `8.8.8.8` y `1.1.1.1` devolviendo `8.233.189.79`, sin
AAAA, sin CNAME, sin CAA en `efeoncepro.com`, cert adjunto al target-https-proxy, forwarding rule `:443` sobre la
IP correcta y el ALB ya respondiendo 301 por el dominio real desde internet. Trampa secundaria: el resolver local
del operador mantuvo **cache negativa** del nombre (el SOA de `efeoncepro.com` tiene minimum TTL 86400, así que un
NXDOMAIN cacheado persiste ~24h) y `dscacheutil -flushcache` sin `sudo` no hace nada; el síntoma engañoso es `curl`
devolviendo `status=000` sin `remote_ip`, como si el dominio no sirviera para nadie. Verificar siempre con
`dig @8.8.8.8` y `curl --resolve` antes de concluir que algo está roto.

### Costo

Fuente: Cloud Billing Catalog API, servicio "Networking" (`E505-1604-58F8`), precios efectivos **2026-07-21**, USD.

| Concepto | Precio | Aplica |
|---|---|---|
| Cloud Load Balancer Forwarding Rule Minimum Global | US$0.025/hora (~US$18,25/mes) | cubre las 5 primeras reglas globales; este front door usa 2 (`:443`, `:80`) |
| Cloud Load Balancer Forwarding Rule Additional Global | US$0.010/hora | no aplica hoy |
| Global External ALB Inbound/Outbound Data Processing (Santiago, `southamerica-west1`) | US$0.012/GiB cada uno | por tráfico servido |
| Certificado administrado por Google | sin cargo | — |

**Total fijo estimado: ~US$18,25/mes + ~US$0,024 por GiB servido (in+out).** Nota de rollback: destruir el ALB pero
dejar la IP global reservada y sin adjuntar la empieza a facturar como IP estática ociosa — destruir la dirección
junto con el resto.

### Rollback vigente (camino verificado, no ejecutado)

| Capa | Comando / acción | Tiempo |
|---|---|---|
| Ingress | `gcloud run services update globe-studio-internal --ingress all` | <10 min |
| URL/OAuth | `--update-env-vars GLOBE_PUBLIC_BASE_URL=<run.app>`; el `run.app` sigue en el allowlist | <15 min |
| DNS | quitar el A record en HostGator | <60 min (propagación) |
| ALB | destruir selectivamente los recursos aditivos del front door, **incluida la IP global** | <30 min |

### Open Question 2 — resuelta: el redirect `run.app` **se conserva**

El `https://globe-studio-internal-818083690953.southamerica-west1.run.app/auth/callback` **queda en el allowlist**
como camino de rollback documentado. Con el ingress endurecido ese origen ya no es alcanzable por browser, así que
un código enviado ahí no llega a ninguna parte; removerlo obligaría a un segundo write en DB bajo presión durante
un rollback. Si algún día se decide retirarlo:

```bash
pnpm sister-platform:redirect --client globe \
  --remove https://globe-studio-internal-818083690953.southamerica-west1.run.app/auth/callback --apply
```

### Desviaciones respecto a la spec original (y por qué)

1. **El orden de cutover se invirtió: allowlist primero, `GLOBE_PUBLIC_BASE_URL` después.** La spec ordenaba
   cambiar la env var y luego agregar el redirect. Agregar un redirect URI es **inerte** hasta que algo lo use;
   flipear `GLOBE_PUBLIC_BASE_URL` primero abriría una ventana en la que `/auth/start` anuncia un callback todavía
   no permitido y el SSO queda roto. Secuencia ejecutada: allowlist ampliado (aditivo) → verificación de tres vías
   contra el broker **antes** de tocar el runtime → cutover de la env var → smoke SSO end-to-end contra el dominio
   → endurecimiento de ingress → re-smoke SSO. El §Scope y la §Production verification sequence quedaron corregidos
   a este orden.
2. **El ingress se endureció por `gcloud`, no por Terraform.** La spec decía "vía Terraform", pero los servicios
   Cloud Run **no están en Terraform** y adoptarlos es explícitamente `TASK-1508`; `gcloud run services update
   --ingress` era el único camino consistente con el scope. Consecuencia registrada: **el valor de ingress queda
   sin gobernar por IaC hasta `TASK-1508`**. No es drift-trap del workflow (`deploy-internal.yml` no pasa
   `--ingress` y `gcloud run deploy` preserva los ajustes a nivel servicio que no se especifican); el drift-trap
   vivo al cerrar esta task **era** el ceiling de escala (`--max-instances=1` hardcodeado). Ambas cosas quedaron
   **cerradas por `TASK-1508`**: adoptó los servicios en Terraform (el `ingress` pasó a estar gobernado por IaC) y
   dejó el workflow image-only, con los dos ceilings —servicio y revisión— declarados en Terraform. El workaround
   que esta task daba por bueno (`gcloud run services update <servicio> --max-instances=3`) era **inefectivo**:
   escribía el ceiling de **revisión**, no el de **servicio**, y Cloud Run aplica el menor, así que dejaba el techo
   efectivo en 1 aparentando haberlo restaurado.

### Delta 2026-07-21 (corrección de historia) — `maxScale` no era 3: el efectivo era 1

El §Delta de recalibración pre-ejecución afirma "`maxScale` ya no es 1" y el §cierre dice "`maxScale` sigue en 3, sin
tocarse". Las dos leían el ceiling **de revisión**. `TASK-1508` verificó que el ceiling **de servicio** seguía en 1 en
ambos servicios y que **Cloud Run aplica el menor**, así que el techo efectivo **era 1** — y la afirmación correcta de
esta task es que **no tocó el ceiling en ninguna dirección** (cierto), no que el valor vivo fuera 3. `TASK-1508` lo
corrigió a **3/3** y puso ambos campos bajo Terraform (provider `hashicorp/google` `~> 6.0` → `~> 7.0`, porque el
ceiling a nivel servicio no existe en 6.x). Consecuencia registrada: el spend fence cross-réplica de `TASK-1465` nunca
se ejercitó → **`TASK-1512`**.

Segunda corrección menor de esta misma spec: el plan Terraform dio `11 to add` pero `infra/terraform/front_door.tf`
tiene **diez** recursos; el 11.º es la habilitación de `compute.googleapis.com`, que vive en `locals.tf`.

### Commits (locales, sin push)

- `efeonce-globe` (`main`): `16919d9` (front door ALB + NEG), `cf5e4d1` (orden del URL map de redirect tras la
  Compute API), `c6983aa` (smoke de federación humana), `614e983` (pin host→IP en el smoke).
- `greenhouse-eo` (`develop`): `bbc694f81` (recalibración de baseline pre-ejecución), `c819c4a9f` (primitive aditiva
  de redirect-URI allowlist).

## Why This Task Exists

ADR-004 aceptó Cloud Run como web/BFF para la release internal-only y declaró explícitamente que **la ADR sola no
autoriza apply**: el cambio de front door, DNS, TLS, OAuth e ingress es responsabilidad de esta task sucesora. Hoy
`globe.efeoncepro.com` no resuelve, la public base URL apunta al `*.run.app`, y los dos servicios Cloud Run
(`globe-studio-internal`, `globe-api-internal`) están **fuera de Terraform**, pero adoptar servicios vivos mientras el
workflow sigue ejecutando `gcloud run deploy` abre una segunda fuente de escritura sobre imagen/configuración. Esa
deuda requiere su propio plan no-destructivo y queda en `TASK-1508`; no bloquea publicar el dominio. El web corre con
`ingress=all` + `invokerIamDisabled=True`: browser-reachable, pero sin la protección de red que el ALB permite
(`internal-and-cloud-load-balancing`). Sin esta task, el dominio no puede publicarse y los callbacks/deep links
seguirían dependiendo del hostname `run.app`.

## Goal

- Publicar `globe.efeoncepro.com` sobre un Global External ALB + serverless NEG hacia `globe-studio-internal`, con
  certificado administrado y redirección HTTP→HTTPS, como el front door internal-only estable.
- Cerrar el loop OAuth de federación humana con el nuevo dominio: `GLOBE_PUBLIC_BASE_URL` y el redirect-URI allowlist
  del cliente Globe en el broker de Greenhouse actualizados de forma exacta (sin wildcards), con smokes verdes de
  federación humana y de workload.
- Endurecer el ingress del web a `internal-and-cloud-load-balancing` después del smoke por ALB, sin tocar
  `maxScale` (live=3), y dejar `globe-api-internal` IAM-private con audience `run.app`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md` (ADR-004 — decisión que
  esta task implementa; ver §"Successor task contract (TASK-1507)" y §"Hard rules")
- `docs/architecture/creative-studio/GREENHOUSE_CONNECTIVITY_V1.md` (ADR-001 — federación humana + workload; redirect
  URI allowlisting exacto + PKCE/state/nonce)
- `docs/architecture/creative-studio/PLATFORM_FOUNDATION_V1.md`
- `docs/architecture/creative-studio/DECISIONS_INDEX.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`

Reglas obligatorias (de ADR-004, load-bearing):

- El custom domain sólo apunta a `globe-studio-internal` vía Global External ALB + serverless NEG (path GA); **nunca**
  un domain mapping directo de Cloud Run (Preview/region-limited).
- `globe-api-internal` **nunca** recibe custom domain ni exposición browser: queda IAM-private y su Google ID-token
  audience se deriva de su URL `run.app`, jamás del dominio browser.
- El redirect URI allowlist del broker es exacto, sin wildcards (`oauth-broker.ts` rechaza wildcards por diseño).
- No cambiar `maxScale` de `globe-studio-internal`. El gate `TASK-1465` quedó cleared (stores durables) y el valor
  live es `maxScale=3`; esta task **no lo toca** en ninguna dirección. Gobernarlo por IaC es `TASK-1508`.
- Un dominio internal-only no es Production ni acceso de clientes externos (gate `TASK-1480`).
- Globe conserva runtime, datos, secretos y ejecución propios; Greenhouse sólo aporta el broker OAuth (federación) y el
  gobierno documental. No se comparte DB, cookie ni credencial de provider.

## Normative Docs

- `docs/tasks/complete/TASK-1506-globe-frontend-hosting-front-door-decision.md`
- `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md`
- `docs/operations/creative-studio/EPIC_028_PARALLEL_EXECUTION_PLAN_V1.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- `docs/operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md`
- `docs/tasks/complete/TASK-1464-globe-iac-keyless-platform-foundation.md`
- `docs/tasks/complete/TASK-1465-globe-workspace-tenancy-persistence-audit.md`
- `docs/tasks/to-do/TASK-1469-globe-governed-run-lifecycle-submission-fence.md`
- `docs/tasks/to-do/TASK-1480-globe-commercial-external-readiness-gate.md`
- `docs/tasks/to-do/TASK-1505-globe-creative-producer-surface.md`

## Dependencies & Impact

### Depends on

- `TASK-1506` (ADR-004 aceptada) — decisión que autoriza y acota esta implementación.
- Foundation IaC keyless `TASK-1464`: `../efeonce-globe/infra/terraform/` (WIF, `globe-deployer`, backend GCS,
  budgets, observabilidad ya en Terraform).
- Runtime vivo `globe-studio-internal` (`web`) y `globe-api-internal` (`api`) en `southamerica-west1`.
- Broker OAuth de Greenhouse: `src/lib/sister-platforms/oauth-broker.ts` (cliente Globe registrado con `redirect_uris`).
- Documentación oficial vigente de Google Cloud (Global External ALB, serverless NEG, managed certs, Cloud Run ingress)
  con fecha registrada.

### Blocks / Impacts

- Desbloquea el rollout interno de `TASK-1505` (Producer surface) al fijar el front door canónico.
- Da a `TASK-1469` una public base URL HTTPS estable propia para su canary/cutover.
- Habilita deep links canónicos de `TASK-1475`.
- No habilita Production ni clientes externos (sigue bloqueado por `TASK-1480`).
- No sube réplicas ni las baja: `TASK-1465` (stores durables) ya está complete y el `maxScale` live es 3;
  gobernarlo por IaC es `TASK-1508`.
- Desbloquea `TASK-1508`, que adopta los servicios Cloud Run en Terraform sin mezclar ese riesgo con el cutover DNS.

### Files owned

- `../efeonce-globe/infra/terraform/front_door.tf` (nuevo — IP global, ALB, serverless NEG, managed cert, HTTP→HTTPS)
- `../efeonce-globe/infra/terraform/variables.tf`, `outputs.tf`, `locals.tf`
- `../efeonce-globe/scripts/smoke-human-federation.mjs` (nuevo — smoke SSO de las tres piernas del login humano)
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- El redirect-URI allowlist del cliente Globe es una **actualización de registro** en el broker de Greenhouse (el dato
  es la fila del cliente). Discovery confirmó que se administraba por seed script, y que el seed vigente reemplazaba
  el array y rotaba el client secret; por eso esta task agregó la primitive aditiva
  `updateSisterPlatformOAuthRedirectUris` en `src/lib/sister-platforms/oauth-broker.ts` + el CLI delgado
  `scripts/sister-platform-oauth-redirect-uris.ts` (`pnpm sister-platform:redirect`) + tests en
  `src/lib/sister-platforms/oauth-redirect-uris.test.ts`.

`GLOBE_PUBLIC_BASE_URL` y `GLOBE_API_EXPECTED_AUDIENCE`/`GLOBE_API_CALLER_SERVICE_ACCOUNTS` son env del runtime Globe
(Cloud Run), no de Greenhouse. DNS de `efeoncepro.com` es out-of-band (HostGator).

## Current Repo State

### Already exists

- `../efeonce-globe/infra/terraform/` gobierna WIF, `globe-deployer`, SAs (`web_runtime`/`api_runtime`), buckets, IAM,
  budgets y observabilidad — pero **no** los dos servicios Cloud Run (los crea el workflow `deploy-internal.yml`).
- `globe-studio-internal`: `web`, `southamerica-west1`, `ingress=all`, `maxScale=3`, `invokerIamDisabled=True`, SA
  `web_runtime`; autentica por sesión-cookie propia.
- `globe-api-internal`: `api`, `southamerica-west1`, `ingress=all`, `maxScale=3`, IAM-private + verificación in-app de
  ID token (`GLOBE_API_EXPECTED_AUDIENCE` + `GLOBE_API_CALLER_SERVICE_ACCOUNTS`), SA `api_runtime`.
- Broker OAuth de sister platforms en `src/lib/sister-platforms/oauth-broker.ts` con redirect-URI allowlist exacto
  (rechaza wildcards, `errorCode: invalid_redirect_uri`).
- `efeoncepro.com` en DNS de HostGator; `globe.efeoncepro.com` no resuelve.

### Gap

- No existe ALB, IP global, serverless NEG ni managed cert; `globe.efeoncepro.com` no tiene front door.
- Los servicios Cloud Run no están bajo Terraform; esa adopción y el conflicto de ownership con el workflow quedan
  explícitamente en `TASK-1508`.
- El web usa `ingress=all` (browser-reachable directo por `run.app`) en vez de `internal-and-cloud-load-balancing`
  detrás del ALB.
- El redirect allowlist del cliente Globe y `GLOBE_PUBLIC_BASE_URL` aún no contemplan `globe.efeoncepro.com`.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `infra en ../efeonce-globe/infra/terraform + GCP; broker OAuth en greenhouse-eo src/lib/sister-platforms; DNS en HostGator`
- Future candidate home: `remain-shared`
- Boundary: `front door browser de Globe (ALB→serverless NEG→globe-studio-internal) + redirect allowlist del broker; sin mover dominio creativo a Greenhouse`
- Server/browser split: `browser sólo entra por el ALB/dominio del web; OAuth/session/BFF server-side; globe-api-internal IAM-private service-to-service, sin browser`
- Build impact: `none en código de app; Terraform agrega sólo recursos de red (ALB/NEG/cert/IP)`
- Extraction blocker: `OAuth callback + redirect allowlist acoplados al broker de Greenhouse; session store in-memory (gate 1465); WIF project scoping; API audience run.app`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `Terraform del front door Globe + cliente OAuth Globe en el broker de Greenhouse + env/ingress Cloud Run + DNS HostGator`
- Consumidores afectados: `browser humano (SSO shell), TASK-1469 canary, TASK-1475 deep links, TASK-1505 rollout interno`
- Runtime target: `production` (infra GCP de Globe; internal-only, no Production comercial)

### Contract surface

- Contrato existente a respetar: `ADR-004 (§Successor task contract, §Hard rules); ADR-001 GREENHOUSE_CONNECTIVITY_V1 (redirect allowlist exacto + PKCE); EFEONCE_GLOBE_IAC_RUNBOOK_V1`
- Contrato nuevo o modificado: `front door HTTPS globe.efeoncepro.com (ALB); redirect URI del cliente Globe; GLOBE_PUBLIC_BASE_URL; ingress del web`
- Backward compatibility: `gated` — el `*.run.app` sigue válido durante cutover; el ingress endurece a `internal-and-cloud-load-balancing` sólo tras verificar que el ALB sirve
- Full API parity: `N/A — no capability` (infra/front door; no introduce ni modifica una capability de negocio del spine)

### Data model and invariants

- Entidades/tablas/views afectadas: `cliente OAuth Globe (fila con redirect_uris) en el broker de Greenhouse; recursos GCP (no tablas de dominio)`
- Invariantes que no se pueden romper:
  - `globe-api-internal nunca recibe custom domain ni exposición browser; audience run.app, IAM-private`
  - `redirect URIs exactos, sin wildcards; PKCE S256 + state + nonce preservados`
  - `esta task no cambia maxScale de globe-studio-internal (live=3 tras TASK-1465); gobernarlo por IaC es TASK-1508`
  - `invokerIamDisabled no cambia en esta task: True en web y False en api; TASK-1508 lo pineará por Terraform`
- Tenant/space boundary: `federación humana provee identidad Greenhouse a Globe como broker; el ALB no cambia el trust boundary (una sola nube GCP)`
- Idempotency/concurrency: `Terraform apply idempotente sobre recursos nuevos del front door; no importa ni adopta servicios vivos`
- Audit/outbox/history: `Terraform state + plan como evidencia; smokes de federación humana/workload como verificación; sin event de dominio`

### Migration, backfill and rollout

- Migration posture: `none` (DB); infra additive: agregar red (ALB/NEG/cert/IP), sin importar servicios existentes
- Default state: `el custom domain se publica sólo tras smoke verde; el ingress endurece a internal-and-cloud-load-balancing como último paso, tras confirmar que el ALB sirve`
- Backfill plan: `N/A — no data backfill`
- Rollback path: `revertir ingress del web a all (restaura acceso directo run.app); apuntar GLOBE_PUBLIC_BASE_URL + redirect al run.app; el ALB es additive y destruible sin tocar el servicio`
- External coordination: `DNS globe.efeoncepro.com en HostGator (out-of-band); verificación de propiedad de dominio para el managed cert; owner GCP/billing; owner OAuth broker en Greenhouse`

### Security and access

- Auth/access gate: `federación humana OAuth (broker Greenhouse, PKCE) para el web; service account + ID token verification (api-mode) para globe-api-internal; WIF/OIDC para el apply (globe-deployer)`
- Sensitive data posture: `secrets` — no imprimir secretos ni valores de provider; el apply corre keyless (OIDC→WIF), sin service-account keys
- Error contract: `N/A runtime de app` — cambios de infra/OAuth; los errores del broker ya usan `SisterPlatformOAuthError` con errorCode
- Abuse/rate-limit posture: `el ALB permite (follow-up) Cloud Armor; el api queda IAM-private + audience/caller allowlist fail-closed; esta task no baja ninguna de esas defensas`

### Runtime evidence

- Local checks: `cd ../efeonce-globe && pnpm check` (si toca código); `terraform validate` + `terraform plan` (sólo recursos aditivos del front door; 0 cambios sobre servicios Cloud Run)
- DB/runtime checks: `gcloud run services describe` read-only pre/post; `curl -I` del dominio (301 HTTP→HTTPS + 200/302 SSO); resolución DNS + cert válido
- Integration checks: smoke de federación humana (login SSO end-to-end contra `globe.efeoncepro.com`) + smoke de workload federation (`globe-api-internal` sigue respondiendo 403 anónimo y 200 al SA autorizado)
- Reliability signals/logs: Cloud Run request logs + ALB logs; verificar que `globe-api-internal` no aparece browser-reachable
- Production verification sequence: ver §Rollout Plan (secuencia canónica: red → DNS/cert → cutover URL/OAuth → smokes → hardening ingress)

### Acceptance criteria additions

- [x] Source of truth, contract surface y consumers nombrados con paths/objetos reales.
- [x] Invariantes de API-privada/redirect-exacto/maxScale explicitados y preservados.
- [x] Postura de rollback explícita por slice (ingress revert, URL/OAuth revert, ALB destruible).
- [x] Evidencia runtime listada (plan Terraform aditivo sin recursos Cloud Run, smokes federación humana + workload, curl HTTP/HTTPS del dominio).
- [ ] Sin fuga de secretos; apply keyless; API privada intacta. *(sin fuga de secretos y API privada intacta sí;
      el apply corrió con `tofu` local y la evidencia no registra el carril OIDC→WIF — ver §Delta 2026-07-21 (cierre))*

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md según TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Front door: IP global + ALB + serverless NEG + managed cert (sin DNS aún)

- Habilitar `compute.googleapis.com` vía `local.enabled_services` (prerequisito verificado: hoy está deshabilitada).
- Terraform para IP global estática, serverless NEG (`southamerica-west1`) hacia `globe-studio-internal`, backend
  service, URL map, target HTTPS proxy con certificado administrado para `globe.efeoncepro.com`, y forwarding rules
  HTTP→HTTPS.
- El NEG apunta **sólo** a `globe-studio-internal`. `globe-api-internal` no entra al ALB.
- Aún sin cutover de DNS: el cert queda `PROVISIONING` hasta que el dominio resuelva (Slice 2).
- Documentar el costo fijo/mensual estimado del front door y sus supuestos de tráfico con precios oficiales
  vigentes al ejecutar la task.

### Slice 2 — DNS + provisión de certificado (out-of-band + verificación)

- Crear el registro DNS de `globe.efeoncepro.com` → IP global en HostGator (coordinación out-of-band).
- Verificar propiedad de dominio y esperar `ACTIVE` del managed cert; confirmar `curl -I` con 301 HTTP→HTTPS y TLS
  válido; el web responde detrás del ALB (SSO redirect esperado, no error de red).

### Slice 3 — Cutover de OAuth redirect allowlist + public base URL (en ese orden)

- **Primero** agregar el redirect URI exacto de `globe.efeoncepro.com` al cliente Globe en el broker OAuth de
  Greenhouse (aditivo, sin quitar el `run.app`, sin wildcards) y verificarlo contra el broker. Agregar un redirect
  URI es inerte hasta que algo lo use; flipear la env var primero abriría una ventana en la que `/auth/start`
  anuncia un callback todavía no permitido y el SSO queda roto.
- **Después** actualizar `GLOBE_PUBLIC_BASE_URL` del runtime web a `https://globe.efeoncepro.com` (env Cloud Run,
  con redeploy si no toma en caliente).
- Smoke de federación humana: login SSO end-to-end contra `https://globe.efeoncepro.com` con PKCE/state/nonce OK.

### Slice 4 — Endurecer ingress + verificar API privada + cierre del dominio

- Cambiar el ingress de `globe-studio-internal` a `internal-and-cloud-load-balancing` con
  `gcloud run services update --ingress` (los servicios Cloud Run no están en Terraform; adoptarlos es
  `TASK-1508`, así que el valor queda sin gobernar por IaC hasta entonces), **sólo tras** confirmar que el ALB
  sirve el web (evita lockout).
- Verificar que `globe-api-internal` sigue IAM-private: 403 anónimo, 200 al SA autorizado, audience `run.app` intacto,
  sin custom domain.
- Actualizar el runtime handoff y dejar enlazada `TASK-1508` como dueña de la adopción IaC de servicios y del
  least-privilege/ownership audit del workflow.

## Out of Scope

- Cambiar `maxScale` en cualquier dirección (queda como está, live=3; gobernarlo por IaC es `TASK-1508`).
- Implementar persistencia durable, ejecución async, workbench, Producer UI o deep links.
- Habilitar Production, clientes externos, pricing o publicación (gate `TASK-1480`).
- Dar a `globe-api-internal` custom domain o exposición browser.
- Importar o adoptar los servicios Cloud Run en Terraform, pinear su configuración o modificar el workflow de deploy
  (`TASK-1508`).
- Migrar el web a Vercel/Next.js o decidir el host del frontend cliente comercial (decisión diferida por ADR-004).
- Cambiar el modelo de federación/broker de identidad (sólo se agrega un redirect URI exacto).

## Detailed Spec

El path GA para un custom domain de Cloud Run es **Global External Application Load Balancer + serverless NEG**, no el
domain mapping directo (Preview/region-limited) — ADR-004 §Alternatives. Componentes Terraform mínimos: `google_compute_
global_address`, `google_compute_region_network_endpoint_group` (serverless, `southamerica-west1`, `cloud_run.service =
globe-studio-internal`), `google_compute_backend_service`, `google_compute_url_map`, `google_compute_managed_ssl_
certificate` (`globe.efeoncepro.com`), `google_compute_target_https_proxy`, y forwarding rules 443 + 80 (redirect a
HTTPS). Los tipos/atributos exactos quedaron verificados al ejecutar (provider `hashicorp/google` 6.50.0); el detalle
del recurso aplicado está en §Delta 2026-07-21 (cierre).

El plan Terraform de esta task debe contener sólo recursos aditivos del front door. Si intenta importar, cambiar,
reemplazar o destruir `globe-studio-internal` o `globe-api-internal`, abortar: esa propiedad pertenece a `TASK-1508`.

El orden de cutover es crítico para no dejar afuera al browser ni romper OAuth: primero el ALB sirve (Slices 1-2),
después el allowlist admite el callback del dominio y recién entonces `GLOBE_PUBLIC_BASE_URL` apunta al dominio
(Slice 3), y **al final** el ingress endurece (Slice 4). Invertir el orden —endurecer ingress antes de que el ALB
sirva, o flipear la env var antes que el allowlist— deja el web inaccesible o el SSO roto.

El redirect allowlist se administra en el broker de Greenhouse (`src/lib/sister-platforms/oauth-broker.ts`
`normalizeRedirectUris` valida exactitud). Discovery confirmó que el registro se actualizaba por seed script; esta
task extrajo la primitive aditiva `updateSisterPlatformOAuthRedirectUris` para agregar el URI de
`globe.efeoncepro.com` sin remover el `run.app` y sin wildcards (el broker los rechaza con `invalid_redirect_uri`).

## Rollout Plan & Risk Matrix

Task de infra crítica cross-runtime: muta red GCP, DNS, OAuth redirect e ingress de un servicio vivo. El apply lo
autoriza esta task (no ADR-004 sola) sólo para el front door y su cutover; la adopción de servicios queda fuera.

### Slice ordering hard rule

- Slice 1 (ALB/NEG/cert, sin DNS) → Slice 2 (DNS + cert ACTIVE) → Slice 3 (OAuth redirect **y luego** cutover URL +
  smoke humano) → Slice 4 (endurecer ingress + verificar API privada + cierre).
- **Slice 4 (endurecer ingress a `internal-and-cloud-load-balancing`) NUNCA antes de confirmar en Slice 2-3 que el ALB
  sirve el web.** Endurecer antes deja el browser sin acceso (lockout).
- **Dentro del Slice 3, el allowlist va SIEMPRE antes de `GLOBE_PUBLIC_BASE_URL`.** El redirect es inerte hasta que
  algo lo use; la env var al revés abre una ventana de SSO roto.
- Un cambio/import/destroy sobre un servicio Cloud Run en el plan Terraform aborta la task y se deriva a `TASK-1508`.
- El redirect `run.app` no se remueve hasta que el smoke del dominio nuevo esté verde (Slice 3).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El plan del front door intenta adoptar o mutar un servicio vivo | Cloud Run / IaC | high | scope Terraform aditivo; abortar y derivar ownership/import a TASK-1508 | plan menciona cambios sobre `globe-studio-internal`/`globe-api-internal` |
| Endurecer ingress antes de que el ALB sirva deja el web sin acceso | Cloud Run web | high | Slice 4 sólo tras smoke verde del ALB (Slices 2-3); rollback a `ingress=all` | 403/timeout browser tras el cambio de ingress |
| Redirect allowlist mal formado rompe login SSO | OAuth / identity | medium | URI exacto sin wildcard; conservar `run.app` hasta smoke verde; PKCE/state/nonce preservados | `invalid_redirect_uri` en el broker; login SSO falla |
| `globe-api-internal` queda browser-reachable o pierde audience | Security / API privada | low | API fuera del NEG; verificación 403 anónimo + audience run.app post-apply | anónimo obtiene 200; audience derivado del dominio browser |
| Managed cert no provisiona (DNS/propiedad) | TLS / DNS | medium | verificar registro DNS + propiedad antes de cutover; esperar `ACTIVE` | cert atascado en `PROVISIONING`; TLS handshake falla |
| Drift de servicios persiste después del dominio | Cloud/IaC | medium | deuda explícita, separada y bloqueante de HA en TASK-1508 | Terraform y `gcloud run deploy` siguen como escritores no reconciliados |
| Interpretar el dominio internal-only como Production | Product/Ops | medium | ADR-004 gates separados; handoff explícito; sin quitar SSO ni gate 1480 | cliente externo o marketing usa el dominio como GA |

### Feature flags / cutover

No hay feature flag de código. El "cutover" es la secuencia de red/DNS/OAuth de arriba, reversible por slice (revertir
ingress, revertir `GLOBE_PUBLIC_BASE_URL`/redirect al `run.app`, destruir el ALB additive). Defaults fail-closed: la API
sigue IAM-private; el web conserva SSO; el `maxScale` live (3) queda intacto porque esta task no lo toca.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 (ALB/NEG/cert) | destruir selectivamente sólo los recursos aditivos del front door | <30 min | sí |
| Slice 2 (DNS/cert) | remover el registro DNS en HostGator; el dominio deja de resolver | <60 min (propagación) | sí |
| Slice 3 (URL/OAuth) | `GLOBE_PUBLIC_BASE_URL` + redirect vuelven al `run.app` (env + broker); redeploy si aplica | <15 min | sí |
| Slice 4 (ingress) | ingress del web vuelve a `all` (restaura acceso directo `run.app`) | <10 min | sí |

### Production verification sequence

1. `terraform plan` (Slice 1) → verificar recursos aditivos del front door y **0 cambios** sobre servicios Cloud Run;
   recién ahí `apply`.
2. `apply` ALB/NEG/cert → cert en `PROVISIONING` esperado (sin DNS aún); `globe-api-internal` sin cambios.
3. Crear DNS en HostGator (Slice 2) → esperar cert `ACTIVE`; `curl -I http://globe.efeoncepro.com` = redirect HTTPS y
   `curl -I https://globe.efeoncepro.com` = TLS OK + respuesta/redirect SSO esperado.
4. Agregar el redirect exacto al broker y verificarlo, y **recién después** cutover de `GLOBE_PUBLIC_BASE_URL`
   (Slice 3; el orden inverso deja `/auth/start` anunciando un callback no permitido) → smoke federación humana:
   login SSO end-to-end verde contra el dominio; `run.app` aún válido.
5. Endurecer ingress a `internal-and-cloud-load-balancing` con `gcloud run services update --ingress` (Slice 4;
   no por Terraform, ver §Slice 4) → re-smoke humano por el ALB; verificar
   `globe-api-internal`: 403 anónimo + 200 SA autorizado + audience `run.app`.
6. Remover el redirect `run.app` del broker sólo si se decide; actualizar runbook + handoff; monitorear logs 48-72h.

### Out-of-band coordination required

- Owner de GCP/billing e infraestructura Globe (apply keyless vía `globe-deployer`).
- Owner del DNS `efeoncepro.com` en HostGator + verificación de propiedad de dominio para el managed cert.
- Owner del OAuth broker/redirect allowlist en Greenhouse.
- Product/Security para confirmar que el dominio se publica como internal-only (no Production; gate `TASK-1480`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `globe.efeoncepro.com` resuelve y sirve `globe-studio-internal` vía Global External ALB + serverless NEG
      (`southamerica-west1`), con managed cert `ACTIVE` y redirección HTTP→HTTPS (`curl -I` = 301 + TLS válido).
- [ ] `globe-api-internal` no recibe custom domain, sigue IAM-private (403 anónimo, 200 al SA autorizado) y su audience
      es `run.app`, no derivada del dominio browser. *(verificado: 403 anónimo antes y después, audience `run.app` en
      sus dos formatos, cero domain mappings, NEG sólo al web; la pierna `200 al SA autorizado` no se re-ejercitó en
      esta task — la API no se tocó)*
- [x] El plan Terraform contiene sólo recursos aditivos del front door y no importa ni modifica servicios Cloud Run.
- [x] `globe-studio-internal` sirve por `internal-and-cloud-load-balancing` detrás del ALB, con su `maxScale` live
      intacto (3; esta task no lo modifica).
- [x] `GLOBE_PUBLIC_BASE_URL = https://globe.efeoncepro.com` y el redirect URI exacto del cliente Globe está en el
      broker (sin wildcards); smoke de federación humana verde (PKCE/state/nonce OK).
- [ ] Ningún secreto impreso; el apply corrió keyless (OIDC→WIF); no se subieron réplicas ni se habilitó Production.
      *(secretos, réplicas y Production sí verificados; el carril del apply fue `tofu` local, no OIDC→WIF)*
- [x] Costo fijo/mensual estimado del ALB documentado con fecha y fuente oficial; `GLOBE_RUNTIME_HANDOFF.md` actualizado
      y `TASK-1508` enlazada como dueña de la adopción IaC/ownership de deploy.

## Verification

- `cd ../efeonce-globe && terraform -chdir=infra/terraform validate && terraform -chdir=infra/terraform plan` (sólo
  front door; 0 cambios sobre servicios Cloud Run)
- `cd ../efeonce-globe && pnpm check` si toca código de app (esperado: no toca app)
- `gcloud run services describe globe-studio-internal --region southamerica-west1` (read-only, pre/post) — ingress,
  scale, `invokerIamDisabled`
- `gcloud run services describe globe-api-internal --region southamerica-west1` — IAM-private, audience, sin domain
- `curl -I http://globe.efeoncepro.com` (redirect HTTPS) + `curl -I https://globe.efeoncepro.com` (TLS válido + SSO)
- Smoke federación humana (login SSO end-to-end) + smoke workload federation (403 anónimo / 200 SA) contra el dominio
- `pnpm task:lint --task TASK-1507`, `pnpm ops:lint --changed`, `pnpm docs:closure-check`

## Closing Protocol

- [x] `Lifecycle` del markdown sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla).
- [x] El archivo vive en la carpeta correcta (`to-do/` → `in-progress/` → `complete/`).
- [x] `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` sincronizados.
- [x] `docs/epics/in-progress/EPIC-028-...md` refleja el front door implementado.
- [x] `GLOBE_RUNTIME_HANDOFF.md` actualizado con el dominio y el pendiente explícito `TASK-1508`; ADR-004 referenciada
      como la decisión que esta task implementa.
- [ ] `greenhouse-qa-release-auditor` y `greenhouse-documentation-governor` revisan el cierre.
- [x] Runtime Rollout Completion Gate: si el dominio/OAuth/ingress no quedaron aplicados y verificados en vivo, el
      estado es `code complete, rollout pendiente`, no `complete`. *(dominio, cert, OAuth, `GLOBE_PUBLIC_BASE_URL` e
      ingress aplicados y verificados en vivo el 2026-07-21 — ver §Delta 2026-07-21 (cierre))*

## Follow-ups

- Cloud Armor / WAF sobre el ALB si se endurece la postura antes de exposición externa (`TASK-1480`).
- Adopción brownfield de los servicios Cloud Run + single-writer deploy ownership (`TASK-1508`, **complete**;
  corrigió además el ceiling efectivo de 1 a 3/3).
- Ejercitar por primera vez el spend fence cross-réplica ahora que el cap es 3 (`TASK-1512`, `to-do`).
- Gobernanza de la primitive de redirect allowlist que nació acá — audit trail persistido + capability + route/MCP
  (`TASK-1513`, `to-do`; hueco declarado en `GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md` §15.5).
- Store durable de sesión/OAuth para levantar `maxScale > 1` (`TASK-1465`).
- Decisión de host + framework del frontend cliente comercial (diferida por ADR-004, revisit en `TASK-1505` +
  pre-`TASK-1480`).

## Open Questions

- ~~¿El redirect allowlist del cliente Globe se actualiza por command/API del broker o por seed?~~ **RESUELTA
  (Discovery 2026-07-21):** por **seed script**; no hay route admin de OAuth clients. Como el seed vigente reemplaza
  el array y rota el client secret, el Slice 3 extrae la primitive canónica aditiva en `oauth-broker.ts` + un script
  delgado. Ver §Delta 2026-07-21.
- ~~¿Se remueve el redirect `run.app` tras el cutover, o se conserva como fallback interno?~~ **RESUELTA
  (cierre 2026-07-21): se conserva.** Es el camino de rollback documentado; con el ingress endurecido ese origen ya
  no es alcanzable por browser, así que un código enviado ahí no llega a ninguna parte, y removerlo obligaría a un
  segundo write en DB bajo presión durante un rollback. Comando de retiro, si algún día se decide:
  `pnpm sister-platform:redirect --client globe --remove https://globe-studio-internal-818083690953.southamerica-west1.run.app/auth/callback --apply`.
  Ver §Delta 2026-07-21 (cierre).

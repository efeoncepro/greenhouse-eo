# Manual — Operar el front door interno de Efeonce Globe

> **Tipo de documento:** Manual de uso / runbook (orientado al operador)
> **Version:** 1.2
> **Creado:** 2026-07-21 por Claude (TASK-1507)
> **Ultima actualizacion:** 2026-07-21 por Claude
> **Documentación técnica:** [`EFEONCE_GLOBE_INTERNAL_FRONT_DOOR_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_INTERNAL_FRONT_DOOR_V1.md) (SPEC-009)

## Para qué sirve

El **front door** es el camino de entrada al shell interno de Globe por un nombre estable: `globe.efeoncepro.com` → Global External Application Load Balancer → serverless NEG (`southamerica-west1`) → Cloud Run `globe-studio-internal`, con certificado administrado por Google y redirect HTTP→HTTPS. Este manual te dice cómo **verificar que el dominio está sano**, cómo **correr el smoke de la federación humana (SSO)**, cómo **mover el allowlist de redirect URIs**, cómo **endurecer o restaurar el ingress**, cómo **hacer rollback por slice**, y qué hacer cuando el certificado queda en `FAILED_NOT_VISIBLE`.

El front door es **internal-only**. Tener un dominio propio **no** lo convierte en Production, ni habilita clientes externos, ni entrega alta disponibilidad: ese salto sigue gateado por `TASK-1480`.

## Antes de empezar

- **Dónde vive cada cosa:** el Terraform del front door y el smoke de federación viven en el repo hermano `efeonce-globe` (por convención local `../efeonce-globe`, archivo `infra/terraform/front_door.tf`, script `scripts/smoke-human-federation.mjs`). El allowlist de redirect URIs y su CLI viven en **Greenhouse** (`pnpm sister-platform:redirect`). La documentación gobernante vive siempre en `greenhouse-eo`.
- **Frontera con el runbook de IaC (quién manda sobre qué).** El procedimiento está repartido por **audiencia**, no duplicado:
  - **Este manual es el SoT del procedimiento del operador**: verificar el dominio, correr el smoke, mover el allowlist, endurecer o restaurar el ingress, diagnosticar el certificado y ejecutar el rollback. Si estás resolviendo algo bajo presión, el orden lo manda este documento.
  - **[`EFEONCE_GLOBE_IAC_RUNBOOK_V1.md`](../../operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md) es el SoT del carril IaC**: `tofu plan` / `apply`, import brownfield, lectura del state y la forma del HCL. Todo lo que toque Terraform se ejecuta con ese runbook al lado.
  - **[`EFEONCE_GLOBE_INTERNAL_FRONT_DOOR_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_INTERNAL_FRONT_DOOR_V1.md) (SPEC-009) es el SoT del contrato**: por qué el front door es así y qué invariantes no se negocian.

  Donde este manual ya cubre un paso, el runbook lo **referencia** en vez de repetirlo, y viceversa. Si encuentras el mismo procedimiento escrito en dos lados y dicen cosas distintas, gana el SoT de esa audiencia y el otro se corrige — no elijas el que te convenga.
- **Skill obligatoria:** invoca **`greenhouse-globe`** antes de tocar el repo de Globe o el boundary Globe↔Greenhouse.
- **Herramientas:** `gcloud` autenticado sobre el proyecto `efeonce-globe`; OpenTofu (`tofu` v1.12.4) con el provider `hashicorp/google` pineado en `~> 7.0` por `infra/terraform/versions.tf` (subió de `~> 6.0` en `TASK-1508`: el ceiling a nivel servicio no existe en 6.x) para la infra; `pnpm` dentro de `greenhouse-eo` para el CLI del allowlist; `node` dentro de `efeonce-globe` para el smoke.
- **Datos fijos del front door:**

  | Dato | Valor |
  | --- | --- |
  | Dominio | `globe.efeoncepro.com` |
  | IP global reservada | `8.233.189.79` (`globe-studio-front-door-ip`) |
  | Certificado administrado | `globe-studio-front-door-cert` |
  | Servicio destino | `globe-studio-internal`, región `southamerica-west1`, proyecto `efeonce-globe` |
  | DNS | registro `A` en HostGator; NS autoritativos `ns24`/`ns25.hostgator.cl` |
  | Cliente OAuth | `globe` en `greenhouse_core.sister_platform_oauth_clients` (hoy 2 redirect URIs) |

- **Costo:** ~US$18,25/mes fijos (regla de forwarding global mínima, US$0,025/hora — cubre las 5 primeras reglas y este front door usa 2: `:443` y `:80`) + ~US$0,024 por GiB servido (US$0,012/GiB entrada y US$0,012/GiB salida, Santiago). El certificado administrado por Google no tiene cargo.

## Paso a paso

### 1. Verificar que el dominio está sano

Tres chequeos, en este orden. El primero prueba el carril de redirect, el segundo el carril TLS y la app, el tercero el estado del certificado.

```bash
# a) HTTP debe responder 301 hacia HTTPS
curl -sS -o /dev/null -w 'http=%{http_code} redirect=%{redirect_url}\n' http://globe.efeoncepro.com/

# b) HTTPS debe responder 200 con TLS válido (ssl_verify_result=0)
curl -sS -o /dev/null -w 'https=%{http_code} tls=%{ssl_verify_result} ip=%{remote_ip}\n' https://globe.efeoncepro.com/

# c) Estado del certificado administrado
gcloud compute ssl-certificates describe globe-studio-front-door-cert \
  --global --project efeonce-globe \
  --format='value(managed.status, managed.domainStatus)'
```

Esperado: `http=301` con `redirect=https://globe.efeoncepro.com:443/`; `https=200` con `tls=0` e `ip=8.233.189.79`; certificado `ACTIVE`. Si el HTML que vuelve trae `<title>Efeonce Globe — Internal creative studio</title>` y un header `x-correlation-id` propio, quien respondió fue la app, no una página del balanceador.

Si `curl` devuelve `http=000` **sin** `ip`, sospecha primero de tu resolver local, no del front door (ver *Problemas comunes*). Contrasta siempre contra un resolver público antes de concluir que algo se rompió:

```bash
dig @8.8.8.8 globe.efeoncepro.com +short
curl -sS -o /dev/null -w 'https=%{http_code} tls=%{ssl_verify_result}\n' \
  --resolve globe.efeoncepro.com:443:8.233.189.79 https://globe.efeoncepro.com/
```

### 2. Correr el smoke de federación humana

`smoke-human-federation.mjs` es el par humano de `smoke-private-api.mjs` (que cubre el carril workload con service account + ID token). Recorre las **tres piernas** del login real: `/auth/start` → authorize de Greenhouse → callback de Globe. Verifica de una sola pasada el front door, el `redirect_uri` que Globe anuncia y el allowlist del broker, contra el deployment real.

```bash
# dentro de ../efeonce-globe
GLOBE_WEB_BASE_URL=https://globe.efeoncepro.com \
GREENHOUSE_BASE_URL=<deployment Greenhouse que brokerea la federación> \
GREENHOUSE_AGENT_SECRET=<AGENT_AUTH_SECRET de ese deployment> \
GREENHOUSE_AGENT_EMAIL=agent@greenhouse.efeonce.org \
GREENHOUSE_VERCEL_BYPASS=<bypass, si el deployment tiene SSO de Vercel> \
node scripts/smoke-human-federation.mjs
```

Resultado correcto: un JSON con `"result": "human_federation_ok"`, más `advertisedRedirectUri` perteneciente al origen bajo prueba, `pkce: "S256"`, `stateEchoed: true`, `nonceSent: true`, `authorizationCode: "issued"`, `landing` empezando en `/studio` y `sessionCookie: "set"`.

**Caso: resolver con cache negativa.** Si tu máquina cacheó el `NXDOMAIN` de antes de crear el registro, el smoke fallará en tu equipo aunque el dominio funcione para todo el resto. Fija la resolución **sólo para ese proceso** (equivalente a `curl --resolve`):

```bash
GLOBE_SMOKE_RESOLVE=globe.efeoncepro.com:8.233.189.79 \
GLOBE_WEB_BASE_URL=https://globe.efeoncepro.com \
GREENHOUSE_BASE_URL=<...> GREENHOUSE_AGENT_SECRET=<...> \
node scripts/smoke-human-federation.mjs
```

Esto **no debilita ninguna aserción**: SNI, el CN del certificado, el header `Host` y el `redirect_uri` siguen viajando con el hostname real; sólo decide a qué dirección disca el socket. El JSON de salida lo declara en `resolveOverride`.

**Calibra antes de acusar.** Antes de un cutover, corre el mismo smoke contra el origen `run.app`. Si pasa ahí y falla después contra el dominio, el culpable es el cutover. Un smoke que nunca pasó no es evidencia de nada.

### 3. Agregar o quitar un redirect URI del allowlist

El allowlist es **exacto** y se administra con el CLI de Greenhouse. **Sin `--apply` es dry-run** y no escribe nada: siempre corre primero el dry-run y lee `projectedRedirectUris`.

```bash
# dentro de greenhouse-eo — dry-run (no escribe)
pnpm sister-platform:redirect --client globe --add https://globe.efeoncepro.com/auth/callback

# aplicar
pnpm sister-platform:redirect --client globe --add https://globe.efeoncepro.com/auth/callback --apply
```

El dry-run imprime `mode: "dry-run"`, `currentRedirectUris` y `projectedRedirectUris`. El apply imprime `mode: "apply"`, `previousRedirectUris`, `redirectUris` y `changed`. Re-agregar un URI que ya está es no-op (`changed: false`). Quitar un URI que **no** está en el allowlist **falla fuerte** (`invalid_redirect_uri`) en vez de callar: durante un cutover, un no-op silencioso sobre una vista desactualizada es justo cómo sobrevive el callback equivocado.

Para retirar un URI:

```bash
pnpm sister-platform:redirect --client globe \
  --remove https://globe-studio-internal-818083690953.southamerica-west1.run.app/auth/callback --apply
```

**Verifica contra el broker antes de tocar el runtime.** El endpoint `GET /api/auth/sister-platforms/authorize` valida el `redirect_uri` **antes** de mirar la sesión, así que discrimina sin necesidad de login. Pero valida **en orden**: `client_id` → cliente → `redirect_uri` → `response_type` → `state` → `nonce` → PKCE (`validateSisterPlatformAuthorizeRequest` en `src/lib/sister-platforms/oauth-broker.ts`). Un probe recortado devuelve `400` incluso sobre un URI **sí permitido**, así que el probe va **completo**:

```bash
# dentro de greenhouse-eo — probe completo contra el deployment que brokerea la federación
GREENHOUSE_BASE_URL='<deployment Greenhouse que brokerea la federación>'
URI='https://globe.efeoncepro.com/auth/callback'
CHALLENGE='probe-challenge-probe-challenge-probe-chall'  # 43+ chars, [A-Za-z0-9._~-]

curl -sS -w '\nhttp=%{http_code}\n' \
  -H "x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET" \
  "$GREENHOUSE_BASE_URL/api/auth/sister-platforms/authorize?client_id=globe&redirect_uri=$URI&response_type=code&state=probe&nonce=probe&code_challenge=$CHALLENGE&code_challenge_method=S256"
```

El header `x-vercel-protection-bypass` sólo hace falta si ese deployment tiene SSO de Vercel; se manda **sólo** al origen de Greenhouse.

Cómo se lee el resultado — el discriminador está en el **body**, no en el código HTTP:

| Respuesta | Qué significa |
| --- | --- |
| `303` | el `redirect_uri` está en el allowlist (y sigue al login si no hay sesión) |
| `400` + `{"error":"invalid_redirect_uri"}` | ese `redirect_uri` **no** está en el allowlist |
| `400` + `unsupported_response_type` / `missing_state` / `missing_nonce` / `invalid_pkce_challenge` | **el probe está incompleto**, no falta el allowlist: agrega el parámetro que reclama y repite |

Un wildcard (`https://*.efeoncepro.com/auth/callback`) responde `400 invalid_redirect_uri` siempre, por diseño.

**Orden obligatorio en un cutover de dominio:** primero el allowlist, después la env var. Agregar un redirect URI es inerte hasta que algo lo use; flipear `GLOBE_PUBLIC_BASE_URL` primero abre una ventana en la que `/auth/start` anuncia un callback todavía no permitido y el SSO queda roto.

```bash
# recién después de que el allowlist ya acepta el nuevo callback
gcloud run services update globe-studio-internal \
  --region southamerica-west1 --project efeonce-globe \
  --update-env-vars GLOBE_PUBLIC_BASE_URL=https://globe.efeoncepro.com
```

Ese valor es load-bearing: `apps/studio-web/src/app.ts` construye el callback como `new URL('/auth/callback', config.publicBaseUrl)` en `/auth/start`. Usa **siempre** `--update-env-vars`, nunca `--set-env-vars` (destructivo). Cierra con el smoke del paso 2.

> ⚠️ Las env vars de estos servicios hoy las declara Terraform (`infra/terraform/cloud_run_services.tf`): un flip por `gcloud` deja **drift deliberado** y no queda cerrado hasta reconciliar el HCL con el valor que se quiere conservar y aplicar ([`EFEONCE_GLOBE_IAC_RUNBOOK_V1.md` § Rollback por slice](../../operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md#rollback-por-slice)).

### 4. Diagnosticar el certificado cuando queda en `FAILED_NOT_VISIBLE`

`FAILED_NOT_VISIBLE` en `managed.domainStatus` **no es, por sí solo, un error de configuración**: es el resultado guardado del **primer** intento de validación de Google, que suele ocurrir antes de que exista el registro DNS. Google reintenta solo y el estado pasa a `ACTIVE` sin intervención (en la puesta en marcha del 2026-07-21 tardó ~28 minutos desde la creación del `A`).

Antes de tocar nada, descarta la causa real con esta secuencia. Si los seis pasan, el veredicto es **esperar**:

```bash
# 1. resolución desde dos resolvers públicos -> debe dar 8.233.189.79
dig @8.8.8.8 globe.efeoncepro.com +short
dig @1.1.1.1 globe.efeoncepro.com +short

# 2. sin AAAA y sin CNAME en el nombre
dig @8.8.8.8 globe.efeoncepro.com AAAA +short
dig @8.8.8.8 globe.efeoncepro.com CNAME +short

# 3. sin CAA que bloquee a Google Trust Services en la zona
dig @8.8.8.8 efeoncepro.com CAA +short

# 4. el certificado está adjunto al proxy HTTPS
gcloud compute target-https-proxies describe globe-studio-front-door-https-proxy \
  --global --project efeonce-globe --format='value(sslCertificates)'

# 5. la regla :443 apunta a la IP correcta
gcloud compute forwarding-rules describe globe-studio-front-door-https \
  --global --project efeonce-globe --format='value(IPAddress, portRange)'

# 6. el ALB ya responde por el dominio real
curl -sS -o /dev/null -w 'http=%{http_code}\n' http://globe.efeoncepro.com/
```

No borres ni recrees el certificado por impaciencia: un certificado administrado no se edita en el lugar (el recurso lleva `create_before_destroy`), y recrearlo reinicia el reloj de validación.

### 5. Endurecer / restaurar el ingress

El estado endurecido del servicio es `internal-and-cloud-load-balancing`: es lo que hace que el `run.app` responda `404` y deje al ALB como **único camino de browser**. Aplícalo al cerrar el cutover, y **vuelve a aplicarlo** si alguien revirtió el ingress o si el servicio se reconstruyó:

```bash
gcloud run services update globe-studio-internal \
  --region southamerica-west1 --project efeonce-globe \
  --ingress internal-and-cloud-load-balancing
```

> ⚠️ El `ingress` hoy lo declara Terraform (`infra/terraform/cloud_run_services.tf`): este comando es un **segundo escritor** y deja drift deliberado, así que no queda cerrado hasta reconciliar el HCL y aplicar ([`EFEONCE_GLOBE_IAC_RUNBOOK_V1.md` § Rollback por slice](../../operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md#rollback-por-slice)).

Verificación esperada — las dos vías, en este orden:

```bash
# a) acceso directo por run.app -> 404 (bloqueado)
curl -sS -o /dev/null -w 'run_app=%{http_code}\n' \
  https://globe-studio-internal-818083690953.southamerica-west1.run.app/

# b) el dominio por el ALB -> 200
curl -sS -o /dev/null -w 'alb=%{http_code}\n' https://globe.efeoncepro.com/
```

Cierra con el smoke del paso 2 contra el dominio: en la puesta en marcha del 2026-07-21 dio `human_federation_ok` **antes y después** del endurecimiento. El endurecimiento tampoco toca `invokerIamDisabled` (sigue `true`) ni los topes de escala, que hoy gobierna Terraform (paso 6).

**Por qué se hizo con `gcloud` y qué gobierna hoy.** La spec original de `TASK-1507` decía "vía Terraform", pero al momento del cutover los servicios Cloud Run todavía no estaban adoptados: el Terraform del front door referenciaba `globe-studio-internal` como string literal en el NEG, justamente para **no** adoptar el servicio, y `gcloud` era el único camino consistente con el scope de entonces. **`TASK-1508` lo cerró**: hoy los dos servicios están bajo IaC y el `ingress` lo gobierna `infra/terraform/cloud_run_services.tf`, así que un `gcloud run services update --ingress` es un **segundo escritor** sobre un campo declarado en el HCL (ver el aviso de arriba y el cierre obligatorio del paso 7). Para revertir al acceso directo por `run.app`, `--ingress all` (paso 7).

### 6. El ceiling de escala (drift-trap CERRADO por `TASK-1508`)

`TASK-1507` **no tocó `maxScale` en ninguna dirección**. Quien gobierna el techo de réplicas de ambos servicios es Terraform, desde que **`TASK-1508`** los adoptó (2026-07-21).

Un servicio Cloud Run tiene ceiling **a nivel servicio** y **a nivel revisión**, y **Cloud Run aplica el menor**. Hoy ambos están en **3/3** en los dos servicios y los gobierna `infra/terraform/cloud_run_services.tf`. Además, **`deploy-internal.yml` pasa sólo `--image`**: un redeploy por ese workflow ya no pisa la escala, así que **no hay nada que restaurar después de un deploy**.

> **NUNCA** "restaures" el ceiling con `gcloud run services update <servicio> --max-instances=3`. Ese subcomando escribe el ceiling **de revisión**, no el de servicio; como Cloud Run aplica el menor, el comando **aparenta** restaurar y deja el techo efectivo en 1. Era exactamente el workaround inefectivo que este manual prescribía, y hoy además sería un segundo escritor sobre un campo que gobierna Terraform. Si hace falta cambiar la escala, **se cambia en el HCL y se aplica**.

Consecuencia registrada: mientras el techo efectivo estuvo en 1 nunca hubo más de una réplica, así que el **spend fence cross-réplica de `TASK-1465` nunca se ejercitó**. Ejercitarlo es **`TASK-1512`**.

El **ingress no es drift-trap** de ese workflow: `deploy-internal.yml` no pasa `--ingress`, y `gcloud run deploy` preserva los ajustes a nivel servicio que no se especifican.

### 7. Rollback por slice

**Es una secuencia, no un menú.** Los pasos están ordenados de la recuperación más barata a la más lenta, **se ejecutan en orden** y **te detienes en el primero que resuelva**. No hace falta desarmar el ALB para recuperar el acceso: los dos primeros pasos restauran el login sin tocar DNS ni Terraform.

> ⚠️ **Precondición que no es opcional: el paso 1 (ingress) es requisito del paso 2.**
> Revertir sólo `GLOBE_PUBLIC_BASE_URL` con el ingress todavía en `internal-and-cloud-load-balancing` **empeora el estado en vez de arreglarlo**: el `run.app` sigue respondiendo `404` —lo bloquea el ingress, no la env var— y el dominio, que sí sigue sirviendo por el ALB, pasa a anunciar en `/auth/start` un callback que el browser no puede alcanzar. Así que el login queda roto por el lado que antes funcionaba. **El paso 2 por sí solo no es un rollback, es un segundo incidente.**

| Orden | Slice | Cómo revertir | Ventana |
| --- | --- | --- | --- |
| 1 | **Ingress endurecido** (precondición de 2) | `gcloud run services update globe-studio-internal --region southamerica-west1 --project efeonce-globe --ingress all` — restaura el acceso directo por `run.app`; para volver al estado endurecido, paso 5 | < 10 min |
| 2 | **URL / OAuth** | `gcloud run services update globe-studio-internal --region southamerica-west1 --project efeonce-globe --update-env-vars GLOBE_PUBLIC_BASE_URL=<url run.app>` — el `run.app` **ya está** en el allowlist, no hace falta escribir en la base | < 15 min |
| 3 | **DNS** | Quitar el registro `A` de `globe.efeoncepro.com` en HostGator (out-of-band) | < 60 min (propagación) |
| 4 | **ALB** | Revertir el **HCL del front door** — el contenido de `16919d9` (Slice 1) **y** `cf5e4d1` (el `depends_on`), que forman una unidad — y destruir la **IP global**; después `tofu plan` → **leer el plan** → `tofu apply`. **NO es un `git revert` a ciegas:** ver la nota de abajo | Según plan |

**Cierre obligatorio del rollback.** Los pasos 1 y 2 escriben campos que hoy **gobierna Terraform** (`ingress` y las env vars, en `infra/terraform/cloud_run_services.tf`). Usar `gcloud` sigue siendo **correcto como maniobra de emergencia** —es lo más rápido para recuperar el acceso—, pero deja **drift deliberado**: un `tofu plan` que muestre esos campos en diff justo después **no es un error del state**, es la evidencia de que falta reconciliar. **El rollback no está cerrado hasta reconciliar el HCL con el estado que se quiere conservar y aplicar**; si no, el próximo apply deshace el rollback en silencio. Carril completo: [`EFEONCE_GLOBE_IAC_RUNBOOK_V1.md` § Rollback por slice](../../operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md#rollback-por-slice).

**Por qué el paso 4 no es un `git revert` a ciegas.** `16919d9` introdujo `variable "front_door_domain"`, y
desde `TASK-1508` la referencia también `infra/terraform/cloud_run_services.tf` (`GLOBE_PUBLIC_BASE_URL`).
Un `git revert` de ese commit borraría la variable dejando viva la referencia, y `tofu plan` **aborta** con
`Reference to undeclared input variable` — ni siquiera produce plan, en medio de un rollback. El orden correcto
lo resuelve solo si se respeta la secuencia: **el paso 2 ya dejó de usar el dominio**, así que al llegar al
paso 4 hay que **editar `cloud_run_services.tf` para que `GLOBE_PUBLIC_BASE_URL` no dependa de
`var.front_door_domain`** (o hacerlo en la misma edición) y recién ahí retirar el HCL del front door junto con
la variable. Los dos commits siguen siendo la unidad de contenido a revertir —revertir sólo `16919d9` deja
huérfano el fix de `cf5e4d1`, y sólo `cf5e4d1` reabre la carrera con `compute.googleapis.com`—, pero se aplica
como edición reconciliada, no como revert automático.

**Si los pasos 1-2 se hicieron con `gcloud`, releé el plan antes de aplicar.** Aplicar sin reconciliar, con el
ALB ya destruido, es outage total. Y el paso 4 se ejecuta **por Terraform**, nunca destruyendo recursos a mano desde la consola o con `gcloud`: un destroy manual driftea el state y deja el siguiente `plan` mintiendo. Carril IaC completo (plan/apply/state): [`EFEONCE_GLOBE_IAC_RUNBOOK_V1.md` § Rollback por slice](../../operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md#rollback-por-slice).

Por eso el callback `run.app` se conserva deliberadamente en el allowlist: es el camino de rollback documentado y evita tener que escribir en la base bajo presión. Con el ingress endurecido ese origen no es alcanzable por browser, así que un código enviado ahí no llega a ninguna parte.

## Qué significan los estados o señales

- **`http=301` + `https=200` + `tls=0`:** front door sano. El `301` va a `https://globe.efeoncepro.com:443/` con la query intacta (`strip_query=false`).
- **Respuesta con `<title>Efeonce Globe — Internal creative studio</title>` y `x-correlation-id` propio:** respondió la aplicación, no el balanceador. Es la diferencia entre "el ALB está arriba" y "el servicio está sirviendo".
- **Certificado `PROVISIONING`:** todavía validando; normal justo después del apply o del alta de DNS.
- **Certificado `FAILED_NOT_VISIBLE`:** resultado del primer intento de validación, típicamente previo al DNS. Ver paso 4. Google reintenta solo.
- **Certificado `ACTIVE`:** en la puesta en marcha se sirvió `CN=globe.efeoncepro.com`, emisor `Google Trust Services CN=WR3`, válido `Jul 21 2026` → `Oct 19 2026`. La renovación es administrada por Google.
- **`curl` con `http=000` y sin `remote_ip`:** no es el dominio, es tu resolver. Ver *Problemas comunes*.
- **Broker: `400 invalid_redirect_uri` vs `303`:** el `400` dice que ese `redirect_uri` **no** está en el allowlist; el `303` dice que sí (y sigue al login si no hay sesión). Es el discriminador barato, sin necesidad de autenticarse.
- **`run.app` directo → `404`:** correcto tras endurecer el ingress a `internal-and-cloud-load-balancing` (paso 5). El único camino de browser es el ALB.
- **`globe-api-internal` anónimo → `403`:** correcto, antes y después. La API sigue IAM-privada, su `GLOBE_API_EXPECTED_AUDIENCE` contiene los dos formatos de URL `run.app` y **nunca** el dominio de browser; su `GLOBE_PUBLIC_BASE_URL` es el placeholder `https://globe-api-internal.invalid`.
- **`invokerIamDisabled=true` en `globe-studio-internal`:** correcto para un servicio web con SSO — un browser no presenta ID token; la app autentica por su cookie de sesión.
- **`maxScale=3`:** baseline vigente en ambos servicios, en el ceiling de servicio y en el de revisión (3/3), gobernado por Terraform. Ver el paso 6.
- **Smoke: `"result": "human_federation_ok"`:** las tres piernas del login pasaron contra el deployment real.

## Qué no hacer

- **NUNCA** le des un **custom domain** a `globe-api-internal`, ni lo expongas al browser. Se queda IAM-privado y su audiencia se deriva del `run.app`, jamás del dominio de browser. Hoy hay **0 domain mappings** en el proyecto y el NEG apunta sólo a `globe-studio-internal`.
- **NUNCA** uses **wildcards** en el allowlist de redirect URIs. El broker los rechaza por diseño (`normalizeRedirectUris` es la única autoridad de validación: rechaza wildcards, exige HTTPS salvo `localhost`, nunca acepta vacío). Si te ves queriendo un wildcard, lo que necesitas es agregar el URI exacto.
- **NUNCA** corras el seed de pilot (`scripts/seed-globe-internal-pilot.ts`) para **agregar** un redirect URI. Ese seed **reemplaza** el array completo (borraría el `run.app`, tu camino de rollback) y **rota el client secret** (`rotateToken: true`), lo que rompe el SSO vivo. Para mover un allowlist en un cliente en producción existe `pnpm sister-platform:redirect`, que toca exclusivamente la columna `redirect_uris`.
- **NUNCA** trates este dominio como **Production**. No es GA, no habilita acceso de clientes externos, no es alta disponibilidad y no autoriza marketing. Ese salto sigue gateado por `TASK-1480`.
- **NUNCA** uses `--set-env-vars` en un servicio vivo: es destructivo y borra las variables que no menciones. El comando correcto es `--update-env-vars`.
- **NUNCA** flipees `GLOBE_PUBLIC_BASE_URL` antes de que el allowlist acepte el callback nuevo. El orden es allowlist → verificación contra el broker → env var → smoke.
- **NUNCA** destruyas el ALB dejando la **IP global reservada y sin adjuntar**: empieza a facturar como IP estática ociosa. Si haces rollback del ALB, destruye también la dirección.
- **NUNCA** habilites la caché de CDN en el backend del front door. `enable_cdn = false` es deliberado: sirve un shell SSO autenticado por sesión, y cachearlo en el edge sería un bug de correctitud.
- **NUNCA** escribas documentación gobernante de Globe dentro de `efeonce-globe/docs/**`. Vive en `greenhouse-eo`, bajo `creative-studio/`.
- **NUNCA** hagas `git commit --no-verify` / `git push --no-verify` sin autorización explícita del operador.

## Problemas comunes

- **`curl` da `status=000` sin `remote_ip`, pero el dominio funciona para el resto:** tu resolver mantiene **cache negativa**. El `SOA` de `efeoncepro.com` tiene `minimum` 86400, así que un `NXDOMAIN` cacheado antes de crear el registro persiste ~24 h. Ojo: `dscacheutil -flushcache` **sin sudo no hace nada**. Verifica con `dig @8.8.8.8` y trabaja con `curl --resolve` o `GLOBE_SMOKE_RESOLVE=globe.efeoncepro.com:8.233.189.79` hasta que expire.
- **El certificado quedó en `FAILED_NOT_VISIBLE`:** sigue la secuencia de seis chequeos del paso 4. Si todos pasan, espera: Google reintenta solo y el estado pasa a `ACTIVE` (~28 min en la puesta en marcha). No recrees el certificado.
- **Después del cutover el SSO rebota con `invalid_redirect_uri`:** el `redirect_uri` que Globe anuncia no está en el allowlist. Pasó el orden invertido (env var antes que allowlist). Corre el dry-run del paso 3 para ver el estado real, agrega el URI con `--apply` y re-corre el smoke. Si necesitas volver ya, usa el rollback del paso 7 **en orden** —ingress primero, después `GLOBE_PUBLIC_BASE_URL`—: ese callback `run.app` sigue permitido, pero revertir sólo la env var con el ingress endurecido deja el `run.app` en `404` y rompe también el dominio.
- **El apply de Terraform falla con `SERVICE_DISABLED` sobre `compute.googleapis.com`:** la API se acaba de habilitar y no propagó. No reintentes a ciegas: el recurso afectado es `google_compute_url_map.front_door_http_redirect`, la única raíz del grafo sin arista implícita hacia la API (el carril HTTPS la alcanza transitivamente vía backend service → NEG). Ya lleva un `depends_on` explícito a `google_project_service.enabled["compute.googleapis.com"]`; si el error reaparece en otro recurso nuevo, arregla la carrera en el HCL con la misma forma.
- **`maxScale` volvió a 1 después de un deploy:** ya no pasa. `deploy-internal.yml` pasa sólo `--image` y Terraform declara los dos ceilings en 3/3 (cerrado por `TASK-1508`). Si un plan muestra el ceiling en diff, alguien escribió por fuera del HCL — reconciliar, no "restaurar" con `gcloud`.
- **`--remove` falla con `invalid_redirect_uri`:** por diseño. Ese URI no estaba en el allowlist, y el CLI prefiere fallar fuerte antes que hacer un no-op silencioso sobre una vista desactualizada. Corre el dry-run para ver la lista vigente y copia el URI exacto.
- **El acceso directo por `run.app` da 404:** correcto tras el endurecimiento de ingress (paso 5). Entra por `https://globe.efeoncepro.com/`. Si necesitas el acceso directo de vuelta (rollback), usa `--ingress all`.
- **El `run.app` volvió a responder (no da 404):** el ingress quedó en `all` — por un rollback que nadie revirtió o por un servicio reconstruido. Vuelve a endurecerlo con el comando del paso 5. Ojo: **no** es drift del workflow (`deploy-internal.yml` no pasa `--ingress`).
- **Globe no valida con `pnpm local:check` de Greenhouse:** son toolchains distintos. Valida Globe con `pnpm check` / `pnpm build` dentro de `efeonce-globe`.

## Referencias técnicas

- **Contrato canónico del front door (SPEC-009)** — SoT de los invariantes, incluido el rollback como secuencia: [`EFEONCE_GLOBE_INTERNAL_FRONT_DOOR_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_INTERNAL_FRONT_DOOR_V1.md).
- Decisión de hosting (ADR-004): [`EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md).
- Continuidad de runtime en vivo: [`GLOBE_RUNTIME_HANDOFF.md`](../../operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md).
- **Carril IaC** (plan/apply/import/state) y qué gobierna Terraform hoy: [`EFEONCE_GLOBE_IAC_RUNBOOK_V1.md`](../../operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md).
- Persistencia durable (la capacidad que levantó el pin de 1 réplica en memoria): [`operar-persistencia-globe.md`](./operar-persistencia-globe.md).
- Contrato de plataformas hermanas / broker OAuth: [`GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`](../../architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md).
- Tasks relacionadas: `TASK-1506` (decisión), `TASK-1507` (este front door), `TASK-1508` (Cloud Run bajo IaC — cerró el drift-trap del ceiling de escala), `TASK-1512` (ejercitar el spend fence cross-réplica), `TASK-1480` (gate de acceso externo / Production), `TASK-1465` (persistencia durable).
- Documentación funcional (lenguaje simple): [`dominio-interno-globe.md`](../../documentation/creative-studio/dominio-interno-globe.md).
- Programa: [`EPIC-028`](../../epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md). Skill: `greenhouse-globe`.

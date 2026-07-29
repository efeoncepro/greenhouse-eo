# TASK-1557 — Globe Static Asset CDN (path-scoped sobre `/assets`)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-028`
- Status real: `Complete — aplicado y verificado en vivo; CDN sirviendo /assets/* con hits del edge`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `none` (TASK-1556 cerrada 2026-07-25: el bundle content-addressed ya existe)
- Branch: `task/TASK-1557-globe-static-asset-cdn`
- GitHub Issue: `TBD`

## Summary

Habilita **Cloud CDN sobre el ALB existente de Globe, exclusivamente para `/assets/*`**, mediante un backend
service dedicado y un path matcher en el URL map. El backend del shell SSO **conserva `enable_cdn = false`**: es
una superficie autenticada por sesión y cachearla sería un bug de correctitud, no una optimización. Sirve para que
el bundle estático que produce `TASK-1556` se entregue desde el edge a clientes fuera de Chile.

## Why This Task Exists

Globe es un **producto comercial** (ADR-010) cuyo ICP declarado son *"equipos de marketing/creatividad mid-market y
enterprise con demanda recurrente, **múltiples formatos/mercados**"*, con posicionamiento *"LATAM-first, no
LATAM-limited… mercados en inglés"*. Pero la plataforma corre en **una sola región, `southamerica-west1`
(Santiago)**: un cliente en Madrid o Nueva York paga ~200 ms de ida y vuelta contra Santiago en **cada** asset.

Hasta ahora eso no era resoluble por CDN: el servidor **genera el HTML en cada request**, así que no hay nada
cacheable. `TASK-1556` cambia eso — produce un bundle estático con hash en el nombre, que es el caso de uso
canónico de un CDN (inmutable, `Cache-Control: public, max-age=31536000, immutable`).

`SPEC-009` puso `enable_cdn = false` en el backend del front door **deliberadamente**, y esa decisión sigue siendo
correcta para el shell. Esta task **no la revierte**: agrega un carril separado para los assets, dejando el shell
exactamente como está.

## Goal

- `/assets/*` se sirve desde el edge de Google con caché, sin que el shell SSO ni ninguna ruta autenticada entren
  al carril cacheado.
- El primer byte de los assets deja de depender de la latencia a Santiago para clientes fuera de la región.
- El cambio queda íntegramente en Terraform, gobernado, con rollback de un `apply`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_INTERNAL_FRONT_DOOR_V1.md` — **SPEC-009**: la topología del ALB
  (IP global → forwarding rules → target proxies → url map → backend service → serverless NEG regional →
  `globe-studio-internal`), y **por qué `enable_cdn = false`** en el backend del shell.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md` — ADR-014: el bundle que
  esta task cachea.
- `docs/operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md` — protocolo de `plan`/`apply`.

Reglas obligatorias:

- **NUNCA** prender `enable_cdn` en el backend service del **shell**. Es una superficie autenticada por sesión SSO;
  cachearla en el edge es un bug de correctitud con riesgo de servir la sesión de otro.
- **NUNCA** dejar que una ruta autenticada caiga en el carril cacheado. El path matcher es allowlist explícito de
  `/assets/*`, no un catch-all con excepciones.
- **NUNCA** aplicar un `plan` que muestre `destroy`/`replace` sobre el ALB, el certificado gestionado, la IP global
  o el serverless NEG vivos. El protocolo es `plan` → **leer el plan** → `apply` con cero destroy/replace.
- **NUNCA** convertir el literal del serverless NEG en referencia de recurso dentro de esta task (SPEC-009).
- **NUNCA** mover configuración del ALB con `gcloud` fuera de un incidente documentado: el SoT es Terraform y una
  mutación out-of-band muere en el próximo `apply`, en silencio.

## Normative Docs

- `infra/terraform/front_door.tf` (en `efeonce-globe`) — los 10 recursos del front door.
- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md` §96-114 — el ICP multi-mercado
  que justifica el edge.

## Dependencies & Impact

### Depends on

- **`TASK-1556`** — sin bundle estático no hay nada que cachear. Bloqueante duro.
- `infra/terraform/front_door.tf` + el ALB vivo (`globe.efeoncepro.com`, IP `8.233.189.79`).
- `apps/studio-web/src/assets.ts` — el allowlist que sirve `/assets/*`.

### Blocks / Impacts

- Ninguna task. Es aditiva y terminal.
- Mejora la latencia percibida de **todas** las superficies del payload nuevo, presentes y futuras.

### Files owned

En `efeonce-globe`:

- `infra/terraform/front_door.tf` (backend service nuevo + path matcher en el url map)
- `infra/terraform/variables.tf` (`assets_cdn_enabled`)
- `apps/studio-web/src/assets.ts` (headers `Cache-Control` de los assets con hash)

## Current Repo State

### Already exists

- ALB global + `globe.efeoncepro.com` + certificado gestionado + redirect HTTP→HTTPS, los 10 recursos en
  `front_door.tf`, aplicados y verificados en vivo (SPEC-009, `TASK-1507`).
- `google_compute_backend_service` del shell con **`enable_cdn = false` deliberado**.
- Serverless NEG en `southamerica-west1` apuntando a `globe-studio-internal` **por string literal**.
- `assets.ts` — allowlist explícito (`Map` path → archivo + content-type) que ya sirve assets con nonce.

### Gap

- No hay backend service para assets, ni path matcher: hoy **todo** el tráfico va al mismo backend sin caché.
- Los assets se sirven sin `Cache-Control` de larga duración (hoy no hace falta porque no hay bundle con hash).
- `Cloud CDN` no está habilitado en el proyecto para este ALB.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `efeonce-globe/infra/terraform` (IaC del repo hermano). En `greenhouse-eo` esta task sólo produce
  gobierno documental.
- Future candidate home: `remain-shared`
- Boundary: el carril cacheado sirve **exclusivamente** artefactos estáticos content-addressed. Ninguna superficie
  autenticada, ningún dato de tenant, ningún byte de media privada (los assets de media siguen por el gateway
  `/v1/media/:sha256`, que re-autoriza por request y **no** entra acá).
- Server/browser split: `n/a` — cambio de infraestructura, sin código de aplicación salvo headers de caché.
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Source of truth and contract surface

- Source of truth: `infra/terraform/front_door.tf` — la topología del ALB es IaC, no `gcloud`.
- Contract surface: `GET /assets/*` sobre `https://globe.efeoncepro.com`. Sin contrato de API nuevo, sin capability
  nueva, sin reader ni command.
- Consumers: el browser de cualquier superficie de Globe servida por el payload nuevo.

### Data invariants and boundaries

- Entidades/tablas/views afectadas: **ninguna**. Esta task no toca Postgres, GCS ni el dominio.
- Invariantes que no se pueden romper:
  - El backend del **shell SSO** conserva `enable_cdn = false`.
  - El carril cacheado sirve **sólo** paths bajo `/assets/`; todo lo demás sigue yendo al backend actual.
  - Ningún byte de media privada (`/v1/media/*`, `/v1/shares/*/media`) entra al carril cacheado: esos paths
    re-autorizan por request y **deben** seguir haciéndolo.
- Tenant/space boundary: los assets son **tenant-blind por construcción** (código de la app, no datos). No hay
  derivación de tenant en este carril, y no debe haberla.
- Idempotency/concurrency: `n/a` — cambio declarativo de infraestructura.
- Audit/outbox/history: `n/a` — el audit del cambio es el estado de Terraform y el historial de `apply`.

### Migration, backfill and rollout

- Migration posture: `additive` — recursos nuevos; ningún recurso existente se destruye ni se reemplaza.
- Default state: `flag OFF` — `assets_cdn_enabled` default `false` en `variables.tf`.
- Backfill plan: `n/a`.
- Rollback path: `assets_cdn_enabled = false` + `apply` → el path matcher desaparece y todo vuelve al backend
  único. Sin pérdida de servicio.
- External coordination: ninguna. No hay DNS, ni certificado nuevo, ni cambio de OAuth.

### Security and access

- Auth/access gate: **ninguno en el carril de assets, y es correcto**: son artefactos públicos de la aplicación,
  no datos. El gate real vive donde siempre — sesión SSO para el shell, bearer `Globe-Share` para el share,
  media ticket + re-autorización para `/v1/media/*`.
- Sensitive data posture: `no sensitive data`. **El criterio de aceptación incluye probar esto**: nada bajo
  `/assets/*` puede contener secretos, tokens, datos de tenant, slug de proveedor, costo ni margen.
- Error contract: sin cambios; el ALB devuelve los errores del backend.
- Abuse/rate-limit posture: el CDN **reduce** exposición del origen. No se agrega rate limit nuevo.

### Runtime evidence

- Local checks: `tofu fmt -check` + `tofu validate` (los mismos que corre `terraform-check.yml` en cada PR).
- DB/runtime checks: `n/a` — no toca base de datos.
- Integration checks: `curl -I` a un asset con hash verificando `Cache-Control` y `Age`/`X-Cache`; `curl -I` al
  shell verificando que **no** trae headers de caché de CDN.
- Reliability signals/logs: métricas de Cloud CDN (hit ratio) en el proyecto `efeonce-globe`.
- Production verification sequence: ver §Rollout.

### Capability Definition of Done — Full API Parity gate

`N/A — no capability`. Esta task no introduce ni modifica ninguna acción de negocio: es entrega de artefactos
estáticos por el edge. No hay estado, permisos, datos, aprobaciones, exports ni configuración de negocio en juego,
así que no hay contrato que exponer a Nexa/MCP/CLI.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### ~~Slice 1 — Headers de caché en el origen~~ → **YA ENTREGADO por `TASK-1556`**

`assets.ts` declara política **por asset** desde `TASK-1556`: `public, max-age=31536000, immutable` para
los content-addressed y `public, max-age=3600, immutable` para los de nombre estable. La spec lo pedía
como prerrequisito y llegó antes. No se re-implementa.

<details><summary>Scope original (histórico)</summary>

- `assets.ts` emite `Cache-Control: public, max-age=31536000, immutable` **sólo** para artefactos con hash en el
  nombre (el bundle de `TASK-1556`).
- Los assets sin hash (isotipos, wordmark, fuentes Tabler) reciben una política más corta y explícita.
- El shell y cualquier ruta autenticada conservan `Cache-Control: private, no-store`.

</details>

### Slice 2 — Carril cacheado en Terraform

- `google_compute_backend_service` nuevo, con `enable_cdn = true` y política de caché explícita
  (`cache_mode`, TTLs declarados — **ningún valor implícito**), apuntando al **mismo** serverless NEG.
- Path matcher en el url map: `/assets/*` → backend cacheado; `/*` → backend actual **sin tocar**.
- Variable `assets_cdn_enabled` en `variables.tf`, default `false`, que condiciona la creación de ambos.

### Slice 3 — Apply y verificación

- `tofu plan` → leer el plan → confirmar **cero** `destroy`/`replace` → `apply`.
- Verificación de hit del CDN, de que el shell no se cachea, y de que ningún path autenticado cayó en el carril.

## Progress — 2026-07-25

**Code complete; rollout pendiente.** Commit en `efeonce-globe`: `225f483`.

- Slice 1 ya venía entregado por `TASK-1556` (política de caché por asset en `assets.ts`).
- Slices 2-3 implementados: backend service con `enable_cdn` sobre el **mismo** NEG + path matcher
  allowlist de `/assets/*`, todo detrás de `assets_cdn_enabled` (default `false`).
- **Gate de CI verde**, el mismo que corre `terraform-check.yml`: `fmt -check -recursive` +
  `init -backend=false` + `validate`.

### Dos decisiones que `validate` obligó a tomar explícitas

- **`cache_mode = USE_ORIGIN_HEADERS`** en vez de declarar TTLs en Terraform: el origen ya declara
  política exacta por asset, y repetirla acá crearía una segunda fuente de verdad que driftea en
  silencio — el edge sirviendo bajo una política que el origen ya no declara.
- **`cache_key_policy.include_query_string = false`**: los objetos son content-addressed, así que un
  `?v=…` identifica el mismo archivo. Incluirlo dejaría fragmentar —y llenar— el caché con variantes
  ilimitadas de un objeto, y hundiría el hit rate de justo lo que este carril existe para servir.

### Rollout COMPLETO — aplicado y verificado en vivo (2026-07-25)

`plan` con el flag apagado: **`No changes`** — el cambio era inerte. Con el flag prendido:
**`1 to add, 1 to change, 0 to destroy`**, el backend del shell **ausente del diff** y su
`enableCDN` real en `False`. Aplicado; `plan` posterior en `No changes`.

**Estado real post-apply:** `globe-studio-front-door-assets` con `ENABLE_CDN=True`;
`globe-studio-front-door-backend` (shell) en `False`; el `defaultService` del url map **y** el del
path matcher apuntan al backend **sin caché**; la única `pathRule` cacheada es `/assets/*`.

**Verificación en vivo sobre `globe.efeoncepro.com`:**

| Path | Resultado |
|---|---|
| `/assets/brand/isotipo-globe-negativo.svg` | 200 · `public, max-age=3600, immutable` · **hits del edge: `age: 4`, `12`, `16`** |
| `/` (shell) | 200 · `no-store` · sin `age` |
| `/v1/shares/resolve` · `/v1/media/*` · `/shares/*` · `/studio` | `no-store` · sin `age` — ninguno viene del edge |

### El invariante dejó de vivir en un comentario

`apps/studio-web/src/front-door-contract.test.ts` fija por test los tres invariantes: el backend del
shell nunca con CDN, el carril cacheado siempre por allowlist con su default en el backend sin caché,
y la política de caché en manos del origen. Es el riesgo de severidad máxima de la matriz —una
respuesta autenticada servida desde el edge— y un `tofu plan` que voltea `enable_cdn` de `false` a
`true` se ve como cualquier otro diff. **Un comentario no rompe un build.**

### Lección de método

La primera verificación en vivo dio **404 en todo** y pareció una rotura de producción. Era `curl -I`,
que manda **HEAD**, y las rutas del app matchean `GET`. Lo delató un **405** en `/shares/*`: si el app
contesta `method_not_allowed`, el ruteo funciona. Con `GET`: 200. **El instrumento estaba mal, no la
infraestructura** — y confundirlos habría llevado a revertir un apply sano.

### Deuda ajena que hubo que tocar

`cloud_run_services.tf` y `locals.tf` fallaban `fmt -check` desde antes. No se ignoró: este cambio toca
`infra/terraform/` y dispara el mismo gate de CI. Se corrió `tofu fmt` y se verificó por diff que el
cambio es whitespace puro.

## Out of Scope

- **Prender CDN sobre el shell SSO** o cualquier superficie autenticada. Es la regla dura de esta task.
- **Cachear media privada** (`/v1/media/*`, `/v1/shares/*/media`). Esos paths re-autorizan por request y siguen
  yendo al origen. Si alguna vez se quiere edge para media, es otra decisión con su propia ADR.
- **Multi-región de la aplicación o la base de datos.** El CDN acerca los *assets*, no la API. La latencia de la
  API contra Santiago sigue existiendo y es scope de `TASK-1521`.
- **Resize de Cloud Run / Cloud SQL** — `TASK-1521`.
- **Cambiar el certificado, el dominio, el DNS o el ingress.**

## Detailed Spec

La topología resultante, sobre la que ya existe (SPEC-009):

```
IP global 8.233.189.79
  └─ forwarding rule :443 → target HTTPS proxy → URL MAP
                                                   ├─ path "/assets/*" → backend-service-assets  (enable_cdn = TRUE)  🆕
                                                   └─ default "/*"     → backend-service-shell   (enable_cdn = FALSE) · sin tocar
                                                                          ambos → el MISMO serverless NEG (southamerica-west1)
```

Dos precisiones que importan:

1. **Ambos backends apuntan al mismo NEG.** No se duplica infraestructura de cómputo: sólo cambia la política de
   caché por path. El NEG se sigue nombrando **por string literal**, como fijó SPEC-009.
2. **La política de caché es explícita.** `cache_mode`, `default_ttl`, `max_ttl` y `client_ttl` se declaran; no se
   heredan defaults. Un TTL implícito sobre un artefacto mal clasificado es exactamente cómo se cachea algo que no
   debía cachearse.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (headers en origen) → Slice 2 (Terraform) → Slice 3 (apply).
- **Slice 1 DEBE cerrar antes que Slice 2.** Habilitar caché en el edge sobre un origen que aún no declara
  `Cache-Control` deja que el CDN aplique heurísticas propias — que es cómo se cachea lo que no debía.
- La task entera está bloqueada por `TASK-1556`: sin bundle con hash, no hay artefacto inmutable que cachear.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Una ruta autenticada cae en el carril cacheado y el edge sirve la respuesta de una sesión a otra | SSO / privacidad | **low pero severidad máxima** | Path matcher es allowlist explícito de `/assets/*`, nunca catch-all con excepciones; verificación explícita de que el shell no trae headers de CDN | `curl -I` al shell mostrando caché; reporte de sesión cruzada |
| El `apply` toca el ALB vivo y tumba el front door | Front door / disponibilidad | low | Protocolo `plan` → leer → `apply` con cero destroy/replace; el backend del shell no se modifica | `plan` mostrando destroy/replace |
| Un asset viejo queda cacheado tras un deploy | UI | low | El bundle es content-addressed: cambiar el contenido cambia el nombre. Los assets sin hash llevan TTL corto declarado | Usuarios viendo UI desactualizada |
| Se cachea un artefacto con dato sensible | Confidencialidad | low | Criterio de aceptación que audita el contenido de `/assets/*`; el bundle no lleva secretos por construcción | Auditoría del bundle |
| Mutación out-of-band con `gcloud` que muere en el próximo apply | IaC | medium | El SoT es Terraform; ninguna operación de esta task se hace con `gcloud` | `tofu plan` con drift |

### Feature flags / cutover

- **`assets_cdn_enabled`** en `infra/terraform/variables.tf`, default **`false`**, condicionando el backend
  cacheado y el path matcher. **NUNCA** dejar su valor real sólo en `terraform.tfvars` (gitignoreado).
- Cutover: `assets_cdn_enabled = true` + `apply`. Revert: `false` + `apply`. Tiempo: <10 min.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR (sólo headers de respuesta) | <15 min | sí |
| Slice 2 | `assets_cdn_enabled = false` + `apply`: los recursos nuevos se destruyen, el backend del shell nunca se tocó | <10 min | sí |
| Slice 3 | Igual que Slice 2 | <10 min | sí |

### Production verification sequence

1. `TASK-1556` cerrada y el bundle con hash servido desde `/assets/`.
2. Slice 1 en `main` → `curl -I` a un asset con hash → confirmar `Cache-Control: public, max-age=31536000,
   immutable`; `curl -I` al shell → confirmar `private, no-store`.
3. Slice 2 → `tofu plan` → **leer el plan** → confirmar cero `destroy`/`replace` y que el backend del shell no
   aparece modificado.
4. `apply` con `assets_cdn_enabled = true`.
5. `curl -I` al asset dos veces → segunda respuesta con evidencia de hit de CDN.
6. `curl -I` al shell → **sin** headers de caché de CDN. Repetir autenticado.
7. Recorrer `/shares/:shareId` con un grant real y confirmar que la superficie funciona y que los bytes de media
   **siguen** viniendo del origen, no del edge.
8. Monitorear hit ratio y errores 24 h.

### Out-of-band coordination required

`N/A — repo-only change` sobre IaC de Globe. No hay DNS, certificados, secretos, OAuth ni sistemas de terceros
involucrados.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El backend service del **shell** conserva `enable_cdn = false` y no aparece modificado en el `plan`.
- [ ] El path matcher enruta **sólo** `/assets/*` al backend cacheado; el default sigue yendo al backend actual.
- [ ] La política de caché declara `cache_mode` y TTLs **explícitos**; ningún valor queda implícito.
- [ ] Un asset con hash devuelve `Cache-Control: public, max-age=31536000, immutable` y muestra hit de CDN en la
      segunda petición.
- [ ] El shell devuelve `private, no-store` y **ninguna** evidencia de caché de edge, autenticado y anónimo.
- [ ] `/v1/media/*` y `/v1/shares/*/media` **no** entran al carril cacheado: verificado con petición real.
- [ ] Auditoría del contenido de `/assets/*`: sin secretos, tokens, datos de tenant, slug de proveedor, costo ni
      margen.
- [ ] `tofu plan` con **cero** `destroy`/`replace` sobre ALB, certificado, IP global o NEG.
- [ ] `assets_cdn_enabled` declarado en `variables.tf` con default `false`.
- [ ] `tofu fmt -check` y `tofu validate` verdes en CI.
- [ ] `/shares/:shareId` funciona end-to-end con el CDN activo.

## Verification

- `tofu fmt -check -recursive` + `tofu init -backend=false` + `tofu validate` (workflow `terraform-check.yml`)
- `tofu plan` leído íntegro antes del `apply`
- `curl -I` sobre asset, shell y media (los tres carriles)
- Smoke de `/shares/:shareId` con grant real

## Closing Protocol

- [x] `Lifecycle` del markdown quedó sincronizado con el estado real
- [x] el archivo vive en la carpeta correcta
- [x] `docs/tasks/README.md` quedó sincronizado con el cierre
- [x] `Handoff.md` y `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md` quedaron actualizados
- [x] `changelog.md` quedó actualizado
- [x] se ejecutó chequeo de impacto cruzado sobre otras tasks afectadas
- [x] `EFEONCE_GLOBE_INTERNAL_FRONT_DOOR_V1.md` (SPEC-009) quedó actualizado con el carril de assets, dejando
      explícito que `enable_cdn = false` del shell **sigue vigente y por qué**
- [ ] **PENDIENTE — 2026-08-24:** el costo real del CDN queda registrado tras 30 días. Único ítem abierto del cierre; no bloquea la task pero sí es un compromiso con fecha.

## Follow-ups

- Evaluar, con datos de hit ratio reales, si conviene edge para derivados de media (poster, thumbnail) — sería
  otra decisión con su propia ADR, porque esos bytes hoy re-autorizan por request.
- `TASK-1521` — la latencia de la **API** contra Santiago sigue existiendo; el CDN no la resuelve.

## Open Questions

- ¿TTL de los assets **sin** hash (isotipos, wordmark, fuentes Tabler)? Propuesta: 24 h con revalidación. Decidir
  en Plan Mode contra la frecuencia real de cambio de marca.

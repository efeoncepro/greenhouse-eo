# Rooms + Efeonce Auth — estado al corte de Codex (2026-10-25)

> **Tipo:** auditoría de estado / handoff entre agentes.
> **Creado:** 2026-10-25 por Claude (Opus 5.5), a pedido de Julio.
> **Contexto:** Codex llevaba los goals de Rooms (EPIC-052) y de Efeonce Auth (EPIC-044, rollout
> controlado para Rooms) y se quedó sin uso cerca de las 22:55 UTC. El uso se restablece el 1 de noviembre.
> Esta auditoría reconstruye **hasta dónde llegó, qué está vivo, qué está apagado y qué falta**. No termina nada.
> **Método:** tres auditorías de solo lectura en paralelo (Auth, Rooms comprometido + cloud y WIP de
> medios de Rooms). Las afirmaciones de mayor impacto se reverificaron a mano. Cada hecho dice de dónde sale:
> `vivo` = readback en esta sesión; `doc` = lo afirma un documento de Codex y no se releyó; `local` = check
> corrido en esta sesión.

## 1. Resumen ejecutivo

| Frente | Estado real | Lo siguiente |
|---|---|---|
| **Efeonce Auth** | Código completo para Rooms: login first-party OIDC, Login V4 y OTP de invitación. Desplegado en `auth-server-00166-p77` con **ambos flujos nuevos OFF** (`vivo`). Login V4 servido en `/login`. Ningún correo enviado. | Que el CI del candidato `1859e90a6` termine verde. Preflight con `target-branch=main`, PR #262 listo para revisión y promoción gobernada. Después, flags ON y un único canary. |
| **Rooms: runtime comprometido** | `efeonce-rooms@20f9fe9` publicado en Vercel. Las 18 env `ROOMS_*` de Production están OFF (`doc`). DB `rooms_production` con 19 tablas y 5 migraciones. WIF, secretos y WAF activos (`vivo`/`doc`). | Canary conjunto con Auth: bootstrap de una sala sintética, un correo a `jreyes@efeoncepro.com`, prueba de replay/revocación y rollback. |
| **Rooms: medios privados (WIP)** | TASK-2070 (backend) y TASK-2071 (UI) **sin commitear** en `efeonce-rooms`, ~1.950 líneas. **`pnpm typecheck` falla** (`local`). Lint y 178 tests pasan, pero esos tests no incluyen medios. | Arreglar el TS2322, sumar `tests/media-*` al script, rama propia (nunca `main`), adapter cloud, GVC y aceptación humana. |

Nada de esto está `complete` operacionalmente. La etiqueta correcta para Auth y Rooms es **`code complete, rollout pendiente`**.

## 2. Efeonce Auth

### 2.1 Qué existe

- **Commit de la funcionalidad:** `deae1ce15` (159 archivos): login first-party (TASK-1834), renderer Login V4
  con contexto de producto Rooms (TASK-2064) y OTP de invitación por correo (TASK-2067).
- **Fixes posteriores:**
  - `f3d3713c9`: correos de eventos OFF durante el rollout.
  - `515ca529e`: monitor de drift y checks de release.
  - `754a2a280`: recibo de autoridad del operador.
  - `1859e90a6`: saca del árbol los recibos con identificadores del operador.
- **El runtime no cambió entre `754a2a2` y `1859e90a6`:** el diff de `services/auth-server` sale vacío.
- **El último mensaje de Codex en la sesión Auth** (19:40) cierra TASK-1833 con evaluación propia y revisión
  entre agentes en lugar de un pentest contratado. Dice que corrigió dos hallazgos, abrió el PR #262 y que la
  revisión automática bloqueó parte de las pruebas ofensivas. Esa cobertura **sigue pendiente**: no hay pentest completo.
- **Evidencia local que citan los docs** (`doc`):
  - 1834: PG efímero 6/6, focal 156/156.
  - 2064: 116 tests, GVC con 42 frames.
  - 2067: 116 PASS.
  - Suite completa: 21.598 PASS.
- **Arnés visual local:** `pnpm auth-server:dev-ui` (por defecto en el puerto 19036; Codex lo dejó en 19064 vía
  `AUTH_SERVER_DEV_UI_PORT`) sirve las pantallas reales con DTOs ficticios y sin autenticación.
  - `/login/rooms` revisado en esta sesión a 1440 y 375 px, sin desborde horizontal.
  - Muestra Microsoft, passkey y enlace por correo.
  - Otras rutas: `/login`, `/login/external`, `/magic-link/*`, `/invitation/*`, `/session/*`, `/error/*` y `/consent/multi-org-v2`.

### 2.2 Qué está vivo, qué está OFF y qué es solo código

| Pieza | Estado |
|---|---|
| `auth-server` | Revisión `auth-server-00166-p77`, Ready, 100% del tráfico, `GIT_SHA=754a2a28…` (`vivo`). Desplegada por `auth-server-deploy.yml` en push a `develop`. |
| `AUTH_SERVER_ENABLED`, `OAUTH`, `PERSON_AUTH`, `INTERNAL_AUTH`, `INTERNAL_MULTI_ORG` | `true` (`vivo`). |
| `AUTH_SERVER_FIRST_PARTY_ENABLED`, `AUTH_SERVER_INVITATION_EMAIL_OTP_ENABLED`, `EXTERNAL_IDENTITY_CANARY_ENABLED` | `false` (`vivo`). El HMAC del OTP y el token de autoridad de Rooms **no se montan** mientras el flag esté OFF (`deploy.sh:302-306`). |
| Migraciones 1834 y 2067, RP `efeonce-rp-rooms-production`, secretos v1, `email_type_config.auth_server_rooms_invitation_otp=false` | Aplicados (`doc`). |
| `ops-worker` | `ops-worker-00787-7fd` sigue con `GROWTH_EVENT_EMAILS_ENABLED=true` (`vivo`). `deploy.sh` ya trae `:-false`, pero el OFF real espera un deploy del worker. |
| PR #262 (develop→main) | **Draft**, `UNSTABLE`. Su CI seguía corriendo al corte. |
| Solo código | Integración OTP de punta a punta, canary, envío de correo, scheduler de rotación de llaves y steady de 7 días. |

### 2.3 Estado por task

| Task | Carpeta / Lifecycle | Estado real | Lo que falta |
|---|---|---|---|
| TASK-1834 first-party | in-progress | Código desplegado OFF | Paridad ON/OFF del login Greenhouse/MCP y gate TASK-1833. |
| TASK-1833 seguridad | in-progress | Evaluación propia hecha | Cobertura ofensiva bloqueada; sin pentest completo. |
| TASK-2064 Login V4 | in-progress | **Servido en `/login` desde 00166**; su `Status real` todavía dice «no desplegado» | Login real hacia Rooms, fuente de novedades y sincronización documental. |
| TASK-2067 OTP | in-progress | Código y migración en cloud, flag OFF | Parity S2S, mailer/KMS/S2S integrados, consumo atómico en Rooms, canary y closing protocol. |
| TASK-2063 convergencia Greenhouse | to-do | Sin implementación (coherente) | Todo. |

### 2.4 Secuencia pendiente, en orden (la que Codex iba a ejecutar)

1. CI, build y smoke verdes sobre `1859e90a6`. Los commits `754a2a2` y `c6f145a` nunca se juzgaron porque la ráfaga los canceló.
2. Preflight de promoción con **`target-branch=main`**. El de las 22:48 corrió contra `develop` y devolvió «batch unknown»: no vale como aprobación.
3. PR #262 listo para revisión y promoción gobernada a `main` (`greenhouse-production-release`), con readback de `ops-worker` mostrando `GROWTH_EVENT_EMAILS_ENABLED=false`.
4. Montar secret refs y encender los dos flags del issuer (variables GitHub a nivel de repo), deploy y readback de la revisión activa.
5. Habilitar `email_type_config`, aplicar cohorte y contratos.
6. **Un único canary:** un correo real a `jreyes@efeoncepro.com`, con prueba de replay, revocación y rollback. Ver §3.4.

### 2.5 Riesgos abiertos de Auth

- **Vía de deploy:** según el audit de Codex, el servicio único que sirve `auth.efeonce.org` se despliega en push a `develop`. Así llegó la 00166 sin pasar por `main`.
  - El comentario del workflow habla de «staging automatically»; hay que conciliar esa descripción con el host real.
  - Como los flags viven en variables GitHub a nivel de repo, **ponerlos en `true` y pushear a `develop` activaría los flujos en el host real sin promoción**. No encender flags hasta resolver esto o hacerlo deliberadamente.
- **Etiquetas de staging en ese servicio:** `SENTRY_ENVIRONMENT=staging` y `RESEND_API_KEY_SECRET_REF=greenhouse-resend-api-key-staging`. Ya estaban en la 00165, pero hay que confirmarlas antes del correo real.
- **Findings del preflight sin cerrar:**
  - El login SQL tiene `CREATEROLE`/`CREATEDB`.
  - La llave KMS v1 lleva más de 51 días en *retiring* contra un umbral de 7.
  - El login runtime puede modificar `signing_keys`.
- **Datos del operador:** los recibos con sus identificadores salieron del árbol en `1859e90a6`, pero **siguen en el historial** del repo público. No hubo reescritura de historial.

## 3. Efeonce Rooms

### 3.1 EPIC-052: avance por unidad

| Unidad | Estado |
|---|---|
| R01 contratos/baseline | Parcial (TS7 y ESLint 9 como excepción). |
| R02 composición visual | Implementada; falta la aceptación humana (TASK-2059). |
| R03 dominio | Parcial: 2060 y 2062 cerradas en local; faltan escenarios, tours y planes. |
| R04 identidad/acceso | Parcial: 2065 cerrada en local; 2066, 2067 y 2068 abiertas; canary pendiente. |
| R05 medios | Sólo WIP local sin commitear (TASK-2070, imágenes). |
| R06 shell/gestión | Parcial: sólo gestión de invitaciones (2068). |
| R07/R08 editor | Sólo WIP de TASK-2071 (R07A/R08A, una imagen por bloque). |
| R09–R12 | No iniciadas: presentación, consola del champion, notas, preguntas y evaluación. |
| R13 paridad | Parcial: CLI HTTP (`scripts/rooms.ts`), sin MCP. |
| R14/R15 | No iniciadas: MCP, X-ray, puente HubSpot, DNS `rooms.efeonce.org`, métricas, restore cloud y manuales. |

Los 21 criterios de salida del epic siguen sin tildar.

### 3.2 Runtime cloud

- **Vercel:**
  - Proyecto `efeonce-rooms` (team `efeonce-7670142f`), deploy de Production del SHA `20f9fe9` en Ready (`vivo`).
  - **Cada push a `main` construye producción.** El repo no tiene `.github/workflows`; el único gate es el local (`pnpm verify`).
  - Codex hizo 18 commits directos a `main` en ~1h40.
  - Región `gru1`; el ADR propone `iad1`, pendiente de medir.
- **Env:** 18 `ROOMS_*` sólo en Production, entre ellas `ROOMS_FIRST_PARTY_AUTH_ENABLED` y `ROOMS_INVITATIONS_ENABLED`. Según los docs están OFF; sus valores no se releyeron en esta sesión.
- **DB:**
  - `rooms_production` vive en la instancia compartida `greenhouse-pg-dev`, con 19 tablas y 5 migraciones aplicadas. La sexta (medios) no está aplicada.
  - **Riesgo de aislamiento documentado y no corregido** (`docs/audits/rooms/2026-10-25-cloud-isolation.md:22-27`): `rooms_runtime` hereda de PUBLIC `CONNECT` sobre `greenhouse_app` y `TEMP` sobre `greenhouse_app`, `postgres` y `cloudsqladmin`. Los privilegios sobre los schemas medidos son 0.
- **Identidad cloud:**
  - Pool WIF `rooms-vercel/production` ACTIVE.
  - SA `rooms-runtime-production` sin claves.
  - 6 secretos `rooms-production-*` + `auth-server-rooms-invitation-otp-hmac`.
- **WAF:** `waf_JssfW9nWmJeU` v2 con 4 reglas.

### 3.3 Estado por task

| Task | Carpeta | Estado real / falta |
|---|---|---|
| 2058 base y permisos | complete | Coherente. |
| 2059 primera experiencia | in-progress | Sólo falta la aceptación visual humana. |
| 2060, 2062, 2065 | complete | Cierres **locales**; tocan la DB cloud sólo vía 2069. |
| 2061 release Vercel | complete | Contradicción interna: el criterio `:181` está sin tildar y `:292` lo da por cumplido. |
| 2066 invitaciones tokenizadas | in-progress | 10 criterios abiertos: correo real único, respuestas indistinguibles inválida/expirada/revocada y canary. |
| 2068 invitación y lectura guest | in-progress | Media protegida (R05), BFCache, GVC, aceptación humana y manual. |
| 2069 runtime cloud | in-progress | 2/12 criterios tildados, aunque el ADR ya está Accepted y el WAF activo (criterios `:199` y `:205` desactualizados). |
| 2070 medios privados | in-progress | WIP sin commitear, ver §3.5. |
| 2071 autoría y visor de imágenes | in-progress | WIP sin commitear, ver §3.5. |

### 3.4 Canary conjunto Rooms + Auth: dependencias

1. Auth promovido a `main` y con flags ON (§2.4).
2. Flags `ROOMS_*` ON en Vercel Production, con readback.
3. Bootstrap de una sala sintética: `efeonce-rooms/scripts/bootstrap-production-pilot.ts` (dry-run por defecto; `--apply` crea la sala). No hay evidencia de que se haya aplicado.
4. Un único correo autorizado a `jreyes@efeoncepro.com`, con ensayo de replay, revocación y rollback.

**No se ha enviado ningún correo.** La autorización del operador cubre ese único correo y nada más: ni clientes ni ampliación.

### 3.5 WIP de medios (TASK-2070/2071) en `efeonce-rooms`, sin commitear

- **Implementado en local:**
  - Contenido V3 opt-in con procedencia explícita.
  - Tablas `assets`, `asset_versions`, `upload_sessions`, `media_jobs`, `media_renditions` y `edition_assets`, con triggers de inmutabilidad.
  - Upload → worker (proceso hijo con `sharp`) → publicación → GET/HEAD/Range `private, no-store`.
  - Rechazo de MIME falso, checksum, tamaño excesivo, archivo truncado o animado.
  - Lease/fencing, auditoría y outbox.
  - UI de autoría e inspector con zoom y teclado.
- **Último mensaje de Codex en la sesión Rooms** (19:48, antes de quedarse sin uso):
  - Pasaron las 8 pruebas del transporte de medios: acceso antes de leer, descarga por fragmentos, recuperación de caché con permisos vigentes y rechazo de rutas o archivos inválidos.
  - Los archivos tocados fueron `src/server/media/http.ts`, `http-runtime.ts` y `tests/auth-config-crypto.test.ts`.
  - Lo siguiente era el procesamiento de imágenes y la prueba completa cargar → publicar → abrir como invitado. **Esa prueba de punta a punta no se llegó a correr.**
- **Checks de esta sesión:**
  - `pnpm typecheck` **FALLA**: `src/app/rooms/[roomId]/edit/page.tsx` TS2322, `schemaVersion` 2 no asignable a 1.
  - `pnpm lint`: PASS.
  - `pnpm test`: 178/178 PASS, pero **el glob no incluye `tests/media-*.test.ts`**.
  - Tests de medios sin DB: 18/18 PASS.
  - No corridos: los 9 de persistencia de medios y `pnpm build`.
- **Migración `1792968329622_rooms-private-image-media.sql`:**
  - Tiene los markers Up/Down.
  - No tiene bloque DO de verificación.
  - Aplicada sólo en la PG local del repo.
- **Falta para cerrar 2070:**
  - Corregir el typecheck y sumar los tests de medios.
  - `pnpm build`.
  - Ensayo down/up y restore de DB + storage.
  - Limpieza de uploads vencidos y de cuarentena.
  - Adapter GCS con IAM y bucket (hoy falla cerrado en cloud, como corresponde).
  - Worker desplegable: hoy lanza el hijo con `tsx`, que es devDependency, y procesa un job por invocación.
  - Flag `ROOMS_MEDIA_ENABLED`, manual y QA independiente.
- **Falta para cerrar 2071:**
  - Escenario GVC con capturas a 1440, 1024, 390 y 320, más 200%, axe y reduced-motion.
  - Dossier y scorecard.
  - QA integrada upload → guest → revocación.
  - Validar el alcance extra (`/rooms/new` y la conversión V2→V3 desde UI).
  - Aceptación humana.
- **`sharp` pasa de dependencia opcional a directa.** El plan decía «no tocar package/lock hasta que la raíz lo libere»: confirmar.
- **Recomendación:** **no commitear en `main`**, porque `20f9fe9` es el candidato del canary y cada push a `main` construye producción. Llevar el WIP a una rama (p. ej. `task/2070-2071-private-media`): primero dominio, migración, servidor y tests; la UI en un commit separado, marcada como WIP sin GVC.

## 4. Deriva documental detectada

Corregida en este pase: el ledger de flags (filas Auth releídas en 00166 + flags Rooms), Handoff y un `## Delta 2026-10-25` en 2064, 2067, 2069, 2070 y 2071 que apunta aquí.

**Quedan para el dueño de cada task:**

- `Status real` de 2064, 2067 y 2069 y criterios ya cumplidos sin tildar (2069 `:199` y `:205`).
- Contradicción de 2061 (`:181` frente a `:292`).
- Lo que el EPIC-052 y el ADR cloud no reflejan todavía:
  - EPIC-052 `:262` cita la demo `bd4b802`.
  - El ADR cloud dice «DB pendiente» y enlaza `tasks/to-do/TASK-2069…`, que ya no existe ahí.
- El ADR de producto de Rooms sigue `Proposed` mientras el dossier lo presenta como aceptado.
- Filas viejas del README de tasks que todavía dicen «siguiente ID TASK-2070». El vigente es **TASK-2072**.
- Evidencias que apuntan a `/tmp/…`, que es efímero (`pg16-final-security-delta.md`, `cloud-isolation.md`, `tokenized-invitations.md`).
- TASK-2069 dice «178/178 PASS» en `:20`, pero `:240` aclara que no fue una única corrida en PG16.

## 5. Dónde seguir

- Skills vivas creadas con este pase: [`efeonce-rooms`](../../../.claude/skills/efeonce-rooms/SKILL.md) y
  [`efeonce-auth`](../../../.claude/skills/efeonce-auth/SKILL.md), espejadas en `.codex/`.
- Rollout Auth: [auditoría de rollout controlado](../identity/2026-10-25-auth-rooms-controlled-rollout.md).
- Rooms: [dossier](../../architecture/rooms/README.md) y [EPIC-052](../../epics/in-progress/EPIC-052-efeonce-rooms-sales-enablement-platform.md).

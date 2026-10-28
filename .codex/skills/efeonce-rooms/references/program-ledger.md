# Efeonce Rooms — ledger del programa

> Estado vivo. La entrada más reciente va arriba. Cada hecho dice su fuente: `vivo` (readback),
> `doc` (lo afirma un documento) o `local` (check en el workspace).

## 2026-10-28 — B18 local: invitación guest no crea sesión interna ni SSO

- `local`: runtime `codex/rooms-design-integration@3b1b7b2`; arnés UI de invitaciones ampliado con
  control antes/después del OTP: cookie guest HttpOnly, sin cookies issuer/interna, sesión interna401;
  authorize `prompt=none` devuelve `login_required`, sin código ni Set-Cookie.51checksPASS,lint/typesPASS.
- Issuer real + PG efímero de Auth `31ffef1d1`; buzón RAM, cero correo real. Modo `--guest-sso-only`
  acotado; cuatro capturas privadas con axe/layout limpios, sin aceptación de nueva UI ni suite general repetida.
- Next3210/issuer19336/PG55432 detenidos; sin push/main/flags/cloud ni nuevo canary. Ningún cambio
  necesario en contrato Auth. Claude Design aún debe entregar su interfaz para conectar/aceptar.
  [Resultado](../../../../docs/audits/rooms/2026-10-28-b18-guest-without-internal-sso.md).

## 2026-10-26 — Entorno local y conectores preparados para Claude Design

- `local`: rama `codex/rooms-design-integration`, commit `2cddc98a`, sin push/deploy. Next3216,
  PG propio55433 y issuer fixture19338;8migraciones, dos organizaciones, admin/operator y guest RoomA.
  Medios/caché/credenciales propios; child-env allowlist, guardhosted/cloud y estados privados0600.
- `local`: `src/client` tipado, readers/commands con CAS/idempotencia, errores/abort/timeout y PUT seguro.
  Bundle browser sin runtime server/fixtures.250testsPASS0skip,lint/types/build; Playwright53PASS/3skip.
 18checksAPIbrowserPASS: upload→worker→attach→publish→guestimagen, denegaciones, conflicto y replay.
- `local`: up idempotente/stop con puertos libres+PG detenido/up inmediato conservan datos. Entorno running.
  Login fixture sigue PKCE/nonce/iss/claims del consumer real; guest es fixture offline, sin OTP/correo.
- La nueva UI aún no está conectada ni aceptada; no nuevo canary GCS/ID, no restorecloud8. AuthPR263/264
  siguen abiertas y retenidas; producción/main e4b2e890 y flags remotos no cambiados.
  [Manual](../../../../docs/manual-de-uso/rooms/integrar-claude-design-local.md),
  [prueba](../../../../docs/audits/rooms/2026-10-26-local-design-integration.json).

## 2026-10-26 — Contrato para integrar Claude Design y documentación sincronizados

- `doc`: dossier, ADRs, manuales y contrato frontend distinguen corte ejecutado de roadmap V1 e historia.
  [Estado vigente](../../../../docs/architecture/rooms/README.md) y [readback conjunto](../../../../docs/audits/rooms/2026-10-26-docs-skills-state-readback.json).
- Backend disponible: lifecycle/ediciones V1/V2/V3, `can`, API/CLI, invitación tokenizada, imágenes privadas
  GCS y worker automático. Eso no cierra todo EPIC-052 ni sustituye aceptación visual.
- Pendiente para la nueva UI: entorno aislado con datos/permisos, conectores de pantallas al API same-origin,
  recorrido cargar→procesar→adjuntar→publicar→leer y negativas de acceso/conflicto/revocación.
  [Contrato y owners](../../../../docs/documentation/rooms/backend-api-for-claude-design.md).
- Claude Design conserva interfaz; Codex backend. Auth PR263/264 permanecen abiertas sin merge/deploy
  por decisión humana. Acceso general/flags humanos y ampliación de cohorte requieren otra decisión.
- Canary real único ya recibido/verificado/cerrado; no enviar otro correo. El entorno nuevo aún no está
  aprovisionado y el perfil WIF Production no se amplía a Preview. Sin nueva activación ni prueba de aplicación.

## 2026-10-26 — Disparo automático de medios verificado; interfaz Claude Design

- `vivo`: Rooms main `e4b2e890` (PR3), despliegue promovido `dpl_7JmMF7ZPBzR56wff83UyL4yFsXoS`.
- `vivo`: Scheduler `rooms-media-dispatch` cada minuto, SA OIDC dedicada y audience fijo. Cola vacía200
  sin ejecutar Job; demanda sintética en sala archivada202 → `rooms-media-worker-4r9nz` SUCCESS.
  Guard de archivo rechaza antes de storage; cero objetos/derivados, cola vacía y ack liberado.
- `vivo`: ocho migraciones/26 tablas, salas y publicaciones conservadas. Lease singleton10min y nonce
  cercado. Worker timeout240s/retries0, imagen `sha256:d49995de3ee7e5fa71ec7fabe0e8bb04d8ac3b4bbd2ef125a8331311d1d121f2`.
- `vivo`: flag de máquina ON; first-party/invitaciones/medios web OFF. Cero correos nuevos, no repetir canary.
- `local`: verify234/234,9focales,lint/types/build y CI Linux PASS. Playwright53PASS/3skip (no aceptación visual). Bootstrap `b2f90fa` local preservado.
- Auth: corrección queda en PR263/264 por decisión expresa del operador; sin merge ni despliegue.
- Diseño y consumidor bajo Claude Design; activación general no acreditada.
  [Evidencia](../../../../docs/audits/rooms/2026-10-26-automatic-media-dispatch.json) y [manual](../../../../docs/manual-de-uso/rooms/operar-worker-medios.md).

## 2026-10-26 — Canary real de Auth y una imagen completado; flags OFF

Alcance humano: una sala sintética, una imagen y un correo autorizado.
[Prueba y límites](../../../../docs/audits/rooms/2026-10-26-auth-rooms-real-image-canary.md).

- Microsoft/MFA personal y seis canjes first-party reales durante renovaciones. La sala fue accesible;
  el listado global quedó denegado. Edición y reapertura sólo en la sala, sin extender su expiración.
- PNG físico de 3.010.606 bytes por PUT GCS y verificación SHA. Job `rooms-media-worker-nzxrg` produjo
  dos WebP. Preview de 304.540 bytes, 1122×1402; SHA de SQL, bytes y ETag coincidentes. GET/HEAD200,
  Range206, condicional304 y no-store. Edición V2 original conservada.
- Un correo recibido en Outlook: código correcto200, incorrecto400, replay404; invitado sala/imagen200,
  borrador/otro espacio404. Revocación401 para sala/imagen y404 para enlace. Un challenge y un consumo.
- Invitación revocada y sala archivada; sesiones y pestañas de prueba cerradas. El archivo pertenece
  a la demo sintética, sin contenido de clientes. No existe scheduler ni worker continuo.
- Final: Rooms main `a87852e`, deployment `dpl_GACNzAvGSQVcjcMCCvjWj9BooizV`, flags de acceso e
  invitaciones false y media ausente/OFF. Auth `00168-vzb`, 100%, first-party/OTP OFF y correo OFF.
- Auth conserva la corrección a Resend producción v1 y Sentry production, sin nueva imagen ni full
  release. El default staging del workflow requiere una corrección separada.
- Bootstrap `b2f90fa` en rama local `codex/rooms-real-image-canary`, sin push ni cambio de main.
  Lint/typecheck PASS; no se repitió la full suite. Consumidor Claude Design y disparo del Job pendientes.

## 2026-10-26 — Infraestructura de medios aplicada; bloque acotado terminado

Usuario autoriza infraestructura/migraciones/worker con subagentes, excluyendo Efeonce ID, correo y UI.
Runtime permanece main a87852e; no hubo nuevo push ni redeploy Vercel.

- Bucket `efeonce-rooms-production-media`, Standard US-EAST4: acceso uniforme, prevención pública,
  soft-delete7d y CORS exclusivo del origin de Rooms. Anónimo403 y preflight origen ajeno denegado.
  Roles de objetos mínimos por prefijo; app signBlob sólo sobre sí misma. Worker SA sin claves y
  secretAccessor sólo sobre su secreto. [Storage/IAM](../../../../docs/audits/rooms/2026-10-26-media-storage-infra.json).
- Cloud SQL Rooms pasa de5 a7 migraciones y de19 a25 tablas, sin salas ni ediciones preexistentes.
  Rol `rooms_media_worker` sin privilegios altos/membresías, límite2 conexiones, UPDATE sólo columnas
  necesarias; conexión y6 negativasACL PASS. Backup automático SUCCESS y PITR habilitado.
  [DB](../../../../docs/audits/rooms/2026-10-26-media-database-infra.json).
- Job `rooms-media-worker` us-east4, imagen digest c588d012…913133: CPU1/RAM1Gi, timeout240s,
  reintentos0, una tarea/paralelismo1. Una ejecución `rooms-media-worker-sqbt9` completó con
  `{processed:false}`: identidad/secreto/SQL comprobados con cola vacía, cero imágenes reales procesadas.
  Sin scheduler ni loop. [Worker](../../../../docs/audits/rooms/2026-10-26-media-worker-deployment.json).
- Tres variables GCS preparadas en el proyecto Vercel Production para el próximo deploy; no se
  reconstruyó la aplicación. First-party=false, invitations=false, media ausente/defaultOFF.
  El flag media=true existe únicamente dentro del Job privado.
  [Configuración](../../../../docs/audits/rooms/2026-10-26-media-vercel-configuration.json).
- Verificación nueva: lint del script operacional y typecheck global PASS; no repetir suite225 ya
  pasada ni rediseñar interfaz. Un build y una ejecución del Job, sin consumo continuo de cómputo.
- Próximo bloque separado: canary conjunto Auth/Rooms con el único correo autorizado, transferencia
  física GCS y procesamiento de imagen; conectar consumidor frontend y definir disparo del Job antes
  de activar medios. No declarar integración completa por infraestructura ni por la cola vacía.

## 2026-10-26 — Backend integrado en main por autorización humana

Pedido: «Sería al main de rooms cierto?» → «Ok, hazlo». [PR2](https://github.com/efeoncepro/efeonce-rooms/pull/2)
fusionado a main en `a87852e345c331d6f4b3ca8e3137bf1fb2120e35`. Release preparado desde main con los
commits backend de2070/2072; se excluyeron los doce paths visuales del scaffold2071. Se conserva sólo su
contrato TypeScript de DTO. No hay diff de JSX, estilos ni copy visible frente a20f9fe9.

- Verificación del candidato95609d5:225/225 tests,lint/types/build PASS; navegador53PASS y3 omisiones
  intencionales de API repetida entre viewports; CI DockerLinux/decoder y preview Vercel SUCCESS.
- Main ahora ejecuta también el gate CI del worker. Runtime checkout main limpio tras ff.
- Readback Vercel Production previo: first-party=false, invitations=false, media ausente/defaultOFF;
  perfil cloud-production configurado, storage/bucket de medios sin configurar. No se cambiaron variables.
- Despliegue y smoke posteriores: ver [recibo de release](../../../../docs/audits/rooms/2026-10-26-production-backend-release.json).
- Siguen pendientes recursos/IAM/CORS, migraciones cloud6/7, worker desplegado y canary Auth/medios.
  La interfaz publicada conserva placeholder de medios: Claude Design debe conectar uploads.getTransfer
  y lectura privada antes de activar medios. No se envió correo ni se desplegó Auth/Greenhouse.

## 2026-10-26 — Codex backend; Claude Design interfaz

Instrucción humana: «El diseño lo haré con Claude Design, prefiero que tu tomes backend». La pausa de
aceptación visual2059 se conserva; Codex no modifica JSX/layout/motion. Backend sobre rama
`task/2072-cloud-media-backend`, base7ca5fd3. Main publicado20f9fe9 permanece sin cambios por esta entrega.

- TASK-2072: GCS privado por port, PUTV4efímero<=5min fuera de receipts, complete verifica bytes/generación
  fueraSQL y revalida autoridad/CAS; lecturaSHA antesGET/HEAD/Range/304, sin originaldownload.
- Worker compilado con submanifest/lock mínimo y prodsmoke aislado sin tsx/Next/React/AXIS; perfil
  CloudRunJob+Compute metadata de SA/rol/secret separados, sin simular Vercel ni ADC de operador.
- Runtime225/225testsPASS0skip, lint/types/build. RecoveryPG16fresh7migraciones yPG18aisladoPASS:
  2tenants/6rooms,25tablas,18objetos/12bindings,ACL/hashes/generación/down-up/corrupción/revocación.
- CLI soporta sesión existente en archivo0600 con Cookie+Origin, valida destino directo y no copia
  credenciales aGCS. Su login/obtención de sesión y OIDC productivo conservan canary propio.
- [Contrato para Claude Design](../../../../docs/documentation/rooms/backend-api-for-claude-design.md).
- Publicado backend en commitd056708 y [PR1](https://github.com/efeoncepro/efeonce-rooms/pull/1), draft contra rama rescatada; CI Linux Docker/decoder SUCCESS y preview Vercel SUCCESS. Main conserva20f9fe9.
- Pendientes reales: bucket/IAM/CORS, rol/SA/secret/worker cloud, migracióncloud y canary.
  Código/fakesSDK y recursos preparados no acreditan esos resultados. Ningún flag/correo activado. CLI+ADC renovados y verificados; bucket/SA/secret worker not_found, lectura Job no concluyente.

## Corte 2026-10-25 ~22:55 UTC — Codex se queda sin uso

Fuente consolidada: [auditoría de estado](../../../../docs/audits/rooms/2026-10-25-rooms-auth-status-after-codex-stop.md).

### Runtime publicado

- **`efeonce-rooms@20f9fe9`**: Vercel Production `dpl_7o71umG3uuNgz8RguhPPGksA69ad`, Ready (`vivo`). Región `gru1`.
- **18 env `ROOMS_*`** sólo en Production, OFF según los docs (`doc`; valores no releídos). Entre ellas:
  - `ROOMS_FIRST_PARTY_AUTH_ENABLED`
  - `ROOMS_INVITATIONS_ENABLED`
- **DB `rooms_production`** en `greenhouse-pg-dev`: 19 tablas y 5 migraciones aplicadas. WIF `rooms-vercel/production` ACTIVE, SA sin claves, 6 secretos `rooms-production-*` y WAF `waf_JssfW9nWmJeU` v2 con 4 reglas.
- **Demo sintética:** `https://efeonce-rooms.vercel.app/demo` (vistas Cliente, Operador y Administrador).

### Avance del epic

- **Done local:** R02 (falta aceptación humana).
- **Parciales:** R01, R03, R04, R06 y R13 (CLI sin MCP).
- **Sólo WIP:** R05, R07 y R08.
- **No iniciadas:** R09–R12, R14 y R15.
- Los 21 criterios de salida siguen sin tildar.

### Tasks

| Task | Estado |
|---|---|
| 2058, 2060, 2062, 2065 | complete (cierres locales). |
| 2061 | complete, con contradicción interna entre `:181` y `:292`. |
| 2059 | **No aceptada** (2026-10-25): Julio busca «algo más inmersivo» y pidió frenar. Revisar la dirección de experiencia con maqueta antes de construir más. |
| 2066 | Invitaciones: correo real único, respuestas indistinguibles y canary. |
| 2068 | Media protegida, BFCache, GVC, aceptación humana y manual. |
| 2069 | Cloud: 2/12 criterios tildados y canary pendiente. |
| 2070 / 2071 | WIP rescatado en rama local `task/2070-2071-private-media` (abajo). |

### WIP de medios — rescatado en rama

- **Rescate 2026-10-25 (Claude):** el WIP quedó commiteado en la rama local `task/2070-2071-private-media` de `efeonce-rooms` (`c0facfd` backend, `2626921` UI; sin push). Se corrigió el TS2322 y los tests de medios entraron a `pnpm test`: `pnpm verify` PASS con 205/205 tests (incluye 9 de persistencia en la PG local) y build OK. `main` sigue en `20f9fe9` (candidato del canary).
- **Avance 2026-10-25 (Claude, rama `task/2070-2071-private-media`, commit `7ca5fd3`):** limpieza `sweepMedia` (expira subidas vencidas con auditoría/outbox, borra temporales y objetos sin referencia tras un margen, nunca renditions ni fuentes vivas), worker `--sweep`/`--loop` con parada limpia, el hijo decodificador hereda el loader del worker (ya no fuerza `tsx`) y la migración trae un bloque DO de verificación (probado en la PG local). `pnpm verify` PASS con 207/207 y build OK. Faltan: adapter GCS, empaquetado desplegable del worker, ensayo de restore y GVC.
- Para cerrar siguen faltando: adapter GCS, empaquetado desplegable del worker, ensayo down/up/restore, GVC y aceptación humana. También confirmar `sharp` como dependencia directa. Flag `ROOMS_MEDIA_ENABLED` (ya existe en `src/server/media/config.ts`, default OFF) registrado en el ledger de flags.

### Estado previo al rescate (sin commitear, ~1.950 líneas)

- **Implementado en local:**
  - V3 opt-in.
  - Tablas `assets`, `asset_versions`, `upload_sessions`, `media_jobs`, `media_renditions` y `edition_assets`.
  - Worker con `sharp` en proceso hijo.
  - Transporte GET/HEAD/Range privado (8 pruebas PASS según Codex).
  - UI de autoría e inspector.
- **Checks `local`:**
  - `pnpm typecheck` **FALLA** con TS2322 en `src/app/rooms/[roomId]/edit/page.tsx` (`schemaVersion` 2 no asignable a 1).
  - Lint PASS.
  - `pnpm test` 178/178, pero no incluye `tests/media-*`.
  - Medios sin DB: 18/18.
- **Lo que Codex iba a hacer:** procesamiento de imágenes y prueba cargar → publicar → abrir como invitado.
- **Para cerrar:**
  - Typecheck, sumar los tests de medios al script y `pnpm build`.
  - Bloque DO en la migración.
  - Ensayo down/up y restore.
  - Limpieza de cuarentena.
  - Adapter GCS.
  - Worker desplegable sin `tsx`.
  - Flag `ROOMS_MEDIA_ENABLED`.
  - GVC 1440/1024/390/320 y aceptación humana.
- **Pendiente de confirmar:** `sharp` pasa a dependencia directa, y el plan pedía liberación previa.

### Secuencia pendiente

1. Llevar el WIP a una rama, corregirlo y verificarlo.
2. Promover Auth (skill `efeonce-auth`).
3. `ROOMS_*` ON con readback.
4. Bootstrap de la sala sintética.
5. Un único canary con correo a `jreyes@efeoncepro.com`.
6. R05 cloud (GCS + worker).
7. R07–R12.
8. R14/R15, incluido el DNS `rooms.efeonce.org`.

### Riesgos abiertos

- Commits directos a `main`: 18 en ~1h40 sin PR ni CI, y cada push es producción.
- `rooms_runtime` con `CONNECT`/`TEMP` heredado sobre otras bases de la instancia compartida.
- El ADR de producto sigue `Proposed`.
- Evidencias en `/tmp` (efímeras).
- Flags `ROOMS_*` fuera del gate de flags de Greenhouse.

### Lecciones

- «Tests verdes» puede no cubrir lo nuevo: el glob de `pnpm test` dejaba fuera `tests/media-*`. Al sumar un archivo de test, confirmar que el script lo recoge.
- Un cierre «local» (DB local) no acredita el runtime cloud: decir siempre contra qué base se probó.

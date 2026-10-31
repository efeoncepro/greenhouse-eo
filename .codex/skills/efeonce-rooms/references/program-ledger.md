# Efeonce Rooms — ledger del programa

> Estado vivo. La entrada más reciente va arriba. Cada hecho dice su fuente: `vivo` (readback),
> `doc` (lo afirma un documento) o `local` (check en el workspace).
> Las entradas fechadas previas son snapshots: sus pendientes quedan superados por la entrada vigente,
> sin reescribir la evidencia histórica ni repetir el canary cerrado.

## 2026-10-31 — Migraciones 9–18 aplicadas en `rooms_production` (sin merge)

- Autorización del operador: «Sí, aplica». Recibo
  [`2026-10-31-production-migrations-applied.md`](../../../../docs/audits/rooms/2026-10-31-production-migrations-applied.md).
- `vivo`:
  - antes de aplicar: ensayo repetido (PASS), respaldo automático de hoy y PITR de 7 días;
  - corrida en seco con 10 pendientes exactas;
  - respaldo lógico propio y privado en `.local/production-backups/` (rollback real; PITR de la instancia compartida no sirve);
  - aplicado con `pnpm db:migrate-production --apply` (`efeonce-rooms` `bbca0f8`).
- `vivo`, verificación: 18 migraciones y 47 tablas; hash de ediciones y filas de las 26 tablas previas intactos;
  `rooms_runtime` lee las tablas nuevas con su credencial de producción.
- Sin cambios: deployment `main@e4b2e890` y flags `ROOMS_*` en OFF.
- Siguiente: merge de PR #4 (= deploy), con su autorización, y verificar el commit activo y el dominio. Después, borrar
  el respaldo lógico (tiene datos de producción).

## 2026-10-31 — Interfaz aceptada por el operador; `UI ready: yes` en TASK-2059/2068/2071

- Aceptación humana: «Todas están aprobadas» (operador, 2026-10-31), sobre las pantallas en local de la rama
  `claude/rooms-approved-ui` (`de1de34`).
- `UI ready: yes` en 2059, 2068 y 2071; `task:lint` con controles de readiness sin hallazgos. Se tildaron solo los
  criterios que la evidencia respalda. Quedan sin tildar, con su motivo:
  - el orden «docs antes del JSX»;
  - GVC en 1024 px y con zoom al 200 %.
- No es una autorización de producción. Para el merge de PR #4 faltan:
  1. autorización expresa para aplicar las 10 migraciones (repetir `pnpm db:rehearse-production`, confirmar respaldo, aplicar y verificar);
  2. autorización del merge (= deploy) con los flags en OFF y verificación del commit activo.

## 2026-10-31 — Riesgos de UI verificados y corregidos (`de1de34`, en PR #4)

- Corregidos:
  - en el teléfono, `#capitulo-N` ahora lleva al capítulo (antes la pila no lo leía);
  - la deriva de «Respuestas» y la órbita del equipo descansan a los ~5 s y vuelven a moverse con cada interacción;
    el tráfico y la barra del story terminan antes de 5 s (WCAG 2.2.2);
  - el error de subida tiene su propio mensaje;
  - «Qué cambió» se enlaza desde la sala (barra en escritorio, mapa en el teléfono) y desde el aviso de publicación;
  - la primera edición muestra su propio estado (verificado en la respuesta del servidor en la integración);
  - los textos de estados de invitación y del enlace para saltar al contenido salen del copy.
- Descartado: «el enlace al 01 corta la cámara» (la cámara escucha `hashchange`).
- `local`: `pnpm verify` 377/377; GVC sin hallazgos en sala, sala móvil, las cuatro escenas, autoría, autoría de
  escenas, «Qué cambió» e invitación.
- Lecciones:
  - con el panel del navegador oculto, React 19 no revela los bloques de streaming porque espera
    `requestAnimationFrame`; la página parece trabada en «Cargando…», aunque el HTML del servidor está completo;
  - `pnpm integration:up` necesita `LC_ALL=en_US.UTF-8`; sin eso, el PostgreSQL local no arranca.

## 2026-10-31 — Ensayo de migraciones en clon de producción PASS + docs de UI rehechos desde el canvas

- **Ensayo de migraciones (gate 2 del ADR cloud).** Autorizado por el operador. Recibo
  [`2026-10-31-production-migration-rehearsal.md`](../../../../docs/audits/rooms/2026-10-31-production-migration-rehearsal.md).
  - `rooms_production` solo se leyó (`pg_dump` por proxy; conteos idénticos antes y después).
  - Clon PostgreSQL 16 desechable, con los permisos de producción. Migraciones 8 → 18 y tablas 26 → 47, con contenido
    y hash de ediciones intactos y el rol runtime OK.
  - Rollback en el clon con reaplicación OK. Suite 377/377 contra el clon.
  - Script `efeonce-rooms` `17438b6`: `pnpm db:rehearse-production`. El clon y los respaldos se borran solos.
  - Observación: el rollback deja dos CHECK equivalentes con otro nombre (`grants`, `invitations`). El rollback de
    producción sigue siendo restaurar desde respaldo, nunca `down`.
- **Docs de UI.** Wireframe, flow y motion de TASK-2059, 2068 y 2071 reescritos desde el canvas aprobado y el código
  (cada wireframe trae su tabla «Diferencias con el canvas»); `task:lint` sin hallazgos; `UI ready` sigue en `no`.
- **Riesgos que el subagente reportó leyendo el código, sin verificar en navegador:**
  - en móvil, `#capitulo-N` no lleva al capítulo;
  - la deriva de «Respuestas», la ruta y las barras de story no tienen pausa además de movimiento reducido (WCAG 2.2.2);
  - `AUTHORING_COPY.uploadError` sin cablear;
  - no hay enlace a «Qué cambió» desde la sala ni desde el aviso de publicación;
  - textos fijos en estados de invitación.

  Su «el enlace al 01 corta la cámara» es dudoso: la cámara sí escucha `hashchange`.
- Siguiente para el merge:
  1. repetir el ensayo y aplicar las migraciones con autorización expresa;
  2. aceptación humana de la interfaz.

## 2026-10-31 — Rama de la UI aprobada subida; PR #4 en borrador (sin merge)

- Autorización del operador («Hazlo») para corregir los hallazgos, verificar y subir la rama con un PR, **sin merge**.
- Revisión previa con tres subagentes (estado de release, código, gobierno). Sin exposición de datos. Hallazgos corregidos
  en `efeonce-rooms` `717c478`:
  - pregunta repetida en el stream en vivo (cursor en milisegundos contra `created_at` en microsegundos);
  - el fundamento del autor no llegaba a la pestaña Fundamento;
  - «reabrir» ofrecido con un borrador abierto;
  - error 500 con un id de escena malformado.
- `local`: `pnpm verify` 377/377; consulta de preguntas ejercitada contra PG real (caso del borde en microsegundos).
- `vivo`: `origin/claude/rooms-approved-ui` (21 commits sobre `origin/main` `e4b2e890`, 0 detrás) y
  [PR #4](https://github.com/efeoncepro/efeonce-rooms/pull/4) **draft** hacia `main`. Vercel crea un Preview con SSO;
  Preview solo tiene `NPM_RC`, así que únicamente funcionan las páginas `/demo/*`. Producción no cambia.
- Gates para el merge (= producción):
  1. ensayar en un clon de `rooms_production` las 10 migraciones nuevas, con restore y rollback, y aplicarlas antes del deploy;
  2. aceptación humana de la interfaz;
  3. antes de `ROOMS_LIVE_ENABLED`: medir streams y pool, y registrar el flag en el ledger;
  4. primer cliente: liberar la retención de Auth (PR 263/264) y nueva autorización.

## 2026-10-31 — Autoría de escenas desde la mesa + ADR del contrato

- ADR [«Vive el servicio»: escenas como contenido de la sala](../../../../docs/architecture/rooms/EFEONCE_ROOMS_SERVICE_SCENES_DECISION_V1.md)
  **Accepted** el 2026-10-31 por el operador («Apruebo el ADR»); registrado en el dossier y en `DECISIONS_INDEX`.
  No autoriza push, deploy ni flags.
- `efeonce-rooms` `claude/rooms-approved-ui` `95d3ac2`: escenas en el inventario de la mesa, «Añadir escena» (4 tipos,
  valores editables, capítulo de escenas), escenario a 1440 × 900 desde el borrador sin guardar (mismo resolutor que
  la sala), editor por tipo y guardado completo con `content.upsertBlock`. Cobertura nueva `scene_placeholder`:
  una sala real no publica marcadores entre corchetes. Sin push, sin deploy, flags OFF.
- `local`: `pnpm verify` 376/376 + lint + typecheck + build; GVC PASS `rooms-authoring-scenes` y `rooms-authoring`
  (1440/1280/390, 0 hallazgos).
- Contra la integración (3216, admin fixture, sala sintética Lumbre): crear escena (revisión 44→45), editar y guardar
  (→46) y abrir `/authoring/vista-previa/vive/:blockId` con la rendition del borrador. Datos sintéticos, locales.
- Lección: el `next dev` de 3210 quedó con una página sin hidratar tras varias recargas completas de Fast Refresh
  (bloque Suspense deshidratado, sin errores). Reiniciar el servidor lo resolvió; no era el código.
- Falta: aceptación humana de la interfaz, ediciones de escenas en «Qué cambió» con detalle propio.

## 2026-10-31 — «Vive el servicio» implementado local (canvas fila 6)

- Corrección de propósito del operador: Rooms es una **demo inmersiva del servicio**, no una herramienta de
  presentación. Consola, audiencia y señales pasan detrás de las escenas de demostración.
- `efeonce-rooms` `claude/rooms-approved-ui` `5e4a73b`: bloques de escena `showcase` / `cycle` / `answers` / `team`
  en manifiestos V3/V4 (`src/domain/scene-contracts.ts`), creados con `content.upsertBlock` (API/CLI/MCP), con reglas
  de cobertura y lector que resuelve formatos a renditions privadas de la edición. Rutas a pantalla completa:
  `/rooms/:roomId/editions/:editionId/vive/:blockId`, `/rooms/:roomId/authoring/vista-previa/vive/:blockId?as=` y
  `/demo/vive/:blockId`. La sala muestra un capítulo de escenas como mosaico de entradas. Sin push, sin deploy, flags OFF.
- `local`: `pnpm verify` 375/375 sin skips + lint + typecheck + build; GVC PASS `rooms-service-showcase`,
  `rooms-service-cycle`, `rooms-service-answers`, `rooms-service-team` (1440/1280/390, 0 hallazgos).
- Las escenas no escriben en la API: son simulación del servicio. Plazos y rondas reales los declara el autor; la demo
  volta los deja entre corchetes.
- Falta: autoría de escenas desde la mesa (hoy solo por comando), ADR del contrato de escenas, recorrido contra la
  integración con una sala real, aceptación humana.

## 2026-10-31 — Autoría y ediciones del canvas implementadas local (TASK-2071)

- `efeonce-rooms` `claude/rooms-approved-ui`: mesa de autoría `/rooms/:roomId/authoring` (inventario, cobertura,
  escenario con «Ver como», propiedades, publicar), vista previa por rol y «Qué cambió» `/editions/:editionId/cambios`.
  Demos sintéticas `/demo/autoria` y `/demo/ediciones`. Sin push, sin deploy, flags OFF.
- `local`: GVC PASS `rooms-authoring` (1440/1280/390) y `rooms-edition-changes` (1440/390).
- Contra backend real (integración 3216, admin interno): renombrar persistió (revisión 36→37), se publicó la edición 6
  de la sala sintética Lumbre y «Qué cambió» mostró el cambio. Esa publicación quedó en la base de la integración
  (sintética, local).
- `58287fb`: «Añadir imagen» y reabrir borrador tras publicar, probados en la integración (subida, worker, pieza nueva).
- Falta: adaptaciones y medios V4 en la mesa, aceptación humana.

## 2026-10-30 — Invitación, sala y sala en vivo del canvas implementadas local

- `efeonce-rooms` `claude/rooms-approved-ui`: `3f11167` (sala en vivo, migración 18), `c133299` (invitación y sala
  contra el backend real, demos sintéticas `/demo/sala` y `/demo/invitacion`), `32640ee` (nombres por tipo,
  inventario de migraciones 14–18 en la integración). Sin push, sin deploy, flags `ROOMS_*` OFF.
- ADR sala en vivo `Accepted` por el operador. Flag nuevo `ROOMS_LIVE_ENABLED` (OFF; registrar al pedir activación).
- `local`: 371/371 tests sin skips; lint, tipos y build en verde. GVC PASS: `rooms-invitation-stage` (1440/1280/390/320),
  `rooms-orbit-room` (1440/1280), `rooms-orbit-room-mobile` (390/320), `rooms-live-room` (1440).
- Contra backend real (integración 3216): sala del fixture, `/invite` vacío/inválido/malformado y prueba de dos
  personas con el stream. No probado: invitación con correo real (la integración no entrega correo), Vercel
  streaming/pool, medios V4 en la sala nueva, aceptación humana.
- Pendientes de pantallas: autoría y ediciones (TASK-2071), consola/audiencia (Fase 3), señales y video (Fase 4).

## 2026-10-30 — Base visual La órbita (TASK-2079) implementada local

- `local`: `src/domain/orbit-geometry.ts` (+test), `src/components/orbit/**` (Orbit, CameraWorld, IrisReveal, DepthLayers/Grain,
  motion.ts), `src/styles/orbit.css`, laboratorio `/demo/base`. Valores desde `efeonceGraphicLine`/`axisMotion`.
- `local`: GVC `rooms-orbit-foundation` OK en 1440/390/320; dossier `docs/ui/reviews/TASK-2079-rooms-orbit-foundation/`.
  Trampa: la regla global `svg { max-inline-size: 100% }` colapsa SVG dentro de contenedores de ancho 0 (mundo de la cámara).
- Sin push; falta revisión humana.

## 2026-10-30 — Backend de la UI aprobada: comparar, «Ver como», reloj, señales, subtítulos; ADR sala en vivo

- `local`: migración17 (`presentation_sessions.started_at/ended_at`, `rooms.viewer_activity_daily`); `editions.compare`,
  `preview?as=`, `durationMs` por escena, `signals.read` (interno, agregado, alimentado por `progress.mark`) y
  `captions` WebVTT en medios V4. Presupuesto del esquema MCP de lectura a 18 KB (medido 15,2 KB).
- `local`: verify 357/357, 0 skip. Sin push/deploy/flags. Backend de TASK-2080 completo salvo cierre de contrato.
- `doc`: ADR `EFEONCE_ROOMS_LIVE_ROOM_REALTIME_DECISION_V1.md` **Proposed** (SSE same-origin + estado efímero en PG,
  sin proveedor); TASK-2081 espera su aprobación antes de código.

## 2026-10-30 — Backend de la UI aprobada: tarjeta, estados, perfiles, adaptaciones y autores

- `local`: `b7e08aa` migración15 (perfil de miembros, perfil sellado del invitado, historial inmutable de tokens
  reemplazados), tarjeta previa en start/transaction, estados 410 `invitation_revoked|expired|superseded` y
  `code_expired` (resend abre transacción nueva; límite de 10 min intacto), `profile.update/get`.
- `local`: `d3c6c24` adaptaciones por pieza + `rationale` en bloques V3/V4, helper único `blockAssetRefIds` en
  proyección/entrega/anclas/tours/cobertura; migración16 nombre visible del invitado en su sesión; `author` en preguntas.
- `local`: verify 352/352, 0 skip (PG18, `ROOMS_DATABASE_URL`, `ROOMS_RUNTIME_PROFILE=local`). Sin push/deploy/flags.
  Pendiente TASK-2080: comparar ediciones, vista por rol, reloj/avance de presentación, señales y subtítulos.

## 2026-10-30 — Backend de la UI aprobada: capítulos y recorrido

- Operador: «quiero todo lo que está en el canvas»; tarjeta previa completa y estados de invitación distintos
  aprobados. Alcance en TASK-2080 (todo salvo tiempo real) y TASK-2081 (sala en vivo, ADR primero).
- `local`: rama `claude/rooms-approved-ui` desde `de38af5`. `31c1a83` capítulos V3/V4 (cobertura, `content.arrange`,
  proyección `content.chapters`); `e37b152` migración14 `rooms.viewer_progress`, `progress.mark` y reader
  `.../progress` en API/SDK/CLI; MCP lee, `progress.mark` excluido. 44 tablas.
- `local`: suite 343/343, 0 skip, con PG18 del repo, `ROOMS_DATABASE_URL` y `ROOMS_RUNTIME_PROFILE=local` (sin ese
  perfil los 13 tests multimedia fallan por configuración, no por código); lint/types/build PASS. Sin push/deploy.

## 2026-10-30 — Canvas de UI aprobado; implementación planificada

- `doc`: el operador aprobó entero el canvas Claude Design «la sala es una órbita» (14 pantallas,
  artifact `https://claude.ai/code/artifact/6562987e-d882-44ba-a929-a6ab7863771d`). Registro y reglas de
  órbita/halo en [dirección visual](../../../../docs/ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md).
  Aprueba composición, no píxeles implementados; fixture ficticia volta reemplaza Nómada.
- `local` (lectura de `3c7bcb5`, sin ejecutar): faltan capítulos sobre bloques, recorrido por persona, tarjeta
  previa a la entrada (start/transaction solo dan state/expiresAt/retryAt/deliveryStatus/entryGate),
  estados vencida/revocada (todo es `invalid_invitation`), agrupación de adaptaciones (un asset por bloque),
  nombres de autor, diff de ediciones, señales agregadas, vista por rol y `startedAt` de presentación.
  El código de invitación es de 6 dígitos; el ejemplo alfanumérico del canvas se corrige en la UI.
- Nuevas tasks: [TASK-2079](../../../../docs/tasks/in-progress/TASK-2079-rooms-orbit-foundation.md) base visual
  (UI ready=yes, sin backend) y [TASK-2080](../../../../docs/tasks/in-progress/TASK-2080-rooms-approved-ui-backend-contract.md)
  contrato backend (dueño Codex; slices 3–4 esperan dos decisiones de privacidad del operador).
  TASK-2059/2068 vuelven a UI ready=no hasta rehacer wireframes desde el canvas; deltas en 2059/2068/2071.
- Sin código, push, deploy, flags, correo ni canary en este corte.

## 2026-10-29 — Backend local completado y verificado para integrar diseño

- `local`: runtime `codex/rooms-design-integration@3c7bcb5`, limpio, sin push/deploy.13migraciones/
  43tablas;337testsPASS0skip,lint/negativo/types/build y empaquetado aislado del worker de imágenes PASS.
- Colaboración/presentación, derechos guest explícitos en edición inicial, referencias de sesión sin
  identidad interna, importación X-ray/metadata y CRMpending, V4 mixto imagen+PDF/audio/video local y MCPstdio construidos.
  Puertos externos OFF; no confundir metadata preparada con entrega CRM o federación remota.
- V4 valida cobertura: ref no excluida sin bloque visible queda pending. Ambos endpoints y proyección
  niegan contenido excluido/huérfano; preguntas sólo temporizan audio/video dentro de duración medida.
- Chrome18checks de imágenes+23delbackend nuevo PASS. PDF1página desde SDK real, supervisor, publicación
  y bytes privados; notas/consola/tenant/replay/revocación. No aceptación de la nueva UI.
- Restore13PG16/18:43tablas,23objetos/14bindings/12guestreceipts,0guestinternalizado; ACL/hashes/
  snapshots/fencing/revocación. Empty13→8→13 y cinco guards poblados PASS. Dos motores usan fuentes idénticas/estables;
  recibos HEAD8702dirty se contrastaron por hash contra commit final3c7bcb5. No cloud/PITR/MFA/correo.
- Bootstrap13y`up --multimedia` verificados: conserva salas/borradores, reconcilia sólo3fixtures,
  storage propio y procesamiento secuencial. Entorno/PGs detenidos y temporales retirados al cerrar.
- Multimedia sigue sólo local; Linux/cloud sin certificar(Docker ausente). Auth retenido en PR,
  sin mutaciones de producción ni otro canary. Integración/aceptación Claude y rollout siguen separados.
  [Recibo completo](../../../../docs/audits/rooms/2026-10-29-backend-local-completion.md),
  [manual](../../../../docs/manual-de-uso/rooms/operar-backend-local.md).
- Procedencia: commit exacto `3c7bcb50392bea9d408adf602c6da00583b87798`;
  [resultado estructurado](../../../../docs/audits/rooms/2026-10-29-backend-local-completion.json),
  [recovery PG16](../../../../docs/audits/rooms/2026-10-29-backend-recovery-pg16.json) y
  [PG18](../../../../docs/audits/rooms/2026-10-29-backend-recovery-pg18.json).
  Las suites comparten colas y se ejecutan en serie contra su base dedicada; cada restore usa
  base/storage propios. Los 18+23 checks Chrome/API no certifican aceptación visual ni un nuevo login.
- Continuidad documental posterior: HEAD runtime `de38af5e73ac4e653923c3e892ebba5eafb3139b`
  sólo actualiza `AGENTS.md`; el código y la atribución de las pruebas siguen en `3c7bcb5`.
  Ese commit documental no es retest, publicación ni activación.

## 2026-10-29 UTC — UI y operación pendientes tras canary cerrado

> Snapshot anterior a la ampliación local de la entrada superior; sus pendientes no describen el candidato3c7bcb5.

- `local/vivo` (recibos fechados): [dossier coordinado](../../../../docs/audits/rooms/2026-10-29-auth-rooms-program-consolidation.md).
  El canary del 26-10 probó una sala, imagen física privada, correo único
  recibido, guest y revocación; terminó con acceso humano OFF. El Git local
  Rooms `main=origin/main=e4b2e89` incluye backend GCS, worker y dispatch
  condicionado; ese ref no prueba por sí solo el deployment activo.
- `local` (sesión Rooms): Claude Design aún no había entregado la UI nueva.
  B18 guest sin sesión interna/SSO dio 51 checks; dos adapters RP dieron
  35 checks reportados con issuer QA, sin servidor Auth completo ni HTTPS.
  Faltan integrar UI y probar crear → cargar/procesar → adjuntar → publicar →
  invitado con conflicto, revocación y aislamiento; también recovery de ocho
  migraciones y límites/carga. PDF/audio/video, presentación/notas, actividad,
  MCP y CRM permanecen en EPIC-052. Auth mantiene el release retenido.

## 2026-10-28 — Retest dos RP contra fuentes Auth ca97eecd1:35PASS

- `local`: Rooms `8750750` intacto y issuerQA con fuentes de `ca97eecd1`,35checksPASS/Chrome/PG
  efímero. Checkout Auth avanzó sólo dos docs a0ab888728; hashes/ausencia de diff fuente comprobados.
- Login legítimo, cookies/callbacks en ambos sentidos, preservación de transacción y logout aislado
  mantienen resultados. Se ejecuta el issuerQA, **no services/auth-server/server.ts completo**;
  RP2 es mismo consumer, sin HTTPS/MFA/productos completos ni rollout.
- Bases temporales retiradas, puertos libres; sincorreo/canary/push/flags/deploy ni cambio de fuentes.
  [Recibo y procedencia](../../../../docs/audits/rooms/2026-10-28-two-rp-auth-ca97eecd1.md).

## 2026-10-28 — Dos adapters RP con Auth real:35checksPASS

- `local`: Rooms `8750750`, Auth `e7b127647`; dos createAuthHttp/createAuthService en hosts distintos,
  dos registros reales del issuer, navegador y PG efímero. Cookies/callbacks rechazados en ambos
  sentidos, original no consumido/funcional y logout cruzado sin revocar dueño; SSO legítimo coexiste.
- 35checks,lint/typesPASS; clave cifrado compartida deliberadamente sóloQA. RP2 es arnés del mismo
  consumer, no segundo producto completo: sin HTTPS/MFA/entitlements/rollout; UI Claude aún pendiente.
- Bases temporales retiradas/puertos libres, commit local limpio; sincorreo/push/flags/deploy/canary.
  [Prueba y límites](../../../../docs/audits/rooms/2026-10-28-two-rp-auth-adapters.md).

## 2026-10-28 — Aislamiento RP en servicios/persistencia:3casosPASS

- `local`: Rooms `e0edf1e` intacto;3pruebas focales existentes,0fallos/0skip sobre PG18 efímero y
  issuer HTTP sintético: sesión/callback con otro clientId y guest crossRP/issuer/origin rechazados.
- Cluster retirado/puerto libre; no B10/B18 browser ni correo/canary/push/deploy repetidos.
  No acredita dos aplicaciones RP completas: ese criterio sigue abierto.
  [Recibo y comando](../../../../docs/audits/rooms/2026-10-28-cross-rp-persistence-focal.md).

## 2026-10-28 — B10 browser con reader de autoridad real

- `local`: Rooms `e0edf1e` intacto + Auth `8d027f747` con `--mcp-pg --mcp-authority`; dos bases
  efímeras,16checksMCP+8gruposRoomsPASS. Reader real externo sobre binding/membership sintéticos;
  SQL:1bindinggv7,1membership,1consentread,1código consumidov7 y1access/1refresh sólo read.
- Arnes sin nueva aserción JWTgv ni revocación browser de binding; consentimiento/contexto y datos
  son fixtures. Sin dispatch gateway, MFA humana, TLS ni rollout; no cierra B15/B20.
- Bases temporales retiradas/puertos libres; fuentes Rooms limpias, sincorreo/push/flags/deploy.
  [Evidencia y límites](../../../../docs/audits/rooms/2026-10-28-b10-rooms-mcp-authority.md).

## 2026-10-28 — B10 browser repetido con MCP PostgreSQL

- `local`: mismo Rooms `e0edf1e`, sin cambios de fuentes.16checksMCP+8gruposRoomsPASS contra issuer
  `--mcp-pg`: PostgresOAuthStore real y dos bases efímeras. SQL independiente:1consentread,1código
  consumido,1access+1refresh con scopes sólo read. Cookies sin renovar, consentimiento y step-up intactos.
- El rótulo estático «memoria» del arnés anterior no describe este modo: fuente/flags/SQL lo refutan.
  Grants bound sintéticos y proyección NULL-context; sin dispatch gateway/MFA ni migración1836 completa.
- Bases temporales retiradas, procesos detenidos; sincorreo/push/flags/deploy. [Recibo y límites](../../../../docs/audits/rooms/2026-10-28-b10-rooms-mcp-postgres.md).

## 2026-10-28 — B10 local: Rooms no concede consentimiento MCP

- `local`: Rooms `codex/rooms-design-integration@e0edf1e`, issuer Auth con fuentes idénticas a
  `1136ac273`. Un BrowserContext y cookies sin renovar: read exige aprobación explícita, write403
  por step-up antes/después; código real de un uso, token ES256 verificado con scope sólo read.
- 16comprobacionesMCP +8gruposRoomsPASS;lint/typesPASS. PG real de identidad/Rooms; store MCP y
  grantsPort sintéticos. No prueba dispatch gateway, persistencia MCP PG ni MFA; no cierra B15/B20.
- Procesos19334/19335/55432 detenidos; sincorreo/push/main/flags/deploy. Nueva UI pendiente de
  Claude Design; contrato productivo Auth sin cambios. [Prueba](../../../../docs/audits/rooms/2026-10-28-b10-rooms-mcp-explicit-consent.md).

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

- «Tests verdes» puede no cubrir lo nuevo: el glob de `pnpm test` dejaba fuera `tests/media-*` (y luego `tests/live-*`). Al sumar un archivo de test, confirmar que el script lo recoge: la cuenta de tests debe subir.
- La integración local valida un inventario exacto de migraciones (`REVIEWED_MIGRATIONS`): cada migración nueva se agrega ahí tras revisarla, o `integration:up` falla en preflight sin decir por qué.
- Un cierre «local» (DB local) no acredita el runtime cloud: decir siempre contra qué base se probó.

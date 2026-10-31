---
name: efeonce-rooms
description: Operate and extend Efeonce Rooms (EPIC-052) — the sales-enablement / buyer-experience product (`rooms.efeonce.org`, runtime repo `efeonce-rooms`, Next.js on Vercel, own PostgreSQL `rooms_production`). Use when touching the `efeonce-rooms` repo, Rooms docs in `docs/architecture/rooms/**`, EPIC-052 tasks (TASK-2058…2072 and TASK-2074…2078: foundation, first experience, persistence, Vercel release, versioned authoring, Efeonce ID consumer, tokenized invitations, guest reading, cloud runtime pilot, private image media, image authoring/viewer, automatic worker dispatch, Claude Design integration, durable collaboration/presentation, X-ray/CRM reference ports, local multimedia V4 and local stdio MCP), Rooms flags (`ROOMS_*`), the controlled pilot or the Rooms+Auth canary, Rooms media/storage, or when asked "what's the state of Rooms". Living skill: read references/program-ledger.md first and update it at every Rooms task closure.
---

# Efeonce Rooms (skill viva)

**Corte vigente 2026-10-31 (cierre del día):** Rooms está **en producción con flags ON** (`vivo`).
`efeonce-rooms.vercel.app` sirve `main@a2d72c0` = `dpl_5FNV9MSLdqWxuBGyim5Yoiz2UkPG` (PR #5: acceso interno
durable TASK-2082 y página `/auth/error` TASK-2083), sobre PR #4 (UI aprobada + «Vive el servicio»).
`rooms_production` tiene las migraciones 9–18 (`vivo`) y la 19 (`doc`). Los cinco flags `ROOMS_*` de Production
están en `true` y `ROOMS_AUTH_ALLOW_LOCAL_DEVELOPMENT` en `false`. Efeonce ID sirve first-party y OTP
(`auth-server-00169-4pq`, skill `efeonce-auth`). El ADR del carril de agentes está **Accepted**, sin código.
Falta, en orden: el primer login real del operador con la versión nueva; el carril de agentes (primero en Rooms:
actor, aviso, «Actividad de agentes» con reversa, cuotas y guard de clasificación); la task nueva de EPIC-044 de
delegación interactiva para la audiencia Rooms; el verificador del bearer y el provider `rooms` en `efeonce-mcp`.
Ningún cliente real sin una autorización nueva y sin cerrar TASK-1833. Secuencia completa y recibos en la sección
«Estado vigente» del [ledger](references/program-ledger.md).

Rooms es la **plataforma comercial propia de Efeonce**: salas privadas por oportunidad donde el comprador
recorre la propuesta, sus piezas y sus pruebas. Greenhouse conserva la **gobernanza documental** (ADR,
tasks, epic). El **runtime** vive en un repo aparte, `/Users/jreye/Documents/efeonce-rooms`, desplegado en
Vercel. La identidad la pone Efeonce ID (skill `efeonce-auth`); Rooms es su primer relying party.

## Orden de lectura

1. Este archivo: reglas y ruteo.
2. [`references/program-ledger.md`](references/program-ledger.md): estado vivo por unidad y por task,
   runtime cloud, WIP y secuencia pendiente. **Empezar aquí.**
3. Estado vigente: [dossier](../../../docs/architecture/rooms/README.md), [contrato Claude Design](../../../docs/documentation/rooms/backend-api-for-claude-design.md) y recibos del 2026-10-31 en `docs/audits/rooms/` (activación, migraciones, ensayo y acceso durable), enlazados en el ledger. Antecedentes: canary del 26-10 y [backend local del 29-10](../../../docs/audits/rooms/2026-10-29-backend-local-completion.md).
4. Dossier: [`docs/architecture/rooms/README.md`](../../../docs/architecture/rooms/README.md). Incluye:
   - `EFEONCE_ROOMS_ARCHITECTURE_V1.md`
   - `EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md`
   - `EFEONCE_ROOMS_CLOUD_RUNTIME_PILOT_DECISION_V1.md`
   - `EFEONCE_ROOMS_PRIVATE_IMAGE_MEDIA_AND_PROVENANCE_DECISION_V1.md`
   - Colaboración/presentación, importación X-ray/CRM, multimedia local y MCP stdio:
     los cinco ADR enlazados en el dossier poseen los contratos de la ampliación local.
   - `EFEONCE_ROOMS_DURABLE_INTERNAL_ACCESS_DECISION_V1.md` y `EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md` (ambos Accepted)
   - `EFEONCE_ROOMS_STACK_BASELINE_V1.md`
   - Experiencia, perfiles y marca.
5. [`EPIC-052`](../../../docs/epics/in-progress/EPIC-052-efeonce-rooms-sales-enablement-platform.md): roadmap R01–R15 y criterios de salida.
6. Evidencias de cada entrega en `docs/audits/rooms/*`.
7. Diseño: la UI de Rooms se compone con la línea gráfica «La órbita» (skill `efeonce-graphic-line`) y AXIS. Bricolage editorial y Poppins funcional.

## Mapa del runtime (`efeonce-rooms`)

| Pieza | Dónde |
|---|---|
| Dominio browser-safe | `src/domain/*` |
| Autoridad, readers, commands, persistencia y auth | `src/server/*` (`can` = autorización por capacidad y recurso) |
| API | `src/app/api/v1/rooms/**` |
| Páginas | `src/app/rooms/**` y `/demo` (sintética) |
| Migraciones | `migrations/` (node-pg-migrate) |
| CLI de paridad | `scripts/rooms.ts`: readers y execute JSON de los módulos construidos; bytes de imágenes separados |
| Colaboración/presentación | `src/server/collaboration`, `src/server/presentation/lifecycle.ts`; no confundir con adapters SSR session/content |
| Integraciones | `src/server/integrations`; puertos externos deshabilitados por defecto |
| Multimedia V4 local | `src/server/media/multimedia`, `scripts/multimedia-worker.ts`; opt-in sin cloud |
| MCP stdio local | `src/server/mcp`, `scripts/rooms-mcp.ts`; HTTP con sesión existente, no gateway remoto |

Comandos:
- `pnpm integration:up`, `pnpm integration:status`, `pnpm integration:check` y `pnpm integration:stop`: entorno local exclusivo para Claude Design, fixture explícita; [manual](../../../docs/manual-de-uso/rooms/integrar-claude-design-local.md). No activa producción ni correo.
- `pnpm verify`: lint, lint negativo, typecheck, test y build. Gate local de aplicación; CI de imagen Linux/decoder del worker ya integrado en main.
- `pnpm test:e2e`, `pnpm db:local`, `pnpm db:migrate`, `pnpm db:smoke`, `pnpm db:recovery`.
- `pnpm auth:integration`, `pnpm invitation:integration`.
- `pnpm multimedia:worker`: ejecución finita sólo con perfil local/flag explícito/toolchain fijado; sin scheduler cloud.
- `node --conditions=react-server --import tsx scripts/rooms-mcp.ts --base-url ORIGIN --session-file ARCHIVO --toolset read`: stdio sin banners; usar sesión existente0600 y origen exacto. `pnpm --silent rooms:mcp` es alternativa. No iniciar OAuth ni configurar hosts por inferencia.
- `pnpm rooms members` (acceso interno con paridad) y `pnpm access:production bootstrap-owner|health`: este último toca producción; sólo con orden explícita del operador.
- `pnpm dev` (127.0.0.1:3210).
- `pnpm test` escribe en la PG **local del repo** (`.local/postgres`, :55432) si existe `.local/db-config.json`. No es compartida, pero conviene saberlo.

## Reglas duras

- **Cada push a `main` de `efeonce-rooms` construye PRODUCCIÓN en Vercel** (integración Git; CI de worker no equivale a publicación).
  - El WIP va a rama, nunca a `main`.
  - Antes de pushear, `pnpm verify` completo y leer qué SHA queda como deploy activo.
  - El build puede quedar `READY/STAGED` conservando el alias anterior: comprobar el dominio canónico y usar promoción explícita si está autorizada; READY por sí solo no prueba publicación.
  - Producción vigente: `main@a2d72c0` = `dpl_5FNV9MSLdqWxuBGyim5Yoiz2UkPG` (PR #5), sobre PR #4 `6f99a6f`. Deploy anterior (con flags, sin PR #5): `dpl_GiGEoYaPSsUf8V7uZZyTbxtfZM8A`. Leer ledger y recibos antes de otra promoción.
- **`efeonce-rooms.vercel.app` es un alias MANUAL: no sigue a producción** (`vivo`). Después de cada deploy,
  `vercel alias set <deploy> efeonce-rooms.vercel.app --scope efeonce-7670142f` y readback del dominio (`/rooms`,
  `/auth/error`, `/api/auth/session` sin sesión = 401). El alias de equipo `efeonce-rooms-efeonce-7670142f.vercel.app`
  tiene SSO de Vercel y no sirve para probar como cliente.
- **Flags `ROOMS_*` viven en Vercel Production.** Hoy (`vivo`, valores releídos 2026-10-31)
  `ROOMS_FIRST_PARTY_AUTH_ENABLED`, `ROOMS_INVITATIONS_ENABLED`, `ROOMS_MEDIA_ENABLED`, `ROOMS_LIVE_ENABLED` y
  `ROOMS_MEDIA_DISPATCH_ENABLED` están en `true`; `ROOMS_AUTH_ALLOW_LOCAL_DEVELOPMENT` en `false`.
  - Un flag nuevo nace OFF. Prender, apagar o cambiar uno es una mutación de producción: autorización explícita y readback del valor (no sólo de la presencia).
  - Su runtime es otro repo; registrar readback en `references/program-ledger.md` y en el ledger de flags de Greenhouse con nota de alcance.
  - `ROOMS_MEDIA_DISPATCH_ENABLED` es sólo de máquina; no concede sesión ni acceso. El Job privado lleva su propio flag de medios, distinto de la app web.
- **El canary conjunto con Auth cerró el 26-10 y la activación completa se hizo el 31-10:** no repetir el canary
  ni su correo por un nuevo despliegue o continuación.
- **Ningún cliente real** sin una autorización nueva del operador y sin cerrar TASK-1833. Antes también: medir la
  sala en vivo (está prendida y sin medir) y revisar gobierno de datos IA para `read.client`.
- **Todo acceso interno vence en máximo un año** (techo de 366 días, ADR de acceso durable) y se renueva con
  `members.grantInternal|renewInternal|revokeInternal`; SQL a mano sólo como emergencia autorizada y documentada. El último administrador está protegido
  por comando y trigger. Rooms no hereda roles de Efeonce ID: un login sin acceso cae en `identity_unbound`.
- **DB `rooms_production` comparte la instancia `greenhouse-pg-dev`.** El rol `rooms_runtime` hereda de PUBLIC `CONNECT`/`TEMP` sobre otras bases (documentado, no corregido). Cualquier cambio de roles se valida contra el aislamiento.
- **El contenido V1/V2 publicado es inmutable.** V3 (medios) es opt-in explícito: nada convierte por inferencia.
- **Medios privados:**
  - Cada petición se vuelve a autorizar.
  - `private, no-store`.
  - Nunca se sirve el original, sólo los derivados.
  - Adapter GCS, bucket/IAM, ocho migraciones/26 tablas y Job privado desplegados2026-10-26. PNG físico a dos WebP y entrega privada verificados. Scheduler OIDC cada minuto consulta SQL y sólo inicia un Job con demanda; lease10min/nonce cercado, timeout240s/retries0. Prueba de transporte en sala archivada no añade otra imagen ni correo. Variables GCS están en el despliegue publicado. `ROOMS_MEDIA_ENABLED` de la app está ON desde la activación del 2026-10-31; no repetir el canary conjunto ya recibido.
- **Datos sintéticos rotulados.** La demo y el piloto usan personas ficticias. La badge «synthetic» aparece cuando el origen no es `real`.
- **AXIS y paquetes publicados exactos.** Ninguna copia manual de tokens, logos o primitives. Los SVG públicos salen de `scripts/sync-brand.mjs`.
- **Efeonce ID ya sirve first-party y OTP** (`auth-server-00169-4pq`; fuente durable: variables de repo GitHub `AUTH_SERVER_FIRST_PARTY_ENABLED` y `AUTH_SERVER_INVITATION_EMAIL_OTP_ENABLED` en `true`). Las PR #263/#264 de Auth siguen abiertas y sin merge: sus flags se liberaron sólo para esta activación, por decisión del operador. Actualizar Rooms no autoriza merge, release #262 ni cambios de Auth; eso vive en la skill `efeonce-auth`.
- **Agentes = ciudadanos de primera clase** ([ADR carril de agentes](../../../docs/architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md), Accepted `4d8d6553c`).
  - Publican, invitan y dan acceso directo con la autoridad exacta de una persona interna; sin principal propio.
  - En producción, sólo vía gateway: token delegado de Efeonce ID + identidad de workload del gateway, introspección con caché ≤ 30 s.
  - Seguridad por atribución (`actor_kind`, `agent_client_id`, `channel`), aviso a la persona, reversa con un clic, cuotas y eval de oficio. `read.client` va aparte.
  - Nada implementado todavía: hoy los agentes usan la CLI `pnpm rooms` y el MCP stdio local con `--session-file` (cookie humana), con todos los comandos, `members.*` incluido; no hay MCP remoto. Las demás pantallas de administración del canvas están pausadas: se rediseñan agentes-primero («Actividad de agentes», vista por sala).
- **Claude Design posee la interfaz.** La UI aprobada por el operador está en producción (PR #4). Preparar integración same-origin, datos/permisos de prueba y recorrido UI; no conectar un artifact de otro origin con tokens en storage ni reutilizar secretos/WIF Production en Preview. El perfil cloud exige Production exacto. Hoy (`local`) no hay botón para crear una sala (sólo API/CLI) y ningún botón lleva a la mesa de autoría `/rooms/:id/authoring`; consola de presentación y señales son sólo API.
- **Bricolage en texto de varias líneas alterna pesos** (regla del operador): la frase clave pesada y el resto ligero, con los tokens `--room-weight-bold` y `--room-weight-light`. Un bloque entero en bold se ve pesado. Caso fuente: titular de `/auth/error`.
- Paridad Full API: toda acción de UI es un command o reader con su contrato. API/SDK/CLI y el adapter MCPstdio local comparten los módulos construidos. La federación MCP remota (provider `rooms` en `efeonce-mcp`, verificador del bearer `ROOMS_AGENT_LANE_ENABLED`) llega con el carril de agentes y aún no existe; conectores externos y binarios por MCP siguen fuera. Ver exclusiones canónicas y manual.
- V4 combina imágenes existentes con PDF/audio/video en una edición mediante kind, sin ampliar MIME V3
  ni alterar su metadata SQL. Opt-in local,13migraciones y sandbox/codecs propios; /media sólo imágenes,
  /multimedia sólo otros tipos. Toda ref no excluida requiere bloque visible o publicación queda pending. Docker/Linux/cloud se certifican aparte; no activar producción por codecs locales.
- Invitados con derechos adicionales sólo por concesión explícita de edición inicial. No autogrants de derechos adicionales en otra edición ni principal interno artificial.
- Presentación: notas propias incluso ante admin; audiencia nunca recibe notas/controllerinstance. Control/ack usan secuencia; ack no prueba reproducción. Bloques excluidos no forman un tour visible ni se rehabilitan por replay.
- X-ray/CRM: puertos OFF por defecto; snapshot autorizado y mapping/exclusiones, no URLs arbitrarias ni una sincronización supuesta. Handoff pending es intención durable, no entrega.
- Las tasks y ADR de Rooms se escriben en `greenhouse-eo/docs`. Ningún doc canónico vive en el repo runtime.

## Lecciones operacionales del backend local

- Confirmar la base elegida antes de una suite: las pruebas PostgreSQL comparten colas globales de
  workers y se ejecutan en serie. No correr suites simultáneas contra la misma base con raíces de
  storage distintas. Cada recovery usa su propia base y storage desechables.
- Distinguir recovery de imágenes de ocho migraciones y restore ampliado de trece/V4. Para este último,
  el manual usa `scripts/backend-recovery.ts` en PG18 o `--pg16`. Si el recibo precede el commit y dice
  dirty, atribuirlo por los hashes de las fuentes contrastadas; nunca presentar aquel HEAD como limpio.
- El bootstrap reconcilia sólo sus tres actores sintéticos y conserva salas/borradores. Cambiar el modo
  multimedia exige stop previo; `integration:up` sin opción conserva el modo guardado. No resetear la DB
  para adoptar una migración ni usar un down poblado para borrar capacidades con datos.
- Ready, attach y publicación son estados distintos. V4 exige un bloque visible para cada referencia
  no excluida; las preguntas con `timeMs` se limitan a audio/video publicado y su duración medida.
- Las comprobaciones Chrome/API/SDK prueban contratos en navegador; no aceptan la nueva UI.
  Mantener separados resultados locales, canary cloud histórico, release y aceptación humana.

## Contrato de mantenimiento de la skill

Cada task de EPIC-052 **actualiza `references/program-ledger.md` al cerrar o al detenerse**: qué quedó
commiteado, desplegado u OFF, qué falta y la evidencia (SHA, deployment, comando). Esta skill es
byte-identical entre `.claude/skills/efeonce-rooms` y `.codex/skills/efeonce-rooms`: editar una, copiar
a la otra y correr `pnpm skills:mirrors`.

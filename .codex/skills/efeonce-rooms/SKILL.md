---
name: efeonce-rooms
description: Operate and extend Efeonce Rooms (EPIC-052) — the sales-enablement / buyer-experience product (`rooms.efeonce.org`, runtime repo `efeonce-rooms`, Next.js on Vercel, own PostgreSQL `rooms_production`). Use when touching the `efeonce-rooms` repo, Rooms docs in `docs/architecture/rooms/**`, EPIC-052 tasks (TASK-2058…2072 and TASK-2074…2078: foundation, first experience, persistence, Vercel release, versioned authoring, Efeonce ID consumer, tokenized invitations, guest reading, cloud runtime pilot, private image media, image authoring/viewer, automatic worker dispatch, Claude Design integration, durable collaboration/presentation, X-ray/CRM reference ports, local multimedia V4 and local stdio MCP), Rooms flags (`ROOMS_*`), the controlled pilot or the Rooms+Auth canary, Rooms media/storage, or when asked "what's the state of Rooms". Living skill: read references/program-ledger.md first and update it at every Rooms task closure.
---

# Efeonce Rooms (skill viva)

**Corte vigente 2026-10-29:** [backend local verificado](../../../docs/audits/rooms/2026-10-29-backend-local-completion.md)
en `codex/rooms-design-integration@3c7bcb5`, sin push/deploy: 337 tests sin skips,
13 migraciones/43 tablas y restore mixto PG16/18 PASS. Incluye colaboración,
presentación, derechos guest explícitos, importación X-ray/referencias CRM con puertos OFF,
multimedia V4 sólo local y MCP stdio local. La interfaz de Claude Design sigue por conectar y aceptar;
Linux/cloud multimedia, conectores reales y federación remota no están certificados.
El [mapa coordinado Auth+Rooms](../../../docs/audits/rooms/2026-10-29-auth-rooms-program-consolidation.md)
precede esta ampliación. El canary del 26-10 ya cerró con acceso humano OFF y Auth retenido en PR.
GCS/worker/dispatch de imágenes pertenecen a ese corte cloud; el ref Git `main@e4b2e89`
no acredita el deployment activo. Leer el ledger y el
[manual backend local](../../../docs/manual-de-uso/rooms/operar-backend-local.md) antes de operar.

Rooms es la **plataforma comercial propia de Efeonce**: salas privadas por oportunidad donde el comprador
recorre la propuesta, sus piezas y sus pruebas. Greenhouse conserva la **gobernanza documental** (ADR,
tasks, epic). El **runtime** vive en un repo aparte, `/Users/jreye/Documents/efeonce-rooms`, desplegado en
Vercel. La identidad la pone Efeonce ID (skill `efeonce-auth`); Rooms es su primer relying party.

## Orden de lectura

1. Este archivo: reglas y ruteo.
2. [`references/program-ledger.md`](references/program-ledger.md): estado vivo por unidad y por task,
   runtime cloud, WIP y secuencia pendiente. **Empezar aquí.**
3. Estado vigente: [dossier](../../../docs/architecture/rooms/README.md), [contrato Claude Design](../../../docs/documentation/rooms/backend-api-for-claude-design.md) y recibos de26Oct enlazados en el ledger. Antecedente histórico: [`docs/audits/rooms/2026-10-25-rooms-auth-status-after-codex-stop.md`](../../../docs/audits/rooms/2026-10-25-rooms-auth-status-after-codex-stop.md).
4. Dossier: [`docs/architecture/rooms/README.md`](../../../docs/architecture/rooms/README.md). Incluye:
   - `EFEONCE_ROOMS_ARCHITECTURE_V1.md`
   - `EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md`
   - `EFEONCE_ROOMS_CLOUD_RUNTIME_PILOT_DECISION_V1.md`
   - `EFEONCE_ROOMS_PRIVATE_IMAGE_MEDIA_AND_PROVENANCE_DECISION_V1.md`
   - Colaboración/presentación, importación X-ray/CRM, multimedia local y MCP stdio:
     los cinco ADR enlazados en el dossier poseen los contratos de la ampliación local.
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
- `pnpm dev` (127.0.0.1:3210).
- `pnpm test` escribe en la PG **local del repo** (`.local/postgres`, :55432) si existe `.local/db-config.json`. No es compartida, pero conviene saberlo.

## Reglas duras

- **Cada push a `main` de `efeonce-rooms` construye PRODUCCIÓN en Vercel** (integración Git; CI de worker no equivale a publicación).
  - El WIP va a rama, nunca a `main`.
  - Antes de pushear, `pnpm verify` completo y leer qué SHA queda como deploy activo.
  - El build puede quedar `READY/STAGED` conservando el alias anterior: comprobar el dominio canónico y usar promoción explícita si está autorizada; READY por sí solo no prueba publicación.
  - Backend publicado en `main@e4b2e890` por autorización2026-10-26, PR3 y despliegue promovido `dpl_7JmMF7ZPBzR56wff83UyL4yFsXoS`. PR2/a87852e es el antecedente de medios; leer ledger y recibos antes de otra promoción.
- **Flags humanos `ROOMS_*` viven en Vercel Production y nacen OFF.**
  - Prenderlos es una mutación de producción: autorización explícita y readback del valor (no sólo de la presencia).
  - Su runtime es otro repo; registrar readback en `references/program-ledger.md` y en el ledger de flags de Greenhouse con nota de alcance.
  - Excepción ya autorizada: `ROOMS_MEDIA_DISPATCH_ENABLED=true` es sólo de máquina; no concede sesión ni acceso a clientes. El Job privado lleva su propio mediaON, distinto de la app web.
- **El canary es uno solo y conjunto con Auth:**
  Leer primero el ledger: si el correo único ya fue recibido y verificado, no repetirlo por un nuevo despliegue o continuación.
  1. Auth con flags ON.
  2. `ROOMS_*` ON.
  3. Bootstrap de una sala sintética (`scripts/bootstrap-production-pilot.ts`, dry-run por defecto; `--apply` crea).
  4. Un único correo a `jreyes@efeoncepro.com`.
  5. Replay, revocación y rollback.

  Ningún cliente real sin una nueva autorización.
- **DB `rooms_production` comparte la instancia `greenhouse-pg-dev`.** El rol `rooms_runtime` hereda de PUBLIC `CONNECT`/`TEMP` sobre otras bases (documentado, no corregido). Cualquier cambio de roles se valida contra el aislamiento.
- **El contenido V1/V2 publicado es inmutable.** V3 (medios) es opt-in explícito: nada convierte por inferencia.
- **Medios privados:**
  - Cada petición se vuelve a autorizar.
  - `private, no-store`.
  - Nunca se sirve el original, sólo los derivados.
  - Adapter GCS, bucket/IAM, ocho migraciones/26 tablas y Job privado desplegados2026-10-26. PNG físico a dos WebP y entrega privada verificados. Scheduler OIDC cada minuto consulta SQL y sólo inicia un Job con demanda; lease10min/nonce cercado, timeout240s/retries0. Prueba de transporte en sala archivada no añade otra imagen ni correo. Variables GCS están en el despliegue publicado. `ROOMS_MEDIA_ENABLED` de la app sigue OFF: falta consumidor frontend, recorrido integrado con la nueva UI y autorización de activación; no repetir el canary conjunto ya recibido.
- **Datos sintéticos rotulados.** La demo y el piloto usan personas ficticias. La badge «synthetic» aparece cuando el origen no es `real`.
- **AXIS y paquetes publicados exactos.** Ninguna copia manual de tokens, logos o primitives. Los SVG públicos salen de `scripts/sync-brand.mjs`.
- **Auth sigue en PR263/264** por instrucción expresa: no merge main/develop, deploy, flags ni release262 por actualizar Rooms.
- **Claude Design posee la interfaz.** Preparar integración same-origin, datos/permisos de prueba y recorrido UI; no conectar un artifact de otro origin con tokens en storage ni reutilizar secretos/WIF Production en Preview. El perfil cloud exige Production exacto.
- Paridad Full API: toda acción de UI es un command o reader con su contrato. API/SDK/CLI y el adapter MCPstdio local comparten los módulos construidos. Federación MCP remota, conectores externos y binarios por MCP siguen fuera; ver exclusiones canónicas y manual.
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

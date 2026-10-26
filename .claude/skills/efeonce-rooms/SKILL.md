---
name: efeonce-rooms
description: Operate and extend Efeonce Rooms (EPIC-052) — the sales-enablement / buyer-experience product (`rooms.efeonce.org`, runtime repo `efeonce-rooms`, Next.js on Vercel, own PostgreSQL `rooms_production`). Use when touching the `efeonce-rooms` repo, Rooms docs in `docs/architecture/rooms/**`, EPIC-052 tasks (TASK-2058…2072: foundation, first experience, persistence, Vercel release, versioned authoring, Efeonce ID consumer, tokenized invitations, guest reading, cloud runtime pilot, private image media, image authoring/viewer, automatic worker dispatch and Claude Design integration), Rooms flags (`ROOMS_*`), the controlled pilot or the Rooms+Auth canary, Rooms media/storage, or when asked "what's the state of Rooms". Living skill: read references/program-ledger.md first and update it at every Rooms task closure.
---

# Efeonce Rooms (skill viva)

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
| CLI de paridad | `scripts/rooms.ts` (`pnpm rooms …`: list, room, draft, editions, execute, validate, invitations y medios) |

Comandos:
- `pnpm verify`: lint, lint negativo, typecheck, test y build. Gate local de aplicación; CI de imagen Linux/decoder del worker ya integrado en main.
- `pnpm test:e2e`, `pnpm db:local`, `pnpm db:migrate`, `pnpm db:smoke`, `pnpm db:recovery`.
- `pnpm auth:integration`, `pnpm invitation:integration`.
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
- Paridad Full API: toda acción de UI es un command o reader con su contrato. La CLI ya existe; el MCP está pendiente (R13/R14).
- Las tasks y ADR de Rooms se escriben en `greenhouse-eo/docs`. Ningún doc canónico vive en el repo runtime.

## Contrato de mantenimiento de la skill

Cada task de EPIC-052 **actualiza `references/program-ledger.md` al cerrar o al detenerse**: qué quedó
commiteado, desplegado u OFF, qué falta y la evidencia (SHA, deployment, comando). Esta skill es
byte-identical entre `.claude/skills/efeonce-rooms` y `.codex/skills/efeonce-rooms`: editar una, copiar
a la otra y correr `pnpm skills:mirrors`.

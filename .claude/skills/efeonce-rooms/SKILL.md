---
name: efeonce-rooms
description: Operate and extend Efeonce Rooms (EPIC-052) — the sales-enablement / buyer-experience product (`rooms.efeonce.org`, runtime repo `efeonce-rooms`, Next.js on Vercel, own PostgreSQL `rooms_production`). Use when touching the `efeonce-rooms` repo, Rooms docs in `docs/architecture/rooms/**`, EPIC-052 tasks (TASK-2058…2071: foundation, first experience, persistence, Vercel release, versioned authoring, Efeonce ID consumer, tokenized invitations, guest reading, cloud runtime pilot, private image media, image authoring/viewer), Rooms flags (`ROOMS_*`), the controlled pilot or the Rooms+Auth canary, Rooms media/storage, or when asked "what's the state of Rooms". Living skill: read references/program-ledger.md first and update it at every Rooms task closure.
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
3. Corte consolidado: [`docs/audits/rooms/2026-10-25-rooms-auth-status-after-codex-stop.md`](../../../docs/audits/rooms/2026-10-25-rooms-auth-status-after-codex-stop.md).
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
| CLI de paridad | `scripts/rooms.ts` (`pnpm rooms …`: list, room, draft, editions, execute, validate, invitations; con el WIP, también medios) |

Comandos:
- `pnpm verify`: lint, lint negativo, typecheck, test y build. Gate local de aplicación; la rama2072 añade CI de imagenLinux/decoder del worker.
- `pnpm test:e2e`, `pnpm db:local`, `pnpm db:migrate`, `pnpm db:smoke`, `pnpm db:recovery`.
- `pnpm auth:integration`, `pnpm invitation:integration`.
- `pnpm dev` (127.0.0.1:3210).
- `pnpm test` escribe en la PG **local del repo** (`.local/postgres`, :55432) si existe `.local/db-config.json`. No es compartida, pero conviene saberlo.

## Reglas duras

- **Cada push a `main` de `efeonce-rooms` construye PRODUCCIÓN en Vercel** (integración Git, sin CI).
  - El WIP va a rama, nunca a `main`.
  - Antes de pushear, `pnpm verify` completo y leer qué SHA queda como deploy activo.
  - El build puede quedar `READY/STAGED` conservando el alias anterior: comprobar el dominio canónico y usar promoción explícita si está autorizada; READY por sí solo no prueba publicación.
  - Backend publicado en `main@a87852e` por autorización2026-10-26; `20f9fe9` queda como rollback previo. Leer el ledger y el recibo de release antes de otra promoción.
- **Flags `ROOMS_*` viven en Vercel Production y nacen OFF.**
  - Prenderlos es una mutación de producción: autorización explícita y readback del valor (no sólo de la presencia).
  - No están en el ledger de flags de Greenhouse (otro repo), así que su estado se registra en `references/program-ledger.md` y en el ledger con una nota.
- **El canary es uno solo y conjunto con Auth:**
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
  - Adapter GCS integrado en main; bucket/IAM, siete migraciones y Job privado desplegados2026-10-26. Job finito probado con cola vacía; sin scheduler ni imagen real. Variables GCS preparadas para próximo deploy. `ROOMS_MEDIA_ENABLED` de la app sigue OFF: activar sólo después del consumidor frontend y canary conjunto.
- **Datos sintéticos rotulados.** La demo y el piloto usan personas ficticias. La badge «synthetic» aparece cuando el origen no es `real`.
- **AXIS y paquetes publicados exactos.** Ninguna copia manual de tokens, logos o primitives. Los SVG públicos salen de `scripts/sync-brand.mjs`.
- Paridad Full API: toda acción de UI es un command o reader con su contrato. La CLI ya existe; el MCP está pendiente (R13/R14).
- Las tasks y ADR de Rooms se escriben en `greenhouse-eo/docs`. Ningún doc canónico vive en el repo runtime.

## Contrato de mantenimiento de la skill

Cada task de EPIC-052 **actualiza `references/program-ledger.md` al cerrar o al detenerse**: qué quedó
commiteado, desplegado u OFF, qué falta y la evidencia (SHA, deployment, comando). Esta skill es
byte-identical entre `.claude/skills/efeonce-rooms` y `.codex/skills/efeonce-rooms`: editar una, copiar
a la otra y correr `pnpm skills:mirrors`.

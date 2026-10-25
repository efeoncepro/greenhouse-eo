# Efeonce Rooms — ledger del programa

> Estado vivo. La entrada más reciente va arriba. Cada hecho dice su fuente: `vivo` (readback),
> `doc` (lo afirma un documento) o `local` (check en el workspace).

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

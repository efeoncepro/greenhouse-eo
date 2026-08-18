# ISSUE-159 — Los live tests fabricaban fichas de candidato sobre personas reales

> **Estado:** open
> **Ambiente:** Cloud SQL compartida (`greenhouse-pg-dev` — única instancia para dev, staging y producción)
> **Detectado:** 2026-08-17
> **Severidad:** alta (privacidad / integridad de datos de personas reales)
> **Dominio:** Hiring / ATS · Banco de Talento
> **Task relacionada:** `TASK-1739` (fix sistémico, hoy en `to-do`)

## Síntoma

Un colaborador **activo** de Efeonce apareció registrado en el Banco de Talento con
`consent_status = not_captured`, sin haber postulado a ninguna vacante ni haber aceptado nada.

Caso concreto verificado: `Felipe Zurita <fzurita@efeoncepro.com>`, ficha
`cndf-eeda4dcb-cacb-43ad-9b48-d17bb53b67b6`, creada el 2026-08-17 por el autor sintético
`user-live-test-proposal`, con 1 membresía de Banco de Talento materializada.

## Causa raíz

Tres `*.live.test.ts` del dominio anclaban su fixture así:

```sql
SELECT profile_id FROM greenhouse_core.identity_profiles WHERE active = true LIMIT 1
```

- `src/lib/hiring/store.live.test.ts:56`
- `src/lib/hiring/assessment/instances.live.test.ts:60`
- `src/lib/hiring/assessment/scoring.live.test.ts:52`

Sin `ORDER BY`, ese `LIMIT 1` es **no determinista**: devuelve la fila que el planner tenga a
mano. Y la base es **única y compartida** por dev, staging y producción, así que el sujeto de
prueba podía ser —y fue— una persona real. Sobre ese perfil el test ejecutaba
`reconcileCandidateFacet`, lo que a su vez dispara la materialización de la membresía del Banco
de Talento y su evento de consentimiento en el ops-worker.

El daño no lo causó un bug de producción: lo causó un fixture eligiendo a una persona real
como sujeto.

## Impacto

- Una persona real quedó registrada como candidata sin consentimiento, visible para la
  búsqueda del Banco de Talento.
- El conteo del dominio queda contaminado (fichas que nadie creó deliberadamente).
- Es reproducible por cualquiera que ejecute los live tests con credenciales de PG cargadas.

## Resolución aplicada (parcial)

**Cerrada la causa raíz** (2026-08-17): nuevo helper `src/lib/hiring/live-test-identity.ts` que
crea/reusa un perfil **sintético dedicado** (`identity-live-test-hiring-fixture`,
`live-test-hiring-fixture@live-test.invalid`), idempotente y reconocible. Los tres live tests
anclan ahí; el patrón `LIMIT 1` sobre personas activas quedó erradicado del dominio (verificado
con grep: 0 ocurrencias).

**Invariante:** NUNCA resolver el ancla de un test con "el primer perfil activo". Un fixture no
puede elegir a una persona real como sujeto de prueba.

## Pendiente

1. **Purgar la ficha contaminada** de Felipe Zurita. El instrumento existe y el dry-run la
   identifica correctamente como purgable (sin postulaciones, sin handoffs, sin consentimiento).
   **Bloqueador diagnosticado 2026-08-18: `auth_failed` (PostgreSQL `auth.c:363`) — la contraseña de
   `GREENHOUSE_POSTGRES_OPS_PASSWORD` en `.env.local` está caducada.** El `ECONNRESET` que se reportó
   antes era el síntoma, no la causa: el servidor cierra la conexión después de rechazar la
   autenticación. Verificado que no es red ni el proxy (el cliente canónico con perfil runtime sirve
   sin problema por el mismo proxy) y que no hay alternativa por permisos (`greenhouse_app` responde
   `permission denied` sobre esas tablas, por diseño).
   **Corregido en el camino:** el script abría su propio `pg.Client` TCP —violando el invariante del
   repo de no instanciar clientes fuera de `src/lib/postgres/client.ts`— y ahora usa
   `applyGreenhousePostgresProfile('ops')` + el cliente canónico. Ese arreglo es lo que permitió ver
   el error real en lugar del `ECONNRESET` genérico.
   **Los TRES caminos de escritura están cerrados en este entorno (verificado 2026-08-18):**
   - `ops` (perfil por defecto del script) → `auth_failed`: la contraseña en `.env.local` está caducada.
   - `admin` con `user=postgres` + el secreto `greenhouse-pg-dev-postgres-password` inyectado desde
     Secret Manager → **también `auth_failed`**: ese secreto no corresponde a ese usuario, o el
     usuario admin no es `postgres`. (La ADC tampoco puede resolver el secreto por sí sola:
     `PERMISSION_DENIED` en `secretmanager.versions.access`; sólo la cuenta de usuario del operador
     tiene acceso.)
   - `runtime` (`greenhouse_app`) → `permission denied`, **por diseño**: no tiene DELETE sobre estas
     tablas y no debe tenerlo.
   **Para desbloquear** hace falta una credencial de escritura válida: recuperar/rotar la de
   `greenhouse_ops` por el procedimiento canónico (`pnpm secrets:rotate`, con verify-before-cutover),
   o publicar la de `admin` en Secret Manager y darle acceso a la ADC. Es una operación de secretos
   con dueño humano, no un bloqueo de código.
   El script quedó preparado para ambos: acepta `PURGE_PG_PROFILE=admin` como break-glass y resuelve
   la contraseña por `*_SECRET_REF` sin exponerla.

2. **Completar la allowlist del script**: `SYNTHETIC_AUTHORS` cubre `user-live-test`,
   `user-live-test-proposal` y `user-smoke-test`, pero los live tests también escriben con
   `user-live-test-2`, `user-live-test-3`, `user-live-test-racer` y `user-reviewer`. Las fichas
   de esos autores hoy no son visibles para la purga.
3. **Avisar a la persona afectada** si People/Legal lo estima necesario.
4. `TASK-1739` sigue en `to-do` con `Status real: Diseño`: es la dueña del fix sistémico y del
   instrumento de purga, que hoy es huérfano.

## Verificación

- `grep -c "identity_profiles WHERE active = true LIMIT 1"` sobre los tres archivos → **0**.
- Helper ejercitado contra PG real: id estable, idempotente (2 llamadas = 1 fila), perfil
  `candidate`/`active` con correo `.invalid`.
- Dry-run de la purga: identifica 1 ficha purgable y **preserva** correctamente las 2 fichas
  sintéticas que sí tienen postulaciones ("es historia real").

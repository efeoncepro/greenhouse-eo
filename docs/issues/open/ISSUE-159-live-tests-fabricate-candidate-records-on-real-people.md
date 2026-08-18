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

1. **Purgar la ficha contaminada** de Felipe Zurita. El instrumento existe
   (`pnpm hiring:candidates:purge-test-facets`, dry-run la identifica correctamente como
   purgable: sin postulaciones, sin handoffs, sin consentimiento), pero su `--apply` **no corre
   hoy**: falla con `read ECONNRESET` al abrir su propio cliente TCP con perfil `ops` contra el
   proxy local. Verificado que no es la base (el cliente canónico por Connector funciona) y que
   el camino canónico no es alternativa (`greenhouse_app` responde `permission denied`, por
   diseño). **Requiere resolver la conexión `ops`** antes de ejecutarse.
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

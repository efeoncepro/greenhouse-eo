# ISSUE-172 — `lpad` trunca el `public_id` del Banco de Talento: colisión de IDs que rompe el cron y el carril vivo de postulaciones

> **Tipo:** Incidente de runtime
> **Ambiente:** producción (`ops-worker`; una sola instancia Cloud SQL compartida dev/staging/prod)
> **Detectado:** 2026-09-12 (reportado por Codex, verificado contra runtime en esta sesión)
> **Estado:** open — causa raíz probada; **fix implementado en local, NO desplegado; migración NO aplicada** (requiere autorización del operador)
> **Severidad:** P1 — falla el carril por el que entran las postulaciones de candidatos

## Síntoma

El Cloud Scheduler `ops-hiring-talent-pool-reconcile` (`*/5 * * * *`, TASK-1723) falla en **todos** sus intentos
(`gcloud scheduler jobs list` → `CODE 13`, último intento 2026-09-12T12:15:21Z). El consumer reactivo
`growth_hiring_application_from_submission` — **el que crea las postulaciones desde el Growth Form** — falla de forma
intermitente con el mismo error.

```
duplicate key value violates unique constraint "talent_pool_membership_public_id_key"
```

## Causa raíz: `lpad` TRUNCA, no sólo rellena

El default de la columna es:

```sql
('EO-TLP-'::text || lpad((nextval('greenhouse_hiring.talent_pool_public_seq'::regclass))::text, 5, '0'::text))
```

En PostgreSQL `lpad(string, length, fill)` **recorta** cuando `string` excede `length` — no sólo rellena. Probado
contra la base:

| `nextval` | `lpad(n::text,5,'0')` |
|---|---|
| `99999` | `99999` |
| `100000` | `10000` ← empieza el daño |
| `575712` | `57571` |
| `575713` | `57571` ← **mismo valor** |

La secuencia va en **`last_value = 575712`** (`cycle = false`, sin techo). Pasado 99.999, **diez valores consecutivos
de la secuencia colapsan en el mismo `public_id`**, contra un `UNIQUE (public_id)`.

De ahí las dos formas de falla:

- **El cron falla de forma determinista.** `projection.ts:61` hace `INSERT … SELECT` sobre **todos** los facets
  activos (247) y PostgreSQL evalúa el default —y por lo tanto `nextval`— para cada fila candidata **antes** de que
  `ON CONFLICT (candidate_facet_id) DO NOTHING` la descarte. Cualquier corrida que intente ≥2 filas cuyos `nextval`
  caigan en la misma decena **colisiona consigo misma**, y ese `ON CONFLICT` no arbitra sobre `public_id`.
- **El consumer falla de forma intermitente** (`ensureTalentPoolMembership`, `self-service.ts:37`, una fila por vez):
  choca sólo cuando su valor truncado ya está tomado. Reintenta y acaba entrando, que es por lo que las postulaciones
  siguen llegando.

## Por qué se agotó un espacio de 5 dígitos en tres semanas

El mismo `INSERT … SELECT` sin anti-join quema ~247 valores de secuencia por corrida × 288 corridas/día ≈ **71.000
valores al día**, con 230 filas en la tabla. La primera fila es del 2026-08-16 (`EO-TLP-00001`); la secuencia cruzó
100.000 a los pocos días. Un espacio pensado para años se consumió en semanas.

## Impacto medido (2026-09-12)

- **No hay pérdida de postulaciones hoy.** 72h del form `efeonce-careers-application`: **160 `delivered` + 1
  `accepted`** (la última, de 12:18:34Z, en vuelo). Postulaciones creadas en 72h: 141 (0009: 57 · 0675: 53 · 0061: 16
  · 0674: 15). El reintento del consumer está absorbiendo el defecto.
- **El cron nunca completa**, así que su red de seguridad no opera: **17 candidate facets activos sin membership**
  (230 memberships contra 247 facets). Esos candidatos no están en el Banco de Talento.
- Ruido permanente de errores en `ops-worker` y quema de ~71k valores/día. El riesgo crece: cada vuelta completa al
  espacio de 5 dígitos (~1,4 días) vuelve a pasar por los valores ya tomados.

## Corrección de una afirmación previa

`ISSUE-171` sostiene que el carril vivo de postulaciones está sano y que no se puede medir lo que falla antes de
llegar, por el libro de intake ciego (defecto (b) de esa ficha). Este incidente es precisamente ese punto ciego
materializándose: había un consumer fallando en ese carril y ninguna señal propia lo mostraba — se vio en los logs de
Cloud Run, no en el ledger del dominio.

## Estado real medido antes del fix (2026-09-12, ~12:30Z)

- **El circuito del consumer está ABIERTO** desde 12:15:03Z (`projection_circuit_state`: 4 fallos
  consecutivos, 6/12 en ventana ≥ 50 %, enfriamiento 30 min, probe único en `half_open`). Mientras
  siga abierto, el intake de postulaciones **no procesa nada**; el breaker deja los eventos sin fila
  en `outbox_reactive_log` a propósito para re-tomarlos, y por eso ninguna señal de dead-letter los
  ve. `handler_health` lo tiene en `degraded`. **Ninguna señal de reliability mira ninguna de las dos
  tablas** — se supo por los logs de Cloud Run.
- **Reconciliación por contenido** (`email` + `openingPublicId` de la submission contra
  `identity_profiles` + `hiring_opening`): de 166 submissions en 72 h, **141 con postulación y 25
  sin**, 25 personas distintas (no duplicados). Causas: **11** murieron en la colisión de `public_id`
  con la persona y el facet ya creados (`retry/1`); **12** están `published` y saltadas por el breaker
  (sin fila; se re-toman solas cuando cierre); **2** las rechaza el parser por `linkedinUrl` sin
  `https://`. El conteo crece en vivo mientras el circuito siga abierto (170 submissions minutos
  después). **Ninguna submission se perdió**: están en `greenhouse_growth.form_submission`.
- **Histórico limpio:** todas las semanas anteriores cuadran al 100 % (3/3, 43/43, 7/7, 2/2, 1/1). Las
  pérdidas están confinadas a la semana del 2026-09-07.
- `projection_refresh_queue`: 7 `dead` (5 colisión + 2 URL) y 4 `pending`. El replay canónico corre
  el scope aunque la cola esté `dead` y lo marca `completed` al éxito (`reactive-consumer.ts` Phase C
  → `markRefreshCompleted` sin condición de estado), así que **no hay que tocar la cola**.

## Las tres capas del rechazo por URL (las 2 personas)

1. El parser (`schema.ts`) trataba un enlace opcional como fatal: `isSafeHttpUrl` exige `https:` y
   «linkedin.com/in/x» devolvía `null` para TODA la postulación.
2. El Growth Form tipa `linkedinUrl`/`portfolioUrl` como `url` y su validador **antepone `https://`**
   — pero esa normalización sólo aterriza en `normalized_fields_json` con la re-validación
   server-side de TASK-1253, gated por **`GROWTH_FORMS_SERVER_VALIDATION_ENABLED`, OFF por defecto**.
   Sin ella se persiste el raw del navegador.
3. El renderer no bloquea el submit por un `url` sin scheme.

## Fix (implementado en local, NO desplegado; la migración NO aplicada)

Cuatro capas, cada una cierra una clase distinta — no un parche por síntoma:

1. **Migración `20260912122159611_issue-172-talent-pool-public-id-no-truncation.sql`.** El default
   pasa a la función `greenhouse_hiring.next_talent_pool_public_id()` (un solo `nextval` por fila;
   `lpad(n, GREATEST(5, length(n)))` rellena a 5 y **nunca recorta**), y `setval` reancla la secuencia
   sobre el `MAX` real (72440 → siguiente 72441). Bloque `DO` que aborta si el default no cambió, si
   la expresión recorta o si la secuencia no quedó bajo 100 000. `to_char(n,'FM00000')` se descartó
   porque **desborda a `#####`** pasado el patrón (probado contra la base). Down restaura el default
   original y borra la función; no devuelve la secuencia (sólo saltearía IDs).
2. **Anti-join en `projection.ts:61`** (`NOT EXISTS … talent_pool_membership`): la corrida sólo
   intenta los facets sin membership. Corta la quema de ~71k valores/día; `ON CONFLICT` queda como
   guarda de carrera contra `ensureTalentPoolMembership`. Test que fija el predicado.
3. **Parser tolerante (`normalizeOptionalHttpsUrl`)**: sin scheme → https; `http://` → https;
   `javascript:`/`data:`/sin host → se **descarta el campo y la postulación sigue**. Nunca se
   persiste un scheme distinto de https. Tests: peligrosas descartadas sin rechazar, caso real
   `linkedin.com/in/ada`, http elevado. Entry parity intacta (ambas entradas usan el mismo parser).
4. **Señal `sync.reactive.circuit_open`** (`incident`, módulo `sync`, steady 0): `error` con un
   breaker `open`/`half_open`, `warning` con handlers `degraded`/`quarantined`. Cableada en el
   overview con degradación a `null`. Es la capa que faltaba: con ella este incidente habría sido
   visible a los 5 minutos, no horas después.

Verificación local: tests focales **7 archivos / 42 tests** verdes (parser, entry parity, submit,
tablero ×3, projection) + reliability; `pnpm local:check` (lint + tsc) sobre el conjunto.

**Fuera de este fix, registrado:** el flag `GROWTH_FORMS_SERVER_VALIDATION_ENABLED` (capa 2 de la
URL) — prenderlo es decisión aparte con su fila en el ledger y blast radius sobre todos los forms; el
cron `ops-hiring-talent-pool-reconcile` sigue sin señal propia (no registra `source_sync_runs`).

## 4-Pillar Score

### Safety
- **Qué puede salir mal:** la migración toca la ÚNICA instancia Cloud SQL (dev/staging/prod a la vez).
- **Gates:** `pnpm migrate:create` + markers + bloque `DO` fail-closed; autorización explícita del
  operador antes de aplicar; replay sólo por el mecanismo gobernado (`replayFailedHandlers` con
  `handlerKeys` acotado), nunca SQL sobre postulaciones.
- **Blast radius si falla:** la migración aborta entera (transacción de `node-pg-migrate`); el
  parser sólo relaja un campo opcional y jamás persiste un scheme inseguro.
- **Verificado por:** bloque `DO`, tests del parser (peligrosas → campo `null`), test del anti-join.
- **Riesgo residual:** `http://` se eleva a `https://` sin comprobar que resuelva — un portafolio
  sólo-http quedaría con enlace roto (aceptado: hoy 0 de 247 facets lo tiene).

### Robustness
- **Idempotencia:** `submitPublicHiringApplication` dedupea por `public-apply:<fingerprint>`;
  persona email-first idempotente; `ensureTalentPoolMembership` ON CONFLICT + SELECT. Replay seguro.
- **Atomicidad:** la projection corre en `withGreenhousePostgresTransaction`; la migración es una
  transacción.
- **Carreras:** `UNIQUE (candidate_facet_id)` + `ON CONFLICT DO NOTHING`; la secuencia es
  concurrency-safe por construcción.
- **Constraints:** `UNIQUE (public_id)` se conserva — ahora inalcanzable por recorte.

### Resilience
- **Retry:** consumer `maxRetries: 3` + breaker (5 consecutivos / 50 %, cooldown 30 min).
- **Dead letter:** `outbox_reactive_log.result IN ('retry','dead-letter')`, replayable por handler.
- **Señal:** `sync.reactive.circuit_open` (nueva) + las de outbox existentes.
- **Recuperación:** runbook abajo, íntegramente por caminos gobernados e idempotentes.

### Scalability
- **Hot path:** el anti-join convierte 247 evaluaciones de default por corrida en `k` (facets nuevos);
  O(n) sobre facets activos con índice `UNIQUE (candidate_facet_id)`.
- **Costo a 10×:** lineal; la secuencia crece con las filas reales, no con las corridas.

## Runbook de recuperación (orden obligatorio; requiere autorización del operador)

1. **Aplicar la migración** — `pnpm pg:connect:migrate` (ADC + proxy + migrator). Verificar: el
   `DO` pasó, `pg_sequences.last_value` ≈ 72441, `column_default` apunta a la función.
2. **El cron y el circuito se recuperan solos:** siguiente `ops-hiring-talent-pool-reconcile` (≤ 5
   min; o `gcloud scheduler jobs run … --location=us-east4`) → `CODE 0` y los 17 facets sin
   membership entran; siguiente drain reactivo → probe `half_open` (enfriamiento vencido) → éxito →
   `closed` → las 12 saltadas se proyectan.
3. **Replay de los `retry`** (11 colisión + 2 URL, que seguirán fallando hasta el deploy de la capa 3
   y por eso quedan replayables): `npx tsx scripts/reactive-backfill.ts --replay-failed-handlers
   --handler=growth_hiring_application_from_submission:growth.forms.submission_accepted --dry-run`
   y luego sin `--dry-run`; o `POST /api/admin/ops/replay-reactive` con `{ replayFailedHandlers:
   true, handlerKeys: [<ese handler>] }`. Segunda pasada para las 2 URL **después** del deploy.
4. **Verificar** con la reconciliación por contenido: `sin_postulacion = 0` (las 2 URL, tras el
   deploy). El `MAX(public_id)` sigue en 5 dígitos.
5. **Consecuencia a autorizar:** cada postulación recuperada emite `hiring.application.created` →
   acuse al candidato + alerta interna a People (TASK-1689). Son legítimos (nadie recibió acuse) pero
   llegan tarde; el kill-switch por tipo vive en `email_type_config`.
6. **Opcional:** pausar `ops-hiring-talent-pool-reconcile` hasta que el ops-worker despliegue el
   anti-join, para que el cron viejo no siga quemando secuencia (~71k/día) mientras tanto; el consumer
   crea memberships para las postulaciones nuevas de todos modos.

## Referencias

- `src/lib/hiring/talent-pool/projection.ts:61` · `src/lib/hiring/talent-pool/self-service.ts:37`
- `services/ops-worker/deploy.sh:1341` (job `ops-hiring-talent-pool-reconcile`, TASK-1723)
- Relacionado: `ISSUE-171` (el libro de intake ciego que impidió ver esto desde el dominio)

# Live tests (`*.live.test.ts`) — invariantes operativos para agentes

> **Companion de `CLAUDE.md` (router de dominios, TASK-1160).**
> Establecido el 2026-08-23 (commit `c28e8be`, `fix(test): los live tests dejan de pisarse — cuatro
> causas, no una`).
>
> **Cargar este doc antes de escribir, correr o diagnosticar cualquier `*.live.test.ts`**, y antes de
> tocar `vitest.config.ts`, `scripts/test-live.mjs` o los fixtures de live test.
>
> Fuentes (los comentarios de estos archivos llevan el razonamiento completo; este doc no los
> reemplaza, los indexa):
> `scripts/test-live.mjs` · `vitest.config.ts` · `src/lib/hiring/live-test-identity.ts`.

---

## 0. El hecho que ordena todo lo demás

**Los live tests no corren contra bases efímeras.** Corren contra la **única** instancia Cloud SQL
`efeonce-group:us-east4:greenhouse-pg-dev`, la misma que comparten dev, staging y producción.

Todo lo que sigue —la serialización, el fixture por scope, el pasamanos acotado de variables— es
consecuencia de esa frase. Un live test no es un unit test con conexión: es una escritura sobre una
base compartida con datos reales, hecha desde un proceso que corre en paralelo con otros iguales.

Hoy hay **44 archivos** `*.live.test.ts` (`find src scripts services -name '*.live.test.ts'`).

---

## 1. Comando canónico: `pnpm test:live` — nunca `source .env.local`

```bash
pnpm test:live                                   # los 44 live tests, serializados
pnpm test:live src/lib/hiring/opening-capacity   # filtrados por path
```

`pnpm test:live` (`scripts/test-live.mjs`) hace tres cosas que la vía obvia no hace:

**Pasa sólo acceso a base, nunca comportamiento.** La lista permitida es el prefijo
`GREENHOUSE_POSTGRES_` más `GCP_PROJECT`, `GOOGLE_CLOUD_PROJECT` y `GOOGLE_APPLICATION_CREDENTIALS`
(los tres últimos porque el Cloud SQL Connector los exige para abrir la conexión). Todo lo demás de
`.env.local` se queda afuera.

**Tiene guarda anti-erosión.** Cualquier clave que termine en `_ENABLED` o `_RUN_MODE` se rechaza
aunque alguien amplíe los prefijos permitidos. Sin esa guarda, la lista se ensancha de a poco
—siempre por una razón puntual y razonable— hasta volver a ser `source .env.local` con más pasos.

**Hace preflight TCP del proxy** cuando el host configurado es `127.0.0.1`/`localhost`, y falla con
el comando exacto para levantarlo (ver §4).

### 🔴 NUNCA correr live tests con `set -a; source .env.local; set +a`

Eso exporta las ~85 variables del archivo al proceso de test. Consecuencia **medida**: 15 tests
unitarios rojos, en 6 archivos de 4 dominios distintos (`secrets`, `cloud/billing`,
`cloud/postgres`, `emails`). Ninguno tenía nada que ver con lo que se estaba probando.

La causa no es cada test: todos ellos afirman **comportamientos por defecto** —«nace disabled»,
«reporta unconfigured sin token», «marca la postura como riesgosa»— que sólo son ciertos con el
entorno limpio. El runner estaba filtrando configuración de aplicación hacia un proceso que debe ser
hermético. Arreglarlos uno a uno no escala: la variable siguiente que alguien agregue a `.env.local`
rompe un test nuevo, en un dominio que no tiene relación con quien la agregó.

**Si un live test necesita además un flag, lo declara él en su invocación**
(`MI_FLAG=1 pnpm test:live …`): explícito y local, en vez de ambiental y global.

**Corolario para las aserciones.** Un test que hereda su precondición del entorno es verde o rojo
según cómo se invoque la suite — la peor propiedad que puede tener una aserción. Un test que afirma
«nace disabled» debe **garantizar** esa precondición en `beforeEach`, no heredarla.

---

## 2. Dos proyectos en `vitest.config.ts`: `unit` paralelo, `live` serializado

```
unit → include: src/scripts/services **/*.test.ts(x)|*.spec.ts(x) · exclude: **/*.live.test.ts
live → include: **/*.live.test.ts · fileParallelism: false
```

El paralelismo por archivo de vitest **presupone un aislamiento que en una base compartida no
existe**. Dos archivos que tocan la misma plantilla, la misma vacante o el mismo candidato se pisan,
y el síntoma no es un error claro sino un `..._stale` intermitente que parece flakiness y se
«arregla» con un rerun.

Serializar globalmente (`fileParallelism: false` en la raíz) fue descartado: castigaría a los ~12.000
tests del carril `unit`, que no comparten nada y no tienen por qué pagar el problema de sus vecinos.

Escala sin coordinación: un `*.live.test.ts` nuevo entra al proyecto serializado **por su nombre**,
sin registro que mantener.

### 🔴 NUNCA subir `include` a la raíz de `test`

Heredado desde la raíz, un mismo archivo corre en **los dos** proyectos (verificado: `config.test.ts`
aparecía bajo `unit` y bajo `live`). El `include` vive dentro de cada proyecto.

### 🔴 NUNCA redeclarar `setupFiles` dentro de un proyecto

`extends: true` ya lo hereda de la raíz. Declararlo otra vez lo aplica **dos veces** y MSW revienta
con «Invariant Violation» al hacer `listen()` sobre un server que ya está escuchando.

---

## 3. Fixtures: un sujeto por scope, nunca un pool compartido

```ts
import { resolveLiveTestCandidateFixture, resolveLiveTestCandidateFixtures } from '@/lib/hiring/live-test-identity'

const { profileId, candidateFacetId } = await resolveLiveTestCandidateFixture('attempt-retry')
const [uno, dos] = await resolveLiveTestCandidateFixtures('propose-confirm', 2)
```

Cada archivo deriva su propio sujeto desde un `scope` textual (usa el nombre del archivo de test).
Es determinista —mismo scope, misma fila, así que las corridas repetidas no acumulan basura—,
idempotente bajo concurrencia (`ON CONFLICT DO NOTHING`) y **no necesita coordinación**: un archivo
nuevo elige su scope y queda aislado por construcción.

### 🔴 NUNCA resolver el sujeto de un live test con una consulta sobre un pool compartido

El patrón que esto reemplaza era `… WHERE canonical_email ~* '^(task-…|qa\.careers\+)' AND
data_origin <> 'real' ORDER BY ip.profile_id LIMIT 2` sobre un pool de **3 perfiles**. En paralelo,
tres archivos de assignment-policy tomaban **los mismos dos**, creaban postulaciones sobre el mismo
`candidate_facet` y sus propuestas se invalidaban entre sí: 6 tests rojos con
`assessment_assignment_proposal_stale`. Aislados, los tres pasaban.

Las dos salidas que el síntoma invita son deuda, no arreglo: **serializar** castiga a toda la suite
por un acoplamiento que sigue ahí, y **repartir el pool con `OFFSET`** por índice se rompe con el
cuarto archivo. La causa es el pool compartido sin protocolo de asignación, así que la corrección es
no compartir.

### 🔴 NUNCA anclar un fixture en «el primer perfil activo»

`SELECT profile_id FROM greenhouse_core.identity_profiles WHERE active = true LIMIT 1` sin `ORDER BY`
cae sobre **cualquier persona real** de la base única. Cuando cayó sobre un colaborador activo
(incidente 2026-08-17), `reconcileCandidateFacet` le creó una ficha de candidato, el ops-worker le
materializó una membresía del Banco de Talento y un evento de consentimiento: una persona real quedó
registrada como candidata sin haber postulado ni consentido nada, por pura mecánica de test.

La corrección no es limpiar después: es no tocar a nadie real.

### Propiedades que todo fixture nuevo debe conservar

- **`data_origin = 'smoke_test'` declarado en el nacimiento del dato.** Omitirlo deja el default del
  dominio (`real`, que es el correcto para el dominio) y el sujeto entra al Banco de Talento como
  candidato legítimo.
- **Local-part reconocible**, para que la purga gobernada
  (`pnpm hiring:candidates:purge-test-facets`) lo identifique sin ambigüedad.
- **Dominio de correo según el ciclo que ejercita.** El sujeto compartido usa `.invalid` (RFC 2606).
  Los fixtures por scope usan `…@efeonce.org` a propósito: `resolveRecipientReadiness` bloquea con
  `unverified_recipient` a todo destinatario indeliverable —guarda correcta, que no hay que
  relajar—, así que un fixture en `.invalid` nunca llegaría a `assigned`. El local-part elegido
  además **no matchea** el patrón del pool sembrado, para que ninguna consulta que barra ese pool
  reintroduzca el acoplamiento por la puerta de atrás.
- **Retirar el evento del outbox dentro del propio test** cuando el flujo llega a `assigned`. El
  publisher corre cada 2 minutos sobre esta misma base; esperar al `afterAll` es apostarle al reloj.

---

## 4. Los dos modos de falla que hay que saber reconocer

Estos dos no se parecen a lo que son. Reconocerlos vale más que cualquier otra parte de este doc.

### 4.1 `skipped` se ve exactamente igual que verde

Cada `*.live.test.ts` declara su propio predicado de gating y se auto-salta cuando no hay
credenciales — típicamente `describe.skipIf(!hasPgConfig)` con
`hasPgConfig = Boolean(GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) || Boolean(GREENHOUSE_POSTGRES_HOST)`.
En el resumen de vitest, un archivo saltado no se distingue de uno que pasó.

Consecuencia: **una suite live entera puede no haber ejercitado nada y verse verde.**

- **Lee `passed`, nunca la ausencia de rojo.** «No hay fallos» no es evidencia de nada.
- Por eso `pnpm test:live` **falla fuerte** —antes de arrancar vitest— si faltan
  `GREENHOUSE_POSTGRES_DATABASE`, `GREENHOUSE_POSTGRES_USER` o `GREENHOUSE_POSTGRES_PASSWORD` en
  `.env.local`: un skip silencioso es peor que un rojo.
- No declares un live test como evidencia de verificación sin citar el conteo de tests que
  efectivamente corrieron.

### 4.2 Proxy caído: los tests **pasan** y la suite igual sale **roja**

Sin Cloud SQL Proxy arriba, quien no logra conectarse no es el test sino el **teardown**. La salida
dice `5 passed` y a la vez `1 failed`, con un `ECONNREFUSED 127.0.0.1:15432` colgado del hook. A ojo
se lee como test roto y el diagnóstico arranca en el lugar equivocado. Pasó **dos veces en una sola
sesión**.

Por eso `pnpm test:live` hace preflight TCP y aborta con el comando exacto:

```bash
cloud-sql-proxy "efeonce-group:us-east4:greenhouse-pg-dev" --port 15432
```

**Regla:** ante un rojo en la suite live, verifica el proxy **antes** de leer el nombre del test que
figura como fallado.

---

## 5. Al cerrar: separa lo tuyo del drift ajeno

La suite live comparte base con todos los dominios, así que arrastra fallos que no son del cambio en
curso. Al 2026-08-23 quedaban 3 fallos preexistentes (capabilities de growth/commercial/platform sin
seed, `data_sources` de client-portal de TASK-824, y una aserción propia de TASK-1509), que fallan
también aislados.

- **NUNCA** reportes «la suite live está roja» sin decir cuáles fallos son tuyos. Con serialización,
  un fallo ajeno es **determinista y reproducible aislado** — verifícalo antes de atribuirlo.
- **NUNCA** cierres una task asumiendo que un fallo intermitente es flakiness. Bajo `fileParallelism:
  false` la intermitencia ya no tiene dónde esconderse: si algo sigue siendo intermitente, hay un
  acoplamiento nuevo.
- Cuando un assert de dominio falle, que el mensaje traiga la causa. `expect(x.status).toBe(…)` dice
  «expected blocked to be assigned» y obliga a instrumentar para averiguar por qué;
  `toMatchObject({ status, reasonCode })` trae el `reasonCode` en el propio fallo.

---

## 6. Checklist para un `*.live.test.ts` nuevo

- [ ] El archivo termina en `.live.test.ts` (así entra solo al proyecto serializado).
- [ ] Su sujeto sale de `resolveLiveTestCandidateFixture(scope)` con un scope propio, o de un fixture
      igualmente aislado del dominio. Ninguna consulta a un pool compartido.
- [ ] Todo dato que cree declara su procedencia sintética en el INSERT, no después.
- [ ] No hereda precondiciones del entorno: las garantiza en `beforeEach`.
- [ ] Si el flujo emite outbox, el test lo retira antes de terminar.
- [ ] Verificado con `pnpm test:live <path>` y **leyendo el conteo de `passed`**, no la ausencia de
      rojo.

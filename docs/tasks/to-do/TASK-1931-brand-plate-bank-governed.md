# TASK-1931 — Banco de plates gobernado para las recetas del deck «La órbita»

## Delta 2026-09-29 — TASK-1942 suma tres plates por ruta local y un plate rechazado

- El deck de práctica Salesforce usa **`NXSF1`** (propuesta cine), **`NXSF2`** (portada) y **`NXSF3`** bordada
  (contraportada), por ruta local en `ai-generations/2026-09-29_deck-salesforce/plates/` y declarados por `plateRef` en
  los planes golden. Son candidatos a sembrar en el banco; hasta entonces, el Job `artifact-worker` no los lee y las
  recetas con foto de ese deck heredan el bloqueo en productivo. Fichas: `ai-generations/2026-09-29_deck-salesforce/fichas/`.
- **El plate SF1 de la arquitecta (`plates/SF1-una-operacion*.png`) está RECHAZADO** (rostro y piel deformados, sin
  identidad): no entra al banco ni a ninguna receta.

## Delta 2026-09-28 — TASK-1934 suma el plate SE1 y nueve recetas SEO/AEO

- TASK-1934 lleva al catálogo las nueve láminas SEO/AEO aprobadas por el operador el 2026-09-28: el catálogo pasa de 69
  a **78 recetas**. La siembra de esta task cubre las 78, no las 69.
- Plate nuevo a sembrar: **SE1** (`ai-generations/2026-09-28_deck-seo-aeo/plates/SE1-te-encuentran-isotipo.png`, ficha
  `fichas/SE1-te-encuentran.json`, prompt `prompts/SE1-te-encuentran.txt`, registro de `foto:isotipo`
  `plates/SE1-te-encuentran-isotipo.json`). Lo usan dos recetas que son alternativas y nunca van juntas: la propuesta SEO
  sobria (lente) y la cine (`proposal-cinematic` layout `service`). Registro cine dentro de su alcance
  (`proposal-cinematic` y, desde AXIS 0.3.22, la lente de `proposal-service`).
- Mientras el banco no exista, TASK-1934 deja SE1 declarado por ruta local en `photo.plate`, igual que las 69; no sube
  ni registra nada fuera de este banco.
- Estado al cierre de TASK-1934: SE1 sigue por ruta local (el banco no existe). Lo usan `proposal-service-seo` (en la
  lente, recortado hacia el estratega con `photo.focus`; AXIS 0.3.22 admite plate cine en la lente de `proposal-service`)
  y `proposal-cinematic-seo` (a sangre). Son variantes (`variant-both-in-deck`): nunca van juntas, así que no chocan con
  `plate-repeated`. Las siete láminas nuevas no usan plate (íconos y logos van como assets `file`/`logo` del repo).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content|platform|data`
- Blocked by: `none` (el Slice 5, alta de plates nuevos generados, espera TASK-1926)
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cada receta con foto del deck «La órbita» declara un plate aprobado (`photo.plate` en el catálogo), pero ese plate es
un archivo local en `ai-generations/`, fuera de git, sin registro de quién lo aprobó ni con qué procedencia. Esta task
crea el banco de plates gobernado: un registro append-only en PostgreSQL con sha256, ficha, procedencia de
`foto:emblema`/`foto:isotipo`, aprobación de una persona y el asset privado en el store canónico; un resolver que
**reutiliza primero** el plate aprobado de la receta y excluye los ya usados en el deck; la siembra de los plates que
declaran las 69 recetas; y el alta de plates nuevos sólo desde `pnpm foto:generar` con procedencia completa. El render
productivo (TASK-1921, TASK-1932) consume plates por `assetId`, nunca por ruta local.

## Why This Task Exists

- **Los plates aprobados no existen para producción.** El CLI local los lee como data URI desde `ai-generations/`; el
  Job `artifact-worker` no tiene ese disco. TASK-1921 ya decidió que los plates se referencian por asset subido por el
  uploader canónico, pero nadie es dueño de subirlos, registrarlos ni decir cuál es el aprobado.
- **Sin banco, cada deck regenera.** Generar cuesta y no es idempotente hoy (gap de TASK-1926). La regla del operador es
  reutilizar primero un plate aprobado por receta; sin registro, «reutilizar» significa buscar archivos a mano.
- **La procedencia está incompleta y dispersa.** Pendientes de QA del catálogo: plates `b` (NX6b, CR2b, WB1b, RV1b,
  BR2b…) sin registro de procedencia de `foto:isotipo`; HW1, T2, T3, H2 y LN4 sin isotipo compuesto; P1 repetido en
  cuatro recetas. Un plate sin procedencia no debería poder entrar a una pieza que se entrega.
- **La migración al taller lo vuelve urgente.** TASK-1925 moverá el pipeline y las corridas a
  `efeonce-brand-workshop`, con binarios por sha256 en GCS. Si el registro no se ancla por sha256 hoy, la migración
  rompe el vínculo receta ↔ plate.

## Goal

- Un registro gobernado de plates aprobados, append-only, anclado por sha256 y con aprobación humana registrada.
- `resolvePlateForRecipe` devuelve el plate aprobado de una receta (o `none` con motivo), excluyendo los ya usados en el
  deck, y el render lo consume por `assetId`.
- Los plates que declaran las 69 recetas están sembrados: aprobados si su procedencia está completa, pendientes si no.
- Un plate nuevo sólo entra desde `pnpm foto:generar` con ficha, emblema e isotipo registrados y la firma de una persona.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` (migraciones, marker `-- Up Migration`, bloque DO)
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` (capability + grant en el mismo PR)
- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` (generación canónica; nada de scripts ad hoc)
- `docs/architecture/GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md` (assets que el Job consume)
- `docs/operations/brand-photography/README.md` y `EFEONCE_PHOTO_REGISTER_CINE_V1.md` (fichas, registro cine,
  excepción de secciones y «about»)
- `docs/operations/EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md` (isotipo compuesto, nunca el del modelo)
- `docs/operations/brand-graphic-line/deck-recipes/README.md` (campo `photo` de cada receta y pendientes de QA)
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- **El banco no genera.** La generación es `pnpm foto:generar` (idempotente por TASK-1926); el banco registra y
  resuelve.
- **Un agente propone, una persona aprueba.** El registro acepta `pending` desde un agente o un script; `approved` sólo
  con un actor `member` humano (lo exige el command y la base).
- **Append-only.** Un plate nunca se edita ni se borra: se retira (`retired`) o se supersede con una fila nueva.
- **Anclado por sha256.** La identidad del binario es su huella; la ruta local es sólo un dato de origen.
- **Procedencia completa o no hay aprobación:** ficha, sha256 de la ficha, modelo y proveedor, `foto:emblema` aprobado
  cuando hay ropa con isotipo y registro de `foto:isotipo` cuando se compuso.
- Binarios en el bucket privado por el uploader canónico (`storeSystemGeneratedPrivateAsset` o el vigente); nunca en
  git ni en un bucket público.

## Normative Docs

- `docs/tasks/to-do/TASK-1926-cine-register-idempotent-photo-pipeline.md` (generación idempotente, isotipo declarativo)
- `docs/tasks/to-do/TASK-1925-brand-workshop-migration.md` (binarios por sha256 en el taller)
- `docs/tasks/in-progress/TASK-1921-brand-surface-pieces-governed-production-route.md` (plates por `assetId`)
- `scripts/foto/assets-lock.mjs` y `scripts/foto/aprobadores.json` (patrón vigente de sellado por sha256 y lista de
  aprobadores del compositor)

## Dependencies & Impact

### Depends on

- `greenhouse_core.assets` y `src/lib/storage/greenhouse-assets.ts` (bucket privado, `storeSystemGeneratedPrivateAsset`,
  `findAssetByContentHash`).
- Catálogo generado de recetas de TASK-1929 para mapear receta → plate `[verificar]` (si 1929 no cerró, la siembra lee
  el JSON en el script de siembra, nunca en runtime).
- `TASK-1926` sólo para el Slice 5 (alta de plates nuevos generados con procedencia).
- `scripts/foto/generar.mjs`, `scripts/foto/emblema.mjs`, `scripts/foto/isotipo.mjs`.

### Blocks / Impacts

- `TASK-1921`: su consumer recibe plates por `assetId` resueltos por este banco.
- `TASK-1932`: la salida desde Proposal Studio elige plates con `resolvePlateForRecipe`.
- `TASK-1929`: `plate-repeated` usa el id de plate del banco cuando el plan lo trae.
- `TASK-1925`: la migración conserva el vínculo porque el banco se ancla por sha256.
- `TASK-1928`: los intents de ejemplo siguen con plates de fixture; no dependen del banco.

### Files owned

- `migrations/<timestamp>_task-1931-brand-plate-bank.sql` `[nuevo]`
- `src/lib/brand-surfaces/plates/store.ts`, `resolve.ts`, `commands.ts`, `types.ts`, `index.ts` `[nuevos]`
- `src/lib/brand-surfaces/plates/__tests__/**` `[nuevos]`
- `src/config/entitlements-catalog.ts` y `src/lib/entitlements/runtime.ts` (capabilities y grants)
- `scripts/foto/banco.mjs` `[nuevo]` y el script `foto:banco` en `package.json`
- `src/types/db.d.ts` (regenerado)
- `docs/operations/brand-photography/README.md` (sección del banco)
- `docs/manual-de-uso/creative/banco-de-plates.md` `[nuevo]`
- `docs/documentation/creative/linea-grafica-efeonce.md` (delta funcional)
- `docs/architecture/GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md` (delta: plates por `assetId` desde el banco)

## Current Repo State

### Already exists

- 69 recetas con `photo.plate` (ruta local en `ai-generations/`), ficha, prompt compilado y post-proceso declarados.
- Store canónico de assets privados con deduplicación por hash (`findAssetByContentHash`) y alta de assets generados
  por sistema (`storeSystemGeneratedPrivateAsset`).
- Sellado por sha256 de los assets de referencia (`pnpm foto:assets:lock`, `scripts/foto/assets.lock.json`) y lista de
  aprobadores del compositor (`scripts/foto/aprobadores.json`).
- `pnpm foto:generar`, `foto:emblema`, `foto:isotipo` (este último completo por TASK-1920).

### Gap

- No hay registro de plates aprobados ni vínculo receta ↔ plate fuera del JSON.
- Ningún plate de receta está en el store canónico; el Job no puede leerlos.
- No hay resolver «reutiliza primero» ni exclusión de plates ya usados en un deck.
- La procedencia de isotipos de varios plates no está registrada en ninguna parte consultable.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/brand-surfaces/plates/` (store, commands y resolver), `scripts/foto/banco.mjs` (CLI de siembra y alta), tabla nueva en PostgreSQL
- Future candidate home: `domain-package`
- Boundary: `registerPlate` (agente o script → `pending`), `approvePlate` y `retirePlate` (sólo persona) son los únicos escritores; `resolvePlateForRecipe` y `listPlates` son los readers; el consumer del `artifact-worker` y los commands de TASK-1921/TASK-1932 sólo leen
- Server/browser split: sólo server; store, credenciales del bucket y lectura de binarios nunca llegan al browser
- Build impact: sin dependencias nuevas; el CLI usa Node y los módulos de `scripts/foto`; el runtime importa sólo el reader
- Extraction blocker: la tabla vive en el PostgreSQL compartido y los binarios en el bucket privado del portal; el taller (TASK-1925) escribe por el command, no por SQL

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration`
- Source of truth afectado: tabla nueva de plates de marca (nombre propuesto `greenhouse_core.brand_plates`,
  `[verificar]` schema dueño en el plan) + `greenhouse_core.assets` para los binarios
- Consumidores afectados: consumer del `artifact-worker` (TASK-1921/TASK-1932), commands de render, CLI `foto:banco`,
  futura migración al taller (TASK-1925)
- Runtime target: `local` (siembra), `staging` y `production` (lectura por el Job y los commands)

### Contract surface

- Contrato existente a respetar: `storeSystemGeneratedPrivateAsset`/`findAssetByContentHash`, `canonicalErrorResponse`,
  catálogo de recetas (TASK-1929), ficha de `foto:prompt`
- Contrato nuevo o modificado: `registerPlate`, `approvePlate`, `retirePlate`, `resolvePlateForRecipe`, `listPlates`;
  CLI `pnpm foto:banco -- --sync|--register|--approve|--check`
- Backward compatibility: `compatible` — tabla nueva y aditiva; el CLI local de composición sigue leyendo plates
  locales hasta que TASK-1921/TASK-1932 lo reemplacen en runtime
- Full API parity: commands y readers en `src/lib`; CLI hoy; API y MCP cuando TASK-1921 fije el dominio dueño (mismo
  command, sin lógica nueva)

### Data model and invariants

- Entidades/tablas/views afectadas: tabla nueva de plates con `plate_id` estable (código de la ficha, p. ej. `BR1b`),
  `sha256`, `asset_id` (FK `greenhouse_core.assets`), `recipe_ids text[]`, `register` (`cine`, `documental`, …),
  `ficha_ref` y `ficha_sha256`, `provenance jsonb` (modelo, proveedor, sha del prompt, costo, emblema, isotipo),
  `status` (`pending`, `approved`, `retired`), `approved_by_member_id`, `approved_at`, `superseded_by`, `created_by`
- Invariantes que no se pueden romper:
  - `sha256` único; el mismo binario nunca entra dos veces.
  - `approved` exige `approved_by_member_id` no nulo (CHECK en la base, además del command).
  - `approved` exige procedencia completa (emblema cuando la ficha declara ropa con isotipo; registro de isotipo cuando
    se compuso).
  - La tabla es append-only: trigger anti-UPDATE de campos inmutables y anti-DELETE; los cambios son transiciones de
    `status` o filas nuevas que superseden.
  - `resolvePlateForRecipe` nunca devuelve un plate `pending` o `retired`.
- Write-target allowlist: declarar la tabla en el allowlist de destinos del dominio si existe boundary test; si no,
  dejar la justificación en la migración
- Tenant/space boundary: plates de marca propia de Efeonce (`EO-ORG-0007`) con `owner_org_id` NOT NULL; un plate de
  cliente (caso real) queda para el follow-up
- Idempotency/concurrency: clave natural `sha256`; `registerPlate` con el mismo sha devuelve la fila existente; la
  siembra es re-ejecutable sin duplicar
- Audit/outbox/history: eventos outbox al registrar, aprobar y retirar (catálogo de eventos); historial por transición

### Migration, backfill and rollout

- Migration posture: `additive` (tabla nueva, CHECKs, triggers append-only y bloque DO de verificación)
- Default state: tabla vacía; el resolver devuelve `none` hasta la siembra; ningún runtime depende del banco hasta
  TASK-1921/TASK-1932
- Backfill plan: siembra por `pnpm foto:banco -- --sync --dry-run` (lista qué subiría y con qué estado) y luego
  `--apply`; sube cada plate declarado por las recetas al bucket privado y lo registra `pending`; una persona aprueba
  los que tienen procedencia completa
- Rollback path: la tabla aditiva puede quedar; si hace falta, migración `down` verificada; los assets subidos quedan
  en el bucket privado sin referencia (el store ya maneja retención)
- External coordination: aprobación del operador de la lista de plates a sembrar; permisos del bucket privado para la
  cuenta que corre la siembra

### Security and access

- Auth/access gate: capabilities nuevas propuestas `brand.plate.read`, `brand.plate.register` y `brand.plate.approve`
  con grant a `designer` y `efeonce_admin` (`[verificar]` roles finales con el operador); `approve` exige actor humano
- Sensitive data posture: fotos de marca propia con personas del equipo (derechos de imagen de colaboradores); sin PII
  en la procedencia salvo el member que aprueba
- Error contract: `canonicalErrorResponse` cuando exista endpoint; en el command, errores tipados (`plate-duplicate`,
  `provenance-incomplete`, `approver-not-human`, `plate-not-found`); `captureWithDomain`
- Abuse/rate-limit posture: siembra en lotes acotados; la subida deduplica por hash

### Runtime evidence

- Local checks: tests de store, commands y resolver (duplicado por sha, aprobación sin humano, procedencia incompleta,
  exclusión de plates usados, append-only)
- DB/runtime checks: `pnpm migrate:up` + verificación en `information_schema`/`pg_constraint`/`pg_trigger`; siembra
  dry-run y apply contra la instancia compartida con conteo esperado
- Integration checks: el asset de un plate sembrado se descarga por el reader del store y su sha coincide
- Reliability signals/logs: señal de plates referenciados por recetas sin plate aprobado (steady = cantidad declarada
  pendiente) `[verificar]` si amerita señal o basta el `--check`
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

### Capability Definition of Done — Full API Parity gate

- [ ] **Lógica en el primitive, no en la UI.** Commands y reader en `src/lib/brand-surfaces/plates/`.
- [ ] **Modelada como aggregate/recurso/command, no como click-handler.**
- [ ] **Read** como reader canónico; **write** con authorization fina, idempotencia por sha, audit/outbox, errores tipados y observabilidad.
- [ ] **Capability + grant en el MISMO PR** con coverage test.
- [ ] **Camino programático declarado:** CLI `pnpm foto:banco` + follow-up explícito en TASK-1921 para API y MCP con el dominio dueño.
- [ ] **Write apto para `propose → confirm → execute`:** un agente registra `pending` (propose) y una persona aprueba (confirm).
- [ ] **Un primitive, muchos consumers:** CLI, consumer del Job y commands de TASK-1921/TASK-1932 usan el mismo reader y commands.
- [ ] **Parity check = SÍ** una vez que TASK-1921 exponga el endpoint.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Tabla del banco

- Migración con `-- Up Migration`, tabla, índice único por `sha256`, CHECK de `approved` con aprobador, triggers
  append-only, bloque DO que aborta si falta cualquier objeto, GRANTs a `greenhouse_runtime`; `pnpm db:generate-types`.

### Slice 2 — Commands, reader y capabilities

- `registerPlate` (idempotente por sha, `pending`), `approvePlate` (actor `member`, procedencia completa),
  `retirePlate`, `resolvePlateForRecipe(recipeId, { exclude })`, `listPlates`; outbox por transición.
- Capabilities en `capabilities_registry` + `entitlements-catalog.ts` y grant a roles reales en `runtime.ts`, con
  coverage test.

### Slice 3 — Siembra de los plates de las 69 recetas

- `pnpm foto:banco -- --sync --dry-run|--apply`: lee `photo.plate` de cada receta, calcula sha256, sube al bucket
  privado por el uploader canónico (deduplica por hash), registra `pending` con la procedencia disponible y el vínculo a
  sus recetas; reporta los plates sin procedencia completa.
- P1 queda registrado una vez con sus cuatro recetas (el banco no decide qué lámina lo usa; el validador de TASK-1929
  impide repetirlo en un deck).

### Slice 4 — Aprobación de los sembrados

- `pnpm foto:banco -- --approve <plateId>` por una persona, sólo sobre plates con procedencia completa; los plates con
  pendientes de QA de isotipo (NX6b, CR2b, WB1b, RV1b, BR2b…; HW1, T2, T3, H2, LN4) quedan `pending` hasta que
  TASK-1926 registre su procedencia.

### Slice 5 — Alta de plates nuevos (espera TASK-1926)

- `foto:generar` (idempotente por TASK-1926) deja el plate y su procedencia; `pnpm foto:banco -- --register` lo registra
  `pending` con la ficha y los resultados de `foto:emblema`/`foto:isotipo`; la aprobación sigue el Slice 4.

### Slice 6 — Documentación

- README de fotografía (sección del banco), manual nuevo `banco-de-plates.md`, doc funcional y delta en la arquitectura
  del render pipeline.

## Out of Scope

- Generar o regenerar plates (incluidos los de «about» sin velo): TASK-1926.
- Mover el pipeline o las corridas al taller: TASK-1925.
- Endpoint, tool MCP y consumer del `artifact-worker`: TASK-1921 (el banco entrega el reader que esos consumen).
- Plates de clientes (fotos reales de un caso): follow-up.
- Subir plates al banco fotográfico de AXIS: follow-up de TASK-1926.

## Detailed Spec

**Resolver.** `resolvePlateForRecipe(recipeId, { exclude: plateId[] })` → `{ plate, assetId, sha256, provenance }` o
`{ none: true, reason: 'no-approved-plate' | 'all-used-in-deck' }`. Orden: plate aprobado declarado por la receta; si
hay más de uno, el más reciente no retirado. Nunca genera ni sugiere generar: eso lo decide una persona.

**Procedencia mínima para aprobar:** `ficha_ref` y `ficha_sha256`; modelo y proveedor; sha del prompt compilado;
`emblema: { verdict, checkedAt }` cuando la ficha declara prenda con isotipo; `isotipo: { boxes, sourceSha }` cuando
se compuso; registro (`cine` sólo dentro de su alcance: Nexa protagonista, `proposal-cinematic` y la excepción de
secciones y «about»).

**Vínculo con el taller.** El banco guarda `sha256`; cuando TASK-1925 mueva las corridas, el binario del taller y el
del bucket privado se reconocen por la misma huella.

## Rollout Plan & Risk Matrix

Tabla nueva, aditiva, sin consumer productivo hasta TASK-1921/TASK-1932. El riesgo real está en la siembra (subir
binarios y registrar procedencia correcta) y en no aprobar plates con procedencia incompleta.

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4. Slice 5 sólo con TASK-1926 cerrada. Slice 6 al cierre.
- Slice 2 (capabilities + grant) MUST ir en el mismo PR que los commands: sin grant, el coverage test rompe.
- La siembra `--apply` sólo después de un `--dry-run` revisado por el operador.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| La migración se registra sin ejecutar el SQL | migración | low | marker `-- Up Migration` + bloque DO con `RAISE EXCEPTION` | verificación en `information_schema` |
| Se aprueba un plate con isotipo del modelo o sin emblema | marca / legal | medium | CHECK + command exigen procedencia completa y aprobador humano | `provenance-incomplete` |
| La siembra sube binarios duplicados o a un bucket público | storage | low | uploader canónico al bucket privado con dedupe por hash | conteo de assets por hash |
| Un plate retirado sigue saliendo en decks | render | low | el resolver filtra `approved`; test | test rojo |
| La migración al taller rompe el vínculo | taller | medium | ancla por sha256; nota en TASK-1925 | plates sin asset tras la migración |

### Feature flags / cutover

Sin flag propio: la tabla y el resolver no tienen consumer productivo hasta TASK-1921/TASK-1932, que gobiernan su
encendido con sus flags. El cutover de la siembra es manual y revisado (`--dry-run` → `--apply`).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | la tabla aditiva puede quedar; si hace falta, migración `down` verificada en la instancia compartida | minutos | sí |
| Slice 2 | revert PR (capabilities y grants salen juntos) | minutos | sí |
| Slice 3 | `retirePlate` de lo sembrado; los assets quedan sin referencia en el bucket privado | minutos | parcial (la fila queda como historia) |
| Slice 4 | `retirePlate` del aprobado por error | minutos | parcial (append-only) |
| Slice 5 | revert del CLI de alta | minutos | sí |
| Slice 6 | revert de docs | minutos | sí |

### Production verification sequence

1. `pnpm migrate:up` en la instancia compartida + verificación de tabla, índice, CHECKs y triggers.
2. Tests focales y coverage de capabilities en verde.
3. `pnpm foto:banco -- --sync --dry-run` revisado por el operador; `--apply`; conteo de filas `pending` igual al de
   plates declarados.
4. Aprobación por persona de los plates con procedencia completa; `resolvePlateForRecipe` devuelve `assetId` para esas
   recetas y `none` para las pendientes.
5. Descarga de un asset sembrado por el reader del store con sha coincidente.

### Out-of-band coordination required

- El operador revisa la lista de siembra y aprueba plates (la aprobación es humana por diseño).
- Consentimiento de uso de imagen de las personas del equipo que aparecen en plates, si Legal lo exige
  (`legal-privacy-ip-operator`).
- Coordinación con la sesión de TASK-1925 para que la migración conserve la huella.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La tabla del banco existe con índice único por `sha256`, CHECK de aprobador en `approved`, triggers append-only y bloque DO de verificación, y `src/types/db.d.ts` está regenerado.
- [ ] `registerPlate` es idempotente por sha256 (test) y deja el plate `pending`.
- [ ] `approvePlate` rechaza un actor no humano y una procedencia incompleta (tests).
- [ ] `resolvePlateForRecipe` nunca devuelve `pending` ni `retired` y excluye los plates ya usados en el deck (tests).
- [ ] Las capabilities del banco están en `capabilities_registry` y `entitlements-catalog.ts`, con grant a al menos un rol real y coverage test en verde.
- [ ] La siembra corrió en dry-run y apply: cada plate declarado por las 69 recetas está en el bucket privado y registrado, con el conteo en el cierre.
- [ ] (Delta 2026-09-28, TASK-1934) La siembra cubre las 78 recetas e incluye SE1 con su ficha, su sha256 y el registro de `foto:isotipo`; queda `pending` hasta que una persona lo apruebe.
- [ ] Los plates con procedencia completa quedaron aprobados por una persona; los de los pendientes de QA de isotipo quedaron `pending` con motivo.
- [ ] Un asset sembrado se descarga por el reader del store y su sha coincide con el registrado.
- [ ] Manual `banco-de-plates.md`, README de fotografía, doc funcional y delta de arquitectura publicados.

## Verification

- `pnpm local:check`
- `pnpm typecheck`
- `pnpm test` (completo al cierre; focal `src/lib/brand-surfaces/plates`)
- `pnpm migrate:up` + verificación en `information_schema`, `pg_constraint` y `pg_trigger`
- `pnpm foto:banco -- --sync --dry-run` y `--apply`; `pnpm foto:banco -- --check`
- `pnpm build` — sólo con autorización del operador

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `## Delta` en TASK-1921, TASK-1925, TASK-1926 y TASK-1932 con la firma del resolver y el ancla por sha256

## Follow-ups

- API y tool MCP del banco cuando TASK-1921 fije el dominio dueño.
- Plates de clientes (fotos reales de casos) con autorización de uso.
- Publicar los plates aprobados en el banco fotográfico de AXIS (follow-up de TASK-1926).

## Open Questions

- ¿El banco vive en `greenhouse_core` o en el schema del dominio de marca que decida TASK-1921? El plan lo fija antes de
  la migración.
- ¿La aprobación de plates reusa la lista `scripts/foto/aprobadores.json` como allowlist adicional al actor `member`, o
  basta con la capability `brand.plate.approve`?

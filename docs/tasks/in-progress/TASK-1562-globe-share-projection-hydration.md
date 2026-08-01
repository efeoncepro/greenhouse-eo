> # ⚠️ TASK-1562 — DUEÑO REAL: TASK-1522 (Globe Review, Comments and Read-only Share Foundation)
>
> Esta task se creó sin ver que ese dominio ya tenía dueña. **No se retira porque su código YA SHIPPEÓ** y varios
> commits la referencian: retirarla dejaría esas referencias huérfanas. Queda como **registro de lo que se
> entregó**; la spec del dominio es de la task dueña, y ahí está el puntero a lo que aquí se construyó.
>
> Regla que sale de esto: antes de crear una task, barrer el registry por el DOMINIO, no por el nombre que se le
> quiere dar al trabajo. "Feed + viewer sobre el payload cliente" y "Resilient Feed and Viewer" son la misma
> superficie con dos nombres.

# TASK-1562 — Hidratación de la proyección del share board de Globe

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `api`
- Epic: `EPIC-028`
- Status real: `Slices 1-2 implementados y desplegados (85dac33b03b1); Slice 3 decidido a la baja; falta resolve con grant real`
- Rank: `TBD`
- Domain: `creative-studio`
- Blocked by: `none`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- GitHub Issue: `TBD`

## Summary

El share board de Globe muestra **tres hechos que nunca llegan**. El grant los pide, el dominio los
proyecta y el operador puede crearlos — pero `resolveForShare` devuelve sólo `{ target, mediaType }`, así
que `modelLabel`, `reviewStatus` y `comments` se descartan en silencio en **todos** los shares de
producción. Esta task los hidrata.

## Why This Task Exists

Descubierto verificando `TASK-1558` contra el runtime, no leyendo la spec. La cadena tiene cuatro
eslabones y el cuarto está cortado:

| Eslabón | Estado | Evidencia |
|---|---|---|
| El operador crea comentarios | ✅ existe | `producer-controller.ts:4117` → `globe.producer.review.comment.create` |
| El grant pide los cuatro fields | ✅ existe | `producer-controller.ts:4137` → `fields: ['media-preview','model-label','review-status','comments']` |
| El dominio proyecta según fields | ✅ existe | `project()` en `packages/domain/src/creative-review.ts:150` |
| **La autoridad entrega los datos** | 🔴 **no** | `createCreativeReviewAssetAuthority.resolveForShare` (`apps/studio-web/src/app.ts:2525`) devuelve `{ target, mediaType }` |

`project()` exige **dos** condiciones: que el field esté en el grant **y** que `source.<field> !== undefined`.
El grant cumple la primera; la autoridad nunca cumple la segunda. Nada falla, nada loggea: el panel
simplemente sale vacío.

Consecuencia visible hoy: en la superficie reconstruida por `TASK-1558` el cliente lee
"Sin dato / Sin dato / *fecha*" y "Todavía no hay comentarios en esta revisión" en **todo** share real. Es
honesto —la ausencia se declara en vez de ocultar la fila— pero el panel no tiene nada que mostrar, y la
mitad derecha de la única cara comercial de Globe queda estructuralmente en blanco.

**Por qué es una task aparte y no un fix dentro de `TASK-1558`:** esa task declara `Backend impact: none` y
su `Out of Scope` prohíbe explícitamente tocar el BFF o la API privada. Meter esto ahí habría sido
exactamente el scope creep que esa frontera existe para frenar.

## Goal

- `resolveForShare` entrega `modelLabel`, `reviewStatus` y `comments` cuando el grant los autoriza.
- Los comentarios borrados **nunca** salen a audiencia `client`.
- El orden y el tope de comentarios quedan declarados, no emergentes.
- La decisión sobre el autor queda tomada y documentada (hoy el contrato no lo transporta).
- El share board de `TASK-1558` muestra datos reales sin cambiar una línea de su UI.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md` — ADR-003:
  el **nombre** del modelo es público para audiencia `client`; el **slug** del proveedor, el costo vendor y
  el margen **nunca** salen.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_PRODUCER_HUMAN_EXECUTION_DECISION_V1.md` — ADR-005 §3/§4:
  la autoridad se re-verifica server-side por request; el browser nunca recibe credencial de workload.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md` — ADR-014: el payload
  cliente consume contratos existentes; esta task **amplía la fuente**, no el contrato de transporte.
- `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md` §209-215 — qué nunca se
  muestra a un cliente.

Reglas obligatorias:

- **NUNCA** ampliar `CreativeShareBoardV1` para incluir un campo que ADR-003 prohíbe (slug, costo, margen).
- **NUNCA** exponer un `principalId` interno como autor: es un identificador de identidad interna.
- **NUNCA** devolver un comentario con `deletedAt` a audiencia `client`.
- **NUNCA** mover la resolución de propiedad: `resolveForShare` sigue usando la misma autoridad de
  `TASK-1503` (`authorizeOwnedOutput`); esta task **agrega** lectura, no cambia quién puede ver qué.
- **NUNCA** hacer que un fallo al leer el hilo tumbe el share: el activo debe seguir sirviéndose.

## Normative Docs

- `packages/domain/src/creative-review.ts` — `CreativeShareSourceV1`, `project()`, `authorizeReadOnlyShare`.
- `packages/contracts/src/creative-review.ts:62` — `CreativeShareBoardV1`, la forma que ve el browser.
- `docs/ui/wireframes/TASK-1558-globe-share-board.md` §Contrato de datos y confidencialidad — la tabla de
  qué se muestra y qué nunca.

## Dependencies & Impact

### Depends on

- **`TASK-1522`** (complete): el store durable de review, `getThread`, y los commands de comentario.
- **`TASK-1503`**: `authorizeOwnedOutput`, la autoridad de propiedad que esta task reusa sin tocar.

### Blocks / Impacts

- **Desbloquea el valor de `TASK-1558`**: su panel deja de estar estructuralmente vacío. La UI **no
  cambia** — ya renderiza los tres hechos y la lista de comentarios, y ya declara la ausencia con "Sin dato".
- Habilita `TASK-1563` (menciones): sin proyección de comentarios, una mención nunca llegaría al cliente.
- Toca `apps/studio-web/src/app.ts`, que `TASK-1558` también modificó (rama del flag). Coordinar.

### Files owned

En `efeonce-globe`:

- `apps/studio-web/src/app.ts` (sólo `createCreativeReviewAssetAuthority`)
- `packages/domain/src/creative-review.ts` (si el filtro de borrados vive en el dominio)
- `apps/studio-web/src/creative-review-runtime.test.ts` (cobertura)

## Current Repo State

### Already exists

- `store.getThread(workspaceId, target)` → `CreativeReviewThreadV1` con `comments` y `decision`.
- `CreativeShareSourceV1` ya declara `modelLabel?`, `reviewStatus?` y `comments?` — el tipo está listo.
- `project()` ya gatea por `fields` del grant.
- El share board de `TASK-1558` ya renderiza los tres hechos y la lista, con ausencia explícita.

### Gap

- `resolveForShare` no lee el hilo ni el label del modelo.
- No hay filtro declarado de comentarios borrados en el path de share.
- No hay orden ni tope declarados para la audiencia `client`.
- `CreativeShareSourceV1.comments` es `{ body, createdAt }`: no hay autor, y `CreativeReviewCommentV1.authorId`
  es un principal interno que no puede salir crudo.
- `[verificar]` de dónde sale el `modelLabel` para un output: probablemente de la metadata del asset o del
  registro de la ruta/modelo. Confirmar en Discovery antes de asumir la fuente.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `efeonce-globe/apps/studio-web` (adapter de autoridad) + `packages/domain` (proyección).
  En Greenhouse sólo doc gobernante.
- Future candidate home: `remain-shared`
- Boundary: el reader canónico sigue siendo `authorizeReadOnlyShare`; el adapter implementa
  `CreativeReviewAssetAuthorityPort` y nada más.
- Server/browser split: la lectura del hilo y del label es **server-only**; el browser recibe la proyección
  ya filtrada y no puede ampliarla.
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: `greenhouse`/Globe review store (`getThread`) + metadata del output para el label
  `[verificar la fuente exacta en Discovery]`
- Consumidores afectados: el share board (`TASK-1558`) y cualquier consumer futuro de `/v1/shares/resolve`
- Runtime target: `staging` → `production` (internal-only hoy por gate `TASK-1480`)

### Contract surface

- Contrato existente a respetar: `CreativeShareBoardV1` (`packages/contracts/src/creative-review.ts:62`),
  `GET /v1/shares/resolve`, y el gating por `fields` del grant.
- Contrato nuevo o modificado: **ninguno**. El shape del payload no cambia; se puebla lo que ya declara
  como opcional.
- Backward compatibility: `compatible`. Un consumer que hoy no ve `comments` empieza a verlos; ninguno
  rompe, porque los campos ya eran opcionales.
- Full API parity: la UI no gana lógica. `authorizeReadOnlyShare` sigue siendo el único reader del share y
  el browser sigue recibiendo una proyección que no puede ampliar.

### Data model and invariants

- Entidades/tablas/views afectadas: el store de review (comentarios + decisión) y la metadata del output.
- Invariantes que no se pueden romper:
  - un comentario con `deletedAt` **nunca** sale a audiencia `client`;
  - un field ausente del grant **nunca** se proyecta, aunque la fuente lo tenga;
  - el `principalId` del autor **nunca** cruza al browser;
  - un fallo al leer el hilo **degrada** el hilo, no el share: el activo se sigue sirviendo;
  - el `slug` del proveedor, el costo vendor y el margen no aparecen en ninguna variante del label.
- Tenant/space boundary: `resolveShare` ya resuelve `workspaceId` desde el grant; la lectura del hilo usa
  **ese** `workspaceId` y nunca uno derivado del request.
- Idempotency/concurrency: lectura pura, sin escritura. Sin idempotency key.
- Audit/outbox/history: `none` — es un read path. El acceso al share ya queda en el log del request.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale` — es un read path additive sobre datos que el grant ya autoriza;
  no hay estado nuevo que gatear, y dejarlo detrás de un flag agregaría una palanca sin riesgo que cubrir.
- Backfill plan: `N/A` — no persiste nada.
- Rollback path: `revert PR + redeploy`. El share vuelve a proyectar sólo el activo.
- External coordination: `none`.

### Security and access

- Auth/access gate: bearer `Globe-Share` con re-verificación server-side por request, sin cambios.
- Sensitive data posture: el cuerpo de un comentario **puede** contener texto interno escrito por un
  operador que no esperaba audiencia externa. Es la decisión de producto de esta task: el field `comments`
  del grant ya declara la intención de compartirlos, y el Producer debe dejarlo claro al crear el share
  `[verificar si el copy del Producer lo dice hoy]`.
- Error contract: los errores del path de share siguen colapsando a `not_found` no enumerable; un fallo de
  lectura del hilo **no** cambia el status de la respuesta.
- Abuse/rate-limit posture: sin cambios. El tope de comentarios proyectados acota el tamaño de la respuesta.

### Runtime evidence

- Local checks: `pnpm --filter @efeonce-globe/studio-web test` con casos nuevos en
  `creative-review-runtime.test.ts` (con/sin field, borrados, orden, tope, fallo del hilo).
- DB/runtime checks: resolver un share real contra staging y confirmar que el payload trae los tres campos.
- Integration checks: correr el canary de `TASK-1558`
  (`node scripts/frontend/globe-share-board-canary.mjs`) — sus assertions de no-fuga cubren esta task
  gratis: fallan si aparece un slug, `house`, un enum crudo o un ISO 8601.
- Reliability signals/logs: `none` nuevo.
- Production verification sequence: (1) deploy; (2) crear un share con `fields` completos desde el Producer
  sobre un output con comentarios; (3) abrir el enlace y confirmar los tres hechos y el hilo; (4) borrar un
  comentario y confirmar que desaparece del share.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Hidratar el hilo y el estado de revisión

- `resolveForShare` lee `getThread(workspaceId, target)` y mapea a `CreativeShareSourceV1`:
  `reviewStatus` desde `thread.decision?.decision`, `comments` desde `thread.comments`.
- Filtro duro de `deletedAt` antes de mapear.
- Orden **ascendente por `createdAt`** (un hilo de revisión se lee en el orden en que se escribió) y tope
  declarado como constante con su razón.
- Fallo de lectura del hilo ⇒ el share resuelve **sin** hilo, no falla.

### Slice 2 — Hidratar el label del modelo

- Resolver el nombre público del modelo para el output y mapearlo a `modelLabel`.
- Regla de ADR-003 explícita en el código: nombre + versión sí, slug de wire no.
- Si la fuente no lo tiene, `modelLabel` queda ausente y el share board muestra "Sin dato" — que ya es su
  comportamiento correcto.

### Slice 3 — Decisión de autoría y cobertura

- Tomar y documentar la decisión de autor (ver Open Questions). Si se decide mostrarlo, requiere ampliar
  `CreativeShareSourceV1` **y** un mapping principal→display name; si se decide no mostrarlo, se documenta
  el motivo en el contrato para que nadie lo "arregle" después exponiendo el `principalId`.
- Casos de test de los cinco invariantes.

## Out of Scope

- **Menciones** — `TASK-1563`.
- **Comentarios escritos por el cliente** — requiere un collaboration grant y es territorio de ADR-012 /
  `TASK-1547`. El grant read-only no puede autorizar escritura.
- Cambiar el shape de `CreativeShareBoardV1` para agregar campos nuevos (título de pieza, autor) salvo lo
  que decida el Slice 3.
- Tocar la UI del share board: ya renderiza todo esto.
- Cualquier cambio al transporte, la sesión, la CSP o el ALB.

## Detailed Spec

El detalle vive en el código citado: `authorizeReadOnlyShare` y `project()` en
`packages/domain/src/creative-review.ts`, y `createCreativeReviewAssetAuthority` en
`apps/studio-web/src/app.ts:2513-2531`. Esta task cambia **un** adapter y agrega **un** filtro; la forma del
contrato no se re-decide.

La razón de que el filtro de borrados sea decisión de diseño y no un detalle: `getThread` sirve al hilo
**interno**, donde un comentario borrado puede ser información útil (quedó el hueco, hay historial). En
audiencia `client` no: un comentario borrado es un comentario que alguien decidió retirar, y mostrarlo
sería publicar lo que se quiso despublicar. Por eso el filtro va en el path de share, no en `getThread`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → Slice 2 → Slice 3. El Slice 1 es el que desbloquea el valor; el 2 es independiente y puede
adelantarse si la fuente del label resulta trivial. El Slice 3 **no** puede quedar sin cerrar: dejar la
decisión de autor abierta es cómo aparece un `principalId` en el DOM del cliente seis meses después.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un comentario interno sale a un cliente que no debía verlo | Confidencialidad comercial | medium | El grant ya declara `comments` como intención explícita; el Producer debe decirlo al crear el share | Reclamo de cliente / revisión de copy del Producer |
| Se filtra el `principalId` del autor | Fuga de identificador interno | medium | Slice 3 lo decide explícitamente; assertion del canary sobre el DOM | Canary en rojo |
| Un comentario borrado reaparece en el share | Confidencialidad | low | Filtro duro + test | Test en rojo |
| Leer el hilo tumba el share entero | Disponibilidad | low | Degradación: sin hilo, con activo | Share que deja de resolver |
| El label del modelo arrastra el slug del proveedor | ADR-003 | low | Mapeo explícito nombre+versión + assertion del canary (`bytedance/`) | Canary en rojo |
| Payload gigante con cientos de comentarios | Rendimiento | low | Tope declarado con constante nombrada | Tiempo de respuesta del resolve |

### Feature flags / cutover

`N/A — read path additive`. No hay flag: el grant ya autoriza estos fields y no hay estado nuevo. El
rollback es revert + redeploy, <15 min.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR; el share vuelve a proyectar sólo el activo | <15 min | sí |
| Slice 2 | idem | <15 min | sí |
| Slice 3 | Doc/test only si la decisión es "no mostrar autor"; si amplía el contrato, revert PR | <15 min | sí |

### Production verification sequence

1. Deploy con los tests verdes.
2. Crear un share desde el Producer sobre un output que tenga comentarios y decisión.
3. Abrir el enlace: los tres hechos y el hilo se ven, sin enum crudo ni ISO.
4. Borrar un comentario en el Producer y recargar el share: desaparece.
5. Correr el canary de `TASK-1558`: verde.

### Out-of-band coordination required

`N/A — repo-only`, salvo la decisión de producto del Slice 3 y la posible revisión del copy del Producer
al crear un share (que hoy no advierte que los comentarios serán visibles) `[verificar]`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un share con `fields: [..., 'comments', 'model-label', 'review-status']` devuelve los tres poblados.
- [ ] Un share **sin** un field en el grant no lo devuelve, aunque la fuente lo tenga.
- [ ] Un comentario con `deletedAt` **no** aparece en la respuesta del share.
- [ ] Los comentarios llegan ordenados por `createdAt` ascendente y acotados por una constante nombrada.
- [ ] Un fallo al leer el hilo devuelve el share **con** el activo y **sin** el hilo, no un error.
- [ ] El `principalId` del autor no aparece en la respuesta (o aparece resuelto a display name, si el
      Slice 3 lo decide así y documenta el mapping).
- [ ] `modelLabel` trae nombre + versión y **nunca** el slug del proveedor.
- [ ] Source of truth, contract surface y consumidores nombrados con paths reales.
- [ ] Invariantes de datos, frontera de tenant e idempotencia explícitos.
- [ ] Postura de migración/rollback explícita y proporcional.
- [ ] Evidencia runtime listada: test + resolve real en staging + canary de `TASK-1558` verde.
- [ ] El share board de `TASK-1558` muestra datos reales **sin cambios en su UI**.

## Verification

En `efeonce-globe`: `pnpm --filter @efeonce-globe/studio-web test` · `pnpm check` · resolve real contra
staging con un grant emitido por el flujo real.
En `greenhouse-eo`: `node scripts/frontend/globe-share-board-canary.mjs` verde ·
`pnpm task:lint --task TASK-1562`.

## Closing Protocol

- [ ] `Lifecycle` sincronizado y archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` y `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` y `GLOBE_RUNTIME_HANDOFF.md` actualizados
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado — en particular el scorecard de `TASK-1558`, que hoy declara este vacío
      como riesgo abierto
- [ ] La decisión de autoría queda documentada en el contrato, no sólo en el commit

## Follow-ups

- `TASK-1563` (menciones) depende de esta task.
- Si el Slice 3 decide mostrar autor, el mapping principal→display name probablemente sirva también a
  `TASK-1547` (Storyboard, `client_review`).

## Open Questions

- **¿Se muestra el autor del comentario al cliente?** Tres opciones con consecuencias distintas:
  (a) **no mostrarlo** — cero trabajo, cero riesgo de fuga, pero un hilo sin autor es difícil de leer
  cuando hay más de un comentarista; (b) **display name resuelto** — requiere ampliar
  `CreativeShareSourceV1` y un mapping principal→nombre, y expone quién del equipo dijo qué a un cliente;
  (c) **"Equipo Efeonce"** genérico para todos — legible sin exponer individuos. Decisión de producto.
- **¿El Producer advierte que los comentarios serán visibles al crear el share?** `[verificar]` el copy
  actual. Si no lo dice, es un cambio de copy que debería acompañar esta task.
- **¿De dónde sale el `modelLabel`?** `[verificar]` en Discovery: metadata del output, registro de ruta, o
  el catálogo de modelos.

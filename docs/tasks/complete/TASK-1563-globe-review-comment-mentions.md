> # ⛔ TASK-1563 RETIRADA 2026-07-25 — duplicaba una task existente
>
> **Dueño real:** TASK-1522 (Review, Comments and Read-only Share Foundation)
>
> Se creó sin ver que `TASK-1522` ya es la dueña de review/comments/share. No se construyó nada, así que el contenido se movió íntegro. Ojo con `TASK-1544` (menciones de Storyboard): el directorio mencionable debería ser UNA primitive compartida, no dos.
>
> **Se retira en vez de completarse** porque una segunda task describiendo la misma superficie es exactamente la
> clase de drift que produce mediciones divergentes: dos specs de lo mismo se separan, y después nadie sabe cuál
> manda. Este archivo queda como registro del trabajo hecho y de dónde fue a parar; **no lo tomes como spec**.

# TASK-1563 — Menciones en comentarios de revisión de Globe

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-028`
- Status real: `RETIRADA por duplicación — su contenido vive en TASK-1522 (Review, Comments and Read-only Share Foundation)`
- Rank: `TBD`
- Domain: `creative-studio`
- Blocked by: `TASK-1562`
- Branch: `task/TASK-1563-globe-review-comment-mentions`
- GitHub Issue: `TBD`

## Summary

Permitir que un comentario de revisión **mencione a otra persona** del workspace, como dato estructurado y
no como texto parseado, con la mención validada contra el roster real de miembros y notificada por un canal
explícito. Es la **fundación backend**: el selector de menciones en la UI del Producer y la forma de mostrar
una mención al cliente son consumers que van en tasks aparte.

## Why This Task Exists

Un hilo de revisión sin menciones obliga a salir de la herramienta para pedir algo: se comenta en Globe y
después se avisa por Teams. La mención es lo que cierra el loop dentro del producto.

Pero el trabajo real **no es el campo `mentions`** — es que Globe le faltan las dos primitives que una
mención necesita, y eso se verificó contra el código, no se supuso:

| Lo que una mención necesita | Estado en Globe |
|---|---|
| Saber **a quién** se puede mencionar | ⚠️ **parcial** — existe `tenancy_members` con el roster (`WorkspaceMemberProjectionV1`: `memberId`, `identitySubject`, `state`, `expiresAt`), pero **no hay reader** que lo exponga como directorio mencionable |
| Saber **cómo se llama** esa persona | 🔴 **no existe** — la proyección guarda `identitySubject` (el subject de identidad de Greenhouse) y `identityIssuer: 'greenhouse'`. **Globe sabe quiénes son sus miembros pero no cómo se llaman**: los nombres viven en Greenhouse, del otro lado del broker |
| Poder **avisarle** | 🔴 **no existe** — no hay primitive de notificación ni outbox general. El único outbox del repo es específico de `governed-run-lifecycle` |

Ése es el tamaño honesto de la task: una mención es un problema de identidad y de notificación disfrazado
de campo de texto. Escribirla como un parseo de `@algo` sobre el body sería la versión que parece funcionar
y no se puede gobernar — sin validación de que la persona existe, sin saber a quién notificar, y con el
texto crudo como única fuente de verdad.

## Goal

- Un comentario puede llevar menciones **estructuradas**, validadas contra miembros activos del workspace.
- Mencionar a alguien que no es miembro activo **falla**, no se guarda como texto.
- Existe un reader canónico del directorio mencionable, reutilizable por cualquier consumer.
- La persona mencionada se entera por un canal declarado, no por casualidad.
- Queda decidido y documentado qué ve un **cliente externo** cuando un comentario compartido menciona a
  alguien del equipo.
- Mencionar **no** concede acceso: es aviso, nunca autorización.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_PRODUCER_HUMAN_EXECUTION_DECISION_V1.md` — ADR-005 §4:
  coverage es metadata, el enforcement es fail-closed en ingress/dispatch. **Una mención no puede conceder
  nada.**
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md` — ADR-003:
  audiencia `client` nunca recibe identificadores internos.
- `docs/architecture/creative-studio/EFEONCE_GLOBE_STORYBOARD_*` / ADR-012 (`TASK-1547`): declara que el
  comentario del **cliente** exige *"an authenticated, scoped and revocable collaboration grant"*. Esta task
  **no** lo construye y **no** lo presupone.
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — el identity broker Greenhouse→Globe es la única
  fuente de identidad; Globe no crea identidades paralelas.

Reglas obligatorias:

- **NUNCA** derivar una mención parseando el body en tiempo de render: la mención es dato, el texto es texto.
- **NUNCA** aceptar una mención a un principal que no sea miembro **activo** y no expirado del workspace.
- **NUNCA** tratar una mención como concesión de acceso: quien es mencionado ve lo que su grant le permite.
- **NUNCA** exponer `identitySubject` ni `principalId` a audiencia `client`.
- **NUNCA** crear un directorio de identidades dentro de Globe: el nombre se proyecta desde el broker o se
  resuelve contra él, jamás se tipea.
- **NUNCA** notificar por un canal que no esté declarado en esta task (un `console.log` no es un canal).

## Normative Docs

- `packages/domain/src/creative-review.ts` — `createComment`, `editComment`, `CreativeReviewCommentV1`.
- `packages/domain/src/tenancy.ts` + `packages/database/src/stores/tenancy-store.ts` — el roster
  (`tenancy_members`, `WorkspaceMemberProjectionV1`) y `getEffectiveAccess`.
- `docs/tasks/to-do/TASK-1562-globe-share-projection-hydration.md` — decide si el autor de un comentario se
  muestra al cliente; la mención hereda esa decisión.

## Dependencies & Impact

### Depends on

- **`TASK-1562`** (bloqueante): sin proyección de comentarios al share, una mención nunca llega al cliente y
  el Slice 3 no tiene nada que decidir. Además su Open Question de autoría **gobierna** cómo se muestra una
  mención: sería incoherente ocultar el autor y nombrar al mencionado.
- **`TASK-1522`** (complete): comandos y store de comentarios.
- El identity broker Greenhouse→Globe, para el nombre.

### Blocks / Impacts

- Habilita el **selector de menciones** en el viewer del Producer — task `ui-ux` aparte (ver Follow-ups):
  necesita dirección visual y contrato de interacción (trigger `@`, navegación por teclado, estado sin
  resultados), y **no** se debe improvisar dentro de esta task.
- Toca `packages/domain/src/creative-review.ts`, que `TASK-1562` también modifica. Coordinar orden.
- Es precedente para `TASK-1547` (Storyboard con `client_review`), que necesitará lo mismo.

### Files owned

En `efeonce-globe`:

- `packages/contracts/src/creative-review.ts` (shape de mención)
- `packages/domain/src/creative-review.ts` (validación + command)
- `packages/database/src/stores/creative-review-store.ts` (persistencia)
- `packages/domain/src/tenancy.ts` (reader del directorio mencionable) `[verificar si va acá o en su store]`
- `apps/studio-web/src/app.ts` (composición del reader + canal de notificación)

## Current Repo State

### Already exists

- `createComment` con `human(c)`, validación de propiedad (`owned`), idempotencia y audit.
- `tenancy_members` con estado, capacidades deseadas y expiración por miembro.
- `getEffectiveAccess(workspaceId, identityIssuer, identitySubject, at)` — ya sabe si alguien es miembro
  activo. Es la base natural de la validación de mención.
- `editComment` con control de autoría y versión optimista.

### Gap

- `CreativeReviewCommentV1` no tiene campo de menciones.
- No hay reader "miembros mencionables de este workspace".
- No hay nombre: la proyección guarda `identitySubject`, no display name.
- No hay canal de notificación de propósito general.
- `CreativeShareSourceV1.comments` es `{ body, createdAt }` — sin autor y sin menciones.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `efeonce-globe` (`packages/contracts`, `packages/domain`, `packages/database`,
  `apps/studio-web`). En Greenhouse sólo doc gobernante.
- Future candidate home: `remain-shared`
- Boundary: el command canónico sigue siendo `globe.producer.review.comment.create`; la mención viaja en su
  payload. El directorio mencionable es un **reader** nuevo, no una tabla nueva.
- Server/browser split: la validación de miembro y la resolución de nombre son **server-only**. El browser
  manda `memberId`s y recibe nombres ya resueltos; nunca consulta el roster directo.
- Build impact: `none`
- Extraction blocker: la dependencia del identity broker para el nombre — Globe no puede resolver identidad
  sin Greenhouse.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: `creative_review_comments` `[verificar nombre real de la tabla]` para la mención;
  `tenancy_members` para quién es mencionable; el identity broker para el nombre.
- Consumidores afectados: viewer del Producer (UI, task aparte), share board vía `TASK-1562`, y el canal de
  notificación.
- Runtime target: `staging` → `production` (internal-only por gate `TASK-1480`)

### Contract surface

- Contrato existente a respetar: `CreativeReviewCommentV1`, `CreateCreativeReviewCommentPayloadV1`,
  `GLOBE_REVIEW_COMMANDS.commentCreate`, y el gating por `fields` del share.
- Contrato nuevo o modificado: campo `mentions` en el comentario y en su payload de creación; reader nuevo
  del directorio mencionable; evento/canal de notificación.
- Backward compatibility: `compatible` — `mentions` es opcional y un comentario sin menciones sigue siendo
  válido.
- Full API parity: la mención se valida en el **command del dominio**, no en la UI. El selector es un cliente
  del reader; cualquier otro consumer (MCP, Nexa, un agente) obtiene la misma validación por construcción.

### Data model and invariants

- Entidades/tablas/views afectadas: el store de comentarios (+ columna/JSON de menciones), `tenancy_members`
  (lectura), y lo que decida el canal de notificación.
- Invariantes que no se pueden romper:
  - una mención referencia un **`memberId` del workspace**, nunca un email libre ni un string;
  - mencionar a un miembro inactivo, expirado o de otro workspace **falla el command**;
  - una mención **no** concede acceso ni capability;
  - la mención es dato estructurado: el body nunca es la fuente de verdad de a quién se mencionó;
  - un comentario borrado no notifica y no aparece en el share;
  - `identitySubject` / `principalId` no cruzan a audiencia `client`.
- Tenant/space boundary: el `workspaceId` sale del `TrustedCommandContextV1`, nunca del payload.
- Idempotency/concurrency: el command ya es idempotente por `idempotencyKey` + `fingerprint`; el fingerprint
  **debe incluir las menciones**, o dos comentarios con el mismo texto y distintos mencionados colapsarían
  en uno.
- Audit/outbox/history: el audit del comentario ya existe; la notificación necesita su propio registro para
  que "avisé" sea verificable y no una suposición.

### Migration, backfill and rollout

- Migration posture: `additive` — columna/estructura de menciones nullable. Los comentarios existentes
  quedan sin menciones, que es su verdad.
- Default state: `flag OFF` para la notificación. La mención se puede guardar y mostrar antes de que el canal
  exista; **notificar** es la parte con efectos hacia afuera y merece su palanca.
- Backfill plan: `N/A` — no se infieren menciones retroactivas parseando bodies históricos. Sería justo el
  anti-patrón que esta task evita.
- Rollback path: flag off para la notificación; revert PR + migración reversa para el campo.
- External coordination: el canal de notificación (ver Open Questions) puede requerir configuración de
  Teams/email y decisión de producto.

### Security and access

- Auth/access gate: `globe.producer.comment.manage` + principal humano + propiedad del output. Sin cambios.
- Sensitive data posture: el nombre de una persona del equipo es PII menor pero **sale del broker**, no se
  almacena de más de lo necesario. Y una mención en un comentario compartido expone quién trabaja en la
  cuenta a un cliente externo — ése es el Slice 3.
- Error contract: errores canónicos del dominio (`CreativeReviewAccessDeniedError`, `NotFound`,
  `Conflict`); nunca el detalle de por qué un miembro no es mencionable, que sería enumeración de roster.
- Abuse/rate-limit posture: tope de menciones por comentario, para que una mención no sea un fan-out de
  notificaciones sin techo.

### Runtime evidence

- Local checks: `pnpm --filter @efeonce-globe/domain test` + `... studio-web test` con casos de miembro
  inactivo, de otro workspace, tope excedido, y fingerprint que discrimina por menciones.
- DB/runtime checks: migración aplicada + un comentario con mención creado contra staging.
- Integration checks: notificación entregada de verdad en staging, con evidencia del canal.
- Reliability signals/logs: registro de notificación entregada/fallada `[verificar si Globe tiene dónde]`.
- Production verification sequence: (1) migración; (2) crear comentario con mención; (3) confirmar que el
  mencionado recibió el aviso; (4) intentar mencionar a un no-miembro y confirmar el rechazo; (5) abrir un
  share con ese comentario y confirmar lo que decidió el Slice 3.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — La mención como dato, validada contra el roster

- `mentions?: readonly { memberId: string }[]` en `CreativeReviewCommentV1` y en el payload de creación.
- Validación en el command contra `tenancy_members` / `getEffectiveAccess`: miembro activo, no expirado, del
  **mismo** workspace. Cualquier otro caso ⇒ error canónico.
- Tope de menciones por comentario, como constante nombrada con su razón.
- El `fingerprint` de idempotencia incluye las menciones.
- Migración additive + tests de los invariantes.

### Slice 2 — Directorio mencionable con nombre

- Reader canónico "miembros mencionables de este workspace": miembros activos, con nombre resuelto.
- Decidir y documentar cómo llega el nombre (ver Open Questions): proyectado al sincronizar el miembro desde
  el broker, o resuelto en el read. **No** se tipea un nombre en Globe.
- El reader es el contrato que consumirá el selector de la UI; nace server-side y con capability.

### Slice 3 — Notificación y proyección al cliente

- Canal de notificación declarado, detrás de flag, con registro de entrega.
- Decidir qué ve un cliente externo cuando un comentario compartido menciona a alguien: nada, un nombre, o
  un genérico. **Coherente con la decisión de autoría de `TASK-1562`** — nombrar al mencionado mientras se
  oculta al autor sería incoherente y filtraría por la puerta de al lado.

## Out of Scope

- **Comentarios escritos por el cliente**, con o sin mención. El grant del share es read-only y ADR-012
  exige un *collaboration grant* autenticado, scoped y revocable para que un cliente escriba. Habilitarlo es
  una decisión de ADR, no de task. Si alguien lo necesita, se abre esa discusión — no se estira ésta.
- **El selector `@` en la UI del Producer** — task `ui-ux` aparte, con su dirección visual y su contrato de
  interacción. Crear acá un picker improvisado sería exactamente el freehand que el estándar de UI prohíbe.
- Menciones a grupos, roles o "todo el equipo".
- Reacciones, hilos anidados, edición colaborativa en vivo.
- Cualquier cambio al transporte del share, la sesión o la CSP.

## Detailed Spec

No se duplica acá lo que ya está en el código citado. Dos decisiones de forma que sí se fijan:

**La mención es una referencia, no un rango de texto.** No se guarda `offset`/`length`: atarla a posiciones
del body la rompe en la primera edición y obliga a re-parsear. El body dice lo que dice; `mentions` dice a
quién involucra. Si más adelante se quiere resaltar el nombre dentro del texto, es un problema de render con
el dato ya disponible.

**El fingerprint incluye las menciones por una razón concreta:** hoy es `fingerprint({ target, body })`. Dos
comentarios con el mismo texto y distintos mencionados producirían el mismo fingerprint, y el segundo se
resolvería como replay del primero — la mención se perdería en silencio y nadie sería notificado.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → Slice 2 → Slice 3, y **`TASK-1562` antes de todo**. El Slice 3 no arranca sin la decisión de
autoría de `TASK-1562` cerrada: son la misma decisión de exposición vista dos veces.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Una mención se interpreta como concesión de acceso | Autorización | medium | ADR-005 §4 explícito en el código + test de que el mencionado sigue sin capability | Test en rojo / auditoría de acceso |
| Se filtra a un cliente quién del equipo trabaja en su cuenta | Confidencialidad comercial | medium | Slice 3 lo decide con `TASK-1562`; assertion del canary sobre el DOM | Canary en rojo |
| Se filtra `identitySubject` como si fuera nombre | Fuga de identificador interno | medium | El reader devuelve nombre resuelto o falla; nunca el subject | Canary en rojo |
| Fan-out de notificaciones sin techo | Ruido / abuso | low | Tope por comentario + flag del canal | Volumen de notificaciones |
| Replay colapsa dos comentarios distintos y pierde la mención | Correctitud | medium | Fingerprint incluye menciones + test | Test en rojo |
| Se implementa parseando `@` del body | Deuda estructural | medium | Regla dura + revisión: la mención entra por el payload, no por el texto | Code review |
| El nombre queda desincronizado con Greenhouse | Calidad de dato | medium | Decidir proyección vs resolución en el read (Open Question) con su condición de frescura | Nombre stale visible |

### Feature flags / cutover

Flag **sólo para la notificación** (el efecto hacia afuera). El campo y el reader son additive y no necesitan
palanca: sin UI que los use, no cambian nada observable.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR + migración reversa; los comentarios existentes no tenían menciones | <30 min | sí |
| Slice 2 | Revert PR; el reader deja de existir y nada lo consumía todavía | <15 min | sí |
| Slice 3 | Flag off ⇒ deja de notificar, las menciones siguen guardadas | <5 min | sí |

### Production verification sequence

1. Migración aplicada y verificada contra el schema.
2. Comentario con mención creado desde el flujo real.
3. El mencionado recibe el aviso, con evidencia del canal.
4. Mención a un no-miembro rechazada con error canónico.
5. Share abierto con ese comentario: lo que el Slice 3 decidió, y nada más.

### Out-of-band coordination required

El canal de notificación puede requerir configuración externa (Teams/email) y decisión de producto sobre la
exposición al cliente. Ninguna de las dos es repo-only.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un comentario puede llevar menciones y se persisten como dato estructurado, no como texto.
- [ ] Mencionar a un miembro inactivo, expirado o de otro workspace **falla** con error canónico.
- [ ] El error de mención inválida **no** revela si la persona existe (no enumera el roster).
- [ ] El tope de menciones por comentario está declarado como constante nombrada y testeado.
- [ ] El `fingerprint` de idempotencia discrimina por menciones — test que lo prueba.
- [ ] Existe un reader canónico del directorio mencionable, server-side y con capability.
- [ ] El reader devuelve nombre resuelto; `identitySubject` no aparece en su salida.
- [ ] Una mención **no** concede acceso: test que verifica que el mencionado sigue sin capability.
- [ ] La notificación está detrás de flag, tiene registro de entrega y se verificó en staging.
- [ ] Lo que ve un cliente externo está decidido, documentado y coherente con `TASK-1562`.
- [ ] Ningún comentario borrado notifica ni aparece en el share.
- [ ] Source of truth, contract surface y consumidores nombrados con paths reales.
- [ ] Postura de migración/rollback explícita y proporcional.
- [ ] Evidencia runtime listada: tests + migración + notificación real + canary de `TASK-1558` verde.

## Verification

En `efeonce-globe`: `pnpm check` · `pnpm --filter @efeonce-globe/domain test` ·
`pnpm --filter @efeonce-globe/studio-web test` · migración verificada contra el schema · notificación real en
staging.
En `greenhouse-eo`: `node scripts/frontend/globe-share-board-canary.mjs` verde ·
`pnpm task:lint --task TASK-1563`.

## Closing Protocol

- [ ] `Lifecycle` sincronizado y archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` y `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` y `GLOBE_RUNTIME_HANDOFF.md` actualizados
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado — `TASK-1547` (Storyboard `client_review`) necesita lo mismo
- [ ] La task `ui-ux` del selector queda creada o explícitamente diferida con su razón
- [ ] **Doc funcional**: qué es una mención en Globe, a quién se puede mencionar y qué ve un cliente
      (`docs/documentation/creative-studio/`)

## Follow-ups

- **Task `ui-ux` del selector de menciones** en el viewer del Producer: trigger `@`, navegación por teclado,
  estado sin resultados, y cómo se muestra una mención ya escrita. Necesita dirección visual aprobada;
  **no** heredar la de `TASK-1558`, que es otra superficie con otra audiencia.
- Si el cliente alguna vez debe comentar, es ADR nueva sobre el collaboration grant, no una extensión de
  esta task.
- `TASK-1547` (Storyboard) reusará el directorio mencionable y el canal.

## Open Questions

- **¿De dónde sale el nombre?** (a) **Proyectarlo** al sincronizar el miembro desde el broker — rápido de
  leer, pero puede quedar stale y hay que declarar su frescura; (b) **resolverlo en el read** contra el
  broker — siempre fresco, pero agrega una dependencia de red a un reader que la UI llama al escribir. Decide
  el Slice 2 con evidencia de latencia.
- **¿Cuál es el canal de notificación?** Globe no tiene ninguno de propósito general (el único outbox es de
  `governed-run-lifecycle`). Candidatos: Teams vía el bot que Greenhouse ya opera, email, o un inbox in-app.
  El primero reusa infraestructura existente; el último no depende de nada externo pero nadie lo mira si no
  está abierto. Decisión de producto + arquitectura.
- **¿Qué ve el cliente?** Depende de la Open Question de autoría de `TASK-1562`. Las opciones se mueven
  juntas: si el autor no se muestra, el mencionado tampoco debería.
- **¿La mención puede apuntar a alguien sin acceso al output?** Sería útil ("mirá esto") y a la vez raro
  (recibe un aviso sobre algo que no puede abrir). Decide el Slice 1: o se rechaza, o se notifica con un
  mensaje que no revele contenido.

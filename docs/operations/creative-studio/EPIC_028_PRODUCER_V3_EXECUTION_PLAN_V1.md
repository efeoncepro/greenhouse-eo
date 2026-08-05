# EPIC-028 — Producer V3: plan operativo de ejecución

> Tipo: plan de coordinación de roadmap
> Corte: 2026-08-05
> Control plane: Greenhouse
> Runtime: repositorio hermano efeonce-globe

Este documento coordina la ejecución. No reemplaza una arquitectura, ADR, task, contrato, wireframe, flow,
motion contract, runbook ni evidencia de runtime. Si existe conflicto, manda la fuente canónica.

## Decisión

Producer V3 es un shell unificado con tres estudios especializados:

1. Image Studio.
2. Video Studio.
3. Audio Studio.

El shell comparte workspace, identidad, créditos, permisos, navegación, sesiones, feed, biblioteca, viewer,
lineage, provenance, rights, review y acciones de continuidad. Cada estudio adapta composer, inputs, controles,
revisión y playback a su modalidad.

El objetivo es cerrar el loop:

Creative Entry Hub → contexto → Session → composer adaptativo → estimate → generación → revisión →
modificación → reutilización → aprobación o compartir.

### No alcance

- No es un rewrite del runtime: reutiliza commands, readers, BFF, policies, retrieval, governance, ledger,
  rights y lineage existentes.
- No son tres aplicaciones: no se duplican feed, viewer, library, auth, credits, review ni navegación.
- No es un formulario genérico con más campos: la ruta declara operación, slots, roles, combinaciones,
  controles y output; la UI no deriva capacidades desde nombres de modelos o proveedores.
- No crea una segunda fuente de verdad ni una task paraguas Producer V3.

La decisión se apoya en el [benchmark autenticado de Higgsfield y Magnific](../../audits/competitive-ui/GLOBE_COMPETITIVE_BENCHMARK_HIGGSFIELD_MAGNIFIC_2026-08-05.md):
la brecha principal de Globe está en la continuidad crear → revisar → modificar → reutilizar, no en la
ausencia general de contratos server-side.

## Autoridad documental

| Tema | Fuente de verdad | Uso de este plan |
|---|---|---|
| Epic, estado y ownership | [EPIC-028](../../epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md) | Ordenar ejecución |
| Forma del Producer | [Creative Producer Architecture V1](../../architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md) | Mantener límites |
| Flujo | [Master UI Flow](../../ui/flows/EPIC-028-globe-creative-studio-master-flow.md) | Coordinar recorrido |
| Motion | [Master UI Motion](../../ui/motion/EPIC-028-globe-creative-studio-master-motion.md) y [Client Motion Contract](../../architecture/creative-studio/GLOBE_CLIENT_MOTION_CONTRACT_V1.md) | Coordinar causalidad y reduced motion |
| Composer | [Composer Style Reference](../../ui/GLOBE_PRODUCER_COMPOSER_STYLE_REFERENCE_V1.md) | Conservar jerarquía y tokens |
| Estado operativo | [Globe Runtime Handoff](GLOBE_RUNTIME_HANDOFF.md) | Precedencia sobre historia |
| Gates de UI | [Client UI Gates Runbook](GLOBE_CLIENT_UI_GATES_RUNBOOK_V1.md) | Definir evidencia |
| Ownership de trabajo | Tasks en [docs/tasks](../../tasks/) | Mantener lifecycle y criterios |

Este documento solo decide secuencia, dependencias, paralelización, stop conditions y criterios de salida.
No inventa endpoints, schemas, commands, readers, capabilities, route IDs, tasks ni contratos.

## Frontera Greenhouse / efeonce-globe

Greenhouse es el único control plane operativo: registra EPICs, TASKs, dependencias, lifecycle, lint, QA,
cierre documental y handoff.

efeonce-globe posee el código, contratos, runtime, infraestructura, datos, workers, providers, assets,
rights, provenance, lineage, credits y evidencia técnica.

El flujo humano válido es:

Chrome autenticado → BFF same-origin → API IAM-private → commands/readers/workers gobernados.

Una prueba con un perfil Playwright nuevo, service account o llamada directa a la API privada no acredita la
experiencia humana del Producer.

TASK-1641 es exclusivamente backend/API para promoción, canary, readiness, rollback y convergencia terminal.
No es owner de composer, feed actions, viewer, home ni del canary de generación desde la UI. La continuidad
Reference, Recreate, Favorite y Download pertenece a TASK-1643.

## Roadmap por fases

### P0 — Design contract

Owner: TASK-1523, consumido por TASK-1552 y las tasks de media.

- Confirmar el shell unificado y los tres estudios.
- Seleccionar la dirección Creative Control Room: media stage dominante, composer adaptativo, sidecar
  contextual y chrome reducido.
- Mantener el primer fold claro en desktop y 390 px.
- Mapear CompositionShell, sidecar, MediaStage, action rail y primitives existentes.
- Cerrar direction mode, wireframe, flow, motion, estados, copy, accesibilidad, implementation mapping,
  GVC plan y decision log.
- Rechazar explícitamente tres apps, composer genérico, rewrite completo y home como segunda biblioteca.

Salida: la task UI dueña pasa UI readiness solamente cuando su contrato completo y
pnpm ui:readiness-check --task TASK-### estén en verde.

### P1 — Foundation y continuidad

Orden recomendado: TASK-1633 → TASK-1552 → TASK-1643.

TASK-1633 entrega la verdad route-driven de operación, inputs, roles, combinaciones y controles. TASK-1552
consume esa proyección y mantiene prompt, dirección, output shape y estimate como jerarquía primaria.
TASK-1643 conecta el feed con el composer y elimina acciones no-op.

Salida:

- ningún control visible es no-op;
- Reference y Recreate son zero-spend;
- estimate stale, referencia irresuelta, ruta no disponible, workspace cambiado o policy denied bloquean
  execute con razón;
- prepare y execute conservan la misma idempotency key;
- el composer permanece dentro de ProducerWorkspace; no se crea una ruta paralela de compose.

### P2 — Vertical slices de media

Las tres ramas pueden avanzar en paralelo después de P1, con una sola modificación activa por región
compartida del payload y con su projection backend-data cerrada antes de la UI.

- Imagen: TASK-1571 → TASK-1572. Focus Canvas, zoom, pan, fit, tamaño real, navegación, compare solo con
  lineage real y edición regional gobernada.
- Video: TASK-1569 → TASK-1570; luego TASK-1573 → TASK-1574. Poster, preview, playback único, timeline,
  timecode, MediaDock, estados de buffering y edición gobernada.
- Audio: TASK-1567 → TASK-1568; luego TASK-1575 → TASK-1577. Waveform real, playhead, Sonic Stage,
  AudioDock, playback único y edición layer-aware.

Salida: cada modalidad tiene su input model, stage, review model, estados partial/degraded/denied,
keyboard path, reduced-motion equivalence y recovery. Video no se trata como imagen grande y audio no se
trata como una tarjeta con play.

### P3 — Hub, Workspace, Review y Reuse

Secuencia: TASK-1580 → TASK-1581 → TASK-1582 → TASK-1583.

TASK-1520 y TASK-1522 pueden avanzar en paralelo en sus boundaries server-side.

- TASK-1580 fija Project, Session y Element como contexto gobernado; Session creation nunca gasta.
- TASK-1581 crea Entry Hub y Session Feed sin segunda fuente de verdad.
- TASK-1582 convierte el asset workspace en el centro de continuidad y consume los stages de media.
- TASK-1583 separa selección, aprobación, feedback, child Session y Element reusable con rights.

Salida: el operador puede entrar desde intención, proyecto, colección, sesión, asset o review; revisar,
abrir lineage, pedir cambios, crear un Element elegible y reutilizarlo sin perder contexto.

### P4 — Calidad y rollout

P4 verifica que la experiencia pueda operar como producto comercial aunque el estadio actual sea
internal-only o internal_smoke:

- GVC premium;
- browser/session verification;
- contract/API parity;
- rights, provenance y lineage;
- spend, idempotency y reconciliation;
- API/worker symmetry;
- flags, canary y rollback;
- handoff operativo y estado honesto.

## Paralelización segura

Puede avanzar en paralelo:

- TASK-1641 en backend/API, sin editar UI ni usar su canary como evidencia del Producer;
- TASK-1633 y TASK-1504 en sus boundaries de contrato/capability;
- TASK-1520 y TASK-1522 en sus boundaries server-side;
- TASK-1567 y TASK-1569 como projections independientes;
- las ramas de Imagen, Video y Audio después de P1 y sus projections.

Debe mantenerse en secuencia:

- TASK-1633 antes del consumer route-driven completo de TASK-1552;
- TASK-1552 antes del handoff completo de TASK-1643;
- 1567 antes de 1568 y 1569 antes de 1570;
- 1580 antes de 1581, 1582 y 1583;
- 1522 y 1580 antes del review-to-reuse completo.

No se usan worktrees ni checkouts aislados. No se editan simultáneamente ProducerWorkspace, ProducerComposer,
ProducerFeedRoute, MediaStage, playback context o shared primitives sin owner y handoff explícitos.

## Gates obligatorios

### UI readiness y visual

Antes de JSX nuevo deben existir source/direction, CompositionShell, primitive mapping, first fold desktop y
móvil, state/copy/a11y inventory, implementation mapping, flow, motion, GVC plan y decision log.

Cada superficie UI standard usa:

- 1440×1000 y 390×844;
- 320 px cuando el owner lo exige;
- teclado, focus restoration, live regions y reduced motion;
- loading, empty, partial, degraded, denied, blocked, error, success y recovery;
- scrollWidth igual a clientWidth en documento, stage, inspector, dock, dialog y sheet;
- dossier y scorecard: promedio mínimo 4.5, ninguna dimensión menor que 4 y floors críticos en 4.5.

El motion debe explicar causalidad, nunca inventar progreso y conservar significado con reduced motion.

### Browser y sesión

- usar Chrome autenticado y BFF same-origin;
- verificar session, actor, workspace y re-auth;
- no aceptar service account como sustituto del carril humano;
- no llamar API IAM-private directamente desde el browser;
- verificar MIME y bytes reales, no solo HTTP 200.

### Rights, provenance y lineage

- asset identity, workspace y elegibilidad son server-authoritative;
- el browser recibe handles y proyecciones allowlisted, nunca URLs públicas o secretos;
- compare exige lineage real;
- C2PA ausente no se presenta como Trusted;
- Reference, Recreate, Edit, Review y Element reuse conservan parent, role, rights y provenance;
- Element reuse revalida workspace, rights, compatibilidad y source hash.

Fuente transversal: [AI Creative Data Governance Decision](../../architecture/GREENHOUSE_AI_CREATIVE_DATA_GOVERNANCE_DECISION_V1.md).

### Spend e idempotencia

- estimate pre-spend vigente y visible;
- estimate stale bloquea execute;
- prepare y execute comparten una única clave idempotente;
- timeout o respuesta ambigua exige readback antes de reintentar;
- Reference, Recreate, Session creation, Review, Comment y Element draft son zero-spend;
- React no calcula créditos ni duplica la línea de costo;
- reserve, spend, settle, abandon y reconciliation permanecen en el servidor.

### Rollout

- leer estado vivo desde [GLOBE_RUNTIME_HANDOFF](GLOBE_RUNTIME_HANDOFF.md);
- comprobar simetría API/worker, digest, configuración, secrets, IAM y route support;
- no exponer una affordance solo porque una ruta esté promoted/enabled;
- externos siguen gated por TASK-1480 y TASK-1521;
- flags, migraciones, secretos, workers, canaries y deploys siguen sus owners y runbooks.

## Riesgos y stop conditions

| Riesgo / stop condition | Control |
|---|---|
| V3 se vuelve una task interminable | mantener owners y slices existentes |
| composer genérico o branches por modelo | Route Creative Contract y TASK-1633 |
| control visible sin acción real | TASK-1643 y browser canary |
| partial/degraded presentado como completo | estados server-backed y copy honesto |
| segundo feed, viewer o library | reusar TASK-1559, TASK-1520, TASK-1526 y TASK-1582 |
| doble gasto o retry ciego | stale block, idempotency y readback |
| rights/lineage cross-workspace | trusted context y revalidación server-side |
| motion decorativo o hover-only | motion contract y reduced-motion GVC |
| sesión incorrecta o API directa | detener y repetir en Chrome autenticado |
| falta de rollback, canary o API/worker symmetry | detener antes de rollout |
| endpoint, schema, scope, provider o task nueva no autorizada | detener; no ampliar alcance |

Detener el slice si falta UI readiness, first-fold acceptance, evidencia GVC, acción real, contrato
autoritativo, rights, estimate seguro o recuperación. No cerrar el problema ocultando controles, bajando
scores o agregando excepciones permanentes.

## Rollback y handoff

### Rollback

- UI: volver a la revisión/flag anterior sin borrar assets, sessions, lineage, review ni contracts.
- Contexto: deshabilitar nuevas escrituras additive sin borrar datos existentes.
- Runtime: usar commands gobernados de reconciliation/requeue; nunca SQL manual.
- Promoción: rollback y readiness pertenecen a TASK-1641 y sus runbooks.
- Rights/policy: una nueva atestation crea una nueva identidad; no se reescribe la anterior.

### Handoff por slice

El owner entrega task y paths, contratos consumidos, estados verificados, captures/dossier/scorecard,
browser/session evidence, rights/provenance/lineage evidence, spend/idempotency evidence, rollback,
riesgos abiertos y siguiente condición de entrada.

El estado debe distinguir design complete, build ready, code complete/rollout pendiente, launch ready y
operativamente bloqueado. Este plan no sustituye las actualizaciones de Handoff, changelog, task, arquitectura
o runbook que correspondan al cambio real.

## Criterios de salida medibles

Producer V3 solo sale cuando:

- existe un shell único con Image, Video y Audio sin auth/feed/viewer/library/review/rights/credits duplicados;
- cada modalidad tiene composer y review propios, route-driven y sin controles no-op;
- el flujo crear → revisar → modificar → reutilizar → aprobar/compartir conserva contexto;
- cada task UI tiene readiness, first-fold review, GVC, dossier y scorecard;
- 1440×1000, 390×844 y 320 px cuando aplica pasan sin overflow;
- keyboard, focus, live regions y reduced motion llegan al mismo significado final;
- browser autenticado → BFF → API private está verificado;
- media, derivatives, MIME, duración, waveform, rights, provenance y lineage son reales y gobernados;
- no hay doble reserve, doble settle ni doble execute por una secuencia lógica;
- API y worker coinciden en route support, digest, configuración, secrets y accessors;
- cada route habilitada tiene canary, rollback y estado terminal verificables;
- rollout externo permanece bloqueado hasta que TASK-1480, TASK-1521 y gates comerciales lo autoricen.

## Referencias de proceso

- [AGENTS.md](../../../AGENTS.md)
- [greenhouse-documentation-governor](../../../.codex/skills/greenhouse-documentation-governor/SKILL.md)
- [greenhouse-ai-design-studio](../../../.codex/skills/greenhouse-ai-design-studio/SKILL.md)
- [software-architect-2026](../../../.codex/skills/software-architect-2026/SKILL.md)
- [greenhouse-globe](../../../.codex/skills/greenhouse-globe/SKILL.md)
- [Documentation Operating Model](../DOCUMENTATION_OPERATING_MODEL_V1.md)
- [Context Handoff Operating Model](../CONTEXT_HANDOFF_OPERATING_MODEL_V1.md)
- [Architecture Decision Record Operating Model](../ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md)

## Estado de entrega

- Documento creado en Greenhouse.
- No se creó una task nueva.
- Esta entrega solo modifica este documento; cualquier cambio concurrente en otras rutas queda fuera de su
  ownership y no fue alterado.
- TASK-1641 queda documentada como backend/API-only.
- Siguiente paso: ejecutar P0/P1 mediante TASK-1523, TASK-1633, TASK-1552 y TASK-1643, sin ampliar el alcance.

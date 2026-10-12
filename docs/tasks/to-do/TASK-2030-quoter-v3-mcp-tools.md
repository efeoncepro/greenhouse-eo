# TASK-2030 — Quoter V3 MCP tools and gateway federation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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
- Backend impact: `integration`
- Epic: `EPIC-053`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|finance`
- Blocked by: `TASK-2026, TASK-2027, TASK-2028`
- Branch: `Greenhouse develop; gateway efeonce-mcp por PR; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Fase 7 de `EPIC-053`. Agrega herramientas MCP para leer, simular y registrar una cotización del cotizador V3 sobre las
rutas de ecosistema de `TASK-2026` y `TASK-2027`, y las federa en el gateway `efeonce-mcp`. Aprobar una excepción,
activar el puntero del catálogo y emitir **no** se exponen. Las herramientas actuales del motor V2 (`search_services`,
`quote_price`) siguen respondiendo sin cambios. Registrar necesita una clase de escritura que hoy no existe: la task la
plantea como decisión con dueño y ofrece un primer corte de lectura y simulación que no la necesita.

## Why This Task Exists

Un agente que conversa por MCP hoy sólo llega al motor V2, que la auditoría mostró que no se usa para cotizar y cuyo
número no sale del motor de precios. El cotizador que sí se usa es una CLI: un cliente MCP remoto no puede ejecutarla.
La decisión aceptada pone MCP después de la CLI y antes de la interfaz, con un límite fijo: un agente cotiza, registra y
prepara el documento; nunca aprueba, activa ni emite. Federar es parte de «listo»: una herramienta interna que no se
federa ni se excluye con razón escrita es deriva, y una herramienta registrada no es una herramienta que funciona.

## Goal

- Herramientas de lectura y simulación del cotizador V3 en el servidor MCP de Greenhouse y en el gateway, con su manual
  servido.
- La herramienta de registro lista y federada sólo cuando exista su clase de escritura; hasta entonces no se publica.
- Ninguna herramienta lleva un identificador de organización en su entrada, ni transporta un artefacto congelado.
- Aprobar, activar y emitir no existen como herramientas, y una prueba lo sostiene.
- `search_services` y `quote_price` conservan nombre, descripción y comportamiento.
- El canario del gateway en verde contra producción, después del release de Greenhouse que publica las rutas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PRICING_V3_PLATFORM_PROMOTION_DECISION_V1.md` (Accepted; puntos 7, 8 y 13 y las reglas
  duras).
- `docs/architecture/GREENHOUSE_PRICING_V3_PLATFORM_PROGRAM_PLAN_V1.md` (D6, D7, fase 7).
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md` (completo; §0, §5, §7, §8, §9 y §11 son puertas de
  esta task).
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md` (§11, §23, §26 y §27: clases de scope, manual servido,
  federación de Insights como plantilla).
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`.
- `docs/architecture/GREENHOUSE_MCP_TOOL_SELECTION_EVAL_V1.md`.
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` (carril de ecosistema, idempotencia, 404 en vez de 403
  para lo ajeno).
- `docs/architecture/GREENHOUSE_QUOTE_API_PARITY_DECISION_V1.md` (enmendada por la decisión de promoción: las
  superficies V2 siguen sirviendo hasta su retiro).

Reglas obligatorias:

- **NUNCA** exponer como herramienta la aprobación de una excepción, la activación del puntero ni la emisión.
- **NUNCA** poner un identificador de organización, de actor o un estado en el `inputSchema` de una herramienta: se
  derivan de la identidad.
- **NUNCA** lógica de precio en una herramienta, en su cliente HTTP ni en el gateway: la herramienta llama a una ruta
  y devuelve lo que la ruta entrega.
- **NUNCA** una proyección propia para la herramienta: lo que es para el cliente sale del único filtro que existe.
- **NUNCA** renombrar ni reescribir la descripción de `search_services` o `quote_price` en esta task.
- **NUNCA** cerrar un `insufficient_scope` ampliando el cliente PKCE público compartido.
- **NUNCA** editar a mano `tool-manifest.generated.json`, `skill-catalog.generated.json` ni el manifiesto generado del
  gateway.
- **NUNCA** un commit directo a `main` en el repo del gateway: PR, después de revisar el estado de su último despliegue.
- **SIEMPRE** desplegar el gateway después del release de Greenhouse que deja las rutas en `main`.
- **SIEMPRE** que una herramienta escriba, su clave de idempotencia viaja como cabecera del carril.
- **SIEMPRE** `writes` y `spendsProviderBudget` declarados por separado en el manifiesto.

## Normative Docs

- `.claude/skills/efeonce-mcp-platform/SKILL.md` (reglas duras y «Delivery loop») y `.claude/skills/mcp-craft/`.
- `docs/tasks/complete/TASK-1845-efeonce-insights-domain-evidence-and-module-adapters.md` y
  `docs/tasks/complete/TASK-1846-efeonce-insights-durable-artifact-rendering.md` (cómo se agregaron y federaron las
  herramientas de Insights, con evidencia).
- `AGENTS.md` del repo `efeonce-mcp` (protocolo de federación; se lee en el repo hermano).
- `docs/operations/runbooks/mcp-external-canary-certification.md`.
- `CLAUDE.md` §Cross-repo action safety.
- `docs/tasks/TASK_PROCESS.md`, `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`,
  `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`.
- Tasks hermanas: `docs/tasks/to-do/TASK-2026-quoter-v3-compute-api.md` (tabla de operaciones y audiencias) y
  `docs/tasks/to-do/TASK-2027-quoter-v3-registry-api.md`.

## Dependencies & Impact

### Depends on

- `TASK-2026` — rutas de cálculo y lectura bajo `/api/platform/ecosystem/quoter/**`, con su bandera
  `QUOTER_COMPUTE_API_ENABLED` y su tabla de errores.
- `TASK-2027` — rutas de registro y lectura de cotizaciones guardadas.
- `TASK-2028` — la paridad entre transportes en verde: las herramientas se montan sobre rutas ya probadas con el
  instrumento principal.
- El consumidor y el binding con que el gateway llama a Greenhouse (los existentes del gateway, documentados en la
  arquitectura MCP §26).
- Para el corte de escritura: la decisión de clase de scope (ver Detailed Spec, sección 4).

### Blocks / Impacts

- Unidad de retiro del cotizador actual de `EPIC-053`: ahí se decide el destino de `search_services`, `quote_price`, la
  herramienta `quote_price` de Nexa y la acción `author_quote`.
- Repo `efeonce-mcp`: versión del servidor, línea base de superficie, estado del gateway.
- Clientes MCP conectados: una herramienta nueva cambia la superficie y la caché de prompt.
- Si una ruta de `TASK-2026` o `TASK-2027` no sirve para un cliente MCP (ver «Requisitos sobre la API»), se deja un
  `## Delta` con su criterio en la task dueña; esta task **no crea rutas**.

### Files owned

- `src/mcp/greenhouse/tool-manifest.ts` (sólo las entradas del cotizador V3; edición serializada).
- `src/mcp/greenhouse/{server.ts,tools.ts,http-client.ts,types.ts}` (registro, manejadores y métodos de las
  herramientas nuevas).
- `src/mcp/greenhouse/tool-manifest.generated.json` y `src/mcp/greenhouse/skill-catalog.generated.json` (sólo por sus
  generadores).
- `src/mcp/greenhouse/skill-manifest.ts` y `docs/mcp/skills/efeonce-quoter/SKILL.md` (nuevo propuesto).
- `src/mcp/greenhouse/__tests__/quoter-tools.test.ts` (nuevo propuesto) y `scripts/mcp/tool-selection-fixture.ts`.
- `src/lib/auth-server/oauth/scopes.ts` y su prueba de paridad (sólo en el corte de escritura).
- En el repo hermano `efeonce-mcp`, por PR: `src/providers/greenhouse-quoter.ts` (nuevo propuesto),
  `src/providers/greenhouse-seo-tool-parity.ts` (entradas esperadas o excluidas), `src/mcp.ts`, `src/config.ts`,
  `src/providers/greenhouse-tool-manifest.generated.ts` (por sincronización),
  `scripts/greenhouse-quoter-canary.mjs` (nuevo propuesto), `surface-baseline.json`, `package.json` (versión),
  `AGENTS.md`.
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md` y
  `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md` (delta de esta federación).
- Skill `efeonce-mcp-platform` (con espejo) y skill `efeonce-pricing-operator` (cuándo usar MCP y cuándo la CLI).

## Current Repo State

### Already exists

- Servidor MCP interno `src/mcp/greenhouse/**`: `server.ts` registra recorriendo `tool-manifest.ts` (67 entradas al
  2026-10-12); `tools.ts`, `http-client.ts`; dominios `platform | webhooks | knowledge | commercial | seo | insights |
  brand`.
- Herramientas del motor V2 en el dominio `commercial`: `search_services` (`GET
  /api/platform/ecosystem/quotation/services`) y `quote_price` (`POST /api/platform/ecosystem/quotation/simulate`),
  las dos de lectura.
- Puertas: `pnpm mcp:manifest:generate|check`, `pnpm mcp:skills:generate|check` (dentro de `pnpm local:check`),
  prueba de fuga `src/mcp/greenhouse/__tests__/skill-manifest.test.ts`, cobertura de selección
  `src/mcp/greenhouse/__tests__/tool-selection-eval.test.ts`.
- Nueve manuales servidos bajo `docs/mcp/skills/**`.
- Clases de scope en `src/lib/auth-server/oauth/scopes.ts`: lectura base `efeonce.mcp.read`, lecturas
  `globe.read` y `hiring.read`, y seis de escritura (`globe.credits.funding.ensure`, `seo.write`, `identity.write`,
  `client_services.write`, `insights.write`, `brand.write`). **Ninguna de cotizaciones.**
- Gateway `efeonce-mcp` (repo hermano en `/Users/jreye/Documents/efeonce-mcp`): versión `1.10.0` y rama de trabajo
  `feat/task-1921-brand-render` al momento de planificar; despliegue por `workflow_dispatch`; providers por dominio;
  canarios `scripts/greenhouse-*-canary.mjs`; `pnpm greenhouse:manifest:sync`, `pnpm surface:baseline`, `pnpm check`.
- En el gateway, `search_services` y `quote_price` aparecen sólo en el manifiesto generado: ningún provider, lista de
  esperadas ni lista de excluidas las nombra (búsqueda sobre `src`, `test`, `scripts` y `AGENTS.md`).

### Gap

- No existe ninguna herramienta, manual ni provider del cotizador V3.
- No existe clase de escritura para cotizaciones, ni clase de lectura propia para costo y margen.
- El contrato de la CLI mueve el artefacto congelado en los dos sentidos; el más grande del repo mide cerca de 2,5 MB.
  Ese contrato no sirve como contrato de herramienta.
- Las dos herramientas V2 no están ni federadas ni excluidas con razón en el gateway.
- Las rutas de las que depende esta task son propuestas hasta que `TASK-2026` y `TASK-2027` cierren.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `src/mcp/greenhouse/**` dentro del portal Greenhouse y, para la federación, el repo hermano `efeonce-mcp` desplegado como Cloud Run `efeonce-mcp-gateway`.
- Future candidate home: `remain-shared`
- Boundary: cada herramienta es un cliente HTTP de una ruta de `/api/platform/ecosystem/quoter/**`; los commands y readers son de `src/lib/commercial/quoter/**` y el cálculo es de `src/lib/finance/pricing-v3/**`. Consumers autorizados: el servidor MCP interno y el provider del gateway.
- Server/browser split: sólo servidor; ningún esquema, manejador ni manual llega al navegador.
- Build impact: los manuales viajan como artefacto generado y no se leen del disco en tiempo de ejecución; ninguna dependencia nueva.
- Extraction blocker: el gateway resuelve contra rutas HTTP del carril de ecosistema y comparte consumidor, binding y configuración con otros providers; el manifiesto se sincroniza entre dos repos.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: ninguno. El inventario de herramientas es `src/mcp/greenhouse/tool-manifest.ts`; el registro de cotizaciones es de `TASK-2027`.
- Consumidores afectados: clientes MCP del servidor interno y del gateway; el eval de selección; la skill `efeonce-mcp-platform`.
- Runtime target: Vercel (rutas y servidor MCP remoto de Greenhouse) y Cloud Run `efeonce-mcp-gateway`.

### Contract surface

- Contrato existente a respetar: tabla de operaciones, forma de respuesta (`data.result`, `meta.exitCode`, `meta.audience`) y tabla de errores de `TASK-2026`; contrato de registro de `TASK-2027`; invariantes de superficie MCP.
- Contrato nuevo o modificado: entradas del manifiesto, esquemas de entrada y salida de las herramientas, un manual servido, un provider y un canario en el gateway, y una clase de scope en el corte de escritura.
- Backward compatibility: compatible. Sólo se agrega; `search_services` y `quote_price` no cambian.
- Full API parity: las herramientas no agregan capacidad: exponen por MCP lo que ya existe en el carril de ecosistema. Lo que no se expone queda declarado con su razón.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna tabla nueva. El corte de escritura crea filas en las tablas `greenhouse_commercial.quoter_*` a través de la ruta de registro de `TASK-2027`.
- Invariantes que no se pueden romper:
  - Ninguna herramienta del cotizador aprueba, activa ni emite.
  - Ninguna entrada de herramienta nombra organización, actor, piso, costo ni estado.
  - Una herramienta de lectura o simulación no deja filas en el registro.
  - `writes: true` sólo en la herramienta de registro; `spendsProviderBudget: false` en todas.
  - Los nombres y las descripciones de `search_services` y `quote_price` son idénticos antes y después.
- Write-target allowlist: no aplica a un cliente HTTP; las tablas las declara el dominio en `TASK-2025`/`TASK-2027`.
- Tenant/space boundary: la organización sale del binding del consumidor del gateway; el cliente al que se cotiza es un dato de la demanda que valida el servidor, no una autoridad.
- Idempotency/concurrency: la herramienta de registro recibe `idempotencyKey` y la reenvía como cabecera del carril con un prefijo propio, para que un reintento del gateway tras un timeout no duplique.
- Audit/outbox/history: los produce la ruta. La herramienta no agrega historial propio.

### Migration, backfill and rollout

- Migration posture: none.
- Default state: las herramientas responden con el bloqueo declarado mientras la bandera de la ruta esté apagada; el provider del gateway nace apagado.
- Backfill plan: ninguno.
- Rollback path: apagar el provider del gateway; revertir el PR del gateway y bajar su versión por el camino de su `AGENTS.md`; revertir las entradas del manifiesto en Greenhouse y regenerar.
- External coordination: PR y despliegue del gateway; release de Greenhouse previo; en el corte de escritura, alta del scope en la aplicación recurso de Entra.

### Security and access

- Auth/access gate: token del consumidor del gateway hacia el carril de ecosistema; scope OAuth del gateway por clase; la autoridad efectiva la decide Greenhouse por llamada.
- Sensitive data posture: las lecturas internas del cotizador llevan costo y margen. Qué audiencia cruza bajo el scope base es una decisión abierta de esta task (sección 4) y bloquea la federación.
- Error contract: tabla de errores de `TASK-2026`/`TASK-2027` traducida una vez; bandera apagada ⇒ bloqueo por política; recurso ajeno ⇒ 404; nunca un mensaje crudo.
- Abuse/rate-limit posture: límites del consumidor del gateway; la simulación no gasta proveedor.

### Runtime evidence

- Local checks: `pnpm mcp:manifest:check`, `pnpm mcp:skills:check`, pruebas de `src/mcp/greenhouse/__tests__`.
- DB/runtime checks: lectura del registro antes y después de una simulación (sin filas nuevas); en el corte de escritura, lectura de la cotización creada.
- Integration checks: carril de ecosistema contra staging con el consumidor del gateway (permitido, negado 404, sin token 401); canario del provider real contra staging y contra producción.
- Reliability signals/logs: `efeonce.gateway.status` con el provider nuevo y su estado.
- Production verification sequence: la de «Rollout Plan & Risk Matrix».

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Esta task no crea tablas ni destinos de escritura nuevos.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

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

### Slice 1 — Herramientas de lectura y simulación en Greenhouse

- Entradas del manifiesto, registro con esquemas de entrada y salida y las cuatro anotaciones, manejadores y métodos
  del cliente HTTP para las herramientas del primer corte.
- Artefacto del manifiesto regenerado; pruebas de las herramientas.

### Slice 2 — Manual servido y ruteo

- Manual `efeonce-quoter` escrito de cero para el consumidor MCP, su entrada en `skill-manifest.ts` y el artefacto
  regenerado.
- Casos en el fixture de selección para cada herramienta nueva y para la frontera con `quote_price` y
  `search_services`.

### Slice 3 — Federación del primer corte en el gateway

- En `efeonce-mcp`, por PR: sincronización del manifiesto, provider, registro, entradas esperadas o excluidas con
  razón, política para el emisor nativo, canario de lectura, estado del gateway, versión y línea base.
- Despliegue después del release de Greenhouse; canario contra producción.

### Slice 4 — Herramienta de registro (condicionada)

- Sólo con la decisión de clase de scope tomada: herramienta de registro en Greenhouse, clase en
  `src/lib/auth-server/oauth/scopes.ts` con su prueba de paridad, clase en el gateway, alta en Entra, federación y
  canario que **no** registra.
- Si la decisión no llega, este slice se cierra como diferido con su razón y la task puede completarse con el primer
  corte.

### Slice 5 — Documentación y cierre

- Delta en la arquitectura MCP y en los invariantes de superficie; skills al día; `EPIC-053` actualizada.

## Out of Scope

- Rutas, commands, readers o banderas del cotizador (`TASK-2026`, `TASK-2027`, `TASK-2029`).
- Herramientas para aprobar una excepción, activar el puntero, emitir, retirar o cambiar el catálogo.
- Renombrar, redescribir, retirar o redirigir `search_services` y `quote_price`; tocar la herramienta `quote_price` de
  Nexa o la acción `author_quote`. Todo eso pertenece a la unidad de retiro del cotizador actual de `EPIC-053`.
- Política para el emisor nativo (Efeonce ID v2) más allá de declarar las herramientas `unsupported` con razón.
- Acceso de clientes externos al cotizador y cualquier audiencia nueva.
- Ampliar el cliente PKCE público compartido o conceder la clase nueva a un cliente.
- Transportar un artefacto congelado dentro de una herramienta, o encadenar dos llamadas con el artefacto en medio.
- Un gate de CI con umbral de precisión sobre el eval de selección.

## Detailed Spec

### 1. Herramientas propuestas

Los nombres son propuesta: se cierran en la ejecución midiendo la selección (el nombre es la palanca; la prosa no le
gana). Cada una delega en una ruta del carril de ecosistema; si la ruta no existe, la herramienta no nace.

| Herramienta (propuesta) | Corte | `writes` | Ruta bajo `/api/platform/ecosystem/quoter` | Qué devuelve |
| --- | --- | --- | --- | --- |
| `get_quoter_current_versions` | 1 | no | `GET /versions/current` | Versiones y huellas vigentes y su verificación; nunca contenido. |
| `search_quoter_catalog` | 1 | no | `GET /catalog/search` y `GET /catalog/show` | Candidatos del catálogo por texto, clase y fecha. |
| `inspect_quoter_resources` | 1 | no | `GET /resources/inspect` | Recursos operativos y fechas de revisión de precios. |
| `scaffold_quote_demand` | 1 | no | `POST /compose/scaffold` | Preguntas y demanda a completar a partir de un brief. |
| `simulate_quote` | 1 | no | `POST /compose/quote` | Resumen de la simulación, estado, diagnósticos y versiones usadas. No registra. |
| `list_quotes` | 1 | no | `GET /quotes` | Cotizaciones registradas, paginadas. |
| `get_quote` | 1 | no | `GET /quotes/{quoteId}` | Una cotización, sus versiones con huella y su estado. |
| `get_quote_reading` | 1 | no | `GET /quotes/{quoteId}/versions/{n}/replay`, `/preview` y `/document` | Una lectura de una versión guardada: reproducción, vista apta para el cliente o datos del documento. |
| `register_quote` | 2 | sí | `POST /quotes` y `POST /quotes/{quoteId}/versions` | La API recalcula la demanda y guarda la versión; devuelve identificador, versión y huella. No emite ni asigna número. |

- Dominio del manifiesto: se propone uno nuevo, `quoter`, en vez de `commercial`, para que el gateway derive sus listas
  por dominio sin mezclar las dos herramientas V2. Se confirma en Discovery contra el guard de paridad del gateway.
- `spendsProviderBudget: false` en todas. Simular no compra nada.
- Anotaciones: lectura e idempotencia verdaderas en las de lectura; la de registro declara que escribe y que no es
  destructiva.
- El resumen que devuelve una herramienta dice, donde se toma la decisión, que una simulación calculada no es un precio
  aprobado ni una cotización emitida, y que el exit `3` de la ruta significa «calculada, bajo revisión».
- No se exponen por MCP `assess`, `split`, `schedule`, `cash`, `commitments` ni `increment` en esta task: sobre una
  versión guardada no tienen ruta por referencia y sobre un artefacto no caben en una herramienta. `compare` y
  `export` son sólo locales en `TASK-2026`. Quedan como seguimiento.
- Guardar los textos del documento (`POST …/document-texts`) es una segunda escritura posible para el corte 2; entra
  sólo si el operador la pide, con la misma clase de scope.

### 2. Entradas de las herramientas

- Ninguna clave de organización, inquilino, espacio, actor, piso, costo ni estado. Una prueba recorre `inputKeys` del
  manifiesto generado para el dominio del cotizador y falla ante una clave de esa familia.
- Las fuentes no se suben: sin argumento rigen las vigentes; un argumento opcional las fija por huella.
- La demanda y el brief viajan como objeto con el contrato de entrada que valida el servidor; la herramienta no
  completa ni corrige campos.
- `register_quote` exige `idempotencyKey`.
- Ningún argumento elige audiencia más amplia que la de la identidad. Pedir una más estrecha es válido.

### 3. Requisitos sobre la API (para verificar en Discovery)

- **El artefacto no cruza MCP.** El contrato de la CLI devuelve y recibe el artefacto congelado; un cliente MCP no
  puede sostener un documento de megabytes en su contexto. `TASK-2027` ya da lo necesario para no transportarlo:
  registro a partir de la demanda (filas 1 y 2) y lecturas por referencia para reproducir, vista previa y documento
  (filas 12 a 14). Por eso `register_quote` usa esas rutas y **no** las de registrar un artefacto local (filas 3 y 4),
  que son de la CLI. Falta confirmar: que `POST /compose/quote` permita omitir el artefacto en la respuesta, o que el
  manejador lo descarte sin reenviarlo; y que la lectura de versión (fila 11) nunca se pida con `include=artifact`.
  Lo que falte va como `## Delta` con criterio a la task dueña. Esta task no encadena dos llamadas con el artefacto en
  medio.
- Las lecturas internas por referencia distintas de esas tres (`assess`, `split`, `schedule`, `cash`, `commitments`)
  son seguimiento declarado de `TASK-2027`: no existen todavía y no se simulan aquí.
- Qué versiones puede nombrar un registro hecho por un agente (ver `TASK-2029`, versiones aplicadas y nunca activadas).
- Respuesta honesta con la bandera apagada, para traducirla a bloqueo por política y no a «no encontrado».

### 4. Decisiones de scope (con dueño)

**A. Clase de escritura para registrar.** No existe ninguna clase para cotizaciones. La regla del gateway es una clase
por tipo de alcance del daño, nunca una por capacidad. Opciones:

| Opción | Qué implica | Costo entre sistemas |
| --- | --- | --- |
| Clase nueva `efeonce.mcp.quoter.write` (propuesta) | Registrar una cotización es un artefacto con ciclo de vida propio y con cifras comerciales; no comparte clase con Insights ni con SEO | `src/config.ts` del gateway; paridad en `src/lib/auth-server/oauth/scopes.ts` y su prueba; alta del scope en la aplicación recurso «Efeonce MCP Resource» de Entra; ningún cliente la porta hasta un consentimiento gobernado, así que la herramienta queda cerrada por diseño |
| No publicar el registro por MCP en esta task | El registro por agente sigue disponible por la CLI de `TASK-2028` | Ninguno; se pierde el registro desde un cliente conversacional |
| Reutilizar una clase existente | Descartada: mezcla alcances de daño distintos | — |

Dueño de la decisión: CEO (si un agente conversacional registra y con qué alcance); ejecución en Entra y en el gateway:
Platform. Sin decisión, el Slice 4 queda diferido.

**B. Audiencia de las lecturas bajo el scope base.** Según `TASK-2026`, casi todas las operaciones son de audiencia
`internal` (llevan costo y margen) y sólo la vista previa y los datos del documento son `client_safe`. El consumidor
del gateway tiene binding interno y el carril de ecosistema no aplica una capacidad por persona: la única puerta que
depende de la persona es el scope del gateway. Bajo `efeonce.mcp.read`, toda persona que hoy pueda conectarse al
gateway interno vería costo y margen. Opciones:

| Opción | Qué implica |
| --- | --- |
| Primer corte sólo con lo que ya es `client_safe`, más estados y códigos de diagnóstico sin importes | No necesita scope nuevo; sirve para preparar y revisar una propuesta, no para leer margen |
| Lecturas internas bajo el scope base | No necesita scope nuevo; el operador acepta de forma explícita que la población con acceso al gateway interno ve costo y margen |
| Clase de lectura propia `efeonce.mcp.quoter.read`, como `globe.read` y `hiring.read` | Mismo costo entre sistemas que una clase de escritura; las lecturas internas quedan cerradas hasta un consentimiento gobernado |

Dueño: CEO. Qué población porta hoy el scope base no se determinó en esta planificación: se lee en Discovery y se le
presenta al operador con la decisión. **El Slice 3 no empieza sin esta decisión.**

### 5. Cadena en este repo

1. Ruta de ecosistema existente y probada (`TASK-2026`, `TASK-2027`).
2. Entrada en `src/mcp/greenhouse/tool-manifest.ts` con `domain`, `writes`, `spendsProviderBudget` y `purpose`; si el
   dominio es nuevo, se agrega al tipo `GreenhouseMcpToolDomain`.
3. `registerTool` en `server.ts` con esquema de entrada y de salida y anotaciones; manejador en `tools.ts`; método en
   `http-client.ts`.
4. `pnpm mcp:manifest:generate`; `pnpm mcp:manifest:check` en verde.
5. Manual `docs/mcp/skills/efeonce-quoter/SKILL.md` con frontmatter `name` y `description`, entrada en
   `skill-manifest.ts` con `audience: internal` y `appliesTo` con las herramientas nuevas; `pnpm
   mcp:skills:generate`; `pnpm mcp:skills:check` y la prueba de fuga en verde. El manual no cita ids de task, rutas del
   repo, identificadores de organización, secretos ni nombres de clientes.
6. Casos en `scripts/mcp/tool-selection-fixture.ts`; `tool-selection-eval.test.ts` en verde. `pnpm
   mcp:selection-eval` se corre una vez para medir y su resultado se registra; no es puerta.
7. Pruebas de manejadores: permitido, negado, bandera apagada, sin escritura en lectura, clave de idempotencia
   reenviada.

### 6. Cadena en el repo del gateway

Antes de tocar nada: leer `AGENTS.md` del gateway, el estado de su último despliegue (`gh run list --workflow
deploy.yml`) y su rama actual; no mover trabajo ajeno en ese checkout.

1. `pnpm greenhouse:manifest:sync` (nunca a mano).
2. Provider `src/providers/greenhouse-quoter.ts` y sus tipos. Decidir si cabalga la configuración del provider SEO
   (comparte interruptor, cero variables nuevas, como Insights) o lleva interruptor propio (una variable más en
   `deploy.yml`, se puede apagar solo). Propuesta: interruptor propio, apagado por defecto, por ser cifras comerciales.
3. `registerTool` en `src/mcp.ts` con la descripción **derivada** (`greenhouseToolDescription(name)`), nunca copiada.
4. Entradas en `EXPECTED_GREENHOUSE_PLATFORM_TOOLS` con razón sustantiva por herramienta; lo que no cruza va en la
   lista de excluidas con razón, nunca simplemente ausente.
5. Política para el emisor nativo: las herramientas del cotizador se declaran `unsupported` con una razón propia.
6. Canario `scripts/greenhouse-quoter-canary.mjs`: versiones vigentes, búsqueda de catálogo, una simulación (no deja
   filas), negativa 404 y 401 sin token. **Nunca registra.**
7. `efeonce.gateway.status` lista el provider en el mismo PR, con una prueba que lo llama por el servidor construido.
8. Versión en `package.json`: agregar herramientas es una versión menor sobre la vigente al momento de ejecutar.
   `pnpm surface:baseline`. `pnpm check` en verde.
9. PR. Despliegue por `workflow_dispatch` **después** del release de Greenhouse; lectura de `efeonce.gateway.status`
   real y canario contra producción.

### 7. Convivencia con las herramientas V2

- `search_services` y `quote_price` siguen existiendo, con el mismo nombre, la misma descripción y la misma ruta
  (`/api/platform/ecosystem/quotation/**`, motor V2).
- Por qué no se renombran ni se redescriben aquí: editar la descripción de una herramienta cambia qué decide llamar un
  agente e invalida la caché de prompt de los clientes; un renombre es un cambio mayor de versión en el gateway; y está
  medido que agregar prosa de ruteo no mejora la selección y degrada la de las vecinas. Además, decidir qué pasa con
  ellas es decidir el retiro del cotizador actual, que tiene su propia unidad y su propia decisión en `EPIC-053`.
- Consecuencia que hay que declarar: el invariante de ruteo pide que una herramienta nueva que contesta lo mismo que
  otra nazca con el criterio de elección en la descripción **de las dos**. Esta task lo cumple del lado nuevo
  (descripción de las herramientas nuevas, manual y fixture) y deja el lado V2 sin tocar a propósito. La excepción
  queda escrita en el delta de los invariantes, con dueño (unidad de retiro) y condición de cierre.
- En el gateway, las dos V2 no están federadas ni excluidas con razón. En el mismo PR se declaran en la lista de
  excluidas con su razón (motor V2, en retiro), salvo que Discovery encuentre que ya están declaradas en otro lugar.
  Declarar una exclusión no cambia la superficie.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 5. El Slice 4 es condicional y puede cerrarse como diferido.
- La decisión B de la sección 4 es previa al Slice 3. La decisión A es previa al Slice 4.
- El release de Greenhouse que deja las rutas y las entradas del manifiesto en `main` va antes del despliegue del
  gateway.
- El PR del gateway no se abre con el `pnpm check` en rojo ni sobre un despliegue previo fallido sin entender por qué.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Costo y margen visibles para quien no debe | gateway / identidad | medium | Decisión B antes de federar; audiencia declarada por la ruta; ningún argumento amplía audiencia | lectura interna servida a una identidad no prevista en el canario de negativa |
| Un agente aprueba, activa o emite por MCP | registro | low | Esas herramientas no existen; prueba sobre el manifiesto; las rutas tampoco existen en ecosistema | entrada del manifiesto con ese verbo |
| El agente elige `quote_price` (V2) cuando se le pide cotizar | selección | medium | Nombres medidos, casos en el fixture, criterio en el manual; lado V2 documentado como excepción | regresión en el eval de selección |
| El gateway se despliega antes que las rutas | gateway | medium | Orden fijo; canario contra producción como puerta | canario con `not_found` o `provider_unavailable` |
| Registro duplicado por reintento del gateway | registro | low | Clave de idempotencia obligatoria y reenviada como cabecera del carril | dos cotizaciones con la misma huella y distinto número |
| Se amplía el cliente PKCE compartido para destrabar un `insufficient_scope` | identidad | low | Regla dura; revisión del PR del gateway | cambio en la lista de scopes del cliente público |
| Un manual publica contenido interno | manual servido | low | Escrito de cero; prueba de fuga | `skill-manifest.test.ts` en rojo |
| El commit en el repo hermano dispara o rompe un despliegue | gateway | low | PR, lectura previa del estado del despliegue, despliegue manual | corrida de `deploy.yml` en error |
| Una herramienta carga megabytes al contexto | cliente MCP | medium | El artefacto no cruza; requisitos de la sección 3 | tamaño de respuesta en las pruebas de manejador |

### Feature flags / cutover

- Greenhouse no agrega una variable `*_ENABLED`: las herramientas dependen de las banderas de las rutas
  (`QUOTER_COMPUTE_API_ENABLED` y la de `TASK-2027`). Con la bandera apagada la herramienta responde el bloqueo por
  política, no un error genérico.
- Gateway: interruptor del provider apagado por defecto, declarado en su `deploy.yml` si es propio. Encenderlo es el
  cutover; apagarlo es la reversa inmediata.
- Corte de escritura: la clase existe en Entra y ningún cliente la porta hasta un consentimiento gobernado; eso no es
  un defecto, es el estado esperado.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Quitar las entradas del manifiesto y el registro, regenerar el artefacto | minutos | sí |
| Slice 2 | Quitar el manual y su entrada, regenerar el catálogo | minutos | sí |
| Slice 3 | Apagar el provider; revertir el PR y redesplegar la revisión anterior del gateway | menos de 30 minutos | sí; el cambio de versión del servidor queda en el historial |
| Slice 4 | Apagar el provider o quitar la herramienta; el scope en Entra puede quedar sin uso; las cotizaciones registradas se conservan | menos de 30 minutos | parcial: lo registrado no se borra |
| Slice 5 | Revertir documentos | minutos | sí |

### Production verification sequence

1. Local: `pnpm mcp:manifest:check`, `pnpm mcp:skills:check`, pruebas de herramientas y de fuga, `pnpm local:check`.
2. Staging, carril de ecosistema con el consumidor del gateway: cada herramienta del primer corte permitida; negativa
   404; 401 sin token; bandera apagada ⇒ bloqueo; ninguna fila nueva en el registro tras simular.
3. Gateway en su repo: `pnpm check`; canario con el provider real contra staging.
4. Release de Greenhouse por el control plane.
5. Despliegue del gateway; `efeonce.gateway.status` real con el provider; canario contra producción.
6. `search_services` y `quote_price` responden igual que antes (comparación de `tools/list` y de una llamada a cada
   una).
7. Corte de escritura, si aplica: alta del scope en Entra con lectura de vuelta de los scopes previos intactos; la
   herramienta responde `insufficient_scope` sin el scope; el registro se prueba sólo con un token humano que porte la
   clase y con una cotización marcada como sintética.

### Out-of-band coordination required

- Decisiones A y B del operador.
- PR, revisión y despliegue en el repo `efeonce-mcp`; aviso a quien tenga trabajo en ese checkout.
- Release de Greenhouse antes del despliegue del gateway.
- Alta del scope en la aplicación recurso de Entra (corte de escritura), por quien tenga ese permiso.
- Aviso a la sesión que lleve el retiro del cotizador actual: hereda la excepción de ruteo de la sección 7.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Cada herramienta nueva tiene entrada en `tool-manifest.ts` con `writes` y `spendsProviderBudget` declarados, y
      `pnpm mcp:manifest:check` queda en verde con el artefacto regenerado.
- [ ] Sólo la herramienta de registro declara `writes: true`; todas declaran `spendsProviderBudget: false`.
- [ ] Ninguna herramienta del cotizador tiene en su entrada una clave de organización, inquilino, espacio, actor, piso,
      costo o estado (prueba sobre el manifiesto generado).
- [ ] El manifiesto no contiene ninguna herramienta que apruebe una excepción, active el puntero o emita, y una prueba
      falla si aparece.
- [ ] Cada herramienta delega en una ruta de `/api/platform/ecosystem/quoter/**` y su manejador no contiene cálculo ni
      proyección (revisión y prueba de que la salida es la de la ruta).
- [ ] Simular por la herramienta no crea filas en el registro (lectura antes y después).
- [ ] Ninguna herramienta devuelve ni recibe un artefacto congelado; la respuesta más grande de las pruebas queda bajo
      un tope declarado.
- [ ] Con la bandera de la ruta apagada, la herramienta responde el bloqueo por política; un recurso ajeno responde
      404; sin token, 401.
- [ ] El manual `efeonce-quoter` está declarado y servido, gobierna a todas las herramientas nuevas, y la prueba de
      fuga y `pnpm mcp:skills:check` quedan en verde.
- [ ] Cada herramienta nueva tiene su caso en el fixture de selección, incluida la frontera con `quote_price` y
      `search_services`, y `tool-selection-eval.test.ts` queda en verde.
- [ ] El nombre, la descripción y el comportamiento de `search_services` y `quote_price` son idénticos antes y después
      (comparación del manifiesto generado y una llamada a cada una en staging).
- [ ] La excepción al invariante de ruteo (lado V2 sin tocar) queda escrita con su dueño y su condición de cierre.
- [ ] La decisión B está registrada con la respuesta del operador antes de federar, y las herramientas federadas
      respetan esa audiencia.
- [ ] En el gateway: cada herramienta federada tiene su entrada esperada con razón; lo no federado, su exclusión con
      razón; las dos V2 quedan declaradas; el emisor nativo las recibe como `unsupported` con razón.
- [ ] `efeonce.gateway.status` lista el provider nuevo, con una prueba que lo llama por el servidor construido.
- [ ] La versión del gateway sube y `surface-baseline.json` se actualiza por su script; `pnpm check` en verde.
- [ ] Todo cambio en `efeonce-mcp` entró por PR, después de leer el estado de su último despliegue; ningún commit
      directo a `main`.
- [ ] El gateway se desplegó después del release de Greenhouse que publica las rutas, y el canario de lectura pasó
      contra producción.
- [ ] El canario no registra ninguna cotización.
- [ ] Corte de escritura: o bien la clase existe en `scopes.ts`, en el gateway y en Entra, la herramienta reenvía la
      clave de idempotencia y responde `insufficient_scope` sin la clase; o bien el Slice 4 quedó diferido con la
      decisión A registrada.
- [ ] El cliente PKCE público compartido no cambió.

## Verification

- `pnpm task:lint --task TASK-2030`
- `pnpm mcp:manifest:check` y `pnpm mcp:skills:check`
- `pnpm vitest run src/mcp/greenhouse`
- `pnpm vitest run src/lib/auth-server` (corte de escritura)
- `pnpm local:check`, `pnpm skills:mirrors`
- En `efeonce-mcp`: `pnpm check`, `node scripts/greenhouse-quoter-canary.mjs` contra staging y producción
- `pnpm staging:request` para ejercitar el carril de ecosistema
- `pnpm qa:gates --changed`, `pnpm docs:closure-check`
- `pnpm test` completo y `pnpm build` como puerta de cierre; el build pide autorización del operador en esta máquina.
- Después de editar contexto o handoff: `pnpm docs:context-check:strict`.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Documentación técnica: delta en `GREENHOUSE_MCP_ARCHITECTURE_V1.md` y en
      `MCP_TOOL_SURFACE_INVARIANTS.md` (herramientas, clase de scope, excepción de ruteo), y `AGENTS.md` del gateway.
- [ ] Documentación funcional: qué puede hacer un agente por MCP con el cotizador y qué no, en
      `docs/documentation/finance/`.
- [ ] Manual: el manual servido `efeonce-quoter` y, en el manual del cotizador, cuándo usar MCP y cuándo la CLI.
- [ ] Skills `efeonce-mcp-platform` y `efeonce-pricing-operator` al día, con espejo.
- [ ] `EPIC-053` actualizada, con la excepción de ruteo anotada en su unidad de retiro del cotizador actual.
- [ ] El estado se reporta como «code complete, rollout pendiente» mientras el gateway no esté desplegado y su canario
      en verde contra producción.

## Follow-ups

- Retiro del cotizador actual (`EPIC-053`): destino de `search_services`, `quote_price`, herramienta de Nexa y
  `author_quote`; cierre de la excepción de ruteo.
- Lecturas internas adicionales por MCP (`split`, `schedule`, `cash`, `commitments`, `increment`) si hacen falta.
- Política para el emisor nativo y consentimiento gobernado de la clase nueva.
- Declaración de paridad de capacidades del dominio comercial (federada, interna a propósito o pendiente), como la que
  ya existe para Hiring.

## Open Questions

- Decisión A: ¿registrar por MCP con clase nueva `efeonce.mcp.quoter.write`, o dejar el registro sólo en la CLI por
  ahora?
- Decisión B: ¿qué audiencia cruza bajo el scope base: sólo lo `client_safe`, lo interno con aceptación explícita, o
  una clase de lectura propia?
- ¿Dominio nuevo `quoter` en el manifiesto o reutilizar `commercial`?
- ¿El provider del gateway lleva interruptor propio o comparte el del provider SEO?
- ¿Agregar un manual a la descripción de `get_greenhouse_skill` se trata en el gateway como cambio menor (como en la
  federación de Insights) o mayor? Lo define el `AGENTS.md` del gateway al momento de ejecutar.

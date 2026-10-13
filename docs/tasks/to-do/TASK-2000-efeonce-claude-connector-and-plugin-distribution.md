# TASK-2000 — Efeonce en Claude: conector + plugin `efeonce`, distribución individual hoy y de organización mañana

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
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
- Epic: `EPIC-044`
- Status real: `Diseno`
- Rank: `U23`
- Domain: `platform|identity`
- Blocked by: `none`
- Branch: `Greenhouse develop (docs); repo de distribución del plugin con rama + PR; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hoy cada persona conecta Efeonce MCP a Claude a mano y por superficie: dos registros locales de Claude Code contra la
misma URL, más un conector hospedado de claude.ai que quedó con descripción de canary. Esta task establece la forma
canónica que documenta Anthropic: el servidor `https://mcp.efeonce.org/mcp` como **conector** y un **plugin `efeonce`**
que lo referencia por la misma URL y agrega la skill que enruta a los manuales. El plugin se instala una vez y llega a
chat (web, Desktop, móvil), Cowork y Claude Code. Fase A: cuentas individuales, sin plan Team. Fase B: el Owner de un
plan Team/Enterprise agrega el conector de organización y sincroniza el plugin como obligatorio.

## Why This Task Exists

Discovery 2026-10-04 con tres subagentes y lectura directa de la documentación oficial de Anthropic:

1. **No existe artefacto de distribución.** Cero `.claude-plugin/plugin.json`, `marketplace.json`, `.mcp.json` o `.mcpb`
   en `greenhouse-eo` y `efeonce-mcp`. El único camino documentado es manual: `claude mcp add` en Claude Code
   (`docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md:1061`) y un conector personalizado en claude.ai
   (`docs/manual-de-uso/identity/usar-mcp-interno-multiorganizacion.md:61-71`).
2. **El estado local está duplicado.** En `~/.claude.json` (scope user) hay `efeonce-mcp` y `efeonce-internal`, ambos
   `type: http` contra `https://mcp.efeonce.org/mcp`, con familias OAuth distintas (callback 18432 y 18444). A eso se suma
   el conector hospedado «Efeonce MCP», que Claude Code también ve. El mismo servidor puede aparecer tres veces en una
   sesión.
3. **El conector hospedado no está sano.** La auditoría `docs/audits/mcp/2026-09-26-openai-plugin-readiness/README.md`
   (:37, :52) lo encontró con descripción de canary y respondiendo `UNAUTHORIZED`; la caché local de Claude Code lo marca
   `needs-auth` desde 2026-09-29. Hay además entradas huérfanas (`task1832-efeonce-canary`, `Efeonce_MCP`).
4. **Los manuales no actúan como skills.** Los 9 manuales (`src/mcp/greenhouse/skill-manifest.ts`, audiencia `internal`)
   llegan sólo si el modelo decide llamar `get_greenhouse_skill`. Una skill de plugin se carga por su `description`
   cuando la tarea coincide, en chat, Cowork y Claude Code.
5. **El plan vigente quedó corto frente al producto actual.** `TASK-1864` Slice 4 prevé un plugin sólo para Claude Code y
   «guía de conector personalizado, sin skills» para claude.ai. Desde la documentación vigente
   (`claude.com/docs/plugins/overview`, `/platform-support`, `/build`, `/admin`; leídas 2026-10-04), un plugin agregado en
   **Customize > Plugins** se guarda en la cuenta y queda disponible en chat, Cowork y Claude Code; un plugin instalado
   desde la CLI de Claude Code queda sólo en esa máquina.

Lo que Anthropic documenta y esta task adopta (verificado en fuente, 2026-10-04):

- Para un producto propio: **servidor como conector + plugin cuyas skills enseñan a usarlo**, con la **misma URL** en el
  `.mcp.json` del plugin para que quien tenga ambos vea un solo juego de tools (`/docs/plugins/build`, §Bundle an MCP
  connector with its skill; `/docs/directory/publish`).
- Agregar un plugin **no agrega ni conecta el conector**: el conector se agrega aparte y cada persona lo conecta con su
  cuenta. En Team/Enterprise lo agrega el Owner en **Organization settings > Connectors** (`/docs/plugins/overview`,
  §Bundled connectors; `/docs/plugins/admin`).
- En Team/Enterprise el Owner sincroniza un repositorio marketplace (**Sync from GitHub**, sin que los miembros necesiten
  acceso al repo) y fija **Not available / Available to install / Installed by default / Required**.
- Un `bin/` en la raíz del plugin hace que claude.ai y Cowork **rechacen** la instalación.
- Las extensiones de escritorio (`.mcpb`) ya no se aceptan en el directorio; no son el camino para un servidor remoto.

## Goal

- Un plugin `efeonce` versionado, validado con `claude plugin validate --strict`, que referencia
  `https://mcp.efeonce.org/mcp` y trae una skill router sin cuerpos de manuales.
- Fase A operativa: cualquier persona del equipo, con cuenta individual, conecta el conector una vez y agrega el plugin
  por un camino documentado; queda una sola conexión por superficie, sin duplicados ni conectores de canary.
- Fase B lista para ejecutar el día que Efeonce pase a Team/Enterprise: runbook de Owner probado en la medida en que lo
  permita el plan disponible, sin rediseñar el paquete.
- Certificación por host y versión (chat web, Desktop, móvil, Cowork, Claude Code) registrada en la matriz de
  `client-certification.md`, incluido el comportamiento con la misma URL en conector y plugin.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- Skill `efeonce-mcp-platform` (`.claude/skills/efeonce-mcp-platform/SKILL.md`) y su referencia
  `references/client-certification.md`; skill `mcp-craft` para la forma de la skill router.

Reglas obligatorias:

- **Una sola URL canónica.** El plugin y el conector apuntan a `https://mcp.efeonce.org/mcp`; nunca un alias ni un
  segundo recurso OAuth.
- **El paquete no concede autoridad.** Bootstrap `efeonce.mcp.read` únicamente; ningún scope de escritura se declara,
  fija ni sugiere en el plugin. Los scopes de escritura siguen la regla de la skill: nunca en un cliente público
  compartido.
- **Cero secretos en el paquete.** Quien instala recibe sus archivos (`/docs/plugins/build`): sin tokens, headers
  estáticos, IDs de organización, rutas internas ni nombres de secretos.
- **La skill router sólo enruta.** No copia cuerpos de manuales; el manifiesto `src/mcp/greenhouse/skill-manifest.ts`
  sigue siendo la única fuente. Un test rechaza el paquete si nombra un manual inexistente o incluye su cuerpo.
- **Sin `bin/`, sin servidor local, sin hooks** en el plugin de fase A/B: deben instalar en chat y Cowork.
- **Certificación por host y versión**, nunca genérica (`client-certification.md`). Un conector visible no prueba nada;
  se exige login, `tools/list` y una `tools/call` de lectura por superficie.

## Normative Docs

- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md` (§Claude Code, :1053-1075)
- `docs/manual-de-uso/identity/usar-mcp-interno-multiorganizacion.md`
- `docs/documentation/plataforma/efeonce-mcp-gateway.md`
- `docs/documentation/plataforma/manuales-mcp-servidos-por-el-protocolo.md`
- `docs/audits/mcp/2026-09-26-openai-plugin-readiness/README.md`
- Documentación de Anthropic (fuente externa, releer al tomar la task): `claude.com/docs/plugins/overview`,
  `/plugins/platform-support`, `/plugins/build`, `/plugins/admin`, `/plugins/org-sync`, `/directory/publish`;
  `code.claude.com/docs/en/plugins-reference` y `/plugins/create-marketplace`.

## Dependencies & Impact

### Depends on

- Gateway en producción con emisor nativo Efeonce ID y PRM base-only (`TASK-1813`, vigente).
- Manifiesto de manuales `src/mcp/greenhouse/skill-manifest.ts` y tool `get_greenhouse_skill` (vigentes).
- Familia OAuth hospedada de Claude certificada en `TASK-1832` (callback `https://claude.ai/api/mcp/auth_callback`).

### Blocks / Impacts

- `TASK-1864`: esta task toma la mitad Claude de su Slice 4 (plugin Claude Code y guía claude.ai). `TASK-1864` conserva
  instructions del gateway, contrato `next`, digest, router Codex y eval de agentes; el plugin consume sus instructions
  cuando existan, sin depender de ellas para cerrar. Se deja `## Delta` en `TASK-1864`.
- `TASK-1904`: dueña del paquete OpenAI (Codex/ChatGPT) y de MCP Events para Claude. Sin solape: esta task no toca Events
  ni el paquete OpenAI; ambas comparten la regla de skill router sin copia de manuales.
- `TASK-1841` y `TASK-1838`: la variante para clientes y la ficha del directorio quedan como follow-up bloqueado por el
  piloto del primer cliente consentido.

### Files owned

- Repo de distribución del plugin (decisión del Slice 0): `efeoncepro/efeonce-claude-plugins` (nuevo, propuesto) o
  `efeonce-mcp/client-kit/claude-plugin/**`. Contenido: `.claude-plugin/marketplace.json`,
  `plugins/efeonce/.claude-plugin/plugin.json`, `plugins/efeonce/.mcp.json`, `plugins/efeonce/skills/efeonce-mcp/SKILL.md`,
  `README.md`, `LICENSE`, test de contenido y CI de validación.
- `.claude/skills/efeonce-mcp-platform/references/client-certification.md` y su espejo `.codex/` (filas nuevas).
- `docs/manual-de-uso/plataforma/conectar-efeonce-en-claude.md` (nuevo).
- `docs/manual-de-uso/identity/usar-mcp-interno-multiorganizacion.md` (sección Claude apunta al manual nuevo).
- `docs/documentation/plataforma/efeonce-mcp-gateway.md` (sección distribución a clientes Claude).
- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md` (runbook de Owner, fase B).

## Current Repo State

### Already exists

- Gateway `efeonce-mcp` `v1.10.0`, 74 tools, PRM con un solo authorization server y scope base.
- Marca del servidor en `efeonce-mcp/src/branding.ts` e ícono `efeonce-mcp/assets/icon-512.png` (reutilizable como
  `icon` del plugin para una futura ficha de directorio; Claude no renderiza `icons` de conectores personalizados).
- 9 manuales servidos por `get_greenhouse_skill` y por `skill://efeonce/<name>/SKILL.md`, todos `audience: internal`.
- Plan de kit en `docs/tasks/to-do/TASK-1864-mcp-self-sufficient-agent-surface.md` (Slice 4), sin implementar.

### Gap

- No hay plugin, marketplace ni camino de instalación de un solo paso para Claude.
- No hay inventario ni limpieza de las conexiones existentes (dos registros locales, conector hospedado de canary,
  entradas huérfanas).
- No hay evidencia de cómo se comporta la misma URL declarada en conector y plugin, ni de cómo autentica Claude Code el
  servidor que llega dentro de un plugin sincronizado desde la cuenta.
- No hay runbook de Owner para cuando Efeonce tenga plan Team/Enterprise.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `repositorio de distribución del plugin (efeonce-claude-plugins propuesto) + docs en greenhouse-eo`
- Future candidate home: `remain-shared`
- Boundary: `el plugin sólo referencia el gateway público y la tool get_greenhouse_skill; no importa código de greenhouse-eo ni de efeonce-mcp`
- Server/browser split: `n/a (paquete de Markdown y JSON que interpreta el cliente Claude)`
- Build impact: `none para greenhouse-eo; el repo de distribución tiene su propio CI de validación`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`. No agrega superficie OAuth, tools ni escrituras; integra un cliente externo con el
  contrato de autenticación existente, y una falla expone o duplica acceso de personas reales.
- Impacto principal: `integration` (cliente Claude ↔ gateway público).
- Source of truth afectado: ninguno nuevo. Autoridad = emisor Efeonce ID + policies del gateway; procedimientos =
  manifiesto de manuales en Greenhouse.
- Consumidores afectados: chat claude.ai (web, Desktop, móvil), Cowork, Claude Code.
- Runtime target: `external` (cuentas Claude del equipo) contra gateway de producción.

### Contract surface

- Contrato existente a respetar: PRM `/.well-known/oauth-protected-resource`, OAuth 2.1 + PKCE S256 del emisor
  `auth.efeonce.org`, `initialize`/`tools/list`/`tools/call`, `get_greenhouse_skill`, `efeonce.organizations.list`.
- Contrato nuevo: paquete `efeonce` (manifiesto `plugin.json`, `.mcp.json` con `type: http` y la URL canónica, skill
  `efeonce-mcp`) y `marketplace.json`. Versionado independiente del gateway.
- Backward compatibility: `compatible`. Las conexiones manuales siguen funcionando; la limpieza es explícita y por persona.
- Full API parity: el plugin no crea capacidades; consume las tools existentes. Sin endpoints específicos de Claude.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna.
- Invariantes que no se pueden romper:
  - Una persona ve un solo juego de tools de Efeonce por superficie después de migrar.
  - El paquete no contiene secretos, IDs de organización, tokens, rutas internas ni cuerpos de manuales.
  - El plugin no pide scopes más allá de `efeonce.mcp.read`; el acceso por organización sigue resolviéndose por llamada.
  - La skill nombra sólo manuales presentes en el manifiesto vigente.
- Write-target allowlist: `N/A`.
- Tenant/space boundary: sin cambio; v2 resuelve el target por llamada con `organizationId` exacto.
- Idempotency/concurrency: `N/A`; reinstalar el plugin o reconectar el conector no duplica estado en el servidor.
- Audit/outbox/history: sin cambio; el gateway ya registra correlación por llamada.

### Migration, backfill and rollout

- Migration posture: `none`.
- Default state: plugin opt-in en fase A (cada persona lo agrega); en fase B `Installed by default` y luego `Required`
  tras certificar.
- Backfill plan: migración de conexiones por persona (inventario → conectar nuevo → verificar → retirar duplicados), sin
  tocar familias OAuth del servidor.
- Rollback path: deshabilitar o quitar el plugin en Customize > Plugins (fase A) o `Not available` en la organización
  (fase B); el conector personal sigue operativo.
- External coordination: cuenta GitHub de la organización para el repo de distribución; Claude GitHub App si el repo es
  privado; Owner del plan Team/Enterprise en fase B.

### Security and access

- Auth/access gate: OAuth por persona contra Efeonce ID; sin credencial compartida.
- Sensitive data posture: sin datos sensibles en el paquete. La evidencia de certificación se sanitiza (sin tokens,
  `client_id` completos ni IDs de organización de clientes).
- Error contract: sin cambio; la skill enseña a distinguir sesión expirada, acceso denegado y capacidad no disponible.
- Abuse/rate-limit posture: sin cambio; el gateway aplica sus límites. Un repo público expone sólo la URL y la skill
  router, información que ya entrega `tools/list` tras autenticar.

### Runtime evidence

- Local checks: `claude plugin validate --strict` sobre el paquete; test de contenido (sin `bin/`, sin secretos, manuales
  existentes, URL canónica única); `claude --plugin-dir` con `/mcp` mostrando el servidor conectado.
- DB/runtime checks: `N/A`.
- Integration checks: por superficie, login OAuth + `tools/list` + `efeonce.organizations.list` +
  `get_greenhouse_skill` sin `name`, con versión del cliente y timestamp.
- Reliability signals/logs: logs del gateway con correlación de las llamadas de certificación; ninguna señal nueva.
- Production verification sequence: ver Rollout Plan.

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumidores nombrados con paths reales.
- [ ] Invariantes, frontera de tenant e idempotencia explícitos.
- [ ] Postura de migración y rollback proporcional al riesgo.
- [ ] Evidencia por superficie registrada en `client-certification.md`.
- [ ] Ningún secreto ni dato privado en el paquete ni en la evidencia distribuida.

### Capability Definition of Done — Full API Parity gate

No aplica como capability nueva: el plugin es un consumidor más de tools existentes. Ninguna acción de negocio vive en la
skill; la skill sólo ordena el uso de tools gobernadas y exige confirmación humana antes de cualquier escritura o gasto.

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

### Slice 0 — Decisión de repositorio e inventario de conexiones

- Decidir el hogar del marketplace y registrar la decisión en el runbook: repo dedicado `efeoncepro/efeonce-claude-plugins`
  (recomendado, porque la sincronización de organización y «Add marketplace» dan a la Claude GitHub App acceso al repo
  completo y no conviene exponer el código del gateway) o `efeonce-mcp/client-kit/claude-plugin/**`. Decidir también
  privado o público según la pregunta abierta 1.
- Inventario sanitizado de las conexiones Efeonce existentes del operador por superficie: registros locales de Claude
  Code, conector hospedado, entradas huérfanas en la caché `needs-auth`. Registrar qué se conserva y qué se retira.

### Slice 1 — Paquete `efeonce` y validación

- `marketplace.json` con una entrada `efeonce`; `plugin.json` con `name: efeonce`, `displayName: Efeonce`, `version`,
  `description`, `author`, `license`, `homepage`, sin `bin/`, hooks ni servidores locales.
- `.mcp.json` con `{"mcpServers": {"efeonce": {"type": "http", "url": "https://mcp.efeonce.org/mcp"}}}`. Verificar si la
  versión vigente de Claude Code admite fijar `oauth.scopes` en un `.mcp.json` de plugin; si lo admite, fijar
  `efeonce.mcp.read` como en la certificación de Claude Code.
- `README.md` (≥ 40 palabras: qué hace, cómo usarlo, qué datos envía) y `LICENSE` o campo `license`.
- CI del repo: `claude plugin validate --strict` + test de contenido (sin `bin/`, sin secretos, URL única).

### Slice 2 — Skill router `efeonce-mcp`

- `skills/efeonce-mcp/SKILL.md` con `description` escrita como situaciones del usuario (SEO, AEO, Insights, Marketing
  Studio, habilitación de servicios, Hiring de lectura).
- Cuerpo: elegir la organización con `efeonce.organizations.list` y pasar `organizationId` exacto; cargar el manual con
  `get_greenhouse_skill` antes de operar un dominio; proponer la lista exacta y esperar confirmación humana antes de una
  escritura o gasto; leer outcomes por elemento; cómo esperar un run asíncrono; qué hacer ante `insufficient_scope`,
  sesión expirada o `policy_blocked`.
- Test que valida los nombres de manuales contra el manifiesto vigente (`pnpm mcp:skills:check` o lectura del artefacto
  generado) y que falla si aparece el cuerpo de un manual.
- Medir la skill con `claude plugin eval` contra la línea base sin plugin en al menos dos escenarios de lectura.

### Slice 3 — Fase A: distribución individual y migración del equipo

- Manual `docs/manual-de-uso/plataforma/conectar-efeonce-en-claude.md`: agregar el conector personalizado «Efeonce» con la
  URL canónica, conectarlo con la cuenta Microsoft de Efeonce, agregar el plugin (marketplace o zip de release),
  `/reload-plugins` en Claude Code, quitar duplicados (`claude mcp remove efeonce-mcp -s user`,
  `claude mcp remove efeonce-internal -s user` tras verificar el plugin) y reemplazar el conector hospedado de canary.
- Ejecutar la migración en la cuenta del operador y dejar una sola conexión por superficie.
- Publicar el zip de cada versión como release del repo de distribución, para quien no tenga GitHub.

### Slice 4 — Certificación por superficie

- Matriz en `client-certification.md`: chat web, Desktop, móvil, Cowork y Claude Code sincronizado, con versión del
  cliente, mecanismo (conector + plugin), login, `tools/list`, `efeonce.organizations.list`, `get_greenhouse_skill`.
- Casos explícitos: conector y plugin con la misma URL (¿un juego de tools?); servidor del plugin en Claude Code (¿reusa la
  conexión de la cuenta o abre su propio login?); refresh tras expirar; plugin deshabilitado con conector activo.

### Slice 5 — Fase B preparada: runbook de Owner

- Sección en `EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`: agregar el conector en Organization settings > Connectors; **Sync from
  GitHub** del repo marketplace con webhook de sincronización automática; `Installed by default` para piloto y `Required`
  tras certificar; retiro de conectores personales; `syncClaudeAiPlugins` y managed settings para Claude Code si aplica.
- Documentar qué se re-certifica al activar el plan (fila nueva en la matriz) y el rollback (`Not available`).

### Slice 6 — Documentación y cierre

- Actualizar `docs/documentation/plataforma/efeonce-mcp-gateway.md` (cómo llega Efeonce a Claude),
  `docs/manual-de-uso/identity/usar-mcp-interno-multiorganizacion.md` (enlaza el manual nuevo), skill
  `efeonce-mcp-platform` (Codex y Claude idénticos), `Handoff.md`, `changelog.md` y `## Delta` en `TASK-1864`.

## Out of Scope

- Instructions del gateway, contrato `next`, digest, router Codex y eval de agentes (`TASK-1864`).
- Paquete OpenAI y MCP Events para cualquier host (`TASK-1904`).
- Variante del plugin para clientes, manuales de audiencia `client` y ficha en el directorio de Anthropic (conector y
  plugin): follow-up bloqueado por `TASK-1841`.
- Contratar el plan Team/Enterprise o cambiar facturación.
- Extensión `.mcpb` para Desktop: Anthropic ya no la acepta en el directorio y no aplica a un servidor remoto.
- Cambios en el gateway, en el emisor o en scopes.

## Detailed Spec

### Forma del paquete (ilustrativa)

```text
efeonce-claude-plugins/
├── .claude-plugin/marketplace.json
├── plugins/efeonce/
│   ├── .claude-plugin/plugin.json
│   ├── .mcp.json
│   └── skills/efeonce-mcp/SKILL.md
├── README.md
└── LICENSE
```

```json
{
  "mcpServers": {
    "efeonce": { "type": "http", "url": "https://mcp.efeonce.org/mcp" }
  }
}
```

### Superficies y lo que carga cada una (fuente: `/docs/plugins/platform-support`, 2026-10-04)

| Componente | Chat (web, Desktop, móvil) | Cowork | Claude Code |
|---|---|---|---|
| Skill `efeonce-mcp` | carga | carga | carga |
| `.mcp.json` remoto | aparece en la pestaña Connectors del plugin; funciona al conectarlo | idem | carga directo |
| `bin/`, servidor local, hooks | prohibidos en este paquete | prohibidos | prohibidos |

### Fases de distribución

| Fase | Conector | Plugin | Quién actúa |
|---|---|---|---|
| A — cuentas individuales | Conector personalizado por persona (Customize > Connectors) | Add marketplace o Upload plugin (zip de release) | Cada persona, con el manual |
| B — Team/Enterprise | Owner en Organization settings > Connectors; cada miembro conecta con su cuenta | Owner: Sync from GitHub; `Installed by default` → `Required` | Owner + cada miembro conecta una vez |
| C — clientes (follow-up) | Ficha de conector en el directorio o conector de la organización del cliente | Variante cliente, directorio o marketplace del cliente | Bloqueada por `TASK-1841` |

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 → Slice 1 → Slice 2: el repo y el paquete existen antes de la skill.
- Slice 3 (migración del equipo) sólo después de que Slice 4 certifique, al menos en la cuenta del operador, chat web y
  Claude Code. No se retira ninguna conexión manual antes de verificar la nueva en esa superficie.
- Slice 5 puede escribirse en paralelo a Slice 4, pero su fila de certificación queda pendiente hasta que exista el plan.
- Slice 6 al cierre.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Tools duplicadas: conector y plugin no se deduplican | cliente Claude | medium | Slice 4 lo prueba antes de migrar; si duplica, el manual indica una sola vía por superficie | `tools/list` del cliente muestra prefijos dobles |
| Claude Code pide un login propio para el servidor del plugin y deja la conexión en `needs-auth` | identity / cliente | medium | Certificar con versión; documentar `claude mcp login efeonce`; conservar el registro manual hasta verificar | `/mcp` muestra `needs-auth` |
| Scope no fijado en el `.mcp.json` del plugin pide más que el bootstrap | identity | low | PRM anuncia sólo `efeonce.mcp.read`; si el cliente admite `oauth.scopes`, fijarlo | consentimiento muestra un scope distinto del base |
| Secreto o dato interno filtrado en un repo público | seguridad | low | test de contenido en CI + revisión antes de publicar; repo privado por defecto | CI rojo |
| Skill obsoleta frente al manifiesto | agentes | medium | test contra el manifiesto vigente; versión del plugin sube con cada cambio | CI rojo |
| Retiro prematuro del conector de canary deja a alguien sin acceso | operación | low | migración por persona con verificación previa | reporte del equipo |

### Feature flags / cutover

- Sin flag de runtime: el gateway no cambia. El corte es por persona (fase A) y por la disponibilidad que fija el Owner
  (fase B: `Available to install` → `Installed by default` → `Required`).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 0 | Archivar el repo de distribución | < 5 min | sí |
| Slice 1 | Revertir el PR o publicar la versión anterior | < 10 min | sí |
| Slice 2 | Revertir la skill; el conector sigue funcionando sin ella | < 10 min | sí |
| Slice 3 | Deshabilitar el plugin; volver a `claude mcp add` documentado | < 10 min por persona | sí |
| Slice 4 | Documental | < 5 min | sí |
| Slice 5 | Owner fija `Not available`; los conectores personales siguen | < 5 min | sí |
| Slice 6 | Revertir docs | < 5 min | sí |

### Production verification sequence

1. `claude plugin validate --strict` y CI verde en el repo de distribución.
2. `claude --plugin-dir` local: `/mcp` conectado, skill visible como `/efeonce:efeonce-mcp`.
3. Upload del zip a la cuenta del operador: chat web lista la skill y el conector en la pestaña Connectors; conectar y
   llamar `efeonce.organizations.list`.
4. Claude Code nuevo: plugin sincronizado tras `/reload-plugins`; `/mcp` muestra una sola entrada Efeonce conectada.
5. Desktop, móvil y Cowork: misma verificación; registrar versiones.
6. Recién entonces retirar los registros manuales y el conector de canary del operador; repetir con el equipo.

### Out-of-band coordination required

- Cuenta GitHub de la organización `efeoncepro` para el repo de distribución; Claude GitHub App si queda privado.
- Fase B: Owner del plan Team/Enterprise de Claude (cuando exista) para conector de organización y sincronización.
- Aviso al equipo antes de retirar conexiones manuales.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe el repo de distribución con `marketplace.json` y el plugin `efeonce`, y `claude plugin validate --strict` pasa
  en CI.
- [ ] El paquete no tiene `bin/`, hooks ni servidores locales, y su único servidor MCP es `https://mcp.efeonce.org/mcp`.
- [ ] Un test falla si el paquete contiene un secreto, un ID de organización, un cuerpo de manual o un manual inexistente.
- [ ] La skill `efeonce-mcp` carga en chat web, Cowork y Claude Code (evidencia por superficie con versión).
- [ ] `client-certification.md` tiene filas para chat web, Desktop, móvil, Cowork y Claude Code con login, `tools/list`,
  `efeonce.organizations.list` y `get_greenhouse_skill`.
- [ ] Queda documentado, con evidencia, si conector y plugin con la misma URL producen uno o dos juegos de tools.
- [ ] La cuenta del operador queda con una sola conexión Efeonce por superficie; los registros `efeonce-mcp` y
  `efeonce-internal` y el conector de canary quedan retirados o justificados por escrito.
- [ ] El manual `conectar-efeonce-en-claude.md` permite a una persona sin GitHub conectar Efeonce en Claude.
- [ ] El runbook incluye el procedimiento de Owner de fase B con rollback.
- [ ] `TASK-1864` tiene un `## Delta` que registra el traspaso de la mitad Claude del Slice 4.

## Verification

- `claude plugin validate --strict <ruta del plugin>`
- Test de contenido del repo de distribución
- `claude plugin eval` con y sin el plugin en dos escenarios de lectura
- Verificación manual por superficie registrada en la matriz
- `pnpm docs:closure-check` y `pnpm ops:lint --changed` en greenhouse-eo

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] skill `efeonce-mcp-platform` sincronizada en `.claude/` y `.codex/` con la referencia de certificación
- [ ] fila de fase B marcada pendiente, con owner y condición de activación, si el plan Team aún no existe al cerrar

## Follow-ups

- Variante del plugin para clientes, manuales `audience: client` y fichas en el directorio de Anthropic (conector y plugin
  emparejados), bloqueado por `TASK-1841`.
- Comandos del plugin para flujos frecuentes (por ejemplo, lectura SEO de una organización) una vez que `TASK-1864`
  entregue instructions y `next`.
- Ejecutar la fase B el día que Efeonce contrate Team/Enterprise.

## Delta 2026-10-04

- Task creada a pedido del operador tras el análisis conector vs plugin con tres subagentes (documentación de Anthropic,
  repos `greenhouse-eo`/`efeonce-mcp` y configuración local) y lectura directa de `claude.com/docs/plugins/*`. El operador
  confirmó que Efeonce no tiene plan Team hoy y lo tendrá más adelante.

## Open Questions

1. **Repo privado o público en fase A.** Privado exige que cada persona conecte GitHub y la Claude GitHub App para
   «Add marketplace»; quien no tenga GitHub usa el zip de release. Público simplifica la instalación y sólo expone la URL
   y la skill router. Recomendación: privado mientras el contenido sea interno, revisar al abrir la variante de clientes.
2. **`oauth.scopes` en `.mcp.json` de plugin.** Confirmar con la versión vigente de Claude Code si el campo se respeta en
   un servidor declarado por plugin.
3. **Conector hospedado existente.** Reutilizar el conector «Efeonce MCP» corrigiendo su configuración o eliminarlo y
   crear uno nuevo «Efeonce»: depende de si la descripción y el nombre son editables en la cuenta individual.

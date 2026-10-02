# TASK-1904 — Efeonce MCP: plugin ChatGPT/Codex y Events para ChatGPT/Claude

## Actualización de proveedor — DevDay 2026-09-29

El [inventario oficial contrastado](../../audits/platform/OPENAI_DEVDAY_2026_09_29_LAUNCH_INVENTORY.md) agrega plugin extensions, Sites y MCP Events. **MCP Events pasa a ser trabajo obligatorio de esta task para ChatGPT y Claude**, con un contrato compartido de eventos en Efeonce y certificación separada por cliente (Slice 6). La documentación oficial de ChatGPT especifica suscripción y webhook; la de Claude Code documenta negociación MCP v2 y `list_changed`, pero no acredita `events/subscribe`. Slice 0 debe verificar el soporte real de Claude Code y del conector hospedado antes de elegir integración nativa o un adaptador autorizado, sin llamar «MCP Events nativos» a una alternativa. Ningún anuncio acredita instalación, autorización ni acceso cliente. `Sign in with ChatGPT`, consumo de allowance y Marketplace son contratos distintos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1904-efeonce-openai-plugin.md`
- Flow: `docs/ui/flows/TASK-1904-efeonce-openai-plugin-flow.md`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-044`
- Status real: `Diseno`
- Rank: `U21`
- Domain: `platform|identity`
- Blocked by: `none`
- Branch: `Greenhouse develop; efeonce-mcp feature + PR; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Entregar el plugin de Efeonce para Codex y ChatGPT: paquete versionado con identidad visual oficial,
conexión OAuth al MCP existente, skills distribuibles, instalación privada reproducible y pruebas reales
por cliente. Debe poder usarse sin revisión ni publicación en el directorio público de OpenAI.
La misma task construye el canal compartido de eventos y lo conecta a ChatGPT y Claude con pruebas reales
por cliente. Termina con instalaciones y eventos funcionales verificados; un manifest o una URL no bastan.

## Why This Task Exists

Pedido del operador del 2026-09-26: una experiencia comparable a los conectores HubSpot/Apollo,
con marca y skills, aprovechando el servidor existente. La [auditoría](../../audits/mcp/2026-09-26-openai-plugin-readiness/README.md)
observó una conexión hospedada con descripción de canary que requería reautenticación; no diagnosticó
su causa. El gateway ya sirve metadata de marca, pero `icons[]` no garantiza el logo del catálogo.
Las skills del repositorio tampoco se distribuyen automáticamente a otra máquina o a ChatGPT.

TASK-1864 ya posee instructions, contrato `next`, generación del router de cliente y evaluación agéntica.
Esta tarea posee el producto instalable de OpenAI, sus metadatos, distribución, onboarding y certificación.
La propuesta anterior de limitar la oferta a SEO no fue aprobada: se inventaría toda capability existente
y se declararía su disponibilidad real por autoridad, sin prometer ni ampliar permisos.

## Goal

- Instalar y usar **Efeonce MCP**, publicado por Efeonce, en Codex y en ChatGPT mediante vías privadas soportadas.
- Mostrar logo, nombre, descripción, autor, enlaces y ejemplos honestos en las superficies que los admiten.
- Distribuir skills de usuario verificadas que descubren capacidades y cargan los manuales canónicos.
- Certificar OAuth, herramientas, aislamiento, errores, renovación, revocación, actualización y desinstalación.
- Dejar distribución repetible para un segundo operador elegible, soporte y un expediente opcional de publicación.
- Construir el ciclo de vida de eventos en el gateway y certificar la recepción y el efecto autorizado en ChatGPT y Claude, sin asumir paridad de protocolo entre hosts.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/architecture/EFEONCE_MCP_AGENT_SKILL_ROUTER_V1.md`
- `docs/architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md`
- `docs/architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md` §22
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`

Un gateway neutral, un recurso canónico `https://mcp.efeonce.org/mcp` y autoridad de Efeonce ID.
Los adapters de distribución no duplican datos, policies ni lógica de providers. No crear un segundo
servidor sólo para OpenAI. Slice 0 registra el delta de distribución en el ADR dueño; cualquier cambio
de autoridad, audiencia o acceso externo exige su decisión específica antes de implementación.
«Oficial» identifica a Efeonce como publicador, nunca aprobación o patrocinio de OpenAI.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`, `TASK_UI_UX_ADDENDUM.md` y `TASK_BACKEND_DATA_ADDENDUM.md` en esa carpeta.
- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/manual-de-uso/identity/usar-mcp-interno-multiorganizacion.md`
- `.codex/skills/efeonce-mcp-platform/SKILL.md` y `references/client-certification.md`.
- `.codex/skills/mcp-craft/SKILL.md`, `.codex/skills/greenhouse-ai-design-studio/SKILL.md`.
- `.codex/skills/greenhouse-documentation-governor/SKILL.md`.

Skills oficiales de OpenAI para ejecutar: `openai-docs` (documentación vigente), `plugin-creator`
(paquete y marketplace), `skill-creator` (skills distribuibles); `build-chatgpt-app` para la integración
MCP/Apps SDK si hace falta y `chatgpt-app-submission` únicamente para preparar la etapa pública.
Resolver sus rutas instaladas al comenzar; no introducir dependencia de una ruta personal en el paquete.

Fuentes oficiales consultadas el 2026-09-26; revalidar esquema, plan y soporte por superficie en Slice 0:

- [Paquete, marca, marketplace privado y workspace](https://developers.openai.com/plugins/build/plugins).
- [Conexión a ChatGPT](https://developers.openai.com/plugins/deploy/connect-chatgpt).
- [MCP en Codex](https://learn.chatgpt.com/docs/extend/mcp).
- [Publicación en directorio](https://developers.openai.com/plugins/deploy/submission).

## Dependencies & Impact

### Depends on

- [TASK-1864](TASK-1864-mcp-self-sufficient-agent-surface.md): router generado, instructions y eval.
  No bloquea discovery, marca ni instalación; su artefacto integrado es gate del cierre de skills.
- TASK-1813 y TASK-1844: interoperabilidad OAuth y autoridad interna vigentes; verificar runtime al ejecutar.
- TASK-1832/1833/1841: conservan certificación externa, assurance y piloto comercial. Sólo condicionan
  las cohortes externas que se pretendan habilitar, no la instalación privada interna ya autorizada.
- Assets oficiales Efeonce/AXIS, cuenta OpenAI elegible y permisos efectivos del operador; inventariar sin presumirlos.
- Fuente de eventos de un provider con contrato explícito, permiso y caso de uso aprobado; sin inferir que cualquier outbox puede publicarse.

### Blocks / Impacts

- EPIC-044 U21; TASK-1864 U20 conserva kit/routing/eval agéntico de Claude y Codex. U21 posee Events compartidos y certificación de entrega a ChatGPT y Claude.
- Providers existentes, incluido Studio: su presencia local no prueba habilitación para OAuth nativo.
- Distribución pública futura: recibe este paquete y evidencias; no se vuelve prerequisito de esta task.

### Files owned

Rutas nuevas propuestas, confirmar en Slice 0 antes de crearlas:

- `../efeonce-mcp/client-kit/openai/**`: manifest, assets, distribución y paquete final.
- `../efeonce-mcp/scripts/build-openai-plugin.mjs`: ensamblado y validación, sin copiar lógica del gateway.
- `../efeonce-mcp/.agents/plugins/marketplace.json`: catálogo privado si se elige distribución desde ese repo.
- `docs/documentation/plataforma/efeonce-openai-plugin.md`: contrato de distribución y matriz de soporte.
- `docs/manual-de-uso/plataforma/instalar-efeonce-en-codex-chatgpt.md`: manual del usuario.
- `docs/operations/mcp/EFEONCE_OPENAI_PLUGIN_RELEASE_RUNBOOK.md`: release, soporte y rollback.
- `docs/audits/mcp/TASK-1904/**`: evidencia, matrices, capturas sanitizadas y QA.
- `../efeonce-mcp/src/**`: discovery MCP 2.0, suscripciones, verificación de callbacks y entrega firmada; rutas concretas se fijan en Slice 0 y ADR.
- Provider/worker dueño del evento: contrato, outbox y publicación sólo bajo ownership acordado; no copiar hechos de dominio en el gateway.
- Los dos contratos UI declarados en Status; task, índices y handoff correspondientes.

Compartidos bajo coordinación: `../efeonce-mcp/src/branding.ts`, `src/surface.ts`, tests y `package.json`.
TASK-1864 conserva `client-kit/codex/**` y su generador como **entrada generada de routing**;
TASK-1904 ensambla esa entrada en un único plugin OpenAI instalable. No distribuir dos plugins rivales.
Auth-server, tool-manifest y providers conservan sus dueños: cambios funcionales nuevos se derivan a ellos.

## Current Repo State

### Already exists

- Gateway `../efeonce-mcp`, transporte Streamable HTTP, `src/branding.ts`, icono y autorización server-side.
- Manifiestos `src/mcp/greenhouse/tool-manifest.ts`, `skill-manifest.ts` y manuales `docs/mcp/skills/**`.
- Auditoría fechada: 70 tools con providers habilitados **localmente**, 21 pruebas locales PASS; metadata
  pública y endpoints accesibles. Estos números no son el catálogo autenticado ni una certificación de producto.
- Un conector canary observado como `UNAUTHORIZED`; su identidad, grants y migración deben investigarse.

### Gap

- No se ha demostrado paquete completo instalado con marca, skills y OAuth en ambos clientes OpenAI.
- El SDK v2 instalado no equivale a `server/discover` ni a `events/list|subscribe|unsubscribe`; la revisión productiva verificada el 2026-09-29 no implementaba ese flujo.
- No hay soporte nativo de MCP Events para Claude acreditado con fuente oficial ni prueba cliente; `list_changed` informa cambios de catálogo, no eventos de negocio.
- Falta matriz instalada por cliente/versión/autoridad y una guía reproducible fuera de greenhouse-eo.
- Falta ciclo de release, actualización, recuperación y retirada sin borrar otras conexiones.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-mcp/client-kit/openai/`; documentación central en Greenhouse.
- Future candidate home: `remain-shared`
- Boundary: paquete consume manifiestos y routing; gateway posee suscripciones/entrega, provider posee el hecho y la policy, adaptadores ChatGPT/Claude sólo reciben eventos autorizados.
- Server/browser split: paquete/skills sin secretos; tokens bajo almacenamiento seguro del host; servidor revalida cada llamada.
- Build impact: paquete y gateway se construyen separados del portal; storage/worker de suscripciones y SDK de firma se dimensionan en ADR.
- Extraction blocker: autoridad por llamada, persistencia de suscripciones y compatibilidad del host Claude pendientes de certificar.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`.
- Usuario: operador elegible que instala Efeonce y solicita una operación sobre sus organizaciones autorizadas.
- Resultado: reconoce Efeonce, entiende el consentimiento y obtiene un resultado verificable o recuperación clara.
- Fricción: conexión canary, marca ausente, skills sólo locales y permisos confundidos con catálogo global.
- Non-goals: rediseñar Codex/ChatGPT, inventar widgets o rediseñar el login existente.

### Surface & system decision

- Surface: ficha del plugin, conexión y selección de herramientas del host; login/consentimiento en Efeonce ID.
- Navigation placement: host existente; `CompositionShell` no aplica a UI propiedad de OpenAI.
- Primitive decision: `reuse`; componentes de host y shell de Efeonce ID existentes, sin primitives nuevas.
- Density/floating: los controla el host. Copy source: metadata del paquete; auth mantiene su fuente canónica.
- Access impact: distinguir instalado, conectado, autorizado y disponible en la conversación.

### State inventory

Default, loading, empty (sin capabilities), error OAuth, degraded (provider), permission denied,
long content, mobile, keyboard y reduced motion se especifican en wireframe/flow. No mostrar éxito al guardar
configuración ni ocultar una denegación como catálogo vacío.

### Interaction contract

Instalar → conectar → consentir → volver → primera lectura. Pending evita repetir autorización;
cancelar/Escape permite salida segura; foco vuelve al control de conexión donde el host lo soporte.
Los toasts no sustituyen estado persistente. La espera conserva contexto sin ejecutar escrituras duplicadas.

### Motion & microinteractions

Sin motion propia; reutilizar conducta del host y preferencias de movimiento reducido del emisor.

### Implementation mapping

`interface` del plugin → ficha/brand; registro MCP → OAuth; skills → manuales/tool calls existentes.
Assets SVG/PNG oficiales, legibles en fondos claro/oscuro y tamaño pequeño; URL remota e icono de paquete
son entregables distintos. Sin CSS ni JSX para simular UI que controla OpenAI.

### GVC scenario plan

Dossier `docs/audits/mcp/TASK-1904/`: captura de ficha instalada, OAuth, retorno, primera operación,
error y reconexión por superficie. UI externa: browser/native automation, sin inyectar `data-capture`.
Efeonce ID: reutilizar escenario canónico GVC si se modifica. Desktop 1440×1000 y web móvil 390×844;
CLI/IDE usan sus formatos propios. Registrar cualquier limitación de host, no emitir PASS ficticio.

### Design decision log

Reusar catálogo y login frente a construir una miniapp. Skills y metadata aportan la experiencia pedida;
un widget Apps SDK sólo se incorpora con necesidad funcional probada y task UI separada.

### Visual verification

Logo renderizado, crop, contraste, nombre sin canary, enlaces, textos largos, foco y zoom; capturas reales
por cliente. `UI ready: no` hasta revisar las superficies reales y aprobar mapping/dirección.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` por OAuth, delegación y aislamiento multiorganización.
- Impacto principal: `integration`; runtime target gateway productivo y clientes OpenAI.
- Source of truth: manifiestos/policies de los providers; packaging versionado no concede autoridad.

### Contract surface

`initialize`, `tools/list`, `tools/call`, instrucciones/manuales, schemas y annotations existentes;
OAuth metadata/PKCE/refresh/revoke del emisor. Paquete portable `plugin.json`, `mcp.json`, `skills/`,
`assets/` y `extensions.com.openai`; compatibilidad `.codex-plugin/plugin.json` sólo cuando haga falta.
`.app.json` usa un ID real obtenido del registro; nunca un ID inventado o una copia universal del ID personal.
Versionar de forma separada paquete y gateway; cambios de superficie respetan digest/bump canónicos.
Events exige `server/discover` negociado en `2026-07-28`, capability `events` y
`events/list|subscribe|unsubscribe` en el endpoint autenticado. Anunciar sólo lo implementado
y conservar compatibilidad con `initialize` y clientes anteriores. Claude se certifica por host y
versión; un adaptador propio tiene contrato distinto de MCP Events nativos.

### Data model and invariants

El paquete no persiste datos de dominio. Events requiere storage durable de suscripciones con
owner, cliente, organización/objetivo, nombre, filtros, callback, secreto cifrado, TTL, estado y
cursor cuando exista replay; definir migración, retención y borrado. El provider conserva el
evento de origen y su outbox. El gateway filtra, firma los bytes exactos con Standard Webhooks,
reintenta de forma acotada y mantiene IDs estables para deduplicación.
Autoridad por persona/organización/scope/capability, con tenant boundary server-side y revocación vigente.
Un selector de organización sólo restringe; nunca amplía. Grants internos, externos y canary son distintos.
Una skill, annotations o allowlist local no reemplazan `tools/list` y `tools/call` autorizados.
Idempotency/concurrency de writes siguen el command dueño; retries no duplican efectos.
Auditoría conserva actor humano y correlación, nunca tokens, cookies, PII innecesaria ni respuestas crudas.

### Migration, backfill and rollout

Migration posture: `additive` para suscripciones, `none` para el paquete. Instalación opt-in; se inventaría la conexión canary y se prueba una nueva o
se actualiza la existente según su identidad real. Mantener recuperación hasta validar; no reactivar
sujetos sintéticos retirados. Desinstalar el paquete y revocar el consentimiento son acciones distintas.
Apagar Events detiene altas y entregas; el rollback dispone explícitamente las suscripciones y secretos.

### Security and access

PKCE S256, state, issuer/resource/audience, redirects, refresh rotativo y revoke según contrato existente.
Sin API keys compartidas ni secretos en manifests. Bootstrap base-only; scopes incrementales sólo por
necesidad y consentimiento. Errores distinguen sesión expirada, acceso denegado, capacidad no disponible,
rate limit y provider caído, con recuperación sin filtraciones. Prompt injection en contenido de tools
se trata como datos no confiables. Writes/gasto/publicación requieren controles del dominio y autorización
correspondiente; el conector no recibe un consentimiento global para mutar todo.
Events valida y verifica callback HTTPS, bloquea SSRF y redirecciones, revalida autoridad durante
toda la vigencia y detiene entregas al revocar grant o conexión. Un evento no concede permiso de
escritura ni delegación `act`; el efecto pasa por el command y gate del dominio.

### Runtime evidence

Matriz autenticada por host y autoridad: catálogo observado, herramienta llamada, resultado esperado,
versión, timestamp, evidencia sanitizada y FAIL/blocked explícitos. Anonymous 401/health 200 no certifican
login. Verificar readback real y correlación del gateway; no cerrar con tests exclusivamente mock.
Para Events registrar discovery, alta/refresh/baja, callback, firma, filtro negativo, revoke,
expiración, duplicado, orden, replay/gap y efecto por host. Claude exige evidencia propia.

### Acceptance criteria additions

- [ ] Fronteras de tenant/autoridad y catálogo esperado contrastadas contra `tools/list` y `tools/call` reales.
- [ ] Renovación, revocación, pérdida de permisos y denegación cross-tenant probadas con fixtures gobernadas.
- [ ] Ningún secreto, grant adicional o dato privado viaja en el paquete ni en evidencia distribuida.
- [ ] Instalación, actualización y rollback reproducibles sin migraciones de dominio.

### Capability Definition of Done — Full API Parity gate

El paquete reutiliza capabilities existentes; Events agrega una capability de integración.
El evento de origen y su efecto pertenecen al dominio y se registran en su contrato canónico;
`packages/contracts/src/operations.ts` declara tool o exclusión razonada donde aplique.
No crear endpoints de negocio específicos de OpenAI.

## Hybrid Execution Justification

- Why not split: UI acotada a metadata/assets y consumo de OAuth existente; es inseparable de probar instalación.
- Primary execution profile: backend-data; la mayor superficie propia es packaging/integración.
- Contract boundary: UI del host + auth existente; ni nueva pantalla de producto ni nueva foundation de identidad.
- Events tiene backend/worker compartido y gates propios en Slice 6, en esta misma task para ambos conectores.
- Risk controls: si discovery exige widgets, nuevas pantallas o nuevos grants, separar tasks antes de implementarlos.

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

### Slice 0 — Contrato de distribución y discovery

Inventariar versiones/planes/policies de Codex desktop, CLI/IDE y ChatGPT hospedado/Work disponible.
Registrar vía privada soportada, identidad del publicador, ownership, permisos administrativos y límite
por superficie. ADR delta de distribución y decisión de layout portable/compatibilidad. Inventariar todos
los providers/capabilities: tool, audiencia, scopes, manual, soporte nativo y prueba; no limitarlo a SEO.
Si una capability no está autorizada por el emisor nativo, documentar gap y owner sin ampliarlo aquí.
Para Events, comprobar soporte oficial y observado de ChatGPT, Claude Code y Claude hospedado por
versión; elegir un evento real con owner, filtros, payload mínimo y efecto permitido. Proponer ADR
de storage, seguridad, entrega y compatibilidad antes de implementar.

### Slice 1 — Paquete y marca oficial

Crear paquete versionado, validado contra esquema vigente y ensamblado determinista. Nombre Efeonce MCP,
slug estable, autor Efeonce, descripción/categoría, logo/composerIcon, versión, soporte, homepage,
privacidad/términos válidos y ejemplos ajustados al catálogo. Assets oficiales con procedencia; probar
claro/oscuro y crop. No inventar datos legales, dominio de soporte ni licencia. Sin hooks salvo necesidad
justificada; sin dependencias locales implícitas ni rutas personales. Marketplace privado opt-in.

### Slice 2 — Conexión y migración desde canary

Registrar o vincular el MCP privado mediante la UI/API soportada de OpenAI. Usar el ID real y la identidad
correcta; definir qué metadata es portable y qué binding pertenece a cada instalación/workspace.
Evitar registro duplicado de tools al combinar `mcp.json` y `.app.json`. OAuth completo hasta primera
lectura autenticada; refresh, cancelación y reautenticación. Plan de retirada del canary sin borrar otras
conexiones. Privado funcional en Codex y ChatGPT antes de considerar directorio público.

### Slice 3 — Skills y operación agéntica

Integrar router generado de TASK-1864. Skill de entrada descubre autoridad/capabilities y obtiene manual;
skills de dominio sólo donde el inventario y la evaluación justifiquen su inclusión. Definir triggers,
inputs, evidencia de salida, límites, confirmaciones y recuperación; nombres exactos de tools actuales.
No copiar skills internas de infraestructura ni manuales completos. Probar carga/invocación fuera del
repo con una conversación nueva. Documentar soporte de skills por cliente: una conexión MCP en web no
implica por sí sola que el paquete local y sus skills se hayan instalado allí.

### Slice 4 — Certificación real por superficie

Ejecutar matriz descrita abajo, con identidad elegible y fixtures. Incluir un segundo perfil limpio o
máquina/contexto equivalente sin skills/config del repo. Capturar el logo realmente renderizado y el
flujo desde instalación a resultado. No cerrar un host con evidencia obtenida en otro.

### Slice 5 — Entrega, mantenimiento y expediente público opcional

Entregar release privado reproducible, manual de instalación/reconexión/actualización/desinstalación,
matriz de compatibilidad, troubleshooting, owner de soporte y runbook. Declarar datos tratados y enlaces
válidos también en el uso privado. Preparar checklist de publicación (publisher, verificación de dominio,
demo aislada, privacidad, términos, imágenes y casos); no crear/publicar submission ni modificar auth
para una demo como condición del uso privado. Separar cada estado de release.

### Slice 6 — MCP Events compartidos y conectores ChatGPT/Claude

Tras el ADR de Slice 0, implementar `server/discover` 2.0, `events/list|subscribe|unsubscribe`,
storage durable, verificación de callback y entrega HTTPS firmada. Revalidar permisos y filtros
en cada entrega, manejar refresh, rotación, TTL, revocación, duplicados, orden variable y replay/gap.
Conectar un evento real de un provider autorizado sin copiar su outbox al gateway.

ChatGPT: certificar desde el plugin privado discovery → lista → alta → callback → evento →
respuesta autorizada → baja. Claude Code y conector hospedado: verificar soporte real por versión;
si admiten el protocolo, certificar el mismo ciclo. Si no, definir y construir un adaptador
Efeonce de entrega a Claude con autorización y revocación equivalentes, documentando su canal
y límites sin atribuirle soporte nativo MCP Events. Esta task no cierra sólo con ChatGPT ni con
una prueba `list_changed`.

## Out of Scope

Nuevos providers, scopes o autoridad externa; rollout comercial masivo; rehacer el gateway o Efeonce ID;
implementación de `next`/instructions/harness y packaging Claude de TASK-1864; widgets sin necesidad de
producto; publicación en directorio, campañas o mensajes a terceros. SEO no es el único dominio del paquete.

## Detailed Spec

### Matriz mínima de cliente y entrega

| Superficie | Entrega que se debe probar | Límite que debe registrarse |
|---|---|---|
| Codex desktop | Plugin privado instalado, marca visible, OAuth, skills y operación en chat nuevo | Cuenta/versión, caché y reinicio/refresh reales |
| Codex CLI/IDE disponibles | Resolución del paquete o adapter documentado, OAuth y skill fuera del repo | No asumir UI de catálogo idéntica ni config compartida con hosted |
| ChatGPT hospedado | Conexión privada soportada, consentimiento, tools y operación en conversación nueva | Plan/workspace, visibilidad de metadata y soporte real de skills |
| ChatGPT Work/desktop disponible | Instalación del paquete desde fuente privada y skills invocables | No extrapolar marketplace local al navegador remoto |
| Claude Code | Kit de TASK-1864 y recepción de Events nativa o adaptador Efeonce certificado | No inferir Events desde negociación v2 o `list_changed` |
| Claude.ai/Desktop | Conexión hospedada y recepción de Events nativa o adaptador Efeonce certificado | Certificar host y versión separados de Claude Code |
| Segundo perfil limpio | Instalación desde artefacto y documentación, sin secretos del creador | Sin reutilizar tokens del primer operador |

Codex desktop y ChatGPT hospedado son gates primarios. Una restricción de cuenta/host se registra como
bloqueo con evidencia y ruta de resolución, no como éxito. En superficies que no admitan skills empaquetadas,
certificar guía por instructions/manuales y declarar la diferencia; no afirmar paridad inexistente.

### Matriz mínima de pruebas

| Caso | Resultado verificable |
|---|---|
| Instalar/autenticar/descubrir | Marca correcta, callback válido, catálogo igual a autoridad, primera lectura |
| Solicitud natural multietapa | Usa skill/manual, elige tools, sigue espera/paginación, entrega evidencia sin inventar éxito |
| Solicitud ajena al dominio | No activa Efeonce ni llama tools innecesariamente |
| Multiorganización | Una identidad cambia objetivo permitido; objetivo ajeno denegado también en llamada directa |
| Sin capability/scope | Denegación honesta; consentimiento incremental sólo si el contrato permite obtenerla |
| Expiración/cancelación/revoke | Recupera o pide reconectar; token revocado y permiso retirado dejan de autorizar |
| Provider lento/caído/429 | Estado claro, retry acotado, sin duplicar efectos |
| Escritura/costo/destrucción | Confirmación y policy respetadas; sólo simulación/fixture gobernada, nunca gasto real de prueba |
| Contenido malicioso | No ejecuta instrucciones insertas en resultados ni filtra credenciales/contexto |
| Actualizar/desinstalar | Sin tools duplicadas, sin skills stale, recuperación de versión y otras conexiones preservadas |

Al menos cinco solicitudes positivas y tres negativas por superficie primaria; registrar catálogo y
fixtures empleados. Incluir ausencia de contexto del repo, reset de conversación y activación selectiva.
La disponibilidad de una tool en el paquete no es prueba de acceso comercial para cualquier usuario.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

0 → 1 → 2; 3 consume el artefacto de TASK-1864 y puede prepararse después de 0; 2 + 3 → 4.
Slice 6 empieza después de discovery/ADR (0): storage/autoridad → entrega firmada → ChatGPT → Claude.
Slices 4 y 6 completos → 5 (entrega final y soporte).
No anunciar `events` hasta que el ciclo funcione. La revisión pública nunca entra en este camino crítico. Cambios de gateway requieren su PR y gates;
`main` despliega automáticamente: no usar un push para probar packaging.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Confundir instalación con acceso | OAuth/host | high | Certificar primera llamada y roles reales | Guardado exitoso seguido de UNAUTHORIZED |
| Exponer catálogo fuera de autoridad | Gateway/providers | medium | Matriz allow/deny y prueba directa cross-tenant | Tool accesible fuera de cohort/capability |
| Duplicar tools o skills stale | Paquete/host | medium | Un wiring por superficie, upgrade en perfil limpio | Doble namespace o versiones divergentes |
| Romper otras conexiones | Cuenta del operador | medium | Inventario, transición selectiva y rollback | Conector previamente útil deja de funcionar |
| Confundir icono MCP con marca visible | Catálogo | high | Captura real por host y metadata nativa | Ficha genérica pese a icon HTTP 200 |
| Prometer soporte no disponible | ChatGPT/Codex/Claude | medium | Matriz de plan/versión/fuente con bloqueos explícitos | Instalación local usada como prueba web |
| Callback malicioso o entrega tras revoke | Gateway/worker | high | Verificación HTTPS/anti-SSRF, recheck de autoridad, secreto cifrado y kill switch | Destino no autorizado o entrega tras revocación |
| Duplicado o pérdida de evento | Provider/gateway/host | medium | ID estable, cursor cuando aplique, retries acotados e idempotencia de efecto | Dos efectos por un evento o gap sin señal |

### Feature flags / cutover

Instalación privada opt-in, sin flags nuevas de grants. No ampliar cohorts ni cambiar flags del emisor
para hacer pasar QA. Registro/cambio de conexión puntual y reversible; no desinstalar canary hasta
verificar identidad y reemplazo. Mantener fuente/versiones del paquete anteriores para rollback.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 0 | Revert documental del delta sin tocar autoridad | Una edición | Sí |
| 1 | Volver a versión privada anterior del paquete/catálogo | Objetivo 15 min, medir | Sí |
| 2 | Deshabilitar binding nuevo, revocar su consentimiento y recuperar conexión elegible anterior | Objetivo 30 min, medir | Parcial: requiere login nuevo |
| 3 | Volver a router/skills compatibles y refrescar caché | Objetivo 15 min, medir | Sí |
| 4 | Limpiar sólo fixtures de QA; conservar evidencia sanitizada | Según fixture, medir | Sí; no datos comerciales |
| 5 | Retirar versión privada defectuosa y entregar versión conocida | Objetivo 30 min, medir | Sí |
| 6 | Apagar anuncio/altas y entregas, detener worker, cancelar o conservar suscripciones según ADR, revocar secretos y volver a revisión previa | Medir en ensayo | Parcial: eventos no entregados requieren política de replay |

### Production verification sequence

1. Validar esquema/paths/assets/routing localmente y probar perfil limpio.
2. Capturar versión/surfaceHash y metadata del gateway vivo sin cambios de acceso.
3. Instalar en la cohorte interna elegible; consentir y verificar lectura real en ambos hosts.
4. Certificar estados negativos, refresh/revoke y recuperación; probar actualización/rollback.
5. Certificar Events en ChatGPT y Claude por canal/versión: subscribe, entrega, respuesta, unsubscribe, denegación y revoke; ejercer rollback de suscripciones.
6. Observar señales existentes de auth/gateway durante 24 h de uso acotado, con tasas 401/403/429/5xx
   comparadas con baseline. Toda regresión cross-tenant o filtración bloquea distribución.
7. Entregar artefacto reproducible/manual y estado por cliente; ampliar distribución privada sólo a
   usuarios ya elegibles. La publicación pública sigue separada.

### Out-of-band coordination required

Login/consentimiento humano y roles administrativos del workspace cuando el host los exija. El agente
prepara los artefactos y pasos antes de ese punto. Registrar bloqueo concreto y responsable, sin pedir
contraseñas/tokens en chat ni asumir que una falta de sesión obliga a rehacer auth. Registrar en el plan
la autorización efectiva para instalación, cambios de cuenta, deploy y cualquier publicación posterior.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] ADR de distribución y matriz cliente/versión/plan/capability aprobados; frontera TASK-1864/1904 respetada.
- [ ] Paquete válido, reproducible y versionado con publisher Efeonce, logo/composerIcon y enlaces vigentes.
- [ ] Plugin instalado privadamente en Codex desktop, marca visible, OAuth y skill funcionando fuera del repo.
- [ ] Conexión privada en ChatGPT hospedado realiza una operación autenticada sin revisión del directorio.
- [ ] Soporte de skills en ChatGPT/Work probado o limitación documentada con routing por protocolo certificado.
- [ ] Catálogo completo de capabilities existentes inventariado; no restringido arbitrariamente a SEO.
- [ ] `tools/list` y `tools/call` respetan permisos y objetivos; denegación directa cross-tenant comprobada.
- [ ] Cinco casos positivos y tres negativos por host primario pasan, con fixtures y evidencia sanitizada.
- [ ] Refresh, revocación, cancelación, reconexión, degradación y retries certificados en ambos hosts.
- [ ] Migración del canary resuelta y no quedan tools duplicadas ni conexiones ajenas alteradas.
- [ ] Segundo perfil limpio reproduce instalación, actualización, uso y desinstalación con el manual.
- [ ] Skills integradas con TASK-1864; manuales no copiados, sin instrucciones internas ni secretos distribuidos.
- [ ] Rollback ejercitado, observación completada y owners de release/soporte documentados.
- [ ] Expediente de publicación opcional enumera pendientes sin bloquear el uso privado ni afirmar aprobación OpenAI.
- [ ] ADR de Events aprobado, protocolo negociado sin romper clientes legacy, storage durable y evento de provider con owner/policy explícitos.
- [ ] ChatGPT completa alta, refresh, callback verificado, entrega firmada, efecto autorizado y baja con evidencia real.
- [ ] Claude Code y conector hospedado tienen soporte nativo certificado o adaptador Efeonce construido y certificado; se declara exactamente qué canal opera en cada host.
- [ ] Revocación, expiración, filtros negativos, SSRF, reintentos, duplicados, replay/gap y rollback pasan con fixtures; ninguna entrega sobrevive al retiro de autoridad.

## Verification

Creación: `pnpm task:lint --task TASK-1904`, `pnpm ops:lint --changed`, `git diff --check` sobre paths propios
y `pnpm docs:context-check:strict`. No marcar AC de implementación con estos checks documentales.
Implementación: validar manifest/marketplace con esquema vigente, tests de generación/routing y fuga de
secretos, gates del gateway si cambia superficie, eval de TASK-1864 y matriz real de Slice 4. Registrar
comandos exactos, versiones, timestamps, expected/actual y capturas en `docs/audits/mcp/TASK-1904/`.
Evitar tests que sólo repiten textos; probar instalación, autorización, selección y resultados reales.

## Closing Protocol

- [ ] Lifecycle, Status real y evidencias de AC reflejan el estado real; no cerrar con un host primario pendiente.
- [ ] Archivo movido a carpeta correcta y task:lint sin stale-progress/stale-blocker.
- [ ] README, TASK_ID_REGISTRY, EPIC-044 y TASK-1864 sincronizados con el cierre.
- [ ] Handoff actualizado con estados separados: preparado, instalado, autenticado, verificado, publicado.
- [ ] Changelog actualizado si cambia comportamiento, estructura o protocolo visible.
- [ ] Manual, contrato técnico y runbook permiten instalar, operar, recuperar y retirar el conector.
- [ ] Impacto cruzado revisado; commits, push, deploy y publicación reportados por separado.

## Follow-ups

- Directorio público: ejecutar task de submission sólo si se decide publicar, reutilizando esta entrega.
- Gaps de autoridad/capability: derivar al owner identificado por el inventario; conservar pilotos externos existentes.
- El kit/routing y semántica agéntica general de Claude permanecen en TASK-1864; la recepción de Events de Claude pertenece a esta task.

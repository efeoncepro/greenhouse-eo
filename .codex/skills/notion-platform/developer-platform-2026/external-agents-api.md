# Notion External Agents API + Agent SDK

> **Status**: Alpha (waitlist-gated) — both External Agents API and Notion Agent SDK
> **Launch**: May 13, 2026
> **Source**: https://www.notion.com/blog/introducing-developer-platform
> **Last verified**: 2026-05-17

## 1. Qué es External Agents API

Permite que agents construidos fuera de Notion (con cualquier framework) se conviertan en **first-class workspace participants** dentro de Notion:

> "The External Agent API lets you bring your own agents into Notion the same way [Custom Agents]. If your team has built agents on other frameworks, they become first-class workspace participants too."

Capabilities:
- Aparecen en agent list de Notion
- Chat directo en Notion
- Asignación de work como teammates
- Progress tracking similar a Custom Agents
- Acción autónoma en Notion via permissions

## 2. Partner agents pre-integrados al launch

Notion shipped 4 partners ready-to-use:
- **Claude Code** (Anthropic)
- **Cursor**
- **Codex** (OpenAI)
- **Decagon**

> "Just a handful of the partner agents available out of the box, with more coming soon."

## 3. Notion Agent SDK — relacionado pero distinto

Notion también lanzó **Notion Agent SDK** (Alpha waitlist):

> "Embed agents in third-party tools (CRM, Teams, Discord, dashboards)"

Esto es **inverso**: en lugar de traer agents externos a Notion, lleva Notion agents a herramientas externas. Use case: tu CRM team puede chat con un Notion agent embedded en CRM UI.

## 4. Implicación para Greenhouse — V1 NO candidato

### Por qué NO V1
1. **Alpha waitlist** — no GA, sin SLA
2. **LLM-driven** = no determinístico (vs Worker Agent Tool que es deterministic)
3. **Sin observability Greenhouse integration** (Sentry domain, reliability signals)
4. **Sin spec clara** de auth boundary entre external agent y Greenhouse data

### Cuándo re-evaluar
- External Agents API → GA
- Notion provee spec clara de federation auth (OAuth flow con Greenhouse?)
- Use case operativo concreto emerge (vs feature looking for problem)

## 5. Posible use case V2+ (especulativo)

Greenhouse podría exponer un **External Agent** "ICO Performance" que:
- Vive en Notion workspace Efeonce
- Operador chat: "Cuál es el RpA de Sky últimos 3 meses?"
- Agent llama backend Greenhouse autenticado (server.greenhouse.efeoncepro.com/api/agents/ico)
- Backend computa via canonical helpers + retorna response
- Agent rendea response in-chat con gráficos Notion

**Pre-requisitos antes de comprometer**:
- TASK-901 estable
- Federation auth Notion ↔ Greenhouse documentada
- ADR scope + cost analysis
- Permissions model claro (agent ve qué data?)

## 6. Hard rules canonical

- **NUNCA** uses External Agents en path productivo Greenhouse mientras esté en Alpha
- **NUNCA** expongas data sensible (RUT, sueldos, financial detail) a un agent sin OAuth/federation auditado
- **SIEMPRE** trata external agents como **untrusted clients** — assume LLM puede hallucinate or be jailbroken
- **NUNCA** dejes que un external agent invoque mutation endpoint sin double-confirm humano

## 7. Investigation gaps

- ¿Notion permite scoped permissions per External Agent? (e.g. "puede leer X, no puede leer Y")
- ¿Auth flow detail — OAuth? PAT? Custom JWT?
- ¿Rate limits aplican igual a External Agents que Custom Agents?
- ¿Audit log Notion captura todas las acciones del agent o solo high-level?

Ver `investigation-gaps/external-agents-alpha-access.md` (stub).

## 8. Cross-refs

- `developer-platform-2026/workers-canonical.md` — diferencia con Workers
- `developer-platform-2026/agent-tools.md` — Workers as deterministic alternative
- `investigation-gaps/external-agents-alpha-access.md` (stub) — questions abiertas
- TASK-879 (Greenhouse) — readiness eval framework

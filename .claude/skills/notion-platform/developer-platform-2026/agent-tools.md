# Notion Agent Tools — Workers as deterministic tool calls

> **Status**: Beta (May 13, 2026)
> **Source**: https://www.notion.com/blog/introducing-developer-platform
> **Last verified**: 2026-05-17

## 1. Qué son Agent Tools

Un **Agent Tool** es un Worker que actúa como **callable tool** de un Custom Agent o External Agent Notion.

> "Build agent tools with custom logic for those times when connecting with a third party via MCP (Model Context Protocol) isn't enough."

Pattern conceptual:
1. User chat con Custom Agent en Notion
2. Agent decide invocar un tool (e.g. "compute_rpa_for_task")
3. Notion ejecuta el Worker asociado al tool
4. Worker retorna response
5. Agent continúa razonamiento con el response como context

## 2. Cuándo usar Agent Tool vs MCP

Notion recomienda Agent Tool cuando:
- Logic es **determinística** (matemática, lookup, transformation deterministic)
- Performance o cost importan (Worker es deterministic + cheap; LLM reasoning es expensive)
- Lógica acoplada al workspace Notion específico (vs MCP que es más generic)

MCP gana cuando:
- Necesitas reuso cross-tools (Slack, GitHub, custom backend, etc.)
- Tool sirve a múltiples agents distintos
- Backend ya existe y solo necesitas wire-up

## 3. Custom Agents context

Custom Agents fueron lanzados Feb 2026 (pre-skill date). Para May 2026:
> "Over 1 million Custom Agents have been created by users since the launch."

Custom Agents resuelven tareas repetitivas:
- Responder FAQs
- Compilar status updates
- Routing automático de tasks
- Etc.

Con Workers Agent Tools, los Custom Agents ahora pueden invocar logic custom (sin estar limitados a MCP-based integrations).

## 4. Implicación para Greenhouse

### Caso de uso candidato (V2+, NO V1)

Custom Agent Notion "Performance Insights" que el operador invoca:
- Tool 1 (Worker): `get_rpa_history(member_id)` → retorna últimos 6 meses RpA from Greenhouse PG
- Tool 2 (Worker): `get_bonus_estimate(member_id, month)` → retorna proyección bonus from `calculateRpaBonus`
- Tool 3 (Worker): `compute_capacity_forecast(team_id)` → retorna forecast

Pero **antes** de comprometer este pattern, varios prerequisites:
- TASK-901 V1.0 estable + RpA writeback operando 30+ días
- Workers GA (no Beta)
- Sentry domain integration funcional (gap actual)
- ADR de cómo Workers consume APIs Greenhouse autenticadas

### V1 — NO candidato

Para TASK-901 RpA writeback **no necesitas Agent Tool** — el writeback es trigger-driven (webhook → outbox → Cloud Tasks → bulk PATCH), no agent-driven.

## 5. Hard rules canonical

- **NUNCA** uses Agent Tool en path bonus payroll mientras Workers esté en Beta
- **NUNCA** asumes que el Custom Agent tendrá acceso a Greenhouse runtime sin federation explícita
- **SIEMPRE** documenta en ADR cuándo un Agent Tool reemplaza un endpoint Greenhouse — security boundary cross-system
- **NUNCA** loggees prompts del agent ni responses del tool sin redaction (puede contener PII)

## 6. External Agents vs Custom Agents — quién usa los tools

| Agent type | Quién provee | Acceso a Workers Agent Tools? |
|---|---|---|
| Custom Agent | Built por user/team en Notion UI | SÍ |
| External Agent | Built externamente (Claude Code, Cursor, Codex, Decagon, custom) | SÍ via External Agent API |
| Notion-native agents | Notion-provided | Varies |

## 7. Cross-refs

- `developer-platform-2026/workers-canonical.md` — runtime base
- `developer-platform-2026/external-agents-api.md` — alpha waitlist
- `decision-frameworks/agent-tool-vs-traditional.md` (stub)
- `output-templates/workers-tool-template.md` (stub)

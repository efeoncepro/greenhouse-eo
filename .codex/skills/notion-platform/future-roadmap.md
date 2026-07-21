# Notion Developer Platform — Future Roadmap canonical

> **Status**: especulativo + Notion-announced trajectory + Greenhouse implications
> **Last verified**: 2026-05-17

## 1. Notion Platform announced trajectory

### Q3 2026 (current quarter)
- ✅ Developer Portal launched (May 12)
- ✅ Workers Beta (May 13) — free hasta Aug 11
- ✅ ntn CLI GA (May 13)
- ✅ External Agents API alpha (waitlist)
- ✅ Notion Agent SDK alpha (waitlist)
- ✅ Database Sync (Workers-powered) Beta
- ✅ Markdown content API (Feb 26) — read + write
- ✅ Views API (Mar 19)
- 🔜 **Aug 11, 2026** — Workers transition to credits-based pricing

### Q4 2026 (expected)
- 🔜 External Agents API → Beta or GA?
- 🔜 Notion Agent SDK → Beta or GA?
- 🔜 Workers → GA?
- 🔜 More partner agents pre-integrated (beyond Claude Code, Cursor, Codex, Decagon)
- 🔜 Posible bulk write endpoints formal (`/v1/pages/bulk`)?
- 🔜 Schema-level events más granulares?

### 2027+ (speculative)
- Cross-data-source joins en queries
- Federation auth standards (OAuth scoped a single data source)
- Worker multi-region deployment
- Audit log API más allá de Enterprise

## 2. Greenhouse-relevant trajectory

### Pre-requisites para re-evaluate Workers en path productivo

Cuando emerge cualquiera de:
- Workers → **GA** (sin Beta disclaimer)
- SLA/uptime guarantees publicadas Notion
- Pricing post Aug 11 2026 estable + predictable
- Sentry/observability integration nativa (sin requerir shim)
- Documentación completa: memory limits, timeout, network, languages
- Multi-region availability

→ Re-abrir `decision-frameworks/workers-vs-cloud-run.md` y considerar migrar:
- TASK-577 follow-up (notion-bq-sync replacement) — candidate
- Otros sync pipelines internos a Notion runtime

### Path canonical para nuevos use cases

| Use case emergente | Decisión canonical actual | Re-evaluate trigger |
|---|---|---|
| Métrica nueva (OTD, FTR, etc.) | TASK-902+ — mismo pattern TASK-901 (Cloud Run + bulk via Cloud Tasks) | Si bulk `/v1/pages/bulk` ship → revisitar |
| Sync external system (Stripe, Hubspot extension) → Notion | Cloud Run custom | Workers GA + observability integration |
| Custom Agent "ICO Performance" para operadores | Workers (único path para agent tool) | Cuando ship internally Notion-resident |
| Federation Notion ↔ Greenhouse data API | Greenhouse REST API con OAuth | Notion Federation standards publish |

## 3. Investigation gaps prioritizados

Ver `investigation-gaps/` directory para detail. Priorities:

### High priority
- **`workers-production-readiness.md`** — qué falta saber antes de comprometer Workers para path bonus
- **`bulk-patch-endpoint`** (no archivo dedicado aún) — verify si endpoint emerge oficial

### Medium priority
- **`external-agents-alpha-access.md`** — signup waitlist + design federation
- **`database-links-capability.md`** — entender semantic vs relations
- **`custom-agents-metric-compute.md`** — V2+ Custom Agent "ICO Insights"

### Low priority (speculative)
- Federation auth standards
- Cross-data-source queries
- Workspace audit log API beyond Enterprise

## 4. Bumps `Notion-Version` anticipados

| Version next | Probable changes | Acción Greenhouse |
|---|---|---|
| 2026-XX-XX (~Q3/Q4) | Bulk PATCH endpoint, new aggregation, etc. | Audit + bump constant + shadow test |

Mantener `developer-platform-2026/notion-version-history.md` actualizado cada release Notion.

## 5. Maintenance triggers para esta skill

Re-update este file cuando:
- Notion publica major release notes
- Q4 2026 transición de Workers Beta → GA
- Aug 11, 2026 pricing change kicks in
- Cualquier Greenhouse task que evalúe Notion option triggers re-decision

## 6. Cross-refs

- `developer-platform-2026/*` — all features Q1-Q3 2026
- `decision-frameworks/workers-vs-cloud-run.md` — incumbent decision
- `investigation-gaps/*` — questions abiertas
- TASK-879 (Greenhouse) — readiness eval framework
- TASK-577 (Greenhouse) — sync evolution roadmap

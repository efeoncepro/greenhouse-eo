---
paths:
  - "src/lib/efeonce-insights/**"
  - "src/app/api/platform/app/insights/**"
  - "src/app/api/platform/ecosystem/insights/**"
  - "src/mcp/greenhouse/**"
---

# Efeonce Insights — invariantes (auto-load por path)

Invoca la skill `efeonce-insights` (+ `efeonce-mcp-platform` si vas a federar una tool) y carga
`docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` (§5 ventana y contrato de datos, §7 API/MCP/autorización,
§10 gates, §14 estado) + `EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md`. El dominio vive en `src/lib/efeonce-insights/**`
(el path lleva marca: `insights` a secas colisiona con Nexa Insights) sobre el schema `greenhouse_insights`.

- **Ventanas `[start, end)` en zona IANA**, resueltas en `window.ts` (DST en dos pasadas, «mes anterior» ≠ 30 días,
  29-feb → 28-feb, máximo de días, nunca futuro). **NUNCA** recalcular una ventana inline en un adapter o lane.
- **Idempotencia por `(organization_id, idempotency_key)` + `request_hash`**: misma key y mismo payload ⇒ la misma
  edición con `idempotent: true`; payload distinto ⇒ `409 idempotency_conflict`. **NUNCA** crear una segunda edición
  «para reintentar».
- **Adapters (`adapters/seo|aeo|ico`) consumen SÓLO readers dueños** de cada dominio (`readSeoOverviewKpisForWindow`,
  el run AEO cuyo `asOfDate` cae en la ventana, los materializers ICO). **NUNCA** importar `@/lib/client-portal/*`
  desde este dominio ni leer tablas ajenas; y el portal consume `readers/projection.ts`, jamás `greenhouse_insights.*`.
- **Snapshot sellado y plan congelado son inmutables** (triggers de no-update/no-delete; hash). Una corrección es
  `revise` → edición nueva, **NUNCA** un UPDATE.
- **Emitir exige outputs validados + gate humano**: el `InsightOutputsPort` real (TASK-1846, conectado al cargar
  `commands/index.ts`) sólo valida outputs `completed` con asset de la MISMA audiencia; faltar uno es `not_ready`
  con `missing`. El actor del gate es `member`/`client_user`, nunca un binding MCP (ecosystem no emite ni retira).
- **Render durable (`render/**`)**: sólo `INSIGHT_RENDERABLE_OUTPUTS` (`deck_pdf` → catálogo `insights-deck`, `report_pdf` → `insights-report`; `INSIGHT_RENDER_CATALOG_BY_OUTPUT`, string para no arrastrar el catálogo al bundle de Vercel) se encola; otro target es
  `render_rejected`, nunca "para después". **NUNCA** truncar cifras/afirmaciones para caber en un slot (el mapper
  rechaza con causa). **NUNCA** separar lease de fencing ni finalizar sin presentar el `fence_token`. El worker
  despacha por `RenderConsumer` (`services/artifact-worker/consumers/*`): Proposal es un adapter compatible.
- **Tres planos de acceso en cada command** (`authz.ts`): módulo per-ORG `insights_v1` asignado (vía
  `enableClientPortalModule`, script `scripts/insights/assign-insights-module.ts`) + capability `insights.*` + audiencia
  (`internal` prohibida al cliente). **Org sin módulo ⇒ 404 anti-oracle**, jamás 403.
- **Flags multi-gate**: `INSIGHTS_RENDER_ENABLED` se lee en TRES runtimes — Vercel (encolar; la puerta de producto por
  ambiente, default OFF), el Job `artifact-worker` (reclamar) y el `ops-worker` (despachar). Job y `ops-worker` son únicos
  para staging y producción, así que declaran el flag default ON en su `deploy.sh` (SoT); omitirlo en el dispatcher deja
  toda cola sin drenar (hallazgo 2026-09-16). Render ON en los tres runtimes en staging y producción desde 2026-09-16
  (release `917491fd02e4`); con el Job en frío el dispatcher puede lanzar dos ejecuciones para un output (una finaliza). Los demás sólo en Vercel: `INSIGHTS_GENERATION_ENABLED` (crear/revisar; ON en
  Production y staging desde 2026-09-15), `INSIGHTS_ISSUANCE_ENABLED`, `INSIGHTS_AUTHORING_AI_ENABLED` (Gemini acotada
  con validación de cifras y fallback determinista). Sin generación ⇒ `503 generation_disabled`. Registrar todo flip en
  `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.
- **Sharing / correo / recurrencia (TASK-1848, `sharing/`, `delivery/`, `schedules/`)**: del token `isg_` sólo se
  persiste su sha256 — **NUNCA** el bearer (ni cifrado); un reintento de correo revoca el grant y emite otro. El reader
  público (`/api/public/insights/shared/**`) responde 404 desconocido/expirado, 410 revocado/retirado, 429 y SIEMPRE
  `private, no-store` (distinto del Grader a propósito) y revalida el grant antes de servir cada byte. Enviar por correo
  y gestionar recurrencias sólo por App lane con persona interna (ecosystem/MCP leen). Un destinatario `ambiguous`
  **NUNCA** se reenvía: se reconcilia contra `email_deliveries`. Un schedule **NUNCA** emite ni envía (CHECK
  `draft_for_review`). Flags `INSIGHTS_SHARING_ENABLED` (Vercel), `INSIGHTS_DELIVERY_ENABLED` y
  `INSIGHTS_SCHEDULES_ENABLED` (Vercel + `ops-worker`); los EmailTypes nacen apagados en `email_type_config`.
- **Eventos** `insights.*` sólo por `events.ts` en la misma transacción del write; **señales** de reliability
  `insights.editions.*` leen la tabla, no el evento. Observabilidad: `captureWithDomain(err, 'insights', …)`.
- **Tool MCP nueva** ⇒ entrada en `src/mcp/greenhouse/tool-manifest.ts` (`writes` correcto) + `pnpm mcp:manifest:generate`
  + federación en `efeonce-mcp` en el mismo trabajo; un write reusa el scope de clase `efeonce.mcp.insights.write`.
  La skill servida `docs/mcp/skills/efeonce-insights/SKILL.md` **NUNCA** contiene TASK ids, rutas de repo, UUIDs, org ids
  ni secretos (test de fuga); al editarla, `pnpm mcp:skills:generate` + `pnpm mcp:skills:check`.

Registro de construcción y despliegue (archivo por archivo, schema, contratos, matriz de runtimes): `docs/architecture/EFEONCE_INSIGHTS_IMPLEMENTATION_RECORD_V1.md`.

**Contrato de mantenimiento de la skill:** toda task de EPIC-045 (1846–1849, 1875 y futuras) actualiza `.claude/skills/efeonce-insights/` al cerrar — `references/program-ledger.md` (qué construyó y dónde corre), `architecture-map.md`, `contracts.md`, `operations.md`, `lessons.md` — y espeja a `.codex/` (`rsync -a --delete .claude/skills/efeonce-insights/ .codex/skills/efeonce-insights/`). Sin eso la task no se declara complete. Las sesiones que hacen trabajo parcial anotan en `lessons.md` de inmediato.

# Investigation gap — Workers production readiness

> **Status**: ABIERTO al 2026-05-17
> **Bloqueador**: Workers en Beta → liability para path bonus payroll
> **Next review trigger**: Workers → GA announcement, o Notion publica todos los specs faltantes
> **Last verified**: 2026-05-17

## 1. Por qué importa

TASK-901 + TASK-879 follow-ups deben decidir si Workers son canonical para algún path Notion-resident. Hoy la respuesta canonical es **NO en path productivo** porque varias preguntas estructurales están sin responder.

## 2. Questions abiertas — Production readiness

### 2.1 Pricing post Aug 11, 2026
- ¿Costo por invocation exacto?
- ¿Costo per MB output / network egress?
- ¿Min commitment?
- ¿Discounts at scale?

**Acción**: Aug 11, 2026 → re-evaluar pricing publicado vs Cloud Run equivalent steady-state cost.

### 2.2 Runtime limits
- Memory limit exacto (1GB? 512MB? scalable?)
- CPU allocation
- Execution timeout (30s? 5min? 60min?)
- Concurrent execution model (sequential? parallel? throttled?)
- Languages soportados (TypeScript confirmed, Python? other?)

**Acción**: Notion-publish docs limits formally, o community-test + document.

### 2.3 Outbound network policies
- ¿Allowlist mode (whitelist domains)?
- ¿Unrestricted egress?
- ¿Rate-limited?
- ¿Static IPs disponibles para downstream allowlist?
- ¿VPN / private endpoints support?

**Acción**: critical para integrations con Cloud SQL / BigQuery / external APIs Greenhouse — sin egress garantizado, no se puede usar.

### 2.4 Observability + debugging
- Sentry integration nativa? O requires shim?
- Structured logging endpoint?
- Trace propagation cross-runtime (Cloud Run → Worker → Notion API)?
- Local development emulator?

**Acción**: gap crítico para Greenhouse — sin Sentry domain tagging, signals per-module invisible. Workers must integrate antes de productivo.

### 2.5 SLA + reliability
- Uptime SLA publicado?
- Worker failure isolation (1 Worker down vs ecosystem down)?
- Disaster recovery posture (data loss, region failure)?
- Notion-side incident notification a Worker owners?

**Acción**: sin SLA, path crítico bonus payroll = liability.

### 2.6 Auth + identity
- ¿Worker corre como qué identity contra Notion API? (bot? agent? service account dedicado?)
- ¿Cómo se inyecta external secrets (e.g. Greenhouse PG password) en Worker runtime?
- ¿Workers tienen permissions distintos del integration que los owns?

**Acción**: critical para defense-in-depth — sin claridad, blast radius indefinible.

### 2.7 Deploy + rollback
- ¿Worker version history?
- ¿Traffic split (canary deployment)?
- ¿Rollback to previous version inmediato?
- ¿CI/CD integration (GitHub Actions, etc.)?

**Acción**: necesario para production discipline. Hoy todo via `ntn workers deploy` manual.

### 2.8 Multi-region + latency
- ¿Workers corren en single region o multi?
- ¿Latency vs Notion API depende de Worker region?
- ¿Cross-region failover?

**Acción**: medium priority — Greenhouse principal en US, Notion también, OK V1. Important si expansion regional emerge.

## 3. Questions abiertas — Functional gaps

### 3.1 Bulk operations native
- ¿Workers tienen acceso a un bulk API Notion no público externamente?
- ¿Pueden ejecutar N PATCHes en single Notion API call internamente (vs sequential)?

**Acción**: si SÍ → Workers podría resolver el bug class "`/v1/pages/bulk` no existe" canonically.

### 3.2 Real-time bidirectional sync
- ¿Workers pueden suscribirse a webhooks externos (Stripe, etc.)?
- ¿Pueden ejecutar long-polling o WebSocket?

**Acción**: define posibles use cases V2+ que Workers habilitan vs Cloud Run.

### 3.3 Cross-workspace access
- ¿Un Worker puede acceder múltiples workspaces (multi-tenant Greenhouse)?
- ¿O 1 Worker por workspace?

**Acción**: importante para arquitectura Greenhouse multi-tenant (Efeonce + Sky + futuros).

## 4. Discovery experimental — TASK-879 setup

Per TASK-879 (Greenhouse), ya se hizo discovery sandbox:
- ✅ `ntn` autenticado contra workspace Efeonce
- ✅ Worker sandbox `greenhouse-cli-readiness-sandbox` (`019e2937-...`) deployado con tool sample `sayHello`
- ✅ Ejecución remota OK
- ✅ Runs auditables en CLI
- ✅ Sin syncs, webhooks, database links ni writes productivos

Discovery sandbox queda intacto para futuras pruebas a medida que questions arriba se respondan.

## 5. Decision tree canonical hasta que gaps cierren

```
¿Worker está en Beta?
    └── SÍ → NO usar en path productivo bonus payroll
              SÍ OK para discovery / non-critical exploración

¿Worker requires external auth/secrets para acceder Greenhouse data?
    └── SÍ + sin docs claras → NO usar
              SÍ + docs claras → audit + ADR + considerar

¿Logic puede vivir 100% dentro Notion (no toca Greenhouse stack)?
    └── SÍ + workload pequeño → Workers candidate post Aug 11 pricing
    └── NO → Cloud Run canonical
```

## 6. Re-review checklist

Cuando alguna de estas condiciones cumpla, actualizar este archivo:
- [ ] Workers → GA announced
- [ ] Pricing post Aug 11 publicado con numbers concretos
- [ ] Memory / timeout / language limits documented
- [ ] Outbound network policy clarified
- [ ] Sentry integration available (nativa o shim documentada)
- [ ] SLA published
- [ ] CI/CD integration docs

→ Actualizar `decision-frameworks/workers-vs-cloud-run.md` con re-scored matrix
→ Actualizar `SKILL.md` §0 estado canónico
→ Bumpear SKILL.md version

## 7. Cross-refs

- `developer-platform-2026/workers-canonical.md` — capacidades known
- `developer-platform-2026/ntn-cli.md` — deploy flow
- `decision-frameworks/workers-vs-cloud-run.md` — incumbent decision
- `future-roadmap.md` — trajectory expected
- TASK-879 (Greenhouse) — readiness eval framework

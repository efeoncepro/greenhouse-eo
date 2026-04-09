# TASK-305 — Claude Secret Hygiene Skill

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `none`
- Branch: `task/TASK-305-claude-secret-hygiene-skill`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear una skill específica para Claude que estandarice cómo auditar, sanear, rotar y verificar secretos en Greenhouse sin volver a caer en contaminación de payloads, drift por ambiente o verificaciones incompletas. La skill debe vivir en la convención real de Claude del repo y reutilizar las reglas ya formalizadas tras `ISSUE-032`.

## Why This Task Exists

Greenhouse ya documentó y endureció el manejo de secretos en Codex y en la documentación operativa, pero Claude todavía no tiene una skill dedicada para esta superficie. Eso deja un gap multi-agente: el protocolo existe, pero no está empaquetado como workflow invocable en `.claude/skills/`, por lo que el siguiente incidente puede volver a depender de memoria humana o de lectura manual dispersa.

## Goal

- Crear una skill de Claude para secretos bajo la convención real del repo.
- Alinear esa skill con las reglas canónicas de Secret Manager, auth, webhooks y PostgreSQL.
- Dejar a Claude con un workflow safety-first que priorice auditoría, clasificación de riesgo, verificación del consumer y documentación de incidentes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`

Reglas obligatorias:

- La skill debe tratar el saneamiento runtime como defensa en profundidad, no como permiso para mantener payloads sucios en origen.
- La skill no debe asumir que una rotación está cerrada hasta verificar el consumer real en el ambiente afectado.
- La skill debe recordar impactos especiales:
  - `NEXTAUTH_SECRET` puede invalidar sesiones
  - secretos de webhook requieren reprobar firma/HMAC
  - passwords PostgreSQL requieren `pnpm pg:doctor` o conexión real
- La skill debe defaultear a auditoría read-only; no debe promover rotaciones automáticas sin instrucción explícita.

## Normative Docs

- `AGENTS.md`
- `CLAUDE.md`
- `project_context.md`
- `Handoff.md`
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
- `docs/operations/ISSUE_OPERATING_MODEL_V1.md`
- `docs/issues/resolved/ISSUE-032-secret-manager-payload-contamination-breaks-runtime-secrets.md`
- `.claude/skills/greenhouse-email/skill.md`
- `.claude/skills/greenhouse-task-planner/skill.md`

## Dependencies & Impact

### Depends on

- `docs/issues/resolved/ISSUE-032-secret-manager-payload-contamination-breaks-runtime-secrets.md`
- `.codex/skills/greenhouse-secret-hygiene/SKILL.md`
- `src/lib/secrets/secret-manager.ts`
- `src/lib/auth-secrets.ts`
- `src/lib/nubox/client.ts`

### Blocks / Impacts

- Multi-agent operability en incidentes de secretos y `*_SECRET_REF`
- Futuros issues de auth, webhooks, provider tokens y passwords PostgreSQL

### Files owned

- `.claude/skills/greenhouse-secret-hygiene/skill.md`
- `CLAUDE.md` `[solo si hace falta registrar la nueva skill]`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- Claude ya tiene skills locales en el repo:
  - `.claude/skills/greenhouse-email/skill.md`
  - `.claude/skills/greenhouse-task-planner/skill.md`
- Codex ya tiene skill equivalente como baseline de comportamiento:
  - `.codex/skills/greenhouse-secret-hygiene/SKILL.md`
- El protocolo canónico anti-contaminación ya quedó documentado en docs operativos y de arquitectura.
- El helper canónico de runtime ya sanea payloads contaminados:
  - `src/lib/secrets/secret-manager.ts`

### Gap

- Claude no tiene todavía una skill específica para secretos en `.claude/skills/`.
- El protocolo existe, pero no está empaquetado como workflow invocable para Claude.
- No hay garantía de que Claude siga por defecto la misma matriz de riesgo/verificación que ya quedó institucionalizada tras `ISSUE-032`.

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

### Slice 1 — Skill contract para Claude

- Crear `.claude/skills/greenhouse-secret-hygiene/skill.md` siguiendo la convención real de Claude del repo.
- Definir claramente cuándo invocar la skill:
  - `*_SECRET_REF`
  - GCP Secret Manager
  - rotación de secretos
  - drift de env vars
  - auth/webhooks/PostgreSQL/provider tokens
- Incluir los first reads mínimos y los paths reales del repo que Claude debe consultar.

### Slice 2 — Workflow safety-first

- Codificar en la skill un workflow concreto:
  - clasificar familia de secreto
  - confirmar source of truth
  - auditar sin exponer valores
  - proponer remediación mínima segura
  - verificar el consumer real
  - documentar `ISSUE`, `Handoff`, `changelog` y `project_context` si aplica
- Incluir guardrails explícitos para no imprimir secretos ni rotarlos por defecto.

### Slice 3 — Paridad operativa con el protocolo actual

- Alinear la skill con las reglas ya documentadas en `AGENTS.md`, `CLAUDE.md`, `project_context.md` y Cloud Governance/Security/Infrastructure.
- Si hace falta, dejar una nota corta en `CLAUDE.md` o `Handoff.md` indicando que la nueva skill ya existe y cuál es su path canónico.

## Out of Scope

- Automatizar rotaciones de secretos sin aprobación explícita del usuario.
- Crear tooling nuevo de Secret Manager, scripts de auditoría o infraestructura GCP.
- Cambiar contratos runtime de `src/lib/secrets/secret-manager.ts` o de consumers existentes.
- Reabrir `ISSUE-032` ni volver a tocar secretos productivos si no hay un incidente nuevo.

## Detailed Spec

La skill de Claude debe reflejar estas reglas mínimas:

- formato de skill de Claude consistente con `.claude/skills/greenhouse-email/skill.md`
- instrucciones explícitas para:
  - no imprimir valores crudos
  - tratar payloads scalar como raw scalar
  - usar `printf %s "$VALOR" | gcloud secrets versions add <secret-id> --data-file=-` cuando el usuario sí pida corregir en origen
  - verificar consumers reales, no solo la existencia del secreto
- matriz mínima de verificación:
  - auth: `/api/auth/providers`, `/api/auth/session`
  - webhooks: firma/HMAC del endpoint real
  - PostgreSQL: `pnpm pg:doctor` o conexión real
  - providers: endpoint o integración que falló
- impactos especiales que la skill debe recordar:
  - `NEXTAUTH_SECRET` puede invalidar sesiones activas
  - secretos webhook requieren reprobar firma/HMAC
  - passwords PG requieren validación de conectividad
- el tono debe ser operativo, corto y accionable; no una guía teórica larga

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe una nueva skill de Claude en `.claude/skills/greenhouse-secret-hygiene/skill.md`.
- [ ] La skill referencia paths reales del repo y cubre Secret Manager, auth, webhooks, PostgreSQL y provider tokens.
- [ ] La skill deja explícito que el default es auditoría read-only y que no se deben exponer secretos crudos.
- [ ] La skill incluye una matriz concreta de verificación por tipo de secreto y menciona el impacto especial de `NEXTAUTH_SECRET`.
- [ ] La documentación del repo queda consistente si se agrega una nota registrando la nueva skill.

## Verification

- Revisión manual del contenido de `.claude/skills/greenhouse-secret-hygiene/skill.md`
- Comparación manual contra:
  - `.claude/skills/greenhouse-email/skill.md`
  - `.claude/skills/greenhouse-task-planner/skill.md`
  - `.codex/skills/greenhouse-secret-hygiene/SKILL.md`
- Validación manual de que todos los paths citados existen en el repo

## Closing Protocol

- [ ] Si se registra la skill en docs de continuidad, dejar el path canónico y el objetivo de uso en `Handoff.md`
- [ ] No modificar secretos reales, entornos ni GCP como parte de esta task

## Follow-ups

- Evaluar si en el futuro vale la pena una segunda skill complementaria para auditoría masiva de entornos (`preview` / `staging` / `production`) sin mutaciones.

## Open Questions

- Confirmar si Claude necesita además una convención de metadata adicional fuera de `skill.md` para discovery local.

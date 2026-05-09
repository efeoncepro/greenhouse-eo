# DOCUMENTATION_OPERATING_MODEL_V1.md

## Objetivo
Reducir duplicacion documental sin perder continuidad, trazabilidad ni contexto para producto, UI y deploy.

## Regla base
Cada cambio debe documentarse, pero no cada documento debe repetir la historia completa.

La calidad de solucion no debe duplicarse en cada spec. La fuente canonica transversal es `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`: soluciones seguras, robustas, resilientes y escalables por defecto; workarounds solo temporales, reversibles y documentados.

## Layout del repo

### 1. Raiz operativa
- `README.md`
- `AGENTS.md`
- `CONTRIBUTING.md`
- `project_context.md`
- `Handoff.md`
- `Handoff.archive.md`
- `changelog.md`
- Esta raiz queda reservada para onboarding GitHub y continuidad operativa entre agentes.

### 2. Carpeta `docs/`
- Aqui viven specs, roadmap, tasks y guias especializadas.
- La taxonomia vigente es:
  - `docs/architecture/`
  - `docs/api/`
  - `docs/audits/`
  - `docs/changelog/`
  - `docs/epics/`
  - `docs/mini-tasks/`
  - `docs/ui/`
  - `docs/roadmap/`
  - `docs/operations/`
  - `docs/tasks/`
- `docs/README.md` debe servir como indice maestro.

## Estructura canonica

### 1. Documento maestro
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- Aqui viven principios, decisiones estables, fases y contratos de producto.
- No registrar aqui el detalle de cada turno.

### 2. Contexto operativo
- `project_context.md`
- Aqui vive el estado actual del repo, stack, rutas, librerias activas, deploy y restricciones.
- Debe responder: que existe hoy, que se usa hoy, que sigue pendiente hoy.
- La especializacion canonica para `project_context.md` + `Handoff.md` + `Handoff.archive.md` vive en `docs/operations/CONTEXT_HANDOFF_OPERATING_MODEL_V1.md`.

### 3. Continuidad de turno
- `Handoff.md`
- Aqui solo deben quedar:
  - objetivo del turno
  - cambios aplicados
  - validacion
  - riesgos o pendientes
- Formato corto. No duplicar arquitectura.
- Si hace falta conservar historia detallada, moverla a `Handoff.archive.md` y dejar en `Handoff.md` solo el estado activo.
- No borrar historia auditable para reducir tamano: preservar en `Handoff.archive.md`, task complete, issue resuelto o doc canonica, y dejar puntero corto cuando siga siendo relevante.

### 4. Registro de cambios
- `changelog.md`
- Solo cambios de comportamiento, estructura o workflow.
- Una o pocas lineas por cambio real.

### 5. Guias especializadas
- Docs tematicas como:
  - `docs/ui/GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md`
  - `docs/ui/SKY_TENANT_EXECUTIVE_SLICE_V1.md`
- Deben contener contrato y decisiones de su dominio, no repetir contexto general del repo.

### 5.0. Calidad de solucion transversal
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- Aqui vive la regla anti-parche para todos los agentes y dominios.
- Otros documentos deben enlazar esta fuente cuando necesiten reforzar el criterio, no copiar definiciones largas.
- Si un dominio necesita criterios adicionales, debe extender esta regla con constraints especificos sin rebajar el baseline.

### 5.0.bis. Architecture Decision Records
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- Aqui vive la politica canonica de ADRs para Greenhouse.
- `docs/architecture/DECISIONS_INDEX.md` es el indice maestro de decisiones aceptadas.
- Los ADRs no reemplazan specs, tasks, auditorias ni handoffs:
  - specs guardan el contrato tecnico vigente
  - ADRs guardan la decision, alternativas y consecuencias
  - tasks ejecutan
  - auditorias observan estado en una fecha
  - handoff registra continuidad corta
- Modelo preferido:
  - ADR embebido en la spec `GREENHOUSE_*_V1.md` cuando la decision pertenece a un dominio claro
  - ADR dedicado en `docs/architecture/` cuando la decision cruza dominios o crea una primitive transversal
- Si una task cambia source of truth, schema, access model, auth/session, finance/payroll/accounting semantics, events/outbox/webhooks, APIs externas, cloud/deploy/secrets, UI platform o runtime projections compartidas, debe identificar o crear/proponer ADR antes de implementar.

### 5.1. Auditorias tecnicas y operativas
- `docs/audits/`
- Aqui viven auditorias reutilizables, fechadas y versionadas sobre sistemas, pipelines, contracts o runtime slices.
- Una auditoria captura el estado observado en una fecha y debe incluir scope, conclusiones y riesgos.
- Regla de consumo:
  - deben usarse frecuentemente como contexto cuando el trabajo toque la zona auditada
  - no deben asumirse vigentes a ciegas
  - antes de apoyarse en una auditoria, verificar si el runtime, el codebase y la arquitectura siguen reflejando sus hallazgos
  - si la auditoria ya no representa con seguridad el estado actual, abrir una auditoria nueva o un refresh versionado
- Regla de compresion:
  - la auditoria no reemplaza arquitectura, tasks, issues ni runbooks
  - documenta el estado observado y puede servir para priorizar o abrir tasks/issues derivados

### 6. Changelog curado
- `docs/changelog/CLIENT_CHANGELOG.md`
- Aqui vive el changelog client-facing del producto.
- No debe duplicar el detalle tecnico de `changelog.md`.
- Solo debe registrar cambios visibles para usuarios, canales de release y disponibilidad real de capacidades.

### 7. Programas operativos
- `docs/epics/`
- Aqui viven los programas `EPIC-###` cuando el trabajo cruza varios dominios o requiere varias tasks hijas.
- El contrato canónico de lifecycle y relación epic -> task vive en:
  - `docs/operations/EPIC_OPERATING_MODEL_V1.md`
- Los epics coordinan; las tasks siguen ejecutando.

## Regla de compresion

Cuando un cambio toque varios documentos:
- escribir el detalle completo una sola vez en el documento canonico correcto
- en los otros documentos dejar solo el delta y una referencia al documento canonico
- si el cambio es una decision arquitectonica, el detalle de decision vive en el ADR o seccion ADR y los demas documentos enlazan ese contrato

## Plantilla minima por cambio

### README
- una linea de estado si cambia stack, enfoque o referencia principal
- si cambia la taxonomia documental o aparece una auditoria relevante nueva, enlazarla desde `docs/README.md`

### project_context
- que tecnologia o libreria se activo
- donde vive
- para que se usara
- que decision arquitectonica nueva cambia el contrato operativo vigente, con link al ADR o indice

### Handoff
- que se hizo
- que se valido
- que queda pendiente
- que ADR se acepto, supersedio o quedo pendiente, si aplica

### changelog
- una linea de impacto

## Regla para UI y librerias

Para cambios de UI, charts, iconos o assets:
- dejar la regla visual o de seleccion en la doc especializada o skill correspondiente
- dejar en `project_context.md` solo la fuente de verdad de librerias y wrappers activos
- no repetir listas largas de componentes en todos los documentos

## Regla para tokens

La documentacion debe:
- maximizar referencias cortas
- minimizar texto duplicado
- evitar explicar el mismo cambio con redacciones distintas en 4 archivos

Si un documento ya tiene suficiente contexto y otro solo necesita continuidad, enlazar o mencionar, no reescribir.

## Regla para auditorias

- Las auditorias deben ser:
  - fechadas
  - acotadas por scope
  - reutilizables por otros agentes
  - explicitas sobre si describen codigo, runtime, docs o todos los planos
- Una auditoria sirve como input operativo frecuente, pero no como verdad permanente.
- Si un agente va a usar una auditoria para justificar una decision importante, debe revalidar al menos:
  - que los archivos o contratos citados sigan existiendo
  - que no haya una decision arquitectonica posterior que la contradiga
  - que el runtime no haya cambiado de forma material desde la fecha de la auditoria

## Regla para hygiene de secretos

- La política canónica de publicación/rotación de secretos vive en:
  - `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
  - `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
  - `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `AGENTS.md`, `CLAUDE.md`, `project_context.md`, `Handoff.md` y `changelog.md` deben dejar solo el delta operativo corto y enlazar a esos documentos, no duplicar el runbook completo.

## Regla para skills locales de agentes

- La convención canónica para skills de Codex en este repo es:
  - `.codex/skills/<skill-name>/SKILL.md`
  - `agents/openai.yaml` recomendado para metadata UI/discovery
  - `references/`, `scripts/` y `assets/` opcionales para mantener `SKILL.md` corto
- La convención oficial actual para skills de Claude es:
  - `.claude/skills/<skill-name>/SKILL.md`
- Excepción documentada:
  - el repo todavía conserva ejemplos legacy de Claude en `.claude/skills/*/skill.md`
  - esos archivos se tratan como compatibilidad histórica; las skills nuevas no deben seguir naciendo en minúscula por defecto
- Fuente operativa corta para crear skills de Codex:
  - `AGENTS.md`
  - `CLAUDE.md`
  - ejemplos locales en `.codex/skills/`
- Regla de compresión:
  - la explicación canónica de estructura y ubicación vive aquí
  - `Handoff.md`, `changelog.md` y `project_context.md` solo registran la nueva skill, su propósito y el impacto contractual

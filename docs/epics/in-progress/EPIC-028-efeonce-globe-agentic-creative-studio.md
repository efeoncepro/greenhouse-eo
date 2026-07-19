# EPIC-028 — Efeonce Globe: Creative Studio agentic de producción profesional

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Bootstrap de repositorio y proyecto GCP completado; foundation runtime en construcción`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `Efeonce Creative Technology / Product`
- Branch: `main` en el repositorio hermano
- GitHub Issue: `TBD — backlog operativo en https://github.com/efeoncepro/efeonce-globe`

## Summary

Construir **Efeonce Globe**, la capability creativa propia de Efeonce, como una plataforma **agentic por nacimiento** para imagen, video, audio y extensiones futuras. Creative Studio es su descriptor funcional. El producto se opera por UI, MCP y agentes sobre el mismo contrato, pero la experiencia humana empieza en briefs, referencias, tratamientos, candidatos y review; el workflow técnico se compila por debajo. Templates/rúbricas de Efeonce, assets trazables, gasto controlado y revisión humana viven en una plataforma hermana: Greenhouse la integra como consumidor, no la hospeda.

## Why This Epic Exists

Los pilotos de RRSS y Glitch demostraron que generar media es sólo una fracción del trabajo. El valor operacional está en elegir el motor según fidelidad requerida, preservar el set/derechos, controlar créditos, revisar acción/anatomía/sonido y conservar la decisión para repetirla. Si se construye UI-first, MCP/agentes y clientes llegarían tarde y con lógica duplicada. Si se construye dentro de Greenhouse, se agrava su runtime y se desdibuja la propiedad del dominio creativo.

Este programa convierte esos aprendizajes en una capability de agencia acumulable y, después, vendible: **capacidad creativa + dirección + memoria**, no reventa de tokens de un proveedor.

El producto no sustituye la capacidad de agencia. Crea un flywheel: Efeonce prueba craft en operación managed, convierte patrones validados en templates, habilita autonomía cliente en trabajo repetible y conserva el contexto para que Efeonce absorba excepciones, picos y producción de alta incertidumbre sin reiniciar el proyecto.

## Outcome

- Existe un repositorio y runtime propios de Creative Studio con tenancy, assets, ledger, auditoría y workers aislados de Greenhouse.
- Un operador o agente autorizado puede preparar, estimar, aprobar, ejecutar, revisar y ramificar una corrida mediante el mismo contract UI/MCP.
- El mismo run soporta `client-operated`, `co-operated` y `efeonce-managed` mediante responsabilidades y entitlements explícitos; cambiar de modo conserva brief, assets, lineage, review y ledger.
- La UI principal permite trabajar en lenguaje creativo y compila decisiones aprobadas en templates/runs; un canvas DAG queda como authoring avanzado, no onboarding universal.
- La primera plantilla curada de media funciona con provider routing basado en contrato de fidelidad y gates creativos/económicos verificables.
- Greenhouse/Verk/Think consumen sólo proyecciones, eventos o deep links versionados cuando corresponde; no bases de datos, secrets ni lógica compartida.
- La plataforma queda preparada para habilitar clientes y créditos comerciales sin rediseñar identidad, autorización o modelo de costos.

## Architecture Alignment

- [ADR — Efeonce Creative Studio: plataforma agentic peer con paridad UI + MCP](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md)
- [Efeonce Creative Studio — Agentic Platform Architecture V1](../../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md)
- [PDR-003 — Layering del ecosistema digital Efeonce](../../public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md)
- [Greenhouse Sister Platforms Integration Contract V1](../../architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md)
- [Efeonce Product Ecosystem](../../context/03_ecosistema-producto.md)
- [Creative Studio Business Model V1](../../business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md)
- [Studio Credit Model V1](../../business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md)

## Child Tasks

> Las tasks nacen en `efeoncepro/efeonce-globe` después de registrar allí su modelo operativo. Se mantienen aquí como slices de ownership; **no autorizar implementación Greenhouse bajo estos nombres**. La Pillar y los satélites de PDR-014 son un programa editorial de soporte: sus secciones, diagramas, checklists o títulos **no crean child tasks ni especificaciones ejecutables**.

- `TASK-1454` — **Greenhouse ↔ Globe federated identity and governed SDK bridge.** Única task Greenhouse explícita de esta fase: generaliza el broker reusable, registra Globe internal-only y prueba SSO/WIF/ADC sin llaves. No mueve runtime creativo a Greenhouse ni habilita producción/clientes externos.

- `TASK-###` — **Globe repository and cloud foundation.** Continuar desde el bootstrap existente: IaC/state, Workload Identity Federation, service accounts de mínimo privilegio, budgets, Cloud Run, Cloud SQL, buckets y observabilidad base dentro del único proyecto inicial `efeonce-globe`.
- `TASK-###` — **Identity, workspace and canonical command foundation.** Tenant/RLS, roles/capabilities, actor/audit/idempotency y API contract base para UI/MCP.
- `TASK-###` — **Operating modes, responsibility assignments and escalation.** Modelar operador, aprobadores, template/rights authority y delivery owner; comandos auditados para handback/escalamiento sin duplicar run ni ampliar permisos implícitamente.
- `TASK-###` — **Asset provenance and rights foundation.** Asset ingestion privado, hashes, versiones, lineage, signed delivery y políticas de clasificación/derechos.
- `TASK-###` — **Curated format composition and artifact contract.** `format_spec` + `composition_spec` + `artifact_manifest` versionados para formatos curados; primer proving ground = carrusel Instagram. Decks Tender podrán ser consumer futuro sólo por contrato sister-platform, sin absorber RFPs ni mover su renderer contractual.
- `TASK-###` — **Credit ledger and governed run lifecycle.** Estimate/reserve/approve/execute/settle con append-only ledger y worker dispatch seguro.
- `TASK-###` — **Provider contract and first curated template.** Adapter registry, router por contrato de fidelidad, prueba de una modalidad y fixture/evals de control.
- `TASK-###` — **Studio UI and MCP parity proving ground.** La misma corrida se prepara/estima/envía/revisa desde una UI creative-native y herramienta MCP, con evidencia de no duplicación y sin exponer inputs técnicos al runner.
- `TASK-###` — **Creative review, delivery and ecosystem projection.** Review gates, paquete de entrega y primer contrato read/event/deep-link hacia Greenhouse o Verk.
- `TASK-###` — **Client enablement and commercial credits.** Sólo después de legal/finance: roles externos, intake/rights, límites, asignación comercial, templates client-operated acotados, co-operación y experiencia cliente progresiva.

## Existing Related Work

- Pilotos y evidencia: `ai-generations/2026-07-11_glitch-microphone-intro/` y el workflow RRSS documentado en sus manifests/retrospectivos.
- Investigación activa de Creative Operations, agentes y patrón builder/runner: [RESEARCH-009](../../research/RESEARCH-009-creative-operations-agentic-workflows.md). Es input de bootstrap; no habilita implementación dentro de Greenhouse.
- Territorio científico/editorial: [PDR-014](../../public-site/decisions/PDR-014-creative-workflows-territorio-editorial-pillar-cluster.md) + [brief Pillar/cluster](../../public-site/CREATIVE_WORKFLOWS_PILLAR_CLUSTER_BRIEF_V1.md). Puede informar lenguaje, hipótesis y prioridades de investigación; no implementa workflows ni autoriza runtime/backlog.
- Skills operativas: `.codex/skills/motion-design-studio/` y `.codex/skills/audio-studio/` (con espejos Claude).
- Propuestas históricas ahora superseded como runtime Greenhouse: `GREENHOUSE_CONTENT_FACTORY_MEDIA_GENERATION_*`, `GREENHOUSE_CREATIVE_FLOW_STUDIO_DECISION_V1.md` y `GREENHOUSE_CREATIVE_VIDEO_STUDIO_V1.md`.
- `TASK-996` conserva historia del piloto HyperFrames; no es el vehículo de implementación de este epic.

## Exit Criteria

- [ ] Repositorio y límite cloud aislados, con IaC, IAM/secret/tenant posture y evidencia runtime completa. El repositorio privado y el proyecto `efeonce-globe` ya existen; hardening y recursos runtime siguen pendientes.
- [ ] Las capacidades de la primera plantilla funcionan mediante UI y MCP sobre el mismo command/reader layer, con autorización e idempotencia verificadas.
- [ ] Un run completa el lifecycle estimate → reserve → approve → execute → candidate → review → settle/release sin doble gasto ni pérdida de evidencia.
- [ ] Assets, referencias, provider attempts, output y review poseen lineage y acceso scoped por workspace.
- [ ] Cada run identifica operador, aprobadores de creatividad/gasto, autoridad de template/derechos y owner de delivery; un cambio de modo es auditado y no pierde contexto ni eleva permisos por sí solo.
- [ ] Existe al menos una prueba `efeonce-managed` y una simulación co-operated/client-operated sobre el mismo template/run contract, con responsabilidades, escalamiento y métricas diferenciadas.
- [ ] Existe un set de fixtures/evals que incluye al menos un caso de set/practical + actuación/foley y uno de microescena flexible; la selección de motor queda explicable.
- [ ] Integración sister-platform se limita a contrato versionado/documentado y no introduce base de datos, sesión o secret compartido.
- [ ] Habilitar a un cliente, pago/tax o publicación automática permanece bloqueado hasta sus decisiones de legal/finance/rights y sus tasks de rollout.

## Non-goals

- No construir un clon generalista de Higgsfield/ComfyUI ni un canvas libre como primera entrega.
- No pedir a creativos o equipos de marketing que diseñen nodos, proveedores o prompts internos para usar templates curados.
- No mover el runtime creativo a Greenhouse ni exponer Greenhouse como proxy de providers.
- No vender créditos ni procesar pagos antes de definir propiedad comercial, impuestos, refund y derechos.
- No prometer publicación autónoma, aprobación creativa automática ni reemplazar dirección/criterio humano.
- No declarar que un modelo es “mejor” globalmente: la evaluación es por contrato de fidelidad y evidencia de fixture.
- No inferir features, schemas, commands, templates ejecutables ni tasks desde artículos o assets editoriales.

## Delta 2026-07-11

Epic creado desde la decisión explícita del operador: la capability debe nacer agentic y ser operable por UI y MCP con el mismo contrato. La siguiente acción es decidir el bootstrap del repositorio/proyectos, no abrir implementación dentro de `greenhouse-eo`.

## Delta 2026-07-14

El programa adopta un solo producto con tres modos operativos (`client-operated`, `co-operated`, `efeonce-managed`), autonomía progresiva según incertidumbre/riesgo y UI creative-native que compila workflows desde decisiones. Esto no habilita clientes ni crea una quinta modalidad comercial; agrega contratos que el bootstrap debe resolver antes del primer rollout externo.

## Delta 2026-07-19 — Efeonce Globe y bootstrap inicial

El operador fija **Efeonce Globe** como nombre canónico del producto; Creative Studio permanece como descriptor funcional de la vertical creativa. Se creó el repositorio privado `efeoncepro/efeonce-globe` y un único proyecto GCP adicional `efeonce-globe` bajo la organización Efeonce, con billing y APIs base habilitadas. No se crearon workloads, bases de datos, buckets, secretos ni gasto de proveedores. La separación de un proyecto productivo queda diferida hasta que exista un primer release reproducible, con presupuesto, IAM, rollback y promoción de secretos aprobados.

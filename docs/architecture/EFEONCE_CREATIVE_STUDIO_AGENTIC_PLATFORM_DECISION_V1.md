# ADR — Efeonce Creative Studio: plataforma agentic peer con paridad UI + MCP

> **Tipo:** Architecture Decision Record (ecosistema / plataforma hermana)
> **Especificación canónica:** [Efeonce Creative Studio — Agentic Platform Architecture V1](EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md)
> **Regla ADR:** `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`

## Architecture Decision 2026-07-11 — la capacidad creativa nace agentic y fuera de Greenhouse

- **Status:** `Accepted (direction)` — autoriza el programa y sus contratos de diseño; no crea todavía un repositorio, proyecto GCP, base de datos, credenciales ni gasto de proveedores.
- **Date:** 2026-07-11
- **Owner:** Efeonce Creative Technology / Product
- **Scope:** plataforma independiente para producir, revisar y operar imágenes, video, audio y, cuando corresponda, 3D. Incluye interfaz humana, agentes y MCP; no incluye el runtime de Greenhouse.
- **Reversibility:** `two-way-but-slow` — los proveedores, el modelo de rutas y la UI son intercambiables; separar la propiedad de assets, créditos, identidad operativa y contratos cross-platform no debe revertirse sin migración explícita.
- **Confidence:** `high` en la frontera y contrato agentic; `medium` en el orden exacto de proveedores/modelos y en pricing comercial, que requieren evidencia por modalidad.
- **Validated as of:** 2026-07-11 — pilotos reales de RRSS y Glitch documentados en `ai-generations/2026-07-11_glitch-microphone-intro/`.
- **Program:** [EPIC-028](../epics/to-do/EPIC-028-efeonce-creative-studio-agentic-platform.md).

### Context

Efeonce necesita una capacidad propia para convertir dirección creativa en media reproducible: referencias, brief, secuencia, generación, revisión, variantes, audio, entrega y memoria de decisión. Los pilotos recientes demostraron dos verdades que un simple generador SaaS no resuelve:

1. El modelo correcto depende del **contrato de fidelidad** de la toma (set/practical/acción física/audio), no de un canal ni de una preferencia fija de proveedor.
2. Una generación técnicamente terminada no es un entregable: requiere criterio creativo, evidencia, control de gasto, versiones y una vía segura de corrección.

Greenhouse es el hub de experiencia y operaciones de cuenta; no debe absorber otro runtime pesado de media, workers largos, assets voluminosos, billing de proveedores ni el ritmo de producto de una capability creativa. La plataforma debe poder operar primero por el equipo Efeonce y, después, por clientes autorizados, sin reescribir su modelo de dominio.

### Decision

Se crea **Efeonce Creative Studio** como nombre de trabajo de una **plataforma hermana de Efeonce**, agentic desde el primer contrato. No se presenta todavía como nueva sub-marca pública: hacia el mercado sigue siendo una capability de Efeonce hasta que exista una decisión de producto/naming.

1. **Runtime y propiedad separados.** Creative Studio tendrá repositorio, despliegue, base de datos, buckets, secretos, provider adapters y ledger propios. Greenhouse, Think, Verk y el sitio público podrán consumir contratos versionados, pero no alojarán la lógica ni escribirán sus tablas.
2. **Una capability, tres superficies equivalentes.** La UI humana, el servidor MCP y los agentes son clientes del mismo command/reader contract. Ninguna acción de negocio será UI-only; MCP no recibe atajos ni privilegios distintos de la UI.
3. **Autonomía gobernada, no chat que gasta.** El agente puede investigar, componer un brief, elegir una plantilla, proponer proveedor, estimar créditos y preparar una corrida. Una acción con coste, acceso a material restringido, entrega externa o publicación exige autorización explícita: `propose → reserve → approve → execute`.
4. **Plantillas y agents primero; canvas después.** El V1 ofrece flujos curados y parametrizables (por ejemplo, still-to-video, video repair, audio/foley, set de RRSS). Un canvas DAG libre es una capa posterior sobre el mismo runner, no el MVP ni el centro de gravedad.
5. **Assets, linaje y créditos son dominio first-class.** El sistema conserva una copia durable autorizada, hash, derechos, referencias, modelo/proveedor, prompt/brief versionado, revisiones y derivaciones. El crédito vendible se registra en un ledger append-only independiente del costo bruto del proveedor.
6. **Cloud-native y async.** El control plane es un servicio web/API; las corridas de media viven en workers separados, idempotentes y observables. Cloud Tasks sólo despacha; Cloud Run Jobs ejecuta o supervisa trabajo largo. No se introduce Kubernetes, un bus complejo ni una plataforma de workflow externa en la fundación.
7. **Multi-tenant antes de ser externo.** Aunque el acceso inicial es interno, cada aggregate nace con `workspace_id`, roles, policy de asset y límites de gasto. El cliente no se habilita por un bypass futuro: se activa con entitlements, permisos, aprobaciones y cuotas ya existentes en el contrato.

### Alternatives Considered

- **Construirlo dentro de Greenhouse:** rechazado. Acopla media/worker/costo/asset storage a un producto ya pesado y diluye su frontera como hub.
- **SaaS UI-first y añadir agentes/MCP después:** rechazado. Deja la lógica en pantallas, crea parity retroactiva y convierte a los agentes en automatización frágil de clicks.
- **Un único proveedor para toda modalidad:** rechazado. Los pilotos muestran que fidelidad de set, comportamiento humano, texto/practicals y foley requieren rutas distintas y evaluación por caso.
- **Canvas libre tipo ComfyUI/Higgsfield como MVP:** rechazado. Hace opaco el gasto, aumenta carga cognitiva y no captura aún la IP de dirección de Efeonce.
- **Reventa simple de requests del proveedor como créditos:** rechazado. El producto vende una capability creativa gobernada —dirección, plantillas, QA, storage y memoria— no minutos de un modelo sin contexto.
- **Agente autónomo que ejecuta/pública sin aprobación:** rechazado. Un LLM no posee presupuesto, derechos de uso ni autoridad creativa/comercial.

### Consequences

- **Positivas:** capability defendible de Efeonce; misma operación por UI/MCP/agente; memoria creativa acumulable por marca/proyecto; elección de motor basada en evidencia y no en marca; futura oferta cliente sin re-arquitectura.
- **Costos:** nuevo repositorio y operación cloud; disciplina de contracts/auditoría; actualización continua de adapters, precios y evaluaciones; ownership explícito de material con derechos.
- **Riesgos que permanecen:** drift de modelos, costo variable, outputs que parecen correctos pero fallan dirección física, y ambigüedad comercial de créditos. Todos se mitigan con review humana, fixtures/evals, reservas de crédito y políticas de aprobación, no con prompt más largo.

### Invariants

- La UI, MCP, agentes, CLI y workers consumen commands/readers canónicos; no hay lógica de negocio sólo en una surface.
- Cada write reintentable lleva actor, `workspace_id`, idempotency key, audit event y estado observable.
- Los providers nunca son source of truth de un asset o de su costo final.
- Los créditos se reservan y liquidan en ledger append-only; un contador mutable no basta.
- Un asset o run no cruza workspaces por URL, prompt, cache, log, evento ni herramienta MCP.
- `completed` por un proveedor significa candidato técnico, no aprobación creativa ni permiso de publicación.
- Greenhouse consume proyecciones o contratos del Studio; no hay DB compartida, sesión compartida ni acceso administrativo implícito.

### Revisit When

- Se apruebe el bootstrap del repositorio/proyectos GCP y se creen las primeras tasks de EPIC-028.
- Se habilite el primer workspace cliente o se comercialicen créditos — requiere revisión legal, fiscal, billing y política de derechos antes de activar pagos.
- Una modalidad requiera GPU/latencia que Cloud Run Jobs no resuelva de forma económica.
- El catálogo o las condiciones de proveedores cambien materialmente, o los evals de fidelidad contradigan el router vigente.

### Related historical proposals

Los documentos Greenhouse de Media Foundry, Creative Flow Studio y Creative Video Studio quedan **superseded como ubicación de runtime**. Sus principios útiles (provider neutrality, async, aprobación, historial del piloto) son evidencia histórica; no autorizan implementar media en Greenhouse.


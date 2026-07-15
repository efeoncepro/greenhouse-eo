# RESEARCH-009 — Creative Operations y workflows agentic

> **Status:** Active
>
> **Creado:** 2026-07-12
>
> **Owner:** Efeonce Creative Studio / Creative Technology
>
> **Relacionado:** [EPIC-028](../epics/to-do/EPIC-028-efeonce-creative-studio-agentic-platform.md) · [arquitectura objetivo](../architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md) · [documentación funcional](../documentation/ai-tooling/estudio-de-flujos-creativos.md)
>
> **Alcance:** investigación estratégica y de producto. No autoriza runtime, gasto de proveedores, cambios de ADR ni el uso de un canvas libre.

## Pregunta de investigación

¿Cómo debe Efeonce Creative Studio convertir dirección y craft creativo en una capacidad acumulable, sin confundir la exploración con una línea de producción, exigir que una persona creativa piense como ingeniera ni delegar criterio, gasto o aprobación a un agente?

## Tesis de trabajo

Un **Creative Workflow** no es creatividad automatizada. Es la infraestructura que conserva el contexto, las decisiones y la evidencia alrededor de un acto creativo humano.

La unidad de valor deja de ser el prompt o un asset aislado. Es una **Creative Run**: intención, brief, referencias, tratamiento, decisiones, versión de la receta, proveedor/modelo resuelto, costos, artefactos, revisión y resultado.

```text
Intención / problema
  -> exploración divergente
  -> decisión creativa humana
  -> producción repetible y trazable
  -> revisión humana
  -> entrega + aprendizaje reutilizable
```

La ingeniería no debe decidir qué vale la pena decir ni cuál es el buen gusto. Debe volver visible, reversible, colaborable y gobernable lo que ocurre después —y alrededor— de esa decisión.

## Qué se investiga realmente

Este documento es un **scan de dirección de producto**, no un estudio de cuota de mercado ni una validación de adopción. Sus fuentes son anuncios y documentación primaria de proveedores; demuestran qué se está productizando, no que cada promesa ya sea madura o apropiada para Efeonce.

| Hallazgo | Confianza | Razón |
| --- | --- | --- |
| El mercado converge hacia contexto persistente, referencias reutilizables, workflows editables y revisión/gobernanza alrededor de modelos generativos. | Alta | Adobe, Magnific, Canva, Google, ComfyUI y Anthropic lo materializan desde arquitecturas distintas. |
| La interfaz ganadora será una combinación de conversación, canvas y aplicaciones profesionales, no una sola superficie. | Media | Hay evidencia de las tres, pero el mercado sigue en beta/preview y cambia rápido. |
| El agente puede sustituir criterio creativo, revisión final o autoridad de gasto. | Baja / hipótesis rechazada | Los productos serios exponen control humano; no hay evidencia suficiente para delegar estas decisiones en Efeonce. |

## El modelo de dos velocidades

### 1. Exploración creativa: divergente

Aquí se generan referencias, alternativas, tratamientos, storyboards, pruebas de cámara y preguntas. La no linealidad es una virtud: se puede volver atrás, bifurcar y cambiar de dirección. El agente puede investigar, recuperar precedentes, organizar referencias y proponer un plan, pero no convertir una hipótesis en producción por defecto.

### 2. Producción creativa: convergente

Después de que una persona con autoridad fija una dirección, el proceso sí puede tomar forma de workflow: inputs acotados, template versionado, proveedor compatible, presupuesto, ejecuciones, review y delivery.

```text
Explorar no es ejecutar.
Una decisión creativa aprobada habilita una receta.
Una receta aprobada habilita un run acotado.
Un output técnico nunca equivale a aprobación creativa.
```

Confundir estos dos modos es el error de producto principal: un canvas rígido demasiado temprano mata exploración; un chat libre para producción repetida pierde calidad, costos, lineage y memoria.

## El workflow no es la primera interfaz

La persona usuaria principal no es ingeniería. Es dirección creativa, diseño, producción o marketing. Su lenguaje natural son briefs, referencias, tratamientos, storyboards, tomas, variantes, comentarios y aprobaciones. Creative Studio debe dejarla trabajar en ese lenguaje y **compilar** las decisiones aprobadas en una receta ejecutable; no pedirle que diseñe un DAG para empezar a crear.

La gramática mínima de la experiencia es creativa:

| Acción humana | Lo que el sistema conserva o compila |
| --- | --- |
| **Preservar** una referencia, texto, gesto o elemento de marca | Invariante, reference pack o fidelity contract |
| **Explorar** una dirección o bifurcar una alternativa | Rama reversible que todavía no se vuelve template |
| **Evitar** un error y explicar por qué se rechaza | Evidencia negativa y señal para la rúbrica |
| **Entregar** una selección aprobada | Asset canónico, review gate y regla reutilizable |

El workflow emerge del trabajo. Una referencia fijada, una variante elegida, un rechazo razonado y una aprobación son acciones creativas que el sistema puede estructurar. Sólo cuando esas decisiones tienen intención, límites y evidencia suficientes se publica una receta repetible. El grafo técnico puede existir como proyección avanzada para un builder que lo necesite; no es el onboarding universal ni la metáfora obligatoria del producto.

## El patrón Builder → Runner

La distinción más reutilizable del mercado es separar quien **construye** una receta de quien la **ejecuta**:

| Rol | Autoridad y responsabilidad |
| --- | --- |
| Dirección creativa / diseñador | Define intención, referencias canónicas, qué puede variar, rúbrica y estándar de calidad. Es el **builder** de un template o flow; puede pertenecer al cliente o a Efeonce y no necesita programar. |
| Agente | Recupera contexto, propone brief/tratamiento/shot list, arma un plan editable y opera sólo herramientas permitidas. |
| Productor / operador | Estima, pide aprobación, ejecuta un flow publicado con inputs semánticos y coordina la revisión. Es el **runner**, no un operador de nodos arbitrarios; puede ser producción Efeonce o un rol creativo/marketing del cliente. |
| Revisor autorizado | Acepta, rechaza o pide cambios sobre craft, derechos, fidelidad, audio y delivery. |
| Ingeniería | Mantiene contracts, lineage, permisos, jobs, costos, observabilidad e integración; no decide la dirección estética. |

El resultado de un agente debe ser una propuesta o un espacio **editable**. No basta con devolver un render plano u ocultar un árbol de decisiones irreproducible.

Builder y runner no son sinónimos de ingeniero y usuario. Son grados de autoridad creativa. Un equipo de marketing puede correr templates curados sin convertirse en dirección creativa; un Head of Creative puede construir o versionar una receta sin tocar provider keys, jobs ni contratos técnicos.

## Un Studio, tres modos de operación

Creative Studio no se divide en un producto para clientes y otro para la agencia. El mismo workspace, run, template, ledger, lineage y review soportan tres modos. Lo que cambia es la asignación de autoridad y accountability, no el motor.

| Modo | Quién dirige y opera | Accountability principal | Mejor ajuste |
| --- | --- | --- | --- |
| **Client-operated** | El cliente define la dirección y corre templates curados dentro de sus permisos. | Efeonce responde por plataforma, policy y soporte; el cliente responde por operación creativa y delivery que controla. | Baja ambigüedad, alta repetición, variantes y adaptación de formatos. |
| **Co-operated** | El cliente conserva dirección/brand authority; cliente y Efeonce se reparten la ejecución con un operador explícito por run o lane. | Cada parte responde por el tramo que controla; aprobaciones, presupuesto y escalamiento quedan declarados antes de ejecutar. | Dirección aprobada con producción compleja, picos de demanda o necesidad de craft especializado. |
| **Efeonce-managed** | Efeonce construye/opera el workflow y gobierna delivery; el cliente conserva brief, marca y aprobación final. | Efeonce puede comprometer OTD/FTR sobre el scope que dirige y controla. | Alta incertidumbre creativa, campañas nuevas, identidad, hero assets y producción crítica. |

Estos modos **no son una quinta modalidad comercial**. On-Going, On-Demand, Staff Augmentation y Sample Sprint siguen siendo los vehículos de engagement. El modo operativo declara quién hace qué dentro de ellos. Si una persona Efeonce queda bajo dirección cotidiana del cliente, es Staff Augmentation; si Efeonce dirige el sistema y responde por el outcome, es Managed Squad.

Cada run debe resolver, como mínimo, quién es `operator_of_record`, quién aprueba creatividad, quién autoriza presupuesto, quién gobierna el template, quién responde por derechos y quién autoriza la entrega. Los nombres finales de schema quedan para el bootstrap, pero la responsabilidad no puede quedar implícita.

## Autonomía progresiva, no self-service binario

La autonomía adecuada crece cuando baja la incertidumbre creativa y el riesgo. No se maximiza porque sí:

```text
alta ambigüedad / alto riesgo de marca  -> Efeonce-managed
dirección aprobada / producción compleja -> co-operated
baja ambigüedad / alta repetición        -> client-operated
```

El paso entre modos debe ser reversible y conservar contexto. Un cliente puede iniciar una corrida curada, escalarla a co-operación cuando aparece una excepción y activar capacidad Efeonce sin reenviar brief, referencias, rechazos o historial. Del mismo modo, un workflow probado por Efeonce puede graduarse a operación del cliente sin convertirlo en una caja negra ni perder sus gates.

Esta progresión es la expresión de ASaaS para Creative Studio: **servicio que valida craft → sistema que lo conserva → cliente que gana capacidad → uso que genera evidencia → Efeonce que absorbe complejidad y picos → sistema que aprende**. La autonomía no canibaliza el servicio; cambia el servicio desde ejecución repetitiva hacia dirección, diseño de workflows, QA, excepciones y capacidad elástica.

## Qué está productizando el mercado

| Enfoque | Señal de mercado | Lectura para Efeonce |
| --- | --- | --- |
| **Content supply chain agentic** | Adobe Firefly Creative Production combina flujos visuales, assets, reviews, aprobaciones, modelos propios/externos y delivery gobernado; Adobe diferencia exploración de precisión (`Firefly Graph`) versus producción a escala. | La ventaja no es tener “un modelo mejor”, sino unir template, derechos, revisión y entrega. [Adobe Creative Production](https://business.adobe.com/products/firefly-business/firefly-creative-production.html) |
| **Agente creador de flujos** | Magnific define Agents con instrucciones, herramientas, knowledge base, memoria individual/de proyecto y subagentes; producen un `Space` editable. Sus Flows separan builder y runner, y se ejecutan por interfaz, MCP o API. | Un director puede empaquetar su criterio sin volverse cuello de botella. El Studio debe exponer inputs semánticos, no su DAG interno. [Magnific Agents](https://www.magnific.com/ai/docs/custom-agents) · [Magnific Flows](https://www.magnific.com/ai/docs/flows) |
| **Diseño conversacional estructurado** | Canva AI 2.0 propone output por capas, edición agentic, memoria persistente y brand intelligence, pero está en research preview. | “Editable por capas” es más valioso que una imagen plana; no asumir madurez sólo por la narrativa de producto. [Canva AI 2.0](https://www.canva.com/newsroom/news/canva-create-2026-ai/) |
| **Workspace de dirección visual** | Google Flow integra referencias/frames, imágenes, video, biblioteca de assets, edición y controles de cámara en una superficie que reconoce el proceso como no lineal. Runway prioriza consistencia de mundo mediante referencias. | Reference packs y continuidad entre assets son primitives de producto, no adjuntos secundarios del prompt. [Google Flow](https://blog.google/innovation-and-ai/models-and-research/google-labs/flow-updates-february-2026/) · [Runway Gen-4](https://runwayml.com/research/introducing-runway-gen-4?type=standard) |
| **Workflow como infraestructura ejecutable** | ComfyUI representa el extremo técnico: un workflow versionable es un grafo JSON que se ejecuta como job asíncrono y devuelve outputs monitorizables. | La implementación necesita commands, jobs, estados, idempotencia y assets; el canvas libre no es el producto inicial. [ComfyUI Cloud API](https://docs.comfy.org/development/cloud/overview) |
| **Agente cross-app mediante MCP/conectores** | Adobe lleva herramientas creativas a agentes externos; Anthropic documenta conectores para Adobe, Affinity, Blender y otras aplicaciones. | El chat será una surface más, nunca una vía privilegiada: debe usar exactamente los mismos commands, permisos y audit trail que la UI. [Adobe](https://news.adobe.com/news/2026/06/adobe-unveils-major-expansion) · [Anthropic](https://www.anthropic.com/news/claude-for-creative-work) |

## Implicaciones para Efeonce Creative Studio

Estas son hipótesis de bootstrap alineadas con la ADR vigente; no agregan schema, API ni runtime en este repositorio.

1. **`creative_run` es el objeto central.** Debe conservar el brief y treatment aprobados, reference pack, versión de template, route proposal, attempts, costos, artefactos y review. La arquitectura objetivo ya declara estas piezas.
2. **Toda exploración acaba en un plan editable.** Un agente puede proponer storyboard, shot list, referencias, modelo y estimate; el operador/director ajusta y aprueba antes de reservar créditos.
3. **El template es IP creativa versionada.** Es donde viven inputs semánticos, contrato de fidelidad, restricciones de marca, límites de variación y rúbrica; no una lista de prompts escondidos.
4. **El router debe explicar su elección.** Puede sugerir Seedance, Omni, Veo, Runway o post determinista, pero persiste modelo, versión, provider, adapter, costo esperado y limitaciones. La opacidad de “auto mode” es aceptable sólo para exploración no auditable.
5. **La memoria debe ser evidencia, no sólo conversación.** Brand profile, assets aprobados, derechos, prompts/recetas útiles, rechazos y decisiones deben vivir en datos versionados y con acceso scoped; la memoria LLM es una ayuda, no la fuente de verdad.
6. **La review es un primitive de dominio.** Un evaluador automático puede aportar señales; nunca convierte `candidate_ready` en `approved`, ni aprueba gasto/publicación.
7. **Roles de agentes pequeños primero.** Planner, archivista de referencias, productor de run y crítico contra rúbrica tienen herramientas y límites propios. No empezar con un “director autónomo” que a la vez decide, gasta y publica.
8. **El modo operativo es parte del run.** No debe inferirse por contrato comercial, usuario logueado o canal de entrada; determina responsabilidades, escalamiento y compromisos medibles.
9. **La transición entre modos conserva memoria.** Escalar de client-operated a co-operated o managed reutiliza brief, assets, lineage, decisiones y budget trail; no crea un proyecto paralelo ni un handoff por correo.
10. **El cliente aprende por capas.** La ruta de adopción es observar/revisar → correr templates curados → ajustar variables permitidas → construir/versionar sólo cuando existe madurez y permiso.
11. **La IP se separa con claridad.** El cliente conserva su marca, assets, decisiones y contexto; Efeonce conserva su método, recetas base, evaluaciones y know-how salvo acuerdo explícito distinto. Un template derivado debe declarar qué parte es portable y cuál es proprietary.
12. **La optimización no puede homogeneizar.** Throughput, costo y tasa de aprobación son señales operativas, no una función objetivo suficiente. La review debe conservar razones de rechazo, amplitud de exploración y diversidad relevante para detectar fijación o convergencia genérica.

## Qué debe medirse

| Dimensión | Señales útiles | Riesgo de lectura incorrecta |
| --- | --- | --- |
| Craft | FTR, RpA, razones de rechazo, fidelidad al brief, diversidad de rutas consideradas | Aprobar rápido puede significar poca exploración o una rúbrica débil. |
| Operación | Cycle time, TTM, costo estimado vs real, fallas recuperables, throughput | Más outputs no equivalen a más ideas ni a mejor trabajo. |
| Capacidad del cliente | Time-to-first-successful-run, reuse de templates, runs operados sin escalamiento, calidad del brief | El objetivo no es empujar todo a self-service, sino aumentar autonomía donde es segura. |
| Negocio | Capacidad desbloqueada, margen por modo, expansión, retención y Revenue Enabled cuando sea atribuible | No atribuir impacto de negocio a una generación aislada. |

## Antipatrones que se deben evitar

- Llamar “workflow” a cualquier conversación o prompt exitoso.
- Encerrar la exploración en un DAG antes de decidir qué se quiere hacer.
- Mandar a un runner inputs técnicos (`nodeId`, provider key, prompt interno) en vez de variables creativas entendibles.
- Permitir que un router automático oculte el modelo/tier que consumió presupuesto.
- Tratar memoria de chat como registro durable de marca, rights o aprobaciones.
- Declarar entrega porque un proveedor respondió `completed`.
- Crear un canvas generalista antes de probar templates curados, evals y review.
- Tratar client-operated como “managed más barato” o prometer el mismo SLA cuando Efeonce no controla la ejecución.
- Permitir responsabilidad compartida sin `operator_of_record`, aprobadores y owner de delivery explícitos.
- Reiniciar el proyecto o perder contexto cuando un run escala de un modo operativo a otro.
- Optimizar sólo volumen, velocidad o similitud con piezas aprobadas hasta homogeneizar el lenguaje creativo.

## Agenda de profundización

| Pregunta | Evidencia necesaria antes de una task |
| --- | --- |
| ¿Qué representa mejor un plan editable: brief + shot list, grafo semántico, o ambos? | Tres pilotos comparables con tiempo de briefing, errores de handoff y tasa de aceptación. |
| ¿Qué debe persistir como memoria de proyecto y qué debe ser asset/policy versionado? | Modelo de clasificación, acceso y retención; pruebas de recuperación correcta y denial. |
| ¿Cómo se diseña builder/runner sin congelar al diseñador? | Test de un template de campaña donde el builder cambia dirección sin que el runner vea ni rompa la lógica. |
| ¿Qué rol agentic aporta valor real primero? | Eval de planner y archivista frente a un operador humano: calidad de plan, tiempo, costo y tasa de corrección. |
| ¿Cuándo se justifica un canvas gobernado? | Evidencia de múltiples templates que comparten primitives y requieren branching visible; no interés estético por nodos. |
| ¿Cómo se mide “on-brand” sin fingir aprobación automática? | Rúbrica humana, señales automáticas auxiliares y registro de desacuerdos/rechazos. |
| ¿Qué workflow está listo para graduarse de managed a co-operated o client-operated? | Umbrales de ambigüedad, repetibilidad, riesgo, derechos, costo y tasa de escalamiento observados en pilotos. |
| ¿Qué responsabilidades y SLAs cambian por modo? | RACI por run, incidentes simulados y medición separada del tramo controlado por Efeonce y el controlado por el cliente. |
| ¿Cómo se evita homogeneización al aprender de aprobaciones? | Métricas de diversidad, muestreo de rechazos y review humana que premie rutas relevantes, no sólo similitud histórica. |

## Criterio de paso a task

Este brief pasa de `Active` a `Validated` cuando exista una primera respuesta empírica para al menos un patrón builder/runner y un rol agentic acotado, con fixture, gasto, review humana y criterio de reversión documentados. La implementación sólo nace como task en el repositorio de Creative Studio después del bootstrap de EPIC-028.

## Fuentes primarias consultadas

- Adobe, 2026-06-18: [Creative Agent across Firefly and Creative Cloud](https://news.adobe.com/news/2026/06/adobe-unveils-major-expansion).
- Adobe: [Firefly Creative Production](https://business.adobe.com/products/firefly-business/firefly-creative-production.html).
- Magnific: [Agents](https://www.magnific.com/ai/docs/custom-agents), [Flows](https://www.magnific.com/ai/docs/flows), [MCP](https://www.magnific.com/ai/docs/magnific-mcp).
- Canva, 2026: [Canva AI 2.0](https://www.canva.com/newsroom/news/canva-create-2026-ai/).
- Google, 2026-02-25: [Flow updates](https://blog.google/innovation-and-ai/models-and-research/google-labs/flow-updates-february-2026/).
- Runway: [Gen-4 and world consistency](https://runwayml.com/research/introducing-runway-gen-4?type=standard).
- ComfyUI: [Cloud API overview](https://docs.comfy.org/development/cloud/overview).
- Anthropic, 2026-04-28: [Claude for Creative Work](https://www.anthropic.com/news/claude-for-creative-work).

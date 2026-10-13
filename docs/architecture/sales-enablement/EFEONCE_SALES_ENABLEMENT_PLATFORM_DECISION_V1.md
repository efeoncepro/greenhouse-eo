# Plataforma comercial propia — decisión de frontera V1

- Status: **Accepted** — dirección de producto y ownership; detalle de implementación propuesto por separado.
- Date: 2026-10-07.
- Owner: Commercial / Product; Platform para contratos e integración.
- Scope: nueva plataforma de Sales Enablement y experiencia del comprador; relación con Greenhouse, Think, HubSpot, Insights, Studio y AXIS.
- Reversibility: two-way-but-slow.
- Confidence: high en separación de producto; medium en topología técnica hasta su prueba vertical.
- Validated as of: 2026-10-07, conversación y documentos/código local del análisis previo; sin auditoría nueva de infraestructura desplegada.
- Evidencia de aceptación: el operador propuso una plataforma comercial propia y, tras la recomendación de separar operación y exhibición de Greenhouse/Think, indicó «Bien, sigamos tu recomendación».

## Context

El pedido es un instrumento reutilizable que acompaña propuestas existentes y demuestra método, creatividad y técnica mediante piezas estáticas, largas, audio y video. El champion del cliente necesita explorar, ensayar y presentar la propuesta ante su organización. El material completo debe seguir disponible aunque un recorrido seleccione una parte para la reunión.

El análisis inicial recomendó autoría en Greenhouse y lectura en Think por reuso técnico. El operador aclaró que Think nació para tools y lead magnets de marketing, y que acumular nuevas experiencias comerciales allí desdibuja su propósito. La autoría y la relación con el comprador tienen un ciclo propio que justifica una plataforma especializada.

Trumpet aporta como referencia el espacio persistente por oportunidad y el apoyo al champion. Sus capacidades documentadas no prueban la inmersión especializada ni la full API parity requerida aquí. [Qué es un Pod](https://intercom.help/trumpet/en/articles/6183982-what-is-a-pod), [alcance MCP](https://intercom.help/trumpet/en/articles/14139827-trumpet-mcp-server) y [limitación actual de Update Pod](https://www.sendtrumpet.app/docs/update-pod), consultados el 2026-10-07.

## Decision

1. Crear como dirección de producto una **plataforma comercial propia de Efeonce**, con administración, experiencia del comprador, backend y API propios. Sales Enablement es descriptor funcional provisional, no naming ni oferta SaaS aprobados.
2. Su objeto principal es un **espacio comercial** para una oportunidad o evaluación. Puede existir antes de asociarse a un deal; no exige convertir al prospecto en cliente activo de Greenhouse.
3. La primera capacidad completa es la prueba creativa inmersiva: preparar, revisar, explorar, presentar, compartir y evaluar, junto al PDF original.
4. UI, CLI y MCP operan el mismo catálogo de capacidades y autoridad. La carga de archivos forma parte del flujo verificable de cada canal; no basta con registrar una tool que un cliente remoto no puede ejecutar.
5. Efeonce es el operador inicial; champions y evaluadores acceden como participantes externos autorizados. Venta del software a terceros, pricing, billing y onboarding SaaS son decisiones posteriores.
6. La independencia es de producto, dominio y ciclo de entrega. Se reutilizan identidad, diseño y servicios transversales por contratos; no mediante acceso a tablas, sesiones o secretos de otras plataformas.

## Ownership

| Dueño | Fuente de verdad | Relación con la nueva plataforma |
|---|---|---|
| Plataforma comercial | Espacios, narrativa, piezas vinculadas, versiones de entrega, recorridos, permisos, preguntas e interacciones propias | Autoría y presentación completas en su aplicación; proyecciones limitadas hacia otros sistemas |
| HubSpot | Empresas, contactos, deals y pipeline comercial | Vinculación por identificadores; lectura/sync contratado. El estado de una sala no cambia por inferencia la etapa del deal |
| Greenhouse | Administración transversal y dominios operativos que ya gobierna | Visibilidad ejecutiva, referencias y handoff explícito a operación; no editor obligatorio de esta plataforma |
| Proposal Studio / CPQ existentes | Expediente formal, requisitos, oferta económica y sus autorizaciones actuales | Referencias a documentos/estados existentes. El espacio no constituye una segunda oferta económica ni presenta una licitación por sí mismo |
| Think | Tools, contenidos y experiencias de captación de marketing | Puede originar un contacto o aportar una referencia. No se agrega allí el runtime de la nueva plataforma |
| Insights | Informe y edición de desempeño | Evidencia autorizada por referencia o export explícito. No migrar el producto completo por su posible uso comercial |
| Studio / Workbench / otros talleres | Producción y originales según sus contratos vigentes | Importación autorizada con procedencia y versión; aprobación creativa y autorización de compartir son decisiones diferentes |
| Efeonce ID / plataforma de identidad | Identidad y autoridad delegada según contratos vigentes | Nuevo relying party/provider; sesiones y audiencias propias, sin copiar cookies ni aceptar organización enviada como autoridad |
| AXIS | Tokens, identidad y componentes/contratos visuales portables | Reutilización versionada; no contiene casos privados, permisos ni lógica comercial |

## Runtime Contract

El presente ADR gobierna trabajo nuevo de esta plataforma. **No migra** tablas, expedientes, rutas, permisos ni herramientas existentes de X-Ray, Insights o Proposal Studio. El corte de una capacidad existente requerirá inventario, contrato de transición, reconciliación y evidencia de reemplazo.

- El dominio comercial nuevo posee sus commands, readers, permisos y auditoría. El gateway MCP conserva su papel de adapter neutral y enruta hacia ese provider; no convierte a Greenhouse en dueño de los datos nuevos.
- Cada espacio pertenece a la organización operadora. La empresa destinataria y sus participantes son referencias y grants explícitos, no un cambio de tenant ni acceso al workspace interno.
- La publicación fija una edición del contenido y los medios. Preguntas, respuestas y próximos pasos pueden evolucionar vinculados a esa edición; no reescriben lo que fue presentado.
- Notas internas de Efeonce, notas compartidas con el champion y contenido de audiencia tienen permisos y proyecciones distintos. Ocultar un elemento en pantalla no es control de acceso.
- Los assets y los grants son privados por defecto. El acceso externo se resuelve en esta plataforma y respeta el alcance otorgado por las fuentes.
- Las operaciones de negocio nacen con contrato de API, UI/CLI/MCP y pruebas de equivalencia. Un gesto local de zoom no exige endpoint; guardar un recorrido, emitir una edición o cambiar un permiso sí exige operación canónica.
- No se autorizan escrituras de negocio por SQL entre plataformas. Integraciones usan APIs/eventos versionados, consumidores idempotentes y reconciliación observable.

La [solución V1](EFEONCE_SALES_ENABLEMENT_SOLUTION_V1.md) es diseño técnico propuesto. La aceptación de esta frontera no acredita versiones, presupuestos, IAM, hosting ni garantía operativa alguna. Repositorio físico, dominio y configuración de despliegue se concretarán en el plan de implementación; no se han creado con esta decisión.

## Alternatives Considered

| Alternativa | Resolución |
|---|---|
| Administrar en Greenhouse y presentar en Think | Reemplazada para esta nueva capacidad: reparte el ciclo del usuario entre productos con otros propósitos |
| Añadir solo un dominio visual, conservando todo el editor y dominio dentro de Greenhouse | No satisface el ownership y la operación especializada acordados |
| Adoptar Trumpet como plataforma | Referencia útil; no se ha probado cumplimiento de multimedia especializado, portabilidad y paridad integral. No hay decisión de compra |
| Construir plataforma propia sobre servicios compartidos explícitos | Elegida: conserva experiencia integral y reutiliza infraestructura sin duplicar los dominios existentes |
| Crear CRM, CPQ, firma, automatización de outreach y SaaS multicliente completos | Fuera del primer alcance: no son necesarios para demostrar el instrumento creativo y duplicarían responsabilidades |

## Consequences

Beneficios: ciclo coherente para autor y champion; evolución independiente; Think conserva foco; pruebas creativas y futuros casos comerciales pueden reutilizar el mismo modelo.

Costos y riesgos: otra aplicación exige operación, integración, control de acceso externo, observabilidad, recuperación y mantenimiento. El fallo de un CRM no debe interrumpir una presentación ya publicada; la política de identidad/revocación sigue siendo fail-closed donde corresponda. El coste dominante de multimedia se medirá por bytes, procesamiento y reproducción, no por número de páginas.

La prueba creativa sigue siendo la primera entrega completa. Diagnósticos, demostraciones, casos de negocio, biblioteca avanzada y planes mutuos extensos se añaden con casos validados. No se reduce el inventario creativo para simular una entrega completa.

## Revisit When

- Dos oportunidades de servicios distintos requieren código particular para poder presentarse.
- El champion no puede preparar y conducir una presentación sin intervención del equipo creador.
- UI, CLI o MCP presentan capacidades o autoridad incompatibles.
- El reuso exige acceder directamente al almacenamiento de otro producto o acoplar sus releases.
- Los costes medidos de operar la plataforma superan el valor demostrado frente a una alternativa gestionada.

## Related decisions

- [Ecosistema de producto](../../context/03_ecosistema-producto.md).
- [Operator-first](../../strategy/EFEONCE_OPERATOR_FIRST_PRODUCT_AND_GROWTH_CONTRACT_V1.md): referencia estratégica; conserva su estado Proposed, no se acepta implícitamente todo su contenido.
- [Full API Parity](../GREENHOUSE_FULL_API_PARITY_DECISION_V1.md).
- [MCP gateway](../EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md).
- [Identidad y consentimiento](../EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md).
- [Fronteras de build](../GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md) y [placement](../../operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md).
- [Análisis anterior, ahora histórico](../../think/creative-proposal-experience-stack-analysis-2026-10-07.md).

## Addendum 2026-10-07 — Efeonce Rooms

El operador acordó el nombre **Efeonce Rooms** y el destino `rooms.efeonce.org` («Bien, queda ese nombre»). El [dossier Rooms](../rooms/README.md) consolida arquitectura, API/acceso, experiencia y dirección visual para su revisión antes del go final. El [nuevo ADR](../rooms/EFEONCE_ROOMS_PRODUCT_AND_PLATFORM_DECISION_V1.md) distingue las decisiones ya aceptadas de los detalles aún Proposed. Esta frontera permanece Accepted; el diseño técnico anterior se conserva como antecedente. No se crea runtime ni se migran productos por este addendum.

## Addendum 2026-10-07 — design system Rooms

Por decisión explícita del operador, La órbita (`efeonce-graphic-line`) gobierna estética, tipografía, componentes, iconografía y motion de Rooms; AXIS distribuye el sistema. Bricolage editorial/Poppins funcional sustituye la propuesta anterior Poppins/Geist. Arte cliente preservado; composición renderizada y go de implementación pendientes. Ver [dirección vigente](../../ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md).

## Addendum 2026-10-07 — creatividad y SEO/AEO

El operador explicita que Rooms sirve a ambas familias de propuestas. Creatividad es la primera experiencia materializada; SEO/AEO integra V1 como perfil nativo, con lectura editorial, radiografía, evidencia y plan/medición, combinable con medios creativos. El [contrato de perfiles](../rooms/EFEONCE_ROOMS_EXPERIENCE_PROFILES_V1.md) amplía el dossier y EPIC-052. Se conservan los runtimes/rutas actuales de X-ray y Think; adopción de contenido no equivale a migración de plataforma ni grants. Alcance confirmado, implementación pendiente.

# Efeonce Rooms — ADR de producto y plataforma V1

- Status: **Proposed** — consolidado para revisión antes del go final de implementación.
- Date: 2026-10-07.
- Owner: Commercial / Product; Platform para arquitectura y operación; Creative/AXIS para dirección visual.
- Scope: Rooms, autoría, experiencia de comprador/champion, API/CLI/MCP, multimedia y límites del ecosistema.
- Reversibility: two-way-but-slow.
- Confidence: high en propósito y frontera; medium en arquitectura propuesta; experiencia visual pendiente de prototipo.
- Validated as of: 2026-10-07; conversación, fuentes locales y documentación técnica; sin runtime Rooms.
- Depends on: [frontera propia aceptada](../sales-enablement/EFEONCE_SALES_ENABLEMENT_PLATFORM_DECISION_V1.md).

## Context

El operador requiere un instrumento reutilizable para demostrar método, creatividad y técnica con propuestas completas: piezas estáticas en proporciones diversas, piezas largas, audio, video y PDF. El champion suele conducir la presentación interna y necesita herramientas para comprender, ensayar, presentar y responder. Un recorrido resumido no puede convertirse en la pérdida de la mayoría del deck original.

Think se concibió para marketing, tools y lead magnets. Administrar esta nueva experiencia en Greenhouse y exhibirla en Think fue una recomendación inicial reemplazada por una plataforma propia. Trumpet sirve de referencia de espacios compartidos y apoyo al comprador; Insights aporta el patrón de presentación y X-Ray el de demostración contextual. Ninguno define por sí solo la experiencia de Rooms.

## Decisions and authority

| Decisión | Estado y evidencia |
|---|---|
| D1. Plataforma propia con autoría, backend/API y exhibición | Accepted en ADR previo; operador: «Bien, sigamos tu recomendación» |
| D2. Nombre Efeonce Rooms y subdominio `rooms.efeonce.org` | Accepted; operador: «Bien, queda ese nombre» |
| D3. Experiencia comercial y conversión como propósito principal; captación personalizada como uso secundario | Dirección acordada en conversación; no implica garantía de ventas |
| D4. Full API parity UI/CLI/MCP | Requisito explícito del operador, mantenido en este diseño |
| D5. Stack, topología, modelo detallado, políticas propuestas y secuencia | Proposed en este ADR y documentos asociados, para el go final |
| D6. Design system de Rooms: La órbita (`efeonce-graphic-line`) | Accepted 2026-10-07 por corrección explícita del operador; estética, tipografía, componentes, iconografía y motion, también en autoría/consola. AXIS lo distribuye. Composición específica y QA visual siguen pendientes |

La solicitud actual autoriza redactar y explicar este dossier. No es el go final para construir, migrar, provisionar, desplegar o compartir una propuesta con un cliente.

## Decision proposed

Rooms se construye alrededor de una **sala comercial**, con una o más experiencias versionadas para una oportunidad. Tres trabajos integrados: preparar, demostrar y facilitar la evaluación. La primera entrega es la prueba creativa inmersiva con herramientas del champion y colaboración contextual básica.

El equipo Efeonce opera la plataforma. El comprador obtiene una sala acotada; el champion añade capacidades de preparación/presentación autorizadas. El mismo contenido se puede explorar libremente, seguir como relato o presentar en pantalla limpia. Una biblioteca completa permanece accesible junto a recorridos selectivos.

El design system decidido es **La órbita**, gobernado por [efeonce-graphic-line](../../../.codex/skills/efeonce-graphic-line/SKILL.md): Bricolage editorial y Poppins para lectura/controles; tokens, componentes, iconografía y motion canónicos distribuidos por AXIS. Sustituye la base Poppins/Geist anteriormente propuesta. Las piezas del cliente conservan su identidad. La voz pregunta/respuesta no se impone al relato.

La composición recomendada dentro de ese sistema es **escenario editorial**: una pieza o argumento dominante, profundidad por interacción, contenido de cliente protagonista y controles precisos. El impacto deriva de composición, escala, ritmo, medios fieles y continuidad. La escenografía 3D permanente, la navegación como paseo virtual y los efectos genéricos quedan descartados para V1.

## Ecosystem ownership

| Plataforma | Rol | Contrato de integración |
|---|---|---|
| Studio | Planificar, producir y activar marketing que genera demanda | Aporta versiones autorizadas de piezas y contexto; sus campañas permanecen allí |
| Think | Atraer y educar mediante contenido/tools/lead magnets | Puede originar una conversación; no aloja el nuevo runtime |
| Rooms | Demostrar valor y acompañar evaluación/conversión | Posee salas, relato, ediciones, recorridos, acceso y conversaciones propias |
| HubSpot | Empresas, personas, deals y etapas comerciales | Rooms enlaza/sincroniza datos acordados, sin pipeline paralelo |
| Greenhouse | Coordinación transversal y operación de la relación | Recibe proyecciones y handoff explícito; no es el editor de Rooms |
| Insights | Elaborar y entregar informes | Rooms referencia una edición/export autorizado; no absorbe todo el producto |
| Proposal Studio / CPQ | Expediente y oferta formal/económica existentes | Documentos enlazados; publicación de una sala no implica presentar una licitación ni aprobar precios |
| Efeonce ID / MCP / AXIS | Identidad, transporte para agentes y distribución técnica de La órbita | `efeonce-graphic-line` gobierna el diseño; AXIS distribuye sus contratos/assets/componentes; permisos y datos Rooms tienen dueño propio |

## Alternatives considered

| Alternativa | Decisión |
|---|---|
| Greenhouse + Think | Descartada para Rooms por fragmentación del ciclo y propósito |
| Nuevo nombre sobre editor alojado dentro de Greenhouse | Insuficiente para la independencia acordada |
| Adoptar Trumpet | Referencia, sin compra decidida; no se verificó paridad integral ni experiencia creativa especializada |
| App propia modular + procesamiento asíncrono | Recomendada por ownership y experiencia integral con operación acotada |
| Motor 3D/WebGL obligatorio y salas físicamente navegables | Descartado de V1: no es necesario para ver/entender/presentar; aumenta coste, accesibilidad y fragilidad |
| CRM, CPQ, firma, outreach masivo y billing SaaS completos | Diferidos: responsabilidades existentes o hipótesis posteriores |

## Runtime contract proposed

- App React/Next.js/TypeScript con backend modular propio, contratos canónicos y una API versionada. La UI nunca es el único canal de un command.
- PostgreSQL y storage privados con ownership Rooms. Servicios compartidos solo mediante contratos, no tablas/sesiones/secretos ajenos.
- Edición inmutable de contenido y medios; conversación mutable con referencias a esa edición. Cambios visibles requieren una edición nueva.
- Grants por sala/edición/acción; notas privadas separadas de proyecciones de audiencia. Modo presentación no amplía permisos.
- Jobs durables para procesamiento; reproducción y consulta no dependen de que HubSpot responda en ese momento.
- Las métricas registran actividad observable, no intención inferida como hecho ni atribución causal de ventas.
- No se migran rutas, datos o grants de productos existentes como efecto de este ADR.

## Consequences

Beneficios: recorrido completo, autonomía del champion, inventario íntegro, diferencias creativas demostrables y reuso entre servicios. Costos: una aplicación adicional, manejo audiovisual, acceso externo, integraciones y operación. Riesgos principales: degradar piezas al adaptarlas, exponer notas, confundir edición con conversación o añadir demasiado alcance antes de demostrar valor.

El nombre está decidido; logo específico y subidentidad de Rooms requieren diseño dentro de AXIS. El host es destino acordado, no evidencia DNS/TLS/servicio activo. La futura venta del software a terceros no está decidida.

## Acceptance and revisit

La aceptación documental del operador precede al build. La aceptación del producto exige inventario reconciliado, carga por tres canales, material multiformato, dos marcas, acceso aislado, una presentación conducida por champion y QA desktop/móvil/motion reducido. No se sustituye por lint o un video promocional.

Reabrir si se requiere código por cliente, la UI aventaja en capacidades a CLI/MCP, el comprador depende de soporte para presentar, costes medidos exceden el valor o una integración fuerza ownership duplicado.

## Sources

- [Frontera aceptada](../sales-enablement/EFEONCE_SALES_ENABLEMENT_PLATFORM_DECISION_V1.md).
- [Ecosistema](../../context/03_ecosistema-producto.md), [experiencia de cliente](../../context/10_experiencia-cliente.md).
- [API parity](../GREENHOUSE_FULL_API_PARITY_DECISION_V1.md), [identidad contextual](../EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md), [MCP gateway](../EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md).
- [AXIS portable](../EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md), [norma de marca](../../operations/brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md).

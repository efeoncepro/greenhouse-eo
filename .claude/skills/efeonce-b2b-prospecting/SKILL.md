---
name: efeonce-b2b-prospecting
description: Investiga cuentas B2B para Efeonce, identifica compradores y contactos relacionados con correo accionable y prepara rutas de acceso, mensajes y entregas a Commercial/HubSpot. Úsala para prospección fría, tibia, cálida, referidos, reactivación, expansión y coordinación ABM/ABS, señales, cadencias, respuestas y entregabilidad por cuenta; el radar personal conserva su ejecución recurrente.
---

# Prospección B2B Efeonce

Entrega una cuenta con ruta comercial defendible: evidencia, encaje, necesidad o hipótesis, personas,
acceso y siguiente decisión. Usa el alcance pedido; una cuenta focalizada no exige rastrear todo el mercado.
Para ABM/ABS, selecciona cuentas por fit y prioriza inversión por problema, acceso, margen y capacidad;
mapea cada iniciativa y mantén una tesis coordinada. Los tiers de inversión no sustituyen ICP ni relación.
Mantén automática la selección de esta skill; su invocación no concede permisos externos.

## Entradas y contrato esencial

Parte de cuenta, persona, URL/señal o micro-ICP; mercado, servicio, relación conocida y acciones autorizadas.
Aclara sólo lo que afecte materialmente el resultado. Lee primero el dossier/hilo vigente cuando exista.
Registra fuente, fecha y desconocidos; el CRM es autoridad de sus campos internos, el proveedor de sus datos
externos y el comprador de sus propias declaraciones. Resuelve contradicciones sin sustituir un dato por otro.

- Investiga al objetivo y **busca 2–3 contactos adicionales relevantes**, incluso si el objetivo tiene correo.
  Es un piso de búsqueda para cuentas en investigación comercial, no una cuota, un techo ni prueba de grupo
  completo: las personas que ya vienen en los hechos o el dossier cuentan, no aplica a una candidata descartada
  por ICP y no es motivo para sumar gente bajo HOLD o negativa. Amplía según los roles, decisiones y riesgos
  de la oportunidad/fase; declara las brechas y el siguiente paso dentro del alcance.
  Cuenta personas únicas y cobertura funcional por separado: una persona puede tener varios roles.
  Distingue identidad, participación/autoridad, correo, acceso e interacción; no se validan unos por otros.
- **No crees un Contact/Lead de prospección sin correo corporativo individual verificado y atribuible a esa
  persona.** Si falta, conserva la señal en investigación o nota de Company y busca personas adyacentes.
  No inventes direcciones, uses un buzón general como correo individual ni rellenes una cuota con desconocidos.
- **La industria y el país se registran en la empresa, en cada alta.** Los segmentos agrupan por atributos
  comunes y los contactos heredan la industria de su empresa principal: una empresa sin industria deja fuera a
  todos sus contactos. No delimites un segmento con una lista de IDs ni con un campo llenado a mano por persona.
- Relación se mide por persona y con quién; demanda por oportunidad. Un adyacente no hereda intención ni
  calidez del objetivo. Una apertura, cargo, Lead o intent score no prueba necesidad o compra.
- El buying group se mapea por necesidad/decisión, aunque no exista Deal. Una cuenta puede tener varios;
  comité formal sólo se declara con evidencia. Un puente externo no es miembro comprador automáticamente.
  No exigir champion confirmado ni todo el comité antes de una primera conversación pertinente.
- Coordina owner, tesis e historial por cuenta. Varias rutas investigadas no autorizan varios envíos.
  Respeta HOLD, bajas y negativas; nunca busques colegas para rodear un rechazo.
- Reutiliza aprobaciones explícitas dentro de su alcance. Investigación, créditos, CRM, Deals, enrollment,
  publicación y envío tienen autoridad separada. Crear esta skill no autoriza ninguno de esos actos futuros.

Canon de admisión: [decisión CRM](../../../docs/architecture/GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md).
Ownership y modo degradado: [decisión del método](../../../docs/architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md).

## Selecciona el recorrido

| Necesidad actual | Recurso a cargar |
| --- | --- |
| Seleccionar intensidad/inversión y coordinar ABM/ABS | [abm-and-abs](references/abm-and-abs.md) + Digital Marketing/Commercial según fase |
| Clasificar relación, demanda, proceso y modo | [motions-and-relationship](references/motions-and-relationship.md) |
| Descubrir o verificar entidad, fit y señales | [account-research-and-signals](references/account-research-and-signals.md) + Customer Model |
| Encontrar objetivo, adyacentes y rutas de acceso | [buying-group-and-access](references/buying-group-and-access.md) |
| Conseguir y evaluar datos accionables | [contact-quality-and-enrichment](references/contact-quality-and-enrichment.md) |
| Preparar acercamiento o prueba contextual | [message-and-contextual-proof](references/message-and-contextual-proof.md) + Copywriting/práctica |
| Preparar discovery, criterios o prueba por oferta/función | [discovery-and-proof](references/discovery-and-proof.md) + Commercial/práctica |
| Dimensionar cartera, preventa y seguimiento | [capacity-and-economics](references/capacity-and-economics.md) + Pricing/Finance |
| Proponer o ejecutar un registro autorizado | [crm-and-commercial-handoff](references/crm-and-commercial-handoff.md) + HubSpot |
| Agrupar cuentas o personas en segmentos, o revisar por qué uno sale incompleto | [segments-by-attribute](references/segments-by-attribute.md) + HubSpot |
| Representar cuentas objetivo y roles en HubSpot | [adapter account-based](../hubspot-as-a-service/references/account-based-prospecting.md) |
| Elegir campos de Contact/Company/Lead/Deal por fase | [diccionario y captura HubSpot](../hubspot-as-a-service/references/property-inventory.md) |
| Convertir una señal en validación y siguiente acción | [signal-to-action](references/signal-to-action.md) |
| Elegir entrada por proveedor/equipo/proyecto/transformación/operación | [situation-entry-playbooks](references/situation-entry-playbooks.md) + Commercial/práctica |
| Coordinar personas, canales, pasos y pausas de una cuenta | [account-cadence](references/account-cadence.md) |
| Clasificar respuesta y preparar revisión o handoff | [response-handling](references/response-handling.md) + Commercial |
| Comprobar preparación de entrega antes de envío autorizado | [deliverability-operations](references/deliverability-operations.md) + owner del canal |
| Diseñar un piloto o revisar resultados | [experiments-and-learning](references/experiments-and-learning.md) |
| Verificar sustento técnico/mercado o incorporar Sales | [sources](references/sources.md) |
| Ejecutar desde una sesión de Claude: conectores, créditos de Apollo, radar ausente | [claude-session-tools](references/claude-session-tools.md) |

Carga sólo los módulos necesarios. Recorre investigación → calificación → acceso → mensaje/changeset →
acción autorizada → verificación → entrega según el pedido; no fuerces todas las fases para una consulta.
Detén sólo el carril que carece de evidencia o permiso y avanza en el resto. Declara cobertura parcial y
qué falta para actuar. Cada señal necesita vigencia y contraste; cada paso de cadencia, persona/canal,
motivo, owner y condición de parada. Respuestas humanas/OOO/rebotes actualizan la propuesta antes de avanzar;
una pausa propuesta requiere ejecución/readback del carril para constar aplicada. Correo verificado no
certifica preparación del remitente, entrega o llegada a inbox. La suficiencia es para el siguiente paso, no calificación o compra; ampliar cobertura
no permite gasto ilimitado, crear Deals ni contactar a todos como efecto de investigarlos.

En una candidata fuera de ICP, entrega descarte/evidencia antes de invertir en contactos o preventa; el gate
de acceso aplica a cuentas en investigación comercial, no exige perseguir candidatas excluidas. Canales
de licitación y restricciones del comprador prevalecen sobre intentos de acceso alternativo.

## Sinergias y fuentes dueñas

| Owner | Cuándo usarlo |
| --- | --- |
| [Customer Model](../efeonce-customer-model-operator/SKILL.md) | ICP/JTBD, buying group y proceso comprador |
| [Digital Marketing](../digital-marketing/SKILL.md) | Plan ABM, contenido/experiencias y coordinación por cuenta |
| [Commercial](../commercial-expert/SKILL.md) | Discovery, calificación, objeciones, negociación, propuesta y next step |
| [Business Model](../efeonce-business-model-operator/SKILL.md) + práctica | Oferta, capacidad, geografía, límites y claims |
| [Research](../research-benchmark-operator/SKILL.md) | Investigación extensa, método de fuentes y confianza; la harness se comprueba por sesión |
| [Copywriting](../copywriting/SKILL.md) | Voz, claridad, borrador adaptado a interlocutor e historia |
| [HubSpot](../hubspot-as-a-service/SKILL.md) | Dedupe, portal, diccionario, asociaciones, cambios y readback |

Sales es un apoyo opcional por fases: enrichment para descubrimiento; company research para acercamiento a
destinatario identificado; strategy/business case/follow-up cuando corresponda. Si está disponible o el usuario
lo invoca, lee su índice y workflow específico vigente. Conserva el método Efeonce y los permisos del pedido.
No asumas que Sales incluye instrucciones de Apollo ni que un plugin concede consentimiento para datos.

## Salida y continuidad

### Responde lo pedido, en su tamaño

Empieza por la respuesta a lo que el operador preguntó y por la decisión que le toca. El método decide qué
revisas; el pedido decide qué escribes. En la prueba ciega del 2026-10-12 las respuestas con esta skill
decidieron bien pero salieron 74 % más largas, y cuando ambas decidían igual los calificadores prefirieron
la corta: cada módulo cargado se había tratado como algo que había que mostrar.

- Lo que verificaste y no cambia el siguiente paso se omite o cabe en una línea.
- Abre un carril que el pedido no planteó (créditos, CRM, otra cuenta, protocolo de envío) sólo si bloquea
  el siguiente paso; si no, a lo sumo queda como un pendiente nombrado.
- Lista las brechas que cambian la decisión siguiente, no todas las que el mapa admite.
- Ante un término con dos lecturas, declara en una línea la que tomas y responde ésa. «Aprobación» sin
  objeto se lee como el visto bueno interno del operador para el siguiente paso.
- Cada hecho aparece una vez: una tabla si ordena, no lo mismo en tabla, lista y resumen.
- Las plantillas dan forma al documento que recibe el siguiente owner; no son la estructura del mensaje.

Ejemplo. Pedido: «¿Le escribo ya a la gerenta de marketing de esta cuenta?». Respuesta proporcional: sí o
no y por qué (correo, relación, HOLD o negativa vigentes), el borrador si corresponde, y la única brecha que
cambiaría esa decisión. Sobran ahí el mapa completo del grupo comprador, un changeset de CRM y la revisión de
entregabilidad, salvo que alguno impida ese envío.

### Entrega con CRM y dossier completo

Si el pedido es preparar o ejecutar un registro en CRM, convertir la investigación en un **plan de captura por
objeto y fase** mediante el [diccionario HubSpot](../hubspot-as-a-service/references/property-inventory.md). Completar los campos
pertinentes conocidos con evidencia, no sólo el mínimo de alta; distinguir completar, conservar, pendiente
y sistema. Reconsultar nombres/enums/owner y requisitos del carril; no escribir un diseño histórico como
si fuera schema actual. Company/Contact de prospección no implican crear Lead ni Deal. El action-pack y
changeset deben dejar visibles desconocidos, autorización y readback por objeto, sin inventar valores.

Usa [account-brief](templates/account-brief.md) para investigación y [action-pack](templates/action-pack.md)
para entregar al siguiente owner. Capacidad/economía, discovery/proof, changeset y aprendizaje tienen
plantillas en sus módulos, al igual que señal/entrada, cadencia/respuesta y preparación de entrega; cargar sólo las que habiliten la decisión pedida. Resume en chat lo accionable y las brechas; conserva detalle privado donde
corresponda, sin emails reales en ejemplos versionados. Evita duplicar una empresa por persona o servicio.

Cuando el pedido es un dossier o una entrega al siguiente owner, cubre entidad/fit, hechos vs hipótesis,
relación/demanda/proceso, decisión/fase y mapa de roles/personas,
objetivo y cobertura adicional, brechas críticas con owner/ruta/siguiente validación, correo/calidad,
ruta principal/alternativa, mensaje o prueba proporcional, estado CRM, acciones autorizadas/verificadas y siguiente
paso con responsable. Si sólo hubo investigación, no afirmes registro, contacto realizado o oportunidad calificada.
Fuentes y cobertura deben indicar conjunto, consultas, fecha, límites y campos aportados.

El radar `hubspot-saas-prospecting` conserva HSP, matriz, reporte diario, scheduler y datos locales privados.
Vive en la instalación personal de Codex: en una sesión donde no esté cargado, dilo y entrega la cuenta con
este método, sin simular sus IDs ni su reporte. No migres su historial ni crees automatizaciones como efecto
de usar el núcleo compartido.
Para mantener la skill, usa los [escenarios](evals/scenarios.json) y su [rúbrica](evals/rubric.md); evalúa decisiones,
no coincidencia de frases. No ejecutar operaciones externas durante esas pruebas.

# Buying group y buying committee — investigación de cobertura B2B

Fecha de consulta: 2026-10-11. Owner de la siguiente decisión: Commercial / Julio.
Estado: investigación completada; evolución del método propuesta, sin cambio del canon ni de la skill.
Antecedente: [skill implementada](2026-10-11-prospecting-skill-implementation.md), commit `2e98c2178`.

Seguimiento posterior del mismo día: el operador aprobó actualizar la skill con estos hallazgos. Aplicación y
verificación en [actualización del método](2026-10-11-buying-group-skill-update.md); el resto del memo conserva
el corte de investigación previo a esa aprobación.

## Decisión que habilita

Determinar cuándo la búsqueda de objetivo + 2–3 contactos adicionales debe ampliarse y qué evidencia permite
cerrar una ronda de investigación. La pregunta es cobertura del proceso comprador, no cuántos correos acumular.

Conclusión: conservar 2–3 adicionales como cobertura inicial de búsqueda y ampliar según los roles, decisiones,
dependencias y riesgos de la oportunidad. La cantidad no acredita grupo completo ni oportunidad calificada.

Método: investigación secundaria exploratoria y auditoría local, con tres subagentes autorizados:
`buying_group_evidence` (estudios/definiciones), `buying_group_practice` (mapeo/ejecución) y
`buying_group_efeonce` (canon/modelo). El principal abrió las fuentes utilizadas y contrastó la síntesis.
Se aplicó Research en el modo degradado documentado por el [ADR](../../architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md):
búsquedas/lecturas directas, sin afirmar ejecución de la harness `deep-research`. No se investigaron personas reales.

## Qué significan los términos

Un buying group es el conjunto que participa en resolver una necesidad y tomar una decisión de compra
específica. Una cuenta puede tener varios; la misma persona puede asumir papeles distintos en cada uno.
Forrester lo vincula a la oportunidad y diferencia el cargo de la función en la decisión.
[Fuente conceptual, 2023-08-31](https://www.forrester.com/blogs/saying-goodbye-to-mqls-accounts-buying-groups-opportunities-oh-my-how-is-it-all-connected/).

Buying committee se usa también para ese conjunto de participantes; la terminología pública se solapa.
LinkedIn incluye investigación, evaluación y selección en su descripción del comité.
[Guía del proveedor, sin fecha visible](https://business.linkedin.com/sell/resources/sales-terms/buying-committee).
Forrester distingue históricamente escenarios independientes, por consenso y por comité.
[Fuente histórica, 2017-10-17](https://www.forrester.com/blogs/siriusdecisions-techx-2017-preview-how-technology-purchases-happen/).
No se traslada su distribución de 2017 al mercado actual.

Para Efeonce se propone usar buying group como mapa general y anotar comité formal sólo cuando haya evidencia
de integrantes, mandato o reglas. Es una convención operativa, no una separación universal entre proveedores.
Coincide con [Customer Model](../../../.codex/skills/efeonce-customer-model-operator/SKILL.md), que ya trata
el comité como posible forma organizacional y permite personas con varios roles.

## Qué muestran los estudios y qué no permiten inferir

| Investigación original | Hallazgo publicado | Alcance y límite |
| --- | --- | --- |
| [Gartner, 2025-05-07](https://www.gartner.com/en/newsroom/press-releases/2025-05-07-gartner-sales-survey-finds-74-percent-of-b2b-buyer-teams-demonstrate-unhealthy-conflict-during-the-decision-process) | Grupos de 5–16 personas, hasta cuatro funciones; conflictos internos frecuentes | Encuesta de 632 compradores, agosto–septiembre de 2024. Comunicado público; no muestra específica de clientes Efeonce |
| [Forrester, 2026-01-21](https://www.forrester.com/press-newsroom/forrester-2026-the-state-of-business-buying/) | Decisiones con 13 participantes internos y nueve influencias externas; aumenta con complejidad o importancia estratégica | El [blog metodológico](https://www.forrester.com/blogs/state-of-business-buying-2026/) describe casi 18.000 compradores globales encuestados en 2025; informe detallado restringido. No son 22 contactos a prospectar obligatoriamente |
| [6sense, 2025-11-12](https://6sense.com/science-of-b2b/meet-the-b2b-buying-group/) | Grupo típico cercano a diez integrantes; alrededor de 40% de encuestados participa desde fuera del departamento usuario | Investigación de proveedor comercial. El 40% no describe necesariamente la composición de cada grupo individual |

El [estudio 6sense 2025](https://6sense.com/science-of-b2b/buyer-experience-report-2025/) reunió casi 4.000
respuestas en Norteamérica, APAC y EMEA, con compra mínima de USD 25.000 y mediana entre USD 200.000–300.000.
No ofrece una muestra LATAM declarada ni representa automáticamente nuestros tickets, servicios o cuentas.

Las cifras no comparten población ni definición y no deben promediarse. Confianza media-alta en la conclusión
direccional —una compra puede requerir bastante más que 3–4 personas—; baja para fijar una cuota Efeonce con
estos estudios. No hay baseline propio que demuestre un número óptimo por servicio.

## Roles, participación y acceso

[Forrester](https://www.forrester.com/b2b-marketing/buying-group-roles/) distingue champion, decisor,
influencer, usuario y ratificador. Para operar nuestro modelo, se propone comprobar las funciones siguientes:

| Función | Pregunta de comprobación |
| --- | --- |
| Operador / dueño del problema | ¿Quién vive el workflow y quién responde por el resultado? |
| Sponsor / champion / coach | ¿Quién da prioridad y quién moviliza apoyo interno? |
| Autoridad económica / decisión | ¿Quién aprueba, libera o veta esta inversión y quién selecciona? |
| Evaluación funcional o técnica | ¿Quién define requisitos y acepta el cumplimiento? |
| Gobernanza / contratación | ¿Qué revisiones de datos, seguridad, marca, legal, finanzas o compras son obligatorias? |
| Influencia, objeción o dependencia | ¿Quién condiciona el avance y qué criterio o reserva debe resolverse? |

No son seis personas obligatorias. Puede haber varias por función y una persona puede cubrir varias funciones.
Un decisor y un aprobador presupuestario pueden coincidir o ser distintos; hay que verificar el proceso real.
Legal/IT/Compras no son blockers por su cargo: registrar su criterio y postura observada.

MEDDICC exige influencia, defensa interna e interés en el éxito para considerar champion a alguien.
Un contacto amable o que responde puede ser coach o candidato, sin haber probado ese papel.
[Método del proveedor, consulta 2026-10-11](https://meddicc.com/what-is-meddpicc/champion).
Se conserva el [champion test local](../../../.codex/skills/efeonce-customer-model-operator/references/customer-model-method.md).

Separar atributos en vez de tratarlos como una sola escalera:

- Identidad/empleo verificados o pendientes.
- Participación en esta oportunidad: desconocida, hipotética o confirmada.
- Función/autoridad: desconocida, hipotética o confirmada, con evidencia.
- Correo/eligibilidad de alta CRM: verificado o pendiente; contradicciones visibles.
- Acceso: ruta directa, introducción, intermediario, canal oficial o brecha.
- Interacción: sin contacto, contacto realizado, respuesta o participación observada.

Un correo verificado no confirma autoridad ni interés. Un stakeholder confirmado sin correo sigue en el mapa
de investigación; la [regla vigente de admisión](../../architecture/GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md)
impide crear un nuevo Contact/Lead vacío. Un externo puede ser sólo puente o influencer efectivo, según evidencia;
no sumar automáticamente una introducción externa como cobertura del comprador interno.

## Criterio propuesto para ampliar y detener la ronda

> Investigar al objetivo y buscar inicialmente 2–3 contactos adicionales pertinentes. Ampliar el mapa según
> la oportunidad, fase y complejidad hasta cubrir las funciones críticas para la siguiente decisión o documentar
> las brechas y cómo resolverlas. No usar el número como techo ni como prueba de grupo completo. Mantener
> el requisito de correo corporativo individual verificado para toda nueva alta de Contact/Lead.

Ampliar cuando falte autoridad económica, exista un equipo afectado sin representación, aparezcan revisiones
técnicas/contractuales, haya aprobadores en otra marca/país/unidad, cambie el alcance o surja una objeción sin
dueño. Un único contacto que no puede explicar ni movilizar el proceso también obliga a revisar la cobertura.

Buscar más nombres sólo por tamaño de empresa o por rellenar una cifra no corrige estas brechas.
MEDDICC prioriza profundidad del acceso frente al conteo;
[multithreading](https://meddicc.com/resources/what-it-really-means-to-multi-thread).
Gong advierte contra incluir muchas personas demasiado pronto sin respaldo interno;
[guía de 2026](https://www.gong.io/blog/when-and-how-to-multi-thread-when-selling-to-executives).
Son orientación metodológica y observaciones comerciales; no prueban causalidad ni una secuencia universal.

La suficiencia depende de la fase:

| Siguiente decisión | Cobertura requerida propuesta |
| --- | --- |
| Primera conversación | Hipótesis pertinente y ruta razonada; roles pendientes visibles. No exigir champion confirmado ni todo el comité antes de acercarse |
| Discovery / evaluación | Dueño del problema y proceso por verificar; identificar quién evalúa, patrocina y decide. Cualquier rol crítico ausente recibe responsable y siguiente validación |
| Propuesta / aprobación | Autoridad, criterios y dependencias suficientemente contrastados; evidenciar incertidumbres y acuerdos pendientes. Conocer el mapa no equivale a tener aprobación |
| Contratación | Proceso de firma, compras y validaciones obligatorias identificado; no afirmar autorización con sólo consenso funcional |
| Adopción / expansión | Operadores, aceptación y nuevo presupuesto/alcance; revisar el grupo de la nueva decisión |

Cerrar una ronda significa entregar una acción útil dentro del alcance, su evidencia y brechas. Una dependencia
crítica abierta conserva cobertura parcial; no equivale a completar el grupo. Ampliar dentro del presupuesto y
permiso existentes o dejar el siguiente paso acotado. Reabrir al cambiar sponsor, alcance, presupuesto o proceso.
Investigar el mapa no significa contactar a todos. Coordinar owner e historial por cuenta y roles por oportunidad.

## Aplicación a Efeonce: hipótesis por verificar en cada cuenta

| Recorrido | Qué puede exigir más personas | Fuente local |
| --- | --- | --- |
| SEO/AEO | Web/CMS, editorial, Finanzas, cumplimiento y Compras, además de Marketing/Growth y presupuesto | [Business case SEO/AEO](../../commercial/SEO_AEO_BUSINESS_CASE_METHOD_V1.md) |
| Creativo / Studio | Aprobación de marca, operación, presupuesto, derechos y contratación; marcas o regiones distintas | [Creative Studio §2.3](../../business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md) |
| CRM / RevOps | Operador, datos/workflows, sponsor, IT/integraciones, seguridad, privacidad y contratación | [Modelo de capacidad CRM](../../business-models/revenue-operations-crm/CRM_SPECIALIST_CAPACITY_BUSINESS_MODEL_V1.md) |
| Social con varios frentes | CX, CRM, ejecutivo/PR, privacidad o Personas según el alcance | [Customer Pack Social](../../business-models/creative-services/EFEONCE_SOCIAL_MEDIA_CUSTOMER_MODEL_INTEGRITY_PACK_V1.md) |
| Channel & Commerce | Trade/Category, Comercial/Ventas, Finance y Compras/Legal; distribuidores y partners según dependencia | [Modelo Channel & Commerce](../../business-models/channel-commerce/CHANNEL_COMMERCE_BUSINESS_MODEL_V1.md) |

El pack Social ya explica que sumar frentes trae nuevos aprobadores. Un interlocutor único Efeonce no reduce
la complejidad del cliente. Una oferta compuesta puede tener un grupo coordinado o varias decisiones/grupos:
no resolver esa forma sin investigar quién decide cada tramo.

## Implicación para HubSpot y Sales

HubSpot documenta Buying Groups en beta y permite placeholders cuando se conoce un stakeholder sin Contact
CRM. Es compatible conceptualmente con registrar la brecha sin crear un contacto vacío. Requiere condiciones
de suscripción/asiento y activación; no se verificó disponibilidad en el portal ni se habilitó nada.
[Documentación actualizada 2026-09-15](https://knowledge.hubspot.com/prospecting/review-stakeholders-with-buying-groups).

El mapa analítico por oportunidad puede mantenerse en un dossier antes de que exista un Deal autorizado;
no crear Deals sólo para satisfacer la taxonomía. La vista por Company de una herramienta no demuestra que
todo contacto participe en una misma decisión. Sales puede ayudar en estrategia de una oportunidad anclada;
no sustituye autoridad de CRM, la evidencia local ni el gate de correo del método Efeonce.

## Ajustes concretos pendientes y evaluación

1. SKILL, `buying-group-and-access`, templates, métricas y evaluaciones de ambos espejos: hacer explícitos piso,
   expansión por brecha y suficiencia por fase; medir personas únicas y cobertura funcional por separado.
2. ADR del método, manual y modelo funcional: conservar propuesta/decisión y evitar un conteo fijo universal.
3. Canon/companions HubSpot: coherencia de la admisión y de la cobertura ampliable, sin cambiar esquema ni permisos.
4. Customer Model conserva taxonomía, roles y evidencia; Commercial conserva calificación y proceso.
5. Adapter personal: sincronizar método conservando historia, HSP, scheduler y datos privados.
6. Revisar la diferencia entre [contexto ICP](../../context/13_icp-buyer-personas-jtbd.md) / [plan outbound](../../commercial/PIPELINE_GENERATION_AND_OUTBOUND_PLAN_2027_V1.md)
   que hablan de 2–3 integrantes y canon nuevo que dice adicionales. El plan sigue `Proposed for validation`;
   esta investigación no aprueba su presupuesto, precios, piloto ni metas de contactos.

Evaluaciones sugeridas, todavía no ejecutadas: cuatro correos con veto técnico pendiente; muchos contactos
del mismo equipo sin presupuesto; persona con varios roles; externo que sólo presenta; dos oportunidades
con papeles distintos; stakeholder crítico sin email; presupuesto agotado con cobertura parcial; primera
conversación sin champion; cambio de sponsor; requisito de comité formal/canal oficial.

Para validar en operación, observar por oportunidad roles críticos ausentes, acceso obtenido, calidad de la
evidencia, progresión del siguiente compromiso, horas/créditos y rechazos. La lista de correos o el volumen de
envíos no demuestra cobertura ni mejora de ventas. Confianza media en el diseño propuesto hasta probarlo
en casos reales; ninguna comunicación piloto se activa por este memo.

## Estado y verificación

Tres revisiones completadas, fuentes primarias abiertas y límites contrastados. Revisión crítica final del
subagente de práctica: sin contradicciones materiales; propone entregar el memo conservando el canon vigente.
Investigación secundaria,
sin entrevistas ni muestra comercial Efeonce. La propuesta no se aplicó a skills, política CRM, datos o automatizaciones.
Sólo se creó este memo; no hubo créditos, contactos, escrituras CRM, envíos, habilitación beta ni nuevo commit.

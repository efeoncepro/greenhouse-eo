# Transformación de equipos humano-agente — RevOps & CRM

> Estado: servicio comercial aprobado y probado, confirmado por el operador el 2026-09-19 · Owner: Efeonce RevOps & CRM con Operations/Change.
> Alcance: ventas, marketing, servicio y revenue lifecycle. Método provider-neutral. La confirmación comercial no autoriza activar capacidades de un tenant, publicar precios/ROI ni identificar casos de clientes sin evidencia y permisos específicos.

## Promesa y límite

**Diseñamos, activamos y operamos equipos en los que personas y agentes comparten un trabajo medible.** Efeonce responde por el diagnóstico, el diseño, los controles, el despliegue y la operación contratados; el cliente retiene la autoridad sobre decisiones de negocio, personal, datos, aprobaciones y resultados fuera del control de Efeonce. No vendemos «un organigrama de bots», ahorro de personal garantizado ni autonomía por defecto.

La unidad de venta es un **proceso transformado** con responsables y evidencia; la unidad técnica puede incluir HubSpot, Salesforce, ambos u otra plataforma. Agent Hub, Agentforce, Breeze, Coworker, MCP, CLI y modelos son componentes, no la oferta.

## Cuándo activar agentes

Activar un primer agente cuando exista: (1) job y outcome observables; (2) frecuencia o valor que justifique operar; (3) owner humano; (4) contexto suficiente para **ese** job, no perfección abstracta de todo el CRM; (5) permisos y acciones acotables; (6) pruebas con ejemplos positivos, negativos y excepciones; (7) handoff practicable; y (8) presupuesto de licencia, consumo, supervisión y mantenimiento. Si falta una condición, diseñar la corrección o elegir automatización determinista/humano; no vender un agente para llenar un catálogo.

La progresión de autoridad es: **leer y resumir → proponer → ejecutar dentro de límites reversibles → ejecutar acciones externas o sensibles bajo aprobación específica**. El nivel final no es meta obligatoria. Toda autonomía mayor requiere nueva evaluación, autorización, observabilidad, rollback/recuperación y criterios de apagado. Ninguna demo, beta o GA genérica demuestra la capacidad efectiva del tenant del cliente.

## Diseño del equipo híbrido

El artefacto principal no es sólo un organigrama jerárquico: es un **mapa de trabajo y autoridad** por workflow.

| Rol | Responsabilidad que no se delega |
| --- | --- |
| Sponsor / economic buyer | Prioridad, inversión y tolerancia al riesgo. |
| Dueño del proceso | Resultado, reglas de negocio y decisiones de expansión o retiro. |
| Operator / operator-champion | Trabajo diario, feedback, detección de fallos y adopción real. |
| Líder del equipo híbrido | Asignación de trabajo humano-agente, calidad, capacidad de revisión y excepciones. Puede coincidir con el dueño del proceso en equipos pequeños. |
| Responsable de conocimiento y datos | Fuentes, freshness, correcciones y límites de uso. |
| Responsable de seguridad/compliance | Permisos, consentimiento, privacidad, auditoría y riesgo. |
| Efeonce delivery / Agent Ops | Diseño, configuración, evaluación, incidentes y mejora **dentro del RACI contratado**. |
| Agente | Job, entradas, herramientas y salidas delimitados; **no** accountability corporativa. |

Cada agente recibe una **ficha de rol** con: trigger; tarea y resultado; fuentes autoritativas; acciones `read | propose | write`; nivel de autonomía; permisos; límites por volumen/valor; canal; tono; handoff y horario; dueño humano; pruebas; telemetría; consumo; versión; rollback y criterio de retiro. No contar un agente como «miembro del equipo» sin esa ficha y sin un supervisor con capacidad real de revisar excepciones.

El diseño se hace sobre **tres planos simultáneos**: flujo de valor (qué trabajo cruza marketing, ventas y servicio),
flujo de autoridad (quién puede decidir, aprobar, escribir y detener) y flujo de aprendizaje (qué error o excepción
actualiza conocimiento, proceso, entrenamiento humano o configuración). La orquestación técnica entre agentes
resuelve delegación de tareas; **no** diseña por sí sola los otros dos planos.

### Ejemplo de primer equipo: servicio posventa

Una consulta entra por el canal existente. Un agente identifica intención y cuenta, consulta conocimiento aprobado
y propone una respuesta. Si el caso es rutinario, elegible y reversible, puede resolverlo dentro de límites
acordados; si hay disputa, dato sensible, compensación, incertidumbre o cliente prioritario, entrega al especialista
humano con resumen, evidencia y acción pendiente. El líder de Servicio revisa una muestra de casos resueltos y las
escalaciones; el knowledge owner corrige fuentes; Efeonce evalúa errores y cambia la configuración sólo dentro del
change control contratado. La mejora se mide en calidad de resolución, tiempo total, esfuerzo humano residual,
recontacto y costo por caso válido, no en conversaciones atendidas por el bot.

El patrón se adapta a prospecting o marketing, pero cambian autoridad y riesgos: un borrador interno es distinto
de enviar un mensaje externo, modificar una oportunidad, alterar una audiencia o gastar presupuesto. Cada acción
externa requiere su propia regla de permiso, consentimiento, aprobación y readback.

### Instancia de marketing: descubrimiento, campaña y equipo

El primer equipo híbrido puede ser de marketing sin proyecto previo de CRM. La CMO o dueña de Marketing define el
job y los criterios de marca; AEO/Content mide cómo se entiende públicamente la marca; Creative diseña el brief y
la calidad de la campaña; Media gobierna inversión; la práctica de plataforma configura fuentes, agentes e
integraciones sólo cuando el workflow lo requiere. Operations/Change acompaña la adopción. Es una **composición de
delivery por alcance**, no una nueva unidad organizativa aprobada ni una SKU nueva. El RACI y la aceptación de
claims, audiencias, envíos, publicación y presupuesto se pactan con el cliente.

En un primer workflow posible, el agente recopila insumos autorizados y **propone** variantes de campaña; el equipo
contrasta con el brief, revisa precisión y derechos, y autoriza por separado cualquier acción externa. La
información pública que observan buscadores y asistentes no se importa sin más al contexto privado del agente, ni
un dataset privado se publica para mejorar AEO. Un diagnóstico AEO puede ser entrada independiente; sólo si el
problema del cliente es también la forma de trabajar se ofrece Blueprint o First Hybrid Team. Medir visibilidad y
exactitud por motor/pregunta, calidad y progresión de campañas, revisión humana, riesgo y costo con baseline; no
usar campañas creadas o prompts generados como prueba de resultado.

## Secuencia de servicios comprables

| Fase | Entregable autónomo / aceptación | Lo que no implica |
| --- | --- | --- |
| Evaluación de fit acotada | Problema, workflow candidato, buyer/owner, alternativa y siguiente alcance. | Consultoría extensa gratis ni recomendación predeterminada de plataforma. |
| **Hybrid Workforce Blueprint** pagado | Mapa `as-is/to-be`, work chart, fichas de roles, matriz de autonomía y handoffs, arquitectura de contexto/datos, riesgo, economics por escenarios, plan de adopción y roadmap por olas. | Activación productiva. El cliente conserva un artefacto utilizable sin contratar la ejecución. |
| **First Hybrid Team** | Primer workflow y agentes elegibles configurados/construidos, pruebas, supervisores formados, observabilidad, go-live gradual, readback y hypercare. | Despliegue de todos los agentes o resultado financiero garantizado. |
| **Hybrid Operations Transformation** | Extensión entre equipos/sistemas/países, roles nuevos, rituales, gestión del cambio, integración, estándares y assurance. | Reorganización laboral, RR. HH. o cambio contractual sin especialistas y aprobación del cliente. |
| **Managed Agentic Operations** | Evaluación y mejora continua, catálogo/versiones, knowledge, permisos, costos, incidentes, rollback, adopción y QBR. | Autoridad permanente para acciones sensibles ni SLA sobre features beta. |

## Evidencia y métricas

Registrar baseline, cohorte, período, denominador, owner y método de atribución. Medir cuatro planos juntos: **resultado del proceso** (resolución, pipeline cualificado, tiempo de ciclo), **calidad/riesgo** (error escapado, quejas, rollback, consentimiento), **trabajo humano** (tiempo de revisión, rework, excepciones, carga percibida) y **economía** (fee, licencias, créditos, integración, supervisión, costo por outcome válido). Una tasa de automatización alta puede empeorar la operación si desplaza trabajo invisible a revisión o erosiona calidad.

Gates por ola: `fit → diseño de autoridad → elegibilidad/entitlements → prueba offline → shadow o asistido → producción acotada → comparación con baseline → expandir | corregir | retirar`. Un agente no escala por llegar al final del sprint; escala si supera los umbrales definidos con el cliente y el equipo puede sostenerlo.

### Cambio organizacional y adopción

Antes del go-live, acordar qué tarea deja de hacerse, qué tarea nueva aparece (supervisar, corregir, diseñar
excepciones), quién puede cuestionar una salida y cómo se comunica el cambio a equipos y clientes afectados. Formar
al operador con casos reales, no sólo una demo; formar al manager para revisar calidad y carga de excepciones;
incorporar feedback a un backlog con owner. Si el trabajo liberado simplemente se convierte en revisión manual
oculta, marcar el resultado como **no demostrado**. People/HR del cliente gobierna cambios de rol, evaluación,
compensación y relaciones laborales.

### Capacidades que Efeonce debe desarrollar

La práctica requiere, de menor a mayor complejidad: analista de workflows y datos; diseñador de roles/agentes;
especialista de plataforma e integración; evaluador de calidad y seguridad; facilitador de adopción; y líder de
transformación que gestione trade-offs entre áreas, riesgo y economics. Son **funciones de delivery**, no cargos
que Efeonce afirme tener cubiertos ni un organigrama interno aprobado. Antes de vender varias áreas o países,
Operations debe probar cobertura, reemplazo, escalamiento y margen de esa combinación.

## Buyer, delivery y fronteras

Buyer probable: COO, CRO, CMO, VP Service o dirección de transformación; usuarios diarios y problem owner se entrevistan por separado. IT, Security, Data, Legal/Privacy, HR/People y procurement entran según impacto. La configuración de agentes pertenece a la práctica tecnológica; la transformación del trabajo requiere co-ownership de operación y change management. Decisiones laborales, evaluación de personas, sustitución de roles, negociación colectiva y privacidad laboral quedan fuera hasta contar con Legal/People del cliente y mandato explícito.

HubSpot-first favorece un customer context y GTM integrados cuando el fit lo prueba; Salesforce-first, entornos instalados complejos con gobierno, múltiples equipos y superficies; híbrido sólo con source of truth, identidad, consentimiento, handoff y observabilidad entre sistemas. La misma metodología se aplica con herramientas diferentes; no se promete paridad. Verificar estado `GA | beta | pilot | demo`, región, tier, créditos, permisos y runtime antes de proponer la activación concreta.

## Estado comercial y prueba publicable

El operador confirmó que la oferta está aprobada y ya se ha prestado como servicio probado. El registro documental anterior (`Approved for validation`, sin primera prueba pagada) queda superado como estado comercial; no debe usarse para bloquear la comunicación de la oferta. La evidencia concreta todavía no está inventariada aquí: antes de publicar una métrica, nombre, logo, captura, testimonio o caso, registrar cliente/permiso, proceso, período, baseline, denominador, resultado, alcance de Efeonce y fuente verificable. La aprobación comercial tampoco convierte por sí sola una fórmula de precio, margen, ROI, disponibilidad de producto o tenant en dato aprobado.

La landing y la campaña pueden describir el método, entregables, roles y servicio vigente. Finance/Commercial conservan precios y economics transaccionales; Legal/cliente conservan derechos y permisos; la práctica verifica la elegibilidad y el runtime de cada capacidad de HubSpot o Salesforce. Investigación y fuentes de mercado: [revisión 2026-09-19](../../audits/commercial/HUMAN_AGENT_TEAMS_MARKET_RESEARCH_2026-09-19.md). Arquitecturas de provider: [HubSpot](../hubspot-as-a-service/HUBSPOT_OFFER_ARCHITECTURE_V2.md) y [Salesforce](../salesforce/EFEONCE_SALESFORCE_SERVICE_OFFER_ARCHITECTURE_V1.md).

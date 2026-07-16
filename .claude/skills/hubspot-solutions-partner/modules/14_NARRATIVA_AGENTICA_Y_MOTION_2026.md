# 14 · Narrativa agéntica y motion comercial 2026

> **Verificado al 2026-07-16.** Cargar este módulo cuando la pregunta sea cómo posicionar, prospectar,
> demostrar o empaquetar HubSpot en la etapa Agentic Customer Platform. Para implementación y gobierno
> técnico de agentes, cargar además `13_AGENTES.md`. Para cualquier cifra o vigencia, abrir `../SOURCES.md`.

## 0. La conclusión

HubSpot ya no se vende principalmente como **un CRM con varios Hubs**. La narrativa oficial convergente es:

> **Una plataforma de clientes agéntica que concentra el contexto del negocio, entrega espacios de trabajo
> especializados y permite que humanos y agentes ejecuten juntos el GTM.**

El orden comercial es **dolor → contexto → trabajo → outcome → plataforma**. No abrir con un inventario de
Hubs, agentes o features. La IA es el mecanismo; el comprador paga por más demanda, pipeline, cierres,
resolución, retención o capacidad operativa.

## 1. Quién está diciendo qué

| Voz oficial | Rol público | Tesis | Traducción para Efeonce |
|---|---|---|---|
| **Yamini Rangan** | CEO | La brecha no es entre modelos: es entre *output* y *outcome*. El resultado requiere contexto y un problema concreto | Hacer discovery por workflow doloroso y resultado medible; no vender “adopción de IA” |
| **Duncan Lennox** | Chief Product & Technology Officer | Agentes pueden correr **sobre** HubSpot y **operar** HubSpot. Datos e inteligencia se abren mediante API, MCP y CLI | Posicionar HubSpot como infraestructura agéntica abierta; la implementación arma el contexto y la coordinación |
| **Dharmesh Shah** | Cofundador y CTO | Los agentes serán **usuarios de primera clase**; no basta envolver APIs en MCP, hay que diseñar la experiencia agéntica | Vender diseño de permisos, herramientas, handoffs, ergonomía y auditabilidad para agentes |
| **Angela “Angie” O'Dowd** | Global VP, Partner Ecosystem | El partner gana en upmarket, transformación agéntica, marketing reinventado y especialización | Construir servicios repetibles que activen agentes, adopción, créditos y outcomes; no vivir solo de la licencia |

**Disciplina:** Yamini y Duncan son fuentes primarias de estrategia corporativa. Los posts de Dharmesh y
Angela son señales ejecutivas directas, pero LinkedIn no reemplaza políticas, catálogos, KB ni términos.

## 2. La arquitectura que organiza el pitch

| Capa | Producto/capacidad | Pregunta de discovery | Servicio de Efeonce |
|---|---|---|---|
| **Contexto** | Smart CRM + datos estructurados/no estructurados + Growth Context | ¿Dónde vive hoy el criterio con que tu mejor persona decide? | Auditoría de contexto, modelo de datos, calidad, integración y knowledge design |
| **Acción** | Hubs, workspaces, Breeze Assistant y Breeze Agents | ¿Qué trabajo repetitivo, lento o frágil debe mejorar primero? | Configuración, implementación, training y activación de un caso medible |
| **Coordinación** | Agent management, permisos, handoffs, sistemas conectados, auditoría | ¿Qué puede ejecutar un agente y qué exige aprobación humana? | Gobierno, `propose → confirmación humana → execute`, observabilidad y mejora continua |
| **Acceso abierto** | APIs, remote MCP, conectores y Agent CLI | ¿El trabajo es conversacional o masivo/programado? | MCP para humano-en-el-loop; CLI/API para background, bulk y scheduled con dry-run y control |

**No reducir “contexto” a campos del CRM.** HubSpot lo define como datos de cliente + conocimiento del
negocio + forma real de trabajar + procesos + patrones aprendidos. Limpiar properties ayuda, pero no captura
por sí solo por qué se ganó un deal, cuándo escalar un ticket o qué excepción acepta el comité.

## 3. Las superficies que vuelven tangible la narrativa

| Superficie | Estado público al 2026-07-16 | Trabajo que concentra | Wedge comercial |
|---|---|---|---|
| **Marketing Studio** | La KB lo marca **beta**; Marketing Hub Pro/Enterprise | Brief → estrategia → activos → colaboración → ejecución/análisis | Campañas lentas, tool switching, activos desconectados, Loop Marketing |
| **Sales Workspace** | Experiencia actualizada aplicable a todas las cuentas desde 2026-04-27 | Companies, leads, deals, tareas, agenda, preparación y follow-up | Reps atrapados en admin, poca priorización, pipeline sin siguiente acción |
| **Customer Success Workspace** | Service Hub Pro/Enterprise | Cuentas, proyectos, revenue, renovaciones, health scores y vistas por equipo | CSMs con cartera grande, churn reactivo, expansión sin sistema |
| **Help Desk + Customer Agent** | Capacidad comercial principal | Intake, routing, resolución, handoff y medición | Soporte saturado, tiempos altos, preguntas repetitivas |
| **Breeze Studio** | **Beta**; catálogo y migraciones siguen cambiando | Personalizar agentes, instrucciones, herramientas y knowledge vaults | Agent readiness y customización gobernada, sin SLA sobre beta |
| **Agent CLI** | **Beta pública** desde 2026-06-23 | Operaciones repetitivas, masivas, programadas y de background | RevOps/CRM Ops operado con agentes, con OAuth, `--dry-run` y auditoría |

**No confundir Marketing Studio con Campaigns o Journey Automation:** Studio construye y coordina; Campaigns
mide después; Journey Automation orquesta journeys complejos. **No confundir MCP con Agent CLI:** MCP/conectores
sirven al trabajo conversacional con humano; CLI al trabajo repetitivo o de fondo.

## 4. El motion de venta

1. **Nombrar el dolor operativo**, no la tecnología: “tu equipo vuelve a explicar el negocio en cada prompt”.
2. **Mapear el workflow actual**: entradas, contexto, decisiones, sistemas, handoffs, excepciones y KPI.
3. **Clasificar readiness**: dato confiable, proceso observable, riesgo, owner y champion.
4. **Elegir un primer outcome**: volumen alto, criterio acotado, reversibilidad y línea base medible.
5. **Implementar plataforma + servicio**: HubSpot entrega la superficie; Efeonce arma contexto, gobierno y adopción.
6. **Medir negocio, no actividad de agente**: carga humana, reunión, conversión, ciclo, resolución, save rate o expansión.
7. **Expandir al siguiente workflow** y convertirlo en Managed CRM/Agent Ops recurrente.

### Apertura recomendada

> “Estamos ayudando a equipos de marketing, ventas y servicio a identificar qué trabajo puede asumir un
> agente hoy, qué contexto necesita y cómo implementarlo sin perder control sobre datos y decisiones.”

### Preguntas de discovery

- ¿Qué tarea repetitiva consume más capacidad del equipo sin requerir juicio senior cada vez?
- ¿Qué debe volver a explicarse a ChatGPT, Claude u otra herramienta en cada sesión?
- ¿Dónde vive el conocimiento que desaparece cuando se va una persona clave?
- ¿Qué campos, conversaciones o sistemas no son confiables para que un agente actúe?
- ¿Qué acción puede ejecutar sola una automatización y cuál exige aprobación humana?
- ¿Cuál es la línea base del resultado: horas, reuniones, conversión, resolución, churn o expansión?

## 5. Entrada por Champion y escalamiento al C-Level

En outbound, la puerta de entrada preferida no tiene que ser el C-Level. Efeonce debe empezar por el
**Champion operativo** que vive el problema uno o dos niveles debajo, convertir el dolor en caso interno y
escalar después al sponsor económico. No elegir entre Champion y ejecutivo: usar **Champion-led entry +
executive sponsorship**.

Un contacto sólo cuenta como Champion cuando cumple las cuatro condiciones:

1. Vive el problema y puede describir su impacto con evidencia.
2. Tiene influencia sobre proceso, evaluación o recomendación.
3. Puede abrir acceso al sponsor, presupuesto y comité de compra.
4. Obtiene una ganancia profesional concreta si el proyecto funciona.

Interés en una demo, simpatía por HubSpot o responder mensajes no bastan. Si no puede explicar cómo se decide,
quién financia o cómo sumar al sponsor, tratarlo como usuario/influenciador y seguir mapeando la cuenta.

| Wedge | Champion probable | Sponsor económico probable |
|---|---|---|
| Marketing Studio / campañas | Head o Director de Marketing, Growth, Demand Gen, Marketing Ops | CMO, Gerente de Marketing |
| Sales Workspace / productividad | Director de Ventas, Sales Ops, RevOps | CRO, Director Comercial, Gerente General |
| Customer Success Workspace | Director de CS, CX, Service Ops | COO, Chief Customer Officer |
| Help Desk + Customer Agent | Support/CX Manager, Service Ops, Automation Lead | COO, CTO/CIO |
| Growth Context / CRM / integraciones | RevOps Manager, CRM Manager, Business Systems, Transformación Digital | COO, CIO/CTO |
| Breeze Studio / Agent CLI | AI Lead, Automation Lead, CRM Ops, Digital Transformation | CIO/CTO, COO |

En LATAM buscar además equivalentes como **gerente, subgerente o jefe** de CRM, marketing, comercial,
experiencia de clientes, automatización, operaciones comerciales o transformación digital. El título importa
menos que ownership, acceso e incentivo.

### Multithreading obligatorio por cuenta

Mapear entre tres y cinco roles desde el inicio:

- Champion operativo: dueño del workflow y del resultado.
- Influenciador técnico: CRM, RevOps, sistemas, datos, seguridad o automatización.
- Usuario afectado: aporta evidencia y adopción.
- Sponsor económico: prioriza, financia y acepta el cambio.
- Bloqueador probable: procurement, finanzas, TI, legal o seguridad.

La cuenta puede entrar por el Champion, pero **no debe llegar a propuesta dependiendo de una sola persona**.
Antes de propuesta debe existir dolor validado, impacto, proceso de decisión, ruta al sponsor y próximos actores.
La conversación ejecutiva se solicita con caso, no con demo: “con el equipo identificamos X impacto en Y
workflow; queremos validar prioridad, retorno y alcance”.

### Preguntas para calificar al Champion

- ¿Quién responde hoy por este indicador o workflow?
- ¿Qué intentos anteriores existieron y por qué no resolvieron el problema?
- ¿Quién debe aprobar prioridad, presupuesto, seguridad y cambio de proceso?
- ¿Cómo presentarías internamente el impacto y el retorno?
- ¿Qué resultado te haría defender este proyecto ante el comité?
- ¿A quién debemos incorporar para no diseñar una solución incompleta?

Como hipótesis inicial de prospección Efeonce, distribuir esfuerzo en **70% Champions operativos, 20%
influenciadores técnicos y 10% C-Level directo**. Es una asignación de trabajo para aprender y ajustar con
reply rate, reuniones, sponsor access y pipeline; **no es un benchmark oficial de HubSpot**.

## 6. Cinco wedges para prospectar

| Señal observable | Dolor probable | Entrada | Buyer inicial |
|---|---|---|---|
| Muchas herramientas de IA, CRM fragmentado, equipos rebriefing | Context gap / agent sprawl | **Agentic Readiness & Growth Context Assessment** | CIO/CTO, RevOps, COO |
| Campañas tardan semanas, assets en docs/boards/chats, aprobación lenta | Campaign chaos | **Marketing Studio + Loop Activation** | CMO, Marketing Ops |
| SDRs investigan manualmente, mala cobertura, follow-up tardío | Pipeline generation ineficiente | **Data + Prospecting Agent Sprint** | CRO, VP Sales, RevOps |
| Alto volumen de preguntas repetidas o soporte fuera de horario | Capacidad y tiempo de resolución | **Customer Agent Activation** | CX/Service leader, COO |
| CSMs no saben qué cuenta atender, renovación reactiva | Riesgo y expansión invisibles | **Customer Success Workspace + Health Model** | VP CS, Service Ops |

Para base instalada, agregar una sexta entrada: **portal existente sin adopción agéntica**. Auditar datos,
workspaces, créditos, agentes activos, governance y próximo workflow; luego vender activación + retainer.

## 7. Qué está pidiendo HubSpot a sus partners

El **State of Ecosystems 2026** concentra la oportunidad en cuatro frentes: upmarket, agentic acceleration,
marketing reimagined y especialización por industria/región. El mensaje para Efeonce es explícito:

- Competir como especialista LATAM con capacidad de marketing, CRM, implementación y operación agéntica.
- Convertir AEO/Loop en relación continua de optimización, no auditoría aislada.
- Usar el contexto de industria y geografía como ventaja frente al partner generalista.
- Vender implementación, gobierno y operación continua alrededor del software.

El **Guide to Services for Loop Marketing** de HubSpot valida paquetes de Brand Foundation, AI
Personalization, Channel Amplification y Campaign Velocity, además de retainers completos de Loop. Sus rangos
son **sugerencias del vendor, no tarifario de Efeonce**: dimensionar con scope, margen, complejidad y mercado.

## 8. Incentivos H2 2026 — señal interna, no headline para el cliente

HubSpot publicó incentivos para activar agentes, crecer consumo de Credits y demostrar outcomes:

- Primeras activaciones elegibles con consumo real: rewards por agente; top performers reciben un reward mayor.
- Concurso con premio de **USD 100.000** para una historia real de transformación presentada en UNBOUND.
- Comisión elevada al **40%** para SKUs elegibles de Credits durante la ventana promocional.
- Bonus tier points por crecimiento de uso de Credits y activación de payments.

🔴 **Usarlos para priorizar cartera, no para torcer el diagnóstico.** Nunca recomendar consumo innecesario para
obtener comisión o puntos. La página pública contiene fechas de cutoff que deben confirmarse con el PDM antes
de prometer elegibilidad; los bonus points expiran después de la recalibración de tier.

## 9. Prueba y límites

- **Alta confianza:** dirección estratégica, arquitectura, estados de producto y reglas publicadas en fuentes HubSpot.
- **Media confianza:** métricas de outcomes publicadas por HubSpot; son first-party del vendor y no garantías.
- **Baja/no utilizable:** inferir ROI propio, prometer que una beta permanecerá o trasladar benchmarks sin línea base.
- No firmar SLA sobre Marketing Studio, Breeze Studio, Agent CLI ni agentes especializados mientras sigan beta.
- No presentar “full API parity” como realidad completa: es la **dirección anunciada**; verificar cada capability.
- No decir que HubSpot reemplaza todo el stack: la tesis oficial también es ecosistema abierto y sistemas conectados.

## 10. Fuentes primarias

El ledger verificable, fechas y URLs viven en `../SOURCES.md`, sección **Narrativa agéntica, workspaces y
motion de partners**. Revalidar antes de UNBOUND, antes de cotizar incentivos y cuando una beta cambie de estado.

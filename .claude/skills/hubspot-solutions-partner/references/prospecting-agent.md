# Prospecting Agent — contrato reusable de implementación

> **Scope:** HubSpot Breeze Prospecting Agent, agnóstico al cliente.
> **Verified as of:** 2026-07-17.
> **Fuentes numéricas:** cargar siempre `../SOURCES.md` y revalidar antes de cotizar o activar.

## Índice

1. Qué es y qué no es
2. Contexto y significado de “entrenar”
3. Configuración funcional
4. Enrollment y sourcing
5. Guardrails obligatorios
6. Créditos y control económico
7. Readiness gate
8. Piloto recomendado
9. Medición
10. Contrato de servicio reusable
11. Anti-patrones
12. Refresh obligatorio

## 1. Qué es y qué no es

El Prospecting Agent investiga contactos y empresas, genera outreach personalizado y puede ejecutar una
estrategia de prospección desde el contexto del Smart CRM. No es solamente un redactor de emails, un scraper
de listas ni un reemplazo irrestricto del vendedor.

Separar dos superficies que pueden coexistir pero no tienen el mismo contrato:

| Superficie | Estado | Función principal |
|---|---|---|
| **Prospecting Agent general** | Disponibilidad general | Investigar y contactar registros existentes mediante selling profiles, enrollment y outreach adaptativo o programado |
| **Buying Signals and Contact Sourcing** | Beta opt-in | Definir plays, monitorear señales de intención, recomendar empresas, buscar personas objetivo y ejecutar outreach `Sequence` o `Adaptive` |

No vender la beta como SLA ni asumir que sus controles, packaging o integraciones están disponibles en todos
los portales. Verificar el runtime y el contrato antes de diseñar el rollout.

## 2. Contexto y significado de “entrenar”

El resultado depende de la calidad y coherencia de:

- CRM: contacto, empresa primaria, owners, asociaciones, lifecycle, negocios y actividades.
- Interacciones recientes asociadas al contacto, hasta el último año: formularios, páginas vistas, llamadas,
  reuniones, notas y aperturas de email.
- Selling context: oferta, propuesta de valor, dolores resueltos, productos/servicios, CTA, documentos y URLs.
- Audiencia: segmentos de empresa, industrias, mercados, regiones y personas objetivo.
- Identidad: owner del contacto, owner de empresa o remitente único, según la superficie disponible.
- Señales: actividad de intención, investigación temática y eventos públicos de empresa en la beta.
- Instrucciones: tono, idioma, frecuencia, ventana de envío, custom instructions y exclusiones.

**Principio:** el agente amplifica el modelo comercial y la calidad del CRM. No corrige por sí solo duplicados,
asociaciones falsas, owners obsoletos, consentimientos insuficientes ni una oferta mal definida.

### “Entrenar” no es fine-tuning

HubSpot denomina `Sources and training` a una zona del selling profile, pero en este producto **entrenar**
significa configurar y aportar contexto comercial. No afirmar que HubSpot fine-tunea un modelo privado con los
datos del portal, ni que el agente se reentrena solo después de cada email, respuesta o reunión: la documentación
oficial vigente no publica ese contrato.

| Customer Agent | Prospecting Agent |
|---|---|
| Se fundamenta en un corpus de contenido para responder preguntas con conocimiento contextual y fuentes verificables. | Se fundamenta en selling information, CRM, audiencia/persona, oferta, señales e instrucciones para investigar y construir outreach. |
| Su entrenamiento incluye content sources, guidelines, acciones, handoff, respuestas cortas y coaching desde pruebas/conversaciones. | Su entrenamiento incluye website analysis, selling profiles o plays, productos/servicios, CTA, identidad, tono, idioma, custom instructions y guardrails. |
| El problema central es: “¿cuál es la respuesta correcta y cuándo escalar?”. | El problema central es: “¿a quién contactar, por qué ahora, qué vender y cómo abrir la conversación?”. |

Tratar el website analysis como una extracción inicial que debe revisarse, no como verdad aprobada. En la
superficie general, los HubSpot documents y URLs documentados dentro de `Call to action` son recursos que el
agente puede incluir en el outreach; no presentarlos como una base de conocimiento indexada equivalente a la
del Customer Agent salvo que documentación o readback del portal lo demuestren explícitamente.

El modo `Adaptive` puede ajustar timing y contenido usando comportamiento, engagement y señales durante el
enrollment. Eso es adaptación operacional, no evidencia de aprendizaje permanente del modelo. La mejora continua
es gobernada: revisar drafts, claims, respuestas, reuniones, falsos positivos y métricas; luego actualizar el
selling profile/play, sus instrucciones, audiencias, señales, exclusiones o assets.

### Paquete de entrenamiento comercial

Antes del piloto, versionar y aprobar como mínimo:

`oferta → audiencia/segmento → persona → dolores → propuesta de valor → señales → claims permitidos → evidencia → CTA → tono/idioma → exclusiones → stop conditions`

Separar hechos ratificados de hipótesis comerciales. No permitir que una inferencia de research se convierta en
un claim factual del email sin evidencia. Mantener un owner humano para aprobar cada cambio del paquete y
registrar qué versión produjo cada cohorte cuando el portal no ofrezca esa trazabilidad de forma nativa.

## 3. Configuración funcional

### Selling profiles y plays

- Usar un selling profile o play por combinación coherente de oferta, audiencia/persona y posicionamiento.
- No crear un perfil por campaña si comparte el mismo contrato comercial; evitar fragmentación innecesaria.
- La superficie general admite hasta 85 selling profiles, sujeto a cambios de producto.
- En la beta, cada play define `Audience`, `Selling context`, `Outreach`, `Guardrails` y `Automation`.
- Probar el play con un contacto representativo antes de publicarlo y leer la secuencia completa, no sólo el
  primer correo.

### Modos de outreach

| Modo | Uso |
|---|---|
| **Adaptive** | Ajustar contenido y timing según comportamiento, engagement y señales. La superficie general termina por defecto el enrollment adaptativo a los 30 días. |
| **Scheduled** | Mantener una cadencia fija y predecible. |
| **Sequence** *(beta)* | Ejecutar una secuencia personalizada y multicanal con smart subjects/blocks y pasos definidos. |

### Autonomía

- `Review before sending`: un humano revisa y aprueba cada mensaje. Es el default de piloto.
- `Send automatically`: el agente envía dentro de los guardrails configurados. Activarlo sólo después de
  evidencia estable de calidad, exclusiones correctas, remitentes habilitados y métricas aceptables.

## 4. Enrollment y sourcing

La superficie general permite enrollment manual, rulesets, workflows, Target Accounts y extensiones de correo.
La beta agrega plays, recomendaciones por señales y fuentes externas compatibles.

Reglas conocidas de la superficie general, sujetas a refresh:

- Manual: hasta 10 contactos por lote; investigación de 10 contactos por minuto.
- Capacidad: hasta 1.000 contactos investigados/compuestos por cuenta al día y 1.000 emails al día.
- El enrollment automático excluye contactos ya inscritos en una secuencia o en el agente y contactos
  asociados a negocios abiertos o `Closed won`.
- No duplicar la misma automatización entre rulesets del agente y workflows.
- El contacto termina cuando responde, agenda una reunión o alcanza el máximo de emails.

Capacidades beta:

- Monitorear segmentos de empresas por señales elegidas.
- Recomendar empresas, razones para contactarlas y personas objetivo.
- Encontrar hasta tres contactos que coincidan con las personas definidas por empresa.
- Limitar sugerencias nuevas por día para cada play.
- Conectar una sola fuente externa a la vez entre las integraciones soportadas; verificar disponibilidad,
  contrato, licitud y calidad antes de incorporar sus datos.

## 5. Guardrails obligatorios

Antes de cualquier enrollment, construir y aprobar una exclusión que cubra al menos:

- clientes o relaciones que no correspondan al motion de adquisición;
- contactos con negocios abiertos, ganados o compromisos comerciales incompatibles;
- registros rebotados, sin email válido o con supresión aplicable;
- contactos actualmente en secuencias u otra automatización de outreach;
- competidores, proveedores, colaboradores y dominios internos;
- duplicados o asociaciones empresa-contacto no confiables;
- registros sin owner/remitente válido cuando la identidad dependa del owner;
- mercados, personas o segmentos fuera del play;
- cualquier restricción legal, contractual o de preferencia aplicable al canal y jurisdicción.

Protecciones documentadas por HubSpot:

- no más de tres emails enviados por el agente en 90 días sin señal fuerte de engagement;
- mínimo de días entre emails y máximo por enrollment;
- días hábiles, ventana horaria y zona horaria;
- listas de exclusión;
- stop por respuesta, reunión o máximo configurado;
- la superficie general sólo soporta la brand voice predeterminada;
- acciones con créditos no se ejecutan en sandbox.

No usar custom instructions para evadir límites conservadores sin una decisión explícita de deliverability y
riesgo reputacional. Que el producto permita un override no lo convierte en una práctica recomendable.

## 6. Créditos y control económico

El rate sheet legal vigente cobra **100 HubSpot Credits por recomendar outreach para un lead**. Con la tarifa
de capacidad adicional vigente, equivale a USD 1 por outcome. El KB de la beta describe el consumo cuando se
genera outreach personalizado y advierte pasos adicionales según el play.

Antes de activar:

1. Verificar el tier contractual y los créditos incluidos; no sumarlos entre Hubs y no asumir rollover.
2. Revisar en el portal el estimador del play y el disparador de consumo mostrado en ese runtime.
3. Definir límite mensual de cuenta y límite específico de la feature.
4. Reservar capacidad para otros consumidores de créditos, especialmente Customer Agent, Data Agent y
   acciones Breeze en workflows.
5. Modelar `créditos → contactos recomendados → respuestas positivas → reuniones → oportunidades → ingreso`.

No medir eficiencia como costo por email. Medir costo por outcome comercial útil.

## 7. Readiness gate

Clasificar cada dimensión `ready | conditional | blocked` antes del piloto:

| Dimensión | Evidencia mínima |
|---|---|
| **Entitlement** | Feature visible, beta/GA identificada, seats, permisos y créditos confirmados |
| **AI access** | Generative AI, CRM data, conversation data y files habilitados según política |
| **Identity** | Inbox conectado, agent access habilitado, sender/fallback y firma verificados |
| **Audience** | Segmento y persona explícitos, tamaño conocido y criterio de inclusión reproducible |
| **Commercial context** | Oferta, value proposition, pains, productos/servicios, CTA y assets ratificados |
| **Data quality** | Emails, owners, empresa primaria, asociaciones, deals, duplicados y lifecycle auditados |
| **Exclusions** | Lista aprobada y recuento before/after documentado |
| **Compliance** | Base, preferencias, canal, jurisdicción y contrato revisados por el owner competente |
| **Deliverability** | Rebotes/supresiones revisados, dominio e inbox aptos y volumen conservador |
| **Measurement** | Baseline, KPIs, attribution y dashboard definidos antes del primer envío |
| **Governance** | Owner humano, aprobación, stop conditions, incident path y rollback definidos |

Un `blocked` en identidad, exclusiones, compliance, deliverability o asociaciones impide enviar. Puede permitirse
research read-only si no consume créditos ni altera registros y el contrato del portal lo soporta.

## 8. Piloto recomendado

Aplicar `propose → confirmación humana → execute`:

1. Diseñar un solo play/perfil con una oferta, segmento y persona.
2. Calcular la cohorte y exclusiones sin inscribir registros.
3. Revisar una muestra de 10-20 contactos y su contexto CRM.
4. Generar ejemplos y revisar asunto, hechos, tono, CTA, idioma y claims.
5. Comenzar con `Review before sending` y un remitente responsable.
6. Limitar volumen, frecuencia, duración y créditos.
7. Revisar diariamente drafts, errores, replies, reuniones y señales de deliverability.
8. Cerrar con decisión `expand | adjust | stop`; no activar automático por inercia.

No mezclar en un mismo piloto adquisición net-new, reactivación, cross-sell y retención: tienen audiencias,
mensajes, exclusiones y outcomes diferentes.

## 9. Medición

### Funnel mínimo

`monitored companies → signaled companies → recommended contacts → approved contacts → delivered → replies → positive replies → meetings → qualified leads → opportunities → won revenue`

### KPIs

- cobertura de empresas monitoreadas y porcentaje con señal;
- aceptación de contactos recomendados y drafts aprobados sin edición material;
- entregabilidad, bounce y unsubscribe/suppression cuando aplique;
- reply rate y positive reply rate;
- meetings booked y show rate;
- qualified leads, oportunidades, pipeline e ingreso ganado;
- conversión y pipeline por play, segmento, industria, mercado, región, persona y oferta;
- tiempo humano de revisión por contacto;
- créditos por respuesta positiva, reunión, oportunidad e ingreso;
- false-positive rate de señales, empresas y personas sugeridas.

Aperturas y clics son diagnósticos, no el outcome principal. Vincular enrollments y respuestas con Leads/Deals
para medir pipeline e ingreso; la analítica nativa del agente no reemplaza el reporting RevOps.

## 10. Contrato de servicio reusable

Una implementación profesional incluye:

1. discovery de motion, outcome, audiencia, oferta y restricciones;
2. inventario de entitlement, permisos, credits, inboxes, datos e integraciones;
3. auditoría y remediación de readiness de CRM;
4. diseño de selling profiles/plays, sourcing, identity, CTA, lenguaje e instrucciones;
5. exclusiones, guardrails, presupuesto y matriz humano/agente;
6. pruebas de contenido y cohorte sin envío;
7. piloto supervisado;
8. dashboard y evaluación de outcome/costo;
9. decisión de expansión y, sólo con evidencia, autonomía gradual;
10. operación continua: QA, refresh de oferta/personas, control de créditos, deliverability y drift.

El valor del servicio no es encender el agente. Es construir contexto, gobierno, calidad de datos, medición y
responsabilidad operacional alrededor del agente.

## 11. Anti-patrones

- Activar `Send automatically` como configuración inicial.
- Enrolar toda la base o usar un play genérico para todas las ofertas.
- Tratar contactos encontrados externamente como automáticamente aptos para outreach.
- Usar datos inferidos como hechos en un email.
- Confiar en la exclusión de Deals cuando asociaciones o duplicados no están auditados.
- Duplicar triggers entre rulesets, workflows y secuencias.
- Medir éxito por aperturas, emails enviados o contactos investigados.
- Ignorar que los créditos son compartidos y no tienen rollover.
- Reinscribir cada 30 días sin nueva señal ni criterio comercial.
- Prometer capacidades beta, integraciones o packaging sin verificación live.

## 12. Refresh obligatorio

Revalidar documentación oficial y runtime:

- antes de cada propuesta o SOW;
- antes de opt-in o rollout de la beta;
- antes de cotizar créditos o volumen;
- cuando cambie el editor de plays/selling profiles, el rate sheet o los límites;
- después de los releases mayores de HubSpot;
- si el portal contradice esta referencia.

Fuente de verdad perecedera: `../SOURCES.md`. Si KB, catálogo legal y UI discrepan, registrar el drift, usar el
contrato comercial aplicable y no ejecutar hasta resolver el impacto.

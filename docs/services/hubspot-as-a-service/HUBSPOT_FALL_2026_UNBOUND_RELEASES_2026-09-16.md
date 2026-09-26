# HubSpot as a Service — lanzamientos Fall 2026 / UNBOUND 2026

> **Corte de investigación:** 2026-09-19 (America/Santiago); evidencia del evento hasta el cierre del 18/09.
> **Uso:** referencia operativa para discovery, diseño y propuesta; no sustituye la verificación del portal del cliente.
> **Regla:** una fuente del proveedor prueba que la capacidad está documentada, no que el portal, el país, el plan, los créditos o el runtime del cliente sean elegibles.

## Marco de posicionamiento: Outcomes Era

HubSpot llamó **«Outcomes Era»** al cambio de una plataforma que ofrece herramientas a una que organiza el
trabajo de personas y agentes para producir resultados observables. Es un **marco de la narrativa de UNBOUND
2026**, no un nombre de producto, un estado de release ni una garantía de ROI. Sus materiales públicos de Fall
Spotlight lo expresan como «proven by outcomes, powered by context»: Smart CRM que se actualiza, Growth Context
y una capa de acción en marketing, ventas y servicio. Para Efeonce, la lectura comercial es evaluar el resultado
por workflow, la calidad del contexto, el dueño humano, los límites de autonomía y la medición antes de escoger
agentes o licencias. Esta interpretación no convierte un benchmark agregado de HubSpot en promesa para un cliente.

Fuentes primarias del marco de resultados: [anuncio Fall Spotlight](https://ir.hubspot.com/news-releases/news-release-details/fall-26-spotlight-hubspot-just-made-its-most-foundational),
[kit de partners](https://offers.hubspot.com/fall-2026-spotlight-partner-enablement-kit). La expresión exacta
«Outcomes Era» se atribuye al discurso de UNBOUND/Analyst Day; no se usa como claim propio de Efeonce.

## Estado ejecutivo

| Superficie | Estado al corte | Qué puede afirmarse | Qué sigue sin probar |
| --- | --- | --- | --- |
| ChatGPT Lead Gen Ads en HubSpot | **Beta pública** | Super Admin puede inscribir la cuenta; con cuenta ChatGPT Ads conectada, HubSpot documenta creación/publicación, seguimiento, atribución y eventos de conversión. UNBOUND lo presenta como la alianza detrás de ChatGPT Lead Gen Ads. | Acceso del portal concreto, país habilitado en OpenAI Ads Manager, revisión de anunciante, billing, pixel y entrega real. |
| HubSpot connector for Claude / remote MCP | **Conector oficial documentado; expansión de scopes publicada, GA del conector/portal no equivale a runtime del cliente** | Claude puede consultar y, tras reautenticación, escribir en CRM, contenido, reportes, objetos personalizados y operaciones soportadas; las actualizaciones incluyen campañas, AEO, conversaciones y configuración. | Elegibilidad del workspace de Claude, scopes efectivos, permisos HubSpot, límites API, aprobación de writes y comportamiento runtime del portal. |
| Agent Hub / Agent Builder | **Documentado; first look de UNBOUND; pilot-first para servicio** | HubSpot lo presenta como lugar para gestionar agentes y construir agentes/workflows; puede conectar aplicaciones mediante MCP y usar contexto CRM. | Que el menú, agente, acción, créditos, seats y permisos estén disponibles o activos en un portal específico. |
| Breeze Assistant — prompts compartidos | **Beta pública** | En cuentas enroladas se pueden compartir prompts con el equipo; Super Admin controla prompts compartidos de otros usuarios. | Enrolamiento y disponibilidad de la cuenta. |
| Breeze Assistant — Scheduled Prompts | **Beta pública** | En cuentas enroladas, cada usuario puede configurar hasta cinco prompts automatizados personales y pausarlos, editarlos o eliminarlos. | Enrolamiento, horarios efectivos, consumo, resultados y cualquier límite adicional no declarado por la fuente. |
| UNBOUND 2026 | **First look / contenido de evento** | Las sesiones presentan Agent Hub, Agent Builder, Breeze Assistant y el conector ChatGPT Ads como superficies de aprendizaje y demostración. | Una sesión no es GA, contrato de disponibilidad, pricing ni prueba de runtime. |
| Self-updating Smart CRM / Growth Context / Context Home | **Lanzamiento Fall Spotlight; disponibilidad por cuenta/plan** | HubSpot presenta CRM que captura llamadas, emails y reuniones, y una superficie para revisar la calidad del contexto que alimenta a IA. | Freshness, portal, plan, permisos, cobertura de fuentes y resultado operativo. |
| Breeze Assistant reconstruido | **Lanzamiento Fall Spotlight; disponibilidad por cuenta/plan** | Puede coordinar agentes para preguntas, planes, reportes, contenido y acciones desde la experiencia de HubSpot. | Roster, créditos, permisos, acciones, límites y publicación efectiva. |
| Marketing Studio + Campaign Agent | **Lanzamiento/demo Fall Spotlight; Campaign Agent y agentes de contenido requieren validación** | Marketing Studio conecta insights, campañas, contenido y rendimiento; Campaign Agent ayuda a construir campañas con contexto CRM. | Estado GA/beta, edición, canales, consentimiento, créditos y outcome. |
| Customer Agent Voice | **First look / demo de UNBOUND del 17/09** | Agente de voz de soporte que usa contexto CRM, toma acciones y deriva a humanos. | No es prueba de GA, región, idioma, canal o runtime. |
| HubSpot Work | **First look / demo de UNBOUND del 18/09** | Producto de gestión de trabajo que combina procesos, contexto de cliente y agentes de IA. | No es prueba de GA, pricing, disponibilidad ni sustitución de PSA/ERP. |
| Agent CLI | **Demo de UNBOUND; estado beta pública según el ledger de la skill** | Agentes pueden analizar deals, asociaciones y transcripciones para producir una vista de pipeline con evidencia y revisión humana. | Developer opt-in, scopes, ejecución, writes, límites y runtime del portal. |
| Smart CRM Universal Record Page | **Private beta; first look/demo del 18/09** | Nueva experiencia de registro universal con layout de dos columnas, timeline rediseñada, next best actions y personalización en página; HubSpot afirma que carga 2× más rápido que la experiencia clásica. | Opt-in de private beta, cobertura por cuenta/objeto, layout efectivo, permisos y rendimiento real. |

## ChatGPT Ads dentro de HubSpot

### Requisitos y flujo de acceso

HubSpot marca la integración como **Beta** y la documentación indica disponibilidad con todos los productos y planes,
salvo que se indique lo contrario. La activación no es automática: un **Super Admin** debe inscribir la cuenta en la
beta. Para conectar una cuenta se requiere permiso de **Ads publishing** y una cuenta activa de ChatGPT Ads con API key
del panel de OpenAI Ads. Puede crearse una cuenta desde HubSpot, pero eso no elimina los requisitos de OpenAI para
verificación, billing, identidad del anunciante, revisión y entrega.

Secuencia gobernada:

1. Confirmar que el cliente, no la agencia, crea la cuenta de anunciante de OpenAI. La agencia puede ser invitada
   después; la documentación de OpenAI no admite onboarding individual ni creación de la cuenta del cliente por la agencia.
2. Verificar el país/región del negocio o ad account en el catálogo vigente de OpenAI Ads Manager. El país del login de
   ChatGPT no sustituye el país del ad account; crear una cuenta en un país no soportado no concede acceso.
3. Completar verificación, información de negocio, billing y pago en Ads Manager. País/región, moneda y zona horaria
   pueden quedar fijados al crear la cuenta.
4. En HubSpot, obtener confirmación de Super Admin, permission set con Ads publishing y consentimiento aplicable antes
   de conectar o sincronizar datos.
5. Conectar en `Marketing > Ads`, activar **Auto tracking** sólo después de acordar la nomenclatura y el contrato de
   medición, y leer de vuelta la cuenta conectada, pixel, usuario principal, timezone y estado.

### Regiones y audiencia

OpenAI mantiene un catálogo país por país y advierte que la disponibilidad cambia durante el beta. Al corte, su
comunicación pública confirma expansión a Reino Unido, México, Brasil, Japón y Corea del Sur, además de Estados Unidos,
y una expansión europea a 31 mercados; esas comunicaciones no sustituyen el catálogo actual. **No se afirma
disponibilidad para Chile** sin una lectura positiva del catálogo y del ad account del cliente.

La audiencia de usuario tampoco equivale a la elegibilidad del anunciante:

- los anuncios pueden aparecer para usuarios con planes Free o Go;
- Plus, Pro, Business, Enterprise y Edu no tienen anuncios;
- no se muestran anuncios a cuentas identificadas como menores de 18 años;
- no se colocan anuncios junto a temas sensibles o regulados como salud, salud mental o política, y actualmente no se
  permite publicidad política en ChatGPT;
- el anunciante recibe reporting agregado, no chats, historial, memorias, nombre, email, ubicación precisa, IP ni
  información sensible del usuario.

Para campañas, OpenAI documenta targeting por país y, en Estados Unidos, por estados, mercados y ZIP cuando están
soportados; también permite seleccionar plataformas Android app/web, desktop web, iOS app/web. Las audiencias
personalizadas deben tratarse con cuidado: para EEA/Suiza no se recomienda usarlas mientras la personalización no esté
disponible, y una inclusión requiere al menos 25.000 usuarios coincidentes. La disponibilidad exacta se confirma en el
selector/catálogo, no por inferencia geográfica.

### UTMs, conversion events, consentimiento y caps

- **UTMs:** al activar Auto tracking, HubSpot añade parámetros UTM a las URLs de ChatGPT Ads para atribución de contactos,
  deals y ROI junto con otros canales. Registrar la convención resultante y leer una URL real; no asumir nombres de
  parámetros ni atribución completa sin evidencia.
- **Eventos:** la cuenta ChatGPT Ads debe estar conectada antes de crear un evento. El evento puede dispararse por
  cambio de lifecycle stage o envío de formulario, y se seleccionan cuenta/pixel, evento de ChatGPT, valor y nombre.
  Sólo se consideran actualizaciones posteriores a la creación del evento.
- **Datos enviados:** HubSpot documenta el ChatGPT click ID y campos opcionales seleccionados: email, nombre, apellido,
  teléfono, IP, ciudad, estado/provincia, código postal y país.
- **Consentimiento:** antes de crear el evento, cada contacto cuyos datos se compartirán debe haber dado permiso para
  compartirlos con ChatGPT Ads. El consentimiento debe ser verificable por contacto y propósito; no se sustituye por un
  consentimiento genérico de marketing ni por el hecho de que exista un click ID.
- **Caps de eventos en HubSpot:** Marketing Hub Starter hasta 5 eventos; Professional hasta 50; Enterprise hasta 100.
  Son límites documentados de cantidad de eventos, no pricing ni promesa de impresiones/conversiones.
- **Caps de gasto en OpenAI:** una campaña puede usar presupuesto total o diario. El diario es un promedio objetivo de
  siete días; OpenAI documenta que el límite publicado puede llegar a 2× en un día local y 7× en una semana
  domingo–sábado. Si el control requerido es el total estricto, usar presupuesto total de campaña. No añadir precios,
  CPC, CPM o mínimos de presupuesto a una propuesta sin el catálogo vigente y la configuración concreta.
- **No confundir:** un evento creado, un contacto consentido o una URL con UTM no prueba señal recibida, match,
  optimización ni revenue atribuido. Verificar cada tramo.

## Expansión MCP / Claude

HubSpot publicó el 2026-09-15 una actualización del conector para Claude respaldado por su MCP server. La expansión
documentada incluye lectura de registros de leads, creación de landing pages y analytics de landing pages, website
pages y blog posts, además de gestión de campañas y datos de atribución. Las aplicaciones construidas sobre el MCP
server reciben las actualizaciones sin cambios de código, pero el usuario debe **reautenticar** para obtener scopes
nuevos. La restricción de dominio verificado está documentada para Claude Enterprise.

La guía vigente del conector documenta acceso a contactos, companies, deals, tickets, custom objects, emails, blogs,
usuarios, line items, quotes, invoices, orders, carts, products, subscriptions y segmentos, junto con engagement
history, sujeto a permisos y configuración. Para writes y visibilidad de engagements se requiere desconectar y
reautenticar. Las actualizaciones masivas están limitadas a 10 registros por operación y las custom validation rules
(incluidas validaciones de pipeline y association labels) no se aplican al crear o actualizar por el conector. La
recomendación operativa es dejar las write tools en **Needs Approval** y revisar el change set antes de confirmar.

Esto amplía la capacidad técnica del conector, no la autoridad de Efeonce: cada cliente conserva su portal, scopes,
permisos, consentimiento, source of truth y aprobación humana. El MCP server de HubSpot no se debe confundir con el
gateway MCP de Efeonce ni con el bridge Greenhouse–HubSpot.

## Agent Hub, Breeze y Scheduled Prompts

Agent Hub es la superficie de gestión; Agent Builder es la superficie de construcción de agentes/workflows; Breeze
Assistant es la superficie de uso asistido para equipos. Un agente en HubSpot puede conectarse a sistemas externos
mediante MCP, pero cada conexión tiene requisitos propios y algunas funciones requieren HubSpot Credits. La lista de
apps soportadas y los permisos de Agent Builder deben leerse al momento del diseño.

Para el servicio gestionado, el mínimo antes de diseñar un agente es: inventario del menú y licencia, permisos,
créditos, conocimiento/contexto, tools/actions, handoff, límites de escritura, evaluación y readback. `Agent Hub` o
`Agent Builder` visible no basta para declararlo publicado o runtime-verified.

### Scheduled Prompts: patrón permitido en beta

Con Breeze Assistant habilitado y la cuenta enrolada en la beta, un usuario puede crear hasta cinco prompts
automatizados personales, definir frecuencia y hora, y luego editarlos, pausarlos, reanudarlos o eliminarlos. Los
scheduled prompts aparecen en el historial de chats. No son workflows, no son una automatización de CRM con garantía
de entrega y no deben usarse para activar writes externos sin una revisión humana y un mecanismo de handoff. La
operación debe registrar prompt, owner, horario/zona, fuentes esperadas, resultado, excepciones y consumo cuando el
portal lo exponga.

## Lectura comercial y gates de Efeonce

## Lanzamientos ampliados del 16–18/09

### Plataforma y contexto

Fall Spotlight presenta un cambio de base: **Growth Context** reúne contexto del negocio, equipo, clientes y
procesos; **Context Home** permite revisar vacíos y correcciones; y el **Smart CRM self-updating** busca mantener
registros actualizados desde llamadas, emails y reuniones. Es una dirección de producto y una capacidad documentada,
no evidencia de que cada portal tenga cobertura completa.

### Marketing, ventas y revenue

- **Marketing Studio + Campaign Agent:** insight → campaña → contenido → nurturing → medición, con agentes
  especializados y contexto de marca/CRM.
- **Microsoft Advertising:** campañas y atribución junto con otros canales dentro de HubSpot.
- **Prospecting Agent:** más de 40 señales de compra, grupos de compra y outreach contextual; validar límites y
  estado por portal.
- **Mobile Notetaker + Deal Progression:** captura de reuniones, propuestas de actualización y seguimiento con
  aprobación.
- **Revenue Hub:** cotizaciones generadas desde el contexto del deal y continuidad quote-to-cash.

### Demos del 17–18/09: no convertir en GA

UNBOUND mostró **Customer Agent Voice**, **HubSpot Work** y **Agent CLI**. Se registran como first look/demo hasta
que Knowledge Base, release notes y el portal del cliente prueben estado, elegibilidad y runtime. Lo mismo aplica a
las sesiones de “What’s New for Service/Sellers/Marketers”: son evidencia de dirección y demostración, no una lista
de entitlements universales.

El 18/09 también hubo un laboratorio exclusivo para clientes de **Build, Test, and Deploy Customer Agent**, con
configuración de fuentes de conocimiento, handoffs, guidelines y pruebas antes del lanzamiento. Es evidencia de un
flujo de enablement para clientes con acceso requerido, no prueba de disponibilidad universal ni de publicación en un
portal concreto.

El **Smart CRM Universal Record Page** se mostró como private beta. La referencia pública habla de un record universal,
no de una migración obligatoria del layout clásico; la elegibilidad y el rendimiento deben comprobarse en el portal.

### Ecosistema e integraciones

El Marketplace reportó 156+ apps nuevas y 21+ actualizadas, incluyendo conectores para Gemini, G2, Gong, Microsoft
Advertising, SharePoint/OneDrive, TikTok Ads y ampliaciones de Copilot, Claude y Slack. Registrar estas integraciones
como opciones de ecosistema, no como capacidades nativas de HubSpot ni como disponibilidad automática.

El cierre técnico de Fall Spotlight también dejó **Developer Platform Projects 2026.09 en GA**, la **Conversations API
en GA** para Inbox/Help Desk (hilos, mensajes, asignaciones, estados y webhooks), 44 APIs actualizadas y nuevas betas
públicas —entre ellas Lead Scoring, Contracts, AEO, Marketing Forms, Automation Workflows, Scheduler, Subscriptions
Lifecycle y Activity Auto Associations—. Una API GA sigue necesitando scopes, tier, permisos, versión y readback; una
beta no entra al contrato de bridge ni autoriza writes productivos.

### Cambios legales y comerciales de operación

HubSpot actualizó términos para Revenue Hub, Pay-as-You-Go por excedentes de créditos y responsabilidades específicas
de AI Agents: autorización de acceso, supervisión, disclosure de interacciones automatizadas y uso permitido. Este
registro no sustituye el contrato ni el DPA del cliente.

- **Puede entrar en discovery:** auditoría de elegibilidad, diseño de atribución consentida, prueba controlada de
  ChatGPT Ads y evaluación de conectores/agentes.
- **Pilot-first:** ChatGPT Ads beta, Agent Hub/Agent Builder, MCP writes y Scheduled Prompts. El alcance debe quedar
  limitado a un portal, una audiencia/cohorte y objetivos medibles.
- **No prometer:** Chile habilitado, pricing, seats, créditos incluidos, volumen de entrega, benchmarks, revenue
  incremental, disponibilidad de una acción MCP, publicación de un agente o ejecución de un scheduled prompt sin
  evidencia del portal.
- **Approval gate:** conexión de cuentas, consentimiento/sync de contactos, publicación de anuncios, creación de
  conversion events, writes del conector, activación de agentes/workflows y scheduled prompts requieren aprobación
  explícita y readback posterior.

## Fuentes oficiales consultadas (corte 2026-09-18)

### 2026-09-15

- [HubSpot — Connect and manage ChatGPT Ads account in HubSpot](https://knowledge.hubspot.com/connect-and-manage-chatgpt-ads-account-in-hubspot) — beta, permisos, cuenta/API key, auto tracking y OAuth.
- [HubSpot — Create ChatGPT Ads campaigns in HubSpot](https://knowledge.hubspot.com/create-chatgpt-ads-campaigns-in-hubspot) — creación/publicación, segmentación, presupuesto y programación.
- [HubSpot — Create and sync ad conversion events with ChatGPT](https://knowledge.hubspot.com/create-and-sync-ad-conversion-events-with-chatgpt) — requisitos, consentimiento, campos, límites 5/50/100 y ventana temporal.
- [HubSpot Community — Spotlight Feature: HubSpot MCP server updates](https://community.hubspot.com/t/spotlight-feature-hubspot-mcp-server-updates/156456) — expansión del conector Claude/MCP.

### 2026-09-14 y 2026-09-16

- [HubSpot — Connect apps to HubSpot's AI agents](https://knowledge.hubspot.com/integrations/customize-breeze-agents-with-hubspot-mcp-client) — MCP en Agent Builder, permisos, créditos y apps soportadas; actualizado 2026-09-14.
- [HubSpot — Agent Hub: Put Agents to Work Across Your Customer Journey](https://unbound.hubspot.com/sessions/sess-1428) — primera mirada de UNBOUND 2026, sesión 2026-09-16.
- [HubSpot — Create and manage prompts in Breeze Assistant](https://knowledge.hubspot.com/ai/create-and-manage-prompts-in-breeze-assistant?2079224=undefined) — Prompt Sharing y Scheduled Prompts beta, hasta cinco prompts personales.
- [OpenAI Help Center — Ads Manager Beta Account Setup](https://help.openai.com/en/articles/20001213) — cuenta empresarial, verificación, país, billing, agencia invitada y campos no editables.
- [OpenAI Help Center — Create Campaigns for ChatGPT Ads](https://help.openai.com/en/articles/20001210-create-campaigns-for-chatgpt-ads) — objetivos, presupuesto, regiones, plataformas, audiencias y caps de gasto.
- [OpenAI Help Center — Ads in ChatGPT](https://help.openai.com/en/articles/20001047) — audiencia, privacidad, temas sensibles, menores, personalización y reporting agregado.
- [HubSpot — Set up and use the HubSpot connector for Claude](https://knowledge.hubspot.com/integrations/set-up-and-use-the-hubspot-connector-for-claude) — suscripción Claude, objetos, reautenticación, límites de bulk y aprobación de writes.

### 2026-09-17 y 2026-09-18

- [HubSpot Fall 2026 Spotlight](https://www.hubspot.com/company-news/fall-26-spotlight) — Smart CRM self-updating, Growth Context, Context Home, Breeze Assistant, Marketing Studio, Microsoft Advertising, Prospecting Agent, Notetaker, Deal Progression y Revenue Hub.
- [HubSpot and OpenAI deepen partnership](https://ir.hubspot.com/news-releases/news-release-details/hubspot-and-openai-deepen-partnership-bring-ai-transformation) — capacidades ampliadas del conector ChatGPT, ChatGPT Ads y AI Growth Bundle.
- [UNBOUND — Customer Agent Voice](https://unbound.hubspot.com/sessions/sess-1442) — demo del 17/09; first look, no prueba de GA.
- [UNBOUND — Marketing Studio + Campaign Agent](https://unbound.hubspot.com/sessions/sess-1441) — demo del 17/09; contexto de Marketing Studio y Campaign Agent.
- [UNBOUND — HubSpot Work](https://unbound.hubspot.com/sessions/sess-1448) — first look del 18/09; producto de AI work management.
- [UNBOUND — Agent CLI](https://unbound.hubspot.com/sessions/sess-1447) — demo del 18/09; pipeline read-only con revisión humana.
- [UNBOUND — Smart CRM Universal Record Page](https://unbound.hubspot.com/sessions/sess-1446) — demo del 18/09; private beta, layout/timeline/actions de la nueva página de registro.
- [UNBOUND — Build, Test, and Deploy Customer Agent](https://unbound.hubspot.com/sessions/sess-1360) — laboratorio de clientes del 18/09; enablement y despliegue guiado, no entitlement universal.
- [UNBOUND — Beyond the Click](https://unbound.hubspot.com/sessions/sess-1566) — conversación del 18/09 sobre la alianza HubSpot–OpenAI detrás de ChatGPT Lead Gen Ads.
- [HubSpot — Fall 2026 Spotlight Developer / Builder Updates](https://developers.hubspot.com/changelog/fall-2026-spotlight) — Projects 2026.09 GA, Conversations API GA, APIs actualizadas y betas públicas.
- [HubSpot — Universal record page](https://knowledge.hubspot.com/records/understand-the-default-record-layout?region=united-states) — private beta, layout actualizado y opt-in.
- [HubSpot — Set up HubSpot Work](https://knowledge.hubspot.com/ai/set-up-hubspot-work) — HubSpot Work documentado como beta, con planes, permisos, seats y créditos condicionados.
- [HubSpot Community — Marketplace apps](https://community.hubspot.com/t/156-new-and-21-featured-updated-apps-in-the-hubspot-marketplace/157999) — 156+ apps nuevas y 21+ actualizadas.
- [HubSpot Legal Update 2026-09-16](https://community.hubspot.com/t/september-16-2026-legal-update/158698) — Revenue Hub, créditos, AI Agents, subprocesadores y términos.

### Fuentes oficiales de contexto vigente consultadas en el corte

- [OpenAI — Testing ads in ChatGPT](https://openai.com/index/testing-ads-in-chatgpt/) — actualización pública de regiones 2026-08-11, consultada 2026-09-16; no se usa como prueba de disponibilidad actual del ad account.

Las fuentes se vuelven a validar antes de cada propuesta, activación o publicación. Pricing y disponibilidad no se
derivan de esta nota. Las sesiones de UNBOUND son evidencia de dirección/demo; sólo documentación de producto y
readback del portal prueban elegibilidad o runtime.

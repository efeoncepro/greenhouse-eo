# Prospección B2B Efeonce: revisión y estructura propuesta

Fecha de consulta: **2026-10-11**. Owner de decisión: Julio Reyes / Commercial.
Estado al cierre de investigación: **propuesta pendiente de aprobación; skill no creada**. La aprobación posterior y la implementación se registran en §12.
Este informe no cambia ICP, pricing, permisos, configuraciones, CRM, automatizaciones o envíos.

## 1. Decisión recomendada

Crear `efeonce-b2b-prospecting` como método compartido de prospección por cuenta, consolidando lo aprendido en
la skill personal `hubspot-saas-prospecting`. Mantener esta última como entrada compatible del radar diario,
delegando el método al núcleo compartido. Conservar IDs HSP, historia, aprobaciones y almacenamiento privado;
no crear otro scheduler ni mover datos de contacto al repo.

La salida será una **cuenta con una ruta comercial defendible**: problema o hipótesis, señal, encaje,
objetivo y personas adyacentes, correos accionables, relación, prueba pertinente y siguiente decisión.
La skill coordinará a los owners actuales de Commercial, Customer Model, Research, práctica, Copy y HubSpot.

## 2. Alcance y método de revisión

Tres subagentes hicieron dos rondas: primero auditoría interna de trabajo reciente, modelos y skills;
después investigación externa sobre frío, relaciones/compra consultiva y operación técnica. Un subagente
revisó adversarialmente la síntesis; el agente principal contrastó documentos y fuentes primarias clave.

La revisión interna cubrió expedientes y auditorías comerciales del **06–11 de octubre**, planes de revenue,
modelos de cliente/servicio, demostraciones, propuestas, cotizador y routing de skills. Incluyó Bivien,
banca/retail, QuePlan, WIN, Pichincha/Pibank, Sika, Socopur, SKY y Pierre Fabre. Haulmer y antecedentes de
reactivación se usaron como aprendizaje histórico de memoria fechada. No se releyó cada archivo binario,
conversación privada ni registro CRM; los casos conservan sus cortes documentales y no representan un
refresco live del pipeline.

Fuentes externas: documentos oficiales de proveedores, estudios primarios y metodologías de sus autores.
Se abrieron las fuentes antes de citarlas. Se separaron fecha de publicación, trabajo de campo y consulta;
dos publicaciones de una misma encuesta no se contaron como estudios independientes. Los benchmarks no
son tasas esperadas de Efeonce; recomendaciones comerciales son hipótesis a validar localmente.

## 3. Hallazgos internos y consecuencias

| Hallazgo | Evidencia actual | Consecuencia para la propuesta |
| --- | --- | --- |
| Ya existe una skill amplia de prospección | Skill personal `/Users/jreye/.codex/skills/hubspot-saas-prospecting/SKILL.md`, sus playbooks y radar documentado | Consolidar; no mantener dos métodos competidores. Su nombre no refleja que ya cubre CRM, creativo, web y SEO/AEO |
| La skill personal conserva reglas anteriores | Dice «idealmente 2–3 roles» y admite buzón compartido con aprobación; el [canon actualizado](../../architecture/GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md#delta-2026-10-11--contactos-accionables-y-cobertura-de-la-cuenta-b2b) exige objetivo **más 2–3 adicionales** y correo corporativo individual | Migrar routing y eliminar la excepción de admisión individual en la fase aprobada; no alterar registros históricos |
| Relación, demanda y etapa no coinciden | [QuePlan](../../commercial/prospects/queplan-jorge-godoy-2026/README.md), [WIN](../../commercial/prospects/win-fitness-wear-social-2026/README.md), [banca conocida](../../commercial/prospects/contactos-conocidos-banca-retail-2026-10/README.md) | Una persona registrada no es cálida; demanda externa explícita no acredita relación ni comprador económico |
| Un registro correcto necesita más que email presente | [Bancos](../../commercial/prospects/bancos-chile-2026-10/README.md) conserva validaciones contradictorias; WIN documenta Lead automático y duplicado | Dedupe, vigencia laboral, atribución del correo, Primary Company y readback como gates |
| El contexto comercial cambia durante la relación | [Pibank](../../commercial/prospects/banco-pichincha-peru-seo-2026/README.md) pasó a otro producto/mandato; [Socopur](../../commercial/tenders/socopur-agencia-marketing-digital-2027/README.md) necesita recuperación de admisión; [Sika](../../commercial/tenders/sika-mexico-campana-q4-home-center-1169/README.md) tiene HOLD | Releer el estado dominante; no usar borradores obsoletos, asumir convocatoria abierta ni insistir ante espera expresa |
| Tenemos planes y método, pero no un baseline frío actual demostrado | [Plan outbound](../../commercial/PIPELINE_GENERATION_AND_OUTBOUND_PLAN_2027_V1.md) y [revenue agentic](../../commercial/AGENTIC_REVENUE_OPERATING_MODEL_V1.md) siguen propuestos | Sus volúmenes, cadencias y economics no se convierten automáticamente en mandatos de la skill |
| El diferencial comercial es una prueba contextual proporcional | [Demostración contextual](../../commercial/EFEONCE_VENTA_CON_DEMOSTRACION_CONTEXTUAL_V1.md) y [modelo de cliente](../../../.codex/skills/efeonce-customer-model-operator/SKILL.md) | Elegir qué duda resolver; una observación útil en frío, una muestra ante fit y un business case tras discovery suficiente |
| Un brochure aprobado puede contener claims pendientes | [Contenidos](../../../ai-generations/2026-10-09_deck-contenidos/deck/LEEME.md), [Engine](../../../ai-generations/2026-10-09_deck-web-nexa-spark/deck/LEEME.md), [SKY Social Care](../../commercial/prospects/sky-social-care-2027/README.md) | Verificar proof por servicio y mercado; no usar marcadores, simulaciones o estimaciones como resultados reales |

Dependencias: `commercial-expert` global y overlay existen en Claude, pero no el path Codex que cita el
customer model. `deep-research` no fue localizado en las raíces habituales y búsqueda razonable de plugins;
no declarar esa harness disponible. El gate general `skills:mirrors` pasa, pero su allowlist no certifica
todos estos bundles; algunos companions son intencionales. La implementación deberá resolver routing y
validación específica del nuevo bundle, sin copiar íntegramente métodos globales ni exigir dependencias
ausentes para una investigación simple.

## 4. Qué adoptar del mercado

### Cuenta, señales y oportunidad de entrada

6sense estudia decisiones y preferencias formadas antes del contacto comercial; Gartner encuentra que el
comprador pide ayuda humana para resolver incertidumbre contextual. La consecuencia propuesta es aportar
algo comprobable antes de pedir tiempo, y tener materiales coherentes que puedan circular en el grupo.
Esto no demuestra que el frío sea inútil ni que una señal agregada identifique a un comprador individual.
[6sense 2025](https://6sense.com/science-of-b2b/buyer-experience-report-2025/),
[Gartner 2026](https://www.gartner.com/en/newsroom/press-releases/2026-05-20-gartner-survey-finds-sixty-nine-percent-of-b-two-b-buyers-turn-to-sales-reps-to-validate-ai-generated-insights).

Prioridad propuesta: encaje, señal verificable, vigencia, acceso y factibilidad. Mantener desconocidos cuando
no haya evidencia; una vacante es contexto, no contratación de agencia, y un intent score de cuenta no es
una petición individual. Apollo documenta esa señal a nivel de empresa.
[Apollo Buying Intent](https://knowledge.apollo.io/hc/en-us/articles/8135721478925-Use-Buying-Intent-to-Prioritize-Prospects).

### Relevancia, CTA y evidencia

Gong observó diferencias entre CTA de interés en frío y coordinación específica en una venta activa;
la fuente original es de 2020, aunque se actualizó la página en 2026. Lo convertiríamos en una hipótesis
de mensaje por etapa, no en receta ni promesa de conversión. El mensaje debe sostener una observación,
su implicación y una capacidad pertinente; evitar recitar el perfil o presentar todo el portafolio.
[Gong CTA](https://www.gong.io/blog/this-surprising-cold-email-cta-will-help-you-book-a-lot-more-meetings).

Edelman/LinkedIn aporta evidencia de percepción sobre contenido útil para decisores visibles y ocultos;
Gartner describe el riesgo de outreach irrelevante. Para Efeonce proponemos pruebas pequeñas y compartibles
que reduzcan incertidumbre, con límites de preventa. Esta adaptación no prueba causalidad de nuestras demos.
[Edelman/LinkedIn, PDF 2025](https://www.edelman.com/sites/g/files/aatuss191/files/2025-07/2025%20Edelman-LinkedIn%20B2B%20Thought%20Leadership%20Impact%20Report_FINAL.pdf),
[Gartner 2025](https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-sales-survey-finds-61-percent-of-b2b-buyers-prefer-a-rep-free-buying-experience).

### Varias rutas con una conversación coordinada

McKinsey describe continuidad entre canales durante la compra; no prescribe usar diez canales por persona.
Apollo documenta controles cuando responde otra persona de la cuenta. Adoptaríamos una tesis coherente,
owner e historial por cuenta, traduciendo valor por rol. Investigar objetivo + 2–3 adyacentes es el criterio
aprobado del operador, no un tamaño óptimo probado científicamente ni una cuota de envíos simultáneos.
[McKinsey B2B Pulse 2026](https://www.mckinsey.com/capabilities/growth-marketing-and-sales/our-insights/the-surprising-economics-of-B2B-growth-the-new-survival-threshold-and-what-it-takes-to-thrive),
[Apollo Rulesets](https://knowledge.apollo.io/hc/en-us/articles/4409396858509-Manage-Sequence-Rulesets).

Para referidos: confirmar vínculo y utilidad de la presentación y preparar un texto reenviable. Reactivación:
releer lo ocurrido, validar problema/owner/calendario y aportar motivo nuevo. Expansión: revisar impacto y
delivery antes de proponer otra necesidad. SPIN aporta preguntas de discovery; SPICED ayuda a separar dolor,
impacto, evento crítico y decisión. MEDDPICC queda en Commercial para calificación proporcional, con desconocidos
explícitos. No cargar todos los frameworks en cada correo ni presentar una metodología como prueba de uplift.
[LinkedIn, introducciones](https://www.linkedin.com/business/sales/blog/b2b-sales/get-introduced-to-your-sales-prospects-in-4-simple-steps),
[SPIN, autor](https://www.huthwaiteinternational.com/spin-methodology),
[SPICED, autor](https://winningbydesign.com/spiced-framework/).

## 5. Clasificación propuesta y tratamiento por modo

Registrar dimensiones independientes, con fecha, fuente y confianza. Son categorías locales propuestas
para el dossier, no propiedades HubSpot nuevas ni probabilidades de cierre.

| Dimensión | Qué registrar |
| --- | --- |
| Relación por persona y con quién | Desconocida, vínculo verificable, referida, conversación previa, relación activa; fecha y vigencia |
| Demanda por oportunidad | Sin evidencia, señal indirecta, problema confirmado, evaluación activa, solicitud explícita |
| Progreso | Acceso, owner confirmado, discovery, requisitos, validación/consenso, decisión/procurement; desconocido si falta evidencia |
| Origen y proceso | Outbound, inbound, referido/partner, reactivación, expansión, licitación; pueden coexistir |
| Urgencia | Hito del comprador, consecuencia, fecha y estado abierto/vencido/HOLD; no urgencia inventada del vendedor |

| Modo | Trabajo prioritario y siguiente paso |
| --- | --- |
| Fría | Investigar micro-ICP y trigger; observación pertinente y CTA pequeño de encaje/interés. No fingir relación |
| Tibia | Recuperar contexto real de vínculo, referido o interacción; validar necesidad y owner antes de diagnosticar |
| Cálida | Continuar conversación bilateral desde la última interacción; resolver pregunta y coordinar compromiso concreto |
| «Caliente» | Si se usa, describir necesidad/proceso/hito confirmado; no inferirlo de una apertura, Lead o cargo |
| Reactivación | Revalidar historia, vigencia y motivo nuevo; reconocer demora propia cuando aplique; respetar HOLD y negativos |
| Expansión | Revisar impacto, salud de cuenta y nueva brecha con el owner; mapear el grupo comprador de esa oportunidad |
| Inbound o referido | Responder al contexto recibido y resolver fit; introducción no equivale a aval ni presupuesto |
| Licitación | Derivar a skill de tenders para bases, admisión, canal y plazos; no bordear restricciones de procurement |

Los contactos adyacentes no heredan temperatura, intención ni autorización del objetivo. Los modos seleccionan
el trabajo; no son estados excluyentes. Una cuenta puede ser cálida para Julio y fría para otro interlocutor.

## 6. Base técnica y límites de ejecución

1. **Descubrimiento y enriquecimiento separados.** People API Search de Apollo no devuelve emails/teléfonos;
   algunas consultas y waterfalls consumen créditos por registro, página o lookup. Antes de llamar, identificar
   endpoint/plan/alcance y autoridad. Aceptación de un trabajo asíncrono no es resultado; preservar request,
   dirección exacta, fuente, estado y costo real. No repetir búsquedas equivalentes vacías para completar cuota.
   [People Search](https://docs.apollo.io/reference/people-api-search), [pricing](https://docs.apollo.io/docs/api-pricing),
   [waterfall](https://docs.apollo.io/docs/enrich-phone-and-email-using-data-waterfall).
2. **Correo sin ambigüedad.** El canon de admisión vigente exige correo corporativo individual verificado.
   Separar atribución a persona, empleo/entidad vigente y calidad técnica del buzón. Correo proporcionado por
   la persona acredita procedencia directa, no un resultado SMTP; `valid` no prueba empleo. Guardar evidencias
   y contradicciones; no inventar emails, ni exigir un proveedor de validación único. Un dominio distinto puede
   ser legítimo; catch-all no significa buzón compartido. Sin correo, el objetivo queda en investigación o nota
   de empresa y se buscan rutas adyacentes, sin crear Contact/Lead vacío.
   [Apollo Email Status](https://knowledge.apollo.io/hc/en-us/articles/4423314404621-Email-Status-Overview).
3. **Dedupe y asociaciones explícitos.** HubSpot documenta que altas de empresas por API/sync no deduplican por
   dominio automáticamente. Reconciliar entidad y IDs, buscar contacto/Lead existentes y leer Primary Company
   después de las automatizaciones. No fusionar ni borrar por heurística de dominio.
   [HubSpot dedupe](https://knowledge.hubspot.com/records/deduplication-of-records),
   [asociación automática](https://knowledge.hubspot.com/object-settings/automatically-create-and-associate-companies-with-contacts).
4. **Paradas por contacto, cuenta y proceso.** Respuesta humana pausa automatización y activa revisión de cuenta;
   no representa el acuerdo de todos. Baja/rechazo se respeta según alcance; rebote bloquea el canal; OOO se
   clasifica con fecha y retorno. No escalar automáticamente a colegas para rodear una negativa. Supresión entre
   HubSpot y Apollo no se presume compartida; settings y detección de OOO difieren.
   [Apollo Rulesets](https://knowledge.apollo.io/hc/en-us/articles/4409396858509-Manage-Sequence-Rulesets),
   [HubSpot unenrollment](https://knowledge.hubspot.com/sequences/unenroll-from-sequence).
5. **Entregabilidad del rail real.** Revisar identidad, autenticación, reputación y bajas antes de un piloto de
   envío. Reglas Gmail/Yahoo/Outlook consumer tienen alcances y umbrales diferentes; no extrapolar bulk consumer
   a todo correo corporativo. No cambiar DNS ni herramientas durante la creación de una skill.
   [Gmail](https://support.google.com/mail/answer/81126?hl=en),
   [Yahoo](https://senders.yahooinc.com/best-practices/),
   [Microsoft](https://techcommunity.microsoft.com/blog/microsoftdefenderforoffice365blog/strengthening-email-ecosystem-outlook%E2%80%99s-new-requirements-for-high%E2%80%90volume-senders/4399730).
6. **Métricas humanas y por cuenta.** Opens/clicks pueden incluir scanners y precarga; quedan como diagnóstico,
   no intención ni calidez. Medir cuentas investigadas/eligibles, cobertura accionable, conversaciones humanas,
   derivaciones útiles, siguiente paso bilateral, reuniones realizadas, oportunidad calificada y costo de
   investigación/créditos/horas por resultado. Declarar denominador y cohortes, separar negativas, OOO y bots.
   [Apollo tracking](https://knowledge.apollo.io/hc/en-us/articles/34263074322701-Email-Tracking-Overview),
   [Apple Mail Privacy](https://www.apple.com/cl/legal/privacy/data/es-419/mail-privacy-protection/).

IA prepara evidencia, hipótesis, mapa, borrador y changeset; no convierte inferencias en hechos o en autoridad.
Las autorizaciones de lectura, consumo pagado, alta, asociación, enrollment y envío permanecen separadas;
se reutiliza una aprobación existente dentro de su alcance, sin pedirla otra vez. Una autorización del radar
diario no aprueba nuevos lotes CRM o mensajes. Firma/CCO y readback pertenecen al canon de Outlook/HubSpot.

## 7. Adaptación al modelo Efeonce

- Cargar el ICP vigente por entidad compradora y práctica. Piso corporativo de servicios nuevos: 50 personas
  verificadas; no promediar una banda que cruza el piso. La skill personal contempla filial acreditada de grupo
  mediano/grande: preservar su procedencia y proponer su alineación canónica, separando tamaño local/global.
- No deducir presupuesto del tamaño. Hay una discrepancia a ordenar: el contexto ICP llama vigente al gate
  económico del plan, pero el plan conserva estado `Proposed for validation`. No convertir USD 8–15k Spot o
  USD 3–5k MRR en tarifario universal ni cambiar el gate silenciosamente por crear la skill.
- Seleccionar una necesidad principal y una entrada compatible: diagnóstico/sprint/implementación acotada o
  capacidad gestionada según práctica. ASaaS exige alcance, operación, evidencia y continuidad; un proyecto
  pagado en cuotas no se convierte en recurrente. Pricing y capacidad quedan en sus owners vigentes.
- Operator-first es un lente: separar operador, problem owner, sponsor, economic buyer y governance;
  demostrar valor operativo y lo que dirección necesita para decidir. No afirmar champion por cargo o entusiasmo.
- Product Design 360 vende lanes; sitio público deriva a Web Experience. Channel & Commerce requiere validar
  geografía, expertise y partner/back-to-back antes de ofrecer terreno o producción física. Una señal Coljuegos
  en Colombia no demuestra que podamos asumir esa obligación local.
- Disponibilidad, naturaleza comercial y rollout son estados distintos. Hibernación de un producto no retira
  su naturaleza comercial, pero una evidencia antigua no permite prometer capacidad disponible hoy.
- Graduar la prueba contextual por oportunidad y reciprocidad; definir responsable, pregunta, plazo y límite
  de costo antes de una demo extensa. No publicar ni compartir material privado por detectar una señal.

Fuentes: [ICP](../../context/13_icp-buyer-personas-jtbd.md),
[operator-first](../../strategy/EFEONCE_OPERATOR_FIRST_PRODUCT_AND_GROWTH_CONTRACT_V1.md),
[portfolio](../../commercial/SERVICE_PORTFOLIO_REVENUE_ARCHITECTURE_V1.md),
[Factory](../../business-models/factory/EFEONCE_FACTORY_BUSINESS_MODEL_V1.md),
[Product Design](../../architecture/EFEONCE_PRODUCT_DESIGN_360_DECISION_V1.md),
[Channel & Commerce](../../architecture/EFEONCE_CHANNEL_COMMERCE_LINE_DECISION_V1.md).

## 8. Estructura propuesta de la skill

Núcleo breve, referencias cargadas por modo. No crear carpetas o scripts sólo por completar una plantilla.

| Archivo/módulo propuesto | Función |
| --- | --- |
| `SKILL.md` | Triggers, entradas, selección de recorrido, flujo esencial, requisitos y salida; owner de prospección por cuenta |
| `references/motions-and-relationship.md` | Dimensiones de relación/demanda/proceso, frío/tibio/cálido, referido, reactivación, expansión e inbound/tender |
| `references/account-research-and-signals.md` | Entidad, ICP, trigger, vigencia, evidencia, hipótesis y prioridad; reutiliza radar actual |
| `references/buying-group-and-access.md` | Objetivo + 2–3 adyacentes, operator-first, vínculos, cobertura y rutas priorizadas |
| `references/contact-quality-and-enrichment.md` | Atribución/calidad, fuentes, créditos, estados parciales y paradas; enlaza contrato proveedor vigente |
| `references/message-and-contextual-proof.md` | Tesis de cuenta traducida por rol, CTA proporcional, voz y prueba útil con presupuesto de preventa |
| `references/crm-and-commercial-handoff.md` | Adapter a HubSpot y action pack a Commercial/seguimiento; no copia schema ni crea nuevo scheduler |
| `references/experiments-and-learning.md` | Métricas, clasificación de respuestas, hipótesis de cadencia, costo y aprendizaje; sin tasas universales |
| `references/sources.md` | Fuentes primarias, fecha/método, límites y condiciones de refresh |
| `templates/account-brief.md` y `templates/action-pack.md` | Dossier y entrega a siguiente owner, sin PII en ejemplos versionados |
| Evaluaciones por escenarios | Casos anonimizados y resultados esperados; formato concreto se decide al implementar |

| Skill colaboradora | Ownership que conserva |
| --- | --- |
| `commercial-expert` | Discovery, qualification, negociación, propuesta, pipeline y next step |
| `efeonce-customer-model-operator` | ICP/JTBD, roles, buying group y proceso comprador |
| `research-benchmark-operator` | Método de investigación, fuentes, confidence y triangulación |
| `efeonce-business-model-operator` + práctica | Oferta, elegibilidad, alcance, capacidad y límites de claims |
| `copywriting` | Craft, claridad, voz de Julio; no decide demanda ni autoridad |
| `hubspot-as-a-service` | Portal, dedupe, diccionario, propiedades, asociaciones, writes y readback |
| Skills SEO/AEO, creatividad, CRM, web, tenders | Oficio y pruebas pertinentes; no cargarlas todas por defecto |
| Seguimiento existente | Reconciliación de hilos, respuestas, tareas, borradores y cadencia ya autorizada |

La skill no es un proveedor, motor de envío, CRM nuevo o método universal de ventas. Sus etiquetas son
locales al dossier salvo que se apruebe un mapping concreto; no crear enums ni alterar lifecycle por un score.

## 9. Contrato de salida y evaluación propuesta

Entradas: cuenta/URL/señal o micro-ICP, mercado, necesidad/servicio, relación e historia conocida, alcance
autorizado y presupuesto de investigación cuando aplique. Búsqueda general cubre la matriz del radar existente;
un encargo focalizado no exige rastrear cuatro países y cuatro líneas innecesariamente.

Salida: entidad y fit con evidencia; demanda versus hipótesis; objetivo + 2–3 adyacentes con identidad/cargo,
correo y calidad; relaciones confirmadas/hipotéticas; ruta principal y alternativa; vigencia del proceso;
borrador y prueba sugerida; CRM existente/changeset/readback si autorizado; brechas; dueño, fecha y siguiente
decisión. Estado parcial explícito si sólo algunos contactos cumplen. Cobertura incompleta no equivale a cero
demanda ni autoriza gasto ilimitado. Una cuenta no se duplica por varios servicios o contactos.

Antes de aceptar la implementación, probar al menos estos escenarios sin operaciones externas:

1. Bivien: objetivo sin correo, señal explícita y adyacentes accionables; no crear contacto vacío ni atribuirles intención.
2. QuePlan: fría, Lead existente y posible agencia aliada; no confundir relación/cliente/competidor.
3. Banca: relación histórica, cambio de empleador o validación conflictiva; refrescar y bloquear canal ambiguo.
4. WIN: demanda explícita, autoridad/ICP desconocidos y Lead automático; no duplicar ni calificar por stage.
5. Pibank: conversación activa que cambió producto y propuesta; usar el mandato vigente y next step real.
6. Socopur: cierre vencido; recuperación no equivale a proceso abierto ni autorización de admisión.
7. Sika: HOLD y autoridad pendiente; respetar espera aun con Deal existente.
8. SKY: expansión con solicitud concreta; separar piloto, estimados, cotización, aprobación y aceptación.
9. No-fit por tamaño o señal de empleo/freelance; no convertirlo en compra de agencia.
10. Filial y headcount contradictorio; no atribuir nómina global a entidad local.
11. Respuesta, baja, negativa, OOO y rebote; pausa apropiada, sin rodear rechazo por colegas.
12. Capability ausente, relación hipotética, tool result vacío o fuente inaccesible; declarar límite sin inventar.

Una validación de proceso posterior puede empezar con un pequeño lote de dossiers; no prueba uplift estadístico.
Un piloto de comunicaciones requiere otra autorización concreta con cuentas, presupuesto, rails y acciones.
Si se busca causalidad, aleatorizar por cuenta y calcular muestra desde un baseline; no mezclar contactos de
una misma cuenta entre variantes independientes.

## 10. Calidad de fuentes y límites de transferencia

| Fuente | Fecha/metodología | Uso y límite |
| --- | --- | --- |
| [6sense 2025](https://6sense.com/science-of-b2b/buyer-experience-report-2025/) | Estudio principal casi 4.000; complemento 766; NA/Europa/APAC; mediana global de compra USD 200–300k | Compras y preferencias; sin muestra LATAM descrita, autorreporte y vendor; no extrapolar tasas a Efeonce |
| [Gartner 2025](https://www.gartner.com/en/newsroom/press-releases/2025-06-25-gartner-sales-survey-finds-61-percent-of-b2b-buyers-prefer-a-rep-free-buying-experience) | Publicado 25/06/2025; n=632, campo ago–sep 2024 | Relevancia y fit contextual; comunicado de consenso del mismo año usa la misma muestra |
| [Gartner 2026](https://www.gartner.com/en/newsroom/press-releases/2026-05-20-gartner-survey-finds-sixty-nine-percent-of-b-two-b-buyers-turn-to-sales-reps-to-validate-ai-generated-insights) | Publicado 20/05/2026; n=645, campo ago–sep 2025 | Validación humana/IA; muestra distinta, mismo proveedor; no demuestra conversión local |
| [McKinsey 2026](https://www.mckinsey.com/capabilities/growth-marketing-and-sales/our-insights/the-surprising-economics-of-B2B-growth-the-new-survival-threshold-and-what-it-takes-to-thrive) | 28/05/2026; casi 4.000, 13 países | Coherencia omnicanal; compra completa, no receta de cadencia ni obligación de ecommerce para agencia |
| [Gong CTA](https://www.gong.io/blog/this-surprising-cold-email-cta-will-help-you-book-a-lot-more-meetings) | Original 27/05/2020, actualización página 06/03/2026; 304.174 emails, reunión en 10 días | Observacional de usuarios; no RCT, subgrupos/controles insuficientes para tasas transferibles |
| [Edelman/LinkedIn PDF](https://www.edelman.com/sites/g/files/aatuss191/files/2025-07/2025%20Edelman-LinkedIn%20B2B%20Thought%20Leadership%20Impact%20Report_FINAL.pdf) | n=1.934; campo 17/03–03/04/2025; metodología PDF dice Estados Unidos | Decisores y contenido; priorizar método PDF sobre descripción comercial «global»; percepciones, no causalidad |
| [SPIN](https://www.huthwaiteinternational.com/spin-methodology) / [SPICED](https://winningbydesign.com/spiced-framework/) | Métodos originales vigentes consultados; no asignar año de encuesta nuevo | Lentes de discovery/handoff; no aceptar superlativos comerciales como prueba comparativa |
| Apollo, HubSpot, Gmail, Yahoo, Microsoft y Apple enlazados en §6 | Documentación primaria vigente consultada 11/10/2026 | Contratos del provider con alcance concreto; no certifican plan/configuración/permiso Efeonce |

No se adoptan headlines sin denominador, ratios inconsistentes ni blogs que repiten estadísticas. Los HTML
públicos de Yahoo y Microsoft fueron contrastados por el subagente técnico cuando el parser web devolvió
contenido incompleto. No se verificaron DNS, créditos, mappings, supresiones o settings live de Efeonce.
Confianza alta en existencia de contratos y hallazgos internos documentados; media en recomendaciones de
eficacia comercial; mejora local y cadencia óptima pendientes de experimentación.

## 11. Alcance para una eventual aprobación de creación

La aprobación habilitaría: núcleo versionado Codex/Claude, adaptación compatible de la skill personal al canon,
routing Commercial disponible, referencias y plantillas, evaluación de escenarios y documentación/validación
proporcional. Mantener historial y permisos existentes, añadir comprobación de mirrors del nuevo bundle y
documentar dependencia ausente con degradación explícita aprobada, sin fingir una harness instalada.

No incluye activar secuencias, cambiar scheduler, comprar herramientas, gastar créditos, alterar provider
config/CRM, producir demos extensas o enviar mensajes. El informe y esta estructura quedan revisables antes
de esa aprobación; no se creó ningún archivo de la nueva skill.

## 12. Aprobación posterior e implementación

El 11/10/2026 el operador respondió «Vamos» y pidió apoyo de `@Sales`. Se aprobó la creación con el alcance
de §11; este informe conserva los hallazgos y límites de la investigación previa. Método, routing, adapter
compatible y evaluación quedan documentados en la [decisión aceptada](../../architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md)
y la [auditoría de implementación](2026-10-11-prospecting-skill-implementation.md). La aprobación no activa
acciones de CRM, créditos, mensajes o nuevas automatizaciones.

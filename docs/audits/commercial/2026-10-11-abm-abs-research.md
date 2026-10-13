# ABM y Account-based Selling — investigación y aplicación propuesta a Efeonce

Fecha de consulta: **2026-10-11**. Owner de la investigación: Commercial / Research.
Estado: **Research completed · recommendations proposed · no implementation or pilot approval**.
Pedido: investigar ABM y ABS a profundidad después de actualizar el método de buying groups.

## Conclusión y confianza

ABM aporta la selección e inversión coordinada de marketing en cuentas; ABS conduce la relación y la decisión
comercial de esas cuentas. Conviene operarlos con una tesis compartida, un responsable y mapas compradores
por iniciativa. La selección se hace por cuenta; el avance se entiende por problema, oportunidad y grupo comprador.
Esta síntesis tiene **confianza alta como diseño de método**, por convergencia de ITSMA, Salesforce, Forrester
y el trabajo académico reciente. No demuestra superioridad económica para Efeonce. [S01][s01], [S04][s04],
[S06][s06], [S07][s07].

La recomendación es adaptar el método a expansión y captación selectiva, con esfuerzo proporcional y evidencia
del cliente. La confianza es **media en el encaje con Efeonce**, sustentada en documentación actual;
**baja en cualquier mejora cuantitativa transferible** sin piloto local. No hay base para adoptar cuotas universales
de cuentas, integrantes, impactos, canales o ROI. La investigación habilita decidir un diseño, no aprobar gasto,
campañas, CRM, una nueva oferta o automatizaciones.

## Pregunta, alcance y método

Pregunta: ¿cómo funcionan ABM y ABS, cuándo justifican su costo, qué evidencia los respalda y cómo podrían
integrarse al modelo comercial Efeonce sin duplicar sus owners?

Se investigaron fundamentos, clasificaciones actuales, buying groups, selección e intensidad, coordinación,
contenidos, venta y consenso, señales/IA, medición/economía, tecnología y encaje interno/como servicio.
Investigación secundaria y exploratoria: fuentes primarias públicas, papers/abstracts, estudios originales,
documentación oficial y canon del repo. Tres subagentes revisaron ABM, ABS y el modelo Efeonce; el principal
contrastó claims y abrió las fuentes utilizadas. No se hicieron entrevistas, auditoría live de CRM ni pruebas comerciales.

La harness `deep-research` no estuvo disponible. Se aplicó búsqueda/lectura directa conforme al modo degradado del
[ADR de prospección](../../architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md), con metodología de
`research-benchmark-operator`. No se afirma ejecución de esa harness. Las fuentes cerradas se usaron sólo hasta
su resumen público; las fechas editoriales y de muestra se distinguen de la consulta.

Los benchmarks se contrastan por diseño y población, sin promediar porcentajes incompatibles. Los proveedores
tienen interés comercial; muestras grandes no eliminan selección, causalidad inversa o medición incompleta.
Las recomendaciones y el ejemplo de piloto son síntesis propuestas, no resultados observados.

## 1. Qué son y cómo se relacionan

ITSMA sitúa el origen de la denominación ABM en 2003. Su doctrina combina insight, colaboración con ventas y
programas para cuentas nombradas, con reputación, relaciones e ingresos como resultados. Publicidad y software
son instrumentos posibles del programa. [S02][s02].

| Disciplina | Trabajo central | Entrega práctica |
| --- | --- | --- |
| ABM | Seleccionar cuentas y coordinar inversión, contenido y experiencias de marketing relevantes | Plan de marketing conectado al plan de cuenta y a sus iniciativas |
| ABS | Investigar, abrir relaciones y conducir una venta coordinada con varios participantes | Discovery, criterios, business case, proceso comprador y compromisos verificables |
| Outbound | Iniciar conversaciones proactivas | Una vía de acceso dentro o fuera de una estrategia ABM/ABS |
| KAM / SAM | Desarrollar y proteger relaciones estratégicas | Planificación continua de valor, retención y expansión |
| ABX / ABE | Etiquetas para extender la coordinación a experiencia y otras funciones | Continuidad entre marketing, ventas, servicio y operación |

La frontera es funcional y tiene solapamientos. ABS también adquiere cuentas nuevas; ABM también puede apoyar
negociación y expansión. ABX, en la formulación de Demandbase, pone énfasis en relevancia y momento durante
el ciclo del cliente. Es una doctrina de proveedor, no prueba de que ABM haya quedado obsoleto. [S04][s04],
[S06][s06], [S16][s16].

Una cuenta no es una sola compra. Puede contener renovación, CRM y producción creativa con presupuestos y
grupos distintos. Una misma persona puede participar con roles diferentes. El dossier puede mapear una iniciativa
antes de que cumpla el criterio de Deal; no se crean oportunidades CRM sólo para representar hipótesis. [S07][s07]
y [método aceptado](../../architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md).

## 2. Clasificación: profundidad y propósito

El marco clásico de ITSMA sigue siendo útil para dimensionar intensidad. [S01][s01].

| Forma | Unidad de trabajo | Personalización y coordinación |
| --- | --- | --- |
| 1:1 / Strategic | Una cuenta estratégica | Insight, tesis y plan propios con su equipo comercial |
| 1:few / Lite | Cluster con problemas o circunstancias compartidos | Núcleo reusable y adaptación por cuenta/rol |
| 1:many / Programmatic | Conjunto mayor de cuentas nombradas | Tecnología para adaptar y coordinar; medición por cuenta |

Son modalidades, no un número universal de empresas. Una agencia pequeña puede dedicar trabajo 1:1 a dos
cuentas y una empresa global a decenas; manda la capacidad y la economía. 1:many puede ser ABM cuando conserva
selección, insight, adaptación y coordinación; poner nombres en una secuencia masiva no lo garantiza.

La formación actual de Bev Burgess incluye cinco tipos. La siguiente traducción describe cómo podríamos usarlos;
no afirma haber leído el curso o el libro completos. [S03][s03].

| Propósito | Aplicación propuesta |
| --- | --- |
| Strategic | Desarrollo continuo de una cuenta prioritaria |
| Scenario | Intervención acotada en una cuenta para un resultado concreto; el play puede repetirse en otras |
| Segment | Programa para un segmento con problemas y economía semejantes |
| Programmatic | Adaptación y coordinación escalables mediante datos y herramientas |
| Pursuit | Apoyo concentrado a una oportunidad o proceso de compra concreto |

El benchmark Inflexion 2026 encuentra modelos combinados, pero estudia principalmente grandes empresas.
No demuestra que toda la industria haya adoptado una clasificación única. [S05][s05]. Intensidad, propósito,
encaje ICP y tipo de relación son dimensiones distintas: `active/project/self_serve` no son tiers ABM.

## 3. Selección e inversión: por qué esta cuenta y cuánto dedicarle

Propuesta de decisión en dos pasos:

1. **Admisión:** entidad compradora correcta, ICP de la oferta, capacidad de entregar valor y restricciones.
2. **Priorización:** problema/hipótesis, oportunidad temporal, acceso, alternativas, valor esperado, margen,
   riesgo y capacidad para desarrollar esa cuenta.

Una señal no compensa mal encaje. Una cuenta muy grande tampoco demuestra presupuesto, timing o margen.
Separar fit, situación e interés permite evitar un score único que confunda esos hechos. Forrester propone auditar
señales a nivel de mercado, cuenta, grupo y persona, con fuente/ámbito separados. Sólo se leyó el resumen público
de su herramienta. [S08][s08].

Registro de selección propuesto: por qué la cuenta, por qué esta iniciativa, por qué ahora —o por qué esperar—,
qué podemos resolver, evidencia disponible, incertidumbre, responsable, esfuerzo máximo y condición de pausa.
Los pesos de un score se validan con decisiones y resultados; no se inventa precisión con porcentajes arbitrarios.

El tier de inversión debe decidir qué cambia: investigación, activos, acceso ejecutivo, especialistas y revisión.
Revisarlo cuando cambia una señal, la relación, el alcance o la capacidad. Una lista seleccionada puede tener
cuentas aún sin demanda; no todas necesitan acción intensiva simultánea.

## 4. Buying groups, multithreading y consenso

ABS necesita relaciones que resuelvan dependencias de la compra. La taxonomía vigente de Customer Model
distingue operador, dueño del problema, sponsor, comprador económico, governance y demás funciones del caso.
Una persona puede cubrir varias; conocer su cargo, correo y autoridad son verificaciones diferentes.

El método aceptado conserva objetivo + 2–3 adicionales como búsqueda inicial y amplía por brechas. ABM/ABS
agrega una pregunta: ¿qué decisión o riesgo debe resolver cada incorporación y cómo coordinamos esa relación?
El mapa separa identificado, rol supuesto/confirmado, email, acceso, interacción y compromiso. Una presentación
de un partner no vuelve automáticamente comprador al partner ni warm al destinatario.

Gong observa asociación entre más contactos compradores y operaciones ganadas en su dataset; no identifica
un tamaño obligatorio ni demuestra que agregar contactos produzca el resultado. Una operación que ya avanza
puede incorporar más personas. [S09][s09].

El consenso merece trabajo propio. Gartner encuentra conflicto y una asociación entre consenso y calidad de
compra autoinformada. Su medida no es tasa de cierre. También advierte que contenido centrado sólo en prioridades
individuales puede reforzar desacuerdos. [S10][s10].

Propuesta operativa: adaptar evidencia al rol manteniendo problema, resultado, alcance y criterios compartidos.
Registrar objeciones y trade-offs; no exigir unanimidad ni fabricar consenso. Legal, IT y Compras evalúan requisitos;
su cargo no los vuelve blockers. Un champion requiere movilización observada e influencia y credibilidad
verificadas en esa iniciativa; una respuesta amable o una acción aislada no bastan.
La primera conversación útil puede avanzar con cobertura parcial; aprobación y contratación requieren resolver
sus dependencias. Respetar procesos de licitación, HOLD, negativas y owner de cuenta.

## 5. Cómo se coordinan marketing y ventas

Propuesta de ciclo, adaptable a la fase real:

| Momento | Trabajo de marketing / ABM | Trabajo comercial / ABS | Evidencia para avanzar |
| --- | --- | --- | --- |
| Selección | Contexto y problemas compartidos del segmento | Admisión, acceso y capacidad | Tesis defendible y owner |
| Educación | Punto de vista, investigación, prueba de capacidad | Apertura pertinente y escucha | Problema expresado o hipótesis refutada |
| Discovery | Material útil para profundizar | Prioridad, situación, actores y proceso | Datos/criterios/siguiente paso del comprador |
| Evaluación | Prueba y materiales comparables para el grupo | Alternativas, riesgos y validación de viabilidad | Criterios compartidos y responsables |
| Propuesta | Resumen defendible y evidencia específica | Alcance, economía y decisión | Business case y dependencias claras |
| Contratación | Continuidad de la historia y claridad de implementación | Procurement, firma y compromisos | Aprobaciones y contrato efectivo |
| Adopción/expansión | Educación y prueba del valor entregado | Salud, renewal y nuevas iniciativas | Uso/outcomes y nueva decisión de compra |

No es un relevo irreversible de MQL a ventas: ambos pueden seguir apoyando al grupo. Una persona que vuelve a
consumir contenido no invalida una oportunidad ni prueba que toda la cuenta retrocedió. El estudio académico
de 2026 conceptualiza ABM a través de etapas comerciales; sólo se consultaron abstract y resumen del autor,
sin afirmar lectura del texto completo. [S04][s04].

La gobernanza mínima propuesta es una revisión de cuentas con owner, hipótesis vigente, acciones realizadas,
evidencia nueva, brecha crítica, siguiente decisión y costo. Evitar equipos paralelos contactando a los mismos
actores. Team selling incorpora especialistas cuando resuelven preguntas reales; no por una cuota de vendedores.

## 6. Contenido, pruebas y buyer enablement

La personalización útil cambia la explicación, la prueba o la decisión que ayudamos a resolver. Puede ser
un diagnóstico, una comparación de opciones, un caso comparable, un ejemplo de workflow o un workshop.
No toda cuenta justifica una landing exclusiva ni producción de preventa extensa.

Edelman–LinkedIn estudia compradores influyentes que no suelen estar en conversaciones comerciales visibles.
La fuente es una encuesta de percepciones, no un experimento de contenido y cierres. Justifica explorar materiales
que el interlocutor pueda compartir internamente, sin suponer que consumirlos confirma autoridad o apoyo. [S11][s11].

Ejemplo **hipotético** para RevOps & CRM:

| Función | Pregunta de decisión | Prueba propuesta |
| --- | --- | --- |
| Operador | ¿Qué trabajo manual o pérdida de contexto resuelve? | Workflow y antes/después acotado |
| Dueño del problema | ¿Mejora confiabilidad y uso del sistema? | Diagnóstico y plan de adopción |
| Sponsor | ¿Se conecta con nuestra prioridad de negocio? | Caso de uso y resultados medibles |
| Economic buyer | ¿Qué costo total y riesgo implica? | Supuestos, opciones y economía validable |
| Governance / IT | ¿Qué datos, acceso e integración requiere? | Arquitectura/controles pertinentes al alcance |
| Procurement | ¿Qué debe contratarse y aprobarse? | SOW, dependencias y proceso documentado |

La historia común sería resolver un workflow y demostrar valor; no seis promesas independientes. Los roles y
materiales se aplican sólo cuando son relevantes. Datos reales del cliente requieren su autorización.

Un business case propone situación inicial, alternativas —incluida no actuar—, alcance, costo total, resultados,
riesgos y supuestos trazables. MEDDPICC ayuda a preguntar por métricas, autoridad, criterios, decisión y firma;
rellenar su ficha no confirma esos hechos. [S12][s12].

Un MAP es un plan de acción **acordado por comprador y vendedor**, con hitos, responsables, evidencia y fechas.
Si sólo lo escribe el vendedor, sigue siendo un plan interno. Se usa cuando existe voluntad compartida de avanzar,
no como requisito para una apertura fría. Outreach publica una asociación favorable con win rate, con limitaciones
metodológicas; no se adopta como predicción. [S13][s13].

## 7. Frío, tibio, cálido y expansión

ABM/ABS define organización del esfuerzo; frío/tibio/cálido define relación y contexto. Se cruzan sin sustituirse.

| Situación | Aplicación propuesta | Cuidado |
| --- | --- | --- |
| Fría, sin demanda confirmada | Educación relevante, hipótesis y acceso proporcional | No declarar buying intent por encaje o anuncios |
| Fría con necesidad pública | Contexto explícito y prueba pertinente | La necesidad pertenece al autor; colegas no la heredan |
| Tibia / referido | Introducción con contexto y permiso aplicable | Verificar relación y alcance de la presentación |
| Cálida / evaluación | Prueba específica, business case y coordinación | Interés no equivale a presupuesto ni aprobación |
| Cliente / expansión | Valor entregado, nueva necesidad y mapa de decisión | Sponsor de un servicio no se hereda a otro |
| Reactivación | Revisar historia, causa de pausa y nueva situación | Evitar repetir mensajes o rodear negativas |

Una cuenta puede tener stakeholders fríos y cálidos al mismo tiempo. Marketing puede generar familiaridad sin
que exista una relación personal. El timing importa, pero esperar sólo señales tardías también puede dejar fuera
de las preferencias iniciales del comprador. La investigación 6sense y la doctrina de disponibilidad mental de
LinkedIn apoyan estudiar ambos horizontes, con poblaciones y métodos diferentes. [S14][s14], [S15][s15].

## 8. Qué hay de moderno: señales, IA y conocimiento previo

Separar señales de encaje, contexto, interés, necesidad declarada y progreso comprador. Una visita web, IP,
descarga o intent score no identifica necesariamente la persona ni el proyecto. Combinar fuentes y fecha;
validar atribución a matriz/filial/unidad. El sentido de la señal cambia con el caso y se degrada con el tiempo.

Aplicación de IA propuesta: reducir trabajo de búsqueda y resumen, detectar contradicciones, actualizar mapas,
reutilizar proof y preparar alternativas de mensaje. Conservar procedencia y unknowns; la IA no confirma emails,
champions, necesidades, autorizaciones o ROI por generar una respuesta plausible.

En 6sense 2025, la preferencia anterior al contacto se asocia con la elección final. Su muestra concentra compras
grandes y no representa directamente servicios pequeños LATAM. El aprendizaje transferible es trabajar
reputación y evidencia antes y durante una compra; no declarar perdido un negocio porque no nos conocían.
[S14][s14]. La regla 95–5 de LinkedIn es una heurística sobre frecuencia de compra y disponibilidad mental,
no un porcentaje constante que podamos asignar a todas las ofertas Efeonce. [S15][s15].

Un paper de LinkedIn demuestra cómo probar una herramienta de priorización de cuentas mediante aleatorización.
Su efecto se limita a su contexto de renewal y a usuarios de la herramienta, no ABM completo ni prospección fría.
Es útil como precedente de evaluación, no benchmark de conversión nuestro. [S21][s21].

## 9. Medición y economía

Propuesta de panel analítico; las métricas canónicas de producción conservan sus owners y fórmulas.

| Capa | Medidas útiles | Lo que no prueban |
| --- | --- | --- |
| Reputación | Conocimiento/confianza medidos, descubrimiento y validación de prueba | Una impresión no prueba recuerdo ni compra |
| Relaciones | Funciones pertinentes, acceso y participación observada | Emails obtenidos no prueban apoyo |
| Progreso | Conversaciones pertinentes, reuniones realizadas, criterios e hitos acordados | Actividad unilateral no es avance comprador |
| Oportunidades | Creación/calificación, decisión, no decisión y tiempo por cohorte | Pipeline influenciado no es ingreso generado |
| Resultado | Contratos, bookings, revenue y margen; retention/expansion | No sumar Spot, MRR y ARR como magnitudes iguales |
| Costo | Horas, costo sombra, contenido, herramientas, créditos y terceros | Software disponible no significa esfuerzo gratis |

Contar desde las cuentas seleccionadas, incluyendo descartes y pausas. Definir cohorte, unidad, ventana y
denominador: win rate sobre oportunidades cerradas no equivale a conversión de cuentas seleccionadas. Separar
cold, warm, partners y expansión; los resultados de estos grupos no son comparables sin controlar su composición.
Reportar volumen absoluto junto con tasas para que un lote pequeño no oculte volatilidad.

Source original y contribuciones asistidas deben evitar doble conteo de una misma oportunidad. Atribución
distribuye crédito; incrementalidad estima qué ocurrió gracias a la intervención. Google distingue ambas en su
documentación de lift. No asegura que un programa ABM pequeño cumpla los requisitos de sus experimentos. [S22][s22].

Modelo económico **analítico propuesto**, no implementación de Finance:

- Costo económico = horas por función × tasa cargada validada + consumo/asignación de herramientas
  existentes o nuevas + contenido/terceros, evitando doble conteo.
- Caja incremental = compras, trabajo pagado adicional, uso adicional y terceros que genere el programa.
  Las personas y herramientas ya contratadas consumen capacidad aunque no agreguen salida de caja inmediata.
- Evaluar beneficio esperado en contribución del trabajo propio y horizonte explícito; no usar ingreso bruto
  refacturado como si fuera margen.
- Para comparar intensidad alta contra una alternativa, usar escenarios de diferencia de probabilidad/valor
  y diferencia de costo. Si esas probabilidades no están estimadas, mostrar sensibilidad, no un ROI observado.
- Un piloto barato de adquisición puede desplazar delivery o expansión más rentable; incluir esa restricción.

No existe en las fuentes revisadas un ticket mínimo universal para ABS. El ejemplo de USD 200.000 de Salesforce
es didáctico. Los tiers genéricos por ACV SaaS no sustituyen margen, complejidad y costo de venta de Efeonce.
[S06][s06].

## 10. Evidencia cuantitativa: qué aceptamos y qué limitamos

| Investigación | Base y hallazgo verificable | Interpretación permitida |
| --- | --- | --- |
| Inflexion 2026 | 16 entrevistas y encuesta de 40 empresas; predominan programas enterprise | Patrones de coordinación y expansión en ese peer set; no prevalencia universal [S05][s05] |
| Gong, datos 2024 | 1,8M oportunidades new-business cerradas; ganadas con aproximadamente el doble de contactos | Asociación; no cuota de contactos ni causalidad [S09][s09] |
| Gartner 2025 | 632 compradores, campo ago–sep 2024; consenso asociado a 2,5× probabilidad de reportar compra de alta calidad | Calidad autoinformada; no 2,5× tasa de cierre [S10][s10] |
| Outreach | Asociación favorable publicada para MAP, sin muestra/controles públicos suficientes | Se excluye su magnitud porcentual del benchmark; no pronóstico transferible [S13][s13] |
| 6sense buyer 2025 | Cerca de 4.000 respuestas principales y 766 en encuesta compañera; mediana USD 200–300K, mínimo USD 25K | Preferencias y comportamiento declarados; límites de tamaño/geografía [S14][s14] |
| Demandbase Labs 2026 | 1.452 tenants de plataforma y grandes volúmenes de actividad | Tenant no necesariamente empresa única; correlación sin controles públicos suficientes [S17][s17] |
| 6sense metrics 2025 | 634 respuestas humanas + 100 sintéticas | Separar simulación de observación; no 734 encuestados humanos [S18][s18] |
| Momentum 2024 | Base total 308; leaders clasificados por ROI declarado | No atribuir efecto causal a prácticas de quienes ya declaran mejor resultado [S19][s19] |
| Forrester TEI / Demandbase | Cuatro entrevistados, empresa compuesta y ROI modelado 367% | Estudio encargado; el propio autor exige estimaciones locales [S20][s20] |
| LinkedIn Account Prioritizer | Aproximadamente 4.500 cuentas por brazo, seis meses; +8,08% en Average RIG entre usuarios | Experimento de priorización en renewal, con adopción condicionada; no uplift universal ABM [S21][s21] |

No mezclar el estudio de madurez ABM de “casi 200” practicantes citado por 6sense con la base de su estudio
de métricas. Tampoco sumar submuestras diferentes. Los gigantescos volúmenes observacionales pueden incluir
múltiples actividades por cuenta; no son observaciones independientes automáticamente.

El trabajo académico IMM consultado es conceptual/cualitativo y reconoce una base de investigación aún en
desarrollo. Su texto completo no estuvo accesible: no se reconstruye su framework desde snippets. [S04][s04].
Conclusión de evidencia: disciplina coherente y asociaciones favorables; magnitud económica local pendiente.

## 11. Tecnología y HubSpot: capacidades documentadas, disponibilidad local pendiente

HubSpot documenta `Target account`, `Ideal customer profile tier`, roles compradores, vista de cuenta,
segmentos y reportes, con disponibilidad por suscripción/seat. Esta lectura no verifica licencia, configuración
o permisos efectivos en el portal Efeonce. [S23][s23].

Precauciones de diseño propuestas:

1. Company representa la entidad; iniciativa/oportunidad conserva su contexto. No duplicar empresa por servicio.
2. El tier ICP documentado expresa encaje; no sobrescribirlo con prioridad de inversión ABM sin un contrato claro.
3. Un rol guardado en Contact no resuelve por sí solo roles distintos de esa persona en varios procesos. Preservar
   alcance por oportunidad en el dossier/asociaciones disponibles, sin inventar propiedades ni implementar schema.
4. Target account expresa selección; no prueba demanda, consentimiento, pipeline o calificación.
5. Aplicar dedupe, owner, suppression, asociaciones y readback del canon CRM; no activar workflows por investigar.

Para paid ABM hay una limitación concreta: la documentación LinkedIn consultada pide al menos 300 filas para
subir una lista de empresas y al menos 300 miembros coincidentes para usarla en un ad set. Son requisitos
distintos. No agregar cuentas irrelevantes para alcanzar el mínimo. Un piloto pequeño puede usar otras rutas
válidas de contenido, relación o targeting; cada mecánica se verifica antes de ejecutarla. [S24][s24].

La secuencia razonable de evaluación tecnológica sería procesos/datos → CRM disponible → pruebas de canales
→ herramientas adicionales cuando resuelvan un cuello medido. No se compararon precios ni se recomienda
comprar una plataforma en este research.

## 12. Encaje con Efeonce y ownership

La documentación ya incluye ABM Lite en [GTM](../../context/02_gtm.md), motion account-based en Commercial,
y entradas por problema en el [plan outbound](../../commercial/PIPELINE_GENERATION_AND_OUTBOUND_PLAN_2027_V1.md).
Su presencia documental no acredita programa ejecutado. Este último sigue **Proposed for validation · pilot not started**.

Aplicación propuesta:

- **Cuentas activas:** plan estratégico, evidencia de delivery, nuevas necesidades y nuevos grupos de decisión.
  Proteger salud y renovación mientras se evalúa expansión.
- **New business:** un micro-ICP y una oferta de entrada por tesis, con proof reusable y acceso coordinado.
- **Factory / proyectos:** intensidad proporcional a margen y esfuerzo; no asumir conversión a retainer.
- **Self-serve:** economía y adopción digital; intervención comercial sólo cuando emerge un caso que lo justifique.

El contrato [operator-first](../../strategy/EFEONCE_OPERATOR_FIRST_PRODUCT_AND_GROWTH_CONTRACT_V1.md) orienta
la entrada por workflow y la transferencia de evidencia al sponsor/economic buyer. Su status continúa propuesto
y en validación; no demuestra PMF ni que el operador controle presupuesto. El modelo de [Product Service](../../business-models/EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md)
exige método, alcance, telemetría y economía; llamar ABM a un programa no satisface esas condiciones.

| Owner existente | Responsabilidad propuesta en el programa |
| --- | --- |
| Strategy / GTM | Segmento, selección, posicionamiento e intensidad |
| Customer Model | ICP/JTBD, funciones y proceso comprador |
| Prospección B2B | Evidencia, señales, calidad del contacto y rutas |
| Digital Marketing + Content/Copywriting | ABM, activos y coordinación de canales |
| Commercial | ABS, discovery, calificación, consenso, business case y next step |
| RevOps / HubSpot | Datos, routing, dedupe, asociaciones y verificación |
| Práctica / Operations / Customer Success | Proof viable, capacidad, adopción y expansión |
| Finance / Pricing | Costo de venta, contribución, margen, caja y capacidad |

No se propone un owner paralelo. Conservar la oferta de la práctica y la voz de Efeonce, con una idea útil,
evidencia y transparencia comercial. La narrativa «Tu IA no conoce tu negocio» podría adaptarse al problema real;
no justifica presentar todo el portfolio a cada cuenta.

## 13. Método interno frente a servicio cliente

Efeonce vende B2B a una aerolínea o un retailer aunque ese cliente venda a consumidores. ABM/ABS interno
puede seleccionar esa organización y su equipo comprador del servicio. Eso no convierte el marketing al
consumidor de la aerolínea o retailer en ABM.

Para vender ABM como servicio al cliente debe existir un mercado de cuentas organizacionales, o una lane B2B
concreta, y un equipo comercial capaz de atender el progreso generado. La documentación de
[Media & Distribution](../../business-models/media-distribution/MEDIA_DISTRIBUTION_BUSINESS_MODEL_V1.md)
separa B2C/B2B2C y B2B Pipeline; su existencia no acredita una oferta nueva aprobada aquí. El modelo
[Programmatic](../../business-models/media-distribution/PROGRAMMATIC_MEDIA_OPERATIONS_BUSINESS_MODEL_V1.md)
exige validación selectiva y no promete ABM exacto.

Una oferta candidata requeriría customer model propio, scope de estrategia/ejecución, responsabilidades del
cliente, datos separados, targeting comprobado, costo de canales/herramientas, capacidad, medición y pricing.
ABS del cliente incluye decisiones y relaciones que no se pueden garantizar desde una agencia. La aprobación
de un método interno no aprueba vender ese servicio ni prometer pipeline o cierres.

## 14. Piloto de aprendizaje propuesto

Como escenario concreto para discutir capacidad: **12 cuentas de un micro-ICP, seis semanas, tres olas de cuatro**,
con máximo cuatro en trabajo intensivo simultáneo. Elegir una oferta de entrada y registrar cold, warm o partner
por separado; no tratarlos como brazos equivalentes. La expansión tendría su propia cohorte/plan.
Son parámetros de diseño propuestos, no quotas ni un piloto aprobado.
Las olas no fuerzan retirar una cuenta a las dos semanas: si requiere más trabajo, se posterga la siguiente ola
para preservar el límite de cuatro simultáneas.

| Reserva humana ilustrativa | Horas propuestas en seis semanas |
| --- | ---: |
| Commercial/fundador, 4 h/semana | 24 |
| RevOps, 2 h/semana | 12 |
| Content/proof, 2 h/semana | 12 |
| Práctica, 0,5 h/semana | 3 |
| Finance, setup/cierre | 3 |
| Total | 54 |

Confirmar owner y capacidad liberada dentro del trabajo vigente: no se presume disponibilidad. Las cuatro horas
de Commercial son una porción del esfuerzo comercial total, no sustituyen la venta humana del operating model.
Las doce horas RevOps incluyen revisión humana de investigación, preparación de acceso y QA; medir si bastan,
sin tratar ese trabajo como gratuito por estar asistido por agentes.
Costo económico = 24×tasa Commercial + 12×RevOps + 12×Content + 3×práctica + 3×Finance + asignación/consumo
de herramientas + terceros. Caja incremental se registra aparte. Rates cargados, asignaciones y tope monetario
siguen por validar. No se aprueba crédito, producción, outreach ni pauta.

Secuencia propuesta: baseline y selección → investigación y proof → conversaciones autorizadas → validación de
necesidad/proceso → cierre de aprendizaje. Registrar owner/tesis, fuentes, cobertura por fase, brechas, horas,
reuniones realizadas y próximos pasos bilaterales. No exigir comité completo al inicio.

Stop/revisión: no hay problema pertinente, mal fit, restricciones del comprador, señales contradichas, incapacidad
de atender, costo excedido, colisiones de contacto o calidad de datos insuficiente. Un lote puede terminar sin
reuniones y aun así revelar un fallo del segmento, prueba o acceso; no se declara exitoso por completar actividad.

Seis semanas permiten evaluar proceso, costo y primeras señales, no garantizar cierre ni ROI. Seguir las cuentas
durante su ciclo real, con owner y reserva de horas posteriores confirmados antes de lanzar. Las 54 horas sólo
cubren la ventana ilustrada; el esfuerzo posterior se mide por separado y entra en el costo de venta completo.
Para estimar uplift después: baseline suficiente, grupos comparables, asignación por cuenta
o unidad adecuada al riesgo de contaminación, ventana predefinida y tamaño/potencia calculados. Separar resultado
experimental de aprendizaje cualitativo; no presentar este lote pequeño como experimento concluyente.

## 15. Gaps de documentación detectados; correcciones propuestas

No se modificaron skills o contratos en este encargo de investigación. La siguiente actualización podría:

- Sustituir cuotas genéricas de cuentas/contacts/channels por decisiones de inversión y cobertura.
- Revisar `digital-marketing/modules/07_INTEGRATED_CAMPAIGNS.md`: rangos de cuentas y cifras +3,4×/−32 días,
  y la simplificación de comité, carecen aquí de sustento transferible. No usarlas como promesas.
- Matizar el anti-pattern global de Commercial «Mass ABM no existe»: 1:many sí está documentado; el problema
  es perder selección/relevancia/coordinación, no sólo el tamaño.
- Resolver el enlace global a `motions/abm-abs-abe.md`, ausente en el bundle instalado consultado.
- Separar tier de encaje ICP de tier de inversión; mantener roles por oportunidad y definir MQA sólo si hace falta,
  sin sustituir lifecycle o la calificación comercial existente.
- Actualizar el carril Apollo de `AGENTIC_REVENUE_OPERATING_MODEL_V1.md` que aún dice 2–3 integrantes frente
  a objetivo + 2–3 adicionales iniciales aceptado el 11/10.
- Conservar explícita la discrepancia entre gate económico referido y plan outbound propuesto, así como capacidad
  comercial por validar. No resolverla inventando pricing ni aprobar el presupuesto 2027 indirectamente.

El piso corporativo de 50 personas para clientes nuevos de servicios Efeonce se lee por entidad y oferta en el
contexto vigente; no se extrapola automáticamente a self-serve ni al ICP del cliente para su propio ABM. Un
headcount global no autoriza una filial. Esta investigación no cambia ICP ni habilita excepciones. Los contactos nuevos siguen sujetos
a correo corporativo individual verificado: stakeholders sin email permanecen en investigación/nota autorizada.

Owners del siguiente paso: Commercial/GTM para decidir alcance; Customer Model/Research para validación;
Digital Marketing para el módulo ABM, Prospección para research/acceso y Commercial para ABS. Una evolución
de workflows compartidos deberá actualizar su decisión, espejos y evaluaciones; no crear una skill monolítica
que duplique fases y autoridad de esas prácticas.

## Registro de fuentes y límites de lectura

Todas consultadas el 2026-10-11. Las confianzas de esta tabla evalúan el uso permitido, no la eficacia universal.
Las recomendaciones integran fuentes independientes; cifras de un estudio conservan su procedencia única.

| ID | Fuente / fecha | Uso y límite |
| --- | --- | --- |
| S01 | [ITSMA/ABMLA, 2017][s01] | Documento original publicado por ITSMA; 159 personas, 134 empresas; bases por pregunta. Marco clásico, no rendimiento actual |
| S02 | [Momentum ITSMA, diciembre 2022][s02] | Documento original; historia/doctrina y obstáculos. Autoinforme/comunidad; no causalidad |
| S03 | [Inflexion Academy, página vigente][s03] | Cinco tipos de su formación. Página leída, curso/libro completos no leídos; no consenso universal |
| S04 | [IMM/IRIS, 2026][s04] y [resumen del autor][s04b] | Abstract institucional y autor abiertos; más de veinte empresas según autor. Cualitativo; full text no accesible |
| S05 | [Inflexion, 19-05-2026][s05] | Campo feb–abr; 16 entrevistas + encuesta 40 empresas. 80% >5.000 empleados; sesgo enterprise/comunidad |
| S06 | [Salesforce Trailhead, s.f.][s06] | Define ABS y esfuerzo; ejemplo de ticket no es umbral universal. Formación del proveedor |
| S07 | [Forrester, 31-08-2023][s07] | Cuenta, roles, grupos y oportunidades. Marco conceptual público |
| S08 | [Forrester, 09-07-2025][s08] | Resumen público de auditoría de señales. Herramienta íntegra no leída |
| S09 | [Gong, 28-04-2025; actualizado 27-05-2026][s09] | Datos new-business 2024; observacional de clientes, sin controles públicos suficientes |
| S10 | [Gartner, 07-05-2025][s10] | Encuesta 632 compradores ago–sep 2024; calidad autoinformada. Comunicado, estudio íntegro no leído |
| S11 | [Edelman–LinkedIn, 2025][s11] | PDF completo abierto; 1.934 ejecutivos, campo 17mar–3abr, mercado EE.UU. según metodología; percepciones, no experimento |
| S12 | [MEDDICC, s.f.][s12] | Método de calificación; doctrina del proveedor, no prueba de rendimiento |
| S13 | [Outreach, 02-09-2025; actualizado 21-07-2026][s13] | MAP y asociación de win rate; muestra/controles no expuestos en artículo |
| S14 | [6sense Buyer Experience, 2025][s14] | Reporte y métodos abiertos; NA/EMEA/APAC, tech/servicios dominantes, compras grandes. No muestra LATAM representativa |
| S15 | [LinkedIn, 18-05-2022][s15] | Disponibilidad mental y heurística 95–5. No tasa constante local |
| S16 | [Demandbase ABX, 26-01-2026][s16] | Define su enfoque de experiencia. Sesgo de categoría; sus cifras secundarias no se adoptan |
| S17 | [Demandbase Labs, edición 2026][s17] | 1.452 instancias; observacional. No cuotas óptimas ni efectos causales |
| S18 | [6sense Metrics, 16-06-2025][s18] | 634 humanos +100 sintéticos; distinto del estudio de casi200. Diagnóstico metodológico, prevalencia incierta |
| S19 | [Momentum benchmark, 2024][s19] | Slides originales publicados por Demandbase; total308, bases variables y ROI declarado |
| S20 | [Forrester TEI encargado por Demandbase, 2022][s20] | Cuatro entrevistados y organización compuesta; documento alojado en ruta2024 no cambia fecha del estudio. ROI modelado |
| S21 | [Jena/Yang/Tan, 12-06-2023][s21] | Preprint completo abierto; A/B de priorización renewal y adopción condicionada. No prueba general de ABM |
| S22 | [Google Ads Help, vigente][s22] | Diferencia lift/atribución; documentación de producto, no validación de un piloto Efeonce |
| S23 | [HubSpot KB, 06-10-2026][s23] | ABM, propiedades y seats. Capacidad documentada, portal local no auditado |
| S24 | [LinkedIn Help, vigente][s24] | Requisitos de company-list upload y miembros coincidentes. Revisar al ejecutar |

## Verificación y estado entregado

Informe y fuentes revisados; tres revisiones por subagentes incorporadas y contraste crítico de recomendaciones.
Se corrigieron alcance Scenario, exclusión de magnitudes sin denominador suficiente, clasificación del paper
experimental frente al IMM cualitativo, evidencia de champion y costo/capacidad del piloto. Los controles finales
de enlaces, referencias y formato pasaron; el cierre documental estricto y el gate de contexto/Handoff no
reportaron errores ni warnings. No se atribuyen resultados
al método sin evidencia local. Skills, CRM, créditos, comunicaciones, licencias y automatizaciones sin cambios
por este encargo. Sin commit ni push solicitados para esta investigación.

[s01]: https://www.slideshare.net/slideshow/itsma-and-abm-leadership-alliance-leadership-survey-research-report/79639310
[s02]: https://5356237.fs1.hubspotusercontent-na1.net/hubfs/5356237/MomentumITSMAABMLA_ABMSurvey2022_ElevatingABM_Dec2022_Final.pdf
[s03]: https://inflexiongroup.com/abmacademy/introducing-abm/
[s04]: https://iris.univpm.it/handle/11566/358014
[s04b]: https://www.linkedin.com/posts/simone-severini_abm-accountbasedmarketing-b2b-activity-7432887022056304641-6-_u
[s05]: https://inflexiongroup.com/resources/new-inflexion-group-research-reveals-how-account-based-thinking-is-shaping-b2b-marketing-transformation/
[s06]: https://trailhead.salesforce.com/content/learn/modules/account-based-selling/get-started-with-account-based-selling
[s07]: https://www.forrester.com/blogs/saying-goodbye-to-mqls-accounts-buying-groups-opportunities-oh-my-how-is-it-all-connected/
[s08]: https://www.forrester.com/report/account-based-marketing-signal-audit-tool/RES184729
[s09]: https://www.gong.io/blog/data-shows-top-reps-dont-just-sell-they-orchestrate-with-ai
[s10]: https://www.gartner.com/en/newsroom/press-releases/2025-05-07-gartner-sales-survey-finds-74-percent-of-b2b-buyer-teams-demonstrate-unhealthy-conflict-during-the-decision-process
[s11]: https://www.edelman.com/sites/g/files/aatuss191/files/2025-07/2025%20Edelman-LinkedIn%20B2B%20Thought%20Leadership%20Impact%20Report_FINAL.pdf
[s12]: https://meddicc.com/meddpicc-sales-methodology-and-process
[s13]: https://www.outreach.ai/resources/blog/mutual-action-plans
[s14]: https://6sense.com/science-of-b2b/buyer-experience-report-2025/
[s15]: https://www.linkedin.com/business/marketing/blog/research-and-insights/why-you-should-follow-the-95-5-rule
[s16]: https://www.demandbase.com/faq/account-based-experience-101/
[s17]: https://www.demandbase.com/resources/labs/state-of-abm-2026-benchmark-report/
[s18]: https://6sense.com/science-of-b2b/whats-currently-measured-isnt-what-matters-the-state-of-b2b-marketing-metrics-in-2025/
[s19]: https://www.slideshare.net/slideshow/abm-benchmark-report-webinar-slides-2024/273130041
[s20]: https://www.demandbase.com/wp-content/uploads/2024/09/TEI_of_Demandbase__final-v2.pdf
[s21]: https://arxiv.org/html/2306.07464v1
[s22]: https://support.google.com/google-ads/answer/14102450?hl=en-GB
[s23]: https://knowledge.hubspot.com/branding/get-started-with-account-based-marketing-in-hubspot?tab=tab-crm
[s24]: https://www.linkedin.com/help/recruiter/answer/a423102

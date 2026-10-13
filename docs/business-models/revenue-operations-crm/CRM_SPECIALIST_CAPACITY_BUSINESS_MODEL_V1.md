# Capacidad especializada de CRM y RevOps — Business Model V1

> **Estado:** `Approved for validation`, 2026-10-09; dirección aprobada, economics sin validar.
> **Owner:** RevOps & CRM + Commercial; Finance/Pricing y Talent/Operations en sus fronteras.
> **Fuentes:** [ADR](../../architecture/EFEONCE_REGIONAL_CRM_CAPACITY_SERVICE_DECISION_V1.md),
> [ficha](../../services/revenue-operations-crm/CRM_SPECIALIST_CAPACITY_SERVICE_V1.md), conversación y señal de vacante Station 24.
> **Confianza:** media sobre el problema; baja sobre compra, precio y escalabilidad. No hay VoC de comprador registrada.

## Clasificación y tesis

Efeonce vende capacidad especializada respaldada por selección, formación, gobierno y continuidad. Pertenece
a RevOps & CRM; HubSpot es el primer carril a validar. Staff Augmentation y Managed Delivery son modalidades
del mismo servicio, no dos líneas de negocio. Es un servicio estructurado en validación, sin declaración de
Product Service maduro ni nuevo SKU activado.

Reusar el [Product Service Operating Model](../EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md) y el
[Engagement–Project Operating Model](../EFEONCE_ENGAGEMENT_PROJECT_OPERATING_MODEL_V1.md): Organization →
Engagement → Project/Campaign → Task. Contrato/SOW gobierna la venta; un proyecto o registro CRM no la sustituye.

## Cliente, ICP y anti-fit

Hipótesis inicial: organizaciones con CRM relevante para marketing, ventas o lifecycle, backlog observable,
owner interno y necesidad de capacidad que puedan financiar. La vacante aumenta prioridad de investigación;
no define tamaño, solvencia ni intención de externalizar. Priorizar por necesidad, complejidad, gobierno,
presupuesto, modalidad aceptable y capacidad de Efeonce, no sólo por país o título de quien publica.

Anti-fit: sólo busca reclutamiento sin operación posterior; exige control absoluto sin dirección contractual
clara; espera un perfil que cubra todas las plataformas; carece de accesos/consentimiento o sponsor;
presupuesto no financia el estándar; riesgo jurídico sin solución; conflicto de capacidad/exclusividad;
expectativa de resultados comerciales garantizados. Reencuadrar o declinar con motivo documentado.

## Operator & Buying Group Contract

| Elemento | Hipótesis y prueba requerida |
|---|---|
| Operador | CRM/RevOps Lead, Lifecycle/Growth Lead o responsable funcional; confirmar quién prioriza y acepta |
| JTBD funcional | Resolver backlog, mantener datos/workflows y liberar capacidad para dirigir el negocio |
| JTBD emocional/social | Confiar en la competencia y explicar la inversión sin convertirse en supervisor permanente |
| Primer valor | Workflow prioritario aceptado y usado; registrar días hasta aceptación y supervisión requerida |
| Operator-champion | Usa la entrega, reconoce capacidad útil, comparte evidencia al sponsor y solicita continuidad/expansión |
| Problem owner / sponsor | Responsable de Growth, Marketing, Ventas u Operaciones afectado por el backlog |
| Economic buyer | Persona con autoridad sobre presupuesto; HR puede tener presupuesto de contratación que no sea transferible a servicios |
| Governance owners | IT/Security, Legal/Privacy y HR para datos, accesos y dirección del trabajo |
| Decision process | Discovery → modalidad y fit → evidencia de perfil/servicio → costo/valor → validación funcional y presupuesto |
| Paper process | Vendor onboarding, seguridad/DPA, clasificación contractual, SOW, firmas, factura/PO y condiciones de pago |
| Adopción | Entregas usadas, calidad, autonomía, horas de supervisión y documentación transferible |
| Renovación / expansión | Necesidad persiste, estándar y margen sostenidos, cliente acepta valor; nueva lane requiere capacidad/costeo propios |

Owner: Commercial + RevOps & CRM. Fuente y fecha: propuesta del operador y vacante observada, 2026-10-09;
confianza de roles/buying group baja hasta entrevistas. Validar diferencias entre quien publica, quien opera,
quien compra y quien puede vetar. No atribuir este mapa a Station 24 sin discovery.

## Packaging y unidades

| Modalidad | Unidad comercial a validar | Variables que debe declarar |
|---|---|---|
| Staff Augmentation | Fee por rol/seniority/dedicación y período | Capacidad neta, horario, gestión/QA, formación, respaldo y condiciones de continuidad |
| Operación gestionada | Fee por alcance y capacidad de servicio | Lanes, volumen/complejidad, entregas/SLA, responsables, dependencias y change control |
| Activación / transición | Fee separado sólo si hay trabajo adicional definido | Assessment pertinente, onboarding y documentación; evitar duplicar costos incluidos |

Dedicación parcial/completa no es tier universal ni derecho ilimitado a cambios. Período mínimo, ramp-up,
salida, pausa, notice, contratación directa eventual y reemplazo se diseñan antes del SOW; no hay plazos o
penalidades aprobados aquí. Licencias, seats y consumo de agentes/provider se muestran expresamente.
Capacidad humana y consumo de IA se contabilizan por separado; no monetizar mejoras de IA sólo multiplicando
horas ni asumir que todas las horas liberadas se pueden revender.

## Economics y pricing integrity

El [guardrail Talent Assurance](../EFEONCE_TALENT_ASSURANCE_ECONOMIC_GUARDRAILS_V1.md) es el piso de diseño.
Costear salario/honorarios y obligaciones aplicables, dedicación real, selección/onboarding, Account Lead,
supervisión técnica/QA, formación y evaluaciones, herramientas, cobertura/backup, bench/ramp, transición,
administración/cobranza y riesgos de FX/impuestos/pago. Costos fijos ya absorbidos no hacen gratuita la capacidad.

Para el mismo período y moneda:

```text
Contribución = ingreso neto de impuestos indirectos − costo atribuible de entrega y servicio
Margen de contribución = contribución / ingreso neto
Capacidad vendible = capacidad laboral disponible − compromisos − aprendizaje/QA/gestión − reservas
```

Finance define la base de costos y piso de margen; Commercial/Pricing valida disposición de pago y value
metric. Las cifras comerciales y las excepciones las aprueba el operador (CEO); la base de costo de personas del
cotizador ya está decidida (delta en «Costeo local por rol o servicio»).
No hay porcentajes, salarios, rate card ni descuentos autorizados en este modelo. Si el costo no
financia el estándar: re-price, reducir alcance/dedicación con promesa explícita, cambiar composición,
borrow con respaldo o no-go. Un piloto pagado no puede esconder pérdidas sin aprobación económica específica.

Comparar con contratación directa sobre costo total y capacidad útil, incluyendo onboarding, aprendizaje y
gestión en ambos lados. No prometer menor costo ni mayor desempeño antes de medir. Probar sensibilidad por
utilización, ausencias, reemplazo, FX, demora de cobro y presión de salarios. Registrar precio/versiones,
moneda ISO, impuestos y condiciones de ajuste; proteger costos internos y datos salariales frente al cliente.

## Adquisición, permanencia y salida

Investigar vacantes/publicaciones, relaciones existentes y referencias donde haya necesidad compatible.
Registrar señal, fuente/fecha, plataforma, país y modalidad por confirmar. El CRM conserva contacto/company
y relación; una búsqueda laboral no se convierte automáticamente en Deal o permiso para outreach.
La calificación puede concluir Staff Augmentation, operación gestionada, cobertura interina, otro servicio
o no-fit. No encuadrar cada vacante como oposición a una contratación interna.

Retener por calidad, confianza y utilidad. El cliente conserva sus datos, credenciales, documentación y
capacidad transferible según contrato/IP. Definir transición, revocación de accesos y eventual contratación
directa de la persona con condiciones justas y verificadas. Preservar bienestar, descansos, feedback y ruta
de desarrollo; la continuidad no justifica sobreasignación del especialista o backup.

## Validación y escala

Propuesta: dos o tres pilotos pagados, con baseline y alcance acotado. Seleccionar al menos casos con
dirección claramente definida; validar otras configuraciones regionales antes de ampliarlas. No es un
compromiso de cantidad de ventas ni plazo. [Activación y scorecard](../../operations/CRM_SPECIALIST_CAPACITY_ACTIVATION_V1.md).

Medir primer valor aceptado, calidad/retrabajo, autonomía y horas de supervisión, satisfacción de operador
y especialista, continuidad probada, costo completo, contribución real, cobro y renovación. Una mejora
comercial es evidencia adicional si existe atribución razonable, no aceptación automática de capacidad.

Escalar sólo con fit y compra demostrados, costo/capacidad sostenibles, procedimientos reproducibles,
verificación de competencias, evidencia de continuidad y configuración contractual habilitada. Empaquetar
precios después de calibrar resultados. Oferta aprobada ≠ demanda validada ≠ contrato firmado ≠ entrega aceptada.

## Costeo local por rol o servicio

[Pricing V3 operativo](../../architecture/GREENHOUSE_PRICING_V3_OPERATIONAL_WORKFLOW_DECISION_V1.md) ya permite
preparar perfiles, tareas, recursos y créditos, calcular y explicar sin depender de la UI ni del Excel.
Las escalas de consultoría HubSpot/Salesforce conservan IDs y costos separados; elegir la variante adecuada
no es fusionarlas por especialización o tomar la más barata. País de talento/costo y mercado de oferta/precio
se modelan de forma independiente: el país de la persona ajusta el costo (Chile es la base) y el país del cliente
ajusta el precio del componente humano. Provisiones y valores de prueba siguen siendo hipótesis explícitas.

Delta 2026-10-11 — decisión del operador (CEO): el costo de las personas en el cotizador es el nivel salarial
objetivo del Excel de pricing, no la nómina actual, y no se conecta a ella; el margen real sobre personas hoy es
mayor que el simulado. Esa base de costo ya está decidida. Ese mismo día el operador fijó el piso de margen de una
persona vendida por dedicación (staff augmentation) en 25%, y de ahí sube según el caso: rige en el catálogo para toda
cotización que use la oferta `talent-assurance-staffing`, incluida la capacidad de un especialista CRM en esa
modalidad. Eso no aprueba este modelo de negocio ni un precio objetivo para él: su estado y su veredicto no cambian.
El 45% es el piso de los servicios gestionados de las prácticas creativa y SEO/AEO, y el 40%/35% del pack de
capacidad es una propuesta sin aprobar; el objetivo de esta oferta se decide con el operador, no por analogía.
Desde ese día el cotizador costea la puesta en marcha de esa persona con dos provisiones estimadas, propuestas por un
agente y aceptadas por el CEO, por medir en las próximas dos incorporaciones: onboarding, USD 200 una vez por persona,
por defecto, y reclutamiento, USD 500, sólo cuando hay que contratar a alguien para ese cliente. Van en la fila de
puesta en marcha de la cotización: no las dupliques en un fee de activación. La regla del Excel de pricing (un mes del
costo del recurso) no se usa; el plazo mínimo cuando se recluta y la contratación directa eventual siguen siendo
materia de contrato y revisión legal, no de precio.

`role_capacity` y `managed_service` distinguen presentación por capacidad y fee de servicio; roles siguen
costeados internamente. La selección incluye base Notion/Microsoft 365, herramientas de CRM por trabajo y
IA sólo si se justifica. CRM del cliente puede cubrir un recurso con evidencia vigente por líneas/período,
sin asumir que compra todo el software ni sustituir la base operativa interna. Licencias Team, paquetes,
API/consumo y plataforma tienen cantidad/asignación propias.

El agente obtiene desglose/replay del artifact congelado y readiness antes de revisar precio. El preview
allowlisted mantiene salario, país de talento, rates y margen internos. No crea Deal, Quote emitida o nueva
familia de oferta HubSpot, ni aprueba tarifas, delivery, SLA o contrato regional. Fuentes y pendientes en
[data operativo](../../../data/pricing/v3-operating/README.md); ejecución en el
[manual](../../manual-de-uso/finance/operar-cotizador-v3-con-agentes.md). Mantener este modelo `Approved for validation`.
